import { describe, expect, it } from 'vitest'
import { runCareer } from './career'
import { optimal, good, average } from './policies'
import { value } from './shop'

/**
 * A scratch probe, not a regression: it asserts nothing and only reports.
 *
 *   SIM_STUDY=1 npx vitest run tests/sim/scratch.depth.test.ts --reporter=verbose
 *
 * `--reporter=verbose` is load-bearing — Vitest 4's default reporter swallows
 * `console.log` from a passing test, so without it this runs for five minutes
 * and prints nothing.
 */
describe.skipIf(!process.env.SIM_STUDY)('scratch', () => {
  it('reports the attempts-per-stage curve at depth', async () => {
    for (const [name, policy] of [['optimal', optimal], ['good', good], ['average', average]] as const) {
      const c = await runCareer({
        policy, strategy: value(), seed: 5000,
        lastStage: 110, claimsReward: true, maxSecondsPerAttempt: 300
      })
      const band = (lo: number, hi: number): string => {
        const rows = c.stages.filter((s) => s.stage >= lo && s.stage <= hi)
        if (!rows.length) return '—'
        return (rows.reduce((a, s) => a + s.attempts, 0) / rows.length).toFixed(2)
      }
      console.log(
        `${name} reached=${c.reached} stuckAt=${c.stuckAt} total=${c.totalAttempts} | ` +
        `1-30=${band(1, 30)} 31-60=${band(31, 60)} 61-80=${band(61, 80)} ` +
        `81-100=${band(81, 100)} 101-110=${band(101, 110)}`
      )
    }
  }, 1_800_000)
})
