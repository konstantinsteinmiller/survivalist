<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { blockDef } from '@/game/blocks'
import { themedPalette, spriteFor } from '@/game/art'
import { blockGlyph } from '@/game/blockGlyph'

/**
 * A single block thumbnail, rendered on its own tiny canvas using the SAME
 * palette as the in-world renderer and the SAME pictogram as the build tray —
 * so a block looks like itself everywhere the player meets it.
 *
 * Doing this with a canvas rather than a hand-written SVG per block means the
 * thumbnail can never drift from the battlefield art: change a palette and both
 * update together. It also picks up drop-in bitmap overrides for free.
 */

interface Props {
  typeId: string
  /** CSS pixel size of the square thumbnail. */
  size?: number
}

const props = withDefaults(defineProps<Props>(), { size: 44 })

const canvasRef = ref<HTMLCanvasElement | null>(null)

const paint = (): void => {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const px = Math.round(props.size * dpr)
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, px, px)

  const override = spriteFor('block', props.typeId)
  if (override) {
    ctx.drawImage(override, 0, 0, px, px)
    return
  }

  const def = blockDef(props.typeId)
  const p = themedPalette(def.palette)
  const inset = px * 0.05
  const w = px - inset * 2
  const r = px * 0.14

  const round = (x: number, y: number, ww: number, hh: number, rr: number): void => {
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + ww, y, x + ww, y + hh, rr)
    ctx.arcTo(x + ww, y + hh, x, y + hh, rr)
    ctx.arcTo(x, y + hh, x, y, rr)
    ctx.arcTo(x, y, x + ww, y, rr)
    ctx.closePath()
  }

  // Body with the same upper-left light direction as the world renderer.
  round(inset, inset, w, w, r)
  const g = ctx.createLinearGradient(inset, inset, inset + w * 0.4, inset + w)
  g.addColorStop(0, p.light)
  g.addColorStop(0.5, p.mid)
  g.addColorStop(1, p.dark)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = p.accent
  ctx.lineWidth = Math.max(1, px * 0.05)
  ctx.stroke()

  // One bold pictogram, on a dark backing disc.
  //
  // The disc is not decoration: a pale glyph vanishes on a pale block (stone,
  // frost) and a dark one vanishes on a dark block (gate, tesla), and no single
  // ink colour survives both. A constant dark plate under a constant near-white
  // glyph does, at every palette and through the tray's grayscale filter.
  ctx.beginPath()
  ctx.arc(px / 2, px / 2, px * 0.29, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(8,12,20,0.46)'
  ctx.fill()

  ctx.save()
  ctx.translate(px / 2, px / 2)
  ctx.scale(px * 0.54, px * 0.54)
  ctx.fillStyle = '#f4f8ff'
  blockGlyph(props.typeId, def.kind)(ctx)
  ctx.restore()
}

onMounted(paint)
watch(() => [props.typeId, props.size], paint)
</script>

<template lang="pug">
  canvas.block-tile(
    ref="canvasRef"
    :style="{ width: size + 'px', height: size + 'px' }"
    aria-hidden="true"
  )
</template>

<style scoped lang="sass">
.block-tile
  display: block
  // The canvas is decorative; the parent button owns the interaction.
  pointer-events: none
  image-rendering: auto
</style>
