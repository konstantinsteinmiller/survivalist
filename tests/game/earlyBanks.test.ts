/**
 * ─── What the opening five's banks are allowed to look like ─────────────────
 *
 * Four rules, and each one is a shape that was measurably on the road before
 * this pass and is not allowed back.
 *
 *   NO TWO MULTIPLIERS IN A ROW.  `×2` then `×2` is a quadruple for a player
 *     who aimed twice — no read, no decision, and an exponent the difficulty
 *     curve is not priced against. Stages 1, 3 and 5 each ran THREE in a row.
 *   NO NEIGHBOURS ON THE NUMBER LINE.  `+5 | +6` is not a question: the bigger
 *     number is correct for every crowd that will ever meet it, and one extra
 *     survivor does not pay for a lane change. The pacing filler printed
 *     exactly that shape on every stage with a long stretch.
 *   NOTHING MULTIPLICATIVE BEFORE THE CROWD EXISTS.  A `×1.6` offered to the
 *     three survivors a stage opens with pays one body, so the bank has one
 *     answer. Every authored stage opened on one.
 *   AND AT LEAST ONE BANK THAT IS ACTUALLY A QUESTION.  The point of the other
 *     three: a road where the best door depends on how the run has gone, so
 *     the player has to look at their own crowd to answer it.
 *
 * The last one is the only one that cannot be enforced in `legalise` — it is a
 * property of the door's VALUE against the crowd that reaches it, which lives
 * in the authored stages and is measured by `SIM_EARLY=1`'s crowd walk. This
 * pins the conclusion so a value pass cannot quietly undo it.
 */
import { describe, expect, it } from 'vitest'
import {
  buildTrack, EARLY_MUL_GAP, GATE_TWIN_SHARE, MUL_EARLIEST, mulLeaves
} from '@/game/track'
import type { TrackEvent } from '@/game/track'
import { ADAPTIVE_BOSS_STAGES } from '@/game/adaptive'
import { squadBaseAt } from '@/game/survival'

type Bank = Extract<TrackEvent, { kind: 'gates' }>

const STAGES = Array.from({ length: ADAPTIVE_BOSS_STAGES }, (_, i) => i + 1)

const banksOf = (stage: number): Bank[] =>
  buildTrack(stage).events
    .filter((e): e is Bank => e.kind === 'gates')
    .slice()
    .sort((a, b) => a.y - b.y)

const hasMul = (bank: Bank): boolean => bank.leaves.some((l) => l.op === 'mul')

/** What one leaf pays a crowd of `n`, in survivors. */
const payout = (leaf: Bank['leaves'][number], n: number): number =>
  leaf.op === 'add' ? leaf.value
    : leaf.op === 'sub' ? -Math.min(n, leaf.value)
      : leaf.op === 'mul' ? n * (leaf.value - 1)
        : -(n - n / leaf.value)

/** The crowd at which this bank's best door changes, if it ever does. */
const crossover = (bank: Bank): number | null => {
  if (bank.leaves.length < 2) return null
  let prev = -1
  for (let n = 2; n <= 400; n++) {
    let best = 0
    for (let i = 1; i < bank.leaves.length; i++) {
      if (payout(bank.leaves[i]!, n) > payout(bank.leaves[best]!, n)) best = i
    }
    if (prev >= 0 && best !== prev) return n
    prev = best
  }
  return null
}

describe('a multiplier is an event, not a beat', () => {
  it('never stands within a bank of another one', () => {
    for (const stage of STAGES) {
      const withMul = banksOf(stage).filter(hasMul)
      for (let i = 1; i < withMul.length; i++) {
        const gap = withMul[i]!.y - withMul[i - 1]!.y
        expect(gap, `stage ${stage}: multiplier banks at y=${withMul[i - 1]!.y} and y=${withMul[i]!.y}`)
          .toBeGreaterThanOrEqual(EARLY_MUL_GAP)
      }
    }
  })

  it('never stands where the crowd is too small for it to mean anything', () => {
    for (const stage of STAGES) {
      const { arenaY } = buildTrack(stage)
      for (const bank of banksOf(stage).filter(hasMul)) {
        expect(bank.y, `stage ${stage}: a multiplier at ${Math.round(bank.y / arenaY * 100)}% of the road`)
          .toBeGreaterThan(arenaY * MUL_EARLIEST)
      }
    }
  })

  it('is rationed to the stage budget, counting the ones the repair rules invent', () => {
    for (const stage of STAGES) {
      const leaves = banksOf(stage).flatMap((b) => b.leaves).filter((l) => l.op === 'mul')
      expect(leaves.length, `stage ${stage} printed ${leaves.length} multiplier leaves`)
        .toBeLessThanOrEqual(mulLeaves(stage))
    }
  })
})

describe('two doors of the same kind are never neighbours', () => {
  it('keeps every pair of adds a readable distance apart', () => {
    for (const stage of STAGES) {
      for (const bank of banksOf(stage)) {
        const adds = bank.leaves.filter((l) => l.op === 'add').map((l) => l.value).sort((a, b) => b - a)
        for (let i = 1; i < adds.length; i++) {
          // Below the floor there is no room to separate them and the bank is
          // the opening of a stage, where every door is small — see
          // `GATE_TWIN_FLOOR`.
          if (adds[i - 1]! < 5) continue
          expect(adds[i]!, `stage ${stage} at y=${bank.y}: +${adds[i - 1]} beside +${adds[i]}`)
            .toBeLessThanOrEqual(Math.round(adds[i - 1]! * GATE_TWIN_SHARE))
        }
      }
    }
  })
})

describe('every one of the five asks at least one question', () => {
  it('has a bank whose best door depends on the run', () => {
    for (const stage of STAGES) {
      const live = banksOf(stage).filter((bank) => {
        const flip = crossover(bank)
        // A question, not a technicality: the flip has to sit inside the range
        // of crowds a player can plausibly arrive with, which is bounded below
        // by what the stage opens with and above by the doors before it.
        return flip !== null && flip > squadBaseAt(stage)
      })
      expect(live.length, `stage ${stage}: not one bank changes its answer with the crowd`)
        .toBeGreaterThan(0)
    }
  })

  it('does not ask the same question at every bank', () => {
    // The mirror of the rule above. A road of nothing but ties is as
    // uninteresting as a road of nothing but foregone conclusions, and it also
    // means every door pays about six tenths of the crowd — which is the
    // compounding this pass exists to hold down.
    for (const stage of STAGES) {
      const banks = banksOf(stage)
      const live = banks.filter((b) => crossover(b) !== null)
      expect(live.length / banks.length, `stage ${stage}: ${live.length}/${banks.length} banks are ties`)
        .toBeLessThan(0.75)
    }
  })
})
