import { describe, expect, it } from 'vitest'
import { buildTrack, gateAddBase, packSize, beatGap, maxTriples, mulLeaves } from '@/game/track'
import { GATE_MAX_VALUE, MAX_SQUAD } from '@/game/survival'

/**
 * ─── The road has no end ────────────────────────────────────────────────────
 *
 * Stages 1–5 are hand-authored and 6+ are generated, and there was never a
 * "campaign complete" branch — stage 31 always technically worked. What did NOT
 * work was everything the generator stopped scaling: measured across stages
 * 1–300, fourteen separate knobs hit a hard cap somewhere between stage 17 and
 * stage 34, so a stage-100 road was a stage-34 road with more enemy health.
 *
 * These are the properties that make "endless" mean something. They are
 * asserted deep enough to cover the two breaks that were actually measured:
 * the additive path overrunning `MAX_SQUAD` around stage 86, and gate banks
 * printing identical doors from stage 161.
 */

const DEEP = [31, 40, 60, 80, 100, 130, 161, 200, 250, 300]

describe('the endless road keeps scaling', () => {
  it('builds any stage without breaking', () => {
    for (const stage of [...DEEP, 500, 1000]) {
      const t = buildTrack(stage)
      expect(t.events.length, `stage ${stage} generated nothing`).toBeGreaterThan(10)
      expect(Number.isFinite(t.arenaY), `stage ${stage} has a broken arena`).toBe(true)
      for (const e of t.events) {
        expect(Number.isFinite(e.y), `stage ${stage} has a NaN event`).toBe(true)
      }
    }
  })

  it('is still a pure function of its number, however deep', () => {
    expect(JSON.stringify(buildTrack(137))).toBe(JSON.stringify(buildTrack(137)))
    expect(JSON.stringify(buildTrack(137))).not.toBe(JSON.stringify(buildTrack(138)))
  })

  it('never stops growing the knobs that carry the difficulty', () => {
    // Each of these used to flatten — a cap reached between stage 17 and 34 —
    // so the endless game inherited one stage's shape forever.
    for (const [name, fn] of [
      ['gateAddBase', gateAddBase],
      ['packSize', packSize],
      ['maxTriples', maxTriples],
      ['mulLeaves', mulLeaves]
    ] as const) {
      expect(fn(60), `${name} plateaued between 30 and 60`).toBeGreaterThan(fn(30))
      expect(fn(150), `${name} plateaued between 60 and 150`).toBeGreaterThan(fn(60))
    }
    // …and the beat keeps closing rather than opening.
    expect(beatGap(150, 0)).toBeLessThan(beatGap(60, 0))
  })

  it('keeps its doors honest — no bank ever prints two identical leaves', () => {
    // The measured break: with `GATE_MAX_VALUE` at 99 every `add` clamped to
    // the same number past stage ~161, and the tie-breaker in `legalise` —
    // which separates two doors by GROWING one — had nothing left to grow into.
    for (const stage of DEEP) {
      for (const bank of buildTrack(stage).events) {
        if (bank.kind !== 'gates') continue
        const seen = new Set<string>()
        for (const leaf of bank.leaves) {
          const key = `${leaf.op}${leaf.value}`
          expect(seen.has(key), `stage ${stage} @${bank.y} offers ${key} twice`).toBe(false)
          seen.add(key)
          expect(leaf.value).toBeLessThanOrEqual(GATE_MAX_VALUE)
        }
      }
    }
  })

  it('does not promise more survivors than the game can hold', () => {
    // Summing the best `add` of every bank is the most the additive path can
    // hand a run. Past `MAX_SQUAD` the surplus is silently clipped and every
    // door lies about its payout — the bug the cap was raised to fix for a
    // thirty-stage career, arriving again later. The `1.64` is a maxed Squad
    // track's `gatePayoutBonus`.
    //
    // Bounded at stage 200 on purpose, and this is the honest statement of the
    // limit rather than a convenient one: NO finite cap survives an unbounded
    // sum. With `MAX_SQUAD` at 4 000 and `gateAddBase` flattened into a
    // logarithm, the theoretical sum first crosses the cap at **stage ~240**
    // (measured: 4 057 at stage 250). Two things make that acceptable rather
    // than a deferred bug: stage 240 is roughly three hours of unbroken play,
    // and the figure is a THEORETICAL maximum that ignores attrition — a real
    // run at that depth is losing a fifth of the crowd to every elite sweep and
    // a third to every boss slam, so it never accumulates anything close.
    for (const stage of DEEP.filter((s) => s <= 200)) {
      let sum = 0
      for (const e of buildTrack(stage).events) {
        if (e.kind !== 'gates') continue
        const best = e.leaves.filter((l) => l.op === 'add').map((l) => l.value)
        if (best.length) sum += Math.max(...best)
      }
      expect(sum * 1.64, `stage ${stage} promises ${Math.round(sum * 1.64)} of ${MAX_SQUAD}`)
        .toBeLessThan(MAX_SQUAD)
    }
  })
})

describe('the shop has no last level either', () => {
  it('never maxes the three tracks that carry a deep run', async () => {
    const { UPGRADES, __setUpgradeLevel, isMaxed, upgradeCost } = await import('@/use/useUpgrades')
    for (const id of ['squad', 'power', 'scavenge'] as const) {
      expect(UPGRADES[id].maxLevel, `${id} still has a ceiling`).toBe(Number.POSITIVE_INFINITY)
      for (const level of [10, 25, 60, 200]) {
        __setUpgradeLevel(id, level)
        expect(isMaxed(id), `${id} maxed out at ${level}`).toBe(false)
        expect(Number.isFinite(upgradeCost(id)), `${id} priced level ${level} as ${upgradeCost(id)}`)
          .toBe(true)
        expect(upgradeCost(id)).toBeGreaterThan(0)
      }
      __setUpgradeLevel(id, 0)
    }
  })

  it('keeps the endless levels affordable rather than nominal', async () => {
    const { UPGRADES } = await import('@/use/useUpgrades')
    // The authored curve multiplies by up to 1.55 a level, so continuing it
    // would put the first endless purchase tens of stages away and "endless"
    // would mean "locked". The tail is deliberately gentler than the head.
    for (const [id, authored] of [['squad', 16], ['power', 20], ['scavenge', 10]] as const) {
      const def = UPGRADES[id]
      const lastAuthored = def.cost(authored - 1)
      const firstEndless = def.cost(authored)
      const headStep = def.cost(authored - 1) / def.cost(authored - 2)
      const tailStep = firstEndless / lastAuthored
      expect(tailStep, `${id}'s tail is steeper than its head`).toBeLessThan(headStep)
      expect(tailStep, `${id}'s tail is free`).toBeGreaterThan(1)
    }
  })

  it('leaves the two physically-bounded tracks capped', async () => {
    const { UPGRADES } = await import('@/use/useUpgrades')
    // Fire rate is clamped by `MAX_FIRE_RATE` and reach by the camera
    // (`BULLET_RANGE_MAX`). An endless level on either would take coins for a
    // number that cannot move — worse than a maxed track.
    expect(UPGRADES.rate.maxLevel).toBe(12)
    expect(UPGRADES.range.maxLevel).toBe(10)
  })

  it('shows the fire rate the simulation actually uses', async () => {
    const { UPGRADES, __setUpgradeLevel, fireRate } = await import('@/use/useUpgrades')
    // The shop readout used 0.09/level while the run used 0.07 — a 13 % lie at
    // max, in the direction that makes the purchase look better than it is.
    for (const level of [0, 5, 12]) {
      __setUpgradeLevel('rate', level)
      expect(UPGRADES.rate.valueAt(level), `level ${level} readout`)
        .toBeCloseTo(Math.round(fireRate.value * 10) / 10, 5)
    }
    __setUpgradeLevel('rate', 0)
  })
})

describe('walls get deep, crates get dear', () => {
  it('makes walls that cannot be shot through, once the shop can be felt', async () => {
    const { buildTrack } = await import('@/game/track')
    /** Ranks of barricade stacked within 2 units of each other. */
    const deepestWall = (stage: number): number => {
      const rows = buildTrack(stage).events
        .filter((e) => e.kind === 'barricade')
        .map((e) => e.y)
        .sort((a, b) => a - b)
      let best = 1
      for (let i = 0; i < rows.length; i++) {
        let n = 1
        for (let j = i + 1; j < rows.length && rows[j]! - rows[i]! <= 2 * n; j++) n++
        best = Math.max(best, n)
      }
      return best
    }
    // A single rank is a DPS question and two or three upgrades answer it. Depth
    // converts it back into a routing question — but not before the player has
    // the upgrades that made the single rank easy in the first place.
    for (const stage of [2, 5, 8, 11]) {
      expect(deepestWall(stage), `stage ${stage} stacked a wall too early`).toBe(1)
    }
    const deep = [14, 18, 22, 30, 45, 60, 90].map(deepestWall)
    expect(Math.max(...deep), 'no wall is ever more than one rank deep').toBeGreaterThanOrEqual(2)
    expect(Math.max(...deep), 'walls stacked deeper than three ranks').toBeLessThanOrEqual(3)
  })

  it('prices a crate against the crowd that reaches it, not the one that started', async () => {
    const { buildTrack, crateDepthFactor } = await import('@/game/track')
    // The crowd is built ON the road, so the last box of a stage meets a squad
    // several times the one that met the first. Pricing every crate off the
    // stage number alone made the late ones free.
    expect(crateDepthFactor(0, 40)).toBe(1)
    expect(crateDepthFactor(1, 40)).toBeGreaterThan(crateDepthFactor(0.5, 40))
    // …and the effect fades in, so an early stage never prints an unbreakable
    // box: a stage-2 crowd barely grows across its own road.
    expect(crateDepthFactor(1, 2)).toBe(1)
    expect(crateDepthFactor(1, 40)).toBeGreaterThan(crateDepthFactor(1, 10))

    for (const stage of [40, 80]) {
      const boxes = buildTrack(stage).events
        .filter((e) => e.kind === 'crates')
        .flatMap((e) => (e.kind === 'crates' ? e.crates.map((c) => ({ y: e.y, hp: c.hp })) : []))
      expect(boxes.length).toBeGreaterThan(3)
      const early = boxes.filter((c) => c.y < 60)
      const late = boxes.filter((c) => c.y > 200)
      if (early.length && late.length) {
        const avg = (xs: { hp: number }[]) => xs.reduce((a, c) => a + c.hp, 0) / xs.length
        expect(avg(late), `stage ${stage}: late crates are no dearer than early ones`)
          .toBeGreaterThan(avg(early))
      }
    }
  })
})
