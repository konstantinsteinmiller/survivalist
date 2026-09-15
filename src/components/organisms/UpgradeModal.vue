<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FModal from '@/components/molecules/FModal.vue'
import IconCoin from '@/components/icons/IconCoin.vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import { UPGRADE_ICONS } from '@/components/icons/upgradeIcons'
import useSounds from '@/use/useSound'
import useTowerEconomy from '@/use/useTowerEconomy'
import {
  UPGRADES, UPGRADE_ORDER, applyUpgrade, isMaxed, upgradeCost, upgradeLevel,
  upgradeSuffix, type UpgradeId
} from '@/use/useUpgrades'
import { playFx } from '@/use/useGameAudio'
import { stage } from '@/use/useSurvivalGame'
import { track } from '@/use/useAnalytics'

/**
 * The between-runs shop.
 *
 * Four tracks, one screen, no scrolling on a phone. Every row states three
 * things and nothing else: what it does, what you have now → what you'd get,
 * and what it costs. A meta screen that needs reading is a meta screen that
 * gets closed.
 *
 * Buying is instant and cannot fail halfway: the coins are spent first, and the
 * level is only granted if that succeeded.
 */

const model = defineModel<boolean>({ required: true })
const { t } = useI18n()
const { coins, spendCoins } = useTowerEconomy()
const { playSound } = useSounds()

/**
 * Which glyph fronts each track lives in `@/components/icons/upgradeIcons` —
 * the shop is no longer the only screen that draws a track. The result screen's
 * peek plate teases ONE of these rows, and a track that wears one drawing there
 * and another here is a track the player has to recognise twice. That module
 * also carries the reason every one of them is a glyph rather than a painting.
 */

/** Bumped on every purchase so the computed rows re-read the level refs. */
const version = ref(0)

interface Row {
  id: UpgradeId
  level: number
  maxed: boolean
  cost: number
  current: number
  next: number
  affordable: boolean
}

const rows = computed<Row[]>(() => {
  void version.value
  // Squad's readout is priced in the stage's own doors, so it is read for the
  // stage on screen: the one being played, or the one just finished on the
  // result screen.
  const at = stage.value
  return UPGRADE_ORDER.map((id) => {
    const level = upgradeLevel(id)
    const def = UPGRADES[id]
    const maxed = isMaxed(id)
    const cost = def.cost(level)
    return {
      id,
      level,
      maxed,
      cost,
      current: def.valueAt(level, at),
      next: def.valueAt(Math.min(def.maxLevel, level + 1), at),
      affordable: !maxed && coins.value >= cost
    }
  })
})

const buy = (row: Row): void => {
  if (row.maxed || !row.affordable) {
    playSound('obstacle-hit', 0.03)
    return
  }
  if (!spendCoins(row.cost)) return
  applyUpgrade(row.id)
  // AFTER the spend and the apply, so the level reported is the one that was
  // actually bought. `level` is the new level, which is what a funnel wants to
  // read — "they reached 7", not "they were at 6".
  track('upgrade_buy', { id: row.id, level: row.level + 1, cost: row.cost, coins: coins.value })
  version.value++
  playFx('damageUp')
}

/**
 * The suffix a track's value carries — `upgradeSuffix`, shared with the result
 * screen's peek plate so a percentage is a percentage on both screens.
 */
const suffix = upgradeSuffix
</script>

<template lang="pug">
  FModal(v-model="model" :title="t('upgrades.title')")
    div.upgrades
      div.upgrades__wallet
        IconCoin.upgrades__wallet-icon
        span.upgrades__wallet-value {{ coins }}

      div.upgrades__list
        button.upgrade(
          v-for="row in rows"
          :key="row.id"
          type="button"
          :class="{ 'is-maxed': row.maxed, 'is-poor': !row.affordable && !row.maxed }"
          @click="buy(row)"
        )
          div.upgrade__icon(:class="`is-${row.id}`")
            //- Every one of these is the glyph the HUD already draws for the
            //- same stat during a run — the shop is where you buy the number
            //- you have been watching, so it must not be a second drawing of it.
            //- Drawn, never painted: see the note in `upgradeIcons.ts`.
            GameIcon(:name="UPGRADE_ICONS[row.id]")

          div.upgrade__body
            span.upgrade__name {{ t(`upgrades.names.${row.id}`) }}
            span.upgrade__desc {{ t(`upgrades.descriptions.${row.id}`) }}
            span.upgrade__delta
              | {{ row.current }}{{ suffix(row.id) }}
              span.upgrade__arrow(v-if="!row.maxed") →
              span.upgrade__next(v-if="!row.maxed") {{ row.next }}{{ suffix(row.id) }}

          div.upgrade__buy
            span.upgrade__level {{ t('upgrades.level', { n: row.level }) }}
            span.upgrade__maxed(v-if="row.maxed") {{ t('upgrades.maxed') }}
            span.upgrade__cost(v-else)
              IconCoin.upgrade__cost-icon
              | {{ row.cost }}
</template>

<style scoped lang="sass">
.upgrades
  display: flex
  flex-direction: column
  gap: clamp(0.4rem, 2vw, 0.7rem)
  width: 100%

.upgrades__wallet
  display: flex
  align-items: center
  justify-content: center
  gap: 0.35rem

.upgrades__wallet-icon
  width: clamp(1.1rem, 5vw, 1.5rem)
  height: clamp(1.1rem, 5vw, 1.5rem)
  color: #ffd93c

.upgrades__wallet-value
  color: #ffd93c
  font-weight: 900
  font-size: clamp(1rem, 5vw, 1.5rem)
  text-shadow: 2px 2px 0 #000

.upgrades__list
  display: flex
  flex-direction: column
  gap: clamp(0.3rem, 1.6vw, 0.55rem)

.upgrade
  display: grid
  grid-template-columns: auto minmax(0, 1fr) auto
  align-items: center
  gap: clamp(0.35rem, 2vw, 0.7rem)
  width: 100%
  padding: clamp(0.3rem, 1.6vw, 0.6rem)
  border: 2px solid #0f1a30
  border-radius: clamp(0.5rem, 2.4vw, 0.9rem)
  background-image: linear-gradient(to bottom, #2b3c63, #1a2540)
  text-align: left
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  transition: transform 90ms ease-out, filter 90ms ease-out

  &:active
    transform: translateY(2px) scale(0.99)

  &.is-poor
    filter: grayscale(0.55) brightness(0.75)

  &.is-maxed
    filter: saturate(0.7)
    cursor: default

.upgrade__icon
  display: flex
  align-items: center
  justify-content: center
  width: clamp(2rem, 9vw, 2.7rem)
  height: clamp(2rem, 9vw, 2.7rem)
  border: 2px solid rgba(0, 0, 0, 0.5)
  border-radius: 0.6rem
  background-color: rgba(0, 0, 0, 0.3)

  svg
    width: 62%
    height: 62%

  // A painted glyph carries its own outline and sits a little larger.
  img
    width: 76%
    height: 76%

  &.is-squad
    color: #8fd6ff
  &.is-power
    color: #ffca6b
  &.is-rate
    color: #a6ff9c
  &.is-range
    color: #c8a6ff
  &.is-scavenge
    color: #ffd93c
  // Warm for the one that deals damage, cool for the one that prevents it —
  // matching the button tints in the HUD.
  &.is-grenade
    color: #ff9a5a
  &.is-shield
    color: #7fe3ff
  // The two weapons, tinted to the fire they actually throw: the launcher's
  // blast is orange-red, the gatling's tracers run white-hot.
  &.is-rocket
    color: #ff7a4a
  &.is-gatling
    color: #ffe98a

.upgrade__body
  display: flex
  flex-direction: column
  gap: 0.05rem
  min-width: 0

.upgrade__name
  color: #fff
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.68rem, 3.2vw, 0.95rem)
  line-height: 1.1
  text-shadow: 2px 2px 0 #000

.upgrade__desc
  color: #b9cbe8
  font-size: clamp(0.55rem, 2.6vw, 0.75rem)
  line-height: 1.2
  // On the narrowest phone the description is the first thing to go: the name
  // plus the before→after numbers already carry the meaning.
  @media (max-width: 22rem)
    display: none

.upgrade__delta
  display: inline-flex
  align-items: center
  gap: 0.25em
  color: #8fd6ff
  font-weight: 900
  font-size: clamp(0.6rem, 2.8vw, 0.8rem)

.upgrade__arrow
  color: #7d8ba6

.upgrade__next
  color: #8fffc2

.upgrade__buy
  display: flex
  flex-direction: column
  align-items: flex-end
  gap: 0.1rem

.upgrade__level
  color: #9fb2d0
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.5rem, 2.2vw, 0.65rem)

.upgrade__cost
  display: inline-flex
  align-items: center
  gap: 0.2em
  color: #ffd93c
  font-weight: 900
  font-size: clamp(0.7rem, 3.2vw, 0.95rem)
  text-shadow: 2px 2px 0 #000

.upgrade__cost-icon
  width: 1em
  height: 1em

.upgrade__maxed
  color: #8fffc2
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.6rem, 2.8vw, 0.8rem)
  text-shadow: 2px 2px 0 #000
</style>
