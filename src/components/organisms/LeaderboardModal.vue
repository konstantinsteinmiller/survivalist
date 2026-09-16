<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatCount } from '@/utils/localeNumber'
import { useI18n } from 'vue-i18n'
import FModal from '@/components/molecules/FModal.vue'
import { bestStage } from '@/use/useSurvivalGame'
import { playerDisplayName } from '@/use/usePlayerIdentity'
import {
  OUTSIDE_BOARD, boardSize, ensureBoard, leaderboard, leaderboardFailed,
  leaderboardPending, rankFor, rankTotalFor
} from '@/use/useLeaderboard'
import {
  ensurePortalBoard, portalBoardLabel, portalBoardLoaded, portalBoardPending,
  portalBoardVisible, portalEntries
} from '@/use/usePortalLeaderboard'

/**
 * ─── The global board ───────────────────────────────────────────────────────
 *
 * The top 100 by DEEPEST STAGE EVER REACHED, with the biggest squad as the
 * second column — two players on stage 40 are not the same player, and the
 * squad is the thing they compare.
 *
 * Four states, and three of them are not the happy one: still loading, nothing
 * to show, and the endpoint is unreachable. All three have to say something
 * plain, because a leaderboard that opens onto a blank rectangle reads as a
 * broken game rather than a quiet network.
 *
 * The player is told where they stand even when they are not on the board —
 * that footer is the whole reason a player who is #4 000 opens this screen at
 * all.
 */

const model = defineModel<boolean>({ required: true })
const { t, locale } = useI18n()

const entries = computed(() => leaderboard.value?.entries ?? [])

/**
 * The name the player's row would carry.
 *
 * Resolved lazily rather than at import time: `resolveIdentity` mints and
 * persists an id on its first call, and doing that before the player has ever
 * opened the board would put an identity in the save of someone who never used
 * the feature.
 */
const ownName = ref('')

/**
 * Highlight the player's own row.
 *
 * A NAME MATCH, not an id match, and it can false-positive: the board endpoint
 * publishes no ids (deliberately — a public id is a public write key), so two
 * players who both called themselves "Ace" both get the highlight. That is the
 * right trade here. The alternative is highlighting nothing, and the row a
 * player came to find is the only row on the screen they care about.
 */
const isYou = (name: string): boolean => ownName.value.length > 0 && name === ownName.value

const onBoard = computed(() => entries.value.some((e) => isYou(e.name)))

/** The player's own rank, for the footer. `0` means "nothing to say yet". */
const ownRank = computed(() => rankFor(bestStage.value))

/**
 * A whole number, grouped the way the PLAYER's language groups it.
 *
 * Read inside the render rather than bound once at setup: a formatter built in
 * `setup()` keeps whichever locale was active on first paint, so switching
 * language would leave English commas on a German board. Reading
 * `locale.value` here makes every computed that calls it re-run on the switch.
 *
 * It matters most on this screen, which formats a rank per row for a hundred
 * rows — `#41032` is five digits to count, `#41,032` is a placing.
 */
const grouped = (n: number): string => formatCount(n, locale.value)

/** Below the cut the exact rank is unknowable — the server only publishes its
 *  top slice — so the honest label is "past the last row we can see". */
const ownRankLabel = computed(() =>
  ownRank.value === OUTSIDE_BOARD ? `${grouped(boardSize.value)}+` : grouped(ownRank.value)
)

/**
 * ─── One sentence, both numbers ─────────────────────────────────────────────
 *
 * "You are #1,130 of 2,531" — and it is ONE message rather than a rank plus an
 * "of N" fragment, because the word order belongs to the locale. Japanese is
 * "{total} 人中 #{n} 位"; Korean, Turkish, Kazakh, Uzbek, Hindi and Chinese also
 * lead with the population. A footer split into two spans renders every one of
 * them backwards, and a locale-parity test cannot see it — both halves are
 * present, translated, and carrying the right placeholders.
 *
 * Both values arrive PRE-FORMATTED, which is what makes the grouping the
 * player's own (`utils/localeNumber`) and is why neither message may be
 * pluralised on `|`.
 */
const footerLine = computed(() => t('leaderboard.yourRank', {
  n: ownRankLabel.value,
  // Not `playerTotal`: a build that ranks an unplayed player last counts them
  // into the population ("#7,832 of 7,832"). See `rankTotalFor`.
  total: grouped(rankTotalFor(bestStage.value))
}))

const showOwnRank = computed(() => !onBoard.value && ownRank.value !== 0)

const showLoading = computed(() => leaderboardPending.value && entries.value.length === 0)
const showFailed = computed(() =>
  !leaderboardPending.value && leaderboardFailed.value && entries.value.length === 0)
const showEmpty = computed(() =>
  !leaderboardPending.value && !leaderboardFailed.value && leaderboard.value !== null
  && entries.value.length === 0)

/**
 * ─── The portal's own board, as a second tab ────────────────────────────────
 *
 * On Playgama the portal runs a live leaderboard of its own and draws no UI for
 * it (`in_game`), so it gets a tab here. Only a tab: the rank chip and this
 * modal's footer stay on OUR board, because two rank sources on one screen that
 * disagree read as a bug.
 *
 * No tabs at all on every other build — `portalBoardVisible` is false — so the
 * modal keeps its title ribbon exactly as before. And no error state for the
 * portal board either: a read that fails hides the tab, and a tab that vanishes
 * while selected drops the player back onto ours via `showPortal`.
 */
const activeTab = ref<'global' | 'portal'>('global')

const tabs = computed(() => portalBoardVisible.value && portalBoardLabel.value
  ? [
    { label: t('leaderboard.tabGlobal'), value: 'global' },
    // A brand name, deliberately untranslated.
    { label: portalBoardLabel.value, value: 'portal' }
  ]
  : [])

const showPortal = computed(() => portalBoardVisible.value && activeTab.value === 'portal')
const showPortalLoading = computed(() => portalBoardPending.value && portalEntries.value.length === 0)
const showPortalEmpty = computed(() =>
  !portalBoardPending.value && portalBoardLoaded.value && portalEntries.value.length === 0)

// Fetched on OPEN, not on mount: the modal is mounted for the whole session and
// most sessions never open it. `ensureBoard` is idempotent and cached, so a
// player who opens the board six times still costs one request — and a previous
// failure is retried, which makes reopening the screen the retry button.
watch(model, (open) => {
  if (!open) return
  void ensureBoard()
  // Same rules for the portal's board; a no-op on every build without one.
  void ensurePortalBoard()
  void playerDisplayName().then((name) => { ownName.value = name })
}, { immediate: true })
</script>

<template lang="pug">
  FModal(
    v-model="model"
    v-model:activeTab="activeTab"
    :title="t('leaderboard.title')"
    :tabs="tabs"
  )
    //- The portal's board: rank, name, stage — it has no squad column to show.
    //- Its own row is matched by the portal's player id, not by name.
    div.board(v-if="showPortal")
      div.board__head.is-portal
        span.board__col.is-rank {{ t('leaderboard.rank') }}
        span.board__col.is-name {{ t('leaderboard.player') }}
        span.board__col.is-stage {{ t('leaderboard.stage') }}

      div.board__state(v-if="showPortalLoading") {{ t('leaderboard.loading') }}
      div.board__state(v-else-if="showPortalEmpty") {{ t('leaderboard.empty') }}

      div.board__list(v-else)
        div.board-row.is-portal(
          v-for="(entry, i) in portalEntries"
          :key="`portal-${entry.rank}-${i}`"
          :class="{ 'is-you': entry.isYou }"
        )
          span.board-row__rank {{ grouped(entry.rank) }}
          span.board-row__name
            span.board-row__name-text {{ entry.name || t('leaderboard.player') }}
            span.board-row__you(v-if="entry.isYou") {{ t('leaderboard.you') }}
          span.board-row__stage {{ entry.score }}

    div.board(v-else)
      div.board__head
        span.board__col.is-rank {{ t('leaderboard.rank') }}
        span.board__col.is-name {{ t('leaderboard.player') }}
        span.board__col.is-stage {{ t('leaderboard.stage') }}
        span.board__col.is-squad {{ t('leaderboard.squad') }}

      div.board__state(v-if="showLoading") {{ t('leaderboard.loading') }}
      div.board__state.is-failed(v-else-if="showFailed") {{ t('leaderboard.failed') }}
      div.board__state(v-else-if="showEmpty") {{ t('leaderboard.empty') }}

      div.board__list(v-else)
        div.board-row(
          v-for="(entry, i) in entries"
          :key="`${entry.rank}-${entry.name}-${i}`"
          :class="{ 'is-you': isYou(entry.name) }"
        )
          span.board-row__rank {{ grouped(entry.rank) }}
          span.board-row__name
            span.board-row__name-text {{ entry.name }}
            span.board-row__you(v-if="isYou(entry.name)") {{ t('leaderboard.you') }}
          span.board-row__stage {{ entry.score }}
          span.board-row__squad {{ grouped(entry.squad) }}

      //- Where the player stands when they are not up there. The reason a
      //- player outside the top 100 opens this screen at all.
      //- ── ONE message carrying BOTH numbers, rendered as ONE element ──
      //-
      //- This was a "#1,130" span and an "of 2,531" span, which is the obvious
      //- shape because the two numbers want different weights. It is wrong in
      //- every language that leads with the POPULATION: Japanese is
      //- "{total} 人中 #{n} 位", and Korean, Turkish and Kazakh do the same — a
      //- split renders all four backwards, and a locale-parity test cannot see
      //- it, because both halves are present, translated, and carrying the
      //- right placeholders. The word order belongs to the locale, so the whole
      //- sentence has to be one string it can reorder.
      //-
      //- If the population ever needs to recede visually again, change the
      //- weight of the whole line rather than splitting it.
      div.board__footer(v-if="showOwnRank")
        span.board__footer-rank {{ footerLine }}
</template>

<style scoped lang="sass">
// One grid template, shared by the header and every row, so the columns line up
// without a table and without a fixed width anywhere. The name column is the
// only flexible one — the three numbers are as wide as their content and no
// wider, which is what keeps four columns on a 320 px screen.
$cols: clamp(1.6rem, 8vw, 2.4rem) minmax(0, 1fr) clamp(2rem, 9vw, 3rem) clamp(2.2rem, 10vw, 3.4rem)
// The portal's board has no squad column, so the name takes that width.
$cols-portal: clamp(1.6rem, 8vw, 2.4rem) minmax(0, 1fr) clamp(2rem, 9vw, 3rem)

.board
  display: flex
  flex-direction: column
  gap: clamp(0.15rem, 0.8vw, 0.3rem)
  width: 100%

.board__head
  display: grid
  grid-template-columns: $cols
  gap: clamp(0.3rem, 2vw, 0.6rem)
  padding: 0 clamp(0.3rem, 1.6vw, 0.6rem) clamp(0.15rem, 0.8vw, 0.3rem)
  border-bottom: 2px solid rgba(255, 255, 255, 0.12)

  &.is-portal
    grid-template-columns: $cols-portal

.board__col
  color: #9fb2d0
  font-weight: 900
  text-transform: uppercase
  letter-spacing: 0.02em
  font-size: clamp(0.5rem, 2.2vw, 0.65rem)
  text-align: right

  &.is-rank, &.is-name
    text-align: left

.board__list
  display: flex
  flex-direction: column
  gap: clamp(0.15rem, 0.8vw, 0.3rem)

.board-row
  display: grid
  grid-template-columns: $cols
  align-items: center
  gap: clamp(0.3rem, 2vw, 0.6rem)
  padding: clamp(0.22rem, 1.2vw, 0.42rem) clamp(0.3rem, 1.6vw, 0.6rem)
  border: 2px solid transparent
  border-radius: clamp(0.35rem, 1.8vw, 0.6rem)
  background-color: rgba(0, 0, 0, 0.22)

  &.is-portal
    grid-template-columns: $cols-portal

  // Zebra striping rather than a border per row: 100 rows of border is a wall.
  &:nth-child(even)
    background-color: rgba(0, 0, 0, 0.08)

  // The row the player came here to find.
  &.is-you
    border-color: #ffcd00
    background-image: linear-gradient(to bottom, #3a4a24, #2a3a18)
    background-color: transparent

.board-row__rank
  color: #ffd93c
  font-weight: 900
  font-size: clamp(0.62rem, 2.8vw, 0.85rem)
  text-align: left
  text-shadow: 1px 1px 0 #000

.board-row__name
  display: flex
  align-items: baseline
  gap: 0.35em
  min-width: 0

.board-row__name-text
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap
  color: #fff
  font-weight: 700
  font-size: clamp(0.62rem, 2.8vw, 0.85rem)
  text-align: left

.board-row__you
  flex: 0 0 auto
  color: #ffcd00
  font-weight: 900
  text-transform: uppercase
  letter-spacing: 0.03em
  font-size: clamp(0.45rem, 2vw, 0.6rem)

.board-row__stage
  color: #8fd6ff
  font-weight: 900
  font-size: clamp(0.62rem, 2.8vw, 0.85rem)
  text-align: right
  text-shadow: 1px 1px 0 #000

.board-row__squad
  color: #b9cbe8
  font-weight: 700
  font-size: clamp(0.6rem, 2.6vw, 0.8rem)
  text-align: right

.board__state
  padding: clamp(1rem, 8vw, 2.5rem) clamp(0.5rem, 3vw, 1rem)
  color: #b9cbe8
  font-weight: 700
  text-align: center
  font-size: clamp(0.65rem, 3vw, 0.9rem)
  line-height: 1.35

  &.is-failed
    color: #ffa6a6

.board__footer
  display: flex
  flex-wrap: wrap
  align-items: baseline
  justify-content: center
  gap: 0.15rem 0.4rem
  margin-top: clamp(0.2rem, 1.2vw, 0.45rem)
  padding: clamp(0.3rem, 1.6vw, 0.55rem) clamp(0.4rem, 2vw, 0.8rem)
  border: 2px solid #ffcd00
  border-radius: clamp(0.35rem, 1.8vw, 0.6rem)
  background-color: rgba(0, 0, 0, 0.3)

.board__footer-rank
  color: #ffd93c
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.68rem, 3.2vw, 0.95rem)
  text-shadow: 2px 2px 0 #000

</style>
