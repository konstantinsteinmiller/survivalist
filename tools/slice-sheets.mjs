#!/usr/bin/env node
/**
 * ─── Sheet slicer ───────────────────────────────────────────────────────────
 *
 * The return half of the art pipeline. `/art-sheets` bakes the procedural cast
 * onto reference sheets and out to an image model; this takes the repainted
 * sheet and cuts it back into the drop-in bitmaps `spriteFor()` probes for.
 *
 * Every sheet is a grid of panels that becomes ONE horizontal strip — a walk
 * cycle is eight panels, a still is a one-panel grid — so there is one code
 * path: identify, guard the aspect, key the ground, fit onto the reference,
 * compose, encode. See `art-sheets/README.md`.
 *
 *   node tools/slice-sheets.mjs art-sheets/painted/walk-grumpling.png
 *   pnpm slice-sheets                      # every PNG in art-sheets/painted/
 *   pnpm slice-sheets --dry                # print the plan, write nothing
 *
 * WHY IT DRIVES A BROWSER
 *
 * The renderer only ever probes for `.webp`, and Node has no image encoder in
 * the standard library. The choice was a native dependency (`sharp`) in a
 * project that ships to eight portals, or the encoder that is already installed
 * on this machine. Chrome decodes the PNG, crops on a canvas and encodes WebP
 * in three lines — so the pipeline stays dependency-free, and it is the same
 * isolated-profile harness the export bench is driven with.
 *
 * WHAT IT REFUSES TO DO
 *
 * The whole contract is that cell N comes back at the pixels cell N went out
 * at. An image model that re-composed the grid produces a file that still looks
 * fine and slices into garbage — every sprite a few pixels off centre, which
 * nobody notices until the tower looks subtly wrong in motion. So a sheet whose
 * aspect ratio does not match the index is REJECTED rather than best-guessed.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync,
  existsSync, readdirSync, statSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX = join(ROOT, 'art-sheets', 'sheet-index.json')
const PAINTED = join(ROOT, 'art-sheets', 'painted')
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
]

// ─── Arguments ──────────────────────────────────────────────────────────────

// Options that consume the next argument. Everything else that is not a flag
// is an input path — walked in order rather than filtered, so `--out public`
// cannot leave "public" behind looking like a file to slice.
const VALUED = new Set(['--sheet', '--out', '--size', '--quality', '--fit', '--frames', '--take-rows'])
const argv = process.argv.slice(2)
const opts = {}
const files = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (VALUED.has(a)) {
    if (i + 1 >= argv.length) { console.error(`${a} needs a value`); process.exit(1) }
    opts[a] = argv[++i]
  } else if (a.startsWith('-')) {
    opts[a] = true
  } else {
    files.push(a)
  }
}

const flag = (name) => opts[name] === true
const num = (name, fallback) => {
  if (opts[name] === undefined) return fallback
  const v = Number(opts[name])
  if (!Number.isFinite(v)) { console.error(`${name} must be a number`); process.exit(1) }
  return v
}

const DRY = flag('--dry')
// Cut a painting even though its reference was redrawn since — see "The receipt".
const STALE_OK = flag('--stale-ok')
const OUT_ROOT = resolve(ROOT, opts['--out'] ?? 'public')
const QUALITY = num('--quality', 0.92)
const FORCE_SHEET = opts['--sheet'] ?? null

/**
 * The cap on a frame's height, px — 256 unless `--size` says otherwise.
 *
 * 256 is where the payload and the eye agreed in every project so far: monster
 * strips at 341 px per frame, for creatures drawn at a fraction of that on a
 * phone, were 1.9 MB of a 4.2 MB payload, and 256 took the whole set to 2.2 MB
 * with nothing visibly lost. So it is the DEFAULT, not a flag remembered on a
 * good day. Three things bend it:
 *
 *   · the manifest's own `maxEdge` can only LOWER it — a coin is 20 px in play
 *     and a crown 12, and 256 of either is payload;
 *   · a sheet that ships resized copies keeps whatever its biggest copy needs,
 *     because an extra is cut from the master and a 512 PWA icon upsampled from
 *     a 256 master is a blurred icon in every app drawer;
 *   · an explicit `--size` FORCES the edge for one run, manifest or not, which
 *     is how a re-slice for a retina promo shot is done without editing anything;
 *   · a sheet marked `exact` in the index is written at its manifest size
 *     whatever else is asked — the file is read at that size by something
 *     outside the game (the PWA manifest and the 512 logo).
 */
const DEFAULT_EDGE = 256
const SIZE = num('--size', DEFAULT_EDGE)
const SIZE_FORCED = opts['--size'] != null
const edgeCap = (sheet) => {
  const manifest = sheet.maxEdge ?? (sheet.frames === 1 ? 640 : 384)
  const cap = sheet.exact ? manifest : SIZE_FORCED ? SIZE : Math.min(SIZE, manifest)
  return Math.max(cap, ...(sheet.extra ?? []).map((ex) => ex.size ?? 0))
}

/**
 * How tall one frame of a walk strip is written, in px.
 *
 * Never larger than the painting actually came back at — upsampling a return
 * buys file size and no detail — and never larger than the cap above.
 */
const walkEdge = (sheet, cell, sy) =>
  Math.min(edgeCap(sheet), Math.round(cell.h * sy))
// Accept a walk sheet whose grid came back with a different number of panels,
// treating what arrived as one cycle. Only honoured when it matches what the
// detector actually measured, so it cannot be used to force a bad cut.
const FRAMES_OVERRIDE = num('--frames', null)
// Cut only the first n rows of a walk sheet that came back with MORE rows than
// asked. A model handed a low, wide creature fills the air above it with another
// row or two of the same cycle; the top rows are the cycle it was asked for.
const TAKE_ROWS = num('--take-rows', null)
// Cut a return that came back ruled like a comic strip, painting the rules out
// first — see the border check below. Off by default: a ruled return usually
// has captions inside the panels too, and those cannot be painted out.
const DROP_BORDERS = flag('--drop-borders')
// Flip the whole sheet before cutting, for a return that came back facing the
// wrong way. Side-on creatures come back mirrored about half the time however
// plainly the prompt says which way they face, and a flip is exact: the same
// painting, the way the game's own walk faces.
const MIRROR = flag('--mirror')
const NO_CHROMA = flag('--no-chroma')
const NO_TRIM = flag('--no-trim')
const NO_AUTO_BG = flag('--no-auto-bg')
// How to square up a single-cell image that did not come back square.
const FIT = opts['--fit'] ?? 'squash'
if (!['squash', 'crop'].includes(FIT)) {
  console.error("--fit must be 'squash' or 'crop'")
  process.exit(1)
}

if (flag('--help') || flag('-h')) {
  console.log(`
Slice repainted contact sheets back into drop-in bitmaps.

  node tools/slice-sheets.mjs [files…] [options]

  files            One or more PNGs, or a directory. Defaults to art-sheets/painted/.
  --sheet <id>     Force the target: a design (grumpling), an outfit (teal) or a
                   still (crate-damage, frame-add, tracer, muzzle, lane, logo …).
                   Otherwise inferred from the filename, then from the aspect ratio.
  --out <dir>      Where targets are written, relative to the repo. Default: public
  --size <px>      Force a frame's height, in px, for this run. Default: 256,
                   lowered to the sheet's own cap where that is smaller and
                   raised to the biggest resized copy a sheet ships. A sheet
                   the manifest marks 'exact' (the PWA logo) ignores both.
  --quality <0-1>  WebP quality. Default: 0.92
  --no-chroma      Keep a magenta background instead of keying it out.
  --no-auto-bg     Do not flood-fill a uniform background away. Auto-removal
                   handles white, cream and painted-in checkerboards; it never
                   runs on an opaque tile.
  --no-trim        Reserved; nothing in this manifest is trimmed.
  --fit squash|crop  Reserved; every return is fitted onto its reference.
  --frames <n>     Accept a walk sheet that came back with n panels instead of
                   the 8 it was asked for, and play them as one cycle. Must
                   match the grid the slicer measured.
  --take-rows <n>  A walk sheet came back with MORE rows than asked (a 4x4 for
                   a 4x2): cut only the first n rows and play them as the
                   cycle. Use this when the extra rows repeat the cycle;
                   use --frames when they continue it.
  --stale-ok       Slice a painting even though its reference was redrawn since it
                   was painted. Off by default: the receipt in
                   painted/.sliced.json is what stops a re-cut drawing quietly
                   getting its OLD painting back.
  --drop-borders   Cut a return that came back ruled like a comic strip, painting
                   the rules out of the cut lines first. Refused by default —
                   look at the return before using this, because a ruled one
                   usually has captions inside the panels, and those stay.
  --mirror         Flip every PANEL left-to-right before cutting, for a return
                   that came back facing the wrong way (the panel order is kept,
                   so the animation still runs forwards).
  --dry            Print the plan and write nothing.
`)
  process.exit(0)
}

// ─── Inputs ─────────────────────────────────────────────────────────────────

if (!existsSync(INDEX)) {
  console.error(`No ${relative(ROOT, INDEX)}. Run the /art-sheets bench first.`)
  process.exit(1)
}
const index = JSON.parse(readFileSync(INDEX, 'utf-8'))

const collect = (p) => {
  const full = resolve(ROOT, p)
  if (!existsSync(full)) { console.error(`not found: ${p}`); process.exit(1) }
  if (statSync(full).isDirectory()) {
    return readdirSync(full).filter((f) => /\.(png|webp|jpe?g)$/i.test(f)).map((f) => join(full, f))
  }
  return [full]
}

const inputs = (files.length ? files : [PAINTED]).flatMap((p) => {
  if (!files.length && !existsSync(PAINTED)) {
    console.error(`No input given and ${relative(ROOT, PAINTED)}/ does not exist.`)
    console.error('Put the repainted sheets there, or pass a path.')
    process.exit(1)
  }
  return collect(p)
})

if (!inputs.length) { console.error('nothing to slice'); process.exit(1) }

/**
 * Which sheet is this file?
 *
 * The filename first, because it survives round-tripping through a chat window
 * far more often than anything else. Aspect ratio is the fallback, and it is
 * only trusted when exactly one sheet matches — two sheets with the same shape
 * would make a wrong guess silently destructive.
 */
// Every entry in the index is a grid of panels that becomes ONE horizontal
// strip: a walk cycle is eight panels, a still is a one-panel grid. The panels
// are cut, keyed and de-fringed separately and then composed into the file the
// game loads.
//
// Nothing here is trimmed. Trimming per frame would re-centre each pose
// independently and the character would jitter around its own feet for the
// entire walk; a still is instead FITTED onto its reference, which is the same
// correction applied to the whole strip at once.
const TARGETS = (index.walks ?? []).map((a) => ({
  id: a.id, kind: 'walk',
  // Where the reference sits inside a panel, so a return painted at a
  // different size can be normalised back onto it.
  fit: a.fit ?? null, anchor: a.anchor ?? 'feet',
  // A still's box is a hard boundary — it is the space the game blits the
  // painting into — so a return is fitted INSIDE it in both axes. A
  // creature's box is not: it stands on open ground, and shrinking it
  // because a painted arm swings wider would lift its feet off the line.
  tight: a.tight ?? (a.kind !== 'monster' && a.kind !== 'hero'),
  maxEdge: a.maxEdge ?? null,
  // `maxEdge` is the SIZE, not a cap: something outside the game reads the
  // file at exactly that size (the PWA manifest and the logo). Neither the
  // 256 default nor `--size` lowers it.
  exact: !!a.exact,
  // The manifest's own kind (prop, gate, round, …), for the checks that only
  // one kind of drawable needs — and where a gate frame's nine-slice cuts.
  artKind: a.kind ?? null,
  // A gate frame's post band, as fractions of the panel: where a return's
  // posts are re-composed to. See the gate branch in the cut.
  post: a.post ?? null,
  // What the empty part of the frame is: magenta, magenta above a ridge line,
  // or nothing at all (an opaque tile has no background to key).
  bg: a.bg ?? 'magenta',
  tile: a.tile ?? null,
  // A subject that fills its frame by contract: a solid rectangle is right.
  fill: !!a.fill,
  // Resized copies of the same return, for the assets that ship twice.
  extra: a.extra ?? [],
  // `walk-grumpling` and a bare `grumpling` both land; longest stem wins, so
  // the prefixed form is never mistaken for anything else.
  stems: [a.file.replace(/\.png$/, ''), a.id],
  width: a.width, height: a.height,
  frames: a.frames, cols: a.cols, rows: a.rows,
  target: a.target,
  cells: Array.from({ length: a.frames }, (_, i) => ({
    id: `${a.id}#${i}`,
    label: a.id,
    variant: `frame ${i + 1}/${a.frames}`,
    x: (i % a.cols) * a.panel.w,
    y: Math.floor(i / a.cols) * a.panel.h,
    w: a.panel.w, h: a.panel.h,
    target: a.target,
    frame: i
  }))
}))

/** The leading `word-` of a name, including the dash, or '' if it has none. */
const prefixOf = (n) => (n.includes('-') ? n.slice(0, n.indexOf('-') + 1) : '')

/** Which sheet does this FILENAME name, or null if none of them do. */
const identifyByName = (file) => {
  const name = basename(file).toLowerCase()

  // Longest stem wins, so "strip-blocks-r1" beats "blocks", and
  // "mountains-near" beats a bare "mountains".
  //
  // A BARE-ID hit is refused when the file carries somebody else's prefix.
  // Every walk entry answers to its id alone, so `mount-archer.jpg` — a
  // sheet that was deleted from the manifest, whose file nobody removed —
  // matched on `archer` and was sliced straight over the archer's FIXTURE.
  // The tower then flew a stone parapet where its bow should be, and the
  // only trace was a good sprite silently getting smaller on disk. The
  // same shape of accident is waiting in every `roll-*.jpg` left over from
  // the eight-panel siege sheets.
  const byName = TARGETS
    .map((t) => {
      const hit = t.stems.filter((st) => name.includes(st.toLowerCase()))
        .sort((a, b) => b.length - a.length)[0]
      if (!hit) return { t, hit: undefined }
      const primary = t.stems[0].toLowerCase()
      // Stale when the match came only from the bare id AND the file leads
      // with somebody else's prefix. `mountains-far` still answers to its own
      // id because the name STARTS with it; `mount-archer` does not.
      const stale = !name.includes(primary)
        && !name.startsWith(hit.toLowerCase())
        && !(prefixOf(primary) && name.startsWith(prefixOf(primary)))
      return { t, hit: stale ? undefined : hit }
    })
    .filter((x) => x.hit)
    .sort((a, b) => b.hit.length - a.hit.length)
  return byName.length ? byName[0].t : null
}

const identify = (file, w, h) => {
  if (FORCE_SHEET) {
    const t = TARGETS.find((x) => x.id === FORCE_SHEET)
    if (!t) {
      throw new Error(`--sheet ${FORCE_SHEET} is unknown. Try one of:\n  `
        + TARGETS.map((x) => x.id).join(', '))
    }
    return t
  }
  const named = identifyByName(file)
  if (named) return named

  const ratio = w / h
  const byShape = TARGETS.filter((t) => Math.abs(t.width / t.height - ratio) < 0.01)
  if (byShape.length === 1) return byShape[0]
  throw new Error(byShape.length
    ? `${w}x${h} matches ${byShape.length} targets (${byShape.map((t) => t.id).join(', ')}) — pass --sheet <id>`
    : `${w}x${h} matches nothing in the index — pass --sheet <id>`)
}

// ─── One return per sheet ───────────────────────────────────────────────────
//
// A directory walk cannot tell a re-roll from a leftover. `still-gate-frame-div`
// sitting in `painted/` as BOTH a .jpg and a .png identifies twice, slices
// twice, and writes the same file twice — and the one that happens to sort last
// silently wins. That is how the trap gate came to ship the return whose posts
// the slicer had to squeeze to a fifth of their painted width, while the one
// that registered cleanly sat right beside it in the same folder.
//
// Refused rather than guessed, on the same grounds as the aspect check: both
// files look fine, the loser leaves no trace, and picking by extension or by
// sort order would be the tool inventing an answer to a question only the
// person who painted them can settle.
const AMBIGUOUS = new Set()
{
  const byId = new Map()
  for (const f of FORCE_SHEET ? [] : inputs) {
    const t = identifyByName(f)
    if (!t) continue
    byId.set(t.id, [...(byId.get(t.id) ?? []), f])
  }
  for (const [id, fs] of byId) {
    if (fs.length < 2) continue
    AMBIGUOUS.add(id)
    console.error(`\n✗ ${id} — ${fs.length} files in the input name this sheet:`)
    for (const f of fs) console.error(`      ${relative(ROOT, f)}`)
    console.error('  They all write the same target, so whichever is read last would'
      + ' silently win.')
    console.error(`  Move the ones you are done with into`
      + ` ${relative(ROOT, join(PAINTED, 'retired'))}${sep}, or pass the one you`)
    console.error('  want on its own. Nothing was written for this sheet.')
  }
}

// ─── Chrome, for decode / crop / WebP encode ────────────────────────────────

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!chromePath) {
  console.error('No Chrome found. Tried:\n  ' + CHROME_CANDIDATES.join('\n  '))
  process.exit(1)
}

const PORT = 9336 + (process.pid % 200)
// An isolated profile, always. The shared one is held by the user's own browser
// and two clients on one profile deadlock with no recovery.
const profile = mkdtempSync(join(tmpdir(), 'ts-slice-'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-gpu', 'about:blank'
], { stdio: 'ignore' })

let ws
let msgId = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((res, rej) => {
  const m = { id: ++msgId, method, params }
  pending.set(m.id, { res, rej })
  ws.send(JSON.stringify(m))
})

const shutdown = (code) => {
  try { ws?.close() } catch {}
  try { chrome.kill() } catch {}
  setTimeout(() => {
    try { rmSync(profile, { recursive: true, force: true }) } catch {}
    process.exit(code)
  }, 300)
}

/** Guard against a target that would escape the output root. */
const safeTarget = (target) => {
  const full = resolve(OUT_ROOT, target)
  const rel = relative(OUT_ROOT, full)
  return rel && !rel.startsWith('..') && !rel.startsWith(sep) ? full : null
}

// ─── The receipt: what each painting was cut against ────────────────────────
//
// (Ported from the art-generation-pipeline skill's slicer.) A painting is a
// snapshot of a DRAWING, and the drawing moves: when a design is re-cut, the
// next slice anybody runs — for an unrelated sheet — would put the OLD painting
// back over the corrected drawing, silently.
//
// So a successful slice leaves `painted/.sliced.json`: per painting, the
// REVISION of the reference it was cut against (first 12 hex of a sha1 over the
// clean exported sheet) and the painting's OWN hash. When the reference has
// changed since, that painting is refused (`--stale-ok` overrides). The
// painting's hash is what lets a re-roll saved under the old name through: a
// line only ever describes the bytes it was written for.
//
// No receipt (a fresh clone, a first run) refuses nothing. `pnpm art:prompts`
// reads the same file for `PAINT-STATUS.md`; a refused painting belongs in
// `painted/retired/` (or `stale/`), with its sliced .webp files deleted.

const RECEIPT = join(PAINTED, '.sliced.json')
const receipt = (() => {
  try {
    const r = JSON.parse(readFileSync(RECEIPT, 'utf-8'))
    return r && typeof r === 'object' ? (r.files ?? {}) : {}
  } catch {
    // Missing or corrupt: a receipt only ever ADDS a refusal, so the safe
    // failure is to behave as if nothing had been sliced yet.
    return {}
  }
})()
const receiptNext = { ...receipt }

/** The clean reference a painting was made from, if it is still on disk. */
const referenceOf = (sheet) => {
  const stem = sheet.stems?.[0]
  if (!stem) return null
  const p = join(ROOT, 'art-sheets', `${stem}.png`)
  return existsSync(p) ? p : null
}

const revOf = (file) => createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 12)

/** `{ ok }` to go ahead, `{ ok: false, why }` to refuse; a `warn` either way. */
const freshness = (file, sheet) => {
  const ref = referenceOf(sheet)
  if (!ref) return { ok: true }
  const rev = revOf(ref)
  const own = revOf(file)
  let seen = receipt[basename(file)]
  // The same NAME with different bytes is a new painting the old line says
  // nothing about.
  if (seen?.painting && seen.painting !== own) seen = undefined
  if (seen?.rev && seen.rev !== rev) {
    return {
      ok: false,
      rev,
      why: `the reference was REDRAWN after this was painted (${seen.rev} → ${rev}).`
        + `\n    ${relative(ROOT, ref)} is not the picture this file was painted over any more.`
        + '\n    Repaint it from the new sheet, or pass --stale-ok to cut it anyway.'
    }
  }
  if (!seen && statSync(ref).mtimeMs > statSync(file).mtimeMs + 60_000) {
    return {
      ok: true, rev, own,
      warn: `no receipt for this one yet, and ${basename(ref)} is newer than it.`
        + ' If the drawing changed since it was painted, this cuts the OLD one — check it, or repaint.'
    }
  }
  return { ok: true, rev, own }
}

let written = 0
let skipped = 0
// The sheets refused above for having more than one return in the input are
// already counted, so the run exits non-zero and the tally names them.
let failed = AMBIGUOUS.size
// Creature walks written this run: each is the character a boss's death is
// painted AS (`tools/art-models.mjs`), so its model is re-cut after the run.
const cutWalks = new Set()

try {
  let page = null
  for (let i = 0; i < 60 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json())
        .find((t) => t.type === 'page')
    } catch {}
    if (!page) await sleep(250)
  }
  if (!page) throw new Error('Chrome did not expose a debugging target')

  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', () => rej(new Error('could not attach to Chrome')), { once: true })
  })
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    const p = pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
  })
  await send('Runtime.enable')

  for (const file of inputs) {
    const b64 = readFileSync(file).toString('base64')
    const mime = /\.png$/i.test(file) ? 'image/png'
      : /\.webp$/i.test(file) ? 'image/webp' : 'image/jpeg'
    if (mime === 'image/jpeg') {
      console.warn(`
  ! ${basename(file)} is a JPEG. JPEG cannot carry`
        + ' transparency, and its lossy chroma smears the magenta into the'
        + ' artwork at every edge, which leaves a pink fringe the key cannot'
        + ' fully remove. Ask for PNG.')
    }

    const probe = await send('Runtime.evaluate', {
      expression: `(async () => {
        const img = new Image();
        img.src = 'data:${mime};base64,${b64}';
        await img.decode();
        globalThis.__sheet = img;
        return JSON.stringify({ w: img.naturalWidth, h: img.naturalHeight });
      })()`,
      awaitPromise: true, returnByValue: true
    })
    if (probe.exceptionDetails) throw new Error(`could not decode ${basename(file)}`)
    const { w, h } = JSON.parse(probe.result.value)

    let sheet
    try {
      sheet = identify(file, w, h)
    } catch (e) {
      console.error(`\n✗ ${basename(file)} — ${e.message}`)
      failed++
      continue
    }
    // Reported once, up front, with every file that claims it.
    if (AMBIGUOUS.has(sheet.id)) continue

    // A painting of a drawing that has since moved is not this drawing's
    // painting — see "The receipt" above.
    const fresh = freshness(file, sheet)
    if (!fresh.ok && !STALE_OK) {
      console.error(`\n✗ ${basename(file)} — ${fresh.why}`)
      failed++
      continue
    }
    if (!fresh.ok) console.warn(`\n  ! ${basename(file)} — ${fresh.why.split('\n')[0]} Slicing anyway (--stale-ok).`)
    if (fresh.warn) console.warn(`  ! ${fresh.warn}`)
    // Held, not written: the receipt records what was actually CUT, and this
    // painting can still be refused below (a re-composed grid, a shape that
    // cannot be corrected, painted-on rules). Writing it here recorded a cut
    // that never happened — and worse, when one run is pointed at a folder of
    // paintings with `--sheet`, it recorded EVERY refused painting against that
    // sheet's reference, so the next status report called 62 healthy sprites
    // stale. It is committed beside the first file this sheet writes.
    const receiptLine = fresh.rev
      ? { sheet: sheet.id, rev: fresh.rev, painting: fresh.own ?? revOf(file), at: new Date().toISOString() }
      : null

    // The sheet may come back at a different resolution than it left at, which
    // is fine and expected. What is NOT fine is a different SHAPE: that means
    // the grid was re-composed, and every rect in the index is then a lie.
    const sx = w / sheet.width
    const sy = h / sheet.height
    console.log(`\n${basename(file)} → ${sheet.kind} "${sheet.id}"  ${w}x${h} (${sx.toFixed(3)}x)`)

    // A STRIP is one row, so a uniform vertical squash is recoverable: the
    // cells still divide the width evenly, every cell is distorted by the same
    // factor, and stretching each one back to square restores the intent. An
    // image model that returns 1024x123 instead of 2048x256 has not re-composed
    // anything, it has just let the proportions drift, and refusing that would
    // throw away a good generation over arithmetic we can do ourselves.
    //
    // A multi-row SHEET gets no such benefit: there, a vertical mismatch means
    // the rows no longer land where the index says, and every rect is wrong.
    // A single-cell image has no lattice at all: the rect IS the image. Any
    // proportion it comes back at is simply resized to the target square, which
    // is why one object per file is the sturdiest way through — there is
    // nothing left for a repaint to knock out of alignment.
    // A still has no lattice: the rect IS the image, and whatever proportion
    // it comes back at is resampled to the panel. Warn, because a squeeze
    // distorts, but never refuse a good generation over it.
    const still = sheet.frames === 1
    if (still && Math.abs((w / h) / (sheet.width / sheet.height) - 1) > 0.06) {
      console.warn(`  ! aspect is ${(w / h).toFixed(2)}:1, wanted`
        + ` ${(sheet.width / sheet.height).toFixed(2)}:1 — it will be squeezed to fit.`)
      console.warn('    Set the aspect ratio in your image tool to match to avoid this.')
    }
    if (sheet.tile) {
      console.log(`  · tileable (${sheet.tile}) — check the seam in the playground`)
    }
    void FIT
    const drift = still ? 0 : Math.abs(sx - sy) / Math.max(sx, sy)
    if (drift > 0.01) {
      // A walk sheet is forgiven the same way a strip is, and for the same
      // reason: the panels still divide the frame evenly, every one is distorted
      // by the same factor, and each is resampled back to its nominal box on the
      // way out. Refusing a good generation over arithmetic we can do ourselves
      // is the more expensive mistake when a generation costs a re-roll.
      if (!['strip', 'walk'].includes(sheet.kind) || drift > 0.15) {
        console.error(`  ✗ aspect ratio changed (${sx.toFixed(3)} vs ${sy.toFixed(3)}).`)
        console.error(['strip', 'walk'].includes(sheet.kind)
          ? '    Too far off to correct — ask for it again at the stated size.'
          : '    The model re-composed the grid; the cell rects no longer apply.')
        failed++
        continue
      }
      console.warn(`  ! proportions drifted ${(drift * 100).toFixed(1)}%`
        + ` — squares came back ${sy < sx ? 'squashed' : 'stretched'}; correcting to square.`)
    }

    // Chroma is simply ON unless refused.
    //
    // Two heuristics were tried for "does this image have a magenta ground" and
    // both were wrong for the same reason: a block fills its cell edge to edge
    // by contract, so on a block strip there is barely any background to find —
    // magenta shows only in the rounded corners. Border sampling saw artwork,
    // and a whole-image fraction came in under any sane threshold.
    //
    // The keyer's channel test (G under 70 with R and B both over 190) matches
    // nothing in `PALETTES` — the closest is the bat's #ff5ad0, clear by twenty
    // points of green — so running it on an image with no magenta in it is a
    // no-op rather than a risk. No detection needed.
    const chroma = !NO_CHROMA

    // ── What grid did we ACTUALLY get back? ──
    //
    // A walk sheet is the one thing here that cannot survive a re-composed
    // grid. Every other target is either a single object or a row whose cells
    // are square by contract; a walk is N panels of one animation, and cutting
    // 4x2 out of a sheet that came back 4x6 does not produce a wrong-looking
    // frame, it produces three-sixths of a frame, eight times.
    //
    // Two real returns forced this. One came back with the panel dividers drawn
    // in as magenta LINES on a dusty-pink ground — the background rule read as
    // an instruction to decorate with magenta rather than to fill with it. The
    // other silently grew from two rows to six.
    //
    // So the layout is measured off the pixels: bands of content separated by
    // runs of background. Only the COUNT is taken from the measurement. The cut
    // itself stays a uniform grid, because panels of unequal width resampled to
    // one output size would shift the creature between frames — the exact
    // jitter the no-trim rule exists to prevent.
    if (sheet.kind === 'walk') {
      const seen = await send('Runtime.evaluate', {
        expression: `(() => {
          const img = globalThis.__sheet;
          const W = img.naturalWidth, H = img.naturalHeight;
          const cv = document.createElement('canvas');
          cv.width = W; cv.height = H;
          const c2 = cv.getContext('2d');
          c2.drawImage(img, 0, 0);
          const d = c2.getImageData(0, 0, W, H).data;

          // The background is whatever the outer ring is made of. Up to four
          // colours, because a drawn divider that reaches the edge is part of
          // the furniture even though it is not the ground.
          const q = (i) => ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
          const counts = new Map();
          const ring = [];
          for (let x = 0; x < W; x++) { ring.push(x); ring.push((H - 1) * W + x); }
          for (let y = 0; y < H; y++) { ring.push(y * W); ring.push(y * W + W - 1); }
          for (const k of ring) {
            const key = q(k * 4);
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
          const centre = (k) => [((k >> 8) & 15) * 16 + 8, ((k >> 4) & 15) * 16 + 8, (k & 15) * 16 + 8];
          const near = (a, b, tol) =>
            Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol;
          const refs = [];
          for (const [key] of [...counts].sort((a, b) => b[1] - a[1])) {
            const c3 = centre(key);
            if (refs.some((r) => near(r, c3, 64))) continue;
            if (refs.length < 4) refs.push(c3);
          }
          // Magenta counts as background wherever it turns up, drawn on purpose
          // or not: nothing in the palette is within twenty points of it.
          const isBg = (k) => {
            const i = k * 4;
            if (d[i + 3] < 8) return true;
            if (d[i + 1] < 70 && d[i] > 190 && d[i + 2] > 190) return true;
            return refs.some((r) => near(r, [d[i], d[i + 1], d[i + 2]], 60));
          };

          // How much of one line, across the whole axis, is background.
          const bgLine = (a, m, at) => {
            let bg = 0;
            for (let b = 0; b < m; b++) if (isBg(at(a, b))) bg++;
            return bg / m;
          };

          // ── Snap to a uniform grid, do not trust raw content bands ──
          //
          // Bands alone are wrong, and a real return proved it: a shark whose
          // tail fin is drawn detached from its body has a full-height column
          // of background running down the middle of its own panel, so four
          // panels measured as six bands. What is actually being looked for is
          // a REPEATING cut, and the cut is uniform by construction.
          //
          // So each candidate count is tested directly: are all of its interior
          // cut lines clean, and does every panel it produces contain something?
          // The largest count that passes wins — the cuts of a 4-grid are a
          // subset of an 8-grid's, so asking "is it clean" alone would always
          // answer 1.
          const fit = (n, m, at) => {
            const best = { n: 1 };
            for (let k = 2; k <= 12; k++) {
              if (n / k < 32) break;
              let clean = true;
              for (let i = 1; i < k && clean; i++) {
                // A drawn divider has width, and a cut can land a pixel either
                // side of it, so the neighbourhood is what is tested.
                const at0 = Math.round((n * i) / k);
                let bestLine = 0;
                for (let o = -2; o <= 2; o++) {
                  const a = at0 + o;
                  if (a < 0 || a >= n) continue;
                  bestLine = Math.max(bestLine, bgLine(a, m, at));
                }
                if (bestLine < 0.985) clean = false;
              }
              if (!clean) continue;
              // Every panel has to hold a creature. Without this an empty
              // margin would happily split into more, smaller empty panels.
              const content = [];
              for (let i = 0; i < k; i++) {
                const s0 = Math.round((n * i) / k), e0 = Math.round((n * (i + 1)) / k);
                let on = 0;
                for (let a = s0; a < e0; a++) if (bgLine(a, m, at) < 0.98) on++;
                content.push(on / Math.max(1, e0 - s0));
              }
              const top = Math.max(...content);
              if (top <= 0 || Math.min(...content) < top * 0.3) continue;
              best.n = k;
            }
            return best.n;
          };

          const colsN = fit(W, H, (x, y) => y * W + x);
          const rowsN = fit(H, W, (y, x) => y * W + x);
          // The commonest colour on the outer ring IS the ground the painter
          // used, whatever they were asked for. Reported so a background that
          // is merely magenta-ish can be named rather than guessed at.
          const top = refs[0] ?? [0, 0, 0];
          const hex = '#' + top.map((v) => v.toString(16).padStart(2, '0')).join('');
          const isMagenta = top[1] < 70 && top[0] > 190 && top[2] > 190;

          // ── Painted panel edges ──
          // How much of each NOMINAL cut line has dark ink on it. The fit above
          // forgives a drawn divider on purpose (it reads the count through
          // it), but a return drawn as a comic strip — ruled borders round every
          // panel, a caption at the top of each — comes back with both inside
          // the frames. A creature never runs the length of a cut; a rule does.
          const dark = (k) => {
            const i = k * 4;
            if (d[i + 3] < 8) return false;
            if (d[i + 1] < 70 && d[i] > 190 && d[i + 2] > 190) return false;
            return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 80;
          };
          const ink = (n, m, at, parts) => {
            const out = [];
            const win = Math.max(3, Math.round(n * 0.008));
            for (let i = 1; i < parts; i++) {
              const a0 = Math.round((n * i) / parts);
              let hit = 0;
              for (let b = 0; b < m; b++) {
                for (let o = -win; o <= win; o++) {
                  const a = a0 + o;
                  if (a >= 0 && a < n && dark(at(a, b))) { hit++; break; }
                }
              }
              out.push(+(hit / m).toFixed(3));
            }
            return out;
          };
          const inkV = ink(W, H, (x, y) => y * W + x, ${sheet.cols});
          const inkH = ink(H, W, (y, x) => y * W + x, ${sheet.rows});
          return JSON.stringify({ cols: colsN, rows: rowsN, W, H, hex, isMagenta, inkV, inkH });
        })()`,
        returnByValue: true
      })
      const got = seen.exceptionDetails ? null : JSON.parse(seen.result.value)
      const wantCols = sheet.cols
      const wantRows = sheet.rows

      // Ruled like a comic strip: refused, because the rules and whatever was
      // written between them (the painted deaths came back captioned "THE BLOW
      // LANDS", "IT STAGGERS"…) would be cut into every frame.
      const ruled = [...(got?.inkV ?? []), ...(got?.inkH ?? [])]
      let dropBorders = false
      if (ruled.some((f) => f > 0.7)) {
        const shown = `dark ink along ${ruled.filter((f) => f > 0.7).length} of the ${ruled.length}`
          + ` cut lines (${ruled.map((f) => `${Math.round(f * 100)}%`).join(', ')})`
        if (!DROP_BORDERS) {
          console.error(`  ✗ panel borders are painted on it — ${shown}.`)
          console.error('    A return ruled like a comic strip carries the rules, and usually')
          console.error('    captions, into every frame. Nothing was written — re-generate it,')
          console.error('    or pass --drop-borders to paint the rules out and cut it anyway')
          console.error('    (look at it first: a ruled return often has captions too).')
          failed++
          continue
        }
        // Salvage: the rules lie ON the cut lines, which is ground no panel may
        // use, so painting a band of background over them costs nothing that
        // belongs to a creature — and saves a good generation from its frame.
        console.warn(`  ! panel borders painted on it — ${shown}. Painting them out (--drop-borders).`)
        dropBorders = true
      }

      // The two repairs that are pure geometry, done in one pass over the
      // sheet before anything is measured off it or cut out of it.
      if (dropBorders || MIRROR) {
        if (MIRROR) console.warn('  ! flipping every panel left-to-right (--mirror).')
        const fixed = await send('Runtime.evaluate', {
          expression: `(() => {
            const img = globalThis.__sheet;
            const W = img.naturalWidth ?? img.width, H = img.naturalHeight ?? img.height;
            const cv = document.createElement('canvas');
            cv.width = W; cv.height = H;
            const c2 = cv.getContext('2d');
            if (${MIRROR}) {
              // Each PANEL is flipped where it lies: flipping the whole sheet
              // would run the animation backwards.
              const pw = W / ${sheet.cols}, ph = H / ${sheet.rows};
              for (let r = 0; r < ${sheet.rows}; r++) {
                for (let c = 0; c < ${sheet.cols}; c++) {
                  c2.save();
                  c2.translate(c * pw + pw, r * ph);
                  c2.scale(-1, 1);
                  c2.drawImage(img, c * pw, r * ph, pw, ph, 0, 0, pw, ph);
                  c2.restore();
                }
              }
            } else {
              c2.drawImage(img, 0, 0);
            }
            if (${dropBorders}) {
              c2.fillStyle = '#ff00ff';
              const win = Math.max(3, Math.round(W * 0.008));
              for (let i = 1; i < ${sheet.cols}; i++) c2.fillRect(Math.round(W * i / ${sheet.cols}) - win, 0, win * 2, H);
              const winY = Math.max(3, Math.round(H * 0.008));
              for (let i = 1; i < ${sheet.rows}; i++) c2.fillRect(0, Math.round(H * i / ${sheet.rows}) - winY, W, winY * 2);
              // The box drawn round the whole sheet goes too, or its sides end
              // up inside the first and last frame of each row.
              c2.fillRect(0, 0, win, H);
              c2.fillRect(W - win, 0, win, H);
              c2.fillRect(0, 0, W, winY);
              c2.fillRect(0, H - winY, W, winY);
            }
            cv.naturalWidth = W; cv.naturalHeight = H;
            globalThis.__sheet = cv;
            return 'ok';
          })()`,
          returnByValue: true
        })
        if (fixed.exceptionDetails) {
          console.error('  ✗ could not rework the sheet — nothing was written.')
          failed++
          continue
        }
      }

      if (sheet.frames === 1) {
        // A still has no grid to verify — two posts with an open doorway
        // between them, or a word with gaps between its letters, read as
        // several panels to a cut-line detector, and they are ONE object.
        // Only the ground is checked below.
      } else if (!got || got.cols < 1 || got.rows < 1) {
        console.warn('  ! could not read the panel grid — cutting the nominal'
          + ` ${wantCols}x${wantRows}. Check the result before shipping it.`)
      } else if (got.cols === wantCols && got.rows === wantRows) {
        console.log(`  · grid reads ${got.cols}x${got.rows}, as asked`)
      } else if (FRAMES_OVERRIDE && FRAMES_OVERRIDE === got.cols * got.rows) {
        console.warn(`  ! grid reads ${got.cols}x${got.rows} = ${got.cols * got.rows} panels,`
          + ` not ${wantCols}x${wantRows} — taking it as a ${FRAMES_OVERRIDE}-frame cycle.`)
        sheet = { ...sheet, cols: got.cols, rows: got.rows, frames: got.cols * got.rows }
      } else if (got.cols === 1 && got.rows === 1) {
        console.warn('  ! the whole sheet reads as ONE panel. Either the creatures'
          + ' touch each other or the background is not one flat colour.')
        console.warn(`    Cutting the nominal ${wantCols}x${wantRows} anyway.`)
      } else if (TAKE_ROWS && got.cols === wantCols && got.rows > wantRows && got.rows >= TAKE_ROWS) {
        // The columns are right and there are too many rows: the model filled
        // the air above a low creature with more of the same. The top rows are
        // the cycle it was asked for; the rest are cut off and never written.
        console.warn(`  ! grid reads ${got.cols}x${got.rows} = ${got.cols * got.rows} panels,`
          + ` not ${wantCols}x${wantRows} — taking the first ${TAKE_ROWS} row(s),`
          + ` ${got.cols * TAKE_ROWS} panels, as the cycle.`)
        sheet = { ...sheet, cols: got.cols, rows: got.rows, frames: got.cols * TAKE_ROWS }
      } else {
        const n = got.cols * got.rows
        console.error(`  ✗ grid came back ${got.cols}x${got.rows} = ${n} panels,`
          + ` asked for ${wantCols}x${wantRows} = ${sheet.frames}.`)
        console.error('    The panels are not where the cut expects them, so slicing'
          + ' this would shred every frame.')
        console.error(`    Re-generate it, or run again with --frames ${n} to accept`
          + ` it as a ${n}-frame cycle`
          + (got.cols === wantCols && got.rows > wantRows
            ? `, or --take-rows ${wantRows} to cut only the first ${wantRows} rows if the`
              + ' extra rows just repeat it.'
            : '.'))
        failed++
        continue
      }

      // A ground that is only ROUGHLY magenta is the difference between a hard
      // key, which can never touch the artwork, and the flood fallback, which
      // eats any pale paint it can reach. One return came back on dusty pink and
      // lost three of its eight fish to exactly that.
      // Not for a subject that fills its frame by contract, and not for a
      // band with artwork on three sides: there, the frame ring IS artwork.
      if (got && got.isMagenta === false && sheet.bg === 'magenta' && !sheet.fill) {
        console.warn(`  ! the background is ${got.hex}, not #ff00ff.`)
        console.warn('    Only true magenta can be keyed safely. Anything else falls')
        console.warn('    back to a flood fill, which eats pale artwork it can reach —')
        console.warn('    check every frame before shipping this.')
      }

      // Rebuild the cells on whatever grid we settled on. The index's rects
      // describe the sheet that went OUT; this describes the one that came in.
      const pw = sheet.width / sheet.cols
      const ph = sheet.height / sheet.rows
      sheet = {
        ...sheet,
        cells: Array.from({ length: sheet.frames }, (_, i) => ({
          id: `${sheet.id}#${i}`,
          label: sheet.id,
          variant: `frame ${i + 1}/${sheet.frames}`,
          x: (i % sheet.cols) * pw,
          y: Math.floor(i / sheet.cols) * ph,
          w: pw, h: ph,
          target: sheet.target,
          frame: i
        }))
      }
    }

    const slices = sheet.cells.filter((c) => c.target)
    if (!slices.length) {
      console.log(`  (no cell on this ${sheet.kind} has a drop-in target — reference only)`)
      continue
    }

    const plan = slices.map((c) => ({
      id: c.id,
      target: c.target,
      letterboxed: c.letterboxed ?? null,
      sx: Math.round(c.x * sx), sy: Math.round(c.y * sy),
      sw: Math.round(c.w * sx), sh: Math.round(c.h * sy),
      // Square again. When the proportions drifted this is what undoes it;
      // when they did not, source and output are equal and nothing resamples.
      // A single-cell image is capped: a model handed back 1536x1536 would
      // otherwise become a 1536 px block sprite, which is six times the size
      // `art-todo.md` asks for and pure payload for no visible gain.
      fit: 'squash',
      isBlock: false,
      trim: !NO_TRIM,
      // Never on an OPAQUE tile, and never on a subject that FILLS its frame:
      // both are artwork edge to edge, so the frame ring the flood seeds from
      // is the drawing itself. Seeded from a crate's own dark planks, the
      // flood ate a fifth of the crate.
      autoBg: !NO_AUTO_BG && sheet.bg !== 'opaque' && !sheet.fill,
      // Which frame edges may SEED the flood.
      //
      // A band whose sky is at the top has artwork touching the other three
      // edges: the mountain range's base runs along the bottom, and its uniform
      // pale wash was picked up as "the background", so the flood started there
      // and ate the entire range but one peak. The sky is contiguous from the
      // top, so seeding from that edge alone reaches all of it and can never
      // start inside the mountain.
      seedTopOnly: sheet.bg === 'magenta-sky',
      // Enclosed-pocket removal is for a checkerboard square walled in by
      // artwork. On a JPEG it does the opposite: lossy chroma sprays magenta
      // INTO pale artwork, those specks look like tiny gaps, and removing them
      // punched holes right through the logo's lettering. Lossless only.
      pockets: mime !== 'image/jpeg',
      // Which frame of a walk cycle this panel is, or undefined for everything
      // else. Its presence is what routes the panel into the strip composer
      // instead of straight to a file of its own.
      frame: c.frame,
      // Panels are written at the NOMINAL panel shape, not the returned one.
      //
      // That is what makes a sheet that came back 16:9 when it was asked for 2:1
      // usable instead of rejected: the squash is uniform across every panel, so
      // resampling each one back to the box it is supposed to be undoes it
      // exactly. Capped by height because a 4K return would otherwise compose
      // into an 8192 px strip — pure payload, when the frame box is ~156 px in
      // game and the bake already downsamples at maximum zoom on a 3x screen.
      // A walk frame is sized by its TALL edge, and `--size` caps it.
      //
      // The cap used to be the constant alone, which quietly made `--size` a
      // no-op for every strip in the game: a pass meant to shrink the payload
      // took 128 px off each block and left the seventeen monster strips —
      // by far the heaviest thing shipped — at full size.
      outW: sheet.kind === 'scenery'
        ? c.w
        : sheet.kind === 'walk'
          ? Math.round(walkEdge(sheet, c, sy) * (c.w / c.h))
          : undefined,
      outH: sheet.kind === 'scenery'
        ? c.h
        : sheet.kind === 'walk'
          ? walkEdge(sheet, c, sy)
          : undefined,
      out: SIZE_FORCED ? SIZE : (sheet.kind === 'cell'
        ? Math.min(512, Math.round(Math.max(c.w * sx, c.h * sy)))
        : Math.round(c.w * sx))
    }))

    const cut = await send('Runtime.evaluate', {
      expression: `(() => {
        const img = globalThis.__sheet;
        const plan = ${JSON.stringify(plan)};
        const q = ${QUALITY};
        const CHROMA = ${chroma && sheet.bg !== 'opaque'};
        const FIT_REF = ${JSON.stringify(sheet.fit ?? null)};
        const FIT_TIGHT = ${sheet.tight ? 'true' : 'false'};
        const ANCHOR_REF = ${JSON.stringify(sheet.anchor ?? 'feet')};
        // The logo ships as PNG where the PWA manifest reads it; everything
        // else the renderer probes is WebP.
        const MIME_OUT = ${JSON.stringify(/\.png$/i.test(sheet.target ?? '') ? 'image/png' : 'image/webp')};
        const EXTRA = ${JSON.stringify(sheet.extra ?? [])};
        const ART_KIND = ${JSON.stringify(sheet.artKind ?? '')};
        const GATE_REF = ${JSON.stringify(sheet.post ?? null)};
        const encode = (cv2, mime) => mime === 'image/png' ? cv2.toDataURL('image/png') : cv2.toDataURL('image/webp', q);
        const out = [];
        // Walk-cycle panels, held back so they can be composed into one strip.
        const strip = [];
        for (const p of plan) {
          // Crop the cell 1:1 first, so measuring happens on real pixels.
          const cell = document.createElement('canvas');
          cell.width = p.sw; cell.height = p.sh;
          const cc = cell.getContext('2d');
          cc.drawImage(img, p.sx, p.sy, p.sw, p.sh, 0, 0, p.sw, p.sh);

          const id = cc.getImageData(0, 0, p.sw, p.sh);
          const d = id.data;
          const N_PIX = p.sw * p.sh;
          let keyed = 0;

          // Chroma key. Asking an image model for a transparent background is
          // unreliable — one attempt came back fully opaque, and it painted the
          // grey-and-white transparency checkerboard in as if it were art. A
          // flat magenta ground is something it can actually draw, and this
          // removes it. The band between the two thresholds is the anti-aliased
          // edge: it gets partial alpha, and the magenta pulled back out of the
          // surviving colour so sprites do not wear a pink halo.
          if (CHROMA) {
            // A CHANNEL test, not a distance-to-magenta one. Distance banding
            // ate legitimate colour: the bat's accent is #ff5ad0, which sits
            // close enough to pure magenta that a soft distance key knocked it
            // to 39% alpha. Pure magenta is the only thing with G near zero AND
            // both R and B near full, and no palette in the game has that.
            const W = p.sw, H = p.sh, N = W * H;
            const bg = new Uint8Array(N);
            for (let k = 0; k < N; k++) {
              const i = k * 4;
              if (d[i + 1] < 70 && d[i] > 190 && d[i + 2] > 190) { bg[k] = 1; d[i + 3] = 0; keyed++; }
            }
            // De-fringe ONLY where art meets keyed background. Anti-aliasing
            // leaves a pink rim there; running this over the whole cell instead
            // would desaturate every warm highlight in the sprite.
            for (let y = 0; y < H; y++) {
              for (let x = 0; x < W; x++) {
                const k = y * W + x;
                if (bg[k]) continue;
                const touches = (x > 0 && bg[k - 1]) || (x < W - 1 && bg[k + 1])
                  || (y > 0 && bg[k - W]) || (y < H - 1 && bg[k + W]);
                if (!touches) continue;
                const i = k * 4, r = d[i], g = d[i + 1], b = d[i + 2];
                if (r > g + 30 && b > g + 30) {
                  const spill = Math.min(r - g, b - g);
                  d[i] = r - spill;
                  d[i + 2] = b - spill;
                  d[i + 3] = Math.max(0, d[i + 3] - Math.round(spill * 0.8));
                }
              }
            }
            // ── Unmix the soft edge from the magenta ──
            //
            // A hard key only removes what IS the ground. The moon is painted
            // with a wide luminous halo, and where that halo lay over the
            // magenta the two MIXED: those pixels are not background, and they
            // are nowhere near an edge, so both the flood and the erode leave
            // them. The moon shipped wearing a thick pink ring.
            //
            // Its background colour is known exactly, so the mix can be undone.
            // Distance from magenta gives the coverage, and magenta's share is
            // then subtracted back out of the colour that remains.
            //
            // Gated on the hard key having found REAL ground, not on the shore
            // clustering — a halo is a gradient across dozens of buckets, which
            // is exactly the case the clustering gate rejects.
            if (keyed > N_PIX * 0.03) {
              const LO = 60, HI = 210;
              for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 8) continue;
                const dist = Math.abs(d[i] - 255) + d[i + 1] + Math.abs(d[i + 2] - 255);
                if (dist >= HI) continue;
                if (dist <= LO) { d[i + 3] = 0; keyed++; continue; }
                const a2 = (dist - LO) / (HI - LO);
                // P = a*F + (1-a)*B, with B = magenta  =>  F = (P - (1-a)*B) / a
                const un = (v, bg) => {
                  const f = (v - (1 - a2) * bg) / a2;
                  return f < 0 ? 0 : f > 255 ? 255 : Math.round(f);
                };
                d[i] = un(d[i], 255);
                d[i + 1] = un(d[i + 1], 0);
                d[i + 2] = un(d[i + 2], 255);
                d[i + 3] = Math.round(d[i + 3] * a2);
              }
            }

            // ── Boundary erode ──
            //
            // The difference key only reaches pixels within 210 of magenta, and
            // the very outermost rim of a soft edge sits beyond that — which is
            // why the sun kept a thin pink outline after everything else. Being
            // ADJACENT to keyed background is itself strong evidence, so the
            // rule can be much looser there than it could be image-wide.
            if (keyed > N_PIX * 0.03) {
              const W2 = p.sw, H2 = p.sh;
              const Aa = (k) => d[k * 4 + 3];
              for (let pass = 0; pass < 2; pass++) {
                const edits = [];
                for (let y = 0; y < H2; y++) {
                  for (let x = 0; x < W2; x++) {
                    const k = y * W2 + x, i = k * 4;
                    if (d[i + 3] < 8) continue;
                    const touches = (x > 0 && Aa(k - 1) < 8) || (x < W2 - 1 && Aa(k + 1) < 8)
                      || (y > 0 && Aa(k - W2) < 8) || (y < H2 - 1 && Aa(k + W2) < 8);
                    if (!touches) continue;
                    const dist = Math.abs(d[i] - 255) + d[i + 1] + Math.abs(d[i + 2] - 255);
                    if (dist >= 300) continue;
                    edits.push([i, Math.round(d[i + 3] * Math.max(0, (dist - 120) / 180))]);
                  }
                }
                if (!edits.length) break;
                for (const [i, a2] of edits) d[i + 3] = a2;
              }
            }

            // ── Spill suppression ──
            //
            // What is left after unmixing is a mauve ring: halo pixels far
            // enough from pure magenta that widening the unmix to reach them
            // would start eating the moon's own pale edge.
            //
            // So stop trying to make them transparent and take the magenta OUT
            // of them instead. Magenta's signature is red and blue both above
            // green; pulling the excess down leaves a neutral halo, which is
            // what the glow was supposed to be. Warm art is untouched — cream
            // and tan have blue BELOW green, so they show no excess at all.
            if (keyed > N_PIX * 0.03) {
              for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 8) continue;
                const g = d[i + 1];
                const spill = Math.min(d[i], d[i + 2]) - g;
                if (spill <= 0) continue;
                d[i] = Math.round(d[i] - spill * 0.9);
                d[i + 2] = Math.round(d[i + 2] - spill * 0.9);
              }
            }

            cc.putImageData(id, 0, 0);
          }

          // ── Whatever the background actually turned out to be ──
          //
          // The magenta key only removes magenta. Returns arrive on white, on
          // cream parchment, or with the transparency CHECKERBOARD painted in
          // as literal pixels — a texture no colour key can express.
          //
          // So: work out what the background IS from the edge of the artwork,
          // then flood inward. Flooding is the trick — it only removes what is
          // CONNECTED to an edge, so a cream highlight inside the sun survives
          // while the cream around it does not.
          //
          // SEEDS ARE THE SHORE, NOT THE FRAME. Seeding from the image border
          // failed on the logo, which came back as a cream card floating on
          // magenta: the key cleared the border first, so there were no opaque
          // border pixels left to start from and the card sailed through. The
          // seeds are therefore every opaque pixel that touches transparency or
          // the frame — the outline of whatever is actually left.
          //
          // AND IT ONLY RUNS WHEN THE KEY FOUND NOTHING.
          //
          // Seeding is from the frame (see below), so after a magenta key has
          // succeeded the only opaque pixels left on that frame are ARTWORK that
          // crossed the cut line — six pixels of thornwick's leaves in one panel,
          // seventeen in the next. A handful of artwork pixels are then 100% of
          // the seeds, they clear the 70% cluster gate by themselves, and the
          // flood adopts the creature's own pale timber as "the background" and
          // eats the frame from the inside. Two of thornwick's eight frames came
          // back empty, and a boss that vanishes for an eighth of a second every
          // stride is the kind of bug that reads as a rendering fault.
          //
          // There is nothing to lose by skipping it: this is the fallback for the
          // grounds a colour key cannot express — white, cream, painted-in
          // checkerboard, dusty pink — and if the key already cleared the ground,
          // everything still opaque is the drawing.
          //
          // The seed floor guards the same failure on the paths where the key is
          // off or found nothing: a real background reaches a good share of the
          // frame it is behind. A dozen pixels of leaf do not.
          const shore = p.seedTopOnly ? p.sw : 2 * (p.sw + p.sh);
          if (p.autoBg && keyed <= N_PIX * 0.03) {
            const W = p.sw, H = p.sh, N = W * H;
            const A = (k) => d[k * 4 + 3];
            const q = (i) => ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);

            const seeds = [];
            for (let y = 0; y < H; y++) {
              for (let x = 0; x < W; x++) {
                const k = y * W + x;
                if (A(k) < 8) continue;
                // SEED FROM THE FRAME ONLY.
                //
                // Seeding from "opaque next to transparent" was seeding from
                // the ARTWORK'S OWN OUTLINE: once the magenta around a conifer
                // is keyed, the tree's silhouette becomes the shore, its
                // uniform dark green becomes "the background", and the flood
                // eats holes straight through the foliage.
                //
                // Background is by definition what reaches the edge of the
                // frame. Anything walled in by artwork is either a pocket
                // (handled separately) or it is the artwork.
                const onFrame = p.seedTopOnly
                  ? y === 0
                  : x === 0 || y === 0 || x === W - 1 || y === H - 1;
                if (onFrame) seeds.push(k);
              }
            }

            const counts = new Map();
            for (const k of seeds) {
              const key = q(k * 4);
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            // CLUSTER the buckets, do not just take the top four.
            //
            // A JPEG smears one flat colour across a dozen neighbouring
            // buckets: the logo's magenta ring came back as 24 of them, and
            // taking the top four covered 68.9% — losing to a 70% gate by a
            // hair, on an image that was plainly magenta. Merging by proximity
            // measures what a human sees, which is one colour.
            const centre = (key) =>
              [((key >> 8) & 15) * 16 + 8, ((key >> 4) & 15) * 16 + 8, (key & 15) * 16 + 8];
            // 64, and the margin either side of that is the whole point.
            //
            // The logo's JPEG-smeared magenta spanned buckets about 48 apart,
            // so they must merge. Cream sits roughly 180 from magenta, so it
            // must NOT — at 96 it did, and the key ate the lettering entirely
            // and punched holes through the sun's face.
            const near = (a2, b2) =>
              Math.abs(a2[0] - b2[0]) + Math.abs(a2[1] - b2[1]) + Math.abs(a2[2] - b2[2]) <= 64;

            const ranked = [...counts].sort((a2, b2) => b2[1] - a2[1]);
            const refs = [];
            let covered = 0;
            for (const [key, n] of ranked) {
              const c2 = centre(key);
              const hit = refs.find((r2) => near(r2, c2));
              if (hit) { covered += n; continue; }
              if (refs.length < 4) { refs.push(c2); covered += n }
            }
            const keep = (i) => refs.some((r2) => near(r2, [d[i], d[i + 1], d[i + 2]]));

            // A flat ground clusters; a block's wood-grain border does not.
            if (seeds.length >= shore * 0.1 && covered / seeds.length >= 0.7) {
              const seen = new Uint8Array(N);
              const stack = [];
              for (const k of seeds) {
                if (keep(k * 4) && !seen[k]) { seen[k] = 1; stack.push(k); }
              }
              let removed = 0;
              while (stack.length) {
                const k = stack.pop();
                d[k * 4 + 3] = 0;
                removed++;
                const x = k % W, y = (k / W) | 0;
                const push = (nk) => {
                  if (nk < 0 || nk >= N || seen[nk]) return;
                  if (A(nk) < 8) { seen[nk] = 1; return; }
                  if (!keep(nk * 4)) return;
                  seen[nk] = 1; stack.push(nk);
                };
                if (x > 0) push(k - 1);
                if (x < W - 1) push(k + 1);
                if (y > 0) push(k - W);
                if (y < H - 1) push(k + W);
              }

              // ── Enclosed pockets ──
              //
              // A checkerboard square sitting in the gap between two of the
              // sun's rays is walled in by artwork, so the flood never reaches
              // it and it survives as grey speckle. Anything still matching the
              // background AND small enough to be a gap rather than a subject
              // goes too.
              // A pocket has to be a real gap, matched TIGHTLY.
              //
              // The loose match used for the flood is wrong here. JPEG noise
              // sprinkles single pixels that pass it, and removing those
              // punched magenta speckle right across the logo's card; a looser
              // match also ate two holes in the sun's face, where pale cream
              // came within range of checker-white. Cream sits ~89 from white,
              // so 32 protects it while still catching a true checker cell.
              const nearTight = (a2, b2) =>
                Math.abs(a2[0] - b2[0]) + Math.abs(a2[1] - b2[1]) + Math.abs(a2[2] - b2[2]) <= 32
              const pocketBg = (i) => refs.some((r2) => nearTight(r2, [d[i], d[i + 1], d[i + 2]]))
              const POCKET_MAX = p.pockets ? Math.max(64, Math.round(N * 0.004)) : 0
              /** Below this it is compression noise, not a gap in the drawing. */
              const POCKET_MIN = 8
              const comp = new Int32Array(N).fill(-1)
              for (let k0 = 0; k0 < N; k0++) {
                if (comp[k0] !== -1 || A(k0) < 8 || !pocketBg(k0 * 4)) continue
                const cells = []
                const st = [k0]
                comp[k0] = k0
                while (st.length) {
                  const k = st.pop()
                  cells.push(k)
                  const x = k % W, y = (k / W) | 0
                  const step = (nk) => {
                    if (nk < 0 || nk >= N || comp[nk] !== -1) return
                    if (A(nk) < 8 || !pocketBg(nk * 4)) return
                    comp[nk] = k0; st.push(nk)
                  }
                  if (x > 0) step(k - 1)
                  if (x < W - 1) step(k + 1)
                  if (y > 0) step(k - W)
                  if (y < H - 1) step(k + W)
                }
                if (cells.length >= POCKET_MIN && cells.length <= POCKET_MAX) {
                  for (const k of cells) { d[k * 4 + 3] = 0; removed++ }
                }
              }

              // ── De-fringe ──
              //
              // A checkerboard against ink leaves a rim of pixels that are a
              // BLEND of the two, matching neither bucket, which survives as
              // white speckle along every ray. How close a boundary pixel is to
              // the background decides how much alpha it keeps.
              for (let pass = 0; pass < 2; pass++) {
                const edits = [];
                for (let y = 0; y < H; y++) {
                  for (let x = 0; x < W; x++) {
                    const k = y * W + x, i = k * 4;
                    if (d[i + 3] < 8) continue;
                    const touches = (x > 0 && A(k - 1) < 8) || (x < W - 1 && A(k + 1) < 8)
                      || (y > 0 && A(k - W) < 8) || (y < H - 1 && A(k + W) < 8);
                    if (!touches) continue;
                    let best = 1e9;
                    for (const [rr, gg, bb] of refs) {
                      const dist = Math.abs(d[i] - rr) + Math.abs(d[i + 1] - gg) + Math.abs(d[i + 2] - bb);
                      if (dist < best) best = dist;
                    }
                    if (best < 70) edits.push([i, 0]);
                    else if (best < 170) edits.push([i, Math.round(d[i + 3] * (best - 70) / 100)]);
                  }
                }
                if (!edits.length) break;
                for (const [i, a2] of edits) { if (a2 === 0) removed++; d[i + 3] = a2; }
              }

              keyed += removed;
              cc.putImageData(id, 0, 0);
            }
          }

          // ── Gate frame: put the posts where the reference has them ──
          //
          // Every gate return but one came back with posts three times the
          // reference width — a pair of slabs per side, a pillar the width of
          // a tower — and two re-rolls with the width stated as a fraction of
          // the frame changed nothing: an image model does not measure. So
          // the frame is RE-COMPOSED rather than refused. Each post is found
          // by scanning from the doorway's centre outward (below the lintel,
          // above the floor line, so a pair per side is caught by its
          // innermost member), anchored by its INNER face on the reference's
          // band and squashed to the band's width when it is wider; the span
          // between the two inner faces keeps only its top — the lintel —
          // stretched between the posts, and everything else painted into the
          // doorway is cleared; then the whole frame is stood on the
          // reference's ground line. The nine-slice downstream then always
          // finds a post inside its cap.
          let posts = null;
          if (ART_KIND === 'gate' && GATE_REF) {
            const W = p.sw, H = p.sh;
            const yA = Math.round(H * 0.45), yB = Math.round(H * 0.9);
            const solidCol = (x) => {
              let n = 0;
              for (let y = yA; y < yB; y++) if (d[(y * W + x) * 4 + 3] > 140) n++;
              return n / (yB - yA) > 0.2;
            };
            const mid = Math.floor(W / 2);
            let xiL = mid; while (xiL > 0 && !solidCol(xiL)) xiL--;
            let xiR = mid; while (xiR < W - 1 && !solidCol(xiR)) xiR++;
            let xoL = 0; while (xoL < xiL && !solidCol(xoL)) xoL++;
            let xoR = W - 1; while (xoR > xiR && !solidCol(xoR)) xoR--;
            const found = xiL > 0 && xiR < W - 1;
            posts = {
              found,
              left: (xiL + 1) / W, right: 1 - xiR / W,
              squashedLeft: 1, squashedRight: 1, dy: 0
            };
            if (found) {
              const bandO = Math.round(GATE_REF.outer * W);
              const bandI = Math.round(GATE_REF.inner * W);
              const bandW = bandI - bandO;
              const wL = xiL - xoL + 1, wR = xoR - xiR + 1;
              const dwL = Math.min(wL, bandW), dwR = Math.min(wR, bandW);
              posts.squashedLeft = dwL / wL;
              posts.squashedRight = dwR / wR;
              const re = document.createElement('canvas');
              re.width = W; re.height = H;
              const rc = re.getContext('2d');
              rc.drawImage(cell, xoL, 0, wL, H, bandI - dwL, 0, dwL, H);
              rc.drawImage(cell, xiR, 0, wR, H, W - bandI, 0, dwR, H);
              const lintelH = Math.round(H * GATE_REF.lintel);
              const spanW = xiR - xiL - 1;
              if (spanW > 2 && W - 2 * bandI > 2) {
                rc.drawImage(cell, xiL + 1, 0, spanW, lintelH, bandI, 0, W - 2 * bandI, lintelH);
              }
              // Stand it on the ground line: the lowest solid row of either post.
              const rd = rc.getImageData(0, 0, W, H).data;
              let bottom = -1;
              for (let y = H - 1; y >= 0 && bottom < 0; y--) {
                for (let x = bandO; x < W - bandO; x++) {
                  if ((x < bandI || x >= W - bandI) && rd[(y * W + x) * 4 + 3] > 140) { bottom = y; break; }
                }
              }
              const dy = bottom >= 0 ? Math.round(GATE_REF.bottom * H - (bottom + 1)) : 0;
              posts.dy = dy / H;
              cc.clearRect(0, 0, W, H);
              cc.drawImage(re, 0, Math.abs(dy) > 2 ? dy : 0);
              d.set(cc.getImageData(0, 0, W, H).data);
            }
          }

          // ── The fit box, on solid pixels grouped into pieces ──
          //
          // A SECOND box at a high alpha floor, for the fit measurement only.
          // The reference is measured the same way: a soft shadow belongs to
          // neither silhouette, and letting one into the comparison sinks the
          // sprite by the depth of a shadow the other side never painted.
          //
          // Grouped into connected pieces first, because of the neighbour's
          // ink. A cast shadow painted under a creature runs a pixel or two
          // past the grid line into the next panel, where it lands as a thin
          // dark line along that panel's edge — and at the alpha the unmix
          // leaves it, it is SOLID. One such line at the top of every
          // bottom-row panel stretched the measured box to the full panel
          // height, and the fit then shrank the creature to 56%. So a piece
          // that is a sliver (three pixels or thinner) or a speck is left out
          // of the fit box, and one that also touches the panel's edge is the
          // neighbour's and is erased, along with the soft bleed beside it.
          const PW = p.sw, PH = p.sh, PN = PW * PH;
          const solid = new Uint8Array(PN);
          for (let k = 0; k < PN; k++) if (d[k * 4 + 3] > 140) solid[k] = 1;
          const seenS = new Uint8Array(PN);
          let fx0 = PW, fy0 = PH, fx1 = -1, fy1 = -1;
          let slivers = 0;
          const stackS = [];
          for (let k0 = 0; k0 < PN; k0++) {
            if (!solid[k0] || seenS[k0]) continue;
            const cells = [];
            let cx0 = PW, cy0 = PH, cx1 = -1, cy1 = -1;
            seenS[k0] = 1; stackS.push(k0);
            while (stackS.length) {
              const k = stackS.pop();
              cells.push(k);
              const x = k % PW, y = (k / PW) | 0;
              if (x < cx0) cx0 = x; if (x > cx1) cx1 = x;
              if (y < cy0) cy0 = y; if (y > cy1) cy1 = y;
              if (x > 0 && solid[k - 1] && !seenS[k - 1]) { seenS[k - 1] = 1; stackS.push(k - 1); }
              if (x < PW - 1 && solid[k + 1] && !seenS[k + 1]) { seenS[k + 1] = 1; stackS.push(k + 1); }
              if (y > 0 && solid[k - PW] && !seenS[k - PW]) { seenS[k - PW] = 1; stackS.push(k - PW); }
              if (y < PH - 1 && solid[k + PW] && !seenS[k + PW]) { seenS[k + PW] = 1; stackS.push(k + PW); }
            }
            const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;
            if (Math.min(cw, ch) <= 3 || cells.length < 16) {
              slivers++;
              // Erased only when it lies ENTIRELY within two pixels of an
              // edge — a bleed line does; a fragment of a canopy the panel
              // clips at its edge reaches deeper, and is the creature's.
              const bleed = cy1 <= 1 || cy0 >= PH - 2 || cx1 <= 1 || cx0 >= PW - 2;
              if (bleed) for (const k of cells) d[k * 4 + 3] = 0;
              continue;
            }
            if (cx0 < fx0) fx0 = cx0; if (cx1 > fx1) fx1 = cx1;
            if (cy0 < fy0) fy0 = cy0; if (cy1 > fy1) fy1 = cy1;
          }
          if (slivers) {
            // The soft part of the bleed sits beside the erased line, under
            // the solid floor: clear the outermost two rows and columns of
            // anything that is not solid. A creature's own anti-aliased edge
            // there loses two pixels of softness, which nobody can see.
            for (let y = 0; y < PH; y++) {
              for (let x = 0; x < PW; x++) {
                if (x > 1 && x < PW - 2 && y > 1 && y < PH - 2) continue;
                const i = (y * PW + x) * 4;
                if (d[i + 3] > 8 && d[i + 3] <= 140) d[i + 3] = 0;
              }
            }
            cc.putImageData(id, 0, 0);
          }

          let x0 = PW, y0 = PH, x1 = -1, y1 = -1, opaque = 0;
          for (let y = 0; y < PH; y++)
            for (let x = 0; x < PW; x++) {
              const a = d[(y * PW + x) * 4 + 3];
              if (a > 8) {
                opaque++;
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
              }
            }
          if (fx1 < 0) { fx0 = x0; fy0 = y0; fx1 = x1; fy1 = y1; }

          if (x1 < 0) {
            // A dropped panel is the commonest way a walk sheet comes back wrong,
            // and it must not silently become a hole in the animation.
            if (p.frame !== undefined) strip.push({ frame: p.frame, empty: true });
            else out.push({ id: p.id, empty: true });
            continue;
          }

          // A block has to reach all four edges or it tiles with a seam, and an
          // illustrator's instinct is to leave a polite margin — this crops
          // that margin back off and lets the block fill its cell. Only for
          // blocks: an enemy is SUPPOSED to have space around it.
          let src = { x: 0, y: 0, w: p.sw, h: p.sh };
          let trimmed = false;
          if (p.isBlock && p.trim && x1 >= 0) {
            const touches = x0 === 0 && y0 === 0 && x1 === p.sw - 1 && y1 === p.sh - 1;
            if (!touches) {
              src = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
              trimmed = true;
            }
          }

          let dst;
          if (p.letterboxed) {
            // This cell holds an existing bitmap that was padded into a square.
            // Trim the padding back off and restore its real dimensions, or the
            // game gets a square file where it expects a 3:1 ribbon.
            const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
            dst = document.createElement('canvas');
            dst.width = p.letterboxed.w; dst.height = p.letterboxed.h;
            dst.getContext('2d').drawImage(cell, x0, y0, bw, bh, 0, 0, dst.width, dst.height);
          } else if (p.outW && p.outH) {
            // A landscape band: written at its declared shape, never squared.
            dst = document.createElement('canvas');
            dst.width = p.outW; dst.height = p.outH;
            dst.getContext('2d').drawImage(cell, 0, 0, p.outW, p.outH);
          } else if (!trimmed && p.out === p.sw && p.out === p.sh) {
            dst = cell;
          } else if (trimmed) {
            dst = document.createElement('canvas');
            dst.width = p.out; dst.height = p.out;
            dst.getContext('2d').drawImage(cell, src.x, src.y, src.w, src.h,
              0, 0, p.out, p.out);
          } else {
            dst = document.createElement('canvas');
            dst.width = p.out; dst.height = p.out;
            const dc = dst.getContext('2d');
            if (p.fit === 'crop' && p.sw !== p.sh) {
              // Keep the material's proportions and lose the outer edges.
              const side = Math.min(p.sw, p.sh);
              dc.drawImage(cell, (p.sw - side) / 2, (p.sh - side) / 2, side, side,
                0, 0, p.out, p.out);
            } else {
              dc.drawImage(cell, 0, 0, p.out, p.out);
            }
          }
          // How much of each edge of the cell is actually opaque. A building
          // block has to reach all four, or the tower shows a seam around every
          // one of them — rounded corners and a polite margin are exactly what
          // an illustrator draws unless told not to.
          const edge = (pick) => {
            let on = 0, n = 0;
            for (let t = 0; t < (pick < 2 ? p.sw : p.sh); t++) {
              const x = pick === 0 || pick === 1 ? t : (pick === 3 ? 0 : p.sw - 1);
              const y = pick === 0 ? 0 : pick === 1 ? p.sh - 1 : t;
              n++;
              if (d[(y * p.sw + x) * 4 + 3] > 8) on++;
            }
            return n ? on / n : 0;
          };
          const edges = [edge(0), edge(1), edge(2), edge(3)];

          // A walk-cycle panel is a FRAME, not a file. It is held with its
          // content bbox so the frames can be checked against each other, then
          // composed into one strip below.
          if (p.frame !== undefined) {
            strip.push({
              frame: p.frame, cv: dst, keyed, srcArea: p.sw * p.sh,
              // Where the drawing sits in its panel, as fractions of the panel.
              // These are what catch a creature that wandered between frames.
              foot: (y1 + 1) / p.sh, top: y0 / p.sh,
              midX: ((x0 + x1) / 2) / p.sw,
              box: { x0: fx0 / p.sw, y0: fy0 / p.sh, x1: (fx1 + 1) / p.sw, y1: (fy1 + 1) / p.sh },
              coverage: opaque / (p.sw * p.sh),
              posts,
              slivers
            });
            continue;
          }

          out.push({
            id: p.id,
            target: p.target,
            keyed,
            srcArea: p.sw * p.sh,
            // How much of the finished sprite's BORDER is opaque.
            //
            // Total transparency is the wrong signal: the logo came back with a
            // cream card behind it and a magenta strip along one edge, so a
            // fifth of it keyed out and a whole-image threshold saw nothing
            // wrong. What says "the background survived" is the edge — a sprite
            // meant to sit on the battlefield has see-through borders.
            // How solidly the sprite fills its own bounding box.
            //
            // The border was the wrong probe. Once the magenta ring around the
            // logo's cream card is keyed, the border IS transparent and the
            // check passes — while the card sits untouched in the middle. What
            // gives a card away is that it fills its bounding box completely;
            // a sun, a tree or a logo's lettering never does.
            bboxFill: (() => {
              const W = dst.width, H = dst.height;
              const q = dst.getContext('2d').getImageData(0, 0, W, H).data;
              let x0 = W, y0 = H, x1 = -1, y1 = -1, on = 0;
              for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                  if (q[(y * W + x) * 4 + 3] < 8) continue;
                  on++;
                  if (x < x0) x0 = x; if (x > x1) x1 = x;
                  if (y < y0) y0 = y; if (y > y1) y1 = y;
                }
              }
              if (x1 < 0) return 0;
              return on / ((x1 - x0 + 1) * (y1 - y0 + 1));
            })(),
            edges,
            trimmed,
            w: dst.width, h: dst.height,
            coverage: opaque / (p.sw * p.sh),
            dataUrl: encode(dst, MIME_OUT)
          });
        }
        // ── Compose the walk cycle ──
        //
        // One image, frames left to right in cycle order, every panel the same
        // size. The runtime divides the width by the frame box's aspect to get
        // the frame count back, so the panels must be uniform and in order.
        if (strip.length) {
          const walkId = ((plan.find((x) => x.frame !== undefined) || {}).id || 'walk')
            .split('#')[0];
          strip.sort((a2, b2) => a2.frame - b2.frame);
          const solid = strip.filter((f) => !f.empty);
          if (!solid.length) {
            out.push({ id: walkId, empty: true });
          } else {
            const fw = solid[0].cv.width, fh = solid[0].cv.height;

            // ── Normalise onto the reference's box ──
            //
            // Every returned siege sheet so far enlarged the machine to fill its
            // panel and dropped it to the bottom — the catapult at more than
            // double size. On its own that looks fine; against the arm, which is
            // drawn live from the geometry, it is plainly a different machine.
            //
            // ONE correction for the whole strip, never per frame. Fitting each
            // frame to its own content is exactly what makes a cycle jitter, so
            // the union across all frames is measured, a single scale and offset
            // fall out of it, and every frame gets identical treatment.
            const FIT = FIT_REF;
            let fitNote = null;
            if (FIT && FIT.h > 0) {
              let bx0 = 1, by0 = 1, bx1 = 0, by1 = 0;
              for (const f of solid) {
                if (f.box.x0 < bx0) bx0 = f.box.x0;
                if (f.box.y0 < by0) by0 = f.box.y0;
                if (f.box.x1 > bx1) bx1 = f.box.x1;
                if (f.box.y1 > by1) by1 = f.box.y1;
              }
              const gotH = by1 - by0;
              const gotW = bx1 - bx0;
              const kH = gotH > 0.01 ? FIT.h / gotH : 1;
              // Match the reference box's AREA when the box is a boundary.
              //
              // Height alone lets a part that came back a different SHAPE — a
              // longer, slimmer barrel — overhang the block by however much its
              // proportions differ; the cannon reached a block and a quarter.
              // But taking the tighter axis instead is the opposite mistake: the
              // barrel then fits the width exactly and stands 40% shorter than
              // the drawn one, and every fixture on the tower reads shrunken.
              //
              // The geometric mean splits it. A painting with the reference's own
              // proportions is untouched, because both axes agree; one that is
              // half again as long comes back a quarter over on width and a
              // quarter under on height, which is what "the same size, drawn
              // differently" actually looks like.
              const kW = FIT_TIGHT && FIT.w > 0 && gotW > 0.01
                ? FIT.w / gotW
                : Infinity;
              const k = Number.isFinite(kW) ? Math.sqrt(kH * kW) : kH;
              const gotBottom = by1, gotCx = (bx0 + bx1) / 2;
              // A wild measurement must never obliterate the art, and a
              // correction under 4% is not worth resampling for.
              //
              // The floor is looser for a TIGHT box, because there the
              // measurement cannot be wild: the reference says exactly how
              // much room the part gets, so a factor of four means a part
              // painted four times too big, not a mis-measurement. The
              // repair crane came back at 4.15x — a good drawing, simply
              // filling its frame — and the 0.25 floor refused to shrink it,
              // which shipped a crane longer than the block it stands on.
              const floor = FIT_TIGHT ? 0.1 : 0.25;
              // A tight box is centred horizontally whatever the painting did —
              // centring puts the turn axis through a round's own middle, so a
              // bolt turns in place instead of orbiting. Vertically the
              // manifest decides: a creature and the falling rock register by
              // their BOTTOM edge, which must not move (the feet on the line,
              // the stone at its point of impact); everything else by its
              // middle.
              const byFeet = ANCHOR_REF === 'feet';
              const gotMidY = (by0 + by1) / 2;
              const fromY = byFeet ? gotBottom : gotMidY;
              const toY = byFeet ? FIT.bottom : 0.5;
              const toX = FIT_TIGHT ? 0.5 : FIT.cx;
              if (k > floor && k < 4 && (Math.abs(k - 1) > 0.04
                  || Math.abs(fromY - toY) > 0.02
                  || Math.abs(gotCx - toX) > 0.02)) {
                for (const f of solid) {
                  const to = document.createElement('canvas');
                  to.width = fw; to.height = fh;
                  const g2 = to.getContext('2d');
                  g2.translate(toX * fw, toY * fh);
                  g2.scale(k, k);
                  g2.translate(-gotCx * fw, -fromY * fh);
                  g2.drawImage(f.cv, 0, 0);
                  f.cv = to;
                }
                fitNote = { k: +k.toFixed(3), dy: +(FIT.bottom - gotBottom).toFixed(3) };
              }
            }
            const cv = document.createElement('canvas');
            cv.width = fw * strip.length;
            cv.height = fh;
            const g = cv.getContext('2d');
            for (let i = 0; i < strip.length; i++) {
              const f = strip[i];
              // A dropped panel holds its slot as a transparent frame rather
              // than shortening the strip: a missing frame is a visible hitch
              // in the walk, which is the point of reporting it.
              if (!f.empty) g.drawImage(f.cv, i * fw, 0);
            }
            out.push({
              id: walkId,
              target: (plan.find((x) => x.frame !== undefined) || {}).target,
              frames: strip.length,
              missing: strip.filter((f) => f.empty).map((f) => f.frame + 1),
              feet: solid.map((f) => f.foot),
              mids: solid.map((f) => f.midX),
              coverages: solid.map((f) => f.coverage),
              fitNote,
              keyed: solid.reduce((a2, f) => a2 + f.keyed, 0),
              srcArea: solid.reduce((a2, f) => a2 + f.srcArea, 0),
              posts: solid[0].posts ?? null,
              slivers: solid.reduce((a2, f) => a2 + (f.slivers || 0), 0),
              w: cv.width, h: cv.height,
              dataUrl: encode(cv, MIME_OUT),
              // The same return at other sizes — the logo's PWA icons.
              extras: EXTRA.map((ex) => {
                const s = document.createElement('canvas');
                s.width = ex.size; s.height = ex.size;
                s.getContext('2d').drawImage(cv, 0, 0, ex.size, ex.size);
                return {
                  target: ex.target, w: ex.size, h: ex.size,
                  dataUrl: encode(s, /\\.png$/i.test(ex.target) ? 'image/png' : 'image/webp')
                };
              })
            });
          }
        }

        return JSON.stringify(out);
      })()`,
      returnByValue: true
    })
    if (cut.exceptionDetails) {
      throw new Error(cut.exceptionDetails.exception?.description ?? 'slice failed')
    }

    for (const r of JSON.parse(cut.result.value)) {
      if (r.empty) {
        console.log(`  · ${r.id.padEnd(26)} empty cell, skipped`)
        skipped++
        continue
      }
      if (!r.dataUrl.startsWith('data:image/webp') && !r.dataUrl.startsWith('data:image/png')) {
        console.error(`  ✗ ${r.id.padEnd(26)} browser would not encode the image`)
        failed++
        continue
      }
      const full = safeTarget(r.target)
      if (!full) {
        console.error(`  ✗ ${r.id.padEnd(26)} target escapes ${relative(ROOT, OUT_ROOT)}/`)
        failed++
        continue
      }
      // A sprite that is meant to sit ON something needs a background that was
      // actually removed. The exceptions fill their frame by contract — a
      // crate, a tile, the guard's hexagon — so an opaque one is correct.
      if (r.bboxFill !== undefined && r.bboxFill > 0.92 && !sheet.fill
        && sheet.bg !== 'opaque') {
        console.warn(`    ! ${r.id} fills ${(r.bboxFill * 100).toFixed(0)}% of its own`
          + ' bounding box — it is a solid rectangle.')
        console.warn('      The subject was almost certainly painted onto a card or panel')
        console.warn('      that is now welded in. Re-generate it on flat magenta.')
      }

      // ── Gate frame ──
      //
      // Reported rather than refused: the cut re-composed the posts onto the
      // reference's band (see the gate branch above), so what is printed here
      // is what it did to them. A post squeezed to under half its painted
      // width will read as a sliver, and that is worth a re-roll.
      if (r.posts && sheet.post) {
        const pct = (v) => `${(v * 100).toFixed(0)}%`
        if (!r.posts.found) {
          console.error('    ✗ could not find a post on both sides — is the doorway painted')
          console.error('      in, or a post missing? Nothing was written.')
          failed++
          continue
        }
        const sq = (s) => (s < 0.98 ? `squeezed to ${pct(s)} of its painted width` : 'as painted')
        console.log(`    · posts reached ${pct(r.posts.left)} / ${pct(r.posts.right)} in from the`
          + ` edges; re-composed onto the band at ${pct(sheet.post.outer)}–${pct(sheet.post.inner)}`
          + ` (left ${sq(r.posts.squashedLeft)}, right ${sq(r.posts.squashedRight)})`
          + (Math.abs(r.posts.dy) > 0.005
            ? `, stood on the ground line (moved ${pct(Math.abs(r.posts.dy))} of the height)`
            : '')
          + '. The doorway below the lintel was cleared.')
        if (Math.min(r.posts.squashedLeft, r.posts.squashedRight) < 0.5) {
          console.warn('    ! a post came back more than twice the band\'s width and was squeezed')
          console.warn('      to fit. It will read narrow. Re-roll it if that shows in the')
          console.warn('      playground — the reference now draws the posts at the band\'s width.')
        }
      }

      // ── Walk-cycle sanity ──
      //
      // The strip is composed blind from a fixed grid, so everything that can go
      // wrong with it goes wrong quietly: a panel the model declined to paint, a
      // creature that grew between frames, a creature that walked out of its own
      // panel. None of that is visible in the file — it is visible in the game,
      // as a limp.
      if (r.frames !== undefined) {
        if (r.slivers) {
          console.log(`    · left ${r.slivers} sliver${r.slivers > 1 ? 's' : ''} of ink out of the fit`
            + ' — a neighbour\'s shadow across the cut line, or a speck — and erased the ones on a panel edge.')
        }
        if (r.fitNote) {
          console.log(`    · normalised onto the reference: scaled to`
            + ` ${(r.fitNote.k * 100).toFixed(0)}% and`
            + ` moved ${(r.fitNote.dy * 100).toFixed(0)}% of a panel vertically.`)
          console.log('      It came back a different size from the sheet it was painted')
          console.log('      over, and the parts drawn live over it are not negotiable.')
        }
        if (r.missing?.length) {
          console.warn(`    ! frame${r.missing.length > 1 ? 's' : ''} ${r.missing.join(', ')}`
            + ` of ${r.frames} came back EMPTY — the walk will hitch there.`)
        }
        // A DEATH moves on purpose: it rears, drops, lands and lies down, so the
        // three checks below — one feet line, one centre, one size — would all
        // fire on a perfect return. What it owes instead is a last panel that
        // reads as the body, and that is a look, not a number. A THROW moves on
        // purpose too — an arm swung wide, a beast reared on its haunches.
        const death = sheet.artKind === 'death' || sheet.artKind === 'hurl'
        if (sheet.artKind === 'death') {
          console.log('    · a death strip: bob / drift / size checks skipped — look at the'
            + ' last panel in /playground, it is held on screen as the corpse.')
        } else if (death) {
          console.log('    · a throw strip: bob / drift / size checks skipped — check the'
            + ' hand is EMPTY and where the reference put it (the game draws the rock there).')
        }
        const spread = (xs) => (death || !xs?.length ? 0 : Math.max(...xs) - Math.min(...xs))
        // The feet must land on one line. This is the difference between a walk
        // and a hop, and it is the single most likely thing to be wrong.
        const foot = spread(r.feet)
        if (foot > 0.04) {
          console.warn(`    ! the feet move ${(foot * 100).toFixed(0)}% of the panel height`
            + ' between frames — it will bob as it walks.')
        }
        const mid = spread(r.mids)
        if (mid > 0.08) {
          console.warn(`    ! the body drifts ${(mid * 100).toFixed(0)}% of the panel width`
            + ' between frames — it will slide as it walks.')
        }
        // A frame that is much bigger or smaller than its neighbours is a
        // redraw at a different scale, not a pose.
        const cov = spread(r.coverages)
        const avg = r.coverages?.length
          ? r.coverages.reduce((a, b) => a + b, 0) / r.coverages.length
          : 0
        if (avg > 0 && cov / avg > 0.5) {
          console.warn(`    ! frame sizes vary by ${((cov / avg) * 100).toFixed(0)}%`
            + ' — the creature was redrawn at different scales.')
        }
      }

      const bytes = Buffer.from(r.dataUrl.slice(r.dataUrl.indexOf(',') + 1), 'base64')
      const shown = `${r.target}  ${r.w}x${r.h}  ${(bytes.length / 1024).toFixed(1)}kB`
        + (r.trimmed ? '  (trimmed to fill)' : '')
        + (r.keyed ? `  (keyed ${(100 * r.keyed / r.srcArea).toFixed(0)}% bg)` : '')
      if (DRY) {
        console.log(`  → ${r.id.padEnd(26)} ${shown}`)
      } else {
        mkdirSync(dirname(full), { recursive: true })
        writeFileSync(full, bytes)
        console.log(`  ✓ ${r.id.padEnd(26)} ${shown}`)
        if (receiptLine) receiptNext[basename(file)] = receiptLine
        if (sheet.artKind === 'monster') cutWalks.add(sheet.id)
        // A re-cut SURVIVOR walk changes the squad's combined model the same
        // way, and the fall sheet is painted from it. One entry for the three
        // of them, because it is one image (`art-models.survivorModelSource`).
        else if (sheet.artKind === 'hero' && sheet.id !== 'fallen') cutWalks.add('survivors')
      }
      written++

      // The same return at its other sizes.
      for (const ex of r.extras ?? []) {
        const exFull = safeTarget(ex.target)
        if (!exFull) {
          console.error(`  ✗ ${ex.target} escapes ${relative(ROOT, OUT_ROOT)}/`)
          failed++
          continue
        }
        const exBytes = Buffer.from(ex.dataUrl.slice(ex.dataUrl.indexOf(',') + 1), 'base64')
        const exShown = `${ex.target}  ${ex.w}x${ex.h}  ${(exBytes.length / 1024).toFixed(1)}kB`
        if (DRY) {
          console.log(`  → ${''.padEnd(26)} ${exShown}`)
        } else {
          mkdirSync(dirname(exFull), { recursive: true })
          writeFileSync(exFull, exBytes)
          console.log(`  ✓ ${''.padEnd(26)} ${exShown}`)
        }
        written++
      }
    }
  }

  // The receipt records what was actually cut, so a dry run — or a run into a
  // scratch `--out` — leaves it alone.
  if (written && !DRY && OUT_ROOT === resolve(ROOT, 'public')) {
    mkdirSync(PAINTED, { recursive: true })
    writeFileSync(RECEIPT, `${JSON.stringify({ note: 'written by tools/slice-sheets.mjs — the reference revision each painting was cut against', files: receiptNext }, null, 2)}\n`, 'utf-8')
  }

  // A re-cut walk is a new look for the creature, and a death painted from the
  // old model would come back as the old one. Only for a real cut into public/.
  if (cutWalks.size && !DRY && OUT_ROOT === resolve(ROOT, 'public')) {
    try {
      const { writeModels } = await import('./art-models.mjs')
      console.log('\ncharacter models (what each boss death is painted AS):')
      await writeModels({ root: ROOT, only: [...cutWalks] })
    } catch (e) {
      console.warn(`\n  ! could not re-cut the character models (${e.message}) — run pnpm art:models`)
    }
  }

  console.log(`\n${DRY ? 'would write' : 'wrote'} ${written} file(s)`
    + `${skipped ? `, skipped ${skipped} empty` : ''}`
    + `${failed ? `, ${failed} FAILED` : ''}`)
  if (written && !DRY) {
    console.log('\nTo see it: open the game with  ?art=on   (remembered; ?art=off reverts).')
    console.log('Already open? Run  __art.refresh()  in the console to re-read from disk.')
    console.log('To ship it enabled, set VITE_ENABLE_ART_OVERRIDES=true in .env.')
  }
  shutdown(failed ? 1 : 0)
} catch (e) {
  console.error('\nERROR: ' + e.message)
  shutdown(1)
}
