import { describe, expect, it } from 'vitest'
import { gateAddBase } from '@/game/track'
import { GATE_GROWTH_TRIM, START_SQUAD, STAGE_SQUAD_FLOOR } from '@/game/survival'
import {
  UPGRADES, gatePayoutBonusAt, gatePayoutStepPct, squadPerLevel
} from '@/use/useUpgrades'

/**
 * ─── Doors grow a tenth slower, and Squad is priced in doors ────────────────
 *
 * Played at stage 40, a door printed 33 and pumped `+3` a tick — 40–50 a bank
 * before the Squad track's share — while the Squad track's visible half was one
 * starting survivor a level. Past stage 60 the doors carried the crowd most of
 * the way to `MAX_SQUAD` by half the road.
 *
 * Three rules came out of it, and this file pins all three:
 *   • every step up a `+N` door takes past stage 14 is 10 % smaller
 *     (`GATE_GROWTH_TRIM`; the pump's half is pinned in `gatePump.test.ts`);
 *   • a Squad level starts the run a sixth of the stage's door ahead;
 *   • Squad's share of every door shrinks a tenth a level, in whole percents.
 */

describe('doors grow a tenth slower past stage 14', () => {
  it('leaves the onboarding band exactly as it was', () => {
    // Stages 1–14 are where the retention studies were tuned. They have taken
    // no step past the knee yet, so the trim cannot reach them.
    expect(GATE_GROWTH_TRIM).toBe(0.9)
    const before = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 14, 15]
    expect(before.map((_, i) => gateAddBase(i + 1))).toEqual(before)
  })

  it('prints the trimmed curve past it', () => {
    // Was 24 / 33 / 41 / 49 / 63.
    expect(gateAddBase(30)).toBe(23)
    expect(gateAddBase(40)).toBe(31)
    expect(gateAddBase(60)).toBe(38)
    expect(gateAddBase(100)).toBe(46)
    expect(gateAddBase(300)).toBe(58)
  })

  it('still never stops climbing', () => {
    for (let s = 1; s < 400; s++) {
      expect(gateAddBase(s + 1), `stage ${s + 1}`).toBeGreaterThanOrEqual(gateAddBase(s))
    }
    expect(gateAddBase(150)).toBeGreaterThan(gateAddBase(60))
  })
})

describe('a Squad level is a sixth of the stage\'s door', () => {
  it('is one survivor early and grows with the road', () => {
    for (const s of [1, 2, 3, 4, 5, 6]) expect(squadPerLevel(s), `stage ${s}`).toBe(1)
    expect(squadPerLevel(7)).toBe(2)
    expect(squadPerLevel(40)).toBe(5)
    expect(squadPerLevel(60)).toBe(6)
    expect(squadPerLevel(100)).toBe(8)
    for (let s = 1; s < 300; s++) {
      expect(squadPerLevel(s + 1), `stage ${s + 1}`).toBeGreaterThanOrEqual(squadPerLevel(s))
    }
  })

  it('shows the shop the start the player will actually get', () => {
    // The BASE is stage-dependent now (`squadBaseAt`): stage 1 opens on a
    // single survivor so the first door reads as a crowd appearing out of
    // nothing, and every stage after it opens on the floor the campaign was
    // balanced against. Cutting the floor everywhere was tried and measured —
    // a mid-skill career that reached stage 30 walled at eleven.
    expect(START_SQUAD).toBe(1)
    expect(UPGRADES.squad.valueAt(0, 1)).toBe(START_SQUAD)
    expect(UPGRADES.squad.valueAt(0, 40)).toBe(STAGE_SQUAD_FLOOR)
    expect(UPGRADES.squad.valueAt(10, 1)).toBe(START_SQUAD + 10)
    expect(UPGRADES.squad.valueAt(10, 40)).toBe(STAGE_SQUAD_FLOOR + 50)
    // Six levels is a whole door ahead, on any stage — the sentence the
    // divisor was chosen to make true.
    for (const s of [20, 40, 60, 100]) {
      expect(UPGRADES.squad.valueAt(6, s) - STAGE_SQUAD_FLOOR, `stage ${s}`)
        .toBeGreaterThanOrEqual(gateAddBase(s) - 3)
    }
  })
})

describe('Squad\'s share of every door shrinks a tenth a level', () => {
  it('steps 4, 4, 3, 3, 3, 2 … in whole percents, and stops', () => {
    const steps = Array.from({ length: 22 }, (_, i) => gatePayoutStepPct(i + 1))
    expect(steps).toEqual([4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0])
    expect(gatePayoutStepPct(0)).toBe(0)
  })

  it('tops out at +37 % from level 20, however deep the save', () => {
    expect(gatePayoutBonusAt(0)).toBe(1)
    expect(gatePayoutBonusAt(1)).toBeCloseTo(1.04, 10)
    expect(gatePayoutBonusAt(10)).toBeCloseTo(1.27, 10)
    expect(gatePayoutBonusAt(20)).toBeCloseTo(1.37, 10)
    // The track is endless: a very deep save must neither loop per level nor
    // keep growing past the ceiling.
    expect(gatePayoutBonusAt(10_000)).toBeCloseTo(1.37, 10)
    for (let l = 0; l < 40; l++) {
      expect(gatePayoutBonusAt(l + 1)).toBeGreaterThanOrEqual(gatePayoutBonusAt(l))
    }
  })
})
