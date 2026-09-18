// ─── Every upgrade has to actually arrive ───────────────────────────────────
//
// A player reported that the Squad track "did not have any effect". It was
// true, and it was true of two more tracks beside it.
//
// The shop is reachable from the HUD **during a run**, and three of its seven
// stat tracks were latched at `startStage` and nowhere else: `damage.value`,
// `runFireRate` and the crowd itself are snapshots of `unitDamage`, `fireRate`
// and `startSquad` taken as the stage opened. Buying any of them mid-stage
// spent the coins, raised the level, and changed nothing about the run —
// measured at stage 7 with six levels of each: squad 11 -> 11, damage 1 -> 1,
// rate 1.90 -> 1.90.
//
// Squad is the one that got reported, and that is not luck: the HUD shows the
// live crowd, so it is the only one of the three where the player can WATCH the
// number refuse to move. The other two were equally broken and simply quieter,
// which is the more dangerous condition.
//
// This file is the tripwire. It asks the only question that matters about a
// shop — *did the thing I paid for reach the game?* — of every track, in both
// of the two moments a player can buy: between stages, and mid-run.

import { beforeEach, describe, expect, it } from 'vitest'
import { effectiveBulletRange, MAX_FIRE_RATE } from '@/game/survival'
import {
  UPGRADE_ORDER, applyUpgrade, coinMagnetBonus, coinMultiplier, fireRate as metaFireRate,
  gatePayoutBonus, grenadeMult, rangeBonus, shieldSeconds, squadPerLevel, startSquadAt,
  unitDamage, upgradeLevel, weaponPowerMul, __setUpgradeLevel, type UpgradeId
} from '@/use/useUpgrades'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

/** Let the level watcher flush — it is a `pre` watcher, so it lands on the
 *  microtask queue rather than inside `applyUpgrade`. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  for (const id of UPGRADE_ORDER) __setUpgradeLevel(id, 0)
  const game = await importGame()
  game.debugGiveWeapon(null)
})

/**
 * Everything the shop is supposed to move, read the way the SIMULATION reads
 * it — not off the level, which is the thing that was already correct.
 */
const runState = (game: Game) => ({
  squad: game.squadCount.value,
  damage: game.damage.value,
  rate: +game.runFireRate.value.toFixed(4),
  range: +effectiveBulletRange(rangeBonus.value).toFixed(4),
  coinMul: +coinMultiplier.value.toFixed(4),
  magnet: +coinMagnetBonus.value.toFixed(4),
  gatePayout: +gatePayoutBonus.value.toFixed(4),
  grenade: +grenadeMult.value.toFixed(4),
  shield: +shieldSeconds.value.toFixed(4),
  rocket: +weaponPowerMul('rocket').toFixed(4),
  gatling: +weaponPowerMul('gatling').toFixed(4),
  // The four later weapons' tracks. Two of them buy damage and two buy what
  // their weapon actually does — the dead it raises, the gold it makes — but
  // all four are read through the same multiplier, which is the number a
  // purchase has to move. See `WeaponDef.powerScales`.
  grapeshot: +weaponPowerMul('grapeshot').toFixed(4),
  dynamo: +weaponPowerMul('dynamo').toFixed(4),
  gravecall: +weaponPowerMul('gravecall').toFixed(4),
  hoard: +weaponPowerMul('hoard').toFixed(4)
})

/** Which run-facing number each track is supposed to move. */
const OWNS: Record<UpgradeId, keyof ReturnType<typeof runState>> = {
  squad: 'squad',
  power: 'damage',
  rate: 'rate',
  range: 'range',
  scavenge: 'coinMul',
  grenade: 'grenade',
  shield: 'shield',
  rocket: 'rocket',
  gatling: 'gatling',
  grapeshot: 'grapeshot',
  dynamo: 'dynamo',
  gravecall: 'gravecall',
  hoard: 'hoard'
}

describe('a purchase between stages reaches the next one', () => {
  it.each(UPGRADE_ORDER)('%s', async (id) => {
    const game = await importGame()
    game.startStage(6)
    const before = runState(game)

    applyUpgrade(id)
    expect(upgradeLevel(id), `${id} did not level up at all`).toBe(1)
    game.startStage(6)
    const after = runState(game)

    const key = OWNS[id]
    expect(after[key], `${id} bought a level that the run cannot see`)
      .toBeGreaterThan(before[key])
  })
})

describe('a purchase DURING a run reaches that run', () => {
  // The shop button sits in the HUD and is gated only on the result screen and
  // on other modals — a player can and does buy mid-stage. Before the fix this
  // whole block was the bug.
  const live = async (): Promise<Game> => {
    const game = await importGame()
    game.startStage(7)
    // The steering target is module state and survives `startStage`: a spec
    // that left the crowd steered at a crate hands the next one a crowd heading
    // for the shoulder. Centred, and kept above a handful, because since the
    // 2026-09-18 re-cut stage 7 opens on seven hounds that meet an un-upgraded
    // starting crowd inside these 200 frames — the warm-up is not what is tested.
    game.steerTo(0)
    for (let i = 0; i < 200; i++) {
      if (game.squadCount.value < 12) game.debugAddUnits(12 - game.squadCount.value)
      game.step(STEP_MS)
    }
    expect(game.phase.value).toBe('run')
    return game
  }

  it('adds the survivors the Squad track was paid for', async () => {
    const game = await live()
    const before = game.squadCount.value
    for (let i = 0; i < 6; i++) applyUpgrade('squad')
    await settle()
    // Exactly six levels' worth of bodies — a level is `squadPerLevel(stage)`
    // survivors (two, on stage 7), and the relief multipliers are a stage-start
    // concession that has no business scaling a purchase.
    expect(squadPerLevel(7)).toBe(2)
    expect(game.squadCount.value - before).toBe(6 * squadPerLevel(7))
  })

  it('raises Firepower and Fire Rate on the spot', async () => {
    const game = await live()
    const dmg = game.damage.value
    const rate = game.runFireRate.value
    for (let i = 0; i < 4; i++) { applyUpgrade('power'); applyUpgrade('rate') }
    await settle()
    expect(game.damage.value).toBeCloseTo(dmg + (unitDamage.value - 1), 4)
    expect(game.runFireRate.value).toBeGreaterThan(rate)
  })

  it('does not confiscate what the ROAD paid out to fund it', async () => {
    // `damage.value` is the shop's number PLUS every green crate broken so far.
    // Writing the absolute meta value over it — the obvious one-line "fix" —
    // would refund the shop by deleting the run's own progress.
    const game = await live()
    // Break a real damage crate through the real path, so `damage.value` is
    // genuinely "the shop's number plus the road's". Asserted rather than
    // assumed: a conditional here would let the test pass on a run that never
    // met a crate, which is exactly the case it exists to cover.
    // Enough shooters to actually break something, and the crowd steered onto
    // the box. Zeroing a crate's `hp` by hand does NOT break it — `breakCrate`
    // runs from `resolveBullet`, so a round has to land — which is why the
    // first version of this loop silently proved nothing.
    game.debugAddUnits(60)
    let broke = false
    for (let i = 0; i < 4000 && !broke; i++) {
      // Topped up, because stage 7's first damage crate is 103 units in since the
      // 2026-09-18 re-cut, behind seven hounds and ten husks — sixty survivors
      // steering at a crate do not reach it on their own. The crate still has to
      // break through the real path; only the crowd is kept alive to get there.
      if (game.squadCount.value < 40) game.debugAddUnits(40 - game.squadCount.value)
      const crate = game.getCrates().find((c) => !c.dead && c.kind === 'damage')
      if (crate) {
        crate.hp = Math.min(crate.hp, 1)
        game.steerTo(crate.x)
      }
      game.step(STEP_MS)
      broke = game.damage.value > 1
      if (game.phase.value !== 'run') break
    }
    const earned = game.damage.value
    expect(broke, 'never broke a damage crate — this test proves nothing').toBe(true)
    expect(earned).toBeGreaterThan(1)

    applyUpgrade('power')
    await settle()
    // The DELTA lands on top of the crate gain; the crate gain survives.
    expect(game.damage.value).toBeCloseTo(earned + (unitDamage.value - 1), 4)
  })

  it('folds a purchase in ONCE, not again at the next stage', async () => {
    const game = await live()
    for (let i = 0; i < 5; i++) applyUpgrade('power')
    await settle()
    game.startStage(8)
    // The new stage rebuilds from the meta value directly. If the mid-run fold
    // also survived, the baseline would be double-counted.
    expect(game.damage.value).toBeCloseTo(unitDamage.value, 4)
    expect(game.squadCount.value).toBe(Math.round(startSquadAt(8)))
  })

  it('never shrinks a live crowd when the level appears to fall', async () => {
    // A cloud save landing mid-run re-reads the levels, and a stale blob can
    // briefly report LESS than the player has. Deleting live survivors on the
    // strength of that is far worse than doing nothing — the next stage
    // reconciles it either way.
    const game = await live()
    for (let i = 0; i < 6; i++) applyUpgrade('squad')
    await settle()
    const grown = game.squadCount.value
    __setUpgradeLevel('squad', 0)
    await settle()
    expect(game.squadCount.value).toBe(grown)
    expect(game.damage.value).toBeGreaterThan(0)
  })

  it('keeps the fire rate inside the band the run is clamped to', async () => {
    const game = await live()
    // The rate track is capped at 12 levels precisely because `MAX_FIRE_RATE`
    // is a real ceiling; a mid-run fold must go through the same clamp every
    // other writer does rather than around it.
    for (let i = 0; i < 12; i++) applyUpgrade('rate')
    game.debugAddFireRate(10)
    await settle()
    applyUpgrade('rate')
    await settle()
    expect(game.runFireRate.value).toBeLessThanOrEqual(MAX_FIRE_RATE)
  })
})

describe('the tracks that were always live stay live', () => {
  it('moves reach, magnet, payout, grenade, shield and both weapons mid-run', async () => {
    const game = await importGame()
    game.startStage(7)
    for (let i = 0; i < 120; i++) game.step(STEP_MS)
    const before = runState(game)
    for (const id of ['range', 'scavenge', 'grenade', 'shield', 'rocket', 'gatling'] as const) {
      for (let i = 0; i < 3; i++) applyUpgrade(id)
    }
    await settle()
    const after = runState(game)
    // These are read from their computed at the moment they are used, so they
    // were never latched — but "never latched" is a property of the call sites,
    // and call sites move.
    for (const key of ['range', 'coinMul', 'magnet', 'grenade', 'shield', 'rocket', 'gatling'] as const) {
      expect(after[key], `${key} stopped being live`).toBeGreaterThan(before[key])
    }
  })

  it('raises what a `+N` door pays, which is what Squad really buys at depth', async () => {
    // Four extra starting survivors are rounding error next to a crowd the
    // gates have already multiplied — so the Squad track also buys a share of
    // every additive door. That half is invisible in the HUD, which is part of
    // why the track reads as doing nothing.
    expect(gatePayoutBonus.value).toBe(1)
    for (let i = 0; i < 5; i++) applyUpgrade('squad')
    expect(gatePayoutBonus.value).toBeGreaterThan(1)
  })
})

describe('nothing in the shop is a no-op at level 1', () => {
  it('every track moves something the run reads, from the very first level', async () => {
    // The blunt version of the whole file: buy ONE level of everything and
    // assert the world is different. A track whose first purchase changes
    // nothing is a track that takes money for nothing, whatever the readout in
    // the shop says.
    const game = await importGame()
    game.startStage(9)
    const before = runState(game)
    for (const id of UPGRADE_ORDER) applyUpgrade(id)
    game.startStage(9)
    const after = runState(game)
    const unchanged = (Object.keys(before) as Array<keyof typeof before>)
      .filter((k) => before[k] === after[k])
    expect(unchanged, `these did not move: ${unchanged.join(', ')}`).toEqual([])
  })
})
