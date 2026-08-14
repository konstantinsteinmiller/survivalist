import { afterEach, describe, expect, it, vi } from 'vitest'
import { POSTED_NAME_KEY, PLAYER_NAME_KEY, SUBMITTED_STAGE_KEY } from '@/keys'

/**
 * ─── The board's quota contract ─────────────────────────────────────────────
 *
 * The leaderboard runs on a free-tier Cloudflare Worker over D1, and the client
 * is the only thing standing between that and a bill. Two rules carry the whole
 * design, and neither is visible in a screenshot:
 *
 *   READ ONCE PER PAGE LOAD.   WRITE ONLY ON A PERSONAL RECORD.
 *
 * A player grinding stage 30 for an hour must cost exactly one edge-cached GET.
 * Everything here exists to pin that down, plus the other half of the contract:
 * the board is a decoration, so a dead endpoint has to end in "no rank shown"
 * and never in a rejected promise on the path that ends a run.
 *
 * Every case re-imports the module under `vi.resetModules()` because the
 * endpoint is read from `import.meta.env` ONCE, at module scope — which is
 * exactly how a build with no endpoint ships with no leaderboard at all.
 */

const ENDPOINT = 'https://board.example.test'

interface Sent {
  url: string
  method: string
  body: Record<string, unknown> | null
  headers: Record<string, string>
}

const sent: Sent[] = []

/** Minimal `Response` stand-in — the module only ever reads `ok` and `json()`. */
const reply = (body: unknown, ok = true): Response =>
  ({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as Response

/** A published table with a deliberate TIE at the top and a `total` far larger
 *  than the number of published rows, so "below the cut" is a real state. */
const BOARD = {
  updatedAt: 1_700_000_000_000,
  total: 250,
  entries: [
    { rank: 1, name: 'Ace', score: 80, squad: 1200 },
    { rank: 2, name: 'Bex', score: 40, squad: 900 },
    { rank: 2, name: 'Cyd', score: 40, squad: 640 },
    { rank: 4, name: 'Dov', score: 12, squad: 300 }
  ]
}

/**
 * Install a fetch stub and load a FRESH copy of the module against `url`.
 *
 * `useTowerState` is handed back from the same module registry on purpose: the
 * save blob the leaderboard reads its bookkeeping out of has to be the one the
 * test seeds, and after `resetModules` a statically imported copy would be a
 * different instance holding a different blob.
 */
const load = async (
  url: string,
  handler: (url: string, init?: RequestInit) => Promise<Response> = async () => reply(BOARD)
) => {
  sent.length = 0
  vi.stubEnv('VITE_LEADERBOARD_URL', url)
  vi.stubEnv('VITE_LEADERBOARD_SECRET', '')
  vi.stubGlobal('fetch', vi.fn(async (target: string, init?: RequestInit) => {
    sent.push({
      url: target,
      method: (init?.method ?? 'GET').toUpperCase(),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      headers: (init?.headers ?? {}) as Record<string, string>
    })
    return handler(target, init)
  }))
  vi.resetModules()
  const state = await import('@/use/useTowerState')
  const board = await import('@/use/useLeaderboard')
  return { ...board, state }
}

const posts = (): Sent[] => sent.filter((c) => c.method === 'POST')
const gets = (): Sent[] => sent.filter((c) => c.method === 'GET')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('a build with no endpoint has no leaderboard at all', () => {
  it('never touches the network, from any entry point', async () => {
    const lb = await load('')

    await lb.reportRun(42, 900)
    await lb.ensureBoard()
    expect(await lb.submitScore(42, 900)).toBe(false)

    expect(lb.leaderboardEnabled).toBe(false)
    expect(sent).toHaveLength(0)
    // Not "unranked" — unknowable. The result screen hides the cell on 0.
    expect(lb.rankFor(42)).toBe(0)
  })
})

describe('a personal record costs exactly one write', () => {
  it('posts the id, the name, the stage and the squad — and nothing else', async () => {
    const lb = await load(ENDPOINT, async () =>
      reply({ rank: 7, best: 42, total: 250, board: BOARD }))
    lb.state.setState(PLAYER_NAME_KEY, 'Tester')

    await lb.reportRun(42, 900)

    expect(sent).toHaveLength(1)
    const post = posts()[0]!
    expect(post.url).toBe(`${ENDPOINT}/score`)
    expect(post.headers['content-type']).toBe('application/json')
    expect(post.body).toMatchObject({ name: 'Tester', score: 42, squad: 900 })
    // The worker validates this shape and 400s anything else.
    expect(String(post.body!.id)).toMatch(/^[a-zA-Z0-9_-]{8,64}$/)
    // No secret in this build, so no signature — an unsigned body is what a
    // worker without `SCORE_SECRET` expects.
    expect(post.body).not.toHaveProperty('sig')

    // Only remembered because the server confirmed it.
    expect(lb.state.getState(SUBMITTED_STAGE_KEY, 0)).toBe(42)
    expect(lb.state.getState(POSTED_NAME_KEY, '')).toBe('Tester')
    expect(lb.playerRank.value).toBe(7)
  })

  it('forgets a write the server refused, so the next run retries it', async () => {
    const lb = await load(ENDPOINT, async () => reply({ error: 'implausible' }, false))
    lb.state.setState(PLAYER_NAME_KEY, 'Tester')

    await lb.reportRun(42, 900)

    expect(posts()).toHaveLength(1)
    expect(lb.state.getState(SUBMITTED_STAGE_KEY, 0)).toBe(0)
    expect(lb.leaderboardFailed.value).toBe(true)
  })
})

describe('a run that beat nothing costs one read and no write', () => {
  it('reads the board instead of posting when the best is already up there', async () => {
    const lb = await load(ENDPOINT)
    lb.state.setState(PLAYER_NAME_KEY, 'Tester')
    lb.state.setState(POSTED_NAME_KEY, 'Tester')
    lb.state.setState(SUBMITTED_STAGE_KEY, 42)

    await lb.reportRun(12, 400)

    expect(posts()).toHaveLength(0)
    expect(gets()).toHaveLength(1)
    expect(gets()[0]!.url).toBe(`${ENDPOINT}/top`)
    expect(lb.leaderboard.value?.entries).toHaveLength(4)
  })

  it('caches the board, so an hour of grinding still costs one GET', async () => {
    const lb = await load(ENDPOINT)
    lb.state.setState(PLAYER_NAME_KEY, 'Tester')
    lb.state.setState(POSTED_NAME_KEY, 'Tester')
    lb.state.setState(SUBMITTED_STAGE_KEY, 42)

    await lb.reportRun(12, 400)
    await lb.reportRun(30, 500)
    await lb.reportRun(41, 600)
    await lb.ensureBoard()

    expect(sent).toHaveLength(1)
  })

  it('re-posts the SAME score once when the player renamed themselves', async () => {
    const lb = await load(ENDPOINT, async () =>
      reply({ rank: 7, best: 42, total: 250, board: BOARD }))
    lb.state.setState(POSTED_NAME_KEY, 'OldName')
    lb.state.setState(SUBMITTED_STAGE_KEY, 42)
    lb.state.setState(PLAYER_NAME_KEY, 'NewName')

    await lb.reportRun(12, 400)

    expect(posts()).toHaveLength(1)
    // The posted BEST, not the run that just ended: the worker leaves the score
    // and its timestamp alone on a rename, so re-sending 12 would be a downgrade
    // request and the relabel would still happen — but only by luck.
    expect(posts()[0]!.body).toMatchObject({ name: 'NewName', score: 42 })
    expect(lb.state.getState(POSTED_NAME_KEY, '')).toBe('NewName')

    // …and never again once the row is labelled.
    await lb.reportRun(12, 400)
    expect(posts()).toHaveLength(1)
  })
})

describe('the id is the row, so it may never move', () => {
  it('stays identical across submissions in one session', async () => {
    const lb = await load(ENDPOINT, async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}'))
      return reply({ rank: 3, best: body.score, total: 250, board: BOARD })
    })

    await lb.reportRun(5, 100)
    await lb.reportRun(9, 200)

    expect(posts()).toHaveLength(2)
    expect(posts()[0]!.body!.id).toBe(posts()[1]!.body!.id)
    expect(lb.state.getState(SUBMITTED_STAGE_KEY, 0)).toBe(9)
  })
})

describe('a dead endpoint is a missing decoration, never a failed run', () => {
  it('resolves rather than rejecting, and shows no rank', async () => {
    const lb = await load(ENDPOINT, async () => { throw new TypeError('Failed to fetch') })

    await expect(lb.reportRun(42, 900)).resolves.toBeUndefined()
    await expect(lb.ensureBoard()).resolves.toBeUndefined()

    expect(lb.leaderboardFailed.value).toBe(true)
    expect(lb.leaderboard.value).toBeNull()
    expect(lb.rankFor(42)).toBe(0)
    expect(lb.state.getState(SUBMITTED_STAGE_KEY, 0)).toBe(0)
  })

  it('treats a captive-portal 200 that is not a board as a failure', async () => {
    const lb = await load(ENDPOINT, async () => reply('<html>login</html>'))

    await lb.ensureBoard()

    expect(lb.leaderboard.value).toBeNull()
    expect(lb.rankFor(42)).toBe(0)
  })
})

describe('rank derivation from the cached table', () => {
  const cached = async () => {
    const lb = await load(ENDPOINT)
    lb.state.setState(PLAYER_NAME_KEY, 'Tester')
    lb.state.setState(POSTED_NAME_KEY, 'Tester')
    lb.state.setState(SUBMITTED_STAGE_KEY, 42)
    await lb.reportRun(1, 1)
    return lb
  }

  it('counts strictly greater scores, so ties share a rank', async () => {
    const lb = await cached()
    expect(lb.rankFor(100)).toBe(1)
    expect(lb.rankFor(80)).toBe(1)
    // Both stage-40 rows are #2 — nobody is #3 for having arrived later, which
    // is exactly what the worker's `COUNT(*) WHERE score > ?` produces.
    expect(lb.rankFor(40)).toBe(2)
    expect(lb.rankFor(13)).toBe(4)
    expect(lb.rankFor(12)).toBe(4)
  })

  it('reports OUTSIDE_BOARD below the last published row', async () => {
    const lb = await cached()
    expect(lb.rankFor(11)).toBe(lb.OUTSIDE_BOARD)
    // A REAL score below the cut is "somewhere past the end". A score of 0 is
    // not a score at all — see the no-runs case at the bottom of this file.
    expect(lb.rankFor(1)).toBe(lb.OUTSIDE_BOARD)
    expect(lb.rankFor(0)).toBe(0)
    expect(lb.boardSize.value).toBe(4)
    expect(lb.playerTotal.value).toBe(250)
  })

  it('ranks past the end normally when the table IS the whole population', async () => {
    // total === entries.length: nobody is hidden below the cut, so "lower than
    // everyone" is an ordinary rank rather than an unknown one.
    const whole = { ...BOARD, total: BOARD.entries.length }
    const lb = await load(ENDPOINT, async () => reply(whole))
    await lb.ensureBoard()
    expect(lb.rankFor(1)).toBe(5)
  })

  it('prefers the server rank for the score it was computed against', async () => {
    const lb = await load(ENDPOINT, async () =>
      reply({ rank: 61, best: 42, total: 250, board: BOARD }))
    await lb.reportRun(42, 900)

    // The server counted every row, not just the published hundred.
    expect(lb.rankFor(42)).toBe(61)
    expect(lb.rankFor(99)).toBe(61)
    // …but it says nothing about a LOWER score, which falls back to the table.
    expect(lb.rankFor(40)).toBe(2)
  })
})

describe('a player with no runs has no rank', () => {
  it('never claims a standing before a stage has been finished', async () => {
    // The bug this locks: on an empty board the derivation returned
    // `above + 1` = 1 for a score of 0, so every fresh install opened the
    // leaderboard and was told "You are #1" before playing anything.
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ updatedAt: 1, total: 0, entries: [] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )))
    const lb = await import('@/use/useLeaderboard')
    await lb.ensureBoard()
    expect(lb.rankFor(0), 'an unplayed save was given a rank').toBe(0)
    expect(lb.rankFor(-1)).toBe(0)
    // …and a real run still ranks.
    expect(lb.rankFor(1)).toBeGreaterThan(0)
  })
})
