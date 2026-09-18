/**
 * ─── Every boss, priced like the first one ─────────────────────────────────
 *
 * The owner: "ALL bosses need to have the same adaptive difficulty as the stage
 * 1 boss, otherwise the player feels bored". Until 2026-09-18 only stages 1-5
 * were priced against the run; from stage 6 the authored curve took over with a
 * three-second "melt floor" under it, and measured, that curve had stopped
 * pricing anything — a summoner died in four seconds on every stage it was on,
 * and every deep boss sat on the floor.
 *
 * The depth band (`game/adaptive.ts`) is the replacement: the ladder rung the
 * run earned, stretched with depth, integrated against what the fight does to
 * the crowd, with the dials on the bar. This file replaces the melt floor's and
 * pins the five things that can each break without the others showing it:
 *
 *   THE TILING   every stage is priced by exactly one band;
 *   THE SHAPE    a better road buys a shorter fight at every depth, and depth
 *                only ever lengthens it, up to a cap;
 *   THE RUN      the bar follows the firepower that walked in, both ways;
 *   THE DIALS    the streak and the difficulty multiply the bar exactly, so a
 *                run of clears is still a harder fight;
 *   THE BOMB     a grenade is worth its seconds against any boss, and never the
 *                whole of one.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ADAPTIVE_RUNGS, BOSS_GRENADE_BAR_SHARE, BOSS_MIN_FIRE_SECONDS, DEPTH_BAND_STAGE,
  DEPTH_BAR_SWING, DEPTH_FIGHT_MUL_MAX, DEPTH_FULL_STAGE, HOPELESS_SLAM_MUL,
  adaptiveBigHitMul, adaptiveBossStage, bossFightSeconds, depthBandStage, depthFightMul
} from '@/game/adaptive'
import { challengeFactor } from '@/game/survival'
import { BOSS_BAR_DIALS_MAX } from '@/game/adaptive'
import { CHALLENGE_KEY } from '@/keys'
import { GRENADE_BASE_MULT, GRENADE_BOSS_BASE_MULT, grenadeBossMult } from '@/use/useUpgrades'

/** The grenade's multiplier at the top of its track (level 20: 6x on the road). */
const MAXED_GRENADE = 6

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

describe('the tiling: one price per stage', () => {
  it('starts exactly where the opening ladder stops', () => {
    expect(DEPTH_BAND_STAGE).toBe(6)
    for (let stage = 1; stage <= 120; stage++) {
      expect(adaptiveBossStage(stage) && depthBandStage(stage), `stage ${stage} is priced twice`)
        .toBe(false)
      expect(adaptiveBossStage(stage) || depthBandStage(stage), `stage ${stage} is priced by neither`)
        .toBe(true)
    }
  })
})

describe('the shape: shorter for a better road, longer for a deeper one', () => {
  it('leaves the opening five exactly as they were', () => {
    for (const stage of [1, 2, 3, 4, 5]) expect(depthFightMul(stage)).toBe(1)
  })

  it('only ever grows with depth, and stops growing at its cap', () => {
    let last = 1
    for (let stage = 1; stage <= 200; stage++) {
      const m = depthFightMul(stage)
      expect(m, `stage ${stage} got a shorter fight than stage ${stage - 1}`).toBeGreaterThanOrEqual(last)
      expect(m).toBeLessThanOrEqual(DEPTH_FIGHT_MUL_MAX + 1e-12)
      last = m
    }
    expect(depthFightMul(DEPTH_FULL_STAGE)).toBeCloseTo(DEPTH_FIGHT_MUL_MAX, 12)
    expect(depthFightMul(DEPTH_FULL_STAGE + 60)).toBeCloseTo(DEPTH_FIGHT_MUL_MAX, 12)
    // "A gentle rise", measured: stage 6 is within a tenth of stage 5, so the
    // first boss past the tutorial is not a new length of fight.
    expect(depthFightMul(DEPTH_BAND_STAGE)).toBeLessThan(1.1)
  })

  it('buys a shorter fight for a better road at every depth', () => {
    for (const stage of [6, 10, 15, 30, 60]) {
      const perfect = 1000
      let last = Number.POSITIVE_INFINITY
      for (let squad = 1; squad <= perfect; squad += 7) {
        const s = bossFightSeconds(stage, squad, perfect)
        expect(s, `stage ${stage}: ${squad} survivors earned a longer fight`).toBeLessThanOrEqual(last + 1e-12)
        last = s
      }
    }
  })

  it('names the fight lengths the brief asked for, at full depth', () => {
    // In seconds of FIRE: the top rung, the middle, the bottom. With two guard
    // phases, the walk-in and the dodging these are the ~7 / ~10 / ~13 s the
    // arena probe measures on a stopwatch — the middle one stage 1's own length.
    const [top, mid, , bottom] = ADAPTIVE_RUNGS
    expect(bossFightSeconds(40, 900, 1000)).toBeCloseTo(top!.seconds * DEPTH_FIGHT_MUL_MAX, 9)
    expect(bossFightSeconds(40, 450, 1000)).toBeCloseTo(mid!.seconds * DEPTH_FIGHT_MUL_MAX, 9)
    expect(bossFightSeconds(40, 5, 1000)).toBeCloseTo(bottom!.seconds * DEPTH_FIGHT_MUL_MAX, 9)
    // …and nobody past the tutorial is priced under the ladder's own top rung.
    for (let stage = DEPTH_BAND_STAGE; stage <= 60; stage++) {
      expect(bossFightSeconds(stage, 10_000, 1000)).toBeGreaterThanOrEqual(BOSS_MIN_FIRE_SECONDS)
    }
  })

  it('reads the run for the swing at every depth, not only on the opening five', () => {
    // `earlyBigHitMul` is 1 from stage 6, so this is the swing's whole reading
    // there: a crowd that arrived whole takes the authored share, one that
    // arrived gutted takes up to `HOPELESS_SLAM_MUL` of it.
    expect(adaptiveBigHitMul(1, 800, 1000)).toBe(1)
    expect(adaptiveBigHitMul(1, 5, 1000)).toBe(HOPELESS_SLAM_MUL)
    expect(adaptiveBigHitMul(1, 300, 1000)).toBeGreaterThan(1)
    // The bar is priced on the swing the ladder was calibrated against — the
    // beginner's discount's own number — and never on a heavier one.
    expect(DEPTH_BAR_SWING).toBeGreaterThan(0)
    expect(DEPTH_BAR_SWING).toBeLessThanOrEqual(1)
  })
})

/** A boss fight on `stage`, priced for a crowd of `squad` with `damage` extra. */
const bossAt = async (stage: number, squad: number, o: { damage?: number; challenge?: number } = {}) => {
  const { __resetTowerState, setStates } = await import('@/use/useTowerState')
  __resetTowerState()
  if (o.challenge) setStates({ [CHALLENGE_KEY]: o.challenge })
  const game = await import('@/use/useSurvivalGame')
  game.startStage(stage)
  game.debugSkipToArena()
  if (game.squadCount.value < squad) game.debugAddUnits(squad - game.squadCount.value)
  if (o.damage) game.debugAddDamage(o.damage)
  for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
  expect(game.phase.value, `stage ${stage} never reached the arena`).toBe('boss')
  const b = game.getBoss()!
  return {
    hp: b.maxHp,
    dps: game.squadCount.value * game.damage.value * game.runFireRate.value,
    squad: game.squadCount.value
  }
}

describe('the run: the bar follows the firepower that walked in', () => {
  it('doubles the bar for a crowd that hits twice as hard, at every depth', async () => {
    for (const stage of [6, 9, 13, 21, 33]) {
      const lo = await bossAt(stage, 200)
      const hi = await bossAt(stage, 200, { damage: 1 })
      expect(hi.dps / lo.dps, 'the premise: the second crowd hits harder').toBeGreaterThan(1.5)
      const r = hi.hp / lo.hp
      const want = hi.dps / lo.dps
      expect(r, `stage ${stage}: bar ${r.toFixed(2)}x for ${want.toFixed(2)}x the fire`)
        .toBeGreaterThan(want * 0.97)
      expect(r).toBeLessThan(want * 1.03)
    }
  })

  it('never hands a crowd of any size a bar of nothing, or a bar it cannot see move', async () => {
    // A claw and two meteors: kinds whose printed bar IS the fight. (The
    // summoner's is the fight less its wall, and the healer's less the heal it
    // is priced to give back — `bossHpMulFor`.)
    for (const stage of [8, 21, 41]) {
      for (const squad of [10, 60, 400]) {
        const f = await bossAt(stage, squad)
        // A real share of the top rung's worth of this crowd's fire, however
        // strong it is — the melt floor's promise, kept everywhere. A share and
        // not the whole: the bar is the damage the crowd lands in that time
        // while the boss is biting it (`expectedDamage`), not the seconds times
        // the damage it walked in with.
        expect(f.hp / Math.max(1, f.dps), `stage ${stage}, ${squad} survivors`)
          .toBeGreaterThan(BOSS_MIN_FIRE_SECONDS * 0.6)
      }
    }
  })
})

describe('the dials: a streak is still a harder fight', () => {
  it('multiplies the bar by exactly the (capped) handicap, whatever the depth', async () => {
    // Asserted against the FUNCTION, as the balance suite does, so the curve can
    // be retuned without chasing a literal. The crowd and the fire are the same
    // in both fights (debug-placed at the arena), so the ratio is the dial alone.
    for (const stage of [7, 10, 24]) {
      const cold = await bossAt(stage, 200)
      const hot = await bossAt(stage, 200, { challenge: 6 })
      expect(hot.dps, 'the premise: the same crowd walked in').toBeCloseTo(cold.dps, 6)
      // Capped at `BOSS_BAR_DIALS_MAX` — see its note: a streak multiplies the
      // FIGHT now that the bar follows the run, and uncapped it made sponges.
      expect(hot.hp / cold.hp, `stage ${stage}`)
        .toBeCloseTo(Math.min(challengeFactor(6), BOSS_BAR_DIALS_MAX), 2)
    }
  })
})

describe('the bomb: its seconds, never the whole boss', () => {
  it('caps a share of the bar, not the multiplier, so every level still counts', () => {
    expect(BOSS_GRENADE_BAR_SHARE).toBeGreaterThan(0.3)
    expect(BOSS_GRENADE_BAR_SHARE).toBeLessThan(1)
    // The multiplier itself is untouched: every level of the track is worth more
    // than the last against a boss.
    expect(grenadeBossMult(MAXED_GRENADE)).toBeGreaterThan(grenadeBossMult(GRENADE_BASE_MULT))
    expect(grenadeBossMult(GRENADE_BASE_MULT)).toBeCloseTo(GRENADE_BOSS_BASE_MULT, 9)
  })

  it('cannot delete the shortest fight the band hands out, but spends in full on a long one', () => {
    // A bar worth `seconds` of `squadDps`; a bomb worth `mult` of the same.
    const hit = (seconds: number, mult: number): number => Math.min(mult, seconds * BOSS_GRENADE_BAR_SHARE)
    const shortest = bossFightSeconds(DEPTH_BAND_STAGE, 10_000, 1000)
    const longest = bossFightSeconds(60, 1, 1000)
    const top = grenadeBossMult(MAXED_GRENADE)
    expect(hit(shortest, top) / shortest, 'a maxed bomb deleted the shortest fight').toBeLessThanOrEqual(BOSS_GRENADE_BAR_SHARE)
    expect(hit(longest, top), 'the cap bit a long fight').toBe(top)
  })

  it('lands its capped share through the simulation, and leaves a fight behind', async () => {
    const { __resetTowerState } = await import('@/use/useTowerState')
    __resetTowerState()
    const game = await import('@/use/useSurvivalGame')
    game.startStage(20)
    game.steerOnly.value = false
    game.debugSkipToArena()
    game.debugAddUnits(600)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    const b = game.getBoss()!
    // Past the walk-in, so the throw is in reach.
    for (let i = 0; i < 60; i++) { b.guarded = 99; game.step(STEP_MS) }
    const before = b.hp
    expect(game.throwGrenade(MAXED_GRENADE), 'the grenade would not throw at a boss').toBe(true)
    for (let i = 0; i < 90 && game.getGrenades().length > 0; i++) { b.guarded = 99; game.step(STEP_MS) }
    const took = before - b.hp
    expect(took, 'the grenade never reached the boss').toBeGreaterThan(0)
    expect(took / b.maxHp, 'one bomb took more than its capped share of the bar')
      .toBeLessThanOrEqual(BOSS_GRENADE_BAR_SHARE + 0.15)
    expect(b.dead, 'one bomb and a second of fire deleted a depth boss').toBe(false)
  })
})
