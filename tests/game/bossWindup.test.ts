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
  DRAIN_REACH_AT, HURL_FOLLOW_SHARE, METEOR_RELEASE, POSE_AFTER_S, REST_POSE, bossPose, chargeDashAt,
  hurlArc, hurlPoint, meteorHurlPanel, type BossPose, type WindupKind
} from '@/game/bossWindup'
import { HURL_KEYS, HURL_RELEASE_PANEL } from '@/game/monsterKit'
import { CHARGE_DASH_S } from '@/game/threats'

const KINDS: WindupKind[] = ['meteor', 'shock', 'charge', 'rake', 'heal', 'bolt', 'summon', 'drain']

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
  // The owner's call: the squash-and-stretch throw "distorts the boss instead
  // of animating its arms". The throw is in the DRAWING now; the body pose on
  // top of it must stay at rest for the whole cast, charged or not.
  it('never stretches, squashes, tilts or shakes the body', () => {
    for (let i = 0; i <= 100; i++) {
      for (const charged of [false, true]) {
        for (const side of [-1, 1]) {
          const q = bossPose('meteor', i / 100, { side, charged })
          expect(atRest({ ...q, glow: REST_POSE.glow })).toBe(true)
        }
      }
    }
  })

  it('plays the drawn throw in order, releasing on the frame the rock leaves', () => {
    let last = -1
    let released = false
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000
      const panel = meteorHurlPanel(p)
      if (panel === null) {
        // Back on the walk before the rock lands — and it stays there.
        expect(p).toBeGreaterThan(METEOR_RELEASE)
        last = HURL_KEYS
        continue
      }
      expect(last).toBeLessThan(HURL_KEYS)
      expect(panel).toBeGreaterThanOrEqual(last)
      expect(panel).toBeLessThan(HURL_KEYS)
      // Holding the rock strictly before the release, empty-handed after it.
      if (p < METEOR_RELEASE) expect(panel).toBeLessThan(HURL_RELEASE_PANEL)
      else expect(panel).toBeGreaterThanOrEqual(HURL_RELEASE_PANEL)
      if (panel === HURL_RELEASE_PANEL) released = true
      last = panel
    }
    expect(released).toBe(true)
    expect(meteorHurlPanel(0)).toBe(0)
    expect(meteorHurlPanel(METEOR_RELEASE)).toBe(HURL_RELEASE_PANEL)
    expect(meteorHurlPanel(1)).toBeNull()
  })

  it('gives every panel of the throw the same beat, either side of the release', () => {
    const gather = METEOR_RELEASE / HURL_RELEASE_PANEL
    const follow = ((1 - METEOR_RELEASE) * HURL_FOLLOW_SHARE) / (HURL_KEYS - HURL_RELEASE_PANEL)
    // Within a fifth of each other: a throw whose wind-up plays at one speed
    // and its follow-through at another reads as a hitch.
    expect(Math.abs(gather - follow) / gather).toBeLessThan(0.2)
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

describe('the drain reaches down the column it announced', () => {
  it('gathers with the arms up, then reaches FORWARD on the beat', () => {
    const gathered = bossPose('drain', DRAIN_REACH_AT - 1e-6)
    expect(gathered.sy, 'the gather is not a rise').toBeGreaterThan(1.05)
    expect(gathered.shake, 'the gather does not tremble into the reach').toBeGreaterThan(0)
    const reached = bossPose('drain', 1)
    // Down the road toward the crowd — a lunge at the camera, not a lean to one
    // side: the column comes straight down from the boss.
    expect(reached.dip, 'the reach does not point down the column').toBeGreaterThan(0.08)
    expect(reached.sy).toBeLessThan(1)
  })

  it('holds the reach, trembling, for as long as the beam pulls', () => {
    const holding = bossPose('drain', 1, { holding: true })
    expect(holding.dip).toBeCloseTo(bossPose('drain', 1).dip, 9)
    expect(holding.shake, 'a beam that pulls with a still body reads as a picture').toBeGreaterThan(0)
    // …and lets go like any landed strike once the beam does.
    expect(atRest(bossPose('drain', 1, { after: POSE_AFTER_S }))).toBe(true)
  })
})
