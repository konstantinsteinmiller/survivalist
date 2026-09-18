import { describe, expect, it } from 'vitest'
import {
  barricadeHp,
  beatGap,
  buildTrack,
  CAGE_TAKES,
  crateHp,
  maxTriples,
  minDamageCrates,
  minibossHp,
  minRateCrates,
  gateBandFor,
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
import { bossDesign, foeDef } from '@/game/foes'
import { adaptiveBossStage } from '@/game/adaptive'
import {
  BOSS_BASE_HP, bossGuardGates, gateMulOpen, SLAM_MAX_FRACTION, TUTORIAL_SLAM_FRACTION
} from '@/game/survival'
import {
  CRATE_R,
  CROWD_MAX_R,
  GATE3_DIVIDER_X,
  GATE3_LEAF_HALF,
  GATE3_LEAF_X,
  GATE_LEAF_HALF,
  GATE_LEAF_X,
  GATE_SUB_MAX,
  DIVIDER_HALF_W,
  UNIT_R,
  funnelRadius,
  LANE_HALF,
  ROCK_H
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

  it('shows the trap before the bill on the road that introduces them', () => {
    // `÷2` punishes the door you walked through. `-N` punishes the door you
    // were AIMING at on the way in, which is the subtler rule and goes second.
    //
    // ── This used to be "not before stage 3" ──
    //
    // The ORDER is the thing that matters; the stages were only how a
    // thirty-second opening got to teach one idea at a time. Stage 1 is seventy
    // seconds now (`STAGE_ONE_LENGTH`) and carries both, so the rule moved
    // inside it — and it is asserted on stage 1 alone, deliberately. Past the
    // road that introduces them both ops are vocabulary the player has, and the
    // generator orders them by the odds rather than by a lesson plan: stage 12
    // bills at 90 and traps at 139, which is not a bug to fix, it is what
    // "already taught" looks like.
    const banks = gateBanks(1).slice().sort((a, b) => a.y - b.y)
    const firstDiv = banks.find((b) => b.leaves.some((l) => l.op === 'div'))?.y
    const firstSub = banks.find((b) => b.leaves.some((l) => l.op === 'sub'))?.y
    expect(firstDiv, 'stage 1 no longer teaches the trap').toBeDefined()
    expect(firstSub, 'stage 1 no longer teaches the bill').toBeDefined()
    expect(firstSub!, `stage 1 bills at ${firstSub} before it has trapped`)
      .toBeGreaterThan(firstDiv!)
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

  it('rations the dilemma: one a stage, never back to back, never on stage 1', () => {
    // A bank with no right answer is the hardest read in the game. It has to be
    // rare enough to stay a shock and regular enough to be learnable, and it
    // must never be the last thing between the player and the boss.
    //
    // The floor was stage 4 and is now stage 2, because the rule it encoded —
    // "meet `−N` beside something worth having before meeting it beside a trap"
    // — moved from ACROSS stages to WITHIN one. Stages 2 and 3 run ~50 s and
    // eleven banks each; both introduce their bill beside a fat add sixty units
    // before the dilemma arrives, so the order is intact and the back half of
    // the road gets a question. Stage 1 still never poses one: it is the stage
    // that teaches what a door is.
    let total = 0
    for (const stage of STAGES) {
      const banks = gateBanks(stage)
      const flags = banks.map((b) => b.leaves.every((l) => l.op === 'div' || l.op === 'sub'))
      const count = flags.filter(Boolean).length
      total += count
      expect(count, `stage ${stage} prints ${count} dilemmas`).toBeLessThanOrEqual(1)
      if (stage < 2) expect(count, `stage ${stage} is too early for a dilemma`).toBe(0)
      // …and where one is posed EARLIER THAN STAGE 4, that stage must have shown
      // a bill beside an offer first. This is the onboarding order the old
      // stage-4 floor was standing in for, restated as the thing it was actually
      // protecting. From stage 4 it is the previous stages that have taught it,
      // which is why stage 4's own dilemma may be its first `−N`.
      if (stage < 4 && count > 0) {
        const dilemmaY = banks.find((bk) => bk.leaves.every((l) => l.op === 'div' || l.op === 'sub'))!.y
        const kindSub = banks.find((bk) =>
          bk.leaves.some((l) => l.op === 'sub') && bk.leaves.some((l) => l.op === 'add'))
        expect(kindSub, `stage ${stage} poses a dilemma having never billed beside an offer`)
          .toBeDefined()
        expect(kindSub!.y, `stage ${stage} poses its dilemma before its teaching bill`)
          .toBeLessThan(dilemmaY)
      }
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
  it('puts exactly one trap and one bill on stage 1, both after it has given', () => {
    // ── This used to read "never puts anything on stage 1 that can take" ──
    //
    // That was the right rule for a thirty-second road: give, teach, end. On a
    // seventy-second one it meant the back half of the opening asked nothing at
    // all, and the first door that could cost anything arrived on stage 2 with a
    // whole stage's crowd riding on it. Stage 1 carries both now — see
    // `stageOne` — and what is pinned instead is that they are RATIONED and
    // LATE: one of each, both past the point where the player has something to
    // lose, and each standing beside a door that pays.
    const banks = gateBanks(1)
    const { arenaY } = track(1)
    const hostile = banks.filter((b) => b.leaves.some((l) => l.op === 'div' || l.op === 'sub'))
    expect(hostile.length, 'stage 1 asks the same hard question more than twice').toBe(2)
    expect(banks.filter((b) => b.leaves.some((l) => l.op === 'div')).length).toBe(1)
    expect(banks.filter((b) => b.leaves.some((l) => l.op === 'sub')).length).toBe(1)

    for (const bank of hostile) {
      // Never in the opening stretch: a door that costs, met before the player
      // has been given anything, is a punishment for turning up.
      expect(bank.y / arenaY, `stage 1 takes at ${Math.round(bank.y / arenaY * 100)}% of the road`)
        .toBeGreaterThan(0.33)
      // …and always beside something worth crossing for (`legalise` rule 5).
      expect(bank.leaves.some((l) => l.op === 'add' || l.op === 'mul'),
        'a stage-1 bank costs on both doors').toBe(true)
    }
    // The trap is the soft one and the bill is small: this is the road they are
    // being introduced on, not a road they are being tested on.
    const div = banks.flatMap((b) => b.leaves).filter((l) => l.op === 'div')
    for (const d of div) expect(d.value, `stage 1 trapped for ÷${d.value}`).toBe(2)
    const sub = banks.flatMap((b) => b.leaves).filter((l) => l.op === 'sub')
    for (const x of sub) expect(x.value, `stage 1 billed for -${x.value}`).toBeLessThanOrEqual(3)

    // Every multiplier is a x2 — stage 1 never sees a x3 — and no bank offers
    // two of them: a x2 against a x2 is the same non-decision as `+7 | +8`,
    // which is the shape rule 4b in `legalise` exists to remove.
    const muls = banks.flatMap((b) => b.leaves.filter((l) => l.op === 'mul'))
    expect(muls.length).toBeGreaterThan(0)
    // The OPEN value of a x2 door, not the headline: a multiplier arrives at
    // four fifths of what it is called and is pumped back up (`gateMulOpen`).
    for (const m of muls) expect(m.value).toBe(gateMulOpen(2))
    for (const bank of banks) {
      expect(bank.leaves.filter((l) => l.op === 'mul').length).toBeLessThanOrEqual(1)
    }

    // And one of them lands late: the swell is the pay-off the stage builds to.
    const swell = banks.filter((b) => b.leaves.some((l) => l.op === 'mul')).at(-1)!
    expect(swell.y).toBeGreaterThan(track(1).arenaY * 0.6)
  })

  it('holds ÷3 until stage 4, ÷5 until stage 6 and ×3 until stage 8', () => {
    for (const stage of STAGES) {
      for (const bank of gateBanks(stage)) {
        for (const leaf of bank.leaves) {
          // Doors are on the road at their OPEN value, so the schedule is
          // asserted there: a `x3` is a `x2.4` until the crowd shoots it.
          if (leaf.op === 'mul') {
            expect([gateMulOpen(2), gateMulOpen(3)], `stage ${stage} rolled ×${leaf.value}`)
              .toContain(leaf.value)
          }
          if (leaf.op === 'mul' && leaf.value >= gateMulOpen(3)) {
            expect(stage).toBeGreaterThanOrEqual(8)
          }
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

describe('a bank owns the road either side of it', () => {
  // Reported from stage 12: two boulders sat just past the left leaf of a bank,
  // the second hidden behind that leaf's own curtain and number, and the run
  // lost 90 % of its squad to a thing it never had the chance to see.
  //
  // Two faults in one report, and they need different sized answers.
  //
  // A BOULDER cannot be shot. Meeting one in a leaf's exit path is not a
  // routing question — the crowd comes out of a door funnelled to that leaf's
  // width and pinned to its x, with no steering left — so it is a toll, and the
  // game already has a hazard for "you chose wrong" that the player can read a
  // long way out. Its band is wide, and asymmetric: the exit needs more road
  // than the approach, because on the way in the crowd is still spread and
  // still steerable.
  //
  // A CRATE can always be shot, and shooting it pays. The complaint there was
  // that one drawn half-behind a gate "just looks like a bug" — a readability
  // fault, which stops the moment the two props do not overlap on screen. Its
  // band is therefore small and symmetric. Sizing it like a boulder's was
  // measured and reverted: it moved a third of every crate on the road and cost
  // the benchmark player stage 4 outright.
  //
  // Both are enforced by `clearGateBands`, a post-pass over the finished road —
  // the only place that can see every bank, including the ones `fillGateGaps`
  // adds after the obstacles were placed.
  const bandOf = (stage: number, y: number, kind: 'rocks' | 'crates'): [number, number] =>
    gateBandFor(stage, y, kind)

  it('keeps every boulder out of every gate band, at every stage', () => {
    for (const stage of STAGES) {
      const t = track(stage)
      const banks = t.events.filter((e) => e.kind === 'gates').map((e) => e.y)
      for (const e of t.events) {
        // A passage rib is rocks laid deliberately INTO a bank: it is the wall
        // that makes a door a corridor, the player reads it as one shape with
        // the gate, and it is the one thing the band does not apply to.
        if (e.kind !== 'rocks' || e.passage) continue
        const half = ROCK_H / 2
        for (const y of banks) {
          const [lo, hi] = bandOf(stage, y, 'rocks')
          expect(
            e.y + half <= lo + 1e-6 || e.y - half >= hi - 1e-6,
            `stage ${stage}: boulders @${e.y} sit inside the band of the bank @${y} `
            + `[${lo.toFixed(2)}, ${hi.toFixed(2)}]`
          ).toBe(true)
        }
      }
    }
  })

  it('keeps every crate from being drawn on top of a gate', () => {
    for (const stage of STAGES) {
      const t = track(stage)
      const banks = t.events.filter((e) => e.kind === 'gates').map((e) => e.y)
      for (const e of t.events) {
        if (e.kind !== 'crates') continue
        for (const y of banks) {
          const [lo, hi] = bandOf(stage, y, 'crates')
          expect(
            e.y + CRATE_R <= lo + 1e-6 || e.y - CRATE_R >= hi - 1e-6,
            `stage ${stage}: crates @${e.y} overlap the bank @${y} `
            + `[${lo.toFixed(2)}, ${hi.toFixed(2)}]`
          ).toBe(true)
        }
      }
    }
  })

  it('moves a boulder field as one body, keeping its ranks offset', () => {
    // The 3.2 units between a field's two ranks ARE the beat — commit to a
    // line, then change it. Moving one rank out of a band and leaving the other
    // would collapse that into a single double-thick wall, which is a harder
    // hazard than the one that was authored.
    for (const stage of STAGES) {
      const fields = new Map<number, number[]>()
      for (const e of track(stage).events) {
        if (e.kind !== 'rocks' || e.field === undefined) continue
        const ys = fields.get(e.field) ?? []
        ys.push(e.y)
        fields.set(e.field, ys)
      }
      for (const [id, ys] of fields) {
        if (ys.length < 2) continue
        ys.sort((p, q) => p - q)
        expect(
          ys[1]! - ys[0]!,
          `stage ${stage}: field ${id} ranks drifted to ${(ys[1]! - ys[0]!).toFixed(2)} apart`
        ).toBeCloseTo(3.2, 2)
      }
    }
  })

  it('never shoves an obstacle off either end of the road', () => {
    // The sweep may only ever move something to a place a player will reach.
    // Before the first beat the run has not started; past the arena is the boss.
    for (const stage of STAGES) {
      const t = track(stage)
      for (const e of t.events) {
        if (e.kind !== 'rocks' && e.kind !== 'crates') continue
        expect(e.y, `stage ${stage}: ${e.kind} pushed to ${e.y}`).toBeGreaterThanOrEqual(6)
        expect(e.y, `stage ${stage}: ${e.kind} pushed to ${e.y}`).toBeLessThanOrEqual(t.arenaY - 4)
      }
    }
  })

  it('moves the FILLER bank rather than the beat somebody authored', () => {
    // `fillGateGaps` drops banks into long quiet stretches for pacing. On stage
    // 4 its filler landed dead centre at y=39, one unit from the rate crate the
    // stage deliberately parks past the chicane at y=38 — and the sweep then
    // correctly, and disastrously, moved the CRATE. That crate is the whole
    // reason the chicane spits the crowd out on the right; shifting it cost the
    // benchmark run stage 4. A filler is pacing, not intent: it yields.
    const t = track(4)
    const crate = t.events.find((e) => e.kind === 'crates' && e.crates[0]?.kind === 'rate')
    expect(crate?.y, 'stage 4 keeps its authored rate crate at y=38').toBe(38)
  })
})

describe('a stage gives the run what it needs', () => {
  it('meets its supply floor, which grows with the length of the road', () => {
    for (const stage of STAGES) {
      const t = track(stage)
      const count = (kind: 'rate' | 'damage'): number =>
        t.events.reduce(
          (n, e) => (e.kind === 'crates' ? n + e.crates.filter((c) => c.kind === kind).length : n),
          0
        )
      // ── …less the one box a rescue cage stands in for ──
      //
      // A cage REPLACES a supply crate rather than joining them (`CAGE_TAKES`),
      // and it is retired after the floor has been topped up on purpose — run
      // before, the floor would simply put it back. So a stage that carries a
      // cage ships exactly one `CAGE_TAKES` crate under its floor, and this is
      // the line that says so rather than pretending the floor still holds.
      const caged = t.events.some((e) => e.kind === 'cages')
      const floor = (kind: 'rate' | 'damage', min: number): number =>
        caged && kind === CAGE_TAKES ? min - 1 : min
      expect(count('rate'), `stage ${stage} cannot speed up`).toBeGreaterThanOrEqual(
        floor('rate', minRateCrates(stage))
      )
      expect(count('damage'), `stage ${stage} cannot hit harder`).toBeGreaterThanOrEqual(
        floor('damage', minDamageCrates(stage))
      )
    }
  })

  it('takes exactly one box off the road for every cage it puts on', () => {
    // The trade, stated as a trade. `buildTrack` is compared against itself with
    // the cage's crate counted back in: every caged stage is one `CAGE_TAKES`
    // crate short of its floor-or-better and not two, so a future pass cannot
    // quietly make a cage cost the stage more than the box it replaced.
    for (const stage of STAGES) {
      const t = track(stage)
      if (!t.events.some((e) => e.kind === 'cages')) continue
      const taken = t.events.reduce(
        (n, e) => (e.kind === 'crates' ? n + e.crates.filter((c) => c.kind === CAGE_TAKES).length : n),
        0
      )
      const min = CAGE_TAKES === 'rate' ? minRateCrates(stage) : minDamageCrates(stage)
      expect(taken, `stage ${stage} lost more than one ${CAGE_TAKES} crate to its cage`)
        .toBeGreaterThanOrEqual(min - 1)
    }
  })

  it('gives stage 1 two weakened elites, one per half of the road', () => {
    // ── This used to read "exactly one weakened elite" ──
    //
    // It was one because the road was thirty seconds long, and the road was
    // thirty seconds long because a 500-player Poki fit test put 64 % of
    // sessions under two minutes. What that missed is WHERE the session ends:
    // measured on the live build the median exit is ~35 s in and lands right
    // after the first boss dies, so the short road moved the exit earlier
    // rather than removing it. The opening is now a ~70 s round trip
    // (`STAGE_ONE_LENGTH`), and a seventy-second road with one landmark on it
    // is a minute of nothing followed by a fight.
    //
    // Two, and they are not the same beat: the first is the grenade lesson (it
    // is armed on the road's FIRST elite), the second is the same fight with
    // the grenade spent, answered with the crowd's own guns.
    const elites = track(1).events.filter((e) => e.kind === 'miniboss')
    expect(elites).toHaveLength(2)
    for (const e of elites) expect(e.kind === 'miniboss' && e.hpScale).toBeGreaterThan(0)

    const ys = elites.map((e) => e.y).sort((a, c) => a - c)
    const { arenaY } = track(1)
    // One in each half, and the second still has road after it: the player beats
    // the small one, runs, and then meets the big one in the arena.
    expect(ys[0]!, 'the first elite is not in the first half').toBeLessThan(arenaY * 0.5)
    expect(ys[0]!, 'the first elite lands before the player has built anything')
      .toBeGreaterThan(arenaY * 0.25)
    expect(ys[1]!).toBeGreaterThan(arenaY * 0.7)
    expect(ys[1]!).toBeLessThan(arenaY)
  })

  it('makes the stage-1 boss the same body as the elite on that road', () => {
    // Same rule as stage 2, one stage earlier: the first big thing a player
    // ever meets is not a new silhouette. They beat a small one at the end of
    // the road and meet it again, bigger, in the arena — "I know what that is"
    // rather than "what is that".
    const elite = track(1).events.find((e) => e.kind === 'miniboss')
    expect(elite).toBeDefined()
    const typeId = elite && elite.kind === 'miniboss' ? elite.typeId : ''
    expect(foeDef(typeId).designs[0]).toBe(bossDesign(1))
  })

  it('shapes the stage-1 boss as a victory lap, not as a test', () => {
    // Its HEALTH used to be asserted here, against a flat `tutorialBossHp`. It
    // no longer has one: stage 1 is inside the adaptive band, so the bar is
    // priced at the arena door against the crowd that reached it, and the
    // "cannot lose your first climax" guarantee is bought by the ladder's
    // bottom rung instead of by a constant. `tests/game/adaptiveBoss.test.ts`
    // asserts that contract; what stays here is the part that is still authored
    // — the SHAPE of the fight, which no amount of adaptation touches.
    expect(adaptiveBossStage(1)).toBe(true)

    // One guard phase, not the usual two: the gate is what stops a well-played
    // squad deleting it in half a second, and two is where the slams came from.
    expect(bossGuardGates(1)).toHaveLength(1)
    expect(bossGuardGates(2)).toHaveLength(2)
    // And its swing is NOT a token. It was one (0.08) until a crowd of 99 stood
    // under the first boss without dodging and lost 2-4 a strike; a telegraph
    // that costs nothing teaches that telegraphs are decoration. It is the
    // ordinary share now, softened only by the beginner's cut stages 2-3 get.
    expect(TUTORIAL_SLAM_FRACTION).toBeGreaterThanOrEqual(SLAM_MAX_FRACTION)
  })

  it('makes the stage-2 boss the same body as the elite on that road', () => {
    // The first boss a player ever meets is not a new silhouette: they beat a
    // small one halfway down stage 2 and meet it again, bigger, at the end.
    const elite = track(2).events.find((e) => e.kind === 'miniboss')
    expect(elite).toBeDefined()
    const typeId = elite && elite.kind === 'miniboss' ? elite.typeId : ''
    // Minibosses spawn as `designs[0]` of their archetype.
    expect(foeDef(typeId).designs[0]).toBe(bossDesign(2))
  })

  it('puts a miniboss on every stage from 2, a second from 6 and a third from 20', () => {
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

// ─── Where the doors actually are ───────────────────────────────────────────
//
// The shape test above compares the generator's output against the same
// constants the generator reads, so it is true by construction and cannot see a
// wrong constant. This block checks the constants against the LANE — the thing
// they are supposed to describe — which is the only level at which this was
// visible.
//
// It was not visible for a long time. `GATE3_LEAF_X` held 2.66, the door's
// WIDTH, in the slot that holds its CENTRE (the correct value is 3.16). Three
// symptoms, none of which points here:
//   • the three painted frames butted together with doubled, offset posts;
//   • the hazard pillar stood inside the outer doorway instead of between two;
//   • and the outer door's safe aiming band was ZERO units wide with its
//     painted centre 0.4 outside it, so aiming at an outer door exactly where
//     it is drawn always clipped the pillar and shed survivors.
describe('gate bank geometry, against the lane rather than against itself', () => {
  /** Doors and pillars for a bank, left to right, as [lo, hi] spans. */
  const layout = (leafXs: readonly number[], halfW: number, dividerXs: readonly number[]) => ({
    doors: leafXs.map((x) => [x - halfW, x + halfW] as const),
    pillars: dividerXs.map((x) => [x - DIVIDER_HALF_W, x + DIVIDER_HALF_W] as const)
  })

  const BANKS = {
    'two-leaf': layout([-GATE_LEAF_X, GATE_LEAF_X], GATE_LEAF_HALF, [0]),
    'three-leaf': layout(
      [-GATE3_LEAF_X, 0, GATE3_LEAF_X], GATE3_LEAF_HALF, [-GATE3_DIVIDER_X, GATE3_DIVIDER_X]
    )
  } as const

  // 0.02 rather than an exact match: the constants are authored to two
  // decimals, so a three-leaf bank's 8/6 door half-width is 1.33 and the row
  // lands 0.01 short of each rail. That is rounding. Half a door is not.
  const TOL = 0.02

  it.each(Object.entries(BANKS))(
    '%s: doors and pillars sit edge to edge, with no gap and no overlap', (_name, bank) => {
      // Walk the bank left to right — door, pillar, door, … — and require each
      // part to start exactly where the previous one ended. A door centre
      // holding a door WIDTH breaks this twice over: the doors run together
      // with no pillar gap between them, and each pillar then lands half a
      // unit inside the door beside it.
      const parts = [...bank.doors, ...bank.pillars].sort((a, b) => a[0] - b[0])
      for (let i = 1; i < parts.length; i++) {
        expect(Math.abs(parts[i]![0] - parts[i - 1]![1]), `part ${i} starts where part ${i - 1} ends`)
          .toBeLessThan(TOL)
      }
      // …and the whole bank stays on the road. (It need not REACH the rails:
      // a two-leaf bank deliberately keeps a 0.15 margin at each one.)
      expect(parts[0]![0]).toBeGreaterThanOrEqual(-LANE_HALF - TOL)
      expect(parts[parts.length - 1]![1]).toBeLessThanOrEqual(LANE_HALF + TOL)
    }
  )

  it('a three-leaf bank fills the lane, which is where its door width comes from', () => {
    // Its arithmetic is "9 units of lane, minus two 0.5-wide pillars, over
    // three doors". If the row no longer reaches the rails, that division has
    // stopped describing the thing it divides.
    const bank = BANKS['three-leaf']
    expect(Math.abs(bank.doors[0]![0] - -LANE_HALF)).toBeLessThan(TOL)
    expect(Math.abs(bank.doors[bank.doors.length - 1]![1] - LANE_HALF)).toBeLessThan(TOL)
  })

  /**
   * The widest strip of a door a crowd's CENTRE may occupy without touching a
   * pillar, in world units.
   *
   * Modelled by subtraction rather than by inspecting the door's edges: take
   * the door, delete every pillar (grown by `UNIT_R`, because pillars kill on
   * contact), keep the widest piece left, then shrink it by the funnelled
   * crowd's own half-width. Doing it edge-wise instead assumes the pillar sits
   * OUTSIDE the door — which is exactly the assumption the bug violated, so the
   * check would have inherited the bug and reported a healthy 0.50.
   */
  const safeBand = (
    door: readonly [number, number], pillars: readonly (readonly [number, number])[]
  ): number => {
    const halfW = (door[1] - door[0]) / 2
    let pieces: Array<[number, number]> = [[door[0], door[1]]]
    for (const [plo, phi] of pillars) {
      const lo = plo - UNIT_R
      const hi = phi + UNIT_R
      pieces = pieces.flatMap(([a, b]): Array<[number, number]> => {
        if (hi <= a || lo >= b) return [[a, b]]           // no overlap
        const left: Array<[number, number]> = lo > a ? [[a, lo]] : []
        const right: Array<[number, number]> = hi < b ? [[hi, b]] : []
        return [...left, ...right]
      })
    }
    const widest = pieces.reduce((m, [a, b]) => Math.max(m, b - a), 0)
    return widest - 2 * funnelRadius(halfW)
  }

  it.each(Object.entries(BANKS))(
    '%s: every door can be entered by aiming at where it is drawn', (_name, bank) => {
      for (const door of bank.doors) {
        const centre = (door[0] + door[1]) / 2
        expect(safeBand(door, bank.pillars), `door at ${centre.toFixed(2)} has no room to aim into`)
          .toBeGreaterThan(0.1)
      }
    }
  )

  it('a three-leaf outer door is no meaner to aim at than a two-leaf one', () => {
    // The regression would have read as "narrower, but still passable". It was
    // not passable — the band was zero — and a ratio like this says so out loud.
    const three = BANKS['three-leaf']
    const two = BANKS['two-leaf']
    expect(safeBand(three.doors[2]!, three.pillars))
      .toBeGreaterThanOrEqual(safeBand(two.doors[1]!, two.pillars) - 1e-9)
  })
})
