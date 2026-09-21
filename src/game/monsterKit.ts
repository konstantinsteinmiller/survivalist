import {
  blob, shrink, densify, fillShape, ink, stroke, cel, terminator, noise2,
  type Pt, type CelTones
} from '@/game/inkArt'

/**
 * ─── Shared monster vocabulary ──────────────────────────────────────────────
 *
 * The parts every character is assembled from, and the constants they all obey.
 *
 * A cast reads as ONE cast because of agreement, not because of style words.
 * Ten creatures that each pick their own light direction, their own line
 * weights and their own tonal steps will look like ten unrelated drawings even
 * when every one of them is cel-shaded and hand-inked. So all of that lives
 * here and nothing below re-decides it:
 *
 *   * one key light (`SHADOW_DIR`) for the whole cast;
 *   * three line weights (`LINE`), never an arbitrary number;
 *   * three tone cuts at fixed depths (`SHADE` / `DEEP` / `LIT`);
 *   * one ink colour, and one palette ramp (`tones`, in `inkArt`).
 *
 * What a character IS allowed to choose: its silhouette, its base hues, its
 * asymmetries, and which of the shared parts it uses.
 */

export const INK = '#1c1418'

/**
 * The key light, up and to the left, for every character.
 *
 * Per-character lighting is a tell that nobody can name but everybody sees.
 */
export const SHADOW_DIR = 1.05

/**
 * Line-weight scale, in units of S.
 *
 * `major` is the silhouette of a primary form, `mid` a secondary part, `fine`
 * an interior edge, `hair` a detail line.
 */
export const LINE = { major: 0.05, mid: 0.034, fine: 0.022, hair: 0.013 } as const

/** Where the three tone cuts land, as a fraction of the form's radius. */
export const SHADE = 0.1
export const DEEP = 0.48
export const LIT = 0.58

export interface PaintOpts {
  /** Terminator offsets. `false` omits that band. */
  shade?: number
  deep?: number | false
  lit?: number | false
  /** Outline width in units of S; `false` leaves the form unlined. */
  line?: number | false
  inkColor?: string
  breakUp?: number
  /** Wobble of the terminator edge. Lower for hard surfaces. */
  amp?: number
}

/**
 * Paint one form — base, three tone cuts, outline — in a single call.
 *
 * Every part of every character goes through here. That is the enforcement
 * mechanism for everything the header promises; a part painted by hand would
 * silently drift from the rest of the cast.
 */
export const paint = (
  ctx: CanvasRenderingContext2D, S: number, shape: Pt[],
  t: CelTones, seed: number, o: PaintOpts = {}
): void => {
  const amp = o.amp ?? 0.14
  cel(ctx, shape, t, {
    shade: terminator(shape, SHADOW_DIR, o.shade ?? SHADE, amp, seed),
    deep: o.deep === false || !t.deep
      ? undefined
      : terminator(shape, SHADOW_DIR, o.deep ?? DEEP, amp * 0.8, seed + 1),
    lit: o.lit === false || !t.lit
      ? undefined
      : terminator(shape, SHADOW_DIR + Math.PI, o.lit ?? LIT, amp * 0.85, seed + 2)
  })
  if (o.line !== false) {
    ink(ctx, shape, {
      width: (o.line ?? LINE.mid) * S,
      color: o.inkColor ?? INK,
      seed: seed + 3,
      breakUp: o.breakUp ?? 0.26
    })
  }
}

// ─── Idle motion ────────────────────────────────────────────────────────────

/** Breathing / idle bob, in units of S. */
export const breathe = (t: number, speed = 1, amp = 0.012): number =>
  Math.sin(t / (900 / speed)) * amp

/** 0 = open, 1 = fully closed. Blinks are quick and rare, like real ones. */
export const blink = (t: number, offset = 0): number => {
  const period = 3400
  const p = ((t + offset) % period) / period
  if (p > 0.965) return Math.sin((p - 0.965) / 0.035 * Math.PI)
  return 0
}

// ─── Features ───────────────────────────────────────────────────────────────

export interface EyeOpts {
  /** Iris colour; omit for a flat dark eye. */
  iris?: string
  glow?: string
  pupil?: number
  /** 0 = wide, 1 = shut. */
  lid?: number
  /** Brow angle, radians. Positive slants inward-down (menacing). */
  brow?: number
  sclera?: string
  seed?: number
}

/**
 * A living eye.
 *
 * The catch-light is deliberately off-centre and NOT a circle: a symmetrical
 * dot in the middle of a pupil is the single thing that makes procedural faces
 * look dead.
 */
export const eye = (
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number, o: EyeOpts = {}
): void => {
  const seed = o.seed ?? 4
  const lid = o.lid ?? 0
  const open = Math.max(0.06, 1 - lid)

  const ball = blob(x, y, r, r * open, seed, 0.05)
  if (o.sclera !== 'none') {
    cel(ctx, ball, { base: o.sclera ?? '#fdf7e8', shade: '#cbbca4' }, {
      shade: terminator(ball, SHADOW_DIR, -0.1, 0.12, seed)
    })
  }
  if (o.iris) {
    const ir = r * 0.62
    const ix = x + r * 0.08
    const iy = y + r * 0.06 * open
    fillShape(ctx, blob(ix, iy, ir, ir * Math.max(0.12, open), seed + 2, 0.05), o.iris)
    if (o.glow) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, r * 2.4)
      g.addColorStop(0, o.glow)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(ix, iy, r * 2.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    const pr = ir * (o.pupil ?? 0.5)
    fillShape(ctx, blob(ix, iy, pr, pr * Math.max(0.12, open), seed + 3, 0.06), '#140e14')
  }
  if (open > 0.35) {
    fillShape(ctx, blob(x - r * 0.36, y - r * 0.38 * open, r * 0.26, r * 0.2 * open, seed + 5, 0.22), 'rgba(255,255,255,0.92)')
    fillShape(ctx, blob(x + r * 0.3, y + r * 0.3 * open, r * 0.11, r * 0.09 * open, seed + 6, 0.2), 'rgba(255,255,255,0.5)')
  }
  ink(ctx, ball, { width: r * 0.24, color: INK, seed, breakUp: 0.25 })

  if (o.brow !== undefined) {
    const bl = r * 1.5
    const by = y - r * (open * 1.05 + 0.25)
    const pts: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const k = i / 8
      pts.push([
        x - bl / 2 + bl * k,
        by + Math.sin(o.brow) * bl * (k - 0.5) - Math.cos(k * Math.PI) * r * 0.08
      ])
    }
    stroke(ctx, pts, r * 0.34, r * 0.14, INK, seed + 7)
  }
}

export interface SocketLight {
  /** Centre of the glow. */
  hot: string
  /** Mid ramp. */
  mid: string
  /** Outer falloff — must be fully transparent. */
  out: string
  /** The hard core burning inside. */
  core: string
}

export const SPORE_LIGHT: SocketLight = {
  hot: 'rgba(190,255,90,0.95)', mid: 'rgba(150,220,60,0.35)',
  out: 'rgba(120,200,40,0)', core: '#e6ff9c'
}
export const SOUL_LIGHT: SocketLight = {
  hot: 'rgba(150,235,255,0.95)', mid: 'rgba(70,190,255,0.4)',
  out: 'rgba(40,150,255,0)', core: '#bdf2ff'
}
export const EMBER_LIGHT: SocketLight = {
  hot: 'rgba(255,196,90,0.95)', mid: 'rgba(255,120,40,0.4)',
  out: 'rgba(220,70,20,0)', core: '#ffd98a'
}

/**
 * A hollow socket with something burning in it.
 *
 * Shared by every undead in the cast, so the three of them read as the same
 * KIND of dead. Only the hue changes between them; the ramp and the hard core
 * are identical, which is what makes the family legible at a glance.
 */
export const socket = (
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number,
  light: SocketLight, seed = 1, core = 0.38, lid = 0
): void => {
  const open = Math.max(0.08, 1 - lid)
  const hole = blob(x, y, r, r * 1.1 * open, seed, 0.1)
  fillShape(ctx, hole, '#1d1524')
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y + r * 0.2, 0, x, y + r * 0.2, r * 2.3)
  g.addColorStop(0, light.hot)
  g.addColorStop(0.42, light.mid)
  g.addColorStop(1, light.out)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y + r * 0.2, r * 2.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  if (open > 0.3) {
    fillShape(ctx, blob(x + r * 0.06, y + r * 0.14, r * core, r * core * 1.1 * open, seed + 1, 0.16), light.core)
  }
  ink(ctx, hole, { width: r * 0.3, color: INK, seed: seed + 2, breakUp: 0.2 })
}

/** A curved horn / tusk / claw: tapered, slightly hooked, never symmetrical. */
export const horn = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, len: number, thick: number,
  angle: number, curve: number, t: CelTones, seed = 9
): void => {
  const pts: Pt[] = []
  const n = 14
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const a = angle + curve * k * k
    pts.push([x + Math.cos(a) * len * k, y + Math.sin(a) * len * k])
  }
  const front: Pt[] = []
  const back: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const w = thick * (1 - k) ** 1.35 * (0.9 + noise2(i * 0.8, seed, seed) * 0.25)
    const p = pts[i]!
    const q = pts[Math.min(n, i + 1)]!
    const tx = q[0] - p[0]
    const ty = q[1] - p[1]
    const l = Math.hypot(tx, ty) || 1
    front.push([p[0] + (ty / l) * w, p[1] - (tx / l) * w])
    back.unshift([p[0] - (ty / l) * w, p[1] + (tx / l) * w])
  }
  const full = front.concat(back)
  cel(ctx, full, t, { shade: terminator(full, SHADOW_DIR, 0.0, 0.12, seed) })
  ink(ctx, full, { width: thick * 0.34, color: INK, seed, breakUp: 0.3 })
  // Growth rings — two or three, never evenly spaced.
  for (let i = 1; i <= 3; i++) {
    const k = i * 0.19 + noise2(i, seed + 2, seed) * 0.06
    const p = pts[Math.floor(k * n)]!
    const w = thick * (1 - k) ** 1.35
    stroke(ctx, [
      [p[0] - w * 0.8, p[1] - w * 0.3],
      [p[0] + w * 0.8, p[1] + w * 0.3]
    ], thick * 0.16, thick * 0.1, 'rgba(28,20,24,0.4)', seed + i)
  }
}

/**
 * A skeletal hand: carpals, four digits of two phalanges each, an opposed thumb.
 *
 * `grip` runs 0 (splayed claw) to 1 (closed around something).
 *
 * The previous hands were a fan of tapered strokes, which reads as a bundle of
 * twigs at anything above thumbnail size. What makes a hand a hand is the
 * KNUCKLES — the joint swellings between segments — and the thumb sitting on a
 * different axis from the fingers. Both are cheap; neither is optional.
 */
export const boneHand = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, len: number, angle: number,
  t: CelTones, seed = 1, grip = 0
): void => {
  const bleed = len * 0.055

  const phalanx = (a: Pt, bpt: Pt, w0: number, w1: number, sd: number): void => {
    stroke(ctx, [a, bpt], w0 + bleed, w1 + bleed, INK, sd)
    stroke(ctx, [a, bpt], w0, w1, t.base, sd)
    stroke(ctx, [
      [a[0] - w0 * 0.2, a[1] - w0 * 0.26],
      [bpt[0] - w1 * 0.2, bpt[1] - w1 * 0.26]
    ], w0 * 0.36, w1 * 0.3, t.lit ?? t.base, sd + 1)
  }

  const joint = (px: number, py: number, r: number, sd: number): void => {
    const k = blob(px, py, r, r * 0.92, sd, 0.16)
    fillShape(ctx, shrink(k, 1 + bleed / r, px, py), INK)
    cel(ctx, k, t, { shade: terminator(k, SHADOW_DIR, SHADE, 0.16, sd) })
  }

  // Carpals: a small wedge, wider across the knuckles than at the wrist.
  const pw = len * 0.3
  const palm = blob(x, y, pw, pw * 0.82, seed, 0.15)
  fillShape(ctx, shrink(palm, 1 + bleed / pw, x, y), INK)
  cel(ctx, palm, t, {
    shade: terminator(palm, SHADOW_DIR, SHADE, 0.16, seed),
    lit: t.lit ? terminator(palm, SHADOW_DIR + Math.PI, LIT, 0.14, seed + 1) : undefined
  })

  // Four digits, fanned. Ring and little finger are shorter; nothing matches.
  const fan = [-0.66, -0.23, 0.19, 0.58]
  const rel = [0.84, 1, 0.95, 0.74]
  for (let i = 0; i < 4; i++) {
    const spread = 1 - grip * 0.4
    const a0 = angle + fan[i]! * spread
    const l1 = len * 0.38 * rel[i]!
    const l2 = len * 0.3 * rel[i]!
    const bx = x + Math.cos(a0) * pw * 0.8
    const by = y + Math.sin(a0) * pw * 0.8
    const mx = bx + Math.cos(a0) * l1
    const my = by + Math.sin(a0) * l1
    // Curl happens at the middle joint, which is what "gripping" looks like.
    const a1 = a0 + grip * 1.55 + (noise2(i * 1.7, seed, seed) - 0.5) * 0.28
    const tx = mx + Math.cos(a1) * l2
    const ty = my + Math.sin(a1) * l2
    phalanx([bx, by], [mx, my], len * 0.105, len * 0.08, seed + 10 + i * 2)
    joint(mx, my, len * 0.058, seed + 30 + i)
    phalanx([mx, my], [tx, ty], len * 0.08, len * 0.028, seed + 50 + i * 2)
  }

  // Thumb: set back along the palm and on its own axis. Without the offset axis
  // it just reads as a fifth finger.
  const ta = angle - Math.PI * 0.55
  const bx = x + Math.cos(ta) * pw * 0.75
  const by = y + Math.sin(ta) * pw * 0.75
  const ta2 = ta + (0.75 + grip * 0.7)
  const mx = bx + Math.cos(ta2) * len * 0.26
  const my = by + Math.sin(ta2) * len * 0.26
  const ta3 = ta2 + 0.45 + grip * 0.8
  phalanx([bx, by], [mx, my], len * 0.11, len * 0.085, seed + 70)
  joint(mx, my, len * 0.055, seed + 72)
  phalanx([mx, my], [mx + Math.cos(ta3) * len * 0.2, my + Math.sin(ta3) * len * 0.2],
    len * 0.085, len * 0.03, seed + 74)
}

/**
 * A thin bone limb — two tapered segments meeting at a joint swelling.
 *
 * Used for every skeletal arm and leg in the cast, so they all articulate the
 * same way.
 */
export const boneLimb = (
  ctx: CanvasRenderingContext2D, a: Pt, mid: Pt, b: Pt,
  w: number, t: CelTones, seed = 1
): void => {
  const bleed = w * 0.32
  for (const [p, q, w0, w1, sd] of [
    [a, mid, w, w * 0.86, seed],
    [mid, b, w * 0.86, w * 0.74, seed + 2]
  ] as const) {
    stroke(ctx, [p, q], w0 + bleed, w1 + bleed, INK, sd)
    stroke(ctx, [p, q], w0, w1, t.base, sd)
    stroke(ctx, [[p[0] - w0 * 0.22, p[1] - w0 * 0.2], [q[0] - w1 * 0.22, q[1] - w1 * 0.2]],
      w0 * 0.34, w1 * 0.3, t.lit ?? t.base, sd + 1)
  }
  const k = blob(mid[0], mid[1], w * 0.72, w * 0.66, seed + 4, 0.16)
  fillShape(ctx, shrink(k, 1 + bleed / (w * 0.72), mid[0], mid[1]), INK)
  cel(ctx, k, t, { shade: terminator(k, SHADOW_DIR, SHADE, 0.16, seed + 4) })
}

/** A contact shadow, so nothing floats unintentionally. */
export const groundShadow = (
  ctx: CanvasRenderingContext2D, S: number, w: number, y = 1.02, a = 0.28
): void => {
  ctx.save()
  ctx.globalAlpha = a
  fillShape(ctx, blob(0, y * S, w * S, 0.1 * S, 21, 0.14), '#20141c')
  ctx.restore()
}

// ─── Locomotion ─────────────────────────────────────────────────────────────

/**
 * Walking is animated by MOVING parts, never by reshaping them.
 *
 * Every contour in this cast is generated from a seed and a handful of
 * constants. If `t` leaks into a seed, a radius or a wobble amplitude, the
 * silhouette boils from frame to frame — the body stops being the same body,
 * which is far more distracting than any stiffness in the gait. So the rule for
 * everything below is: the cycle produces TRANSLATIONS and JOINT ANGLES, and
 * the shapes they move are identical on every frame.
 */

/** Cycle position, 0..1. `offset` shifts one limb against another. */
export const gait = (t: number, periodMs: number, offset = 0): number =>
  (((t / periodMs + offset) % 1) + 1) % 1

/**
 * Where a foot sits relative to its neutral stance position.
 *
 * Stance takes `stance` of the cycle (60% for a walk) — planted, sliding
 * backwards at a CONSTANT rate, because the ground does not accelerate. Swing
 * takes the rest, lifted and eased forward. The uneven split is what separates
 * a walk from a scissor motion: feet spend noticeably longer down than up.
 *
 * A RUN inverts it: stance nearer 40%, so that with the two legs half a cycle
 * apart there is a moment when neither foot is down. That flight phase is the
 * whole difference between running and walking quickly.
 */
export const footStep = (phase: number, stride: number, lift: number, stance = 0.6): Pt => {
  const u = (((phase % 1) + 1) % 1)
  const swing = 1 - stance
  if (u < stance) {
    const k = u / stance
    return [stride * (0.5 - k), 0]
  }
  // Swing, as a cubic Hermite whose END TANGENTS MATCH the stance slide.
  //
  // Smoothstep was continuous in position but not in velocity: it has zero
  // slope at both ends, so the foot arrived at the plant already stationary
  // and then snapped to full ground speed in a single frame, and stopped dead
  // at toe-off. That discontinuity lands on exactly the two moments the eye is
  // watching the foot, and it is the classic "foot hitch". Matching tangents
  // lets the foot carry on backwards briefly as it lifts, then decelerate into
  // the plant.
  const k = (u - stance) / swing
  const k2 = k * k
  const k3 = k2 * k
  const m = -stride * (swing / stance)
  const x =
    (2 * k3 - 3 * k2 + 1) * (-0.5 * stride) +
    (k3 - 2 * k2 + k) * m +
    (-2 * k3 + 3 * k2) * (0.5 * stride) +
    (k3 - k2) * m
  return [x, -Math.sin(k * Math.PI) * lift]
}

/**
 * Vertical travel of the body over a cycle. Positive is DOWN, in canvas units.
 *
 * Two oscillations per cycle — the body dips once per footfall. A bob at leg
 * frequency reads as a limp.
 *
 * The phase matters and is easy to get wrong. Gait measurement puts the LOWEST
 * point at ~10% of the cycle (just after contact, during double support) and
 * the HIGHEST at ~35% (midstance, over the planted leg) — not at the contact
 * pose itself. Anchoring the dip to contact makes the character bounce on the
 * wrong beat, which reads as skipping rather than walking.
 *
 * Amplitude is the half-excursion. Measured human walking is ~2.5% of leg
 * length; stylised work runs 2–3× that, so ~4–5% of the hip-to-foot span here.
 */
export const bodyBob = (phase: number, amp: number): number =>
  amp * Math.cos(4 * Math.PI * (phase - 0.1))

/** Counter-swing for an arm or a head, at leg frequency. */
export const swing = (phase: number, amp: number): number =>
  Math.sin(phase * Math.PI * 2) * amp

/**
 * Lateral weight shift: which side the body has committed to, −1..1.
 *
 * ONE oscillation per cycle — half the bob's frequency, which is why a front
 * view reads as a slow roll under a faster bounce. It peaks over the planted
 * foot at ~30% of that foot's cycle, a quarter-cycle after its contact.
 *
 * A walk is a series of controlled falls: the body drops sideways onto the
 * landing leg and catches itself. Without the shift a front-view walk is two
 * legs pumping under a torso that never commits to either — the thing that
 * reads as marching in place. It is the single most-cited omission in bad
 * front-view walks.
 *
 * Counter-intuitively, sway DECREASES with speed while bob increases: heavy,
 * slow characters get more roll and less bounce.
 */
export const weightShift = (phase: number, amp: number): number =>
  Math.sin((phase - 0.05) * Math.PI * 2) * amp

/**
 * Pelvic obliquity for one hip, given ITS leg's phase. Positive is down.
 *
 * The pelvis tilts so the unsupported side drops — about 5° in a real walk.
 * Getting the sign backwards lifts the hip of the leg that is in the air,
 * which reads as a hitch.
 */
export const hipDrop = (phase: number, amp: number): number =>
  -Math.sin((phase - 0.05) * Math.PI * 2) * amp

/**
 * Knee position for a two-bone limb.
 *
 * Standard two-bone IK, with the reach clamped so the solution always exists.
 * A leg drawn through a FIXED mid-point stretches and snaps as the foot travels
 * — the most obvious artefact a procedural walk can have, and the reason this
 * is worth the trigonometry.
 */
export const ik = (hip: Pt, foot: Pt, l1: number, l2: number, bend = 1): Pt => {
  const dx = foot[0] - hip[0]
  const dy = foot[1] - hip[1]
  const raw = Math.hypot(dx, dy) || 1e-4
  const d = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min(raw, l1 + l2 - 1e-4))
  const ux = dx / raw
  const uy = dy / raw
  const a = (d * d + l1 * l1 - l2 * l2) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  return [hip[0] + ux * a - uy * h * bend, hip[1] + uy * a + ux * h * bend]
}

export interface LimbStyle {
  /** Width at the hip, in world units. */
  width: number
  /** Width at the foot as a fraction of `width`. */
  taper?: number
  /** Dark bleed drawn under the limb — thin bone needs it to hold an edge. */
  outline?: number
  /** Joint swelling radius as a fraction of `width`. 0 omits it. */
  joint?: number
}

/**
 * A two-bone limb solved to reach `foot`. Returns the knee, so a caller can
 * hang a greave or a knee spike off it.
 *
 * `bend` sets which side of the hip→foot line the knee falls on. For a leg
 * hanging straight down, **+1 puts the knee to the LEFT (−x) and −1 to the
 * right**. Use `-Math.sign(hipX)` to bulge knees outward, which is what a
 * front-facing biped needs: get the sign backwards and both knees swing across
 * the centre line, and the character walks with its legs crossed.
 *
 * **Sizing the bones matters as much as the sign.** The knee is thrown
 * sideways by `sqrt(l² − (d/2)²)` where `d` is the hip-to-foot distance, so
 * slack bones do not read as "relaxed" — they read as a zigzag. For a gentle,
 * natural bend of about `0.09` units, size each bone to
 * `sqrt(0.09² + (d/2)²)`, i.e. only a few percent longer than half the span.
 * Bones at `0.6 × d` throw the knee out by a quarter of the leg's length, which
 * is what makes procedural legs look broken even when the gait timing is right.
 */
export const limb = (
  ctx: CanvasRenderingContext2D, hip: Pt, foot: Pt,
  l1: number, l2: number, bend: number,
  t: CelTones, seed: number, style: LimbStyle
): Pt => {
  const knee = ik(hip, foot, l1, l2, bend)
  const w = style.width
  const taper = style.taper ?? 0.62
  const ol = style.outline ?? 0
  const mid = w * (1 + taper) / 2

  for (const [p, q, w0, w1, sd] of [
    [hip, knee, w, mid, seed],
    [knee, foot, mid, w * taper, seed + 2]
  ] as const) {
    if (ol > 0) stroke(ctx, [p, q], w0 + ol, w1 + ol, INK, sd)
    stroke(ctx, [p, q], w0, w1, t.base, sd)
    stroke(ctx, [
      [p[0] - w0 * 0.22, p[1] - w0 * 0.2],
      [q[0] - w1 * 0.22, q[1] - w1 * 0.2]
    ], w0 * 0.34, w1 * 0.3, t.lit ?? t.base, sd + 1)
  }

  const jr = (style.joint ?? 0.6) * w
  if (jr > 0) {
    const k = blob(knee[0], knee[1], jr, jr * 0.92, seed + 4, 0.16)
    if (ol > 0) fillShape(ctx, shrink(k, 1 + ol / jr, knee[0], knee[1]), INK)
    cel(ctx, k, t, { shade: terminator(k, SHADOW_DIR, SHADE, 0.16, seed + 4) })
  }
  return knee
}

/**
 * A foot: a pad with toes fanned along `dir`.
 *
 * A limb that ends in a point reads as a stilt. Whatever else a character has,
 * something has to sit ON the ground.
 */
export const clawFoot = (
  ctx: CanvasRenderingContext2D, x: number, y: number, size: number,
  dir: number, t: CelTones, seed: number, toes = 3, claw = '#f0e6d0'
): void => {
  const cx = x + Math.cos(dir) * size * 0.18
  const pad = blob(cx, y - size * 0.1, size * 0.52, size * 0.34, seed, 0.16)
  for (let i = 0; i < toes; i++) {
    const a = dir + ((i - (toes - 1) / 2) / Math.max(1, toes - 1)) * 1.1
    const tip: Pt = [cx + Math.cos(a) * size * 0.9, y + Math.abs(Math.sin(a)) * size * 0.12]
    stroke(ctx, [[cx, y - size * 0.06], tip], size * 0.28, size * 0.13, t.base, seed + 10 + i)
    stroke(ctx, [tip, [tip[0] + Math.cos(a) * size * 0.26, tip[1] + size * 0.06]],
      size * 0.12, size * 0.02, claw, seed + 20 + i)
  }
  cel(ctx, pad, t, { shade: terminator(pad, SHADOW_DIR, SHADE, 0.16, seed + 1) })
  ink(ctx, pad, { width: size * 0.14, color: INK, seed: seed + 2, breakUp: 0.3 })
}

/** A point on a contour, with the outward normal there. */
export interface OnContour { p: Pt; n: Pt }

/**
 * Sample positions and outward normals along part of a contour.
 *
 * Anything that grows out of a body — spines, bristles, flames, fur, feathers —
 * has to be anchored to the silhouette. Laying such things out along a straight
 * line and hoping it tracks the back is what leaves them floating off the form,
 * or worse, sunk inside it: the line and the contour diverge the moment the
 * body curves, and they diverge differently on every frame of a walk.
 *
 * The winding is detected rather than assumed. `blob` runs one way round and an
 * authored polygon may run the other; a hard-coded normal formula silently
 * points INWARD for half the shapes in the cast, which is a bug that looks like
 * an art problem.
 *
 * `from`/`to` are normalised positions around the contour.
 */
export const contourPoints = (
  pts: Pt[], from: number, to: number, count: number
): OnContour[] => {
  const dense = densify(pts, 6)
  const n = dense.length
  // Shoelace sign tells us which way this contour is wound.
  let area = 0
  for (let i = 0; i < n; i++) {
    const a = dense[i]!
    const b = dense[(i + 1) % n]!
    area += a[0] * b[1] - b[0] * a[1]
  }
  const flip = area > 0 ? 1 : -1

  const out: OnContour[] = []
  for (let i = 0; i < count; i++) {
    const u = from + (to - from) * ((i + 0.5) / count)
    const idx = Math.round((((u % 1) + 1) % 1) * n) % n
    const prev = dense[(idx - 3 + n) % n]!
    const next = dense[(idx + 3) % n]!
    const tx = next[0] - prev[0]
    const ty = next[1] - prev[1]
    const l = Math.hypot(tx, ty) || 1
    out.push({ p: dense[idx]!, n: [(ty / l) * flip, (-tx / l) * flip] })
  }
  return out
}

/** Spikes, bristles or quills placed ON a contour and aimed along its normal. */
export const spines = (
  ctx: CanvasRenderingContext2D, pts: Pt[],
  from: number, to: number, count: number,
  len: number, width: number, color: (i: number) => string,
  seed: number, jitter = 0.45, sink = 0.25
): void => {
  contourPoints(pts, from, to, count).forEach(({ p, n }, i) => {
    const [nx, ny] = n
    const h = len * (0.55 + noise2(i * 1.9, seed, seed) * 0.85)
    const lean = (noise2(i * 2.7, seed + 3, seed) - 0.5) * jitter
    // Root the base slightly INSIDE the body, so no spine shows daylight under
    // it when the contour wobbles.
    stroke(ctx, [
      [p[0] - nx * width * sink, p[1] - ny * width * sink],
      [p[0] + (nx - lean * ny) * h, p[1] + (ny + lean * nx) * h]
    ], width, width * 0.1, color(i), seed + i)
  })
}

/**
 * Rigidly transform authored points into world space.
 *
 * Mirroring here rather than with `ctx.scale(-1, 1)` matters: a mirrored canvas
 * also mirrors the shading, so a left wing ends up lit from the right and the
 * cast's shared key light breaks on exactly the characters where it shows most.
 */
export const pivot = (pts: Pt[], cx: number, cy: number, a: number, mirror = 1): Pt[] =>
  pts.map(([x, y]) => {
    const lx = x * mirror
    return [
      cx + lx * Math.cos(a) - y * Math.sin(a),
      cy + lx * Math.sin(a) + y * Math.cos(a)
    ] as Pt
  })

// ─── Dying ──────────────────────────────────────────────────────────────────
//
// A boss's death, DRAWN — the joints move, the body goes down, and what is left
// lies on the road with its arms spread. It replaced a walk frame rolled over
// by ninety degrees, which read as exactly that: a standing creature, turned on
// its side. The same drawing is the reference the painted death strips are
// painted over (`artSheet.BOSS_DEATHS`) and the in-game fallback until they
// exist (`monsterSprites.deathFrames`), so all three agree about the pose.
//
// It keeps the cast's one animation rule: parts MOVE, shapes never change. A
// dying creature is its own walking body with different joint targets and one
// transform over the whole of it.
//
// Every design reads the death through `dyingAt()` rather than a new argument,
// so a `draw(ctx, S, t)` that has not learned to die simply draws its walk.

let dyingK: number | null = null

/** Draw `fn` as the death at `k`: 0 is the killing blow, 1 the body lying still. */
export const drawDeath = (k: number, fn: () => void): void => {
  const prev = dyingK
  dyingK = Math.max(0, Math.min(1, k))
  try { fn() } finally { dyingK = prev }
}

/** The death being drawn right now, or `null` for the living cycle. */
export const dyingAt = (): number | null => dyingK

/**
 * Which way an upright body goes over, as drawn: to the panel's LEFT. One side
 * for the whole front-on cast, so the painted strips and the goo under them
 * agree without a per-design table (`monsterSprites.deathFallSide`).
 */
export const UPRIGHT_FALL = -1 as const

const seg = (k: number, a: number, b: number): number => Math.max(0, Math.min(1, (k - a) / (b - a)))
/** How far `k` is through the stretch `a..b` of a death, clamped 0..1 — for a
 *  design's own beat (a dropped sword, a last spark) timed against the shared ones. */
export const deathSpan = seg
const easeOut = (x: number): number => 1 - (1 - x) ** 3
const smooth = (x: number): number => x * x * (3 - 2 * x)
const mix = (a: number, b: number, w: number): number => a + (b - a) * w

/**
 * The beats of a death, each 0..1, timed so eight evenly spaced panels land on
 * the eight moments the prompt names: the blow, the stagger, the knees going,
 * the fall, the impact, the bounce, the settling and the body.
 */
export interface DeathBeats {
  k: number
  /** The blow's recoil — full at the first panel, gone by the third. */
  recoil: number
  /** Knees giving way. */
  buckle: number
  /** Going over onto the ground. */
  fall: number
  /** The rebound off the ground, up and back down. */
  bounce: number
  /** Limbs coming to rest where they landed. */
  settle: number
  /** The light going out: eyes shutting, glow dimming, limbs slack. */
  lifeless: number
}

export const deathBeats = (k: number): DeathBeats => ({
  k,
  recoil: 1 - easeOut(seg(k, 0, 0.3)),
  buckle: easeOut(seg(k, 0.08, 0.36)),
  fall: smooth(seg(k, 0.28, 0.6)),
  bounce: Math.sin(Math.PI * seg(k, 0.6, 0.82)),
  settle: easeOut(seg(k, 0.7, 1)),
  lifeless: easeOut(seg(k, 0.5, 0.95))
})

/**
 * Where a hand goes, from its shoulder, and where the elbow bends.
 *
 * The angle is measured from hanging straight down, outward positive: 0 is
 * hanging, π/2 straight out to the side, π straight up. Flung up and out at the
 * blow; windmilling through the stagger, the two arms half a swing apart so one
 * is always up while the other is down; thrown wide as the body goes over; and
 * spread flat on the ground at the end — NOT a matched pair, because a body
 * that lands symmetrical reads as posed.
 *
 * The rest angles are for a body that went over to `UPRIGHT_FALL`: the arm on
 * that side lands flung down toward the feet, the other up past the shoulder,
 * so once the body lies on its diagonal one points down the screen and one up
 * it — and neither lies hidden under the head.
 */
export const deathArm = (
  D: DeathBeats, side: -1 | 1, reach: number
): { hand: Pt; elbow: Pt; open: number } => {
  // Up and OUT rather than overhead: an arm flung straight up disappears behind
  // the head on half the cast, and the blow has to read on the first panel.
  const flung = side > 0 ? 2.15 : 1.95
  const wind = seg(D.k, 0.04, 0.42)
  const flail = 1.45 + 0.8 * Math.sin(Math.PI * 2 * wind * 1.2 + (side > 0 ? 0 : Math.PI))
  const under = side === UPRIGHT_FALL
  const spread = under ? 1.05 : 1.8
  let a = mix(flung, flail, easeOut(seg(D.k, 0.02, 0.2)))
  a = mix(a, spread, D.fall)
  // The slap: arms bounce up off the road with the body, then lie flat.
  a += 0.22 * D.bounce * (under ? -0.6 : 1)
  // `reach` is the arm's whole length, shoulder to wrist, and the bones keep it
  // — thrown out nearly straight, crooked as the knees go, lying almost
  // straight once it is limp. The hand's distance picks the elbow, as IK does.
  const r = reach * (0.94 - 0.2 * D.buckle * (1 - D.fall) + 0.04 * D.settle)
  const hand: Pt = [side * Math.sin(a) * r, Math.cos(a) * r]
  // Elbows bend toward the ground: the perpendicular that points down.
  let px = -hand[1]
  let py = hand[0]
  if (py < 0) { px = -px; py = -py }
  const l = Math.hypot(px, py) || 1
  const bend = Math.sqrt(Math.max(0, (reach / 2) ** 2 - (r / 2) ** 2))
  const elbow: Pt = [hand[0] / 2 + (px / l) * bend, hand[1] / 2 + (py / l) * bend]
  return { hand, elbow, open: Math.max(D.lifeless, 0.35 * D.recoil) }
}

/** The angle a hand points along its forearm — for a hand drawn as its own part. */
export const deathHandAngle = (A: { hand: Pt; elbow: Pt }): number =>
  Math.atan2(A.hand[1] - A.elbow[1], A.hand[0] - A.elbow[0])

/**
 * Where a leg's foot goes, from where it stood, and how far the hip drops.
 * The knees give (the hip drops and the limb's own IK buckles it outward), then
 * the legs splay on the road; the bounce lifts the feet for a frame.
 */
export const deathLeg = (D: DeathBeats, side: -1 | 1, S: number): { foot: Pt; hipDrop: number } => ({
  // Splayed wide in a V once it is down — a body lying with its feet together
  // is a body lying to attention.
  foot: [side * (0.08 * D.buckle + 0.26 * D.fall) * S, (0.06 * D.fall - 0.07 * D.bounce) * S],
  // Gone again once it is down: lying, the legs are straight, and a drop left
  // in would slide the whole upper body down its own length, off its shadow.
  hipDrop: (0.22 * D.buckle * (1 - D.fall)) * S
})

/** The head's roll on its neck, radians: snapped back by the blow, then
 *  dropping on over the way the body fell as the light goes — limp, and at an
 *  angle no living neck holds. */
export const deathLoll = (D: DeathBeats, lean: -1 | 1 = UPRIGHT_FALL): number =>
  -lean * 0.22 * D.recoil + lean * (0.14 * D.buckle + 0.32 * D.lifeless)

/** How shut the eyes are: open with the blow, closing as the light goes out. */
export const deathLid = (D: DeathBeats, living = 0): number => Math.max(living, D.lifeless)

/** How far a lying body's middle comes to rest above the feet line, in S —
 *  enough that the limbs it lands on fit above the panel's bottom edge. */
export const LYING_REST = 0.62

/** How much the ground foreshortens a body lying on it, as a height factor. */
const LYING_FLAT = 0.6

/**
 * An UPRIGHT body going down — the whole figure.
 *
 * A stagger first: it rocks on its feet under the blow and back while the knees
 * go. Then it goes over sideways and lands on its BACK, lying on a diagonal
 * across the ground it stood on — the legs kicked out from under it, so it
 * turns about its middle rather than about its feet, which is also what keeps
 * the body inside the spot it died on rather than beside it. Lying down, it is
 * seen the way the ground is: foreshortened, flatter than it is long.
 *
 * That flattening is what makes it LIE rather than float: the old corpse was
 * the walk frame turned ninety degrees and read as a standing creature on its
 * side. The limbs are the other half — spread out by `deathArm`/`deathLeg`.
 *
 * `mid` is the middle of the body in the drawing's units (feet at +1), and
 * `rest` how far above the feet line that middle comes to lie — higher for a
 * body whose limbs reach far. Applies to `ctx`; call between a save and a
 * restore, before the body.
 */
export const fallOntoBack = (
  ctx: CanvasRenderingContext2D, S: number, D: DeathBeats,
  lean: -1 | 1 = UPRIGHT_FALL, mid = 0, rest = LYING_REST, feet = 1.0
): void => {
  const rock = lean * Math.sin(Math.PI * 2 * seg(D.k, 0.04, 0.44)) * 0.13 * (1 - D.fall)
  const lie = D.fall * (1 - 0.12 * D.bounce)
  // Short of a quarter turn, so it lies askew: square across the road reads as
  // laid out, and a diagonal as dropped.
  const tip = lean * 1.0 * lie
  const drop = feet - rest - mid
  ctx.translate(0, (mid + drop * D.fall) * S)
  ctx.scale(1, 1 - (1 - LYING_FLAT) * lie)
  ctx.rotate(tip)
  ctx.translate(0, (feet - mid) * S)
  ctx.rotate(rock)
  // The blow jolts it up onto its toes for a moment — stretched about the
  // feet, which stay planted, and only a little, since the tallest of the cast
  // already fill their frames.
  ctx.scale(1, 1 + 0.03 * D.recoil)
  ctx.translate(0, -feet * S)
}

/** How far a side-on body's middle comes to rest above the feet line, in S —
 *  low, with room under it for the legs it lies with stretched out. */
export const FLANK_REST = 0.42

/**
 * A SIDE-ON body going down — rears at the blow, pitches onto its knees as the
 * front legs go, then keels over onto its far flank.
 *
 * Lying on its flank, its side faces the sky, so the camera sees the whole
 * profile laid flat on the road: squashed toward its own middle rather than
 * toward its feet, with the middle brought right down to the ground. What
 * makes it read as DOWN rather than resting is the legs — stretched out stiff
 * (`deathFlankFoot`), where a resting animal tucks them under.
 *
 * `headDir` is the side the head is drawn on (−1 left), `mid` the middle of
 * the body and `hind` how far behind the middle the hind feet stand, which is
 * what it rears up about.
 */
export const fallOntoFlank = (
  ctx: CanvasRenderingContext2D, S: number, D: DeathBeats, headDir: -1 | 1,
  mid = 0.4, hind = 0.35, ground = 1.0
): void => {
  // Positive turns the head end UP when the head is drawn on the left.
  const pitch = -headDir * 0.2 * D.recoil + headDir * (0.14 * D.buckle * (1 - D.fall) + 0.09 * D.fall)
  const lie = D.fall * (1 - 0.14 * D.bounce)
  const px = -headDir * hind * S
  ctx.translate(0, (mid + (ground - FLANK_REST - mid) * D.fall) * S)
  ctx.scale(1, 1 - (1 - LYING_FLAT) * lie)
  ctx.translate(0, -mid * S)
  ctx.translate(px, ground * S)
  ctx.rotate(pitch)
  ctx.translate(-px, -ground * S)
}

/**
 * Where a side-on leg's foot goes while dying: lifted as the knee folds, then
 * thrown out STRAIGHT at full length — the front legs forward, the hind legs
 * back — and the whole leg kicks on the bounce. `len` is the leg's length hip
 * to foot and `splay` spreads a far leg from its near twin, so the pair does
 * not lie as one.
 */
export const deathFlankFoot = (
  D: DeathBeats, hip: Pt, stood: Pt, len: number, front: boolean, headDir: -1 | 1, splay = 0
): Pt => {
  const dir = front ? headDir : -headDir
  // Well out past the body's own outline: a leg that stays under the belly is
  // a beast lying down to rest.
  const a = (front ? 1.08 : 0.98) + splay
  const reach = len * 0.98
  const stiff: Pt = [hip[0] + dir * Math.sin(a) * reach, hip[1] + Math.cos(a) * reach]
  const fold = -0.3 * len * D.buckle * (1 - D.fall)
  return [mix(stood[0], stiff[0], D.fall), mix(stood[1] + fold, stiff[1], D.fall) - 0.1 * len * D.bounce]
}

/**
 * The shadow a dying body throws: from under its feet to under all of it. For
 * an upright body (`lean` given) it follows the corpse onto its diagonal; a
 * side-on one (`lean` 0) just spreads along the ground where it lies.
 */
export const deathShadow = (
  ctx: CanvasRenderingContext2D, S: number, D: DeathBeats, w: number,
  lean: -1 | 0 | 1 = UPRIGHT_FALL, y = 1.02, a = 0.28, lying = LYING_REST
): void => {
  ctx.save()
  ctx.globalAlpha = a * (1 + 0.3 * D.fall)
  // Under the middle of the corpse (`fallOntoBack` rests it `lying` above the
  // feet line, `fallOntoFlank` FLANK_REST), a touch toward the camera as a
  // shadow on the ground is.
  const rest = lean ? lying - 0.05 : FLANK_REST - 0.12
  const cy = (y - (y - 1 + rest) * D.fall) * S
  ctx.translate(0, cy)
  ctx.rotate(-lean * 0.36 * D.fall)
  fillShape(ctx, blob(0, 0, (w + (lean ? 0.6 : 0.2) * D.fall) * S, (0.1 + (lean ? 0.26 : 0.1) * D.fall) * S, 21, 0.14), '#20141c')
  ctx.restore()
}

// ─── Hurling ────────────────────────────────────────────────────────────────
//
// The meteor, THROWN — by the arms. The first version of the throw was the
// walk frame reared back and snapped forward with a squash and a stretch, and
// the owner read it, correctly, as the boss being distorted rather than doing
// anything: nothing that throws a rock throws it with its whole body going
// rubber. So the hurl is drawn by the rigs the way the death is: the same
// body, the throwing arm scooping the rock up, cocking it back over the
// shoulder, whipping it over the top and following through across the body,
// while the other arm points the way and the hips carry the weight across.
//
// The drawing is the reference the painted hurl strips are painted over
// (`artSheet.BOSS_HURLS`) and the game's own throw until they exist
// (`monsterSprites.monsterHurlFrame`). The rock is NOT part of it: the renderer
// draws the burning rock into the hand (`hurlGrip` says where the hand is), so
// it can grow while it is gathered and leave from exactly where it was held.
//
// Parts move, shapes never change — the death's rule, for the same reason.

let hurlKv: number | null = null
/** Where the throwing hand was in the hurl being drawn, in the CANVAS's own
 *  pixels (the transform applied), or null when the design never said. */
let gripAt: Pt | null = null

/**
 * Draw `fn` as the hurl at `k`: 0 standing ready, 1 back at rest after the
 * follow-through. Returns where the throwing hand's palm was drawn, canvas
 * pixels — the point the rock sits on — or null for a design that has not
 * learned to throw.
 */
export const drawHurl = (k: number, fn: () => void): Pt | null => {
  const prev = hurlKv
  const prevGrip = gripAt
  hurlKv = Math.max(0, Math.min(1, k))
  gripAt = null
  try {
    fn()
    return gripAt
  } finally {
    hurlKv = prev
    gripAt = prevGrip
  }
}

/** The hurl being drawn right now, or `null` for the living cycle. */
export const hurlingAt = (): number | null => hurlKv

/**
 * Report where the throwing hand's PALM is — the point the rock sits on — in
 * the design's own drawing units. Mapped through the context's current
 * transform, so a design may call it from inside any number of saves.
 */
export const hurlGrip = (ctx: CanvasRenderingContext2D, x: number, y: number): void => {
  if (hurlKv === null) return
  const m = ctx.getTransform()
  gripAt = [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
}

/**
 * The eight moments of a throw, one per panel of the strip (`k = i / 7`). The
 * prompt's `HURL_POSES` names them in the same order; a line that stops
 * matching its panel is a line to fix there.
 */
export const HURL_KEYS = 8
/** The panel the rock leaves the hand on. The renderer plays the gather up to
 *  it and lets the rock go on it (`HURL_RELEASE_K`). */
export const HURL_RELEASE_PANEL = 4
export const HURL_RELEASE_K = HURL_RELEASE_PANEL / (HURL_KEYS - 1)

/**
 * The throwing hand, relative to its shoulder, one per panel, in ARM LENGTHS:
 * x outward on the throwing side, y down the screen.
 *
 * Drawn front-on, a throw toward the camera is mostly up-and-over and then
 * down across the body — the forward part of it is foreshortened away, so
 * what has to read is the arm going UP behind the head and coming DOWN across
 * the front.
 */
const THROW_HAND: readonly Pt[] = [
  [0.3, 0.9], // ready — hanging, a little out
  [0.8, 0.4], // scoop — swung out and low, palm up, the rock forming in it
  [0.88, -0.3], // rising — out and up past the shoulder
  [0.44, -0.74], // cocked — elbow high, the rock held back over the shoulder
  [0.02, -0.97], // release — whipped straight up and over the top
  [-0.6, 0.5], // follow-through — swept down across the body to the far hip
  [-0.1, 0.86], // recovering
  [0.3, 0.9] // at rest
]
/**
 * The other hand: out low for balance. Never POINTING — a pointing arm is the
 * gesture an image model paints first, and both painted throws that were
 * given one swapped the arms for it, raising the wrong hand on the cock.
 */
const OFF_HAND: readonly Pt[] = [
  [0.3, 0.9],
  [0.55, 0.72],
  [0.55, 0.74],
  [0.5, 0.8], // hanging out low, bracing the throw
  [0.4, 0.62], // yanked down as the throw comes over
  [0.62, 0.6],
  [0.42, 0.84],
  [0.3, 0.9]
]
/** How open the throwing hand is, 0 closed round the rock → 1 splayed. */
const THROW_OPEN: readonly number[] = [0.3, 0.55, 0.3, 0.15, 0.95, 0.9, 0.5, 0.3]
/** Tilt above the hips, radians, head toward the THROWING side positive —
 *  back over the throwing leg on the cock, across onto the other one through
 *  the release. */
const TILT: readonly number[] = [0, 0.1, 0.08, 0.2, -0.08, -0.24, -0.1, 0]
/** How far the hips sink, in S — into the scoop and into the follow-through. */
const CROUCH: readonly number[] = [0, 0.07, 0.03, 0.02, 0.04, 0.09, 0.04, 0]
/** The stance, in S: the throwing foot braced out wide, the other foot
 *  striding across into the release. */
const PLANT: readonly number[] = [0, 0.04, 0.05, 0.07, 0.07, 0.06, 0.03, 0]
const STRIDE: readonly number[] = [0, 0.02, 0.04, 0.07, 0.1, 0.1, 0.05, 0]
/** How far the throwing heel comes up on the follow-through, in S. */
const HEEL: readonly number[] = [0, 0, 0, 0, 0.02, 0.05, 0.02, 0]

/** A track at `k`, linear between panels — only the panels are ever shown.
 *  Exported for a design with a joint of its own to key (a treant's bough). */
export const hurlTrack = (keys: readonly number[], k: number): number => {
  const x = Math.max(0, Math.min(1, k)) * (keys.length - 1)
  const i = Math.min(keys.length - 2, Math.floor(x))
  return mix(keys[i]!, keys[i + 1]!, x - i)
}
const track = hurlTrack
const trackPt = (keys: readonly Pt[], k: number): Pt => {
  const x = Math.max(0, Math.min(1, k)) * (keys.length - 1)
  const i = Math.min(keys.length - 2, Math.floor(x))
  const a = keys[i]!
  const b = keys[i + 1]!
  return [mix(a[0], b[0], x - i), mix(a[1], b[1], x - i)]
}

export interface HurlBeats {
  k: number
  /** Which arm throws, as drawn: −1 the panel's left, +1 its right — the one
   *  whose hand is free. Fixed per design. */
  side: -1 | 1
  /** Tilt above the hips, radians, canvas sense (positive clockwise). */
  tilt: number
  /** How far the hips sink, in S. */
  crouch: number
  /** 0..1, how hard the body is working: 0 at rest, 1 through the release. */
  effort: number
}

/**
 * ─── …and the one boss that breathes instead of throwing ────────────────────
 *
 * The wyrm's big attack is a jet of fire swept across the road, and it plays in
 * the same slot a throw does — in place of the walk, on the cast's own clock,
 * eight keys to eight panels (`BREATH_POSES` names them, in this order). It
 * rides `drawHurl`/`hurlingAt` rather than a second latch of its own, because a
 * body has exactly one big attack animation and nothing needs to ask which.
 *
 * Every track below is per-PANEL, so the drawing and the words cannot drift:
 * panel 3 is the top of the draw in both, panel 6 is the middle of the sweep in
 * both, and a line changed here without its line in `BREATH_POSES` is a sheet
 * that comes back painted as something else.
 */
export interface BreathBeats {
  k: number
  /** Neck curled back and up over the shoulders, 0..1 — drawing the breath. */
  draw: number
  /** The head's travel across the road: 0 where the jet starts, 1 where it
   *  ends. Only meaningful once the jaws are open. */
  sweep: number
  /** How far the jaws are open, 0..1. */
  gape: number
  /** The throat lit from inside while the breath is drawn — and only then. */
  throat: number
  /** How hard the wings are working to hold the turn, 0..1. */
  effort: number
}

/** The eight moments of a breath, one per panel of the strip (`k = i / 7`). */
export const BREATH_KEYS = 8

export const breathBeats = (k: number): BreathBeats => ({
  k,
  draw: track([0, 0.62, 1, 0.5, 0.16, 0.04, 0, 0], k),
  sweep: track([0, 0, 0, 0.06, 0.42, 0.76, 1, 0.42], k),
  gape: track([0, 0.45, 1, 1, 1, 0.94, 0.4, 0], k),
  throat: track([0, 0.6, 1, 0.3, 0, 0, 0, 0], k),
  effort: track([0, 0.55, 0.9, 1, 1, 0.85, 0.4, 0], k)
})

export const hurlBeats = (k: number, side: -1 | 1): HurlBeats => ({
  k,
  side,
  // Canvas `rotate(θ)` carries a point above the pivot toward +x for θ > 0,
  // so leaning the head toward the throwing side is a rotation of its sign.
  tilt: side * track(TILT, k),
  crouch: track(CROUCH, k),
  effort: track([0, 0.4, 0.7, 1, 1, 0.7, 0.3, 0], k)
})

/**
 * Where a hand goes from its shoulder, and where the elbow bends — the hurl's
 * `deathArm`. `side` is which side of the body this arm hangs on; the arm on
 * the hurl's own side is the throwing arm.
 *
 * The elbow bends OUTWARD, away from the body: a thrower's elbow is high and
 * out on the cock and out and down on the follow-through, and an elbow folded
 * in across the chest reads as a hug.
 */
export const hurlArm = (
  H: HurlBeats, side: -1 | 1, reach: number, keys?: readonly Pt[]
): { hand: Pt; elbow: Pt; open: number; throwing: boolean } => {
  const throwing = side === H.side
  const p = trackPt(throwing ? keys ?? THROW_HAND : OFF_HAND, H.k)
  const hand: Pt = [side * p[0] * reach, p[1] * reach]
  const d = Math.min(reach * 0.999, Math.hypot(hand[0], hand[1]) || 1e-4)
  const ux = hand[0] / d
  const uy = hand[1] / d
  // Of the two perpendiculars: for the throwing arm the one pointing away from
  // the body's middle (outward on this arm's side; on a tie, down). The other
  // arm's elbow always bends DOWN — bent up and out it reads as a second raised
  // arm, and painters raised it in place of the throwing one.
  let px = -uy
  let py = ux
  if (throwing
    ? px * side < -1e-3 || (Math.abs(px) <= 1e-3 && py < 0)
    : py < 0) { px = -px; py = -py }
  const bend = Math.sqrt(Math.max(0, (reach / 2) ** 2 - (d / 2) ** 2))
  const elbow: Pt = [hand[0] / 2 + px * bend, hand[1] / 2 + py * bend]
  return { hand, elbow, open: throwing ? track(THROW_OPEN, H.k) : 0.6, throwing }
}

/** The angle a hand points along its forearm — for a hand drawn as its own part. */
export const hurlHandAngle = (A: { hand: Pt; elbow: Pt }): number =>
  Math.atan2(A.hand[1] - A.elbow[1], A.hand[0] - A.elbow[0])

/**
 * Where a foot goes during the throw, as an offset from where it stands, in
 * drawing units: the throwing-side foot braced out wide with its heel lifting
 * on the follow-through, the other foot striding across.
 */
export const hurlLeg = (H: HurlBeats, side: -1 | 1, S: number): Pt => {
  const throwing = side === H.side
  const out = throwing ? track(PLANT, H.k) : track(STRIDE, H.k)
  return [side * out * S, -(throwing ? track(HEEL, H.k) : 0) * S]
}

/**
 * Tilt everything drawn after this about the hips at `hip` (drawing units) —
 * torso, arms and head. The crouch is NOT applied here: a design sinks its own
 * hips by it, so the legs under them bend at the knee rather than the whole
 * body sliding down its own feet. Call after the legs; the design's closing
 * restore takes it off.
 */
export const hurlTorso = (ctx: CanvasRenderingContext2D, H: HurlBeats, hip: Pt): void => {
  ctx.translate(hip[0], hip[1])
  ctx.rotate(H.tilt)
  ctx.translate(-hip[0], -hip[1])
}

/**
 * The throwing hand's track for a design whose arms cannot reach over its own
 * head (a big-headed imp): the same scoop and follow-through, but the cock and
 * the release stay out beside the head, where the arm can be seen.
 */
export const SIDEARM_THROW: readonly Pt[] = [
  [0.3, 0.9],
  [0.7, 0.62],
  [1.0, -0.05],
  [0.72, -0.7],
  [0.55, -0.85],
  [-0.6, 0.5],
  [-0.1, 0.86],
  [0.3, 0.9]
]

/** The head's own turn on its neck: it keeps its eyes on the mark while the
 *  body swings under it, so it turns back about half the tilt. */
export const hurlHeadTurn = (H: HurlBeats): number => -H.tilt * 0.55

// ── Side-on bodies ──
//
// A boar and a hound have no hands. They throw with the HEAD: the snout goes
// down and scoops the rock up, the forequarters rear as the head tosses back
// with it, and the front end comes down hard as the head whips forward and
// lets go. The rock rides on the snout (`hurlGrip` at its tip).

/** Pitch of the whole body about the hind feet, radians, head UP positive. */
const REAR: readonly number[] = [0, -0.06, 0.1, 0.3, 0.12, -0.08, -0.03, 0]
/** The head's own swing on the neck, radians, snout UP positive. */
const TOSS: readonly number[] = [0, -0.55, -0.05, 0.55, 0.15, -0.45, -0.15, 0]
/** How far the front feet come up off the ground, in S. */
const FORE_LIFT: readonly number[] = [0, 0, 0.05, 0.14, 0.07, 0, 0, 0]
/** How wide the jaw is open, 0..1 — wide on the release. */
const JAW: readonly number[] = [0.1, 0.25, 0.15, 0.35, 1, 0.8, 0.3, 0.1]

export interface FlankHurl {
  k: number
  /** Body pitch about the hind feet, radians, head up positive. */
  rear: number
  /** Head swing on the neck, radians, snout up positive. */
  toss: number
  /** Front feet lift, in S. */
  foreLift: number
  /** Jaw open 0..1. */
  jaw: number
  /** 0..1, how hard the body is working. */
  effort: number
}

export const flankHurl = (k: number): FlankHurl => ({
  k,
  rear: track(REAR, k),
  toss: track(TOSS, k),
  foreLift: track(FORE_LIFT, k),
  jaw: track(JAW, k),
  effort: track([0, 0.4, 0.7, 1, 1, 0.7, 0.3, 0], k)
})

/**
 * Pitch a side-on body about its hind feet, head up for a positive `rear`.
 * `headDir` is the side the head is drawn on (−1 left), `hind` how far behind
 * the middle the hind feet stand, in S. Call between a save and a restore.
 */
export const rearOnHaunches = (
  ctx: CanvasRenderingContext2D, S: number, F: FlankHurl, headDir: -1 | 1, hind = 0.35, ground = 1.0
): void => {
  const px = -headDir * hind * S
  ctx.translate(px, ground * S)
  // Head on the left going UP is a clockwise turn about a pivot on its right.
  ctx.rotate(-headDir * F.rear)
  ctx.translate(-px, -ground * S)
}
