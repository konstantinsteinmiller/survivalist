// ─── A goal two stages ahead, and a loss that says how close it came ────────
//
// Two features, one file, because they are halves of the same problem: a
// session ends when the player has no reason in mind to start the next stage.
// The milestone gives a won stage something on the other side of it; the
// near-miss readout gives a LOST one the same.
//
// Both are ledgers in the save file, and both have the same failure mode — pay
// twice, or claim a record that was not beaten — so both are driven against the
// real `startStage` / `finishRun` rather than against a pure helper.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BOSS_REACH_SHARE, MILESTONE_EVERY, isMilestone, milestoneReward, nextMilestone,
  reachOf, stagesToMilestone
} from '@/game/survival'
import { STATE_KEY } from '@/use/useTowerState'

describe('the rail the player watched', () => {
  it('never reads as finished when the boss is still standing', () => {
    // The bug this exists to prevent: `progress01` hits 1 the instant the arena
    // opens, so a crowd flattened by the boss's first swing reported 100 % on a
    // LOSS — the one number a near-miss readout must never print.
    expect(reachOf(1, true, 1)).toBeCloseTo(1 - BOSS_REACH_SHARE, 5)
    expect(reachOf(1, true, 1)).toBeLessThan(1)
  })

  it('puts the boss fight above the whole road', () => {
    // Arriving at the arena has to be worth less than taking the boss to half,
    // or the two runs that feel most different read the same.
    expect(reachOf(1, true, 0.5)).toBeGreaterThan(reachOf(1, true, 1))
    expect(reachOf(1, true, 0.01)).toBeGreaterThan(reachOf(1, true, 0.5))
  })

  it('scales the road into the share below the boss', () => {
    expect(reachOf(0, false, 1)).toBe(0)
    expect(reachOf(0.5, false, 1)).toBeCloseTo(0.5 * (1 - BOSS_REACH_SHARE), 5)
    // Half the road is always behind arriving at the arena.
    expect(reachOf(0.5, false, 1)).toBeLessThan(reachOf(1, true, 1))
  })

  it('survives nonsense from either input', () => {
    expect(reachOf(Number.NaN, false, 1)).toBe(0)
    expect(reachOf(2, false, 1)).toBeCloseTo(1 - BOSS_REACH_SHARE, 5)
    expect(reachOf(1, true, Number.NaN)).toBeCloseTo(1 - BOSS_REACH_SHARE, 5)
  })
})

describe('where the milestones fall', () => {
  it('is every fifth stage and nowhere else', () => {
    expect(MILESTONE_EVERY).toBe(5)
    expect(isMilestone(5)).toBe(true)
    expect(isMilestone(10)).toBe(true)
    expect(isMilestone(4)).toBe(false)
    expect(isMilestone(6)).toBe(false)
  })

  it('never counts stage 0 as one', () => {
    // `0 % 5 === 0` is the obvious bug here, and it would pay a milestone to a
    // save that had never played.
    expect(isMilestone(0)).toBe(false)
  })

  it('counts forward from where the player is standing', () => {
    expect(nextMilestone(1)).toBe(5)
    expect(nextMilestone(5)).toBe(5)
    expect(nextMilestone(6)).toBe(10)
    expect(stagesToMilestone(3)).toBe(2)
    // Zero on the stage that pays: the chip has arrived rather than reset.
    expect(stagesToMilestone(10)).toBe(0)
  })

  it('pays a lump that grows with the stage and never compounds', () => {
    const five = milestoneReward(5)
    const ten = milestoneReward(10)
    const twenty = milestoneReward(20)
    expect(ten).toBeGreaterThan(five)
    expect(twenty).toBeGreaterThan(ten)
    // Linear: the gap between rungs is constant, so the milestone can never
    // outrun the shop's own 1.38–1.55-a-level curve and become the income the
    // ladder is balanced against.
    expect(twenty - ten).toBeCloseTo((ten - five) * 2, 5)
  })
})

// ─── Against the real run ───────────────────────────────────────────────────

describe('the ledgers a finished run writes', () => {
  const STEP_MS = 16
  const MAX_STEPS = 12_000

  beforeEach(() => { localStorage.clear() })

  const boot = async (save: Record<string, unknown>) => {
    localStorage.setItem(STATE_KEY, JSON.stringify(save))
    vi.resetModules()
    return {
      game: await import('@/use/useSurvivalGame'),
      state: await import('@/use/useTowerState')
    }
  }

  /** Play the stage out, steering enough that `wasPlayed()` is true — an idle
   *  tab is deliberately not a stuck player, and neither ledger may be written
   *  for one. */
  const playToEnd = (game: any): void => {
    for (let i = 0; i < MAX_STEPS; i++) {
      if (game.phase.value === 'clear' || game.phase.value === 'wipe') return
      game.steerTo(i % 40 < 20 ? 1.2 : -1.2)
      game.step(STEP_MS)
    }
  }

  it('records how far a LOST run got, and what it was beating', async () => {
    const { game, state } = await boot({ ts_stage: 9, ts_best_progress: { 9: 0.4 } })
    game.startStage(9)
    // Wipe it deliberately rather than hoping the road does: the claim is about
    // the bookkeeping, not about how hard stage 9 is.
    game.steerTo(1.2)
    game.step(STEP_MS)
    game.step(STEP_MS)
    game.steerTo(-1.2)
    game.step(STEP_MS)
    for (const u of game.getUnits()) game.__killUnitForTest(u)
    game.step(STEP_MS)

    const s = game.runSummary()
    expect(s.cleared).toBe(false)
    // The PREVIOUS best travels to the screen, so "you got further" is still
    // true by the time it renders.
    expect(s.bestReach01).toBeCloseTo(0.4, 5)
    expect(s.reach01).toBeGreaterThanOrEqual(0)
    expect(s.reach01).toBeLessThan(1)
    // …and the ledger keeps whichever is larger.
    const stored = state.getState('ts_best_progress') as Record<string, number>
    expect(stored['9']).toBeGreaterThanOrEqual(0.4)
  })

  it('never lowers a best on a worse attempt', async () => {
    const { game, state } = await boot({ ts_stage: 7, ts_best_progress: { 7: 0.9 } })
    game.startStage(7)
    game.steerTo(1.2); game.step(STEP_MS)
    game.steerTo(-1.2); game.step(STEP_MS)
    game.steerTo(1.2); game.step(STEP_MS)
    for (const u of game.getUnits()) game.__killUnitForTest(u)
    game.step(STEP_MS)

    expect((state.getState('ts_best_progress') as Record<string, number>)['7']).toBeCloseTo(0.9, 5)
    expect(game.runSummary().bestReach01).toBeCloseTo(0.9, 5)
  })

  it('forgets the stage entirely once it is beaten', async () => {
    // Same lifecycle as the failure count, and for the same reason: the number
    // describes an unfinished fight, and a stage that has been cleared has none.
    // Both halves are driven for real — a loss that writes it, then a clear on
    // the same stage that has to take it away again.
    const { playOne, newGraph } = await import('../sim/harness')
    const { optimal } = await import('../sim/policies')
    localStorage.clear()
    vi.resetModules()
    const graph = await newGraph()

    // Stage 25 on a save with no shop behind it: `optimal` reads the road
    // perfectly and still loses it, which is exactly the run this ledger exists
    // to describe.
    const lost = playOne(graph, { stage: 25, policy: optimal, seed: 11 })
    expect(lost.cleared).toBe(false)
    const written = graph.state.getState('ts_best_progress') as Record<string, number>
    expect(written['25']).toBeGreaterThan(0)

    // The retry relief the loss just earned is what eventually turns the same
    // road into a clear — and the clear has to take the entry away again.
    //
    // Retried until it lands rather than exactly once, deliberately. How many
    // attempts the escalating relief needs is a BALANCE number that moves
    // whenever the curve is touched (it was two when this was written and is
    // three today), and a spec that pins it fails for the wrong reason every
    // time somebody tunes a stage. What must not change is the shape: losing
    // writes the number, and winning forgets it.
    let won = false
    for (let i = 0; i < 6 && !won; i++) {
      won = playOne(graph, { stage: 25, policy: optimal, seed: 11 }).cleared
    }
    expect(won, 'the relief never carried this road to a clear').toBe(true)
    expect((graph.state.getState('ts_best_progress') as Record<string, number>)['25'])
      .toBeUndefined()
  })

  it('pays the lump on a cleared milestone stage, once', async () => {
    // Driven through the balance harness's own `optimal` policy, because the
    // claim is about a CLEAR and a stage-5 clear needs a player rather than a
    // crowd wandering left and right.
    const { playOne, newGraph } = await import('../sim/harness')
    const { optimal } = await import('../sim/policies')
    localStorage.clear()
    vi.resetModules()
    const graph = await newGraph()
    const first = playOne(graph, { stage: 5, policy: optimal, seed: 7 })
    expect(first.cleared).toBe(true)

    const paid = graph.game.runSummary().milestone
    const { milestoneReward } = await import('@/game/survival')
    expect(paid).toBe(milestoneReward(5))
    expect(graph.state.getState('ts_milestones')).toBe(5)

    // …and never again. A replay, a cloud restore or an endless loop back
    // through the same depth must not pay a second time.
    const second = playOne(graph, { stage: 5, policy: optimal, seed: 7 })
    expect(second.cleared).toBe(true)
    expect(graph.game.runSummary().milestone).toBe(0)
  })

  it('pays nothing on a stage that is not a milestone', async () => {
    const { game } = await boot({ ts_stage: 1 })
    game.startStage(1)
    playToEnd(game)
    expect(game.runSummary().milestone).toBe(0)
  })

  it('counts down to the next UNPAID milestone, never one already collected', async () => {
    const { game } = await boot({ ts_stage: 6, ts_milestones: 5 })
    expect(game.pendingMilestone(6)).toBe(10)
    expect(game.stagesToPendingMilestone(6)).toBe(4)
    // …and a player standing back on a milestone stage they already cleared is
    // pointed forward rather than at a payout that cannot come again.
    expect(game.pendingMilestone(5)).toBe(10)
  })
})
