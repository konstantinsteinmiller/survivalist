#!/usr/bin/env node
/**
 * Drive the art bench's "Export all sheets" in a private headless Chrome.
 *
 *   pnpm dev                       # in one terminal, on port 2050
 *   pnpm art:export                # in another; writes art-sheets/
 *   pnpm art:export http://localhost:2050/#/art-sheets
 *   pnpm art:export -- --deaths    # the boss deaths only (+ the whole index)
 *   pnpm art:export -- --hurls     # the boss meteor throws only (+ the whole index)
 *   pnpm art:export -- --only still-prop-cage,still-prop-cage-sealed
 *                                  # just those references (+ the index, the
 *                                  # stills key and the prompt documents)
 *
 * Own profile, own port — never the shared debugging profile, which belongs to
 * whatever the user has open, and two clients on one profile deadlock with no
 * recovery. Background-throttling flags are off because the bench renders on
 * `requestAnimationFrame` and a throttled headless tab stalls the export.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ARGS = process.argv.slice(2)
const DEATHS_ONLY = ARGS.includes('--deaths')
const HURLS_ONLY = ARGS.includes('--hurls')
const ONLY_AT = ARGS.indexOf('--only')
const ONLY = ONLY_AT >= 0 ? (ARGS[ONLY_AT + 1] ?? '') : ''
if (ONLY_AT >= 0 && !ONLY) { console.error('--only needs a comma-separated list of reference stems'); process.exit(1) }
const BASE = ARGS.find((a, i) => !a.startsWith('--') && i !== ONLY_AT + 1) ?? 'http://localhost:2050/#/art-sheets'
const APP = ONLY ? `${BASE}?only=${encodeURIComponent(ONLY)}` : BASE
const PORT = 9700 + Math.floor(Math.random() * 200)
const PROFILE = mkdtempSync(join(tmpdir(), 'sv-art-'))

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].find((p) => existsSync(p))
if (!CHROME) { console.error('no chrome'); process.exit(1) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const child = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--window-size=1400,1000',
  APP
], { stdio: 'ignore', detached: false })

const cleanup = () => {
  try { child.kill() } catch { /* already gone */ }
  try { rmSync(PROFILE, { recursive: true, force: true }) } catch { /* locked */ }
}

let ws
try {
  // ── Find the page target ──
  let target = null
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(500)
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      target = list.find((t) => t.type === 'page' && t.url.includes('/art-sheets'))
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('no art-sheets page target')

  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no })

  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
  const send = (method, params = {}) => new Promise((ok) => {
    const n = ++id
    pending.set(n, ok)
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true
    })
    if (r.result?.exceptionDetails) {
      throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed')
    }
    return r.result?.result?.value
  }

  await send('Runtime.enable')
  await send('Page.enable')

  // ── Wait for the bench to mount ──
  for (let i = 0; i < 60; i++) {
    const ready = await evaluate(
      "!!document.querySelector('.art-sheets .bar button')"
    )
    if (ready) break
    await sleep(1000)
  }
  // Verify the port is actually ours: a stale server from another game answers
  // happily and the export lands in the wrong repo.
  const title = await evaluate('document.title')
  const heading = await evaluate("document.querySelector('.art-sheets h1')?.textContent ?? ''")
  console.log(`page: ${title} / ${heading}`)
  if (!/survivalist/i.test(title)) throw new Error(`not survivalist: title is "${title}"`)
  if (!heading.includes('Art sheets')) throw new Error('not the art bench')

  // ── Press export ──
  const label = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.art-sheets .bar button')]
      .find((x) => ${DEATHS_ONLY ? '/Export boss deaths/i' : HURLS_ONLY ? '/Export boss throws/i' : '/Export all/i'}.test(x.textContent));
    if (!b) return null;
    b.click();
    return b.textContent.trim();
  })()`)
  if (label === null) throw new Error('no export button')
  console.log('clicked:', label)

  // ── Wait it out, reporting the status line as it moves ──
  //
  // Poll for the status STRING, not just for the button re-enabling: a page
  // that reloads mid-export resets `busy` to false and would report "done"
  // having written nothing.
  let last = ''
  const started = Date.now()
  for (;;) {
    await sleep(1500)
    const st = await evaluate(`(() => {
      const s = document.querySelector('.art-sheets .bar .status');
      const b = [...document.querySelectorAll('.art-sheets .bar button')][0];
      return JSON.stringify({
        status: s ? s.textContent.trim() : '',
        busy: b ? b.disabled : false
      });
    })()`)
    const { status, busy } = JSON.parse(st)
    if (status && status !== last) { console.log('  ·', status); last = status }
    if (!busy && /wrote|FAILED/.test(status)) { console.log('DONE:', status); break }
    if (!busy && status === 'idle' && Date.now() - started > 8000) {
      throw new Error('export never started (page reloaded?)')
    }
    if (Date.now() - started > 20 * 60 * 1000) throw new Error('timed out')
  }

  const errors = await evaluate(`(() => {
    const s = document.querySelector('.art-sheets .bar .status');
    return s && /FAILED/i.test(s.textContent) ? s.textContent : ''
  })()`)
  if (errors) { console.error('EXPORT FAILED:', errors); process.exitCode = 1 }
} catch (err) {
  console.error('ERROR:', err.message)
  process.exitCode = 1
} finally {
  try { ws?.close() } catch { /* closed */ }
  cleanup()
}
