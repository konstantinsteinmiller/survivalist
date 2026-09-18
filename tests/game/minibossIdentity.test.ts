import { describe, expect, it } from 'vitest'
import {
  CLAW_CORE_FRACTION, CLAW_DODGE_MARGIN, CLAW_FURROWS, CLAW_FURROW_HALF_W,
  CLAW_FURROW_HALF_W_MAX, CLAW_SPACING, MINIBOSS_DESIGN, MINIBOSS_POOL,
  MINIBOSS_POOL_LATE, MINIBOSS_TIER2_FROM_STAGE, THREAT_POOL_FROM_STAGE,
  clawCoreHalfW, clawFurrowHalfW, clawLaneXs, inClawFurrow,
  minibossDesignFor, minibossDesignsFor, minibossKindFor
} from '@/game/threats'
import { CROWD_MAX_R } from '@/game/survival'

/**
 * ─── The model is the tell ──────────────────────────────────────────────────
 *
 * A miniboss's body used to come from whichever archetype the track placed and
 * its attack from the stage cycle, independently — so the same Snaggletusk
 * cleaved on one road and lobbed bombs on the next, and nothing about an elite
 * could be read before its wind-up. Every other threat in this game is a pure
 * function of the stage precisely so a stage can be LEARNED rather than
 * re-rolled; these assertions carry that rule through to what the player sees.
 */
describe('one body per fight, permanently', () => {
  it('pairs the five the player was promised', () => {
    // Stated as literals rather than read back from the map: this is the
    // contract, and a test that reads the same constant the code does would
    // pass for any pairing at all.
    expect(minibossDesignFor('scythe')).toBe('snaggletusk')
    expect(minibossDesignFor('gunner')).toBe('thornwick')
    expect(minibossDesignFor('bomber')).toBe('cinderhound')
    expect(minibossDesignFor('warden')).toBe('bonecap')
    expect(minibossDesignFor('burrower')).toBe('skewer')
  })

  it('gives every kind in the pool a body, and never shares one', () => {
    // Read off the LATE pool, which is the set of every kind that exists — the
    // tier-one pool is a slice of it (`minibossPoolFor`), so asserting against
    // that one would stop covering a kind on the day one is added.
    const bodies = MINIBOSS_POOL_LATE.map(minibossDesignFor)
    for (const b of bodies) expect(typeof b === 'string' && b.length > 0).toBe(true)
    // Injective. A kind that reused an existing body would silently undo the
    // lesson for BOTH — the player would meet one silhouette that means two
    // different attacks, which is worse than the decoupling this replaced.
    expect(new Set(bodies).size).toBe(MINIBOSS_POOL_LATE.length)
    expect(Object.keys(MINIBOSS_DESIGN).sort()).toEqual([...MINIBOSS_POOL_LATE].sort())
    // …and the early pool is genuinely a subset, not a second list that has to
    // be kept in step by hand.
    for (const kind of MINIBOSS_POOL) expect(MINIBOSS_POOL_LATE).toContain(kind)
  })

  it('names only bodies the game can actually draw', async () => {
    const { MONSTERS } = await import('@/game/monsters')
    const known = new Set(MONSTERS.map((m) => m.id))
    for (const kind of MINIBOSS_POOL_LATE) {
      expect(known.has(minibossDesignFor(kind))).toBe(true)
    }
  })

  it('costs the late tier no new strips, because the roster already carries them', async () => {
    // THE reason `MINIBOSS_TIER2_FROM_STAGE` is 9 and not 4 — see its note. A
    // miniboss's body is its fight, so a new kind is a new sprite strip on the
    // road unless the stage's own roster was already going to bake it. Both late
    // bodies are roster designs by stage 5 (`bonecap` with the husks, `skewer`
    // with the flyers), so the tier is free to the loader.
    //
    // Asserted against `rosterDesigns` rather than against the stage number,
    // because that is the fact that actually has to hold: a re-body to something
    // exotic would put a fresh strip in front of a stage-9 player, and the only
    // symptom is a red fallback ellipse on a device slow enough to notice.
    const { rosterDesigns } = await import('@/game/foes')
    const roster = new Set(rosterDesigns(MINIBOSS_TIER2_FROM_STAGE))
    for (const kind of MINIBOSS_POOL_LATE) {
      if (MINIBOSS_POOL.includes(kind)) continue
      const body = minibossDesignFor(kind)
      expect(roster.has(body), `the late tier adds an unrostered ${body}`).toBe(true)
    }
  })

  it('bakes every body a stage can field, so none draws as the fallback ellipse', () => {
    // `stageDesigns` feeds the sprite baker, and a body missing from it draws as
    // the red ellipse until the per-frame slice baker catches up.
    for (const stage of [1, 2, 3, 4, 6, 9, 20]) {
      const baked = new Set(minibossDesignsFor(stage))
      // Every kind this stage could hand its 0..5th elite.
      for (let index = 0; index < 6; index++) {
        const body = minibossDesignFor(minibossKindFor(stage, index))
        expect(baked.has(body), `stage ${stage} elite #${index} wears an unbaked ${body}`).toBe(true)
      }
    }
  })

  it('costs the opening exactly one body, and the deep stages none', () => {
    // Below the pool every elite is the scythe, so one body covers the lot —
    // the stage most sensitive to load time pays for one strip, not four.
    expect(minibossDesignsFor(1)).toEqual(['snaggletusk'])
    expect(minibossDesignsFor(THREAT_POOL_FROM_STAGE - 1)).toHaveLength(1)
    expect(minibossDesignsFor(THREAT_POOL_FROM_STAGE)).toHaveLength(MINIBOSS_POOL.length)
    // …and the late tier bakes its own two on top, which is the whole cost of it.
    expect(minibossDesignsFor(MINIBOSS_TIER2_FROM_STAGE))
      .toHaveLength(MINIBOSS_POOL_LATE.length)
  })
})

describe('the spawn actually applies the pairing', () => {
  it('gives every elite on a real road the body its fight owns', async () => {
    // The pure map above proves the intent; this proves the wiring. `el.kind`
    // has to be resolved BEFORE `el.design` reads it, and an ordering slip there
    // would hand every elite the same body with no test above noticing.
    const { drainFx } = await import('@/use/useVfx')
    const { __resetTowerState } = await import('@/use/useTowerState')

    // 10 rather than 9 for the late tier (both field it). Stage 9 was re-cut on
    // 2026-09-18 around authored stone fields (`stones` in track.ts) whose
    // offset gaps are the stage's whole lesson, and a crowd held on one line —
    // which is all this spec does to keep the road scrolling — is cut apart by
    // them before its first landmark. Stage 10's layout is two half-walls, so
    // the same held line reaches its burrower and its scythe.
    for (const stage of [1, 5, 6, 10]) {
      localStorage.clear()
      __resetTowerState()
      const game = await import('@/use/useSurvivalGame')
      game.startStage(stage)
      game.debugAddUnits(300)
      drainFx()

      const seen = new Map<string, string>()
      for (let i = 0; i < 6000; i++) {
        // The squad holds its column until the first steer arrives, so without
        // this the road never scrolls and no elite is ever placed.
        game.steerTo(game.anchor().x)
        game.step(16)
        for (const f of game.getFoes()) {
          if (!f.elite || f.dead) continue
          seen.set(String(f.id), `${f.kind}|${f.design}`)
        }
        if (game.phase.value === 'clear') break
      }

      expect(seen.size, `stage ${stage} never fielded an elite`).toBeGreaterThan(0)
      for (const pair of seen.values()) {
        const [kind, design] = pair.split('|')
        expect(design, `stage ${stage}: a ${kind} wore ${design}`)
          .toBe(minibossDesignFor(kind as never))
      }
    }
  })
})

/**
 * ─── The claw's core ────────────────────────────────────────────────────────
 *
 * The middle quarter of each gouge kills everything it touches, with no budget.
 * The rest of the strip is priced as a share, like every other big hit. What
 * follows pins the geometry — that the core really is the middle QUARTER OF THE
 * STRIP rather than a quarter of its half-width, and that widening the attack
 * was not a side effect.
 */
describe('the claw rips down the middle and grazes either side', () => {
  it('is the middle 25% of the strip, not 25% of its half-width', () => {
    // The off-by-two that would halve it and read as "nearly right" in play.
    for (const rakes of [0, 5, 40, 400]) {
      const halfW = clawFurrowHalfW(rakes)
      const stripW = halfW * 2
      expect(clawCoreHalfW(halfW) * 2).toBeCloseTo(stripW * 0.25, 10)
    }
    expect(CLAW_CORE_FRACTION).toBeGreaterThan(0)
    expect(CLAW_CORE_FRACTION).toBeLessThan(1)
  })

  it('stays strictly inside the gouge at every width the fight reaches', () => {
    for (const rakes of [0, 1, 20, 500]) {
      const halfW = clawFurrowHalfW(rakes)
      const core = clawCoreHalfW(halfW)
      expect(core).toBeGreaterThan(0)
      expect(core).toBeLessThan(halfW)
    }
    // It grows with the gouge rather than being pinned to the opening width —
    // otherwise a long fight's widened strip would keep a first-rake core.
    expect(clawCoreHalfW(clawFurrowHalfW(400)))
      .toBeGreaterThan(clawCoreHalfW(clawFurrowHalfW(0)))
  })

  it('never reaches outside a strip the player was shown', () => {
    const halfW = clawFurrowHalfW(0)
    const lanes = clawLaneXs(0)
    const core = clawCoreHalfW(halfW)
    // Anything the core kills is inside the drawn gouge. The telegraph paints
    // the strip; a core wider than it would kill outside the picture.
    for (const lx of lanes) {
      for (const x of [lx - core, lx, lx + core, lx - core * 0.5, lx + core * 0.5]) {
        expect(inClawFurrow(x, lanes, halfW)).toBe(true)
      }
    }
  })

  it('leaves the dodge pocket completely free of it', () => {
    // THE property that keeps this a fight rather than a tax. A crowd that
    // reads the rake and steps into a pocket must be untouched — the core must
    // not have quietly reached across the gap the whole attack is built around.
    const halfW = CLAW_FURROW_HALF_W_MAX
    const lanes = clawLaneXs(0)
    const core = clawCoreHalfW(halfW)
    const pocketCentre = lanes[0]! + CLAW_SPACING / 2
    expect(CLAW_FURROWS).toBeGreaterThan(1)

    // Sample the whole crowd's width, sitting in the pocket.
    for (let i = 0; i <= 40; i++) {
      const x = pocketCentre - CROWD_MAX_R + (2 * CROWD_MAX_R * i) / 40
      const inCore = lanes.some((lx) => Math.abs(x - lx) <= core)
      expect(inCore, `a pocketed crowd touches the core at ${x.toFixed(3)}`).toBe(false)
    }
    // And the premise: the pocket really is wider than the crowd, with margin.
    expect(CLAW_SPACING / 2 - halfW - CROWD_MAX_R).toBeGreaterThanOrEqual(CLAW_DODGE_MARGIN - 1e-9)
    expect(CLAW_FURROW_HALF_W).toBeLessThanOrEqual(CLAW_FURROW_HALF_W_MAX)
  })
})
