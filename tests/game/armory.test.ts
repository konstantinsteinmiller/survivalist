// ─── The four-lane weapon split ─────────────────────────────────────────────
//
// Owner's call (2026-09-19): the weapon choice is a piece of road. Four lanes
// walled apart by boulders, one weapon in each, on stage 1 right before the
// boss, a quarter of the way into stage 2 and halfway into stage 3 — each one
// offering the weapons the player has not had yet. See `game/armory.ts`.
//
// What is pinned here is what a player would feel if it broke: the lanes offer
// the right weapons, the split sits where it was asked for with nothing else
// standing in it, the walls hold the crowd in ONE lane and never kill anybody,
// a crowd that never steers is still handed a weapon, and the one taken is the
// one in the lane the crowd was steered into.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  ARMORY_AT, ARMORY_LANE_W, ARMORY_ORDER, ARMORY_ROAD_HALF, ARMORY_SLOW, ARMORY_SPAN, ARMORY_WALL_W, ARMORY_WALL_XS,
  armoryGeometry, armoryLaneFor, armoryLanes, armoryLaneX, armoryOffer, armoryRoadHalf,
  armoryPoolFor, armorySpeedMul, armoryZoom01, emptyArmoryHistory, recordArmoryPick, type ArmoryHistory
} from '@/game/armory'
import { buildTrack } from '@/game/track'
import { LANE_HALF, UNIT_R } from '@/game/survival'
import { ARMORY_KEY, WEAPON_PICK_KEY } from '@/keys'
import { WEAPON_HUE } from '@/game/weapons'

const importGame = () => import('@/use/useSurvivalGame')

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const g = await importGame()
  g.__resetForTest()
  g.debugGiveWeapon(null)
})

describe('what the lanes hold', () => {
  it('opens a fresh career on the two originals and the next two', () => {
    expect(armoryOffer(emptyArmoryHistory())).toEqual(['rocket', 'gatling', 'grapeshot', 'dynamo'])
  })

  it('leads each later split with the weapons nobody has shown the player yet', () => {
    let h = emptyArmoryHistory()
    const first = armoryOffer(h)
    h = recordArmoryPick(h, first, 'rocket')
    const second = armoryOffer(h)
    // The two never shown come first, then the untaken; the one just fired never.
    expect(second).toEqual(['gravecall', 'hoard', 'gatling', 'grapeshot'])
    h = recordArmoryPick(h, second, 'gatling')
    // By the third split every lane holds a weapon the player has never fired.
    expect(armoryOffer(h)).toEqual(['grapeshot', 'dynamo', 'gravecall', 'hoard'])
  })

  it('tops up with the longest-ago pick once fewer than four are left', () => {
    const h = { offered: ['rocket', 'gatling', 'grapeshot', 'dynamo', 'gravecall', 'hoard'] as const, picked: ['hoard', 'rocket', 'gatling'] as const }
    const offer = armoryOffer({ offered: [...h.offered], picked: [...h.picked] })
    expect(offer).toEqual(['grapeshot', 'dynamo', 'gravecall', 'hoard'])
  })

  it('never offers a weapon that is no use in a fight, right before a boss', () => {
    // Owner's call: Gravecall and Crow's Hoard live off kills on the road.
    expect(armoryPoolFor('boss')).toEqual(['rocket', 'gatling', 'grapeshot', 'dynamo'])
    expect(armoryPoolFor(0.25)).toEqual(ARMORY_ORDER)
    // Even when those two are exactly the ones the player has never seen.
    const h = { offered: ['rocket', 'gatling', 'grapeshot', 'dynamo'], picked: ['rocket'] } as ArmoryHistory
    const offer = armoryOffer(h, armoryPoolFor('boss'))
    expect([...offer].sort()).toEqual(['dynamo', 'gatling', 'grapeshot', 'rocket'])
    // The untaken first; the one just fired last.
    expect(offer[3]).toBe('rocket')
  })

  it('deals the pre-boss split from the fight pool on the real road', async () => {
    const { setState } = await import('@/use/useTowerState')
    setState(ARMORY_KEY, { offered: ['rocket', 'gatling', 'grapeshot', 'dynamo'], picked: ['rocket'] })
    const g = await importGame()
    g.startStage(1)
    const lanes = g.getArmory()!.lanes
    expect(lanes).not.toContain('gravecall')
    expect(lanes).not.toContain('hoard')
    // …while the mid-road split on stage 2 still leads with them.
    g.startStage(2)
    expect(g.getArmory()!.offer.slice(0, 2)).toEqual(['gravecall', 'hoard'])
  })

  it('puts the two most wanted in the centre lanes, where a crowd that barely steers lands', () => {
    const lanes = armoryLanes(['rocket', 'gatling', 'grapeshot', 'dynamo'])
    expect(lanes[armoryLaneFor(0)]).toBe('rocket')
    expect(lanes).toEqual(['grapeshot', 'rocket', 'gatling', 'dynamo'])
  })
})

describe('each weapon has its own colour', () => {
  // Owner's call (2026-09-19): a lane has to be readable without its name.
  const rgb = (hex: string): [number, number, number] =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

  it('gives every weapon a colour, and the triplet matches the hex', () => {
    for (const id of ARMORY_ORDER) {
      const hue = WEAPON_HUE[id]
      expect(hue, id).toBeTruthy()
      expect(hue.rgb, id).toBe(rgb(hue.hex).join(','))
    }
  })

  it('keeps any two weapons far apart, and every one bright against the road', () => {
    const ids = [...ARMORY_ORDER]
    for (let i = 0; i < ids.length; i++) {
      const [r, g, b] = rgb(WEAPON_HUE[ids[i]!].hex)
      // Relative luminance, roughly: a colour the dark road swallows is no cue.
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b, ids[i]).toBeGreaterThan(90)
      for (let j = i + 1; j < ids.length; j++) {
        const [r2, g2, b2] = rgb(WEAPON_HUE[ids[j]!].hex)
        const d = Math.hypot(r - r2, g - g2, b - b2)
        expect(d, `${ids[i]} and ${ids[j]} are too alike`).toBeGreaterThan(90)
      }
    }
  })
})

describe('the shape of the split', () => {
  it('fits four lanes and three walls exactly across the widened road', () => {
    expect(armoryLaneX(0) - ARMORY_LANE_W / 2).toBeCloseTo(-ARMORY_ROAD_HALF, 6)
    expect(armoryLaneX(3) + ARMORY_LANE_W / 2).toBeCloseTo(ARMORY_ROAD_HALF, 6)
    for (let i = 0; i < ARMORY_WALL_XS.length; i++) {
      const wall = ARMORY_WALL_XS[i]!
      expect(wall - ARMORY_WALL_W / 2).toBeCloseTo(armoryLaneX(i) + ARMORY_LANE_W / 2, 6)
    }
    // A wall on the centre line — which is why the tie goes to a lane, not the stone.
    expect(Math.min(...ARMORY_WALL_XS.map(Math.abs))).toBeCloseTo(0, 9)
    expect(armoryLaneFor(0)).toBe(1)
    expect(armoryLaneFor(ARMORY_ROAD_HALF)).toBe(3)
    expect(armoryLaneFor(-ARMORY_ROAD_HALF)).toBe(0)
  })

  it('widens, holds, and narrows back; pulls the camera back and slows the run only around it', () => {
    const g = armoryGeometry(100)
    expect(armoryRoadHalf(g, g.wideFrom)).toBe(LANE_HALF)
    expect(armoryRoadHalf(g, g.mouth)).toBeCloseTo(ARMORY_ROAD_HALF, 6)
    expect(armoryRoadHalf(g, g.exit)).toBeCloseTo(ARMORY_ROAD_HALF, 6)
    expect(armoryRoadHalf(g, g.wideTo)).toBe(LANE_HALF)
    expect(armoryZoom01(g, g.from)).toBe(0)
    expect(armoryZoom01(g, g.wideFrom)).toBe(1)
    expect(armoryZoom01(g, g.exit)).toBe(1)
    expect(armoryZoom01(g, g.to)).toBe(0)
    expect(armorySpeedMul(g, g.mouth)).toBeCloseTo(ARMORY_SLOW, 6)
    expect(armorySpeedMul(g, g.from)).toBe(1)
    expect(armorySpeedMul(g, g.wideTo)).toBe(1)
    expect(g.to - g.from).toBe(ARMORY_SPAN)
  })
})

describe('where the split stands on the road', () => {
  const splitOf = (stage: number) => {
    const t = buildTrack(stage)
    const ev = t.events.filter((e) => e.kind === 'armory')
    return { t, ev }
  }

  it('is on stages 1-3 only, once each, and never on a seeded expedition road', () => {
    for (const stage of [1, 2, 3]) expect(splitOf(stage).ev, `stage ${stage}`).toHaveLength(1)
    for (const stage of [4, 5, 9, 16]) expect(splitOf(stage).ev, `stage ${stage}`).toHaveLength(0)
    expect(buildTrack(2, 12345).events.some((e) => e.kind === 'armory')).toBe(false)
  })

  it('has nothing else standing anywhere on its stretch of road', () => {
    for (const stage of [1, 2, 3]) {
      const { t, ev } = splitOf(stage)
      const g = armoryGeometry(ev[0]!.y)
      const inside = t.events.filter((e) => e.kind !== 'armory' && e.y > g.from && e.y < g.to)
      expect(inside, `stage ${stage}`).toEqual([])
    }
  })

  it('sits right before the boss on stage 1, a quarter into stage 2, halfway into stage 3', () => {
    const one = splitOf(1)
    const g1 = armoryGeometry(one.ev[0]!.y)
    // Nothing between the split and the arena.
    expect(g1.to).toBeLessThanOrEqual(one.t.arenaY)
    expect(one.t.events.some((e) => e.kind !== 'armory' && e.y > g1.to && e.y < one.t.arenaY)).toBe(false)
    for (const stage of [2, 3]) {
      const { t, ev } = splitOf(stage)
      const at = ARMORY_AT[stage] as number
      const from = armoryGeometry(ev[0]!.y).from
      // The road up to the arena, less the split's own length.
      expect(from / (t.arenaY - ARMORY_SPAN), `stage ${stage}`).toBeCloseTo(at, 1)
    }
  })
})

describe('running the split', () => {
  const runThrough = async (steer: ((g: Awaited<ReturnType<typeof importGame>>) => void) | null) => {
    const g = await importGame()
    g.startStage(1)
    expect(g.debugSkipToArmory()).toBe(true)
    const a = g.getArmory()!
    const lost = () => Object.values(g.deathBreakdown()).reduce((s, n) => s + n, 0)
    const lostBefore = lost()
    let strayed = 0
    let slowest = Number.POSITIVE_INFINITY
    let prevY = g.anchor().y
    for (let i = 0; i < 4000 && g.anchor().y < a.g.to + 1 && g.phase.value === 'run'; i++) {
      steer?.(g)
      g.step(16)
      const y = g.anchor().y
      if (y > a.g.mouth && y < a.g.exit) slowest = Math.min(slowest, (y - prevY) / 0.016)
      prevY = y
      if (a.lane < 0) continue
      const cx = armoryLaneX(a.lane)
      for (const u of g.getUnits()) {
        if (u.dying > 0 || u.y < a.g.mouth || u.y > a.g.exit) continue
        if (Math.abs(u.x - cx) > ARMORY_LANE_W / 2 - UNIT_R + 1e-6) strayed++
      }
    }
    return { g, a, lost: lost() - lostBefore, strayed, slowest }
  }

  it('hands a crowd that never steers the left-centre lane, and kills nobody', async () => {
    const { g, a, lost, strayed } = await runThrough(null)
    expect(a.lane).toBe(1)
    expect(a.taken).toBe(a.lanes[1])
    expect(g.activeWeapon.value).toBe(a.lanes[1])
    expect(g.weaponPower.value).toBe(1)
    expect(lost, 'the walls killed survivors').toBe(0)
    expect(strayed, 'a survivor stood outside its lane between the walls').toBe(0)
  })

  it('gives the lane the thumb was held over, and slows the run through it', async () => {
    const { g, a, lost, strayed, slowest } = await runThrough((game) => game.steerTo(ARMORY_ROAD_HALF))
    expect(a.lane).toBe(3)
    expect(g.activeWeapon.value).toBe(a.lanes[3])
    expect(lost).toBe(0)
    expect(strayed).toBe(0)
    // Slowed, never stopped.
    expect(slowest).toBeGreaterThan(0)
    expect(slowest).toBeLessThan(5)
  })

  it('writes the pick and what was shown, so the next split offers the others', async () => {
    const { g, a } = await runThrough(null)
    const { getState } = await import('@/use/useTowerState')
    expect(getState(WEAPON_PICK_KEY, null)).toBe(a.taken)
    const h = getState<{ offered: string[]; picked: string[] }>(ARMORY_KEY, { offered: [], picked: [] })
    expect(h.picked).toEqual([a.taken])
    expect([...h.offered].sort()).toEqual([...a.offer].sort())
    // Stage 2's split leads with the two never shown.
    g.startStage(2)
    expect(g.getArmory()!.offer.slice(0, 2)).toEqual(['gravecall', 'hoard'])
  })

  it('lets the crowd back out to the normal road once the walls are past', async () => {
    const { g } = await runThrough((game) => game.steerTo(ARMORY_ROAD_HALF))
    for (let i = 0; i < 120; i++) g.step(16)
    expect(g.armoryZoomNow()).toBe(0)
    for (const u of g.getUnits()) {
      if (u.dying > 0) continue
      expect(Math.abs(u.x)).toBeLessThanOrEqual(LANE_HALF - UNIT_R + 1e-6)
    }
  })
})
