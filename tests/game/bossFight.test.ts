import { beforeEach, describe, expect, it } from 'vitest'
import {
  BOSS_GUARD_GATES, BOSS_MIN_KILL, ELITE_HOLD_AHEAD, ELITE_HOLD_MAX,
  ELITE_SWEEP_FRACTION, SLAM_CD_BASE, SLAM_CD_MIN, SLAM_MAX_FRACTION, SLAM_RADIUS,
  SLAM_RADIUS_MAX, biteShareFor
} from '@/game/survival'
import { drainFx, type FxEvent } from '@/use/useVfx'

// ─── The climax has to happen ───────────────────────────────────────────────
//
// The career simulation measured a game that nobody could lose: from stage 8
// onward the end boss died before it threw a single slam, and every scripted
// player cleared all thirty stages on any purchasing strategy — including
// buying nothing at all. Two rules fix it and both are invisible in a
// screenshot, so both are measured here against the real simulation:
//
//   1. the boss GUARDS at two-thirds and one-third health, so overwhelming DPS
//      can never skip the fight;
//   2. a bite is the larger of a flat cost and a SHARE of the crowd, so a
//      thousand-strong squad cannot walk through a monster that was authored
//      to frighten a squad of thirty.

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

const settled = (game: Game): boolean =>
  game.phase.value === 'clear' || game.phase.value === 'wipe'

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/** Fast-forward to the boss with a squad big enough to delete it instantly. */
const reachBoss = async (game: Game, units = 900, dmg = 400): Promise<FxEvent[]> => {
  game.startStage(6)
  game.debugAddUnits(units)
  game.debugAddDamage(dmg)
  game.debugAddFireRate(6)
  // Straight to the arena. These are tests about the boss, and walking the
  // road to reach it made them depend on every rule the road has — a crowd
  // that never steers now dies on a passage rib long before the fight.
  game.debugSkipToArena()
  drainFx()
  const seen: FxEvent[] = []
  for (let i = 0; i < 9000; i++) {
    game.step(STEP_MS)
    seen.push(...drainFx())
    if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
  }
  return seen
}

describe('the boss cannot be skipped', () => {
  it('plants and swings at every guard gate, however hard it is hit', async () => {
    const game = await importGame()
    const fx = await reachBoss(game)

    const rages = fx.filter((e) => e.kind === 'bossRage')
    const slams = fx.filter((e) => e.kind === 'bossSlam')

    // Both gates, in order, exactly once each.
    expect(rages.length, 'the boss skipped a guard phase').toBe(BOSS_GUARD_GATES.length)
    expect(rages.map((e) => e.kind === 'bossRage' && e.stage)).toEqual([1, 2])

    // …and every guard is paid off with an actual swing. This is the whole
    // point: a player with 30 000 DPS still has to dodge twice.
    expect(slams.length, 'a guard phase never produced a slam')
      .toBeGreaterThanOrEqual(BOSS_GUARD_GATES.length)
    expect(game.phase.value).toBe('clear')
  })

  it('forfeits the overkill instead of letting one frame cross a gate', async () => {
    const game = await importGame()
    game.startStage(6)
    game.debugAddUnits(1200)
    game.debugAddDamage(2000)
    game.debugAddFireRate(6)
    game.debugSkipToArena()

    // Straight to the boss, then watch the health bar. A single frame of a squad
    // this size is worth more than a whole phase, so if the clamp were missing
    // the bar would jump straight past 0.66 without ever resting on it.
    const restedOn: number[] = []
    for (let i = 0; i < 9000; i++) {
      game.step(STEP_MS)
      if (game.phase.value === 'boss') {
        const hp01 = game.bossHp01.value
        for (const g of BOSS_GUARD_GATES) {
          if (Math.abs(hp01 - g) < 1e-6 && !restedOn.includes(g)) restedOn.push(g)
        }
      }
      if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
    }
    expect(restedOn, 'a guard gate was crossed inside one frame')
      .toEqual([...BOSS_GUARD_GATES])
  })

  it('takes nothing from the player while it is guarding', async () => {
    const game = await importGame()
    game.startStage(6)
    game.debugAddUnits(900)
    game.debugAddDamage(400)
    game.debugAddFireRate(6)
    game.debugSkipToArena()

    // Reach the guard, then hold fire on it for a while and confirm the health
    // bar does not move. A shield that leaks is a shield the player learns to
    // ignore, and a shield that leaks *upward* would be a soft-lock.
    let held = -1
    for (let i = 0; i < 9000; i++) {
      game.step(STEP_MS)
      const b = game.getBoss()
      if (b && b.guard > 0) { held = b.hp; break }
      if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
    }
    expect(held, 'the boss never guarded').toBeGreaterThan(0)
    const b = game.getBoss()!
    for (let i = 0; i < 30 && b.guard > 0; i++) game.step(STEP_MS)
    expect(b.hp).toBe(held)
  })
})

describe('a long fight is a losing fight', () => {
  it('brings each swing sooner and further than the last', async () => {
    const game = await importGame()
    // Stage 1, because it is the only stage with no miniboss on it: an elite
    // that plants and blocks the road turns "how long does this run take" into
    // a coin flip, and this test is about the boss's cadence, not the road.
    //
    // The boss is then held open — its health pinned — for the same reason the
    // elite tests pin theirs. The rule under test is "a long fight gets worse",
    // so the fight has to be long by construction rather than by luck.
    game.startStage(1)
    game.debugAddUnits(150)

    let firstSpan = -1
    let lastSpan = -1
    let slams = 0
    for (let i = 0; i < 30000; i++) {
      const b = game.getBoss()
      if (b) {
        b.hp = b.maxHp
        b.guarded = BOSS_GUARD_GATES.length
        b.guard = 0
      }
      game.step(STEP_MS)
      if (b && !b.dead && b.slams > slams) {
        slams = b.slams
        if (firstSpan < 0) firstSpan = b.slamSpan
        lastSpan = b.slamSpan
      }
      if (slams >= 12) break
      if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
    }

    expect(slams, 'the boss never got a natural swing off').toBeGreaterThan(3)
    expect(firstSpan).toBeLessThanOrEqual(SLAM_CD_BASE)
    expect(lastSpan, 'the cadence never tightened').toBeLessThan(firstSpan)
    expect(lastSpan).toBeGreaterThanOrEqual(SLAM_CD_MIN)
  })

  it('never rages past the numbers the telegraph is drawn from', async () => {
    // The ring is drawn from `SLAM_RADIUS + slams * GROWTH`, capped. If the
    // sim's own cap ever moved off the renderer's, the player would be dodging
    // a circle that no longer matches the hit.
    const { SLAM_RADIUS_GROWTH } = await import('@/game/survival')
    const at = (n: number) => Math.min(SLAM_RADIUS_MAX, SLAM_RADIUS + n * SLAM_RADIUS_GROWTH)
    expect(at(0)).toBe(SLAM_RADIUS)
    expect(at(1000)).toBe(SLAM_RADIUS_MAX)
    // …and it must still be well under the crowd's own disc, or a connected
    // slam is a wipe rather than a cost.
    const { CROWD_MAX_R } = await import('@/game/survival')
    expect(SLAM_RADIUS_MAX).toBeLessThan(CROWD_MAX_R * 2)
  })
})

describe('a bite scales with the crowd it is biting', () => {
  it('keeps the archetype ladder at both ends of the campaign', async () => {
    // A brute is four times a creep at stage 1 because of its flat bite; it has
    // to still be worse than a creep at stage 27, when the flat number is
    // meaningless. Same ordering, different mechanism.
    expect(biteShareFor('brute')).toBeGreaterThan(biteShareFor('husk'))
    expect(biteShareFor('husk')).toBeGreaterThan(biteShareFor('hound'))
    expect(biteShareFor('hound')).toBeGreaterThan(biteShareFor('flyer'))
    expect(biteShareFor('flyer')).toBeGreaterThan(biteShareFor('creep'))
    // Unknown ids fall back rather than throwing — the generator owns the list.
    expect(biteShareFor('nonesuch')).toBe(biteShareFor('creep'))
  })

  it('costs a huge crowd many times what it costs a small one', async () => {
    // The bug this locks: the road's toll used to be ABSOLUTE while the crowd
    // grew exponentially, so a monster authored to frighten thirty survivors
    // was scenery to a thousand.
    //
    // Measured on ONE immortal monster held against the crowd for a fixed
    // window, because a whole stage cannot answer this question — a crowd
    // twenty times the size also has twenty times the DPS and simply deletes
    // the road before it is bitten. The bite is what is under test, so the
    // bite is what is isolated.
    const game = await importGame()

    const tollOn = (crowd: number): number => {
      game.startStage(6)
      game.debugAddUnits(crowd)
      // Walk until something has streamed in, then commandeer it.
      for (let i = 0; i < 2000 && game.getFoes().length === 0; i++) game.step(STEP_MS)
      const foe = game.getFoes()[0]
      expect(foe, 'stage 6 streamed no foes').toBeDefined()
      const before = game.deathBreakdown().foe

      for (let i = 0; i < 180; i++) {
        // Pin it on top of the crowd and keep it unkillable: this measures the
        // bite, not the time-to-kill.
        foe!.hp = 1e9
        foe!.maxHp = 1e9
        foe!.dead = false
        foe!.x = game.anchor().x
        foe!.y = game.anchor().y
        game.step(STEP_MS)
        if (game.phase.value !== 'run') break
      }
      return game.deathBreakdown().foe - before
    }

    const small = tollOn(30)
    const big = tollOn(900)

    expect(small, 'nothing bit the small crowd either').toBeGreaterThan(0)
    expect(big, 'a 900-strong crowd took the same toll as a 30-strong one')
      .toBeGreaterThan(small * 3)
  })
})

describe('a raging boss still aims at the player', () => {
  /**
   * ─── The bug this locks ─────────────────────────────────────────────────
   *
   * The slam's target is latched on the FALLING EDGE of the telegraph window:
   * "was the cooldown above `SLAM_TELEGRAPH` last frame and below it now?".
   * That is only an edge while the cooldown is longer than the window — and
   * rage shortens the cooldown every swing, down to `SLAM_CD_MIN` = 0.95 s,
   * which is BELOW `SLAM_TELEGRAPH` = 1.0 s.
   *
   * From the ninth swing onward the cooldown is therefore never above the
   * window at all, the edge never fires, and `slamX` / `slamY` freeze at
   * whatever the ninth swing aimed at. The boss then hammers one patch of empty
   * road for the rest of the fight, at ~1 Hz, stacking scorch decals into a
   * black smear — which is exactly what a player reported, in the bottom-left
   * corner of the arena, with the crowd nowhere near it.
   */
  it('re-aims on every swing, however fast the rage makes them', async () => {
    const game = await importGame()
    // Big crowd, no damage: the fight has to last long enough to rage.
    game.startStage(6)
    game.debugAddUnits(1400)
    game.debugSkipToArena()
    for (let i = 0; i < 12000 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    expect(game.phase.value, 'never reached the boss').toBe('boss')
    const boss = game.getBoss()!
    expect(boss).toBeDefined()

    /** Where each swing landed, and where the crowd was when it did. */
    const swings: Array<{ n: number; span: number; slamX: number; anchorX: number }> = []
    let lastCd = boss.slamCd
    for (let i = 0; i < 20000; i++) {
      // Keep it alive so the whole rage curve runs, and keep the guard out of
      // the way — this is about aiming, not about the phase gates.
      boss.hp = boss.maxHp
      boss.guarded = BOSS_GUARD_GATES.length
      // Sweep the crowd across the lane. A working latch must FOLLOW it.
      game.steerTo(Math.sin(i / 90) * 3.8)
      game.step(STEP_MS)
      if (boss.slamCd > lastCd) {
        swings.push({
          n: boss.slams, span: boss.slamSpan, slamX: boss.slamX, anchorX: game.anchor().x
        })
      }
      lastCd = boss.slamCd
      if (swings.length >= 16) break
      if (game.phase.value !== 'boss') break
    }

    expect(swings.length, 'the boss never raged far enough to matter')
      .toBeGreaterThanOrEqual(14)
    // The premise: by the end of the run the cadence really has fallen under
    // the telegraph window. If this ever stops being true the test below is
    // still correct but is no longer testing the thing it was written for.
    expect(swings[swings.length - 1]!.span).toBeLessThanOrEqual(SLAM_CD_MIN + 1e-6)

    // Every swing in the raged half of the fight must have aimed somewhere new,
    // because the crowd it is aiming at moved between them.
    const raged = swings.slice(8)
    const distinct = new Set(raged.map((s) => s.slamX.toFixed(3)))
    expect(distinct.size, `the raging boss froze on one spot: ${raged.map((s) => s.slamX.toFixed(2)).join(', ')}`)
      .toBeGreaterThan(1)
  })
})

describe('a boss swing is never a scratch', () => {
  // Every big attack in the game is priced as a SHARE of the crowd, which is
  // the right shape at three hundred survivors and a rounding error at ten. A
  // share of a small crowd rounds to ONE body — the ring lands, the screen
  // shakes, a single survivor tips over, and the player learns that the thing
  // with the health bar and the wind-up is survivable by standing still. So
  // both of them carry `BOSS_MIN_KILL` under the share.
  //
  // The floor is an INTENT, not a debt: it is still bounded by the ring and the
  // arc, so nothing outside the attack is ever billed for the crowd being
  // small. Both tests below therefore park the crowd squarely inside the hit.

  it('takes at least BOSS_MIN_KILL from a small crowd, per slam', async () => {
    const game = await importGame()
    game.startStage(6)
    // Six: small enough that `ceil(squad × slamShare)` is two — under the floor,
    // which is the only case that measures it — and big enough that the floor is
    // not simply "the whole squad" either.
    const CROWD = 6
    expect(Math.ceil(CROWD * SLAM_MAX_FRACTION), 'the premise: the share alone rounds under the floor')
      .toBeLessThan(BOSS_MIN_KILL)
    game.debugAddUnits(CROWD)
    game.debugSkipToArena()
    for (let i = 0; i < 12000 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    expect(game.phase.value, 'never reached the boss').toBe('boss')
    const boss = game.getBoss()!

    const swings: number[] = []
    let taken = game.deathBreakdown().slam
    for (let i = 0; i < 6000; i++) {
      // Immortal boss, and the squad topped back up between swings: this is a
      // question about ONE slam, and a crowd this small cannot answer it twice
      // without being refilled.
      boss.hp = boss.maxHp
      boss.guarded = BOSS_GUARD_GATES.length
      if (game.squadCount.value < CROWD) game.debugAddUnits(CROWD - game.squadCount.value)
      // Stand still, in the open, and eat it — the aim leads the crowd's own
      // movement, so not moving is what guarantees the ring lands on it.
      game.steerTo(0)
      game.step(STEP_MS)
      const now = game.deathBreakdown().slam
      if (now > taken) {
        swings.push(now - taken)
        taken = now
      }
      if (swings.length >= 4) break
      if (game.phase.value !== 'boss') break
    }

    expect(swings.length, 'the boss never landed a slam on a stationary crowd')
      .toBeGreaterThanOrEqual(2)
    for (const s of swings) expect(s).toBeGreaterThanOrEqual(BOSS_MIN_KILL)
  })

  it('takes at least BOSS_MIN_KILL from a small crowd, per miniboss sweep', async () => {
    const game = await importGame()
    game.startStage(4)
    // Big enough to survive the walk in — the crowd is thinned to the sizes this
    // test is about by the fight itself, which is the only lever the sim gives.
    game.debugAddUnits(150)

    /** Walk to the first miniboss, keeping it unkillable from the moment it
     *  streams in: the sweep is under test, not the time-to-kill. */
    const pin = (): void => {
      const e = game.getFoes().find((f) => f.elite)
      if (!e) return
      e.hp = 1e9
      e.maxHp = 1e9
      e.dead = false
      e.hold = ELITE_HOLD_MAX
    }

    let met = false
    for (let i = 0; i < 6000; i++) {
      game.steerTo(0)
      pin()
      game.step(STEP_MS)
      const e = game.getFoes().find((f) => f.elite)
      if (e && e.y - game.anchor().y <= ELITE_HOLD_AHEAD + 0.4) { met = true; break }
      if (settled(game)) break
    }
    expect(met, 'stage 4 streamed no miniboss the crowd reached').toBe(true)

    // Stand in the arc and let it eat. The crowd shrinks as it does, which is
    // exactly how the small-crowd case gets exercised: a share of 150 is thirty
    // survivors, a share of eight rounds to two, and the floor owns the tail.
    const sweeps: Array<{ squad: number; took: number }> = []
    for (let i = 0; i < 6000; i++) {
      pin()
      game.steerTo(0)
      const squad = game.squadCount.value
      const before = game.deathBreakdown().elite
      drainFx()
      game.step(STEP_MS)
      // Only the frames the ARC actually went out — the bite runs on its own
      // cooldown and would otherwise be counted as part of a sweep.
      const swept = drainFx().some((e) => e.kind === 'eliteSweep')
      const took = game.deathBreakdown().elite - before
      if (swept && took > 0) sweeps.push({ squad, took })
      if (settled(game)) break
    }

    expect(sweeps.length, 'the miniboss never swept a crowd standing in front of it')
      .toBeGreaterThanOrEqual(3)
    // The premise: the fight really did reach the sizes where a percentage
    // rounds to less than the floor. Without this the assertion below passes on
    // the share alone and measures nothing.
    const tail = sweeps.filter((s) => Math.ceil(s.squad * ELITE_SWEEP_FRACTION) < BOSS_MIN_KILL)
    expect(tail.length, 'the crowd never got small enough for the floor to matter')
      .toBeGreaterThan(0)

    for (const s of sweeps) {
      // The floor, or the whole crowd when there is less of it than the floor —
      // an attack may only ever take survivors that were actually in the arc.
      expect(s.took, `a sweep took ${s.took} from a crowd of ${s.squad}`)
        .toBeGreaterThanOrEqual(Math.min(BOSS_MIN_KILL, s.squad))
    }
  })
})
