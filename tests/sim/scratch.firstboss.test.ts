/**
 * ─── The first boss, with and without the bomb ──────────────────────────────
 *
 * A scratch probe, not a regression: it asserts nothing and reports.
 *
 *   SIM_FIRSTBOSS=1 npx vitest run tests/sim/scratch.firstboss.test.ts --reporter=verbose
 *
 * The full-run tables report a stage-1 boss fight of 6-7 s, and that number is
 * measured on a player WHO NEVER PRESSES THE BUTTON — no scripted policy throws
 * the grenade (see `onTick` on `RunOptions`). The real first boss is met by a
 * player who was taught the grenade on the elite two thirds down the same road
 * and presses it again on reflex, and a grenade is worth `grenadeMult` SECONDS
 * of the crowd's own fire against a bar priced in exactly the same unit. So the
 * fight the player actually gets is the `+bomb` column, and it is the one the
 * brief is about.
 *
 * Both are printed for every policy, because the brief says "all final squad
 * sizes": the ladder hands a different target to a 30-crowd and a 90-crowd, and
 * a change that only lengthens one end of it has not done the job.
 */
import { describe, it } from 'vitest'
import { GRENADE_BASE_MULT } from '@/use/useUpgrades'
import { aggregate, loadGame, median, runOne, STEP_MS } from './harness'
import type { Game, RunResult } from './harness'
import { average, careless, good, optimal } from './policies'
import type { Policy } from './policies'

const RUN = process.env.SIM_FIRSTBOSS === '1'
const SEEDS = Number(process.env.SIM_SAMPLES ?? 3)
const STAGE = Number(process.env.SIM_STAGE ?? 1)
const PLAYERS = [optimal, good, average, careless]

const p = (v: number | string, w: number): string => String(v).padStart(w)
const n1 = (v: number): string => v.toFixed(1)

/**
 * Throw one grenade `delay` ms into the fight, once.
 *
 * A closure per run because it carries the "already thrown" latch; `throwGrenade`
 * refuses outside `run`/`boss` and when there is nothing to aim at, so the latch
 * is set from its return value rather than from the attempt.
 */
const reflexBomb = (): ((game: Game) => void) => {
  let thrown = false
  let bossMs = -1
  let ms = 0
  return (game) => {
    ms += STEP_MS
    if (game.phase.value === 'boss' && bossMs < 0) bossMs = ms
    if (thrown || bossMs < 0 || ms - bossMs < 250) return
    thrown = game.throwGrenade(GRENADE_BASE_MULT)
  }
}

const sample = async (policy: Policy, bomb: boolean): Promise<RunResult[]> => {
  const out: RunResult[] = []
  for (let i = 0; i < SEEDS; i++) {
    out.push(await runOne({
      stage: STAGE, policy, seed: 1000 + i, onTick: bomb ? reflexBomb() : undefined
    }))
  }
  return out
}

describe.skipIf(!RUN)('the first boss', () => {
  it('reports the fight with and without the reflex grenade', async () => {
    await loadGame()
    console.log(`\n── stage ${STAGE} ──`)
    console.log('policy   | squad | dps    | bar     | no bomb | +bomb | bomb takes | lost')
    for (const policy of PLAYERS) {
      const bare = aggregate(await sample(policy, false))
      const bomb = aggregate(await sample(policy, true))
      const bareS = bare.bossSeconds.med
      const bombS = bomb.bossSeconds.med
      if (!bareS) { console.log(`${p(policy.id, 8)} | never reached the arena`); continue }
      console.log(
        `${p(policy.id, 8)} | ${p(Math.round(bare.squadAtBoss.med), 5)} |` +
        ` ${p(n1(bare.dpsAtBoss.med), 6)} | ${p(Math.round(bare.bossHp), 7)} |` +
        ` ${p(n1(bareS), 7)} | ${p(n1(bombS), 5)} |` +
        ` ${p(`${Math.round((1 - bombS / bareS) * 100)}%`, 10)} |` +
        ` ${p(Math.round(median(bomb.samples ? [bomb.squadLostToBoss.med] : [0])), 4)}`
      )
    }
  }, 900_000)
})
