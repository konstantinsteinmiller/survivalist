/**
 * ─── Rescue cages, from stage 2 ─────────────────────────────────────────────
 *
 * Four claims, each one a line of the request:
 *
 *   FROM STAGE 2        the first stage past the thirty-second teach carries one.
 *   THREE TO FIVE EARLY a small squad's worth of people, growing with the stage
 *                       exactly as the doors it competes with do.
 *   70 % OF A WALL      opening it takes real, committed fire — seven tenths of
 *                       one barricade block on the same stage.
 *   THEY WALK OVER      the freed survivors jog to the squad instead of being
 *                       sprung into formation, and they are part of it — counted
 *                       and shooting — from the moment the bars come off.
 *
 * …and the fifth, which is what keeps the first four from being free power: a
 * cage takes the place of one supply crate (`CAGE_TAKES`). That one is pinned in
 * `trackShape.test.ts`, beside the supply floor it deliberately breaks by one.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CAGE_JOIN_MAX_S, CAGE_JOIN_SPEED, stageSpeed } from '@/game/survival'
import {
  CAGE_STAGE, CAGE_WALL_SHARE, barricadeHp, buildTrack, cageHp, cageSurvivors
} from '@/game/track'
import { drainFx } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')

const STEP_MS = 16

/** Pin `Math.random` for a spec — the same generator `crowdBounds` uses. */
const withSeed = (seed: number): (() => void) => {
  const real = Math.random
  let a = seed >>> 0
  Math.random = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => { Math.random = real }
}

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

describe('the cage is taught on stage 1 and rolled from stage 2', () => {
  it('opens the teaching pair at four and twelve, and the curve takes over after', () => {
    // ── Stage 1 used to carry none ──
    //
    // The argument was that the first road a player sees should have one kind
    // of box on it, and it held while that road was a thirty-second teach.
    // Stage 1 is seventy seconds now (`STAGE_ONE_LENGTH`), so it has room to
    // introduce the prop properly — and a cage is the one object whose payout
    // cannot be guessed by looking at it, which is exactly the kind of thing a
    // teaching road should be the one to explain.
    //
    // Two of them, hand-priced like everything else on that road: FOUR, which
    // any passing volley opens, so the lesson lands whether or not the player
    // understood it was on offer; then TWELVE, which is three times the first
    // and has to be committed to. `CAGE_STAGE` still says where the GENERATOR
    // starts placing them — stage 1's are authored in `stageOne`, exactly as
    // its crate wall and its second pickup are.
    const hp = buildTrack(1).events
      .filter((e) => e.kind === 'cages')
      .flatMap((e) => e.cages.map((c) => c.hp))
      .sort((a, b) => a - b)
    expect(hp, 'stage 1 lost its teaching cages').toEqual([4, 12])

    expect(CAGE_STAGE).toBe(2)
    expect(buildTrack(2).events.some((e) => e.kind === 'cages'), 'stage 2 carries no cage').toBe(true)
  })
})

describe('what a cage holds, and what it costs to open', () => {
  it('holds three to five people early, and more as the stage deepens', () => {
    for (let s = CAGE_STAGE; s <= 6; s++) {
      expect(cageSurvivors(s), `stage ${s}`).toBeGreaterThanOrEqual(3)
      expect(cageSurvivors(s), `stage ${s}`).toBeLessThanOrEqual(5)
    }
    expect(cageSurvivors(CAGE_STAGE)).toBe(3)
    expect(cageSurvivors(20), 'a deep cage is still a handful').toBeGreaterThan(cageSurvivors(6))
  })

  it('costs seven tenths of a wall block on the same stage', () => {
    for (let s = CAGE_STAGE; s <= 30; s++) {
      expect(cageHp(s) / barricadeHp(s), `stage ${s}`).toBeCloseTo(CAGE_WALL_SHARE, 1)
    }
    expect(CAGE_WALL_SHARE).toBeCloseTo(0.7, 9)
    // …and the cage the ROAD places is that price, flat — the wall it is
    // measured against is not depth-priced, so neither is it.
    for (const s of [2, 5, 9, 14]) {
      for (const e of buildTrack(s).events) {
        if (e.kind !== 'cages') continue
        for (const c of e.cages) expect(c.hp, `stage ${s}`).toBe(cageHp(s))
      }
    }
  })
})

describe('the people in it walk over and join the squad', () => {
  /**
   * Run stage 2 steering straight at its cage until it breaks, then keep
   * watching the bodies that came out of it.
   */
  const rescue = async () => {
    // Seeded, like every road-driving spec in this suite: where the stage-2 cage
    // breaks depends on the spawn jitter `Math.random` feeds the road, and a
    // cage broken a few units short of the arena is a different measurement
    // from one broken mid-road.
    const restore = withSeed(20260910)
    try {
      return await rescueSeeded()
    } finally { restore() }
  }

  const rescueSeeded = async () => {
    const game = await importGame()
    game.startStage(2)
    game.debugAddUnits(30)
    drainFx()
    const before = new Set<object>()
    let broke = -1
    let freed = 0
    const joiners: Array<{ u: ReturnType<typeof game.getUnits>[number]; path: Array<{ x: number; y: number }> }> = []
    let squadBefore = 0
    // Watched into the arena as well: joiners keep walking when the road ends,
    // and a watch that stopped at the arena line would read a survivor who was
    // two strides from the squad as one who never arrived.
    const live = (): boolean => game.phase.value === 'run' || game.phase.value === 'boss'
    for (let i = 0; i < 5000 && live(); i++) {
      const cage = game.getCages().find((c) => !c.dead)
      if (broke < 0) {
        for (const u of game.getUnits()) before.add(u)
        squadBefore = game.squadCount.value
        game.steerTo(cage ? cage.x : 0)
      }
      game.step(STEP_MS)
      const hit = drainFx().find((e) => e.kind === 'cageBreak')
      if (hit && hit.kind === 'cageBreak' && broke < 0) {
        broke = i
        freed = hit.count
        for (const u of game.getUnits()) if (!before.has(u)) joiners.push({ u, path: [] })
        // Not the whole squad's growth: the road's gates may pay on the same
        // frame. The joiners are the bodies that came out of THIS cage.
        expect(game.squadCount.value - squadBefore).toBeGreaterThanOrEqual(freed)
      }
      if (broke >= 0) {
        for (const j of joiners) j.path.push({ x: j.u.x, y: j.u.y })
        if (i - broke > (CAGE_JOIN_MAX_S * 1000) / STEP_MS + 5) break
      }
    }
    return { broke, freed, joiners, speed: stageSpeed(2) }
  }

  it('frees exactly what the cage holds, as bodies that walk rather than snap', async () => {
    const r = await rescue()
    expect(r.broke, 'the crowd never broke the stage-2 cage').toBeGreaterThanOrEqual(0)
    expect(r.freed).toBe(cageSurvivors(2))
    expect(r.joiners.length).toBe(r.freed)
    // Every step a joiner takes is at most a jog plus the road's own speed —
    // the formation spring would have covered three units in a fifth of a
    // second, which is the snap this replaced.
    const cap = ((CAGE_JOIN_SPEED + r.speed) * STEP_MS) / 1000 + 0.02
    let travelled = 0
    for (const j of r.joiners) {
      for (let k = 1; k < j.path.length; k++) {
        const a = j.path[k - 1]!
        const b = j.path[k]!
        const d = Math.hypot(b.x - a.x, b.y - a.y)
        if (j.u.join > 0 || k < 4) {
          expect(d, `a freed survivor jumped ${d.toFixed(2)} in one frame`).toBeLessThanOrEqual(cap)
        }
        travelled += Math.abs(b.x - a.x)
      }
    }
    expect(travelled, 'nobody actually walked anywhere').toBeGreaterThan(0.5)
  })

  it('has every one of them in formation inside the join window', async () => {
    const r = await rescue()
    expect(r.broke).toBeGreaterThanOrEqual(0)
    // No joiner is left walking alone forever: the window is the backstop.
    //
    // A joiner that DIED on the way over is not one of those, and the two are
    // only distinguishable here: a dying body stops counting its join window
    // down, so its `join` sits wherever it was when the foe reached it. The
    // difference matters because the road between a cage and the crowd is a
    // real road — the onboarding pass put bodies back on stage 2, and one of
    // the three freed survivors now sometimes does not make it. That is the
    // rescue costing something, which is the point of putting it off the line;
    // what the window promises is that a survivor who is still ALIVE is in
    // formation by the end of it.
    const arrived = r.joiners.filter((j) => j.u.dying <= 0)
    expect(arrived.length, 'not one freed survivor reached the crowd').toBeGreaterThan(0)
    for (const j of arrived) expect(j.u.join, 'a survivor was still walking over').toBe(0)

  })
})
