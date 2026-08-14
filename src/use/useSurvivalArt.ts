import {
  BARRICADE_H, BASE_FIRE_RATE, CRATE_R, CROWD_MAX_R, CROWD_SQUASH, DIVIDER_H,
  DIVIDER_HALF_W, ELITE_SWEEP_REACH, ELITE_TELEGRAPH,
  LANE_HALF, MAX_FIRE_RATE, SLAM_RADIUS, SLAM_RADIUS_GROWTH,
  SLAM_RADIUS_MAX, VIEW_HEIGHT, UNIT_R,
  type Divider, type GateOp
} from '@/game/survival'
import {
  anchor, crowdRadius, damage, eliteAlive, formationRadius, getBarricades, getBoss,
  getBullets, getCrates, getDividers, getFoes, getGates, getPickups, getUnits,
  nowMs, phase, runFireRate, squadCount, stage
} from '@/use/useSurvivalGame'
import {
  HERO_CYCLE_MS, HERO_FOOT, HERO_HEIGHT, HERO_PX, outfitIndex, outfitTone,
  primeSurvivors, survivorFrame
} from '@/game/heroSprites'
import {
  SPRITE_FOOT, SPRITE_HEIGHT, monsterFaces, monsterFrame, primeMonsterSprites
} from '@/game/monsterSprites'
import { allFoeDesigns } from '@/game/foes'
import {
  drainFx, drawParticles, emit, emitDecal, emitText, getDecals, getTexts,
  quality, sampleFrame, stepDecals, stepParticles, stepTexts, type FxEvent
} from '@/use/useVfx'
import { useScreenshake } from '@/use/useScreenshake'
import { playFx } from '@/use/useGameAudio'
import { getCachedImage } from '@/use/useAssets'

/**
 * ─── Renderer ───────────────────────────────────────────────────────────────
 *
 * Everything is Canvas 2D. The only bitmaps in the whole game are the frame
 * strips baked at runtime from the ink-art vocabulary (`heroSprites`,
 * `monsterSprites`) — so the download carries no gameplay art at all, the game
 * is crisp at every DPR, and first paint happens the moment the bundle parses.
 *
 * Layer order (back → front):
 *
 *   1  sky, tinted by the stage's "time of day"
 *   2  far ridges                      (parallax 0.18)
 *   3  dune band                       (parallax 0.42)
 *   4  the lane: scrolling ground tile, rails, rungs
 *   5  ground decals (scorch, craters)
 *   6  coins → crates → barricades → gates → divider pillars
 *   7  foes, boss
 *   8  survivors + muzzle flashes
 *   9  tracers (additive)
 *  10  particles (normal pass, then additive pass)
 *  11  floating text, off-screen miniboss marker, then full-screen grades:
 *      speed lines, flash, elite flare, vignette
 *
 * The divider pillars sit ON TOP of the gate leaves on purpose. They are the
 * only lethal thing inside the gate band, and a lethal thing that can be
 * occluded by the pretty thing next to it is a bug, not a layer choice.
 *
 * The camera is deliberately dumb: a fixed frame that fits the lane's width and
 * keeps the crowd at 72% down the screen. A runner does not want a camera with
 * opinions — the player is steering something at the bottom of the screen and
 * reading something at the top, and anything that moves that relationship makes
 * the game harder to read for no gain.
 */

const { triggerShake } = useScreenshake()

// ─── Camera ─────────────────────────────────────────────────────────────────

let viewW = 0
let viewH = 0
let scale = 40
/** Where the crowd sits vertically, as a fraction of the viewport. */
const CROWD_SCREEN_Y = 0.72
/** Extra world width kept visible beyond the lane edges, so the rails are
 *  never flush against the screen edge on a phone. */
const LANE_MARGIN = 1.1
/** Remembered so the off-screen miniboss marker can sit UNDER the HUD instead
 *  of behind it — the one screen-space overlay the renderer owns. */
let topInsetPx = 0

export const setViewport = (w: number, h: number, topInset = 0, bottomInset = 0): void => {
  viewW = w
  viewH = h
  topInsetPx = topInset
  const usableH = Math.max(160, h - topInset - bottomInset)
  // Fit the lane's WIDTH, but never zoom in so far that the player cannot see
  // what is coming: on a wide screen the vertical fit wins and the lane is
  // letterboxed by terrain instead.
  scale = Math.max(16, Math.min(
    w / (LANE_HALF * 2 + LANE_MARGIN * 2),
    usableH / VIEW_HEIGHT
  ))
}

/**
 * The camera's world-y, latched ONCE per frame.
 *
 * `worldToScreenY` is the single hottest function in the renderer — every
 * survivor, foe, bullet, particle and prop goes through it — and `anchor()`
 * builds a fresh object on every call. Reading it per projection was a few
 * hundred short-lived allocations a frame for a number that cannot change
 * mid-frame anyway. Latched here, the projection is pure arithmetic.
 */
let camY = 0
/** The crowd's anchor x, latched with it, for the passes that need to know
 *  which side of the formation a body is on. */
let camX = 0

export const getScale = (): number => scale
export const worldToScreenX = (wx: number): number => viewW / 2 + wx * scale
export const worldToScreenY = (wy: number): number =>
  viewH * CROWD_SCREEN_Y - (wy - camY) * scale
export const screenToWorldX = (sx: number): number => (sx - viewW / 2) / scale
/** World-space delta for a screen-space drag — the steering conversion. */
export const screenDeltaToWorld = (dx: number): number => dx / scale

// ─── Palette ────────────────────────────────────────────────────────────────
//
// Each stage gets its own sky so a long session visibly travels somewhere. The
// LANE never changes hue, though: the thing the player reads every frame has to
// stay constant or the contrast of the gates and the crowd moves under them.

interface Sky { top: string; bottom: string; ridge: string; dune: string; haze: string }

const SKIES: Sky[] = [
  { top: '#1b2a4a', bottom: '#4a3d6b', ridge: '#221a38', dune: '#2f2547', haze: '#6b5a9c' },
  { top: '#3b1f3f', bottom: '#7a3550', ridge: '#2a1430', dune: '#3d1d3a', haze: '#b05a6b' },
  { top: '#12303a', bottom: '#2c6a63', ridge: '#0e2530', dune: '#153b3c', haze: '#4fa08c' },
  { top: '#2c1c14', bottom: '#8a4a1e', ridge: '#1e1210', dune: '#33200f', haze: '#d2843a' },
  { top: '#141a2e', bottom: '#2a3f6b', ridge: '#0d1224', dune: '#141d34', haze: '#4a6cb0' }
]

const skyFor = (n: number): Sky => SKIES[(n - 1) % SKIES.length] ?? SKIES[0]!

const LANE_TONE = {
  base: '#32333d',
  light: '#43454f',
  dark: '#1d1e24',
  rail: '#585c69',
  railLit: '#8d93a3',
  line: 'rgba(255,255,255,0.10)'
}

/**
 * One tint family per gate op, keyed by the op itself so a leaf can never be
 * drawn in the wrong colour.
 *
 * The families are picked for PERIPHERAL separation, not for prettiness: cyan
 * and magenta are both "cool and bright", red is warm, dark and dirty. A player
 * scanning a three-leaf bank at speed sorts them on hue and value before they
 * ever read a number, so the trap has to fail both tests at once.
 */
/**
 * One tint per op, and the pairs matter more than the individual colours.
 *
 * `add`/`sub` are the same mechanic with a sign, so they are the same HUE
 * family read at opposite temperatures — cyan for the door that pays, a sick
 * amber-brown for the one that bills. `mul`/`div` are the other axis: magenta
 * and red. A player who has learned "cool = good, warm = bad" can read a bank
 * they have never seen before at a glance, which is the whole job of this
 * table, and it is why `sub` is NOT simply a second red: a bill and a trap
 * standing side by side have to be tellable apart from across the lane.
 */
const GATE_TINT = {
  add: { a: '#7ae0ff', b: '#1f6aa8', glow: '120,220,255', plateA: '#cfefff', plateB: '#3d86c4' },
  sub: { a: '#ffa53c', b: '#6b3708', glow: '255,150,60', plateA: '#ffcf9a', plateB: '#a35c14' },
  mul: { a: '#ff7ad0', b: '#8a2ea8', glow: '255,140,230', plateA: '#ffb0e8', plateB: '#c04aa0' },
  div: { a: '#ff5f3c', b: '#5e160e', glow: '255,80,45', plateA: '#ff9a80', plateB: '#8c2418' }
} as const

/**
 * One identity per crate kind.
 *
 * These two props sit side by side in the same stage and cost the same detour,
 * so the ONLY thing that makes the detour a decision is being able to tell them
 * apart before committing to it: green + steady = hit harder, cyan + urgent =
 * shoot faster. The pulse rate carries the meaning even in greyscale.
 */
const CRATE_TONE = {
  damage: { glow: '120,255,170', halo: 'rgba(60,200,120,0)', rim: 'rgba(70,225,145,0.95)', badge: '#8fffc2', ink: 'rgba(10,40,26,0.8)', pulseMs: 300 },
  rate: { glow: '110,215,255', halo: 'rgba(50,160,230,0)', rim: 'rgba(80,200,255,0.95)', badge: '#b6ecff', ink: 'rgba(8,28,44,0.8)', pulseMs: 155 }
} as const

/** World units at which a divider pillar starts screaming at the crowd. Four is
 *  roughly three quarters of a second of running at stage speed — enough to
 *  steer out, short enough that the lane is not permanently flashing. */
const DIVIDER_WARN = 4

/** Fixed jitter for the boss's ground cracks. Precomputed and reused so the
 *  fissures stay PUT while they widen: a crack that re-randomises every frame
 *  reads as a particle effect, not as the floor about to break. */
const CRACK_ANGLE = [0.22, 1.05, 1.84, 2.63, 3.42, 4.11, 4.98, 5.72]
const CRACK_REACH = [0.94, 0.71, 1.0, 0.82, 0.96, 0.66, 0.89, 0.78]
const CRACK_BEND = [0.24, -0.3, 0.18, -0.22, 0.31, -0.16, 0.2, -0.28]

// ─── Drop-in bitmap overrides ───────────────────────────────────────────────
//
// Three props ship as real bitmaps (they already exist under `public/images`
// from the asset library) and everything else is drawn from code. The lookup is
// lazy, cached and failure-tolerant: until the image decodes — or forever, if
// the file is missing — the procedural version draws instead, so the game never
// waits on art and a deleted file can never blank a prop.
//
// Replacing any of these is a file drop, no code change. Paths are catalogued
// in `art-todo.md`.
const PROP_ART = {
  crate: 'images/props/box_256x256.webp',
  barricade: 'images/props/stone_256x256.webp',
  coin: 'images/props/coin_128x128.webp'
} as const

const propImage = (key: keyof typeof PROP_ART): HTMLImageElement | null => {
  const img = getCachedImage(PROP_ART[key])
  return img.complete && img.naturalWidth > 0 ? img : null
}

// ─── Cached backdrop ────────────────────────────────────────────────────────
//
// The sky and the two parallax bands are the most expensive layers and the
// least likely to change, so they are painted once into an offscreen canvas and
// blitted with a vertical offset. They are only re-rendered when the viewport
// or the stage changes.

let backdrop: HTMLCanvasElement | null = null
let backdropKey = ''

const buildBackdrop = (): HTMLCanvasElement | null => {
  if (typeof document === 'undefined' || viewW <= 0 || viewH <= 0) return null
  const key = `${Math.round(viewW)}x${Math.round(viewH)}|${stage.value}`
  if (backdrop && backdropKey === key) return backdrop

  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(viewW))
  // One extra viewport of height so the parallax offset never exposes an edge.
  c.height = Math.max(1, Math.round(viewH * 1.5))
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const sky = skyFor(stage.value)
  const h = c.height
  const w = c.width

  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, sky.top)
  g.addColorStop(0.62, sky.bottom)
  g.addColorStop(1, sky.dune)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // A low sun sitting on the horizon, blown out. It is the single element that
  // makes a flat gradient read as a place.
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, w * 0.62)
  sun.addColorStop(0, `${sky.haze}cc`)
  sun.addColorStop(0.45, `${sky.haze}33`)
  sun.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, w, h)

  // Far ridge line — a jagged silhouette, seeded so it is stable across frames.
  const ridge = (yBase: number, amp: number, colour: string, seed: number): void => {
    ctx.fillStyle = colour
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, yBase)
    for (let x = 0; x <= w; x += Math.max(8, w / 90)) {
      const n = Math.sin(x * 0.0121 + seed) * 0.5 + Math.sin(x * 0.0413 + seed * 2.3) * 0.32
        + Math.sin(x * 0.0907 + seed * 5.1) * 0.18
      ctx.lineTo(x, yBase + n * amp)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }
  ridge(h * 0.52, h * 0.07, sky.ridge, 1.7)
  ridge(h * 0.60, h * 0.045, sky.dune, 4.2)

  backdrop = c
  backdropKey = key
  return c
}

// ─── Cached lane tile ───────────────────────────────────────────────────────
//
// Gravel, cracks and tyre wear, baked into one repeatable tile and used as a
// canvas pattern. Drawing this procedurally per frame would be a few thousand
// ops; as a pattern it is one `fillRect`.

let laneTile: CanvasPattern | null = null
let laneTilePx = 0
let laneTileKey = ''

/** World units covered by one tile — chosen so the seam lands on the rung
 *  rhythm and is invisible. */
const TILE_UNITS = 4

const buildLaneTile = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const px = Math.max(48, Math.round(TILE_UNITS * scale))
  const key = String(px)
  if (laneTile && laneTileKey === key) return laneTile
  if (typeof document === 'undefined') return null

  const c = document.createElement('canvas')
  c.width = px
  c.height = px
  const t = c.getContext('2d')
  if (!t) return null

  t.fillStyle = LANE_TONE.base
  t.fillRect(0, 0, px, px)

  // Gravel: a deterministic scatter, two tones, plus a handful of bigger
  // stones. Deterministic matters — a tile that re-randomises on a zoom change
  // makes the whole road visibly twitch.
  let seed = 1337
  const rnd = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < px * 1.5; i++) {
    const x = rnd() * px
    const y = rnd() * px
    const r = 0.4 + rnd() * 1.5
    t.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.16)'
    t.beginPath()
    t.arc(x, y, r, 0, Math.PI * 2)
    t.fill()
  }
  for (let i = 0; i < 5; i++) {
    const x = rnd() * px
    const y = rnd() * px
    const r = 1.6 + rnd() * 2.4
    t.fillStyle = 'rgba(120,124,138,0.18)'
    t.beginPath()
    t.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, Math.PI * 2)
    t.fill()
  }
  // Two long cracks, so the surface has structure and not just noise.
  t.strokeStyle = 'rgba(0,0,0,0.22)'
  t.lineWidth = Math.max(1, px * 0.008)
  for (let i = 0; i < 2; i++) {
    t.beginPath()
    let x = rnd() * px
    t.moveTo(x, 0)
    for (let y = 0; y <= px; y += px / 6) {
      x += (rnd() - 0.5) * px * 0.12
      t.lineTo(x, y)
    }
    t.stroke()
  }

  laneTile = ctx.createPattern(c, 'repeat')
  laneTilePx = px
  laneTileKey = key
  return laneTile
}

// ─── Cached hazard stripes ──────────────────────────────────────────────────
//
// The yellow/black diagonal every human being on earth already reads as "this
// will hurt you". Baked into a repeating tile for the same reason as the lane:
// a divider pillar is ~14 px wide on a phone, so its stripes would otherwise be
// a dozen path ops per pillar per frame for something that never changes.
//
// The tile is square with a stripe slope of exactly 1 and a horizontal period
// of half the tile, which is what makes it seamless in BOTH axes — anything
// else shows a seam the moment the pillar is taller than one tile.

let hazardTile: CanvasPattern | null = null
let hazardKey = ''

const buildHazardTile = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  // Sized so that ~2.5 stripe bands cross a pillar's width at ANY zoom: the
  // pillar is only `DIVIDER_HALF_W * 2` (0.5) units across, and a stripe period
  // tuned for the road would put a single band on it, which reads as a smear.
  // The 12 px floor is where a diagonal stops surviving the phone's downscale.
  const px = Math.max(12, Math.round(scale * 0.42))
  const key = String(px)
  if (hazardTile && hazardKey === key) return hazardTile
  if (typeof document === 'undefined') return null

  const c = document.createElement('canvas')
  c.width = px
  c.height = px
  const t = c.getContext('2d')
  if (!t) return null

  t.fillStyle = '#16171d'
  t.fillRect(0, 0, px, px)
  t.fillStyle = '#e9b41d'
  const p = px / 2
  for (let i = -1; i <= 2; i++) {
    t.beginPath()
    t.moveTo(i * p, 0)
    t.lineTo(i * p + p * 0.52, 0)
    t.lineTo(i * p + p * 0.52 + px, px)
    t.lineTo(i * p + px, px)
    t.closePath()
    t.fill()
  }

  hazardTile = ctx.createPattern(c, 'repeat')
  hazardKey = key
  return hazardTile
}

// ─── Screen-wide transient grades ───────────────────────────────────────────

let screenFlash = 0
let flashColour = '255,255,255'
/** Rises while survivors are being lost — a red pulse at the frame's edge. */
let hurtPulse = 0
/** Rises on a gate pass, drives the radial speed streaks. */
let rushPulse = 0
/** Rises when a miniboss walks on. Kept SEPARATE from `hurtPulse` because it
 *  means something completely different — "a fight is starting", not "you are
 *  bleeding" — and it is dark and slow where the hurt pulse is bright and fast. */
let elitePulse = 0

/**
 * 0..1 normalised fire rate for the run, recomputed once per frame.
 *
 * The crate detours cost the player lane position and time, so the payoff has
 * to be VISIBLE and not just a number in the HUD: at full rate the muzzles are
 * a third bigger and the tracers are hot white instead of amber. Cached in a
 * module local because it is read once per survivor and once per bullet, and a
 * `.value` read through Vue's reactivity two hundred times a frame is not free.
 */
let rateHeat = 0

// ─── The funnel ─────────────────────────────────────────────────────────────
//
// The simulation squeezes the formation to fit the door it is aimed at as it
// approaches a bank (`funnelRadius` / `FUNNEL_LEAD`). Without a matching read on
// screen that just looks like the crowd shrank — a bug, not a manoeuvre.
//
// Rather than re-deriving the sim's easing here (two implementations of one
// curve is how they drift apart), the renderer MEASURES the formation it was
// handed: the widest live survivor against the width a crowd of that size would
// pack to on its own. The difference is the squeeze, and it is true no matter
// how the sim decides to funnel — including when the crowd is being squashed
// against a rail, which looks and reads exactly the same to the player.

/** Half-width of the live formation, world units. */
let crowdHalfW = 0
/** 0 = running free, 1 = fully compressed. Smoothed, because the dust and the
 *  lean must not flicker when a single survivor on the flank dies. */
let crowdSqueeze = 0

const measureCrowd = (dtMs: number): void => {
  const units = getUnits()
  const natural = crowdRadius()
  let widest = 0
  let n = 0
  for (const u of units) {
    if (u.dying > 0) continue
    n++
    const d = u.x - camX
    const a = d < 0 ? -d : d
    if (a > widest) widest = a
  }
  crowdHalfW = n > 0 ? widest : natural

  // Under about eight bodies the packing radius is smaller than any door in the
  // game, so there is nothing to funnel and any "squeeze" would be noise from
  // the idle wobble.
  const raw = n < 8 || natural <= 0.01
    ? 0
    : Math.max(0, Math.min(1, (natural - crowdHalfW) / (natural * 0.62)))
  // ~120 ms to follow. Fast enough that the compression lands with the approach,
  // slow enough that it never strobes.
  const k = Math.min(1, dtMs / 120)
  crowdSqueeze += (raw - crowdSqueeze) * k
}

// ─── Off-screen miniboss tracking ───────────────────────────────────────────
//
// Collected as a by-product of the foe pass — walking the foe list a second
// time to find out whether an elite is ahead would double the cost of the one
// loop that already runs over everything on the field.

/** Smallest screen-y of any live elite this frame; `viewH * 2` when there is
 *  none. Negative means "above the top edge", i.e. ahead and not yet visible. */
let eliteTopY = 0
/** Screen-x of that elite, so the marker points at the side it will arrive on. */
let eliteMarkX = 0

// ─── Gate dismissal: the bank tearing itself down ───────────────────────────
//
// One bank, one door. The instant the crowd commits to a leaf, every other offer
// in that bank is destroyed — and that instant is when the player's decision
// stops being reversible, so it is the biggest thing on the screen after the
// payoff itself.
//
// The whole teardown lives HERE and not on the `Gate`, keyed off nothing but the
// event payload. That is deliberate: the simulation is free to mark the leaf
// `dismissed` and drop it on the very next tick, and the destruction still plays
// out in full. A visual that needs its subject to stay alive to finish is a
// visual that flickers the day someone tightens the sim's cleanup.
//
// The beats, per leaf:
//
//   ──  wait      the shockwave from the taken leaf is still crossing the lane
//   0    ms       white-out: the frame goes to bare light, the curtain starts
//                 collapsing inward, debris and the sound fire
//   ~130 ms       the rim run finishes and the curtain SNAPS shut — one hot
//                 slit down the middle, then nothing
//   ~90+ ms       the plate splits along a jagged crack and the number falls
//                 apart, the two halves tumbling and draining of colour
//   ~150+ ms      the posts shear and topple outward
//   520  ms       gone
//
// Because the delay is `distance / SHOCK_SPEED`, a three-leaf bank dismisses in
// a visible cascade across the lane instead of all at once — which is the only
// way the player reads it as ONE event radiating from the door they chose,
// rather than two unrelated explosions.

/** World units per second the shockwave crosses the lane at. Tuned so the far
 *  leaf of a three-leaf bank lands ~190 ms after the near one: long enough to
 *  read as a sequence, short enough that the bank is rubble before it scrolls. */
const SHOCK_SPEED = 14
/** Total teardown length. Past this the leaf is off the top of the screen. */
const DISMISS_MS = 520

interface Dismissal {
  active: boolean
  x: number
  y: number
  halfW: number
  op: GateOp
  /** Built once at spawn — never per frame. */
  label: string
  /** ms still to wait for the shockwave. */
  delay: number
  /** Has the arrival burst already fired? A separate flag rather than
   *  `delay <= 0`, so a zero-distance dismissal still gets its one burst
   *  instead of falling straight through into the ageing branch. */
  burst: boolean
  /** ms since the shockwave arrived. */
  age: number
  /** 0..1, from `distance` — how much of the burst this leaf gets. */
  power: number
  /**
   * Nobody got through this bank.
   *
   * The crowd hit a pillar dead on, or was already gone, and the bank resolved
   * to nothing — no gate pass, no payout, no chord. Same geometry, opposite
   * feeling: a normal dismissal is something being taken away from a player who
   * just WON something, and this is a player who won nothing watching all three
   * offers die anyway. So it plays with the light off. No white-hot rim, no
   * bloom, no colour to drain because there was never any warmth in it — the
   * doors simply go out, grey, and fall down. It costs a handful of ternaries
   * and it is the difference between "you chose" and "you blew it".
   */
  bleak: boolean
}

/** Set by the event pre-pass, read by `spawnDismissal` — a property of the BATCH
 *  (did this bank pay anyone?), not of any one leaf in it. */
let batchBleak = false

/** A bank has at most two dismissals; two banks can overlap on screen during a
 *  fast weave. Six slots is headroom nobody will ever spend. */
const dismissals: Dismissal[] = Array.from({ length: 6 }, () => ({
  active: false, x: 0, y: 0, halfW: 0, op: 'add' as GateOp, label: '',
  delay: 0, burst: false, age: 0, power: 1, bleak: false
}))

interface Shock {
  active: boolean
  x: number
  y: number
  age: number
  /** Nobody got through this bank. See `bleak` on `Dismissal`. */
  bleak: boolean
}
const SHOCK_MS = 460
const shocks: Shock[] = Array.from({ length: 3 }, () => ({
  active: false, x: 0, y: 0, age: 0, bleak: false
}))

/**
 * A divider pillar going over.
 *
 * The pillars are the reason a bank is a decision, so they have to leave with
 * the bank they were dividing — and they have to leave ON the same shockwave,
 * or the moment reads as "the doors blew up and then, separately, some posts
 * fell over". Riding the same wave gives a three-leaf bank its full cadence:
 * door, pillar, door, pillar, travelling outward from the one the crowd took.
 *
 * Kept in its own pool rather than on the `Divider` because the sim's pillar is
 * a collision box and this is an animation clock — and because the sim culls the
 * pillar on its own schedule, which this must be able to outlive by a frame
 * without leaving a half-fallen post welded to the road.
 */
const TOPPLE_MS = 620

interface Topple {
  active: boolean
  /** The `Divider.id` this belongs to — an exact match, no position guessing. */
  id: number
  delay: number
  burst: boolean
  age: number
  /** Which way it goes over. Away from the blast, so the bank opens outward. */
  dir: 1 | -1
  bleak: boolean
}

const topples: Topple[] = Array.from({ length: 4 }, () => ({
  active: false, id: -1, delay: 0, burst: false, age: 0, dir: 1 as 1 | -1, bleak: false
}))

const findTopple = (id: number): Topple | null => {
  for (const t of topples) if (t.active && t.id === id) return t
  return null
}

const claimDismissal = (): Dismissal => {
  let oldest = dismissals[0]!
  for (const d of dismissals) {
    if (!d.active) return d
    if (d.age > oldest.age) oldest = d
  }
  return oldest
}

const claimShock = (): Shock => {
  let oldest = shocks[0]!
  for (const s of shocks) {
    if (!s.active) return s
    if (s.age > oldest.age) oldest = s
  }
  return oldest
}

const claimTopple = (): Topple => {
  let oldest = topples[0]!
  for (const t of topples) {
    if (!t.active) return t
    if (t.age > oldest.age) oldest = t
  }
  return oldest
}

/**
 * Debris palettes.
 *
 * Hoisted to module scope because `emit` is called a dozen times per dismissal
 * and a colour literal inside the loop is one throwaway array per particle.
 * `emit` copies the components straight into its typed arrays, so sharing one
 * frozen tuple across every spawn is safe.
 *
 * The colour carries the MEANING of the loss, which is the whole reason the
 * event ships its `op`:
 *
 *   add / mul — the leaf's own bright tint, half the shards already drained to
 *               grey. You gave that up; watch the colour go out of it.
 *   div       — charcoal and embers. You dodged that; it burns.
 *   sub       — scorched timber and a brighter ember. Reads as "you dodged
 *               that" like the trap does, but warmer and less final, because
 *               the bill you refused was survivable and the trap was not.
 */
const DEBRIS: Record<GateOp, {
  shard: [number, number, number]
  cold: [number, number, number]
  spark: [number, number, number]
  smoke: [number, number, number]
}> = {
  add: { shard: [140, 220, 255], cold: [96, 104, 118], spark: [225, 250, 255], smoke: [120, 140, 160] },
  sub: { shard: [92, 62, 34], cold: [52, 40, 30], spark: [255, 186, 90], smoke: [96, 78, 62] },
  mul: { shard: [255, 150, 230], cold: [110, 96, 116], spark: [255, 225, 250], smoke: [140, 120, 150] },
  div: { shard: [58, 44, 42], cold: [36, 30, 30], spark: [255, 150, 60], smoke: [70, 60, 58] }
}

/** Road dust, kicked off the crowd's flanks while it funnels. Shared for the
 *  same reason the debris palettes are. */
const DUST: [number, number, number] = [168, 156, 134]

/** A pillar is steel wrapped in hazard tape, and it comes apart as both. */
const PILLAR_STEEL: [number, number, number] = [148, 152, 164]
const PILLAR_TAPE: [number, number, number] = [214, 168, 32]
const PILLAR_SPARK: [number, number, number] = [255, 240, 190]
const PILLAR_ASH: [number, number, number] = [78, 78, 86]

/**
 * Fixed jitter for the plate's crack.
 *
 * Precomputed for the same reason the boss's fissures are: a crack that
 * re-randomises every frame reads as static, not as a break. Five x-offsets, as
 * a fraction of the plate's width, walked down the split.
 */
const CRACK_JAG = [0.16, -0.13, 0.21, -0.09, 0.14]

/**
 * Turn one `gateDismiss` event into a scheduled teardown.
 *
 * `distance` is the only thing that varies between the leaves of a bank, and it
 * drives all three of the cascade's channels at once: WHEN the leaf goes, how
 * much debris it throws, and how loud it is. One field, three consistent reads.
 */
const spawnDismissal = (
  x: number, y: number, halfW: number, op: GateOp, value: number, distance: number
): void => {
  const d = claimDismissal()
  d.active = true
  d.x = x
  d.y = y
  d.halfW = halfW
  d.op = op
  d.label = op === 'div' ? `÷${value}`
    : op === 'sub' ? `−${value}`
    : op === 'mul' ? `×${value}` : `+${value}`
  // Capped: a bank can never be wider than the lane, and an uncapped delay on a
  // freak layout would leave a leaf still standing after the crowd has run past
  // where it used to be.
  d.delay = Math.min(420, (distance / SHOCK_SPEED) * 1000)
  d.burst = false
  d.age = 0
  d.power = Math.max(0.35, 1 - distance / 8)
  d.bleak = batchBleak
}

/**
 * Is this dismissed leaf still STANDING — waiting for the shockwave to reach it?
 *
 * The hand-off between the live gate and its wreckage, and it is phrased in the
 * positive on purpose. A leaf is marked `dismissed` the instant the bank is
 * claimed, but the wave has not arrived yet, so it must keep drawing as a whole
 * gate — otherwise a three-leaf bank blinks both losers out of existence and
 * then throws debris where they used to be a fifth of a second later.
 *
 * Asking "has it been torn down?" instead would answer NO twice: before the wave
 * arrives, and again after the wreckage has finished and the record has been
 * recycled. The sim keeps a dismissed leaf on the list for ~1.2 s and the
 * teardown is done inside 1 s, so that second NO would resurrect a destroyed
 * gate for the last quarter second of its life. "Standing" is false in both of
 * those cases and true only in the window that actually wants a gate drawn.
 *
 * Matched on position rather than id because the event carries no id: leaves are
 * a third of a lane apart and a record dies in half a second, so there is no
 * position two of them can ever share.
 */
const standing = (x: number, y: number): boolean => {
  for (const d of dismissals) {
    if (!d.active || d.burst) continue
    if (Math.abs(d.x - x) < 0.05 && Math.abs(d.y - y) < 0.05) return true
  }
  return false
}

/** The ring that carries the dismissal outward from the door that was taken. */
const spawnShock = (x: number, y: number, bleak: boolean): void => {
  const s = claimShock()
  s.active = true
  s.x = x
  s.y = y
  s.age = 0
  s.bleak = bleak
}

/** The blast this band is being dismissed by, if one is still travelling. Banks
 *  are metres apart down the lane, so matching on `y` is unambiguous. */
const shockFor = (y: number): Shock | null => {
  for (const s of shocks) {
    if (s.active && Math.abs(s.y - y) < 1.5) return s
  }
  return null
}

/**
 * Put every newly-dismissed pillar on the same shockwave as the leaves.
 *
 * Scanned rather than pushed, because a pillar has no FX event of its own — the
 * sim marks it and the renderer notices. That is the right way round: the flag
 * says "this no longer kills", which is a rule, and when it falls over is a
 * matter of taste that belongs here.
 */
const trackDismissedPillars = (): void => {
  for (const p of getDividers()) {
    if (!p.dismissed || findTopple(p.id)) continue
    const s = shockFor(p.y)
    const originX = s ? s.x : camX
    const dx = p.x - originX
    const t = claimTopple()
    t.active = true
    t.id = p.id
    t.delay = Math.min(420, (Math.abs(dx) / SHOCK_SPEED) * 1000)
    t.burst = false
    t.age = 0
    // Away from the blast. A pillar knocked over by a wave that came from the
    // left goes over to the right, which also happens to open the bank outward
    // and leave the lane the crowd is running down clear.
    t.dir = dx < 0 ? -1 : 1
    t.bleak = s ? s.bleak : false
  }
}

/**
 * Advance both pools, and fire each leaf's arrival burst the moment its wait
 * runs out.
 *
 * Stepped BEFORE `stepParticles` (see `drawScene`) so a burst spawned on this
 * frame is integrated once before it is first drawn — the same rule the event
 * drain follows, and for the same reason: a burst that appears one frame late
 * reads as input lag on the one moment the player is watching hardest.
 */
const stepDismissals = (dtMs: number): void => {
  for (const s of shocks) {
    if (!s.active) continue
    s.age += dtMs
    if (s.age >= SHOCK_MS) s.active = false
  }
  // Before the pillars are stepped, so one marked this frame is already on the
  // wave that is still expanding rather than on the next one.
  trackDismissedPillars()
  for (const t of topples) {
    if (!t.active) continue
    if (!t.burst) {
      t.delay -= dtMs
      if (t.delay > 0) continue
      t.age = -t.delay
      t.delay = 0
      t.burst = true
      burstPillar(t)
      continue
    }
    t.age += dtMs
    if (t.age >= TOPPLE_MS) t.active = false
  }
  for (const d of dismissals) {
    if (!d.active) continue
    if (!d.burst) {
      d.delay -= dtMs
      if (d.delay > 0) continue
      // Carry the overshoot into the age so the cascade's spacing survives a
      // long frame instead of being quantised to the frame rate.
      d.age = -d.delay
      d.delay = 0
      d.burst = true
      burstDismissal(d)
      continue
    }
    d.age += dtMs
    if (d.age >= DISMISS_MS) d.active = false
  }
}

/**
 * A pillar shearing off the road, spawned once, as the wave reaches it.
 *
 * Deliberately SILENT. A three-leaf bank has two leaves and two pillars going
 * over inside 400 ms, and giving each of the four its own cue would turn the
 * single most important moment in the game into a pile-up. The pillars ride the
 * leaves' cue — which is already a metallic destruction sound, and was written
 * wide enough to cover them.
 */
const burstPillar = (t: Topple): void => {
  let p: Divider | null = null
  for (const d of getDividers()) {
    if (d.id === t.id) { p = d; break }
  }
  if (!p) return

  const q = quality.value
  const chips = q === 'low' ? 4 : q === 'medium' ? 8 : 12
  const base = p.y - DIVIDER_H * 0.45

  // Sheared bolts: bright, low, and thrown along the road at the base — the one
  // place the eye is looking, because that is where the thing broke.
  for (let i = 0; i < (q === 'low' ? 4 : 9); i++) {
    emit({
      x: p.x, y: base,
      vx: t.dir * (2 + Math.random() * 9), vy: (Math.random() - 0.25) * 5,
      life: 200 + Math.random() * 180, size: 0.07 + Math.random() * 0.05,
      color: t.bleak ? PILLAR_ASH : PILLAR_SPARK,
      additive: !t.bleak, shape: 2, drag: 2.8, gravity: 7
    })
  }
  // Steel and torn hazard tape, tumbling the way the pillar goes.
  for (let i = 0; i < chips; i++) {
    const a = Math.random() * Math.PI * 2
    emit({
      x: p.x + (Math.random() - 0.5) * 0.4, y: p.y + (Math.random() - 0.5) * DIVIDER_H,
      vx: Math.cos(a) * 2 + t.dir * (2 + Math.random() * 5),
      vy: Math.sin(a) * 3 + 2,
      life: 460 + Math.random() * 320, size: 0.1 + Math.random() * 0.06,
      color: i % 3 === 0 ? PILLAR_TAPE : PILLAR_STEEL,
      shape: 1, gravity: 13, drag: 0.8,
      rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 15
    })
  }
}

/** The physical debris, spawned once, at the instant the leaf is hit. */
const burstDismissal = (d: Dismissal): void => {
  // Quiet enough to sit under the gate-pass chord that is firing at the same
  // instant, and scaled by distance so the cascade recedes across the lane.
  playFx('gateDismiss', d.power)

  const q = quality.value
  const tone = DEBRIS[d.op]
  const shards = q === 'low' ? 4 : q === 'medium' ? 8 : 13
  const sparks = q === 'low' ? 5 : q === 'medium' ? 9 : 15
  const bad = d.op === 'div'

  // Plate shrapnel: thrown outward and slightly UP, then dropped. Half of it in
  // the leaf's own colour, half already grey — the colour visibly going out of
  // the offer as it falls. A bleak bank never had any colour in it to lose, so
  // all of it comes off cold.
  for (let i = 0; i < shards; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 2.5 + Math.random() * 7
    emit({
      x: d.x + (Math.random() - 0.5) * d.halfW,
      y: d.y + (Math.random() - 0.5) * 0.7,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 + 2.2,
      life: 420 + Math.random() * 300, size: 0.1 + Math.random() * 0.07,
      color: d.bleak || i % 2 === 1 ? tone.cold : tone.shard,
      shape: 1, gravity: 12, drag: 0.9,
      rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 14
    })
  }

  // Sparks rake SIDEWAYS off the leaf's own two frame posts, never straight up:
  // the direction is what says they came off something vertical and hard. The
  // bank's PILLARS get their own teardown (`burstPillar`) — these are the gate
  // frame, not the divider.
  for (let i = 0; i < sparks; i++) {
    const side = i % 2 === 0 ? -1 : 1
    emit({
      x: d.x + side * d.halfW, y: d.y + (Math.random() - 0.5) * 1.2,
      vx: side * (3 + Math.random() * 9), vy: (Math.random() - 0.4) * 6,
      life: 190 + Math.random() * 200, size: 0.08 + Math.random() * 0.05,
      color: d.bleak ? PILLAR_ASH : tone.spark,
      additive: !d.bleak, shape: 2, drag: 2.6, gravity: bad ? 3 : 6
    })
  }

  if (q !== 'low') {
    for (let i = 0; i < (q === 'high' ? 4 : 2); i++) {
      emit({
        x: d.x + (Math.random() - 0.5) * d.halfW * 1.4, y: d.y,
        vx: (Math.random() - 0.5) * 2.4, vy: 0.8 + Math.random() * 1.4,
        life: 620 + Math.random() * 300, size: 0.42, color: tone.smoke,
        shape: 3, alpha: 0.42, drag: 1.5
      })
    }
  }

  // A scorch where the door used to be, so the lane behind the crowd carries a
  // record of what they walked past. High tier only — the decal ring is small
  // and the combat already wants most of it. A bank nobody got through leaves
  // the darkest mark of the three: it is the only one that cost the player
  // everything and gave back nothing.
  if (q === 'high') emitDecal(d.x, d.y, d.halfW * 0.8, d.bleak ? 0.55 : bad ? 0.42 : 0.26)
}

// ─── Entry point ────────────────────────────────────────────────────────────

let primed = false

export const drawScene = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dtMs: number,
  _dpr: number
): void => {
  viewW = w
  viewH = h
  sampleFrame(dtMs)

  // The camera, latched once for the whole frame — every projection below reads
  // these instead of rebuilding the anchor object per call.
  const a = anchor()
  camX = a.x
  camY = a.y
  measureCrowd(dtMs)

  if (!primed) {
    primed = true
    primeSurvivors()
    primeMonsterSprites(allFoeDesigns())
  }

  // Events → particles, sound and shake. Drained BEFORE stepping the pools so a
  // burst spawned this frame is already integrated once when it is first drawn
  // (otherwise every burst appears one frame late, which reads as input lag).
  consumeFx()
  stepDismissals(dtMs)
  stepParticles(dtMs)
  stepTexts(dtMs)
  stepDecals(dtMs)

  screenFlash = Math.max(0, screenFlash - dtMs / 320)
  hurtPulse = Math.max(0, hurtPulse - dtMs / 700)
  rushPulse = Math.max(0, rushPulse - dtMs / 900)
  elitePulse = Math.max(0, elitePulse - dtMs / 1100)

  // One reactive read per frame, not one per survivor. The span is measured
  // from the run's BASE rate so a fresh run reads as zero heat and the first
  // rate crate is immediately visible.
  const span = Math.max(0.001, MAX_FIRE_RATE - BASE_FIRE_RATE)
  rateHeat = Math.max(0, Math.min(1, (runFireRate.value - BASE_FIRE_RATE) / span))

  drawBackdrop(ctx, w, h)
  drawLane(ctx, w, h)
  drawDecals(ctx)
  drawPickups(ctx)
  drawCrates(ctx)
  drawBarricades(ctx)
  // Shock ring → live leaves → the leaves being torn down → the pillars. The
  // ring is flat on the road and the wreckage must never sit over a pillar.
  drawShocks(ctx)
  drawGates(ctx)
  drawDismissals(ctx)
  drawDividers(ctx)
  drawFoes(ctx)
  drawBossBody(ctx)
  drawUnits(ctx)
  // The elite's wind-up again, over the bodies — the ground pass under them is
  // buried by a full-size crowd, and the crowd is exactly what it aims at. See
  // `drawEliteTelegraphs`.
  drawEliteTelegraphs(ctx, true)
  drawBullets(ctx)
  drawParticles(ctx, worldToScreenX, worldToScreenY, scale)
  drawFloatingText(ctx)
  drawEliteMarker(ctx, w)
  drawGrades(ctx, w, h)
}

// ─── Layer 1–3: backdrop ────────────────────────────────────────────────────

const drawBackdrop = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  const bd = buildBackdrop()
  if (!bd) {
    ctx.fillStyle = '#1b2a4a'
    ctx.fillRect(0, 0, w, h)
    return
  }
  // Parallax: the backdrop creeps upward at a fraction of the crowd's speed and
  // wraps, so the horizon never actually arrives.
  const drift = (camY * scale * 0.09) % (bd.height - h)
  ctx.drawImage(bd, 0, -(bd.height - h) + drift, w, bd.height)
}

// ─── Layer 4: the lane ──────────────────────────────────────────────────────

const drawLane = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  const left = worldToScreenX(-LANE_HALF)
  const right = worldToScreenX(LANE_HALF)
  const laneW = right - left

  // Off-lane terrain: darker than the road so the playable strip reads as the
  // only place anything can happen. On a wide screen this is most of the
  // picture, so it gets its own gradient rather than a flat fill.
  const off = ctx.createLinearGradient(0, 0, 0, h)
  off.addColorStop(0, 'rgba(10,10,16,0.4)')
  off.addColorStop(1, 'rgba(6,6,10,0.76)')
  ctx.fillStyle = off
  ctx.fillRect(0, 0, left, h)
  ctx.fillRect(right, 0, w - right, h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(left, 0, laneW, h)
  ctx.clip()

  ctx.fillStyle = LANE_TONE.base
  ctx.fillRect(left, 0, laneW, h)

  const pattern = buildLaneTile(ctx)
  if (pattern) {
    // Scroll the pattern with the camera. Translating the context (rather than
    // the pattern's own matrix) keeps this working on every browser we ship to.
    const offset = ((camY * scale) % laneTilePx + laneTilePx) % laneTilePx
    ctx.save()
    ctx.translate(0, offset)
    ctx.fillStyle = pattern
    ctx.fillRect(left, -laneTilePx, laneW, h + laneTilePx * 2)
    ctx.restore()
  }

  // Depth: the far end of the lane fades into the haze so the road reads as
  // going somewhere rather than being a treadmill.
  const fade = ctx.createLinearGradient(0, 0, 0, h * 0.55)
  fade.addColorStop(0, 'rgba(0,0,0,0.38)')
  fade.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = fade
  ctx.fillRect(left, 0, laneW, h * 0.55)

  // Rungs every 2 world units: the entire sensation of SPEED comes from these.
  const top = camY + (viewH * CROWD_SCREEN_Y) / scale
  const bottom = camY - (viewH * (1 - CROWD_SCREEN_Y)) / scale
  ctx.strokeStyle = LANE_TONE.line
  ctx.lineWidth = Math.max(1, scale * 0.03)
  ctx.beginPath()
  for (let y = Math.floor(bottom / 2) * 2; y < top + 2; y += 2) {
    const sy = worldToScreenY(y)
    ctx.moveTo(left, sy)
    ctx.lineTo(right, sy)
  }
  ctx.stroke()

  // Centre dashes.
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = Math.max(1.5, scale * 0.05)
  ctx.setLineDash([scale * 0.9, scale * 0.9])
  ctx.lineDashOffset = -(camY * scale) % (scale * 1.8)
  ctx.beginPath()
  ctx.moveTo(worldToScreenX(0), 0)
  ctx.lineTo(worldToScreenX(0), h)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()

  // Rails. Bright, warm and always on screen — they are the player's only
  // absolute reference for where the edges are.
  for (const x of [-LANE_HALF, LANE_HALF]) {
    const sx = worldToScreenX(x)
    const grad = ctx.createLinearGradient(sx - scale * 0.1, 0, sx + scale * 0.1, 0)
    grad.addColorStop(0, LANE_TONE.dark)
    grad.addColorStop(0.5, LANE_TONE.railLit)
    grad.addColorStop(1, LANE_TONE.rail)
    ctx.fillStyle = grad
    ctx.fillRect(sx - scale * 0.09, 0, scale * 0.18, h)
  }
  // Posts, spaced on the rung rhythm, to give the rails depth.
  const top2 = camY + (viewH * CROWD_SCREEN_Y) / scale
  const bottom2 = camY - (viewH * (1 - CROWD_SCREEN_Y)) / scale
  ctx.fillStyle = 'rgba(20,22,30,0.85)'
  for (let y = Math.floor(bottom2 / 4) * 4; y < top2 + 4; y += 4) {
    const sy = worldToScreenY(y)
    for (const x of [-LANE_HALF, LANE_HALF]) {
      const sx = worldToScreenX(x)
      ctx.fillRect(sx - scale * 0.16, sy - scale * 0.28, scale * 0.32, scale * 0.56)
    }
  }
}

const drawDecals = (ctx: CanvasRenderingContext2D): void => {
  const decals = getDecals()
  if (decals.length === 0) return
  for (const d of decals) {
    const a = Math.min(1, d.life / d.maxLife) * d.dark
    if (a <= 0.01) continue
    const sx = worldToScreenX(d.x)
    const sy = worldToScreenY(d.y)
    const r = d.r * scale
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
    g.addColorStop(0, `rgba(12,10,14,${a})`)
    g.addColorStop(1, 'rgba(12,10,14,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(sx, sy, r, r * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ─── Layer 6: pickups, crates, barricades, gates ────────────────────────────

const drawPickups = (ctx: CanvasRenderingContext2D): void => {
  for (const p of getPickups()) {
    if (p.taken) continue
    const sx = worldToScreenX(p.x)
    const sy = worldToScreenY(p.y)
    if (sy < -40 || sy > viewH + 40) continue
    // Spin by squashing the ellipse — cheaper than a rotation and it reads as
    // a coin turning rather than a disc rolling.
    const spin = Math.abs(Math.cos(p.phase))
    const r = scale * 0.22
    const bob = Math.sin(p.phase * 0.6) * scale * 0.06

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const glow = ctx.createRadialGradient(sx, sy + bob, 0, sx, sy + bob, r * 2.6)
    glow.addColorStop(0, 'rgba(255,210,90,0.5)')
    glow.addColorStop(1, 'rgba(255,180,40,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(sx, sy + bob, r * 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    const art = propImage('coin')
    if (art) {
      // The bitmap spins by being squashed on X, exactly like the drawn one, so
      // dropping real art in never changes the animation.
      const w = Math.max(1, r * 2 * spin)
      ctx.drawImage(art, sx - w / 2, sy + bob - r, w, r * 2)
    } else {
      const g = ctx.createLinearGradient(sx, sy - r, sx, sy + r)
      g.addColorStop(0, '#ffe066')
      g.addColorStop(0.55, '#e0a81c')
      g.addColorStop(1, '#8a6410')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(sx, sy + bob, Math.max(1, r * spin), r, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(60,40,4,0.7)'
      ctx.lineWidth = Math.max(1, r * 0.18)
      ctx.stroke()
    }
  }
}

const drawCrates = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  for (const c of getCrates()) {
    if (c.dead) continue
    const sx = worldToScreenX(c.x)
    const sy = worldToScreenY(c.y)
    if (sy < -60 || sy > viewH + 60) continue
    const r = CRATE_R * scale
    const hurt = 1 - c.hp / c.maxHp
    const tone = CRATE_TONE[c.kind]
    const rate = c.kind === 'rate'
    // The pulse RATE is the second channel of the read: the rate crate throbs
    // roughly twice as fast as the damage crate, so even a colour-blind player
    // sorts the two out of the corner of their eye.
    const pulse = 0.5 + 0.5 * Math.sin(t / tone.pulseMs)

    // Halo, so a crate never hides against the road.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.3)
    glow.addColorStop(0, `rgba(${tone.glow},${0.16 + pulse * (rate ? 0.22 : 0.16)})`)
    glow.addColorStop(1, tone.halo)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(sx, sy, r * 2.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(Math.sin(c.spin) * 0.05)

    // Body: the shipped crate bitmap when it has decoded, otherwise planks with
    // iron corners, shaded from the shared key light.
    const art = propImage('crate')
    if (art) {
      ctx.drawImage(art, -r, -r, r * 2, r * 2)
    } else {
      const body = ctx.createLinearGradient(-r, -r, r * 0.4, r)
      body.addColorStop(0, '#c08b48')
      body.addColorStop(0.5, '#8d5f2c')
      body.addColorStop(1, '#5c3c18')
      ctx.fillStyle = body
      roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.18)
      ctx.fill()

      ctx.strokeStyle = 'rgba(40,24,10,0.75)'
      ctx.lineWidth = Math.max(1.4, r * 0.11)
      roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.18)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-r, -r * 0.25)
      ctx.lineTo(r, -r * 0.25)
      ctx.moveTo(-r, r * 0.35)
      ctx.lineTo(r, r * 0.35)
      ctx.lineWidth = Math.max(1, r * 0.07)
      ctx.stroke()
    }

    // Cracks as it takes damage — the only feedback that says "keep shooting".
    // Drawn OVER the bitmap too, so a dropped-in crate still shows its wear.
    if (hurt > 0.25) {
      ctx.strokeStyle = `rgba(20,10,4,${0.4 + hurt * 0.5})`
      ctx.lineWidth = Math.max(1, r * 0.08)
      ctx.beginPath()
      ctx.moveTo(-r * 0.6, -r * 0.7)
      ctx.lineTo(-r * 0.1, 0)
      ctx.lineTo(-r * 0.45, r * 0.5)
      if (hurt > 0.6) {
        ctx.moveTo(r * 0.55, -r * 0.5)
        ctx.lineTo(r * 0.1, r * 0.2)
      }
      ctx.stroke()
    }

    // A rim in the crate's own colour, OVER the body. The shipped crate bitmap
    // is the same brown box for both kinds, so without this the drop-in art
    // would erase the entire distinction the moment it decodes.
    ctx.strokeStyle = tone.rim
    ctx.lineWidth = Math.max(1.6, r * 0.13)
    ctx.globalAlpha = 0.55 + pulse * 0.45
    roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.18)
    ctx.stroke()
    ctx.globalAlpha = 1

    // The badge. It has to be legible at 30 px, so it is a shape and never a
    // word — an up-chevron for "everyone hits harder", a bolt for "everyone
    // shoots faster". Two silhouettes that share no outline at any size.
    ctx.fillStyle = tone.badge
    ctx.strokeStyle = tone.ink
    ctx.lineWidth = Math.max(1, r * 0.09)
    ctx.beginPath()
    if (rate) {
      ctx.moveTo(r * 0.30, -r * 0.60)
      ctx.lineTo(-r * 0.34, r * 0.06)
      ctx.lineTo(-r * 0.02, r * 0.06)
      ctx.lineTo(-r * 0.26, r * 0.62)
      ctx.lineTo(r * 0.36, -r * 0.08)
      ctx.lineTo(r * 0.04, -r * 0.08)
    } else {
      ctx.moveTo(0, -r * 0.55)
      ctx.lineTo(r * 0.42, -r * 0.02)
      ctx.lineTo(r * 0.16, -r * 0.02)
      ctx.lineTo(r * 0.16, r * 0.55)
      ctx.lineTo(-r * 0.16, r * 0.55)
      ctx.lineTo(-r * 0.16, -r * 0.02)
      ctx.lineTo(-r * 0.42, -r * 0.02)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }
}

const drawBarricades = (ctx: CanvasRenderingContext2D): void => {
  for (const b of getBarricades()) {
    if (b.dead) continue
    const sx = worldToScreenX(b.x)
    const sy = worldToScreenY(b.y)
    if (sy < -80 || sy > viewH + 80) continue
    const w = b.w * scale
    const h = BARRICADE_H * scale
    const hp01 = Math.max(0, b.hp / b.maxHp)

    ctx.save()
    ctx.translate(sx, sy)

    // Cast shadow, so the block sits ON the road.
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(0, h * 0.45, w * 0.52, h * 0.16, 0, 0, Math.PI * 2)
    ctx.fill()

    const art = propImage('barricade')
    if (art) {
      // Tiled across the block's width so a 1:1 stone bitmap does not stretch
      // into a smear on a three-unit-wide block.
      const tile = h
      ctx.save()
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.14)
      ctx.clip()
      for (let x = -w / 2; x < w / 2; x += tile) {
        ctx.drawImage(art, x, -h / 2, Math.min(tile, w / 2 - x), h)
      }
      ctx.restore()
    } else {
      const body = ctx.createLinearGradient(-w / 2, -h / 2, w * 0.2, h / 2)
      body.addColorStop(0, '#767e88')
      body.addColorStop(0.5, '#4a5058')
      body.addColorStop(1, '#2a2f36')
      ctx.fillStyle = body
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.14)
      ctx.fill()
    }

    // Hazard chevrons on the face, dimming as the block loses HP.
    ctx.save()
    roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.14)
    ctx.clip()
    ctx.globalAlpha = 0.35 + hp01 * 0.3
    ctx.fillStyle = '#e0a020'
    const step = h * 0.55
    for (let i = -w; i < w; i += step * 2) {
      ctx.beginPath()
      ctx.moveTo(i, h / 2)
      ctx.lineTo(i + step, -h / 2)
      ctx.lineTo(i + step * 1.7, -h / 2)
      ctx.lineTo(i + step * 0.7, h / 2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    // Damage bar along the top edge: the number tells you how much is left, the
    // bar tells you at a glance whether you are winning the exchange.
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(-w / 2, -h / 2 - h * 0.2, w, h * 0.14)
    ctx.fillStyle = hp01 > 0.5 ? '#7ee08a' : hp01 > 0.22 ? '#ffcf3c' : '#ff6a5a'
    ctx.fillRect(-w / 2, -h / 2 - h * 0.2, w * hp01, h * 0.14)

    ctx.strokeStyle = 'rgba(12,14,20,0.85)'
    ctx.lineWidth = Math.max(1.5, h * 0.07)
    roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.14)
    ctx.stroke()

    // The HP number, which is what the reference art puts front and centre.
    const label = formatCount(Math.ceil(b.hp))
    ctx.font = `900 ${Math.max(10, h * 0.5)}px Angry, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, h * 0.13)
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.strokeText(label, 0, h * 0.04)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, 0, h * 0.04)

    if (b.flash > 0) {
      ctx.globalAlpha = b.flash * 0.5
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.14)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
}

/**
 * Gates — the thing the player is actually looking at.
 *
 * Each leaf is a doorway sized by its OWN `halfW`, because a three-leaf bank
 * packs narrower leaves than a two-leaf one and a fixed width would draw a
 * frame the crowd does not actually fit through.
 *
 * `add` and `mul` are invitations: a lit curtain with chevrons flowing DOWN the
 * screen, toward the player, pulling the eye through the opening. `div` is the
 * exact inverse — the chevrons climb AWAY, the frame is broken instead of lit,
 * and the whole thing is red and dirty where the others are bright and clean.
 * Reversed flow is the cheapest "do not enter" signal there is: it works at any
 * size, at any distance, and in peripheral vision, where hue alone does not.
 *
 * Only `add` leaves carry a charge meter. A meter on a leaf that cannot be
 * pumped is a lie about the controls, and the player will spend a second of
 * fire finding that out.
 */
/**
 * How wide the number plate has to be, and how big its glyphs go.
 *
 * This used to be `halfW * 0.95` with a flat floor, which was fine while every
 * leaf was 2.05 wide. A three-leaf bank packs leaves at 1.33 — barely half that
 * — and the plate went with it while the FONT did not, so a `×12` on a narrow
 * leaf hung off both ends of its own plate on a 320 px phone.
 *
 * So the plate is sized from the GLYPHS first and the frame second. The number
 * is the only thing on a gate the player actually reads; the frame around it is
 * decoration, and decoration does not get to set the type size. Only when the
 * text cannot fit inside the doorway at all does the font give way — a plate
 * wider than its own opening reads as a sign hung in front of the gate rather
 * than as part of it.
 *
 * Leaves `ctx.font` set to the size it returned, so the caller can draw
 * immediately without a second string build.
 */
const measurePlate = (
  ctx: CanvasRenderingContext2D, label: string, halfPx: number, plateH: number
): { w: number; font: number } => {
  let font = Math.max(11, plateH * 0.72)
  ctx.font = `900 ${font}px Angry, sans-serif`
  const need = ctx.measureText(label).width + font * 0.8
  const maxW = Math.max(scale * 0.9, halfPx * 1.92)
  if (need > maxW) {
    font = Math.max(9, font * (maxW / need))
    ctx.font = `900 ${font}px Angry, sans-serif`
  }
  return { w: Math.min(maxW, Math.max(need, scale * 1.05, halfPx * 0.95)), font }
}

const drawGates = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  for (const g of getGates()) {
    if (g.used) continue
    // A dismissed leaf is still STANDING until the shockwave gets to it — that
    // wait is the cascade — so it keeps drawing until its own teardown takes
    // over. From that frame on it belongs to `drawDismissals` for good: the sim
    // holds the leaf on this list for another second so its wreckage has
    // something to be culled with, and it must not come back during it.
    if (g.dismissed && !standing(g.x, g.y)) continue
    const sy = worldToScreenY(g.y)
    if (sy < -120 || sy > viewH + 120) continue
    const cx = worldToScreenX(g.x)
    const halfW = g.halfW * scale
    const height = scale * 1.5
    const hot = g.hotFor < 0.4
    const mul = g.op === 'mul'
    const bad = g.op === 'div'
    // Both hostile ops get the trap's unlit curtain and crooked plate: whatever
    // else separates them, the first thing the player has to read is 'this door
    // takes something', and that read is carried by lighting and tilt long
    // before the glyph is legible.
    const hostile = g.op === 'div' || g.op === 'sub'
    const tint = GATE_TINT[g.op]
    const pop = g.pop

    ctx.save()
    ctx.translate(cx, sy)

    // Curtain. A hostile leaf's is muddier and flatter — a lit doorway reads as
    // an opening no matter what colour it is, so neither the trap nor the bill
    // may be lit. Their cores differ: soot for the trap, scorched earth for the
    // bill, which is the second-glance difference once 'both are bad' has
    // landed.
    const curtain = ctx.createLinearGradient(0, -height / 2, 0, height / 2)
    if (hostile) {
      curtain.addColorStop(0, `rgba(${tint.glow},0.30)`)
      curtain.addColorStop(0.5, bad ? 'rgba(40,10,8,0.42)' : 'rgba(46,26,6,0.42)')
      curtain.addColorStop(1, `rgba(${tint.glow},0.26)`)
    } else {
      curtain.addColorStop(0, `rgba(${tint.glow},${hot ? 0.34 : 0.2})`)
      curtain.addColorStop(0.5, `rgba(${tint.glow},${hot ? 0.16 : 0.08})`)
      curtain.addColorStop(1, `rgba(${tint.glow},${hot ? 0.3 : 0.18})`)
    }
    ctx.fillStyle = curtain
    ctx.fillRect(-halfW, -height / 2, halfW * 2, height)

    // Chevrons. `dir` flips both the arrowhead AND the scroll direction, so the
    // trap's flow is unmistakably the wrong way round even when the two gates
    // are the same size and the player is looking at the other one.
    const dir = hostile ? -1 : 1
    ctx.save()
    ctx.beginPath()
    ctx.rect(-halfW, -height / 2, halfW * 2, height)
    ctx.clip()
    ctx.globalAlpha = hostile ? 0.46 : hot ? 0.5 : 0.28
    ctx.strokeStyle = tint.a
    ctx.lineWidth = Math.max(1.5, scale * 0.045)
    const flow = ((t / 420) % 1) * height * 0.5 * dir
    for (let i = -2; i < 4; i++) {
      const y = -height / 2 + i * height * 0.5 + flow
      ctx.beginPath()
      ctx.moveTo(-halfW * 0.8, y - height * 0.12 * dir)
      ctx.lineTo(0, y + height * 0.1 * dir)
      ctx.lineTo(halfW * 0.8, y - height * 0.12 * dir)
      ctx.stroke()
    }
    // Two dark bars across the trap's opening. They cost four line ops and they
    // make the leaf read as BARRED rather than merely red.
    if (bad) {
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = '#1a0c0a'
      ctx.lineWidth = Math.max(2, scale * 0.07)
      for (const bx of [-halfW * 0.42, halfW * 0.42]) {
        ctx.beginPath()
        ctx.moveTo(bx, -height / 2)
        ctx.lineTo(bx, height / 2)
        ctx.stroke()
      }
    }
    ctx.restore()

    // Posts.
    for (const side of [-1, 1] as const) {
      const px = side * halfW
      const grad = ctx.createLinearGradient(px - scale * 0.1, 0, px + scale * 0.1, 0)
      grad.addColorStop(0, '#20242e')
      grad.addColorStop(0.45, tint.a)
      grad.addColorStop(1, tint.b)
      ctx.fillStyle = grad
      ctx.fillRect(px - scale * 0.09, -height / 2 - scale * 0.12, scale * 0.18, height + scale * 0.24)

      if (bad) {
        // A chunk blown out of the top of the post and a snapped stub above the
        // gap. A broken frame is a thing that has already failed somebody.
        ctx.fillStyle = 'rgba(8,6,8,0.95)'
        ctx.beginPath()
        ctx.moveTo(px - scale * 0.1, -height / 2 + scale * 0.1)
        ctx.lineTo(px + scale * 0.1, -height / 2 - scale * 0.02)
        ctx.lineTo(px + scale * 0.1, -height / 2 - scale * 0.14)
        ctx.lineTo(px - scale * 0.1, -height / 2 - scale * 0.14)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#3a1a14'
        ctx.fillRect(px - side * scale * 0.03, -height / 2 - scale * 0.3, scale * 0.06, scale * 0.16)
      } else if (hot) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const spark = ctx.createRadialGradient(px, 0, 0, px, 0, scale * 0.7)
        spark.addColorStop(0, `rgba(${tint.glow},0.55)`)
        spark.addColorStop(1, `rgba(${tint.glow},0)`)
        ctx.fillStyle = spark
        ctx.beginPath()
        ctx.arc(px, 0, scale * 0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // Plate + number. The plate scales on `pop`, which is set on every tick —
    // a number that jumps is the difference between "it changed" and "I DID
    // that". The trap's plate is tilted off true: nothing else on screen is
    // crooked, so the tilt alone flags it before the glyph is readable.
    const s = 1 + pop * 0.28
    const label = bad ? `÷${g.value}` : g.op === 'sub' ? `−${g.value}` : mul ? `×${g.value}` : `+${g.value}`
    const plateH = height * 0.52
    // Measured OUTSIDE the pop scale, so the punch magnifies a plate that was
    // already the right size rather than changing how the number is laid out
    // sixty times a second.
    const metrics = measurePlate(ctx, label, halfW, plateH)
    const plateW = metrics.w

    ctx.save()
    ctx.scale(s, s)
    // Both hostile plates hang crooked, and they lean OPPOSITE ways — in a
    // dilemma bank the two doors are then distinguishable by silhouette alone,
    // before either number is readable.
    if (hostile) ctx.rotate(bad ? -0.07 : 0.07)
    const plate = ctx.createLinearGradient(0, -plateH / 2, 0, plateH / 2)
    plate.addColorStop(0, tint.plateA)
    plate.addColorStop(1, tint.plateB)
    ctx.fillStyle = plate
    roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
    ctx.fill()
    ctx.lineWidth = Math.max(2, scale * 0.055)
    ctx.strokeStyle = hostile ? (bad ? 'rgba(30,6,4,0.95)' : 'rgba(36,18,4,0.95)') : 'rgba(10,14,24,0.9)'
    roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
    ctx.stroke()

    // `measurePlate` already left the font set to the size it chose.
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2.5, metrics.font * 0.2)
    ctx.strokeStyle = 'rgba(8,10,18,0.92)'
    ctx.strokeText(label, 0, plateH * 0.06)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, 0, plateH * 0.06)
    ctx.restore()

    // Charge meter under the plate: how far through the current half-second the
    // crowd's fire has got. Without it, pumping feels like a slot machine. `add`
    // only — see the header. Pinned to the PLATE's width, not to the frame's, so
    // it stays welded to the number it is filling on a narrow leaf.
    if (g.op === 'add' && (hot || g.charge > 0)) {
      const barW = plateW * 1.02
      const frac = Math.max(0, Math.min(1, g.charge / 500))
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(-barW / 2, plateH * 0.72, barW, scale * 0.1)
      ctx.fillStyle = tint.a
      ctx.fillRect(-barW / 2, plateH * 0.72, barW * frac, scale * 0.1)
    }

    ctx.restore()
  }
}

/**
 * The shockwave, expanding from the door the crowd actually took.
 *
 * Drawn UNDER the leaves, flat on the road and squashed hard on Y, because it is
 * travelling across the lane and not toward the camera. It is the connective
 * tissue of the whole moment: without it two leaves simply pop at different
 * times, and with it they are visibly being knocked down by the same blast.
 */
const drawShocks = (ctx: CanvasRenderingContext2D): void => {
  for (const s of shocks) {
    if (!s.active) continue
    const sy = worldToScreenY(s.y)
    if (sy < -200 || sy > viewH + 200) continue
    const sx = worldToScreenX(s.x)
    const k = s.age / SHOCK_MS
    const r = (SHOCK_SPEED * s.age) / 1000 * scale
    if (r <= 1) continue
    // Squared falloff: bright and hard for the first sixth of its life, a ghost
    // for the rest. A ring that fades linearly reads as a smoke ring.
    const a = (1 - k) * (1 - k)

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    // A blast that paid somebody is white-blue and hard. One that paid nobody is
    // a dull red bruise travelling the same path — same event, no light in it.
    ctx.strokeStyle = s.bleak
      ? `rgba(190,84,70,${a * 0.5})`
      : `rgba(215,240,255,${a * 0.75})`
    ctx.lineWidth = Math.max(1.5, scale * 0.16 * (1 - k))
    ctx.beginPath()
    ctx.ellipse(sx, sy, r, r * 0.3, 0, 0, Math.PI * 2)
    ctx.stroke()
    // A second ring lagging behind the first gives the blast a THICKNESS, which
    // is the difference between a shockwave and an outline.
    if (quality.value === 'high' && !s.bleak && r > scale * 0.6) {
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.3})`
      ctx.lineWidth = Math.max(1, scale * 0.07 * (1 - k))
      ctx.beginPath()
      ctx.ellipse(sx, sy, r * 0.72, r * 0.72 * 0.3, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/**
 * The leaves the player did not take, coming apart.
 *
 * Drawn over the gate band and UNDER the divider pillars — the pillars are the
 * only lethal thing in the band, and a lethal thing occluded by debris is a bug
 * no matter how good the debris looks.
 *
 * Everything here is local to the leaf: no screen shake, no full-screen flash.
 * That is a hard rule, not a budget compromise. This fires on EVERY bank, in the
 * same 200 ms as the gate-pass payoff, and a game that punches the camera twice
 * for one decision teaches the player to stop reading either punch. The
 * dismissal gets brightness, motion and its own sound; the camera belongs to the
 * reward.
 */
const drawDismissals = (ctx: CanvasRenderingContext2D): void => {
  for (const d of dismissals) {
    if (!d.active) continue
    const sy = worldToScreenY(d.y)
    if (sy < -180 || sy > viewH + 180) continue
    const sx = worldToScreenX(d.x)
    const halfW = d.halfW * scale
    const height = scale * 1.5
    const tint = GATE_TINT[d.op]
    const bad = d.op === 'div'
    const age = d.age
    // The single switch the whole bleak variant hangs off. Every hot channel
    // below multiplies through it, so "nobody got through" is literally the
    // lights not coming on rather than a second copy of the effect.
    const lit = d.bleak ? 0 : 1

    // ── Still waiting: the frame lights up as the wave closes ──
    //
    // The last 130 ms before impact, drawn OVER the leaf that is still standing
    // there. It costs two fills and it is what turns a delay into a countdown:
    // the player sees the far door is next before it goes, which is the whole
    // point of staging the cascade rather than firing it all at once.
    if (!d.burst) {
      if (d.delay < 130) {
        const k = 1 - d.delay / 130
        ctx.save()
        ctx.translate(sx, sy)
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = k * k * (d.bleak ? 0.35 : 0.8)
        ctx.fillStyle = d.bleak ? 'rgba(150,70,58,0.9)' : `rgba(${tint.glow},0.9)`
        for (const side of [-1, 1] as const) {
          ctx.fillRect(side * halfW - scale * 0.1, -height / 2 - scale * 0.12, scale * 0.2, height + scale * 0.24)
        }
        ctx.restore()
      }
      continue
    }

    ctx.save()
    ctx.translate(sx, sy)

    // ── 0–120 ms: the ground goes white under the door ──
    // A bloom rather than a flash: it is bright, it is bounded by the leaf, and
    // it never touches the number the player is reading two doors over.
    if (age < 120) {
      const k = 1 - age / 120
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, halfW * 1.6)
      bloom.addColorStop(0, `rgba(255,255,255,${k * 0.5 * lit})`)
      bloom.addColorStop(0.45, `rgba(${tint.glow},${k * 0.34 * lit})`)
      bloom.addColorStop(1, `rgba(${tint.glow},0)`)
      ctx.fillStyle = bloom
      ctx.beginPath()
      ctx.ellipse(0, 0, halfW * 1.6, height * 0.85, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // ── 0–140 ms: the curtain collapses INWARD and snaps ──
    // The live gate's curtain flows to invite the crowd through. Running it in
    // reverse — sucked to the centre line and pinched out — is the cheapest way
    // to say "this opening is closing" that survives being 40 px wide.
    if (age < 140) {
      const k = 1 - age / 140
      const w = halfW * k
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.3 + (1 - k) * 0.45
      const curtain = ctx.createLinearGradient(-w, 0, w, 0)
      // The bright core is what makes a normal collapse read as ENERGY being
      // pinched out. A bleak one has no core: the curtain just closes, dark.
      const core = d.bleak ? 'rgba(120,60,52,0.5)' : 'rgba(255,255,255,0.85)'
      curtain.addColorStop(0, `rgba(${tint.glow},0.15)`)
      curtain.addColorStop(0.5, core)
      curtain.addColorStop(1, `rgba(${tint.glow},0.15)`)
      ctx.fillStyle = curtain
      ctx.fillRect(-w, -height / 2, w * 2, height)
      ctx.restore()
    }

    // ── 100–210 ms: the snap ──
    // One hot slit where the curtain used to be, gone almost before it is seen.
    // This is the frame the eye actually remembers the door dying on.
    if (age > 100 && age < 210 && !d.bleak) {
      const k = 1 - (age - 100) / 110
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = k
      ctx.fillStyle = '#ffffff'
      const w = Math.max(1.5, scale * 0.1 * k)
      ctx.fillRect(-w / 2, -height / 2 - scale * 0.1, w, height + scale * 0.2)
      ctx.restore()
    }

    // ── 0–150 ms: a rim of white-hot light races down the frame ──
    // A band travelling the height of the leaf, brightest where it crosses the
    // two posts. Metal going up before it lets go — and, being a moving edge, it
    // reads at a glance even when the leaf is 40 px wide at the top of a phone.
    if (age < 150) {
      const run = age / 150
      const y = -height / 2 + run * height * 1.12
      const band = height * 0.17
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = (1 - run) * (d.bleak ? 0.3 : 0.85)
      ctx.fillStyle = d.bleak ? 'rgba(140,66,56,0.7)' : `rgba(${tint.glow},0.8)`
      ctx.fillRect(-halfW, y - band / 2, halfW * 2, band)
      // The core, on the metal itself.
      ctx.fillStyle = d.bleak ? 'rgba(120,110,108,0.6)' : 'rgba(255,255,245,0.95)'
      for (const side of [-1, 1] as const) {
        ctx.fillRect(side * halfW - scale * 0.11, y - band * 0.75, scale * 0.22, band * 1.5)
      }
      ctx.restore()
    }

    // ── 0–450 ms: the posts whiten, shear and topple outward ──
    const fallStart = 150
    const postFall = age <= fallStart ? 0 : Math.min(1, (age - fallStart) / 300)
    const heat = Math.max(0, 1 - age / 200) * lit
    // Everything on the leaf fades out on the same tail, so nothing is still on
    // screen at full strength on the frame the record is recycled.
    const out = 1 - Math.max(0, (age - 250) / 270)
    for (const side of [-1, 1] as const) {
      ctx.save()
      // Rotated about the BASE, so the post shears at the road and goes over —
      // the way a post falls. Rotating about the centre reads as a spinning prop.
      ctx.translate(side * halfW, height / 2)
      ctx.rotate(side * postFall * 1.15)
      ctx.globalAlpha = out * (1 - postFall * 0.45)
      // Charcoal underneath, the leaf's own colour burning off the top of it.
      ctx.fillStyle = bad ? '#2a1512' : d.op === 'sub' ? '#2c1d0c' : '#20242e'
      ctx.fillRect(-scale * 0.09, -height - scale * 0.12, scale * 0.18, height + scale * 0.24)
      if (heat > 0.01) {
        ctx.globalAlpha = heat * (1 - postFall * 0.5)
        ctx.fillStyle = heat > 0.55 ? '#fffaf0' : tint.a
        ctx.fillRect(-scale * 0.09, -height - scale * 0.12, scale * 0.18, height + scale * 0.24)
      }
      ctx.restore()
    }

    // ── The plate cracks and the number falls apart ──
    //
    // Not a fade and not a shrink: the plate SPLITS on a fixed jagged crack and
    // the two halves tumble away carrying half a glyph each. It is the one beat
    // that makes the offer read as destroyed rather than merely switched off,
    // and it is worth every op it costs because it is the only part of the
    // dismissal the player's eye is actually pointed at — they were reading that
    // number a quarter of a second ago.
    //
    // It is drawn from the FIRST frame, not from the crack: the two halves sit
    // perfectly on top of each other while `fall` is zero, so the plate is
    // simply itself until it breaks. Skipping the early frames left a hole where
    // the number used to be — the leaf blinked, and a blink is what the whole
    // teardown exists to avoid.
    {
      const plateH = height * 0.52
      const metrics = measurePlate(ctx, d.label, halfW, plateH)
      const plateW = metrics.w
      const fall = Math.max(0, Math.min(1, (age - 90) / 380))
      // Linear sideways, quadratic down: the halves are thrown apart and then
      // gravity takes them, which is what a broken thing does.
      const drop = fall * fall * height * 1.7
      const alpha = out
      if (alpha > 0.01) {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineJoin = 'round'

        for (const side of [-1, 1] as const) {
          ctx.save()
          ctx.translate(side * fall * plateW * 0.5, drop)
          ctx.rotate(side * fall * (side < 0 ? 0.95 : 0.8))

          // Clip to this side of the crack. The box is deliberately oversized so
          // the plate's own outline is clipped by the CRACK and not by the box.
          ctx.beginPath()
          ctx.moveTo(side * plateW, -plateH)
          const jag0 = (CRACK_JAG[0] ?? 0) * plateW
          ctx.lineTo(jag0, -plateH)
          for (let i = 0; i < CRACK_JAG.length; i++) {
            ctx.lineTo(
              (CRACK_JAG[i] ?? 0) * plateW,
              -plateH / 2 + (i / (CRACK_JAG.length - 1)) * plateH
            )
          }
          const jagN = (CRACK_JAG[CRACK_JAG.length - 1] ?? 0) * plateW
          ctx.lineTo(jagN, plateH)
          ctx.lineTo(side * plateW, plateH)
          ctx.closePath()
          ctx.clip()

          const plate = ctx.createLinearGradient(0, -plateH / 2, 0, plateH / 2)
          plate.addColorStop(0, tint.plateA)
          plate.addColorStop(1, tint.plateB)
          ctx.fillStyle = plate
          roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
          ctx.fill()
          ctx.lineWidth = Math.max(2, scale * 0.055)
          ctx.strokeStyle = bad ? 'rgba(30,6,4,0.95)' : d.op === 'sub' ? 'rgba(36,18,4,0.95)' : 'rgba(10,14,24,0.9)'
          roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
          ctx.stroke()

          ctx.font = `900 ${metrics.font}px Angry, sans-serif`
          ctx.lineWidth = Math.max(2.5, metrics.font * 0.2)
          ctx.strokeStyle = 'rgba(8,10,18,0.92)'
          ctx.strokeText(d.label, 0, plateH * 0.06)
          ctx.fillStyle = '#ffffff'
          ctx.fillText(d.label, 0, plateH * 0.06)

          // The colour going out of it — charcoal for a trap that is burning,
          // dead grey for an offer that was given up. Same geometry, opposite
          // feeling, and it costs one fill.
          // A bleak plate starts most of the way drained: there was no moment
          // where this number was worth anything, so it never looks like there
          // was one.
          const drain = d.bleak ? Math.max(0.62, fall) : fall
          if (drain > 0.02) {
            ctx.fillStyle = bad
              ? `rgba(18,12,12,${drain * 0.75})`
              : `rgba(84,88,98,${drain * 0.6})`
            roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
            ctx.fill()
          }

          // The blast washing over the plate. Half-strength on purpose: the
          // number has to stay READABLE while it breaks, because watching a
          // recognisable `×3` come apart is the whole point and a white rectangle
          // coming apart is not.
          if (heat > 0.01) {
            ctx.fillStyle = `rgba(255,253,245,${heat * 0.5})`
            roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
            ctx.fill()
          }

          // The fracture itself, dark on the broken edge. Clipped to this half,
          // so each piece carries its own torn edge — and held back for the first
          // 55 ms, so the plate is whole right up until the moment it is not.
          if (age > 55) {
            ctx.strokeStyle = 'rgba(6,8,14,0.9)'
            ctx.lineWidth = Math.max(1.5, scale * 0.05)
            ctx.beginPath()
            for (let i = 0; i < CRACK_JAG.length; i++) {
              const jx = (CRACK_JAG[i] ?? 0) * plateW
              const jy = -plateH / 2 + (i / (CRACK_JAG.length - 1)) * plateH
              if (i === 0) ctx.moveTo(jx, jy)
              else ctx.lineTo(jx, jy)
            }
            ctx.stroke()

            // White-hot along the break for the first instant, so the crack
            // reads as something that was FORCED rather than as a pre-drawn seam.
            if (heat > 0.01) {
              ctx.globalAlpha = alpha * heat
              ctx.strokeStyle = 'rgba(255,250,235,0.95)'
              ctx.lineWidth = Math.max(1, scale * 0.03)
              ctx.stroke()
              ctx.globalAlpha = alpha
            }
          }
          ctx.restore()
        }
        ctx.restore()
      }
    }

    ctx.restore()
  }
}

/**
 * Divider pillars — the single most important new read on the screen.
 *
 * A gate bank only asks the player a question if taking both answers is
 * impossible, and this pillar is what makes it impossible. So it is drawn as a
 * physical object rather than as an effect: it casts a shadow, it has a lit
 * edge and a shaded one, it is wrapped in the yellow/black diagonal that every
 * human already reads as "this will hurt you", and it carries a beacon on top
 * that is visible long before the stripes resolve.
 *
 * Two things it deliberately is NOT:
 *
 *   • transparent — the gate curtains behind it are pretty and it is not, and
 *     the player must never mistake it for more curtain;
 *   • drawn narrower than its hitbox — the on-screen width is floored at the
 *     canonical `DIVIDER_HALF_W` so that erring only ever makes the player give
 *     it MORE room than it needs. A pillar drawn thinner than it kills would be
 *     the single most unfair thing in the game.
 */
/**
 * How much lane a pillar has to itself: the gap to the nearest other pillar of
 * the SAME bank, or the whole lane when it stands alone.
 *
 * O(pillars²), which is fine because a bank has at most two of them and at most
 * two banks are ever on screen — and it beats caching, because the divider list
 * is streamed in and out by the sim and a stale cache here would size a warning
 * glow from a bank that has already scrolled past.
 */
const bankSpacing = (dividers: Divider[], d: Divider): number => {
  let best = LANE_HALF * 2
  for (const o of dividers) {
    if (o === d || o.bankId !== d.bankId) continue
    const gap = Math.abs(o.x - d.x)
    if (gap > 0.01 && gap < best) best = gap
  }
  return best
}

const drawDividers = (ctx: CanvasRenderingContext2D): void => {
  const dividers = getDividers()
  if (dividers.length === 0) return
  const t = nowMs()
  // The radius the SIMULATION is using, not the one the bodies happen to be at.
  //
  // This is the one place in the renderer where agreeing with the sim beats
  // looking right: the warning is a promise about what will kill the crowd, and
  // a promise measured off a spring that is still catching up is a promise that
  // is wrong for a few frames in exactly the moment it matters. The measured
  // half-width (`crowdHalfW`) is better for the funnel's LOOK and is used there;
  // this is the collision test's own number.
  const cr = formationRadius()
  const pattern = buildHazardTile(ctx)

  for (const d of dividers) {
    const sy = worldToScreenY(d.y)
    if (sy < -160 || sy > viewH + 160) continue
    const sx = worldToScreenX(d.x)
    const halfPx = Math.max(d.halfW, DIVIDER_HALF_W) * scale
    const h = DIVIDER_H * scale

    // ── A pillar whose bank has been claimed ──
    //
    // It has stopped killing, so every warning channel goes off with it. This is
    // not decoration: leaving a hazard read on a harmless object is how a player
    // learns to distrust the hazard read, and the pillar warning is the most
    // load-bearing signal on the screen. It stands until the shockwave arrives —
    // the same wave the leaves ride, so the bank comes down as one cadence —
    // and then it shears at the base and goes over AWAY from the blast.
    //
    // No record at all means the teardown has already finished and the sim is
    // simply holding the pillar until the crowd is past. Nothing to draw.
    let fall = 0
    let dir: 1 | -1 = 1
    let fade = 1
    let doomed = false
    let pending = 0
    if (d.dismissed) {
      const tp = findTopple(d.id)
      if (!tp) continue
      doomed = true
      dir = tp.dir
      if (tp.burst) {
        fall = Math.min(1, tp.age / 420)
        fade = 1 - Math.max(0, (tp.age - 300) / 320)
        if (fade <= 0.01) continue
      } else {
        pending = tp.delay
      }
    }
    // How much room this pillar has to shout into, world units. A two-leaf bank
    // has a whole half-lane on each side; a three-leaf bank has two pillars
    // 3.16 apart, and a footprint sized for the two-leaf case would light the
    // ENTIRE middle door red — telling the player the safest place on the board
    // is lethal. `spacing` is the distance to the nearest pillar sharing this
    // bank, and the glow is sized from it. See `bankSpacing`.
    const spacing = bankSpacing(dividers, d)

    // How loud the warning is. Two independent terms, multiplied:
    //   • how close the crowd's EDGE is (not its centre — a 200-strong crowd is
    //     nearly two units wide, and a centre-only test lights up long after
    //     the flank has already been shaved off);
    //   • how badly the crowd is AIMED at it, measured against the widest the
    //     crowd could be here — the door's own half-spacing on a tight bank, so
    //     a centred crowd reads as centred rather than as cornered.
    const dy = (d.y - camY) * CROWD_SQUASH
    const dx = d.x - camX
    const gap = Math.max(0, Math.hypot(dx, dy) - cr)
    const reach = Math.min(CROWD_MAX_R, spacing * 0.5) + d.halfW
    const aim = 1 - Math.min(1, Math.abs(dx) / reach)
    const warn = doomed ? 0 : Math.max(0, 1 - gap / DIVIDER_WARN) * (0.4 + aim * 0.6)
    // Beats faster the closer it gets. A constant blink is wallpaper; an
    // accelerating one is a countdown.
    const beat = 0.5 + 0.5 * Math.sin(t / (70 + (1 - warn) * 260))

    ctx.save()
    ctx.translate(sx, sy)

    // Cast shadow, offset down-right from the shared key light. This is what
    // makes the pillar sit ON the road instead of floating over the curtain.
    // It stays on the ROAD while the pillar goes over — a shadow that rotates
    // with the body it belongs to stops being a shadow.
    ctx.globalAlpha = fade
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.ellipse(
      halfPx * 0.5 + dir * fall * h * 0.5, h * 0.5,
      halfPx * 1.9 + fall * h * 0.4, h * 0.17, 0, 0, Math.PI * 2
    )
    ctx.fill()

    if (fall > 0) {
      // Sheared at the base and rotated about it, past horizontal, with a slight
      // sink so it settles into the road rather than resting on it. Eased out:
      // the first third of the arc is the slowest, which is what gives a falling
      // post its weight.
      const arc = 1 - (1 - fall) * (1 - fall)
      ctx.translate(0, h * 0.5)
      ctx.rotate(dir * arc * 1.62)
      ctx.translate(0, -h * 0.5 + arc * h * 0.06)
    }

    // Warning glow on the ground. Additive and wider than the pillar, so the
    // danger has a footprint the player can steer around rather than a hairline
    // they have to thread — but never so wide that it swallows the door beside
    // it. Capped at 28 % of the gap to the next pillar, which leaves the middle
    // of every door visibly dark no matter how many leaves the bank has. The
    // dark centre IS the instruction.
    if (warn > 0.02) {
      const glowR = Math.min(halfPx * 6, spacing * 0.28 * scale)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR)
      // Two pillars stack their glows additively over the lane between them, so
      // a tight bank dims each one and arrives at the same total heat.
      const solo = spacing > CROWD_MAX_R * 3 ? 1 : 0.7
      wg.addColorStop(0, `rgba(255,60,40,${(0.16 + warn * beat * 0.3) * solo})`)
      wg.addColorStop(1, 'rgba(255,40,20,0)')
      ctx.fillStyle = wg
      ctx.beginPath()
      ctx.ellipse(0, 0, glowR, h * 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Body. Solid, opaque, dark metal — the base coat under the stripes so a
    // missing pattern (no `document`, e.g. in a test) still draws a real pillar.
    ctx.fillStyle = '#1b1c22'
    ctx.fillRect(-halfPx, -h / 2, halfPx * 2, h)

    if (pattern) {
      // The pattern lives in the CONTEXT's space, and the context is translated
      // to the pillar — so the stripes are pinned to the pillar and do not swim
      // across it as the camera scrolls.
      ctx.fillStyle = pattern
      ctx.fillRect(-halfPx, -h / 2, halfPx * 2, h)
    }

    // Cylinder shading in two flat rects instead of a gradient: same read, one
    // fewer allocation per pillar per frame.
    ctx.fillStyle = 'rgba(0,0,0,0.42)'
    ctx.fillRect(halfPx * 0.15, -h / 2, halfPx * 0.85, h)
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.fillRect(-halfPx, -h / 2, halfPx * 0.4, h)

    // Hard rim light down the lit edge. One bright line does more for "this is
    // a solid object" than any amount of gradient.
    ctx.fillStyle = 'rgba(255,246,220,0.75)'
    ctx.fillRect(-halfPx, -h / 2, Math.max(1.5, halfPx * 0.16), h)

    // Steel caps top and bottom, and a hard outline. The caps stop the stripes
    // from bleeding into the road at the ends.
    ctx.fillStyle = '#4a4d58'
    ctx.fillRect(-halfPx * 1.25, -h / 2 - h * 0.1, halfPx * 2.5, h * 0.13)
    ctx.fillRect(-halfPx * 1.25, h / 2 - h * 0.03, halfPx * 2.5, h * 0.13)
    ctx.strokeStyle = 'rgba(6,6,9,0.95)'
    ctx.lineWidth = Math.max(1.5, scale * 0.045)
    ctx.strokeRect(-halfPx, -h / 2, halfPx * 2, h)

    // Hot overlay while the crowd is closing. Red ON the pillar, not just
    // around it, so the object itself is what is shouting.
    if (warn > 0.02) {
      ctx.globalAlpha = warn * beat * 0.5
      ctx.fillStyle = '#ff3a22'
      ctx.fillRect(-halfPx, -h / 2, halfPx * 2, h)
      ctx.globalAlpha = 1
    }

    // ── The wave arriving ──
    //
    // The same 130 ms tell the leaves get, on the pillar that is next. It is
    // drawn on the metal rather than around it, so the object the player has
    // spent the last second avoiding is visibly the thing being hit.
    if (doomed && pending > 0) {
      if (pending < 130) {
        const k = 1 - pending / 130
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = k * k * 0.9
        ctx.fillStyle = 'rgba(255,246,225,0.9)'
        ctx.fillRect(-halfPx, -h / 2, halfPx * 2, h)
        ctx.restore()
      }
    } else if (doomed) {
      // Going over: hot at the shear line for the first instant, then charcoal
      // spreading up the body. A pillar that merely rotated would read as a prop
      // on a hinge — it has to visibly STOP being a working object.
      const sheared = Math.min(1, fall * 2.4)
      ctx.fillStyle = `rgba(22,18,20,${sheared * 0.55})`
      ctx.fillRect(-halfPx, -h / 2, halfPx * 2, h)
      if (fall < 0.35) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = fade * (1 - fall / 0.35)
        ctx.fillStyle = 'rgba(255,214,150,0.9)'
        ctx.fillRect(-halfPx * 1.1, h / 2 - h * 0.12, halfPx * 2.2, h * 0.14)
        ctx.restore()
      }
    }

    // Beacon. A pillar is ~14 px wide on a 320 px phone and its stripes do not
    // resolve at the top of the screen — but a blinking light does, and it is
    // the part that arrives in the player's eye first.
    // Amber when it is merely there, red when the crowd is closing — the lamp
    // carries the same state as the body, for the frames where the body is too
    // far up the screen to have any pixels worth reading. Channels are rounded
    // because some engines still reject a fractional `rgba()` component.
    //
    // It goes OUT the moment the bank is claimed. The lamp is the pillar's
    // promise that it will kill you, and the pillar has stopped killing — a
    // beacon still blinking over a harmless post is the renderer lying about the
    // one rule the player is steering by.
    if (!doomed) {
      const lamp = 0.45 + beat * 0.55
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const lg = ctx.createRadialGradient(0, -h * 0.62, 0, 0, -h * 0.62, halfPx * 3)
      lg.addColorStop(0, `rgba(255,${Math.round(120 - warn * 70)},60,${0.35 + lamp * 0.4})`)
      lg.addColorStop(1, 'rgba(255,80,20,0)')
      ctx.fillStyle = lg
      ctx.beginPath()
      ctx.arc(0, -h * 0.62, halfPx * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = `rgba(255,${Math.round(200 - warn * 120)},120,${0.5 + lamp * 0.5})`
      ctx.beginPath()
      ctx.arc(0, -h * 0.62, Math.max(1.6, halfPx * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ─── Layer 7: foes and the boss ─────────────────────────────────────────────

/**
 * The miniboss's wind-up, drawn on the road it is about to clear.
 *
 * NOT the boss's shape, on purpose. The boss aims at a patch of ground and the
 * ring says "not here"; the elite's arc crosses the whole lane and there is no
 * "not here" to say. So it is drawn as what it is: a band spanning the road
 * from the elite's feet back `ELITE_SWEEP_REACH` — the exact distance the kill
 * is measured against — with a bright edge travelling across it in the
 * direction the arc will swing. Nothing about it suggests a gap to stand in,
 * because there is not one, and a telegraph that implied one would teach a
 * dodge that gets the squad killed.
 *
 * It has 0.3 s to be understood, which is why it is a filled band and not an
 * outline: at this length the read has to be pre-attentive.
 *
 * Drawn UNDER every body, in its own pass, for the same reason the boss's is —
 * a telegraph a monster can stand on top of is not a telegraph — and then a
 * SECOND time over the crowd with `overCrowd`. The ground pass alone is
 * invisible in the only situation the attack exists for: measured in the
 * browser at stage 4, a pinned crowd is 1.65 units of packed bodies sitting
 * exactly where the warning is drawn. The overlay is the same band at the same
 * coordinates and the same reach, outline-only, so it reads as the band showing
 * through the crowd rather than as a second, larger threat.
 */
const drawEliteTelegraphs = (ctx: CanvasRenderingContext2D, overCrowd = false): void => {
  for (const f of getFoes()) {
    if (!f.elite || f.dead || f.sweepCd > ELITE_TELEGRAPH) continue
    const k = 1 - Math.max(0, f.sweepCd) / ELITE_TELEGRAPH
    const yNear = worldToScreenY(f.y)
    const yFar = worldToScreenY(f.y - ELITE_SWEEP_REACH)
    const xL = worldToScreenX(-LANE_HALF)
    const xR = worldToScreenX(LANE_HALF)
    // Where the leading edge has swung to. `sweepDir` is chosen when the
    // wind-up starts, so this travels the same way the arc will.
    const edge = f.sweepDir > 0 ? xL + (xR - xL) * k : xR - (xR - xL) * k
    ctx.save()
    if (overCrowd) {
      ctx.globalAlpha = 0.16 + k * 0.34
      ctx.strokeStyle = '#ff8a14'
      ctx.lineWidth = Math.max(1.5, scale * 0.05)
      ctx.beginPath()
      ctx.moveTo(xL, yNear)
      ctx.lineTo(xR, yNear)
      ctx.moveTo(xL, yFar)
      ctx.lineTo(xR, yFar)
      ctx.stroke()
      // The travelling edge, over the bodies it is about to take.
      ctx.globalAlpha = 0.3 + k * 0.5
      ctx.lineWidth = Math.max(2, scale * 0.075)
      ctx.beginPath()
      ctx.moveTo(edge, yNear)
      ctx.lineTo(edge, yFar)
      ctx.stroke()
      ctx.restore()
      continue
    }
    ctx.globalAlpha = 0.1 + k * 0.22
    ctx.fillStyle = '#ff9430'
    ctx.fillRect(xL, yNear, xR - xL, yFar - yNear)
    ctx.globalAlpha = 0.28 + k * 0.4
    ctx.strokeStyle = '#ffa63c'
    ctx.lineWidth = Math.max(2, scale * 0.06)
    ctx.beginPath()
    ctx.moveTo(xL, yFar)
    ctx.lineTo(xR, yFar)
    ctx.stroke()
    // The edge itself: one bright line crossing the road. This is the whole
    // message — "it is coming, from that side, now".
    ctx.globalAlpha = 0.35 + k * 0.5
    ctx.lineWidth = Math.max(2.5, scale * 0.09)
    ctx.beginPath()
    ctx.moveTo(edge, yNear)
    ctx.lineTo(edge, yFar)
    ctx.stroke()
    ctx.restore()
  }
}

const drawFoes = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  eliteTopY = viewH * 2
  eliteMarkX = viewW / 2
  drawEliteTelegraphs(ctx)
  for (const f of getFoes()) {
    if (f.dead) continue
    const sy = worldToScreenY(f.y)
    const sx = worldToScreenX(f.x)
    // Recorded BEFORE the cull, because the whole point of the marker is the
    // elite that is off the top of the screen and therefore never drawn.
    if (f.elite && sy < eliteTopY) {
      eliteTopY = sy
      eliteMarkX = sx
    }
    if (sy < -100 || sy > viewH + 100) continue
    const size = f.scale * scale * 1.25

    ctx.save()
    ctx.translate(sx, sy)

    // Contact shadow / hover shadow. A miniboss gets a darker, wider one — mass
    // is read from the shadow before it is read from the sprite.
    ctx.fillStyle = f.elite ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.32)'
    ctx.beginPath()
    ctx.ellipse(
      0, f.flying ? size * 0.5 : size * 0.06,
      size * (f.elite ? 0.38 : 0.3), size * (f.elite ? 0.12 : 0.09),
      0, 0, Math.PI * 2
    )
    ctx.fill()

    if (f.flying) ctx.translate(0, -Math.abs(Math.sin(t / 260 + f.swayPhase)) * size * 0.18)

    const frame = monsterFrame(f.design, (t / 620 + f.phase) % 1)
    if (frame) {
      const px = frame.width
      const k = (size * 1.5) / SPRITE_HEIGHT
      const dw = px * k
      const dh = px * k
      // Foes walk DOWN the screen at us; the designs are authored facing left
      // or right, so mirror the side-facing ones to keep the cast coherent.
      const mirror = monsterFaces(f.design) === 'left' ? -1 : 1
      ctx.save()
      ctx.scale(mirror, 1)
      ctx.drawImage(frame, -dw / 2, -SPRITE_FOOT * k, dw, dh)
      ctx.restore()

      if (f.flash > 0.02) {
        // Hit flash: re-blit the frame as a white silhouette. Cheap, and it is
        // the single most important piece of feedback in the game after the
        // gate number.
        ctx.save()
        ctx.globalAlpha = Math.min(1, f.flash) * 0.85
        ctx.globalCompositeOperation = 'lighter'
        ctx.scale(mirror, 1)
        ctx.drawImage(frame, -dw / 2, -SPRITE_FOOT * k, dw, dh)
        ctx.restore()
      }
    } else {
      // Fallback while the strip bakes.
      ctx.fillStyle = f.flash > 0.02 ? '#ffffff' : '#8d3238'
      ctx.beginPath()
      ctx.ellipse(0, -size * 0.35, size * 0.3, size * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // A slim HP bar, only once the foe has actually been hit — an untouched
    // pack should read as bodies, not as a spreadsheet.
    //
    // Minibosses break that rule on purpose: they are a FIGHT, and a fight the
    // player cannot see the length of is a fight they will disengage from. The
    // bar is up from the first frame, wider, and framed so it does not read as
    // "a normal foe that happens to be hurt".
    if (f.elite || f.hp < f.maxHp) {
      const bw = size * (f.elite ? 0.86 : 0.6)
      const bh = size * (f.elite ? 0.1 : 0.07)
      const by = -size * 0.98
      const hp01 = Math.max(0, f.hp / f.maxHp)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(-bw / 2, by, bw, bh)
      ctx.fillStyle = f.elite
        ? (hp01 > 0.45 ? '#ffb03c' : '#ff5a4a')
        : (hp01 > 0.45 ? '#8ce07a' : '#ff6a5a')
      ctx.fillRect(-bw / 2, by, bw * hp01, bh)

      if (f.elite) {
        ctx.strokeStyle = 'rgba(255,220,150,0.9)'
        ctx.lineWidth = Math.max(1, size * 0.018)
        ctx.strokeRect(-bw / 2, by, bw, bh)

        // Crown over the bar. Three points and a base: the universal "this one
        // is the important one" mark, drawn small enough that a pack with one
        // elite in it still reads as a pack.
        const cw = size * 0.3
        const ch = size * 0.17
        const cy = by - size * 0.06
        ctx.fillStyle = '#ffd24a'
        ctx.strokeStyle = 'rgba(60,34,4,0.9)'
        ctx.lineWidth = Math.max(1, size * 0.016)
        ctx.beginPath()
        ctx.moveTo(-cw / 2, cy)
        ctx.lineTo(-cw / 2, cy - ch)
        ctx.lineTo(-cw / 6, cy - ch * 0.42)
        ctx.lineTo(0, cy - ch * 1.15)
        ctx.lineTo(cw / 6, cy - ch * 0.42)
        ctx.lineTo(cw / 2, cy - ch)
        ctx.lineTo(cw / 2, cy)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

/**
 * The off-screen miniboss marker.
 *
 * Elites walk on at the top of the lane and can be a full screen ahead when the
 * HUD announces them. Without this the announcement has nothing to point at,
 * and the player spends the approach looking for something that is not there
 * yet. A chevron pinned to the top edge at the elite's own lane position turns
 * that dead time into a lane choice.
 *
 * Drawn in SCREEN space, under the HUD's top inset, and only when there really
 * is an elite above the top edge — a marker for something already visible is
 * clutter.
 */
const drawEliteMarker = (ctx: CanvasRenderingContext2D, w: number): void => {
  if (!eliteAlive.value || eliteTopY > 0) return
  const t = nowMs()
  const beat = 0.5 + 0.5 * Math.sin(t / 210)
  // Clamped in from the edges so the chevron is never half off-screen on a
  // lane-edge spawn, and never under a rounded display corner.
  const x = Math.max(34, Math.min(w - 34, eliteMarkX))
  const y = topInsetPx + 26
  const s = Math.max(13, scale * 0.42)

  // One outer save for the whole marker: it sets line joins and caps that the
  // rest of the frame does not want inherited.
  ctx.save()

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.6)
  g.addColorStop(0, `rgba(255,150,50,${0.2 + beat * 0.28})`)
  g.addColorStop(1, 'rgba(255,90,20,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, s * 2.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Two stacked chevrons pointing up the lane, bobbing on the beat.
  const bob = beat * s * 0.16
  ctx.strokeStyle = '#ffd24a'
  ctx.lineWidth = Math.max(2.5, s * 0.26)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (let i = 0; i < 2; i++) {
    const cy = y + i * s * 0.62 - bob
    ctx.beginPath()
    ctx.moveTo(x - s * 0.62, cy + s * 0.34)
    ctx.lineTo(x, cy - s * 0.2)
    ctx.lineTo(x + s * 0.62, cy + s * 0.34)
    ctx.stroke()
  }
  // The same crown as sits over the elite itself, so the marker and the thing
  // it points at are obviously the same object.
  ctx.fillStyle = '#ffd24a'
  ctx.strokeStyle = 'rgba(60,34,4,0.9)'
  ctx.lineWidth = Math.max(1, s * 0.1)
  const cw = s * 0.9
  const ch = s * 0.5
  const cy = y + s * 1.55
  ctx.beginPath()
  ctx.moveTo(x - cw / 2, cy)
  ctx.lineTo(x - cw / 2, cy - ch)
  ctx.lineTo(x - cw / 6, cy - ch * 0.42)
  ctx.lineTo(x, cy - ch * 1.15)
  ctx.lineTo(x + cw / 6, cy - ch * 0.42)
  ctx.lineTo(x + cw / 2, cy - ch)
  ctx.lineTo(x + cw / 2, cy)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

const drawBossBody = (ctx: CanvasRenderingContext2D): void => {
  const b = getBoss()
  if (!b) return
  const t = nowMs()
  const sx = worldToScreenX(b.x)
  const sy = worldToScreenY(b.y)
  const size = b.scale * scale * 1.3
  const dying = b.dead ? Math.min(1, b.dying / 900) : 0

  // Slam telegraph: a ring that closes on the ground the boss is about to hit.
  //
  // It reads `slamX` / `slamY` and NOT the boss's own position, because the
  // boss aims at where the crowd is standing — telegraphing under the boss
  // would train the player to dodge the wrong thing, which is worse than no
  // telegraph at all. Drawn UNDER everything else, and generous: 0.6 s of it —
  // deliberately a hair SHORTER than the sim's latch window, so the ring can
  // never spend a frame pointing at the PREVIOUS slam's coordinates.
  if (!b.dead && b.slamCd < 0.6) {
    const k = 1 - b.slamCd / 0.6
    const rx = worldToScreenX(b.slamX)
    const ry = worldToScreenY(b.slamY)
    // Tracks the slam that is actually coming: the boss's reach GROWS with
    // every swing it has thrown (see `SLAM_RADIUS_GROWTH`), and a telegraph
    // that stayed the same size while the hit got bigger would be a lie the
    // player only discovers by dying to it. Still drawn a little wider than the
    // kill radius — a dodge that was visually clean has to be clean.
    const raging = b.slams > 0 || b.guard > 0
    const r = Math.min(SLAM_RADIUS_MAX, SLAM_RADIUS + b.slams * SLAM_RADIUS_GROWTH)
      * scale * 1.28
    ctx.save()
    ctx.globalAlpha = 0.25 + k * 0.4
    ctx.strokeStyle = raging ? '#ff3a2a' : '#ff5a4a'
    ctx.lineWidth = Math.max(2, scale * 0.09)
    ctx.beginPath()
    ctx.ellipse(rx, ry, r, r * 0.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.16 + k * 0.24
    ctx.fillStyle = '#ff5a4a'
    ctx.beginPath()
    ctx.ellipse(rx, ry, r * k, r * k * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Ground cracks at the last third of the wind-up. The ring alone says
    // "something is coming"; the floor splitting says "and it is coming HERE,
    // now" — which is the beat the player actually needs to commit to a dodge.
    if (k > 0.7) {
      const crack = (k - 0.7) / 0.3
      ctx.globalAlpha = crack * 0.85
      ctx.strokeStyle = '#20120f'
      ctx.lineWidth = Math.max(1.5, scale * 0.06 * (0.4 + crack))
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i < CRACK_ANGLE.length; i++) {
        const ang = CRACK_ANGLE[i] ?? 0
        const reach = (CRACK_REACH[i] ?? 1) * r * crack
        const bend = CRACK_BEND[i] ?? 0
        const cos = Math.cos(ang)
        const sin = Math.sin(ang) * 0.5
        // Two segments with a fixed kink: a straight line is a spoke, a kinked
        // one is a fissure, and the kink costs one extra `lineTo`.
        const mx = rx + cos * reach * 0.55 - sin * bend * r * 0.3
        const my = ry + sin * reach * 0.55 + cos * bend * r * 0.15
        ctx.moveTo(rx, ry)
        ctx.lineTo(mx, my)
        ctx.lineTo(rx + cos * reach, ry + sin * reach)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  ctx.save()
  ctx.translate(sx, sy)
  ctx.globalAlpha = 1 - dying * 0.85
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.42, size * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()

  // The guard phase, drawn UNDER the body: a hexagonal barrier that pulses hard
  // and fast. The player is going to keep shooting into it — the sim spends
  // their rounds on it deliberately — so it has to be unmistakably a shield and
  // not a hitbox that stopped working. Two arcs and a fill; no gradient, no
  // shadow, because this runs every frame of the busiest moment in the game.
  if (b.guard > 0 && !b.dead) {
    const pulse = 0.55 + Math.sin(t / 70) * 0.25
    const rr = size * 0.95
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.16 + pulse * 0.14
    ctx.fillStyle = '#ff6a3a'
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.55, rr, rr * 1.15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.5 + pulse * 0.4
    ctx.strokeStyle = '#ffd08a'
    ctx.lineWidth = Math.max(1.5, scale * 0.05)
    ctx.beginPath()
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * rr
      const py = -size * 0.55 + Math.sin(a) * rr * 1.15
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.restore()
  }

  if (dying > 0) {
    ctx.rotate(dying * 0.6)
    ctx.translate(0, dying * size * 0.3)
  }
  const frame = monsterFrame(b.design, (t / 900) % 1)
  if (frame) {
    const k = (size * 1.6) / SPRITE_HEIGHT
    const dw = frame.width * k
    const mirror = monsterFaces(b.design) === 'left' ? -1 : 1
    ctx.save()
    ctx.scale(mirror, 1)
    ctx.drawImage(frame, -dw / 2, -SPRITE_FOOT * k, dw, frame.height * k)
    if (b.flash > 0.02) {
      ctx.globalAlpha = Math.min(1, b.flash) * 0.8
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(frame, -dw / 2, -SPRITE_FOOT * k, dw, frame.height * k)
    }
    ctx.restore()
  } else {
    ctx.fillStyle = '#63348d'
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.5, size * 0.4, size * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// ─── Layer 8: the crowd ─────────────────────────────────────────────────────

/**
 * Draw the squad.
 *
 * Sorted back-to-front so the crowd overlaps correctly — without it a hundred
 * and ninety sprites at random depths look like confetti. The sort is over a
 * pre-allocated index array to keep the frame allocation-free.
 */
let order: number[] = []

const drawUnits = (ctx: CanvasRenderingContext2D): void => {
  const units = getUnits()
  const n = units.length
  if (n === 0) return

  if (order.length !== n) order = new Array<number>(n)
  for (let i = 0; i < n; i++) order[i] = i
  // Far (higher y) first.
  order.sort((a, b) => (units[b]!.y - units[a]!.y))

  const t = nowMs()
  const drawn = Math.min(n, quality.value === 'low' ? 110 : quality.value === 'medium' ? 150 : 190)
  let painted = 0
  const squeeze = crowdSqueeze
  // The forward lean, as foreshortening. A survivor driving forward through a
  // press of bodies is pitched away from the camera, and in a sprite that means
  // slightly SHORTER with the feet still planted. Folded into the blit's own
  // height rather than into a transform, so two hundred bodies lean for free.
  const pitch = 1 - squeeze * 0.055

  // ── The funnel, part 1: the crowd's own contact shadow ──
  //
  // One pooled shadow under the whole formation, deepening as it compresses.
  // Two hundred individual shadows never merge into a mass however dark they
  // get — they read as two hundred separate people who happen to be near each
  // other. A single sheet under all of them is what makes the compression land
  // as ONE body being squeezed through a doorway.
  if (n > 6) {
    const gsy = worldToScreenY(camY)
    const gsx = worldToScreenX(camX)
    const gr = Math.max(scale * 0.4, crowdHalfW * scale * 1.12)
    const g = ctx.createRadialGradient(gsx, gsy, 0, gsx, gsy, gr)
    g.addColorStop(0, `rgba(0,0,0,${0.1 + squeeze * 0.26})`)
    g.addColorStop(0.65, `rgba(0,0,0,${0.05 + squeeze * 0.14})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(gsx, gsy, gr, gr * CROWD_SQUASH * 0.8, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── The funnel, part 2: dust off the flanks ──
  //
  // Kicked up at the crowd's EDGES, drifting outward and back, because that is
  // where the shoulders are scraping. Emitted at most twice a frame and only
  // once the squeeze is real, so it costs nothing on a lane with no bank on it.
  if (squeeze > 0.18 && quality.value !== 'low') {
    const puffs = quality.value === 'high' ? 2 : 1
    for (let i = 0; i < puffs; i++) {
      if (Math.random() > squeeze * 0.5) continue
      const side = Math.random() < 0.5 ? -1 : 1
      emit({
        x: camX + side * crowdHalfW, y: camY + (Math.random() - 0.5) * crowdHalfW,
        vx: side * (0.6 + Math.random()), vy: -1.2 - Math.random(),
        life: 420 + Math.random() * 260, size: 0.3 + Math.random() * 0.2,
        color: DUST, shape: 3, alpha: 0.16 + squeeze * 0.16, drag: 2.2
      })
    }
  }

  for (let k = 0; k < n && painted < drawn; k++) {
    const u = units[order[k]!]!
    const sy = worldToScreenY(u.y)
    if (sy < -60 || sy > viewH + 60) continue
    const sx = worldToScreenX(u.x)
    painted++

    const dieK = u.dying > 0 ? u.dying / 420 : 1
    const size = scale * 1.15

    ctx.save()
    ctx.translate(sx, sy)
    ctx.globalAlpha = dieK

    // Shadow first — it is what plants the crowd on the road. It TIGHTENS and
    // darkens as the formation compresses: a body with room around it casts a
    // soft pool, a body being shoved from both sides casts a hard contact patch.
    ctx.fillStyle = `rgba(0,0,0,${0.3 + squeeze * 0.16})`
    ctx.beginPath()
    ctx.ellipse(0, 0, size * 0.2 * (1 - squeeze * 0.34), size * 0.07, 0, 0, Math.PI * 2)
    ctx.fill()

    if (u.dying > 0) ctx.rotate((1 - dieK) * 1.5)
    else if (squeeze > 0.05) {
      // ── The funnel, part 3: the lean ──
      //
      // Every survivor leans INWARD, toward the centre line they are being
      // pressed toward, rotated about their own feet. Signed by which side of
      // the anchor they stand on, so the crowd visibly converges instead of
      // tilting as a block — a uniform lean would just look like the camera is
      // crooked. Capped low: this is a shoulder turn, not a stumble.
      const off = u.x - camX
      const lean = Math.max(-1, Math.min(1, off / Math.max(0.4, crowdHalfW)))
      ctx.rotate(-lean * squeeze * 0.16)
    }

    const frame = survivorFrame(outfitIndex(u.i), (t / HERO_CYCLE_MS + u.phase) % 1)
    if (frame) {
      const k2 = (size * 1.05) / HERO_HEIGHT
      const dw = HERO_PX * k2
      const dh = HERO_PX * k2 * pitch
      const dy = -HERO_FOOT * k2 * pitch
      ctx.drawImage(frame, -dw / 2, dy, dw, dh)
      if (u.flash > 0) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, u.flash / 220) * 0.5
        ctx.globalCompositeOperation = 'lighter'
        ctx.drawImage(frame, -dw / 2, dy, dw, dh)
        ctx.restore()
      }
    } else {
      // Fallback capsule while the strips bake, in the unit's own outfit colour
      // so the crowd never flashes a different palette when the strips land.
      const tone = outfitTone(u.i)
      ctx.fillStyle = tone.base
      roundRect(ctx, -size * 0.17, -size * 0.62, size * 0.34, size * 0.62, size * 0.14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(20,16,22,0.8)'
      ctx.lineWidth = Math.max(1, size * 0.05)
      ctx.stroke()
    }

    // Muzzle flash — additive, in front of the body, gone in 70 ms.
    //
    // Grows with the run's fire rate. It is a one-multiply way of paying the
    // player back for every crate detour they took: the crowd does not just
    // shoot more often, it visibly burns harder while doing it.
    if (u.flash > 20 && u.dying <= 0) {
      const a = Math.min(1, u.flash / 70)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = a
      const fy = -size * 0.95
      const fr = size * (0.34 + rateHeat * 0.13)
      const g = ctx.createRadialGradient(0, fy, 0, 0, fy, fr)
      g.addColorStop(0, 'rgba(255,244,200,0.95)')
      g.addColorStop(0.4, 'rgba(255,180,60,0.5)')
      g.addColorStop(1, 'rgba(255,120,20,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, fy, fr, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

// ─── Layer 9: tracers ───────────────────────────────────────────────────────

const drawBullets = (ctx: CanvasRenderingContext2D): void => {
  const bullets = getBullets()
  if (bullets.length === 0) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'

  // The two tracer colours brighten with the run's fire rate, and are built
  // ONCE for the whole pass. A template literal inside the loop would be an
  // allocation per bullet per frame, which at a late-run rate is a few hundred
  // strings a frame for a colour that never varies between bullets.
  const glowA = 0.35 + rateHeat * 0.3
  const outer = `rgba(255,${Math.round(214 + rateHeat * 30)},${Math.round(120 + rateHeat * 90)},${glowA})`
  const coreW = Math.max(1, scale * (0.045 + rateHeat * 0.02))
  const outerW = Math.max(2, scale * (0.1 + rateHeat * 0.03))

  for (const b of bullets) {
    const sy = worldToScreenY(b.y)
    if (sy < -40 || sy > viewH + 40) continue
    const sx = worldToScreenX(b.x)
    const len = scale * 0.55

    ctx.strokeStyle = outer
    ctx.lineWidth = outerW
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx, sy + len)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,235,0.95)'
    ctx.lineWidth = coreW
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx, sy + len * 0.6)
    ctx.stroke()
  }
  ctx.restore()
}

// ─── Layer 11: text and grades ──────────────────────────────────────────────

const drawFloatingText = (ctx: CanvasRenderingContext2D): void => {
  const texts = getTexts()
  if (texts.length === 0) return
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  for (const t of texts) {
    const a = Math.min(1, (t.life / t.maxLife) * 2.2)
    const grow = t.crit ? 1 + (1 - t.life / t.maxLife) * 0.25 : 1
    const px = Math.max(11, t.size * scale * grow)
    ctx.font = `900 ${px}px Angry, sans-serif`
    ctx.globalAlpha = a
    const x = worldToScreenX(t.x)
    const y = worldToScreenY(t.y)
    ctx.lineWidth = Math.max(2, px * 0.24)
    ctx.strokeStyle = 'rgba(0,0,0,0.88)'
    ctx.strokeText(t.text, x, y)
    ctx.fillStyle = t.color
    ctx.fillText(t.text, x, y)
  }
  ctx.globalAlpha = 1
}

const drawGrades = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  // Speed streaks at the edges after a gate pass. Only at the EDGES, so they
  // never sit over anything the player has to read.
  if (rushPulse > 0.02 && quality.value !== 'low') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = rushPulse * 0.5
    ctx.strokeStyle = 'rgba(180,225,255,0.6)'
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const px = w / 2 + side * (w * 0.3 + ((i * 37) % (w * 0.2)))
      const py = ((i * 149) % h)
      const len = h * (0.08 + rushPulse * 0.16)
      ctx.lineWidth = 1 + (i % 3)
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px, py + len)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (screenFlash > 0.01) {
    ctx.fillStyle = `rgba(${flashColour},${screenFlash})`
    ctx.fillRect(0, 0, w, h)
  }

  // Vignette. Always on, subtle: it holds the eye in the lane, which is exactly
  // where the game happens.
  const v = ctx.createRadialGradient(w / 2, h * 0.6, Math.min(w, h) * 0.38, w / 2, h * 0.6, Math.max(w, h) * 0.8)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.34)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, w, h)

  // Miniboss arrival: a DARK red vignette that closes further in than the hurt
  // pulse and drains slower. It says "the room just got smaller", where the
  // hurt pulse says "you are losing people" — two different feelings, so two
  // different grades rather than one shared red.
  if (elitePulse > 0.01) {
    const e = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.14, w / 2, h * 0.55, Math.max(w, h) * 0.66)
    e.addColorStop(0, 'rgba(70,0,4,0)')
    e.addColorStop(1, `rgba(74,2,6,${elitePulse * 0.62})`)
    ctx.fillStyle = e
    ctx.fillRect(0, 0, w, h)
  }

  if (hurtPulse > 0.01) {
    const r = ctx.createRadialGradient(w / 2, h * 0.6, Math.min(w, h) * 0.3, w / 2, h * 0.6, Math.max(w, h) * 0.7)
    r.addColorStop(0, 'rgba(255,40,40,0)')
    r.addColorStop(1, `rgba(255,30,30,${hurtPulse * 0.5})`)
    ctx.fillStyle = r
    ctx.fillRect(0, 0, w, h)
  }
}

// ─── FX events → particles, text, sound, shake ──────────────────────────────

/**
 * The juice table.
 *
 * Every event the simulation emits is turned into pixels and sound HERE, in one
 * place, so the feel of the whole game can be tuned by reading a single
 * function — and so the simulation never grows a dependency on either.
 */
const consumeFx = (): void => {
  const events = drainFx()
  if (events.length === 0) return

  // ── One pre-pass, for the shockwave's origin ──
  //
  // A dismissal has to radiate from the door the crowd TOOK, and the event only
  // carries how FAR that door was, not where — a leaf 2.66 units from the taken
  // one could be on either side of it. The `gatePass` that claimed the bank is
  // pushed by the same tick, ahead of its dismissals, and it knows exactly where
  // the crowd went through. So it is read out of the batch first rather than
  // having every dismissal guess a sign.
  //
  // A batch with dismissals and NO pass is the other case entirely: nobody got
  // through any door. The crowd was on a pillar, or already dead, and the bank
  // resolved to nothing at all. The sim measures `distance` from the crowd's own
  // anchor there, so the anchor is the origin — and the whole cascade switches
  // to its bleak dressing. See `Dismissal.bleak`.
  let originX = camX
  let originY = 0
  let hasPass = false
  let hasDismiss = false
  for (const e of events) {
    if (e.kind === 'gatePass') { originX = e.x; originY = e.y; hasPass = true }
    else if (e.kind === 'gateDismiss') { if (!hasPass) originY = e.y; hasDismiss = true }
  }
  batchBleak = hasDismiss && !hasPass
  if (hasDismiss) spawnShock(originX, originY, batchBleak)

  for (const e of events) applyFx(e)
}

const applyFx = (e: FxEvent): void => {
  switch (e.kind) {
    case 'shoot':
      playFx('shoot')
      // A single ejected spark. Anything more and 46 shots a second becomes fog.
      if (quality.value === 'high' && Math.random() < 0.35) {
        emit({
          x: e.x, y: e.y, vx: (Math.random() - 0.5) * 2.2, vy: -1.2 - Math.random(),
          life: 260, size: 0.07, color: [255, 200, 110], additive: true, shape: 2, drag: 2
        })
      }
      break

    case 'hit': {
      const hard = e.on === 'gate' || e.on === 'barricade'
      playFx(hard ? 'hitHard' : 'hitSoft')
      const colour: [number, number, number] = e.on === 'gate' ? [150, 230, 255]
        : e.on === 'crate' ? [200, 160, 90]
          : e.on === 'foe' ? [230, 90, 90]
            : [200, 205, 215]
      const n = quality.value === 'low' ? 2 : 4
      for (let i = 0; i < n; i++) {
        emit({
          x: e.x, y: e.y,
          vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.2) * 3,
          life: 200 + Math.random() * 160, size: 0.08, color: colour,
          additive: true, shape: 2, drag: 3
        })
      }
      break
    }

    case 'gateTick': {
      // The keystone moment. The pitch climbs with the value (see
      // `useGameAudio`), the number punches, and a ring of sparks blows out of
      // the plate — so a gate being pumped is unmistakable at a glance and with
      // the sound off.
      //
      // A `-N` leaf runs the identical mechanic and must therefore get the
      // identical *grammar* — tick, punch, particles — with every channel
      // inverted: descending cue, amber instead of cyan, `−1` instead of `+1`,
      // and sparks falling INWARD rather than blowing out. Same sentence,
      // opposite meaning, which is the only way the player learns that aiming
      // at the wrong door is an action with a price.
      const hostile = e.hostile === true
      playFx(hostile ? 'gateSubTick' : 'gateTick', e.value)
      emitText({
        x: e.x, y: e.y + 0.9, vy: hostile ? 1.8 : 2.6, life: 620,
        text: hostile ? '−1' : '+1',
        color: hostile ? '#ffb060' : '#bff0ff', size: 0.5, crit: false
      })
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        const sp = hostile ? -3.4 : 4.5
        emit({
          x: e.x - (hostile ? Math.cos(a) * 1.1 : 0),
          y: e.y - (hostile ? Math.sin(a) * 0.8 : 0),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * (hostile ? -2.6 : 3.2),
          life: 340, size: 0.1, color: hostile ? [255, 170, 80] : [140, 225, 255],
          additive: true, shape: 0, drag: 3.4
        })
      }
      break
    }

    case 'gatePass': {
      // A loss gets the OPPOSITE of every channel a gain uses: red instead of
      // white, an implosion instead of a burst, a hurt pulse instead of the
      // speed streaks. Nothing about it may feel like a reward, because the
      // player has to learn in one hit that they picked the wrong leaf.
      if (e.op === 'div' || e.gain < 0) {
        const lost = Math.abs(e.gain)
        // A descending minor cluster with a sub drop under it — deliberately
        // unpleasant, because this cue is a mistake being reported back.
        playFx('gateTrap')
        triggerShake('big')
        screenFlash = Math.min(0.62, 0.28 + lost * 0.008)
        flashColour = '255,52,40'
        hurtPulse = 1
        emitText({
          x: e.x, y: e.y + 0.6, vy: 2.2, life: 1100,
          text: `−${lost}`, color: '#ff6a5a', size: 1.0, crit: true
        })
        // Implosion: spawned on a ring and travelling INWARD, with a downward
        // bias so the crowd's own space visibly collapses toward the player.
        const m = quality.value === 'low' ? 14 : 34
        for (let i = 0; i < m; i++) {
          const a = (i / m) * Math.PI * 2 + Math.random() * 0.2
          const rad = 1.5 + Math.random() * 1.4
          const sp = 5 + Math.random() * 5
          emit({
            x: e.x + Math.cos(a) * rad, y: e.y + Math.sin(a) * rad * 0.7,
            vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp * 0.7 - 2.4,
            life: 380 + Math.random() * 220, size: 0.11 + Math.random() * 0.1,
            color: [255, 70, 50], additive: true, shape: 2, drag: 0.6
          })
        }
        emitDecal(e.x, e.y, 1.4, 0.4)
        break
      }

      const mul = e.op === 'mul'
      playFx(mul ? 'gateMul' : 'gatePass', Math.min(1, e.gain / 25))
      triggerShake(e.gain >= 20 ? 'strong' : 'small')
      screenFlash = Math.min(0.5, 0.18 + e.gain * 0.006)
      flashColour = mul ? '255,190,240' : '190,235,255'
      rushPulse = 1
      emitText({
        x: e.x, y: e.y + 0.6, vy: 3.4, life: 1000,
        text: mul ? `×${e.value}` : `+${e.gain}`,
        color: mul ? '#ffc0f0' : '#ffffff', size: 0.95, crit: true
      })
      const n = quality.value === 'low' ? 16 : 40
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 3 + Math.random() * 9
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7,
          life: 520 + Math.random() * 420, size: 0.1 + Math.random() * 0.12,
          color: mul ? [255, 150, 230] : [150, 225, 255],
          additive: true, shape: Math.random() < 0.4 ? 2 : 0, drag: 2.2
        })
      }
      break
    }

    case 'gateDismiss':
      // Scheduled, not fired: the leaf stands until the shockwave from the
      // taken door reaches it. Everything else — the debris, the sound, the
      // teardown — hangs off `stepDismissals` from there, so the cascade is one
      // clock and cannot desynchronise from itself.
      //
      // Note what is deliberately NOT here: no `triggerShake`, no `screenFlash`,
      // no `rushPulse`. The `gatePass` landing in this same batch owns all three
      // channels, and a dismissal that also grabbed them would double every
      // camera punch in the game — on a three-leaf bank, triple it. The
      // dismissal is loud in its own frame and silent everywhere else.
      spawnDismissal(e.x, e.y, e.halfW, e.op, e.value, e.distance)
      break

    case 'crateBreak': {
      // The two crates cost the same detour, so their payoffs have to be told
      // apart at the moment of payment: green burst + an integer for damage,
      // cyan burst + one decimal for fire rate. The decimal matters — a rate of
      // "2" and a rate of "2.4" are a real difference in how the run plays.
      const rate = e.crate === 'rate'
      playFx('crate')
      // Two clearly different rewards need two clearly different sounds: the
      // rate crate ratchets upward, the damage crate lands a fanfare.
      if (rate) playFx('rateUp')
      else playFx('damageUp')
      triggerShake('small')
      screenFlash = 0.22
      flashColour = rate ? '150,225,255' : '160,255,200'
      emitText({
        x: e.x, y: e.y + 0.5, vy: 3, life: 1100,
        text: rate ? `RATE ${e.value.toFixed(1)}` : `DMG ${Math.round(e.value)}`,
        color: rate ? '#b6ecff' : '#8fffc2', size: 0.78, crit: true
      })
      // Wooden debris is the same either way — it is the same crate.
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * (2 + Math.random() * 7), vy: Math.sin(a) * 4 + 3,
          life: 600 + Math.random() * 400, size: 0.13, color: [180, 130, 66],
          shape: 1, gravity: 11, rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 12
        })
      }
      // The stat burst is not. Damage blooms outward in a fat soft ring; rate
      // fires off as fast thin streaks, which is the shape of the stat itself.
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = rate ? 7 + Math.random() * 6 : 3 + Math.random() * 3
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rate ? 380 : 500, size: rate ? 0.08 : 0.1,
          color: rate ? [140, 220, 255] : [140, 255, 190],
          additive: true, shape: rate ? 2 : 0, drag: rate ? 1.6 : 2.6
        })
      }
      break
    }

    case 'barricadeBreak':
      playFx('barricade')
      triggerShake('small')
      emitDecal(e.x, e.y, 1.1, 0.45)
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * (3 + Math.random() * 8), vy: Math.sin(a) * 5 + 3,
          life: 620, size: 0.16, color: [110, 116, 128], shape: 1,
          gravity: 13, rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 14
        })
      }
      for (let i = 0; i < 6; i++) {
        emit({
          x: e.x, y: e.y, vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2,
          life: 900, size: 0.5, color: [90, 92, 100], shape: 3, alpha: 0.5, drag: 1.4
        })
      }
      break

    case 'foeDie': {
      playFx('foeDie')
      const n = e.big ? 22 : 12
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y + 0.4, vx: Math.cos(a) * (2 + Math.random() * 6),
          vy: Math.sin(a) * 4 + 2,
          life: 480 + Math.random() * 260, size: 0.11, color: [122, 22, 32],
          shape: 0, gravity: 9, drag: 1.2
        })
      }
      if (e.big) emitDecal(e.x, e.y, 0.9, 0.35)
      break
    }

    case 'eliteSpawn':
      // An arrival, not an explosion: a low thump, a shove of the camera, and
      // the room going dark at the edges. Short, because it lands while the
      // player is still steering and a long grade would blind them mid-dodge.
      playFx('eliteSpawn')
      triggerShake('strong')
      elitePulse = 1
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 4 + 1,
          life: 460, size: 0.13, color: [120, 30, 36], shape: 1,
          gravity: 10, drag: 1.8, rot: a, vrot: (Math.random() - 0.5) * 8
        })
      }
      emitDecal(e.x, e.y, 1.3, 0.4)
      break

    case 'eliteSweep': {
      // The arc. Everything about it travels ACROSS the road in `dir`, because
      // the one thing this effect has to say is "that just crossed the whole
      // lane" — a radial burst would read as a stomp and teach the player to
      // look for a safe side that does not exist.
      //
      // Weighted by the archetype so the two elites read apart at a glance: a
      // brute drags a heavy wall of dust, a hound throws a fast bright slash.
      playFx('eliteSweep', e.heavy ? 1 : 0)
      triggerShake(e.heavy ? 'strong' : 'small')
      // Dust laid along the arc rather than one puff at its centre — three
      // decals across the lane, at the reach the kill was measured against.
      for (let i = -1; i <= 1; i++) {
        emitDecal(e.x + i * LANE_HALF * 0.62, e.y - e.reach * 0.45, e.reach * 0.3, 0.3)
      }
      const n = e.heavy ? 26 : 20
      for (let i = 0; i < n; i++) {
        // Spread along the road behind the elite and across the full lane, so
        // the debris field is the shape of the thing that made it.
        const t = i / (n - 1)
        const sp = e.heavy ? 9 : 14
        emit({
          x: -LANE_HALF + t * LANE_HALF * 2,
          y: e.y - e.reach * (0.15 + Math.random() * 0.7),
          vx: e.dir * sp * (0.5 + Math.random()),
          vy: (Math.random() - 0.3) * 3,
          life: e.heavy ? 460 : 320, size: e.heavy ? 0.14 : 0.1,
          color: e.heavy ? [148, 122, 96] : [190, 90, 70], shape: 1,
          gravity: 9, drag: 1.7, rot: Math.random() * 6, vrot: e.dir * 9
        })
      }
      // The slash itself, on the additive pass, so it reads even with the crowd
      // standing on top of it — a line of light crossing the road in `dir`.
      for (let i = 0; i < 12; i++) {
        const t = i / 11
        emit({
          x: -LANE_HALF + t * LANE_HALF * 2, y: e.y - e.reach * 0.5,
          vx: e.dir * 9, vy: (Math.random() - 0.5) * 1.2,
          life: 220, size: 0.13, color: [255, 176, 90], additive: true, shape: 2, drag: 3
        })
      }
      break
    }

    case 'eliteDie':
      // The boss death, at half the budget. A miniboss is a real win and has to
      // be paid for like one — just not so loudly that the actual boss has
      // nothing left to escalate to.
      playFx('eliteDie')
      triggerShake('strong')
      screenFlash = 0.38
      flashColour = '255,215,150'
      emitDecal(e.x, e.y, 1.5, 0.45)
      for (let i = 0; i < (quality.value === 'low' ? 16 : 34); i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 3 + Math.random() * 9
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 3,
          life: 560 + Math.random() * 480, size: 0.12 + Math.random() * 0.1,
          color: Math.random() < 0.5 ? [255, 190, 90] : [220, 80, 60],
          additive: true, shape: Math.random() < 0.5 ? 2 : 0, drag: 1.5, gravity: 4
        })
      }
      break

    case 'divider':
      // The pillar kill. The player has one frame to understand that a solid
      // object, not an enemy, took those survivors — so this is deliberately
      // METALLIC first and bloody second: white-hot sparks raking off steel,
      // then the grey chips, then the hurt pulse.
      playFx('divider')
      triggerShake('strong')
      hurtPulse = Math.min(1, hurtPulse + 0.7)
      screenFlash = 0.2
      flashColour = '255,190,90'
      for (let i = 0; i < 20; i++) {
        // Sparks rake sideways off the pillar's faces, never straight up: the
        // direction is the tell that they came off something vertical and hard.
        const side = i % 2 === 0 ? -1 : 1
        emit({
          x: e.x, y: e.y,
          vx: side * (4 + Math.random() * 11), vy: (Math.random() - 0.35) * 7,
          life: 260 + Math.random() * 200, size: 0.09, color: [255, 235, 170],
          additive: true, shape: 2, drag: 2.4, gravity: 6
        })
      }
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 3 + 2,
          life: 500, size: 0.11, color: [150, 150, 158], shape: 1,
          gravity: 12, rot: a, vrot: (Math.random() - 0.5) * 12
        })
      }
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y + 0.2, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 + 1.5,
          life: 420, size: 0.1, color: [200, 60, 55], shape: 0, gravity: 9, drag: 1.4
        })
      }
      break

    case 'unitLost': {
      playFx('unitLost')
      hurtPulse = Math.min(1, hurtPulse + 0.35)
      const tone = outfitTone(e.outfit)
      void tone
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y + 0.3, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 + 2,
          life: 420, size: 0.09, color: [220, 90, 80], shape: 0, gravity: 8, drag: 1.5
        })
      }
      break
    }

    case 'coin':
      playFx('coin')
      for (let i = 0; i < 5; i++) {
        emit({
          x: e.x, y: e.y, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 2,
          life: 420, size: 0.1, color: [255, 210, 80], additive: true, shape: 0, drag: 2.4
        })
      }
      break

    case 'bossHit':
      playFx('bossHit')
      for (let i = 0; i < 4; i++) {
        emit({
          x: e.x, y: e.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.3) * 4,
          life: 260, size: 0.1, color: [255, 190, 120], additive: true, shape: 2, drag: 3
        })
      }
      break

    case 'bossGuard': {
      // Deliberately cheap and deliberately WRONG-coloured: cold sparks where a
      // hit would give warm ones. The mix stays legible even when forty rounds
      // a second are landing on the barrier.
      playFx('bossGuard')
      for (let i = 0; i < 3; i++) {
        emit({
          x: e.x, y: e.y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.2) * 5,
          life: 200, size: 0.08, color: [140, 220, 255], additive: true, shape: 2, drag: 4
        })
      }
      break
    }

    case 'bossRage': {
      // The turn: the boss plants and the fight changes. Loud on purpose — this
      // is the one beat that tells a player who was winning on autopilot that
      // the last third is not the same fight as the first.
      playFx('bossRage')
      triggerShake(e.stage >= 2 ? 'big' : 'strong')
      screenFlash = e.stage >= 2 ? 0.5 : 0.34
      flashColour = '255,120,60'
      const ring = 26 + e.stage * 10
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2
        emit({
          x: e.x, y: e.y - 0.6, vx: Math.cos(a) * 9, vy: Math.sin(a) * 5 - 1,
          life: 460, size: 0.13, color: [255, 150, 70], additive: true, shape: 2, drag: 2.2
        })
      }
      break
    }

    case 'bossSlam': {
      playFx('bossSlam')
      triggerShake('strong')
      // The debris ring is the slam's actual reach, so a raging boss visibly
      // throws a bigger hit rather than the same hit with a different number
      // behind it.
      const r = e.radius
      emitDecal(e.x, e.y, r * 1.26, 0.5)
      const n = Math.round(22 + r * 4)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * 6.8 * r, vy: Math.sin(a) * 4 * r + 2,
          life: 520, size: 0.16, color: [150, 130, 110], shape: 1,
          gravity: 12, drag: 1.6, rot: a, vrot: (Math.random() - 0.5) * 10
        })
      }
      break
    }

    case 'bossDie':
      playFx('bossDie')
      triggerShake('big')
      screenFlash = 0.7
      flashColour = '255,235,190'
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 4 + Math.random() * 14
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 4,
          life: 700 + Math.random() * 700, size: 0.14 + Math.random() * 0.14,
          color: Math.random() < 0.5 ? [255, 200, 90] : [255, 120, 60],
          additive: true, shape: Math.random() < 0.5 ? 2 : 0, drag: 1.3, gravity: 4
        })
      }
      break

    case 'stageClear':
      playFx('stageClear')
      screenFlash = 0.35
      flashColour = '255,245,210'
      break

    case 'wipe':
      playFx('wipe')
      screenFlash = 0.4
      flashColour = '255,60,60'
      hurtPulse = 1
      triggerShake('strong')
      break
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const roundRect = (
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
): void => {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

/** 1 234 → "1.2k". Barricade HP climbs into the thousands by stage 15 and a
 *  five-digit number does not fit on a block. */
export const formatCount = (n: number): string => {
  if (n < 1000) return String(n)
  if (n < 100000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`
  return `${Math.round(n / 1000)}k`
}

/** Drop every cached surface. Called on a stage change so the new sky is built
 *  and on a resize so the lane tile matches the new scale. */
export const invalidateArt = (): void => {
  backdrop = null
  backdropKey = ''
  laneTile = null
  laneTileKey = ''
  hazardTile = null
  hazardKey = ''
  // The dismissal pools are the renderer's own transients — `resetVfx` cannot
  // reach them — and a leaf still tearing itself down when a stage restarts
  // would draw a gate that no longer exists at a world position that has moved.
  // Half a second of debris from the last run is exactly the kind of thing that
  // gets reported as a ghost gate.
  for (const d of dismissals) d.active = false
  for (const s of shocks) s.active = false
  for (const t of topples) t.active = false
  crowdSqueeze = 0
  batchBleak = false
}

// Referenced so the module's imports stay honest if a layer is temporarily
// commented out during tuning. `crowdRadius` came off this list when the
// divider pillars started measuring proximity from the crowd's edge.
void UNIT_R
void damage
void squadCount
void phase
