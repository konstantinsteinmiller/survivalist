// ─── Poki gameplay-bracket guard ────────────────────────────────────────────
//
// This is the highest-value test in the Poki integration, because the bugs it
// guards against are INVISIBLE at runtime: they cost revenue, or fail QA, and
// report nothing to the game.
//
// Three separate contracts are pinned here.
//
// 1. THE BAD-EVENT KILL SWITCH. De-minifying the shipped `poki-sdk-core` gives:
//
//      Jc.set(this, () => badEvents >= 10)        // gate on start/stop/commercialBreak
//      // gameplayStop:  lastStopAt = performance.now()
//      // gameplayStart: if (lastStopAt && lastStopAt > performance.now() - 50) badEvents++
//      setInterval(() => { badEvents = Math.max(badEvents - 1, 0) }, 1000)
//
//    A `gameplayStart()` within 50 ms of the preceding `gameplayStop()` is
//    scored a "bad event". At ten of them, `gameplayStart`, `gameplayStop` AND
//    `commercialBreak` all become no-ops for the rest of the session — the game
//    keeps running and simply stops earning. This project drives the bracket
//    from `watch(isLiveGameplay, …)` in GameScene, a computed over five reactive
//    inputs, so a modal closing in the same tick an ad opens produces exactly
//    that sub-50 ms pair. The guard has to live in the plugin, not the caller.
//
// 2. THE FIRST START IS AN INTERACTION, NOT A LOAD. Poki requires the first
//    `gameplayStart()` to mark the player actually beginning to play, and
//    measures conversion-to-play (the Web Fit Test's 65 % gate) on it — so a
//    start fired when the loader finishes counts every bounced loader visit as
//    a play. The Inspector's event log flags it, which is how it was caught.
//
// 3. NO UNMATCHED STOP. The Inspector showed a `Gameplay stop` arriving before
//    any start, because the scene mounts under the splash and its bracket
//    opened and closed before the SDK was ready to be told. A stop must only
//    ever follow a start that actually reached the SDK.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Emitted = { kind: 'start' | 'stop', at: number }

const GUARD_MS = 120

const loadPlugin = async () => {
  vi.resetModules()
  return await import('@/utils/pokiPlugin')
}

/** Minimal PokiSDK double that records the ORDER and TIMING of the two
 *  bracket events — the only two things the bad-event counter looks at. */
const installSdkSpy = (): Emitted[] => {
  const emitted: Emitted[] = []
  ;(window as unknown as { PokiSDK: unknown }).PokiSDK = {
    gameplayStart: () => emitted.push({ kind: 'start', at: performance.now() }),
    gameplayStop: () => emitted.push({ kind: 'stop', at: performance.now() }),
    gameLoadingFinished: () => {},
    init: () => Promise.resolve(),
    commercialBreak: () => Promise.resolve(),
    rewardedBreak: () => Promise.resolve(false),
    measure: () => {},
    captureError: () => {},
    getLanguage: () => 'en',
    getDeviceInfo: () => ({ category: 'desktop' })
  }
  return emitted
}

/** Open both release gates, so the bad-event timing assertions below exercise
 *  the guard rather than the gates. Mirrors the real boot order: the splash
 *  resolves (`gameLoadingFinished`), then the player touches the game. */
type Plugin = Awaited<ReturnType<typeof loadPlugin>>
const openGates = (mod: Plugin): void => {
  mod.pokiGameLoadingFinished()
  mod.notePokiFirstInteraction()
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('poki gameplay bracket', () => {
  beforeEach(() => { installSdkSpy() })
  afterEach(() => { delete (window as unknown as { PokiSDK?: unknown }).PokiSDK })

  describe('release gates — first start is an interaction, not a load', () => {
    it('sends nothing until BOTH gameLoadingFinished and the first interaction', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()

      // The scene mounts under the splash and immediately reports live gameplay.
      mod.pokiGameplayStart()
      expect(emitted).toEqual([])

      // Loader done — still not enough on its own. This is the exact state the
      // Inspector flagged: a start arriving on the loading-finished edge.
      mod.pokiGameLoadingFinished()
      expect(emitted).toEqual([])

      // The player actually touches the game. NOW the bracket opens.
      mod.notePokiFirstInteraction()
      expect(emitted.map((e) => e.kind)).toEqual(['start'])
    })

    it('holds a start requested before the loader finished, then delivers it', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()

      // Interaction can also come FIRST (a tap during the splash) — the start is
      // still held until the documented gameLoadingFinished -> start order holds.
      mod.notePokiFirstInteraction()
      mod.pokiGameplayStart()
      expect(emitted).toEqual([])

      mod.pokiGameLoadingFinished()
      expect(emitted.map((e) => e.kind)).toEqual(['start'])
    })

    it('opens nothing if gameplay stopped being live before the gates opened', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()

      mod.pokiGameplayStart()
      mod.pokiGameplayStop()
      openGates(mod)
      await wait(GUARD_MS * 2)

      // The player never played, so Poki must not be told they did.
      expect(emitted).toEqual([])
    })

    it('treats the interaction as one-shot — later ones do not re-open a bracket', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()

      openGates(mod)
      mod.pokiGameplayStart()
      mod.notePokiFirstInteraction()
      mod.notePokiFirstInteraction()

      expect(emitted.map((e) => e.kind)).toEqual(['start'])
    })
  })

  describe('no unmatched stop', () => {
    it('never emits a stop before any start has reached the SDK', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()

      // `watch(isLiveGameplay, …, { immediate: true })` fires with `false` on
      // mount — that must not become a `gameplayStop` on a bracket never opened.
      mod.pokiGameplayStop()
      openGates(mod)
      mod.pokiGameplayStop()

      expect(emitted).toEqual([])
    })

    it('emits no stop for a bracket that was still gated', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()

      mod.pokiGameLoadingFinished()
      mod.pokiGameplayStart()   // held: no interaction yet
      mod.pokiGameplayStop()    // must NOT produce an unmatched stop
      await wait(GUARD_MS * 2)

      expect(emitted).toEqual([])
    })
  })

  describe('bad-event guard', () => {
    it('never emits a start within the SDK bad-event window of a stop', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()
      openGates(mod)

      // The pathological case: a reactive boolean thrashing inside one tick.
      for (let i = 0; i < 30; i++) {
        mod.pokiGameplayStart()
        mod.pokiGameplayStop()
      }
      await wait(GUARD_MS * 3)

      expect(emitted.length).toBeGreaterThan(0)
      emitted.forEach((e, i) => {
        if (i === 0) return
        const prev = emitted[i - 1]!
        // No duplicate consecutive events (an explicit Poki quality requirement).
        expect(e.kind).not.toBe(prev.kind)
        // And no start inside the guard window of the preceding stop.
        if (e.kind === 'start') {
          expect(e.at - prev.at).toBeGreaterThanOrEqual(GUARD_MS)
        }
      })
    })

    it('collapses duplicate consecutive starts and stops', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()
      openGates(mod)

      mod.pokiGameplayStart()
      mod.pokiGameplayStart()
      mod.pokiGameplayStart()
      mod.pokiGameplayStop()
      mod.pokiGameplayStop()
      await wait(GUARD_MS * 2)

      expect(emitted.map((e) => e.kind)).toEqual(['start', 'stop'])
    })

    it('drops a deferred start entirely when a stop arrives before it fires', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()
      openGates(mod)

      mod.pokiGameplayStart()   // emits immediately (no preceding stop)
      mod.pokiGameplayStop()    // emits, arms the guard window
      mod.pokiGameplayStart()   // inside the window -> deferred, not emitted yet
      mod.pokiGameplayStop()    // cancels the pending start
      await wait(GUARD_MS * 3)

      // The deferred start never reached the SDK, so no unmatched stop follows.
      expect(emitted.map((e) => e.kind)).toEqual(['start', 'stop'])
    })

    it('still delivers a deferred start once the window has passed', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()
      openGates(mod)

      mod.pokiGameplayStart()
      mod.pokiGameplayStop()
      mod.pokiGameplayStart()   // deferred by the guard
      await wait(GUARD_MS * 3)

      // Deferred, NOT dropped — the bracket still reaches Poki, just late enough
      // that the SDK doesn't score it.
      expect(emitted.map((e) => e.kind)).toEqual(['start', 'stop', 'start'])
      const [, stop, start] = emitted as [Emitted, Emitted, Emitted]
      expect(start.at - stop.at).toBeGreaterThanOrEqual(GUARD_MS)
    })

    it('emits normally when the game paces itself outside the window', async () => {
      const emitted = installSdkSpy()
      const mod = await loadPlugin()
      openGates(mod)

      mod.pokiGameplayStart()
      mod.pokiGameplayStop()
      await wait(GUARD_MS * 2)
      mod.pokiGameplayStart()
      await wait(10)

      expect(emitted.map((e) => e.kind)).toEqual(['start', 'stop', 'start'])
    })
  })

  it('sends gameLoadingFinished exactly once', async () => {
    let count = 0
    installSdkSpy()
    ;(window as unknown as { PokiSDK: { gameLoadingFinished: () => void } })
      .PokiSDK.gameLoadingFinished = () => { count++ }

    const { pokiGameLoadingFinished } = await loadPlugin()
    pokiGameLoadingFinished()
    pokiGameLoadingFinished()
    pokiGameLoadingFinished()

    expect(count).toBe(1)
  })

  it('is inert when the SDK never loaded (ad-blocked / CDN down)', async () => {
    delete (window as unknown as { PokiSDK?: unknown }).PokiSDK
    const mod = await loadPlugin()

    // Poki requires the game to stay fully playable with an ad blocker active,
    // so none of these may throw when `window.PokiSDK` is absent.
    expect(() => {
      mod.pokiGameplayStart()
      mod.pokiGameplayStop()
      mod.pokiGameLoadingFinished()
      mod.notePokiFirstInteraction()
    }).not.toThrow()
  })
})
