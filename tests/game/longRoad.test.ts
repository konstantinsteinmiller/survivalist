import { describe, expect, it } from 'vitest'
import {
  buildTrack, FOE_GAP_S, GATE_TWIN_FLOOR, GATE_TWIN_SHARE, GUARD_LEAD, guardFile,
  isLongRoad, LONG_ROAD_FROM, minDamageCrates, minRateCrates, PAIR_GAP, weaponSlotIdFor,
  type TrackEvent
} from '@/game/track'
import { STAGE_RUN_BLEND_TO, stageSpeed } from '@/game/survival'
import { stageHasWeapon, weaponForStage, WEAPON_DEBUT } from '@/game/weapons'

/**
 * ─── The long middle road, stages 16-29 (2026-09-18) ───────────────────────
 *
 * The length pass took these roads from 38-45 s of running to 47-57 s, and the
 * owner asked for the extra road to carry MORE TO SHOOT ("too few dynamic
 * obstacles like monsters — increase that, especially on empty road stretches;
 * shooting is the primary mechanic") and for every gate pair to be a sum rather
 * than a reading test. See "The long middle road" in track.ts. These are the
 * promises that pass makes, measured where it made them:
 *
 *   • no stretch of road runs long with nothing alive on it — measured before
 *     the pass at 6.8-11.9 s, with two to five holes over 5 s on every road;
 *   • a `+N | +M` twin is split and, where its corridor is free, GUARDED by a
 *     file of bodies in front of the better door;
 *   • the landmarks are spread out, never one fight on top of another;
 *   • the supply floors follow the length of the road;
 *   • and a weapon box on EVERY stage of the band, placed and dealt so no two
 *     consecutive boxes and no weapon repeat themselves.
 *
 * Stages 30+ are the frozen legacy road — `lateStagesFrozen.test.ts` pins it
 * prop for prop, which is also the proof that none of this leaks past 29.
 */

const LONG = Array.from({ length: STAGE_RUN_BLEND_TO - LONG_ROAD_FROM }, (_, i) => LONG_ROAD_FROM + i)

type Bank = Extract<TrackEvent, { kind: 'gates' }>
type Foes = Extract<TrackEvent, { kind: 'foes' }>

const banksOn = (stage: number): Bank[] =>
  buildTrack(stage).events.filter((e): e is Bank => e.kind === 'gates').sort((p, q) => p.y - q.y)

const isTwin = (b: Bank): boolean =>
  b.leaves.length === 2 && b.leaves.every((l) => l.op === 'add' && !l.prize)

describe('the long middle road', () => {
  it('is exactly the generated stages the length pass lengthened', () => {
    expect(LONG[0]).toBe(16)
    expect(LONG[LONG.length - 1]).toBe(29)
    for (const s of [1, 8, 15, 30, 31, 60]) expect(isLongRoad(s), `stage ${s}`).toBe(false)
    for (const s of LONG) expect(isLongRoad(s), `stage ${s}`).toBe(true)
  })

  it('never runs long with nothing alive on it', () => {
    // Between the road's opening and the closing bank's run-in (the two ends
    // the fill pass deliberately leaves alone). Measured after the pass: the
    // longest hole is 3.9-7.1 s, and at most two per road run past 5 s — the
    // breathers the pass keeps on purpose: the run-up to an elite and the three
    // seconds after a mass beat, where no wave may stand.
    // Before: 6.8-11.9 s, with two to five holes over 5 s on every road.
    for (const stage of LONG) {
      const t = buildTrack(stage)
      const end = t.arenaY - 16
      const alive = t.events
        .filter((e) => (e.kind === 'foes' && !e.forGift) || e.kind === 'miniboss')
        .map((e) => e.y)
        .sort((p, q) => p - q)
      let prev = 20
      let worst = 0
      let over = 0
      for (const y of [...alive, end]) {
        const gap = Math.min(y, end) - prev
        if (gap > FOE_GAP_S * stageSpeed(stage) * 1.25) over++
        worst = Math.max(worst, gap)
        prev = Math.max(prev, y)
      }
      expect(worst / stageSpeed(stage), `stage ${stage}: a ${(worst / stageSpeed(stage)).toFixed(1)} s hole`)
        .toBeLessThan(7.5)
      expect(over, `stage ${stage} has ${over} long holes`).toBeLessThanOrEqual(2)
    }
  })

  it('splits every `+N | +M` twin past the opening bank, so the fat door reads from across the lane', () => {
    for (const stage of LONG) {
      const banks = banksOn(stage)
      for (const [i, b] of banks.entries()) {
        if (i === 0 || !isTwin(b)) continue
        if (banks.some((o) => o !== b && Math.abs(o.y - b.y) <= PAIR_GAP + 0.1)) continue
        const fat = Math.max(...b.leaves.map((l) => l.value))
        const thin = Math.min(...b.leaves.map((l) => l.value))
        if (fat < GATE_TWIN_FLOOR) continue
        expect(thin, `stage ${stage} y=${b.y}: +${fat} | +${thin} is still a twin`)
          .toBeLessThanOrEqual(Math.max(1, Math.round(fat * GATE_TWIN_SHARE)))
      }
    }
  })

  it('stands a file of bodies in front of the fat door — and never in front of a `?`', () => {
    let guarded = 0
    for (const stage of LONG) {
      const t = buildTrack(stage)
      const singles = t.events.filter((e): e is Foes => e.kind === 'foes' && e.count === 1)
      for (const b of banksOn(stage)) {
        if (!isTwin(b)) continue
        const fatX = b.leaves.reduce((p, q) => (q.value > p.value ? q : p)).x
        const thinX = b.leaves.reduce((p, q) => (q.value < p.value ? q : p)).x
        const inFront = singles.filter((f) => f.y >= b.y - GUARD_LEAD - 0.01 && f.y < b.y)
        // A lone body is dealt at `-spread` (see `stray`).
        const onFat = inFront.filter((f) => Math.abs(-f.spread - fatX) < 0.01)
        const onThin = inFront.filter((f) => Math.abs(-f.spread - thinX) < 0.01)
        if (onFat.length === 0) continue
        guarded++
        // Two at the top of the road, the stage's full file from 60 % on.
        expect(onFat.length, `stage ${stage} y=${b.y}`).toBeGreaterThanOrEqual(2)
        expect(onFat.length, `stage ${stage} y=${b.y}`).toBeLessThanOrEqual(guardFile(stage))
        expect(onThin.length, `stage ${stage} y=${b.y}: the thin door is guarded too`).toBe(0)
        // The file says which door is the good one, so it may never stand in
        // front of a face-down bank ("one look for all").
        expect(b.leaves.some((l) => l.mystery), `stage ${stage} y=${b.y} guards a ?`).toBe(false)
      }
    }
    // Measured: 30 guarded doors across the band — the rest are declined for an
    // elite, the puzzle, a `?` or a slalom in the corridor. A floor under that,
    // so a re-roll can move a few without the spec caring, and a pass that
    // stopped laying them cannot hide.
    expect(guarded).toBeGreaterThan(20)
  })

  it('keeps its landmarks apart', () => {
    for (const stage of LONG) {
      const t = buildTrack(stage)
      const elites = t.events.filter((e) => e.kind === 'miniboss').map((e) => e.y).sort((p, q) => p - q)
      for (let i = 1; i < elites.length; i++) {
        expect(elites[i]! - elites[i - 1]!, `stage ${stage}: two elites at ${elites[i - 1]} and ${elites[i]}`)
          .toBeGreaterThanOrEqual(30)
      }
    }
  })

  it('pays out supplies by the length of the road, and hands over to 30 without a step down', () => {
    for (const stage of LONG) {
      expect(minRateCrates(stage), `stage ${stage}`).toBeGreaterThanOrEqual(minRateCrates(15))
      expect(minRateCrates(stage), `stage ${stage}`).toBeLessThanOrEqual(minRateCrates(30))
      expect(minDamageCrates(stage), `stage ${stage}`).toBeLessThanOrEqual(minDamageCrates(30))
    }
    // Stage 16 went from 264 units to 384 and its floor with it: 4 → 6 rate.
    expect(minRateCrates(16)).toBe(6)
    expect(minDamageCrates(16)).toBe(3)
  })
})

describe('a weapon box on every stage of the long road', () => {
  it('carries one on every stage 16-29, and every other stage either side', () => {
    for (const s of LONG) expect(stageHasWeapon(s), `stage ${s}`).toBe(true)
    for (const s of [5, 7, 13, 15, 31, 33, 41]) expect(stageHasWeapon(s), `stage ${s}`).toBe(false)
    for (const s of [14, 30, 32, 40]) expect(stageHasWeapon(s), `stage ${s}`).toBe(true)
  })

  it('shows the whole arsenal in any seven consecutive boxes, and never one weapon twice running', () => {
    // Six weapons, a box a stage: any seven boxes in a row deal all six, so no
    // weapon's shop row sits idle for more than six stages.
    // Exactly one of the 6^7 odd-stage deals manages it together with the two
    // rules below — see `WEAPON_CAMPAIGN`.
    const deal = LONG.map((s) => weaponForStage(s))
    for (let i = 0; i + 7 <= deal.length; i++) {
      expect(new Set(deal.slice(i, i + 7)).size, `boxes ${LONG[i]}-${LONG[i + 6]}`).toBe(6)
    }
    for (let i = 1; i < deal.length; i++) expect(deal[i], `stage ${LONG[i]}`).not.toBe(deal[i - 1])
    expect(weaponForStage(30)).not.toBe(deal[deal.length - 1])
    for (const [i, w] of deal.entries()) expect(LONG[i]!).toBeGreaterThanOrEqual(WEAPON_DEBUT[w])
  })

  it('never parks the same weapon in the same place twice', () => {
    const seen = new Map<string, Set<string>>()
    for (const s of LONG) {
      const w = weaponForStage(s)
      const slot = weaponSlotIdFor(s)
      if (!seen.has(w)) seen.set(w, new Set())
      expect(seen.get(w)!.has(slot), `stage ${s}: ${w} again at ${slot}`).toBe(false)
      seen.get(w)!.add(slot)
    }
  })

  it('leans toward the boxes that arm the whole road', () => {
    const slots = LONG.map((s) => weaponSlotIdFor(s))
    const early = slots.filter((x) => x === 'early' || x === 'mid').length
    expect(early, slots.join(',')).toBeGreaterThan(slots.length / 2)
  })
})

// ─── No door pair is a reading test ────────────────────────────────────────
//
// Owner's call (2026-09-18): a `+N | +M` pair with nothing in the way is not a
// decision. Every two-door all-add bank on the long road must either have a
// guard file standing in the fat door's corridor (`layGuards`) or have been
// turned into a sum (`pricesBareTwins`) — except the face-down ones, where the
// `?` is the question.
describe('the long road has no bare twin', () => {
  type Bank = Extract<TrackEvent, { kind: 'gates' }>
  const hasFile = (events: TrackEvent[], bank: Bank): boolean => {
    const fatX = bank.leaves[0]!.value >= bank.leaves[1]!.value ? bank.leaves[0]!.x : bank.leaves[1]!.x
    return events.filter((e) => e.kind === 'foes' && e.count === 1 && e.y < bank.y
      && e.y > bank.y - 18 && Math.sign(-e.spread) === Math.sign(fatX)).length >= 2
  }

  it('guards or prices every plain two-add bank on 16-29', () => {
    for (let stage = 16; stage < STAGE_RUN_BLEND_TO; stage++) {
      const events = buildTrack(stage).events
      for (const e of events) {
        if (e.kind !== 'gates' || e.leaves.length !== 2) continue
        if (e.leaves.some((l) => l.mystery)) continue
        if (!e.leaves.every((l) => l.op === 'add')) continue
        expect(hasFile(events, e), `stage ${stage} y=${e.y}: +${e.leaves[0]!.value} | +${e.leaves[1]!.value} with nothing in the way`)
          .toBe(true)
      }
    }
  })

  it('prices the multiplier it prints near the tie, and never lets it pump', () => {
    let priced = 0
    for (let stage = 16; stage < STAGE_RUN_BLEND_TO; stage++) {
      for (const e of buildTrack(stage).events) {
        if (e.kind !== 'gates') continue
        for (const l of e.leaves) {
          if (l.op !== 'mul' || l.pumpCap === undefined) continue
          priced++
          // Fixed: a × door pumps in tenths of the whole crowd.
          expect(l.pumpCap, `stage ${stage} y=${e.y}`).toBe(l.value)
          expect(l.value).toBeGreaterThanOrEqual(1.1)
          expect(l.value).toBeLessThanOrEqual(3)
        }
      }
    }
    // The pass actually does something: dozens of banks across the band.
    expect(priced).toBeGreaterThan(20)
  })
})
