import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ─── A cached ramp is only as honest as its key ─────────────────────────────
 *
 * A face-down door wears ONE dressing whatever it hides — the `mystery` dress:
 * the add frame blackened, a black curtain, a dark plate — so that the only
 * thing the player has to go on is where it is. The gradients that dressing is
 * made of are CACHED for the life of the stage, and they were once keyed on the
 * leaf's TRUE op while being built from the DISGUISED one — so the first `×` mystery
 * of a stage filed a cyan curtain and a cyan plate under `mul`, and every
 * readable `×1.6` after it in that stage drew in the `+N` blue. Drawn in the
 * other order the same collision paints the mystery magenta, which is worse:
 * the disguise comes off.
 *
 * jsdom has no canvas, so the colour a leaf ends up wearing cannot be asserted
 * here. What can is the rule that decides it: ONE op drives the dressing, and
 * every cache key that dresses a leaf is keyed on that op rather than on the
 * one underneath it.
 */

// Line endings are NORMALISED before anything is sliced out of the source.
//
// The cuts below hunt for a brace on its own line, and this repository has
// MIXED line endings: git converts on checkout, so a file somebody else
// touched can arrive with CRLF and the search silently finds nothing. It
// failed as "expected -1 to be greater than 261555", which reads like the
// renderer lost a function rather than like a carriage return.
const src = readFileSync(
  resolve(__dirname, '../../src/use/useSurvivalArt.ts'), 'utf8'
).replace(/\r\n/g, '\n')

/** The body of `drawGates`, up to the first line that closes a top-level block. */
const drawGates = ((): string => {
  const from = src.indexOf('const drawGates = (')
  expect(from).toBeGreaterThan(0)
  const to = src.indexOf('\n}\n', from)
  expect(to).toBeGreaterThan(from)
  return src.slice(from, to)
})()

describe('the dressing a gate leaf is drawn in', () => {
  it('is decided once, from the op the leaf PRESENTS as', () => {
    // `plain` is false for a face-down door, a door mid-turn, and a turned-over
    // prize door — every one of which wears the disguise, never its true op.
    expect(drawGates).toContain("const dressOp: GateDress = plain ? g.op : 'mystery'")
    expect(drawGates).toContain('const tint = GATE_TINT[dressOp]')
    // The true op must never reach the tint table directly again.
    expect(drawGates).not.toContain('GATE_TINT[g.op]')
    expect(drawGates).not.toContain("GATE_TINT[mystery ? 'add' : g.op]")
  })

  it('reaches the painted frame as the disguised op too', () => {
    // Otherwise a face-down `×` leaf stands in magenta ironwork behind a
    // neutral curtain — the answer, in the one place nobody thought to look.
    expect(drawGates).toContain('paintGateFrame(ctx, dressOp, halfW, height, scale)')
  })
})

describe('every ramp a leaf caches', () => {
  /** `gateCurtain|${x}|…` → `x`, for each ramp key built inside `drawGates`. */
  const keyedOn = [...drawGates.matchAll(/`gate[A-Za-z]+\|\$\{([^}]+)\}/g)]
    .map((m) => m[1]!.trim())

  it('is keyed on something, and on the dressing when it is keyed on an op', () => {
    expect(keyedOn.length).toBeGreaterThanOrEqual(2)
    for (const term of keyedOn) expect(term).not.toBe('g.op')
  })

  it('covers the two that carry the leaf colour', () => {
    expect(drawGates).toContain('`gateCurtain|${dressOp}|')
    expect(drawGates).toContain('`gatePlate|${dressOp}|')
  })
})

describe('why the key has to carry it', () => {
  it('gives the disguise and the multiplier genuinely different colours', () => {
    // If these ever collapsed to the same tint the bug above would be
    // invisible — and the bank would stop being readable at a glance, which is
    // the reason the table exists.
    const table = src.slice(src.indexOf('const GATE_TINT = {'))
    const glow = (op: string): string =>
      new RegExp(`${op}: \{[^}]*glow: '([^']+)'`).exec(table)?.[1] ?? ''
    expect(glow('add')).not.toBe('')
    expect(glow('mul')).not.toBe('')
    expect(glow('add')).not.toBe(glow('mul'))
  })

  it('gives the disguise a colour of its own, borrowed from none of the answers', () => {
    const table = src.slice(src.indexOf('const GATE_TINT = {'))
    const glow = (op: string): string =>
      new RegExp(`${op}: {[^}]*glow: '([^']+)'`).exec(table)?.[1] ?? ''
    expect(glow('mystery')).not.toBe('')
    for (const op of ['add', 'sub', 'mul', 'div']) expect(glow('mystery')).not.toBe(glow(op))
  })
})
