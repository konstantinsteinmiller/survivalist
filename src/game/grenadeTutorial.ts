// ─── Teaching the grenade, once, on the first miniboss ──────────────────────
//
// Two playtests found the same hole. The skill row is four buttons at the
// bottom of the road and nobody works out that they are buttons: one tester
// discovered it at stage 5 from a cooldown number and said "nothing told me
// these were tap-to-use — I've been ignoring active abilities this whole run",
// another tapped "around them" without ever learning what they were, and a
// third never worked out what the two locked slots were for. The shield is the
// answer to the boss that walled the best player in the group, and the players
// who most needed it were the ones least likely to have found it.
//
// A pill saying "these are buttons" would be one more thing nobody reads. So
// the game stops instead, once, at the first moment a skill is genuinely the
// right answer, and does not start again until the player has pressed it.
//
// ─── Why the first miniboss ─────────────────────────────────────────────────
//
// The FIRST one, literally — stage 1's elite, at 88 % of the road. It is the
// first thing in the game with a health bar that is not the end boss, it is the
// beat that replaced stage 1's boss, and it is therefore the climax of the only
// stage the player has met. Big, obviously dangerous, standing still long
// enough to be aimed at, and the hardest thing they have been shown.
//
// It is also long enough to teach on without being re-priced: 258 hp, and 4.2
// to 5.3 s against every policy in the balance suite. A threat the player kills
// by accident before they have registered it cannot teach anything, and this
// one cannot be. See `GRENADE_TUTORIAL_HP_MUL` for the measurements, and for
// the knob any other road would need.
//
// ─── The shape of it ────────────────────────────────────────────────────────
//
//   1. the miniboss appears, and time drops to a crawl for `SLOWMO_S`;
//   2. if the grenade still has not been pressed, time stops dead;
//   3. the grenade's cooldown is cleared, so the one instruction on screen is
//      never also refused;
//   4. a lightbox dims everything except the grenade button, with an arrow
//      above it and an arrow below it;
//   5. pressing it resumes the world at full speed, and the flag is written so
//      this never happens again.
//
// The player is never blocked from playing — the thing they are told to press
// is the thing that clears the block, and it is a thing they wanted to press.

/**
 * Is the whole feature on?
 *
 * A flag because this is the most intrusive thing the game does to a first-time
 * player — it takes the controls away until they do one specific act — and a
 * teaching moment that turns out to annoy people has to be removable without
 * unpicking the sim, the scene and the renderer. Everything below reads it.
 */
export const GRENADE_TUTORIAL = true

/**
 * The stage whose FIRST miniboss teaches it.
 *
 * ONE, and this was wrong at first. It said two, on the belief that “stage 2 is
 * the first road that carries a miniboss at all” — which is simply false.
 * `placeMinibosses` gives stage 1 exactly one elite, the `'tutorial'` rank, at
 * 88 % of the road: it is the beat that REPLACED stage 1's boss and it is the
 * first thing with a health bar a player ever meets. Teaching on stage 2 put
 * the lesson on the second miniboss and let the first one go by unanswered,
 * which is the one place it had to land.
 *
 * It is also the better fight by every measure that matters here. The stage-1
 * elite is the climax of the stage a stranger is playing right now, so the
 * grenade arrives as the answer to the hardest thing they have been shown —
 * not as a fourth idea layered onto a road they are still reading. And it is
 * already long enough to teach on: see `GRENADE_TUTORIAL_HP_MUL`.
 */
export const GRENADE_TUTORIAL_STAGE = 1

/**
 * How long the world crawls before it stops, seconds.
 *
 * Long enough to read as "something just happened, look" and short enough that
 * a player who already knows what the button is can throw one and never see the
 * full stop at all — which is the point: this should feel like a beat to
 * somebody who does not need it, and a hand on the shoulder to somebody who
 * does.
 */
export const GRENADE_TUTORIAL_SLOWMO_S = 3

/** How slowly the world runs during that crawl. Not zero — a frozen world reads
 *  as a hang, and the whole cue is that the miniboss is still coming. */
export const GRENADE_TUTORIAL_SCALE = 0.12

/**
 * How close the teaching elite has to be before the world slows for it, world
 * units ahead of the crowd.
 *
 * ⚠️ THIS NUMBER IS LOAD-BEARING, and the first version did not have it. The
 * lesson used to start the moment the elite SPAWNED, on the argument that "the
 * cue has to arrive with the thing it is about" — and an elite spawns off the
 * top of the screen, forty units out. Driven in a browser, the result was a
 * softlock: the world stopped, the lightbox went up, the arrows pointed at the
 * grenade, and pressing it did nothing at all, because `grenadeTarget` refuses
 * a throw with nothing in range and correctly found nothing in range. The one
 * instruction on screen was also the one act the game would not accept. The
 * player's only way out was to reload.
 *
 * So the lesson waits for the elite to be a thing on the road rather than a
 * chevron at the top of it. This sits INSIDE `grenadeTarget`'s own ±26 window,
 * which is what makes the demanded act guaranteed to be possible — and the
 * throw is belt-and-braced on top of that (see `teachingGrenade` there), because
 * a tutorial that can refuse its own instruction must be impossible by
 * construction and not merely by arithmetic.
 *
 * TWELVE, and the number comes off the camera rather than off taste. The frame
 * fits `VIEW_HEIGHT` (19) world units with the crowd at `CROWD_SCREEN_Y` (0.72)
 * down the screen, so a phone shows about 13.7 units of road AHEAD of the squad
 * — and on a wide screen, where the lane's width wins the fit, rather more. The
 * first attempt at this used 20, which was still above the top edge: measured in
 * a browser, the world stopped with the off-screen chevron marker on screen and
 * the miniboss itself nowhere. Twelve is on screen on every ratio the game
 * ships on, with room for the health bar above it.
 */
export const GRENADE_TUTORIAL_RANGE = 12

/**
 * What the tutorial miniboss's health is multiplied by — and why it is ONE.
 *
 * The brief was that the miniboss should survive about three seconds of
 * ordinary fire: a threat the player deletes by accident before they have
 * registered it cannot teach anything. On stage 2 that needed a ×4, because
 * the stage-2 elite carries 64 hp and dies in 0.65–0.93 s against every policy.
 *
 * The stage-1 elite needs nothing. It already carries `MINIBOSS_TUTORIAL`
 * (= `MINIBOSS_FIRST × 4`), which is a PREMIUM rather than a discount, and
 * measured through `tests/game/tutorialPump.test.ts` on seeds 1000/8919/16838
 * it is 258 hp and lives for:
 *
 *   policy      dps at the elite    time to kill
 *   optimal          348               4.20 s
 *   good              87               5.30 s
 *   average           39               5.32 s
 *   careless          41               4.67 s
 *
 * — comfortably past the brief, on the fight the lesson now teaches on. So the
 * multiplier is 1 and the tuning is the one the road already had.
 *
 * The knob STAYS, at 1, rather than being deleted: it is the lever that makes
 * `GRENADE_TUTORIAL_STAGE` safe to move. Point the lesson at a road whose first
 * elite is an ordinary one and the fight collapses back to under a second, and
 * this is the single number that fixes it. Deleting it would make that a silent
 * regression instead of a one-line change.
 *
 * Whatever it is set to, it is applied ONLY to the one miniboss that teaches,
 * and only while the feature is on and the lesson is unlearnt — every other
 * elite on every other road keeps the number the balance study was run against.
 * A tutorial that re-prices the game it is teaching teaches the wrong game.
 */
export const GRENADE_TUTORIAL_HP_MUL = 1

/** Inputs for the one rule worth asserting without a canvas. */
export interface GrenadeTutorialInputs {
  /** The stage being played. */
  stage: number
  /** Has the player already been taught — or already thrown one? */
  taught: boolean
  /** Is this a campaign run? The daily expedition is not a first session. */
  expedition: boolean
}

/**
 * Should this stage's first miniboss stop the world?
 *
 * Pure and total, so the answer can be asserted in a spec rather than inferred
 * from a screenshot. Note what is NOT here: whether the player owns the
 * grenade. They always do — it is the one skill the game starts you with — and
 * making that a condition would be inventing a state that cannot happen.
 */
export const grenadeTutorialDue = (i: GrenadeTutorialInputs): boolean =>
  GRENADE_TUTORIAL
  && !i.taught
  && !i.expedition
  && i.stage === GRENADE_TUTORIAL_STAGE
