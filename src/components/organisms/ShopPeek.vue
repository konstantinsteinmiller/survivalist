<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import IconCoin from '@/components/icons/IconCoin.vue'
import FHudBadge from '@/components/atoms/FHudBadge.vue'
import { UPGRADE_ICONS } from '@/components/icons/upgradeIcons'
import {
  UPGRADES, UPGRADE_ORDER, affordableCount, isMaxed, upgradeCost, upgradeLevel,
  upgradeSuffix, type UpgradeId
} from '@/use/useUpgrades'
import useTowerEconomy from '@/use/useTowerEconomy'
import { stage } from '@/use/useSurvivalGame'
import { pickPeek } from './shopPeek'

/**
 * ─── The shop peek ──────────────────────────────────────────────────────────
 *
 * A full-width plate on the result screen, directly above the button that opens
 * the shop, showing ONE upgrade the player can buy right now — its glyph, its
 * name, what it is worth today and what the next level makes it — plus the
 * count of tracks the wallet can currently pay for.
 *
 * ── The problem it answers ──
 *
 * The shop was two glyphs: a forge on the HUD with a small red count on it, and
 * the same forge in the result screen's action row. Both say "there is a screen
 * here". Neither says what is ON it, and the Poki fit test read exactly like
 * that — 64 % of sessions ended inside two minutes, most of them replaying the
 * same run with the same numbers. A player who never opens the shop is playing
 * a game with no progression in it, and the fix is not a louder button: it is
 * showing them a piece of the screen they have not opened. `1.5 → 1.8` is a
 * promise with a number on it; a cart glyph is a filing cabinet.
 *
 * ── Why it is the whole plate that is the button ──
 *
 * The count badge is the same red pill the forge on the HUD already wears, with
 * the same number in it, so the plate reads as the explanation of a mark the
 * player has been glancing at all run. The chevron at the trailing edge is the
 * only thing here that says "this leads somewhere", and it has to, because
 * every other element on the plate is about the upgrade rather than about the
 * shop.
 *
 * ── What it does NOT own ──
 *
 * Which track it shows (`shopPeek.ts`, so the rotation can be tested as a
 * sequence), what anything costs or what a level is worth (`useUpgrades.ts`, so
 * the plate can never promise a number the shop then disagrees with), and
 * opening the shop itself — it emits, and the scene decides, because the scene
 * is what knows whether an ad is in flight.
 */

const { t } = useI18n()
const { coins } = useTowerEconomy()

const props = defineProps<{
  /**
   * Result screens seen, ever (`resultsSeen`). Rotates which affordable track
   * the plate shows, so a career meets the whole board instead of one row of
   * it. See `pickPeek`.
   */
  rotation: number
}>()

const emit = defineEmits<{ open: [] }>()

/** Every track as the picker wants it: id, next level's price, and whether the
 *  board has anything left to sell on it. */
const tracks = computed(() =>
  UPGRADE_ORDER.map((id) => ({ id, cost: upgradeCost(id), maxed: isMaxed(id) }))
)

/**
 * The track on the plate.
 *
 * Pinned in a `ref` and fed back into the picker, which is what keeps the plate
 * still while it is on screen — including across a shop visit that buys the
 * very track it is naming. The pin dies with the component, and the component
 * is mounted by the result screen's `v-if`, so the next result screen is a
 * fresh mount and therefore a fresh rotation step.
 */
const pinned = ref<UpgradeId | null>(null)

const featured = computed<UpgradeId | null>(() => {
  const id = pickPeek({
    tracks: tracks.value, coins: coins.value, rotation: props.rotation, pinned: pinned.value
  })
  // Writing to a ref from inside a computed is normally a smell; here it is the
  // point. The pin is a latch, not derived state — once a track has been shown
  // it must keep being shown — and the alternative (a watcher) would let one
  // frame of a different track render before the latch caught up.
  pinned.value = id
  return id
})

interface Peek {
  id: UpgradeId
  name: string
  current: string
  next: string
  cost: number
  affordable: boolean
}

const peek = computed<Peek | null>(() => {
  const id = featured.value
  if (!id) return null
  const def = UPGRADES[id]
  const level = upgradeLevel(id)
  const suffix = upgradeSuffix(id)
  // Squad's readout is priced in the stage's own doors, so it is read for the
  // stage on screen — the same rule the shop modal follows, so the plate and
  // the row it is teasing print the same pair.
  const at = stage.value
  const cost = def.cost(level)
  return {
    id,
    name: t(`upgrades.names.${id}`),
    current: `${def.valueAt(level, at)}${suffix}`,
    next: `${def.valueAt(Math.min(def.maxLevel, level + 1), at)}${suffix}`,
    cost,
    affordable: coins.value >= cost
  }
})

/** The same number the forge button on the HUD wears. */
const affordable = computed(() => affordableCount(coins.value))

/**
 * The accessible name.
 *
 * An `aria-label` on a button REPLACES everything inside it, so the count badge
 * and the before → after pair are invisible to a screen reader unless this
 * string says them — which is why the count is interpolated into the label
 * rather than carried by an `sr-only` span that would never be read.
 *
 * Two whole sentences rather than one sentence plus a glued-on clause: "3 ready
 * to buy" is not a fragment every language can append to a name.
 */
const label = computed(() => {
  const name = peek.value?.name ?? ''
  return affordable.value > 0
    ? t('upgrades.peekLabelReady', { name, n: affordable.value })
    : t('upgrades.peekLabel', { name })
})
</script>

<template lang="pug">
  button.shop-peek(
    v-if="peek"
    type="button"
    :class="{ 'is-ready': peek.affordable }"
    :aria-label="label"
    @click="emit('open')"
  )
    //- The plate's own depth, drawn as a sibling rather than a `box-shadow`, so
    //- the press can move the face over a shadow that stays put — the same
    //- construction every other raised control in this game uses.
    span.shop-peek__shadow(aria-hidden="true")

    span.shop-peek__body
      //- The shine. A pseudo-element would have to live on the body, which also
      //- carries the plate's gradient; a real element can be clipped on its own
      //- and switched off by `prefers-reduced-motion` without touching either.
      span.shop-peek__shine(v-if="peek.affordable" aria-hidden="true")

      span.shop-peek__tile
        GameIcon(:name="UPGRADE_ICONS[peek.id]")

      span.shop-peek__text
        span.shop-peek__name {{ peek.name }}
        span.shop-peek__delta
          //- The whole reason the plate exists: a number the player owns, an
          //- arrow, and the number one purchase away from it.
          span.shop-peek__from {{ peek.current }}
          span.shop-peek__arrow →
          span.shop-peek__to {{ peek.next }}
          span.shop-peek__cost(:class="{ 'is-short': !peek.affordable }")
            IconCoin.shop-peek__cost-icon
            | {{ peek.cost }}

      span.shop-peek__end
        //- The same red pill the forge on the HUD wears, carrying the same
        //- number — the plate is the sentence that badge has been trying to say
        //- all run. Absent rather than zeroed when nothing is affordable: a "0"
        //- is a closed shop, and the plate is still showing a goal worth
        //- walking towards.
        FHudBadge(v-if="affordable > 0" tone="red") {{ affordable }}
        GameIcon.shop-peek__chevron(name="right")
</template>

<style scoped lang="sass">
// ─── The plate ──────────────────────────────────────────────────────────────
//
// Gold-edged slate, which is the vocabulary this screen already uses for "money
// happened" (`.result__milestone`) rather than the blue the
// shop's own rows wear. Deliberate: on THIS screen the plate is a piece of the
// coin economy, and it has to sit under a gold ×3 button and above a green
// forge without competing with either.
//
// Everything is sized in `vmin` and `clamp`, like the rest of the result
// screen: the axis this screen runs out of is the vertical one, and a ladder
// keyed on width alone stays fat on a landscape phone — which is exactly where
// it must not.
.shop-peek
  position: relative
  display: block
  width: 100%
  padding: 0
  border: 0
  background: none
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  transition: transform 90ms ease-out, filter 90ms ease-out

  &:hover
    filter: brightness(1.07)

  &:active
    transform: translateY(2px)

  &:active .shop-peek__shadow
    opacity: 0

  // Keyboard players get the same ring the rest of the game's controls get.
  &:focus-visible
    outline: 3px solid rgba(255, 217, 60, 0.9)
    outline-offset: 3px
    border-radius: clamp(0.5rem, 2.4vmin, 0.85rem)

.shop-peek__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: clamp(0.5rem, 2.4vmin, 0.85rem)
  background-color: #2a1c05

.shop-peek__body
  position: relative
  display: grid
  // Tile · text · end. The middle column is the only one allowed to shrink, and
  // `minmax(0, 1fr)` rather than `1fr` because a grid track's default `auto`
  // minimum refuses to go under its content — which is how a long German track
  // name pushes the count badge off a 320 px phone.
  grid-template-columns: auto minmax(0, 1fr) auto
  align-items: center
  gap: clamp(0.4rem, 2.2vmin, 0.7rem)
  width: 100%
  padding: clamp(0.3rem, 1.5vmin, 0.5rem) clamp(0.4rem, 2vmin, 0.7rem)
  border: 2px solid #0f1a30
  border-radius: clamp(0.5rem, 2.4vmin, 0.85rem)
  background-image: linear-gradient(to bottom, #3a2d10, #211708)
  // The gold hairline that ties the plate to the milestone pill above it.
  box-shadow: inset 0 0 0 1px rgba(255, 217, 60, 0.28)
  overflow: hidden
  text-align: left

.is-ready .shop-peek__body
  // Affordable is louder, not different: the same plate with the gold turned
  // up, so "you can buy something" is a property of the plate rather than a
  // second design.
  border-color: rgba(255, 217, 60, 0.55)
  background-image: linear-gradient(to bottom, #4a3812, #2a1d09)

// ─── The shine ──────────────────────────────────────────────────────────────
//
// One sweep every 3.4 s, only while something is actually affordable. Slow
// enough that it never competes with the ×3 button breathing above it — the
// plate is the second-loudest thing on this screen on purpose, not the first.
.shop-peek__shine
  position: absolute
  top: 0
  bottom: 0
  left: -60%
  width: 45%
  background-image: linear-gradient(105deg, rgba(255, 255, 255, 0) 0%, rgba(255, 246, 209, 0.22) 50%, rgba(255, 255, 255, 0) 100%)
  pointer-events: none
  animation: shop-peek-shine 3.4s ease-in-out infinite

@keyframes shop-peek-shine
  0%
    transform: translateX(0)
  // Held off the plate for most of the cycle: the sweep is the event, the wait
  // is what makes it one.
  55%, 100%
    transform: translateX(370%)

// ─── The track's glyph ──────────────────────────────────────────────────────
//
// One gold tile for every track, not a tint per track like the shop's rows use.
// The plate is about the SHOP; the glyph only says which row is being teased,
// and nine plates in nine colours would read as nine different features.
.shop-peek__tile
  position: relative
  display: flex
  align-items: center
  justify-content: center
  flex: 0 0 auto
  width: clamp(1.9rem, 8vmin, 2.6rem)
  height: clamp(1.9rem, 8vmin, 2.6rem)
  border: 2px solid rgba(0, 0, 0, 0.5)
  border-radius: 0.55rem
  background-image: linear-gradient(to bottom, #ffcd00, #f7a000)
  color: #3a2708

  svg
    width: 62%
    height: 62%

.shop-peek__text
  display: flex
  flex-direction: column
  gap: 0.05rem
  min-width: 0

.shop-peek__name
  color: #fff
  font-weight: 900
  text-transform: uppercase
  line-height: 1.1
  font-size: clamp(0.68rem, 3vmin, 0.95rem)
  text-shadow: 2px 2px 0 #000
  // The one string on the plate whose length is not ours to choose — 21 locales
  // and "Feuergeschwindigkeit" among them. It gets the whole middle column and
  // gives up its tail rather than wrapping the plate onto a second line.
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

.shop-peek__delta
  display: flex
  align-items: center
  flex-wrap: wrap
  gap: 0.25em
  font-weight: 900
  line-height: 1.15
  font-size: clamp(0.6rem, 2.7vmin, 0.82rem)
  // Numbers only, and they change as the player buys — tabular so the row does
  // not twitch sideways between two widths of the same digit count.
  font-variant-numeric: tabular-nums

.shop-peek__from
  color: #8fd6ff

.shop-peek__arrow
  color: #7d8ba6

.shop-peek__to
  color: #8fffc2

.shop-peek__cost
  display: inline-flex
  align-items: center
  gap: 0.2em
  // Pushed to the trailing edge of the line so the before → after pair and the
  // price are two readings rather than one run-on number.
  margin-inline-start: auto
  color: #ffd93c
  text-shadow: 2px 2px 0 #000

  // Out of reach: the price is still the point of the plate, so it stays gold
  // and legible — it just stops claiming to be a button.
  &.is-short
    color: rgba(255, 217, 60, 0.62)
    text-shadow: none

.shop-peek__cost-icon
  flex: 0 0 auto
  width: 1em
  height: 1em

.shop-peek__end
  display: flex
  align-items: center
  gap: clamp(0.15rem, 1vmin, 0.35rem)
  flex: 0 0 auto

.shop-peek__chevron
  flex: 0 0 auto
  width: clamp(0.85rem, 3.6vmin, 1.15rem)
  height: clamp(0.85rem, 3.6vmin, 1.15rem)
  color: rgba(255, 255, 255, 0.55)

// The count badge sits inside `FHudBadge`, which sizes itself off `vw`. On a
// wide desktop that is enormous next to a plate sized in `vmin`, so it is
// pinned to the plate's own scale here.
//
// Scoped through `.shop-peek__end` rather than a bare `:deep(.f-hud-badge)`,
// and that is load-bearing: the bare form compiles to `[data-v-parent]
// .f-hud-badge`, which ties on specificity with the badge's own
// `.f-hud-badge[data-v-badge]` and would then be settled by whichever
// stylesheet the bundler happened to emit second.
.shop-peek__end :deep(.f-hud-badge)
  min-width: clamp(1rem, 4.4vmin, 1.35rem)
  min-height: clamp(1rem, 4.4vmin, 1.35rem)
  font-size: clamp(0.55rem, 2.5vmin, 0.78rem)

.is-ready .shop-peek__end :deep(.f-hud-badge)
  animation: shop-peek-badge 2.6s ease-in-out infinite

@keyframes shop-peek-badge
  0%, 72%, 100%
    transform: scale(1)
  80%
    transform: scale(1.18)
  88%
    transform: scale(0.96)

// ─── Short viewport ─────────────────────────────────────────────────────────
//
// A landscape phone, or any embed under 34rem tall — the same tier the result
// screen's own ornament gives way at. The plate stays (it is the feature), but
// it stops being a two-line plate with a picture on it: the tile shrinks and
// the name and the numbers share one line's worth of leading.
@media (max-height: 34rem)
  .shop-peek__tile
    width: clamp(1.6rem, 6.5vmin, 2.1rem)
    height: clamp(1.6rem, 6.5vmin, 2.1rem)

  .shop-peek__body
    padding-block: clamp(0.22rem, 1vmin, 0.35rem)

  .shop-peek__shine
    animation: none

@media (prefers-reduced-motion: reduce)
  .shop-peek__shine
    animation: none

  .is-ready .shop-peek__end :deep(.f-hud-badge)
    animation: none
</style>
