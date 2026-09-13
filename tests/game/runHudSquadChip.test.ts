import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

/**
 * ─── One chip, and it says which way the crowd is going ─────────────────────
 *
 * A five-tester first-contact playtest sat people in front of a four-chip stats
 * row and asked them what the chips were. Four of the five could not name one:
 * the orange streak flame was read as a DROPLET by all four, and the bolt and
 * the clock were matched to damage and fire rate only after the player had
 * opened the shop and seen the same glyphs beside their prices. The owner's call
 * was deletion rather than teaching — so three chips are gone, and the one that
 * is left had to start saying what it counts.
 *
 * What is pinned here is the part that is easy to ship broken. The tint is
 * driven by a prop that moves several times a second during a gate payout, so
 * the naive watcher — tint on every change — strobes, and the naive fix — queue
 * the tints — is still playing the payout back after it has ended. The rule is
 * a LATCH:
 *
 *   HELD            one tint, held for a fixed window
 *   EXTENDED        another change the same way pushes the window out; forty
 *                   frames of payout is one continuous green
 *   DROPPED         a change the other way is dropped, not queued
 *   …EXCEPT RED     a loss always interrupts a gain, because the two mistakes
 *                   do not cost the same
 *
 * The milestone punch on the same chip is proved in `tests/ui/runHudMilestone.
 * test.ts`; the two must not touch each other, and the last block here says so.
 */

const playFx = vi.fn()
vi.mock('@/use/useGameAudio', () => ({ playFx: (...args: unknown[]) => playFx(...args) }))

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const BASE_PROPS = {
  stage: 3, best: 5, progress: 0.2, squad: 10, damage: 2, fireRate: 1.5,
  phase: 'run' as const, bossHp: 0, elite: false, eliteHp: 0, challenge: 0
}

const mountHud = async (props: Record<string, unknown> = {}) => {
  const RunHud = (await import('@/components/game/RunHud.vue')).default
  return mount(RunHud, { props: { ...BASE_PROPS, ...props }, global: { plugins: [i18n] } })
}

/** The two hold windows, from `RunHud.vue`. A loss is held longer on purpose. */
const GAIN_MS = 300
const LOSS_MS = 460

beforeEach(() => {
  playFx.mockClear()
  vi.useFakeTimers()
})
afterEach(() => { vi.useRealTimers() })

describe('the three chips nobody could name are gone', () => {
  it('leaves the squad chip alone on the stats row', async () => {
    // Every number the deleted chips drew is still being PASSED — the scene
    // binds all three and is not ours to edit — so a HUD that quietly started
    // rendering them again would still pass a props-shaped test. Count the
    // chips instead.
    const hud = await mountHud({ challenge: 4, damage: 7.5, fireRate: 2.4 })
    expect(hud.findAll('.run-hud__chip').length, 'a deleted chip is back on the strip').toBe(1)
    expect(hud.find('.run-hud__chip').classes()).toContain('is-squad')
    for (const gone of ['.is-damage', '.is-rate', '.is-streak']) {
      expect(hud.find(gone).exists(), `${gone} is still rendered`).toBe(false)
    }
    // …and nothing on the strip prints those numbers in any other shape.
    expect(hud.find('.run-hud__stats').text()).toBe('10')
  })

  it('keeps the stage line, and has since lost the star and the career best too', async () => {
    // The second playtest took two more readouts off this strip, and both for
    // the same reason the first three went: a glyph and a digit with no unit is
    // not a goal, it is one more thing to ignore.
    //
    //   ★ 4     the milestone countdown. "What is the ★ 1 mean? Nobody
    //           understands it anyway." The payout it counted down to still
    //           lands and still names itself on the result screen.
    //   Best 3  a career best, under a stage number, in a game where you cannot
    //           go back to it. Nothing the player can act on.
    //
    // The stage line survives because it is the one label that says where you
    // are, and the rail now sits directly under it.
    const hud = await mountHud({ milestoneIn: 2, best: 3 })
    expect(hud.find('.run-hud__chest').exists(), 'the star chip came back').toBe(false)
    expect(hud.find('.run-hud__best').exists(), 'the career best came back').toBe(false)
    expect(hud.find('.run-hud__stage-label').text()).toBe('Stage 3')
  })
})

describe('the squad glyph tints in the direction the crowd moved', () => {
  const icon = (hud: Awaited<ReturnType<typeof mountHud>>) =>
    hud.find('.run-hud__chip.is-squad .run-hud__icon').classes()

  it('goes green on the way up and red on the way down', async () => {
    const hud = await mountHud()
    expect(icon(hud)).not.toContain('is-gain')

    await hud.setProps({ squad: 14 })
    expect(icon(hud), 'a gain went untinted').toContain('is-gain')

    vi.advanceTimersByTime(GAIN_MS + 1)
    await hud.vm.$nextTick()
    expect(icon(hud), 'the tint became a state instead of a hit').not.toContain('is-gain')

    await hud.setProps({ squad: 9 })
    expect(icon(hud)).toContain('is-loss')
  })

  it('holds ONE green through a payout instead of one per frame', async () => {
    const hud = await mountHud()
    // A gate bank paying out: the prop moves every frame for most of a second.
    // A frame passes, THEN the crowd grows — so the window is measured from the
    // last change and not from the last assertion. Thirty frames is 480 ms, well
    // past the 300 ms window: an implementation that started the clock once and
    // let it run would have gone dark somewhere in the middle of this loop.
    for (let n = 11; n <= 40; n += 1) {
      vi.advanceTimersByTime(16)
      await hud.setProps({ squad: n })
      expect(icon(hud), 'the tint dropped out mid-payout').toContain('is-gain')
    }
    // The window runs from the LAST change, not the first — a payout that ends
    // must not leave the chip lit for another third of a second than it earned,
    // and must not go dark while it is still paying.
    vi.advanceTimersByTime(GAIN_MS - 1)
    await hud.vm.$nextTick()
    expect(icon(hud)).toContain('is-gain')
    vi.advanceTimersByTime(2)
    await hud.vm.$nextTick()
    expect(icon(hud)).not.toContain('is-gain')
  })

  it('lets a loss interrupt a gain, and never the other way round', async () => {
    const hud = await mountHud()
    await hud.setProps({ squad: 30 })
    expect(icon(hud)).toContain('is-gain')

    // Something took bodies while the payout was still running. This is the
    // frame the player has to see.
    await hud.setProps({ squad: 22 })
    expect(icon(hud), 'a loss was swallowed by a gain that was already showing').toContain('is-loss')
    expect(icon(hud)).not.toContain('is-gain')

    // The payout resumes underneath it — and does NOT paint over the red.
    await hud.setProps({ squad: 26 })
    await hud.setProps({ squad: 31 })
    expect(icon(hud), 'a gain overwrote a loss the player may not have seen yet').toContain('is-loss')

    // Once the red has had its window, the next gain tints normally.
    vi.advanceTimersByTime(LOSS_MS + 1)
    await hud.vm.$nextTick()
    expect(icon(hud)).not.toContain('is-loss')
    await hud.setProps({ squad: 33 })
    expect(icon(hud)).toContain('is-gain')
  })

  it('says nothing about a change too small to be on the chip', async () => {
    // The chip prints a rounded number. A crowd settling 20.4 → 20.2 is not a
    // loss the player can see, and a HUD that flashed red for it would be
    // reporting deaths that did not happen.
    const hud = await mountHud({ squad: 20.4 })
    await hud.setProps({ squad: 20.2 })
    expect(icon(hud)).not.toContain('is-loss')
    expect(icon(hud)).not.toContain('is-gain')
  })

  it('drops a held tint when a new run starts', async () => {
    const hud = await mountHud()
    await hud.setProps({ squad: 0 })
    expect(icon(hud)).toContain('is-loss')

    // wipe → retry. The red belonged to the run that just ended; carrying it
    // over would put it on the first frame of the next one.
    await hud.setProps({ phase: 'wipe' })
    await hud.setProps({ phase: 'run', squad: 0 })
    expect(icon(hud)).not.toContain('is-loss')
  })
})

describe('the tint and the milestone punch stay out of each other\'s way', () => {
  it('tints without re-keying the chip, and punches without dropping the tint', async () => {
    const hud = await mountHud()
    const chip = () => hud.find('.run-hud__chip.is-squad').element

    const before = chip()
    await hud.setProps({ squad: 13 })
    // The punch restarts its CSS animation by re-keying this node. The tint must
    // not: a class held in state and a node replaced underneath it is how a
    // "flash" ends up stuck on forever.
    expect(chip(), 'the tint re-mounted the chip').toBe(before)
    expect(chip().classList.contains('is-punched')).toBe(false)

    // 13 → 26 crosses the first rung: both fire off the same prop change.
    await hud.setProps({ squad: 26 })
    expect(chip().classList.contains('is-punched'), 'the punch stopped firing').toBe(true)
    expect(hud.find('.run-hud__chip.is-squad .run-hud__icon').classes()).toContain('is-gain')
    expect(playFx).toHaveBeenCalledWith('squadMilestone', 0)
  })
})
