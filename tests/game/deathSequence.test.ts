import { beforeEach, describe, expect, it } from 'vitest'
import { SURVIVOR_REST_MS, WASTED_HOLD_MS, WASTED_ZOOM } from '@/game/survival'

/**
 * ─── The three seconds after a run ends ─────────────────────────────────────
 *
 * The oldest open finding in the project, filed twice in a row by two separate
 * five-tester playtests in the same words: "still nothing says what killed you."
 * The result screen has always had the answer — every death is billed to a cause
 * and the `wipe` analytics event has been sending it for months — but it arrived
 * so fast that four of five testers never connected it to anything they had
 * watched happen. The last thing on the road was always a card.
 *
 * The fix is two halves, and this file pins the half that lives in the
 * simulation. The scene's half — the lean, the dimming, the word — is CSS and a
 * timer, and its only load-bearing numbers are exported constants checked at the
 * bottom.
 *
 * WHAT THE SIMULATION OWES THE HOLD:
 *
 *   THE BODIES HAVE LANDED     `step` returns on `'wipe'`, so the frame the
 *                              player is held on is frozen forever. Anyone still
 *                              mid-fall at that moment would be frozen mid-fall
 *                              — on the LAST death, at frame zero: a survivor
 *                              standing upright on an empty road for three
 *                              seconds, which is the opposite of the point.
 *   THE CAUSE IS ON THE SUMMARY  Billed to whatever took the most survivors, not
 *                              to whatever landed last, and null on a clear.
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

/** Run a stage with a crowd that cannot win until the sim calls it. */
const loseStage = (game: Game, stage: number): void => {
  game.startStage(stage)
  for (let i = 0; i < 60_000; i++) {
    game.step(STEP_MS)
    if (game.phase.value === 'wipe' || game.phase.value === 'clear') break
  }
}

describe('the wipe leaves a road the player can read', () => {
  it('puts every faller on the ground before the world stops', async () => {
    const game = await importGame()
    // A late stage with real obstacles on it, so the run ends on a road rather
    // than by walking into a tutorial boss.
    game.startStage(9)
    for (let i = 0; i < 60_000; i++) {
      game.step(STEP_MS)
      if (game.phase.value === 'wipe') break
    }
    expect(game.phase.value, 'the run never ended').toBe('wipe')

    const units = game.getUnits()
    expect(units.length, 'nothing was left on the road at all').toBeGreaterThan(0)
    // The whole assertion: nobody is mid-animation. A body is either alive (and
    // there are none, or the run would not be over) or resting.
    for (const u of units) {
      expect(
        u.dying > 0 && !u.down,
        'a survivor was frozen part-way through their fall for the whole hold'
      ).toBe(false)
      if (u.dying > 0) expect(u.dying).toBe(SURVIVOR_REST_MS)
    }
  })

  it('steps nothing at all once the squad is gone, so the frame holds still', async () => {
    const game = await importGame()
    loseStage(game, 9)
    expect(game.phase.value).toBe('wipe')

    const before = game.getUnits().map((u) => `${u.x.toFixed(5)}|${u.y.toFixed(5)}|${u.dying}`)
    // Three seconds of the scene's own RAF loop calling into a stopped world.
    for (let i = 0; i < Math.ceil(WASTED_HOLD_MS / STEP_MS); i++) game.step(STEP_MS)
    const after = game.getUnits().map((u) => `${u.x.toFixed(5)}|${u.y.toFixed(5)}|${u.dying}`)
    expect(after, 'the road moved under a screen that is supposed to be stopped').toEqual(before)
  })
})

describe('the summary says what killed the run', () => {
  it('bills a loss to a cause', async () => {
    const game = await importGame()
    loseStage(game, 9)
    expect(game.phase.value).toBe('wipe')

    const s = game.runSummary()
    expect(s.cleared).toBe(false)
    expect(s.cause, 'a wipe arrived at the result screen with nothing to say').toBeTruthy()
    // …and it is a cause from the vocabulary, not a stray string.
    expect([
      'foe', 'elite', 'barricade', 'crate', 'divider', 'trap', 'slam'
    ]).toContain(s.cause)
  })

  it('bills it to the system that took the MOST, not the one that landed last', async () => {
    const game = await importGame()
    loseStage(game, 9)
    const s = game.runSummary()
    const breakdown = game.deathBreakdown()
    const top = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0]
    expect(s.cause).toBe(top![0])
  })

  it('says nothing about a stage that was cleared', async () => {
    const game = await importGame()
    game.startStage(2)
    game.debugAddUnits(700)
    game.debugAddDamage(400)
    game.debugAddFireRate(6)
    game.debugSkipToArena()
    for (let i = 0; i < 9000; i++) {
      game.step(STEP_MS)
      if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
    }
    expect(game.phase.value).toBe('clear')
    // Survivors died on the way to that arena; the screen still has nothing to
    // explain, and an info box on a win would read as a scolding.
    expect(game.runSummary().cause).toBeNull()
  })
})

describe('the hold is tuned, not invented per call site', () => {
  it('gives the loss longer than the win, and leans in gently', () => {
    // A win is a reward and must not be made to wait; a loss is a lesson, and
    // the lesson is the thing being sold. And the zoom is small on purpose — a
    // hard push on a phone reads as a glitch rather than as a camera.
    expect(WASTED_HOLD_MS).toBeGreaterThan(2000)
    expect(WASTED_ZOOM).toBeGreaterThan(1)
    expect(WASTED_ZOOM).toBeLessThan(1.3)
  })
})
