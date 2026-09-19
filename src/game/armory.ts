import type { WeaponId } from '@/game/weapons'
import { LANE_HALF, UNIT_R } from '@/game/survival'

/**
 * ─── The armory: four lanes, one weapon ─────────────────────────────────────
 *
 * Owner's call (2026-09-19), after the fit test that met the 25 % line and
 * missed the three-minute average: the weapon choice stops being a card that
 * waits for a tap and becomes a piece of ROAD. The road widens, splits into
 * four lanes walled apart by boulders nobody can shoot, and each lane holds one
 * weapon. The crowd can only take one of them.
 *
 * Two things it is for. The choice no longer stops the run — a modal at the
 * funnel's biggest exit was an invitation to leave — and the three lanes the
 * player did NOT take are the reason to reach the next split, because the next
 * split offers the weapons they have not had yet.
 *
 * Where it stands (`ARMORY_AT`): stage 1 right before the boss, so the first
 * fight is fought with a gun the player chose; stage 2 a quarter of the way in;
 * stage 3 halfway. The road is SPLICED in (`spliceArmory` in `track.ts`) —
 * everything after it moves up the road by `ARMORY_SPAN` — so no authored beat
 * is displaced, squeezed or deleted to make room.
 *
 * World space as everywhere else: `x` across, `y` forward. Every number below
 * is read by the simulation (walls, clamp, speed) AND the renderer (road
 * outline, boulders, camera), so the picture and the rule cannot disagree.
 */

/** Stage → where the split goes: `'boss'` for the last road before the arena,
 *  or a fraction of the road up to the arena. Campaign roads only. */
export const ARMORY_AT: Readonly<Record<number, 'boss' | number>> = { 1: 'boss', 2: 0.25, 3: 0.5 }

export const armoryAtFor = (stage: number): 'boss' | number | null => ARMORY_AT[stage] ?? null

export const ARMORY_LANES = 4
/** Width of one lane. A shade under a three-leaf door (2.66): the crowd funnels
 *  into it the same way (`armoryFitRadius`), and four of them have to fit a
 *  road the camera can still show on a phone. */
export const ARMORY_LANE_W = 2.5
/** The boulder wall between two lanes. Wider than a gate pillar on purpose —
 *  it is scenery the eye has to read as solid from the top of the screen. */
export const ARMORY_WALL_W = 0.7
/** Half the road's width through the split: four lanes and three walls. */
export const ARMORY_ROAD_HALF = (ARMORY_LANES * ARMORY_LANE_W + (ARMORY_LANES - 1) * ARMORY_WALL_W) / 2

/** Centre of lane `i`, left to right. */
export const armoryLaneX = (i: number): number =>
  -ARMORY_ROAD_HALF + ARMORY_LANE_W / 2 + i * (ARMORY_LANE_W + ARMORY_WALL_W)

/** Centres of the walls between the lanes. */
export const ARMORY_WALL_XS: readonly number[] = Array.from(
  { length: ARMORY_LANES - 1 },
  (_, i) => armoryLaneX(i) + (ARMORY_LANE_W + ARMORY_WALL_W) / 2
)

// ─── The stretch of road, from the splice point up ──────────────────────────

/** Plain road before the widening: the camera starts to pull back and the run
 *  starts to slow here, with the four weapons already on screen. */
export const ARMORY_LEAD = 10
/** The road widening out to `ARMORY_ROAD_HALF`, ending at the walls' mouth. */
export const ARMORY_TAPER_IN = 5
/** How long the walls run. */
export const ARMORY_CORRIDOR = 10
/** …and the road narrowing back to `LANE_HALF` after them. */
export const ARMORY_TAPER_OUT = 5
/** Plain road after, so the camera is back in before anything is on it. */
export const ARMORY_TAIL = 6
/** The whole stretch the splice inserts. */
export const ARMORY_SPAN = ARMORY_LEAD + ARMORY_TAPER_IN + ARMORY_CORRIDOR + ARMORY_TAPER_OUT + ARMORY_TAIL
/** Splice point → the walls' mouth (what the track event's `y` names). */
export const ARMORY_MOUTH_OFFSET = ARMORY_LEAD + ARMORY_TAPER_IN

/**
 * How far before the mouth the crowd is committed to a lane.
 *
 * The lane nearest the thumb wins (`armoryLaneFor`), and from then on the crowd
 * is held in it. Early enough that nobody reaches a wall uncommitted — the
 * walls are not lethal, they are the edges of the lane the crowd is now in.
 */
export const ARMORY_COMMIT_LEAD = 2.2
/** How far past the mouth the crowd's anchor is when the weapon is taken —
 *  the case stands just inside the walls. */
export const ARMORY_GRANT_AT = 1.6
/** Where the weapon cases stand, as an offset from the mouth. */
export const ARMORY_CASE_AT = ARMORY_GRANT_AT
/** The run's speed through the split, as a share of the stage's. Slow enough
 *  to read four weapons, never a stop — see `eliteDragFor` for why a runner
 *  must always visibly move. */
export const ARMORY_SLOW = 0.55
/** The furthest the camera ever pulls back, as a share of the normal zoom.
 *  Where the wide road already fits the frame (desktop) it still pulls back
 *  this far, so the split reads as a place on every screen. */
export const ARMORY_ZOOM_FLOOR = 0.94

/** The crowd's radius inside a lane — the door treatment, see `funnelRadius`. */
export const armoryFitRadius = (): number =>
  Math.max(0.45, ARMORY_LANE_W / 2 - UNIT_R - 0.1)

/** Everything the sim and the renderer need to know about one split, derived
 *  from where its walls begin. */
export interface ArmoryGeometry {
  /** The splice point: where the camera starts to pull back. */
  from: number
  /** The road starts to widen. */
  wideFrom: number
  /** The walls begin. */
  mouth: number
  /** The walls end. */
  exit: number
  /** The road is back to `LANE_HALF`. */
  wideTo: number
  /** The camera is fully back in. */
  to: number
}

export const armoryGeometry = (mouth: number): ArmoryGeometry => ({
  from: mouth - ARMORY_MOUTH_OFFSET,
  wideFrom: mouth - ARMORY_TAPER_IN,
  mouth,
  exit: mouth + ARMORY_CORRIDOR,
  wideTo: mouth + ARMORY_CORRIDOR + ARMORY_TAPER_OUT,
  to: mouth - ARMORY_MOUTH_OFFSET + ARMORY_SPAN
})

const smooth = (t: number): number => {
  const k = Math.max(0, Math.min(1, t))
  return k * k * (3 - 2 * k)
}

/** Half the road's width at world-y `y`: `LANE_HALF`, easing out to
 *  `ARMORY_ROAD_HALF` over the taper, flat through the walls, and back. */
export const armoryRoadHalf = (g: ArmoryGeometry, y: number): number => {
  if (y <= g.wideFrom || y >= g.wideTo) return LANE_HALF
  const k = y < g.mouth
    ? smooth((y - g.wideFrom) / (g.mouth - g.wideFrom))
    : y <= g.exit ? 1 : smooth((g.wideTo - y) / (g.wideTo - g.exit))
  return LANE_HALF + (ARMORY_ROAD_HALF - LANE_HALF) * k
}

/**
 * How far the camera has pulled back, 0…1, with the crowd's anchor at `y`.
 *
 * Driven by POSITION rather than by a timer, so it is the same on a 30 fps
 * phone and in the headless sim: all the way out by the time the road starts
 * to widen, held through the walls, and all the way back in before the tail
 * of plain road runs out.
 */
export const armoryZoom01 = (g: ArmoryGeometry, y: number): number => {
  if (y <= g.from || y >= g.to) return 0
  if (y < g.wideFrom) return smooth((y - g.from) / (g.wideFrom - g.from))
  if (y <= g.exit) return 1
  return smooth((g.to - 1 - y) / (g.to - 1 - g.exit))
}

/** The run's speed multiplier with the anchor at `y`: eases down to
 *  `ARMORY_SLOW` on the approach, holds through the walls, eases back up over
 *  the taper out. */
export const armorySpeedMul = (g: ArmoryGeometry, y: number): number => {
  const slowFrom = g.from + 2
  if (y <= slowFrom || y >= g.wideTo) return 1
  const k = y < g.wideFrom
    ? smooth((y - slowFrom) / (g.wideFrom - slowFrom))
    : y <= g.exit ? 1 : smooth((g.wideTo - y) / (g.wideTo - g.exit))
  return 1 - (1 - ARMORY_SLOW) * k
}

/**
 * The lane a crowd aimed at `x` ends up in: the nearest centre.
 *
 * Four lanes put a WALL on the centre line, which is where a crowd rests when
 * nobody steers — so a dead-centre tie goes to the left-centre lane rather than
 * into the stone. Nobody is ever stopped by the split: whoever did not choose
 * is simply given a lane.
 */
export const armoryLaneFor = (x: number): number => {
  let best = 0
  let bestD = Number.POSITIVE_INFINITY
  for (let i = 0; i < ARMORY_LANES; i++) {
    const d = Math.abs(x - armoryLaneX(i))
    // Strictly nearer, so the LOWER index wins a tie — the left-centre lane on
    // the centre line.
    if (d < bestD - 1e-6) {
      best = i
      bestD = d
    }
  }
  return best
}

// ─── What the four lanes hold ───────────────────────────────────────────────

/** Every weapon an armory can offer, in the order a fresh career meets them:
 *  the two originals first, then the four in their debut order. */
export const ARMORY_ORDER: readonly WeaponId[] = ['rocket', 'gatling', 'grapeshot', 'dynamo', 'gravecall', 'hoard']

/** What the player has been shown and what they took, across every split. */
export interface ArmoryHistory {
  /** Every weapon an armory has put in a lane in front of them. */
  offered: WeaponId[]
  /** Every weapon they took, oldest first, each once (a re-pick moves it to
   *  the end). */
  picked: WeaponId[]
}

export const emptyArmoryHistory = (): ArmoryHistory => ({ offered: [], picked: [] })

/**
 * The four weapons a split offers, most wanted first.
 *
 * "The other ones", in the owner's words: never shown before, then shown but
 * not taken, then — only when there are not four of those left — the ones taken
 * longest ago. On a fresh career that reads rocket / gatling / grapeshot /
 * dynamo on stage 1; stage 2 leads with the two nobody has seen yet; and by
 * stage 3 every lane holds a weapon the player has never fired.
 */
export const armoryOffer = (h: ArmoryHistory, pool: readonly WeaponId[] = ARMORY_ORDER): WeaponId[] => {
  const unseen = pool.filter((id) => !h.offered.includes(id) && !h.picked.includes(id))
  const untaken = pool.filter((id) => h.offered.includes(id) && !h.picked.includes(id))
  const taken = h.picked.filter((id) => pool.includes(id))
  const out: WeaponId[] = []
  for (const id of [...unseen, ...untaken, ...taken]) {
    if (!out.includes(id)) out.push(id)
    if (out.length === ARMORY_LANES) break
  }
  return out
}

/**
 * The weapons that pay out IN a boss fight.
 *
 * Owner's call (2026-09-19): Gravecall and Crow's Hoard make no sense right in
 * front of a boss. Both live off KILLS on the road — the dead they raise, the
 * corpses they gild — and a boss fight has one body in it, so their guns are
 * all a player would get, and those are cut below the squad's own by design
 * (the trait carries the weapon). The split that stands right before an arena
 * (`ARMORY_AT` = 'boss') offers these four only; the mid-road splits offer all
 * six, where the road ahead is full of things to raise and gild.
 */
export const ARMORY_FIGHT_WEAPONS: readonly WeaponId[] = ['rocket', 'gatling', 'grapeshot', 'dynamo']

/** Which weapons a split placed at `at` may offer. */
export const armoryPoolFor = (at: 'boss' | number | null): readonly WeaponId[] =>
  at === 'boss' ? ARMORY_FIGHT_WEAPONS : ARMORY_ORDER

/**
 * Which lane each offer stands in, left to right.
 *
 * The two most wanted take the two CENTRE lanes — the ones a crowd that barely
 * steers ends up in (`armoryLaneFor`) — and the rest go out to the shoulders.
 */
export const ARMORY_LANE_ORDER: readonly number[] = [2, 0, 1, 3]

export const armoryLanes = (offer: readonly WeaponId[]): WeaponId[] =>
  ARMORY_LANE_ORDER.map((rank) => offer[rank] ?? offer[0]!)

/** The history after a pick: the four shown are now seen, and the one taken
 *  moves to the end of `picked`. */
export const recordArmoryPick = (
  h: ArmoryHistory, offered: readonly WeaponId[], pick: WeaponId
): ArmoryHistory => ({
  offered: [...h.offered, ...offered.filter((id) => !h.offered.includes(id))],
  picked: [...h.picked.filter((id) => id !== pick), pick]
})
