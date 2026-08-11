import { describe, expect, it } from 'vitest'
import {
  applyBonusCoins,
  computeMeta,
  decideMerge,
  parseMeta,
  SAVE_KEYS,
  SCHEMA_VERSION,
  serializeMeta,
  type SaveMeta
} from '@/utils/save/SaveMergePolicy'

// Tiny in-memory snapshot reader used by every test below. Lets each
// scenario describe its localStorage state as a plain object literal.
const reader = (snap: Record<string, string>): { get: (k: string) => string | null } => ({
  get: (k: string) => (k in snap ? snap[k]! : null)
})

const techJson = (levels: Record<string, number> = {}): string =>
  JSON.stringify({ levels })

// Score formula under test:  bestWave × 500 + techLevels × 150 + runs × 10
describe('SaveMergePolicy.computeMeta', () => {
  it('returns score=0 for a fresh install (nothing survived, nothing bought)', () => {
    const meta = computeMeta(reader({}), '2026-04-27T10:00:00Z')
    expect(meta).toEqual({
      savedAt: '2026-04-27T10:00:00Z',
      progressScore: 0,
      schemaVersion: SCHEMA_VERSION,
      maxStage: 0
    })
  })

  it('counts bestWave * 500', () => {
    const meta = computeMeta(reader({ [SAVE_KEYS.BEST_WAVE]: '7' }))
    expect(meta.progressScore).toBe(7 * 500)
    expect(meta.maxStage).toBe(7)
  })

  it('floors bestWave at 0 for negative / garbage values', () => {
    expect(computeMeta(reader({ [SAVE_KEYS.BEST_WAVE]: '0' })).progressScore).toBe(0)
    expect(computeMeta(reader({ [SAVE_KEYS.BEST_WAVE]: '-3' })).progressScore).toBe(0)
    expect(computeMeta(reader({ [SAVE_KEYS.BEST_WAVE]: 'abc' })).progressScore).toBe(0)
  })

  it('counts every tech level at 150 each', () => {
    const meta = computeMeta(reader({
      [SAVE_KEYS.BEST_WAVE]: '1',
      [SAVE_KEYS.TECH]: techJson({ sharpBolts: 3, rapidFire: 2, reinforced: 5 })
    }))
    // 1*500 + 10 levels * 150
    expect(meta.progressScore).toBe(500 + 1500)
  })

  it('counts runs at 10 each so two equal-wave saves still break their tie', () => {
    const a = computeMeta(reader({ [SAVE_KEYS.BEST_WAVE]: '4', [SAVE_KEYS.RUNS]: '12' }))
    const b = computeMeta(reader({ [SAVE_KEYS.BEST_WAVE]: '4', [SAVE_KEYS.RUNS]: '3' }))
    expect(a.progressScore).toBe(2000 + 120)
    expect(b.progressScore).toBe(2000 + 30)
    expect(a.progressScore).toBeGreaterThan(b.progressScore)
  })

  it('ignores negative / non-numeric tech values defensively', () => {
    const meta = computeMeta(reader({
      [SAVE_KEYS.TECH]: JSON.stringify({
        levels: { sharpBolts: -2, rapidFire: 'broken', reinforced: 4, gateArmor: NaN, looting: 3 }
      })
    }))
    // Only `reinforced: 4` and `looting: 3` count → 7 * 150
    expect(meta.progressScore).toBe(1050)
  })

  it('combines every term per the formula', () => {
    const meta = computeMeta(reader({
      [SAVE_KEYS.BEST_WAVE]: '12',
      [SAVE_KEYS.RUNS]: '20',
      [SAVE_KEYS.TECH]: techJson({ sharpBolts: 5, rapidFire: 5 })
    }))
    expect(meta.progressScore).toBe(6000 + 1500 + 200)
    expect(meta.maxStage).toBe(12)
  })

  it('survives malformed JSON in the tech key', () => {
    const meta = computeMeta(reader({
      [SAVE_KEYS.BEST_WAVE]: '3',
      [SAVE_KEYS.TECH]: '{not json'
    }))
    expect(meta.progressScore).toBe(3 * 500)
  })
})

describe('SaveMergePolicy.parseMeta / serializeMeta', () => {
  it('round-trips a valid meta blob', () => {
    const meta: SaveMeta = {
      savedAt: '2026-04-27T18:30:00Z',
      progressScore: 1234,
      schemaVersion: SCHEMA_VERSION,
      maxStage: 4
    }
    expect(parseMeta(serializeMeta(meta))).toEqual(meta)
  })

  it('returns null for null / empty / non-string inputs', () => {
    expect(parseMeta(null)).toBeNull()
    expect(parseMeta(undefined)).toBeNull()
    expect(parseMeta('')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(parseMeta('{nope')).toBeNull()
  })

  it('returns null when required fields are missing or wrong-typed', () => {
    expect(parseMeta(JSON.stringify({}))).toBeNull()
    expect(parseMeta(JSON.stringify({ savedAt: 'x', progressScore: 'oops', schemaVersion: 1, maxStage: 1 }))).toBeNull()
    expect(parseMeta(JSON.stringify({ savedAt: 'x', progressScore: NaN, schemaVersion: 1, maxStage: 1 }))).toBeNull()
  })
})

describe('SaveMergePolicy.decideMerge', () => {
  const meta = (overrides: Partial<SaveMeta>): SaveMeta => ({
    savedAt: '2026-04-27T12:00:00Z',
    progressScore: 0,
    schemaVersion: SCHEMA_VERSION,
    maxStage: 1,
    ...overrides
  })

  it('returns \'local-only\' when remote is null (network unreachable etc.)', () => {
    expect(decideMerge(meta({ progressScore: 5000 }), null)).toEqual({ kind: 'local-only' })
  })

  it('returns \'remote-only\' when local is null (truly fresh device)', () => {
    expect(decideMerge(null, meta({ progressScore: 5000 }))).toEqual({ kind: 'remote-only' })
  })

  it('returns \'remote-wins\' with bonus when remote score > local score AND local had progress', () => {
    const local = meta({ progressScore: 2000, maxStage: 4 })
    const remote = meta({ progressScore: 8000, maxStage: 12 })
    // bonus = remote.maxStage * 50 = 12 * 50 = 600
    expect(decideMerge(local, remote)).toEqual({ kind: 'remote-wins', bonusCoins: 600 })
  })

  it('returns \'remote-wins\' with NO bonus when local was completely empty (score 0)', () => {
    const local = meta({ progressScore: 0, maxStage: 1 })
    const remote = meta({ progressScore: 8000, maxStage: 12 })
    expect(decideMerge(local, remote)).toEqual({ kind: 'remote-wins', bonusCoins: 0 })
  })

  it('returns \'local-wins\' when local score > remote (player advanced offline)', () => {
    const local = meta({ progressScore: 8000 })
    const remote = meta({ progressScore: 2000 })
    expect(decideMerge(local, remote)).toEqual({ kind: 'local-wins' })
  })

  it('returns \'remote-wins\' (bonus 0) when scores tie but remote savedAt is newer', () => {
    const local = meta({ progressScore: 5000, savedAt: '2026-04-27T10:00:00Z' })
    const remote = meta({ progressScore: 5000, savedAt: '2026-04-27T11:00:00Z' })
    expect(decideMerge(local, remote)).toEqual({ kind: 'remote-wins', bonusCoins: 0 })
  })

  it('returns \'tie-keep-local\' when scores AND timestamps match', () => {
    const local = meta({ progressScore: 5000, savedAt: '2026-04-27T10:00:00Z' })
    const remote = meta({ progressScore: 5000, savedAt: '2026-04-27T10:00:00Z' })
    expect(decideMerge(local, remote)).toEqual({ kind: 'tie-keep-local' })
  })

  it('returns \'tie-keep-local\' when scores match and local savedAt is newer', () => {
    const local = meta({ progressScore: 5000, savedAt: '2026-04-27T11:00:00Z' })
    const remote = meta({ progressScore: 5000, savedAt: '2026-04-27T10:00:00Z' })
    expect(decideMerge(local, remote)).toEqual({ kind: 'tie-keep-local' })
  })

  it('falls back to \'tie-keep-local\' when timestamps are unparseable on a score tie', () => {
    const local = meta({ progressScore: 5000, savedAt: 'garbage' })
    const remote = meta({ progressScore: 5000, savedAt: 'also garbage' })
    expect(decideMerge(local, remote)).toEqual({ kind: 'tie-keep-local' })
  })
})

describe('SaveMergePolicy.applyBonusCoins', () => {
  it('adds the bonus to whatever coin total is in storage', () => {
    expect(applyBonusCoins(reader({ [SAVE_KEYS.COINS]: '300' }), 100)).toBe('400')
  })

  it('treats missing / unparseable coin storage as zero', () => {
    expect(applyBonusCoins(reader({}), 250)).toBe('250')
    expect(applyBonusCoins(reader({ [SAVE_KEYS.COINS]: 'oops' }), 250)).toBe('250')
  })

  it('clamps negative bonuses to zero (defensive)', () => {
    expect(applyBonusCoins(reader({ [SAVE_KEYS.COINS]: '500' }), -100)).toBe('500')
  })
})
