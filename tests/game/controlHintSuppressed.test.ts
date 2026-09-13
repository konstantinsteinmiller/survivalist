import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

/**
 * ─── Two instructions may never share a frame ───────────────────────────────
 *
 * At the first boss, the gaze attack raises "Hold still" in the warning badge
 * while the control primer's guard pill explains that the boss's shield is up.
 * In the build a first-contact playtest saw, those two were telling the player
 * opposite things in the first minute of the game, on the frame that decides the
 * fight; one tester lost 38 of 41 survivors standing in the middle of it.
 *
 * The fix has two halves in two files. The scene decides WHEN a primer is
 * outranked — a warning is about this second, a primer is about the game — and
 * this component takes the answer as a flag. What is pinned here is the half
 * this component owns, and specifically the two ways a "hide it" flag is usually
 * got wrong:
 *
 *   IT IS NOT A RETIREMENT   suppressing does not teach the hint, mark it seen,
 *                            or clear it. The same pill comes back.
 *   IT IS NOT A FORK         a suppressed pill leaves exactly the way a retired
 *                            one does, so the player never sees two different
 *                            disappearances and reads one of them as a glitch.
 */

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const mountHint = async (props: Record<string, unknown>) => {
  const ControlHint = (await import('@/components/game/ControlHint.vue')).default
  return mount(ControlHint, { props, global: { plugins: [i18n] } })
}

describe('a hint can be held quiet from outside', () => {
  it('shows the pill by default — the flag has to be asked for', async () => {
    const hint = await mountHint({ hint: 'guard' })
    expect(hint.find('.control-hint').exists()).toBe(true)
    expect(hint.find('.control-hint__text').text().length).toBeGreaterThan(0)
  })

  it('hides the pill while suppressed and gives back the SAME one after', async () => {
    const hint = await mountHint({ hint: 'guard' })
    const said = hint.find('.control-hint__text').text()

    await hint.setProps({ suppressed: true })
    expect(hint.find('.control-hint').exists(), 'the pill stayed up next to the warning').toBe(false)
    // The lesson is still the run's — nothing was taught and nothing retired.
    expect(hint.props('hint')).toBe('guard')

    await hint.setProps({ suppressed: false })
    expect(hint.find('.control-hint').exists(), 'the hint did not come back').toBe(true)
    expect(hint.find('.control-hint__text').text()).toBe(said)
  })

  it('stays hidden when there is no hint to suppress, and does not throw on the flag', async () => {
    const hint = await mountHint({ hint: null, suppressed: true })
    expect(hint.find('.control-hint').exists()).toBe(false)
    await hint.setProps({ suppressed: false })
    expect(hint.find('.control-hint').exists()).toBe(false)
  })

  it('leaves by the same route whether it was retired or suppressed', async () => {
    // Both paths go through the one `v-if` inside the component's own
    // `Transition`, which is the whole reason they cannot diverge: there is a
    // single condition, so there is a single way off the screen.
    const retired = await mountHint({ hint: 'guard' })
    await retired.setProps({ hint: null })
    const quieted = await mountHint({ hint: 'guard' })
    await quieted.setProps({ suppressed: true })
    expect(quieted.html()).toBe(retired.html())
  })
})

/**
 * ─── And it has to actually LEAVE THE DOM ───────────────────────────────
 *
 * Everything above passes whether or not the pill ever comes off the screen,
 * and for months it did not. `@vue/test-utils` stubs `<Transition>` by default
 * and renders its children straight through, so every `exists()` here was
 * reading the render tree — which was correct — while the real browser kept the
 * element mounted.
 *
 * The cause is a collision between two CSS features on one element. `.control-
 * hint` breathes (`animation: hint-breathe 2.4s infinite`) and the transition
 * fades it (`260ms`). Vue times a leave off whichever is LONGER, picked the
 * animation, and then waited for an `animationend` that an infinite animation
 * never fires. Measured in a browser during the grenade lesson: the component
 * reported `suppressed: true, shown: false` while the pill sat, fully lit, on
 * top of a lightbox that had dimmed everything else on the screen.
 *
 * `type="transition"` is the documented answer and it is the whole fix. It
 * cannot be asserted through behaviour in jsdom — there are no real transitions
 * there either — so it is asserted as the structural fact it is.
 */
describe('the pill is timed off its transition, not its infinite animation', () => {
  it('tells Vue which clock to use, so the leave can finish', async () => {
    const seen: Record<string, unknown>[] = []
    const TransitionSpy = {
      name: 'TransitionSpy',
      props: ['name', 'type', 'duration'],
      setup(props: Record<string, unknown>) { seen.push(props); return () => null }
    }
    const ControlHint = (await import('@/components/game/ControlHint.vue')).default
    mount(ControlHint, {
      props: { hint: 'guard' },
      global: { plugins: [i18n], stubs: { transition: TransitionSpy } }
    })
    expect(seen.length, 'the pill stopped being wrapped in a Transition').toBe(1)
    expect(
      seen[0]!.type,
      'the leave is back on auto-detection, and `hint-breathe` is infinite — '
        + 'the pill will never be removed from the DOM'
    ).toBe('transition')
  })
})
