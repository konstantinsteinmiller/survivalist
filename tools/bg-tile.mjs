/**
 * ─── The splash screen's panning tile ──────────────────────────────────────
 *
 *   pnpm art:bg-tile          → public/images/bg/bg-tile.svg
 *
 * The backdrop behind the wispling and the logo is a seamless tile that drifts
 * toward the bottom right, the way a Brawl Stars loading screen does.
 *
 * ── What it is made of, and what it is NOT ──
 *
 * Eight EMBLEMS: an outlined badge — a shield, a medallion, an arch, a cut
 * stone — with one of the game's own glyphs sitting inside it. Flat vector,
 * thin stroke, a fill barely off the ground it sits on.
 *
 * The first version of this file traced the tile out of the PAINTINGS, by
 * flattening each sprite's luminance into tones and pulling lines out of its
 * gradients. That was the wrong instrument for the job and no amount of tuning
 * was going to fix it: a painting downsampled to 90 px is soft before anything
 * else happens to it, its outline is wherever the brush happened to go, and
 * eight of them together read as eight photographs of things rather than as one
 * set of marks. What a pattern like this wants is a drawn ICON — uniform
 * weight, closed shape, no interior detail to lose.
 *
 * So the source is now `src/components/icons/iconPaths.ts`, the game's own
 * 44-glyph set, on the same 24x24 grid the HUD draws them on. The chest on the
 * backdrop is the chest on the shop button. Redraw a glyph and re-run this; the
 * tile follows.
 *
 * ── Why SVG ──
 *
 * Because it cannot be blurry. A raster tile is resampled by the device pixel
 * ratio on every phone, and thin strokes are exactly what that ruins — which is
 * what the webp versions of this file kept being told off for. A vector is
 * drawn at whatever the device actually has, is a few kB instead of ~65, and
 * has no "authored at 2x" contract to keep. Same reason glyphyx's
 * `art:splash-tile` emits an SVG.
 *
 * ── Seamless by construction ──
 *
 * Each emblem is defined once in `<defs>` and `<use>`d nine times, once per
 * neighbouring tile. Anything crossing an edge is therefore already drawn on
 * the far side, and the viewBox clips the rest — so tile copies meet with no
 * seam and no motif is cut off.
 *
 * ── What it does NOT decide ──
 *
 * How faint the layer is. The tile is drawn at full strength on transparent
 * ground; `opacity` on `.splash-tiles` / `.backdrop-tiles` sets the level, so
 * the two splashes can agree on it in CSS without a re-export.
 *
 * Not part of the app build — the SVG is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICON_PATHS } from '@/components/icons/iconPaths'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/images/bg/bg-tile.svg')

/** The tile's edge, in SVG user units. The CSS shows it at 400px and pans by
 *  exactly that. */
const TILE = 400

/**
 * The ink.
 *
 * One cool near-white for everything, and one warm accent that two emblems
 * wear. Alpha does the rest — the badge outline is nearly solid, its fill is a
 * whisper, and the CSS knocks the whole layer back to a sixth. Two inks rather
 * than one because a pattern in a single flat tone reads as a texture; one warm
 * note in eight makes it read as a set of objects.
 */
const INK = '#e6ecf8'
const ACCENT = '#ffb46a'

/** Badge outline, badge fill, and the glyph inside it. */
const STROKE_A = 0.92
const FILL_A = 0.1
const GLYPH_A = 0.6

/** Outline weight, in the emblem's own 24-unit space. */
const STROKE_W = 1.15

/**
 * The badge shapes, on the same 24x24 grid as the glyphs.
 *
 * Four, not eight: the emblems have to read as one family, and a set where
 * every frame is different is a set with no rule in it. Each is a closed path,
 * so one element can be both stroked and filled.
 */
const FRAMES = {
  /** Heater shield. Deliberately plainer than the game's own `shield` glyph —
   *  this is furniture, and the glyph inside it is the subject. */
  shield: 'M12 1.7 21.3 4.8 V12.1 C21.3 17.5 17.2 21.1 12 22.6 6.8 21.1 2.7 17.5 2.7 12.1 V4.8 Z',
  /** Arch — a standing plaque, flat on the floor and domed over the top. */
  arch: 'M12 1.8 C17.2 1.8 20.7 5.5 20.7 10.3 V20.4 C20.7 21.5 20.1 22.1 19.1 22.1 H4.9 C3.9 22.1 3.3 21.5 3.3 20.4 V10.3 C3.3 5.5 6.8 1.8 12 1.8 Z',
  /** Cut stone — eight facets, the one frame with no straight sides. */
  stone: 'M12 1.6 18.5 4.2 22.3 9.8 20.7 16.9 15.2 21.9 8.8 21.9 3.3 16.9 1.7 9.8 5.5 4.2 Z',
  /** Medallion — a ring, with a second ring inside it (see `emblem`). */
  medal: 'M12 1.6 A10.4 10.4 0 1 1 11.9 1.6 Z'
}

/** The medallion's inner ring, as a fraction of the outer. */
const MEDAL_INNER = 0.85

/**
 * The cast, in drawing order.
 *
 * EIGHT, and eight is the cap rather than a target: past that the tile stops
 * being a set of things you recognise and turns into wallpaper. They are the
 * eight the game is about — the squad you are growing, the skull at the end of
 * the road, the chest and the coin you play for, the anvil you spend on, and
 * the three toys in between.
 *
 * `size` is the emblem's width in tile units, `at` its centre, `turn` a tilt in
 * degrees. A few are tilted for the reason a sticker sheet tilts things, so the
 * layout does not read as a grid. No frame sits next to a copy of itself, and
 * the two accented emblems are kept apart so the warm note is spread across a
 * screen rather than clustered in one corner of it.
 */
const CAST = [
  { icon: 'squad', frame: 'shield', size: 96, at: [56, 62], turn: -6 },
  { icon: 'chest', frame: 'arch', size: 90, at: [200, 44], turn: 4, accent: true },
  { icon: 'rocket', frame: 'stone', size: 88, at: [332, 80], turn: 14 },
  // The STAR rather than the `coin` glyph, and the stone rather than the
  // medallion. Two separate lessons from looking at it on a phone: a round
  // glyph inside a ring inside a ring is three concentric circles and reads as
  // a target, and the coin glyph at this scale is a featureless disc with its
  // detail below the resolution anyone is looking at. The star is what the
  // painted coin actually has stamped on it, so it is also the truer mark.
  { icon: 'star', frame: 'stone', size: 84, at: [122, 176], turn: -10 },
  { icon: 'skull', frame: 'arch', size: 100, at: [266, 190], turn: -4 },
  { icon: 'anvil', frame: 'medal', size: 92, at: [30, 292], turn: 0 },
  { icon: 'trophy', frame: 'medal', size: 86, at: [186, 320], turn: 0, accent: true },
  { icon: 'bomb', frame: 'shield', size: 88, at: [334, 288], turn: 11 }
]

/**
 * How much of the badge the glyph inside it takes.
 *
 * Under half. The badge is the shape the eye reads at a glance and the glyph is
 * what it resolves into a moment later; a glyph sized to fill its frame turns
 * the pair into one crowded blob at the size this is actually seen at.
 */
const GLYPH_FIT = 0.46

/** A four-point sparkle. Reference-sheet furniture — it is what stops a field
 *  of badges reading as a form. */
const SPARK = 'M12 4 13.5 10.5 20 12 13.5 13.5 12 20 10.5 13.5 4 12 10.5 10.5 Z'

/** Sparkles: `at` in tile units, `size` their width. */
const SPARKS = [
  { at: [140, 98], size: 17, turn: 12 },
  { at: [300, 252], size: 13, turn: -8 },
  { at: [74, 202], size: 11, turn: 20 }
]

const r2 = (n) => Math.round(n * 100) / 100

/**
 * One emblem as a `<g>`, drawn around its own origin so a `<use>` only has to
 * carry an x/y.
 *
 * The glyph is centred on the frame's OPTICAL middle rather than its box: the
 * shield and the arch both hang more mass below the midline than above it, so a
 * glyph placed at 12,12 rides visibly high in either.
 */
const emblem = (m, id) => {
  const ink = m.accent ? ACCENT : INK
  const g = GLYPH_FIT
  const cy = m.frame === 'shield' ? 11.4 : m.frame === 'arch' ? 12.4 : 12
  const gx = 12 - 12 * g
  const gy = cy - 12 * g

  const glyph = ICON_PATHS[m.icon]
  if (!glyph) throw new Error(`bg-tile: no glyph named '${m.icon}'`)

  const body =
    `<path d="${FRAMES[m.frame]}" fill="${ink}" fill-opacity="${FILL_A}"` +
    ` stroke="${ink}" stroke-opacity="${STROKE_A}" stroke-width="${STROKE_W}" stroke-linejoin="round"/>` +
    (m.frame === 'medal'
      ? `<circle cx="12" cy="12" r="${r2(10.4 * MEDAL_INNER)}" fill="none" stroke="${ink}"` +
        ` stroke-opacity="${r2(STROKE_A * 0.55)}" stroke-width="${r2(STROKE_W * 0.7)}"/>`
      : '') +
    `<g transform="translate(${r2(gx)} ${r2(gy)}) scale(${g})">` +
    `<path d="${glyph.join(' ')}" fill="${ink}" fill-opacity="${GLYPH_A}" fill-rule="nonzero"/></g>`

  // `scale` sits OUTSIDE the drawing, so `STROKE_W` above is in the emblem's
  // own units and every badge carries the same visual weight whatever size it
  // is drawn at — a stroke quoted in tile units would thin out as the emblems
  // got smaller and the family would stop looking like a family.
  return (
    `<g id="${id}"><g transform="rotate(${m.turn}) scale(${r2(m.size / 24)}) translate(-12 -12)">` +
    `${body}</g></g>`
  )
}

const sparkle = (s, id) =>
  `<g id="${id}"><g transform="rotate(${s.turn}) scale(${r2(s.size / 24)}) translate(-12 -12)">` +
  `<path d="${SPARK}" fill="${INK}" fill-opacity="${r2(GLYPH_A * 0.7)}"/></g></g>`

const main = () => {
  const defs = [
    ...CAST.map((m, i) => emblem(m, `e${i}`)),
    ...SPARKS.map((s, i) => sparkle(s, `s${i}`))
  ]

  // Nine copies of everything, one per neighbouring tile. The viewBox clips
  // what falls outside, so the only cost of the eight extra copies is markup —
  // and the benefit is that no emblem is ever cut in half at an edge.
  const uses = []
  const place = (id, [cx, cy]) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        uses.push(`<use href="#${id}" x="${cx + dx * TILE}" y="${cy + dy * TILE}"/>`)
      }
    }
  }
  CAST.forEach((m, i) => place(`e${i}`, m.at))
  SPARKS.forEach((s, i) => place(`s${i}`, s.at))

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}" width="${TILE}" height="${TILE}">`,
    `<defs>${defs.join('')}</defs>`,
    uses.join(''),
    '</svg>'
  ].join('\n')

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${svg}\n`)
  console.log(
    `bg-tile → ${OUT} (${TILE}x${TILE} units, ` +
    `${(svg.length / 1024).toFixed(1)} kB, ${CAST.length} emblems, ${SPARKS.length} sparkles)`
  )
}

main()
