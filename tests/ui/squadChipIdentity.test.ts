import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The squad number wears one colour, in both places it appears.
 *
 * The HUD spends a colour on saying that the crowd is the one number the whole
 * game is about: the chip in the corner is violet where every other plate up
 * there is pale blue. The result screen reports that same number at the end of
 * the run — same object, same identity.
 *
 * It drifted once already. The HUD chip was restyled and the result screen's
 * was left on its old `#8fd6ff`, so the end of a run looked like it was
 * reporting somebody else's statistic, and nothing failed. These are SOURCE
 * checks for the same reason the splash-tile ones are: jsdom renders neither
 * component's scoped CSS, and the thing worth pinning is that two files agree.
 */

const ROOT = resolve(__dirname, '../..')
const hud = readFileSync(join(ROOT, 'src/components/game/RunHud.vue'), 'utf8')
const scene = readFileSync(join(ROOT, 'src/views/GameScene.vue'), 'utf8')

/** The `&.is-squad` block of a `.sass` style section, up to the next sibling. */
const squadBlock = (src: string): string => {
  const at = src.indexOf('&.is-squad')
  expect(at, 'no `&.is-squad` block').toBeGreaterThan(-1)
  const rest = src.slice(at)
  const next = rest.slice(1).search(/\n {0,2}[&.@]/)
  return next < 0 ? rest : rest.slice(0, next + 1)
}

const decl = (block: string, prop: string): string | null => {
  const m = block.match(new RegExp(`${prop}:\\s*([^\\n]+)`))
  return m ? m[1]!.trim() : null
}

describe('the squad chip is one object in two places', () => {
  const hudChip = squadBlock(hud)
  const resultChip = squadBlock(scene)

  it('paints the same violet ink on the HUD and on the result screen', () => {
    const ink = decl(hudChip, 'color')
    expect(ink, 'the HUD squad chip has no colour').toBeTruthy()
    expect(decl(resultChip, 'color')).toBe(ink)
  })

  it('is not the pale blue the other result chips use', () => {
    // The specific regression: the result screen kept `#8fd6ff` — the family
    // its neighbours (kills, and the rank before it took gold) belong to.
    expect(decl(resultChip, 'color')).not.toBe('#8fd6ff')
    // And its neighbour still does, so this is an identity for the squad and
    // not a repaint of the whole row.
    const kills = scene.slice(scene.indexOf('&.is-kills'))
    expect(decl(kills, 'color')).toBe('#ff9a8f')
  })

  it('carries the violet through to the plate, not just the glyph', () => {
    // A violet glyph on the old dark plate reads as a tint rather than as an
    // identity — the HUD's chip says it with the border and the ground too.
    for (const prop of ['border-color', 'background-color']) {
      const v = decl(resultChip, prop)
      expect(v, `result chip has no ${prop}`).toBeTruthy()
      // Same hue family as the HUD's, whatever the alpha: this screen is
      // deliberately quieter (no bloom, lighter tint) but not a different colour.
      const hudV = decl(hudChip, prop)!
      const rgb = (s: string): string => s.replace(/rgba?\(([^)]*)\)/, '$1').split(',').slice(0, 3).join(',').trim()
      expect(rgb(v!)).toBe(rgb(hudV))
    }
  })

  it('draws the same glyph in both, so the mark cannot drift either', () => {
    expect(hud).toContain('name="squad"')
    expect(scene).toContain('GameIcon.result__chip-icon(name="squad")')
  })
})
