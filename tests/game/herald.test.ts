// ─── The herald ─────────────────────────────────────────────────────────────
//
// One meteor, four fifths of the way down the road, from a boss the player has
// not met. Owner's call (2026-09-20): "so the player is surprised and wants to
// know where that came from. Only if the boss has that attack skill."
//
// What is pinned here is what would break the joke: it fires on the stages
// whose boss actually throws and nowhere else, it lands before the arena and
// after the road has been mostly run, it costs a fraction of the crowd rather
// than a swing, and it never fires twice.

import { beforeEach, describe, expect, it } from 'vitest'
import { HERALD_AT, HERALD_FROM_STAGE, HERALD_MAX_KILL, bossKindFor } from '@/game/threats'

const importGame = () => import('@/use/useSurvivalGame')
const STEP = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const g = await importGame()
  g.__resetForTest()
  g.debugGiveWeapon(null)
})

/** Walk a stage with a crowd big enough that nothing else can end the run. */
const walk = async (stage: number) => {
  const g = await importGame()
  g.startStage(stage)
  g.steerOnly.value = false
  g.debugAddUnits(80)
  const armedAtStart = g.debugHerald().armed
  let firedAt = -1
  let flew = false
  for (let i = 0; i < 12000 && g.phase.value === 'run'; i++) {
    if (g.squadCount.value < 60) g.debugAddUnits(60 - g.squadCount.value)
    const before = g.debugHerald()
    g.step(STEP)
    const after = g.debugHerald()
    if (before.armed && !after.armed) firedAt = g.progress01.value
    if (after.flying) flew = true
  }
  return { g, armedAtStart, firedAt, flew }
}

describe('which roads throw one', () => {
  it('arms only where the boss owns the move, and never on stage 1', async () => {
    const g = await importGame()
    for (const stage of [1, 2, 3, 4, 5, 6, 7, 8]) {
      g.startStage(stage)
      const want = stage >= HERALD_FROM_STAGE && bossKindFor(stage) === 'meteor'
      expect(g.debugHerald().armed, `stage ${stage}`).toBe(want)
    }
  })

  it('never arms on a daily expedition — that road is not an introduction', async () => {
    const g = await importGame()
    g.startStage(2, 20260920)
    expect(g.debugHerald().armed).toBe(false)
  })
})

describe('what it does', () => {
  it('falls late on the road, before the arena, once', async () => {
    const { g, armedAtStart, firedAt, flew } = await walk(2)
    expect(armedAtStart).toBe(true)
    expect(flew, 'nothing was ever in the air').toBe(true)
    expect(firedAt, 'it never fired').toBeGreaterThanOrEqual(HERALD_AT - 0.02)
    expect(firedAt).toBeLessThan(1)
    // Spent: a second one cannot be armed by the same road.
    expect(g.debugHerald().armed).toBe(false)
  }, 60_000)

  it('costs a fraction of the crowd, not a swing', async () => {
    const g = await importGame()
    g.startStage(2)
    g.steerOnly.value = false
    g.debugAddUnits(80)
    let before = 0
    for (let i = 0; i < 12000 && g.phase.value === 'run'; i++) {
      if (g.squadCount.value < 60) g.debugAddUnits(60 - g.squadCount.value)
      if (g.debugHerald().flying && before === 0) before = g.deathBreakdown().slam
      g.step(STEP)
    }
    const cost = g.deathBreakdown().slam - before
    expect(cost).toBeGreaterThan(0)
    expect(cost).toBeLessThanOrEqual(HERALD_MAX_KILL)
  }, 60_000)
})
