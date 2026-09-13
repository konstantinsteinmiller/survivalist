<template lang="pug">
  div.skills(:style="barStyle")
    template(v-for="s in visible" :key="s.key")
      //- A slot the player does not own yet: a mystery, not a dead button. It
      //- answers a press with a shake and a hint and nothing else — see
      //- `SkillMystery.vue` for why it may share nothing with the button below.
      button.skills__btn.skills__btn--locked(
        v-if="s.state === 'locked'"
        type="button"
        aria-disabled="true"
        :class="{ 'skills__btn--nudge': nudged === s.key }"
        :aria-label="s.label"
        :title="s.label"
        @pointerdown.stop.prevent="onLocked(s.key)"
      )
        SkillMystery(:icon="s.icon" :shine-s="s.shineS")
        span.skills__hint(v-if="nudged === s.key" aria-hidden="true") {{ s.label }}
      //- Owned — or on TRIAL: the one free Frost Nova after the stage-4 boss is
      //- a real button for exactly one press, badged so it reads as a gift and
      //- not as a skill the player now owns (`skillTrial`).
      button.skills__btn(
        v-else
        type="button"
        :class="{ 'skills__btn--ready': s.ready, 'skills__btn--live': s.live, 'skills__btn--reveal': s.reveal, 'skills__btn--trial': s.state === 'trial', 'skills__btn--taught': s.taught, [`skills__btn--${s.id}`]: true }"
        :disabled="!s.ready"
        :aria-label="s.label"
        :title="s.label"
        @pointerdown.stop.prevent="onUse(s.id)"
      )
        //- ── The lesson's two arrows ──────────────────────────────────────
        //-
        //- Above and below, pointing at the button, on the one slot the game
        //- has stopped the world to ask for. Gold because gold is this HUD's
        //- "here is something for you" colour (the ladder promise, the
        //- milestone plate) and because nothing else in the skill row is gold,
        //- so the eye has nowhere else to land.
        //-
        //- Inside the button rather than beside it: the row is a flex line and
        //- an arrow that took part in it would shove the other three sideways
        //- at the exact moment the player is being asked to aim at one.
        template(v-if="s.taught")
          span.skills__arrow.skills__arrow--up(aria-hidden="true")
          span.skills__arrow.skills__arrow--down(aria-hidden="true")
        //- The cooldown ring. An SVG arc rather than a CSS conic gradient: the
        //- ring has to read at 44px on a phone, and a stroked circle keeps its
        //- weight at any size where a gradient wedge turns to mush.
        svg.skills__ring(viewBox="0 0 44 44" aria-hidden="true")
          circle.skills__ring-track(cx="22" cy="22" r="19")
          circle.skills__ring-fill(
            cx="22" cy="22" r="19"
            :stroke-dasharray="RING"
            :stroke-dashoffset="RING * (1 - s.charge)"
          )

        //- The glyph, or its painting once the art pipeline has one — see `ArtIcon`.
        ArtIcon.skills__icon(kind="ui" :id="s.art" :fallback="s.icon")

        //- Seconds remaining, so the wait is a number and not a guess.
        span.skills__count(v-if="!s.ready") {{ Math.ceil(s.leftMs / 1000) }}
        //- The free use, counted.
        span.skills__badge(v-if="s.state === 'trial'" aria-hidden="true") {{ t('skills.uses', { n: 1 }) }}
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ArtIcon from '@/components/icons/ArtIcon.vue'
import SkillMystery from '@/components/game/SkillMystery.vue'
import useSounds from '@/use/useSound'
import {
  SKILL_SLOTS, claimReveal, revealKey, skillCharge, skillReady, skillReadyIn, slotState,
  type SkillId
} from '@/use/useSkills'
import { SKILL_ROW_HUD_GAP_PX } from '@/components/game/skillBarPlacement'

/**
 * ─── The skill bar ──────────────────────────────────────────────────────────
 *
 * Up to four slots — the skills the player owns, and the ones still to come
 * as greyed mysteries (see `visible` below) — and the whole design problem is
 * WHERE.
 *
 * ─── Why not the right edge ─────────────────────────────────────────────────
 *
 * It used to live out there, stacked vertically just outside the right rail,
 * on a thumb argument: inside the arc of a right hand, clear of the corners
 * that mute/board/settings and the shop already own.
 *
 * That argument ignores what a MOUSE has to do to reach it. On a desktop the
 * crowd follows the cursor while it is over the road, so a player reaching for
 * a skill drags their whole squad across the lane and parks it against the
 * right rail on the way — every single time. The button was reachable and the
 * cost of reaching it was the run. Steering already stops at the rails (see
 * `onPointerMove` in the scene), so the crowd is not dragged out of the road —
 * it is dragged to the WRONG SIDE of it, which is worse than either.
 *
 * ─── So it sits under the squad ─────────────────────────────────────────────
 *
 * Centred on the road, low, aimed at the band between the deepest a survivor is
 * ever drawn and the top of the bottom HUD strip (`hudBottomPx`). The camera
 * already keeps the crowd out of that strip — `setViewport` is given the HUD's
 * measured height precisely so the squad is never framed underneath it — which
 * makes this the one piece of screen the crowd cannot reach. The band is the
 * ARGUMENT, not a test the row runs any more; see the section after next.
 *
 * Two things fall out of it, and both are the point:
 *
 *   • the cursor travels DOWN the same column it was already in, so the crowd
 *     does not move at all on the way to the button;
 *   • the button is a long way from where the cursor sits while steering, so a
 *     left click meant for the road does not land on a skill. The row is pushed
 *     as low as the strip allows rather than centred in it, because every pixel
 *     of that gap is bought from the same budget.
 *
 * ─── On every viewport, including the ones with no band ─────────────────────
 *
 * This used to be CONDITIONAL: the row took the band when the band cleared a
 * full-size crowd (`skillRowFitsUnderSquad`) and fell back to the right-edge
 * column when it did not. The measurements said a desktop had 18 px of
 * clearance and therefore took the band — and on a real desktop window, which
 * is shorter than the one that was measured, it did not: the bar was out at the
 * right rail for the whole of a playtest, dragging every crowd that reached for
 * it into the wall, which is the exact failure the move was made to fix. A rule
 * that is right in the measurement and wrong on the machine is worse than no
 * rule, because nobody looks at it again.
 *
 * So there is now ONE placement and no branch: under the squad, centred on the
 * road, everywhere. The price was going to be paid on a landscape phone, where
 * the band is about 3 px tall and the row would overlap the back ranks of a big
 * crowd — a readability cost on the ONE viewport where the crowd is drawn
 * smallest, against a steering cost on every desktop, and the owner called it.
 *
 * That bill never arrives, as it turns out: a phone in landscape is now covered
 * by the rotate-your-phone lock (`PortraitLock.vue`), so the viewport this was
 * the worst case for is not a viewport the game renders in any more. The two
 * changes landed in the same pass and the note is left standing because the
 * reasoning still decides the question for any short viewport the lock does not
 * catch — a small window on a desktop, say.
 *
 * ─── …and it is sized to the road, not to the screen ────────────────────────
 *
 * A row of four is wider than the lane on any window short enough to zoom the
 * camera out (the scale fits the lane's width OR the usable height, whichever
 * is smaller — see `setViewport`), and a control that overhangs the road it is
 * centred on stops reading as part of the road. So the buttons are capped by
 * the lane's own width: `--skill-fit` is the widest a button may be if four of
 * them and their gaps are to fit between the rails, and the CSS takes the
 * smaller of that and the size it would otherwise have been.
 *
 * The floor under it is a FINGER, not a design preference. A touch viewport
 * never shrinks below ~42 px of button, even where that overhangs the lane —
 * a control too small to hit is not a smaller control, it is a broken one. A
 * mouse is allowed to go smaller, and does.
 *
 * `pointerdown` rather than `click`, and stopped: the canvas underneath treats
 * a pointer as steering, and a skill press must not also throw the crowd
 * sideways. `.prevent` keeps a phone from firing the synthetic click afterwards.
 */
const { t } = useI18n()

const emit = defineEmits<{ (e: 'use', id: SkillId): void }>()

/** Circumference of r=19, for the cooldown arc. */
const RING = 2 * Math.PI * 19

interface Props {
  /**
   * The skill the game is currently TEACHING, or null.
   *
   * One slot at a time, and only ever during the lesson on the first miniboss
   * (`game/grenadeTutorial.ts`). While it is set, that button is forced ready,
   * its meter is cleared, and it wears the arrows — because the world has
   * stopped and it is the only thing that can start it again.
   */
  taught?: SkillId | null
  /** True while the shield is actually up — the button glows rather than waits. */
  shieldLive: boolean
  /** …and the same for the world being frozen, and for a flare being up. */
  frostLive?: boolean
  decoyLive?: boolean
  /**
   * Half the road's width in CSS pixels, measured by the scene through the
   * renderer's own projection.
   *
   * It is what the buttons are SIZED against (see `barStyle`): the row is
   * centred on the road, and a row wider than the road it is centred on reads
   * as UI that has escaped the game. It is not what the row is positioned
   * against — the road is the middle of the viewport at every aspect ratio, so
   * centring needs no measurement at all and is right on the first frame.
   */
  laneHalfPx: number
  /**
   * The lowest pixel a survivor can ever be drawn at — the scene measures it off
   * the camera, for a FULL-SIZE crowd.
   *
   * Accepted and no longer read. It was the input to the clearance test that
   * chose between two layouts; there is one layout now. The prop stays because
   * `GameScene.vue` measures this for the camera anyway and binds it here, and
   * because the day someone wants to fade the row when the crowd reaches it,
   * this is the number they will want. Do not drop it without editing the scene
   * in the same commit.
   */
  squadFloorPx: number
  /** Height of the bottom HUD strip in CSS pixels, safe-area included: what
   *  the row sits on top of. */
  hudBottomPx: number
}
const props = defineProps<Props>()

/**
 * The stylesheet's own ceiling for the gap between two buttons, in pixels.
 *
 * The gap is a `clamp`, so on a narrow screen it is smaller than this and the
 * arithmetic below over-subtracts — which is the safe direction to be wrong in:
 * a row that came out a hair narrower than the lane still sits on the road, and
 * one that came out a hair wider does not. Change it with the `--skill-gap`
 * declaration in the stylesheet or the two stop agreeing.
 */
const ROW_GAP_MAX_PX = 9

/**
 * The two things this component cannot know without the scene: where the bottom
 * strip ends, and how wide the road is.
 *
 * Both are handed over as measurements and both have an honest "not yet" value
 * of 0, so both are guarded — a row placed against an unmeasured strip lands on
 * top of the mute and settings buttons, and a row sized against an unmeasured
 * lane is four buttons a pixel wide. In both cases the stylesheet's own value is
 * the right thing to leave alone for the tick it takes the scene to measure.
 */
const barStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.hudBottomPx > 0) {
    style.bottom = `${Math.round(props.hudBottomPx + SKILL_ROW_HUD_GAP_PX)}px`
  }
  if (props.laneHalfPx > 0) {
    // Sized off the SLOT COUNT rather than the visible count: the row holds four
    // slots from the first frame of a save's life (locked ones are mysteries,
    // not gaps), and sizing off what is currently a button would resize the
    // three beside it on the frame a skill is bought — mid-run, under the
    // player's thumb.
    const room = props.laneHalfPx * 2 - (SKILL_SLOTS.length - 1) * ROW_GAP_MAX_PX
    style['--skill-fit'] = `${Math.max(1, Math.round(room / SKILL_SLOTS.length))}px`
  }
  return style
})

/**
 * ─── Every slot, owned or still to come ─────────────────────────────────────
 *
 * This used to show only what the player owned, on the argument that a
 * permanently dead control teaches the player to ignore that corner of the
 * screen. The slots still to come are shown now as well, and the argument is
 * answered rather than overruled: a locked slot is not a dead control, because
 * it does not LOOK like a control (`SkillMystery.vue`) and it is not permanent —
 * it is a promise with a question mark on it, and the day it fills is the
 * payoff (`claimReveal`). See `SKILL_SLOTS` for the four of them.
 *
 * ── …and all of them, now ──
 *
 * The trimming that used to live here — show only the NEXT locked slot — was
 * the fallback column's problem: stacked up the right edge, four buttons tall,
 * it reached the corner the incoming-attack badge lives in. There is no column
 * any more (see the placement note at the top), and a row is wide rather than
 * tall, so every slot is shown on every viewport and the width is paid for by
 * shrinking the buttons instead.
 */
/** Reveal keys (`revealKey`) whose reveal is playing right now. Declared ahead
 *  of `visible`, which reads it. */
const revealing = ref<string[]>([])

const visible = computed(() => SKILL_SLOTS.map((slot, i) => {
  const taught = props.taught ?? null
  const state = slotState(slot)
  const usable = state !== 'locked'
  const id = slot.id
  const name = slot.labelKey ? t(slot.labelKey) : ''
  const label = state === 'owned'
    ? name
    : state === 'trial'
      ? t('skills.trialLabel', { name })
      : slot.unlockStage !== null
        ? t('skills.unlocksAt', { n: slot.unlockStage })
        : t('skills.locked')
  const live = (id === 'shield' && props.shieldLive) ||
    (id === 'frost' && !!props.frostLive) ||
    (id === 'decoy' && !!props.decoyLive)
  return {
    key: id ?? `slot-${i}`,
    id,
    state,
    icon: slot.icon,
    art: slot.art ?? '',
    label,
    // Staggered so a row of them never shimmers in lockstep.
    shineS: 3.2 + i * 0.55,
    // The lesson forces the grenade ready and clears its meter: the one button
    // the player is being told to press may never be showing a countdown while
    // it is being pointed at. See `teachGrenade` in the simulation.
    ready: taught === 'grenade' && id === 'grenade'
      ? true
      : usable && id !== null ? skillReady(id) : false,
    charge: taught === 'grenade' && id === 'grenade'
      ? 1
      : usable && id !== null ? skillCharge(id) : 0,
    leftMs: taught === 'grenade' && id === 'grenade'
      ? 0
      : usable && id !== null ? skillReadyIn(id) : 0,
    taught: taught === id,
    live,
    reveal: id !== null && usable && revealing.value.includes(revealKey(id, state))
  }
}))

const onUse = (id: SkillId | null): void => {
  if (id === null) return
  // A taught button is pressable whatever its cooldown says — the scene makes
  // the same exception, and the two have to agree or the press is swallowed
  // here and the world never resumes.
  if (props.taught !== id && !skillReady(id)) return
  emit('use', id)
}

// ─── A press on a locked slot ───────────────────────────────────────────────
//
// A shake and the hint, and a soft "no" — the same one the shop plays for a
// purchase the player cannot afford, because it is the same answer: not yet.
// Nothing else, and in particular never the steering the canvas would have
// done with the pointer (`.stop.prevent` in the template).
const { playSound } = useSounds()
const nudged = ref<string | null>(null)
let nudgeTimer: ReturnType<typeof setTimeout> | null = null
const onLocked = (key: string): void => {
  playSound('obstacle-hit', 0.03)
  nudged.value = null
  // Cleared and re-set on the next tick so a second press restarts the shake
  // rather than being swallowed by a class that is already on the element.
  void nextTick(() => { nudged.value = key })
  if (nudgeTimer) clearTimeout(nudgeTimer)
  nudgeTimer = setTimeout(() => { nudged.value = null }, 1800)
}

// ─── The reveal ─────────────────────────────────────────────────────────────
//
// Asked on mount and whenever the owned set changes, because the shield is
// gifted while this bar is unmounted (the result banner is up) and bought in a
// shop that is not this component. `claimReveal` answers "is this the first
// time" from the save, so the reveal plays exactly once per skill, ever.
const askReveals = (): void => {
  let any = false
  for (const slot of SKILL_SLOTS) {
    const state = slotState(slot)
    if (slot.id === null || state === 'locked') continue
    if (!claimReveal(slot.id, state)) continue
    const key = revealKey(slot.id, state)
    revealing.value = [...revealing.value, key]
    setTimeout(() => { revealing.value = revealing.value.filter((r) => r !== key) }, 1400)
    any = true
  }
  // The question mark coming off is a gift being handed over, and it sounds
  // like one — the sample the chest, the weapon reveal and the rally already
  // use for "something good was just given to you".
  if (any) playSound('reward-continue', 0.08)
}
onMounted(askReveals)
watch(() => SKILL_SLOTS.map((slot) => slotState(slot)).join(','), askReveals)
onUnmounted(() => { if (nudgeTimer) clearTimeout(nudgeTimer) })
</script>

<style scoped lang="sass">
.skills
  position: absolute
  // ─── The row's own geometry, in one place ─────────────────────────────────
  //
  // `--skill-fit` is the widest a button may be if the whole row is to fit
  // between the rails; the inline style writes it from the measured lane (see
  // `barStyle`), and this is what it is worth before the scene has one — no cap
  // at all, which is what a bar with no idea how wide the road is should assume.
  //
  // `--skill-floor` is the other end of the same argument, and it is the one
  // that must not be tuned away: a button smaller than this is not a smaller
  // button, it is one a finger cannot hit. See the coarse-pointer block below.
  --skill-gap: clamp(0.3rem, 1.7vw, 0.55rem)
  --skill-fit: 3.25rem
  --skill-floor: 2.1rem
  --skill-btn: clamp(var(--skill-floor), min(12vw, var(--skill-fit)), 3.25rem)
  // Centred on the road. The road is the middle of the viewport at every aspect
  // ratio, so this costs no measurement and is right on the very first frame —
  // which is the whole reason the horizontal half of the placement is here and
  // the vertical half is in `barStyle`.
  left: 50%
  transform: translateX(-50%)
  // Parked on the bottom bar, which owns the corners. Replaced by the strip's
  // MEASURED height the moment the scene has one; until then this errs high,
  // because the failure mode on the other side is a row of buttons sitting on
  // top of mute and settings.
  bottom: calc(clamp(4.6rem, 17vw, 6.2rem) + env(safe-area-inset-bottom, 0px))
  display: flex
  flex-direction: row
  align-items: center
  gap: var(--skill-gap)
  // The HUD layer is pointer-events: none; the buttons opt back in. Note that
  // the CONTAINER stays transparent to the canvas, so the gaps between the
  // buttons are still road the player can steer through.
  pointer-events: none
  z-index: 30

// A finger, not a preference. 2.6rem is ~42 px, which is the floor even where
// the lane is narrower than the row — a landscape phone zooms the camera out far
// enough that four buttons cannot fit between its rails at ANY usable size, and
// the right answer there is a row that overhangs the road, not four targets that
// miss. A mouse has no such floor and is allowed to go down to 2.1rem.
@media (pointer: coarse)
  .skills
    --skill-floor: 2.6rem

.skills__btn
  position: relative
  pointer-events: auto
  width: var(--skill-btn)
  height: var(--skill-btn)
  padding: 0
  border: none
  border-radius: 50%
  background-color: rgba(8, 14, 28, 0.82)
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5)
  color: rgba(255, 255, 255, 0.42)
  display: flex
  align-items: center
  justify-content: center
  // A skill on cooldown is dimmed, not hidden: the player has to be able to see
  // that they own it and that it is coming back.
  transition: color 0.2s ease, background-color 0.2s ease
  -webkit-tap-highlight-color: transparent

.skills__btn--ready
  color: #ffd93c
  background-color: rgba(24, 34, 58, 0.92)
  animation: skill-ready 2.2s ease-in-out infinite

.skills__btn--live
  color: #7fe3ff

// The two late skills glow in their own colours while they run: frost the ice
// of the nova, the flare its signal red.
.skills__btn--frost.skills__btn--live
  color: #bff0ff
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0.9rem rgba(140, 215, 255, 0.55)

.skills__btn--decoy.skills__btn--live
  color: #ff7d8c
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0.9rem rgba(255, 80, 100, 0.5)

// ─── The free try ───────────────────────────────────────────────────────────
//
// A real, ready button — but one that is visibly a GIFT: an icy halo breathing
// round it and a gold "×1" pinned to its shoulder, so nobody mistakes the one
// free Frost Nova for a skill they now own.
.skills__btn--trial.skills__btn--ready
  animation: skill-trial 1.5s ease-in-out infinite

@keyframes skill-trial
  0%, 100%
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0 rgba(150, 220, 255, 0), 0 0 0.5rem rgba(150, 220, 255, 0.35)
  50%
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.32rem rgba(150, 220, 255, 0.22), 0 0 1.1rem rgba(150, 220, 255, 0.6)

.skills__badge
  position: absolute
  top: -0.3rem
  right: -0.4rem
  padding: 0.05rem 0.34rem
  border-radius: 999px
  border: 1.5px solid #3a2000
  background: linear-gradient(180deg, #ffe89a 0%, #ffc43a 55%, #e38f12 100%)
  color: #2a1600
  font-weight: 900
  font-size: clamp(0.58rem, 2.5vw, 0.74rem)
  line-height: 1.2
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.6)
  pointer-events: none

.skills__icon
  width: 52%
  height: 52%

// A painting carries its own colours and outline, so it sits larger than the
// flat glyph — and the cooldown dim the glyph gets through `color` is done
// with a filter here, so a spent skill still reads as spent.
img.skills__icon
  width: 66%
  height: 66%
  filter: saturate(0.35) brightness(0.55)
  transition: filter 0.2s ease

.skills__btn--ready img.skills__icon,
.skills__btn--live img.skills__icon
  filter: none

.skills__ring
  position: absolute
  inset: 0
  width: 100%
  height: 100%
  transform: rotate(-90deg)

.skills__ring-track
  fill: none
  stroke: rgba(255, 255, 255, 0.12)
  stroke-width: 3

.skills__ring-fill
  fill: none
  stroke: currentColor
  stroke-width: 3
  stroke-linecap: round
  opacity: 0.9
  transition: stroke-dashoffset 0.2s linear

.skills__count
  position: absolute
  font-weight: 900
  font-size: clamp(0.7rem, 3.2vw, 0.95rem)
  color: #fff
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.85)

// ─── Locked slots ───────────────────────────────────────────────────────────
//
// Smaller than an owned button, so the row reads as "yours" and "not yet" at a
// glance, and transparent — the mystery disc is its own background. A fraction
// of the owned size rather than its own clamp, so the two shrink together when
// the lane makes them: the ratio is the thing that carries the meaning, and a
// locked slot that stayed put while its neighbours shrank would eventually be
// the biggest button in the row.
.skills__btn--locked
  width: calc(var(--skill-btn) * 0.82)
  height: calc(var(--skill-btn) * 0.82)
  background-color: transparent
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.45)
  cursor: help

.skills__btn--nudge
  animation: skill-nudge 0.42s ease-in-out

.skills__hint
  position: absolute
  bottom: calc(100% + 0.4rem)
  left: 50%
  transform: translateX(-50%)
  padding: 0.25rem 0.55rem
  border-radius: 0.5rem
  background: rgba(10, 12, 18, 0.9)
  color: #d6dae1
  font-size: clamp(0.62rem, 2.8vw, 0.78rem)
  font-weight: 900
  letter-spacing: 0.03em
  white-space: nowrap
  pointer-events: none
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5)
  animation: skill-hint 1.8s ease-out forwards

// ─── The reveal ─────────────────────────────────────────────────────────────
//
// Declared after the ready-breathing so it wins while it runs; the class comes
// off after 1.4 s and the breathing takes over.
.skills__btn--reveal,
.skills__btn--reveal.skills__btn--ready
  animation: skill-reveal 1.25s cubic-bezier(0.2, 1.4, 0.4, 1) both

@keyframes skill-reveal
  0%
    transform: scale(0.55) rotate(-12deg)
    filter: grayscale(1) brightness(0.6)
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0 rgba(255, 217, 60, 0.75)
  40%
    transform: scale(1.2) rotate(4deg)
    filter: grayscale(0) brightness(1.35)
  70%
    transform: scale(0.95) rotate(0)
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 1.3rem rgba(255, 217, 60, 0)
  100%
    transform: scale(1)
    filter: none
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0 rgba(255, 217, 60, 0)

@keyframes skill-nudge
  0%, 100%
    transform: translateX(0)
  20%
    transform: translateX(-3px) rotate(-4deg)
  45%
    transform: translateX(3px) rotate(4deg)
  70%
    transform: translateX(-2px)

@keyframes skill-hint
  0%
    opacity: 0
    margin-bottom: -0.3rem
  12%, 78%
    opacity: 1
    margin-bottom: 0
  100%
    opacity: 0

@media (prefers-reduced-motion: reduce)
  .skills__btn--nudge,
  .skills__btn--reveal,
  .skills__btn--trial.skills__btn--ready
    animation: none

// A ready skill breathes, so it is findable without looking for it.
@keyframes skill-ready
  0%, 100%
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0 rgba(255, 217, 60, 0)
  50%
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.28rem rgba(255, 217, 60, 0.16)

// ─── The taught button ──────────────────────────────────────────────────────
//
// The world has stopped and this is the only thing that starts it again, so it
// is lifted out of the lightbox rather than merely highlighted inside it: the
// dimmer is a sibling of the row (`GameScene.vue`), and raising this above it
// is what makes "everything except this" true.
.skills__btn--taught
  z-index: 3
  border-color: #ffd93c
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.3rem rgba(255, 217, 60, 0.28), 0 0 1.6rem rgba(255, 200, 40, 0.55)
  animation: skill-taught 900ms ease-in-out infinite

@keyframes skill-taught
  0%, 100%
    transform: scale(1)
  50%
    transform: scale(1.07)

// Two arrows, one above and one below, pointing IN at the button. Absolutely
// positioned off the button's own box so the row's flex line never moves.
.skills__arrow
  position: absolute
  left: 50%
  width: 0
  height: 0
  border-left: 0.62rem solid transparent
  border-right: 0.62rem solid transparent
  pointer-events: none
  filter: drop-shadow(0 0 0.35rem rgba(255, 200, 40, 0.8))

.skills__arrow--up
  bottom: calc(100% + 0.3rem)
  border-top: 0.78rem solid #ffd93c
  transform: translateX(-50%)
  animation: skill-arrow-down 900ms ease-in-out infinite

.skills__arrow--down
  top: calc(100% + 0.3rem)
  border-bottom: 0.78rem solid #ffd93c
  transform: translateX(-50%)
  animation: skill-arrow-up 900ms ease-in-out infinite

// They travel TOWARD the button, not away from it — an arrow that drifts off
// reads as a thing leaving rather than a thing to press.
@keyframes skill-arrow-down
  0%, 100%
    transform: translateX(-50%) translateY(-0.22rem)
  50%
    transform: translateX(-50%) translateY(0.1rem)

@keyframes skill-arrow-up
  0%, 100%
    transform: translateX(-50%) translateY(0.22rem)
  50%
    transform: translateX(-50%) translateY(-0.1rem)

@media (prefers-reduced-motion: reduce)
  .skills__btn--taught,
  .skills__arrow--up,
  .skills__arrow--down
    animation: none
</style>
