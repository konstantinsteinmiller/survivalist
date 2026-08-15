import { beforeEach, describe, expect, it } from 'vitest'
import { drainFx, type FxEvent } from '@/use/useVfx'
import type { TrackEvent } from '@/game/track'

// ─── The crowd stays on the road, and the HUD never shows nonsense ───────────
//
// Two bugs that a player sees instantly and a type-checker never will:
//
//   1. survivors strolling straight through the rail and off the edge of the
//      lane, because the formation is a disc around an anchor that is allowed
//      to sit closer to the barrier than the disc's own radius;
//   2. `NaN` rendered into a HUD pill, which reads as a broken game even when
//      the simulation underneath is perfectly healthy.
//
// Both are now structurally impossible, and this file is what keeps them so.

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

/**
 * Pin `Math.random` for a test.
 *
 * The contact tests below depend on whether a monster survives long enough to
 * reach the crowd, which the generator and the spawn jitter decide — so on the
 * real RNG they are a coin flip that mostly lands right, which is the worst
 * kind of test. Same generator the balance harness uses (`seedRandom`).
 */
const withSeed = (seed: number): (() => void) => {
  const real = Math.random
  let a = seed >>> 0
  Math.random = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => { Math.random = real }
}

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

const advance = (game: Game, steps: number): void => {
  for (let i = 0; i < steps; i++) game.step(16)
}

describe('the crowd behaves like a swarm against the rail, not a ghost through it', () => {
  it('never lets a single survivor stand off the road, at any squad size', async () => {
    const game = await importGame()
    const { LANE_HALF, UNIT_R } = await import('@/game/survival')
    const edge = LANE_HALF - UNIT_R

    game.startStage(4)
    game.debugAddUnits(320)

    // Slam the thumb into each rail in turn and hold it there. This is the
    // exact input that used to push half the formation over the edge.
    for (const side of [1, -1]) {
      game.steerTo(side * LANE_HALF * 2) // deliberately past the clamp
      advance(game, 240)
      for (const u of game.getUnits()) {
        expect(Math.abs(u.x), `a survivor stood at x=${u.x.toFixed(2)}`)
          .toBeLessThanOrEqual(edge + 1e-6)
      }
    }
  })

  it('lengthens along the lane instead of stacking on the barrier', async () => {
    const game = await importGame()
    const { LANE_HALF } = await import('@/game/survival')

    const depthOf = (steerX: number): number => {
      game.startStage(4)
      game.debugAddUnits(260)
      game.steerTo(steerX)
      advance(game, 240)
      const alive = game.getUnits().filter((u) => u.dying <= 0)
      const ys = alive.map((u) => u.y)
      return Math.max(...ys) - Math.min(...ys)
    }

    const centred = depthOf(0)
    const pinned = depthOf(LANE_HALF * 2)

    // A crowd with nowhere left to go sideways spreads down the road. Without
    // the redistribution it would simply pile into a hard vertical line ON the
    // rail, which is the same visual bug wearing a different hat.
    expect(pinned).toBeGreaterThan(centred * 1.15)
  })

  it('parts around a miniboss instead of walking through it', async () => {
    const game = await importGame()
    const { FOE_BODY_HALF_H, FOE_BODY_HALF_W, GATE_LEAF_X, UNIT_R } = await import('@/game/survival')

    // The reported bug: a squad that FAILS to kill the elite watches it break
    // off after `ELITE_HOLD_MAX` and walk back down the road straight through
    // them, survivors crossing the sprite and coming out the far side. Every
    // other solid thing on the road already parts the crowd; the elite was the
    // exception because foes are handled by the bite loop, not the obstacle one.
    //
    // Deliberately UNDER-GUNNED, and that is the whole setup: while the elite is
    // holding, `stopAt = f.y - ELITE_HOLD_AHEAD` keeps the crowd a clear 1.3
    // units short of the body, so a squad that wins the fight never touches it
    // and proves nothing. Stage 14 against forty survivors with no upgrades is a
    // fight the crowd loses — the leash expires, the elite breaks off, and it
    // walks back down the road through the middle of them. (Measured: a
    // 400-strong squad on stage 6 kills it in 7.5 s and never gets closer than
    // 1.30.) Steered down a door lane rather than dead centre — the elite homes
    // on the anchor either way, so it still ends up inside the formation, but
    // the centre line is where a passage rib stands and driving into stone
    // would end the run long before the leash ever expired.
    game.startStage(14)
    game.debugAddUnits(40)
    game.steerTo(GATE_LEAF_X)

    let sawElite = false
    let sawInBand = false
    let sawItPass = false

    for (let i = 0; i < 2600; i++) {
      game.step(16)
      const elite = game.getFoes().find((f) => f.elite && !f.dead)
      if (!elite) continue
      sawElite = true
      if (elite.y < game.anchor().y) sawItPass = true

      const halfW = elite.scale * FOE_BODY_HALF_W
      const halfH = elite.scale * FOE_BODY_HALF_H
      for (const u of game.getUnits()) {
        if (u.dying > 0) continue
        // Only the survivors level with the body can be inside it at all.
        if (Math.abs(u.y - elite.y) > halfH + UNIT_R) continue
        sawInBand = true
        expect(
          Math.abs(u.x - elite.x),
          `frame ${i}: a survivor stood inside the miniboss at x=${u.x.toFixed(2)} ` +
          `against a body at ${elite.x.toFixed(2)} ±${halfW.toFixed(2)}`
        ).toBeGreaterThanOrEqual(halfW + UNIT_R - 1e-6)
      }
    }

    expect(sawElite, 'no elite ever spawned — the test proved nothing').toBe(true)
    expect(sawInBand, 'no survivor ever stood level with the body').toBe(true)
    // NOTE: a monster displaces and does not kill on contact. That asymmetry is
    // measured, not aesthetic — see `partAround`. A wall stands still, so a
    // lethal wall is a question about the line you took; a monster homes on the
    // crowd, so a lethal monster is an undodgeable half of the squad.
    // …and the case that was actually reported: the crowd out-lived the hold and
    // the elite walked back through them.
    expect(sawItPass, 'the elite never broke off and walked past').toBe(true)
  })
})

describe('the HUD can never be handed a number it cannot render', () => {
  it('keeps the run fire rate finite and in band whatever it is fed', async () => {
    const game = await importGame()
    const { MAX_FIRE_RATE, BASE_FIRE_RATE } = await import('@/game/survival')

    game.startStage(1)
    expect(game.runFireRate.value).toBe(BASE_FIRE_RATE)

    game.debugAddFireRate(Number.NaN)
    expect(Number.isFinite(game.runFireRate.value)).toBe(true)

    game.debugAddFireRate(Number.POSITIVE_INFINITY)
    expect(game.runFireRate.value).toBe(MAX_FIRE_RATE)

    game.debugAddFireRate(-999)
    expect(game.runFireRate.value).toBeGreaterThan(0)
  })

  it('starts every stage at the meta rate, never at whatever the last run ended on', async () => {
    const game = await importGame()
    const { BASE_FIRE_RATE } = await import('@/game/survival')

    game.startStage(1)
    game.debugAddFireRate(3)
    expect(game.runFireRate.value).toBeGreaterThan(BASE_FIRE_RATE)

    game.startStage(2)
    expect(game.runFireRate.value).toBe(BASE_FIRE_RATE)
  })
})

// ─── Solid means solid ───────────────────────────────────────────────────────
//
// Three contact rules, and the whole road is built on the difference between
// them:
//
//   • a WALL or a BOULDER takes everyone who touches it, that frame, and the
//     rest of the swarm streams past on both sides;
//   • a PILLAR or an unbroken CRATE grinds at a per-second rate and shoves the
//     rest clear — both are things the player is aiming AT, not around;
//   • a MONSTER takes half of what runs squarely into it, then leaves the
//     survivors alone for ten frames.
//
// Contact used to be the middle rule for everything, so a crowd driven into a
// boulder wrapped around the rock and kept going with nearly all of it. These
// are what stop that coming back.

describe('a wall kills what runs into it and nothing else', () => {
  /** Drive `n` survivors dead-centre into the first boulder rank of a stage. */
  const chargeFirstRock = async (stage: number, n: number) => {
    const game = await importGame()
    const { buildTrack } = await import('@/game/track')
    const { ROCK_H, UNIT_R } = await import('@/game/survival')
    const rank = buildTrack(stage).events.find((e) => e.kind === 'rocks')
    if (!rank || rank.kind !== 'rocks') return null

    game.startStage(stage)
    game.debugAddUnits(n)
    // A boulder cannot be shot, so aiming at one is a pure contact test — no
    // "did the crowd break it first" branch to reason about.
    const block = rank.blocks[Math.floor(rank.blocks.length / 2)]!
    let squadAtContact = 0
    let insideEver = 0

    for (let i = 0; i < 3000; i++) {
      game.steerTo(block.x)
      game.step(16)
      const gap = rank.y - game.anchor().y
      if (squadAtContact === 0 && gap < 2.5) squadAtContact = game.squadCount.value
      // Nobody may ever be standing INSIDE the stone — tested against the
      // simulation's own contact box, not a rounder one, or the assertion is
      // about a shape the game never used.
      for (const r of game.getRocks()) {
        for (const u of game.getUnits()) {
          if (u.dying > 0) continue
          if (Math.abs(u.y - r.y) > ROCK_H / 2 + UNIT_R) continue
          if (Math.abs(u.x - r.x) < r.w / 2 + UNIT_R - 1e-6) insideEver++
        }
      }
      if (gap < -5 || game.phase.value !== 'run') break
    }
    return { game, squadAtContact, insideEver }
  }

  it('deletes the column that drove into a boulder', async () => {
    const restore = withSeed(20260814)
    try {
      const r = await chargeFirstRock(12, 200)
      expect(r, 'stage 12 generated no boulders').not.toBeNull()
      const { game, squadAtContact } = r!
      // The old grind billed a per-second trickle and pushed the rest around
      // the rock: a crowd this size walked away with nearly all of it. A column
      // of the crowd is now simply gone.
      const lost = game.deathBreakdown().barricade
      expect(squadAtContact, 'never reached the boulders').toBeGreaterThan(20)
      expect(lost / squadAtContact, `only ${lost} of ${squadAtContact} died on the stone`)
        .toBeGreaterThan(0.25)
    } finally { restore() }
  })

  it('never leaves a survivor standing inside the stone', async () => {
    const restore = withSeed(20260814)
    try {
      const r = await chargeFirstRock(12, 200)
      expect(r!.insideEver, 'survivors were standing inside a boulder').toBe(0)
    } finally { restore() }
  })

  it('costs the line you ran, not the seconds you spent', async () => {
    const restore = withSeed(20260814)
    try {
      const game = await importGame()
      const { buildTrack } = await import('@/game/track')
      const { LANE_HALF, UNIT_R } = await import('@/game/survival')
      const rank = buildTrack(12).events.find((e) => e.kind === 'rocks')!
      if (rank.kind !== 'rocks') throw new Error('no rocks')

      // The point of a guillotine over a rate: the bill is the share of the
      // crowd you put in the stone, not how long you spent beside it. The old
      // model saturated at 8 % overlap, so clipping an edge cost nearly as much
      // as driving the middle of the crowd through — exactly backwards.
      const strips = rank.blocks
        .map((b) => [b.x - b.w / 2 - UNIT_R, b.x + b.w / 2 + UNIT_R] as const)
        .sort((a, b) => a[0] - b[0])
      let cur = -LANE_HALF
      let gapMid = 0
      let widest = 0
      for (const [lo, hi] of strips) {
        if (lo - cur > widest) { widest = lo - cur; gapMid = (cur + lo) / 2 }
        cur = Math.max(cur, hi)
      }
      if (LANE_HALF - cur > widest) { widest = LANE_HALF - cur; gapMid = (cur + LANE_HALF) / 2 }

      const cost = (aimX: number): number => {
        game.startStage(12)
        game.debugAddUnits(200)
        for (let i = 0; i < 3000; i++) {
          game.steerTo(aimX)
          game.step(16)
          if (rank.y - game.anchor().y < -5 || game.phase.value !== 'run') break
        }
        return game.deathBreakdown().barricade
      }

      const plough = cost(rank.blocks[Math.floor(rank.blocks.length / 2)]!.x)
      const threaded = cost(gapMid)
      expect(plough, 'driving the crowd into a boulder cost nothing').toBeGreaterThan(10)
      expect(
        threaded,
        `threading the ${widest.toFixed(1)}-wide gap cost ${threaded}, a plough cost ${plough}`
      ).toBeLessThan(plough * 0.6)
    } finally { restore() }
  })
})

// ─── Running into a monster ──────────────────────────────────────────────────
//
// Both bounds on the collision matter and they bound different things. The
// i-frames are per SURVIVOR — a body pays once, so a pack standing shoulder to
// shoulder cannot bill it six times in one instant. The cooldown is per
// MONSTER — it collects once per pass, so one creep walking through the crowd's
// whole depth takes a rank rather than a column.
describe('a monster knocks a rank down, not a column', () => {
  /**
   * Walk an UNDER-GUNNED crowd onto the first monster it meets.
   *
   * Under-gunned is the only way to reach the rule at all: measured, a
   * 300-strong squad on stage 5 never gets within 5.6 units of a monster,
   * because it shoots the whole pack down first. Thirty survivors on stage 10
   * meet them body to body.
   */
  const foeAhead = async (stage: number, squad: number) => {
    const game = await importGame()
    game.startStage(stage)
    game.debugAddUnits(squad)
    for (let i = 0; i < 4000; i++) {
      const f = game.getFoes().filter((x) => !x.dead && !x.elite).sort((a, b) => a.y - b.y)[0]
      if (f) game.steerTo(f.x)
      game.step(16)
      const near = game.getFoes().find((x) => !x.dead && !x.elite && x.y - game.anchor().y < 1)
      if (near) return { game, foe: near }
      if (game.phase.value !== 'run') break
    }
    return null
  }

  it('never lets one monster take more than a rank in a single pass', async () => {
    const restore = withSeed(20260814)
    try {
      const r = await foeAhead(10, 30)
      expect(r, 'never met a monster').not.toBeNull()
      const { game } = r!
      const before = game.squadCount.value
      const start = game.deathBreakdown().foe
      // Half a second: less than one collision cooldown, so whatever dies here
      // is ONE knock-down plus whatever the bite took.
      for (let i = 0; i < 30; i++) game.step(16)
      const lost = game.deathBreakdown().foe - start
      // Before the cooldown existed, a monster sweeping the crowd's depth
      // billed a fresh unprotected rank on every one of those thirty frames.
      expect(lost, `one monster took ${lost} of ${before} in half a second`)
        .toBeLessThan(before * 0.35)
    } finally { restore() }
  })

  it('gives the survivors of a collision real invincibility frames', async () => {
    const restore = withSeed(20260814)
    try {
      const game = await importGame()
      const { FOE_COLLIDE_IFRAMES_MS } = await import('@/game/survival')
      game.startStage(10)
      game.debugAddUnits(30)

      let sawInv = false
      for (let i = 0; i < 4000; i++) {
        const f = game.getFoes().filter((x) => !x.dead).sort((a, b) => a.y - b.y)[0]
        if (f) game.steerTo(f.x)
        game.step(16)
        for (const u of game.getUnits()) {
          if (u.dying > 0 || u.inv <= 0) continue
          sawInv = true
          // Never longer than the grant — a timer that only ever counts up is
          // the failure mode that turns i-frames into permanent immunity.
          expect(u.inv).toBeLessThanOrEqual(FOE_COLLIDE_IFRAMES_MS + 1e-6)
        }
        if (game.phase.value !== 'run') break
      }
      expect(sawInv, 'no survivor ever came out of a collision alive').toBe(true)
    } finally { restore() }
  })

  it('never lets a survivor rest on a monster, immune or not', async () => {
    const restore = withSeed(20260814)
    try {
      const game = await importGame()
      const { FOE_BODY_HALF_H, FOE_BODY_HALF_W } = await import('@/game/survival')
      game.startStage(10)
      game.debugAddUnits(30)

      // An immune body is still SOLID: it is shoved clear like everyone else,
      // it simply cannot be charged for the same contact twice. If immunity
      // also turned off the push, survivors would stand inside the sprite for
      // ten frames — the exact bug the body was made solid to fix.
      //
      // Measured against the monster's FOOTPRINT, with no `UNIT_R` folded in:
      // the contact box adds a survivor's own radius on top, so a body just
      // inside THAT is touching the monster rather than overlapping it, and the
      // push only ejects by the overlap — at the boundary that is a nudge of a
      // few centimetres against a spring pulling the other way.
      //
      // And "never RESTS on" rather than "never is on": foes are pushed one at
      // a time, so a survivor ejected from one can land inside another already
      // handled this frame, which resolves on the next tick.
      const stuck = new Map<object, number>()
      let worst = 0
      for (let i = 0; i < 3000; i++) {
        const f = game.getFoes().filter((x) => !x.dead).sort((a, b) => a.y - b.y)[0]
        if (f) game.steerTo(f.x)
        game.step(16)
        for (const u of game.getUnits()) {
          if (u.dying > 0) continue
          const inside = game.getFoes().some((foe) =>
            !foe.dead &&
            Math.abs(u.y - foe.y) < foe.scale * FOE_BODY_HALF_H &&
            Math.abs(u.x - foe.x) < foe.scale * FOE_BODY_HALF_W)
          const run = inside ? (stuck.get(u) ?? 0) + 1 : 0
          stuck.set(u, run)
          if (run > worst) worst = run
        }
        if (game.phase.value !== 'run') break
      }
      // Six frames is a tenth of a second, and the bound is measured rather
      // than chosen: with the bounding-disc prefilter still using the
      // formation's NOMINAL radius, a survivor stood on a monster for 18 frames
      // straight; tracking the crowd's real reach took that to 9; measuring
      // against the footprint instead of the contact box leaves 0–3, which is
      // the eject-into-a-neighbour transient and nothing else.
      expect(worst, `a survivor stayed inside a monster for ${worst} frames`)
        .toBeLessThanOrEqual(6)
    } finally { restore() }
  })
})

// ─── Passages ────────────────────────────────────────────────────────────────
//
// A rib of unbreakable stone growing back down the road out of a bank's pillar,
// so the crowd has to pick its door BEFORE it arrives at one. Both offers stay
// in plain sight the whole way in — that is the split second being sold — but
// once the crowd is in a corridor the other door is behind a wall.
describe('a passage takes the choice away before the bank, not at it', () => {
  const ribs = (t: { events: readonly TrackEvent[] }) =>
    t.events.filter((e): e is Extract<TrackEvent, { kind: 'rocks' }> =>
      e.kind === 'rocks' && e.passage === true)

  it('walls roughly every third or fourth bank, and never before stage 6', async () => {
    const { buildTrack, PASSAGE_EVERY_MAX, PASSAGE_EVERY_MIN, PASSAGE_STAGE } =
      await import('@/game/track')

    for (let stage = 1; stage < PASSAGE_STAGE; stage++) {
      expect(ribs(buildTrack(stage)).length, `stage ${stage} printed a passage too early`).toBe(0)
    }

    // Counted over a long sweep rather than one stage: the cadence is rolled
    // per passage so the player cannot count bars, and a single stage is too
    // small a sample to say anything about a 3-or-4 die.
    let banks = 0
    let passages = 0
    for (let stage = PASSAGE_STAGE; stage <= 40; stage++) {
      const t = buildTrack(stage)
      banks += t.events.filter((e) => e.kind === 'gates').length
      // Rib rows are many per passage; a passage is a contiguous run of them.
      const ys = ribs(t).map((e) => e.y).sort((a, b) => a - b)
      passages += ys.filter((y, i) => i === 0 || y - (ys[i - 1] ?? 0) > 2).length
    }
    const per = banks / passages
    expect(per, `one passage every ${per.toFixed(1)} banks`).toBeGreaterThanOrEqual(PASSAGE_EVERY_MIN - 0.6)
    expect(per, `one passage every ${per.toFixed(1)} banks`).toBeLessThanOrEqual(PASSAGE_EVERY_MAX + 1.4)
  })

  it('walls the approach to a bank and stops short of the doorway', async () => {
    const { buildTrack } = await import('@/game/track')
    for (const stage of [6, 9, 14, 22, 40]) {
      const t = buildTrack(stage)
      const banks = t.events.filter((e) => e.kind === 'gates').map((e) => e.y)
      for (const r of ribs(t)) {
        // Every rib row belongs to a bank AHEAD of it, close enough to be read
        // as its corridor rather than as loose stone.
        const bank = banks.filter((y) => y > r.y).sort((a, b) => a - b)[0]
        expect(bank, `a rib at ${r.y} on stage ${stage} leads to no bank`).toBeDefined()
        expect(bank! - r.y, `a rib on stage ${stage} is ${(bank! - r.y).toFixed(1)} from its bank`)
          .toBeLessThan(12)
        // …and never flush against the plate, which would eat the crowd on its
        // way through the door it just committed to.
        expect(bank! - r.y).toBeGreaterThan(0.4)
      }
    }
  })

  it('only ever splits a two-door bank', async () => {
    const { buildTrack } = await import('@/game/track')
    // Three doors means two pillars, and a rib on each would leave a centre
    // corridor 1.2 units wide against a crowd 3.3 across — a door nobody can
    // take is not a choice, it is a wall with a number painted on it.
    for (const stage of [6, 8, 11, 17, 26, 33]) {
      const t = buildTrack(stage)
      for (const r of ribs(t)) {
        const bank = t.events
          .filter((e): e is Extract<TrackEvent, { kind: 'gates' }> => e.kind === 'gates' && e.y > r.y)
          .sort((a, b) => a.y - b.y)[0]
        expect(bank!.leaves.length, `stage ${stage} walled a ${bank!.leaves.length}-door bank`).toBe(2)
      }
    }
  })

  it('leaves a corridor the crowd can actually hold a line down', async () => {
    const game = await importGame()
    const { buildTrack } = await import('@/game/track')
    const { GATE_LEAF_X } = await import('@/game/survival')
    const restore = withSeed(20260815)
    try {
      // Drive a full-size crowd down one corridor and out the far door. The
      // rib is lethal, so "the crowd fits" is not a matter of taste: without
      // the funnel squeezing it to fit, this bleeds the whole flank.
      const t = buildTrack(9)
      const rib = t.events.find((e) => e.kind === 'rocks' && e.passage === true)
      expect(rib, 'stage 9 printed no passage').toBeDefined()

      game.startStage(9)
      game.debugAddUnits(300)
      const before = game.squadCount.value
      for (let i = 0; i < 4000; i++) {
        game.steerTo(GATE_LEAF_X)
        game.step(16)
        if (game.anchor().y > rib!.y + 4 || game.phase.value !== 'run') break
      }
      const lost = game.deathBreakdown().barricade
      expect(lost / before, `the corridor cost ${lost} of ${before}`).toBeLessThan(0.25)
    } finally { restore() }
  })
})

describe('a passage squeezes the crowd and gives it back', () => {
  it('narrows into the corridor and spills out the far side', async () => {
    const game = await importGame()
    const { buildTrack } = await import('@/game/track')
    const { CROWD_MAX_R, GATE_LEAF_X } = await import('@/game/survival')
    const restore = withSeed(20260815)
    try {
      const rib = buildTrack(9).events.find((e) => e.kind === 'rocks' && e.passage === true)!
      game.startStage(9)
      game.debugAddUnits(300)

      let inside = CROWD_MAX_R
      let after = 0
      let past = -1
      for (let i = 0; i < 4000; i++) {
        game.steerTo(GATE_LEAF_X)
        game.step(16)
        const gap = rib.y - game.anchor().y
        if (gap < 3 && gap > -1) inside = Math.min(inside, game.crowdRadius())
        // The funnel eases OUT more slowly than it eases in — spilling back
        // slowly is what makes the far side of a squeeze feel like relief — so
        // the crowd has to be given those frames before it is measured, or the
        // test reads the corridor's width twice and calls it a bug.
        if (gap < -4 && past < 0) past = i
        if (past >= 0 && i > past + 40) { after = game.crowdRadius(); break }
        if (game.phase.value !== 'run') break
      }
      expect(inside, `the crowd never squeezed (${inside.toFixed(2)})`)
        .toBeLessThan(CROWD_MAX_R - 0.2)
      // Only that it is WIDER, not by how much: the bank the corridor leads to
      // is a handful of units past the rib, so the crowd is already funnelling
      // for a door by the time it is measured. Demanding a full recovery here
      // would be asserting that the next beat does not exist.
      expect(after, `still ${after.toFixed(2)} wide well past the passage`)
        .toBeGreaterThan(inside)
    } finally { restore() }
  })
})

// ─── The boss's charged swing ────────────────────────────────────────────────
//
// The ordinary slam is a question about where you are standing, and a player
// who keeps moving answers it perfectly — measured, a perfect dodger takes 0 %
// of them. Every third swing is the one that does not accept that answer:
// double the arc, a much longer wind-up, and an aim that leads the crowd's
// drift instead of trailing it.
describe('every third boss swing is charged', () => {
  /**
   * A boss fight long enough to see the pattern.
   *
   * Stage 10 against 400 survivors, measured: fifteen swings, five of them
   * charged. A stage-6 fight with a big crowd is over in two — the boss dies
   * before the third swing exists, which says nothing about the third swing.
   */
  const fight = async (): Promise<Array<Extract<FxEvent, { kind: 'bossSlam' }>>> => {
    const game = await importGame()
    game.startStage(10)
    game.debugAddUnits(400)
    game.debugSkipToArena()
    drainFx()
    const slams: Array<Extract<FxEvent, { kind: 'bossSlam' }>> = []
    for (let i = 0; i < 12000; i++) {
      game.step(16)
      for (const e of drainFx()) if (e.kind === 'bossSlam') slams.push(e)
      if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
    }
    return slams
  }

  it('charges the third swing, and every third after it', async () => {
    const { CHARGED_EVERY } = await import('@/game/survival')
    const restore = withSeed(20260815)
    try {
      const slams = await fight()
      expect(slams.length, 'the fight was too short to show the pattern')
        .toBeGreaterThanOrEqual(CHARGED_EVERY * 2)
      for (const [i, s] of slams.entries()) {
        expect(s.charged, `swing ${i + 1} charged=${s.charged}`)
          .toBe((i + 1) % CHARGED_EVERY === 0)
      }
    } finally { restore() }
  })

  it('throws double the reach when it charges', async () => {
    const { slamRadiusFor } = await import('@/game/survival')
    const restore = withSeed(20260815)
    try {
      const slams = await fight()
      expect(slams.length).toBeGreaterThan(3)
      // Each swing against what an ORDINARY swing of the same number would have
      // been. Comparing a charged swing to the biggest plain one in the fight
      // measures rage instead: the plain radius grows every swing and finally
      // pins at `SLAM_RADIUS_MAX`, so a charged third swing against a capped
      // twelfth reads as 1.5× when the multiplier is exactly 2.
      for (const [i, s] of slams.entries()) {
        const n = i + 1
        expect(s.radius, `swing ${n} reached ${s.radius.toFixed(2)}`)
          .toBeCloseTo(slamRadiusFor(n, s.charged), 5)
        if (s.charged) {
          expect(s.radius / slamRadiusFor(n, false), `swing ${n} was not double`)
            .toBeCloseTo(2, 5)
        }
      }
    } finally { restore() }
  })

  it('winds up for as long as it was priced to', async () => {
    const game = await importGame()
    const { CHARGED_WINDUP_MUL } = await import('@/game/survival')
    const restore = withSeed(20260815)
    try {
      game.startStage(10)
      game.debugAddUnits(400)
      game.debugSkipToArena()

      // The wind-up is the fairness of the move: twice the ground covered has
      // to be readable for long enough that leaving it was a decision. Measured
      // as the cycle against its OWN span, because rage shortens every cadence
      // — comparing a late charged swing to an early plain one measures rage.
      let worst = 0
      for (let i = 0; i < 12000; i++) {
        game.step(16)
        const b = game.getBoss()
        if (!b || b.dead || !b.charging || b.slamSpan <= 0) continue
        worst = Math.max(worst, b.slamCd / b.slamSpan)
        if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
      }
      expect(worst, `charged wind-up was ${worst.toFixed(2)}× its own cadence`)
        .toBeGreaterThan(CHARGED_WINDUP_MUL * 0.98)
    } finally { restore() }
  })

  it('connects far more often than an ordinary swing', async () => {
    const game = await importGame()
    const restore = withSeed(20260815)
    try {
      // The whole point of the doubled arc: it converts a swing the player was
      // dodging into one that lands. Damage per landed hit is unchanged — the
      // share is capped either way — so "more threatening" has to show up as a
      // HIT RATE, and that is what this counts, against a crowd that is
      // constantly moving rather than a stationary target.
      game.startStage(10)
      game.debugAddUnits(400)
      game.debugSkipToArena()
      drainFx()

      let plain = 0
      let plainHit = 0
      let charged = 0
      let chargedHit = 0
      let deaths = game.deathBreakdown().slam
      for (let i = 0; i < 12000; i++) {
        // Keep moving, the way a player who has learned the ordinary slam does.
        game.steerTo(Math.sin(i / 40) * 3.2)
        game.step(16)
        const now = game.deathBreakdown().slam
        for (const e of drainFx()) {
          if (e.kind !== 'bossSlam') continue
          const landed = now > deaths
          if (e.charged) { charged++; if (landed) chargedHit++ }
          else { plain++; if (landed) plainHit++ }
        }
        deaths = now
        if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
      }
      expect(plain, 'no ordinary swings to compare against').toBeGreaterThan(2)
      expect(charged, 'no charged swings were thrown').toBeGreaterThan(1)
      expect(chargedHit / charged, `charged landed ${chargedHit}/${charged}`)
        .toBeGreaterThanOrEqual(plainHit / plain)
      expect(chargedHit / charged, `charged landed ${chargedHit}/${charged}`)
        .toBeGreaterThan(0.5)
    } finally { restore() }
  })
})
