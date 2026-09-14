// ─── The canvas pixel budget, and the device class that shrinks it ──────────
//
// Why it exists: a playtest report from a Chromebook — `ANGLE (freedreno,
// FD618, OpenGL ES 3.2)`, `devicePixelRatio` 1.6, a 1366x768 window — running
// the game at 5–12 fps and quitting after fifteen seconds.
//
// Two holes, both of them in what the renderer was allowed to ASSUME:
//
//   · the DPR cap priced the canvas off the device's pixel grid and never off
//     the window it has to fill. The same cap that gives the tuned phone
//     profile 1.51 Mpx gives that Chromebook 2.69 Mpx — 1.8x the pixels for a
//     road that is a third of the width, because the lane is fitted by height
//     and the rest of a 16:9 window is off-lane terrain;
//   · the quality ladder is a MEASUREMENT, so it cannot help a player who
//     leaves during it. The frames it needs to measure are rendered at the
//     resolution it has not yet decided is wrong.
//
// So the cap became a budget in finished pixels, and a device that names a
// known-weak GPU before the first frame gets a smaller one. What is pinned here
// is the part that must not drift: every phone profile the game was tuned on
// renders EXACTLY as it did, and the budget only ever takes pixels away.

import { afterEach, describe, expect, it } from 'vitest'

import { classifyRenderer } from '@/use/deviceProfile'
import { renderScaleFor } from '@/use/useVfx'

/** Finished pixels for a window at a scale — the thing the budget bounds. */
const px = (w: number, h: number, dpr: number): number => Math.round(w * dpr) * Math.round(h * dpr)

/** jsdom reports `devicePixelRatio` 1, which is the one device where the DPR
 *  cap and the budget can never disagree. Every case below is about a device
 *  whose grid is finer than that, so the ratio is set per case. */
const atDpr = (ratio: number): void => {
  Object.defineProperty(window, 'devicePixelRatio', { value: ratio, configurable: true })
}
afterEach(() => atDpr(1))

describe('classifyRenderer', () => {
  it('calls the Chromebook from the report weak', () => {
    // The exact string in the playtest report.
    expect(classifyRenderer('ANGLE (freedreno, FD618, OpenGL ES 3.2)')).toBe('weak')
  })

  it('calls the budget mobile and software parts weak', () => {
    for (const name of [
      'Adreno (TM) 618',
      'ANGLE (Qualcomm, Adreno (TM) 530, OpenGL ES 3.2)',
      'Mali-T860',
      'Mali-G52',
      'PowerVR Rogue GE8320',
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
      'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.6)'
    ]) {
      expect(classifyRenderer(name), name).toBe('weak')
    }
  })

  it('leaves current parts alone', () => {
    // A false positive is a permanently softer game for a player whose device
    // was fine, so the table has to stay narrow: current flagship mobile parts,
    // Apple silicon and every discrete GPU are `normal`.
    for (const name of [
      'ANGLE (Qualcomm, Adreno (TM) 750, OpenGL ES 3.2)',
      'ANGLE (ARM, Mali-G715, OpenGL ES 3.2)',
      'Apple GPU',
      'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD, AMD Radeon RX 7900 XT, D3D11)',
      'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics, D3D11)',
      ''
    ]) {
      expect(classifyRenderer(name), name).toBe('normal')
    }
  })
})

describe('renderScaleFor', () => {
  it('leaves the tuned phone profile exactly where it was', () => {
    // 412x915 at DPR 2 is 1.51 Mpx — inside the `high` budget, so the budget
    // does not touch it and the answer is the old DPR cap's answer. If this
    // ever changes, every measurement in PERF-LEDGER taken on this profile is
    // about a different game.
    atDpr(2)
    expect(renderScaleFor(412, 915, 'high')).toBe(2)
    expect(px(412, 915, renderScaleFor(412, 915, 'high'))).toBeLessThan(2_100_000)
  })

  it('never exceeds the tier cap, whatever the window', () => {
    // The budget is a ceiling on TOP of the cap, never a licence to go above
    // it: a tiny window at `min` must not be handed a DPR-2 canvas.
    atDpr(3)
    expect(renderScaleFor(200, 300, 'min')).toBeLessThanOrEqual(0.8)
    expect(renderScaleFor(200, 300, 'low')).toBeLessThanOrEqual(1.25)
    expect(renderScaleFor(200, 300, 'medium')).toBeLessThanOrEqual(1.5)
    expect(renderScaleFor(200, 300, 'high')).toBeLessThanOrEqual(2)
  })

  it('holds a wide desktop window inside its budget', () => {
    // The report's window. jsdom has no WebGL, so the class resolves `normal`
    // — the budget alone has to do work here, and it does: 2.69 Mpx becomes
    // 2.10.
    atDpr(1.6)
    const dpr = renderScaleFor(1366, 768, 'high')
    expect(px(1366, 768, dpr)).toBeLessThanOrEqual(2_100_000 * 1.01)
    expect(dpr).toBeLessThan(1.6)
  })

  it('gives each rung less than the one above', () => {
    atDpr(1.6)
    const w = 1366, h = 768
    const high = px(w, h, renderScaleFor(w, h, 'high'))
    const medium = px(w, h, renderScaleFor(w, h, 'medium'))
    const low = px(w, h, renderScaleFor(w, h, 'low'))
    const min = px(w, h, renderScaleFor(w, h, 'min'))
    expect(medium).toBeLessThan(high)
    expect(low).toBeLessThan(medium)
    expect(min).toBeLessThan(low)
  })

  it('never scales below the legibility floor', () => {
    // A 6K window at `min` would otherwise ask for a canvas so small the
    // compositor's upscale reads as broken rather than soft.
    atDpr(2)
    expect(renderScaleFor(6016, 3384, 'min')).toBeGreaterThanOrEqual(0.5)
  })
})
