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
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Levels tot de volgende bonus',
    'fireRate': 'Tempo',
    'incoming': 'Aanval!',
    'dodge': 'Ontwijk',
    'getIn': 'Ga erin',
    'holdStill': 'Stilstaan',
    'milestone': '{n} man sterk!',
    'weaponActive': '{name} gereed',
    'weaponsActive': '{a} + {b} gereed',
    'weaponLocked': '{name} vergrendeld — {n} van {total} hendels geraakt',
    'weaponGift': '{name} verderop — gratis, geen hendels',
    'weaponFree': 'GRATIS'
  },

  'weapons': {
    'rocket': 'Raketwerper',
    'gatling': 'Gatling',
    'grapeshot': 'Schroot',
    'dynamo': 'Dynamo',
    'gravecall': 'Grafroep',
    'hoard': 'Kraaienschat',
    'bolt': 'Bliksem'
  },

  'offer': {
    'confirm': 'Video kijken',
    'available': 'Bekijk een video en krijg {weapon} gratis'
  },

  'tutorial': {
    'touch': 'Veeg om je team te bewegen',
    'desktop': 'Beweeg de muis om je team te sturen'
  },
  'hints': {
    'move': { 'touch': 'Tik om te bewegen', 'desktop': 'Klik om te bewegen' },
    'divider': { 'touch': 'Raak nooit de pilaar tussen de poorten aan', 'desktop': 'Raak nooit de pilaar tussen de poorten aan' },
    'crate': { 'touch': 'Groene kisten: iedereen slaat harder', 'desktop': 'Groene kisten: iedereen slaat harder' },
    'rate': { 'touch': 'Blauwe kisten: iedereen schiet sneller', 'desktop': 'Blauwe kisten: iedereen schiet sneller' },
    'lever': { 'touch': 'Schiet op BEIDE hendels aan de rand — ze openen de wapenkist', 'desktop': 'Schiet op BEIDE hendels aan de rand — ze openen de wapenkist' },
    'cage': { 'touch': 'Schiet op kooien — de gevangenen sluiten zich aan', 'desktop': 'Schiet op kooien — de gevangenen sluiten zich aan' },
    'shieldBox': { 'touch': 'Schildkist — wacht en blokkeert één grote klap', 'desktop': 'Schildkist — wacht en blokkeert één grote klap' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} overlevenden verzilverd',
    'unlocked': 'Vrijgespeeld!',

    'guardian': "Een beschermengel heeft je gered!",

    'guardianSub': "{n} overlevenden zijn terug",

    'next': "Hierna: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Kies een wapen",
    'nextStage': "volgend level",
    'stagesAway': "over {n} levels"
  },
  'weaponPick': {
    'title': "Kies je wapen",
    'subtitle': "Van jou in level {n}. Er wachten er meer langs de weg.",
    'take': "Pakken",
    'rocket': {
      'a': "Geleide salvo",
      'b': "Explosieschade"
    },
    'gatling': {
      'a': "Dubbele vuursnelheid",
      'b': "Pompt poorten sneller op"
    }
  },
  'bossReward': {
    'title': "Baas verslagen!",
    'subtitle': "Een cadeau voor level {n}. Blijf rennen!"
  },
  'result': {
    'stageClear': 'Level gehaald!',
    'clearedStage': 'Level {n} gehaald!',
    'wipedOut': 'Team weggevaagd',
    'reachedStage': 'Level {n}',
    'newRecord': 'Nieuw record!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Baas geveld!',
    'wasted': 'Afgemaakt',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Mijlpaal!',
    'rallied': 'Tweede adem',
    'peakSquad': 'Grootste team',
    'kills': 'Kills',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Munten verdrievoudigd!',
    'nextStage': 'Volgend level',
    'tryAgain': 'Opnieuw',
    'upgrade': 'Upgraden',
    'upgradeHint': 'Upgrade je team!',
    'rankOf': 'van {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Deel je run',
    'text': 'Ik haalde level {n} in {game}. Kom jij verder?'
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
    'yourRank': 'Jij bent #{n} van {total}',
    'tabGlobal': 'Wereldwijd'
  },

  'chest': {
    'label': 'Schatkist',
    'ready': 'Open de schatkist voor {n} munten',
    'filling': 'Schatkist — wordt gevuld',
    'spent': 'Schatkist — leeg tot morgen'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Dagelijkse expeditie',
    'hud': 'Expeditie',
    'multiplier': '{n}×',
    'available': 'Dagelijkse expeditie — de route van vandaag, drie keer zo veel munten',
    'confirm': 'Expeditie starten',
    'spent': 'Dagelijkse expeditie — nieuwe route over {time}',
    'done': 'Kom morgen terug',
    'back': 'Terug naar de campagne'
  },

  'skills': {

    'grenade': 'Granaat',

    'shield': 'Schild',

    'locked': 'Vergrendeld',

    'unlocksAt': 'Vanaf level {n}',

    'frost': 'Vorstnova',

    'decoy': 'Lokfakkel',

    'trialLabel': '{name} · gratis proberen',

    'trialTag': 'Gratis proberen!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Het nam iedereen mee.',
    'alive': 'Ze leven nog.',
    'go': 'Haal ze terug.',
    'skip': 'Overslaan'
  },

  'upgrades': {
    'title': 'Upgrades',
    'spotlight': 'Uitgeven!',
    'level': 'Lv {n}',
    'maxed': 'Max',
    'peekLabel': 'Upgrades: {name}',
    'peekLabelReady': 'Upgrades: {name} — {n} nu te koop',
    'names': {
      'squad': 'Team',
      'power': 'Vuurkracht',
      'rate': 'Vuursnelheid',
      'range': 'Bereik',
      'scavenge': 'Sprokkelen',
      'grenade': 'Granaat',
      'shield': 'Schild',
      'rocket': 'Raketkracht',
      'gatling': 'Gatling-kracht',
      'grapeshot': 'Schrootkracht',
      'dynamo': 'Dynamo-kracht',
      'gravecall': 'Grafroep-kracht',
      'hoard': 'Schatkracht'
    },
    'descriptions': {
      'squad': 'Begin elk level met meer overlevenden.',
      'power': 'Elke overlevende doet meer schade per schot.',
      'rate': 'Elke overlevende schiet sneller.',
      'range': 'Je team opent verder op de weg het vuur.',
      'scavenge': 'Verdien meer munten per run.',
      'grenade': 'Gooi een granaat voor een uitbarsting van schade.',
      'shield': 'Halveer de schade aan je team voor enkele seconden.',
      'rocket': 'Raketwerpers die je in een level vrijspeelt doen meer schade.',
      'gatling': 'Gatlings die je in een level vrijspeelt doen meer schade.',
      'grapeshot': 'Hagelgeweren die je in een level vrijspeelt doen meer schade.',
      'dynamo': 'Dynamo-bliksems die je in een level vrijspeelt slaan harder toe.',
      'gravecall': 'De doden die je opwekt vechten harder en gaan langer mee.',
      'hoard': 'Vijanden die in goud veranderen leveren meer munten op.'
    }
  },

  'options': {
    'title': 'Opties', 'general': 'Algemeen', 'audio': 'Audio', 'language': 'Taal',
    'difficulty': 'Moeilijkheid', 'soundEffects': 'Geluidseffecten', 'music': 'Muziek', 'musicTrack': 'Muzieknummer',
    'musicTracks': { 'cozy': 'Behaaglijke harmonie', 'trance': 'Trance-tunnel' },
    'haptics': 'Trillen', 'on': 'Aan', 'off': 'Uit',
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
  'loading': { 'tooLong': 'Duurt het laden te lang? Schakel je adblocker uit en ververs.', 'boo': 'Boe!', 'laugh': 'Hahaha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Draai je telefoon',
    'body': 'Survivalist speel je staand.'
  },
  'license': { 'denied': 'Toegang geweigerd: koop een licentie.' }
}
