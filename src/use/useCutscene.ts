import { computed, ref } from 'vue'
import { getState, setState } from '@/use/useTowerState'
import { BEST_STAGE_KEY, INTRO_SEEN_KEY, STAGE_KEY } from '@/keys'
import {
  CUTSCENE_CUT_MS, CUTSCENE_MS, cutsceneAt, type CutsceneFrame
} from '@/game/cutscene'

/**
 * ─── The intro cutscene's clock and gate ────────────────────────────────────
 *
 * `game/cutscene.ts` says what the camera does; this says whether it happens at
 * all, and holds the one piece of state involved — how far in we are.
 *
 * The design and the reasoning are in `cutscenes.md`. The rule that outranks
 * every other decision in here is on its first page and is worth repeating:
 *
 *   This sits in front of the most-measured ten seconds of the game. It runs
 *   over the live scene, it loads nothing extra, it plays once per player, and
 *   it can be left at any moment.
 */

/** Frames slower than this are a device that cannot fly a camera. */
const STALL_MS = 60
/** …and this long of them ends the cutscene rather than degrading it. */
const STALL_WINDOW_MS = 500
/**
 * …but not from the first frame.
 *
 * The frames either side of the splash are the most expensive of the whole
 * session — sprite strips baking, the first backdrop, the lane tile, the art
 * layer landing — so a stall detector armed at t=0 fires on perfectly healthy
 * hardware and eats the cutscene before it has drawn a shot. Measured in a
 * headless Chrome on a fast desktop: it killed the intro inside 200 ms.
 *
 * So the guard only starts looking once the opening shot is already on screen,
 * which is also the only point from which "is this stuttering" is a question
 * about the device rather than about the boot.
 */
const STALL_GRACE_MS = 900

/** Set once at boot — see `shouldPlayIntro`. */
const armed = ref(false)
/** Ticking, in ms from the first frame. */
const clock = ref(0)
const running = ref(false)
const reduced = ref(false)
const cut = ref(false)
let stalled = 0

/**
 * ─── The splash handshake ───────────────────────────────────────────────────
 *
 * The scene mounts and boots BEHIND the splash, so without this the cutscene
 * spends its first second and a half playing to a screen nobody can see —
 * measured, the opening shot of the crowned one was two-thirds over by the time
 * the wispling had finished saying Boo. The one shot in the game that exists to
 * make a first impression was the one shot being thrown away.
 *
 * So the clock HOLDS on frame one until the splash reports itself gone
 * (`FLogoProgress`, beside `notifySplashGone`). The held frame is the opening
 * composition, fully drawn — so what the player actually sees is the splash
 * fading off a boss that is already standing there, which is a better cut than
 * anything that could have been timed.
 */
let splashGone = false
let held = 0
/**
 * …and it does not wait forever. The splash announces itself from a `watch` on
 * a `done` ref behind a timeout; a build that never reaches that line, or a
 * portal that unmounts the splash some other way, must not leave the game
 * frozen on a picture of a monster. Two and a half seconds is past every
 * measured splash and still short enough not to read as a hang.
 */
const SPLASH_WAIT_MAX_MS = 2500

/** The splash is off screen — the cutscene may start moving. */
export const notifyIntroReady = (): void => { splashGone = true }

/**
 * ─── …and the handshake in the other direction ──────────────────────────────
 *
 * `notifyIntroReady` is the splash telling the cutscene it may start. This is
 * the cutscene telling the splash it may LEAVE, and it exists because the two
 * are not the same question.
 *
 * The road is built behind the splash (`primeCutsceneWorld`) and the sprite
 * strips are baked behind it too (`useAssets`), but neither is the whole cost of
 * the first frames. Everything the renderer rasterises is sized to `scale`,
 * which does not exist until the scene has mounted and measured the viewport:
 * the lane tile, the backdrop texture, the gradient ramps each prop caches by
 * its own radius, and the cutscene's boss — a prop built at `scale: 4.4`, nearly
 * twice the size of anything the road will ever put on screen again. All of it
 * used to land on the first shots of the flight, which is exactly where it
 * cannot: shot 2 covers ninety units of road in 1.7 s and every cache miss in
 * it is a dropped frame on a phone.
 *
 * So the scene pre-draws the entire camera path before the splash goes (see
 * `warmIntro` in `GameScene.vue`) and calls this when it is done. The splash
 * holds for it.
 *
 * ⚠ It gates on `armed`, so a RETURNING player is charged nothing: `introHolds`
 * is false the moment `armIntro()` says there is no cutscene, and the splash
 * closes exactly as it did before this existed. A first-time boot is the only
 * boot that pays, and it is the only boot that gets anything for it.
 */
const warm = ref(false)

/** Is the splash still waiting on the cutscene's pre-render? */
export const introHoldsSplash = computed(() => armed.value && !warm.value)

/** The camera path has been drawn end to end; the splash may go. */
export const notifyIntroWarm = (): void => { warm.value = true }

/**
 * Is this a first-time player?
 *
 * THREE tests, and each one closes a hole the others leave open:
 *
 *   • the intro's own key — they have seen it, even if they closed the tab
 *     four seconds in;
 *   • `BEST_STAGE_KEY` — a cloud save that landed after boot, or a player
 *     whose local storage was cleared but whose portal account remembers them.
 *     Somebody on stage 20 must never be shown a stage-1 intro;
 *   • `STAGE_KEY` — the resumable run. A player mid-career on stage 7 is not
 *     new, whatever the other two say.
 *
 * Read through `getState` rather than `localStorage`, so a cloud hydrate that
 * has already folded into the blob counts.
 */
export const isFirstTimePlayer = (): boolean => {
  if (getState<boolean>(INTRO_SEEN_KEY, false) === true) return false
  if ((Number(getState(BEST_STAGE_KEY, 0)) || 0) > 0) return false
  if ((Number(getState(STAGE_KEY, 1)) || 1) > 1) return false
  return true
}

/**
 * Decide, once, whether this boot opens on the cutscene.
 *
 * Called from the loader (see `useAssets.preloadAssets`), because the answer is
 * also the answer to "do we spend loading time building the cutscene's road" —
 * and a returning player must be charged nothing at all for a feature they will
 * never see.
 */
export const armIntro = (): boolean => {
  armed.value = isFirstTimePlayer()
  return armed.value
}

export const introArmed = computed(() => armed.value)

/**
 * Start it. Returns false when there is nothing to start, so the scene can fall
 * straight through to the tutorial on the same frame.
 */
export const beginIntro = (opts: { reduced?: boolean; cut?: boolean } = {}): boolean => {
  if (!armed.value) return false
  reduced.value = opts.reduced === true
  cut.value = opts.cut === true
  clock.value = 0
  stalled = 0
  held = 0
  running.value = true
  // Written on the FIRST frame rather than the last. See `INTRO_SEEN_KEY`.
  setState(INTRO_SEEN_KEY, true)
  return true
}

/**
 * Advance the clock and hand back the camera for this frame.
 *
 * `dtMs` is wall time, clamped: a tab that was hidden for ten seconds comes
 * back with a vast delta, and a cutscene that jumped six shots on the frame the
 * player returned would be one they never saw. Clamping is also what makes
 * "pause on hide, resume on return" fall out for free.
 */
export const stepIntro = (dtMs: number): CutsceneFrame => {
  const dt = Math.max(0, Math.min(50, dtMs))

  // Held on the opening composition until the splash is out of the way. The
  // frame is drawn for real the whole time, which is what makes the handover a
  // reveal rather than a start.
  if (running.value && !splashGone) {
    held += dt
    if (held < SPLASH_WAIT_MAX_MS) {
      return cutsceneAt(0, { reduced: reduced.value, cut: cut.value })
    }
    splashGone = true
  }

  // A device that cannot hold a frame cannot fly a camera, and a stuttering
  // intro is worse than none — so this is ABANDONED rather than degraded.
  // Not while the boot is still settling, though: see `STALL_GRACE_MS`.
  if (clock.value > STALL_GRACE_MS) {
    if (dtMs > STALL_MS) stalled += dtMs
    else stalled = Math.max(0, stalled - dt)
    if (stalled > STALL_WINDOW_MS) endIntro()
  }

  if (running.value) clock.value += dt
  const f = cutsceneAt(clock.value, { reduced: reduced.value, cut: cut.value })
  if (f.done) running.value = false
  return f
}

/** Leave it — the skip button, or the last frame running out. */
export const endIntro = (): void => {
  running.value = false
  clock.value = cut.value ? CUTSCENE_CUT_MS : CUTSCENE_MS
  armed.value = false
}

export const introRunning = computed(() => running.value)
export const introClock = computed(() => clock.value)

/** Test seam: forget that this player has seen it. */
export const __resetIntro = (): void => {
  armed.value = false
  running.value = false
  clock.value = 0
  stalled = 0
  warm.value = false
  splashGone = false
  held = 0
}
