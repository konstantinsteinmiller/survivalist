<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RunPhase } from '@/use/useSurvivalGame'
import GameIcon from '@/components/icons/GameIcon.vue'
import type { GameIconName } from '@/components/icons/iconNames'
import { playFx } from '@/use/useGameAudio'
import { crossedMilestone, milestoneRung } from '@/components/game/squadMilestones'

/**
 * The run readout.
 *
 * ONE number and one rail, and nothing else — a runner is played with the eyes
 * on the lane, so anything in the HUD that cannot be read in a quarter of a
 * second is worse than not being there:
 *
 *   STAGE   — where you are (and the best you have ever done, small, beside it)
 *   SQUAD   — how many of you there are. The number the whole game is about,
 *             and now the only stat on the strip — it tints green when the
 *             crowd grows and red when it shrinks (see `squadMove`).
 *   RAIL    — how far through the stage you are, with the boss skull at the end
 *
 * During the boss fight the rail turns into the boss's health, because at that
 * point "how far along am I" and "how dead is it" are the same question.
 *
 * The strip carried three more chips until a first-contact playtest — damage,
 * fire rate, and the streak flame. They are gone; the argument is on the
 * `damage` prop below, where the props that outlived their chips live.
 */

interface Props {
  stage: number
  /**
   * A headline other than "Stage N".
   *
   * One caller: the daily expedition, whose `stage` is a rung on the difficulty
   * curve rather than a place in the campaign — printing "Stage 16" over it
   * would tell a player on stage 12 that they had jumped four stages, and the
   * number would still be there on the HUD after they went back. The stage
   * banner takes the same override for the same reason.
   */
  label?: string | null
  best: number
  /** 0..1 along the stage. */
  progress: number
  squad: number
  /**
   * ─── Three numbers this HUD is given and does not draw ────────────────────
   *
   * `damage`, `fireRate` and `challenge` are still accepted, and nothing is
   * rendered from any of them.
   *
   * Five first-time players were sat in front of the four-chip stats row and
   * four of them could not name a single chip on it. The orange streak flame
   * was read as a DROPLET by all four and nobody guessed "win streak"; the
   * bolt and the clock were matched to damage and fire rate only after the
   * player had opened the shop and seen the same glyphs next to their prices.
   * A readout nobody can decode is worse than no readout at all: it spends the
   * one corner of the screen a runner's player ever glances at on three
   * mysteries, and it leaves the number the whole game is about sitting in the
   * middle of them looking like a fourth. Teaching the three was considered
   * and rejected — the owner's call was deletion, because a chip that needs a
   * tutorial is not a chip that can be read in a quarter of a second.
   *
   * The PROPS stay for a reason that is not laziness: `GameScene.vue` binds all
   * three, and dropping them from this interface would move the change into a
   * file that has no stake in it and that other people are editing right now.
   * An accepted-and-ignored prop costs a render nothing. If a later HUD wants
   * these numbers back it will want them from exactly this source — so do not
   * "tidy" them away without editing the scene in the same commit.
   */
  damage: number
  /** Live shots/second per shooter — the stat rate crates raise. Accepted and
   *  not drawn; see `damage` above. */
  fireRate: number
  phase: RunPhase
  /** 0..1 boss health; only read while `phase === 'boss'`. */
  bossHp: number
  /** A miniboss is on the field. */
  elite: boolean
  /** 0..1 miniboss health. */
  eliteHp: number
  /** Stages cleared in a row — the autobalancer's handicap. Accepted and not
   *  drawn: the flame that used to show it is the chip the playtest killed
   *  outright, and a handicap shown as a droplet is worse than one shown as
   *  nothing. See `damage` above. */
  challenge: number
  /**
   * Stages left until the next milestone pays (`milestoneReward`), or null to
   * hide the chip.
   *
   * A COUNT, not a stage number: "2" is a distance the player can act on, and
   * "stage 10" is a fact they have to subtract from. Drawn as a star and a
   * digit with no words at all — the whole chip is two characters wide, which
   * is the only reason a HUD already carrying five readouts can afford it.
   *
   * The glyph is `star` rather than `chest` on purpose: the treasure chest is a
   * button living ten pixels away on the same screen, and two different things
   * may not wear the same drawing.
   */
  milestoneIn?: number | null
  /**
   * The next rung of the gift ladder (`game/ladder.ts`), as a chip under the
   * stage label: a glyph and "Shield · next stage". A goal two stages ahead is
   * the cheapest reason there is to start the next stage, and the HUD is the
   * one place it can be checked mid-run without reading anything.
   */
  nextUnlock?: { icon: GameIconName; text: string } | null
  /**
   * The beats worth a mark on the rail, as fractions of the road: the weapon
   * box (a detour worth taking) and the elites (a fight coming). The boss is
   * the skull the rail already ends in.
   */
  beats?: ReadonlyArray<{ at: number; icon: GameIconName; kind: 'weapon' | 'elite' }>
}

const props = withDefaults(defineProps<Props>(), { label: null, nextUnlock: null, beats: () => [] })
const { t } = useI18n()

const isBoss = computed(() => props.phase === 'boss')
const railPct = computed(() =>
  Math.round(Math.max(0, Math.min(1, num(isBoss.value ? props.bossHp : props.progress))) * 100)
)
const elitePct = computed(() => Math.round(Math.max(0, Math.min(1, num(props.eliteHp)) * 100)))

/**
 * Every number that reaches this HUD goes through here first.
 *
 * A readout is the one place in a game where a bad number is guaranteed to be
 * seen: a `NaN` in the squad chip reads as a broken game even when the
 * simulation underneath is fine, and it only takes one undefined prop (a
 * hot-reloaded parent, a prop renamed on one side of a refactor) to produce
 * one. The HUD refusing to render nonsense is cheaper than every future caller
 * remembering not to send it.
 */
const num = (v: number): number => (Number.isFinite(v) ? v : 0)

const squadLabel = computed(() => Math.max(0, Math.round(num(props.squad))))

/**
 * ─── The round-number punch ─────────────────────────────────────────────────
 *
 * The squad chip is the one number the whole game is about and it has spent its
 * life sliding silently upward. When the crowd crosses a rung of the doubling
 * ladder (25, 50, 100, 200, 400 …; the rule and the reasoning live in
 * `squadMilestones.ts`) the chip takes a hit, a chime plays once, and a small
 * gold word appears under it for a beat.
 *
 * It lives HERE rather than in the simulation because it is a readout event,
 * not a game event: nothing about the run changes, and the sim has no business
 * knowing that a number looks round to a human. The HUD already receives every
 * input the decision needs.
 *
 * ─── Where the run resets ───────────────────────────────────────────────────
 *
 * Two signals, because neither alone covers both ways a run begins, and the
 * cost of the two mistakes is not symmetric: failing to re-arm costs a player
 * the early chimes of one run, while re-arming inside a run replays the whole
 * ladder — which is exactly the bug this feature is most likely to ship with.
 * So both signals are the CONSERVATIVE reading of "a run ended".
 *
 *   phase 'clear' | 'wipe' → 'run'   `startStage` is the only place a run
 *     begins and the last thing it does is set `phase` back to `'run'`. Coming
 *     from a FINISHED run is the part that matters: `'boss'` → `'run'` is not
 *     spelled here, because a boss fight is the middle of a run and a future
 *     path out of one must not be read as a new run.
 *   stage number changes   the retry case's opposite. `retryStage` repeats the
 *     number (so the phase edge above is what catches it), and a mode that
 *     jumps stages without passing through a result screen — the daily
 *     expedition does — changes the number without one.
 *
 * What is deliberately NOT a signal: the squad reaching zero. That is a wipe
 * AND a rally, and a rally is the one moment in the game where the player is
 * handed something for free — re-announcing 25, 50 and 100 on top of it would
 * turn a reprieve into a slot machine.
 */
/** The biggest rung announced this run. 0 at the start of one. */
const highestMilestone = ref(0)
/**
 * Bumped once per announcement, and bound to the chip's `key`.
 *
 * A CSS animation cannot be re-triggered by changing a custom property — the
 * animation is already running (or finished), and nothing about a variable
 * write restarts it. Re-keying the element makes Vue mount a fresh node, whose
 * animation starts from frame zero, which is the cheapest correct restart there
 * is: no reflow forcing, no double-class ping-pong, no JS driving the frames.
 */
const punchCount = ref(0)
/** The milestone currently being shown as a word, or 0 for none. */
const milestoneShown = ref(0)
let milestoneTimer: ReturnType<typeof setTimeout> | null = null

/** How long the word stays. Long enough to read a two-word phrase at a glance,
 *  short enough that a `×3` door crossing a rung mid-fight is not still
 *  labelled when the next bank arrives. */
const MILESTONE_WORD_MS = 1400

const announceMilestone = (milestone: number): void => {
  highestMilestone.value = milestone
  punchCount.value += 1
  milestoneShown.value = milestone
  // The mixer's own gates (ad up, paused, muted) and its throttle apply — this
  // is a `playFx` like any other, deliberately: a chime that played under an
  // interstitial would be the same bug the whole audio layer is built to avoid.
  playFx('squadMilestone', milestoneRung(milestone))
  if (milestoneTimer) clearTimeout(milestoneTimer)
  milestoneTimer = setTimeout(() => {
    milestoneShown.value = 0
    milestoneTimer = null
  }, MILESTONE_WORD_MS)
}

/**
 * ─── Which way the crowd just moved ─────────────────────────────────────────
 *
 * The same playtest that killed the other three chips found that nobody read
 * this one as a COUNT OF PEOPLE either — it was a number beside a glyph, and a
 * number beside a glyph is what the other three were. The glyph is redrawn as a
 * crowd (`iconPaths.ts`), and the chip now says which way that crowd is going:
 * green while it grows, red while it shrinks. A player who has learnt nothing
 * else still learns "red is bad, and it happens when I touch that" inside one
 * stage, which is the whole lesson the HUD is there to teach.
 *
 * ─── Why this is a LATCH and not a watcher ──────────────────────────────────
 *
 * `squad` moves several times a second — a gate bank pays out in per-frame
 * increments, a boss sweep takes bodies the same way — so a tint driven
 * directly off the prop would strobe, and a queue of tints would still be
 * playing the payout back after the payout had ended. So:
 *
 *   • the DIRECTION is latched and the tint is held for a fixed window;
 *   • another change the same way only EXTENDS the window (a 40-frame payout is
 *     one continuous green, not forty flashes);
 *   • a change the other way is dropped rather than queued — the run has moved
 *     on by the time a queue would drain, and the next real change re-tints
 *     within a frame anyway;
 *   • except that a LOSS always interrupts a gain. Red outranks green because
 *     the two mistakes do not cost the same: a gain the player missed costs
 *     them nothing, and a loss they missed is how they arrive at the result
 *     screen with no idea what hit them. A payout that was still running paints
 *     itself green again on its very next increment.
 *
 * It tints the ICON and nothing else: no size, no position, no margin. The chip
 * is already animated on its own axis (the milestone punch scales the whole
 * plate) and two animations on one box fight each other — this one rides on
 * `color` and a drop-shadow, which cannot move the row it is in even by a
 * subpixel. A reduced-motion preference therefore has nothing to switch off
 * here: the cue is a colour, not a movement, and this file's position on that
 * (see the punch's still variant) is that feedback survives the preference.
 */
type SquadMove = 'up' | 'down'
/** The direction being shown, or null for none. */
const squadMove = ref<SquadMove | null>(null)
let squadMoveTimer: ReturnType<typeof setTimeout> | null = null

/** How long each tint is held.
 *
 *  Short enough to read as a hit rather than a state — a chip that stays green
 *  for a second is a chip that is green — and the loss is held half again as
 *  long because it is the one of the two that has to survive being seen out of
 *  the corner of an eye while the player is dodging the thing that caused it. */
const SQUAD_GAIN_MS = 300
const SQUAD_LOSS_MS = 460

const flashSquad = (dir: SquadMove): void => {
  // The one asymmetry in the rule — see the block above.
  if (dir === 'up' && squadMove.value === 'down') return
  squadMove.value = dir
  if (squadMoveTimer) clearTimeout(squadMoveTimer)
  squadMoveTimer = setTimeout(() => {
    squadMove.value = null
    squadMoveTimer = null
  }, dir === 'up' ? SQUAD_GAIN_MS : SQUAD_LOSS_MS)
}

const clearSquadMove = (): void => {
  squadMove.value = null
  if (squadMoveTimer) {
    clearTimeout(squadMoveTimer)
    squadMoveTimer = null
  }
}

watch(() => props.squad, (next, prev) => {
  const milestone = crossedMilestone(highestMilestone.value, num(next))
  if (milestone > 0) announceMilestone(milestone)
  // Rounded on both sides, because the chip shows a rounded number: a crowd
  // drifting 19.6 → 19.4 as bodies settle is not a loss the player can see, and
  // tinting it red would make the HUD look like it was reporting phantom deaths.
  const from = Math.round(num(prev))
  const to = Math.round(num(next))
  if (to > from) flashSquad('up')
  else if (to < from) flashSquad('down')
})

const rearmMilestones = (): void => {
  highestMilestone.value = 0
  milestoneShown.value = 0
  // A tint held across the seam would be a statement about the run that just
  // ended, sitting on the first frame of the next one.
  clearSquadMove()
  if (milestoneTimer) {
    clearTimeout(milestoneTimer)
    milestoneTimer = null
  }
}

watch(() => props.phase, (next, prev) => {
  if (next === 'run' && (prev === 'clear' || prev === 'wipe')) rearmMilestones()
})

watch(() => props.stage, () => rearmMilestones())

// The HUD outlives most runs, but it is unmounted with the scene on the way to
// the menu — and a timer holding a ref past that is the classic way a "the
// component is gone" warning appears in a portal QA console.
onBeforeUnmount(() => {
  if (milestoneTimer) clearTimeout(milestoneTimer)
  milestoneTimer = null
  clearSquadMove()
})
</script>

<template lang="pug">
  div.run-hud
    div.run-hud__row
      //- ── Two things, and the rail directly under them ──────────────────
      //-
      //- This column carried four: the stage, the career best, the ladder's
      //- promise and a milestone countdown. Two of those are gone and the rail
      //- has moved up into the space, because the column was pushing the
      //- progress bar a third of the way down a phone.
      //-
      //-   BEST — "Best 3" under "Stage 4". A career best is a number you
      //-   cannot act on and cannot go back to; the stage number already says
      //-   where you are, and the result screen says the record when it means
      //-   something.
      //-
      //-   ★ 4  — the milestone countdown. Nobody read it. It was a glyph and a
      //-   digit with no unit, sitting next to another glyph and digit, and a
      //-   counter whose subject has to be guessed is not a goal two stages
      //-   ahead — it is one more thing to ignore. The payout it counted down
      //-   to still lands, and still names itself on the result screen.
      div.run-hud__stage
        span.run-hud__stage-label {{ label ?? t('hud.stage', { n: stage }) }}
        //- The promise. Gold, like the banner's, and never during the boss:
        //- the fight is the only thing the player should be reading then.
        span.run-hud__next(v-if="nextUnlock && !isBoss")
          GameIcon.run-hud__next-icon(:name="nextUnlock.icon")
          span.run-hud__next-text {{ nextUnlock.text }}

      div.run-hud__stats
        //- Re-keyed on every milestone so the punch animation restarts from
        //- frame zero — see `announceMilestone`. The word hangs off the chip's
        //- own box (`top: 100%`) so a milestone never moves the row it is in.
        div.run-hud__chip.is-squad(:key="punchCount" :class="{ 'is-punched': punchCount > 0 }")
          //- Green up, red down, held for a beat — see `squadMove`. The class
          //- rides on the ICON so nothing in the row can move.
          GameIcon.run-hud__icon(
            name="squad"
            :class="{ 'is-gain': squadMove === 'up', 'is-loss': squadMove === 'down' }"
          )
          span.run-hud__value {{ squadLabel }}
          span.run-hud__milestone(v-if="milestoneShown > 0") {{ t('hud.milestone', { n: milestoneShown }) }}

    div.run-hud__rail(:class="{ 'is-boss': isBoss }")
      //- The CHIP. A second fill on the same number with a slower, delayed
      //- transition, so a hit leaves a pale streak behind the red that catches
      //- up a moment later. It is the single cheapest thing that makes a health
      //- bar read as a health bar rather than as a progress rail — and it is
      //- the only part of the bar that says HOW HARD you just hit, which a
      //- smoothly shrinking edge cannot.
      div.run-hud__rail-chip(v-if="isBoss" :style="{ width: railPct + '%' }")
      div.run-hud__rail-fill(:style="{ width: railPct + '%' }")
      //- Notches and a glass sheen, painted over the fill. Both are gradients on
      //- an empty element rather than markup: a boss bar wants segmenting so a
      //- quarter is readable at a glance, and neither should cost a DOM node.
      div.run-hud__rail-ticks(v-if="isBoss")
      div.run-hud__rail-sheen
      GameIcon.run-hud__rail-skull(v-if="isBoss" name="skull")
      span.run-hud__rail-text(v-if="isBoss") {{ t('hud.boss') }}
      GameIcon.run-hud__rail-icon(v-else name="skull")
      //- What is on the road ahead, where it is. Lit once the crowd has
      //- passed it, so the rail also says what was missed.
      template(v-if="!isBoss")
        GameIcon.run-hud__mark(
          v-for="(b, i) in beats"
          :key="i"
          :name="b.icon"
          :class="[`is-${b.kind}`, { 'is-passed': progress >= b.at }]"
          :style="{ left: (b.at * 100).toFixed(1) + '%' }"
        )

    //- Miniboss bar. Sits UNDER the stage rail rather than replacing it: the
    //- player still needs to know how far through the stage they are while
    //- they fight one, and a mid-stage elite that hijacked the whole rail read
    //- as "the boss is here" the first time it was tried.
    Transition(name="elite")
      div.run-hud__elite(v-if="elite && !isBoss")
        div.run-hud__elite-chip(:style="{ width: elitePct + '%' }")
        div.run-hud__elite-fill(:style="{ width: elitePct + '%' }")
        div.run-hud__elite-ticks
        div.run-hud__rail-sheen
        GameIcon.run-hud__elite-skull(name="skull")
        span.run-hud__elite-text {{ t('hud.miniboss') }}
</template>

<style scoped lang="sass">
.run-hud
  display: flex
  flex-direction: column
  gap: clamp(0.2rem, 1.1vw, 0.4rem)
  width: 100%
  pointer-events: none

.run-hud__row
  display: flex
  align-items: flex-start
  justify-content: space-between
  gap: clamp(0.3rem, 2vw, 0.75rem)

.run-hud__stage
  display: flex
  flex-direction: column
  align-items: flex-start
  gap: 0.1rem

.run-hud__stage-label
  color: #fff
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.8rem, 4vw, 1.25rem)
  line-height: 1
  text-shadow: 2px 2px 0 #000, 0 0 12px rgba(120, 200, 255, 0.35)

// The ladder chip. Reads in a quarter of a second — a glyph and three words —
// and sits where the eye already goes for the stage number.
.run-hud__next
  display: inline-flex
  align-items: center
  gap: 0.25em
  margin-top: 0.1rem
  padding: clamp(0.1rem, 0.7vw, 0.2rem) clamp(0.3rem, 1.6vw, 0.5rem)
  border: 2px solid rgba(255, 217, 60, 0.35)
  border-radius: 999px
  background-color: rgba(10, 16, 30, 0.72)
  backdrop-filter: blur(3px)
  color: #ffd93c
  font-weight: 900
  font-size: clamp(0.52rem, 2.4vw, 0.72rem)
  line-height: 1
  text-shadow: 2px 2px 0 #000
  white-space: nowrap

.run-hud__next .run-hud__next-icon
  width: clamp(0.65rem, 3vw, 0.9rem)
  height: clamp(0.65rem, 3vw, 0.9rem)
  flex: 0 0 auto

.run-hud__next-text
  color: #fff

.run-hud__stats
  display: flex
  align-items: center
  gap: clamp(0.2rem, 1.4vw, 0.45rem)

.run-hud__chip
  display: inline-flex
  align-items: center
  gap: 0.2em
  padding: clamp(0.12rem, 0.9vw, 0.25rem) clamp(0.3rem, 1.8vw, 0.6rem)
  border: 2px solid rgba(0, 0, 0, 0.55)
  border-radius: 999px
  background-color: rgba(10, 16, 30, 0.72)
  backdrop-filter: blur(3px)

  // ── The one readout left, sized like it ──
  //
  // Two playtests in a row found that nobody read this as a count of people.
  // The first blamed the glyph; the second removed the three chips beside it
  // and it STILL went unnoticed, which says the problem was never that it was
  // crowded — it was that it looked like every other piece of dark chrome on
  // the screen. A HUD element that the whole game is about cannot be styled
  // like the mute button.
  //
  // So it is bigger than everything else in the row, it is VIOLET rather than
  // the pale blue every other plate uses, and it glows. Violet is not a colour
  // this HUD spends anywhere else, and — the reason it was picked over gold or
  // red — it does not collide with the two tints the icon itself has to be able
  // to show: green for a gain and red for a loss both read clearly on it.
  &.is-squad
    color: #e5d4ff
    padding: clamp(0.22rem, 1.5vw, 0.42rem) clamp(0.5rem, 3vw, 0.95rem)
    border-color: rgba(190, 140, 255, 0.75)
    background-color: rgba(64, 30, 112, 0.82)
    // Two shadows: a tight rim that lifts the plate off the road, and a wide
    // soft bloom that is what actually catches an eye aimed somewhere else.
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 18px rgba(157, 92, 255, 0.55)
    // The milestone word hangs off this box rather than sitting in the flex
    // row: a chip that grew a label would shove the stage column and the wallet
    // sideways for a second and a half, mid-fight, for a thing that is pure
    // decoration. Written when three more chips sat beside it, and still the
    // rule now that it stands alone — this row may not change size.
    position: relative

// Nested rather than written flat, and that is load-bearing: `GameIcon`'s own
// scoped rule is `.game-icon[data-v-…]` — one class plus one attribute, exactly
// the same specificity a flat `.run-hud__icon[data-v-…]` would have. On a tie the
// winner is whichever stylesheet the bundler happened to emit last. Nesting
// adds the ancestor class and settles it.
.run-hud__chip .run-hud__icon
  width: clamp(1.05rem, 4.8vw, 1.45rem)
  height: clamp(1.05rem, 4.8vw, 1.45rem)
  flex: 0 0 auto
  // The tint's way OUT — see the block below.
  transition: color 200ms ease-out, filter 200ms ease-out

// ─── Green up, red down ─────────────────────────────────────────────────────
//
// The squad glyph, tinted for a beat in the direction the crowd just moved
// (`squadMove` carries the rule and the coalescing). Why it is two properties on
// the icon rather than a keyframe on the chip:
//
//   • neither `color` nor `filter` can affect layout, so the tint cannot nudge
//     the stage column or the wallet beside it — the row is the same shape in
//     every frame of it;
//   • the chip's own punch (below) owns `scale` and `box-shadow`, and two
//     animations on one box is how a chip ends up parked mid-scale the first
//     time one of them is interrupted;
//   • there is no animation to RESTART, which is the trap the punch needs a
//     re-keyed node to get out of. A held class cannot fall out of step with
//     the state that set it.
//
// It arrives hard and leaves soft: `transition: none` on the two tinted states
// makes adding the class a cut, and removing it falls back to the rule above,
// which fades. A tint that faded IN read as the number drifting rather than as
// something happening to it.
//
// The two colours are also far apart in LIGHTNESS, not just in hue: green and
// red are the one pair of signal colours a red-green colour-blind player cannot
// separate, and roughly half this game's audience is eight years old with
// nobody to ask. Desaturate these two to grey and the gain is still the pale one.
.run-hud__chip .run-hud__icon.is-gain,
.run-hud__chip .run-hud__icon.is-loss
  transition: none

.run-hud__chip .run-hud__icon.is-gain
  color: #6bf58f
  filter: drop-shadow(0 0 0.3rem rgba(107, 245, 143, 0.7))

.run-hud__chip .run-hud__icon.is-loss
  color: #ff4747
  filter: drop-shadow(0 0 0.3rem rgba(255, 71, 71, 0.75))

.run-hud__value
  color: #fff
  font-weight: 900
  font-size: clamp(1rem, 4.8vw, 1.5rem)
  line-height: 1
  text-shadow: 2px 2px 0 #000

// ─── The round-number punch ─────────────────────────────────────────────────
//
// Pure CSS, restarted by re-keying the element (see `announceMilestone`) — the
// alternative, a JS loop writing a scale every frame, would put a layout write
// on the main thread during the exact frame a `×3` door is spawning four
// hundred particles.
//
// It overshoots and comes back rather than easing in: a chip that swells
// smoothly reads as a transition, and a chip that is HIT reads as an event. The
// gold rim is the same `#ffd93c` the ladder chip and the best-stage line use, so
// the colour already means "something good" everywhere else in this HUD.

@keyframes squad-punch
  0%
    scale: 1
    box-shadow: none
  22%
    scale: 1.32
    box-shadow: 0 0 0 3px rgba(255, 217, 60, 0.85), 0 0 0.9rem rgba(255, 217, 60, 0.55)
  46%
    scale: 0.94
  70%
    scale: 1.09
  100%
    scale: 1
    box-shadow: none

// The same event, said without motion. A reduced-motion preference is about
// movement, not about feedback — dropping the cue entirely would leave those
// players with a silent number again, so the rim still lights and nothing moves.
@keyframes squad-punch-still
  0%
    box-shadow: none
  25%
    box-shadow: 0 0 0 3px rgba(255, 217, 60, 0.85), 0 0 0.9rem rgba(255, 217, 60, 0.55)
  100%
    box-shadow: none

.run-hud__chip.is-squad.is-punched
  animation: squad-punch 520ms cubic-bezier(0.22, 0.61, 0.36, 1)

@media (prefers-reduced-motion: reduce)
  .run-hud__chip.is-squad.is-punched
    animation: squad-punch-still 620ms ease-out

// The word. Two syllables of gold under the chip for a beat and then gone —
// small on purpose: the number itself is the headline, and this only has to
// name what just happened so the player has something to say about it later.
.run-hud__milestone
  position: absolute
  top: 100%
  left: 50%
  translate: -50% 0
  margin-top: 0.2rem
  padding: 0.1rem 0.35rem
  border-radius: 999px
  background-color: rgba(10, 16, 30, 0.8)
  color: #ffd93c
  font-weight: 900
  text-transform: uppercase
  font-size: clamp(0.5rem, 2.3vw, 0.7rem)
  line-height: 1
  text-shadow: 2px 2px 0 #000
  white-space: nowrap
  pointer-events: none
  animation: milestone-word 260ms ease-out

@keyframes milestone-word
  0%
    opacity: 0
    translate: -50% -0.3rem
  100%
    opacity: 1
    translate: -50% 0

@media (prefers-reduced-motion: reduce)
  .run-hud__milestone
    animation: none

// ─── Progress rail ──────────────────────────────────────────────────────────
//
// Deliberately thin. It answers "am I nearly there?" without ever competing
// with the lane for attention — and it is the only place the boss is announced
// before it walks on, which is what stops the fight feeling like an ambush.

.run-hud__rail
  position: relative
  height: clamp(0.5rem, 2.2vw, 0.7rem)
  border: 2px solid rgba(0, 0, 0, 0.6)
  border-radius: 999px
  background-color: rgba(10, 16, 30, 0.7)
  overflow: hidden

  // A BOSS BAR, not a thicker progress rail. Taller, squarer, and ringed in a
  // warm rim so it stops reading as HUD furniture the moment the fight starts —
  // the thin blue rail it replaces was accurate and completely unalarming.
  &.is-boss
    height: clamp(1.05rem, 4.6vw, 1.5rem)
    border-radius: 0.28rem
    border-color: rgba(0, 0, 0, 0.75)
    background-color: rgba(30, 6, 8, 0.85)
    box-shadow: inset 0 0 0 1px rgba(255, 120, 90, 0.35), 0 0 0.7rem rgba(190, 20, 20, 0.3)

.run-hud__rail-fill
  position: absolute
  inset: 0 auto 0 0
  border-radius: 999px
  background-image: linear-gradient(to right, #4fd0ff, #a0f0ff)
  transition: width 120ms linear

  // RED, top-lit. The old red-to-orange ramp ran left to right, which reads as
  // a fuel gauge; health reads as a lit tube, so the ramp runs top to bottom
  // with the hot band across the middle.
  .is-boss &
    border-radius: 0.18rem
    background-image: linear-gradient(to bottom, #ff8a72 0%, #ec1f22 42%, #a20d14 100%)
    box-shadow: inset 0 -0.12rem 0 rgba(0, 0, 0, 0.35)
    transition: width 90ms linear

// The chip: the same number, arriving late.
.run-hud__rail-chip
  position: absolute
  inset: 0 auto 0 0
  border-radius: 0.18rem
  background-image: linear-gradient(to bottom, #fff0e2, #ffb9a4)
  opacity: 0.9
  transition: width 620ms cubic-bezier(0.22, 0.61, 0.36, 1) 130ms

.run-hud__rail-ticks
  position: absolute
  inset: 0
  pointer-events: none
  // Quarters, so "half gone" is a thing the eye can check rather than estimate.
  background-image: repeating-linear-gradient(to right, rgba(0, 0, 0, 0) 0 calc(25% - 2px), rgba(0, 0, 0, 0.55) calc(25% - 2px) 25%)

.run-hud__rail-sheen
  position: absolute
  inset: 0
  pointer-events: none
  border-radius: inherit
  background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.06) 45%, rgba(0, 0, 0, 0.22) 100%)

.run-hud__rail .run-hud__rail-skull
  position: absolute
  left: 0.2rem
  top: 50%
  translate: 0 -50%
  width: clamp(0.7rem, 3vw, 1rem)
  height: clamp(0.7rem, 3vw, 1rem)
  color: #ffd9c8
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.8))

// Nested for the same specificity reason as `.run-hud__icon` above.
.run-hud__rail .run-hud__rail-icon
  position: absolute
  right: 0.1rem
  top: 50%
  translate: 0 -50%
  width: clamp(0.6rem, 2.6vw, 0.85rem)
  height: clamp(0.6rem, 2.6vw, 0.85rem)
  color: rgba(255, 255, 255, 0.75)

// The marks on the rail. Small, dim, and centred on the beat's position; a
// mark the crowd has passed goes dimmer still. Nested for specificity — see
// `.run-hud__icon` above.
.run-hud__rail .run-hud__mark
  position: absolute
  top: 50%
  translate: -50% -50%
  width: clamp(0.62rem, 2.7vw, 0.88rem)
  height: clamp(0.62rem, 2.7vw, 0.88rem)
  z-index: 1
  color: rgba(255, 255, 255, 0.85)
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.85))
  transition: opacity 240ms ease

  &.is-weapon
    color: #ffd93c
  &.is-elite
    color: #ffb4a0
  &.is-passed
    opacity: 0.3

.run-hud__rail-text
  position: absolute
  inset: 0
  z-index: 2
  display: flex
  align-items: center
  justify-content: center
  color: #fff
  font-weight: 900
  text-transform: uppercase
  letter-spacing: 0.1em
  font-size: clamp(0.45rem, 2vw, 0.65rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8)

// ─── Miniboss bar ───────────────────────────────────────────────────────────

.run-hud__elite
  position: relative
  height: clamp(0.85rem, 3.8vw, 1.15rem)
  border: 2px solid rgba(0, 0, 0, 0.72)
  border-radius: 0.24rem
  background-color: rgba(26, 8, 10, 0.85)
  box-shadow: inset 0 0 0 1px rgba(255, 140, 110, 0.28), 0 0 0.5rem rgba(170, 25, 25, 0.26)
  overflow: hidden

.run-hud__elite-fill
  position: absolute
  inset: 0 auto 0 0
  border-radius: 0.14rem
  // The same red as the boss, one step cooler and darker: an elite has to read
  // as the same KIND of thing without competing with the fight at the end.
  background-image: linear-gradient(to bottom, #ff7d63 0%, #d81f22 44%, #8e0d12 100%)
  box-shadow: inset 0 -0.1rem 0 rgba(0, 0, 0, 0.32)
  transition: width 90ms linear

.run-hud__elite-chip
  position: absolute
  inset: 0 auto 0 0
  border-radius: 0.14rem
  background-image: linear-gradient(to bottom, #ffeadf, #ffb49c)
  opacity: 0.88
  transition: width 560ms cubic-bezier(0.22, 0.61, 0.36, 1) 120ms

.run-hud__elite-ticks
  position: absolute
  inset: 0
  pointer-events: none
  background-image: repeating-linear-gradient(to right, rgba(0, 0, 0, 0) 0 calc(33.333% - 2px), rgba(0, 0, 0, 0.5) calc(33.333% - 2px) 33.333%)

.run-hud__elite .run-hud__elite-skull
  position: absolute
  left: 0.18rem
  top: 50%
  translate: 0 -50%
  width: clamp(0.6rem, 2.6vw, 0.82rem)
  height: clamp(0.6rem, 2.6vw, 0.82rem)
  color: #ffd2c2
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.8))

.run-hud__elite-text
  position: absolute
  inset: 0
  z-index: 2
  display: flex
  align-items: center
  justify-content: center
  color: #fff
  font-weight: 900
  text-transform: uppercase
  letter-spacing: 0.08em
  font-size: clamp(0.42rem, 1.9vw, 0.6rem)
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)

.elite-enter-active, .elite-leave-active
  transition: opacity 200ms ease, transform 200ms ease
.elite-enter-from, .elite-leave-to
  opacity: 0
  transform: scaleY(0.4)
</style>
