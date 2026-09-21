/**
 * ─── Did the new stage-3 boss move the funnel? ──────────────────────────────
 *
 * A scratch probe, not a regression: it asserts nothing and reports.
 *
 *   SIM_WYRM=1 npx vitest run tests/sim/scratch.wyrm.test.ts --reporter=verbose
 *
 * Stage 3 is the wyrm now (`WYRM_STAGE`), and the whole reason it exists is the
 * funnel — the 2026-09-20 fit test put the wall in minute two. So the question
 * this answers is not "is the fight good", it is "is stage 3 now an OUTLIER
 * against the stages either side of it", for the players the gate is decided by.
 *
 * Read the clear rate down each column: 2 → 3 → 4 should be a curve, not a step.
 * A scripted policy dodges nothing the wyrm throws (it reads the road, not the
 * arena — see `sim-policies-model-only-the-road`), so these numbers are the
 * FLOOR: what the fight costs a player who does not answer it at all.
 */
import { describe, it } from 'vitest'
import { aggregate, runSamples } from './harness'
import { average, careless, good, optimal } from './policies'
import type { Policy } from './policies'

const RUN = process.env.SIM_WYRM === '1'
const SEEDS = Number(process.env.SIM_SAMPLES ?? 5)
const STAGES = (process.env.SIM_STAGES ?? "2,3,4").split(",").map(Number)
const PLAYERS: Policy[] = [optimal, good, average, careless]

const p = (v: number | string, w: number): string => String(v).padStart(w)

describe.runIf(RUN)('stage 3 against its neighbours', () => {
  it('clears, times and losses per policy', async () => {
    const rows: string[] = []
    rows.push(`${p('policy', 9)} ${p('stage', 5)} ${p('clear', 6)} ${p('secs', 6)} ${p('atBoss', 7)} ${p('lostToBoss', 11)}`)
    for (const policy of PLAYERS) {
      for (const stage of STAGES) {
        const rs = await runSamples(stage, policy, SEEDS)
        const a = aggregate(rs)
        const cleared = rs.filter((r) => r.cleared)
        const secs = cleared.length > 0
          ? cleared.reduce((s, r) => s + r.seconds, 0) / cleared.length
          : 0
        rows.push([
          p(policy.id, 9), p(stage, 5),
          p(`${Math.round(a.clearRate * 100)}%`, 6),
          p(secs.toFixed(1), 6),
          p(Math.round(rs.reduce((t, r) => t + r.squadAtBoss, 0) / rs.length), 7),
          p(Math.round(rs.reduce((t, r) => t + r.squadLostToBoss, 0) / rs.length), 11)
        ].join(' '))
      }
    }
    console.warn(`\n${rows.join('\n')}\n`)
  }, 600_000)
})
