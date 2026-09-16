import type { PortalBoardAdapter, PortalBoardEntry, PortalBoardMode } from '@/use/usePortalLeaderboard'

/**
 * ─── Playgama's leaderboard, as a portal board ──────────────────────────────
 *
 * Adapts `bridge.leaderboards` to `PortalBoardAdapter`. On playgama.com (and the
 * Playgama QA Tool) that module is Bridge's SaaS leaderboard: `type` is
 * `in_game`, `setScore` POSTs and `getEntries` GETs
 * `api.playgama.com/api/bridge/v1/leaderboards/<id>`. On YouTube Playables —
 * the SAME archive — it is YouTube's own board: `type` is `native` and
 * `setScore` becomes `ytgame.engagement.sendScore`, which Bridge only sends for
 * the board marked `isMain` in the config.
 *
 * SaaS is switched on by `playgama-bridge-config.json` alone (see
 * `platforms/playgama/bridgeConfig.ts`). The board itself has to exist on the
 * developer dashboard first — developer.playgama.com → the game → Leaderboards —
 * with the SAME id this build carries in `VITE_PLAYGAMA_LEADERBOARD_ID`.
 *
 * ── THE TRAP THIS FILE EXISTS FOR ──
 *
 * Bridge's SaaS client never checks `response.ok` (v1.32 and v2.2.0 alike). It
 * does `fetch(...).then(r => r.json())`, so an HTTP error with a JSON body
 * RESOLVES:
 *
 *   board not created on the dashboard   → resolves `{ statusCode: 404, message: 'Leaderboard not found' }`
 *   wrong public token                   → resolves `{ statusCode: 404, message: 'Application not found' }`
 *   token missing from the config        → resolves `{ statusCode: 400, message: 'public token is not set' }`
 *
 * (v2 adds one real rejection: SaaS `setScore` rejects outright when Bridge has
 * no `player.id`.)
 *
 * `setScore(...).then(() => success)` — the documented pattern — reports every
 * one of those as a posted score, and `getEntries` hands back an object where
 * an array was promised. So both results are shape-checked here, and a
 * configuration error latches the board off for the session (with one console
 * line saying exactly what to fix) instead of being retried on every record.
 */

export const PLAYGAMA_BOARD_LABEL = 'Playgama'

const MODES: ReadonlyArray<PortalBoardMode> = ['in_game', 'native', 'native_popup', 'not_available']

/**
 * Does this answer mean "this build is misconfigured" (latch off for the
 * session) rather than "this one request was refused"?
 *
 * 404 is both measured config errors ("Leaderboard not found", "Application not
 * found"); 401/403 are auth. A 400 is only a config error when it is about the
 * token ("public token is not set") — any other 400 is a refusal of THIS
 * request, e.g. a score the backend will not take, and must not switch the
 * whole board off: the stage-0 join post is exactly such a request.
 */
const isConfigError = (err: ApiError): boolean =>
  err.statusCode === 404 || err.statusCode === 401 || err.statusCode === 403 ||
  (err.statusCode === 400 && /token/i.test(err.message))

interface ApiError { statusCode: number; message: string }

/** An HTTP error the SaaS client resolved as if it were data. */
export const playgamaApiError = (body: unknown): ApiError | null => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const code = Number((body as { statusCode?: unknown }).statusCode)
  if (!Number.isFinite(code) || code < 400) return null
  const message = (body as { message?: unknown }).message
  return { statusCode: code, message: typeof message === 'string' ? message : '' }
}

export const createPlaygamaBoardAdapter = (bridge: any, leaderboardId: string): PortalBoardAdapter => {
  let disabled = false

  const noteError = (err: ApiError): void => {
    if (!isConfigError(err) || disabled) return
    disabled = true
    console.warn(
      `[playgama] leaderboard "${leaderboardId}" answered ${err.statusCode} ${err.message} — ` +
      // No hostname in this string: the plugin chunk also lands in builds whose
      // moderators grep the bundle for foreign hosts (Yandex).
      'switched off for this session. Create the leaderboard on the Playgama developer dashboard → ' +
      'the game → Leaderboards with this exact ID, and put that tab\'s APP Public Token in ' +
      'PLAYGAMA_SAAS_PUBLIC_TOKEN. `pnpm playgama:leaderboard:check` verifies both.'
    )
  }

  const board = (): any => bridge?.leaderboards ?? null

  return {
    label: PLAYGAMA_BOARD_LABEL,

    mode: () => {
      if (disabled) return 'not_available'
      const type = board()?.type
      return MODES.includes(type) ? type : 'not_available'
    },

    submit: async (score) => {
      const lb = board()
      if (disabled || typeof lb?.setScore !== 'function') return false
      const res = await lb.setScore(leaderboardId, score)
      const err = playgamaApiError(res)
      if (err) {
        noteError(err)
        return false
      }
      return true
    },

    entries: async () => {
      const lb = board()
      if (disabled || typeof lb?.getEntries !== 'function') return null
      const res = await lb.getEntries(leaderboardId)
      const err = playgamaApiError(res)
      if (err) {
        noteError(err)
        return null
      }
      if (!Array.isArray(res)) return null
      // The id SaaS stores a row under is the one Bridge sends as `x-player-id`,
      // which is `bridge.player.id` — a generated guest id when nobody is signed in.
      const me = String(bridge?.player?.id ?? '')
      return res
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e, i): PortalBoardEntry => ({
          rank: Math.max(1, Math.trunc(Number(e.rank) || i + 1)),
          name: typeof e.name === 'string' ? e.name.trim() : '',
          score: Math.max(0, Math.trunc(Number(e.score) || 0)),
          isYou: me.length > 0 && e.id !== undefined && e.id !== null && String(e.id) === me
        }))
        .sort((a, b) => a.rank - b.rank)
    }
  }
}
