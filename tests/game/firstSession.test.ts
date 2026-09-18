// ─── The first session, kept on the road ────────────────────────────────────
//
// Three of the 2026-09-18 fit-test changes, pinned where they can be pinned
// without a canvas:
//
//   • the stage-1 boss's second wind — a first-timer wiped in that arena gets
//     120 % of the crowd that walked in and the SAME fight goes on;
//   • stage 2's target practice — four creeps laid out for the first boss's
//     launcher, spawned only while a weapon is armed;
//   • the boss teaser — every boss body the campaign can show has a name.
//
// (The interstitial floor is pinned in `tests/platforms/adGate.test.ts`.)

import { beforeEach, describe, expect, it } from 'vitest'
import { BOSS_ONE_RALLY_SHARE, bossOneRally } from '@/game/secondWind'
import { buildTrack } from '@/game/track'
import { bossDesign } from '@/game/foes'
import { BOSS_REWARD_KEY } from '@/keys'
import en from '@/i18n/locales/en'

const STEP_MS = 1000 / 60

type Game = typeof import('@/use/useSurvivalGame')

const importGame = async (): Promise<Game> => {
  const state = await import('@/use/useTowerState')
  state.__resetTowerState()
  return import('@/use/useSurvivalGame')
}

beforeEach(() => { localStorage.clear() })

describe('the stage-1 boss second wind, as a rule', () => {
  const ask = (o: Partial<{ stage: number; phase: string; arrivedAtBoss: number }> = {}) =>
    ({ stage: 1, phase: 'boss', arrivedAtBoss: 40, ...o })

  it('hands a first-timer a fifth more than walked into the arena', () => {
    expect(BOSS_ONE_RALLY_SHARE).toBe(1.2)
    expect(bossOneRally(ask(), 0)).toBe(48)
    // Rounded UP: a crowd of 7 is handed 9, never 8.
    expect(bossOneRally(ask({ arrivedAtBoss: 7 }), 0)).toBe(9)
  })

  it('covers nobody who has ever cleared stage 1', () => {
    expect(bossOneRally(ask(), 1)).toBe(0)
    expect(bossOneRally(ask(), 12)).toBe(0)
  })

  it('covers only the stage-1 ARENA — not the road, not stage 2', () => {
    expect(bossOneRally(ask({ phase: 'run' }), 0)).toBe(0)
    expect(bossOneRally(ask({ stage: 2 }), 0)).toBe(0)
    expect(bossOneRally(ask({ arrivedAtBoss: 0 }), 0)).toBe(0)
  })
})

describe('the stage-1 boss second wind, in the sim', () => {
  /** Into the stage-1 arena with a boss up and a known crowd. */
  const inArena = async (): Promise<{ game: Game; arrived: number }> => {
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(30)
    game.debugSkipToArena()
    for (let i = 0; i < 600 && !game.getBoss(); i++) game.step(STEP_MS)
    expect(game.getBoss()).not.toBeNull()
    expect(game.phase.value).toBe('boss')
    return { game, arrived: game.squadCount.value }
  }

  const wipe = (game: Game): void => {
    for (const u of game.getUnits()) game.__killUnitForTest(u)
  }

  it('turns a wipe in the arena into the same fight, with 120 % of the crowd', async () => {
    const { game, arrived } = await inArena()
    game.setRallyPolicy((a) => bossOneRally(a, 0))
    const boss = game.getBoss()!
    const hpBefore = boss.hp

    wipe(game)
    for (let i = 0; i < 90 && game.rallies.value === 0; i++) game.step(STEP_MS)

    expect(game.rallies.value).toBe(1)
    expect(game.phase.value).toBe('boss')
    expect(game.squadCount.value).toBe(Math.ceil(arrived * 1.2))
    // The same boss, not a fresh one: its bar did not refill.
    expect(game.getBoss()).toBe(boss)
    expect(boss.hp).toBeLessThanOrEqual(hpBefore)
    game.setRallyPolicy(null)
  })

  it('does it again on the next wipe, priced off the SAME arrival', async () => {
    const { game, arrived } = await inArena()
    game.setRallyPolicy((a) => bossOneRally(a, 0))
    for (let round = 1; round <= 2; round++) {
      wipe(game)
      for (let i = 0; i < 90 && game.rallies.value < round; i++) game.step(STEP_MS)
      expect(game.rallies.value).toBe(round)
      expect(game.squadCount.value).toBe(Math.ceil(arrived * 1.2))
    }
    game.setRallyPolicy(null)
  })

  it('lets the wipe stand for a player who has cleared stage 1 before', async () => {
    const { game } = await inArena()
    game.setRallyPolicy((a) => bossOneRally(a, 1))
    wipe(game)
    for (let i = 0; i < 90 && game.phase.value !== 'wipe'; i++) game.step(STEP_MS)
    expect(game.rallies.value).toBe(0)
    expect(game.phase.value).toBe('wipe')
    game.setRallyPolicy(null)
  })
})

describe("stage 2's target practice", () => {
  const gifted = () => buildTrack(2).events.filter(
    (e): e is Extract<typeof e, { kind: 'foes' }> => e.kind === 'foes' && e.forGift === true
  )

  it('is four creeps, right after the first bank, before the first husks', () => {
    const packs = gifted()
    expect(packs.reduce((n, e) => n + e.count, 0)).toBe(4)
    for (const e of packs) {
      expect(e.typeId).toBe('creep')
      expect(e.y).toBeGreaterThan(14)
      expect(e.y).toBeLessThan(40)
    }
    // Nowhere else in the campaign.
    for (const stage of [1, 3, 4, 5, 9, 20]) {
      expect(buildTrack(stage).events.some((e) => e.kind === 'foes' && e.forGift === true)).toBe(false)
    }
  })

  const creepsSpawnedBy = async (withLauncher: boolean): Promise<number> => {
    const state = await import('@/use/useTowerState')
    state.__resetTowerState()
    if (withLauncher) state.setState(BOSS_REWARD_KEY, true)
    const game = await import('@/use/useSurvivalGame')
    game.startStage(2)
    let most = 0
    for (let i = 0; i < 240; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
      const near = game.getFoes().filter((f) => f.typeId === 'creep' && f.y < 40).length
      most = Math.max(most, near)
    }
    return most
  }

  it('spawns for a player holding the launcher, and not for one without it', async () => {
    expect(await creepsSpawnedBy(true)).toBe(4)
    expect(await creepsSpawnedBy(false)).toBe(0)
  })
})

describe('the boss teaser', () => {
  it('has a name for every boss body the campaign shows', () => {
    const names = (en as { flow: { bossName: Record<string, string> } }).flow.bossName
    for (let stage = 1; stage <= 90; stage++) {
      const design = bossDesign(stage)
      expect(names[design], `stage ${stage}: ${design}`).toBeTruthy()
    }
  })
})
