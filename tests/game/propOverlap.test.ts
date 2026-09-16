import { describe, expect, it } from 'vitest'
import { buildTrack, MIN_RUN_GAP, type Track, type TrackEvent } from '@/game/track'
import {
  BARRICADE_H, BULWARK_R, CAGE_R, CRATE_R, CROWD_MAX_R, DIVIDER_H, DIVIDER_HALF_W,
  LANE_HALF, ROCK_H
} from '@/game/survival'
import { LEVER_R, WEAPON_BOX_R } from '@/game/weapons'

// ─── Nothing is drawn standing inside anything else ─────────────────────────
//
// Every other layout rule in `trackShape.test.ts` is about what a beat MEANS —
// a bank is a real choice, a wall has a way through, a trap arrives on
// schedule. This file asserts the one thing a player checks by looking rather
// than by playing: no two props on the road occupy the same piece of ground.
//
// It is asserted here rather than folded into the shape suite because it is a
// different KIND of statement. The shape rules are about the design of a stage;
// this is about whether the stage can be drawn. A crate inside a boulder is not
// a harder stage — it is a box with a rock growing out of it, and a box the
// player cannot shoot, because the round stops on the rock in front of it.
//
// The bodies below are the SIM's, not the renderer's: `CRATE_R`, `CAGE_R`,
// `BULWARK_R` and the rest are what `useSurvivalGame` pushes into its solid
// list and what its bullets are tested against, so a pair that clears here is a
// pair that clears in the fight as well as on screen.

/** One prop, as an axis-aligned body on the road. */
interface Box {
  tag: string
  x: number
  y: number
  hw: number
  hh: number
}

/** Props the player is meant to collect, as opposed to route around. */
const PICKUPS = new Set(['crate', 'cage', 'bulwark', 'weaponBox'])

const bodiesOf = (e: TrackEvent): Box[] => {
  const out: Box[] = []
  switch (e.kind) {
    case 'crates':
      for (const c of e.crates) {
        out.push({ tag: 'crate', x: c.x, y: e.y, hw: CRATE_R, hh: CRATE_R })
      }
      break
    case 'cages':
      for (const c of e.cages) {
        // The elite's sealed cage stands OFF the road on purpose — past the
        // rail, partly clipped by a portrait screen — so every lane rule in this
        // file is one it is meant to break. See `REWARD_CAGE_X`.
        if (c.sealed === true) continue
        out.push({ tag: 'cage', x: c.x, y: e.y, hw: CAGE_R, hh: CAGE_R })
      }
      break
    case 'bulwarks':
      for (const w of e.bulwarks) {
        out.push({ tag: 'bulwark', x: w.x, y: e.y, hw: BULWARK_R, hh: BULWARK_R })
      }
      break
    case 'barricade':
      for (const b of e.blocks) {
        out.push({ tag: 'barricade', x: b.x, y: e.y, hw: b.w / 2, hh: BARRICADE_H / 2 })
      }
      break
    case 'rocks':
      // A passage rib is authored to be an unbroken wall — a dozen boulders laid
      // nose to tail so that the shape reads as one thing. Its ranks overlap on
      // purpose, and that is the one intended overlap on the road.
      if (e.passage) break
      for (const b of e.blocks) {
        out.push({ tag: 'rock', x: b.x, y: e.y, hw: b.w / 2, hh: ROCK_H / 2 })
      }
      break
    case 'gates':
      for (const d of e.dividers) {
        out.push({ tag: 'divider', x: d, y: e.y, hw: DIVIDER_HALF_W, hh: DIVIDER_H / 2 })
      }
      break
    case 'weapon': {
      const r = e.boxR ?? WEAPON_BOX_R
      out.push({ tag: 'weaponBox', x: e.box.x, y: e.box.y, hw: r, hh: r })
      for (const l of e.levers) out.push({ tag: 'lever', x: l.x, y: l.y, hw: LEVER_R, hh: LEVER_R })
      for (const s of e.stones) {
        out.push({ tag: 'leverStone', x: s.x, y: s.y, hw: s.w / 2, hh: ROCK_H / 2 })
      }
      for (const g of e.guards) {
        out.push({ tag: 'weaponGuard', x: g.x, y: e.guardY, hw: g.w / 2, hh: BARRICADE_H / 2 })
      }
      break
    }
    default:
      break
  }
  return out
}

/** Widest run of lane no block covers — `ensureRunnable`'s own measure. */
const widestGap = (blocks: ReadonlyArray<{ x: number; w: number }>): number => {
  const sorted = [...blocks].sort((p, q) => p.x - q.x)
  let cursor = -LANE_HALF
  let best = 0
  for (const bl of sorted) {
    const left = bl.x - bl.w / 2
    if (left - cursor > best) best = left - cursor
    cursor = Math.max(cursor, bl.x + bl.w / 2)
  }
  return Math.max(best, LANE_HALF - cursor)
}

const overlaps = (a: Box, b: Box): boolean =>
  Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh

/**
 * The campaign, plus the endless road far enough out to catch the generator's
 * motifs escalating on top of the procedural body — which is where the weapon
 * prize and the supply top-up first started landing on each other (36, 90, 100)
 * and where a boulder rank first wrapped a lever post (90, 300).
 */
const STAGES = [
  ...Array.from({ length: 40 }, (_, i) => i + 1),
  45, 50, 60, 75, 90, 100, 120, 150, 161, 175, 200, 250, 300
]

const cache = new Map<number, Track>()
const track = (stage: number): Track => {
  const hit = cache.get(stage)
  if (hit) return hit
  const built = buildTrack(stage)
  cache.set(stage, built)
  return built
}

/** Every pair of bodies on `stage` that share ground, named. */
const clashes = (stage: number, want: (a: Box, b: Box) => boolean): string[] => {
  const boxes = track(stage).events.flatMap(bodiesOf)
  const out: string[] = []
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!
      const b = boxes[j]!
      if (!want(a, b) || !overlaps(a, b)) continue
      out.push(`stage ${stage}: ${a.tag}@(${a.x}, ${a.y}) inside ${b.tag}@(${b.x}, ${b.y})`)
    }
  }
  return out
}

const isPickup = (b: Box): boolean => PICKUPS.has(b.tag)

describe('no prop is drawn inside another', () => {
  it('never stacks two pickups on the same ground', () => {
    for (const stage of STAGES) {
      expect(clashes(stage, (a, b) => isPickup(a) && isPickup(b))).toEqual([])
    }
  })

  it('never buries a pickup in a boulder, a wall, a pillar or the puzzle', () => {
    for (const stage of STAGES) {
      expect(clashes(stage, (a, b) => isPickup(a) !== isPickup(b))).toEqual([])
    }
  })

  it('never stands a boulder or a wall block inside the weapon puzzle', () => {
    // `clearPuzzleColumns` deletes whatever is in a firing lane, and it tests
    // the BODY against the lane rather than the row's centre line — a rank
    // whose centre is half a unit past a lever still has a boulder in it.
    const puzzle = new Set(['lever', 'leverStone', 'weaponBox', 'weaponGuard'])
    for (const stage of STAGES) {
      expect(
        clashes(stage, (a, b) => puzzle.has(a.tag) !== puzzle.has(b.tag))
      ).toEqual([])
    }
  })

  it('keeps every pickup inside the lane it is meant to be reached from', () => {
    for (const stage of STAGES) {
      for (const box of track(stage).events.flatMap(bodiesOf)) {
        if (!isPickup(box)) continue
        expect(
          Math.abs(box.x) + box.hw,
          `stage ${stage}: ${box.tag}@${box.x} hangs off the road`
        ).toBeLessThanOrEqual(LANE_HALF + 1e-6)
      }
    }
  })

  it('never draws any two props through each other', () => {
    // The general statement the four above are cases of. It is worth asserting
    // as a whole because the interesting failures are the pairs nobody thought
    // to name: a boulder rank landing on a wall rank, a pillar inside a rib.
    for (const stage of STAGES) {
      expect(clashes(stage, () => true)).toEqual([])
    }
  })

  it('leaves a way through every pair of rows that share road', () => {
    // `ensureRunnable` promises a crowd-wide gap in every barricade and every
    // boulder rank — ROW BY ROW, at the moment the row is built. Two rows whose
    // bodies overlap are one wall to the crowd with no road between them in
    // which to change its line, and the promise has to hold for the union as
    // well. It did not: 28 pairs across stages 1-300 merged below a crowd, the
    // worst at 3.00.
    //
    // NOT asked of rows that are merely close. A deep `barricadeRow` is ranks
    // 1.7 apart whose hole shifts by up to a slot, and a `boulderField` two
    // ranks 3.2 apart whose gaps are deliberately offset; both are narrower
    // merged than either rank alone, and both are the beat.
    const floor = Math.min(MIN_RUN_GAP, 2 * CROWD_MAX_R)
    for (const stage of STAGES) {
      const rows = track(stage).events
        .filter((e) => e.kind === 'barricade' || (e.kind === 'rocks' && !e.passage))
        .map((e) => ({
          y: e.y,
          half: e.kind === 'rocks' ? ROCK_H / 2 : BARRICADE_H / 2,
          blocks: (e as { blocks: Array<{ x: number; w: number }> }).blocks
        }))
        .sort((p, q) => p.y - q.y)
      for (let i = 0; i + 1 < rows.length; i++) {
        const a = rows[i]!
        const b = rows[i + 1]!
        if (b.y - a.y >= a.half + b.half) continue
        expect(
          widestGap([...a.blocks, ...b.blocks]),
          `stage ${stage}: rows @${a.y} and @${b.y} merge into a wall with no way through`
        ).toBeGreaterThanOrEqual(floor - 1e-6)
      }
    }
  })

  it('still builds the same stage twice', () => {
    // The de-overlap pass mutates events in place after everything else has run,
    // so it is exactly the kind of pass that can make a stage depend on the
    // order it was swept in. Asserted here rather than borrowed from
    // `trackShape.test.ts` because that suite's copy predates the pass.
    expect(JSON.stringify(buildTrack(36))).toBe(JSON.stringify(buildTrack(36)))
    expect(JSON.stringify(buildTrack(161))).toBe(JSON.stringify(buildTrack(161)))
  })
})
