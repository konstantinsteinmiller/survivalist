/**
 * ─── Scripted shoppers ──────────────────────────────────────────────────────
 *
 * A *strategy* is a player standing in front of the upgrade screen, expressed
 * as a pure function of the wallet:
 *
 *     next(view) → the track to buy, or null to bank the coins
 *
 * The career simulator calls it in a loop after every attempt — win or lose,
 * exactly when the real shop is reachable — and stops when it returns `null` or
 * the wallet cannot cover the price. A strategy may read the view and nothing
 * else: it never touches the simulation, never sees a future stage, and cannot
 * spend coins it does not have.
 *
 * ─── Why this file exists ───────────────────────────────────────────────────
 *
 * "The player uses upgrades smartly" is a CLAIM, and a shop with four tracks
 * either has one right answer or it has a choice. Those two cases look
 * identical from inside the game and completely different in a table: if one
 * strategy dominates, the shop is a single-track ladder wearing four coats, and
 * whichever track it always picks is under-priced. So the strategies below are
 * chosen to bracket the space rather than to be good:
 *
 *   none         — the control. Every number the shop is worth is measured
 *                  against this line.
 *   cheapest     — buys whatever is cheapest that touches DPS. The player who
 *                  clicks the affordable button. Never saves, never plans.
 *   balanced     — round-robins all four tracks. The "spread it evenly" player,
 *                  and the one that catches a track being strictly ignorable.
 *   value        — marginal DPS per coin, with scavenge priced through its own
 *                  payback. The approximation of "optimal", and the yardstick
 *                  the other two are graded against.
 *   scavengeFirst— four levels of economy, then DPS. The idle-game reflex.
 *   rateFirst    — fire rate to the cap first. Tests the one stat the DESIGN
 *                  says a run cannot start high.
 *
 * If `value` beats the rest by a wide margin the shop is a puzzle; if
 * `cheapest` matches it, the shop is a ladder and the prices are wrong.
 */

import type { UpgradeId } from '@/use/useUpgrades'
import { BASE_FIRE_RATE, RANGE_PER_LEVEL } from '@/game/survival'

/** The four tracks, in the order the shop lists them. Declared here rather than
 *  imported so this file never instantiates a second copy of the shop module —
 *  the career owns the real one, inside its own graph. */
export const TRACKS: readonly UpgradeId[] = ['squad', 'power', 'rate', 'range', 'scavenge']

/** The three tracks that put numbers into `squad × damage × fireRate`. */
export const DPS_TRACKS: readonly UpgradeId[] = ['squad', 'power', 'rate']

export type Levels = Record<UpgradeId, number>

/** What the last attempt actually produced. A strategy that cannot see this is
 *  guessing at the exchange rate between a coin and a survivor. */
export interface LastRun {
  cleared: boolean
  /** Survivors standing when the boss spawned — the number DPS is made of. */
  squadAtBoss: number
  damage: number
  fireRate: number
  dps: number
  /** Coins the attempt paid in, scavenge multiplier included. */
  banked: number
}

export interface ShopView {
  /** The stage the player is about to face. */
  stage: number
  coins: number
  levels: Levels
  /** Price of the NEXT level of each track. `Infinity` once a track is maxed. */
  cost: Record<UpgradeId, number>
  /** Survivors the run will START with, at the levels held right now. */
  startSquad: number
  /** Per-survivor damage and shots/s the run will START with. */
  damage: number
  fireRate: number
  /** Coin multiplier the scavenge level is currently worth. */
  coinMultiplier: number
  /** Consecutive losses on this stage. Non-zero means the player is stuck. */
  failures: number
  lastRun: LastRun | null
}

export interface BuyStrategy {
  id: string
  /** The player this models, in one line. */
  describes: string
  reset(): void
  next(view: ShopView): UpgradeId | null
}

const affordable = (v: ShopView, id: UpgradeId): boolean =>
  Number.isFinite(v.cost[id]) && v.coins >= v.cost[id]

// ─── The control ────────────────────────────────────────────────────────────

/**
 * NONE — never opens the shop.
 *
 * The baseline every other strategy is measured against, and a real player: on
 * a first session a large fraction of people never find a meta screen at all.
 * If `none` and `cheapest` reach the same stage, the shop is decoration.
 */
export const none: BuyStrategy = {
  id: 'none',
  describes: 'Never buys anything. The control line, and the player who never found the shop.',
  reset() {},
  next() {
    return null
  }
}

// ─── Cheapest-first ─────────────────────────────────────────────────────────

/**
 * CHEAPEST — buys the cheapest thing that raises DPS, every time, forever.
 *
 * No planning, no saving, no scavenge. It is the greedy player the brief names,
 * and it is the strategy that exposes a mis-priced track fastest: whichever
 * track is cheapest per level for longest is the one it will over-buy, so if it
 * wins the career table, that track's curve is too flat.
 */
export const cheapest: BuyStrategy = {
  id: 'cheapest',
  describes: 'Always buys the cheapest track that raises DPS. Never saves, never buys scavenge.',
  reset() {},
  next(view) {
    let best: UpgradeId | null = null
    for (const id of DPS_TRACKS) {
      if (!affordable(view, id)) continue
      if (best === null || view.cost[id] < view.cost[best]) best = id
    }
    return best
  }
}

// ─── Round-robin ────────────────────────────────────────────────────────────

/**
 * BALANCED — one level of everything, in rotation.
 *
 * Deliberately ignorant of value: it spreads coins evenly across all four
 * tracks and lets the geometric costs do the rest. Its job in the study is to
 * be the strategy that CANNOT accidentally exploit a mis-priced track, so the
 * gap between it and `value` is a measurement of how much the shop's structure
 * is actually worth thinking about.
 */
export const balanced = (): BuyStrategy => {
  let cursor = 0
  return {
    id: 'balanced',
    describes: 'Round-robins all four tracks, buying the next one it can afford.',
    reset() {
      cursor = 0
    },
    next(view) {
      for (let i = 0; i < TRACKS.length; i++) {
        const id = TRACKS[(cursor + i) % TRACKS.length]!
        if (!affordable(view, id)) continue
        cursor = (cursor + i + 1) % TRACKS.length
        return id
      }
      return null
    }
  }
}

// ─── Value ──────────────────────────────────────────────────────────────────

/**
 * How many more shopping trips a purchase gets to pay itself back over.
 *
 * Scavenge is the only track that buys coins rather than survivors, so it is
 * worth exactly what the coins it will produce can buy — which depends entirely
 * on how much game is left. Six stages is a horizon a real player can hold in
 * their head, and it is short enough that scavenge stops being correct near the
 * end of a career, which is the behaviour a horizon is supposed to produce.
 */
export const SCAVENGE_HORIZON = 6

/**
 * How much better an unaffordable deal has to be before it is worth saving for.
 *
 * A player who never saves can never buy the expensive-but-efficient thing; a
 * player who always saves never buys anything. 1.35 is the edge at which
 * waiting one stage is obviously right rather than arguably right.
 */
export const SAVE_EDGE = 1.35

/**
 * How much of the crowd at the boss came from the START squad rather than from
 * the gates, measured from the attempt that just finished.
 *
 * A `+1` on the start squad is not worth one survivor at the boss: every `×N`
 * leaf on the way multiplies it too, so on a stage with two `×2` banks it is
 * worth four. The leverage is READ from the last run (`squadAtBoss /
 * startSquad`) rather than assumed, because it varies by a factor of ten
 * between stage 1 and stage 20 and any fixed guess is wrong at one end.
 */
const squadLeverage = (view: ShopView): number => {
  const r = view.lastRun
  if (!r || r.squadAtBoss <= 0) return 2
  return Math.max(1, r.squadAtBoss / Math.max(1, view.startSquad))
}

/**
 * How much of Reach's extra window turns into damage that mattered.
 *
 * A guess, and flagged as one: the honest number depends on how much of a given
 * stage is objects worth shooting early, which varies per stage and per line.
 * 0.6 keeps the track competitive without letting the value strategy treat it
 * as a straight DPS multiplier.
 */
const RANGE_TIME_YIELD = 0.6

/** Marginal DPS the next level of a track would add to the boss fight. */
export const marginalDps = (view: ShopView, id: UpgradeId): number => {
  const squad = Math.max(1, view.lastRun?.squadAtBoss ?? view.startSquad)
  const damage = view.lastRun?.damage ?? view.damage
  const rate = view.lastRun?.fireRate ?? view.fireRate
  switch (id) {
    // One more survivor at the start, multiplied by every gate on the way.
    case 'squad':
      return squadLeverage(view) * damage * rate
    // `+0.4` damage on every body in the crowd.
    case 'power':
      return squad * 0.4 * rate
    // `+7 %` of the BASE rate — the step is a fraction of 1.9, not of the rate
    // the run happens to have reached, which is why this track gets weaker the
    // more rate crates a run collects.
    case 'rate':
      return squad * damage * (BASE_FIRE_RATE * 0.07)
    /**
     * Reach adds no damage — it adds TIME, and time is what damage is spent
     * over. A round that reaches 3 % further arrives 3 % sooner at everything
     * on the road, so the crowd gets ~3 % more seconds of fire on each gate,
     * crate, wall and body before it is reached.
     *
     * Priced as that fraction of the run's own DPS, which makes it compound
     * with every other track exactly as it does in play, and deliberately
     * DISCOUNTED by `RANGE_TIME_YIELD`: some of the extra window is spent on
     * things the player was going to clear anyway, and the top of the track is
     * bounded by the camera (see `BULLET_RANGE_MAX`), so the last levels buy
     * less than they advertise.
     */
    case 'range':
      return squad * damage * rate * RANGE_PER_LEVEL * RANGE_TIME_YIELD
    default:
      return 0
  }
}

/**
 * VALUE — the approximation of "optimal".
 *
 * Ranks every track by marginal DPS per coin, prices scavenge through the
 * purchases its extra coins will fund over the next `SCAVENGE_HORIZON` stages,
 * and will SAVE rather than spend when the best deal on the board is one it
 * cannot afford yet and is at least `SAVE_EDGE` better than anything it can.
 *
 * It is not provably optimal — a truly optimal shopper would search the whole
 * purchase tree against a model of every remaining stage, and would need a
 * model of the stages to do it. It is, however, the best answer available from
 * information a player actually has on the shop screen, which makes the gap
 * between it and `cheapest` the honest value of thinking.
 */
export const value = (): BuyStrategy => ({
  id: 'value',
  describes: 'Buys the best marginal DPS per coin, prices scavenge by its payback, and saves for a clearly better deal.',
  reset() {},
  next(view) {
    // The exchange rate between a coin and a point of DPS, at today's prices.
    // Scavenge is worth whatever the coins it prints can buy at this rate.
    let bestDpsPerCoin = 0
    for (const id of DPS_TRACKS) {
      if (!Number.isFinite(view.cost[id])) continue
      bestDpsPerCoin = Math.max(bestDpsPerCoin, marginalDps(view, id) / view.cost[id])
    }

    const ratio = (id: UpgradeId): number => {
      if (!Number.isFinite(view.cost[id])) return -1
      if (id === 'scavenge') {
        // Income before the multiplier, so the +12 % is applied to the right
        // base — a run banking 300 with scavenge 3 earned 220 on its own.
        const base = (view.lastRun?.banked ?? 0) / Math.max(0.01, view.coinMultiplier)
        const extraCoins = 0.12 * base * SCAVENGE_HORIZON
        return (extraCoins * bestDpsPerCoin) / view.cost[id]
      }
      return marginalDps(view, id) / view.cost[id]
    }

    let bestAny: UpgradeId | null = null
    let bestAffordable: UpgradeId | null = null
    for (const id of TRACKS) {
      const r = ratio(id)
      if (r <= 0) continue
      if (bestAny === null || r > ratio(bestAny)) bestAny = id
      if (affordable(view, id) && (bestAffordable === null || r > ratio(bestAffordable))) {
        bestAffordable = id
      }
    }

    if (bestAffordable === null) return null
    if (bestAny !== null && bestAny !== bestAffordable && ratio(bestAny) > ratio(bestAffordable) * SAVE_EDGE) {
      // Save. The wallet only grows, so this terminates the moment the better
      // deal comes into range.
      return null
    }
    return bestAffordable
  }
})

// ─── Single-track fixations ─────────────────────────────────────────────────

/**
 * SCAVENGE FIRST — four levels of economy, then greedy DPS.
 *
 * The reflex every idle-game player brings with them ("buy the income first").
 * Whether it is right here is a real question: a Survivalist career is thirty
 * stages long, which is either plenty of time for compounding or not nearly
 * enough, depending entirely on how steep the scavenge curve is.
 */
export const scavengeFirst = (levels = 4): BuyStrategy => ({
  id: `scavenge${levels}`,
  describes: `Buys ${levels} levels of scavenge before anything else, then the cheapest DPS track.`,
  reset() {},
  next(view) {
    if (view.levels.scavenge < levels && affordable(view, 'scavenge')) return 'scavenge'
    if (view.levels.scavenge < levels) return null // save for it
    return cheapest.next(view)
  }
})

/** Buy one track to its ceiling before touching anything else. The probe that
 *  answers "is this track strictly dominant, or strictly ignorable?" */
export const singleTrack = (id: UpgradeId): BuyStrategy => ({
  id: `only-${id}`,
  describes: `Pours everything into ${id}, then falls back to the cheapest DPS track.`,
  reset() {},
  next(view) {
    if (affordable(view, id)) return id
    if (Number.isFinite(view.cost[id])) return null // save for the next level
    return cheapest.next(view)
  }
})

/** The strategies the career study drives, in the order the tables print them. */
export const STRATEGIES: readonly BuyStrategy[] = [
  none,
  cheapest,
  balanced(),
  value(),
  scavengeFirst(4)
]

export const strategyById = (id: string): BuyStrategy => {
  const s = STRATEGIES.find((q) => q.id === id)
  if (!s) throw new Error(`unknown strategy "${id}"`)
  return s
}
