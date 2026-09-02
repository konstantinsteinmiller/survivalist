// First-PLAY interstitial gating (`useFirstStartInterstitial`).
//
// Pins the GameMonetize / GameDistribution moderation placement: an interstitial
// on the FIRST eligible click-to-start of the session, once only, and only when
// an ad is currently fillable. Other builds never fire it; a not-ready first tap
// doesn't burn the one-shot (so it retries on the next start).
//
// Poki rides the same placement for a different reason: it has no
// `showPreroll()`, and the core reports a `commercialBreak()` as a PREROLL until
// the first `gameplayStart()` and a midroll after it. `GameScene.boot()` awaits
// this before `startStage()`, so this call IS Poki's preroll.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const showMidgameAd = vi.fn(() => Promise.resolve())

// Load the module fresh (resets its session flag) with the given build flags and
// a readiness ref we can flip to simulate the SDK coming up between taps.
const load = async (flags: { gm?: boolean; gd?: boolean; poki?: boolean }, ready = true) => {
  vi.resetModules()
  const { ref } = await import('vue')
  const readyRef = ref(ready)
  vi.doMock('@/use/useUser', () => ({
    isGameMonetize: !!flags.gm,
    isGameDistribution: !!flags.gd,
    isPoki: !!flags.poki
  }))
  vi.doMock('@/use/useAds', () => ({ isInterstitialReady: readyRef, showMidgameAd }))
  const mod = await import('@/use/useFirstStartInterstitial')
  return { mod, readyRef }
}

describe('useFirstStartInterstitial', () => {
  beforeEach(() => showMidgameAd.mockClear())
  afterEach(() => {
    vi.doUnmock('@/use/useUser')
    vi.doUnmock('@/use/useAds')
  })

  it('shows exactly once on GameMonetize when ready', async () => {
    const { mod } = await load({ gm: true })
    await mod.playFirstStartInterstitial()
    await mod.playFirstStartInterstitial()
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
  })

  it('shows on GameDistribution too', async () => {
    const { mod } = await load({ gd: true })
    await mod.playFirstStartInterstitial()
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
  })

  it('shows on Poki too — this is its preroll, fired before the first gameplayStart', async () => {
    const { mod } = await load({ poki: true })
    await mod.playFirstStartInterstitial()
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
  })

  it('never fires on a non-GM/GD/Poki build', async () => {
    const { mod } = await load({})
    await mod.playFirstStartInterstitial()
    expect(showMidgameAd).not.toHaveBeenCalled()
  })

  it('does not consume the one-shot when not ready — retries on the next start', async () => {
    const { mod, readyRef } = await load({ gm: true }, false)
    await mod.playFirstStartInterstitial() // not ready → no ad, flag NOT consumed
    expect(showMidgameAd).not.toHaveBeenCalled()
    readyRef.value = true
    await mod.playFirstStartInterstitial() // now ready → fires
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
  })
})
