import { beforeEach, describe, expect, it } from 'vitest'
import {
  BARRICADE_COIN_MAX, BARRICADE_COIN_MIN, COIN_MAGNET_BASE,
  ELITE_HOLD_AHEAD, ELITE_HOLD_MAX, ELITE_SWEEP_FRACTION, ELITE_SWEEP_REACH,
  ELITE_TELEGRAPH, LANE_HALF, ROCK_H, UNIT_R
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
      // Asserted on ONE coin at a known position rather than on a whole run's
      // income, and that is a deliberate rewrite. The old version raced two
      // runs — one sweeping the lane, one pinned to a rail — and compared their
      // totals, which worked only while placed trails were the entire economy.
      // They are not any more: monsters drop coins where they die (see
      // `FOE_COIN_DROP_PER_BOUNTY`) and monsters home in on the crowd, so both
      // runs now bank a pile from wherever they happened to be fighting and the
      // trail signal drowns in it. This asks the question the name asks.
      const game = await importGame()
      game.startStage(2)
      game.debugAddUnits(40)
      game.step(STEP_MS)

      const drop = (x: number): { value: number; taken: boolean } => {
        const p = { id: -1, x, y: game.anchor().y + 3, value: 7, taken: false, phase: 0 }
        game.getPickups().push(p)
        return p
      }

      // Across the lane from the crowd: an unupgraded magnet must not reach it.
      const far = drop(LANE_HALF - 0.5)
      const coinsBefore = game.runCoins.value
      for (let i = 0; i < 90; i++) {
        game.steerTo(-LANE_HALF)
        game.step(STEP_MS)
      }
      expect(far.taken, 'the magnet swept a coin from across the lane').toBe(false)
      expect(game.runCoins.value, 'a coin nobody drove over still paid')
        .toBe(coinsBefore)

      // …and the same coin, driven over, is collected. Without this half the
      // test above passes just as well on a magnet that is broken outright.
      const near = drop(game.anchor().x)
      for (let i = 0; i < 90; i++) {
        game.steerTo(near.x)
        game.step(STEP_MS)
        if (near.taken) break
      }
      expect(near.taken, 'a coin driven straight over was not collected').toBe(true)
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

describe('a passage rib divides the crowd instead of eating it', () => {
  // The rib (see `passage()` in the track) is the one solid on the road the
  // crowd is expected to MEET rather than route around: it runs down the centre
  // line the player is already on, and its whole job is to make them pick a
  // corridor before the doors arrive.
  //
  // Billed the way every other solid is — a dozen separate boulders, each of
  // them killing whatever touches it — that job came out as an execution. A
  // 200-strong crowd that entered the mouth on the centre line went to ZERO in
  // a quarter of a second, because the spring dragged every survivor it shoved
  // clear straight into the next stone in the line. So the rib is now one
  // object that bills once: the corridor holding more survivors keeps all of
  // them, the other loses all of its, and half is the WORST case.
  it('cuts a centre-line crowd rather than wiping it, and lets the bigger side run on', async () => {
    const game = await importGame()
    // Stage 8: past `PASSAGE_STAGE`, and far enough in that the generator has
    // printed a rib well before the arena.
    game.startStage(8)
    game.debugAddUnits(200)

    // Everything else the road can bill for is cleared out of the way, so what
    // the assertions below measure is the RIB and nothing else. Scattered rocks
    // and barricades share the `barricade` death cause, which is the whole
    // reason they have to GO rather than just be ignored.
    const isolate = (): void => {
      const rs = game.getRocks()
      for (let k = rs.length - 1; k >= 0; k--) if (!rs[k]!.passage) rs.splice(k, 1)
      game.getBarricades().length = 0
      for (const f of game.getFoes()) f.dead = true
    }

    let before = 0
    let after = -1
    let billed = 0

    for (let i = 0; i < 4000; i++) {
      // Straight down the middle — the line the rib exists to charge for.
      game.steerTo(0)
      isolate()
      const squad = game.squadCount.value
      const deaths = game.deathBreakdown().barricade
      game.step(STEP_MS)
      // The frame the rib billed. Measured HERE rather than either side of the
      // corridor so the numbers are the cut itself, exactly.
      const took = game.deathBreakdown().barricade - deaths
      if (took > 0) {
        before = squad
        after = game.squadCount.value
        billed = took
        break
      }
      if (settled(game)) break
    }

    expect(before, 'stage 8 never printed a passage the crowd ran into')
      .toBeGreaterThan(50)
    // The regression itself: the rib used to leave nothing at all.
    expect(after, 'the rib wiped the crowd').toBeGreaterThan(0)
    // It is a divider, so it did take a side…
    expect(billed, 'the rib billed nothing at all').toBeGreaterThan(0)
    // …and only the smaller one: whatever the crowd was split into, the side
    // that runs on is the bigger half of it.
    expect(after).toBeGreaterThanOrEqual(billed)
    expect(after + billed).toBe(before)

    // One cut, not a dozen. The rib is a dozen boulders in the world and the
    // whole failure was billing them one at a time, so the rest of the corridor
    // has to cost nothing at all — including the frames where the spring is
    // dragging the survivors back into the stone.
    const settledDeaths = game.deathBreakdown().barricade
    for (let i = 0; i < 600; i++) {
      game.steerTo(0)
      isolate()
      game.step(STEP_MS)
      if (!game.getRocks().some((r) => r.passage)) break
      if (settled(game)) break
    }
    expect(game.deathBreakdown().barricade, 'the rib went on billing down the corridor')
      .toBe(settledDeaths)
  })

  it('costs nothing at all to a crowd that committed to a corridor', async () => {
    const game = await importGame()
    game.startStage(8)
    game.debugAddUnits(200)

    let met = false
    let billed = 0

    for (let i = 0; i < 4000; i++) {
      const rib = game.getRocks().find((r) => r.passage)
      // Hard over into one corridor the moment a rib is on the road — which is
      // the play the passage is teaching, and it has to be free.
      game.steerTo(rib ? rib.x + LANE_HALF / 2 : 0)
      const rs = game.getRocks()
      for (let k = rs.length - 1; k >= 0; k--) if (!rs[k]!.passage) rs.splice(k, 1)
      game.getBarricades().length = 0
      for (const f of game.getFoes()) f.dead = true

      const deathsBefore = game.deathBreakdown().barricade
      game.step(STEP_MS)
      if (rib) {
        met = true
        billed += game.deathBreakdown().barricade - deathsBefore
      }
      if (met && !game.getRocks().some((r) => r.passage)) break
      if (settled(game)) break
    }

    expect(met, 'stage 8 never printed a passage').toBe(true)
    expect(billed, 'a committed crowd was billed by the rib').toBe(0)
  })

  it('will not let the crowd be steered through the stone once it is inside', async () => {
    // ─── The bug this locks ───────────────────────────────────────────────
    //
    // The rib held the crowd with the impulse every other solid in the game
    // uses: a body inside a stone is pushed out to the side of that stone it is
    // CURRENTLY on. That is a barrier only while nothing moves far enough in
    // one frame to appear on the far side — and a hard swipe moves the anchor
    // about 0.7 of a unit per frame against a rib 1.2 wide. Measured, twenty-
    // five survivors changed corridors four frames after a swerve, and were
    // helpfully ejected into the one they had just been cut out of.
    //
    // A passage exists to make the player commit BEFORE the doors are in reach.
    // A wall that can be walked through the moment you are past its mouth costs
    // the player nothing and limits nothing.
    const game = await importGame()
    game.startStage(8)
    game.debugAddUnits(200)

    const ribsNow = () => game.getRocks().filter((r) => r.passage)
    const isolate = (): void => {
      const rs = game.getRocks()
      for (let k = rs.length - 1; k >= 0; k--) if (!rs[k]!.passage) rs.splice(k, 1)
      game.getBarricades().length = 0
      for (const f of game.getFoes()) f.dead = true
    }

    // Commit hard LEFT and walk in until the crowd is properly inside — the
    // rearmost stone behind it, so "past the entrance" is not in question.
    let inside = false
    for (let i = 0; i < 4000; i++) {
      const rib = ribsNow()[0]
      game.steerTo(rib ? rib.x - 2.4 : 0)
      isolate()
      game.step(STEP_MS)
      const rs = ribsNow()
      if (rs.length > 1 && Math.min(...rs.map((r) => r.y)) < game.anchor().y - 1) {
        inside = true
        break
      }
      if (settled(game)) break
    }
    expect(inside, 'the crowd never got inside a corridor on stage 8').toBe(true)

    // …then swerve the whole way across the lane, and keep swerving.
    let held = 0
    for (let i = 0; i < 300; i++) {
      const rs = ribsNow()
      if (rs.length === 0) break
      const wallLo = Math.min(...rs.map((r) => r.x - r.w / 2))
      // The span of road the rib actually walls. Outside it there is no wall and
      // crossing is not just legal, it is the point — the corridor has ended.
      const lo = Math.min(...rs.map((r) => r.y)) - ROCK_H / 2 - UNIT_R
      const hi = Math.max(...rs.map((r) => r.y)) + ROCK_H / 2 + UNIT_R

      game.steerTo(LANE_HALF)
      isolate()
      game.step(STEP_MS)

      for (const u of game.getUnits()) {
        if (u.dying > 0) continue
        if (u.y < lo || u.y > hi) continue
        expect(u.x, `a survivor walked through the rib at y=${u.y.toFixed(2)}`)
          .toBeLessThanOrEqual(wallLo)
      }
      held++
      if (settled(game)) break
    }

    // The steering really did fight the wall for a meaningful stretch of road,
    // rather than the rib quietly ending on the first frame.
    expect(held, 'the rib was gone before the swerve could test it')
      .toBeGreaterThan(30)
    expect(game.anchor().x, 'the crowd never actually tried to cross')
      .toBeGreaterThan(1)
  })
})
