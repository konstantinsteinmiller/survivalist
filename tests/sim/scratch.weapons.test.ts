/**
 * ─── What a weapon stage is worth, before and after a weapon tuning pass ─────
 *
 * A scratch probe, not a regression: it asserts nothing and reports.
 *
 *   SIM_WEAPONS=1 npx vitest run tests/sim/scratch.weapons.test.ts --reporter=verbose
 *   SIM_WEAPONS=1 SIM_STAGES=4,6,8,10 SIM_SAMPLES=5 npx vitest run tests/sim/scratch.weapons.test.ts
 *
 * Stages from 4 alternate weapon boxes (gatling on 4, 8, 12…; rocket on 6, 10…),
 * and the no-weapon stages between them (5, 7, 9) are the control: the owner's
 * report was that a weapon roughly quadruples survivability, which shows up as
 * the crowd a weapon stage delivers to its boss against the crowd a stage
 * without one does.
 */
import { describe, it } from 'vitest'
import type { WeaponId } from '@/game/weapons'
import { runOne } from './harness'
import type { Game, RunResult } from './harness'
import { average, good, optimal } from './policies'

/** `none` plus every weapon in the game, or the ones SIM_ARMS names. */
const ARMS = ['none', ...(process.env.SIM_ARMS ?? 'gatling,rocket,grapeshot,dynamo,gravecall,hoard').split(',')] as const

const med = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)]! : 0
}

/** Take the weapon out of the crowd's hands every tick: the A of the A/B. */
const unarmed = (game: Game): void => {
  if (game.activeWeapon.value) game.activeWeapon.value = null
  if (game.sideWeapon.value) game.sideWeapon.value = null
}

/**
 * …and the B: hand the weapon over on the first running tick, through the
 * watch-ad offer's own path. The scripted policies never solve the lever
 * puzzle, so a road box alone would measure nothing.
 */
const armedWith = (id: WeaponId) => {
  let given = false
  return (game: Game): void => {
    if (given || game.phase.value !== 'run') return
    game.activeWeapon.value = null
    game.sideWeapon.value = null
    given = game.grantOfferWeapon(id)
  }
}

describe.skipIf(process.env.SIM_WEAPONS !== '1')('weapon stages', () => {
  it('reports', { timeout: 30 * 60_000 }, async () => {
    const seeds = Number(process.env.SIM_SAMPLES ?? 5)
    const stages = (process.env.SIM_STAGES ?? '3,5,7,9,12').split(',').map(Number)
    const rows: string[] = ['stage player    arm   clear  atBoss  final  bossS  pumpGain  coins']
    for (const stage of stages) {
      for (const policy of [good, average]) {
        for (const arm of ARMS) {
          const rs: RunResult[] = []
          for (let i = 0; i < seeds; i++) {
            rs.push(await runOne({ stage, policy, seed: 1000 + i, onTick: arm === 'none' ? unarmed : armedWith(arm as WeaponId) }))
          }
          const clear = rs.filter((r) => r.cleared).length
          const boss = rs.filter((r) => r.bossReached)
          const secs = boss.map((r) => r.bossSeconds).filter((v): v is number => v != null)
          rows.push(`${String(stage).padStart(5)} ${policy.id.padEnd(9)} ${arm.padEnd(6)} ${`${clear}/${seeds}`.padStart(5)} ${String(Math.round(med(boss.map((r) => r.squadAtBoss)))).padStart(7)} ${String(Math.round(med(rs.map((r) => r.finalSquad)))).padStart(6)} ${(secs.length ? med(secs) : 0).toFixed(1).padStart(6)} ${String(Math.round(med(rs.map((r) => r.gateDelivered)))).padStart(9)} ${String(Math.round(med(rs.map((r) => r.banked)))).padStart(6)}`)
        }
      }
    }
    console.log(['', ...rows, ''].join('\n'))
  })
})
