import { describe, expect, it } from 'vitest'
import {
  barricadeHp,
  beatGap,
  buildTrack,
  crateHp,
  maxTriples,
  minDamageCrates,
  minRateCrates,
  MIN_RUN_GAP,
  SUB_EARLIEST,
  MINIBOSS_STAGE_THIRD,
  mulLeaves,
  mulThrees,
  packSize,
  trapChance,
  TRAP_EARLIEST,
  TRIPLE_STAGE,
  type Track,
  type TrackEvent
} from '@/game/track'
import {
  CROWD_MAX_R,
  GATE3_DIVIDER_X,
  GATE3_LEAF_HALF,
  GATE3_LEAF_X,
  GATE_LEAF_HALF,
  GATE_LEAF_X,
  GATE_SUB_MAX,
  LANE_HALF
} from '@/game/survival'

// ─── The shape of a stage ───────────────────────────────────────────────────
//
// The track generator makes promises that are invisible in a screenshot and
// expensive to discover in a playtest:
//
//   1. a stage is a pure function of its number, so a player LEARNS stage 6
//      instead of re-rolling it;
//   2. every gate bank is a real decision — two or three leaves that are never
//      worth the same thing, with a lethal pillar between each pair;
//   3. traps arrive on schedule (`÷` from stage 2, `÷5` from stage 6, never
//      twice in a row, never in the first tenth of a road) instead of whenever
//      the PRNG feels like it;
//   4. every barricade row can be run through by a crowd at full size;
//   5. every stage offers the supplies the run needs — fire rate starts at 1.9
//      shots/s and rate crates are the only way it climbs;
//   6. the difficulty knobs actually RAMP across all thirty stages rather than
//      flattening out somewhere in the middle.
//
// Each one is a one-character change away from silently becoming something
// else, so they are asserted across the whole thirty-stage campaign.

/**
 * The campaign is ENDLESS, so "the whole campaign" is not a list any more.
 *
 * Every invariant below is asserted across the thirty authored stages AND a
 * spread of the endless road — including stages past every place the generator
 * used to quietly stop scaling (the beat-gap floor at 32, the trap-odds cap at
 * 30, the multiplier freeze at 6) and past the two measured hard breaks: the
 * `MAX_SQUAD` overrun around stage 86 and the identical-doors break at 161.
 *
 * 300 is the far end because that is roughly a day of unbroken play; if the
 * shape holds there it holds anywhere a human will actually go.
 */
const STAGES = [
  ...Array.from({ length: 30 }, (_, i) => i + 1),
  35, 40, 50, 60, 75, 90, 100, 120, 150, 161, 175, 200, 250, 300
]

/** Thirty stages × a dozen assertions is thirty `buildTrack` calls, not four
 *  hundred. Determinism is asserted separately, so caching cannot hide a bug. */
const cache = new Map<number, Track>()
const track = (stage: number): Track => {
  const hit = cache.get(stage)
  if (hit) return hit
  const built = buildTrack(stage)
  cache.set(stage, built)
  return built
}

type GateEvent = Extract<TrackEvent, { kind: 'gates' }>

const gateBanks = (stage: number): GateEvent[] =>
  track(stage).events.filter((e): e is GateEvent => e.kind === 'gates')

/** The banks that are a real choice — the game's opening single doorway is not
 *  one, and is exempted by name everywhere below. */
const isOpeningDoor = (stage: number, bank: GateEvent): boolean =>
  stage === 1 && bank.y < 20 && bank.leaves.length === 1

/** Widest contiguous span of lane no block covers — the crowd's way through. */
const widestGap = (blocks: ReadonlyArray<{ x: number; w: number }>): number => {
  const sorted = [...blocks].sort((p, q) => p.x - q.x)
  let cursor = -LANE_HALF
  let best = 0
  for (const b of sorted) {
    best = Math.max(best, b.x - b.w / 2 - cursor)
    cursor = Math.max(cursor, b.x + b.w / 2)
  }
  return Math.max(best, LANE_HALF - cursor)
}

describe('a stage is a pure function of its number', () => {
  it('builds byte-identical layouts for the same stage', () => {
    expect(JSON.stringify(buildTrack(7))).toBe(JSON.stringify(buildTrack(7)))
    expect(JSON.stringify(buildTrack(1))).toBe(JSON.stringify(buildTrack(1)))
    expect(JSON.stringify(buildTrack(14))).toBe(JSON.stringify(buildTrack(14)))
    expect(JSON.stringify(buildTrack(30))).toBe(JSON.stringify(buildTrack(30)))
  })

  it('builds different layouts for different stages', () => {
    expect(JSON.stringify(buildTrack(7))).not.toBe(JSON.stringify(buildTrack(8)))
  })

  it('emits events in forward order', () => {
    for (const stage of STAGES) {
      const ys = track(stage).events.map((e) => e.y)
      expect([...ys].sort((a, b) => a - b), `stage ${stage} is out of order`).toEqual(ys)
    }
  })
})

describe('every gate bank is a commitment', () => {
  it('tiles the lane as doors separated by pillars', () => {
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        // The very first gate of the game is ONE lane-wide doorway: no choice,
        // no pillar, nothing to get wrong. Every other gate is a bank.
        if (isOpeningDoor(stage, bank)) {
          expect(bank.leaves[0]!.x).toBe(0)
          expect(bank.dividers, 'the opening gate has no pillar').toEqual([])
          continue
        }
        expect([2, 3], `stage ${stage} @${bank.y} has ${bank.leaves.length} doors`).toContain(
          bank.leaves.length
        )
        // One pillar in every gap between doors, and no others. The pillar is
        // what makes the choice a commitment rather than a preference.
        expect(bank.dividers.length, `stage ${stage} @${bank.y} pillars`).toBe(
          bank.leaves.length - 1
        )

        if (bank.leaves.length === 2) {
          expect(bank.leaves.map((l) => l.x)).toEqual([-GATE_LEAF_X, GATE_LEAF_X])
          for (const leaf of bank.leaves) expect(leaf.halfW).toBe(GATE_LEAF_HALF)
          expect(bank.dividers).toEqual([0])
        } else {
          // Three doors and two pillars, tiling the same nine units of lane.
          expect(bank.leaves.map((l) => l.x)).toEqual([-GATE3_LEAF_X, 0, GATE3_LEAF_X])
          for (const leaf of bank.leaves) expect(leaf.halfW).toBe(GATE3_LEAF_HALF)
          expect(bank.dividers).toEqual([-GATE3_DIVIDER_X, GATE3_DIVIDER_X])
        }
      }
    }
  })

  it('never offers two doors worth the same thing', () => {
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        const seen = new Set<string>()
        for (const leaf of bank.leaves) {
          const key = `${leaf.op}${leaf.value}`
          expect(
            seen.has(key),
            `stage ${stage} @${bank.y} is a coin flip: ${bank.leaves
              .map((l) => `${l.op}${l.value}`)
              .join(' | ')}`
          ).toBe(false)
          seen.add(key)
        }
      }
    }
  })

  it('always pairs a trap with something clearly good — unless it is a dilemma', () => {
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        const divs = bank.leaves.filter((l) => l.op === 'div')
        if (divs.length === 0) continue
        expect(divs.length, `stage ${stage} @${bank.y} is a toll booth`).toBe(1)
        // The one authorised exception: a bank where EVERY door takes
        // something. It is rationed by `legalise` (see the dilemma tests
        // below), and outside of it a trap must still be an offer.
        const dilemma = bank.leaves.every((l) => l.op === 'div' || l.op === 'sub')
        if (dilemma) continue
        expect(bank.leaves.some((l) => l.op === 'add' || l.op === 'mul')).toBe(true)
      }
    }
  })
})

describe('the -N door, and the bank with no right answer', () => {
  it('never bills a crowd that cannot pay — the opening road is bill-free', () => {
    // The bug this locks: a `-N` can reach ZERO, which no `÷N` can. An `-8` on
    // the first bank of stage 7 deleted a four-strong opening squad outright,
    // and the career study walled `average` at that stage on every purchasing
    // strategy — dying at 8 % of the road with every death charged to the door.
    for (const stage of STAGES) {
      const t = track(stage)
      const arenaY = Math.max(...t.events.map((e) => e.y))
      for (const bank of gateBanks(stage)) {
        if (!bank.leaves.some((l) => l.op === 'sub')) continue
        expect(bank.y, `stage ${stage} bills at ${bank.y}, before the crowd exists`)
          .toBeGreaterThan(arenaY * SUB_EARLIEST)
      }
    }
  })

  it('holds the subtraction back until traps have been taught', () => {
    // `÷2` punishes the door you walked through. `-N` punishes the door you
    // were AIMING at on the way in, which is a subtler rule and gets its own
    // stage of grace.
    for (const stage of [1, 2]) {
      for (const bank of gateBanks(stage)) {
        expect(bank.leaves.some((l) => l.op === 'sub'), `stage ${stage} bills too early`)
          .toBe(false)
      }
    }
  })

  it('offers one somewhere in the campaign, and never two in a bank', () => {
    let seen = 0
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        const subs = bank.leaves.filter((l) => l.op === 'sub')
        seen += subs.length
        expect(subs.length, `stage ${stage} @${bank.y} bills twice in one bank`)
          .toBeLessThanOrEqual(1)
        for (const s of subs) {
          expect(s.value, `stage ${stage} @${bank.y} bills for nothing`).toBeGreaterThan(0)
          expect(s.value).toBeLessThanOrEqual(GATE_SUB_MAX)
        }
      }
    }
    expect(seen, 'the campaign never bills anybody').toBeGreaterThan(0)
  })

  it('rations the dilemma: one a stage, never back to back, never before 4', () => {
    // A bank with no right answer is the hardest read in the game. It has to be
    // rare enough to stay a shock and regular enough to be learnable, and it
    // must never be the last thing between the player and the boss.
    let total = 0
    for (const stage of STAGES) {
      const banks = gateBanks(stage)
      const flags = banks.map((b) => b.leaves.every((l) => l.op === 'div' || l.op === 'sub'))
      const count = flags.filter(Boolean).length
      total += count
      expect(count, `stage ${stage} prints ${count} dilemmas`).toBeLessThanOrEqual(1)
      if (stage < 4) expect(count, `stage ${stage} is too early for a dilemma`).toBe(0)
      for (let i = 1; i < flags.length; i++) {
        expect(flags[i] && flags[i - 1], `stage ${stage} stacked two dilemmas`).toBeFalsy()
      }
      // Never the closing bank: a run should die to the climax, not to a toll
      // booth three seconds before it.
      if (count > 0) expect(flags[flags.length - 1], `stage ${stage} ends on a dilemma`).toBe(false)
    }
    expect(total, 'no stage in the campaign ever poses one').toBeGreaterThan(0)
  })

  it('never poses the same bad door twice in a dilemma', () => {
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        if (!bank.leaves.every((l) => l.op === 'div' || l.op === 'sub')) continue
        // Two doors, two different KINDS of cost — a fraction against a count.
        // Identical costs would make the pillar a pure tax for existing.
        expect(new Set(bank.leaves.map((l) => l.op)).size,
          `stage ${stage} @${bank.y} offers the same bad door twice`).toBe(2)
      }
    }
  })
})

describe('the three-leaf bank is a spike, not the default', () => {
  it('holds three-leaf banks until the player is fluent with two', () => {
    for (const stage of STAGES) {
      if (stage >= TRIPLE_STAGE) continue
      for (const bank of gateBanks(stage)) {
        expect(bank.leaves.length, `stage ${stage} @${bank.y} is too early for three doors`)
          .toBeLessThanOrEqual(2)
      }
    }
  })

  it('shows the player one on every stage that has met them', () => {
    for (const stage of STAGES) {
      if (stage < TRIPLE_STAGE) continue
      const triples = gateBanks(stage).filter((b) => b.leaves.length === 3)
      expect(triples.length, `stage ${stage} never shows a three-leaf bank`)
        .toBeGreaterThanOrEqual(1)
      expect(triples.length, `stage ${stage} overspends its triples`).toBeLessThanOrEqual(
        maxTriples(stage)
      )
    }
  })

  it('keeps two-leaf banks the majority on every stage', () => {
    for (const stage of STAGES) {
      const banks = gateBanks(stage).filter((b) => !isOpeningDoor(stage, b))
      const triples = banks.filter((b) => b.leaves.length === 3).length
      expect(triples * 2, `stage ${stage}: ${triples} of ${banks.length} banks are triples`)
        .toBeLessThan(banks.length)
    }
  })

  it('makes a triple ask three different KINDS of question', () => {
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        if (bank.leaves.length < 3) continue
        // Values are already asserted distinct above; a triple of three `add`
        // leaves would still be one question asked three times, so at least one
        // door has to be a multiplier or a trap.
        const ops = new Set(bank.leaves.map((l) => l.op))
        expect(
          ops.size,
          `stage ${stage} @${bank.y} is three of the same: ${bank.leaves
            .map((l) => `${l.op}${l.value}`)
            .join(' | ')}`
        ).toBeGreaterThanOrEqual(2)
        expect(bank.leaves.filter((l) => l.op === 'div').length).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('traps and multipliers arrive on schedule', () => {
  it('never puts a trap or a multiplier on stage 1', () => {
    for (const bank of gateBanks(1)) {
      for (const leaf of bank.leaves) expect(leaf.op).toBe('add')
    }
  })

  it('holds ÷3 until stage 4, ÷5 until stage 6 and ×3 until stage 8', () => {
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        for (const leaf of bank.leaves) {
          if (leaf.op === 'mul') expect(leaf.value === 2 || leaf.value === 3).toBe(true)
          if (leaf.op === 'mul' && leaf.value >= 3) expect(stage).toBeGreaterThanOrEqual(8)
          // Three rungs of trap, each with its own unlock. `÷3` is the middle
          // one — harsh enough to be a real decision, survivable enough to be
          // worth offering against something good.
          if (leaf.op === 'div') expect([2, 3, 5], `stage ${stage} rolled ÷${leaf.value}`)
            .toContain(leaf.value)
          if (leaf.op === 'div' && leaf.value === 3) expect(stage).toBeGreaterThanOrEqual(4)
          if (leaf.op === 'div' && leaf.value >= 5) expect(stage).toBeGreaterThanOrEqual(6)
        }
      }
    }
  })

  it('rations multipliers, and spends the one ×3 on a single bank', () => {
    for (const stage of STAGES) {
      if (stage < 6) continue // stages 1–5 are hand-placed and measured
      const leaves = gateBanks(stage).flatMap((b) => b.leaves)
      const muls = leaves.filter((l) => l.op === 'mul')
      expect(muls.length, `stage ${stage} compounds ${muls.length} multipliers`)
        .toBeLessThanOrEqual(mulLeaves(stage))
      // The `×3` budget grows with the road for the same reason `mulLeaves`
      // does: "exactly one, forever" gets rarer every stage in a campaign with
      // no end, and by stage 100 it was one spike in twenty banks.
      expect(muls.filter((l) => l.value >= 3).length, `stage ${stage} overspends its ×3 budget`)
        .toBeLessThanOrEqual(mulThrees(stage))
    }
  })

  it('never lands three trap banks in a row', () => {
    for (const stage of STAGES) {
      let run = 0
      for (const bank of gateBanks(stage)) {
        run = bank.leaves.some((l) => l.op === 'div') ? run + 1 : 0
        // Two in a row is pressure. Three is a stage that has stopped making
        // the player an offer and started charging them rent.
        expect(run, `stage ${stage} @${bank.y} is the third trap in a row`).toBeLessThanOrEqual(2)
      }
    }
  })

  it('never lands ÷5 in two consecutive banks', () => {
    for (const stage of STAGES) {
      let previousWasBig = false
      for (const bank of gateBanks(stage)) {
        const big = bank.leaves.some((l) => l.op === 'div' && l.value >= 5)
        expect(big && previousWasBig, `stage ${stage} @${bank.y} doubles down on ÷5`).toBe(false)
        previousWasBig = big
      }
    }
  })

  it('never opens a stage with a trap', () => {
    // A `÷N` on the first bank halves a crowd of three: not a decision, just a
    // reflex test with nothing built yet to lose.
    for (const stage of STAGES) {
      const floor = track(stage).arenaY * TRAP_EARLIEST
      for (const bank of gateBanks(stage)) {
        if (!bank.leaves.some((l) => l.op === 'div')) continue
        expect(bank.y, `stage ${stage} opens with a trap at ${bank.y}`).toBeGreaterThan(floor)
      }
    }
  })
})

describe('the road is always runnable', () => {
  it('leaves a crowd-wide gap in every barricade row', () => {
    for (const stage of STAGES) {
      for (const e of track(stage).events) {
        if (e.kind !== 'barricade') continue
        expect(
          widestGap(e.blocks),
          `stage ${stage} @${e.y} pinches the crowd`
        ).toBeGreaterThanOrEqual(Math.min(MIN_RUN_GAP, 2 * CROWD_MAX_R) - 1e-6)
      }
    }
  })
})

describe('a stage gives the run what it needs', () => {
  it('meets its supply floor, which grows with the length of the road', () => {
    for (const stage of STAGES) {
      const count = (kind: 'rate' | 'damage'): number =>
        track(stage).events.reduce(
          (n, e) => (e.kind === 'crates' ? n + e.crates.filter((c) => c.kind === kind).length : n),
          0
        )
      expect(count('rate'), `stage ${stage} cannot speed up`).toBeGreaterThanOrEqual(
        minRateCrates(stage)
      )
      expect(count('damage'), `stage ${stage} cannot hit harder`).toBeGreaterThanOrEqual(
        minDamageCrates(stage)
      )
    }
  })

  it('puts a miniboss on every stage from 2, a second from 6 and a third from 20', () => {
    expect(track(1).events.filter((e) => e.kind === 'miniboss')).toHaveLength(0)
    for (const stage of STAGES) {
      if (stage < 2) continue
      const want = stage >= MINIBOSS_STAGE_THIRD ? 3 : stage >= 6 ? 2 : 1
      const elites = track(stage).events.filter((e) => e.kind === 'miniboss')
      expect(elites.length, `stage ${stage} is short of elites`).toBeGreaterThanOrEqual(want)
      for (const elite of elites) {
        // Tanky enough to be a fight, and always inside the running section.
        expect(elite.kind === 'miniboss' && elite.hpScale).toBeGreaterThan(1)
        expect(elite.y).toBeLessThan(track(stage).arenaY)
      }
    }
  })
})

describe('the curve ramps for all thirty stages', () => {
  // The failure this catches is not a crash but a plateau: a knob that reaches
  // its cap at stage 11 and then says the same thing for twenty stages, which
  // is what "some stages are quite well balanced, some are not" actually looks
  // like in the numbers.
  const ramps: Array<[string, (s: number) => number]> = [
    ['packSize', packSize],
    ['barricadeHp', barricadeHp],
    ['crateHp(rate)', (s) => crateHp(s, 'rate')],
    ['trapChance', trapChance],
    ['minRateCrates', minRateCrates],
    ['gate banks', (s) => gateBanks(s).length]
  ]

  it('never lets a knob go backwards', () => {
    for (const [name, knob] of ramps) {
      for (const stage of STAGES) {
        if (stage === 1) continue
        expect(knob(stage), `${name} falls between stage ${stage - 1} and ${stage}`)
          .toBeGreaterThanOrEqual(name === 'gate banks' ? 0 : knob(stage - 1))
      }
    }
  })

  it('still has somewhere to go at stage 30', () => {
    for (const [name, knob] of ramps) {
      expect(knob(30), `${name} is flat across the second half of the game`).toBeGreaterThan(
        knob(15)
      )
    }
  })

  it('keeps tightening the beat gap forever, and never past readable', () => {
    // The one knob that goes DOWN, and the single biggest reason a stage-100
    // road used to feel like a stage-30 road: the floor was a flat 7 reached at
    // stage 30, so every endless stage beat identically. It now keeps closing
    // logarithmically toward a hard 5.2 — below about 5 the previous beat is
    // still on screen when the next arrives, which is not difficulty.
    for (const stage of STAGES) {
      if (stage === 1) continue
      expect(beatGap(stage, 0), `beatGap loosens at stage ${stage}`).toBeLessThanOrEqual(
        beatGap(stage - 1, 0)
      )
      expect(beatGap(stage, 1), `stage ${stage} beats faster than it can be read`)
        .toBeGreaterThanOrEqual(5.2)
    }
    expect(beatGap(30, 0), 'the beat gap plateaus before stage 30').toBeLessThan(beatGap(20, 0))
    // …and it is STILL moving deep into the endless road.
    expect(beatGap(120, 0), 'the beat gap stopped moving past the campaign')
      .toBeLessThan(beatGap(60, 0))
  })
})
