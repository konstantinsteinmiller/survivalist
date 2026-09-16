import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BoardSnapshot } from '@/use/leaderboardSnapshot'

/**
 * ─── A first-time player starts LAST, where the build opts in ───────────────
 *
 * By default a player who has cleared nothing has no rank at all: `rankFor(0)`
 * is 0 and the chip hides, because the alternative the rule was written against
 * was worse — the histogram walk hands score 0 an `above + 1` of #1 on an empty
 * board. On the Playgama build (`VITE_LEADERBOARD_UNPLAYED_LAST=true`) they are
 * placed instead: behind everyone, `total + 1`, and counted into the population
 * so the chip does not read "#7,832 of 7,831".
 */

const SNAPSHOT: BoardSnapshot = {
  fetchedAt: 1,
  source: 'seeded:retention-curve',
  updatedAt: 1,
  total: 7831,
  entries: [{ rank: 1, name: 'Ace', score: 49, squad: 900 }],
  dist: [[49, 1], [10, 830], [1, 7000]]
} as unknown as BoardSnapshot

const load = async (flag: 'true' | '' , snapshot: BoardSnapshot | null = SNAPSHOT) => {
  vi.stubEnv('VITE_LEADERBOARD_URL', '')
  vi.stubEnv('VITE_LEADERBOARD_UNPLAYED_LAST', flag)
  vi.stubGlobal('fetch', vi.fn())
  vi.resetModules()
  vi.doMock('@/use/leaderboardSnapshot', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/use/leaderboardSnapshot')>()),
    boardSnapshot: snapshot
  }))
  return await import('@/use/useLeaderboard')
}

afterEach(() => {
  vi.doUnmock('@/use/leaderboardSnapshot')
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('an unplayed player', () => {
  it('ranks last of a population that includes them, on a build that opts in', async () => {
    const lb = await load('true')
    expect(lb.rankFor(0)).toBe(7832)
    expect(lb.rankTotalFor(0)).toBe(7832)
  })

  it('keeps the population unchanged once they have a best', async () => {
    const lb = await load('true')
    expect(lb.rankFor(1)).toBe(832)
    expect(lb.rankTotalFor(1)).toBe(7831)
  })

  it('still has no rank by default — a fresh install is never congratulated as #1', async () => {
    const lb = await load('')
    expect(lb.rankFor(0)).toBe(0)
    expect(lb.rankTotalFor(0)).toBe(7831)
  })

  it('has no rank when there is no board to be last on', async () => {
    const lb = await load('true', null)
    expect(lb.rankFor(0)).toBe(0)
    expect(lb.rankTotalFor(0)).toBe(0)
  })
})
