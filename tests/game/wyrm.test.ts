/**
 * ─── The wyrm has to be a fight, not three new effects ──────────────────────
 *
 * Stage 3 was the meteor boss for the third time running, and the 2026-09-20
 * fit test put the session's wall in minute two — where that third rehearsal
 * is. So stage 3 is a new archetype, and the whole claim being made for it is
 * that it asks a question the meteor pool never asks: every one of its three
 * attacks is answered by a crowd that is MOVING, and eaten by one that stopped.
 *
 * That claim is measurable, and everything below measures it on the real
 * `step()` loop rather than on the geometry:
 *
 *   • all three attacks turn up in the FIRST fight (the tier of second verbs
 *     opens five stages later, so a wyrm that inherited the tier would be one
 *     attack repeated);
 *   • every landing is announced before it lands, including the three that are
 *     aimed after the cast is over;
 *   • the whole attack costs ONE swing however many beats it has;
 *   • and a crowd that reads the marks pays materially less than one that does
 *     not — which is the difference between a fight and a tax.
 *
 * The pure half (`game/wyrm.ts`) is asserted as PREMISES — "the gap really is
 * wider than the crowd", "the flame really is narrow enough to leave road on
 * either side" — rather than by restating its constants back at it.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CROWD_MAX_R, LANE_HALF, SLAM_FRACTION_MAX } from '@/game/survival'
import { bossKindFor, WYRM_DESIGN, WYRM_STAGE } from '@/game/threats'
import { bossDesign } from '@/game/foes'
import {
  WYRM_BREATH_SHARE_MUL,
  WYRM_FLARES, WYRM_FLARE_GAP, WYRM_FLARE_S, WYRM_FLAME_HALF_W, WYRM_GAP_HALF,
  WYRM_GAP_SHIFT, WYRM_SPITS, WYRM_SPIT_GAP, WYRM_SPIT_LEAD, WYRM_SPIT_R, WYRM_SWEEP_S,
  inWyrmSpines, wyrmFlareAt, wyrmFlareX, wyrmGapX, wyrmSpineRuns, wyrmSpitAimAt, wyrmSpitAt,
  wyrmSweepDir
} from '@/game/wyrm'
import { drainFx, type FxEvent } from '@/use/useVfx'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
})

interface Beat { tick: number; e: FxEvent }

interface FightOptions {
  squad: number
  damage?: number
  /** Where to steer this tick, or `null` to leave the crowd where it is. */
  steer?: (game: Game, tick: number) => number | null
  maxTicks?: number
}

/** Walk into the wyrm's arena and fight it, keeping every effect with its tick. */
const fightWyrm = async (o: FightOptions) => {
  const game = await importGame()
  game.startStage(WYRM_STAGE)
  game.debugSkipToArena()
  game.debugAddUnits(o.squad)
  if (o.damage) game.debugAddDamage(o.damage)
  for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
  expect(game.phase.value, 'the wyrm arena was never reached').toBe('boss')
  drainFx()

  const squadAtBoss = game.squadCount.value
  const beats: Beat[] = []
  let ticks = 0
  const max = o.maxTicks ?? 4000
  while (ticks < max && game.phase.value === 'boss' && !game.getBoss()?.dead) {
    const to = o.steer ? o.steer(game, ticks) : null
    if (to !== null) game.steerTo(to)
    game.step(STEP_MS)
    for (const e of drainFx()) beats.push({ tick: ticks, e })
    ticks++
  }
  // One more tick so a kill's own effects (`bossDie`) are in the list.
  game.step(STEP_MS)
  for (const e of drainFx()) beats.push({ tick: ticks, e })

  return {
    game,
    beats,
    squadAtBoss,
    lost: squadAtBoss - game.squadCount.value,
    lostShare: squadAtBoss > 0 ? (squadAtBoss - game.squadCount.value) / squadAtBoss : 1,
    killed: game.getBoss()?.dead === true,
    seconds: (ticks * STEP_MS) / 1000
  }
}

const of = <K extends FxEvent['kind']>(beats: Beat[], kind: K) =>
  beats.filter((b) => b.e.kind === kind) as Array<{ tick: number; e: Extract<FxEvent, { kind: K }> }>

/**
 * The badge's own reading, which is all a player gets and all these policies
 * are allowed to use. See `incomingThreat`.
 */
const dodge = (game: Game): number | null => {
  const b = game.getBoss()
  if (!b || b.dead) return null
  const t = game.incomingThreat()
  if (t?.kind === 'gap') return b.slamX
  // The jet: hold while it is still being drawn breath — the sweep is locked on
  // the side the crowd is on, so walking toward the edge it starts from is
  // walking into the first flare — then cross to that edge once it is burning,
  // through the ground that has already burnt.
  if (t?.kind === 'fire') return b.aimed ? null : b.slamX
  if (!b.aimed) return null
  const away = [b.slamX - 4, b.slamX + 4].filter((x) => Math.abs(x) <= LANE_HALF - CROWD_MAX_R)
  return away[0] ?? (b.slamX > 0 ? -3.5 : 3.5)
}

// ─── The premises the geometry has to keep ──────────────────────────────────

describe('the wyrm, on the road', () => {
  it('sweeps from the far side of the road, toward the crowd', () => {
    for (const crowdX of [-3.5, -1, 0, 1, 3.5]) {
      const dir = wyrmSweepDir(crowdX)
      const first = wyrmFlareX(0, dir)
      const last = wyrmFlareX(WYRM_FLARES - 1, dir)
      expect(Math.abs(first - crowdX), `crowd at ${crowdX}: the first flare is not the far one`)
        .toBeGreaterThanOrEqual(Math.abs(last - crowdX))
      expect(last, `crowd at ${crowdX}: the sweep does not cross the road`)
        .toBe(-wyrmFlareX(0, dir))
    }
  })

  it('leaves nowhere on the road to stand still through a sweep', () => {
    // The attack's whole premise. A position that survives four flares without
    // moving would make the jet a mark to walk around, which is the meteor's
    // question — and the reason this boss exists is that the player has already
    // answered that one twice by stage 3.
    for (const dir of [-1, 1]) {
      for (let x = -LANE_HALF + CROWD_MAX_R; x <= LANE_HALF - CROWD_MAX_R; x += 0.1) {
        let nearest = Infinity
        for (let i = 0; i < WYRM_FLARES; i++) {
          nearest = Math.min(nearest, Math.abs(wyrmFlareX(i, dir) - x))
        }
        expect(nearest, `dir ${dir}: a crowd at ${x.toFixed(2)} can wait the jet out`)
          .toBeLessThan(WYRM_FLAME_HALF_W + CROWD_MAX_R)
      }
    }
  })

  it('gives a crowd in the middle of the road the signature: right to left', () => {
    // Both edges are the same distance away from a centred crowd, so the tie
    // has to break somewhere, and it breaks on the move the fight is named for.
    expect(wyrmSweepDir(0)).toBe(-1)
    expect(wyrmFlareX(0, wyrmSweepDir(0)), 'the signature sweep does not start on the right')
      .toBeGreaterThan(0)
  })

  it('aims each gout only after the last one has landed', () => {
    // Otherwise the three are one aim with three landings — see
    // `WYRM_SPIT_GAP`. Gout 0 is aimed by the cast itself, so it is the only
    // one allowed a negative aim time.
    expect(WYRM_SPIT_GAP, 'a gout is aimed before the one before it lands')
      .toBeGreaterThanOrEqual(WYRM_SPIT_LEAD)
    for (let i = 1; i < WYRM_SPITS; i++) {
      expect(wyrmSpitAimAt(i), `gout ${i} is aimed before the spit starts`)
        .toBeGreaterThanOrEqual(wyrmSpitAt(i - 1))
    }
  })

  it('leaves the road crossable between the flames', () => {
    // The dark window between one flare going out and the next lighting is what
    // the whole attack is: with `STEER_SPRING` = 13 a flick of the thumb covers
    // 1 − e^(−13 t) of any distance, so the window has to be long enough to
    // clear a flame's width at that rate.
    const dark = WYRM_FLARE_GAP - WYRM_FLARE_S
    expect(dark, 'the flares run into each other — there is no window to cross in')
      .toBeGreaterThan(0.2)
    const covered = 1 - Math.exp(-13 * dark)
    const needed = (WYRM_FLAME_HALF_W + CROWD_MAX_R) / 4
    expect(covered, 'a crowd cannot cross a flame inside one dark window')
      .toBeGreaterThan(needed)
  })

  it('never lights two flares at once, and finishes when it says it does', () => {
    for (let i = 1; i < WYRM_FLARES; i++) {
      expect(wyrmFlareAt(i), `flare ${i} lights before flare ${i - 1} is out`)
        .toBeGreaterThanOrEqual(wyrmFlareAt(i - 1) + WYRM_FLARE_S)
    }
    expect(WYRM_SWEEP_S).toBeCloseTo(wyrmFlareAt(WYRM_FLARES - 1) + WYRM_FLARE_S, 5)
  })

  it('opens a gap the whole crowd fits in, always on the road, never under them', () => {
    for (let crowdX = -LANE_HALF; crowdX <= LANE_HALF; crowdX += 0.25) {
      const gap = wyrmGapX(crowdX)
      // Wide enough for the formation at its widest…
      expect(WYRM_GAP_HALF, 'the gap is narrower than the crowd').toBeGreaterThan(CROWD_MAX_R)
      // …entirely on the road…
      expect(gap - WYRM_GAP_HALF, `crowd at ${crowdX}: the gap hangs off the left rail`)
        .toBeGreaterThanOrEqual(-LANE_HALF - 1e-9)
      expect(gap + WYRM_GAP_HALF, `crowd at ${crowdX}: the gap hangs off the right rail`)
        .toBeLessThanOrEqual(LANE_HALF + 1e-9)
      // …and never free: standing still has to be the wrong answer.
      expect(Math.abs(gap - crowdX), `crowd at ${crowdX}: the gap opened under them`)
        .toBeGreaterThan(CROWD_MAX_R * 0.9)
      // …but always reachable inside a wind-up.
      expect(Math.abs(gap - crowdX), `crowd at ${crowdX}: the gap is out of reach`)
        .toBeLessThanOrEqual(WYRM_GAP_SHIFT + 0.001)
    }
  })

  it('walls everything that is not the gap', () => {
    const gap = wyrmGapX(0)
    const runs = wyrmSpineRuns(gap)
    for (let x = -LANE_HALF; x <= LANE_HALF; x += 0.1) {
      const inGap = Math.abs(x - gap) <= WYRM_GAP_HALF
      expect(inWyrmSpines(x, 0, gap, 0), `x=${x.toFixed(2)}`).toBe(!inGap)
      // The drawn wall and the billed wall are the same wall.
      const drawn = runs.some(([from, to]) => x > from && x < to)
      if (!inGap && x > -LANE_HALF && x < LANE_HALF) expect(drawn, `x=${x.toFixed(2)} unpainted`).toBe(true)
    }
  })

  it('spits gouts a moving crowd can outrun and a still one cannot', () => {
    // A gout is marked `WYRM_SPIT_LEAD` before it lands. A crowd that keeps
    // dragging clears the radius inside that window; a crowd standing on the
    // mark is still on it.
    const moved = (1 - Math.exp(-13 * WYRM_SPIT_LEAD)) * 3
    expect(moved, 'a committed drag cannot clear a gout').toBeGreaterThan(WYRM_SPIT_R)
    expect(WYRM_SPIT_R, 'a gout is too small to punish standing still').toBeGreaterThan(CROWD_MAX_R * 0.6)
  })
})

// ─── …and the fight itself ──────────────────────────────────────────────────

describe('the wyrm fight', () => {
  it('is what stage 3 fields, wearing the skewer', () => {
    expect(bossKindFor(WYRM_STAGE)).toBe('wyrm')
    expect(bossDesign(WYRM_STAGE)).toBe(WYRM_DESIGN)
    // …and it comes back, so the fight is learned rather than met once.
    const later = []
    for (let s = WYRM_STAGE + 1; s <= 40; s++) if (bossKindFor(s) === 'wyrm') later.push(s)
    expect(later.length, 'the wyrm is never seen again after stage 3').toBeGreaterThan(2)
  })

  it('throws all three of its attacks in its first fight', async () => {
    const { beats, killed } = await fightWyrm({ squad: 40, maxTicks: 1800 })
    expect(of(beats, 'breathCast').length, 'no jet in the whole fight').toBeGreaterThan(0)
    expect(of(beats, 'spinesCast').length, 'no spikes in the whole fight').toBeGreaterThan(0)
    expect(of(beats, 'spitCast').length, 'no gouts in the whole fight').toBeGreaterThan(0)
    // A fight that never ends proves nothing about what it threw.
    expect(killed || beats.length > 0).toBe(true)
  }, 60_000)

  it('announces every landing before it lands, including the ones aimed late', async () => {
    const { beats } = await fightWyrm({ squad: 40, maxTicks: 1800 })

    // The jet: the first flare may not light before the cast it was announced
    // by has run out.
    const casts = of(beats, 'breathCast')
    const flares = of(beats, 'wyrmFlare')
    expect(casts.length).toBeGreaterThan(0)
    expect(flares.length).toBeGreaterThan(0)
    for (const f of flares) {
      const announced = casts.filter((c) => c.tick <= f.tick).pop()
      expect(announced, `a flare at tick ${f.tick} nobody announced`).toBeDefined()
      const waited = ((f.tick - announced!.tick) * STEP_MS) / 1000
      expect(waited, 'the fire arrived before its own wind-up was over')
        .toBeGreaterThanOrEqual(announced!.e.ttl - 0.05)
    }

    // …and every flare of one sweep is a flare of the sweep that was drawn:
    // same row, and one of the four footprints the cast put on the road.
    for (const f of flares) {
      const c = casts.filter((x) => x.tick <= f.tick).pop()!
      const xs = []
      for (let i = 0; i < WYRM_FLARES; i++) xs.push(wyrmFlareX(i, c.e.dir))
      expect(xs.some((x) => Math.abs(x - f.e.x) < 1e-6), 'a flare landed off its own mark').toBe(true)
      expect(Math.abs(f.e.y - c.e.y), 'a flare burnt a different row than the mark').toBeLessThan(1e-6)
    }

    // The gouts: every one of the three carries its own mark, and the two that
    // are aimed after the cast is over carry it for the same lead as the first.
    const spitCasts = of(beats, 'spitCast')
    const gouts = of(beats, 'wyrmSpit')
    expect(spitCasts.length).toBeGreaterThanOrEqual(gouts.length)
    // Matched in order and each mark spoken for once: a crowd that never moved
    // gets three gouts on the same patch of road, and picking "the last mark at
    // this spot" would read a later gout's warning as an earlier one's.
    const used = new Set<number>()
    for (const g of gouts) {
      const i = spitCasts.findIndex((c, k) =>
        !used.has(k) && c.tick <= g.tick &&
        Math.abs(c.e.x - g.e.x) < 1e-6 && Math.abs(c.e.y - g.e.y) < 1e-6
      )
      expect(i, `a gout at tick ${g.tick} landed on ground nothing marked`).toBeGreaterThanOrEqual(0)
      used.add(i)
      const mark = spitCasts[i]!
      const waited = ((g.tick - mark.tick) * STEP_MS) / 1000
      expect(waited, 'a gout beat its own mark').toBeGreaterThanOrEqual(
        Math.min(WYRM_SPIT_LEAD, mark.e.ttl) - 0.05
      )
    }

    // The spikes: announced, and the gap they promised is the gap they left.
    const spineCasts = of(beats, 'spinesCast')
    for (const s of of(beats, 'wyrmSpines')) {
      const mark = spineCasts.filter((c) => c.tick <= s.tick).pop()
      expect(mark, 'spikes nobody announced').toBeDefined()
      expect(Math.abs(mark!.e.x - s.e.x), 'the gap moved between the mark and the spikes')
        .toBeLessThan(1e-6)
    }
  }, 60_000)

  it('costs one attack per attack, however many beats it has', async () => {
    // A crowd that never moves eats everything. What that may add up to is what
    // each attack is PRICED at — not one swing per flare and not one per gout,
    // which is the failure a multi-beat attack invites (see `throwCrossrake`).
    // The ceiling is the breath's, since it is the dearest of the three
    // (`WYRM_BREATH_SHARE_MUL`); the other two are one swing.
    const { beats, squadAtBoss, lost } = await fightWyrm({
      squad: 60, damage: 0, maxTicks: 1200
    })
    const attacks =
      of(beats, 'breathCast').length + of(beats, 'spinesCast').length +
      // Only the FIRST gout's cast is one attack; the other two are beats of it.
      Math.ceil(of(beats, 'spitCast').length / WYRM_SPITS)
    expect(attacks, 'the fight threw nothing to price').toBeGreaterThan(1)
    const perAttack = lost / attacks / squadAtBoss
    expect(perAttack, `a wyrm attack took ${(perAttack * 100).toFixed(1)} % of the crowd`)
      .toBeLessThanOrEqual(SLAM_FRACTION_MAX * WYRM_BREATH_SHARE_MUL + 0.02)
    // …and it is a real attack: a boss whose whole pattern can be stood in
    // front of is a boss with no pattern.
    expect(lost, 'standing still through the whole fight cost nothing').toBeGreaterThan(0)
  }, 60_000)

  it('cannot be shot while it is breathing', async () => {
    // The owner's call after the first playtest: the jet takes two seconds to
    // cross the road and the crowd's guns do not stop for it, so the fight's
    // signature move was being answered by a boss that died halfway through it.
    // A wyrm mid-sweep is committed and untouchable (`armourWyrm`) — and the
    // player is shown the shield they already know from a guard phase.
    const game = await importGame()
    game.startStage(WYRM_STAGE)
    game.debugSkipToArena()
    game.debugAddUnits(70)
    game.debugAddDamage(12)
    for (let i = 0; i < 400 && game.phase.value !== 'boss'; i++) game.step(STEP_MS)
    expect(game.phase.value).toBe('boss')

    let sweeps = 0
    let tookDamageMidSweep = 0
    let hp = game.getBoss()?.hp ?? 0
    let wasBurning = false
    for (let i = 0; i < 2500 && !game.getBoss()?.dead; i++) {
      game.step(STEP_MS)
      const b = game.getBoss()
      if (!b || b.dead) break
      const burning = game.getWyrmBreath() !== null
      if (burning && !wasBurning) sweeps++
      // Measured across the frame: a jet that was burning at both ends of it is
      // a frame in which the guard was up the whole time.
      if (burning && wasBurning && b.hp < hp - 1e-9) tookDamageMidSweep++
      wasBurning = burning
      hp = b.hp
    }
    expect(sweeps, 'the fight never breathed, so nothing was proved').toBeGreaterThan(0)
    expect(tookDamageMidSweep, 'the bar moved while the jet was burning').toBe(0)
  }, 90_000)

  it('pays a crowd that reads the marks', async () => {
    const still = await fightWyrm({ squad: 60, maxTicks: 900 })
    const moving = await fightWyrm({ squad: 60, maxTicks: 900, steer: (g) => dodge(g) })
    expect(moving.lostShare, `dodging lost ${(moving.lostShare * 100).toFixed(1)} %, standing still ${(still.lostShare * 100).toFixed(1)} %`)
      .toBeLessThan(still.lostShare * 0.8)
  }, 90_000)

  it('takes its fire off the road with it when it dies', async () => {
    // The jet is the wyrm's own breath and the gouts are aimed on a clock only a
    // living boss is running — so a corpse may not keep either promise. See
    // `killBoss` and `bossOwnsCast`.
    const { beats, killed } = await fightWyrm({ squad: 90, damage: 90, maxTicks: 4000 })
    expect(killed, 'the boss never died, so nothing was proved about its death').toBe(true)
    const died = beats.find((b) => b.e.kind === 'bossDie')
    expect(died, 'no death effect').toBeDefined()
    const after = beats.filter((b) =>
      b.tick > died!.tick &&
      (b.e.kind === 'wyrmFlare' || b.e.kind === 'wyrmSpit' || b.e.kind === 'wyrmSpines')
    )
    expect(after, 'the wyrm went on burning the road after it died').toEqual([])
  }, 60_000)
})
