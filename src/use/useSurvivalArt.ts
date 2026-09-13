import {
  BARREL_R, BARRICADE_H, BASE_FIRE_RATE, BULWARK_R, CAGE_R, ROCK_H, CRATE_R, CROWD_MAX_R,
  CROWD_SQUASH, DIVIDER_H,
  DIVIDER_HALF_W, ELITE_SWEEP_REACH, ELITE_TELEGRAPH,
  gateTickMs, gatePumpCap, gateValueLabel, isScaleOp,
  LANE_HALF, MAX_FIRE_RATE, SLAM_RADIUS, SLAM_RADIUS_GROWTH, slamRadiusFor,
  SLAM_RADIUS_MAX, VIEW_HEIGHT, UNIT_R,
  type Divider, type GateOp
} from '@/game/survival'
import { BOLT_R, ROLLER_R, ROLLER_SPEED, ROLLER_WARN_AHEAD, flankXs } from '@/game/threats'
import {
  GUARD_H, LEVER_R, STONE_H, WEAPON_BOX_R, WEAPON_REVEAL_S, type WeaponId
} from '@/game/weapons'
import {
  anchor, crowdRadius, damage, eliteAlive, formationRadius, getBarricades, getBolts, getBoss,
  bossIsCharging, bossIsEnraged, bossIsVarying,
  bossGazeLeft01, bossGazeOpening, bossGazeWatching,
  shieldActive as isShieldUp, shieldLeftMs as shieldLeft,
  getBarrels, getBullets, getBulwarks, getCages, getCrates, getDividers, getFoes, getGates,
  getGrenades, getPickups,
  bulwarkReady,
  getBossBolts,
  getRocks,
  getUnits,
  activeWeapon, getGuards, getLevers, getStones, getWeaponBoxes,
  nowMs, phase, runFireRate, squadCount, stage,
  bossFallDir, getBossCorpse, progress01, roadScrollY, takeDepartedSurvivors,
  frostActive, frostFrozenAt
} from '@/use/useSurvivalGame'
import {
  applySkillFx, drawIceOn, drawSkillAir, drawSkillGround, drawSkillScreen, isSkillFx,
  stepSkillFx, syncSkillView
} from '@/use/useSkillFx'
import { CLAW_CORE_FRACTION, HEAL_FRACTION } from '@/game/threats'
import {
  DOWN_FALL_SIDE, HERO_CYCLE_MS, HERO_FOOT_R, HERO_FRAME_ASPECT, HERO_HEIGHT_R,
  FALL_REST_P, outfitIndex, outfitTone, primeSurvivors, SURVIVOR_FALL_MS,
  survivorDownFrame, survivorFallStep, survivorFrame
} from '@/game/heroSprites'
import {
  MONSTER_FRAME_ASPECT, SPRITE_FOOT_R, SPRITE_HEIGHT_R, bakeMonsterSlice, deathFallSide,
  monsterDeathFrame, monsterDeathLength, monsterFaces, monsterFrame, monstersReady,
  primeMonsterDeaths, primeMonsterSprites
} from '@/game/monsterSprites'
import { deathArtDue, deathArtWant } from '@/game/artPreload'
// DEV-only, false in every player's build: the preview recorder's "hide the
// readouts" flag — see `game/previewFeed.ts`. The numbers painted ON the world
// (a gate's value, a crate's HP) deliberately stay; only the readouts go.
import { HIDE_READOUTS } from '@/game/previewFeed'
import { GATE_FRAME, ROCKET_BOX } from '@/game/artBoxes'
import { spriteFor, onArtChanged, type ArtKind } from '@/game/art'
import { stripFrames } from '@/game/spriteStrip'
import { bossDesign, stageDesigns } from '@/game/foes'
import {
  drainFx, drawParticles, emit, emitDecal, emitText, getDecals, getTexts,
  qualityTier, sampleFrame, stepDecals, stepParticles, stepTexts,
  type FxEvent, type QualityTier
} from '@/use/useVfx'
import { useScreenshake } from '@/use/useScreenshake'
import { playFx } from '@/use/useGameAudio'
import { haptic } from '@/use/useHaptics'
import { getCachedImage } from '@/use/useAssets'
import { clearRamps, getRamp, putRamp } from '@/use/useGradientRamps'
import { clearLabelWidths, measureLabel } from '@/use/useTextMetrics'
import { bossOwnsCast, type CastKind } from '@/game/bossTells'

// ─── The frame's quality tier ───────────────────────────────────────────────
//
// Latched once per frame from the non-reactive mirror in `useVfx`. Every read
// below was a `quality.value` — a Vue ref getter with dependency tracking
// behind it — and several of them sit inside per-entity loops.
//
// The three booleans exist so the call sites stay readable after a fourth tier
// was added: `cheapFx` is the old `quality.value === 'low'` test, now meaning
// "low OR worse", and `minFx` is the new floor on its own.
let tier: QualityTier = 'high'
/** `low` or `min`: drop the embellishment, keep the shape. */
let cheapFx = false
/** `high` only: the passes that exist purely to look expensive. */
let richFx = true
/** The floor. Everything optional is off, including whole full-screen passes. */
let minFx = false

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

/** How far past the HUD strip the top scrim keeps fading, CSS px. Long enough
 *  that the ramp is a lighting change rather than a visible edge across the
 *  road — see the scrim itself in `drawGrades`. */
const HUD_SCRIM_FADE_PX = 46

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
/**
 * `camY` plus every re-base the world has had (`roadScrollY`) — the phase the
 * ROAD scrolls on. Positions still project through `camY`; only the repeating
 * ground (tile, rungs, posts, dashes, sky drift) reads this, so a stage that
 * opens under the crowd does not snap the ground back to the origin's pattern.
 */
let roadY = 0

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
// Three props ship as real bitmaps today (they already exist under
// `public/images` from the asset library) and stay on an always-on probe: they
// are shipping art, not overrides. Everything ELSE that can be painted goes
// through `spriteFor` from `art.ts`, which is off unless the build or the
// `?art=on` flag says otherwise — see the flag's note for why a portal must
// never probe files that are not there.
//
// Both lookups are lazy, cached and failure-tolerant: until the image decodes —
// or forever, if the file is missing — the procedural version draws instead, so
// the game never waits on art and a deleted file can never blank a prop.
//
// EVERY drawable that can be painted goes through ONE painter that holds both
// branches, drawn and painted. The battlefield, the art bench and the
// playground all call the same function, which is what makes the reference
// sheet provably the thing the game draws rather than a lookalike. The bench
// passes `procedural: true` so it never bakes last week's painting into this
// week's reference. Paths are catalogued by the manifest in `artSheet.ts`.
const PROP_ART = {
  crate: 'images/props/box_256x256.webp',
  barricade: 'images/props/stone_256x256.webp',
  coin: 'images/props/coin_128x128.webp'
} as const

const propImage = (key: keyof typeof PROP_ART): HTMLImageElement | null => {
  const img = getCachedImage(PROP_ART[key])
  return img.complete && img.naturalWidth > 0 ? img : null
}

/** Options every painter takes. */
export interface PaintOpts {
  /** Draw the procedural version even when a painting is available. The art
   *  bench sets this: a reference sheet must never contain the painting it is
   *  about to be replaced by, or every re-roll drifts from the last. */
  procedural?: boolean
  /**
   * Where in ONE LOOP of the subject's own animation this frame is, 0..1.
   *
   * The whole of the animation contract, in one number. A painter given a
   * cycle draws that moment of its flicker and nothing else — no clock, no
   * `Date.now`, no per-body state — so the same call always produces the same
   * picture. That is what lets the art bench bake eight panels of a real
   * flame loop out of the same painter the game runs, and it is why the
   * animation could not stay at the draw sites: a wake driven by wall-clock
   * time cannot be exported as a reference sheet.
   *
   * Undefined means 0, which is one fixed frame of the loop — so every caller
   * that does not animate keeps exactly the picture it had.
   */
  cycle?: number
}

/** The painting for `(kind, id)`, unless the caller wants the drawing. */
const art = (kind: ArtKind, id: string, o?: PaintOpts): HTMLImageElement | null =>
  o?.procedural ? null : spriteFor(kind, id)

/**
 * One cel of a drop-in, and whether the ART itself is carrying the motion.
 *
 * `animated` is the flag the whole pipeline turns on. A drop-in at
 * `images/rounds/<id>.webp` is either ONE painted panel — a still, which is
 * frozen and needs the procedural wake drawn around it — or a strip of eight,
 * which is a painted loop and must NOT have a second wake drawn over it. The
 * panel count is read off the file (`stripFrames`), so which of the two a
 * project has shipped is never declared anywhere and cannot fall out of date:
 * drop an eight-panel strip in over a still and the procedural flame switches
 * itself off on the next frame.
 *
 * Every round's panel is square, so the aspect is 1 for all of them.
 */
interface ArtCel { frame: CanvasImageSource; animated: boolean }

const artCel = (kind: ArtKind, id: string, o?: PaintOpts): ArtCel | null => {
  if (o?.procedural) return null
  const frames = stripFrames(kind, id, 1)
  if (!frames || frames.length === 0) return null
  const first = frames[0]!
  if (frames.length === 1) return { frame: first, animated: false }
  const c01 = (((o?.cycle ?? 0) % 1) + 1) % 1
  return { frame: frames[Math.floor(c01 * frames.length) % frames.length] ?? first, animated: true }
}

/**
 * ─── Flight animation: the wake, as ONE LOOP ────────────────────────────────
 *
 * Every projectile in this game was, on screen, a still picture being
 * translated down the road — and that is not a figure of speech about the drawn
 * art. Each painter's first branch is `drawImage(painted); return`, so once the
 * painted overrides shipped, the trails the procedural fallbacks drew stopped
 * rendering at all. What was left was a lovely hand-painted rock sliding down
 * the screen without one pixel of it changing between frames. Player-reported,
 * in exactly the right word: *"lifeless"*.
 *
 * ── Why this lives in the painters and is a function of `cycle01` ───────────
 *
 * The first fix drew the wake at the DRAW SITES off a wall clock, which
 * animated the game and left the pipeline behind — and the pipeline is the
 * point. The art bench (`ArtSheets.vue`) bakes its reference sheets by calling
 * these same painters, so an effect that only exists at the draw site can never
 * be exported, never be handed to a painter, and never come back as art. The
 * player's actual ask was the other one: *make the flame part of the sheet*.
 *
 * So the wake is a pure function of `PaintOpts.cycle` — where in one loop this
 * frame sits. That single change is what makes the whole round trip work:
 *
 *   · the BENCH renders panel k at `cycle = k / 8`, so a reference sheet is
 *     eight real, distinct moments of the same flame rather than one picture
 *     stamped eight times;
 *   · the PAINTER hands those eight panels to the image model as a cycle, with
 *     the same panel-count discipline the walk prompt fought for;
 *   · the GAME plays the returned strip off the same `cycle01` it would have
 *     fed the drawing, so a design can swap from drawn fire to painted fire
 *     mid-flicker without a pop — the contract in `spriteStrip.ts`.
 *
 * ── Everything here is PERIODIC IN ONE LOOP, and that is not decoration ─────
 *
 * Every oscillator below is `sin(TAU × (cycle01 × n + phase))` with an INTEGER
 * `n`. That is the difference between a cycle and a drift: at eight panels, a
 * tongue wobbling at 7.5 Hz off a seconds clock does not arrive back where it
 * started, so panel 8 does not join panel 1 — and a strip that does not join
 * itself pops once per loop, forever, in a way that reads as a dropped frame.
 * The frequencies are small integers so the loop closes exactly.
 *
 * ── The rule the wake keeps ─────────────────────────────────────────────────
 *
 * NOTHING here may change what the player reads as the lethal part. The gunner
 * bolt is drawn at `BOLT_R`, the radius the kill is measured against, precisely
 * so that what is seen is what hits — a round painted wider than it kills
 * teaches a dodge bigger than it needs, and one painted narrower gets players
 * killed. So the wake streams BEHIND the heading and none of it wraps the head.
 */

const TAU = Math.PI * 2

/**
 * Loops per second a round's wake plays at.
 *
 * At the pipeline's eight panels this is 8 x 1.6 = ~13 frames a second, which
 * is where hand-painted fire wants to sit: much slower and the panels read as
 * separate pictures, much faster and the flicker turns into a shimmer that the
 * eye stops resolving as flame. It is one constant because the drawn wake and a
 * painted strip must play at the SAME rate — that is the whole point of driving
 * both from `cycle01`, and two rates would make the drop-in visibly change the
 * animation's speed.
 */
export const ROUND_CYCLE_HZ = 1.6

/**
 * ─── The roller's loop is not on a clock, it is on the GROUND ───────────────
 *
 * Every other round's wake is fire, and fire flickers at whatever rate looks
 * like fire. A rolling ball is the one projectile whose animation is a fact
 * about the world: the surface has to travel as far as the ball does, or it
 * skids. So this rate is derived, not chosen.
 *
 * A sphere rolling without slipping makes `v / 2πr` revolutions a second: at
 * `ROLLER_SPEED` 3.4 and `ROLLER_R` 2.25 that is 0.24 — one turn every four
 * seconds. The ball is four and a half units across and covers three and a half
 * a second, so it genuinely does turn that slowly, and eight frames spread over
 * a whole revolution would play at under two a second and read as a slideshow.
 *
 * ── What the loop actually is: ONE BAND SPACING ──
 *
 * The drawing marches four bands down the face and wraps them, which is the old
 * 2D shorthand for a rolling ball rather than a projection of one. Read it as
 * geometry and the count follows: four bands span the FRONT of the ball, and the
 * front is half of it, so there are EIGHT around the whole ball. The picture
 * therefore repeats every eighth of a revolution — when the next band arrives
 * where the last one was — and that eighth is what the eight frames cover.
 *
 * So the loop runs at eight times the revolution rate: 1.92 a second, which is
 * 15 frames a second of surface travelling at the speed of the ground. Fast
 * enough to read as motion rather than as steps.
 *
 * (An earlier version of this called it a QUARTER turn, from counting the four
 * bands as four around the whole ball rather than four across its face. That
 * put the loop at 0.96/s — half the speed the surface actually moves — which is
 * exactly the "it looks like it is skidding" error this constant exists to
 * prevent. The band count and the roll rate have to be derived from the same
 * picture or they disagree silently.)
 */

/** Bands visible across the FRONT of the ball at once — what `paintRollerBall`
 *  marches, and what a painted panel shows. */
export const ROLLER_BANDS_ON_FACE = 4

/**
 * Spikes around the silhouette.
 *
 * Fixed in angle and purely decorative: they live in the margin
 * `ROLLER_ART_PAD` reserves, outside the sphere that actually kills. They are
 * here so the REFERENCE shows the spiked ball its own prompt describes — a
 * painter handed a bare sphere invents the studs, and invented studs do not
 * move with the surface.
 */
export const ROLLER_RIM_SPIKES = 14

/** Rivets shown along one band's visible arc. Enough to read as a row that
 *  crowds toward the band's ends; few enough to stay dots at play size. */
export const ROLLER_RIVETS_PER_BAND = 6

/** …and therefore twice that around the whole ball, since the face is half of
 *  it. This is the number the roll rate is derived from. */
export const ROLLER_BANDS_AROUND = ROLLER_BANDS_ON_FACE * 2

export const ROLLER_ROLL_HZ =
  (ROLLER_SPEED / (2 * Math.PI * ROLLER_R)) * ROLLER_BANDS_AROUND

/**
 * How much `paintRollerBall`'s `spin` advances over one loop.
 *
 * `spin` wraps every 2 units across the ball's full height, and there are four
 * bands in that span, so one band spacing is 0.5. The drawing and a painted
 * strip therefore step the same distance per frame, which is the whole point of
 * driving both from `cycle01`.
 */
export const ROLLER_SPIN_PER_LOOP = 2 / ROLLER_BANDS_ON_FACE

/**
 * Where in its loop a given body is, right now.
 *
 * Offset by the body's own id so a pack never flickers in lockstep — the thing
 * that most reliably makes an effect read as a screen artefact rather than as
 * something in the world. The golden-ratio step spreads any number of
 * simultaneous rounds about as evenly as a cheap hash can.
 */
const roundCycle = (seconds: number, id: number): number =>
  seconds * ROUND_CYCLE_HZ + id * 0.618

/**
 * A licking flame streaming along local −Y, from a body of radius `r`.
 *
 * Overlapping tongues rather than one tapered blob, because a blob scaled by a
 * sine is a throb and tongues on staggered phases are a FLAME. Each tongue has
 * its own harmonic and its own offset off the axis, so the plume writhes
 * instead of pumping, and `seed` decorrelates one body from the next — two
 * rounds in the air together must never flicker in lockstep, which is the most
 * reliable way to make an effect read as a screen artefact rather than as
 * something in the world.
 *
 * The caller owns the rotation. The flame goes straight up the local axis, so a
 * caller that has already turned to its heading gets a trail behind it, and one
 * that has not — the meteor, which falls straight down — gets a plume streaming
 * up the screen.
 */
const paintTrailFlame = (
  ctx: CanvasRenderingContext2D,
  r: number, len: number, cycle01: number, seed: number,
  hot: string, cool: string, cheap: boolean
): void => {
  const tongues = cheap ? 3 : 6
  // ── The whip: what makes one panel a DIFFERENT picture from the next ──
  //
  // Six tongues on independent phases writhe convincingly and, panel to panel,
  // average out — the envelope of the plume barely moves, so an exported sheet
  // is eight pictures of the same flame and an image model asked to repaint it
  // sensibly returns eight copies of one frame. The fix is a motion the whole
  // plume shares: it leans and stretches as one body on the loop's own
  // fundamental, and the per-tongue wobble rides on top of that.
  //
  // The lean is applied along the tongue rather than at its root, so the plume
  // bends like fire instead of sliding sideways like a decal.
  const whip = TAU * cycle01
  const lean = Math.sin(whip) * r * 1.15
  const stretch = 0.72 + 0.38 * Math.sin(whip + 1.1)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < tongues; i++) {
    // Integer harmonics, so the loop closes; the phase is what keeps the six
    // tongues from being one fat tongue.
    const ph = seed * 0.137 + i * 0.382
    const wob = Math.sin(TAU * (cycle01 * (2 + (i % 3)) + ph))
    const reach = len * stretch
      * (0.55 + 0.45 * (0.62 + 0.38 * Math.sin(TAU * (cycle01 * (1 + (i % 2)) + ph))))
    const sway = lean + Math.sin(TAU * (cycle01 * (1 + (i % 3)) + ph * 1.7)) * r * 0.45
    const steps = cheap ? 3 : 5
    for (let k = 1; k <= steps; k++) {
      const back = k / steps
      // Fades and narrows toward the tip: a tongue of constant width is a
      // streak, and a streak reads as a smear on the lens.
      ctx.globalAlpha = 0.3 * (1 - back) ** 1.35
      ctx.fillStyle = back < 0.5 ? hot : cool
      ctx.beginPath()
      ctx.ellipse(
        sway * back + wob * r * 0.22 * back,
        -reach * back,
        r * (0.72 - back * 0.5),
        r * (1.05 - back * 0.6),
        0, 0, TAU
      )
      ctx.fill()
    }
  }
  ctx.restore()
}

/**
 * Embers shed off a burning body, drifting back along local −Y.
 *
 * The one part of the wake that is not attached to the object, and the reason
 * it is worth the six arcs: everything else moves WITH the round, so at a
 * constant screen position — which a falling meteor very nearly is, dropping
 * toward a fixed mark — the whole effect can still read as static. Embers
 * detach and fall behind, so the eye gets an unambiguous "this is travelling"
 * even when nothing else has moved.
 *
 * Each ember walks its own sawtooth, offset by `i / 6`, so they are not a
 * marching row — and a sawtooth in `cycle01` is periodic by construction.
 */
const paintEmbers = (
  ctx: CanvasRenderingContext2D,
  r: number, len: number, cycle01: number, seed: number, tint: string
): void => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = tint
  for (let i = 0; i < 6; i++) {
    const ph = (((cycle01 + i / 6 + seed * 0.017) % 1) + 1) % 1
    ctx.globalAlpha = 0.55 * (1 - ph) ** 1.6
    const spread = Math.sin(TAU * (seed * 0.061 + i / 6)) * r * 1.15
    ctx.beginPath()
    ctx.arc(spread * ph, -len * ph, r * 0.2 * (1 - ph * 0.6), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The corona around a charged round: two counter-breathing rings of light.
 *
 * The bolts are not on fire, they are charged, so they get a different verb
 * from the meteor — a halo that swells and shrinks rather than a plume that
 * writhes. Two rings in antiphase so the body is never uniformly bright: a
 * single pulsing disc is a blinking light, and a blinking light on the road
 * reads as a UI element rather than as a hazard.
 *
 * Sized UNDER the painted body on purpose. It is a glow the round sits inside,
 * never a bigger silhouette around it — see the rule in the header.
 */
const paintFlightAura = (
  ctx: CanvasRenderingContext2D,
  r: number, cycle01: number, seed: number, inner: string, outer: string, cheap: boolean
): void => {
  const beat = Math.sin(TAU * (cycle01 + seed * 0.113))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.2 + 0.1 * beat
  ctx.fillStyle = outer
  ctx.beginPath()
  ctx.arc(0, 0, r * (1.75 + beat * 0.16), 0, TAU)
  ctx.fill()
  if (!cheap) {
    ctx.globalAlpha = 0.26 - 0.1 * beat
    ctx.fillStyle = inner
    ctx.beginPath()
    ctx.arc(0, 0, r * (1.18 - beat * 0.12), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

// ─── Painters ───────────────────────────────────────────────────────────────
//
// Each paints ONE drawable at the context's origin (unless it takes a
// position), in whatever units its caller works in. The box a painting is
// blitted into is stated in each painter and mirrored by the art bench, which
// draws the procedural version into exactly that box to make the reference —
// get the two out of step and every painted part is the wrong size, everywhere,
// invisibly. See `art-sheets/README.md`.

/**
 * A coin, at the origin. `spin` is the |cos| squash that turns it, `bob` the
 * lift; the halo is the caller's, since it is additive and follows the bob.
 */
export const paintCoin = (
  ctx: CanvasRenderingContext2D, r: number, spin: number, bob: number, o?: PaintOpts
): void => {
  const painted = art('prop', 'coin', o) ?? (o?.procedural ? null : propImage('coin'))
  if (painted) {
    // The bitmap spins by being squashed on X, exactly like the drawn one, so
    // dropping real art in never changes the animation.
    const w = Math.max(1, r * 2 * spin)
    ctx.drawImage(painted, -w / 2, bob - r, w, r * 2)
    return
  }
  let body = getRamp(`coinBody|${r}`)
  if (!body) {
    body = putRamp(`coinBody|${r}`, ctx.createLinearGradient(0, -r, 0, r))
    body.addColorStop(0, '#ffe066')
    body.addColorStop(0.55, '#e0a81c')
    body.addColorStop(1, '#8a6410')
  }
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, bob, Math.max(1, r * spin), r, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(60,40,4,0.7)'
  ctx.lineWidth = Math.max(1, r * 0.18)
  ctx.stroke()
}

/**
 * A crate's BODY, filling `(-r, -r, 2r, 2r)`.
 *
 * The rim in the crate's own colour, the badge and the HP number are all drawn
 * over this by `drawCrates`, so a painting has to leave the middle readable.
 * Two paintings, one per kind, so the identity can live in the timber and the
 * ironwork rather than only in the rim; the shipped box bitmap stands in for
 * both when neither has arrived.
 */
export const paintCrateBody = (
  ctx: CanvasRenderingContext2D, kind: 'damage' | 'rate', r: number, o?: PaintOpts
): void => {
  const painted = art('prop', kind === 'rate' ? 'crate-rate' : 'crate-damage', o)
    ?? (o?.procedural ? null : propImage('crate'))
  if (painted) {
    ctx.drawImage(painted, -r, -r, r * 2, r * 2)
    return
  }
  // `r` is `CRATE_R * scale` — one value for the whole frame — and the ramp
  // was already local to the crate's own transform, so this caches with no
  // geometry change at all.
  let body = getRamp(`crateBody|${r}`)
  if (!body) {
    body = putRamp(`crateBody|${r}`, ctx.createLinearGradient(-r, -r, r * 0.4, r))
    body.addColorStop(0, '#c08b48')
    body.addColorStop(0.5, '#8d5f2c')
    body.addColorStop(1, '#5c3c18')
  }
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

/**
 * The weapon box's BODY — the case and its face plate — in `(-r, -r, 2r, 2r)`.
 *
 * TWO paintings, not one recoloured: the locked box and the open one share only
 * their silhouette, and that is the whole point of the beat. A player has to be
 * able to tell from the far end of the road whether this is still a puzzle
 * behind armour or already a pickup, so the two states are allowed to look like
 * different objects.
 *
 * Everything that MOVES stays live over it — the weapon glyph, the cross-brace
 * that says SHUT, the damage cracks, the halo and the reveal ring — so a
 * painting has to leave its middle plain and readable, the way the supply
 * crates do. The open plate's own colour throb is the one thing a painting
 * gives up; the halo above it throbs on the same clock and carries the read.
 */
export const paintWeaponBoxBody = (
  ctx: CanvasRenderingContext2D, r: number, scale: number, open: boolean,
  pulse: number, o?: PaintOpts
): void => {
  const painted = art('prop', open ? 'weapon-box-open' : 'weapon-box', o)
  if (painted) {
    ctx.drawImage(painted, -r, -r, r * 2, r * 2)
    return
  }
  // The crate.
  ctx.fillStyle = open ? '#6b4a16' : '#3f4652'
  roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.22)
  ctx.fill()
  ctx.lineWidth = Math.max(1.8, scale * 0.055)
  ctx.strokeStyle = open ? '#2a1c06' : '#1a1e26'
  ctx.stroke()

  // Face plate, so the glyph has something to sit on.
  ctx.fillStyle = open
    ? `rgb(255,${Math.round(196 + pulse * 40)},${Math.round(72 + pulse * 50)})`
    : '#586374'
  roundRect(ctx, -r * 0.78, -r * 0.78, r * 1.56, r * 1.56, r * 0.16)
  ctx.fill()
}

/**
 * One plate of the ARMOUR over a locked weapon box, filling `(-w/2, -h/2, w, h)`.
 *
 * Two of these stand edge to edge over the prize, so its left and right edges
 * are panel edges rather than the ends of an object — a plate with a lit rim
 * all the way round would read as two separate crates side by side instead of
 * one bolted-on wall.
 *
 * The damage read is the caller's, over whatever is here: the rivets used to
 * dim with the remaining health, which a painting cannot do, so `drawGuards`
 * now dims and reddens the whole plate inside its own box the way `drawStones`
 * marks the lever's cover. One read, both paths.
 */
export const paintGuardPlate = (
  ctx: CanvasRenderingContext2D, w: number, h: number, o?: PaintOpts
): void => {
  const painted = art('prop', 'guard-plate', o)
  if (painted) {
    ctx.drawImage(painted, -w / 2, -h / 2, w, h)
    return
  }
  const key = `guardPlate|${w}|${h}`
  let body = getRamp(key)
  if (!body) {
    body = putRamp(key, ctx.createLinearGradient(-w / 2, -h / 2, w * 0.2, h / 2))
    body.addColorStop(0, '#8fa8c4')
    body.addColorStop(0.5, '#53687f')
    body.addColorStop(1, '#2c3947')
  }
  ctx.fillStyle = body
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.12)
  ctx.fill()

  ctx.save()
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.12)
  ctx.clip()
  ctx.fillStyle = '#d5e5f6'
  ctx.globalAlpha = 0.9
  const rr = Math.max(1.1, h * 0.06)
  for (let ry = -h * 0.26; ry <= h * 0.3; ry += h * 0.52) {
    for (let rx = -w / 2 + rr * 2.4; rx < w / 2 - rr; rx += rr * 3.6) {
      ctx.beginPath()
      ctx.arc(rx, ry, rr, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  ctx.strokeStyle = 'rgba(12,18,28,0.9)'
  ctx.lineWidth = Math.max(1.5, h * 0.07)
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.12)
  ctx.stroke()
}

/**
 * The lever's painted boxes, in lever radii, relative to the post's origin.
 *
 * The post is ONE object in two pieces because half of it moves: the housing is
 * bolted to the road and the arm swings ninety degrees through the beat, so
 * they cannot be one bitmap. Shared with the art bench, which draws the
 * procedural version into exactly these boxes to make the references.
 */
export const LEVER_ART = {
  /** The housing: `w` x `h` (2:1), its TOP edge on the post's origin. */
  post: { w: 2, h: 1 },
  /** The arm, authored pointing UP: `w` x `h` (9:16 portrait), with the pivot
   *  `pivot` above the box's bottom edge. */
  arm: { w: 1.35, h: 2.4, pivot: 0.2 }
} as const

/** The lever's HOUSING: the part bolted to the road, which never moves. */
export const paintLeverPost = (
  ctx: CanvasRenderingContext2D, r: number, scale: number, o?: PaintOpts
): void => {
  const painted = art('prop', 'lever-post', o)
  if (painted) {
    const { w, h } = LEVER_ART.post
    ctx.drawImage(painted, -w / 2 * r, 0, w * r, h * r)
    return
  }
  ctx.fillStyle = '#3b424e'
  roundRect(ctx, -r * 0.9, r * 0.1, r * 1.8, r * 0.7, r * 0.18)
  ctx.fill()
  ctx.lineWidth = Math.max(1.4, scale * 0.045)
  ctx.strokeStyle = '#171b22'
  ctx.stroke()
}

/**
 * The lever's ARM, drawn from the pivot, authored pointing UP.
 *
 * The caller has already rotated to the swing, so this is the arm at rest and
 * the renderer turns it — the same deal the rounds get.
 *
 * The KNOB is not here. It is the colour channel of the whole beat (red while
 * the lever is live, green once it is pulled) and it breathes on its own clock,
 * so the painting leaves an EMPTY socket at the top of the arm and `drawLevers`
 * lights it. The drawn arm strokes that socket too, so the reference the
 * painting is registered against has the hole in the same place.
 */
export const paintLeverArm = (
  ctx: CanvasRenderingContext2D, r: number, o?: PaintOpts
): void => {
  const painted = art('prop', 'lever-arm', o)
  if (painted) {
    const { w, h, pivot } = LEVER_ART.arm
    ctx.drawImage(painted, -w / 2 * r, -(h - pivot) * r, w * r, h * r)
    return
  }
  ctx.strokeStyle = '#8e99a8'
  ctx.lineWidth = Math.max(2, r * 0.3)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  // Stops at the socket's lower wall rather than running up through it: the
  // knob hides the difference in play, and the REFERENCE has to show a socket
  // with nothing in it or a painter fills it in.
  ctx.lineTo(0, -r * 1.2)
  ctx.stroke()
  // The empty socket the knob is lit inside.
  ctx.strokeStyle = 'rgba(10,12,16,0.85)'
  ctx.lineWidth = Math.max(1.2, r * 0.13)
  ctx.beginPath()
  ctx.arc(0, -r * 1.6, r * 0.46, 0, Math.PI * 2)
  ctx.stroke()
}

/**
 * The powder keg's BODY in `(-r, -r, 2r, 2r)`; the drum itself is 0.8 of that
 * wide. Read in three states: intact, damaged and LIT, and the lit strobe's
 * RATE is the tell rather than its colour — so on a painting the strobe is a
 * white wash over the drum and the damage is the crack lines the crates wear.
 */
export const paintBarrelBody = (
  ctx: CanvasRenderingContext2D, r: number, scale: number,
  lit: boolean, flash: number, hurt: number, o?: PaintOpts
): void => {
  const painted = art('prop', 'barrel', o)
  if (painted) {
    ctx.drawImage(painted, -r, -r, r * 2, r * 2)
    if (hurt > 0.25) {
      ctx.strokeStyle = `rgba(20,10,4,${0.4 + hurt * 0.5})`
      ctx.lineWidth = Math.max(1, r * 0.07)
      ctx.beginPath()
      ctx.moveTo(-r * 0.45, -r * 0.7)
      ctx.lineTo(-r * 0.1, -r * 0.05)
      ctx.lineTo(-r * 0.35, r * 0.55)
      if (hurt > 0.6) {
        ctx.moveTo(r * 0.4, -r * 0.5)
        ctx.lineTo(r * 0.08, r * 0.25)
      }
      ctx.stroke()
    }
    if (lit) {
      ctx.globalAlpha = 0.25 + flash * 0.6
      ctx.fillStyle = '#fff3d0'
      roundRect(ctx, -r * 0.8, -r, r * 1.6, r * 2, r * 0.28)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    return
  }

  // The drum.
  const body = lit
    ? `rgb(${180 + flash * 75}, ${70 + flash * 150}, ${60 + flash * 140})`
    : '#5a3428'
  ctx.fillStyle = body
  roundRect(ctx, -r * 0.8, -r, r * 1.6, r * 2, r * 0.28)
  ctx.fill()
  ctx.lineWidth = Math.max(1.5, scale * 0.05)
  ctx.strokeStyle = '#20140f'
  ctx.stroke()

  // Two hazard bands. They CRACK as the barrel takes rounds — the damage read
  // is on the prop itself, not on a bar floating over it.
  ctx.fillStyle = lit ? '#fff3d0' : '#c8341f'
  for (const by of [-r * 0.42, r * 0.28]) {
    ctx.globalAlpha = 1 - hurt * 0.55
    ctx.fillRect(-r * 0.8, by, r * 1.6, r * 0.3)
  }
  ctx.globalAlpha = 1

  // The stencil: a fuse-and-spark mark, so the prop says "explosive" without a
  // word of copy in any of the twenty-one languages this ships in.
  ctx.strokeStyle = lit ? '#3a1a0c' : '#f0d59a'
  ctx.lineWidth = Math.max(1.2, scale * 0.032)
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.1)
  ctx.lineTo(0, -r * 0.62)
  ctx.moveTo(-r * 0.22, -r * 0.5)
  ctx.lineTo(r * 0.22, -r * 0.5)
  ctx.stroke()
}

/**
 * A boulder's lump, `w` by `h`, straddling its box by up to 8% the way the
 * jittered polygon does. Three paintings, picked by the rock's own seed, so a
 * rank of four reads as four rocks rather than one shape repeated.
 */
export const paintBoulder = (
  ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, o?: PaintOpts
): void => {
  const painted = art('prop', `boulder-${1 + (Math.abs(seed) % 3)}`, o)
  if (painted) {
    ctx.drawImage(painted, -w * 0.54, -h * 0.54, w * 1.08, h * 1.08)
    return
  }

  // The lump. Eight points on an ellipse, pushed in and out by a hash of the
  // body's seed — deterministic per rock, so it never shimmers frame to frame.
  const pts = 8
  ctx.beginPath()
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2
    const n = ((Math.sin((seed + i * 37) * 12.9898) * 43758.5453) % 1 + 1) % 1
    const rr = 0.78 + n * 0.3
    const x = Math.cos(a) * w * 0.5 * rr
    const y = Math.sin(a) * h * 0.5 * rr
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()

  // Only the polygon is per-rock; the shading ramp spans `ROCK_H * scale`,
  // which is the same for every boulder on screen.
  let body = getRamp(`rockBody|${h}`)
  if (!body) {
    body = putRamp(`rockBody|${h}`, ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5))
    body.addColorStop(0, '#8f97a6')
    body.addColorStop(0.45, '#5c6472')
    body.addColorStop(1, '#333a46')
  }
  ctx.fillStyle = body
  ctx.fill()
  ctx.strokeStyle = 'rgba(16,20,28,0.9)'
  ctx.lineWidth = Math.max(1.6, h * 0.09)
  ctx.stroke()

  // Two fracture lines. Cheap, and they are what makes it read as stone
  // rather than as a potato.
  ctx.strokeStyle = 'rgba(20,24,32,0.55)'
  ctx.lineWidth = Math.max(1, h * 0.05)
  ctx.beginPath()
  ctx.moveTo(-w * 0.22, -h * 0.3)
  ctx.lineTo(w * 0.04, h * 0.06)
  ctx.lineTo(-w * 0.1, h * 0.34)
  ctx.moveTo(w * 0.3, -h * 0.16)
  ctx.lineTo(w * 0.12, h * 0.1)
  ctx.stroke()

  // Lit crown.
  ctx.strokeStyle = 'rgba(210,220,236,0.5)'
  ctx.lineWidth = Math.max(1, h * 0.06)
  ctx.beginPath()
  ctx.arc(0, 0, Math.min(w, h) * 0.42, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
}

/**
 * A barricade's BODY: `w` by `h` with rounded corners, the painting tiled
 * across it in `h`-sized squares so a 1:1 stone bitmap does not stretch into a
 * smear on a three-unit-wide block. The chevrons, the bar and the number are
 * drawn over it.
 */
export const paintBarricadeBody = (
  ctx: CanvasRenderingContext2D, w: number, h: number, o?: PaintOpts
): void => {
  const painted = art('prop', 'barricade', o) ?? (o?.procedural ? null : propImage('barricade'))
  if (painted) {
    const tile = h
    ctx.save()
    roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.14)
    ctx.clip()
    for (let x = -w / 2; x < w / 2; x += tile) {
      ctx.drawImage(painted, x, -h / 2, Math.min(tile, w / 2 - x), h)
    }
    ctx.restore()
    return
  }
  // Height is frame-constant; width comes from the block, which is drawn
  // from a small set of lane spans — so this keys exactly and still hits.
  // If a future generator makes widths continuous the key simply stops
  // matching and the site degrades to what it did before, capped by
  // `MAX_RAMPS` rather than growing.
  const key = `barricadeBody|${w}|${h}`
  let body = getRamp(key)
  if (!body) {
    body = putRamp(key, ctx.createLinearGradient(-w / 2, -h / 2, w * 0.2, h / 2))
    body.addColorStop(0, '#767e88')
    body.addColorStop(0.5, '#4a5058')
    body.addColorStop(1, '#2a2f36')
  }
  ctx.fillStyle = body
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.14)
  ctx.fill()
}

// The gate frame painting's own geometry lives in `game/artBoxes.ts` — shared
// with the art manifest, which must load without the renderer.
export { GATE_FRAME }

/**
 * A gate leaf's FRAME: two posts and, painted, whatever spans them.
 *
 * The curtain, the chevrons, the plate and the charge meter are all live —
 * they animate, they carry a number, they change colour with the op — so the
 * painting only ever holds the standing ironwork. It is one image per op at
 * the two-leaf width and NINE-SLICED across the leaf it is drawn on: the two
 * post caps are blitted at their true size and the span between them is
 * stretched, so a three-leaf bank's narrow doors get the same posts as a
 * two-leaf bank's wide ones rather than a squashed copy.
 *
 * `halfW` and `height` are in px. The hot spark at the post's foot is the
 * caller's, since it is additive and quality-gated.
 */
export const paintGateFrame = (
  ctx: CanvasRenderingContext2D, op: GateOp, halfW: number, height: number,
  scale: number, o?: PaintOpts & { postW?: number }
): void => {
  const painted = art('gate', `frame-${op}`, o)
  if (painted) {
    const u = scale / GATE_FRAME.ppu
    const edge = (GATE_FRAME.w / 2 - GATE_FRAME.refHalfW * GATE_FRAME.ppu) * u
    const cap = GATE_FRAME.cap * u
    const H = GATE_FRAME.h * u
    const y0 = -H / 2
    const x0 = -halfW - edge
    const x1 = halfW + edge
    // The cut is a FRACTION of the file that arrived, never `GATE_FRAME`'s own
    // pixels. The slicer writes this at whatever the manifest's cap allows —
    // 256 px tall by default, not the reference's 576 — so a run at the default
    // size put the right-hand cut (1084 px) clean past the end of a 597 px
    // bitmap: no right post at all, the left cap eating two fifths of the
    // painting, and the whole frame squashed into the top 44% of its box. It
    // only ever looked right when the file happened to come back at exactly the
    // reference size. Same rule `blitBanner` slices the result banner by.
    const sw = painted.width
    const sh = painted.height
    const sc = Math.round((GATE_FRAME.cap / GATE_FRAME.w) * sw)
    ctx.drawImage(painted, 0, 0, sc, sh, x0, y0, cap, H)
    ctx.drawImage(painted, sw - sc, 0, sc, sh, x1 - cap, y0, cap, H)
    const midW = (x1 - cap) - (x0 + cap)
    if (midW > 0.5) ctx.drawImage(painted, sc, 0, sw - 2 * sc, sh, x0 + cap, y0, midW, H)
    return
  }

  const bad = op === 'div'
  const tint = GATE_TINT[op]
  // Posts. One ramp for both sides, built at the origin and placed with a
  // translate rather than rebuilt at each post's own x.
  const postKey = `gatePost|${op}|${scale}`
  let post = getRamp(postKey)
  if (!post) {
    post = putRamp(postKey, ctx.createLinearGradient(-scale * 0.1, 0, scale * 0.1, 0))
    post.addColorStop(0, '#20242e')
    post.addColorStop(0.45, tint.a)
    post.addColorStop(1, tint.b)
  }
  // `postW` is the art bench's: the reference draws each post as wide as the
  // game can hide under a divider pillar — the band a painting is registered
  // onto — so a painter matches a heavy post instead of inventing one. It
  // grows OUTWARD from the door's edge; the inner face never moves. In play
  // the drawn post is its own 0.18 units.
  const outer = (o?.postW ?? 0.18) - 0.09
  for (const side of [-1, 1] as const) {
    const px = side * halfW
    ctx.save()
    ctx.translate(px, 0)
    ctx.fillStyle = post
    ctx.fillRect(side < 0 ? -outer * scale : -scale * 0.09, -height / 2 - scale * 0.12,
      (outer + 0.09) * scale, height + scale * 0.24)

    if (bad) {
      // A chunk blown out of the top of the post and a snapped stub above the
      // gap. A broken frame is a thing that has already failed somebody.
      ctx.fillStyle = 'rgba(8,6,8,0.95)'
      ctx.beginPath()
      ctx.moveTo(-scale * 0.1, -height / 2 + scale * 0.1)
      ctx.lineTo(scale * 0.1, -height / 2 - scale * 0.02)
      ctx.lineTo(scale * 0.1, -height / 2 - scale * 0.14)
      ctx.lineTo(-scale * 0.1, -height / 2 - scale * 0.14)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#3a1a14'
      ctx.fillRect(-side * scale * 0.03, -height / 2 - scale * 0.3, scale * 0.06, scale * 0.16)
    }
    ctx.restore()
  }
}

/**
 * A divider pillar's BODY: the striped post with its steel caps, in the box
 * `(-1.25 halfPx, -0.6 h) … (1.25 halfPx, 0.6 h)`. The warning glow, the hot
 * overlay, the beacon and the toppling are the caller's.
 */
export const paintPillarBody = (
  ctx: CanvasRenderingContext2D, halfPx: number, h: number, scale: number,
  pattern: CanvasPattern | null, o?: PaintOpts
): void => {
  const painted = art('prop', 'pillar', o)
  if (painted) {
    ctx.drawImage(painted, -halfPx * 1.25, -h / 2 - h * 0.1, halfPx * 2.5, h * 1.26)
    return
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
}

/**
 * How much bigger than the sphere the roller's painting is blitted.
 *
 * The drawn ball IS its box, and a painting of a spiked iron ball has nowhere
 * to put the spikes: they either cross the frame edge or the painter shrinks
 * the ball to fit them in. So the sphere sits at 1/1.3 of the file and the
 * spikes get the margin — the file is blitted this much larger than the
 * kill radius, and the sphere inside it lands exactly on it.
 */
export const ROLLER_ART_PAD = 1.3

/**
 * The rolling ball, at the origin, radius `r`. The contact shadow and the lane
 * it owns are the caller's. A painting keeps the drawn banding over it: the
 * bands scroll with the distance travelled, which is what stops a sphere
 * reading as sliding, and a still cannot carry that on its own.
 */
export const paintRollerBall = (
  ctx: CanvasRenderingContext2D, r: number, spin: number, scale: number,
  cheap: boolean, o?: PaintOpts
): void => {
  const c01 = (((o?.cycle ?? 0) % 1) + 1) % 1
  const cel = artCel('round', 'roller', o)

  // No trail on this one, and that is the correction rather than an omission.
  //
  // A flame streaming off a rolling STONE was the wrong verb to begin with —
  // this elite grinds, it is not thrown — and the plume reached `r * 2.2` out
  // of a panel whose edge is at `ROLLER_ART_PAD` = 1.3, so on the reference
  // sheet it crossed into the panel above and broke the one rule the cycle
  // prompt insists on. What sells the roll is the SURFACE turning, below.

  if (cel) {
    const R = r * ROLLER_ART_PAD
    ctx.drawImage(cel.frame, -R, -R, R * 2, R * 2)
  } else {
    // ── The spikes, behind the ball ──
    //
    // The blurb has called this a spiked ball since the day it was written and
    // the drawing never had a single spike on it, so the reference sheet was a
    // bare banded sphere and the painter had to INVENT them. Having invented
    // them it also had to guess how far they reach — `ROLLER_ART_PAD` exists to
    // reserve exactly that margin — and, worst of all, nothing in front of it
    // said the studs belong to the SURFACE. So they came back pinned in place
    // while the ironwork slid underneath, which is a striped sphere with a
    // slide on it rather than a ball that rolls.
    //
    // Fixed in angle, unlike the studs on the face below: the silhouette of a
    // ball rolling straight at the viewer barely changes, and spikes that
    // crawled around the rim would read as a ball spinning on the spot.
    if (!cheap) {
      const tip = r * (ROLLER_ART_PAD - 0.04)
      const half = (Math.PI / ROLLER_RIM_SPIKES) * 0.42
      ctx.beginPath()
      for (let i = 0; i < ROLLER_RIM_SPIKES; i++) {
        const a = (i / ROLLER_RIM_SPIKES) * Math.PI * 2
        ctx.moveTo(Math.cos(a - half) * r * 0.94, Math.sin(a - half) * r * 0.94)
        ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip)
        ctx.lineTo(Math.cos(a + half) * r * 0.94, Math.sin(a + half) * r * 0.94)
        ctx.closePath()
      }
      ctx.fillStyle = '#4a5058'
      ctx.fill()
      ctx.strokeStyle = '#10131a'
      ctx.lineWidth = Math.max(1.5, scale * 0.05)
      ctx.stroke()
    }
    // Built per frame rather than cached in `getRamp`: there are never more
    // than a couple of these on screen, so the two allocations are not the
    // frame's problem.
    const shade = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r)
    shade.addColorStop(0, '#9aa4b2')
    shade.addColorStop(0.45, '#5d6672')
    shade.addColorStop(1, '#232830')
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Banding that turns with the roll. The spin is derived from how far the
  // ball has actually travelled (`phase` accumulates with time and the speed
  // is constant), so it can never look like it is sliding.
  // ── The rings that sell the roll ──
  //
  // Skipped entirely when the drop-in is an animated strip: eight painted
  // frames of a turning ball ARE the roll, and scrolling a second set of bands
  // over baked-in ironwork is what made the first painted roller read as a
  // static ball with some dirt on it.
  //
  // Drawn HARDER than they were (0.28 alpha of a thin dark line, which was
  // invisible at play size and — worse — invisible on the reference sheet, so
  // the painter had nothing to copy). A ring now has a shaded side and a lit
  // side, which is what makes it read as a band wrapping a sphere rather than
  // as a line ruled across a disc.
  if (!cheap && !cel?.animated) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2)
    ctx.clip()
    ctx.lineWidth = Math.max(2, scale * 0.11)
    for (let i = 0; i < ROLLER_BANDS_ON_FACE; i++) {
      // ── Where the band sits, in ANGLE rather than in screen y ──
      //
      // This is the difference between a ball and a barber's pole, and getting
      // it wrong is what two painted returns copied. Every band used to be the
      // same ellipse — `r * 0.98` wide whatever its height — translated down
      // the face in even steps. Four identical stripes sliding at a constant
      // rate across a disc is not a sphere turning; it has no horizon, nothing
      // narrows, nothing bunches, and a painter shown that paints exactly that.
      //
      // A band is a parallel on the ball, so `off` is read as its LATITUDE:
      // the height is `sin`, the width is `cos`. It therefore narrows to
      // nothing as it wraps over the top and bottom edges, and — because even
      // steps in angle are uneven steps in y — the bands crowd together near
      // those edges and stretch apart across the middle. That crowding IS the
      // read: it is the only cue in the picture that says the surface is
      // curving away rather than scrolling past.
      const off = (((spin + i * ROLLER_SPIN_PER_LOOP) % 2) + 2) % 2 - 1
      const lat = off * Math.PI * 0.5
      const y = Math.sin(lat) * r
      const halfW = Math.cos(lat) * r * 0.98
      // The band's own thickness foreshortens with it, so it stays a hoop
      // lying on the surface instead of a ring hovering over the silhouette.
      const halfH = Math.cos(lat) * r * 0.2
      // …and it fades out as it reaches the edge, where a hoop on a sphere
      // turns away from the viewer entirely.
      const edge = Math.cos(lat) ** 1.5
      if (halfW < 1 || halfH < 0.5) continue
      ctx.globalAlpha = 0.18 + 0.42 * edge
      ctx.strokeStyle = '#141820'
      ctx.beginPath()
      ctx.ellipse(0, y, halfW, halfH, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.12 + 0.32 * edge
      ctx.strokeStyle = '#c2cfe0'
      ctx.beginPath()
      ctx.ellipse(0, y - r * 0.045 * Math.cos(lat), halfW, halfH, 0, 0, Math.PI * 2)
      ctx.stroke()

      // ── Rivets, riding the band ──
      //
      // The one thing that makes the turn unarguable, and the thing the blurb
      // has always asked for. A stripe sliding down a face can be read as a
      // texture scrolling past; a row of OBJECTS that climbs over the top edge,
      // crosses the face spreading apart and then closing up, and drops off the
      // bottom cannot be read as anything but a surface turning.
      //
      // They are on the same clock as the band they sit on — one surface
      // moving, not two — and they carry the foreshortening twice over: spaced
      // by `sin` across the band so they crowd at its left and right ends, and
      // sized by `cos` so the ones near the silhouette are the smallest.
      for (let k = 0; k < ROLLER_RIVETS_PER_BAND; k++) {
        const lon = (-1 + (2 * k) / (ROLLER_RIVETS_PER_BAND - 1)) * Math.PI * 0.42
        const depth = Math.cos(lon)
        const rr = r * 0.05 * depth * Math.cos(lat)
        if (rr < 0.7) continue
        ctx.globalAlpha = (0.3 + 0.5 * edge) * depth
        ctx.fillStyle = '#b3bfcf'
        ctx.beginPath()
        ctx.arc(Math.sin(lon) * halfW, y - halfH * 0.12, rr, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }
  // A painted ball brings its own rim light and outline.
  if (cel) return

  // Rim light along the leading edge, and a hard outline so the silhouette
  // survives on top of a bright road.
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = '#c9d6e6'
  ctx.lineWidth = Math.max(2, scale * 0.07)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.93, Math.PI * 0.15, Math.PI * 0.85)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#10131a'
  ctx.lineWidth = Math.max(2, scale * 0.06)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
}

/**
 * The box a round in flight is painted in, in radii of its head: eight
 * across, the head's centre 5.6 in from the tail end. A painted round is
 * authored pointing RIGHT with its tail to the left and turned to its heading
 * here — one still covers every direction.
 */
export const ROUND_BOX = { side: 8, head: 5.6 } as const

/** Turn the context to a screen heading given a WORLD velocity (y up). */
const faceHeading = (ctx: CanvasRenderingContext2D, vx: number, vy: number): void => {
  ctx.rotate(Math.atan2(-vy, vx))
}

/**
 * The gunner's round, at the origin: head radius `r`, travelling along the
 * world direction `(dx, dy)`. The head is drawn at `BOLT_R`, the radius the
 * kill is measured against, so what the player sees is what hits.
 */
export const paintGunnerBolt = (
  ctx: CanvasRenderingContext2D, r: number, dx: number, dy: number, scale: number,
  cheap: boolean, o?: PaintOpts
): void => {
  const c01 = (((o?.cycle ?? 0) % 1) + 1) % 1
  const cel = artCel('round', 'bolt-gunner', o)

  // The burn, streaming back up the round's own line. `faceHeading` puts
  // travel along +X and the flame streams along local −Y, so a quarter turn
  // points it backwards.
  const trail = (): void => {
    ctx.save()
    faceHeading(ctx, dx, dy)
    ctx.rotate(-Math.PI / 2)
    paintTrailFlame(ctx, r * 0.85, r * 6, c01, 7, '#d8f6ff', '#2f9ad8', cheap)
    ctx.restore()
  }

  // ── One glow, not two ──
  //
  // The wake is only drawn HERE, on the two paths that have no glow of their
  // own: a frozen painted still, and… nothing. The fully procedural body below
  // already ends in a halo and a core, and adding a corona on top of it was
  // measured on the reference sheet — the round came back as a flat grey-green
  // disc with the trail washed out inside it, which is what two additive glows
  // over one another always look like. So the procedural path gets the flame
  // and lets its OWN halo breathe on the cycle instead.
  if (cel) {
    if (!cel.animated) {
      paintFlightAura(ctx, r, c01, 2, '#eafcff', '#4fc9ff', cheap)
      trail()
    }
    ctx.save()
    faceHeading(ctx, dx, dy)
    ctx.drawImage(cel.frame, -ROUND_BOX.head * r, -ROUND_BOX.side * r / 2,
      ROUND_BOX.side * r, ROUND_BOX.side * r)
    ctx.restore()
    return
  }
  trail()
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // Halo then core: one flat disc reads as a sticker, two read as something
  // burning through the air. The halo BREATHES on the loop — it is the round's
  // own glow doing what the extra corona was added to do, without being a
  // second glow.
  const beat = Math.sin(TAU * c01)
  ctx.globalAlpha = 0.5 + beat * 0.12
  ctx.fillStyle = '#8fe4ff'
  ctx.beginPath()
  ctx.arc(0, 0, r * (2.0 + beat * 0.2), 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.95
  ctx.fillStyle = '#eafcff'
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // …and a dark core with an outline, so it stays a solid OBJECT against the
  // crowd rather than a patch of light that could be mistaken for a friendly
  // effect.
  ctx.save()
  ctx.fillStyle = '#0d2b3a'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#bff0ff'
  ctx.lineWidth = Math.max(2, scale * 0.05)
  ctx.stroke()
  ctx.restore()
}

/**
 * The healer's bolt, at the origin, travelling along the world velocity. The
 * ground shadow is the caller's.
 */
export const paintBossBolt = (
  ctx: CanvasRenderingContext2D, r: number, vx: number, vy: number, pulse: number,
  cheap: boolean, o?: PaintOpts
): void => {
  const c01 = (((o?.cycle ?? 0) % 1) + 1) % 1
  const cel = artCel('round', 'bolt-boss', o)

  // The bolt's LINE is the thing the player has to step off, so the trail is
  // what carries it — animated, and back along the heading.
  const trail = (): void => {
    ctx.save()
    faceHeading(ctx, vx, vy)
    ctx.rotate(-Math.PI / 2)
    paintTrailFlame(ctx, r * 0.8, r * 5.5, c01, 13, '#bdffd6', '#2fb865', cheap)
    ctx.restore()
  }

  // ── One glow, not two ──
  //
  // The wake is only drawn HERE, on the two paths that have no glow of their
  // own: a frozen painted still, and… nothing. The fully procedural body below
  // already ends in a halo and a core, and adding a corona on top of it was
  // measured on the reference sheet — the round came back as a flat grey-green
  // disc with the trail washed out inside it, which is what two additive glows
  // over one another always look like. So the procedural path gets the flame
  // and lets its OWN halo breathe on the cycle instead.
  if (cel) {
    if (!cel.animated) {
      paintFlightAura(ctx, r, c01, 4, '#eafff0', '#3ad97a', cheap)
      trail()
    }
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    faceHeading(ctx, vx, vy)
    ctx.drawImage(cel.frame, -ROUND_BOX.head * r, -ROUND_BOX.side * r / 2,
      ROUND_BOX.side * r, ROUND_BOX.side * r)
    ctx.restore()
    return
  }
  trail()
  ctx.globalCompositeOperation = 'lighter'
  // Halo and core, breathing on the loop as well as on the caller's `pulse`,
  // so it is unmistakably a live thing.
  ctx.globalAlpha = 0.45 + Math.sin(TAU * c01) * 0.12
  ctx.fillStyle = '#3ad97a'
  ctx.beginPath()
  ctx.arc(0, 0, r * 2.0 * pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.95
  ctx.fillStyle = '#eafff0'
  ctx.beginPath()
  ctx.arc(0, 0, r * pulse, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * The box the falling rock is painted in, in radii of the stone: nine tall,
 * the stone's centre 7.5 down from the top, the fire tail streaming UP from
 * it — the rock falls down the screen. The drawn tail reaches about 7.6
 * radii above the stone, so this leaves it a hair of air rather than cutting
 * it flat at the edge.
 */
export const METEOR_BOX = { side: 9, centre: 7.5 } as const

/** The boss's rock, mid-fall, at the origin. */
export const paintMeteorRock = (
  ctx: CanvasRenderingContext2D, rockR: number, big: boolean, scale: number,
  cheap: boolean, o?: PaintOpts
): void => {
  const c01 = (((o?.cycle ?? 0) % 1) + 1) % 1
  const cel = artCel('round', 'meteor', o)

  // ── The fire ──
  //
  // Drawn UNDER the stone, and skipped entirely when the drop-in is a painted
  // STRIP: eight painted frames already are the flame, and a second live plume
  // over them is two fires burning at different rates on one rock. A painted
  // STILL is frozen, so it keeps the live fire — see `artCel`.
  if (!cel || !cel.animated) {
    paintTrailFlame(
      ctx, rockR, scale * (big ? 7.5 : 4.6), c01, big ? 3 : 11,
      big ? '#ffb648' : '#ff9a3c', big ? '#ff4a12' : '#ff6a24', cheap
    )
    if (!cheap) paintEmbers(ctx, rockR, scale * (big ? 8.5 : 5.4), c01, big ? 5 : 17, '#ffd08a')
  }

  if (cel) {
    const s = METEOR_BOX.side * rockR
    ctx.drawImage(cel.frame, -s / 2, -METEOR_BOX.centre * rockR, s, s)
    return
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // Halo, then a white-hot core: two passes, because one flat glow reads
  // as a sticker and two read as something burning. Both FLARE on the loop —
  // a shell of fire around a falling stone does not hold one brightness, and
  // on the reference sheet it is the second thing (after the tail) that tells
  // a painter these eight panels are eight moments and not eight copies.
  const flare = 0.5 + 0.5 * Math.sin(TAU * (c01 + 0.25))
  ctx.globalAlpha = 0.4 + flare * 0.22
  ctx.fillStyle = big ? '#ff9a3c' : '#ffbe72'
  ctx.beginPath()
  // Capped at the 2.2 the halo has always been: `METEOR_BOX` leaves only 1.5
  // radii of panel under the stone, so a halo that flares past 2.2 is cut flat
  // by the panel edge — and a flat-bottomed halo in a REFERENCE is a
  // flat-bottomed halo in the painting that comes back from it.
  ctx.arc(0, 0, rockR * (2.0 + flare * 0.2), 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = '#fff0c4'
  ctx.beginPath()
  ctx.arc(0, 0, rockR * (1.15 + flare * 0.22), 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  // The stone, dark against its own fire so it reads as a solid object
  // and not as a light.
  ctx.globalAlpha = 1
  ctx.fillStyle = big ? '#4a2415' : '#4b3a2c'
  ctx.beginPath()
  ctx.arc(0, 0, rockR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#170a04'
  ctx.lineWidth = Math.max(2, scale * 0.06)
  ctx.stroke()
  ctx.restore()
}

/**
 * The bomber's charge at the origin: a glow of `glowR` around a body of
 * `bodyR`. Painted in a box 4.4 body radii square. The spark walking down the
 * fuse is the caller's.
 */
export const paintBombCharge = (
  ctx: CanvasRenderingContext2D, bodyR: number, glowR: number, o?: PaintOpts
): void => {
  const c01 = (((o?.cycle ?? 0) % 1) + 1) % 1
  const cel = artCel('round', 'bomb', o)

  // The charge is burning down, so it gets the flame rather than the aura.
  if (!cel || !cel.animated) {
    paintTrailFlame(ctx, bodyR * 0.7, bodyR * 2.6, c01, 23, '#ffd88a', '#ff5a1e', false)
  }

  if (cel) {
    ctx.globalAlpha = 1
    ctx.drawImage(cel.frame, -bodyR * 2.2, -bodyR * 2.2, bodyR * 4.4, bodyR * 4.4)
    return
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = '#ff7a30'
  ctx.beginPath()
  ctx.arc(0, 0, glowR, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#2a1a14'
  ctx.beginPath()
  ctx.arc(0, 0, bodyR, 0, Math.PI * 2)
  ctx.fill()
}

/** The player's grenade body at the origin, already turned to its tumble. */
export const paintGrenadeBody = (
  ctx: CanvasRenderingContext2D, r: number, scale: number, o?: PaintOpts
): void => {
  const painted = art('round', 'grenade', o)
  if (painted) {
    ctx.drawImage(painted, -r * 1.3, -r * 1.3, r * 2.6, r * 2.6)
    return
  }
  ctx.fillStyle = '#46536a'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  // A band across the body, so the tumble is visible rather than implied.
  ctx.fillStyle = '#2b3446'
  ctx.fillRect(-r, -r * 0.16, r * 2, r * 0.32)
  ctx.strokeStyle = '#141a26'
  ctx.lineWidth = Math.max(1.2, scale * 0.035)
  ctx.stroke()
}

/**
 * The tracer's look for a run's fire rate. The two colours brighten with the
 * rate and are built ONCE per pass — a template literal inside the bullet loop
 * would be an allocation per bullet per frame.
 */
export const tracerStyle = (heat: number, scale: number, hot = false): {
  outer: string; coreW: number; outerW: number; len: number
} => ({
  // ── The gatling fires a different COLOUR, not a brighter one ──
  //
  // `heat` alone used to carry this: the gatling pushed the same gold tracer
  // further up its own curve, which makes it whiter and does not make it
  // recognisable. A playtest tester asked to be told what weapon he was
  // holding; the answer is that he should be able to see it in the air, and a
  // hotter gold against gold is not something anyone sees mid-run.
  //
  // So a gatling round is RED — the hue swings down toward the ember the game
  // uses for fire, while the alpha and the geometry stay exactly where they
  // were, because the round has not changed size or brightness, only identity.
  outer: hot
    ? `rgba(255,${Math.round(96 + heat * 46)},${Math.round(54 + heat * 26)},${0.4 + heat * 0.3})`
    : `rgba(255,${Math.round(214 + heat * 30)},${Math.round(120 + heat * 90)},${0.35 + heat * 0.3})`,
  coreW: Math.max(1, scale * (0.045 + heat * 0.02)),
  outerW: Math.max(2, scale * (0.1 + heat * 0.03)),
  len: scale * 0.55
})

/**
 * ONE tracer, at the origin, pointing down the screen from it — the reference
 * the painted round is made from. The battlefield batches every tracer into
 * two path submissions instead (see `drawBullets`), which draws this exact
 * geometry; a painted tracer is blitted into the `len`-square box this fills.
 */
export const paintTracerRef = (
  ctx: CanvasRenderingContext2D, heat: number, scale: number
): void => {
  const st = tracerStyle(heat, scale)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.strokeStyle = st.outer
  ctx.lineWidth = st.outerW
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, st.len)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,235,0.95)'
  ctx.lineWidth = st.coreW
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, st.len * 0.6)
  ctx.stroke()
  ctx.restore()
}

// The box a painted rocket is blitted into — in `game/artBoxes.ts`, for the
// same reason as `GATE_FRAME`.
export { ROCKET_BOX }

/**
 * The launcher's rocket at the origin, nose up (−y), `rr` the shell's radius;
 * the caller has already turned the context to the round's heading.
 *
 * The drawing is light — a hot shell and a plume — and the battlefield draws
 * it additively with the tracers. A painting is an OBJECT with a dark iron
 * shell, and dark adds nothing under `lighter`, so it is blitted source-over.
 */
export const paintRocketBody = (ctx: CanvasRenderingContext2D, rr: number, o?: PaintOpts): void => {
  const painted = art('round', 'rocket', o)
  if (painted) {
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(painted, -ROCKET_BOX.w / 2 * rr, -ROCKET_BOX.top * rr, ROCKET_BOX.w * rr, ROCKET_BOX.h * rr)
    ctx.restore()
    return
  }
  // The plume, trailing back behind it.
  ctx.strokeStyle = 'rgba(255,150,50,0.5)'
  ctx.lineWidth = rr * 1.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, rr)
  ctx.lineTo(0, rr * 3.6)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,236,190,0.95)'
  ctx.beginPath()
  ctx.ellipse(0, 0, rr * 0.8, rr * 1.7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,120,40,0.9)'
  ctx.beginPath()
  ctx.ellipse(0, rr * 1.1, rr * 0.55, rr * 1.1, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** The muzzle flash's ramp, keyed on the two numbers that shape it. */
export const muzzleRamp = (
  ctx: CanvasRenderingContext2D, flashY: number, flashR: number
): CanvasGradient => {
  const flashKey = `muzzle|${flashY}|${flashR}`
  let ramp = getRamp(flashKey)
  if (!ramp) {
    ramp = putRamp(flashKey, ctx.createRadialGradient(0, flashY, 0, 0, flashY, flashR))
    ramp.addColorStop(0, 'rgba(255,244,200,0.95)')
    ramp.addColorStop(0.4, 'rgba(255,180,60,0.5)')
    ramp.addColorStop(1, 'rgba(255,120,20,0)')
  }
  return ramp
}

/**
 * A muzzle flash: a disc of `flashR` centred `flashY` above the survivor's
 * feet, additive. The caller owns the blend mode and the fade.
 */
export const paintMuzzleFlash = (
  ctx: CanvasRenderingContext2D, flashY: number, flashR: number, ramp: CanvasGradient,
  o?: PaintOpts
): void => {
  const painted = art('fx', 'muzzle', o)
  if (painted) {
    ctx.drawImage(painted, -flashR, flashY - flashR, flashR * 2, flashR * 2)
    return
  }
  ctx.fillStyle = ramp
  ctx.beginPath()
  ctx.arc(0, flashY, flashR, 0, Math.PI * 2)
  ctx.fill()
}

/** A scorch on the road at the origin: `r` wide, squashed to 0.55 on Y. The
 *  fade is the caller's `globalAlpha`. */
export const paintScorch = (ctx: CanvasRenderingContext2D, r: number, o?: PaintOpts): void => {
  const painted = art('fx', 'scorch', o)
  if (painted) {
    ctx.drawImage(painted, -r, -r * 0.55, r * 2, r * 1.1)
    return
  }
  const key = `decal|${r}`
  let ramp = getRamp(key)
  if (!ramp) {
    ramp = putRamp(key, ctx.createRadialGradient(0, 0, 0, 0, 0, r))
    ramp.addColorStop(0, 'rgba(12,10,14,1)')
    ramp.addColorStop(1, 'rgba(12,10,14,0)')
  }
  ctx.fillStyle = ramp
  ctx.beginPath()
  ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** The three ring families the field draws: a gate's blast, an attack about to
 *  land, and a heal gathering. One painting each; the drawn ring keeps its
 *  per-site colour and width. */
export type RingKind = 'shock' | 'heat' | 'heal'

/**
 * How much bigger than its shape a glowing effect's painting is blitted.
 *
 * A ring, the dome and the guard are drawn with their edge AT the box's edge;
 * a painting of them carries a soft glow outside that edge, and a glow that
 * runs off the frame is clipped flat. So the shape sits at 1/1.12 of the
 * file, the glow gets the margin, and the file is blitted this much larger —
 * the ring inside it lands exactly on the radius the kill is measured at.
 */
export const FX_PAD = 1.12

/**
 * A ring at the origin, `rx` by `ry`, painted or stroked in `colour`.
 *
 * A drawn ring carries its fade inside the colour string; a painting cannot,
 * so a site whose colour has an alpha passes the same fade as `alpha` and the
 * painted branch applies it through `globalAlpha` instead.
 */
export const paintRing = (
  ctx: CanvasRenderingContext2D, kind: RingKind, rx: number, ry: number,
  lineW: number, colour: string, o?: PaintOpts & { alpha?: number }
): void => {
  const painted = art('fx', `ring-${kind}`, o)
  if (painted) {
    const was = ctx.globalAlpha
    if (o?.alpha !== undefined) ctx.globalAlpha = was * o.alpha
    const px = rx * FX_PAD
    const py = ry * FX_PAD
    ctx.drawImage(painted, -px, -py, px * 2, py * 2)
    ctx.globalAlpha = was
    return
  }
  ctx.strokeStyle = colour
  ctx.lineWidth = lineW
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
}

/**
 * The shield's DOME — the surface, the honeycomb, the rim and the specular —
 * over the ellipse `(cx, cy, rx, ry)`. Additive throughout; the ground ring
 * under it and the crest over it are the caller's.
 */
export const paintShieldDome = (
  ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number,
  alpha: number, hit: number, cheap: boolean, scale: number, o?: PaintOpts
): void => {
  const painted = art('fx', 'shield', o)
  ctx.globalCompositeOperation = 'lighter'
  if (painted) {
    ctx.globalAlpha = Math.min(1, alpha * 0.9 + hit * 0.4)
    const px = rx * FX_PAD
    const py = ry * FX_PAD
    ctx.drawImage(painted, cx - px, cy - py, px * 2, py * 2)
    ctx.globalCompositeOperation = 'source-over'
    return
  }

  // The surface wash — thin, because the crowd underneath is the thing the
  // player is actually steering and has to stay readable through it.
  ctx.globalAlpha = (0.075 + 0.16 * hit) * alpha
  ctx.fillStyle = '#3fbfff'
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  // Honeycomb, clipped to the bubble. The grid is anchored to the dome itself,
  // so it travels with the crowd instead of swimming across it.
  if (!cheap) {
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = 0.3 * alpha
    ctx.strokeStyle = '#cdf3ff'
    ctx.lineWidth = Math.max(1.2, scale * 0.03)
    const s = rx * 0.24
    const stepX = s * 1.732
    const stepY = s * 1.5
    const cols = Math.ceil(rx / stepX) + 1
    const rows = Math.ceil(ry / stepY) + 1
    ctx.beginPath()
    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const hx = cx + col * stepX + (row & 1 ? stepX / 2 : 0)
        const hy = cy + row * stepY
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          const px = hx + Math.cos(a) * s
          const py = hy + Math.sin(a) * s
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
      }
    }
    // One stroke for the whole grid: thirty separate strokes would be thirty
    // state changes a phone does not need to pay for.
    ctx.stroke()
    ctx.restore()
  }

  // The rim. Bright and thick — this is the edge that reads as a SURFACE, and
  // it is the only part guaranteed to stay visible against muzzle flash.
  ctx.globalAlpha = Math.min(1, 1.05 * alpha)
  ctx.strokeStyle = hit > 0.2 ? '#ffffff' : '#b6f0ff'
  ctx.lineWidth = Math.max(2.5, scale * 0.09)
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()

  // A specular sweep across the upper left: the standard cue that a curved
  // surface is glass rather than a hole.
  if (!cheap) {
    ctx.globalAlpha = 0.5 * alpha
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(1.5, scale * 0.045)
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.82, ry * 0.82, 0, Math.PI * 1.18, Math.PI * 1.62)
    ctx.stroke()
  }

  ctx.globalCompositeOperation = 'source-over'
}

/**
 * The boss's guard barrier: a point-up hexagon `rx` by `ry` centred `cy`
 * below the origin, pulsing on `pulse`. Drawn UNDER the body so the boss
 * stands inside it; the crest goes over it separately.
 */
export const paintGuardHex = (
  ctx: CanvasRenderingContext2D, cy: number, rx: number, ry: number, pulse: number,
  scale: number, o?: PaintOpts
): void => {
  const painted = art('fx', 'guard', o)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  if (painted) {
    ctx.globalAlpha = 0.55 + pulse * 0.35
    const px = rx * FX_PAD
    const py = ry * FX_PAD
    ctx.drawImage(painted, -px, cy - py, px * 2, py * 2)
    ctx.restore()
    return
  }
  ctx.globalAlpha = 0.16 + pulse * 0.14
  ctx.fillStyle = '#ff6a3a'
  guardHexPath(ctx, cy, rx, ry)
  ctx.fill()
  ctx.globalAlpha = 0.5 + pulse * 0.4
  ctx.strokeStyle = '#ffd08a'
  ctx.lineWidth = Math.max(1.5, scale * 0.05)
  guardHexPath(ctx, cy, rx, ry)
  ctx.stroke()
  ctx.restore()
}

/** The two heater-shield crests: the boss's over its guard, the player's
 *  over their bubble. Same silhouette, different colour, so the shape is
 *  learned once. */
export type CrestKind = 'guard' | 'shield'

/**
 * A heater-shield crest centred on `(cx, cy)`, `cw` wide and `ch` tall on
 * each side of the centre. The chief band and the centre rib are the two
 * strokes that turn a blob into heraldry and survive 20 px on a phone.
 */
export const paintCrest = (
  ctx: CanvasRenderingContext2D, kind: CrestKind, cx: number, cy: number,
  cw: number, ch: number,
  style: { fill: string; rim: string; rimW: number; rib: string; ribW: number },
  o?: PaintOpts
): void => {
  const painted = art('fx', `crest-${kind}`, o)
  if (painted) {
    ctx.drawImage(painted, cx - cw, cy - ch, cw * 2, ch * 2)
    return
  }
  // Heater shield: flat top, straight shoulders, tapering to a rounded point.
  ctx.beginPath()
  ctx.moveTo(cx - cw, cy - ch)
  ctx.lineTo(cx + cw, cy - ch)
  ctx.lineTo(cx + cw, cy - ch * 0.05)
  ctx.quadraticCurveTo(cx + cw, cy + ch * 0.62, cx, cy + ch)
  ctx.quadraticCurveTo(cx - cw, cy + ch * 0.62, cx - cw, cy - ch * 0.05)
  ctx.closePath()
  ctx.fillStyle = style.fill
  ctx.fill()
  ctx.lineWidth = style.rimW
  ctx.strokeStyle = style.rim
  ctx.stroke()

  ctx.strokeStyle = style.rib
  ctx.lineWidth = style.ribW
  ctx.beginPath()
  ctx.moveTo(cx - cw * 0.78, cy - ch * 0.46)
  ctx.lineTo(cx + cw * 0.78, cy - ch * 0.46)
  ctx.moveTo(cx, cy - ch * 0.46)
  ctx.lineTo(cx, cy + ch * 0.66)
  ctx.stroke()
}

/**
 * The elite's crown: three points and a base, `cw` wide, standing `ch` tall
 * (1.15 `ch` at the middle point) on the baseline `cy`. The universal "this
 * one is the important one" mark, shared by the foe and the off-screen marker
 * so the two are obviously the same object.
 */
export const paintCrown = (
  ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number,
  lineW: number, o?: PaintOpts
): void => {
  const painted = art('ui', 'crown', o)
  if (painted) {
    ctx.drawImage(painted, cx - cw / 2, cy - ch * 1.15, cw, ch * 1.15)
    return
  }
  ctx.fillStyle = '#ffd24a'
  ctx.strokeStyle = 'rgba(60,34,4,0.9)'
  ctx.lineWidth = lineW
  ctx.beginPath()
  ctx.moveTo(cx - cw / 2, cy)
  ctx.lineTo(cx - cw / 2, cy - ch)
  ctx.lineTo(cx - cw / 6, cy - ch * 0.42)
  ctx.lineTo(cx, cy - ch * 1.15)
  ctx.lineTo(cx + cw / 6, cy - ch * 0.42)
  ctx.lineTo(cx + cw / 2, cy - ch)
  ctx.lineTo(cx + cw / 2, cy)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

/**
 * The road's texture, into a `px`-square context at its origin: gravel,
 * cracks and tyre wear. Used as a repeating pattern.
 *
 * Deliberately NOT a painting. A painted cobble tile was tried through the
 * art pipeline and was worse than this: stones big enough to read at all read
 * as OBJECTS under the crowd, and the ground is the one layer that must never
 * compete with what stands on it. The gravel stays drawn.
 */
export const paintLaneTile = (t: CanvasRenderingContext2D, px: number): void => {
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
}

/**
 * A painted ridge band's own geometry: 4:1, with the ridge line at `line` of
 * its height — sky above it is keyed out, silhouette below it is opaque. The
 * renderer TINTS the silhouette per stage, so the painting is alpha only.
 */
export const RIDGE_BAND = { w: 1536, h: 384, line: 0.4 } as const

/** A silhouette tinted to one colour, cached per (image, colour). */
const tinted = new Map<string, HTMLCanvasElement>()
const tintSilhouette = (img: HTMLImageElement, colour: string): HTMLCanvasElement | null => {
  const key = `${img.src}|${colour}`
  const hit = tinted.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const t = c.getContext('2d')
  if (!t) return null
  t.drawImage(img, 0, 0)
  t.globalCompositeOperation = 'source-in'
  t.fillStyle = colour
  t.fillRect(0, 0, c.width, c.height)
  if (tinted.size >= 16) tinted.clear()
  tinted.set(key, c)
  return c
}

/**
 * Opaque column range of a silhouette, cached per image.
 *
 * A painted ridge does not necessarily reach the edges of the frame it was
 * returned in — `ridge-far` came back with 19 fully transparent columns down
 * each side and `ridge-near` with 29. Stretching the WHOLE frame to the
 * viewport stretches those margins with it, so on a wide screen the silhouette
 * stopped ~37 px short of each edge and the sky showed through in a vertical
 * strip down both sides. Invisible in portrait, where the lane covers the
 * backdrop entirely, and unmissable on a desktop.
 *
 * Measuring the real bounds instead of trusting the frame means the art spans
 * the viewport whatever margin a future re-export happens to carry.
 */
const silhouetteTrim = new Map<string, { x0: number; x1: number }>()

const trimOf = (c: HTMLCanvasElement, key: string): { x0: number; x1: number } => {
  const hit = silhouetteTrim.get(key)
  if (hit) return hit
  // The whole frame, if anything below fails: drawing too much is the old
  // behaviour, and a wrong trim would crop the art.
  let box = { x0: 0, x1: c.width - 1 }
  try {
    const g = c.getContext('2d')
    if (g) {
      const d = g.getImageData(0, 0, c.width, c.height).data
      const columnHasInk = (x: number): boolean => {
        for (let y = 0; y < c.height; y++) if (d[(y * c.width + x) * 4 + 3]! > 16) return true
        return false
      }
      let x0 = 0
      while (x0 < c.width && !columnHasInk(x0)) x0++
      let x1 = c.width - 1
      while (x1 > x0 && !columnHasInk(x1)) x1--
      if (x1 > x0) box = { x0, x1 }
    }
  } catch { /* tainted canvas — fall back to the full frame */ }
  silhouetteTrim.set(key, box)
  return box
}

/**
 * One parallax ridge across a `w`-wide, `h`-tall backdrop: a jagged
 * silhouette wobbling `amp` about `yBase` and filled down to the bottom, in
 * `colour`. Seeded, so it is stable across frames. The painted band is laid
 * with its ridge line on `yBase` and stretched edge to edge, and the ground
 * below it is filled in the same colour so the two join.
 */
export const paintRidge = (
  ctx: CanvasRenderingContext2D, id: 'ridge-far' | 'ridge-near',
  w: number, h: number, yBase: number, amp: number, colour: string, seed: number,
  o?: PaintOpts
): void => {
  const painted = art('bg', id, o)
  if (painted) {
    const band = tintSilhouette(painted, colour)
    if (band) {
      const bandH = Math.max(1, Math.round(w / (RIDGE_BAND.w / RIDGE_BAND.h)))
      const top = Math.round(yBase - RIDGE_BAND.line * bandH)
      // Source-cut to the art's own opaque bounds, so it is the SILHOUETTE that
      // spans the viewport rather than the frame it arrived in. Keyed on the
      // source, not the tint: the colour swap is `source-in`, so every tint of
      // one image has identical alpha.
      const trim = trimOf(band, painted.src)
      ctx.drawImage(band, trim.x0, 0, trim.x1 - trim.x0 + 1, band.height, 0, top, w, bandH)
      ctx.fillStyle = colour
      ctx.fillRect(0, top + bandH - 1, w, Math.max(0, h - (top + bandH - 1)))
      return
    }
  }
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

/**
 * Drop every surface that BAKED a decision about the art layer.
 *
 * Probing is async, so the backdrop, the lane pattern and every tinted ramp
 * sprite may have been built from a miss; without this they keep the drawing
 * for the life of the page while everything built later takes the paint —
 * "the old design shows at some camera distances", the strangest bug the
 * pipeline produces. Narrower than `invalidateArt`, which also clears the
 * transients (a falling meteor must not vanish because a crate decoded).
 */
export const invalidateArtSurfaces = (): void => {
  backdrop = null
  backdropKey = ''
  laneTile = null
  laneTileKey = ''
  tinted.clear()
  silhouetteTrim.clear()
  clearRamps()
}

/**
 * The bakes ONE painting can have got into — the scoped half of the above.
 *
 * The audit behind it, site by site:
 *
 *   · Almost every `art()` call reads its painting fresh each frame and draws
 *     it. An arrival costs those nothing and they are not listed here.
 *   · The BACKDROP bakes the two ridge silhouettes (`paintRidge`): tinted to
 *     the stage's sky and source-cut to their own opaque bounds. So a `bg`
 *     arrival drops the backdrop, that image's tint, and its measured trim —
 *     and the trim is a `getImageData` over a 1536x384 band, which is every
 *     readback the churn census counted.
 *   · The shared SPRITE cache holds the tinted smoke puffs baked from
 *     `fx/smoke` (`useVfx.bakePuffSprite`) — a cache this module does not own
 *     and the one thing here that is easy to miss.
 *   · The lane tile and every gradient ramp are procedural: no painting has
 *     ever been baked into either. They were being thrown away on every
 *     arrival for nothing.
 */
export const dropArtBakes = (kind: ArtKind, id: string): void => {
  if (kind === 'bg') {
    backdrop = null
    backdropKey = ''
    // Both caches are keyed by the image's own URL, so the id is matched
    // inside it — `/ridge-far.` cannot match `ridge-near`, and a re-probe's
    // `?v=` suffix does not get in the way.
    const mark = `/${id}.`
    for (const key of tinted.keys()) if (key.includes(mark)) tinted.delete(key)
    for (const key of silhouetteTrim.keys()) if (key.includes(mark)) silhouetteTrim.delete(key)
  }
  if (kind === 'fx' && id === 'smoke') clearRamps()
}

onArtChanged((change) => {
  if (!change) invalidateArtSurfaces()
  else dropArtBakes(change.kind, change.id)
})

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

  // Far ridge line and the dune band — jagged silhouettes, seeded so they are
  // stable across frames, or the painted bands tinted to this stage's sky.
  paintRidge(ctx, 'ridge-far', w, h, h * 0.52, h * 0.07, sky.ridge, 1.7)
  paintRidge(ctx, 'ridge-near', w, h, h * 0.60, h * 0.045, sky.dune, 4.2)

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

  paintLaneTile(t, px)

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

const buildHazardTile = (ctx: CanvasRenderingContext2D, s = scale): CanvasPattern | null => {
  // Sized so that ~2.5 stripe bands cross a pillar's width at ANY zoom: the
  // pillar is only `DIVIDER_HALF_W * 2` (0.5) units across, and a stripe period
  // tuned for the road would put a single band on it, which reads as a smear.
  // The 12 px floor is where a diagonal stops surviving the phone's downscale.
  const px = Math.max(12, Math.round(s * 0.42))
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

/** The pillar's stripes at an explicit px-per-unit — for the art bench and
 *  the playground, which draw a pillar without a camera. */
export const hazardPatternFor = (ctx: CanvasRenderingContext2D, s: number): CanvasPattern | null =>
  buildHazardTile(ctx, s)

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
  const shown = gateValueLabel(value)
  d.label = op === 'div' ? `÷${shown}`
    : op === 'sub' ? `−${shown}`
    : op === 'mul' ? `×${shown}` : `+${shown}`
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

  const chips = cheapFx ? 4 : tier === 'medium' ? 8 : 12
  const base = p.y - DIVIDER_H * 0.45

  // Sheared bossBolts: bright, low, and thrown along the road at the base — the one
  // place the eye is looking, because that is where the thing broke.
  for (let i = 0; i < (cheapFx ? 4 : 9); i++) {
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

  const tone = DEBRIS[d.op]
  const shards = cheapFx ? 4 : tier === 'medium' ? 8 : 13
  const sparks = cheapFx ? 5 : tier === 'medium' ? 9 : 15
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

  if (!cheapFx) {
    for (let i = 0; i < (richFx ? 4 : 2); i++) {
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
  if (richFx) emitDecal(d.x, d.y, d.halfW * 0.8, d.bleak ? 0.55 : bad ? 0.42 : 0.26)
}

// ─── Entry point ────────────────────────────────────────────────────────────

let primedStage = -1
/** Designs the CURRENT stage can spawn — the set the top-up below guarantees. */
let currentStageDesigns: string[] = []
/** The stage whose boss death strip has been asked for. */
let deathAsked = -1

export const drawScene = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dtMs: number,
  // The canvas already carries its DPR transform, and nothing here needs the
  // number: the caches below are keyed on CSS-space geometry and rasterise
  // through that transform. Kept in the signature because `GameScene` passes it
  // and a renderer is exactly the place that tends to need it next.
  _dpr: number
): void => {
  viewW = w
  viewH = h
  sampleFrame(dtMs)

  // One tier read for the whole frame, before anything can branch on it.
  tier = qualityTier()
  cheapFx = tier === 'low' || tier === 'min'
  richFx = tier === 'high'
  minFx = tier === 'min'

  // The camera, latched once for the whole frame — every projection below reads
  // these instead of rebuilding the anchor object per call.
  const a = anchor()
  camX = a.x
  camY = a.y
  roadY = camY + roadScrollY()
  measureCrowd(dtMs)
  // The late skills draw from their own module, through this frame's camera.
  syncSkillView(worldToScreenX, worldToScreenY, scale, w, h, tier)

  // Prime per STAGE, not the whole cast, and re-prime when the stage changes.
  // The lookahead queues the next stage's designs while the player is still on
  // this one; they bake during the result screen (the baker is gated off during
  // live gameplay), so the next stage opens with its strips already warm.
  if (primedStage !== stage.value) {
    primedStage = stage.value
    currentStageDesigns = stageDesigns(stage.value)
    primeSurvivors()
    primeMonsterSprites(currentStageDesigns)
    primeMonsterSprites(stageDesigns(stage.value + 1))
    // The boss's drawn death, and the next boss's, behind every walk strip —
    // baked in the same breaks, so the kill rarely has to bake one itself.
    primeMonsterDeaths([bossDesign(stage.value), bossDesign(stage.value + 1)])
  }

  // The guarantee that closes the last hole. The idle baker is switched OFF
  // while gameplay is live, and the lookahead normally finishes during the
  // result screen — but if the player blows through a stage, or a break was too
  // short, the next stage can open with a design still missing and its foes draw
  // as the red fallback ellipse. So while anything THIS stage can spawn is still
  // unbaked, spend a small slice per frame on it, no matter what the gate says.
  //
  // Deliberately narrow: only the current stage's designs (four on stage 1, not
  // the thirteen of the full cast), and 6 ms rather than the idle baker's 10, so
  // it costs a fraction of a frame and self-terminates within a few hundred ms.
  // A brief dip is worth never showing a placeholder where a monster should be.
  if (!monstersReady(currentStageDesigns)) bakeMonsterSlice(6)

  // The boss's painted death, asked for once a stage when the road is 80 % run
  // — no tier carries it, see `deathArtWant`. A no-op with the art layer off,
  // and a no-op for a strip this session (or the HTTP cache) already holds.
  if (deathAsked !== stage.value && deathArtDue(progress01.value)) {
    deathAsked = stage.value
    const [kind, id] = deathArtWant(stage.value)
    spriteFor(kind, id, 'low')
  }

  // Events → particles, sound and shake. Drained BEFORE stepping the pools so a
  // burst spawned this frame is already integrated once when it is first drawn
  // (otherwise every burst appears one frame late, which reads as input lag).
  consumeFx()
  // The survivors the last handover did not keep. Handed over once, so this is
  // one null check on every other frame.
  const leftBehind = takeDepartedSurvivors()
  if (leftBehind) seeOffSurvivors(leftBehind)

  // ── Two clocks, and the telegraphs belong to the SIMULATION's ─────────────
  //
  // `dtMs` is wall time. The simulation's own clock is not: `step` scales it by
  // `timeScale`, which drops to 0.35 for the boss's guard-gate hold and eases
  // back over ~120 ms. So during every gate the world runs in slow motion while
  // anything advanced by `dtMs` runs at full speed.
  //
  // For most of what is stepped below that is harmless, or wanted. For the
  // three telegraph pools it is a broken promise: a cast is emitted with a
  // `ttl` measured in GAME seconds — "the damage lands in 1.5 s" — and the
  // whole travelling-telegraph design (see the casts in `useVfx`) rests on the
  // animation arriving ON the beat rather than near it. Advanced on wall time,
  // a telegraph thrown inside a 320 ms hold finishes its animation ~160 ms
  // before the hit it is announcing. `CAST_AFTER_S` was hiding it — the mark
  // lingers past its own life — but the moving part was landing early, and
  // phase two put a cast inside that hold on every boss fight.
  //
  // So they are stepped by how much the SIMULATION actually advanced, taken
  // from the clock the sim already publishes. It is a difference rather than a
  // scaled `dtMs` on purpose: it reads zero while the game is paused under an
  // ad (the scene skips `step`, so the clock does not move) and it cannot drift
  // from the numbers the casts were priced in.
  const simNow = nowMs()
  // First frame of a session, and any frame where `resetWorld` has just put the
  // clock back to zero: no world time passed that this pool should see.
  const simDtMs = lastSimNow < 0 ? 0 : Math.max(0, Math.min(simNow - lastSimNow, 120))
  lastSimNow = simNow
  // …and under a Frost Nova the simulation's HOSTILE clocks stand still while
  // its own clock runs on (the crowd keeps walking). The telegraphs are those
  // hostile clocks drawn, so they hold with them: a meteor frozen in the air,
  // a ring that stops closing, and every one of them picking up on the beat it
  // left off at when the ice comes off. See `castFrostNova`.
  const tellDtMs = frostActive() ? 0 : simDtMs

  stepDismissals(dtMs)
  stepRakes(tellDtMs)
  stepHealTells(tellDtMs)
  // Particles, floating text and decals deliberately stay on WALL time. They
  // carry no deadline — nothing in the simulation is waiting for a spark to
  // finish — and the debris of a hit continuing at speed while the world holds
  // is the look this game already shipped. Moving them is a feel change, not a
  // fix, and it should be made on purpose rather than as a side effect of this
  // one.
  stepParticles(dtMs)
  stepSkillFx(dtMs)
  // Stashed for the draw pass: the health-bar chip eases on real time, and the
  // draw functions are not handed a delta of their own.
  lastDtMs = dtMs
  stepTexts(dtMs)
  stepDecals(dtMs)
  stepCasts(tellDtMs)
  stepGazeBeams(tellDtMs)

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
  // Scorch marks are pure history: they say what already happened, and nothing
  // the player has to react to is ever carried by one.
  if (!minFx) drawDecals(ctx)
  // The flare's pool of red light, on the road under everything that stands on
  // it — the bodies it lures are drawn lit from below, not behind a glow.
  drawSkillGround(ctx)
  // …and so is the last stage's boss, lying where it fell.
  drawBossCorpse(ctx)
  drawPickups(ctx)
  drawCrates(ctx)
  // The two roadside prizes sit in the crates' layer because they ARE crates as
  // far as the road is concerned — under the gates, over the coins, so a bank
  // always paints over them and a pillar is never occluded by a pickup.
  drawCages(ctx)
  drawBulwarks(ctx)
  drawBarrels(ctx)
  // The prize goes under its own armour, and the armour is a barricade — so the
  // box is painted first and the plates land on top of it. The levers go LAST of
  // the three: they sit out on the rails where nothing else in the game draws,
  // and the one thing that must never happen is a lever hidden behind scenery
  // the player is not required to look at.
  drawWeaponBoxes(ctx)
  drawGuards(ctx)
  drawBarricades(ctx)
  drawLevers(ctx)
  // The cover over each post goes ON TOP of it. It is the one thing in the game
  // allowed to hide a lever, because hiding the lever is the entire job — and
  // the post is drawn first so the sliver above the stone still says what is
  // behind it.
  drawStones(ctx)
  drawRocks(ctx)
  // Shock ring → live leaves → the leaves being torn down → the pillars. The
  // ring is flat on the road and the wreckage must never sit over a pillar.
  drawShocks(ctx)
  drawGates(ctx)
  drawDismissals(ctx)
  drawDividers(ctx)
  drawFoes(ctx)
  drawBossBody(ctx)
  // The eye goes straight on top of the body it belongs to. See `drawBossGaze`.
  drawBossGaze(ctx)
  drawUnits(ctx)
  // The player's own effects sit above the crowd they belong to.
  drawSkills(ctx)
  // …the late skills' among them: the flare hanging in the air and the nova's
  // ring crossing the screen.
  drawSkillAir(ctx)
  // Above the crowd: a telegraph nobody can see is not a telegraph.
  drawCasts(ctx)
  // The two pool minibosses whose threat is a live OBJECT rather than a wind-up
  // event — a ball with a lane, and a round in the air. Same layer and the same
  // reason: the crowd is exactly what they are aimed at, so the crowd is the one
  // thing that must not be allowed to hide them. See `drawRollers`.
  drawRollers(ctx)
  drawGunnerBolts(ctx)
  // …and the third: a mound of earth at the place the crowd was half a second
  // ago. Same band, same reason. See `drawBurrowMounds`.
  drawBurrowMounds(ctx)
  // …and the three the boss pool added, in the same band and for the same
  // reason. The rake goes UNDER the bossBolts because a bolt has to stay findable
  // while three furrows are burning across the road behind it.
  drawClawFurrows(ctx)
  drawHealTell(ctx)
  drawBossBolts(ctx)
  // The elite's wind-up again, over the bodies — the ground pass under them is
  // buried by a full-size crowd, and the crowd is exactly what it aims at. See
  // `drawEliteTelegraphs`.
  drawEliteTelegraphs(ctx, true)
  drawBullets(ctx)
  drawParticles(ctx, worldToScreenX, worldToScreenY, scale)
  drawFloatingText(ctx)
  drawEliteMarker(ctx, w)
  drawGrades(ctx, w, h)
  // Frost on the glass, over the grades: it is the one full-screen pass that
  // is a place rather than a mood.
  drawSkillScreen(ctx, w, h)
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
  //
  // Only the visible slice is submitted. The texture is a viewport and a half
  // tall, and blitting the whole of it every frame asked the compositor to
  // sample fifty per cent more pixels than reach the screen — the clip is free
  // to the caller and not free to the rasteriser. Same pixels, in the source
  // rectangle rather than off the bottom edge.
  const span = bd.height - h
  // Normalised into `[0, span)`. A raw `%` keeps the sign of its left operand,
  // so a negative camera y produced a destination above the texture's top and a
  // strip of nothing along the bottom of the screen.
  const drift = span > 0 ? (((roadY * scale * 0.09) % span) + span) % span : 0
  const sy = span > 0 ? span - drift : 0

  // ── Only the strips that survive ──
  //
  // The road is painted over this immediately afterwards with an OPAQUE base
  // tone (`LANE_TONE.base` is a hex colour), across the full height of the lane.
  // On a portrait phone the lane is about 80 % of the width, so four fifths of
  // this blit was being submitted, sampled, composited, and then completely
  // covered — every frame, at whatever DPR the device is running.
  //
  // So the sky is drawn only where it can still be seen. The two strips meet
  // the lane's edges exactly, and the rails straddle those edges on top of
  // both, so there is no seam to leave behind.
  const left = worldToScreenX(-LANE_HALF)
  const right = worldToScreenX(LANE_HALF)
  if (left <= 0 && right >= w) return
  // The source rectangle has to be cut to match, or the strips would be
  // horizontally squashed copies of the whole sky rather than the parts of it
  // that belong at those x positions.
  const k = bd.width / w
  if (left > 0) {
    ctx.drawImage(bd, 0, sy, left * k, h, 0, 0, left, h)
  }
  if (right < w) {
    ctx.drawImage(bd, right * k, sy, (w - right) * k, h, right, 0, w - right, h)
  }
}

// ─── Layer 4: the lane ──────────────────────────────────────────────────────

const drawLane = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  const left = worldToScreenX(-LANE_HALF)
  const right = worldToScreenX(LANE_HALF)
  const laneW = right - left

  // Off-lane terrain: darker than the road so the playable strip reads as the
  // only place anything can happen. On a wide screen this is most of the
  // picture, so it gets its own gradient rather than a flat fill.
  //
  // Cached on the one number it depends on. It is built in SCREEN space, which
  // would normally make it uncacheable — but the lane is drawn with the identity
  // transform, so screen space and the ramp's own space are the same thing here
  // and `h` is the whole key.
  let off = getRamp(`laneOff|${h}`)
  if (!off) {
    off = putRamp(`laneOff|${h}`, ctx.createLinearGradient(0, 0, 0, h))
    off.addColorStop(0, 'rgba(10,10,16,0.4)')
    off.addColorStop(1, 'rgba(6,6,10,0.76)')
  }
  ctx.fillStyle = off
  ctx.fillRect(0, 0, left, h)
  ctx.fillRect(right, 0, w - right, h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(left, 0, laneW, h)
  ctx.clip()

  ctx.fillStyle = LANE_TONE.base
  ctx.fillRect(left, 0, laneW, h)

  // The gravel is the road's texture and it is also a full-lane fill of a
  // repeating pattern — the most expensive thing on the ground pass. At `min`
  // the road is the flat base tone above and nothing else; the rungs below are
  // what actually carry the sensation of speed, and they stay.
  const pattern = minFx ? null : buildLaneTile(ctx)
  if (pattern) {
    // Scroll the pattern with the camera. Translating the context (rather than
    // the pattern's own matrix) keeps this working on every browser we ship to.
    const offset = ((roadY * scale) % laneTilePx + laneTilePx) % laneTilePx
    ctx.save()
    ctx.translate(0, offset)
    ctx.fillStyle = pattern
    // The offset is in `[0, laneTilePx)`, so one tile of headroom above the
    // viewport covers the scroll exactly. The second tile this used to add was
    // a whole extra tile-height of pattern fill, every frame, off the bottom of
    // the screen.
    ctx.fillRect(left, -laneTilePx, laneW, h + laneTilePx)
    ctx.restore()
  }

  // Depth: the far end of the lane fades into the haze so the road reads as
  // going somewhere rather than being a treadmill.
  if (!minFx) {
    const fadeH = h * 0.55
    let fade = getRamp(`laneFade|${fadeH}`)
    if (!fade) {
      fade = putRamp(`laneFade|${fadeH}`, ctx.createLinearGradient(0, 0, 0, fadeH))
      fade.addColorStop(0, 'rgba(0,0,0,0.38)')
      fade.addColorStop(1, 'rgba(0,0,0,0)')
    }
    ctx.fillStyle = fade
    ctx.fillRect(left, 0, laneW, fadeH)
  }

  // Rungs every 2 world units: the entire sensation of SPEED comes from these.
  // Laid out on the ROAD's phase (`roadY`), not the stage's, and projected back
  // through the camera — `lift` is how far the world has been re-based.
  const lift = roadY - camY
  const top = roadY + (viewH * CROWD_SCREEN_Y) / scale
  const bottom = roadY - (viewH * (1 - CROWD_SCREEN_Y)) / scale
  ctx.strokeStyle = LANE_TONE.line
  ctx.lineWidth = Math.max(1, scale * 0.03)
  ctx.beginPath()
  for (let y = Math.floor(bottom / 2) * 2; y < top + 2; y += 2) {
    const sy = worldToScreenY(y - lift)
    ctx.moveTo(left, sy)
    ctx.lineTo(right, sy)
  }
  ctx.stroke()

  // Centre dashes.
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = Math.max(1.5, scale * 0.05)
  ctx.setLineDash([scale * 0.9, scale * 0.9])
  ctx.lineDashOffset = -(roadY * scale) % (scale * 1.8)
  ctx.beginPath()
  ctx.moveTo(worldToScreenX(0), 0)
  ctx.lineTo(worldToScreenX(0), h)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()

  // Rails. Bright, warm and always on screen — they are the player's only
  // absolute reference for where the edges are.
  //
  // The two rails are the same ramp at two positions, so it is built ONCE in
  // local space and placed with a translate — the conversion `useGradientRamps`
  // describes: a ramp pinned to absolute screen coordinates cannot be cached at
  // all, one centred on the origin can be reused anywhere.
  let rail = getRamp(`laneRail|${scale}`)
  if (!rail) {
    rail = putRamp(`laneRail|${scale}`, ctx.createLinearGradient(-scale * 0.1, 0, scale * 0.1, 0))
    rail.addColorStop(0, LANE_TONE.dark)
    rail.addColorStop(0.5, LANE_TONE.railLit)
    rail.addColorStop(1, LANE_TONE.rail)
  }
  ctx.fillStyle = rail
  for (const x of [-LANE_HALF, LANE_HALF]) {
    const sx = worldToScreenX(x)
    ctx.save()
    ctx.translate(sx, 0)
    ctx.fillRect(-scale * 0.09, 0, scale * 0.18, h)
    ctx.restore()
  }
  // Posts, spaced on the rung rhythm, to give the rails depth.
  const top2 = roadY + (viewH * CROWD_SCREEN_Y) / scale
  const bottom2 = roadY - (viewH * (1 - CROWD_SCREEN_Y)) / scale
  ctx.fillStyle = 'rgba(20,22,30,0.85)'
  for (let y = Math.floor(bottom2 / 4) * 4; y < top2 + 4; y += 4) {
    const sy = worldToScreenY(y - lift)
    for (const x of [-LANE_HALF, LANE_HALF]) {
      const sx = worldToScreenX(x)
      ctx.fillRect(sx - scale * 0.16, sy - scale * 0.28, scale * 0.32, scale * 0.56)
    }
  }
}

/**
 * Clip what follows to the ROAD.
 *
 * Everything painted ON the ground — the boss's pool, scorch marks, craters —
 * is drawn around a world position with no idea where the kerb is, and the
 * lane's two edges are the hardest lines in the picture. A liquid that laps
 * over one of them stops reading as liquid: it becomes a sticker hanging over
 * the void beside the road, which is exactly how a player describes it.
 *
 * What is NOT clipped is anything standing: a fallen giant may hang over the
 * kerb and should, because a body has volume and the eye reads it as lying
 * across the edge rather than as paint on nothing.
 *
 * `ox` is the caller's origin in screen x — 0 under the identity transform,
 * and the body's own screen x inside the entity layer, which translates to
 * each body's feet before it paints anything.
 */
const clipToRoad = (
  ctx: CanvasRenderingContext2D, ox = 0, top = 0, height = viewH
): void => {
  const l = worldToScreenX(-LANE_HALF) - ox
  const r = worldToScreenX(LANE_HALF) - ox
  ctx.beginPath()
  ctx.rect(l, top, r - l, height)
  ctx.clip()
}

const drawDecals = (ctx: CanvasRenderingContext2D): void => {
  const decals = getDecals()
  if (decals.length === 0) return

  // One clip for the whole layer: every decal is ground paint, and the pass
  // runs under the identity transform.
  ctx.save()
  clipToRoad(ctx)

  // Scorch marks vary in BOTH radius and opacity, which is what made this the
  // worst of the per-entity ramps: neither could be carried in a cache key, so
  // every decal on the road rebuilt a two-stop ramp every frame.
  //
  // The opacity moves to `globalAlpha`, which is exact rather than an
  // approximation: canvas interpolates stops premultiplied, so ramping
  // `rgba(12,10,14,a) → 0` is the same pixel as ramping `rgba(12,10,14,1) → 0`
  // and scaling the result by `a`.
  //
  // The radius goes in the KEY, at full precision, rather than being pushed
  // into a `scale()`. Sizing a unit ramp by the transform is the tempting move
  // and it measured worse than the gradient it replaces — see the note in
  // `useGradientRamps`.
  //
  // Full precision rather than a quantised bucket because it costs nothing
  // here: the emitters ask for a handful of fixed radii (1.4, 1.1, 0.9, 1.3,
  // 1.5, 2.1, 2.4) times a frame-constant `scale`, so exact keys already hit for
  // almost every decal, and rounding would trade real output fidelity for a
  // saving no measurement asked for. There are at most 24 of these.
  for (const d of decals) {
    const a = Math.min(1, d.life / d.maxLife) * d.dark
    if (a <= 0.01) continue
    const r = d.r * scale
    if (r <= 0) continue

    ctx.save()
    ctx.translate(worldToScreenX(d.x), worldToScreenY(d.y))
    ctx.globalAlpha = a
    paintScorch(ctx, r)
    ctx.restore()
  }
  ctx.restore()
}

// ─── Layer 6: pickups, crates, barricades, gates ────────────────────────────

const drawPickups = (ctx: CanvasRenderingContext2D): void => {
  const pickups = getPickups()
  if (pickups.length === 0) return

  // Every coin on the road is the same coin. The radius comes from `scale`, so
  // both ramps are fixed for the whole frame and only their POSITION differs —
  // which is precisely the case that a cached ramp plus a `translate` covers,
  // and precisely the case that building at absolute screen coordinates
  // (`createRadialGradient(sx, ...)`) cannot, because `sx` moves every frame.
  const r = scale * 0.22
  const glowR = r * 2.6

  let glow = getRamp(`coinGlow|${glowR}`)
  if (!glow) {
    glow = putRamp(`coinGlow|${glowR}`, ctx.createRadialGradient(0, 0, 0, 0, 0, glowR))
    glow.addColorStop(0, 'rgba(255,210,90,0.5)')
    glow.addColorStop(1, 'rgba(255,180,40,0)')
  }
  for (const p of pickups) {
    if (p.taken) continue
    const sy = worldToScreenY(p.y)
    if (sy < -40 || sy > viewH + 40) continue
    const sx = worldToScreenX(p.x)
    // Spin by squashing the ellipse — cheaper than a rotation and it reads as
    // a coin turning rather than a disc rolling.
    const spin = Math.abs(Math.cos(p.phase))
    const bob = Math.sin(p.phase * 0.6) * scale * 0.06

    ctx.save()
    ctx.translate(sx, sy)

    // The glow follows the bob; the body ramp deliberately does NOT — it spans
    // `sy - r … sy + r` while the coin itself is drawn at `sy + bob`, so the
    // highlight slides across the face as the coin rises. That was true of the
    // absolute-coordinate version and is preserved here by translating the two
    // to different origins rather than by hoisting the bob into the outer one.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.translate(0, bob)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, glowR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    paintCoin(ctx, r, spin, bob)
    ctx.restore()
  }
}

/**
 * TNT barrels — the boss arena's damage lever.
 *
 * Read at a glance in three states, because the player has to make a decision
 * about one mid-fight: INTACT is a dark drum with red bands and a stencil,
 * DAMAGED shows the same drum with its bands cracking through, and LIT throws
 * the whole thing to white on a fast strobe so a blast about to happen can never
 * be mistaken for one that already did.
 */
/**
 * A foe's health bar, one beat behind.
 *
 * The pale streak that trails the red after a hit — the thing that turns a bar
 * which shrinks into a bar which is being HURT. It is the only part of a health
 * bar that says how hard the last hit landed; a smoothly moving edge cannot.
 *
 * Kept renderer-side, keyed by foe id, because it is presentation and the
 * simulation has no business carrying a number that exists to be late. Entries
 * are dropped when the foe stops being drawn, and the whole map is cleared with
 * the rest of the transients in `invalidateArt`.
 */
const hpChip = new Map<number, number>()

/** Last frame's delta, for the draw pass — see the render entry. */
let lastDtMs = 16

/** The simulation clock as of the previous frame, so the telegraph pools can be
 *  stepped by world time rather than wall time. `-1` means "no previous frame".
 *  See the two-clocks note in `drawScene`. */
let lastSimNow = -1

/** How fast the chip catches up, as a fraction of the gap per second. */
const HP_CHIP_CATCHUP = 2.6
/** …after holding still for this long, so the streak is readable at all. */
const HP_CHIP_HOLD_S = 0.18

const chipFor = (id: number, hp01: number, dtMs: number): number => {
  const prev = hpChip.get(id)
  if (prev === undefined || hp01 > prev) {
    hpChip.set(id, hp01)
    return hp01
  }
  if (prev <= hp01) return hp01
  const dt = dtMs / 1000
  // Ease toward the real value, never past it.
  const next = Math.max(hp01, prev - (prev - hp01) * Math.min(1, HP_CHIP_CATCHUP * dt))
  hpChip.set(id, next)
  return next
}

/**
 * ─── Casts: the wind-up, as something that travels ──────────────────────────
 *
 * A boss slam and an elite sweep both already had a telegraph — a ring closing
 * on the ground, an arc direction chosen early. Both were legible in isolation
 * and invisible in practice, because of where the player's eyes actually are:
 * on the boss, or on their own thumb. The one place they are not looking is the
 * patch of road they are about to be standing on, so the hit arrived out of
 * nowhere and the game read as taking survivors for reasons that could not be
 * seen. That is the difference between a hard fight and an unfair one.
 *
 * So the attack is given a BODY that moves from the attacker to the place it
 * lands. A rock falls out of the sky onto the boss's mark; a blade winds up
 * across the ground the elite is about to cut. Both are spawned at the start of
 * the wind-up carrying the exact time to impact, so they arrive on the beat
 * rather than near it — an effect that lands late would teach the player the
 * wrong moment to dodge, which is worse than no effect at all.
 */
interface Cast {
  /**
   * `bomb` and `bolt` are the two pool minibosses that HAVE a wind-up. The
   * roller does not appear here on purpose: its telegraph is the ball itself
   * rolling down the road for a second and a half, and it is painted straight
   * from the world by `drawRollers` rather than from an event.
   */
  kind: CastKind
  x: number
  y: number
  /** Ground footprint for a meteor, a bomb or a ward; arc reach for a slice; the
   *  lethal half-width of the swathe for a charge; the OUTER radius of the band
   *  for a shock; unused by a bolt, which is a line rather than an area. */
  r: number
  /**
   * Inner radius, for the one shape that has a hole in it.
   *
   * A `shock` is an annulus and the hole is the ANSWER, so it needs a second
   * radius and the simulation has to be the thing that supplies it — the eye is
   * drawn from `SHOCK_EYE_R` and billed against `SHOCK_EYE_R`, and this is the
   * field that keeps those the same number. Zero for every other kind, where
   * "there is no hole" is the honest value rather than a placeholder.
   */
  inner: number
  dir: number
  charged: boolean
  /** Where a `bolt` is aimed. The aim is locked when the cast is emitted, so
   *  this really is the line the round will take. A `charge` reuses `ty` the
   *  same way — the far end of the swathe, which is where its body stops. */
  tx: number
  ty: number
  /** Seconds elapsed, and the total it was given. */
  t: number
  life: number
  /** Held past impact for the flash; see `CAST_AFTER_S`. */
  done: boolean
}

/** How long a cast lingers after it has landed, for the impact flash. */
const CAST_AFTER_S = 0.22

const casts: Cast[] = []

const stepCasts = (dtMs: number): void => {
  const dt = dtMs / 1000
  for (let i = casts.length - 1; i >= 0; i--) {
    const c = casts[i]!
    c.t += dt
    if (c.t >= c.life) c.done = true
    if (c.t >= c.life + CAST_AFTER_S) casts.splice(i, 1)
  }
}

/**
 * Draw every cast in flight.
 *
 * Above the crowd and above the road, because the whole point is that it should
 * be impossible to miss. Cheap on purpose: at most a couple are ever live, and
 * the low quality tier drops the embellishments rather than the shape — a
 * player on a weak phone still needs to know where the damage is coming from.
 */
const drawCasts = (ctx: CanvasRenderingContext2D): void => {
  if (casts.length === 0) return
  const cheap = cheapFx

  for (const c of casts) {
    const p = Math.max(0, Math.min(1, c.t / Math.max(0.001, c.life)))
    const sx = worldToScreenX(c.x)
    const sy = worldToScreenY(c.y)
    // 0 while falling, 0..1 across the impact flash.
    const after = c.done
      ? Math.min(1, (c.t - c.life) / CAST_AFTER_S)
      : 0

    if (c.kind === 'meteor') {
      const groundR = c.r * scale
      const big = c.charged

      // ── The mark on the ground ──
      //
      // Not the same thing as the existing telegraph ring: that one says how
      // BIG, this one says how LONG. The wedge sweeps round like a clock hand,
      // so the fraction of the circle it has covered is the fraction of the
      // wind-up that has gone.
      ctx.save()
      ctx.globalAlpha = c.done ? 1 - after : 1
      ctx.fillStyle = big ? 'rgba(255,96,28,0.34)' : 'rgba(255,150,70,0.26)'
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.ellipse(sx, sy, groundR, groundR * 0.42, 0, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
      ctx.closePath()
      ctx.fill()

      ctx.translate(sx, sy)
      paintRing(ctx, 'heat', groundR, groundR * 0.42,
        Math.max(2.5, scale * (big ? 0.13 : 0.09)), big ? '#ff7a2a' : '#ffb066')
      ctx.restore()

      if (!c.done) {
        // ── The rock ──
        //
        // Falls from above the top of the view, so it crosses the player's eye
        // line on the way in rather than appearing beside them. Sized to be seen
        // by somebody who is looking at their own thumb: the first version was
        // a third of this and read as a speck.
        const fallFrom = sy - viewH * 0.8 - scale * 4
        const my = fallFrom + (sy - fallFrom) * (p * p)
        const rockR = scale * (big ? 1 : 0.55)

        // ── …and the fire it is falling in ──
        //
        // The fire belongs to `paintMeteorRock` now, and is asked for by the
        // CYCLE rather than drawn here: that is what lets the art bench bake
        // eight panels of it and a painted strip replace it. See the header
        // above `paintTrailFlame`.
        const cycle = roundCycle(c.t, 0)
        ctx.save()
        ctx.translate(sx, my)
        // The tumble. A few degrees of counter-rotation, not a spin: the
        // painted rock carries its flame in the bitmap, and turning it far
        // enough to see would point the painted fire sideways while the stone
        // is still falling straight down.
        ctx.rotate(Math.sin(TAU * cycle) * 0.09 + Math.sin(TAU * cycle * 2) * 0.04)
        paintMeteorRock(ctx, rockR, big, scale, cheap, { cycle })
        ctx.restore()
      }
      continue
    }

    if (c.kind === 'shock') {
      // ── The ring of fire, and the hole in the middle of it ──
      //
      // This is the one telegraph in the game that has to say TWO opposite
      // things at once, and everything below is spent on keeping them apart:
      //
      //   THE BAND  burning, in the meteor's own heat — the colour the player
      //             has been taught means "not here" since stage one.
      //   THE EYE   cool, bright, and pulsing INWARD — a different hue entirely,
      //             because a player who reads this mark as a slam with a
      //             strange middle will run out of the only safe ground on the
      //             road, and they will be right to, given everything else the
      //             game has shown them.
      //
      // The annulus is one path with the inner ellipse wound backwards, which
      // fills the ring and leaves the eye untouched in a single fill — the same
      // trick the elite's blade uses for its crescent, and the reason this draws
      // for about what a slam ring costs.
      const outer = c.r * scale
      const eye = c.inner * scale
      const sq = 0.42

      ctx.save()
      ctx.globalAlpha = c.done ? 1 - after : 1
      ctx.fillStyle = c.done ? 'rgba(255,255,255,0.4)' : 'rgba(255,96,28,0.3)'
      ctx.beginPath()
      ctx.ellipse(sx, sy, outer, outer * sq, 0, 0, TAU)
      ctx.ellipse(sx, sy, eye, eye * sq, 0, TAU, 0, true)
      ctx.fill()

      // The band's two rims. The INNER one is the edge that matters — it is the
      // line the player has to get across — so it is the hotter and the thicker
      // of the two, and it brightens as the wind-up runs out.
      ctx.translate(sx, sy)
      paintRing(ctx, 'heat', outer, outer * sq, Math.max(2, scale * 0.07), '#ff7a2a')
      paintRing(ctx, 'heat', eye, eye * sq,
        Math.max(2.5, scale * (0.07 + p * 0.08)), c.done ? '#ffffff' : '#ffcf7a')
      ctx.restore()

      if (!c.done) {
        ctx.save()
        // ── The eye, in the corner badge's own blue ──
        //
        // `#6ecbff`, and it is the same value the `incoming--into` badge pulses
        // in — see `IncomingWarning.vue`. The pairing is the whole legibility
        // argument for this attack: the badge catches the eye in the corner, it
        // reads GET IN, and the only thing on the road that is the same colour is
        // where to go. Screened rather than plain-filled so it stays that colour
        // over a dark road instead of muddying into it, and bright enough that a
        // player who has been taught for eight stages that a mark means "not
        // here" is given something that plainly is not a mark.
        ctx.globalAlpha = 0.42 + p * 0.32
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = 'rgba(70,150,205,0.85)'
        ctx.beginPath()
        ctx.ellipse(sx, sy, eye * 0.92, eye * sq * 0.92, 0, 0, TAU)
        ctx.fill()
        ctx.globalCompositeOperation = 'source-over'

        // …and a clock, drawn on the eye's own rim rather than out on the band.
        // The player's eye is going to be on the safe ground — that is what the
        // attack is asking of them — so the "when" has to be there too, or they
        // read the countdown by looking at the thing they are trying to leave.
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = '#eafaff'
        ctx.lineWidth = Math.max(3, scale * 0.1)
        ctx.beginPath()
        ctx.ellipse(sx, sy, eye, eye * sq, 0, -Math.PI / 2, -Math.PI / 2 + p * TAU)
        ctx.stroke()

        // Three chevrons closing on the middle, one per third of the wind-up.
        // The only element here that says which DIRECTION the answer is in, and
        // it costs three lines: at a glance the mark reads as something being
        // pulled inward, which is the instruction.
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = '#bfefff'
        ctx.lineWidth = Math.max(2, scale * 0.055)
        for (let i = 0; i < 3; i++) {
          const march = ((p * 1.6 + i / 3) % 1)
          const at = outer - (outer - eye) * march
          ctx.globalAlpha = 0.5 * (1 - Math.abs(march - 0.5) * 1.2)
          ctx.beginPath()
          ctx.ellipse(sx, sy, at, at * sq, 0, -Math.PI * 0.62, -Math.PI * 0.38)
          ctx.stroke()
          ctx.beginPath()
          ctx.ellipse(sx, sy, at, at * sq, 0, Math.PI * 0.38, Math.PI * 0.62)
          ctx.stroke()
        }
        ctx.restore()
      }
      continue
    }

    if (c.kind === 'ward') {
      // ── The healer's ward ──
      //
      // The one mark on the road that is not a threat at all, and it has to be
      // unmistakably that: no heat anywhere, no hazard stripe, no closing ring.
      // A circle the player is invited to stand in, in the same blue the shield
      // and the eye use, breathing rather than counting down.
      //
      // The clock still exists, because the player has to know how long they
      // have to get there — but it runs the other way round from every other
      // cast in the game: it FILLS toward the heal instead of closing on an
      // impact, so a full ring is a heal about to be denied rather than a hit
      // about to land.
      const r = c.r * scale
      const sq = 0.5
      const breathe = 0.5 + 0.5 * Math.sin(c.t * 5)
      ctx.save()
      ctx.globalAlpha = (c.done ? 1 - after : 0.75)
      ctx.fillStyle = 'rgba(110,210,255,0.16)'
      ctx.beginPath()
      ctx.ellipse(sx, sy, r, r * sq, 0, 0, TAU)
      ctx.fill()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = (c.done ? 1 - after : 0.5 + breathe * 0.3)
      ctx.strokeStyle = '#9fe8ff'
      ctx.lineWidth = Math.max(2, scale * (0.05 + breathe * 0.03))
      ctx.beginPath()
      ctx.ellipse(sx, sy, r, r * sq, 0, 0, TAU)
      ctx.stroke()
      if (!c.done) {
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = Math.max(3, scale * 0.09)
        ctx.beginPath()
        ctx.ellipse(sx, sy, r * 0.86, r * sq * 0.86, 0, -Math.PI / 2, -Math.PI / 2 + p * TAU)
        ctx.stroke()
        // Motes drifting up out of it, so the circle reads as something being
        // gathered rather than as a decal somebody left on the road.
        if (!cheap) {
          ctx.globalAlpha = 0.5
          ctx.fillStyle = '#d8f6ff'
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * TAU + c.t * 1.4
            const rise = ((c.t * 0.9 + i / 5) % 1)
            ctx.beginPath()
            ctx.arc(
              sx + Math.cos(a) * r * 0.7,
              sy + Math.sin(a) * r * sq * 0.7 - rise * scale * 1.1,
              Math.max(1.5, scale * 0.05 * (1 - rise)),
              0, TAU
            )
            ctx.fill()
          }
        }
      }
      ctx.restore()
      continue
    }

    if (c.kind === 'bomb') {
      // ── The bomber's ring, and the fuse burning down to it ──
      //
      // Two signals, because the attack is two facts and the player needs both:
      // WHERE (a ring at the blast's real radius, so what they see is what will
      // hit them) and WHEN (a bar of the ring that fills as the fuse runs out,
      // read like a clock hand). The ring is drawn at full size from the first
      // frame rather than growing into place — a ring that grows tells the
      // player the danger is growing, and it is not, it is arriving.
      const r = c.r * scale
      ctx.save()
      ctx.globalAlpha = c.done ? 1 - after : 0.65
      // Ground fill, deliberately faint: the crowd has to stay readable through
      // it, because reading the crowd is the thing they are about to do.
      ctx.fillStyle = 'rgba(255,90,50,0.14)'
      ctx.beginPath()
      ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      // The edge, thickening as the fuse burns.
      ctx.save()
      ctx.translate(sx, sy)
      paintRing(ctx, 'heat', r, r * 0.5,
        Math.max(2.5, scale * (0.06 + p * 0.1)), c.done ? '#ffffff' : '#ff6a2a')
      ctx.restore()
      // …and the clock hand: the fraction of the ring that has filled is the
      // fraction of the fuse that has gone.
      ctx.strokeStyle = '#ffd27a'
      ctx.lineWidth = Math.max(3, scale * 0.11)
      ctx.beginPath()
      ctx.ellipse(sx, sy, r, r * 0.5, 0, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
      ctx.stroke()

      if (!c.done) {
        // The bomb itself, pulsing faster as the fuse shortens. The pulse is
        // the oldest "this is about to go off" signal there is, and it costs
        // one sine.
        const beat = 0.5 + 0.5 * Math.sin(c.t * (10 + p * 26))
        const bodyR = scale * (0.42 + beat * 0.1 * p)
        ctx.save()
        ctx.translate(sx, sy - scale * 0.5)
        // The fuse burns faster as it shortens, so the charge's own loop
        // speeds up with `p` — the one round whose cadence is not the shared
        // one, because "about to go off" has to be legible at the edge of
        // vision without reading a number.
        paintBombCharge(ctx, bodyR, bodyR * (1.8 + beat * 0.6),
          { cycle: c.t * (1 + p * 2.2) })
        ctx.restore()
        ctx.globalAlpha = 1
        // The spark on the fuse, walking down toward the charge.
        ctx.fillStyle = '#fff3c8'
        ctx.beginPath()
        ctx.arc(
          sx + scale * 0.16,
          sy - scale * (1.05 - 0.35 * p),
          Math.max(2, scale * 0.09 * (0.7 + beat * 0.5)),
          0, Math.PI * 2
        )
        ctx.fill()
      }
      ctx.restore()
      continue
    }

    if (c.kind === 'charge') {
      // ── The enraged boss's lane ──
      //
      // A band down the road, at the swathe's TRUE width, plus one bar sweeping
      // down it. Two facts, the same two the bomber's ring carries: WHERE, drawn
      // at the real half-width so a player standing just outside it is right to
      // think they are clear, and WHEN, as a thing that travels rather than a
      // number.
      //
      // The bar is the part that had to travel. The one telegraph rule this game
      // has is that the player is looking at the boss or at their own thumb, so
      // a mark on the floor is not seen — and this attack's mark is the biggest
      // one in the game, which does not help at all, because a band that is
      // simply THERE reads as scenery. A bar crossing it at a constant rate is
      // the only element that says the road is being taken away on a clock.
      // It is linear in `p` deliberately: the body accelerates over the last
      // third of a second (see `stepBossCharge`), and if both eased the player
      // would have two clocks disagreeing about the same beat. One of them is
      // the promise, the other is the consequence catching up to it.
      const halfW = c.r * scale
      const ty = worldToScreenY(c.ty)
      const top = Math.min(sy, ty)
      const h = Math.abs(ty - sy)
      ctx.save()
      // Faint fill. The crowd is standing IN this for the first half of the
      // wind-up and reading the crowd is exactly what they are about to do.
      ctx.globalAlpha = c.done ? 1 - after : 0.55 + p * 0.35
      ctx.fillStyle = 'rgba(255,80,40,0.16)'
      ctx.fillRect(sx - halfW, top, halfW * 2, h)
      // The rails, brightening as the lock runs out — the element that makes it
      // read as a LANE and not as a wash of colour over the road.
      ctx.strokeStyle = c.done ? '#ffffff' : '#ff7a3a'
      ctx.lineWidth = Math.max(2.5, scale * (0.06 + p * 0.09))
      ctx.beginPath()
      ctx.moveTo(sx - halfW, sy)
      ctx.lineTo(sx - halfW, ty)
      ctx.moveTo(sx + halfW, sy)
      ctx.lineTo(sx + halfW, ty)
      ctx.stroke()
      if (!c.done) {
        // The bar, at the fraction of the way down the wind-up has gone.
        const by = sy + (ty - sy) * p
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.5 + p * 0.5
        ctx.fillStyle = '#ffd08a'
        ctx.fillRect(sx - halfW, by - Math.max(2, scale * 0.07), halfW * 2, Math.max(4, scale * 0.14))
        // …and a short wake behind it, so the direction of travel is legible
        // in a still frame. Cheap: one gradient-free rectangle at half alpha.
        ctx.globalAlpha = 0.18 + p * 0.22
        ctx.fillRect(sx - halfW, Math.min(by, sy), halfW * 2, Math.abs(by - sy))
      }
      ctx.restore()
      continue
    }

    if (c.kind === 'bolt') {
      // ── The gunner's column ──
      //
      // One straight line from the muzzle down the road, because that is
      // literally the shape of the attack: the round kills what it passes
      // through and nothing else, so the tell is the path and not a footprint.
      // It brightens and widens as the lock runs out, so "it is about to go" is
      // legible without reading a number.
      const tx = worldToScreenX(c.tx)
      const ty = worldToScreenY(c.ty)
      const halfW = c.r * scale
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = (c.done ? 1 - after : 0.22 + p * 0.5)
      // The band the round will actually occupy — drawn at its true width, so a
      // player who steps just outside it is right to think they are clear.
      ctx.fillStyle = '#63d8ff'
      ctx.fillRect(sx - halfW, Math.min(sy, ty), halfW * 2, Math.abs(ty - sy))
      // Two hot rails on the edges, which is what makes it read as a LINE
      // rather than as a wash of colour over the road.
      ctx.globalAlpha = Math.min(1, 0.4 + p * 0.6)
      ctx.strokeStyle = '#d8f6ff'
      ctx.lineWidth = Math.max(2, scale * 0.05)
      ctx.beginPath()
      ctx.moveTo(sx - halfW, sy)
      ctx.lineTo(tx - halfW, ty)
      ctx.moveTo(sx + halfW, sy)
      ctx.lineTo(tx + halfW, ty)
      ctx.stroke()
      // A charging glow at the muzzle so the eye starts at the end the round
      // will come from.
      ctx.globalAlpha = 0.35 + p * 0.65
      ctx.fillStyle = '#eafaff'
      ctx.beginPath()
      ctx.arc(sx, sy, halfW * (0.5 + p * 0.9), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      continue
    }

    // ── The elite's blade ──
    //
    // A crescent that swings across the road the way the hit will travel, and
    // brightens as the wind-up runs out. Drawn as a filled sweep rather than a
    // stroked line: a hairline arc reads as a stray bit of scenery, which is
    // exactly what the first version looked like.
    const reach = c.r * scale
    const swing = (-0.55 + p * 1.1) * c.dir
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(swing * 0.45)
    ctx.globalCompositeOperation = 'lighter'

    const heat = c.done ? 1 - after : 0.3 + p * 0.7
    // The body of the sweep: the ring between two ellipses, so it has width.
    ctx.globalAlpha = 0.3 * heat
    ctx.fillStyle = c.done ? '#ffffff' : '#ff9b9b'
    ctx.beginPath()
    ctx.ellipse(0, 0, reach * 0.98, reach * 0.46, 0, Math.PI * 0.06, Math.PI * 0.94)
    ctx.ellipse(0, 0, reach * 0.62, reach * 0.29, 0, Math.PI * 0.94, Math.PI * 0.06, true)
    ctx.closePath()
    ctx.fill()

    // …and a hot leading edge on the outside of it.
    ctx.globalAlpha = Math.min(1, 0.55 + heat * 0.45)
    ctx.strokeStyle = c.done ? '#ffffff' : '#ffd9d9'
    ctx.lineWidth = Math.max(3, scale * (0.08 + p * 0.12))
    ctx.beginPath()
    ctx.ellipse(0, 0, reach * 0.98, reach * 0.46, 0, Math.PI * 0.06, Math.PI * 0.94)
    ctx.stroke()
    ctx.restore()
  }
}

// ─── The three tells the boss pool added ────────────────────────────────────
//
// Each one exists because the meteor's ring cannot describe the attack it is
// standing in for: a ring says "not HERE", and a rake says "not here, here or
// here — pick a gap", a heal says nothing about the road at all, and a bolt is
// an object rather than a place. `drawBossBody` gates its ring to the meteor for
// exactly that reason; these three replace it, one per kind.
//
// All three follow the same convention as `drawCasts`: the wind-up is spawned
// with the exact time to impact and is animated against it, so the picture and
// the hit are always describing the same beat.

/**
 * A claw's rake, winding up and then striking.
 *
 * Drawn as the strips that KILL and the pockets that do not, because the pockets
 * are the answer and an attack's telegraph should show the answer. The lethal
 * width is `halfW`, which is the same number `throwRake` measures against — the
 * gouges are painted a hair proud of it so a dodge that looked clean is clean.
 */
interface Rake {
  lanes: readonly number[]
  y: number
  halfW: number
  depth: number
  t: number
  life: number
  done: boolean
}

/** How long a struck rake stays on the road, seconds. Long enough to read as a
 *  scar and short enough not to be mistaken for a live one.
 *
 * It was 0.34 and is 0.46, bought for the blade below: a slash that crosses the
 * lane in a third of a second and then holds as a scar needs the third of a
 * second. The extra 0.12 is all scar — the strike is over at `t = life` and the
 * kill is already paid, which is the property `RAKE_SLASH_S` protects. */
const RAKE_AFTER_S = 0.46

/**
 * How much of the after-window the blade takes to cross a lane, seconds.
 *
 * Short, and deliberately shorter than the flash it travels under. The rake
 * lands ALL AT ONCE at `t = life` — `throwRake` has already taken everybody in
 * the lanes by the time a single pixel of this is drawn — so a blade that swept
 * slowly would be telling the player a lie with real consequences: they would
 * read the sweep as the hit arriving, believe the near end of the lane is still
 * safe, and steer into a place that is already gone.
 *
 * What keeps it honest is the ORDER. The full-lane flash is painted first and
 * covers every inch of the lane on the frame of the strike; the blade is a
 * flourish drawn on top of a lane that has already been declared hit. At 0.16 s
 * it is over before a player could act on it either way.
 */
const RAKE_SLASH_S = 0.16

const rakes: Rake[] = []

const stepRakes = (dtMs: number): void => {
  const dt = dtMs / 1000
  for (let i = rakes.length - 1; i >= 0; i--) {
    const r = rakes[i]!
    r.t += dt
    if (r.t >= r.life) r.done = true
    if (r.t >= r.life + RAKE_AFTER_S) rakes.splice(i, 1)
  }
}

const drawClawFurrows = (ctx: CanvasRenderingContext2D): void => {
  if (rakes.length === 0) return
  for (const r of rakes) {
    const p = Math.max(0, Math.min(1, r.t / Math.max(0.001, r.life)))
    const after = r.done ? Math.min(1, (r.t - r.life) / RAKE_AFTER_S) : 0
    const top = worldToScreenY(r.y + r.depth)
    const bottom = worldToScreenY(r.y - r.depth)
    const w = r.halfW * scale

    ctx.save()
    for (const lx of r.lanes) {
      const cx = worldToScreenX(lx)
      if (cx < -w * 3 || cx > viewW + w * 3) continue

      if (!r.done) {
        // The wind-up. The strip fills from the far end toward the crowd, so the
        // animation reads as something being dragged down the road at them
        // rather than as a rectangle fading in — and the fraction filled is the
        // fraction of the wind-up gone, which is the only clock it needs.
        const cut = bottom + (top - bottom) * (1 - p)
        ctx.globalAlpha = 0.16 + p * 0.2
        ctx.fillStyle = '#ff5a3c'
        ctx.fillRect(cx - w, top, w * 2, cut - top)
        // The lethal core, drawn during the WIND-UP and not after it.
        //
        // The outer strip costs a share of the crowd; this middle quarter kills
        // everything it touches with no budget at all (`CLAW_CORE_FRACTION`).
        // An instant kill the player cannot see coming is the one thing this
        // game's telegraphs exist to prevent — the same rule that moved the
        // meteor's ring onto a falling rock — so the core is brighter than the
        // strip around it and lands on screen at the same moment.
        const coreW = w * CLAW_CORE_FRACTION
        ctx.globalAlpha = 0.3 + p * 0.5
        ctx.fillStyle = '#ffd9a0'
        ctx.fillRect(cx - coreW, top, coreW * 2, cut - top)
        ctx.globalAlpha = 0.4 + p * 0.45
        ctx.strokeStyle = '#ffb07a'
        ctx.lineWidth = Math.max(1.5, scale * 0.05)
        ctx.beginPath()
        ctx.moveTo(cx - w, top)
        ctx.lineTo(cx - w, bottom)
        ctx.moveTo(cx + w, top)
        ctx.lineTo(cx + w, bottom)
        ctx.stroke()
        continue
      }

      // ── The strike ──
      //
      // The whole lane, hot, on the first frame. This is the honest part and it
      // is painted first and unconditionally: the rake takes everybody standing
      // in the lane in one instant, so the picture of it has to be the whole
      // lane in one instant. Everything after this is decoration on a fact the
      // player has already been told.
      const fade = 1 - after
      ctx.globalAlpha = fade
      ctx.fillStyle = after < 0.28 ? '#fff2d8' : '#2a1109'
      ctx.fillRect(cx - w, top, w * 2, bottom - top)
      // The core again, so the scar says which part of the strip did the
      // killing — the player has to be able to read where they were standing.
      const strikeCoreW = w * CLAW_CORE_FRACTION
      ctx.fillStyle = after < 0.28 ? '#ffffff' : '#5a1f0d'
      ctx.fillRect(cx - strikeCoreW, top, strikeCoreW * 2, bottom - top)

      // ── …and the claw that made it ──
      //
      // A metallic crescent riding down the lane, the same verb the elite's
      // scythe uses in `drawCasts` — a filled sweep with a hot leading edge,
      // not a stroked arc. The elite swings ACROSS the road in front of itself
      // and this rakes ALONG it, which is the difference between the two
      // attacks and the reason the claw could not simply borrow the crescent
      // unchanged.
      //
      // Steel rather than fire, and that is the read the player asked for: the
      // lane fill says "burned", the blade says "cut". Three tones down the
      // width — dark spine, bright body, white edge — is the cheapest thing
      // that looks like metal rather than like a light.
      const slash = Math.min(1, (after * RAKE_AFTER_S) / RAKE_SLASH_S)
      if (slash < 1) {
        // Eased so the blade is fastest in the middle of the lane: a constant
        // sweep reads as a wipe transition, and acceleration reads as a swing.
        const ease = slash < 0.5 ? 2 * slash * slash : 1 - (1 - slash) ** 2 * 2
        const by = top + (bottom - top) * ease
        const arc = w * 1.25
        const lift = (bottom - top) * 0.16

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        // The wake the blade drags behind it, back up the lane it came down.
        // Without it the crescent is a coin flipping down the road; with it the
        // eye joins the frames into one stroke.
        ctx.globalAlpha = 0.5 * (1 - slash)
        // Cached under a CONSTANT key, not a per-width one: the gradient is
        // authored in a normalised 0..-1 box and scaled into place below, so
        // one object serves every lane at every zoom. A width-keyed cache here
        // would build a new gradient per lane per resize for no difference.
        const grad = getRamp('clawWake') ?? putRamp('clawWake', (() => {
          const g = ctx.createLinearGradient(0, -1, 0, 0)
          g.addColorStop(0, 'rgba(214,232,255,0)')
          g.addColorStop(1, 'rgba(232,244,255,0.85)')
          return g
        })())
        ctx.save()
        ctx.translate(cx, by)
        ctx.scale(1, Math.max(1, lift * 2))
        ctx.fillStyle = grad
        ctx.fillRect(-w * 0.72, -1, w * 1.44, 1)
        ctx.restore()

        // The blade itself: a crescent bowed in the direction of travel, so it
        // reads as something cutting forward rather than as a disc.
        ctx.globalAlpha = 0.9 * (1 - slash * 0.35)
        ctx.fillStyle = '#8fa6c4'
        ctx.beginPath()
        ctx.moveTo(cx - arc, by - lift * 0.5)
        ctx.quadraticCurveTo(cx, by + lift, cx + arc, by - lift * 0.5)
        ctx.quadraticCurveTo(cx, by + lift * 0.35, cx - arc, by - lift * 0.5)
        ctx.closePath()
        ctx.fill()

        // The edge. One hairline of white is what turns grey into steel.
        ctx.globalAlpha = Math.min(1, 1 - slash * 0.2)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = Math.max(2, scale * 0.05)
        ctx.beginPath()
        ctx.moveTo(cx - arc, by - lift * 0.5)
        ctx.quadraticCurveTo(cx, by + lift, cx + arc, by - lift * 0.5)
        ctx.stroke()

        // Sparks off the tips, where a claw would actually strike the road.
        if (!cheapFx) {
          ctx.fillStyle = '#fff6d8'
          for (let i = 0; i < 4; i++) {
            const sp = (slash * 2.4 + i * 0.27) % 1
            ctx.globalAlpha = 0.7 * (1 - sp)
            const side = i % 2 ? 1 : -1
            ctx.beginPath()
            ctx.arc(
              cx + side * arc * (0.85 + sp * 0.5),
              by - lift * 0.5 - sp * lift * 1.6,
              Math.max(1.2, scale * 0.045 * (1 - sp)), 0, Math.PI * 2
            )
            ctx.fill()
          }
        }
        ctx.restore()
      }
    }
    ctx.restore()
  }
}

/**
 * The healer's every-third, winding up.
 *
 * Under the boss and not on the road, because that is the truth of it: nothing
 * is about to land anywhere, the bar is about to go back up. Green, which is a
 * colour this game uses nowhere else, so the one event that undoes the player's
 * work is never confused with one that threatens them.
 */
interface HealTell { x: number; y: number; t: number; life: number }
const healTells: HealTell[] = []

const stepHealTells = (dtMs: number): void => {
  const dt = dtMs / 1000
  for (let i = healTells.length - 1; i >= 0; i--) {
    const h = healTells[i]!
    h.t += dt
    if (h.t >= h.life) healTells.splice(i, 1)
  }
}

const drawHealTell = (ctx: CanvasRenderingContext2D): void => {
  if (healTells.length === 0) return
  for (const h of healTells) {
    const p = Math.max(0, Math.min(1, h.t / Math.max(0.001, h.life)))
    const sx = worldToScreenX(h.x)
    const sy = worldToScreenY(h.y)
    // Rings that close INWARD on the boss — the opposite direction to every
    // other ring in the game, which all radiate outward from a hit. Something
    // gathering rather than something arriving.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const rings = cheapFx ? 2 : 3
    for (let i = 0; i < rings; i++) {
      const phase01 = (p + i / rings) % 1
      const r = scale * (3.2 - phase01 * 2.6)
      ctx.globalAlpha = 0.42 * (1 - phase01) * (0.4 + p * 0.6)
      ctx.save()
      ctx.translate(sx, sy)
      paintRing(ctx, 'heal', r, r * 0.5, Math.max(2, scale * 0.09), '#5cf08a')
      ctx.restore()
    }
    ctx.globalAlpha = 0.18 + p * 0.3
    ctx.fillStyle = '#2fbd63'
    ctx.beginPath()
    ctx.ellipse(sx, sy, scale * 1.1 * (0.5 + p * 0.6), scale * 0.55 * (0.5 + p * 0.6), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/**
 * The healer's bossBolts, in the air.
 *
 * Read straight off the simulation's own array rather than from an effect, so
 * the thing on screen IS the thing that will hit — a bolt drawn from a copy
 * could be a frame behind at exactly the moment the player is deciding whether
 * they have cleared it.
 */
const drawBossBolts = (ctx: CanvasRenderingContext2D): void => {
  const list = getBossBolts()
  if (list.length === 0) return
  const t = nowMs() / 1000
  ctx.save()
  for (const p of list) {
    const sx = worldToScreenX(p.x)
    const sy = worldToScreenY(p.y)
    const r = scale * 0.34

    // The ground shadow first: a projectile with no contact patch reads as a
    // sticker on the camera rather than as something in the world.
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.32
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(sx, sy + r * 1.5, r * 0.9, r * 0.34, 0, 0, Math.PI * 2)
    ctx.fill()

    // Halo and core, pulsing, so it is unmistakably a live thing.
    const pulse = 0.85 + Math.sin(t * 14 + p.id) * 0.15
    ctx.save()
    ctx.translate(sx, sy)
    paintBossBolt(ctx, r, p.vx, p.vy, pulse, cheapFx, { cycle: roundCycle(t, p.id) })
    ctx.restore()
  }
  ctx.restore()
}

/**
 * ─── The ball, and the half of the road it owns ─────────────────────────────
 *
 * Drawn from the WORLD rather than from an event, and drawn over the crowd,
 * because both of those follow from what the thing is. It has no wind-up to
 * announce — the roll is the wind-up, and it is a second and a half long — so
 * there is nothing for a cast to carry; and it is four and a half units across,
 * which on this camera is over half the screen, so a ball that the crowd
 * occluded would be a ball the player did not believe in.
 *
 * Two passes, saying the two things the player has to know:
 *
 *   THE LANE   a hazard-striped strip down the half of the road it is coming
 *              along, running past the crowd. This is the whole instruction —
 *              the strip has an edge, and the other side of that edge is safe.
 *   THE BALL   a heavy sphere with a rim light and a shadow, spinning at the
 *              rate it is actually travelling so it reads as rolling rather
 *              than sliding.
 *
 * Nothing here is a hitbox of its own: the strip is drawn at the ball's real
 * radius and the sphere at the same, so what the player is shown and what the
 * simulation bills are the same 4.5 units.
 */
/**
 * ─── The burrower's mound ───────────────────────────────────────────────────
 *
 * Drawn from the WORLD every frame, for the reason `drawRollers` gives: a thing
 * that TRACKS cannot be described by an event pushed before it started
 * tracking. The mound's whole content is where it is right now, so its picture
 * has to be read out of the simulation rather than animated off a countdown.
 *
 * ── Over the crowd, which is the wrong place and the right decision ──
 *
 * A ridge of earth pushing up under the squad ought to be behind the bodies
 * standing on it. It is drawn in front of them anyway, and the roller's note has
 * the argument in its own words: the crowd is exactly what this is aimed at, so
 * the crowd is the one thing that must not be allowed to hide it. The failure
 * mode is asymmetric and that is what settles it — the mound is BEHIND the crowd
 * whenever the player is answering it correctly (that is the whole mechanic), so
 * it only ends up under the squad when they have stopped moving, which is
 * precisely the moment they need to see it.
 *
 * It is kept low and mostly transparent so the crowd stays readable through it.
 * The bright element is the RIM, which is the shape the eye needs: a crescent of
 * turned earth pointing the way the thing is travelling.
 */
const drawBurrowMounds = (ctx: CanvasRenderingContext2D): void => {
  for (const f of getFoes()) {
    if (!f.elite || f.dead || f.kind !== 'burrower' || f.fuse <= 0) continue

    const sx = worldToScreenX(f.x)
    const sy = worldToScreenY(f.y)
    if (sy < -80 || sy > viewH + 80) continue
    // Planted or still following? The two states have to look different, because
    // one of them is a countdown the player can still answer by leaving and the
    // other is a chase they answer by continuing. `sweepTold` is the sim's own
    // latch for "this one has been announced" — see `stepBurrower`.
    const locked = f.sweepTold
    // Sized to be seen THROUGH the crowd. It was 0.62 and read as a smudge when
    // a four-hundred-strong squad was standing on it — which is exactly the
    // moment the player has to see it, because standing on it is the mistake.
    const r = f.scale * scale * 0.82
    const heave = locked
      ? 1
      : 0.78 + 0.22 * Math.sin(nowMs() / 90 + f.phase * 6)

    ctx.save()
    // The disturbed ground: a squashed dome, dark, so it reads as earth rather
    // than as an effect.
    ctx.globalAlpha = locked ? 0.62 : 0.72
    ctx.fillStyle = locked ? 'rgba(96,62,38,0.9)' : 'rgba(92,66,44,0.95)'
    ctx.beginPath()
    ctx.ellipse(sx, sy, r * 1.25 * heave, r * 0.5 * heave, 0, 0, TAU)
    ctx.fill()

    // The rim of turned soil. Brighter and thicker once it has planted, which is
    // the visual half of "it has committed" — the ring from `bombCast` is the
    // other half and arrives on the same frame.
    ctx.globalAlpha = locked ? 0.95 : 0.9
    ctx.strokeStyle = locked ? '#e0a05a' : '#c98f52'
    ctx.lineWidth = Math.max(2.5, scale * (locked ? 0.09 : 0.075))
    ctx.beginPath()
    ctx.ellipse(sx, sy, r * 1.25 * heave, r * 0.5 * heave, 0, Math.PI, TAU)
    ctx.stroke()

    if (!cheapFx) {
      // A few clods riding the heave, so a still frame says the ground is
      // MOVING. Drawn rather than emitted as particles: the mound exists for a
      // second and a bit and can be on screen at the same time as two other
      // elites, and a particle budget spent here is a budget not spent on the
      // eruption.
      ctx.globalAlpha = 0.55
      ctx.fillStyle = '#6b4c33'
      for (let i = 0; i < 4; i++) {
        const a = Math.PI + (i / 3) * Math.PI
        const wob = Math.sin(nowMs() / 70 + i * 2.1 + f.phase * 5)
        ctx.beginPath()
        ctx.arc(
          sx + Math.cos(a) * r * (0.9 + wob * 0.12),
          sy + Math.sin(a) * r * 0.4 - Math.abs(wob) * scale * 0.16,
          Math.max(1.5, scale * 0.07), 0, TAU
        )
        ctx.fill()
      }
    }
    ctx.restore()
  }
}

const drawRollers = (ctx: CanvasRenderingContext2D): void => {
  const a = anchor()
  for (const f of getFoes()) {
    if (!f.elite || f.dead || f.kind !== 'roller') continue
    const gap = f.y - a.y
    if (gap > ROLLER_WARN_AHEAD + 6) continue

    const sx = worldToScreenX(f.x)
    const sy = worldToScreenY(f.y)
    const r = ROLLER_R * scale
    const left = worldToScreenX(f.x - ROLLER_R)
    const right = worldToScreenX(f.x + ROLLER_R)
    // Down past the crowd, so the strip and the squad are visibly in or out of
    // the same channel.
    const tail = worldToScreenY(a.y - CROWD_MAX_R * 2)

    // ── The lane, and ONLY while the ball can still take anybody ──
    //
    // A ball bills once, at the frame it crosses the crowd's own line, and is
    // inert for the rest of its roll (`kindTicks` is that latch — see
    // `stepRoller`). The strip below is what tells the player the lane is
    // lethal, so it has to go out with the threat.
    //
    // Without this the two states are indistinguishable: a player who dodges
    // the crossing correctly, then steers back into the lane and follows the
    // ball down, drives through a full-width hazard telegraph and takes nothing.
    // Measured: 0 hits and 0 deaths with the crowd sitting dead on the ball.
    // That reads as "the roller does no damage" — the strip promised a threat
    // that had already been spent — and it is the same lie either way round,
    // because a player who believes the strip will also refuse a lane that is
    // now the safest place on the road.
    //
    // The BALL keeps drawing: it is a physical object and it is still rolling
    // away. It is the claim on the lane that is withdrawn, not the object.
    const spent = f.kindTicks > 0
    ctx.save()
    ctx.globalAlpha = spent ? 0.04 : 0.14
    ctx.fillStyle = '#ff5a2a'
    ctx.fillRect(left, sy, right - left, tail - sy)
    if (!cheapFx && !spent) {
      // Hazard stripes, scrolling with the ball. Diagonals are the universal
      // "do not stand here" and they cost one clipped loop.
      ctx.save()
      ctx.beginPath()
      ctx.rect(left, sy, right - left, tail - sy)
      ctx.clip()
      ctx.globalAlpha = 0.1
      ctx.strokeStyle = '#ffd9a0'
      ctx.lineWidth = Math.max(3, scale * 0.16)
      const pitch = scale * 0.85
      const drift = ((f.y * scale) % (pitch * 2)) - pitch
      for (let x = left - (tail - sy) - pitch; x < right + pitch; x += pitch * 2) {
        ctx.beginPath()
        ctx.moveTo(x + drift, sy)
        ctx.lineTo(x + drift + (tail - sy), tail)
        ctx.stroke()
      }
      ctx.restore()
    }
    // The edges: the one line that says where safe begins. Nearly out once the
    // ball is spent — enough to keep the object legible against the road, not
    // enough to read as a boundary worth respecting.
    ctx.globalAlpha = spent ? 0.12 : 0.5
    ctx.strokeStyle = '#ff8a3c'
    ctx.lineWidth = Math.max(2, scale * 0.06)
    ctx.beginPath()
    ctx.moveTo(left, sy)
    ctx.lineTo(left, tail)
    ctx.moveTo(right, sy)
    ctx.lineTo(right, tail)
    ctx.stroke()
    ctx.restore()

    // ── The ball ──
    ctx.save()
    // Contact shadow first, squashed onto the road.
    ctx.globalAlpha = 0.34
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.ellipse(sx, sy + r * 0.16, r * 0.95, r * 0.34, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.translate(sx, sy)
    // The one round whose loop is NOT `roundCycle`: a rolling ball's animation
    // is a fact about the ground it has covered, so it rides `f.phase` (which
    // the sim advances by `dt`, and the ball travels at a constant
    // `ROLLER_SPEED`) at the true rate. Both the drawn bands and a painted
    // strip step the same distance per frame — see `ROLLER_ROLL_HZ`.
    // POSITIVE, and the sign is the whole read. The ball rolls toward the
    // crowd, so it travels DOWN the screen, so the face turned toward the
    // player travels down with it — the way the near side of a wheel rolling
    // at you does. `off` grows with `spin` and canvas y grows downward, so a
    // positive spin is a ring moving down.
    //
    // It was negative, which scrolled the bands UP and therefore described a
    // ball rolling AWAY. Nobody could see it at the old 0.28 alpha; now that
    // the rings are legible, and now that a painted strip plays this exact
    // number, it has to be right.
    const roll = f.phase * ROLLER_ROLL_HZ
    paintRollerBall(ctx, r, roll * ROLLER_SPIN_PER_LOOP, scale, cheapFx, { cycle: roll })
    ctx.restore()
  }
}

/**
 * ─── The gunner's rounds, in the air ────────────────────────────────────────
 *
 * Drawn at `BOLT_R`, the radius the kill is measured against, plus a trail
 * behind it. The trail is the part that sells "slow and fat and coming for
 * you"; the head is the part that has to be exactly the size of the thing that
 * will hit, because a round painted wider than it kills teaches the player to
 * dodge further than they need and a round painted narrower gets them killed.
 */
const drawGunnerBolts = (ctx: CanvasRenderingContext2D): void => {
  const bolts = getBolts()
  if (bolts.length === 0) return
  const t = nowMs() / 1000
  for (const b of bolts) {
    if (b.dead) continue
    const sx = worldToScreenX(b.x)
    const sy = worldToScreenY(b.y)
    const r = BOLT_R * scale
    ctx.save()
    ctx.translate(sx, sy)

    // The ground shadow the healer's bolt already had and this one did not. It
    // is what stops a round reading as a sticker on the camera: an object with
    // no contact patch is not in the world, it is on the lens.
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(0, r * 1.5, r * 0.9, r * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    paintGunnerBolt(ctx, r, b.dx, b.dy, scale, cheapFx, { cycle: roundCycle(t, b.id) })
    ctx.restore()
  }
}

/**
 * The grenade in flight, and the dome over the crowd.
 *
 * Both are drawn LAST, over everything, because both are the player's own doing
 * and the one thing they must never lose track of is what their own button did.
 */
/**
 * The crowd's drawn bounding box in screen pixels, measured by `drawUnits` on
 * the frame that just ran.
 *
 * The shield bubble has to enclose the SQUAD, and the squad's on-screen extent
 * is not derivable from the camera: survivor sprites are foot-anchored, so a
 * body sits a fixed sprite-height ABOVE its world position, while the formation
 * spreads sideways with the head count. Deriving the dome from `camY` plus a
 * multiple of the crowd's width got both wrong at once — it fitted a squad of
 * seventy and sat entirely below a squad of eight hundred.
 *
 * So the crowd measures itself while it draws. It already walks every unit, so
 * this is four comparisons per body and no extra pass.
 */
let crowdBoxL = 0
let crowdBoxR = 0
let crowdBoxT = 0
let crowdBoxB = 0
let crowdBoxN = 0

/**
 * The boss's drawn box, measured the same way and for the same reason: the
 * result screen's "boss felled" label is a DOM node over the canvas, and where
 * the body is on screen is not derivable outside the render pass. A boss is
 * foot-anchored like a survivor, its height is a multiple of the camera scale
 * that changes with the design, and — the part that decides the whole placement
 * — it LIES DOWN when it dies, which is exactly when the label is shown.
 *
 * Measured during the draw, read by the scene on its own clock. In CSS pixels,
 * because `setViewport` is handed `cssW/cssH` and the canvas carries the DPR in
 * its transform: `worldToScreenX/Y` are already in the space the scene positions
 * overlays in (the same space `laneHalfPx` and `squadFloorPx` are computed in).
 */
let bossBoxL = 0
let bossBoxR = 0
let bossBoxT = 0
let bossBoxB = 0
let bossBoxN = 0

/**
 * Record a boss body's box. `down` is 0 for a boss on its feet and 1 for one
 * lying where it fell, which pulls the top of the box down with the body — a
 * label parked at a standing boss's crown floats a long way above a corpse.
 *
 * The box is the BLIT box, a little wider and taller than the ink inside it.
 * That is the safe side of the error for "above the body and not overlapping
 * it": the label is placed clear of the frame, so it cannot clip a horn.
 */
const measureBossBox = (sx: number, sy: number, size: number, down: number): void => {
  // The same numbers the body's own blit uses (`size * 1.6` of character height
  // through the sprite's foot line), so the box cannot drift away from the art.
  const h = (size * 1.6) / SPRITE_HEIGHT_R
  const top = sy - h * SPRITE_FOOT_R * (1 - 0.45 * down)
  const halfW = h * MONSTER_FRAME_ASPECT * 0.5
  bossBoxL = sx - halfW
  bossBoxR = sx + halfW
  bossBoxT = top
  bossBoxB = sy
  bossBoxN = 1
}

/**
 * Screen-space box of the boss's body — `x`/`y` its TOP-LEFT, in CSS pixels
 * relative to the canvas — or null when there is no boss on screen.
 *
 * Named for what reads it: the scene's "boss felled" label, which sits above
 * the body and must not overlap it, so it takes `y` for its bottom-anchored
 * line and `x + w / 2` for its centre. It keeps answering for the whole of
 * `BOSS_FELLED_MS` after the kill — the body IS what the label is about, and it
 * is lying down by then, which is why `measureBossBox` pulls the top of the box
 * down with the fall — and for the corpse the next stage opens beside.
 *
 * A LIVE boss answers too, rather than null: the label appears on the frame the
 * kill lands, when the body is still going over, and a reader that has to wait
 * for a state change would spend that frame at its fallback position.
 */
export const felledBossBox = (): { x: number; y: number; w: number; h: number } | null =>
  bossBoxN === 0
    ? null
    : { x: bossBoxL, y: bossBoxT, w: bossBoxR - bossBoxL, h: bossBoxB - bossBoxT }

/** Longest remaining time seen this activation — the countdown ring's 100%. */
let shieldTotalMs = 0
/** When the shield last ate a hit, so the bubble can flash on absorb. */
let shieldHitAt = -1e9

// ─── The rally halo ─────────────────────────────────────────────────────────
//
// The painted half of the second wind (the particles are in the `rally` case of
// the VFX drain). It is drawn rather than emitted because it has to FOLLOW the
// crowd: the road keeps moving under a rallied squad, so a burst anchored to
// the spot they died on scrolls off them within half a second, and the one
// thing this effect has to say is "these people, right here, were just saved".
//
// It doubles as the readout for `RALLY_GRACE_MS`. The player is untouchable for
// exactly as long as the light is up — nothing on the HUD could teach that, and
// a squad walking through a monster unharmed with no visible reason is the same
// "is this broken?" the rally itself used to provoke.
/** When the last rally landed, in `nowMs()` time. */
let rallyAt = -1e9
/** …and where, as a fallback for the frames before the new crowd has drawn. */
let rallyX = 0
let rallyY = 0
/** Halo lifetime, ms. Deliberately just under `RALLY_GRACE_MS` (1500): the
 *  light going out is the last frame of the immunity it stands for. */
const RALLY_HALO_MS = 1400

const drawRallyHalo = (ctx: CanvasRenderingContext2D, t: number): void => {
  const age = t - rallyAt
  if (age < 0 || age > RALLY_HALO_MS) return
  const u = age / RALLY_HALO_MS
  // Snaps to full in the first 120 ms and holds, then drops away over the last
  // third — a slow fade-in would put the brightest frame a beat AFTER the
  // moment it is explaining.
  const fade = Math.min(1, age / 120) * (u < 0.66 ? 1 : 1 - (u - 0.66) / 0.34)

  const measured = crowdBoxN > 0
  const cx = measured ? (crowdBoxL + crowdBoxR) / 2 : worldToScreenX(rallyX)
  const groundY = measured ? crowdBoxB : worldToScreenY(rallyY)
  const topY = measured ? crowdBoxT : groundY - scale * 1.4
  const rx = measured
    ? Math.max(scale * 0.9, (crowdBoxR - crowdBoxL) / 2 + scale * 0.45)
    : scale * 1.2

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // ── The column ──
  // A shaft of light standing on the crowd, wider at the top so it reads as
  // coming DOWN onto them rather than as an explosion going up.
  const colH = scale * 8
  const grad = ctx.createLinearGradient(0, groundY, 0, groundY - colH)
  grad.addColorStop(0, `rgba(255,238,190,${0.34 * fade})`)
  grad.addColorStop(0.55, `rgba(255,224,150,${0.16 * fade})`)
  grad.addColorStop(1, 'rgba(255,224,150,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(cx - rx * 0.78, groundY)
  ctx.lineTo(cx + rx * 0.78, groundY)
  ctx.lineTo(cx + rx * 1.5, groundY - colH)
  ctx.lineTo(cx - rx * 1.5, groundY - colH)
  ctx.closePath()
  ctx.fill()

  // ── The ground rings ──
  // Two, spaced a beat apart, so the first frame already has a second wave
  // behind it: one ring reads as an outline, two read as a pulse.
  if (!cheapFx) {
    for (const delay of [0, 0.22]) {
      const ru = (u - delay) / (1 - delay)
      if (ru <= 0) continue
      const r = rx * (0.5 + ru * 2.4)
      ctx.globalAlpha = 0.5 * fade * (1 - ru)
      ctx.strokeStyle = '#ffe6a6'
      ctx.lineWidth = Math.max(1.5, scale * 0.06 * (1 - ru * 0.6))
      ctx.beginPath()
      ctx.ellipse(cx, groundY + scale * 0.08, r, r * 0.28, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // ── The halo ──
  // The thing the label names. A gold ring hanging over the squad, bobbing
  // once across its life — the single most legible "an angel was here" shape
  // there is, and it costs one ellipse.
  const bob = Math.sin(u * Math.PI) * scale * 0.35
  const hy = topY - scale * 0.9 - bob
  const hr = Math.max(scale * 0.55, rx * 0.5)
  ctx.globalAlpha = 0.35 * fade
  ctx.strokeStyle = '#fff4cf'
  ctx.lineWidth = Math.max(4, scale * 0.22)
  ctx.beginPath()
  ctx.ellipse(cx, hy, hr, hr * 0.34, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = Math.min(1, 0.9 * fade)
  ctx.strokeStyle = '#ffdf8a'
  ctx.lineWidth = Math.max(2, scale * 0.075)
  ctx.beginPath()
  ctx.ellipse(cx, hy, hr, hr * 0.34, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

const drawSkills = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()

  // Under everything else in this pass: a shield cast during the grace window
  // has to stay readable through the light, not the other way round.
  drawRallyHalo(ctx, t)

  // ── The shield bubble ──
  //
  // The first version was a cyan ellipse, and an ellipse means nothing. A player
  // three seconds into a fight has to know, without being told, that (a) this is
  // the shield they bought, (b) it is protecting THEM, and (c) it is about to run
  // out. So it is built from the four signals casual games use for exactly this,
  // and each one carries a different part of that sentence:
  //
  //   BUBBLE    a domed hemisphere with a lit rim and a ground ring, not a flat
  //             outline — the crowd is visibly INSIDE something.
  //   HONEYCOMB faint hex cells across the surface. This is the universal
  //             "energy shield" texture, and it is what separates a force field
  //             from a coloured circle at a glance.
  //   CREST     the same heater-shield emblem the BOSS guard uses, in the
  //             player's blue instead of the boss's orange. The player has
  //             already been taught that this shape means "shielded", so
  //             reusing it is free comprehension, and the colour swap is what
  //             says whose shield it is.
  //   RING      a countdown arc around the crest, because a timed buff the
  //             player cannot time is a buff they cannot plan around.
  //
  // Cool blue throughout, and deliberately quieter than anything that hurts: the
  // shield must never out-shout the threat it is protecting from.
  if (isShieldUp()) {
    // Fit the measured squad, with a small margin so nobody's elbow pokes out.
    // Falls back to the camera only when nothing was painted this frame.
    const measured = crowdBoxN > 0
    const cx = measured ? (crowdBoxL + crowdBoxR) / 2 : worldToScreenX(camX)
    const midY = measured ? (crowdBoxT + crowdBoxB) / 2 : worldToScreenY(camY)
    const rx = measured
      ? Math.max(scale * 0.95, (crowdBoxR - crowdBoxL) / 2 + scale * 0.42)
      : Math.max(scale * 1.0, crowdHalfW * scale * 1.55)
    const ryD = measured
      ? Math.max(scale * 0.8, (crowdBoxB - crowdBoxT) / 2 + scale * 0.3)
      : rx * 0.8
    const cy = measured ? crowdBoxB : worldToScreenY(camY)
    const domeCy = midY
    const leftMs = shieldLeft()

    // Total duration, learned from the highest remaining value seen. The skill
    // is upgradable (3s to 6s), so the ring cannot assume a fixed length.
    if (leftMs > shieldTotalMs) shieldTotalMs = leftMs
    const frac = shieldTotalMs > 0 ? Math.max(0, Math.min(1, leftMs / shieldTotalMs)) : 0

    // Fades over the last 900 ms so "about to end" is visible rather than a
    // surprise, and strobes underneath it — the casual-game shorthand for
    // "spend it or lose it".
    const ending = Math.min(1, leftMs / 900)
    const strobe = ending < 1 ? 0.55 + Math.abs(Math.sin(t / 90)) * 0.45 : 1
    // A hit landing on the shield brightens the whole bubble for a moment. This
    // is the feedback that proves the skill is working — without it the player
    // sees survivors not dying and cannot tell why.
    const hit = Math.max(0, 1 - (t - shieldHitAt) / 260)
    const alpha = (0.55 * ending + 0.45 * hit) * strobe
    const cheap = cheapFx

    ctx.save()

    // The ground ring the bubble stands on. Sells it as a dome resting on the
    // road rather than a sticker floating over it.
    ctx.globalAlpha = 0.35 * alpha
    ctx.strokeStyle = '#7fd8ff'
    ctx.lineWidth = Math.max(1.5, scale * 0.05)
    ctx.beginPath()
    ctx.ellipse(cx, cy + scale * 0.1, rx * 0.94, rx * 0.22, 0, 0, Math.PI * 2)
    ctx.stroke()

    // The dome: the wash, the honeycomb, the rim and the specular — or the
    // painting of all four, stretched over the measured squad.
    paintShieldDome(ctx, cx, domeCy, rx, ryD, alpha, hit, cheap, scale)

    // ── The crest, at the apex ──
    //
    // The same heater-shield silhouette as the boss guard, with the same heavy
    // dark rim, placed ABOVE the crowd rather than over it: the boss crest is
    // allowed to cover the boss because hiding it is the point, but covering the
    // player's own squad would hide the thing they are steering.
    const bw = rx * 0.32
    const bh = bw * 1.16
    const by = domeCy - ryD - bh * 0.72
    ctx.globalAlpha = Math.min(1, alpha + 0.25)

    paintCrest(ctx, 'shield', cx, by, bw, bh, {
      fill: hit > 0.2 ? '#ffffff' : '#6fd6ff',
      rim: '#06263a', rimW: Math.max(2.5, scale * 0.085),
      rib: 'rgba(6,38,58,0.9)', ribW: Math.max(1.2, scale * 0.04)
    })

    // The countdown arc around the crest. Full at cast, unwinding clockwise from
    // twelve o'clock — the same direction and the same language as the cooldown
    // ring on the button that cast it. It turns amber for the final second,
    // matching the strobe.
    const ringR = bh * 1.42
    ctx.globalAlpha = 0.5 * alpha
    ctx.strokeStyle = '#06263a'
    ctx.lineWidth = Math.max(3, scale * 0.085)
    ctx.beginPath()
    ctx.arc(cx, by, ringR, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha = Math.min(1, alpha + 0.45)
    ctx.strokeStyle = ending < 1 ? '#ffd93c' : '#7fe4ff'
    ctx.lineWidth = Math.max(2.5, scale * 0.07)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, by, ringR, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2)
    ctx.stroke()
    ctx.lineCap = 'butt'

    ctx.restore()
  } else {
    // Forget the learned duration, so the next cast measures its own.
    shieldTotalMs = 0
  }

  // ── The bulwark, held ──
  //
  // A pickup with no timer is a pickup with nothing on screen to say it exists,
  // and a player who cannot see their insurance cannot play around it: the whole
  // point of the detour was to walk into the arena KNOWING the first slam is
  // free. So the armed state is drawn, and everything about how it is drawn is
  // chosen to say "waiting" rather than "running out".
  //
  //   • the crest and the colour are the skill's, verbatim (`paintCrest`), so
  //     the player reads "shield" without being taught a second symbol;
  //   • there is NO countdown ring — the one mark the timed shield never
  //     appears without — because the absence of a clock IS the difference
  //     between the two objects;
  //   • it breathes slowly instead of strobing, and it sits ABOVE the crowd
  //     rather than wrapping it, because it is not protecting them yet: it is
  //     an object being carried, and it becomes a dome only when it is spent.
  //
  // Drawn whether or not the timed shield is up, deliberately. Both can be
  // active at once (see `bulwarkAbsorb`), and hiding one behind the other is
  // how a player concludes their pickup was eaten by casting a skill.
  if (bulwarkReady()) {
    const measured = crowdBoxN > 0
    const cx = measured ? (crowdBoxL + crowdBoxR) / 2 : worldToScreenX(camX)
    const topY = measured ? crowdBoxT : worldToScreenY(camY) - scale * 1.4
    const bw = Math.max(scale * 0.22, scale * 0.3)
    const bh = bw * 1.16
    // A hitch in the breathing every couple of seconds, so a badge that has been
    // sitting there for forty seconds still catches the eye occasionally.
    const breathe = 0.62 + 0.24 * Math.sin(t / 620) + 0.14 * Math.max(0, Math.sin(t / 2100)) ** 6

    ctx.save()
    ctx.globalAlpha = breathe
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(110,205,255,0.28)'
    ctx.beginPath()
    ctx.arc(cx, topY - bh * 1.5, bh * 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = Math.min(1, breathe + 0.3)
    paintCrest(ctx, 'shield', cx, topY - bh * 1.5, bw, bh, {
      fill: '#6fd6ff',
      rim: '#06263a',
      rimW: Math.max(2, scale * 0.07),
      rib: 'rgba(6,38,58,0.9)',
      ribW: Math.max(1, scale * 0.035)
    })
    ctx.restore()
  }

  // ── The grenade, mid-air ──
  //
  // Sized to be TRACKED, not to be accurate. This thing crosses the screen in
  // 420 ms over a road full of muzzle flashes and bodies, and the player has to
  // follow it from their own thumb to the place it goes off — so it is drawn
  // large, given a smoke trail to say where it came from, and lit at the fuse
  // so the eye has something bright to lock onto.
  for (const g of getGrenades()) {
    // The arc lives in SCREEN space: the sim throws in a straight line and the
    // lob is added here, which keeps the simulation two-dimensional.
    const at = (u: number): { x: number; y: number; lift: number } => ({
      x: worldToScreenX(g.fromX + (g.tx - g.fromX) * u),
      y: worldToScreenY(g.fromY + (g.ty - g.fromY) * u),
      lift: Math.sin(u * Math.PI) * scale * 2.4
    })
    const r = Math.max(5, scale * 0.26)
    const head = at(g.t)

    ctx.save()

    // The trail it came in on — four fading ghosts along the arc already flown.
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 1; i <= 4; i++) {
      const u = g.t - i * 0.07
      if (u <= 0) break
      const p = at(u)
      ctx.globalAlpha = 0.2 * (1 - i / 5)
      ctx.fillStyle = '#c8d4e4'
      ctx.beginPath()
      ctx.arc(p.x, p.y - p.lift, r * (0.8 - i * 0.13), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // A shadow that tracks along the ground, so the height reads as height.
    ctx.globalAlpha = 0.32
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(head.x, head.y, r * 1.15, r * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.translate(head.x, head.y - head.lift)
    ctx.rotate(g.t * 9)
    paintGrenadeBody(ctx, r, scale)

    // The lit fuse — the bright point the eye actually follows.
    ctx.globalCompositeOperation = 'lighter'
    const spark = r * (0.5 + Math.random() * 0.28)
    ctx.fillStyle = 'rgba(255, 190, 110, 0.55)'
    ctx.beginPath()
    ctx.arc(0, -r * 1.2, spark * 1.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff2cf'
    ctx.beginPath()
    ctx.arc(0, -r * 1.2, spark, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

const drawBarrels = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  for (const bl of getBarrels()) {
    if (bl.dead) continue
    const sx = worldToScreenX(bl.x)
    const sy = worldToScreenY(bl.y)
    if (sy < -60 || sy > viewH + 60) continue

    const r = BARREL_R * scale
    const hurt = 1 - Math.max(0, bl.hp) / bl.maxHp
    const lit = bl.fuse >= 0
    // Strobe accelerates as the fuse burns: the tell is the RATE, not the colour,
    // so it still reads with the screen full of muzzle flash.
    const burn = lit ? Math.min(1, bl.fuse / 420) : 0
    const flash = lit ? (Math.sin(t / (34 - burn * 22)) * 0.5 + 0.5) : 0

    ctx.save()
    ctx.translate(sx, sy)

    // Contact shadow, so the drum sits on the road rather than floating.
    ctx.fillStyle = 'rgba(0,0,0,0.38)'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.72, r * 0.86, r * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    paintBarrelBody(ctx, r, scale, lit, flash, hurt)

    ctx.restore()
  }
}

/**
 * The weapon glyph, drawn at the origin inside a box of `r` half-extent.
 *
 * Procedural rather than an icon lookup: this is painted on the road at four
 * different sizes (the box, the HUD is Vue's problem, the pickup burst, the
 * lever's little promise mark), and a bitmap that reads at one of them is mush
 * at the others. Two silhouettes, chosen to be told apart at eight pixels — a
 * pointed shell against three stacked barrels.
 */
const weaponGlyph = (
  ctx: CanvasRenderingContext2D, id: WeaponId, r: number, colour: string,
  /**
   * Optional dark rim, stroked around the same paths.
   *
   * The gift box needs it and the earned box does not, which is the difference
   * between an OBJECT and a DECAL. On an earned box the glyph is dark on a gold
   * plate — printed on the lid, and contrast comes free. The gift's glyph sits
   * lifted off the plate in pale steel so it reads as the gun IN the crate, and
   * pale steel over that same gold plate is the one pairing on the road with no
   * contrast at all: at 12 units the silhouette dissolved into the box. The rim
   * is what puts the edge back, and it has to be a stroke rather than a scaled
   * dark copy underneath — the gatling's three barrels are 0.34r apart, and a
   * copy scaled far enough to show at the outline closes the gaps between them
   * and turns the whole thing into a block.
   */
  rim?: { colour: string; width: number }
): void => {
  ctx.fillStyle = colour
  if (rim) {
    ctx.strokeStyle = rim.colour
    ctx.lineWidth = rim.width
    ctx.lineJoin = 'round'
  }
  if (id === 'rocket') {
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.lineTo(r * 0.44, -r * 0.24)
    ctx.lineTo(r * 0.44, r * 0.5)
    ctx.lineTo(-r * 0.44, r * 0.5)
    ctx.lineTo(-r * 0.44, -r * 0.24)
    ctx.closePath()
    ctx.fill()
    if (rim) ctx.stroke()
    // Fins, so the shell reads as a rocket rather than as a house.
    ctx.beginPath()
    ctx.moveTo(-r * 0.44, r * 0.16)
    ctx.lineTo(-r * 0.88, r * 0.72)
    ctx.lineTo(-r * 0.44, r * 0.72)
    ctx.closePath()
    ctx.moveTo(r * 0.44, r * 0.16)
    ctx.lineTo(r * 0.88, r * 0.72)
    ctx.lineTo(r * 0.44, r * 0.72)
    ctx.closePath()
    ctx.fill()
    if (rim) ctx.stroke()
    return
  }
  // Gatling: three barrels and a receiver.
  for (const bx of [-r * 0.5, 0, r * 0.5]) {
    roundRect(ctx, bx - r * 0.17, -r * 0.9, r * 0.34, r * 1.25, r * 0.12)
    ctx.fill()
    if (rim) ctx.stroke()
  }
  roundRect(ctx, -r * 0.78, r * 0.34, r * 1.56, r * 0.5, r * 0.14)
  ctx.fill()
  if (rim) ctx.stroke()
}

/**
 * The armour over a weapon box.
 *
 * Cold blue steel and rivets, where every other slab on the road wears yellow
 * hazard chevrons. The distinction is doing real work: a player who reads this
 * as an ordinary barricade will do the ordinary thing — shoot it — and spend
 * the whole approach discovering that twenty walls' worth of health does not
 * come down in two seconds. "This is a lid" and "this is in your way" have to
 * be different pictures.
 *
 * It also does not wear a health bar. A number that only moves under fire
 * nobody sensible should be spending is an invitation to keep spending it.
 */
const drawGuards = (ctx: CanvasRenderingContext2D): void => {
  for (const g of getGuards()) {
    if (g.dead) continue
    const sx = worldToScreenX(g.x)
    const sy = worldToScreenY(g.y)
    if (sy < -80 || sy > viewH + 80) continue
    const w = g.w * scale
    const h = GUARD_H * scale
    const hp01 = Math.max(0, g.hp / g.maxHp)

    ctx.save()
    ctx.translate(sx, sy)

    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(0, h * 0.45, w * 0.52, h * 0.16, 0, 0, Math.PI * 2)
    ctx.fill()

    paintGuardPlate(ctx, w, h)

    // Damage. The rivets used to carry it by dimming, which is a thing only a
    // drawing can do — so the whole plate darkens and reddens instead, clipped
    // to its own box so it works over a painting and over the drawing alike.
    // Same read the lever's cover wears (`drawStones`).
    if (hp01 < 1) {
      ctx.save()
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.12)
      ctx.clip()
      ctx.globalAlpha = (1 - hp01) * 0.5
      ctx.fillStyle = '#5a2b22'
      ctx.fillRect(-w / 2, -h / 2, w, h)
      ctx.restore()
    }

    if (g.flash > 0) {
      ctx.globalAlpha = g.flash * 0.5
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.12)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
}

/**
 * The levers.
 *
 * Two states and they have to be told apart from the far end of the gun's
 * reach, because the whole beat is decided in the ~2 s a lever is in range:
 *
 *   UNPULLED — the arm is UP, the knob is red, and the whole post breathes. It
 *              also carries a chevron pointing down at it, which is the only
 *              "look here" mark the game draws outside a boss telegraph.
 *   PULLED   — the arm swings DOWN over ~0.2 s and the knob goes green. The
 *              swing matters more than the colour: motion is what the eye
 *              catches when it is somewhere else, and the eye IS somewhere else.
 */
const drawLevers = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  for (const lv of getLevers()) {
    const sx = worldToScreenX(lv.x)
    const sy = worldToScreenY(lv.y)
    if (sy < -70 || sy > viewH + 70) continue
    const r = LEVER_R * scale
    // Eased over 0.22 s. A hard snap reads as a pop-in; a slow one is over
    // before the player looks back.
    const swing = Math.min(1, lv.pulledFor / 0.22)
    const breathe = lv.pulled ? 0 : 0.5 + 0.5 * Math.sin(t / 260)

    ctx.save()
    ctx.translate(sx, sy)

    ctx.fillStyle = 'rgba(0,0,0,0.36)'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.75, r * 0.95, r * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()

    // The base plate.
    paintLeverPost(ctx, r, scale)

    // The arm: straight up when idle, laid over to the right when pulled.
    const angle = (Math.PI / 2) * swing
    ctx.save()
    ctx.translate(0, r * 0.2)
    ctx.rotate(angle)
    paintLeverArm(ctx, r)
    // The knob, which is the colour channel of the read. Drawn into the socket
    // the arm leaves open, painting or drawing.
    const knob = lv.pulled ? '#66e08a' : `rgb(255,${Math.round(70 + breathe * 60)},60)`
    ctx.fillStyle = knob
    ctx.beginPath()
    ctx.arc(0, -r * 1.6, r * 0.46 + (lv.pulled ? 0 : breathe * r * 0.1), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(10,12,16,0.85)'
    ctx.lineWidth = Math.max(1.2, r * 0.13)
    ctx.stroke()
    ctx.restore()

    if (lv.flash > 0) {
      ctx.globalAlpha = lv.flash * 0.55
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, -r * 1.4, r * 0.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // ── "Look here" ──
    //
    // The only marker in the game that points at something OPTIONAL, and the
    // whole beat depends on it being caught out of the corner of an eye that is
    // busy elsewhere. So it is drawn like a telegraph rather than like a
    // decoration: a fat chevron with a black outline, bobbing on the same beat
    // the post breathes on.
    //
    // The first pass was a thin unstroked triangle half this size and it was
    // measured, in a real browser at 1600x900, to be invisible against the road
    // — which on a mechanic whose entire content is "did you notice" is not a
    // polish issue, it is the feature not working.
    //
    // Drawn on EVERY quality tier, `min` included, unlike almost everything else
    // in this file. The tier cuts fidelity — grades, ground passes, per-body
    // shadows — and this is not fidelity, it is the only thing on screen that
    // says a lever is a thing you do something about. A player on the hardware
    // that earns `min` needs it more than anyone, and it costs one filled
    // triangle per post, of which there are two on a stage.
    if (!lv.pulled) {
      ctx.globalAlpha = 0.55 + breathe * 0.45
      const cy = -r * 2.6 - breathe * r * 0.4
      ctx.beginPath()
      ctx.moveTo(0, cy + r * 0.8)
      ctx.lineTo(-r * 0.85, cy - r * 0.35)
      ctx.lineTo(r * 0.85, cy - r * 0.35)
      ctx.closePath()
      ctx.fillStyle = '#ffd24a'
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, r * 0.16)
      ctx.strokeStyle = 'rgba(24,16,4,0.85)'
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }
}

/**
 * The prize box.
 *
 * Locked, it is a dull steel crate under a cross-brace — a thing that is shut.
 * Open, it throws a halo, the glyph lights up and a ring pushes out of it once,
 * so the moment the armour goes the box says "now" from the far end of the
 * road. The two states share nothing except the silhouette, which is the point:
 * the player has to be able to tell across a whole screen whether the beat is
 * still a puzzle or already a pickup.
 *
 * ─── …and a THIRD read: the gift, which is an open box ──────────────────────
 *
 * Stage 2's free box (`WeaponBox.gift`) is not a puzzle that happens to have no
 * levers — it is the one offer on the road whose whole question is "is this
 * worth steering into", asked of a player who has never seen a weapon box
 * before. A crate is a bad way to ask it: `paintWeaponBoxBody`'s open state is
 * still a CASE, and the glyph on its plate reads as a stencil printed on a lid
 * rather than as a thing inside. So the gift gets furniture the earned box
 * never wears, all of it drawn HERE rather than inside the paint helpers, so it
 * composes over the painted `weapon-box-open.webp` exactly as it does over the
 * drawing (the same contract the cross-brace and the cracks are on):
 *
 *   • the LID, thrown back — a slab above the crate's far edge. It is the only
 *     part that changes the SILHOUETTE, which is what survives being 66 px tall
 *     at the top of the screen when nothing inside the outline can be resolved;
 *   • the SHAFT — a warm vertical wedge out of the open case, world-vertical so
 *     it is drawn before `wb.spin`. A 7° tilt on a beam of light reads as a bug;
 *   • the PRIZE, lifted — the weapon glyph bobbing above a contact shadow on
 *     the plate, in pale steel with a rim, so it is an object in a box and not
 *     a mark on one.
 *
 * The distance this is sized for is a measured number, not a taste: the visible
 * road is `CROWD_SCREEN_Y × VIEW_HEIGHT` = 13.68 units, and the box's far edge
 * clears the top of the screen at 11.9 — 2.28 s at stage 2's 5.21 u/s. That is
 * the whole budget, and it is the budget the old design spent 56 % of dressed
 * as a shut steel crate. Everything above therefore works on the box's own
 * half-extent (`WEAPON_GIFT_BOX_R` is 1.8 units, 40 % of the lane) rather than
 * on a fixed pixel size, which is what makes it hold on a phone and on a
 * desktop alike — at the vertical-fit zoom the crate is ~19 % of the usable
 * height, so the LID and the outline survive even where the glyph inside does
 * not, and that ordering is deliberate: silhouette first, contents second.
 *
 * The thing NOT to size against is the steer. Measured, a full-lane correction
 * settles in about a quarter of a second, so reaction time was never the
 * binding constraint here and a tell sized for it would be far too small. What
 * the closed box cost was the category read and the firing window — see
 * `WeaponBox.locked`.
 */
const drawWeaponBoxes = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  for (const wb of getWeaponBoxes()) {
    if (wb.dead) continue
    const sx = worldToScreenX(wb.x)
    const sy = worldToScreenY(wb.y)
    if (sy < -80 || sy > viewH + 80) continue
    // The box's OWN half-extent: the stage-2 gift is twice an earned one.
    const r = wb.r * scale
    const open = !wb.locked
    const pulse = 0.5 + 0.5 * Math.sin(t / 220)
    const hurt = 1 - Math.max(0, wb.hp) / wb.maxHp

    ctx.save()
    ctx.translate(sx, sy)

    if (open && !minFx) {
      // Halo. Keyed on nothing that varies per frame — the throb is on
      // `globalAlpha`, exactly as the supply crates do it, so the ramp cache
      // holds one entry for the life of the run.
      const glowR = r * 2.6
      const key = `weaponGlow|${glowR}`
      let glow = getRamp(key)
      if (!glow) {
        glow = putRamp(key, ctx.createRadialGradient(0, 0, 0, 0, 0, glowR))
        glow.addColorStop(0, 'rgba(255,214,96,1)')
        glow.addColorStop(1, 'rgba(255,214,96,0)')
      }
      ctx.globalAlpha = 0.3 + pulse * 0.3
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(0, 0, glowR, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // The shaft out of an open case. Before the crate so the crate occludes its
    // foot, and before `wb.spin` so it stands up straight — see the header.
    //
    // Tall enough to clear the LID, which is the constraint that set the number:
    // at 1.9r the lid (whose far edge is at -1.66r) ate all but the last quarter
    // radius of it and the beam read as a smudge behind the crate. 2.8r leaves
    // over a radius of shaft standing clear above everything else the beat draws.
    if (wb.gift && !minFx) {
      const beamH = r * 2.8
      const key = `weaponBeam|${beamH}`
      let beam = getRamp(key)
      if (!beam) {
        beam = putRamp(key, ctx.createLinearGradient(0, 0, 0, -beamH))
        beam.addColorStop(0, 'rgba(255,226,140,0.55)')
        beam.addColorStop(1, 'rgba(255,226,140,0)')
      }
      ctx.globalAlpha = 0.55 + pulse * 0.45
      ctx.fillStyle = beam
      ctx.beginPath()
      ctx.moveTo(-r * 0.5, 0)
      ctx.lineTo(r * 0.5, 0)
      ctx.lineTo(r * 1.05, -beamH)
      ctx.lineTo(-r * 1.05, -beamH)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.86, r * 0.9, r * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.rotate(wb.spin)

    // The lid, hinged away up the road, and the ONE part of this that changes
    // the silhouette — which is why it is drawn at all. At the top of the
    // screen, where the crate is ~19 % of the usable height and nothing inside
    // its outline resolves, the outline is the entire message: a crate with a
    // slab standing off its far edge is not the shape of any obstacle on this
    // road, and that is legible before the gun in it is.
    //
    // Full width, and only 0.4 of the crate's own depth: it is lying almost
    // flat, away from the camera. Drawn BEFORE the case so the case paints over
    // its near 0.14r and the two read as one hinged object rather than as two
    // stacked boxes.
    if (wb.gift) {
      ctx.fillStyle = '#4a3410'
      roundRect(ctx, -r * 0.97, -r * 1.66, r * 1.94, r * 0.8, r * 0.16)
      ctx.fill()
      ctx.lineWidth = Math.max(1.6, scale * 0.05)
      ctx.strokeStyle = '#241704'
      ctx.stroke()
      // A lit rim along the lid's FAR edge. Its face is turned away from the
      // camera, so unlit the slab is a flat dark bar that reads as the crate's
      // own shadow — the one thing it must not look like, since a shadow is
      // exactly what a shut crate on this road already casts. It has to sit
      // above -1.0r: anything below that is inside the case's box and is
      // painted over two lines later.
      ctx.fillStyle = 'rgba(255,214,130,0.5)'
      roundRect(ctx, -r * 0.82, -r * 1.55, r * 1.64, r * 0.2, r * 0.09)
      ctx.fill()
    }

    paintWeaponBoxBody(ctx, r, scale, open, pulse)

    if (wb.gift) {
      // The prize, sitting in the case. The bob is on a slower clock than the
      // plate's throb (420 vs 220 ms) on purpose: two things breathing in step
      // read as one surface flickering, and the whole job of the lift is to say
      // that the gun and the box are separate objects.
      const bob = Math.sin(t / 420)
      const lift = r * (0.36 + bob * 0.09)
      ctx.globalAlpha = 0.32
      ctx.fillStyle = '#2a1a03'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.2, r * (0.5 - bob * 0.05), r * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.save()
      ctx.translate(0, -lift)
      weaponGlyph(ctx, wb.weapon, r * 0.62, '#e8eef7', {
        colour: 'rgba(26,16,4,0.92)', width: Math.max(1.4, r * 0.075)
      })
      ctx.restore()
    } else {
      weaponGlyph(ctx, wb.weapon, r * 0.62, open ? '#3a2405' : '#98a4b6')
    }

    if (!open) {
      // The cross-brace. It says SHUT in one stroke, at any size, in every
      // language the game ships in.
      ctx.strokeStyle = '#8f9cb0'
      ctx.lineWidth = Math.max(2.2, r * 0.24)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-r * 0.95, -r * 0.95)
      ctx.lineTo(r * 0.95, r * 0.95)
      ctx.moveTo(r * 0.95, -r * 0.95)
      ctx.lineTo(-r * 0.95, r * 0.95)
      ctx.stroke()
    } else if (hurt > 0) {
      // Cracks, once it is being shot. Same read a supply crate gives, so the
      // player already knows what it means.
      ctx.globalAlpha = Math.min(0.85, hurt)
      ctx.strokeStyle = 'rgba(30,16,4,0.9)'
      ctx.lineWidth = Math.max(1.4, r * 0.1)
      ctx.beginPath()
      ctx.moveTo(-r * 0.6, -r * 0.7)
      ctx.lineTo(-r * 0.1, 0)
      ctx.lineTo(-r * 0.45, r * 0.65)
      ctx.moveTo(r * 0.55, -r * 0.5)
      ctx.lineTo(r * 0.15, r * 0.2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // The reveal ring: one expanding circle over the first `WEAPON_REVEAL_S` of
    // being open. It is what carries the causal link — levers went down, THIS
    // happened — to a player whose eyes were on the levers, so like the lever's
    // own chevron it survives every quality tier. The HALO above is gated,
    // because that one really is decoration.
    //
    // A GIFT never plays it, and not by a test here: it spawns with `openFor`
    // already past the window, because there is no cause for the ring to point
    // at. See `WeaponBox.locked`.
    if (open && wb.openFor < WEAPON_REVEAL_S) {
      const k = wb.openFor / WEAPON_REVEAL_S
      ctx.globalAlpha = (1 - k) * 0.8
      ctx.strokeStyle = '#ffe9a8'
      ctx.lineWidth = Math.max(2, scale * 0.06 * (1 - k))
      ctx.beginPath()
      ctx.arc(0, 0, r * (1 + k * 3.2), 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.restore()
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
    //
    // The throb used to be baked into the ramp's first stop, which meant a new
    // ramp every frame for every crate — a continuously varying number is the
    // one thing a cache key cannot hold. It moves to `globalAlpha` instead,
    // which is exact here rather than an approximation, and leaves a ramp that
    // varies only by crate KIND. The halo stop is fully transparent and so
    // premultiplies to zero; its RGB never reached a pixel, which is why the
    // cached ramp can end on the glow colour instead without changing anything.
    const glowR = r * 2.3
    const glowKey = `crateGlow|${tone.glow}|${glowR}`
    let glow = getRamp(glowKey)
    if (!glow) {
      glow = putRamp(glowKey, ctx.createRadialGradient(0, 0, 0, 0, 0, glowR))
      glow.addColorStop(0, `rgba(${tone.glow},1)`)
      glow.addColorStop(1, `rgba(${tone.glow},0)`)
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.16 + pulse * (rate ? 0.22 : 0.16)
    ctx.translate(sx, sy)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, glowR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(Math.sin(c.spin) * 0.05)

    // Body: the painting, else the shipped crate bitmap when it has decoded,
    // else planks with iron corners, shaded from the shared key light.
    paintCrateBody(ctx, c.kind, r)

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

    // ── The number ──
    //
    // Crates used to be identical boxes, so the only question a crate asked was
    // "can you be bothered to steer". They now come in tiers (see
    // `crateTierFor`), and a tier the player cannot READ is a tier that does
    // not exist — a heavy crate has to be recognisable as the thing to come
    // back for rather than discovered by wasting three seconds of fire on it.
    //
    // Same treatment as a barricade's HP, in the crate's own ink, sat under the
    // badge so the two never collide: the badge says WHICH stat, the number
    // says WHAT IT COSTS.
    const label = formatCount(Math.ceil(c.hp))
    const fs = Math.max(9, r * 0.62)
    ctx.font = `900 ${fs}px Angry, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, r * 0.16)
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.strokeText(label, 0, r * 0.98)
    ctx.fillStyle = '#fff'
    ctx.fillText(label, 0, r * 0.98)

    ctx.restore()
  }
}

/**
 * ─── Rescue cages ───────────────────────────────────────────────────────────
 *
 * The read has to happen in about a quarter of a second, against a prop the
 * player has been trained for weeks to recognise as a supply crate, so this
 * picture is built by taking every channel `drawCrates` uses and INVERTING it.
 * Any one of the three is enough on its own, which is the point — a colour-blind
 * player has the silhouette, a player glancing at the shoulder of the road has
 * the colour, and a player who is actually looking has the mark:
 *
 *   SILHOUETTE  a crate is a squat rounded square. A cage is TALL —
 *               `CAGE_DRAW_TALL` times its own half-width — and its outline is
 *               broken by four vertical bars with real gaps between them, so
 *               even at 24 px the shape reads as slats rather than as a block.
 *   COLOUR      a crate is a warm lit face inside a bright hue that throbs, and
 *               the throb IS its identity. A cage is cold dead iron with no
 *               coloured rim and no throb at all, lit from INSIDE by a warm
 *               lamp — light coming out of a dark object, the exact opposite
 *               arrangement, and the one thing on the road that glows amber.
 *   MARK        a crate carries a stat glyph (chevron / bolt) and the number on
 *               it is what it COSTS. A cage carries a huddled body and a `+N`
 *               in the crowd's own white — the same `+` a gate prints, because
 *               it is the same currency — and its cost number sits underneath
 *               in the identical place a crate's does, so the two numbers can
 *               never be confused for each other.
 *
 * The shake is the fourth channel and it only exists while the thing is being
 * shot: a crate CRACKS under fire and a cage RINGS. `Cage.flash` is set by the
 * round, decayed by the sim, and drives a fast lateral judder here.
 */

/** How much taller than wide a cage is drawn. The footprint stays `CAGE_R`
 *  square — this is the drawn body only, exactly as a barricade stands taller
 *  than the strip of road it occupies. */
const CAGE_DRAW_TALL = 1.5

const drawCages = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  for (const c of getCages()) {
    if (c.dead) continue
    const sx = worldToScreenX(c.x)
    const sy = worldToScreenY(c.y)
    if (sy < -60 || sy > viewH + 60) continue
    const r = CAGE_R * scale
    const hh = r * CAGE_DRAW_TALL
    const hurt = 1 - c.hp / c.maxHp

    // ── The lamp inside ──
    //
    // Warm, and the ONLY warm glow on the roadside. It flickers rather than
    // pulses: a pulse is the crates' language (a fixed rate, read as a stat),
    // and a flicker reads as a fire, which is what a light inside a cage is.
    const flick = 0.86 + Math.sin(t / 210) * 0.08 + Math.sin(t / 77) * 0.06
    const glowR = r * 2.1
    const glowKey = `cageGlow|${glowR}`
    let glow = getRamp(glowKey)
    if (!glow) {
      glow = putRamp(glowKey, ctx.createRadialGradient(0, 0, 0, 0, 0, glowR))
      glow.addColorStop(0, 'rgba(255,186,96,1)')
      glow.addColorStop(1, 'rgba(255,186,96,0)')
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.2 * flick
    ctx.translate(sx, sy - hh * 0.25)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, glowR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    // Judder, not spin. A cage bolted to the roadside does not roll, and the
    // shake has to be lateral or it reads as the prop sliding down the road.
    ctx.translate(sx + (c.flash > 0 ? Math.sin(t / 24) * c.flash * r * 0.14 : 0), sy)

    const top = -hh
    const bot = r * 0.72

    // The interior: a warm well, so the bars in front of it read as bars.
    const wellKey = `cageWell|${r}|${hh}`
    let well = getRamp(wellKey)
    if (!well) {
      well = putRamp(wellKey, ctx.createLinearGradient(0, bot, 0, top))
      well.addColorStop(0, '#7a4418')
      well.addColorStop(0.55, '#c87d2e')
      well.addColorStop(1, '#3a2410')
    }
    ctx.fillStyle = well
    roundRect(ctx, -r * 0.92, top + r * 0.16, r * 1.84, bot - top - r * 0.16, r * 0.16)
    ctx.fill()

    // The body inside. Two shapes and no more: a huddled mass and a head. It is
    // 12 px tall on a phone, so anything else is mud — and this is the whole
    // reason the prop is worth taking, so it may not be decoration.
    ctx.fillStyle = 'rgba(28,16,8,0.92)'
    ctx.beginPath()
    ctx.ellipse(0, bot - r * 0.36, r * 0.48, r * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, bot - r * 0.86, r * 0.27, 0, Math.PI * 2)
    ctx.fill()

    // ── The frame and the bars ──
    //
    // Drawn as strokes over the well rather than as a filled box with holes cut
    // in it: a stroked bar keeps its width at every zoom, and at the far end of
    // the road a filled slat would vanish while the gaps stayed.
    const iron = '#8b93a6'
    const ironDark = '#454c5e'
    ctx.lineCap = 'butt'
    ctx.strokeStyle = iron
    ctx.lineWidth = Math.max(1.4, r * 0.15)
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const bx = -r * 0.66 + (r * 1.32 * i) / 3
      // The bars BEND as the cage comes apart — the wear channel, and it is the
      // one a crate cannot have. A crate cracks along its face; a cage gives at
      // the middle of its slats, which is exactly where a crowd's fire lands.
      const bend = hurt * r * 0.22 * (i % 2 === 0 ? 1 : -1)
      ctx.moveTo(bx, top + r * 0.2)
      ctx.quadraticCurveTo(bx + bend, (top + bot) / 2, bx, bot - r * 0.06)
    }
    ctx.stroke()

    // Top rail, bottom rail, and the two posts — the cage's outline proper.
    ctx.strokeStyle = ironDark
    ctx.lineWidth = Math.max(2, r * 0.2)
    roundRect(ctx, -r * 0.92, top + r * 0.16, r * 1.84, bot - top - r * 0.16, r * 0.16)
    ctx.stroke()
    ctx.strokeStyle = iron
    ctx.lineWidth = Math.max(1.4, r * 0.12)
    ctx.beginPath()
    ctx.moveTo(-r * 0.92, top + r * 0.62)
    ctx.lineTo(r * 0.92, top + r * 0.62)
    ctx.stroke()

    // The lid: a plain iron cap, so the top of the silhouette is a hard shelf
    // and not a rounded box lid. It is the fastest half of the shape to read at
    // distance because it is the first part to come over the top of the screen.
    ctx.fillStyle = ironDark
    roundRect(ctx, -r, top, r * 2, r * 0.34, r * 0.1)
    ctx.fill()
    ctx.fillStyle = iron
    roundRect(ctx, -r * 0.92, top + r * 0.03, r * 1.84, r * 0.13, r * 0.05)
    ctx.fill()

    // ── The two numbers ──
    //
    // `+N` on the lid, in the crowd's white: what it PAYS, in the same notation
    // the gates use. The HP underneath in the crate's exact position and style:
    // what it COSTS. Two numbers on one prop is only legible because they never
    // move and never swap places.
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'

    const pay = `+${c.hold}`
    const pf = Math.max(9, r * 0.66)
    ctx.font = `900 ${pf}px Angry, sans-serif`
    ctx.lineWidth = Math.max(2, r * 0.16)
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.strokeText(pay, 0, top - r * 0.18)
    ctx.fillStyle = '#fff'
    ctx.fillText(pay, 0, top - r * 0.18)

    const label = formatCount(Math.ceil(c.hp))
    const fs = Math.max(9, r * 0.62)
    ctx.font = `900 ${fs}px Angry, sans-serif`
    ctx.lineWidth = Math.max(2, r * 0.16)
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.strokeText(label, 0, bot + r * 0.42)
    ctx.fillStyle = '#ffd7a1'
    ctx.fillText(label, 0, bot + r * 0.42)

    ctx.restore()
  }
}

/**
 * ─── The auto-shield pickup ─────────────────────────────────────────────────
 *
 * The opposite problem to the cage: this one has to look LIKE something the
 * player already knows. The timed shield skill owns a very specific vocabulary
 * — cool blue, a honeycombed dome, and the heater-shield crest that the boss's
 * own guard phase also uses — and a pickup that arms a shield while looking
 * like anything else would be a second thing to learn for no reason.
 *
 * So it borrows the crest and the blue outright, and separates itself from the
 * skill on the one axis that matters: the skill is a CLOCK and is drawn with a
 * countdown arc, and this has no arc anywhere, ever, because it has no clock.
 * What it has instead is a slow, steady turn — a thing sitting there, ready,
 * for as long as you leave it.
 */
const drawBulwarks = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  for (const w of getBulwarks()) {
    if (w.dead) continue
    const sx = worldToScreenX(w.x)
    const sy = worldToScreenY(w.y)
    if (sy < -60 || sy > viewH + 60) continue
    const r = BULWARK_R * scale
    const pulse = 0.5 + 0.5 * Math.sin(t / 420)

    // A cool halo on the crates' own terms — same cached-ramp trick, same
    // `globalAlpha` throb — so it belongs to the family of "things on the
    // shoulder worth shooting". Slow, because it is not urgent; a fast throb is
    // the rate crate's signature and this must not borrow it.
    const glowR = r * 2.4
    const glowKey = `bulwarkGlow|${glowR}`
    let glow = getRamp(glowKey)
    if (!glow) {
      glow = putRamp(glowKey, ctx.createRadialGradient(0, 0, 0, 0, 0, glowR))
      glow.addColorStop(0, 'rgba(120,215,255,1)')
      glow.addColorStop(1, 'rgba(120,215,255,0)')
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.14 + pulse * 0.16
    ctx.translate(sx, sy)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, glowR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(sx, sy)

    // The housing: a dark steel box, deliberately plainer than a supply crate.
    // It is a container for the thing on its face, and anything decorative on
    // the box competes with the crest that carries the whole meaning.
    const bodyKey = `bulwarkBody|${r}`
    let body = getRamp(bodyKey)
    if (!body) {
      body = putRamp(bodyKey, ctx.createLinearGradient(-r, -r, r * 0.4, r))
      body.addColorStop(0, '#2c3f52')
      body.addColorStop(1, '#101b26')
    }
    ctx.fillStyle = body
    roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.22)
    ctx.fill()
    ctx.strokeStyle = 'rgba(127,216,255,0.9)'
    ctx.lineWidth = Math.max(1.6, r * 0.13)
    roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.22)
    ctx.stroke()

    // The crest, turning. `paintCrest` is the same call the dome over the crowd
    // makes, so the pickup and the thing it gives are provably the same emblem
    // and not two shields that happen to look alike.
    ctx.save()
    ctx.rotate(Math.sin(w.spin) * 0.16)
    paintCrest(ctx, 'shield', 0, -r * 0.06, r * 0.52, r * 0.6, {
      fill: '#6fd6ff',
      rim: '#06263a',
      rimW: Math.max(1.6, r * 0.12),
      rib: 'rgba(6,38,58,0.9)',
      ribW: Math.max(1, r * 0.06)
    })
    ctx.restore()

    // The HP, in the crate's place and the crate's style — this is a box you
    // shoot, and the number that says how long that takes belongs where the
    // player already looks for it.
    const label = formatCount(Math.ceil(w.hp))
    const fs = Math.max(9, r * 0.62)
    ctx.font = `900 ${fs}px Angry, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, r * 0.16)
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.strokeText(label, 0, r * 0.98)
    ctx.fillStyle = '#cfefff'
    ctx.fillText(label, 0, r * 0.98)

    ctx.restore()
  }
}

/**
 * Boulders.
 *
 * The read has to be instant and it has to say ONE thing: *this is not yours to
 * break*. Every destructible object in the game is a rounded box with a number
 * and a warm rim; a boulder is an irregular grey lump with neither. No HP bar,
 * no badge, no glow — the absence of a number IS the mechanic, so nothing on it
 * may look like a meter.
 *
 * Silhouette over detail: it is drawn as a jittered polygon seeded per body, so
 * a rank of four reads as four rocks rather than one shape repeated, at a cost
 * of a dozen `lineTo`s. The lit top edge is what stops it reading as a hole in
 * the road.
 */
/**
 * The stones over the levers.
 *
 * Drawn as a BOULDER that carries a wall's damage marks, and the mixture is the
 * whole point of the picture. The game has taught the player one hard rule
 * about grey lumps on the road — `drawRocks` draws the thing fire cannot answer
 * — so a stone they are required to shoot has to break that rule visibly or it
 * reads as a wall around the prize and the puzzle simply stops being attempted.
 *
 * What it borrows from the barricade is exactly the "shoot me" vocabulary and
 * nothing else: the health bar along the top edge and the number on the face,
 * which are the two marks every destructible thing in the game wears. What it
 * keeps from the boulder is the silhouette and the painted art, so it still
 * belongs to the road it is standing on.
 *
 * It also cracks as it goes: the fill dims and the outline hardens with the
 * remaining health, so a player who is winning the exchange can see that they
 * are without reading the number.
 */
const drawStones = (ctx: CanvasRenderingContext2D): void => {
  for (const st of getStones()) {
    if (st.dead) continue
    const sy = worldToScreenY(st.y)
    if (sy < -80 || sy > viewH + 80) continue
    const sx = worldToScreenX(st.x)
    const w = st.w * scale
    const h = STONE_H * scale
    const hp01 = Math.max(0, st.hp / st.maxHp)

    ctx.save()
    ctx.translate(sx, sy)

    // Contact shadow, so it sits ON the road rather than floating over it.
    ctx.fillStyle = 'rgba(0,0,0,0.42)'
    ctx.beginPath()
    ctx.ellipse(0, h * 0.42, w * 0.52, h * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.rotate(st.spin * 0.25)
    paintBoulder(ctx, w, h, st.seed)
    // Damage: the stone darkens and reddens as it comes apart, over the whole
    // silhouette rather than as a decal, so it works for the painted art and
    // the drawn fallback alike.
    if (hp01 < 1) {
      ctx.globalCompositeOperation = 'source-atop'
      ctx.globalAlpha = (1 - hp01) * 0.5
      ctx.fillStyle = '#5a2b22'
      ctx.fillRect(-w * 0.6, -h * 0.6, w * 1.2, h * 1.2)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()

    // The two marks that say "this one can be shot": the bar and the number.
    // The bar is a readout, so a recorded feed keeps only the number.
    if (!HIDE_READOUTS) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(-w / 2, -h / 2 - h * 0.24, w, h * 0.14)
      ctx.fillStyle = hp01 > 0.5 ? '#7ee08a' : hp01 > 0.22 ? '#ffcf3c' : '#ff6a5a'
      ctx.fillRect(-w / 2, -h / 2 - h * 0.24, w * hp01, h * 0.14)
    }

    const label = formatCount(Math.ceil(st.hp))
    ctx.font = `900 ${Math.max(10, h * 0.44)}px Angry, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, h * 0.13)
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.strokeText(label, 0, h * 0.06)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, 0, h * 0.06)

    if (st.flash > 0) {
      ctx.globalAlpha = st.flash * 0.5
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
}

const drawRocks = (ctx: CanvasRenderingContext2D): void => {
  for (const r of getRocks()) {
    const sy = worldToScreenY(r.y)
    if (sy < -80 || sy > viewH + 80) continue
    const sx = worldToScreenX(r.x)
    const w = r.w * scale
    const h = ROCK_H * scale

    ctx.save()
    ctx.translate(sx, sy)

    // Contact shadow, so it sits ON the road rather than floating over it.
    ctx.fillStyle = 'rgba(0,0,0,0.42)'
    ctx.beginPath()
    ctx.ellipse(0, h * 0.42, w * 0.52, h * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.rotate(r.spin * 0.25)
    paintBoulder(ctx, w, h, r.seed)

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

    paintBarricadeBody(ctx, w, h)

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
    // bar tells you at a glance whether you are winning the exchange. The bar
    // is a readout, so a recorded feed keeps only the number.
    if (!HIDE_READOUTS) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(-w / 2, -h / 2 - h * 0.2, w, h * 0.14)
      ctx.fillStyle = hp01 > 0.5 ? '#7ee08a' : hp01 > 0.22 ? '#ffcf3c' : '#ff6a5a'
      ctx.fillRect(-w / 2, -h / 2 - h * 0.2, w * hp01, h * 0.14)
    }

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
  // Cached. `measureText` shapes the string exactly as a draw does, and this ran
  // once per leaf per frame for a label that changes twice a second at most — it
  // profiled at 1.6 % of all samples on a throttled phone, more than any actual
  // drawing the gates do.
  const need = measureLabel(ctx, label, font) + font * 0.8
  const maxW = Math.max(scale * 0.9, halfPx * 1.92)
  if (need > maxW) font = Math.max(9, font * (maxW / need))
  return { w: Math.min(maxW, Math.max(need, scale * 1.05, halfPx * 0.95)), font }
}

const drawGates = (ctx: CanvasRenderingContext2D): void => {
  const t = nowMs()
  // The pump interval shortens with the stage, and the meter has to be
  // measured against the SAME clock the sim charges on — a bar that fills at
  // 500 ms while the door ticks at 400 reads as a gate that pumps early.
  const addTickMs = gateTickMs('add', stage.value)
  const scaleTickMs = gateTickMs('mul', stage.value)
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
    const mul = g.op === 'mul' && !g.mystery
    const bad = g.op === 'div' && !g.mystery
    // ── A face-down door gives nothing away ──
    //
    // Not just the number: the whole dressing. The curtain's tint, the crooked
    // plate and the trap's unlit frame are all tells a player learns to read in
    // the first five stages, and a `?` sitting behind a red unlit curtain is
    // not a mystery — it is a `÷` with the number filed off. So a mystery leaf
    // borrows the neutral `add` dressing and stands square: the ONLY thing the
    // player has to go on is where it is.
    // Both hostile ops otherwise get the trap's unlit curtain and crooked plate:
    // whatever else separates them, the first thing the player has to read is
    // 'this door takes something', and that read is carried by lighting and
    // tilt long before the glyph is legible.
    const mystery = g.mystery
    const hostile = !mystery && (g.op === 'div' || g.op === 'sub')
    const tint = GATE_TINT[mystery ? 'add' : g.op]
    const pop = g.pop

    ctx.save()
    ctx.translate(cx, sy)

    // Curtain. A hostile leaf's is muddier and flatter — a lit doorway reads as
    // an opening no matter what colour it is, so neither the trap nor the bill
    // may be lit. Their cores differ: soot for the trap, scorched earth for the
    // bill, which is the second-glance difference once 'both are bad' has
    // landed.
    //
    // Cached on the four things that shape it. It was already expressed in the
    // leaf's own local space, so this needs no geometry change — and `hot` is
    // the only term that moves, which it does about twice a second.
    const curtainKey = `gateCurtain|${g.op}|${hot ? 1 : 0}|${height}`
    let curtain = getRamp(curtainKey)
    if (!curtain) {
      curtain = putRamp(curtainKey, ctx.createLinearGradient(0, -height / 2, 0, height / 2))
      if (hostile) {
        curtain.addColorStop(0, `rgba(${tint.glow},0.30)`)
        curtain.addColorStop(0.5, bad ? 'rgba(40,10,8,0.42)' : 'rgba(46,26,6,0.42)')
        curtain.addColorStop(1, `rgba(${tint.glow},0.26)`)
      } else {
        curtain.addColorStop(0, `rgba(${tint.glow},${hot ? 0.34 : 0.2})`)
        curtain.addColorStop(0.5, `rgba(${tint.glow},${hot ? 0.16 : 0.08})`)
        curtain.addColorStop(1, `rgba(${tint.glow},${hot ? 0.3 : 0.18})`)
      }
    }
    ctx.fillStyle = curtain
    ctx.fillRect(-halfW, -height / 2, halfW * 2, height)

    // Chevrons. `dir` flips both the arrowhead AND the scroll direction, so the
    // trap's flow is unmistakably the wrong way round even when the two gates
    // are the same size and the player is looking at the other one.
    //
    // Dropped at `min`: six stroked polylines under a clip, per leaf, for an
    // animation that says the same thing the arrowhead's static direction
    // already says.
    const dir = hostile ? -1 : 1
    if (!minFx) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(-halfW, -height / 2, halfW * 2, height)
      ctx.clip()
      ctx.globalAlpha = hostile ? 0.46 : hot ? 0.5 : 0.28
      ctx.strokeStyle = tint.a
      ctx.lineWidth = Math.max(1.5, scale * 0.045)
      const flow = ((t / 420) % 1) * height * 0.5 * dir
      // ONE path for all six, and one `stroke`. Six separate strokes of a
      // three-point polyline is six rasteriser submissions for a shape the
      // rasteriser can take in a single pass; the pixels are identical because
      // the chevrons never overlap each other.
      ctx.beginPath()
      for (let i = -2; i < 4; i++) {
        const y = -height / 2 + i * height * 0.5 + flow
        ctx.moveTo(-halfW * 0.8, y - height * 0.12 * dir)
        ctx.lineTo(0, y + height * 0.1 * dir)
        ctx.lineTo(halfW * 0.8, y - height * 0.12 * dir)
      }
      ctx.stroke()
      // Two dark bars across the trap's opening. They cost four line ops and they
      // make the leaf read as BARRED rather than merely red.
      if (bad) {
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = '#1a0c0a'
        ctx.lineWidth = Math.max(2, scale * 0.07)
        ctx.beginPath()
        for (const bx of [-halfW * 0.42, halfW * 0.42]) {
          ctx.moveTo(bx, -height / 2)
          ctx.lineTo(bx, height / 2)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    // Posts — or the painted frame, nine-sliced to this leaf's own width.
    paintGateFrame(ctx, g.op, halfW, height, scale)
    // The foot of each post sparks while the door is being pumped. Additive,
    // after both posts, so it reads as light on the ironwork.
    if (!bad && hot && !minFx) {
      const sparkR = scale * 0.7
      const sparkKey = `gateSpark|${tint.glow}|${sparkR}`
      let spark = getRamp(sparkKey)
      if (!spark) {
        spark = putRamp(sparkKey, ctx.createRadialGradient(0, 0, 0, 0, 0, sparkR))
        spark.addColorStop(0, `rgba(${tint.glow},0.55)`)
        spark.addColorStop(1, `rgba(${tint.glow},0)`)
      }
      for (const side of [-1, 1] as const) {
        ctx.save()
        ctx.translate(side * halfW, 0)
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = spark
        ctx.beginPath()
        ctx.arc(0, 0, sparkR, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // Plate + number. The plate scales on `pop`, which is set on every tick —
    // a number that jumps is the difference between "it changed" and "I DID
    // that". The trap's plate is tilted off true: nothing else on screen is
    // crooked, so the tilt alone flags it before the glyph is readable.
    const s = 1 + pop * 0.28
    const shown = gateValueLabel(g.value)
    // A face-down door wears a question mark and nothing else — the dressing
    // around it was already neutralised at the top of the loop.
    const label = g.mystery
      ? '?'
      : bad ? `÷${shown}` : g.op === 'sub' ? `−${shown}` : mul ? `×${shown}` : `+${shown}`
    const plateH = height * 0.52
    // Measured OUTSIDE the pop scale, so the punch magnifies a plate that was
    // already the right size rather than changing how the number is laid out
    // sixty times a second.
    const metrics = measurePlate(ctx, label, halfW, plateH)
    const plateW = metrics.w
    const lineW = Math.max(2, scale * 0.055)

    ctx.save()
    ctx.scale(s, s)
    // Both hostile plates hang crooked, and they lean OPPOSITE ways — in a
    // dilemma bank the two doors are then distinguishable by silhouette alone,
    // before either number is readable.
    if (hostile) ctx.rotate(bad ? -0.07 : 0.07)

    // The ramp is cached; the plate is not baked. Rendering the whole plate —
    // frame, outline and number — into a sprite and blitting it was built and
    // measured, and came back a dead null at 6x CPU throttle over real
    // gameplay. See `PERF-LEDGER.md`, 2026-09-05.
    const plateKey = `gatePlate|${g.op}|${plateH}`
    let plate = getRamp(plateKey)
    if (!plate) {
      plate = putRamp(plateKey, ctx.createLinearGradient(0, -plateH / 2, 0, plateH / 2))
      plate.addColorStop(0, tint.plateA)
      plate.addColorStop(1, tint.plateB)
    }
    ctx.fillStyle = plate
    roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
    ctx.fill()
    ctx.lineWidth = lineW
    ctx.strokeStyle = hostile
      ? (bad ? 'rgba(30,6,4,0.95)' : 'rgba(36,18,4,0.95)')
      : 'rgba(10,14,24,0.9)'
    roundRect(ctx, -plateW / 2, -plateH / 2, plateW, plateH, plateH * 0.26)
    ctx.stroke()

    // `measurePlate` did NOT leave the font set — its width came from a cache
    // that never touched the context — so the size is applied here.
    ctx.font = `900 ${metrics.font}px Angry, sans-serif`
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
    // crowd's fire has got. Without it, pumping feels like a slot machine.
    //
    // EVERY door that can still grow, not just `+N`. This said `add` only, from
    // back when the additive doors were the only ones that moved — so a
    // multiplier being pumped showed no sign of it, and the one mechanic that
    // makes a bank a decision was invisible while it happened. A trap's meter
    // fills in its own hostile tint, which is the point: the bar is a warning
    // there, not a promise.
    if (g.value < gatePumpCap(g.op) && (hot || g.charge > 0)) {
      const barW = plateW * 1.02
      const frac = Math.max(0, Math.min(1, g.charge / (isScaleOp(g.op) ? scaleTickMs : addTickMs)))
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
    ctx.translate(sx, sy)
    // A blast that paid somebody is white-blue and hard. One that paid nobody is
    // a dull red bruise travelling the same path — same event, no light in it.
    // Only the lit blast has a painting; the bruise stays drawn.
    paintRing(ctx, 'shock', r, r * 0.3, Math.max(1.5, scale * 0.16 * (1 - k)),
      s.bleak ? `rgba(190,84,70,${a * 0.5})` : `rgba(215,240,255,${a * 0.75})`,
      { procedural: s.bleak, alpha: a * 0.75 })
    // A second ring lagging behind the first gives the blast a THICKNESS, which
    // is the difference between a shockwave and an outline.
    if (richFx && !s.bleak && r > scale * 0.6) {
      paintRing(ctx, 'shock', r * 0.72, r * 0.72 * 0.3, Math.max(1, scale * 0.07 * (1 - k)),
        `rgba(255,255,255,${a * 0.3})`, { alpha: a * 0.3 })
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
    if (warn > 0.02 && !minFx) {
      const glowR = Math.min(halfPx * 6, spacing * 0.28 * scale)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      // The throb used to be the first stop's alpha, which is the one thing a
      // cache key cannot hold — a new ramp per pillar per frame. It moves to
      // `globalAlpha`, which is exact rather than an approximation here: the
      // last stop is fully transparent, so it premultiplies to zero and the
      // ramp is a pure alpha scale of itself. See `useGradientRamps`.
      const wgKey = `dividerWarn|${glowR}`
      let wg = getRamp(wgKey)
      if (!wg) {
        wg = putRamp(wgKey, ctx.createRadialGradient(0, 0, 0, 0, 0, glowR))
        wg.addColorStop(0, 'rgba(255,60,40,1)')
        wg.addColorStop(1, 'rgba(255,60,40,0)')
      }
      // Two pillars stack their glows additively over the lane between them, so
      // a tight bank dims each one and arrives at the same total heat.
      const solo = spacing > CROWD_MAX_R * 3 ? 1 : 0.7
      ctx.globalAlpha = (0.16 + warn * beat * 0.3) * solo
      ctx.fillStyle = wg
      ctx.beginPath()
      ctx.ellipse(0, 0, glowR, h * 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // The striped post and its caps, drawn or painted.
    paintPillarBody(ctx, halfPx, h, scale, pattern)

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
      if (!minFx) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        // Alpha to `globalAlpha` (exact — the outer stop is transparent), and
        // the amber-to-red shift quantised into eight buckets so the ramp has a
        // key at all. `warn` is continuous, so at full precision this site could
        // never hit the cache; a bucket is at most 9/255 of green, on a glow
        // whose whole job is to be a soft wash of colour.
        const lampG = Math.round((120 - warn * 70) / 8) * 8
        const lampR = halfPx * 3
        const lgKey = `dividerLamp|${lampG}|${lampR}`
        let lg = getRamp(lgKey)
        if (!lg) {
          lg = putRamp(lgKey, ctx.createRadialGradient(0, -h * 0.62, 0, 0, -h * 0.62, lampR))
          lg.addColorStop(0, `rgba(255,${lampG},60,1)`)
          lg.addColorStop(1, `rgba(255,${lampG},60,0)`)
        }
        ctx.globalAlpha = 0.35 + lamp * 0.4
        ctx.fillStyle = lg
        ctx.beginPath()
        ctx.arc(0, -h * 0.62, lampR, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
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
  // Frozen, the whole road holds its pose: the walk cycle and the flyers' bob
  // are read off the moment of the freeze rather than off the running clock.
  const frozen = frostActive()
  const t = frozen ? frostFrozenAt() : nowMs()
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
    // A BURROWER UNDER THE ROAD HAS NO BODY ON IT. `drawBurrowMounds` paints the
    // ground it is moving through instead. Skipped after the off-screen marker
    // above has already recorded it, so the arrow at the top of the screen still
    // points at an elite the player cannot see — which is the one case that
    // marker exists for.
    if (f.kind === 'burrower' && f.fuse > 0) continue
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
      // Scaled off the frame the strip handed back rather than off the bake's
      // pixel constants, and lined up by the FEET, so a painted strip at any
      // resolution stands exactly where the baked one does.
      const k = (size * 1.5) / (frame.height * SPRITE_HEIGHT_R)
      const dw = frame.width * k
      const dh = frame.height * k
      const top = -frame.height * SPRITE_FOOT_R * k
      // Foes walk DOWN the screen at us; the designs are authored facing left
      // or right, so mirror the side-facing ones to keep the cast coherent.
      const mirror = monsterFaces(f.design) === 'left' ? -1 : 1
      ctx.save()
      ctx.scale(mirror, 1)
      ctx.drawImage(frame, -dw / 2, top, dw, dh)
      ctx.restore()

      // Encased in ice, under the hit flash so a brittle body still visibly
      // takes the rounds it is taking. See `drawIceOn`.
      if (frozen) drawIceOn(ctx, frame, mirror, -dw / 2, top, dw, dh, size * (f.elite ? 0.82 : 0.72), f.id, sx, sy)

      if (f.flash > 0.02) {
        // Hit flash: re-blit the frame as a white silhouette. Cheap, and it is
        // the single most important piece of feedback in the game after the
        // gate number.
        ctx.save()
        ctx.globalAlpha = Math.min(1, f.flash) * 0.85
        ctx.globalCompositeOperation = 'lighter'
        ctx.scale(mirror, 1)
        ctx.drawImage(frame, -dw / 2, top, dw, dh)
        ctx.restore()
      }
    } else {
      // Fallback while the strip bakes.
      ctx.fillStyle = f.flash > 0.02 ? '#ffffff' : '#8d3238'
      ctx.beginPath()
      ctx.ellipse(0, -size * 0.35, size * 0.3, size * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()
      if (frozen) drawIceOn(ctx, null, 1, -size * 0.3, -size * 0.77, size * 0.6, size * 0.84, size * 0.72, f.id, sx, sy)
    }

    // A slim HP bar, only once the foe has actually been hit — an untouched
    // pack should read as bodies, not as a spreadsheet.
    //
    // Minibosses break that rule on purpose: they are a FIGHT, and a fight the
    // player cannot see the length of is a fight they will disengage from. The
    // bar is up from the first frame, wider, and framed so it does not read as
    // "a normal foe that happens to be hurt".
    // …and none of it in a recorded feed: a health bar is a readout. The crown
    // is not — it is how the miniboss is told apart from the pack — so it is
    // drawn on its own below, at the height the bar would have put it.
    if (HIDE_READOUTS) {
      if (f.elite) paintCrown(ctx, 0, -size * 1.14, size * 0.3, size * 0.17, Math.max(1, size * 0.016))
    } else if (f.elite || f.hp < f.maxHp) {
      const bw = size * (f.elite ? 1.02 : 0.6)
      const bh = size * (f.elite ? 0.17 : 0.07)
      const by = -size * (f.elite ? 1.08 : 0.98)
      const hp01 = Math.max(0, f.hp / f.maxHp)
      const left = -bw / 2

      if (f.elite) {
        // ── The miniboss plate ──
        //
        // Built like the boss bar in the HUD rather than like a foe's dot of
        // health: a dark socket, a RED tube lit from the top, a pale chip
        // running late behind the hit, quarter notches and a glass sheen. The
        // old one was a thin orange sliver, which is the same shape the game
        // uses for "a normal foe that happens to be hurt" — and a fight the
        // player cannot see the length of is a fight they disengage from.
        const chip = chipFor(f.id, hp01, lastDtMs)
        const r = bh * 0.34

        // Socket, with a warm rim so it reads as a fixture and not as a shadow.
        ctx.fillStyle = 'rgba(22,6,8,0.88)'
        roundRect(ctx, left - bh * 0.16, by - bh * 0.16, bw + bh * 0.32, bh + bh * 0.32, r)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'
        ctx.lineWidth = Math.max(1.5, size * 0.022)
        ctx.stroke()

        // The chip first, so the red sits on top of it.
        if (chip > hp01) {
          ctx.fillStyle = '#ffd9c6'
          roundRect(ctx, left, by, bw * chip, bh, r)
          ctx.fill()
        }

        // The tube: hot band across the middle, dark at the bottom.
        if (hp01 > 0) {
          const tubeKey = `eliteTube|${by}|${bh}`
          let g = getRamp(tubeKey)
          if (!g) {
            g = putRamp(tubeKey, ctx.createLinearGradient(0, by, 0, by + bh))
            g.addColorStop(0, '#ff8a72')
            g.addColorStop(0.42, '#ec1f22')
            g.addColorStop(1, '#8e0d12')
          }
          ctx.fillStyle = g
          roundRect(ctx, left, by, bw * hp01, bh, r)
          ctx.fill()
        }

        // Quarter notches, so "half gone" is checkable rather than estimated.
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'
        ctx.lineWidth = Math.max(1, size * 0.016)
        ctx.beginPath()
        for (let q = 1; q < 4; q++) {
          const x = left + (bw * q) / 4
          ctx.moveTo(x, by)
          ctx.lineTo(x, by + bh)
        }
        ctx.stroke()

        // Sheen across the top half.
        const sheenKey = `eliteSheen|${by}|${bh}`
        let sheen = getRamp(sheenKey)
        if (!sheen) {
          sheen = putRamp(sheenKey, ctx.createLinearGradient(0, by, 0, by + bh))
          sheen.addColorStop(0, 'rgba(255,255,255,0.34)')
          sheen.addColorStop(0.45, 'rgba(255,255,255,0.05)')
          sheen.addColorStop(1, 'rgba(0,0,0,0.2)')
        }
        ctx.fillStyle = sheen
        roundRect(ctx, left, by, bw, bh, r)
        ctx.fill()

        // Outer frame last, over everything.
        ctx.strokeStyle = 'rgba(255,190,150,0.55)'
        ctx.lineWidth = Math.max(1, size * 0.014)
        roundRect(ctx, left, by, bw, bh, r)
        ctx.stroke()
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(left, by, bw, bh)
        ctx.fillStyle = hp01 > 0.45 ? '#8ce07a' : '#ff6a5a'
        ctx.fillRect(left, by, bw * hp01, bh)
      }

      if (f.elite) {

        // Crown over the bar. Three points and a base: the universal "this one
        // is the important one" mark, drawn small enough that a pack with one
        // elite in it still reads as a pack.
        paintCrown(ctx, 0, by - size * 0.06, size * 0.3, size * 0.17, Math.max(1, size * 0.016))
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
  // A screen-edge pointer at an off-screen thing is HUD that happens to be
  // painted on the canvas — off in a recorded feed.
  if (HIDE_READOUTS) return
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
  paintCrown(ctx, x, y + s * 1.55, s * 0.9, s * 0.5, Math.max(1, s * 0.1))
  ctx.restore()
}

/** The boss guard barrier's outline, as a closed hexagon centred on `cy`.
 *  Point-up (a -90° start) so a flat edge faces the player rather than a corner.
 *
 *  Shared by the fill and the stroke: they used to disagree — an ellipse fill
 *  inside a hexagonal outline — which read as a circle with an unrelated diamond
 *  border rather than as one shield. Module scope, not a closure inside the draw
 *  call, to keep the frame allocation-free. */
const guardHexPath = (
  ctx: CanvasRenderingContext2D, cy: number, rx: number, ry: number
): void => {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    const px = Math.cos(a) * rx
    const py = cy + Math.sin(a) * ry
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/**
 * An ember-coloured copy of one baked frame, for phase two's colour shift.
 *
 * A `WeakMap` on the source canvas rather than a keyed cache, because the thing
 * being keyed IS a canvas the baker owns: a boss cycles through eight of them
 * and a painted strip swaps them out from under the renderer mid-fight (see
 * `monsterFrame`). Keyed by identity, a re-bake or an art override simply stops
 * hitting and gets tinted once more; keyed by a string, it would either collide
 * across designs or hold the old bitmaps alive for the session.
 *
 * `source-in` over the drawn frame keeps the silhouette exactly — the same
 * one-line trick `tintSilhouette` uses on the ridge bands, and the reason this
 * can be composited with `lighter` without haloing: every pixel outside the
 * body is transparent black, which adds nothing.
 */
const emberFrames = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()
const EMBER_TINT = '#ff5a20'

const emberFrame = (src: HTMLCanvasElement): HTMLCanvasElement | null => {
  const hit = emberFrames.get(src)
  if (hit) return hit
  if (src.width === 0 || src.height === 0) return null
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const t = c.getContext('2d')
  if (!t) return null
  t.drawImage(src, 0, 0)
  t.globalCompositeOperation = 'source-in'
  t.fillStyle = EMBER_TINT
  t.fillRect(0, 0, c.width, c.height)
  emberFrames.set(src, c)
  return c
}

/**
 * The gatling's round, recoloured once per painted source.
 *
 * Same shape as `emberFrame` and for the same reasons: keyed on the source
 * canvas by identity, so a re-bake or an art override simply stops hitting and
 * is tinted again, and `source-in` keeps the streak's silhouette exactly, which
 * is what lets it stay composited with `lighter` without a halo.
 */
const redTracers = new WeakMap<CanvasImageSource, HTMLCanvasElement>()
const GATLING_TINT = '#ff5436'

const redTracer = (src: CanvasImageSource): HTMLCanvasElement | null => {
  const hit = redTracers.get(src)
  if (hit) return hit
  const w = (src as HTMLCanvasElement).width
  const h = (src as HTMLCanvasElement).height
  if (!w || !h) return null
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const t = c.getContext('2d')
  if (!t) return null
  t.drawImage(src, 0, 0)
  t.globalCompositeOperation = 'source-in'
  t.fillStyle = GATLING_TINT
  t.fillRect(0, 0, w, h)
  redTracers.set(src, c)
  return c
}

/**
 * ─── The gaze: an eye over the boss, and the beam it fires ──────────────────
 *
 * Drawn from the WORLD rather than from the cast events, for the reason
 * `drawRollers` gives: the eye sits on the boss, and during its opening the boss
 * is still walking and tracking, so an event pushed at the start of the wind-up
 * could not say where it would be. The simulation answers two scalars every
 * frame (`bossGazeOpening`, `bossGazeLeft01`) and the picture is read off them.
 *
 * ── Violet, and on purpose ──
 *
 * Every telegraph in this game already owns a colour and a meaning: heat is
 * "get off this ground", blue is "get onto this ground", green is the heal. The
 * gaze asks for a fourth thing — STOP — and it gets the one hue nothing else on
 * the road uses, so it can never be read as a variation on any of them. The
 * corner badge pulses the same violet (`IncomingWarning.vue`).
 *
 * Three layers, each answering one question:
 *
 *   THE EYE      is it coming, and how soon. An almond whose aperture IS the
 *                wind-up — half open is half way — above the boss's head,
 *                where the player's eyes already are during a boss fight.
 *   THE RING     how long must I hold. A clock around the open eye, closing as
 *                the watch runs out.
 *   THE EDGES    is it watching NOW. The screen's borders tint violet for
 *                exactly the window in which moving is punished, so the answer
 *                reaches a player whose eyes are on their own thumb.
 */
interface GazeBeam {
  /** Where the crowd was when it moved, in world space — the beam's far end. */
  x: number
  y: number
  /** The boss's body, in world space, and its scale — so the beam leaves the
   *  pupil wherever the pupil is drawn this frame. */
  bx: number
  by: number
  bscale: number
  halfW: number
  t: number
}

/** How long a strike's beam stays on screen, seconds. The damage is already
 *  paid on the frame it fires; this is the explanation, and it only needs to be
 *  long enough to be seen. */
const GAZE_BEAM_S = 0.42

const gazeBeams: GazeBeam[] = []

const stepGazeBeams = (dtMs: number): void => {
  for (let i = gazeBeams.length - 1; i >= 0; i--) {
    const g = gazeBeams[i]!
    g.t += dtMs / 1000
    if (g.t >= GAZE_BEAM_S) gazeBeams.splice(i, 1)
  }
}

/**
 * Where the eye sits over a boss body, in screen space. Shared by the eye and
 * the beam, so the beam leaves from the pupil the player was watching.
 *
 * 1.32 of the body's `size` above its feet, which is measured against the
 * designs rather than the frame box. `drawBossBody` scales the character box to
 * `size * 1.6`, but most of the cast do not fill it — the stage-1 grumpling's
 * head tops out around `1.05`, so an eye parked at the box's top floated a
 * whole head clear of the creature it belonged to. At 1.32 its lower lid rests
 * on a short design's crown and a tall one (Thornwick's canopy) wears it on the
 * brow: over the boss either way, and never mistakable for a separate thing.
 */
const gazeEyeAt = (bx: number, by: number, bossScale: number): { x: number; y: number; r: number } => {
  const size = bossScale * scale * 1.3
  return { x: worldToScreenX(bx), y: worldToScreenY(by) - size * 1.32, r: size * 0.34 }
}

const drawBossGaze = (ctx: CanvasRenderingContext2D): void => {
  const b = getBoss()
  if (b) {
    const open = bossGazeOpening()
    if (open > 0.001) {
      const { x, y, r } = gazeEyeAt(b.x, b.y, b.scale)
      const watching = bossGazeWatching()
      const t = nowMs() / 1000
      // The aperture eases OPEN — slow at first, snapping wide at the end — so
      // the last tenth of a second before the watch begins is the most
      // conspicuous frame of the whole wind-up, which is the frame the player
      // has to stop on.
      const lid = watching ? 1 : open * open * (3 - 2 * open)
      const w = r * 1.45
      const h = r * Math.max(0.06, lid) * 0.82

      ctx.save()
      ctx.translate(x, y)
      // Halo: soft, additive, pulsing faster once it is watching.
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = (watching ? 0.34 + 0.12 * Math.sin(t * 14) : 0.18 * lid)
      ctx.fillStyle = '#b46bff'
      ctx.beginPath()
      ctx.ellipse(0, 0, w * 1.35, w * 0.95, 0, 0, TAU)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'

      // The almond: the white of the eye, then the iris, then a slit pupil. The
      // pupil TRACKS the crowd while it is watching, which is the whole of the
      // read — this is the one attack in the game that is looking at you.
      ctx.globalAlpha = 1
      ctx.fillStyle = '#f4ecff'
      ctx.strokeStyle = '#2a0c3f'
      ctx.lineWidth = Math.max(2, r * 0.12)
      ctx.beginPath()
      ctx.moveTo(-w, 0)
      ctx.quadraticCurveTo(0, -h * 2, w, 0)
      ctx.quadraticCurveTo(0, h * 2, -w, 0)
      ctx.closePath()
      ctx.fill()
      ctx.save()
      ctx.clip()
      const a = anchor()
      const look = Math.max(-1, Math.min(1, (worldToScreenX(a.x) - x) / (viewW * 0.4)))
      const ir = r * 0.62
      const ix = look * (w - ir) * 0.7
      ctx.fillStyle = watching ? '#a430ff' : '#8a3fd1'
      ctx.beginPath()
      ctx.arc(ix, 0, ir, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#12021d'
      ctx.beginPath()
      ctx.ellipse(ix, 0, ir * 0.22, ir * 0.82, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(ix - ir * 0.3, -ir * 0.35, ir * 0.16, 0, TAU)
      ctx.fill()
      ctx.restore()
      ctx.stroke()

      // The clock: how much of the watch is left, closing clockwise.
      if (watching) {
        const left = bossGazeLeft01()
        ctx.strokeStyle = '#e2c6ff'
        ctx.lineWidth = Math.max(3, r * 0.16)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(0, 0, w * 1.18, -Math.PI / 2, -Math.PI / 2 + left * TAU)
        ctx.stroke()
      }
      ctx.restore()

      // ── The edges: it is watching NOW ──
      //
      // Three nested strokes rather than a gradient, so it costs three calls and
      // no allocation, and it sits at the screen's border where it cannot hide
      // anything the player is reading.
      if (watching) {
        ctx.save()
        ctx.strokeStyle = '#8a2be2'
        const edge = Math.min(viewW, viewH)
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.09 + i * 0.05
          ctx.lineWidth = edge * (0.09 - i * 0.028)
          ctx.strokeRect(0, 0, viewW, viewH)
        }
        ctx.restore()
      }
    }
  }

  // ── The beam, when the eye saw the crowd move ──
  if (gazeBeams.length === 0) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const g of gazeBeams) {
    const k = g.t / GAZE_BEAM_S
    const fade = 1 - k
    const tx = worldToScreenX(g.x)
    const ty = worldToScreenY(g.y)
    const from = gazeEyeAt(g.bx, g.by, g.bscale)
    const half = g.halfW * scale * (0.7 + 0.3 * fade)
    // A wedge from the pupil to the whole width of the crowd's column, so what
    // the player sees is exactly the ground that paid.
    ctx.globalAlpha = 0.55 * fade
    ctx.fillStyle = '#c77dff'
    ctx.beginPath()
    ctx.moveTo(from.x - half * 0.12, from.y)
    ctx.lineTo(from.x + half * 0.12, from.y)
    ctx.lineTo(tx + half, ty + half * 0.35)
    ctx.lineTo(tx - half, ty + half * 0.35)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 0.85 * fade
    ctx.fillStyle = '#f6e9ff'
    ctx.beginPath()
    ctx.moveTo(from.x - half * 0.04, from.y)
    ctx.lineTo(from.x + half * 0.04, from.y)
    ctx.lineTo(tx + half * 0.3, ty)
    ctx.lineTo(tx - half * 0.3, ty)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// ─── The fallen boss ────────────────────────────────────────────────────────
//
// A boss used to fade to nothing over its death beat while the next stage was
// built somewhere else. Now the next road opens under the crowd (`advanceStage`),
// and the body is what says so: it topples in toward the middle of the road and
// lies there, dimmed, while the squad walks on past it. The death beat and the
// corpse are ONE drawing at two values of `k`, so the handover cannot pop.

/** How far the body rolls onto its side, radians. Short of a quarter turn: the
 *  sprites are drawn in three-quarter view, and a full 90° lays the head flat
 *  along a rung, where it reads as a sticker rather than as something heavy. */
const FALLEN_TILT = 1.32
/** How far it slides back along its own length as it goes down, in body sizes,
 *  so the lying body stays over the ground it stood on instead of beside it. */
const FALLEN_SLIDE = 0.5
/** The frame of the stride it is frozen on. A corpse still walking in place is
 *  the one thing that would make it read as alive. */
const FALLEN_CYCLE = 0.2

/** A dimmed copy of each frame, baked once. Keyed on the frame itself, so a
 *  painting that decodes later gets its own copy rather than the drawing's. */
const fallenTints = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()

const fallenTint = (frame: HTMLCanvasElement): HTMLCanvasElement | null => {
  const hit = fallenTints.get(frame)
  if (hit) return hit
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = frame.width
  c.height = frame.height
  const g = c.getContext('2d')
  if (!g) return null
  g.drawImage(frame, 0, 0)
  // `source-atop` tints the sprite's own pixels and nothing else — on a canvas
  // that holds only the sprite. (On the scene canvas it would tint the road too,
  // which is the trap the ember pass in `drawBossBody` describes.)
  g.globalCompositeOperation = 'source-atop'
  // Cool, not warm: a reddish dim over a fallen body reads as gore, and this is
  // a game children play.
  g.fillStyle = 'rgba(20, 16, 36, 0.56)'
  g.fillRect(0, 0, c.width, c.height)
  fallenTints.set(frame, c)
  return c
}

// ─── The goo it leaves ──────────────────────────────────────────────────────
//
// What says "FALLEN" rather than "lying down" is the pool under the body — and
// it is magic, not blood: a glowing violet ooze that spreads out as the body
// lands, catches the light, and keeps bubbling. Deliberately a colour no living
// thing on this road is, so it reads as the boss's power running out of it.
//
// Laid out in body sizes for a fall to the RIGHT (`fall` mirrors x), with +y
// toward the camera — the lobes that must be seen sit in FRONT of the body,
// because everything behind it is under the sprite. One path for all the lobes,
// so where they overlap the pool is one liquid rather than a stack of stickers.

const GOO_LOBES: ReadonlyArray<readonly [x: number, y: number, rx: number, ry: number]> = [
  [0.3, 0.1, 0.95, 0.3],
  [-0.45, 0.22, 0.4, 0.15],
  [1.05, 0.02, 0.38, 0.14],
  [0.55, 0.34, 0.48, 0.14],
  [-0.1, -0.1, 0.42, 0.12]
]
/** Splash drops thrown clear of the pool when the body hit the ground. */
const GOO_DROPS: ReadonlyArray<readonly [x: number, y: number, r: number]> = [
  [-0.95, 0.3, 0.06], [1.5, 0.12, 0.05], [0.15, 0.54, 0.05], [1.12, 0.44, 0.04]
]
/** Where it bubbles, and each bubble's offset into its cycle. */
const GOO_BUBBLES: ReadonlyArray<readonly [x: number, y: number, phase: number]> = [
  [-0.5, 0.24, 0], [0.78, 0.38, 0.37], [1.15, 0.06, 0.71]
]
/** One bubble's life, ms: it swells, and pops over the last fifth. */
const GOO_BUBBLE_MS = 1700

/**
 * The pool, in the body's local frame (feet at the origin, not yet rolled).
 *
 * `centred` for a death strip, painted or drawn, whose body lies across the
 * ground it stood on rather than pivoting off its feet the way the rolled walk
 * frame does — so the pool is pulled back under the middle of it instead of out
 * along the fall.
 */
const paintGoo = (
  ctx: CanvasRenderingContext2D, size: number, fall: -1 | 1, g: number, centred = false
): void => {
  if (g <= 0.01) return
  // Spreads out from under the body as it lands — lobes grow from the middle.
  const sp = 0.15 + 0.85 * g
  const lobes = (grow: number): void => {
    ctx.beginPath()
    for (const [x, y, rx, ry] of GOO_LOBES) {
      const cx = fall * x * sp * size
      const cy = y * sp * size
      ctx.moveTo(cx + rx * sp * grow * size, cy)
      ctx.ellipse(cx, cy, rx * sp * grow * size, ry * sp * grow * size, 0, 0, Math.PI * 2)
    }
  }
  ctx.save()
  // The layout's main lobe sits 0.3 of a body out along the fall; centred, it
  // sits under the feet instead — and up the road a little, because a death
  // strip lays the body down above its feet line, and a pool entirely in front
  // of the body reads as spilled rather than as running out of it.
  if (centred) ctx.translate(-fall * 0.3 * sp * size, -0.22 * sp * size)
  if (!minFx) {
    // A soft glow on the road around it — additive, so it lights the ground
    // rather than painting over it.
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.2 * g
    ctx.fillStyle = '#7c4dff'
    ctx.beginPath()
    ctx.ellipse(fall * 0.3 * sp * size, 0.12 * size, 1.3 * sp * size, 0.46 * sp * size, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  // The liquid: a deep rim, and a brighter body inset from it.
  ctx.globalAlpha = 0.78 * g
  ctx.fillStyle = '#4b2596'
  lobes(1)
  ctx.fill()
  ctx.globalAlpha = 0.7 * g
  ctx.fillStyle = '#8a5cf0'
  lobes(0.74)
  ctx.fill()
  ctx.globalAlpha = 0.85 * g
  ctx.fillStyle = '#5a2fb0'
  ctx.beginPath()
  for (const [x, y, r] of GOO_DROPS) {
    const cx = fall * x * size * (0.4 + 0.6 * g)
    const cy = y * size * (0.4 + 0.6 * g)
    ctx.moveTo(cx + r * size, cy)
    ctx.ellipse(cx, cy, r * size, r * size * 0.55, 0, 0, Math.PI * 2)
  }
  ctx.fill()
  if (!cheapFx) {
    const now = performance.now()
    // Glints along the front edge, breathing — what makes it read as WET.
    ctx.globalAlpha = (0.45 + Math.sin(now / 420) * 0.15) * g
    ctx.fillStyle = '#efe4ff'
    ctx.beginPath()
    ctx.ellipse(fall * 0.02 * sp * size, 0.27 * sp * size, 0.17 * sp * size, 0.035 * sp * size, 0, 0, Math.PI * 2)
    ctx.moveTo(fall * 0.86 * sp * size + 0.1 * sp * size, 0.31 * sp * size)
    ctx.ellipse(fall * 0.86 * sp * size, 0.31 * sp * size, 0.1 * sp * size, 0.026 * sp * size, 0, 0, Math.PI * 2)
    ctx.fill()
    // Bubbles: swell, then pop into a ring that widens and fades.
    ctx.lineWidth = Math.max(1, size * 0.012)
    for (const [x, y, phase] of GOO_BUBBLES) {
      const c = (((now / GOO_BUBBLE_MS + phase) % 1) + 1) % 1
      const bx = fall * x * sp * size
      const by = y * sp * size
      if (c < 0.8) {
        const r = size * 0.075 * (c / 0.8)
        ctx.globalAlpha = 0.6 * g
        ctx.fillStyle = '#b89bff'
        ctx.beginPath()
        ctx.ellipse(bx, by - r * 0.4, r, r * 0.8, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.8 * g
        ctx.fillStyle = '#f4edff'
        ctx.beginPath()
        ctx.arc(bx - r * 0.35, by - r * 0.75, r * 0.25, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const p = (c - 0.8) / 0.2
        ctx.globalAlpha = (1 - p) * 0.7 * g
        ctx.strokeStyle = '#e2d4ff'
        ctx.beginPath()
        ctx.ellipse(bx, by, size * 0.075 * (1 + p), size * 0.04 * (1 + p), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

/**
 * A boss going down (`k` 0 → 1) or already down (`k` = 1), feet at `sx, sy`.
 *
 * Its own DEATH, played across `k` with the last panel held as the body — the
 * painted strip once it has arrived (`images/deaths/`, asked for at 80 % of the
 * road, see `deathArtWant`), and until then the same fall DRAWN, baked from the
 * rigs the painting is painted over (`monsterDeathFrame`): knees buckling, arms
 * flailing, the body going over and lying spread out on the road. Either is
 * blitted exactly as the walk is — same scale, same feet line, same facing
 * mirror — so the cut from the last living frame to the first dying one cannot
 * jump, and it is never mirrored for the fall (see `deathFallSide`).
 *
 * It replaced the walk frame rolled onto its side, which players read as just
 * that: a standing creature turned ninety degrees. That roll is kept only for a
 * design with no drawing at all, eased so the weight lands at the end and
 * dimmed as it goes.
 */
const paintFallenBoss = (
  ctx: CanvasRenderingContext2D,
  design: string,
  sx: number,
  sy: number,
  size: number,
  k: number,
  fall: -1 | 1
): void => {
  const kk = Math.max(0, Math.min(1, k))
  const e = 1 - (1 - kk) ** 3
  const mirror = monsterFaces(design) === 'left' ? -1 : 1
  const n = monsterDeathLength(design)
  const death = monsterDeathFrame(design, Math.min(n - 1, Math.floor(kk * n)))
  // The side the body ends up on screen — which is where its pool spreads.
  const lies = death ? ((deathFallSide(design) * mirror) as -1 | 1) : fall
  ctx.save()
  ctx.translate(sx, sy)
  // The standing shadow, fading as the body goes down and the pool takes over.
  ctx.globalAlpha = 0.4 * (1 - e)
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.42, size * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  // The pool is liquid lying ON the road — see `clipToRoad`. The body is
  // painted after this and deliberately outside the clip.
  ctx.save()
  clipToRoad(ctx, sx, -size * 3, size * 6)
  paintGoo(ctx, size, lies, e, death !== null)
  ctx.restore()

  if (death) {
    // Panel by panel across the death beat, the last one held as the body. The
    // death carries its own "lights out" — eyes shut, fire guttered — so the
    // dim below is not laid on.
    const frame = death.frame
    const fk = (size * 1.6) / (frame.height * SPRITE_HEIGHT_R)
    const dw = frame.width * fk
    const dh = frame.height * fk
    ctx.scale(mirror, 1)
    ctx.drawImage(frame, -dw / 2, -frame.height * SPRITE_FOOT_R * fk, dw, dh)
    ctx.restore()
    return
  }

  ctx.rotate(fall * FALLEN_TILT * e)
  ctx.translate(0, size * FALLEN_SLIDE * e)
  const frame = monsterFrame(design, FALLEN_CYCLE)
  if (frame) {
    const fk = (size * 1.6) / (frame.height * SPRITE_HEIGHT_R)
    const dw = frame.width * fk
    const dh = frame.height * fk
    const top = -frame.height * SPRITE_FOOT_R * fk
    ctx.scale(monsterFaces(design) === 'left' ? -1 : 1, 1)
    ctx.drawImage(frame, -dw / 2, top, dw, dh)
    const dim = e > 0.01 ? fallenTint(frame) : null
    if (dim) {
      ctx.globalAlpha = e
      ctx.drawImage(dim, -dw / 2, top, dw, dh)
    }
  } else {
    ctx.fillStyle = '#3a2440'
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.5, size * 0.4, size * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The last stage's boss, lying where it fell — on the GROUND layer, under
 * everything that moves, because the crowd walks over it.
 */
const drawBossCorpse = (ctx: CanvasRenderingContext2D): void => {
  // The first of the frame's two boss draws, so it is where the body's box is
  // forgotten — a boss that has left the screen must stop answering
  // `felledBossBox`. The live body is drawn after this one and overwrites it,
  // which is the right precedence: the label belongs to the boss being fought
  // or just felled, not to the one the last stage left lying on the road.
  bossBoxN = 0
  const c = getBossCorpse()
  if (!c) return
  const sy = worldToScreenY(c.y)
  const size = c.scale * scale * 1.3
  // Behind the bottom edge (the crowd is long past it) or not yet on screen.
  if (sy - size * 1.2 > viewH || sy + size * 1.2 < 0) return
  const sx = worldToScreenX(c.x)
  measureBossBox(sx, sy, size, 1)
  paintFallenBoss(ctx, c.design, sx, sy, size, 1, c.fall)
}

/**
 * The survivors a handover did not keep, seen off: a puff of dust where each one
 * stood and a couple of sparks going up. It is what stops a squad of forty
 * becoming a squad of five between two frames with nothing to say why — the
 * next stage opens on the squad the shop bought, and the rest fall back.
 */
const seeOffSurvivors = (spots: ReadonlyArray<{ x: number; y: number }>): void => {
  for (const p of spots) {
    // Light on purpose: it plays around the squad that stays, and a heavy cloud
    // there reads as the survivors being hit rather than stepping back.
    emit({
      x: p.x, y: p.y + 0.25, vx: (Math.random() - 0.5) * 0.6, vy: 1.2 + Math.random() * 1.2,
      life: 420 + Math.random() * 220, size: 0.2 + Math.random() * 0.08,
      color: [206, 192, 168], alpha: 0.32, shape: 3, drag: 1.4
    })
    if (cheapFx) continue
    for (let i = 0; i < 2; i++) {
      emit({
        x: p.x + (Math.random() - 0.5) * 0.3, y: p.y + 0.2,
        vx: (Math.random() - 0.5) * 0.5, vy: 3 + Math.random() * 3,
        life: 460 + Math.random() * 300, size: 0.07 + Math.random() * 0.05,
        color: [255, 226, 150], additive: true, shape: 2, drag: 1.1, gravity: -1.5
      })
    }
  }
}

/**
 * ─── A dead boss stops promising things ─────────────────────────────────
 *
 * Every tell in this game is a PROMISE: a ring that says something lands here, a
 * band that says leave this column, three furrows that say stand in the gaps.
 * The boss can no longer keep any of them the instant it dies, so they have to
 * come off the road in the same frame the kill does.
 *
 * The simulation was already clean about this — `bossIsCharging`,
 * `bossIsVarying`, `bossGazeOpening` and the slam ring all gate on `!b.dead`,
 * and `killBoss` takes the ward and the eye down explicitly. What survived were
 * the RENDERER's own transients: a cast, a rake or a heal tell emitted a beat
 * before the kill goes on running its own clock afterwards, because nothing in
 * that pool knows the thing that armed it is gone. Measured on the wipe hold,
 * where the world stops: a charge's band sat frozen across the road as the
 * brightest thing on a screen whose subject was supposed to be the bodies.
 *
 * ─── Why ALL of it, including the parts that already landed ───────────────
 *
 * The first version of this kept anything past its own life — a `done` cast or
 * rake playing the flash of an impact that really did land — on the argument
 * that deleting it would rewind a hit. That argument is wrong here, and the
 * browser said so: the struck furrows were still sitting across the road a full
 * second after the kill, unchanged.
 *
 * THE CLOCK STOPS WITH THE BOSS. These pools are stepped by `tellDtMs`, which is
 * how far the SIMULATION advanced (see the two-clocks note in `drawScene`) — and
 * the kill flips `phase` to `'clear'`, on which `step` returns immediately. So
 * from the death frame onward `simDtMs` is zero, `CAST_AFTER_S` and
 * `RAKE_AFTER_S` never elapse, and every leftover is FROZEN on screen for the
 * whole two-second celebration and the result screen behind it. A quarter-second
 * flash becomes a permanent mark.
 *
 * So the pools are emptied. The cost is the last frames of one impact flash on
 * the frame the boss died; the thing it buys is that nothing the boss was
 * holding out is still on the road while the player is being shown the body.
 *
 * WHAT IS STILL NOT CLEARED: boss bolts in flight. A round already fired is an
 * object in the world rather than a promise about one, it is stepped and drawn
 * as such, and it is the same rule the freeze skill follows.
 */

/** Take down every promise the boss can no longer keep. Called on `bossDie`.
 *  Which casts are the boss's is `bossOwnsCast`, out in `game/bossTells.ts` —
 *  pure, total over the union, and pinned without a canvas. */
const clearBossTells = (): void => {
  // The meteor's ring, the charge's band, the shock's annulus. A miniboss's
  // fuse or line stays: the whole world is frozen for the celebration, so a
  // frozen miniboss with a frozen wind-up is coherent — a frozen tell over a
  // visible corpse is not.
  for (let i = casts.length - 1; i >= 0; i--) {
    if (bossOwnsCast(casts[i]!.kind)) casts.splice(i, 1)
  }
  // The claw's furrows, the healer's gather, and the eye's beam. All three are
  // the boss's alone, so all three go whole.
  rakes.length = 0
  healTells.length = 0
  gazeBeams.length = 0
}

const drawBossBody = (ctx: CanvasRenderingContext2D): void => {
  const b = getBoss()
  if (!b) return
  const t = nowMs()
  const sx = worldToScreenX(b.x)
  const sy = worldToScreenY(b.y)
  const size = b.scale * scale * 1.3
  const dying = b.dead ? Math.min(1, b.dying / 900) : 0
  // Where the body is, for the scene's "boss felled" label. Measured for a live
  // boss as well as a dead one: the label appears the moment the kill lands, and
  // the body it points at is still going down at that moment.
  measureBossBox(sx, sy, size, dying)

  // Slam telegraph: a ring that closes on the ground the boss is about to hit.
  //
  // It reads `slamX` / `slamY` and NOT the boss's own position, because the
  // boss aims at where the crowd is standing — telegraphing under the boss
  // would train the player to dodge the wrong thing, which is worse than no
  // telegraph at all. Drawn UNDER everything else, and generous: 0.6 s of it —
  // deliberately a hair SHORTER than the sim's latch window, so the ring can
  // never spend a frame pointing at the PREVIOUS slam's coordinates.
  // A charged swing gets a longer look at it, because it covers twice the
  // ground: the ring has to be readable for long enough that leaving it was a
  // decision the player got to make, not a reflex they failed.
  //
  // METEOR ONLY, and that gate is load-bearing rather than tidy. The ring is a
  // shrinking circle centred on `slamX`, and `slamX` is the middle of a CLAW's
  // rake — so on a claw stage it drew a "get out of here" mark on the one strip
  // of road the player must not stand in, and pointed away from the two pockets
  // that are the whole answer to the attack. A telegraph that is wrong is worse
  // than none. The claw, the healer and the summoner each paint their own tell
  // (`drawClawFurrows`, `drawHealTell`, `drawBossBolts`).
  //
  // A CHARGE is held back for exactly the reason the claw is, and it is the same
  // bug: `slamX` is the centre of the swathe, so the ring would draw a "not
  // here" mark down the middle of the column while the answer is to leave the
  // column entirely — a telegraph pointing at the one axis it is wrong about.
  // The band `drawCasts` paints is the charge's tell and it is the whole tell.
  const windowS = b.charging ? 1.1 : 0.6
  // …and a SHOCK and a GAZE are held back for the same reason again. A shock's
  // `slamX` is the centre of its safe eye, so this ring would paint "not here"
  // on the one patch of road the attack says is safe; a gaze's is the boss's
  // own feet, where nothing is landing at all.
  if (
    b.kind === 'meteor' && !b.dead && !bossIsCharging() && !bossIsVarying() &&
    bossGazeOpening() === 0 && b.slamCd < windowS
  ) {
    const k = 1 - b.slamCd / windowS
    const rx = worldToScreenX(b.slamX)
    const ry = worldToScreenY(b.slamY)
    // Tracks the slam that is actually coming: the boss's reach GROWS with
    // every swing it has thrown (see `SLAM_RADIUS_GROWTH`), and a telegraph
    // that stayed the same size while the hit got bigger would be a lie the
    // player only discovers by dying to it. Still drawn a little wider than the
    // kill radius — a dodge that was visually clean has to be clean.
    const raging = b.slams > 0 || b.guard > 0
    // `slamRadiusFor` is the simulation's own definition, charged multiplier
    // included — the telegraph is not allowed a second opinion about how big
    // the hit is. Still drawn a little wider than the kill radius: a dodge that
    // was visually clean has to be clean.
    const r = slamRadiusFor(b.slams, b.charging) * scale * 1.28
    ctx.save()
    ctx.globalAlpha = 0.25 + k * 0.4
    ctx.save()
    ctx.translate(rx, ry)
    paintRing(ctx, 'heat', r, r * 0.5, Math.max(2, scale * (b.charging ? 0.15 : 0.09)),
      b.charging ? '#ffd23a' : raging ? '#ff3a2a' : '#ff5a4a')
    ctx.restore()
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

  // A dead boss topples and STAYS down — the next road opens where it fell. The
  // death beat and the corpse are one drawing (`paintFallenBoss`), so nothing
  // below this line is for a body that is no longer fighting.
  if (b.dead) {
    paintFallenBoss(ctx, b.design, sx, sy, size, dying, bossFallDir(b.x))
    return
  }

  ctx.save()
  ctx.translate(sx, sy)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.42, size * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()

  // Phase two's second half, and the half that survives being looked at from the
  // corner of an eye: heat on the ground the boss is standing on. The ember pass
  // over the sprite is the colour shift proper, and on a small phone against a
  // dark-fantasy body it is a subtle one — this is what makes the state readable
  // at a glance while the player is busy reading a band instead.
  //
  // Deliberately NOT a ring like the telegraphs use: those all mean "damage will
  // arrive on this ground", and a permanent one under the boss would be a fourth
  // ring in a fight that already has three, promising something that never
  // comes. A soft pool has no such vocabulary attached to it.
  if (bossIsEnraged() && !b.dead) {
    const heat = 0.5 + Math.sin(t / 190) * 0.5
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.16 + heat * 0.14
    ctx.fillStyle = '#ff4a18'
    ctx.beginPath()
    ctx.ellipse(0, 0, size * (0.52 + heat * 0.07), size * (0.16 + heat * 0.02), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // The guard phase: a hexagonal barrier that pulses hard and fast. The player
  // is going to keep shooting into it — the sim spends their rounds on it
  // deliberately — so it has to be unmistakably a shield and not a hitbox that
  // stopped working. Flat fills and strokes; no gradient, no shadow, because
  // this runs every frame of the busiest moment in the game.
  //
  // It is drawn in TWO passes around the body. The barrier itself goes UNDER the
  // sprite so the boss stands inside it; the crest goes OVER the sprite, because
  // the emblem sits at the barrier's centre and the boss would otherwise cover
  // the one element that says "shield" in as many words.
  //
  // The barrier fill and its outline share ONE hexagon path (`guardHexPath`).
  const guarding = b.guard > 0 && !b.dead
  const gPulse = 0.55 + Math.sin(t / 70) * 0.25
  const gR = size * 0.95
  const gCy = -size * 0.55
  const gRy = gR * 1.15

  if (guarding) paintGuardHex(ctx, gCy, gR, gRy, gPulse, scale)

  // Frozen, it holds the pose it was caught in — see `drawFoes`.
  const frozen = frostActive() && !b.dead
  const frame = monsterFrame(b.design, ((frozen ? frostFrozenAt() : t) / 900) % 1)
  const enraged = bossIsEnraged()
  if (frame) {
    const k = (size * 1.6) / (frame.height * SPRITE_HEIGHT_R)
    const dw = frame.width * k
    const dh = frame.height * k
    const top = -frame.height * SPRITE_FOOT_R * k
    const mirror = monsterFaces(b.design) === 'left' ? -1 : 1
    if (frozen) {
      // The boss in its block: the sprite first, then the ice, then the ember
      // and the hit flash on top — a frozen boss still shows which half of the
      // fight it is in and still flashes where the brittle rounds land.
      ctx.save()
      ctx.scale(mirror, 1)
      ctx.drawImage(frame, -dw / 2, top, dw, dh)
      ctx.restore()
      drawIceOn(ctx, frame, mirror, -dw / 2, top, dw, dh, size * 0.95, 9001, sx, sy)
    }
    ctx.save()
    ctx.scale(mirror, 1)
    if (!frozen) ctx.drawImage(frame, -dw / 2, top, dw, dh)
    // ── Phase two's colour shift ──
    //
    // An EMBER COPY of the frame, added over the frame itself, so the shift
    // lands on the boss's own pixels and nothing else. The obvious cheaper
    // versions are both wrong on this canvas: `source-atop` composites against
    // everything already drawn, so a rectangle over the sprite tints the road
    // under it, and re-drawing the plain frame with `lighter` only walks the
    // body toward white, which reads as the hit flash the line above already
    // owns.
    //
    // It pulses rather than sitting flat. A constant tint is a palette swap and
    // the eye stops seeing it inside a second; a slow breath keeps the boss
    // reading as lit from inside for the rest of the fight, which is the whole
    // job — the player has to be able to glance back mid-dodge and still know
    // which half of the fight they are in.
    const ember = enraged ? emberFrame(frame) : null
    if (ember) {
      ctx.globalAlpha = 0.34 + Math.sin(t / 190) * 0.12
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(ember, -dw / 2, top, dw, dh)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
    if (b.flash > 0.02) {
      ctx.globalAlpha = Math.min(1, b.flash) * 0.8
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(frame, -dw / 2, top, dw, dh)
    }
    ctx.restore()
  } else {
    // The drawn fallback gets the shift too, and it has to: the bake is async,
    // so this is what a boss looks like for the first frames of a fight on a
    // slow device — exactly the device where an unexplained difficulty change
    // is least forgivable.
    ctx.fillStyle = enraged ? '#8f2f3a' : '#63348d'
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.5, size * 0.4, size * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── The guard crest, drawn OVER the sprite ──
  //
  // A heater-shield emblem at the barrier's centre. It is the second half of the
  // guard read: the hexagon says "something is in the way", the crest says what.
  // Drawn after the body on purpose — it sits where the boss stands, so under
  // the sprite it would be invisible for the whole one-second phase that the
  // player most needs to understand.
  //
  // Normal compositing (not `lighter`) and a dark rim: additive on top of an
  // already-bright orange barrier washes out to a pale blob, and the rim is what
  // holds the silhouette against both the barrier and the boss behind it.
  if (guarding) {
    // Sized to read as an emblem ON the barrier rather than a lid over the
    // fight: much larger and it simply erases the boss, which is the thing the
    // player is being told to stop shooting.
    const cw = gR * 0.44
    const ch = gRy * 0.5
    const rim = Math.max(3, scale * 0.11)

    ctx.save()
    ctx.globalAlpha = 0.82 + gPulse * 0.18
    // A HEAVY dark rim, not a hairline. Several bosses are pale tan, so a thin
    // outline let the crest melt into the body it is drawn over — the rim is
    // what holds the silhouette against both the boss and the orange barrier.
    paintCrest(ctx, 'guard', 0, gCy, cw, ch, {
      fill: '#ffc46a', rim: '#2a0f05', rimW: rim,
      rib: 'rgba(42,15,5,0.9)', ribW: Math.max(1.5, scale * 0.05)
    })
    ctx.restore()
  }

  ctx.restore()
}

// ─── Layer 8: the crowd ─────────────────────────────────────────────────────

/**
 * Draw the squad.
 *
 * Ordered back-to-front so the crowd overlaps correctly — without it a hundred
 * and ninety sprites at random depths look like confetti. The ordering runs
 * over pre-allocated index arrays to keep the frame allocation-free.
 *
 * ─── Why it is a BUCKET sort and not a comparison sort ──────────────────────
 *
 * This ran as `order.sort((a, b) => units[b].y - units[a].y)` every frame: a
 * comparison sort is O(n log n) with a JS closure called at every comparison —
 * about 1 500 calls at a hundred and ninety bodies, sixty times a second, each
 * one two array index lookups and a subtract. On a cheap Android that is real
 * frame time spent establishing an order the eye cannot resolve to better than
 * a sprite's height anyway.
 *
 * A counting sort into `DEPTH_BANDS` bands is O(n), branch-free in the hot pass
 * and closure-free throughout. The crowd is ~3.3 units deep at full squeeze, so
 * sixteen bands put every band well under one body height — bodies inside a
 * band are drawn in index order, and two sprites whose feet are two centimetres
 * apart may overlap either way round without anybody being able to say which
 * was wrong.
 */
const DEPTH_BANDS = 16
let order: number[] = []
let ordered: number[] = []
const bandStart = new Int32Array(DEPTH_BANDS + 1)

const drawUnits = (ctx: CanvasRenderingContext2D): void => {
  const units = getUnits()
  const n = units.length
  if (n === 0) return

  // ── The draw budget, spent across the WHOLE crowd ──
  //
  // Only so many sprites may be painted, and which ones is not a free choice:
  // the budget has to be spent EVENLY over the formation, because everything
  // else in the game still uses the bodies it cannot afford to draw. They are
  // shot from (`stepShooting` fires from any survivor in the front half), they
  // are hit, and they are what the crowd's own radius is measured from.
  //
  // Picking the subset by depth — sort, then take the first `budget` — is the
  // trap this replaced, and it got worse the bigger the crowd got: at 190 of
  // 700 the painted bodies were the front 27% of the disc, so the squad drew as
  // a small dome sitting at the formation's nose while its muzzle flashes and
  // tracers kept coming out of the two thirds behind it, off bare road. Past a
  // few hundred survivors the visible crowd shrank towards a dot while the
  // gunfire stayed on the line the whole formation actually occupies.
  //
  // So the subset is a uniform sample instead: keep `seed < budget / n`. It is
  // uncorrelated with the sunflower's slot index, so it is uniform over the
  // disc with none of the spiral arms a stride over `i` would carve into it,
  // and `seed` never changes, so a death does not reshuffle which bodies are
  // visible. Density is what suffers instead of extent — the right trade, since
  // at this size the sprites overlap many times over and the mass still reads
  // solid.
  //
  // It also makes the sort cheaper: ~190 entries rather than all of `n`.
  //
  // ── The living and the fallen are budgeted SEPARATELY ──
  //
  // Bodies used to leave the array a few hundred milliseconds after they died.
  // They now lie on the road until the camera carries them off it, which means
  // `units` can hold a hundred corpses behind a crowd of forty — and a single
  // shared sample would spend most of the budget on the dead and thin the
  // living crowd at exactly the moment the player is losing it. The whole point
  // of the uniform sample is that the crowd reads as its true size; corpses
  // paid for out of the same purse would undo it.
  //
  // So the living are sampled against the budget as before, and the fallen get
  // their own smaller cap on top. Going over it drops corpses, never survivors.
  const budget = minFx ? 70 : tier === 'low' ? 110 : tier === 'medium' ? 150 : 190
  const restBudget = minFx ? 20 : tier === 'low' ? 35 : 60
  //
  // ── …and a CASHED body is neither ──
  //
  // After a boss falls, every survivor turns into a coin and flies to the wallet
  // (`cashOutSquad`). They stay in `units` — the handover reads them to decide
  // where the next road opens — but they are no longer on the road, so they are
  // excluded from the living sample rather than drawn transparent or moved: the
  // player watched them leave.
  let drawn = 0
  let living = 0
  for (let i = 0; i < n; i++) { const u = units[i]!; if (u.dying <= 0 && !u.cashed) living++ }
  if (living <= budget) {
    for (let i = 0; i < n; i++) {
      const u = units[i]!
      if (u.dying <= 0 && !u.cashed) order[drawn++] = i
    }
  } else {
    const keep = budget / living
    for (let i = 0; i < n; i++) {
      const u = units[i]!
      if (u.dying <= 0 && !u.cashed && u.seed < keep) order[drawn++] = i
    }
  }
  let rest = 0
  for (let i = 0; i < n && rest < restBudget; i++) {
    if (units[i]!.dying > 0) { order[drawn++] = i; rest++ }
  }
  if (order.length !== drawn) order.length = drawn

  // ── Depth order, far (higher y) first ──
  //
  // Counting sort over the crowd's OWN y extent, re-measured each frame: the
  // formation is a few units deep and moves down the road continuously, so a
  // fixed band range would put every body in one band on most frames. Two
  // passes to count and place, plus one to measure — three linear walks instead
  // of n·log n comparisons through a closure.
  let minY = Infinity
  let maxY = -Infinity
  for (let k = 0; k < drawn; k++) {
    const y = units[order[k]!]!.y
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const span = maxY - minY
  // A crowd standing on one line (one survivor, or a formation not yet spread)
  // has no depth to sort and the division below would be infinite.
  if (span > 1e-4) {
    // Band 0 is the FARTHEST, so it is painted first and everything after it
    // lands in front. `maxY - y` rather than `y - minY` for exactly that.
    const k01 = DEPTH_BANDS / span
    bandStart.fill(0)
    for (let k = 0; k < drawn; k++) {
      const b = (maxY - units[order[k]!]!.y) * k01 | 0
      bandStart[(b < DEPTH_BANDS ? b : DEPTH_BANDS - 1) + 1]!++
    }
    for (let b = 1; b <= DEPTH_BANDS; b++) bandStart[b]! += bandStart[b - 1]!
    if (ordered.length !== drawn) ordered.length = drawn
    for (let k = 0; k < drawn; k++) {
      const i = order[k]!
      const b = (maxY - units[i]!.y) * k01 | 0
      ordered[bandStart[b < DEPTH_BANDS ? b : DEPTH_BANDS - 1]!++] = i
    }
    const swap = order
    order = ordered
    ordered = swap
  }

  const t = nowMs()
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
    // NOT cached, deliberately. It is one gradient for the whole frame rather
    // than one per body, and its key would have to carry both a continuously
    // moving crowd radius and a continuous squeeze — hundreds of combinations
    // into a 256-entry cache shared with every per-entity ramp in the renderer,
    // which would evict the ramps the cache exists for to save one build.
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
  if (squeeze > 0.18 && !cheapFx) {
    const puffs = richFx ? 2 : 1
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

  crowdBoxN = 0

  // Per-PASS constants, in the same spirit as the tracer colours in
  // `drawBullets`. None of these depend on the unit being drawn — `scale` and
  // `rateHeat` are both latched for the frame — so computing them inside the
  // loop was doing the same arithmetic up to a hundred and ninety times.
  //
  // The muzzle ramp is the one that actually cost something: three colour stops
  // parsed and a ramp rasterised per FIRING survivor per frame, for a gradient
  // that is byte-for-byte the same for all of them. It is already expressed in
  // the unit's local space (the loop paints it under `translate(sx, sy)`), so
  // hoisting it needs no geometry change at all — a gradient resolves its
  // coordinates against the transform in effect when it is painted, not when it
  // was built. Keyed on the two numbers that shape it, so it also survives
  // across frames for as long as the camera scale and the fire rate hold.
  const size = scale * 1.15
  // The blit box and the bubble's half-width. Both are pure functions of
  // `size`, which is latched for the frame, so they were being recomputed up to
  // a hundred and ninety times for one answer.
  const boxH = (size * 1.05) / HERO_HEIGHT_R
  const boxHalfW = boxH * HERO_FRAME_ASPECT * 0.26
  const flashY = -size * 0.95
  const flashR = size * (0.34 + rateHeat * 0.13)
  const flashRamp = muzzleRamp(ctx, flashY, flashR)

  for (let k = 0; k < drawn; k++) {
    const u = units[order[k]!]!
    const sy = worldToScreenY(u.y)
    if (sy < -60 || sy > viewH + 60) continue
    const sx = worldToScreenX(u.x)


    // ── Going down ──
    //
    // `u.dying` counts DOWN from `SURVIVOR_FALL_MS` toward the frame the
    // simulation splices the body out on, so the fall's progress is its
    // complement. What comes back is which picture to blit and the transform to
    // blit it under — see `survivorFallStep`, which owns the shape of the fall
    // and is the only thing that has to change to retime it.
    // `u.cause` is what parts a fall from a crash: a body billed to a barricade,
    // a crate or a divider stays crumpled against the thing that stopped it
    // instead of going on over onto the road (`CRASH_CAUSES`, in the sim,
    // because the sim is what knows what a barricade is).
    //
    // A body that has finished falling is held at `FALL_REST_P` — the last
    // frame before the old fade began — for as long as it is on the road. The
    // fade is gone: a corpse is not disposed of by going transparent any more,
    // it is disposed of by being left behind (`FALLEN_CULL_BEHIND`).
    const fall = u.down
      ? survivorFallStep(FALL_REST_P, u.seed, u.cause)
      : u.dying > 0
        ? survivorFallStep(1 - u.dying / SURVIVOR_FALL_MS, u.seed, u.cause)
        : null

    // Feed the bubble's bounding box. Dying bodies are excluded: they fall
    // outward, and a shield that swelled to cover the casualties would grow
    // every time it failed to prevent one.
    if (!fall) {
      // Derived from the same numbers the blit uses, so the box cannot drift
      // away from the art if the sprite metrics are ever retuned. The width is
      // the visible torso rather than the padded frame, which is mostly air.
      // In frame heights rather than the bake's pixels, so the box holds for a
      // painted strip at any resolution.
      const top = sy - boxH * HERO_FOOT_R * pitch
      if (crowdBoxN === 0) {
        crowdBoxL = sx - boxHalfW; crowdBoxR = sx + boxHalfW
        crowdBoxT = top; crowdBoxB = sy
      } else {
        if (sx - boxHalfW < crowdBoxL) crowdBoxL = sx - boxHalfW
        if (sx + boxHalfW > crowdBoxR) crowdBoxR = sx + boxHalfW
        if (top < crowdBoxT) crowdBoxT = top
        if (sy > crowdBoxB) crowdBoxB = sy
      }
      crowdBoxN++
    }

    ctx.save()
    ctx.translate(sx, sy)
    // Assigned for a LIVING body too, and not only for a falling one: the old
    // code set it unconditionally (`dieK` is 1 while alive), so an alpha left
    // behind by an earlier layer has never reached the crowd, and finding out
    // the hard way that one does is a translucent squad.
    ctx.globalAlpha = fall ? fall.alpha : 1

    // ── There is no per-body shadow here any more ──
    //
    // There used to be: an ellipse path plus a fill under every drawn survivor,
    // up to a hundred and ninety of them a frame, tightening as the formation
    // compressed. It was the single most expensive thing in this loop and the
    // least visible — at crowd size the bodies overlap several times over, so
    // each patch was drawn almost entirely underneath the sprites in front of
    // it, and the ones that did show never merged into a mass: two hundred
    // separate pools read as two hundred people standing near each other, which
    // is the exact effect the pooled sheet above was added to replace.
    //
    // So the pooled gradient IS the crowd's shadow now, at one fill for the
    // whole formation, and it already carries the compression that the per-body
    // patch was varying. Nothing else in this function reads `squeeze` for
    // shade, and no tier draws them: `minFx` no longer changes what is under a
    // survivor, only what is around them.
    if (fall) {
      // ── The fall ──
      //
      // WHICH WAY it goes over is the blow's own direction: `killUnit` throws
      // the body along the `dirX` it was hit from and adds a jitter smaller than
      // that impulse, so the sign of `vx` IS the side of the blow. A body killed
      // against a barricade, a crate or a pillar is thrown away from it
      // (`Math.sign(u.x - prop.x)`), so it crashes into the thing, jolts back
      // against it and then goes down BESIDE it — never through it. The old
      // code turned every body clockwise whatever hit it.
      //
      // Everything here is scale and rotation about the feet the body is
      // already translated to, which is why a fall costs the same as a lean.
      const side = u.vx >= 0 ? 1 : -1
      if (fall.sink > 0) ctx.translate(0, fall.sink * boxH)
      if (fall.squash !== 1) ctx.scale(fall.stretch, fall.squash)
      if (fall.pose === 'run') {
        ctx.rotate(side * fall.tilt)
      } else {
        // The held poses are DRAWN going over to one side (`DOWN_FALL_SIDE`),
        // so a body thrown the other way is mirrored — and inside a mirrored
        // frame the residual roll has to be signed by the side the drawing
        // falls to, not by the side the body was thrown, or it would rock back
        // up the way it came.
        if (side !== DOWN_FALL_SIDE) ctx.scale(-1, 1)
        ctx.rotate(DOWN_FALL_SIDE * fall.tilt)
      }
    } else if (squeeze > 0.05) {
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

    // A body on the ground is its own picture — the painted panel if the fall
    // sheet is there, and the same fall DRAWN until it is (`survivorDownFrame`).
    // Never the run frame rolled over: that is the shortcut the boss deaths were
    // rejected for, and it is only ever on screen here while the body is still
    // in the air and moving too fast to read as a pose.
    const frame = fall && fall.pose !== 'run'
      ? survivorDownFrame(outfitIndex(u.i), fall.pose)
      : survivorFrame(outfitIndex(u.i), (t / HERO_CYCLE_MS + u.phase) % 1)
    if (frame) {
      const dw = boxH * (frame.width / frame.height)
      const dh = boxH * pitch
      const dy = -boxH * HERO_FOOT_R * pitch
      ctx.drawImage(frame, -dw / 2, dy, dw, dh)
      // Not on a body that is going down: the bloom is its own muzzle flash
      // lighting it, and a corpse lit from a shot it no longer fires reads as a
      // sprite flickering.
      if (u.flash > 0 && !fall) {
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
      paintMuzzleFlash(ctx, flashY, flashR, flashRamp)
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

  // A gatling reads as heat, not as a different colour. `rateHeat` is the run's
  // own fire-rate curve and the weapon does not touch `runFireRate` — the
  // multiplier lives in `stepShooting` — so without this the loudest gun in the
  // game would draw exactly like the quietest one.
  const hot = activeWeapon.value === 'gatling'

  // The two tracer colours brighten with the run's fire rate, and are built
  // ONCE for the whole pass — see `tracerStyle`. A template literal inside the
  // loop would be an allocation per bullet per frame.
  const heat = Math.min(1, rateHeat + (hot ? 0.55 : 0))
  const st = tracerStyle(heat, scale, hot)
  const len = st.len

  // A painted round is blitted per bullet into the `len`-square box the
  // reference streak fills (`paintTracerRef`), pointing down the screen from
  // the round's own position exactly as the stroked line does. Rockets are not
  // tracers and stay drawn below either way.
  // The painted round gets the same treatment, through the same one-line
  // `source-in` swap the ember frames use — otherwise a build with art
  // overrides on would blit the identical gold streak for both guns and the
  // whole distinction would exist only in the procedural fallback.
  const paintedBase = spriteFor('round', 'tracer')
  const painted = hot && paintedBase ? (redTracer(paintedBase) ?? paintedBase) : paintedBase
  if (painted) {
    for (const b of bullets) {
      if (b.weapon === 'rocket') continue
      const sy = worldToScreenY(b.y)
      if (sy < -40 || sy > viewH + 40) continue
      const sx = worldToScreenX(b.x)
      ctx.drawImage(painted, sx - len / 2, sy, len, len)
    }
  } else {
    // TWO stroke submissions for the whole pass rather than two per bullet. Both
    // the colour and the width are already constant for the frame, so every
    // tracer's glow segment belongs to one path and every core to another.
    //
    // Safe under `lighter` because the tracers do not overlap each other: they are
    // vertical lines at the survivors' own x positions, spaced by the crowd's unit
    // spacing (~0.3 world units) against a glow width of 0.1. Segments inside one
    // path are rasterised once, so an overlap WOULD read a shade darker — it just
    // cannot happen at this geometry. The core still blends over the glow, because
    // those remain two separate passes.
    ctx.strokeStyle = st.outer
    ctx.lineWidth = st.outerW
    ctx.beginPath()
    for (const b of bullets) {
      if (b.weapon === 'rocket') continue
      const sy = worldToScreenY(b.y)
      if (sy < -40 || sy > viewH + 40) continue
      const sx = worldToScreenX(b.x)
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx, sy + len)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,235,0.95)'
    ctx.lineWidth = st.coreW
    ctx.beginPath()
    for (const b of bullets) {
      if (b.weapon === 'rocket') continue
      const sy = worldToScreenY(b.y)
      if (sy < -40 || sy > viewH + 40) continue
      const sx = worldToScreenX(b.x)
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx, sy + len * 0.6)
    }
    ctx.stroke()
  }

  // ── Rockets ──
  //
  // Out of the batch on purpose. Everything above is a one-pixel tracer drawn a
  // hundred at a time and batched into two strokes for it; a rocket is ONE
  // object on screen (the launcher fires a single stream) and it has to look
  // like an object — a body, a nose and a plume — or the player cannot tell
  // which of the two weapons they are holding without reading the HUD.
  for (const b of bullets) {
    if (b.weapon !== 'rocket') continue
    const sy = worldToScreenY(b.y)
    if (sy < -60 || sy > viewH + 60) continue
    const sx = worldToScreenX(b.x)
    const rr = Math.max(2.5, scale * 0.17)

    // ── Pointed where it is going ──
    //
    // The launcher steers (`WeaponDef.homing`), so a shell drawn permanently
    // nose-up would slide across the road sideways with its plume hanging off
    // the wrong end — which reads as a sprite bug, not as a guided weapon.
    //
    // The body's local "forward" is -y, and world +y is UP the screen, so the
    // rotation that maps forward onto the velocity is `atan2(vx, vy)`: no
    // screen-space conversion is needed because both components scale by the
    // same factor and the arc-tangent divides it out.
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(Math.atan2(b.vx, b.vy))
    // Shell and plume — or the painting of them — through the one painter the
    // art bench draws the reference with.
    paintRocketBody(ctx, rr)
    ctx.restore()
  }
  ctx.restore()
}

// ─── Layer 11: text and grades ──────────────────────────────────────────────

const drawFloatingText = (ctx: CanvasRenderingContext2D): void => {
  // Damage numbers are a readout, not the world: off in a recorded feed.
  if (HIDE_READOUTS) return
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
    if (!minFx) {
      ctx.lineWidth = Math.max(2, px * 0.24)
      ctx.strokeStyle = 'rgba(0,0,0,0.88)'
      ctx.strokeText(t.text, x, y)
    }
    ctx.fillStyle = t.color
    ctx.fillText(t.text, x, y)
  }
  ctx.globalAlpha = 1
}

const drawGrades = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  // Speed streaks at the edges after a gate pass. Only at the EDGES, so they
  // never sit over anything the player has to read.
  if (rushPulse > 0.02 && !cheapFx) {
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
  //
  // Baked, because this is the single most expensive thing the renderer asks
  // for per pixel: a full-screen radial ramp that the rasteriser has to
  // evaluate over every pixel of the frame, sixty times a second, for an image
  // that is identical from the first frame to the last. As a blit it is a
  // straight alpha composite of a texture, which is what the hardware is for.
  //
  // The ramp is CACHED, not baked. Baking it to a texture and blitting was
  // built and measured — the reasoning was that a full-screen radial ramp is
  // the most expensive per-pixel thing the renderer asks for — and it came back
  // -0.0 % at 6x CPU throttle over real gameplay, so it went, along with its
  // 0.6 MB of texture. Caching the gradient OBJECT costs nothing and is not a
  // trade: `w` and `h` are the whole key, and this was one allocation and two
  // colour-string parses per frame for an identical ramp.
  //
  // It survives at `min` too, where almost nothing else full-screen does.
  // Without it the road reads flat and washed out toward the horizon, and the
  // fill it costs at that tier is over a canvas of 0.24 Mpx.
  // ── The HUD's own band, kept clear of the road's numbers ──
  //
  // Finding 4 of Playtest 02, filed as a rendering glitch by one tester and
  // visible in three others' frames: barricades carry bold white HP numbers and
  // enter from the TOP of the road — which is exactly where the squad chip sits,
  // carrying a bold white number of its own. Two numbers of the same weight
  // crossing each other, one of which is the only readout left on the HUD and
  // the one the whole game is about.
  //
  // A scrim rather than a lower stream line, because the props are not the
  // problem: a prop arriving at the horizon is meant to be seen arriving, and
  // starting the road further down would cost the player the warning. What has
  // to change is the CONTRAST in that one band, so the thing entering reads as
  // distant and the thing pinned over it reads as near. Drawn under the
  // vignette, so the two grades compose rather than fight.
  const scrimH = topInsetPx + HUD_SCRIM_FADE_PX
  if (scrimH > 12) {
    const sKey = `hudScrim|${w}|${Math.round(scrimH)}`
    let sc = getRamp(sKey)
    if (!sc) {
      sc = putRamp(sKey, ctx.createLinearGradient(0, 0, 0, scrimH))
      sc.addColorStop(0, 'rgba(5, 8, 18, 0.6)')
      sc.addColorStop(0.6, 'rgba(5, 8, 18, 0.34)')
      sc.addColorStop(1, 'rgba(5, 8, 18, 0)')
    }
    ctx.fillStyle = sc
    ctx.fillRect(0, 0, w, scrimH)
  }

  const vKey = `vignette|${w}|${h}`
  let v = getRamp(vKey)
  if (!v) {
    v = putRamp(vKey, ctx.createRadialGradient(
      w / 2, h * 0.6, Math.min(w, h) * 0.38, w / 2, h * 0.6, Math.max(w, h) * 0.8
    ))
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.34)')
  }
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
  // The two late skills own their own juice — see `useSkillFx`.
  if (isSkillFx(e)) {
    applySkillFx(e)
    return
  }
  switch (e.kind) {
    case 'shoot':
      if (e.weapon === 'rocket') {
        // ── A launch, not a shot ──
        //
        // Its own cue and its own backblast. The launcher used to borrow the
        // rifle's tick and its single ejected spark, which made the biggest
        // weapon in the game the quietest thing on screen — the only rocket the
        // player ever heard was the blast, a quarter of a second later and
        // somewhere else entirely.
        playFx('rocketLaunch')
        // Smoke thrown BACKWARD, down the screen, out of the tube. It is the
        // half of a launch that reads at a glance: the round goes one way and
        // the exhaust goes the other, which no muzzle flash can say.
        const puffs = minFx ? 2 : cheapFx ? 4 : 7
        for (let i = 0; i < puffs; i++) {
          emit({
            x: e.x + (Math.random() - 0.5) * 0.3, y: e.y - 0.1,
            vx: (Math.random() - 0.5) * 2.4, vy: -2.5 - Math.random() * 2.5,
            life: 340 + Math.random() * 280, size: 0.16 + Math.random() * 0.12,
            color: [190, 180, 170], shape: 3, alpha: 0.45, drag: 2.4
          })
        }
        if (!minFx) {
          emit({
            x: e.x, y: e.y, vx: 0, vy: 0, life: 130, size: 0.3,
            color: [255, 220, 150], additive: true, shape: 0, drag: 6
          })
        }
        break
      }
      playFx('shoot')
      // A single ejected spark. Anything more and 46 shots a second becomes fog.
      if (richFx && Math.random() < 0.35) {
        emit({
          x: e.x, y: e.y, vx: (Math.random() - 0.5) * 2.2, vy: -1.2 - Math.random(),
          life: 260, size: 0.07, color: [255, 200, 110], additive: true, shape: 2, drag: 2
        })
      }
      break

    case 'hit': {
      const hard = e.on === 'gate' || e.on === 'barricade' || e.on === 'rock'
      playFx(hard ? 'hitHard' : 'hitSoft')
      // Stone sparks grey-white and reads COLDER than anything the player can
      // break — the ricochet is the feedback that says "stop shooting this".
      const colour: [number, number, number] = e.on === 'gate' ? [150, 230, 255]
        : e.on === 'crate' ? [200, 160, 90]
          : e.on === 'foe' ? [230, 90, 90]
            : e.on === 'rock' ? [225, 232, 245]
              : [200, 205, 215]
      const n = cheapFx ? 2 : 4
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
      // inverted: descending cue, amber instead of cyan, a minus instead of a
      // plus, and sparks falling INWARD rather than blowing out. Same sentence,
      // opposite meaning, which is the only way the player learns that aiming
      // at the wrong door is an action with a price.
      //
      // The number is the tick's OWN step, which the sim measured (`step` on the
      // event). It used to be a hardcoded `+1`, and from the stage the pump step
      // reaches 2 that is a door climbing `8 → 10 → 12` while printing `+1` over
      // itself — which reads as the game miscounting. A scale door printed `+1`
      // for a tenth, too.
      const hostile = e.hostile === true
      playFx(hostile ? 'gateSubTick' : 'gateTick', e.value)
      // …and the fourth channel, on a phone. Both signs get it, for the same
      // reason both get a tick and a number: the hostile leaf is the identical
      // mechanic running against the player, and a pump the hand cannot feel
      // going the wrong way is the one the player keeps standing in front of.
      // See `useHaptics` for why this is not one buzz per event.
      haptic('tick')
      emitText({
        x: e.x, y: e.y + 0.9, vy: hostile ? 1.8 : 2.6, life: 620,
        text: `${hostile ? '−' : '+'}${gateValueLabel(e.step)}`,
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
        // The one door that is graded as a HIT rather than as a pickup — shake,
        // hurt pulse, implosion — so the hand gets the hit pattern too, not the
        // payout tap. Same argument the mixer makes by giving it `gateTrap`
        // instead of `gatePass`.
        haptic('impact')
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
        const m = cheapFx ? 14 : 34
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
      haptic('reward')
      triggerShake(e.gain >= 20 ? 'strong' : 'small')
      screenFlash = Math.min(0.5, 0.18 + e.gain * 0.006)
      flashColour = mul ? '255,190,240' : '190,235,255'
      rushPulse = 1
      emitText({
        x: e.x, y: e.y + 0.6, vy: 3.4, life: 1000,
        text: mul ? `×${e.value}` : `+${e.gain}`,
        color: mul ? '#ffc0f0' : '#ffffff', size: 0.95, crit: true
      })
      const n = cheapFx ? 16 : 40
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

    // ─── The weapon puzzle ──────────────────────────────────────────────────
    //
    // Three beats, escalating, and each one has to land while the player is
    // looking somewhere else. The escalation is the whole design: a click, a
    // tear, a fanfare — so a player who solves the puzzle by accident the first
    // time still learns the sequence from the noise it made.

    case 'leverPull': {
      // `power` is how far through the puzzle this pull is, which the mixer
      // turns into pitch: the second lever answers the first a fifth higher.
      playFx('lever', e.total > 0 ? e.pulled / e.total : 1)
      triggerShake('small')
      // Sparks off the mechanism, thrown along the road rather than in a ball —
      // a lever is a thing that MOVED, and the debris should say which way.
      for (let i = 0; i < (cheapFx ? 8 : 16); i++) {
        emit({
          x: e.x, y: e.y + 0.4,
          vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 5,
          life: 340 + Math.random() * 260, size: 0.07 + Math.random() * 0.05,
          color: [255, 214, 110], additive: true, shape: 2, drag: 2.2, gravity: 7
        })
      }
      // The count, so one pull of two reads as PROGRESS rather than as a thing
      // that happened. Digits only — it is the same string in every language.
      emitText({
        x: e.x, y: e.y + 0.9, vy: 2.6, life: 900,
        text: `${e.pulled}/${e.total}`,
        color: e.pulled >= e.total ? '#8fffc2' : '#ffd24a', size: 0.7,
        crit: e.pulled >= e.total
      })
      break
    }

    case 'weaponOpen': {
      // Plate steel coming off the box. The shockwave is deliberately the same
      // vocabulary a dismissed gate leaf uses — the player already reads that
      // ring as "a thing that was in the way is gone".
      playFx('weaponOpen')
      triggerShake('strong')
      screenFlash = 0.3
      flashColour = '190,220,255'
      for (let i = 0; i < (cheapFx ? 14 : 30); i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y - 0.8,
          vx: Math.cos(a) * (4 + Math.random() * 9), vy: Math.sin(a) * 5 + 4,
          life: 520 + Math.random() * 380, size: 0.13 + Math.random() * 0.08,
          color: [150, 178, 210], shape: 1, gravity: 14,
          rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 16
        })
      }
      break
    }

    case 'weaponTake': {
      // The payoff. Loud, gold, and shaped like the weapon it just handed over:
      // the burst throws the same silhouette the box was wearing, so the thing
      // the player picked up and the thing now on their HUD are recognisably
      // one object. No copy — the badge does the naming, in the player's own
      // language, which a canvas string never could.
      playFx('weaponTake')
      triggerShake('big')
      screenFlash = 0.45
      flashColour = '255,225,150'
      emitDecal(e.x, e.y, 1.3, 0.4)
      for (let i = 0; i < (cheapFx ? 18 : 44); i++) {
        const a = Math.random() * Math.PI * 2
        const ring = i % 3 === 0
        const sp = ring ? 11 : 2 + Math.random() * 7
        emit({
          x: e.x, y: e.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 + 3,
          life: ring ? 300 + Math.random() * 160 : 640 + Math.random() * 460,
          size: ring ? 0.08 : 0.12 + Math.random() * 0.1,
          color: Math.random() < 0.5 ? [255, 214, 96] : [255, 150, 60],
          additive: true, shape: Math.random() < 0.4 ? 2 : 0, drag: 1.7, gravity: 3
        })
      }
      break
    }

    case 'rocketBlast': {
      playFx('rocketBlast')
      triggerShake(cheapFx ? 'small' : 'strong')
      screenFlash = 0.24
      flashColour = '255,190,120'
      emitDecal(e.x, e.y, e.radius * 0.7, 0.35)
      // A third of the debris is a fast OUTER ring at the blast's true radius,
      // the same trick the bomber's detonation uses: what the player sees has to
      // be the size of what actually landed, or they cannot learn the weapon.
      const n = minFx ? 8 : cheapFx ? 16 : 32
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const ring = i % 3 === 0
        const sp = ring ? e.radius * 6.5 : 2 + Math.random() * e.radius * 2.2
        emit({
          x: e.x, y: e.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 1.5,
          life: ring ? 220 + Math.random() * 120 : 420 + Math.random() * 320,
          size: ring ? 0.08 + Math.random() * 0.04 : 0.13 + Math.random() * 0.1,
          color: Math.random() < 0.55 ? [255, 190, 90] : [220, 96, 52],
          additive: true, shape: Math.random() < 0.5 ? 2 : 0, drag: 1.9, gravity: 2
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
      // The dust the wreck throws up — and the most expensive thing a broken
      // barricade does. These are the widest, longest-lived particles the event
      // emits (size 0.5 against the chips' 0.16, 900 ms against 620) and they
      // are large translucent blits, so their cost is fill rate at exactly the
      // moment the road is busiest. Off from `low` down, like the gate
      // dismissal's smoke above: the chips already say the barricade broke, and
      // nothing the player must react to is carried by the smoke.
      if (!cheapFx) {
        for (let i = 0; i < 6; i++) {
          emit({
            x: e.x, y: e.y, vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2,
            life: 900, size: 0.5, color: [90, 92, 100], shape: 3, alpha: 0.5, drag: 1.4
          })
        }
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
      for (let i = 0; i < (cheapFx ? 16 : 34); i++) {
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

    case 'meteorCast':
      casts.push({
        kind: 'meteor', x: e.x, y: e.y, r: e.radius, inner: 0, dir: 1,
        charged: e.charged, tx: e.x, ty: e.y, t: 0, life: e.ttl, done: false
      })
      break

    case 'sliceCast':
      casts.push({
        kind: 'slice', x: e.x, y: e.y, r: e.reach, inner: 0, dir: e.dir,
        charged: false, tx: e.x, ty: e.y, t: 0, life: e.ttl, done: false
      })
      break

    case 'bombCast':
      // A lit fuse and the ring it will fill. Same contract as the two above —
      // `ttl` is the exact time to the blast, so the ring closes on the beat.
      // The boss's rage cue, quieter: the player already reads that sound as
      // "something has committed and it is about to arrive", which is exactly
      // what a lit bomb is.
      playFx('bossRage', 0.6)
      casts.push({
        kind: 'bomb', x: e.x, y: e.y, r: e.radius, inner: 0, dir: 1,
        charged: false, tx: e.x, ty: e.y, t: 0, life: e.ttl, done: false
      })
      break

    case 'bombBlast': {
      // The loudest thing a miniboss does, because it is the most expensive: a
      // detonation takes half of everyone standing in it. Read as a barrel
      // rather than as a sweep — the player has already been taught what a
      // barrel going off looks like, and this is the same verb.
      playFx('eliteDie')
      triggerShake('big')
      screenFlash = 0.5
      flashColour = '255,200,140'
      emitDecal(e.x, e.y, e.radius * 0.9, 0.55)
      const n = cheapFx ? 20 : 46
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        // A third of the debris is a fast outer RING at the blast's real edge,
        // so the thing the player sees is the size of the thing that hit them.
        const ring = i % 3 === 0
        const sp = ring ? e.radius * 7 : 2 + Math.random() * e.radius * 2.4
        emit({
          x: e.x, y: e.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 2,
          life: ring ? 260 + Math.random() * 140 : 520 + Math.random() * 420,
          size: ring ? 0.09 + Math.random() * 0.05 : 0.15 + Math.random() * 0.13,
          color: ring ? [255, 245, 215] : (Math.random() < 0.5 ? [255, 170, 70] : [120, 96, 80]),
          additive: ring, shape: ring ? 2 : 1,
          gravity: ring ? 0 : 9, drag: ring ? 2.4 : 1.4,
          rot: a, vrot: (Math.random() - 0.5) * 9
        })
      }
      break
    }

    case 'boltCast':
      // The column the round will come down. Emitted once, at the lock.
      playFx('bossGuard', 0.8)
      casts.push({
        kind: 'bolt', x: e.x, y: e.y, r: BOLT_R, inner: 0, dir: 1,
        charged: false, tx: e.tx, ty: e.ty, t: 0, life: e.ttl, done: false
      })
      break

    case 'boltFire': {
      // The muzzle. Small, because the ROUND is the thing to watch and a loud
      // flash at the gun pulls the eye to the wrong end of the line.
      playFx('bossSlam', 0.55)
      triggerShake('small')
      for (let i = 0; i < (cheapFx ? 4 : 10); i++) {
        const spread = (Math.random() - 0.5) * 0.9
        emit({
          x: e.x, y: e.y,
          vx: e.dirX * 9 + spread * 3, vy: e.dirY * 9 + spread,
          life: 180 + Math.random() * 120, size: 0.1 + Math.random() * 0.07,
          color: [180, 240, 255], additive: true, shape: 2, drag: 3.4
        })
      }
      break
    }

    case 'boltEnd':
      // Two different endings, and they must not look alike. A round that ran
      // out of road just fades; one that SPENT itself buried in the crowd, and
      // that is a hit the player has to be able to see they took.
      if (!e.spent) break
      playFx('eliteSweep', 0.7)
      triggerShake('strong')
      emitDecal(e.x, e.y, 0.9, 0.4)
      for (let i = 0; i < (cheapFx ? 10 : 24); i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 3 + 2,
          life: 300 + Math.random() * 260, size: 0.11,
          color: Math.random() < 0.5 ? [170, 235, 255] : [140, 40, 46],
          additive: Math.random() < 0.5, shape: 0, gravity: 8, drag: 1.7
        })
      }
      break

    case 'rollerHit':
      // Everything travels ALONG the roll. A radial burst would read as an
      // explosion and teach the player to look for a safe side of a thing that
      // is four and a half units wide.
      playFx('bossSlam')
      triggerShake('big')
      emitDecal(e.x, e.y, ROLLER_R * 0.8, 0.5)
      for (let i = 0; i < (cheapFx ? 14 : 30); i++) {
        const t = i / 29
        emit({
          x: e.x + (t - 0.5) * ROLLER_R * 1.6,
          y: e.y + (Math.random() - 0.5) * ROLLER_R,
          vx: e.dir * (4 + Math.random() * 7),
          vy: -3 - Math.random() * 5,
          life: 420 + Math.random() * 300, size: 0.13 + Math.random() * 0.08,
          color: Math.random() < 0.5 ? [150, 150, 160] : [150, 40, 44],
          shape: 1, gravity: 10, drag: 1.5,
          rot: Math.random() * 6, vrot: e.dir * 11
        })
      }
      break
    case 'chargeCast':
      // The lane charge's wind-up, and the only boss tell with a cue of its own
      // that LASTS: `bossCharge` is a rasp that runs for about a second, because
      // the second and a bit after this event is when the player has to actually
      // move, and a one-frame clack would put their attention on the frame it is
      // already too late to use.
      playFx('bossCharge')
      casts.push({
        kind: 'charge', x: e.x, y: e.y, r: e.halfW, inner: 0, dir: 1,
        charged: false, tx: e.x, ty: e.toY, t: 0, life: e.ttl, done: false
      })
      break

    case 'bossCharge': {
      // It went through. Read as a slam — it is the same promise ("a hit you did
      // not dodge costs about a third of your crowd") arriving in a different
      // shape, and the player has already been taught what that costs.
      playFx('bossSlam')
      triggerShake('big')
      // Scars down the whole swathe rather than a crater at the end of it, so
      // what is left on the road afterwards is the LANE the boss came down —
      // which is the thing to have learned before the next one.
      const runY = e.fromY - e.y
      const marks = minFx ? 2 : cheapFx ? 3 : 5
      for (let i = 0; i < marks; i++) {
        emitDecal(e.x, e.y + (runY * i) / marks, e.halfW * 0.9, 0.42)
      }
      const n = minFx ? 8 : cheapFx ? 16 : 34
      for (let i = 0; i < n; i++) {
        // Everything leaves SIDEWAYS out of the lane, for the same reason the
        // roller's debris travels along the roll: a radial burst would read as
        // an explosion at a point and teach the player to look for a safe
        // distance from something that has no middle.
        const side = i % 2 === 0 ? 1 : -1
        const along = Math.random()
        emit({
          x: e.x + side * e.halfW * (0.5 + Math.random() * 0.6),
          y: e.y + runY * along,
          vx: side * (4 + Math.random() * 8), vy: -1 + Math.random() * 4,
          life: 420 + Math.random() * 340, size: 0.13 + Math.random() * 0.09,
          color: Math.random() < 0.5 ? [150, 130, 110] : [255, 140, 60],
          additive: Math.random() < 0.35, shape: 1, gravity: 11, drag: 1.5,
          rot: Math.random() * 6, vrot: side * 9
        })
      }
      break
    }

    case 'bossEnrage': {
      // ── The turn ──
      //
      // Arrives in the same frame as `bossRage` and deliberately overwrites its
      // flash rather than adding a second one: two full-screen washes in one
      // frame is one wash the player cannot read. Hotter and longer than the
      // gate's, because the gate has happened before and this has not.
      //
      // The slow-motion hold is the simulation's (`slowHoldMs`), so the moment
      // is already stretched by the time this runs — everything here is spent on
      // making the stretched frame say WHY.
      playFx('bossEnrage')
      triggerShake('big')
      screenFlash = 0.62
      flashColour = '255,90,40'
      emitDecal(e.x, e.y, 2.2, 0.5)
      const ring = minFx ? 12 : cheapFx ? 24 : 46
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2
        // Two speeds off one angle: a fast flat ring that reads as a shockwave
        // leaving the body, and slower embers climbing off it that are still
        // there a second later, when the player looks back at the boss.
        emit({
          x: e.x, y: e.y - 0.5, vx: Math.cos(a) * 13, vy: Math.sin(a) * 6.5 - 1,
          life: 520, size: 0.15, color: [255, 110, 40], additive: true, shape: 2, drag: 2
        })
        if (i % 2 === 0) {
          emit({
            x: e.x + Math.cos(a) * 0.7, y: e.y - 0.3,
            vx: Math.cos(a) * 1.6, vy: 2.4 + Math.random() * 3.2,
            life: 900 + Math.random() * 600, size: 0.1 + Math.random() * 0.07,
            color: [255, 190, 90], additive: true, shape: 2, drag: 0.9, gravity: -1.6
          })
        }
      }
      break
    }

    case 'shockCast':
      // The meteor's own rage cue, because that is what the sound means here:
      // "something has committed and it is about to arrive". The DIRECTION of the
      // answer is carried entirely by the picture — a mark that says "get in" and
      // a sound that says "get out" would be a mix arguing with itself.
      playFx('bossRage', 0.7)
      casts.push({
        kind: 'shock', x: e.x, y: e.y, r: e.outer, inner: e.eye, dir: 1,
        charged: false, tx: e.x, ty: e.y, t: 0, life: e.ttl, done: false
      })
      break

    case 'bossShock': {
      playFx('bossSlam')
      triggerShake('big')
      // Scars on the BAND and nothing in the eye. What is left on the road
      // afterwards is a burnt ring with clean ground inside it, which is the one
      // thing worth having learned before the next one — and a crater in the
      // middle would teach the opposite.
      const ring = minFx ? 6 : cheapFx ? 10 : 18
      const mid = (e.eye + e.outer) / 2
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * TAU
        emitDecal(e.x + Math.cos(a) * mid, e.y + Math.sin(a) * mid * 0.45, e.outer * 0.3, 0.4)
      }
      const n = minFx ? 10 : cheapFx ? 20 : 40
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU
        // Everything leaves OUTWARD from the band it came off, so the eye stays
        // visibly clear through the impact. A radial burst from the centre would
        // spray fire across the one patch of road the player was told to stand
        // on, at the exact moment they are standing on it.
        const at = e.eye + Math.random() * (e.outer - e.eye)
        const sp = 3 + Math.random() * 7
        emit({
          x: e.x + Math.cos(a) * at, y: e.y + Math.sin(a) * at * 0.45,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 2,
          life: 420 + Math.random() * 360, size: 0.12 + Math.random() * 0.1,
          color: Math.random() < 0.5 ? [255, 170, 70] : [160, 80, 50],
          additive: Math.random() < 0.45, shape: Math.random() < 0.5 ? 2 : 1,
          gravity: 8, drag: 1.5
        })
      }
      break
    }

    case 'wardCast':
      // No combat cue at all. The one thing on the road that is not about to hurt
      // anybody gets the pickup's own chime, because that is what the player
      // already reads as "this is for you".
      playFx('bossGuard', 0.35)
      casts.push({
        kind: 'ward', x: e.x, y: e.y, r: e.radius, inner: 0, dir: 1,
        charged: false, tx: e.x, ty: e.y, t: 0, life: e.ttl, done: false
      })
      break

    case 'wardEnd': {
      // Finish the circle NOW rather than letting it run its `ttl` out. The three
      // things that end a ward — the heal landing, the heal being revoked, the
      // boss dying — all arrive early relative to the cast's own clock, and a
      // circle still counting down over a resolved heal is a mark promising
      // something that has already happened.
      for (const c of casts) {
        if (c.kind !== 'ward' || c.done) continue
        c.t = c.life
        c.done = true
        break
      }
      // Nothing to celebrate at zero: a ward the player never reached, or one
      // withdrawn with its heal, simply fades. The burst is the reward for having
      // stood on it, and it is sized by how much of it they actually denied.
      if (e.denied <= 0.02) break
      playFx('bossGuard', 0.5 + e.denied * 0.5)
      const n = minFx ? 8 : cheapFx ? 16 : 14 + Math.round(e.denied * 26)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU
        emit({
          x: e.x + Math.cos(a) * e.radius * 0.7,
          y: e.y + Math.sin(a) * e.radius * 0.35,
          vx: Math.cos(a) * 2, vy: 3 + Math.random() * 4,
          life: 520 + Math.random() * 420, size: 0.1 + Math.random() * 0.07,
          color: [180, 240, 255], additive: true, shape: 2, drag: 1.2, gravity: -1.4
        })
      }
      break
    }

    case 'gazeCast':
      // A low, rising note rather than a combat cue: nothing is coming AT the
      // player, something is starting to LOOK at them. The eye itself is drawn
      // from the world every frame — see `drawBossGaze`.
      playFx('bossRage', 0.45)
      break

    case 'gazeWatch':
      // The lock. Short and dry, because the instruction it carries is "stop",
      // and a long sound would tempt the thumb to react to it.
      playFx('bossGuard', 0.7)
      triggerShake('small')
      break

    case 'gazeStrike': {
      playFx('bossSlam')
      triggerShake('big')
      screenFlash = 0.35
      flashColour = '190,110,255'
      gazeBeams.push({
        x: e.x, y: e.y,
        bx: e.fromX, by: e.fromY, bscale: getBoss()?.scale ?? 2.5,
        halfW: e.halfW, t: 0
      })
      emitDecal(e.x, e.y, e.halfW * 0.8, 0.4)
      const n = minFx ? 8 : cheapFx ? 16 : 30
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU
        emit({
          x: e.x + Math.cos(a) * e.halfW * 0.6, y: e.y + Math.sin(a) * 0.6,
          vx: Math.cos(a) * (3 + Math.random() * 6), vy: 2 + Math.random() * 5,
          life: 380 + Math.random() * 300, size: 0.11 + Math.random() * 0.08,
          color: Math.random() < 0.6 ? [200, 130, 255] : [245, 230, 255],
          additive: true, shape: 2, drag: 1.8, gravity: 3
        })
      }
      break
    }

    case 'gazeEnd':
      // The one moment to say "that was the answer". Quiet, and only when the
      // crowd actually held — a strike already said everything there was to say.
      if (!e.kept) break
      playFx('bossGuard', 0.35)
      for (let i = 0; i < (minFx ? 6 : cheapFx ? 10 : 18); i++) {
        const a = (i / 18) * TAU
        const at = anchor()
        emit({
          x: at.x + Math.cos(a) * 1.4, y: at.y + Math.sin(a) * 0.7,
          vx: Math.cos(a) * 1.2, vy: 2.5 + Math.random() * 2,
          life: 520 + Math.random() * 300, size: 0.09,
          color: [220, 190, 255], additive: true, shape: 2, drag: 1.2, gravity: -1.2
        })
      }
      break

    case 'burrowDive': {
      // It went under. Read as a body leaving the road rather than as an attack
      // starting, because that is what it is — the attack is the mound, and the
      // mound draws itself.
      playFx('eliteSweep', 0.45)
      triggerShake('small')
      emitDecal(e.x, e.y, 0.9, 0.45)
      for (let i = 0; i < (minFx ? 6 : cheapFx ? 12 : 24); i++) {
        const a = Math.random() * TAU
        const sp = 2 + Math.random() * 5
        emit({
          x: e.x, y: e.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 + 3 + Math.random() * 3,
          life: 340 + Math.random() * 280, size: 0.11 + Math.random() * 0.09,
          color: Math.random() < 0.5 ? [120, 92, 62] : [76, 58, 40],
          shape: 1, gravity: 11, drag: 1.4,
          rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 8
        })
      }
      break
    }

    case 'rakeCast':
      // The claw's wind-up. No sound of its own: it borrows the elite's swing,
      // because it IS a swing, and a fifth combat cue in the same second of the
      // mix is mud rather than information.
      playFx('eliteSweep', 0.35)
      rakes.push({
        lanes: e.lanes, y: e.y, halfW: e.halfW, depth: e.depth,
        t: 0, life: e.ttl, done: false
      })
      break

    case 'bossRake': {
      playFx('bossSlam')
      triggerShake('strong')
      // Mark the rake struck if its wind-up is still on screen; otherwise paint
      // the scar on its own, so a rake that arrived without a tell (it cannot,
      // but a future path might) still leaves the evidence that it landed.
      // Matched on the LANES rather than on "the first one still winding up",
      // because a crossrake puts two casts on the road at once (see
      // `throwCrossrake`) and its second pass has to close its own telegraph.
      // The positional fallback is kept for the same reason it was written: a
      // strike that arrived without a tell should still leave the evidence that
      // it landed.
      const sameLanes = (r: Rake): boolean =>
        r.lanes.length === e.lanes.length &&
        r.lanes.every((x, i) => Math.abs(x - (e.lanes[i] ?? 0)) < 1e-6)
      const live = rakes.find((r) => !r.done && sameLanes(r)) ?? rakes.find((r) => !r.done)
      if (live) { live.t = live.life; live.done = true }
      else {
        rakes.push({
          lanes: e.lanes, y: e.y, halfW: e.halfW, depth: e.depth,
          t: 0, life: 0.001, done: true
        })
      }
      for (const lx of e.lanes) {
        if (Math.abs(lx) > LANE_HALF + 1) continue
        emitDecal(lx, e.y, e.halfW * 1.6, 0.45)
        const n = minFx ? 3 : cheapFx ? 6 : 12
        for (let i = 0; i < n; i++) {
          emit({
            x: lx + (Math.random() - 0.5) * e.halfW * 2,
            y: e.y + (Math.random() - 0.5) * e.depth * 2,
            vx: (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 4,
            life: 420, size: 0.13, color: [150, 120, 100], shape: 1,
            gravity: 12, drag: 1.6, vrot: (Math.random() - 0.5) * 9
          })
        }
      }
      break
    }

    case 'healCast':
      healTells.push({ x: e.x, y: e.y, t: 0, life: e.ttl })
      break

    case 'bossHeal': {
      playFx('bossHeal')
      screenFlash = 0.18
      flashColour = '90,240,140'
      // The rising plus. The one number in the game that goes the wrong way, so
      // it is spelled out rather than left to the bar: a player who does not
      // read WHY the bar moved concludes their damage stopped counting.
      emitText({
        x: e.x, y: e.y + 0.8, vy: 2.6, life: 1000,
        text: `+${Math.round(HEAL_FRACTION * 100)}%`,
        color: '#6cf59a', size: 0.95, crit: true
      })
      const n = minFx ? 8 : cheapFx ? 16 : 30
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        emit({
          x: e.x + Math.cos(a) * 1.2, y: e.y + Math.sin(a) * 0.6,
          vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 1.3 + 2.4,
          life: 620, size: 0.13, color: [110, 245, 150],
          additive: true, shape: 0, drag: 1.4
        })
      }
      break
    }

    case 'bossBoltCast':
      healTells.push({ x: e.x, y: e.y, t: 0, life: e.ttl })
      playFx('bossGuard', 0.4)
      break

    case 'bossBoltHit': {
      playFx('bossSlam', 0.5)
      triggerShake('small')
      emitDecal(e.x, e.y, e.radius, 0.35)
      const n = minFx ? 6 : cheapFx ? 12 : 24
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * 5 * e.radius, vy: Math.sin(a) * 3 * e.radius + 1.5,
          life: 460, size: 0.12, color: [110, 240, 150],
          additive: true, shape: 2, drag: 2
        })
      }
      break
    }

    case 'summonFlank': {
      // The wave's arrival, scaled down to one body and stripped of the shake:
      // a wave is the fight turning, a flank body is the fight ending, and the
      // second should not announce itself louder than the first.
      playFx('eliteSpawn', 0.35)
      const n = minFx ? 3 : cheapFx ? 6 : 12
      for (let i = 0; i < n; i++) {
        emit({
          x: e.x + (Math.random() - 0.5) * 1.6,
          y: e.y + (Math.random() - 0.5) * 1.2,
          vx: (Math.random() - 0.5) * 1.8, vy: 1.6 + Math.random() * 2.6,
          life: 480, size: 0.13, color: [120, 130, 145], shape: 3, drag: 1.5, gravity: 5
        })
      }
      break
    }

    case 'summonWave': {
      // Borrowed from the miniboss arrival, because that is what it is: bodies
      // walking onto the road with a health bar's worth of intent behind them.
      playFx('eliteSpawn', 0.6)
      triggerShake('small')
      const n = minFx ? 6 : cheapFx ? 12 : 26
      // A FLANKS wave came up at the two rails rather than in a line ahead of
      // the crowd (`e.flank`), and the ground has to break where the bodies
      // actually are. `e.x` stays the crowd's own centre for both shapes — see
      // the note on the event — so a flanks wave that reused the spread below
      // would tear the road open in the one place nothing was summoned, which is
      // also the place the player is standing.
      const rails = e.flank ? flankXs() : null
      for (let i = 0; i < n; i++) {
        const at = rails ? (rails[i % rails.length] ?? e.x) : e.x
        emit({
          x: at + (Math.random() - 0.5) * (rails ? 1.8 : 6.4),
          y: e.y + (Math.random() - 0.5) * (rails ? 2.6 : 1.6),
          vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.5,
          life: 560, size: 0.15, color: [120, 130, 145], shape: 3, drag: 1.5, gravity: 5
        })
      }
      break
    }

    case 'grenadeThrow':
      // The throw itself. Almost nothing — a scuff of dust at the crowd's feet
      // and an arm sound — because the grenade is now a real object in the air
      // and IT is the thing the player should be watching. A loud throw would
      // pull the eye back down to the crowd at the exact moment it needs to
      // travel up the road.
      // A swing, borrowed from the elite's sweep — a throw is a swing.
      playFx('eliteSweep', 0.4)
      for (let i = 0; i < (cheapFx ? 3 : 7); i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4
        emit({
          x: e.x, y: e.y + 0.2, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.2 + 0.6,
          life: 220 + Math.random() * 160, size: 0.07 + Math.random() * 0.06,
          color: [210, 205, 190], additive: false, shape: 0, drag: 2.8, gravity: 2
        })
      }
      break

    case 'grenade':
      // The player's own explosion. Reads like a barrel blast on purpose — the
      // two are the same verb — but tinted cooler so a thrown grenade is never
      // mistaken for a barrel someone happened to shoot.
      playFx('eliteDie', 0.9)
      triggerShake('strong')
      screenFlash = 0.42
      flashColour = '200,225,255'
      emitDecal(e.x, e.y, 2.1, 0.55)
      for (let i = 0; i < (cheapFx ? 18 : 40); i++) {
        const a = Math.random() * Math.PI * 2
        const ring = i % 3 === 0
        const sp = ring ? 10 + Math.random() * 5 : 2 + Math.random() * 6
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.55 + 1.4,
          life: ring ? 240 + Math.random() * 150 : 560 + Math.random() * 460,
          size: ring ? 0.08 + Math.random() * 0.06 : 0.14 + Math.random() * 0.14,
          color: ring ? [235, 245, 255] : (Math.random() < 0.5 ? [255, 200, 120] : [150, 190, 240]),
          additive: true, shape: ring ? 2 : 0, drag: ring ? 2.6 : 1.2, gravity: ring ? 0 : 3
        })
      }
      break

    case 'shieldUp':
      // A dome snapping on over the crowd. Cool blue, and quiet: the shield is a
      // defensive beat and must not read as loudly as the thing it protects from.
      playFx('gateMul', 0.7)
      screenFlash = 0.16
      flashColour = '140,220,255'
      for (let i = 0; i < (cheapFx ? 12 : 26); i++) {
        const a = Math.random() * Math.PI * 2
        const r = 1.4 + Math.random() * 0.6
        emit({
          x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.6,
          vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 0.8 + 1.2,
          life: 420 + Math.random() * 260, size: 0.09 + Math.random() * 0.07,
          color: [130, 220, 255], additive: true, shape: 2, drag: 2.4, gravity: -0.6
        })
      }
      break

    case 'shieldSave':
      // One spark where a survivor should have died, plus a flash of the bubble
      // itself. The bubble flash is the important half: a save is invisible by
      // definition — nothing happens — so the shield has to VISIBLY take the hit
      // or the player never learns what their three seconds bought them.
      shieldHitAt = nowMs()
      // Cheap on purpose beyond that: this fires every second loss for the whole
      // duration, so it has to be legible at a glance and cost almost nothing
      // when six land in one frame.
      if (!cheapFx) {
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
          emit({
            x: e.x, y: e.y + 0.3, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2.4,
            life: 200 + Math.random() * 140, size: 0.06 + Math.random() * 0.05,
            color: [160, 230, 255], additive: true, shape: 2, drag: 2.6, gravity: -0.4
          })
        }
      }
      break

    case 'cageBreak': {
      // The cage's payoff, and it has one job the crate's does not: the reward
      // is BODIES, and bodies are already appearing on the road from
      // `spawnUnit`. So this is deliberately quieter than a crate break in
      // everything except the number — the survivors themselves are the
      // spectacle, and a fat particle bloom over the top of them would hide it.
      playFx('cage')
      triggerShake('small')
      screenFlash = 0.16
      flashColour = '255,205,140'
      haptic('reward')
      emitText({
        x: e.x, y: e.y + 0.6, vy: 3.2, life: 1200,
        text: `+${e.count}`, color: '#ffd7a1', size: 0.86, crit: true
      })
      // Iron, not wood: heavy dark shards that fall fast, against the crate's
      // pale splinters. Same debris channel, opposite material — which is the
      // silhouette read continuing for the half second after the prop is gone.
      for (let i = 0; i < (cheapFx ? 8 : 16); i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * (2 + Math.random() * 6), vy: Math.sin(a) * 3.4 + 4,
          life: 520 + Math.random() * 320, size: 0.11, color: [125, 134, 152],
          shape: 1, gravity: 15, rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 14
        })
      }
      // …and the lamp going out over the top of them: a warm upward puff, the
      // one moment the road is allowed to look hopeful.
      for (let i = 0; i < (cheapFx ? 5 : 12); i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 3.6 - 1.2,
          life: 620 + Math.random() * 380, size: 0.1 + Math.random() * 0.08,
          color: [255, 200, 120], additive: true, shape: 2, drag: 1.9, gravity: -1.6
        })
      }
      break
    }

    case 'bulwarkTake':
      // Arming. Reads as the shield skill coming up (`shieldUp`), one notch
      // heavier, because it is: same colour, same family of cue, a real shake
      // where the skill has none. `fresh` is false when one was already armed —
      // the pickup does not stack — so a second box is acknowledged with the
      // sound alone and none of the promise.
      playFx(e.fresh ? 'bulwarkArm' : 'crate', e.fresh ? 1 : 0.6)
      if (e.fresh) {
        triggerShake('small')
        screenFlash = 0.2
        flashColour = '140,220,255'
        haptic('tick')
        for (let i = 0; i < (cheapFx ? 10 : 22); i++) {
          const a = Math.random() * Math.PI * 2
          const rr = 0.5 + Math.random() * 0.5
          emit({
            x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr * 0.6,
            vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.1 + 2.2,
            life: 480 + Math.random() * 280, size: 0.09 + Math.random() * 0.07,
            color: [130, 220, 255], additive: true, shape: 2, drag: 2.2, gravity: -1.1
          })
        }
      }
      break

    case 'bulwarkSave': {
      // ── The whole pickup, spent, in one frame ──
      //
      // This is the moment the detour has to justify itself. `shieldSave` is
      // deliberately tiny because it fires every second loss for three seconds;
      // this fires ONCE per pickup, against a blow that was about to take a
      // fifth of the crowd, and if the player misses it the box taught them
      // nothing at all. So it takes every channel the game has at once —
      // sound, shake, flash, haptic, a ring, and the number it just saved —
      // where the skill's version takes two of them at a whisper.
      //
      // It borrows `shieldHitAt`, which is what brightens the crowd's own dome:
      // when the timed shield happens to be up as well, the bubble flares on the
      // same frame and the two protections visibly act as one thing.
      playFx('bulwark')
      shieldHitAt = nowMs()
      triggerShake('big')
      screenFlash = 0.42
      flashColour = '170,235,255'
      haptic('impact')
      emitText({
        x: e.x, y: e.y + 0.9, vy: 2.6, life: 1400,
        text: `−${e.count}`, color: '#9ee8ff', size: 1.05, crit: true
      })
      // A hard shock ring at the point of impact — the blow arriving — and then
      // the same energy thrown straight back out of it. The ring is what says
      // "this happened HERE" on a road where the crowd may be nowhere near the
      // thing that swung.
      emitDecal(e.x, e.y, 2.4, 0.4)
      for (let i = 0; i < (cheapFx ? 16 : 46); i++) {
        const a = Math.random() * Math.PI * 2
        const ring = i % 3 === 0
        const sp = ring ? 11 + Math.random() * 6 : 3 + Math.random() * 7
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 + 1.1,
          life: ring ? 260 + Math.random() * 160 : 520 + Math.random() * 380,
          size: ring ? 0.09 + Math.random() * 0.06 : 0.12 + Math.random() * 0.12,
          color: ring ? [235, 250, 255] : [120, 210, 255],
          additive: true, shape: 2, drag: ring ? 2.4 : 1.3, gravity: ring ? 0 : -0.8
        })
      }
      break
    }

    case 'barrelLit':
      // Quiet on purpose: a spark and a puff. The barrel's own strobe is the
      // real tell, and a bang here would be a lie about what just happened.
      playFx('crate', 0.5)
      for (let i = 0; i < (cheapFx ? 4 : 9); i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1
        emit({
          x: e.x, y: e.y + 0.5, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 3.5,
          life: 260 + Math.random() * 220, size: 0.07 + Math.random() * 0.06,
          color: [255, 225, 150], additive: true, shape: 2, drag: 2.2, gravity: -1
        })
      }
      break

    case 'barrelBlast':
      // The loudest thing on the road that is not a boss dying. It has to be:
      // this is the player's answer to a shield they were told they could do
      // nothing about, and the payoff has to match the size of that reversal.
      playFx('eliteDie', 1)
      triggerShake('strong')
      screenFlash = 0.5
      flashColour = '255,200,120'
      emitDecal(e.x, e.y, 2.4, 0.6)
      for (let i = 0; i < (cheapFx ? 20 : 46); i++) {
        const a = Math.random() * Math.PI * 2
        // A shockwave ring plus a slower fireball: the fast particles draw the
        // radius the blast actually covers, which is information the player
        // needs for the NEXT barrel.
        const ring = i % 3 === 0
        const sp = ring ? 11 + Math.random() * 5 : 2 + Math.random() * 7
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.55 + 1.5,
          life: ring ? 260 + Math.random() * 160 : 640 + Math.random() * 520,
          size: ring ? 0.09 + Math.random() * 0.07 : 0.16 + Math.random() * 0.16,
          color: ring ? [255, 245, 210] : (Math.random() < 0.5 ? [255, 170, 60] : [200, 60, 40]),
          additive: true, shape: ring ? 2 : 0, drag: ring ? 2.6 : 1.1, gravity: ring ? 0 : 3
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

      // ── Kicked-up ground, not a spray ──
      //
      // This burst was eight round particles at `[220, 90, 80]` — a flat red,
      // thrown upward and outward from the body with gravity on it. Nothing in
      // the code called it blood and the intent was clearly a "hit" accent, but
      // that is precisely what it drew: a red spatter leaving a person. It is a
      // children's game, and the rule is no blood.
      //
      // It survived this long because a death used to be over in a blink. Now
      // that a body visibly falls, crumples and lies there for the better part
      // of half a second, the spray sits ON the fallen body for all of it, which
      // is the read that made it obvious.
      //
      // So the burst is the ROAD instead of the body: the same eight particles
      // in the crowd's own `DUST`, lower, flatter and slower, so a loss still
      // lands as an impact without anything leaving the survivor.
      //
      // Not tinted per outfit, and the dead `outfitTone(e.outfit)` call that
      // used to sit here (fetched, then thrown away on a `void`) is gone with
      // the red: `CelTones.base` is a CSS colour STRING and a particle takes an
      // RGB triple, so mixing the two means parsing a hex on every death of a
      // hundred-strong wipe. Dust off a road does not need to know whose boots
      // kicked it.
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2
        emit({
          // Flat and low: dust is pushed OUT along the ground by something
          // landing on it, not thrown up out of it.
          x: e.x, y: e.y + 0.12,
          vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 1.1 + 0.5,
          life: 520, size: 0.11, color: DUST, shape: 3,
          alpha: 0.5, gravity: 2.4, drag: 3
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
      haptic('impact')
      triggerShake(e.charged ? 'big' : 'strong')
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
      // FIRST, before the flash and the shake: every telegraph the boss was
      // still holding out comes off the road on the frame it dies. See
      // `clearBossTells`.
      clearBossTells()
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

    case 'rally': {
      // ── The second wind ──
      //
      // The loudest GOOD thing in the game, and it has to be: the frame before
      // this one, the player watched their last survivor die. Without a burst
      // big enough to overwrite that, bodies simply reappear and the game reads
      // as broken — which is exactly what the first version did.
      //
      // Warm gold throughout, and deliberately nothing like the cool blue of
      // the shield: the shield is protection the player BOUGHT, this is a gift
      // they did not. Column of light, a halo ring spreading out along the
      // road, and feathers coming down through it — see `drawRallyHalo` for the
      // painted half, which is anchored to the crowd rather than to the road.
      rallyAt = nowMs()
      rallyX = e.x
      rallyY = e.y
      playFx('rally')
      // A shimmer stacked under the sample, so the moment has a chord and not
      // just a jingle.
      playFx('gateMul', 0.9)
      screenFlash = 0.4
      flashColour = '255,238,190'
      emitText({
        x: e.x, y: e.y + 0.6, vy: 2.6, life: 1500,
        text: `+${Math.round(e.count)}`, color: '#ffe9a8', size: 0.95, crit: true
      })
      // The column: sparks climbing out of the ground where they fell.
      for (let i = 0; i < (cheapFx ? 14 : 34); i++) {
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * 1.3
        emit({
          x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.6,
          vx: Math.cos(a) * 0.6, vy: 5 + Math.random() * 6,
          life: 700 + Math.random() * 520, size: 0.09 + Math.random() * 0.08,
          color: Math.random() < 0.5 ? [255, 226, 150] : [255, 248, 225],
          additive: true, shape: 2, drag: 1.1, gravity: -2.4
        })
      }
      // The ring: the halo spreading out at ground level.
      for (let i = 0; i < (cheapFx ? 10 : 24); i++) {
        const a = (i / (cheapFx ? 10 : 24)) * Math.PI * 2
        emit({
          x: e.x, y: e.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 5,
          life: 380 + Math.random() * 200, size: 0.08 + Math.random() * 0.05,
          color: [255, 236, 176], additive: true, shape: 2, drag: 3.2, gravity: 0
        })
      }
      // The feathers: soft, slow, falling THROUGH the rising sparks. The
      // opposite direction is the whole trick — it is what stops the burst
      // reading as one more explosion.
      if (!cheapFx) {
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2
          const r = 0.4 + Math.random() * 2.2
          emit({
            x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.6 + 2.6,
            vx: (Math.random() - 0.5) * 1.6, vy: -1.2 - Math.random() * 1.2,
            life: 1100 + Math.random() * 700, size: 0.14 + Math.random() * 0.1,
            color: [255, 250, 236], alpha: 0.85, shape: 1, drag: 0.5, gravity: 0.7,
            rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 3
          })
        }
      }
      break
    }
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
  clearLabelWidths()
  // Ramps are keyed on the dimensions they were built at, so a resize would
  // simply miss and rebuild rather than paint the wrong size — but a stage
  // change moves the palette under keys that do NOT carry it, so they are
  // dropped here with the rest of the cached surfaces.
  clearRamps()
  // The dismissal pools are the renderer's own transients — `resetVfx` cannot
  // reach them — and a leaf still tearing itself down when a stage restarts
  // would draw a gate that no longer exists at a world position that has moved.
  // Half a second of debris from the last run is exactly the kind of thing that
  // gets reported as a ghost gate.
  for (const d of dismissals) d.active = false
  for (const s of shocks) s.active = false
  for (const t of topples) t.active = false
  // Casts are the same kind of transient: a meteor still falling toward ground
  // that belonged to the last run would land on nobody, in the wrong place, and
  // announce an attack that is not coming.
  casts.length = 0
  rakes.length = 0
  gazeBeams.length = 0
  healTells.length = 0
  // …and with them the clock they were being stepped against. `resetWorld` puts
  // the simulation clock back to zero, so a delta taken across a stage change is
  // negative; it is clamped rather than trusted, but saying so here is cheaper
  // than making the next reader work that out from the clamp.
  lastSimNow = -1
  hpChip.clear()
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
