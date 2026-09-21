export default {
  'gameName': 'Survivalist',
  'cancel': 'Anuluj',
  'close': 'Zamknij',
  'ok': 'Ok',
  'continue': 'Kontynuuj',
  'tapToContinue': 'Dotknij, aby kontynuować',
  'clickToContinue': 'Kliknij, aby kontynuować',
  'rewards': 'NAGRODY',
  'tip': 'Wskazówka',
  'crazyGamesOnly': 'Ta gra jest dostępna tylko na',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Dalej',
    'replay': 'Powtórz',
    'back': 'Wstecz',
    'play': 'Graj',
    'pause': 'Pauza',
    'menu': 'Menu',
    'home': 'Ekran główny',
    'info': 'Info'
  },

  'hud': {
    'stage': 'Etap {n}',
    'best': 'Rekord {n}',
    'boss': 'Boss',
    'miniboss': 'Miniboss',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Etapy do następnej premii',
    'bonus': "Bonus +{coins}",
    'fireRate': 'Tempo',
    'incoming': 'Nadchodzi atak!',
    'dodge': 'Unik',
    'getIn': 'Wejdź',
    'holdStill': 'Stój',
    'milestone': '{n} w szeregu!',
    'weaponActive': '{name} gotowy',
    'weaponsActive': '{a} + {b} gotowe',
    'weaponLocked': '{name} zablokowany — trafiono {n} z {total} dźwigni',
    'weaponGift': '{name} przed tobą — za darmo, bez dźwigni',
    'weaponFree': 'GRATIS'
  },

  'weapons': {
    'rocket': 'Wyrzutnia rakiet',
    'gatling': 'Gatling',
    'grapeshot': 'Kartacz',
    'dynamo': 'Dynamo',
    'gravecall': 'Zew grobu',
    'hoard': 'Skarb kruka',
    'bolt': 'Piorun'
  },

  'offer': {
    'confirm': 'Obejrzyj reklamę',
    'available': 'Obejrzyj wideo i zdobądź {weapon} za darmo'
  },

  'tutorial': {
    'touch': 'Przesuń palcem, by ruszyć oddziałem',
    'desktop': 'Poruszaj myszą, by kierować oddziałem'
  },
  'hints': {
    'move': { 'touch': 'Dotknij, aby się ruszyć', 'desktop': 'Kliknij, aby się ruszyć' },
    'divider': { 'touch': 'Nigdy nie dotykaj filaru między bramami', 'desktop': 'Nigdy nie dotykaj filaru między bramami' },
    'crate': { 'touch': 'Zielone skrzynie: każdy bije mocniej', 'desktop': 'Zielone skrzynie: każdy bije mocniej' },
    'rate': { 'touch': 'Niebieskie skrzynie: każdy strzela szybciej', 'desktop': 'Niebieskie skrzynie: każdy strzela szybciej' },
    'lever': { 'touch': 'Zestrzel OBIE dźwignie przy krawędziach — otwierają skrzynię z bronią', 'desktop': 'Zestrzel OBIE dźwignie przy krawędziach — otwierają skrzynię z bronią' },
    'cage': { 'touch': 'Strzelaj do klatek — więźniowie dołączą do oddziału', 'desktop': 'Strzelaj do klatek — więźniowie dołączą do oddziału' },
    'shieldBox': { 'touch': 'Skrzynia tarczy — czeka i blokuje jeden duży cios', 'desktop': 'Skrzynia tarczy — czeka i blokuje jeden duży cios' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': 'Spieniężono {n} ocalałych',
    'unlocked': 'Odblokowano!',

    'guardian': "Anioł stróż cię uratował!",

    'guardianSub': "Wróciło {n} ocalałych",

    'next': "Dalej: {label} · {when}",
    'bossAhead': "Boss przed tobą: {name}",
    'rankUp': "Miejsce #{rank} ▲{n}",
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
    'weaponPick': "Wybierz broń",
    'nextStage': "następny poziom",
    'stagesAway': "za {n} poziomy",
    'thisStage': "ten poziom"
  },
  'weaponPick': {
    'title': "Wybierz swoją broń",
    'subtitle': "Twoja na poziom {n}. Więcej czeka na drodze.",
    'take': "Bierz",
    'rocket': {
      'a': "Salwa samonaprowadzająca",
      'b': "Obrażenia wybuchowe"
    },
    'gatling': {
      'a': "Dwa razy szybszy ogień",
      'b': "Szybciej pompuje bramy"
    }
  },
  'bossReward': {
    'title': "Boss pokonany!",
    'subtitle': "Prezent na poziom {n}. Biegnij dalej!"
  },
  'result': {
    'stageClear': 'Etap ukończony!',
    'clearedStage': 'Etap {n} ukończony!',
    'wipedOut': 'Oddział wybity',
    'reachedStage': 'Etap {n}',
    'newRecord': 'Nowy rekord!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Boss powalony!',
    'wasted': 'Koniec',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Kamień milowy!',
    'rallied': 'Drugi oddech',
    'peakSquad': 'Największy oddział',
    'kills': 'Zabici',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Monety potrojone!',
    'nextStage': 'Następny etap',
    'tryAgain': 'Spróbuj ponownie',
    'upgrade': 'Ulepsz',
    'upgradeHint': 'Ulepsz swój oddział!',
    'rankOf': 'z {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Udostępnij wynik',
    'text': 'Dotarłem do poziomu {n} w {game}. Zajdziesz dalej?'
  },

  'leaderboard': {
    'title': 'Ranking',
    'rank': '#',
    'player': 'Gracz',
    'stage': 'Etap',
    'squad': 'Oddział',
    'empty': 'Brak wyników. Bądź pierwszy!',
    'failed': 'Nie można wczytać rankingu.',
    'loading': 'Wczytywanie…',
    'you': 'Ty',
    'yourRank': 'Jesteś #{n} z {total}',
    'tabGlobal': 'Światowy'
  },

  'chest': {
    'label': 'Skrzynia skarbów',
    'ready': 'Otwórz skrzynię za {n} monet',
    'filling': 'Skrzynia skarbów — napełnia się',
    'spent': 'Skrzynia skarbów — pusta do jutra'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Codzienna wyprawa',
    'hud': 'Wyprawa',
    'multiplier': '{n}×',
    'available': 'Codzienna wyprawa — dzisiejsza trasa, potrójne monety',
    'confirm': 'Rozpocznij wyprawę',
    'spent': 'Codzienna wyprawa — nowa trasa za {time}',
    'done': 'Wróć jutro',
    'back': 'Powrót do kampanii'
  },

  'skills': {

    'grenade': 'Granat',

    'shield': 'Tarcza',

    'locked': 'Zablokowane',

    'unlocksAt': 'Od poziomu {n}',

    'frost': 'Mroźna nowa',

    'decoy': 'Raca-wabik',

    'trialLabel': '{name} · darmowa próba',

    'trialTag': 'Darmowa próba!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Zabrało wszystkich.',
    'alive': 'Wciąż żyją.',
    'go': 'Idź po nich.',
    'skip': 'Pomiń'
  },

  'upgrades': {
    'title': 'Ulepszenia',
    'spotlight': 'Wydaj!',
    'level': 'Poz. {n}',
    'maxed': 'Maks',
    'peekLabel': 'Ulepszenia: {name}',
    'peekLabelReady': 'Ulepszenia: {name} — {n} do kupienia',
    'names': {
      'squad': 'Oddział',
      'power': 'Siła ognia',
      'rate': 'Szybkostrzelność',
      'range': 'Zasięg',
      'scavenge': 'Zbieractwo',
      'grenade': 'Granat',
      'shield': 'Tarcza',
      'rocket': 'Moc rakiet',
      'gatling': 'Moc Gatlinga',
      'grapeshot': 'Moc kartacza',
      'dynamo': 'Moc Dynama',
      'gravecall': 'Moc zewu grobu',
      'hoard': 'Moc skarbu'
    },
    'descriptions': {
      'squad': 'Zaczynaj każdy etap z większą liczbą ocalałych.',
      'power': 'Każdy ocalały zadaje większe obrażenia na strzał.',
      'rate': 'Każdy ocalały strzela szybciej.',
      'range': 'Twój oddział otwiera ogień dalej na drodze.',
      'scavenge': 'Zdobywaj więcej monet w każdej rundzie.',
      'grenade': 'Rzuć granat, by zadać potężne obrażenia.',
      'shield': 'Zmniejsz o połowę obrażenia oddziału na kilka sekund.',
      'rocket': 'Wyrzutnie rakiet zdobyte na etapie zadają więcej obrażeń.',
      'gatling': 'Gatlingi zdobyte na etapie zadają więcej obrażeń.',
      'grapeshot': 'Strzelby zdobyte na etapie zadają więcej obrażeń.',
      'dynamo': 'Pioruny Dynama zdobyte na etapie uderzają mocniej.',
      'gravecall': 'Wskrzeszeni umarli walczą mocniej i żyją dłużej.',
      'hoard': 'Wrogowie zamienieni w złoto dają więcej monet.'
    }
  },

  'options': {
    'title': 'Opcje', 'general': 'Ogólne', 'audio': 'Dźwięk', 'language': 'Język',
    'difficulty': 'Trudność', 'soundEffects': 'Efekty dźwiękowe', 'music': 'Muzyka', 'musicTrack': 'Utwór',
    'musicTracks': { 'cozy': 'Przytulna harmonia', 'trance': 'Tunel trance' },
    'haptics': 'Wibracje', 'on': 'Wł.', 'off': 'Wył.',
    'close': 'Zapisz i zamknij',
    'difficulties': { 'easy': 'Łatwy', 'medium': 'Średni', 'hard': 'Trudny' },
    'difficultyHints': {
      'easy': 'Słabsi wrogowie i cieńsze barykady.',
      'medium': 'Standardowa rozgrywka.',
      'hard': 'Twardsi wrogowie i mocniejsze barykady.'
    }
  },

  'adsBlocked': {
    'title': 'Nie udało się wyświetlić reklamy',
    'body': 'Chcieliśmy pokazać film, byś odebrał nagrodę, ale coś w przeglądarce blokuje reklamy.',
    'allowPrefix': 'Zezwól na reklamy na',
    'allowSuffix': '(lub wstrzymaj blokadę reklam dla tej gry) i spróbuj ponownie.',
    'gotIt': 'Rozumiem'
  },
  'saveStatus': {
    'restoredTitle': 'Zapis w chmurze przywrócony', 'restoredBody': '+{n} monet bonusu za odzyskanie',
    'tap': 'dotknij', 'pausedTitle': 'Synchronizacja wstrzymana',
    'pausedBody': 'Grasz offline. Postęp jest zapisywany tutaj.',
    'retry': 'Ponów', 'dismiss': 'zamknij'
  },
  'loading': { 'tooLong': 'Ładowanie trwa zbyt długo? Wyłącz blokadę reklam i odśwież.', 'boo': 'Bu!', 'laugh': 'Hahaha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Obróć telefon',
    'body': 'W Survivalist gra się w pionie.'
  },
  'license': { 'denied': 'Odmowa dostępu: kup licencję.' }
}
