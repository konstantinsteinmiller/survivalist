import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

/**
 * The two splashes are one picture.
 *
 * `index.html` paints the backdrop before any script runs and
 * `FLogoProgress.vue` takes over when Vue mounts. The tile layer is the part
 * of that handover with a clock in it: both sides pan the same image by the
 * same distance over the same duration, and `adoptAnimationClock` copies where
 * the first one had got to onto the second. Let any of those three numbers
 * drift apart and the crossfade shows the pattern doubled, sliding against
 * itself — which is exactly the artefact nobody looks for, because it only
 * exists for the 400 ms the two layers overlap.
 *
 * jsdom renders neither layer, so these are SOURCE checks, plus a look at the
 * tile file itself for the properties the CSS assumes about it.
 */

const ROOT = resolve(__dirname, '../..')
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const vue = readFileSync(join(ROOT, 'src/components/atoms/FLogoProgress.vue'), 'utf8')
const tool = readFileSync(join(ROOT, 'tools/bg-tile.mjs'), 'utf8')

const TILE = join(ROOT, 'public/images/bg/bg-tile_800x800.webp')

/** Everything inside the inline `<style>` of index.html. */
const inlineStyle = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
/** Everything inside the component's `<style>` block. */
const vueStyle = vue.slice(vue.indexOf('<style scoped'))

describe('the two splashes pan the same tile', () => {
  it('name the one tile file', () => {
    // Relative in the HTML because Vite does not rewrite `url()` inside an
    // inline style; through `prependBaseUrl` in the component because Vite
    // does not rewrite a runtime string either.
    expect(inlineStyle).toContain('url(./images/bg/bg-tile_800x800.webp)')
    expect(vue).toContain("prependBaseUrl('images/bg/bg-tile_800x800.webp')")
  })

  it('drift by one whole tile, so the loop has no seam', () => {
    // A pan of anything other than exactly the tile size jumps on every loop.
    expect(inlineStyle).toContain('translate3d(400px, 400px, 0)')
    expect(vueStyle).toContain('translate3d($tile, $tile, 0)')
    expect(vueStyle).toContain('$tile: 400px')
    expect(inlineStyle).toContain('/ 400px 400px repeat')
    expect(vueStyle).toContain('background-size: $tile $tile')
  })

  it('agree on the drift speed and the strength', () => {
    const pan = (css: string): string[] =>
      [...css.matchAll(/tiles-pan (\d+)s linear infinite/g)].map((m) => m[1]!)
    expect(pan(inlineStyle)).toEqual(['40'])
    expect(pan(vueStyle)).toEqual(['40'])

    const opacity = (css: string): string[] =>
      [...css.matchAll(/opacity:\s*(0\.\d+)/g)].map((m) => m[1]!)
    expect(opacity(inlineStyle)).toContain('0.16')
    expect(opacity(vueStyle)).toContain('0.16')
  })

  it('both stand still for a player who asked motion to stop', () => {
    // Both files carry more than one reduced-motion block (the wispling has
    // its own), so look at all of them rather than the first.
    const reduced = (css: string): string =>
      [...css.matchAll(/prefers-reduced-motion/g)].map((m) => css.slice(m.index!, m.index! + 220)).join('\n')
    expect(reduced(inlineStyle)).toContain('.splash-tiles')
    expect(reduced(vueStyle)).toContain('.backdrop-tiles')
  })

  it('sit on ground that cannot scroll', () => {
    // The layer is one tile wider and taller than the screen, so both hosts
    // have to clip it or the page gets a scrollbar it never had before.
    const block = (css: string, from: string, to: string): string =>
      css.slice(css.indexOf(from), css.indexOf(to, css.indexOf(from)))
    expect(block(inlineStyle, '#static-splash {', '}')).toContain('overflow: hidden')
    expect(block(vueStyle, '.splash-backdrop', '.backdrop-tiles')).toContain('overflow: hidden')
  })
})

describe('the tile itself', () => {
  it('is authored above the CSS tile size, and keeps its alpha', async () => {
    const meta = await sharp(TILE).metadata()
    // Square, and a whole multiple of the 400px CSS tile.
    //
    // The multiple is what keeps it sharp: this layer covers the whole screen,
    // so a 1:1 tile is resampled up by the device pixel ratio on every phone
    // and every motif arrives soft — which is exactly how it shipped first.
    // A fractional multiple would be worse than either, since the pan then
    // lands the tile on half-pixel boundaries.
    expect(meta.width).toBe(meta.height)
    expect(meta.width! % 400).toBe(0)
    expect(meta.width! / 400).toBeGreaterThanOrEqual(2)

    // And the name says what the pixels are, like every other sized asset in
    // `public/images`. The generator builds the filename out of the dimensions
    // for this reason; the check is here because the two splashes spell the
    // name out by hand and would go on loading a file whose name had stopped
    // being true.
    expect(TILE).toContain(`bg-tile_${meta.width}x${meta.height}.webp`)
    // The layer composites over the splash's radial gradient. A tile with the
    // ground baked in would flatten it, and there would be nothing the CSS
    // `opacity` could do about it.
    expect(meta.hasAlpha).toBe(true)
  })

  it('carries at most eight motifs', async () => {
    // Past eight the tile stops being a set of things you recognise and turns
    // into wallpaper — see the header of `tools/bg-tile.mjs`.
    const cast = tool.slice(tool.indexOf('const CAST = ['), tool.indexOf(']', tool.indexOf('const CAST = [')))
    const motifs = [...cast.matchAll(/file: '/g)].length
    expect(motifs).toBeGreaterThan(0)
    expect(motifs).toBeLessThanOrEqual(8)
  })

  it('is seamless: opposite edges meet', async () => {
    // Every motif is drawn again on the far side of the tile, so the column of
    // pixels one step past the right edge IS the left edge. Compare the two
    // borders after a copy has been shifted by a whole tile: if a motif had
    // been clipped instead of wrapped, the seam would show as a hard cut here.
    const { data, info } = await sharp(TILE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const px = (x: number, y: number, c: number): number => data[(y * info.width + x) * 4 + c]!

    // A motif crossing an edge leaves ink on both sides of it. Confirm the
    // wrap actually happens somewhere, so a blank-edged tile cannot pass this
    // by having nothing to compare.
    let inkOnEdges = 0
    for (let y = 0; y < info.height; y++) {
      if (px(0, y, 3) > 24 && px(info.width - 1, y, 3) > 24) inkOnEdges++
    }
    expect(inkOnEdges).toBeGreaterThan(0)

    // And the two edges belong to the same drawing: a pixel on the left edge
    // and its partner on the right differ only by the one-pixel step between
    // them, never by a whole motif.
    let jumps = 0
    for (let y = 0; y < info.height; y++) {
      for (let c = 0; c < 4; c++) {
        if (Math.abs(px(0, y, c) - px(info.width - 1, y, c)) > 96) jumps++
      }
    }
    expect(jumps).toBeLessThan(info.height * 0.1)
  })
})
