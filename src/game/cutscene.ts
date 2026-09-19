/**
 * ─── "THREE LEFT" — the intro cutscene, as data ─────────────────────────────
 *
 * The full design lives in `cutscenes.md`; this is the shot list it specifies,
 * in a form the scene can read and a test can run without a canvas.
 *
 * The one idea, restated here because every number below serves it:
 *
 *   THE CUTSCENE IS THE STAGE, FLOWN BACKWARDS.
 *
 * The camera starts on stage 1's boss at `bossY` and falls down the real road
 * to the real start line, past the real props at their real y. When the player
 * then runs forward they are retracing a route they have already been shown —
 * the cage they watch at second five is a cage they reach at about fifty.
 *
 * That is also why this module is pure data over world coordinates rather than
 * a storyboard: the waypoints are positions on a track the game builds, and
 * `strays.test.ts`-style pinning is what stops a re-cut of stage 1 leaving the
 * camera staring at bare lane.
 */

/** The stage the intro flies. Stage 1, and only stage 1. */
export const CUTSCENE_STAGE = 1

export type ShotId = 'boss' | 'road' | 'cage' | 'far' | 'three'

export interface Shot {
  id: ShotId
  /** Milliseconds this shot is on screen, at full length. */
  ms: number
  /** …and in the cut-down. See `CUTSCENE_CUT` and the note on the cage. */
  cutMs: number
  /** Camera world-y at the start of the shot. */
  fromY: number
  /** …and at the end. Equal to `fromY` for a held shot. */
  toY: number
  /**
   * How the camera gets from one to the other.
   *
   *   hold  — it does not move.
   *   push  — linear, and slow enough to read as drift rather than travel.
   *   fly   — accelerate, hold, decelerate hard. The braking is the shot: the
   *           stop is what makes the thing it stops on land.
   *   fall  — already moving when it starts, gains a little, then brakes. Used
   *           once, for the long drop, where an ease-in would waste half a
   *           second pretending the camera was stationary.
   */
  ease: 'hold' | 'push' | 'fly' | 'fall'
}

/**
 * ─── Stage 1's geometry, which these waypoints are ──────────────────────────
 *
 * Read off `buildTrack(1)` rather than estimated — `cutscene.test.ts` asserts
 * every one of them against the built track, so a re-cut fails there instead of
 * shipping a camera that stops at nothing.
 *
 *   arena    352  (`track.arenaY`) — where the fight happens
 *   boss     364  (`track.bossY`) — where it WALKS IN FROM, not where it stands
 *   cage A   230  the 12-HP cage on the left shoulder — the one shot 3 holds on
 *   cage B    98  the 4-HP cage, passed at speed in shot 4
 *   start      0  where the three are standing
 */
/**
 * Where the camera opens — NOT where the boss spawns.
 *
 * The opening shot has to hold two things at once: the crowned one, and the
 * warden cage behind it with the next squad inside. Those sit at the FIGHTING
 * geometry rather than the spawn geometry —
 *
 *   camera   `arenaY + 4`   = 356   (opening; it pushes back to 352)
 *   boss     `arenaY + 3.8` = 355.8 (`BOSS_HOLD_AHEAD`)
 *   cage     `arenaY + 12.8`= 364.8 (`WARDEN_CAGE_LEAD`)
 *
 * — so the shot opens with the monster sitting ON the camera's own row, low in
 * the frame, and the cage well above it, and reads bottom-to-top as the crowd's
 * point of view, a monster, and the thing it is guarding. `bossY` (364) is where
 * the live boss walks IN from: a camera parked up there would show an empty
 * arena with the cage under its feet.
 *
 * The push ENDS at 352 — the arena line — which is the exact camera the real
 * fight uses half a minute later, cage cut by the top edge and all. The last
 * frame of shot 1 is a rehearsal of the frame the player has to earn.
 */
export const CUTSCENE_BOSS_Y = 356
/** The arena line stage 1's fight happens on. Pinned against the built track —
 *  316 until 2026-09-19, when the weapon split (`ARMORY_SPAN`, 36 units) went
 *  in right before stage 1's arena. */
export const CUTSCENE_ARENA_Y = 352
/** The cage itself. `cutscene.test.ts` asserts a cage really is here. */
export const CUTSCENE_CAGE_Y = 230
export const CUTSCENE_START_Y = 0

/**
 * …and where the camera STOPS to look at it, which is not the same number.
 *
 * `worldToScreenY` puts the camera's own y at `CROWD_SCREEN_Y` — 72 % down the
 * screen — because that is where the crowd stands during play. Parking the
 * camera on the cage therefore puts the cage exactly where the player's squad
 * usually is, low and off to one side, and hands the middle of the frame to
 * whatever is ten units further up the road. On stage 1 that is the bank at
 * 240, which is two lit price tags: measured, the first cut of this shot was a
 * cage in the corner and `×1.6` in the centre.
 *
 * Six units short of it lifts the cage to roughly the middle of the frame and
 * takes the bank off the top edge at every viewport the game fits into. The
 * subject of a shot has to be where the eye already is.
 */
export const CUTSCENE_CAGE_CAM_Y = 224

/**
 * The shot list.
 *
 * ⚠ THE CAGE HOLD IS NOT SHORTENED IN THE CUT-DOWN, and that is a design rule
 * rather than an oversight: it is the only shot that has to land emotionally,
 * and the two things emotion needs here are silence and stillness. Everything
 * else in this cutscene is transport.
 */
export const CUTSCENE_SHOTS: readonly Shot[] = [
  // The crowned one, backlit, breathing once. A four-unit push AWAY onto the
  // arena line — the first millimetre of the retreat the whole cutscene is
  // about, and it lands on the fight's own camera. See `CUTSCENE_BOSS_Y`.
  { id: 'boss', ms: 2200, cutMs: 1400, fromY: CUTSCENE_BOSS_Y, toY: CUTSCENE_ARENA_Y, ease: 'push' },
  // A hundred and twenty-eight units at roughly 15x the squad's own run speed,
  // over the stretch where the weapon split stands (drawn as plain road here:
  // the intro's world has no split in it).
  { id: 'road', ms: 1700, cutMs: 1200, fromY: CUTSCENE_ARENA_Y, toY: CUTSCENE_CAGE_CAM_Y, ease: 'fly' },
  // Dead stop. The quietest two seconds in the game.
  { id: 'cage', ms: 2000, cutMs: 2000, fromY: CUTSCENE_CAGE_CAM_Y, toY: CUTSCENE_CAGE_CAM_Y, ease: 'hold' },
  // …and then how far it actually is: 230 units, ~21x run speed, past a second
  // cage that is on screen for a third of a second and needs no longer.
  { id: 'far', ms: 2100, cutMs: 1400, fromY: CUTSCENE_CAGE_CAM_Y, toY: CUTSCENE_START_Y, ease: 'fall' },
  // Three survivors on an empty road, in the exact frame the game will hold for
  // the rest of the session.
  { id: 'three', ms: 1200, cutMs: 400, fromY: CUTSCENE_START_Y, toY: CUTSCENE_START_Y, ease: 'hold' }
] as const

const total = (cut: boolean): number =>
  CUTSCENE_SHOTS.reduce((n, s) => n + (cut ? s.cutMs : s.ms), 0)

/** 9200 ms at full length, 6400 ms cut down. */
export const CUTSCENE_MS = total(false)
export const CUTSCENE_CUT_MS = total(true)

/**
 * ─── The three lines ────────────────────────────────────────────────────────
 *
 * Sixty characters in total, and all three optional: the cutscene is built to
 * work with the sound off and the text stripped.
 *
 * No proper nouns — nothing is named, because naming things is what makes an
 * intro feel like homework — and no mechanics, because the tutorial teaches
 * steering six hundred milliseconds later and this is not the place.
 */
export interface Caption {
  key: string
  /** When it fades in, ms from the first frame. */
  at: number
  /** How long it stays up, fade included. */
  ms: number
}

export const CUTSCENE_CAPTIONS: readonly Caption[] = [
  { key: 'intro.took', at: 600, ms: 1500 },
  { key: 'intro.alive', at: 4400, ms: 1400 },
  { key: 'intro.go', at: 8400, ms: 800 }
] as const

/** Fade in and out of a caption, ms. */
export const CAPTION_FADE = 250

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Accelerate in, brake hard out. */
const easeInOut = (k: number): number =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2

/** Already moving, then brakes. */
const easeOut = (k: number): number => 1 - Math.pow(1 - k, 3)

export interface CutsceneFrame {
  /** Where the camera is, in world units. */
  camY: number
  /** Which shot is on screen. */
  shot: ShotId
  /** 0..1 through that shot — drives the streaks and the sky smear. */
  shotK: number
  /** 0..1 through the whole cutscene. */
  k: number
  /**
   * How fast the camera is travelling, in world units per second, smoothed.
   * The renderer reads it for the motion streaks and for the detail cull, so it
   * is computed here where the easing that produces it lives.
   */
  speed: number
  /** Past the last frame. */
  done: boolean
}

export interface CutsceneOptions {
  /** Use the 6.4 s shot lengths. */
  cut?: boolean
  /**
   * `prefers-reduced-motion`: the camera CUTS between the four positions
   * instead of flying, holding each for its shot's duration. Same story, same
   * timings, no travel.
   */
  reduced?: boolean
}

/**
 * The camera at `tMs`.
 *
 * A pure function of the clock, with no state of its own, so the scene can call
 * it once a frame and a test can call it a thousand times in a loop.
 */
export const cutsceneAt = (tMs: number, opts: CutsceneOptions = {}): CutsceneFrame => {
  const cut = opts.cut === true
  const span = cut ? CUTSCENE_CUT_MS : CUTSCENE_MS
  const t = Math.max(0, tMs)
  if (t >= span) {
    return { camY: CUTSCENE_START_Y, shot: 'three', shotK: 1, k: 1, speed: 0, done: true }
  }

  let acc = 0
  for (const s of CUTSCENE_SHOTS) {
    const ms = cut ? s.cutMs : s.ms
    if (t >= acc + ms) { acc += ms; continue }

    const shotK = ms > 0 ? clamp01((t - acc) / ms) : 1
    const span2 = s.toY - s.fromY

    // Reduced motion: the camera is simply AT the shot's destination for the
    // whole shot. Cutting rather than easing, which is what the setting asks
    // for — and the story is carried by what is on screen, not by the travel.
    if (opts.reduced) {
      return { camY: s.toY, shot: s.id, shotK, k: clamp01(t / span), speed: 0, done: false }
    }

    const e = s.ease === 'hold' ? 1
      : s.ease === 'push' ? shotK
        : s.ease === 'fly' ? easeInOut(shotK)
          : easeOut(shotK)
    const camY = s.fromY + span2 * e

    // Differentiated numerically rather than analytically: four easings would
    // otherwise need four derivatives kept in step with them, and the renderer
    // only wants to know "fast or slow".
    const dt = 16
    const e2 = s.ease === 'hold' ? 1
      : s.ease === 'push' ? clamp01((t + dt - acc) / Math.max(1, ms))
        : s.ease === 'fly' ? easeInOut(clamp01((t + dt - acc) / Math.max(1, ms)))
          : easeOut(clamp01((t + dt - acc) / Math.max(1, ms)))
    const speed = Math.abs((s.fromY + span2 * e2) - camY) * (1000 / dt)

    return { camY, shot: s.id, shotK, k: clamp01(t / span), speed, done: false }
  }

  return { camY: CUTSCENE_START_Y, shot: 'three', shotK: 1, k: 1, speed: 0, done: true }
}

/**
 * A caption's opacity at `tMs`, 0 when it is not its turn.
 *
 * Captions are pinned to the FULL timeline. In the cut-down they are dropped
 * rather than re-timed: three cards over 6.4 s is a card every two seconds, and
 * at that rate they stop being punctuation and start being a slideshow.
 */
export const captionAlpha = (c: Caption, tMs: number): number => {
  const dt = tMs - c.at
  if (dt < 0 || dt > c.ms) return 0
  if (dt < CAPTION_FADE) return clamp01(dt / CAPTION_FADE)
  const outAt = c.ms - CAPTION_FADE
  if (dt > outAt) return clamp01((c.ms - dt) / CAPTION_FADE)
  return 1
}

/**
 * How bright the boss's bloom is at `camY`, 0..1.
 *
 * THE LIGHT RULE, and it is a gradient rather than an asset: the crowned one is
 * the only light source on the road, so the glow shrinks as the camera retreats
 * until, at the start line, it is a single warm point on the horizon — which is
 * exactly where the player is about to run.
 *
 * Never reaches zero. The point of light on the last frame of the cutscene is
 * the first frame of the game, and the player now knows what it is.
 */
export const bloomAt = (camY: number): number => {
  const k = clamp01((camY - CUTSCENE_START_Y) / (CUTSCENE_BOSS_Y - CUTSCENE_START_Y))
  return 0.12 + 0.88 * k * k
}
