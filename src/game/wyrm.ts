import { CROWD_MAX_R, LANE_HALF } from '@/game/survival'

// ─── The Wyrm: the boss that punishes standing still ────────────────────────
//
// Stage 3 used to be the meteor boss for the third time running. Stages 1 and 2
// are the tutorial and have to be the same fight twice — the whole argument in
// `bossDesign` is that a player should meet a silhouette before it is the thing
// at the end of the road — but by stage 3 the player has beaten that fight
// twice already, and a third rehearsal is where a session that was going to
// continue quietly stops.
//
// So stage 3 gets a fight the player has never seen, and it is built on the one
// question the meteor pool never asks.
//
//   the METEOR asks "are you where you were" — it locks a mark and lands there,
//   and the answer is one move, made once, in the second the ring is drawn.
//   the WYRM asks "are you still moving" — every one of its three attacks is
//   answered by a crowd already in motion and eaten by a crowd that stopped.
//
// That is the whole design, and the three attacks are three different ways of
// asking it:
//
//   BREATH   a jet of fire crossing the road in four timed flare-ups. Between
//            them the road is dark and crossable. Answer: keep moving, and time
//            the crossing between the flames.
//   SPINES   bone spikes erupt across the whole road but one gap, and the gap
//            is never where the crowd is standing. Answer: one committed move,
//            read off the ground during the wind-up.
//   EMBERSPIT  three gouts, each aimed FRESH at where the crowd is when it is
//            spat. Answer: drift, and keep drifting — the only attack in the
//            game that a crowd standing still eats in full three times over.
//
// ── Everything here is pure, and that is load-bearing ──
//
// The simulation bills the damage, the renderer paints the warning, and a
// telegraph drawn from anything but the numbers the kill is measured against is
// the one lie this game will not tell (`FxEvent`'s `shockCast` note). Both read
// the geometry out of this file, so there is exactly one definition of where
// the fire is and when it is lit — and the specs can measure the fight without
// mounting a canvas or stepping a frame.
//
// ── The prices ──
//
// Each of the three carries ONE budget across however many beats it has — the
// crossrake's rule — so a player who eats every flare pays the attack once and
// a player who eats one pays a quarter of it. More to dodge, not more to lose.
//
// The spines and the spit are priced at exactly one swing (`bossHitShare`), the
// rule every boss verb in the game signs. The breath is the one exception and
// it is an owner call — see `WYRM_BREATH_SHARE_MUL`.

/**
 * The crowd's own half-width, which is what every safe gap here is measured
 * against. Derived rather than restated: `CROWD_MAX_R` is the radius the
 * formation is capped at, so a gap that fits `2 × CROWD_MAX_R` fits the crowd
 * at its widest, and a gap authored as a literal stops fitting the day the
 * formation grows.
 */
const CROWD_W = CROWD_MAX_R * 2

// ─── The breath ─────────────────────────────────────────────────────────────

/** Flare-ups in one sweep. Four across a nine-unit road is a flame every 2.4
 *  units — close enough that the road is genuinely crossed, few enough that the
 *  dark gaps between them are long enough to cross it in. */
export const WYRM_FLARES = 4

/** How long one flare-up burns. */
export const WYRM_FLARE_S = 0.26

/**
 * Flare to flare, start to start. `WYRM_FLARE_GAP − WYRM_FLARE_S` = 0.30 s of
 * DARK between one going out and the next lighting, and that number is the
 * whole attack: the crowd steers on a spring of `STEER_SPRING` = 13, so a flick
 * of the thumb covers 1 − e^(−13 × 0.30) = 98 % of any distance inside one dark
 * window. The dodge is therefore demanding but never a coin flip — it asks the
 * player to move on a beat, which is exactly the skill the fight is teaching.
 */
export const WYRM_FLARE_GAP = 0.56

/** The whole sweep, from the first flare lighting to the last going out. */
export const WYRM_SWEEP_S = (WYRM_FLARES - 1) * WYRM_FLARE_GAP + WYRM_FLARE_S

/**
 * Half-width of the burning column, and it is NARROW on purpose.
 *
 * A flame 2.0 units across against a crowd 3.3 across means the crowd cannot
 * clear it by standing still anywhere on a 9-unit road — 2 + 3.3 = 5.3 units of
 * clearance needed on either side of a flame that is never more than 3.55 from
 * the middle. Widen it and the attack stops having an answer; narrow it and the
 * crowd walks through the fire. The graze is intended: a player who keeps
 * moving loses a straggler or two to the edge of a flame and pays a fraction of
 * the one swing the whole sweep is priced at.
 */
export const WYRM_FLAME_HALF_W = 1.0

/** …and how far the fire reaches up and down the road. Deep enough to cover a
 *  crowd that is not perfectly abreast, so the answer is lateral and never
 *  "stand behind your own front rank". */
export const WYRM_FLAME_HALF_D = 2.1

/** How far from the middle the outermost flare lands. Inside the rail by a body
 *  width, so the last flare of a sweep is a wall the crowd can be pinned
 *  against rather than one it can hide behind. */
export const WYRM_SWEEP_EDGE = LANE_HALF - 0.95

/**
 * Which way the sweep travels: −1 is the signature right-to-left.
 *
 * It always STARTS on the far side from the crowd and sweeps TOWARD it, and
 * that single rule is what makes the attack teachable:
 *
 *   • the first flare is always free. It lights on the empty side of the road,
 *     which is where a player looks when they have been told "fire, over there"
 *     — and it costs them nothing, so they get to learn what it is by watching
 *     it rather than by dying to it.
 *   • the pressure RISES. Each flare lands nearer than the last, so the attack
 *     has a shape the player feels without being told, and the last one lands
 *     exactly where they were standing when it started.
 *   • the answer is always the same move. Cross behind the flame, through the
 *     ground that has already burned, in one of the dark windows.
 *
 * A crowd in the middle of the road gets the signature: right to left.
 */
export const wyrmSweepDir = (crowdX: number): -1 | 1 => (crowdX > 0.05 ? 1 : -1)

/** Where flare `i` of a sweep travelling `dir` lands. `i` = 0 is the first, on
 *  the far side from the crowd; `WYRM_FLARES − 1` is the last, on its side. */
export const wyrmFlareX = (i: number, dir: number): number => {
  const span = (2 * WYRM_SWEEP_EDGE) / (WYRM_FLARES - 1)
  return (dir < 0 ? 1 : -1) * (WYRM_SWEEP_EDGE - i * span)
}

/** When flare `i` lights, in the sweep's own seconds. */
export const wyrmFlareAt = (i: number): number => i * WYRM_FLARE_GAP

/** Is flare `i` burning `t` seconds into the sweep? */
export const wyrmFlareLive = (i: number, t: number): boolean =>
  t >= wyrmFlareAt(i) && t < wyrmFlareAt(i) + WYRM_FLARE_S

/**
 * Is this offset from a flare's centre inside the fire?
 *
 * The one definition. The renderer paints this rectangle and the simulation
 * kills inside it, so the flame cannot be a hair wider than the thing that
 * burns — see the header.
 */
export const inWyrmFlame = (dx: number, dy: number): boolean =>
  Math.abs(dx) <= WYRM_FLAME_HALF_W && Math.abs(dy) <= WYRM_FLAME_HALF_D

// ─── The spines ─────────────────────────────────────────────────────────────

/**
 * Half-width of the one gap in the wall of spikes.
 *
 * `CROWD_MAX_R` plus half a unit of slack on each side: the whole crowd fits,
 * with room to be a little off-centre, which is what makes the attack a
 * decision rather than a precision test. Derived from the formation's own cap
 * so it cannot silently stop fitting.
 */
export const WYRM_GAP_HALF = CROWD_MAX_R + 0.55

/** How deep the row of spikes is, up and down the road. */
export const WYRM_SPINE_HALF_D = 1.5

/**
 * How far the gap opens from where the crowd is standing.
 *
 * A gap that opened under the crowd would be an attack answered by doing
 * nothing, and the wyrm's whole thesis is that nothing is the wrong answer. Far
 * enough to be a real move on a full wind-up (`SLAM_TELEGRAPH` = 1.0 s is
 * plenty for 2.5-3 units at `STEER_SPRING`), never so far that the crowd cannot
 * reach it: the road is 9 wide and the clamp below keeps the gap on it.
 */
export const WYRM_GAP_SHIFT = 3.0

/**
 * Where the gap in the wall opens, given where the crowd is standing.
 *
 * Away from the crowd — the far side of the road when it is anywhere off
 * centre, and a fixed shift when it is in the middle. Clamped so the whole gap
 * is on the road: a gap half off the rail is a gap the crowd cannot fit in, and
 * it would turn the one attack with a clean answer into one with none.
 */
export const wyrmGapX = (crowdX: number): number => {
  const side = crowdX > 0 ? -1 : 1
  const edge = LANE_HALF - WYRM_GAP_HALF
  return Math.max(-edge, Math.min(edge, crowdX + side * WYRM_GAP_SHIFT))
}

/** Is this survivor in the spikes? Everything in the row burns except the gap. */
export const inWyrmSpines = (x: number, y: number, gapX: number, rowY: number): boolean =>
  Math.abs(y - rowY) <= WYRM_SPINE_HALF_D && Math.abs(x - gapX) > WYRM_GAP_HALF

/**
 * Where the spikes actually stand, for the renderer and for the specs: the two
 * runs of road on either side of the gap, as `[from, to]` pairs. Empty when a
 * side is entirely gap, which the clamp above makes impossible but which is
 * cheaper to answer than to argue about.
 */
export const wyrmSpineRuns = (gapX: number): Array<[number, number]> => {
  const runs: Array<[number, number]> = []
  if (gapX - WYRM_GAP_HALF > -LANE_HALF) runs.push([-LANE_HALF, gapX - WYRM_GAP_HALF])
  if (gapX + WYRM_GAP_HALF < LANE_HALF) runs.push([gapX + WYRM_GAP_HALF, LANE_HALF])
  return runs
}

// ─── The emberspit ──────────────────────────────────────────────────────────

/** Gouts in one spit. */
export const WYRM_SPITS = 3

/**
 * Landing to landing, and it MUST be at least `WYRM_SPIT_LEAD`.
 *
 * That inequality is the attack. A gout is aimed one lead before it lands, so a
 * gap shorter than the lead means gout `i + 1` is aimed while gout `i` is still
 * in the air — at a crowd that has not yet had to answer anything — and three
 * gouts aimed at one position is one attack with three landings rather than
 * three questions. Measured at 0.44 s against a 0.55 s lead, the first two were
 * marked on the same frame, at the same spot.
 *
 * `wyrmSpitAimAt` is where that shows, and `tests/game/wyrm.test.ts` pins it.
 */
export const WYRM_SPIT_GAP = 0.6

/**
 * How long before a gout lands it is aimed and marked.
 *
 * Short — this is the one attack in the fight that is read on reflex rather
 * than on a beat, and its whole point is that the mark chases. Long enough to
 * be a real warning (`SLAM_TELEGRAPH`'s note measures a median human at 250 ms,
 * so half a second leaves 250 ms of travel), short enough that a crowd which
 * stopped is still under it when it lands, and never longer than the gap
 * between two gouts — see `WYRM_SPIT_GAP`.
 */
export const WYRM_SPIT_LEAD = 0.5

/** How big one gout is where it lands. Half a ring: three of them share one
 *  swing, so each is a bite rather than a blow. */
export const WYRM_SPIT_R = 1.5

/** When gout `i` lands, in the spit's own seconds (gout 0 lands on the cast's
 *  own beat, so the attack starts on the frame the wind-up promised). */
export const wyrmSpitAt = (i: number): number => i * WYRM_SPIT_GAP

/** …and when it is aimed, which is when its mark goes on the road. */
export const wyrmSpitAimAt = (i: number): number => wyrmSpitAt(i) - WYRM_SPIT_LEAD

/** The whole spit, from the first gout landing to the last. */
export const WYRM_SPIT_S = wyrmSpitAt(WYRM_SPITS - 1)

/** Is this survivor inside a gout? A circle, flattened down the road exactly as
 *  the ring is, so what is drawn is what burns. */
export const inWyrmSpit = (dx: number, dy: number, r = WYRM_SPIT_R): boolean =>
  dx * dx + dy * dy <= r * r

/**
 * Can the crowd outrun the spit at all?
 *
 * Not used by the game — it is the statement the spec measures, kept here
 * beside the numbers it is about. A gout is aimed `WYRM_SPIT_LEAD` before it
 * lands, so a crowd moving at `v` is `v × WYRM_SPIT_LEAD` from where the mark
 * went down; it escapes when that exceeds the gout's radius plus nothing (the
 * bodies on the trailing edge are the ones that pay). At the steer spring's
 * pace a committed drag clears it with room; a drift does not, and that is the
 * grade the attack is for.
 */
export const wyrmSpitEscapeSpeed = (): number => WYRM_SPIT_R / WYRM_SPIT_LEAD

// ─── What the fight costs, as one statement ─────────────────────────────────
//
// Every beat of every wyrm attack draws from a budget the attack was handed
// once. These are the shares of that budget each beat may take, and they exist
// so the specs can assert the whole fight's price without re-deriving it from
// three step functions.

/**
 * What the whole breath is priced at, as a multiple of one swing.
 *
 * The one attack here worth MORE than a swing, and the reason is arithmetic the
 * owner read off a playtest: a sweep split four ways is four quarter-swings,
 * and a player who dodges three of them — which is what the dark windows are
 * for — pays a quarter of a slam for the fight's signature move. That is not a
 * threat, it is a tax on the unlucky.
 *
 * So it is priced like the healer's drain (`DRAIN_SHARE_MUL`, the same shape of
 * argument): the attack a player has to answer four times running is the one
 * that has to hurt when they do not. At 1.8 a flare eaten is about half a slam
 * and a whole sweep stood through is nearly two — with every flare still capped
 * at `SLAM_FRACTION_MAX`, so no single landing can exceed the game's one-hit
 * ceiling.
 */
export const WYRM_BREATH_SHARE_MUL = 1.8

/**
 * How much of the breath's budget a single flare may take.
 *
 * A quarter each, and the remainder carries: a crowd that eats only the last
 * flare pays a quarter, a crowd that stands in all four pays the lot. Not a
 * quarter each *and* a fresh budget per flare, which is the mistake that turns
 * a four-beat attack into four attacks.
 */
export const WYRM_FLARE_SHARE = 1 / WYRM_FLARES

/** …and the same rule for the spit's three gouts. */
export const WYRM_SPIT_SHARE = 1 / WYRM_SPITS

/**
 * The crowd's width, exported for the specs that assert the gap fits it and the
 * flame does not. Nothing in the game reads it — the game reads `CROWD_MAX_R`.
 */
export const WYRM_CROWD_W = CROWD_W
