import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CAGE_JOIN_MAX_S, CROWD_SQUASH, WARDEN_CAGE_LEAD } from '@/game/survival'
import { buildTrack } from '@/game/track'
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

/**
 * ─── Where the cage stands, and why it is not a matter of taste ─────────────
 *
 * The warden cage is the only thing on the boss screen that answers "why am I
 * fighting this", so its position has exactly one job: be visibly BEHIND the
 * monster, at the far edge of what the player can see, for the whole fight.
 *
 * It shipped at `arenaY + 7` and did neither. The bug is worth restating because
 * it is invisible in a still: the boss does not stand where it fights. It SPAWNS
 * at `arenaY + 12` and walks down to `arenaY + 3.8` over about ten seconds, so a
 * cage anywhere below 12 spends the opening of every fight in FRONT of the thing
 * guarding it — a box of people parked between the player and the boss, which is
 * the composition backwards and reads as a pickup somebody left in the road.
 */
describe('the cage the boss is standing in front of', () => {
  it('stands behind where the boss SPAWNS, not merely where it settles', () => {
    // Checked against the built track rather than against a literal, because
    // `bossY` is `length + 8` and `arenaY` is `length - 4`: the gap is a
    // property of the road's shape and a change to either end moves it.
    for (const stage of [1, 4, 9, 20]) {
      const t = buildTrack(stage)
      const spawnLead = t.bossY - t.arenaY
      expect(WARDEN_CAGE_LEAD, `stage ${stage}: the cage is in front of the boss`)
        .toBeGreaterThan(spawnLead)
    }
  })

  it('stays inside the fourteen units of road the player can actually see', () => {
    // `CROWD_SCREEN_Y` x `VIEW_HEIGHT` is NOT this number. `setViewport` fits
    // `VIEW_HEIGHT` into the viewport MINUS the two HUD bars, and the top of
    // what can be read is the bottom of the top bar — so the honest figure is
    // `(cssH x CROWD_SCREEN_Y - topInset) / scale`, measured in a browser:
    //
    //   420x900 phone   14.35     1280x800  desktop   14.28
    //   360x780 phone   14.11     1600x1000 desktop   14.13
    //   820x1180 tablet 14.04     1920x1080 desktop   14.08
    //
    // The spread is tight because the fit rule trades width against height to
    // keep it so. 14.04 is the floor across every shape the game fits into.
    const SEEN_AHEAD = 14.04
    expect(WARDEN_CAGE_LEAD).toBeLessThan(SEEN_AHEAD)
    // …and near enough to the edge that it is cut rather than centred. Its lid
    // reaches roughly a unit above its ground, so anything more than two units
    // of clearance is a cage sitting comfortably in frame — which is scenery.
    expect(SEEN_AHEAD - WARDEN_CAGE_LEAD).toBeLessThan(2)
  })

  it('is never passed by the boss on its way down', async () => {
    // The behavioural half: not "the constant is bigger" but "no frame of a real
    // fight ever draws the boss above its own cage".
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(400)
    game.debugSkipToArena()
    let sawBoss = false
    for (let i = 0; i < 2000; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
      const b = game.getBoss()
      if (!b || b.dead) continue
      // Unkillable, so the fight lasts long enough to cover the whole walk-in.
      b.hp = 1e9
      b.maxHp = 1e9
      sawBoss = true
      const cage = game.getCages().find((c) => c.warden && !c.dead)
      expect(cage, 'the boss fight had no cage behind it').toBeTruthy()
      expect(cage!.y, `frame ${i}: the boss was above its own cage`).toBeGreaterThan(b.y)
    }
    expect(sawBoss, 'never reached the boss').toBe(true)
  })
})

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

    // ── The new squad comes OUT OF THE CAGE the boss was standing over ──
    //
    // This used to assert the opposite — that every survivor kept was standing
    // on a spot somebody already stood on, so nobody jumped — and that contract
    // was deliberately replaced. The people who open a stage are now the ones
    // the beaten boss was holding (`Cage.warden`), which is what turns a career
    // into one continuous rescue instead of a sequence of unrelated roads.
    //
    // So they start AT the cage and run to their slots on the rescue walk.
    const fresh = game.getUnits()
    expect(fresh.every((u) => u.join > 0), 'the new squad did not walk out of anything').toBe(true)
    // …from the cage's own re-based ground, ahead of the crowd where the boss
    // stood over it — the same shift the corpse took.
    for (const u of fresh) expect(u.y).toBeGreaterThan(0)
    // …and it is still the shop's squad, not the one that won the fight.
    expect(game.squadCount.value).toBeLessThan(stood.length)

    // The rest are handed to the renderer to see off — once.
    const gone = game.takeDepartedSurvivors()
    expect(gone?.length ?? 0).toBeGreaterThan(0)
    expect(game.takeDepartedSurvivors()).toBeNull()
  })

  it('frees exactly the squad the next stage opens on', async () => {
    const game = await importGame()
    clearStage(game, 4)
    // The cage the boss was standing in front of holds the NEXT stage's opening
    // squad — the number the shop has been buying all along, now a number of
    // people the player can see in a box before they have earned them.
    const cage = game.getCages().find((c) => c.warden && !c.dead)
    expect(cage, 'the stage-4 boss had no cage behind it').toBeTruthy()
    const held = cage!.hold
    game.advanceStage()
    expect(game.stage.value).toBe(5)
    expect(game.squadCount.value).toBe(held)
  })

  it('gets them all into formation despite the longer walk', async () => {
    // The cage moved from `arenaY + 7` to `arenaY + 12.8` to get behind the
    // boss, which nearly doubled the run the freed squad has to make at the top
    // of every stage. `CAGE_JOIN_MAX_S` is a hard backstop — a joiner still
    // walking when it expires is handed to the formation spring and SNAPS the
    // rest of the way, which is exactly the pop the walk exists to avoid.
    //
    // The budget is `CAGE_JOIN_SPEED` plus the road's own speed, so 12.8 units
    // is covered in well under the window; this pins that it still is.
    const game = await importGame()
    clearStage(game, 4)
    game.advanceStage()
    const fresh = game.getUnits()
    expect(fresh.length).toBeGreaterThan(0)
    const budget = Math.ceil((CAGE_JOIN_MAX_S * 1000) / STEP_MS)
    for (let i = 0; i < budget; i++) game.step(STEP_MS)
    for (const u of game.getUnits()) {
      expect(u.join, 'a freed survivor was snapped into place by the backstop').toBe(0)
    }
  })

  it('stands a fresh cage behind the next boss', async () => {
    const game = await importGame()
    clearStage(game, 4)
    game.advanceStage()
    // Every boss has one, all the way down the campaign — the loop only closes
    // if the next road also ends in a reason to walk it.
    const next = game.getCages().filter((c) => c.warden && !c.dead)
    expect(next.length).toBe(1)
    expect(next[0]!.hold).toBeGreaterThan(0)
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
