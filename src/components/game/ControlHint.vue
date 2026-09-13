<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isMobilePortrait } from '@/use/useUser'
import { mobileCheck } from '@/utils/function'

/**
 * The on-screen control primer.
 *
 * A crowd runner has exactly one control and three ideas, and a player who
 * doesn't discover them in the first fifteen seconds bounces. So each hint is
 * explicit, phrased for the input device the player actually has, and it
 * retires itself the moment the action is performed — nagging a competent
 * player is its own kind of failure.
 *
 *   move    — the only control there is
 *   gate    — why you would ever stand still
 *   crate   — why you would ever go out of your way
 *   rate    — the second crate type, and the one nobody works out alone
 *   trap    — the red gates take survivors away
 *   divider — the pillar between two gates is lethal, and that is the whole
 *             reason a gate bank is a decision
 *   boss    — the one thing that can kill a big crowd instantly
 *   guard   — the boss's phase shield, which is the one moment in the game
 *             where the player's fire deliberately stops working. Without a
 *             word for it, "my bullets do nothing" reads as a bug.
 *   lever   — the weapon puzzle. The only hint here for a thing that is purely
 *             a BONUS: every other lesson in this list is something that will
 *             otherwise cost the player survivors, and this one costs them
 *             nothing at all. It is here because a beat with no consequence for
 *             missing it is a beat the road can never teach on its own.
 *   cage    — the rescue cage, on exactly the lever's terms and for exactly the
 *             lever's reason. It also carries a second job the lever's does
 *             not: a cage looks enough like a supply crate from a distance that
 *             "another box" is the default reading, so the hint has to say what
 *             is DIFFERENT about it rather than what it is.
 *   shieldBox
 *           — the auto-shield pickup, same again. Its specific misreading is
 *             the opposite one: the player already owns a shield with a three
 *             second timer, so the word "shield" alone would promise them the
 *             wrong object. The hint's load-bearing word is *waits*.
 *
 * ─── Being held quiet ───────────────────────────────────────────────────────
 *
 * `suppressed` is the one way anything outside this component can silence it,
 * and it exists because of a single measured disaster: at the first boss, the
 * gaze attack raises "Hold still" in the warning badge while the guard hint pill
 * says the boss's shield is up and its own answer is to move. Two instructions,
 * pointing opposite ways, in the first minute of the game, on the frame that
 * decides the fight. One tester lost 38 of 41 survivors standing in it.
 *
 * The rule the two now share is that a screen may carry exactly ONE instruction
 * at a time, and the one with a countdown on it wins — a warning is about this
 * second, a primer is about the game. So the scene holds this pill quiet for as
 * long as it is telling the player to do something else, and lets it back when
 * it is not.
 *
 * Held QUIET, not retired: `hint` is untouched, the hint has not been taught,
 * nothing is marked as seen, and the same pill with the same text comes back the
 * moment the flag drops. Suppression is a property of the FRAME, and the lesson
 * belongs to the run.
 */

export type HintId =
  | 'move' | 'gate' | 'crate' | 'rate' | 'trap' | 'divider' | 'boss' | 'guard' | 'lever'
  | 'cage' | 'shieldBox'

interface Props {
  hint: HintId | null
  /**
   * Hold the pill off the screen without touching the hint behind it.
   *
   * Default false. True hides the pill through the component's own transition —
   * so it leaves and returns the way it always does, rather than popping — and
   * changes nothing else: `hint` still says what is being taught, the text is
   * still computed for it, and dropping the flag brings the same pill back.
   *
   * The caller owns the WHY (see the block above). This component deliberately
   * does not know what it is being suppressed for: a pill that decided for
   * itself which of the scene's warnings outranked it would need to know about
   * every one of them, and would be wrong the first time a new one was added.
   */
  suppressed?: boolean
}

const props = withDefaults(defineProps<Props>(), { suppressed: false })
const { t } = useI18n()

/**
 * Whether the pill is on screen at all.
 *
 * Both halves in one condition so there is exactly one thing for the transition
 * to watch: a hint that retires and a hint that is being held quiet leave the
 * screen by the same 260 ms, which is the point — from the player's side there
 * is no difference between "that lesson is over" and "not now", and a pill that
 * vanished differently for the second would read as a glitch.
 */
const shown = computed(() => !!props.hint && !props.suppressed)

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
  //- `type="transition"` is LOAD-BEARING, not tidiness. `.control-hint` carries
  //- `animation: hint-breathe … infinite`, and Vue times a leave off whichever
  //- of transition-duration and animation-duration is longer — so it picked the
  //- 2.4 s animation and then waited for an `animationend` that an infinite
  //- animation never fires. The pill was removed from the render tree and left
  //- in the DOM FOREVER, breathing at full opacity.
  //-
  //- Measured in a browser during the grenade lesson: the component reported
  //- `suppressed: true, shown: false` while the element was still on screen over
  //- the lightbox. Nothing here caught it because `@vue/test-utils` stubs
  //- `Transition` by default and renders the children straight through — see
  //- `tests/game/controlHintSuppressed.test.ts`, which now pins the attribute.
  Transition(name="hint" type="transition")
    div.control-hint(v-if="shown")
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
  // The breathing stops while the pill is arriving or leaving. It is an
  // opacity loop and the transition is an opacity ramp; run together, the fade
  // reads as a flicker rather than as the pill going away.
  animation: none

.hint-enter-from, .hint-leave-to
  opacity: 0
  translate: 0 0.5rem

@keyframes hint-breathe
  0%, 100%
    opacity: 0.92
  50%
    opacity: 0.68
</style>
