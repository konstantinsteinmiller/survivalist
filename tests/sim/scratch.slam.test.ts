/**
 * ─── What a boss's slam actually costs a crowd that does not dodge ──────────
 *
 * A scratch probe, not a regression: it asserts nothing and reports.
 *
 *   SIM_SLAM=1 npx vitest run tests/sim/scratch.slam.test.ts --reporter=verbose
 *   SIM_SLAM=1 SIM_STAGES=1,2,3 SIM_SAMPLES=5 npx vitest run tests/sim/scratch.slam.test.ts
 *
 * Reported from a real stage-1 run: 99 survivors stood under the boss, shot
 * straight up without ever moving, and walked out with 90. Every scripted
 * policy that reaches a boss dodges it (`bossDance`), so the balance tables have
 * never priced the fight for the player who does not — which is the player the
 * slam exists to punish. Each policy here plays the road exactly as its dodging
 * self and then plants itself under the boss.
 */
import { describe, it } from 'vitest'
import { STEER_CLAMP, average, good, optimal } from './policies'
import type { Policy, View } from './policies'
import { runOne } from './harness'
import type { RunResult } from './harness'

const RUN = process.env.SIM_SLAM === '1'
const SEEDS = Number(process.env.SIM_SAMPLES ?? 3)
const STAGES = (process.env.SIM_STAGES ?? '1,2,3,4,5,6,8').split(',').map(Number)

/** The same player on the road, planted under the boss once it arrives. */
const planted = (base: Policy): Policy => ({
  id: `${base.id}-planted`,
  describes: `${base.id} on the road; never dodges the boss`,
  reset: (seed) => base.reset(seed),
  decide: (view: View) => {
    if (view.phase !== 'boss') return base.decide(view)
    const b = view.boss
    return b && !b.dead ? Math.max(-STEER_CLAMP, Math.min(STEER_CLAMP, b.x)) : view.anchorX
  }
})

const PLAYERS: Policy[] = [optimal, planted(optimal), good, planted(good), planted(average)]

const med = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)]! : NaN
}
const p = (v: number | string, w: number): string => String(v).padStart(w)

describe.skipIf(!RUN)('slam cost for a crowd that stands still', () => {
  it('reports squad at the boss, what the fight took, and per-swing kills', { timeout: 30 * 60_000 }, async () => {
    const lines: string[] = [
      `${p('stage', 5)} ${p('player', 18)} ${p('clear', 6)} ${p('atBoss', 7)} ${p('left', 6)} ${p('lost%', 6)} ${p('slams', 6)} ${p('hit', 4)} ${p('perHit', 7)} ${p('fight s', 8)}`
    ]
    for (const stage of STAGES) {
      for (const policy of PLAYERS) {
        const rs: RunResult[] = []
        for (let i = 0; i < SEEDS; i++) rs.push(await runOne({ stage, policy, seed: 1000 + i }))
        const boss = rs.filter((r) => r.bossReached)
        const clear = rs.filter((r) => r.cleared).length
        const atBoss = med(boss.map((r) => r.squadAtBoss))
        const left = med(boss.map((r) => r.finalSquad))
        const lostPct = med(boss.map((r) => r.squadAtBoss > 0 ? (100 * r.squadLostToBoss) / r.squadAtBoss : 0))
        const slams = med(boss.map((r) => r.slamsThrown))
        const hit = med(boss.map((r) => r.slamsConnected))
        const perHit = med(boss.filter((r) => r.slamsConnected > 0).map((r) => r.deaths.slam / r.slamsConnected))
        const secs = med(boss.map((r) => r.bossSeconds ?? NaN).filter((v) => !Number.isNaN(v)))
        lines.push(`${p(stage, 5)} ${p(policy.id, 18)} ${p(`${clear}/${rs.length}`, 6)} ${p(atBoss, 7)} ${p(left, 6)} ${p(lostPct.toFixed(0), 6)} ${p(slams, 6)} ${p(hit, 4)} ${p(Number.isNaN(perHit) ? '-' : perHit.toFixed(1), 7)} ${p(Number.isNaN(secs) ? '-' : secs.toFixed(1), 8)}`)
      }
    }
    console.log(`\n${lines.join('\n')}\n`)
  })
})
