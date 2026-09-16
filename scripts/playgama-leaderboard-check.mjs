/**
 * ─── Does the Playgama leaderboard actually exist? ──────────────────────────
 *
 * Playgama's SaaS leaderboard has to be CREATED on the developer dashboard
 * before a build can use it — developer.playgama.com → the game → Leaderboards:
 * an ID, a Name, a Type (Numeric) and a Score order (Higher is better). The same
 * tab shows the APP Public Token.
 *
 * Nothing in the game can notice when that step was skipped. Bridge's SaaS
 * client resolves HTTP errors as data, so `setScore` "succeeds" against a board
 * that does not exist, every build passes, and the leaderboard is simply empty
 * forever. This asks the server directly, with the build's own id and token:
 *
 *     pnpm playgama:leaderboard:check
 *
 * Exit codes — `build:playgama` runs this first:
 *   0  the board answers, OR no Playgama leaderboard is configured (a project
 *      without one is not an error), OR the API was unreachable (a Playgama
 *      outage must not block a release — it prints a warning instead)
 *   1  the server positively says the board or token is wrong, or only one of
 *      the two env values is set
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const API = 'https://api.playgama.com/api/bridge/v1'
const TIMEOUT_MS = 10_000
const DASHBOARD = 'https://developer.playgama.com/'

/** `KEY=value` lines; later files win, the real environment wins over all. */
const readEnv = () => {
  const out = {}
  for (const name of ['.env', '.env.playgama', '.env.playgama.local']) {
    const file = resolve(process.cwd(), name)
    if (!existsSync(file)) continue
    for (const raw of readFileSync(file, 'utf-8').split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 1) continue
      out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  for (const key of ['VITE_PLAYGAMA_LEADERBOARD_ID', 'PLAYGAMA_SAAS_PUBLIC_TOKEN']) {
    if (process.env[key] !== undefined) out[key] = process.env[key]
  }
  return out
}

const reminder = (id) => [
  '',
  '  ┌─ Create the leaderboard on Playgama first ─────────────────────────────',
  `  │ ${DASHBOARD} → your game → Leaderboards → create:`,
  `  │   ID           ${id || '<the id you put in VITE_PLAYGAMA_LEADERBOARD_ID>'}`,
  '  │   Name         the game\'s name, as players should see it',
  '  │   Type         Numeric',
  '  │   Score order  Higher is better  (the score is a lifetime best)',
  '  │ Then copy that tab\'s "APP Public Token" into PLAYGAMA_SAAS_PUBLIC_TOKEN',
  '  │ in .env.playgama, and re-run `pnpm playgama:leaderboard:check`.',
  '  └────────────────────────────────────────────────────────────────────────',
  ''
].join('\n')

const main = async () => {
  const env = readEnv()
  const id = (env.VITE_PLAYGAMA_LEADERBOARD_ID ?? '').trim()
  const token = (env.PLAYGAMA_SAAS_PUBLIC_TOKEN ?? '').trim()

  if (!id && !token) {
    console.log('[playgama:leaderboard] no Playgama leaderboard configured — skipping.')
    return 0
  }
  if (!id || !token) {
    console.error(
      `[playgama:leaderboard] ${id ? 'PLAYGAMA_SAAS_PUBLIC_TOKEN' : 'VITE_PLAYGAMA_LEADERBOARD_ID'} is empty — `
      + 'both must be set, or neither.'
    )
    console.error(reminder(id))
    return 1
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res
  try {
    // Exactly the request Bridge's SaaS adapter makes for `getEntries` on
    // playgama.com. A GET — this never writes a row.
    res = await fetch(`${API}/leaderboards/${encodeURIComponent(id)}`, {
      headers: {
        'content-type': 'application/json',
        'x-player-id': '',
        'x-platform-id': 'playgama',
        'x-public-token': token
      },
      signal: controller.signal
    })
  } catch (e) {
    console.warn(`[playgama:leaderboard] could not reach ${API} (${e?.message ?? e}) — NOT verified, continuing.`)
    return 0
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text().catch(() => '')
  let body = null
  try { body = JSON.parse(text) } catch { /* reported below */ }

  if (res.ok && Array.isArray(body)) {
    console.log(`[playgama:leaderboard] ✓ "${id}" is live on Playgama — ${body.length} entr${body.length === 1 ? 'y' : 'ies'}.`)
    return 0
  }

  const message = body && typeof body === 'object' && typeof body.message === 'string' ? body.message : text.slice(0, 120)
  // Both mistakes are a 404 and only the message tells them apart, measured
  // 2026-09-16: an unknown board is "Leaderboard not found", an unknown token is
  // "Application not found".
  if (res.status === 404 && /application/i.test(message)) {
    console.error(`[playgama:leaderboard] ✗ Playgama does not recognise PLAYGAMA_SAAS_PUBLIC_TOKEN (${message}).`)
    console.error(reminder(id))
    return 1
  }
  if (res.status === 404) {
    console.error(`[playgama:leaderboard] ✗ Playgama has no leaderboard "${id}" for this token (${message}).`)
    console.error(reminder(id))
    return 1
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    console.error(`[playgama:leaderboard] ✗ the public token was refused — HTTP ${res.status} ${message}.`)
    console.error(reminder(id))
    return 1
  }
  console.warn(`[playgama:leaderboard] unexpected HTTP ${res.status} ${message} — NOT verified, continuing.`)
  return 0
}

// `process.exitCode`, never `process.exit()`: on Windows an exit while undici's
// sockets are still closing trips a libuv assertion.
main().then((code) => { process.exitCode = code }, (e) => {
  console.warn('[playgama:leaderboard] check crashed — NOT verified, continuing.', e)
  process.exitCode = 0
})
