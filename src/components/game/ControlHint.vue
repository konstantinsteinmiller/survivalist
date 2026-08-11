<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isMobilePortrait } from '@/use/useUser'
import { mobileCheck } from '@/utils/function'

/**
 * The on-screen control primer.
 *
 * A build-and-defend game has a non-obvious first action ("tap a block, THEN
 * tap the ground"), and a player who doesn't discover it in the first ten
 * seconds bounces. So the hint is explicit, phrased for the input device the
 * player actually has, and it retires itself the moment the action is performed
 * — nagging a competent player is its own kind of failure.
 */

export type HintId = 'selectBlock' | 'placeBlock' | 'camera' | 'callWave' | 'inspect'

interface Props {
  hint: HintId | null
}

const props = defineProps<Props>()
const { t } = useI18n()

const isTouch = computed(() => mobileCheck() || isMobilePortrait.value
  || (typeof window !== 'undefined' && navigator.maxTouchPoints > 0))

const text = computed(() => {
  if (!props.hint) return ''
  // Each hint has a touch and a pointer phrasing — "Tap" vs "Click", "Pinch"
  // vs "Scroll" — because a wrong verb reads as a bug.
  return t(`hints.${props.hint}.${isTouch.value ? 'touch' : 'desktop'}`)
})
</script>

<template lang="pug">
  Transition(name="hint")
    div.control-hint(v-if="hint")
      svg.control-hint__icon(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true")
        //- A pointing hand — universally readable as "do this".
        path(d="M9 11V6a2 2 0 1 1 4 0v5")
        path(d="M13 8a2 2 0 1 1 4 0v6a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.3-2.4L4 15a1.6 1.6 0 0 1 2.6-1.9L8 15")
      span.control-hint__text {{ text }}
</template>

<style scoped lang="sass">
.control-hint
  display: inline-flex
  align-items: center
  gap: clamp(0.25rem, 1.4vw, 0.5rem)
  // Floors so the hint is always readable, and a max so it never spans a
  // desktop screen edge-to-edge.
  min-height: 1.75rem
  max-width: min(90vw, 26rem)
  padding: clamp(0.22rem, 1.2vw, 0.45rem) clamp(0.55rem, 3vw, 1rem)
  border: 2px solid rgba(255, 255, 255, 0.18)
  border-radius: 999px
  background-color: rgba(8, 14, 28, 0.72)
  backdrop-filter: blur(3px)
  pointer-events: none
  animation: hint-breathe 2.4s ease-in-out infinite

.control-hint__icon
  flex: 0 0 auto
  width: clamp(0.85rem, 3.6vw, 1.1rem)
  height: clamp(0.85rem, 3.6vw, 1.1rem)
  color: #ffd93c

.control-hint__text
  color: #fff
  font-weight: 900
  text-align: center
  line-height: 1.2
  font-size: clamp(0.62rem, 2.9vw, 0.92rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)

.hint-enter-active, .hint-leave-active
  transition: opacity 260ms ease-out, translate 260ms ease-out

.hint-enter-from, .hint-leave-to
  opacity: 0
  translate: 0 0.5rem

@keyframes hint-breathe
  0%, 100%
    opacity: 0.92
  50%
    opacity: 0.68
</style>
