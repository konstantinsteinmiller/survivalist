/**
 * ─── The two elites the late tier adds ──────────────────────────────────────
 *
 * Four elites is enough variety to stop a stage being one fight and not enough
 * to stop a CAREER being four. `MINIBOSS_TIER2_FROM_STAGE` is where the pool
 * grows by two, and the two are chosen for the questions the first four never
 * ask:
 *
 *   WARDEN    where is the GAP. The whole road is lethal except one slot, so the
 *             input is aiming FOR a mark rather than flinching away from one —
 *             the only hazard in the game that inverts the verb.
 *   BURROWER  which WAY are you going. It arrives where the crowd was half a
 *             second ago, so sustained movement is a clean escape, stopping is
 *             caught, and reversing runs back down your own trail into it.
 *
 * Both are measured the way the first four were: as OUTCOMES over the real
 * `step()` loop, comparing a policy that answers the question against one that
 * does not. The failure this catches is the one the claw's history records and
 * the bomber's arithmetic nearly repeated — geometry that reads as an attack and
 * cannot actually be answered, or can be answered by standing still.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CROWD_MAX_R, ELITE_DRAG_MIN, LANE_HALF, stageSpeed } from '@/game/survival'
import {
  BURROWER_BLAST_R, BURROWER_DIVES_MAX, BURROWER_LAG, BURROWER_SURFACE_S,
  MINIBOSS_POOL, MINIBOSS_POOL_LATE, MINIBOSS_TIER2_FROM_STAGE, WARDEN_SLAB_HALF_W,
  WARDEN_SLOT_HALF_W, minibossKindFor, wardenSlabXs, wardenSlotX, type MinibossKind
} from '@/game/threats'
import { drainFx, type FxEvent } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/**
 * The shallowest stage that fields `kind` on a road that actually spawns it.
 *
 * Both halves matter. `minibossKindFor` will answer for any index, but a road
 * only fields as many elites as `placeMinibosses` puts on it — three for most
 * stages — so a kind that lands on index 4 is a kind the stage never shows. The
 * search is bounded to the indices a real road uses.
 */
const stageOf = (kind: MinibossKind, indices = 3): number => {
  for (let s = MINIBOSS_TIER2_FROM_STAGE; s < MINIBOSS_TIER2_FROM_STAGE + 40; s++) {
    for (let i = 0; i < indices; i++) if (minibossKindFor(s, i) === kind) return s
  }
  throw new Error(`no road fields ${kind}`)
}

const WARDEN_STAGE = stageOf('warden')
const BURROWER_STAGE = stageOf('burrower')

interface RoadOptions {
  stage: number
  kind: MinibossKind
  squad: number
  /** Where to steer, given the elite under test (or null before it spawns). */
  steer: (game: Awaited<ReturnType<typeof importGame>>, elite: Elite | null, tick: number) => number
  ticks?: number
  /** Called every frame after the step, for the specs that measure the world
   *  rather than the losses. */
  watch?: (game: Awaited<ReturnType<typeof importGame>>, elite: Elite | null) => void
}

type Elite = ReturnType<Awaited<ReturnType<typeof importGame>>['getFoes']>[number]

/**
 * Run a road and report what ONE elite cost.
 *
 * Every other landmark is parked far up the road and the one under test is made
 * immortal, both for `rollerSpent`'s reasons: every miniboss bills under the
 * same `elite` cause, so a second one's bites would be counted as this one's,
 * and a measurement of an attack must not be a measurement of how fast the crowd
 * deletes the thing throwing it. The squad is topped back up every frame so two
 * policies are compared against the same crowd rather than against whatever the
 * last hit left standing.
 */
const road = async (o: RoadOptions) => {
  const game = await importGame()
  game.startStage(o.stage)
  game.debugAddUnits(o.squad)
  drainFx()

  const before = game.deathBreakdown().elite
  const fx: FxEvent[] = []
  let saw = false
  for (let i = 0; i < (o.ticks ?? 6000); i++) {
    let target: Elite | null = null
    for (const f of game.getFoes()) {
      if (!f.elite || f.dead) continue
      if (f.kind !== o.kind) { f.y = game.anchor().y + 500; continue }
      f.hp = 1e9
      f.maxHp = 1e9
      // …and the leash is held open, so the fight lasts long enough to show a
      // cadence. `hold` is the leash AND the drag flag, so this is also what
      // keeps the road's speed the same between two policies being compared.
      f.hold = 9e9
      target = f
      saw = true
    }
    if (game.squadCount.value < o.squad) {
      game.debugAddUnits(o.squad - game.squadCount.value)
    }
    game.steerTo(o.steer(game, target, i))
    game.step(STEP_MS)
    fx.push(...drainFx())
    o.watch?.(game, target)
    if (game.phase.value !== 'run') break
  }
  expect(saw, `stage ${o.stage} never fielded a ${o.kind}`).toBe(true)
  return { game, fx, billed: game.deathBreakdown().elite - before }
}

const of = <K extends FxEvent['kind']>(fx: readonly FxEvent[], kind: K) =>
  fx.filter((e) => e.kind === kind) as Array<Extract<FxEvent, { kind: K }>>

// ─── The tier ───────────────────────────────────────────────────────────────

describe('the late elites arrive as a tier, and cost the loader nothing', () => {
  it('leaves every road below the tier exactly as it was', () => {
    for (let s = 1; s < MINIBOSS_TIER2_FROM_STAGE; s++) {
      for (let i = 0; i < 6; i++) {
        expect(MINIBOSS_POOL, `stage ${s} elite #${i} came from the late pool`)
          .toContain(minibossKindFor(s, i))
      }
    }
  })

  it('opens with both of the new fights on the same road', () => {
    // The reason `MINIBOSS_POOL_LATE` puts them first: a tier whose new fights
    // turn up four stages after it opened is a tier the player meets by
    // accident.
    const opening = [0, 1, 2].map((i) => minibossKindFor(MINIBOSS_TIER2_FROM_STAGE, i))
    expect(opening).toContain('warden')
    expect(opening).toContain('burrower')
  })

  it('puts a body that is solid for its whole fight on every road', () => {
    // Three of the six kinds are deliberately intangible for part of their
    // fight, and a road whose every landmark can be walked through has no anchor
    // on it — the crowd never routes around anything. `MINIBOSS_POOL_LATE`'s
    // order is what guarantees this; it is the entry a future edit is most
    // likely to undo.
    const solid = new Set<MinibossKind>(['scythe', 'gunner', 'warden'])
    for (let s = MINIBOSS_TIER2_FROM_STAGE; s < MINIBOSS_TIER2_FROM_STAGE + MINIBOSS_POOL_LATE.length; s++) {
      const road = [0, 1, 2].map((i) => minibossKindFor(s, i))
      expect(road.some((k) => solid.has(k)), `stage ${s} fields ${road.join(', ')} — nothing solid`)
        .toBe(true)
    }
  })
})

// ─── warden ─────────────────────────────────────────────────────────────────

describe('the warden marks the whole road except one slot', () => {
  it('leaves a slot the crowd fits inside, wherever it opens', () => {
    // THE premise, and it is `CLAW_SPACING`'s lesson applied to a different
    // shape: a slot narrower than the crowd is not a hard attack, it is a tax
    // with an arrow pointing at it.
    expect(WARDEN_SLOT_HALF_W * 2, `a slot ${(WARDEN_SLOT_HALF_W * 2).toFixed(2)} against a crowd ${(CROWD_MAX_R * 2).toFixed(2)}`)
      .toBeGreaterThan(CROWD_MAX_R * 2)
    for (let x = -LANE_HALF; x <= LANE_HALF; x += 0.25) {
      const slot = wardenSlotX(x)
      // The whole slot is on the road: a slot half off the rail is one the crowd
      // cannot get all of itself into, for reasons the player cannot see.
      expect(Math.abs(slot) + WARDEN_SLOT_HALF_W, `a slot at ${slot.toFixed(2)} hangs off the rail`)
        .toBeLessThanOrEqual(LANE_HALF + 1e-9)
    }
  })

  it('always opens the slot somewhere that is a real move', () => {
    const reach = LANE_HALF - 0.4
    for (let x = -reach; x <= reach; x += 0.25) {
      const slot = wardenSlotX(x)
      expect(Math.abs(slot), 'the slot opened outside the steer clamp').toBeLessThanOrEqual(reach)
      // Never under the crowd's own feet — a row with a free answer is a row the
      // player learns to ignore.
      expect(Math.abs(slot - x), `a slot ${Math.abs(slot - x).toFixed(2)} from the crowd is free`)
        .toBeGreaterThan(WARDEN_SLOT_HALF_W - CROWD_MAX_R + 0.3)
    }
  })

  it('walls everything the slot does not cover, with no second hole in it', () => {
    for (const at of [-2.5, -1.2, 0, 1.4, 2.5]) {
      const slot = wardenSlotX(at)
      const slabs = wardenSlabXs(slot)
      expect(slabs.length, `a row at ${slot} laid no slabs`).toBeGreaterThan(2)
      // Walk the road in fine steps: every point outside the slot is inside a
      // slab, and every point inside the slot is inside none.
      for (let x = -LANE_HALF; x <= LANE_HALF; x += 0.05) {
        const walled = slabs.some((c) => Math.abs(x - c) <= WARDEN_SLAB_HALF_W)
        if (Math.abs(x - slot) <= WARDEN_SLOT_HALF_W - 1e-9) {
          expect(walled, `x=${x.toFixed(2)} is walled inside the slot at ${slot}`).toBe(false)
        } else if (Math.abs(x - slot) >= WARDEN_SLOT_HALF_W + WARDEN_SLAB_HALF_W * 2) {
          // Away from the slot's own shoulders — the pitch leaves a tenth of a
          // unit of daylight between neighbours, which is not a hole anybody can
          // hide in but is not solid stone either.
          const nearest = Math.min(...slabs.map((c) => Math.abs(x - c)))
          expect(nearest, `x=${x.toFixed(2)} is ${nearest.toFixed(2)} from any slab`)
            .toBeLessThan(WARDEN_SLAB_HALF_W + 0.06)
        }
      }
    }
  })

  it('costs a crowd that reaches the slot far less than one that stands still', async () => {
    // THE measurement. Both crowds fight the same warden on the same road with
    // the same build; the only difference is whether they answered it.
    const intoTheSlot = (game: Awaited<ReturnType<typeof importGame>>, elite: Elite | null): number => {
      if (!elite || elite.kindTicks <= 0) return game.anchor().x
      // `markX` is the slot the simulation locked, which is also the number the
      // telegraph was drawn from.
      return elite.markX
    }
    const read = await road({
      stage: WARDEN_STAGE, kind: 'warden', squad: 320, steer: intoTheSlot
    })
    const stood = await road({
      stage: WARDEN_STAGE, kind: 'warden', squad: 320, steer: (g) => g.anchor().x
    })

    expect(of(stood.fx, 'bossRake').length, 'the warden never slammed a row')
      .toBeGreaterThan(0)
    expect(stood.billed, 'standing in the slabs cost nothing, so there is no dodge to measure')
      .toBeGreaterThan(20)
    // Reading it has to be worth most of it — not "a bit better", which is what
    // the claw's first pockets measured before they were derived from the crowd.
    expect(read.billed, `reaching the slot cost ${read.billed} against ${stood.billed} for standing`)
      .toBeLessThan(stood.billed * 0.4)
  })

  it('announces the exact slabs it is about to drop', async () => {
    const r = await road({
      stage: WARDEN_STAGE, kind: 'warden', squad: 240, steer: (g) => g.anchor().x
    })
    const casts = of(r.fx, 'rakeCast').filter((c) => c.halfW === WARDEN_SLAB_HALF_W)
    const rows = of(r.fx, 'bossRake').filter((c) => c.halfW === WARDEN_SLAB_HALF_W)
    expect(casts.length, 'the row was never announced').toBeGreaterThan(0)
    expect(rows.length, 'the row never landed').toBeGreaterThan(0)
    for (const row of rows) {
      const matched = casts.some((c) =>
        c.lanes.length === row.lanes.length &&
        c.lanes.every((x, i) => Math.abs(x - (row.lanes[i] ?? 0)) < 1e-9))
      expect(matched, `a row at ${row.x.toFixed(2)} dropped slabs nothing announced`).toBe(true)
    }
  })
})

// ─── burrower ───────────────────────────────────────────────────────────────

describe('the burrower arrives where the crowd was, not where it is', () => {
  it('follows the trail rather than chasing the crowd', async () => {
    // The mechanic, measured directly: while it is under the road the mound sits
    // at a place the crowd has ALREADY been, and for a crowd that is moving that
    // is behind them. A pursuit at a fixed speed would converge instead, which is
    // the shape `BURROWER_LAG`'s note rejects on arithmetic.
    const path: Array<{ tick: number; x: number }> = []
    const samples: Array<{ lagged: number; live: number }> = []
    // A TRIANGLE and not a sine, at a speed the road actually asks for. A sine's
    // turning points are stationary, so most of its samples are taken while the
    // crowd is not moving — and a crowd that is not moving has no trail to be
    // behind. This crosses the reachable width at a constant ~6 units a second,
    // which is what "the player is steering" looks like.
    const SWEEP_TICKS = 160
    const sweep = (_g: unknown, _e: Elite | null, tick: number): number => {
      const t = (tick % SWEEP_TICKS) / SWEEP_TICKS
      return t < 0.5 ? -3.8 + t * 2 * 7.6 : 3.8 - (t - 0.5) * 2 * 7.6
    }

    await road({
      stage: BURROWER_STAGE, kind: 'burrower', squad: 240, steer: sweep,
      watch: (game, elite) => {
        path.push({ tick: path.length, x: game.anchor().x })
        if (!elite || elite.fuse <= BURROWER_SURFACE_S) return
        const backTicks = Math.round((BURROWER_LAG * 1000) / STEP_MS)
        const was = path[Math.max(0, path.length - 1 - backTicks)]
        if (!was) return
        samples.push({
          lagged: Math.abs(elite.x - was.x),
          live: Math.abs(elite.x - game.anchor().x)
        })
      }
    })

    expect(samples.length, 'the burrower never tracked under the road')
      .toBeGreaterThan(20)

    // ── Stated as a COMPARISON, and that is not a weaker claim ──
    //
    // The absolute distance is not the fact under test and cannot be pinned
    // honestly from outside: the trail is sampled every `TRAIL_STEP`, and a
    // crowd crossing the road is briefly doing fifteen-odd units a second, so a
    // test that reconstructs "where the crowd was 0.5 s ago" from its own
    // per-frame log disagrees with the ring buffer by a fraction of a sample
    // however carefully it is written. What matters is which of the two places
    // the mound is at, and that is a ratio.
    const mean = (pick: (s: { lagged: number; live: number }) => number): number =>
      samples.reduce((n, s) => n + pick(s), 0) / samples.length
    const lagged = mean((s) => s.lagged)
    const live = mean((s) => s.live)
    expect(live, 'the crowd never actually went anywhere, so there is no trail to follow')
      .toBeGreaterThan(1)
    expect(lagged, `the mound sat ${lagged.toFixed(2)} from the crowd's trail and ${live.toFixed(2)} from the crowd`)
      .toBeLessThan(live * 0.5)
  })

  it('costs a moving crowd far less than one that stops, and a reversing one most', async () => {
    // The three answers, side by side. This is the whole fight: movement in any
    // direction buys separation, stopping does not, and turning around spends it.
    // MOVING means moving: the same constant-speed triangle the trail spec above
    // uses, for the reason written there. This was a square wave — hold one rail
    // for 1.76 s, cross, hold the other — which is mostly STANDING at an edge, so
    // whether it dodged came down to where the eruptions fell in that cycle. The
    // 2026-09-18 re-cut of stage 9 moved the burrower's spawn frame and the same
    // policy measured 221 against 308 for standing; swept continuously it is 36.
    const moving = await road({
      stage: BURROWER_STAGE, kind: 'burrower', squad: 320,
      steer: (_g, _e, tick) => {
        const t = (tick % 160) / 160
        return t < 0.5 ? -3.8 + t * 2 * 7.6 : 3.8 - (t - 0.5) * 2 * 7.6
      }
    })
    const still = await road({
      stage: BURROWER_STAGE, kind: 'burrower', squad: 320, steer: () => 0
    })
    const reversing = await road({
      stage: BURROWER_STAGE, kind: 'burrower', squad: 320,
      // Turns around the instant the mound plants — running back down its own
      // trail into the thing that has been following it.
      steer: (game, elite, tick) => {
        const base = Math.floor(tick / 110) % 2 === 0 ? -3.8 : 3.8
        if (elite && elite.fuse > 0 && elite.fuse <= BURROWER_SURFACE_S) return elite.markX
        return base
      }
    })

    expect(of(still.fx, 'bombBlast').length, 'the burrower never erupted')
      .toBeGreaterThan(0)
    expect(still.billed, 'standing still cost nothing, so there is no dodge to measure')
      .toBeGreaterThan(15)
    expect(moving.billed, `moving cost ${moving.billed} against ${still.billed} for standing`)
      .toBeLessThan(still.billed * 0.5)
    // Turning back into it is at least as bad as never moving at all — the
    // lesson no other hazard in this game teaches.
    expect(reversing.billed, `reversing cost ${reversing.billed} against ${still.billed} for standing`)
      .toBeGreaterThan(moving.billed)
  })

  it('spends its whole budget, and is still there to be killed afterwards', async () => {
    // ── The bound, asserted in BOTH directions ──
    //
    // `toBeLessThanOrEqual` alone is what let the budget be wrong for a
    // revision: it was two, the fight delivered one on every stage measured, and
    // a one-sided bound passes for any number at all. So the dives are counted
    // against the budget exactly — a burrower that is held on the road with a
    // leash that never expires has no excuse for leaving one unspent, and if a
    // future edit makes the last one unreachable again this is the line that
    // says so.
    let alive = false
    let dives = 0
    const r = await road({
      stage: BURROWER_STAGE, kind: 'burrower', squad: 240, steer: () => 0,
      watch: (_g, elite) => {
        if (!elite) return
        dives = Math.max(dives, elite.kindTicks)
        alive = true
      }
    })
    expect(of(r.fx, 'burrowDive').length, 'it never dived').toBe(BURROWER_DIVES_MAX)
    expect(dives, 'a dive went unspent').toBe(BURROWER_DIVES_MAX)
    expect(of(r.fx, 'bombBlast').length).toBe(BURROWER_DIVES_MAX)
    // …and it is NOT consumed by its own blast, which is the whole difference
    // from the bomber: a player who answered the dive is left something to shoot.
    expect(alive, 'the burrower was consumed by its own eruption like a bomber').toBe(true)
  })

  it('never slows the road while it is under it', async () => {
    // The crowd's lateral travel is bought with the road's speed, so a mound
    // that dragged the run to a crawl would be a hazard that takes away the only
    // input that answers it. Measured as the crowd's forward progress per frame
    // while the mound is under the road, against the crawl a holding elite
    // imposes.
    let submerged = 0
    let advance = 0
    let lastY = 0
    await road({
      stage: BURROWER_STAGE, kind: 'burrower', squad: 240, steer: () => 0,
      watch: (game, elite) => {
        const y = game.anchor().y
        if (elite && elite.fuse > 0 && lastY > 0) {
          submerged++
          advance += y - lastY
        }
        lastY = y
      }
    })
    expect(submerged, 'the burrower never went under the road').toBeGreaterThan(20)
    const perSecond = (advance / submerged) * (1000 / STEP_MS)
    const crawl = stageSpeed(BURROWER_STAGE) * ELITE_DRAG_MIN
    expect(perSecond, `the road ran at ${perSecond.toFixed(2)} u/s against a crawl of ${crawl.toFixed(2)}`)
      .toBeGreaterThan(crawl * 1.5)
  })

  it('erupts exactly where the ring said it would', async () => {
    // The bomber's contract: one event at the moment it plants, carrying the
    // exact seconds to the blast, and a blast at the marked spot. The mound is
    // free to move for the whole of the tracking phase and not one frame after.
    const r = await road({
      stage: BURROWER_STAGE, kind: 'burrower', squad: 240,
      steer: (_g, _e, tick) => Math.sin(tick / 70) * 3.6
    })
    const casts = of(r.fx, 'bombCast').filter((c) => c.radius === BURROWER_BLAST_R)
    const blasts = of(r.fx, 'bombBlast').filter((c) => c.radius === BURROWER_BLAST_R)
    expect(casts.length, 'the eruption was never announced').toBeGreaterThan(0)
    expect(blasts.length, 'it never erupted').toBeGreaterThan(0)
    for (const blast of blasts) {
      const matched = casts.some((c) =>
        Math.abs(c.x - blast.x) < 1e-6 && Math.abs(c.y - blast.y) < 1e-6)
      expect(matched, `an eruption at ${blast.x.toFixed(2)} moved off its own ring`).toBe(true)
    }
    for (const c of casts) expect(c.ttl).toBeCloseTo(BURROWER_SURFACE_S, 9)
  })
})
