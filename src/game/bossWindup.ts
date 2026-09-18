// ─── Every attack starts from the body ──────────────────────────────────────
//
// Playtests kept reporting the same thing about the boss: the meteor "comes
// from nowhere". The ground tells were all there — a ring, a wedge, a band —
// but the player's eyes are on the BOSS, and the boss stood there playing its
// walk cycle while a rock appeared out of the top of the screen. A tell on the
// floor answers "where"; only the body can answer "what is it about to do".
//
// So every boss wind-up now has a POSE: the body rears, coils, rises or raises
// its arms over the same seconds the ground tell counts down, and the meteor is
// no longer dropped from the sky — the boss gathers it over its head and hurls
// it, and it flies on an arc from the hands to the mark.
//
// The meteor is the exception to the pose: its body is DRAWN throwing — the
// arms scoop the rock up, cock it back and hurl it (`monsterKit` "Hurling",
// painted per boss as `artSheet.BOSS_HURLS`) — and `meteorHurlPanel` says which
// panel of that throw shows when. Its pose here is rest: the first version
// reared and snapped the walk frame with a squash and a stretch, and the owner
// read it, rightly, as the boss being distorted rather than throwing anything.
//
// This file is the pure half: the pose curves, the throw's panels and the
// throw's arc, as functions of the cast's own progress. The renderer applies them. Nothing here reads a
// clock or touches the simulation, and nothing here may move a hit: every curve
// is a function of `p = t / life`, and `life` is the exact time to impact the
// simulation handed the cast, so the throw still lands on the beat.

import { HURL_KEYS, HURL_RELEASE_PANEL } from '@/game/monsterKit'

/** Which wind-up the body is performing. */
export type WindupKind = 'meteor' | 'shock' | 'charge' | 'rake' | 'heal' | 'bolt' | 'summon' | 'drain'

/**
 * A body pose, applied around the FEET.
 *
 * Every length is in BODY SIZES (the renderer's `size`), so one curve fits a
 * stage-1 boss and a stage-90 one alike.
 */
export interface BossPose {
  /** Tilt around the feet, radians. Positive leans toward screen-right. */
  lean: number
  /** Scale around the feet: `sy > 1` is a stretch upward, `< 1` a squash. */
  sx: number
  sy: number
  /** Lifted off the ground, body sizes, screen-up. The shadow stays put. */
  lift: number
  /** Pushed toward the camera (down the screen), body sizes. A lunge. */
  dip: number
  /** Tremble amplitude, body sizes. */
  shake: number
  /** 0..1, how hot the attack's own glow burns on the body. */
  glow: number
}

export const REST_POSE: Readonly<BossPose> = Object.freeze({
  lean: 0, sx: 1, sy: 1, lift: 0, dip: 0, shake: 0, glow: 0
})

/**
 * The share of a meteor's wind-up spent GATHERING the rock over the boss's
 * head, before the throw.
 *
 * The rest is flight. Not a half: a rock that hangs over the head for half a
 * second reads as a decoration, and the flight is the part that carries the
 * eye from the boss down to the mark — it needs most of the window to be
 * followed by somebody who was looking at the boss when it started. At the
 * ordinary 1.0 s wind-up that is 0.38 s of gather and 0.62 s in the air.
 */
export const METEOR_RELEASE = 0.38

/**
 * Where inside their wind-ups the other strikes turn, as a share of the pose's
 * span. Named, not literal, because two things read them: `bossPose`, which
 * turns the body there, and `windupBeats`, which puts a SOUND there — and a
 * stomp you hear a frame before you see it is a stomp that reads as lag.
 */
export const SHOCK_DROP_AT = 0.9
export const RAKE_STRIKE_AT = 0.85
export const BOLT_THRUST_AT = 0.82
/** The heal's gather: the arms are fully up this far through the cast. */
export const HEAL_GATHER_AT = 0.7
/**
 * The drain's reach: the healer gathers with its arms up for this much of the
 * wind-up and then throws them forward, down the column, as the beam lands. The
 * sound's second beat sits at the END of the cast rather than here — the reach
 * is the body committing, the beam is the hit — so the ear hears the pull on
 * exactly the frame the bodies start to go.
 */
export const DRAIN_REACH_AT = 0.8

/**
 * How much of the rock's flight the throw's follow-through takes — the panels
 * after the release. Short of the whole flight on purpose: the body is back at
 * rest, walking, while the rock is still in the air, so the player's eye has
 * nothing left on the boss to hold it and follows the rock down to the mark.
 */
export const HURL_FOLLOW_SHARE = 0.6

/**
 * Which panel of the boss's drawn throw shows at meteor progress `p` (0 at the
 * cast, 1 at the impact), or null once the follow-through is over and the body
 * is back on its walk.
 *
 * The gather plays the panels before the release (`HURL_RELEASE_PANEL`) over
 * exactly `METEOR_RELEASE` of the cast, so the release panel arrives on the
 * frame the rock leaves the hand — the frame `drawCasts` latches its flight
 * from, and the frame the `hurl` sound fires on (`windupBeats`). The rest play
 * over `HURL_FOLLOW_SHARE` of the flight. At the ordinary 1.0 s wind-up that is
 * about 95 ms a panel on either side of the release — one steady beat.
 */
export const meteorHurlPanel = (p: number): number | null => {
  const k = clamp01(p)
  if (k < METEOR_RELEASE) {
    return Math.min(HURL_RELEASE_PANEL - 1, Math.floor((k / METEOR_RELEASE) * HURL_RELEASE_PANEL))
  }
  const w = (k - METEOR_RELEASE) / (1 - METEOR_RELEASE)
  const after = HURL_KEYS - HURL_RELEASE_PANEL
  const i = Math.floor((w / HURL_FOLLOW_SHARE) * after)
  return i < after ? HURL_RELEASE_PANEL + i : null
}

/** How long a pose takes to settle after its impact, seconds. Matches the
 *  renderer's `CAST_AFTER_S`, the window a landed cast is still on the road. */
export const POSE_AFTER_S = 0.22

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v: number): number => {
  const k = clamp01(v)
  return k * k * (3 - 2 * k)
}
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k

const pose = (over: Partial<BossPose>): BossPose => ({ ...REST_POSE, ...over })

/** Blend two poses, `k` = 0 → `a`, 1 → `b`. */
export const mixPose = (a: BossPose, b: BossPose, k: number): BossPose => ({
  lean: lerp(a.lean, b.lean, k),
  sx: lerp(a.sx, b.sx, k),
  sy: lerp(a.sy, b.sy, k),
  lift: lerp(a.lift, b.lift, k),
  dip: lerp(a.dip, b.dip, k),
  shake: lerp(a.shake, b.shake, k),
  glow: lerp(a.glow, b.glow, k)
})

/**
 * Where in the lane the charge's dash starts, as a share of its wind-up.
 *
 * The simulation moves the body for the last `dashS` seconds only (see
 * `stepBossCharge`); everything before that is the coil.
 */
export const chargeDashAt = (life: number, dashS: number): number =>
  life <= 0 ? 0 : clamp01(1 - dashS / life)

export interface PoseOpts {
  /** −1 or +1: which side of the boss the attack is going to. */
  side?: number
  /** A charged (big) meteor — every amplitude is larger. */
  charged?: boolean
  /** Seconds since the attack landed; 0 while it is still winding up. */
  after?: number
  /** The cast's whole wind-up, seconds. Only the charge needs it. */
  life?: number
  /** The charge's dash length, seconds. */
  dashS?: number
  /** A drain whose beam is ON — the body holds the reach and trembles with it
   *  for as long as the beam pulls, rather than settling as a landed strike
   *  does. */
  holding?: boolean
}

/**
 * The body's pose for wind-up `kind` at progress `p` (0 at the cast, 1 at the
 * impact). Returns to `REST_POSE` by the end of `POSE_AFTER_S`, so a cast that
 * is dropped from its pool never leaves the body frozen mid-strike.
 */
export const bossPose = (kind: WindupKind, p: number, o: PoseOpts = {}): BossPose => {
  const side = (o.side ?? 1) < 0 ? -1 : 1
  const after = Math.max(0, o.after ?? 0)
  const settle = smooth(after / POSE_AFTER_S)
  const k = clamp01(p)

  switch (kind) {
    case 'meteor':
      // Rest: the throw is in the drawing (`meteorHurlPanel`), and the body
      // is never stretched, squashed or tilted on top of it.
      return pose({})

    case 'shock': {
      // Rise, hang, and stomp: the body lands on the frame the ring does.
      const risen = pose({ sy: 1.12, sx: 0.94, lift: 0.22, glow: 1 })
      const landed = pose({ sy: 0.8, sx: 1.16, glow: 0.4 })
      if (after > 0) return mixPose(landed, REST_POSE, settle)
      if (k < 0.8) return mixPose(REST_POSE, risen, smooth(k / 0.8))
      if (k < SHOCK_DROP_AT) return { ...risen, shake: 0.012 }
      // Accelerating drop — a stomp, not a sit-down.
      const d = (k - SHOCK_DROP_AT) / (1 - SHOCK_DROP_AT)
      return mixPose(risen, landed, d * d)
    }

    case 'charge': {
      const at = chargeDashAt(o.life ?? 1, o.dashS ?? 0)
      const coiled = pose({ sy: 0.82, sx: 1.14, dip: -0.03, glow: 1 })
      const running = pose({ sy: 1.14, sx: 0.9, glow: 1 })
      if (after > 0) return mixPose(pose({ sy: 0.88, sx: 1.1, glow: 0.5 }), REST_POSE, settle)
      if (at <= 0 || k >= at) {
        // The dash itself: stretched along the run, flat out.
        const d = at >= 1 ? 1 : clamp01((k - at) / Math.max(0.001, 1 - at))
        return mixPose(coiled, running, smooth(d * 3))
      }
      const c = smooth(k / at)
      const out = mixPose(REST_POSE, coiled, c)
      // The tremble GROWS — the one element that says "about to go" without a
      // number, the same job the bomb's quickening pulse does.
      out.shake = 0.025 * c * c
      return out
    }

    case 'rake': {
      // Claws up and to one side, then across.
      const raised = pose({ lean: -0.18 * side, sy: 1.09, sx: 0.96, lift: 0.04, glow: 1 })
      const struck = pose({ lean: 0.17 * side, sy: 0.9, sx: 1.08, dip: 0.07, glow: 0.3 })
      if (after > 0) return mixPose(struck, REST_POSE, settle)
      if (k < RAKE_STRIKE_AT) return mixPose(REST_POSE, raised, smooth(k / RAKE_STRIKE_AT))
      return mixPose(raised, struck, smooth((k - RAKE_STRIKE_AT) / (1 - RAKE_STRIKE_AT)))
    }

    case 'heal': {
      // Arms raised, gathering. No strike — a heal lands on the boss itself.
      const g = smooth(k / HEAL_GATHER_AT)
      const out = mixPose(REST_POSE, pose({ sy: 1.09, sx: 0.96, lift: 0.05, glow: 1 }), g)
      if (after > 0) return mixPose(out, REST_POSE, settle)
      return out
    }

    case 'bolt': {
      // Draw back, then thrust the round out.
      const drawn = pose({ sy: 1.06, sx: 0.97, lift: 0.03, dip: -0.02, glow: 1 })
      const thrust = pose({ sy: 0.94, sx: 1.05, dip: 0.07, glow: 0.3 })
      if (after > 0) return mixPose(thrust, REST_POSE, settle)
      if (k < BOLT_THRUST_AT) return mixPose(REST_POSE, drawn, smooth(k / BOLT_THRUST_AT))
      return mixPose(drawn, thrust, smooth((k - BOLT_THRUST_AT) / (1 - BOLT_THRUST_AT)))
    }

    case 'drain': {
      // Arms up and back, gathering; then thrown forward and DOWN the column —
      // the body reaching for the crowd it is about to pull. A lunge toward the
      // camera (`dip`) rather than a lean to one side, because the column comes
      // straight down the road from the boss and the reach has to point along it.
      const gathered = pose({ lean: -0.06 * side, sy: 1.12, sx: 0.95, lift: 0.06, glow: 1 })
      const reaching = pose({ sy: 0.93, sx: 1.07, dip: 0.12, glow: 1 })
      if (o.holding) {
        // The beam is on: hold the reach, and let it shake — the pull is work.
        const out = { ...reaching }
        out.shake = 0.014
        return out
      }
      if (after > 0) return mixPose(reaching, REST_POSE, settle)
      if (k < DRAIN_REACH_AT) {
        const g = smooth(k / DRAIN_REACH_AT)
        const out = mixPose(REST_POSE, gathered, g)
        // The tremble grows into the reach, like the charge's coil.
        out.shake = 0.018 * g * g
        return out
      }
      return mixPose(gathered, reaching, smooth((k - DRAIN_REACH_AT) / (1 - DRAIN_REACH_AT)))
    }

    case 'summon': {
      // Arms up over the road, then brought down as the ground opens.
      const called = pose({ sy: 1.1, sx: 0.95, lift: 0.05, glow: 1 })
      if (after > 0) return mixPose(pose({ sy: 0.88, sx: 1.08, glow: 0.3 }), REST_POSE, settle)
      const out = mixPose(REST_POSE, called, smooth(k))
      out.shake = 0.008 * smooth(k)
      return out
    }
  }
}

/**
 * Where the thrown rock is, `u` of the way through its flight (0 at the hands,
 * 1 on the mark), on a parabola that rises `arc` px above the straight line.
 * Screen space. Also returns the velocity direction, so the rock's flame can
 * trail behind it.
 */
export const hurlPoint = (
  u: number, fromX: number, fromY: number, toX: number, toY: number, arc: number
): { x: number; y: number; dx: number; dy: number } => {
  const k = clamp01(u)
  return {
    x: fromX + (toX - fromX) * k,
    y: fromY + (toY - fromY) * k - 4 * arc * k * (1 - k),
    dx: toX - fromX,
    dy: toY - fromY - 4 * arc * (1 - 2 * k)
  }
}

/**
 * How high the throw may arc, px, so its apex stays at or below `topY`.
 *
 * `want` is the arc asked for. The boss stands near the top of the view, so a
 * full lob would leave the screen and the player would lose the rock at the
 * one moment it is travelling toward them; the arc is flattened instead.
 */
export const hurlArc = (fromY: number, toY: number, want: number, topY: number): number => {
  const d = toY - fromY
  let arc = Math.max(0, want)
  // The apex of y(u) = fromY + d·u − 4a·u(1−u), when it lies inside the flight.
  const apex = (a: number): number => {
    if (a <= 0 || 4 * a <= d) return Math.min(fromY, toY)
    const u = (1 - d / (4 * a)) / 2
    return fromY + d * u - 4 * a * u * (1 - u)
  }
  for (let i = 0; i < 12 && arc > 0 && apex(arc) < topY; i++) arc *= 0.75
  return apex(arc) < topY ? 0 : arc
}

// ─── …and the wind-up you can HEAR ──────────────────────────────────────────
//
// The pose answers "what is it about to do" for a player looking at the boss.
// A player steering with their thumb is looking at their thumb, so every
// wind-up also has a sound — and a sound that marks a MOMENT (the rock leaving
// the hand, the dash launching, the stomp starting to fall) has to land on the
// frame the body does it, or the ear teaches the wrong beat.
//
// So the sounds are BEATS on the cast's own clock, not timers: each is a point
// in the cast's seconds (`atS`), and the renderer fires every beat its
// sim-stepped `t` has crossed (`advanceBeats`). A frozen cast (Frost Nova)
// does not advance, so it does not fire; a boss that dies takes its pool, and
// its unfired beats, with it. The continuous textures (the gather, the coil)
// are beats too — at `atS = 0` — with their own length handed over in
// `seconds`, so they end where their pose does.

/** Every sound a wind-up makes. The renderer maps each to a synthesised cue. */
export type WindupCue =
  | 'gather' | 'hurl'
  | 'coil' | 'dash'
  | 'rise' | 'drop'
  | 'whet' | 'strike'
  | 'heal'
  | 'charge' | 'zap'
  | 'call'
  | 'siphon' | 'drain'

export interface WindupBeat {
  /** When, in the cast's own seconds. */
  readonly atS: number
  readonly cue: WindupCue
  /** How long the thing the cue describes lasts, seconds — a gather's length,
   *  a rock's flight. The synth fits its envelope to it. */
  readonly seconds: number
}

export interface BeatOpts {
  /** The charge's dash, seconds (`CHARGE_DASH_S`). */
  dashS?: number
  /** How much of a rake's life its claws are up for (the renderer's
   *  `RAKE_POSE_S`) — a crossrake's second pass raises late. */
  raiseS?: number
  /** How long a drain's beam holds once it lands (`DRAIN_HOLD_S`) — the length
   *  the pull's own sound is fitted to. */
  holdS?: number
}

/**
 * The beats of one wind-up of `life` seconds, in firing order.
 *
 * Built ONCE per cast, when it is pushed into its pool: it depends only on the
 * kind and the life, both fixed at the cast.
 */
export const windupBeats = (kind: WindupKind, life: number, o: BeatOpts = {}): WindupBeat[] => {
  const L = Math.max(0, life)
  switch (kind) {
    case 'meteor': {
      const at = L * METEOR_RELEASE
      return [
        { atS: 0, cue: 'gather', seconds: at },
        { atS: at, cue: 'hurl', seconds: L - at }
      ]
    }
    case 'shock': {
      const at = L * SHOCK_DROP_AT
      return [
        { atS: 0, cue: 'rise', seconds: at },
        { atS: at, cue: 'drop', seconds: L - at }
      ]
    }
    case 'charge': {
      const at = L * chargeDashAt(L, o.dashS ?? 0)
      return [
        { atS: 0, cue: 'coil', seconds: at },
        { atS: at, cue: 'dash', seconds: L - at }
      ]
    }
    case 'rake': {
      const span = Math.min(L, Math.max(0, o.raiseS ?? L))
      const up = L - span
      const at = L - span * (1 - RAKE_STRIKE_AT)
      return [
        { atS: up, cue: 'whet', seconds: at - up },
        { atS: at, cue: 'strike', seconds: L - at }
      ]
    }
    case 'heal':
      return [{ atS: 0, cue: 'heal', seconds: L * HEAL_GATHER_AT }]
    case 'bolt':
      // The round leaves at the END of the cast — the thrust pose is the
      // follow-through of a throw that happens on `t = life`.
      return [
        { atS: 0, cue: 'charge', seconds: L * BOLT_THRUST_AT },
        { atS: L, cue: 'zap', seconds: 0 }
      ]
    case 'summon':
      return [{ atS: 0, cue: 'call', seconds: L }]
    case 'drain':
      // The gather under the raised arms, and then the pull ON the beat — the
      // one wind-up whose second sound is not an impact but a sustained thing,
      // fitted to the hold, so the player hears exactly how long the beam is
      // still taking bodies.
      return [
        { atS: 0, cue: 'siphon', seconds: L * DRAIN_REACH_AT },
        { atS: L, cue: 'drain', seconds: Math.max(0, o.holdS ?? 0) }
      ]
  }
}

/**
 * Fire every beat `t` has reached, from `next` on, and return the new `next`.
 *
 * The index is the whole guarantee: it only ever moves forward, so a beat fires
 * exactly once however the frames fall — a long frame that jumps two beats
 * fires both, in order, and a frame that does not move `t` fires nothing.
 */
export const advanceBeats = (
  beats: readonly WindupBeat[], next: number, t: number, fire: (beat: WindupBeat) => void
): number => {
  let i = next
  while (i < beats.length && t >= beats[i]!.atS) {
    fire(beats[i]!)
    i++
  }
  return i
}
