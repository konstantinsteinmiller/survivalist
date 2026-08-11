<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerChordTap } from '@/use/useVConsole'

/**
 * Top-left status ribbon: current wave, enemies remaining, and the Gate's
 * health.
 *
 * The gate bar is the single most important number on screen — it is the lose
 * condition — so it gets its own row and turns red + pulses below 35 %, which
 * is the cue to stop expanding and start reinforcing.
 */

interface Props {
  wave: number
  enemiesLeft: number
  enemiesTotal: number
  gateHpPct: number
  phase: 'build' | 'battle' | 'defeat'
  bestWave: number
}

const props = defineProps<Props>()
const { t } = useI18n()

/** Fraction of the wave still to fight — the bar drains as you clear it. */
const waveProgress = computed(() => {
  if (props.enemiesTotal <= 0) return 0
  return Math.max(0, Math.min(1, props.enemiesLeft / props.enemiesTotal))
})

const gateCritical = computed(() => props.gateHpPct <= 0.35)
const isRecord = computed(() => props.wave > props.bestWave && props.wave > 0)
</script>

<template lang="pug">
  //- `pointer-events-auto` re-enables taps because the HUD container is
  //- pointer-events-none; the taps feed the vConsole debug chord.
  div.wave-hud(
    @pointerdown="registerChordTap"
    @click="registerChordTap"
  )
    span.wave-hud__shadow(aria-hidden="true")
    div.wave-hud__body
      div.wave-hud__row
        span.wave-hud__label {{ t('hud.wave') }}
        span.wave-hud__value(:class="{ 'is-record': isRecord }") {{ wave }}
        span.wave-hud__sep(v-if="phase === 'battle'") ·
        template(v-if="phase === 'battle'")
          span.wave-hud__label {{ t('hud.enemies') }}
          span.wave-hud__value {{ enemiesLeft }}

      //- Remaining-enemies bar (battle only).
      div.wave-hud__bar(v-if="phase === 'battle'")
        div.wave-hud__bar-fill(
          class="is-enemies"
          :style="{ width: waveProgress * 100 + '%' }"
        )

      //- Gate integrity — always visible; this is the lose condition.
      div.wave-hud__gate
        svg.wave-hud__gate-icon(viewBox="0 0 24 24" fill="currentColor" aria-hidden="true")
          path(d="M5 21V9a7 7 0 0 1 14 0v12h-4v-8a3 3 0 0 0-6 0v8Z")
        div.wave-hud__bar
          div.wave-hud__bar-fill(
            :class="gateCritical ? 'is-gate-critical' : 'is-gate'"
            :style="{ width: Math.max(0, gateHpPct) * 100 + '%' }"
          )
</template>

<style scoped lang="sass">
.wave-hud
  position: relative
  pointer-events: auto
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  // Fluid, with a floor so the chip is always legible and never collapses.
  min-width: clamp(7rem, 34vw, 12rem)
  max-width: 46vw

.wave-hud__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: clamp(0.5rem, 2.4vw, 0.9rem)
  background-color: #0d1830

.wave-hud__body
  position: relative
  display: flex
  flex-direction: column
  gap: clamp(0.15rem, 0.8vw, 0.3rem)
  padding: clamp(0.25rem, 1.4vw, 0.5rem) clamp(0.45rem, 2.4vw, 0.85rem)
  border: 2px solid #0f1a30
  border-radius: clamp(0.5rem, 2.4vw, 0.9rem)
  background-image: linear-gradient(to bottom, rgba(38, 56, 96, 0.94), rgba(20, 32, 60, 0.94))

.wave-hud__row
  display: flex
  align-items: baseline
  gap: clamp(0.2rem, 1.2vw, 0.45rem)
  white-space: nowrap

.wave-hud__label
  color: #9fb6de
  font-weight: 900
  text-transform: uppercase
  letter-spacing: 0.06em
  font-size: clamp(0.5rem, 2.2vw, 0.72rem)

.wave-hud__value
  color: #fff
  font-weight: 900
  line-height: 1
  font-size: clamp(0.85rem, 4vw, 1.35rem)
  text-shadow: 2px 2px 0 #000

  // A personal best in progress is worth shouting about — it is the single
  // strongest "one more run" hook this game has.
  &.is-record
    color: #ffd93c
    animation: hud-record 1.4s ease-in-out infinite

.wave-hud__sep
  color: #5b7096

.wave-hud__bar
  position: relative
  flex: 1
  height: clamp(0.28rem, 1.2vw, 0.45rem)
  border-radius: 999px
  background-color: rgba(0, 0, 0, 0.5)
  overflow: hidden

.wave-hud__bar-fill
  height: 100%
  border-radius: 999px
  transition: width 220ms ease-out

  &.is-enemies
    background-image: linear-gradient(to right, #ff8a5a, #e5342a)

  &.is-gate
    background-image: linear-gradient(to right, #7ce0a0, #34a853)

  &.is-gate-critical
    background-image: linear-gradient(to right, #ff8080, #d32222)
    animation: hud-critical 0.8s ease-in-out infinite

.wave-hud__gate
  display: flex
  align-items: center
  gap: clamp(0.2rem, 1.2vw, 0.4rem)

.wave-hud__gate-icon
  flex: 0 0 auto
  width: clamp(0.7rem, 3vw, 0.95rem)
  height: clamp(0.7rem, 3vw, 0.95rem)
  color: #c9a227

@keyframes hud-critical
  0%, 100%
    opacity: 1
  50%
    opacity: 0.55

@keyframes hud-record
  0%, 100%
    text-shadow: 2px 2px 0 #000
  50%
    text-shadow: 2px 2px 0 #000, 0 0 10px rgba(255, 217, 60, 0.9)
</style>
