/**
 * ─── The long study ─────────────────────────────────────────────────────────
 *
 * NOT part of the default suite. `npx vitest run` skips every block in this
 * file; it only executes when `SIM_STUDY` is set:
 *
 *     SIM_STUDY=1 npx vitest run tests/sim/study.test.ts                 (20 samples)
 *     SIM_STUDY=1 SIM_SAMPLES=40 npx vitest run tests/sim/study.test.ts  (more)
 *
 * PowerShell:  $env:SIM_STUDY=1; npx vitest run tests/sim/study.test.ts
 *
 * It asserts almost nothing — it PRINTS. Every table it emits is pasted, as
 * emitted, into `tests/sim/REPORT.md`; the regression that actually guards the
 * curve is `tests/sim/balance.test.ts`, which is small and fast and does run by
 * default.
 */

import { appendFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  aggregate,
  loadGame,
  mdTable,
  median,
  n1,
  n2,
  pct,
  probe,
  range,
  runOne,
  runSamples,
  type RunResult
} from './harness'
import { POLICIES, average, careless, good, optimal, trailFollower } from './policies'

const RUN = Boolean(process.env.SIM_STUDY)
const SAMPLES = Number(process.env.SIM_SAMPLES ?? 20)
const STAGES = [1, 2, 3, 4, 5]

/**
 * Print a block of the report.
 *
 * Also appends to `SIM_OUT` when it is set, because vitest owns stdout and a
 * forty-row markdown table survives a pipe far better than it survives a
 * reporter. `SIM_OUT` is how the tables in `REPORT.md` were produced.
 */
const say = (s: string): void => {
  console.log(s)
  const out = process.env.SIM_OUT
  if (out) appendFileSync(out, `${s}\n`, 'utf8')
}

describe.skipIf(!RUN)('stages 1–5, five scripted players', () => {
  // Every number in this file is only meaningful against the constants it was
  // measured with, and those constants move under a tuning pass. So the study
  // stamps them first — paste this block at the top of the report and the
  // tables below can never be read against the wrong build.
  it('stamps the constants every table below was measured against', async () => {
    const s = await import('@/game/survival')
    const t = await import('@/game/track')
    const f = await import('@/game/foes')
    const rows: string[][] = [
      ['START_SQUAD', String(s.START_SQUAD)],
      ['CROWD_MAX_R / UNIT_R', `${s.CROWD_MAX_R} / ${s.UNIT_R}`],
      ['BASE_DAMAGE / BASE_FIRE_RATE', `${s.BASE_DAMAGE} / ${s.BASE_FIRE_RATE}`],
      ['CRATE_DAMAGE_GAIN / CRATE_RATE_GAIN', `${s.CRATE_DAMAGE_GAIN} / ${s.CRATE_RATE_GAIN}`],
      ['GATE_TICK_MS', String(s.GATE_TICK_MS)],
      ['GATE_LEAF_X / GATE_LEAF_HALF / DIVIDER_HALF_W', `${s.GATE_LEAF_X} / ${s.GATE_LEAF_HALF} / ${s.DIVIDER_HALF_W}`],
      ['BOSS_BASE_HP', String(s.BOSS_BASE_HP)],
      ['RETRY_HP_RELIEF', String(s.RETRY_HP_RELIEF)],
      ['MIN_RUN_GAP', String(t.MIN_RUN_GAP)],
      ['MIN_RATE_CRATES / MIN_DAMAGE_CRATES', `${t.MIN_RATE_CRATES} / ${t.MIN_DAMAGE_CRATES}`],
      ['MINIBOSS_BOSS_FRACTION', String(t.MINIBOSS_BOSS_FRACTION)],
      ['CRATE_DETOUR_X', String(t.CRATE_DETOUR_X)],
      ['gateAddBase(1..5)', [1, 2, 3, 4, 5].map((n) => t.gateAddBase(n)).join(', ')],
      ['crateHp rate(1..5)', [1, 2, 3, 4, 5].map((n) => t.crateHp(n, 'rate')).join(', ')],
      ['barricadeHp(1..5)', [1, 2, 3, 4, 5].map((n) => t.barricadeHp(n)).join(', ')],
      ['foeHpScale(1..5)', [1, 2, 3, 4, 5].map((n) => n2(f.foeHpScale(n))).join(', ')],
      ['bossHpScale(1..5)', [1, 2, 3, 4, 5].map((n) => n2(f.bossHpScale(n))).join(', ')],
      ['SLAM_TELEGRAPH', String((await import('@/use/useSurvivalGame')).SLAM_TELEGRAPH)]
    ]
    say('\n### Constants this study was measured against\n')
    say(mdTable(['constant', 'value'], rows))
    expect(rows.length).toBeGreaterThan(10)
  })

  it(`runs ${SAMPLES} samples per (stage × policy) and prints the tables`, async () => {
    await loadGame()
    const all = new Map<string, RunResult[]>()

    for (const stage of STAGES) {
      for (const p of POLICIES) {
        all.set(`${stage}:${p.id}`, await runSamples(stage, p, SAMPLES))
      }
    }

    const get = (stage: number, id: string): RunResult[] => all.get(`${stage}:${id}`) ?? []

    // ── 1. The headline: who clears what ────────────────────────────────────
    say('\n### Clear rate\n')
    say(
      mdTable(
        ['stage', ...POLICIES.map((p) => p.id)],
        STAGES.map((s) => [
          String(s),
          ...POLICIES.map((p) => pct(aggregate(get(s, p.id)).clearRate))
        ])
      )
    )

    // ── 2. Where the failures happen ────────────────────────────────────────
    say('\n### Where a failed run died (median progress, and to what)\n')
    say(
      mdTable(
        ['stage', 'policy', 'clear', 'died at', 'top causes'],
        STAGES.flatMap((s) =>
          POLICIES.map((p) => {
            const a = aggregate(get(s, p.id))
            const causes = a.deaths
              .slice(0, 3)
              .map(([k, v]) => `${k} ${v}`)
              .join(', ')
            return [
              String(s),
              p.id,
              pct(a.clearRate),
              a.clearRate === 1 ? '—' : pct(a.deathProgress.med),
              causes || '—'
            ]
          })
        )
      )
    )

    // ── 3. The run's own arc ────────────────────────────────────────────────
    say('\n### The run, per policy (median, min–max over samples)\n')
    say(
      mdTable(
        ['stage', 'policy', 'secs', 'peak squad', 'final squad', 'damage', 'fire rate', 'rate crates', 'dmg crates'],
        STAGES.flatMap((s) =>
          POLICIES.map((p) => {
            const a = aggregate(get(s, p.id))
            const rs = get(s, p.id)
            const avail = rs[0]
            return [
              String(s),
              p.id,
              range(a.seconds),
              range(a.peakSquad, (v) => String(Math.round(v))),
              range(a.finalSquad, (v) => String(Math.round(v))),
              range(a.damage, (v) => String(Math.round(v))),
              range(a.fireRate, n2),
              `${n1(a.rateCrates.med)}/${avail?.rateCratesOnStage ?? 0}`,
              `${n1(a.damageCrates.med)}/${avail?.damageCratesOnStage ?? 0}`
            ]
          })
        )
      )
    )

    // ── 4. The boss ─────────────────────────────────────────────────────────
    say('\n### The boss fight (only runs that reached it)\n')
    say(
      mdTable(
        ['stage', 'policy', 'reached', 'boss hp', 'squad at boss', 'DPS at boss', 'boss TTK s', 'survived', 'squad lost'],
        STAGES.flatMap((s) =>
          POLICIES.map((p) => {
            const a = aggregate(get(s, p.id))
            if (a.bossReachRate === 0) return [String(s), p.id, '0%', '—', '—', '—', '—', '—', '—']
            return [
              String(s),
              p.id,
              pct(a.bossReachRate),
              String(Math.round(a.bossHp)),
              range(a.squadAtBoss, (v) => String(Math.round(v))),
              range(a.dpsAtBoss, (v) => String(Math.round(v))),
              a.bossSeconds.med > 0 ? range(a.bossSeconds) : '—',
              pct(a.bossSurvivedRate),
              range(a.squadLostToBoss, (v) => String(Math.round(v)))
            ]
          })
        )
      )
    )

    // ── 4b. The slam: is the boss fat, or is the telegraph short? ───────────
    say('\n### Boss slams: thrown vs connected\n')
    say(
      mdTable(
        ['stage', 'policy', 'slams thrown (med)', 'connected', 'hit rate', 'survivors lost'],
        STAGES.flatMap((s) =>
          POLICIES.map((p) => {
            const rs = get(s, p.id).filter((r) => r.bossReached)
            if (rs.length === 0) return [String(s), p.id, '—', '—', '—', '—']
            const a = aggregate(get(s, p.id))
            return [
              String(s),
              p.id,
              n1(median(rs.map((r) => r.slamsThrown))),
              n1(median(rs.map((r) => r.slamsConnected))),
              pct(a.slamHitRate),
              n1(median(rs.map((r) => r.deaths.slam)))
            ]
          })
        )
      )
    )

    // ── 4c. The run's arc: does fire rate arrive in time? ───────────────────
    say('\n### The arc of a run — squad / damage / fire rate at ¼, ½, ¾ of the road\n')
    say(
      mdTable(
        ['stage', 'policy', '¼ squad·dmg·rate (dps)', '½', '¾'],
        STAGES.flatMap((s) =>
          [optimal, good, average].map((p) => {
            const rs = get(s, p.id)
            const at = (i: number): string => {
              const rows = rs.map((r) => r.arc[i]).filter(Boolean)
              if (rows.length === 0) return '—'
              return (
                `${Math.round(median(rows.map((x) => x!.squad)))}·` +
                `${Math.round(median(rows.map((x) => x!.damage)))}·` +
                `${n2(median(rows.map((x) => x!.fireRate)))} ` +
                `(${Math.round(median(rows.map((x) => x!.dps)))})`
              )
            }
            return [String(s), p.id, at(0), at(1), at(2)]
          })
        )
      )
    )

    // ── 5. The miniboss ─────────────────────────────────────────────────────
    say('\n### The miniboss (stages 2+; one per stage below 6)\n')
    say(
      mdTable(
        ['stage', 'policy', 'fight s', 'squad lost', 'vs boss TTK'],
        STAGES.filter((s) => s >= 2).flatMap((s) =>
          POLICIES.map((p) => {
            const a = aggregate(get(s, p.id))
            const ratio =
              a.bossSeconds.med > 0 && a.eliteSeconds.med > 0
                ? `${Math.round((a.eliteSeconds.med / a.bossSeconds.med) * 100)}%`
                : '—'
            return [
              String(s),
              p.id,
              a.eliteSeconds.med > 0 ? range(a.eliteSeconds) : '—',
              range(a.squadLostToElite, (v) => String(Math.round(v))),
              ratio
            ]
          })
        )
      )
    )

    // ── 6. The pillar tax ───────────────────────────────────────────────────
    say('\n### Survivors lost to the gate pillar, per bank crossed\n')
    say(
      mdTable(
        ['stage', ...POLICIES.map((p) => p.id)],
        STAGES.map((s) => [
          String(s),
          ...POLICIES.map((p) => {
            const a = aggregate(get(s, p.id))
            return n2(a.dividerPerBank.med)
          })
        ])
      )
    )

    // ── 7. The spread between policies ──────────────────────────────────────
    say('\n### The gap the owner asked for (optimal vs the rest)\n')
    say(
      mdTable(
        ['stage', 'optimal peak', 'good', 'average', 'careless', 'trail', 'optimal/average'],
        STAGES.map((s) => {
          const o = aggregate(get(s, 'optimal')).peakSquad.med
          const cell = (id: string): string => String(Math.round(aggregate(get(s, id)).peakSquad.med))
          const av = aggregate(get(s, 'average')).peakSquad.med
          return [
            String(s),
            String(Math.round(o)),
            cell('good'),
            cell('average'),
            cell('careless'),
            cell('trail'),
            av > 0 ? `${n1(o / av)}×` : '∞'
          ]
        })
      )
    )

    expect(all.size).toBe(STAGES.length * POLICIES.length)
  }, 900_000)

  // ── Question 6: does the retry relief actually flip a stage? ──────────────
  it('measures RETRY_HP_RELIEF: fail once, then run the same stage again', async () => {
    await loadGame()
    const rows: string[][] = []
    for (const stage of STAGES) {
      for (const p of [average, good, trailFollower]) {
        const cold = aggregate(await runSamples(stage, p, SAMPLES))
        const warm = aggregate(await runSamples(stage, p, SAMPLES, { relief: true }))
        rows.push([
          String(stage),
          p.id,
          pct(cold.clearRate),
          pct(warm.clearRate),
          `${pct(warm.clearRate - cold.clearRate)}`,
          `${Math.round(cold.peakSquad.med)} → ${Math.round(warm.peakSquad.med)}`
        ])
      }
    }
    say('\n### RETRY_HP_RELIEF = 0.8 — clear rate before and after a first failure\n')
    say(mdTable(['stage', 'policy', 'first try', 'after relief', 'Δ', 'peak squad'], rows))
    expect(rows.length).toBeGreaterThan(0)
  }, 900_000)

  // ── Question 7 in isolation: what the pillar costs a big crowd ────────────
  //
  // MEASURED, not modelled. Stage 1's SECOND bank (y = 84) is the cleanest
  // laboratory in the game: a real pillar, two honest `add` leaves, and — with
  // the probe's overwhelming firepower — nothing else on the road that can take
  // a survivor. Put a squad of a known size on a known line, run past it, and
  // read `deaths.divider`. (The opening bank at y = 15 is the `teaching` one
  // and now emits no pillar at all, so it measures nothing.)
  it('measures the pillar tax: survivors lost per bank, by aim and crowd size', async () => {
    const { safeLeafAnchor, DIVIDER_KILL_HALF } = await import('./policies')
    const { GATE_LEAF_HALF, GATE_LEAF_X, CROWD_MAX_R, DIVIDER_HALF_W } = await import("@/game/survival")
    // `safeLeafAnchor` reads the bank's LIVE pillars now (three-leaf banks have
    // two of them), so the probe hands it the two-leaf layout it is measuring:
    // one pillar, dead centre, still standing.
    const safe = safeLeafAnchor(
      { x: GATE_LEAF_X, halfW: GATE_LEAF_HALF, bankId: 1 } as never,
      { dividers: [{ bankId: 1, x: 0, halfW: DIVIDER_HALF_W, dismissed: false }] } as never
    )
    // The whole band of anchor positions that clears the pillar AND keeps the
    // crowd inside the leaf. Its width is the aiming tolerance the player gets.
    const lo = DIVIDER_KILL_HALF + CROWD_MAX_R
    const hi = GATE_LEAF_X + GATE_LEAF_HALF - CROWD_MAX_R

    const lines: Array<[string, number]> = [
      ['centre 0.00', 0],
      ['1.60', 1.6],
      ['2.00', 2.0],
      [`painted ${GATE_LEAF_X.toFixed(2)}`, GATE_LEAF_X],
      [`safe ${safe.toFixed(2)}`, safe],
      ['3.00', 3.0]
    ]
    const rows: string[][] = []
    for (const squad of [6, 20, 60, 150]) {
      const r = Math.min(CROWD_MAX_R, 0.33 * Math.sqrt(squad))
      const cells: string[] = []
      for (const [, x] of lines) {
        const runs = await Promise.all(
          [11, 23, 37].map((seed) =>
            probe({
              stage: 1,
              seed,
              squad,
              damage: 400,
              fireRate: 4,
              steer: () => x,
              untilY: 90,
              maxSeconds: 30
            })
          )
        )
        cells.push(n1(median(runs.map((p) => p.deaths.divider))))
      }
      rows.push([String(squad), n2(r), ...cells])
    }
    say(
      `\n### The pillar tax, MEASURED at stage 1's second bank (survivors lost, median of 3 seeds)\n` +
        `\nContact strip is |x| ≤ ${n2(DIVIDER_KILL_HALF)}; crowd radius caps at ${CROWD_MAX_R}; ` +
        `painted leaf centre ${GATE_LEAF_X}, safe line ${n2(safe)}. ` +
        `The band that clears the pillar and keeps the whole crowd inside the leaf is ` +
        `[${n2(lo)}, ${n2(hi)}] — ${n2(Math.max(0, hi - lo))} units of aiming tolerance.\n`
    )
    say(mdTable(['squad', 'crowd r', ...lines.map(([label]) => label)], rows))
    expect(rows.length).toBe(4)
  }, 300_000)

  // ── Is the boss slam a skill test or a reflex cliff? ─────────────────────
  //
  // Same policy, same routing, same everything — only the thumb changes. If the
  // hit rate goes from 0 % to ~80 % across 100 ms of human variation, the
  // telegraph is not a difficulty knob, it is a coin toss with a stopwatch.
  it('sweeps reaction latency against the boss slam', async () => {
    const { goodWithLatency } = await import('./policies')
    const rows: string[][] = []
    for (const ms of [0, 100, 150, 200, 250, 300, 400]) {
      const p = goodWithLatency(ms)
      const rs = await runSamples(2, p, Math.max(3, Math.round(SAMPLES / 2)))
      const a = aggregate(rs)
      const reached = rs.filter((r) => r.bossReached)
      rows.push([
        `${ms} ms`,
        pct(a.clearRate),
        pct(a.slamHitRate),
        n1(median(reached.map((r) => r.deaths.slam))),
        a.bossSeconds.med > 0 ? n1(a.bossSeconds.med) : 'never died'
      ])
    }
    say('\n### Reaction latency vs the boss slam (stage 2, competent routing throughout)\n')
    say(mdTable(['latency', 'clear rate', 'slams that connected', 'survivors lost to slams', 'boss TTK s'], rows))
    expect(rows.length).toBe(7)
  }, 900_000)

  // ── Does the pillar actually enforce a commitment? ───────────────────────
  //
  // `stepGates` scores EVERY leaf independently, by whoever is standing inside
  // its own half-width. A crowd parked on the pillar is inside both. If the
  // crush is cheaper than the second leaf is worth, "choose a side" is advice,
  // not a rule — so this measures the straddle directly.
  it('measures whether straddling the pillar beats committing to a leaf', async () => {
    const rows: string[][] = []
    // Overwhelming firepower and a full-size crowd, so foes, walls and crates
    // are all irrelevant and the only things that move the number are the gate
    // leaves and the pillar between them. Runs to 75 % of the road, which on
    // every one of stages 1–5 covers at least two banks.
    // Two squad sizes, because `crushAgainst` charges `max(1, squad × 0.35)`
    // per second — a rate that is a rounding error for a beginner's crowd and a
    // massacre for an expert's. If straddling wins at 6 and loses at 40, the
    // pillar teaches the wrong lesson in exactly the stages that teach.
    for (const startSquad of [6, 40]) {
      for (const stage of STAGES) {
        const until = Math.round((120 + stage * 9 - 4) * 0.75)
        const cells: string[] = []
        for (const x of [0, 2.45, -2.45]) {
          const runs = await Promise.all(
            [11, 23, 37].map((seed) =>
              probe({
                stage,
                seed,
                squad: startSquad,
                damage: 400,
                fireRate: 4,
                steer: () => x,
                untilY: until,
                maxSeconds: 45
              })
            )
          )
          cells.push(
            `${Math.round(median(runs.map((p) => p.squadEnd)))} ` +
              `(pillar −${n1(median(runs.map((p) => p.deaths.divider)))}, ` +
              `trap −${n1(median(runs.map((p) => p.deaths.trap)))})`
          )
        }
        rows.push([String(stage), String(startSquad), ...cells])
      }
    }
    say(
      '\n### Straddling the pillar vs committing to a leaf\n' +
        '\n400 damage and +4 fire rate throughout, so foes, walls and crates are all irrelevant and the only ' +
        'things that move the number are the gate leaves and the pillar. Runs to 75 % of the road.\n'
    )
    say(mdTable(['stage', 'started', 'held x = 0 (both leaves)', 'held x = +2.45', 'held x = −2.45'], rows))
    expect(rows.length).toBe(STAGES.length * 2)
  }, 900_000)

  // ── Is the crush a grind or a guillotine? ───────────────────────────────
  //
  // `crushAgainst` adds `squad × fraction × dt` to a per-obstacle budget EVERY
  // frame the obstacle is within ±6 of the crowd — whether or not anybody is
  // touching it — and banks whatever it does not spend. So an obstacle you
  // approach from far away has seconds of kill budget saved up by the time you
  // reach it, and spends the whole bank on the first frame of contact.
  //
  // The test uses stage 1's pillar at y = 84, because a pillar is the one
  // obstacle bullets cannot remove — a wall gets shot down by the very crowd
  // that is aimed at it, which confounds the measurement. The crowd grazes the
  // same pillar on the same line, entered two ways: held from far out, or cut
  // onto at the last moment. Both bank the same debt (it accrues on RANGE);
  // the late cut spends roughly 60 % less time in contact. If the crush were
  // really a rate, the late cut should cost proportionally less.
  it('checks whether the crush bank front-loads an obstacle', async () => {
    const rows: string[][] = []
    const line = 1.6
    for (const squad of [20, 60, 150]) {
      const full = await Promise.all(
        [11, 23, 37].map((seed) =>
          probe({
            stage: 1, seed, squad, damage: 400, fireRate: 4,
            steer: () => line, untilY: 90, maxSeconds: 30
          })
        )
      )
      const late = await Promise.all(
        [11, 23, 37].map((seed) =>
          probe({
            stage: 1, seed, squad, damage: 400, fireRate: 4,
            steer: (v) => (v.anchorY < 83.5 ? -3.2 : line),
            untilY: 90,
            maxSeconds: 30
          })
        )
      )
      rows.push([
        String(squad),
        n1(median(full.map((p) => p.deaths.divider))),
        n1(median(late.map((p) => p.deaths.divider)))
      ])
    }
    say(
      `\n### Crush bank: full contact vs a late cut onto the same pillar\n` +
        `\nStage 1's bank at y = 84, grazed at x = ${line}. The late cut is in contact for about 60 % less time; ` +
        `both lines have the same debt banked, because the budget accrues on RANGE rather than on contact.\n`
    )
    say(mdTable(['squad', 'held on the line throughout', 'cut onto it at the last moment'], rows))
    expect(rows.length).toBe(3)
  }, 300_000)

  // ── Question 5: is a miniboss a beat or a second boss? ───────────────────
  it('measures the miniboss against the boss it is warming up for', async () => {
    const { minibossHp } = await import('@/game/track')
    const { BOSS_BASE_HP } = await import('@/game/survival')
    const { bossHpScale } = await import('@/game/foes')
    const rows: string[][] = []
    for (const s of STAGES) {
      const boss = Math.round(BOSS_BASE_HP * bossHpScale(s))
      const mini = s >= 2 ? minibossHp(s, false) : 0
      rows.push([
        String(s),
        String(boss),
        mini ? String(mini) : '—',
        mini ? `${Math.round((mini / boss) * 100)}%` : '—'
      ])
    }
    say('\n### Miniboss HP vs boss HP, on paper\n')
    say(mdTable(['stage', 'boss hp', 'miniboss hp', 'fraction'], rows))
    expect(rows.length).toBe(5)
  })

  // ── Are the supplies actually reachable? ────────────────────────────────
  //
  // A rate crate is only a reward if the squad that finds it can break it
  // before walking into it. This prices that directly: how much DPS a crate
  // spotted twelve units out demands, against the DPS a run has at that point.
  it('prices the supply crates against the DPS a run actually has', async () => {
    const { crateHp, barricadeHp } = await import('@/game/track')
    const { BULLET_RANGE, CROWD_MAX_R, BULLET_SPEED, CRATE_R, BULLET_R, stageSpeed } =
      await import('@/game/survival')
    const { crowdFractionIn } = await import('./policies')

    const rows: string[][] = []
    for (const s of STAGES) {
      const speed = stageSpeed(s)
      // The distance a crate can first be SHOT at, not the distance it can first
      // be seen. These used to be the same number (rounds outran the camera);
      // since `BULLET_RANGE` they are not, and pricing a crate against a window
      // the guns cannot reach into is how a stage ends up demanding DPS nobody
      // has.
      const dist = BULLET_RANGE
      const window = dist / speed - dist / BULLET_SPEED - 0.3
      const needFor = (hp: number, halfW: number): number => {
        const align = crowdFractionIn(0, CROWD_MAX_R, -(halfW + BULLET_R), halfW + BULLET_R)
        return Math.round((hp * 1.15) / (align * window))
      }
      rows.push([
        String(s),
        String(crateHp(s, 'rate')),
        String(needFor(crateHp(s, 'rate'), CRATE_R)),
        String(crateHp(s, 'damage')),
        String(needFor(crateHp(s, 'damage'), CRATE_R)),
        String(barricadeHp(s))
      ])
    }
    say(
      '\n### What a supply crate costs, versus the DPS a run has when it meets one\n' +
        `\n"DPS needed" is the squad DPS required to break a crate from the moment it enters gun range, at a full-size ` +
        `crowd (radius ${CROWD_MAX_R}, which lands about half its rounds on a target that narrow).\n`
    )
    say(
      mdTable(
        ['stage', 'rate crate hp', 'DPS needed', 'dmg crate hp', 'DPS needed', 'barricade block hp'],
        rows
      )
    )
    expect(rows.length).toBe(5)
  })

  // ── The first eleven seconds of the game ─────────────────────────────────
  it('traces exactly what happens to a player who never touches the screen', async () => {
    const game = await loadGame()
    const r = await runOne({ stage: 1, policy: careless, seed: 1 })
    say('\n### Stage 1, careless (never steers)\n')
    say(
      `cleared=${r.cleared} seconds=${n1(r.seconds)} progress=${pct(r.progress01)} ` +
        `peak=${r.peakSquad} deaths=${JSON.stringify(r.deaths)}`
    )
    const track = (await import('@/game/track')).buildTrack(1)
    const firstGate = track.events.find((e) => e.kind === 'gates')
    say(`first gate bank of the whole game sits at y=${firstGate?.y}; the crowd starts at x=0`)
    void game
    expect(r.seconds).toBeGreaterThan(0)
  })

  // ── Sanity: fixed step + seeded RNG really is deterministic ──────────────
  it('is reproducible: the same seed replays the same run', async () => {
    const a = await runOne({ stage: 3, policy: optimal, seed: 4242 })
    const b = await runOne({ stage: 3, policy: optimal, seed: 4242 })
    expect(b.peakSquad).toBe(a.peakSquad)
    expect(b.seconds).toBe(a.seconds)
    expect(b.finalSquad).toBe(a.finalSquad)
    void median
  })
})

/**
 * ─── The career study ───────────────────────────────────────────────────────
 *
 * Same gate, different unit of measurement. Everything above plays one stage on
 * a wiped save; everything below plays THIRTY stages on a save that carries
 * forward, which is the only way the shop, the challenge streak and the
 * escalating relief can be observed doing anything at all.
 *
 *     SIM_STUDY=1 SIM_OUT=career.md npx vitest run tests/sim/study.test.ts
 *     SIM_STUDY=1 SIM_CAREERS=5 npx vitest run tests/sim/study.test.ts
 *
 * The tables it prints are the ones in `tests/sim/CAREER.md`, pasted unedited.
 * Budget about eight minutes at three careers per cell.
 */
describe.skipIf(!RUN)('careers: stages 1–30, carrying the save', () => {
  const CAREERS = Number(process.env.SIM_CAREERS ?? 3)
  const PROBE_SEEDS = [1000, 8919, 16838, 24757, 32676, 40595, 48514, 56433]

  const lv = (l: Record<string, number>): string =>
    `s${l.squad} p${l.power} r${l.rate} $${l.scavenge}`

  // ── 1. Who finishes, and what did the shop have to do with it ───────────
  it(`plays every (policy x purchasing strategy) as a full career, ${CAREERS} seeds each`, async () => {
    const { careerSamples } = await import('./career')
    const { STRATEGIES, singleTrack } = await import('./shop')
    // The single-track probes are the ones that answer "is any track strictly
    // dominant or strictly ignorable" — a career that pours everything into one
    // track and still finishes has proved the other three optional.
    const strategies = [...STRATEGIES, singleTrack('squad'), singleTrack('power'),
      singleTrack('rate'), singleTrack('scavenge')]

    const rows: string[][] = []
    for (const p of POLICIES) {
      for (const s of strategies) {
        const cs = await careerSamples(p, s, CAREERS)
        const reached = cs.map((c) => c.reached).sort((a, b) => a - b)
        const stuck = cs.map((c) => c.stuckAt).filter((x) => x > 0)
        rows.push([
          p.id,
          s.id,
          `${median(reached)} (${reached[0]}-${reached[reached.length - 1]})`,
          stuck.length ? stuck.join('/') : '—',
          String(Math.round(cs.reduce((a, c) => a + c.totalAttempts, 0) / cs.length)),
          String(Math.round(cs.reduce((a, c) => a + c.totalEarned, 0) / cs.length)),
          String(Math.round(cs.reduce((a, c) => a + c.totalSpent, 0) / cs.length)),
          lv(cs[0]!.finalLevels)
        ])
      }
    }
    say('\n### Careers: who reaches stage 30, and on whose money\n')
    say(mdTable(
      ['policy', 'strategy', 'reached (min-max)', 'stuck at', 'attempts', 'earned', 'spent', 'final levels'],
      rows
    ))
    expect(rows.length).toBeGreaterThan(20)
  }, 3_000_000)

  // ── 2. The career, stage by stage ───────────────────────────────────────
  it('prints the per-stage career table for four (policy, strategy) pairs', async () => {
    const { careerSamples, summariseCareers } = await import('./career')
    const { cheapest, none, value } = await import('./shop')
    const pairs: Array<[string, typeof optimal, ReturnType<typeof value>]> = [
      ['good + value', good, value()],
      ['optimal + value', optimal, value()],
      ['average + cheapest', average, cheapest],
      ['good + none (the shop is optional)', good, none]
    ]
    for (const [label, policy, strategy] of pairs) {
      const rows = summariseCareers(await careerSamples(policy, strategy, CAREERS)).map((x) => [
        String(x.stage),
        pct(x.clearRate),
        String(x.attempts),
        String(Math.round(x.coinsEarned)),
        String(Math.round(x.coinsSpent)),
        String(Math.round(x.wallet)),
        lv(x.levels),
        String(Math.round(x.squadAtBoss)),
        String(Math.round(x.dpsAtBoss)),
        String(Math.round(x.bossHp)),
        x.bossSeconds == null ? '—' : n1(x.bossSeconds),
        String(x.challenge),
        n2(x.hpRelief),
        pct(x.gatePaidShare),
        x.deaths.slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ')
      ])
      say(`\n### Career: ${label}\n`)
      say(mdTable(
        ['stage', 'clear', 'attempts', 'earned', 'spent', 'wallet', 'levels', 'squad@boss',
          'DPS@boss', 'boss hp', 'TTK s', 'streak', 'hp mult', 'gate paid', 'top causes'],
        rows
      ))
      expect(rows.length).toBeGreaterThan(0)
    }
  }, 3_000_000)

  // ── 3. What one more level is worth, at three points in a career ────────
  it('prices every track against the build a career actually holds', async () => {
    const { probeStage } = await import('./career')
    const { UPGRADES } = await import('@/use/useUpgrades')
    const points: Array<[number, Record<string, number>, number]> = [
      [8, { squad: 4, power: 4, rate: 2, scavenge: 5 }, 7],
      [16, { squad: 8, power: 9, rate: 7, scavenge: 8 }, 12],
      [24, { squad: 10, power: 12, rate: 9, scavenge: 9 }, 12]
    ]
    const rows: string[][] = []
    for (const [stage, base, challenge] of points) {
      let baseDps = 0
      for (const id of ['—', 'squad', 'power', 'rate', 'scavenge'] as const) {
        const levels = id === '—' ? base : { ...base, [id]: (base[id] ?? 0) + 1 }
        const price = id === '—' ? 0 : UPGRADES[id].cost(base[id] ?? 0)
        const rs = await probeStage({ stage, policy: good, levels, seeds: PROBE_SEEDS, challenge })
        const dps = median(rs.map((r) => r.dpsAtBoss))
        if (id === '—') baseDps = dps
        const ttk = rs.filter((r) => r.bossSeconds != null).map((r) => r.bossSeconds!)
        rows.push([
          `${stage} (${lv(base)})`,
          id,
          String(price),
          String(Math.round(dps)),
          String(Math.round(dps - baseDps)),
          price ? String(Math.round(((dps - baseDps) / price) * 1000)) : '—',
          ttk.length ? n1(median(ttk)) : '—',
          String(Math.round(median(rs.map((r) => r.peakSquad))))
        ])
      }
    }
    say('\n### One more level: marginal DPS per coin\n')
    say(mdTable(
      ['stage (build)', 'buy', 'price', 'DPS@boss', 'dDPS', 'dDPS / 1000 coins', 'TTK s', 'peak squad'],
      rows
    ))
    expect(rows.length).toBe(15)
  }, 3_000_000)

  // ── 4. Budget-matched ladders: is any track strictly dominant ───────────
  it('spends the same coins on one track at a time and compares the runs', async () => {
    const { probeStage } = await import('./career')
    const { UPGRADES } = await import('@/use/useUpgrades')
    const spendTo = (id: 'squad' | 'power' | 'rate', l: number): number => {
      let t = 0
      for (let i = 0; i < l; i++) t += UPGRADES[id].cost(i)
      return t
    }
    const builds: Array<[string, Record<string, number>, number]> = [
      ['nothing', {}, 0],
      ['squad 6', { squad: 6 }, spendTo('squad', 6)],
      ['power 8', { power: 8 }, spendTo('power', 8)],
      ['rate 7', { rate: 7 }, spendTo('rate', 7)],
      ['mixed s4 p5 r4', { squad: 4, power: 5, rate: 4 },
        spendTo('squad', 4) + spendTo('power', 5) + spendTo('rate', 4)]
    ]
    const rows: string[][] = []
    for (const [stage, challenge] of [[12, 11], [22, 12]] as Array<[number, number]>) {
      for (const p of [good, average]) {
        for (const [label, levels, coins] of builds) {
          const rs = await probeStage({ stage, policy: p, levels, seeds: PROBE_SEEDS, challenge })
          const ttk = rs.filter((r) => r.bossSeconds != null).map((r) => r.bossSeconds!)
          const thrown = rs.reduce((a, r) => a + r.slamsThrown, 0)
          const hit = rs.reduce((a, r) => a + r.slamsConnected, 0)
          rows.push([
            String(stage), p.id, label, String(coins),
            pct(rs.filter((r) => r.cleared).length / rs.length),
            String(Math.round(median(rs.map((r) => r.peakSquad)))),
            String(Math.round(median(rs.map((r) => r.dpsAtBoss)))),
            ttk.length ? n1(median(ttk)) : '—',
            `${thrown ? Math.round((hit / thrown) * 100) : 0}% of ${thrown}`
          ])
        }
      }
    }
    say('\n### Budget-matched: the same coins, one track at a time\n')
    say(mdTable(
      ['stage', 'policy', 'build', 'coins', 'clear', 'peak squad', 'DPS@boss', 'TTK s', 'slams connected'],
      rows
    ))
    expect(rows.length).toBe(20)
  }, 3_000_000)

  // ── 5. The autobalancer, both halves, in isolation ──────────────────────
  it('sweeps the challenge streak with everything else held still', async () => {
    const { probeStage } = await import('./career')
    const { challengeFactor } = await import('@/game/survival')
    const rows: string[][] = []
    for (const streak of [0, 3, 6, 9, 12]) {
      for (const p of [good, average]) {
        const rs = await probeStage({
          stage: 18, policy: p, levels: { squad: 8, power: 9, rate: 7 },
          seeds: PROBE_SEEDS, challenge: streak
        })
        const ttk = rs.filter((r) => r.bossSeconds != null).map((r) => r.bossSeconds!)
        rows.push([
          String(streak), p.id, n2(challengeFactor(streak)),
          String(Math.round(median(rs.map((r) => r.bossHp)))),
          ttk.length ? n1(median(ttk)) : '—',
          pct(rs.filter((r) => r.cleared).length / rs.length),
          String(Math.round(median(rs.map((r) => r.lost))))
        ])
      }
    }
    say('\n### The challenge streak, stage 18, build s8 p9 r7\n')
    say(mdTable(['streak', 'policy', 'hp mult', 'boss hp', 'TTK s', 'clear', 'survivors lost'], rows))
    expect(rows.length).toBe(10)
  }, 3_000_000)

  it('sweeps the escalating relief on stages that actually beat somebody', async () => {
    const { probeStage } = await import('./career')
    const { reliefFor } = await import('@/game/survival')
    const cases: Array<[string, number, typeof optimal, Record<string, number>]> = [
      ['stage 1, careless (dies to slams)', 1, careless, {}],
      ['stage 5, trail (dies on the road)', 5, trailFollower, { squad: 2, power: 2 }],
      ['stage 13, trail (dies to the boss)', 13, trailFollower, { squad: 4, power: 5, rate: 3 }]
    ]
    const rows: string[][] = []
    for (const [label, stage, p, levels] of cases) {
      for (const failures of [0, 1, 2, 3, 4]) {
        const rs = await probeStage({ stage, policy: p, levels, seeds: PROBE_SEEDS, failures })
        rows.push([
          label, String(failures), n2(reliefFor(failures)),
          String(Math.round(median(rs.map((r) => r.bossHp)))),
          pct(rs.filter((r) => r.cleared).length / rs.length),
          pct(median(rs.map((r) => r.progress01))),
          String(Math.round(median(rs.map((r) => r.deaths.slam)))),
          String(Math.round(median(rs.map((r) => r.lost))))
        ])
      }
    }
    say('\n### The escalating relief\n')
    say(mdTable(
      ['case', 'failures', 'hp mult', 'boss hp', 'clear', 'died at', 'slam deaths', 'lost'],
      rows
    ))
    expect(rows.length).toBe(15)
  }, 3_000_000)

  // ── 6. Is the squad ceiling eating the payouts ──────────────────────────
  it('measures what MAX_SQUAD costs the doors, by stage', async () => {
    const { probeStage } = await import('./career')
    const builds: Array<[number, Record<string, number>, number]> = [
      [12, { squad: 6, power: 7, rate: 4, scavenge: 7 }, 11],
      [18, { squad: 9, power: 10, rate: 7, scavenge: 9 }, 12],
      [22, { squad: 10, power: 11, rate: 9, scavenge: 9 }, 12],
      [26, { squad: 10, power: 12, rate: 10, scavenge: 10 }, 12],
      [30, { squad: 11, power: 13, rate: 10, scavenge: 10 }, 12]
    ]
    const rows: string[][] = []
    for (const [stage, levels, challenge] of builds) {
      for (const p of [optimal, good, average]) {
        const rs = await probeStage({ stage, policy: p, levels, seeds: PROBE_SEEDS, challenge })
        const promised = median(rs.map((r) => r.gatePromised))
        const delivered = median(rs.map((r) => r.gateDelivered))
        rows.push([
          String(stage), p.id,
          String(Math.round(median(rs.map((r) => r.peakSquad)))),
          String(Math.round(promised)), String(Math.round(delivered)),
          pct(promised > 0 ? delivered / promised : 1),
          String(Math.round(median(rs.map((r) => r.gatesClipped)))),
          n1(median(rs.map((r) => r.secondsAtCap)))
        ])
      }
    }
    say('\n### Gate payouts against the MAX_SQUAD ceiling\n')
    say(mdTable(
      ['stage', 'policy', 'peak squad', 'promised', 'delivered', 'paid', 'banks clipped', 's at cap'],
      rows
    ))
    expect(rows.length).toBe(15)
  }, 3_000_000)
})
