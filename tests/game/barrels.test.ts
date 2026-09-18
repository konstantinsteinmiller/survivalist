// ─── TNT barrels ────────────────────────────────────────────────────────────
//
// The boss arena's damage lever, and the answer to the one stretch of the
// climax where the player had no offence at all.
//
// A boss plants and raises a shield at fixed health gates; during that phase
// gunfire is designed to do nothing and the correct play is to MOVE. Honest, but
// it left the player holding a thumb against an invulnerable target. Barrels
// give them something to shoot that still counts — and something to reach for
// when a boss simply out-scales their crowd.
//
// The two properties that make it a lever rather than a solution:
//   • the blast lands THROUGH the shield, and
//   • it still cannot skip a guard gate, so the boss owes the player every
//     phase it always did.

import { beforeEach, describe, expect, it } from 'vitest'
import { BARREL_BLAST_BOSS_FRACTION, BARREL_FUSE_MS } from '@/game/survival'
import { arenaKit } from '@/game/foes'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

/** Stand in the arena with a boss up and the barrels intact. */
const atBoss = async (stage: number): Promise<Game> => {
  const game = await importGame()
  game.startStage(stage)
  game.debugSkipToArena()
  for (let i = 0; i < 400 && !game.getBoss(); i++) game.step(STEP_MS)
  return game
}

/** Break one barrel by hand and run out its fuse. */
const blow = (game: Game, steps = 80): void => {
  const bl = game.getBarrels().find((b) => !b.dead && b.fuse < 0)
  if (bl) bl.fuse = 0
  for (let i = 0; i < steps; i++) game.step(STEP_MS)
}

describe('the arena kit', () => {
  it('leaves the teaching stages bare and furnishes the later ones', () => {
    // Stages 1-5 are still teaching the core loop; a boss with props there is a
    // boss with a second tutorial attached.
    for (const stage of [1, 2, 3, 4, 5]) {
      expect(arenaKit(stage).barrels, `stage ${stage} should be bare`).toBe(0)
      expect(arenaKit(stage).escort).toBeNull()
    }
    const furnished = [6, 8, 10, 13, 15].map((s) => arenaKit(s).barrels)
    expect(furnished.every((n) => n > 0)).toBe(true)
  })

  it('keeps plain fights in the rotation so the furnished ones stay special', () => {
    const between = [7, 9, 12].map((s) => arenaKit(s))
    expect(between.every((k) => k.barrels === 0)).toBe(true)
  })

  it('keeps giving past the authored table instead of going bare again', () => {
    // The campaign runs past 15; a table that simply ran out would make the
    // endless stretch read as one stage repeated.
    const late = [16, 21, 34].map((s) => arenaKit(s))
    expect(late.some((k) => k.barrels > 0 || k.escort !== null)).toBe(true)
  })
})

describe('a barrel in the arena', () => {
  it('spawns with the boss on a furnished stage', async () => {
    const game = await atBoss(6)
    expect(game.getBoss()).toBeTruthy()
    expect(game.getBarrels().length).toBe(arenaKit(6).barrels)
  })

  it('takes real shooting — it is not a pickup', async () => {
    const game = await atBoss(6)
    const bl = game.getBarrels()[0]!
    // "Quite some hits": a barrel the crowd deletes in passing would be a prop
    // the player never has to decide about.
    expect(bl.maxHp).toBeGreaterThan(30)
    expect(bl.fuse).toBe(-1)
  })

  it('lights a fuse rather than vanishing, so the blast can be read coming', async () => {
    const game = await atBoss(6)
    const bl = game.getBarrels()[0]!
    bl.hp = 0
    bl.fuse = 0
    game.step(STEP_MS)
    expect(bl.dead).toBe(false)

    for (let i = 0; i < Math.ceil(BARREL_FUSE_MS / STEP_MS) + 4; i++) game.step(STEP_MS)
    expect(game.getBarrels().find((b) => b.id === bl.id)?.dead ?? true).toBe(true)
  })
})

describe('the blast', () => {
  it('hurts the boss THROUGH its shield — the whole point of the prop', async () => {
    const game = await atBoss(6)
    const boss = game.getBoss()!
    // Put the boss into the phase where gunfire is designed to do nothing.
    boss.guard = 5
    const before = boss.hp

    blow(game)

    expect(boss.hp, 'a barrel did nothing to a shielded boss').toBeLessThan(before)
  })

  it('never carries the boss past a phase it has not played', async () => {
    // The rule is not "a blast cannot cross a gate" — it can, and that reversal
    // is the drama. It is that no gate is crossed WITHOUT its phase: one blast
    // takes the boss to at most the next gate, plants it, and owes the player
    // the swing. Chaining barrels therefore chains phases rather than skipping
    // them, which is why three sticks of TNT cannot fast-forward a boss.
    const game = await atBoss(10)
    const boss = game.getBoss()!

    // The gates THIS boss owes — read from the sim, not assumed: stage 10's is a
    // summoner since the 2026-09-18 boss pass, and it pays a wave every seventh
    // of its bar (`SUMMON_GUARD_GATES`) rather than the ordinary two.
    const nextGate = game.guardGatesFor(10)[boss.guarded]
    if (nextGate === undefined) return
    const gatesBefore = boss.guarded

    // Sit it just above its next gate, then set off exactly one barrel and read
    // the result the instant the fuse runs out. Stepping on past that point
    // lets the one-second guard expire and the crowd's ordinary gunfire resume,
    // which would carry the boss below the floor for reasons that have nothing
    // to do with the blast.
    boss.hp = nextGate * boss.maxHp + boss.maxHp * 0.01
    blow(game, Math.ceil(BARREL_FUSE_MS / STEP_MS) + 2)

    // Exactly one gate crossed, and the phase it owes was opened.
    expect(boss.guarded, 'one blast crossed more than one gate').toBe(gatesBefore + 1)
    expect(boss.guard, 'the boss crossed a gate without raising its shield')
      .toBeGreaterThan(0)

    // And it is resting ON that gate's floor, not through it.
    expect(boss.hp).toBeCloseTo(nextGate * boss.maxHp, 5)
  })

  it('is a lever, not a shortcut: the arena cannot delete the boss', async () => {
    const game = await atBoss(15)
    const boss = game.getBoss()!
    const barrels = game.getBarrels().length
    expect(barrels).toBeGreaterThan(0)

    // Even every barrel at once leaves the fight to be won with the gun.
    const ceiling = barrels * BARREL_BLAST_BOSS_FRACTION
    expect(ceiling, 'the arena alone could end the boss').toBeLessThan(1)
  })

  it('clears the escort standing in it', async () => {
    const game = await atBoss(13)
    expect(arenaKit(13).escort).not.toBeNull()

    const bl = game.getBarrels()[0]!
    // Park an escort body on top of the barrel, then set it off.
    const foe = game.getFoes().find((f) => !f.dead && !f.elite)
    if (!foe) return
    foe.x = bl.x
    foe.y = bl.y
    bl.fuse = 0
    for (let i = 0; i < 120; i++) game.step(STEP_MS)

    expect(foe.dead, 'a body survived a stick of TNT').toBe(true)
  })
})
