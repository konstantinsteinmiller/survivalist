<script setup lang="ts">
import { computed } from 'vue'

/**
 * Square icon button.
 *
 * Like `FButton`, the old `scale-70 / 80 / 110` transform ladder is gone: it
 * shrank the painted button without shrinking its layout box (leaving phantom
 * gaps) and it decoupled the tap target from the visible pixels. The button is
 * now a real fluid square with an explicit `min-height` floor of 2.5rem (40 px)
 * so it stays tappable and can never be collapsed to zero.
 */

interface Props {
  icon?: 'close' | 'left' | 'right' | 'plus' | 'minus' | 'recenter'
  imgSrc?: string
  /** Accessible label — required whenever the button has no visible text. */
  ariaLabel?: string
  type?: 'danger' | 'primary' | 'secondary' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  isDisabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'close',
  type: 'danger',
  size: 'md',
  isDisabled: false
})

const emit = defineEmits(['click'])

const selectedIcon = computed(() => {
  switch (props.icon) {
    case 'left': return 'M15 19l-7-7 7-7'
    case 'right': return 'M9 5l7 7-7 7'
    case 'plus': return 'M12 5v14M5 12h14'
    case 'minus': return 'M5 12h14'
    case 'recenter': return 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'
    default: return 'M6 18L18 6M6 6l12 12'
  }
})

const theme = computed(() => {
  switch (props.type) {
    case 'secondary':
      return { from: '#50aaff', to: '#2266ff', shadow: '#102e7a' }
    case 'primary':
      return { from: '#ffcd00', to: '#f7a000', shadow: '#1a2b4b' }
    case 'neutral':
      return { from: '#4a5878', to: '#2d3855', shadow: '#151d31' }
    default:
      return { from: '#ff5a5a', to: '#d32222', shadow: '#6b1212' }
  }
})

const sizeVars = computed<Record<string, string>>(() => {
  switch (props.size) {
    case 'sm':
      return {
        '--fib-size': 'clamp(2.1rem, 8.5vw, 2.6rem)',
        '--fib-glyph': 'clamp(0.85rem, 3.6vw, 1.15rem)',
        '--fib-radius': 'clamp(0.4rem, 1.8vw, 0.65rem)'
      }
    case 'lg':
      return {
        '--fib-size': 'clamp(3rem, 12vw, 4rem)',
        '--fib-glyph': 'clamp(1.35rem, 5.5vw, 2rem)',
        '--fib-radius': 'clamp(0.6rem, 2.6vw, 1rem)'
      }
    default:
      return {
        '--fib-size': 'clamp(2.5rem, 10vw, 3.25rem)',
        '--fib-glyph': 'clamp(1.05rem, 4.4vw, 1.5rem)',
        '--fib-radius': 'clamp(0.5rem, 2.2vw, 0.8rem)'
      }
  }
})

const styleVars = computed(() => ({
  ...sizeVars.value,
  '--fib-from': theme.value.from,
  '--fib-to': theme.value.to,
  '--fib-shadow': theme.value.shadow
}))
</script>

<template lang="pug">
  button.f-icon-button(
    type="button"
    :style="styleVars"
    :class="{ 'is-disabled': isDisabled }"
    :aria-label="ariaLabel"
    :disabled="isDisabled"
    @click="!isDisabled && emit('click')"
  )
    span.f-icon-button__shadow(aria-hidden="true")
    span.f-icon-button__body
      img.f-icon-button__img(v-if="imgSrc" :src="imgSrc" alt="" draggable="false")
      svg.f-icon-button__svg(
        v-else
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      )
        path(stroke-linecap="round" stroke-linejoin="round" stroke-width="3" :d="selectedIcon")
</template>

<style scoped lang="sass">
.f-icon-button
  position: relative
  display: inline-flex
  align-items: center
  justify-content: center
  // A hard floor so the control survives any parent layout.
  min-width: 2.5rem
  min-height: 2.5rem
  width: var(--fib-size)
  height: var(--fib-size)
  padding: 0
  border: 0
  background: none
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  transition: transform 90ms ease-out, filter 90ms ease-out

  &:hover:not(.is-disabled)
    filter: brightness(1.1)

  &:active:not(.is-disabled)
    transform: translateY(2px) scale(0.94)

  &.is-disabled
    opacity: 0.45
    filter: grayscale(1)
    cursor: not-allowed

.f-icon-button__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: var(--fib-radius)
  background-color: var(--fib-shadow)

.f-icon-button__body
  position: relative
  display: flex
  align-items: center
  justify-content: center
  width: 100%
  height: 100%
  border: 2px solid #0f1a30
  border-radius: var(--fib-radius)
  background-image: linear-gradient(to bottom, var(--fib-from), var(--fib-to))
  color: #fff

.f-icon-button__svg
  width: var(--fib-glyph)
  height: var(--fib-glyph)

.f-icon-button__img
  width: calc(var(--fib-glyph) * 1.35)
  height: calc(var(--fib-glyph) * 1.35)
  object-fit: contain
  pointer-events: none
</style>
