/**
 * ─── Scripted players ───────────────────────────────────────────────────────
 *
 * A *policy* is a player, expressed as a pure function of the world:
 *
 *     decide(view) → the lane x the crowd should be steered to
 *
 * It may read the world and nothing else. It never mutates an entity, never
 * calls into the simulation, and never touches persisted state — the harness
 * takes its return value and passes it to `steerTo()`, which is the ONLY input
 * the real game has. Anything a policy can do, a thumb can do.
 *
 * Four archetypes are required by the balance brief and one extra earns its
 * place on stage 5 (see `trailFollower`). They are deliberately written against
 * the same geometry helpers, so the difference between them is *decision
 * quality*, not access to better information:
 *
 *   optimal      — reads every bank in view, values the leaves properly,
 *                  commits early to pumpable leaves, detours for crates it can
 *                  actually break in time, and aims at the SAFE line rather
 *                  than the pretty one.
 *   good         — same routing and the same safe line, but takes the offer on
 *                  the leaf at face value and commits late, so it never banks
 *                  the pump. Never detours for a crate.
 *   average      — 250 ms of reaction latency, picks the leaf it is already
 *                  nearest to rather than the best one, and aims at the leaf's
 *                  PAINTED centre (`GATE_LEAF_X`) instead of the safe line, so
 *                  it clips the pillar whenever the crowd is large.
 *   careless     — holds the centre line. Eats every pillar, every wall, every
 *                  crate. The "did not understand the game yet" player, which
 *                  on a first session is most of them.
 *   trailFollower— chases coins. Exists because stage 5 deliberately lies with
 *                  a coin trail, and somebody has to walk into it.
 *
 * ─── Why the geometry helpers matter ────────────────────────────────────────
 *
 * The design comments in `survival.ts` reason about the crowd against the
 * PAINTED width of things (`CROWD_MAX_R` 1.9 < `GATE_LEAF_HALF` 2.05, "so a
 * properly-aimed crowd passes cleanly"). The SIMULATION does not: every contact
 * test in `useSurvivalGame.ts` adds `UNIT_R` to the obstacle's half-width. A
 * pillar of half-width 0.25 therefore reaches 0.55, a crate of radius 0.62
 * reaches 0.92, and a barricade block reaches 0.3 wider than it is drawn. Every
 * number below is the CONTACT width, not the drawn one — which is exactly the
 * discrepancy the study is here to price.
 *
 * Contact is a GUILLOTINE, not a rate: whoever is inside a solid thing dies on
 * the frame they touch it, and the rest of the swarm runs past. It was a rate
 * with a shove for one round of tuning, and `expectedLoss` below carried the
 * matching model — `squad × fraction × seconds-in-contact`, saturating at 8 %
 * overlap so that a graze cost nearly as much as a plough. Both are gone.
 *
 * Under the current rule the question a policy answers goes back to the simple
 * one: **how much of the crowd would this line put inside the thing** — because
 * that share, exactly, is what it loses. `expectedLoss` is now that share times
 * the squad, with no rate, no dwell time and no saturation ramp in it.
 */

import {
  BULLET_R,
  BULLET_SPEED,
  CRATE_R,
  DIVIDER_H,
  DIVIDER_HALF_W,
  GATE_TICK_MS,
  LANE_HALF,
  UNIT_R,
  BARRICADE_H,
  type Barricade,
  type Boss,
  type Crate,
  type Divider,
  type Foe,
  type Gate,
  type Pickup,
  type Rock
} from '@/game/survival'

// ─── The world, as a policy sees it ─────────────────────────────────────────

export type SimPhase = 'run' | 'boss' | 'clear' | 'wipe'

export interface View {
  stage: number
  phase: SimPhase
  /** Seconds of wall clock since the run started. */
  t: number
  /** Forward speed for this stage, world units per second. */
  speed: number
  anchorX: number
  anchorY: number
  squad: number
  /** Half-width of the crowd right now — the number every geometry call needs. */
  crowdR: number
  damage: number
  fireRate: number
  /** `squad × damage × fireRate`, the sim's own DPS definition. */
  dps: number
  gates: readonly Gate[]
  dividers: readonly Divider[]
  crates: readonly Crate[]
  barricades: readonly Barricade[]
  /** Boulders. Unshootable, so the ONLY answer is the line — which is exactly
   *  why a policy that could not see them was measuring a different game. */
  rocks: readonly Rock[]
  foes: readonly Foe[]
  pickups: readonly Pickup[]
  boss: Boss | null
}

export interface Policy {
  id: string
  /** The player this models, in one line. */
  describes: string
  /** Called once per run so latency buffers and per-policy RNG start clean. */
  reset(seed: number): void
  /** @returns the lane x to steer to. Must not mutate anything in `view`. */
  decide(view: View): number
}

// ─── Lethal geometry (derived from the sim's own contact tests) ─────────────

/** `steerTo()` clamps here, so no policy may ever ask for more. */
export const STEER_CLAMP = LANE_HALF - 0.4

/** Half-width of the strip a gate pillar reaches into — `stepDividers`. */
export const DIVIDER_KILL_HALF = DIVIDER_HALF_W + UNIT_R // 0.55

/** Half-width of the strip an unbroken crate reaches into — `stepCrates`. */
export const CRATE_KILL_HALF = CRATE_R + UNIT_R // 0.92

/** Half-width of the strip a barricade block reaches into — `stepBarricades`. */
export const barricadeKillHalf = (w: number): number => w / 2 + UNIT_R

/**
 * The boss slam, mirrored from `useSurvivalGame.ts` — keep both in step.
 *
 * The telegraph is the window the sim gives a player between locking the impact
 * point and landing it, so a policy that dodges any later than this is playing
 * a game the sim is not running. It sat at 0.62 here long after the sim moved
 * to 1.0, which cost every scripted player a third of a second of dodge they
 * were entitled to.
 */
export const SLAM_TELEGRAPH = 1.0
export const SLAM_RADIUS = 1.75

const clampLane = (x: number): number => Math.max(-STEER_CLAMP, Math.min(STEER_CLAMP, x))

/**
 * Fraction of a uniformly-packed disc of radius `r` whose x lies below `t`.
 *
 * The formation is a Vogel spiral (`r ∝ √i`), which is uniform in AREA, so the
 * fraction of the crowd on one side of a line is exactly the disc's area
 * fraction. That closed form is what lets a policy — and the report — price a
 * hazard in SURVIVORS rather than in guesses.
 */
const discBelow = (r: number, t: number): number => {
  if (r <= 1e-6) return t >= 0 ? 1 : 0
  const u = Math.max(-1, Math.min(1, t / r))
  return 0.5 + (Math.asin(u) + u * Math.sqrt(1 - u * u)) / Math.PI
}

/** Fraction of a crowd centred at `cx` with radius `r` lying inside `[lo, hi]`. */
export const crowdFractionIn = (cx: number, r: number, lo: number, hi: number): number =>
  Math.max(0, discBelow(r, hi - cx) - discBelow(r, lo - cx))

// ─── Hazards ────────────────────────────────────────────────────────────────

/** A crushing x-interval standing between the crowd and where it wants to be. */
export interface Hazard {
  /** Anchor positions in `[lo, hi]` put at least one survivor in contact. */
  lo: number
  hi: number
  /** The contact strip itself, without the crowd's radius folded in. */
  coreLo: number
  coreHi: number
  /** Distance ahead, world units — used only for ordering / debugging. */
  dist: number
  kind: 'divider' | 'crate' | 'barricade'
}

/**
 * The share of the squad's rounds that actually land on a target of half-width
 * `halfW` when the crowd is aimed straight at it.
 *
 * Rounds leave from a RANDOM survivor in the front half of the crowd and fly
 * straight up, so a target only eats the rounds fired by the survivors standing
 * within its own width. A three-strong squad is narrower than a crate and lands
 * everything; a two-hundred-strong one is four units wide and lands half. That
 * difference is why a big crowd is worse at breaking a small box than a small
 * crowd with the same nominal DPS, and any policy that misses it will either
 * skip crates it could have taken or drive into ones it could not.
 */
const alignFraction = (halfW: number, crowdR: number): number =>
  crowdFractionIn(0, crowdR, -(halfW + BULLET_R), halfW + BULLET_R)

/**
 * Can the squad shoot `hp` off something `dist` ahead before walking into it?
 *
 * The alignment share above is the share of the squad's rounds that land:
 * bullets leave from a random survivor in the front half of the crowd, so a
 * narrow target at the crowd's centre only ever eats about half of them. Being
 * conservative here is deliberate — a policy that over-estimates its own DPS
 * drives into the obstacle, and the crowd bleeds for as long as it is in there.
 */
const killableBefore = (
  hp: number,
  dist: number,
  view: View,
  targetHalfW: number,
  swerve = 0
): boolean => {
  if (hp <= 0) return true
  const contact = dist / Math.max(0.01, view.speed)
  const flight = dist / BULLET_SPEED
  // Crossing the lane costs a beat before any round can line up on the target.
  const window = contact - flight - Math.min(0.5, Math.abs(swerve) * 0.06)
  if (window <= 0) return false
  // 1.15× headroom: bullets are also eaten by foes, walls and pillars in front.
  return view.dps * alignFraction(targetHalfW, view.crowdR) * window >= hp * 1.15
}

/**
 * Everything ahead that will still be solid when the crowd reaches it.
 *
 * `horizonS` is short on purpose. The crowd crosses the whole lane in about a
 * third of a second, so a hazard three seconds out is not a decision yet — and
 * treating it as one makes a policy abandon a gate it had plenty of time to
 * take. One second of warning is a real player's window.
 */
export const lethalIntervals = (
  view: View,
  horizonS: number,
  opts: { crates?: boolean; barricades?: boolean; dividers?: boolean } = {}
): Hazard[] => {
  const { crates = true, barricades = true, dividers = true } = opts
  const r = view.crowdR
  // The crowd is a disc: its leading edge meets an obstacle a body-depth early.
  const horizon = view.speed * horizonS + r * 0.72 + 0.4
  const out: Hazard[] = []

  const add = (x: number, half: number, dist: number, kind: Hazard['kind']): void => {
    out.push({
      lo: x - half - r,
      hi: x + half + r,
      coreLo: x - half,
      coreHi: x + half,
      dist,
      kind
    })
  }

  if (dividers) {
    for (const d of view.dividers) {
      // A pillar whose bank has been claimed is scenery — `stepDividers` stops
      // billing anyone the instant the flag goes up, so a policy that still
      // routed around it would swerve for nothing.
      if (d.dismissed) continue
      const dist = d.y - view.anchorY
      if (dist < -1 || dist > horizon) continue
      add(d.x, d.halfW + UNIT_R, dist, 'divider')
    }
  }

  if (crates) {
    for (const c of view.crates) {
      if (c.dead) continue
      const dist = c.y - view.anchorY
      if (dist < -1 || dist > horizon) continue
      if (killableBefore(c.hp, dist, view, CRATE_R)) continue
      add(c.x, CRATE_KILL_HALF, dist, 'crate')
    }
  }

  if (barricades) {
    for (const r of view.rocks) {
      const dist = r.y - view.anchorY
      if (dist < -1 || dist > horizon) continue
      // No `killableBefore`: a boulder has no HP and never goes away.
      add(r.x, r.w / 2 + UNIT_R, dist, 'barricade')
    }
    for (const b of view.barricades) {
      if (b.dead) continue
      const dist = b.y - view.anchorY
      if (dist < -1 || dist > horizon) continue
      if (killableBefore(b.hp, dist, view, b.w / 2)) continue
      add(b.x, barricadeKillHalf(b.w), dist, 'barricade')
    }
  }

  return out
}

/**
 * Expected survivors lost if the crowd runs the line `x`.
 *
 * One line of arithmetic, because the rule it mirrors is one sentence: every
 * survivor whose path crosses a solid thing dies, so the cost of a line is the
 * share of the crowd that line puts inside the strip. No rate, no dwell time,
 * no per-obstacle price — a pillar, a crate and a boulder all cost exactly the
 * bodies you drove into them, which is why `Hazard.kind` no longer appears
 * here at all.
 *
 * The behavioural change from the old rate model is entirely in the SHALLOW
 * end. Clipping a block's edge with 3 % of the crowd used to cost nearly the
 * full per-second rate (the model saturated at 8 % overlap, matching a sim that
 * shoved the survivors and let the formation spring drag them back in); it now
 * costs 3 % of the crowd. So a policy will accept a graze it used to swerve
 * for, and swerve harder from a line that would bury the crowd's middle in
 * something — which is the ordering a player would recognise.
 *
 * Still priced in survivors for every hazard type, so "which line costs least"
 * stays a comparison of like with like, and a beat that cannot be run for free
 * (a gauntlet channel narrower than the crowd, a split crate pair closer
 * together than twice the crowd plus their contact strips) still resolves to
 * the cheapest line rather than an arbitrary one.
 */
export const expectedLoss = (x: number, view: View, hazards: readonly Hazard[]): number => {
  let lost = 0
  const r = view.crowdR
  for (const h of hazards) {
    const overlap = crowdFractionIn(x, r, h.coreLo, h.coreHi)
    if (overlap <= 0) continue
    lost += view.squad * overlap
  }
  return lost
}

/**
 * The line nearest `desired` that costs the fewest survivors.
 *
 * A coarse scan rather than interval arithmetic: it degrades gracefully when
 * NO line is free (which, as the study shows, is most gauntlets and every split
 * crate pair at full crowd size) and it is ~90 float ops, which is nothing next
 * to one simulation tick.
 */
/**
 * The corridor the crowd is already committed to, or `null` while it is still
 * free to pick one.
 *
 * `expectedLoss` prices a POSITION and knows nothing about the PATH taken to
 * reach it, which is fine for a scattered field and wrong for a passage: with a
 * rib of stone on the centre line, the far door scores zero — the crowd would
 * not be touching anything once it got there — so a policy cheerfully steered
 * straight through the wall to reach it. Measured: `good` clearing 0 of 3 on
 * stage 7 with 139 deaths on stone, while `optimal` (which commits early enough
 * to be on the right side already) took none at all.
 *
 * A human does not need this spelled out: they see a corridor, and once they
 * are in it they take the door it leads to. This is that, and nothing more —
 * upstream of the mouth both doors are still on offer, which is exactly the
 * split second the passage is designed to sell.
 */
const corridor = (view: View): { lo: number; hi: number } | null => {
  let nearest = Number.POSITIVE_INFINITY
  for (const r of view.rocks) {
    if (!r.passage) continue
    const ahead = r.y - view.anchorY
    if (ahead < -1.4 || ahead > 14) continue
    if (ahead < nearest) nearest = ahead
  }
  if (!Number.isFinite(nearest)) return null
  // Still upstream of the mouth: the choice has not been taken away yet.
  if (nearest > view.crowdR + 1.4) return null

  let ribLo = Number.POSITIVE_INFINITY
  let ribHi = Number.NEGATIVE_INFINITY
  for (const r of view.rocks) {
    if (!r.passage) continue
    const ahead = r.y - view.anchorY
    if (ahead < -1.4 || ahead > 14) continue
    ribLo = Math.min(ribLo, r.x - r.w / 2 - UNIT_R)
    ribHi = Math.max(ribHi, r.x + r.w / 2 + UNIT_R)
  }
  if (!Number.isFinite(ribLo)) return null
  return view.anchorX >= (ribLo + ribHi) / 2
    ? { lo: ribHi, hi: STEER_CLAMP }
    : { lo: -STEER_CLAMP, hi: ribLo }
}

export const safestNear = (desired: number, view: View, hazards: readonly Hazard[]): number => {
  const lane = corridor(view)
  if (hazards.length === 0) {
    const free = clampLane(desired)
    return lane ? Math.max(lane.lo, Math.min(lane.hi, free)) : free
  }
  const from = lane ? Math.max(-STEER_CLAMP, lane.lo) : -STEER_CLAMP
  const to = lane ? Math.min(STEER_CLAMP, lane.hi) : STEER_CLAMP
  let bestX = Math.max(from, Math.min(to, clampLane(desired)))
  let bestScore = Infinity
  for (let x = from; x <= to + 1e-6; x += 0.1) {
    // The tie-break pulls toward the plan; it is deliberately worth less than
    // a single survivor so it can never argue a policy into a hazard.
    const score = expectedLoss(x, view, hazards) + Math.abs(x - desired) * 0.04
    if (score < bestScore - 1e-9) {
      bestScore = score
      bestX = x
    }
  }
  return clampLane(bestX)
}

// ─── Gate banks ─────────────────────────────────────────────────────────────

export interface Bank {
  y: number
  leaves: Gate[]
}

/** Un-used banks between the crowd and `vision` units ahead, nearest first. */
export const banksAhead = (view: View, vision: number): Bank[] => {
  const byY = new Map<number, Gate[]>()
  for (const g of view.gates) {
    if (g.used) continue
    const dist = g.y - view.anchorY
    if (dist < -0.2 || dist > vision) continue
    const key = Math.round(g.y * 100)
    const list = byY.get(key)
    if (list) list.push(g)
    else byY.set(key, [g])
  }
  return [...byY.values()]
    .map((leaves) => ({ y: leaves[0]!.y, leaves }))
    .sort((a, b) => a.y - b.y)
}

/**
 * The anchor x that takes a leaf cleanly.
 *
 * NOT the leaf's painted centre, and NOT derived from the leaf's sign — that
 * assumption held only while every bank had exactly one pillar, at zero. Since
 * three-leaf banks landed there are TWO pillars (±`GATE3_DIVIDER_X`) and a
 * CENTRE door with a pillar on either side of it, and reasoning from `sign(x)`
 * put the centre door's aim point at 0.94 — a third of a unit inside the right
 * pillar's kill strip, which starts at 1.03. Every policy would have bled on
 * every triple, and the better the policy the more precisely it would have
 * aimed at the spot that killed it.
 *
 * So the band is READ, not assumed: start from the door's painted edges, and
 * let every LIVE pillar of the same bank push the near edge in by its own
 * contact reach (`halfW + UNIT_R`). The midpoint of what is left is the only
 * line that survives a crowd of any size.
 *
 *   two-leaf, right door — [0.55, 4.35] → 2.45
 *   three-leaf, centre   — [−1.03, 1.03] → 0
 *   three-leaf, outer    — [2.13, 3.99] → 3.06, and that band is 1.86 wide,
 *                          which is exactly twice `funnelRadius(1.33)`. There
 *                          is no margin at all on a triple: the funnel is what
 *                          makes the door passable, and the aim has to be exact.
 */
export const safeLeafAnchor = (leaf: Gate, view: View): number => {
  let lo = leaf.x - leaf.halfW
  let hi = leaf.x + leaf.halfW
  for (const d of view.dividers) {
    if (d.bankId !== leaf.bankId || d.dismissed) continue
    const reach = d.halfW + UNIT_R
    if (d.x <= leaf.x) lo = Math.max(lo, d.x + reach)
    else hi = Math.min(hi, d.x - reach)
  }
  // A door narrower than its own pillars is not a door; fall back to its centre
  // rather than returning an inverted band.
  if (hi <= lo) return clampLane(leaf.x)
  return clampLane((lo + hi) / 2)
}

/** Is the column between the crowd and this leaf clear enough to charge it? */
const canPump = (leaf: Gate, view: View): boolean => {
  const aim = safeLeafAnchor(leaf, view)
  for (const b of view.barricades) {
    if (b.dead || b.y <= view.anchorY || b.y >= leaf.y) continue
    if (Math.abs(b.x - aim) < b.w / 2 + 1.2) return false
  }
  for (const c of view.crates) {
    if (c.dead || c.y <= view.anchorY || c.y >= leaf.y) continue
    if (Math.abs(c.x - aim) < CRATE_R + 1.2) return false
  }
  return true
}

/**
 * What a leaf is worth, in survivors, to THIS run.
 *
 *   add — the printed number, plus one for every full `GATE_TICK_MS` of fire
 *         the crowd can still land on it. That second term is the entire skill
 *         of the game: the crowd cannot slow down, so "pumping" is really
 *         "commit to the leaf as early as you can see it".
 *   mul — `count × (value − 1)`, which is worth nothing to a small crowd and
 *         everything to a large one.
 *   div — strictly negative, always.
 */
export const leafValue = (leaf: Gate, view: View, withPump: boolean): number => {
  if (leaf.op === 'div') return -view.squad * (1 - 1 / Math.max(2, leaf.value))
  if (leaf.op === 'mul') return view.squad * (leaf.value - 1)
  let value = leaf.value
  if (withPump && canPump(leaf, view)) {
    const dist = Math.max(0, leaf.y - view.anchorY)
    const window = dist / Math.max(0.01, view.speed) - dist / BULLET_SPEED - 0.15
    value += Math.max(0, Math.floor((window * 1000) / GATE_TICK_MS))
  }
  return value
}

// ─── The boss dance ─────────────────────────────────────────────────────────

/**
 * Dodging the slam.
 *
 * The boss locks its target when `slamCd` drops under the telegraph, aiming at
 * the crowd plus 35 % of wherever the thumb is dragging. The crowd does NOT
 * advance during the boss fight (`stepAnchor` zeroes forward speed off the run
 * phase), so the whole fight is a one-dimensional dodge: get `SLAM_RADIUS +
 * crowdR` away from `slamX` before the timer runs out, then come back under the
 * boss so the rounds keep landing.
 */
const bossDance = (view: View, dodge: boolean): number => {
  const b = view.boss
  if (!b || b.dead) return view.anchorX
  // Bullets fly straight up, so damage only lands while the crowd is roughly
  // under the body. A dodge that never comes back never kills anything.
  if (!dodge) return clampLane(b.x)
  if (b.slamCd > SLAM_TELEGRAPH + 0.02) return clampLane(b.x)

  const need = SLAM_RADIUS + view.crowdR + 0.2
  const left = b.slamX - need
  const right = b.slamX + need
  const leftOk = left >= -STEER_CLAMP
  const rightOk = right <= STEER_CLAMP
  if (leftOk && rightOk) return clampLane(Math.abs(left - b.x) < Math.abs(right - b.x) ? left : right)
  if (leftOk) return clampLane(left)
  if (rightOk) return clampLane(right)
  // The lane is not wide enough to clear a centred slam at full crowd size —
  // run for whichever edge is further from the impact and eat the difference.
  return clampLane(b.slamX >= 0 ? -STEER_CLAMP : STEER_CLAMP)
}

// ─── Crates ─────────────────────────────────────────────────────────────────

/**
 * The next crate worth swerving for.
 *
 * "Worth it" is not "is it there": an unbroken crate is a solid object that
 * grinds 12 % of the squad away per second of contact, so a detour is only
 * correct when the squad can definitely break it on the way in. Rate crates are
 * preferred over damage crates because fire rate is the stat a run cannot start
 * with — and because `CRATE_RATE_GAIN` compounds with every survivor.
 */
const crateWorthDetour = (view: View, vision: number): Crate | null => {
  let best: Crate | null = null
  let bestScore = -Infinity
  for (const c of view.crates) {
    if (c.dead) continue
    const dist = c.y - view.anchorY
    if (dist < 0.6 || dist > vision) continue
    if (!killableBefore(c.hp, dist, view, CRATE_R, c.x - view.anchorX)) continue
    // Nearest first, rate over damage, and no crossing the whole lane for one.
    const swerve = Math.abs(c.x - view.anchorX)
    const score = (c.kind === 'rate' ? 6 : 4) - dist * 0.2 - swerve * 0.15
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

// ─── A tiny per-policy PRNG ─────────────────────────────────────────────────
//
// Policies that model imprecision need randomness, but they must NOT pull from
// `Math.random()` — the harness seeds that for the SIMULATION, and a policy
// that consumed from the same stream would make bullet jitter depend on how
// often the player twitched.

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── The policies ───────────────────────────────────────────────────────────

/**
 * How far ahead a policy is allowed to look.
 *
 * The camera leads the crowd by `CAMERA_LEAD` (5.4) and shows `VIEW_HEIGHT`
 * (19) units, so a real player can see roughly 15 units of road. `optimal` is
 * allowed the full streaming window (30) because it is a benchmark, not a
 * claim about what a human can see; everyone else is capped at what is on the
 * screen.
 */
const VISION_SCREEN = 15
const VISION_ORACLE = 29

/** Committing to a leaf this many units out. Early = more pump, more exposure. */
const COMMIT_LATE = 7.5

const nearestBank = (view: View, vision: number): Bank | null => banksAhead(view, vision)[0] ?? null

/**
 * OPTIMAL — the player the difficulty curve should be measured against.
 *
 * Values every leaf in view (including what the `+N` will have climbed to by
 * the time it is reached), commits to pumpable leaves the moment they stream
 * in, detours for any crate it can prove it will break, routes around anything
 * it cannot, and always aims at the safe line rather than the painted one.
 */
export const optimal: Policy = {
  id: 'optimal',
  describes: 'Plays the intended line: values every leaf, pumps early, takes every safe crate, never touches a pillar.',
  reset() {},
  decide(view) {
    if (view.phase === 'boss') return bossDance(view, true)

    const bank = nearestBank(view, VISION_ORACLE)
    const crate = crateWorthDetour(view, VISION_ORACLE)

    // The nearest objective owns the thumb. A bank never pre-empts a crate that
    // stands in front of it: the crowd covers the lane in about a third of a
    // second, so taking the crate and then swinging onto the leaf is almost
    // always possible — and giving up a rate crate to buy two more gate ticks
    // is a bad trade, because fire rate compounds with every survivor the rest
    // of the stage adds.
    const crateFirst = crate != null && (bank == null || crate.y < bank.y - 1.5)
    let desired = view.anchorX

    if (crateFirst) desired = crate!.x
    else if (bank) {
      let best = bank.leaves[0]!
      let bestVal = -Infinity
      for (const leaf of bank.leaves) {
        const v = leafValue(leaf, view, true)
        if (v > bestVal) {
          bestVal = v
          best = leaf
        }
      }
      // Commit early ONLY when the leaf climbs. A `×N` or a `÷N` offer is
      // exactly as good five seconds out as it is on the line, so arriving
      // early buys nothing and costs the freedom to route around whatever the
      // stage puts between here and there.
      const pumpable = best.op === 'add'
      if (pumpable || bank.y - view.anchorY <= COMMIT_LATE + 2) desired = safeLeafAnchor(best, view)
    } else if (crate) desired = crate.x

    return safestNear(desired, view, lethalIntervals(view, 1.1))
  }
}

/**
 * GOOD — a competent player who is not optimising.
 *
 * Same routing instincts and the same safe line, but takes the number printed
 * on the leaf at face value (so it never realises a `+6` it commits to now will
 * be a `+11` by the time it arrives) and commits late, which costs it most of
 * the pump. Never detours for a crate — it collects the ones that happen to be
 * on its line and no others.
 */
export const good: Policy = {
  id: 'good',
  describes: 'Routes correctly and aims properly, but takes leaves at face value, commits late and never detours for supplies.',
  reset() {},
  decide(view) {
    if (view.phase === 'boss') return bossDance(view, true)

    const bank = nearestBank(view, VISION_SCREEN)
    let desired = view.anchorX
    if (bank && bank.y - view.anchorY <= COMMIT_LATE) {
      let best = bank.leaves[0]!
      let bestVal = -Infinity
      for (const leaf of bank.leaves) {
        const v = leafValue(leaf, view, false)
        if (v > bestVal) {
          bestVal = v
          best = leaf
        }
      }
      desired = safeLeafAnchor(best, view)
    }
    return safestNear(desired, view, lethalIntervals(view, 1.1))
  }
}

/**
 * AVERAGE — the median first-week player.
 *
 * Three separate imperfections, each one a thing real players actually do:
 *
 *   1. 250 ms of reaction latency on EVERY decision, including the boss slam;
 *   2. picks the leaf it is already nearest to instead of the better one —
 *      a bank is a two-way choice and drifting is the cheapest answer;
 *   3. aims at the leaf's painted centre (`GATE_LEAF_X` = 2.3), not the safe
 *      line (2.45). At crowd radius 1.9 that difference is the whole margin,
 *      so this player clips the pillar on every single bank once the squad is
 *      past ~33 survivors.
 *
 * It still routes around walls, because a wall is visible for two seconds and
 * nobody drives into those on purpose.
 */
/** Reaction latency, seconds. A quarter second is the low end of a real thumb. */
export const AVERAGE_LATENCY = 0.25

/**
 * Wrap a policy so its decisions arrive `seconds` late.
 *
 * Latency is separated from decision QUALITY on purpose: it is the one player
 * variable the design cannot argue with (a thumb is as fast as it is) and the
 * one that a telegraph length is directly tuned against. Wrapping lets the
 * study sweep it — see the "reaction latency" block in `study.test.ts`, which
 * is what turns "average dies at the boss" into "the boss slam stops being
 * dodgeable somewhere between 150 and 200 ms".
 */
export const withLatency = (base: Policy, seconds: number, id = base.id): Policy => {
  let queue: Array<{ t: number; x: number }> = []
  return {
    id,
    describes: `${base.describes} (${Math.round(seconds * 1000)} ms reaction latency)`,
    reset(seed) {
      base.reset(seed)
      queue = []
    },
    decide(view) {
      queue.push({ t: view.t, x: base.decide(view) })
      let out = queue[0]!.x
      while (queue.length > 1 && view.t - queue[0]!.t >= seconds) out = queue.shift()!.x
      return clampLane(out)
    }
  }
}

/**
 * AVERAGE's decision-making, before latency is layered on top.
 *
 * Two imperfections, each one a thing real players actually do:
 *
 *   1. picks the leaf it is already nearest to instead of the better one — a
 *      bank is a two-way choice and drifting is the cheapest answer;
 *   2. aims at the leaf's painted centre (`GATE_LEAF_X` = 2.3), not the safe
 *      line (2.45). At crowd radius 1.9 that difference is the whole margin.
 *
 * It still routes around walls, because a wall is visible for two seconds and
 * nobody drives into those on purpose. It does not route around crates, because
 * a crate reads as a reward until the first time one kills you.
 */
const makeAverageCore = (): Policy => {
  let rng = mulberry32(1)
  return {
    id: 'average-core',
    describes: 'Drifts to the nearer leaf instead of the better one and aims at the painted centre, so it shaves the pillar',
    reset(seed) {
      rng = mulberry32(seed ^ 0x5bf03635)
    },
    decide(view) {
      if (view.phase === 'boss') return bossDance(view, true)

      const bank = nearestBank(view, VISION_SCREEN)
      let desired = view.anchorX
      if (bank && bank.y - view.anchorY <= COMMIT_LATE) {
        // A `÷N` is loud enough that even a distracted player usually reads it,
        // so it is dodged 70 % of the time and walked into the other 30 %.
        const readsTheTrap = rng() < 0.7
        let best = bank.leaves[0]!
        let bestScore = Infinity
        for (const leaf of bank.leaves) {
          let score = Math.abs(leaf.x - view.anchorX)
          if (leaf.op === 'div' && readsTheTrap) score += 100
          if (score < bestScore) {
            bestScore = score
            best = leaf
          }
        }
        desired = best.x // the PAINTED centre — 0.15 inside the safe line
      }
      return safestNear(desired, view, lethalIntervals(view, 1.0, { crates: false }))
    }
  }
}

export const average: Policy = withLatency(makeAverageCore(), AVERAGE_LATENCY, 'average')

/** The same competent player as `good`, with a thumb that is `ms` slow. Used
 *  only by the latency sweep, so reaction time is the ONLY variable. */
export const goodWithLatency = (ms: number): Policy =>
  withLatency(good, ms / 1000, `good+${ms}ms`)

/** Park the crowd on a fixed lane x for a whole run. The probe workhorse. */
export const holdAt = (x: number, label = `hold ${x.toFixed(2)}`): Policy => ({
  id: label,
  describes: `Holds x = ${x.toFixed(2)} and never reacts to anything.`,
  reset() {},
  decide() {
    return clampLane(x)
  }
})

/**
 * CARELESS — holds the centre line, forever.
 *
 * The player who has not worked out that the thumb does anything yet. It is the
 * floor the first stage has to clear: whatever else stage 1 does, a player who
 * touches nothing has to reach the boss, because a first session that ends
 * eleven seconds in ends the install.
 */
export const careless: Policy = {
  id: 'careless',
  describes: 'Never steers. Holds x = 0, eats every pillar, every wall and every crate on the centre line.',
  reset() {},
  decide() {
    return 0
  }
}

/**
 * TRAIL FOLLOWER — chases the coins.
 *
 * Stage 5 lays twelve coins that curve from the safe shoulder into a `÷2` leaf
 * and calls it "the greedy trail"; stages 1–4 spend their coin trails marking
 * the good line. This policy is the player that lesson is aimed at, so it is
 * the only way to measure whether the lie actually costs anything.
 */
export const trailFollower: Policy = {
  id: 'trail',
  describes: 'Follows the coin trail, falls back to the biggest printed number. The player stage 5 is built to lie to.',
  reset() {},
  decide(view) {
    if (view.phase === 'boss') return bossDance(view, false)

    let coin: Pickup | null = null
    let bestDist = Infinity
    for (const p of view.pickups) {
      if (p.taken) continue
      const dist = p.y - view.anchorY
      if (dist < 0.5 || dist > VISION_SCREEN) continue
      if (dist < bestDist) {
        bestDist = dist
        coin = p
      }
    }
    let desired = coin ? coin.x : view.anchorX

    if (!coin) {
      const bank = nearestBank(view, VISION_SCREEN)
      if (bank && bank.y - view.anchorY <= COMMIT_LATE) {
        // Biggest number wins, whatever the symbol in front of it is.
        let best = bank.leaves[0]!
        for (const leaf of bank.leaves) if (leaf.value > best.value) best = leaf
        desired = best.x
      }
    }
    return safestNear(desired, view, lethalIntervals(view, 1.0, { crates: false }))
  }
}

/** Every policy the study drives, in the order the tables print them. */
export const POLICIES: readonly Policy[] = [optimal, good, average, careless, trailFollower]

export const policyById = (id: string): Policy => {
  const p = POLICIES.find((q) => q.id === id)
  if (!p) throw new Error(`unknown policy "${id}"`)
  return p
}
