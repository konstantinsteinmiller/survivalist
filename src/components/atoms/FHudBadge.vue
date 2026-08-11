<script setup lang="ts">
/**
 * The small corner indicator used inside `FHudButton`'s `badge` slot —
 * a claim count, a reward amount, or a countdown. Fluidly sized so it stays
 * legible on a 320 px phone without swallowing the chip it sits on.
 */
interface Props {
  tone?: 'red' | 'blue' | 'gold' | 'green'
}
withDefaults(defineProps<Props>(), { tone: 'red' })
</script>

<template lang="pug">
  span.f-hud-badge(:class="`tone-${tone}`")
    slot
</template>

<style scoped lang="sass">
.f-hud-badge
  display: inline-flex
  align-items: center
  justify-content: center
  gap: 0.15em
  min-width: clamp(0.95rem, 4vw, 1.2rem)
  min-height: clamp(0.95rem, 4vw, 1.2rem)
  padding-inline: 0.3em
  border: 2px solid #fff
  border-radius: 999px
  color: #fff
  font-weight: 900
  line-height: 1
  font-size: clamp(0.55rem, 2.4vw, 0.72rem)
  white-space: nowrap
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.45)

  // Both element types, deliberately. `IconCoin` is an `<img>` while every
  // other icon in the set is an inline `<svg>`, and an `svg`-only rule let the
  // coin fall through to its intrinsic 128×128 — a giant gold disc bursting out
  // of the badge and shoving the rest of the HUD row off screen.
  :slotted(svg),
  :slotted(img)
    flex: 0 0 auto
    width: 1em
    height: 1em
    object-fit: contain

.tone-red
  background-color: #ef4444
.tone-blue
  background-color: #102e7a
.tone-gold
  background-color: #f7a000
.tone-green
  background-color: #1f9d4d
</style>
