// ─── The meteor is thrown by the ARMS ───────────────────────────────────────
//
// The first throw stretched and squashed the walk frame about its feet, and the
// owner read it, rightly, as the boss being distorted rather than throwing
// anything. The throw is DRAWN now, by each boss's own rig (`monsterKit`
// "Hurling"), painted over that drawing (`artSheet.BOSS_HURLS`), and the game
// puts the rock in the hand the drawing reports (`hurlGrip`). What is pinned
// here is what would quietly break that: a boss that throws with no hand to
// put the rock in, a painter told the wrong arm, a throw that does not go up.

import { describe, expect, it } from 'vitest'
import { MONSTERS } from '@/game/monsters'
import { drawHurl, hurlingAt, HURL_KEYS, HURL_RELEASE_PANEL } from '@/game/monsterKit'
import { BOSS_HURLS, HURL_HOW, hurlDesigns } from '@/game/artSheet'
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

describe('every meteor boss throws with a hand the rock can sit in', () => {
  it('paints a throw for exactly the designs that throw meteors', () => {
    const throwers = new Set<string>()
    for (let n = 1; n <= 120; n++) if (bossKindFor(n) === 'meteor') throwers.add(bossDesign(n))
    expect(new Set(hurlDesigns())).toEqual(throwers)
    expect(BOSS_HURLS.map((h) => h.design).sort()).toEqual([...throwers].sort())
    // …and the painter is told how each one throws.
    for (const d of throwers) expect(HURL_HOW[d], d).toBeDefined()
  })

  it('reports the hand in every panel of every throw', () => {
    for (const design of hurlDesigns()) {
      const grips = gripsOf(design)
      grips.forEach((g, i) => {
        expect(g, `${design} panel ${i + 1}`).not.toBeNull()
        expect(Number.isFinite(g![0]) && Number.isFinite(g![1])).toBe(true)
      })
    }
  })

  it('tells the painter the arm the rig actually throws with', () => {
    for (const design of hurlDesigns()) {
      const cocked = gripsOf(design)[3]!
      const how = HURL_HOW[design]!
      // A side-on beast's head is on the left of its panel as drawn.
      const wantLeft = how.side === 'left' || how.side === 'head'
      expect(cocked[0] < 0, `${design}: HURL_HOW says ${how.side}`).toBe(wantLeft)
    }
  })

  it('lifts the rock on the cock and lets it go high', () => {
    for (const design of hurlDesigns()) {
      const g = gripsOf(design)
      // Screen y grows downward: the cocked and released hand are above the
      // scooping one, and the release is above where it ends up.
      expect(g[3]![1], `${design} cocked above the scoop`).toBeLessThan(g[1]![1])
      expect(g[HURL_RELEASE_PANEL]![1], `${design} release above the follow-through`)
        .toBeLessThan(g[HURL_RELEASE_PANEL + 1]![1])
    }
  })

  it('starts and ends on the same ready pose, so the cut from and back to the walk is clean', () => {
    for (const design of hurlDesigns()) {
      const g = gripsOf(design)
      expect(g[0]![0]).toBeCloseTo(g[HURL_KEYS - 1]![0], 6)
      expect(g[0]![1]).toBeCloseTo(g[HURL_KEYS - 1]![1], 6)
    }
  })

  it('leaves the living cycle alone', () => {
    const def = MONSTERS.find((d) => d.id === 'grumpling')!
    drawHurl(0.5, () => def.draw(trackingCtx(), S, 0))
    expect(hurlingAt()).toBeNull()
    // A walk frame reports no hand at all.
    expect(drawHurl(0, () => {})).toBeNull()
  })
})
