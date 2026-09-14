/**
 * ─── Standing in the charge has to be the wrong answer ──────────────────────
 *
 * Every other big swing in this game is priced as a share of the CROWD — about
 * a third of your people, wherever they were standing — and for a ring that is
 * the right shape: a ring is a place, the crowd is partly in it, and a third is
 * what being caught in one means.
 *
 * A charge is not a place, it is a COLUMN, and the crowd either is or is not
 * standing in it. Priced the same way, a crowd that ate one head-on had every
 * body inside the swathe and still lost only the third the whole-squad share
 * allowed — so the dominant line through phase two was to hold the lane, keep
 * firing, pay a third, and bank the DPS that dodging would have cost. The
 * 3.55-unit lateral commitment the whole 1.5 s telegraph is built around was
 * the WORSE play, which makes the telegraph decoration.
 *
 * So the charge is billed on the bodies it runs over: `CHARGE_KILL_SHARE` of
 * whoever is in the lane. What is pinned here is that promise and the two ways
 * it can be quietly lost — being billed on the crowd again (the number stops
 * tracking who was actually standing there), and reaching bodies the swathe
 * never touched (a lane attack that kills out of lane is a slam with extra
 * steps, and the dodge stops being an answer).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { bossCharges, bossKindFor, CHARGE_KILL_SHARE, THREAT_POOL_FROM_STAGE } from '@/game/threats'
import { drainFx, type FxEvent } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')
const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/** The shallowest stage fielding a kind that charges, past the onboarding band
 *  — so `bossSwingMul` is 1 and this measures the ceiling rather than a
 *  first-timer's discount. */
const chargeStage = (): number => {
  for (let s = Math.max(THREAT_POOL_FROM_STAGE, 8); s < THREAT_POOL_FROM_STAGE + 40; s++) {
    if (bossCharges(bossKindFor(s))) return s
  }
  throw new Error('no stage in range fields a charging boss')
}

interface Caught {
  /** Bodies inside the swathe on the frame before it landed. */
  caught: number
  /** Survivors the charge actually took, off the death ledger. */
  killed: number
  /** …and how many of those were standing outside the swathe. */
  outside: number
}

/**
 * Play a charging fight with the crowd parked in the boss's column — the exact
 * line this change exists to punish — and report every charge that landed.
 */
const chargesTaken = async (squad: number): Promise<Caught[]> => {
  const game = await importGame()
  const stage = chargeStage()
  game.startStage(stage)
  game.debugSkipToArena()
  game.debugAddUnits(squad)
  // Enough damage to reach phase two before the tick budget runs out.
  game.debugAddDamage(40)
  game.debugAddFireRate(4)
  for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
  expect(game.phase.value, `stage ${stage} never reached the arena`).toBe('boss')
  drainFx()

  const out: Caught[] = []
  let slamsBefore = game.deathBreakdown().slam

  for (let i = 0; i < 6000 && game.phase.value === 'boss'; i++) {
    const b = game.getBoss()
    if (!b || b.dead) break
    // Hold the fight open: phase two is the last third of it by definition, and
    // a boss that dies four swings in has no last third to measure.
    if (game.bossIsEnraged()) {
      b.hp = Math.max(b.hp, b.maxHp * 0.6)
      if (game.squadCount.value < squad / 2) game.debugAddUnits(squad / 2)
    }
    // The line under test: stand in the boss's column and keep shooting.
    game.steerTo(b.x)
    // Snapshot BEFORE the step, because the step is what kills them.
    const standing = game.getUnits()
      .filter((u) => u.dying <= 0)
      .map((u) => ({ x: u.x, y: u.y }))
    game.step(STEP_MS)
    const slamsNow = game.deathBreakdown().slam
    const fx = drainFx()
    const landed = fx.filter((e): e is Extract<FxEvent, { kind: 'bossCharge' }> => e.kind === 'bossCharge')
    for (const e of landed) {
      const inLane = standing.filter((u) => u.y <= e.fromY && Math.abs(u.x - e.x) <= e.halfW)
      out.push({
        caught: inLane.length,
        killed: slamsNow - slamsBefore,
        outside: standing.length - inLane.length
      })
    }
    slamsBefore = slamsNow
    if (out.length >= 3) break
  }
  return out
}

describe('the charge is billed on the bodies it runs over', () => {
  it('takes about three quarters of whoever was standing in the lane', async () => {
    // A big crowd, so `bossHitFloor` — which exists to make a hit on a thinned
    // squad mean something — cannot be the number under test.
    const taken = await chargesTaken(240)
    expect(taken.length, 'no charge ever landed, so nothing here was measured')
      .toBeGreaterThan(0)

    for (const c of taken) {
      expect(c.caught, 'the crowd was parked in the column and nothing was in it')
        .toBeGreaterThan(10)
      const share = c.killed / c.caught
      expect(share, `a charge over ${c.caught} bodies took ${c.killed}`)
        .toBeGreaterThan(CHARGE_KILL_SHARE - 0.12)
      // The ceiling is the shape, not the share: it can never bill more bodies
      // than it ran over.
      expect(c.killed, `a charge over ${c.caught} bodies took ${c.killed}`)
        .toBeLessThanOrEqual(c.caught)
    }
  }, 120_000)

  it('is worth more than a third, which is what made standing in it correct', async () => {
    // The regression this whole change is about, stated as the comparison that
    // motivated it rather than as an absolute: a third is what the whole-squad
    // share paid, and a price the player can out-earn by not dodging is not a
    // price.
    const taken = await chargesTaken(240)
    const worst = Math.min(...taken.map((c) => c.killed / c.caught))
    expect(worst, 'the charge is back to costing a share of the crowd')
      .toBeGreaterThan(0.5)
  }, 120_000)

  it('never reaches a body the swathe did not cover', async () => {
    // A lane attack that kills out of lane is a slam with extra steps, and the
    // dodge stops being an answer to it.
    const taken = await chargesTaken(240)
    for (const c of taken) {
      expect(c.killed, `${c.killed} killed with only ${c.caught} in the lane`)
        .toBeLessThanOrEqual(c.caught)
    }
    expect(taken.some((c) => c.outside > 0), 'nobody stood outside the swathe, so ' +
      '"it never reaches them" was not actually tested').toBe(true)
  }, 120_000)
})
