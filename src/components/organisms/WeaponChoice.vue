<template lang="pug">
  FReward(:model-value="open" :show-continue="false" reveal)
    template(#ribbon)
      span {{ t('weaponPick.title') }}

    div.pick
      p.pick__sub {{ t('weaponPick.subtitle', { n: stage }) }}

      div.pick__cards
        button.pick__card(
          v-for="w in WEAPON_PICK_CHOICES"
          :key="w"
          type="button"
          :class="[`is-${w}`, { 'is-chosen': chosen === w, 'is-dimmed': chosen !== null && chosen !== w }]"
          :disabled="chosen !== null"
          :aria-label="t(`weapons.${w}`)"
          @pointerdown.stop
          @click.stop="pick(w)"
        )
          //- The plate the weapon sits on: a slow float so the card reads as
          //- a thing on display rather than a menu row, and a rim that lights
          //- on hover, focus and choice.
          div.pick__frame
            div.pick__halo
            div.pick__art
              ArtIcon.pick__icon(kind="ui" :id="`weapon-card-${w}`" :fallback="w")
            div.pick__name {{ t(`weapons.${w}`) }}
            ul.pick__perks
              li.pick__perk
                GameIcon.pick__perk-icon(:name="PERK_ICONS[w][0]")
                span {{ t(`weaponPick.${w}.a`) }}
              li.pick__perk
                GameIcon.pick__perk-icon(:name="PERK_ICONS[w][1]")
                span {{ t(`weaponPick.${w}.b`) }}
            div.pick__cta
              GameIcon.pick__cta-icon(name="unlock")
              span {{ t('weaponPick.take') }}
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FReward from '@/components/atoms/FReward.vue'
import ArtIcon from '@/components/icons/ArtIcon.vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import type { GameIconName } from '@/components/icons/iconNames'
import { WEAPON_PICK_CHOICES, type WeaponId } from '@/game/weapons'
import useSounds from '@/use/useSound'

/**
 * ─── The weapon choice ──────────────────────────────────────────────────────
 *
 * The one full stop the opening stages make on purpose: a reveal on the
 * handover into `WEAPON_PICK_STAGE`, two cards, one tap. It is presented as a
 * GIFT — `FReward`'s reveal burst behind it, the cards floating on lit plates —
 * because that is what it is: the most distinctive things the game owns,
 * handed over before a stranger has decided whether to stay, and handed over as
 * a choice because a player who picked the rockets is invested in the rockets.
 *
 * Rules it keeps:
 *
 *   • ONE tap. The whole card is the button; there is no confirm step and no
 *     way to close the screen without choosing. A gift you can decline is a
 *     menu.
 *   • The choice is ANSWERED before it is applied. The chosen card flares, the
 *     other one recedes, and only then does the scene get the pick — so the
 *     player sees what they did before the road takes over.
 *   • Nothing here reads the save or the sim. The scene owns the flow; this is
 *     a screen with two buttons on it.
 */

const props = defineProps<{
  open: boolean
  /** The stage the weapon rides — printed on the subtitle. */
  stage: number
}>()

const emit = defineEmits<{ (e: 'pick', id: WeaponId): void }>()

const { t } = useI18n()
const { playSound } = useSounds()

/** The two perk glyphs per card. Order matches `weaponPick.<w>.a` / `.b`. */
const PERK_ICONS: Record<WeaponId, [GameIconName, GameIconName]> = {
  rocket: ['star', 'flame'],
  gatling: ['rate', 'bolt'],
  // The four later weapons are never dealt by the stage-3 card reveal
  // (`WEAPON_PICK_CHOICES`), but the map is total so a future pick — or a card
  // shown for a weapon found on the road — cannot land here without a drawing.
  grapeshot: ['flame', 'squad'],
  dynamo: ['bolt', 'star'],
  gravecall: ['squad', 'shield'],
  hoard: ['coin', 'star']
}

/** How long the chosen card gets to flare before the scene takes over, ms. */
const CHOSEN_MS = 560

const chosen = ref<WeaponId | null>(null)
let handoff: number | null = null

const pick = (w: WeaponId): void => {
  if (chosen.value !== null) return
  chosen.value = w
  playSound('reward-continue', 0.06)
  handoff = window.setTimeout(() => {
    handoff = null
    emit('pick', w)
  }, CHOSEN_MS)
}

watch(() => props.open, (open) => {
  if (open) {
    chosen.value = null
    playSound('level-up', 0.06)
  } else if (handoff !== null) {
    clearTimeout(handoff)
    handoff = null
  }
}, { immediate: true })
</script>

<style scoped lang="sass">
.pick
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(0.6rem, 2.4vh, 1.2rem)
  width: 100%
  max-width: 30rem

.pick__sub
  margin: 0
  color: #ffe9b0
  font-weight: 800
  font-size: clamp(0.78rem, 3.4vmin, 1.05rem)
  text-align: center
  text-wrap: balance
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8)

// ─── Room for the flare ──────────────────────────────────────────────────────
//
// The chosen card scales to 1.12 and settles at 1.06, and `.reward-body` is a
// SCROLL CONTAINER (`overflow-y: auto`) sized to exactly the height its content
// needs. A transform does not change layout, so the grown card had nowhere to
// go: measured at 900x700 it went from 246 px to 276 px and hung 15 px past the
// body's bottom edge, where it was cut clean off. Both cut at the BOTTOM rather
// than being trimmed evenly, because `.reward-body > *` centres with auto
// margins and those collapse to zero the moment the content overflows.
//
// Two things worth knowing before touching this:
//   • `overflow-y: auto` cannot coexist with a visible x-axis — CSS computes the
//     other axis to `auto` too — so the sides clip as well, which is why the
//     inline padding has to grow with the flare rather than just the block.
//   • The padding has to be real, not padding cancelled by a negative margin:
//     the clip is the BODY's padding box, so the room only exists if the
//     content box actually gets taller.
//
// Sized off the flare rather than by eye: 1.12 centred adds 6 % of the card's
// height to each edge, and these cards run 200-280 px tall, so 12-17 px a side
// covers every viewport the game ships to. The `vmin` term shrinks it in step
// with the cards on a short landscape phone.
.pick__cards
  display: grid
  grid-template-columns: repeat(2, minmax(0, 1fr))
  gap: clamp(0.6rem, 3vw, 1.2rem)
  width: 100%
  padding: clamp(0.8rem, 3vmin, 1.15rem) clamp(0.55rem, 2.6vw, 1rem)

// ─── The card ────────────────────────────────────────────────────────────────
//
// A button with no chrome of its own: the frame inside it is the visible card,
// so the float and the flare are transforms on a child and never move the hit
// target. The button itself stays put and stays the full plate.
.pick__card
  appearance: none
  margin: 0
  padding: 0
  border: 0
  background: none
  color: inherit
  font: inherit
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  touch-action: manipulation
  min-width: 0
  transition: opacity 320ms ease, filter 320ms ease

  &:disabled
    cursor: default

  &.is-dimmed
    opacity: 0.32
    filter: saturate(0.4)

  &:focus-visible .pick__frame,
  &:hover:not(:disabled) .pick__frame
    box-shadow: 0 0 0 0.18rem rgba(255, 217, 60, 0.75), 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.08)

.pick__frame
  position: relative
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(0.3rem, 1.4vh, 0.6rem)
  padding: clamp(0.6rem, 2.6vw, 1rem) clamp(0.45rem, 2vw, 0.8rem) clamp(0.55rem, 2.2vw, 0.85rem)
  border-radius: clamp(0.7rem, 3vw, 1.1rem)
  // Blackened iron with a faint sheen and a gold rim — the shop's plate
  // vocabulary, one notch richer because this is a prize.
  background: linear-gradient(170deg, #1a2440 0%, #0c1426 55%, #070c18 100%)
  box-shadow: 0 0 0 0.12rem rgba(255, 217, 60, 0.35), 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.08)
  overflow: hidden
  animation: pick-float 3.4s ease-in-out infinite
  transition: box-shadow 200ms ease, scale 200ms cubic-bezier(0.2, 1.4, 0.4, 1)

  .is-gatling &
    animation-delay: -1.7s

  .is-chosen &
    scale: 1.06
    box-shadow: 0 0 0 0.2rem #ffd93c, 0 0 2.2rem rgba(255, 217, 60, 0.7), 0 10px 28px rgba(0, 0, 0, 0.65)
    animation: pick-chosen 0.56s cubic-bezier(0.2, 1.5, 0.4, 1) both

// The pool of light behind the weapon. Warm for the launcher, cold for the
// hose, so the two cards are two temperatures before they are two names.
.pick__halo
  position: absolute
  left: 50%
  top: 34%
  width: 120%
  aspect-ratio: 1
  translate: -50% -50%
  border-radius: 50%
  pointer-events: none
  background: radial-gradient(circle, rgba(255, 168, 70, 0.42) 0%, rgba(255, 120, 40, 0.14) 38%, transparent 66%)

  .is-gatling &
    background: radial-gradient(circle, rgba(120, 214, 255, 0.4) 0%, rgba(80, 160, 255, 0.14) 38%, transparent 66%)

.pick__art
  position: relative
  width: clamp(3.6rem, 22vw, 6.2rem)
  height: clamp(3.6rem, 22vw, 6.2rem)
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.7))
  color: #ffb347

  .is-gatling &
    color: #8fd6ff

.pick__icon
  width: 100%
  height: 100%

.pick__name
  position: relative
  color: #fff
  font-weight: 900
  font-size: clamp(0.82rem, 3.8vmin, 1.15rem)
  line-height: 1.1
  text-align: center
  text-transform: uppercase
  letter-spacing: 0.02em
  text-shadow: 2px 2px 0 #000

.pick__perks
  position: relative
  display: flex
  flex-direction: column
  gap: 0.2rem
  margin: 0
  padding: 0
  list-style: none
  width: 100%

.pick__perk
  display: flex
  align-items: center
  gap: 0.35rem
  color: #d9e6ff
  font-weight: 800
  font-size: clamp(0.62rem, 2.8vmin, 0.82rem)
  line-height: 1.15
  text-align: left
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.8)

.pick__perk .pick__perk-icon
  flex: 0 0 auto
  width: clamp(0.8rem, 3.4vmin, 1rem)
  height: clamp(0.8rem, 3.4vmin, 1rem)
  color: #ffd93c

.pick__cta
  position: relative
  display: inline-flex
  align-items: center
  gap: 0.3rem
  margin-top: 0.15rem
  padding: 0.32em 0.9em
  border-radius: 999px
  background-image: linear-gradient(to bottom, #ffcd00, #f7a000)
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45), 0 0 10px rgba(255, 205, 0, 0.3)
  color: #fff
  font-weight: 900
  font-size: clamp(0.68rem, 3vmin, 0.9rem)
  text-transform: uppercase
  letter-spacing: 0.03em
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)

.pick__cta .pick__cta-icon
  width: 1em
  height: 1em

@keyframes pick-float
  0%, 100%
    translate: 0 0
  50%
    translate: 0 -0.35rem

@keyframes pick-chosen
  0%
    scale: 1
  45%
    scale: 1.12
  100%
    scale: 1.06

// Short landscape phone: the cards stand shoulder to shoulder and lose their
// float so the row fits under the ribbon without scrolling.
@media (max-height: 34rem)
  .pick
    gap: 0.4rem
  .pick__frame
    animation: none
    gap: 0.25rem
  .pick__art
    width: clamp(2.6rem, 14vh, 4rem)
    height: clamp(2.6rem, 14vh, 4rem)

@media (prefers-reduced-motion: reduce)
  .pick__frame
    animation: none
</style>
