import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A modal has to stop the simulation, not just tell the SDK it did.
 *
 * Every one of these menus is opened mid-siege — the tech tree in particular is
 * where a player goes to answer a wave that is beating them — so letting the
 * enemies keep chewing while the menu is up punishes them for using the game's
 * own systems. It also keeps `gameplayStop()` honest: it is supposed to mean
 * gameplay stopped, not that a panel is covering it.
 */

const load = async () => {
  vi.resetModules()
  const pause = await import('@/use/useGamePause')
  const modal = await import('@/use/useModalState')
  return { ...pause, ...modal }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('modal pause', () => {
  it('halts the simulation while a modal is open', async () => {
    const m = await load()
    expect(m.isGamePaused.value).toBe(false)
    const release = m.acquireModalOpen()
    expect(m.isAnyModalOpen.value).toBe(true)
    expect(m.isGamePaused.value).toBe(true)
    release()
    expect(m.isAnyModalOpen.value).toBe(false)
    expect(m.isGamePaused.value).toBe(false)
  })

  it('reports the modal as the reason, so the pause log is readable', async () => {
    const m = await load()
    const release = m.acquireModalOpen()
    expect(m.getActivePauseReasons()).toContain('modal')
    release()
  })

  it('composes stacked modals — the last one out resumes play', async () => {
    const m = await load()
    const a = m.acquireModalOpen()
    const b = m.acquireModalOpen()
    a()
    expect(m.isGamePaused.value).toBe(true)
    b()
    expect(m.isGamePaused.value).toBe(false)
  })

  it('is idempotent on release, so cleanup hooks can double-fire safely', async () => {
    const m = await load()
    const a = m.acquireModalOpen()
    const b = m.acquireModalOpen()
    a()
    a()
    a()
    // `b` is still holding: three calls to `a` must not have freed it.
    expect(m.isGamePaused.value).toBe(true)
    expect(m.isAnyModalOpen.value).toBe(true)
    b()
    expect(m.isGamePaused.value).toBe(false)
  })

  it('does not resume early when an ad is also up', async () => {
    const m = await load()
    m.isAdShowing.value = true
    const release = m.acquireModalOpen()
    release()
    // The ad is still on screen — closing the menu underneath it must not
    // restart physics and audio beneath the video.
    expect(m.isGamePaused.value).toBe(true)
    m.isAdShowing.value = false
    expect(m.isGamePaused.value).toBe(false)
  })
})
