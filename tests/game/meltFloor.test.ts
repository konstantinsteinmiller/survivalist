// The melt floor — the boss-HP guarantee for stages 6+.
//
// Reported from stage 45+: a run that read the road arrives with ~1500-4000
// survivors and the authored curve is gone before the boss finishes walking in.
// Measured over an `optimal` career (seed 4242, shop on `value()`), stages 45-50
// were being killed in 0.39-0.86 s of fire. The floor prices the bar at
// `BOSS_MIN_FIRE_SECONDS` of the run's OWN firepower whenever that is more than
// the curve asks for, and leaves the curve alone otherwise.
//
// Two promises, and this file exists because each can break without the other
// showing any symptom:
//
//   1. it RAISES and never lowers — mid and low runs must be untouched, because
//      the whole reason adaptive pricing stops at stage 5 is that a bar always
//      exactly as big as you are is a bar your upgrades can never beat;
//   2. a bomb cannot delete the guarantee. A grenade deals `squadDps × mult` in
//      one hit and the floor is worth `BOSS_MIN_FIRE_SECONDS × squadDps`, so an
//      upgraded bomb (4.4x against a boss at level 20) would spend all three
//      seconds the floor just bought.
import { describe, expect, it } from 'vitest'
import {
  ADAPTIVE_BOSS_STAGES, BOSS_FLOOR_GRENADE_MULT, BOSS_MIN_FIRE_SECONDS,
  MELT_FLOOR_STAGE, adaptiveBossHp, adaptiveBossStage, expectedDamage, meltFloorStage,
  type AdaptiveFight
} from '@/game/adaptive'
import { BOSS_BASE_HP, SLAM_CD_BASE, SLAM_CD_DECAY, SLAM_CD_MIN } from '@/game/survival'
import { bossHpScale } from '@/game/foes'
import { GRENADE_BOSS_BASE_MULT, grenadeBossMult } from '@/use/useUpgrades'

/** A fight at depth, shaped like the careers this was measured on. */
const fight = (squad: number, perSurvivorDps: number): AdaptiveFight => ({
  squad,
  perSurvivorDps,
  slamShare: 0.12,
  slamMinKill: 3,
  guardPhases: 2,
  openingCd: 2.6,
  slamCd: SLAM_CD_BASE,
  slamCdDecay: SLAM_CD_DECAY,
  slamCdMin: SLAM_CD_MIN
})

/** What the authored curve asks for on a stage, kind multiplier aside. */
const authored = (stage: number): number => BOSS_BASE_HP * bossHpScale(stage)

describe('the melt floor', () => {
  it('starts exactly where the full ladder stops', () => {
    // The two must tile the campaign with no gap and no overlap: a stage priced
    // by both would have the ladder's answer silently overwritten by a floor.
    expect(MELT_FLOOR_STAGE).toBe(ADAPTIVE_BOSS_STAGES + 1)
    for (let stage = 1; stage <= 60; stage++) {
      expect(adaptiveBossStage(stage) && meltFloorStage(stage), `stage ${stage} is priced twice`)
        .toBe(false)
      expect(adaptiveBossStage(stage) || meltFloorStage(stage), `stage ${stage} is priced by neither`)
        .toBe(true)
    }
  })

  it('only ever raises a bar, and only one the curve would have lost', () => {
    // The scoping property, stated exactly rather than by picking crowds and
    // hoping. The floor is a `Math.max` against the curve, so "this run is not
    // regulated" means "the curve already asks for more than three seconds of
    // its fire" — and in that case the bar must come out byte-identical.
    //
    // Worth being precise about, because the obvious version of this test is
    // wrong: 400 survivors on STAGE 10 trips the floor, and should. That crowd
    // kills the authored bar in 1.6 s, which is the same melt being reported at
    // stage 45 — it is a strong run, not an ordinary one. The trigger is
    // firepower against the curve, never a squad-size threshold, so a big crowd
    // early is regulated and a small crowd late is not.
    for (const stage of [6, 10, 20, 30, 45, 60]) {
      for (const squad of [20, 60, 150, 400, 1500, 4000]) {
        for (const per of [22, 60, 120]) {
          const floor = adaptiveBossHp(fight(squad, per), BOSS_MIN_FIRE_SECONDS)
          const bar = Math.max(authored(stage), floor)
          expect(bar, `stage ${stage}/${squad}x${per}: the floor lowered a bar`)
            .toBeGreaterThanOrEqual(authored(stage))
          if (authored(stage) >= floor) {
            expect(bar, `stage ${stage}/${squad}x${per}: an untouched run was changed`)
              .toBe(authored(stage))
          }
        }
      }
    }
  })

  it('leaves a small crowd alone where the curve is worth anything', () => {
    // The concrete half of the request — "no need to regulate mid and low end
    // squad sizes". Scoped to stage 15 and up on purpose, because below that the
    // authored bar is small in absolute terms (2 403 at stage 6) and a modest
    // crowd genuinely does kill it inside three seconds.
    //
    // That is left alone rather than gated, on measurement: `average` and `good`
    // careers run stages 6-30 in 33 and 34 attempts with the floor in, and 33
    // and 34 without it. Identical. The early crossover is reachable in theory
    // and not on any road an ordinary player actually walks, because real
    // per-survivor DPS at stage 6-10 is far below the 22 used here.
    for (const stage of [15, 20, 30, 45, 60]) {
      for (const squad of [20, 60, 150]) {
        const floor = adaptiveBossHp(fight(squad, 22), BOSS_MIN_FIRE_SECONDS)
        expect(floor, `stage ${stage}, squad ${squad}: a small crowd was regulated`)
          .toBeLessThan(authored(stage))
      }
    }
  })

  it('takes over for a run the curve has nothing left to offer', () => {
    // The reported case: four thousand survivors at stage 45+.
    for (const stage of [45, 50, 60]) {
      const floor = adaptiveBossHp(fight(4000, 80), BOSS_MIN_FIRE_SECONDS)
      expect(floor, `stage ${stage}: an overpowered run still melts the curve`)
        .toBeGreaterThan(authored(stage))
    }
  })

  it('scales with the run rather than with the stage', () => {
    // Twice the firepower is twice the bar, so the fight stays the same length.
    // A floor that did not track DPS would be a new authored curve wearing a
    // different name, and would melt again one upgrade later.
    const lo = adaptiveBossHp(fight(2000, 60), BOSS_MIN_FIRE_SECONDS)
    const hi = adaptiveBossHp(fight(4000, 60), BOSS_MIN_FIRE_SECONDS)
    expect(hi / lo).toBeGreaterThan(1.9)
    expect(hi / lo).toBeLessThan(2.1)
  })

  it('buys the seconds it says it buys', () => {
    // The bar IS the damage this crowd delivers in the target, by construction —
    // so the check that means anything is that the target is the number the
    // request named, and that more seconds buys proportionally more bar.
    expect(BOSS_MIN_FIRE_SECONDS).toBe(3)
    const f = fight(4000, 80)
    const three = expectedDamage(f, 3)
    const six = expectedDamage(f, 6)
    expect(six).toBeGreaterThan(three)
    expect(adaptiveBossHp(f, 3)).toBe(Math.max(30, Math.round(three)))
  })

  describe('and the bomb', () => {
    it('is capped below its base multiplier against a boss', () => {
      expect(BOSS_FLOOR_GRENADE_MULT).toBeLessThan(GRENADE_BOSS_BASE_MULT)
    })

    it('cannot delete a floored boss on its own', () => {
      // THE point of the cap. A grenade's damage is `squadDps × mult`, computed
      // WITHOUT the weapon multiplier (`squadDps` in useSurvivalGame), while the
      // bar is priced WITH it — so the worst case for this guarantee is a run
      // carrying no special weapon, which is what `damageMul = 1` means here.
      for (const [squad, per] of [[1500, 70], [4000, 80], [800, 120]] as const) {
        const f = fight(squad, per)
        const floor = adaptiveBossHp(f, BOSS_MIN_FIRE_SECONDS)
        const squadDps = squad * per
        expect(squadDps * BOSS_FLOOR_GRENADE_MULT,
          `squad ${squad}: a capped bomb still one-shots the floor`).toBeLessThan(floor)
        // …and the uncapped bomb is exactly why the cap exists: fully upgraded
        // it is worth more than the whole guarantee.
        expect(squadDps * grenadeBossMult(6),
          `squad ${squad}: the cap is not doing anything`).toBeGreaterThan(floor)
      }
    })

    it('leaves a real fight behind after it lands', () => {
      // Not merely "survives": the remainder has to be worth shooting at. A cap
      // that left 2 % of the bar would pass the test above and still read as a
      // delete button.
      const f = fight(4000, 80)
      const floor = adaptiveBossHp(f, BOSS_MIN_FIRE_SECONDS)
      const left = floor - 4000 * 80 * BOSS_FLOOR_GRENADE_MULT
      expect(left / floor, 'a capped bomb leaves too little of the bar').toBeGreaterThan(0.1)
    })
  })
})
