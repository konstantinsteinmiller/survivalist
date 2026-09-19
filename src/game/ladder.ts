import { WEAPON_PICK_OFFER_STAGE, stageHasWeapon, weaponForStage, type WeaponId } from '@/game/weapons'
import { armoryAtFor } from '@/game/armory'

/**
 * ─── The gift ladder ────────────────────────────────────────────────────────
 *
 * What the opening stages hand over, in order, and — the half that matters —
 * what they PROMISE next. A goal two stages ahead is the cheapest reason there
 * is to start the next stage, and until this existed the game had exactly one
 * gift (the shield, on the stage-1 banner) and never once said what was coming.
 *
 *   stage 1 cleared → the boss's launcher, as a reveal (`BOSS_REWARD_STAGE`);
 *                     the HUD chip says: choose a weapon, next stage
 *   stage 2 cleared → the reveal: launcher or gatling, for stage 3
 *   stage 3 cleared → the shield, and the banner says: a weapon on the road at 4
 *   stage 4 cleared → ONE free Frost Nova, a taste of the skill three stages early
 *   stage 4+        → the next puzzle stage, named by the weapon its box holds —
 *                     or the next SKILL, when one opens first (Frost Nova on 7,
 *                     the Decoy Flare on 10)
 *
 * One module so the banner, the HUD chip and the scene cannot disagree about
 * what is next. Pure functions of the stage number, like the road itself.
 */

/** The shield arrives with the banner that opens this stage. */
export const SHIELD_GIFT_STAGE = 4

/**
 * ─── The two late skills ────────────────────────────────────────────────────
 *
 * Earned by reaching them rather than bought: the shop sells numbers, and these
 * are verbs the late fights are built to be answered with. Owned from the
 * OPENING of their stage, like the shield — i.e. once the stage before it has
 * been cleared (`useSkills` reads the cleared stage off the save).
 *
 * The frost trial is the stage-4 boss's own gift: one use, handed over with the
 * stage after it, so the first time a player owns the button for good they
 * already know what it does. See `skillTrial`.
 */
export const FROST_TRIAL_STAGE = 5
export const FROST_GIFT_STAGE = 7
export const DECOY_GIFT_STAGE = 10

/** The skills the ladder can promise, in the order they open. */
export type LadderSkill = 'frost' | 'decoy'
const SKILL_GIFTS: ReadonlyArray<{ skill: LadderSkill; atStage: number; icon: LadderIcon }> = [
  { skill: 'frost', atStage: FROST_GIFT_STAGE, icon: 'snowflake' },
  { skill: 'decoy', atStage: DECOY_GIFT_STAGE, icon: 'flare' }
]

export type LadderIcon = 'gift' | 'shield' | 'snowflake' | 'flare' | WeaponId

export interface Unlock {
  /** The stage whose OPENING the unlock lands on. */
  atStage: number
  icon: LadderIcon
  /** Which i18n label describes it. */
  kind: 'weaponPick' | 'shield' | 'weapon' | 'skill'
  weapon?: WeaponId
  skill?: LadderSkill
}

/** The next puzzle stage strictly after `stage`, if any within `horizon`. */
export const nextWeaponStage = (stage: number, horizon = 400): number | null => {
  for (let s = Math.max(1, Math.floor(stage)) + 1; s <= stage + horizon; s++) {
    if (stageHasWeapon(s)) return s
  }
  return null
}

/**
 * What the player is playing TOWARD while on `stage`.
 *
 * `null` past the horizon only — on the authored road there is always a next
 * box, because the puzzle runs every other stage forever.
 */
export const nextUnlock = (stage: number): Unlock | null => {
  const s = Math.max(1, Math.floor(stage))
  // The choice is offered at the first boss's kill now
  // (`WEAPON_PICK_OFFER_STAGE`), so stage 1 is the one road that promises it.
  // …and since the four-lane split (`game/armory.ts`) it stands ON stage 1's
  // road, right before the boss: the promise is for THIS stage.
  if (s < WEAPON_PICK_OFFER_STAGE) {
    return { atStage: armoryAtFor(s) !== null ? s : WEAPON_PICK_OFFER_STAGE, icon: 'gift', kind: 'weaponPick' }
  }
  if (s < SHIELD_GIFT_STAGE) {
    return { atStage: SHIELD_GIFT_STAGE, icon: 'shield', kind: 'shield' }
  }
  const at = nextWeaponStage(s)
  // A skill outranks a weapon box on the same stage, and wins the chip whenever
  // it is sooner: a box is a loaner for one road, a skill is a button for good.
  const gift = SKILL_GIFTS.find((g) => g.atStage > s)
  if (gift && (at === null || gift.atStage <= at)) {
    return { atStage: gift.atStage, icon: gift.icon, kind: 'skill', skill: gift.skill }
  }
  if (at === null) return null
  const weapon = weaponForStage(at)
  return { atStage: at, icon: weapon, kind: 'weapon', weapon }
}

/** Stages between here and the unlock: 1 means "next stage". */
export const stagesAway = (stage: number, unlock: Unlock): number =>
  Math.max(1, unlock.atStage - Math.floor(stage))
