import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { getState, setState } from '@/use/useTowerState'
import { POSTED_NAME_KEY, SUBMITTED_STAGE_KEY } from '@/keys'
import { resolveIdentity, type PlayerIdentity } from '@/use/usePlayerIdentity'
import { boardSnapshot, rankFromDist } from '@/use/leaderboardSnapshot'

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
 * Is there a live endpoint to talk to?
 *
 * GATES EVERY NETWORK CALL IN THIS FILE, and it is deliberately no longer the
 * same question as "does the game have a leaderboard". The portals that refuse
 * the request build with the URL empty — Poki forbids every external runtime
 * request, Yandex rejects third-party storage URLs at moderation — and they now
 * ship a BAKED board rather than no board at all.
 *
 * So `ensureBoard`, `submitScore` and `reportRun` gate on this; everything the
 * player can see gates on `leaderboardEnabled`. Confusing the two would post a
 * run to `''`.
 */
const LIVE: boolean = ENDPOINT.length > 0

/**
 * Rank a player who has not cleared a stage yet as LAST (`total + 1`) instead
 * of showing no rank. Per build; on for Playgama. See `rankFor`.
 */
const UNPLAYED_LAST: boolean = import.meta.env.VITE_LEADERBOARD_UNPLAYED_LAST === 'true'

/**
 * Does this build have a board at all — live or baked?
 *
 * What the HUD button, the modal and the result screen's rank chip read. With
 * neither, the feature is absent rather than broken: every UI entry point
 * switches off together and `rankFor` returns 0, which hides the cell.
 */
export const leaderboardEnabled: boolean = LIVE || boardSnapshot !== null

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
  /**
   * `[score, howManyPlayersHaveIt]`, score-DESC, over the WHOLE population.
   *
   * The published `entries` stop at a hundred rows; this does not. It is what
   * turns "#100+" — which on a board of thousands is nearly every player — into
   * a real number like "#1130 of 2345". Optional only because a board cached by
   * an older build predates it; the next successful read replaces it.
   */
  dist?: [number, number][]
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

/**
 * The population a `rankFor(score)` answer is "of". Equal to `playerTotal`
 * except for an unplayed player on a build that ranks them last
 * (`UNPLAYED_LAST`): they are placed at `total + 1`, so they are counted in —
 * otherwise the chip would read "#7,832 of 7,831".
 *
 * A plain function reading refs, so a computed or a template that calls it
 * tracks both the score and the board.
 */
export const rankTotalFor = (score: number): number =>
  UNPLAYED_LAST && score <= 0 && board.value !== null && total.value > 0 ? total.value + 1 : total.value
export const leaderboardPending: ComputedRef<boolean> = computed(() => pending.value)
export const leaderboardFailed: ComputedRef<boolean> = computed(() => failed.value)
/** Rows actually published. The result screen needs it to say `#100+` — the
 *  cut-off is whatever the server chose to send, not a number hardcoded here. */
export const boardSize: ComputedRef<number> = computed(() => board.value?.entries.length ?? 0)
/**
 * Which rung of the offline ladder the board on screen came from.
 *
 * QA, tests and the debug HUD only — deliberately never surfaced to the player.
 * Telling them the board is a few days old is the "notice" this whole mechanism
 * exists to avoid; they are looking for their rank, and it is the same rank.
 */
export const boardProvenance = (): 'live' | 'cache' | 'snapshot' | null => boardSource

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

/** @returns whether `next` was a board and was adopted. The caller needs to
 *  know: a shape it rejected is a FAILURE, not a quiet no-op, and it must not
 *  be written to the cache or counted as a successful read. */
const adoptBoard = (next: unknown): boolean => {
  // The response is remote input: a portal's captive proxy can answer 200 with
  // an HTML login page, and `JSON.parse` succeeding proves nothing about shape.
  if (!next || typeof next !== 'object') return false
  const raw = next as Partial<Board>
  if (!Array.isArray(raw.entries)) return false
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
      })),
    // Remote input like everything else: each bucket must be a pair of finite
    // numbers or the rank walk silently returns nonsense.
    dist: Array.isArray(raw.dist)
      ? raw.dist
        .filter((b): b is [number, number] =>
          Array.isArray(b) && b.length === 2 &&
          Number.isFinite(Number(b[0])) && Number.isFinite(Number(b[1])))
        .map(([sc, n]) => [Number(sc), Number(n)] as [number, number])
      : undefined
  }
  total.value = board.value.total
  return true
}

// ─── The offline ladder ─────────────────────────────────────────────────────
//
// THE BOARD MUST NEVER LOOK BROKEN. It is a decoration, and a decoration that
// says "Couldn't reach the leaderboard" has failed twice — once at the request
// and once at the player, who reads it as a bug in the game rather than a quiet
// afternoon on someone's free tier. (It is not hypothetical: the Worker's D1
// row-read allowance ran out mid-day and `/top` threw for every live build.)
//
// So there are three sources, strongest first, and the game shows the best one
// it has WITHOUT ever announcing which:
//
//   1. this session's live fetch  — current
//   2. the cache from a previous session — hours or days old
//   3. the snapshot baked at build time — weeks old, but it always exists
//
// Only the top rung needs a network. The other two are why a player who opens
// the board on a plane, behind Edge's tracking prevention, or on the day the
// quota ran out, sees a leaderboard rather than an apology.

type BoardSource = 'live' | 'cache' | 'snapshot' | null
let boardSource: BoardSource = null
/** Whether THIS session has a live board. Distinct from `board.value !== null`,
 *  which is now true from boot on most devices — without the split, restoring
 *  the cache would convince `ensureBoard` it had already read and no session
 *  would ever refresh. */
let fetched = false

/**
 * Deliberately NOT a `ts_`-prefixed key and not a field inside `tower_state`.
 *
 * Both of those round-trip to the platform's cloud save (see `isPayloadKey`),
 * and this is a ~6 kB cache of PUBLIC data that is identical for every player.
 * Syncing it would pay for the same hundred rows once per player, on every
 * save, against Poki's 1 MB ceiling — to protect a device that has its own copy
 * anyway. It is a per-device cache, so it lives per-device.
 */
const BOARD_CACHE_KEY = 'tower_board_cache'

const readBoardCache = (): Board | null => {
  try {
    const raw = localStorage.getItem(BOARD_CACHE_KEY)
    return raw ? JSON.parse(raw) as Board : null
  } catch {
    // Private mode, a corrupt entry, or no storage at all. No cache is a
    // supported state; it just means the ladder starts a rung lower.
    return null
  }
}

const writeBoardCache = (b: Board): void => {
  try {
    localStorage.setItem(BOARD_CACHE_KEY, JSON.stringify(b))
  } catch { /* quota or private mode — the live board is still on screen */ }
}

/**
 * Stand the best offline board up at module load, before anything renders.
 *
 * This is what removes the spinner and the error state from a returning
 * player's experience entirely: `pending` and `failed` are both still false and
 * the table is already populated, so the modal opens onto rows and the result
 * chip has a rank on the first stage of the session. When the live fetch lands
 * a moment later it silently replaces all of it.
 */
const seedOfflineBoard = (): void => {
  if (!LIVE) {
    // Nothing to wait for. The snapshot IS the board here.
    if (boardSnapshot && adoptBoard(boardSnapshot)) boardSource = 'snapshot'
    return
  }
  // On a live build, only the CACHE may be seeded up front — never the
  // snapshot. Both rank the same way now, but against different populations
  // (the snapshot's is weeks old), and seeding it would show a rank out of the
  // stale total that then shifts when the live board lands. There is nothing to
  // buy by it either: a player's rank is hidden until they have cleared a
  // stage, by which time the fetch has long resolved. The snapshot is reached
  // only once a fetch has actually failed, where nothing can contradict it.
  const cached = readBoardCache()
  if (cached && adoptBoard(cached)) boardSource = 'cache'
}

/** Last rung, taken only when a read failed and nothing else is on screen. */
const fallBackToSnapshot = (): void => {
  if (board.value !== null || !boardSnapshot) return
  if (adoptBoard(boardSnapshot)) boardSource = 'snapshot'
}

seedOfflineBoard()

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
  // `fetched`, not `board.value !== null` — the offline ladder has usually
  // already put a board on screen, and testing the value would mean a device
  // with a cache never refreshed it again.
  if (!LIVE || fetched || pending.value) return
  pending.value = true
  try {
    // No headers at all, on purpose: any request header beyond the CORS-safelist
    // turns this into a preflighted request and doubles the round trips for a
    // read that carries no credentials.
    const res = await withTimeout(`${ENDPOINT}/top`)
    if (!res.ok) {
      failed.value = true
      fallBackToSnapshot()
      return
    }
    // A rejected SHAPE is a failure too — a captive portal answering 200 with a
    // login page used to leave `failed` false and the board untouched, which
    // read as "loaded, and empty".
    if (!adoptBoard(await res.json())) {
      failed.value = true
      fallBackToSnapshot()
      return
    }
    boardSource = 'live'
    fetched = true
    // Banked for the next session, whatever it meets. This is the only place a
    // cache is written from a read; `submitScore` writes the other one.
    if (board.value) writeBoardCache(board.value)
    failed.value = false
  } catch {
    failed.value = true
    fallBackToSnapshot()
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
  if (!LIVE) return false
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
    // A `/score` reply carries the fresh board too, so a submitting player
    // refreshes the cache without a second request. `data.board` is optional —
    // a rejected shape here is normal and must not be treated as a failure.
    if (adoptBoard(data.board)) {
      boardSource = 'live'
      fetched = true
      if (board.value) writeBoardCache(board.value)
    }
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
 * A run posts at most this often, however many records it sets.
 *
 * `reportRun` fires on every cleared stage, and a good run beats its own best
 * on nearly all of them — a climb to stage 42 was up to forty-two POSTs, each
 * one a write and a rate-limit check on a free tier. Since every post carries
 * the CURRENT best rather than a delta, skipping one loses nothing: the next
 * one carries the higher number, so the throttle coalesces rather than drops.
 *
 * The run's END bypasses it (`force`), so the score a player finished on is
 * always the score the board gets.
 */
const WRITE_MIN_GAP_MS = 180_000
/** When the last write was ATTEMPTED — success or not. A backend that is
 *  refusing must not be asked again on the next stage clear. */
let lastWriteAt = 0

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
export const reportRun = async (
  bestStage: number, bestSquad: number, o: { force?: boolean } = {}
): Promise<void> => {
  // (The portal's own board — Playgama's — is NOT reported from here. It posts
  // on a stage clear only, from the scene's win paths: see
  // `reportPortalBest` in `usePortalLeaderboard`.)

  // A baked build has nothing to report TO. The rank it shows comes from the
  // snapshot, which no run can change, so this is the one entry point that stays
  // switched off where `leaderboardEnabled` is true.
  if (!LIVE) return
  try {
    // Both numbers come off the save blob, which a cloud restore can hand back
    // anything for, and the worker rejects a non-integer outright.
    const stage = Math.max(0, Math.trunc(Number(bestStage) || 0))
    const squad = Math.max(0, Math.trunc(Number(bestSquad) || 0))
    const posted = Math.max(0, Math.trunc(Number(getState(SUBMITTED_STAGE_KEY, 0)) || 0))
    const { name } = await identity()

    // The first record of a session goes straight out; the rest wait their turn
    // unless this is the end of the run.
    const due = o.force === true || lastWriteAt === 0 ||
      Date.now() - lastWriteAt >= WRITE_MIN_GAP_MS

    if (stage > posted && due) {
      lastWriteAt = Date.now()
      if (await submitScore(stage, squad)) {
        setState(SUBMITTED_STAGE_KEY, stage)
        setState(POSTED_NAME_KEY, name)
      }
    } else if (posted > 0 && due && getState<string>(POSTED_NAME_KEY, '') !== name) {
      lastWriteAt = Date.now()
      if (await submitScore(posted, squad)) setState(POSTED_NAME_KEY, name)
    }

    // HOWEVER the run was reported, end with a board to rank against.
    //
    // This used to `return` after a write, and that hid the rank in the one
    // case the player cares about most. A personal record takes the write path,
    // so a device with no cache yet — a fresh QA profile, a first session —
    // reached the result screen having only ever tried a POST. When that POST
    // failed (the board's own free tier ran out of D1 reads mid-afternoon and
    // answered 500 to everything) nothing had ever loaded a board, `rankFor`
    // returned 0, and the chip hid itself. The offline ladder existed and was
    // simply never reached: only `ensureBoard` climbs it.
    //
    // It costs nothing on the happy path — a successful write brings the board
    // back with it and sets `fetched`, so this no-ops. On a failed write it is
    // one edge-cached GET, which can still succeed where the POST could not
    // (`/top` is served from the edge; `/score` must reach D1), and if that
    // fails too its own failure path drops to the baked snapshot.
    await ensureBoard()
  } catch {
    // Unreachable in practice — everything above already swallows — but this is
    // the function the game calls without awaiting, and an unhandled rejection
    // here would surface as a console error on a player's first finished run.
    //
    // `identity()` is the one call here that can throw before anything has
    // loaded a board, so the last rung is taken here too. A run must never end
    // with no rank because minting a player id went wrong.
    fallBackToSnapshot()
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
  // EXACT match, not `>=`. The server's answer belongs to the score it counted
  // and to no other, and the difference only became visible once the client
  // stopped posting every single stage: with `>=`, a player who posted at stage
  // 10 and climbed to 42 kept being shown the rank they held at 10, because
  // every later score still satisfied it. Anything else is derived below from
  // the histogram — which is now the same arithmetic the Worker runs, so the
  // two cannot disagree about anything but the age of the population.
  if (serverRank.value > 0 && score === submittedScore.value) return serverRank.value

  // A player who has not finished a stage has no standing of their own. Without
  // this the derivation below hands a fresh install `above + 1` = **#1** on an
  // empty board — the game congratulating someone for a run they have not had,
  // on the first screen they ever see.
  //
  // Where the build opts in (`VITE_LEADERBOARD_UNPLAYED_LAST`, the Playgama
  // build), they are placed instead: LAST, behind everyone the board knows —
  // `total + 1`, with `rankTotalFor` counting them into the population so the
  // chip reads "#7,832 of 7,832" rather than "of 7,831". The very bottom is a
  // truthful place to start and a number with somewhere to go, which a blank
  // cell is not. Only with a board in hand: last of nothing is still nothing.
  if (score <= 0) return UNPLAYED_LAST && board.value !== null && total.value > 0 ? total.value + 1 : 0

  // On a baked build the histogram IS the board, and it answers for the whole
  // population: no published cut to fall off, no `OUTSIDE_BOARD`, and a real
  // number — "#1847 of 2363" — from the player's very first cleared stage.
  //
  // That is why the snapshot carries a histogram and not just rows. The top-100
  // alone would have been useless: on a board of a few thousand the hundredth
  // row sits around stage 13, well past where a first session reaches, so every
  // new player would have seen `#100+` and nothing else — in exactly the
  // session Poki's fit test grades.
  //
  const table = board.value
  if (!table) return 0

  // THE histogram path, and the one every rung takes now — live, cached or
  // baked. It ranks against the whole population, so the answer is an exact
  // "#1130" rather than "past the end of what we published", and it is the same
  // arithmetic the Worker runs, so a player's rank does not change when the
  // board underneath it does.
  if (table.dist && table.dist.length > 0) return rankFromDist(table.dist, score)

  // A board cached by a build that predates the histogram. Rank against the
  // BAKED one instead of the hundred published rows: its population is a few
  // weeks stale, so the rank is off by the number of players who joined since —
  // about a percent — where the row-derived answer would be "#100+", i.e. no
  // answer at all. Lasts until this device's next successful read.
  if (boardSnapshot?.dist.length) return rankFromDist(boardSnapshot.dist, score)

  // Last resort: no histogram anywhere. Only the published rows are visible, so
  // below the cut the true rank genuinely is unknowable.
  const above = table.entries.filter((e) => e.score > score).length
  // Below every published row AND the table is a truncated slice of a bigger
  // population — the true rank is somewhere past the cut and cannot be derived.
  // When the table IS the whole population (`entries.length >= total`), being
  // below all of it is an ordinary rank and gets counted like any other.
  if (above >= table.entries.length && table.entries.length < table.total) return OUTSIDE_BOARD
  return above + 1
}
