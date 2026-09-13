import {
  blob, cel, ink, stroke, fillShape, tones, terminator, type Pt, type CelTones
} from '@/game/inkArt'
import {
  INK, LINE, SHADE, SHADOW_DIR, footStep, bodyBob, weightShift, hipDrop, limb, gait,
  deathBeats, deathArm, deathLeg, deathLoll, deathShadow, fallOntoBack, UPRIGHT_FALL
} from '@/game/monsterKit'
import { CRASH_CAUSES, type DeathCause } from '@/game/survival'
import { stripFrame, stripFrames } from '@/game/spriteStrip'
import { spriteFor, onArtChanged } from '@/game/art'

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

/**
 * The run's gait: a short stance and a long swing, with both feet off the
 * ground between one push-off and the next plant, and the swing boot folding
 * high toward the seat. See the legs in `drawSurvivor`.
 */
const RUN_STANCE = 0.4
/** How high the swing boot rises, as a fraction of the drawing's unit. */
const RUN_LIFT = 0.42

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

/**
 * The feet line and the body height as FRACTIONS of the frame.
 *
 * A painted strip is this frame box at a different resolution, so the renderer
 * measures its blit off the frame it was handed rather than off `PX` — the same
 * contract `monsterSprites` keeps. For a baked frame these are algebraically
 * what the pixel constants above give.
 */
export const HERO_FOOT_R = HERO_FOOT / PX
export const HERO_HEIGHT_R = HERO_HEIGHT / PX

/** The frame box's width:height. A painted panel is this box, scaled up. */
export const HERO_FRAME_ASPECT = 1

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
  //
  // A RUN seen from BEHIND, which is a different drawing from a side-view walk
  // turned round. The stride runs INTO the screen, so nothing swings sideways:
  // a foot that is forward is farther away and sits a touch higher, a foot
  // that is behind is nearer and sits a touch lower, and the whole of the
  // visible motion is the swing leg FOLDING UP — the boot rising toward the
  // seat with its sole turned to the viewer while the other leg stands
  // straight. The first version reused the side-view maths and put the stride
  // on screen-x, which splayed the legs into a V and back again. At 30 px that
  // passed for running; painted at full size it was a skater, and the painter
  // copied it faithfully.
  //
  // Hips are set narrow: a back view with wide hips reads as a duck.
  for (const [hipX, ph, seed] of [[-0.15, lp, 3], [0.15, rp, 9]] as const) {
    const [fx, fy] = footStep(ph, 0.62 * s, RUN_LIFT * s, RUN_STANCE)
    /** 0 on the ground, 1 at the top of the swing. */
    const lift01 = -fy / (RUN_LIFT * s)
    const drop = hipDrop(ph, 0.03) * s
    const hip: Pt = [hipX * s, 0.28 * s + drop]
    // `fx` is travel along the road — depth — not across it. A folded leg
    // drifts a little outward, which is what a knee does when it lifts.
    const foot: Pt = [hipX * s * (1 + lift01 * 0.3), 1.0 * s - fx * 0.1 + fy]
    const span = Math.hypot(foot[0] - hip[0], foot[1] - hip[1])
    // Bones only fractionally longer than half the span — see `limb`'s note.
    // Slack bones throw the knee sideways and the character walks like a
    // mantis. A lifted leg has a short span and simply foreshortens, which is
    // right: from behind, a folded leg IS shorter.
    const bone = Math.sqrt(0.1 * 0.1 * s * s + (span / 2) ** 2)
    limb(ctx, hip, foot, bone, bone, -Math.sign(hipX), trousers, seed, {
      width: 0.135 * s, taper: 0.72, outline: 0.035 * s, joint: 0.52
    })
    // Boot: on the ground a wedge, so the leg ends ON the ground instead of in
    // a point. Lifted, the sole turns to the viewer and the boot grows taller
    // and rounder — the one shape that says "this foot is in the air" at any
    // size, and the thing that makes the eight panels of the reference eight
    // different poses.
    const bw = 0.12 * s * (1 + lift01 * 0.3)
    const bh = 0.075 * s * (1 + lift01 * 1.2)
    const boot = blob(foot[0], foot[1] - 0.02 * s, bw, bh, seed + 40, 0.12)
    cel(ctx, boot, steel, { shade: terminator(boot, SHADOW_DIR, SHADE, 0.14, seed) })
    if (lift01 > 0.4) {
      const sole = blob(foot[0], foot[1] - 0.01 * s, bw * 0.7, bh * 0.6, seed + 42, 0.1)
      fillShape(ctx, sole, steel.deep)
    }
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

// ─── Going down ─────────────────────────────────────────────────────────────
//
// A survivor that dies has to be SEEN to go down. What the renderer did before
// this was spin the running body about its own feet and fade it out across the
// whole 420 ms it has left, which at crowd size reads as a body being deleted —
// the owner's words were "they just quickly disappear". A fall is three beats
// instead: the blow stops it dead, it pitches over, and it lands and lies there.
//
// It is drawn with the boss cast's own vocabulary (`monsterKit`'s "Dying"):
// `deathBeats` times it, `fallOntoBack` puts the body on the ground, and
// `deathArm` / `deathLeg` / `deathLoll` spread the limbs. One size down, with
// one difference that decides the whole pose — a survivor is drawn from BEHIND
// and has no face, so it can never go over onto its back toward the camera.
// It lands PRONE: the pack up, the crown of the hood to the viewer, the boot
// soles turned up. That is also the only read a children's game can afford —
// a bundle of a person face down on the road, no wound, nothing to see.
//
// And it costs nothing per frame, which is the other constraint. Up to 190
// bodies are drawn and this is the hottest loop in the renderer — the
// 2026-09-12 row of PERF-LEDGER.md bought frame time back by deleting the
// per-body contact shadow. So the fall is BAKED like the stride is: two more
// frames per outfit, drawn once, and a dying body then costs a transform and
// the same single blit a living one pays. The contact shadow is inside the
// bake, where it is free.

/**
 * The two pictures a fall is held on.
 *
 *   crash   the moment it is stopped — down on its knees, pitched over, arms
 *           flung out. This is what a survivor that ran into a barricade
 *           crumples into, against the thing that hit it.
 *   fallen  the body, lying prone across the road where it came down.
 *
 * Two rather than the boss's eight: the owner asked for one ("1 frame is
 * enough"), and the second earns its keep by being the IMPACT. A cut straight
 * from a standing body to a lying one has nothing in it for the eye to read as
 * a landing, and the crash pose is also the answer to the other half of the
 * ask — a body that hits an obstacle and crumples against it.
 */
export type DownPose = 'crash' | 'fallen'
export const DOWN_POSES = ['crash', 'fallen'] as const

/** Where each held pose sits on a death's timeline — `monsterKit.deathBeats`.
 *  0.42 is knees gone and a third of the way over; 1 is the body at rest. */
export const DOWN_K: Readonly<Record<DownPose, number>> = { crash: 0.38, fallen: 1 }

/**
 * The side a fall is DRAWN to — the head ends up on the panel's LEFT, which is
 * the side the whole front-on cast falls to (`monsterKit.UPRIGHT_FALL`), so the
 * survivors and the bosses lie the same way round on an unmirrored sheet.
 *
 * A body thrown the OTHER way is mirrored at blit time. The boss deaths refuse
 * that (`deathFallSide`) because an asymmetric creature and the pool under it
 * are authored to one side; a survivor is a back view with one hood tail, and
 * the mirror costs a sign in a transform the blit already has. What it flips is
 * the key light, for 400 ms, on a 30 px body in a crowd — invisible, and worth
 * it, because falling in the direction of the blow is the whole point.
 */
export const DOWN_FALL_SIDE = UPRIGHT_FALL

/**
 * How far above the feet line a fallen survivor's middle comes to rest, in the
 * drawing's unit.
 *
 * Bigger than it looks like it should be, and measured rather than picked: the
 * frame box holds only 0.08 of a unit BELOW the feet line (`HERO_FOOT`), while
 * a body tipped `fallOntoBack`'s 1.0 rad and flattened puts its boots about
 * 0.34 below its own middle. Rest the middle any lower and the boots are cut
 * off by the bottom of the frame — which in play is a body with no feet, and on
 * a reference sheet is a painter faithfully copying one.
 */
const DOWN_REST = 0.78

/** How much of the kit's leg splay a survivor takes. See the legs below. */
const LEG_SPLAY = 0.5

/**
 * How much of the kit's HIP DROP a survivor takes, and how unevenly.
 *
 * A boss's knees give by 0.22 of the drawing's unit, which is a fraction of a
 * torso that is most of its body. A survivor's torso is 0.42 of a unit tall, so
 * the same drop puts the hip joints a fifth of a unit BELOW the coat — the legs
 * come away from the body and the drawing falls into two pieces. At a third of
 * it the hips stay inside the coat, which is the only thing that matters.
 *
 * Uneven, because a body that folds symmetrically is a body taking a knee to
 * fire: the leg on the side it is going over onto folds under it and the other
 * trails, which is what "crumpled against it" looks like.
 */
const HIP_DROP = 0.34
const HIP_KNEEL = 1.5

/** The body's middle, in the drawing's unit — the torso blob's centre. Both the
 *  fall's rotation and the ground it settles onto are measured from it. */
const DOWN_MID = -0.1

/**
 * One survivor going down at `k` (0 the killing blow, 1 the body at rest).
 *
 * A SIBLING of `drawSurvivor` rather than a branch inside it, which is the
 * opposite of what the monster cast does (`dyingAt()` inside each design's own
 * draw). The reason is the count: thirteen designs could not each grow a second
 * function, and one survivor can. Every shape here is the walk's shape at the
 * same size with the same seed — same torso blob, same pack, same boots, same
 * line weights — so it is provably the same person lying down and not a second
 * character that happens to wear the same colours. Only the joint targets and
 * the whole-body transform change, which is the cast's one animation rule.
 */
const drawSurvivorDown = (
  ctx: CanvasRenderingContext2D, s: number, k: number, o: Outfit
): void => {
  const jacket = tones(o.jacket, 1.05)
  const trousers = tones(o.trousers, 1)
  const pack = tones(o.pack, 1.1)
  const cloth = tones(o.cloth, 0.9)
  const skin = tones(o.skin, 0.95)
  const steel = tones('#4a5058', 1.2)

  const D = deathBeats(k)
  const lean = DOWN_FALL_SIDE

  ctx.save()

  // ── Contact shadow ──
  // Outside the body's own transform, and it SPREADS as the body comes down:
  // from a patch under the feet to a long smear under all of it. This is the
  // one thing that makes a tipped-over drawing read as lying ON the road rather
  // than hanging in front of it, and baked into the frame it is free.
  deathShadow(ctx, s, D, 0.25, lean, 1.0, 0.24, DOWN_REST)

  // The whole body: it goes over about its middle, is foreshortened by the
  // ground it is now seen against, and comes to rest with that middle
  // `DOWN_REST` above the line its feet stood on.
  fallOntoBack(ctx, s, D, lean, DOWN_MID, DOWN_REST, 1.0)

  // ── Legs ──
  // The walk's legs are a depth stride — nothing swings sideways. A dying one
  // has no stride at all: the knees give (`deathLeg`'s hip drop, which the
  // limb's own IK buckles outward), then both legs splay into a V on the road.
  // A body lying with its feet together is a body lying to attention.
  for (const [hipX, side, seed] of [[-0.15, -1, 3], [0.15, 1, 9]] as const) {
    const L = deathLeg(D, side, s)
    const hip: Pt = [hipX * s, 0.28 * s + L.hipDrop * HIP_DROP * (side === lean ? HIP_KNEEL : 1)]
    // Half the kit's splay. `deathLeg` opens the legs by a fraction of the
    // drawing's unit, which is measured against a boss — a body two or three
    // times as wide as this one. At full width the survivor's boots end up
    // outside the panel and the legs become the biggest thing in the drawing,
    // which is how a person lying down turns into a spider.
    const foot: Pt = [hipX * s + L.foot[0] * LEG_SPLAY, 1.0 * s + L.foot[1]]
    const span = Math.hypot(foot[0] - hip[0], foot[1] - hip[1])
    const bone = Math.sqrt(0.1 * 0.1 * s * s + (span / 2) ** 2)
    limb(ctx, hip, foot, bone, bone, -side, trousers, seed, {
      width: 0.135 * s, taper: 0.72, outline: 0.035 * s, joint: 0.52
    })
    // The boot, with the SOLE turned to the viewer — which is the drawing the
    // walk's swing boot already has (`lift01 > 0.4`), because a foot whose sole
    // faces the camera is a foot that is not standing on anything. On a prone
    // body both of them are, permanently, and it is the cheapest possible way
    // of saying "this one is down" at 24 px.
    const sole = 0.3 + 0.7 * D.fall
    const bw = 0.12 * s * (1 + sole * 0.15)
    const bh = 0.075 * s * (1 + sole * 0.5)
    const boot = blob(foot[0], foot[1] - 0.02 * s, bw, bh, seed + 40, 0.12)
    cel(ctx, boot, steel, { shade: terminator(boot, SHADOW_DIR, SHADE, 0.14, seed) })
    fillShape(ctx, blob(foot[0], foot[1] - 0.01 * s, bw * 0.7 * sole, bh * 0.6, seed + 42, 0.1), steel.deep)
    ink(ctx, boot, { width: LINE.fine * s, color: INK, seed: seed + 1, breakUp: 0.25 })
  }

  // ── Torso ──
  const torso = blob(0, -0.1 * s, 0.32 * s, 0.42 * s, 5, 0.05)
  cel(ctx, torso, jacket, {
    shade: terminator(torso, SHADOW_DIR, SHADE, 0.12, 5),
    lit: terminator(torso, SHADOW_DIR + Math.PI, 0.6, 0.1, 7)
  })
  ink(ctx, torso, { width: LINE.mid * s, color: INK, seed: 6, breakUp: 0.28 })

  // ── Backpack ──
  // Still on its back, and on a prone body the back faces the sky: the pack is
  // the top of the silhouette all the way down and the last thing that reads
  // once the body is small. Nothing spills out of it — see the prompt.
  const packShape = blob(0, -0.14 * s, 0.27 * s, 0.3 * s, 11, 0.07)
  cel(ctx, packShape, pack, {
    shade: terminator(packShape, SHADOW_DIR, SHADE, 0.13, 11),
    lit: terminator(packShape, SHADOW_DIR + Math.PI, 0.58, 0.1, 12)
  })
  ink(ctx, packShape, { width: LINE.mid * s, color: INK, seed: 13, breakUp: 0.3 })
  stroke(ctx, [[-0.2 * s, -0.42 * s], [-0.14 * s, 0.02 * s]], 0.05 * s, 0.045 * s, cloth.shade, 15)
  stroke(ctx, [[0.2 * s, -0.42 * s], [0.14 * s, 0.02 * s]], 0.05 * s, 0.045 * s, cloth.shade, 16)
  const roll = blob(0, -0.38 * s, 0.26 * s, 0.075 * s, 17, 0.08)
  cel(ctx, roll, cloth, { shade: terminator(roll, SHADOW_DIR, SHADE, 0.12, 17) })
  ink(ctx, roll, { width: LINE.fine * s, color: INK, seed: 18, breakUp: 0.3 })

  // ── Arms ──
  //
  // `ARM_REACH` is longer than the walk's arm, and that is anatomy rather than
  // a reshaped part: the running arms are held FORWARD around the carbine, so
  // what the back view shows of them is foreshortened almost to nothing. Flung
  // out across the ground they are side-on to the camera and show their real
  // length. Drawing them at the walk's on-screen length instead gave a body
  // with flippers.
  const ARM_REACH = 0.52 * s
  for (const [side, seed] of [[-1, 21], [1, 27]] as const) {
    const A = deathArm(D, side, ARM_REACH)
    const shoulder: Pt = [side * 0.28 * s, -0.26 * s]
    const hand: Pt = [shoulder[0] + A.hand[0], shoulder[1] + A.hand[1]]
    const elbow: Pt = [shoulder[0] + A.elbow[0], shoulder[1] + A.elbow[1]]
    const upper = Math.hypot(A.elbow[0], A.elbow[1])
    const fore = Math.hypot(A.hand[0] - A.elbow[0], A.hand[1] - A.elbow[1])
    limb(ctx, shoulder, hand, upper, fore, side, jacket, seed, {
      width: 0.11 * s, taper: 0.7, outline: 0.03 * s, joint: 0.45
    })
    const glove = blob(hand[0], hand[1], 0.075 * s, 0.07 * s, seed + 3, 0.14)
    cel(ctx, glove, skin, { shade: terminator(glove, SHADOW_DIR, SHADE, 0.14, seed + 3) })
    ink(ctx, glove, { width: LINE.hair * s, color: INK, seed: seed + 4, breakUp: 0.2 })
    // The carbine DROPPED — lying on the ground by the hand that was holding
    // it, and only once the body is over. It is the same four-point stock the
    // walk draws, laid flat: a survivor still gripping its gun while lying face
    // down reads as asleep rather than down. Nothing else leaves the body.
    if (side === lean && D.fall > 0.35) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, (D.fall - 0.35) / 0.4)
      ctx.translate(hand[0] + side * 0.1 * s, hand[1] + 0.02 * s)
      ctx.rotate(side * 1.2)
      const gun: Pt[] = [
        [-0.055 * s, -0.02 * s], [0.055 * s, -0.04 * s],
        [0.05 * s, -0.46 * s], [-0.045 * s, -0.44 * s]
      ]
      cel(ctx, gun, steel, { shade: terminator(gun, SHADOW_DIR, 0.05, 0.06, 31) })
      ink(ctx, gun, { width: LINE.fine * s, color: INK, seed: 32, breakUp: 0.2 })
      ctx.restore()
    }
  }

  // ── Head ──
  // Rolled over the way the body went, at an angle no living neck holds
  // (`deathLoll`), and turned face-DOWN: what is left of it to draw is the
  // crown of the hood and the tie-tails, spilled on the ground instead of
  // trailing in the run.
  ctx.save()
  const headY = -0.62 * s
  ctx.translate(0, headY)
  ctx.rotate(deathLoll(D, lean))
  ctx.translate(0, -headY)
  const head = blob(0, headY, 0.185 * s, 0.2 * s, 41, 0.05)
  cel(ctx, head, skin, {
    shade: terminator(head, SHADOW_DIR, SHADE, 0.12, 41),
    lit: terminator(head, SHADOW_DIR + Math.PI, 0.6, 0.1, 42)
  })
  ink(ctx, head, { width: LINE.mid * s, color: INK, seed: 43, breakUp: 0.26 })
  const hood = blob(0, headY - 0.05 * s, 0.2 * s, 0.16 * s, 45, 0.06)
  cel(ctx, hood, cloth, {
    shade: terminator(hood, SHADOW_DIR, SHADE, 0.12, 45),
    lit: terminator(hood, SHADOW_DIR + Math.PI, 0.58, 0.1, 46)
  })
  ink(ctx, hood, { width: LINE.mid * s, color: INK, seed: 47, breakUp: 0.3 })
  const spill = 0.06 * s * (1 - D.fall) - 0.1 * s * D.fall
  stroke(ctx, [
    [0.1 * s, headY - 0.02 * s],
    [0.22 * s, headY + 0.06 * s + spill],
    [0.3 * s, headY + 0.16 * s + spill * 1.6]
  ], 0.05 * s, 0.015 * s, cloth.shade, 48)
  ctx.restore()

  ctx.restore()
}

// ─── The fall, as the renderer plays it ─────────────────────────────────────

/**
 * The window a killed survivor has, ms.
 *
 * Re-exported from `game/survival.ts`, which is where it now lives: the
 * SIMULATION owns the clock (`killUnit` sets `u.dying` from it, and the step
 * splices the body out at zero) and cannot import this module, because this one
 * bakes canvases and the sim has to stay loadable in plain Node. This module
 * owns only what is drawn across the window. `tests/game/survivorFall.test.ts`
 * still bills a real kill through the real funnel and asserts the two agree.
 */
export { SURVIVOR_FALL_MS } from '@/game/survival'

/**
 * The beats, as fractions of the window.
 *
 * Timed so the body is DOWN for 70 % of it and fully opaque for 84 %. The old
 * version faded from the first frame, which is most of why it read as a
 * disappearance rather than a death: by the time the body had turned far enough
 * to look like it was falling it was already half transparent.
 */
const JOLT_END = 0.08
const TOPPLE_END = 0.3
const CRASH_END = 0.46
const SETTLE_END = 0.62
const FADE_START = 0.84

/**
 * Where a body comes to rest and STAYS.
 *
 * The last frame before the fade used to begin. A corpse is no longer disposed
 * of by turning transparent — it lies on the road until the camera carries it
 * away — so the renderer holds this point indefinitely rather than walking past
 * it. The fade tail below still exists and is still what the fall walks through
 * if anything ever plays the animation to completion again.
 */
export const FALL_REST_P = FADE_START

/** How far the body rocks back INTO the blow while it is being stopped, rad. */
const JOLT_BACK = 0.14
/**
 * How far the running body pitches over before the crash pose takes it, rad —
 * and how far the crash pose is carried before the body arrives.
 *
 * These two are what keeps the fall CONTINUOUS across a change of picture. Each
 * held pose is drawn at a lean of its own — the crumple barely, the fallen body
 * at about 0.74 rad once the ground has foreshortened it — so the renderer's
 * own rotation has to pick up where the last picture left off and keep going in
 * the same direction. Rotating back toward upright at a cut is the one thing
 * that reads as a glitch rather than as a fall, and it is what a naive
 * "decay the residual to zero on every beat" does.
 *
 * `TOPPLE` is also deliberately short of lying down: the POSES carry the fall,
 * and a rotated run frame is a placeholder for motion, never for a body on the
 * ground.
 *
 * These are tuned against the DRAWN poses, which is the arm that has to stand on
 * its own. The painted crash panel came back leaning about forty degrees further
 * than the drawing it was painted over — a better picture, and one the eye reads
 * as a jump at the frame the body is hit on, where the squash below is. If that
 * ever wants fixing it is fixed in the REFERENCE, not here: draw the crumple at
 * a later `DOWN_K.crash` so the two agree, re-export, and re-roll the sheet.
 * Changing these numbers to suit the painting would break the drawn fall, which
 * is what every build without the art layer plays.
 */
const TOPPLE = 0.55
const CRASH_OVER = 0.95

/**
 * Where a body that was STOPPED by something comes to rest instead, rad: it
 * arrives against the thing and then settles a little way back into it.
 *
 * Short of `CRASH_OVER` on purpose. Past about a radian the crumple reads as a
 * body that has left its feet and is on its way to the ground, which is exactly
 * what this one is not doing — it hit a crate and is propped there.
 */
const HELD_OVER = 0.78
const HELD_LEAN = 0.62

/**
 * What to draw for a body `p` of the way through its fall (0 → 1), with `rnd`
 * the body's own stable random so a crowd does not fall in lockstep.
 *
 * Returns a SHARED record, refilled on every call. The crowd loop runs this up
 * to 190 times a frame and a fresh object each time is 190 allocations a frame
 * for a value that is read and thrown away before the next call — the same
 * reason `drawUnits` hoists its gradient and its colours out of the loop. Never
 * hold on to the result.
 */
export interface SurvivorFallStep {
  /** Which picture: the live run frame, still pitching over, or a held pose. */
  pose: 'run' | DownPose
  /** Radians about the feet, UNSIGNED — the caller multiplies by the side the
   *  blow threw the body, and mirrors a held pose for the far side. */
  tilt: number
  /** Vertical scale about the feet: the stop's compression, then the slap. */
  squash: number
  /** Horizontal scale, so a squashed body keeps its mass. */
  stretch: number
  /** Opacity. 1 for the first five sixths of the fall. */
  alpha: number
  /** How far the fading body sinks into the road, in frame heights. */
  sink: number
}

const STEP: SurvivorFallStep = {
  pose: 'run', tilt: 0, squash: 1, stretch: 1, alpha: 1, sink: 0
}

export const survivorFallStep = (
  p: number, rnd = 0.5, cause: DeathCause | null = null
): SurvivorFallStep => {
  const k = p < 0 ? 0 : p > 1 ? 1 : p
  // ±10 % on the topple and ±12 % on the ground poses' residual roll. Two
  // multiplies, and enough that no two bodies in a wipe fall identically.
  const vary = 0.9 + rnd * 0.2
  // Did a THING stop it, or did something reach for it? The two falls are the
  // same until the body arrives and then part at the pose they end on — see
  // `CRASH_CAUSES`, which the simulation owns because it is the thing that
  // knows what a barricade is. Read here rather than passed as a flag so the
  // policy lives in one place: the renderer hands over what killed the body and
  // does not get an opinion about it.
  const held = cause !== null && CRASH_CAUSES.has(cause)

  STEP.squash = 1
  STEP.stretch = 1
  STEP.alpha = 1
  STEP.sink = 0

  if (k < JOLT_END) {
    // ── The blow lands ──
    // It is stopped dead: compressed toward the ground and rocked BACK into
    // whatever hit it. This beat is the whole of "crashed against it rather
    // than through it" — the body meets the barricade, jolts against it, and
    // only then goes over, away from it, on the impulse the simulation gave it.
    const q = k / JOLT_END
    const hit = Math.sin(Math.PI * q)
    STEP.pose = 'run'
    // `+ 0` collapses the NEGATIVE zero the first sample would otherwise carry.
    // It is invisible to `ctx.rotate` and not invisible to `Object.is`, which is
    // what a spec comparing the first frame against 0 uses — and the tilt is an
    // unsigned magnitude here (the renderer supplies the blow's side), so a
    // signed zero is not information this record is allowed to carry.
    STEP.tilt = -JOLT_BACK * hit + 0
    STEP.squash = 1 - 0.13 * hit
    STEP.stretch = 1 + 0.09 * hit
    return STEP
  }
  if (k < TOPPLE_END) {
    // ── Pitching over ──
    // Accelerating, because gravity does: `q²` is a body whose weight has
    // gone, where a linear turn is a body being rotated by a renderer.
    const q = (k - JOLT_END) / (TOPPLE_END - JOLT_END)
    STEP.pose = 'run'
    STEP.tilt = TOPPLE * q * q * vary
    return STEP
  }
  if (k < CRASH_END) {
    // ── Crumpling ──
    // The knees are gone and the body folds down where it stands, still turning
    // over: the picture changes to a body that has lost its legs, and the
    // rotation carries straight on through the cut so nothing jumps back
    // upright. The slam's flatten eases out from the same frame, which is what
    // the eye reads the change of picture AS.
    const q = (k - TOPPLE_END) / (CRASH_END - TOPPLE_END)
    STEP.pose = 'crash'
    // A body stopped by a thing does not go on over: it is against the thing,
    // so it arrives at a lean and stays there. One that was taken in the open
    // keeps turning past the point of no return and onto the road.
    STEP.tilt = (TOPPLE + ((held ? HELD_OVER : CRASH_OVER) - TOPPLE) * q) * vary
    STEP.squash = 1 - 0.1 * (1 - q) ** 2
    STEP.stretch = 1 + 0.06 * (1 - q) ** 2
    return STEP
  }
  if (held) {
    // ── Held against it ──
    //
    // The other half of what the owner asked for: "they should fall down OR
    // crash against the obstacle". A survivor billed to a barricade, a crate or
    // a divider never reaches the prone pose — it stays crumpled where it was
    // stopped, and what little movement is left is its weight settling INTO the
    // thing: the lean eases back a touch and holds until the fade.
    //
    // The impact squash is deliberately not repeated here. A body that slaps
    // flat on the road is the road pushing back; one propped against a crate
    // never lands, so a second flatten would read as it being hit twice.
    const q = Math.min(1, (k - CRASH_END) / (SETTLE_END - CRASH_END))
    const ease = 1 - (1 - q) ** 3
    STEP.tilt = (HELD_OVER + (HELD_LEAN - HELD_OVER) * ease) * vary
    if (k < FADE_START) return STEP
    const f = (k - FADE_START) / (1 - FADE_START)
    STEP.alpha = 1 - f
    STEP.sink = 0.05 * f
    return STEP
  }
  STEP.pose = 'fallen'
  if (k < SETTLE_END) {
    // ── Landing ──
    // The body arrives: the last of the roll runs out, and it slaps flat and
    // comes back. Both decay as `(1-q)²`, so the fastest movement is at the
    // cut and the pose is already still by the time the eye settles on it.
    const q = (k - CRASH_END) / (SETTLE_END - CRASH_END)
    // `CRASH_OVER` less the lean the fallen drawing already has: the body
    // arrives at the angle the crumple left off at and settles the last of it
    // out.
    STEP.tilt = 0.22 * (1 - q) ** 2 * vary
    STEP.squash = 1 - 0.12 * (1 - q) ** 2
    STEP.stretch = 1 + 0.08 * (1 - q) ** 2
    return STEP
  }
  STEP.tilt = 0
  if (k < FADE_START) return STEP
  // ── Gone ──
  //
  // The bodies CANNOT be left on the road: a bad stage loses hundreds of
  // survivors, and the simulation splices each one out when its window ends —
  // the renderer draws units, not corpses. So the last sixth of the window
  // fades the FALLEN body and sinks it a little into the road, which reads as
  // the road taking it rather than as a sprite being switched off. The body has
  // by then been lying still for 92 ms, which is the beat the owner was asking
  // for; what is deliberately not attempted is a corpse that outlives its unit.
  const q = (k - FADE_START) / (1 - FADE_START)
  STEP.alpha = 1 - q
  STEP.sink = 0.05 * q
  return STEP
}

// ─── Baking ─────────────────────────────────────────────────────────────────

interface IdleTime { timeRemaining: () => number }

const CACHE = new Map<string, HTMLCanvasElement[]>()
let queue: Outfit[] = []
let building: { o: Outfit; frames: HTMLCanvasElement[] } | null = null
let scheduled = false

/**
 * Frames baked per outfit: one stride, then the held poses of its fall.
 *
 * The fall rides the STRIDE's bake on purpose, rather than being baked on
 * demand the way a boss's death is (`monsterSprites.deathFrames`, asked for at
 * 80 % of the road). A boss dies once, minutes in, and its eight panels are
 * expensive; a survivor can die in the first two seconds of the first stage and
 * there are up to 190 of them. Baking the two poses with the strip means they
 * are ready exactly when the crowd is — the loading screen already waits for
 * `survivorsReady` — and nothing has to decide when to ask.
 */
const BAKED = FRAMES + DOWN_POSES.length

const bakeFrame = (o: Outfit, i: number): HTMLCanvasElement => {
  const c = document.createElement('canvas')
  c.width = PX
  c.height = PX
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.translate(PX / 2, PX * 0.52)
    const down = DOWN_POSES[i - FRAMES]
    if (down) drawSurvivorDown(ctx, S, DOWN_K[down], o)
    else drawSurvivor(ctx, S, (i / FRAMES) * HERO_CYCLE_MS, o)
  }
  return c
}

/**
 * Draw one frame of an outfit into a `w x h` panel at the context's origin.
 *
 * The art bench's way in: the reference sheet a painter works over goes through
 * the SAME transform `bakeFrame` uses, scaled to the panel, so a strip painted
 * over it drops straight back in with the feet on the same line.
 *
 * Not used at run time.
 */
export const paintSurvivorFrame = (
  ctx: CanvasRenderingContext2D,
  outfit: number, i: number, frames: number, w: number, h: number
): void => {
  const o = OUTFITS[Math.abs(outfit) % OUTFITS.length]
  if (!o) return
  ctx.save()
  ctx.translate(w / 2, h * 0.52)
  // The MIDDLE of each panel's slice of the cycle, not its start. A painted
  // strip shows panel `i` for the whole of [i/n, (i+1)/n), so its centre is
  // the honest sample — and, with the run's swing peaking between two of the
  // start-of-slice samples, sampling at the start put the boot's top in two
  // consecutive panels and the painter returned the same pose twice.
  drawSurvivor(ctx, S * (h / PX), ((i + 0.5) / frames) * HERO_CYCLE_MS, o)
  ctx.restore()
}

/** Wall-clock budget for one bake slice, in ms. */
const SLICE_MS = 6
/**
 * Frames baked per slice even when the budget is already spent.
 *
 * This constant is the whole fix for a real bug. The loop used to run
 * `while ((deadline?.timeRemaining() ?? 0) > 8)`, which looks like a sensible
 * idle-time budget and is a trap: when `requestIdleCallback` fires because its
 * TIMEOUT expired — which is what happens on a busy main thread, i.e. a
 * mid-range phone running this game — the spec says `timeRemaining()` returns
 * ZERO. So the loop baked exactly one frame per callback and re-armed. At
 * 3 outfits x 14 frames that is 42 timeouts: the crowd rendered as fallback
 * capsules for the better part of a minute, and only on devices that never get
 * idle slices. Desktop Chrome has idle time between frames, bakes the whole set
 * in one or two callbacks, and shows nothing wrong.
 *
 * So the slice is measured on the wall clock, and a minimum number of frames is
 * baked unconditionally — a timed-out callback must still make real progress.
 */
const MIN_PER_SLICE = 4

const nowMs = (): number =>
  (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now()

const pump = (deadline?: IdleTime): void => {
  scheduled = false
  const started = nowMs()
  let baked = 0

  for (;;) {
    if (!building) {
      const next = queue.shift()
      if (!next) return
      building = { o: next, frames: [] }
    }
    building.frames.push(bakeFrame(building.o, building.frames.length))
    baked++
    if (building.frames.length >= BAKED) {
      CACHE.set(building.o.id, building.frames)
      building = null
    }

    if (queue.length === 0 && !building) break
    // Always bake the minimum, then keep going only while there is genuine idle
    // time OR the wall-clock slice still has room.
    if (baked < MIN_PER_SLICE) continue
    if ((deadline?.timeRemaining() ?? 0) > 8) continue
    if (nowMs() - started < SLICE_MS) continue
    break
  }
  schedule()
}

const schedule = (): void => {
  if (scheduled || (queue.length === 0 && !building)) return
  scheduled = true
  const ric = (globalThis as { requestIdleCallback?: (cb: (d: IdleTime) => void, o?: { timeout: number }) => void })
    .requestIdleCallback
  // A SHORT timeout on purpose: on a main thread with no idle slices this is
  // the only cadence the bake gets, so it sets the worst-case finish time.
  if (typeof ric === 'function') ric(pump, { timeout: 300 })
  else setTimeout(() => pump(), 0)
}

/** Ask for the outfits to be baked. Cheap, idempotent, safe every frame. */
export const primeSurvivors = (opts: { fetch?: boolean } = {}): void => {
  for (const o of OUTFITS) {
    // The painted run cycle rides the same signal — see `primeMonsterSprites`.
    if (opts.fetch !== false) spriteFor('hero', o.id)
    if (CACHE.has(o.id) || queue.includes(o) || building?.o === o) continue
    queue.push(o)
  }
  schedule()
}

/**
 * Bake synchronously for up to `budgetMs`, then hand control back.
 *
 * For the LOADING SCREEN only. While the splash is up nothing else is animating,
 * so a fat slice is invisible — and it removes the bake's dependency on
 * `requestIdleCallback` cadence entirely, which is what makes the wait bounded by
 * CPU rather than by however rarely the browser hands out idle slots. Without it
 * a device that never goes idle bakes at the callback timeout's rate, and the
 * loader would sit on its cap instead of finishing.
 *
 * Do NOT call this once gameplay is running: that is what the sliced, idle-driven
 * `pump` is for.
 */
export const bakeSurvivorSlice = (budgetMs = 8): void => {
  const started = nowMs()
  while (queue.length > 0 || building) {
    if (!building) {
      const next = queue.shift()
      if (!next) return
      building = { o: next, frames: [] }
    }
    building.frames.push(bakeFrame(building.o, building.frames.length))
    if (building.frames.length >= BAKED) {
      CACHE.set(building.o.id, building.frames)
      building = null
    }
    if (nowMs() - started >= budgetMs) return
  }
}

/** True once every outfit's strip is baked — i.e. `survivorFrame` can no longer
 *  return null for a live unit and the crowd will never draw as capsules. The
 *  splash waits on this: the survivors are the only art on screen at t=0. */
export const survivorsReady = (): boolean => OUTFITS.every((o) => CACHE.has(o.id))

/** 0..1 across every outfit's strip, for the loading bar. */
export const survivorBakeProgress01 = (): number => {
  const total = OUTFITS.length * BAKED
  if (total === 0) return 1
  let done = 0
  for (const o of OUTFITS) done += CACHE.get(o.id)?.length ?? 0
  if (building) done += building.frames.length
  return Math.min(1, done / total)
}

/** The frame for an outfit at a normalised stride position, or `null` while it
 *  is still baking. */
export const survivorFrame = (outfit: number, cycle01: number): HTMLCanvasElement | null => {
  const o = OUTFITS[Math.abs(outfit) % OUTFITS.length]
  if (!o) return null
  const c01 = ((cycle01 % 1) + 1) % 1
  // Paint wins when it is there; both strips cover exactly one stride, so one
  // normalised position indexes either and the swap is seamless mid-step.
  const paint = stripFrame('hero', o.id, HERO_FRAME_ASPECT, c01)
  if (paint) return paint
  const frames = CACHE.get(o.id)
  if (!frames) return null
  const i = Math.floor(c01 * FRAMES) % FRAMES
  return frames[i] ?? null
}

// ─── The fall's own art ─────────────────────────────────────────────────────
//
// One sheet for the whole squad, not one per outfit: three outfits across by two
// poses down (`SURVIVOR_FALLS` in `artSheet.ts`). It is one painter's job rather
// than three, which is worth more than it sounds — the three survivors are the
// SAME person in three jackets, and three separate rolls came back as three
// people who fell differently.

/** The folder the painted fall lands in, and the id inside it. Held here rather
 *  than in the manifest because the manifest imports THIS module, and because
 *  the renderer must be able to probe for the sheet without loading the bench's
 *  half of the pipeline. */
export const DOWN_ART_KIND = 'hero' as const
export const DOWN_ART_ID = 'fallen'

/**
 * Which panel of the fall sheet a body needs: outfits across, poses down, read
 * the way the slicer cuts a grid (left to right, then the next row). The
 * renderer and the reference sheet read this one function, so the sheet can be
 * re-laid-out without the two disagreeing about which body is which.
 */
export const downPanelIndex = (outfit: number, pose: DownPose): number =>
  DOWN_POSES.indexOf(pose) * OUTFITS.length + (Math.abs(outfit) % OUTFITS.length)

/**
 * The resolved picture per panel — painted if the sheet is there, drawn if not.
 *
 * Cached because the alternative is a string key built and a map probed for
 * every dying body on every frame, and a wipe has 190 of them. Dropped whenever
 * the art layer changes, which is what lets a painting that decodes mid-run
 * replace the drawn body without the renderer knowing anything about probes.
 */
const DOWN_CACHE: (HTMLCanvasElement | null)[] = []
onArtChanged(() => { DOWN_CACHE.length = 0 })

/**
 * The body to blit for `outfit` in `pose`, or null while the strips still bake.
 *
 * Paint wins when it is there and a miss is silent — the same contract
 * `survivorFrame` keeps. What it must never do is return the WALK frame: a
 * running body rolled onto its side is exactly the shortcut the boss deaths
 * were rejected for, and the caller has the walk anyway.
 */
export const survivorDownFrame = (outfit: number, pose: DownPose): HTMLCanvasElement | null => {
  const i = downPanelIndex(outfit, pose)
  const hit = DOWN_CACHE[i]
  if (hit) return hit
  const painted = stripFrames(DOWN_ART_KIND, DOWN_ART_ID, HERO_FRAME_ASPECT)
  const paint = painted?.[i]
  if (paint) {
    DOWN_CACHE[i] = paint
    return paint
  }
  const o = OUTFITS[Math.abs(outfit) % OUTFITS.length]
  const drawn = o ? CACHE.get(o.id)?.[FRAMES + DOWN_POSES.indexOf(pose)] : null
  // Only a resolved frame is cached: a strip that has not finished baking must
  // be asked again next frame, and a painting may still be in flight.
  if (drawn) DOWN_CACHE[i] = drawn
  return drawn ?? null
}

/**
 * Draw one panel of the fall sheet's reference into a `w x h` box at the
 * context's origin — the bench's way in, exactly as `paintSurvivorFrame` is for
 * the stride, through the same transform the bake uses so a painting drops
 * straight back in with the ground line in the same place.
 *
 * Not used at run time.
 */
export const paintSurvivorDownPanel = (
  ctx: CanvasRenderingContext2D, outfit: number, pose: DownPose, w: number, h: number
): void => {
  const o = OUTFITS[Math.abs(outfit) % OUTFITS.length]
  if (!o) return
  ctx.save()
  ctx.translate(w / 2, h * 0.52)
  drawSurvivorDown(ctx, S * (h / PX), DOWN_K[pose], o)
  ctx.restore()
}

/** Body colour for an outfit — used by the fallback capsule and by particle
 *  debris, so a survivor who dies throws the right colour of dust. */
export const outfitTone = (outfit: number): CelTones => {
  const o = OUTFITS[Math.abs(outfit) % OUTFITS.length] ?? OUTFITS[0]!
  return tones(o.jacket, 1.05)
}
