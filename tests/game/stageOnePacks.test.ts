// ─── Stage 1's packs ────────────────────────────────────────────────────────
//
// Owner's calls, 2026-09-19: every stage-1 pack is three bodies at half again
// the health (`earlyPackBonus`, `earlyFoeHpMul`) — except the very first one,
// which carries 30 % of that (`STAGE_ONE_FIRST_PACK_HP_MUL`).

import { beforeEach, describe, expect, it } from 'vitest'
import { buildTrack } from '@/game/track'
import { STAGE_ONE_FIRST_PACK_HP_MUL, earlyFoeHpMul } from '@/game/survival'
import { foeDef } from '@/game/foes'

const importGame = () => import('@/use/useSurvivalGame')

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  ;(await importGame()).__resetForTest()
})

const packs = () => buildTrack(1).events
  .filter((e): e is Extract<typeof e, { kind: 'foes' }> => e.kind === 'foes')
  .sort((p, q) => p.y - q.y)

describe('stage 1 packs', () => {
  it('are three bodies each, and strays stay single', () => {
    for (const e of packs()) expect(e.count, `pack at ${e.y}`).toBe(e.stray ? 1 : 3)
    expect(earlyFoeHpMul(1)).toBe(1.5)
  })

  it('discounts only the very first pack, to 30 %', () => {
    const [first, ...rest] = packs()
    expect(first!.stray).toBeUndefined()
    expect(first!.hpMul).toBe(STAGE_ONE_FIRST_PACK_HP_MUL)
    expect(STAGE_ONE_FIRST_PACK_HP_MUL).toBe(0.3)
    for (const e of rest) expect(e.hpMul, `pack at ${e.y}`).toBeUndefined()
  })

  it('spawns the first pack at 30 % of what the second one gets', async () => {
    const g = await importGame()
    g.startStage(1)
    g.steerOnly.value = false
    const [first, second] = packs().filter((e) => !e.stray)
    const hpAt = (y: number): number[] =>
      g.getFoes().filter((f) => !f.elite && Math.abs(f.y - y) < 1.5).map((f) => f.maxHp)
    // Keep the crowd alive and walk until both packs have streamed in.
    let firstHp: number[] = []
    let secondHp: number[] = []
    for (let i = 0; i < 20000 && (firstHp.length === 0 || secondHp.length === 0); i++) {
      if (g.squadCount.value < 30) g.debugAddUnits(30 - g.squadCount.value)
      g.step(16)
      if (firstHp.length === 0) firstHp = hpAt(first!.y)
      if (secondHp.length === 0) secondHp = hpAt(second!.y)
    }
    expect(firstHp.length).toBe(3)
    expect(secondHp.length).toBe(3)
    const full = secondHp[0]!
    expect(full).toBeGreaterThan(foeDef('creep').hp)
    for (const hp of firstHp) expect(hp).toBe(Math.max(1, Math.round(full * STAGE_ONE_FIRST_PACK_HP_MUL)))
  })
})
