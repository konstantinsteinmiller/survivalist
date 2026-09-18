// ─── The three fights that are not the scythe ───────────────────────────────
//
// A miniboss used to be one thing: plant, wind up, sweep the road. It is four
// things now (`MinibossKind`), and the three new ones exist because the old one
// asks exactly one question — "how hard do you hit" — and a road that asks it
// six stages running is a road people stop walking down.
//
// Each test below is about a CLAIM the design makes out loud, measured through
// the real `step()` loop:
//
//   roller  owns half the road, never tracks, never walls the run. A crowd in
//           the free half pays nothing; one in its lane pays a bounded share,
//           once.
//   bomber  stands still while the fuse burns, and the LURE is the dodge.
//           Waiting on the centre line and running late is a PARTIAL escape by
//           construction — that is the whole reason to lead it somewhere first.
//   gunner  the line it showed you is the line the round takes, it kills only
//           what it passes through, and the toll is the same at 30 fps as at 60.
//
// Every stage here is chosen for the kind it fields and every one of them
// ASSERTS that kind. Two tests in `roadEconomy.test.ts` were left sitting on
// stage 4 when the pool opened and went quiet rather than red — passing while
// measuring a fight that was no longer there. That is the failure these
// assertions exist to prevent.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  BOSS_MIN_KILL, CROWD_MAX_R, ELITE_DRAG_LEAD, FOE_REACH, LANE_HALF, UNIT_R,
  earlyBigHitMul, endlessPressure
} from '@/game/survival'
import {
  BOLT_R, BOLT_SPEED, BOMBER_BLAST_R, BOMBER_FRACTION, BOMBER_FUSE,
  GUNNER_FRACTION, GUNNER_STANDOFF,
  MINIBOSS_POOL, ROLLER_FRACTION, ROLLER_R, THREAT_POOL_FROM_STAGE,
  minibossKindFor, rollerLaneFor, rollerLaneX
} from '@/game/threats'
import { drainFx, type FxEvent } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>
type Foe = ReturnType<Game['getFoes']>[number]

const STEP_MS = 1000 / 60
/** The furthest the crowd's own steer can be put — `steerTo` clamps to this. */
const STEER_CLAMP = LANE_HALF - 0.4

/** The stage each kind is asked of, chosen because it FIELDS that kind first. */
const ROLLER_STAGE = 4
const BOMBER_STAGE = 5
const GUNNER_STAGE = 6

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

const fresh = async (stage: number, squad: number): Promise<Game> => {
  const game = await importGame()
  game.startStage(stage)
  game.debugAddUnits(squad)
  drainFx()
  return game
}

/**
 * Hold the fight still enough to measure, and no stiller.
 *
 * Two interventions, both buying the same thing — that the numbers below are
 * about the elite's BEHAVIOUR rather than about how fast a given squad deletes
 * it:
 *
 *   • the elite under test is immortal. A hundred survivors with the stage's own
 *     damage kill a stage-4 miniboss on the approach (the benchmark player's
 *     fight there is measured at 0.2 s), so without this most of these tests
 *     would be asking their question of a corpse.
 *   • every OTHER elite is parked far up the road. All minibosses bill their
 *     kills under the same `elite` cause, so a second landmark's bites would be
 *     booked against the first one's attack.
 *
 * Nothing else is touched: the movement, the tell, the timing and the toll are
 * all the shipping code's.
 */
/**
 * Keep the crowd on its feet for the duration of a measurement.
 *
 * The sibling of `holdFight`, and it exists for the same stated reason: these
 * tests are about the ELITE'S BEHAVIOUR, not about whether a given squad
 * survives a given stage. Two of them steer rail-to-rail on a fixed cycle to
 * prove a ball does not home, which is a line no player runs and one that walks
 * the crowd through every solid on the road — so whether it reaches the elite at
 * all comes down to how wide the crowd happens to be when it clips a barricade
 * eighty units earlier. Measured, that flipped on stage-4 layout changes that
 * have nothing to do with rollers, and the test then failed with "no roller ever
 * streamed in": a precondition dressed as a result.
 *
 * Topping the squad up cannot launder a real regression, because nothing any of
 * these tests assert is a function of squad size: they measure the ball's x, its
 * `hold`, and the `elite` death tally.
 */
const keepStanding = (game: Game, floor: number): void => {
  const short = floor - game.squadCount.value
  if (short > 0) game.debugAddUnits(short)
}

const holdFight = (game: Game): Foe | undefined => {
  let first: Foe | undefined
  for (const f of game.getFoes()) {
    if (!f.elite || f.dead) continue
    if (!first) {
      first = f
      f.hp = 1e9
      f.maxHp = 1e9
      continue
    }
    f.y = game.anchor().y + 400
  }
  return first
}

interface Frame {
  /** The elite under test, as it was BEFORE this tick. */
  elite: Foe | undefined
  /** Squad and `elite` death tally before the tick, and after it. */
  squadBefore: number
  eliteDeathsBefore: number
  /** Effects the tick emitted. */
  batch: FxEvent[]
  index: number
}

/**
 * Drive one stage, steering per frame, and hand each frame to an observer.
 *
 * The observer sees the world on BOTH sides of the tick, which is what most of
 * these measurements need: "the squad standing there when the blast went off"
 * is a before-number and "what it cost" is an after-number, and reading them a
 * frame apart is how a test quietly measures the wrong thing.
 */
const play = (
  game: Game,
  o: {
    steer: (elite: Foe | undefined, game: Game) => number
    frame: (f: Frame, game: Game) => void
    done: (game: Game) => boolean
    stepMs?: number
    maxFrames?: number
  }
): number => {
  const stepMs = o.stepMs ?? STEP_MS
  let index = 0
  for (; index < (o.maxFrames ?? 6000); index++) {
    const elite = holdFight(game)
    const squadBefore = game.squadCount.value
    const eliteDeathsBefore = game.deathBreakdown().elite
    game.steerTo(o.steer(elite, game))
    game.step(stepMs)
    o.frame({ elite, squadBefore, eliteDeathsBefore, batch: drainFx(), index }, game)
    if (game.phase.value !== 'run') break
    if (o.done(game)) break
  }
  return index
}

const liveElite = (game: Game): Foe | undefined =>
  game.getFoes().find((f) => f.elite && !f.dead)

// ─── The rotation itself ────────────────────────────────────────────────────

describe('the pool opens where the tutorial ends', () => {
  it('fields nothing but the scythe below the pool stage', () => {
    for (let stage = 1; stage < THREAT_POOL_FROM_STAGE; stage++) {
      for (let index = 0; index < 3; index++) {
        expect(minibossKindFor(stage, index), `stage ${stage} broke the tutorial`).toBe('scythe')
      }
    }
  })

  it('gives each of these tests the kind it is written about', () => {
    // The load-bearing assertion of the whole file. Every measurement below is
    // asked of a specific stage, and a rotation change would otherwise turn each
    // of them into a silent measurement of some other fight.
    expect(minibossKindFor(ROLLER_STAGE, 0)).toBe('roller')
    expect(minibossKindFor(BOMBER_STAGE, 0)).toBe('bomber')
    expect(minibossKindFor(GUNNER_STAGE, 0)).toBe('gunner')
  })

  it('shows a player every kind before showing them any of them twice', () => {
    const seen = new Set<string>()
    for (let i = 0; i < MINIBOSS_POOL.length; i++) {
      seen.add(minibossKindFor(THREAT_POOL_FROM_STAGE + i, 0))
    }
    expect(seen.size).toBe(MINIBOSS_POOL.length)
  })
})

// ─── roller ─────────────────────────────────────────────────────────────────

describe('the roller owns half the road', () => {
  it('is never in the middle, and always leaves the crowd somewhere to be', () => {
    // Pure geometry, asserted against the road's own width rather than against
    // typed-in numbers: the ball is half the road, so the half it is not on has
    // to fit the crowd at its widest with room to spare.
    let found = 0
    for (let stage = THREAT_POOL_FROM_STAGE; stage <= 40; stage++) {
      for (let index = 0; index < 3; index++) {
        if (minibossKindFor(stage, index) !== 'roller') continue
        found++
        const lane = rollerLaneFor(stage, index)
        expect(Math.abs(lane), `stage ${stage}/${index} put a ball in the middle`).toBe(1)
        const cx = rollerLaneX(lane)
        expect(Math.abs(cx)).toBeCloseTo(LANE_HALF / 2, 6)
        // The ball's inner edge, and the road left between it and the far rail.
        const innerEdge = cx - lane * ROLLER_R
        expect(Math.abs(innerEdge), `stage ${stage}/${index} crossed the centre line`)
          .toBeLessThanOrEqual(1e-9)
        expect(LANE_HALF - Math.abs(innerEdge), `stage ${stage}/${index} left no free half`)
          .toBeGreaterThan(CROWD_MAX_R * 2)
      }
    }
    expect(found, 'no stage in the sampled range fields a roller at all')
      .toBeGreaterThan(5)
  })

  it('comes down one fixed line and never once tracks the crowd', async () => {
    const game = await fresh(ROLLER_STAGE, 120)
    const want = rollerLaneX(rollerLaneFor(ROLLER_STAGE, 0))

    const xs = new Set<number>()
    let sawIt = false
    let held = 0
    let gone = false
    // Steered hard, both ways, on a cycle nothing homing could keep up with. If
    // the ball drifted toward the crowd this catches it, and if it drifted WITH
    // the crowd it catches that too.
    play(game, {
      steer: (_e, g) => (Math.floor(g.anchor().y / 4) % 2 === 0 ? -STEER_CLAMP : STEER_CLAMP),
      frame: (_f, g) => {
        keepStanding(g, 120)
        const e = liveElite(g)
        if (e) {
          sawIt = true
          xs.add(e.x)
          if (e.hold > 0) held++
        } else if (sawIt) gone = true
      },
      done: () => gone
    })

    expect(sawIt, 'no roller ever streamed in').toBe(true)
    expect([...xs], 'the ball moved sideways at all').toEqual([want])
    expect(held, 'the ball held the road like a scythe does').toBe(0)
  })

  it('never slows the run down, however close it gets', async () => {
    const game = await fresh(ROLLER_STAGE, 120)
    let dragged = 0
    let close = 0
    let sawIt = false
    let gone = false

    play(game, {
      steer: () => 0,
      frame: (_f, g) => {
        const e = liveElite(g)
        if (!e) {
          if (sawIt) gone = true
          return
        }
        sawIt = true
        const gap = e.y - g.anchor().y
        if (gap > ELITE_DRAG_LEAD || gap < 0) return
        close++
        // The mechanism, asserted directly: `stepAnchor` only winds the road
        // down for an elite whose `hold` is running, so a ball that never holds
        // can never be the reason a player stopped moving.
        if (e.hold > 0) dragged++
      },
      done: () => gone
    })

    expect(sawIt).toBe(true)
    expect(close, 'the ball never came near enough for the drag to matter')
      .toBeGreaterThan(20)
    expect(dragged, 'the ball wound the road down').toBe(0)
  })

  it('costs a crowd that committed to the free half exactly nothing', async () => {
    const game = await fresh(ROLLER_STAGE, 120)
    // The free half's own centre line — not the far rail. The claim is that the
    // HALF is free, so it is tested at the least generous point inside it.
    const safe = rollerLaneX(-rollerLaneFor(ROLLER_STAGE, 0))
    const before = game.deathBreakdown().elite
    let crossed = false
    let sawIt = false

    play(game, {
      steer: () => safe,
      frame: (_f, g) => {
        keepStanding(g, 120)
        const e = liveElite(g)
        if (e) {
          sawIt = true
          if (e.y < g.anchor().y - ROLLER_R) crossed = true
        }
      },
      done: () => crossed
    })

    expect(sawIt && crossed, 'the ball never rolled past the crowd').toBe(true)
    expect(game.deathBreakdown().elite - before, 'the free half was not free').toBe(0)
  })

  it('bills a bounded share of the crowd, once, to one that stood in its lane', async () => {
    const game = await fresh(ROLLER_STAGE, 160)
    const inLane = rollerLaneX(rollerLaneFor(ROLLER_STAGE, 0))

    let hits = 0
    let squadAtHit = 0
    let took = 0
    let afterwards = 0
    let sawIt = false
    let past = false

    play(game, {
      steer: () => inLane,
      frame: (f, g) => {
        const hit = f.batch.some((x) => x.kind === 'rollerHit')
        const billed = g.deathBreakdown().elite - f.eliteDeathsBefore
        if (hit) {
          hits++
          if (hits === 1) {
            squadAtHit = f.squadBefore
            took = billed
          } else {
            afterwards += billed
          }
        } else if (hits > 0) {
          afterwards += billed
        }
        // `past` may only be latched once the ball has actually been SEEN.
        //
        // It was written as "no live elite ⇒ it has gone by", which is true at
        // the END of the roll and also true before the road has streamed the
        // ball in at all — so the loop stopped on the very first billing frame
        // and the "once" in this test's name was never tested. A deliberate
        // mutant that billed EVERY overlapping frame (measured: eleven hits, a
        // total wipe) walked straight through it.
        const e = liveElite(g)
        if (e) {
          sawIt = true
          if (e.y < g.anchor().y - ROLLER_R * 2) past = true
        } else if (sawIt) past = true
      },
      done: () => past && hits > 0
    })

    expect(sawIt, 'no roller ever streamed in').toBe(true)

    expect(hits, 'the ball rolled through the crowd without billing it').toBe(1)
    expect(squadAtHit, 'the crowd was gone before the ball got there').toBeGreaterThan(40)

    // TWO tolls, and the test can only pin one of them exactly.
    //
    // The band between the stone and `ROLLER_R + UNIT_R` is a share:
    // `ROLLER_FRACTION` of whatever was standing there, with `BOSS_MIN_KILL`
    // under it and the onboarding cut over both — stage 4 is inside
    // `earlyBigHitMul`'s window, and every percentage hit in the game carries
    // that cut. Computed from the constants rather than from a snapshot, so a
    // tuning pass moves the test along with the game.
    //
    // Inside the stone there is no share at all: everyone whose centre is within
    // `rollerCoreR()` dies, the boulder rule (`crushAgainst`) applied to the
    // boulder that moves. How many bodies that is depends on where the crowd's
    // own disc sat under the ball, which this test cannot know without
    // reimplementing `slotPos` — so the share is asserted as a FLOOR and the
    // crowd as a ceiling, with the gap between them being the core's work.
    const cut = earlyBigHitMul(ROLLER_STAGE)
    const share = ROLLER_FRACTION * endlessPressure(ROLLER_STAGE)
    const grazeOnly = Math.max(
      Math.max(1, Math.round(BOSS_MIN_KILL * cut)),
      Math.ceil(squadAtHit * share * cut)
    )
    expect(took, `a roll took ${took} from a crowd of ${squadAtHit}`)
      .toBeGreaterThan(grazeOnly)
    // Standing in front of it is supposed to be the expensive answer, so the
    // core has to be worth substantially more than the graze it replaced —
    // not a rounding difference that a future tweak could erase unnoticed.
    expect(took).toBeGreaterThan(grazeOnly * 2)
    // …but half the road is still a dodge and not a coin flip: a crowd that
    // stood in the lane loses a lot and is not deleted. `ROLLER_CORE_FRACTION`
    // is half the stone precisely because 1 walls the balance benchmark.
    expect(took, 'the ball wiped a crowd it only rolled over').toBeLessThan(squadAtHit)
    // …and it does not get a second go at the same crowd on the way out. The
    // ball is not a body that bites, and it is not solid: one roll, one bill.
    expect(afterwards, 'the ball billed the same crowd twice for one roll').toBe(0)
  })

  it('has the corner warning up long before it arrives', async () => {
    const game = await fresh(ROLLER_STAGE, 120)
    let warned = 0
    let hitAt = -1

    play(game, {
      steer: () => rollerLaneX(rollerLaneFor(ROLLER_STAGE, 0)),
      frame: (f, g) => {
        if (g.attackIncoming()) warned++
        if (hitAt < 0 && f.batch.some((x) => x.kind === 'rollerHit')) hitAt = f.index
      },
      done: () => hitAt >= 0
    })

    expect(hitAt, 'the ball never landed, so the badge was not really tested')
      .toBeGreaterThan(0)
    // A full second of warning at 60 fps, minimum. The ball is its own telegraph
    // and it is a slow one; less than this would mean the badge comes up as the
    // ball arrives rather than as it appears.
    expect(warned, 'the badge barely came up before the ball arrived').toBeGreaterThan(60)
  })
})

// ─── bomber ─────────────────────────────────────────────────────────────────

/**
 * One bomber fight, played to the blast.
 *
 * `lure` is where the crowd waits while the bomber closes, and `escape` is where
 * it runs the moment the fuse lights. That pair IS the fight, and every claim
 * about the bomber is a claim about how the two of them combine.
 */
const bomberRun = async (o: { lure: number; escape: number; squad?: number }) => {
  const game = await fresh(BOMBER_STAGE, o.squad ?? 120)
  let plantedAt: { x: number; y: number } | null = null
  let drift = 0
  let squadAtBlast = 0
  let killedByBlast = 0
  let killedWhileArmed = 0
  let castTtl = -1
  let castAt = -1
  let blastAt = -1
  let warnedThroughFuse = 0
  let nearestAfter = Number.POSITIVE_INFINITY
  let killsBefore = 0
  let killsAfter = 0

  play(game, {
    steer: (e) => ((e && e.fuse > 0) ? o.escape : o.lure),
    frame: (f, g) => {
      const billed = g.deathBreakdown().elite - f.eliteDeathsBefore
      const armed = f.elite !== undefined && f.elite.fuse > 0
      if (armed) {
        if (!plantedAt) {
          plantedAt = { x: f.elite!.x, y: f.elite!.y }
          killsBefore = g.kills.value
        } else {
          drift = Math.max(drift, Math.abs(f.elite!.x - plantedAt.x) + Math.abs(f.elite!.y - plantedAt.y))
        }
        if (g.attackIncoming()) warnedThroughFuse++
      }
      for (const ev of f.batch) {
        if (ev.kind === 'bombCast') {
          castTtl = ev.ttl
          castAt = f.index
        }
        if (ev.kind === 'bombBlast') {
          blastAt = f.index
          squadAtBlast = f.squadBefore
          killedByBlast = billed
          killsAfter = g.kills.value
          for (const u of g.getUnits()) {
            if (u.dying > 0) continue
            nearestAfter = Math.min(nearestAfter, Math.hypot(u.x - ev.x, u.y - ev.y))
          }
        }
      }
      if (armed && blastAt < 0) killedWhileArmed += billed
    },
    done: () => blastAt >= 0
  })

  return {
    game,
    plantedAt,
    drift,
    squadAtBlast,
    killedByBlast,
    killedWhileArmed,
    castTtl,
    castAt,
    blastAt,
    warnedThroughFuse,
    nearestAfter,
    bounty: killsAfter - killsBefore
  }
}

describe('the bomber comes to where you are', () => {
  it('stands absolutely still once the fuse is lit', async () => {
    const r = await bomberRun({ lure: 0, escape: 0 })
    expect(r.plantedAt, 'the bomber never armed').not.toBeNull()
    // Not "moves slowly" — does not move. The whole read of the attack is that
    // the thing has committed to a spot, and a spot that creeps is not one.
    expect(r.drift, 'an armed bomber drifted').toBe(0)
  })

  it('announces the blast a full fuse ahead, and warns for all of it', async () => {
    const r = await bomberRun({ lure: 0, escape: 0 })
    // The cast carries the exact seconds to the blast, so the ring closes on the
    // beat rather than near it — the same contract `meteorCast` and `sliceCast`
    // are written to.
    expect(r.castTtl).toBe(BOMBER_FUSE)
    expect(r.castAt, 'nothing announced the blast').toBeGreaterThanOrEqual(0)
    const fuseFrames = r.blastAt - r.castAt
    expect(fuseFrames * STEP_MS, 'the cast did not land a fuse ahead of the blast')
      .toBeCloseTo(BOMBER_FUSE * 1000, -2)
    // …and the corner badge is up for every frame of it, not merely some.
    expect(r.warnedThroughFuse, 'the badge was down while a lit bomb sat in the road')
      .toBeGreaterThanOrEqual(fuseFrames - 1)
  })

  it('takes half the squad off a crowd that stayed where it was', async () => {
    const r = await bomberRun({ lure: 0, escape: 0 })
    // …less the onboarding cut, which stage 5 is still inside (`earlyBigHitMul`).
    const cut = earlyBigHitMul(BOMBER_STAGE)
    const want = Math.max(
      Math.max(1, Math.round(BOSS_MIN_KILL * cut)),
      Math.ceil(r.squadAtBlast * BOMBER_FRACTION * cut)
    )
    expect(r.killedByBlast, `the blast took ${r.killedByBlast} of ${r.squadAtBlast}`).toBe(want)
    // The premise of the number: the blast really was big enough to reach that
    // many bodies, so what stopped it was the PRICE and not the geometry. If
    // this ever fails, the share is a fiction and the radius is the real rule.
    expect(r.nearestAfter, 'the blast ran out of bodies before it ran out of budget')
      .toBeLessThan(BOMBER_BLAST_R)
  })

  it('stops being a solid body while it is armed', async () => {
    const r = await bomberRun({ lure: 0, escape: 0 })
    // Measured before this rule existed: 96 of 150 survivors taken, against the
    // 75 the blast is priced at. An armed bomber that is still a body charges a
    // single mistake twice — once for standing near it and once for the blast.
    expect(r.killedWhileArmed, 'the fuse cost survivors before it went off').toBe(0)
  })

  it('pays no bounty for going off, only for being shot down', async () => {
    const r = await bomberRun({ lure: 0, escape: 0 })
    // A player who failed to dodge should not also be paid for the corpse. The
    // other answer — killing it before it plants — still pays, because that goes
    // through `damageFoe` like every other kill.
    expect(r.bounty, 'detonating counted as a kill').toBe(0)
  })

  it('is defused by shooting it down while the fuse burns', async () => {
    // The OTHER answer, and the reason the bomber is not purely a footwork
    // puzzle: a crowd with enough guns can end the fight rather than dodge it.
    // Nothing in `stepBomber` implements this — a dead foe is spliced before its
    // branch runs — which is precisely why it is worth pinning: the day somebody
    // makes detonation fire from a death hook, this is what says no.
    const game = await fresh(BOMBER_STAGE, 120)
    const fuseFrames = Math.round((BOMBER_FUSE * 1000) / STEP_MS)
    let armedAt = -1
    let killedAt = -1
    let blasts = 0
    let billedAfter = 0
    let eliteAtKill = 0
    let lastFrame = -1

    play(game, {
      steer: () => 0,
      frame: (f, g) => {
        lastFrame = f.index
        if (f.elite && f.elite.fuse > 0 && armedAt < 0) armedAt = f.index
        // Half a fuse in, the guns finally get through. Applied to the world the
        // same way a round would leave it.
        if (armedAt >= 0 && killedAt < 0 && f.index >= armedAt + Math.round(fuseFrames / 2)) {
          const e = liveElite(g)
          if (e) {
            e.hp = 0
            e.dead = true
            killedAt = f.index
            eliteAtKill = f.eliteDeathsBefore
          }
        }
        blasts += f.batch.filter((x) => x.kind === 'bombBlast').length
        if (killedAt >= 0) billedAfter = g.deathBreakdown().elite - eliteAtKill
      },
      // Run a WHOLE further fuse past the kill, and then some. Stopping the
      // moment the body left the world is what a first version did, and a
      // deliberate mutant that let a corpse finish its fuse walked straight
      // through it — the blast simply happened after the test stopped looking.
      done: (_g) => killedAt >= 0 && lastFrame >= killedAt + fuseFrames + 30,
      maxFrames: 4000
    })

    expect(armedAt, 'the bomber never armed').toBeGreaterThanOrEqual(0)
    expect(killedAt, 'the bomber was never shot down').toBeGreaterThan(armedAt)
    expect(blasts, 'a bomber that was killed still went off').toBe(0)
    expect(billedAfter, 'a defused bomb still took survivors').toBe(0)
  })

  it('is escaped completely by the lure and only partly by a late scramble', async () => {
    // ─── The fight, in three runs ───
    //
    // The bomber comes to where the crowd IS, so where the crowd waits decides
    // how far it then has to travel. Nothing else about the three runs differs.
    const stood = await bomberRun({ lure: 0, escape: 0 })
    const scrambled = await bomberRun({ lure: 0, escape: STEER_CLAMP })
    const lured = await bomberRun({ lure: -STEER_CLAMP, escape: STEER_CLAMP })

    expect(lured.killedByBlast, 'the lure did not buy a clean escape').toBe(0)
    expect(lured.nearestAfter, 'the lure left the crowd inside the blast')
      .toBeGreaterThan(BOMBER_BLAST_R)

    // The centre line cannot buy one. This is the reason the lure exists, and it
    // is asserted as an OUTCOME rather than as arithmetic, because the arithmetic
    // was got wrong once already: the first radius was chosen from the crowd's
    // WIDTH alone (4.25 needed against the 4.1 the steer clamp allows) and it
    // measured as a totally clean dodge, because the bomber plants AHEAD and the
    // nearest body is a diagonal away rather than a sideways one.
    //
    // Asserted on what it COST rather than on where the survivors ended up:
    // `nearestAfter` is measured after the kills, so on any run where the blast
    // connected the closest living body is outside the radius by construction —
    // a check that reads as a fact about the blast and is really a fact about
    // arithmetic. The lure's version of it above is not circular, because there
    // nobody died at all.
    expect(scrambled.killedByBlast, 'waiting in the middle became a free escape')
      .toBeGreaterThan(0)

    // …and running late still beats not running at all, by a lot. A dodge with
    // no gradient is not a dodge, it is a coin flip.
    expect(scrambled.killedByBlast / Math.max(1, scrambled.squadAtBlast))
      .toBeLessThan(stood.killedByBlast / Math.max(1, stood.squadAtBlast) * 0.6)
  })
})

// ─── gunner ─────────────────────────────────────────────────────────────────

/**
 * One gunner fight, played until the first round has finished travelling.
 *
 * `dodge` decides whether the crowd steps out of the column once the gun is
 * levelled. Everything the tests need is measured around the ROUND — the gunner
 * also bites when its leash runs out, and both bill the same `elite` cause.
 */
const gunnerRun = async (o: { dodge: boolean; squad?: number; stepMs?: number }) => {
  const want = o.squad ?? 120
  const game = await fresh(GUNNER_STAGE, want)
  let castX = Number.NaN
  let fireX = Number.NaN
  let gunnerXAtCast = Number.NaN
  let gunnerXAtFire = Number.NaN
  let squadAtFire = 0
  let boltKills = 0
  let shots = 0
  let inFlight = false
  let done = false
  let warnedWindUp = 0
  let warnedFlight = 0
  const gaps: number[] = []
  let biteReachFrames = 0

  play(game, {
    steer: (e, g) => {
      // The crowd is topped back up to `want` until the gun is first levelled,
      // for `holdFight`'s stated reason: this measures the ROUND, not whether a
      // squad holding the centre line survives the road to it. Since stage 6
      // was re-cut into acts (2026-09-18) that line runs through its first
      // passage rib and five pillars before the gunner, and 120 arrived as ~17
      // — "nothing was standing in the column", a precondition dressed as a
      // result. Nothing is added once the cast is seen, so every number the
      // tests read about the round is the shipping code's.
      if (Number.isNaN(castX) && g.squadCount.value < want) g.debugAddUnits(want - g.squadCount.value)
      const aiming = (e !== undefined && e.kindTicks > 0) || g.getBolts().length > 0
      return o.dodge && aiming ? STEER_CLAMP : 0
    },
    frame: (f, g) => {
      const billed = g.deathBreakdown().elite - f.eliteDeathsBefore
      if (inFlight) boltKills += billed
      const e = f.elite
      if (e && e.kindTicks > 0 && g.attackIncoming()) warnedWindUp++
      if (inFlight && g.attackIncoming()) warnedFlight++
      // The stand-off, sampled only while it is actually holding the line: the
      // walk in is not the fight.
      if (e && e.hold > 0 && e.hold < 3 && e.y >= g.anchor().y) {
        gaps.push(e.y - g.anchor().y)
        if (e.y - g.anchor().y <= FOE_REACH + UNIT_R + 0.9) biteReachFrames++
      }
      for (const ev of f.batch) {
        // The FIRST cast only. A dodged round is never spent, so it flies the
        // whole length of its trail — long enough for the next shot's tell to
        // arrive and overwrite this, which quietly compared one shot's aim
        // against a different shot's muzzle.
        if (ev.kind === 'boltCast' && shots === 0) {
          castX = ev.x
          gunnerXAtCast = e ? e.x : Number.NaN
        }
        if (ev.kind === 'boltFire') {
          shots++
          if (shots === 1) {
            fireX = ev.x
            gunnerXAtFire = e ? e.x : Number.NaN
            squadAtFire = f.squadBefore
            inFlight = true
          }
        }
        if (ev.kind === 'boltEnd' && inFlight) {
          inFlight = false
          done = true
        }
      }
    },
    done: () => done,
    stepMs: o.stepMs
  })

  return {
    game, castX, fireX, gunnerXAtCast, gunnerXAtFire,
    squadAtFire, boltKills, shots, warnedWindUp, warnedFlight,
    gaps, biteReachFrames
  }
}

describe('the gunner draws a line and asks whether you are still on it', () => {
  it('holds its distance rather than closing on the crowd', async () => {
    const r = await gunnerRun({ dodge: false })
    expect(r.gaps.length, 'the gunner never engaged').toBeGreaterThan(30)
    const mean = r.gaps.reduce((a, b) => a + b, 0) / r.gaps.length
    // Within three quarters of a unit, not half. The gunner EASES up to its
    // stand-off behind a crowd the leash is still dragging forward, so the mean
    // trails it by however fast the road crawls at that spot — 4.50 on the
    // 2026-09-18 stage-6 road, 0.002 outside the old half-unit band while never
    // coming near biting range (asserted separately below, which is the promise).
    expect(Math.abs(mean - GUNNER_STANDOFF), `the gunner sat at ${mean.toFixed(2)} instead of its stand-off`)
      .toBeLessThan(0.75)
    // The stand-off is the dodge window. A gunner that drifted into biting range
    // would be a scythe that also shoots, which is one fight rather than two.
    expect(r.biteReachFrames, 'the gunner closed to biting range while holding').toBe(0)
  })

  it('fires exactly where the tell said it would, even as the crowd runs', async () => {
    // ── Why the crowd has to be MOVING for this to mean anything ──
    //
    // Asked of a stationary crowd this test passes on a broken lock: the gunner
    // homes on the crowd's column, so a crowd that never moves leaves it nothing
    // to slide toward, and "it did not move" is true for the wrong reason. A
    // deliberate mutant that kept sliding all the way through the wind-up walked
    // straight through the stationary version.
    //
    // So the crowd bolts the instant the gun is levelled. A gunner that had not
    // locked would follow it, and the line the player was shown would not be the
    // line the round takes.
    const r = await gunnerRun({ dodge: true })
    expect(r.shots, 'the gunner never fired').toBeGreaterThan(0)
    expect(r.castX).toBe(r.fireX)
    expect(r.gunnerXAtCast).toBe(r.gunnerXAtFire)
    expect(r.fireX).toBe(r.gunnerXAtFire)
  })

  it('kills only the survivors it passes through', async () => {
    const stood = await gunnerRun({ dodge: false })
    const stepped = await gunnerRun({ dodge: true })

    expect(stood.squadAtFire, 'nothing was standing in the column').toBeGreaterThan(30)
    // Standing in it costs the round's whole budget — a share of the crowd, with
    // the miniboss floor under it and the elite ceiling over it.
    const share = Math.min(0.4, GUNNER_FRACTION * endlessPressure(GUNNER_STAGE))
    const want = Math.max(BOSS_MIN_KILL, Math.ceil(stood.squadAtFire * share))
    expect(stood.boltKills, `the round took ${stood.boltKills} of ${stood.squadAtFire}`).toBe(want)
    // Stepping out of the column costs nothing at all. Not "less" — nothing:
    // the round is a line, not a blast, so a crowd it does not pass through is a
    // crowd it has no claim on.
    expect(stepped.boltKills, 'stepping out of the line still cost survivors').toBe(0)
  })

  it('cannot outrun its own kill radius inside one tick', () => {
    // ── An honest note about what the frame-rate test below can and cannot see ──
    //
    // The bolt is resolved as a SWEPT capsule against the segment it travelled
    // this frame, which is the implementation that stays correct at any speed.
    // At the speed it actually ships at, sampling the endpoint would give the
    // same answer, and a deliberate mutant that did exactly that SURVIVED the
    // test below: `step` caps one tick at 60 ms, so the round moves at most
    // `BOLT_SPEED` × 0.06 = 0.42 units against a kill radius of
    // `BOLT_R + UNIT_R` = 0.85. It cannot step over anybody.
    //
    // So this is the tripwire rather than the proof. The margin is what makes
    // the sweep invisible today; if `BOLT_SPEED` is ever raised past it, THIS
    // fails and names the reason, instead of a frame-rate bug shipping quietly
    // to everyone on a 30 fps phone.
    const MAX_TICK_S = 0.06
    expect(BOLT_SPEED * MAX_TICK_S).toBeLessThan(BOLT_R + UNIT_R)
  })

  it('bills the same crowd at 30 fps as it does at 60', async () => {
    // ─── Why this is not a comparison of two totals ───
    //
    // The two runs are different worlds — a different step size moves every body
    // on the road — so their crowds are not the same crowd and their totals have
    // no business matching. What must match is the RULE: a round that crosses a
    // crowd standing in its column spends its entire budget, and the budget is a
    // share of the squad at the moment it was FIRED.
    //
    // What this catches, measured: a budget recomputed per frame from the
    // shrinking squad — the obvious wrong way to write it, and the one that
    // really does bill different crowds at different rates. What it does NOT
    // catch is sampling instead of sweeping; see the margin above for why.
    const fast = await gunnerRun({ dodge: false, stepMs: 1000 / 60 })
    const slow = await gunnerRun({ dodge: false, stepMs: 1000 / 30 })
    const share = Math.min(0.4, GUNNER_FRACTION * endlessPressure(GUNNER_STAGE))

    for (const [label, r] of [['60 fps', fast], ['30 fps', slow]] as const) {
      expect(r.squadAtFire, `${label}: nothing was standing in the column`).toBeGreaterThan(30)
      const want = Math.max(BOSS_MIN_KILL, Math.ceil(r.squadAtFire * share))
      expect(r.boltKills, `${label}: the round took ${r.boltKills} of ${r.squadAtFire}, wanted ${want}`)
        .toBe(want)
    }
  })

  it('warns through the wind-up and through the flight', async () => {
    const r = await gunnerRun({ dodge: false })
    // Both halves, because they are the two halves of the answer the player is
    // giving: the wind-up says "a line is being drawn" and the flight says "it
    // is still coming". A badge that dropped between them would teach exactly
    // the wrong moment to stop moving.
    expect(r.warnedWindUp, 'nothing warned while the gun was levelled').toBeGreaterThan(4)
    expect(r.warnedFlight, 'nothing warned while the round was in the air').toBeGreaterThan(4)
  })
})
