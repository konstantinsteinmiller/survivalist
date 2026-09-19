// ─── The gift ladder ────────────────────────────────────────────────────────
//
// What the opening stages hand over and what they PROMISE, in order. The
// banner, the HUD chip and the scene all read the same three functions, so
// the contract is pinned here once: weapon choice into stage 3, shield into
// stage 4, and a weapon on the road every other stage from 4 — always the next
// one, never one already passed.

import { describe, expect, it } from 'vitest'
import {
  DECOY_GIFT_STAGE, FROST_GIFT_STAGE, SHIELD_GIFT_STAGE, nextUnlock, nextWeaponStage, stagesAway
} from '@/game/ladder'
import {
  WEAPON_EVERY, WEAPON_PICK_OFFER_STAGE, WEAPON_PICK_STAGE, WEAPON_STAGE, stageHasWeapon, weaponForStage
} from '@/game/weapons'

describe('the ladder', () => {
  it('runs choice → shield → weapon on the road, on consecutive stages', () => {
    expect(WEAPON_PICK_STAGE).toBe(3)
    expect(SHIELD_GIFT_STAGE).toBe(WEAPON_PICK_STAGE + 1)
    expect(WEAPON_STAGE).toBe(SHIELD_GIFT_STAGE)
    // …and the puzzle keeps coming every other stage, forever — every stage on
    // the long middle road, 16-29 (see `longRoad.test.ts`).
    expect(WEAPON_EVERY).toBe(2)
    for (const s of [4, 6, 8, 100, 400]) expect(stageHasWeapon(s)).toBe(true)
    for (const s of [1, 2, 3, 5, 7, 101]) expect(stageHasWeapon(s)).toBe(false)
  })

  it('promises the weapon choice on stage 1, the shield on 2 and 3', () => {
    // The choice is offered at the first boss's kill (`WEAPON_PICK_OFFER_STAGE`,
    // 2026-09-18), so stage 1 is the only road that promises it — and since the
    // four-lane split (2026-09-19) it stands ON stage 1's road, before the boss,
    // so the promise is for this stage rather than the next.
    const u = nextUnlock(1)!
    expect(u.kind).toBe('weaponPick')
    expect(u.atStage).toBe(1)
    expect(WEAPON_PICK_OFFER_STAGE).toBe(2)
    expect(u.icon).toBe('gift')
    for (const s of [2, 3]) {
      const shield = nextUnlock(s)!
      expect(shield.kind).toBe('shield')
      expect(shield.atStage).toBe(SHIELD_GIFT_STAGE)
      expect(shield.icon).toBe('shield')
    }
  })

  it('promises the two late skills when they open before (or with) the next box', () => {
    // Frost Nova on 7, between the boxes on 6 and 8 — so stage 6 says frost.
    expect(nextUnlock(6)).toEqual({ atStage: FROST_GIFT_STAGE, icon: 'snowflake', kind: 'skill', skill: 'frost' })
    // The flare on 10 shares its stage with a box, and a skill for good beats a
    // loaner for one road — so 8 and 9 both say flare.
    for (const s of [8, 9]) {
      expect(nextUnlock(s), `stage ${s}`).toEqual({ atStage: DECOY_GIFT_STAGE, icon: 'flare', kind: 'skill', skill: 'decoy' })
    }
    // …and a box that comes first keeps the chip: 4 and 5 are playing toward 6.
    expect(nextUnlock(4)!.kind).toBe('weapon')
    expect(nextUnlock(5)!.kind).toBe('weapon')
    expect(nextUnlock(7)!.kind).toBe('weapon')
  })

  it('names the NEXT box and the weapon it holds, from stage 4 on', () => {
    for (let s = 4; s <= 60; s++) {
      const u = nextUnlock(s)!
      // The late skills take the chip on the stages that are playing toward them.
      if (u.kind === 'skill') {
        expect(s, `stage ${s}`).toBeLessThan(DECOY_GIFT_STAGE)
        continue
      }
      expect(u.kind, `stage ${s}`).toBe('weapon')
      // Strictly after the current stage: the promise is never the road the
      // player is already on.
      expect(u.atStage, `stage ${s}`).toBeGreaterThan(s)
      expect(stageHasWeapon(u.atStage)).toBe(true)
      // The nearest one, not a later one.
      expect(nextWeaponStage(s)).toBe(u.atStage)
      for (let t = s + 1; t < u.atStage; t++) expect(stageHasWeapon(t), `stage ${t}`).toBe(false)
      // Labelled by the weapon in THAT box, and the icon is the weapon.
      expect(u.weapon).toBe(weaponForStage(u.atStage))
      expect(u.icon).toBe(u.weapon)
    }
  })

  it('counts the stages to go from the stage the player is on', () => {
    expect(stagesAway(1, nextUnlock(1)!)).toBe(1)
    expect(stagesAway(2, nextUnlock(2)!)).toBe(2)
    expect(stagesAway(3, nextUnlock(3)!)).toBe(1)
    // A puzzle stage promises the one after next: two stages away.
    expect(stagesAway(4, nextUnlock(4)!)).toBe(2)
    expect(stagesAway(5, nextUnlock(5)!)).toBe(1)
    // Never zero, whatever the input — "in 0 stages" is a chip that lies.
    expect(stagesAway(99, { atStage: 3, icon: 'gift', kind: 'weaponPick' })).toBe(1)
  })

  it('survives nonsense stage numbers', () => {
    expect(nextUnlock(0)!.kind).toBe('weaponPick')
    expect(nextUnlock(-5)!.kind).toBe('weaponPick')
    expect(nextUnlock(1.7)!.kind).toBe('weaponPick')
    expect(nextWeaponStage(4, 1)).toBeNull()
  })
})
