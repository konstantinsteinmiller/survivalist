<template lang="pug">
  Transition(name="stage-banner")
    div.stage-banner(v-if="show" aria-live="polite")
      div.stage-banner__stage {{ title ?? t('hud.stage', { n: stage }) }}
      div.stage-banner__unlock(v-if="unlock")
        GameIcon.stage-banner__icon(:name="unlock.icon")
        div.stage-banner__unlock-text
          span.stage-banner__unlock-name {{ unlock.label }}
          span.stage-banner__unlock-tag {{ unlock.tag ?? t('flow.unlocked') }}
      //- The leaderboard climb a new best just bought — see `climb`.
      div.stage-banner__climb(v-else-if="climb")
        GameIcon.stage-banner__climb-icon(name="trophy")
        span.stage-banner__climb-text {{ climb }}
      //- What is coming. Only when nothing has just been handed over — the
      //- gift and the promise on one banner would be two things to read in
      //- 1.7 seconds, and the gift is the one that matters.
      div.stage-banner__next(v-else-if="next")
        GameIcon.stage-banner__next-icon(:name="next.icon")
        span.stage-banner__next-text {{ next.text }}
      //- The boss waiting at the end of the road that just opened — a shadow
      //- and a name, so the kill that came before reads as chapter one.
      div.stage-banner__boss(v-if="boss")
        BossSilhouette.stage-banner__boss-shape(:design="boss.design")
        span.stage-banner__boss-text {{ t('flow.bossAhead', { name: boss.name }) }}
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import BossSilhouette from '@/components/game/BossSilhouette.vue'
import type { GameIconName } from '@/components/icons/iconNames'

/**
 * ─── The between-stages banner ──────────────────────────────────────────────
 *
 * What the early stages use INSTEAD of a result screen.
 *
 * A cleared stage used to stop the game: music down, overlay up, statistics, a
 * button. That is the right shape for a player who has decided to stay and is
 * choosing what to buy — and the wrong shape at twenty-five seconds, where it
 * reads as an ending to someone who has not decided anything yet. Measured, half
 * of Poki's testers left at exactly that screen.
 *
 * So the opening stages hand over without stopping. The road keeps moving, the
 * music keeps playing, and this rides over the top of the next stage's empty
 * opening — which is already fifteen units of nothing by design, so it costs no
 * gameplay at all. It is deliberately not dismissable and deliberately has no
 * button: there is nothing to decide here, which is the entire point.
 *
 * It carries one of two things under the stage number: what the player has
 * JUST been handed (`unlock`), or what is coming NEXT (`next`) — the ladder in
 * `game/ladder.ts`. A stranger who reads "next: choose a weapon" on the stage-2
 * banner has a reason to reach stage 3 that a coin total never gave them.
 *
 * `title` overrides the stage line for the one other announcement that rides
 * this banner: the rally.
 */
const { t } = useI18n()

interface Props {
  show: boolean
  stage: number
  /** Something the player just earned, announced on the same beat. `tag`
   *  replaces the "Unlocked!" under it — the free Frost Nova is not an unlock,
   *  it is a try, and saying otherwise would promise a button that goes away. */
  unlock: { icon: GameIconName; label: string; tag?: string } | null
  /** The next rung of the ladder, when nothing was just unlocked. */
  next?: { icon: GameIconName; text: string } | null
  /** A headline other than "Stage N". */
  title?: string | null
  /** The boss at the end of this stage's road: its body (`bossDesign`) for
   *  the silhouette, and its name already translated. */
  boss?: { design: string; name: string } | null
  /** The new rank and the places this clear gained, already worded ("Rank
   *  #2,702 ▲214"). Shown instead of `next` — the HUD chip carries that
   *  promise all stage — and never over a gift. */
  climb?: string | null
}
withDefaults(defineProps<Props>(), { next: null, title: null, boss: null, climb: null })
</script>

<style scoped lang="sass">
.stage-banner
  position: absolute
  left: 50%
  top: 30%
  transform: translate(-50%, -50%)
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(0.5rem, 2.5vw, 0.9rem)
  // Never eats a steer: the player is still driving underneath it.
  pointer-events: none
  z-index: 45
  text-align: center

.stage-banner__stage
  font-weight: 900
  font-size: clamp(1.7rem, 9vw, 3rem)
  letter-spacing: 0.04em
  color: #fff
  text-transform: uppercase
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.55), 0 0 1.6rem rgba(120, 200, 255, 0.5)

.stage-banner__unlock
  display: flex
  align-items: center
  gap: clamp(0.4rem, 2vw, 0.7rem)
  padding: clamp(0.35rem, 1.8vw, 0.6rem) clamp(0.7rem, 3.4vw, 1.1rem)
  border-radius: 999px
  background-color: rgba(10, 20, 38, 0.86)
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.14rem rgba(127, 227, 255, 0.32)

.stage-banner__icon
  width: clamp(1.3rem, 6vw, 1.8rem)
  height: clamp(1.3rem, 6vw, 1.8rem)
  color: #7fe3ff

.stage-banner__unlock-text
  display: flex
  flex-direction: column
  align-items: flex-start
  line-height: 1.1

.stage-banner__unlock-name
  font-weight: 900
  font-size: clamp(0.85rem, 4vw, 1.1rem)
  color: #fff

.stage-banner__unlock-tag
  font-weight: 800
  font-size: clamp(0.62rem, 3vw, 0.78rem)
  letter-spacing: 0.06em
  text-transform: uppercase
  color: #7fe3ff

// The promise: quieter than the gift, gold rather than cyan, so the two never
// read as the same kind of pill.
.stage-banner__next
  display: flex
  align-items: center
  gap: clamp(0.3rem, 1.6vw, 0.5rem)
  padding: clamp(0.28rem, 1.4vw, 0.45rem) clamp(0.6rem, 3vw, 0.95rem)
  border-radius: 999px
  background-color: rgba(10, 20, 38, 0.8)
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.12rem rgba(255, 217, 60, 0.28)

.stage-banner__next-icon
  width: clamp(1rem, 4.6vw, 1.3rem)
  height: clamp(1rem, 4.6vw, 1.3rem)
  color: #ffd93c

.stage-banner__next-text
  font-weight: 900
  font-size: clamp(0.72rem, 3.4vw, 0.95rem)
  color: #fff
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)

// The climb: gold like the result screen's rank chip, because it IS that
// number, moving.
.stage-banner__climb
  display: flex
  align-items: center
  gap: clamp(0.3rem, 1.6vw, 0.5rem)
  padding: clamp(0.28rem, 1.4vw, 0.45rem) clamp(0.6rem, 3vw, 0.95rem)
  border-radius: 999px
  background-color: rgba(10, 20, 38, 0.84)
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.12rem rgba(255, 217, 60, 0.45)

.stage-banner__climb-icon
  width: clamp(1rem, 4.6vw, 1.3rem)
  height: clamp(1rem, 4.6vw, 1.3rem)
  color: #ffd93c

.stage-banner__climb-text
  font-weight: 900
  font-size: clamp(0.72rem, 3.4vw, 0.95rem)
  color: #fff
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)

// The boss teaser: ember rather than gold or cyan, because it is the one line on
// the banner that is a THREAT, and the silhouette sits on the pill's edge so the
// shape reads before the words.
.stage-banner__boss
  display: flex
  align-items: center
  gap: clamp(0.3rem, 1.6vw, 0.5rem)
  padding: clamp(0.2rem, 1vw, 0.35rem) clamp(0.7rem, 3.2vw, 1rem) clamp(0.2rem, 1vw, 0.35rem) clamp(0.3rem, 1.4vw, 0.45rem)
  border-radius: 999px
  background-color: rgba(28, 8, 10, 0.84)
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.12rem rgba(255, 90, 50, 0.34)

// Bigger than the pill it sits in, on purpose: the shape breaks out above and
// below the rim, which is what makes it read as a body and not as an icon.
.stage-banner__boss-shape
  width: clamp(2.8rem, 13vw, 3.6rem)
  height: clamp(2.8rem, 13vw, 3.6rem)
  margin: -0.9rem 0 -0.5rem

.stage-banner__boss-text
  font-weight: 900
  font-size: clamp(0.72rem, 3.4vw, 0.95rem)
  color: #ffd2c4
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)

// Arrives fast and hard — it is a reward, not a notification — and leaves slowly
// enough that it never looks like a flicker.
.stage-banner-enter-active
  transition: opacity 0.18s ease, transform 0.28s cubic-bezier(0.2, 1.6, 0.4, 1)

.stage-banner-leave-active
  transition: opacity 0.5s ease, transform 0.5s ease

.stage-banner-enter-from
  opacity: 0
  transform: translate(-50%, -50%) scale(0.7)

.stage-banner-leave-to
  opacity: 0
  transform: translate(-50%, -80%) scale(1.02)
</style>
