/**
 * ─── The opening-five probe ─────────────────────────────────────────────────
 *
 * A scratch probe, not a regression: it asserts nothing and reports.
 *
 *   SIM_EARLY=1 npx vitest run tests/sim/scratch.early.test.ts --reporter=verbose
 *   # PowerShell: $env:SIM_EARLY=1; npx vitest run … --reporter=verbose
 *
 * `--reporter=verbose` is load-bearing — Vitest 4's default reporter swallows
 * `console.log` from a passing test.
 *
 * The question the other probes cannot answer. `scratch.ramp` adds up what is
 * STANDING on each road and `study` reports whether a policy CLEARS it, and a
 * stage can be trivial on both counts while being a bad stage: a road nobody
 * loses anybody on is not "well tuned", it is not asking anything. So this one
 * reports the three numbers a balance pass on the opening five actually moves —
 *
 *   PRESSURE   survivors lost on the road, and to what. A stage that takes
 *              nothing is a cutscene; one that takes a third of the crowd from
 *              a competent player is a wall.
 *   ECONOMY    peak crowd and what the doors paid. This is where the snowball
 *              shows up: a crowd that trebles on one stage was handed a
 *              multiplier standing on an already-fat crowd.
 *   DECISION   what each bank actually asked. A bank whose best door is right
 *              for every crowd size is arithmetic the player does not have to
 *              do, and the table counts them.
 */
import { describe, it } from 'vitest'
import { buildTrack } from '@/game/track'
import type { TrackEvent } from '@/game/track'
import { aggregate, n1, pct, runSamples } from './harness'
import { average, careless, good, optimal, trailFollower } from './policies'

const RUN = process.env.SIM_EARLY === '1'
const SEEDS = Number(process.env.SIM_SAMPLES ?? 3)
const STAGES = [1, 2, 3, 4, 5]
const PLAYERS = [optimal, good, average, careless, trailFollower]

const p = (v: number | string, w: number): string => String(v).padStart(w)

type Bank = Extract<TrackEvent, { kind: 'gates' }>

/** What one leaf pays a crowd of `n`, in survivors gained (negative for a bill). */
const payout = (leaf: Bank['leaves'][number], n: number): number =>
  leaf.op === 'add' ? leaf.value
    : leaf.op === 'sub' ? -Math.min(n, leaf.value)
      : leaf.op === 'mul' ? n * (leaf.value - 1)
        : -(n - n / leaf.value)

/**
 * Is this bank a DECISION — does the best door change with the crowd?
 *
 * Evaluated over the crowd sizes a player can plausibly arrive with. If one
 * leaf wins at every size the bank is arithmetic with one answer, which is the
 * shape this pass exists to remove.
 */
const crossover = (bank: Bank): number | null => {
  let prev = -1
  for (let n = 2; n <= 200; n++) {
    let bestI = 0
    for (let i = 1; i < bank.leaves.length; i++) {
      if (payout(bank.leaves[i]!, n) > payout(bank.leaves[bestI]!, n)) bestI = i
    }
    if (prev >= 0 && bestI !== prev) return n
    prev = bestI
  }
  return null
}

const label = (leaf: Bank['leaves'][number]): string =>
  `${leaf.op === 'add' ? '+' : leaf.op === 'sub' ? '−' : leaf.op === 'mul' ? '×' : '÷'}${leaf.value}`

describe.skipIf(!RUN)('the opening five', () => {
  it('reports what each road asks and what it takes', async () => {
    console.log('\n── BANKS ──  (cross = crowd size where the best door changes)')
    for (const stage of STAGES) {
      const banks = buildTrack(stage).events
        .filter((e): e is Bank => e.kind === 'gates' && e.leaves.length > 1)
      let mulRun = 0
      let worstRun = 0
      for (const b of banks) {
        mulRun = b.leaves.some((l) => l.op === 'mul') ? mulRun + 1 : 0
        worstRun = Math.max(worstRun, mulRun)
      }
      const flat = banks.filter((b) => crossover(b) === null).length
      console.log(
        `stage ${stage}: ${p(banks.length, 2)} banks, ${p(flat, 2)} with one answer for every crowd, ` +
        `longest run of ×N banks ${worstRun}`
      )
      for (const b of banks) {
        const x = crossover(b)
        console.log(
          `   y=${p(b.y.toFixed(0), 3)}  ${p(b.leaves.map(label).join(' | '), 22)}  ` +
          `${x === null ? 'one answer' : `flips at ${x}`}`
        )
      }
    }

    console.log('\n── PLAY ──')
    console.log('stage | policy  | clear | peak | boss sq | lost | lost% | banks | top causes')
    for (const stage of STAGES) {
      for (const policy of PLAYERS) {
        const rs = await runSamples(stage, policy, SEEDS)
        const a = aggregate(rs)
        const lost = rs.reduce((s, r) => s + r.lost, 0) / rs.length
        const peak = a.peakSquad.med
        const banks = rs.reduce((s, r) => s + r.banksPassed, 0) / rs.length
        console.log(
          `  ${p(stage, 3)} | ${p(policy.id, 7)} | ${p(pct(a.clearRate), 5)} | ${p(n1(peak), 4)} |` +
          ` ${p(n1(a.squadAtBoss.med), 7)} | ${p(n1(lost), 4)} | ${p(pct(lost / Math.max(1, peak)), 5)} |` +
          ` ${p(n1(banks), 5)} | ${a.deaths.slice(0, 3).map(([k, v]) => `${k}:${v}`).join(' ')}`
        )
      }
    }
  }, 900_000)
})

/**
 * ─── The crowd walk ─────────────────────────────────────────────────────────
 *
 * The table a value pass is actually tuned against. For each bank in order it
 * prints the crowd that reaches it, what each door pays THAT crowd, and where
 * the answer flips — under two models of the same road:
 *
 *   keen  commits the moment a bank is in range and pumps the door it wants
 *         for the whole approach (`GATE_PUMP_TICKS_IDEAL`), losing nobody.
 *   lazy  takes the same door, pumps nothing, and pays a tenth of the crowd to
 *         the road between banks.
 *
 * A bank is a DECISION when the flip sits between the two crowds. Printed as
 * `live` when it does, and as the door that always wins when it does not — a
 * road whose banks all read `×` or all read `+` is arithmetic the player is
 * executing rather than doing.
 */
describe.skipIf(!RUN)('the crowd walk', () => {
  it('prints the crowd at every bank and where the answer flips', async () => {
    const { GATE_PUMP_TICKS_IDEAL } = await import('@/game/track')
    const { GATE_MUL_MAX, GATE_SCALE_STEP, gatePumpStep } = await import('@/game/survival')
    const { STAGE_SQUAD_FLOOR, START_SQUAD } = await import('@/game/survival')

    const pumped = (leaf: Bank['leaves'][number], stage: number, ticks: number): number =>
      leaf.op === 'mul'
        ? Math.min(GATE_MUL_MAX, Math.round((leaf.value + GATE_SCALE_STEP * ticks) * 10) / 10)
        : leaf.op === 'add' ? leaf.value + gatePumpStep(stage) * ticks : leaf.value

    const walk = (stage: number, ticks: number, toll: number): Array<{
      y: number; inN: number; best: string; outN: number; leaves: string[]
    }> => {
      let n = stage <= 1 ? START_SQUAD : STAGE_SQUAD_FLOOR
      const rows = []
      const events = buildTrack(stage).events
        .filter((e): e is Bank => e.kind === 'gates')
        .slice().sort((a, c) => a.y - c.y)
      for (const bank of events) {
        n = Math.max(1, Math.round(n * (1 - toll)))
        const inN = n
        let bestI = 0
        for (let i = 1; i < bank.leaves.length; i++) {
          if (payout({ ...bank.leaves[i]!, value: pumped(bank.leaves[i]!, stage, ticks) }, inN)
            > payout({ ...bank.leaves[bestI]!, value: pumped(bank.leaves[bestI]!, stage, ticks) }, inN)) bestI = i
        }
        const win = bank.leaves[bestI]!
        n = Math.max(1, Math.round(inN + payout({ ...win, value: pumped(win, stage, ticks) }, inN)))
        rows.push({
          y: bank.y, inN, best: label(win), outN: n,
          leaves: bank.leaves.map(label)
        })
      }
      return rows
    }

    for (const stage of STAGES) {
      const keen = walk(stage, GATE_PUMP_TICKS_IDEAL, 0)
      const lazy = walk(stage, 0, 0.1)
      console.log(`\nstage ${stage}`)
      console.log('    y |          doors |  keen in→out (took) |  lazy in→out (took) | flip')
      for (let i = 0; i < keen.length; i++) {
        const k = keen[i]!, l = lazy[i]!
        const bank = buildTrack(stage).events
          .filter((e): e is Bank => e.kind === 'gates').slice()
          .sort((a, c) => a.y - c.y)[i]!
        const x = crossover(bank)
        const live = k.best !== l.best
        console.log(
          `  ${p(k.y.toFixed(0), 3)} | ${p(k.leaves.join(' | '), 14)} |` +
          ` ${p(k.inN, 5)}→${p(k.outN, 5)} (${p(k.best, 5)}) |` +
          ` ${p(l.inN, 5)}→${p(l.outN, 5)} (${p(l.best, 5)}) |` +
          ` ${x === null ? '  —  ' : p(x, 5)}${live ? '  LIVE' : ''}`
        )
      }
      console.log(`  ends: keen ${keen[keen.length - 1]?.outN}, lazy ${lazy[lazy.length - 1]?.outN}`)
    }
  }, 300_000)
})
