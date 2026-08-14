import { beforeEach, describe, expect, it } from 'vitest'

// ─── The crowd stays on the road, and the HUD never shows nonsense ───────────
//
// Two bugs that a player sees instantly and a type-checker never will:
//
//   1. survivors strolling straight through the rail and off the edge of the
//      lane, because the formation is a disc around an anchor that is allowed
//      to sit closer to the barrier than the disc's own radius;
//   2. `NaN` rendered into a HUD pill, which reads as a broken game even when
//      the simulation underneath is perfectly healthy.
//
// Both are now structurally impossible, and this file is what keeps them so.

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

const advance = (game: Game, steps: number): void => {
  for (let i = 0; i < steps; i++) game.step(16)
}

describe('the crowd behaves like a swarm against the rail, not a ghost through it', () => {
  it('never lets a single survivor stand off the road, at any squad size', async () => {
    const game = await importGame()
    const { LANE_HALF, UNIT_R } = await import('@/game/survival')
    const edge = LANE_HALF - UNIT_R

    game.startStage(4)
    game.debugAddUnits(320)

    // Slam the thumb into each rail in turn and hold it there. This is the
    // exact input that used to push half the formation over the edge.
    for (const side of [1, -1]) {
      game.steerTo(side * LANE_HALF * 2) // deliberately past the clamp
      advance(game, 240)
      for (const u of game.getUnits()) {
        expect(Math.abs(u.x), `a survivor stood at x=${u.x.toFixed(2)}`)
          .toBeLessThanOrEqual(edge + 1e-6)
      }
    }
  })

  it('lengthens along the lane instead of stacking on the barrier', async () => {
    const game = await importGame()
    const { LANE_HALF } = await import('@/game/survival')

    const depthOf = (steerX: number): number => {
      game.startStage(4)
      game.debugAddUnits(260)
      game.steerTo(steerX)
      advance(game, 240)
      const alive = game.getUnits().filter((u) => u.dying <= 0)
      const ys = alive.map((u) => u.y)
      return Math.max(...ys) - Math.min(...ys)
    }

    const centred = depthOf(0)
    const pinned = depthOf(LANE_HALF * 2)

    // A crowd with nowhere left to go sideways spreads down the road. Without
    // the redistribution it would simply pile into a hard vertical line ON the
    // rail, which is the same visual bug wearing a different hat.
    expect(pinned).toBeGreaterThan(centred * 1.15)
  })
})

describe('the HUD can never be handed a number it cannot render', () => {
  it('keeps the run fire rate finite and in band whatever it is fed', async () => {
    const game = await importGame()
    const { MAX_FIRE_RATE, BASE_FIRE_RATE } = await import('@/game/survival')

    game.startStage(1)
    expect(game.runFireRate.value).toBe(BASE_FIRE_RATE)

    game.debugAddFireRate(Number.NaN)
    expect(Number.isFinite(game.runFireRate.value)).toBe(true)

    game.debugAddFireRate(Number.POSITIVE_INFINITY)
    expect(game.runFireRate.value).toBe(MAX_FIRE_RATE)

    game.debugAddFireRate(-999)
    expect(game.runFireRate.value).toBeGreaterThan(0)
  })

  it('starts every stage at the meta rate, never at whatever the last run ended on', async () => {
    const game = await importGame()
    const { BASE_FIRE_RATE } = await import('@/game/survival')

    game.startStage(1)
    game.debugAddFireRate(3)
    expect(game.runFireRate.value).toBeGreaterThan(BASE_FIRE_RATE)

    game.startStage(2)
    expect(game.runFireRate.value).toBe(BASE_FIRE_RATE)
  })
})
