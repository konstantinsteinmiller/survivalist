/**
 * ─── The cage beside every elite ────────────────────────────────────────────
 *
 * An elite plants, blocks the road for `ELITE_HOLD_MAX` and then breaks off, so
 * killing it and simply outlasting it used to be the same outcome — the kill
 * paid coins, and a first-time player does not value coins because they have not
 * met the shop. The game's one mid-road landmark had no answer to "why would I
 * stop for this".
 *
 * Now it has people in a box next to it. What this file pins is the four things
 * that make that a reward rather than another pickup:
 *
 *   it cannot be shot open at any price;
 *   it opens ONLY on the elite's death, so outlasting it pays nothing;
 *   it pays LESS when the grenade lesson hands the kill over for free;
 *   and the people in it start outside the rail, because it stands off the road.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { buildTrack, MINIBOSS_CAGE_TUTORIAL, minibossCageHold } from '@/game/track'
import {
  ADAPTIVE_BOSS_STAGES
} from '@/game/adaptive'
import { EDGE_X_TEST, REWARD_CAGE_X } from './eliteCageHelpers'

const importGame = () => import('@/use/useSurvivalGame')
const STEP = 16

const sealedOn = (stage: number) =>
  (buildTrack(stage).events as Array<Record<string, any>>)
    .filter((e) => e.kind === 'cages')
    .flatMap((e) => (e.cages as Array<Record<string, any>>)
      .filter((c) => c.sealed === true)
      .map((c) => ({ y: e.y as number, ...c })))

const elitesOn = (stage: number) =>
  (buildTrack(stage).events as Array<Record<string, any>>)
    .filter((e) => e.kind === 'miniboss')
    .map((e) => e.y as number)

describe('where it stands', () => {
  it('gives every elite exactly one, at its own ground', () => {
    for (const stage of [1, 2, 4, 7, 12, 20, 45]) {
      const cages = sealedOn(stage)
      const elites = elitesOn(stage)
      expect(cages.length, `stage ${stage}`).toBe(elites.length)
      // Same y, so it streams in on the same pass and the spawner can bind the
      // two — and so it is on screen for the whole fight.
      for (const y of elites) {
        expect(cages.some((c) => Math.abs(c.y - y) < 1), `stage ${stage} y=${y}`).toBe(true)
      }
    }
  })

  it('stands off the road, past the rail the crowd is clamped to', () => {
    // This is what makes it unreachable rather than merely unshootable: the
    // crowd cannot come within `grindAgainst`'s bite of it, so it can never be
    // an obstacle. And on a portrait phone the screen edge cuts it, which is the
    // look it was asked for.
    for (const stage of [1, 5, 16]) {
      for (const c of sealedOn(stage)) {
        expect(Math.abs(c.x)).toBe(REWARD_CAGE_X)
        expect(Math.abs(c.x)).toBeGreaterThan(EDGE_X_TEST)
      }
    }
  })
})

describe('what it pays', () => {
  it('never pays a fought elite less than the free one', () => {
    // The ordering the first cut of the curve got backwards: stage 1 paid 4 for
    // a fought elite against the tutorial's 5.
    for (let s = 1; s <= 60; s++) {
      expect(minibossCageHold(s), `stage ${s}`).toBeGreaterThan(MINIBOSS_CAGE_TUTORIAL)
    }
  })

  it('caps the taught stages at ten and everything after at twenty', () => {
    for (let s = 1; s <= ADAPTIVE_BOSS_STAGES; s++) {
      expect(minibossCageHold(s), `stage ${s}`).toBeLessThanOrEqual(10)
    }
    for (const s of [6, 10, 20, 40, 80, 200]) {
      expect(minibossCageHold(s), `stage ${s}`).toBeLessThanOrEqual(20)
    }
  })

  it('grows with the road and then stops', () => {
    let last = 0
    for (let s = 1; s <= 200; s++) {
      const v = minibossCageHold(s)
      expect(v, `stage ${s} fell`).toBeGreaterThanOrEqual(last)
      last = v
    }
    expect(minibossCageHold(200)).toBe(20)
  })
})

describe('how it opens', () => {
  beforeEach(async () => {
    localStorage.clear()
    const { __resetTowerState } = await import('@/use/useTowerState')
    __resetTowerState()
  })

  /** Drive stage 1 until the first elite is on the road. */
  const reachElite = async (boost = 0) => {
    const game = await importGame()
    game.startStage(1)
    game.steerOnly.value = false
    if (boost) game.debugAddUnits(boost)
    for (let i = 0; i < 6000; i++) {
      const el = game.getFoes().find((f) => f.elite && !f.dead)
      if (el) return { game, el }
      // Stage 1's packs (three bodies at half again the health since
      // 2026-09-19) stop a crowd that never steers before the elite; the cage
      // is what is under test, so the crowd is kept to a played run's size.
      if (game.squadCount.value < 10) game.debugAddUnits(10 - game.squadCount.value)
      game.steerTo(0)
      game.step(STEP)
      if (game.phase.value !== 'run') break
    }
    return { game, el: null }
  }

  it('cannot be shot open, at any price', async () => {
    const { game, el } = await reachElite(300)
    expect(el, 'stage 1 never fielded an elite').not.toBeNull()
    const cage = game.getCages().find((c) => c.sealed === true && !c.dead)
    expect(cage, 'the elite had no cage beside it').toBeTruthy()
    const hp = cage!.hp
    // The elite is made unkillable for the duration, because otherwise this
    // measures the wrong thing: a crowd big enough to test the cage's immunity
    // kills the elite in under a second and opens it the legitimate way.
    el!.hp = 1e9
    el!.maxHp = 1e9
    // A crowd of three hundred, aimed at the rail nearest it, for four seconds.
    // Bullets pass through it and the rocket cannot even acquire it — `aimTarget`
    // takes monsters and the boss and nothing else.
    game.debugAddDamage(500)
    for (let i = 0; i < 240 && !cage!.dead; i++) {
      game.steerTo(4.2)
      game.step(STEP)
    }
    expect(cage!.hp, 'the cage took damage').toBe(hp)
    expect(cage!.dead, 'the cage was shot open').toBe(false)
  })

  it('opens on the elite’s death, and pays what it held', async () => {
    const { game, el } = await reachElite(80)
    expect(el).not.toBeNull()
    const cage = game.getCages().find((c) => c.sealed === true && !c.dead)
    expect(cage).toBeTruthy()
    const held = cage!.hold
    expect(held).toBeGreaterThan(0)

    const before = game.squadCount.value
    game.debugAddDamage(400)
    for (let i = 0; i < 400 && !cage!.dead; i++) {
      game.steerTo(0)
      game.step(STEP)
    }
    expect(cage!.dead, 'killing the elite did not open the cage').toBe(true)
    // Every survivor it held is in the squad from the frame the bars came off —
    // they are counted immediately and WALK to their slots. Gates can pay in the
    // same window, so the floor is what the cage owed.
    expect(game.squadCount.value - before).toBeGreaterThanOrEqual(held)
  })

  it('pays nothing to a run that just outlasts it', async () => {
    // The whole point: an elite breaks off after `ELITE_HOLD_MAX` and the road
    // carries on. If waiting paid, the cage would be a timer rather than a prize.
    const { game, el } = await reachElite()
    expect(el).not.toBeNull()
    const cage = game.getCages().find((c) => c.sealed === true && !c.dead)
    expect(cage).toBeTruthy()
    // Nobody shoots: the crowd is emptied so the elite cannot die, and the run
    // is stepped well past the leash.
    for (const u of game.getUnits()) u.dying = 1
    for (let i = 0; i < 600 && game.phase.value === 'run'; i++) {
      game.steerTo(0)
      game.step(STEP)
    }
    expect(cage!.dead, 'the cage opened without the elite dying').toBe(false)
  })

  it('lets the people it frees start outside the rail', async () => {
    // The cage is at 5.4 and the crowd is clamped to 4.2, so every survivor it
    // frees begins outside the clamp. An unconditional backstop teleports them
    // all into the lane on frame one and the beat is gone — see the `u.join`
    // exception in `stepUnits`.
    const { game, el } = await reachElite(80)
    expect(el).not.toBeNull()
    const cage = game.getCages().find((c) => c.sealed === true && !c.dead)
    expect(cage).toBeTruthy()
    game.debugAddDamage(400)
    let sawOutside = false
    for (let i = 0; i < 400; i++) {
      game.steerTo(0)
      game.step(STEP)
      if (game.getUnits().some((u) => u.join > 0 && Math.abs(u.x) > EDGE_X_TEST)) {
        sawOutside = true
        break
      }
      if (game.phase.value !== 'run') break
    }
    expect(sawOutside, 'freed survivors were clamped into the lane immediately').toBe(true)
  })
})
