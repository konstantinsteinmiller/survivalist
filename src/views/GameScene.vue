<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  stage, phase, squadCount, damage, runFireRate, progress01, bossHp01, bestStage,
  eliteAlive, eliteHp01, challenge, declines,
  startStage, advanceStage, retryStage, step, steerTo, steerBy, steerOnly, runSummary,
  attackIncoming,
  incomingWord,
  isChargingGate, getCrates, getGates, getDividers, getBoss, getLevers, anchor, crowdRadius,
  getCages, getBulwarks,
  throwGrenade, raiseShield, shieldActive as isShieldUp,
  castFrostNova, throwDecoy, frostActive, getDecoy,
  activeWeapon, puzzleGift, puzzlePulled, puzzleTotal, puzzleWeapon, weaponPower,
  sideWeapon, sideWeaponPower,
  rallies, readWeaponPick, setRallyPolicy, stageBeats, worldVersion,
  isExpedition, startExpedition, cashOutSquad
} from '@/use/useSurvivalGame'
import { EXPEDITION_STAGE } from '@/use/useDailyExpedition'
import {
  BOSS_REWARD_STAGE, BOSS_REWARD_WEAPON, WEAPON_PICK_STAGE, type WeaponId
} from '@/game/weapons'
import {
  DECOY_GIFT_STAGE, FROST_GIFT_STAGE, FROST_TRIAL_STAGE, SHIELD_GIFT_STAGE,
  nextUnlock, stagesAway, type Unlock
} from '@/game/ladder'
import WeaponChoice from '@/components/organisms/WeaponChoice.vue'
import BossReward from '@/components/organisms/BossReward.vue'
import {
  drawScene, setViewport, screenToWorldX, screenDeltaToWorld, invalidateArt,
  worldToScreenX, worldToScreenY, getScale
} from '@/use/useSurvivalArt'
/**
 * The same module again, as a namespace, for ONE optional export.
 *
 * The felled boss's screen-space box is a number only the renderer can know (it
 * owns the projection and it owns which death frame is on screen), and the
 * accessor that reports it is being added by the agent who owns that file — so
 * this scene has to be able to compile, and to run, both before and after it
 * lands. A named import of an export that does not exist yet is a build error,
 * not a fallback, which is why this is a namespace probe rather than a second
 * line in the import above. See `felledBossBoxNow` for the contract and the
 * fallback position.
 *
 * Costs nothing in the bundle: this scene already imports `drawScene` from the
 * same module, and `drawScene` reaches every painter in it, so there was never
 * anything here for the tree-shaker to drop.
 */
import * as survivalArt from '@/use/useSurvivalArt'
import { rebaseVfx, renderScaleTier, resetVfx } from '@/use/useVfx'
import { FEED_ON, installPreviewSeam } from '@/game/previewFeed'
import { resetSkillFx } from '@/use/useSkillFx'
import { warmAudio, playFx } from '@/use/useGameAudio'
import {
  BOSS_FELLED_MS, WASTED_HOLD_MS, WASTED_ZOOM,
  CROWD_MAX_R, CROWD_SCREEN_Y, DECLINE_FREE_THROUGH_STAGE, DECLINE_MAX, LANE_HALF, UNIT_R
} from '@/game/survival'

import { getState, setState } from '@/use/useTowerState'
import { flushSaveNow } from '@/use/useSaveStatus'
import {
  BOSS_REWARD_KEY, BULWARK_HINT_KEY, CAGE_HINT_KEY,
  GUARD_HINT_KEY, LEVER_HINT_KEY, ONBOARDED_KEY, RESULTS_SEEN_KEY, REWARD_DECLINE_KEY,
  SHOP_SPOTLIGHT_KEY, TUTORIAL_KEY, WEAPON_PICK_KEY
} from '@/keys'
import useTowerEconomy from '@/use/useTowerEconomy'
import { affordableCount, grantUpgrade } from '@/use/useUpgrades'
import { track, exposeAnalytics } from '@/use/useAnalytics'
import { isDebug } from '@/use/useMatch'
import { cardPayout, RESULT_BOUNCE_DELAY_MS, shouldBounceGo } from '@/game/resultFlow'
import { stagesToPendingMilestone } from '@/use/useSurvivalGame'
import {
  grenadeTeaching, grenadeTeachHeld, setGrenadeTutorialAllowed
} from '@/use/useSurvivalGame'
import useSounds, {
  useMusic, setMusicRate, squadMusicRate, MUSIC_WIPE_RATE, MUSIC_WIPE_MS
} from '@/use/useSound'
import { useScreenshake } from '@/use/useScreenshake'
import { newTutorialClock, tickTutorial } from '@/use/useTutorialGate'
import { frameStart, frameEnd, phaseStart, phaseEnd } from '@/use/usePerfProbe'
import StageBanner from '@/components/game/StageBanner.vue'
import IncomingWarning from '@/components/game/IncomingWarning.vue'
import WeaponTag from '@/components/game/WeaponTag.vue'
import type { GameIconName } from '@/components/icons/iconNames'
import { isGamePaused, isAdShowing, isVisibilityHidden, isPlatformPaused } from '@/use/useGamePause'
import { spawnCoinExplosion, spawnCoinTrail } from '@/use/useCoinExplosion'
import { isInterstitialReady, showMidgameAd } from '@/use/useAds'
import {
  canShowInterstitial, markInterstitialShown, adInFlight, canOfferReward, claimReward, isRewardGated
} from '@/use/useAdGate'
import { signalGameplayLoaded, triggerHappytime } from '@/use/useCrazyGames'
import {
  syncGameplayLifecycle, isGameplayLive, restartGameplayBracket
} from '@/use/useGameplayLifecycle'
import { isAnyModalOpen } from '@/use/useModalState'
import { isMobileLandscape, isShortViewport } from '@/use/useUser'
import { mobileCheck } from '@/utils/function'
import {
  OUTSIDE_BOARD, boardSize, leaderboardEnabled, leaderboardFailed, playerTotal, rankFor, reportRun
} from '@/use/useLeaderboard'
// The share button is commented out of the result screen — see "The share
// card" below. The composable and its specs stay as they are.
// import { shareCardBusy, shareCardOffered, shareRunCard } from '@/use/useShareCard'

import RunHud from '@/components/game/RunHud.vue'
import GuardianBanner from '@/components/game/GuardianBanner.vue'
import ControlHint, { type HintId } from '@/components/game/ControlHint.vue'
import TutorialOverlay from '@/components/game/TutorialOverlay.vue'
import SteerHint from '@/components/game/SteerHint.vue'
import SkillBar from '@/components/game/SkillBar.vue'
import {
  skillReady, startCooldown, tickSkills, grenadeMultiplier, shieldDuration,
  skillOwned, skillTrial, spendTrial,
  type SkillId
} from '@/use/useSkills'
import RewardAdIcon from '@/components/atoms/RewardAdIcon.vue'
import FHudButton from '@/components/atoms/FHudButton.vue'
import FHudBadge from '@/components/atoms/FHudBadge.vue'
import FMuteButton from '@/components/atoms/FMuteButton.vue'
import FReward from '@/components/atoms/FReward.vue'
import FButton from '@/components/atoms/FButton.vue'
import CoinBadge from '@/components/organisms/CoinBadge.vue'
import DailyExpedition from '@/components/organisms/DailyExpedition.vue'
import TreasureChest from '@/components/organisms/TreasureChest.vue'
import OptionsModal from '@/components/organisms/OptionsModal.vue'
import UpgradeModal from '@/components/organisms/UpgradeModal.vue'
import LeaderboardModal from '@/components/organisms/LeaderboardModal.vue'
import IconCoin from '@/components/icons/IconCoin.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

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
/**
 * How many shop tracks the wallet can pay for right now.
 *
 * Declared HERE, at the top with the wallet it reads, rather than beside the
 * shop badge that shows it. It used to be load-bearing that it came first: the
 * auto-advance rule read it from a `watch` that evaluates the instant it is
 * registered, so declaring it further down the file was a temporal-dead-zone
 * crash that took the whole scene with it — and one that could never show up in
 * jsdom, because no spec mounts this component. The countdown is gone (see "The
 * forward button bounces" below) and nothing eager reads this any more, but the
 * placement stays: three things still depend on it, and a constant that lives
 * next to the wallet it is derived from cannot acquire that hazard again.
 */
const affordable = computed(() => affordableCount(coins.value))
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

/**
 * Hand the measured HUD to the camera, and the camera's own geometry to the
 * controls that have to dodge the crowd.
 *
 * One function because the two are the same measurement: the bottom strip is
 * both what the camera must not frame the crowd underneath AND what the skill
 * row sits on top of, and reading it twice at different moments is how the two
 * end up disagreeing by a few pixels on a phone that just rotated.
 */
const applyViewport = (): void => {
  // ── The recording's own framing ──
  //
  // The preview recorder hides the HUD with `visibility`, which keeps every box
  // exactly where it was: the bars are invisible and the camera still refuses
  // to use the two hundred pixels they occupy. So a clean feed reads the
  // insets as zero and the road is framed against the WHOLE viewport — 40 %
  // more scale on a phone-shaped clip, which is the difference between a lane
  // down the middle of the frame and a lane that fills it. Nothing else moves:
  // the crowd's screen position is a share of the viewport height, not a
  // measurement of the HUD. See `src/game/previewFeed.ts`.
  const insets = FEED_ON ? { top: 0, bottom: 0 } : measureInsets()
  setViewport(cssW, cssH, insets.top, insets.bottom)
  hudBottomPx.value = insets.bottom
  hudTopPx.value = insets.top
  // The deepest a survivor is ever drawn: the anchor row, plus a full-size
  // crowd's radius, plus one body. Sized off the MAXIMUM rather than the live
  // radius on purpose — a control that slid up the screen as the squad grew
  // would be a moving target, and the whole point of the placement is that the
  // player can reach for it without looking.
  squadFloorPx.value = cssH * CROWD_SCREEN_Y + (CROWD_MAX_R + UNIT_R) * getScale()
}

const resize = (): void => {
  const canvas = canvasRef.value
  if (!canvas) return
  // Clamp DPR by QUALITY TIER, not to a constant.
  //
  // Fill cost scales with the square of this number, and it is the single
  // biggest lever the renderer has on a slow phone: a 2.6x device rendering at
  // 2x is pushing 2.7x the pixels of one rendering at 1.25x, every frame,
  // forever. The tier is already driven by a rolling FPS average, so a device
  // that cannot hold 40 fps says so within a second and gets the cheaper canvas.
  //
  // 2 stays the ceiling for healthy devices — past that the cost doubles again
  // for no perceptible gain on a phone.
  //
  // `min` is the only rung that goes BELOW the device's own pixel grid: the
  // canvas is rendered at 0.8 CSS px and the compositor scales it back up, for
  // 36 % fewer pixels than even a DPR-1 canvas. It is visibly softer, and on a
  // device that is otherwise showing this game at 10 fps that is the right side
  // of the trade — a soft 30 fps reads as a game, a crisp 10 fps does not.
  const dprCap = renderScaleTier.value === 'min'
    ? 0.8
    : renderScaleTier.value === 'low'
      ? 1.25
      : renderScaleTier.value === 'medium' ? 1.5 : 2
  // `Math.min` against the device ratio would let a DPR-1 laptop keep a full-res
  // canvas at `min`, which is exactly the device the tier is trying to help.
  dpr = renderScaleTier.value === 'min'
    ? Math.min(window.devicePixelRatio || 1, 1) * dprCap
    : Math.min(window.devicePixelRatio || 1, dprCap)
  cssW = window.innerWidth
  cssH = window.innerHeight
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  applyViewport()
  // Half the road, in CSS pixels — measured through the renderer's own
  // projection rather than guessed at as a percentage of the viewport, so the
  // steer hint sits between the same rails the crowd does on every aspect ratio.
  laneHalfPx.value = Math.max(40, worldToScreenX(LANE_HALF) - worldToScreenX(0))
  // The lane tile is baked at the current scale, so a resize invalidates it.
  invalidateArt()
}

const loop = (t: number): void => {
  rafId = requestAnimationFrame(loop)
  // Performance probe. No-ops unless `?perfprobe=1` — see `usePerfProbe`.
  frameStart(t)
  const dt = lastT ? Math.min(t - lastT, 120) : 16
  lastT = t

  // The pause gate covers ads, hidden tabs, platform SDK pauses and open
  // modals. The RENDER loop keeps running (so the frame under an ad isn't a
  // frozen artefact) but the simulation clock does not advance.
  if (!isGamePaused.value && !overlayUp.value) {
    phaseStart('step')
    step(dt)
    driveKeyboardSteering(dt)
    // After `step`, because it reads the anchor the step just moved.
    driveTutorial(dt)
    // Poll the world for the hint chooser at ~5 Hz — see `hintTick`.
    hintPollAccum += dt
    if (hintPollAccum >= 200) {
      hintPollAccum = 0
      hintTick.value++
      // The skill cooldowns are wall-clock, so nothing would otherwise tell Vue
      // a button had come back. Ridden on the existing 5 Hz poll rather than a
      // timer of their own — a second-resolution countdown does not need 60 Hz.
      tickSkills()
      shieldLive.value = isShieldUp()
      frostLive.value = frostActive()
      decoyLive.value = getDecoy() !== null
    }
    phaseEnd('step')
  }

  phaseStart('draw')
  if (ctx) drawScene(ctx, cssW, cssH, dt, dpr)
  phaseEnd('draw')
  frameEnd()
}

// ─── Active skills ──────────────────────────────────────────────────────────
//
// The scene owns the WIRING; `useSkills` owns the clock and `useSurvivalGame`
// owns what the skills actually do. The cooldown is only ever started when the
// skill did something — a grenade thrown at an empty road returns false and
// keeps its charge, because a button that eats thirty seconds for nothing is a
// button players stop trusting.
const shieldLive = ref(false)
/** The world is frozen / a flare is up — the two late buttons glow rather
 *  than wait, as the shield's does. */
const frostLive = ref(false)
const decoyLive = ref(false)

const onUseSkill = (id: SkillId): void => {
  // ── The lesson's one exception ──
  //
  // While the grenade lesson is holding the world, the grenade is ready by
  // definition: the one instruction on screen may never also be refused. Every
  // other button is inert for the same beat — the lesson is about one act, and
  // letting the player clear it with the shield would teach the wrong one.
  if (grenadeTeaching()) {
    if (id !== 'grenade') return
  } else if (!skillReady(id)) return
  if (isGamePaused.value || overlayUp.value) return

  if (id === 'grenade') {
    if (!throwGrenade(grenadeMultiplier.value)) return
    startCooldown('grenade')
    return
  }

  if (id === 'frost') {
    // The stage-4 gift is one press of the real thing: it does everything the
    // owned skill does, and then the slot goes back behind its question mark
    // until stage 7 (`skillTrial`). An owned frost pays the cooldown instead.
    const trial = !skillOwned('frost') && skillTrial('frost')
    if (!trial && !skillOwned('frost')) return
    if (!castFrostNova()) return
    frostLive.value = true
    if (trial) spendTrial('frost')
    else startCooldown('frost')
    return
  }

  if (id === 'decoy') {
    if (!skillOwned('decoy')) return
    if (!throwDecoy()) return
    decoyLive.value = true
    startCooldown('decoy')
    return
  }

  const seconds = shieldDuration.value
  if (seconds <= 0) return
  raiseShield(seconds)
  shieldLive.value = true
  startCooldown('shield')
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

/**
 * Has the player actually done anything to this game yet?
 *
 * Set by the first input that could plausibly move the squad — a press, a mouse
 * moving over the road, an arrow key — and never cleared. It is the difference
 * between "the game has been on screen for twelve seconds" and "the player has
 * been playing for twelve seconds", and until this is true those are not the
 * same claim.
 *
 * Deliberately platform-neutral. The case that forced it is Poki's playtest
 * recording consent, which puts a yes/no dialog over the game at load: the
 * dialog lives outside the iframe, so the game sees no input at all while the
 * player reads it, and the tutorial's bail-out timer would spend itself against
 * a screen nobody was looking at. But nothing about that is specific to Poki —
 * an interstitial, a permissions prompt, a portal's own chrome or a tab opened
 * in the background all produce exactly the same thing, on every platform.
 */
const sawFirstInput = ref(false)

/** Every path that could have moved the squad funnels through here. */
const noteFirstInput = (): void => {
  if (!sawFirstInput.value) sawFirstInput.value = true
}

const onPointerDown = (e: PointerEvent): void => {
  // In a portal iframe the frame does not hold keyboard focus on load, and the
  // `preventDefault` below cancels the implicit focus transfer a click would
  // otherwise cause — so claim focus explicitly, or the arrow keys never arrive.
  try { window.focus() } catch { /* a cross-origin parent may refuse */ }
  e.preventDefault()
  noteFirstInput()
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
    if (e.pointerType === 'mouse' && !showResult.value) {
      // Only while the cursor is over the ROAD.
      //
      // Hover-steering used to follow the mouse anywhere on the page, which
      // made the skill buttons unusable with a mouse: they live off to the
      // right, so reaching for one dragged the whole squad into the right rail
      // on the way. Steering is a statement about a position on the road, and
      // the margins either side of the road are not positions on it — so out
      // there the crowd simply holds its last column.
      //
      // Pushing PAST the rail still pins the crowd to it, because the last
      // in-road column the cursor crossed was the rail itself.
      const wx = screenToWorldX(e.clientX)
      if (Math.abs(wx) <= LANE_HALF + 0.75) {
        // Hovering over the road IS playing, on a desktop — the crowd is already
        // following the cursor, so the player has had the lesson.
        noteFirstInput()
        steerTo(wx)
      }
    }
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
  // A completed drag is the gesture the hint exists to teach. Retire it here
  // rather than on `pointerdown`, so a player who taps once without dragging —
  // the exact person this is for — still gets to see it.
  //
  // Only once the hint is actually up, though. On a first run the tutorial
  // lightbox is dismissed BY dragging, and counting that drag would retire the
  // hint before it had been shown — which would have left it visible to
  // returning players only, i.e. everyone except the people it is for.
  if (dragging && steerHintArmed.value) retireSteerHint()
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
    noteFirstInput()
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

// The clock, its two deadlines and the rule that the bail-out only counts time
// the player was actually present for, all live in `useTutorialGate`.

// ─── The steer hint (touch only, opening seconds) ───────────────────────────
//
// Mobile players were reported as struggling with a control that has exactly
// one axis — which is the whole reason: there is no button to find, so a player
// who does not think to DRAG watches a game that looks like it plays itself.
// The written primer answers a question they never ask, and the first-run
// lightbox only ever shows once.
//
// Five seconds of a finger sweeping between the rails, and then it retires. It
// also retires the moment the player steers for real: nagging someone who has
// already worked it out is its own kind of failure, and this hint's whole job
// is to be unnecessary.
const STEER_HINT_MS = 5000

const laneHalfPx = ref(0)
/**
 * The lowest pixel a survivor can ever be drawn at, and the top of the bottom
 * HUD strip. Between them is the one band of screen the crowd never occupies,
 * which is where the skill buttons go — see `SkillBar.vue`.
 *
 * Measured through the renderer's own projection and the HUD's own box rather
 * than assumed as a percentage, for the same reason `laneHalfPx` is: a control
 * placed against the crowd has to move with the camera on every aspect ratio.
 */
const squadFloorPx = ref(0)
const hudBottomPx = ref(0)
/** The bottom edge of the TOP strip — the stage label, the ladder chip, the
 *  milestone star and the progress rail. Published for the same reason
 *  `hudBottomPx` is: an overlay that has to sit clear of the HUD must clear the
 *  HUD that is actually there, not a constant somebody guessed once. */
const hudTopPx = ref(0)
const steerHintDone = ref(false)
const steerHintArmed = ref(false)
let steerHintTimer: number | null = null

/** Touch-ish device. A mouse player has a cursor that already steers on hover. */
const isTouchDevice = mobileCheck()
  || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)

const showSteerHint = computed(() =>
  isTouchDevice
  && steerHintArmed.value
  && !steerHintDone.value
  && isLiveGameplay.value
)

const retireSteerHint = (): void => {
  if (steerHintTimer !== null) {
    clearTimeout(steerHintTimer)
    steerHintTimer = null
  }
  steerHintDone.value = true
}

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
let tutorialClock = newTutorialClock(0)

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
  const { progress, outcome } = tickTutorial(
    tutorialClock, dtMs, sawFirstInput.value, anchor().x
  )
  tutorialProgress.value = progress
  if (outcome !== null) finishTutorial(outcome === 'moved')
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
  // The lever primer, on the same footing as the guard one and for the same
  // reason: it arrives on stage 4, long after the onboarding ladder below has
  // switched itself off, and a bonus nobody explains is a bonus nobody takes.
  // Only while there is still something to shoot — a hint pointing at a puzzle
  // the crowd has already run past teaches the wrong thing.
  if (leverHintDue.value) return 'lever'
  // The two roadside prizes, on the lever's footing exactly. Ordered shield-box
  // first because it is the rarer prop and the one whose misreading is
  // expensive: a player who mistakes it for the timed skill spends their absorb
  // waiting for a countdown that never comes.
  if (bulwarkHintDue.value) return 'shieldBox'
  if (cageHintDue.value) return 'cage'
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
  if (!before || warn) return
  // …except the two crate lessons, which retire ONLY when the matching stat
  // actually moves (below).
  //
  // Passing a crate is not learning what a crate is. A player who reads "boxes
  // are obstacles" and steers around the first one would otherwise have the
  // lesson marked as taught by the very act of avoiding it, and never be told
  // again — which is exactly the misconception the hint exists to correct.
  if (before === 'crate' || before === 'rate') return
  markHintDone(before)
})

// The gate hint retires itself the moment the player actually holds fire on a
// gate — which is the behaviour it was asking for. Not during the lightbox,
// though: the opening doorway pumps under the crowd's fire while the road is
// held, and a lesson the player watched happen is not one they have had.
watch(isChargingGate, (charging) => {
  if (charging && !tutorialActive.value) markHintDone('gate')
})
watch(damage, (now, before) => { if (now > before) markHintDone('crate') })
watch(runFireRate, (now, before) => { if (now > before) markHintDone('rate') })
watch(phase, (p) => { if (p === 'boss') markHintDone('boss') })

/**
 * The lever primer, shown exactly once in a player's life.
 *
 * Gated on a lever actually being ON SCREEN and still unpulled, so the words
 * arrive while the thing they describe is visible — the whole failure mode this
 * hint exists to prevent is a player reading "shoot the levers" and having no
 * idea what a lever looks like. Retired by `leverHintSeen` the moment the first
 * one goes over, which is the behaviour it was asking for.
 */
const leverHintSeen = ref(getState<boolean>(LEVER_HINT_KEY, false) === true)
const leverHintDue = computed(() => {
  void hintTick.value
  if (leverHintSeen.value || puzzleWeapon.value === null) return false
  if (puzzlePulled.value > 0) return false
  const a = anchor()
  return getLevers().some((lv) => !lv.pulled && lv.y - a.y > 0 && lv.y - a.y < 13)
})
// Persisted on the first pull rather than on the first sighting: a player who
// saw the pill and did nothing has not learned it yet, and the road will offer
// them another puzzle next stage.
watch(puzzlePulled, (n) => {
  if (n <= 0 || leverHintSeen.value) return
  leverHintSeen.value = true
  markHintDone('lever')
  setState(LEVER_HINT_KEY, true)
})

/**
 * The two roadside prizes, primed once each in a player's life.
 *
 * Same shape as the lever primer above, and the same 13-unit window — the prop
 * has to be ON SCREEN and still ahead of the crowd while the words are up, or
 * the player reads an instruction about an object they cannot see.
 *
 * Retired on the far side rather than on a payout, unlike the lever's. A lever
 * has a moment that proves the lesson landed (it goes over); these two do not —
 * a player can read the pill, decide the detour is not worth it this time, and
 * be entirely correct. Passing the prop is therefore the whole event, and
 * persisting on it is what stops a bonus turning into a nag.
 */
const cageHintSeen = ref(getState<boolean>(CAGE_HINT_KEY, false) === true)
const cageHintDue = computed(() => {
  void hintTick.value
  if (cageHintSeen.value) return false
  const a = anchor()
  return getCages().some((c) => !c.dead && c.y - a.y > 0 && c.y - a.y < 13)
})
watch(cageHintDue, (now, before) => {
  if (!before || now || cageHintSeen.value) return
  cageHintSeen.value = true
  markHintDone('cage')
  setState(CAGE_HINT_KEY, true)
})

const bulwarkHintSeen = ref(getState<boolean>(BULWARK_HINT_KEY, false) === true)
const bulwarkHintDue = computed(() => {
  void hintTick.value
  if (bulwarkHintSeen.value) return false
  const a = anchor()
  return getBulwarks().some((w) => !w.dead && w.y - a.y > 0 && w.y - a.y < 13)
})
watch(bulwarkHintDue, (now, before) => {
  if (!before || now || bulwarkHintSeen.value) return
  bulwarkHintSeen.value = true
  markHintDone('shieldBox')
  setState(BULWARK_HINT_KEY, true)
})

/** True while the boss is planted behind its phase shield. Polled at the same
 *  5 Hz as the lane warnings — a shield lasts a full second, so 200 ms is
 *  plenty and it costs nothing on the frames in between. */
const bossGuarding = computed(() => {
  void hintTick.value
  return (getBoss()?.guard ?? 0) > 0
})

/**
 * Is something big about to land?
 *
 * True from the moment an attack has picked its ground until it lands — the
 * boss once it has aimed, and any elite inside its own wind-up. Polled on the
 * same 5 Hz clock as the lane warnings, which is ample: the shortest telegraph
 * in the game is the elite's 0.3 s and the boss's is a full second, so the badge
 * is up for at least one and usually five of these ticks.
 *
 * Deliberately covers BOTH attackers. The in-world tells differ — a falling
 * rock, a winding blade — but "am I about to be hit" is one question, and
 * answering it in two different places would defeat the point of having a fixed
 * place to look.
 */
const attackWarning = computed(() => {
  void hintTick.value
  return attackIncoming()
})
/**
 * …and WHICH WAY, for the badge's one word.
 *
 * On the same 5 Hz clock as the boolean above, and read from the same place, so
 * the two can never describe different attacks. Three of the boss pool's second
 * verbs mark ground to get TO rather than ground to leave — see
 * `incomingAnswer` — and the badge has to say so or it is pointing the player
 * out of the only safe patch of road. The gaze is the third answer: STOP.
 */
const attackAnswer = computed(() => {
  void hintTick.value
  return incomingWord() ?? 'away'
})

/**
 * ─── One instruction at a time ──────────────────────────────────────────────
 *
 * The hint pill goes quiet while an attack is inbound.
 *
 * All five first-contact testers hit this, and one lost 38 of 41 survivors to
 * it: at the very first boss the gaze attack raises "HOLD STILL" on the warning
 * badge while the guard primer underneath says the shield is up and to MOVE.
 * Two opposite commands, in the first minute, at the moment that matters — and
 * a player given two verbs at once obeys neither in time.
 *
 * ─── Every warning, not only the contradicting one ───────────────────────────
 *
 * The narrow fix is to suppress only when `attackAnswer` is `'still'`, because
 * that is the pair that literally contradicts. I went wider, and deliberately:
 *
 *   • THE BADGE IS THE ONLY INSTRUCTION IN THIS GAME WITH A DEADLINE. It is up
 *     for the length of a telegraph — 0.3 s for an elite, about a second for the
 *     boss — and acting on it late is the same as not acting. A teaching pill has
 *     no deadline at all: every hint here retires on the thing it describes
 *     happening, so one that waits a beat loses nothing.
 *   • 'AWAY' AND 'TOWARD' COMPETE TOO, even though they do not contradict.
 *     "Hold fire on the gate" and "shoot the levers" are both directives that
 *     send the player somewhere other than the one patch of road that is about
 *     to be safe. A pill that merely divides attention at a 0.3 s deadline is
 *     the same bug with a smaller blast radius.
 *   • A WORD-BY-WORD MATRIX WOULD ROT. The boss pool grows and its second verbs
 *     already come in three flavours (see `incomingAnswer`); a rule keyed on
 *     which answers happen to clash with which of eleven hint texts would need
 *     re-deriving every time either list changes, in twenty-one languages. "The
 *     urgent instruction owns the verb while it is up" needs re-deriving never.
 *
 * Read off the SAME 5 Hz tick as `attackWarning` and `attackAnswer`, which is
 * the property that actually matters here: the badge and the pill cannot
 * disagree about whether an attack is inbound, because they are looking at one
 * sample of the world rather than two.
 *
 * ⚠️ This HIDES the pill; it must never RETIRE the hint. A lesson the player
 * never got to read is still owed to them once the road is safe again, so
 * nothing on this path touches `markHintDone` or `hintsDone`, and `activeHint`
 * still resolves to the same hint underneath — `ControlHint`'s `suppressed` prop
 * takes the pill down without unmounting it. The retirement watchers
 * (`laneWarning`, `isChargingGate`, `damage`, `runFireRate`, `phase`) are all
 * driven by the WORLD rather than by whether the pill was on screen, so a hint
 * suppressed through its whole window is neither shown nor spent.
 */
const hintSuppressed = computed(() =>
  // An inbound attack takes the pill DOWN rather than un-choosing it — see the
  // note on the template — and so do the two moments that own the screen with
  // type of their own. Measured: "BOSS FELLED!" landed straight across a primer
  // reading "Keep shooting a gate — it grows +1 every half second", and neither
  // was readable. A hint the player never got to read is still owed to them
  // afterwards, which is exactly what suppression (rather than selection) means.
  //
  // The grenade lesson is the same rule for a stronger reason: it dims the whole
  // screen down to one button and refuses to start again until that button is
  // pressed, and the pill rides ABOVE the lightbox. A primer reading "keep
  // shooting a gate" over a lesson that will not accept anything but a grenade
  // is the game giving two instructions and honouring one.
  attackWarning.value || bossFelledShown.value || wastedShown.value || grenadeTeachHeld.value
)
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

/**
 * The result screen's short-viewport tier — a landscape phone, or any embed
 * under 500px tall.
 *
 * It exists because the two BUTTON rows cannot be sized in CSS from here: their
 * metrics arrive as inline custom properties from `FButton`, which a stylesheet
 * rule cannot outrank. Everything else on this screen is sized in `vmin` and
 * needs no flag at all.
 */
const resultCompact = computed(() => isMobileLandscape.value || isShortViewport.value)

const showResult = ref(false)
const showOptions = ref(false)
const showUpgrades = ref(false)
const showLeaderboard = ref(false)
const summary = ref(runSummary())

/** The weapon choice is up — see `flowToNextStage`. */
const showWeaponPick = ref(false)
/** The first boss's gift is up — see `presentBossReward`. */
const showBossReward = ref(false)
/**
 * Something full-screen owns the road: the result screen, the weapon choice or
 * the first boss's gift. All three stop the clock, hide the run's own controls
 * (the chest included), and are "not gameplay" to every portal listening.
 */
const overlayUp = computed(() => showResult.value || showWeaponPick.value || showBossReward.value)

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
// ─── The near-miss readout ──────────────────────────────────────────────────
//
// Whole percent, floored rather than rounded: a boss taken to a sliver must not
// print "100 %" over a wipe, and 99 is the honest ceiling for a stage nobody
// finished. Floor also keeps "you beat your best" strictly true — two attempts
// a fraction apart cannot both read 74.
//
// The scale is `reach01`, not `progress01`: the road's own number hits 1 the
// moment the arena opens, so every boss death would otherwise read as a
// hundred percent. See `reachOf`.

const pct01 = (v: number): number =>
  Math.max(0, Math.min(99, Math.floor((Number.isFinite(v) ? v : 0) * 100)))

const reachPct = computed(() => pct01(summary.value.reach01))
const bestReachPct = computed(() => pct01(summary.value.bestReach01))

/** A campaign loss the player actually played. Nothing to say about a clear (it
 *  reached the end), an expedition (one attempt, nothing to beat) or an idle tab
 *  — `bestProgress01` is only ever written for a run that was steered. */
const showReach = computed(() =>
  showResult.value && !summary.value.cleared && !summary.value.expedition
)

/** This run went further than every attempt before it — including the first
 *  attempt, which has nothing behind it and is therefore always a best. */
const isNewReach = computed(() => reachPct.value > bestReachPct.value)

/** Draw the ghost tick only where it is still visible and still means
 *  something: behind the fill it is invisible, at the far edges it is a mark
 *  sitting on the rail's own cap. */
const showReachMark = computed(() =>
  bestReachPct.value > 2 && bestReachPct.value > reachPct.value
)

/**
 * ─── What stopped the run, in one line ──────────────────────────────────────
 *
 * The oldest open finding in the file, carried from Playtest 01 into Playtest 02
 * word for word: "Still nothing says what killed you." The simulation has known
 * all along — every death is billed to a cause and the `wipe` analytics event
 * has been reporting it for months — so this is only ever a matter of putting
 * the number the game already has on the screen the player is already reading.
 *
 * TWO rules decide the shape of it, both from the owner:
 *
 *   • it is an INFO BOX, not a paragraph — a bordered strip with a glyph, so it
 *     is recognisably a note about the run rather than more of the result;
 *   • it is SHORT. "Players hate to read." Every line in `result.cause.*` is
 *     three or four words and names one noun: the thing to avoid next time.
 *
 * Null on a clear (nothing to explain) and null on a run with no deaths billed
 * at all, which is not a case the game can normally produce but is exactly what
 * a dev skip or a first frame looks like — and an empty box is a question the
 * screen cannot answer.
 */
const deathCause = computed(() => (summary.value.cleared ? null : summary.value.cause))

/** Stages left until the next milestone pays. Null on an expedition, which is
 *  not on the campaign's counter at all. */
const milestoneIn = computed(() => stagesToPendingMilestone(stage.value))

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

// ─── The share card ─────────────────────────────────────────────────────────
//
// A 1080×1080 picture of a record run, built on the tap and handed to whatever
// the device calls "share". Two conditions, and both are somebody else's
// numbers rather than a second opinion of this screen's:
//
//   • THE RUN IS A RECORD — `summary.isRecord`, the same flag that puts "New
//     record!" on this screen a few lines up. If the screen does not already
//     say the run was a record, there is nothing to share.
//   • THE BOARD PLACED IT — `resultRank` is a real placing rather than empty
//     (no board on this build, or the endpoint failed) or the `…` that means
//     the read has not landed. That is the roadmap's "compared to peers from
//     the leaderboard on the same stage", read through the machinery that
//     already answers it: `rankFor` ranks the run's stage against the whole
//     population the board knows about, live, cached or baked. Nothing here
//     asks the network for anything — the read the rank chip already did is
//     the entire budget, and on a build with no endpoint at all the button
//     simply never appears.
//
// Plus `shareCardOffered`, which is the device's and the frame's answer rather
// than the run's: no Web Share for files, no permissions policy for it in this
// iframe, or a refusal already seen this session, and the button does not
// exist. See `useShareCard` for why that is three separate questions.
// TAKEN OUT OF THE SCREEN (2026-09-12): the share sheet on the devices that
// reached it had no target that takes a picture, so the button could only
// DOWNLOAD the card — which tells nobody about the run and leaves a stray file
// behind. Everything below is kept so it can come back in one uncomment.
// const showShareCard = computed(() =>
//   summary.value.isRecord &&
//   resultRank.value !== '' &&
//   resultRank.value !== '…' &&
//   shareCardOffered.value
// )

/**
 * Everything the card prints, resolved HERE.
 *
 * The renderer takes finished strings and never sees `t`, so the card can be
 * drawn and tested without an i18n instance — and so the word order inside a
 * caption stays a translator's decision. The rank arrives as two runs, the
 * placing and the population, exactly as the chip above shows them, because
 * gluing them into one string would translate "of" into English word order for
 * twenty locales.
 */
// const onShareCard = (): void => {
//   void shareRunCard({
//     stage: summary.value.stage,
//     peakSquad: summary.value.peakSquad,
//     title: t('gameName'),
//     recordLabel: t('result.newRecord'),
//     stageWord: t('leaderboard.stage'),
//     squadWord: t('leaderboard.squad'),
//     rankValue: resultRank.value,
//     rankOf: playerTotal.value > 0 ? t('result.rankOf', { n: playerTotal.value }) : '',
//     text: t('share.text', { n: summary.value.stage, game: t('gameName') })
//   })
// }

const rewardCoinRef = ref<HTMLElement | null>(null)
const coinBadgeRef = ref<InstanceType<typeof CoinBadge> | null>(null)
const coinBadgeEl = computed<HTMLElement | null>(() => coinBadgeRef.value?.rootEl ?? null)

const RESULT_AD_DELAY_MS = 500
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Show an interstitial, if one is due.
 *
 * Three gates: the run must have ended in a WIN, the provider must actually
 * have inventory, and the cooldown in `useAdGate` must have elapsed. Every
 * interstitial in the game goes through here, so the pacing rule lives in
 * exactly one place.
 *
 * ─── Why a win, and only a win ──────────────────────────────────────────────
 *
 * It used to run on both edges, which meant the most common interstitial in the
 * game was the one that landed on a DEFEAT. A playtester met it on her first
 * wipe, watched the ad dim the road she had just died on, and filed it as the
 * ad having killed her — she was already at zero survivors, but the reading is
 * the point: an ad over a loss is an ad the player blames.
 *
 * A boss kill is the opposite moment. The player has just won something, the
 * stage is over, and the break is the natural one. So the ad is paid for out of
 * a good mood rather than a bad one, and the worst-placed ad in the game — the
 * one after a defeat — simply does not exist any more.
 */
const maybeShowInterstitial = async (cleared: boolean): Promise<void> => {
  if (!cleared) return
  if (!isInterstitialReady.value) return
  if (!canShowInterstitial()) return
  markInterstitialShown()
  await wait(RESULT_AD_DELAY_MS)
  await showMidgameAd()
}

/**
 * ─── The opening stages hand over without stopping ──────────────────────────
 *
 * Clearing a stage used to mean, always: music down, overlay up, statistics, a
 * button. That is the right shape for a player deciding what to buy. It is the
 * wrong shape at twenty-five seconds, where it reads as an ENDING to somebody
 * who has not decided anything yet — and measured on Poki, half the testers left
 * at exactly that screen, having just beaten the tutorial boss.
 *
 * The arithmetic underneath is the real problem. Stages run 24-48 s, so Poki's
 * three-minute gate needs five cleared stages, which is five of those screens.
 * Even at a generous 87 % continue rate per screen that is 0.87^5 — half the
 * players gone before the gate, purely to structure.
 *
 * So the first stages do not stop. Coins bank, the gift lands, the road keeps
 * moving, and `StageBanner` rides over the next stage's opening — which is
 * fifteen units of empty road by design, so the handover costs no gameplay. The
 * first real result screen arrives around ninety seconds, by which point the
 * player has met a boss, been handed a skill, and has coins worth spending.
 *
 * The shop is not skipped, only deferred: it is on the HUD throughout, and every
 * stage from `CONTINUOUS_THROUGH_STAGE` on presents normally.
 *
 * THREE, not two, since the second fit-test pass. Measured on the sim, a clean
 * run finishes stage 3 at about 1:35 — inside the two-minute cliff the first
 * test reported — so stage 3's clear was the first full stop a stranger met and
 * it landed exactly where they were leaving. The first result screen now
 * arrives after stage 4, around 2:20, with a weapon already in hand, a shield
 * already announced and coins worth spending. The one stop the opening stages
 * DO make on purpose is the weapon choice on the way into stage 3, and that is
 * a gift with a decision in it rather than a summary.
 *
 * …and, since the playtests that lost a quarter of their players at the first
 * kill, a three-second one after stage 1: the boss's launcher, handed over as a
 * reveal that closes itself (`presentBossReward`). A gift, not a screen.
 */
const CONTINUOUS_THROUGH_STAGE = 3

/** How long the handover banner sits over the new stage's opening. */
const BANNER_MS = 1700

const bannerStage = ref(0)
const bannerUnlock = ref<{ icon: GameIconName; label: string; tag?: string } | null>(null)
const bannerNext = ref<{ icon: GameIconName; text: string } | null>(null)
const bannerTitle = ref<string | null>(null)
const bannerShown = ref(false)
let bannerTimer: number | null = null

const showBanner = (
  o: {
    stage: number
    unlock?: { icon: GameIconName; label: string; tag?: string } | null
    next?: { icon: GameIconName; text: string } | null
    title?: string | null
  }
): void => {
  bannerStage.value = o.stage
  bannerUnlock.value = o.unlock ?? null
  bannerNext.value = o.next ?? null
  bannerTitle.value = o.title ?? null
  bannerShown.value = true
  if (bannerTimer !== null) clearTimeout(bannerTimer)
  bannerTimer = window.setTimeout(() => { bannerShown.value = false }, BANNER_MS)
}

// ─── The ladder, in words ───────────────────────────────────────────────────
//
// `game/ladder.ts` says WHAT is next and WHEN; these say it in the player's
// language, for the banner and for the chip beside the stage number.

const unlockLabel = (u: Unlock): string =>
  u.kind === 'weaponPick'
    ? t('ladder.weaponPick')
    : u.kind === 'shield'
      ? t('skills.shield')
      : u.kind === 'skill'
        ? t(`skills.${u.skill ?? 'frost'}`)
        : t(`weapons.${u.weapon ?? 'gatling'}`)

const unlockWhen = (n: number): string =>
  n <= 1 ? t('ladder.nextStage') : t('ladder.stagesAway', { n })

/** The chip: a glyph and "Shield · next stage". */
const ladderChip = (forStage: number): { icon: GameIconName; text: string } | null => {
  const u = nextUnlock(forStage)
  if (!u) return null
  return { icon: u.icon, text: `${unlockLabel(u)} · ${unlockWhen(stagesAway(forStage, u))}` }
}

/** The banner's line: "Next: Shield · next stage". */
const ladderLine = (forStage: number): { icon: GameIconName; text: string } | null => {
  const u = nextUnlock(forStage)
  if (!u) return null
  return {
    icon: u.icon,
    text: t('flow.next', { label: unlockLabel(u), when: unlockWhen(stagesAway(forStage, u)) })
  }
}

/** What the HUD promises during this stage. */
const hudNext = computed(() => ladderChip(stage.value))

/**
 * The beats marked on the rail — read off the track whenever the world is
 * rebuilt, so the marks are there from the stage's first frame.
 */
const hudBeats = computed(() => {
  void worldVersion.value
  return stageBeats().map((b) => ({
    at: b.at,
    kind: b.kind,
    icon: (b.kind === 'weapon' ? (b.weapon ?? 'gatling') : 'skull') as GameIconName
  }))
})

/**
 * The stage-3 gift, now that the weapon has stage 3.
 *
 * A player who has just cleared stage 3 has earned something they can SEE, and
 * "here is a button you did not have" is a far better reason to start stage 4
 * than a coin total. The shield is the natural pick: it is the game's other
 * active skill, it is otherwise hidden behind a shop the player has not opened
 * yet, and handing over level 1 leaves the remaining nine for the shop to sell.
 * It used to land on the stage-1 banner; it moved so the ladder reads gift,
 * gift, gift — weapon on 3, shield on 4, a weapon on the road at 4 — rather
 * than one gift and a long silence. Returns what to announce, or `null` if they
 * already had it.
 */
const grantStageGift = (clearedStage: number): { icon: GameIconName; label: string } | null => {
  if (clearedStage !== SHIELD_GIFT_STAGE - 1) return null
  if (!grantUpgrade('shield', 1)) return null
  return { icon: 'shield', label: t('skills.shield') }
}

/**
 * The late skills' handover, read off the stage just cleared: the stage-4 boss
 * pays one free Frost Nova, stage 6 the skill itself, stage 9 the Decoy Flare.
 *
 * Nothing is GRANTED here — ownership is read off the cleared stage in the save
 * (`useSkills`), so the slot is already filled by the time this runs. This is
 * only the announcement, and it is made once: on the way out of the first clear
 * of that stage, never on a retry and never out of an expedition.
 */
const skillGiftFor = (
  s: { stage: number; cleared: boolean; expedition: boolean }
): { icon: GameIconName; label: string; tag?: string } | null => {
  if (!s.cleared || s.expedition) return null
  if (s.stage === FROST_TRIAL_STAGE - 1 && skillTrial('frost')) {
    return { icon: 'snowflake', label: t('skills.frost'), tag: t('skills.trialTag') }
  }
  if (s.stage === FROST_GIFT_STAGE - 1) return { icon: 'snowflake', label: t('skills.frost') }
  if (s.stage === DECOY_GIFT_STAGE - 1) return { icon: 'flare', label: t('skills.decoy') }
  return null
}

/** A cleared stage that hands straight over to the next one. */
const flowToNextStage = async (): Promise<void> => {
  summary.value = runSummary()
  triggerHappytime()

  // The one stop the handover makes: the weapon choice, on the way into
  // `WEAPON_PICK_STAGE`, for a player who has not chosen yet. The road waits
  // (`overlayUp` gates the clock), the reveal goes up, and `onWeaponPicked`
  // finishes what this function started. A player who already chose — a
  // retry, a reload, a second career — goes straight through with the weapon
  // `startStage` re-arms from the save.
  //
  // Read BEFORE the coins are banked, not after, because it decides where the
  // payment can be SEEN: a full-screen card over the road means the crowd burst
  // has to wait for `onWeaponPicked`. See `showCrowdCash`.
  const picking = summary.value.stage === WEAPON_PICK_STAGE - 1 && readWeaponPick() === null

  // Everything `presentResult` banks, minus the screen. The music is
  // deliberately NOT stopped and not restarted: it has been playing since the
  // run began and the player never left the run.
  //
  // `'crowd'` is the whole of finding 6: this is the handover, the road is open,
  // the survivors are on screen, and the coins have to be SEEN leaving them.
  void bankCoins(picking ? 'deferred' : 'crowd')
  void reportRun(bestStage.value, summary.value.peakSquad)
  if (!onboarded.value) {
    onboarded.value = true
    setState(ONBOARDED_KEY, true)
  }

  const gift = grantStageGift(summary.value.stage)

  if (picking) {
    showWeaponPick.value = true
    return
  }
  completeHandover(gift)
}

/**
 * The next stage, picked up on the ground the last boss fell on.
 *
 * `advanceStage` opens the new road under the crowd and says how far it moved
 * the world to do it; the sparks, numbers and scorch marks of the fight move by
 * the same distance and stay where they were made. Only when nothing carried
 * over (out of an expedition) is the debris swept instead, as before.
 */
const continueRoad = (): void => {
  const moved = advanceStage()
  if (moved !== 0) rebaseVfx(moved)
  else resetVfx()
  // The freeze and the flare ended with the road they were used on; their
  // rings and frost go with them rather than drawing into the next one.
  resetSkillFx()
  // A NEW STAGE IS A NEW PLAY, even when the road never stopped. A handover
  // with no screen in between moves `phase` from 'boss' through 'clear' to
  // 'run' inside one tick, so `isLiveGameplay` reads true on both sides and
  // reports nothing — the stage the player just cleared never ended as far as
  // the portal is concerned, and the one they are in now never began. Plays and
  // playtime are counted off those brackets, so the handover says it here, with
  // the new road already open. Where a screen DID separate the two stages the
  // bracket is already closed and this is a no-op.
  restartGameplayBracket()
}

/** The back half of a continuous handover: the next road, and the banner. */
const completeHandover = (gift: { icon: GameIconName; label: string } | null): void => {
  invalidateArt()
  continueRoad()
  showBanner({
    stage: stage.value,
    unlock: gift,
    // The promise rides every banner that has no gift on it.
    next: gift ? null : ladderLine(stage.value)
  })
}

/**
 * The player tapped a card.
 *
 * Persisted and flushed before the road moves: the loaner is re-armed by
 * `startStage` from this key on every attempt at the stage, so a reload
 * between the tap and the first frame must not lose it. Announced on the
 * banner as the unlock it is.
 */
const onWeaponPicked = (id: WeaponId): void => {
  setState(WEAPON_PICK_KEY, id)
  void flushSaveNow()
  showWeaponPick.value = false
  completeHandover({ icon: id, label: t(`weapons.${id}`) })
  // The picture `flowToNextStage` owed: the card is gone, the road is back, and
  // the crowd the coins came from is on screen again. See `showCrowdCash`.
  showDeferredCash()
}

/**
 * ─── The first boss pays out on the spot ────────────────────────────────────
 *
 * A quarter of the playtesters who killed the stage-1 boss left right there —
 * even with the road already moving on under them. The kill reads as the end
 * of the session unless something is handed over in the same breath, so this
 * clear skips the handover banner, the chest and every other screen, and goes
 * straight to a one-card reveal of the launcher the stage-1 boss drops
 * (`BOSS_REWARD_STAGE`). It closes itself on the three-second mark, and the
 * crowd walks on from the ground the boss fell on.
 *
 * Everything `flowToNextStage` banks is banked here too, and — like it — no
 * interstitial: an ad on the first win would be the worst-placed ad in the game.
 */
const presentBossReward = (): void => {
  summary.value = runSummary()
  triggerHappytime()
  // Paid now, SHOWN when the card closes: the gift is about to cover the road.
  // See `showCrowdCash`.
  void bankCoins('deferred')
  void reportRun(bestStage.value, summary.value.peakSquad)
  if (!onboarded.value) {
    onboarded.value = true
    setState(ONBOARDED_KEY, true)
  }
  // The gift is the player's the moment the card goes up, tapped or not, and it
  // is flushed before anything moves: `startStage` re-arms the launcher from
  // this key, so a tab closed on the reveal still opens stage 2 holding it.
  setState(BOSS_REWARD_KEY, true)
  void flushSaveNow()
  showBossReward.value = true
}

/** The reveal closed — tapped, or on its own at three seconds. */
const onBossRewardDone = (): void => {
  showBossReward.value = false
  completeHandover({ icon: BOSS_REWARD_WEAPON, label: t(`weapons.${BOSS_REWARD_WEAPON}`) })
  // The picture `presentBossReward` owed — see `onWeaponPicked` for the same
  // two lines and the same reason.
  showDeferredCash()
}

// ─── The rally ──────────────────────────────────────────────────────────────
//
// The sim asks (`setRallyPolicy`); this is the answer. A second wind, once per
// stage, on stages 2 and 3 only, past three quarters of the road, and only
// while the player has never cleared stage 3 — i.e. their first session with
// the game, for any practical purpose. Stage 4 keeps the real floor.
//
// It exists because the earliest exit in the funnel was measured: a run that
// never steers clears stage 1 and wipes at 64 % of stage 2, a "Squad Wiped
// Out" screen forty-five seconds into a stranger's first look. The retry
// relief was already there; what was missing was the retry.

const RALLY_STAGES: readonly number[] = [2, 3]
const RALLY_FROM_PROGRESS = 0.75
/**
 * Share of the run's biggest squad handed back.
 *
 * 0.7, not the 0.4 it shipped as. Two fifths of a peak is arithmetically a
 * rescue and experientially a stay of execution: the crowd that just died to
 * this stretch of road comes back too thin to survive it, dies again inside a
 * few seconds, and the player's takeaway is that the game teased them. Seven
 * tenths hands back a squad that can actually finish the stage — which is the
 * only version of this that pays for itself, because the whole point is a
 * FIRST stage-2 clear rather than a longer stage-2 death.
 */
const RALLY_SHARE = 0.7
const RALLY_MIN_SQUAD = 3
/** No rallies once the player has cleared this stage or any beyond it. */
const RALLY_UNTIL_BEST = 3

const ralliedStages = new Set<number>()
/** What the last rally handed back — the number the announcement reads out. */
const rallyCount = ref(0)

const rallyPolicy = (ask: { stage: number; progress01: number; peakSquad: number }): number => {
  if (bestStage.value > RALLY_UNTIL_BEST) return 0
  if (!RALLY_STAGES.includes(ask.stage)) return 0
  if (ask.progress01 < RALLY_FROM_PROGRESS) return 0
  if (ralliedStages.has(ask.stage)) return 0
  ralliedStages.add(ask.stage)
  const back = Math.max(RALLY_MIN_SQUAD, Math.ceil(ask.peakSquad * RALLY_SHARE))
  rallyCount.value = back
  return back
}

// ─── Announcing it ──────────────────────────────────────────────────────────
//
// The rally used to be one word on the mid-screen banner, and one word is not
// an explanation: survivors reappeared a frame after the last one died, and
// what a stranger took from that was that the game had glitched in their
// favour. A gift nobody can account for is worth less than nothing — it makes
// the rules look soft.
//
// So it is named, under the boss rail, for three seconds: WHO saved them, and
// how many came back. The in-world half (`drawRallyHalo` and the `rally` VFX
// case, both fired by the sim) carries the sound and the light on the road.
//
// Only on the way UP — `startStage` resets the counter, and a reset is not a
// rally.
const GUARDIAN_MS = 3000
const guardianShown = ref(false)
let guardianTimer: number | null = null

watch(rallies, (now, before) => {
  if (now <= (before ?? 0)) return
  guardianShown.value = true
  if (guardianTimer !== null) clearTimeout(guardianTimer)
  guardianTimer = window.setTimeout(() => { guardianShown.value = false }, GUARDIAN_MS)
})

/** Stage cleared or squad wiped — the end of a run, either way. */
const presentResult = async (): Promise<void> => {
  summary.value = runSummary()
  stopBattleMusic()
  if (summary.value.cleared) triggerHappytime()

  // Ad FIRST, overlay second. See the header note — and note the argument: a
  // wipe never buys one.
  await maybeShowInterstitial(summary.value.cleared)

  rewardClaimed.value = false
  // `rewardOfferLive`, not `canOfferReward`: on a build where the perk is not
  // ad-gated there is no button, so there is nothing for the player to decline.
  // See `rewardOfferLive`.
  rewardWasOffered.value = rewardOfferLive.value
  // Counted BEFORE the screen goes up, so the hint below reads the number that
  // includes this screen: it shows on the 1st, 2nd and 3rd, then stops.
  resultsSeen.value += 1
  setState(RESULTS_SEEN_KEY, resultsSeen.value)
  showResult.value = true
  void bankCoins('card')

  // Fire-and-forget, and it MUST stay that way. The board is a decoration on a
  // game that works without it, so the result screen is already up before the
  // request leaves — awaiting it would put a captive-portal wifi login page
  // between the player and their coins for the full 6 s timeout. `reportRun`
  // swallows every failure and only writes when the player beat their own
  // posted best, so the usual cost of this line is nothing at all.
  //
  // `force` because the run is OVER. Mid-run clears are throttled — a climb
  // used to post once per stage — but the score a player finished on is the one
  // the board must end up with, so this call skips the gap.
  //
  // Never after an expedition. `bestStage` cannot have moved (see `finishRun`),
  // so the score is unchanged either way — but the SQUAD travels with the post,
  // and a squad assembled on a stage-16 road by a player halfway up the campaign
  // would relabel their board row with a number their career never produced.
  // The side door does not write to the career board at all.
  if (!summary.value.expedition) {
    void reportRun(bestStage.value, summary.value.peakSquad, { force: true })
  }

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

/**
 * ─── Is there an offer to make at all? ──────────────────────────────────────
 *
 * `canOfferReward` answers "would this build let the player take the perk right
 * now", which is not the same question. On a build with no ad provider — plain
 * web, itch, local dev — `isRewardGated` is false, so `claimReward` grants the
 * ×3 for FREE, and `canOfferReward` is therefore permanently true. The playtest
 * caught what that looks like: a tester on the plain web build tapped a button
 * wearing a film-frame glyph, got triple coins instantly, and no video ever
 * played. His words were "misleading either way" — and he is right in both
 * directions. Marked as an ad it lies about what just happened; unmarked it
 * becomes a free ×3 button, which is not a rewarded placement, it is a
 * difficulty setting labelled as one.
 *
 * So the offer is only made where there is genuinely something to trade: a real
 * provider, gating the perk behind a real video. Everything else — no provider,
 * the CrazyGames pre-release build, Wavedash — makes no offer, and the button is
 * ABSENT rather than free.
 *
 * ─── What a non-gated build now pays ────────────────────────────────────────
 *
 * Exactly the run's own payout, and nothing else: `bankCoins` adds
 * `summary.coins + summary.milestone` the moment the screen goes up, on every
 * build, and that is the whole transaction. `rewardBonus` is never added because
 * `onClaimReward` is unreachable, and no flag is left dangling either —
 * `rewardClaimed` stays false (so the "claimed" line never shows in place of a
 * button that never existed) and `rewardWasOffered` stays false, which is the
 * load-bearing half: `recordDecline` reads it, so walking off an ad-free result
 * screen is NOT a decline and does not lean the difficulty curve. Before this,
 * an ad-free build recorded a decline on every result screen the player left
 * without pressing a button they had no reason to press, and quietly made the
 * road heavier for it.
 *
 * Deliberately NOT pushed down into `useAdGate.canOfferReward`: the two
 * suppressed-build cases already live there as build-time constants, and the
 * difference between them and this one is real. Those builds HAVE ad machinery
 * and no inventory; this is a build with no ad machinery at all, where the perk
 * is not "unavailable" but meaningless. `isRewardGated` is the honest name for
 * that distinction and it is already exported.
 */
const rewardOfferLive = computed(() => isRewardGated && canOfferReward.value)

/** Already claimed on THIS result screen — the button is one-shot per run. */
const rewardClaimed = ref(false)
/** Was the offer genuinely available while this screen was up? Only then does
 *  walking away count as a decline. */
const rewardWasOffered = ref(false)

/**
 * Extra coins the ×3 would pay on top of what was already banked.
 *
 * Off `baseCoins`, which is the run's CAMPAIGN payout — identical to `coins` on
 * every ordinary run, and a third of it on the daily expedition. The expedition
 * already pays triple; compounding the two would make one screen a day worth
 * nine times a normal run, and the upgrade curve is priced against this button
 * being the ×3 it says it is. See `RunSummary.baseCoins`.
 */
const rewardBonus = computed(() => summary.value.baseCoins * (REWARD_MULTIPLIER - 1))

const showRewardButton = computed(() =>
  showResult.value && !rewardClaimed.value && summary.value.coins > 0 && rewardOfferLive.value
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
  // And never while the game is still teaching — see the constant.
  if (summary.value.stage <= DECLINE_FREE_THROUGH_STAGE) return
  // Nor out of an expedition. The lean is the CAMPAIGN's difficulty knob, and
  // the expedition deliberately ignores it on the way in (`startStage` pins
  // `hpRelief` at 1) — so writing to it on the way out would be a side door
  // paying a cost it never charged.
  if (summary.value.expedition) return
  const next = Math.min(DECLINE_MAX, declines.value + 1)
  declines.value = next
  setState(REWARD_DECLINE_KEY, next)
}

const onClaimReward = async (): Promise<void> => {
  if (rewardClaimed.value || adInFlight.value) return
  // Belt and braces, on the same footing as `claimReward`'s own refusal for the
  // suppressed builds: the button is not rendered when the perk is not gated, so
  // a free ×3 must not be reachable by any other route into this handler either
  // — a stale template, a keyboard activation on a button mid-teardown, the
  // preview seam. `claimReward` would otherwise grant it outright.
  if (!rewardOfferLive.value) return
  const granted = await claimReward(() => {
    rewardClaimed.value = true
    addCoins(rewardBonus.value)
    // One claim buys back the whole lean.
    declines.value = 0
    setState(REWARD_DECLINE_KEY, 0)
    void flushSaveNow()
  })
  if (!granted) return
  // The run's own coins were banked when the screen opened and their burst was
  // held for this moment (see `bankCoins`). One throw, for the full ×3.
  const owed = cardBurstOwed
  cardBurstOwed = 0
  await burstFromCard(owed + rewardBonus.value)
  playFx('countUp', 0.85)
}

// Inventory can land a beat after the screen does — a player who saw the button
// at any point during the screen was genuinely offered the reward. Watched
// through `rewardOfferLive` so an ad-free build, where the underlying
// `canOfferReward` is permanently true, never records an offer it did not make.
watch(rewardOfferLive, (live) => {
  if (live && showResult.value) rewardWasOffered.value = true
})

/**
 * ─── The crowd is cashed in, visibly ────────────────────────────────────────
 *
 * The handover's worst reading, and the one the playtest rated Major with all
 * five testers seeing it: "Squad 101 → 3" at every stage start. One tester asked
 * whether she had lost her progress. From where the player sits, a hundred people
 * they spent forty seconds collecting are simply gone, and the three that open
 * the next road are what is left of them — which is not what happened. Those
 * hundred survivors were PAID FOR: `stageReward(stage, peakSquad)` prices the
 * clear off the biggest crowd the run ever held, so the coins already in the
 * wallet ARE the squad. Nothing about the transaction was wrong; it was invisible.
 *
 * So the payment is made where the player is looking. The coins burst FROM THE
 * CROWD'S OWN POSITION ON THE ROAD and fly to the wallet badge, which is the
 * whole sentence in one gesture: the squad became this number. The alternative —
 * bursting from the result card, as a presented result screen does — cannot say
 * it, because at a handover there is no card on screen: `bankCoins` read
 * `rewardCoinRef`, which only exists inside the result overlay, so the
 * continuous stages banked their coins with NO burst at all. The most important
 * payment in the opening ninety seconds was the one nobody ever saw.
 *
 * The anchor is the honest source rather than a convenient one. `anchor()` is the
 * crowd's world position and the renderer's own projection turns it into pixels,
 * so the burst starts on the survivors wherever the camera has them — it is
 * correct on every aspect ratio, and it stays correct across `advanceStage`,
 * which re-bases the world under a crowd that never moves on screen.
 *
 * NOTHING IS PAID TWICE. This function's arithmetic is untouched: one `addCoins`
 * of `summary.coins + summary.milestone`, exactly as before. The change is where
 * the picture starts.
 */
const crowdCashRef = ref<HTMLElement | null>(null)
const crowdCashStyle = ref<Record<string, string>>({ left: '50%', top: '50%' })

/** Park the burst's origin on the crowd, in CSS px, as of right now. */
const aimCrowdCash = (): void => {
  const a = anchor()
  crowdCashStyle.value = {
    left: `${Math.round(worldToScreenX(a.x))}px`,
    top: `${Math.round(worldToScreenY(a.y))}px`
  }
}

/** How long the "N survivors cashed in" line rides over the crowd. Shorter than
 *  the handover banner on purpose — it belongs to the stage that just ended, and
 *  it must be gone before the banner names the one that is starting. */
const CROWD_CASH_MS = 1400
const crowdCashShown = ref(false)
const crowdCashCount = ref(0)
let crowdCashTimer: number | null = null

/**
 * The PICTURE of the payment: coins leaving the crowd for the wallet, and the
 * line that names what they were. Pays nothing — `bankCoins` has already done
 * that — so it is safe to call at whatever moment the road is actually visible.
 *
 * That separation is the whole reason this is its own function. Two handovers
 * put a full-screen card up in the same breath as the clear: the first boss's
 * launcher reveal, and the weapon choice on the way into `WEAPON_PICK_STAGE`.
 * The coin VFX appends to `#app` at `z-index: 100` and `FReward` sits at
 * `z-[100]` too, so a burst fired under one of those loses the tie on DOM order
 * and rains OVER the card — coins materialising out of the middle of a gift,
 * having started from a crowd nobody can see. Measured, in a browser, before
 * this was split out. So those two pay on time and show it afterwards, when
 * their card closes and the road is back.
 *
 * @param total     coins to throw — sizes the burst, nothing else.
 * @param survivors the crowd being named, or 0 to throw the coins without a
 *   caption. A wipe passes 0: the crowd really did die, and the consolation
 *   coins are not a sale of anybody.
 */
const showCrowdCash = async (total: number, survivors: number): Promise<void> => {
  // Aimed BEFORE the tick, so the anchor is the crowd's position now rather than
  // one frame of drift later.
  aimCrowdCash()
  // "101 survivors" is the number the player watched all stage and the one the
  // payout was priced against — the misreading being corrected is specifically
  // that they were LOST, so the line says where they went.
  if (survivors > 0) {
    crowdCashCount.value = survivors
    crowdCashShown.value = true
    if (crowdCashTimer !== null) clearTimeout(crowdCashTimer)
    crowdCashTimer = window.setTimeout(() => { crowdCashShown.value = false }, CROWD_CASH_MS)
  }
  await nextTick()
  const el = crowdCashRef.value
  if (!el || !coinBadgeEl.value) return
  // The crowd has already BEEN the coins, a body at a time, two seconds ago —
  // see `convertSquadToCoins`. The line above still runs (it names what left),
  // but a second burst out of the same crowd for the same payout reads as being
  // paid twice for one stage.
  if (squadCashed) return
  spawnCoinExplosion({
    sourceEl: el,
    targetEl: coinBadgeEl.value,
    count: Math.min(40, 12 + Math.round(total / 6)),
    // A wider throw from the crowd than from the result card: the burst has the
    // whole road to open out into, and the point of it is that a CROWD turned
    // into coins — a tight puff off a single point reads as one dropped purse.
    burstRadius: 170
  })
}

/**
 * ─── The squad turns into the money, one body at a time ─────────────────────
 *
 * Playtest 01 rated the handover's reading Major with all five testers seeing
 * it, and Playtest 02 — after the first fix — filed it again: "the handover
 * still reads as losing the squad". The first fix paid the coins where the
 * player was looking, which was right, but it paid them as ONE burst out of the
 * formation's centre. A hundred people becoming one puff of gold is a dropped
 * purse; it does not say who the gold was.
 *
 * So every survivor becomes a coin on the tile they are standing on, and the
 * crowd empties from the back of the formation forward as the coins leave for
 * the wallet. `cashOutSquad` takes them off the road at the same moment, so
 * what the player watches is literally a squad turning into money — which is
 * the sentence the handover has never managed to say.
 *
 * It runs on the BOSS KILL rather than at the stage change: "as soon as the
 * boss is felled, before the result screen appears". The two-second celebration
 * (`BOSS_FELLED_MS`) is dead air the payout can be spent in, and the whole
 * sequence — label, cash-out, coins landing — fits inside it with room over.
 */

/** How long after the kill the crowd starts cashing out, ms. Long enough that
 *  "BOSS FELLED!" has popped and been read first: two things arriving together
 *  is two things nobody looks at. */
const SQUAD_CASH_DELAY_MS = 520

/** Most coins the conversion will draw. Past this the sample strides through
 *  the crowd instead — 700 survivors is 700 DOM nodes and a dropped frame on a
 *  phone, and at that size the picture is already "all of them". */
const SQUAD_CASH_MAX = 70

/**
 * Has this stage's crowd already been converted into coins?
 *
 * Read by `bankCoins`, which owns the OTHER picture of the same transaction.
 * One payout gets one picture: if the crowd has already flown to the wallet,
 * neither the handover's burst nor the result card's may throw a second.
 */
let squadCashed = false
let squadCashTimer: number | null = null

const endSquadCash = (): void => {
  if (squadCashTimer !== null) { clearTimeout(squadCashTimer); squadCashTimer = null }
  squadCashed = false
}

const convertSquadToCoins = (): void => {
  if (squadCashTimer !== null) clearTimeout(squadCashTimer)
  squadCashTimer = window.setTimeout(() => {
    squadCashTimer = null
    const badge = coinBadgeEl.value
    if (!badge) return
    const bodies = cashOutSquad()
    if (bodies.length === 0) return
    squadCashed = true
    const stride = Math.max(1, Math.ceil(bodies.length / SQUAD_CASH_MAX))
    const origins: { x: number; y: number }[] = []
    // Projected HERE and not in the simulation: the world is frozen for the
    // whole celebration (`step` returns on 'clear'), so one read of the camera
    // is as good as sixty, and the renderer's own projection is the only thing
    // that agrees with where the bodies were actually painted.
    for (let i = 0; i < bodies.length; i += stride) {
      const b = bodies[i]!
      origins.push({ x: worldToScreenX(b.x), y: worldToScreenY(b.y) })
    }
    spawnCoinTrail({ origins, targetEl: badge })
    playFx('countUp', 0.45)
  }, SQUAD_CASH_DELAY_MS)
}

/** What the payment is SEEN as, decided by the call site. */
type CoinSource =
  /** The result screen's own coin line — the number the player is reading.
   *  Coins leaving it for the wallet is `'crowd'` told with another subject. */
  | 'card'
  /** The survivors on the road, right now. The handover's whole point. */
  | 'crowd'
  /** Paid now, shown later by the caller — a full-screen card is about to own
   *  the screen. See `showCrowdCash`. */
  | 'deferred'

const bankCoins = async (from: CoinSource): Promise<void> => {
  // The milestone is banked in the same breath as the road's own payout — it is
  // a second number on the screen, not a second transaction — but it is counted
  // into the burst, so the chest landing is visibly bigger than an ordinary
  // clear. `summary.milestone` is already guarded against paying twice.
  const total = summary.value.coins + summary.value.milestone
  if (total <= 0) return
  addCoins(total)
  // The sound is the receipt, and it plays on the PAYMENT even where the picture
  // is deferred — a payment with no acknowledgement at all is the bug being
  // fixed here, and a coin chime under a gift card is exactly right.
  playFx('countUp', 0.5)

  const survivors = summary.value.cleared ? summary.value.peakSquad : 0
  if (from === 'crowd') {
    void showCrowdCash(total, survivors)
    return
  }
  if (from === 'deferred') {
    // Held until the caller's card closes — and held as NUMBERS, because by then
    // the summary they came from has been reset. See `owedCash`.
    owedCash = { total, survivors }
    return
  }

  // ─── The card's burst waits for the button ────────────────────────────────
  //
  // The coins are PAID above on every build — the wallet moves the instant the
  // screen goes up, and that must not change: a payment that waits on an ad is a
  // payment held hostage. What is decided here is only the PICTURE, and the rule
  // is `cardPayout`, which is pure and is pinned in `tests/game/resultFlow`.
  //
  // A player who walks past a held offer is not cheated of it: `beginStage`
  // flushes whatever is owed on the way out, while the card is still on screen.
  const view = cardPayout(total, {
    rewardOfferLive: rewardOfferLive.value,
    squadCashed
  })
  cardBurstOwed = view.owed
  if (view.now > 0) await burstFromCard(view.now)
}

/** Coins already paid onto the result card whose burst is waiting on the ×3. */
let cardBurstOwed = 0

/** The result card's own burst: from the coin line it prints to the wallet. */
const burstFromCard = async (total: number): Promise<void> => {
  if (total <= 0) return
  await nextTick()
  const el = rewardCoinRef.value
  if (!el || !coinBadgeEl.value) return
  spawnCoinExplosion({
    sourceEl: el,
    targetEl: coinBadgeEl.value,
    count: Math.min(60, 12 + Math.round(total / 5))
  })
}

/** Throw a held burst that is never going to be claimed. Called as the player
 *  leaves the screen, one frame before the card it bursts from unmounts —
 *  `spawnCoinExplosion` measures the source rect synchronously, so the coins
 *  leave the right place even though that place is about to be gone. */
const flushCardBurst = (): void => {
  const owed = cardBurstOwed
  cardBurstOwed = 0
  void burstFromCard(owed)
}

/**
 * What a deferred payment owes, captured AT THE MOMENT IT WAS PAID.
 *
 * Not re-read from `summary` when the card closes, and that is load-bearing:
 * `runSummary()` hands back the simulation's own summary OBJECT rather than a
 * copy, so `summary.value` is a live view of it — and `completeHandover` calls
 * `advanceStage`, which opens the next stage and resets those very fields. Read
 * afterwards, the numbers are the new stage's zeros and the picture is simply
 * never drawn. Measured in a browser: the card closed, the road came back, and
 * nothing flew.
 */
let owedCash: { total: number; survivors: number } | null = null

/** The picture the two card handovers owe, once their card has closed. */
const showDeferredCash = (): void => {
  const owed = owedCash
  owedCash = null
  if (!owed || owed.total <= 0) return
  void showCrowdCash(owed.total, owed.survivors)
}

/**
 * ─── The boss's death is a moment, not a transition ─────────────────────────
 *
 * A boss is the thing an entire stage was built to reach, and until now it was
 * over in a single frame: the last hit landed and a screen slid over the top of
 * the body. The player never saw the thing they earned. So a clear that came from
 * a boss kill holds EVERYTHING back by `BOSS_FELLED_MS` — the result screen, the
 * ad in front of it, the handover to the next road, the first boss's launcher
 * reveal — and spends those two seconds on the kill instead: the body goes down
 * on the canvas (the renderer animates the fall off its own clock, so a frozen
 * simulation does not freeze it) with "Boss felled!" over it.
 *
 * ─── What the hold is careful about ─────────────────────────────────────────
 *
 * • THE PORTAL BRACKET closes at the kill, not at the end of the hold, and that
 *   is correct rather than incidental: `phase` is already 'clear' for the whole
 *   two seconds, so `isGameplayLive` reads false and `syncGameplayLifecycle`
 *   sends its stop the moment the boss dies. A celebration is not gameplay, and
 *   Poki grades that bracket. It also removes a hazard rather than adding one —
 *   the handover's hand-made stop/start pair (`restartGameplayBracket`) exists
 *   because a no-screen handover used to pass 'boss' → 'clear' → 'run' inside a
 *   single tick, too fast for any watcher to see; two seconds is not that, so the
 *   real stop and the real start are two ordinary edges two seconds apart, and
 *   `restartGameplayBracket` correctly finds the bracket already closed and does
 *   nothing.
 * • AD ORDERING is untouched. The hold sits in front of `presentResult`, which
 *   still requests and AWAITS the interstitial before the overlay is revealed —
 *   so the order is kill → celebration → ad → result, and the celebration can no
 *   more be guillotined by an ad than the result screen can.
 * • THE CONTINUOUS STAGES keep their handover exactly as it was, two seconds
 *   later. The whole argument for `CONTINUOUS_THROUGH_STAGE` is that clearing a
 *   stage must not feel like an ENDING, and a beat spent watching the boss fall
 *   is the opposite of an ending — it is the reward for the fight, with the road
 *   still open underneath it.
 * • THE FIRST BOSS'S REVEAL is held too. It was tempting to exempt it: stage 1 is
 *   where a quarter of testers left, and the launcher card is the thing that
 *   keeps them. But the card is the *answer* to the kill, and answering before
 *   the player has seen what they did is the exact mistake this whole change is
 *   about. Two seconds of "Boss felled!" and then a gift reads as a sequence; the
 *   gift alone reads as a screen.
 * • A WIPE NEVER HOLDS. There is no body to celebrate and the player has a
 *   decision waiting, so a loss presents immediately, as before.
 *
 * The gate is `prev === 'boss'` rather than "the summary says cleared", because
 * the question is what the player just watched, not how the stage was scored. A
 * clear can only be reached out of the arena today, so the two agree — and if a
 * clear ever arrives from somewhere else, it correctly gets no celebration
 * instead of a label pointing at a body that is not there.
 */

/** Gap between the label's baseline box and the top of the body, CSS px. The
 *  brief is "above the body and NOT overlapping it", so this is a hard floor
 *  rather than a nudge. */
const BOSS_FELLED_GAP_PX = 20

/**
 * The felled boss's box on screen, as the renderer sees it.
 *
 * ⚠️ CROSS-AGENT SEAM. `useSurvivalArt` owns the projection and owns which death
 * frame is being drawn, so it is the only thing that can answer this; the
 * accessor is being added there by the agent who owns that file. This scene must
 * compile and run on both sides of that landing, so the export is PROBED rather
 * than imported by name — a named import of an export that does not exist yet is
 * a build failure, not a fallback.
 *
 * The contract asked for: `felledBossBox(): { x, y, w, h } | null`, in CSS
 * pixels, `x`/`y` the TOP-LEFT of the drawn body's bounds, and `null` whenever no
 * felled boss is on screen. Absent or null, the label falls back to the upper
 * third of the canvas, which is where a boss arena puts the body on most aspect
 * ratios anyway — so the failure mode is "slightly less precise", never "no
 * celebration" and never "a label on top of the corpse".
 */
interface FelledBossBox { x: number; y: number; w: number; h: number }

const felledBossBoxNow = (): FelledBossBox | null => {
  const read = (survivalArt as { felledBossBox?: () => FelledBossBox | null }).felledBossBox
  if (typeof read !== 'function') return null
  try {
    const box = read()
    // A renderer that reports nonsense must not throw a label off the screen.
    if (!box || !Number.isFinite(box.x) || !Number.isFinite(box.y)) return null
    return box
  } catch { return null }
}

const bossFelledShown = ref(false)
/**
 * Where the label sits: `y` is its BOTTOM edge and `x` the body's horizontal
 * centre, both in CSS px from the top-left of the viewport. `null` is the
 * fallback position.
 *
 * The `y` is monotone — only ever raised (numerically lowered), never pushed
 * down. A boss COLLAPSES as it dies, so the body's top edge descends through the
 * fall: the highest edge is the first sample, and keeping it means the label is
 * placed once and stays there while the body crumples beneath it. Following the
 * body down would be a title card that slides during the two seconds it exists
 * to be read, and it would end the fall sitting on the corpse.
 *
 * The `x` travels with that same sample rather than being tracked separately, so
 * the label can never be reading one frame horizontally and another vertically.
 */
const bossFelledAnchor = ref<{ x: number; y: number } | null>(null)
let bossFelledTimer: number | null = null
let bossFelledPoll: number | null = null

const placeBossFelled = (): void => {
  const box = felledBossBoxNow()
  if (!box) return
  const y = box.y - BOSS_FELLED_GAP_PX
  const held = bossFelledAnchor.value
  if (held !== null && y >= held.y) return
  bossFelledAnchor.value = { x: box.x + box.w / 2, y }
}

const bossFelledStyle = computed<Record<string, string>>(() => {
  const at = bossFelledAnchor.value
  // No box to sit above — park it in the upper third, centred, which is roughly
  // where the arena frames a boss on every ratio the game ships on.
  if (at === null) return { left: '50%', bottom: '66%' }
  return {
    // Centred on the BODY, not on the screen. The arena is centred on the lane
    // so the two are usually within a few pixels, but a boss that died at a rail
    // is exactly the case a label pinned to 50 % gets wrong — and it is the case
    // the player remembers, because they drove it there.
    //
    // Clamped to the middle three fifths of the viewport all the same: the label
    // is centre-anchored (`translateX(-50%)`), so an anchor near an edge would
    // hang half a word off the screen. Nothing the renderer can report about a
    // boss's position justifies that, so the clamp costs nothing real.
    left: `clamp(20vw, ${Math.round(at.x)}px, 80vw)`,
    // `bottom` rather than `top`, because the requirement is about the label's
    // BOTTOM edge: anchored this way the type can grow (a long translation, a
    // bigger viewport) without ever growing down into the body.
    //
    // The `max()` is the other end of it, and it is the MEASURED HUD rather
    // than a constant. A boss is framed near the top of the arena, so "above
    // the body" is frequently above the stage label as well: at a fixed
    // 4.75rem the words landed straight across the ladder chip and the squad
    // readout — the label was clear of the corpse, which was the stated
    // requirement, and illegible anyway, which was the point of it. `hudTopPx`
    // is the same measurement the camera is framed with, so the two can never
    // disagree about where the strip ends.
    bottom: `calc(100% - max(${Math.round(at.y)}px, ${Math.round(hudTopPx.value)}px + 0.5rem))`
  }
})

const endBossFelled = (): void => {
  if (bossFelledTimer !== null) { clearTimeout(bossFelledTimer); bossFelledTimer = null }
  if (bossFelledPoll !== null) { clearInterval(bossFelledPoll); bossFelledPoll = null }
  bossFelledShown.value = false
  bossFelledAnchor.value = null
}

/** The stage is over — the dispatch that used to sit inline in the watcher. */
const presentClear = (s: ReturnType<typeof runSummary>): void => {
  // The first boss hands over its launcher instead of a banner — see
  // `presentBossReward`.
  if (s.stage === BOSS_REWARD_STAGE && !s.expedition) {
    presentBossReward()
    return
  }
  // A wipe always presents: the player has a decision to make there (retry,
  // and the x3 on the coins they just lost). A clear this early has none.
  void (s.stage <= CONTINUOUS_THROUGH_STAGE ? flowToNextStage() : presentResult())
}

/**
 * ─── Wasted ─────────────────────────────────────────────────────────────────
 *
 * The other half of the boss hold, and the more important half. Both playtests
 * filed the same finding — "still nothing says what killed you" — and the
 * reason the result screen's answer never landed is that it was not an answer
 * to anything the player had watched: the last survivor fell and a card was on
 * screen before the body was. Four of five testers could not name what had
 * ended a run they had just finished.
 *
 * So the road keeps the screen for three seconds. Nothing has to be paused to
 * do it — `step` already returns on `'wipe'`, so the world is stopped at the
 * frame the squad died on, with the bodies exactly where they fell (and every
 * faller put on the ground first; see `finishRun`). Over those three seconds:
 *
 *   • the camera leans in on the bodies — `WASTED_ZOOM`, a CSS transform on the
 *     canvas rather than a change to the renderer's own scale, because the
 *     projection is shared with the coin VFX, the crowd-cash anchor and the
 *     boss-felled label, and moving it under them mid-hold would put all four
 *     in different places;
 *   • the light goes out of the frame, from the edges in;
 *   • the word lands.
 *
 * Then the result screen arrives, and the cause it names (`result__cause`) is a
 * caption for something the player has just spent three seconds looking at.
 */

const wastedShown = ref(false)
/** Flipped a frame after the hold opens, so the CSS transition has a resting
 *  state to run FROM. Set in the same frame and the zoom simply snaps. */
const wastedZoomed = ref(false)
/** Where the camera leans in, CSS px — the crowd's own last position, which on
 *  a wipe is the pile of bodies. */
const wastedOrigin = ref<{ x: number; y: number } | null>(null)
let wastedTimer: number | null = null
let wastedRaf = 0

/**
 * The canvas's transform: the shake, except while the death hold owns it.
 *
 * The two cannot be composed — `useScreenshake` writes a whole style object
 * every frame, transition and all, and a shake's `transition: none` would
 * flatten the three-second zoom into a snap. The hold wins for its three
 * seconds, which costs nothing real: the only shake that could overlap is the
 * wipe's own, and a screen that is already leaning in does not need one.
 */
const canvasStyle = computed<Record<string, unknown>>(() => {
  if (!wastedShown.value) return shakeStyle.value as Record<string, unknown>
  const at = wastedOrigin.value
  return {
    transformOrigin: at ? `${Math.round(at.x)}px ${Math.round(at.y)}px` : '50% 62%',
    transform: `scale(${wastedZoomed.value ? WASTED_ZOOM : 1})`,
    transition: `transform ${WASTED_HOLD_MS}ms cubic-bezier(0.22, 0.55, 0.25, 1)`
  }
})

const endWasted = (): void => {
  if (wastedTimer !== null) { clearTimeout(wastedTimer); wastedTimer = null }
  if (wastedRaf !== 0) { cancelAnimationFrame(wastedRaf); wastedRaf = 0 }
  wastedShown.value = false
  wastedZoomed.value = false
  wastedOrigin.value = null
}

const holdOnWipe = (): void => {
  endWasted()
  const a = anchor()
  wastedOrigin.value = { x: worldToScreenX(a.x), y: worldToScreenY(a.y) }
  wastedShown.value = true
  // Two frames, not one: the first paints the un-zoomed state with the new
  // origin, the second starts the transition. One frame and Vue's patch can
  // land both values in the same style flush, which the browser reads as "it
  // was always scaled" and animates nothing.
  wastedRaf = requestAnimationFrame(() => {
    wastedRaf = requestAnimationFrame(() => {
      wastedRaf = 0
      if (wastedShown.value) wastedZoomed.value = true
    })
  })
  wastedTimer = window.setTimeout(() => {
    wastedTimer = null
    // The player may have left the wipe while it was on screen — the expedition
    // chip is on the HUD and is not hidden during the hold. Presenting a result
    // for a run that is no longer in flight would strand them on a screen about
    // a road they have already left.
    const stillLost = phase.value === 'wipe'
    endWasted()
    if (stillLost) void presentResult()
  }, WASTED_HOLD_MS)
}

const holdOnFelledBoss = (s: ReturnType<typeof runSummary>): void => {
  endBossFelled()
  bossFelledShown.value = true
  // The crowd cashes out on the kill, not at the stage change — see
  // `convertSquadToCoins`. Started here so it rides the celebration the label
  // is already holding the screen for.
  convertSquadToCoins()
  // Once now, then on a short poll for the whole window. The first read can
  // legitimately come back null — the accessor may need a drawn death frame
  // before it has a box — and `placeBossFelled` only ever RAISES the label, so
  // polling cannot make it drift downward into the body.
  placeBossFelled()
  bossFelledPoll = window.setInterval(placeBossFelled, 100)
  bossFelledTimer = window.setTimeout(() => {
    endBossFelled()
    // The player may have left 'clear' while the body was falling — the
    // expedition chip is on the HUD and is not hidden during the celebration, so
    // two taps there can open a whole new road. Presenting a result for a stage
    // that is no longer in flight would strand them on a screen about the past.
    if (phase.value !== 'clear') return
    presentClear(s)
  }, BOSS_FELLED_MS)
}

watch(phase, (p, prev) => {
  // Anything that is not a live celebration takes the label down with it, and
  // takes the pending dispatch with it too: whoever moved the phase off 'clear'
  // now owns what happens next. The death hold is the same rule on the other
  // side — a retry out of a wipe must not carry the dim and the zoom into the
  // first frame of the new run.
  if (p !== 'clear') endBossFelled()
  if (p !== 'wipe') endWasted()

  if (p === 'clear' && prev !== p) {
    // A fresh clear is a fresh payout: whatever the last one converted is over.
    endSquadCash()
    const s = runSummary()
    if (prev === 'boss') holdOnFelledBoss(s)
    else presentClear(s)
    return
  }
  if (p === 'wipe' && prev !== p) {
    endSquadCash()
    holdOnWipe()
  }
})

// ─── The score follows the crowd ────────────────────────────────────────────
//
// Two rules, one property. The tempo tracks the squad (`squadMusicRate`), and a
// wipe overrides it downward for two seconds — the only time the track is ever
// slower than it started. See `useSound.ts` for why the curve is shallow and
// why it saturates at 600.
//
// Driven off the refs rather than the frame loop: `squadCount` settles once per
// tick whatever happened inside it, so a gate that spawns forty people costs one
// assignment rather than forty. Muted or music-off is not a special case —
// `setMusicRate` is a no-op with no element.

let musicWipeTimer: number | null = null

const followSquadTempo = (): void => {
  if (musicWipeTimer !== null) return
  setMusicRate(squadMusicRate(squadCount.value))
}

watch(squadCount, followSquadTempo)

watch(phase, (p, prev) => {
  if (p !== 'wipe' || prev === p) return
  setMusicRate(MUSIC_WIPE_RATE)
  if (musicWipeTimer !== null) clearTimeout(musicWipeTimer)
  musicWipeTimer = window.setTimeout(() => {
    musicWipeTimer = null
    followSquadTempo()
  }, MUSIC_WIPE_MS)
})

const beginStage = (next: boolean): void => {
  // Leaving the result screen IS the decline. Counted here rather than on a
  // dedicated "no thanks" button because there isn't one — the player declines
  // by pressing on, which is the only honest place to read the intent.
  recordDecline()
  // Declined, or never offered at all — either way the picture is owed and this
  // is the last frame the card exists to throw it from.
  flushCardBurst()
  showResult.value = false
  invalidateArt()
  // Forward, the road opens where the boss fell (`continueRoad`). A retry goes
  // back to the start of the stage it lost — which is that same ground, corpse
  // and all, but not where the crowd is standing, so its debris is swept.
  if (next) {
    continueRoad()
    // The late skills are handed over here, on the banner of the stage that
    // opens them — the shield's handover, for stages that come after a result
    // screen instead of flowing on.
    const gift = skillGiftFor(summary.value)
    if (gift) showBanner({ stage: stage.value, unlock: gift })
  } else {
    resetVfx()
    resetSkillFx()
    retryStage()
  }
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
 * ─── Out through the side door ──────────────────────────────────────────────
 *
 * The chip has already been armed and confirmed (see `DailyExpedition.vue`), so
 * this is the go. It abandons whatever stage was in flight, which is the honest
 * cost of the feature and is why the confirm exists: the campaign's resume
 * point is untouched by an expedition, so the run being thrown away is the only
 * thing lost, and `startStage()` will hand it straight back afterwards.
 *
 * NO interstitial in front of it. The player has just made a deliberate,
 * two-tap choice to start something, and an ad between the tap and the thing
 * they asked for is the placement portals reject builds over — the run's own
 * result screen is where this road's ad belongs, exactly as on every other run.
 *
 * The banner rides the expedition's empty opening the same way a stage handover
 * does, and it is the only announcement the feature makes: it is what tells the
 * player the road under them changed.
 */
const onStartExpedition = (): void => {
  if (adInFlight.value) return
  flushCardBurst()
  showResult.value = false
  resetVfx()
  resetSkillFx()
  invalidateArt()
  startExpedition()
  showBanner({ stage: EXPEDITION_STAGE, title: t('expedition.title') })
  startBattleMusic()
}

// ─── The forward button bounces; it does not press itself ───────────────────
//
// This screen used to count itself down. A thin gold ring traced the forward
// button's own rounded edge and, six seconds in, the button fired — `onNext` on a
// clear, `onRetry` on a wipe. The argument was retention arithmetic and it was a
// good one: a runner's whole model is that the next attempt starts before the
// decision to stop is made, and a full stop at twenty-five seconds is where
// strangers leave.
//
// The first-contact playtest measured what it actually cost:
//
//   • one tester watched the screen RETRY ITSELF while he was still reading it —
//     the game took an action he had not chosen and gave him no way to know why
//     the road was moving;
//   • two more tapped the ×3 after the screen had already advanced for them, and
//     reported "no ad played". The offer was gone; the tap landed on the next
//     stage. That is the game's primary income being spent to save six seconds;
//   • and a thumb that looks away for six seconds on a bus loses the offer in
//     exactly the same way, silently, every single time.
//
// A countdown cannot tell "this player has stalled" from "this player is
// reading", and it has to guess on every screen. So nothing presses a button for
// the player any more. What is left is the cheap half of the same idea: after
// five untouched seconds the forward button starts to BOUNCE. It answers the same
// question — where do I go from here — and when the guess is wrong it costs
// nothing at all, because the player was reading and a moving button is not a
// deadline.
//
// The rule itself (the delay, and the latch that keeps the bounce down once the
// player is driving) lives in `game/resultFlow.ts`, pure and specced, for the
// same reason the countdown's rule did.
//
// ─── Why it is the button's FACE that moves and not the button ──────────────
//
// The animation is on `.f-button__body` + `.f-button__shadow` — the painted face
// and its depth plate — and never on the `<button>` element. The brief is that
// the bounce may not move the row it sits in or change the tap target, and those
// are two different requirements with two different failure modes:
//
//   • THE ROW. Any `transform`/`translate` is out of flow, so nothing reflows
//     either way. That half is free.
//   • THE TAP TARGET. Hit testing follows boxes, and moving the `<button>` moves
//     its box: at the top of a bounce, a thumb aimed at where the button was a
//     moment ago lands on the overlay behind it. Moving only the face leaves the
//     button's own box exactly where it was, and because the face is a DESCENDANT
//     of the button, a tap on the risen face still resolves to the button. The
//     effective target is therefore the union of the two — never smaller than the
//     still button, which is the property that matters.
//
// FButton ships an `attention` prop that bounces the whole control, and it was
// the obvious thing to reach for. It is not used here for exactly the reason
// above, and because its 0.6 s alternate is a nag rather than a nudge on a screen
// the player may be reading for half a minute.

/** The bounce is running. */
const goBounce = ref(false)
/**
 * The player has touched something since this screen appeared.
 *
 * Latched, and only cleared when the screen goes away. A tap means they are
 * driving, and a prompt aimed at somebody who is already acting is the nagging
 * half of the feature this replaced.
 */
const resultSawInput = ref(false)
let goBounceTimer: number | null = null
let resultShownAt = 0

/** Any pointer or key while the result screen is up. Capture phase, so it is seen
 *  whatever the tap lands on — including the buttons that end the screen. */
const noteResultInput = (): void => {
  resultSawInput.value = true
  goBounce.value = false
  if (goBounceTimer !== null) { clearTimeout(goBounceTimer); goBounceTimer = null }
}

const stopGoBounce = (): void => {
  if (goBounceTimer !== null) { clearTimeout(goBounceTimer); goBounceTimer = null }
  goBounce.value = false
  resultSawInput.value = false
  window.removeEventListener('pointerdown', noteResultInput, true)
  window.removeEventListener('keydown', noteResultInput, true)
}

const armGoBounce = (): void => {
  stopGoBounce()
  resultShownAt = performance.now()
  window.addEventListener('pointerdown', noteResultInput, true)
  window.addEventListener('keydown', noteResultInput, true)
  // ONE timeout, not an interval. The old countdown needed a 50 ms tick because
  // it was drawing a ring and had to pause it while an ad or a modal owned the
  // screen; a bounce has nothing to draw before it starts and nothing to hold —
  // if the player spent those five seconds in the shop, they have touched the
  // screen, so the latch has already refused it.
  goBounceTimer = window.setTimeout(() => {
    goBounceTimer = null
    goBounce.value = shouldBounceGo({
      onScreenMs: performance.now() - resultShownAt,
      sawInput: resultSawInput.value
    })
  }, RESULT_BOUNCE_DELAY_MS)
}

watch(showResult, (up) => {
  if (up) armGoBounce()
  else stopGoBounce()
})

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
  // One event per opening, whichever door it came through — the HUD chip, the
  // result screen, the spotlight. What it is for is the question "did they ever
  // find the shop?", which the Poki fit test could only guess at.
  if (open && !wasOpen) {
    track('shop_open', {
      stage: stage.value, coins: coins.value,
      affordable: affordable.value, onResult: showResult.value
    })
  }
  if (!open && wasOpen && showResult.value) {
    // The result screen is still up behind the shop — leave it there so the
    // player chooses their own moment to run again.
    playSound('modal-open', 0.04)
  }
})

// ─── Shop spotlight (one-shot) ──────────────────────────────────────────────

/**
 * How many result screens this player has seen, ever — deaths and clears alike.
 *
 * The upgrade button is a glyph in a row of glyphs, and a player who does not
 * work out that it leads to a shop just replays the same run until they stop
 * playing. The Poki fit test read like that: 64 % of sessions ended inside two
 * minutes. So the first three result screens point at it explicitly, and then
 * never again — a permanent arrow is nagging, and it would sit on top of the
 * one control that ends the screen.
 */
const resultsSeen = ref(Number(getState(RESULTS_SEEN_KEY, 0)) || 0)
const showUpgradeHint = computed(() => showResult.value && resultsSeen.value <= 3)

const shopSpotlightSeen = ref(getState<boolean>(SHOP_SPOTLIGHT_KEY, false) === true)
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

// ─── Portal gameplay lifecycle ──────────────────────────────────────────────
//
// The scene only reports whether play is live; `useGameplayLifecycle` decides
// which events that becomes per platform, because WHICH events to send is a
// platform contract and not a view concern. CrazyGames gets gameplayStart/Stop;
// Poki gets the same pair through a guard that keeps consecutive events at
// least 120 ms apart (its SDK disables monetization after 10 pairs closer than
// 50 ms — see `pokiPlugin.ts`).
// The scene wires the reactive inputs; `isGameplayLive` holds the rule, next
// to the platform contracts it answers to — and where it can be asserted
// without mounting a canvas.
const isLiveGameplay = computed(() => isGameplayLive({
  phase: phase.value,
  showResult: overlayUp.value,
  anyModalOpen: isAnyModalOpen.value,
  adShowing: isAdShowing.value,
  visibilityHidden: isVisibilityHidden.value,
  platformPaused: isPlatformPaused.value,
  // The opening lightbox and the grenade lesson are the same kind of thing to a
  // portal: the world is held and the player is being asked for one specific
  // act, so nobody is playing. The bracket has to close, or a player who leaves
  // the lesson open on a bus counts as minutes of playtime that never happened.
  tutorialActive: tutorialActive.value || grenadeTeachHeld.value
}))
watch(isLiveGameplay, syncGameplayLifecycle, { immediate: true })


// The hint's clock starts when the road does — not at mount, which on a first
// run is behind the tutorial lightbox, and not at boot, which is behind the
// splash. Five seconds of gameplay is what was asked for, so it is five seconds
// of gameplay that it counts.
watch(isLiveGameplay, (live) => {
  if (!live || steerHintArmed.value || steerHintDone.value) return
  steerHintArmed.value = true
  steerHintTimer = window.setTimeout(retireSteerHint, STEER_HINT_MS)
})

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
    // No ad is awaited here. The moderation-mandated first ad on GamePix /
    // GameMonetize / GameDistribution is the POST-SPLASH placement
    // (`useFirstLoadInterstitial`), which watches SDK readiness instead of
    // sampling it once at boot — a check made here loses the race to the ad
    // SDK's own load and fires nothing. See that module's header.
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
      tutorialClock = newTutorialClock(anchor().x)
      tutorialProgress.value = 0
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

// `renderScaleTier` picks the DPR cap above, so committing it has to re-size the
// canvas — otherwise the cheaper setting only lands on the next orientation
// change, which on a phone mid-run is never.
//
// It fires AT MOST THREE TIMES a session by construction: `renderScaleTier` is
// a downgrade-only ratchet across four tiers, and each step past the first needs
// the live tier to have held for four seconds. An earlier version watched the
// live `quality` tier instead and cost 27 fps on a throttled phone — a resize
// re-bakes every cached piece of art, ~700 ms there, and the tier legitimately
// moves several times a session.
watch(renderScaleTier, () => resize())

const onOrientationChange = (): void => { setTimeout(resize, 250) }

let insetTimer = 0

onMounted(() => {
  setRallyPolicy(rallyPolicy)
  // There is a person at the controls, so the grenade lesson may stop the world
  // and wait for them. Nothing else that drives `step()` ever says this — see
  // `setGrenadeTutorialAllowed`.
  setGrenadeTutorialAllowed(true)
  // `window.__analytics()` on a device under test. The funnel is in memory and
  // dies with the tab; this is the only way to read it back on a phone.
  if (isDebug.value) exposeAnalytics()
  // DEV-only, and only under `?feed=` — the preview recorder's handle on the
  // run (`tools/preview-video`). Its two scene actions are the result screen's
  // own buttons, so a recorded clip ends on the road moving again rather than
  // on a frozen frame behind an overlay it has hidden.
  installPreviewSeam({ next: () => onNext(), retry: () => onRetry() })
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
    applyViewport()
  }, 1000)
})

onUnmounted(() => {
  setRallyPolicy(null)
  setGrenadeTutorialAllowed(false)
  // `stopGoBounce` also removes the two capture-phase window listeners, which is
  // the one piece of teardown here that leaks into the whole document rather than
  // merely into this component.
  stopGoBounce()
  endBossFelled()
  endWasted()
  endSquadCash()
  if (bannerTimer !== null) clearTimeout(bannerTimer)
  if (crowdCashTimer !== null) clearTimeout(crowdCashTimer)
  if (guardianTimer !== null) clearTimeout(guardianTimer)
  if (musicWipeTimer !== null) clearTimeout(musicWipeTimer)
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
      :style="canvasStyle"
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
          //- Readouts that would be FALSE on an expedition are suppressed here,
          //- all for the same reason: they are statements about the CAMPAIGN,
          //- and this road is not on it. `label` replaces "Stage 16" — a number
          //- that is a rung on the difficulty curve rather than a place the
          //- player has reached; the ladder chip would promise the unlock that
          //- comes after a stage this run is not on; and the milestone chip
          //- would count down to a payout this road cannot pay.
          //-
          //- `challenge` is now one of those bindings with nowhere to land: the
          //- streak chip was deleted with the rest of the stat row (the
          //- playtest found nobody could name any of them, and four of five read
          //- its flame as a droplet). The zero is kept rather than the binding
          //- dropped, so that putting a streak readout back anywhere in that
          //- component inherits the expedition rule instead of re-learning it.
          RunHud(
            :stage="stage"
            :label="isExpedition ? t('expedition.hud') : null"
            :best="bestStage"
            :progress="progress01"
            :squad="squadCount"
            :damage="damage"
            :fire-rate="runFireRate"
            :phase="phase"
            :boss-hp="bossHp01"
            :elite="eliteAlive"
            :elite-hp="eliteHp01"
            :challenge="isExpedition ? 0 : challenge"
            :next-unlock="isExpedition ? null : hudNext"
            :milestone-in="isExpedition ? null : milestoneIn"
            :beats="hudBeats"
          )
          //- Hung off the HUD's own box (`position: absolute; top: 100%`), so
          //- three seconds of "a guardian angel saved you" never move the rail
          //- above it or the hint below it. Hidden behind an overlay like every
          //- other run readout.
          GuardianBanner(v-if="!overlayUp" :show="guardianShown" :count="rallyCount")
        //- The wallet column: what the player has, and the one thing on the
        //- HUD that hands them more of it for free. The chest sits UNDER the
        //- badge because that is where its coins fly to — the payout is a
        //- three-inch journey the eye can follow, not a number that changes.
        //-
        //- Hidden with the result screen, like every other run readout: the
        //- overlay owns the screen, and a chest that becomes claimable behind
        //- a modal is a tap the player cannot make.
        div.scene__wallet
          CoinBadge(ref="coinBadgeRef")
          TreasureChest(v-if="!overlayUp" :target-el="coinBadgeEl")

      //- Control primer, centred under the top bar — except the guard primer,
      //- which drops to mid-screen so it doesn't sit on the boss's shield.
      //- `suppressed` rather than a narrower `activeHint`: the pill is TAKEN
      //- DOWN while an attack is inbound, not un-chosen. A hint the player never
      //- got to read is still owed to them once the road is safe — see
      //- `hintSuppressed` for why it is every warning and not only the one that
      //- literally contradicts.
      div.scene__hint(:class="{ 'scene__hint--low': activeHint === 'guard' }")
        ControlHint(:hint="activeHint" :suppressed="hintSuppressed")

      //- First-run controls lightbox. Sits inside the HUD layer, which is
      //- already `pointer-events: none`, so the gesture it is teaching reaches
      //- the canvas underneath it.
      TutorialOverlay(v-if="tutorialActive" :progress="tutorialProgress")

      //- Touch-only, and only for the opening seconds — see `showSteerHint`.
      IncomingWarning(:show="attackWarning" :answer="attackAnswer")

      //- The lever puzzle, then the weapon it pays out. Hidden behind the
      //- result screen for the same reason every other run readout is: the
      //- stage is over and the overlay owns the screen.
      WeaponTag(
        v-if="!overlayUp"
        :puzzle="puzzleWeapon"
        :pulled="puzzlePulled"
        :total="puzzleTotal"
        :gift="puzzleGift"
        :active="activeWeapon"
        :power="weaponPower"
        :side="sideWeapon"
        :side-power="sideWeaponPower"
      )

      StageBanner(
        :show="bannerShown"
        :stage="bannerStage"
        :unlock="bannerUnlock"
        :next="bannerNext"
        :title="bannerTitle"
      )
      SteerHint(:lane-half-px="laneHalfPx" :show="showSteerHint")

      //- ── The crowd is cashed in ────────────────────────────────────────
      //-
      //- A 0×0 point parked on the crowd's own screen position, which is where
      //- the coin burst starts at a handover — the whole point being that the
      //- survivors BECAME the coins rather than vanishing. See `bankCoins`. The
      //- chip is centred on the same point, so the burst's source rect and the
      //- words naming it are one object rather than two things that have to be
      //- kept in agreement.
      div.scene__cash(ref="crowdCashRef" :style="crowdCashStyle")
        Transition(name="cash")
          div.scene__cash-chip(v-if="crowdCashShown")
            IconCoin(class="scene__cash-coin")
            span {{ t('flow.squadCashed', { n: crowdCashCount }) }}

      //- ── "Boss felled!" ────────────────────────────────────────────────
      //-
      //- Two seconds over the body of the thing the whole stage was for, before
      //- anything else is allowed to happen. Anchored by its BOTTOM edge to a
      //- line above the boss's box so the type can grow in any language without
      //- ever growing down onto the corpse — see `bossFelledStyle`.
      div.boss-felled(v-if="bossFelledShown" :style="bossFelledStyle")
        div.boss-felled__type
          span.boss-felled__word {{ t('result.bossFelled') }}
          //- A second copy of the same word, clipped to its own glyphs, carrying
          //- a highlight that sweeps across once. Purely decorative, hence
          //- `aria-hidden` — a screen reader must not announce the label twice.
          span.boss-felled__shine(aria-hidden="true") {{ t('result.bossFelled') }}

      //- ── The death hold ────────────────────────────────────────────────
      //-
      //- Three seconds of the road, stopped on the frame the squad died on,
      //- with the camera leaning in and the light going out of it — see
      //- `holdOnWipe`. It eats input on purpose: the skill row is still under
      //- it, and a grenade thrown at a stage that is already lost would be the
      //- player arguing with a decision the game has made.
      //-
      //- The dim's duration is BOUND, not written in the stylesheet, so the
      //- light finishes going out exactly as the hold ends. One constant.
      div.wasted(v-if="wastedShown")
        div.wasted__dim(:style="{ animationDuration: WASTED_HOLD_MS + 'ms' }")
        div.wasted__word
          span.wasted__text {{ t('result.wasted') }}

      //- Centred under the squad, in the strip between the crowd and the bottom
      //- bar, on EVERY viewport — the row used to jump out to the right edge
      //- when that strip was too short, which is where it spent a whole
      //- playtest on desktop, off the road entirely. It shrinks to the lane now
      //- instead of moving off it. See `SkillBar.vue` for the whole argument.
      //- ── The grenade lesson's lightbox ────────────────────────────────
      //-
      //- A dimmer over everything, UNDER the skill row, with the taught button
      //- lifted above it (`.skills__btn--taught` takes a z-index). That is the
      //- whole trick: there is no cut-out and no mask, just one element the
      //- dimmer does not cover, which means it lands correctly at every
      //- viewport and cannot drift out of register with the button it is
      //- supposed to be framing.
      //-
      //- It appears only once the world has STOPPED, not while it is crawling —
      //- a player who already knows the button throws one during the crawl and
      //- never sees an overlay at all.
      Transition(name="teach")
        div.teach-box(v-if="grenadeTeachHeld" aria-hidden="true")

      SkillBar(
        v-if="!overlayUp"
        :taught="grenadeTeachHeld ? 'grenade' : null"
        :shield-live="shieldLive"
        :frost-live="frostLive"
        :decoy-live="decoyLive"
        :lane-half-px="laneHalfPx"
        :squad-floor-px="squadFloorPx"
        :hud-bottom-px="hudBottomPx"
        @use="onUseSkill"
      )

      //- ── Bottom bar ────────────────────────────────────────────────────
      div.scene__bottom(ref="bottomBarRef")
        div.scene__meta
          FMuteButton
          //- Gone entirely — not disabled — on a build with no endpoint. A
          //- button that opens an empty board is worse than no button.
          FHudButton(
            v-if="leaderboardEnabled"
            tone="slate"
            icon="leaderboard"
            :aria-label="t('leaderboard.title')"
            @click="showLeaderboard = true"
          )
          FHudButton(
            tone="slate"
            icon="settings"
            :aria-label="t('options.title')"
            @click="showOptions = true"
          )
          //- ── The daily expedition ──────────────────────────────────────
          //-
          //- On the HUD rather than in a menu, because this game HAS no menu:
          //- it boots straight into a stage and there is always a run in
          //- flight, so the bottom meta cluster is the only home a
          //- between-runs control could ever have had. It closes that cluster
          //- rather than opening it — the three buttons to its left are
          //- established positions and a feature that arrives later does not
          //- get to move them — and it is the only gold thing in a row of grey
          //- glyphs on the days it has something to offer.
          //-
          //- It hides itself entirely below the unlock and states its own
          //- cooldown when it is spent, so it never needs a popup to explain
          //- itself. See `DailyExpedition.vue`.
          DailyExpedition(@start="onStartExpedition")

        div.scene__shop
          span.scene__spotlight(v-if="showShopSpotlight") {{ t('upgrades.spotlight') }}
          //- The forge — the same mark the result screen's upgrade button
          //- wears, because both open the same modal and the second must not
          //- have to be learned all over again. It was the chest until the
          //- chest became the idle reward above; two controls that do
          //- different things may not be one drawing. `ArtIcon` shows the
          //- painting if the pipeline has made one, the canvas drawing from
          //- `uiArt.paintForge` otherwise, and the flat glyph under both.
          FHudButton(
            tone="green"
            icon="anvil"
            art="forge"
            :attention="showShopSpotlight"
            :aria-label="t('upgrades.title')"
            @click="openUpgrades"
          )
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
          //- ON A WIN THIS LOOKS FORWARD, and on a loss it looks back.
          //-
          //- The screen used to headline the stage just finished either way,
          //- which is a summary — the shape of an ending. Half of Poki's testers
          //- left at this screen having just WON, so the win path now names the
          //- thing that has not happened yet. The stage they cleared is already
          //- on the ribbon above; repeating it bought nothing.
          //- The expedition takes neither line: "up next: stage 17" would be a
          //- promise about a campaign this run is not part of, and "stage 16" a
          //- number the player has no relationship with. It names itself and
          //- says when the next one is, which is the only forward-looking thing
          //- there is to say about a road that comes once a day.
          span.result__stage(v-if="summary.expedition") {{ t('expedition.title') }}
          span.result__stage(v-else-if="summary.cleared") {{ t('result.upNext', { n: summary.stage + 1 }) }}
          span.result__stage(v-else) {{ t('result.reachedStage', { n: summary.stage }) }}
          span.result__relief(v-if="summary.expedition") {{ t('expedition.done') }}
          span.result__record(v-if="summary.isRecord") {{ t('result.newRecord') }}
          //- Only ever shown AFTER the run. Telling a player mid-stage that the
          //- game went easy on them takes the win away from them.
          span.result__relief(v-else-if="summary.relieved") {{ t('result.rallied') }}

        //- ── How close they came ───────────────────────────────────────────
        //-
        //- A loss used to end on "Stage 9" and nothing else, which is a full
        //- stop dressed as a statistic. The road knew how far the run got all
        //- along — `wipeReward` is priced off it — so the number simply travels
        //- to the screen now: a rail filled to where the crowd fell, a ghost
        //- tick at the best any previous attempt managed, and the percentage
        //- said out loud.
        //-
        //- Only on a campaign LOSS. A clear reached the end by definition, and
        //- an expedition is one attempt a day with nothing to beat.
        div.result__reach(v-if="showReach")
          div.result__reach-rail
            div.result__reach-fill(:style="{ width: reachPct + '%' }")
            //- The mark is only drawn when there is a previous attempt to
            //- compare with, and never when this run has already passed it —
            //- a tick buried under the fill reads as a bug, not as a record.
            div.result__reach-mark(
              v-if="showReachMark"
              :style="{ left: bestReachPct + '%' }"
            )
          div.result__reach-line
            span.result__reach-now {{ t('result.reach', { n: reachPct }) }}
            span.result__reach-best(v-if="isNewReach") {{ t('result.newReach') }}
            span.result__reach-prev(v-else-if="bestReachPct > 0") {{ t('result.bestReach', { n: bestReachPct }) }}

        //- ── What stopped it ───────────────────────────────────────────────
        //- One glyph, one short line, and a border that says "this is a note".
        //- See `deathCause` for why it is this short and why it is a box.
        div.result__cause(v-if="deathCause")
          GameIcon.result__cause-icon(name="warning")
          span.result__cause-text {{ t(`result.cause.${deathCause}`) }}

        //- ── Three chips on ONE line ───────────────────────────────────────
        //-
        //- This was three stacked blocks — a two-cell stats row with the words
        //- "Biggest squad" and "Kills" under the numbers, then a full-width
        //- leaderboard plaque with the board NAMED on it. Together they cost
        //- three rows and about a third of a landscape phone, and the German
        //- caption ("GRÖSSTER TRUPP") was the widest thing on the screen.
        //-
        //- The glyphs carry it instead: a crowd, a skull and a trophy, which is
        //- the same vocabulary the HUD strip already uses during the run — the
        //- squad chip is literally the same glyph the player watched all stage.
        //- The gold on the rank chip is what still says "this one is about other
        //- people, not about your run"; the captions survive as screen-reader
        //- text, which is the only place they were ever load-bearing.
        //-
        //- The rank chip disappears when the rank is unknown: an empty plaque is
        //- a question the screen cannot answer.
        div.result__chips
          div.result__chip.is-squad
            GameIcon.result__chip-icon(name="squad")
            span.sr-only {{ t('result.peakSquad') }}
            span.result__chip-value {{ summary.peakSquad }}
          div.result__chip.is-kills
            GameIcon.result__chip-icon(name="skull")
            span.sr-only {{ t('result.kills') }}
            span.result__chip-value {{ summary.kills }}
          div.result__chip.is-rank(v-if="resultRank")
            GameIcon.result__chip-icon(name="trophy")
            span.sr-only {{ t('leaderboard.title') }}
            span.result__chip-value {{ resultRank }}
            //- Only once the player count has landed. Before that there is no
            //- "of N" to print, and the word that used to hold the slot is now
            //- said by the trophy.
            span.result__chip-of(v-if="playerTotal > 0") {{ t('result.rankOf', { n: playerTotal }) }}

        //- ── The milestone ──────────────────────────────────────────────────
        //-
        //- ABOVE the coin line and named, because it is the only payout on this
        //- screen the player was promised in advance: the HUD chip has been
        //- counting down to it for two stages, and a lump that quietly folded
        //- into the coin total would be a countdown that arrived at nothing.
        //- The same star the chip wore, so the thing watched and the thing paid
        //- are one object.
        div.result__milestone(v-if="summary.milestone > 0")
          GameIcon.result__milestone-icon(name="star")
          span.result__milestone-text {{ t('result.milestone') }}
          IconCoin(class="result__milestone-coin")
          span.result__milestone-value +{{ summary.milestone }}

        div.result__coins(ref="rewardCoinRef")
          IconCoin(class="result__coin-icon")
          span.result__coin-value +{{ summary.coins }}

        //- The ×3, above the actions and visually louder than either of them:
        //- it is the primary income of the game, not a footnote on the way out.
        FButton.result__reward(
          v-if="showRewardButton"
          :size="resultCompact ? 'sm' : 'md'"
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

        //- ── Two glyphs where two captions used to be ──────────────────────
        //-
        //- "Nächstes Level" and "Upgrade" side by side were the widest row on
        //- the screen and the first thing to wrap — a caption's width swings 2-3x
        //- across the 21 locales this game ships, so the row had to be laid out
        //- for the worst of them and was wrong in all the others. Two glyphs are
        //- width-invariant: one layout, correct in every language.
        //-
        //- Both actions are conventional (a cart, and a skip/replay), both sit in
        //- a cluster, and a wrong tap costs one tap to undo — which is the whole
        //- test for whether a caption may become a glyph. The rewarded button
        //- above keeps its words for the opposite reason: it carries a number.
        //-
        //- Forward action LAST and 25% larger, because once the captions are gone
        //- the row is visually uniform and the one button that ends the screen
        //- needs another way to be found. `emphasis` grows the real layout box,
        //- so the row still gutters correctly around it.
        div.result__actions(:class="{ 'result__actions--hinted': showUpgradeHint }")
          //- ── The share card ────────────────────────────────────────────
          //-
          //- FIRST in the row, and only on a record the board placed. It is the
          //- one action here that does not belong to the loop — it does not
          //- spend coins and it does not start the next run — so it sits at the
          //- far edge, away from the button that ends the screen. Anywhere
          //- closer and a thumb reaching for "next" on a phone finds a share
          //- sheet instead.
          //-
          //- It is a glyph for the same reason the other two are: a caption
          //- ("Ergebnis teilen") would be the widest thing on the row in half
          //- the locales, and a share arrow is as conventional a mark as this
          //- game has. The `aria-label` is what carries the name.
          //-
          //- TAKEN OUT OF THE SCREEN (2026-09-12) — kept, not deleted.
          //- On the devices that actually reached it, the share sheet had no
          //- target that takes a picture, so the only thing the button could do
          //- was DOWNLOAD the card to the phone. A download is not a share: it
          //- tells nobody about the run and leaves a stray file behind, which is
          //- a worse result screen than no button at all. The card renderer and
          //- its offer rules are untouched (`useShareCard`, and its specs), so
          //- putting it back is uncommenting this block and the two consts and
          //- the import it uses — whenever there is a share path worth having.
          //- FButton.result__share(
          //-   v-if="showShareCard"
          //-   icon-only
          //-   icon="share"
          //-   :size="resultCompact ? 'sm' : 'md'"
          //-   type="secondary"
          //-   :is-disabled="adInFlight || shareCardBusy"
          //-   :aria-label="t('share.action')"
          //-   @click="onShareCard"
          //- )
          //- The upgrade button wears a pointer on the first three result
          //- screens only. It is a glyph in a row of glyphs, and it is the one
          //- that makes the next run different from the last.
          div.result__shop(:class="{ 'result__shop--hinted': showUpgradeHint }")
            Transition(name="shop-tip")
              div.result__shop-tip(v-if="showUpgradeHint") {{ t('result.upgradeHint') }}
            FButton(
              icon-only
              icon="anvil"
              art="forge"
              :size="resultCompact ? 'sm' : 'md'"
              type="secondary"
              :is-disabled="adInFlight"
              :aria-label="t('result.upgrade')"
              @click="onUpgradeFromResult"
            )
          //- The forward action. After five untouched seconds it starts to
          //- bounce — see "The forward button bounces". The class goes on the
          //- WRAPPER and the animation reaches the button's painted face
          //- through it, so this element (and therefore the row, and therefore
          //- every gutter in it) never moves.
          div.result__go(:class="{ 'result__go--bounce': goBounce }")
            //- Out of an expedition the button is never a REPLAY, whichever way
            //- the run ended: the road is one attempt a day and there is
            //- nothing here to try again. Both outcomes lead the same way —
            //- back to the campaign, at exactly the stage it was left on —
            //- which is why the glyph is the forward arrow on a wipe too, and
            //- why `advanceStage`/`retryStage` both resolve to the same thing
            //- when `isExpedition` is set.
            FButton(
              icon-only
              :icon="summary.expedition || summary.cleared ? 'skip-forward' : 'replay'"
              :size="resultCompact ? 'sm' : 'md'"
              type="success"
              :emphasis="1.25"
              :is-disabled="adInFlight"
              :aria-label="summary.expedition ? t('expedition.back') : (summary.cleared ? t('result.nextStage') : t('result.tryAgain'))"
              @click="summary.cleared ? onNext() : onRetry()"
            )

    //- ── The weapon choice ─────────────────────────────────────────────────
    //- The one stop the opening stages make on purpose. See `flowToNextStage`.
    WeaponChoice(:open="showWeaponPick" :stage="WEAPON_PICK_STAGE" @pick="onWeaponPicked")
    //- The first boss's launcher. See `presentBossReward`.
    BossReward(:open="showBossReward" :stage="BOSS_REWARD_STAGE + 1" @done="onBossRewardDone")

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
  // The rally announcement hangs off this box's bottom edge rather than
  // extending it — see `GuardianBanner`.
  position: relative

// The chest hangs under the badge and is CENTRED on it rather than flushed to
// the screen edge: its payout chip is wider than the chest itself and centred
// on it, so a right-aligned chest would hang that chip over the safe-area
// inset on a notched phone.
.scene__wallet
  flex: 0 0 auto
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(0.35rem, 1.8vw, 0.6rem)
  pointer-events: auto

.scene__hint
  display: flex
  justify-content: center
  margin-top: clamp(0.35rem, 2vw, 0.7rem)
  padding-inline: 0.5rem

// The guard primer is the one hint that fires while the boss is on screen, and
// the boss's barrier — with its shield crest — is drawn exactly where this row
// normally sits, so the toast landed on top of the crest at the single moment
// both most need to be read.
//
// `margin-top: auto` against the `.scene__bottom` auto margin below splits the
// free space evenly, parking the hint mid-screen: under the barrier, above the
// crowd. Deliberately not a `vh` offset — the barrier's screen position moves
// with the camera and the viewport, and a fixed nudge would only be correct on
// the aspect ratio it was measured on. Doubled class so it also outranks the
// landscape-phone `.scene__hint` override further down this file.
.scene__hint.scene__hint--low
  margin-top: auto

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

// ─── The crowd cashed in ────────────────────────────────────────────────────
//
// A zero-size point parked on the crowd, positioned from the renderer's own
// projection (see `aimCrowdCash`). Zero-size on purpose: `spawnCoinExplosion`
// bursts from the CENTRE of its source element's rect, so a point is the only
// shape that cannot introduce an offset between where the coins appear and where
// the survivors are standing.
.scene__cash
  position: absolute
  width: 0
  height: 0
  // In front of the canvas, behind every control. It has no interactive parts and
  // the HUD layer is already `pointer-events: none`, but the chip is wide and it
  // sits in the middle of the road — a stray hit target there would eat steering.
  pointer-events: none

// Centred on the point and lifted clear of the crowd's own heads, so the words
// sit in the gap between the survivors and the road ahead rather than on top of
// the thing they are about.
.scene__cash-chip
  position: absolute
  left: 0
  bottom: clamp(2.2rem, 9vmin, 3.6rem)
  transform: translateX(-50%)
  display: inline-flex
  align-items: center
  gap: 0.35em
  white-space: nowrap
  padding: 0.28em 0.7em
  border: 2px solid rgba(255, 217, 60, 0.5)
  border-radius: 999px
  background-color: rgba(10, 16, 30, 0.82)
  color: #ffd93c
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.62rem, 3vmin, 0.92rem)
  text-shadow: 2px 2px 0 #000

.scene__cash-chip .scene__cash-coin
  flex: 0 0 auto
  width: 1.15em
  height: 1.15em
  color: #ffd93c

// Rises as it fades, which is the same gesture the coins themselves make.
.cash-enter-active
  transition: opacity 180ms ease-out, translate 180ms ease-out

.cash-leave-active
  transition: opacity 320ms ease-in, translate 320ms ease-in

.cash-enter-from
  opacity: 0
  translate: 0 8px

.cash-leave-to
  opacity: 0
  translate: 0 -14px

// ─── "Boss felled!" ─────────────────────────────────────────────────────────
//
// The reward for the hardest thing in the stage, so it is typed like one: the
// biggest display face on any in-run surface, in the blood red nothing else in
// this game's HUD uses, cut out with the same hard black offset the result
// screen's headline wears so the two read as one family.
//
// `vmin`, like the result screen, because the axis this label runs out of is the
// short one — on a landscape phone a `vw`-keyed size would pick its maximum on
// the axis with room to spare and spill off the axis that decides.
.boss-felled
  position: absolute
  // `left: 50%` plus this is the horizontal centring; the vertical anchor is the
  // inline `bottom` from `bossFelledStyle`, which is measured against the boss's
  // own box every 100 ms while the body falls.
  transform: translateX(-50%)
  display: flex
  justify-content: center
  width: max-content
  max-width: 94vw
  pointer-events: none
  z-index: 3

// The scale-in, with a real overshoot: 0.6 → 1.08 → 1. A celebration that grows
// straight to its final size reads as a label appearing; one that overshoots
// reads as an impact, which is the thing being sold. `backwards` so the first
// painted frame is already the small one rather than a full-size flash.
.boss-felled__type
  position: relative
  display: inline-block
  color: #ff3b30
  font-weight: 900
  text-transform: uppercase
  letter-spacing: 0.02em
  line-height: 1
  text-align: center
  font-size: clamp(1.5rem, 9vmin, 3.4rem)
  // Two shadows doing two jobs: the hard offset is the game's display type, and
  // the soft red bloom under it is what stops a dark-red word disappearing into
  // the arena's own dark ground.
  text-shadow: 4px 4px 0 #000, -2px -2px 0 #2b0000, 0 0 18px rgba(255, 59, 48, 0.65)
  animation: boss-felled-pop 420ms cubic-bezier(0.22, 1.5, 0.4, 1) both

@keyframes boss-felled-pop
  0%
    opacity: 0
    scale: 0.6
  60%
    opacity: 1
  100%
    opacity: 1
    scale: 1

// The shimmer: the same word again, laid exactly over the first, with its fill
// clipped to its own glyphs and a narrow highlight sweeping through once.
//
// A second copy rather than a gradient on the original, because the original
// needs `color` for its fill and its text-shadows, and `background-clip: text`
// requires a transparent fill — the two cannot live on one element. This copy has
// no shadows at all, so it adds light and never a second outline.
.boss-felled__shine
  position: absolute
  inset: 0
  // Inherited from the type above, and it must NOT be. The shine is a second
  // copy of the same word laid exactly over the first; with the family's black
  // offset shadows on it too, every glyph was outlined twice a pixel apart and
  // the whole label read as a smear rather than as bold type. Measured in a
  // browser — it was the first thing wrong with this label.
  text-shadow: none
  background-image: linear-gradient(105deg, rgba(255, 255, 255, 0) 38%, rgba(255, 240, 210, 0.95) 50%, rgba(255, 255, 255, 0) 62%)
  background-size: 280% 100%
  background-repeat: no-repeat
  -webkit-background-clip: text
  background-clip: text
  color: transparent
  // Starts after the pop has landed: a shimmer during the scale-in is two
  // animations competing for the same 400 ms and neither is legible.
  animation: boss-felled-shine 900ms ease-in-out 380ms 1 both

@keyframes boss-felled-shine
  from
    background-position: 180% 0
  to
    background-position: -80% 0

// Reduced motion: the label still arrives — it is the reward, not an ornament —
// but it arrives rather than lands. A fade with no scale and no sweep.
@media (prefers-reduced-motion: reduce)
  .boss-felled__type
    animation: boss-felled-fade 300ms ease-out both

  .boss-felled__shine
    animation: none
    // Left OUT of the paint entirely rather than parked mid-sweep, which would
    // read as a stray white smear across the word.
    opacity: 0

@keyframes boss-felled-fade
  from
    opacity: 0
  to
    opacity: 1


// ─── The death hold ─────────────────────────────────────────────────────────
//
// The loss's answer to `.boss-felled`, and built from the same parts on purpose:
// a win and a loss should be told in one typographic voice, or the game reads as
// two games. What differs is the tempo. The win lands in 420 ms and gets out of
// the way; this one takes the whole three seconds — the light leaves the frame
// gradually, and the word arrives late, after the player has already been made
// to look at the bodies.
.wasted
  position: absolute
  inset: 0
  display: grid
  place-items: center
  // Above every run readout, including the skill row. The road is over; nothing
  // under this is worth tapping.
  z-index: 6
  // The one thing in the HUD layer that is NOT transparent to input. See the
  // template note.
  pointer-events: auto

.wasted__dim
  position: absolute
  inset: 0
  // From the edges in, and never to true black: the whole point of the hold is
  // that the player looks at the bodies, so the middle of the frame — where the
  // camera is leaning — keeps enough light to read them by. The red is what
  // makes it a death rather than a pause.
  background: radial-gradient(ellipse at 50% 60%, rgba(48, 6, 10, 0.12) 0%, rgba(26, 3, 7, 0.6) 46%, rgba(3, 0, 2, 0.95) 100%)
  opacity: 0
  animation-name: wasted-dim
  // Linear, with the shape in the keyframes rather than in an easing curve.
  // Measured in a browser first: an ease-in put barely a tenth of the dim on
  // screen a second in, and since the result card lands the moment the hold
  // ends, most of the fade was being spent behind the overlay. The player has
  // to SEE the light go, so half of it is gone by 40 % of the hold.
  animation-timing-function: linear
  animation-fill-mode: forwards

@keyframes wasted-dim
  0%
    opacity: 0
  40%
    opacity: 0.55
  100%
    opacity: 1

.wasted__word
  position: relative
  max-width: 92vw
  text-align: center

.wasted__text
  display: inline-block
  color: #ff2f2f
  font-weight: 900
  text-transform: uppercase
  // Wider than the win's label. Letter-spacing is the whole difference between
  // a word that shouts and a word that pronounces, and this one pronounces.
  letter-spacing: 0.16em
  line-height: 1
  font-size: clamp(2rem, 13vmin, 4.6rem)
  text-shadow: 4px 4px 0 #000, -2px -2px 0 #290000, 0 0 26px rgba(255, 47, 47, 0.5)
  // Late, and slow. It arrives from too big and settles, which reads as
  // something landing ON the screen rather than being drawn on it — and the
  // delay is what keeps it from competing with the three-second lean.
  animation: wasted-pop 760ms cubic-bezier(0.16, 0.9, 0.28, 1) 700ms both

@keyframes wasted-pop
  0%
    opacity: 0
    scale: 1.9
    filter: blur(6px)
  55%
    opacity: 1
  100%
    opacity: 1
    scale: 1
    filter: blur(0)

@media (prefers-reduced-motion: reduce)
  .wasted__text
    animation: boss-felled-fade 400ms ease-out 600ms both


// ─── Result screen ──────────────────────────────────────────────────────────

// The ribbon caption is TYPED BY THE RIBBON, not by this screen: `FReward`
// sizes it against the banner art's own width so it can never outgrow the
// parchment. All this class does now is mark the slot content.
.scene__ribbon
  display: block

.result
  display: flex
  flex-direction: column
  align-items: center
  // Gaps measured in vh as well as vw: the axis this screen runs out of is the
  // vertical one, and a gap ladder keyed only on width stays fat on a short
  // landscape phone — which is exactly where it must not.
  gap: clamp(0.3rem, 1.6vh, 0.85rem)
  width: 100%
  max-width: 26rem
  // Room for the 3px depth plate under the bottom button row. A transformed
  // descendant counts toward its ancestor's SCROLLABLE overflow, so without
  // this the overlay's scroll container found itself 3px short of its own
  // content and grew a scrollbar around a screen that fits perfectly.
  padding-bottom: 3px

.result__headline
  display: flex
  flex-direction: column
  align-items: center
  gap: 0.15rem

// ─── Everything on this screen is typed in `vmin` ───────────────────────────
//
// `vw` was wrong here in one specific, common case: a landscape phone is ~667px
// WIDE and 375px tall, so every `vw` term picked its maximum on the axis that
// had room to spare while the axis that did not was the one deciding whether
// the screen fitted. `vmin` keys the type to the short axis, which is the axis
// this screen actually runs out of, in both orientations.
.result__stage
  color: #fff
  font-weight: 900
  text-transform: uppercase
  text-align: center
  font-size: clamp(1rem, 5vmin, 1.9rem)
  text-shadow: 3px 3px 0 #000

.result__record
  color: #ffd93c
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.65rem, 3vmin, 0.95rem)
  text-shadow: 2px 2px 0 #000
  animation: spotlight-pulse 1.1s ease-in-out infinite

.result__relief
  color: #8fd6ff
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.55rem, 2.6vmin, 0.8rem)
  text-shadow: 2px 2px 0 #000

// ─── The grenade lesson's lightbox ──────────────────────────────────────────
//
// Deliberately not black: the road under it still has to be legible, because
// the thing the player is being asked to answer — an elite walking in — is on
// it, and a lesson that hides its own subject teaches nothing. A violet-black
// wash at 62 % dims the scene to "held" rather than to "off".
.teach-box
  position: absolute
  inset: 0
  z-index: 2
  background: radial-gradient(ellipse at 50% 78%, rgba(12, 6, 22, 0.5), rgba(6, 4, 12, 0.78))
  pointer-events: none

.teach-enter-active,
.teach-leave-active
  transition: opacity 220ms ease-out

.teach-enter-from,
.teach-leave-to
  opacity: 0

// ─── The near-miss rail ─────────────────────────────────────────────────────
//
// Reads as a piece of road, because that is what it is: the same dark plate the
// HUD wears, filled left-to-right in the crowd's own green, with a pale tick
// standing where the last attempt stopped. Deliberately thin — it sits between
// the stage name and the stat chips and must not become the loudest thing on a
// screen whose job is to start the next run.
.result__reach
  display: flex
  flex-direction: column
  align-items: center
  gap: 0.35em
  width: min(100%, 22rem)

.result__reach-rail
  position: relative
  width: 100%
  height: clamp(6px, 1.6vmin, 10px)
  border-radius: 999px
  background: rgba(0, 0, 0, 0.55)
  border: 1px solid rgba(0, 0, 0, 0.85)
  overflow: hidden

.result__reach-fill
  position: absolute
  inset: 0 auto 0 0
  min-width: 2px
  border-radius: 999px
  background: linear-gradient(90deg, #4f8f3a, #7ad14f)

// In front of the fill, and never wider than the tick it is meant to be: this
// is a mark on a scale, not a second bar.
.result__reach-mark
  position: absolute
  top: -1px
  bottom: -1px
  width: 2px
  transform: translateX(-1px)
  background: #ffffff
  opacity: 0.75

.result__reach-line
  display: flex
  align-items: baseline
  gap: 0.6em
  font-weight: 900
  text-transform: uppercase
  text-shadow: 2px 2px 0 #000
  font-size: clamp(0.55rem, 2.6vmin, 0.8rem)

.result__reach-now
  color: #cfe9b8

.result__reach-best
  color: #ffd93c

.result__reach-prev
  color: rgba(255, 255, 255, 0.62)

// ─── The cause box ──────────────────────────────────────────────────────────
//
// Deliberately NOT in the result screen's own gold-and-plate vocabulary, and
// deliberately not red either. It is a note ABOUT the run rather than a part of
// the scoring, so it wears the one look nothing else on this screen wears: a
// flat slate strip with a warm amber rule down its leading edge, which is the
// shape every UI in the world uses for "here is something you should know".
//
// Red was tried first and thrown out. The screen already says WIPED OUT on the
// ribbon; a second red thing underneath it reads as a second failure, and the
// box is not scolding the player, it is answering their question.
.result__cause
  display: flex
  align-items: center
  justify-content: center
  gap: 0.5rem
  align-self: center
  max-width: 100%
  padding: 0.42rem 0.8rem
  border-radius: 0.6rem
  border: 1px solid rgba(255, 190, 90, 0.32)
  // The rule that makes it an info box rather than a chip.
  border-left: 4px solid rgba(255, 190, 90, 0.85)
  background-color: rgba(12, 18, 32, 0.78)

.result__cause-icon
  flex: none
  width: 1.05rem
  height: 1.05rem
  color: #ffbe5a

.result__cause-text
  color: rgba(255, 255, 255, 0.92)
  font-weight: 700
  font-size: clamp(0.82rem, 3.4vw, 1rem)
  line-height: 1.2
  // Wraps rather than clipping: four words is short in English and can be six
  // in German, and a cause that is cut off is worse than no cause at all.
  text-align: left

// ─── The milestone line ─────────────────────────────────────────────────────
//
// Gold on a gold-edged plate — the same vocabulary as the HUD chip it pays off
// and as the `result__record` line, because all three are "something went right
// that does not happen every stage".
.result__milestone
  display: flex
  align-items: center
  gap: 0.4em
  padding: 0.3em 0.75em
  border: 2px solid rgba(255, 217, 60, 0.5)
  border-radius: 999px
  background-color: rgba(120, 84, 8, 0.55)
  color: #ffd93c
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.6rem, 2.8vmin, 0.88rem)
  text-shadow: 2px 2px 0 #000

.result__milestone-icon
  width: 1.2em
  height: 1.2em
  flex: 0 0 auto

.result__milestone-coin
  width: 1.1em
  height: 1.1em
  flex: 0 0 auto

.result__milestone-value
  color: #fff
  font-variant-numeric: tabular-nums

// ─── The stat chips ─────────────────────────────────────────────────────────
//
// Deliberately the same pill the run HUD wears — dark plate, hairline black
// rule, glyph then number — so the numbers the player watched climb during the
// stage are recognisably the same numbers when the stage ends.
.result__chips
  display: flex
  flex-wrap: wrap
  align-items: center
  justify-content: center
  gap: clamp(0.3rem, 1.6vmin, 0.55rem)

.result__chip
  display: inline-flex
  align-items: baseline
  gap: 0.3em
  padding: clamp(0.15rem, 0.9vmin, 0.3rem) clamp(0.4rem, 2vmin, 0.7rem)
  border: 2px solid rgba(0, 0, 0, 0.55)
  border-radius: 999px
  background-color: rgba(10, 16, 30, 0.72)

  &.is-squad
    color: #8fd6ff
  &.is-kills
    color: #ff9a8f
  // Gold, and a gold rule, because a placing is the one number on this screen
  // that is not about the run — it is about the other players.
  &.is-rank
    color: #ffd93c
    border-color: rgba(255, 217, 60, 0.45)
    background-color: rgba(255, 217, 60, 0.1)

// Nested rather than written flat, and that is load-bearing: `GameIcon`'s own
// scoped rule is `.game-icon[data-v-…]` — one class plus one attribute, exactly
// the same specificity a flat `.result__chip-icon[data-v-…]` would have. On a tie the
// winner is whichever stylesheet the bundler happened to emit last. Nesting
// adds the ancestor class and settles it.
.result__chip .result__chip-icon
  // `align-self` rather than `align-items: center` on the row: the numbers set
  // the baseline, and a glyph hung off it sits where a capital letter would.
  align-self: center
  flex: 0 0 auto
  width: clamp(0.85rem, 4vmin, 1.2rem)
  height: clamp(0.85rem, 4vmin, 1.2rem)

.result__chip-value
  color: #fff
  font-weight: 900
  font-size: clamp(0.85rem, 4.2vmin, 1.3rem)
  line-height: 1
  text-shadow: 2px 2px 0 #000

.result__chip-of
  color: #b9cbe8
  text-transform: uppercase
  font-size: clamp(0.5rem, 2.4vmin, 0.7rem)

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
  font-size: clamp(0.72rem, 3.2vmin, 1rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.75)

.result__claimed-icon
  width: clamp(1rem, 4.6vmin, 1.4rem)
  height: clamp(1rem, 4.6vmin, 1.4rem)
  color: #ffd93c

@keyframes reward-breathe
  0%, 100%
    scale: 1
  50%
    scale: 1.045

.result__coin-icon
  width: clamp(1.2rem, 5vmin, 1.8rem)
  height: clamp(1.2rem, 5vmin, 1.8rem)
  color: #ffd93c

.result__coin-value
  color: #ffd93c
  font-weight: 900
  font-size: clamp(1.1rem, 5vmin, 2rem)
  line-height: 1.1
  text-shadow: 3px 3px 0 #000

// ─── The upgrade pointer (first three result screens) ───────────────────────
//
// A label above the shop glyph plus a ring around it. Both are `pointer-events:
// none` so the hint can never eat the tap it is asking for, and the label is
// absolutely positioned so adding it does not move the action row — the row is
// laid out for a 320 px phone and has no slack.
.result__shop
  position: relative
  display: flex
  align-items: center
  justify-content: center

.result__shop-tip
  // ABOVE the button. Below it looked tempting — there is dead space under the
  // row — but the result panel clips its own overflow, so the bubble was cut in
  // half. Above it would collide with the rewarded ×3 button, which carries a
  // number and must stay legible, so the ROW reserves space for it instead
  // (`.result__actions--hinted`). The reservation is only paid while the hint
  // is up, so the normal screen keeps its layout exactly as it was.
  position: absolute
  bottom: calc(100% + 0.45rem)
  left: 50%
  transform: translateX(-50%)
  z-index: 2
  pointer-events: none
  white-space: nowrap
  padding: 0.22rem 0.6rem
  border-radius: 999px
  border: 2px solid rgba(255, 255, 255, 0.22)
  background-color: rgba(8, 14, 28, 0.9)
  color: #ffd93c
  font-weight: 900
  font-size: clamp(0.58rem, 2.6vw, 0.8rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)
  animation: shop-tip-bob 1.5s ease-in-out infinite

  // The tail, pointing down at the button.
  &::after
    content: ''
    position: absolute
    top: 100%
    left: 50%
    transform: translateX(-50%)
    border: 0.32rem solid transparent
    border-top-color: rgba(255, 255, 255, 0.22)

.result__shop--hinted
  // A ring on the button itself: the label says what, this says which.
  &::before
    content: ''
    position: absolute
    inset: -0.3rem
    border-radius: 1rem
    border: 2px solid rgba(255, 217, 60, 0.8)
    pointer-events: none
    animation: shop-ring-pulse 1.5s ease-in-out infinite

@keyframes shop-tip-bob
  0%, 100%
    transform: translateX(-50%) translateY(0)
  50%
    transform: translateX(-50%) translateY(-0.22rem)

@keyframes shop-ring-pulse
  0%, 100%
    opacity: 0.45
    transform: scale(1)
  50%
    opacity: 1
    transform: scale(1.06)

.shop-tip-enter-active, .shop-tip-leave-active
  transition: opacity 0.25s ease

.shop-tip-enter-from, .shop-tip-leave-to
  opacity: 0

// Only while the pointer is up: enough headroom for the bubble to sit between
// the rewarded button and the action row without touching either.
.result__actions--hinted
  margin-top: clamp(1.3rem, 5vmin, 1.9rem)

.result__actions
  display: flex
  // No `flex-wrap`. The row is square glyph buttons only, and its worst case is
  // the three it carries on a record screen: 36 + 36 + 45 px at `sm` plus two
  // 9.6 px gutters is 145 px on a 320 px phone, less than half the width. A
  // wrapped action row can therefore only ever be a symptom — it is the exact
  // failure the icon pass exists to remove — so it is left unable to wrap.
  align-items: center
  justify-content: center
  gap: clamp(0.5rem, 3vmin, 1rem)
  width: 100%

// The share button is commented out of the template for now (see "The share
// card"), so nothing wears this today. The rule is kept with it: the button was
// present on a handful of result screens and absent on the rest, and nothing is
// pinned to compensate — the row is centre-justified, the button sits at the far
// end from the forward action, and a record screen simply has one more glyph on
// it. Pinning the forward action instead would leave a permanent gap on every
// ordinary screen to protect the muscle memory of a screen most players never
// see.
.result__share
  flex: 0 0 auto

// ─── The forward button's bounce ────────────────────────────────────────────
//
// Replaces the auto-advance outline that used to be drawn here — an SVG traced
// along the button's own rounded edge, filling clockwise until the button fired
// itself. Nothing fires itself any more (see "The forward button bounces"), so
// all that is left is a hop that says "this is the way out".
//
// The animation is applied to the button's FACE and its depth plate, through
// `:deep`, and never to the `<button>`: the wrapper and the button keep their
// boxes, so the row cannot move and the tap target cannot shrink. A tap on the
// risen face still hits the button, because the face is inside it.
.result__go
  position: relative
  display: inline-flex

// `translate`, not `transform`. The depth plate already carries
// `transform: translateY(3px)` and the brawl variant carries a skew; the
// individual transform properties compose with those instead of replacing them,
// which is the same reason FButton's own `attention-bounce` keyframes are written
// this way.
//
// Both halves get the identical animation so the face and the plate under it move
// as one object. Animating only the face would peel the button off its own
// shadow, which reads as a rendering bug rather than as a bounce.
.result__go--bounce
  :deep(.f-button__body),
  :deep(.f-button__shadow)
    animation: result-go-hop 1900ms cubic-bezier(0.3, 0, 0.3, 1) infinite

// Two hops and a long rest, rather than a continuous bob.
//
// A bob is a nag: it never stops asking, so after a few seconds the eye files it
// as decoration and stops seeing it — which is the one thing this must not become
// on a screen a player may sit on for half a minute. A double hop with a beat of
// stillness after it keeps re-announcing itself, and the stillness is what makes
// the movement read as a signal.
//
// The second hop is deliberately shorter than the first: a ball losing height. It
// is the difference between something bouncing and something being jerked up and
// down twice.
@keyframes result-go-hop
  0%, 8%
    translate: 0 0
  22%
    translate: 0 -9px
  36%
    translate: 0 0
  44%
    translate: 0 -4px
  52%, 100%
    translate: 0 0

// ─── …and for a player who asked for no motion ──────────────────────────────
//
// The bounce is a pointer, so it cannot simply be dropped — a player with
// `prefers-reduced-motion` is exactly as entitled to be told where the way out
// is. It becomes a pulse of the button's OWN glow instead: no movement at all,
// nothing that could be read as the screen doing something, and the light is on
// the same object the hop would have lifted.
//
// On `.f-button__body`, whose `overflow: hidden` clips its children and not its
// own box-shadow — so the halo is drawn outside the face exactly as intended.
@media (prefers-reduced-motion: reduce)
  .result__go--bounce
    :deep(.f-button__body),
    :deep(.f-button__shadow)
      animation: none

    :deep(.f-button__body)
      animation: result-go-glow 2200ms ease-in-out infinite

@keyframes result-go-glow
  0%, 100%
    box-shadow: 0 0 0 rgba(103, 224, 138, 0)
  50%
    box-shadow: 0 0 0 4px rgba(103, 224, 138, 0.45), 0 0 18px rgba(103, 224, 138, 0.55)

// ─── Landscape phone ────────────────────────────────────────────────────────
//
// Vertical space is the scarce resource: the lane needs the middle band, so the
// HUD's two bars get tighter rather than the canvas getting shorter.
@media (orientation: landscape) and (max-height: 30rem)
  .scene__hint
    margin-top: clamp(0.2rem, 1vw, 0.4rem)

// ─── Short viewport: the result screen gives up its ornament ────────────────
//
// Everything that is decoration rather than information gets smaller or leaves.
// The stage line and the coin total stay full size: they are the two things the
// player actually came to this screen to read.
@media (max-height: 34rem)
  .result
    gap: clamp(0.25rem, 1.2vh, 0.5rem)

  .result__record, .result__relief
    font-size: clamp(0.55rem, 2.4vmin, 0.72rem)

  .result__reward
    // The breathe is a 4.5% scale on a control that is now one row above the
    // action buttons. On a short screen that is close enough to touch them.
    animation: none
</style>
