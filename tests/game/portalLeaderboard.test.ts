import { afterEach, describe, expect, it, vi } from 'vitest'
import { PORTAL_JOINED_KEY, PORTAL_POSTED_STAGE_KEY } from '@/keys'
import type { PortalBoardAdapter, PortalBoardEntry, PortalBoardMode } from '@/use/usePortalLeaderboard'

/**
 * ─── The portal's own board (Playgama SaaS), beside ours ────────────────────
 *
 * Two halves. The portal layer is platform-agnostic: it posts on a WIN (when
 * the best beats what the portal accepted), enters a first-time player once at
 * stage 0 so they start as the last row, and shows a tab only while the portal
 * hands it rows. The Playgama adapter turns `bridge.leaderboards` into that —
 * and exists mostly because Bridge's SaaS client RESOLVES HTTP errors as data,
 * so the documented `setScore(...).then(success)` calls a missing board a
 * success.
 *
 * Every case loads fresh modules: the layer keeps session state at module
 * scope, exactly as a page load does.
 */

const load = async () => {
  vi.resetModules()
  const state = await import('@/use/useTowerState')
  const portal = await import('@/use/usePortalLeaderboard')
  return { ...portal, state }
}

/** Settle the write queue: a chain of resolved promises, no timers. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

const fakeAdapter = (o: {
  mode?: PortalBoardMode
  submit?: (score: number) => Promise<boolean>
  entries?: () => Promise<PortalBoardEntry[] | null>
} = {}) => {
  const posted: number[] = []
  let reads = 0
  const adapter: PortalBoardAdapter = {
    label: 'Playgama',
    mode: () => o.mode ?? 'in_game',
    submit: async (score) => {
      posted.push(score)
      return o.submit ? o.submit(score) : true
    },
    entries: async () => {
      reads++
      return o.entries ? o.entries() : [{ rank: 1, name: 'Ada', score: 12, isYou: false }]
    }
  }
  return { adapter, posted, reads: () => reads }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('a win posts the new best — and nothing else does', () => {
  it('does nothing — and resolves — with no portal board registered', async () => {
    const { reportPortalBest, joinPortalBoard, portalBoardVisible } = await load()
    await expect(reportPortalBest(12)).resolves.toBeUndefined()
    await expect(joinPortalBoard(0)).resolves.toBeUndefined()
    expect(portalBoardVisible.value).toBe(false)
  })

  it('posts a best once, and remembers it only after the portal accepted it', async () => {
    const { reportPortalBest, setPortalBoard, state } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)

    await reportPortalBest(7)
    await settle()
    expect(fake.posted).toEqual([7])
    expect(state.getState(PORTAL_POSTED_STAGE_KEY, 0)).toBe(7)

    // The same best again, or a lower one, costs nothing.
    await reportPortalBest(7)
    await reportPortalBest(5)
    await settle()
    expect(fake.posted).toEqual([7])
  })

  it('posts every consecutive win — no throttle, a clear is the cadence', async () => {
    const { reportPortalBest, setPortalBoard } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    for (let stage = 1; stage <= 5; stage++) await reportPortalBest(stage)
    await settle()
    expect(fake.posted).toEqual([1, 2, 3, 4, 5])
  })

  it('never double-posts two reports that land in the same tick', async () => {
    const { reportPortalBest, setPortalBoard } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    void reportPortalBest(4)
    void reportPortalBest(4)
    await settle()
    expect(fake.posted).toEqual([4])
  })

  it('retries a post the portal refused on the next win, instead of forgetting it', async () => {
    const { reportPortalBest, setPortalBoard, state } = await load()
    let accept = false
    const fake = fakeAdapter({ submit: async () => accept })
    setPortalBoard(fake.adapter)

    await reportPortalBest(9)
    await settle()
    expect(state.getState(PORTAL_POSTED_STAGE_KEY, 0)).toBe(0)

    accept = true
    await reportPortalBest(9)
    await settle()
    expect(fake.posted).toEqual([9, 9])
    expect(state.getState(PORTAL_POSTED_STAGE_KEY, 0)).toBe(9)
  })

  it('swallows an adapter that throws', async () => {
    const { reportPortalBest, setPortalBoard, state } = await load()
    setPortalBoard(fakeAdapter({ submit: async () => { throw new Error('network') } }).adapter)
    await expect(reportPortalBest(4)).resolves.toBeUndefined()
    expect(state.getState(PORTAL_POSTED_STAGE_KEY, 0)).toBe(0)
  })

  it('never posts where the portal has no board', async () => {
    const { reportPortalBest, joinPortalBoard, setPortalBoard, portalBoardVisible } = await load()
    const fake = fakeAdapter({ mode: 'not_available' })
    setPortalBoard(fake.adapter)
    await joinPortalBoard(0)
    await reportPortalBest(10)
    await settle()
    expect(fake.posted).toEqual([])
    expect(portalBoardVisible.value).toBe(false)
  })

  it('posts a win to a native board (YouTube) but offers no tab — the platform draws it', async () => {
    const { reportPortalBest, setPortalBoard, portalBoardVisible, ensurePortalBoard } = await load()
    const fake = fakeAdapter({ mode: 'native' })
    setPortalBoard(fake.adapter)
    await reportPortalBest(10)
    await ensurePortalBoard()
    await settle()
    expect(fake.posted).toEqual([10])
    expect(fake.reads()).toBe(0)
    expect(portalBoardVisible.value).toBe(false)
  })
})

describe('a first-time player starts as the last row', () => {
  it('is posted once at stage 0 on arrival, and marked as joined', async () => {
    const { joinPortalBoard, setPortalBoard, state } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)

    await joinPortalBoard(0)
    await settle()
    expect(fake.posted).toEqual([0])
    expect(state.getState(PORTAL_JOINED_KEY, false)).toBe(true)

    // Once per PLAYER: the next session's arrival posts nothing.
    await joinPortalBoard(0)
    await settle()
    expect(fake.posted).toEqual([0])
  })

  it('is posted at the real best when the player predates the board', async () => {
    const { joinPortalBoard, setPortalBoard, state } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    await joinPortalBoard(14)
    await settle()
    expect(fake.posted).toEqual([14])
    expect(state.getState(PORTAL_POSTED_STAGE_KEY, 0)).toBe(14)
  })

  it('then posts the first win after the stage-0 row', async () => {
    const { joinPortalBoard, reportPortalBest, setPortalBoard } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    await joinPortalBoard(0)
    await settle()
    await reportPortalBest(1)
    await settle()
    expect(fake.posted).toEqual([0, 1])
  })

  it('coalesces a join and a win that race into ONE post of the higher value', async () => {
    // Each queued write decides what to send when it RUNS, so a win reported
    // before the join went out makes the join carry the win — no pointless 0.
    const { joinPortalBoard, reportPortalBest, setPortalBoard, state } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    void joinPortalBoard(0)
    void reportPortalBest(1)
    await settle()
    expect(fake.posted).toEqual([1])
    expect(state.getState(PORTAL_JOINED_KEY, false)).toBe(true)
  })

  it('joins once the SDK comes up, when the scene asked before it did', async () => {
    const { joinPortalBoard, setPortalBoard } = await load()
    await joinPortalBoard(0)
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    await settle()
    expect(fake.posted).toEqual([0])
  })

  it('never sends a 0 to a native board', async () => {
    const { joinPortalBoard, setPortalBoard } = await load()
    const fake = fakeAdapter({ mode: 'native' })
    setPortalBoard(fake.adapter)
    await joinPortalBoard(0)
    await settle()
    expect(fake.posted).toEqual([])
  })

  it('shows the unplayed player at the bottom of the tab until the portal lists them', async () => {
    const { setPortalBoard, ensurePortalBoard, joinPortalBoard, portalEntries } = await load()
    // The join is refused (a guest the portal has no id for), so the fetched
    // rows never contain this player.
    const fake = fakeAdapter({
      submit: async () => false,
      entries: async () => [
        { rank: 1, name: 'Ace', score: 41, isYou: false },
        { rank: 2, name: 'Bex', score: 9, isYou: false }
      ]
    })
    setPortalBoard(fake.adapter)
    await joinPortalBoard(0)
    await ensurePortalBoard()
    expect(portalEntries.value.at(-1)).toEqual({ rank: 3, name: '', score: 0, isYou: true, local: true })
  })

  it('shares the rank of others already sitting on stage 0', async () => {
    const { setPortalBoard, ensurePortalBoard, portalEntries } = await load()
    setPortalBoard(fakeAdapter({
      entries: async () => [
        { rank: 1, name: 'Ace', score: 41, isYou: false },
        { rank: 2, name: 'Zed', score: 0, isYou: false }
      ]
    }).adapter)
    await ensurePortalBoard()
    expect(portalEntries.value.at(-1)).toMatchObject({ rank: 2, isYou: true, local: true })
  })

  it('draws no local row once the portal lists the player, or once they have a best', async () => {
    const { setPortalBoard, ensurePortalBoard, reportPortalBest, portalEntries } = await load()
    let rows: PortalBoardEntry[] = [{ rank: 1, name: 'Me', score: 0, isYou: true }]
    setPortalBoard(fakeAdapter({ entries: async () => rows }).adapter)
    await ensurePortalBoard()
    expect(portalEntries.value).toEqual(rows)

    // A player with a real best outside a truncated list is NOT drawn as last.
    rows = [{ rank: 1, name: 'Ace', score: 41, isYou: false }]
    await reportPortalBest(3)
    await settle()
    await ensurePortalBoard()
    expect(portalEntries.value).toEqual(rows)
  })
})

describe('reads: a tab while there are rows, nothing when there are not', () => {
  it('reads once per session, and again only after the player posted', async () => {
    const { setPortalBoard, ensurePortalBoard, reportPortalBest, portalEntries, portalBoardVisible } = await load()
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    expect(portalBoardVisible.value).toBe(true)

    await ensurePortalBoard()
    await ensurePortalBoard()
    expect(fake.reads()).toBe(1)
    expect(portalEntries.value.map((e) => e.name)).toContain('Ada')

    await reportPortalBest(3)
    await settle()
    await ensurePortalBoard()
    expect(fake.reads(), 'the new row should be visible on the next open').toBe(2)
  })

  it('hides the tab when the answer was not a board, and brings it back on a good read', async () => {
    const { setPortalBoard, ensurePortalBoard, portalBoardVisible } = await load()
    let rows: PortalBoardEntry[] | null = null
    setPortalBoard(fakeAdapter({ entries: async () => rows }).adapter)

    await ensurePortalBoard()
    expect(portalBoardVisible.value).toBe(false)

    rows = []
    await ensurePortalBoard()
    expect(portalBoardVisible.value).toBe(true)
  })

  it('hides the tab on a read that throws, without rejecting', async () => {
    const { setPortalBoard, ensurePortalBoard, portalBoardVisible } = await load()
    setPortalBoard(fakeAdapter({ entries: async () => { throw new Error('offline') } }).adapter)
    await expect(ensurePortalBoard()).resolves.toBeUndefined()
    expect(portalBoardVisible.value).toBe(false)
  })
})

describe('reportRun no longer touches the portal board', () => {
  it('leaves posting to the win dispatch', async () => {
    vi.stubEnv('VITE_LEADERBOARD_URL', '')
    vi.stubGlobal('fetch', vi.fn())
    const { setPortalBoard } = await load()
    const { reportRun } = await import('@/use/useLeaderboard')
    const fake = fakeAdapter()
    setPortalBoard(fake.adapter)
    await reportRun(8, 120, { force: true })
    await settle()
    expect(fake.posted).toEqual([])
  })
})

// ─── The Playgama adapter ────────────────────────────────────────────────────

const loadAdapter = async () => {
  vi.resetModules()
  return await import('@/utils/playgamaLeaderboard')
}

const fakeBridge = (lb: Record<string, unknown> | null, playerId: string | null = 'p-2') => ({
  leaderboards: lb,
  player: { id: playerId }
})

describe('the Playgama adapter', () => {
  it('reads an unknown board (404 resolved as data) as a failure, and latches off', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setScore = vi.fn(async () => ({ statusCode: 404, message: 'Leaderboard not found' }))
    const adapter = createPlaygamaBoardAdapter(fakeBridge({ type: 'in_game', setScore }), 'survivalist_2026')

    expect(adapter.mode()).toBe('in_game')
    expect(await adapter.submit(12)).toBe(false)
    expect(adapter.mode(), 'a board that does not exist must not be retried all session').toBe('not_available')
    expect(await adapter.submit(13)).toBe(false)
    expect(setScore).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('Playgama developer dashboard')
  })

  it('latches off on a missing token, but NOT on any other 400 — the stage-0 join may be one', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tokenless = createPlaygamaBoardAdapter(fakeBridge({
      type: 'in_game', setScore: async () => ({ statusCode: 400, message: 'public token is not set' })
    }), 'b')
    expect(await tokenless.submit(1)).toBe(false)
    expect(tokenless.mode()).toBe('not_available')

    const refused = createPlaygamaBoardAdapter(fakeBridge({
      type: 'in_game', setScore: async () => ({ statusCode: 400, message: 'score must be positive' })
    }), 'b')
    expect(await refused.submit(0)).toBe(false)
    expect(refused.mode()).toBe('in_game')
  })

  it('does not latch off on a server error — that is worth another try', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    const setScore = vi.fn(async () => ({ statusCode: 503, message: 'busy' }))
    const adapter = createPlaygamaBoardAdapter(fakeBridge({ type: 'in_game', setScore }), 'b')
    expect(await adapter.submit(1)).toBe(false)
    expect(adapter.mode()).toBe('in_game')
  })

  it('treats a non-array getEntries answer as no board', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const lb = { type: 'in_game', getEntries: async () => ({ statusCode: 404, message: 'Application not found' }) }
    expect(await createPlaygamaBoardAdapter(fakeBridge(lb), 'b').entries()).toBeNull()
    const odd = { type: 'in_game', getEntries: async () => 'not a board' }
    expect(await createPlaygamaBoardAdapter(fakeBridge(odd), 'b').entries()).toBeNull()
  })

  it('maps the rows, marks the player by portal id, and drops junk', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    const lb = {
      type: 'in_game',
      getEntries: async () => [
        { id: 'p-2', name: ' Bex ', score: '30', rank: 2, photo: '' },
        null,
        { id: 'p-1', name: 'Ace', score: 41, rank: 1 },
        { id: 'p-3', score: 7 }
      ]
    }
    const rows = await createPlaygamaBoardAdapter(fakeBridge(lb), 'b').entries()
    expect(rows).toEqual([
      { rank: 1, name: 'Ace', score: 41, isYou: false },
      { rank: 2, name: 'Bex', score: 30, isYou: true },
      { rank: 3, name: '', score: 7, isYou: false }
    ])
  })

  it('never marks a row as yours when the portal has no player id', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    const lb = { type: 'in_game', getEntries: async () => [{ id: '', name: 'Ace', score: 1, rank: 1 }] }
    const rows = await createPlaygamaBoardAdapter(fakeBridge(lb, ''), 'b').entries()
    expect(rows![0]!.isYou).toBe(false)
  })

  it('counts a native (YouTube) setScore that resolves nothing as a success', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    const setScore = vi.fn(async () => undefined)
    const adapter = createPlaygamaBoardAdapter(fakeBridge({ type: 'native', setScore }), 'survivalist_2026')
    expect(adapter.mode()).toBe('native')
    expect(await adapter.submit(5)).toBe(true)
    expect(setScore).toHaveBeenCalledWith('survivalist_2026', 5)
  })

  it('reports no board at all when the bridge has no leaderboards module', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    const adapter = createPlaygamaBoardAdapter(fakeBridge(null), 'b')
    expect(adapter.mode()).toBe('not_available')
    expect(await adapter.submit(5)).toBe(false)
    expect(await adapter.entries()).toBeNull()
  })

  it('reads an unexpected type as not_available', async () => {
    const { createPlaygamaBoardAdapter } = await loadAdapter()
    expect(createPlaygamaBoardAdapter(fakeBridge({ type: 'something_new' }), 'b').mode()).toBe('not_available')
  })
})
