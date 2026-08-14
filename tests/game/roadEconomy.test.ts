import { beforeEach, describe, expect, it } from 'vitest'
import {
  BARRICADE_COIN_MAX, BARRICADE_COIN_MIN, COIN_MAGNET_BASE,
  ELITE_HOLD_AHEAD, ELITE_HOLD_MAX, ELITE_SWEEP_FRACTION, ELITE_SWEEP_REACH,
  ELITE_TELEGRAPH, LANE_HALF
} from '@/game/survival'
import { buildTrack } from '@/game/track'
import { drainFx, type FxEvent } from '@/use/useVfx'

// ─── What the road is worth, and what it costs ──────────────────────────────
//
// Four rules that only make sense together, all of them invisible in a
// screenshot and all of them one edit from silently reverting:
//
//   1. rounds pass THROUGH gates — a doorway is not armour;
//   2. a miniboss PLANTS and blocks the road instead of strolling through the
//      crowd and out the back;
//   3. the coin magnet is BOUGHT, not given, so the coin trails are a route
//      rather than scenery;
//   4. a barricade PAYS when it is shot down, so the guns have a reason to
//      point at it.

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

const settled = (game: Game): boolean =>
  game.phase.value === 'clear' || game.phase.value === 'wipe'

describe('a gate is a doorway, not armour', () => {
  it('lets rounds through to whatever is standing behind it', async () => {
    const game = await importGame()
    game.startStage(3)
    game.debugAddUnits(60)
    game.step(STEP_MS)

    // Find a live gate and park the crowd on it.
    let leaf = game.getGates().find((g) => !g.used)
    for (let i = 0; i < 600 && !leaf; i++) {
      game.step(STEP_MS)
      leaf = game.getGates().find((g) => !g.used)
    }
    expect(leaf, 'stage 3 streamed no gate').toBeDefined()
    game.steerTo(leaf!.x)

    // Put a target on the far side of the doorway — close enough that a round
    // which survives the gate reaches it within a frame or two, far enough that
    // nothing else is in the way.
    const foe = game.getFoes()[0]
    for (let i = 0; i < 400 && !game.getFoes().length; i++) game.step(STEP_MS)
    const target = foe ?? game.getFoes()[0]
    expect(target, 'stage 3 streamed no foes').toBeDefined()
    target!.x = leaf!.x
    target!.y = leaf!.y + 1.2
    target!.hp = 1e6
    target!.maxHp = 1e6
    const before = target!.hp

    for (let i = 0; i < 120; i++) {
      // Pin both: this measures whether the round arrives, not the chase.
      target!.x = leaf!.x
      target!.y = leaf!.y + 1.2
      target!.dead = false
      game.steerTo(leaf!.x)
      game.step(STEP_MS)
      if (settled(game)) break
    }

    expect(target!.hp, 'the gate ate every round aimed through it')
      .toBeLessThan(before)
  })

  it('still charges the gate it passes through', async () => {
    // The pump is the thing a gate was always actually selling, and piercing
    // must not have quietly bought it for free or made it cost more.
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(40)
    game.step(STEP_MS)

    let leaf = game.getGates().find((g) => !g.used && g.op === 'add')
    for (let i = 0; i < 900 && !leaf; i++) {
      game.step(STEP_MS)
      leaf = game.getGates().find((g) => !g.used && g.op === 'add')
    }
    expect(leaf, 'no +N gate to pump').toBeDefined()
    const opening = leaf!.value

    game.steerTo(leaf!.x)
    for (let i = 0; i < 180 && !leaf!.used; i++) game.step(STEP_MS)

    expect(leaf!.value, 'sustained fire did not raise the gate')
      .toBeGreaterThan(opening)
  })
})

describe('a miniboss holds the road', () => {
  /**
   * Walk to the first elite and stop there, keeping it unkillable the whole way.
   *
   * Both tests below ask a question about the HOLD, not about time-to-kill, so
   * the squad is deliberately large enough to survive the road and the elite is
   * deliberately immortal. Pinning its health from the moment it streams in is
   * what keeps that true — a big squad will otherwise delete it on the approach
   * and the test measures nothing.
   */
  const reachElite = (game: Game): boolean => {
    for (let i = 0; i < 6000; i++) {
      game.steerTo(0)
      const e = game.getFoes().find((f) => f.elite)
      if (e) {
        e.hp = 1e9
        e.maxHp = 1e9
        e.dead = false
      }
      game.step(STEP_MS)
      if (e && e.y - game.anchor().y <= ELITE_HOLD_AHEAD + 0.4) return true
      if (settled(game)) break
    }
    return false
  }

  it('stops the crowd instead of strolling through it', async () => {
    const game = await importGame()
    game.startStage(4)
    game.debugAddUnits(150)

    expect(reachElite(game), 'never met an elite on stage 4').toBe(true)

    // Freeze the fight: an unkillable elite is the clean way to ask "does it
    // hold?" without the answer depending on how fast the squad kills it.
    const live = game.getFoes().find((f) => f.elite)!
    const startY = game.anchor().y
    for (let i = 0; i < 120; i++) {
      live.hp = 1e9
      live.maxHp = 1e9
      live.hold = ELITE_HOLD_MAX
      game.step(STEP_MS)
      if (settled(game)) break
    }

    // The crowd has gone nowhere…
    expect(game.anchor().y - startY, 'the crowd walked past a holding elite')
      .toBeLessThan(0.6)
    // …and the elite is parked exactly where the fight wants it: in the firing
    // line, in reach of the leading edge, and out of reach of the middle.
    expect(live.y - game.anchor().y).toBeCloseTo(ELITE_HOLD_AHEAD, 1)
  })

  it('breaks off rather than becoming a wall nobody can pass', async () => {
    // The anti-frustration half of the rule. A squad that cannot win the fight
    // must not be parked in front of it for the rest of the stage.
    const game = await importGame()
    game.startStage(4)
    game.debugAddUnits(150)

    expect(reachElite(game), 'never met an elite').toBe(true)
    const live = game.getFoes().find((f) => f.elite)!
    const stalledAt = game.anchor().y

    for (let i = 0; i < 3000; i++) {
      live.hp = 1e9
      live.maxHp = 1e9
      game.step(STEP_MS)
      if (live.hold <= 0) break
      if (settled(game)) break
    }
    expect(live.hold, 'the hold never expired').toBeLessThanOrEqual(0)

    for (let i = 0; i < 400; i++) {
      live.hp = 1e9
      game.step(STEP_MS)
      if (settled(game)) break
    }
    expect(game.anchor().y, 'the crowd is still stuck behind a spent elite')
      .toBeGreaterThan(stalledAt + 1)
  })

  it('sweeps the road for a fifth of the squad, on a wind-up', async () => {
    // Planting fixed "it walks past" and the maul that followed fixed "it is
    // boring" — but it never fixed "it is harmless": 0–8 survivors a fight
    // against a crowd in the hundreds. The sweep is the version with teeth. It
    // crosses the whole lane, so the answer is DPS rather than footwork, and it
    // costs a FIFTH of whatever the squad currently is.
    const game = await importGame()
    game.startStage(4)
    game.debugAddUnits(200)
    drainFx()

    expect(reachElite(game), 'never met an elite').toBe(true)
    const live = game.getFoes().find((f) => f.elite)!

    // Re-arm the cycle so the first wind-up happens INSIDE the counting loop —
    // the approach above may already have spent one, and a telegraph observed
    // without its strike (or the reverse) is an artefact of where the loop
    // started rather than a fact about the elite.
    live.sweepCd = live.sweepSpan
    // Drop everything the approach queued. `reachElite` never drains, so the
    // loop's first batch would otherwise arrive carrying a strike that happened
    // before the re-arm — and be credited with zero frames of warning it did in
    // fact have.
    drainFx()
    const seen: FxEvent[] = []
    /** Frames of visible wind-up that preceded each sweep. */
    const windUps: number[] = []
    /** Squad before each sweep, and the toll it took. */
    const tolls: Array<{ before: number; lost: number }> = []
    let winding = 0
    for (let i = 0; i < 900; i++) {
      live.hp = 1e9
      live.maxHp = 1e9
      live.hold = ELITE_HOLD_MAX
      if (live.sweepCd <= ELITE_TELEGRAPH) winding++
      const squadWas = game.squadCount.value
      game.step(STEP_MS)
      const batch = drainFx()
      seen.push(...batch)
      if (batch.some((e) => e.kind === 'eliteSweep')) {
        windUps.push(winding)
        winding = 0
        tolls.push({ before: squadWas, lost: squadWas - game.squadCount.value })
      }
      if (settled(game)) break
    }

    const sweeps = seen.filter((e) => e.kind === 'eliteSweep')
    expect(sweeps.length, 'the elite never attacked').toBeGreaterThan(1)
    // Every sweep was announced first, for very nearly the full telegraph. The
    // wind-up is not a dodge window — there is nowhere to dodge to — it is the
    // half-second that says "kill it NOW", and a hit with no tell at all is a
    // tax rather than a fight.
    const minFrames = Math.floor((ELITE_TELEGRAPH * 1000 / STEP_MS) * 0.8)
    for (const [i, frames] of windUps.entries()) {
      expect(frames, `sweep ${i + 1} landed with only ${frames} frames of warning`)
        .toBeGreaterThanOrEqual(minFrames)
    }
    // It is swung from the elite's own feet, across the road, and reaches the
    // distance it is drawn at — the renderer paints `reach`, so a `reach` that
    // disagreed with the kill would be a lie the player only finds by dying.
    for (const s of sweeps) {
      if (s.kind !== 'eliteSweep') continue
      expect(Math.abs(s.x)).toBeLessThanOrEqual(LANE_HALF)
      expect(s.reach).toBe(ELITE_SWEEP_REACH)
      expect(Math.abs(s.dir)).toBe(1)
    }
    // The arc alternates. A stomp repeated in place reads as one animation
    // stuttering; a sweep has to come from somewhere, and then the other side.
    const dirs = sweeps.map((s) => (s.kind === 'eliteSweep' ? s.dir : 0))
    for (let i = 1; i < dirs.length; i++) {
      expect(dirs[i], 'two sweeps in a row swung the same way').toBe(-dirs[i - 1]!)
    }

    // The toll itself: a fifth of the squad that was standing there, every
    // time. Measured per sweep rather than in total, because the whole point of
    // a share is that it keeps meaning the same thing as the crowd shrinks.
    expect(tolls.length).toBeGreaterThan(1)
    for (const [i, t] of tolls.entries()) {
      const want = Math.ceil(t.before * ELITE_SWEEP_FRACTION)
      // A floor, not equality: the elite BITES as well as sweeps, and a frame
      // that carries both is a frame the crowd pays twice in.
      expect(t.lost, `sweep ${i + 1} took ${t.lost} of ${t.before}, wanted ~${want}`)
        .toBeGreaterThanOrEqual(want)
      expect(t.lost).toBeLessThanOrEqual(want + Math.ceil(t.before * 0.1) + 2)
    }
  })

  it('cannot be stepped out of — the arc spans the road', async () => {
    // The rule that separates it from the boss: the boss aims at a patch of
    // ground and is beaten by moving, this crosses the lane and is beaten by
    // damage. If a rail were ever safe, the fight would silently become a
    // stand-and-wait, which is exactly what the sweep replaced.
    const game = await importGame()
    game.startStage(4)
    game.debugAddUnits(200)
    drainFx()
    expect(reachElite(game), 'never met an elite').toBe(true)
    const live = game.getFoes().find((f) => f.elite)!

    // Pin the crowd to the far rail and the elite to the other one: the widest
    // separation the road allows.
    live.x = LANE_HALF - 0.4
    live.sweepCd = live.sweepSpan
    drainFx()
    let lost = 0
    let sweeps = 0
    for (let i = 0; i < 600; i++) {
      live.hp = 1e9
      live.maxHp = 1e9
      live.hold = ELITE_HOLD_MAX
      live.x = LANE_HALF - 0.4
      game.steerTo(-LANE_HALF)
      const was = game.squadCount.value
      game.step(STEP_MS)
      if (drainFx().some((e) => e.kind === 'eliteSweep')) {
        sweeps++
        lost += was - game.squadCount.value
      }
      if (sweeps >= 2) break
      if (settled(game)) break
    }
    expect(sweeps, 'the elite never swept').toBeGreaterThan(0)
    expect(lost, 'hugging the far rail cost the crowd nothing').toBeGreaterThan(0)
  })

  it('is given clear road to be fought on', async () => {
    // The generator's half of the same fix. Clearance is asymmetric: an
    // obstacle AHEAD of an elite costs the player nothing, one BEHIND it eats
    // the approach they need to open the fight in.
    for (let stage = 2; stage <= 24; stage++) {
      const track = buildTrack(stage)
      const blockers = track.events.filter(
        (e) => e.kind === 'gates' || e.kind === 'barricade'
      )
      for (const e of track.events) {
        if (e.kind !== 'miniboss') continue
        for (const b of blockers) {
          const lead = e.y - b.y
          if (lead < 0) continue
          expect(lead, `stage ${stage}: elite at ${e.y} has only ${lead} of road behind it`)
            .toBeGreaterThanOrEqual(11.9)
        }
      }
    }
  })
})

describe('the coin magnet is bought, not given', () => {
  it('starts too short to sweep the lane', async () => {
    // The bug: a flat reach of ~3.6 on a 9-wide lane collected every coin on
    // the stage from anywhere on it, which made the generator's curved trails
    // decoration. Whatever else changes, an unupgraded magnet must not span the
    // road.
    expect(COIN_MAGNET_BASE).toBeLessThan(LANE_HALF / 4)
  })

  it('leaves coins on the road for a player who does not drive over them',
    async () => {
      const game = await importGame()
      const collectedFrom = (aim: (i: number) => number): number => {
        game.startStage(2)
        // Enough bodies and damage that the run finishes either way — this
        // measures the haul, not survival.
        game.debugAddUnits(150)
        game.debugAddDamage(40)
        for (let i = 0; i < 6000; i++) {
          game.steerTo(aim(i))
          game.step(STEP_MS)
          if (settled(game)) break
        }
        return game.runCoins.value
      }

      // A player who sweeps the whole lane versus one who pins themselves to a
      // rail. If the magnet were lane-wide these would be identical, because
      // every coin would arrive regardless of where the crowd ran — which is
      // exactly what shipped first and exactly what made the trails scenery.
      const sweeping = collectedFrom((i) => Math.sin(i / 45) * LANE_HALF)
      const pinned = collectedFrom(() => -LANE_HALF)
      expect(sweeping, 'nothing was collected at all').toBeGreaterThan(0)
      expect(sweeping, 'hugging one rail collected as much as working the lane')
        .toBeGreaterThan(pinned)
    })

  it('grows with the Scavenging track', async () => {
    const { coinMagnetBonus, applyUpgrade } = await import('@/use/useUpgrades')
    const { addCoins } = (await import('@/use/useTowerEconomy')).default()
    expect(coinMagnetBonus.value).toBe(0)
    addCoins(100000)
    applyUpgrade('scavenge')
    expect(coinMagnetBonus.value, 'buying Scavenging bought no reach')
      .toBeGreaterThan(0)
  })
})

describe('a shot-down barricade pays', () => {
  it('drops loose coins where it broke', async () => {
    const game = await importGame()
    game.startStage(2)
    game.debugAddUnits(120)
    game.debugAddDamage(60)

    let broke = 0
    let dropped = 0
    for (let i = 0; i < 4000; i++) {
      const wall = game.getBarricades().find((b) => !b.dead)
      if (wall) game.steerTo(wall.x)
      const before = game.getBarricades().filter((b) => !b.dead).length
      const coinsBefore = game.getPickups().length
      game.step(STEP_MS)
      const after = game.getBarricades().filter((b) => !b.dead).length
      if (after < before) {
        broke += before - after
        dropped += game.getPickups().length - coinsBefore
      }
      if (settled(game)) break
    }

    expect(broke, 'no barricade was ever shot down').toBeGreaterThan(0)
    // Between the floor and the ceiling, per block. A wall used to be pure cost
    // — real DPS to remove and nothing paid back — so the correct play was
    // always to drive around it.
    expect(dropped).toBeGreaterThanOrEqual(broke * BARRICADE_COIN_MIN)
    expect(dropped).toBeLessThanOrEqual(broke * BARRICADE_COIN_MAX)
  })

  it('keeps the drop inside the lane', async () => {
    const game = await importGame()
    game.startStage(2)
    game.debugAddUnits(120)
    game.debugAddDamage(60)
    for (let i = 0; i < 4000; i++) {
      const wall = game.getBarricades().find((b) => !b.dead)
      if (wall) game.steerTo(wall.x)
      game.step(STEP_MS)
      for (const p of game.getPickups()) {
        expect(Math.abs(p.x), 'a coin landed off the road').toBeLessThanOrEqual(LANE_HALF)
      }
      if (settled(game)) break
    }
  })
})
