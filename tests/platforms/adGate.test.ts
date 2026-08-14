import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The ad gate decides two things that are easy to get subtly wrong and
 * expensive to get wrong in review:
 *
 *   1. WHICH BUILDS charge for a perk. Shipping a gated perk on a build with no
 *      ad inventory makes the perk permanently unavailable.
 *   2. HOW OFTEN an interstitial may fire. Portals reject builds that stack
 *      breaks back to back, and the very first seconds of a session are the
 *      worst possible moment for one.
 */

type GateOpts = {
  crazy?: boolean
  fullRelease?: boolean
  rewardedReady?: boolean
  /** Which ad provider resolved. `'noop'` is local dev / plain web. */
  provider?: string
}

const loadGate = async (opts: GateOpts = {}) => {
  vi.resetModules()
  vi.doMock('@/use/useUser', () => ({ isCrazyWeb: opts.crazy ?? false }))
  vi.doMock('@/use/useMatch', () => ({ isCrazyGamesFullRelease: opts.fullRelease ?? false }))
  const showRewardedAd = vi.fn(async () => true)
  vi.doMock('@/use/useAds', async () => {
    const { ref } = await import('vue')
    return {
      // Default follows the build: a CG build resolves the CG provider, and
      // anything else defaults to noop unless the test names one.
      adProviderName: opts.provider ?? (opts.crazy ? 'crazygames' : 'noop'),
      isRewardedReady: ref(opts.rewardedReady ?? true),
      showRewardedAd
    }
  })
  const mod = await import('@/use/useAdGate')
  return { ...mod, showRewardedAd }
}

beforeEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('reward gating', () => {
  it('grants the perk for free when no ad provider resolved', async () => {
    // Local dev, plain web, itch — there is no video to play, so a gate would
    // make the perk permanently unavailable.
    const gate = await loadGate({ crazy: false, provider: 'noop' })
    const grant = vi.fn()
    expect(gate.isRewardGated).toBe(false)
    await expect(gate.claimReward(grant)).resolves.toBe(true)
    expect(grant).toHaveBeenCalledTimes(1)
    expect(gate.showRewardedAd).not.toHaveBeenCalled()
  })

  it('plays a rewarded video on every portal that has one', async () => {
    // The bug this locks: the gate used to read `isCrazyWeb && fullRelease`, so
    // five shipping portals with real rewarded inventory handed every perk out
    // for free — the video never played and the placement never earned.
    for (const provider of ['playgama', 'gamepix', 'gamemonetize', 'yandex', 'gameDistribution']) {
      const gate = await loadGate({ crazy: false, provider })
      const grant = vi.fn()
      expect(gate.isRewardGated, `${provider} did not gate the reward`).toBe(true)
      await expect(gate.claimReward(grant)).resolves.toBe(true)
      expect(gate.showRewardedAd, `${provider} skipped the video`).toHaveBeenCalledTimes(1)
      expect(grant).toHaveBeenCalledTimes(1)
    }
  })

  it('grants for free on a CrazyGames build that is not the full release', async () => {
    // The pre-release QA build has no ad inventory, so a gate there would make
    // every perk untestable AND unusable.
    const gate = await loadGate({ crazy: true, fullRelease: false })
    const grant = vi.fn()
    expect(gate.isRewardGated).toBe(false)
    await gate.claimReward(grant)
    expect(grant).toHaveBeenCalledTimes(1)
    expect(gate.showRewardedAd).not.toHaveBeenCalled()
  })

  it('plays a rewarded video on the CrazyGames full release', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    const grant = vi.fn()
    expect(gate.isRewardGated).toBe(true)
    await expect(gate.claimReward(grant)).resolves.toBe(true)
    expect(gate.showRewardedAd).toHaveBeenCalledTimes(1)
    expect(grant).toHaveBeenCalledTimes(1)
  })

  it('grants nothing when the video does not complete', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false)
    const grant = vi.fn()
    await expect(gate.claimReward(grant)).resolves.toBe(false)
    expect(grant).not.toHaveBeenCalled()
  })

  it('refuses to start a second video while one is in flight', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    let release: (v: boolean) => void = () => {}
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise<boolean>((r) => { release = r })
    )
    const grantA = vi.fn()
    const grantB = vi.fn()
    const first = gate.claimReward(grantA)
    expect(gate.adInFlight.value).toBe(true)
    await expect(gate.claimReward(grantB)).resolves.toBe(false)
    expect(grantB).not.toHaveBeenCalled()
    release(true)
    await first
    expect(grantA).toHaveBeenCalledTimes(1)
    expect(gate.adInFlight.value).toBe(false)
  })

  it('clears the in-flight flag even when the provider throws', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no fill'))
    await expect(gate.claimReward(vi.fn())).rejects.toThrow('no fill')
    // A stuck flag would disable every reward button for the rest of the run.
    expect(gate.adInFlight.value).toBe(false)
  })

  it('hides the offer on a gated build with no ad ready', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true, rewardedReady: false })
    expect(gate.canOfferReward.value).toBe(false)
  })

  it('always offers the perk on an ungated build, ad inventory or not', async () => {
    const gate = await loadGate({ crazy: false, fullRelease: false, rewardedReady: false })
    expect(gate.canOfferReward.value).toBe(true)
  })
})

describe('interstitial pacing', () => {
  it('never fires on the first opportunity of a session', async () => {
    const gate = await loadGate()
    gate.__resetInterstitialClock()
    // The opening minute is when a player decides whether the game is worth
    // their time; an ad there is the most reliable way to lose them.
    expect(gate.canShowInterstitial()).toBe(false)
  })

  it('holds the break for a full two minutes', async () => {
    vi.useFakeTimers()
    const gate = await loadGate()
    gate.__resetInterstitialClock()
    gate.canShowInterstitial() // starts the clock

    vi.advanceTimersByTime(119_000)
    expect(gate.canShowInterstitial()).toBe(false)

    vi.advanceTimersByTime(2_000)
    expect(gate.canShowInterstitial()).toBe(true)
  })

  it('restarts the clock once a break is actually shown', async () => {
    vi.useFakeTimers()
    const gate = await loadGate()
    gate.__resetInterstitialClock()
    gate.canShowInterstitial()

    vi.advanceTimersByTime(121_000)
    expect(gate.canShowInterstitial()).toBe(true)
    gate.markInterstitialShown()

    // Immediately after a break, the next one is a full gap away again — this
    // is what stops a fast run from stacking two breaks in a row.
    expect(gate.canShowInterstitial()).toBe(false)
    expect(gate.interstitialCooldownLeft()).toBeGreaterThan(119)

    vi.advanceTimersByTime(121_000)
    expect(gate.canShowInterstitial()).toBe(true)
  })
})
