// ─── The mid-run rewarded weapon offer ──────────────────────────────────────
//
// The chip bottom-left, above the mute button: a film frame and a gun, thirty
// seconds of video, and the crowd is firing a launcher.
//
// It is the only rewarded surface in this game that interrupts a LIVE run, and
// that is where every claim below comes from. The component that draws it is
// unmounted by the very ad it requests — `isLiveGameplay` drops while the video
// is up — so the rules live in the composable and are checked here.
//
// The ad stack itself is mocked: the provider resolves to `noop` under vitest,
// which makes `isRewardGated` false and would leave every assertion below
// trivially true. What is under test is the offer's own arithmetic.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const canOfferReward = ref(true)
const adInFlight = ref(false)
const claimReward = vi.fn(async (grant: () => void) => { grant(); return true })
const resumeMusicAfterAd = vi.fn()

const activeWeapon = ref<string | null>(null)
const sideWeapon = ref<string | null>(null)
const stage = ref(1)
const phase = ref('run')
/** Stands in for the real grant, which refuses a run that has already ended. */
const grantOfferWeapon = vi.fn((id: string) => {
  if (phase.value !== 'run') return false
  activeWeapon.value = id
  return true
})

const load = async (gated = true) => {
  vi.resetModules()
  vi.doMock('@/use/useAdGate', () => ({
    isRewardGated: gated, canOfferReward, adInFlight, claimReward
  }))
  vi.doMock('@/use/useSound', () => ({ resumeMusicAfterAd }))
  vi.doMock('@/use/useSurvivalGame', () => ({
    activeWeapon, sideWeapon, stage, phase, grantOfferWeapon
  }))
  return await import('@/use/useWeaponOffer')
}

beforeEach(() => {
  claimReward.mockClear()
  resumeMusicAfterAd.mockClear()
  grantOfferWeapon.mockClear()
  canOfferReward.value = true
  adInFlight.value = false
  activeWeapon.value = null
  sideWeapon.value = null
  stage.value = 1
  phase.value = 'run'
})

afterEach(() => {
  vi.doUnmock('@/use/useAdGate')
  vi.doUnmock('@/use/useSound')
  vi.doUnmock('@/use/useSurvivalGame')
  vi.useRealTimers()
})

describe('what the video buys', () => {
  it('is always the gun the crowd is not already firing', async () => {
    const m = await load()
    // Nothing held: the launcher, which is the bigger moment of the two.
    expect(m.offerWeapon.value).toBe('rocket')
    activeWeapon.value = 'gatling'
    expect(m.offerWeapon.value).toBe('rocket')
    // Already holding the launcher: the hose leads and the launcher drops to
    // the side gun, so the player ends up firing both. Still an upgrade —
    // nobody watches an ad for a sidegrade.
    activeWeapon.value = 'rocket'
    expect(m.offerWeapon.value).toBe('gatling')
  })

  it('is not offered at all once two guns are already firing', async () => {
    const m = await load()
    activeWeapon.value = 'rocket'
    sideWeapon.value = 'gatling'
    // There is no third slot: a further handover would only rotate which of the
    // two leads, and an ad has to buy something.
    expect(m.canOfferWeapon.value).toBe(false)
  })
})

describe('which builds make the offer', () => {
  it('none of the ones with no rewarded ads', async () => {
    // The same rule the result screen's ×3 follows. On a build with no provider
    // `claimReward` grants for free, so a button wearing a film frame would pay
    // out with no video — a lie in one direction, and a free weapon button in
    // the other. `isRewardGated` is a build-time constant, so this whole surface
    // is folded out of those bundles rather than merely hidden.
    const m = await load(false)
    expect(m.canOfferWeapon.value).toBe(false)
  })

  it('and not while the provider has nothing loaded', async () => {
    const m = await load()
    canOfferReward.value = false
    expect(m.canOfferWeapon.value).toBe(false)
  })
})

describe('claiming', () => {
  it('hands over the weapon, spends the offer and restarts the music', async () => {
    const m = await load()
    expect(await m.claimWeaponOffer()).toBe(true)
    expect(grantOfferWeapon).toHaveBeenCalledWith('rocket')
    expect(m.canOfferWeapon.value, 'the offer can be taken twice in one run').toBe(false)
    // The half that is invisible until it is missing: `showRewardedAd` hard-stops
    // the music and clears the play intent, and the thing that normally brings it
    // back is the next result screen — a whole stage away from here.
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
  })

  it('restarts the music even when the video paid out nothing', async () => {
    const m = await load()
    claimReward.mockImplementationOnce(async () => false)
    expect(await m.claimWeaponOffer()).toBe(false)
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
    expect(m.canOfferWeapon.value, 'a no-fill burned the offer').toBe(true)
  })

  it('leaves the offer unspent when the run ended while the video played', async () => {
    const m = await load()
    // Thirty seconds is long enough to lose a squad, and `grantOfferWeapon`
    // refuses a run that is over — `startStage` would confiscate the weapon a
    // second later, so the player would have paid for nothing.
    claimReward.mockImplementationOnce(async (grant: () => void) => {
      phase.value = 'wipe'
      grant()
      return true
    })
    expect(await m.claimWeaponOffer()).toBe(false)
    phase.value = 'run'
    expect(m.canOfferWeapon.value).toBe(true)
  })

  it('refuses while a video is already up', async () => {
    const m = await load()
    adInFlight.value = true
    expect(await m.claimWeaponOffer()).toBe(false)
    expect(claimReward).not.toHaveBeenCalled()
  })
})

describe('when the offer comes back', () => {
  it('on the next stage', async () => {
    const m = await load()
    await m.claimWeaponOffer()
    expect(m.canOfferWeapon.value).toBe(false)
    stage.value = 2
    expect(m.canOfferWeapon.value).toBe(true)
  })

  it('and on a retry of the same stage', async () => {
    const m = await load()
    await m.claimWeaponOffer()
    // A retry is a new run on the same stage NUMBER, and the weapon does not
    // survive it — so an offer that stayed spent would have charged for an ad
    // and then taken the goods back.
    phase.value = 'wipe'
    phase.value = 'run'
    expect(m.canOfferWeapon.value).toBe(true)
  })
})

describe('the attention bounce', () => {
  it('announces itself once, then every three minutes, for five seconds', async () => {
    vi.useFakeTimers()
    const m = await load()
    expect(m.offerBouncing.value).toBe(false)

    // Armed from the chip's own mount, which is the first moment there is
    // anybody to see it — not at import, which is behind the splash.
    m.armOfferBounce()
    expect(m.offerBouncing.value).toBe(true)
    vi.advanceTimersByTime(m.OFFER_BOUNCE_MS)
    expect(m.offerBouncing.value).toBe(false)

    vi.advanceTimersByTime(m.OFFER_BOUNCE_EVERY_MS - m.OFFER_BOUNCE_MS - 1)
    expect(m.offerBouncing.value, 'it came back early').toBe(false)
    vi.advanceTimersByTime(2)
    expect(m.offerBouncing.value).toBe(true)
  })

  it('does not re-announce every time the chip remounts', async () => {
    vi.useFakeTimers()
    const m = await load()
    m.armOfferBounce()
    vi.advanceTimersByTime(m.OFFER_BOUNCE_MS)
    expect(m.offerBouncing.value).toBe(false)
    // The chip unmounts and remounts for every modal, every ad and every result
    // screen. A cadence re-armed on each of those bounces on every return,
    // which is the opposite of every-three-minutes.
    m.armOfferBounce()
    m.armOfferBounce()
    expect(m.offerBouncing.value).toBe(false)
  })

  it('never bounces at a chip that is not on offer', async () => {
    vi.useFakeTimers()
    const m = await load()
    canOfferReward.value = false
    m.armOfferBounce()
    expect(m.offerBouncing.value).toBe(false)
    // …but the clock kept its own time rather than restarting when the offer
    // returned, so a player coming out of a modal is not met with an instant
    // bounce.
    canOfferReward.value = true
    vi.advanceTimersByTime(m.OFFER_BOUNCE_EVERY_MS)
    expect(m.offerBouncing.value).toBe(true)
  })
})
