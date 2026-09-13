import { beforeEach, describe, expect, it } from 'vitest'

/**
 * ─── The squad IS the payout, and now it looks like it ──────────────────────
 *
 * Both playtests rated the handover's reading Major, and both used the same
 * sentence: "Squad 101 → 3". A hundred survivors the player spent forty seconds
 * collecting vanish between one road and the next, and nothing on screen says
 * they were SOLD — even though `stageReward(stage, peakSquad)` prices the clear
 * off exactly that crowd, so the coins already in the wallet ARE those people.
 *
 * The first fix paid the coins where the player was looking, as one burst from
 * the formation's centre. Playtest 02 read it as a loss anyway, which is fair:
 * one puff of gold off one point is a dropped purse, not a hundred people
 * cashing out. So every body becomes a coin on the tile it is standing on.
 *
 * `cashOutSquad` is the simulation's half of that — it names the bodies and
 * takes them off the road. Three things it must NOT do are the whole of this
 * file, because each of them would put back the exact misreading the change
 * exists to remove.
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

/** Clear a stage for real, leaving the sim parked in `'clear'` — which is where
 *  the celebration, and the cash-out that rides it, happen. */
const clearStage = (game: Game, stage: number): void => {
  game.startStage(stage)
  game.debugAddUnits(400)
  game.debugAddDamage(400)
  game.debugAddFireRate(6)
  game.debugSkipToArena()
  for (let i = 0; i < 9000; i++) {
    game.step(STEP_MS)
    if (game.phase.value === 'clear' || game.phase.value === 'wipe') break
  }
  expect(game.phase.value).toBe('clear')
}

describe('the crowd turns into coins', () => {
  it('hands back one position per living body', async () => {
    const game = await importGame()
    clearStage(game, 6)

    const alive = game.getUnits().filter((u) => u.dying <= 0)
    expect(alive.length, 'nobody survived the clear').toBeGreaterThan(1)

    const paid = game.cashOutSquad()
    expect(paid.length, 'the crowd did not become coins').toBe(alive.length)
    // Positions, not indices: the scene projects these through the renderer's
    // own camera so each coin starts exactly where its body was painted.
    for (const p of paid) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  it('leaves the HUD printing the number the payout was priced against', async () => {
    // The one thing that would undo the whole fix. A squad chip that fell to
    // zero the moment the coins left would be telling the player they had lost
    // the crowd at the exact instant the coins are saying they sold it.
    const game = await importGame()
    clearStage(game, 6)

    const before = game.squadCount.value
    game.cashOutSquad()
    expect(game.squadCount.value, 'the HUD reported the payout as a loss').toBe(before)
  })

  it('keeps the bodies in the array, so the next road still opens under them', async () => {
    // `entryFrom` reads the crowd that won the stage to decide where the next
    // one opens — the continuity the whole continuous-road handover is built on.
    // Splicing them out here would drop it.
    const game = await importGame()
    clearStage(game, 6)

    const n = game.getUnits().length
    game.cashOutSquad()
    expect(game.getUnits().length).toBe(n)
  })

  it('pays each body exactly once, however many times it is asked', async () => {
    // The scene fires this off a timer inside a two-second celebration that a
    // phase change can interrupt. A second call must find nobody rather than
    // throw the crowd at the wallet twice.
    const game = await importGame()
    clearStage(game, 6)

    expect(game.cashOutSquad().length).toBeGreaterThan(0)
    expect(game.cashOutSquad(), 'the crowd was sold twice').toEqual([])
  })

  it('never sells a corpse', async () => {
    // Bodies now lie on the road until the camera carries them off it. They were
    // already lost and already billed to a cause; turning them into coins would
    // pay the player for the people they failed to keep.
    const game = await importGame()
    clearStage(game, 6)

    const dead = game.getUnits().filter((u) => u.dying > 0)
    game.cashOutSquad()
    for (const u of dead) expect(u.cashed, 'a corpse was cashed in').toBe(false)
  })

  it('starts the next stage with a crowd that has not been sold', async () => {
    const game = await importGame()
    clearStage(game, 6)
    game.cashOutSquad()
    game.advanceStage()

    const units = game.getUnits()
    expect(units.length).toBeGreaterThan(0)
    for (const u of units) {
      expect(u.cashed, 'the new road opened with invisible survivors on it').toBe(false)
    }
  })
})
