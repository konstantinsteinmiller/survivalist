/**
 * ─── The splash screen's panning tile ──────────────────────────────────────
 *
 *   pnpm art:bg-tile          → public/images/bg/bg-tile_<edge>x<edge>.webp
 *
 * The backdrop behind the wispling and the logo is a seamless tile that drifts
 * toward the bottom right, the way a Brawl Stars loading screen does: faint
 * line drawings of the game's own things on the dark sky. Same idea as
 * glyphyx's `art:splash-tile`, arrived at from the other end — glyphyx draws
 * its runes as vectors because it HAS them as vectors, and this game's cast
 * only exists as paintings.
 *
 * So the tile is derived from the paintings themselves. Each source is trimmed
 * to its ink, its luminance is stretched to the full range, and the result is
 * posterised into three greys. That last step is the whole trick: the art is
 * painted with dark outlines and broad shading already, so flattening it to
 * three tones keeps the outline and the big shadow masses and throws away
 * everything else — which is exactly a line drawing. Nothing is traced by
 * hand, so when a sprite is repainted, re-running this follows it.
 *
 * ── The cast ──
 *
 * EIGHT, and eight is the cap rather than a target: past that the tile stops
 * being a set of things you recognise and turns into wallpaper. They are the
 * eight the game is actually about — the survivor you are growing, the boss
 * at the end of the road, the chest and the coin you are playing for, the
 * barrel in the way, a skill, a weapon, and the anvil you spend it all on.
 * The gate is the notable absence: it is the core mechanic, but the painting
 * is a bare goalpost (the operator is drawn over it at runtime) and a faint
 * empty rectangle reads as a smudge, not as a gate.
 *
 * ── Seamless by construction ──
 *
 * Every sprite is composited nine times, once per neighbouring tile, onto a
 * 3x3 supercanvas; the middle cell is then cut out. Anything crossing an edge
 * is therefore already drawn on the far side, so tile copies meet with no
 * seam and no motif is clipped.
 *
 * ── What it does NOT decide ──
 *
 * How faint the layer is. The tile is drawn at full strength on transparent
 * ground; `opacity` on `.splash-tiles` / `.backdrop-tiles` sets the level, so
 * the two splashes can agree on it in CSS without a re-export. Keep the alpha
 * channel: the layer sits over the splash's radial gradient, and a baked-in
 * ground would flatten it.
 *
 * Not part of the app build — the webp is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'public/images')

/**
 * The tile's edge in CSS px — what `background-size` shows it at, and exactly
 * how far the pan travels before it loops.
 */
const TILE = 400

/**
 * How many image px are authored per CSS px.
 *
 * A backdrop is the one layer on the splash that covers the whole screen, so a
 * 1:1 tile is resampled up by the device pixel ratio on every phone worth
 * shipping to and every motif arrives soft. Authoring at 2x makes the common
 * case — a DPR-2 phone — land pixel for pixel.
 *
 * Everything below is written in CSS-tile units and multiplied by this on the
 * way out, so the layout numbers stay the same numbers the CSS uses.
 */
const SCALE = 2

/** The tile's edge in image px — what actually goes in the file. */
const TILE_PX = TILE * SCALE

/**
 * Where it lands. The name carries the real pixel dimensions, like every other
 * sized asset in `public/images`, and is built from them rather than typed —
 * raising `SCALE` renames the file instead of quietly making the name a lie.
 * The two splashes name this file, so a change here is a change in
 * `index.html` and `FLogoProgress.vue` too (`tests/ui/splashTiles.test.ts`
 * holds all three together).
 */
const OUT = resolve(ROOT, `public/images/bg/bg-tile_${TILE_PX}x${TILE_PX}.webp`)

/**
 * The three greys, darkest first: the line, the shadow mass, the body.
 *
 * Cool and light, because the layer sits over a navy sky at a fraction of its
 * opacity — a neutral grey goes muddy there.
 */
const INK = [
  { r: 0x7c, g: 0x8b, b: 0xad },
  { r: 0xaf, g: 0xbb, b: 0xd4 },
  { r: 0xe6, g: 0xec, b: 0xf8 }
]

/**
 * How dark a stretched luminance has to be to read as shadow MASS rather than
 * as body. Low on purpose: the mass is a supporting tone, and a backdrop read
 * at a glance wants shapes.
 */
const SHADE_CUT = 0.3

/**
 * Gradient strength, as a fraction of the sprite's own maximum, at which an
 * interior edge becomes a drawn LINE.
 *
 * This is what makes it a drawing instead of a flat sticker. Posterising
 * luminance alone was the first attempt and it fails in both directions at
 * once: the coin is bright gold end to end, so every tone landed in the same
 * bucket and it came out a blank disc, while the barrel is nearly black and
 * came out a slab. An EDGE does not care how light the thing is — the coin's
 * star and the barrel's hoops are both strong gradients — so lines survive on
 * sprites at either end of the range, and the body tone can stay flat.
 */
const LINE_CUT = 0.24

/**
 * Width of the silhouette rim, in FINAL image px. Every shape gets a contour,
 * whatever its painting does at the edge.
 */
const RIM = 3

/**
 * Narrowest a drawn line may end up, in FINAL image px.
 *
 * This is the difference between a drawing and a smudge, and it was the bug.
 * Sobel answers one pixel wide at the WORKING resolution, and the working
 * resolution is a multiple of the final one — so every interior line was
 * landing at a third of a pixel and averaging away into grey on the way down.
 * The mask is dilated until a line is at least this wide after the shrink,
 * which is what makes the coin's star an outline again instead of a smear.
 */
const LINE_PX = 1.4

/**
 * How far above the final size the line work is done. Three is enough to keep
 * the tone masses clean; more only costs time, since the source paintings do
 * not carry that much detail to begin with.
 */
const SS = 3

/** Grain blur before the edge pass, in FINAL px. Under one on purpose — see
 *  the note in `render`. */
const GRAIN_BLUR = 0.7

/** Radius, in FINAL px, of the open/close that tidies the shadow mass. */
const DESPECKLE = 1.2

/** Below this alpha a source pixel is background, not ink. */
const ALPHA_FLOOR = 24

/**
 * The cast, in drawing order.
 *
 * `frames` splits a walk strip; frame 0 of a strip is usually a contact pose
 * with the legs closed, so the ones worth reading mid-stride name a frame.
 * `size` is the sprite's long edge in CSS-tile px, `at` its centre in the
 * same units (both scaled by `SCALE` on the way out), `turn` a
 * rotation in degrees — a couple of them are tilted for the same reason a
 * sticker sheet tilts things, so the grid does not read as a grid.
 */
const CAST = [
  { file: 'heroes/teal.webp', frames: 8, frame: 3, size: 96, at: [56, 62], turn: -6 },
  { file: 'ui/chest.webp', size: 86, at: [200, 44], turn: 4 },
  { file: 'rounds/rocket.webp', size: 88, at: [332, 80], turn: 18 },
  { file: 'props/coin.webp', size: 74, at: [122, 176], turn: 0 },
  { file: 'monsters/marrowknight.webp', frames: 8, frame: 0, size: 104, at: [266, 190], turn: -3 },
  { file: 'props/barrel.webp', size: 88, at: [30, 292], turn: 5 },
  { file: 'ui/forge.webp', size: 80, at: [186, 320], turn: -4 },
  { file: 'ui/skill-grenade.webp', size: 78, at: [334, 288], turn: 12 }
]

/**
 * Grow or shrink a mask by `r` with a square kernel, separably.
 *
 * Two passes (rows, then columns) are exact for a square and cost O(n*r)
 * instead of O(n*r^2). `pick` is Math.min to erode, Math.max to dilate.
 *
 * Eroding the silhouette leaves the INTERIOR, and what the erosion removed is
 * the rim. Dilating the Sobel answer is what gives an interior line a width it
 * can survive the downsample with.
 */
const morph = (mask, w, h, r, pick) => {
  if (r < 1) return mask
  const edge = pick === Math.min ? 0 : 0
  const tmp = new Uint8Array(w * h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = mask[y * w + x]
      for (let k = -r; k <= r; k++) {
        const xx = x + k
        m = pick(m, xx < 0 || xx >= w ? edge : mask[y * w + xx])
      }
      tmp[y * w + x] = m
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = tmp[y * w + x]
      for (let k = -r; k <= r; k++) {
        const yy = y + k
        m = pick(m, yy < 0 || yy >= h ? edge : tmp[yy * w + x])
      }
      out[y * w + x] = m
    }
  }
  return out
}

/**
 * One painting → one flat line drawing of itself, on transparent ground.
 *
 * Three marks, in the order they are laid down:
 *
 *   BODY    everything inside the silhouette, the lightest tone, flat.
 *   MASS    the deepest shadows, one step down — enough to tell a skeleton's
 *           ribcage from its armour without tonal modelling, tidied of the
 *           specks brush texture leaves behind.
 *   LINE    the painting's own strong edges, plus a rim around the whole
 *           shape. This is the drawing.
 *
 * The luminance stretch is per sprite and over OPAQUE pixels only: a coin is
 * bright all over and a barrel is nearly black, so a shared scale would post
 * one to solid white and the other to solid shadow. Measuring each sprite
 * against its own range is what makes the eight read as one drawing.
 *
 * Alpha is carried through untouched; the soft edge comes from the downsample
 * that follows (see `render`).
 */
const lineArt = (rgba, w, h, ss) => {
  const n = w * h
  const lum = new Float32Array(n)
  const alpha = new Uint8Array(n)

  let lo = 255
  let hi = 0
  for (let i = 0; i < n; i++) {
    alpha[i] = rgba[i * 4 + 3]
    const l = 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]
    lum[i] = l
    if (alpha[i] < ALPHA_FLOOR) continue
    if (l < lo) lo = l
    if (l > hi) hi = l
  }
  // A sprite with no range left to stretch would divide by zero.
  const span = hi - lo > 1 ? hi - lo : 1

  // Sobel over the luminance, clamped at the silhouette: a neighbour outside
  // the shape is read as the centre pixel's own value, so the sprite's edge
  // against empty space does not register here. The rim below owns that edge,
  // and letting both draw it doubles its width.
  const at = (x, y, cx, cy) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return lum[cy * w + cx]
    return alpha[y * w + x] < ALPHA_FLOOR ? lum[cy * w + cx] : lum[y * w + x]
  }
  const grad = new Float32Array(n)
  let gmax = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (alpha[i] < ALPHA_FLOOR) continue
      const gx =
        at(x - 1, y - 1, x, y) + 2 * at(x - 1, y, x, y) + at(x - 1, y + 1, x, y) -
        at(x + 1, y - 1, x, y) - 2 * at(x + 1, y, x, y) - at(x + 1, y + 1, x, y)
      const gy =
        at(x - 1, y - 1, x, y) + 2 * at(x, y - 1, x, y) + at(x + 1, y - 1, x, y) -
        at(x - 1, y + 1, x, y) - 2 * at(x, y + 1, x, y) - at(x + 1, y + 1, x, y)
      const g = Math.hypot(gx, gy)
      grad[i] = g
      if (g > gmax) gmax = g
    }
  }
  const gcut = (gmax > 0 ? gmax : 1) * LINE_CUT

  // Sobel answers one working px wide. Grow it until it is `LINE_PX` wide
  // AFTER the shrink by `ss`, or the line averages away into the body tone.
  let line = new Uint8Array(n)
  for (let i = 0; i < n; i++) line[i] = grad[i] > gcut ? 255 : 0
  line = morph(line, w, h, Math.max(0, Math.round((LINE_PX * ss - 1) / 2)), Math.max)

  // Both widths are quoted in final px, so both scale with the supersample.
  const inner = morph(alpha, w, h, Math.round(RIM * ss), Math.min)

  // The shadow mass, opened and then closed.
  //
  // Brush texture in the source leaves the mass mask full of specks a pixel or
  // two across, and a speck is not shading — it is noise that survives as
  // camouflage blotches across a figure and costs bytes to store. Opening
  // (shrink, then grow) deletes anything thinner than the kernel; closing
  // (grow, then shrink) fills the pinholes the same texture punches in a mass
  // that should be solid. Radius is in final px, like the widths above.
  const speck = Math.round(DESPECKLE * ss)
  let mass = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    mass[i] = alpha[i] >= ALPHA_FLOOR && (lum[i] - lo) / span < SHADE_CUT ? 255 : 0
  }
  mass = morph(morph(mass, w, h, speck, Math.min), w, h, speck, Math.max)
  mass = morph(morph(mass, w, h, speck, Math.max), w, h, speck, Math.min)

  const out = Buffer.alloc(n * 4)
  for (let i = 0; i < n; i++) {
    const a = alpha[i]
    if (a < ALPHA_FLOOR) continue
    const isLine = line[i] > 0 || inner[i] < ALPHA_FLOOR
    const ink = INK[isLine ? 0 : mass[i] > 0 ? 1 : 2]
    out[i * 4] = ink.r
    out[i * 4 + 1] = ink.g
    out[i * 4 + 2] = ink.b
    out[i * 4 + 3] = a
  }
  return out
}

/** Load one cast member and return it as a line-drawn, trimmed, sized PNG. */
const render = async (member) => {
  const file = resolve(SRC, member.file)
  const meta = await sharp(file).metadata()
  const frames = member.frames ?? 1
  const fw = Math.round(meta.width / frames)

  // One frame out of the strip, then trimmed to its own ink — the sheets pad
  // every frame to a shared box, and keeping that padding would size the
  // sprites by their boxes instead of by what is drawn in them.
  //
  // Two passes, not one chain: sharp runs `trim` BEFORE `extract` whatever
  // order they are called in, so chaining them asks the second to cut a frame
  // out of an image the first has already shrunk.
  const frame = await sharp(file)
    .extract({ left: (member.frame ?? 0) * fw, top: 0, width: fw, height: meta.height })
    .png()
    .toBuffer()

  // The size this sprite ends up at IN THE FILE, and the resolution the line
  // work is done at on the way there.
  const final = Math.round(member.size * SCALE)
  const work = final * SS

  // Flatten at `SS` times the final size, then come back down.
  //
  // Order matters more than it looks. Flattening at source resolution and
  // shrinking afterwards posts every speck of brush texture to its own tone
  // and then averages the mess back into mush; flattening at final size loses
  // the outline before there is anything to flatten. Working above and
  // downsampling keeps the tones as clean masses AND hands back the
  // anti-aliased edge the shrink produces — which the layer needs, because a
  // hard-keyed edge crawls visibly as the tile pans.
  //
  // The blur only exists to stop canvas grain from being read as an edge, so
  // it is quoted in FINAL px and kept under one: it used to be tied to the
  // working resolution, which made it three times stronger than intended and
  // smeared the lines it was supposed to be protecting.
  const { data, info } = await sharp(frame)
    .trim({ threshold: 1 })
    .resize(work, work, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(GRAIN_BLUR * SS)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const flat = lineArt(data, info.width, info.height, SS)

  let img = sharp(flat, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(final, final, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    // A flat three-tone drawing loses its bite to any resample; a light unsharp
    // mask puts the step back at the tone boundaries without inventing detail.
    .sharpen({ sigma: 0.7 })

  if (member.turn) img = img.rotate(member.turn, { background: { r: 0, g: 0, b: 0, alpha: 0 } })

  const buf = await img.png().toBuffer()
  const out = await sharp(buf).metadata()
  return { buf, w: out.width, h: out.height }
}

const main = async () => {
  const drawn = await Promise.all(CAST.map(render))

  // The 3x3 supercanvas. The middle cell is the tile; the eight round it are
  // what makes the edges meet.
  const layers = []
  for (let i = 0; i < CAST.length; i++) {
    const { buf, w, h } = drawn[i]
    const [cx, cy] = CAST[i].at.map((v) => v * SCALE)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const left = Math.round(TILE_PX + cx + dx * TILE_PX - w / 2)
        const top = Math.round(TILE_PX + cy + dy * TILE_PX - h / 2)
        // A neighbour that falls off the supercanvas cannot reach the middle
        // cell either (every sprite is far narrower than a tile), so dropping
        // it costs nothing and keeps `composite` inside its bounds.
        if (left < 0 || top < 0 || left + w > TILE_PX * 3 || top + h > TILE_PX * 3) continue
        layers.push({ input: buf, left, top })
      }
    }
  }

  const big = await sharp({
    create: { width: TILE_PX * 3, height: TILE_PX * 3, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(layers)
    .png()
    .toBuffer()

  const tile = await sharp(big)
    .extract({ left: TILE_PX, top: TILE_PX, width: TILE_PX, height: TILE_PX })
    // q75 / effort 6 is this project's measured house setting — the point where
    // `scripts/compress-images.mjs` found sharp's webp matches what TinyPNG
    // returns. Nothing here needs more: it is a three-tone drawing shown at a
    // sixth of its opacity, and it is on the splash's critical path.
    .webp({ quality: 75, effort: 6, alphaQuality: 90 })
    .toBuffer()

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, tile)
  console.log(
    `bg-tile → ${OUT} (${TILE_PX}x${TILE_PX} for a ${TILE}px CSS tile, ` +
    `${(tile.length / 1024).toFixed(1)} kB, ${CAST.length} motifs)`
  )
}

await main()
