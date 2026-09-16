<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'

/**
 * ─── The intro's skip button ────────────────────────────────────────────────
 *
 * Bottom-right, on every device, and deliberately the loudest thing on screen
 * that is not the cutscene.
 *
 * ── Why it is a real button and not "press anywhere" ──
 *
 * "Press anywhere" was the original design (`cutscenes.md` §2.5) on the
 * argument that the skip gesture is also the tutorial gesture, so impatience
 * routes into competence. It is a nice argument and it loses to a simpler one:
 * a player who does not KNOW they can leave is a player who feels trapped, and
 * nine seconds of feeling trapped at second zero of a session is exactly the
 * thing this cutscene was built not to cost. A visible affordance is worth more
 * than a clever invisible one.
 *
 * It also makes the opposite promise, which matters just as much: everywhere
 * that is NOT this button is safe to touch. A player who wants to watch can put
 * their thumb on the screen without ending the thing they are watching.
 *
 * ── The shape ──
 *
 * A caption and a glyph, not a glyph alone. This is the one control in the game
 * whose meaning cannot be inferred from context — every other icon-only button
 * sits in a place that explains it — and "skip" has no universally read mark.
 * The word is short in every locale the game ships (`intro.skip`), and the
 * double-chevron beside it is the convention people arrive with from video.
 *
 * Sized well past the 44 px touch floor and pinned clear of the safe-area
 * insets, because the bottom-right corner is exactly where a phone puts its
 * home indicator.
 */

const { t } = useI18n()
const emit = defineEmits<{ skip: [] }>()
</script>

<template lang="pug">
  button.cut-skip(
    type="button"
    :aria-label="t('intro.skip')"
    @click="emit('skip')"
  )
    span.cut-skip__label {{ t('intro.skip') }}
    GameIcon.cut-skip__icon(name="skip-forward")
</template>

<style scoped lang="sass">
.cut-skip
  position: absolute
  z-index: 40
  right: calc(clamp(0.6rem, 3vw, 1.1rem) + env(safe-area-inset-right, 0px))
  bottom: calc(clamp(0.6rem, 3vw, 1.1rem) + env(safe-area-inset-bottom, 0px))
  display: inline-flex
  align-items: center
  gap: clamp(0.3rem, 1.6vw, 0.5rem)
  // Comfortably past the 44px touch floor at every size, and the padding is
  // what gets it there rather than a min-width — so the German caption grows
  // the button instead of overflowing it.
  min-height: 2.75rem
  padding: clamp(0.5rem, 2.4vw, 0.7rem) clamp(0.8rem, 3.4vw, 1.15rem)
  border: 2px solid rgba(255, 255, 255, 0.35)
  border-radius: 999px
  // Dark and translucent rather than a solid plate: it has to be legible over
  // a night sky, a lit arena and a grey road without ever being the brightest
  // thing in the frame.
  background-color: rgba(8, 12, 22, 0.62)
  backdrop-filter: blur(3px)
  color: rgba(255, 255, 255, 0.92)
  font-weight: 900
  text-transform: uppercase
  letter-spacing: 0.04em
  font-size: clamp(0.72rem, 3.2vw, 0.95rem)
  line-height: 1
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8)
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  transition: transform 90ms ease-out, background-color 120ms ease-out, border-color 120ms ease-out
  // It arrives a beat after the cutscene does. Not a flourish: a button that is
  // already there on frame one is the first thing the eye lands on, and the
  // first thing the eye lands on should be the crowned one.
  animation: cut-skip-in 400ms ease-out 700ms both

  &:hover
    background-color: rgba(18, 26, 44, 0.78)
    border-color: rgba(255, 255, 255, 0.55)

  &:active
    transform: translateY(2px) scale(0.97)

  &:focus-visible
    outline: 3px solid rgba(255, 217, 60, 0.9)
    outline-offset: 3px

.cut-skip__label
  white-space: nowrap

.cut-skip__icon
  flex: 0 0 auto
  width: 1.05em
  height: 1.05em
  opacity: 0.9

@keyframes cut-skip-in
  from
    opacity: 0
    transform: translateX(0.5rem)
  to
    opacity: 1
    transform: translateX(0)

@media (prefers-reduced-motion: reduce)
  .cut-skip
    animation: none
</style>
