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

const TILE = join(ROOT, 'public/images/bg/bg-tile.svg')
const tile = readFileSync(TILE, 'utf8')

/** Everything inside the inline `<style>` of index.html. */
const inlineStyle = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
/** Everything inside the component's `<style>` block. */
const vueStyle = vue.slice(vue.indexOf('<style scoped'))

describe('the two splashes pan the same tile', () => {
  it('name the one tile file', () => {
    // Relative in the HTML because Vite does not rewrite `url()` inside an
    // inline style; through `prependBaseUrl` in the component because Vite
    // does not rewrite a runtime string either.
    expect(inlineStyle).toContain('url(./images/bg/bg-tile.svg)')
    expect(vue).toContain("prependBaseUrl('images/bg/bg-tile.svg')")
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
  it('is a vector on a 400-unit grid, with no ground baked into it', () => {
    // Vector, and that is the point rather than a preference. This layer covers
    // the whole screen, so a raster tile is resampled by the device pixel ratio
    // on every phone — and thin strokes, which is all this drawing is, are
    // exactly what that ruins. Two raster versions of this file were rejected
    // for looking blurry before it became an SVG.
    expect(tile.startsWith('<svg')).toBe(true)
    // The viewBox has to match the CSS tile, or the pan no longer travels
    // exactly one repeat and the loop jumps.
    expect(tile).toContain('viewBox="0 0 400 400"')

    // No opaque ground. The layer composites over the splash's radial gradient,
    // and a background rect would flatten it with nothing the CSS `opacity`
    // could do about it.
    expect(tile).not.toMatch(/<rect[^>]*width="100%"/)
  })

  it('carries at most eight motifs', async () => {
    // Past eight the tile stops being a set of things you recognise and turns
    // into wallpaper — see the header of `tools/bg-tile.mjs`.
    const cast = tool.slice(tool.indexOf('const CAST = ['), tool.indexOf(']', tool.indexOf('const CAST = [')))
    const motifs = [...cast.matchAll(/icon: '/g)].length
    expect(motifs).toBeGreaterThan(0)
    expect(motifs).toBeLessThanOrEqual(8)
  })

  it('is seamless: every motif is drawn on all nine neighbours', async () => {
    // Each emblem is defined once and `<use>`d nine times — its own tile plus
    // the eight around it — so a motif crossing an edge is already drawn on the
    // far side and the viewBox clips the remainder. Anything less than nine
    // means some edge has a half-emblem on it.
    const defs = [...tile.matchAll(/<g id="([es]\d+)"/g)].map((m) => m[1]!)
    expect(defs.length).toBeGreaterThan(0)
    for (const id of defs) {
      const uses = [...tile.matchAll(new RegExp(`<use href="#${id}"`, 'g'))].length
      expect(uses, `${id} is not tiled on all nine neighbours`).toBe(9)
    }

    // And prove it on actual pixels: rasterise, then compare the two vertical
    // borders. A motif that had been clipped rather than wrapped would show up
    // here as a hard cut that its partner edge does not have.
    const { data, info } = await sharp(TILE, { density: 144 })
      .resize(400, 400)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const px = (x: number, y: number, c: number): number => data[(y * info.width + x) * 4 + c]!

    let jumps = 0
    for (let y = 0; y < info.height; y++) {
      for (let c = 0; c < 4; c++) {
        if (Math.abs(px(0, y, c) - px(info.width - 1, y, c)) > 96) jumps++
      }
    }
    expect(jumps).toBeLessThan(info.height * 0.1)
  })
})
