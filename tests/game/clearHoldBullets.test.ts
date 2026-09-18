import { beforeEach, describe, expect, it } from 'vitest'

/**
 * ─── The rounds in the air when the boss dies ───────────────────────────────
 *
 * A clear stops the world for the boss-felled hold, and the squad fires right up
 * to that frame. The tracers still in flight used to freeze where they were and
 * hang over the corpse for the whole hold; they now fly on and run out at their
 * range, while everything else stays exactly where the kill left it.
 */

const STEP_MS = 16
const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  ;(await importGame()).__resetForTest()
})

const clearStage = (game: Game, stage: number): void => {
  game.startStage(stage)
  game.debugAddUnits(700)
  game.debugAddDamage(400)
  game.debugAddFireRate(6)
  game.debugSkipToArena()
  for (let i = 0; i < 9000; i++) {
    game.step(STEP_MS)
    if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
  }
  expect(game.phase.value).toBe('clear')
}

describe('the boss-felled hold', () => {
  it('lets the rounds in flight fly out instead of freezing them in the air', async () => {
    const game = await importGame()
    clearStage(game, 2)
    // The premise: a squad this size is mid-volley on the frame the stage ends.
    const before = game.getBullets().map((b) => b.y)
    expect(before.length).toBeGreaterThan(0)

    game.step(STEP_MS)
    const after = game.getBullets()
    // Every round still alive has moved up the road; none sat still.
    for (const b of after) expect(before).not.toContain(b.y)

    // Half a second is the longest a round can fly (range / speed); the life
    // backstop is 900 ms. Well inside the two-second hold, the air is empty.
    for (let t = 0; t < 1000; t += STEP_MS) game.step(STEP_MS)
    expect(game.getBullets()).toHaveLength(0)
    expect(game.phase.value).toBe('clear')
  })

  it('moves nothing but the rounds — the crowd and the corpse stay put', async () => {
    const game = await importGame()
    clearStage(game, 2)
    const anchor = game.anchor()
    const units = game.getUnits().map((u) => `${u.x}|${u.y}`)
    const coins = game.runSummary().coins

    for (let t = 0; t < 1000; t += STEP_MS) game.step(STEP_MS)

    expect(game.anchor()).toEqual(anchor)
    expect(game.getUnits().map((u) => `${u.x}|${u.y}`)).toEqual(units)
    expect(game.runSummary().coins).toBe(coins)
  })
})
