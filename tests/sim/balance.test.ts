/**
 * ─── The difficulty curve, locked in ────────────────────────────────────────
 *
 * The long study in `study.test.ts` produces the tables; THIS file is the part
 * that has to keep passing. It is deliberately tiny — a handful of seeds, a few
 * seconds — because a regression test that takes four minutes is a regression
 * test somebody eventually deletes.
 *
 * It guards the two ends of the curve, which are the two things a tuning pass
 * is most likely to break in opposite directions:
 *
 *   THE FLOOR   — stage 1 must not punish a player who has not yet worked out
 *                 that the screen does anything. A first session that ends
 *                 eleven seconds in ends the install.
 *   THE CEILING — `optimal` must clear stages 1–5. If the benchmark player
 *                 cannot finish the hand-authored stages, no tuning of the
 *                 procedural ones downstream means anything.
 *
 * And one thing in between: playing well has to beat playing badly, on every
 * stage. That is the whole brief ("punish players for not playing the optimal
 * path") reduced to something a test can check. It is asserted on DPS AT THE
 * BOSS rather than on peak squad, because peak squad turns out to be nearly
 * flat across policies on stages 1–4 (see the report) — the spread lives
 * entirely in damage and fire rate, which is to say in the crates.
 *
 * Run it: `npx vitest run tests/sim/balance.test.ts`
 */

import { describe, expect, it } from 'vitest'
import { aggregate, loadGame, median, runOne, runSamples } from './harness'
import { average, careless, good, optimal } from './policies'
import { probeStage, runCareer } from './career'
import { cheapest, value } from './shop'

/** Three seeds catches a curve that moved and is cheap enough for every commit.
 *  The study uses twenty. */
const SEEDS = 3

describe('the floor: stage 1 must not punish a player who does nothing', () => {
  it('lets a careless run reach the boss arena on every seed', async () => {
    await loadGame()
    const rs = await runSamples(1, careless, SEEDS)
    const reached = rs.filter((r) => r.bossReached).length
    expect(
      reached,
      `stage 1 must be survivable without steering — only ${reached}/${rs.length} runs reached the arena, ` +
        `median death at ${Math.round(median(rs.map((r) => r.progress01)) * 100)} % of the road`
    ).toBe(rs.length)
  }, 120_000)

  it('does not make stage 1 impossible to lose either', async () => {
    // A stage nobody can lose teaches nothing. The careless run has to arrive
    // at the arena visibly poorer than a played one and must not walk out with
    // the stage cleared for free.
    const sloppy = aggregate(await runSamples(1, careless, SEEDS))
    const careful = aggregate(await runSamples(1, optimal, SEEDS))
    expect(sloppy.clearRate, 'stage 1 is impossible to lose, which is its own failure').toBeLessThan(1)
    expect(sloppy.dpsAtBoss.med, 'a careless run arrives at the boss as strong as a played one')
      .toBeLessThan(careful.dpsAtBoss.med)
  }, 120_000)

  /**
   * RESOLVED — as a design decision, not as a fix.
   *
   * `careless` does not steer at all: it holds the centre line for the whole
   * stage, eats every pillar, collects nothing, and arrives at the boss with
   * ~14 survivors at 34 DPS. It reaches the arena on every seed (asserted
   * above) and then loses, on every seed.
   *
   * That is the intended floor. The game's one instruction is "tap to move",
   * and a run that never obeys it should not clear a stage — the retention
   * question is whether a player who taps BADLY can, and `average` (250 ms
   * reaction latency, aims at the nearest leaf rather than the best one, clips
   * pillars) clears stage 1 on 100 % of seeds.
   *
   * Locked as an assertion so that a future difficulty pass cannot quietly make
   * the game playable without input.
   */
  it('zero-input play reaches the stage-1 boss and loses to it', async () => {
    const rs = aggregate(await runSamples(1, careless, SEEDS))
    expect(rs.clearRate, 'stage 1 became winnable without touching the screen').toBe(0)
    expect(rs.deathProgress.med, 'a run that never steers should still SEE the boss')
      .toBeGreaterThan(0.9)
  }, 120_000)
})

describe('the ceiling: the benchmark player clears the authored stages', () => {
  for (const stage of [1, 2, 3, 4, 5]) {
    it(`clears stage ${stage} on every seed`, async () => {
      const a = aggregate(await runSamples(stage, optimal, SEEDS))
      expect(
        a.clearRate,
        `optimal failed stage ${stage}: died at ${Math.round(a.deathProgress.med * 100)} % of the road, ` +
          `top causes ${a.deaths.slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ')}`
      ).toBe(1)
    }, 120_000)
  }
})

describe('the order: playing well beats playing badly', () => {
  it('reaches the boss stronger the better the run was played', async () => {
    for (const stage of [1, 3, 5]) {
      const best = aggregate(await runSamples(stage, optimal, SEEDS))
      const mid = aggregate(await runSamples(stage, average, SEEDS))
      expect(
        best.dpsAtBoss.med,
        `stage ${stage}: optimal reaches the boss no stronger than average — the crates stopped mattering`
      ).toBeGreaterThan(mid.dpsAtBoss.med)
    }
  }, 300_000)

  it('builds a bigger crowd for a player who steers than for one who does not', async () => {
    // Stage 1 is excluded on purpose — see the known gap below.
    for (const stage of [2, 3, 5]) {
      const mid = aggregate(await runSamples(stage, average, SEEDS))
      const worst = aggregate(await runSamples(stage, careless, SEEDS))
      expect(mid.peakSquad.med, `stage ${stage}: average did not out-build careless`)
        .toBeGreaterThan(worst.peakSquad.med)
    }
  }, 300_000)

  /**
   * CLOSED — and locked.
   *
   * This was a real gap: holding the centre line used to out-build every other
   * policy on stage 1 (36 survivors against optimal's 26), because both leaves
   * of a bank were scored independently by whoever stood inside their own
   * half-width, so a crowd parked on the pillar collected BOTH. The first stage
   * in the game was teaching that the centre line is the greedy line — the
   * exact opposite of the mechanic.
   *
   * Two changes fixed it: stage 1's opening gate is now a single lane-wide
   * door (no pillar, nothing to straddle, no wrong lesson), and an `add` leaf
   * now pays its value scaled by the FRACTION of the crowd that came through
   * it — so straddling splits the payout instead of doubling it, and the pillar
   * bills you on top.
   */
  it('straddling the pillar never out-builds committing to a leaf', async () => {
    const straddler = aggregate(await runSamples(1, careless, SEEDS))
    const committer = aggregate(await runSamples(1, optimal, SEEDS))
    expect(straddler.peakSquad.med).toBeLessThan(committer.peakSquad.med)
  }, 120_000)
})

/**
 * ─── The career ─────────────────────────────────────────────────────────────
 *
 * A stage's clear rate on a wiped save is a number about a situation nobody is
 * ever in. These guard the thing the player actually experiences: stage 1 with
 * nothing, then everything that follows, carrying coins, upgrade levels, the
 * challenge streak and the failure record forward the whole way.
 *
 * Deliberately short careers (twelve stages, one seed) — the full thirty-stage
 * matrix lives behind `SIM_STUDY`, and a regression that takes six minutes is a
 * regression somebody eventually deletes.
 */
describe('the career: the save carried forward', () => {
  it('gets a competent player with a sane shop to stage 12 without a wall', async () => {
    const c = await runCareer({ policy: good, strategy: cheapest, seed: 5000, lastStage: 12 })
    expect(
      c.reached,
      `a good player stalled at stage ${c.stuckAt} — ` +
        `levels ${JSON.stringify(c.finalLevels)}, ${c.totalAttempts} attempts, ${c.totalEarned} coins earned`
    ).toBe(12)
    // One attempt per stage is the floor of "no wall". The ceiling was 2 and is
    // now 3, and that is a DELIBERATE loosening rather than a tuning failure:
    // the road was explicitly made harder (gun range, sweeping elites, `-N`
    // doors, dilemma banks) because the game was too easy to read, and one
    // stage in twelve costing a competent player a third go is what "harder"
    // looks like from inside this metric. Four would not be — that is a stage
    // being re-learned, not retried.
    expect(Math.max(...c.stages.map((s) => s.attempts)), 'a stage took a good player more than three goes')
      .toBeLessThanOrEqual(3)
    // …and the career as a whole must not become a grind: twelve stages, and a
    // competent player should not be spending twice that in attempts.
    expect(c.totalAttempts, 'the career turned into a retry grind').toBeLessThanOrEqual(24)
  }, 120_000)

  it('does not let a player who never steers buy their way past stage 1', async () => {
    const c = await runCareer({ policy: careless, strategy: cheapest, seed: 5000, lastStage: 6 })
    expect(c.reached, 'zero-input play became a viable career with a shop behind it').toBe(0)
    expect(c.stuckAt).toBe(1)
  }, 120_000)

  it('spends what it earns: a career actually reaches the shop', async () => {
    // Guards the plumbing, not the balance. If `applyUpgrade` ever stops moving
    // the levels the sim reads — the Vue `watch` in `useUpgrades` is async, and
    // an `await` in the wrong place would do it — every career table above
    // silently becomes a no-shop table.
    const c = await runCareer({ policy: good, strategy: value(), seed: 5000, lastStage: 8 })
    const bought = Object.values(c.finalLevels).reduce((a, b) => a + b, 0)
    expect(bought, 'a career reached stage 8 without buying a single upgrade').toBeGreaterThan(3)
    expect(c.totalSpent).toBeGreaterThan(0)
    expect(c.totalSpent + c.finalWallet).toBe(c.totalEarned)
  }, 120_000)
})

describe('the autobalancer', () => {
  it('makes a streak of clears measurably harder', async () => {
    const seeds = [1000, 8919, 16838]
    // The build is sized to the STREAK it is being asked about. A player on a
    // twelve-clear run has, by definition, been winning for twelve stages and
    // has spent the coins; probing that with a four-level build measures a
    // player who does not exist, and since the road got its teeth (limited gun
    // range, sweeping elites, `-N` doors) such a player no longer reaches the
    // stage-10 boss at all — which silently turned this into a comparison
    // against zero.
    const levels = { squad: 15, power: 11, rate: 12 }
    const fresh = await probeStage({ stage: 10, policy: good, levels, seeds, challenge: 0 })
    const hot = await probeStage({ stage: 10, policy: good, levels, seeds, challenge: 12 })
    expect(median(fresh.map((r) => r.bossHp)), 'the cold probe never reached the boss')
      .toBeGreaterThan(0)
    expect(median(hot.map((r) => r.bossHp)), 'the streak probe never reached the boss')
      .toBeGreaterThan(0)
    // Asserted against the FUNCTION, not a snapshot of its output: the step was
    // 0.055 when this was written and is 0.13 now, and a literal here would
    // have to be chased every time the curve is tuned.
    const { challengeFactor } = await import('@/game/survival')
    expect(median(hot.map((r) => r.bossHp)) / median(fresh.map((r) => r.bossHp)))
      .toBeCloseTo(challengeFactor(12), 1)
    expect(
      median(hot.map((r) => r.lost)),
      'a twelve-clear streak cost the player no more survivors than a cold start'
    ).toBeGreaterThanOrEqual(median(fresh.map((r) => r.lost)))
  }, 120_000)

  it('escalates the relief for a player who keeps losing the same stage', async () => {
    // Every failure must buy a strictly softer stage, or the escalation is
    // decoration. Asserted on enemy health, which is the thing it moves.
    //
    // The probe is given a real build on purpose. `bossHp` is recorded when the
    // boss actually spawns and stays 0 otherwise, so the measurement needs a run
    // that REACHES the climax — and since the miniboss started sweeping (a fifth
    // of the squad every 1.5 s), an unupgraded `good` run at stage 10 no longer
    // does. That is the difficulty change working, not the relief failing, but
    // it silently turned this assertion into a comparison against zero.
    const seeds = [1000]
    const levels = { squad: 4, power: 4, rate: 2 }
    const hp: number[] = []
    for (const failures of [0, 1, 2, 3]) {
      const rs = await probeStage({ stage: 10, policy: good, levels, seeds, failures })
      expect(rs[0]!.bossHp, `the stage-10 probe never reached the boss at ${failures} failures`)
        .toBeGreaterThan(0)
      hp.push(rs[0]!.bossHp)
    }
    for (let i = 1; i < hp.length; i++) {
      expect(hp[i]!, `failure ${i} did not soften stage 10 (${hp.join(' → ')})`).toBeLessThan(hp[i - 1]!)
    }
  }, 120_000)
})

/**
 * ─── Two findings, measured broken and now fixed ────────────────────────────
 *
 * These shipped as `it.fails` locks — a test that passes only while the thing
 * it asserts is FALSE — precisely so that the day somebody fixed the curve,
 * vitest would say "expected to fail but passed" and hand them the invariant
 * instead of letting them discover it by accident six months later.
 *
 * That is exactly what happened. Both are now real assertions.
 */
describe('the two invariants the career study broke', () => {
  it('the end boss survives long enough to swing at least once', async () => {
    // `slamCd` starts at 2.6 s, so a boss that dies faster than that never
    // attacks — and the climax of every stage past ~8 used to be a body that
    // fell over before it moved (measured at 0.9 s for a mid-career build).
    // Fixed by reshaping `bossHpScale`: flat over stages 1–4, ×1.55 a stage
    // over 5–12 where the player's compounding runs away, then the original
    // linear slope, which measurement showed was already right past twelve.
    const rs = await probeStage({
      stage: 12,
      // Probe the player this test is ABOUT. Eleven clears into a streak on
      // stage 12 describes someone who has been winning for eleven stages, and
      // the career study says such a player finishes on s15/p11/r12 — not the
      // s6/p7/r5 this used to ask about. The under-built version stopped
      // reaching the stage-12 boss when the road got its teeth (gun range,
      // sweeping elites, `-N` doors), which quietly turned a boss-pacing
      // assertion into a statement about a build nobody has.
      policy: optimal,
      levels: { squad: 15, power: 11, rate: 12, scavenge: 8 },
      seeds: [1000, 8919, 16838],
      challenge: 11
    })
    const ttk = rs.filter((r) => r.bossSeconds != null).map((r) => r.bossSeconds!)
    expect(ttk.length, 'no probe reached the stage-12 boss').toBeGreaterThan(0)
    expect(median(ttk)).toBeGreaterThanOrEqual(2.6)
  }, 120_000)

  it('a gate pays the number printed on it', async () => {
    // `claimBank` spawns `min(gain, MAX_SQUAD − squad)` and says nothing, so a
    // squad at the ceiling turns every door into a lie. It started at stage 12
    // and by stage 18 a good run collected two thirds of what was promised —
    // regressive, because the better the run the sooner it capped. Fixed by
    // raising `MAX_SQUAD` past what a thirty-stage career can reach.
    const rs = await probeStage({
      stage: 18,
      policy: good,
      levels: { squad: 9, power: 10, rate: 7, scavenge: 9 },
      seeds: [1000, 8919, 16838],
      challenge: 12
    })
    const paid = median(rs.map((r) => (r.gatePromised > 0 ? r.gateDelivered / r.gatePromised : 1)))
    expect(paid).toBeGreaterThan(0.98)
  }, 120_000)
})

describe('the harness itself', () => {
  it('replays a run exactly from its seed', async () => {
    const a = await runOne({ stage: 3, policy: optimal, seed: 4242 })
    const b = await runOne({ stage: 3, policy: optimal, seed: 4242 })
    expect(b.peakSquad).toBe(a.peakSquad)
    expect(b.finalSquad).toBe(a.finalSquad)
    expect(b.seconds).toBe(a.seconds)
    expect(b.deaths).toEqual(a.deaths)
  }, 60_000)

  it('never lets a policy mutate the world it is shown', async () => {
    // A policy that wrote to an entity would make every number in the study a
    // lie, and the failure would be silent. Cheapest possible guard: the world
    // must be byte-identical either side of a `decide()`.
    const game = await loadGame()
    game.startStage(2)
    for (let i = 0; i < 240; i++) game.step(1000 / 60)

    const snapshot = (): string =>
      JSON.stringify({
        gates: game.getGates(),
        crates: game.getCrates(),
        barricades: game.getBarricades(),
        foes: game.getFoes(),
        squad: game.squadCount.value
      })

    const before = snapshot()
    optimal.reset(1)
    optimal.decide({
      stage: 2,
      phase: 'run',
      t: 4,
      speed: 5.21,
      anchorX: game.anchor().x,
      anchorY: game.anchor().y,
      squad: game.squadCount.value,
      crowdR: game.crowdRadius(),
      damage: game.damage.value,
      fireRate: game.runFireRate.value,
      dps: game.squadCount.value * game.damage.value * game.runFireRate.value,
      gates: game.getGates(),
      dividers: game.getDividers(),
      crates: game.getCrates(),
      barricades: game.getBarricades(),
      foes: game.getFoes(),
      pickups: game.getPickups(),
      boss: game.getBoss()
    })
    expect(snapshot()).toBe(before)
  }, 60_000)
})
