// ─── The body winds up on the same beat as the tell ─────────────────────────
//
// "The meteor comes from nowhere" — the boss stood still while its rock fell
// out of the top of the screen. Every wind-up now has a pose and the meteor is
// thrown from the boss's hands. The renderer applies these curves; what is
// pinned here is the part that could quietly lie to the player: a throw that
// lands off the beat, a stomp that lands before or after the ring, a body left
// frozen mid-swing when its cast is dropped.

import { describe, expect, it } from 'vitest'
import {
  METEOR_RELEASE, POSE_AFTER_S, REST_POSE, bossPose, chargeDashAt, hurlArc, hurlPoint,
  type BossPose, type WindupKind
} from '@/game/bossWindup'
import { CHARGE_DASH_S } from '@/game/threats'

const KINDS: WindupKind[] = ['meteor', 'shock', 'charge', 'rake', 'heal', 'bolt', 'summon']

const atRest = (q: BossPose, eps = 1e-6): boolean =>
  (Object.keys(REST_POSE) as Array<keyof BossPose>).every((k) => Math.abs(q[k] - REST_POSE[k]) < eps)

describe('the pose curves', () => {
  it('are finite and bounded for every kind across the whole wind-up', () => {
    for (const kind of KINDS) {
      for (let i = 0; i <= 100; i++) {
        const q = bossPose(kind, i / 100, { side: -1, charged: true, life: 1.6, dashS: CHARGE_DASH_S })
        for (const v of Object.values(q)) expect(Number.isFinite(v)).toBe(true)
        // A pose is a gesture, not a transformation: nothing folds the body over.
        expect(Math.abs(q.lean)).toBeLessThan(0.3)
        expect(q.sx).toBeGreaterThan(0.7)
        expect(q.sy).toBeGreaterThan(0.7)
        expect(q.sx).toBeLessThan(1.3)
        expect(q.sy).toBeLessThan(1.3)
      }
    }
  })

  it('start from rest, so a cast arriving never pops the body', () => {
    for (const kind of KINDS) {
      const q = bossPose(kind, 0, { life: 1.6, dashS: CHARGE_DASH_S })
      if (kind === 'charge') {
        // The charge's dash can start at p = 0 only when the whole wind-up is a
        // dash; with a real coil it starts from rest like every other kind.
        expect(chargeDashAt(1.6, CHARGE_DASH_S)).toBeGreaterThan(0)
      }
      expect(atRest(q)).toBe(true)
    }
  })

  it('settle back to rest by the end of the after-window', () => {
    for (const kind of KINDS) {
      expect(atRest(bossPose(kind, 1, { after: POSE_AFTER_S, life: 1.6, dashS: CHARGE_DASH_S }))).toBe(true)
    }
  })
})

describe('the meteor is thrown, not dropped', () => {
  it('rears up with the rock, snaps forward on the release, and is still by the impact', () => {
    const held = bossPose('meteor', METEOR_RELEASE - 1e-6, { side: 1 })
    expect(held.sy).toBeGreaterThan(1.05)
    expect(held.lean).toBeLessThan(0) // wound back, away from the target side
    const thrown = bossPose('meteor', METEOR_RELEASE + (1 - METEOR_RELEASE) * 0.16, { side: 1 })
    expect(thrown.sy).toBeLessThan(0.95)
    expect(thrown.lean).toBeGreaterThan(0) // follow-through toward it
    expect(atRest(bossPose('meteor', 1, { side: 1 }))).toBe(true)
  })

  it('leans toward whichever side the mark is on', () => {
    const post = METEOR_RELEASE + (1 - METEOR_RELEASE) * 0.16
    expect(bossPose('meteor', post, { side: -1 }).lean).toBeLessThan(0)
    expect(bossPose('meteor', post, { side: 1 }).lean).toBeGreaterThan(0)
  })

  it('a charged rock gets the bigger wind-up', () => {
    const p = METEOR_RELEASE - 1e-6
    expect(bossPose('meteor', p, { charged: true }).sy).toBeGreaterThan(bossPose('meteor', p).sy)
  })

  it('leaves the hands and lands EXACTLY on the mark at the impact', () => {
    const from = { x: 180, y: 220 }
    const to = { x: 120, y: 620 }
    const arc = hurlArc(from.y, to.y, 300, 20)
    const start = hurlPoint(0, from.x, from.y, to.x, to.y, arc)
    const end = hurlPoint(1, from.x, from.y, to.x, to.y, arc)
    expect(start.x).toBeCloseTo(from.x, 9)
    expect(start.y).toBeCloseTo(from.y, 9)
    expect(end.x).toBeCloseTo(to.x, 9)
    expect(end.y).toBeCloseTo(to.y, 9)
    // It is a lob: it climbs off the hands before it comes down, and it is
    // travelling DOWN onto the mark when it arrives.
    expect(hurlPoint(0.15, from.x, from.y, to.x, to.y, arc).y).toBeLessThan(from.y)
    expect(end.dy).toBeGreaterThan(0)
  })

  it('never throws the rock off the top of the screen', () => {
    for (const fromY of [40, 120, 260, 400]) {
      for (const want of [50, 200, 600, 2000]) {
        const top = 24
        const arc = hurlArc(fromY, 700, want, top)
        let minY = Number.POSITIVE_INFINITY
        for (let i = 0; i <= 200; i++) minY = Math.min(minY, hurlPoint(i / 200, 0, fromY, 0, 700, arc).y)
        expect(minY).toBeGreaterThanOrEqual(Math.min(top, fromY) - 1e-6)
      }
    }
  })
})

describe('the stomp and the dash land on their beat', () => {
  it('a shock lifts the body and brings it down on the frame the ring lands', () => {
    expect(bossPose('shock', 0.8).lift).toBeGreaterThan(0.1)
    const impact = bossPose('shock', 1)
    expect(impact.lift).toBeCloseTo(0, 9)
    expect(impact.sy).toBeLessThan(0.9) // planted, squashed
  })

  it('a charge coils with a GROWING tremble, then stretches into the run', () => {
    const life = 1.6
    const at = chargeDashAt(life, CHARGE_DASH_S)
    const o = { life, dashS: CHARGE_DASH_S }
    const early = bossPose('charge', at * 0.3, o)
    const late = bossPose('charge', at * 0.95, o)
    expect(late.shake).toBeGreaterThan(early.shake)
    expect(late.sy).toBeLessThan(0.9) // crouched
    const running = bossPose('charge', 1, o)
    expect(running.sy).toBeGreaterThan(1.05) // stretched along the run
  })
})
