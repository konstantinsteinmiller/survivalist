import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAGE_JOIN_MAX_S, CAGE_R, CROWD_SCREEN_Y, CROWD_SQUASH, WARDEN_CAGE_LEAD, WARDEN_CAGE_SCALE,
  cameraScale
} from '@/game/survival'
import { CAGE_BOX } from '@/game/artBoxes'
import { buildTrack } from '@/game/track'
import {
  BOSS_REWARD_DAMAGE_MUL, BOSS_REWARD_STAGE, BOSS_REWARD_WEAPON, WEAPON_PICK_STAGE
} from '@/game/weapons'
import { BOSS_REWARD_KEY } from '@/keys'
import { armoryLaneX } from '@/game/armory'

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

  it('stands inside the frame with its lid over the top edge, on every ratio', () => {
    // Derived from the camera itself (`cameraScale`) rather than from a table
    // of browser measurements: since 2026-09-18 the frame is solved from the
    // gun's range, so the top edge is arithmetic — 14.31 units ahead wherever
    // the lane is not the limit, 14.5-14.9 on a portrait phone. Insets are the
    // HUD bars as measured in the browser that day (top bar + 8, bottom + 8).
    const shapes: Array<[number, number, number, number]> = [
      [360, 780, 108, 57], [390, 844, 109, 60], [430, 932, 111, 66], [412, 915, 110, 64],
      [360, 640, 108, 57], [820, 1180, 127, 75], [1280, 720, 127, 75], [1366, 768, 127, 75],
      [1920, 1080, 127, 75], [2560, 1080, 127, 75], [1000, 1300, 127, 75]
    ]
    // The drawn body runs `y - 0.93 … y + 1.94` (`CAGE_BOX` / `CAGE_DRAW_TALL`
    // at `WARDEN_CAGE_SCALE`); the lid is the top of it.
    const lid = WARDEN_CAGE_LEAD + CAGE_R * WARDEN_CAGE_SCALE * CAGE_BOX.top
    for (const [w, h, top, bottom] of shapes) {
      const scale = cameraScale(w, h, top, bottom)
      const edge = (CROWD_SCREEN_Y * h) / scale
      const underHud = (CROWD_SCREEN_Y * h - top) / scale
      // Its ground is on the canvas, and near the top of it — two and a half
      // units of clearance is the most a cage "pinned to the top" can have…
      expect(WARDEN_CAGE_LEAD, `${w}x${h}: the cage is off the top of the frame`)
        .toBeLessThan(edge)
      expect(edge - WARDEN_CAGE_LEAD, `${w}x${h}: the cage sits mid-frame`).toBeLessThan(2.5)
      // …and its lid is never readable whole: a prize the screen cannot quite
      // contain is a place you have to get to, one it frames whole is scenery.
      // Cut by the top edge on most shapes and by the HUD strip on all of them
      // (a 20:9 phone's canvas is tall enough to hold the lid; its strip is not).
      expect(lid, `${w}x${h}: the whole cage reads — it is scenery`).toBeGreaterThan(underHud)
    }
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
  /** Walk the real road into the stage-2 gift box and shoot it open. `lane` is
   *  where the thumb is held until the box is on the road — i.e. which lane of
   *  the weapon split a quarter of the way in the crowd walks into (see
   *  `game/armory.ts`). */
  const breakGiftBox = async (game: Game, lane?: number): Promise<void> => {
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
      else if (lane !== undefined) game.steerTo(lane)
      game.step(STEP_MS)
    }
    expect(game.activeWeapon.value).toBe('gatling')
  }

  // ── Since the weapon split (2026-09-19) ──
  //
  // Stage 2 still OPENS on the first boss's launcher at half power, but a
  // quarter of the way in the crowd walks into a lane of the split and the
  // weapon in it REPLACES the loaner at full power. So by the gift box the gun
  // in the crowd's hands is the player's own pick — and the box's promise is
  // unchanged: it does not take that gun away.

  it('keeps the weapon taken at the split firing beside the gatling from the gift box', async () => {
    const game = await importGame()
    const { setState } = await import('@/use/useTowerState')
    setState(BOSS_REWARD_KEY, true)
    game.startStage(BOSS_REWARD_STAGE + 1)
    expect(game.activeWeapon.value).toBe(BOSS_REWARD_WEAPON)
    expect(game.weaponPower.value).toBe(BOSS_REWARD_DAMAGE_MUL)
    // Nobody steers into the split: the left-centre lane, which on a fresh
    // career holds the launcher (`armoryLanes`).
    await breakGiftBox(game)
    const taken = game.armoryTaken()
    expect(taken).toBe(BOSS_REWARD_WEAPON)

    // The box's weapon is the main gun, at full power…
    expect(game.weaponPower.value).toBe(1)
    // …and the pick it would have replaced is still in the crowd's hands, at
    // the full power the split gave it.
    expect(game.sideWeapon.value).toBe(taken)
    expect(game.sideWeaponPower.value).toBe(1)

    // Both guns are actually firing: rounds of each kind in the air.
    const kinds = new Set<string>()
    for (let i = 0; i < 400 && kinds.size < 2; i++) {
      game.step(STEP_MS)
      for (const b of game.getBullets()) if (b.weapon) kinds.add(b.weapon)
    }
    expect([...kinds].sort()).toEqual(['gatling', 'rocket'])

    // …and the side gun is for this road only.
    game.advanceStage()
    expect(game.sideWeapon.value).toBeNull()
  })

  it('is one gun when the split\'s pick was the gatling', async () => {
    const game = await importGame()
    game.startStage(BOSS_REWARD_STAGE + 1)
    expect(game.activeWeapon.value).toBeNull()
    const lanes = game.getArmory()!.lanes
    await breakGiftBox(game, armoryLaneX(lanes.indexOf('gatling')))
    expect(game.armoryTaken()).toBe('gatling')
    // The same weapon again is the full version of it, not two gatlings.
    expect(game.sideWeapon.value).toBeNull()
  })
})
