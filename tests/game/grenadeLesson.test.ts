import { beforeEach, describe, expect, it } from 'vitest'
import {
  GRENADE_TUTORIAL, GRENADE_TUTORIAL_RANGE, GRENADE_TUTORIAL_SLOWMO_S,
  GRENADE_TUTORIAL_STAGE, grenadeTutorialDue
} from '@/game/grenadeTutorial'
import { GRENADE_TAUGHT_KEY } from '@/keys'

/**
 * ─── The one time the game takes the controls away ──────────────────────────
 *
 * Two playtests found the same hole: nobody works out that the four buttons at
 * the bottom of the road are buttons. One tester discovered it at stage 5 from a
 * cooldown number ("nothing told me these were tap-to-use — I've been ignoring
 * active abilities this whole run"); another tapped around them all session. So
 * the game stops, once, on the first miniboss, and does not start again until
 * the player has thrown a grenade.
 *
 * That design has one property that makes it dangerous in a way nothing else in
 * this codebase is: IT IS A DEAD END IF IT IS WRONG. The world is stopped, the
 * lightbox is up, and the only exit is a specific act. If the act is not
 * available, the player's only way out is to reload the tab.
 *
 * That is not hypothetical. It shipped that way and was caught in a browser, not
 * here: the lesson started when the elite SPAWNED, an elite spawns forty units
 * off the top of the screen, and `grenadeTarget` — correctly, for an ordinary
 * press — refuses a throw with nothing in range. The instruction on screen and
 * the only accepted answer were mutually exclusive for as long as the player
 * cared to keep pressing.
 *
 * So the two assertions that matter here are both about that, and they are
 * belt AND braces on purpose:
 *
 *   IT STARTS IN RANGE     the elite is close enough to be thrown at before the
 *                          world stops for it;
 *   IT CANNOT REFUSE       and even if it were not, the throw is accepted while
 *                          the lesson holds, so the exit exists by construction.
 */

const STEP_MS = 16
const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const g = await importGame()
  g.__resetForTest()
  g.setGrenadeTutorialAllowed(false)
})

/** Walk the teaching stage until the world stops, or give up. */
const walkToLesson = (game: Game, maxMs = 120_000): number => {
  game.startStage(GRENADE_TUTORIAL_STAGE)
  let t = 0
  while (t < maxMs) {
    game.step(STEP_MS)
    t += STEP_MS
    if (game.grenadeTeachHeld.value) return t
    if (game.phase.value !== 'run' && game.phase.value !== 'boss') return -1
  }
  return -1
}

describe('the rule, without a canvas', () => {
  it('teaches once, on the stage that carries the first miniboss', () => {
    expect(GRENADE_TUTORIAL).toBe(true)
    const base = { stage: GRENADE_TUTORIAL_STAGE, taught: false, expedition: false }
    expect(grenadeTutorialDue(base)).toBe(true)
    // Already learnt — including by a player who simply threw one of their own.
    expect(grenadeTutorialDue({ ...base, taught: true })).toBe(false)
    // The daily expedition is not a first session; stopping it dead to teach a
    // returning player their own grenade would be an insult and a wasted run.
    expect(grenadeTutorialDue({ ...base, expedition: true })).toBe(false)
    for (const stage of [2, 3, 4, 9]) {
      expect(grenadeTutorialDue({ ...base, stage })).toBe(false)
    }
    // And it is stage ONE, not stage two. `placeMinibosses` gives stage 1 an
    // elite of its own — the `'tutorial'` rank that replaced its boss — so a
    // lesson on stage 2 would be teaching on the SECOND miniboss and letting
    // the first one go by unanswered, which is the one place it had to land.
    expect(GRENADE_TUTORIAL_STAGE).toBe(1)
  })
})

describe('the lesson does not start in front of nobody', () => {
  it('never stops a world that has no player at the controls', async () => {
    // `setGrenadeTutorialAllowed` is off by default and only the scene turns it
    // on. Everything else that drives `step()` — this suite, the balance
    // harness, the preview recorder — has no hands, and a world that stops for
    // them simply never resolves. Eleven specs proved that in one run.
    const game = await importGame()
    expect(walkToLesson(game, 40_000), 'the lesson stopped a headless run').toBe(-1)
    expect(game.grenadeTeaching()).toBe(false)
  })
})

describe('the lesson can always be answered', () => {
  it('waits for the elite to be within throwing range before stopping', async () => {
    const game = await importGame()
    game.setGrenadeTutorialAllowed(true)
    const at = walkToLesson(game)
    expect(at, 'the lesson never started').toBeGreaterThan(0)

    // The whole of the bug that shipped. At the moment the world stops, the
    // thing the player is being asked to bomb has to be a thing on the road.
    const crowd = game.anchor()
    const elite = game.getFoes().find((f) => !f.dead && f.elite)
    expect(elite, 'the world stopped with no elite alive at all').toBeTruthy()
    expect(
      elite!.y - crowd.y,
      'the world stopped while the miniboss was still walking in from off-screen'
    ).toBeLessThanOrEqual(GRENADE_TUTORIAL_RANGE)
  }, 60_000)

  it('accepts the throw it is demanding, and ends on it', async () => {
    const game = await importGame()
    game.setGrenadeTutorialAllowed(true)
    expect(walkToLesson(game)).toBeGreaterThan(0)

    expect(game.throwGrenade(3), 'the lesson refused the one act that ends it').toBe(true)
    expect(game.grenadeTeaching()).toBe(false)
    expect(game.grenadeTeachHeld.value).toBe(false)
    // Written immediately rather than at the end of the stage: a player taught
    // this and then closing the tab has been taught.
    expect(game.grenadeTaught()).toBe(true)
  }, 60_000)

  it('does not stop the same player twice', async () => {
    const game = await importGame()
    game.setGrenadeTutorialAllowed(true)
    expect(walkToLesson(game)).toBeGreaterThan(0)
    expect(game.throwGrenade(3)).toBe(true)

    // A retry of the same stage, already taught.
    expect(walkToLesson(game, 40_000), 'the lesson came back for a taught player').toBe(-1)
  }, 90_000)

  it('crawls before it stops, so a player who already knows never sees it', async () => {
    // The design in one assertion: a lesson that went straight to a full stop
    // would put a lightbox in front of somebody who was already reaching for the
    // button. There is a window, and it is the length of the crawl.
    const game = await importGame()
    game.setGrenadeTutorialAllowed(true)
    game.startStage(GRENADE_TUTORIAL_STAGE)

    let crawling = -1
    for (let t = 0; t < 120_000; t += STEP_MS) {
      game.step(STEP_MS)
      if (crawling < 0 && game.grenadeTeaching()) crawling = t
      if (game.grenadeTeachHeld.value) {
        expect(crawling, 'the world stopped without crawling first').toBeGreaterThan(-1)
        expect(
          t - crawling,
          'the crawl was not the window the constant says it is'
        ).toBeGreaterThanOrEqual(GRENADE_TUTORIAL_SLOWMO_S * 1000 - STEP_MS * 2)
        return
      }
      if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
    }
    throw new Error('the lesson never held the world')
  }, 60_000)

  it('drops the lesson if the thing it was going to teach with dies first', async () => {
    // The armed elite must not outlive its own body. Its id addresses a POOLED
    // `foes` entry (`takeFoe`), so a stale id is not merely a no-op — it can be
    // matched by whatever the pool hands out next, and the world would stop for
    // a wolf halfway down the road with no health bar and no reason.
    //
    // Killed by hand rather than by damage: at four times health the elite
    // reliably reaches range even against a maxed-out crowd, which is the
    // tuning working, and is the wrong way to reach the case under test.
    const game = await importGame()
    game.setGrenadeTutorialAllowed(true)
    game.startStage(GRENADE_TUTORIAL_STAGE)

    let killed = false
    for (let t = 0; t < 120_000; t += STEP_MS) {
      game.step(STEP_MS)
      if (!killed) {
        const el = game.getFoes().find((f) => !f.dead && f.elite)
        // Take it off the board while it is still out of range — the window the
        // arm is live in.
        if (el && el.y - game.anchor().y > GRENADE_TUTORIAL_RANGE + 4) {
          el.dead = true
          killed = true
        }
      }
      expect(game.grenadeTeaching(), 'the world stopped for an elite that is dead').toBe(false)
      if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
    }
    expect(killed, 'the elite was never caught out of range to kill').toBe(true)
    expect(localStorage.getItem(GRENADE_TAUGHT_KEY)).not.toBe('true')
  }, 60_000)
})
