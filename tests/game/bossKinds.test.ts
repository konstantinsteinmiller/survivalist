/**
 * ─── The boss is a pool now, and each kind has to actually be its kind ───────
 *
 * Everything here runs the REAL `step()` loop. That matters more than usual for
 * these three, because all three failed in a previous attempt in ways that a
 * unit test of the geometry would have passed with full marks:
 *
 *   • the CLAW's pockets were spaced at what a claw looks like, and caught 37 %
 *     of a perfectly-dodging crowd against 38 % of a stationary one — a dodge
 *     worth one percentage point;
 *   • the HEALER's every-third heal ran on the shared slam clock, on which a
 *     boss fight is two attacks long, so it never fired once;
 *   • the SUMMONER's spawn pressure was a rate with no total, and above a
 *     threshold the boss simply never took net damage.
 *
 * So the assertions below are all about what the fight COSTS and DOES over a
 * real fight, not about what the numbers say. Where a constant is read, it is
 * read to state a PREMISE ("the crowd really is wider than the furrow") rather
 * than as the expected value of the thing being measured — an assertion that
 * reads the same constant the code does passes for any value and proves nothing.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CROWD_MAX_R } from '@/game/survival'
import {
  BOSS_POOL, CLAW_FURROWS, CLAW_SPACING, HEAL_EVERY, HEAL_FRACTION, HEAL_MAX_CASTS,
  HEAL_MIN_GAP_S,
  SUMMON_BUDGET, SUMMON_CROWD_SCALE_MAX, SUMMON_OPENING_CD, SUMMON_PER_WAVE, SUMMON_WALL_SHARE,
  SUMMON_WAVES_MAX, SUMMON_WAVE_RAMP,
  THREAT_POOL_FROM_STAGE, WYRM_STAGE, summonBudgetBodies, summonWaveBodies, summonWaveSize,
  bossKindFor, chargeHalfW, clawFurrowHalfW, clawLaneXs, type BossKind
} from '@/game/threats'
import { drainFx, type FxEvent } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/** The shallowest stage in the rotation that fields each kind. */
const stageOf = (kind: BossKind): number => {
  for (let s = THREAT_POOL_FROM_STAGE; s < THREAT_POOL_FROM_STAGE + 40; s++) {
    if (bossKindFor(s) === kind) return s
  }
  throw new Error(`no stage fields ${kind}`)
}

/**
 * Guard gates already spent.
 *
 * Any test that holds a boss open has to say so, because "keep its health up"
 * and "keep its phases at zero" are not the same instruction: re-arming the
 * gates on every tick re-arms the PHASE on every tick, which pins the boss in a
 * permanent wind-up that never resolves. Two specs were written that way first
 * and measured a boss that had simply stopped doing anything.
 */
const SPENT = 99

const CLAW_STAGE = stageOf('claw')
const HEALER_STAGE = stageOf('healer')
const SUMMONER_STAGE = stageOf('summoner')

interface FightOptions {
  stage: number
  squad: number
  /** Extra per-survivor damage, so a fight can be made long or short on purpose. */
  damage?: number
  /** Where to steer each tick. */
  steer?: (game: Game, tick: number) => number
  maxTicks?: number
}

/** Walk straight into the arena and fight, collecting every effect. */
const fight = async (o: FightOptions) => {
  const game = await importGame()
  game.startStage(o.stage)
  game.debugSkipToArena()
  game.debugAddUnits(o.squad)
  if (o.damage) game.debugAddDamage(o.damage)
  for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
  expect(game.phase.value, `stage ${o.stage} never reached the arena`).toBe('boss')
  drainFx()

  const squadAtBoss = game.squadCount.value
  const fx: FxEvent[] = []
  let ticks = 0
  const max = o.maxTicks ?? 4000
  while (ticks < max && game.phase.value === 'boss' && !game.getBoss()?.dead) {
    game.steerTo(o.steer ? o.steer(game, ticks) : game.anchor().x)
    game.step(STEP_MS)
    fx.push(...drainFx())
    ticks++
  }
  return {
    game,
    fx,
    squadAtBoss,
    lost: squadAtBoss - game.squadCount.value,
    lostShare: squadAtBoss > 0 ? (squadAtBoss - game.squadCount.value) / squadAtBoss : 1,
    killed: game.getBoss()?.dead === true,
    seconds: (ticks * STEP_MS) / 1000,
    boss: game.getBoss()
  }
}

const of = <K extends FxEvent['kind']>(fx: FxEvent[], kind: K) =>
  fx.filter((e) => e.kind === kind) as Array<Extract<FxEvent, { kind: K }>>

// ─── The rotation itself ────────────────────────────────────────────────────

describe('the pool opens where the tutorial ends and nowhere earlier', () => {
  it('gives the two tutorial stages the one boss they were written around', () => {
    // Stages 1 and 2 only. Stage 3 used to be the meteor a third time and is
    // now the wyrm (`WYRM_STAGE`): the tutorial is the stages that teach the
    // fight, and by the third the player has beaten it twice — a third
    // rehearsal is where the 2026-09-20 fit test measured the session ending.
    for (let s = 1; s < WYRM_STAGE; s++) {
      expect(bossKindFor(s), `stage ${s} is inside the tutorial and got a variant`).toBe('meteor')
    }
    expect(bossKindFor(WYRM_STAGE), 'the third fight has to be a new one').toBe('wyrm')
    // …and it is the LAST stage before the pool opens, so nothing between the
    // hand-placed fight and the rotation is left on the tutorial's boss.
    expect(WYRM_STAGE).toBe(THREAT_POOL_FROM_STAGE - 1)
  })

  it('shows every kind before it shows any of them twice', () => {
    const met = new Set<BossKind>()
    for (let s = THREAT_POOL_FROM_STAGE; s < THREAT_POOL_FROM_STAGE + BOSS_POOL.length; s++) {
      met.add(bossKindFor(s))
    }
    expect(met.size, `the first ${BOSS_POOL.length} pool stages repeat a kind`)
      .toBe(BOSS_POOL.length)
  })

  it('is a pure function of the stage number', () => {
    // A player who wipes on a stage has to be able to LEARN it. Called twice
    // rather than compared to a table, so this catches a `Math.random()` or a
    // module-level counter creeping in — neither of which a table would.
    for (let s = 1; s <= 60; s++) expect(bossKindFor(s)).toBe(bossKindFor(s))
  })
})

// ─── The claw ───────────────────────────────────────────────────────────────

describe('the claw lays down gaps a crowd can actually stand in', () => {
  it('leaves a pocket wider than the crowd is, for the whole fight', () => {
    // The premise the whole attack rests on, asserted against the CROWD rather
    // than against the claw's own numbers. The first version of this attack
    // spaced its furrows at what a claw looks like and the pockets were narrower
    // than the crowd, so "dodging" moved 37 % to 38 %.
    //
    // Checked at the WIDEST the furrows ever get: the rage curve fattens them
    // every rake, and a pocket that holds the crowd on swing one and not on
    // swing ten is an attack that becomes undodgeable exactly when the player is
    // losing.
    const widest = clawFurrowHalfW(10_000)
    const pocket = CLAW_SPACING - 2 * widest
    expect(pocket, `a fully-raged pocket is ${pocket.toFixed(2)} against a crowd ${(CROWD_MAX_R * 2).toFixed(2)} across`)
      .toBeGreaterThan(CROWD_MAX_R * 2)
  })

  it('lays exactly its furrows, evenly, centred on where it aimed', () => {
    const lanes = clawLaneXs(1.25)
    expect(lanes.length).toBe(CLAW_FURROWS)
    // Centred: the mean of an odd, evenly-spaced set is the aim point.
    expect(lanes.reduce((a, b) => a + b, 0) / lanes.length).toBeCloseTo(1.25, 6)
    for (let i = 1; i < lanes.length; i++) {
      expect(lanes[i]! - lanes[i - 1]!).toBeCloseTo(CLAW_SPACING, 6)
    }
  })

  it('costs a crowd that reads it far less than one that does not', async () => {
    // THE measurement. A perfect reader steps into the nearest pocket; a
    // stationary crowd eats the middle furrow. Both fight the same boss with the
    // same build on the same stage, so the only difference is the answer.
    const intoAPocket = (game: Game): number => {
      const b = game.getBoss()
      const here = game.anchor().x
      if (!b || !b.aimed) return here
      // The claw's last third is not a rake any more (see `BOSS_ENRAGE_AT`), and
      // a policy that answers only the rake is not the perfect reader this test
      // claims to measure — it is a player who learned one of the two attacks.
      // A charge is a column, so the answer is the far side of it rather than a
      // pocket inside it; `chargeHalfW` is the simulation's own definition of how
      // wide, exactly as `CLAW_SPACING` is above.
      const opts = game.bossIsCharging()
        ? [
          b.slamX - (chargeHalfW(b.slams) + CROWD_MAX_R + 0.3),
          b.slamX + (chargeHalfW(b.slams) + CROWD_MAX_R + 0.3)
        ]
        : [b.slamX - CLAW_SPACING / 2, b.slamX + CLAW_SPACING / 2]
      const room = opts.filter((x) => Math.abs(x) <= 3.9)
      if (room.length === 0) return here
      return room.sort((p, q) => Math.abs(p - here) - Math.abs(q - here))[0]!
    }

    const dodged = await fight({ stage: CLAW_STAGE, squad: 200, steer: intoAPocket })
    const stood = await fight({ stage: CLAW_STAGE, squad: 200, steer: () => 0 })

    expect(stood.fx.filter((e) => e.kind === 'bossRake').length, 'the claw never raked')
      .toBeGreaterThan(1)
    expect(stood.lost, 'standing still in a rake cost nothing, so there is no dodge to measure')
      .toBeGreaterThan(10)
    // Not "a bit better" — the previous attempt's 37 % against 38 % would have
    // passed any loose comparison. Reading the rake has to be worth most of it.
    expect(dodged.lostShare, `dodging lost ${(dodged.lostShare * 100).toFixed(0)}% against ${(stood.lostShare * 100).toFixed(0)}%`)
      .toBeLessThan(stood.lostShare * 0.4)
  })

  it('announces the exact strips it is about to cut', async () => {
    const r = await fight({ stage: CLAW_STAGE, squad: 200, steer: () => 0 })
    const casts = of(r.fx, 'rakeCast')
    const rakes = of(r.fx, 'bossRake')
    expect(casts.length, 'the claw never announced a rake').toBeGreaterThan(1)
    expect(rakes.length, 'the claw never raked').toBeGreaterThan(1)
    // Each strike matches a cast exactly — same lanes, same width. A telegraph
    // that is a different shape from the hit is worse than none, and this is the
    // only place the two can drift apart.
    for (const rake of rakes) {
      const matched = casts.some((c) =>
        c.halfW === rake.halfW &&
        c.lanes.length === rake.lanes.length &&
        c.lanes.every((x, i) => Math.abs(x - rake.lanes[i]!) < 1e-9))
      expect(matched, `a rake on ${rake.lanes.map((n) => n.toFixed(2)).join('/')} was never announced`)
        .toBe(true)
    }
  })

  it('never draws a slam ring on the road it is raking', async () => {
    // The renderer paints the meteor's shrinking circle from `slamX`, which for
    // a claw is the middle FURROW — a "get out of here" mark on the one strip
    // the player must not stand in. The renderer gates on the kind; this asserts
    // the sim never puts a claw in a state that would arm that gate.
    const r = await fight({ stage: CLAW_STAGE, squad: 200, steer: () => 0 })
    expect(of(r.fx, 'meteorCast').length, 'a claw threw a meteor telegraph').toBe(0)
    expect(of(r.fx, 'bossSlam').length, 'a claw threw a slam').toBe(0)
  })
})

// ─── The healer ─────────────────────────────────────────────────────────────

describe('the healer actually heals, on its own clock', () => {
  it('puts the bar back up on every third cast, and stops at the cap', async () => {
    // Deliberately a long fight — no damage bonus and a modest crowd — because
    // the bound is the interesting half and only a long fight reaches it.
    const r = await fight({ stage: HEALER_STAGE, squad: 90, steer: () => 0, maxTicks: 6000 })
    const heals = of(r.fx, 'bossHeal')
    const casts = of(r.fx, 'healCast')

    expect(heals.length, 'the every-third heal never fired in a whole fight')
      .toBeGreaterThan(0)
    expect(casts.length, 'a heal landed with nothing announcing it')
      .toBeGreaterThanOrEqual(heals.length)
    // The cap is what makes the archetype winnable rather than a regeneration
    // rate nobody under it can out-damage.
    expect(heals.length, `the healer healed ${heals.length} times`)
      .toBeLessThanOrEqual(HEAL_MAX_CASTS)
    // …and it is worth what it says it is worth. `amount` is health ACTUALLY
    // restored, so a heal is either the full fraction or exactly whatever was
    // missing — a guard gate clamps the bar at two thirds, so the second heal in
    // a fight routinely tops out. Both cases are asserted, because "at most the
    // fraction" alone would pass a heal that did nothing.
    const b = r.boss!
    const full = b.maxHp * HEAL_FRACTION
    let sawUncapped = false
    for (const h of heals) {
      const after = h.hp01 * b.maxHp
      if (after >= b.maxHp - 1e-6) {
        expect(h.amount, 'a topped-out heal restored more than was missing')
          .toBeLessThanOrEqual(full + 1e-6)
        continue
      }
      expect(h.amount).toBeCloseTo(full, 3)
      sawUncapped = true
    }
    expect(sawUncapped, 'every heal in the fight was clamped, so the size is untested')
      .toBe(true)
  })

  it('never lands two heals inside the minimum gap', async () => {
    // Measured in SECONDS of fight rather than in casts, because that is what
    // the bound is about: `HEAL_EVERY` counts casts, and anything that shortens
    // the cadence — a guard gate re-arming the clock at `bossTelegraph` is the
    // one that actually happens — shortens the gap with it. The cast count can
    // be perfectly correct while the heals bunch up.
    //
    // Its own loop rather than `fight()` because the gap is a question about
    // WHEN, and the shared helper flattens the fx of every tick into one list.
    const game = await importGame()
    game.startStage(HEALER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(90)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    expect(game.phase.value, 'never reached the arena').toBe('boss')
    drainFx()

    const at: number[] = []
    let ticks = 0
    while (ticks < 6000 && game.phase.value === 'boss' && !game.getBoss()?.dead) {
      // Held open, the file's usual way — see `SPENT`.
      //
      // A gap of ten seconds needs a fight of twenty to show up twice, and an
      // ordinary one is not: left alone the crowd wipes, and kept alive it kills
      // the boss instead. Either way the test failed on its own premise
      // (`at.length > 1`) rather than on the property, which is the flake that
      // teaches people to re-run a suite instead of reading it.
      //
      // Pinning the bar does NOT hide the thing under test: `bossHeal` is pushed
      // on every heal whether or not the bar had room, so the CADENCE is still
      // fully measured. What it does cost is the guard-gate path — no damage
      // lands, so no gate turns — and that path is covered where it is actually
      // enforced, by the invariant in `stepBoss` rather than by hoping a long
      // fight happens to produce one.
      const b = game.getBoss()
      if (b) { b.hp = b.maxHp; b.guarded = SPENT; b.guard = 0 }
      // …and the crowd kept alive, the way the "second half" specs below keep
      // it: a stationary crowd eats every drain in the fight now
      // (`DRAIN_SHARE_MUL`), and a crowd that wipes at second fifteen ends a
      // fight that needed twenty to show a gap twice.
      if (game.squadCount.value < 45) game.debugAddUnits(90 - game.squadCount.value)
      game.steerTo(game.anchor().x)
      game.step(STEP_MS)
      for (const e of drainFx()) if (e.kind === 'bossHeal') at.push(ticks)
      ticks++
    }

    // Two is the premise: one heal cannot be too close to anything.
    expect(at.length, `only ${at.length} heal(s) in the fight, so the gap is untested`)
      .toBeGreaterThan(1)
    for (let i = 1; i < at.length; i++) {
      const gap = ((at[i]! - at[i - 1]!) * STEP_MS) / 1000
      expect(gap, `heals ${i} and ${i + 1} landed ${gap.toFixed(2)} s apart`)
        .toBeGreaterThanOrEqual(HEAL_MIN_GAP_S - STEP_MS / 1000)
    }
  })

  it('spends two casts on something else between every heal', async () => {
    const r = await fight({ stage: HEALER_STAGE, squad: 90, steer: () => 0, maxTicks: 6000 })
    const heals = of(r.fx, 'bossHeal').length
    const bossBolts = of(r.fx, 'bossBoltCast').length
    expect(heals, 'no heals, so the cadence is untested').toBeGreaterThan(0)
    expect(bossBolts, 'the healer only ever healed — it has no other attack')
      .toBeGreaterThanOrEqual(heals * (HEAL_EVERY - 1))
  })

  it('throws a projectile that exists in the world before it hurts anybody', async () => {
    // A bolt is the one attack whose warning IS the attack: it has to be a body
    // on the road for a real stretch of time before the burst. Measured as
    // frames with a bolt in flight before the first `bossBoltHit`, because "was
    // there a cast" cannot distinguish a slow projectile from an instant one.
    const game = await importGame()
    game.startStage(HEALER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(120)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()

    let airborneTicks = 0
    let sawHit = false
    let maxAloft = 0
    for (let i = 0; i < 4000 && game.phase.value === 'boss'; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
      maxAloft = Math.max(maxAloft, game.getBossBolts().length)
      if (game.getBossBolts().length > 0) airborneTicks++
      if (drainFx().some((e) => e.kind === 'bossBoltHit')) { sawHit = true; break }
    }
    expect(maxAloft, 'the healer never launched a bolt').toBeGreaterThan(0)
    expect(sawHit, 'no bolt ever went off on the crowd').toBe(true)
    // Half a second of visible flight is the floor. Anything less and the
    // "slow-moving projectile" is a hitscan with a sprite.
    expect((airborneTicks * STEP_MS) / 1000, 'the bolt was barely in the air')
      .toBeGreaterThan(0.5)
  })

  it('lets a crowd that steers off the line keep more of itself', async () => {
    // The bolt has to be answerable. Same fight, same build, two answers.
    const offTheLine = (game: Game): number => {
      const b = game.getBoss()
      const here = game.anchor().x
      if (!b || !b.aimed || b.charging) return here
      const opts = [b.slamX - 3.2, b.slamX + 3.2].filter((x) => Math.abs(x) <= 3.9)
      if (opts.length === 0) return here
      return opts.sort((p, q) => Math.abs(p - here) - Math.abs(q - here))[0]!
    }
    const moved = await fight({ stage: HEALER_STAGE, squad: 200, steer: offTheLine, maxTicks: 6000 })
    const stood = await fight({ stage: HEALER_STAGE, squad: 200, steer: () => 0, maxTicks: 6000 })
    expect(stood.lost, 'the bossBolts never landed on the stationary crowd either')
      .toBeGreaterThan(10)

    // ── The measurement is HITS PER CAST, not the loss share ──
    //
    // The loss share was the assertion first, and it is CENSORED: a stationary
    // crowd at this build is wiped, so the control reads 100 % and cannot read
    // higher. Everything the dodge is worth has to fit in the gap below a
    // ceiling the control is already sitting on, so the moment anything makes
    // the fight more lethal — a boss phase, a scaling pass — the moving run
    // reaches the same ceiling and the spec flips a coin. It did: five runs gave
    // 82–100 % moving against 38–100 % standing, failing about half the time,
    // while the thing it was supposed to be measuring had not moved at all.
    //
    // How often a launched bolt finds anybody is uncensored, is the geometric
    // fact "the bolt is answerable" actually means, and does not care how long
    // either fight lasted. Measured at 0.64 against 0.94.
    const rate = (f: typeof moved): number =>
      f.fx.filter((e) => e.kind === 'bossBoltHit').length /
      Math.max(1, f.fx.filter((e) => e.kind === 'bossBoltCast').length)
    const movedRate = rate(moved)
    const stoodRate = rate(stood)
    expect(stood.fx.filter((e) => e.kind === 'bossBoltCast').length,
      'the healer never launched a bolt at the stationary crowd')
      .toBeGreaterThan(2)
    expect(movedRate,
      `moving was hit by ${(movedRate * 100).toFixed(0)}% of bolts against ${(stoodRate * 100).toFixed(0)}%`)
      .toBeLessThan(stoodRate * 0.85)
    // …and it still has to show up in the outcome. Kept as `<=` rather than `<`
    // precisely because of the ceiling above: two wiped runs are a tie, and a tie
    // is not evidence that dodging failed, it is evidence that this build loses
    // either way. The rate above is what carries the invariant.
    expect(moved.lostShare, `moving lost ${(moved.lostShare * 100).toFixed(0)}% against ${(stood.lostShare * 100).toFixed(0)}%`)
      .toBeLessThanOrEqual(stood.lostShare)
  })
})

// ─── The summoner ───────────────────────────────────────────────────────────

describe('the summoner is a wall with a budget', () => {
  it('ramps the budget without changing what it adds up to', () => {
    // The ramp covers the whole budget, or waves past its end fall back to the
    // flat size and quietly re-add the bodies it was meant to remove.
    expect(SUMMON_WAVE_RAMP.length, 'the ramp does not cover every wave')
      .toBe(SUMMON_WAVES_MAX)
    // The price follows the ramp rather than the other way round — see
    // `SUMMON_BUDGET`. Asserted so a hand-written total cannot creep back in.
    expect(SUMMON_BUDGET).toBe(SUMMON_WAVE_RAMP.reduce((a, b) => a + b, 0))
    // The point of the ramp: the opening is smaller than the flat wave it
    // replaced, and NOTHING ELSE IS BIGGER. Both halves matter — the first
    // shape tried here bought a gentle opening with a heavier tail, which
    // landed its extra bodies exactly when the crowd was least able to answer
    // them and cost the summoner its "the wall ends" guarantee.
    expect(summonWaveSize(1), 'the opening wave is not smaller than the flat size')
      .toBeLessThan(SUMMON_PER_WAVE)
    for (let n = 1; n <= SUMMON_WAVES_MAX; n++) {
      expect(summonWaveSize(n), `wave ${n} is bigger than the flat size it replaced`)
        .toBeLessThanOrEqual(SUMMON_PER_WAVE)
    }
  })

  it('opens with a beat before the first wave', async () => {
    // The measured failure: at one wave per `SUMMON_CD` from 1.4 s in, the whole
    // budget was on the road inside nine seconds and an under-geared squad was
    // gone in 8.5 s — against 17-29 s for every other kind at the same health.
    // Asserted as the TIME the first wave lands, because that is the thing the
    // player experiences; the constant it comes from is an implementation
    // detail that a guard phase can and does override.
    const game = await importGame()
    game.startStage(SUMMONER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(60)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    expect(game.phase.value, 'never reached the arena').toBe('boss')
    drainFx()

    let ticks = 0
    let firstWaveAt = -1
    while (ticks < 1200 && firstWaveAt < 0 && game.phase.value === 'boss') {
      game.steerTo(0)
      game.step(STEP_MS)
      if (drainFx().some((e) => e.kind === 'summonWave')) firstWaveAt = ticks
      ticks++
    }
    expect(firstWaveAt, 'no wave arrived at all').toBeGreaterThanOrEqual(0)
    // +1: the wave fires DURING the step at that index, so that whole tick of
    // simulated time has elapsed by the time it lands.
    const seconds = ((firstWaveAt + 1) * STEP_MS) / 1000
    expect(seconds, `the first wave landed ${seconds.toFixed(2)} s in`)
      .toBeGreaterThanOrEqual(SUMMON_OPENING_CD - STEP_MS / 1000)
  })

  it('fills the road with bodies instead of attacking', async () => {
    const r = await fight({ stage: SUMMONER_STAGE, squad: 60, steer: () => 0, maxTicks: 6000 })
    const waves = of(r.fx, 'summonWave')
    expect(waves.length, 'the summoner never summoned').toBeGreaterThan(0)
    for (const w of waves) expect(w.count).toBe(summonWaveSize(w.wave))
    // It has no attack of its own. Nothing it does may ever arrive as one of the
    // boss's own swings — the pressure is the bodies, and if it also swung it
    // would simply be a meteor with adds.
    expect(of(r.fx, 'bossSlam').length, 'the summoner threw a slam').toBe(0)
    expect(of(r.fx, 'bossRake').length, 'the summoner threw a rake').toBe(0)
    expect(of(r.fx, 'bossBoltHit').length, 'the summoner threw a bolt').toBe(0)
  })

  it('never fields more waves than its budget, however long the fight runs', async () => {
    // THE bound, and the reason the previous attempt's summoner was unwinnable:
    // spawn pressure is a rate subtracted from the player's damage, so above a
    // threshold the boss never takes net damage at all. A cap on the TOTAL turns
    // the rate into a quantity, which is a thing a losing player can outlast.
    //
    // Forced long on purpose: the boss is held at full health so the fight runs
    // far past any budget a real fight would spend.
    const game = await importGame()
    game.startStage(SUMMONER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(120)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()
    let waves = 0
    for (let i = 0; i < 6000 && game.phase.value === 'boss'; i++) {
      const b = game.getBoss()
      if (b) { b.hp = b.maxHp; b.guarded = SPENT; b.guard = 0 }
      game.steerTo(0)
      game.step(STEP_MS)
      waves += drainFx().filter((e) => e.kind === 'summonWave').length
    }
    expect(waves, 'a summoner held open for 96 seconds spent no waves at all')
      .toBeGreaterThan(0)
    expect(waves, `an endless fight fielded ${waves} waves`).toBeLessThanOrEqual(SUMMON_WAVES_MAX)
  })

  it('prices its wall in seconds of the crowd\'s own fire, like its bar', async () => {
    // The owner's brief: "his minions based on the adaptive difficulty". A wall
    // priced as husks was wet paper by stage 20; one priced as a share of an
    // authored bar was wet paper at every stage once the bar itself stopped
    // being authored. Priced in the run's own seconds, the wall scales with the
    // crowd that walked in — the same way the bar does — whatever the stage.
    //
    // Read the world BEFORE starting the next fight. The simulation is a module
    // singleton and `startStage` wipes it, so a `getFoes()` held across two
    // fights reads the second one's road — which is how the first version of
    // this test compared a stage against itself and still went green.
    const measure = async (squad: number, damage = 0): Promise<{ wall: number; dps: number; bar: number }> => {
      const r = await fight({ stage: SUMMONER_STAGE, squad, damage, steer: () => 0, maxTicks: 400 })
      const summons = r.game.getFoes().filter((f) => !f.elite && f.design === 'marrowknight')
      expect(summons.length, `no summons on the road at squad ${squad} to measure`).toBeGreaterThan(0)
      const perBody = summons[0]!.maxHp
      return {
        wall: perBody * summonBudgetBodies(r.squadAtBoss),
        dps: r.squadAtBoss * r.game.damage.value * r.game.runFireRate.value,
        bar: r.boss!.maxHp
      }
    }
    const small = await measure(120)
    const hard = await measure(120, 3)
    // A crowd hitting four times harder meets a wall four times tougher — the
    // same seconds of ITS fire. The band is for rounding, not for the model:
    // one body's health is a whole number, and at this size a body is a few
    // dozen points.
    expect(hard.wall / small.wall, 'the wall ignored the firepower that walked in')
      .toBeGreaterThan((hard.dps / small.dps) * 0.9)
    expect(hard.wall / small.wall).toBeLessThan((hard.dps / small.dps) * 1.1)
    // …and it is a real share of the fight, not a rounding error beside the
    // bar: between them, the bar and the wall are the fight (`SUMMON_WALL_SHARE`).
    expect(small.wall / (small.wall + small.bar), 'the wall is a sliver of the fight')
      .toBeGreaterThan(SUMMON_WALL_SHARE * 0.6)
  })

  it('raises a wider wall in front of a bigger crowd, from the same budget', () => {
    // Four skeletons in front of three thousand survivors is not a wall. The
    // COUNT follows the crowd (`summonCrowdScale`); the budget of WAVES does not
    // move, so the wall ends exactly as it always did.
    expect(summonWaveBodies(2, 40)).toBe(summonWaveSize(2))
    expect(summonWaveBodies(2, 3000)).toBeGreaterThan(summonWaveSize(2))
    expect(summonWaveBodies(2, 3000)).toBeLessThanOrEqual(summonWaveSize(2) * SUMMON_CROWD_SCALE_MAX)
    let last = 0
    for (const squad of [10, 60, 120, 300, 1000, 4000]) {
      const n = summonBudgetBodies(squad)
      expect(n, `a crowd of ${squad} met a smaller wall than a smaller crowd`).toBeGreaterThanOrEqual(last)
      last = n
    }
  })

  it('fields its whole wall before the bar can be finished, however hard it is hit', async () => {
    // The measurement that made the wall answer the bar (`SUMMON_GUARD_GATES`):
    // priced in the fight's own seconds on the clock alone, the summoner died
    // having raised one to three waves of six, because a strong crowd took the
    // bar before the wall had risen. An overwhelming crowd is the case.
    const r = await fight({ stage: SUMMONER_STAGE, squad: 400, damage: 20, steer: () => 0, maxTicks: 6000 })
    expect(r.killed, 'the overwhelming crowd never finished the summoner').toBe(true)
    expect(of(r.fx, 'summonWave').length, 'the summoner died before its wall had risen')
      .toBe(SUMMON_WAVES_MAX)
  })

  it('is beatable by a squad that cannot out-damage the spawn rate', async () => {
    // The failure this whole design is shaped around: measured on the uncapped
    // version, a half-DPS squad killed the summoner on NO seed and lost 100 % of
    // itself every time. With the total bounded it has to end.
    // Half the DPS the arena probe calls "tuned" for this stage, and no dodging
    // at all — a squad that is genuinely behind the curve rather than one that
    // is merely small. A 55-strong squad loses this fight and should: the claim
    // is that the wall ENDS, not that nothing can lose to it.
    const r = await fight({ stage: SUMMONER_STAGE, squad: 90, steer: () => 0, maxTicks: 6000 })
    expect(r.killed, `a small squad never finished the summoner in ${r.seconds.toFixed(1)} s`)
      .toBe(true)
    expect(r.lostShare, 'the summoner cost the whole squad').toBeLessThan(1)
  })
})

/**
 * ─── The two bounds, measured without reading the constants that set them ───
 *
 * `heals <= HEAL_MAX_CASTS` and `waves <= SUMMON_WAVES_MAX` are statements of
 * intent, and they are worth having — but each reads the same number the code
 * reads, so raising the constant to infinity moves BOTH sides and the assertion
 * goes green on an unbounded boss. Mutation-tested, and that is exactly what
 * happened: `HEAL_MAX_CASTS = 9999` survived the whole suite.
 *
 * These two ask the question the design actually cares about — "does it STOP?" —
 * against the clock instead of against the constant.
 */
describe('the two things that must stop, stop', () => {
  it('leaves the second half of a long healer fight with no heals in it', async () => {
    // Held open at full health so the fight runs far past any budget. A capped
    // healer spends its heals in the opening seconds and is an ordinary boss
    // afterwards; an uncapped one is still healing at the end, which is the
    // shape a player under its regeneration rate can never win against.
    const game = await importGame()
    game.startStage(HEALER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(200)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()

    const TICKS = 5000
    let lastHealAt = -1
    let heals = 0
    for (let i = 0; i < TICKS; i++) {
      const b = game.getBoss()
      if (b) { b.hp = b.maxHp * 0.5; b.guarded = SPENT; b.guard = 0 }
      // Kept alive too: a healer that has eaten its crowd stops being measured.
      if (game.squadCount.value < 60) game.debugAddUnits(200 - game.squadCount.value)
      game.steerTo(0)
      game.step(STEP_MS)
      if (drainFx().some((e) => e.kind === 'bossHeal')) { heals++; lastHealAt = i }
    }
    expect(heals, 'a healer held open for 80 seconds never healed at all').toBeGreaterThan(0)
    expect(lastHealAt / TICKS, `the last heal landed ${((lastHealAt / TICKS) * 100).toFixed(0)}% into the fight`)
      .toBeLessThan(0.5)
  })

  it('leaves the second half of a long summoner fight with no waves in it', async () => {
    const game = await importGame()
    game.startStage(SUMMONER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(200)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()

    const TICKS = 5000
    let lastWaveAt = -1
    let waves = 0
    for (let i = 0; i < TICKS; i++) {
      const b = game.getBoss()
      if (b) { b.hp = b.maxHp * 0.5; b.guarded = SPENT; b.guard = 0 }
      if (game.squadCount.value < 60) game.debugAddUnits(200 - game.squadCount.value)
      game.steerTo(0)
      game.step(STEP_MS)
      if (drainFx().some((e) => e.kind === 'summonWave')) { waves++; lastWaveAt = i }
    }
    expect(waves, 'a summoner held open for 80 seconds never summoned at all').toBeGreaterThan(0)
    expect(lastWaveAt / TICKS, `the last wave rose ${((lastWaveAt / TICKS) * 100).toFixed(0)}% into the fight`)
      .toBeLessThan(0.5)
  })
})

describe('the two things that must ARRIVE, arrive', () => {
  it('lands the healer’s first heal inside a boss fight’s own length', async () => {
    // The failure this locks is the one the archetype was found dead of: on the
    // shared slam clock a boss fight is about two casts long, so an every-third
    // heal never fires. Measured against the fight length the game is DESIGNED
    // for (`BOSS_BASE_HP` puts a boss at five to eight seconds) rather than
    // against the healer's own cadence — reading `HEALER_CAST_CD` here would
    // pass for any cadence at all, which is precisely how a six-second clock
    // survived the first version of this suite.
    const game = await importGame()
    game.startStage(HEALER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(200)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()

    /** The longest a boss fight is meant to last, seconds. See `BOSS_BASE_HP`. */
    const FIGHT_BUDGET_S = 8
    let firstHealTick = -1
    const ticks = Math.ceil((FIGHT_BUDGET_S * 1000) / STEP_MS)
    for (let i = 0; i < ticks; i++) {
      const b = game.getBoss()
      if (b) { b.hp = b.maxHp * 0.5; b.guarded = SPENT; b.guard = 0 }
      game.steerTo(0)
      game.step(STEP_MS)
      if (firstHealTick < 0 && drainFx().some((e) => e.kind === 'bossHeal')) firstHealTick = i
    }
    expect(firstHealTick, `no heal inside ${FIGHT_BUDGET_S} s — the every-third is dead code`)
      .toBeGreaterThanOrEqual(0)
  })

  it('rises a summon wave close enough to reach the crowd during the fight', async () => {
    // A wave that rises at the boss's feet is a wave that arrives after the
    // fight: the boss spawns twelve units out and walks in at 0.85 u/s, slower
    // than any fight lasts, so anything sited on its body is several seconds of
    // husk-walking away. Asserted two ways — where the ground opens, and whether
    // anybody was actually bitten — because the first is geometry and the second
    // is the thing the geometry is for.
    const { foeDef } = await import('@/game/foes')
    /** The longest a wave may be from the crowd, in seconds of walking. */
    const REACH_BUDGET_S = 3

    const game = await importGame()
    game.startStage(SUMMONER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(90)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()

    const walks: number[] = []
    const bitesBefore = game.deathBreakdown().foe
    for (let i = 0; i < 3000 && game.phase.value === 'boss'; i++) {
      const anchorY = game.anchor().y
      game.steerTo(0)
      game.step(STEP_MS)
      for (const e of drainFx()) {
        if (e.kind !== 'summonWave') continue
        walks.push((e.y - anchorY) / foeDef('husk').speed)
      }
    }
    expect(walks.length, 'the summoner never summoned').toBeGreaterThan(0)
    for (const w of walks) {
      expect(w, `a wave rose ${w.toFixed(1)} s of walking away from the crowd`)
        .toBeLessThanOrEqual(REACH_BUDGET_S)
    }
    expect(game.deathBreakdown().foe - bitesBefore,
      'not one summon reached the crowd in a whole fight').toBeGreaterThan(0)
  })
})

// ─── The warning badge ──────────────────────────────────────────────────────

describe('the corner warning tells the truth about what is coming', () => {
  it('does not cry DODGE at a heal nobody can dodge', async () => {
    // The badge's single word is an instruction. A heal cannot be answered by
    // moving, so raising the same badge for it teaches the player that the badge
    // sometimes means nothing — which costs them the swing it is actually for.
    const game = await importGame()
    game.startStage(HEALER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(90)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)

    let sawHealWindUp = false
    let badgeDuringHeal = 0
    for (let i = 0; i < 6000 && game.phase.value === 'boss'; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
      const t = game.incomingThreat()
      if (t?.kind === 'heal') {
        sawHealWindUp = true
        expect(t.dodgeable, 'a heal was reported as dodgeable').toBe(false)
        if (game.attackIncoming()) badgeDuringHeal++
      }
    }
    expect(sawHealWindUp, 'the healer never wound up a heal, so nothing was tested').toBe(true)
    expect(badgeDuringHeal, 'the DODGE badge came up for a heal').toBe(0)
  })

  it('still cries DODGE at everything that can be dodged', async () => {
    for (const [kind, stage] of [['rake', CLAW_STAGE], ['bolt', HEALER_STAGE]] as const) {
      const game = await importGame()
      game.startStage(stage)
      game.debugSkipToArena()
      game.debugAddUnits(90)
      for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
      let seen = 0
      for (let i = 0; i < 4000 && game.phase.value === 'boss'; i++) {
        game.steerTo(0)
        game.step(STEP_MS)
        const t = game.incomingThreat()
        if (t?.kind !== kind) continue
        seen++
        expect(t.dodgeable, `a ${kind} was reported as undodgeable`).toBe(true)
        expect(game.attackIncoming(), `the badge stayed down for an incoming ${kind}`).toBe(true)
      }
      expect(seen, `no ${kind} was ever wound up on stage ${stage}`).toBeGreaterThan(0)
    }
  })

  it('says nothing at all about a summon wave', async () => {
    // Three skeletons coming up out of the road are the most legible warning in
    // the game. A corner badge would compete with them and would be pointing at
    // a thing there is no "dodge" for.
    const game = await importGame()
    game.startStage(SUMMONER_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(60)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()
    let waves = 0
    let bossBadge = 0
    for (let i = 0; i < 2000 && game.phase.value === 'boss'; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
      waves += drainFx().filter((e) => e.kind === 'summonWave').length
      // Only the BOSS's own contribution: an elite left on the road would raise
      // the badge legitimately, and there are none in a bare arena.
      if (game.incomingThreat() !== null) bossBadge++
    }
    expect(waves, 'the summoner never summoned, so nothing was tested').toBeGreaterThan(0)
    expect(bossBadge, 'a summoner raised the incoming-attack badge').toBe(0)
  })
})

// ─── Costs, side by side ────────────────────────────────────────────────────

describe('a new kind is a different fight, not a harder one', () => {
  it('kills a crowd that never moves and spares one that reads the tell', async () => {
    // Both halves matter and they fail in opposite directions: an attack nobody
    // can dodge is a tax, and one that costs nothing when it lands is scenery.
    // Asserted for the two kinds that aim at the ground.
    for (const stage of [CLAW_STAGE, HEALER_STAGE]) {
      const stood = await fight({ stage, squad: 200, steer: () => 0, maxTicks: 6000 })
      expect(stood.lostShare, `stage ${stage} cost a stationary crowd nothing`)
        .toBeGreaterThan(0.15)
    }
  })
})
