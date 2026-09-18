<template lang="pug">
  canvas.boss-silhouette(ref="canvas" aria-hidden="true")
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { monsterFaces, monsterFrame } from '@/game/monsterSprites'

/**
 * ─── The boss that is waiting, as a shadow ──────────────────────────────────
 *
 * The handover banner's teaser. The boss at the end of the new road, drawn from
 * the same frame the fight will draw (`monsterFrame`, painting or bake), but
 * filled black with an ember rim — a shape the player will recognise a minute
 * later without being shown the whole thing now. A promise, not a portrait.
 *
 * Drawn once, into its own small canvas, and never again: the banner is up for
 * two seconds and the silhouette does not animate. The frame can still be
 * baking when the banner goes up (the stage started a moment ago), so the draw
 * retries on animation frames for up to two seconds and then gives up quietly —
 * an empty slot beside the name is the worst case, never an error.
 */
const props = defineProps<{ design: string }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let tries = 0

const draw = (): void => {
  raf = 0
  const c = canvas.value
  if (!c) return
  const frame = monsterFrame(props.design, 0.25)
  if (!frame || frame.width === 0) {
    if (tries++ < 120) raf = requestAnimationFrame(draw)
    return
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(c.clientWidth * dpr))
  const h = Math.max(1, Math.round(c.clientHeight * dpr))
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, w, h)
  const k = Math.min(w / frame.width, h / frame.height)
  const dw = frame.width * k
  const dh = frame.height * k
  g.save()
  if (monsterFaces(props.design) === 'left') {
    g.translate(w, 0)
    g.scale(-1, 1)
  }
  g.drawImage(frame, (w - dw) / 2, h - dh, dw, dh)
  g.restore()
  // Keep the shape, lose the light: everything the frame covered goes black.
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = '#12070c'
  g.fillRect(0, 0, w, h)
  g.globalCompositeOperation = 'source-over'
}

const redraw = (): void => {
  if (raf) cancelAnimationFrame(raf)
  tries = 0
  raf = requestAnimationFrame(draw)
}

onMounted(redraw)
watch(() => props.design, redraw)
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped lang="sass">
.boss-silhouette
  display: block
  width: clamp(2rem, 9vw, 2.8rem)
  height: clamp(2rem, 9vw, 2.8rem)
  // The ember rim: a static filter on a tiny static canvas, composited once by
  // the browser — nothing here repaints per frame.
  filter: drop-shadow(0 0 0.12rem rgba(255, 90, 50, 0.95)) drop-shadow(0 0 0.4rem rgba(255, 60, 30, 0.55))
</style>
