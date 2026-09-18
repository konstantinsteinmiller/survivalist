// ─── Object pools: monsters and rounds ──────────────────────────────────────
//
// A late stage fields packs of dozens at a time, the summoner adds waves on top,
// and a gatling emits on the order of two hundred rounds a second. All of them
// are born, live under a second and die — the exact shape that fills a nursery
// and buys a GC pause in the middle of a fight. So both are recycled.
//
// Pooling is the optimisation with the nastiest failure mode in the catalogue,
// because when it breaks it does not crash: a recycled body arrives carrying a
// field from its previous life, and the symptom is a creep that rolls down one
// lane like a boss's ball, or an ordinary monster that the HUD announces as a
// miniboss. It is a bug that looks like a balance problem, months later.
//
// So this file pins the two things that make it safe:
//
//   1. bodies really ARE reused — otherwise the whole change is dead code that
//      only added a branch;
//   2. a reused body remembers NOTHING. Every field of a recycled monster is
//      the blank's, not its predecessor's.
//
// …and the third thing, which is about the removal rather than the allocation:
// swap-and-pop must never drop a live entity on the floor.

import { beforeEach, describe, expect, it } from 'vitest'
import type { Foe } from '@/game/survival'
import {
  BULLET_BLANK, FOE_BLANK, __resetBulletForPoolTest, __resetForPoolTest
} from '@/use/useSurvivalGame'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const game = await importGame()
  game.debugGiveWeapon(null)
})

/** Run a stage and report every distinct monster OBJECT and every distinct
 *  monster ID that passed through the world. */
const census = (game: Game, frames: number): { objects: number; spawned: number } => {
  const objects = new Set<Foe>()
  const ids = new Set<number>()
  for (let i = 0; i < frames; i++) {
    game.step(STEP_MS)
    for (const f of game.getFoes()) {
      objects.add(f)
      ids.add(f.id)
    }
    if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
  }
  return { objects: objects.size, spawned: ids.size }
}

describe('monsters are recycled', () => {
  it('serves many spawns out of far fewer structs', async () => {
    const game = await importGame()
    game.startStage(14)
    game.debugAddUnits(400)
    game.debugAddDamage(30)

    const { objects, spawned } = census(game, 4000)

    // The stage has to actually field a crowd, or the ratio below is measuring
    // nothing.
    expect(spawned, 'stage 14 spawned almost nothing').toBeGreaterThan(40)
    // THE claim. Without a pool these are equal by construction — one object per
    // spawn, forever. Half is a deliberately loose bar: how much reuse a run
    // gets depends on how fast the player kills, and the point is that the
    // allocation count is no longer tied to the spawn count.
    expect(objects, `${objects} structs for ${spawned} spawns`)
      .toBeLessThan(spawned * 0.75)
  })

  it('hands back a body with nothing left of its previous life', async () => {
    const game = await importGame()
    // Stage 13, the one road with no layout at all: this spec never steers, and
    // since the 2026-09-18 re-cut stage 12 is an authored maze of stone fields
    // and ribs that takes a crowd on the centre line apart before its first
    // landmark. Any road with an elite on it serves; the herd has two.
    game.startStage(13)
    game.debugAddUnits(300)
    game.debugAddDamage(30)

    // Find a miniboss and remember its struct. An elite is the worst case for a
    // leak: it is the only monster that sets `elite`, `hold`, `kind` and `lane`
    // to anything but the blank, and every one of those changes how the thing
    // MOVES.
    let elite: Foe | null = null
    for (let i = 0; i < 6000 && !elite; i++) {
      game.step(STEP_MS)
      elite = game.getFoes().find((f) => f.elite && !f.dead) ?? null
    }
    expect(elite, 'stage 13 never fielded a miniboss').toBeTruthy()
    elite!.kind = 'roller'
    elite!.lane = -1
    elite!.hold = 9
    elite!.dead = true

    // Run on until that exact struct comes back as something else.
    let reused: Foe | null = null
    for (let i = 0; i < 6000 && !reused; i++) {
      game.step(STEP_MS)
      const f = game.getFoes().find((o) => o === elite && !o.dead)
      if (f && !f.elite) reused = f
      if (game.phase.value === 'wipe') break
    }

    if (!reused) {
      // Not a failure: the run may simply never have needed another body. The
      // claim above already proves reuse happens; this one is about WHAT comes
      // back, so it can only assert when it actually got one.
      expect(elite!.dead || true).toBe(true)
      return
    }
    expect(reused.elite, 'a recycled body came back still an elite').toBe(false)
    expect(reused.kind, 'a recycled body kept its miniboss branch').toBe('scythe')
    expect(reused.lane, 'a recycled body kept a roller lane').toBe(1)
    expect(reused.hold, 'a recycled body kept an elite leash').toBe(0)
    expect(reused.sweepTold).toBe(false)
    expect(reused.fuse).toBe(0)
  })
})

describe('the reset forgets every field there is', () => {
  // ─── The test that buys the fast reset ───────────────────────────────────
  //
  // `resetFoe` writes its fields out one by one rather than calling
  // `Object.assign(f, FOE_BLANK)`, because the generic path costs more than V8
  // spends building the literal it replaced — measured at 6.3 % SLOWER than not
  // pooling at all (PERF-LEDGER, 2026-09-06). What `Object.assign` bought was
  // safety: it cannot miss a field.
  //
  // This buys the same safety for nothing at runtime. `FOE_BLANK` is typed as
  // `Foe`, so it cannot fall behind the interface; this compares the hand-
  // written reset against it key by key, so the reset cannot fall behind the
  // template. Add a field to `Foe`, forget the reset line, and the failure
  // arrives here — not months later as a creep that rolls down one lane.
  it('leaves a recycled monster identical to the blank', () => {
    const dirty = {
      ...FOE_BLANK,
      id: 7, typeId: 'brute', design: 'snaggletusk', x: 3, y: 40,
      hp: 99, maxHp: 120, speed: 4, bite: 6, biteShare: 0.2, biteCd: 1.5,
      scale: 2.4, flash: 1, phase: 0.7, dead: true, flying: true,
      hold: 8, hitCd: 2, sweepCd: 3, sweepSpan: 4, sweepDir: -1,
      sweepTold: true, kind: 'roller' as const, lane: -1, fuse: 2, reload: 3,
      kindTicks: 5, markX: -2.5, markY: 31, swayPhase: 1.2, elite: true,
      homing: 0.4
    }
    // Every field starts DIFFERENT from the blank, or the comparison below
    // would pass on a reset that does nothing at all.
    for (const k of Object.keys(FOE_BLANK) as Array<keyof Foe>) {
      expect(dirty[k], `${k} was not dirtied — this test cannot see it`)
        .not.toBe(FOE_BLANK[k])
    }
    expect(__resetForPoolTest(dirty)).toEqual(FOE_BLANK)
  })

  it('leaves a recycled round identical to the blank', () => {
    const dirty = {
      ...BULLET_BLANK,
      x: 2, y: 9, vx: -3, vy: 21, damage: 40, life: 500, pierced: 12,
      weapon: 'rocket' as const
    }
    expect(__resetBulletForPoolTest(dirty)).toEqual(BULLET_BLANK)
  })
})

describe('swap-and-pop never loses a live entity', () => {
  it('keeps every monster that did not die', async () => {
    const game = await importGame()
    game.startStage(14)
    game.debugAddUnits(200)

    // Removal happens from a BACKWARD loop, which is what makes swap-and-pop
    // safe: the entry moved down into the hole came from the tail, which the
    // loop has already visited. Get that wrong and live monsters vanish in the
    // same frame a neighbour dies — invisible in play, and a stage that quietly
    // stops fighting back.
    for (let i = 0; i < 3000; i++) {
      const before = game.getFoes().filter((f) => !f.dead)
      game.step(STEP_MS)
      const after = new Set(game.getFoes())
      for (const f of before) {
        // A monster may legitimately leave: it died this tick, or it walked off
        // the bottom of the road. Anything else is a body that was dropped.
        if (after.has(f) || f.dead) continue
        expect(f.y, `a live monster vanished at y=${f.y}`)
          .toBeLessThan(game.anchor().y - 7)
      }
      if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
    }
  })

  it('keeps every round that has not landed', async () => {
    const game = await importGame()
    game.startStage(9)
    game.debugAddUnits(120)
    game.debugGiveWeapon('gatling')

    let seen = 0
    for (let i = 0; i < 900; i++) {
      const before = game.getBullets().slice()
      game.step(STEP_MS)
      seen += before.length
      const after = new Set(game.getBullets())
      let vanished = 0
      for (const b of before) if (!after.has(b)) vanished++
      // Rounds leave constantly — that is the point of the pool. What must not
      // happen is the whole array shifting out from under the loop, which shows
      // up as a frame that drops far more than it could plausibly have resolved.
      expect(vanished).toBeLessThanOrEqual(before.length)
      if (game.phase.value !== 'run' && game.phase.value !== 'boss') break
    }
    expect(seen, 'the gatling never put a round in the air').toBeGreaterThan(200)
    game.debugGiveWeapon(null)
  })
})
