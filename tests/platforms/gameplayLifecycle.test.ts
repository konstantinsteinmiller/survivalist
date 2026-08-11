import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Which CrazyGames lifecycle events a build sends.
 *
 * The two contracts are deliberately different, and getting them backwards is
 * invisible until a reviewer reads the event log — so it is asserted here.
 */

interface Loaded {
  signalGameplayLoaded: () => void
  syncGameplayLifecycle: (live: boolean) => void
  initCrazyGames: () => Promise<void>
  __resetGameplayLifecycle: () => void
  calls: string[]
}

const load = async (fullRelease: boolean): Promise<Loaded> => {
  vi.resetModules()
  vi.doMock('@/use/useUser', () => ({ isCrazyWeb: true }))
  vi.doMock('@/use/useMatch', () => ({ isCrazyGamesFullRelease: fullRelease }))

  const calls: string[] = []
  ;(globalThis as any).window = globalThis as any
  ;(globalThis as any).CrazyGames = {
    SDK: {
      environment: 'crazygames',
      init: async () => {},
      game: {
        gameplayStart: () => calls.push('start'),
        gameplayStop: () => calls.push('stop')
      },
      user: {},
      ad: {}
    }
  }

  const mod = await import('@/use/useCrazyGames')
  await mod.initCrazyGames()
  mod.__resetGameplayLifecycle()
  calls.length = 0
  return { ...mod, calls } as unknown as Loaded
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('pre-release build', () => {
  it('fires exactly one gameplayStart, after loading', async () => {
    const m = await load(false)
    expect(m.calls).toEqual([])
    m.signalGameplayLoaded()
    expect(m.calls).toEqual(['start'])
  })

  it('never fires it twice, however often boot runs', async () => {
    const m = await load(false)
    m.signalGameplayLoaded()
    m.signalGameplayLoaded()
    m.signalGameplayLoaded()
    expect(m.calls).toEqual(['start'])
  })

  it('sends nothing at all for ads, menus or the result screen', async () => {
    const m = await load(false)
    m.signalGameplayLoaded()
    m.syncGameplayLifecycle(false)
    m.syncGameplayLifecycle(true)
    m.syncGameplayLifecycle(false)
    // The one loaded-start, and not a single stop: there is no ad inventory on
    // this build, so a start/stop stream around ads that never play is noise.
    expect(m.calls).toEqual(['start'])
  })
})

describe('full release build', () => {
  it('ignores the loaded signal — the lifecycle owns the events', async () => {
    const m = await load(true)
    m.signalGameplayLoaded()
    expect(m.calls).toEqual([])
  })

  it('stops when play is interrupted and starts when it resumes', async () => {
    const m = await load(true)
    m.syncGameplayLifecycle(true)
    m.syncGameplayLifecycle(false)
    m.syncGameplayLifecycle(true)
    expect(m.calls).toEqual(['start', 'stop', 'start'])
  })

  it('is idempotent — a repeated state does not re-emit', async () => {
    const m = await load(true)
    m.syncGameplayLifecycle(true)
    m.syncGameplayLifecycle(true)
    m.syncGameplayLifecycle(false)
    m.syncGameplayLifecycle(false)
    expect(m.calls).toEqual(['start', 'stop'])
  })
})
