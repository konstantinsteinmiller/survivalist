import { describe, expect, it } from 'vitest'
import { newGraph, seedRandom, STEP_MS, type Graph } from '../sim/harness'
import { average, careless, good, optimal, type Policy, type SimPhase, type View } from '../sim/policies'
import { buildTrack, OPENING_GATE_Y, OPENING_PUMP_CAP } from '@/game/track'
import { newTutorialClock, tickTutorial } from '@/use/useTutorialGate'
import { stageSpeed } from '@/game/survival'

/**
 * ─── What the onboarding hold hands the player, measured ────────────────────
 *
 * `GameScene` sets `steerOnly` for the movement tutorial and `step()` returns
 * early on it, so the ROAD is frozen while the crowd still shoots. Stage 1's
 * opening doorway stands inside the first screen (`OPENING_GATE_Y`) and is
 * therefore pumped for the WHOLE hold — the player leaves the lightbox holding
 * a door that a run without the hold would never have finished pumping.
 *
 * That is a deliberate piece of showmanship (see `stageOne`) and it is not
 * being taken away. What it needs is a road priced for it, and this file is the
 * instrument that says by how much: it drives the real simulation through
 * stage 1 twice — once the way a first run actually goes, once with the road
 * running from frame one — and reports the delta at each of the three places
 * stage 1 is supposed to ask a question.
 *
 * ─── What it found, and the part that was NOT the hold ──────────────────────
 *
 * The reported symptom was "+10 from the first gate alone, before the pickup
 * wall … the mini-boss dies in 0.25 seconds". Both halves are real and the
 * simulation reproduces them exactly. The CAUSE is only half the story:
 *
 *   the hold is worth ONE survivor. The opening door is inside the first screen
 *   and in range from frame one, so a run that never sees the lightbox arrives
 *   at the teaching wall with 12 against the held run's 13 — the door pumps to
 *   9 on its own and the hold buys the last point of `OPENING_PUMP_CAP`.
 *
 *   the `+10` itself is worth SEVEN. The opener is a `+3` that pumps to 10, and
 *   the beats behind it were priced for the squad of ~6 a `+3` used to produce.
 *   What actually walks the road is 13 at the wall and 24-47 at the elite.
 *
 * So the correction is a road priced for a capped door rather than anything to
 * do with `steerOnly`, and the elite is where it landed — 26 hp against 104-430
 * dps, dying in 0.18-0.55 s. See `MINIBOSS_TUTORIAL` for the arithmetic and the
 * before/after table.
 *
 * One trap for whoever reads the printed table next: `optimal` shows 47
 * survivors at the elite against everyone else's 24-26, and that is NOT the
 * pump compounding. Stage 1's last bank sits at y = 89 and the elite at
 * y = 90.9, so whether the crowd has banked that door when the first round
 * lands is decided by a metre and a half of road.
 *
 * It is a measurement harness first and a regression test second, which is why
 * the assertions are bands rather than snapshots: the numbers above move
 * whenever the stage-1 road is re-authored, and a test that pins them to two
 * decimals is a test that gets deleted the first time somebody moves a crate.
 */

/**
 * How long a stranger looks at the lightbox before their first input.
 *
 * The tutorial clock accrues NOTHING until the player has touched the game
 * (`tickTutorial`'s `sawInput`), so this is dead time in which the road is
 * frozen and the opening door is being shot — which is exactly the window the
 * pump lives in. Two seconds is deliberately conservative: the same measurement
 * at four seconds moves nothing, because the door caps at `OPENING_PUMP_CAP`
 * well inside the first second and a half (see `gatePump.test.ts`).
 */
const REACTION_MS = 2000

interface TutorialRun {
  cleared: boolean
  seconds: number
  /** Squad the moment the crowd reaches the first crate row on the road. */
  squadAtWall: number
  /** …and at the moment the first round LANDS on the stage's elite. */
  squadAtElite: number
  dpsAtElite: number
  eliteHp: number
  /** Seconds the elite survived that fire. `null` — it was never fought. */
  eliteSeconds: number | null
  squadAtBoss: number
  bossHp: number
  bossSeconds: number | null
  /** What the opening door printed when the crowd actually walked through it. */
  openerAtCross: number
  peakSquad: number
  /** Survivors lost on the road, by the two things stage 1 puts in the way. */
  lostToScenery: number
  lostToFoes: number
}

/** The y of the first thing on the road the crowd has to shoot through. */
const firstWallY = (stage: number): number => {
  const ys = buildTrack(stage)
    .events.filter((e) => e.kind === 'crates' || e.kind === 'barricade')
    .map((e) => e.y)
  return ys.length > 0 ? Math.min(...ys) : Number.POSITIVE_INFINITY
}

/**
 * One stage, played by one policy, with or without the onboarding hold.
 *
 * The hold is driven through the SHIPPING clock (`tickTutorial`) rather than a
 * fixed number of frames, because the thing being measured is how much pump the
 * real release condition hands out — a hand-rolled "hold for N seconds" would
 * measure this file's opinion instead of the game's.
 */
const play = (graph: Graph, o: {
  stage: number; policy: Policy; seed: number; hold: boolean
}): TutorialRun => {
  const { game } = graph
  o.policy.reset(o.seed)
  const restore = seedRandom(o.seed)
  const wallY = firstWallY(o.stage)
  const speed = stageSpeed(o.stage)

  let squadAtWall = 0
  let squadAtElite = 0
  let dpsAtElite = 0
  let eliteHp = 0
  let eliteStart = -1
  let eliteDone = -1
  let squadAtBoss = 0
  let bossHp = 0
  let bossStart = -1
  let bossDead = -1
  let openerAtCross = 0
  let steps = 0

  try {
    game.startStage(o.stage)
    game.steerOnly.value = o.hold
    const clock = newTutorialClock(game.anchor().x)
    let held = 0

    const maxSteps = Math.ceil((120 * 1000) / STEP_MS)
    while (steps < maxSteps && game.phase.value !== 'clear' && game.phase.value !== 'wipe') {
      const view: View = {
        stage: o.stage,
        phase: game.phase.value as SimPhase,
        t: (steps * STEP_MS) / 1000,
        speed,
        anchorX: game.anchor().x,
        anchorY: game.anchor().y,
        squad: game.squadCount.value,
        crowdR: game.crowdRadius(),
        damage: game.damage.value,
        fireRate: game.runFireRate.value,
        dps: game.squadCount.value * game.damage.value * game.runFireRate.value,
        gates: game.getGates(),
        dividers: game.getDividers(),
        crates: game.getCrates(),
        barricades: game.getBarricades(),
        rocks: game.getRocks(),
        foes: game.getFoes(),
        pickups: game.getPickups(),
        boss: game.getBoss(),
        incoming: game.incomingThreat()
      }
      const target = o.policy.decide(view)
      if (Number.isFinite(target)) game.steerTo(target)
      game.step(STEP_MS)
      steps++

      if (game.steerOnly.value) {
        held += STEP_MS
        const { outcome } = tickTutorial(clock, STEP_MS, held >= REACTION_MS, game.anchor().x)
        if (outcome !== null) game.steerOnly.value = false
        continue
      }
      // The number the opening door was ACTUALLY printing when the crowd walked
      // through it — the one figure the hold moves directly, and the base every
      // multiplier downstream compounds.
      if (openerAtCross === 0) {
        const opener = view.gates.find((g) => g.y === OPENING_GATE_Y)
        if (opener && game.anchor().y >= OPENING_GATE_Y - 0.5) openerAtCross = opener.value
      }
      if (squadAtWall === 0 && game.anchor().y >= wallY) squadAtWall = game.squadCount.value
      if (eliteStart < 0 && game.eliteAlive.value && game.eliteHp01.value < 0.999) {
        eliteStart = steps
        squadAtElite = game.squadCount.value
        dpsAtElite = view.dps
        eliteHp = view.foes.find((f) => f.elite && !f.dead)?.maxHp ?? 0
      }
      if (eliteStart >= 0 && eliteDone < 0 && !game.eliteAlive.value && steps > eliteStart) {
        eliteDone = steps
      }
      if (bossStart < 0 && game.phase.value === 'boss') {
        bossStart = steps
        squadAtBoss = game.squadCount.value
        bossHp = game.getBoss()?.maxHp ?? 0
      }
      if (bossStart >= 0 && bossDead < 0 && game.getBoss()?.dead) bossDead = steps
    }
  } finally {
    restore()
    game.steerOnly.value = false
  }

  const deaths = game.deathBreakdown()
  return {
    cleared: game.phase.value === 'clear',
    seconds: (steps * STEP_MS) / 1000,
    squadAtWall,
    squadAtElite,
    dpsAtElite,
    eliteHp,
    eliteSeconds: eliteDone >= 0 ? ((eliteDone - eliteStart) * STEP_MS) / 1000 : null,
    squadAtBoss,
    bossHp,
    bossSeconds: bossDead >= 0 ? ((bossDead - bossStart) * STEP_MS) / 1000 : null,
    openerAtCross,
    peakSquad: game.peakSquad.value,
    lostToScenery: deaths.barricade + deaths.crate + deaths.divider,
    lostToFoes: deaths.foe + deaths.elite
  }
}

const sample = async (o: {
  stage: number; policy: Policy; hold: boolean; seeds: readonly number[]
}): Promise<TutorialRun[]> => {
  const out: TutorialRun[] = []
  for (const seed of o.seeds) {
    const graph = await newGraph()
    graph.state.__resetTowerState()
    out.push(play(graph, { stage: o.stage, policy: o.policy, seed, hold: o.hold }))
  }
  return out
}

const med = (xs: readonly number[]): number => {
  const s = [...xs].filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (s.length === 0) return Number.NaN
  const mid = s.length >> 1
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

const SEEDS = [1000, 8919, 16838] as const

const report = (label: string, rs: readonly TutorialRun[]): string =>
  `${label.padEnd(20)} door ${med(rs.map((r) => r.openerAtCross)).toFixed(0).padStart(3)}` +
  `  wall ${med(rs.map((r) => r.squadAtWall)).toFixed(0).padStart(4)}` +
  `  elite ${med(rs.map((r) => r.squadAtElite)).toFixed(0).padStart(4)}` +
  ` @${med(rs.map((r) => r.dpsAtElite)).toFixed(0).padStart(5)}dps` +
  ` vs ${med(rs.map((r) => r.eliteHp)).toFixed(0).padStart(4)}hp` +
  ` = ${med(rs.map((r) => r.eliteSeconds ?? Number.NaN)).toFixed(2).padStart(5)}s` +
  `  boss ${med(rs.map((r) => r.squadAtBoss)).toFixed(0).padStart(4)}` +
  ` vs ${med(rs.map((r) => r.bossHp)).toFixed(0).padStart(5)}hp` +
  ` in ${med(rs.map((r) => r.bossSeconds ?? Number.NaN)).toFixed(2).padStart(5)}s` +
  `  peak ${med(rs.map((r) => r.peakSquad)).toFixed(0).padStart(4)}` +
  `  lost ${med(rs.map((r) => r.lostToScenery)).toFixed(0).padStart(3)}sc/` +
  `${med(rs.map((r) => r.lostToFoes)).toFixed(0).padStart(3)}foe` +
  `  cleared ${rs.filter((r) => r.cleared).length}/${rs.length}`

/** Every cell of the table, sampled once and shared by the assertions below —
 *  each of these is twelve full stage runs and they are not worth doing four
 *  times over. */
const table = async (): Promise<Map<string, TutorialRun[]>> => {
  const out = new Map<string, TutorialRun[]>()
  for (const policy of [optimal, good, average, careless]) {
    // Stage 1 twice — with the hold, and with the road running from frame one.
    // Stage 2 once: the lightbox is a one-shot on the first run, so a "held"
    // stage 2 is a player who does not exist.
    for (const [stage, hold] of [[1, true], [1, false], [2, false]] as const) {
      out.set(
        `s${stage} ${policy.id} ${hold ? 'hold' : 'cold'}`,
        await sample({ stage, policy, hold, seeds: SEEDS })
      )
    }
  }
  console.log(`\n${[...out].map(([k, v]) => report(k, v)).join('\n')}\n`)
  return out
}

describe('the tutorial hold, priced', () => {
  it('holds the whole road to the contract the measurements set', async () => {
    const t = await table()
    const rows = (key: string): TutorialRun[] => {
      const r = t.get(key)
      if (!r) throw new Error(`no such row: ${key}`)
      return r
    }

    // ── The door is the mechanism, and it is CAPPED ──
    //
    // The hold's direct payout is one survivor, not ten: the opener is already
    // in range from the first frame, so a run that never sees the lightbox
    // walks through it at 9 against the held run's 10. Anyone tuning stage 1
    // against "the tutorial gives a free +10" is tuning against the wrong
    // number — the `+10` is `OPENING_PUMP_CAP` doing its job, and the hold only
    // guarantees the last point of it.
    for (const policy of ['optimal', 'good', 'average', 'careless']) {
      const hold = rows(`s1 ${policy} hold`)
      const cold = rows(`s1 ${policy} cold`)
      expect(med(hold.map((r) => r.openerAtCross)), `${policy}: the hold stopped capping the door`)
        .toBe(OPENING_PUMP_CAP)
      expect(med(cold.map((r) => r.openerAtCross)), `${policy}: the cold run stopped pumping`)
        .toBeGreaterThanOrEqual(OPENING_PUMP_CAP - 2)
      expect(
        med(hold.map((r) => r.squadAtWall)) - med(cold.map((r) => r.squadAtWall)),
        `${policy}: the hold is worth more than a survivor at the teaching wall`
      ).toBeLessThanOrEqual(2)
    }

    // ── …and the road is priced for what the door pays ──
    //
    // THE COMPLAINT, as a test: "the mini-boss dies in 0.25 seconds or so". It
    // did — 0.18 s for `average`, 0.23 s for `good` — against a crowd of 26 the
    // opener had built. One second is the floor asserted rather than the
    // measured 1.5-2.6 s, because the elite is met a metre and a half past a
    // gate bank (y = 89 against y = 90.9) and whether the crowd has already
    // banked that door when the first round lands is a coin flip on the seed.
    for (const policy of ['optimal', 'good', 'average']) {
      const ttk = rows(`s1 ${policy} hold`).map((r) => r.eliteSeconds ?? 0)
      expect(med(ttk), `s1 ${policy}: the tutorial elite is a formality again`)
        .toBeGreaterThan(1)
    }

    // ── The floor, on the road the player actually meets ──
    //
    // `tests/sim/balance.test.ts` pins this for a run with no tutorial; it is
    // re-asserted here on the held run because the hold is what a FIRST session
    // gets, and a stage-1 tuning pass that only ever ran the cold road could
    // move the one it did not measure.
    //
    // ── `careless` is held to a majority, not to every seed ──
    //
    // It is the policy that never touches the screen, and the promise the
    // design actually makes about it is "still sees the first boss die" — a
    // floor of SOME, stated as `> 0` in `balance.test.ts` and historically
    // measured at 5 clears in 8. Every seed was never the contract; it was
    // what the numbers happened to do while stage 1 had nothing on it that
    // could take anything away. It has a `÷2` and a `-3` now, and a crowd that
    // holds the centre line walks into one of them about a third of the time.
    //
    // `average` is the one held to every seed, and it is the one that matters:
    // it models a player who taps BADLY, which is who the install is lost on.
    for (const policy of ['optimal', 'good', 'average']) {
      const rs = rows(`s1 ${policy} hold`)
      expect(
        rs.filter((r) => r.cleared).length,
        `s1 ${policy}: the tutorial stopped being clearable after the hold`
      ).toBe(rs.length)
    }
    // ── …and the floor for the run that never steers is SOME, not most ──
    //
    // Loosened from `> idle.length / 2` to the promise the paragraph above
    // actually states, and that `balance.test.ts` states too: "still sees the
    // first boss die". The old bound could not discriminate. Measured by
    // sweeping the elite-cage payout and re-running this file, clears out of
    // three seeds went:
    //
    //   +2 -> 2    +4 -> 1    +5 -> 2    +6 -> 1    +7 -> 2
    //
    // Non-monotonic in both directions, because a careless crowd holds the
    // centre line and stage 1 has a `/2` and a `-3` on it: which seeds walk into
    // which door is a coin flip, and three of them cannot resolve it. A bound
    // that flips on the third decimal place of an unrelated feature is not
    // protecting onboarding, it is taxing every change that goes near stage 1.
    //
    // The real guarantee lives in `balance.test.ts` ("lets a careless run reach
    // the closing elite on every seed", `progress01 > 0.8`), which is measured
    // on progress rather than on a binary and does not flip.
    //
    // ── …and since 2026-09-16 the floor is the ROAD, not the boss ──
    //
    // The first boss's ring stopped being a token (`TUTORIAL_SLAM_FRACTION`): a
    // 99-strong crowd that never dodged lost 2-4 a strike to it, and the owner's
    // call was that an attack which costs nothing is what loses players. A run
    // that never touches the screen now reaches the arena and loses the fight,
    // which is the whole point of the change. What is still owed to it is the
    // same SOME the old bound promised, one step earlier: it still reaches the
    // first boss. (Every seed is `balance.test.ts`'s, on road progress.)
    const idle = rows('s1 careless hold')
    expect(
      idle.filter((r) => r.squadAtBoss > 0).length,
      'a run that never steers stopped reaching the first boss at all'
    ).toBeGreaterThan(0)

    // ── Stage 2 is not in this at all, and that is the finding ──
    //
    // The pump does not reach it: there is no opening door on stage 2's road,
    // so the crowd that meets its elite is the crowd the stage built for
    // itself. Asserted so that a later pass which DOES give stage 2 a pumped
    // opener has to come back through this file.
    for (const policy of ['optimal', 'good', 'average', 'careless']) {
      expect(
        med(rows(`s2 ${policy} cold`).map((r) => r.openerAtCross)),
        `s2 ${policy}: stage 2 grew an opening door — re-measure the correction`
      ).toBe(0)
    }
  }, 300_000)
})
