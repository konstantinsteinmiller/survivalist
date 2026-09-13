// ─── A gate is only a decision if the player's fire changes the answer ──────
//
// The banks were `+7 | +8` — arithmetic with one right answer, readable off the
// doors without knowing anything about the run. Two changes make them questions:
// the scale ops pump like the additive ones already did, and a multiplier OPENS
// below its headline so that at rest it is usually the worse deal.
//
// Together those mean a `x2` door is an investment. Take it cold and it is a
// `x1.6`; spend the approach shooting it and it is worth twice that. The crowd
// has one stream of fire, so whatever it is pointed at is the door being paid
// for — and the door it is not pointed at stays where it is.

import { describe, expect, it } from 'vitest'
import {
  BASE_FIRE_RATE, GATE_DIV_MAX, GATE_MUL_MAX, GATE_SCALE_STEP, GATE_TICK_MS, gateMulOpen,
  gateValueLabel
} from '@/game/survival'
import { WEAPONS } from '@/game/weapons'
import { OPENING_PUMP_CAP, OPENING_PUMP_MUL, buildTrack } from '@/game/track'

/** The hot window a door forgets it was shot after — see `stepGates`. */
const GATE_HOT_S = 0.4

describe('the weapons and the pump', () => {
  it('lets the launcher pump a door at all: its hold bridges the salvo\'s reload', () => {
    // One trigger pull per `1 / (fireRate × rateMul)` seconds, every muzzle at
    // once (`volley`). At the base fire rate that gap is longer than the hot
    // window, so without the hold a rocket-armed crowd could not pump a door
    // until its fire rate had climbed most of a run.
    const r = WEAPONS.rocket
    const salvoGapS = 1 / (BASE_FIRE_RATE * r.rateMul)
    expect(salvoGapS).toBeGreaterThan(GATE_HOT_S)
    expect(r.gateHoldS + GATE_HOT_S).toBeGreaterThan(salvoGapS)
    // …but still goes cold inside two seconds once the crowd looks away.
    expect(r.gateHoldS + GATE_HOT_S).toBeLessThan(2)
  })

  it('makes the gatling wind a door up faster than the squad\'s own gun', () => {
    // The hose's one honest advantage over the launcher, made visible on the
    // plate: the pump is a clock, so a faster gun needs its own multiplier.
    expect(WEAPONS.gatling.pumpMul).toBeGreaterThan(1)
    expect(WEAPONS.gatling.pumpMul).toBeLessThanOrEqual(2)
    expect(WEAPONS.rocket.pumpMul).toBe(1)
    expect(WEAPONS.gatling.gateHoldS).toBe(0)
    // The gatling never fires slower than the hot window, so it needs no hold.
    expect(1 / (BASE_FIRE_RATE * WEAPONS.gatling.rateMul)).toBeLessThan(GATE_HOT_S)
  })
})

describe('the opening doorway races', () => {
  it('is the only door on the road with its own pump, and it stops at seven', () => {
    const doors = buildTrack(1).events.filter((e) => e.kind === 'gates')
    const opener = doors[0]!
    expect(opener.kind === 'gates' && opener.leaves).toHaveLength(1)
    const leaf = opener.kind === 'gates' ? opener.leaves[0]! : null!
    expect(leaf.pumpMul).toBe(OPENING_PUMP_MUL)
    expect(leaf.pumpCap).toBe(OPENING_PUMP_CAP)
    // Seven, down from ten. Ten handed the player thirteen survivors out of the
    // first door and left the rest of stage 1 with nothing to give; seven is
    // still the whole spectacle — from a squad of ONE it is a crowd appearing
    // out of nothing — and leaves the road after it something to do.
    expect(OPENING_PUMP_CAP).toBe(7)
    for (const d of doors.slice(1)) {
      if (d.kind !== 'gates') continue
      for (const l of d.leaves) {
        expect(l.pumpMul, `stage 1 @${d.y}`).toBeUndefined()
        expect(l.pumpCap, `stage 1 @${d.y}`).toBeUndefined()
      }
    }
    // Fast enough to reach the cap inside the approach: at 2.6× a tick is
    // under 200 ms, and the door is ~1.8 s of road from the start line.
    expect(GATE_TICK_MS / OPENING_PUMP_MUL).toBeLessThan(200)
    expect((OPENING_PUMP_CAP - leaf.value) * (GATE_TICK_MS / OPENING_PUMP_MUL) / 1000).toBeLessThan(1.8)
  })
})

describe('what a multiplier is worth', () => {
  it('opens below its headline, so taking it cold is a real cost', () => {
    expect(gateMulOpen(2)).toBe(1.6)
    expect(gateMulOpen(3)).toBe(2.4)
    // The headline still ranks the doors — a x3 is visibly the bigger one.
    expect(gateMulOpen(3)).toBeGreaterThan(gateMulOpen(2))
  })

  it('is usually the WORSE door until it has been shot', () => {
    // A `x1.6` pays `crowd x 0.6`. Against the `+9` it is authored beside on
    // stage 1, that does not break even until fifteen survivors — so for most of
    // the stage the flat number is correct, and the multiplier only wins for a
    // player who committed their fire to it.
    const add = 9
    const cold = (crowd: number) => crowd * (gateMulOpen(2) - 1)
    expect(cold(10)).toBeLessThan(add)
    expect(cold(15)).toBeGreaterThanOrEqual(add)

    // Pumped to the cap it breaks even at five, which is every crowd that
    // reaches it. That swing IS the decision.
    const hot = (crowd: number) => crowd * (GATE_MUL_MAX - 1)
    expect(hot(5)).toBeGreaterThanOrEqual(add)
  })
})

describe('the scale doors pump', () => {
  it('moves in tenths, where the additive doors move in whole survivors', () => {
    expect(GATE_SCALE_STEP).toBe(0.1)
    // A full approach is a handful of ticks, so the swing is meaningful without
    // a multiplier ever becoming a `+N` in disguise.
    const ticksIn3s = 3000 / GATE_TICK_MS
    expect(gateMulOpen(2) + ticksIn3s * GATE_SCALE_STEP).toBeLessThanOrEqual(GATE_MUL_MAX)
  })

  it('pumps the trap in the direction that hurts', () => {
    // The whole point of the trap pumping: shooting one makes it worse, which is
    // what finally puts a price on not choosing a door.
    expect(GATE_DIV_MAX).toBeGreaterThan(2)
  })

  it('prints a tenth only when it has one', () => {
    // `x2.0` on an untouched door would read as a bug.
    expect(gateValueLabel(2)).toBe('2')
    expect(gateValueLabel(1.6)).toBe('1.6')
    expect(gateValueLabel(2.4)).toBe('2.4')
  })
})

describe('the crowd pays for what it aims at', () => {
  // THIS TEST SHIPPED THE BUG IT WAS WRITTEN TO CATCH, and the way it did is
  // worth keeping in front of whoever edits it next.
  //
  // It used to `return` the moment it saw a door grow, and its only assertion
  // outside that branch was "a multiplier bank streamed in". So when multipliers
  // could not be pumped at all — the bullet that flags a gate as being shot at
  // named `add` and `sub` explicitly and silently ignored `mul` and `div` — the
  // test still passed, because a bank had indeed streamed in. A vacuous green.
  //
  // Every path through the checks below now ends in an assertion about the
  // VALUE. Growing is the claim; arriving is not.

  /** Run stage `stage` holding the given op's leaf, and report what it did. */
  const rideLeaf = async (
    stage: number, op: 'mul' | 'div' | 'add'
  ): Promise<{ open: number; peak: number } | null> => {
    const game = await import('@/use/useSurvivalGame')
    const { __resetTowerState } = await import('@/use/useTowerState')
    localStorage.clear()
    __resetTowerState()

    game.startStage(stage)
    game.debugAddUnits(40)

    let open: number | null = null
    let peak = 0
    for (let i = 0; i < 6000; i++) {
      const g = game.getGates().find((x) => x.op === op && !x.used)
      if (g) {
        if (open === null) open = g.value
        peak = Math.max(peak, g.value)
        game.steerTo(g.x)
      }
      game.step(16)
      if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
    }
    return open === null ? null : { open, peak }
  }

  it('pumps a MULTIPLIER the squad is shooting', async () => {
    const seen = await rideLeaf(1, 'mul')
    expect(seen, 'stage 1 never streamed a multiplier bank').not.toBeNull()
    expect(seen!.open).toBe(gateMulOpen(2))
    expect(seen!.peak, 'the x2 door could not be pumped').toBeGreaterThan(seen!.open)
    expect(seen!.peak).toBeLessThanOrEqual(GATE_MUL_MAX)
  })

  it('pumps a TRAP the squad is shooting, in the direction that hurts', async () => {
    // The other half of the same rule, and the reason it matters: hosing a trap
    // has to cost something, or straddling the pillar is free.
    const seen = await rideLeaf(2, 'div')
    expect(seen, 'stage 2 never streamed a trap bank').not.toBeNull()
    expect(seen!.peak, 'the ÷N door could not be pumped').toBeGreaterThan(seen!.open)
    expect(seen!.peak).toBeLessThanOrEqual(GATE_DIV_MAX)
  })

  it('still pumps the additive doors it always did', async () => {
    const seen = await rideLeaf(1, 'add')
    expect(seen, 'stage 1 never streamed an additive bank').not.toBeNull()
    expect(seen!.peak, 'the +N door stopped pumping').toBeGreaterThan(seen!.open)
  })
})

// ─── The pump has to keep up with the doors ─────────────────────────────────
//
// A flat `+1` per half-second is a third of a stage-10 door and a ninth of a
// stage-46 one, so the one mechanic that turns a bank into a decision faded out
// exactly as the banks got big enough to matter. Both halves of the pump are
// keyed to a 15-stage band now — the step grows, the tick shortens — and these
// pin the shape of both, because the curve is the feature.

describe('the pump scales with the stage', () => {
  it('adds 0.9 of a survivor per tick per 15-stage band, in whole survivors', async () => {
    const { gatePumpStep, GATE_PUMP_BAND, GATE_GROWTH_TRIM } = await import('@/game/survival')
    expect(GATE_PUMP_BAND).toBe(15)
    expect(GATE_GROWTH_TRIM).toBe(0.9)
    expect(gatePumpStep(1)).toBe(1)
    expect(gatePumpStep(14)).toBe(1)
    // A band's step is 0.9 of a survivor, so the whole one lands two stages
    // late — and every later rise with it, a little later each band.
    expect(gatePumpStep(16)).toBe(1)
    expect(gatePumpStep(17)).toBe(2)
    expect(gatePumpStep(33)).toBe(2)
    expect(gatePumpStep(34)).toBe(3)
    expect(gatePumpStep(45)).toBe(3)
    expect(gatePumpStep(50)).toBe(4)
    // The stage the trim was asked for: 60 pumped +5 a tick and now pumps +4.
    expect(gatePumpStep(60)).toBe(4)
    expect(gatePumpStep(67)).toBe(5)
    expect(gatePumpStep(100)).toBe(7)
  })

  it('gives a `-N` the SAME step, because the two are one mechanic with a sign', async () => {
    const { gatePumpStep, gateTickMs } = await import('@/game/survival')
    // Nothing in the code branches on `sub`; this is the assertion that says so
    // out loud, since an asymmetric step would make the mirror a lie and turn
    // the bank back into arithmetic with one right answer.
    for (const stage of [1, 20, 45, 90]) {
      expect(gateTickMs('sub', stage)).toBe(gateTickMs('add', stage))
      expect(gatePumpStep(stage)).toBe(gatePumpStep(stage))
    }
  })

  it('shortens the tick 5% a band for `+/-` and 6% for `x//`', async () => {
    const { gateTickMs, GATE_TICK_MS } = await import('@/game/survival')
    expect(gateTickMs('add', 1)).toBe(GATE_TICK_MS)
    expect(gateTickMs('mul', 1)).toBe(GATE_TICK_MS)
    expect(gateTickMs('add', 15)).toBe(Math.round(GATE_TICK_MS * 0.95))
    expect(gateTickMs('mul', 15)).toBe(Math.round(GATE_TICK_MS * 0.94))
    expect(gateTickMs('add', 45)).toBe(Math.round(GATE_TICK_MS * 0.95 ** 3))
    expect(gateTickMs('div', 45)).toBe(Math.round(GATE_TICK_MS * 0.94 ** 3))
    // The scale doors keep their tenth — a multiplier climbing in whole
    // numbers would be a `+N` in disguise — so the clock is their only lever,
    // and it has to be the faster one.
    expect(gateTickMs('mul', 45)).toBeLessThan(gateTickMs('add', 45))
  })

  it('never lets the tick reach zero, because this game has no last stage', async () => {
    const { gateTickMs, GATE_TICK_MIN_MS } = await import('@/game/survival')
    // A linear `1 - 0.05 × bands` hits zero at stage 300, and a zero tick is an
    // infinite `while` in `stepGates`. Compounding can only approach the floor.
    for (const stage of [300, 1000, 100_000]) {
      expect(gateTickMs('add', stage)).toBeGreaterThanOrEqual(GATE_TICK_MIN_MS)
      expect(gateTickMs('mul', stage)).toBeGreaterThanOrEqual(GATE_TICK_MIN_MS)
    }
  })

  it('puts the mechanic back where it was worth committing for', async () => {
    const { gatePumpStep, gateTickMs } = await import('@/game/survival')
    const { gateAddBase } = await import('@/game/track')
    /** What a ~2 s in-range approach adds, as a fraction of the printed door. */
    const share = (stage: number): number => {
      const ticks = Math.floor(2000 / gateTickMs('add', stage))
      return (ticks * gatePumpStep(stage)) / gateAddBase(stage)
    }
    // It was a third of the door on the stages that teach it…
    expect(share(10)).toBeGreaterThan(0.25)
    // …and had decayed to a ninth by the stages that need it most. Both bands
    // now sit in the same place, which is the whole point of the change. (Stage
    // 46 was over 0.4 before `GATE_GROWTH_TRIM`; the trimmed step is 3 there
    // rather than 4, which still leaves it above a third.)
    expect(share(46)).toBeGreaterThan(1 / 3)
    expect(share(90)).toBeGreaterThan(0.4)
    // ── Where the curve goes, stated rather than assumed ──────────────────
    //
    // The step is LINEAR in the stage (0.9 per 15) and `gateAddBase` past the
    // campaign is LOGARITHMIC, so the ratio has no upper bound: the pump is
    // a third of a door at stage 46, a whole one somewhere around 140, and more
    // than the printed number after that. That is a deliberate consequence of the
    // rule as specified — the printed number stays the floor and the approach
    // is what earns the rest — and it is asserted here so that a later change
    // to either curve has to come past it on purpose.
    expect(share(140)).toBeGreaterThan(0.9)
    expect(share(140)).toBeLessThan(1.4)
    // Through the whole authored campaign and well past it, the door printed on
    // the leaf is still the bigger half of what it pays. Stage 1 is exempt and
    // always was: it prints `+3` against four ticks of pump, which is the one
    // road in the game where committing early IS the whole payout — that is how
    // the mechanic teaches itself, and it predates this change.
    expect(share(1)).toBeGreaterThan(1)
    for (const stage of [10, 30, 46, 90]) expect(share(stage)).toBeLessThan(1)
  })
})

describe('the tick still SOUNDS like the pump at the stages it matters on', () => {
  // The ladder is the game's loudest feedback: pitch climbs with the door's
  // value, so holding fire plays a rising phrase and letting go stops it
  // mid-bar. Its octave term was unbounded, so a `+36` door — every door past
  // stage 30 — asked the browser for 55 kHz, got a clamp and a console warning,
  // and played nothing a person can hear. Bigger pump steps only make a door
  // reach that band sooner.
  const AUDIBLE = { lo: 40, hi: 18_000 }

  it('never leaves the audible band, however far a door is pumped', async () => {
    const { tickFreq, LADDER_STEPS } = await import('@/use/useGameAudio')
    for (let v = 0; v <= 999; v++) {
      const f = tickFreq(v)
      expect(f, `+${v}`).toBeGreaterThan(AUDIBLE.lo)
      expect(f, `+${v}`).toBeLessThan(AUDIBLE.hi)
    }
    expect(LADDER_STEPS).toBe(15)
  })

  it('is a rising phrase that restarts, not a single note repeated', async () => {
    const { tickFreq, LADDER_STEPS } = await import('@/use/useGameAudio')
    const phrase = Array.from({ length: LADDER_STEPS }, (_, i) => tickFreq(i))
    for (let i = 1; i < phrase.length; i++) expect(phrase[i]!).toBeGreaterThan(phrase[i - 1]!)
    // …and the next tick starts the phrase again rather than climbing out of
    // the band, which is the whole fix.
    expect(tickFreq(LADDER_STEPS)).toBe(phrase[0])
    expect(new Set(phrase).size).toBe(LADDER_STEPS)
  })
})

// ─── The number that flies up is the number the door gained ─────────────────
//
// The pop-up was a hardcoded `+1`. From stage 20 the additive step is 2 — so a
// door climbing 8 → 10 → 12 printed `+1` over itself each time — and a scale
// door has NEVER stepped by one: it moves a tenth, and printed `+1` for it at
// every stage. Players read that as the game miscounting, which is the worst
// thing a number on a door can do, because the door's number is the whole
// decision.
describe('the pump prints its own step', () => {
  /** Ride one leaf and collect what the door gained against what it announced. */
  const rideAndListen = async (
    stage: number, op: 'mul' | 'add'
  ): Promise<{ open: number; peak: number; steps: number[] } | null> => {
    const game = await import('@/use/useSurvivalGame')
    const { drainFx } = await import('@/use/useVfx')
    const { __resetTowerState } = await import('@/use/useTowerState')
    localStorage.clear()
    __resetTowerState()
    drainFx()

    game.startStage(stage)
    game.debugAddUnits(40)

    // ONE leaf, held from the moment it streams in until its bank resolves.
    // Leaf positions repeat down the road (every two-leaf bank puts its doors
    // at the same x), so an event is this door's only if it matches both
    // coordinates — and the ride stops when this door is spent, or a later
    // bank's ticks would be counted against it.
    let leaf: { x: number; y: number; value: number; used: boolean } | null = null
    let open: number | null = null
    let peak = 0
    const steps: number[] = []
    for (let i = 0; i < 6000; i++) {
      if (!leaf) {
        const found = game.getGates().find((d) => d.op === op && !d.used)
        if (found) { leaf = found; open = found.value }
      }
      if (leaf) {
        if (leaf.used) break
        peak = Math.max(peak, leaf.value)
        game.steerTo(leaf.x)
      }
      game.step(16)
      for (const e of drainFx()) {
        if (e.kind !== 'gateTick' || !leaf) continue
        if (Math.abs(e.x - leaf.x) < 0.01 && Math.abs(e.y - leaf.y) < 0.01) steps.push(e.step)
      }
      if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
    }
    if (leaf) peak = Math.max(peak, leaf.value)
    return open === null ? null : { open, peak, steps }
  }

  it('announces a tenth on a multiplier, never a whole survivor', async () => {
    const seen = await rideAndListen(1, 'mul')
    expect(seen, 'stage 1 never streamed a multiplier bank').not.toBeNull()
    expect(seen!.steps.length, 'the x2 door never ticked').toBeGreaterThan(0)
    for (const s of seen!.steps) expect(s).toBeCloseTo(GATE_SCALE_STEP, 5)
    // And it reads as a tenth rather than as `0.1000000000000000055`.
    expect(gateValueLabel(seen!.steps[0]!)).toBe('0.1')
  })

  it('announces the stage\'s whole step on an additive door', async () => {
    const { gatePumpStep } = await import('@/game/survival')
    const stage = 20
    expect(gatePumpStep(stage), 'pick a stage where the step is not 1').toBeGreaterThan(1)

    const seen = await rideAndListen(stage, 'add')
    expect(seen, 'stage 20 never streamed an additive bank').not.toBeNull()
    expect(seen!.steps.length, 'the +N door never ticked').toBeGreaterThan(0)
    for (const s of seen!.steps) {
      // Every tick is the stage's step, except one clipped by the pump cap.
      expect(s).toBeGreaterThan(0)
      expect(s).toBeLessThanOrEqual(gatePumpStep(stage))
    }
    expect(seen!.steps.some((s) => s === gatePumpStep(stage))).toBe(true)
  })

  it('adds up: what flew up is exactly what the door gained', async () => {
    // The claim that catches any future drift, in either direction — a step the
    // sim applies without announcing, or a number announced without applying.
    for (const [stage, op] of [[1, 'mul'], [20, 'add']] as const) {
      const seen = await rideAndListen(stage, op)
      expect(seen).not.toBeNull()
      const announced = seen!.steps.reduce((a, b) => a + b, 0)
      expect(Math.round(announced * 10) / 10).toBeCloseTo(seen!.peak - seen!.open, 5)
    }
  })
})
