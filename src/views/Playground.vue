<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { setArtOverrides, artOverridesEnabled } from '@/game/art'
import { ART_CATALOGUE } from '@/game/artCatalogue'
import {
  monsterFrame, monsterFaces, primeMonsterSprites, allMonsterIds, bakeMonsterSlice,
  SPRITE_FOOT_R, SPRITE_HEIGHT_R
} from '@/game/monsterSprites'
import {
  survivorFrame, primeSurvivors, bakeSurvivorSlice, OUTFITS,
  HERO_FOOT_R, HERO_HEIGHT_R, HERO_CYCLE_MS
} from '@/game/heroSprites'
import { puffSpriteFor } from '@/use/useVfx'
import {
  paintCoin, paintCrateBody, paintBarrelBody, paintBoulder, paintBarricadeBody,
  paintGateFrame, paintPillarBody, hazardPatternFor,
  paintRollerBall, paintGunnerBolt, paintBossBolt, paintMeteorRock,
  paintBombCharge, paintGrenadeBody, paintTracerRef, ROCKET_BOX, paintRocketBody,
  muzzleRamp, paintMuzzleFlash, paintScorch, paintRing, paintShieldDome,
  paintGuardHex, paintCrest, paintCrown, paintLaneTile, paintRidge,
  paintPellet, paintBoltTile, paintWisp, paintGildBurst,
  paintCageBody, CAGE_BOX
} from '@/use/useSurvivalArt'
import { blitBanner, paintUiIcon, UI_ICON_IDS, BANNER } from '@/game/uiArt'
import {
  BARREL_R, CAGE_R, CRATE_R, BARRICADE_H, ROCK_H, DIVIDER_HALF_W, DIVIDER_H
} from '@/game/survival'
import { BOLT_R, ROLLER_R } from '@/game/threats'

/**
 * ─── Playground ─────────────────────────────────────────────────────────────
 *
 * Every drawable the art pipeline can replace, on one screen, moving.
 *
 * It exists because the alternative was playing the game to look at the art:
 * a healer's bolt only flies on a stage-4-plus healer stage, a barrel only
 * stands in a stage-6 arena, and a brute only walks on from stage 7. Every
 * scaling bug the reference pipeline produced was visible in one frame once the
 * thing was actually on screen; getting it on screen was the expensive part.
 *
 * TWO RULES, and they are what make it worth having:
 *
 *   1. It calls the BATTLEFIELD'S painters, not lookalikes. `monsterFrame` is
 *      the same strip lookup, `paintCrateBody` the same function `drawCrates`
 *      calls, `puffSpriteFor` the same tinted sprite the particle bucket
 *      blits. A scene drawn from a private copy of the geometry would agree
 *      with itself and prove nothing.
 *   2. The art layer can be flipped live. A painted part is only wrong
 *      RELATIVE to the drawing it replaces, and A/B on one key is the whole
 *      diagnosis.
 *
 * Dev only, and out of every portal build — see the router.
 */

const canvas = ref<HTMLCanvasElement | null>(null)
const painted = ref(artOverridesEnabled())
const outlines = ref(true)
const running = ref(true)

/** One cell, px. Big enough to judge a prop, small enough to fit the cast. */
const CELL = 112
const PAD = 22
const LABEL = 15
/** Px per world unit for the props, so a crate and a pillar keep their
 *  relative sizes: `CRATE_R` is 0.62 units, a pillar is 1.1 tall. */
const PPU = CELL / 1.6

let raf = 0
let t0 = 0

const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void => {
  ctx.font = `${LABEL}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillStyle = '#8d9bb0'
  ctx.fillText(text, x, y)
}

/** The box a thing is allowed to occupy. Overflow is the commonest fault here,
 *  and it is invisible without something to overflow. */
const box = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void => {
  if (!outlines.value) return
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.setLineDash([4, 4])
  ctx.lineWidth = 1
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h))
  ctx.restore()
}

const heading = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void => {
  ctx.font = '600 13px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#5f6b7e'
  ctx.fillText(text.toUpperCase(), x, y)
}

/** A row of cells: `n` items laid out left to right, wrapping, each drawn by
 *  `draw(ctx, i)` with the origin at its cell's centre. Returns the next y. */
const row = (
  ctx: CanvasRenderingContext2D, W: number, y: number, title: string,
  items: readonly string[], cellW: number, cellH: number,
  draw: (ctx: CanvasRenderingContext2D, i: number) => void
): number => {
  heading(ctx, title, PAD, y)
  y += 16
  const perRow = Math.max(1, Math.floor((W - PAD * 2) / (cellW + PAD)))
  items.forEach((id, i) => {
    const col = i % perRow
    const r = Math.floor(i / perRow)
    const x = PAD + col * (cellW + PAD)
    const cy = y + r * (cellH + PAD + LABEL + 12) + cellH / 2
    box(ctx, x, cy - cellH / 2, cellW, cellH)
    ctx.save()
    ctx.translate(x + cellW / 2, cy)
    draw(ctx, i)
    ctx.restore()
    label(ctx, id, x + cellW / 2, cy + cellH / 2 + LABEL + 2)
  })
  return y + Math.ceil(items.length / perRow) * (cellH + PAD + LABEL + 12) + 10
}

/** A creature blitted exactly as the field blits it: scaled off the frame it
 *  was handed and lined up by the FEET, so a strip that hovers here hovers in
 *  the game. Both a monster and a survivor, by their own ratios. */
const blitFrame = (
  ctx: CanvasRenderingContext2D, frame: HTMLCanvasElement, size: number,
  heightR: number, footR: number, mirror: number
): void => {
  const k = size / (frame.height * heightR)
  const dw = frame.width * k
  const dh = frame.height * k
  ctx.save()
  ctx.translate(0, size * 0.5)
  ctx.scale(mirror, 1)
  ctx.drawImage(frame, -dw / 2, -frame.height * footR * k, dw, dh)
  ctx.restore()
}

const paint = (now: number): void => {
  const cv = canvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  if (!ctx) return
  if (!t0) t0 = now
  const t = running.value ? now - t0 : 0

  // The bakes are idle-driven; drive them here so the cast is on screen
  // within a second rather than whenever the browser finds a slot.
  bakeMonsterSlice(6)
  bakeSurvivorSlice(4)

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const W = cv.clientWidth
  const H = cv.clientHeight
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr)
    cv.height = Math.round(H * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#141922'
  ctx.fillRect(0, 0, W, H)

  let y = 34
  const mode = painted.value ? 'PAINTED' : 'drawn'

  // ── Monsters, walking — blitted as `drawFoes` blits them ──
  const ids = allMonsterIds()
  y = row(ctx, W, y, `monsters — one walk cycle · ${mode}`, ids, CELL, CELL, (c, i) => {
    const id = ids[i]!
    const frame = monsterFrame(id, t / 900)
    if (!frame) return
    blitFrame(c, frame, CELL * 0.92, SPRITE_HEIGHT_R, SPRITE_FOOT_R,
      monsterFaces(id) === 'left' ? -1 : 1)
  })

  // ── Survivors, running — blitted as `drawUnits` blits them ──
  const outfits = OUTFITS.map((o) => o.id)
  y = row(ctx, W, y, 'survivors — one stride, from behind', outfits, CELL, CELL, (c, i) => {
    const frame = survivorFrame(i, t / HERO_CYCLE_MS)
    if (!frame) return
    blitFrame(c, frame, CELL * 0.8, HERO_HEIGHT_R, HERO_FOOT_R, 1)
  })

  // ── Props, at one scale, so a crate and a pillar keep their sizes ──
  const props = ART_CATALOGUE.prop
  y = row(ctx, W, y, 'props — crate rims, badges, bars and numbers are drawn over these in play',
    props, CELL, CELL, (c, i) => {
      const id = props[i]!
      const s = PPU
      switch (id) {
        case 'crate-damage': paintCrateBody(c, 'damage', CRATE_R * s); break
        case 'crate-rate': paintCrateBody(c, 'rate', CRATE_R * s); break
        case 'barricade': paintBarricadeBody(c, BARRICADE_H * s * 2.2, BARRICADE_H * s); break
        case 'boulder-1': case 'boulder-2': case 'boulder-3':
          paintBoulder(c, ROCK_H * s * 1.3, ROCK_H * s, Number(id.slice(-1)) - 1); break
        case 'barrel': {
          const lit = Math.sin(t / 1500) > 0.5
          const flash = lit ? Math.sin(t / 34) * 0.5 + 0.5 : 0
          paintBarrelBody(c, BARREL_R * s, s, lit, flash, 0.5)
          break
        }
        case 'pillar':
          paintPillarBody(c, DIVIDER_HALF_W * s, DIVIDER_H * s, s, hazardPatternFor(c, s))
          break
        case 'coin': {
          const phase = t / 600
          paintCoin(c, 0.22 * s, Math.abs(Math.cos(phase)), Math.sin(phase * 0.6) * s * 0.06)
          break
        }
        case 'cage': case 'cage-sealed': case 'cage-warden': {
          // All three at the roadside cage's size, so the paintings compare
          // like for like; the box is centred in the cell. The road cage
          // cycles its damage so the painted lean can be judged against the
          // drawing's bending bars.
          const r = CAGE_R * s
          const hurt = id === 'cage' ? Math.max(0, Math.sin(t / 900)) : 0
          c.translate(0, r * (CAGE_BOX.top - CAGE_BOX.side / 2))
          paintCageBody(c, r, id === 'cage-warden' ? 'warden' : id === 'cage-sealed' ? 'sealed' : 'road', hurt)
          break
        }
      }
    })

  // ── Gates: every op at both leaf widths, to prove the nine-slice ──
  const gates = ART_CATALOGUE.gate.flatMap((id) => [`${id} ·2`, `${id} ·3`])
  const gs = CELL / 2.5
  y = row(ctx, W, y, 'gate frames — two-leaf and three-leaf widths; curtain, chevrons and plate are live',
    gates, gs * 4.8, gs * 2.3, (c, i) => {
      const [id, leaves] = gates[i]!.split(' ·')
      const op = id!.slice('frame-'.length) as 'add' | 'sub' | 'mul' | 'div'
      const halfW = (leaves === '2' ? 2.05 : 1.33) * gs
      // The door's edges, as the sim measures them. A post belongs ON this
      // line — a painting whose posts sit inside it narrows a door the crowd
      // is allowed to fill, which is exactly the fault the fit once caused.
      if (outlines.value) {
        c.save()
        c.strokeStyle = 'rgba(120,224,255,0.45)'
        c.setLineDash([3, 3])
        c.lineWidth = 1
        c.beginPath()
        for (const x of [-halfW, halfW]) {
          c.moveTo(x, -gs * 1.0)
          c.lineTo(x, gs * 1.0)
        }
        c.stroke()
        c.restore()
      }
      paintGateFrame(c, op, halfW, 1.5 * gs, gs)
    })

  // ── Rounds, moving as they move in flight ──
  const rounds = ART_CATALOGUE.round
  y = row(ctx, W, y, 'rounds — turned to a sweeping heading; the meteor falls, the grenade tumbles',
    rounds, CELL, CELL, (c, i) => {
      const id = rounds[i]!
      const a = t / 1400
      const dx = Math.cos(a)
      const dy = Math.sin(a)
      switch (id) {
        case 'tracer': c.translate(0, -CELL * 0.3); paintTracerRef(c, 0.5, CELL / 0.55 * 0.6); break
        // The shotgun's: a fan of them, because one pellet on its own says
        // nothing about the weapon it belongs to.
        case 'pellet': {
          for (let k = -2; k <= 2; k++) {
            c.save()
            c.translate(k * CELL * 0.14, Math.abs(k) * CELL * 0.05)
            paintPellet(c, CELL * 0.07)
            c.restore()
          }
          break
        }
        case 'bolt-gunner': paintGunnerBolt(c, CELL / 10, dx, dy, (CELL / 10) / BOLT_R, false); break
        case 'bolt-boss': paintBossBolt(c, CELL / 10, dx, dy, 0.85 + Math.sin(t / 70) * 0.15, false); break
        case 'roller': paintRollerBall(c, CELL * 0.42, -t / 320, (CELL * 0.42) / ROLLER_R, false); break
        case 'meteor': {
          const R = CELL / 9
          c.translate(0, CELL * 0.28)
          paintMeteorRock(c, R, false, R / 0.55, false)
          break
        }
        case 'bomb': {
          const beat = 0.5 + 0.5 * Math.sin(t / 90)
          const bodyR = CELL * 0.2 * (1 + beat * 0.1)
          paintBombCharge(c, bodyR, bodyR * (1.8 + beat * 0.6))
          break
        }
        case 'grenade': c.rotate(t / 110); paintGrenadeBody(c, CELL * 0.16, CELL * 0.16 / 0.26); break
        case 'rocket': {
          // Nose up, weaving a little as the launcher's steering does.
          const rr = CELL * 0.9 / ROCKET_BOX.h
          c.translate(0, -CELL * 0.45 + ROCKET_BOX.top * rr)
          c.rotate(Math.sin(t / 420) * 0.22)
          paintRocketBody(c, rr)
          break
        }
      }
    })

  // ── Effects — squashed as the field squashes them ──
  const fx = ART_CATALOGUE.fx
  y = row(ctx, W, y, 'effects — rings and the dome are stretched flat exactly as in play',
    fx, CELL, CELL, (c, i) => {
      const id = fx[i]!
      const pulse = 0.5 + 0.5 * Math.sin(t / 160)
      const s = CELL / 3
      switch (id) {
        case 'muzzle': {
          const r = CELL * 0.3 * (0.8 + pulse * 0.3)
          c.globalCompositeOperation = 'lighter'
          paintMuzzleFlash(c, 0, r, muzzleRamp(c, 0, r))
          break
        }
        // The three marks the later weapons are known by. The bolt is a TILE:
        // drawn here at the cell's full height, exactly as the road stretches
        // it from the crowd to the end of the gun's reach.
        case 'bolt':
          c.translate(0, -CELL * 0.45)
          paintBoltTile(c, CELL * 0.16, CELL * 0.9)
          break
        case 'wisp':
          paintWisp(c, CELL * 0.22 * (0.9 + pulse * 0.12))
          break
        case 'gild':
          paintGildBurst(c, CELL * 0.3 * (0.75 + pulse * 0.35))
          break
        case 'smoke': {
          const spr = puffSpriteFor(168, 156, 134)
          const r = CELL * 0.3 * (0.7 + pulse * 0.4)
          c.globalAlpha = 0.8
          if (spr) c.drawImage(spr, -r, -r, r * 2, r * 2)
          break
        }
        case 'scorch': c.globalAlpha = 0.7; paintScorch(c, CELL * 0.42); break
        case 'ring-shock': {
          const r = CELL * 0.2 + pulse * CELL * 0.25
          c.globalCompositeOperation = 'lighter'
          paintRing(c, 'shock', r, r * 0.3, Math.max(1.5, s * 0.16 * (1 - pulse)),
            `rgba(215,240,255,${(1 - pulse) * 0.75})`, { alpha: (1 - pulse) * 0.75 })
          break
        }
        case 'ring-heat':
          paintRing(c, 'heat', CELL * 0.42, CELL * 0.21, Math.max(2, s * 0.09), '#ff5a4a'); break
        case 'ring-heal':
          c.globalCompositeOperation = 'lighter'
          paintRing(c, 'heal', CELL * 0.42 * (1 - pulse * 0.6), CELL * 0.21 * (1 - pulse * 0.6),
            Math.max(2, s * 0.09), '#5cf08a', { alpha: 1 - pulse })
          break
        case 'shield':
          paintShieldDome(c, 0, 0, CELL * 0.44, CELL * 0.34, 0.55 + pulse * 0.2, 0, false, s); break
        case 'guard':
          paintGuardHex(c, 0, CELL * 0.4, CELL * 0.46, pulse, s); break
        case 'crest-shield':
          paintCrest(c, 'shield', 0, 0, CELL * 0.3, CELL * 0.35, {
            fill: '#6fd6ff', rim: '#06263a', rimW: Math.max(2.5, s * 0.085),
            rib: 'rgba(6,38,58,0.9)', ribW: Math.max(1.2, s * 0.04)
          })
          break
        case 'crest-guard':
          paintCrest(c, 'guard', 0, 0, CELL * 0.3, CELL * 0.35, {
            fill: '#ffc46a', rim: '#2a0f05', rimW: Math.max(3, s * 0.11),
            rib: 'rgba(42,15,5,0.9)', ribW: Math.max(1.5, s * 0.05)
          })
          break
      }
    })

  // ── The crown, the chest and the skill icons ──
  const marks = ['crown', ...UI_ICON_IDS] as const
  y = row(ctx, W, y, 'marks — the crown on the field; the chest and the skills on their buttons',
    marks, CELL, CELL, (c, i) => {
      const id = marks[i]!
      if (id === 'crown') paintCrown(c, 0, CELL * 0.35, CELL * 0.6, CELL * 0.34, Math.max(1, CELL * 0.02))
      else paintUiIcon(c, id, CELL * 0.78)
    })

  // ── The result banner, sliced as CSS slices it: end pieces at true size,
  //    the middle stretched to the caption. Two widths, so a painting whose
  //    end pieces do not sit under the cut shows a seam at one of them. ──
  heading(ctx, `result banner — nine-sliced to its caption in play; the outer ${Math.round(BANNER.cap * 100)}% is the end piece`, PAD, y)
  y += 16
  {
    const bh = 64
    let bx = PAD
    for (const bw of [440, 220]) {
      box(ctx, bx, y, bw, bh)
      blitBanner(ctx, bx, y, bw, bh)
      ctx.font = `900 italic ${bh * 0.42}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(bw > 300 ? 'STAGE CLEAR' : 'WIPED', bx + bw / 2, y + bh / 2)
      bx += bw + PAD
    }
    y += bh + PAD + 6
  }

  const bgW = Math.min(W - PAD * 2, 900)
  heading(ctx, 'backdrop — the road tile scrolling, the ridges tinted to stage 1', PAD, y)
  y += 16
  box(ctx, PAD, y, bgW, 220)
  ctx.save()
  ctx.beginPath()
  ctx.rect(PAD, y, bgW, 220)
  ctx.clip()
  ctx.fillStyle = '#1b2a4a'
  ctx.fillRect(PAD, y, bgW, 220)
  paintRidge(ctx, 'ridge-far', bgW, 220, 110, 15, '#221a38', 1.7)
  paintRidge(ctx, 'ridge-near', bgW, 220, 130, 10, '#2f2547', 4.2)
  ctx.restore()
  ctx.translate(PAD, y)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, bgW, 220)
  ctx.clip()
  const tilePx = 128
  const tile = document.createElement('canvas')
  tile.width = tilePx
  tile.height = tilePx
  const tctx = tile.getContext('2d')
  if (tctx) {
    paintLaneTile(tctx, tilePx)
    const pat = ctx.createPattern(tile, 'repeat')
    if (pat) {
      const off = (t / 12) % tilePx
      ctx.translate(0, off)
      ctx.fillStyle = pat
      ctx.fillRect(bgW * 0.3, 140 - tilePx - off, bgW * 0.4, 80 + tilePx)
    }
  }
  ctx.restore()
  ctx.translate(-PAD, -y)
  y += 220 + PAD

  // Grow the canvas to exactly what was drawn. A fixed height either clips the
  // last row or leaves a screen of empty dark under a short cast.
  const need = Math.ceil(y + LABEL + 40)
  if (Math.abs(cv.clientHeight - need) > 4) cv.style.height = `${need}px`

  raf = requestAnimationFrame(paint)
}

const toggleArt = (): void => {
  painted.value = setArtOverrides(!painted.value, false)
}

onMounted(() => {
  primeMonsterSprites(allMonsterIds())
  primeSurvivors()
  raf = requestAnimationFrame(paint)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template lang="pug">
  .playground
    header.playground__bar
      strong Playground
      button(:class="{ on: painted }" @click="toggleArt")
        | {{ painted ? 'painted art' : 'drawn art' }}
      button(:class="{ on: outlines }" @click="outlines = !outlines") boxes
      button(:class="{ on: running }" @click="running = !running")
        | {{ running ? 'running' : 'paused' }}
      span.playground__hint
        | Every drawable the pipeline can replace, through the game's own painters.
    canvas.playground__canvas(ref="canvas")
</template>

<style lang="sass">
.playground
  // The app shell is a fixed-height, overflow-hidden game screen, so this
  // has to do its own scrolling or the last row is simply unreachable.
  height: 100vh
  overflow-y: auto
  background: #141922
  color: #c7d0dd

  &__bar
    position: sticky
    top: 0
    z-index: 2
    display: flex
    gap: 10px
    align-items: center
    padding: 10px 22px
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

  &__hint
    margin-left: auto
    color: #5f6b7e

  &__canvas
    display: block
    width: 100%
    // Replaced on the first frame by the height the scene actually needs.
    height: 1400px
</style>
