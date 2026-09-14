<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import RewardAdIcon from '@/components/atoms/RewardAdIcon.vue'
import { adInFlight } from '@/use/useAdGate'
import {
  armOfferBounce, canOfferWeapon, claimWeaponOffer, offerBouncing, offerWeapon
} from '@/use/useWeaponOffer'

/**
 * ─── The mid-run weapon offer ───────────────────────────────────────────────
 *
 * Bottom-left, directly above the mute button: a film frame and a gun, in the
 * yellow the rest of the game reserves for "there is something to take here".
 *
 * ── Why the glyphs, and why both ──
 *
 * The film frame is the ad signal and comes first, exactly as it does on the
 * result screen's ×3 and on every other rewarded button on every portal this
 * ships to — a player must be able to tell that a video follows the press
 * BEFORE pressing. The gun beside it is what the video buys, and it is the
 * glyph the weapon already wears on the run badge and in the shop, so nothing
 * here has to be learned twice. No caption: a label would have to be short
 * enough for a 320 px phone in 21 languages, and these two drawings say it.
 *
 * ── Why it takes two taps ──
 *
 * The same reason the expedition chip beside it does, one step worse. This game
 * has no menu — it boots into a stage and there is always a run in flight — so
 * this control necessarily sits under the player's thumb DURING play, and a
 * stray tap here does not cost a menu, it stops the road and plays thirty
 * seconds of video nobody asked for. That is a portal QA finding waiting to
 * happen ("an ad played without me requesting it") as well as simply rude. The
 * first tap arms it and names it; the second one goes, and ignoring it for four
 * seconds is the same as saying no.
 *
 * ── What it does NOT own ──
 *
 * Whether there is an offer at all, which weapon it is, the three-minute
 * attention cadence and the claim itself all live in `useWeaponOffer.ts` — this
 * component is unmounted by the very ad it requests (`isLiveGameplay` drops
 * while the video is up), so nothing that has to survive the claim may be
 * stored here.
 */

const { t } = useI18n()

/** How long the armed chip waits for the second tap. Matched to the expedition
 *  chip's own window — two controls in the same corner that arm the same way
 *  must disarm the same way. */
const ARM_MS = 4000

const armed = ref(false)
let armTimer: number | null = null

const disarm = (): void => {
  armed.value = false
  if (armTimer !== null) {
    clearTimeout(armTimer)
    armTimer = null
  }
}

const onClick = (): void => {
  if (!canOfferWeapon.value || adInFlight.value) return
  if (armed.value) {
    disarm()
    void claimWeaponOffer()
    return
  }
  armed.value = true
  if (armTimer !== null) clearTimeout(armTimer)
  armTimer = window.setTimeout(disarm, ARM_MS)
}

// The cadence starts the first time the chip is on screen, not at import: the
// opening bounce is an introduction, and an introduction behind the splash or
// the controls lightbox is a bounce nobody saw. Idempotent and never stopped —
// see `armOfferBounce`.
onMounted(armOfferBounce)
onUnmounted(disarm)
</script>

<template lang="pug">
  //- Absent, not disabled, when there is nothing to trade. A dead control on a
  //- HUD this tight is one more thing to look at that cannot be acted on.
  div.weapon-offer(v-if="canOfferWeapon")
    //- The word the glyphs cannot carry, and only while it is needed.
    Transition(name="weapon-offer-tip")
      span.weapon-offer__tip(v-if="armed") {{ t('offer.confirm') }}
    button.weapon-offer__chip(
      type="button"
      :class="{ 'is-bouncing': offerBouncing && !armed, 'is-armed': armed, 'is-busy': adInFlight }"
      :disabled="adInFlight"
      :aria-label="armed ? t('offer.confirm') : t('offer.available', { weapon: t(`weapons.${offerWeapon}`) })"
      @click="onClick"
    )
      span.weapon-offer__shadow(aria-hidden="true")
      span.weapon-offer__body
        RewardAdIcon.weapon-offer__movie
        GameIcon.weapon-offer__gun(:name="offerWeapon")
</template>

<style scoped lang="sass">
.weapon-offer
  position: relative
  display: inline-flex
  pointer-events: auto

// Anchored by its LEFT edge and grown rightwards, so a label whose width swings
// 2-3x across 21 locales runs into the empty middle of the screen instead of
// off the side of the phone. Same trick the expedition chip below it uses.
.weapon-offer__tip
  position: absolute
  bottom: 100%
  left: 0
  margin-bottom: 0.4rem
  padding: 0.3em 0.7em
  border: 2px solid #0f1a30
  border-radius: 0.6rem
  background-image: linear-gradient(to bottom, #ffcd00, #f7a000)
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45), 0 0 12px rgba(255, 205, 0, 0.35)
  color: #fff
  font-weight: 900
  text-transform: uppercase
  white-space: nowrap
  letter-spacing: 0.02em
  font-size: clamp(0.7rem, 3.4vw, 0.95rem)
  text-shadow: 2px 2px 0 #000
  pointer-events: none

.weapon-offer-tip-enter-active,
.weapon-offer-tip-leave-active
  transition: opacity 0.15s ease, transform 0.15s ease

.weapon-offer-tip-enter-from,
.weapon-offer-tip-leave-to
  opacity: 0
  transform: translateY(0.25rem)

// A pill rather than one of the square HUD chips, because it carries two marks
// instead of one — and because it should not read as another toggle in the row
// of grey glyphs it sits above. Same height as those chips, so the corner still
// reads as one cluster.
.weapon-offer__chip
  position: relative
  display: inline-flex
  flex: 0 0 auto
  min-height: 2.5rem
  height: clamp(2.5rem, 11vw, 3.4rem)
  padding: 0
  border: 0
  background: none
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  transition: transform 90ms ease-out, filter 90ms ease-out

  &:hover:not(:disabled)
    filter: brightness(1.08)

  &:active:not(:disabled)
    transform: translateY(2px) scale(0.94)

  &.is-busy
    opacity: 0.45
    filter: grayscale(1)
    cursor: not-allowed

.weapon-offer__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: clamp(0.45rem, 2vw, 0.7rem)
  background-color: #7a5a12

.weapon-offer__body
  position: relative
  display: flex
  align-items: center
  justify-content: center
  gap: clamp(0.2rem, 1.2vw, 0.35rem)
  width: 100%
  height: 100%
  padding-inline: clamp(0.4rem, 2.2vw, 0.6rem)
  border: 2px solid #0f1a30
  border-radius: clamp(0.45rem, 2vw, 0.7rem)
  // The yellow. Identical stops to `.tone-gold` on the shared HUD chip, so the
  // two golds in the same corner are the same gold.
  background-image: linear-gradient(to bottom, #ffcd00, #f7a000)
  color: #fff

.weapon-offer__movie
  // Sized off the chip rather than off the font, so the film frame keeps its
  // ratio to the gun beside it at every breakpoint.
  height: 46%
  width: auto

.weapon-offer__gun
  height: 58%
  width: auto

.is-armed .weapon-offer__body
  // Armed is louder, not different: the same yellow with the glow the tip above
  // it already carries, so the two read as one object waiting for a second tap.
  box-shadow: 0 0 14px rgba(255, 205, 0, 0.75)

// ─── The attention bounce ───────────────────────────────────────────────────
//
// Five seconds, and the class is what times it — see `OFFER_BOUNCE_MS`. A 1 s
// period means it lands back down exactly as the class comes off rather than
// being cut off mid-air.
.is-bouncing
  animation: weapon-offer-bounce 1s ease-in-out infinite

@keyframes weapon-offer-bounce
  0%, 45%, 100%
    transform: translateY(0)
  20%
    transform: translateY(-0.5rem)
  32%
    transform: translateY(-0.18rem)

@media (prefers-reduced-motion: reduce)
  .is-bouncing
    animation: none
    // Still says "look here", without the movement.
    filter: drop-shadow(0 0 10px rgba(255, 205, 0, 0.85))
</style>
