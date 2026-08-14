/**
 * ─── The balance harness ────────────────────────────────────────────────────
 *
 * Drives the REAL simulation (`useSurvivalGame.ts`) headlessly, one scripted
 * player at a time, and reports what happened. No canvas, no Vue component, no
 * renderer — the sim was written so that `step(dtMs)` plus `steerTo(x)` is the
 * whole contract, and this file is the proof.
 *
 * Three things make the numbers trustworthy:
 *
 *   1. FIXED STEP. Everything runs at exactly 16.67 ms, so two runs that make
 *      the same decisions produce the same world. No frame-time variance means
 *      a difference between policies is a difference in PLAY.
 *   2. SEEDED RANDOMNESS. The sim reaches for `Math.random()` in five places
 *      (bullet jitter, muzzle picking, foe scatter, spawn placement, unit
 *      phase). The harness swaps in a seeded PRNG for the duration of a run and
 *      restores the real one afterwards, so a sample is reproducible from its
 *      seed alone — and so 20 samples are 20 different worlds rather than 20
 *      rolls of the same dice.
 *   3. NO STATE LEAKS. `runOne` re-evaluates the whole module graph and wipes
 *      `tower_state`, so the retry relief (`RETRY_HP_RELIEF`), the challenge
 *      streak and the meta upgrades cannot bleed from one sample into the next.
 *      A run that WANTS the relief asks for it explicitly (`relief: true`).
 *
 * ─── One run, or a career ───────────────────────────────────────────────────
 *
 * `playOne` is the loop; it plays a stage on a graph somebody else owns and
 * touches no persisted state at all. `runOne` wraps it in a fresh, wiped graph
 * — the isolated sample the stage-by-stage study is built from. `career.ts`
 * wraps it the other way: one graph, thirty stages, nothing wiped, because a
 * career IS the save carried forward.
 */

import { vi } from 'vitest'
import { FAILED_STAGES_KEY } from '@/keys'
import {
  CRATE_DAMAGE_GAIN, CRATE_RATE_GAIN, MAX_SQUAD, challengeFactor, reliefFor, stageSpeed
} from '@/game/survival'
import { buildTrack } from '@/game/track'
import type { DeathCause } from '@/use/useSurvivalGame'
import type { Policy, SimPhase, View } from './policies'

export type Game = typeof import('@/use/useSurvivalGame')
export type State = typeof import('@/use/useTowerState')
export type Shop = typeof import('@/use/useUpgrades')
export type Vfx = typeof import('@/use/useVfx')

/** 60 fps exactly. Everything in the study is quoted in these ticks. */
export const STEP_MS = 1000 / 60

/** Nothing in stages 1–5 legitimately takes longer than this; past it the run
 *  is stuck, and "stuck" is a result worth recording rather than waiting out. */
export const MAX_RUN_SECONDS = 120

// ─── Module handles ─────────────────────────────────────────────────────────

let gameRef: Game | null = null

export const loadGame = async (): Promise<Game> => {
  if (!gameRef) gameRef = await import('@/use/useSurvivalGame')
  return gameRef
}

/** One evaluation of the game's module graph: the simulation, the persisted
 *  state it reads, and the shop that feeds it its starting stats. */
export interface Graph {
  game: Game
  state: State
  shop: Shop
  /**
   * The effect queue.
   *
   * Not decoration: `gatePass` carries the number of survivors a bank ACTUALLY
   * spawned, which is the only way to see a payout being clipped by
   * `MAX_SQUAD`. Draining it every tick is also what stops the 512-slot ring
   * from doing a `shift()` per bullet for the whole run.
   */
  vfx: Vfx
}

/**
 * A completely fresh copy of the game's module graph.
 *
 * `startStage()` resets everything inside a RUN, but the module-level refs
 * around it do not reset themselves: `bestStage`, `bestSquad`, `challenge`, and
 * — the one that actually bites — `levels` inside `useUpgrades.ts`, which is
 * seeded from the save exactly once at import and afterwards only moves when
 * somebody buys something. Careers are measured one after another in the same
 * process, so without a fresh graph career N + 1 opens with career N's shop.
 *
 * Re-evaluating costs a few milliseconds and buys exact reproducibility, which
 * is worth far more than the milliseconds.
 */
export const newGraph = async (): Promise<Graph> => {
  vi.resetModules()
  gameRef = null
  try {
    localStorage.removeItem('tower_state')
  } catch {
    /* jsdom without storage — `__resetTowerState` still handles the in-memory half */
  }
  const state = await import('@/use/useTowerState')
  const shop = await import('@/use/useUpgrades')
  const vfx = await import('@/use/useVfx')
  const game = await import('@/use/useSurvivalGame')
  gameRef = game
  return { game, state, shop, vfx }
}

// ─── Determinism ────────────────────────────────────────────────────────────

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Swap `Math.random` for a seeded stream. @returns the undo. */
export const seedRandom = (seed: number): (() => void) => {
  const real = Math.random
  const rng = mulberry32(seed || 1)
  Math.random = rng
  return () => {
    Math.random = real
  }
}

// ─── Results ────────────────────────────────────────────────────────────────

export interface RunResult {
  stage: number
  policy: string
  seed: number
  relieved: boolean

  cleared: boolean
  /** True when the run hit `MAX_RUN_SECONDS` without resolving either way. */
  timedOut: boolean
  /** Wall-clock seconds of simulated time. Slow-motion on a gate pass counts,
   *  because the player waits through it too. */
  seconds: number
  /** 0..1 along the stage when it ended — where it died, on a failure. */
  progress01: number

  finalSquad: number
  peakSquad: number
  damage: number
  fireRate: number
  kills: number
  coins: number
  /**
   * Coins this stage actually paid into the wallet — `runSummary().coins`, so
   * the clear/wipe bonus and the scavenge multiplier are both already in it.
   * `coins` above is the raw pickup tally; THIS is the number a career banks.
   */
  banked: number

  /** The autobalancer's inputs, read at `startStage`. */
  challengeAtStart: number
  failuresAtStart: number
  /** `reliefFor(failures) × challengeFactor(streak)` — the one multiplier every
   *  enemy on the stage was scaled by. 1.0 means the autobalancer did nothing. */
  hpRelief: number

  deaths: Record<DeathCause, number>
  /** Total survivors lost, all causes. */
  lost: number

  /** Gate banks whose line the crowd actually crossed. */
  banksPassed: number
  /** Survivors lost to gate pillars, per bank crossed. */
  dividerPerBank: number

  // ── Did the door pay what it printed? ──
  //
  // `claimBank` spawns `min(gain, MAX_SQUAD − squad)`, silently. A gate that
  // promises `+40` and delivers 12 is the one thing a gate may never do, and it
  // is invisible from inside the game — so it is measured here.
  /** Survivors the winning doors said they would pay, summed over the run. */
  gatePromised: number
  /** Survivors they actually spawned. */
  gateDelivered: number
  /** Banks whose payout was cut short by the squad ceiling. */
  gatesClipped: number
  /** Seconds the run spent sitting on `MAX_SQUAD`. */
  secondsAtCap: number

  rateCrates: number
  damageCrates: number
  rateCratesOnStage: number
  damageCratesOnStage: number

  bossReached: boolean
  /** Seconds from the boss spawning to its health hitting zero. `null` means it
   *  was still standing when the run ended — a wipe, or the 120 s cap. */
  bossSeconds: number | null
  /** The boss's actual health this run, after stage scaling and any relief. */
  bossHp: number
  squadAtBoss: number
  /** Survivors lost between the boss spawning and the run ending. */
  squadLostToBoss: number
  /** Squad DPS at the moment the boss spawned — what the fight was sized for. */
  dpsAtBoss: number
  /** Slams the boss actually threw, and how many of them killed anybody. */
  slamsThrown: number
  slamsConnected: number

  /** The run's arc, sampled at a quarter, half and three quarters of the road.
   *  This is what says whether fire rate arrives in time to matter. */
  arc: Array<{ at: number; squad: number; damage: number; fireRate: number; dps: number }>

  /** Squad and DPS at the first miniboss, and how long it took to put down. */
  eliteSeconds: number | null
  squadLostToElite: number
}

export interface RunOptions {
  stage: number
  policy: Policy
  seed: number
  /** Pre-seed the failure record so the run gets `RETRY_HP_RELIEF`. */
  relief?: boolean
  maxSeconds?: number
}

const cratesOnStage = (stage: number): { rate: number; damage: number } => {
  let rate = 0
  let dmg = 0
  for (const e of buildTrack(stage).events) {
    if (e.kind !== 'crates') continue
    for (const c of e.crates) {
      if (c.kind === 'rate') rate++
      else dmg++
    }
  }
  return { rate, damage: dmg }
}

const banksBefore = (stage: number, y: number): number =>
  buildTrack(stage).events.filter((e) => e.kind === 'gates' && e.y <= y).length

// ─── One run ────────────────────────────────────────────────────────────────

/**
 * Play one stage with one policy on one seed, on a graph somebody else owns.
 *
 * The loop is deliberately dumb: read the world, ask the policy where to go,
 * steer there, advance one fixed tick. Every metric is sampled from the sim's
 * own public surface — nothing here reaches into private state, so a number in
 * the report is a number the game itself would tell the player.
 *
 * Synchronous, and that is load-bearing: an `await` inside the loop would drain
 * the microtask queue, which is where Vue parks the `watch(towerState)`
 * callbacks in `useUpgrades` and `useTowerEconomy`. A career buys things
 * between stages, so a stray flush in the middle of one would let the shop move
 * under a run that had already started.
 *
 * It does NOT touch persisted state — no reset, no seeding of the failure
 * record. `runOne` does that for a one-off sample; a career deliberately does
 * not, because carrying the save forward is the entire point of a career.
 */
export const playOne = (graph: Graph, o: RunOptions): RunResult => {
  const { game, vfx } = graph
  o.policy.reset(o.seed)
  const restore = seedRandom(o.seed)

  const maxSteps = Math.ceil(((o.maxSeconds ?? MAX_RUN_SECONDS) * 1000) / STEP_MS)
  const speed = stageSpeed(o.stage)

  let steps = 0
  let bossStartStep = -1
  let bossDeadStep = -1
  let squadAtBoss = 0
  let dpsAtBoss = 0
  let bossHp = 0
  let eliteStartStep = -1
  let eliteDoneStep = -1
  let squadAtElite = 0
  let squadAfterElite = 0
  let rateCrates = 0
  let damageCrates = 0
  let slamsThrown = 0
  let slamsConnected = 0
  let prevSlamCd = Infinity
  let prevSlamDeaths = 0
  let gatePromised = 0
  let gateDelivered = 0
  let gatesClipped = 0
  let stepsAtCap = 0
  const arcMarks = [0.25, 0.5, 0.75]
  const arc: RunResult['arc'] = []

  // The autobalancer's inputs, read on the far side of `startStage` because
  // that is where the sim resolves them: `challenge` is pulled out of the save
  // there, and the failure record is what it was before this attempt (it is
  // only written on a wipe, in `finishRun`).
  let challengeAtStart = 0
  let failuresAtStart = 0

  try {
    game.startStage(o.stage)
    challengeAtStart = game.challenge.value
    failuresAtStart = game.failureCount(o.stage)
    let prevRate = game.runFireRate.value
    let prevDamage = game.damage.value

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
        foes: game.getFoes(),
        pickups: game.getPickups(),
        boss: game.getBoss()
      }

      const target = o.policy.decide(view)
      if (Number.isFinite(target)) game.steerTo(target)
      const squadBefore = game.squadCount.value
      game.step(STEP_MS)
      steps++
      if (squadBefore >= MAX_SQUAD) stepsAtCap++

      // ── What the door promised, and what it paid ──
      //
      // The `gatePass` effect carries the survivors the winning leaf actually
      // spawned. A `+N` promised exactly N; a `×N` promised `(N − 1)` times the
      // crowd that walked in — which, since the funnel, is the whole crowd, so
      // the head count at the top of the tick is the right base. The gap
      // between promise and payment is `MAX_SQUAD` eating the difference.
      for (const e of vfx.drainFx()) {
        // Hostile doors are excluded, not counted as underpayment: `÷N` and
        // `-N` both PROMISE to take something and both deliver it exactly. This
        // metric is about `MAX_SQUAD` silently eating a payout the player was
        // shown, and a door that pays a negative number honestly has nothing to
        // do with that.
        if (e.kind !== 'gatePass' || e.op === 'div' || e.op === 'sub') continue
        const promised = e.op === 'add' ? e.value : Math.round(squadBefore * (e.value - 1))
        gatePromised += promised
        gateDelivered += e.gain
        if (e.gain < promised - 0.5) gatesClipped++
      }

      // Crates are counted from the stat they granted rather than from the
      // entity list: a broken crate is spliced out of the array on the next
      // tick, and the stat is the thing the player actually cares about.
      const rate = game.runFireRate.value
      if (rate > prevRate + 1e-6) {
        rateCrates += Math.max(1, Math.round((rate - prevRate) / CRATE_RATE_GAIN))
        prevRate = rate
      }
      const dmg = game.damage.value
      if (dmg > prevDamage + 1e-6) {
        damageCrates += Math.max(1, Math.round((dmg - prevDamage) / CRATE_DAMAGE_GAIN))
        prevDamage = dmg
      }

      if (bossStartStep < 0 && game.phase.value === 'boss') {
        bossStartStep = steps
        squadAtBoss = game.squadCount.value
        dpsAtBoss = game.squadCount.value * game.damage.value * game.runFireRate.value
        bossHp = game.getBoss()?.maxHp ?? 0
      }
      if (bossStartStep >= 0 && bossDeadStep < 0 && game.getBoss()?.dead) bossDeadStep = steps

      // The fight starts when the first round LANDS, not when the body streams
      // in: a miniboss is spawned 30 units ahead and spends most of that walk
      // out of reach, so timing from `eliteAlive` measures the approach and
      // makes every miniboss on every stage look like the same fight.
      if (eliteStartStep < 0 && game.eliteAlive.value && game.eliteHp01.value < 0.999) {
        eliteStartStep = steps
        squadAtElite = game.squadCount.value
      }
      if (eliteStartStep >= 0 && eliteDoneStep < 0 && !game.eliteAlive.value && steps > eliteStartStep) {
        eliteDoneStep = steps
        squadAfterElite = game.squadCount.value
      }

      // A slam fires when the cooldown resets upward. Counting them — and
      // whether the death tally moved on that frame — is the only way to tell a
      // "the boss is too fat" problem from a "the telegraph is too short" one.
      const b = game.getBoss()
      if (b && !b.dead) {
        if (b.slamCd > prevSlamCd) {
          slamsThrown++
          if (game.deathBreakdown().slam > prevSlamDeaths) slamsConnected++
          prevSlamDeaths = game.deathBreakdown().slam
        }
        prevSlamCd = b.slamCd
      }

      // The run's arc, sampled on the way past each quarter of the road.
      if (arc.length < arcMarks.length && game.progress01.value >= arcMarks[arc.length]!) {
        arc.push({
          at: arcMarks[arc.length]!,
          squad: game.squadCount.value,
          damage: game.damage.value,
          fireRate: game.runFireRate.value,
          dps: game.squadCount.value * game.damage.value * game.runFireRate.value
        })
      }
    }
  } finally {
    restore()
  }

  const timedOut = game.phase.value !== 'clear' && game.phase.value !== 'wipe'
  const cleared = game.phase.value === 'clear'
  const deaths = game.deathBreakdown()
  const lost = Object.values(deaths).reduce((a, b) => a + b, 0)
  const anchorY = game.anchor().y
  const banks = banksBefore(o.stage, anchorY)
  const supply = cratesOnStage(o.stage)

  return {
    stage: o.stage,
    policy: o.policy.id,
    seed: o.seed,
    relieved: Boolean(o.relief),

    cleared,
    timedOut,
    seconds: (steps * STEP_MS) / 1000,
    progress01: game.progress01.value,

    finalSquad: game.squadCount.value,
    peakSquad: game.peakSquad.value,
    damage: game.damage.value,
    fireRate: game.runFireRate.value,
    kills: game.kills.value,
    coins: game.runCoins.value,
    // `runSummary()` is only rewritten by `finishRun`, so on a TIMEOUT it still
    // holds the previous run's payout. A run that never resolved never paid.
    banked: timedOut ? 0 : game.runSummary().coins,

    challengeAtStart,
    failuresAtStart,
    hpRelief: reliefFor(failuresAtStart) * challengeFactor(challengeAtStart),

    deaths,
    lost,

    banksPassed: banks,
    dividerPerBank: banks > 0 ? deaths.divider / banks : 0,

    gatePromised,
    gateDelivered,
    gatesClipped,
    secondsAtCap: (stepsAtCap * STEP_MS) / 1000,

    rateCrates,
    damageCrates,
    rateCratesOnStage: supply.rate,
    damageCratesOnStage: supply.damage,

    bossReached: bossStartStep >= 0,
    bossSeconds: bossDeadStep >= 0 ? ((bossDeadStep - bossStartStep) * STEP_MS) / 1000 : null,
    bossHp,
    squadAtBoss,
    squadLostToBoss: bossStartStep >= 0 ? Math.max(0, squadAtBoss - game.squadCount.value) : 0,
    dpsAtBoss,
    slamsThrown,
    slamsConnected,
    arc,

    eliteSeconds: eliteDoneStep >= 0 ? ((eliteDoneStep - eliteStartStep) * STEP_MS) / 1000 : null,
    squadLostToElite: eliteDoneStep >= 0 ? Math.max(0, squadAtElite - squadAfterElite) : 0
  }
}

/**
 * One isolated sample: a fresh graph, a wiped save, one stage, one policy.
 *
 * This is the unit the stage-by-stage study is built from. A career uses
 * `playOne` directly instead, because a career IS the save carried forward.
 */
export const runOne = async (o: RunOptions): Promise<RunResult> => {
  const graph = await newGraph()
  graph.state.__resetTowerState()
  if (o.relief) graph.state.setState(FAILED_STAGES_KEY, { [String(o.stage)]: 1 })
  return playOne(graph, o)
}

// ─── Controlled probes ──────────────────────────────────────────────────────

export interface ProbeOptions {
  stage: number
  seed: number
  /** Squad to start with. Topped up through the sim's own spawn path. */
  squad?: number
  /** Extra per-survivor damage, so a probe can isolate geometry from DPS. */
  damage?: number
  fireRate?: number
  /** Where to steer, each tick. Same contract as a policy's `decide`. */
  steer: (view: View) => number
  /** Stop when the crowd's anchor passes this distance. */
  untilY: number
  maxSeconds?: number
}

export interface ProbeResult {
  squadStart: number
  squadEnd: number
  lost: number
  deaths: Record<DeathCause, number>
  seconds: number
  anchorY: number
}

/**
 * A single controlled measurement rather than a whole run.
 *
 * The full-run tables answer "is the curve right"; a probe answers "what does
 * THIS object cost", by putting a squad of a known size on a known line and
 * reading the death tally on the other side. It is how questions 5 and 7 get
 * numbers that are not confounded by everything else on the stage.
 */
export const probe = async (o: ProbeOptions): Promise<ProbeResult> => {
  const { game, state } = await newGraph()
  state.__resetTowerState()
  const restore = seedRandom(o.seed)
  const speed = stageSpeed(o.stage)
  const maxSteps = Math.ceil(((o.maxSeconds ?? 60) * 1000) / STEP_MS)
  let steps = 0
  let squadStart = 0

  try {
    game.startStage(o.stage)
    if (o.squad && o.squad > game.squadCount.value) {
      game.debugAddUnits(o.squad - game.squadCount.value)
    }
    if (o.damage) game.debugAddDamage(o.damage)
    if (o.fireRate) game.debugAddFireRate(o.fireRate)
    squadStart = game.squadCount.value

    while (
      steps < maxSteps &&
      game.anchor().y < o.untilY &&
      game.phase.value !== 'clear' &&
      game.phase.value !== 'wipe'
    ) {
      const target = o.steer({
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
        foes: game.getFoes(),
        pickups: game.getPickups(),
        boss: game.getBoss()
      })
      if (Number.isFinite(target)) game.steerTo(target)
      game.step(STEP_MS)
      steps++
    }
  } finally {
    restore()
  }

  const deaths = game.deathBreakdown()
  return {
    squadStart,
    squadEnd: game.squadCount.value,
    lost: Object.values(deaths).reduce((a, b) => a + b, 0),
    deaths,
    seconds: (steps * STEP_MS) / 1000,
    anchorY: game.anchor().y
  }
}

/** Play the same (stage, policy) on `samples` different seeds. */
export const runSamples = async (
  stage: number,
  policy: Policy,
  samples: number,
  opts: { relief?: boolean; seed0?: number; maxSeconds?: number } = {}
): Promise<RunResult[]> => {
  const out: RunResult[] = []
  const seed0 = opts.seed0 ?? 1000
  for (let i = 0; i < samples; i++) {
    out.push(
      await runOne({
        stage,
        policy,
        seed: seed0 + i * 7919,
        relief: opts.relief,
        maxSeconds: opts.maxSeconds
      })
    )
  }
  return out
}

// ─── Statistics ─────────────────────────────────────────────────────────────

export const median = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

export const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length

export interface Spread {
  med: number
  min: number
  max: number
}

export const spread = (xs: readonly number[]): Spread => ({
  med: median(xs),
  min: xs.length ? Math.min(...xs) : 0,
  max: xs.length ? Math.max(...xs) : 0
})

const pick = <K extends keyof RunResult>(rs: readonly RunResult[], k: K): number[] =>
  rs.map((r) => Number(r[k]) || 0)

export interface Aggregate {
  stage: number
  policy: string
  samples: number
  clearRate: number
  /** Where the failures died, median 0..1. Only failures are counted. */
  deathProgress: Spread
  seconds: Spread
  peakSquad: Spread
  finalSquad: Spread
  damage: Spread
  fireRate: Spread
  rateCrates: Spread
  damageCrates: Spread
  dividerPerBank: Spread
  bossSeconds: Spread
  squadAtBoss: Spread
  dpsAtBoss: Spread
  squadLostToBoss: Spread
  eliteSeconds: Spread
  squadLostToElite: Spread
  bossHp: number
  /** Share of the boss's slams that killed at least one survivor. */
  slamHitRate: number
  bossReachRate: number
  /** Share of the runs that reached the boss and never managed to kill it. */
  bossSurvivedRate: number
  /** Summed death tally across the samples, biggest cause first. */
  deaths: Array<[DeathCause, number]>
  timeouts: number
}

export const aggregate = (rs: readonly RunResult[]): Aggregate => {
  const failures = rs.filter((r) => !r.cleared)
  const bossRuns = rs.filter((r) => r.bossSeconds != null)
  const eliteRuns = rs.filter((r) => r.eliteSeconds != null)
  const reachedBoss = rs.filter((r) => r.bossReached)

  const tally: Record<string, number> = {}
  for (const r of rs) for (const [k, v] of Object.entries(r.deaths)) tally[k] = (tally[k] ?? 0) + v

  return {
    stage: rs[0]?.stage ?? 0,
    policy: rs[0]?.policy ?? '',
    samples: rs.length,
    clearRate: rs.length ? rs.filter((r) => r.cleared).length / rs.length : 0,
    deathProgress: spread(pick(failures, 'progress01')),
    seconds: spread(pick(rs, 'seconds')),
    peakSquad: spread(pick(rs, 'peakSquad')),
    finalSquad: spread(pick(rs, 'finalSquad')),
    damage: spread(pick(rs, 'damage')),
    fireRate: spread(pick(rs, 'fireRate')),
    rateCrates: spread(pick(rs, 'rateCrates')),
    damageCrates: spread(pick(rs, 'damageCrates')),
    dividerPerBank: spread(pick(rs, 'dividerPerBank')),
    bossSeconds: spread(bossRuns.map((r) => r.bossSeconds!)),
    squadAtBoss: spread(pick(reachedBoss, 'squadAtBoss')),
    dpsAtBoss: spread(pick(reachedBoss, 'dpsAtBoss')),
    squadLostToBoss: spread(pick(reachedBoss, 'squadLostToBoss')),
    eliteSeconds: spread(eliteRuns.map((r) => r.eliteSeconds!)),
    squadLostToElite: spread(pick(eliteRuns, 'squadLostToElite')),
    bossHp: median(pick(reachedBoss, 'bossHp')),
    slamHitRate: (() => {
      const thrown = reachedBoss.reduce((n, r) => n + r.slamsThrown, 0)
      const hit = reachedBoss.reduce((n, r) => n + r.slamsConnected, 0)
      return thrown > 0 ? hit / thrown : 0
    })(),
    bossReachRate: rs.length ? reachedBoss.length / rs.length : 0,
    bossSurvivedRate: reachedBoss.length
      ? reachedBoss.filter((r) => r.bossSeconds == null).length / reachedBoss.length
      : 0,
    deaths: (Object.entries(tally) as Array<[DeathCause, number]>)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]),
    timeouts: rs.filter((r) => r.timedOut).length
  }
}

// ─── Reporting helpers ──────────────────────────────────────────────────────

export const n1 = (v: number): string => (Math.round(v * 10) / 10).toFixed(1)
export const n2 = (v: number): string => (Math.round(v * 100) / 100).toFixed(2)
export const pct = (v: number): string => `${Math.round(v * 100)}%`
export const range = (s: Spread, fmt: (v: number) => string = n1): string =>
  `${fmt(s.med)} (${fmt(s.min)}–${fmt(s.max)})`

/** A GitHub-flavoured markdown table, so the study's stdout pastes into the
 *  report unedited. */
export const mdTable = (headers: readonly string[], rows: readonly (readonly string[])[]): string => {
  const head = `| ${headers.join(' | ')} |`
  const rule = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return `${head}\n${rule}\n${body}`
}
