/**
 * A scratch probe, not a regression: it asserts nothing and only reports.
 *
 *   SIM_RAMP=1 npx vitest run tests/sim/scratch.ramp.test.ts --reporter=verbose
 *
 * `--reporter=verbose` is load-bearing — Vitest 4's default reporter swallows
 * `console.log` from a passing test.
 *
 * ── What it measures, and why not the full-run study ──
 *
 * "Stage N is a difficulty spike" is a claim about the road, and the full-run
 * tables cannot answer it: they measure whether a scripted policy CLEARS a
 * stage, which conflates the road with the crowd the player brought to it. This
 * builds each track and adds up what is standing on it — total foe health,
 * elite health, boss health, the scenery that has to be steered around, crate
 * health — and then prints each stage AGAINST THE ONE BEFORE IT.
 *
 * The ratios are the point. A campaign that ramps has neighbours in the same
 * band; a cliff is a single ratio two or three times its neighbours', and that
 * is what a player reports as "stage N got hard suddenly".
 *
 * Read with `earlyFoeHpMul` and the rest of the onboarding curves in
 * `survival.ts` — they are the dials this table responds to, and the block
 * comment there records what it said before and after the last pass.
 *
 * The `boss` column reads 0 for stages 1-5 and that is not a bug: their boss is
 * no longer a property of the road at all. It is priced at the arena door
 * against the firepower that walked in (`game/adaptive.ts`), and
 * `tests/sim/scratch.adaptive.test.ts` is the probe that measures it.
 */
import { describe, it } from 'vitest'
import { buildTrack, minibossHp } from '@/game/track'
import { bossHpScale, foeDef, foeHpScale } from '@/game/foes'
import { adaptiveBossStage } from '@/game/adaptive'
import {
  BOSS_BASE_HP, earlyBarricadeKeep, earlyCrateHpMul, earlyFoeHpMul, earlyPackMul,
  earlyRockKeep
} from '@/game/survival'
import { bossHpMulFor, bossKindFor } from '@/game/threats'

const RUN = process.env.SIM_RAMP === '1'
const STAGES = [1, 2, 3, 4, 5, 6, 7, 8]

const n = (v: number): string => (Math.round(v * 100) / 100).toFixed(2)
const p = (v: number | string, w: number): string => String(v).padStart(w)

interface Budget {
  stage: number
  /** Bodies on the road and what they cost to shoot, `foeHpScale` included. */
  bodies: number; foeHp: number
  /** Elites and end boss, priced as the game prices them. */
  elites: number; elite: number; boss: number
  /** Scenery. `ribs` are passage walls, which are one BEAT, not N hazards. */
  blocks: number; ribs: number; barrHp: number
  crateHp: number
}

const budget = (stage: number): Budget => {
  const t = buildTrack(stage)
  const b: Budget = {
    stage, bodies: 0, foeHp: 0, elites: 0, elite: 0, boss: 0,
    blocks: 0, ribs: 0, barrHp: 0, crateHp: 0
  }
  for (const e of t.events) {
    if (e.kind === 'foes') {
      b.bodies += e.count
      b.foeHp += e.count * foeDef(e.typeId).hp * foeHpScale(stage)
    } else if (e.kind === 'miniboss') {
      b.elites++
      // The event's `hpScale` is relative to the archetype's base, exactly as
      // the sim applies it — see `minibossHpScale`.
      b.elite += foeDef(e.typeId).hp * foeHpScale(stage) * e.hpScale
    } else if (e.kind === 'rocks') {
      b.blocks += e.blocks.length
      if (e.passage) b.ribs += e.blocks.length
    } else if (e.kind === 'barricade') {
      b.blocks += e.blocks.length
      b.barrHp += e.blocks.reduce((s, x) => s + x.hp, 0)
    } else if (e.kind === 'crates') {
      b.crateHp += e.crates.reduce((s, c) => s + c.hp, 0)
    }
  }
  // Stages 1-5 have no authored bar to add up: their boss is priced against the
  // run that reaches it (`game/adaptive.ts`), so the honest entry is "not a
  // property of this road". Printed as 0 rather than guessed at, because a
  // guessed number here would go straight into the jump table below and invent
  // a cliff — or hide one.
  b.boss = adaptiveBossStage(stage)
    ? 0
    : BOSS_BASE_HP * bossHpScale(stage) * bossHpMulFor(bossKindFor(stage))
  return b
}

describe.skipIf(!RUN)('the shape of the opening ramp', () => {
  it('prints what is standing on each road, and the jump from the road before', () => {
    const rows = STAGES.map(budget)

    console.log(`\n${minibossHp(1, false, 'tutorial')} hp is stage 1's elite, for scale.\n`)
    console.log('stage | foeMul | pack | crate | rock | barr | bodies |  foeHP | elites | eliteHP |   boss | blocks (ribs) | barrHP | crateHP')
    for (const r of rows) {
      console.log(
        `  ${p(r.stage, 3)} |   ${n(earlyFoeHpMul(r.stage))} | ${n(earlyPackMul(r.stage))} |  ${n(earlyCrateHpMul(r.stage))} | ${n(earlyRockKeep(r.stage))} | ${n(earlyBarricadeKeep(r.stage))} |` +
        ` ${p(r.bodies, 6)} | ${p(Math.round(r.foeHp), 6)} | ${p(r.elites, 6)} | ${p(Math.round(r.elite), 7)} | ${p(Math.round(r.boss), 6)} |` +
        ` ${p(r.blocks, 6)} (${p(r.ribs, 2)}) | ${p(Math.round(r.barrHp), 6)} | ${p(Math.round(r.crateHp), 7)}`
      )
    }

    console.log('\njump (x over the stage before)')
    console.log('stage | foeHP | eliteHP |  boss | road (foes+elites) | blocks | crateHP')
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1]!, b = rows[i]!
      const road = (r: Budget): number => r.foeHp + r.elite
      console.log(
        ` ${a.stage}->${b.stage} |  ${n(b.foeHp / Math.max(1, a.foeHp))} |    ${n(b.elite / Math.max(1, a.elite))} |  ${n(b.boss / Math.max(1, a.boss))} |` +
        `               ${n(road(b) / Math.max(1, road(a)))} | ${p(a.blocks, 3)}->${p(b.blocks, 3)} |    ${n(b.crateHp / Math.max(1, a.crateHp))}`
      )
    }
  })
})
