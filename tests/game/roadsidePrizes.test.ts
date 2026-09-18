/**
 * ─── The two roadside prizes ────────────────────────────────────────────────
 *
 * A rescue cage pays PEOPLE and an auto-shield box pays ONE ABSORB, and between
 * them they are the second and third reasons the road gives a player to leave
 * the racing line. Both are new entity types, so most of what could go wrong
 * with them is invisible from inside the game: a prop that quietly lands on the
 * centre line hands out free crowd to a player who never steers, and a
 * threshold that is a percentage with no floor spends a one-shot pickup on a
 * survivor clipping a barricade.
 *
 * Three groups, in the order the player meets them:
 *
 *   THE PAYOUT     what a cage is worth, measured against the door it competes
 *                  with rather than against itself.
 *   THE PLACEMENT  where the generator is allowed to put them — and, the part
 *                  that is load-bearing, where it is not.
 *   THE ABSORB     what counts as a "big blow", pinned at the boundaries the
 *                  feature was specified with, and then proved end to end
 *                  through the real `step()` loop rather than asserted about
 *                  the arithmetic alone.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  BULWARK_FLOOR, BULWARK_R, BULWARK_SHARE, CAGE_R, CAGE_RESCUE_BASE, CROWD_MAX_R, LANE_HALF, UNIT_R
} from '@/game/survival'
import {
  BULWARK_STAGE, CAGE_BANK_LEAD, CAGE_STAGE,
  buildTrack, cageSurvivors, gateAddBase, type TrackEvent
} from '@/game/track'
import { drainFx } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')
const STEP_MS = 16

/** Deep enough to cover the authored campaign and a long way past it. */
const DEEP = 80

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/**
 * The ROADSIDE cages — the prizes this file is about.
 *
 * Deliberately excludes the sealed one beside every elite (`Cage.sealed`). That
 * is not a roadside prize and every rule in this file would be wrong about it:
 * it is not on the road (`REWARD_CAGE_X` puts it past the rail), it is not
 * rolled by `placeRescues`, it cannot be shot open at any price, and it is not
 * one-per-stage. It is the elite's reward, and it has its own spec.
 */
const cagesOf = (stage: number): Array<Extract<TrackEvent, { kind: 'cages' }>> =>
  buildTrack(stage).events
    .filter((e): e is Extract<TrackEvent, { kind: 'cages' }> => e.kind === 'cages')
    .map((e) => ({ ...e, cages: e.cages.filter((c) => c.sealed !== true) }))
    .filter((e) => e.cages.length > 0)

const bulwarksOf = (stage: number): Array<Extract<TrackEvent, { kind: 'bulwarks' }>> =>
  buildTrack(stage).events.filter(
    (e): e is Extract<TrackEvent, { kind: 'bulwarks' }> => e.kind === 'bulwarks'
  )

// ─── The payout ─────────────────────────────────────────────────────────────

describe('what a cage is worth', () => {
  it('pays the roadmap\'s +5 on the stage cages first appear', () => {
    // The curve is not a departure from the brief, it is the brief expressed as
    // a ratio — and this is the assertion that says so. If a future pass moves
    // `gateAddBase` or `CAGE_GATE_SHARE` far enough that the debut stage stops
    // paying five, the number the feature was specified with has silently
    // changed and somebody should have to say that out loud.
    expect(cageSurvivors(CAGE_STAGE)).toBe(CAGE_RESCUE_BASE)
  })

  it('never pays less than the flat number it replaced', () => {
    for (let s = CAGE_STAGE; s <= DEEP; s++) {
      expect(cageSurvivors(s), `stage ${s} pays under the floor`)
        .toBeGreaterThanOrEqual(CAGE_RESCUE_BASE)
    }
  })

  it('keeps up with the doors instead of decaying against them', () => {
    // The whole reason for the curve. A flat +5 is 63 % of what a stage-6 door
    // prints and 12 % of what a stage-60 one does, so the detour is worth five
    // times less at depth while costing exactly the same lane position. Pinning
    // the RATIO rather than the values is what keeps that true through a
    // re-pricing of the gates.
    for (let s = CAGE_STAGE; s <= DEEP; s++) {
      const ratio = cageSurvivors(s) / gateAddBase(s)
      expect(ratio, `stage ${s}: a cage is ${(ratio * 100).toFixed(0)} % of a door`)
        .toBeGreaterThan(0.35)
    }
  })

  it('never out-pays the door it is standing next to', () => {
    // If it did, the cage would not be a detour — it would be the correct line,
    // and the bank beside it would be the thing you skip.
    for (let s = CAGE_STAGE; s <= DEEP; s++) {
      expect(cageSurvivors(s), `stage ${s}: a cage beats the bank it competes with`)
        .toBeLessThan(gateAddBase(s))
    }
  })

  it('climbs, and never falls back', () => {
    for (let s = CAGE_STAGE + 1; s <= DEEP; s++) {
      expect(cageSurvivors(s), `stage ${s} pays less than stage ${s - 1}`)
        .toBeGreaterThanOrEqual(cageSurvivors(s - 1))
    }
  })
})

// ─── The placement ──────────────────────────────────────────────────────────

describe('where the road puts them', () => {
  it('keeps the shield box out of the taught stages, and rolls no cage into them', () => {
    // ── Stage 1's cages are AUTHORED, and that is the distinction ──
    //
    // This used to assert that stage 1 carried no cage at all. It carries two
    // now, hand-priced at 4 and 12 in `stageOne` — the same way its crate wall
    // is pinned at 1 — because a seventy-second opening has room to introduce
    // the one prop whose payout cannot be guessed by looking at it.
    //
    // What `CAGE_STAGE` still means, and what is pinned here, is that the
    // GENERATOR puts none there: `placeRescues` is the thing that could drop a
    // third one onto a road whose beats are measured, and it still starts at
    // stage 2.
    const authored = cagesOf(1).flatMap((e) => e.cages.map((c) => c.hp)).sort((a, b) => a - b)
    expect(authored, 'stage 1 lost its teaching cages').toEqual([4, 12])
    expect(cagesOf(1).length, 'the generator added a cage to stage 1').toBe(2)

    for (let s = 1; s < BULWARK_STAGE; s++) {
      expect(bulwarksOf(s), `stage ${s} grew a shield box`).toEqual([])
    }
  })

  it('never places one where a crowd on the centre line could take it', () => {
    // THE load-bearing invariant. `tests/sim/balance.test.ts` pins that a run
    // which never touches the screen must not reliably clear the taught stages,
    // and a prize a stationary crowd collects for free is exactly how that
    // stops being true — quietly, on every stage at once.
    //
    // Measured against the crowd's own body rather than against a magic number:
    // a full-size crowd centred at x = 0 reaches `CROWD_MAX_R + UNIT_R`, and the
    // prop's own half-extent has to clear that with room left over.
    const reach = CROWD_MAX_R + UNIT_R
    // From stage 1, not from `CAGE_STAGE`: the two hand-placed ones on the
    // teaching road owe this more than any other cage in the game, because
    // stage 1 is the stage a run that never steers is allowed to survive.
    for (let s = 1; s <= DEEP; s++) {
      for (const e of cagesOf(s)) {
        for (const c of e.cages) {
          expect(Math.abs(c.x) - CAGE_R, `stage ${s}: a cage at x=${c.x} is inside a centred crowd`)
            .toBeGreaterThan(reach)
        }
      }
      for (const e of bulwarksOf(s)) {
        for (const w of e.bulwarks) {
          expect(Math.abs(w.x) - BULWARK_R, `stage ${s}: a shield box at x=${w.x} is inside a centred crowd`)
            .toBeGreaterThan(reach)
        }
      }
    }
  })

  it('stands each prize in the approach to a bank, on the shoulder away from its best door', () => {
    // The beat, stated as a test: the prize is not "somewhere off to the side",
    // it is in the stretch of road the player would otherwise be spending on a
    // specific door, on the side that door is not.
    for (let s = CAGE_STAGE; s <= DEEP; s++) {
      const track = buildTrack(s)
      const banks = track.events.filter(
        (e): e is Extract<TrackEvent, { kind: 'gates' }> => e.kind === 'gates'
      )
      const prizes: Array<{ x: number; y: number }> = []
      for (const e of cagesOf(s)) for (const c of e.cages) prizes.push({ x: c.x, y: e.y })
      for (const e of bulwarksOf(s)) for (const w of e.bulwarks) prizes.push({ x: w.x, y: e.y })

      for (const p of prizes) {
        // The lead flexes a little when the road is congested (see `place`), so
        // the window is the authored lead plus the offsets it is allowed.
        const owner = banks.find((b) => b.y - p.y >= CAGE_BANK_LEAD - 1.6
          && b.y - p.y <= CAGE_BANK_LEAD + 5.1)
        expect(owner, `stage ${s}: the prize at y=${p.y} is not in front of any bank`)
          .toBeDefined()
        // …and it is not on the same side as any leaf sitting on that shoulder,
        // which is the weakest honest form of "away from the best door": the
        // bank's ranking is the generator's business, but a prize sharing a
        // shoulder with the door it is supposed to be competing with would make
        // the whole beat a straight line.
        const sameSide = owner!.leaves.some((leaf) => leaf.x !== 0
          && Math.sign(leaf.x) === Math.sign(p.x)
          && owner!.leaves.length > 1)
        // A two-leaf bank always has a leaf on each shoulder, so this only bites
        // when the bank is one-sided — which is the case that would be wrong.
        if (owner!.leaves.length === 1) {
          expect(sameSide, `stage ${s}: the prize at y=${p.y} shares its shoulder with the only door`)
            .toBe(false)
        }
      }
    }
  })

  it('gives almost every stage past the debut a cage, and declines rather than jamming one in', () => {
    // Not "every stage", deliberately. `placeRescues` refuses a spot that would
    // sit on a wall, inside a bank's readability band or across the weapon
    // puzzle's firing lanes, and a road with nowhere honest to put a prop should
    // ship without one — the same way `rollPair` declines itself. What must not
    // happen is that becoming common.
    let with_ = 0
    let total = 0
    for (let s = CAGE_STAGE; s <= DEEP; s++) {
      total++
      if (cagesOf(s).length > 0) with_++
    }
    expect(with_ / total, `only ${with_} of ${total} stages carry a cage`).toBeGreaterThan(0.9)
  })

  it('keeps the shield box in the run-in, where the fight it insures is', () => {
    // Its entire design is "carry it into the arena". A box at a quarter of the
    // road is a box whose absorb is spent on a barricade long before the boss,
    // which is a different pickup wearing the same art.
    for (let s = BULWARK_STAGE; s <= DEEP; s++) {
      const track = buildTrack(s)
      for (const e of bulwarksOf(s)) {
        const at = e.y / track.arenaY
        expect(at, `stage ${s}: the shield box sits at ${(at * 100).toFixed(0)} % of the road`)
          .toBeGreaterThan(0.5)
      }
    }
  })

  it('never gives a stage more than one of each', () => {
    for (let s = CAGE_STAGE; s <= DEEP; s++) {
      const cages = cagesOf(s).reduce((n, e) => n + e.cages.length, 0)
      const boxes = bulwarksOf(s).reduce((n, e) => n + e.bulwarks.length, 0)
      expect(cages, `stage ${s} has ${cages} cages`).toBeLessThanOrEqual(1)
      expect(boxes, `stage ${s} has ${boxes} shield boxes`).toBeLessThanOrEqual(1)
    }
  })
})

// ─── The rescue ─────────────────────────────────────────────────────────────

describe('breaking a cage', () => {
  it('hands the crowd exactly the survivors that were in it', async () => {
    const game = await importGame()
    game.startStage(CAGE_STAGE)
    // Enough firepower that the box comes apart at range rather than under the
    // crowd's feet — this spec is about the PAYOUT, and a cage broken by driving
    // into it also bills the contact toll on the same tick.
    game.debugAddUnits(120)
    game.debugAddDamage(120)
    game.debugAddFireRate(3)

    let paid = -1
    let deltaOnBreak = 0
    let lostOnBreak = 0
    for (let i = 0; i < 6000 && paid < 0 && game.phase.value === 'run'; i++) {
      // Steer at whichever cage is on the road; hold the middle until one shows.
      // `!c.warden`: every boss now stands in front of an unbreakable cage
      // holding the next stage's squad (`Cage.warden`), and it is the first
      // entry in the array. Steering at THAT is steering at something three
      // hundred units away that can never be opened.
      //
      // `!c.sealed` too: since stage 2 was re-cut into acts (2026-09-18) its
      // roadside cage stands AFTER the first elite, whose own cage — in the
      // verge at `REWARD_CAGE_X`, opened by the kill and holding
      // `minibossCageHold` — is the first to break on the road. This spec is
      // about the roadside one, so a break only counts inside the lane.
      const cage = game.getCages().find((c) => !c.dead && !c.warden && !c.sealed)
      game.steerTo(cage ? cage.x : 0)
      const before = game.squadCount.value
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind === 'cageBreak' && Math.abs(e.x) < LANE_HALF) {
          paid = e.count
          deltaOnBreak = game.squadCount.value - before
        }
        if (e.kind === 'unitLost') lostOnBreak++
      }
      if (paid < 0) lostOnBreak = 0
    }

    expect(paid, 'no cage was ever broken on the road').toBeGreaterThan(0)
    expect(paid, 'the cage paid something other than its authored head count')
      .toBe(cageSurvivors(CAGE_STAGE))
    // The crowd grew by what got out, minus anything that died in the same tick
    // from anything else on the road. Stated this way rather than as a bare
    // delta because the road does not stop while a box breaks.
    expect(deltaOnBreak + lostOnBreak, 'the payout did not reach the crowd').toBe(paid)
  }, 60_000)
})

// ─── The absorb ─────────────────────────────────────────────────────────────

describe('what counts as a big blow', () => {
  it('is a share of the crowd, not a flat number', async () => {
    const { isBigBlow } = await importGame()
    // Four percent of a hundred is under, six is over. This is the spec's own
    // boundary and it is asserted at both sides of it so a change of comparison
    // (`>=` for `>`) cannot pass.
    expect(isBigBlow(4, 100)).toBe(false)
    expect(isBigBlow(6, 100)).toBe(true)
    // …and exactly on the line is NOT a big blow: the rule is "more than".
    expect(isBigBlow(5, 100)).toBe(false)
  })

  it('never spends itself on a survivor scraping an obstacle', async () => {
    const { isBigBlow } = await importGame()
    // The case the pickup was specified against, verbatim: a ten-strong squad
    // losing one body to a barricade is 10 % of the crowd and must not count.
    expect(isBigBlow(1, 10)).toBe(false)
    // Two is still a scrape. Three is the floor every big attack in the game
    // already sets for itself (`BOSS_MIN_KILL`), so three is where it starts.
    expect(isBigBlow(2, 10)).toBe(false)
    expect(isBigBlow(BULWARK_FLOOR, 10)).toBe(true)
    // The floor holds all the way down, including against a crowd so small that
    // any loss at all is most of it.
    expect(isBigBlow(1, 1)).toBe(false)
    expect(isBigBlow(2, 4)).toBe(false)
  })

  it('is the share once the crowd is big enough for the share to bite', async () => {
    const { isBigBlow } = await importGame()
    // At 1 000 strong the floor is irrelevant and the percentage is the whole
    // rule: 50 bodies is exactly 5 % and must not qualify, 51 must.
    expect(isBigBlow(Math.round(1000 * BULWARK_SHARE), 1000)).toBe(false)
    expect(isBigBlow(Math.round(1000 * BULWARK_SHARE) + 1, 1000)).toBe(true)
  })
})

describe('spending the absorb, through the real loop', () => {
  it('eats one whole blow, kills nobody with it, and is gone afterwards', async () => {
    const game = await importGame()
    game.startStage(BULWARK_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(300)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    expect(game.phase.value, 'the arena never opened').toBe('boss')
    drainFx()

    game.debugArmBulwark()
    expect(game.bulwarkReady()).toBe(true)

    let saves = 0
    let savedCount = 0
    let deltaOnSave = 0
    let armedAfterSave = true
    let killedAfterSave = false

    for (let i = 0; i < 4000 && game.phase.value === 'boss'; i++) {
      // Stand exactly where the boss is aiming. The pickup is being tested, not
      // the dodge — this crowd is supposed to be hit.
      const b = game.getBoss()
      game.steerTo(b && b.aimed ? b.slamX : game.anchor().x)
      const before = game.squadCount.value
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind === 'bulwarkSave') {
          saves++
          savedCount = e.count
          deltaOnSave = game.squadCount.value - before
          armedAfterSave = game.bulwarkReady()
        } else if (e.kind === 'unitLost' && saves > 0) {
          killedAfterSave = true
        }
      }
    }

    expect(saves, 'the armed bulwark never ate anything in a whole boss fight').toBe(1)
    // It ate a blow worth eating: a boss swing takes a fifth to a half of the
    // crowd, so this is far over the threshold rather than scraping past it.
    expect(savedCount, `the absorbed blow was only ${savedCount} bodies`)
      .toBeGreaterThan(300 * BULWARK_SHARE)
    // …and it cost the crowd nothing at all on the tick it landed.
    expect(deltaOnSave, 'the absorbed blow still killed somebody').toBe(0)
    // Spent, exactly once.
    expect(armedAfterSave, 'the bulwark survived being spent').toBe(false)
    expect(game.bulwarkReady(), 'the bulwark re-armed itself').toBe(false)
    // …and the fight went on being a fight.
    expect(killedAfterSave, 'nothing ever hurt the crowd again, so "once" is untested')
      .toBe(true)
  }, 60_000)

  it('does not fire at all when nothing has been picked up', async () => {
    const game = await importGame()
    game.startStage(BULWARK_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(300)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()

    let saves = 0
    let lost = 0
    for (let i = 0; i < 2500 && game.phase.value === 'boss'; i++) {
      const b = game.getBoss()
      game.steerTo(b && b.aimed ? b.slamX : game.anchor().x)
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind === 'bulwarkSave') saves++
        if (e.kind === 'unitLost') lost++
      }
    }
    expect(lost, 'nothing hit the crowd, so the negative proves nothing').toBeGreaterThan(0)
    expect(saves, 'an absorb fired without a pickup').toBe(0)
  }, 60_000)

  it('is cleared by the next stage rather than carried into it', async () => {
    // It is a per-stage pickup like the weapon, and for the same reason: a stage
    // that opens with its hardest moment already paid for is a stage whose
    // difficulty was decided somewhere the player cannot see.
    const game = await importGame()
    game.startStage(BULWARK_STAGE)
    game.debugArmBulwark()
    expect(game.bulwarkReady()).toBe(true)
    game.startStage(BULWARK_STAGE + 1)
    expect(game.bulwarkReady()).toBe(false)
  })
})
