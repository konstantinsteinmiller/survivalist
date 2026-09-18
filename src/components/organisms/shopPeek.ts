import type { UpgradeId } from '@/use/useUpgrades'

/**
 * ─── Which upgrade the peek plate shows ─────────────────────────────────────
 *
 * The result screen carries a full-width plate that shows ONE shop track with
 * its before → after numbers on it (`ShopPeek.vue`). This module decides which
 * one, and it is deliberately a pure function of data rather than a computed
 * inside the component: "the plate never changes under the player's finger" and
 * "the plate is not always the same track" are both rules about a sequence of
 * result screens, and a rule about a sequence can only be pinned by a test that
 * can run the sequence.
 *
 * ── Why a rotation rather than "the best buy" ──
 *
 * The honest single answer is always Firepower — the career study has it
 * winning by 5–14x against every other track at every budget. A plate that says
 * FIREPOWER on all ninety result screens of a career is an advert, and the
 * player stops reading adverts. The plate's job is not to give advice, it is to
 * make the player curious about a screen they have never opened, so it walks
 * the tracks they can actually afford, one per result screen, and the walk
 * starts on the strongest.
 *
 * ── Why affordability leads ──
 *
 * A teaser for something the wallet cannot pay for is a locked door. Every
 * affordable track is a purchase that can happen in the next two taps, so those
 * come first; only when the wallet can pay for NOTHING does the plate fall back
 * to the cheapest track on the board — which then reads as a goal ("this is
 * what the next coins are for"), which is the one thing a player with no money
 * still needs to be told.
 */

export interface PeekTrack {
  id: UpgradeId
  /** What the NEXT level of this track costs, at the level the player is on. */
  cost: number
  /** Capped tracks (`rate`, `range`, `shield`) drop out once they top out. */
  maxed: boolean
}

export interface PeekInput {
  tracks: readonly PeekTrack[]
  coins: number
  /**
   * Advances once per result screen — `resultsSeen` — so consecutive screens
   * show consecutive tracks. Deterministic on purpose: a random pick would
   * re-roll on every re-render and could show the same track three screens
   * running while never showing another.
   */
  rotation: number
  /**
   * The track already on the plate, if there is one. A plate that is on screen
   * stays put: the player may open the shop, buy the very track it is showing
   * and come back, and watching the plate jump to a different track at that
   * moment reads as the game taking the purchase back.
   */
  pinned?: UpgradeId | null
}

/**
 * The order the rotation walks.
 *
 * NOT `UPGRADE_ORDER`, which is the shop's own reading order (the four stats,
 * the two buttons, then the two things you have to go and find). This is the
 * order a first-time visitor should meet them in:
 *
 *   power     — the strongest track in the game and the easiest sentence:
 *               "everyone hits harder". It is what the first plate should say.
 *   squad     — the only one whose effect is visible before the shooting
 *               starts: the start line is simply bigger.
 *   rate, range, scavenge — the rest of the stats.
 *   grenade, shield — the two BUTTONS. Late, because a plate is two lines and
 *               "you now have a thing to press" needs the shop to explain it.
 *   rocket, gatling — last, because a level here is worth exactly zero until
 *               the player has found the weapon on the road, so it is the worst
 *               possible thing to teach the shop with.
 */
export const PEEK_ORDER: readonly UpgradeId[] = [
  'power', 'squad', 'rate', 'range', 'scavenge', 'grenade', 'shield',
  // The weapon tracks go last, all six of them: a level in one is worth
  // nothing until that weapon is found on a road, so a plate that opened on
  // Hoard Power would be selling a player something they cannot use yet.
  'rocket', 'gatling', 'grapeshot', 'dynamo', 'gravecall', 'hoard'
]

const peekRank = (id: UpgradeId): number => {
  const i = PEEK_ORDER.indexOf(id)
  // A track missing from the list above sorts last rather than first — a new
  // track nobody added here must not silently take over the plate.
  return i < 0 ? PEEK_ORDER.length : i
}

/** Non-negative modulo: `rotation` is a saved counter and must survive junk. */
const wrap = (n: number, len: number): number => ((Math.trunc(n) % len) + len) % len

/**
 * The track the plate should show, or `null` when the board has nothing left
 * to sell (which today cannot happen — three tracks are endless — and is
 * handled anyway so the plate hides itself instead of rendering an empty row).
 */
export const pickPeek = ({ tracks, coins, rotation, pinned }: PeekInput): UpgradeId | null => {
  const live = tracks.filter((t) => !t.maxed)
  if (live.length === 0) return null

  // Rule one, and it outranks everything below: a plate on screen stays put for
  // as long as the track it names is still buyable.
  if (pinned && live.some((t) => t.id === pinned)) return pinned

  const affordable = live
    .filter((t) => Number.isFinite(t.cost) && coins >= t.cost)
    .sort((a, b) => peekRank(a.id) - peekRank(b.id))
  if (affordable.length > 0) return affordable[wrap(rotation, affordable.length)]?.id ?? null

  // Nothing affordable: the nearest goal. Ties break on the same walk order, so
  // two equally-priced tracks resolve the same way every time.
  const cheapest = [...live]
    .sort((a, b) => a.cost - b.cost || peekRank(a.id) - peekRank(b.id))[0]
  return cheapest?.id ?? null
}
