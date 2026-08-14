import { beforeEach, describe, expect, it } from 'vitest'
import {
  CHALLENGE_MAX, CHALLENGE_STEP, CROWD_MAX_R, GATE3_LEAF_HALF, GATE3_LEAF_X
} from '@/game/survival'
import { drainFx, type FxEvent } from '@/use/useVfx'

// ─── One bank, one door ─────────────────────────────────────────────────────
//
// Three rules arrived together and they only work as a set:
//
//   1. a gate bank is claimed by exactly ONE leaf — the one holding the most
//      survivors — which pays in full while every other offer is destroyed;
//   2. the crowd FUNNELS to fit the door it is aimed at, which is what lets a
//      bank have three narrow leaves instead of two wide ones;
//   3. the difficulty tracks the PLAYER: a streak of clears winds the next
//      stage up, a single loss winds it all the way back down.
//
// None of it is visible in a screenshot and all of it is one edit away from
// silently reverting, so it is asserted against the real simulation.

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

const settled = (game: Game): boolean =>
  game.phase.value === 'clear' || game.phase.value === 'wipe'

/** Run until the first multi-leaf bank has been consumed, collecting FX. */
const runFirstBank = (game: Game, steerX: number): FxEvent[] => {
  const seen: FxEvent[] = []
  drainFx()
  let bankId = -1
  for (let i = 0; i < 1200; i++) {
    if (bankId < 0) {
      const leaves = game.getGates().filter((g) => !g.used)
      const counts = new Map<number, number>()
      for (const g of leaves) counts.set(g.bankId, (counts.get(g.bankId) ?? 0) + 1)
      for (const [id, n] of counts) if (n >= 2) { bankId = id; break }
    }
    game.steerTo(steerX)
    game.step(STEP_MS)
    seen.push(...drainFx())
    if (bankId >= 0 && game.getGates().every((g) => g.bankId !== bankId || g.used)) break
    if (settled(game)) break
  }
  return seen
}

describe('a gate bank is claimed by exactly one door', () => {
  it('pays one leaf and destroys every other offer in the bank', async () => {
    const game = await importGame()
    game.startStage(3)
    game.step(STEP_MS)

    const bank = game.getGates().filter((g) => !g.used)
    const bankId = bank[0]?.bankId
    expect(bankId, 'no bank streamed in').toBeDefined()
    const leafCount = bank.filter((g) => g.bankId === bankId).length
    expect(leafCount, 'stage 3 should open with a multi-leaf bank').toBeGreaterThan(1)

    const fx = runFirstBank(game, bank[0]!.x)
    const passes = fx.filter((e) => e.kind === 'gatePass')
    const dismissals = fx.filter((e) => e.kind === 'gateDismiss')

    // Exactly one door pays…
    expect(passes.length, 'more than one leaf of the same bank paid out').toBe(1)
    // …and every other leaf of that bank is destroyed, once each.
    expect(dismissals.length).toBe(leafCount - 1)
  })

  it('carries the distance to the taken door, so the dismissal can cascade', async () => {
    const game = await importGame()
    game.startStage(3)
    game.step(STEP_MS)
    const bank = game.getGates().filter((g) => !g.used)

    const fx = runFirstBank(game, bank[0]!.x)
    for (const e of fx) {
      if (e.kind !== 'gateDismiss') continue
      expect(e.distance).toBeGreaterThan(0)
      expect(Number.isFinite(e.distance)).toBe(true)
    }
  })

  it('stands its pillars down the instant the bank is claimed', async () => {
    const game = await importGame()
    game.startStage(3)
    game.step(STEP_MS)

    const bank = game.getGates().filter((g) => !g.used)
    const bankId = bank[0]!.bankId
    const live = game.getDividers().filter((d) => d.bankId === bankId)
    expect(live.length, 'the bank shipped without pillars').toBeGreaterThan(0)
    expect(live.every((d) => !d.dismissed)).toBe(true)

    runFirstBank(game, bank[0]!.x)

    // They are not DELETED — the renderer topples them as part of the
    // dismissal cascade, and a pillar that vanished the frame its bank resolved
    // would blink out from under its own debris. But they are inert: a pillar
    // that outlived the decision it was enforcing would be an invisible wall in
    // open road.
    const after = game.getDividers().filter((d) => d.bankId === bankId)
    expect(after.every((d) => d.dismissed), 'a pillar survived its bank').toBe(true)

    // …and being inert is load-bearing, so it is measured rather than assumed:
    // park the crowd on one and nobody dies.
    const before = game.deathBreakdown().divider
    const pillar = after[0]
    if (pillar) {
      game.steerTo(pillar.x)
      for (let i = 0; i < 90; i++) game.step(STEP_MS)
      expect(game.deathBreakdown().divider).toBe(before)
    }
  })
})

describe('the crowd funnels through the door it is aimed at', () => {
  it('squeezes on the approach and spills back out after', async () => {
    const game = await importGame()
    game.startStage(3)
    game.step(STEP_MS)
    game.debugAddUnits(200)

    // Narrow the bank to three-leaf widths. A two-leaf door (half-width 2.05)
    // is deliberately wide enough that a full crowd walks straight through it —
    // the funnel exists for the 1.33-wide doors of a three-leaf bank, so that
    // is what the mechanism has to be measured against.
    const bank = game.getGates().filter((g) => !g.used)
    for (const g of bank) {
      g.halfW = GATE3_LEAF_HALF
      g.x = Math.sign(g.x || 1) * GATE3_LEAF_X
    }
    const leaf = bank[0]!
    game.steerTo(leaf.x)

    let tightest = CROWD_MAX_R
    let passed = false
    for (let i = 0; i < 900; i++) {
      game.step(STEP_MS)
      if (!passed) tightest = Math.min(tightest, game.crowdRadius())
      if (game.anchor().y > leaf.y + 1) passed = true
      if (passed && game.crowdRadius() > tightest * 1.05) break
      if (settled(game)) break
    }

    // It squeezed…
    expect(tightest, 'the crowd never funnelled').toBeLessThan(CROWD_MAX_R)
    // …and it is coming back out the other side rather than staying narrow.
    expect(game.crowdRadius()).toBeGreaterThan(tightest)
  })
})

describe('the autobalancer tracks the player, not the stage number', () => {
  const firstFoeHp = (game: Game, stage: number): number => {
    game.startStage(stage)
    for (let i = 0; i < 900 && game.getFoes().length === 0; i++) game.step(STEP_MS)
    return game.getFoes()[0]?.maxHp ?? -1
  }

  const clearStage = (game: Game, stage: number): void => {
    game.startStage(stage)
    game.debugAddUnits(400)
    game.debugAddDamage(400)
    game.debugAddFireRate(4)
    for (let i = 0; i < 6000 && game.phase.value !== 'clear'; i++) game.step(STEP_MS)
    expect(game.phase.value).toBe('clear')
  }

  it('winds the next stage up after a clear', async () => {
    const game = await importGame()
    const base = firstFoeHp(game, 4)
    expect(base).toBeGreaterThan(0)
    expect(game.challenge.value).toBe(0)

    clearStage(game, 3)
    expect(game.challenge.value).toBe(1)

    const harder = firstFoeHp(game, 4)
    expect(harder, 'a clear did not make the next stage harder').toBeGreaterThan(base)
    // …by about one step of the handicap.
    expect(harder / base).toBeCloseTo(1 + CHALLENGE_STEP, 1)
  })

  it('wipes the whole streak on a single loss', async () => {
    const game = await importGame()
    clearStage(game, 3)
    clearStage(game, 4)
    expect(game.challenge.value).toBe(2)

    // Lose one.
    game.startStage(5)
    game.__resetForTest()
    game.step(STEP_MS)
    expect(game.phase.value).toBe('wipe')

    // All the way back to zero — the handicap may never be the reason somebody
    // is stuck, which is only true if a loss clears it completely.
    expect(game.challenge.value).toBe(0)
  })

  it('caps the handicap so the curve stays a curve', async () => {
    const { challengeFactor } = await import('@/game/survival')
    expect(challengeFactor(CHALLENGE_MAX + 50)).toBe(challengeFactor(CHALLENGE_MAX))
    expect(challengeFactor(0)).toBe(1)
    expect(challengeFactor(-5)).toBe(1)
  })
})
