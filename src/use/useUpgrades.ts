import { computed, ref, watch, type Ref } from 'vue'
import { flushSaveNow, saveDataVersion } from '@/use/useSaveStatus'
import { getState, setState, towerState } from '@/use/useTowerState'
import { UPGRADES_KEY } from '@/keys'
import { RANGE_PER_LEVEL } from '@/game/survival'
import { BASE_DAMAGE, BASE_FIRE_RATE, START_SQUAD } from '@/game/survival'

/**
 * ─── Meta upgrades ──────────────────────────────────────────────────────────
 *
 * Four permanent tracks bought with coins between runs. Four, not forty: a
 * runner's meta exists to make the NEXT attempt feel different within thirty
 * seconds, and a wall of nodes buys nothing except a scroll bar.
 *
 * Every track is deliberately legible as a sentence the player can hold in
 * their head while playing:
 *
 *   Squad     — "I start with more people."
 *   Firepower — "Everyone hits harder."
 *   Fire rate — "Everyone shoots faster."
 *   Scavenge  — "I get paid more for the same run."
 *
 * The first three change the run; the fourth changes how fast the first three
 * arrive. That is the whole economy.
 */

export interface UpgradeDef {
  id: UpgradeId
  maxLevel: number
  /** Cost of moving from `level` to `level + 1`. */
  cost: (level: number) => number
  /** The value this track produces at a given level, for the shop's readout. */
  valueAt: (level: number) => number
}

export type UpgradeId = 'squad' | 'power' | 'rate' | 'range' | 'scavenge'

/**
 * ─── The endless tail ───────────────────────────────────────────────────────
 *
 * The road has no last stage, so the shop cannot have a last level: once every
 * track is maxed, coins stop meaning anything and the difficulty curve has
 * nothing left to keep pace with. Measured before this landed — a benchmark
 * career reached stage 80 with **every track maxed and 893 063 coins unspent**,
 * and no stage past 40 cost it more than two attempts.
 *
 * Three of the five tracks are therefore uncapped. The other two are NOT, and
 * that is a rule rather than an omission — see `rate` and `range` below: both
 * are bounded by something physical (the bullet budget, the camera), and an
 * endless level on either would sell a number that does nothing.
 *
 * The tail is priced GENTLER than the head, which looks backwards and is not.
 * The authored curve multiplies by 1.38–1.55 a level, so by level 20 a purchase
 * costs ~2 850× the first one — far past anything a stage pays out. Continuing
 * that slope would put level 21 tens of stages away and the "endless" shop
 * would be endless the way a locked door is. Anchored at the last authored
 * price and growing 1.16 a level, an endless purchase costs roughly ten stages
 * of deep income at stage 80 and slowly more after that: always affordable,
 * never free, and always the next thing.
 */
const ENDLESS_RATIO = 1.16

/**
 * Cost of `level`, on a curve that runs the authored exponential up to
 * `authored` levels and then hands over to the gentler endless slope.
 */
const endlessCost = (base: number, ratio: number, authored: number) =>
  (level: number): number => {
    if (level < authored) return Math.round(base * Math.pow(ratio, level))
    const last = base * Math.pow(ratio, authored - 1)
    return Math.round(last * Math.pow(ENDLESS_RATIO, level - authored + 1))
  }

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  squad: {
    id: 'squad',
    // Endless: every level is one more starting survivor AND a bigger share of
    // what every `+N` door pays (`gatePayoutBonus`), and neither has a ceiling.
    maxLevel: Number.POSITIVE_INFINITY,
    /**
     * Was the most expensive track in the shop and the weakest by a distance:
     * budget-matched at stage 24 it bought **exactly zero** extra DPS for 6 403
     * coins, because four extra starting survivors are rounding error next to a
     * crowd the gates have already multiplied.
     *
     * Cheaper, longer — and it now also raises what every `+N` door PAYS, which
     * is the only way a starting-squad track can matter in a game where the
     * squad is built on the road rather than in the shop.
     */
    cost: endlessCost(70, 1.38, 16),
    valueAt: (l) => START_SQUAD + l
  },
  power: {
    id: 'power',
    // Endless: damage is the term the whole DPS product hangs off and nothing
    // clamps it, so it is the track a deep run keeps coming back to.
    maxLevel: Number.POSITIVE_INFINITY,
    /**
     * Re-priced UP, not down. The career study is unambiguous: budget-matched
     * against every other track at every point, firepower wins by 5–14×, and it
     * is the only purchase that raises PEAK SQUAD as well — damage buys
     * survival, survival buys crowd, crowd buys damage. Being both the strongest
     * track and the cheapest one was the actual bug; `+0.4` a level was never
     * the problem. Pricing narrows the gap to ~10×; it cannot close it, and
     * closing it belongs in the loop, not the price list.
     */
    cost: endlessCost(110, 1.52, 20),
    /**
     * +0.4 per level, NOT +1.
     *
     * At +1 the very first purchase doubled every survivor's damage — 60 coins
     * turned stages 1–4 into a walkover, which is the single most-reported
     * balance complaint this game has had. Damage is the term the whole DPS
     * product hangs off, so a full point of it at base 1 is a 100 % swing.
     *
     * Fractional steps keep the track meaningful without letting the shop
     * outrun the road: a green crate is still worth `+1` — two and a half
     * levels of shop — so the run remains the place damage actually comes from.
     */
    valueAt: (l) => Math.round((BASE_DAMAGE + l * 0.4) * 10) / 10
  },
  rate: {
    id: 'rate',
    /**
     * NOT endless, and the reason is physical rather than economic.
     *
     * Fire rate is hard-clamped at `MAX_FIRE_RATE` = 6.5 — the ceiling that
     * stops a crate-heavy run outrunning the bullet budget and the audio
     * throttle. Rate crates already carry a run from the meta floor to that
     * cap, so levels past this point would sell a number that changes nothing.
     * A shop that keeps taking coins for a stat it cannot move is worse than a
     * shop with a maxed track in it.
     */
    maxLevel: 12,
    // Second-best track, priced third. Cheaper and one step bigger, so the
    // ordering in the shop matches the ordering in the measurements.
    cost: (l) => Math.round(85 * Math.pow(1.42, l)),
    /**
     * 0.07, not 0.09 — the readout was lying by 13 %.
     *
     * `fireRate` (below) has always applied 0.07 a level; this display function
     * said 0.09, so the shop promised 4.0 shots/s at max and the run delivered
     * 3.5. The number the player is shown must be the number the simulation
     * uses, and the simulation is the one that cannot be wrong.
     */
    valueAt: (l) => Math.round(BASE_FIRE_RATE * (1 + l * 0.07) * 10) / 10
  },
  range: {
    id: 'range',
    /**
     * NOT endless, for the same kind of reason as `rate`: `effectiveBulletRange`
     * clamps the guns at the top of the screen (`BULLET_RANGE_MAX`), and the
     * tenth level already reaches it. Selling an eleventh would either do
     * nothing or put rounds above the camera — which is the bug the whole range
     * rule exists to prevent.
     */
    maxLevel: 10,
    /**
     * ─── Reach ────────────────────────────────────────────────────────────
     *
     * +3 % of the base gun range per level, +30 % at 10 — and it is the only
     * track that buys TIME rather than force. Everything the road throws costs
     * seconds to answer: a gate has to be pumped before it arrives, a crate
     * broken before it is walked into, a barricade cleared before the crowd
     * reaches it. Range is those seconds, bought once.
     *
     * That makes it the natural counterpart to `BULLET_RANGE`, which
     * deliberately stops rounds short of the top of the screen: the base rule
     * is "you cannot shoot what you have not properly seen", and this track
     * walks that line up to "you can shoot everything on screen" — and no
     * further. `effectiveBulletRange` does the clamping, so a maxed player
     * never fires into the dark above the camera.
     *
     * Priced between `rate` and `scavenge`. It compounds with every other track
     * (more seconds of fire is more of whatever your fire is worth) but it adds
     * no damage of its own, so it must not be the cheap first purchase.
     */
    cost: (l) => Math.round(100 * Math.pow(1.46, l)),
    /** Shown as a percentage of the base reach. */
    valueAt: (l) => Math.round((1 + l * RANGE_PER_LEVEL) * 100)
  },
  scavenge: {
    id: 'scavenge',
    // Endless, and deliberately the one that compounds: past the authored ten
    // levels it is how a deep player funds the other two. The magnet reach it
    // also sells stops mattering once it spans the lane, so the late value is
    // the multiplier alone — which is exactly why it must not be the cheapest
    // endless level on the board.
    maxLevel: Number.POSITIVE_INFINITY,
    /**
     * The cheapest track in the shop was also the one that bought the most
     * coins, so "buy only scavenging and ignore combat" tied the best strategy
     * in the game — an economy track that pays for itself faster than the things
     * it is supposed to be spent on is a money printer, not a decision.
     */
    cost: endlessCost(120, 1.55, 10),
    valueAt: (l) => Math.round((1 + l * 0.08) * 100)
  }
}

export const UPGRADE_ORDER: UpgradeId[] = ['squad', 'power', 'rate', 'range', 'scavenge']

type Levels = Record<UpgradeId, number>

const emptyLevels = (): Levels => ({ squad: 0, power: 0, rate: 0, range: 0, scavenge: 0 })

const read = (): Levels => {
  const raw = getState<Partial<Levels>>(UPGRADES_KEY, {})
  const out = emptyLevels()
  if (raw && typeof raw === 'object') {
    for (const id of UPGRADE_ORDER) {
      const v = Number(raw[id])
      if (Number.isFinite(v) && v > 0) out[id] = Math.min(UPGRADES[id].maxLevel, Math.floor(v))
    }
  }
  return out
}

const levels: Ref<Levels> = ref(read())

// Re-read on the hydrate bump AND on any blob-identity change, so a cloud sync
// landing mid-session never leaves the shop showing stale levels.
const refresh = (): void => { levels.value = read() }
watch(saveDataVersion, refresh)
watch(towerState, refresh, { deep: false })

// ─── Derived run stats ──────────────────────────────────────────────────────
//
// These are the ONLY things the simulation reads. It never sees a level or a
// price, which keeps the balance of a run separate from the balance of the shop.

export const startSquad = computed(() => UPGRADES.squad.valueAt(levels.value.squad))
export const unitDamage = computed(() => UPGRADES.power.valueAt(levels.value.power))
export const fireRate = computed(() => BASE_FIRE_RATE * (1 + levels.value.rate * 0.07))
export const coinMultiplier = computed(() => 1 + levels.value.scavenge * 0.08)

/**
 * Extra coin-magnet reach, in world units, bought by the Scavenging track.
 *
 * The magnet used to be a flat `crowdRadius + 3.6`, which on a 9-unit-wide lane
 * is most of the road — so every coin on the stage was collected no matter
 * where the crowd stood, and the curved coin trails the generator spends real
 * effort laying down were decoration. A pickup you cannot miss is not a pickup;
 * it is a number that goes up.
 *
 * So the magnet now starts near the crowd's own body (`COIN_MAGNET_BASE`) and
 * the reach is what Scavenging actually sells. At level 0 the player drives
 * over the trail; at level 10 they sweep it, which is a visible, physical
 * upgrade rather than a percentage on a results screen — and it gives the
 * cheapest track in the shop a reason to exist beyond its multiplier.
 */
export const coinMagnetBonus = computed(() => levels.value.scavenge * 0.34)

/**
 * Extra gun reach as a fraction of the base, 0 … 0.30.
 *
 * Read by `effectiveBulletRange`, which is what the simulation actually uses —
 * this is deliberately just the multiplier, so the clamp against the camera
 * lives in one place next to the rule it is protecting.
 */
export const rangeBonus = computed(() => levels.value.range * RANGE_PER_LEVEL)

/**
 * How much MORE every `+N` gate pays, per level of the Squad track.
 *
 * The one structural change in this re-pricing. A starting-squad bonus is worth
 * almost nothing by stage 20 because the crowd is built by the doors, not by
 * the shop — so the track now buys a share of what the doors give, which is the
 * only currency that keeps its value all campaign.
 */
export const gatePayoutBonus = computed(() => 1 + levels.value.squad * 0.04)

export const upgradeLevel = (id: UpgradeId): number => levels.value[id]
export const upgradeCost = (id: UpgradeId): number => UPGRADES[id].cost(levels.value[id])
export const isMaxed = (id: UpgradeId): boolean => levels.value[id] >= UPGRADES[id].maxLevel

/** Apply a purchase. The CALLER is responsible for spending the coins — this
 *  never touches the wallet, so a failed spend can't leave a level granted. */
export const applyUpgrade = (id: UpgradeId): boolean => {
  if (isMaxed(id)) return false
  const next = { ...levels.value, [id]: levels.value[id] + 1 }
  levels.value = next
  setState(UPGRADES_KEY, next)
  // A purchase is a hard checkpoint: the player spent a currency and expects it
  // to survive a reload, so the save pipeline drains now rather than on the
  // debounce. Fire-and-forget — a slow cloud write must never block the UI.
  void flushSaveNow()
  return true
}

/**
 * Test/dev seam: set a track's level outright, bypassing the wallet.
 *
 * Writes through the same state the shop does, so anything reading a bonus sees
 * exactly what a real save would produce.
 */
export const __setUpgradeLevel = (id: UpgradeId, level: number): void => {
  const next = { ...levels.value, [id]: Math.max(0, Math.min(UPGRADES[id].maxLevel, level)) }
  levels.value = next
  setState(UPGRADES_KEY, next)
}

/** How many tracks the player can afford right now — drives the shop button's
 *  attention badge, which is the single biggest driver of shop opens. */
export const affordableCount = (coins: number): number =>
  UPGRADE_ORDER.reduce((n, id) => n + (!isMaxed(id) && coins >= upgradeCost(id) ? 1 : 0), 0)

export const useUpgrades = () => ({
  levels,
  startSquad,
  unitDamage,
  fireRate,
  coinMultiplier,
  gatePayoutBonus,
  upgradeLevel,
  upgradeCost,
  isMaxed,
  applyUpgrade,
  affordableCount
})

export default useUpgrades
