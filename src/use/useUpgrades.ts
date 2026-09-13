import { computed, ref, watch, type Ref } from 'vue'
import { flushSaveNow, saveDataVersion } from '@/use/useSaveStatus'
import { getState, setState, towerState } from '@/use/useTowerState'
import { UPGRADES_KEY } from '@/keys'
import { RANGE_PER_LEVEL } from '@/game/survival'
import { WEAPONS, type WeaponId } from '@/game/weapons'
import { BASE_DAMAGE, BASE_FIRE_RATE, squadBaseAt } from '@/game/survival'
import { gateAddBase } from '@/game/track'

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

/**
 * ─── Skill numbers ──────────────────────────────────────────────────────────
 *
 * Kept here beside the tracks that sell them so a balance pass reads as one
 * place, and exported so the simulation and the HUD agree on what a level buys.
 */

/** Grenade damage as a multiple of the crowd's fire, at level 0 and per level. */
export const GRENADE_BASE_MULT = 3
export const GRENADE_MULT_STEP = (6 - GRENADE_BASE_MULT) / 20

/** Shield: level 1 unlocks it at three seconds, level 10 reaches six. */
export const SHIELD_MAX_LEVEL = 10
export const SHIELD_BASE_SECONDS = 3
export const shieldSecondsAt = (level: number): number =>
  level <= 0 ? 0 : SHIELD_BASE_SECONDS + (Math.min(level, SHIELD_MAX_LEVEL) - 1) * ((6 - SHIELD_BASE_SECONDS) / (SHIELD_MAX_LEVEL - 1))

/** Both skills share one clock. */
export const SKILL_COOLDOWN_MS = 30_000

export interface UpgradeDef {
  id: UpgradeId
  maxLevel: number
  /** Cost of moving from `level` to `level + 1`. */
  cost: (level: number) => number
  /**
   * The value this track produces at a given level, for the shop's readout.
   * `stage` is the stage the readout is for; only Squad reads it, because only
   * Squad's number depends on how deep the road is (see `squadPerLevel`).
   */
  valueAt: (level: number, stage?: number) => number
}

/**
 * ─── What one Squad level puts on the start line ────────────────────────────
 *
 * It used to be one survivor, on every stage. At stage 40 a single door pays
 * 40–50, so a level of Squad was worth a fiftieth of one bank: bought, and never
 * seen again. A starting-squad track in a game where the crowd is built by the
 * doors only means something if it is priced in DOORS.
 *
 * So a level is a sixth of the stage's own `+N` door, never less than one
 * survivor: +1 for stages 1–6, +2 from stage 7, +5 at stage 40, +6 at 60 and +8
 * at 100. Six levels start the run a full door ahead, on any stage, which is a
 * sentence a player can check against the road.
 *
 * A divisor rather than a `1 / 6` share on purpose: `15 * (1 / 6)` is not
 * exactly 2.5 in floating point, and a readout that rounds the wrong way on one
 * stage is a bug report nobody can reproduce.
 */
export const SQUAD_LEVELS_PER_DOOR = 6

/** Survivors one Squad level adds to the start of `stage`. */
export const squadPerLevel = (stage: number): number =>
  Math.max(1, Math.round(gateAddBase(Math.max(1, stage)) / SQUAD_LEVELS_PER_DOOR))

/**
 * ─── What one Squad level adds to every door ────────────────────────────────
 *
 * Was a flat +4 % a level with no ceiling, and that was the part of the track
 * that broke the deep game: at level 30 every `+N` door paid 2.2x what it
 * printed, and even with the doors trimmed (`GATE_GROWTH_TRIM`) a perfect
 * level-30 run pinned `MAX_SQUAD` with most of a stage-60+ road still ahead.
 *
 * Now each level adds a tenth less than the one before, in whole percents:
 * 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, then 1 % a level up to level 20, where the
 * step rounds to nothing and the bonus stops at +37 %. Levels past 20 still buy
 * starting survivors (`squadPerLevel`), which keep growing with the stage.
 */
export const GATE_PAYOUT_FIRST_PCT = 4
export const GATE_PAYOUT_DECAY = 0.9

/** Whole percent the `level`-th Squad level adds to every `+N` door. */
export const gatePayoutStepPct = (level: number): number =>
  level < 1 ? 0 : Math.round(GATE_PAYOUT_FIRST_PCT * GATE_PAYOUT_DECAY ** (level - 1))

/** Multiplier on every `+N` door's payout at a given Squad level, 1.0 at 0. */
export const gatePayoutBonusAt = (level: number): number => {
  let pct = 0
  for (let k = 1; k <= level; k++) {
    const step = gatePayoutStepPct(k)
    // The steps only ever shrink, so the first zero is the last one that matters
    // — and the track is endless, so a save at level 400 must not loop 400 times.
    if (step <= 0) break
    pct += step
  }
  return 1 + pct / 100
}

export type UpgradeId =
  | 'squad' | 'power' | 'rate' | 'range' | 'scavenge' | 'grenade' | 'shield'
  | 'rocket' | 'gatling'

/**
 * What one level of a weapon track is worth.
 *
 * +12 % of the weapon's BASE damage per level, additive — so level 10 is a
 * rocket doing 2.2x what an unupgraded one does, on top of the 5.5x the weapon
 * already carries over the squad's own gun. Additive rather than compounding
 * because these stack on a multiplier that is itself already large: a
 * compounding track on top of a x5.5 base is a number that leaves the game
 * inside twenty levels.
 */
export const WEAPON_POWER_STEP = 0.12

/** Which shop track pays for which weapon. One place, so a third weapon is a
 *  row in this map rather than a branch in four files. */
export const WEAPON_TRACK: Record<WeaponId, UpgradeId> = {
  rocket: 'rocket',
  gatling: 'gatling'
}

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
    // Endless: every level is a sixth of a door's worth of starting survivors
    // (`squadPerLevel`), which grows with the stage and has no ceiling, AND a
    // share of what every `+N` door pays (`gatePayoutBonusAt`), which shrinks a
    // level and stops at +37 %.
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
    /** The crowd a run opens with on `stage` — the number the shop shows. */
    // `squadBaseAt` rather than a constant: stage 1 opens on ONE survivor so the
    // first door reads as a crowd appearing, and every stage after it opens on
    // the floor the campaign was balanced against.
    valueAt: (l, stage = 1) => squadBaseAt(stage) + l * squadPerLevel(stage)
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
  },

  /**
   * ─── Grenade ──────────────────────────────────────────────────────────────
   *
   * The first ACTIVE thing in the game: everything else the shop sells is a
   * number the simulation reads on its own. This is a button the player presses.
   *
   * Owned from the start at level 0, because a skill the player has to buy
   * before they know it exists is a skill most players never meet — and the
   * whole point of it is to give the opening runs a verb. The track sells power,
   * not access: 3x at 0, 6x at 20, in even steps.
   *
   * Priced under `power`: it is a burst on a 30-second clock rather than damage
   * every second, so it must not out-compete the track that carries the run.
   */
  grenade: {
    id: 'grenade',
    maxLevel: 20,
    cost: (l) => Math.round(90 * Math.pow(1.33, l)),
    /** Multiplier on the crowd's fire. Shown as `3.0` … `6.0`. */
    valueAt: (l) => Math.round((GRENADE_BASE_MULT + l * GRENADE_MULT_STEP) * 10) / 10
  },

  /**
   * ─── Shield ───────────────────────────────────────────────────────────────
   *
   * Halves what the road takes from the crowd, for a few seconds.
   *
   * LOCKED at level 0, unlike the grenade, and that asymmetry is the point: one
   * skill teaches that the game has buttons, the second is something to find in
   * the shop later. Level 1 is the unlock and gives 3 s; level 10 gives 6 s.
   *
   * The expensive track of the two. A grenade answers a problem in front of you;
   * a shield answers being wrong about one, which is worth more on exactly the
   * stages where a run is otherwise lost.
   */
  shield: {
    id: 'shield',
    maxLevel: SHIELD_MAX_LEVEL,
    cost: (l) => Math.round(260 * Math.pow(1.4, l)),
    /** Seconds of protection. `0` reads as "not unlocked yet". */
    valueAt: (l) => Math.round(shieldSecondsAt(l) * 10) / 10
  },

  /**
   * ─── The two weapon tracks ────────────────────────────────────────────────
   *
   * Bought SEPARATELY, and the separation is the point rather than an
   * accounting detail. Which weapon a stage offers is fixed by the stage number
   * (`weaponForStage`), so the two tracks are two different questions about the
   * road ahead: a player stuck on an even stage is looking at a rocket every
   * attempt, and levelling the launcher is a direct answer to the thing that is
   * actually killing them. A single shared "weapon damage" track would have
   * made both purchases the same purchase and thrown that away.
   *
   * They are the only tracks in the shop that pay nothing until something is
   * EARNED on the road — a level here is worth exactly zero to a player who
   * never solves a lever puzzle — and they are priced with that in mind:
   * cheaper per level than `power`, which pays on every round of every stage,
   * and endless like it, because a weapon multiplier is the one number a deep
   * run can always spend more on.
   *
   * Ordered after the skills, so the shop reads as: the four stats, the two
   * buttons, then the two things you have to go and find.
   */
  rocket: {
    id: 'rocket',
    maxLevel: Number.POSITIVE_INFINITY,
    cost: endlessCost(140, 1.4, 14),
    /** Shown as a percentage of the launcher's base damage. */
    valueAt: (l) => Math.round((1 + l * WEAPON_POWER_STEP) * 100)
  },
  gatling: {
    id: 'gatling',
    maxLevel: Number.POSITIVE_INFINITY,
    // Priced identically to the rocket on purpose. The two weapons are balanced
    // to about the same single-target multiplier (see `game/weapons.ts`), so a
    // price difference here would be a thumb on the scale for one half of the
    // campaign's stages over the other.
    cost: endlessCost(140, 1.4, 14),
    valueAt: (l) => Math.round((1 + l * WEAPON_POWER_STEP) * 100)
  }
}

export const UPGRADE_ORDER: UpgradeId[] = [
  'squad', 'power', 'rate', 'range', 'scavenge', 'grenade', 'shield', 'rocket', 'gatling'
]

type Levels = Record<UpgradeId, number>

const emptyLevels = (): Levels => ({
  squad: 0, power: 0, rate: 0, range: 0, scavenge: 0, grenade: 0, shield: 0,
  rocket: 0, gatling: 0
})

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

/**
 * The crowd a run opens with on `stage`, before any retry relief.
 *
 * A function of the stage rather than a computed, because a Squad level is
 * priced in the stage's own doors (`squadPerLevel`). It still reads `levels`,
 * so a watcher that calls it re-runs on a purchase or a cloud hydrate.
 */
export const startSquadAt = (stage: number): number =>
  UPGRADES.squad.valueAt(levels.value.squad, stage)
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
 * How much MORE every `+N` gate pays, from the Squad track.
 *
 * The one structural change in this re-pricing. A starting-squad bonus is worth
 * almost nothing by stage 20 because the crowd is built by the doors, not by
 * the shop — so the track now buys a share of what the doors give, which is the
 * only currency that keeps its value all campaign. Each level's share is smaller
 * than the last and the total stops at +37 % — see `gatePayoutBonusAt`.
 */
export const gatePayoutBonus = computed(() => gatePayoutBonusAt(levels.value.squad))

/**
 * Damage multiplier a weapon carries from the shop, 1.0 at level 0.
 *
 * A plain function rather than a computed, and read ONCE per tick by
 * `stepShooting`: the multiplier only changes between runs, and a gatling at
 * depth resolves this on the order of a hundred rounds a second.
 */
export const weaponPowerMul = (id: WeaponId): number =>
  1 + levels.value[WEAPON_TRACK[id]] * WEAPON_POWER_STEP

/**
 * What the weapon is worth all in, for the shop's readout: the weapon's own
 * multiplier times whatever the track has bought. Expressed against the squad's
 * ordinary gun, which is the only baseline a player has to compare it to.
 */
export const weaponTotalMul = (id: WeaponId): number =>
  Math.round(WEAPONS[id].rateMul * WEAPONS[id].damageMul * weaponPowerMul(id) * 10) / 10

/** Grenade damage multiplier on the crowd's fire — 3x at level 0, 6x at 20. */
export const grenadeMult = computed(
  () => GRENADE_BASE_MULT + levels.value.grenade * GRENADE_MULT_STEP
)
/** Seconds the shield holds. `0` while the track is still locked. */
export const shieldSeconds = computed(() => shieldSecondsAt(levels.value.shield))
/** Has the player bought the shield at all? */
export const shieldUnlocked = computed(() => levels.value.shield > 0)

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
 * Award a track level outright, without charging for it.
 *
 * The progression-gift path, as opposed to `applyUpgrade`'s purchase path. It
 * exists because the game hands the shield over for beating stage 1: a player
 * who has just won their first fight has earned something they can SEE, and "a
 * button you did not have before" is a far better reason to start stage 2 than a
 * coin total they have not been shown how to spend.
 *
 * Never LOWERS a level — a gift may not undo a purchase — and returns whether it
 * actually changed anything, so the caller knows whether there is something to
 * announce.
 */
export const grantUpgrade = (id: UpgradeId, level: number): boolean => {
  const want = Math.max(0, Math.min(UPGRADES[id].maxLevel, level))
  if (levels.value[id] >= want) return false
  const next = { ...levels.value, [id]: want }
  levels.value = next
  setState(UPGRADES_KEY, next)
  // Flushed at once for the same reason a purchase is: it is a permanent change
  // to the save and the player was just shown that it happened.
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
  startSquadAt,
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
