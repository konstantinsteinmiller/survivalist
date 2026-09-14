/**
 * ─── The opening is seventy seconds, and each part of it is load-bearing ────
 *
 * Stage 1 was a ~30 s round trip, cut that short because a 500-player Poki fit
 * test put 64 % of sessions under two minutes. What that reasoning missed is
 * WHERE the session ends: measured on the live build the median exit is ~35 s
 * in and lands right after the first boss dies. The exit is the climax, not the
 * road in front of it — so a shorter road moved the exit earlier rather than
 * removing it.
 *
 * The opening is now ~70 s, and the four numbers that make it are pinned here
 * because each one is a different way of losing the change:
 *
 *   THE ROAD       long enough to be seventy seconds, and re-cut into three
 *                  acts so it is not the same thirty seconds twice.
 *   TWO ELITES     one per half. The first carries the grenade lesson (it is
 *                  armed on the road's FIRST elite); the second is the same
 *                  fight with the grenade spent.
 *   THE ELITE      priced at `ELITE_FIRE_SECONDS` of the crowd's OWN fire,
 *                  read when it streams in — so it is beatable in about a
 *                  second and a half whoever turns up, and one-shottable by
 *                  nobody.
 *   THE BOSS       a floor of its own, because a first boss that falls over in
 *                  four seconds is what the player was leaving after.
 */
import { describe, expect, it } from 'vitest'
import {
  ADAPTIVE_FIRST_FIGHT_SECONDS, ADAPTIVE_MAX_SECONDS, ADAPTIVE_MIN_SECONDS,
  ELITE_FIRE_SECONDS, adaptiveEliteHp, adaptiveFloorSeconds, clampAdaptiveSeconds
} from '@/game/adaptive'
import { BASE_FIRE_RATE, STAGE_ONE_LENGTH, stageLength, stageSpeed } from '@/game/survival'
import { buildTrack } from '@/game/track'

describe('the road is long enough to be a session', () => {
  it('walks for about a minute before anything else is counted', () => {
    const walking = stageLength(1) / stageSpeed(1)
    expect(stageLength(1)).toBe(STAGE_ONE_LENGTH)
    // The boss (~7 s), two elites (~1.5 s each) and the slow-motion on every
    // gate pass are all on top of this, and together they land the round trip
    // at ~70 s — see `tests/sim/balance.test.ts`, which measures the whole
    // thing through the simulation rather than deriving it.
    expect(walking, `the road is ${walking.toFixed(1)}s of walking`).toBeGreaterThan(55)
    expect(walking, `the road is ${walking.toFixed(1)}s of walking`).toBeLessThan(70)
  })

  it('keeps introducing something for its whole length', () => {
    // The cheap way to make a stage twice as long is to double the road and
    // leave the beats where they were, which produces thirty seconds of game
    // and forty of walking. Every quarter of the road has to have something on
    // it that is not scenery.
    const { events, arenaY } = buildTrack(1)
    const interesting = events.filter((e) =>
      e.kind === 'gates' || e.kind === 'miniboss' || e.kind === 'foes' || e.kind === 'crates')
    for (let q = 0; q < 4; q++) {
      const from = arenaY * q / 4
      const to = arenaY * (q + 1) / 4
      const inQuarter = interesting.filter((e) => e.y >= from && e.y < to)
      expect(inQuarter.length, `nothing happens between ${Math.round(from)} and ${Math.round(to)}`)
        .toBeGreaterThan(1)
    }
  })
})

describe('two landmarks, one per half', () => {
  it('puts the first in the front half and the second near the end', () => {
    const { events, arenaY } = buildTrack(1)
    const ys = events.filter((e) => e.kind === 'miniboss').map((e) => e.y).sort((a, b) => a - b)
    expect(ys).toHaveLength(2)
    expect(ys[0]! / arenaY).toBeLessThan(0.5)
    expect(ys[1]! / arenaY).toBeGreaterThan(0.7)
    // Far enough apart to be two fights rather than one long one.
    expect(ys[1]! - ys[0]!, 'the two elites are on top of each other')
      .toBeGreaterThan(arenaY * 0.35)
  })

  it('leaves the swell between them, on the crowd they built', () => {
    // The multiplier is the beat the stage builds to, so it lands after the
    // first landmark and before the second — on the biggest crowd the road has
    // made, and not inside either elite's run-up.
    const { events, arenaY } = buildTrack(1)
    const elites = events.filter((e) => e.kind === 'miniboss').map((e) => e.y).sort((a, b) => a - b)
    const swell = events
      .filter((e) => e.kind === 'gates' && e.leaves.some((l) => l.op === 'mul'))
      .map((e) => e.y)
    expect(swell.length, 'stage 1 lost its multiplier').toBe(1)
    expect(swell[0]!).toBeGreaterThan(elites[0]!)
    expect(swell[0]!).toBeLessThan(elites[1]!)
    expect(swell[0]! / arenaY, 'the swell is no longer the beat the stage builds to')
      .toBeGreaterThan(0.6)
  })
})

describe('an elite is priced in seconds of the crowd it meets', () => {
  it('costs about a second and a half of fire, whoever turns up', () => {
    // The property an authored health number cannot have: the same fight for a
    // run with 30 dps and one with 3 000.
    for (const dps of [30, 120, 800, 3000]) {
      const hp = adaptiveEliteHp(dps)
      expect(hp / dps, `a ${dps} dps crowd fights it for ${(hp / dps).toFixed(2)}s`)
        .toBeCloseTo(ELITE_FIRE_SECONDS, 1)
    }
  })

  it('cannot be one-shotted, however big the crowd is', () => {
    // Falls out of the price rather than being bolted on: a bar quoted in
    // seconds of fire is, by construction, more than one volley of it. Checked
    // at the opening fire rate, which is the slowest the crowd ever shoots and
    // therefore the fewest volleys that second and a half can contain.
    for (const squad of [3, 40, 400, 4000]) {
      const perShot = squad * 1
      const dps = perShot * BASE_FIRE_RATE
      const volleys = adaptiveEliteHp(dps) / perShot
      expect(volleys, `a crowd of ${squad} kills it in ${volleys.toFixed(1)} volleys`)
        .toBeGreaterThan(1.5)
    }
  })

  it('still has a bar worth drawing when the crowd has nothing', () => {
    expect(adaptiveEliteHp(0)).toBeGreaterThanOrEqual(20)
    expect(adaptiveEliteHp(1)).toBeGreaterThanOrEqual(20)
  })
})

describe('the first boss has a floor the others do not', () => {
  it('is worth five seconds of fire at the very least', () => {
    expect(adaptiveFloorSeconds(1)).toBe(ADAPTIVE_FIRST_FIGHT_SECONDS)
    expect(ADAPTIVE_FIRST_FIGHT_SECONDS, 'the first fight no longer clears the brief')
      .toBeGreaterThanOrEqual(5)
    // Even a run that arrives with nothing gets the full first fight.
    expect(clampAdaptiveSeconds(0.1, 1)).toBe(ADAPTIVE_FIRST_FIGHT_SECONDS)
    expect(clampAdaptiveSeconds(3.0 * 0.35, 1)).toBe(ADAPTIVE_FIRST_FIGHT_SECONDS)
  })

  it('does not raise the floor anywhere else, or lift the ceiling anywhere', () => {
    // The anti-melt floor is the right one for a stage the player has already
    // decided to be on; this is only about the fight the session is decided on.
    for (const stage of [2, 3, 4, 5, 9]) {
      expect(adaptiveFloorSeconds(stage)).toBe(ADAPTIVE_MIN_SECONDS)
      expect(clampAdaptiveSeconds(0.1, stage)).toBe(ADAPTIVE_MIN_SECONDS)
    }
    // A hopeless crowd is not handed a longer fight just because it is first.
    expect(clampAdaptiveSeconds(6.8 * 12.7, 1)).toBe(ADAPTIVE_MAX_SECONDS)
  })
})
