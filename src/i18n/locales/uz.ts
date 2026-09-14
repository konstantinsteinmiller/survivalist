export default {
  'gameName': 'Survivalist',
  'cancel': 'Bekor qilish',
  'close': 'Yopish',
  'ok': 'Ok',
  'continue': 'Davom etish',
  'tapToContinue': 'Davom etish uchun bosing',
  'clickToContinue': 'Davom etish uchun cherting',
  'rewards': 'MUKOFOTLAR',
  'tip': 'Maslahat',
  'crazyGamesOnly': 'Bu o‘yin faqat quyidagi joyda mavjud:',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Keyingi',
    'replay': 'Qayta',
    'back': 'Orqaga',
    'play': 'Oʻynash',
    'pause': 'Pauza',
    'menu': 'Menyu',
    'home': 'Bosh sahifa',
    'info': 'Maʼlumot'
  },

  'hud': {
    'stage': '{n}-bosqich',
    'best': 'Rekord {n}',
    'boss': 'Bos',
    'miniboss': 'Mini bos',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Keyingi bonusgacha bosqichlar',
    'fireRate': 'Tezlik',
    'incoming': 'Hujum kelmoqda!',
    'dodge': 'Chetlan',
    'getIn': 'Ichiga',
    'holdStill': 'Qimirlama',
    'milestone': '{n} jangchi!',
    'weaponActive': '{name} tayyor',
    'weaponsActive': '{a} + {b} tayyor',
    'weaponLocked': '{name} qulflangan — {total} tadan {n} ta richag otildi',
    'weaponGift': '{name} oldinda — bepul, richaglarsiz',
    'weaponFree': 'BEPUL'
  },

  'weapons': {
    'rocket': 'Raketa otar',
    'gatling': 'Gatling pulemyoti'
  },

  'tutorial': {
    'touch': 'Otryadni harakatlantirish uchun suring',
    'desktop': 'Otryadni boshqarish uchun sichqonchani suring'
  },
  'hints': {
    'move': { 'touch': 'Harakat uchun bosing', 'desktop': 'Harakat uchun bosing' },
    'trap': { 'touch': 'Qizil darvoza guruhni KAMAYTIRADI — boshqasini tanlang!', 'desktop': 'Qizil darvoza guruhni KAMAYTIRADI — boshqasini tanlang!' },
    'divider': { 'touch': 'Darvozalar orasidagi ustunga hech tegmang', 'desktop': 'Darvozalar orasidagi ustunga hech tegmang' },
    'crate': { 'touch': 'Yashil sandiq: hamma kuchliroq uradi', 'desktop': 'Yashil sandiq: hamma kuchliroq uradi' },
    'rate': { 'touch': 'Ko‘k sandiq: hamma tezroq otadi', 'desktop': 'Ko‘k sandiq: hamma tezroq otadi' },
    'lever': { 'touch': 'Yo‘l chetidagi IKKALA richagni ham ot — ular qurol sandig‘ini ochadi', 'desktop': 'Yo‘l chetidagi IKKALA richagni ham ot — ular qurol sandig‘ini ochadi' },
    'cage': { 'touch': 'Qafaslarni otib och — mahbuslar otryadingga qo‘shiladi', 'desktop': 'Qafaslarni otib och — mahbuslar otryadingga qo‘shiladi' },
    'shieldBox': { 'touch': 'Qalqon quti — kutadi va bitta kuchli zarbani to‘xtatadi', 'desktop': 'Qalqon quti — kutadi va bitta kuchli zarbani to‘xtatadi' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} omon qolgan naqdlandi',
    'unlocked': 'Ochildi!',

    'guardian': "Qo'riqchi farishta seni qutqardi!",

    'guardianSub': "{n} omon qolgan qaytdi",

    'next': "Keyingi: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Qurol tanlang",
    'nextStage': "keyingi bosqich",
    'stagesAway': "{n} bosqichdan keyin"
  },
  'weaponPick': {
    'title': "Qurolingizni tanlang",
    'subtitle': "{n}-bosqich uchun sizniki. Yo'lda yana bor.",
    'take': "Olish",
    'rocket': {
      'a': "O'z-o'zini yo'naltiruvchi zalp",
      'b': "Portlash zarari"
    },
    'gatling': {
      'a': "Ikki barobar tez otish",
      'b': "Darvozalarni tezroq to'ldiradi"
    }
  },
  'bossReward': {
    'title': "Bos yengildi!",
    'subtitle': "{n}-bosqich uchun sovg'a. Yugurishda davom et!"
  },
  'result': {
    'stageClear': 'Bosqich tugadi!',
    'wipedOut': 'Guruh yo‘q qilindi',
    'reachedStage': '{n}-bosqich',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n}%',
    'bestReach': 'Rekord {n}%',
    'newReach': 'Eng uzoq!',
    'newRecord': 'Yangi rekord!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Boss quladi!',
    'wasted': 'Tamom',
    'cause': {
      'foe': 'Maxluqlar bosib ketdi',
      'elite': 'Miniboss sindirdi',
      'barricade': 'To‘siqlarga urildingiz',
      'crate': 'Yashiklarga urildingiz',
      'divider': 'Ajratgichlarga ilindingiz',
      'trap': 'Tuzoqqa tushdingiz',
      'slam': 'Boss yanchib tashladi'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Bosqich!',
    'rallied': 'Ikkinchi nafas',
    'peakSquad': 'Eng katta guruh',
    'kills': 'Yo‘q qilingan',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Tangalar uch barobar!',
    'nextStage': 'Keyingi bosqich',
    'tryAgain': 'Qayta urinish',
    'upgrade': 'Yaxshilash',
    'upgradeHint': 'Otryadingizni yaxshilang!',
    'rankOf': '{n} dan',
    'upNext': 'Keyingi: {n}-bosqich'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': "O'yinni ulashish",
    'text': '{game} o‘yinida {n}-bosqichga yetdim. Undan uzoqroqqa bora olasanmi?'
  },

  'leaderboard': {
    'title': 'Reyting',
    'rank': '#',
    'player': 'O‘yinchi',
    'stage': 'Bosqich',
    'squad': 'Guruh',
    'empty': 'Hozircha bo‘sh. Birinchi bo‘ling!',
    'failed': 'Reytingga ulanib bo‘lmadi.',
    'loading': 'Yuklanmoqda…',
    'you': 'Siz',
    'yourRank': '{total} o‘yinchidan #{n} o‘rindasiz'
  },

  'chest': {
    'label': 'Xazina sandiqi',
    'ready': 'Sandiqni {n} tanga uchun oching',
    'filling': 'Xazina sandiqi to‘lmoqda',
    'spent': 'Xazina sandiqi ertagacha bo‘sh'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Kunlik ekspeditsiya',
    'hud': 'Ekspeditsiya',
    'multiplier': '{n}×',
    'available': 'Kunlik ekspeditsiya — bugungi yo‘l, uch barobar tanga',
    'confirm': 'Ekspeditsiyani boshlash',
    'spent': 'Kunlik ekspeditsiya — yangi yo‘l {time} dan keyin',
    'done': 'Ertaga qayting',
    'back': 'Kampaniyaga qaytish'
  },

  'skills': {

    'grenade': 'Granata',

    'shield': 'Qalqon',

    'locked': 'Yopiq',

    'unlocksAt': '{n}-bosqichda ochiladi',

    'frost': 'Muz novasi',

    'decoy': 'Aldamchi mashʼal',

    'trialLabel': '{name} · bepul',

    'trialTag': 'Bepul sinab koʻr!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': 'Yaxshilashlar',
    'spotlight': 'Sarflang!',
    'level': 'Dar. {n}',
    'maxed': 'Maks',
    'names': {
      'squad': 'Guruh',
      'power': 'Otish kuchi',
      'rate': 'Otish tezligi',
      'range': 'Masofa',
      'scavenge': 'Yig‘ish',
      'grenade': 'Granata',
      'shield': 'Qalqon',
      'rocket': 'Raketa kuchi',
      'gatling': 'Gatling kuchi'
    },
    'descriptions': {
      'squad': 'Har bosqichni ko‘proq omon qolgan bilan boshlang.',
      'power': 'Har bir omon qolgan har otishda ko‘proq zarar beradi.',
      'rate': 'Har bir omon qolgan tezroq otadi.',
      'range': 'Otryading yo‘lda uzoqroqdan o‘q ochadi.',
      'scavenge': 'Har o‘yindan ko‘proq tanga oling.',
      'grenade': "Og'ir zarar uchun granata uloqtiring.",
      'shield': 'Bir necha soniya otryadga zararni yarmiga kamaytiradi.',
      'rocket': 'Bosqichda ochilgan raketa otarlar ko‘proq zarar yetkazadi.',
      'gatling': 'Bosqichda ochilgan gatlinglar ko‘proq zarar yetkazadi.'
    }
  },

  'options': {
    'title': 'Sozlamalar', 'general': 'Umumiy', 'audio': 'Ovoz', 'language': 'Til',
    'difficulty': 'Qiyinlik', 'soundEffects': 'Ovoz effektlari', 'music': 'Musiqa', 'musicTrack': 'Musiqa treki',
    'musicTracks': { 'cozy': 'Qulay ohang', 'trance': 'Trans tunneli' },
    'haptics': 'Tebranish', 'on': 'Yoqilgan', 'off': 'O’chirilgan',
    'close': 'Saqlash va yopish',
    'difficulties': { 'easy': 'Oson', 'medium': 'O‘rta', 'hard': 'Qiyin' },
    'difficultyHints': {
      'easy': 'Kuchsizroq dushmanlar va ingichka to‘siqlar.',
      'medium': 'Standart o‘yin.',
      'hard': 'Kuchliroq dushmanlar va og‘ir to‘siqlar.'
    }
  },

  'adsBlocked': {
    'title': 'Reklamani ko‘rsatib bo‘lmadi',
    'body': 'Mukofot olishingiz uchun video ko‘rsatmoqchi edik, lekin brauzeringizdagi nimadir reklamani to‘smoqda.',
    'allowPrefix': 'Iltimos, quyidagi saytda reklamaga ruxsat bering:',
    'allowSuffix': '(yoki bu o‘yin uchun reklama bloklagichni to‘xtating) va qayta urinib ko‘ring.',
    'gotIt': 'Tushunarli'
  },
  'saveStatus': {
    'restoredTitle': 'Bulutli saqlash tiklandi', 'restoredBody': 'Tiklash uchun +{n} bonus tanga',
    'tap': 'bosing', 'pausedTitle': 'Bulutli sinxronlash to‘xtatildi',
    'pausedBody': 'Oflayn o‘ynayapsiz. Yutuqlaringiz shu yerda saqlanadi.',
    'retry': 'Qayta urinish', 'dismiss': 'yashirish'
  },
  'loading': { 'tooLong': 'Yuklash juda uzoq davom etyaptimi? Reklama bloklagichni o‘chirib, sahifani yangilang.', 'boo': 'Bu!', 'laugh': 'Hahaha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Telefonni burang',
    'body': 'Survivalist tik holatda o‘ynaladi.'
  },
  'license': { 'denied': 'Kirish rad etildi: iltimos, litsenziya sotib oling.' }
}
