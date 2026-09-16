/**
 * ─── How long a stage actually lasts ────────────────────────────────────────
 *
 * A scratch probe, not a regression: it asserts nothing and reports.
 *
 *   SIM_LEN=1 npx vitest run tests/sim/scratch.length.test.ts --reporter=verbose
 *
 * Play time is the one number the road's LENGTH is really chosen for, and it is
 * not the length divided by the speed: gate pumps run the world in slow motion,
 * an elite stops it for its leash, and the boss fight is whatever the adaptive
 * pricing makes it. This prints the three parts separately so a length pass can
 * see which one it is actually moving.
 */
import { describe, it } from 'vitest'
import { stageLength, stageSpeed } from '@/game/survival'
import { aggregate, n1, pct, runSamples } from './harness'
import { average, careless, good, optimal } from './policies'

const RUN = process.env.SIM_LEN === '1'
const SEEDS = Number(process.env.SIM_SAMPLES ?? 3)
const STAGES = (process.env.SIM_STAGES ?? '1,2,3,4,5,6').split(',').map(Number)
const PLAYERS = [optimal, good, average, careless]

const p = (v: number | string, w: number): string => String(v).padStart(w)

describe.skipIf(!RUN)('stage duration', () => {
  it('prints road, elite and boss seconds for the opening stages', async () => {
    console.log('\n── ROAD ON PAPER ──')
    for (const s of STAGES) {
      console.log(
        `stage ${p(s, 2)}: ${p(stageLength(s), 4)} units @ ${stageSpeed(s).toFixed(2)} u/s ` +
        `= ${p((stageLength(s) / stageSpeed(s)).toFixed(1), 5)} s of pure running`
      )
    }
    console.log('\n── MEASURED ──')
    console.log('stage | policy  | clear |  total s | elite s | boss s | road s | peak | bossSq')
    for (const stage of STAGES) {
      for (const policy of PLAYERS) {
        const rs = await runSamples(stage, policy, SEEDS)
        const a = aggregate(rs)
        const el = a.eliteSeconds.med || 0
        const bo = a.bossSeconds.med || 0
        console.log(
          `  ${p(stage, 3)} | ${p(policy.id, 7)} | ${p(pct(a.clearRate), 5)} |` +
          ` ${p(n1(a.seconds.med), 8)} | ${p(n1(el), 7)} | ${p(n1(bo), 6)} |` +
          ` ${p(n1(a.seconds.med - el - bo), 6)} | ${p(n1(a.peakSquad.med), 4)} |` +
          ` ${p(n1(a.squadAtBoss.med), 6)}`
        )
      }
    }
  }, 1_200_000)
})
