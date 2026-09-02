<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import { resolveIconLabel } from '@/components/icons/iconLabels'
import type { GameIconName } from '@/components/icons/iconNames'

/**
 * The standard HUD chip used by every meta button in the bottom rows
 * (Daily Rewards, Missions, Achievements, Battle Pass, Ad Reward, Settings,
 * Tech Tree, Themes).
 *
 * Exists to kill the copy-pasted `scale-80 sm:scale-100` wrappers that used to
 * live in each of those components. Those transforms shrank the painted chip
 * without shrinking its layout box, so the bottom row reserved full-size gaps
 * around 80%-size buttons and the spacing looked wrong on exactly the screens
 * that could least afford it. Everything here is fluid `clamp()` sizing with a
 * hard 2.5rem floor, so the row is compact on a 320px phone, comfortable on a
 * tablet, and never collapses.
 *
 * The glyph normally comes from the shared set via the `icon` prop; the default
 * slot stays for the handful of marks that are art rather than UI (a bitmap
 * prop, a component with its own fallback logic). `badge` = the corner
 * indicator (claim count, reward pill, timer).
 */

interface Props {
  /** Colour family. `gold` is the "there is something to collect" default. */
  tone?: 'gold' | 'blue' | 'green' | 'slate'
  /** Soft glow pulse — used when the button has an unclaimed reward. */
  attention?: boolean
  isDisabled?: boolean
  /** A glyph from the shared set. Ignored when the default slot is filled. */
  icon?: GameIconName
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'gold',
  attention: false,
  isDisabled: false
})

defineEmits(['click'])

const slots = useSlots()
const { t, te } = useI18n()

/** The caller's label, or the shared floor under a glyph that arrived without
 *  one — see `iconLabels.ts`. */
const resolvedAriaLabel = computed<string | undefined>(
  () => resolveIconLabel(props.ariaLabel, props.icon, t, te)
)
</script>

<template lang="pug">
  button.f-hud-button(
    type="button"
    :class="[`tone-${tone}`, { 'is-attention': attention, 'is-disabled': isDisabled }]"
    :aria-label="resolvedAriaLabel"
    :disabled="isDisabled"
    @click="!isDisabled && $emit('click')"
  )
    span.f-hud-button__shadow(aria-hidden="true")
    span.f-hud-button__body
      GameIcon.f-hud-button__glyph(v-if="icon && !slots.default" :name="icon")
      slot
    span.f-hud-button__badge(v-if="$slots.badge")
      slot(name="badge")
</template>

<style scoped lang="sass">
.f-hud-button
  position: relative
  display: inline-flex
  align-items: center
  justify-content: center
  flex: 0 0 auto
  // Floors keep the tap target legal and the chip visible in any layout.
  min-width: 2.5rem
  min-height: 2.5rem
  width: clamp(2.5rem, 11vw, 3.4rem)
  height: clamp(2.5rem, 11vw, 3.4rem)
  padding: 0
  border: 0
  background: none
  cursor: pointer
  pointer-events: auto
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  transition: transform 90ms ease-out, filter 90ms ease-out

  &:hover:not(.is-disabled)
    filter: brightness(1.08)

  &:active:not(.is-disabled)
    transform: translateY(2px) scale(0.94)

  &.is-disabled
    opacity: 0.45
    filter: grayscale(1)
    cursor: not-allowed

.f-hud-button__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: clamp(0.45rem, 2vw, 0.7rem)

.f-hud-button__body
  position: relative
  display: flex
  align-items: center
  justify-content: center
  width: 100%
  height: 100%
  border: 2px solid #0f1a30
  border-radius: clamp(0.45rem, 2vw, 0.7rem)
  color: #fff

  // The glyph fills a consistent fraction of the chip regardless of chip size,
  // so a row of mixed icons reads as one set. A bitmap needs the larger box to
  // read as the same optical size — its art carries its own margin, a vector
  // glyph does not.
  .f-hud-button__glyph
    width: 54%
    height: 54%

  :slotted(svg), :slotted(img)
    width: 62%
    height: 62%
    pointer-events: none

.f-hud-button__badge
  position: absolute
  top: 0
  right: 0
  translate: 30% -30%
  display: flex
  align-items: center
  justify-content: center
  pointer-events: none

// ─── Tones ──────────────────────────────────────────────────────────────────

.tone-gold
  .f-hud-button__shadow
    background-color: #7a5a12
  .f-hud-button__body
    background-image: linear-gradient(to bottom, #ffcd00, #f7a000)

.tone-blue
  .f-hud-button__shadow
    background-color: #102e7a
  .f-hud-button__body
    background-image: linear-gradient(to bottom, #50aaff, #2266ff)

.tone-green
  .f-hud-button__shadow
    background-color: #0e5c2c
  .f-hud-button__body
    background-image: linear-gradient(to bottom, #67e08a, #1f9d4d)

.tone-slate
  .f-hud-button__shadow
    background-color: #151d31
  .f-hud-button__body
    background-image: linear-gradient(to bottom, #4a5878, #2d3855)

.is-attention
  animation: hud-pulse 1.6s ease-in-out infinite

@keyframes hud-pulse
  0%, 100%
    filter: drop-shadow(0 0 0 rgba(255, 200, 0, 0))
  50%
    filter: drop-shadow(0 0 8px rgba(255, 200, 0, 0.75))
</style>
