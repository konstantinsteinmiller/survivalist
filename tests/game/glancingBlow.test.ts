// ─── A clip is not a crash ──────────────────────────────────────────────────
//
// Reported as the most frustrating way to lose a run: sweeping sideways across
// a crate or a boulder and having it delete the squad. The thumb travelled a few
// pixels too far, and there was no way to read that it was about to happen.
//
// Contact is now resolved on the SHALLOWER axis, which is the same thing as
// asking how the survivor got there:
//
//   deeper in X than in Y → they drove into its face. Running into a wall, and
//     it costs, because going through an obstacle has to be the expensive answer.
//   deeper in Y than in X → they are level with it and only just inside its
//     edge. That is clipping a corner while steering, and it costs nothing: the
//     survivor slides around and carries on.

import { describe, expect, it } from 'vitest'
import { BARRICADE_W, UNIT_R } from '@/game/survival'

const STEP_MS = 16

const fresh = async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  return import('@/use/useSurvivalGame')
}

/**
 * Drive one ISOLATED barricade block two different ways and report the cost.
 *
 * Isolated matters, and it is the whole reason this hunts for a block rather
 * than naming one. A wall is usually a PAIR: aiming at the outer edge of one
 * puts the crowd squarely into the face of the other, so "clipping an edge"
 * measures a head-on collision with its neighbour and the test learns nothing.
 * A block with clear road beside it is the only shape that can answer the
 * question.
 *
 * The block is pinned unbreakable for the whole approach, which is what makes
 * this a test of the contact rule rather than of how fast a squad demolishes
 * things. Only losses booked while the crowd is level with it are counted, so
 * nothing else on the road can be mistaken for it.
 *
 * @param aim `face` steers at the block's centre; `edge` rides alongside and
 *   crosses only its outer edge once level with it.
 */
const driveInto = async (aim: 'face' | 'edge') => {
  const game = await fresh()
  // STAGE 5, and its first gauntlet (y = 46): a rail with the whole channel to
  // its left, which is exactly the shape this needs. It was stage 4 while stage
  // 4's first wall was a lone trimmed block; since stages 2-8 were re-cut
  // (2026-09-18) stage 4 opens on a CLOSED chicane, whose outer block becomes
  // "isolated" the moment the crowd shoots its inner neighbour away — and
  // riding its edge then drives straight into the second wall of the S, which
  // measures the chicane rather than the contact rule.
  game.startStage(5)
  game.debugAddUnits(70)

  let picked: number | null = null
  let lockedId: number | null = null
  let lost = 0
  let contactFrames = 0

  for (let i = 0; i < 9000; i++) {
    const a = game.anchor()
    const blocks = game.getBarricades().filter((b) => !b.dead && b.y > a.y - 2)
    // Clear road on at least one side, wider than the crowd that has to fit
    // through it.
    //
    // The block's OWN width, not `BARRICADE_W`: the re-cut roads carry
    // closed-chicane blocks two units wide and gauntlet rails 1.2 wide, and an
    // "edge" line computed off the standard block drove into the wider ones —
    // a face hit with the wrong label on it.
    const room = (b: { w: number }) => game.crowdRadius() + b.w
    // LOCKED onto the first block it picks. A gauntlet is rows of rails, and a
    // search re-run every frame hands the approach from one row to the next and
    // then down the rest of the road — measuring whatever the road does after
    // the block rather than the block.
    const block = lockedId !== null
      ? blocks.find((b) => b.id === lockedId)
      : blocks.find((b) => blocks.every(
        (o) => o === b || Math.abs(o.y - b.y) > 2 || b.x - o.x > room(b)
      ))
    if (block && lockedId === null) lockedId = block.id
    if (!block && lockedId !== null) break

    if (block) {
      block.hp = 1e9
      block.maxHp = 1e9
      if (picked === null) picked = block.x
      const gap = block.y - a.y
      game.steerTo(
        aim === 'face'
          ? block.x
          // The crowd's near edge inside the block's edge, its body outside.
          : block.x - (block.w / 2 + game.crowdRadius())
      )
      if (Math.abs(gap) < 2.5) {
        contactFrames++
        const before = game.deathBreakdown().barricade
        game.step(STEP_MS)
        lost += game.deathBreakdown().barricade - before
        if (game.phase.value !== 'run') break
        continue
      }
      if (gap < -3) break
    }
    game.step(STEP_MS)
    if (game.phase.value !== 'run') break
  }

  return { found: picked !== null, contactFrames, lost, squad: game.squadCount.value }
}

describe('sweeping into an obstacle from the side', () => {
  it('costs nothing, where driving into its face costs plenty', async () => {
    const face = await driveInto('face')
    const edge = await driveInto('edge')

    expect(face.found && edge.found, 'no isolated barricade on stage 5').toBe(true)
    expect(face.contactFrames, 'the face run never reached the block').toBeGreaterThan(5)
    expect(edge.contactFrames, 'the edge run never reached the block').toBeGreaterThan(5)

    // THE claim, in the terms the player experiences it. Measured before this
    // change the two were the same event; measured after, driving into the face
    // cost 30 survivors and ENDED the run, while clipping the edge cost 2 and
    // the squad carried on and grew to 61.
    //
    // Not asserted as exactly zero. The formation is a spring, so a couple of
    // survivors on the inside shoulder genuinely end up inside the block rather
    // than beside it, and pinning that to zero would buy a flaky suite in
    // exchange for a claim nobody makes. A scratch is not the complaint; losing
    // the run to a thumb-twitch was.
    // As a SHARE of the crowd, not a headcount. The absolute number scales with
    // squad size — the formation is a spring, so a wider crowd puts more
    // survivors on the inside shoulder — and a bound of "three bodies" only ever
    // meant anything for the squad size it was measured at.
    expect(edge.lost / (edge.squad + edge.lost), 'a glancing clip cost more than a scratch')
      .toBeLessThan(0.15)
    expect(edge.squad, 'the run did not survive a glancing clip').toBeGreaterThan(0)

    // …and the other half, so an obstacle that quietly stopped mattering at all
    // fails this just as loudly as the frustration it replaced.
    expect(face.lost, 'driving into a barricade stopped costing anything')
      .toBeGreaterThan(edge.lost * 3)
  })

  it('carries the squad past the obstacle rather than stopping it', async () => {
    const edge = await driveInto('edge')
    expect(edge.squad, 'the squad did not survive its own steering').toBeGreaterThan(0)
  })
})
