// ─── The handover, whoever is doing the handing ─────────────────────────────
//
// Two things in the game can now put a weapon in the crowd's hands: the box on
// the road, and the rewarded-ad offer on the HUD. They share one function
// (`handOverWeapon`) precisely so they cannot drift — and what would drift is
// the part nobody would notice, because a weapon that works is a weapon that
// looks right.
//
// The expensive failure is the SIDE gun. Stage 2 opens holding the first boss's
// launcher at reduced power; a handover that merely overwrote `activeWeapon`
// would silently confiscate it, and the player would read that as the ad having
// taken their launcher away rather than as a bug. So the contract is pinned
// here, off the offer's own entry point.
//
// The second claim is about timing rather than state: a rewarded video runs for
// half a minute, which is long enough to lose a squad, and `startStage` throws
// the weapon away on the way into the next road. A grant that landed after the
// run ended would therefore be an ad watched for nothing — so it refuses, and
// the caller leaves the offer unspent.

import { beforeEach, describe, expect, it } from 'vitest'

const importGame = () => import('@/use/useSurvivalGame')

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const g = await importGame()
  g.__resetForTest()
  // `__resetForTest` clears the world, not the loadout — and these refs are
  // module state, so a side gun left by the test above is still in the crowd's
  // hands in the one below.
  g.debugGiveWeapon(null)
})

describe('grantOfferWeapon', () => {
  it('hands over the full weapon when the crowd is firing its own gun', async () => {
    const g = await importGame()
    g.phase.value = 'run'
    g.activeWeapon.value = null

    expect(g.grantOfferWeapon('rocket')).toBe(true)
    expect(g.activeWeapon.value).toBe('rocket')
    // Full power, like a box — an ad does not buy a reduced version.
    expect(g.weaponPower.value).toBe(1)
    expect(g.sideWeapon.value).toBeNull()
  })

  it('keeps the gun already held, firing beside the new one at its own power', async () => {
    const g = await importGame()
    g.phase.value = 'run'
    // The shape stage 2 actually starts in: the first boss's launcher, on loan
    // at reduced damage. See `BOSS_REWARD_DAMAGE_MUL`.
    g.activeWeapon.value = 'rocket'
    g.weaponPower.value = 0.6

    expect(g.grantOfferWeapon('gatling')).toBe(true)
    expect(g.activeWeapon.value).toBe('gatling')
    expect(g.weaponPower.value).toBe(1)
    expect(g.sideWeapon.value, 'the ad confiscated the launcher').toBe('rocket')
    expect(g.sideWeaponPower.value, 'the side gun lost the power it was loaned at')
      .toBeCloseTo(0.6, 5)
  })

  it('is the same weapon again rather than a second copy of it', async () => {
    const g = await importGame()
    g.phase.value = 'run'
    g.activeWeapon.value = 'rocket'
    g.weaponPower.value = 0.6

    // Holding the loaner and handed the same launcher: that is the FULL version
    // of what is already held, not two launchers.
    expect(g.grantOfferWeapon('rocket')).toBe(true)
    expect(g.activeWeapon.value).toBe('rocket')
    expect(g.weaponPower.value).toBe(1)
    expect(g.sideWeapon.value).toBeNull()
  })

  it('refuses a run that ended while the video was playing', async () => {
    const g = await importGame()
    g.phase.value = 'run'
    g.activeWeapon.value = null
    g.phase.value = 'wipe'

    expect(g.grantOfferWeapon('rocket')).toBe(false)
    expect(g.activeWeapon.value, 'a dead run was handed a weapon').toBeNull()
  })
})
