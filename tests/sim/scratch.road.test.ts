/**
 * ─── The road, printed ──────────────────────────────────────────────────────
 *
 * A scratch probe, not a regression: it asserts nothing and reports.
 *
 *   SIM_ROAD=1 npx vitest run tests/sim/scratch.road.test.ts --reporter=verbose
 *   SIM_ROAD=1 SIM_STAGES=2,3 npx vitest run … --reporter=verbose
 *
 * `scratch.early` prints what each bank ASKS and `scratch.length` prints how
 * long the stage takes; this prints the road itself, in order, with the gate
 * gaps in seconds beside it — which is the view a LAYOUT pass needs and neither
 * of the other two gives. It is the fastest way to see what `legalise`,
 * `fillGateGaps`, `ensureSupplies`, `placeMinibosses` and the obstacle quotas
 * actually made of the beats somebody wrote down, and it was written because
 * four of those five silently changed a hand-authored stage during the pass
 * that lengthened stages 2 and 3.
 */
import { describe, it } from 'vitest'
import { buildTrack } from '@/game/track'
import { stageSpeed } from '@/game/survival'

const RUN = process.env.SIM_ROAD === '1'
const STAGES = (process.env.SIM_STAGES ?? '2,3').split(',').map(Number)

const sign = (op: string): string =>
  op === 'add' ? '+' : op === 'sub' ? '−' : op === 'mul' ? '×' : '÷'

describe.skipIf(!RUN)('road dump', () => {
  it('prints every beat of every stage asked for', () => {
    for (const stage of STAGES) {
      const t = buildTrack(stage)
      console.log(
        `\n── stage ${stage}: ${t.length} units, arena ${t.arenaY}, boss ${t.bossY}, ` +
        `${(t.length / stageSpeed(stage)).toFixed(1)} s of running`
      )
      const evs = [...t.events].sort((a, b) => a.y - b.y)
      let prevGate = 0
      for (const e of evs) {
        let detail = ''
        if (e.kind === 'gates') {
          detail = e.leaves.map((l) => `${sign(l.op)}${l.value}`).join(' | ')
          const gap = e.y - prevGate
          detail += `   (gap ${gap.toFixed(0)}u = ${(gap / stageSpeed(stage)).toFixed(1)}s)`
          prevGate = e.y
        } else if (e.kind === 'foes') detail = `${e.count}× ${e.typeId}${e.stray ? ' STRAY' : ''}`
        else if (e.kind === 'crates') detail = e.crates.map((c) => c.kind).join(', ')
        else if (e.kind === 'miniboss') detail = e.typeId ?? ''
        else if (e.kind === 'cages') {
          detail = e.cages.map((c) => (c.sealed ? `sealed +${c.hold}` : `+${c.hold}`)).join(', ')
        }
        console.log(`  ${e.y.toFixed(1).padStart(6)}  ${e.kind.padEnd(10)} ${detail}`)
      }
      const gap = t.arenaY - prevGate
      console.log(`  ${t.arenaY.toFixed(1).padStart(6)}  arena      (gap ${gap.toFixed(0)}u = ${(gap / stageSpeed(stage)).toFixed(1)}s)`)
    }
  })
})
