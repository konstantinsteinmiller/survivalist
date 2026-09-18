/**
 * ─── The healer feeds ───────────────────────────────────────────────────────
 *
 * The owner, after playing it: "the Healer's projectile is a joke — it does not
 * do much damage and is super easy to dodge. The Healer needs ANOTHER
 * high-impact attack that makes him a threat and not just a shooting target."
 *
 * The drain is that attack (`DRAIN_SHARE_MUL` and the block above it in
 * `threats.ts`): a column locked on the crowd's own line at the start of the
 * cast, a beam that lands on the beat and HOLDS, pulling whoever is still in the
 * column out of the crowd and putting what they were worth back on the boss's
 * bar. Everything below runs the real `step()` loop, and it pins the contract
 * every attack in this game signs:
 *
 *   ANNOUNCED  at the START of its wind-up, carrying the exact seconds to impact;
 *   ON THE BEAT the first body goes on the frame the cast said, not before;
 *   ANSWERABLE a crowd that leaves the column pays nothing and feeds nothing;
 *   PRICED     a crowd that stays pays a real share AND heals the boss;
 *   ABSORBED   whole, by the bulwark, before a body is billed;
 *   WITH THE BOSS it lets go on the kill, and holds under a Frost Nova;
 *   TRUTHFUL   the corner badge says DODGE, because leaving is the answer.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { CROWD_MAX_R } from '@/game/survival'
import {
  DRAIN_FIRST_BITE, DRAIN_HALF_W, DRAIN_HEAL_FRACTION, DRAIN_HEAL_MAX, DRAIN_HOLD_S,
  DRAIN_SHARE_MUL, DRAIN_TELEGRAPH_MIN, THREAT_POOL_FROM_STAGE, bossKindFor, bossVerbPool
} from '@/game/threats'
import { drainFx, type FxEvent } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16
/** Guard gates spent — see `SPENT` in `bossKinds.test.ts`. */
const SPENT = 99

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

const HEALER_STAGE = ((): number => {
  for (let s = THREAT_POOL_FROM_STAGE; s < THREAT_POOL_FROM_STAGE + 40; s++) {
    if (bossKindFor(s) === 'healer') return s
  }
  throw new Error('no stage fields a healer')
})()

const of = <K extends FxEvent['kind']>(fx: readonly FxEvent[], kind: K) =>
  fx.filter((e) => e.kind === kind) as Array<Extract<FxEvent, { kind: K }>>

/** Walk into the healer's arena with `squad` survivors. */
const arena = async (squad: number): Promise<Game> => {
  const game = await importGame()
  game.startStage(HEALER_STAGE)
  game.steerOnly.value = false
  game.debugSkipToArena()
  game.debugAddUnits(squad)
  for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
  expect(game.phase.value, 'never reached the arena').toBe('boss')
  drainFx()
  return game
}

/** Hold the fight open: no gates, a bar that never empties, a crowd kept whole. */
const holdOpen = (game: Game, squad: number, hp01 = 1): void => {
  const b = game.getBoss()
  if (!b) return
  b.hp = Math.max(b.hp, b.maxHp * hp01)
  b.guarded = SPENT
  b.guard = 0
  if (game.squadCount.value < squad * 0.6) game.debugAddUnits(squad - game.squadCount.value)
}

/** Out of the column, if one is on the road — the answer the tell teaches. */
const leaveColumn = (game: Game): number => {
  const b = game.getBoss()
  const here = game.anchor().x
  if (!b || game.incomingThreat()?.kind !== 'drain') return here
  const need = DRAIN_HALF_W + CROWD_MAX_R + 0.3
  if (Math.abs(here - b.slamX) >= need) return here
  const opts = [b.slamX - need, b.slamX + need].filter((x) => Math.abs(x) <= 4.1)
  return opts.sort((p, q) => Math.abs(p - here) - Math.abs(q - here))[0] ?? here
}

describe('the drain is the healer\'s from its first fight', () => {
  it('is in the healer\'s bag on every stage it appears on, and nobody else\'s', () => {
    for (let s = THREAT_POOL_FROM_STAGE; s < THREAT_POOL_FROM_STAGE + 40; s++) {
      const kind = bossKindFor(s)
      expect(bossVerbPool(kind, s, false).includes('drain'), `stage ${s} (${kind})`)
        .toBe(kind === 'healer')
    }
  })
})

describe('the drain keeps the telegraph contract', () => {
  it('announces its column the instant its cycle opens, and lands on that beat', async () => {
    const game = await arena(200)
    let castAt = -1
    let ttl = 0
    let landAt = -1
    let billedEarly = 0
    let tookOnBeat = 0
    for (let i = 0; i < 4000 && landAt < 0 && game.phase.value === 'boss'; i++) {
      holdOpen(game, 200)
      game.steerTo(game.anchor().x)
      const slamBefore = game.deathBreakdown().slam
      game.step(STEP_MS)
      const fx = drainFx()
      const cast = of(fx, 'drainCast')[0]
      if (cast && castAt < 0) { castAt = game.nowMs(); ttl = cast.ttl }
      const took = game.deathBreakdown().slam - slamBefore
      // A bolt thrown on the cast BEFORE this one is still in the air for most
      // of a second, and it lands where it lands — inside this wind-up, often.
      // That is the other attack keeping its own promise, and it is billed on a
      // frame that carries its own `bossBoltHit`; everything else is the drain's.
      const boltHit = of(fx, 'bossBoltHit').length > 0
      if (castAt >= 0 && of(fx, 'bossDrain').length > 0) { landAt = game.nowMs(); tookOnBeat = took }
      else if (castAt >= 0 && landAt < 0 && !boltHit) billedEarly += took
    }
    expect(castAt, 'the healer never wound up a drain').toBeGreaterThanOrEqual(0)
    expect(landAt, 'the drain was announced and never landed').toBeGreaterThanOrEqual(0)
    // The whole cast is the warning — never less than the gate's floor.
    expect(ttl, `a drain was announced with ${ttl.toFixed(2)} s of warning`)
      .toBeGreaterThanOrEqual(DRAIN_TELEGRAPH_MIN - 1e-6)
    // …and it arrives when it said it would: within a frame of the promise.
    const late = (landAt - castAt) / 1000 - ttl
    expect(Math.abs(late), `the beam landed ${late.toFixed(3)} s off its beat`)
      .toBeLessThanOrEqual((STEP_MS * 1.5) / 1000)
    // Nothing the drain does is billed before the beat.
    expect(billedEarly, 'survivors were taken during the drain\'s own wind-up').toBe(0)
    // …and the crowd that stood in the column started going ON it.
    expect(tookOnBeat, 'the beam landed and took nobody from a crowd standing in it')
      .toBeGreaterThan(0)
  })
})

describe('the drain is a threat, and an answerable one', () => {
  it('takes a big bite out of a crowd that stays, and heals the boss by what it took', async () => {
    const game = await arena(200)
    const ends: Array<Extract<FxEvent, { kind: 'drainEnd' }>> = []
    let squadAtLand = 0
    for (let i = 0; i < 5000 && ends.length === 0 && game.phase.value === 'boss'; i++) {
      // Half a bar, so a heal has room to show.
      holdOpen(game, 200, 0.5)
      const b = game.getBoss()!
      if (b.hp > b.maxHp * 0.5 && game.getBossDrain() === null) b.hp = b.maxHp * 0.5
      game.steerTo(game.anchor().x)
      const squad = game.squadCount.value
      game.step(STEP_MS)
      const fx = drainFx()
      if (of(fx, 'bossDrain').length > 0) squadAtLand = squad
      ends.push(...of(fx, 'drainEnd'))
    }
    expect(ends.length, 'no drain ever finished on a crowd that stood still').toBeGreaterThan(0)
    const end = ends[0]!
    // A real share of the crowd — more than any single ring takes on this road
    // (a slam's share is 0.31; the drain is `DRAIN_SHARE_MUL` of it).
    expect(end.taken / Math.max(1, squadAtLand),
      `a drain eaten whole took ${end.taken} of ${squadAtLand}`)
      .toBeGreaterThan(0.31 * DRAIN_SHARE_MUL * 0.85)
    // …and the bar went up by what it took: one heal's worth, eaten whole.
    expect(end.healed, 'the boss fed and did not heal').toBeGreaterThan(DRAIN_HEAL_FRACTION * 0.9)
    expect(end.healed).toBeLessThanOrEqual(DRAIN_HEAL_FRACTION + 1e-9)
  })

  it('costs a crowd that leaves the column nothing, and feeds the boss nothing', async () => {
    const game = await arena(200)
    const ends: Array<Extract<FxEvent, { kind: 'drainEnd' }>> = []
    for (let i = 0; i < 7000 && ends.length < 3 && game.phase.value === 'boss'; i++) {
      holdOpen(game, 200, 0.5)
      game.steerTo(leaveColumn(game))
      game.step(STEP_MS)
      ends.push(...of(drainFx(), 'drainEnd'))
    }
    expect(ends.length, 'the healer threw fewer than three drains in a long fight').toBeGreaterThanOrEqual(3)
    for (const e of ends) {
      expect(e.taken, 'a drain found a crowd that had left its column').toBe(0)
      expect(e.healed).toBe(0)
    }
  })

  it('lets a crowd caught on the beat keep the second half by leaving then', async () => {
    // The hold is the second chance: half the budget lands on the flash
    // (`DRAIN_FIRST_BITE`), the rest over the hold — so reacting to the beam is
    // worth something even when reading the column was missed.
    const run = async (leaveOnFlash: boolean): Promise<number> => {
      const game = await arena(200)
      let leaving = false
      for (let i = 0; i < 5000 && game.phase.value === 'boss'; i++) {
        holdOpen(game, 200, 0.5)
        if (leaving) game.steerTo(leaveColumn(game))
        else game.steerTo(game.anchor().x)
        game.step(STEP_MS)
        const fx = drainFx()
        if (of(fx, 'bossDrain').length > 0 && leaveOnFlash) leaving = true
        const end = of(fx, 'drainEnd')[0]
        if (end) return end.taken
      }
      return -1
    }
    const stayed = await run(false)
    const left = await run(true)
    expect(stayed, 'no drain finished').toBeGreaterThan(0)
    expect(left, 'leaving on the flash saved nobody').toBeLessThan(stayed)
    expect(left, 'leaving on the flash dodged the first bite as well — it should land on the beat')
      .toBeGreaterThan(0)
    expect(left / stayed).toBeGreaterThan(DRAIN_FIRST_BITE * 0.7)
  })

  it('heals the boss by at most its cap across a whole fight', async () => {
    const game = await arena(300)
    let healed = 0
    for (let i = 0; i < 9000 && game.phase.value === 'boss'; i++) {
      holdOpen(game, 300, 0.3)
      game.steerTo(game.anchor().x)
      game.step(STEP_MS)
      for (const e of of(drainFx(), 'drainEnd')) healed += e.healed
    }
    expect(healed, 'a stationary crowd never fed the boss at all').toBeGreaterThan(0)
    expect(healed, `the drains put ${(healed * 100).toFixed(0)}% back`)
      .toBeLessThanOrEqual(DRAIN_HEAL_MAX + 1e-9)
  })
})

describe('the drain answers to everything else in the fight', () => {
  it('is stopped whole by the bulwark, before a single body is billed', async () => {
    const game = await arena(200)
    let armed = false
    let end: Extract<FxEvent, { kind: 'drainEnd' }> | undefined
    for (let i = 0; i < 5000 && !end && game.phase.value === 'boss'; i++) {
      holdOpen(game, 200, 0.5)
      game.steerTo(game.anchor().x)
      // Armed in the last frames of the column's wind-up, so the NEXT big blow
      // is this one — armed any earlier, a bolt still in the air from the cast
      // before lands first and spends the dome on itself.
      const t = game.incomingThreat()
      if (!armed && t?.kind === 'drain' && t.ttl > 0 && t.ttl <= 0.05 && game.getBossBolts().length === 0) {
        game.debugArmBulwark()
        armed = true
      }
      game.step(STEP_MS)
      end = of(drainFx(), 'drainEnd')[0]
    }
    expect(armed, 'no drain was ever wound up').toBe(true)
    expect(end, 'the drain never finished').toBeDefined()
    expect(end!.taken, 'the dome let the beam take survivors').toBe(0)
    expect(end!.healed, 'the boss fed through the dome').toBe(0)
    expect(game.bulwarkReady(), 'the bulwark was not spent on the blow it stopped').toBe(false)
  })

  it('lets go the frame the boss dies, and pulls nobody after', async () => {
    const game = await arena(200)
    let killedAt = -1
    let tookAfter = 0
    const fx: FxEvent[] = []
    for (let i = 0; i < 5000 && game.phase.value === 'boss'; i++) {
      const b = game.getBoss()!
      if (killedAt < 0) holdOpen(game, 200, 0.5)
      game.steerTo(game.anchor().x)
      // The instant a beam is holding, put the boss one bullet from death.
      if (killedAt < 0 && game.getBossDrain() !== null) { b.hp = 1; b.guarded = SPENT }
      const before = game.deathBreakdown().slam
      game.step(STEP_MS)
      fx.push(...drainFx())
      if (killedAt < 0 && b.dead) killedAt = i
      else if (killedAt >= 0) tookAfter += game.deathBreakdown().slam - before
    }
    expect(killedAt, 'the boss never died under its own beam').toBeGreaterThanOrEqual(0)
    expect(game.getBossDrain(), 'the beam outlived the boss').toBeNull()
    expect(of(fx, 'drainEnd').length, 'the beam ended without saying so').toBeGreaterThan(0)
    expect(tookAfter, 'a dead boss went on pulling').toBe(0)
    expect(game.incomingThreat(), 'the corner badge stayed up over a corpse').toBeNull()
  })

  it('holds, taking nobody, while a Frost Nova holds the fight', async () => {
    const game = await arena(200)
    for (let i = 0; i < 5000 && game.getBossDrain() === null && game.phase.value === 'boss'; i++) {
      holdOpen(game, 200, 0.5)
      game.steerTo(game.anchor().x)
      game.step(STEP_MS)
    }
    const beam = game.getBossDrain()
    expect(beam, 'no beam ever landed').not.toBeNull()
    expect(game.castFrostNova(), 'the nova would not cast in a boss fight').toBe(true)
    const t0 = beam!.t
    const slam0 = game.deathBreakdown().slam
    for (let i = 0; i < 40; i++) {
      holdOpen(game, 200, 0.5)
      game.steerTo(game.anchor().x)
      game.step(STEP_MS)
    }
    expect(game.getBossDrain(), 'the freeze let the beam go').not.toBeNull()
    expect(game.getBossDrain()!.t, 'the beam\'s clock ran under the ice').toBeCloseTo(t0, 9)
    expect(game.deathBreakdown().slam - slam0, 'a frozen beam took survivors').toBe(0)
  })

  it('reaches down a burning flare\'s line instead of the crowd\'s', async () => {
    const game = await arena(200)
    // Lit and burning before the next drain is aimed.
    game.steerTo(2)
    for (let i = 0; i < 60; i++) { holdOpen(game, 200, 0.5); game.step(STEP_MS) }
    let cast: Extract<FxEvent, { kind: 'drainCast' }> | undefined
    for (let i = 0; i < 6000 && !cast && game.phase.value === 'boss'; i++) {
      holdOpen(game, 200, 0.5)
      game.steerTo(2)
      if (game.getDecoy() === null) game.throwDecoy()
      game.step(STEP_MS)
      const c = of(drainFx(), 'drainCast')[0]
      if (c && game.decoyLive()) cast = c
    }
    expect(cast, 'no drain was aimed while a flare burned').toBeDefined()
    const d = game.getDecoy()!
    expect(Math.abs(cast!.x - d.x), 'the column ignored the flare').toBeLessThan(1.01)
    expect(Math.abs(cast!.x - game.anchor().x), 'the lured column still came down the crowd\'s line')
      .toBeGreaterThan(DRAIN_HALF_W)
  })

  it('raises the corner badge with the word DODGE, through the wind-up and the hold', async () => {
    const game = await arena(200)
    let sawWindUp = false
    let sawHold = false
    for (let i = 0; i < 5000 && !(sawWindUp && sawHold) && game.phase.value === 'boss'; i++) {
      holdOpen(game, 200, 0.5)
      game.steerTo(game.anchor().x)
      game.step(STEP_MS)
      drainFx()
      const t = game.incomingThreat()
      if (t?.kind !== 'drain') continue
      expect(game.attackIncoming(), 'the badge was down over a drain').toBe(true)
      expect(game.incomingWord(), 'a column to leave was not called a dodge').toBe('away')
      expect(t.dodgeable).toBe(true)
      if (game.getBossDrain() !== null) sawHold = true
      else sawWindUp = true
    }
    expect(sawWindUp, 'the badge never saw a drain winding up').toBe(true)
    expect(sawHold, 'the badge never saw a beam holding').toBe(true)
  })

  it('never lets its hold overlap another column or a bolt\'s wind-up', async () => {
    // The next cast starts only when the beam lets go (`throwHealerCast`), so
    // nothing is ever aimed under a holding beam.
    const game = await arena(200)
    let beams = 0
    for (let i = 0; i < 7000 && game.phase.value === 'boss'; i++) {
      holdOpen(game, 200, 0.5)
      game.steerTo(leaveColumn(game))
      const holding = game.getBossDrain() !== null
      game.step(STEP_MS)
      const fx = drainFx()
      if (holding && game.getBossDrain() !== null) {
        expect(of(fx, 'drainCast').length + of(fx, 'bossBoltCast').length + of(fx, 'healCast').length,
          'something was wound up under a holding beam').toBe(0)
      }
      beams += of(fx, 'bossDrain').length
    }
    expect(beams, 'too few beams to say anything').toBeGreaterThan(2)
    // …and the hold is the length it says.
    expect(DRAIN_HOLD_S).toBeGreaterThan(0.5)
  })
})
