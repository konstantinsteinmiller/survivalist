/**
 * ─── The grouping has to survive a language switch ──────────────────────────
 *
 * `formatCount` is pure and `localeNumbers.test.ts` proves it groups correctly
 * for every locale the game ships. What that suite cannot see is the way this
 * is most often got wrong at the CALL SITE:
 *
 *     const fmt = new Intl.NumberFormat(locale.value)      // ← built once
 *     const grouped = (n: number) => fmt.format(n)
 *
 * That captures whichever locale was active when the component first painted.
 * Every number it formats afterwards keeps English commas on a German board —
 * and it is invisible in review, because the first render is always right.
 *
 * So the rule is that the locale is read INSIDE the render:
 *
 *     const grouped = (n: number) => formatCount(n, locale.value)
 *
 * which makes it a reactive read like any other, so every computed that calls
 * it re-runs on the switch. This mounts the real board modal and switches the
 * language under it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { ref } from 'vue'
import en from '@/i18n/locales/en'
import de from '@/i18n/locales/de'
import ja from '@/i18n/locales/ja'

// The board itself is not under test — only the numbers it renders — so the
// composable is replaced with a fixed one. A real row and a rank below the cut
// exercise both of the modal's formatting sites at once.
vi.mock('@/use/useLeaderboard', () => ({
  OUTSIDE_BOARD: -1,
  boardSize: { value: 100 },
  playerTotal: { value: 154331 },
  leaderboardPending: { value: false },
  leaderboardFailed: { value: false },
  leaderboard: { value: { entries: [{ rank: 41032, name: 'Ada', score: 12, squad: 4000 }] } },
  ensureBoard: () => Promise.resolve(),
  rankFor: () => 41032,
  rankTotalFor: () => 154331
}))
vi.mock('@/use/useSurvivalGame', () => ({ bestStage: { value: 12 } }))
vi.mock('@/use/usePlayerIdentity', () => ({ playerDisplayName: ref('Someone Else') }))

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, de, ja } })

const mountModal = async () => {
  const Modal = (await import('@/components/organisms/LeaderboardModal.vue')).default
  return mount(Modal, {
    props: { open: true },
    global: { plugins: [i18n], stubs: { FModal: { template: '<div><slot /></div>' } } }
  })
}

beforeEach(() => { i18n.global.locale.value = 'en' })

describe('the board re-groups its numbers when the language changes', () => {
  it('follows the player from English to German', async () => {
    const w = await mountModal()
    expect(w.text(), 'the rank is not grouped at all').toContain('41,032')
    expect(w.text()).toContain('154,331')

    i18n.global.locale.value = 'de'
    await w.vm.$nextTick()
    // German groups on dots. An English comma here reads as a decimal point.
    expect(w.text(), 'the grouping was frozen at first paint').toContain('41.032')
    expect(w.text()).toContain('154.331')
    expect(w.text(), 'an English separator survived the switch').not.toContain('41,032')
  })

  it('renders the footer as one sentence, in the locale own word order', async () => {
    const w = await mountModal()
    // Read off the FOOTER element rather than the whole modal: the table above
    // it prints the same rank in its own row, so a search over all the text
    // finds that one first and the assertion would pass on the wrong string.
    const footer = () => w.get('.board__footer-rank').text()

    // English: the rank leads, and the sentence is complete — no dangling "of".
    expect(footer()).toBe('You are #41,032 of 154,331')

    i18n.global.locale.value = 'ja'
    await w.vm.$nextTick()
    // Japanese: the POPULATION leads — "{total} 人中 #{n} 位". This is the case
    // a split footer rendered backwards while every locale file looked correct.
    const ja = footer()
    expect(ja.indexOf('154,331'), 'the population no longer leads in Japanese')
      .toBeLessThan(ja.indexOf('41,032'))
  })
})
