import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CROWD_SQUASH } from '@/game/survival'
import {
  BOSS_REWARD_DAMAGE_MUL, BOSS_REWARD_STAGE, BOSS_REWARD_WEAPON, WEAPON_PICK_STAGE
} from '@/game/weapons'
import { BOSS_REWARD_KEY } from '@/keys'

/**
 * ─── The road goes on ───────────────────────────────────────────────────────
 *
 * A cleared stage used to throw the world away and restart the next one at the
 * road's origin — a level reload in everything but name. The next stage now
 * opens under the crowd: same column, the survivors it keeps standing where
 * they stood, the boss they killed lying a few steps ahead. These pin the sim's
 * half — what is carried, in which coordinates, and on which paths it is NOT —
 * and the stage-1 boss's launcher that rides the first such handover.
 */

const STEP_MS = 16
const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  ;(await importGame()).__resetForTest()
})

/** Clear `stage` for real: straight to the arena with a squad that deletes the
 *  boss, then step until the sim itself declares the clear. */
const clearStage = (game: Game, stage: number): void => {
  game.startStage(stage)
  game.debugAddUnits(700)
  game.debugAddDamage(400)
  game.debugAddFireRate(6)
  game.debugSkipToArena()
  for (let i = 0; i < 9000; i++) {
    game.step(STEP_MS)
    if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
  }
  expect(game.phase.value).toBe('clear')
}

const spot = (x: number, y: number): string => `${x.toFixed(4)}|${y.toFixed(4)}`

describe('the next road opens where the boss fell', () => {
  it('carries the corpse, the column and the survivors across, re-based to the new origin', async () => {
    const game = await importGame()
    clearStage(game, 4)
    const boss = game.getBoss()!
    expect(boss.dead).toBe(true)
    const a = game.anchor()
    const stood = game.getUnits().filter((u) => u.dying <= 0)
    const scroll = game.roadScrollY()

    const moved = game.advanceStage()

    expect(game.stage.value).toBe(5)
    // The world moved by exactly the crowd's own y, so the crowd is at the new
    // origin — in the same column it was standing in.
    expect(moved).toBe(a.y)
    expect(game.anchor()).toEqual({ x: a.x, y: 0 })
    // …and the road's texture phase moved with it, so the ground does not jump.
    expect(game.roadScrollY()).toBeCloseTo(scroll + a.y, 6)

    const body = game.getBossCorpse()!
    expect(body).not.toBeNull()
    expect(body.design).toBe(boss.design)
    expect(body.x).toBe(boss.x)
    expect(body.y).toBeCloseTo(boss.y - a.y, 6)
    expect(body.scale).toBe(boss.scale)
    expect(body.fall).toBe(game.bossFallDir(boss.x))
    // Ahead of the crowd, where the boss stood over it.
    expect(body.y).toBeGreaterThan(0)

    // Every survivor the new stage kept is standing on a spot somebody stood on,
    // shifted by exactly `moved` — nobody jumps.
    const spots = new Set(stood.map((u) => spot(u.x, u.y - moved)))
    for (const u of game.getUnits()) expect(spots.has(spot(u.x, u.y))).toBe(true)
    // …but it is the shop's squad, not the one that won the fight.
    expect(game.squadCount.value).toBeLessThan(stood.length)

    // The rest are handed to the renderer to see off — once.
    const gone = game.takeDepartedSurvivors()
    expect(gone?.length ?? 0).toBeGreaterThan(0)
    expect(game.takeDepartedSurvivors()).toBeNull()
  })

  it('keeps the innermost survivors, so the squad shrinks toward its own middle', async () => {
    const game = await importGame()
    clearStage(game, 4)
    const a = game.anchor()
    // The formation's own metric: the sunflower is squashed in y.
    const reach = (x: number, y: number): number =>
      (x - a.x) ** 2 + ((y - a.y) / CROWD_SQUASH) ** 2
    const all = game.getUnits().filter((u) => u.dying <= 0)
      .map((u) => reach(u.x, u.y)).sort((p, q) => p - q)
    const moved = game.advanceStage()
    const kept = game.getUnits().map((u) => reach(u.x, u.y + moved))
    // Nobody kept stands further out than the n-th nearest of the old crowd.
    const bound = all[kept.length - 1]! + 1e-9
    for (const r of kept) expect(r).toBeLessThanOrEqual(bound)
  })

  it('retries from the same ground, with the corpse back where it lay', async () => {
    const game = await importGame()
    clearStage(game, 4)
    game.advanceStage()
    game.takeDepartedSurvivors()
    const body = { ...game.getBossCorpse()! }
    const x = game.anchor().x
    const scroll = game.roadScrollY()
    for (let i = 0; i < 60; i++) game.step(STEP_MS)

    game.retryStage()

    expect(game.stage.value).toBe(5)
    expect(game.getBossCorpse()).toEqual(body)
    expect(game.anchor()).toEqual({ x, y: 0 })
    // A retry is not a step forward: the road's phase stays, and nobody is
    // left behind because nobody was carried.
    expect(game.roadScrollY()).toBe(scroll)
    expect(game.takeDepartedSurvivors()).toBeNull()
  })

  it('opens a fresh road on a jump to any other stage, and forgets the old opening', async () => {
    const game = await importGame()
    clearStage(game, 4)
    game.advanceStage()
    expect(game.getBossCorpse()).not.toBeNull()
    game.startStage(9)
    expect(game.getBossCorpse()).toBeNull()
    expect(game.anchor()).toEqual({ x: 0, y: 0 })
    // Dropped, not parked: coming back to stage 5 is a fresh road too.
    game.startStage(5)
    expect(game.getBossCorpse()).toBeNull()
  })

  it('shows no corpse on a page that did not see the kill', async () => {
    const game = await importGame()
    clearStage(game, 4)
    game.advanceStage()
    // A reload is a new module: whatever the save says, nothing was carried.
    vi.resetModules()
    const fresh = await importGame()
    fresh.startStage()
    expect(fresh.getBossCorpse()).toBeNull()
    expect(fresh.anchor()).toEqual({ x: 0, y: 0 })
  })

  it('an expedition shows no corpse, and hands the campaign back with it', async () => {
    const game = await importGame()
    clearStage(game, 4)
    game.advanceStage()
    const body = { ...game.getBossCorpse()! }

    game.startExpedition(Date.UTC(2026, 8, 11, 12))
    expect(game.isExpedition.value).toBe(true)
    expect(game.getBossCorpse()).toBeNull()

    // Out of the expedition nothing is re-based: the campaign is resumed, not
    // walked on to, and it opens where it was left — corpse and all.
    expect(game.advanceStage()).toBe(0)
    expect(game.stage.value).toBe(5)
    expect(game.getBossCorpse()).toEqual(body)
  })

  it('carries no corpse from a boss that did not die', async () => {
    const game = await importGame()
    game.startStage(8)
    for (let i = 0; i < 30; i++) game.step(STEP_MS)
    game.advanceStage()
    expect(game.stage.value).toBe(9)
    expect(game.getBossCorpse()).toBeNull()
  })
})

describe('the first boss pays out on the spot', () => {
  it('re-arms a half-power launcher on the next stage, once it has been handed over', async () => {
    const game = await importGame()
    const next = BOSS_REWARD_STAGE + 1
    // Never shown, never armed — a save from before the reveal existed.
    game.startStage(next)
    expect(game.activeWeapon.value).toBeNull()
    expect(game.weaponPower.value).toBe(1)

    const { setState } = await import('@/use/useTowerState')
    setState(BOSS_REWARD_KEY, true)
    game.startStage(next)
    expect(game.activeWeapon.value).toBe(BOSS_REWARD_WEAPON)
    expect(game.weaponPower.value).toBe(BOSS_REWARD_DAMAGE_MUL)
    // …on every attempt at it, like the other loaner.
    game.retryStage()
    expect(game.activeWeapon.value).toBe(BOSS_REWARD_WEAPON)

    // And nowhere else: the stage after it is the weapon choice's, and past that
    // the weapon does not survive the stage it was given for.
    game.startStage(WEAPON_PICK_STAGE)
    expect(game.weaponPower.value).toBe(1)
    game.startStage(8)
    expect(game.activeWeapon.value).toBeNull()
    expect(game.weaponPower.value).toBe(1)
  })

  it('is the launcher with half the punch per round', async () => {
    const game = await importGame()
    const { setState } = await import('@/use/useTowerState')
    setState(BOSS_REWARD_KEY, true)
    game.startStage(BOSS_REWARD_STAGE + 1)

    const nextRound = (not?: number): number => {
      for (let i = 0; i < 900; i++) {
        game.step(STEP_MS)
        const b = game.getBullets().find((r) => r.weapon === BOSS_REWARD_WEAPON && r.damage !== not)
        if (b) return b.damage
      }
      throw new Error('the launcher never fired')
    }

    const gift = nextRound()
    // Same squad, same stage, the full weapon — what a box would hand over.
    game.debugGiveWeapon(BOSS_REWARD_WEAPON)
    expect(game.weaponPower.value).toBe(1)
    const full = nextRound(gift)
    expect(gift / full).toBeCloseTo(BOSS_REWARD_DAMAGE_MUL, 6)
  })
})

describe('stage 2 can hand over two weapons, and they fire together', () => {
  /** Walk the real road into the stage-2 gift box and shoot it open. */
  const breakGiftBox = async (game: Game): Promise<void> => {
    game.debugAddUnits(20)
    for (let i = 0; i < 3000 && game.activeWeapon.value !== 'gatling'; i++) {
      // ── The crowd is topped up, and that is not padding ──
      //
      // What is under test is the HANDOVER: which gun ends up in which hand
      // when a box is opened. Whether twenty survivors live long enough to
      // reach the box on stage 2 is a different question entirely, and it is
      // one this file was answering by accident — a marginal crowd walking a
      // road with a husk pack on it dies on some rolls and not others (nothing
      // here seeds `Math.random`), so the spec failed about two runs in three
      // under load while passing every time it was run alone.
      //
      // Kept alive rather than started bigger, because the box is a CRATE: a
      // crowd big enough to be safe for the whole road is also a crowd wide
      // enough to clip the box from a lane it never steered into, which would
      // make the steering below decorative.
      if (game.squadCount.value < 12) game.debugAddUnits(12 - game.squadCount.value)
      const box = game.getWeaponBoxes().find((b) => !b.dead)
      if (box) game.steerTo(box.x)
      game.step(STEP_MS)
    }
    expect(game.activeWeapon.value).toBe('gatling')
  }

  it('keeps the first boss\'s launcher firing beside the gatling from the gift box', async () => {
    const game = await importGame()
    const { setState } = await import('@/use/useTowerState')
    setState(BOSS_REWARD_KEY, true)
    game.startStage(BOSS_REWARD_STAGE + 1)
    expect(game.activeWeapon.value).toBe(BOSS_REWARD_WEAPON)
    await breakGiftBox(game)

    // The box's weapon is the main gun, at full power…
    expect(game.weaponPower.value).toBe(1)
    // …and the launcher it would have replaced is still in the crowd's hands,
    // at the half power it was given at.
    expect(game.sideWeapon.value).toBe(BOSS_REWARD_WEAPON)
    expect(game.sideWeaponPower.value).toBe(BOSS_REWARD_DAMAGE_MUL)

    // Both guns are actually firing: rounds of each kind in the air.
    const kinds = new Set<string>()
    for (let i = 0; i < 400 && kinds.size < 2; i++) {
      game.step(STEP_MS)
      for (const b of game.getBullets()) if (b.weapon) kinds.add(b.weapon)
    }
    expect([...kinds].sort()).toEqual(['gatling', 'rocket'])
  })

  it('is one gun as before when nothing was held — and nothing carries past the stage', async () => {
    const game = await importGame()
    game.startStage(BOSS_REWARD_STAGE + 1)
    expect(game.activeWeapon.value).toBeNull()
    await breakGiftBox(game)
    expect(game.sideWeapon.value).toBeNull()

    const { setState } = await import('@/use/useTowerState')
    setState(BOSS_REWARD_KEY, true)
    game.startStage(BOSS_REWARD_STAGE + 1)
    await breakGiftBox(game)
    expect(game.sideWeapon.value).toBe(BOSS_REWARD_WEAPON)
    game.advanceStage()
    expect(game.sideWeapon.value).toBeNull()
  })
})
