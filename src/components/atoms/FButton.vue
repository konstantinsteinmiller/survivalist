<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import { resolveIconLabel } from '@/components/icons/iconLabels'
import type { GameIconName } from '@/components/icons/iconNames'

/**
 * The primary CTA button.
 *
 * Sizing is FLUID, not scaled. The previous implementation applied Tailwind
 * `scale-60 / 75 / 80 / 90 / 110 / 120 / 125` transforms to a fixed-size body,
 * which had three problems: the transform did not affect layout (so buttons
 * overlapped their neighbours at large sizes and left dead gaps at small ones),
 * the border/shadow scaled with it (going blurry or hairline), and hit targets
 * drifted away from the painted pixels.
 *
 * Every dimension is now a `clamp(min, preferred-in-vw/vh, max)`, so the button
 * grows smoothly from a 320 px phone to a 4K desktop while never collapsing
 * below a comfortable 44 px touch target.
 */

interface Props {
  label?: string
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
  variant?: 'default' | 'brawl'
  isDisabled?: boolean
  colorFrom?: string
  colorTo?: string
  shadowColor?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  attention?: boolean
  /** Stretch to the container's width. Off by default so a button in a row
   *  sizes to its content instead of fighting its siblings. */
  block?: boolean
  /** A glyph from the shared set, drawn beside the label. */
  icon?: GameIconName
  /** Which side the glyph sits on. Right by default: the label is what the eye
   *  reads first, the glyph confirms the action. */
  iconPosition?: 'left' | 'right'
  /**
   * Drop the label and draw only the glyph, in a square button.
   *
   * This is what lets a row of actions cost one line instead of two. An
   * icon-only button has no accessible name of its own, so the caller MUST
   * pass an `aria-label`.
   */
  iconOnly?: boolean
  /** Required whenever the button has no visible text. */
  ariaLabel?: string
  /**
   * Grow the whole control by this factor - the "this is the one that ends the
   * screen" mark for a row of otherwise identical glyph buttons.
   *
   * Multiplies INSIDE the clamp terms rather than applying a `transform:
   * scale()`, so the layout box grows with the paint and the row gutters
   * correctly around it. A transform would leave the neighbours' gaps wrong and
   * the hit target drifting off the painted pixels - which is the bug this
   * component was rewritten to kill in the first place.
   */
  emphasis?: number
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  type: 'primary',
  variant: 'default',
  size: 'md',
  attention: false,
  block: false,
  iconPosition: 'right',
  iconOnly: false,
  emphasis: 1
})

defineEmits(['click'])

const { t, te } = useI18n()

/**
 * An icon-only button has no text to be announced, so it needs a name from
 * somewhere. The caller's `ariaLabel` is the right answer and normally present;
 * the shared map in `iconLabels.ts` is the floor under the call site that
 * forgets. A button that still has its caption needs neither — its own text is
 * its name, and an `aria-label` there would silently override it.
 */
const resolvedAriaLabel = computed<string | undefined>(() => {
  if (props.ariaLabel) return props.ariaLabel
  return props.iconOnly ? resolveIconLabel(undefined, props.icon, t, te) : undefined
})

const theme = computed(() => {
  switch (props.type) {
    case 'secondary':
      return {
        from: props.colorFrom ?? '#50aaff',
        to: props.colorTo ?? '#2266ff',
        shadow: props.shadowColor ?? '#102e7a'
      }
    case 'danger':
      return {
        from: props.colorFrom ?? '#ff6b5a',
        to: props.colorTo ?? '#c62828',
        shadow: props.shadowColor ?? '#6b1212'
      }
    case 'success':
      return {
        from: props.colorFrom ?? '#67e08a',
        to: props.colorTo ?? '#1f9d4d',
        shadow: props.shadowColor ?? '#0e5c2c'
      }
    // The rewarded-video gold, named rather than respelled. It is the one
    // button in the game that earns money, so it is the one whose colour is
    // least allowed to drift between screens.
    case 'warning':
      return {
        from: props.colorFrom ?? '#ffcd00',
        to: props.colorTo ?? '#f7a000',
        shadow: props.shadowColor ?? '#7a5a12'
      }
    default:
      return {
        from: props.colorFrom ?? '#ffcd00',
        to: props.colorTo ?? '#f7a000',
        shadow: props.shadowColor ?? '#1a2b4b'
      }
  }
})

/**
 * Per-size fluid metrics. The `vw` term is what makes the button responsive;
 * the min/max clamp keeps it usable at both extremes. `--fbtn-min-h` is never
 * below 2.25rem (36px) for `sm` and 2.75rem (44px) elsewhere — the WCAG touch
 * target floor — so no parent layout can crush the control out of existence.
 */
const sizeVars = computed<Record<string, string>>(() => {
  switch (props.size) {
    case 'sm':
      return {
        '--fbtn-font': 'clamp(0.7rem, 2.6vw, 0.95rem)',
        '--fbtn-px': 'clamp(0.6rem, 2.6vw, 1rem)',
        '--fbtn-py': 'clamp(0.3rem, 1.2vw, 0.5rem)',
        '--fbtn-min-w': 'clamp(3.5rem, 18vw, 6rem)',
        '--fbtn-min-h': '2.25rem',
        '--fbtn-radius': 'clamp(0.5rem, 2vw, 0.85rem)'
      }
    case 'lg':
      return {
        '--fbtn-font': 'clamp(1rem, 4.2vw, 1.6rem)',
        '--fbtn-px': 'clamp(1.1rem, 5vw, 2.2rem)',
        '--fbtn-py': 'clamp(0.55rem, 2.2vw, 0.95rem)',
        '--fbtn-min-w': 'clamp(6.5rem, 34vw, 12rem)',
        '--fbtn-min-h': '3rem',
        '--fbtn-radius': 'clamp(0.75rem, 3vw, 1.35rem)'
      }
    case 'xl':
      return {
        '--fbtn-font': 'clamp(1.15rem, 5vw, 2rem)',
        '--fbtn-px': 'clamp(1.4rem, 6vw, 2.8rem)',
        '--fbtn-py': 'clamp(0.65rem, 2.6vw, 1.15rem)',
        '--fbtn-min-w': 'clamp(8rem, 42vw, 15rem)',
        '--fbtn-min-h': '3.25rem',
        '--fbtn-radius': 'clamp(0.85rem, 3.4vw, 1.6rem)'
      }
    default:
      return {
        '--fbtn-font': 'clamp(0.85rem, 3.4vw, 1.25rem)',
        '--fbtn-px': 'clamp(0.85rem, 4vw, 1.6rem)',
        '--fbtn-py': 'clamp(0.45rem, 1.8vw, 0.75rem)',
        '--fbtn-min-w': 'clamp(5rem, 26vw, 9rem)',
        '--fbtn-min-h': '2.75rem',
        '--fbtn-radius': 'clamp(0.65rem, 2.6vw, 1.1rem)'
      }
  }
})

/**
 * Emphasis multiplies every fluid metric, so a 1.2x button is a genuinely
 * larger BOX: `calc(clamp(...) * 1.2)` clamps first and scales after, which
 * keeps the floors meaningful. The border width and the depth plate offset are
 * deliberately left alone - they read as the material the buttons are cut
 * from, and scaling them makes the emphasised one look like a different set.
 */
const scaled = (v: string, e: number): string => (e === 1 ? v : `calc(${v} * ${e})`)

const styleVars = computed(() => {
  const e = Number.isFinite(props.emphasis) && props.emphasis > 0 ? props.emphasis : 1
  const vars = Object.fromEntries(
    Object.entries(sizeVars.value).map(([key, value]) => [key, scaled(value, e)])
  )
  return {
    ...vars,
    '--fbtn-from': theme.value.from,
    '--fbtn-to': theme.value.to,
    '--fbtn-shadow': theme.value.shadow
  }
})
</script>

<template lang="pug">
  button.f-button(
    type="button"
    :style="styleVars"
    :class="[\
      variant === 'brawl' ? 'is-brawl' : '',\
      block ? 'is-block' : '',\
      attention ? 'attention-bounce' : '',\
      isDisabled ? 'is-disabled' : '',\
      iconOnly ? 'is-icon-only' : ''\
    ]"
    :aria-label="resolvedAriaLabel"
    :disabled="isDisabled"
    @click="!isDisabled && $emit('click')"
  )
    //- 3D depth plate behind the body.
    span.f-button__shadow(aria-hidden="true")
    span.f-button__body
      //- Classic top shine.
      span.f-button__shine(aria-hidden="true")
      //- Glyph-only. A separate `v-if` rather than a `v-else` on the label, so
      //- an icon-only button that was passed no icon still renders its slot
      //- instead of an empty box.
      GameIcon.f-button__glyph.is-solo(v-if="iconOnly && icon" :name="icon")
      template(v-else)
        GameIcon.f-button__glyph(v-if="icon && iconPosition === 'left'" :name="icon")
        span.f-button__text
          slot {{ label }}
        GameIcon.f-button__glyph(v-if="icon && iconPosition === 'right'" :name="icon")
</template>

<style scoped lang="sass">
.f-button
  position: relative
  display: inline-flex
  align-items: center
  justify-content: center
  // Floors that guarantee the control can never be collapsed to nothing by a
  // flex/grid parent — the "invisible button" failure mode.
  min-width: var(--fbtn-min-w)
  min-height: var(--fbtn-min-h)
  padding: 0
  border: 0
  background: none
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  transition: transform 90ms ease-out, filter 90ms ease-out

  &.is-block
    display: flex
    width: 100%

  &:hover:not(.is-disabled)
    filter: brightness(1.08)

  &:active:not(.is-disabled)
    transform: translateY(2px) scale(0.97)

  &.is-disabled
    opacity: 0.5
    filter: grayscale(1)
    cursor: not-allowed

  // Glyph-only: a square button, not a pill with a lonely icon adrift in it.
  // The width floor becomes the height floor, so the control is as tall as it
  // is wide at every size and emphasis - and dropping the caption cannot
  // collapse it, because the caption was never what held it open.
  &.is-icon-only
    min-width: var(--fbtn-min-h)

    .f-button__body
      min-width: var(--fbtn-min-h)
      padding-inline: var(--fbtn-py)

  &.is-brawl
    transform: skewX(-10deg)

    &:active:not(.is-disabled)
      transform: skewX(-10deg) translateY(2px) scale(0.97)

    .f-button__text
      transform: skewX(10deg)
      font-style: italic
      letter-spacing: -0.01em

.f-button__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: var(--fbtn-radius)
  background-color: var(--fbtn-shadow)

.f-button__body
  position: relative
  display: flex
  align-items: center
  justify-content: center
  gap: 0.4em
  // The body owns the type scale so the glyph can size itself in `em` off it -
  // one metric for label and icon, which is what keeps them optically matched
  // at every size and emphasis.
  font-size: var(--fbtn-font)
  width: 100%
  min-height: var(--fbtn-min-h)
  padding: var(--fbtn-py) var(--fbtn-px)
  border: 2px solid #0f1a30
  border-radius: var(--fbtn-radius)
  background-image: linear-gradient(to bottom, var(--fbtn-from), var(--fbtn-to))
  overflow: hidden

.f-button__shine
  position: absolute
  inset-inline: 0
  top: 0
  height: 48%
  background-color: rgba(255, 255, 255, 0.25)
  border-radius: var(--fbtn-radius) var(--fbtn-radius) 0 0
  pointer-events: none

// Nested rather than written flat, and that is load-bearing: `GameIcon`'s own
// scoped rule is `.game-icon[data-v-…]` — one class plus one attribute, exactly
// the same specificity a flat `.f-button__glyph[data-v-…]` would have. On a tie the
// winner is whichever stylesheet the bundler happened to emit last. Nesting
// adds the ancestor class and settles it.
.f-button__body .f-button__glyph
  position: relative
  flex: 0 0 auto
  // Sized in `em` off the body's font size, so one metric drives the label and
  // the glyph together at every size and emphasis factor.
  width: 1.25em
  height: 1.25em
  // The same hard black offset the captions wear, so a glyph button and a text
  // button read as the same material.
  filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.85))

  // Alone in the button it IS the control, not an ornament beside a word.
  &.is-solo
    width: 1.6em
    height: 1.6em

.f-button__text
  position: relative
  display: block
  color: #fff
  font-weight: 900
  text-transform: uppercase
  font-size: var(--fbtn-font)
  line-height: 1.15
  white-space: nowrap
  text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000

.attention-bounce
  animation: fbtn-bounce 0.6s infinite alternate

@keyframes fbtn-bounce
  from
    translate: 0 0
  to
    translate: 0 -5px
</style>
