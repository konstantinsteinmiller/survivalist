// ─── The rewarded weapon offer ──────────────────────────────────────────────
//
// A launcher or a hose, mid-run, for a video. It is the only rewarded surface
// in the game that interrupts a LIVE run rather than sitting on a result
// screen, and almost everything odd about this module follows from that.
//
// ── Why it exists ──
//
// The road already gives weapons, and it gives them for reading the road: solve
// the levers, break the box. That is the right price for a player who is
// winning. A player who is NOT — the one still learning which gate to take, who
// arrives at the boss with nineteen bodies — never gets near a box, so the
// mechanic that would most obviously help them is the one they are least likely
// to see. This is the door out of that: no puzzle, no timing, thirty seconds of
// video, and the same weapon the road hands over.
//
// ── Why the state is here and not in the component ──
//
// The chip is rendered only while gameplay is live, and `isLiveGameplay` goes
// false for every modal, every paused tab and — crucially — for the ad itself.
// So the component unmounts in the middle of its own claim. Spent-ness, the
// attention cadence and the claim all live at module scope, where an unmount
// cannot reach them; the component is presentation and a click.
import { computed, ref, watch } from 'vue'
import { adInFlight, canOfferReward, claimReward, isRewardGated } from '@/use/useAdGate'
import { resumeMusicAfterAd } from '@/use/useSound'
import { activeWeapon, grantOfferWeapon, phase, sideWeapon, stage } from '@/use/useSurvivalGame'
import type { WeaponId } from '@/game/weapons'

/** How long one attention bounce runs. */
export const OFFER_BOUNCE_MS = 5_000
/** …and how often it comes back. Three minutes is long enough that the chip is
 *  scenery between bounces — this sits beside the mute button during play, and
 *  a control that keeps moving in the corner of the road is a control the
 *  player learns to resent rather than to press. */
export const OFFER_BOUNCE_EVERY_MS = 180_000

/**
 * Which weapon is on the table.
 *
 * The one the crowd is NOT already holding, preferring the launcher — so the
 * offer is always a real change rather than a louder version of the gun already
 * firing. Holding nothing or holding the gatling, it is the rocket; holding the
 * rocket, it is the gatling, which then leads while the launcher drops to the
 * side gun and keeps firing beside it (see `sideWeapon`). Both outcomes are an
 * upgrade, which is the point: nobody watches a video for a sidegrade.
 */
export const offerWeapon = computed<WeaponId>(
  () => (activeWeapon.value === 'rocket' ? 'gatling' : 'rocket')
)

/** Taken already on this run. */
const spent = ref(false)

// One per run AND one per stage, which are two different resets. A retry is a
// new run on the same stage number, and `startStage` confiscates the weapon on
// the way in — so a retry that could not re-buy would have charged for an ad
// and then taken the goods back. A stage handover on the continuous road never
// leaves `phase` at all, so it needs the other watch.
// Both fire synchronously: a stage that starts has to find the offer already
// back, not one tick later, because the chip renders in the same frame.
watch(phase, (now, before) => {
  if (now === 'run' && before !== 'run') spent.value = false
}, { flush: 'sync' })
watch(stage, () => { spent.value = false }, { flush: 'sync' })

/**
 * Is there an offer to make right now?
 *
 * `isRewardGated` first, and it is a build-time constant, so Rollup folds this
 * whole surface out of any build with no ad provider. That is deliberate and it
 * is the same rule the result screen's ×3 follows: on a build where the perk is
 * free, a button wearing a film-frame glyph that pays out instantly is a lie in
 * both directions — see `rewardOfferLive` in `GameScene.vue`.
 *
 * The last clause hides it once the crowd is firing two guns. There is no third
 * slot, so a third handover would only rotate which of the two leads, and an ad
 * has to buy something.
 */
export const canOfferWeapon = computed(() =>
  isRewardGated
  && canOfferReward.value
  && !spent.value
  && !(activeWeapon.value !== null && sideWeapon.value !== null)
)

/** True for `OFFER_BOUNCE_MS` out of every `OFFER_BOUNCE_EVERY_MS`. */
export const offerBouncing = ref(false)

let armed = false
let bounceTimer: ReturnType<typeof setTimeout> | null = null
let settleTimer: ReturnType<typeof setTimeout> | null = null

const fire = (): void => {
  // A bounce is spent only if there is something to bounce. The cadence itself
  // keeps running either way: it belongs to the clock, not to the chip, so a
  // player who was in a modal does not come back to an instant bounce.
  if (canOfferWeapon.value) {
    offerBouncing.value = true
    settleTimer = setTimeout(() => { offerBouncing.value = false }, OFFER_BOUNCE_MS)
  }
  bounceTimer = setTimeout(fire, OFFER_BOUNCE_EVERY_MS)
}

/**
 * Start the attention cadence. Idempotent, and it is never stopped.
 *
 * Called from the chip's `onMounted`, which is the first moment the control is
 * on screen — so the opening bounce lands when there is somebody to see it,
 * rather than behind the splash or the controls lightbox. It arms ONCE for the
 * life of the page: the chip unmounts and remounts constantly (every modal,
 * every ad, every result screen), and a cadence re-armed on each of those would
 * bounce on every return, which is the opposite of every-three-minutes.
 */
export const armOfferBounce = (): void => {
  if (armed) return
  armed = true
  fire()
}

/**
 * Trade a video for the weapon.
 *
 * @returns whether the crowd actually got it.
 */
export const claimWeaponOffer = async (): Promise<boolean> => {
  if (!canOfferWeapon.value || adInFlight.value) return false
  const id = offerWeapon.value
  let took = false
  try {
    await claimReward(() => { took = grantOfferWeapon(id) })
  } finally {
    // THE reason this placement is different from every other rewarded one in
    // the game: it interrupts a live run. `showRewardedAd` hard-stops the music
    // and clears the play intent by design, and the thing that normally brings
    // it back is the next `startBattleMusic()` on a result screen — a whole
    // stage away. Same rule `useQaAdTrigger` and `useFirstLoadInterstitial`
    // follow, for the same reason.
    resumeMusicAfterAd()
  }
  // Unspent when the grant refused, which is the case where the squad wiped
  // while the video played: `grantOfferWeapon` will not hand a launcher to a
  // run that is over, and charging for it anyway would be an ad watched for
  // nothing. The offer simply survives into the next stage.
  if (took) spent.value = true
  return took
}

/** Test seam: forget the cadence and the spend. */
export const __resetWeaponOffer = (): void => {
  if (bounceTimer !== null) clearTimeout(bounceTimer)
  if (settleTimer !== null) clearTimeout(settleTimer)
  bounceTimer = null
  settleTimer = null
  armed = false
  offerBouncing.value = false
  spent.value = false
}
