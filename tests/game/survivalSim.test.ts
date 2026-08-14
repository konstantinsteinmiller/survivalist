import { beforeEach, describe, expect, it } from 'vitest'
import {
  BASE_DAMAGE, BASE_FIRE_RATE, CRATE_DAMAGE_GAIN, CRATE_RATE_GAIN, GATE_LEAF_X,
  GATE_TICK_MS, LANE_HALF, MAX_FIRE_RATE, RETRY_HP_RELIEF
} from '@/game/survival'
import { buildTrack } from '@/game/track'
import { foeDef } from '@/game/foes'
import { drainFx, type FxEvent } from '@/use/useVfx'

// ─── The simulation's load-bearing rules ────────────────────────────────────
//
// Everything asserted in this file is a promise to the player, and every one of
// them is invisible in a screenshot:
//
//   1. SOLID THINGS KILL. Crates, barricades and gate dividers are lethal until
//      they are destroyed — gates alone are doorways rather than walls. Without
//      that, half the level generator's vocabulary is scenery.
//   2. A GATE BANK IS A COMMITMENT. Two leaves, one lethal pillar between them.
//      Straddling the middle has to cost survivors, or the "choose a side"
//      decision the whole track is built around stops being a decision.
//   3. A `+N` GATE IS A DECISION ABOUT TIME. One tick per HALF SECOND of
//      sustained fire — never per bullet — so a squad of five and a squad of
//      fifty pump it at exactly the same rate.
//   4. FIRE RATE IS EARNED IN THE RUN. It starts crawling, never moves on its
//      own, and only rate crates raise it. It is the stat that makes everything
//      else feel good, so it must never be free.
//   5. MINIBOSSES ARE THE MIDPOINT WIN. Every stage past the first has one, it
//      is announced, it pays real coins — and it is emphatically not the end
//      boss, so beating it must not end the stage.
//   6. THE BOSS CAN ACTUALLY HIT YOU. It slams where the CROWD is. A boss whose
//      attack cannot reach is a damage race with no failure state.
//   7. LOSING TEACHES. Die on a stage and every enemy on it loses 20 % health —
//      once, never twice, a floor under frustration rather than a slide.
//
// They are asserted against the real simulation (no canvas, no Vue component)
// because every one of them is a one-character change away from silently
// becoming something else.

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

/** One fixed simulation step. Never wall time — the sim owns its own clock. */
const STEP_MS = 16

beforeEach(async () => {
  // Both halves of the save have to go. The persisted failure record and the
  // upgrade levels live in ONE `tower_state` blob that is an in-memory module
  // singleton with a debounced write behind it, so clearing storage alone would
  // leave the previous test's wipes still readable through `getState` — and
  // every relief assertion below would then be reading the wrong stage's past.
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/** Fixed-step, hard-bounded advance. Returns the steps actually taken. */
const advance = (game: Game, steps: number, until?: () => boolean): number => {
  for (let i = 0; i < steps; i++) {
    if (until?.()) return i
    game.step(STEP_MS)
  }
  return steps
}

/** True once the run is over, whichever way it ended. */
const settled = (game: Game): boolean =>
  game.phase.value === 'clear' || game.phase.value === 'wipe'

/**
 * Run down `safeX`, then swerve onto the first thing `find()` turns up, once it
 * is `lead` units ahead.
 *
 * The swerve is deliberately LATE. Held on the obstacle's line from the start,
 * the squad simply shoots it out of the way — which is the OTHER half of the
 * rule and not the half under test here. Committing at two and a half units
 * reproduces the mistake the player actually makes: not "I could not shoot it",
 * but "I drove into it".
 *
 * @returns where the obstacle stood, or null if the run ended before one came.
 */
const swerveIntoFirst = (
  game: Game,
  safeX: number,
  find: () => { x: number; y: number } | undefined,
  lead = 2.5
): { x: number; y: number } | null => {
  game.steerTo(safeX)
  let mark: { x: number; y: number } | null = null
  for (let i = 0; i < 3000; i++) {
    if (!mark) {
      const found = find()
      // Only lock on to something still far enough ahead to steer at.
      if (found && found.y > game.anchor().y + lead) mark = { x: found.x, y: found.y }
    }
    if (mark) {
      if (mark.y - game.anchor().y <= lead) game.steerTo(mark.x)
      if (game.anchor().y > mark.y + 1.5) return mark
    }
    game.step(STEP_MS)
    if (settled(game)) return mark
  }
  return mark
}

// ════════════════════════════════════════════════════════════════════════════

describe('the track is a pure function of the stage number', () => {
  // A player who wipes on stage 6 has to be able to LEARN stage 6 rather than
  // re-roll it. It is also what lets the resumable run store a single number.

  it('builds byte-identical layouts for the same stage', () => {
    expect(JSON.stringify(buildTrack(7))).toBe(JSON.stringify(buildTrack(7)))
  })

  it('builds different layouts for different stages', () => {
    expect(JSON.stringify(buildTrack(7))).not.toBe(JSON.stringify(buildTrack(8)))
  })

  it('always leaves a runnable gap in every barricade row', () => {
    for (let stage = 1; stage <= 25; stage++) {
      for (const e of buildTrack(stage).events) {
        if (e.kind !== 'barricade') continue
        // Sample the lane; at least one column must be clear of every block in
        // the row, or the run becomes a hard stop rather than a routing puzzle.
        let openColumns = 0
        for (let x = -LANE_HALF + 0.5; x <= LANE_HALF - 0.5; x += 0.25) {
          if (!e.blocks.some((b) => Math.abs(b.x - x) <= b.w / 2 + 0.3)) openColumns++
        }
        expect(openColumns, `stage ${stage} has a sealed barricade row`).toBeGreaterThan(0)
      }
    }
  })
})

describe('a +N gate is a decision about TIME, not about firepower', () => {
  // The headline mechanic. If the gate charged per BULLET, the right play would
  // always be "get a bigger squad first" and every gate would be worth more to
  // the player who needs it least. Charging per half-second of sustained fire
  // is what keeps the question "how long am I willing to stand here?" — the
  // same question for a squad of three and a squad of fifty.

  /**
   * Park the crowd on stage 1's opening left leaf and record the sim-clock time
   * of every increment. The FIRST reading is only "the gate exists at +1", so
   * the gaps between subsequent readings are pure charge intervals.
   */
  // Stage 1's FIRST gate is a single lane-wide doorway (the teaching gate), so
  // the pumping timeline is measured on the first real bank — stage 2's — where
  // there is a left leaf to hold fire on.
  const pumpTimeline = (game: Game, extraUnits: number): { value: number; gaps: number[] } => {
    game.startStage(2)
    if (extraUnits > 0) game.debugAddUnits(extraUnits)
    game.steerTo(-GATE_LEAF_X)

    const stamps: number[] = []
    let last = -1
    for (let i = 0; i < 300; i++) {
      const leaf = game.getGates().find((g) => g.x < 0)
      if (leaf && leaf.value !== last) {
        if (last >= 0) stamps.push(game.nowMs())
        last = leaf.value
      }
      game.step(STEP_MS)
    }
    const gaps: number[] = []
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i]! - stamps[i - 1]!)
    return { value: last, gaps }
  }

  it('climbs by exactly one per GATE_TICK_MS of sustained fire', async () => {
    const game = await importGame()
    const { value, gaps } = pumpTimeline(game, 0)

    // The bank opens at its printed value and the crowd holds fire on it for
    // roughly two seconds before running through it.
    expect(value).toBeGreaterThan(1)
    expect(gaps.length).toBeGreaterThanOrEqual(2)
    for (const gap of gaps) {
      // One frame of slack: charge is accumulated in 16 ms slices and the
      // remainder is carried, so individual gaps straddle the half second.
      expect(Math.abs(gap - GATE_TICK_MS)).toBeLessThanOrEqual(STEP_MS + 4)
    }
  })

  it('is a squad-size-independent rate: fifty survivors do not pump faster', async () => {
    const game = await importGame()
    const small = pumpTimeline(game, 0)
    const large = pumpTimeline(game, 50)

    // Fifty survivors fire fourteen streams instead of three, so their FIRST
    // round lands sooner — but every tick after that costs the same half second.
    expect(Math.abs(large.value - small.value)).toBeLessThanOrEqual(1)
    for (const gap of large.gaps) {
      expect(Math.abs(gap - GATE_TICK_MS)).toBeLessThanOrEqual(STEP_MS + 4)
    }
  })

  it('pays the pumped value into the squad when the crowd runs through', async () => {
    const game = await importGame()
    // Stage 2 again: stage 1 opens with the single teaching door, which has no
    // left leaf to aim at.
    game.startStage(2)
    game.steerTo(-GATE_LEAF_X)
    const before = game.squadCount.value

    // The track streams in on the first tick, so nothing exists until one runs.
    game.step(STEP_MS)
    const leaf = game.getGates().find((g) => g.x < 0)
    expect(leaf, 'the opening bank never streamed in').toBeDefined()

    // The leaf is held by reference: it is spliced out of the world a few units
    // after the crowd passes it, but `value` and `used` stay readable.
    let pumped = leaf!.value
    for (let i = 0; i < 600; i++) {
      game.step(STEP_MS)
      pumped = Math.max(pumped, leaf!.value)
      if (leaf!.used) break
    }

    // Every second spent in front of the gate is on the board the moment the
    // crowd crosses it — the whole point of standing there.
    expect(leaf!.used).toBe(true)
    expect(pumped).toBeGreaterThan(1)
    expect(game.squadCount.value).toBe(before + pumped)
  })
})

describe('everything you failed to destroy kills you', () => {
  // The rule that turns the level generator's vocabulary from scenery into
  // obstacles. A crate you could stroll through is a free stat; a barricade you
  // could stroll through is a decoration. `deathBreakdown()` is asserted rather
  // than the head count, because "the squad got smaller" is true for half a
  // dozen reasons and only one of them is the rule under test.

  it('kills survivors that walk into a live barricade', async () => {
    const game = await importGame()
    game.startStage(1)

    const mark = swerveIntoFirst(game, -GATE_LEAF_X, () => game.getBarricades()[0])
    expect(mark, 'no barricade streamed in').not.toBeNull()

    // A dead barricade is spliced out of the world before the contact loop ever
    // runs, so a `barricade` death is proof the block was still standing.
    expect(game.deathBreakdown().barricade).toBeGreaterThan(0)
  })

  it('kills survivors that walk into an unbroken crate', async () => {
    const game = await importGame()
    game.startStage(1)

    const mark = swerveIntoFirst(game, -GATE_LEAF_X, () => game.getCrates()[0], 2.4)
    expect(mark, 'no crate streamed in').not.toBeNull()

    const deaths = game.deathBreakdown()
    // A `crate` death IS the proof that the crate was live: `stepCrates` skips
    // anything already broken and the world splices it out, so only an intact
    // crate can ever bill anybody. (This used to also assert that no stat had
    // moved, which stopped being true once crates were priced to be breakable
    // at range — and was testing the pricing, not the rule.)
    expect(deaths.crate).toBeGreaterThan(0)
  })

  it('kills survivors that touch a gate divider', async () => {
    const game = await importGame()
    // Stage 2, because stage 1's OPENING bank is the teaching bank and ships
    // without a pillar on purpose — two identical leaves are nothing to commit
    // to, and charging a brand-new player for not knowing that would be the
    // game punishing them for a rule it has not shown them yet.
    game.startStage(2)
    // Straight down the centre line — the lazy line, and the one the pillar
    // exists to charge for.
    game.steerTo(0)
    advance(game, 600, () => game.getGates().some((g) => g.used) || settled(game))

    expect(game.deathBreakdown().divider).toBeGreaterThan(0)
  })

  it('never kills anybody with the gate itself', async () => {
    const game = await importGame()
    game.startStage(1)
    // Stage 1's opening bank has no pillar at all, which makes it the cleanest
    // possible proof that a GATE never kills.
    // Same bank, same three survivors, aimed at a leaf centre instead. Gates are
    // doorways: passing through one may only ever ADD.
    game.steerTo(-GATE_LEAF_X)
    const before = game.squadCount.value
    advance(game, 400, () => game.getGates().some((g) => g.used) || settled(game))

    expect(game.deathBreakdown()).toEqual({
      foe: 0, elite: 0, barricade: 0, crate: 0, divider: 0, trap: 0, slam: 0
    })
    expect(game.squadCount.value).toBeGreaterThan(before)
  })
})

describe('a gate bank is a commitment, and the pillar is what makes it one', () => {
  // Without a lethal divider the optimal play is to straddle the middle and
  // collect both leaves, and the bank stops asking the player anything. These
  // two runs are the same stage, the same squad and the same three seconds —
  // the only difference is where the thumb was.

  // Stage 2's first bank: the earliest one that HAS a pillar (stage 1's opener
  // is the pillar-free teaching bank).
  const runFirstBank = async (steerX: number) => {
    const game = await importGame()
    game.startStage(2)
    game.steerTo(steerX)
    advance(game, 600, () => game.getGates().some((g) => g.used) || settled(game))
    return { squad: game.squadCount.value, deaths: game.deathBreakdown() }
  }

  it('costs survivors when the crowd runs the centre line', async () => {
    const centre = await runFirstBank(0)
    expect(centre.deaths.divider).toBeGreaterThan(0)
  })

  it('costs nothing when the crowd commits to a leaf', async () => {
    const leaf = await runFirstBank(-GATE_LEAF_X)
    expect(leaf.deaths.divider).toBe(0)
    expect(leaf.squad).toBeGreaterThan(0)
  })
})

describe('a ÷N leaf halves the crowd that walked into it', () => {
  // The trap. It is the reason a bank is a decision rather than a formality,
  // and it has to take a REAL, arithmetic bite — "some survivors died" would be
  // indistinguishable from a foe biting, and the player would learn nothing.

  it('leaves floor(n / 2) of the survivors that went through, tallied as a trap', async () => {
    const game = await importGame()
    // Stage 2's second bank is `+6 | ÷2`, and the ÷2 is the right-hand leaf.
    game.startStage(2)
    game.debugAddUnits(10)
    game.steerTo(GATE_LEAF_X)

    let before = 0
    let trapDelta = 0
    for (let i = 0; i < 3000; i++) {
      const squadBefore = game.squadCount.value
      const trapBefore = game.deathBreakdown().trap
      game.step(STEP_MS)
      const trapAfter = game.deathBreakdown().trap
      if (trapAfter > trapBefore) {
        before = squadBefore
        trapDelta = trapAfter - trapBefore
        break
      }
      if (settled(game)) break
    }

    expect(before, 'the crowd never reached a ÷ leaf').toBeGreaterThan(1)
    // Half the crowd, rounded DOWN, walks back out. The loss is a `trap`, not a
    // `divider` — the leaf itself did this, not the pillar beside it.
    expect(trapDelta).toBe(before - Math.floor(before / 2))
    expect(game.squadCount.value).toBe(Math.floor(before / 2))
    expect(game.deathBreakdown().divider).toBe(0)
  })
})

describe('fire rate is earned in the run', () => {
  // The one stat a run may not start high, because it is the stat that makes
  // every other stat feel good. It starts crawling, it never moves on its own,
  // and the only thing that raises it is a rate crate — which the generator
  // always parks off the straight line.

  it('starts at the meta value and moves only when a crate pays out', async () => {
    const game = await importGame()
    game.startStage(1)
    expect(game.runFireRate.value).toBe(BASE_FIRE_RATE)
    expect(game.damage.value).toBe(BASE_DAMAGE)
    drainFx()

    // Asserted as an ACCOUNTING IDENTITY rather than "nothing happens for six
    // seconds": crates are priced to be breakable at range now, so a run down
    // any lane may well collect one, and a test that depended on the crowd
    // failing to reach them would be testing the pricing, not the rule.
    game.steerTo(-GATE_LEAF_X)
    let rateBreaks = 0
    let damageBreaks = 0
    for (let i = 0; i < 400; i++) {
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind !== 'crateBreak') continue
        if (e.crate === 'rate') rateBreaks++
        else damageBreaks++
      }
      expect(game.runFireRate.value).toBeCloseTo(BASE_FIRE_RATE + rateBreaks * CRATE_RATE_GAIN, 6)
      expect(game.damage.value).toBe(BASE_DAMAGE + damageBreaks * CRATE_DAMAGE_GAIN)
    }
  })

  it('rises by exactly CRATE_RATE_GAIN per rate crate, and nothing else', async () => {
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(30)
    game.steerTo(-GATE_LEAF_X)
    drainFx()

    // Stage 1 parks a rate crate dead centre at y = 27. Swing onto its line once
    // the opening bank is behind the crowd (gates eat rounds, so nothing beyond
    // one can be shot until it is spent) and shoot it down.
    let rateBreaks = 0
    for (let i = 0; i < 900; i++) {
      if (game.anchor().y > 18) game.steerTo(0)
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind === 'crateBreak' && e.crate === 'rate') rateBreaks++
      }
      if (rateBreaks > 0) break
    }

    // At least one broke, and the rate is exactly the base plus one gain per
    // break — two crates can burst in the same frame now that they are cheap,
    // so the assertion is the identity, not the count.
    expect(rateBreaks).toBeGreaterThan(0)
    expect(game.runFireRate.value).toBeCloseTo(BASE_FIRE_RATE + rateBreaks * CRATE_RATE_GAIN, 6)
  })

  it('never climbs past MAX_FIRE_RATE', async () => {
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(30)
    // Half a crate short of the ceiling: the next one has to clamp, not overshoot.
    game.debugAddFireRate(MAX_FIRE_RATE - BASE_FIRE_RATE - CRATE_RATE_GAIN / 2)
    game.steerTo(-GATE_LEAF_X)
    drainFx()

    let rateBreaks = 0
    for (let i = 0; i < 900; i++) {
      if (game.anchor().y > 18) game.steerTo(0)
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind === 'crateBreak' && e.crate === 'rate') rateBreaks++
      }
      if (rateBreaks > 0) break
    }

    // At least one broke, and the rate CLAMPED rather than overshooting. The
    // count is not asserted: crates are cheap enough now that two can burst in
    // the same frame, and this test is about the ceiling, not the pricing.
    expect(rateBreaks).toBeGreaterThan(0)
    expect(game.runFireRate.value).toBe(MAX_FIRE_RATE)
  })

  it('gives damage crates to damage and nothing to fire rate', async () => {
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(30)
    // Stage 1's damage crates both sit at x = 2.45; hold that line for the run.
    game.steerTo(2.45)
    drainFx()

    let rateBreaks = 0
    let damageBreaks = 0
    for (let i = 0; i < 2000; i++) {
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind !== 'crateBreak') continue
        if (e.crate === 'rate') rateBreaks++
        else damageBreaks++
      }
      if (settled(game)) break
    }

    expect(damageBreaks).toBeGreaterThan(0)
    // The two stats are accounted for independently and completely: whatever the
    // run happened to break, each crate kind moved ITS stat and only its stat.
    expect(game.damage.value).toBe(BASE_DAMAGE + damageBreaks * CRATE_DAMAGE_GAIN)
    expect(game.runFireRate.value).toBeCloseTo(BASE_FIRE_RATE + rateBreaks * CRATE_RATE_GAIN, 6)
  })
})

describe('minibosses are the midpoint win, not the climax', () => {
  // A stage whose only peak is the end boss asks the player to hold their nerve
  // for forty seconds. A stage with an elite in the middle gives them a win on
  // the way there — and a wipe that costs a third of a stage instead of all of
  // it. Which only works if beating one does NOT end the stage.

  it('puts at least one elite on every stage past the first', () => {
    expect(buildTrack(1).events.some((e) => e.kind === 'miniboss')).toBe(false)
    for (let stage = 2; stage <= 25; stage++) {
      const elites = buildTrack(stage).events.filter((e) => e.kind === 'miniboss')
      expect(elites.length, `stage ${stage} has no miniboss`).toBeGreaterThanOrEqual(1)
    }
  })

  it('announces itself, tracks its health, pays 8× — and does not end the stage', async () => {
    const game = await importGame()
    game.startStage(2)
    // Deliberately modest: the elite now PLANTS and blocks the road, so a squad
    // built to delete it in a single frame would leave the health banner with
    // nothing to track, and this test is about the banner.
    game.debugAddUnits(60)
    game.debugAddDamage(2)
    game.steerTo(-GATE_LEAF_X)
    drainFx()

    expect(game.eliteAlive.value).toBe(false)
    expect(game.eliteHp01.value).toBe(0)

    const fx: FxEvent[] = []
    const hp01: number[] = []
    let eliteType = ''
    let sawElite = false

    for (let i = 0; i < 4000; i++) {
      game.step(STEP_MS)
      fx.push(...drainFx())
      if (game.eliteAlive.value) {
        if (!sawElite) {
          sawElite = true
          eliteType = game.getFoes().find((f) => f.elite)?.typeId ?? ''
        }
        if (hp01[hp01.length - 1] !== game.eliteHp01.value) hp01.push(game.eliteHp01.value)
      } else if (sawElite) {
        break
      }
      if (settled(game)) break
    }

    expect(sawElite, 'no elite ever spawned').toBe(true)
    expect(eliteType).not.toBe('')

    // The banner's fuel: full on arrival, monotonically down, gone on death.
    expect(hp01[0]).toBe(1)
    expect(hp01.length).toBeGreaterThan(2)
    for (let i = 1; i < hp01.length; i++) expect(hp01[i]!).toBeLessThan(hp01[i - 1]!)
    expect(game.eliteAlive.value).toBe(false)
    expect(game.eliteHp01.value).toBe(0)

    // Coins. `foeDie`/`eliteDie` is always followed by the `coin` event carrying
    // the payout, so the two can be compared directly — and on stage 2 the road
    // pack and the miniboss are the SAME archetype, which is what makes this a
    // like-for-like comparison rather than a comparison of two monsters.
    const payoutAfter = (kind: FxEvent['kind']): number => {
      const at = fx.findIndex((e) => e.kind === kind)
      const coin = fx.slice(at).find((e) => e.kind === 'coin')
      return coin && coin.kind === 'coin' ? coin.value : -1
    }
    const normal = payoutAfter('foeDie')
    const elite = payoutAfter('eliteDie')

    expect(normal).toBe(foeDef(eliteType).coins)
    expect(elite).toBe(foeDef(eliteType).coins * 8)
    expect(elite).toBeGreaterThan(normal)

    // …and the stage carries on. An elite that ended the run would be a boss.
    expect(game.phase.value).toBe('run')
    expect(game.getBoss()).toBeNull()
  })
})

describe('the boss can actually reach the crowd', () => {
  // A REGRESSION TEST, and the bug it guards shipped: the boss used to slam its
  // own feet — `BOSS_HOLD_AHEAD` units in front of a crowd less than two units
  // deep — so the attack could not physically touch anybody and the fight was a
  // damage race with no failure state. The slam now targets the CROWD, and a
  // player who plants their thumb has to pay for it.

  it('kills survivors of a stationary crowd within a few slam cycles', async () => {
    const game = await importGame()
    game.startStage(1)
    // Enough bodies to survive the road, and deliberately NO extra damage: the
    // boss has to live long enough to swing.
    game.debugAddUnits(60)
    game.steerTo(-GATE_LEAF_X)

    advance(game, 4000, () => game.phase.value === 'boss' || settled(game))
    expect(game.phase.value, 'the crowd never reached the arena').toBe('boss')
    expect(game.deathBreakdown().slam).toBe(0)

    // The thumb never moves — `steerTo` is not called again — so the crowd is
    // standing exactly where the telegraph said the slam would land.
    let waited = 0
    for (let i = 0; i < 500; i++) {
      game.step(STEP_MS)
      waited = (i + 1) * STEP_MS
      if (game.deathBreakdown().slam > 0 || settled(game)) break
    }

    expect(game.deathBreakdown().slam, 'the boss slam never connected').toBeGreaterThan(0)
    // Three slam cycles of grace. It lands on the first one.
    expect(waited).toBeLessThan(3 * 2600)
  })
})

describe('losing a stage makes it 20 % softer, once', () => {
  // A floor under frustration, not a slide into triviality. It is deliberately
  // invisible mid-run: a player who is stuck gets a real concession without
  // being told they are being helped, and a player who clears first time never
  // learns it exists.

  /** Start `stage`, run until the first pack streams in, and read its health. */
  const firstFoeHp = (game: Game, stage: number): number => {
    game.startStage(stage)
    game.steerTo(-GATE_LEAF_X)
    advance(game, 900, () => game.getFoes().length > 0)
    return game.getFoes()[0]?.maxHp ?? -1
  }

  /**
   * Throw the run away and let the sim record the failure.
   *
   * The steering is not decoration: relief is only granted to a run that shows
   * evidence of a PLAYER, because otherwise an idle tab accumulates concessions
   * until the game plays itself — which the career simulation caught it doing.
   * So a test about the relief has to lose the way a person loses.
   */
  const loseRun = (game: Game): void => {
    game.steerTo(-2)
    game.steerTo(2)
    game.steerTo(-1)
    game.steerTo(1.5)
    game.__resetForTest()
    game.step(STEP_MS)
  }

  it('marks the stage failed and softens every enemy on the retry', async () => {
    const game = await importGame()

    expect(game.hasFailedStage(2)).toBe(false)
    const full = firstFoeHp(game, 2)
    expect(full).toBeGreaterThan(0)
    expect(game.reliefActive.value).toBe(false)

    loseRun(game)
    expect(game.phase.value).toBe('wipe')
    expect(game.hasFailedStage(2)).toBe(true)

    const relieved = firstFoeHp(game, 2)
    expect(game.reliefActive.value).toBe(true)
    // The real multiplier, measured off a real enemy — within a rounding step.
    expect(Math.abs(relieved - full * RETRY_HP_RELIEF)).toBeLessThanOrEqual(0.5)
  })

  it('gives MORE back the longer a stage keeps beating the player, down to a floor', async () => {
    const game = await importGame()
    const { reliefFor } = await import('@/game/survival')
    const full = firstFoeHp(game, 2)

    loseRun(game)
    const once = firstFoeHp(game, 2)

    loseRun(game)
    const twice = firstFoeHp(game, 2)

    loseRun(game)
    loseRun(game)
    loseRun(game)
    const many = firstFoeHp(game, 2)

    // One loss is a lesson; four in a row is a wall, and a wall is where people
    // stop playing. So the relief DEEPENS — but it flattens out rather than
    // sliding to zero, because a stage that cannot be lost is not a stage.
    expect(once).toBeLessThan(full)
    expect(twice).toBeLessThan(once)
    expect(many).toBeLessThan(twice)
    expect(many / full).toBeGreaterThan(0.55)
    expect(game.reliefActive.value).toBe(true)

    // …and the table is the one thing that decides it.
    expect(reliefFor(0)).toBe(1)
    expect(reliefFor(1)).toBeGreaterThan(reliefFor(2))
    expect(reliefFor(9)).toBe(reliefFor(4))
  })

  it('leaves a stage that was never lost at full strength', async () => {
    const game = await importGame()

    loseRun(game)                       // records a failure on stage 1, not 9
    expect(game.hasFailedStage(9)).toBe(false)

    firstFoeHp(game, 9)
    expect(game.reliefActive.value).toBe(false)
  })
})

describe('ending a run', () => {
  it('clears the stage when the boss dies, and banks the NEXT stage', async () => {
    const game = await importGame()
    const { getState } = await import('@/use/useTowerState')
    const { STAGE_KEY } = await import('@/keys')

    game.startStage(3)
    game.debugAddUnits(120)
    game.debugAddDamage(300)
    game.steerTo(-GATE_LEAF_X)

    advance(game, 6000, () => settled(game))

    expect(game.phase.value).toBe('clear')
    expect(game.runSummary().cleared).toBe(true)
    expect(game.runSummary().coins).toBeGreaterThan(0)
    // Banked immediately: a player who closes the tab on the victory screen has
    // earned the stage they just cleared.
    expect(getState(STAGE_KEY)).toBe(4)
    expect(localStorage.getItem('tower_state')).toContain('"ts_stage":4')
  })

  it('pays out on a wipe but does not bank the next stage', async () => {
    const game = await importGame()
    const { getState } = await import('@/use/useTowerState')
    const { STAGE_KEY } = await import('@/keys')

    game.startStage(2)
    game.__resetForTest()
    game.step(STEP_MS)

    expect(game.phase.value).toBe('wipe')
    expect(game.runSummary().cleared).toBe(false)
    // A failed run still pays something — a run that pays nothing teaches the
    // player that failing was a waste of their time, which it never is.
    expect(game.runSummary().coins).toBeGreaterThan(0)
    // …but it buys no ground.
    expect(getState(STAGE_KEY)).toBe(2)
  })

  it('never pays a stage out twice', async () => {
    const game = await importGame()
    game.startStage(1)
    game.__resetForTest()
    game.step(STEP_MS)
    const first = game.runSummary().coins
    game.step(STEP_MS)
    game.step(STEP_MS)
    expect(game.runSummary().coins).toBe(first)
  })
})

// ─── The geometry invariant ─────────────────────────────────────────────────
//
// One inequality decides whether a gate bank is a decision or a tax, and it is
// the kind of thing that drifts the moment somebody nudges a constant for a
// visual reason. It shipped broken once: at a crowd radius of 1.9 the innermost
// survivor of a PERFECTLY aimed crowd stood at x = 0.4, inside the pillar's
// 0.55 kill zone, so playing the bank correctly still cost four people and
// nothing on screen explained why.
describe('the load-bearing geometry invariant', () => {
  it('lets a perfectly-aimed crowd clear the pillar with room to spare', async () => {
    const {
      CROWD_MAX_R, DIVIDER_HALF_W, GATE_LEAF_X, GATE_LEAF_HALF, UNIT_R
    } = await import('@/game/survival')

    // A crowd centred on a leaf must not reach the pillar's kill zone…
    expect(CROWD_MAX_R + DIVIDER_HALF_W + UNIT_R).toBeLessThan(GATE_LEAF_X)
    // …and must still FIT inside the leaf it is aimed at.
    expect(CROWD_MAX_R).toBeLessThan(GATE_LEAF_HALF)
  })

  it('costs a full-size crowd nothing to run a bank it aimed at properly', async () => {
    const game = await importGame()
    game.startStage(3)
    game.step(16)
    const bank = game.getGates().filter((g) => !g.used)
    expect(bank.length).toBeGreaterThan(0)
    const leaf = bank[0]!

    game.debugAddUnits(220)
    game.steerTo(leaf.x)
    // Give the spring time to settle the whole crowd onto the leaf before the
    // bank arrives, then run through it.
    advance(game, 900, () => game.getGates().every((g) => g.used || g.y < game.anchor().y))

    expect(game.deathBreakdown().divider).toBe(0)
  })
})

describe('the onboarding hold', () => {
  /**
   * The lightbox in front of stage 1 is not a pause — a paused game cannot
   * demonstrate the one thing it exists to teach. `steerOnly` freezes the road
   * and leaves the crowd answering the thumb, and both halves of that matter:
   * a hold that also froze steering would teach nothing, and a hold that let
   * the road run would start the stage behind the tutorial.
   */
  it('freezes the road while the crowd still follows the player', async () => {
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(20)
    game.steerOnly.value = true

    const y0 = game.anchor().y
    game.steerTo(3.4)
    for (let i = 0; i < 120; i++) game.step(STEP_MS)

    // The squad went where it was told…
    expect(game.anchor().x, 'the crowd ignored the player during the hold')
      .toBeGreaterThan(2)
    // …and the road did not move under it.
    expect(game.anchor().y, 'the stage advanced behind the tutorial').toBeCloseTo(y0, 5)
    // Nothing of the stage streamed in either: the player meets the road when
    // the road starts, not through a scrim.
    expect(game.getGates().length, 'gates streamed in behind the lightbox').toBe(0)
    expect(game.getFoes().length, 'foes streamed in behind the lightbox').toBe(0)
    expect(game.getCrates().length, 'crates streamed in behind the lightbox').toBe(0)

    // Releasing it hands the stage straight back.
    game.steerOnly.value = false
    for (let i = 0; i < 60; i++) game.step(STEP_MS)
    expect(game.anchor().y, 'the road never restarted').toBeGreaterThan(y0 + 1)
  })
})
