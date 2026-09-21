// ─── The boss's big attack is DRAWN ─────────────────────────────────────────
//
// The first throw stretched and squashed the walk frame about its feet, and the
// owner read it, rightly, as the boss being distorted rather than throwing
// anything. The attack is DRAWN now, by each boss's own rig (`monsterKit`
// "Hurling"), painted over that drawing (`artSheet.BOSS_HURLS`), and the game
// puts the rock in the hand the drawing reports (`hurlGrip`). What is pinned
// here is what would quietly break that: a boss that throws with no hand to
// put the rock in, a painter told the wrong arm, a throw that does not go up.
//
// Two attacks share the slot now — a meteor boss THROWS, the wyrm BREATHES —
// and the difference is pinned as hard as the throw is: a breath must report no
// hand at all, because the one thing the game must never do with it is put a
// burning rock in a mouth it is not holding one in.

import { describe, expect, it } from 'vitest'
import { MONSTERS } from '@/game/monsters'
import { drawHurl, hurlingAt, HURL_KEYS, HURL_RELEASE_PANEL } from '@/game/monsterKit'
import { BOSS_HURLS, HURL_HOW, bossAttacks, hurlDesigns } from '@/game/artSheet'
import { BREATH_KEYS, breathBeats } from '@/game/monsterKit'
import { bossKindFor } from '@/game/threats'
import { bossDesign } from '@/game/foes'

/**
 * A 2D context that draws nothing and tracks only the transform — enough to
 * run a rig and read back where it said the hand was.
 */
const trackingCtx = (): CanvasRenderingContext2D => {
  type M = [number, number, number, number, number, number]
  let m: M = [1, 0, 0, 1, 0, 0]
  const stack: M[] = []
  const mul = (n: M): void => {
    const [a, b, c, d, e, f] = m
    m = [
      a * n[0] + c * n[1], b * n[0] + d * n[1],
      a * n[2] + c * n[3], b * n[2] + d * n[3],
      a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f
    ]
  }
  const paint = { addColorStop: (): void => {} }
  const own: Record<string, unknown> = {
    save: () => { stack.push([...m] as M) },
    restore: () => { m = stack.pop() ?? m },
    translate: (x: number, y: number) => mul([1, 0, 0, 1, x, y]),
    rotate: (r: number) => mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
    scale: (x: number, y: number) => mul([x, 0, 0, y, 0, 0]),
    transform: (a: number, b: number, c: number, d: number, e: number, f: number) => mul([a, b, c, d, e, f]),
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => { m = [a, b, c, d, e, f] },
    resetTransform: () => { m = [1, 0, 0, 1, 0, 0] },
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    createRadialGradient: () => paint,
    createLinearGradient: () => paint,
    createPattern: () => paint,
    measureText: () => ({ width: 0 })
  }
  return new Proxy(own, {
    get: (t, k: string) => (k in t ? t[k] : () => {}),
    set: () => true
  }) as unknown as CanvasRenderingContext2D
}

const S = 100
const gripsOf = (design: string): Array<[number, number] | null> => {
  const def = MONSTERS.find((d) => d.id === design)!
  const out: Array<[number, number] | null> = []
  for (let i = 0; i < HURL_KEYS; i++) {
    const ctx = trackingCtx()
    out.push(drawHurl(i / (HURL_KEYS - 1), () => def.draw(ctx, S, 0)))
  }
  return out
}

/** The designs whose sheet is a THROW — the wyrm's is a breath. */
const throwDesigns = (): string[] =>
  BOSS_HURLS.filter((h) => h.attack === 'hurl').map((h) => h.design)

describe('every meteor boss throws with a hand the rock can sit in', () => {
  it('paints an attack for exactly the designs that have one', () => {
    const attackers = new Set<string>()
    for (let n = 1; n <= 120; n++) {
      const kind = bossKindFor(n)
      if (kind === 'meteor' || kind === 'wyrm') attackers.add(bossDesign(n))
    }
    expect(new Set(hurlDesigns())).toEqual(attackers)
    expect(BOSS_HURLS.map((h) => h.design).sort()).toEqual([...attackers].sort())
    // …and the painter is told how each one does it.
    for (const d of attackers) expect(HURL_HOW[d], d).toBeDefined()
    // …and which of the two it is, from the kinds rather than from a list.
    const attacks = bossAttacks()
    for (const h of BOSS_HURLS) expect(h.attack, h.design).toBe(attacks.get(h.design))
  })

  it('reports the hand in every panel of every throw', () => {
    for (const design of throwDesigns()) {
      const grips = gripsOf(design)
      grips.forEach((g, i) => {
        expect(g, `${design} panel ${i + 1}`).not.toBeNull()
        expect(Number.isFinite(g![0]) && Number.isFinite(g![1])).toBe(true)
      })
    }
  })

  it('tells the painter the arm the rig actually throws with', () => {
    for (const design of throwDesigns()) {
      const cocked = gripsOf(design)[3]!
      const how = HURL_HOW[design]!
      // A side-on beast's head is on the left of its panel as drawn.
      const wantLeft = how.side === 'left' || how.side === 'head'
      expect(cocked[0] < 0, `${design}: HURL_HOW says ${how.side}`).toBe(wantLeft)
    }
  })

  it('lifts the rock on the cock and lets it go high', () => {
    for (const design of throwDesigns()) {
      const g = gripsOf(design)
      // Screen y grows downward: the cocked and released hand are above the
      // scooping one, and the release is above where it ends up.
      expect(g[3]![1], `${design} cocked above the scoop`).toBeLessThan(g[1]![1])
      expect(g[HURL_RELEASE_PANEL]![1], `${design} release above the follow-through`)
        .toBeLessThan(g[HURL_RELEASE_PANEL + 1]![1])
    }
  })

  it('starts and ends on the same ready pose, so the cut from and back to the walk is clean', () => {
    for (const design of throwDesigns()) {
      const g = gripsOf(design)
      expect(g[0]![0]).toBeCloseTo(g[HURL_KEYS - 1]![0], 6)
      expect(g[0]![1]).toBeCloseTo(g[HURL_KEYS - 1]![1], 6)
    }
  })

  it('puts no hand in a breath, and brings the body back where it started', () => {
    // A breath has no grip: nothing is thrown, and a rig that reported one
    // would have the game paint a burning rock into an empty mouth.
    for (const h of BOSS_HURLS.filter((x) => x.attack === 'breath')) {
      for (const g of gripsOf(h.design)) expect(g, `${h.design} reported a hand`).toBeNull()
    }
    // The strip is cut from and back to the walk, so its first and last panels
    // have to be the same pose — read off the beats, which is where a breath's
    // poses come from (there is no grip to compare).
    const a = breathBeats(0)
    const b = breathBeats(1)
    expect(a.draw).toBe(b.draw)
    expect(a.gape).toBe(b.gape)
    expect(a.throat).toBe(b.throat)
    expect(a.effort).toBe(b.effort)
    // …and the throat is lit only while the breath is being drawn.
    expect(breathBeats(2 / (BREATH_KEYS - 1)).throat).toBeGreaterThan(0.5)
    expect(breathBeats(5 / (BREATH_KEYS - 1)).throat).toBe(0)
  })

  it('leaves the living cycle alone', () => {
    const def = MONSTERS.find((d) => d.id === 'grumpling')!
    drawHurl(0.5, () => def.draw(trackingCtx(), S, 0))
    expect(hurlingAt()).toBeNull()
    // A walk frame reports no hand at all.
    expect(drawHurl(0, () => {})).toBeNull()
  })
})
