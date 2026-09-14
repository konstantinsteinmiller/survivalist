// ─── Game-state field catalogue ─────────────────────────────────────────────
//
// Field names INSIDE the single `tower_state` blob (see `useTowerState.ts`).
// These are NOT separate localStorage keys — they are properties of the one
// persisted object — but they are still a contract with the player base:
// renaming any of them strands existing players' progress on the old field.
// Treat them as load-bearing constants.
//
// Everything is `ts_`-prefixed so `SaveMergePolicy.isPayloadKey` can allowlist
// the whole surface with a single prefix.

// ─── Meta progression ───────────────────────────────────────────────────────

/** Meta currency, banked at the end of every stage and spent on upgrades. */
export const COINS_KEY = 'ts_coins'
/** Lifetime coins earned — never decremented by spending. */
export const TOTAL_COINS_KEY = 'ts_total_coins'
/** Permanent upgrade levels: `{ squad, power, rate, scavenge }`. */
export const UPGRADES_KEY = 'ts_upgrades'
/** Deepest stage ever cleared — the headline progress number. */
export const BEST_STAGE_KEY = 'ts_best_stage'
/** Largest squad ever assembled in one run. */
export const BEST_SQUAD_KEY = 'ts_best_squad'
/** Lifetime runs started. */
export const RUNS_KEY = 'ts_runs'
/** Lifetime foes destroyed. */
export const TOTAL_KILLS_KEY = 'ts_total_kills'

// ─── The resumable run ──────────────────────────────────────────────────────

/**
 * The stage the player is currently on.
 *
 * A stage is short (~40 s) and its layout is regenerated deterministically from
 * this number alone, so there is nothing else to store: a reload — or opening
 * the game on another device after a cloud sync — drops the player at the START
 * of the stage they were running, never back at stage 1.
 */
export const STAGE_KEY = 'ts_stage'

/**
 * Stages the player has already lost on, as `{ [stage]: failCount }`.
 *
 * Drives the one-shot difficulty relief (`RETRY_HP_RELIEF`): every enemy on a
 * stage you have died to before has 20 % less health. It is deliberately
 * persisted rather than session-only — being stuck is a cross-session problem,
 * and a player who closes the app in frustration is exactly the one the relief
 * exists for.
 */
export const FAILED_STAGES_KEY = 'ts_failed_stages'

/**
 * How far the player has ever got on a stage they lost, as `{ [stage]: 0..1 }`.
 *
 * The result screen's near-miss line reads it: a wipe that says only "reached
 * stage 9" is an ending, and the same wipe next to "81 % — your best here is
 * 74 %" is an attempt that got further than the last one. A runner's retry rate
 * lives on that difference.
 *
 * Only LOSSES are recorded, and a clear deletes the stage's entry — the same
 * lifecycle as `FAILED_STAGES_KEY`, and for the same reason: the number exists
 * to describe an unfinished fight, and a stage that has been beaten has none.
 */
export const BEST_PROGRESS_KEY = 'ts_best_progress'

/**
 * The highest milestone stage already paid out (see `milestoneReward`).
 *
 * One number rather than a set: milestones are reached in order and a stage the
 * player has cleared cannot be un-cleared, so "the highest one paid" is the
 * whole of the state — and a monotonic number is the one shape that cannot pay
 * twice no matter which of two saves wins a cloud merge.
 */
export const MILESTONES_KEY = 'ts_milestones'

/**
 * Has the player been taught what the grenade button is?
 *
 * Set the first time a grenade is thrown — by the lesson on the first miniboss
 * (`game/grenadeTutorial.ts`) or by a player who worked the button out on their
 * own, which is the same fact and must not be taught twice.
 *
 * Written the instant it happens rather than at the end of the stage: somebody
 * who is taught this and then closes the tab has been taught, and meeting the
 * same full stop again on the next launch would read as the game not noticing.
 */
export const GRENADE_TAUGHT_KEY = 'ts_grenade_taught'

/**
 * The autobalancer's handicap: how many stages the player has cleared in a row.
 *
 * Every clear makes the next stage a little harder; a single loss resets it to
 * zero. It is the difference between a game that gets easier the better you
 * get at it and one that keeps pace with you — and because it resets on a loss,
 * it can never be the reason a player is stuck.
 */
export const CHALLENGE_KEY = 'ts_challenge'

/**
 * How the stage before this one actually went — `{ stage, perf }`, where `perf`
 * is the share of that road's yardstick the player's crowd actually reached.
 *
 * The counterpart to `FAILED_STAGES_KEY`, and it exists because that ledger can
 * only see the runs that ENDED. A beginner who scrapes through stage 1 with
 * four survivors has not failed anything, so nothing in the save knows they are
 * struggling — and the stage they meet next is the one built for the player who
 * finished it thirty strong. This is the only record of "cleared it, but
 * barely", and it is read exactly once, by the stage immediately after.
 *
 * Deliberately not a running average. It answers "how did the LAST one go",
 * which is the question a difficulty curve has to keep re-asking; a player who
 * has one bad stage and then finds their feet should not be carrying the bad
 * one around for the rest of the session.
 */
export const LAST_PERF_KEY = 'ts_last_perf'

/**
 * Consecutive stage wins the player finished WITHOUT claiming the `×3` reward.
 *
 * Persisted because it is a curve, not a session mood: the pressure to take the
 * reward has to survive the tab being closed, or the whole mechanism resets
 * itself every time somebody comes back tomorrow. Reset to 0 by a single claim,
 * and only ever incremented when the offer was genuinely available — see
 * `rewardDeclineFactor`.
 */
export const REWARD_DECLINE_KEY = 'ts_reward_declines'

// ─── Onboarding / one-shot UI nudges ────────────────────────────────────────

/** First-run onboarding consumed flag — retires the control hints for good. */
export const ONBOARDED_KEY = 'ts_onboarded'
/**
 * The very first thing a new player ever sees: the controls lightbox, held in
 * front of stage 1 until they have actually steered the squad for a second.
 *
 * Its own key rather than a reuse of `ONBOARDED_KEY`, and the reason is what
 * each one means. `ONBOARDED_KEY` retires the running control PRIMERS after a
 * cleared stage; this retires a one-time gate that ran before the game did.
 * Folding them together would show the lightbox again to every existing player
 * whose save predates it — a gate in front of stage 1 for someone on stage 20.
 */
export const TUTORIAL_KEY = 'ts_tutorial_seen'
/** One-time "you can afford an upgrade" spotlight on the shop button. */
export const SHOP_SPOTLIGHT_KEY = 'ts_shop_spotlight_seen'

/**
 * How many result screens the player has seen — death and stage-clear alike.
 *
 * Drives the one-off pointer at the upgrade button: a 500-player Poki fit test
 * had 64 % of sessions ending inside two minutes, and the shop is the thing that
 * makes the next run different from the last one. A player who never notices it
 * is playing the same losing run over and over. Shown on the first few screens
 * only — after that it is nagging.
 */
export const RESULTS_SEEN_KEY = 'ts_results_seen'

/**
 * When each active skill next comes off cooldown, as absolute epoch ms.
 *
 * Absolute timestamps, and stored in the save blob, because the cooldown is
 * meant to run ACROSS runs: a player who could reset a thirty-second clock by
 * dying and retrying would have no reason not to, and the skill would stop
 * being a decision about when to spend it.
 */
export const SKILL_READY_KEY = 'ts_skill_ready'

/**
 * Which skills have already played their reveal — the question mark coming off
 * a locked slot the first time the skill in it is owned (`claimReveal`).
 *
 * In the save rather than in memory because the one skill that is gifted (the
 * shield) is handed over while the skill bar is not mounted, and "was it owned
 * at boot" is the wrong question on a portal whose cloud save arrives after
 * boot. Absent on a save that predates it, which is read as "everything already
 * owned has been revealed".
 */
export const SKILL_REVEALED_KEY = 'ts_skills_revealed'
/**
 * The stage-4 boss's gift: one free Frost Nova, three stages before the skill is
 * the player's for good (`skillTrial`). Holds `'spent'` once it has been used and
 * is absent until then — the offer itself is read off the cleared stage, so a
 * save that crossed stage 4 before the trial existed still gets its one use.
 */
export const FROST_TRIAL_KEY = 'ts_frost_trial'
/**
 * One-time "the boss shielded and your fire stopped working" primer.
 *
 * Deliberately NOT covered by `ONBOARDED_KEY`. Onboarding retires after the
 * first cleared stage, which is fine for the primers that teach the controls —
 * but the boss guard is a rule that arrived after players already had saves,
 * and every one of them is `onboarded`. Without its own flag the mechanic most
 * likely to read as a bug is the one mechanic nobody is ever told about.
 */
export const GUARD_HINT_KEY = 'ts_guard_hint_seen'

/**
 * The lever-puzzle primer has been shown.
 *
 * Its own flag for exactly the reason the guard hint has one: the weapon puzzle
 * arrives on stage 4, by which time all but the slowest players are `onboarded`
 * and the ordinary hint ladder has switched itself off. It is also the one beat
 * in the game with no consequence for ignoring it — nothing kills you, nothing
 * blocks you, the prize simply goes past — so a player who never works out what
 * the posts at the rails are for will never be told by the road itself.
 *
 * Shown once, ever, and then never again: a bonus that nags is a bonus the
 * player learns to resent.
 */
export const LEVER_HINT_KEY = 'ts_lever_hint_seen'

/**
 * The rescue-cage primer has been shown, and the auto-shield one.
 *
 * Same footing as `LEVER_HINT_KEY` and for the same reason, doubled: both props
 * arrive past the onboarding ladder's reach (stage 2 and stage 8), both are pure
 * BONUS — nothing happens to a player who drives past one — and both look
 * enough like a supply crate at a glance that "another box" is the default
 * reading. A beat with no consequence for missing it is a beat the road cannot
 * teach on its own.
 *
 * Two keys rather than one because they are two different lessons arriving two
 * stages apart, and a single flag would let whichever appeared first silence
 * the other forever.
 */
export const CAGE_HINT_KEY = 'ts_cage_hint_seen'
export const BULWARK_HINT_KEY = 'ts_bulwark_hint_seen'

/**
 * The boss's gaze has been shown once, on the stage-1 or stage-2 boss.
 *
 * Set the moment the eye actually OPENS on one of those fights — not when the
 * attack is scheduled — because the teaching rule is "the stage-2 boss shows it
 * if the stage-1 boss never had the chance to" (see `GAZE_TEACH_LAST_STAGE`),
 * and a flag set on scheduling would mark the lesson delivered for a player
 * whose stage-1 boss died before its eye ever opened.
 *
 * Its own key rather than the guard hint's for the reason the cage and bulwark
 * primers each have one: two lessons, and a shared flag lets whichever arrives
 * first silence the other.
 */
export const GAZE_TAUGHT_KEY = 'ts_gaze_taught'

/**
 * The weapon the player chose on the handover into `WEAPON_PICK_STAGE`, as a
 * `WeaponId` — or absent, which is what makes the reveal appear.
 *
 * Persisted rather than held in the scene for two reasons. The loaner has to
 * survive a reload and a wipe: `startStage` re-arms it on every attempt at
 * that stage, and a player who dies with the rockets and retries WITHOUT them
 * would read the retry as a punishment. And the reveal is a one-time gift —
 * shown again to a player who already chose, it is a menu.
 */
export const WEAPON_PICK_KEY = 'ts_weapon_pick'

/**
 * The stage-1 boss has handed over its launcher (`BOSS_REWARD_STAGE`).
 *
 * Written the moment the reveal goes up, before the tap: the gift is given
 * whether or not the player touches the card. Persisted for the same reasons as
 * `WEAPON_PICK_KEY` — `startStage` re-arms the launcher on every attempt at the
 * next stage, so a reload or a wipe does not take back a reward already shown.
 */
export const BOSS_REWARD_KEY = 'ts_boss_reward'

// ─── The idle treasure chest ────────────────────────────────────────────────
//
// The HUD chest fills on WALL-CLOCK time, not on play time, which is the whole
// point of it: it is the reason to come back tomorrow. Both fields therefore
// live inside the `ts_` blob and ride the cloud save with everything else —
// a chest whose clock is per-device hands a player on two devices two
// allowances a day, and one that resets on a cache clear pays out again
// immediately. See `useTreasureChest.ts`.

/** Epoch ms of the last claim. Absolute, so it survives a reload the way the
 *  skill cooldowns do; 0/absent means "never claimed", which the composable
 *  reads as a chest that is already waiting for a first-time player. */
export const CHEST_KEY = 'ts_chest_at'
/**
 * The day's payout ledger, as `{ day: 'YYYY-MM-DD', coins: n }`.
 *
 * The DAY is stored with the total because the cap is per calendar day in the
 * PLAYER's timezone: without the date a returning player's stale total would
 * count against today, and with a UTC date the allowance would roll over at
 * 02:00 in Berlin. A ledger whose `day` is not today reads as zero.
 */
export const CHEST_DAY_KEY = 'ts_chest_day'

// ─── The daily expedition ───────────────────────────────────────────────────

/**
 * The `YYYYMMDD` of the last expedition the player STARTED, as an integer.
 *
 * One field, and it holds a day rather than a boolean, because "have you done
 * today's" is a comparison against today and not a flag somebody has to
 * remember to clear at midnight. Absent — or any number that is not today's —
 * reads as "not yet", which is also what a brand-new save and a corrupt value
 * read as; the failure mode is a free expedition, never a locked one.
 *
 * It is the day the run STARTED, not the day it was finished, and that is the
 * whole anti-farm design: the road is identical all day, so a flag written on
 * completion would let a player who is about to wipe reload the tab and take
 * the same road again with everything they learned from the first attempt. One
 * attempt is what makes it an event. See `useDailyExpedition.ts`.
 *
 * UTC, unlike `CHEST_DAY_KEY` two fields up, and the disagreement is
 * deliberate: the chest is a per-player ALLOWANCE and an allowance is measured
 * in the player's own day, while the expedition is a road every player alive at
 * the same moment is supposed to be running. See `expeditionDay`.
 *
 * Rides the same `ts_` blob as everything else, so a player who runs today's
 * expedition on the phone does not get a second one on the desktop — provided
 * the cloud blob is the side that wins the merge. See `SaveMergePolicy`: the
 * merge is whole-blob, so this field always travels with the save that won,
 * and it is deliberately NOT part of the score formula — a spent expedition is
 * not progress, and letting it break a tie would hand the win to whichever
 * device happened to open the game today.
 */
export const EXPEDITION_KEY = 'ts_expedition_day'

// ─── Leaderboard identity + posting bookkeeping ─────────────────────────────
//
// All six live inside the same `ts_` blob as everything else, so they ride the
// cloud save with the rest of the player's progress. That is the point: an id
// that does not survive a device change hands the same player a second row on
// the board, and a board row nobody can reclaim is the one kind of progress
// loss that cannot be repaired from the client.

/**
 * The player's stable leaderboard id — the primary key of their row.
 *
 * Mirrored to a standalone `survivalist_uid` localStorage entry OUTSIDE this
 * prefix (see `usePlayerIdentity.ts`), because a hydrate from an older cloud
 * blob can hand the game a save with no id in it and the game would mint a
 * second one.
 */
export const PLAYER_ID_KEY = 'ts_player_id'
/** A name the player chose for themselves. Highest precedence, never
 *  overwritten by a platform SDK or by the generated fallback. */
export const PLAYER_NAME_KEY = 'ts_player_name'
/**
 * The last display name a platform SDK handed us, REMEMBERED.
 *
 * Without it an offline session — or a portal that only exposes a name to
 * signed-in players — flips the board row back to a generated name and the
 * player's friends stop finding them.
 */
export const SDK_NAME_KEY = 'ts_sdk_name'
/** The generated `Runner418302`-style fallback, minted once and kept. Re-rolling
 *  it every session would relabel the row on every visit. */
export const ANON_NAME_KEY = 'ts_anon_name'
/**
 * The name the board row is currently labelled with, as far as we know.
 *
 * Compared against the resolved name after every run: when they differ the
 * client re-posts the SAME score purely to relabel the row. Without this the
 * only way a rename ever reaches the board is a new personal record.
 */
export const POSTED_NAME_KEY = 'ts_posted_name'
/**
 * The highest stage already sent to the leaderboard.
 *
 * The whole quota design rests on this: the client writes ONLY when the player
 * beats it. A board that is posted to at the end of every run costs one write
 * per ~40 s of play per player, which is the difference between a free tier and
 * a bill.
 */
export const SUBMITTED_STAGE_KEY = 'ts_submitted_stage'

// ─── User settings ──────────────────────────────────────────────────────────

export const SOUND_KEY = 'ts_user_sound_volume'
export const MUSIC_KEY = 'ts_user_music_volume'
export const LANGUAGE_KEY = 'ts_user_language'
export const DIFFICULTY_KEY = 'ts_user_difficulty'
export const MUSIC_TRACK_KEY = 'ts_user_music_track'
/** Mobile-only hard audio mute (boolean). On phones the OS volume rocker owns
 *  the device level and the Web Audio gain has no effect, so the on-screen mute
 *  is a silence toggle instead: suspend all audio + block new music/SFX. */
export const MOBILE_MUTE_KEY = 'ts_mobile_mute'
/**
 * Vibration on / off (boolean). Absent means ON — see `useHaptics.ts`.
 *
 * Stored as the OPT-OUT rather than the opt-in, and that is the whole reason
 * the default is expressed as "absent means on": haptics only exist on a
 * device that has both `navigator.vibrate` and a touch screen, and on that
 * device the buzz is the point. Persisting an explicit `true` for everyone
 * would put a field in every phone player's save blob to record a value they
 * never chose, and would strand the default: flipping the shipped default
 * later could no longer reach anyone who had already booted the game once.
 *
 * Rides the same `ts_` blob as every other setting, so a player who turns it
 * off on their phone finds it off on their tablet.
 */
export const HAPTICS_KEY = 'ts_user_haptics'
