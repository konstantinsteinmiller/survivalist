// English source bundle. Single source of truth for translation keys — every
// new player-facing string gets a key here first; the per-language files in
// this folder mirror the shape. Vite ships each non-English locale as its own
// lazy chunk (see `src/i18n/index.ts`).
export default {
  'gameName': 'Survivalist',
  'cancel': 'Cancel',
  'close': 'Close',
  'ok': 'Ok',
  'continue': 'Continue',
  'tapToContinue': 'Tap to continue',
  'clickToContinue': 'Click to continue',
  'rewards': 'REWARDS',
  'tip': 'Tip',
  'crazyGamesOnly': 'This game is only available on',

  // ─── Shared UI labels ─────────────────────────────────────────────────────
  //
  // NOT DEAD KEYS. The icon pass replaced button captions with glyphs
  // (skip-forward, replay, the shop cart), and a glyph has no accessible name
  // of its own — so these survive as the `aria-label` on icon-only controls.
  // They are read aloud, not seen, which is exactly why nothing on screen will
  // tell you when one goes missing.
  //
  // Only the generic names with no existing home live here. A control whose
  // action the game already names uses THAT key instead — the settings cog is
  // `options.title`, the cart is `upgrades.title`, the trophy is
  // `leaderboard.title` — so no word is translated twice. See the fallback map
  // in `FHudButton.vue`.
  'ui': {
    'next': 'Next',
    'replay': 'Replay',
    'back': 'Back',
    'play': 'Play',
    'pause': 'Pause',
    'menu': 'Menu',
    'home': 'Home',
    'info': 'Info'
  },

  // ─── HUD ──────────────────────────────────────────────────────────────────
  'hud': {
    'stage': 'Stage {n}',
    'best': 'Best {n}',
    'boss': 'Boss',
    'miniboss': 'Miniboss',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Stages to the next bonus',
    // Live fire-rate chip. It sits in a HUD pill next to a number, so every
    // locale keeps this to ~6 characters.
    'fireRate': 'Rate',
    'incoming': 'Incoming attack!',
    'dodge': 'Dodge',
    'getIn': 'Get in',
    'holdStill': 'Hold still',
    // ─── The round-number badge ─────────────────────────────────────────────
    // A gold pill under the squad chip for 1.4 s when the crowd doubles past a
    // rung of the milestone ladder (25 / 50 / 100 / 200 / 400 …). It sits in a
    // HUD corner beside a number that is already on screen, so it must stay to
    // roughly TWO SHORT WORDS in every language — a phrase that wraps here
    // covers the progress rail. `{n}` is the milestone itself; it is the thing
    // the player is meant to remember and say out loud, so keep it in the
    // string rather than replacing it with a pronoun.
    'milestone': '{n} strong!',
    // ─── The weapon tag ─────────────────────────────────────────────────────
    // Three of these four are `aria-label`s on a badge that is otherwise a
    // glyph and two dots, so they are READ ALOUD and never seen. Translate for
    // clarity, not for brevity — nothing on screen depends on their length.
    // `{n}` / `{total}` are the levers pulled and the levers there are.
    'weaponActive': '{name} ready',
    // Both guns at once — stage 2's gatling over the first boss's launcher.
    'weaponsActive': '{a} + {b} ready',
    'weaponLocked': '{name} locked — {n} of {total} levers shot',
    // Stage 2's free box, which has no levers to count. It replaces the locked
    // wording there: a badge saying "locked — 0 of 0 levers shot" over the one
    // box in the game with no lock was the HUD contradicting the road.
    'weaponGift': '{name} ahead — free, no levers',
    // …and the ONE piece of weapon-tag copy that is actually SEEN. It sits in
    // the slot the active badge fills with "×2.5", roughly five characters
    // wide before the pill starts pushing into the progress rail, so this has
    // to be one SHORT word — the shoutiest available synonym for "no cost",
    // not a sentence. If a language has no such word, prefer its shortest
    // "gift"/"free" noun over a correct phrase that wraps.
    'weaponFree': 'FREE'
  },

  // ─── The per-stage weapons ────────────────────────────────────────────────
  // Shown on a HUD badge roughly 8 characters wide before it ellipsises, so
  // prefer the SHORT name a player would say out loud ("Gatling", "Rockets")
  // over the full mechanical one. The glyph beside it already says what it is.
  'weapons': {
    'rocket': 'Rocket Launcher',
    'gatling': 'Gatling Gun'
  },

  // ─── The mid-run weapon offer ─────────────────────────────────────────────
  //
  // Two strings for a control that is otherwise two drawings — see
  // `AdWeaponOffer.vue`. `confirm` is the pill that appears over the armed chip
  // and is the only one of the pair a player SEES, so it has to fit above a
  // 2.5 rem button on a 320 px phone: translate it as a button caption, not as
  // a sentence. `available` is the `aria-label`, read aloud and never drawn, so
  // it is allowed to be a full phrase — and it names the weapon, which is the
  // half a screen reader cannot get from the glyph.
  //
  // `{weapon}` interpolates `weapons.rocket` / `weapons.gatling`. It is phrased
  // WITHOUT an article on purpose: the two weapons do not share a gender in
  // half the languages here, and "un {weapon}" would be wrong for one of them
  // in every one of those.
  'offer': {
    'confirm': 'Watch ad',
    'available': 'Watch a video for a free {weapon}'
  },

  // ─── Control hints ────────────────────────────────────────────────────────
  // Each has a touch and a pointer phrasing — a wrong verb reads as a bug.
  // These render in a single pill at the top of a phone screen: keep every
  // translation short and punchy rather than literal.
  // ─── First-run controls lightbox ──────────────────────────────────────────
  // Shown ONCE, over a frozen road, under an animated swipe/pointer glyph. It
  // is the only instruction in the game a player cannot dismiss without doing,
  // so it has to fit on one line of a 320 px phone: an instruction, not a
  // sentence. Translate for brevity over literalness.
  'tutorial': {
    'touch': 'Swipe to move your squad',
    'desktop': 'Move the mouse to steer your squad'
  },
  'hints': {
    'move': {
      'touch': 'Tap to move',
      'desktop': 'Click to move'
    },
    'divider': {
      'touch': 'Never touch the pillar between gates',
      'desktop': 'Never touch the pillar between gates'
    },
    // Two crate flavours now, so the hint has to name the colour.
    'crate': {
      'touch': 'Green crates make everyone hit harder',
      'desktop': 'Green crates make everyone hit harder'
    },
    'rate': {
      'touch': 'Blue crates make everyone shoot faster',
      'desktop': 'Blue crates make everyone shoot faster'
    },
    // The weapon puzzle, shown once ever, while an unshot lever is on screen.
    // The two things it must carry are BOTH and WHERE: a player who shoots one
    // post and stops has done nothing, and a player looking down the middle of
    // the road will never find either. Keep it to one line on a 320 px phone.
    'lever': {
      'touch': 'Shoot BOTH levers at the road edges — they open the weapon box',
      'desktop': 'Shoot BOTH levers at the road edges — they open the weapon box'
    },
    // The rescue cage, shown once ever, while one is still ahead of the crowd.
    // The word that has to survive translation is FREE/JOIN: at a glance a cage
    // is another box on the shoulder, and the whole reason to cross the road for
    // it is that it pays PEOPLE rather than a stat.
    'cage': {
      'touch': 'Shoot cages — the prisoners join your squad',
      'desktop': 'Shoot cages — the prisoners join your squad'
    },
    // The auto-shield box, same terms. It must carry that the protection WAITS —
    // a player who reads "shield" expects the three-second skill they already
    // own and will spend the detour expecting a timer.
    'shieldBox': {
      'touch': 'Shield box — it waits, then blocks one big hit',
      'desktop': 'Shield box — it waits, then blocks one big hit'
    }
  },

  // ─── Result / stage summary ───────────────────────────────────────────────
  'flow': {
    // The handover, which used to read as LOSING the squad: five testers saw
    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd
    // is cashed into coins on screen now, and this names it. {n} = survivors.
    'squadCashed': '{n} survivors cashed in',
    'unlocked': 'Unlocked!',
    // ─── The second wind ──────────────────────────────────────────────────
    //
    // Read under the boss rail for three seconds when a wiped crowd is handed
    // back mid-run. It replaced a one-word "Rally!" on the mid-screen banner,
    // which named the mechanic without explaining it — and an unexplained gift
    // reads as a bug the player happened to profit from.
    //
    // Two lines, and they do different jobs: the first says somebody saved
    // you, the second says what you got. Keep the first short enough to sit on
    // one line on a phone; it wraps rather than overflowing, but a wrapped
    // headline costs a beat of reading time in the middle of a fight.
    'guardian': 'A guardian angel saved you!',
    'guardianSub': '{n} survivors are back',
    // The promise on the between-stages banner. `{label}` is the unlock's name
    // (a weapon, the shield, "choose a weapon") and `{when}` is one of the
    // `ladder.*` timing phrases below — two interpolations so the sentence
    // order stays the locale's own.
    'next': 'Next: {label} · {when}'
  },
  // ─── The gift ladder ──────────────────────────────────────────────────────
  // The HUD chip and the banner name what is coming and when. Both render in a
  // pill beside the stage number, so keep them to two or three short words.
  'ladder': {
    'weaponPick': 'Choose a weapon',
    'nextStage': 'next stage',
    'stagesAway': 'in {n} stages'
  },
  // ─── The weapon choice ────────────────────────────────────────────────────
  // A two-card reveal on the handover into stage 3. The title rides the iron
  // ribbon; the perks are one line each beside a glyph on a card ~45 % of a
  // phone's width, so translate them as headlines rather than sentences.
  'weaponPick': {
    'title': 'Choose your weapon',
    'subtitle': 'Yours for Stage {n}. More are waiting on the road.',
    'take': 'Take it',
    'rocket': {
      'a': 'Homing salvo',
      'b': 'Blast damage'
    },
    'gatling': {
      'a': 'Twice the fire rate',
      'b': 'Pumps gates faster'
    }
  },
  // ─── The first boss's gift ────────────────────────────────────────────────
  // A one-card reveal the moment the stage-1 boss dies: the launcher it drops,
  // up for three seconds at most. The title rides the iron ribbon, so keep it an
  // exclamation of two or three words; the subtitle sits under it on one line
  // of a phone. `{n}` is the stage the launcher is for.
  'bossReward': {
    'title': 'Boss defeated!',
    'subtitle': 'A gift for Stage {n}. Keep running!'
  },
  'result': {
    'stageClear': 'Stage Clear!',
    'wipedOut': 'Squad Wiped Out',
    'reachedStage': 'Stage {n}',
    'newRecord': 'New record!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Boss felled!',
    // The three seconds after the squad falls, over the bodies. The word is
    // the owner's own brief — GTA's and Elden Ring's death card — and it is
    // doing the job the result screen could not: marking the loss as an EVENT
    // rather than as a transition into a menu.
    'wasted': 'Wasted',
    // NOTE: there is deliberately no `cause.*` here and no near-miss `reach`
    // readout. Both were on this screen until 2026-09-15 and both were removed
    // — a death is told by the three-second wipe hold, textlessly, and a
    // percentage through a stage is not a number this game is about. The
    // simulation still bills every death to a cause; it rides the `wipe`
    // analytics event instead of the card. See GameScene's "Two readouts this
    // screen no longer carries".
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Milestone!',
    // Badge for a retried stage whose enemies came back weakened.
    'rallied': 'Second wind',
    'peakSquad': 'Biggest squad',
    'kills': 'Kills',
    // ─── The ×3, the game's primary income ──────────────────────────────────
    // The label renders as `[film] 3× [coin] (+123)` — two strings with a coin
    // ICON between them, so the currency never has to be named in 21 languages
    // and the button stays short enough for a 320 px screen.
    //
    // Split in two because the multiplier's ORDER is locale-dependent (`3×` in
    // most, `×3` in ru/uk/kk/ar) while the bonus is the same shape everywhere.
    // `tripleBonus` takes {n} = the BONUS the video adds, not the new total.
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Coins tripled!',
    'nextStage': 'Next stage',
    'tryAgain': 'Try again',
    'upgrade': 'Upgrade',
    'upgradeHint': 'Upgrade your squad!',
    'rankOf': 'of {n}',
    'upNext': 'Up next: Stage {n}'
  },

  // ─── The share card ───────────────────────────────────────────────────────
  //
  // Only TWO strings, and neither of them is on the picture. The card itself is
  // set from keys this file already had — `gameName` for the mark,
  // `result.newRecord` for the line that explains why the card exists,
  // `leaderboard.stage` and `leaderboard.squad` for the two captions, and
  // `result.rankOf` for the population beside the placing. A card is a poster
  // of the result screen, so it says what the result screen says.
  //
  // `action` names an ICON-ONLY button and is never seen: it is the accessible
  // name, and the only thing a screen reader has to work with.
  //
  // `text` is the message the OS share sheet carries beside the image, so it is
  // read by whoever RECEIVES it rather than by the player — a boast, not an
  // instruction. It has to survive arriving with no picture attached, which is
  // what several targets do with a file they will not preview, so the stage
  // number and the game's name both belong in the sentence.
  'share': {
    'action': 'Share your run',
    'text': 'I reached stage {n} in {game}. Think you can go deeper?'
  },

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  // A four-column table on a 320 px phone, so every column header has to be one
  // short word — translate for brevity over literalness, and reuse whatever
  // this locale already calls a stage and a squad elsewhere in this file.
  //
  // ── `yourRank` is a WHOLE SENTENCE and takes BOTH numbers ──
  //
  // "You are #1,130 of 2,531". It used to be a rank message plus a separate
  // "of N" fragment rendered in its own span, which is the obvious shape and is
  // wrong in every language that leads with the POPULATION — Japanese is
  // "{total} 人中 #{n} 位", and Korean, Turkish, Kazakh, Uzbek, Hindi and
  // Chinese do the same. A split renders all of them backwards, and a
  // locale-parity test cannot see it: both halves are present, translated, and
  // carrying the right placeholders. So the word order belongs to the locale,
  // which means the whole sentence has to be one string it can reorder.
  //
  // ⚠ BOTH VALUES ARRIVE PRE-FORMATTED, as strings — "1,130" in English,
  // "1.130" in German, "1,54,331" in Hindi (see `utils/localeNumber`). Two
  // consequences for whoever writes a locale file:
  //
  //   • do NOT pluralise this message on `|`. vue-i18n's plural selection needs
  //     a real number and will not get one — it silently picks the wrong form,
  //     or renders the raw pipe. (No locale wants a plural here anyway: "of 1
  //     players" never renders, because a board with one player is not shown.)
  //   • `{n}` is not always digits either — it is `100+` once the player is
  //     past the last published row, so it may not be wrapped in a grammatical
  //     case or a counter that only works for numerals.
  //
  // Grammatical cases that key off the SENTENCE rather than off the value are
  // unaffected, which is why the Slavic locales keep theirs.
  'leaderboard': {
    'title': 'Leaderboard',
    'rank': '#',
    'player': 'Player',
    'stage': 'Stage',
    'squad': 'Squad',
    'empty': 'No runs posted yet. Be the first.',
    'failed': "Couldn't reach the leaderboard.",
    'loading': 'Loading…',
    'you': 'You',
    'yourRank': 'You are #{n} of {total}',
    'tabGlobal': 'Global'
  },

  // ─── Upgrades ─────────────────────────────────────────────────────────────
  // ─── The idle treasure chest ──────────────────────────────────
  //
  // The chest is a drawing with a number under it and no words of its own, so
  // these are what a screen reader has to work with. One line per STATE:
  // announcing "treasure chest" for a chest that cannot be opened for another
  // four minutes tells the player nothing they can act on. `label` is the
  // floor under the glyph itself — see `iconLabels.ts`.
  'chest': {
    'label': 'Treasure chest',
    'ready': 'Open the treasure chest for {n} coins',
    'filling': 'Treasure chest — filling up',
    'spent': 'Treasure chest — empty until tomorrow'
  },

  // ─── The daily expedition ─────────────────────────────────────────────────
  //
  // One road a day, the same road for every player, worth triple coins. The
  // whole feature is a chip with a glyph on it, so — as with the chest above —
  // most of these strings exist for the screen reader, and each names the STATE
  // rather than the object: "daily expedition" said to a player who already ran
  // today's tells them nothing they can act on.
  //
  // `multiplier` is the badge on the chip and is deliberately SPLIT from any
  // word, exactly like `result.tripleCoins`: the multiplier's order is
  // locale-dependent (`3×` in most, `×3` in ru/uk/kk/ar) and `{n}` must stay a
  // bare digit beside the sign. `spent` takes `{time}` = "H:MM" until the next
  // road prints, which is a UTC boundary and therefore NOT midnight for most
  // players — the countdown is what saves them having to know that.
  //
  // `hud` replaces "Stage 16" on the run readout and `title` headlines the
  // banner and the result screen: keep `hud` to one short word, it shares a
  // 320 px row with the squad, damage and fire-rate chips.
  'expedition': {
    'title': 'Daily Expedition',
    'hud': 'Expedition',
    'multiplier': '{n}×',
    'available': "Daily expedition — today's road, triple coins",
    'confirm': 'Start expedition',
    'spent': 'Daily expedition — a new road in {time}',
    'done': 'Back tomorrow',
    'back': 'Back to the campaign'
  },

  'skills': {
    'grenade': 'Grenade',
    'shield': 'Shield',
    'locked': 'Locked',
    'unlocksAt': 'Unlocks at stage {n}',
    'frost': 'Frost Nova',
    'decoy': 'Decoy Flare',
    'trialLabel': '{name} · free try',
    'trialTag': 'Free try!',
    'uses': '×{n}'
  },
  // ─── The intro cutscene ───────────────────────────────────────────────────
  //
  // Three lines, sixty characters, over nine seconds — see `cutscenes.md`. No
  // proper nouns (nothing is named, because naming things is what makes an
  // intro feel like homework) and no mechanics (the tutorial teaches steering
  // six hundred milliseconds later). Every one has to stay short enough to sit
  // on one line on a 320 px phone in all 21 languages.
  'intro': {
    'took': 'It took everyone.',
    'alive': 'They are still alive.',
    'go': 'Go and get them.',
    // The skip button, bottom-right. One word wherever one word exists.
    'skip': 'Skip'
  },

  'upgrades': {
    'title': 'Upgrades',
    'spotlight': 'Spend!',
    'level': 'Lv {n}',
    'maxed': 'Maxed',
    // ─── The result screen's peek plate ─────────────────────────────────────
    // Never seen: an `aria-label` on a button replaces everything inside it, so
    // these are the only way a screen reader learns what the plate says. Two
    // whole sentences rather than one plus an appended clause — "3 ready to buy"
    // is not a fragment every language can glue onto a name.
    'peekLabel': 'Upgrades: {name}',
    'peekLabelReady': 'Upgrades: {name} — {n} ready to buy',
    'names': {
      'squad': 'Squad',
      'power': 'Firepower',
      'rate': 'Fire Rate',
      'range': 'Reach',
      'scavenge': 'Scavenging',
      'grenade': 'Grenade',
      'shield': 'Shield',
      // The two weapon tracks. Named for the WEAPON rather than for the stat,
      // because the player's question in the shop is "which of the two things I
      // keep finding do I want to be better", not "what does this percentage do".
      'rocket': 'Rocket Power',
      'gatling': 'Gatling Power'
    },
    'descriptions': {
      'squad': 'Start every stage with more survivors.',
      'power': 'Every survivor deals more damage per shot.',
      'rate': 'Every survivor shoots faster.',
      'range': 'Your squad opens fire further up the road.',
      'scavenge': 'Earn more coins from every run.',
      'grenade': 'Throw a grenade for a burst of heavy damage.',
      'shield': 'Halve the damage your squad takes for a few seconds.',
      'rocket': 'Rocket launchers you unlock on a stage deal more damage.',
      'gatling': 'Gatling guns you unlock on a stage deal more damage.'
    }
  },

  // ─── Options ──────────────────────────────────────────────────────────────
  'options': {
    'title': 'Options',
    'general': 'General',
    'audio': 'Audio',
    'language': 'Language',
    'difficulty': 'Difficulty',
    'soundEffects': 'Sound Effects',
    'music': 'Music',
    'musicTrack': 'Music Track',
    'musicTracks': {
      'cozy': 'Cozy Harmony',
      'trance': 'Trance Tunnel'
    },
    // ─── Vibration ───────────────────────────────────────────────────────────
    // Rendered ONLY on a device that actually has a motor (see
    // `useHaptics.hapticsAvailable`), so most players will never see these.
    // `on` / `off` are generic on purpose — they are the labels of a two-item
    // dropdown and the row above them already says what is being switched.
    'haptics': 'Vibration',
    'on': 'On',
    'off': 'Off',
    'close': 'Save & Close',
    'difficulties': {
      'easy': 'Easy',
      'medium': 'Medium',
      'hard': 'Hard'
    },
    'difficultyHints': {
      'easy': 'Softer enemies and thinner barricades.',
      'medium': 'The standard run.',
      'hard': 'Tougher enemies and heavier barricades.'
    }
  },

  // ─── System ───────────────────────────────────────────────────────────────
  'adsBlocked': {
    'title': "Couldn't show ad",
    'body': 'We tried to show you a video so you could earn your reward, but something on your browser is blocking ads.',
    'allowPrefix': 'Please allow ads on',
    'allowSuffix': '(or pause your ad-blocker for this game) and try again.',
    'gotIt': 'Got it'
  },
  'saveStatus': {
    'restoredTitle': 'Cloud save restored',
    'restoredBody': '+{n} bonus coins for the recovery',
    'tap': 'tap',
    'pausedTitle': 'Cloud sync paused',
    'pausedBody': 'Playing offline. Your progress is saved here.',
    'retry': 'Retry',
    'dismiss': 'dismiss'
  },
  'loading': {
    'tooLong': 'Loading taking too long? Try disabling your ad blocker and refresh.',
    // The splash mascot's two-beat gag: the little ghost pops out with the
    // first line, then drops the act and giggles. Both are onomatopoeia, so
    // every locale wants its OWN startle noise and laugh, not a translation
    // of the English letters.
    'boo': 'Boo!',
    'laugh': 'Hahaha!'
  },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Turn your phone',
    'body': 'Survivalist plays in portrait.'
  },
  'license': {
    'denied': 'Access Denied: Please purchase a license.'
  }
}
