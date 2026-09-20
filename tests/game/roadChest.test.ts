// ─── The idle chest, standing on the road ───────────────────────────────────
//
// The chest that fills on wall-clock time is the game's one reason to come back
// tomorrow, and it lived in a corner of the HUD. When a stage opens with one
// ready it now stands on the road and the crowd opens it by running it over.
//
// Pinned here: it never stands inside another drawing (the owner found it
// sitting in stage 1's opening doorway), it is collected by contact, and it is
// collected exactly once.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  ROAD_CHEST_CLEAR, ROAD_CHEST_FROM, ROAD_CHEST_R, ROAD_CHEST_TO
} from '@/game/survival'

const importGame = () => import('@/use/useSurvivalGame')

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const g = await importGame()
  g.__resetForTest()
})

describe('where it stands', () => {
  it('finds clear road on every early stage, never inside another drawing', async () => {
    const g = await importGame()
    for (const stage of [1, 2, 3, 4, 5, 6, 8, 12]) {
      g.startStage(stage)
      g.placeRoadChest()
      const c = g.getRoadChest()
      expect(c, `stage ${stage} placed nothing`).not.toBeNull()
      expect(c!.y, `stage ${stage}`).toBeGreaterThanOrEqual(ROAD_CHEST_FROM)
      expect(c!.y, `stage ${stage}`).toBeLessThanOrEqual(ROAD_CHEST_TO)
      for (const e of g.getTrack().events) {
        if (e.kind === 'coins' || e.kind === 'foes') continue
        expect(
          Math.abs(e.y - c!.y),
          `stage ${stage}: a ${e.kind} at ${e.y} is on top of the chest at ${c!.y}`
        ).toBeGreaterThanOrEqual(ROAD_CHEST_CLEAR)
      }
    }
  })

  it('stands on the centre line, where a crowd that never steers still takes it', async () => {
    const g = await importGame()
    g.startStage(1)
    g.placeRoadChest()
    expect(g.getRoadChest()!.x).toBe(0)
    expect(ROAD_CHEST_R).toBeGreaterThan(1)
  })
})

describe('taking it', () => {
  it('is opened by running it over, once', async () => {
    const g = await importGame()
    g.startStage(1)
    g.steerOnly.value = false
    g.placeRoadChest()
    const before = g.roadChestTaken.value
    for (let i = 0; i < 400 && !g.getRoadChest()?.taken; i++) g.step(16)
    expect(g.getRoadChest()!.taken).toBe(true)
    expect(g.roadChestTaken.value).toBe(before + 1)
    // …and the crowd walking on does not open it again.
    for (let i = 0; i < 200; i++) g.step(16)
    expect(g.roadChestTaken.value).toBe(before + 1)
  })

  it('is gone from the road on the next stage until it is placed again', async () => {
    const g = await importGame()
    g.startStage(1)
    g.placeRoadChest()
    expect(g.getRoadChest()).not.toBeNull()
    g.startStage(2)
    expect(g.getRoadChest()).toBeNull()
  })
})
