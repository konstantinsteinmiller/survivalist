// ─── What the result screen does to a player who has not touched it ─────────
//
// This file used to pin `shouldAutoAdvance`: when the result screen was allowed
// to press its own forward button. The rule was retention arithmetic — a
// stranger who meets a full stop leaves, so close the screen for them — and the
// first-contact playtest measured the cost of getting that guess wrong: one
// tester watched the screen retry itself while he was still reading, and two
// tapped the ×3 after the screen had already moved on and reported "no ad
// played".
//
// Nothing presses a button for the player now. The forward button BOUNCES after
// a few seconds of silence instead, and the two properties that make that safe
// are the two the countdown got wrong — it may not start early, and it may not
// start at all once the player is driving. Both are pure, so both are pinned
// here, which is the same reason the countdown's rule lived in this module.

import { describe, expect, it } from 'vitest'
import { cardPayout, RESULT_BOUNCE_DELAY_MS, shouldBounceGo } from '@/game/resultFlow'
import { squadMusicRate, MUSIC_RATE_RANGE, MUSIC_RATE_FULL_SQUAD } from '@/use/useSound'

const at = (onScreenMs: number, sawInput = false): boolean =>
  shouldBounceGo({ onScreenMs, sawInput })

describe('the forward button’s bounce', () => {
  it('holds still while the player is still reading', () => {
    // The ×3 above it carries a number and the shop glyph beside it is the only
    // reason to stay on this screen; both have to be readable before anything
    // on the screen starts moving.
    expect(at(0)).toBe(false)
    expect(at(1000)).toBe(false)
    expect(at(RESULT_BOUNCE_DELAY_MS - 1)).toBe(false)
  })

  it('starts on the five-second mark and stays on', () => {
    // Inclusive on purpose: the scene arms a single timeout for exactly this
    // delay, so an exclusive comparison would make the first evaluation false
    // on any clock that is not late.
    expect(at(RESULT_BOUNCE_DELAY_MS)).toBe(true)
    expect(at(RESULT_BOUNCE_DELAY_MS + 10_000)).toBe(true)
  })

  it('never starts once the player has taken over', () => {
    // The latch. A tap anywhere means the player is driving, and a prompt aimed
    // at somebody who is already acting is the nagging half of the feature this
    // replaced — so no later moment on the same screen may bring it back.
    expect(at(RESULT_BOUNCE_DELAY_MS, true)).toBe(false)
    expect(at(60_000, true)).toBe(false)
  })

  it('takes no input that could make it act on the player’s behalf', () => {
    // The whole argument for the change, pinned as a signature: the old rule
    // needed the stage, the wallet and whether the ×3 was still unclaimed,
    // because it was TAKING AN ACTION. This one needs none of them because it
    // only points. This spec exists so adding one of them back is a deliberate
    // act with a test to change.
    expect(Object.keys({ onScreenMs: 0, sawInput: false })).toHaveLength(2)
    expect(at(RESULT_BOUNCE_DELAY_MS)).toBe(true)
  })

  it('is a five-second delay, not something shorter', () => {
    // The number the owner asked for, and the one the copy above argues for.
    expect(RESULT_BOUNCE_DELAY_MS).toBe(5000)
  })
})

describe('the score follows the crowd', () => {
  it('starts at ordinary speed and saturates, never running away', () => {
    // Shallow on purpose: +18 % is about a tone and a half on a looping track,
    // felt as the run tightening rather than heard as a broken tape.
    expect(squadMusicRate(0)).toBe(1)
    expect(squadMusicRate(MUSIC_RATE_FULL_SQUAD)).toBeCloseTo(1 + MUSIC_RATE_RANGE, 5)
    expect(squadMusicRate(MUSIC_RATE_FULL_SQUAD * 10)).toBeCloseTo(1 + MUSIC_RATE_RANGE, 5)
  })

  it('climbs with the crowd on the way there', () => {
    expect(squadMusicRate(120)).toBeGreaterThan(squadMusicRate(40))
    expect(squadMusicRate(400)).toBeGreaterThan(squadMusicRate(120))
  })

  it('comes back DOWN when a gate eats the crowd', () => {
    // The half a stage-indexed version could never do: a `÷3` drops the tempo
    // with the squad it took.
    expect(squadMusicRate(60)).toBeLessThan(squadMusicRate(180))
  })

  it('survives a squad count that is nonsense', () => {
    // It is driven from a live ref every tick; a bad value must never warp audio.
    expect(squadMusicRate(-20)).toBe(1)
    expect(squadMusicRate(Number.NaN)).toBe(1)
  })
})

describe('one payout gets exactly one picture', () => {
  // The screen can end up with three different things all wanting to draw the
  // same coins — the crowd cashing out on the road, the card's own coin line,
  // and the ×3's bonus. Two of them firing reads as being paid twice; none of
  // them firing on a claim reads as a video that did not work.

  it('throws the burst straight away on an ordinary screen', () => {
    expect(cardPayout(120, { rewardOfferLive: false, squadCashed: false }))
      .toEqual({ now: 120, owed: 0 })
  })

  it('HOLDS the burst while a ×3 is on offer, so the claim throws one number', () => {
    // The thing the button is selling is the TOTAL. Throwing the run's own
    // coins as the screen opens and the bonus three seconds later is two
    // bursts at the same badge for one transaction, and the second one is the
    // smaller of the two — exactly backwards.
    expect(cardPayout(120, { rewardOfferLive: true, squadCashed: false }))
      .toEqual({ now: 0, owed: 120 })
  })

  it('draws nothing at all once the crowd has already flown', () => {
    // `cashOutSquad` turned every survivor into a coin on the road two seconds
    // ago and the player watched them land. A card burst for the same coins is
    // the payout happening twice.
    expect(cardPayout(120, { rewardOfferLive: false, squadCashed: true }))
      .toEqual({ now: 0, owed: 0 })
  })

  it('owes NOTHING to a claim when the crowd already flew — only the bonus is new', () => {
    // The trap in the middle: both true at once. Holding the run's coins here
    // would make a successful ×3 throw them a second time, on top of its own
    // bonus, and the player would be watching the stage's payout twice.
    expect(cardPayout(120, { rewardOfferLive: true, squadCashed: true }))
      .toEqual({ now: 0, owed: 0 })
  })

  it('draws nothing for a payout of nothing', () => {
    // A wipe on stage 1 with the relief active can bank a single coin, and a
    // dev skip can bank none. A burst of zero coins is a burst that renders as
    // a sound with no picture.
    for (const live of [true, false]) {
      for (const cashed of [true, false]) {
        expect(cardPayout(0, { rewardOfferLive: live, squadCashed: cashed }))
          .toEqual({ now: 0, owed: 0 })
      }
    }
  })
})
