/**
 * ─── The strays on the taught stages ────────────────────────────────────────
 *
 * Stage 1 is 316 units of road carrying four monsters, the first at 39: between
 * that creep and the elite at 120 there are eighty units — six screens — on
 * which nothing living appears. Stages 2 and 3 are a third as long with the same
 * shape in miniature. A `stray` is one creep dropped into that dead air as
 * something to look at.
 *
 * Every rule below was bought with a measurement, and each one of them is a
 * thing that went wrong first:
 *
 *   ROOTED — an ordinary creep walks AND leans onto the crowd's x, so where it
 *     is put decides when it arrives, never whether. Two of them across stage 1
 *     broke the campaign's oldest invariant on the first run of the suite
 *     (`balance.test.ts`: stage 1 must be clearable without steering — 2/3
 *     no-input runs died).
 *   DORMANT — the squad out-ranges a body by ten units and auto-fires, so an
 *     8 hp creep standing in the lane dies 10.2 units out and can never reach
 *     anybody. Priced to survive the approach it needs ~70 hp, nine times a
 *     creep and more than a brute. Sleeping through the approach buys the same
 *     arrival for 8 hp.
 *   FLAT BITE — with the crowd share left on, driving into the stage-3 stray
 *     cost FOUR survivors, because the share owns any crowd worth the name.
 *
 * The placement half is read off the built track; the behaviour half is driven
 * against the real simulation, because "rounds pass through it" is not a thing
 * a track can be asked about.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { buildTrack } from '@/game/track'
import { FOE_REACH, UNIT_R } from '@/game/survival'
import { STRAY_HOMING } from '@/use/useSurvivalGame'
import { foeDef } from '@/game/foes'

const importGame = () => import('@/use/useSurvivalGame')
const STEP_MS = 16

/** Every planted body on a stage, in road order. */
const straysOn = (stage: number) =>
  (buildTrack(stage).events as Array<Record<string, unknown>>)
    .filter((e) => e.kind === 'foes' && e.stray === true)
    .sort((a, b) => (a.y as number) - (b.y as number))

const eventsOn = (stage: number) =>
  [...(buildTrack(stage).events as Array<Record<string, unknown>>)]
    .sort((a, b) => (a.y as number) - (b.y as number))

describe('where the strays are', () => {
  it('puts two on stage 1 and one each on stages 2 and 3', () => {
    // Stage 1 gets two because it HAS two holes: it is more than twice the
    // length of either of the others and its only 18-unit gaps are at 68→86 and
    // 148→166. Stages 2 and 3 top out at twelve.
    expect(straysOn(1).length).toBe(2)
    expect(straysOn(2).length).toBe(1)
    expect(straysOn(3).length).toBe(1)
  })

  it('leaves the rest of the campaign alone', () => {
    // A stray is an onboarding beat. Stage 4 is where the roster, the road and
    // the packs all step up together and the game stops teaching.
    for (const stage of [4, 5, 8, 16, 40]) expect(straysOn(stage)).toEqual([])
  })

  it('is exactly one body, and a creep', () => {
    for (const stage of [1, 2, 3]) {
      for (const s of straysOn(stage)) {
        expect(s.count, `stage ${stage}: a stray is never a pack`).toBe(1)
        expect(s.typeId, `stage ${stage}: the weakest archetype, always`).toBe('creep')
      }
    }
  })

  it('stands on a shoulder rather than on the centre line', () => {
    // `spread` is negated at the call site because the spawner deals a lone body
    // at `-spread`; what matters here is only that it is nowhere near zero. A
    // body in the middle of the lane is a wall the crowd walks into by default.
    for (const stage of [1, 2, 3]) {
      for (const s of straysOn(stage)) {
        expect(Math.abs(s.spread as number), `stage ${stage}`).toBeGreaterThan(2)
      }
    }
  })

  it('never crowds an elite’s run-up', () => {
    // `MINIBOSS_LEAD` keeps twelve units clear either side of a landmark, and a
    // stray parked in that window would turn the approach into a fight.
    for (const stage of [1, 2, 3]) {
      const elites = eventsOn(stage).filter((e) => e.kind === 'miniboss')
      for (const s of straysOn(stage)) {
        for (const el of elites) {
          expect(
            Math.abs((s.y as number) - (el.y as number)),
            `stage ${stage}: stray at ${s.y} is inside the elite at ${el.y}`
          ).toBeGreaterThan(12)
        }
      }
    }
  })

  it('lands in gaps that were actually empty', () => {
    // The whole point: a stray goes where nothing was. Its nearest neighbour on
    // either side has to be far enough that the player was looking at bare road.
    for (const stage of [1, 2, 3]) {
      const all = eventsOn(stage)
      for (const s of straysOn(stage)) {
        const y = s.y as number
        const others = all.filter((e) => e !== s && e.kind !== 'coins')
        const before = others.filter((e) => (e.y as number) < y).pop()
        const after = others.find((e) => (e.y as number) > y)
        const gapBefore = before ? y - (before.y as number) : 99
        const gapAfter = after ? (after.y as number) - y : 99
        expect(Math.min(gapBefore, gapAfter), `stage ${stage}: stray at ${y} is elbowing something`)
          .toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('does not disturb where the elites landed', () => {
    // Adding events to a hand-authored stage must not move the landmarks: the
    // generator nudges elites clear of other beats, and a stray that pushed one
    // would re-cut a stage nobody asked to re-cut. These are the positions from
    // before the feature.
    const at = (stage: number) =>
      eventsOn(stage).filter((e) => e.kind === 'miniboss').map((e) => Math.round((e.y as number) * 100) / 100)
    // Stages 2 and 3 moved when their roads did — `placeMinibosses` puts the
    // first elite at a FRACTION of `arenaY` (0.45-0.60), so a road that goes
    // from 138 to 226 units carries the landmark with it. Stage 1 is untouched,
    // which is the half of this assertion that still guards the original claim.
    expect(at(1)).toEqual([120.08, 271.76])
    expect(at(2)).toEqual([117.3])
    expect(at(3)).toEqual([152.62])
  })
})

describe('how a stray behaves', () => {
  beforeEach(async () => {
    localStorage.clear()
    const { __resetTowerState } = await import('@/use/useTowerState')
    __resetTowerState()
  })

  /**
   * Run stage 1 until its first stray is on the road.
   *
   * Steering to 0 on every frame of the APPROACH matters as much as it does in
   * the assertions below. The game module is a singleton and the steer target
   * survives `startStage`, so a helper that only steps leaves the crowd parked
   * whereever the previous test left it — and a run that arrives at the stray
   * already hugging the rail the stray stands on measures a different beat than
   * the one these tests are about.
   */
  const reachStray = async () => {
    const game = await importGame()
    game.startStage(1)
    game.steerOnly.value = false
    game.steerTo(0)
    for (let i = 0; i < 6000; i++) {
      const s = game.getFoes().find((f) => f.homing < 1 && !f.dead)
      if (s) return { game, s }
      game.steerTo(0)
      game.step(STEP_MS)
      if (game.phase.value !== 'run') break
    }
    return { game, s: null }
  }

  it('is an ordinary body that simply steers badly', async () => {
    const { s } = await reachStray()
    expect(s, 'stage 1 never put a stray on the road').not.toBeNull()
    // Everything about it is a creep except the one multiplier.
    expect(s!.homing).toBe(STRAY_HOMING)
    expect(s!.homing).toBeGreaterThan(0)
    expect(s!.speed).toBe(foeDef('creep').speed)
  })

  it('runs at the squad', async () => {
    const { game, s } = await reachStray()
    expect(s).not.toBeNull()
    const y0 = s!.y
    for (let i = 0; i < 60 && game.phase.value === 'run'; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
    }
    // It walks DOWN the road toward the crowd, like anything else. A body that
    // stood still was the version of this beat that was not fun.
    expect(s!.y, 'a stray stopped coming').toBeLessThan(y0)
  })

  it('cannot cross the lane in the time it has', async () => {
    const { game, s } = await reachStray()
    expect(s).not.toBeNull()
    const x0 = s!.x
    // The whole approach, driven straight down the middle — the arm a no-input
    // run takes, and the one the campaign's oldest invariant is about.
    for (let i = 0; i < 300 && game.phase.value === 'run' && !s!.dead; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
    }
    const leaned = Math.abs(s!.x - x0)
    // It leans — visibly, so it reads as something coming for you…
    expect(leaned, 'a stray did not lean at all').toBeGreaterThan(0)
    // …and nowhere near the two and a half units it would need to reach the
    // centre line. This is the number that keeps a straight-driving run clean.
    expect(leaned, `a stray crossed ${leaned.toFixed(2)} units`).toBeLessThan(1.4)
  })

  it('never gets its teeth into a straight-driving run', async () => {
    const { game, s } = await reachStray()
    expect(s).not.toBeNull()
    // Measured against the STRAY itself rather than against the death ledger:
    // stage 1 carries four ordinary creeps as well, and they home properly, so
    // a `foe` death inside this window says nothing about which body caused it.
    // The claim here is positional and belongs to this one monster.
    const reach = FOE_REACH + UNIT_R
    let nearest = 99
    for (let i = 0; i < 400 && game.phase.value === 'run' && !s!.dead; i++) {
      game.steerTo(0)
      game.step(STEP_MS)
      for (const u of game.getUnits()) {
        if (u.dying > 0) continue
        nearest = Math.min(nearest, Math.hypot(u.x - s!.x, u.y - s!.y))
      }
    }
    // Hold a line and it slides past on its own shoulder — it never reaches
    // biting distance. This is the beat's entire promise to a first-timer, and
    // it is the same property `balance.test.ts` depends on one level up.
    expect(nearest, `a stray closed to ${nearest.toFixed(2)} on a run that never steered`)
      .toBeGreaterThan(reach)
  })

  it('caps its mouthful at the archetype’s flat bite, at any crowd size', async () => {
    const { s } = await reachStray()
    expect(s).not.toBeNull()
    // `want = max(elite floor, bite, ceil(squad * biteShare * relief))`. With the
    // share zeroed the third term is always 0, so a stray takes `bite` — one —
    // however big the crowd gets. Measured with the share left on, the stage-3
    // one cost FOUR survivors.
    expect(s!.biteShare).toBe(0)
    expect(s!.bite).toBe(foeDef('creep').bite)
    expect(s!.bite).toBeLessThanOrEqual(2)
  })

  it('is as weak as the archetype it is drawn from — never priced up to survive', async () => {
    const { game, s } = await reachStray()
    expect(s).not.toBeNull()
    const packFoe = game.getFoes().find((f) => f.homing >= 1 && !f.elite && !f.dead)
    if (packFoe) expect(s!.maxHp).toBeLessThanOrEqual(packFoe.maxHp)
  })
})
