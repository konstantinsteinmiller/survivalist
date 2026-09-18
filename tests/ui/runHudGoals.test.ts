import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

/**
 * ─── Two long-term goals, one slot ──────────────────────────────────────────
 *
 * The gift ladder's promise and the milestone bonus both sit under the stage
 * label, taking turns (owner's call, 2026-09-18: "the stage-5 bonus chip shown
 * from stage 1"). A third line would push the progress rail down a phone, so
 * the promise under test is: both are shown, alternately, in ONE chip — and a
 * lone goal just stays up. Neither ever shows during the boss.
 */

vi.mock('@/use/useGameAudio', () => ({ playFx: () => {} }))

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const BASE_PROPS = {
  stage: 1, best: 0, progress: 0.2, squad: 10, damage: 2, fireRate: 1.5,
  phase: 'run' as const, bossHp: 0, elite: false, eliteHp: 0, challenge: 0
}

const LADDER = { icon: 'gift' as const, text: 'Choose a weapon · next stage' }
const BONUS = { text: 'Bonus +185 · in 4 stages' }

const mountHud = async (props: Record<string, unknown>) => {
  const RunHud = (await import('@/components/game/RunHud.vue')).default
  return mount(RunHud, { props: { ...BASE_PROPS, ...props }, global: { plugins: [i18n] } })
}

const goalTexts = (hud: Awaited<ReturnType<typeof mountHud>>): string[] =>
  hud.findAll('.run-hud__next-text').map((n) => n.text())

afterEach(() => { vi.useRealTimers() })

describe('the goal chip', () => {
  it('alternates the ladder promise and the bonus in one slot', async () => {
    vi.useFakeTimers()
    const hud = await mountHud({ nextUnlock: LADDER, bonus: BONUS })
    expect(hud.findAll('.run-hud__goal-slot')).toHaveLength(1)
    expect(goalTexts(hud)).toContain(LADDER.text)

    vi.advanceTimersByTime(4000)
    await hud.vm.$nextTick()
    expect(goalTexts(hud)).toContain(BONUS.text)

    vi.advanceTimersByTime(4000)
    await hud.vm.$nextTick()
    expect(goalTexts(hud)).toContain(LADDER.text)
    hud.unmount()
  })

  it('keeps a lone bonus up without rotating it away', async () => {
    vi.useFakeTimers()
    const hud = await mountHud({ nextUnlock: null, bonus: BONUS })
    expect(goalTexts(hud)).toEqual([BONUS.text])
    vi.advanceTimersByTime(12_000)
    await hud.vm.$nextTick()
    expect(goalTexts(hud)).toContain(BONUS.text)
    hud.unmount()
  })

  it('stands down for the boss', async () => {
    const hud = await mountHud({ nextUnlock: LADDER, bonus: BONUS, phase: 'boss' })
    expect(hud.find('.run-hud__goal-slot').exists()).toBe(false)
    hud.unmount()
  })
})
