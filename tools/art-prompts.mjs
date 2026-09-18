#!/usr/bin/env node
/**
 * Regenerate `art-sheets/PROMPTS-*.md` from the manifest, with no browser —
 * and write `art-sheets/PAINT-STATUS.md` beside them.
 *
 *   pnpm art:prompts            # writes the prompt documents + the status report
 *   pnpm art:prompts --check    # exits 1 if a prompt document is out of date (CI)
 *
 * From the art-generation-pipeline skill (`templates/art-prompts.mjs`), adapted
 * to Survivalist: the index is `{ walks: [...] }` with a `fit` per entry, and
 * the sheets are the manifest's walks, stills and boss deaths (`sheetRows()`).
 *
 * The bench (`/#/art-sheets`) writes the same documents on export — both routes
 * render `promptDocs()` from `src/game/artSheet.ts`, so they agree byte for
 * byte, and a manifest edit (a reworded blurb, a new sheet) has its prompt the
 * moment this runs. The manifest chain has to load under plain Node for that;
 * `tools/ts-resolve.mjs` is what makes it (the `@/` alias, the `.ts`
 * extension, and an empty `import.meta.env`).
 *
 * Run through the `--import` hook (the pnpm script does):
 *   node --import ./tools/ts-resolve.mjs tools/art-prompts.mjs
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'art-sheets')
const INDEX = join(OUT, 'sheet-index.json')
const PAINTED = join(OUT, 'painted')
const CHECK = process.argv.includes('--check')

const manifest = await import(pathToFileURL(join(ROOT, 'src', 'game', 'artSheet.ts')).href)

/** The fits the bench measured last time it exported, keyed `kind/id`. */
const fitsFromIndex = () => {
  if (!existsSync(INDEX)) return undefined
  try {
    const index = JSON.parse(readFileSync(INDEX, 'utf-8'))
    const fits = {}
    for (const s of index.walks ?? []) if (s.fit) fits[`${s.kind}/${s.id}`] = s.fit
    return Object.keys(fits).length ? fits : undefined
  } catch {
    return undefined
  }
}

const fits = fitsFromIndex()
const docs = manifest.promptDocs(fits)
mkdirSync(OUT, { recursive: true })

let stale = 0
for (const [name, text] of Object.entries(docs)) {
  const file = join(OUT, name)
  const current = existsSync(file) ? readFileSync(file, 'utf-8') : null
  if (current === text) {
    console.log(`  = ${name}  unchanged`)
    continue
  }
  stale++
  if (CHECK) {
    console.error(`  ! ${name} is out of date — run pnpm art:prompts`)
    continue
  }
  writeFileSync(file, text, 'utf-8')
  console.log(`  ✓ ${name}  ${(text.length / 1024).toFixed(0)} kB`)
}

// ─── The character models the deaths are painted AS ─────────────────────────
//
// A death prompt attaches `models/<design>.png` beside its layout — one frame
// of the creature's walk as the game shows it (`tools/art-models.mjs`). It is
// an input to painting like the prompt is, so it is kept as current as the
// prompt, and `--check` polices it the same way.
const { writeModels } = await import(pathToFileURL(join(ROOT, 'tools', 'art-models.mjs')).href)
const models = await writeModels({ root: ROOT, check: CHECK })
stale += models.filter((m) => m.state === 'stale' || m.state === 'missing').length

// ─── What is painted, what is not, and what has gone out of date ────────────
//
// The prompts say how to paint every sheet; they never said which ones still
// NEED painting — and the one state nobody thinks to look for, a painting whose
// drawing has since been re-cut, is invisible until it is sliced back over the
// corrected art. This is that answer as a file. It is a REPORT, so `--check`
// does not police it: it goes out of date the moment a painting lands, and
// running `pnpm art:prompts` again is the whole fix.
//
// The revision of a sheet is the first 12 hex of a sha1 over the CLEAN
// reference the bench exported — the same number `tools/slice-sheets.mjs`
// records in `painted/.sliced.json`, so "the reference changed since this was
// painted" is one string comparison in both tools.

const revOf = (file) => (existsSync(file) ? createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 12) : null)

const receipt = (() => {
  const f = join(PAINTED, '.sliced.json')
  if (!existsSync(f)) return {}
  try { return JSON.parse(readFileSync(f, 'utf-8')).files ?? {} } catch { return {} }
})()

const images = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [])
/** Every image sitting in `painted/`, top level only — exactly what the slicer reads. */
const paintings = images(PAINTED)
/** Parked paintings: `retired/` is this project's name for the skill's `stale/`
 *  (the Art Desk's), and both are read. */
const parked = [
  ...images(join(PAINTED, 'retired')).map((f) => ({ f, dir: 'retired' })),
  ...images(join(PAINTED, 'stale')).map((f) => ({ f, dir: 'stale' }))
]

const stemOf = (f) => basename(f).replace(/\.[^.]+$/, '')
const paintingFor = (stem) => paintings.find((f) => stemOf(f) === stem)

const stateOf = (stem) => {
  const ref = join(OUT, `${stem}.png`)
  const rev = revOf(ref)
  const painting = paintingFor(stem)
  if (!painting) {
    const old = parked.find((p) => stemOf(p.f) === stem)
    return old
      ? { mark: '!', state: `REPAINT — the old one is parked in \`painted/${old.dir}/\``, rev }
      : { mark: '·', state: 'not painted yet', rev }
  }
  let seen = receipt[painting]
  // The receipt line belongs to the painting it was written for: the same name
  // with different bytes is a re-roll nobody has sliced yet.
  if (seen?.painting && seen.painting !== revOf(join(PAINTED, painting))) seen = undefined
  if (seen?.rev && rev && seen.rev !== rev) {
    return { mark: '!', state: `REPAINT — the reference changed (${seen.rev} → ${rev})`, rev }
  }
  // No receipt only means nobody has sliced it SINCE receipts existed — the
  // sprites may well be on disk from before. It is not evidence either way,
  // which is exactly why it gets its own mark instead of a guess.
  if (!seen) {
    const shipped = existsSync(join(ROOT, 'public', rowTarget.get(stem) ?? ''))
    return { mark: '?', state: `painted${shipped ? ', and a slice is on disk' : ''}; no receipt yet — \`pnpm slice-sheets --dry\` to check it`, rev }
  }
  return { mark: '✓', state: `sliced ${String(seen.at).slice(0, 10)}`, rev }
}

const base = manifest.sheetRows()
const rowTarget = new Map(base.map((r) => [r.stem, r.target]))
const rows = base.map((r) => ({ ...r, ...stateOf(r.stem) }))

const tally = { '✓': 0, '!': 0, '?': 0, '·': 0 }
for (const r of rows) tally[r.mark]++

const status = [
  '# Paint status — generated by `pnpm art:prompts`',
  '',
  'A report, not a contract: it is a picture of `art-sheets/painted/` and the',
  'slicer\'s receipt at the moment it was written. Re-run `pnpm art:prompts`',
  'after painting or slicing anything.',
  '',
  `**${tally['✓']} sliced · ${tally['!']} need a repaint · ${tally['?']} painted, unreceipted · ${tally['·']} outstanding**`,
  '',
  '| | Sheet | Prompt block in | Reference | State |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.mark} | **${r.title}** | \`${r.doc}\` | \`${r.stem}.png\`${r.rev ? ` (rev \`${r.rev}\`)` : ' — *missing, run `pnpm art:export`*'} | ${r.state} |`),
  '',
  '## What the marks mean',
  '',
  '* **✓** sliced, and the drawing has not moved since.',
  '* **!** a painting of a drawing that has since been RE-CUT. `pnpm slice-sheets`',
  '  refuses it and says so; repaint from the reference, or `--stale-ok` if you',
  '  know the change was cosmetic.',
  '* **?** a painting is sitting in `painted/` with no receipt against it. That',
  '  is not evidence it was never cut — receipts are newer than the folder — so',
  '  run `pnpm slice-sheets --dry` and read what it says it would write.',
  '* **·** nothing painted for this one yet — attach the reference and paste its',
  '  block from the prompt file named above.',
  ''
].join('\n')

if (!CHECK) {
  writeFileSync(join(OUT, 'PAINT-STATUS.md'), status, 'utf-8')
  console.log(`  ✓ PAINT-STATUS.md  ${tally['✓']} sliced, ${tally['!']} stale, ${tally['?']} uncut, ${tally['·']} outstanding`)
}

const count = (what) => base.filter((r) => r.what === what).length
console.log(`\n${count('walk')} walks, ${count('still')} stills, ${count('death')} boss deaths,`
  + ` ${count('hurl')} boss throws, ${count('fall')} squad fall`
  + (fits ? ' (the index\'s measured fits were read)' : ' (no sheet-index.json yet)'))
if (CHECK && stale) process.exit(1)
