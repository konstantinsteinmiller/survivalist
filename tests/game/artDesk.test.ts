import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BOSS_DEATHS, STILLS, SURVIVOR_FALLS, WALKS, promptBody, promptDocs, promptForDeath,
  promptForFall, promptForStill, promptForWalk
} from '@/game/artSheet'
// The desk's own parser — the code that decides what the queue sends.
import { parsePromptDoc } from '../../tools/art-desk/jobs.mjs'

/**
 * ─── The Art Desk sends exactly what the manifest wrote ─────────────────────
 *
 * `pnpm art:desk` (tools/art-desk, from the art-generation-pipeline skill)
 * parses the prompt blocks back OUT of `art-sheets/PROMPTS-*.md` and pastes the
 * fenced text at the image model — on a queue, unattended. So the documents are
 * a wire format, and this pins it: every block the desk can parse is tied to
 * the right reference and target and is byte-identical to its builder's text
 * (heading line lifted out). A block the parser silently skips is a sheet the
 * queue never paints; a block that drifts is a sheet painted from text nobody
 * wrote.
 */

const builders = [
  ...WALKS.map((w) => ({ ref: `${w.file}.png`, target: w.target, text: promptForWalk(w), also: [] as string[] })),
  // A still with people in it (the cages) carries the survivors' model first.
  ...STILLS.map((s) => ({ ref: `${s.file}.png`, target: s.target, text: promptForStill(s), also: s.model ? [s.model.file] : [] })),
  // A death goes out with its character model beside the layout — the desk
  // must attach it, or the painter paints a creature nobody has met.
  ...BOSS_DEATHS.map((d) => ({ ref: `${d.file}.png`, target: d.target, text: promptForDeath(d), also: [d.model] })),
  // …and so does the squad's own fall, for the same reason and on the same terms.
  ...SURVIVOR_FALLS.map((f) => ({ ref: `${f.file}.png`, target: f.target, text: promptForFall(f), also: [f.model] }))
]

describe('the prompt documents are the desk\'s wire format', () => {
  it('parses one job per sheet, each tied to its reference, extra images and target, byte-identical to its builder', () => {
    const docs = promptDocs()
    const jobs = Object.entries(docs).flatMap(([name, text]) => parsePromptDoc(text, name))
    expect(jobs).toHaveLength(builders.length)
    const byRef = new Map(jobs.map((j: { refName: string }) => [j.refName, j]))
    for (const b of builders) {
      const job = byRef.get(b.ref) as { target: string; prompt: string; also: string[] } | undefined
      expect(job, b.ref).toBeDefined()
      expect(job!.target).toBe(b.target)
      expect(job!.also).toEqual(b.also)
      expect(job!.prompt).toBe(promptBody(b.text))
      // The builder's heading is the only thing lifted out.
      expect(promptBody(b.text).startsWith('# ')).toBe(false)
    }
  })

  it('reads the images off a heading in attach order, the reference last', () => {
    const doc = [
      '## Grumpling — death  (models/grumpling.png + death-grumpling.png → images/deaths/grumpling.webp)',
      '', '```text', 'paint it', '```', '',
      '## A title (with brackets)  (walk-bonecap.png → images/monsters/bonecap.webp)',
      '', '```text', 'walk it', '```', '',
      '## Two extras  (b/c.png + d.jpg + a.png)',
      '', '```text', 'x', '```', '',
      '## Not a reference  (a.png + b.jpg)',
      '', '```text', 'skipped', '```'
    ].join('\n')
    const jobs = parsePromptDoc(doc, 'x.md')
    // The character model goes first: the first image is the one taken as
    // the subject, and the death must be THAT creature.
    expect(jobs[0]).toMatchObject({ refName: 'death-grumpling.png', also: ['models/grumpling.png'], target: 'images/deaths/grumpling.webp' })
    expect(jobs[1]).toMatchObject({ title: 'A title (with brackets)', refName: 'walk-bonecap.png', also: [], target: 'images/monsters/bonecap.webp' })
    expect(jobs[2]).toMatchObject({ refName: 'a.png', also: ['b/c.png', 'd.jpg'], target: null })
    // A reference is the PNG the bench exported; a heading ending otherwise is not a job.
    expect(jobs).toHaveLength(3)
  })

  it('has a character model on disk for every death, cut where the manifest says', async () => {
    const { modelRel } = await import('../../tools/art-models.mjs')
    for (const d of BOSS_DEATHS) {
      expect(modelRel(d.design)).toBe(d.model)
      expect(existsSync(resolve(__dirname, '../../art-sheets', d.model)), `${d.model} — run pnpm art:models`).toBe(true)
    }
  })

  it('matches what is on disk — the bench and `pnpm art:prompts` wrote the same files', () => {
    for (const [name, text] of Object.entries(promptDocs())) {
      const onDisk = readFileSync(resolve(__dirname, '../../art-sheets', name), 'utf-8')
      expect(onDisk, `${name} is stale — run pnpm art:prompts`).toBe(text)
    }
  })
})
