<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { setArtOverrides, artOverridesEnabled } from '@/game/art'
import {
  monsterFrame, monsterFaces, monsterHurlFrame, primeMonsterSprites, primeMonsterHurls,
  bakeMonsterSlice, SPRITE_FOOT_R, SPRITE_HEIGHT_R
} from '@/game/monsterSprites'
import { MONSTERS } from '@/game/monsters'
import { hurlDesigns } from '@/game/artSheet'
import {
  paintHeldMeteor, paintThrownMeteor, paintFallingMeteor, paintRing,
  drawWindupGround, drawWindupBody, ROUND_CYCLE_HZ, type MeteorLook, type Windup
} from '@/use/useSurvivalArt'
import {
  METEOR_RELEASE, POSE_AFTER_S, REST_POSE, bossPose, meteorHurlPanel, mixPose,
  type BossPose, type WindupKind
} from '@/game/bossWindup'
import { CHARGE_DASH_S, DRAIN_HOLD_S, SUMMON_TELEGRAPH } from '@/game/threats'

/**
 * ─── Boss motion ────────────────────────────────────────────────────────────
 *
 * Every boss wind-up, the way it USED to look beside the way it looks now,
 * moving in step on one clock — so a change to how a boss moves can be judged
 * as a change, not from memory.
 *
 *   METEOR   four columns per boss: the rock dropped from the sky (before the
 *            hurl existed), the squash-and-stretch throw the owner rejected
 *            ("it distorts the boss instead of animating its arms"), and the
 *            throw now — the rig's drawing, then its painting.
 *   OTHERS   the walk alone (no body tell existed) beside the body pose each
 *            wind-up has now. Body only: the ground tells did not change.
 *
 * The playground's rule holds: the field's own painters — `monsterFrame`,
 * `monsterHurlFrame`, `paintHeldMeteor` / `paintThrownMeteor`, `bossPose`,
 * `drawWindupBody`. The one thing here that the game no longer has is the
 * rejected throw's pose curve (`rejectedMeteorPose`), kept verbatim as the
 * record of what was turned down.
 *
 * Dev only, like the playground — see the router.
 */

const canvas = ref<HTMLCanvasElement | null>(null)
const painted = ref(artOverridesEnabled())
const running = ref(true)
const speed = ref(0.5)
const scrub = ref(0)
const numbers = ref(true)

/** One loop of every cell, seconds of game time: a beat of walk, the cast,
 *  the settle and a beat of walk again. */
const LOOP_S = 2.8
/** When the cast starts inside the loop. */
const CAST_AT = 0.4
/** The ordinary meteor wind-up — `METEOR_RELEASE` of it gathering. */
const METEOR_LIFE = 1.0
const SPEEDS = [1, 0.5, 0.25, 0.1] as const

const CELL_W = 230
const CELL_H = 350
const GAP = 14
const PAD = 24
const HEAD = 30
const BG = '#141922'

let raf = 0
let last = 0
/** Game seconds into the loop. */
let clock = 0

const nameOf = (id: string): string => MONSTERS.find((m) => m.id === id)?.name ?? id

// ─── The rejected throw, kept as the record ─────────────────────────────────

/**
 * `bossPose('meteor', …)` as it was until 2026-09-18: the whole body reared,
 * stretched and leaned back, then squashed and snapped forward. Verbatim, so
 * the comparison shows exactly what was turned down.
 */
const rejectedMeteorPose = (p: number, side: number, charged: boolean): BossPose => {
  const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
  const smooth = (v: number): number => { const k = clamp01(v); return k * k * (3 - 2 * k) }
  const pose = (o: Partial<BossPose>): BossPose => ({ ...REST_POSE, ...o })
  const k = clamp01(p)
  const amp = charged ? 1.4 : 1
  const reared = pose({ lean: -0.12 * side * amp, sy: 1 + 0.14 * amp, sx: 1 - 0.06 * amp, lift: 0.06 * amp, glow: 1 })
  const thrown = pose({ lean: 0.15 * side * amp, sy: 1 - 0.12 * amp, sx: 1 + 0.09 * amp, dip: 0.09 * amp, glow: 0.2 })
  if (k < METEOR_RELEASE) {
    const g = smooth(k / METEOR_RELEASE)
    const held = mixPose(REST_POSE, reared, g)
    held.shake = g > 0.75 ? (0.01 * amp * (g - 0.75)) / 0.25 : 0
    return held
  }
  const w = (k - METEOR_RELEASE) / (1 - METEOR_RELEASE)
  if (w < 0.16) return mixPose(reared, thrown, smooth(w / 0.16))
  return mixPose(thrown, REST_POSE, smooth((w - 0.16) / 0.5))
}

// ─── One body, as `drawBossBody` draws it ───────────────────────────────────

interface Placed {
  /** Where the hand the rock sits in is, cell px, and which way is up. */
  hx: number
  hy: number
  upX: number
  upY: number
}

/**
 * Draw `frame` standing at (x, y) — the feet — at `size`, under `pose`, with
 * the wind-up's ground and body glow when `wu` is given, and return where the
 * rock-holding hand is: the drawing's own palm (`grip`, a fraction of the
 * panel) when there is one, else the raised hand the rejected throw used.
 */
const drawBoss = (
  ctx: CanvasRenderingContext2D, design: string, frame: HTMLCanvasElement | null,
  x: number, y: number, size: number, pose: BossPose, t: number,
  wu: Windup | null, grip: [number, number] | null, side: number
): Placed => {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.42, size * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  const tMs = t * 1000
  const shx = pose.shake > 0.0005 ? Math.sin(tMs * 0.09) * pose.shake * size : 0
  const shy = pose.shake > 0.0005 ? Math.cos(tMs * 0.13) * pose.shake * size * 0.5 : 0
  const px = shx
  const py = (pose.dip - pose.lift) * size + shy
  if (wu) drawWindupGround(ctx, wu, pose.glow, size, tMs)
  ctx.save()
  ctx.translate(px, py)
  if (Math.abs(pose.lean) > 0.0005) ctx.rotate(pose.lean)
  ctx.scale(pose.sx, pose.sy)
  const mirror = monsterFaces(design) === 'left' ? -1 : 1
  let lx = -side * size * 0.3 * pose.sx
  let ly = -size * 1.45 * pose.sy
  if (frame) {
    const k = (size * 1.6) / (frame.height * SPRITE_HEIGHT_R)
    const dw = frame.width * k
    const dh = frame.height * k
    const top = -frame.height * SPRITE_FOOT_R * k
    ctx.save()
    ctx.scale(mirror, 1)
    ctx.drawImage(frame, -dw / 2, top, dw, dh)
    ctx.restore()
    if (grip) {
      lx = mirror * (grip[0] - 0.5) * dw * pose.sx
      ly = (grip[1] - SPRITE_FOOT_R) * dh * pose.sy
    }
  }
  if (wu) drawWindupBody(ctx, wu, pose.glow, size, tMs)
  ctx.restore()
  ctx.restore()
  const c = Math.cos(pose.lean)
  const s = Math.sin(pose.lean)
  return { hx: x + px + lx * c - ly * s, hy: y + py + lx * s + ly * c, upX: s, upY: -c }
}

/** The mark on the ground: the field's clock wedge and heat ring. */
const drawMark = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number): void => {
  ctx.save()
  ctx.fillStyle = 'rgba(255,150,70,0.26)'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.ellipse(x, y, r, r * 0.42, 0, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  ctx.translate(x, y)
  paintRing(ctx, 'heat', r, r * 0.42, 2.5, '#ffb066')
  ctx.restore()
}

// ─── Cells ──────────────────────────────────────────────────────────────────

type MeteorMode = 'sky' | 'rejected' | 'drawn' | 'painted'

const METEOR_COLUMNS: ReadonlyArray<{ mode: MeteorMode; title: string; sub: string }> = [
  { mode: 'sky', title: 'Before', sub: 'rock drops from the sky' },
  { mode: 'rejected', title: 'Rejected', sub: 'body stretched & squashed' },
  { mode: 'drawn', title: 'Now — drawn', sub: "the rig's throw (fallback)" },
  { mode: 'painted', title: 'Now — painted', sub: 'what ships with art on' }
]

const cellFrame = (ctx: CanvasRenderingContext2D, x: number, y: number, title: string, sub: string): void => {
  ctx.fillStyle = '#1a2029'
  ctx.fillRect(x, y, CELL_W, CELL_H)
  ctx.strokeStyle = '#242c38'
  ctx.strokeRect(x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1)
  ctx.font = '600 12px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#c7d0dd'
  ctx.fillText(title, x + 10, y + 18)
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillStyle = '#6f7b8f'
  ctx.fillText(sub, x + 10, y + 33)
}

const note = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, colour = '#8d9bb0'): void => {
  ctx.font = '11px ui-monospace, monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = colour
  ctx.fillText(text, x + CELL_W - 10, y + CELL_H - 10)
}

/** Where the cast is: `p` 0..1 through the wind-up (null outside it) and the
 *  seconds since it landed. */
const castAt = (t: number, life: number): { p: number | null; after: number } => {
  const since = t - CAST_AT
  if (since < 0) return { p: null, after: 0 }
  if (since < life) return { p: since / life, after: 0 }
  return { p: 1, after: since - life }
}

const meteorCell = (
  ctx: CanvasRenderingContext2D, x: number, y: number, design: string, mode: MeteorMode, t: number
): void => {
  const col = METEOR_COLUMNS.find((c) => c.mode === mode)!
  cellFrame(ctx, x, y, col.title, col.sub)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, CELL_W, CELL_H)
  ctx.clip()
  const size = 74
  const feetX = x + CELL_W / 2
  const feetY = y + 212
  const side = 1
  const markX = feetX + side * size * 0.75
  const markY = y + CELL_H - 34
  const rockR = size * 0.19
  const cycle = t * ROUND_CYCLE_HZ
  const tumble = Math.sin(Math.PI * 2 * cycle) * 0.09 + Math.sin(Math.PI * 4 * cycle) * 0.04
  const look: MeteorLook = { rockR, big: false, scale: rockR / 0.55, cheap: false, cycle, tumble }
  const { p } = castAt(t, METEOR_LIFE)
  const flying = p !== null && p < 1
  if (flying) drawMark(ctx, markX, markY, size * 0.42, p)

  const walk = monsterFrame(design, (t * 1000 / 900) % 1)
  let frame = walk
  let pose: BossPose = REST_POSE
  let grip: [number, number] | null = null
  let panel: number | null = null
  let missing = false
  if (mode === 'rejected' && p !== null) pose = rejectedMeteorPose(p, side, false)
  if ((mode === 'drawn' || mode === 'painted') && p !== null) {
    panel = meteorHurlPanel(p)
    if (panel !== null) {
      const h = monsterHurlFrame(design, panel, { drawn: mode === 'drawn' })
      if (h) {
        if (mode === 'painted' && !h.painted) missing = true
        frame = h.frame
        grip = h.grip
      }
    }
  }
  const at = drawBoss(ctx, design, frame, feetX, feetY, size, pose, t, null, grip, side)

  if (flying) {
    // The field keeps the rock below the top of the screen; here, below the
    // cell's caption.
    const top = y + 44 + rockR
    if (mode === 'sky') {
      paintFallingMeteor(ctx, look, markX, markY, y - rockR * 3, p)
    } else if (p < METEOR_RELEASE) {
      paintHeldMeteor(ctx, look, at.hx, at.hy, at.upX, at.upY, p / METEOR_RELEASE, t - CAST_AT, top)
    } else {
      // Latched where the hand was on the release frame — as the field does.
      const rel = releaseFrom(design, mode, feetX, feetY, size, side, t)
      paintThrownMeteor(ctx, look, rel.hx, rel.hy, markX, markY,
        (p - METEOR_RELEASE) / (1 - METEOR_RELEASE), top)
    }
  }
  ctx.restore()
  if (numbers.value) {
    const phase = p === null ? 'walk' : p >= 1 ? 'landed' : p < METEOR_RELEASE ? 'gather' : 'flight'
    note(ctx, x, y, `${phase}${panel !== null ? ` · panel ${panel + 1}/8` : ''}`)
  }
  if (missing) note(ctx, x, y - 16, 'no painting yet — drawn', '#e0a060')
}

/**
 * Where the rock left the hand: the hand on the RELEASE frame. The field
 * latches it on the first frame of the flight; this recomputes the same frame
 * without drawing it.
 */
const releaseFrom = (
  design: string, mode: MeteorMode, feetX: number, feetY: number, size: number, side: number, t: number
): { hx: number; hy: number } => {
  let pose: BossPose = REST_POSE
  let grip: [number, number] | null = null
  let frame = monsterFrame(design, (t * 1000 / 900) % 1)
  if (mode === 'rejected') pose = rejectedMeteorPose(METEOR_RELEASE, side, false)
  else {
    const h = monsterHurlFrame(design, meteorHurlPanel(METEOR_RELEASE) ?? 0, { drawn: mode === 'drawn' })
    if (h) { frame = h.frame; grip = h.grip }
  }
  let lx = -side * size * 0.3 * pose.sx
  let ly = -size * 1.45 * pose.sy
  if (frame && grip) {
    const k = (size * 1.6) / (frame.height * SPRITE_HEIGHT_R)
    const mirror = monsterFaces(design) === 'left' ? -1 : 1
    lx = mirror * (grip[0] - 0.5) * frame.width * k
    ly = (grip[1] - SPRITE_FOOT_R) * frame.height * k
  }
  const c = Math.cos(pose.lean)
  const s = Math.sin(pose.lean)
  const px = 0
  const py = (pose.dip - pose.lift) * size
  const lift = size * 0.19 * 0.55
  return { hx: feetX + px + lx * c - ly * s + s * lift, hy: feetY + py + lx * s + ly * c - c * lift }
}

// ─── The other wind-ups ─────────────────────────────────────────────────────

interface OtherWindup {
  kind: WindupKind
  design: string
  life: number
  where: string
}

/** Each wind-up on a boss that actually performs it, and its real length. */
const OTHERS: readonly OtherWindup[] = [
  { kind: 'shock', design: 'cinderhound', life: 1.2, where: 'phase-two shock ring (stage 9+)' },
  { kind: 'charge', design: 'snaggletusk', life: 1.6, where: 'charge down the lane' },
  { kind: 'rake', design: 'cinderhound', life: 1.0, where: 'claw rake (stage 4)' },
  { kind: 'heal', design: 'thornwick', life: 1.2, where: 'healer heal (stage 7)' },
  { kind: 'bolt', design: 'thornwick', life: 1.0, where: 'healer bolt' },
  { kind: 'drain', design: 'thornwick', life: 1.2, where: 'healer life-drain + hold' },
  { kind: 'summon', design: 'marrowknight', life: SUMMON_TELEGRAPH, where: 'summoner wave (stage 6)' }
]

const otherCell = (
  ctx: CanvasRenderingContext2D, x: number, y: number, o: OtherWindup, now: boolean, t: number
): void => {
  cellFrame(ctx, x, y, `${o.kind} — ${now ? 'now' : 'before'}`,
    now ? `body pose · ${nameOf(o.design)}` : `walk only · ${nameOf(o.design)}`)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, CELL_W, CELL_H)
  ctx.clip()
  const size = 74
  const feetX = x + CELL_W / 2
  const feetY = y + 230
  const side = 1
  const { p, after } = castAt(t, o.life)
  const hold = o.kind === 'drain' ? DRAIN_HOLD_S : 0
  const holding = o.kind === 'drain' && p === 1 && after < hold
  const settled = holding ? 0 : Math.max(0, after - hold)
  const live = p !== null && settled <= POSE_AFTER_S
  const frame = monsterFrame(o.design, (t * 1000 / 900) % 1)
  let pose: BossPose = REST_POSE
  let wu: Windup | null = null
  if (now && live) {
    wu = { kind: o.kind, p: p ?? 0, after: settled, side, charged: false, life: o.life, holding }
    pose = bossPose(o.kind, wu.p, {
      side, after: settled, life: o.life, dashS: CHARGE_DASH_S, holding
    })
  }
  drawBoss(ctx, o.design, frame, feetX, feetY, size, pose, t, wu, null, side)
  ctx.restore()
  if (numbers.value) {
    const phase = p === null ? 'walk' : holding ? 'holding' : p < 1 ? `wind-up ${Math.round(p * 100)}%` : 'landed'
    note(ctx, x, y, phase)
  }
}

// ─── The frame ──────────────────────────────────────────────────────────────

const heading = (ctx: CanvasRenderingContext2D, text: string, sub: string, y: number): void => {
  ctx.font = '600 15px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#c7d0dd'
  ctx.fillText(text, PAD, y)
  ctx.font = '12px system-ui, sans-serif'
  ctx.fillStyle = '#6f7b8f'
  ctx.fillText(sub, PAD, y + 17)
}

const frame = (now: number): void => {
  const cv = canvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
  last = now
  if (running.value) {
    clock = (clock + dt * speed.value) % LOOP_S
    scrub.value = clock
  } else {
    clock = scrub.value
  }
  bakeMonsterSlice(6)

  const designs = hurlDesigns()
  const perRow = 4
  const needH = PAD + HEAD + 24 + designs.length * (CELL_H + GAP + 22) + 50 + HEAD +
    Math.ceil(OTHERS.length * 2 / perRow) * (CELL_H + GAP) + PAD
  const W = PAD * 2 + perRow * CELL_W + (perRow - 1) * GAP
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(needH * dpr)) {
    cv.width = Math.round(W * dpr)
    cv.height = Math.round(needH * dpr)
    cv.style.width = `${W}px`
    cv.style.height = `${needH}px`
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, needH)

  let y = PAD + 6
  heading(ctx, 'Meteor throw — every boss that throws one',
    'before → rejected → now. The rock is the field\'s own; it sits in the drawn hand and leaves from it on the release frame.', y)
  y += HEAD + 14
  for (const d of designs) {
    ctx.font = '600 13px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#9fb0c6'
    ctx.fillText(nameOf(d), PAD, y + 4)
    y += 12
    METEOR_COLUMNS.forEach((c, i) => meteorCell(ctx, PAD + i * (CELL_W + GAP), y, d, c.mode, clock))
    y += CELL_H + GAP + 10
  }

  y += 20
  heading(ctx, 'The other wind-ups — body only',
    'before: the boss just kept walking; now: it rears, coils or raises its arms over the same seconds as its ground tell.', y)
  y += HEAD + 14
  OTHERS.forEach((o, i) => {
    const slot = i * 2
    const cx = PAD + (slot % perRow) * (CELL_W + GAP)
    const cy = y + Math.floor(slot / perRow) * (CELL_H + GAP)
    otherCell(ctx, cx, cy, o, false, clock)
    otherCell(ctx, cx + CELL_W + GAP, cy, o, true, clock)
  })

  raf = requestAnimationFrame(frame)
}

const toggleArt = (): void => {
  painted.value = setArtOverrides(!painted.value, false)
}

const stepFrame = (dir: number): void => {
  running.value = false
  scrub.value = Math.max(0, Math.min(LOOP_S, scrub.value + dir / 60))
}

onMounted(() => {
  const designs = [...new Set([...hurlDesigns(), ...OTHERS.map((o) => o.design)])]
  primeMonsterSprites(designs)
  primeMonsterHurls(hurlDesigns())
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template lang="pug">
  .boss-motion
    header.boss-motion__bar
      strong Boss motion
      button(:class="{ on: painted }" @click="toggleArt")
        | {{ painted ? 'painted art' : 'drawn art' }}
      button(:class="{ on: running }" @click="running = !running")
        | {{ running ? 'playing' : 'paused' }}
      button(@click="stepFrame(-1)") ◀ frame
      button(@click="stepFrame(1)") frame ▶
      span.boss-motion__label speed
      button(v-for="s in SPEEDS" :key="s" :class="{ on: speed === s }" @click="speed = s") {{ s }}×
      input.boss-motion__scrub(
        type="range" min="0" :max="LOOP_S" step="0.005"
        v-model.number="scrub" @input="running = false"
      )
      button(:class="{ on: numbers }" @click="numbers = !numbers") labels
    canvas.boss-motion__canvas(ref="canvas")
</template>

<style lang="sass">
.boss-motion
  // The app shell is a fixed-height, overflow-hidden game screen, so this
  // page does its own scrolling, like the playground.
  height: 100vh
  overflow: auto
  background: #141922
  color: #c7d0dd

  &__bar
    position: sticky
    top: 0
    z-index: 2
    display: flex
    flex-wrap: wrap
    gap: 8px
    align-items: center
    padding: 10px 24px
    background: #10141b
    border-bottom: 1px solid #222a36
    font: 13px system-ui, sans-serif

    button
      padding: 4px 10px
      border: 1px solid #2b3442
      border-radius: 6px
      background: #1a212b
      color: #8d9bb0
      cursor: pointer

      &.on
        border-color: #3f7fbf
        color: #cfe4ff

  &__label
    margin-left: 8px
    color: #5f6b7e

  &__scrub
    width: 220px

  &__canvas
    display: block
</style>
