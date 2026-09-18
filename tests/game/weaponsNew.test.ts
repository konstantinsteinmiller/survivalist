// ─── The four weapons that came after the first two ─────────────────────────
//
// The gatling and the launcher are two ways of shooting. These four are not:
// each one changes something ELSE about the road, and each of those changes is
// a rule that can drift. What is pinned here is the rule, not the number —
// where a number is asserted it is because the number IS the rule (the bolt's
// price, the thrall cap, what a corpse is worth).
//
//   GRAPESHOT  a fan of pellets, and half the reach of every other gun. The
//              reach is the price, and it is a price on the GATES too.
//   DYNAMO     a meter that fills from rounds that land, spent on a bolt the
//              player throws. Deliberately absent from the boss's pricing.
//   GRAVECALL  the dead get up and fight, capped, never an elite, and they take
//              the bites the crowd would have.
//   HOARD      a corpse stands as gold and bursts into more coins than it owed.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  DYNAMO_BOLT_MULT, GILD_COIN_MUL, GILD_STAND_S, THRALL_MAX, WEAPONS,
  WEAPON_DEBUT, WEAPON_ROTATION, weaponDpsMul, weaponForStage
} from '@/game/weapons'
import { BULLET_RANGE, type Foe } from '@/game/survival'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const game = await importGame()
  game.debugGiveWeapon(null)
})

/** A stage in progress with `squad` survivors and `weapon` in their hands. */
const armed = async (weapon: Parameters<Game['debugGiveWeapon']>[0], squad = 40): Promise<Game> => {
  const game = await importGame()
  game.startStage(6)
  game.debugAddUnits(squad)
  game.debugGiveWeapon(weapon)
  return game
}

/** One foe, planted where the test wants it, through the sim's own spawner. */
const plant = (game: Game, x: number, y: number, hp = 400): Foe => {
  const f = game.debugSpawnFoe(x, y)
  f.hp = hp
  f.maxHp = hp
  return f
}

describe('the arsenal holds together', () => {
  it('prices every weapon in one band, and never against the squad twice', () => {
    // The identity the whole file is balanced on: DPS is rate × damage, and a
    // weapon that fell outside the band the first two set would be a weapon
    // that makes the stage it is dealt on a different game.
    const all = Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]
    for (const id of all) {
      const dps = weaponDpsMul(id)
      // Gravecall is the floor and it is deliberate: its gun IS the squad's
      // own, and everything it is worth walks in front of the crowd instead.
      expect(dps, `${id} dps`).toBeGreaterThanOrEqual(0.85)
      expect(dps, `${id} dps`).toBeLessThanOrEqual(3.6)
    }
    // …and the shotgun is the strongest burst in the game, a shade over the
    // launcher, which is what it is sold on.
    expect(weaponDpsMul('grapeshot')).toBeGreaterThan(weaponDpsMul('rocket'))
  })

  it('deals each weapon no earlier than its debut, and rotates all six after', () => {
    for (const [id, stage] of Object.entries(WEAPON_DEBUT)) {
      for (let s = 4; s < stage; s += 2) {
        expect(weaponForStage(s), `${id} before stage ${stage}`).not.toBe(id)
      }
      expect(weaponForStage(stage)).toBe(id)
    }
    // Seven long against the box-position order's eight, so no weapon is welded
    // to one place on the road. Two dials that share a factor are one dial.
    expect(WEAPON_ROTATION.length % 8).not.toBe(0)
    expect(8 % WEAPON_ROTATION.length).not.toBe(0)
    const seen = new Set<string>()
    for (let s = 20; s <= 60; s += 2) seen.add(weaponForStage(s))
    expect(seen.size).toBe(Object.keys(WEAPONS).length)
  })
})

describe('grapeshot: a fan, and half the road', () => {
  it('fires its pellets across a cone instead of straight up', async () => {
    const game = await armed('grapeshot', 60)
    // Fire until a volley is in the air.
    for (let i = 0; i < 200 && game.getBullets().length < 4; i++) game.step(STEP_MS)
    const spread = game.getBullets().map((b) => b.vx)
    expect(spread.length, 'no pellets were fired').toBeGreaterThan(2)
    // A fan: the pellets do not share one heading, and they lean both ways.
    expect(Math.max(...spread)).toBeGreaterThan(0.5)
    expect(Math.min(...spread)).toBeLessThan(-0.5)
  })

  it('gives every pellet the gun`s own short reach', async () => {
    const game = await armed('grapeshot', 60)
    for (let i = 0; i < 200 && game.getBullets().length < 2; i++) game.step(STEP_MS)
    for (const b of game.getBullets()) {
      expect(b.range, 'a pellet reached as far as the squad`s own gun')
        .toBeLessThan(BULLET_RANGE)
      expect(b.range).toBeGreaterThan(0)
    }
  })

  it('bridges its own reload on a gate, so a short gun can still pump', () => {
    // The launcher's lesson, re-learned: a weapon whose trigger gap is longer
    // than a door's hot window cannot pump at all, and a prize that deletes the
    // game's headline mechanic is not a prize.
    const gap = 1 / (1.9 * WEAPONS.grapeshot.rateMul)
    expect(WEAPONS.grapeshot.gateHoldS + 0.4).toBeGreaterThan(gap)
  })
})

describe('dynamo: a meter, and the bolt it buys', () => {
  it('fills from rounds that land and not from rounds that miss', async () => {
    const game = await armed('dynamo', 40)
    for (let i = 0; i < 120; i++) game.step(STEP_MS)
    expect(game.dynamoCharge.value, 'an empty road charged the meter').toBe(0)

    plant(game, 0, game.anchor().y + 6)
    for (let i = 0; i < 200; i++) game.step(STEP_MS)
    expect(game.dynamoCharge.value, 'rounds landed and the meter stayed empty')
      .toBeGreaterThan(0)
  })

  it('refuses the bolt until the meter is full, and spends it when it fires', async () => {
    const game = await armed('dynamo', 40)
    expect(game.fireDynamoBolt(), 'an empty meter threw a bolt').toBe(false)
    game.debugChargeDynamo(1)
    expect(game.dynamoReady.value).toBe(true)
    expect(game.fireDynamoBolt()).toBe(true)
    expect(game.dynamoCharge.value).toBe(0)
    expect(game.fireDynamoBolt(), 'the meter paid for two bolts').toBe(false)
  })

  it('hits what is standing in the crowd`s own column, and misses what is not', async () => {
    const game = await armed('dynamo', 40)
    const y = game.anchor().y + 5
    const under = plant(game, game.anchor().x, y, 9e6)
    const beside = plant(game, game.anchor().x + 3, y, 9e6)
    game.debugChargeDynamo(1)
    game.fireDynamoBolt()
    expect(under.hp, 'the bolt missed the column it was fired up').toBeLessThan(under.maxHp)
    expect(beside.hp, 'the bolt was not a thin column').toBe(beside.maxHp)
  })

  it('is priced like the grenade and is NOT priced into the boss`s bar', async () => {
    // The owner's call, and the whole reason the bolt is a bonus: the fight was
    // sized for the gun. `weaponDamageMul` is what the bar is priced against,
    // and the bolt may never appear in it.
    expect(DYNAMO_BOLT_MULT).toBeGreaterThan(0)
    const game = await importGame()
    game.startStage(6)
    game.debugAddUnits(40)
    game.debugGiveWeapon('dynamo')
    const priced = game.debugWeaponDamageMul()
    game.debugChargeDynamo(1)
    expect(game.debugWeaponDamageMul(), 'a full meter re-priced the fight').toBe(priced)
  })
})

describe('gravecall: the dead get up', () => {
  it('raises what it kills, up to the cap, and never an elite', async () => {
    const game = await armed('gravecall', 60)
    const y = game.anchor().y + 4
    for (let i = 0; i < THRALL_MAX + 6; i++) {
      const f = plant(game, -2 + (i % 5), y + i * 0.05, 1)
      game.__damageFoeForTest(f, 50)
    }
    expect(game.getThralls().length, 'the cap did not hold').toBe(THRALL_MAX)

    const elite = plant(game, 0, y, 1)
    elite.elite = true
    const before = game.getThralls().length
    game.__damageFoeForTest(elite, 50)
    expect(game.getThralls().length, 'an elite was raised').toBe(before)
  })

  it('raises nobody at all without the weapon', async () => {
    const game = await armed(null, 60)
    const f = plant(game, 0, game.anchor().y + 4, 1)
    game.__damageFoeForTest(f, 50)
    expect(game.getThralls().length).toBe(0)
  })

  it('clears them with the stage, like the weapon itself', async () => {
    const game = await armed('gravecall', 60)
    const f = plant(game, 0, game.anchor().y + 4, 1)
    game.__damageFoeForTest(f, 50)
    expect(game.getThralls().length).toBe(1)
    game.startStage(7)
    expect(game.getThralls().length, 'the dead walked into the next stage').toBe(0)
  })
})

describe('hoard: a corpse, in gold', () => {
  it('stands the body up as gold instead of dropping its coins', async () => {
    const game = await armed('hoard', 40)
    const f = plant(game, 0, game.anchor().y + 4, 1)
    const coinsBefore = game.getPickups().length
    game.__damageFoeForTest(f, 50)
    expect(game.getStatues().length, 'no statue was raised').toBe(1)
    expect(game.getPickups().length, 'it dropped its coins as well as gilding')
      .toBe(coinsBefore)
  })

  it('pays more than the body owed, once the statue bursts', async () => {
    const game = await armed('hoard', 40)
    const f = plant(game, 0, game.anchor().y + 4, 1)
    game.__damageFoeForTest(f, 50)
    const owed = game.getStatues()[0]!.coins
    // The multiple is the weapon's own, and the statue was priced when the body
    // fell rather than when it bursts.
    expect(owed).toBeGreaterThan(1)
    expect(WEAPONS.hoard.gilds).toBe(GILD_COIN_MUL)

    // Paid into the run rather than dropped on the road: a statue stands while
    // the crowd keeps moving, so gold left where it burst is gold nobody ever
    // drives over — measured as a Hoard stage banking what an unarmed one did.
    const before = game.runCoins.value
    for (let i = 0; i < Math.ceil((GILD_STAND_S * 1000) / STEP_MS) + 4; i++) game.step(STEP_MS)
    expect(game.getStatues().length, 'the statue never burst').toBe(0)
    expect(game.runCoins.value - before, 'the gold paid nothing').toBe(owed)
  })
})
