import { ref, computed } from 'vue'
import { isCrazyWeb } from '@/use/useUser'
import { isCrazyGamesFullRelease } from '@/use/useMatch'
import { adProviderName, isRewardedReady, showRewardedAd } from '@/use/useAds'

/**
 * ─── Reward gating ──────────────────────────────────────────────────────────
 *
 * A perk is paid for with a rewarded video on every build that HAS one, and is
 * simply free on every build that does not.
 *
 * It used to read `isCrazyWeb && isCrazyGamesFullRelease`, which was written
 * when CrazyGames was the only portal wired for rewarded ads. It is now wrong
 * in the expensive direction: Playgama, GamePix, GameMonetize, Yandex and
 * GameDistribution all resolve real providers, so that predicate was handing
 * out every rewarded perk for free on five shipping portals — the ad never
 * played, the placement never earned, and a reviewer clicking a button marked
 * with a video icon saw no video.
 *
 * The rule is now the honest one: is a real provider resolved?
 *
 *   • any real provider  → gated, the video plays.
 *   • CG PRE-release     → NOT gated. It is a QA artefact with no inventory,
 *                          so a gate there is untestable by construction.
 *   • noop (local dev,
 *     plain web, itch…)  → not gated, perks are free.
 */
export const isRewardGated =
  adProviderName !== 'noop' && (!isCrazyWeb || isCrazyGamesFullRelease)

// ─── Rewarded rate limit ────────────────────────────────────────────────────
//
// A hard ceiling on how many rewarded videos may be REQUESTED in a rolling
// window, independent of what the provider's own readiness API says.
//
// Two reasons this has to live on our side. Portals treat a game that hammers
// the rewarded placement as abusive inventory use and reject it; and a player
// who can watch ads back to back will, then resent the game for letting them.
// The limit counts REQUESTS, not grants: a dismissed or unfilled ad still cost
// the network a call, and not counting it would let a player farm no-fills.

/** Rolling window length, ms. */
const REWARD_WINDOW_MS = 5 * 60 * 1000
/** Requests allowed inside one window. */
const REWARD_WINDOW_MAX = 6

/** Timestamps of rewarded requests inside the current window, oldest first. */
let rewardRequests: number[] = []
/** Bumped on every change so the `canOfferReward` computed re-evaluates. */
const rewardTick = ref(0)

const pruneRewardWindow = (now: number): void => {
  const cutoff = now - REWARD_WINDOW_MS
  if (rewardRequests.length > 0 && rewardRequests[0]! <= cutoff) {
    rewardRequests = rewardRequests.filter((t) => t > cutoff)
    rewardTick.value++
  }
}

/** True while the player has spent their rewarded allowance for this window. */
export const isRewardRateLimited = (): boolean => {
  void rewardTick.value
  pruneRewardWindow(Date.now())
  return rewardRequests.length >= REWARD_WINDOW_MAX
}

/** Seconds until the next rewarded slot frees up. 0 when one is available. */
export const rewardCooldownLeft = (): number => {
  const now = Date.now()
  pruneRewardWindow(now)
  if (rewardRequests.length < REWARD_WINDOW_MAX) return 0
  const oldest = rewardRequests[0]!
  return Math.max(0, Math.ceil((oldest + REWARD_WINDOW_MS - now) / 1000))
}

const recordRewardRequest = (): void => {
  rewardRequests.push(Date.now())
  rewardTick.value++
}

/** Test seam: forget every recorded request. */
export const __resetRewardWindow = (): void => {
  rewardRequests = []
  rewardTick.value++
}

/**
 * Run `grant` behind a rewarded video where the build calls for it.
 *
 * Returns whether the perk was granted. On a gated build a no-fill, a dismissed
 * ad or a blocked ad all resolve to `false` and grant nothing — the caller is
 * responsible for leaving its UI in a sane state, which is why `inFlight` is
 * exposed rather than each call site inventing its own busy flag.
 *
 * The rate limit is enforced here as well as in `canOfferReward`, because a
 * button is not the only way into this function and a limit that only hides UI
 * is not a limit.
 */
export const claimReward = async (grant: () => void): Promise<boolean> => {
  if (!isRewardGated) {
    grant()
    return true
  }
  if (adInFlight.value) return false
  if (isRewardRateLimited()) return false
  adInFlight.value = true
  recordRewardRequest()
  try {
    const ok = await showRewardedAd()
    if (ok) grant()
    return ok
  } finally {
    adInFlight.value = false
  }
}

/** True while a gated reward is waiting on its video. */
export const adInFlight = ref(false)

/**
 * Can this perk be offered right now?
 *
 * On an ungated build: always. On a gated build: only when the provider
 * actually has a rewarded ad ready AND the player has rewarded allowance left
 * in the current window. Offering a button that then fails reads as the game
 * being broken, which is exactly as true for a rate-limited refusal as for a
 * no-fill.
 */
export const canOfferReward = computed(
  () => !isRewardGated || (isRewardedReady.value && !isRewardRateLimited())
)

// ─── Interstitial pacing ────────────────────────────────────────────────────

/**
 * Minimum gap between interstitials, ms.
 *
 * 121 s, not 120. CrazyGames and Playgama both rate-limit interstitials to one
 * every two minutes and REJECT the request that arrives early — so a gate set
 * to exactly the platform's own limit loses the race to clock skew, timer
 * coalescing in a background tab, or the few milliseconds between our check and
 * the SDK's. The extra second costs nothing and turns a rejected request into a
 * filled one.
 */
const INTERSTITIAL_MIN_GAP_MS = 121_000

let lastInterstitialAt = 0

/**
 * True when enough time has passed to show another interstitial.
 *
 * The first call of a session returns false: an interstitial in the opening
 * seconds — before the player has seen the game work — is the single most
 * reliable way to lose them.
 */
export const canShowInterstitial = (): boolean => {
  if (lastInterstitialAt === 0) {
    lastInterstitialAt = Date.now()
    return false
  }
  return Date.now() - lastInterstitialAt >= INTERSTITIAL_MIN_GAP_MS
}

/** Record that an interstitial was just shown, restarting the 120 s clock. */
export const markInterstitialShown = (): void => {
  lastInterstitialAt = Date.now()
}

/** Seconds until the next interstitial is allowed — debug/telemetry only. */
export const interstitialCooldownLeft = (): number =>
  Math.max(0, INTERSTITIAL_MIN_GAP_MS - (Date.now() - lastInterstitialAt)) / 1000

/** Test seam: reset the pacing clock. */
export const __resetInterstitialClock = (): void => { lastInterstitialAt = 0 }
