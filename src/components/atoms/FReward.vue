<template lang="pug">
  Transition(name="fade")
    //- Ensure classes with special characters are in parentheses
    div.fixed.inset-0.flex.flex-col.items-center.justify-center.backdrop-blur-md.touch-none.cursor-pointer(
      v-if="modelValue"
      class="bg-black/60"
      :class="[isAdShowing ? 'z-0' : 'z-[100]', isCompact ? 'p-2' : 'p-4']"
      :style="{\
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',\
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',\
        paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',\
        paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))'\
      }"
      @click="handleOverlayClick"
    )
      //- Parchment-ribbon header. Bitmap background scales to fit the
      //- responsive wrap; the slot content (or a fallback "Rewards"
      //- label) renders on top of the ribbon, centred horizontally and
      //- biased above the bottom curl so the tails stay visible.
      div.ribbon-wrap.relative.shrink-0(
        v-if="$slots.ribbon"
        :class="{ 'is-compact': isCompact }"
      )
        div.ribbon-banner
          div.ribbon-content
            slot(name="ribbon")
              span {{ t('rewards') }}

      //- Content area. One bounded, scrollable flex child in every mode — see
      //- `.reward-body`.
      //-
      //- The desktop branch used to be `h-full`, which asked for 100% of the
      //- overlay's height while the ribbon was ALSO in the flow above it, so the
      //- column was taller than the screen by exactly one ribbon. That is what
      //- put a scrollbar on the result screen and hid its first line behind the
      //- banner; it never showed up on a phone, because the compact branch was
      //- already doing the right thing.
      div.reward-body
        slot

      //- Tap-to-continue hint. In landscape it sits INLINE in the flow (shrink-0)
      //- so it can never overlap the centred reward content; otherwise it floats
      //- at the bottom of the viewport as before.
      Transition(name="fade")
        div.flex.justify-center.animate-pulse.pointer-events-none(
          v-if="showContinue"
          :class="isCompact ? 'shrink-0 pt-1 pb-1' : 'absolute bottom-8 left-0 right-0 sm:bottom-12'"
        )
          div.text-white.font-black.uppercase.italic.tracking-widest.brawl-text(
            :class="isCompact ? 'text-xs' : 'text-sm md:text-2xl'"
          )
            | {{ isMobile ? t('tapToContinue') : t('clickToContinue') }}
</template>

<script setup lang="ts">
import { computed, useSlots, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { isMobileLandscape, isShortViewport } from '@/use/useUser'

// "Compact" layout = the short-viewport treatment: mobile landscape OR any
// short embed (≤500px tall, e.g. a CG iframe on a Chromebook). In both cases
// the centred desktop layout overflows, so the ribbon shrinks and the
// tap/click-to-continue hint flows INLINE below the content (shrink-0) instead
// of floating absolutely at the bottom — where it otherwise overlapped the
// reward button.
const isCompact = computed(() => isMobileLandscape.value || isShortViewport.value)
// Sink the reward overlay below the ad layer whenever an interstitial/rewarded
// is on screen. GameMonetize (and several other portals) inject their ad
// container at a z-index lower than this modal's z-[100], so without this the
// modal — including its backdrop-blur — paints OVER the playing ad.
import { isAdShowing } from '@/use/useGamePause'

const props = defineProps<{
  modelValue: boolean
  showContinue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'continue'): void
}>()

const { t } = useI18n()
const slots = useSlots()

const isMobile = computed(() => {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
})

const handleOverlayClick = () => {
  if (props.showContinue) emit('continue')
}

// Desktop shortcut: Space / Enter triggers the same "continue" action
// the overlay click does, but only while the reward is up AND in
// continue-mode. Listener is attached only when the modal becomes
// visible so background views aren't intercepting these keys.
const onContinueKey = (e: KeyboardEvent) => {
  if (!props.modelValue || !props.showContinue) return
  if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return
  // Skip when focus is on a typing target — players might be editing
  // toolbar inputs in the background.
  const t = e.target
  if (t instanceof HTMLElement) {
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return
    if (t.isContentEditable) return
  }
  e.preventDefault()
  emit('continue')
}

watch(() => props.modelValue, (open) => {
  if (open) window.addEventListener('keydown', onContinueKey)
  else window.removeEventListener('keydown', onContinueKey)
}, { immediate: true })

onUnmounted(() => {
  window.removeEventListener('keydown', onContinueKey)
})
</script>

<style scoped lang="sass">
.fade-enter-active, .fade-leave-active
  transition: opacity 0.4s ease

.fade-enter-from, .fade-leave-to
  opacity: 0

.brawl-text
  text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000

// ─── The body ────────────────────────────────────────────────────────────────

.reward-body
  position: relative
  width: 100%
  // `0 1 auto`, not `1 1 auto`: the body takes the height its content needs and
  // no more, so the overlay's own `justify-center` centres the RIBBON AND THE
  // CONTENT AS ONE GROUP. Growing to fill instead pins the ribbon to the top of
  // the screen and centres the content in whatever is left, which on a desktop
  // window opens a dead band between the two that reads as a loading state.
  // It still shrinks (and then scrolls) when the content cannot fit.
  flex: 0 1 auto
  min-height: 0
  display: flex
  flex-direction: column
  align-items: center
  overflow-y: auto
  overscroll-behavior: contain

  // Centred with AUTO MARGINS rather than `justify-content: center`. On a
  // scroll container, centred flex content that overflows is clipped at the
  // top and cannot be scrolled back to — the top of the content ends up above
  // the scroll origin. Auto margins centre while it fits and collapse to zero
  // when it does not, which is the behaviour this screen needs on a 320x480
  // phone in a portal iframe.
  > *
    margin-block: auto

// ─── Parchment ribbon ────────────────────────────────────────────────────────

.ribbon-wrap
  position: relative
  // The art has a fixed aspect, so WIDTH is what sets the banner's height —
  // which makes this ladder keyed on viewport HEIGHT rather than width. The
  // ribbon is decoration; on a short screen it hands its room back to the
  // buttons underneath it rather than pushing them off the bottom.
  width: min(80vw, 460px)
  margin-bottom: clamp(0.35rem, 2vh, 1.25rem)

  @media (max-height: 50rem)
    width: min(64vw, 340px)

  @media (max-height: 42rem)
    width: min(56vw, 280px)

  @media (max-height: 34rem)
    width: min(50vw, 240px)
    margin-bottom: 0.25rem

  // Landscape phone / short embed. Replaces the old `scale-90` utility, which
  // shrank the ribbon's PAINT but not its layout box, leaving a dead band of
  // margin exactly where vertical room was scarcest.
  &.is-compact
    width: min(46vw, 230px)
    margin-top: -0.25rem
    margin-bottom: 0.25rem

// Parchment ribbon bitmap (553×188 source). The aspect ratio is built
// into the wrap's `aspect-ratio` so the image scales without distorting
// the curled tails. We use `background-image` rather than an `<img>`
// so the slot content can layer cleanly on top without z-index gymnastics.
.ribbon-banner
  position: relative
  aspect-ratio: 553 / 188
  width: 100%
  // The caption is sized against THIS box, not the viewport — see
  // `.ribbon-content`.
  container-type: inline-size
  background-image: url('/images/bg/parchment-ribbon_553x188.webp')
  background-repeat: no-repeat
  background-position: center
  background-size: contain
  display: flex
  align-items: center
  justify-content: center
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))

.ribbon-content
  position: relative
  // The ribbon art's flat parchment panel sits ABOVE the bottom curl,
  // so the content lifts ~14% of the banner height to land visually
  // centred on that panel.
  margin-top: -14%
  display: flex
  align-items: center
  justify-content: center
  text-align: center
  // 21%, measured off the art rather than guessed: the parchment's two vertical
  // rods sit at 19.2–20.4% and 79.4–80.7% of the 553px source, so the flat panel
  // the caption may use is the 59% between them. The previous 18% put the ends
  // of a long word on top of both rods.
  padding: 0 21%

  // ── The caption is sized off the BANNER, not the viewport ──────────────────
  //
  // This used to be a viewport-sized caption in the caller plus a blanket
  // `transform: scale(150%)` here, and the two had no way to agree: the scale
  // multiplied whatever the caller asked for, so a long word (German
  // "LEVEL GESCHAFFT!") came out 1.5x wider than the space the padding had
  // reserved and printed straight over the parchment's curled tails.
  //
  // `cqw` is a percentage of the banner's own width, so the caption is a fixed
  // fraction of the art at every viewport size and can never outgrow it. The
  // `vw` line above is the fallback for engines without container queries;
  // where they exist, the second declaration wins.
  //
  // The type is owned HERE rather than by each caller, because it belongs to
  // the ribbon art, not to the screen that happens to be using it.
  font-size: clamp(0.5rem, 2.9vw, 1.2rem)
  font-size: clamp(0.5rem, 5.4cqw, 1.3rem)
  line-height: 0.98
  color: #fff
  font-weight: 900
  font-style: italic
  text-transform: uppercase
  letter-spacing: -0.01em
  text-wrap: balance
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000

// NOTE: the two `@media (orientation: landscape)` ribbon overrides that used to
// live here — one for <=500px and one for the 501–860px CG-iframe case that CG
// QA caught overflowing on 2026-05-05 — are gone. Both were patching the same
// thing from two directions, and both are now subsumed by the max-height ladder
// on `.ribbon-wrap`, which caps the banner by available height in every
// orientation instead of only in landscape.

</style>
