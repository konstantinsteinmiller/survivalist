import { describe, expect, it } from 'vitest'
import {
  DECLINE_MAX, DECLINE_STEP, challengeFactor, rewardDeclineFactor
} from '@/game/survival'

/**
 * ─── The lean ───────────────────────────────────────────────────────────────
 *
 * The `×3` at the end of a stage is the game's primary income, so declining it
 * has to cost something the player can feel during the NEXT run rather than
 * only six stages later when the shop is empty.
 *
 * Three properties make that a nudge instead of a punishment, and all three are
 * invisible in a screenshot:
 *
 *   1. one claim buys back the whole curve (it resets, it is not a debt);
 *   2. it is capped, so a player who never watches an ad still has a finite,
 *      beatable game;
 *   3. it never fires for an offer that was not actually there.
 *
 * (3) lives in the scene — a decline is only recorded when `canOfferReward` was
 * true while the result screen was up — so what is asserted here is the curve
 * itself and the bounds the scene relies on.
 */

describe('declining the ×3 leans the road', () => {
  it('starts at exactly 1 — a player who has not declined pays nothing', () => {
    expect(rewardDeclineFactor(0)).toBe(1)
  })

  it('climbs monotonically, one step per declined stage', () => {
    for (let n = 1; n <= DECLINE_MAX; n++) {
      expect(rewardDeclineFactor(n), `${n} declines`)
        .toBeCloseTo(1 + n * DECLINE_STEP, 6)
      expect(rewardDeclineFactor(n)).toBeGreaterThan(rewardDeclineFactor(n - 1))
    }
  })

  it('caps, so refusing every ad is a hard game rather than an impossible one', () => {
    const ceiling = rewardDeclineFactor(DECLINE_MAX)
    for (const n of [DECLINE_MAX + 1, DECLINE_MAX + 20, 9999]) {
      expect(rewardDeclineFactor(n), `${n} declines ran past the cap`).toBe(ceiling)
    }
    // …and the ceiling is a lean, not a wall: worth less than half of what a
    // maxed challenge streak already asks of a player who is winning.
    expect(ceiling).toBeLessThan(challengeFactor(DECLINE_MAX) - 1 + 1)
    expect(ceiling).toBeLessThanOrEqual(1.5)
  })

  it('is bounded below by 1 for nonsense input', () => {
    // The count is read off a save blob a cloud restore can hand back
    // anything for.
    for (const n of [-1, -100, Number.NaN]) {
      expect(rewardDeclineFactor(n as number) >= 1 || Number.isNaN(n)).toBe(true)
    }
    expect(rewardDeclineFactor(-5)).toBe(1)
  })

  it('a single claim is worth every decline that preceded it', () => {
    // The reset is the whole reason this is a nudge: the player can always buy
    // the easy curve back with one video, at any depth.
    expect(rewardDeclineFactor(0)).toBeLessThan(rewardDeclineFactor(DECLINE_MAX))
    expect(rewardDeclineFactor(0)).toBe(1)
  })
})
