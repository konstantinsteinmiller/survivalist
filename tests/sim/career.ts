/**
 * ─── The career simulator ───────────────────────────────────────────────────
 *
 * A stage is not the unit of balance. A *career* is.
 *
 * Everything the stage-by-stage study measures is conditional on a save file it
 * invents: it wipes `tower_state`, plays stage 12 with a level-0 shop and no
 * challenge streak, and reports a clear rate for a situation that cannot occur.
 * Nobody arrives at stage 12 with nothing bought and nothing cleared. The three
 * systems that decide whether stage 12 is hard — the upgrades the player owns,
 * the challenge streak they built getting there, and the relief they earned by
 * failing — are all functions of the twenty runs BEFORE it, and a harness that
 * resets between samples measures a game nobody plays.
 *
 * So: a career starts at stage 1 with an empty wallet and an empty shop, plays
 * each stage with a policy, banks what it earns, SPENDS it through a purchasing
 * strategy, and carries the whole save forward — coins, upgrade levels,
 * `ts_challenge`, `ts_failed_stages` — until it clears the last stage or gets
 * stuck. The autobalancer engages because the save it reads is real, which is
 * half of what there is to measure here.
 *
 * ─── What "stuck" means ─────────────────────────────────────────────────────
 *
 * `STUCK_AFTER` consecutive losses on the same stage. Five, because the
 * escalating relief tops out at four failures (0.80 → 0.72 → 0.66 → 0.62 and
 * then holds): a player who has lost five times has been given everything the
 * game has to give and is still losing, and no sixth attempt is going to be
 * different. It is also, roughly, where real players stop.
 *
 * ─── The two things that make the numbers trustworthy ───────────────────────
 *
 *   1. ONE GRAPH PER CAREER. The module graph is re-evaluated at the start of
 *      each career and never during it, so `levels`, `challenge` and the
 *      failure record all persist exactly the way they do for a player, and no
 *      career can inherit the previous one's shop.
 *   2. NO MICROTASKS MID-RUN. `playOne` is synchronous. `useUpgrades` refreshes
 *      itself from a Vue `watch`, which flushes on the microtask queue, so an
 *      `await` inside a run would let the shop move under a stage already in
 *      flight. Purchases happen between attempts and only between attempts.
 */

import { CHALLENGE_KEY, COINS_KEY, FAILED_STAGES_KEY, REWARD_DECLINE_KEY } from '@/keys'
import { DECLINE_MAX } from '@/game/survival'
import type { UpgradeId } from '@/use/useUpgrades'
import type { DeathCause } from '@/use/useSurvivalGame'
import { newGraph, playOne, type Graph, type RunResult } from './harness'
import type { Policy } from './policies'
import type { BuyStrategy, Levels, ShopView } from './shop'
import { TRACKS } from './shop'

/** Consecutive losses on one stage before the career is declared stuck. */
export const STUCK_AFTER = 5

/**
 * Per-attempt time cap, seconds.
 *
 * Higher than the one-off study's 120 s on purpose. A career reaches stage 25
 * with a squad of several hundred and a boss with fifteen thousand health, and
 * the honest outcome of that fight is a long one — capping it early would
 * report a timeout where the game would have produced a result. Anything past
 * 180 s is a stalemate, and a stalemate is a loss.
 */
export const CAREER_MAX_SECONDS = 180

/** The last stage a career is asked to reach. Thirty is the brief. */
export const LAST_STAGE = 30

/** The result-screen multiplier, mirrored from `GameScene`. */
const REWARD_MULTIPLIER = 3

export interface CareerOptions {
  policy: Policy
  strategy: BuyStrategy
  seed: number
  lastStage?: number
  /** Does this player take the `×3` on every stage clear? Default false —
   *  the career the campaign must stay beatable on. */
  claimsReward?: boolean
  stuckAfter?: number
  maxSecondsPerAttempt?: number
}

/** Everything one stage of a career cost and produced. */
export interface StageRecord {
  stage: number
  attempts: number
  cleared: boolean
  /** Every attempt, in order. The last one is the clear, when there was one. */
  runs: RunResult[]

  coinsEarned: number
  coinsSpent: number
  /** Wallet after this stage's shopping trip. */
  wallet: number

  /** Shop levels the player walked IN with — what the first attempt was played
   *  at, which is the number that answers "was the wall affordable?" */
  levelsAtEntry: Levels
  levelsAtExit: Levels
  purchases: UpgradeId[]

  // ── The autobalancer, as it actually engaged ──
  /** Challenge streak on the first attempt of this stage. */
  challengeAtEntry: number
  /** Enemy-health multiplier on the first attempt, and on the last one. The
   *  gap between them IS the autobalancer's whole contribution to this stage. */
  hpReliefFirst: number
  hpReliefLast: number

  // ── The clear, or the best failure ──
  /** Stats from the attempt that cleared, or the deepest attempt if none did. */
  squadAtBoss: number
  dpsAtBoss: number
  damageAtBoss: number
  fireRateAtBoss: number
  bossHp: number
  bossSeconds: number | null

  // ── Did the doors pay what they printed? ──
  /** Survivors the winning doors promised on the quoted attempt, and paid. */
  gatePromised: number
  gateDelivered: number
  gatesClipped: number
  /** Seconds the quoted attempt spent pinned to `MAX_SQUAD`. */
  secondsAtCap: number

  /** Summed over every attempt on this stage. */
  deaths: Record<DeathCause, number>
}

export interface CareerResult {
  policy: string
  strategy: string
  seed: number
  /** Deepest stage cleared. `0` means stage 1 beat them. */
  reached: number
  /** The stage that stopped the career, or `0` when it cleared `lastStage`. */
  stuckAt: number
  finished: boolean
  stages: StageRecord[]
  totalAttempts: number
  totalEarned: number
  totalSpent: number
  finalWallet: number
  finalLevels: Levels
}

const emptyDeaths = (): Record<DeathCause, number> => ({
  foe: 0, elite: 0, barricade: 0, crate: 0, divider: 0, trap: 0, slam: 0
})

/** The shop's own accessor, one track at a time — `levels` itself is private to
 *  `useUpgrades` and only reachable through the composable's return value. */
const readLevels = (graph: Graph): Levels => {
  const out = {} as Levels
  for (const id of TRACKS) out[id] = graph.shop.upgradeLevel(id)
  return out
}

/**
 * A per-attempt seed.
 *
 * Retrying a stage has to roll a DIFFERENT world — the track is deterministic,
 * but the foe scatter, the bullet jitter and the spawn placement are not, and a
 * player who replays a stage does not replay the same bullets. Mixing the
 * attempt index in is what stops a career from re-running an identical loss
 * five times and calling it a wall.
 */
const attemptSeed = (seed: number, stage: number, attempt: number): number =>
  (seed ^ Math.imul(stage, 7919) ^ Math.imul(attempt + 1, 104729)) >>> 0

/**
 * Record a loss the sim did not record itself.
 *
 * Only reachable on a TIMEOUT: `finishRun` never ran, so the failure record was
 * never written and the challenge streak was never wiped. A career that skipped
 * this would hand the next stage a streak the player did not earn and deny a
 * stuck player the relief they did. Everything else `finishRun` does on a loss
 * (coins, the summary) is deliberately NOT replayed — a run that never resolved
 * never paid.
 */
const recordTimeoutAsLoss = (graph: Graph, stage: number): void => {
  const fails = { ...graph.state.getState<Record<string, number>>(FAILED_STAGES_KEY, {}) }
  fails[String(stage)] = (fails[String(stage)] ?? 0) + 1
  graph.state.setStates({ [FAILED_STAGES_KEY]: fails, [CHALLENGE_KEY]: 0 })
  graph.game.challenge.value = 0
}

/**
 * The shopping trip.
 *
 * Runs after EVERY attempt, win or lose, because that is exactly when the real
 * shop is reachable. The strategy is called in a loop until it declines or the
 * wallet cannot cover the price; the wallet is enforced here rather than
 * trusted to the strategy, so a badly-written one can spend coins it does not
 * have exactly never.
 */
const shop = (
  graph: Graph,
  strategy: BuyStrategy,
  stage: number,
  wallet: number,
  last: RunResult | null
): { wallet: number; spent: number; bought: UpgradeId[] } => {
  const bought: UpgradeId[] = []
  let spent = 0
  let coins = wallet

  // A shopping trip is bounded: every purchase raises the next price by 42–55 %,
  // so a wallet buys a finite number of levels. The cap is a guard against a
  // strategy that returns a maxed track forever, not a rule of the game.
  for (let guard = 0; guard < 60; guard++) {
    const cost = {} as Record<UpgradeId, number>
    for (const id of TRACKS) {
      cost[id] = graph.shop.isMaxed(id) ? Infinity : graph.shop.upgradeCost(id)
    }
    const view: ShopView = {
      stage,
      coins,
      levels: readLevels(graph),
      cost,
      startSquad: graph.shop.startSquad.value,
      damage: graph.shop.unitDamage.value,
      fireRate: graph.shop.fireRate.value,
      coinMultiplier: graph.shop.coinMultiplier.value,
      failures: graph.game.failureCount(stage),
      lastRun: last && {
        cleared: last.cleared,
        squadAtBoss: last.squadAtBoss,
        damage: last.damage,
        fireRate: last.fireRate,
        dps: last.dpsAtBoss,
        banked: last.banked
      }
    }

    const pick = strategy.next(view)
    if (pick === null) break
    const price = cost[pick]
    if (!Number.isFinite(price) || price > coins) break
    if (!graph.shop.applyUpgrade(pick)) break

    coins -= price
    spent += price
    bought.push(pick)
  }

  graph.state.setState(COINS_KEY, coins)
  return { wallet: coins, spent, bought }
}

/**
 * Play one career.
 *
 * Stage 1 with nothing, through to `lastStage` or the wall — whichever the
 * player finds first.
 */
export const runCareer = async (o: CareerOptions): Promise<CareerResult> => {
  const graph = await newGraph()
  graph.state.__resetTowerState()

  const lastStage = o.lastStage ?? LAST_STAGE
  const stuckAfter = o.stuckAfter ?? STUCK_AFTER
  const maxSeconds = o.maxSecondsPerAttempt ?? CAREER_MAX_SECONDS

  o.strategy.reset()

  const stages: StageRecord[] = []
  let wallet = 0
  let totalEarned = 0
  let totalSpent = 0
  let totalAttempts = 0
  let reached = 0
  let stuckAt = 0
  let lastRun: RunResult | null = null

  for (let stage = 1; stage <= lastStage; stage++) {
    const levelsAtEntry = readLevels(graph)
    const challengeAtEntry = graph.game.challenge.value
    const runs: RunResult[] = []
    const purchases: UpgradeId[] = []
    const deaths = emptyDeaths()
    let earned = 0
    let spent = 0
    let cleared = false

    for (let attempt = 0; attempt < stuckAfter && !cleared; attempt++) {
      const run = playOne(graph, {
        stage,
        policy: o.policy,
        seed: attemptSeed(o.seed, stage, attempt),
        maxSeconds
      })
      runs.push(run)
      lastRun = run
      totalAttempts++
      for (const [k, v] of Object.entries(run.deaths)) deaths[k as DeathCause] += v

      if (run.timedOut) recordTimeoutAsLoss(graph, stage)

      // ── The ×3, or the lack of it ──
      //
      // `claimsReward` models the two players the placement creates, and the
      // difference between them is the whole point of the design:
      //
      //   FALSE (default) — banks the stage's own payout and, on every clear,
      //     accrues a decline. The road leans a little harder each time (see
      //     `rewardDeclineFactor`) and the shop fills at the slow rate. This is
      //     the career the campaign has to remain BEATABLE on.
      //   TRUE            — banks three times the payout and holds the decline
      //     count at zero. This is the career it has to remain INTERESTING on.
      //
      // Modelled here rather than in `playOne` because claiming is a decision
      // taken on the result screen, after the run has resolved.
      const banked = o.claimsReward ? run.banked * REWARD_MULTIPLIER : run.banked
      wallet += banked
      earned += banked
      cleared = run.cleared

      if (cleared) {
        const next = o.claimsReward
          ? 0
          : Math.min(DECLINE_MAX, Number(graph.state.getState(REWARD_DECLINE_KEY, 0)) || 0) + 1
        graph.state.setState(REWARD_DECLINE_KEY, Math.min(DECLINE_MAX, next))
      }

      const trip = shop(graph, o.strategy, cleared ? stage + 1 : stage, wallet, run)
      wallet = trip.wallet
      spent += trip.spent
      purchases.push(...trip.bought)
    }

    // The attempt worth quoting: the clear, or — when there was none — the one
    // that got furthest, because "what did the best failure look like" is the
    // question a wall has to answer.
    const best = runs.find((r) => r.cleared)
      ?? [...runs].sort((a, b) => b.progress01 - a.progress01)[0]!

    stages.push({
      stage,
      attempts: runs.length,
      cleared,
      runs,
      coinsEarned: earned,
      coinsSpent: spent,
      wallet,
      levelsAtEntry,
      levelsAtExit: readLevels(graph),
      purchases,
      challengeAtEntry,
      hpReliefFirst: runs[0]?.hpRelief ?? 1,
      hpReliefLast: runs[runs.length - 1]?.hpRelief ?? 1,
      squadAtBoss: best.squadAtBoss,
      dpsAtBoss: best.dpsAtBoss,
      damageAtBoss: best.damage,
      fireRateAtBoss: best.fireRate,
      bossHp: best.bossHp,
      bossSeconds: best.bossSeconds,
      gatePromised: best.gatePromised,
      gateDelivered: best.gateDelivered,
      gatesClipped: best.gatesClipped,
      secondsAtCap: best.secondsAtCap,
      deaths
    })

    totalEarned += earned
    totalSpent += spent

    if (!cleared) {
      stuckAt = stage
      break
    }
    reached = stage
  }

  void lastRun
  return {
    policy: o.policy.id,
    strategy: o.strategy.id,
    seed: o.seed,
    reached,
    stuckAt,
    finished: stuckAt === 0 && reached >= lastStage,
    stages,
    totalAttempts,
    totalEarned,
    totalSpent,
    finalWallet: wallet,
    finalLevels: readLevels(graph)
  }
}

// ─── Controlled probes ──────────────────────────────────────────────────────

export interface StageProbeOptions {
  stage: number
  policy: Policy
  /** Shop levels to walk in with. Anything omitted is 0. */
  levels: Partial<Levels>
  seeds: readonly number[]
  /** Pre-seed the challenge streak — the UP half of the autobalancer. */
  challenge?: number
  /** Pre-seed the failure record for this stage — the DOWN half. */
  failures?: number
  maxSeconds?: number
}

/**
 * One stage, played at a KNOWN shop level with a KNOWN autobalancer state.
 *
 * The career tables answer "does the curve work"; this answers "what is this
 * purchase worth", which is a different question and cannot be read off a
 * career at all — inside a career every variable moves at once. Fixing the
 * levels and sweeping ONE track over a matched coin budget is the only way to
 * say which track is under-priced without hand-waving.
 *
 * It is also how the autobalancer gets tested: `challenge` and `failures` are
 * the two inputs, and holding everything else still is what turns "the streak
 * makes it harder" from a claim into a number.
 */
export const probeStage = async (o: StageProbeOptions): Promise<RunResult[]> => {
  const graph = await newGraph()
  graph.state.__resetTowerState()

  for (const id of TRACKS) {
    const want = o.levels[id] ?? 0
    for (let i = 0; i < want; i++) if (!graph.shop.applyUpgrade(id)) break
  }

  const out: RunResult[] = []
  for (const seed of o.seeds) {
    // Reset the autobalancer's two inputs before EVERY seed: the previous run
    // ended in a clear or a wipe, and `finishRun` wrote both of them.
    graph.state.setStates({
      [CHALLENGE_KEY]: o.challenge ?? 0,
      [FAILED_STAGES_KEY]: o.failures ? { [String(o.stage)]: o.failures } : {}
    })
    out.push(playOne(graph, {
      stage: o.stage,
      policy: o.policy,
      seed,
      maxSeconds: o.maxSeconds ?? CAREER_MAX_SECONDS
    }))
  }
  return out
}

// ─── Aggregation across careers ─────────────────────────────────────────────

export interface StageSummary {
  stage: number
  /** Careers that got this far at all. */
  seen: number
  /** Of those, how many cleared it. */
  clearRate: number
  /** Median attempts spent. `> 2` for a competent player is a WALL. */
  attempts: number
  attemptsMax: number
  coinsEarned: number
  coinsSpent: number
  wallet: number
  levels: Levels
  squadAtBoss: number
  dpsAtBoss: number
  damageAtBoss: number
  fireRateAtBoss: number
  bossHp: number
  bossSeconds: number | null
  /** Share of the promised gate payout that the squad ceiling actually paid. */
  gatePaidShare: number
  gatesClipped: number
  secondsAtCap: number
  challenge: number
  hpRelief: number
  /** Where the survivors went, summed over every attempt, biggest first. */
  deaths: Array<[DeathCause, number]>
}

const med = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** Fold N careers into one per-stage table. */
export const summariseCareers = (careers: readonly CareerResult[]): StageSummary[] => {
  const byStage = new Map<number, StageRecord[]>()
  for (const c of careers) {
    for (const s of c.stages) {
      const list = byStage.get(s.stage)
      if (list) list.push(s)
      else byStage.set(s.stage, [s])
    }
  }

  const out: StageSummary[] = []
  for (const [stage, rs] of [...byStage.entries()].sort((a, b) => a[0] - b[0])) {
    const tally: Record<string, number> = {}
    for (const r of rs) for (const [k, v] of Object.entries(r.deaths)) tally[k] = (tally[k] ?? 0) + v
    const withBoss = rs.filter((r) => r.bossSeconds != null)
    const levels = {} as Levels
    for (const id of TRACKS) levels[id] = med(rs.map((r) => r.levelsAtEntry[id]))

    out.push({
      stage,
      seen: rs.length,
      clearRate: rs.filter((r) => r.cleared).length / rs.length,
      attempts: med(rs.map((r) => r.attempts)),
      attemptsMax: Math.max(...rs.map((r) => r.attempts)),
      coinsEarned: med(rs.map((r) => r.coinsEarned)),
      coinsSpent: med(rs.map((r) => r.coinsSpent)),
      wallet: med(rs.map((r) => r.wallet)),
      levels,
      squadAtBoss: med(rs.map((r) => r.squadAtBoss)),
      dpsAtBoss: med(rs.map((r) => r.dpsAtBoss)),
      damageAtBoss: med(rs.map((r) => r.damageAtBoss)),
      fireRateAtBoss: med(rs.map((r) => r.fireRateAtBoss)),
      bossHp: med(rs.map((r) => r.bossHp)),
      bossSeconds: withBoss.length ? med(withBoss.map((r) => r.bossSeconds!)) : null,
      gatePaidShare: med(rs.map((r) => (r.gatePromised > 0 ? r.gateDelivered / r.gatePromised : 1))),
      gatesClipped: med(rs.map((r) => r.gatesClipped)),
      secondsAtCap: med(rs.map((r) => r.secondsAtCap)),
      challenge: med(rs.map((r) => r.challengeAtEntry)),
      hpRelief: med(rs.map((r) => r.hpReliefFirst)),
      deaths: (Object.entries(tally) as Array<[DeathCause, number]>)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
    })
  }
  return out
}

/** Play the same (policy, strategy) on `samples` different career seeds. */
export const careerSamples = async (
  policy: Policy,
  strategy: BuyStrategy,
  samples: number,
  opts: { seed0?: number; lastStage?: number; stuckAfter?: number; claimsReward?: boolean } = {}
): Promise<CareerResult[]> => {
  const out: CareerResult[] = []
  const seed0 = opts.seed0 ?? 5000
  for (let i = 0; i < samples; i++) {
    out.push(
      await runCareer({
        policy,
        strategy,
        seed: seed0 + i * 6367,
        lastStage: opts.lastStage,
        stuckAfter: opts.stuckAfter,
        claimsReward: opts.claimsReward
      })
    )
  }
  return out
}
