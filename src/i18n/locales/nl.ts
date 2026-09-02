export default {
  'gameName': 'Survivalist',
  'cancel': 'Annuleren',
  'close': 'Sluiten',
  'ok': 'Ok',
  'continue': 'Doorgaan',
  'tapToContinue': 'Tik om door te gaan',
  'clickToContinue': 'Klik om door te gaan',
  'rewards': 'BELONINGEN',
  'tip': 'Tip',
  'crazyGamesOnly': 'Dit spel is alleen beschikbaar op',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Volgende',
    'replay': 'Opnieuw',
    'back': 'Terug',
    'play': 'Spelen',
    'pause': 'Pauze',
    'menu': 'Menu',
    'home': 'Start',
    'info': 'Info'
  },

  'hud': {
    'stage': 'Level {n}',
    'best': 'Record {n}',
    'boss': 'Baas',
    'miniboss': 'Minibaas',
    'fireRate': 'Tempo'
  },

  'tutorial': {
    'touch': 'Veeg om je team te bewegen',
    'desktop': 'Beweeg de muis om je team te sturen'
  },
  'hints': {
    'move': { 'touch': 'Tik om te bewegen', 'desktop': 'Klik om te bewegen' },
    'gate': { 'touch': 'Blijf op de poort schieten: elke halve seconde +1', 'desktop': 'Blijf op de poort schieten: elke halve seconde +1' },
    'trap': { 'touch': 'Rode poorten VERKLEINEN je team — neem de andere!', 'desktop': 'Rode poorten VERKLEINEN je team — neem de andere!' },
    'divider': { 'touch': 'Raak nooit de pilaar tussen de poorten aan', 'desktop': 'Raak nooit de pilaar tussen de poorten aan' },
    'crate': { 'touch': 'Groene kisten: iedereen slaat harder', 'desktop': 'Groene kisten: iedereen slaat harder' },
    'rate': { 'touch': 'Blauwe kisten: iedereen schiet sneller', 'desktop': 'Blauwe kisten: iedereen schiet sneller' },
    'boss': { 'touch': 'Blijf uit de rode ring!', 'desktop': 'Blijf uit de rode ring!' },
    'guard': { 'touch': 'Schild op — je schoten doen niets. WEGWEZEN!', 'desktop': 'Schild op — je schoten doen niets. WEGWEZEN!' }
  },

  'result': {
    'stageClear': 'Level gehaald!',
    'wipedOut': 'Team weggevaagd',
    'reachedStage': 'Level {n}',
    'newRecord': 'Nieuw record!',
    'rallied': 'Tweede adem',
    'peakSquad': 'Grootste team',
    'kills': 'Kills',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Munten verdrievoudigd!',
    'nextStage': 'Volgend level',
    'tryAgain': 'Opnieuw',
    'upgrade': 'Upgraden',
    'rankOf': 'van {n}'
  },

  'leaderboard': {
    'title': 'Ranglijst',
    'rank': '#',
    'player': 'Speler',
    'stage': 'Level',
    'squad': 'Team',
    'empty': 'Nog geen scores. Wees de eerste!',
    'failed': 'Ranglijst niet bereikbaar.',
    'loading': 'Laden…',
    'you': 'Jij',
    'yourRank': 'Jij bent #{n}',
    'of': 'van {n} spelers'
  },

  'upgrades': {
    'title': 'Upgrades',
    'spotlight': 'Uitgeven!',
    'level': 'Lv {n}',
    'maxed': 'Max',
    'names': {
      'squad': 'Team',
      'power': 'Vuurkracht',
      'rate': 'Vuursnelheid',
      'range': 'Bereik',
      'scavenge': 'Sprokkelen'
    },
    'descriptions': {
      'squad': 'Begin elk level met meer overlevenden.',
      'power': 'Elke overlevende doet meer schade per schot.',
      'rate': 'Elke overlevende schiet sneller.',
      'range': 'Je team opent verder op de weg het vuur.',
      'scavenge': 'Verdien meer munten per run.'
    }
  },

  'options': {
    'title': 'Opties', 'general': 'Algemeen', 'audio': 'Audio', 'language': 'Taal',
    'difficulty': 'Moeilijkheid', 'soundEffects': 'Geluidseffecten', 'music': 'Muziek', 'musicTrack': 'Muzieknummer',
    'musicTracks': { 'cozy': 'Behaaglijke harmonie', 'trance': 'Trance-tunnel' },
    'close': 'Opslaan en sluiten',
    'difficulties': { 'easy': 'Makkelijk', 'medium': 'Gemiddeld', 'hard': 'Moeilijk' },
    'difficultyHints': {
      'easy': 'Zwakkere vijanden en dunnere barricades.',
      'medium': 'De standaard run.',
      'hard': 'Taaiere vijanden en zwaardere barricades.'
    }
  },

  'adsBlocked': {
    'title': 'Advertentie kon niet worden getoond',
    'body': 'We wilden je een video tonen zodat je je beloning kon verdienen, maar iets in je browser blokkeert advertenties.',
    'allowPrefix': 'Sta advertenties toe op',
    'allowSuffix': '(of pauzeer je adblocker voor dit spel) en probeer het opnieuw.',
    'gotIt': 'Begrepen'
  },
  'saveStatus': {
    'restoredTitle': 'Cloudopslag hersteld', 'restoredBody': '+{n} bonusmunten voor het herstel',
    'tap': 'tik', 'pausedTitle': 'Cloudsync gepauzeerd',
    'pausedBody': 'Je speelt offline. Je voortgang wordt hier opgeslagen.',
    'retry': 'Opnieuw', 'dismiss': 'sluiten'
  },
  'loading': { 'tooLong': 'Duurt het laden te lang? Schakel je adblocker uit en ververs.' },
  'license': { 'denied': 'Toegang geweigerd: koop een licentie.' }
}
