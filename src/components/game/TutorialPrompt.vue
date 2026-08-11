<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * The "Need a tutorial?" offer.
 *
 * Shown beside the tower on a first run instead of launching the coach marks
 * automatically. Two reasons for the ask:
 *
 *   1. An unrequested tutorial is an interruption. A returning player on a new
 *      device, or anyone who has played anything in this genre before, opens
 *      the game and is immediately told what a Gate is. Offering costs one tap
 *      to decline and nothing to ignore.
 *   2. It makes the DECLINE explicit and therefore persistable. "Skip" is an
 *      answer; silently dismissing an auto-started overlay is not, and the game
 *      would have to guess whether to ask again next session.
 *
 * Positioned in screen space by the caller, which projects a world coordinate
 * to the right of the tower — so it sits next to the thing it is about, and
 * follows the camera.
 */

interface Props {
  /** Screen-space anchor: the box's left edge and vertical centre. */
  x: number
  y: number
  /** True when the box sits to the RIGHT of the tower — flips the tail. */
  onRight?: boolean
}

withDefaults(defineProps<Props>(), { onRight: true })
defineEmits<{ (e: 'start'): void; (e: 'skip'): void }>()

const { t } = useI18n()

/** Fixed width so the caller can decide which side of the tower it fits on
 *  before it has been laid out. */
const WIDTH_PX = 190
</script>

<template lang="pug">
  Transition(name="tut-prompt")
    div.tut-prompt(
      :class="onRight ? 'is-right' : 'is-left'"
      :style="{ left: x + 'px', top: y + 'px', width: WIDTH_PX + 'px' }"
    )
      span.tut-prompt__tail(aria-hidden="true")
      span.tut-prompt__shadow(aria-hidden="true")
      div.tut-prompt__body
        span.tut-prompt__text {{ t('tutorial.offer') }}
        div.tut-prompt__actions
          button.tut-prompt__btn.is-yes(type="button" @click="$emit('start')")
            | {{ t('tutorial.start') }}
          button.tut-prompt__btn.is-no(type="button" @click="$emit('skip')")
            | {{ t('tutorial.skip') }}
</template>

<style scoped lang="sass">
.tut-prompt
  position: absolute
  // The anchor is the box's left edge and vertical centre, so it reads as
  // pointing AT the tower rather than sitting on top of it.
  translate: 0 -50%
  z-index: 25
  pointer-events: auto
  animation: tut-prompt-bob 2.4s ease-in-out infinite

.tut-prompt__shadow
  position: absolute
  inset: 0
  transform: translateY(4px)
  border-radius: clamp(0.6rem, 3vw, 1rem)
  background-color: #0d1830

.tut-prompt__body
  position: relative
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(0.35rem, 1.8vw, 0.6rem)
  padding: clamp(0.5rem, 2.4vw, 0.8rem) clamp(0.6rem, 3vw, 1rem)
  border: 2px solid #ffd64a
  border-radius: clamp(0.6rem, 3vw, 1rem)
  background-image: linear-gradient(to bottom, rgba(32, 52, 94, 0.98), rgba(15, 26, 52, 0.98))
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55)

// A speech tail pointing back at the tower — on whichever side the tower is.
.tut-prompt__tail
  position: absolute
  top: 50%
  translate: 0 -50%
  width: 0
  height: 0
  border-top: 0.45rem solid transparent
  border-bottom: 0.45rem solid transparent

.is-right .tut-prompt__tail
  left: -0.45rem
  border-right: 0.5rem solid #ffd64a

.is-left .tut-prompt__tail
  right: -0.45rem
  border-left: 0.5rem solid #ffd64a

.tut-prompt__text
  color: #fff
  font-weight: 900
  text-align: center
  line-height: 1.2
  font-size: clamp(0.72rem, 3.2vw, 0.95rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.7)

.tut-prompt__actions
  display: flex
  align-items: center
  gap: clamp(0.3rem, 1.6vw, 0.5rem)

.tut-prompt__btn
  // Tap-target floor: this is the first thing a new player is asked to hit.
  min-height: 2.25rem
  padding: 0.25em 0.9em
  border: 2px solid #0f1a30
  border-radius: 999px
  color: #fff
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.6rem, 2.8vw, 0.8rem)
  line-height: 1.2
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.6)
  transition: transform 90ms ease-out, filter 90ms ease-out

  &:hover
    filter: brightness(1.1)

  &:active
    transform: translateY(2px) scale(0.96)

.is-yes
  background-image: linear-gradient(to bottom, #67e08a, #1f9d4d)

.is-no
  background-image: linear-gradient(to bottom, #ff7a6a, #c62f22)

@keyframes tut-prompt-bob
  0%, 100%
    transform: translateY(0)
  50%
    transform: translateY(-4px)

@media (prefers-reduced-motion: reduce)
  .tut-prompt
    animation: none

.tut-prompt-enter-active, .tut-prompt-leave-active
  transition: opacity 180ms ease-out, scale 180ms ease-out

.tut-prompt-enter-from, .tut-prompt-leave-to
  opacity: 0
  scale: 0.9
</style>
