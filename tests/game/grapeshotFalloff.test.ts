// ─── The shotgun hits hardest up close ──────────────────────────────────────
//
// Owner's call (2026-09-19): grapeshot was the weakest weapon and not worth a
// lane of the weapon split. Its pellets now land for 2.5x their damage at the
// crowd, falling off in a straight line to 1x at the end of the gun's reach
// (`damageAtReach`). Boss fights are fought past that reach, so its pellets fly
// on to the boss there and the bar is sized for the share of the fan that lands
// (`GRAPESHOT_FIGHT_HIT_SHARE`).

import { beforeEach, describe, expect, it } from 'vitest'
import {
  GRAPESHOT_FIGHT_HIT_SHARE, GRAPESHOT_MAX_RANGE_MUL, GRAPESHOT_POINT_BLANK_MUL, WEAPONS, damageAtReach,
  type WeaponId
} from '@/game/weapons'
import { BULLET_RANGE } from '@/game/survival'

const importGame = () => import('@/use/useSurvivalGame')

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const g = await importGame()
  g.__resetForTest()
  g.debugGiveWeapon(null)
})

describe('damageAtReach', () => {
  const reach = 7.5

  it('is 2.5x at the crowd and 1x at the end of the reach, in a straight line', () => {
    expect(GRAPESHOT_POINT_BLANK_MUL).toBe(2.5)
    expect(GRAPESHOT_MAX_RANGE_MUL).toBe(1)
    expect(damageAtReach('grapeshot', 0, reach)).toBe(2.5)
    expect(damageAtReach('grapeshot', reach, reach)).toBe(1)
    expect(damageAtReach('grapeshot', reach / 2, reach)).toBeCloseTo(1.75, 9)
  })

  it('never goes past either end', () => {
    expect(damageAtReach('grapeshot', -3, reach)).toBe(2.5)
    expect(damageAtReach('grapeshot', reach * 3, reach)).toBe(1)
  })

  it('leaves every other gun, and the squad own gun, alone', () => {
    for (const id of ['rocket', 'gatling', 'dynamo', 'gravecall', 'hoard'] as WeaponId[]) {
      expect(damageAtReach(id, 0, reach), id).toBe(1)
    }
    expect(damageAtReach(null, 0, reach)).toBe(1)
  })
})

describe('the boss fight with a shotgun is not a chore', () => {
  // Owner's playtest, 2026-09-19: the stage-1 boss was "a real chore" with the
  // shotgun. The bosses fight from past its reach, and its fan misses some.

  it('sizes the bar for the share of the fan that lands, at 1x (the fight is at the end of its reach)', async () => {
    const g = await importGame()
    g.debugGiveWeapon('grapeshot')
    const w = WEAPONS.grapeshot
    expect(GRAPESHOT_FIGHT_HIT_SHARE).toBeLessThan(1)
    expect(g.debugWeaponDamageMul()).toBeCloseTo(w.rateMul * w.damageMul * GRAPESHOT_FIGHT_HIT_SHARE, 6)
    // Every other gun is priced as fired.
    g.debugGiveWeapon('gatling')
    expect(g.debugWeaponDamageMul()).toBeCloseTo(WEAPONS.gatling.rateMul * WEAPONS.gatling.damageMul, 6)
  })

  it('lets its pellets reach a boss standing past the end of its reach', async () => {
    const g = await importGame()
    g.startStage(1)
    g.steerOnly.value = false
    g.debugAddUnits(40)
    g.debugSkipToArena()
    for (let i = 0; i < 400 && !(g.phase.value === 'boss' && g.getBoss()); i++) g.step(16)
    const boss = g.getBoss()!
    expect(boss).toBeTruthy()
    g.debugGiveWeapon('grapeshot')
    const reach = BULLET_RANGE * WEAPONS.grapeshot.rangeMul
    const start = boss.hp
    for (let i = 0; i < 120; i++) {
      // Pinned well past the pellets' road reach, straight ahead, unguarded.
      const a = g.anchor()
      boss.x = a.x
      boss.y = a.y + reach + 2
      boss.guard = 0
      g.step(16)
      if (boss.dead) break
    }
    expect(boss.hp, 'no pellet reached a boss standing past the shotgun reach').toBeLessThan(start)
  })
})
