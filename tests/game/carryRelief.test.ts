/**
 * ─── The relief that arrives before the first loss ──────────────────────────
 *
 * Every other concession in the game is paid out on a FAILURE, and a failure is
 * a late signal. A beginner who finishes stage 1 with four survivors out of a
 * possible forty has not lost anything, so the failure ledger has nothing to
 * read, and stage 2 opens at the difficulty built for the player who finished
 * stage 1 thirty strong. That player is the one the funnel loses.
 *
 * So a badly-played stage makes the NEXT one softer, in proportion — down to a
 * quarter off every enemy on the road. Three things have to hold, and each has
 * a way of going wrong that looks correct from the outside:
 *
 *   IT READS THE RIGHT RUN.   Keyed to the stage immediately before, so a
 *     record left by some other stage cannot pay out on this one.
 *   IT COSTS A PLAYER NOTHING WHEN THEY PLAYED WELL. A concession that fires
 *     on an ordinary run is not relief, it is a difficulty cut.
 *   IT IS NOT A WAY TO PLAY THE GAME. An idle tab clears stage 1 often enough;
 *     without a gate on it, a run that never touches the screen banks a
 *     terrible score, collects a quarter off stage 2, and walks the campaign on
 *     concessions it never earned. Measured, exactly that took a zero-input
 *     career from stage 3 to stage 5.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CARRY_PERF_FINE, CARRY_PERF_POOR, CARRY_RELIEF_FLOOR, carryReliefFor
} from '@/game/survival'
import { LAST_PERF_KEY } from '@/keys'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/** The health of the first enemy stage `n` puts on the road. */
const firstFoeHp = (game: Game, n: number): number => {
  game.startStage(n)
  for (let i = 0; i < 900 && game.getFoes().length === 0; i++) game.step(STEP_MS)
  return game.getFoes()[0]?.maxHp ?? -1
}

describe('the curve', () => {
  it('pays nothing to a run that went fine, and a quarter to one that scraped', () => {
    expect(carryReliefFor(1)).toBe(1)
    expect(carryReliefFor(CARRY_PERF_FINE)).toBe(1)
    expect(carryReliefFor(CARRY_PERF_POOR)).toBe(CARRY_RELIEF_FLOOR)
    expect(carryReliefFor(0)).toBe(CARRY_RELIEF_FLOOR)
  })

  it('is a line between them, so there is no threshold worth gaming', () => {
    const mid = (CARRY_PERF_POOR + CARRY_PERF_FINE) / 2
    const half = CARRY_RELIEF_FLOOR + (1 - CARRY_RELIEF_FLOOR) / 2
    expect(carryReliefFor(mid)).toBeCloseTo(half, 5)
    // Monotone all the way up: a better stage is never punished with a harder
    // next one, which a non-monotone curve would quietly do.
    let prev = 0
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const v = carryReliefFor(p)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it('treats a missing or nonsense reading as "fine"', () => {
    // Relief handed out on no evidence is just a difficulty cut.
    expect(carryReliefFor(Number.NaN)).toBe(1)
    expect(carryReliefFor(Number.POSITIVE_INFINITY)).toBe(1)
  })
})

describe('the reading it is keyed to', () => {
  it('softens the next stage, and only the next stage', async () => {
    const game = await importGame()
    const full = firstFoeHp(game, 2)
    expect(full).toBeGreaterThan(0)

    const { setStates } = await import('@/use/useTowerState')
    setStates({ [LAST_PERF_KEY]: { stage: 1, perf: 0 } })
    const relieved = firstFoeHp(game, 2)
    expect(relieved).toBeLessThan(full)
    // The real multiplier, off a real enemy. One HP of tolerance because both
    // sides are rounded and only one of them is rounded here.
    expect(Math.abs(relieved - full * CARRY_RELIEF_FLOOR)).toBeLessThanOrEqual(1)

    // A record left by a stage that is not the one before this pays nothing.
    setStates({ [LAST_PERF_KEY]: { stage: 4, perf: 0 } })
    expect(firstFoeHp(game, 2)).toBe(full)
  })

  it('pays nothing on a stage that was played well', async () => {
    const game = await importGame()
    const full = firstFoeHp(game, 3)
    const { setStates } = await import('@/use/useTowerState')
    setStates({ [LAST_PERF_KEY]: { stage: 2, perf: 0.9 } })
    expect(firstFoeHp(game, 3)).toBe(full)
  })

  it('lets go past the stages it is scoped to', async () => {
    // Past the opening five the shop is the answer to a hard stage, and a road
    // that softens itself whenever a player has an off day never gets anywhere.
    const game = await importGame()
    const full = firstFoeHp(game, 7)
    const { setStates } = await import('@/use/useTowerState')
    setStates({ [LAST_PERF_KEY]: { stage: 6, perf: 0 } })
    expect(firstFoeHp(game, 7)).toBe(full)
  })
})

describe('the record it reads', () => {
  it('is not written by a run that never touched the screen', async () => {
    const game = await importGame()
    const { getState } = await import('@/use/useTowerState')

    game.startStage(1)
    // Clear the stage without ever steering: `debugSkipToArena` plus a crowd
    // big enough to delete the boss is the fastest honest version of an idle
    // tab that happens to survive the tutorial.
    game.debugAddUnits(400)
    game.debugSkipToArena()
    for (let i = 0; i < 9000 && (game.phase.value === 'boss' || game.phase.value === 'run'); i++) game.step(STEP_MS)
    expect(game.phase.value, 'the probe never finished the stage').toBe('clear')

    expect(
      getState(LAST_PERF_KEY, null),
      'an idle tab banked a score and bought itself relief'
    ).toBeNull()
  })

  it('is written by a run somebody played', async () => {
    const game = await importGame()
    const { getState } = await import('@/use/useTowerState')

    game.startStage(1)
    // A real thumb: four meaningful steers is what `wasPlayed` asks for.
    game.steerTo(-2)
    game.steerTo(2)
    game.steerTo(-1)
    game.steerTo(1.5)
    game.debugAddUnits(400)
    game.debugSkipToArena()
    for (let i = 0; i < 9000 && (game.phase.value === 'boss' || game.phase.value === 'run'); i++) game.step(STEP_MS)
    expect(game.phase.value).toBe('clear')

    const rec = getState<{ stage: number; perf: number } | null>(LAST_PERF_KEY, null)
    expect(rec, 'a played run left no reading for the next stage').not.toBeNull()
    expect(rec!.stage).toBe(1)
    expect(rec!.perf).toBeGreaterThan(0)
  })
})
