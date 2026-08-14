<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isMobilePortrait } from '@/use/useUser'
import { mobileCheck } from '@/utils/function'

/**
 * The first thing a new player ever sees.
 *
 * A crowd runner has exactly one control, and a player who does not find it in
 * the first few seconds bounces. Every other primer in this game is a pill of
 * text that appears while the road is already moving; this one holds the road
 * still and asks for the gesture, because "move" is the only lesson that cannot
 * be taught while the player is also being asked to survive.
 *
 * Three rules it is built to:
 *
 *   1. IT IS NOT A PAGE. There is no OK button, no dialog, nothing to dismiss.
 *      The player leaves it by doing the thing — see `steerOnly` and the
 *      movement clock in `GameScene`. A tutorial you can click past is a
 *      tutorial that teaches clicking past tutorials.
 *   2. IT NEVER EATS THE GESTURE. `pointer-events: none` all the way down, so
 *      the finger that is learning to steer is steering, not being intercepted
 *      by the thing explaining steering.
 *   3. IT SHOWS THE PLAYER'S OWN DEVICE. A finger that swipes on touch, a
 *      pointer that glides on desktop. The wrong glyph reads as a game built
 *      for somebody else.
 *
 * The squad stays lit underneath: the scrim is a ring, not a sheet, so the one
 * thing the player is being asked to look at is the one thing not dimmed.
 */

interface Props {
  /** 0..1 — how much of the required second of movement has been done. Drives
   *  the ring, which is the only feedback that the gesture is working. */
  progress: number
}

const props = defineProps<Props>()
const { t } = useI18n()

const isTouch = computed(() => mobileCheck() || isMobilePortrait.value
  || (typeof window !== 'undefined' && navigator.maxTouchPoints > 0))

const label = computed(() => t(`tutorial.${isTouch.value ? 'touch' : 'desktop'}`))

/** Ring geometry, as stroke-dashoffset over a 100-unit circumference. */
const RING_LEN = 100
const dash = computed(() => `${Math.max(0, Math.min(1, props.progress)) * RING_LEN} ${RING_LEN}`)
</script>

<template lang="pug">
  Transition(name="tut")
    div.tut(aria-live="polite")
      //- The lightbox itself: a soft hole over the squad, dark everywhere else.
      div.tut__scrim

      div.tut__stage
        //- The gesture. One glyph, one axis, looping — a swipe on touch, a
        //- gliding pointer on desktop.
        div.tut__gesture
          div.tut__trail
          div.tut__hand(:class="isTouch ? 'tut__hand--touch' : 'tut__hand--mouse'")
            svg(v-if="isTouch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true")
              path(d="M9 11V6a2 2 0 1 1 4 0v5")
              path(d="M13 8a2 2 0 1 1 4 0v6a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.3-2.4L4 15a1.6 1.6 0 0 1 2.6-1.9L8 15")
            svg(v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true")
              path(d="M5 3l14 7.5-6 1.6L10.6 19z")

        span.tut__text {{ label }}

        //- The clock. Fills only while the squad is actually moving, so it is
        //- feedback rather than a countdown the player has to wait out.
        svg.tut__ring(viewBox="0 0 36 36" aria-hidden="true")
          circle.tut__ring-track(cx="18" cy="18" r="15.9155")
          circle.tut__ring-fill(cx="18" cy="18" r="15.9155" :stroke-dasharray="dash")
</template>

<style scoped lang="sass">
.tut
  position: absolute
  inset: 0
  // Rule 2: the gesture belongs to the game underneath, always.
  pointer-events: none
  display: flex
  flex-direction: column
  align-items: center
  justify-content: flex-end
  z-index: 30

.tut__scrim
  position: absolute
  inset: 0
  // A hole rather than a sheet: the squad sits at ~72 % down the screen (see
  // `CROWD_SCREEN_Y`) and stays lit, everything else recedes.
  background: radial-gradient(circle at 50% 72%, rgba(4, 8, 18, 0) 0%, rgba(4, 8, 18, 0.42) 26%, rgba(4, 8, 18, 0.82) 62%)

.tut__stage
  position: relative
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(0.5rem, 2.4vw, 0.9rem)
  // Sits above the crowd, not on top of it — the player has to be able to see
  // what their finger is doing to the squad.
  margin-bottom: calc(38vh + env(safe-area-inset-bottom, 0px))
  padding: 0 1rem

.tut__gesture
  position: relative
  width: min(58vw, 15rem)
  height: clamp(2.6rem, 11vw, 3.4rem)

.tut__trail
  position: absolute
  left: 8%
  right: 8%
  top: 50%
  height: 2px
  translate: 0 -50%
  border-radius: 999px
  background: linear-gradient(90deg, rgba(255, 217, 60, 0) 0%, rgba(255, 217, 60, 0.55) 50%, rgba(255, 217, 60, 0) 100%)

.tut__hand
  position: absolute
  top: 50%
  left: 50%
  width: clamp(1.7rem, 7.5vw, 2.4rem)
  height: clamp(1.7rem, 7.5vw, 2.4rem)
  color: #ffd93c
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8))
  animation: tut-swipe 2.2s ease-in-out infinite

  svg
    width: 100%
    height: 100%

.tut__text
  max-width: min(88vw, 24rem)
  color: #fff
  font-weight: 900
  text-align: center
  line-height: 1.25
  font-size: clamp(0.78rem, 3.6vw, 1.1rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.9)

.tut__ring
  width: clamp(1.5rem, 6vw, 2rem)
  height: clamp(1.5rem, 6vw, 2rem)
  rotate: -90deg

.tut__ring-track
  fill: none
  stroke: rgba(255, 255, 255, 0.22)
  stroke-width: 3

.tut__ring-fill
  fill: none
  stroke: #ffd93c
  stroke-width: 3
  stroke-linecap: round
  transition: stroke-dasharray 90ms linear

// The whole point of the glyph: one axis, back and forth, at a pace a hand can
// copy. The pause at each end is what makes it read as a deliberate swipe
// rather than as a slider animating.
@keyframes tut-swipe
  0%, 8%
    translate: -140% -50%
  46%, 54%
    translate: 40% -50%
  92%, 100%
    translate: -140% -50%

.tut-enter-active, .tut-leave-active
  transition: opacity 320ms ease-out

.tut-enter-from, .tut-leave-to
  opacity: 0

@media (prefers-reduced-motion: reduce)
  .tut__hand
    animation-duration: 4.4s
</style>
