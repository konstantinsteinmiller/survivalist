<template lang="pug">
  //- `type="transition"`, for the same reason `ControlHint` needs it: `.incoming`
  //- is the transitioned element AND carries `animation: incoming-pulse …
  //- infinite`. Vue times a leave off whichever of the two clocks is longer,
  //- would pick the animation, and would then wait for an `animationend` that an
  //- infinite animation never fires — leaving the alarm mounted on screen for
  //- the rest of the run. The child glyph's own infinite flash is harmless: Vue
  //- reads the computed style of THIS element only.
  Transition(name="incoming" type="transition")
    div.incoming(
      v-if="show"
      :class="{ 'incoming--into': answer === 'into', 'incoming--still': answer === 'still' }"
      role="status"
      :aria-label="t('hud.incoming')"
    )
      //- The sign itself, through the art ladder: the PAINTING for this state,
      //- the canvas drawing `uiArt` makes of it, or the shared glyph. It used
      //- to be an inline SVG tinted by `currentColor`, which is why there are
      //- three drawables rather than one — a painting cannot be re-tinted, and
      //- the colour of this badge is the signal.
      ArtIcon.incoming__glyph(kind="ui" :id="`warn-${answer ?? 'away'}`" fallback="warning")
      //- The instruction, not just the alarm. A warning symbol says "something
      //- is wrong"; this says what to do about it, which is the only part that
      //- helps a player who has not worked out that the ring on the ground is
      //- dodgeable. One word, because it is read at a glance mid-dodge.
      span.incoming__word {{ t(answer === 'into' ? 'hud.getIn' : answer === 'still' ? 'hud.holdStill' : 'hud.dodge') }}
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ArtIcon from '@/components/icons/ArtIcon.vue'

/**
 * ─── The incoming-attack warning ────────────────────────────────────────────
 *
 * A badge in a FIXED corner, up for exactly as long as a big attack is winding
 * up.
 *
 * The in-world telegraphs — the ring on the ground, the falling rock — solve
 * "where is the damage coming from". This solves a different half of the same
 * problem: "am I about to be hit at all". A player whose eyes are on the boss,
 * or on their own thumb, has no reliable place to check, and the answer was
 * only ever painted on the one patch of road they were not looking at.
 *
 * So it is always in the same place. A corner badge is worth more than a
 * prettier in-world effect precisely because it never moves: it can be learned
 * once and then checked with peripheral vision, which is all a player steering
 * with a thumb has spare.
 *
 * Top RIGHT, and small. The left is where the run's own numbers live and the
 * middle is the road; the right corner is the only real estate that is quiet
 * during a fight. It is deliberately not a countdown — the ring on the ground
 * already says how long, and two clocks disagreeing is worse than one.
 */
const { t } = useI18n()

/**
 * `answer` is what the player has to DO, not what is coming.
 *
 * It arrives as a prop rather than being read from the simulation here for the
 * reason every other piece of state in this component does: the badge is a
 * renderer, and a component that asked the world its own questions would be a
 * second place the answer could be computed — and on the one frame the two
 * disagreed, the badge would print the wrong verb over the right mark.
 *
 * `'away'` is the badge's whole history and stays the default, so nothing that
 * has always said DODGE has to be re-checked. `'still'` is the boss's gaze —
 * the one attack whose answer is to stop moving (`GAZE_WATCH`).
 */
defineProps<{ show: boolean; answer?: 'away' | 'into' | 'still' }>()
</script>

<style scoped lang="sass">
.incoming
  position: absolute
  display: flex
  flex-direction: column
  align-items: center
  gap: 0.1rem
  // ─── How big the alarm is ──────────────────────────────────────────────────
  //
  // A TENTH OF THE SCREEN'S WIDTH, as a floor. This used to be `clamp(1.9rem,
  // 8.5vw, 2.6rem)`, which is a phone rule that a desktop window silently
  // repeals: 8.5vw only wins between roughly 360 px and 490 px of viewport, and
  // above that the badge is pinned at 2.6rem — about **2 %** of a 1920 px
  // screen, in the one corner a player is not looking at. The thing has to be
  // caught in peripheral vision while the eyes are on the crowd, and peripheral
  // vision reads SIZE before it reads shape or colour.
  //
  // The `vh` term is a guard, not a preference: 10vw on a landscape phone
  // (844 x 390) is a badge a fifth of the screen tall, and this is an overlay on
  // a fight, not the fight. It only ever binds where the viewport is much wider
  // than it is tall, which is exactly where 10vw stops being modest.
  --incoming-size: min(max(10vw, 1.9rem), 22vh)
  top: calc(clamp(2.6rem, 11vw, 3.6rem) + env(safe-area-inset-top, 0px))
  right: calc(clamp(0.4rem, 2.2vw, 0.8rem) + env(safe-area-inset-right, 0px))
  // Sized by its CONTENT, not by the glyph. The word under it is one short verb
  // in English and "Ausweichen" in German, and a box pinned to the glyph's width
  // would have pushed the longer ones off the right edge of the screen. Anchored
  // on the right, so anything wider grows inward across the road rather than out
  // of the viewport.
  color: #ffb32e
  // Never eats a steer — the player is mid-dodge when this is up.
  pointer-events: none
  z-index: 42
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7))
  animation: incoming-pulse 0.42s ease-in-out infinite

// Two classes on purpose: `ArtIcon`'s own `.art-icon { width: 100% }` is a
// single class too, and which of the two wins would otherwise depend on the
// order the bundler happens to emit the components in. The badge's size is not
// negotiable — it is the whole reason the alarm is caught in the corner of the
// eye.
.incoming .incoming__glyph
  width: var(--incoming-size)
  height: var(--incoming-size)
  display: block
  // The top of the beat, for the two rungs that are BITMAPS (the painting and
  // the canvas drawing): `color` tints the glyph fallback and nothing else, so
  // the flash to white that makes the alarm register in peripheral vision is
  // re-made here as brightness. Same clock as the badge's own pulse.
  animation: incoming-flash 0.42s ease-in-out infinite

@keyframes incoming-flash
  0%, 100%
    filter: none
  50%
    filter: brightness(1.45) saturate(0.72)

.incoming__word
  font-weight: 900
  // Tied to the glyph rather than to the viewport, so the word never detaches
  // from the triangle it belongs to. Floored at 0.55rem — the old minimum —
  // because a caption that scales all the way down stops being legible before
  // the glyph does.
  font-size: max(0.55rem, calc(var(--incoming-size) * 0.28))
  letter-spacing: 0.08em
  text-transform: uppercase
  line-height: 1
  color: #fff
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.8)
  white-space: nowrap

// Fast enough to read as an alarm rather than as decoration, and it flashes to
// white at the top of each beat so it still registers in peripheral vision.
@keyframes incoming-pulse
  0%, 100%
    transform: scale(1)
    color: #ffb32e
  50%
    transform: scale(1.16)
    color: #fff1c9

// ─── The "get in" badge ─────────────────────────────────────────────────────
//
// Cool blue, and it is the same blue the eye of a shock and the healer's ward
// are painted in. That pairing is the point: the player's eye is caught by the
// corner, reads one word, and then finds the ONLY thing on the road that is the
// same colour. An amber alarm over a blue destination would be two signals
// arguing about which one to trust.
.incoming--into
  color: #6ecbff
  animation-name: incoming-pulse-into

@keyframes incoming-pulse-into
  0%, 100%
    transform: scale(1)
    color: #6ecbff
  50%
    transform: scale(1.16)
    color: #eafaff

// ─── The "hold still" badge ─────────────────────────────────────────────────
//
// Violet, the eye's own colour (`drawBossGaze`), and it does NOT pulse in size.
// Every other badge throbs because it is an alarm that says "move"; this one's
// instruction is the opposite, and a badge bouncing in the corner while telling
// the player to freeze would be the one piece of the screen arguing with the
// words printed on it. It breathes in colour only.
.incoming--still
  color: #c77dff
  animation-name: incoming-breathe-still
  animation-duration: 0.9s

  .incoming__glyph
    animation-duration: 0.9s

@keyframes incoming-breathe-still
  0%, 100%
    transform: scale(1)
    color: #c77dff
  50%
    transform: scale(1)
    color: #f1e2ff

.incoming-enter-active
  transition: opacity 0.09s ease

.incoming-leave-active
  transition: opacity 0.22s ease
  // The alarm stops pulsing on the way out. It is an opacity loop over an
  // opacity ramp; run together, the badge flickers instead of leaving.
  animation: none

.incoming-enter-from, .incoming-leave-to
  opacity: 0
</style>
