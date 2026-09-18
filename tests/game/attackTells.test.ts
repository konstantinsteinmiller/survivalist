// ─── The player has to be able to see it coming ─────────────────────────────
//
// Reported from testing: players do not see the mini-boss's or the boss's attack
// indicator. The reason is where their eyes are — on the boss, or on their own
// thumb — and the one place the game was painting the answer was the patch of
// road they were about to be standing on.
//
// Two things answer it, and they answer different halves. The CASTS say where
// the damage is coming from: a rock falls out of the sky onto the boss's mark, a
// blade winds up across the ground the elite is about to cut. The corner
// WARNING says whether anything is coming at all, from a fixed place that can be
// checked with peripheral vision — which is all a player steering with a thumb
// has spare.
//
// Both depend on timing: a tell that fires with the damage is not a tell, it is
// an explanation afterwards.

import { describe, expect, it } from 'vitest'
import { ELITE_TELEGRAPH } from '@/game/survival'
import { drainFx, type FxEvent } from '@/use/useVfx'

const STEP_MS = 16

/**
 * Every wind-up, and every thing a wind-up turns into.
 *
 * Held as sets rather than as an `||` chain because the vocabulary GREW: the
 * boss is a pool now (`BOSS_POOL`), and a claw announces itself with `rakeCast`
 * and lands as `bossRake` where a meteor uses `meteorCast` / `bossSlam`. The
 * rule under test — nothing lands that was not announced — is the same rule for
 * all of them, and it is the only rule in the game that a NEW attack can break
 * simply by being new. Any kind added to `BOSS_POOL` belongs in both sets.
 *
 * The healer's `bossBoltCast` / `bossBoltHit` are deliberately NOT here: a bolt's damage
 * lands when the projectile arrives, seconds after the cast and at a place the
 * projectile itself is pointing at, so "was there a cast before the hit" is not
 * the question that measures it. `bossKinds.test.ts` measures the bolt on its
 * own terms — that it exists in the world, visibly, before it hurts anybody.
 */
const CASTS = new Set<FxEvent['kind']>(['meteorCast', 'sliceCast', 'rakeCast', 'chargeCast'])
const LANDS = new Set<FxEvent['kind']>(['bossSlam', 'eliteSweep', 'bossRake', 'bossCharge'])

const fresh = async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  return import('@/use/useSurvivalGame')
}

/**
 * Both attacks, watched through their OWN events.
 *
 * The landing is read from `bossSlam` / `eliteSweep` rather than from the death
 * tally, and that distinction cost a flaky test to learn: an elite's ordinary
 * contact bite is booked under the same `elite` cause as its sweep, so counting
 * deaths made a foe simply walking into the crowd look like an unannounced
 * attack. The swing has its own event; that is what a swing is.
 */
const watch = async (stage: number, units: number) => {
  const game = await fresh()
  game.startStage(stage)
  game.debugAddUnits(units)
  drainFx()

  const casts: number[] = []
  const lands: number[] = []
  /** Frames where the corner badge would have been up, keyed by ms. */
  const warned: number[] = []
  let ms = 0

  for (let i = 0; i < 9000; i++) {
    // Kept alive to reach the swings. Since the 2026-09-18 re-cut, stage 4 is a
    // 60 s road of chicanes and packs and an unsteered crowd of 140 wipes at
    // ~88 % of it — before any big attack ever lands, which left the ordering
    // under test unmeasured rather than broken.
    if (game.squadCount.value < units / 2) game.debugAddUnits(units - game.squadCount.value)
    game.step(STEP_MS)
    ms += STEP_MS
    if (game.attackIncoming()) warned.push(ms)
    for (const e of drainFx() as FxEvent[]) {
      if (CASTS.has(e.kind)) casts.push(ms)
      if (LANDS.has(e.kind)) lands.push(ms)
    }
    if (lands.length >= 3) break
    if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
  }
  return { casts, lands, warned }
}

describe('every big attack announces itself before it lands', () => {
  it('casts a tell before each swing, on the boss road', async () => {
    const { casts, lands } = await watch(4, 140)

    expect(lands.length, 'no big attack ever landed, so the ordering is untested')
      .toBeGreaterThan(0)
    expect(casts.length, 'nothing ever announced an attack').toBeGreaterThan(0)

    // Every landing had a cast in front of it. Asserted per swing rather than
    // once overall: one early tell followed by three silent hits would pass a
    // "the first cast came first" check and be exactly the reported bug.
    for (const at of lands) {
      const announced = casts.some((c) => c < at)
      expect(announced, `a swing at ${at}ms landed with nothing announcing it`).toBe(true)
    }
  })

  it('announces the elite the same way on its own road', async () => {
    const { casts, lands } = await watch(2, 60)
    expect(lands.length, 'stage 2 never swung at the crowd').toBeGreaterThan(0)
    for (const at of lands) {
      expect(casts.some((c) => c < at), `a swing at ${at}ms was silent`).toBe(true)
    }
  })
})

describe('the corner warning', () => {
  it('is up in the run-in to every swing', async () => {
    const { lands, warned } = await watch(4, 140)
    expect(lands.length, 'nothing swung, so the badge was not really tested')
      .toBeGreaterThan(0)

    // Up for at least a few frames immediately before the hit, not merely
    // sometime during the run.
    for (const at of lands) {
      const runIn = warned.filter((w) => w < at && at - w <= ELITE_TELEGRAPH * 1000)
      expect(runIn.length, `nothing warned in the run-in to the swing at ${at}ms`)
        .toBeGreaterThan(2)
    }
  })

  it('is down on an empty road', async () => {
    const game = await fresh()
    game.startStage(1)
    // The opening is deliberately clear for fifteen units — nothing to announce.
    for (let i = 0; i < 30; i++) game.step(STEP_MS)
    expect(game.attackIncoming()).toBe(false)
  })
})
