/**
 * ─── The boss has a second half now ─────────────────────────────────────────
 *
 * The fight had one idea and spent it in the first four seconds: a wind-up, a
 * swing, and then the same swing until somebody fell over. Phase two is the
 * answer — at the guard gate at or below half health the boss turns over, the
 * cadence tightens, the body lights up, and the two kinds whose whole fight was
 * one swing gain a lane charge.
 *
 * Four things can go wrong here and three of them are invisible in a screenshot,
 * so all four are measured against the real `step()` loop:
 *
 *   • the TURN firing twice, or never, or moving — it is a latch on a guard
 *     gate precisely because a health threshold un-crosses, and there is a
 *     healing archetype in the pool whose entire job is to un-cross it;
 *   • the CHARGE landing off the beat its telegraph promised. That is the one
 *     failure this game treats as unforgivable (`useVfx`'s note on the casts),
 *     and the charge is the attack most able to commit it: half of its wind-up
 *     is a body travelling, so the animation and the damage are two clocks that
 *     have to be one;
 *   • the charge being UNDODGEABLE. A lane attack a crowd cannot stand beside is
 *     the claw's original bug (37 % against 38 %) with a different shape;
 *   • the tempo going off the end of the envelope the cadence was tuned inside,
 *     or scaling into a wall at depth. Both are arithmetic, and both are checked
 *     as arithmetic rather than hoped for.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  BOSS_GUARD_GATES, CROWD_MAX_R, SLAM_CD_BASE, SLAM_CD_DECAY, SLAM_CD_MIN,
  SLAM_MAX_FRACTION, endlessPressure
} from '@/game/survival'
import {
  BOSS_ENRAGE_AT, BOSS_ENRAGE_FROM_STAGE, CHARGE_KILL_SHARE, CHARGE_OVERRUN,
  CHARGE_TELEGRAPH_MIN, DRAIN_HALF_W, DRAIN_TELEGRAPH_MIN, GAZE_OPEN,
  ENRAGED_CD_MUL, HEALER_CAST_CD, HEALER_TELEGRAPH, SUMMON_TELEGRAPH,
  THREAT_POOL_FROM_STAGE,
  bossCharges, bossKindFor, chargeHalfW, enragedSpan, type BossKind
} from '@/game/threats'
import { drainFx, type FxEvent } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

/**
 * The furthest the crowd's centre can be steered, from `steerTo`'s own clamp.
 *
 * Stated here as a premise the geometry below is checked against rather than
 * imported: every "is there room to dodge" claim in this file is a claim about
 * where the player can actually put the crowd, and reading the clamp back out of
 * the code the clamp lives in would make those claims true by construction.
 */
const STEER_REACH = 4.1

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

const METEOR_STAGE = stageOf('meteor')
const CLAW_STAGE = stageOf('claw')
const HEALER_STAGE = stageOf('healer')
const SUMMONER_STAGE = stageOf('summoner')

const of = <K extends FxEvent['kind']>(fx: FxEvent[], kind: K) =>
  fx.filter((e) => e.kind === kind) as Array<Extract<FxEvent, { kind: K }>>

interface WatchOptions {
  stage: number
  squad: number
  damage?: number
  fireRate?: number
  maxTicks?: number
  /** Where to steer this tick. Given the live game, so a policy can read the
   *  attack it is answering the same way a player reads it. */
  steer?: (game: Game) => number
  /**
   * Hold the fight open past the point it would end.
   *
   * The file's usual device (`SPENT` in `bossKinds.test.ts`) and it is needed for
   * the same reason: phase two is by definition the LAST third of a fight, and a
   * fight that ends four swings later has no last third to measure. Topping the
   * crowd back up and putting a floor under the boss costs nothing that is under
   * test here — the turn has already happened, the gates are all spent, and
   * every cadence and geometry number below is read off the boss itself rather
   * than off how long it took to die.
   *
   * TWO strengths, and the difference is a flake that cost a run to find. A
   * three-percent floor is not a floor: it is re-applied at the START of a tick
   * and a crowd of four hundred puts more than three percent of the bar in
   * during one, so the boss died anyway and the fight was as long as the dice
   * said. `strong` raises the floor to sixty percent the moment the turn lands —
   * before it, both are identical, so the fight still reaches its gates the
   * ordinary way. `gentle` is for the one spec that needs the BAR to move, which
   * a high floor would pin.
   */
  hold?: 'gentle' | 'strong'
}

interface Tick {
  /**
   * The SIMULATION clock, not the loop's own tick count.
   *
   * `ttl` is seconds of game time, and game time is not wall time: the guard
   * gate that turns the fight over also arms a 320 ms slow-motion hold
   * (`slowHoldMs`), so the first charge of every fight is wound up inside a
   * stretch of the clock running at 0.45. Measured against tick counts the
   * charge appears to land ~160 ms "late" and the promise looks broken when what
   * it actually did was slow down, exactly as the beat was supposed to.
   */
  ms: number
  fx: FxEvent[]
  /** The crowd immediately before and after this tick's `step`. */
  before: number
  after: number
  slams: number
  slamSpan: number
  /**
   * The clock this KIND actually runs on.
   *
   * `slamSpan` for the three that swing, `summonCd` for the one that does not —
   * a summoner never touches the slam machinery, so reading `slamSpan` on it
   * measures a field nothing writes.
   */
  cycle: number
  enraged: boolean
  hp01: number
}

/** Walk into the arena and fight, keeping every tick rather than flattening
 *  them — every claim in this file is a claim about WHEN. */
const watch = async (o: WatchOptions): Promise<{ game: Game; ticks: Tick[] }> => {
  const game = await importGame()
  game.startStage(o.stage)
  game.debugSkipToArena()
  game.debugAddUnits(o.squad)
  if (o.damage) game.debugAddDamage(o.damage)
  if (o.fireRate) game.debugAddFireRate(o.fireRate)
  for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
  expect(game.phase.value, `stage ${o.stage} never reached the arena`).toBe('boss')
  drainFx()

  const ticks: Tick[] = []
  const max = o.maxTicks ?? 4000
  for (let i = 0; i < max && game.phase.value === 'boss'; i++) {
    const b = game.getBoss()
    if (!b || b.dead) break
    if (o.hold) {
      const floor = o.hold === 'strong' && game.bossIsEnraged() ? 0.6 : 0.03
      b.hp = Math.max(b.hp, b.maxHp * floor)
      if (game.squadCount.value < o.squad / 2) game.debugAddUnits(o.squad / 2)
    }
    game.steerTo(o.steer ? o.steer(game) : game.anchor().x)
    const before = game.squadCount.value
    game.step(STEP_MS)
    ticks.push({
      ms: game.nowMs(),
      fx: drainFx(),
      before,
      after: game.squadCount.value,
      slams: b.slams,
      slamSpan: b.slamSpan,
      cycle: b.kind === 'summoner' ? b.summonCd : b.slamSpan,
      enraged: game.bossIsEnraged(),
      hp01: game.bossHp01.value
    })
  }
  return { game, ticks }
}

const allFx = (ticks: Tick[]): FxEvent[] => ticks.flatMap((t) => t.fx)

// ─── The turn ───────────────────────────────────────────────────────────────

describe('the fight turns over exactly once, on a beat that cannot be skipped', () => {
  it('is fighting the kinds these tests were written about', () => {
    // Asserted out loud and first, the way `bossFight.test.ts` does it. Half of
    // what is below counts `chargeCast` and `bossCharge`; on a kind that does
    // not charge there are none of either, so a rotation change that moved these
    // stages would not fail the assertions, it would empty them.
    expect(bossKindFor(METEOR_STAGE)).toBe('meteor')
    expect(bossKindFor(CLAW_STAGE)).toBe('claw')
    expect(bossCharges('meteor'), 'the charge tests are no longer on a charging kind')
      .toBe(true)
    expect(bossCharges('claw')).toBe(true)
  })

  it('fires once, at the gate it was aimed at, however hard the boss is hit', async () => {
    // Deliberately an overwhelming squad. The whole reason the turn hangs off a
    // guard gate rather than off `hp / maxHp < 0.5` is this player: they put more
    // than a third of the bar into a single frame, so a bare threshold would
    // resolve two phase changes on one tick — or, with the clamp, be crossed
    // inside the frame that was already clamped somewhere else.
    const { ticks } = await watch({
      stage: METEOR_STAGE, squad: 900, damage: 400, fireRate: 6, maxTicks: 9000
    })
    const turns = of(allFx(ticks), 'bossEnrage')
    expect(turns.length, `the fight turned ${turns.length} times`).toBe(1)

    const at = ticks.find((t) => t.fx.some((e) => e.kind === 'bossEnrage'))!
    // The health it turned at is the gate's, not a number of its own — read as
    // an OUTCOME (what the bar actually said) rather than by re-deriving the
    // threshold the code used.
    expect(at.hp01, `the fight turned at ${(at.hp01 * 100).toFixed(0)}% health`)
      .toBeLessThanOrEqual(BOSS_ENRAGE_AT + 1e-6)
    // …and it is a real gate, so the phase's own beat happened too.
    const lastGate = BOSS_GUARD_GATES[BOSS_GUARD_GATES.length - 1]!
    expect(at.hp01).toBeCloseTo(lastGate, 5)
    expect(at.fx.some((e) => e.kind === 'bossRage'), 'the turn landed without its guard phase')
      .toBe(true)
  })

  it('stays turned for the rest of the fight', async () => {
    const { ticks } = await watch({
      stage: METEOR_STAGE, squad: 300, maxTicks: 6000, hold: 'strong'
    })
    const first = ticks.findIndex((t) => t.fx.some((e) => e.kind === 'bossEnrage'))
    expect(first, 'the fight never turned, so there is nothing to hold').toBeGreaterThan(-1)
    // Not "it was still on at the end" — every frame, because the failure this
    // catches is a flicker, and a flicker is invisible at both ends.
    for (let i = first; i < ticks.length; i++) {
      expect(ticks[i]!.enraged, `phase two dropped out at ${ticks[i]!.ms}ms`).toBe(true)
    }
  })

  it('does not re-fire when the boss is healed back over the gate', async () => {
    // The direct, deterministic version of the healing archetype: put the bar
    // ALL the way back and keep fighting. A predicate over live health turns the
    // fight over again here — twice, three times, once per top-up — and the
    // player watches the same "everything changes now" beat fire on a loop.
    const game = await importGame()
    game.startStage(METEOR_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(400)
    game.debugAddDamage(60)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    drainFx()

    let turns = 0
    let healedAfterTurn = false
    for (let i = 0; i < 6000 && game.phase.value === 'boss'; i++) {
      const b = game.getBoss()
      if (!b || b.dead) break
      if (game.bossIsEnraged()) {
        b.hp = b.maxHp
        healedAfterTurn = true
      }
      game.steerTo(game.anchor().x)
      game.step(STEP_MS)
      for (const e of drainFx()) if (e.kind === 'bossEnrage') turns++
    }
    expect(healedAfterTurn, 'the fight never turned, so the heal proves nothing').toBe(true)
    expect(turns, `the turn fired ${turns} times across a fight that was healed to full`)
      .toBe(1)
  })

  it('does not re-fire against the archetype that really does heal', async () => {
    // …and the same property through the real creature rather than through a
    // test poking at `hp`. The healer's every-third puts `HEAL_FRACTION` of the
    // maximum bar back, which is enough to carry it back over the gate it just
    // crossed — the exact condition a health-threshold latch cannot survive.
    const { ticks } = await watch({
      // `gentle`, because this spec's premise is that the BAR MOVES: a strong
      // floor would lift the health back over the gate on the tick after the
      // turn and the "it healed and did not re-fire" assertion would be true of
      // a fight in which the healer never healed.
      stage: HEALER_STAGE, squad: 120, maxTicks: 8000, hold: 'gentle',
      // Out of every drain's column. A crowd that stands in them feeds the
      // healer's bar through the drain (`DRAIN_HEAL_FRACTION`) — which is a
      // heal too, and would satisfy this premise — but it also spends the
      // fight's drain-heal cap and a good part of the scheduled heals before the
      // turn is ever reached, leaving a last third with nothing in it to
      // re-cross the gate. Dodging keeps the heal this spec is about on its own
      // clock.
      steer: (g) => {
        const b = g.getBoss()
        const here = g.anchor().x
        if (!b || g.incomingThreat()?.kind !== 'drain') return here
        if (Math.abs(here - b.slamX) > DRAIN_HALF_W + CROWD_MAX_R + 0.2) return here
        const away = [b.slamX - 3.6, b.slamX + 3.6].filter((x) => Math.abs(x) <= STEER_REACH)
        return away.sort((p, q) => Math.abs(p - here) - Math.abs(q - here))[0] ?? here
      }
    })
    const first = ticks.findIndex((t) => t.fx.some((e) => e.kind === 'bossEnrage'))
    expect(first, 'the healer fight never turned').toBeGreaterThan(-1)
    const turns = of(allFx(ticks), 'bossEnrage').length
    expect(turns, `the healer turned the fight over ${turns} times`).toBe(1)
    // The premise: the bar really did go back up after the turn. Without this
    // the assertion above passes on a fight that never tested anything.
    const after = ticks.slice(first)
    const rose = after.some((t) => t.hp01 > ticks[first]!.hp01 + 1e-9)
    expect(rose, 'the healer never healed after the turn, so the latch is untested').toBe(true)
  })

  it('leaves the tutorial boss alone', async () => {
    // Stage 1's single guard gate sits at exactly a half, so the BOUND matches it
    // and only `BOSS_ENRAGE_FROM_STAGE` keeps the tutorial out. A first-timer
    // meeting a lane charge is not learning what a telegraph means.
    expect(BOSS_ENRAGE_FROM_STAGE, 'the tutorial is inside the enrage range').toBeGreaterThan(1)
    const { ticks } = await watch({ stage: 1, squad: 24, maxTicks: 6000 })
    const fx = allFx(ticks)
    expect(of(fx, 'bossSlam').length + of(fx, 'bossRage').length,
      'the stage 1 boss never did anything, so "it never turned" is vacuous')
      .toBeGreaterThan(0)
    expect(of(fx, 'bossEnrage').length, 'the tutorial boss turned over').toBe(0)
    expect(of(fx, 'chargeCast').length, 'the tutorial boss charged').toBe(0)
  })
})

// ─── The charge, and the beat it promised ───────────────────────────────────

describe('the lane charge lands on the beat its telegraph promised', () => {
  it('announces every charge, once, before it lands', async () => {
    const { ticks } = await watch({
      stage: METEOR_STAGE, squad: 300, maxTicks: 6000, hold: 'strong'
    })
    const casts = ticks.filter((t) => t.fx.some((e) => e.kind === 'chargeCast'))
    const lands = ticks.filter((t) => t.fx.some((e) => e.kind === 'bossCharge'))
    expect(lands.length, 'nothing ever charged, so the ordering is untested')
      .toBeGreaterThan(1)
    // One-to-one, not "there was a cast somewhere earlier": a single tell
    // followed by three silent charges is exactly the bug the casts exist for.
    // The one legal difference is a wind-up still on the road when the fight is
    // cut off — a charge that was announced and never arrived costs the player
    // nothing, and is the right way round for this to be wrong.
    expect(casts.length - lands.length,
      `${casts.length} wind-ups against ${lands.length} charges`)
      .toBeGreaterThanOrEqual(0)
    expect(casts.length - lands.length).toBeLessThanOrEqual(1)
    for (let i = 0; i < lands.length; i++) {
      expect(casts[i]!.ms, `charge ${i + 1} landed before it was announced`)
        .toBeLessThan(lands[i]!.ms)
    }
  })

  it('lands within a frame of the ttl it handed the renderer', async () => {
    // THE measurement. `ttl` is the contract every cast in this game signs — the
    // exact seconds until the damage lands — and the charge is the one attack
    // able to break it by accident, because half of its wind-up is a body
    // travelling and a body integrated from a speed drifts by whatever the frame
    // times did.
    const { ticks } = await watch({
      stage: CLAW_STAGE, squad: 300, maxTicks: 6000, hold: 'strong'
    })
    const casts = ticks
      .map((t) => ({ ms: t.ms, e: of(t.fx, 'chargeCast')[0] }))
      .filter((c) => c.e !== undefined)
    const lands = ticks.filter((t) => t.fx.some((e) => e.kind === 'bossCharge')).map((t) => t.ms)
    expect(lands.length, 'nothing charged, so the beat is untested').toBeGreaterThan(1)

    for (let i = 0; i < lands.length; i++) {
      const promised = casts[i]!.ms + casts[i]!.e!.ttl * 1000
      const slip = Math.abs(lands[i]! - promised)
      // One tick of tolerance and no more. The cooldown is drained in whole
      // frames, so the hit resolves on the first tick that carries it past zero
      // — anything beyond that is the animation and the damage running on two
      // different clocks.
      expect(slip, `charge ${i + 1} promised ${promised}ms and landed at ${lands[i]}ms`)
        .toBeLessThanOrEqual(STEP_MS)
    }
  })

  it('gives the player long enough to be steering rather than to have known', async () => {
    const { ticks } = await watch({
      stage: METEOR_STAGE, squad: 300, maxTicks: 6000, hold: 'strong'
    })
    const casts = of(allFx(ticks), 'chargeCast')
    expect(casts.length, 'nothing charged').toBeGreaterThan(1)
    for (const c of casts) {
      // The floor is the whole fairness of the move — see `CHARGE_TELEGRAPH_MIN`
      // for the reaction-latency arithmetic it was derived from. Asserted on the
      // ttl the RENDERER was handed rather than on the constant, because that is
      // the number the player actually gets.
      expect(c.ttl, `a charge was telegraphed for only ${c.ttl.toFixed(2)}s`)
        .toBeGreaterThanOrEqual(CHARGE_TELEGRAPH_MIN - 1e-6)
    }
  })

  it('paints the band over the ground it actually crosses', async () => {
    const { ticks } = await watch({
      stage: METEOR_STAGE, squad: 300, maxTicks: 6000, hold: 'strong'
    })
    const casts = of(allFx(ticks), 'chargeCast')
    const lands = of(allFx(ticks), 'bossCharge')
    expect(lands.length, 'nothing charged').toBeGreaterThan(1)
    for (let i = 0; i < lands.length; i++) {
      // The band and the kill are one pair of numbers, not two that agree. A
      // telegraph half a unit off the attack is the claw's ring bug again.
      expect(lands[i]!.x, 'the charge came down a different column than the band')
        .toBeCloseTo(casts[i]!.x, 6)
      expect(lands[i]!.halfW, 'the charge was wider than the band said')
        .toBeCloseTo(casts[i]!.halfW, 6)
      expect(casts[i]!.toY, 'the band stopped somewhere the charge did not')
        .toBeCloseTo(lands[i]!.y, 6)
      // …and it goes THROUGH the crowd rather than stopping in front of it.
      expect(casts[i]!.y - casts[i]!.toY,
        'the charge did not travel far enough to cross the formation')
        .toBeGreaterThan(CHARGE_OVERRUN)
    }
  })
})

// ─── …and it has to be survivable ───────────────────────────────────────────

describe('the lane charge is a dodge and not a tax', () => {
  it('leaves the crowd somewhere to stand, at its widest, down the middle', () => {
    // The premise, stated against the CROWD and the ROAD rather than against the
    // charge's own numbers — the same shape as the claw's pocket assertion, and
    // for the same reason: a lane attack the crowd cannot fit beside is a tax
    // with a telegraph in front of it.
    //
    // Checked at the widest the swathe ever gets and at the worst place it can
    // be centred (the middle of the road), because a charge that is dodgeable on
    // the first one and not on the tenth is undodgeable exactly when the player
    // is losing.
    const widest = chargeHalfW(10_000)
    const need = widest + CROWD_MAX_R
    expect(need, `clearing the widest charge asks for ${need.toFixed(2)} of a ${STEER_REACH} reach`)
      .toBeLessThan(STEER_REACH)
  })

  it('costs a crowd that leaves the lane far less than one that stands in it', async () => {
    // THE measurement, and it is deliberately narrow: the cost is read off the
    // squad immediately before and after the single tick each charge resolves
    // on, so nothing else in the fight is billed to it. Two runs, identical in
    // every respect except what they do about the column.
    const clearOf = (lane: number, slams: number): number => {
      const need = chargeHalfW(slams) + CROWD_MAX_R + 0.3
      const left = lane - need
      const right = lane + need
      return Math.abs(left) <= STEER_REACH ? left : right
    }
    const cost = async (dodge: boolean): Promise<{ share: number; charges: number }> => {
      const { ticks } = await watch({
        stage: METEOR_STAGE,
        squad: 400,
        maxTicks: 7000,
        hold: 'strong',
        steer: (game) => {
          const b = game.getBoss()
          if (!b || !game.bossIsCharging()) return 0
          // Standing still is not the control here — standing IN IT is. A crowd
          // that happens to be off the column proves nothing about whether the
          // column was avoidable.
          return dodge ? clearOf(b.slamX, b.slams) : b.slamX
        }
      })
      const hits = ticks.filter((t) => t.fx.some((e) => e.kind === 'bossCharge'))
      const lost = hits.reduce((a, t) => a + (t.before - t.after), 0)
      const had = hits.reduce((a, t) => a + t.before, 0)
      return { share: had > 0 ? lost / had : 0, charges: hits.length }
    }

    const stood = await cost(false)
    const dodged = await cost(true)

    expect(stood.charges, 'nothing charged in the control run').toBeGreaterThan(1)
    expect(dodged.charges, 'nothing charged in the dodging run').toBeGreaterThan(1)
    expect(stood.share, 'standing in the lane cost nothing, so there is no dodge to measure')
      .toBeGreaterThan(0.1)
    // Not "a bit better". The claw's original failure was 37 % against 38 % and
    // it would have passed any loose comparison; the answer to a lane has to be
    // worth nearly all of it.
    expect(dodged.share,
      `leaving the lane cost ${(dodged.share * 100).toFixed(1)}% against ${(stood.share * 100).toFixed(1)}%`)
      .toBeLessThan(stood.share * 0.25)
  })

  it('never bills more of the crowd than it ran over', async () => {
    // ── This used to read "never bills more than the swing it replaced" ──
    //
    // It pinned a charge to a slam's share of the CROWD, and that was the bug
    // rather than the contract: a charge is a column the crowd either is or is
    // not standing in, so a third of everybody meant a crowd could eat one
    // head-on, pay a third, and keep the DPS that dodging costs. Standing in it
    // was the better line, which makes a 1.5 s telegraph decoration.
    //
    // The price is now `CHARGE_KILL_SHARE` of the bodies IN THE LANE — see
    // `tests/game/bossChargeLethality.test.ts`, which measures that directly
    // against the swathe the fx event reports. What is still true here, and is
    // what this spec is for, is the SHAPE: a charge takes the cycle it arrives
    // on rather than adding one, and it cannot bill a body it did not run over.
    // With the crowd parked in the column its share of the crowd is therefore
    // bounded by its share of the lane, and that is the ceiling below.
    const { ticks } = await watch({
      stage: METEOR_STAGE,
      squad: 400,
      maxTicks: 7000,
      hold: 'strong',
      steer: (game) => game.getBoss()?.slamX ?? 0
    })
    const hits = ticks.filter((t) => t.fx.some((e) => e.kind === 'bossCharge'))
    expect(hits.length, 'nothing charged').toBeGreaterThan(1)
    for (const t of hits) {
      const share = (t.before - t.after) / Math.max(1, t.before)
      expect(share, `one charge took ${(share * 100).toFixed(0)}% of the crowd`)
        .toBeLessThanOrEqual(CHARGE_KILL_SHARE + 0.02)
    }
  })
})

// ─── The tempo ──────────────────────────────────────────────────────────────

describe('phase two tightens the cadence without leaving the envelope', () => {
  it('runs the rage curve unchanged until the fight turns, and inside it after', async () => {
    // Read off the boss's own cycle at the moment each swing resolves, rather
    // than off the gaps between events. The gaps are confounded: `SLAM_CD_DECAY`
    // already shortens them over a fight, so "attacks came faster after the
    // turn" is true of a build with no phase two in it at all.
    const { ticks } = await watch({
      stage: METEOR_STAGE, squad: 300, maxTicks: 7000, hold: 'strong'
    })
    const swings = ticks.filter((t) =>
      t.fx.some((e) => e.kind === 'bossSlam' || e.kind === 'bossCharge'))
    const before = swings.filter((t) => !t.enraged)
    const after = swings.filter((t) => t.enraged)
    expect(before.length, 'no swings before the turn').toBeGreaterThan(0)
    expect(after.length, 'no swings after the turn').toBeGreaterThan(1)

    const curve = (slams: number): number =>
      Math.max(SLAM_CD_MIN, SLAM_CD_BASE - slams * SLAM_CD_DECAY)

    for (const t of before) {
      expect(t.slamSpan, `an un-enraged cycle at swing ${t.slams} was not the rage curve`)
        .toBeCloseTo(curve(t.slams), 6)
    }
    let tightened = 0
    for (const t of after) {
      const raw = curve(t.slams)
      // Never under the floor. `SLAM_CD_MIN` is where the cooldown becomes
      // shorter than the wind-up, and `SLAM_TELEGRAPH`'s measurement says what
      // is on the other side of it: a median human clearing nothing.
      expect(t.slamSpan, `an enraged cycle at swing ${t.slams} broke the floor`)
        .toBeGreaterThanOrEqual(SLAM_CD_MIN - 1e-9)
      expect(t.slamSpan).toBeCloseTo(
        enragedSpan(raw, endlessPressure(METEOR_STAGE), SLAM_CD_MIN), 6
      )
      if (raw > SLAM_CD_MIN + 1e-6) tightened++
    }
    expect(tightened, 'every enraged swing was already at the floor, so nothing sped up')
      .toBeGreaterThan(0)
  })

  it('adds about the same pressure at stage 4 as it does at stage 120', () => {
    // The budget answer, as arithmetic. What one swing costs is already
    // `SLAM_MAX_FRACTION * endlessPressure(stage)`, and the rate a boss takes the
    // crowd at is that over the cadence — so a FLAT cadence multiplier multiplies
    // a number that has already been multiplied, and the same "phase two" is
    // twice the escalation at depth. That is the failure mode this test exists to
    // catch, so the flat version is measured beside the shipped one.
    const span = SLAM_CD_BASE
    const added = (stage: number, enraged: number): number => {
      const share = SLAM_MAX_FRACTION * endlessPressure(stage)
      return share / enraged - share / span
    }
    const shallow = 4
    const deep = 120
    expect(endlessPressure(deep), 'the ladder no longer presses harder at depth')
      .toBeGreaterThan(endlessPressure(shallow) * 1.5)

    const ours = [shallow, deep].map((s) =>
      added(s, enragedSpan(span, endlessPressure(s), SLAM_CD_MIN)))
    const flat = [shallow, deep].map((s) => added(s, span * ENRAGED_CD_MUL))

    // Ours: the extra crowd-loss per second phase two is worth barely moves
    // across the whole ladder.
    expect(ours[1]! / ours[0]!, `phase two adds ${ours[0]!.toFixed(3)} at stage ${shallow} and ${ours[1]!.toFixed(3)} at stage ${deep}`)
      .toBeLessThan(1.15)
    // Flat: it more than doubles — which is the bug written down, so the
    // assertion above cannot pass for a build that quietly went back to it.
    expect(flat[1]! / flat[0]!).toBeGreaterThan(1.9)
  })

  it('never returns a cycle under the floor it was handed', () => {
    // The property, swept rather than sampled: `enragedSpan` is the one function
    // every kind's clock now goes through, and the floor is what keeps each of
    // them readable.
    for (let span = 0.2; span <= 3; span += 0.1) {
      for (let pressure = 1; pressure <= 2.4; pressure += 0.2) {
        const out = enragedSpan(span, pressure, SLAM_CD_MIN)
        expect(out).toBeGreaterThanOrEqual(SLAM_CD_MIN - 1e-9)
        expect(out, `span ${span.toFixed(1)} at pressure ${pressure.toFixed(1)} got longer`)
          .toBeLessThanOrEqual(Math.max(span, SLAM_CD_MIN) + 1e-9)
      }
    }
  })
})

// ─── …and it belongs to the kinds that needed it ────────────────────────────

describe('the charge goes to the fights that had one idea', () => {
  it('is not given to the two kinds that already had a second one', async () => {
    expect(bossCharges('healer')).toBe(false)
    expect(bossCharges('summoner')).toBe(false)

    for (const stage of [HEALER_STAGE, SUMMONER_STAGE]) {
      // A damage bonus, because these two are the slowest fights in the pool by
      // construction — one puts its own bar back up and the other spends the
      // crowd's fire on a wall of bodies. Without it the run occasionally spent
      // its whole tick budget short of the last gate and failed on the PREMISE
      // ("it never turned over") rather than on the property, which is the flake
      // that teaches people to re-run a suite instead of reading it.
      const { ticks } = await watch({
        stage, squad: 200, damage: 40, maxTicks: 9000, hold: 'strong'
      })
      const fx = allFx(ticks)
      // The premise: these fights DID turn over, so "no charge" is a decision
      // rather than a fight that ended before phase two.
      expect(of(fx, 'bossEnrage').length, `stage ${stage} never turned over`).toBe(1)
      expect(of(fx, 'chargeCast').length, `stage ${stage} charged`).toBe(0)
      expect(of(fx, 'bossCharge').length, `stage ${stage} charged`).toBe(0)
    }
  })

  it('does not touch the cadence of either of them, before or after the turn', async () => {
    // ── The regression this file exists for most ──
    //
    // Phase two DID tighten these two clocks for one revision, and both came
    // apart in ways no assertion here was watching. The healer's `BOLT_SHARE_MUL`
    // is a per-second price with `HEALER_CAST_CD` substituted into it, so a 30 %
    // shorter loop re-priced the bolt by 43 % and the spec that pins the bolt as
    // answerable started failing about half the time — not because the dodge got
    // worse, but because BOTH answers began losing the whole crowd and the dodge
    // fell under the seed. The summoner's wall cost a marginal build another 27
    // points of crowd across a fight twice as long.
    //
    // So the cadence is pinned directly, at the source, on both sides of the
    // turn. Measured off `slamSpan` / `summonCd` rather than off event gaps: the
    // gaps are what a re-tightening would move, and a spec that watches outcomes
    // is exactly the spec that was already watching when this happened.
    for (const stage of [HEALER_STAGE, SUMMONER_STAGE]) {
      const { ticks } = await watch({
        stage, squad: 200, damage: 40, maxTicks: 9000, hold: 'strong'
      })
      const after = ticks.filter((t) => t.enraged)
      expect(after.length, `stage ${stage} never turned over`).toBeGreaterThan(0)

      // The two kinds hold their cycle differently, so they are read
      // differently. `slamSpan` IS the healer's cast length and is held between
      // casts, so every enraged tick reports it. `summonCd` is a countdown, so
      // only a tick where it JUMPED UP says what it was armed to; the draining
      // ticks in between say nothing.
      const armed = (list: Tick[]): number[] => stage === SUMMONER_STAGE
        ? list.filter((t, i) => i > 0 && t.cycle > list[i - 1]!.cycle + 1e-9).map((t) => t.cycle)
        : list.map((t) => t.cycle)
      const spans = armed(after)
      expect(spans.length, `stage ${stage} armed no cycle after the turn`).toBeGreaterThan(0)

      // Every value the clock takes after the turn is one it could have taken
      // before it. A membership test rather than equality with the flat
      // constant, because the guard gate legitimately re-arms a shorter fuse of
      // its own on both kinds (`bossTelegraph`, `SUMMON_TELEGRAPH`) — that is
      // the phase turn's own beat and predates phase two.
      //
      // The healer's list carries one more fuse than it used to: a drain armed
      // when a gate turns gets the column's own floor (`DRAIN_TELEGRAPH_MIN`),
      // which is the drain's rule on every gate rather than phase two's. The
      // summoner's cadence is no longer one constant — it is priced per fight
      // (`summonCdFor`) — so its legal values are the ones THIS fight armed
      // before the turn, plus the gate's own fuse and the gaze's.
      const before = armed(ticks.filter((t) => !t.enraged))
      const legal = stage === HEALER_STAGE
        ? [HEALER_CAST_CD, HEALER_TELEGRAPH, DRAIN_TELEGRAPH_MIN]
        : [...before, SUMMON_TELEGRAPH, GAZE_OPEN]
      for (const c of new Set(spans.map((v) => Number(v.toFixed(4))))) {
        expect(legal.some((v) => Math.abs(v - c) < 1e-3),
          `stage ${stage} armed an enraged cycle of ${c}s, which is none of ${legal.join(' / ')}`)
          .toBe(true)
      }
    }
  })

  it('shares an enraged meteor fight with the charged swing rather than starving it',
    async () => {
      // `CHARGE_EVERY` and `CHARGED_EVERY` are both "every third" and are offset
      // on purpose: run in phase they would want the same cycle every time and
      // the charged swing, committed a cycle earlier, would always win — leaving
      // an enraged meteor that never charges at all. Measured as the outcome,
      // because the offset is an off-by-one and off-by-ones are exactly what a
      // re-derivation of the same expression would reproduce.
      const { ticks } = await watch({
        stage: METEOR_STAGE, squad: 300, maxTicks: 8000, hold: 'strong'
      })
      const first = ticks.findIndex((t) => t.fx.some((e) => e.kind === 'bossEnrage'))
      expect(first, 'the fight never turned').toBeGreaterThan(-1)
      const after = allFx(ticks.slice(first))
      const charges = of(after, 'bossCharge').length
      const chargedSwings = of(after, 'bossSlam').filter((e) => e.charged).length
      expect(charges, 'the enraged meteor never charged').toBeGreaterThan(1)
      expect(chargedSwings, 'the charge ate every charged swing in the last third')
        .toBeGreaterThan(0)
    })

  it('turns the gate that owes a swing into the first charge', async () => {
    // The turn and the new move are one beat, deliberately: the frame the boss
    // plants, roars and goes untouchable is already the one the player is
    // watching, so it is where phase two introduces itself. A charge arriving a
    // cycle later is one more attack in a fight already full of them.
    const { ticks } = await watch({
      stage: CLAW_STAGE, squad: 300, maxTicks: 6000, hold: 'strong'
    })
    const turn = ticks.find((t) => t.fx.some((e) => e.kind === 'bossEnrage'))
    expect(turn, 'the claw fight never turned').toBeDefined()
    expect(turn!.fx.some((e) => e.kind === 'chargeCast'),
      'the turn announced a rake rather than the move it was introducing')
      .toBe(true)
    expect(turn!.fx.some((e) => e.kind === 'rakeCast'),
      'the guard gate announced a rake as well as a charge')
      .toBe(false)
  })
})
