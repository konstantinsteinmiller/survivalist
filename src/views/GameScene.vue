<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  stage, phase, squadCount, damage, runFireRate, progress01, bossHp01, bestStage,
  eliteAlive, eliteHp01, challenge, declines,
  startStage, advanceStage, retryStage, step, steerTo, steerBy, steerOnly, runSummary,
  isChargingGate, getCrates, getGates, getDividers, getBoss, anchor, crowdRadius
} from '@/use/useSurvivalGame'
import {
  drawScene, setViewport, screenToWorldX, screenDeltaToWorld, invalidateArt
} from '@/use/useSurvivalArt'
import { resetVfx } from '@/use/useVfx'
import { warmAudio, playFx } from '@/use/useGameAudio'
import { DECLINE_MAX, LANE_HALF } from '@/game/survival'

import { getState, setState } from '@/use/useTowerState'
import { flushSaveNow } from '@/use/useSaveStatus'
import {
  GUARD_HINT_KEY, ONBOARDED_KEY, REWARD_DECLINE_KEY, SHOP_SPOTLIGHT_KEY, TUTORIAL_KEY
} from '@/keys'
import useTowerEconomy from '@/use/useTowerEconomy'
import { affordableCount } from '@/use/useUpgrades'
import useSounds, { useMusic } from '@/use/useSound'
import { useScreenshake } from '@/use/useScreenshake'
import { isGamePaused, isAdShowing } from '@/use/useGamePause'
import { spawnCoinExplosion } from '@/use/useCoinExplosion'
import { isInterstitialReady, showMidgameAd } from '@/use/useAds'
import {
  canShowInterstitial, markInterstitialShown, adInFlight, canOfferReward, claimReward, isRewardGated
} from '@/use/useAdGate'
import { signalGameplayLoaded, syncGameplayLifecycle, triggerHappytime } from '@/use/useCrazyGames'
import { isAnyModalOpen } from '@/use/useModalState'
import { playFirstStartInterstitial } from '@/use/useFirstStartInterstitial'
import {
  OUTSIDE_BOARD, boardSize, leaderboardEnabled, leaderboardFailed, playerTotal, rankFor, reportRun
} from '@/use/useLeaderboard'

import RunHud from '@/components/game/RunHud.vue'
import ControlHint, { type HintId } from '@/components/game/ControlHint.vue'
import TutorialOverlay from '@/components/game/TutorialOverlay.vue'
import RewardAdIcon from '@/components/atoms/RewardAdIcon.vue'
import FHudButton from '@/components/atoms/FHudButton.vue'
import FHudBadge from '@/components/atoms/FHudBadge.vue'
import FMuteButton from '@/components/atoms/FMuteButton.vue'
import FReward from '@/components/atoms/FReward.vue'
import FButton from '@/components/atoms/FButton.vue'
import CoinBadge from '@/components/organisms/CoinBadge.vue'
import OptionsModal from '@/components/organisms/OptionsModal.vue'
import UpgradeModal from '@/components/organisms/UpgradeModal.vue'
import LeaderboardModal from '@/components/organisms/LeaderboardModal.vue'
import IconCoin from '@/components/icons/IconCoin.vue'

/**
 * ─── The scene ──────────────────────────────────────────────────────────────
 *
 * One canvas, one RAF loop, one thin HUD. The scene owns three things and
 * delegates everything else:
 *
 *   INPUT     — pointer → a world-space steer target. Tap moves, drag steers.
 *   THE LOOP  — the pause gate, the fixed order (`step` then `drawScene`).
 *   THE FLOW  — stage clear / wipe → ad → result screen → next stage.
 *
 * The ad ORDERING in `presentResult` is deliberate and is the thing most likely
 * to be broken by a well-meaning simplification: the interstitial is requested
 * and AWAITED before the result overlay is revealed. Showing the overlay first
 * lets the victory jingle play for a beat and then get guillotined by the ad —
 * which is exactly what portal QA rejects builds for.
 */

const { t } = useI18n()
const { coins, addCoins } = useTowerEconomy()
const { startBattleMusic, stopBattleMusic } = useMusic()
const { playSound } = useSounds()
const { shakeStyle } = useScreenshake()

// ─── Canvas + render loop ───────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
const topBarRef = ref<HTMLElement | null>(null)
const bottomBarRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let lastT = 0
let cssW = 0
let cssH = 0
let dpr = 1
let hintPollAccum = 0

/** HUD insets, measured rather than guessed, so the camera never frames the
 *  crowd underneath the bottom row on a short phone. */
const measureInsets = (): { top: number; bottom: number } => ({
  top: (topBarRef.value?.getBoundingClientRect().height ?? 0) + 8,
  bottom: (bottomBarRef.value?.getBoundingClientRect().height ?? 0) + 8
})

const resize = (): void => {
  const canvas = canvasRef.value
  if (!canvas) return
  // Clamp DPR to 2: past that the pixel cost doubles again for no perceptible
  // gain on a phone, and it is the difference between 60 fps and 40 on mid-tier
  // Android.
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  cssW = window.innerWidth
  cssH = window.innerHeight
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  const insets = measureInsets()
  setViewport(cssW, cssH, insets.top, insets.bottom)
  // The lane tile is baked at the current scale, so a resize invalidates it.
  invalidateArt()
}

const loop = (t: number): void => {
  rafId = requestAnimationFrame(loop)
  const dt = lastT ? Math.min(t - lastT, 120) : 16
  lastT = t

  // The pause gate covers ads, hidden tabs, platform SDK pauses and open
  // modals. The RENDER loop keeps running (so the frame under an ad isn't a
  // frozen artefact) but the simulation clock does not advance.
  if (!isGamePaused.value && !showResult.value) {
    step(dt)
    driveKeyboardSteering(dt)
    // After `step`, because it reads the anchor the step just moved.
    driveTutorial(dt)
    // Poll the world for the hint chooser at ~5 Hz — see `hintTick`.
    hintPollAccum += dt
    if (hintPollAccum >= 200) {
      hintPollAccum = 0
      hintTick.value++
    }
  }

  if (ctx) drawScene(ctx, cssW, cssH, dt, dpr)
}

// ─── Input ──────────────────────────────────────────────────────────────────
//
// One pointer, two behaviours, chosen by how far the finger has travelled:
//
//   TAP  (< slop)  → the crowd's target snaps to the tapped column. This is the
//                    control the hint teaches, and the one that works when the
//                    player is holding the phone one-handed and stabbing at it.
//   DRAG (≥ slop)  → relative steering with a small gain, so crossing the lane
//                    is a thumb-sized sweep instead of a full-screen one, and
//                    the crowd never teleports out from under the finger.
//
// Both are live on POINTER MOVE, not on release: a runner that only responds
// when you lift your finger feels broken.

const TAP_SLOP_PX = 12
let pointerDown = false
let downX = 0
let lastX = 0
let dragging = false

const onPointerDown = (e: PointerEvent): void => {
  // In a portal iframe the frame does not hold keyboard focus on load, and the
  // `preventDefault` below cancels the implicit focus transfer a click would
  // otherwise cause — so claim focus explicitly, or the arrow keys never arrive.
  try { window.focus() } catch { /* a cross-origin parent may refuse */ }
  e.preventDefault()
  if (showResult.value) return

  pointerDown = true
  dragging = false
  downX = lastX = e.clientX
  try { canvasRef.value?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  // Snap immediately: the tap IS the move.
  steerTo(screenToWorldX(e.clientX))
  markHintDone('move')
}

const onPointerMove = (e: PointerEvent): void => {
  if (!pointerDown) {
    // Desktop: hovering with no button held also steers. It reads as "the crowd
    // follows the mouse", which is what every player of this genre expects, and
    // it costs one branch.
    if (e.pointerType === 'mouse' && !showResult.value) steerTo(screenToWorldX(e.clientX))
    return
  }
  if (!dragging && Math.abs(e.clientX - downX) > TAP_SLOP_PX) dragging = true
  if (dragging) {
    // 1.35× gain — see DRAG_GAIN's note in `game/survival.ts`.
    steerBy(screenDeltaToWorld(e.clientX - lastX) * 1.35)
  } else {
    steerTo(screenToWorldX(e.clientX))
  }
  lastX = e.clientX
}

const onPointerUp = (e: PointerEvent): void => {
  pointerDown = false
  dragging = false
  try { canvasRef.value?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
}

// Keyboard fallback, for desktop players and for accessibility.
const keys = new Set<string>()
const driveKeyboardSteering = (dtMs: number): void => {
  let dir = 0
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dir -= 1
  if (keys.has('ArrowRight') || keys.has('KeyD')) dir += 1
  if (dir === 0) return
  steerBy(dir * (dtMs / 1000) * LANE_HALF * 2.2)
  markHintDone('move')
}

const onKeyDown = (e: KeyboardEvent): void => {
  const tgt = e.target
  if (tgt instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName)) return
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
    e.preventDefault()
    keys.add(e.code)
  }
  if (e.code === 'Escape') {
    showOptions.value = false
    showUpgrades.value = false
    showLeaderboard.value = false
  }
}
const onKeyUp = (e: KeyboardEvent): void => { keys.delete(e.code) }

// ─── The onboarding lightbox (one-shot, first run only) ─────────────────────
//
// Held in front of stage 1 until the player has actually steered the squad for
// a second of moving time. Not a dialog and not a pause: the road is frozen
// (`steerOnly`) while the crowd still answers the thumb, so the lesson is
// performed rather than read. See `TutorialOverlay.vue`.

/** Moving time the player owes before the road starts. */
const TUTORIAL_MOVE_MS = 1000
/**
 * …and the longest we will wait for it.
 *
 * A player who cannot produce the gesture — a dead trackpad, a portal iframe
 * that never got pointer events, a child poking the screen with one finger and
 * no drag — must not be held at a black screen forever. After this the stage
 * starts anyway and the flag is spent: the tutorial is a nudge, and a nudge
 * that can soft-lock the game is a worse bug than the one it prevents.
 */
const TUTORIAL_BAILOUT_MS = 12_000
/** Movement below this per frame is noise — a resting hand, a spring settling. */
const TUTORIAL_MOVE_EPS = 0.004

const tutorialSeen = ref(getState<boolean>(TUTORIAL_KEY, false) === true)
/**
 * The overlay is up. Set in `boot`, once the squad it teaches exists.
 *
 * Distinct from `tutorialPending` because there is a gap between mount and
 * `boot` finishing its first `await` — and in that gap the running control
 * primer would otherwise flash "Tap to move" at a player who is about to be
 * shown a whole lightbox saying the same thing.
 */
const tutorialActive = ref(false)
/** A tutorial is owed and has not run yet. True from the first frame. */
const tutorialPending = ref(!tutorialSeen.value)
const tutorialProgress = ref(0)
let tutorialMovedMs = 0
let tutorialWaitedMs = 0
let tutorialLastX = 0

/**
 * @param completed did the player actually perform the gesture, or did the
 *   bail-out fire? Only a completed tutorial is remembered. A player whose
 *   input never arrived has been taught nothing, and burning the flag on them
 *   would mean the one device that needs the primer is the one device that
 *   never gets it twice.
 */
const finishTutorial = (completed: boolean): void => {
  if (!tutorialActive.value) return
  tutorialActive.value = false
  tutorialPending.value = false
  steerOnly.value = false
  // Flushed at once: this is a hard checkpoint in the same sense a cleared
  // stage is. A player who sees the lightbox, learns the control and then
  // closes the tab must not be taught it again.
  if (completed && !tutorialSeen.value) {
    tutorialSeen.value = true
    setState(TUTORIAL_KEY, true)
    void flushSaveNow()
  }
  // The running primer this replaces has already done its job.
  markHintDone('move')
}

/** Drives the movement clock. Called from the render loop, after `step`. */
const driveTutorial = (dtMs: number): void => {
  if (!tutorialActive.value) return
  tutorialWaitedMs += dtMs
  const x = anchor().x
  // Credit the time only while the SQUAD is moving, not while the finger is
  // down. The lesson is "the crowd follows you", so the crowd has to have
  // followed — and a player who taps once and holds still has not learned it.
  if (Math.abs(x - tutorialLastX) > TUTORIAL_MOVE_EPS) tutorialMovedMs += dtMs
  tutorialLastX = x
  tutorialProgress.value = Math.min(1, tutorialMovedMs / TUTORIAL_MOVE_MS)
  if (tutorialMovedMs >= TUTORIAL_MOVE_MS) finishTutorial(true)
  else if (tutorialWaitedMs >= TUTORIAL_BAILOUT_MS) finishTutorial(false)
}

// ─── Control hints ──────────────────────────────────────────────────────────
//
// One at a time, chosen by what the player most needs to know RIGHT NOW, each
// retiring permanently the first time the thing it describes happens. After the
// first cleared stage the whole system switches off for good, on every device
// the save reaches.

const hintsDone = ref<Set<HintId>>(new Set())
const onboarded = ref(getState<boolean>(ONBOARDED_KEY, false) === true)

const markHintDone = (id: HintId): void => {
  if (hintsDone.value.has(id)) return
  const next = new Set(hintsDone.value)
  next.add(id)
  hintsDone.value = next
}

/**
 * Bumped by the render loop on a ~5 Hz cadence.
 *
 * The hint chooser has to look at the WORLD (is a trap gate ahead? is the crowd
 * drifting onto a pillar?) and the world lives in plain non-reactive arrays by
 * design. Polling five times a second is two array scans over a handful of live
 * entities — far cheaper than making the hot collections reactive to serve one
 * pill of text.
 */
const hintTick = ref(0)

/** What the lane is about to ask the player, right now. */
const laneWarning = computed<HintId | null>(() => {
  void hintTick.value
  const a = anchor()
  // A pillar the crowd is currently lined up to hit. This is the one hint that
  // is a live warning rather than a lesson, so it outranks everything else.
  for (const d of getDividers()) {
    const ahead = d.y - a.y
    if (ahead < 0.5 || ahead > 9) continue
    if (Math.abs(a.x - d.x) < crowdRadius() + 0.4) return 'divider'
  }
  for (const g of getGates()) {
    if (g.used) continue
    const ahead = g.y - a.y
    if (ahead < 0 || ahead > 12) continue
    if (g.op === 'div') return 'trap'
  }
  for (const c of getCrates()) {
    const ahead = c.y - a.y
    if (ahead < 0 || ahead > 12) continue
    return c.kind === 'rate' ? 'rate' : 'crate'
  }
  return null
})

const activeHint = computed<HintId | null>(() => {
  if (showResult.value || isAnyModalOpen.value) return null
  // The lightbox is already saying this, larger and with a picture of the
  // gesture. `pending` rather than `active` so the pill never flashes in the
  // gap between mount and the overlay going up.
  if (tutorialPending.value) return null
  // The shield outranks onboarding itself — see `GUARD_HINT_KEY`. It is the one
  // moment the game deliberately stops responding to the only verb the player
  // has, so "my bullets do nothing" needs a word attached to it exactly once,
  // whenever the player first meets it, onboarded or not.
  if (bossGuarding.value && !guardHintSeen.value) return 'guard'
  if (onboarded.value) return null
  if (!hintsDone.value.has('move')) return 'move'
  if (phase.value === 'boss') return hintsDone.value.has('boss') ? null : 'boss'
  // Teach whatever is actually coming, once each. A hint for something the
  // player cannot currently see is noise they will scroll past.
  const warn = laneWarning.value
  if (warn && !hintsDone.value.has(warn)) return warn
  if (!hintsDone.value.has('gate')) return 'gate'
  return null
})

// A hint retires the moment its lesson has landed: the trap and pillar warnings
// stop the first time the player is clear of them, the crate hints when the
// matching stat actually moves.
watch(laneWarning, (warn, before) => {
  if (before && !warn) markHintDone(before)
})

// The gate hint retires itself the moment the player actually holds fire on a
// gate — which is the behaviour it was asking for.
watch(isChargingGate, (charging) => { if (charging) markHintDone('gate') })
watch(damage, (now, before) => { if (now > before) markHintDone('crate') })
watch(runFireRate, (now, before) => { if (now > before) markHintDone('rate') })
watch(phase, (p) => { if (p === 'boss') markHintDone('boss') })

/** True while the boss is planted behind its phase shield. Polled at the same
 *  5 Hz as the lane warnings — a shield lasts a full second, so 200 ms is
 *  plenty and it costs nothing on the frames in between. */
const bossGuarding = computed(() => {
  void hintTick.value
  return (getBoss()?.guard ?? 0) > 0
})
// Retire it the moment the shield drops: the lesson has landed by then, and the
// swing that follows is the part the player needs to be looking at. Persisted,
// because a primer that reappears every boss is nagging rather than teaching.
const guardHintSeen = ref(getState<boolean>(GUARD_HINT_KEY, false) === true)
watch(bossGuarding, (now, before) => {
  if (!before || now || guardHintSeen.value) return
  guardHintSeen.value = true
  setState(GUARD_HINT_KEY, true)
})

// ─── Result flow ────────────────────────────────────────────────────────────

const showResult = ref(false)
const showOptions = ref(false)
const showUpgrades = ref(false)
const showLeaderboard = ref(false)
const summary = ref(runSummary())

/**
 * The player's global rank, for the result screen.
 *
 * A STRING because the cell is prose, not a number: `#42` when it is known,
 * `#100+` once the player is past the last published row, `…` while the request
 * is still out, and empty — which hides the whole cell — when there is nothing
 * honest to say. The `#` is built here rather than in the template because `#{}`
 * is Pug interpolation and a literal `#` in front of a mustache is a parse
 * error, not a hash sign.
 */
const resultRank = computed<string>(() => {
  if (!leaderboardEnabled) return ''
  const rank = rankFor(bestStage.value)
  if (rank === OUTSIDE_BOARD) return `#${boardSize.value}+`
  if (rank > 0) return `#${rank}`
  // Nothing known yet. The ellipsis holds the cell's place so the stats row does
  // not jump sideways when the rank lands a beat later — but only until the
  // endpoint has actually failed, after which the cell goes away and stays away
  // rather than showing a permanent "loading" to a player with no connection.
  return leaderboardFailed.value ? '' : '…'
})

const rewardCoinRef = ref<HTMLElement | null>(null)
const coinBadgeRef = ref<InstanceType<typeof CoinBadge> | null>(null)
const coinBadgeEl = computed<HTMLElement | null>(() => coinBadgeRef.value?.rootEl ?? null)

const RESULT_AD_DELAY_MS = 500
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Show an interstitial, if one is due.
 *
 * Two gates: the provider must actually have inventory, and the cooldown in
 * `useAdGate` must have elapsed. Every interstitial in the game goes through
 * here, so the pacing rule lives in exactly one place.
 */
const maybeShowInterstitial = async (): Promise<void> => {
  if (!isInterstitialReady.value) return
  if (!canShowInterstitial()) return
  markInterstitialShown()
  await wait(RESULT_AD_DELAY_MS)
  await showMidgameAd()
}

/** Stage cleared or squad wiped — the end of a run, either way. */
const presentResult = async (): Promise<void> => {
  summary.value = runSummary()
  stopBattleMusic()
  if (summary.value.cleared) triggerHappytime()

  // Ad FIRST, overlay second. See the header note.
  await maybeShowInterstitial()

  rewardClaimed.value = false
  rewardWasOffered.value = canOfferReward.value
  showResult.value = true
  void bankCoins()

  // Fire-and-forget, and it MUST stay that way. The board is a decoration on a
  // game that works without it, so the result screen is already up before the
  // request leaves — awaiting it would put a captive-portal wifi login page
  // between the player and their coins for the full 6 s timeout. `reportRun`
  // swallows every failure and only writes when the player beat their own
  // posted best, so the usual cost of this line is nothing at all.
  void reportRun(bestStage.value, summary.value.peakSquad)

  // The first cleared stage is the end of onboarding: the player has seen every
  // primer that matters and a returning player must never be taught again.
  if (!onboarded.value) {
    onboarded.value = true
    setState(ONBOARDED_KEY, true)
  }
}

// ─── The ×3, which is the game's income ─────────────────────────────────────
//
// Offered on EVERY result screen, win or lose, because a run that ended badly
// is exactly the run whose coins the player most wants back — and because a
// placement that only appears on a win teaches the player to stop watching
// after their first defeat.
//
// The multiplier is 3, not 2, on purpose: this is the primary source of income
// rather than a bonus on top of one. A stage's own payout keeps the shop moving
// slowly; the tripled payout keeps it moving at the pace the difficulty curve is
// priced against. Declining is a real choice with a real cost — see
// `rewardDeclineFactor` — and claiming once pays that cost off in full.

const REWARD_MULTIPLIER = 3

/** Already claimed on THIS result screen — the button is one-shot per run. */
const rewardClaimed = ref(false)
/** Was the offer genuinely available while this screen was up? Only then does
 *  walking away count as a decline. */
const rewardWasOffered = ref(false)

/** Extra coins the ×3 would pay on top of what was already banked. */
const rewardBonus = computed(() => summary.value.coins * (REWARD_MULTIPLIER - 1))

const showRewardButton = computed(() =>
  showResult.value && !rewardClaimed.value && summary.value.coins > 0 && canOfferReward.value
)

/**
 * Record that the player left a result screen without taking the offer.
 *
 * Silent, on purpose. An earlier pass put a line on the result screen warning
 * that skipping makes the next stage harder; it was removed because it turns an
 * offer into a threat. The lean is meant to be FELT — the road gets heavier and
 * the player works out that the ×3 buys upgrades that keep pace — not sold. A
 * game that tells you it will punish you for not watching an ad has stopped
 * offering you something.
 */
const recordDecline = (): void => {
  if (rewardClaimed.value || !rewardWasOffered.value) return
  // Only a WIN leans the curve. Losing already costs the player the stage, and
  // stacking a difficulty increase on top of a defeat is how a losing streak
  // becomes a quit.
  if (!summary.value.cleared) return
  const next = Math.min(DECLINE_MAX, declines.value + 1)
  declines.value = next
  setState(REWARD_DECLINE_KEY, next)
}

const onClaimReward = async (): Promise<void> => {
  if (rewardClaimed.value || adInFlight.value) return
  const granted = await claimReward(() => {
    rewardClaimed.value = true
    addCoins(rewardBonus.value)
    // One claim buys back the whole lean.
    declines.value = 0
    setState(REWARD_DECLINE_KEY, 0)
    void flushSaveNow()
  })
  if (!granted) return
  await nextTick()
  const el = rewardCoinRef.value
  if (el && coinBadgeEl.value) {
    spawnCoinExplosion({
      sourceEl: el,
      targetEl: coinBadgeEl.value,
      count: Math.min(60, 20 + Math.round(rewardBonus.value / 5))
    })
  }
  playFx('countUp', 0.85)
}

// Inventory can land a beat after the screen does — a player who saw the button
// at any point during the screen was genuinely offered the reward.
watch(canOfferReward, (can) => {
  if (can && showResult.value) rewardWasOffered.value = true
})

const bankCoins = async (): Promise<void> => {
  const total = summary.value.coins
  if (total <= 0) return
  addCoins(total)
  await nextTick()
  const el = rewardCoinRef.value
  if (el && coinBadgeEl.value) {
    spawnCoinExplosion({
      sourceEl: el,
      targetEl: coinBadgeEl.value,
      count: Math.min(40, 12 + Math.round(total / 6))
    })
  }
  playFx('countUp', 0.5)
}

watch(phase, (p, prev) => {
  if ((p === 'clear' || p === 'wipe') && prev !== p) void presentResult()
})

const beginStage = (next: boolean): void => {
  // Leaving the result screen IS the decline. Counted here rather than on a
  // dedicated "no thanks" button because there isn't one — the player declines
  // by pressing on, which is the only honest place to read the intent.
  recordDecline()
  showResult.value = false
  resetVfx()
  invalidateArt()
  if (next) advanceStage()
  else retryStage()
  startBattleMusic()
  // `isLiveGameplay` flips true here and `syncGameplayLifecycle` sends the
  // matching `gameplayStart` on the full release. Nothing to do by hand: the
  // one computed owns every start and stop, which is what stops the redundant
  // pairs the SDK complains about.
}

const onNext = (): void => {
  if (adInFlight.value) return
  beginStage(true)
}

const onRetry = (): void => {
  if (adInFlight.value) return
  beginStage(false)
}

/**
 * "Upgrade" from the result screen.
 *
 * Deliberately NOT behind an ad, and deliberately not a dead end: closing the
 * shop drops the player straight into the next run, because the only reason
 * they opened it was to change what that run feels like.
 */
const onUpgradeFromResult = (): void => {
  if (adInFlight.value) return
  showUpgrades.value = true
}

watch(showUpgrades, (open, wasOpen) => {
  if (!open && wasOpen && showResult.value) {
    // The result screen is still up behind the shop — leave it there so the
    // player chooses their own moment to run again.
    playSound('modal-open', 0.04)
  }
})

// ─── Shop spotlight (one-shot) ──────────────────────────────────────────────

const shopSpotlightSeen = ref(getState<boolean>(SHOP_SPOTLIGHT_KEY, false) === true)
const affordable = computed(() => affordableCount(coins.value))
const showShopSpotlight = computed(() =>
  !shopSpotlightSeen.value && affordable.value > 0 && !showResult.value
)

const openUpgrades = (): void => {
  showUpgrades.value = true
  if (!shopSpotlightSeen.value) {
    shopSpotlightSeen.value = true
    setState(SHOP_SPOTLIGHT_KEY, true)
  }
}

// ─── CrazyGames gameplay lifecycle ──────────────────────────────────────────
//
// The scene only reports whether play is live; `useCrazyGames` decides which
// events that becomes, because WHICH events to send is a platform contract and
// not a view concern.
const isLiveGameplay = computed(() =>
  (phase.value === 'run' || phase.value === 'boss')
  && !showResult.value
  && !isAnyModalOpen.value
  && !isAdShowing.value
  // The onboarding hold is not gameplay: the road is frozen and no stage is
  // running. Reporting `gameplayStart` here would open a session the player has
  // not begun, which is exactly the kind of thing portal moderation rejects.
  && !tutorialActive.value
)
watch(isLiveGameplay, syncGameplayLifecycle, { immediate: true })

// ─── Boot ───────────────────────────────────────────────────────────────────

let booting = false

/**
 * Enter the game.
 *
 * `startStage()` with no argument resumes the stage the save says the player is
 * on — the visible half of the hydration guarantee. If the cloud read had
 * silently failed, the player would land on stage 1, which is exactly the
 * "treated as a fresh user" bug the save layer's boot-sanity guard exists to
 * prevent.
 */
const boot = async (): Promise<void> => {
  if (booting) return
  booting = true
  try {
    // Moderation-mandated first-play interstitial on the networks that require
    // it; a no-op fast path everywhere else. Before the music starts, by design.
    await playFirstStartInterstitial()
    startStage()
    // The lightbox goes up BEFORE the first frame of the first stage a new
    // player ever sees, and holds the road until they have steered. Ordered
    // after `startStage` because the squad it teaches them to move is spawned
    // there — and because `startStage` is what a resuming player calls too, the
    // saved flag is the only thing standing between them and a tutorial they
    // finished months ago.
    if (tutorialPending.value) {
      tutorialActive.value = true
      steerOnly.value = true
      tutorialMovedMs = 0
      tutorialWaitedMs = 0
      tutorialProgress.value = 0
      tutorialLastX = anchor().x
    }
    await nextTick()
    resize()
    startBattleMusic()
    // Loading is genuinely finished here: the stage exists, the canvas is
    // sized, and the first frame is about to draw.
    signalGameplayLoaded()
  } finally {
    booting = false
  }
}

const onOrientationChange = (): void => { setTimeout(resize, 250) }

let insetTimer = 0

onMounted(() => {
  void boot()
  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', onOrientationChange)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  rafId = requestAnimationFrame(loop)

  // Warm the synthesis path on an idle slot so the first burst of a session
  // doesn't pay a buffer fill mid-frame.
  const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: any) => number) | undefined
  if (typeof idle === 'function') idle(warmAudio, { timeout: 2500 })
  else setTimeout(warmAudio, 400)

  // The HUD's height changes with its content (a wrapped stage label, a shop
  // badge appearing). Re-measuring on a 1 s cadence is two `getBoundingClientRect`
  // reads — cheaper and far more robust than observing a handful of elements.
  insetTimer = window.setInterval(() => {
    if (cssW === 0) return
    const insets = measureInsets()
    setViewport(cssW, cssH, insets.top, insets.bottom)
  }, 1000)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('orientationchange', onOrientationChange)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  clearInterval(insetTimer)
  stopBattleMusic()
})

</script>

<template lang="pug">
  div.scene
    canvas.scene__canvas(
      ref="canvasRef"
      :style="shakeStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    )

    //- ── HUD overlay ───────────────────────────────────────────────────────
    //- Non-interactive by default; individual controls opt back in.
    div.scene__hud
      div.scene__top(ref="topBarRef")
        div.scene__top-main
          RunHud(
            :stage="stage"
            :best="bestStage"
            :progress="progress01"
            :squad="squadCount"
            :damage="damage"
            :fire-rate="runFireRate"
            :phase="phase"
            :boss-hp="bossHp01"
            :elite="eliteAlive"
            :elite-hp="eliteHp01"
            :challenge="challenge"
          )
        div.scene__wallet
          CoinBadge(ref="coinBadgeRef")

      //- Control primer, centred under the top bar.
      div.scene__hint
        ControlHint(:hint="activeHint")

      //- First-run controls lightbox. Sits inside the HUD layer, which is
      //- already `pointer-events: none`, so the gesture it is teaching reaches
      //- the canvas underneath it.
      TutorialOverlay(v-if="tutorialActive" :progress="tutorialProgress")

      //- ── Bottom bar ────────────────────────────────────────────────────
      div.scene__bottom(ref="bottomBarRef")
        div.scene__meta
          FMuteButton
          //- Gone entirely — not disabled — on a build with no endpoint. A
          //- button that opens an empty board is worse than no button.
          FHudButton(
            v-if="leaderboardEnabled"
            tone="slate"
            :aria-label="t('leaderboard.title')"
            @click="showLeaderboard = true"
          )
            svg(viewBox="0 0 24 24" fill="currentColor")
              path(d="M6 3h12v2h3v3a4 4 0 0 1-3.6 4A6 6 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A6 6 0 0 1 6.6 12 4 4 0 0 1 3 8V5h3V3Zm0 4H5v1a2 2 0 0 0 1 1.7V7Zm12 2.7A2 2 0 0 0 19 8V7h-1v2.7Z")
          FHudButton(
            tone="slate"
            :aria-label="t('options.title')"
            @click="showOptions = true"
          )
            svg(viewBox="0 0 24 24" fill="currentColor")
              path(d="M12 4 a1 1 0 0 1 1 1 v1.6 a6 6 0 0 1 1.8 0.7 l1.1 -1.1 a1 1 0 0 1 1.4 1.4 l -1.1 1.1 a6 6 0 0 1 0.7 1.8 H18 a1 1 0 1 1 0 2 h-1.6 a6 6 0 0 1 -0.7 1.8 l1.1 1.1 a1 1 0 0 1 -1.4 1.4 l-1.1 -1.1 a6 6 0 0 1 -1.8 0.7 V18 a1 1 0 1 1 -2 0 v -1.6 a6 6 0 0 1 -1.8 -0.7 l-1.1 1.1 a1 1 0 0 1 -1.4 -1.4 l1.1 -1.1 a6 6 0 0 1 -0.7 -1.8 H6 a1 1 0 1 1 0 -2 h1.6 a6 6 0 0 1 0.7 -1.8 L7.2 7.6 a1 1 0 0 1 1.4 -1.4 l1.1 1.1 a6 6 0 0 1 1.8 -0.7 V5 a1 1 0 0 1 1 -1 Z M12 9 a3 3 0 1 0 0 6 a3 3 0 0 0 0 -6 Z")

        div.scene__shop
          span.scene__spotlight(v-if="showShopSpotlight") {{ t('upgrades.spotlight') }}
          FHudButton(
            tone="green"
            :attention="showShopSpotlight"
            :aria-label="t('upgrades.title')"
            @click="openUpgrades"
          )
            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round")
              path(d="M12 3v18M3 12h18")
              path(d="M6 6l1.5 1.5M18 6l-1.5 1.5M6 18l1.5-1.5M18 18l-1.5-1.5")
            template(#badge)
              FHudBadge(v-if="affordable > 0" tone="red") {{ affordable }}

    //- ── Result screen ─────────────────────────────────────────────────────
    FReward(
      v-model="showResult"
      :show-continue="false"
    )
      template(#ribbon)
        span.scene__ribbon {{ summary.cleared ? t('result.stageClear') : t('result.wipedOut') }}

      div.result
        div.result__headline
          span.result__stage {{ t('result.reachedStage', { n: summary.stage }) }}
          span.result__record(v-if="summary.isRecord") {{ t('result.newRecord') }}
          //- Only ever shown AFTER the run. Telling a player mid-stage that the
          //- game went easy on them takes the win away from them.
          span.result__relief(v-else-if="summary.relieved") {{ t('result.rallied') }}

        div.result__stats
          div.result__stat
            span.result__stat-value {{ summary.peakSquad }}
            span.result__stat-label {{ t('result.peakSquad') }}
          div.result__stat
            span.result__stat-value {{ summary.kills }}
            span.result__stat-label {{ t('result.kills') }}
          //- The whole cell disappears when the rank is unknown — an empty
          //- third column is a question the screen cannot answer.
          div.result__stat(v-if="resultRank")
            span.result__stat-value.is-rank {{ resultRank }}
            span.result__stat-label {{ playerTotal > 0 ? t('result.rankOf', { n: playerTotal }) : t('result.rankLabel') }}

        div.result__coins(ref="rewardCoinRef")
          IconCoin(class="result__coin-icon")
          span.result__coin-value +{{ summary.coins }}

        //- The ×3, above the actions and visually louder than either of them:
        //- it is the primary income of the game, not a footnote on the way out.
        FButton.result__reward(
          v-if="showRewardButton"
          size="md"
          type="warning"
          :is-disabled="adInFlight"
          @click="onClaimReward"
        )
          //- The film frame is the ad signal and comes first, exactly as it does
          //- on every other rewarded button on every portal we ship to.
          RewardAdIcon.result__reward-icon
          span.result__reward-mult {{ t('result.tripleCoins') }}
          IconCoin.result__reward-coin
          span.result__reward-bonus {{ t('result.tripleBonus', { n: rewardBonus }) }}

        //- Claimed: the button is replaced rather than merely disabled, so the
        //- screen never shows a dead control the player already used.
        div.result__claimed(v-else-if="rewardClaimed")
          IconCoin(class="result__claimed-icon")
          span {{ t('result.tripleClaimed') }}

        div.result__actions
          FButton(
            size="md"
            type="success"
            :is-disabled="adInFlight"
            @click="summary.cleared ? onNext() : onRetry()"
          ) {{ summary.cleared ? t('result.nextStage') : t('result.tryAgain') }}
          FButton(size="md" type="secondary" :is-disabled="adInFlight" @click="onUpgradeFromResult") {{ t('result.upgrade') }}

    OptionsModal(:is-open="showOptions" @close="showOptions = false")
    UpgradeModal(v-model="showUpgrades")
    LeaderboardModal(v-if="leaderboardEnabled" v-model="showLeaderboard")
</template>

<style scoped lang="sass">
.scene
  position: relative
  width: 100vw
  height: 100vh
  height: 100dvh
  overflow: hidden
  background-color: #0a1020

.scene__canvas
  position: absolute
  inset: 0
  display: block
  // The canvas owns every gesture; the browser must not steal them for
  // scrolling, pull-to-refresh or double-tap zoom.
  touch-action: none

.scene__hud
  position: absolute
  inset: 0
  pointer-events: none
  display: flex
  flex-direction: column

// ─── Top bar ────────────────────────────────────────────────────────────────

.scene__top
  display: flex
  align-items: flex-start
  gap: clamp(0.3rem, 2vw, 0.75rem)
  padding: calc(clamp(0.3rem, 1.6vw, 0.6rem) + env(safe-area-inset-top, 0px)) calc(clamp(0.35rem, 2vw, 0.7rem) + env(safe-area-inset-right, 0px)) 0 calc(clamp(0.35rem, 2vw, 0.7rem) + env(safe-area-inset-left, 0px))

.scene__top-main
  flex: 1 1 auto
  min-width: 0

.scene__wallet
  flex: 0 0 auto
  pointer-events: auto

.scene__hint
  display: flex
  justify-content: center
  margin-top: clamp(0.35rem, 2vw, 0.7rem)
  padding-inline: 0.5rem

// ─── Bottom bar ─────────────────────────────────────────────────────────────

.scene__bottom
  margin-top: auto
  display: flex
  align-items: flex-end
  justify-content: space-between
  gap: clamp(0.3rem, 2vw, 0.7rem)
  padding: 0 calc(clamp(0.35rem, 2vw, 0.7rem) + env(safe-area-inset-right, 0px)) calc(clamp(0.4rem, 2.4vw, 0.8rem) + env(safe-area-inset-bottom, 0px)) calc(clamp(0.35rem, 2vw, 0.7rem) + env(safe-area-inset-left, 0px))

.scene__meta
  display: flex
  align-items: flex-end
  gap: clamp(0.2rem, 1.2vw, 0.4rem)
  pointer-events: auto

.scene__shop
  position: relative
  display: flex
  align-items: center
  pointer-events: auto

// The "you can afford an upgrade" chip.
//
// It shipped at `clamp(0.5rem, 2.2vw, 0.68rem)` — eight pixels on a 320 px
// phone, which is smaller than the badge counter beside it and unreadable in
// portrait. It is a call to action for the one screen in the game that spends
// the currency, so it is now sized like one: a 0.8rem floor, real padding, and
// a shadow that lifts it off the road behind it.
.scene__spotlight
  position: absolute
  right: 100%
  margin-right: 0.5rem
  padding: 0.3em 0.7em
  border: 2px solid #0f1a30
  border-radius: 0.6rem
  background-image: linear-gradient(to bottom, #ffcd00, #f7a000)
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45), 0 0 12px rgba(255, 205, 0, 0.35)
  color: #fff
  font-weight: 900
  text-transform: uppercase
  white-space: nowrap
  letter-spacing: 0.02em
  font-size: clamp(0.8rem, 4.2vw, 1.05rem)
  text-shadow: 2px 2px 0 #000
  animation: spotlight-pulse 1.2s ease-in-out infinite

@keyframes spotlight-pulse
  0%, 100%
    opacity: 1
  50%
    opacity: 0.6

// ─── Result screen ──────────────────────────────────────────────────────────

.scene__ribbon
  color: #fff
  font-weight: 900
  font-style: italic
  text-transform: uppercase
  font-size: clamp(0.8rem, 3.6vw, 1.4rem)

.result
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(0.4rem, 2vw, 0.9rem)
  width: 100%
  max-width: 26rem

.result__headline
  display: flex
  flex-direction: column
  align-items: center
  gap: 0.15rem

.result__stage
  color: #fff
  font-weight: 900
  text-transform: uppercase
  text-align: center
  font-size: clamp(1rem, 5vw, 1.9rem)
  text-shadow: 3px 3px 0 #000

.result__record
  color: #ffd93c
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.65rem, 3vw, 0.95rem)
  text-shadow: 2px 2px 0 #000
  animation: spotlight-pulse 1.1s ease-in-out infinite

.result__relief
  color: #8fd6ff
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.55rem, 2.6vw, 0.8rem)
  text-shadow: 2px 2px 0 #000

.result__stats
  display: flex
  align-items: center
  gap: clamp(0.8rem, 5vw, 1.8rem)

.result__stat
  display: flex
  flex-direction: column
  align-items: center

.result__stat-value
  color: #8fd6ff
  font-weight: 900
  font-size: clamp(1rem, 5vw, 1.6rem)
  text-shadow: 2px 2px 0 #000

  // The rank is the one stat that is about other people, so it wears the board's
  // gold rather than the run's blue.
  &.is-rank
    color: #ffd93c

.result__stat-label
  color: #b9cbe8
  text-transform: uppercase
  font-size: clamp(0.5rem, 2.4vw, 0.7rem)

.result__coins
  display: flex
  align-items: center
  gap: 0.4rem

// ─── The ×3 ──────────────────────────────────────────────────────────────────
//
// Deliberately the loudest control on the screen: it is where the game's money
// comes from, and a primary action that looks like a secondary one gets read as
// optional. The breathe is slow enough not to nag.
.result__reward
  animation: reward-breathe 2.6s ease-in-out infinite

  // FButton drops slot content into a `display: block` span, so the icon and
  // the label were stacking on their own baselines instead of sitting on one
  // line. Laid out here rather than by changing FButton: every other button in
  // the game passes plain text, and widening the shared component to serve one
  // caller is how a design system stops being one.
  :deep(.f-button__text)
    display: inline-flex
    align-items: center
    justify-content: center
    gap: 0.45rem

.result__reward-coin
  flex: 0 0 auto
  width: 1.15em
  height: 1.15em
  color: #fff8d0

.result__reward-mult,
.result__reward-bonus
  white-space: nowrap

.result__claimed
  display: inline-flex
  align-items: center
  gap: 0.4rem
  color: #8fe9a6
  font-weight: 900
  font-size: clamp(0.72rem, 3.2vw, 1rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.75)

.result__claimed-icon
  width: clamp(1rem, 4.6vw, 1.4rem)
  height: clamp(1rem, 4.6vw, 1.4rem)
  color: #ffd93c

@keyframes reward-breathe
  0%, 100%
    scale: 1
  50%
    scale: 1.045

.result__coin-icon
  width: clamp(1.3rem, 6vw, 2rem)
  height: clamp(1.3rem, 6vw, 2rem)
  color: #ffd93c

.result__coin-value
  color: #ffd93c
  font-weight: 900
  font-size: clamp(1.2rem, 6vw, 2.2rem)
  text-shadow: 3px 3px 0 #000

.result__actions
  display: flex
  flex-wrap: wrap
  align-items: center
  justify-content: center
  gap: clamp(0.35rem, 2vw, 0.75rem)
  width: 100%

// ─── Landscape phone ────────────────────────────────────────────────────────
//
// Vertical space is the scarce resource: the lane needs the middle band, so the
// HUD's two bars get tighter rather than the canvas getting shorter.
@media (orientation: landscape) and (max-height: 30rem)
  .scene__hint
    margin-top: clamp(0.2rem, 1vw, 0.4rem)
</style>
