import { beforeEach, describe, expect, it } from 'vitest'
import { bossOwnsCast, type CastKind } from '@/game/bossTells'

/**
 * ─── A dead boss stops promising things ─────────────────────────────────────
 *
 * Every tell in this game is a promise: a ring that says something lands here, a
 * band that says leave this column, three furrows that say stand in the gaps.
 * The boss cannot keep any of them once it is dead, so they come off the road on
 * the frame the kill lands — otherwise the player is being asked to dodge a
 * thing that is not coming, by a thing that is not there.
 *
 * It has two halves and they fail in opposite directions.
 *
 *   THE SIMULATION already knew. Every tell accessor gates on `!b.dead`, so a
 *   dead boss announces nothing — that is what the second block pins, because
 *   it is the half a future kind is most likely to forget to wire up.
 *
 *   THE RENDERER keeps ONE pool for every wind-up in the game, and most of what
 *   is in it belongs to a MINIBOSS. Clearing the pool on a boss death is the
 *   obvious implementation and it is wrong: it deletes a bomber's fuse and a
 *   gunner's line mid-flight, in an arena a summoner is actively spawning into.
 *   `bossOwnsCast` is the rule that keeps those apart, and the first block pins
 *   it — including the two entries that are easy to get backwards.
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

describe('which wind-ups belong to the boss', () => {
  it('claims the three the boss actually casts, and nothing else', () => {
    // All three come out of `aimBoss` and nowhere else.
    for (const kind of ['meteor', 'charge', 'shock'] as const) {
      expect(bossOwnsCast(kind), `${kind} stopped being the boss's`).toBe(true)
    }
  })

  it('leaves every miniboss wind-up alone', () => {
    // The failure this exists to stop: a boss dies in an arena a summoner is
    // spawning into, and the renderer wipes the bomber's fuse that is about to
    // go off under the crowd.
    for (const kind of ['bomb', 'bolt', 'slice'] as const) {
      expect(bossOwnsCast(kind), `${kind} was taken for the boss's`).toBe(false)
    }
  })

  it('does NOT claim the healer\'s ward, which is taken down another way', () => {
    // It is the boss's tell, and it is still false here on purpose. `killBoss`
    // ends it through `clearWard`, which announces a `wardEnd` so the renderer
    // can FADE the circle out on the death frame. Claiming it here as well
    // would replace that fade with a jump cut, and would do it by racing two
    // code paths at the same mark on the road.
    expect(bossOwnsCast('ward')).toBe(false)
  })

  it('is total over the union, so a new kind cannot default into a side', () => {
    // The compiler enforces this (an unhandled case falls out of the switch with
    // no return and fails `noImplicitReturns`); this is the runtime half, and it
    // is what catches a kind added to the union and answered `undefined`.
    const every: CastKind[] = ['meteor', 'slice', 'bomb', 'bolt', 'charge', 'shock', 'ward']
    for (const kind of every) {
      expect(typeof bossOwnsCast(kind), `${kind} has no answer`).toBe('boolean')
    }
  })
})

/** Walk a stage into its arena and kill the boss outright. */
const killTheBoss = (game: Game, stage: number): void => {
  game.startStage(stage)
  game.debugAddUnits(700)
  game.debugAddDamage(4000)
  game.debugAddFireRate(8)
  game.debugSkipToArena()
  for (let i = 0; i < 12_000; i++) {
    game.step(STEP_MS)
    const b = game.getBoss()
    if (b && b.dead) return
    if (game.phase.value === 'wipe') break
  }
  throw new Error('the boss never died')
}

describe('a boss that is down announces nothing', () => {
  // Four kinds, four different tells — and each reads its own state, so each is
  // its own chance to forget the `dead` guard. `BOSS_POOL` cycles by stage from
  // `THREAT_POOL_FROM_STAGE`, so these four cover all of them.
  for (const stage of [5, 6, 7, 8]) {
    it(`is silent the frame it dies on stage ${stage}`, async () => {
      const game = await importGame()
      killTheBoss(game, stage)

      const b = game.getBoss()
      expect(b?.dead, 'the boss is not actually dead').toBe(true)

      // The corner alarm. This is the one the player sees, and before the
      // `<Transition>` fix in `ControlHint`/`IncomingWarning` a badge raised
      // here would have stayed on screen for the rest of the run even once this
      // went false.
      expect(game.attackIncoming(), 'the alarm is still up over a corpse').toBe(false)

      // …and the three states the renderer reads to decide whether to paint a
      // band, a ring or an eye.
      expect(game.bossIsCharging(), 'a charge is still telegraphed').toBe(false)
      expect(game.bossIsVarying(), 'a second verb is still telegraphed').toBe(false)
      expect(game.bossGazeOpening(), 'the eye is still open').toBe(0)
      expect(game.bossGazeWatching(), 'the eye is still watching').toBe(false)

      // Held for a few seconds, because the celebration holds the screen for
      // two (`BOSS_FELLED_MS`) — a tell that came back inside that window would
      // be pointing at a body.
      for (let i = 0; i < 200; i++) {
        game.step(STEP_MS)
        expect(game.attackIncoming(), 'an attack was announced after the kill').toBe(false)
        expect(game.bossIsCharging()).toBe(false)
        expect(game.bossGazeOpening()).toBe(0)
      }
    }, 60_000)
  }
})
