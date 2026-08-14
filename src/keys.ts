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
