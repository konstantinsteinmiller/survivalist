// ─── Active skills ──────────────────────────────────────────────────────────
//
// The grenade and the shield are the only things in the game the player DOES,
// as opposed to steers. Everything else the shop sells is a number the
// simulation reads on its own.
//
// Three properties carry the design, and all three are easy to break by
// accident later:
//
//   • the grenade is owned from the start and the shield is not — one skill
//     teaches that the game has buttons, the other is something to find;
//   • the cooldown is an absolute timestamp in the SAVE, so it runs across runs
//     and dying cannot be used to refund it;
//   • a skill that did nothing does not pay a cooldown.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  GRENADE_BASE_MULT, GRENADE_BOSS_BASE_MULT, SHIELD_MAX_LEVEL, SKILL_COOLDOWN_MS,
  shieldSecondsAt
} from '@/use/useUpgrades'

const importGame = () => import('@/use/useSurvivalGame')
const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const { __resetSkillCooldowns } = await import('@/use/useSkills')
  __resetSkillCooldowns()
})

describe('what the tracks sell', () => {
  it('starts the grenade at 3x and tops it out at 6x over twenty levels', async () => {
    const { UPGRADES } = await import('@/use/useUpgrades')
    expect(UPGRADES.grenade.maxLevel).toBe(20)
    expect(UPGRADES.grenade.valueAt(0)).toBe(GRENADE_BASE_MULT)
    expect(UPGRADES.grenade.valueAt(20)).toBe(6)
    // Monotonic, so every purchase visibly buys something.
    for (let l = 1; l <= 20; l++) {
      expect(UPGRADES.grenade.valueAt(l)).toBeGreaterThan(UPGRADES.grenade.valueAt(l - 1))
    }
  })

  it('locks the shield at level 0 and runs 3s to 6s over ten levels', async () => {
    expect(shieldSecondsAt(0)).toBe(0)
    expect(shieldSecondsAt(1)).toBe(3)
    expect(shieldSecondsAt(SHIELD_MAX_LEVEL)).toBe(6)
  })

  it('owns the grenade from the first run and not the shield', async () => {
    const { skillOwned } = await import('@/use/useSkills')
    expect(skillOwned('grenade')).toBe(true)
    expect(skillOwned('shield')).toBe(false)

    const { __setUpgradeLevel } = await import('@/use/useUpgrades')
    __setUpgradeLevel('shield', 1)
    expect(skillOwned('shield')).toBe(true)
  })
})

describe('the cooldown runs across runs', () => {
  it('is stored in the save as a timestamp, not as a per-run counter', async () => {
    const { startCooldown, skillReady } = await import('@/use/useSkills')
    const { getState } = await import('@/use/useTowerState')
    const { SKILL_READY_KEY } = await import('@/keys')

    startCooldown('grenade')
    expect(skillReady('grenade')).toBe(false)

    const stored = getState<Record<string, number>>(SKILL_READY_KEY, {})
    // An absolute epoch time, not a remaining count: a remaining count only
    // ticks while something is running it, and a player who closes the tab for a
    // minute has genuinely waited a minute.
    expect(stored.grenade).toBeGreaterThan(Date.now())
    expect(stored.grenade! - Date.now()).toBeLessThanOrEqual(SKILL_COOLDOWN_MS)
  })

  it('survives starting a new stage — dying is not a refund', async () => {
    const { startCooldown, skillReady } = await import('@/use/useSkills')
    const game = await importGame()

    startCooldown('grenade')
    expect(skillReady('grenade')).toBe(false)

    // A fresh run, exactly as a wipe or a clear would produce.
    game.startStage(3)
    expect(skillReady('grenade'), 'a new run handed the grenade back').toBe(false)
  })

  it('reports a charge that fills rather than a bare boolean', async () => {
    const { startCooldown, skillCharge } = await import('@/use/useSkills')
    expect(skillCharge('grenade')).toBe(1)
    startCooldown('grenade')
    const c = skillCharge('grenade')
    expect(c).toBeGreaterThanOrEqual(0)
    expect(c).toBeLessThan(0.2)
  })

  it('cannot be stranded by a clock moved backwards', async () => {
    const { startCooldown, skillReadyIn } = await import('@/use/useSkills')
    const { setState } = await import('@/use/useTowerState')
    const { SKILL_READY_KEY } = await import('@/keys')

    startCooldown('grenade')
    // A device whose clock jumps a year forward would otherwise park the skill
    // until then.
    setState(SKILL_READY_KEY, { grenade: Date.now() + 365 * 24 * 3600 * 1000 })
    expect(skillReadyIn('grenade')).toBeLessThanOrEqual(SKILL_COOLDOWN_MS)
  })
})

describe('the grenade', () => {
  it('does nothing, and costs nothing, on an empty road', async () => {
    const game = await importGame()
    game.startStage(1)
    // Nothing spawned yet: no foes, no boss.
    expect(game.throwGrenade(3), 'a grenade thrown at nothing claimed a hit').toBe(false)
  })

  it('kills what it lands on', async () => {
    const game = await importGame()
    game.startStage(6)
    game.debugAddUnits(60)
    game.debugAddDamage(20)

    // Run until a pack is inside the grenade's own reach — it only targets what
    // is ahead of the crowd and on screen, so "somewhere up the road" is not
    // enough to prove anything.
    const inReach = () => game.getFoes().filter(
      (f) => !f.dead && f.y > game.anchor().y - 2 && f.y < game.anchor().y + 24
    )
    for (let i = 0; i < 6000; i++) {
      game.step(STEP_MS)
      if (inReach().length >= 3) break
      if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
    }
    const marked = inReach()
    if (marked.length < 3) return

    expect(game.throwGrenade(6)).toBe(true)

    // The grenade is an OBJECT now, so the damage lands when it does — not on
    // the frame the button was pressed. Fly it out, then judge the bodies it was
    // actually aimed at rather than a headcount of the window, which refills
    // with whatever walked in during the flight.
    for (let i = 0; i < 60; i++) {
      game.step(STEP_MS)
      if (game.getGrenades().length === 0) break
    }
    expect(game.getGrenades(), 'the grenade never landed').toHaveLength(0)
    expect(
      marked.filter((f) => f.dead).length,
      'the blast left the pack untouched'
    ).toBeGreaterThan(0)
  })

  it('lands 2.2x on a boss where the road takes 3x', async () => {
    const game = await importGame()
    const { bossKindFor } = await import('@/game/threats')
    const { BOSS_GUARD_GATES } = await import('@/game/survival')
    // An ordinary stage below the melt floor, so the floor's cap is not what is
    // measured, and not a healer, whose casts would move the bar on their own.
    const stage = [2, 3, 4, 5].find((s) => bossKindFor(s) !== 'healer')!
    game.startStage(stage)
    game.debugAddUnits(60)
    game.debugSkipToArena()
    for (let i = 0; i < 12000 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    expect(game.phase.value, 'never reached the boss').toBe('boss')
    const b = game.getBoss()!

    // Shield up and no gates left: gunfire cannot touch the bar and nothing
    // clamps it, so whatever the boss loses in flight is the grenade alone.
    const pin = () => { b.guarded = BOSS_GUARD_GATES.length; b.guard = 1 }
    pin()
    b.hp = 1e9
    expect(game.throwGrenade(GRENADE_BASE_MULT)).toBe(true)
    const g = game.getGrenades()[0]!
    expect(g.power, 'the road lost its 3x').toBeCloseTo(g.dps * GRENADE_BASE_MULT, 6)

    for (let i = 0; i < 60 && game.getGrenades().length > 0; i++) {
      pin()
      game.step(STEP_MS)
    }
    expect(game.getGrenades(), 'the grenade never landed').toHaveLength(0)
    expect(1e9 - b.hp).toBeCloseTo(g.dps * GRENADE_BOSS_BASE_MULT, 2)
  })
})

describe('the shield', () => {
  it('halves losses exactly, rather than rolling for them', async () => {
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(80)

    // Ten deaths with the shield up must cost five survivors, every time — a
    // coin flip has the same expected value and a much worse feeling, because a
    // player who loses four in a row concludes the skill does nothing.
    game.raiseShield(5)
    expect(game.shieldActive()).toBe(true)

    const start = game.squadCount.value
    const units = game.getUnits().filter((u) => u.dying <= 0).slice(0, 10)
    expect(units.length).toBe(10)
    for (const u of units) game.__killUnitForTest(u)

    expect(start - game.squadCount.value).toBe(5)
  })

  it('takes everything again once it lapses', async () => {
    const game = await importGame()
    game.startStage(1)
    game.debugAddUnits(80)

    game.raiseShield(0.001)
    await new Promise((r) => setTimeout(r, 30))
    expect(game.shieldActive()).toBe(false)

    const start = game.squadCount.value
    for (const u of game.getUnits().filter((u) => u.dying <= 0).slice(0, 4)) {
      game.__killUnitForTest(u)
    }
    expect(start - game.squadCount.value).toBe(4)
  })

  it('refuses a zero duration — a locked shield is not a free one', async () => {
    const game = await importGame()
    game.startStage(1)
    game.raiseShield(shieldSecondsAt(0))
    expect(game.shieldActive()).toBe(false)
  })
})
