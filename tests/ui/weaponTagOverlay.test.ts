import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

/**
 * ─── The badge is about the ROAD, not about your hands ──────────────────────
 *
 * This file used to pin a badge that named the weapon you were carrying and
 * printed its multiplier — "Gatling Gun ×4.4" — plus a second slot for a gun
 * firing alongside it. All of that is gone, and the reason is worth keeping:
 *
 *   "The real player does not need a chip stating they have a gatling gun or a
 *    rocket launcher, he sees the different attack projectiles."
 *
 * Which is now true in a way it was not when the badge was written: a gatling
 * round is RED (see `tracerStyle`), and a launcher throws a rocket with a wake.
 * A player looking at the road can tell; a player not looking at the road was
 * never reading a badge either.
 *
 * What survives is the two states the rounds cannot say, because both describe
 * something still out on the road rather than in your hands:
 *
 *   PUZZLE  two levers to shoot, one pip each — a live to-do list
 *   GIFT    an open box ahead, and the word FREE
 *
 * Both end the moment the thing they describe is taken, which is exactly when
 * the rounds take over. That handover is what this file now pins.
 */

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
const STUBS = { GameIcon: { props: ['name'], template: '<i :data-icon="name"/>' } }

const mountTag = async (props: Record<string, unknown>) => {
  const WeaponTag = (await import('@/components/game/WeaponTag.vue')).default
  return mount(WeaponTag, {
    props: { puzzle: null, pulled: 0, total: 0, gift: false, active: null, ...props },
    global: { plugins: [i18n], stubs: STUBS }
  })
}

describe('the badge says what is on the road', () => {
  it('shows the puzzle as a to-do list, one pip per lever', async () => {
    const w = await mountTag({ puzzle: 'gatling', pulled: 1, total: 2 })
    expect(w.find('[role="status"]').exists()).toBe(true)
    expect(w.text()).toContain('Gatling Gun')
    expect(w.findAll('.wtag__pip').length).toBe(2)
    expect(w.findAll('.wtag__pip.is-on').length).toBe(1)
  })

  it('shows the gift box ahead as free, with no pips to do', async () => {
    const w = await mountTag({ puzzle: 'gatling', gift: true })
    expect(w.text()).toContain('FREE')
    expect(w.findAll('.wtag__pip').length).toBe(0)
    // A gift has no levers, so the locked wording's "{n} of {total}" would read
    // "0 of 0" to a screen reader — worse than silence, since it describes a
    // lock that is not there.
    expect(w.find('[role="status"]').attributes('aria-label'))
      .toBe('Gatling Gun ahead — free, no levers')
  })
})

describe('the badge says nothing about the gun in your hands', () => {
  it('renders nothing at all for a carried weapon', async () => {
    // The whole of the change, in one assertion. `active` is still accepted —
    // the scene binds it and is not this component's to edit — and is now
    // deliberately unread.
    const w = await mountTag({ active: 'gatling', power: 1 })
    expect(w.find('[role="status"]').exists(), 'the carried-weapon badge came back').toBe(false)
    expect(w.text()).toBe('')
  })

  it('renders nothing for two guns firing at once either', async () => {
    // Stage 2 can fire the gift gatling and the first boss's launcher together.
    // That used to be a badge with two glyphs and two multipliers; it is now two
    // visibly different streams of rounds.
    const w = await mountTag({ active: 'gatling', side: 'rocket', sidePower: 0.5 })
    expect(w.find('[role="status"]').exists()).toBe(false)
    expect(w.find('.wtag__plus').exists()).toBe(false)
  })

  it('still shows the box ahead while a weapon is already held', async () => {
    // The one case where both were true at once. The badge used to lead with the
    // carried gun and hang the gift off it; it now shows only the gift, because
    // the gift is the half the player has to steer at.
    const w = await mountTag({ active: 'rocket', power: 0.5, puzzle: 'gatling', gift: true })
    expect(w.text()).toContain('FREE')
    expect(w.text()).not.toContain('×')
    expect(w.findAll('[data-icon]').map((i) => i.attributes('data-icon'))).toEqual(['gatling'])
  })
})
