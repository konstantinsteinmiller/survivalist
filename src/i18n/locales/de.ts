export default {
  'gameName': 'Survivalist',
  'cancel': 'Abbrechen',
  'close': 'Schließen',
  'ok': 'Ok',
  'continue': 'Weiter',
  'tapToContinue': 'Zum Fortfahren tippen',
  'clickToContinue': 'Zum Fortfahren klicken',
  'rewards': 'BELOHNUNGEN',
  'tip': 'Tipp',
  'crazyGamesOnly': 'Dieses Spiel ist nur verfügbar auf',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Weiter',
    'replay': 'Wiederholen',
    'back': 'Zurück',
    'play': 'Spielen',
    'pause': 'Pause',
    'menu': 'Menü',
    'home': 'Start',
    'info': 'Info'
  },

  'hud': {
    'stage': 'Level {n}',
    'best': 'Rekord {n}',
    'boss': 'Boss',
    'miniboss': 'Miniboss',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Level bis zum nächsten Bonus',
    'bonus': "Bonus +{coins}",
    'fireRate': 'Rate',
    'incoming': 'Angriff!',
    'dodge': 'Ausweichen',
    'getIn': 'Rein da',
    'holdStill': 'Stillhalten',
    'milestone': '{n} Mann stark!',
    'weaponActive': '{name} bereit',
    'weaponsActive': '{a} + {b} bereit',
    'weaponLocked': '{name} gesperrt — {n} von {total} Hebeln getroffen',
    'weaponGift': '{name} voraus — gratis, keine Hebel',
    'weaponFree': 'GRATIS'
  },

  'weapons': {
    'rocket': 'Raketenwerfer',
    'gatling': 'Gatling',
    'grapeshot': 'Kartätsche',
    'dynamo': 'Dynamo',
    'gravecall': 'Grabruf',
    'hoard': 'Krähenhort',
    'bolt': 'Blitzschlag'
  },

  'offer': {
    'confirm': 'Video ansehen',
    'available': 'Video ansehen und {weapon} gratis erhalten'
  },

  'tutorial': {
    'touch': 'Wische, um deinen Trupp zu bewegen',
    'desktop': 'Bewege die Maus, um deinen Trupp zu lenken'
  },
  'hints': {
    'move': { 'touch': 'Zum Bewegen tippen', 'desktop': 'Zum Bewegen klicken' },
    'divider': { 'touch': 'Nie die Säule zwischen den Toren berühren', 'desktop': 'Nie die Säule zwischen den Toren berühren' },
    'crate': { 'touch': 'Grüne Kisten: alle treffen härter', 'desktop': 'Grüne Kisten: alle treffen härter' },
    'rate': { 'touch': 'Blaue Kisten: alle schießen schneller', 'desktop': 'Blaue Kisten: alle schießen schneller' },
    'lever': { 'touch': 'Triff BEIDE Hebel am Straßenrand – sie öffnen die Waffenkiste', 'desktop': 'Triff BEIDE Hebel am Straßenrand – sie öffnen die Waffenkiste' },
    'cage': { 'touch': 'Schieß auf Käfige — die Gefangenen schließen sich an', 'desktop': 'Schieß auf Käfige — die Gefangenen schließen sich an' },
    'shieldBox': { 'touch': 'Schildkiste — sie wartet und blockt einen großen Treffer', 'desktop': 'Schildkiste — sie wartet und blockt einen großen Treffer' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} Überlebende eingelöst',
    'unlocked': 'Freigeschaltet!',

    'guardian': "Ein Schutzengel hat dich gerettet!",

    'guardianSub': "{n} Überlebende sind zurück",

    'next': "Als Nächstes: {label} · {when}",
    'bossAhead': "Boss voraus: {name}",
    'rankUp': "Rang #{rank} ▲{n}",
    'bossName': {
      'grumpling': "Grumpling",
      'bonecap': "Bonecap",
      'snaggletusk': "Snaggletusk",
      'thornwick': "Thornwick",
      'marrowknight': "Marrowknight",
      'cinderhound': "Cinderhound",
      'rattlejack': "Rattlejack",
      'skewer': "Skewer"
    }

  },

  'ladder': {
    'weaponPick': "Waffe wählen",
    'nextStage': "nächstes Level",
    'stagesAway': "in {n} Leveln",
    'thisStage': "dieses Level"
  },
  'weaponPick': {
    'title': "Wähle deine Waffe",
    'subtitle': "Deine für Level {n}. Weitere warten auf der Straße.",
    'take': "Nehmen",
    'rocket': {
      'a': "Zielsuchende Salve",
      'b': "Explosionsschaden"
    },
    'gatling': {
      'a': "Doppelte Feuerrate",
      'b': "Pumpt Tore schneller"
    }
  },
  'bossReward': {
    'title': "Boss besiegt!",
    'subtitle': "Ein Geschenk für Level {n}. Lauf weiter!"
  },
  'result': {
    'stageClear': 'Level geschafft!',
    'clearedStage': 'Level {n} geschafft!',
    'wipedOut': 'Trupp ausgelöscht',
    'reachedStage': 'Level {n}',
    'newRecord': 'Neuer Rekord!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Boss gefallen!',
    'wasted': 'Erledigt',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Meilenstein!',
    'rallied': 'Zweiter Atem',
    'peakSquad': 'Größter Trupp',
    'kills': 'Kills',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Münzen verdreifacht!',
    'nextStage': 'Nächstes Level',
    'tryAgain': 'Nochmal',
    'upgrade': 'Upgrade',
    'upgradeHint': 'Rüste deine Truppe auf!',
    'rankOf': 'von {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Lauf teilen',
    'text': 'Ich habe Level {n} in {game} erreicht. Kommst du weiter?'
  },

  'leaderboard': {
    'title': 'Bestenliste',
    'rank': '#',
    'player': 'Spieler',
    'stage': 'Level',
    'squad': 'Trupp',
    'empty': 'Noch keine Einträge. Sei der Erste!',
    'failed': 'Bestenliste nicht erreichbar.',
    'loading': 'Wird geladen…',
    'you': 'Du',
    'yourRank': 'Du bist #{n} von {total}',
    'tabGlobal': 'Global'
  },

  'chest': {
    'label': 'Schatztruhe',
    'ready': 'Schatztruhe für {n} Münzen öffnen',
    'filling': 'Schatztruhe — füllt sich',
    'spent': 'Schatztruhe — leer bis morgen'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Tages-Expedition',
    'hud': 'Expedition',
    'multiplier': '{n}×',
    'available': 'Tages-Expedition — die heutige Strecke, dreifache Münzen',
    'confirm': 'Expedition starten',
    'spent': 'Tages-Expedition — neue Strecke in {time}',
    'done': 'Morgen wieder',
    'back': 'Zurück zur Kampagne'
  },

  'skills': {

    'grenade': 'Granate',

    'shield': 'Schild',

    'locked': 'Gesperrt',

    'unlocksAt': 'Ab Level {n}',

    'frost': 'Frostnova',

    'decoy': 'Lockfackel',

    'trialLabel': '{name} · gratis testen',

    'trialTag': 'Gratis testen!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Es hat alle geholt.',
    'alive': 'Sie leben noch.',
    'go': 'Hol sie zurück.',
    'skip': 'Überspringen'
  },

  'upgrades': {
    'title': 'Upgrades',
    'spotlight': 'Ausgeben!',
    'level': 'St. {n}',
    'maxed': 'Max',
    'peekLabel': 'Upgrades: {name}',
    'peekLabelReady': 'Upgrades: {name} — {n} sofort kaufbar',
    'names': {
      'squad': 'Trupp',
      'power': 'Feuerkraft',
      'rate': 'Feuerrate',
      'range': 'Reichweite',
      'scavenge': 'Plündern',
      'grenade': 'Granate',
      'shield': 'Schild',
      'rocket': 'Raketenkraft',
      'gatling': 'Gatling-Kraft',
      'grapeshot': 'Kartätschenkraft',
      'dynamo': 'Dynamo-Kraft',
      'gravecall': 'Grabruf-Kraft',
      'hoard': 'Hort-Kraft'
    },
    'descriptions': {
      'squad': 'Starte jedes Level mit mehr Überlebenden.',
      'power': 'Jeder Überlebende macht mehr Schaden pro Schuss.',
      'rate': 'Jeder Überlebende schießt schneller.',
      'range': 'Dein Trupp eröffnet das Feuer weiter vorn.',
      'scavenge': 'Verdiene mehr Münzen pro Lauf.',
      'grenade': 'Wirf eine Granate für einen schweren Schadensstoß.',
      'shield': 'Halbiere für einige Sekunden den Schaden an deiner Truppe.',
      'rocket': 'Raketenwerfer, die du im Level freischaltest, machen mehr Schaden.',
      'gatling': 'Gatlings, die du im Level freischaltest, machen mehr Schaden.',
      'grapeshot': 'Schrotflinten, die du im Level freischaltest, machen mehr Schaden.',
      'dynamo': 'Dynamo-Blitze, die du im Level freischaltest, schlagen härter.',
      'gravecall': 'Deine erweckten Toten kämpfen stärker und halten länger.',
      'hoard': 'In Gold verwandelte Gegner bringen mehr Münzen.'
    }
  },

  'options': {
    'title': 'Optionen', 'general': 'Allgemein', 'audio': 'Audio', 'language': 'Sprache',
    'difficulty': 'Schwierigkeit', 'soundEffects': 'Soundeffekte', 'music': 'Musik', 'musicTrack': 'Musiktitel',
    'musicTracks': { 'cozy': 'Gemütliche Harmonie', 'trance': 'Trance-Tunnel' },
    'haptics': 'Vibration', 'on': 'An', 'off': 'Aus',
    'close': 'Speichern & Schließen',
    'difficulties': { 'easy': 'Leicht', 'medium': 'Mittel', 'hard': 'Schwer' },
    'difficultyHints': {
      'easy': 'Schwächere Gegner und dünnere Barrikaden.',
      'medium': 'Der normale Lauf.',
      'hard': 'Zähere Gegner und stärkere Barrikaden.'
    }
  },

  'adsBlocked': {
    'title': 'Werbung konnte nicht geladen werden',
    'body': 'Wir wollten dir ein Video zeigen, damit du deine Belohnung erhältst, aber etwas in deinem Browser blockiert Werbung.',
    'allowPrefix': 'Bitte erlaube Werbung auf',
    'allowSuffix': '(oder pausiere deinen Adblocker für dieses Spiel) und versuche es erneut.',
    'gotIt': 'Verstanden'
  },
  'saveStatus': {
    'restoredTitle': 'Cloud-Speicher wiederhergestellt', 'restoredBody': '+{n} Bonusmünzen für die Wiederherstellung',
    'tap': 'tippen', 'pausedTitle': 'Cloud-Sync pausiert',
    'pausedBody': 'Offline-Modus. Dein Fortschritt wird hier gespeichert.',
    'retry': 'Erneut versuchen', 'dismiss': 'ausblenden'
  },
  'loading': { 'tooLong': 'Laden dauert zu lange? Deaktiviere deinen Adblocker und lade neu.', 'boo': 'Buh!', 'laugh': 'Hahaha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Dreh dein Handy',
    'body': 'Survivalist spielt im Hochformat.'
  },
  'license': { 'denied': 'Zugriff verweigert: Bitte erwerbe eine Lizenz.' }
}
