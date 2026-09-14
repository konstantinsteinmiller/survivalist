export default {
  'gameName': 'Survivalist',
  'cancel': 'Болдырмау',
  'close': 'Жабу',
  'ok': 'Жарайды',
  'continue': 'Жалғастыру',
  'tapToContinue': 'Жалғастыру үшін түртіңіз',
  'clickToContinue': 'Жалғастыру үшін басыңыз',
  'rewards': 'СЫЙЛЫҚТАР',
  'tip': 'Кеңес',
  'crazyGamesOnly': 'Бұл ойын тек мына жерде қолжетімді:',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Келесі',
    'replay': 'Қайта',
    'back': 'Артқа',
    'play': 'Ойнау',
    'pause': 'Кідіріс',
    'menu': 'Мәзір',
    'home': 'Басты бет',
    'info': 'Ақпарат'
  },

  'hud': {
    'stage': '{n}-кезең',
    'best': 'Рекорд {n}',
    'boss': 'Бос',
    'miniboss': 'Мини-бос',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Келесі бонусқа дейінгі кезеңдер',
    'fireRate': 'Қарқын',
    'incoming': 'Шабуыл келеді!',
    'dodge': 'Жалтар',
    'getIn': 'Ішіне',
    'holdStill': 'Қимылдама',
    'milestone': '{n} жауынгер!',
    'weaponActive': '{name} дайын',
    'weaponsActive': '{a} + {b} дайын',
    'weaponLocked': '{name} құлыпталған — {total} тұтқаның {n} атылды',
    'weaponGift': '{name} алда — тегін, иінтіректерсіз',
    'weaponFree': 'ТЕГІН'
  },

  'weapons': {
    'rocket': 'Зымыран атқыш',
    'gatling': 'Гатлинг пулемёті'
  },

  'offer': {
    'confirm': 'Жарнаманы көру',
    'available': 'Бейнені көріп, {weapon} тегін алыңыз'
  },

  'tutorial': {
    'touch': 'Жасағыңды жылжыту үшін сипаңыз',
    'desktop': 'Жасағыңды бағыттау үшін тінтуірді жылжытыңыз'
  },
  'hints': {
    'move': { 'touch': 'Жылжу үшін түртіңіз', 'desktop': 'Жылжу үшін басыңыз' },
    'trap': { 'touch': 'Қызыл қақпа жасақты АЗАЙТАДЫ — екіншісін таңдаңыз!', 'desktop': 'Қызыл қақпа жасақты АЗАЙТАДЫ — екіншісін таңдаңыз!' },
    'divider': { 'touch': 'Қақпалар арасындағы бағанаға тиюге болмайды', 'desktop': 'Қақпалар арасындағы бағанаға тиюге болмайды' },
    'crate': { 'touch': 'Жасыл жәшік: бәрі күштірек соғады', 'desktop': 'Жасыл жәшік: бәрі күштірек соғады' },
    'rate': { 'touch': 'Көк жәшік: бәрі жылдамырақ атады', 'desktop': 'Көк жәшік: бәрі жылдамырақ атады' },
    'lever': { 'touch': 'Жол шетіндегі ЕКІ тұтқаны да ат — олар қару жәшігін ашады', 'desktop': 'Жол шетіндегі ЕКІ тұтқаны да ат — олар қару жәшігін ашады' },
    'cage': { 'touch': 'Торларды ат — тұтқындар отрядыңа қосылады', 'desktop': 'Торларды ат — тұтқындар отрядыңа қосылады' },
    'shieldBox': { 'touch': 'Қалқан жәшігі — күтіп тұрып, бір ауыр соққыны тоқтатады', 'desktop': 'Қалқан жәшігі — күтіп тұрып, бір ауыр соққыны тоқтатады' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} аман қалған айырбасталды',
    'unlocked': 'Ашылды!',

    'guardian': "Күзетші періште сені құтқарды!",

    'guardianSub': "{n} тірі қалған оралды",

    'next': "Келесі: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Қару таңдаңыз",
    'nextStage': "келесі деңгей",
    'stagesAway': "{n} деңгейден кейін"
  },
  'weaponPick': {
    'title': "Қаруыңызды таңдаңыз",
    'subtitle': "{n}-деңгейге сіздікі. Жолда тағы бар.",
    'take': "Алу",
    'rocket': {
      'a': "Бағыттаушы залп",
      'b': "Жарылыс зақымы"
    },
    'gatling': {
      'a': "Екі есе жылдам ату",
      'b': "Қақпаларды тезірек толтырады"
    }
  },
  'bossReward': {
    'title': "Бос жеңілді!",
    'subtitle': "{n}-деңгейге сыйлық. Жүгіре бер!"
  },
  'result': {
    'stageClear': 'Кезең өтті!',
    'wipedOut': 'Жасақ жойылды',
    'reachedStage': '{n}-кезең',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n} %',
    'bestReach': 'Рекорд {n} %',
    'newReach': 'Ең алысы!',
    'newRecord': 'Жаңа рекорд!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Босс құлады!',
    'wasted': 'Құрыды',
    'cause': {
      'foe': 'Құбыжықтар басып қалды',
      'elite': 'Шағын босс күйретті',
      'barricade': 'Бөгеттерге соғылдың',
      'crate': 'Жәшіктерге соғылдың',
      'divider': 'Бөлгіштерге ілікті',
      'trap': 'Қақпанға түсті',
      'slam': 'Босс жаныштап тастады'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Белес!',
    'rallied': 'Екінші тыныс',
    'peakSquad': 'Ең үлкен жасақ',
    'kills': 'Жойылған',
    'tripleCoins': '×3',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Монеталар үш еселенді!',
    'nextStage': 'Келесі кезең',
    'tryAgain': 'Қайта көру',
    'upgrade': 'Жақсарту',
    'upgradeHint': 'Жасағыңды жақсарт!',
    'rankOf': '{n} ішінде',
    'upNext': 'Келесі: {n}-деңгей'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Ойынды бөлісу',
    'text': '{game} ойынында {n}-деңгейге жеттім. Одан әрі бара аласың ба?'
  },

  'leaderboard': {
    'title': 'Көшбасшылар',
    'rank': '#',
    'player': 'Ойыншы',
    'stage': 'Кезең',
    'squad': 'Жасақ',
    'empty': 'Әзірге бос. Бірінші болыңыз!',
    'failed': 'Көшбасшылар тізімі қолжетімсіз.',
    'loading': 'Жүктелуде…',
    'you': 'Сіз',
    'yourRank': '{total} ойыншыдан #{n} орындасыз'
  },

  'chest': {
    'label': 'Қазына сандығы',
    'ready': 'Сандықты {n} монетаға ашу',
    'filling': 'Қазына сандығы толып жатыр',
    'spent': 'Қазына сандығы ертеңге дейін бос'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Күнделікті экспедиция',
    'hud': 'Экспедиция',
    'multiplier': '×{n}',
    'available': 'Күнделікті экспедиция — бүгінгі жол, үш есе тиын',
    'confirm': 'Экспедицияны бастау',
    'spent': 'Күнделікті экспедиция — жаңа жол {time} ішінде',
    'done': 'Ертең келіңіз',
    'back': 'Науқанға оралу'
  },

  'skills': {

    'grenade': 'Граната',

    'shield': 'Қалқан',

    'locked': 'Жабық',

    'unlocksAt': '{n}-деңгейде ашылады',

    'frost': 'Мұзды нова',

    'decoy': 'Алдамшы алау',

    'trialLabel': '{name} · тегін',

    'trialTag': 'Тегін сынап көр!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': 'Жақсартулар',
    'spotlight': 'Жұмсаңыз!',
    'level': 'Дең. {n}',
    'maxed': 'Макс',
    'names': {
      'squad': 'Жасақ',
      'power': 'Оқ күші',
      'rate': 'Ату жылдамдығы',
      'range': 'Қашықтық',
      'scavenge': 'Жинау',
      'grenade': 'Граната',
      'shield': 'Қалқан',
      'rocket': 'Зымыран күші',
      'gatling': 'Гатлинг күші'
    },
    'descriptions': {
      'squad': 'Әр кезеңді көбірек аман қалғанмен бастаңыз.',
      'power': 'Әр аман қалған атқан сайын көбірек зақым келтіреді.',
      'rate': 'Әр аман қалған жылдамырақ атады.',
      'range': 'Жасағың жолда алысырақтан оқ ашады.',
      'scavenge': 'Әр ойыннан көбірек монета алыңыз.',
      'grenade': 'Ауыр зақым үшін граната лақтыр.',
      'shield': 'Бірнеше секунд жасаққа келетін зақымды екі есе азайтады.',
      'rocket': 'Кезеңде ашылған зымыран атқыштар көбірек зақым келтіреді.',
      'gatling': 'Кезеңде ашылған гатлингтер көбірек зақым келтіреді.'
    }
  },

  'options': {
    'title': 'Параметрлер', 'general': 'Жалпы', 'audio': 'Дыбыс', 'language': 'Тіл',
    'difficulty': 'Қиындық', 'soundEffects': 'Дыбыс әсерлері', 'music': 'Музыка', 'musicTrack': 'Музыка тректі',
    'musicTracks': { 'cozy': 'Жайлы үндестік', 'trance': 'Транс туннелі' },
    'haptics': 'Діріл', 'on': 'Қосулы', 'off': 'Өшірулі',
    'close': 'Сақтап жабу',
    'difficulties': { 'easy': 'Оңай', 'medium': 'Орташа', 'hard': 'Қиын' },
    'difficultyHints': {
      'easy': 'Әлсіз жаулар және жұқа бөгеттер.',
      'medium': 'Қалыпты ойын.',
      'hard': 'Мықты жаулар және ауыр бөгеттер.'
    }
  },

  'adsBlocked': {
    'title': 'Жарнаманы көрсету мүмкін болмады',
    'body': 'Сыйлық алуыңыз үшін бейне көрсетпек едік, бірақ браузеріңіздегі бірдеңе жарнаманы бөгеп тұр.',
    'allowPrefix': 'Мына жерде жарнамаға рұқсат беріңіз:',
    'allowSuffix': '(немесе осы ойын үшін жарнама бөгегішін тоқтатыңыз) және қайталап көріңіз.',
    'gotIt': 'Түсінікті'
  },
  'saveStatus': {
    'restoredTitle': 'Бұлттық сақтау қалпына келтірілді', 'restoredBody': 'Қалпына келтіру үшін +{n} бонус тиын',
    'tap': 'түрту', 'pausedTitle': 'Бұлттық синхрондау тоқтатылды',
    'pausedBody': 'Желіден тыс ойнап жатырсыз. Прогресіңіз осында сақталады.',
    'retry': 'Қайталау', 'dismiss': 'жасыру'
  },
  'loading': { 'tooLong': 'Жүктеу тым ұзаққа созылды ма? Жарнама бөгегішін өшіріп, бетті жаңартыңыз.', 'boo': 'Бу!', 'laugh': 'Ха-ха-ха!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Телефонды бұр',
    'body': 'Survivalist тік режимде ойналады.'
  },
  'license': { 'denied': 'Кіруге тыйым салынды: лицензия сатып алыңыз.' }
}
