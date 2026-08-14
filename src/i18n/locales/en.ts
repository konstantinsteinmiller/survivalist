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

  // ─── HUD ──────────────────────────────────────────────────────────────────
  'hud': {
    'stage': 'Stage {n}',
    'best': 'Best {n}',
    'boss': 'Boss',
    'miniboss': 'Miniboss',
    // Live fire-rate chip. It sits in a HUD pill next to a number, so every
    // locale keeps this to ~6 characters.
    'fireRate': 'Rate'
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
    'gate': {
      'touch': 'Keep shooting a gate — it grows +1 every half second',
      'desktop': 'Keep shooting a gate — it grows +1 every half second'
    },
    'trap': {
      'touch': 'Red gates SHRINK your squad — take the other side!',
      'desktop': 'Red gates SHRINK your squad — take the other side!'
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
    'boss': {
      'touch': 'Stay out of the red ring!',
      'desktop': 'Stay out of the red ring!'
    },
    // Fires the first time the boss shields. Without it the phase reads as a
    // broken hitbox — the player IS still shooting, and it IS doing nothing.
    'guard': {
      'touch': 'Shield up — your fire does nothing. MOVE!',
      'desktop': 'Shield up — your fire does nothing. MOVE!'
    }
  },

  // ─── Result / stage summary ───────────────────────────────────────────────
  'result': {
    'stageClear': 'Stage Clear!',
    'wipedOut': 'Squad Wiped Out',
    'reachedStage': 'Stage {n}',
    'newRecord': 'New record!',
    // Badge for a retried stage whose enemies came back weakened.
    'rallied': 'Second wind',
    'peakSquad': 'Biggest squad',
    'kills': 'Kills',
    'nextStage': 'Next stage',
    'tryAgain': 'Try again',
    'upgrade': 'Upgrade'
  },

  // ─── Upgrades ─────────────────────────────────────────────────────────────
  'upgrades': {
    'title': 'Upgrades',
    'spotlight': 'Spend!',
    'level': 'Lv {n}',
    'maxed': 'Maxed',
    'names': {
      'squad': 'Squad',
      'power': 'Firepower',
      'rate': 'Fire Rate',
      'scavenge': 'Scavenging'
    },
    'descriptions': {
      'squad': 'Start every stage with more survivors.',
      'power': 'Every survivor deals more damage per shot.',
      'rate': 'Every survivor shoots faster.',
      'scavenge': 'Earn more coins from every run.'
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
    'tooLong': 'Loading taking too long? Try disabling your ad blocker and refresh.'
  },
  'license': {
    'denied': 'Access Denied: Please purchase a license.'
  }
}
