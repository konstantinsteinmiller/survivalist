import { computed, ref, watch, type Ref } from 'vue'
import { flushSaveNow, saveDataVersion } from '@/use/useSaveStatus'
import { getState, setState, towerState } from '@/use/useTowerState'
import { UPGRADES_KEY } from '@/keys'
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

export type UpgradeId = 'squad' | 'power' | 'rate' | 'scavenge'

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  squad: {
    id: 'squad',
    maxLevel: 16,
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
    cost: (l) => Math.round(70 * Math.pow(1.38, l)),
    valueAt: (l) => START_SQUAD + l
  },
  power: {
    id: 'power',
    maxLevel: 20,
    /**
     * Re-priced UP, not down. The career study is unambiguous: budget-matched
     * against every other track at every point, firepower wins by 5–14×, and it
     * is the only purchase that raises PEAK SQUAD as well — damage buys
     * survival, survival buys crowd, crowd buys damage. Being both the strongest
     * track and the cheapest one was the actual bug; `+0.4` a level was never
     * the problem. Pricing narrows the gap to ~10×; it cannot close it, and
     * closing it belongs in the loop, not the price list.
     */
    cost: (l) => Math.round(110 * Math.pow(1.52, l)),
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
    maxLevel: 12,
    // Second-best track, priced third. Cheaper and one step bigger, so the
    // ordering in the shop matches the ordering in the measurements.
    cost: (l) => Math.round(85 * Math.pow(1.42, l)),
    valueAt: (l) => Math.round(BASE_FIRE_RATE * (1 + l * 0.09) * 10) / 10
  },
  scavenge: {
    id: 'scavenge',
    maxLevel: 10,
    /**
     * The cheapest track in the shop was also the one that bought the most
     * coins, so "buy only scavenging and ignore combat" tied the best strategy
     * in the game — an economy track that pays for itself faster than the things
     * it is supposed to be spent on is a money printer, not a decision.
     */
    cost: (l) => Math.round(120 * Math.pow(1.55, l)),
    valueAt: (l) => Math.round((1 + l * 0.08) * 100)
  }
}

export const UPGRADE_ORDER: UpgradeId[] = ['squad', 'power', 'rate', 'scavenge']

type Levels = Record<UpgradeId, number>

const emptyLevels = (): Levels => ({ squad: 0, power: 0, rate: 0, scavenge: 0 })

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
