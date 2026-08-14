import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { getState, setState } from '@/use/useTowerState'
import { POSTED_NAME_KEY, SUBMITTED_STAGE_KEY } from '@/keys'
import { resolveIdentity, type PlayerIdentity } from '@/use/usePlayerIdentity'

/**
 * ─── The global board, client side ──────────────────────────────────────────
 *
 * THE SCORE IS THE HIGHEST STAGE EVER REACHED. Not a run total and not a point
 * count — the game's whole progression is "how deep did you get", so the board
 * is a depth chart and `score` is a small integer that grows by one at a time.
 * `squad` rides along as a second column because two players on stage 40 are
 * not the same player, and the biggest squad is the thing they compare.
 *
 * ONE RULE ABOVE ALL: NOTHING IN HERE MAY EVER THROW, BLOCK OR DELAY A RUN.
 * Every network call is wrapped, every failure is swallowed, every entry point
 * returns a resolved promise. The board is a decoration on a game that works
 * perfectly without it — a dead endpoint, a captive-portal wifi login page
 * answering 200 with HTML, a portal iframe with no network at all, all have to
 * end in "no rank shown" and nothing else. That is why `reportRun` is called
 * with `void` and never awaited at the call site.
 *
 * THE SECOND RULE IS THE QUOTA. This ships on Cloudflare's free tier against a
 * D1 database, and a client that posts at the end of every run would cost one
 * write per ~40 s of play per player. So: read the board at most once per page
 * load, and write ONLY when the player beat their own posted record. See
 * `reportRun`, which is the only function the game itself calls.
 */

/** Trailing slashes stripped so `${ENDPOINT}/top` can never become `//top` —
 *  the worker matches on an exact pathname and would 404 the double slash. */
const ENDPOINT: string = (import.meta.env.VITE_LEADERBOARD_URL ?? '').replace(/\/+$/, '')
/** Optional shared secret. Empty on every build that has not been given one,
 *  and the worker only demands a signature when it has one of its own. */
const SECRET: string = import.meta.env.VITE_LEADERBOARD_SECRET ?? ''

/**
 * No endpoint configured → the whole feature is absent, not broken.
 *
 * This is what ships the game with no leaderboard on the portals that refuse
 * third-party storage endpoints (Yandex rejects them outright at moderation):
 * `.env.yandex.local` sets the URL to empty and every UI entry point, every
 * fetch and every localStorage write below switches off together.
 */
export const leaderboardEnabled: boolean = ENDPOINT.length > 0

/**
 * 6 s, matching the worker's own budget note.
 *
 * Long enough for a cold D1 read over a bad mobile connection, short enough
 * that a hung socket cannot keep an `await` alive across the whole result
 * screen. Nothing waits on these promises, so the timeout exists to stop the
 * request leaking rather than to keep the UI responsive.
 */
const TIMEOUT_MS = 6000

/** Returned by `rankFor` when the player is below the last published row: the
 *  board only publishes its top slice, so their true rank is unknowable here. */
export const OUTSIDE_BOARD = -1

interface BoardEntry {
  rank: number
  name: string
  score: number
  squad: number
}

interface Board {
  updatedAt: number
  total: number
  entries: BoardEntry[]
}

// ─── State ──────────────────────────────────────────────────────────────────

const board: Ref<Board | null> = ref(null)
/** The rank the SERVER computed for our last submission. Authoritative for the
 *  score it was computed against, and for nothing else — see `rankFor`. */
const serverRank = ref(0)
/** The score that rank belongs to (the server's `best`, not what we sent). */
const submittedScore = ref(0)
const total = ref(0)
const pending = ref(false)
const failed = ref(false)

export const leaderboard: ComputedRef<Board | null> = computed(() => board.value)
export const playerRank: ComputedRef<number> = computed(() => serverRank.value)
export const playerTotal: ComputedRef<number> = computed(() => total.value)
export const leaderboardPending: ComputedRef<boolean> = computed(() => pending.value)
export const leaderboardFailed: ComputedRef<boolean> = computed(() => failed.value)
/** Rows actually published. The result screen needs it to say `#100+` — the
 *  cut-off is whatever the server chose to send, not a number hardcoded here. */
export const boardSize: ComputedRef<number> = computed(() => board.value?.entries.length ?? 0)

/**
 * Resolved once per page load and reused.
 *
 * `resolveIdentity` is idempotent, but it also writes the id back to the save
 * blob and flushes — doing that on every submission would fire a cloud push per
 * post for a value that cannot change during a session.
 */
let identityPromise: Promise<PlayerIdentity> | null = null
const identity = (): Promise<PlayerIdentity> => (identityPromise ??= resolveIdentity())

// ─── Transport ──────────────────────────────────────────────────────────────

/** `fetch` with a hard deadline. An `AbortController` rather than a racing
 *  `setTimeout`, so a timed-out request actually stops instead of leaving a
 *  socket and a pending promise behind on a phone that just lost signal. */
const withTimeout = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Lowercase hex HMAC-SHA256, byte-for-byte what the worker recomputes. */
const sign = async (message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const adoptBoard = (next: unknown): void => {
  // The response is remote input: a portal's captive proxy can answer 200 with
  // an HTML login page, and `JSON.parse` succeeding proves nothing about shape.
  if (!next || typeof next !== 'object') return
  const raw = next as Partial<Board>
  if (!Array.isArray(raw.entries)) return
  board.value = {
    updatedAt: Number(raw.updatedAt) || 0,
    total: Number(raw.total) || raw.entries.length,
    entries: raw.entries
      .filter((e): e is BoardEntry => !!e && typeof e === 'object')
      .map((e, i) => ({
        rank: Number(e.rank) || i + 1,
        name: typeof e.name === 'string' ? e.name : '',
        score: Number(e.score) || 0,
        squad: Number(e.squad) || 0
      }))
  }
  total.value = board.value.total
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/**
 * Load the published top-100, once.
 *
 * Guarded on three things and all three matter: disabled builds never touch the
 * network, an already-loaded board is never re-fetched (the quota rule), and a
 * request in flight is never duplicated by a second caller — the modal and the
 * result screen both ask, and on a slow connection they ask at the same time.
 *
 * A previous FAILURE is deliberately not remembered as "loaded", so reopening
 * the modal retries. That is the one retry the player can ask for, and it costs
 * one edge-cached GET.
 */
export const ensureBoard = async (): Promise<void> => {
  if (!leaderboardEnabled || board.value !== null || pending.value) return
  pending.value = true
  try {
    // No headers at all, on purpose: any request header beyond the CORS-safelist
    // turns this into a preflighted request and doubles the round trips for a
    // read that carries no credentials.
    const res = await withTimeout(`${ENDPOINT}/top`)
    if (!res.ok) {
      failed.value = true
      return
    }
    adoptBoard(await res.json())
    failed.value = false
  } catch {
    failed.value = true
  } finally {
    pending.value = false
  }
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * Post one score and adopt whatever the server says about it.
 *
 * Returns whether the row is now on the server — the caller only records the
 * score as posted after a `true`, so a failed write is retried on the next run
 * instead of being silently forgotten.
 */
export const submitScore = async (score: number, squad: number): Promise<boolean> => {
  if (!leaderboardEnabled) return false
  pending.value = true
  try {
    const { id, name } = await identity()
    const body: Record<string, unknown> = { id, name, score, squad }
    // Only when this build was given a secret. An unsigned request against a
    // worker with `SCORE_SECRET` set is a 401; a signed one against a worker
    // without it is simply ignored — so the two sides can be rolled out in
    // either order.
    if (SECRET.length > 0) body.sig = await sign(`${id}:${score}:${squad}`)

    const res = await withTimeout(`${ENDPOINT}/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      failed.value = true
      return false
    }
    const data = await res.json() as { rank?: number; best?: number; total?: number; board?: unknown }
    serverRank.value = Number(data.rank) || 0
    // The server's `best`, not what we sent: a re-post that only relabelled the
    // row comes back with the row's existing score, and pinning the rank to the
    // score we posted would let `rankFor` claim a rank the server never gave.
    submittedScore.value = Number(data.best) || 0
    if (data.total !== undefined) total.value = Number(data.total) || 0
    adoptBoard(data.board)
    failed.value = false
    return true
  } catch {
    failed.value = true
    return false
  } finally {
    pending.value = false
  }
}

/**
 * THE ENTRY POINT. Called once per finished run, with `void`, never awaited.
 *
 * Read once per page load, write only on a personal record — that sentence is
 * the entire quota design, and this function is where it is enforced:
 *
 *   • BEAT YOUR OWN POSTED BEST → exactly one POST, and the new best is only
 *     remembered after the server confirmed it. A write that failed has to be
 *     retried by the next run, not lost.
 *   • RENAMED SINCE THE LAST POST → one POST of the SAME score, purely to
 *     relabel the row. The worker special-cases this and touches only the name,
 *     so the player does not jump ahead of everyone they were tied with.
 *   • NEITHER → no write at all, and at most one read for the whole session
 *     (`ensureBoard` no-ops once the board is in hand).
 *
 * A player grinding stage 30 for an hour therefore costs the backend one GET,
 * served from the edge cache.
 */
export const reportRun = async (bestStage: number, bestSquad: number): Promise<void> => {
  if (!leaderboardEnabled) return
  try {
    // Both numbers come off the save blob, which a cloud restore can hand back
    // anything for, and the worker rejects a non-integer outright.
    const stage = Math.max(0, Math.trunc(Number(bestStage) || 0))
    const squad = Math.max(0, Math.trunc(Number(bestSquad) || 0))
    const posted = Math.max(0, Math.trunc(Number(getState(SUBMITTED_STAGE_KEY, 0)) || 0))
    const { name } = await identity()

    if (stage > posted) {
      if (await submitScore(stage, squad)) {
        setState(SUBMITTED_STAGE_KEY, stage)
        setState(POSTED_NAME_KEY, name)
      }
      return
    }

    if (posted > 0 && getState<string>(POSTED_NAME_KEY, '') !== name) {
      if (await submitScore(posted, squad)) setState(POSTED_NAME_KEY, name)
      return
    }

    await ensureBoard()
  } catch {
    // Unreachable in practice — everything above already swallows — but this is
    // the function the game calls without awaiting, and an unhandled rejection
    // here would surface as a console error on a player's first finished run.
  }
}

// ─── Ranking ────────────────────────────────────────────────────────────────

/**
 * What rank a score would hold, best-effort.
 *
 * The server's answer wins whenever it can: it counted every row in the table,
 * not just the hundred that got published. It is only valid for the score it
 * was computed against though — `score >= submittedScore` — because a player
 * who posted stage 12 and is now looking at stage 5 is not still rank 40.
 *
 * Otherwise derive it from the cached table, counting STRICTLY greater scores
 * so ties share a rank exactly as the worker's `COUNT(*) WHERE score > ?` does.
 * Two players on stage 40 are both #7; nobody is #8 because they arrived later.
 *
 * @returns a 1-based rank, `OUTSIDE_BOARD` when the score is below the whole
 *   published table, or `0` when there is simply nothing to say yet.
 */
export const rankFor = (score: number): number => {
  if (!leaderboardEnabled) return 0
  if (serverRank.value > 0 && score >= submittedScore.value) return serverRank.value

  // A player who has not finished a stage has no standing to report. Without
  // this the derivation below hands a fresh install `above + 1` = **#1** on an
  // empty board — the game congratulating someone for a run they have not had,
  // on the first screen they ever see.
  if (score <= 0) return 0

  const table = board.value
  if (!table) return 0

  const above = table.entries.filter((e) => e.score > score).length
  // Below every published row AND the table is a truncated slice of a bigger
  // population — the true rank is somewhere past the cut and cannot be derived.
  // When the table IS the whole population (`entries.length >= total`), being
  // below all of it is an ordinary rank and gets counted like any other.
  if (above >= table.entries.length && table.entries.length < table.total) return OUTSIDE_BOARD
  return above + 1
}
