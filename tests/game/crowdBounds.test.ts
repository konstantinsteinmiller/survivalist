import { beforeEach, describe, expect, it } from 'vitest'

// ─── The crowd stays on the road, and the HUD never shows nonsense ───────────
//
// Two bugs that a player sees instantly and a type-checker never will:
//
//   1. survivors strolling straight through the rail and off the edge of the
//      lane, because the formation is a disc around an anchor that is allowed
//      to sit closer to the barrier than the disc's own radius;
//   2. `NaN` rendered into a HUD pill, which reads as a broken game even when
//      the simulation underneath is perfectly healthy.
//
// Both are now structurally impossible, and this file is what keeps them so.

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

const advance = (game: Game, steps: number): void => {
  for (let i = 0; i < steps; i++) game.step(16)
}

describe('the crowd behaves like a swarm against the rail, not a ghost through it', () => {
  it('never lets a single survivor stand off the road, at any squad size', async () => {
    const game = await importGame()
    const { LANE_HALF, UNIT_R } = await import('@/game/survival')
    const edge = LANE_HALF - UNIT_R

    game.startStage(4)
    game.debugAddUnits(320)

    // Slam the thumb into each rail in turn and hold it there. This is the
    // exact input that used to push half the formation over the edge.
    for (const side of [1, -1]) {
      game.steerTo(side * LANE_HALF * 2) // deliberately past the clamp
      advance(game, 240)
      for (const u of game.getUnits()) {
        expect(Math.abs(u.x), `a survivor stood at x=${u.x.toFixed(2)}`)
          .toBeLessThanOrEqual(edge + 1e-6)
      }
    }
  })

  it('lengthens along the lane instead of stacking on the barrier', async () => {
    const game = await importGame()
    const { LANE_HALF } = await import('@/game/survival')

    const depthOf = (steerX: number): number => {
      game.startStage(4)
      game.debugAddUnits(260)
      game.steerTo(steerX)
      advance(game, 240)
      const alive = game.getUnits().filter((u) => u.dying <= 0)
      const ys = alive.map((u) => u.y)
      return Math.max(...ys) - Math.min(...ys)
    }

    const centred = depthOf(0)
    const pinned = depthOf(LANE_HALF * 2)

    // A crowd with nowhere left to go sideways spreads down the road. Without
    // the redistribution it would simply pile into a hard vertical line ON the
    // rail, which is the same visual bug wearing a different hat.
    expect(pinned).toBeGreaterThan(centred * 1.15)
  })

  it('parts around a miniboss instead of walking through it', async () => {
    const game = await importGame()
    const { ELITE_BODY_HALF_H, ELITE_BODY_HALF_W, UNIT_R } = await import('@/game/survival')

    // The reported bug: a squad that FAILS to kill the elite watches it break
    // off after `ELITE_HOLD_MAX` and walk back down the road straight through
    // them, survivors crossing the sprite and coming out the far side. Every
    // other solid thing on the road already parts the crowd; the elite was the
    // exception because foes are handled by the bite loop, not the obstacle one.
    //
    // Deliberately UNDER-GUNNED, and that is the whole setup: while the elite is
    // holding, `stopAt = f.y - ELITE_HOLD_AHEAD` keeps the crowd a clear 1.3
    // units short of the body, so a squad that wins the fight never touches it
    // and proves nothing. Stage 14 against forty survivors with no upgrades is a
    // fight the crowd loses — the leash expires, the elite breaks off, and it
    // walks back down the road through the middle of them. (Measured: a
    // 400-strong squad on stage 6 kills it in 7.5 s and never gets closer than
    // 1.30.) Steered dead centre so it ends up inside the formation rather than
    // by a rail, where the road clamp would legitimately pin a survivor inside.
    game.startStage(14)
    game.debugAddUnits(40)
    game.steerTo(0)

    let sawElite = false
    let sawInBand = false
    let sawItPass = false

    for (let i = 0; i < 2600; i++) {
      game.step(16)
      const elite = game.getFoes().find((f) => f.elite && !f.dead)
      if (!elite) continue
      sawElite = true
      if (elite.y < game.anchor().y) sawItPass = true

      const halfW = elite.scale * ELITE_BODY_HALF_W
      const halfH = elite.scale * ELITE_BODY_HALF_H
      for (const u of game.getUnits()) {
        if (u.dying > 0) continue
        // Only the survivors level with the body can be inside it at all.
        if (Math.abs(u.y - elite.y) > halfH + UNIT_R) continue
        sawInBand = true
        expect(
          Math.abs(u.x - elite.x),
          `frame ${i}: a survivor stood inside the miniboss at x=${u.x.toFixed(2)} ` +
          `against a body at ${elite.x.toFixed(2)} ±${halfW.toFixed(2)}`
        ).toBeGreaterThanOrEqual(halfW + UNIT_R - 1e-6)
      }
    }

    expect(sawElite, 'no elite ever spawned — the test proved nothing').toBe(true)
    expect(sawInBand, 'no survivor ever stood level with the body').toBe(true)
    // …and the case that was actually reported: the crowd out-lived the hold and
    // the elite walked back through them.
    expect(sawItPass, 'the elite never broke off and walked past').toBe(true)
  })
})

describe('the HUD can never be handed a number it cannot render', () => {
  it('keeps the run fire rate finite and in band whatever it is fed', async () => {
    const game = await importGame()
    const { MAX_FIRE_RATE, BASE_FIRE_RATE } = await import('@/game/survival')

    game.startStage(1)
    expect(game.runFireRate.value).toBe(BASE_FIRE_RATE)

    game.debugAddFireRate(Number.NaN)
    expect(Number.isFinite(game.runFireRate.value)).toBe(true)

    game.debugAddFireRate(Number.POSITIVE_INFINITY)
    expect(game.runFireRate.value).toBe(MAX_FIRE_RATE)

    game.debugAddFireRate(-999)
    expect(game.runFireRate.value).toBeGreaterThan(0)
  })

  it('starts every stage at the meta rate, never at whatever the last run ended on', async () => {
    const game = await importGame()
    const { BASE_FIRE_RATE } = await import('@/game/survival')

    game.startStage(1)
    game.debugAddFireRate(3)
    expect(game.runFireRate.value).toBeGreaterThan(BASE_FIRE_RATE)

    game.startStage(2)
    expect(game.runFireRate.value).toBe(BASE_FIRE_RATE)
  })
})
