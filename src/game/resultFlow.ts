// ─── Result-screen flow rules ───────────────────────────────────────────────
//
// The scene owns the reactive wiring; the RULES live here, pure and total, for
// the same reason `isGameplayLive` does: a decision about what a screen does to
// a player who has not touched it yet is a design contract, and a design
// contract that can only be asserted by mounting a canvas is a design contract
// nobody asserts.
//
// ─── What used to be here, and why it is gone ───────────────────────────────
//
// This file held `shouldAutoAdvance` / `AUTO_ADVANCE_THROUGH_STAGE`: the rule
// that decided when the result screen was allowed to press its own forward
// button. The argument for it was retention arithmetic — a stranger who meets a
// full stop leaves, so close the screen for them — and measured against real
// first-contact testers it was actively harmful:
//
//   • one tester watched the screen retry itself while he was still reading it;
//   • two more tapped the ×3 AFTER the screen had already moved on and reported
//     "no ad played" — the offer was gone, so the tap landed on the next stage;
//   • and a thumb that looks away for six seconds on a bus loses the offer the
//     same way, every time, with no way to tell that it happened.
//
// A button that presses itself cannot distinguish "this player has stalled" from
// "this player is reading", and the cost of guessing wrong is the game's primary
// income. So nothing presses a button for the player any more. What survives is
// the far cheaper half of the same idea: after a few seconds of silence the
// forward button starts to BOUNCE — an answer to "where do I go from here" that
// costs nothing when the guess is wrong.
//
// ─── Why this module still exists ───────────────────────────────────────────
//
// It would have been reasonable to delete it: one constant and one comparison is
// not much of a rule. It is kept because the two properties that make the bounce
// safe are exactly the two that were wrong about the countdown, and both are
// pure:
//
//   • it may not start EARLY — a button that starts moving the moment the screen
//     lands is decoration, and decoration on the control that ends the screen is
//     what made the countdown read as a deadline;
//   • it may not start AT ALL once the player has touched anything — they have
//     taken over, and a prompt aimed at someone who is already acting is the
//     nagging half of the feature we just removed.
//
// Both are assertable here without a canvas (`tests/game/resultFlow.test.ts`),
// which is the whole reason the countdown's rule lived here too.

/**
 * How long the result screen sits untouched before the forward button starts
 * to bounce, ms.
 *
 * Five seconds, which is the number the owner asked for and is also the only
 * defensible one: the ×3 sits one row above this button and carries a number to
 * read, the shop glyph beside it is the reason a player would stay on the screen
 * at all, and both of those have to be readable before anything starts moving.
 * The old countdown gave the same beat six seconds and then TOOK THE SCREEN
 * AWAY; five seconds and a bounce says the same "there is a way forward" without
 * spending anything if the player was simply reading.
 */
export const RESULT_BOUNCE_DELAY_MS = 5000

export interface GoBounceInputs {
  /** How long the result screen has been up, ms. */
  onScreenMs: number
  /**
   * Has the player touched anything since the screen appeared — a pointer
   * anywhere, any key?
   *
   * Latched rather than sampled: a single tap means the player is driving, and
   * the bounce must not come back later in the same screen's life. That latch is
   * the one behaviour that would make this feature feel like it was arguing with
   * the player, and it is the reason this takes a boolean rather than "is a
   * finger down right now".
   */
  sawInput: boolean
}

/**
 * Should the forward button be bouncing?
 *
 * Note what is NOT here, and is deliberately not here:
 *
 *   • the STAGE. The countdown needed it because closing a screen under a player
 *     who is spending coins takes a decision away from them; a bounce takes
 *     nothing away from anybody, so a stage-6 player gets the same nudge a
 *     stranger does and neither of them loses anything by ignoring it.
 *   • the WALLET. Same reason. The old rule re-armed itself when the player
 *     could not afford a single track, because the screen had become a dead end;
 *     a bounce does not need to know, because it is not making the decision.
 *   • an unclaimed ×3. The hard exception in the old rule — never close over the
 *     game's primary income — has nothing to answer here: the ×3 is a separate
 *     control that stays exactly where it was, and the bounce cannot press it
 *     or dismiss it.
 *
 * That is the whole argument for the change in one function signature: the old
 * rule needed three inputs because it was taking an action, and this one needs
 * none of them because it is only pointing.
 */
export const shouldBounceGo = (i: GoBounceInputs): boolean =>
  !i.sawInput && i.onScreenMs >= RESULT_BOUNCE_DELAY_MS

// ─── One payout gets one picture ────────────────────────────────────────────
//
// The coins a stage pays are added to the wallet the instant the result screen
// goes up, on every build. That is not negotiable and is not what this decides:
// a payment that waits on an ad is a payment held hostage, and the number in the
// badge moves whether or not anything is drawn.
//
// What this decides is where the PICTURE goes — the burst of coins that flies
// from the screen to the wallet — and it has to, because three separate things
// now want to draw the same transaction:
//
//   THE CROWD      every survivor turning into a coin on the road when the boss
//                  falls (`cashOutSquad`), which is the fix for the handover
//                  reading as a loss;
//   THE CARD       the result screen's own coin line bursting to the wallet;
//   THE ×3         the rewarded video's bonus, which has to be visibly paid or
//                  the button did not sell anything.
//
// Two of them firing for one payout reads as being paid twice, and the ×3 firing
// for nothing reads as a video that did not work. The rule is small enough to
// state in one line and easy enough to get wrong that it is worth pinning:
//
//   • if the crowd already flew, the card draws NOTHING — the coins have been
//     seen leaving, and the only thing still owed a picture is the ×3's extra;
//   • otherwise, if a ×3 is genuinely on offer, the card's burst is HELD so the
//     claim can throw the run's coins and the bonus together, as one number,
//     which is the number the button was selling;
//   • otherwise it throws now.

/** What the result card does with the coins it has just banked. */
export interface CardPayoutView {
  /** Coins to burst immediately, as the screen opens. */
  now: number
  /** Coins held back for a successful ×3 claim to throw along with its bonus. */
  owed: number
}

export interface CardPayoutInputs {
  /** Is the ×3 button actually live on this screen — real provider, real
   *  inventory, not yet claimed? See `rewardOfferLive`. */
  rewardOfferLive: boolean
  /** Did the crowd already convert into coins on the road? See
   *  `convertSquadToCoins`. */
  squadCashed: boolean
}

export const cardPayout = (total: number, i: CardPayoutInputs): CardPayoutView => {
  if (total <= 0) return { now: 0, owed: 0 }
  if (i.squadCashed) return { now: 0, owed: 0 }
  if (i.rewardOfferLive) return { now: 0, owed: total }
  return { now: total, owed: 0 }
}
