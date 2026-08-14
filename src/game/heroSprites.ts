import {
  blob, cel, ink, stroke, fillShape, tones, terminator, type Pt, type CelTones
} from '@/game/inkArt'
import {
  INK, LINE, SHADE, SHADOW_DIR, footStep, bodyBob, weightShift, hipDrop, limb, gait
} from '@/game/monsterKit'

/**
 * ─── The survivor ───────────────────────────────────────────────────────────
 *
 * One character, drawn from BEHIND, because that is the only angle a vertical
 * runner ever shows: the crowd runs away up the screen. A back view also solves
 * the hardest problem in a crowd game — at 30 px a face is noise, but a
 * silhouette of pack + shoulders + bobbing head reads instantly, and reads the
 * same whether there are three of them or a hundred and ninety.
 *
 * The design agrees with the monster cast on purpose (same ink colour, same key
 * light, same line weights, same cel ramp from `inkArt`), so the two sides of
 * the fight look like they were drawn by one hand.
 *
 * ─── Why it is baked ────────────────────────────────────────────────────────
 *
 * A survivor costs ~60 path operations. At 190 of them on screen that is 11 000
 * path ops per frame, which no phone will do at 60 fps. So each outfit is
 * rendered ONCE into a 14-frame strip covering exactly one stride, and the
 * battlefield blits. Baking happens in idle slices; until a strip exists the
 * renderer falls back to a cheap capsule, so the first frame is never empty and
 * the frame budget is never blown.
 */

/** Frames per stride. Fourteen is the fewest that still reads as running. */
const FRAMES = 14

/** Baked frame size, px. A survivor is ~1.1 world units tall and the zoom tops
 *  out near 70 px/unit on a tablet, so 96 px is always downsampling. */
const PX = 96
const S = PX / 2.25

/** Where the feet sit inside a frame, in px from the top. */
export const HERO_FOOT = PX * 0.52 + S
/** Total character height inside a frame, px. */
export const HERO_HEIGHT = 2.05 * S
/** Frame size, so the renderer can compute its blit rect. */
export const HERO_PX = PX

/** One stride, ms, at the reference speed. The renderer plays the strip faster
 *  or slower with the crowd. */
export const HERO_CYCLE_MS = 520

// ─── Outfits ────────────────────────────────────────────────────────────────
//
// Three, not one. A hundred identical bodies reads as a texture; three tints
// shuffled by unit index reads as a crowd of people. More than three and the
// squad stops reading as one team.

interface Outfit {
  id: string
  jacket: string
  trousers: string
  pack: string
  cloth: string
  skin: string
}

export const OUTFITS: Outfit[] = [
  { id: 'teal', jacket: '#2f7f86', trousers: '#33414f', pack: '#7a5a34', cloth: '#e2c98d', skin: '#c78d61' },
  { id: 'amber', jacket: '#b8722c', trousers: '#3c3a48', pack: '#6b5030', cloth: '#d8d2bd', skin: '#a9714a' },
  { id: 'violet', jacket: '#6a5296', trousers: '#2f3644', pack: '#7b5b38', cloth: '#cfd8e0', skin: '#e0a97e' }
]

/** Outfit for a unit, stable for its whole life so nobody changes clothes. */
export const outfitIndex = (unitIndex: number): number =>
  Math.abs(unitIndex) % OUTFITS.length

// ─── The drawing ────────────────────────────────────────────────────────────

/**
 * Paint one survivor, feet at y = +1, crown at ≈ −1.05, facing away.
 *
 * Everything that moves is a TRANSLATION or a joint angle — never a reshaped
 * contour — so the silhouette is identical on every frame and the sprite does
 * not boil when the strip loops.
 */
const drawSurvivor = (ctx: CanvasRenderingContext2D, s: number, t: number, o: Outfit): void => {
  const jacket = tones(o.jacket, 1.05)
  const trousers = tones(o.trousers, 1)
  const pack = tones(o.pack, 1.1)
  const cloth = tones(o.cloth, 0.9)
  const skin = tones(o.skin, 0.95)
  const steel = tones('#4a5058', 1.2)

  const phase = gait(t, HERO_CYCLE_MS)
  // Legs are half a cycle apart; that is the entire difference between running
  // and hopping.
  const lp = phase
  const rp = gait(t, HERO_CYCLE_MS, 0.5)

  const bob = bodyBob(phase, 0.055) * s
  const sway = weightShift(phase, 0.035) * s
  const lean = -0.05 * s // a runner is always falling forwards

  ctx.save()

  // ── Contact shadow ──
  // Drawn before the body and NOT bobbing with it, so the character reads as
  // lifting off the ground rather than dragging a decal around.
  ctx.save()
  ctx.globalAlpha = 0.3
  fillShape(ctx, blob(sway * 0.4, 1.0 * s, 0.38 * s, 0.1 * s, 21, 0.16), '#1a1018')
  ctx.restore()

  ctx.translate(sway, bob)

  // ── Legs ──
  // Hips are set narrow: a back view with wide hips reads as a duck.
  for (const [hipX, ph, seed] of [[-0.15, lp, 3], [0.15, rp, 9]] as const) {
    const [fx, fy] = footStep(ph, 0.62 * s, 0.3 * s)
    const drop = hipDrop(ph, 0.03) * s
    const hip: Pt = [hipX * s, 0.28 * s + drop]
    const foot: Pt = [hipX * s * 0.9 + fx, 1.0 * s + fy]
    const span = Math.hypot(foot[0] - hip[0], foot[1] - hip[1])
    // Bones only fractionally longer than half the span — see `limb`'s note.
    // Slack bones throw the knee sideways and the character walks like a mantis.
    const bone = Math.sqrt(0.1 * 0.1 * s * s + (span / 2) ** 2)
    limb(ctx, hip, foot, bone, bone, -Math.sign(hipX), trousers, seed, {
      width: 0.135 * s, taper: 0.72, outline: 0.035 * s, joint: 0.52
    })
    // Boot: a wedge, so the leg ends ON the ground instead of in a point.
    const boot = blob(foot[0], foot[1] - 0.02 * s, 0.12 * s, 0.075 * s, seed + 40, 0.12)
    cel(ctx, boot, steel, { shade: terminator(boot, SHADOW_DIR, SHADE, 0.14, seed) })
    ink(ctx, boot, { width: LINE.fine * s, color: INK, seed: seed + 1, breakUp: 0.25 })
  }

  ctx.translate(0, lean)

  // ── Torso ──
  // Slight taper to the waist and wider at the shoulders: the classic back-view
  // read of "person carrying something".
  const torso = blob(0, -0.1 * s, 0.32 * s, 0.42 * s, 5, 0.05)
  cel(ctx, torso, jacket, {
    shade: terminator(torso, SHADOW_DIR, SHADE, 0.12, 5),
    lit: terminator(torso, SHADOW_DIR + Math.PI, 0.6, 0.1, 7)
  })
  ink(ctx, torso, { width: LINE.mid * s, color: INK, seed: 6, breakUp: 0.28 })

  // ── Backpack ──
  // The single most important shape in the design: it is what makes a 24 px
  // silhouette read as "survivor" rather than "person".
  const packShape = blob(0, -0.14 * s, 0.27 * s, 0.3 * s, 11, 0.07)
  cel(ctx, packShape, pack, {
    shade: terminator(packShape, SHADOW_DIR, SHADE, 0.13, 11),
    lit: terminator(packShape, SHADOW_DIR + Math.PI, 0.58, 0.1, 12)
  })
  ink(ctx, packShape, { width: LINE.mid * s, color: INK, seed: 13, breakUp: 0.3 })
  // Straps over the shoulders and a lashed bedroll across the top.
  stroke(ctx, [[-0.2 * s, -0.42 * s], [-0.14 * s, 0.02 * s]], 0.05 * s, 0.045 * s, cloth.shade, 15)
  stroke(ctx, [[0.2 * s, -0.42 * s], [0.14 * s, 0.02 * s]], 0.05 * s, 0.045 * s, cloth.shade, 16)
  const roll = blob(0, -0.38 * s, 0.26 * s, 0.075 * s, 17, 0.08)
  cel(ctx, roll, cloth, { shade: terminator(roll, SHADOW_DIR, SHADE, 0.12, 17) })
  ink(ctx, roll, { width: LINE.fine * s, color: INK, seed: 18, breakUp: 0.3 })

  // ── Arms ──
  // Held forward around a weapon, so they barely swing — only the shoulders
  // rock with the stride. A back-view runner with swinging arms looks like it
  // is jogging to the shops.
  const armSwing = Math.sin(phase * Math.PI * 2) * 0.02 * s
  for (const [side, seed] of [[-1, 21], [1, 27]] as const) {
    const shoulder: Pt = [side * 0.28 * s, -0.26 * s + armSwing * side]
    const hand: Pt = [side * 0.2 * s, -0.5 * s - 0.02 * s * side]
    const span = Math.hypot(hand[0] - shoulder[0], hand[1] - shoulder[1])
    const bone = Math.sqrt(0.07 * 0.07 * s * s + (span / 2) ** 2)
    limb(ctx, shoulder, hand, bone, bone, side, jacket, seed, {
      width: 0.11 * s, taper: 0.7, outline: 0.03 * s, joint: 0.45
    })
    const glove = blob(hand[0], hand[1], 0.075 * s, 0.07 * s, seed + 3, 0.14)
    cel(ctx, glove, skin, { shade: terminator(glove, SHADOW_DIR, SHADE, 0.14, seed + 3) })
    ink(ctx, glove, { width: LINE.hair * s, color: INK, seed: seed + 4, breakUp: 0.2 })
  }

  // ── Weapon ──
  // A stubby carbine, angled slightly up and away. From behind you see the
  // stock, the top rail and a hint of barrel — enough that the muzzle flash the
  // renderer adds later lands somewhere that makes sense.
  const gun: Pt[] = [
    [-0.055 * s, -0.4 * s], [0.055 * s, -0.42 * s],
    [0.05 * s, -0.86 * s], [-0.045 * s, -0.84 * s]
  ]
  cel(ctx, gun, steel, { shade: terminator(gun, SHADOW_DIR, 0.05, 0.06, 31) })
  ink(ctx, gun, { width: LINE.fine * s, color: INK, seed: 32, breakUp: 0.2 })
  stroke(ctx, [[0, -0.62 * s], [0, -0.9 * s]], 0.035 * s, 0.028 * s, '#2a2f36', 33)

  // ── Head ──
  const headY = -0.62 * s
  const head = blob(0, headY, 0.185 * s, 0.2 * s, 41, 0.05)
  cel(ctx, head, skin, {
    shade: terminator(head, SHADOW_DIR, SHADE, 0.12, 41),
    lit: terminator(head, SHADOW_DIR + Math.PI, 0.6, 0.1, 42)
  })
  ink(ctx, head, { width: LINE.mid * s, color: INK, seed: 43, breakUp: 0.26 })

  // Hood / bandana over the crown, with the tie-tails trailing in the run. The
  // tails are the only part of the character that reads at 16 px, so they are
  // exaggerated on purpose.
  const hood = blob(0, headY - 0.05 * s, 0.2 * s, 0.16 * s, 45, 0.06)
  cel(ctx, hood, cloth, {
    shade: terminator(hood, SHADOW_DIR, SHADE, 0.12, 45),
    lit: terminator(hood, SHADOW_DIR + Math.PI, 0.58, 0.1, 46)
  })
  ink(ctx, hood, { width: LINE.mid * s, color: INK, seed: 47, breakUp: 0.3 })
  const flap = Math.sin(phase * Math.PI * 2) * 0.06 * s
  stroke(ctx, [
    [0.1 * s, headY - 0.02 * s],
    [0.22 * s, headY + 0.06 * s + flap],
    [0.3 * s, headY + 0.16 * s + flap * 1.6]
  ], 0.05 * s, 0.015 * s, cloth.shade, 48)

  ctx.restore()
}

// ─── Baking ─────────────────────────────────────────────────────────────────

interface IdleTime { timeRemaining: () => number }

const CACHE = new Map<string, HTMLCanvasElement[]>()
let queue: Outfit[] = []
let building: { o: Outfit; frames: HTMLCanvasElement[] } | null = null
let scheduled = false

const bakeFrame = (o: Outfit, i: number): HTMLCanvasElement => {
  const c = document.createElement('canvas')
  c.width = PX
  c.height = PX
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.translate(PX / 2, PX * 0.52)
    drawSurvivor(ctx, S, (i / FRAMES) * HERO_CYCLE_MS, o)
  }
  return c
}

const pump = (deadline?: IdleTime): void => {
  scheduled = false
  do {
    if (!building) {
      const next = queue.shift()
      if (!next) return
      building = { o: next, frames: [] }
    }
    building.frames.push(bakeFrame(building.o, building.frames.length))
    if (building.frames.length >= FRAMES) {
      CACHE.set(building.o.id, building.frames)
      building = null
    }
  } while ((deadline?.timeRemaining() ?? 0) > 8)
  schedule()
}

const schedule = (): void => {
  if (scheduled || (queue.length === 0 && !building)) return
  scheduled = true
  const ric = (globalThis as { requestIdleCallback?: (cb: (d: IdleTime) => void, o?: { timeout: number }) => void })
    .requestIdleCallback
  if (typeof ric === 'function') ric(pump, { timeout: 1200 })
  else setTimeout(() => pump(), 0)
}

/** Ask for the outfits to be baked. Cheap, idempotent, safe every frame. */
export const primeSurvivors = (): void => {
  for (const o of OUTFITS) {
    if (CACHE.has(o.id) || queue.includes(o) || building?.o === o) continue
    queue.push(o)
  }
  schedule()
}

/** The frame for an outfit at a normalised stride position, or `null` while it
 *  is still baking. */
export const survivorFrame = (outfit: number, cycle01: number): HTMLCanvasElement | null => {
  const o = OUTFITS[Math.abs(outfit) % OUTFITS.length]
  if (!o) return null
  const frames = CACHE.get(o.id)
  if (!frames) return null
  const i = Math.floor((((cycle01 % 1) + 1) % 1) * FRAMES) % FRAMES
  return frames[i] ?? null
}

/** Body colour for an outfit — used by the fallback capsule and by particle
 *  debris, so a survivor who dies throws the right colour of dust. */
export const outfitTone = (outfit: number): CelTones => {
  const o = OUTFITS[Math.abs(outfit) % OUTFITS.length] ?? OUTFITS[0]!
  return tones(o.jacket, 1.05)
}
