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
 * The autobalancer's handicap: how many stages the player has cleared in a row.
 *
 * Every clear makes the next stage a little harder; a single loss resets it to
 * zero. It is the difference between a game that gets easier the better you
 * get at it and one that keeps pace with you — and because it resets on a loss,
 * it can never be the reason a player is stuck.
 */
export const CHALLENGE_KEY = 'ts_challenge'

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
 * One-time "the boss shielded and your fire stopped working" primer.
 *
 * Deliberately NOT covered by `ONBOARDED_KEY`. Onboarding retires after the
 * first cleared stage, which is fine for the primers that teach the controls —
 * but the boss guard is a rule that arrived after players already had saves,
 * and every one of them is `onboarded`. Without its own flag the mechanic most
 * likely to read as a bug is the one mechanic nobody is ever told about.
 */
export const GUARD_HINT_KEY = 'ts_guard_hint_seen'

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
