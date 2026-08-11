import { describe, expect, it } from 'vitest'
import en from '@/i18n/locales/en'
import { LANGUAGES } from '@/utils/enums'

// ─── Locale parity ──────────────────────────────────────────────────────────
//
// English is the source of truth. Every other locale the game SHIPS must carry
// the exact same key shape — a missing key silently falls back to English, so
// the failure mode is a half-translated screen that nobody notices until a
// player in that language reports it.

const flatten = (obj: any, prefix = ''): string[] => {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, path))
    else out.push(path)
  }
  return out.sort()
}

const enKeys = flatten(en)

describe('every shipped locale mirrors the English key shape', () => {
  for (const code of LANGUAGES) {
    if (code === 'en') continue
    it(`${code} has no missing or extra keys`, async () => {
      const mod = await import(`../src/i18n/locales/${code}.ts`)
      const keys = flatten(mod.default)
      const missing = enKeys.filter((k) => !keys.includes(k))
      const extra = keys.filter((k) => !enKeys.includes(k))
      expect(missing, `${code} is MISSING keys`).toEqual([])
      expect(extra, `${code} has EXTRA keys`).toEqual([])
    })
  }
})

describe('interpolation placeholders survive translation', () => {
  // A dropped `{n}` renders as literal text and looks like a bug to the player.
  const placeholdersOf = (obj: any, path: string): string[] => {
    const parts = path.split('.')
    let cur: any = obj
    for (const p of parts) cur = cur?.[p]
    if (typeof cur !== 'string') return []
    return (cur.match(/\{[a-zA-Z]+\}/g) ?? []).sort()
  }

  for (const code of LANGUAGES) {
    if (code === 'en') continue
    it(`${code} keeps every {placeholder}`, async () => {
      const mod = await import(`../src/i18n/locales/${code}.ts`)
      const mismatches: string[] = []
      for (const key of enKeys) {
        const a = placeholdersOf(en, key)
        if (a.length === 0) continue
        const b = placeholdersOf(mod.default, key)
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          mismatches.push(`${key}: expected ${a.join(',')} got ${b.join(',')}`)
        }
      }
      expect(mismatches).toEqual([])
    })
  }
})
