export default {
  'gameName': 'Survivalist',
  'cancel': 'Batal',
  'close': 'Tutup',
  'ok': 'Oke',
  'continue': 'Lanjut',
  'tapToContinue': 'Ketuk untuk lanjut',
  'clickToContinue': 'Klik untuk lanjut',
  'rewards': 'HADIAH',
  'tip': 'Tips',
  'crazyGamesOnly': 'Gim ini hanya tersedia di',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Lanjut',
    'replay': 'Ulangi',
    'back': 'Kembali',
    'play': 'Main',
    'pause': 'Jeda',
    'menu': 'Menu',
    'home': 'Beranda',
    'info': 'Info'
  },

  'hud': {
    'stage': 'Tahap {n}',
    'best': 'Rekor {n}',
    'boss': 'Bos',
    'miniboss': 'Mini Bos',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Tahap menuju bonus berikutnya',
    'fireRate': 'Laju',
    'incoming': 'Serangan datang!',
    'dodge': 'Hindari',
    'getIn': 'Masuk',
    'holdStill': 'Diam',
    'milestone': '{n} pasukan!',
    'weaponActive': '{name} siap',
    'weaponsActive': '{a} + {b} siap',
    'weaponLocked': '{name} terkunci — {n} dari {total} tuas ditembak',
    'weaponGift': '{name} di depan — gratis, tanpa tuas',
    'weaponFree': 'GRATIS'
  },

  'weapons': {
    'rocket': 'Peluncur Roket',
    'gatling': 'Senapan Gatling'
  },

  'offer': {
    'confirm': 'Tonton iklan',
    'available': 'Tonton video dan dapatkan {weapon} gratis'
  },

  'tutorial': {
    'touch': 'Geser untuk menggerakkan pasukanmu',
    'desktop': 'Gerakkan mouse untuk mengarahkan pasukan'
  },
  'hints': {
    'move': { 'touch': 'Ketuk untuk bergerak', 'desktop': 'Klik untuk bergerak' },
    'trap': { 'touch': 'Gerbang merah MENGURANGI regu — ambil yang lain!', 'desktop': 'Gerbang merah MENGURANGI regu — ambil yang lain!' },
    'divider': { 'touch': 'Jangan sentuh pilar di antara gerbang', 'desktop': 'Jangan sentuh pilar di antara gerbang' },
    'crate': { 'touch': 'Peti hijau: semua memukul lebih keras', 'desktop': 'Peti hijau: semua memukul lebih keras' },
    'rate': { 'touch': 'Peti biru: semua menembak lebih cepat', 'desktop': 'Peti biru: semua menembak lebih cepat' },
    'lever': { 'touch': 'Tembak KEDUA tuas di tepi jalan — keduanya membuka kotak senjata', 'desktop': 'Tembak KEDUA tuas di tepi jalan — keduanya membuka kotak senjata' },
    'cage': { 'touch': 'Tembak kandang — tawanannya bergabung ke pasukanmu', 'desktop': 'Tembak kandang — tawanannya bergabung ke pasukanmu' },
    'shieldBox': { 'touch': 'Kotak perisai — menunggu, lalu menahan satu pukulan besar', 'desktop': 'Kotak perisai — menunggu, lalu menahan satu pukulan besar' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} penyintas diuangkan',
    'unlocked': 'Terbuka!',

    'guardian': "Malaikat pelindung menyelamatkanmu!",

    'guardianSub': "{n} penyintas kembali",

    'next': "Berikutnya: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Pilih senjata",
    'nextStage': "level berikutnya",
    'stagesAway': "{n} level lagi"
  },
  'weaponPick': {
    'title': "Pilih senjatamu",
    'subtitle': "Milikmu untuk Level {n}. Masih ada lagi di jalan.",
    'take': "Ambil",
    'rocket': {
      'a': "Salvo pelacak",
      'b': "Kerusakan ledakan"
    },
    'gatling': {
      'a': "Laju tembak dua kali lipat",
      'b': "Memompa gerbang lebih cepat"
    }
  },
  'bossReward': {
    'title': "Bos dikalahkan!",
    'subtitle': "Hadiah untuk Level {n}. Terus berlari!"
  },
  'result': {
    'stageClear': 'Tahap selesai!',
    'wipedOut': 'Regu habis',
    'reachedStage': 'Tahap {n}',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n}%',
    'bestReach': 'Rekor {n}%',
    'newReach': 'Terjauh sejauh ini!',
    'newRecord': 'Rekor baru!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Bos tumbang!',
    'wasted': 'Tamat',
    'cause': {
      'foe': 'Dibanjiri monster',
      'elite': 'Minibos menghabisimu',
      'barricade': 'Menabrak barikade',
      'crate': 'Menabrak peti',
      'divider': 'Menyerempet pembatas',
      'trap': 'Terjebak perangkap',
      'slam': 'Bos meremukkanmu'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Pencapaian!',
    'rallied': 'Napas kedua',
    'peakSquad': 'Regu terbesar',
    'kills': 'Bunuh',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Koin dilipatgandakan!',
    'nextStage': 'Tahap berikutnya',
    'tryAgain': 'Coba lagi',
    'upgrade': 'Tingkatkan',
    'upgradeHint': 'Tingkatkan pasukanmu!',
    'rankOf': 'dari {n}',
    'upNext': 'Berikutnya: Level {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Bagikan permainan',
    'text': 'Aku mencapai level {n} di {game}. Bisa lebih jauh dari itu?'
  },

  'leaderboard': {
    'title': 'Papan Peringkat',
    'rank': '#',
    'player': 'Pemain',
    'stage': 'Tahap',
    'squad': 'Regu',
    'empty': 'Belum ada skor. Jadilah yang pertama!',
    'failed': 'Papan peringkat tidak terjangkau.',
    'loading': 'Memuat…',
    'you': 'Kamu',
    'yourRank': 'Kamu peringkat #{n} dari {total}'
  },

  'chest': {
    'label': 'Peti harta',
    'ready': 'Buka peti harta untuk {n} koin',
    'filling': 'Peti harta sedang terisi',
    'spent': 'Peti harta kosong sampai besok'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Ekspedisi Harian',
    'hud': 'Ekspedisi',
    'multiplier': '{n}×',
    'available': 'Ekspedisi harian — jalur hari ini, koin tiga kali lipat',
    'confirm': 'Mulai ekspedisi',
    'spent': 'Ekspedisi harian — jalur baru dalam {time}',
    'done': 'Kembali besok',
    'back': 'Kembali ke kampanye'
  },

  'skills': {

    'grenade': 'Granat',

    'shield': 'Perisai',

    'locked': 'Terkunci',

    'unlocksAt': 'Terbuka di level {n}',

    'frost': 'Nova Beku',

    'decoy': 'Suar Umpan',

    'trialLabel': '{name} · coba gratis',

    'trialTag': 'Coba gratis!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': 'Peningkatan',
    'spotlight': 'Belanja!',
    'level': 'Lv {n}',
    'maxed': 'Maks',
    'names': {
      'squad': 'Regu',
      'power': 'Daya tembak',
      'rate': 'Laju tembak',
      'range': 'Jangkauan',
      'scavenge': 'Pemulungan',
      'grenade': 'Granat',
      'shield': 'Perisai',
      'rocket': 'Kekuatan Roket',
      'gatling': 'Kekuatan Gatling'
    },
    'descriptions': {
      'squad': 'Mulai tiap tahap dengan lebih banyak penyintas.',
      'power': 'Tiap penyintas memberi damage lebih besar per tembakan.',
      'rate': 'Tiap penyintas menembak lebih cepat.',
      'range': 'Pasukanmu melepas tembakan lebih jauh di jalan.',
      'scavenge': 'Dapatkan lebih banyak koin tiap ronde.',
      'grenade': 'Lempar granat untuk ledakan kerusakan besar.',
      'shield': 'Kurangi setengah kerusakan pada pasukan beberapa detik.',
      'rocket': 'Peluncur roket yang kamu buka di stage memberi lebih banyak damage.',
      'gatling': 'Senapan Gatling yang kamu buka di stage memberi lebih banyak damage.'
    }
  },

  'options': {
    'title': 'Opsi', 'general': 'Umum', 'audio': 'Audio', 'language': 'Bahasa',
    'difficulty': 'Kesulitan', 'soundEffects': 'Efek Suara', 'music': 'Musik', 'musicTrack': 'Trek Musik',
    'musicTracks': { 'cozy': 'Harmoni Nyaman', 'trance': 'Terowongan Trance' },
    'haptics': 'Getaran', 'on': 'Aktif', 'off': 'Nonaktif',
    'close': 'Simpan & Tutup',
    'difficulties': { 'easy': 'Mudah', 'medium': 'Sedang', 'hard': 'Sulit' },
    'difficultyHints': {
      'easy': 'Musuh lebih lemah dan barikade lebih tipis.',
      'medium': 'Ronde standar.',
      'hard': 'Musuh lebih kuat dan barikade lebih tebal.'
    }
  },

  'adsBlocked': {
    'title': 'Tidak dapat menampilkan iklan',
    'body': 'Kami mencoba menampilkan video agar kamu bisa mendapat hadiah, tetapi ada yang memblokir iklan di peramban kamu.',
    'allowPrefix': 'Izinkan iklan di',
    'allowSuffix': '(atau jeda pemblokir iklan untuk gim ini) lalu coba lagi.',
    'gotIt': 'Mengerti'
  },
  'saveStatus': {
    'restoredTitle': 'Simpanan cloud dipulihkan', 'restoredBody': '+{n} koin bonus untuk pemulihan',
    'tap': 'ketuk', 'pausedTitle': 'Sinkronisasi cloud dijeda',
    'pausedBody': 'Bermain offline. Progresmu disimpan di sini.',
    'retry': 'Coba lagi', 'dismiss': 'tutup'
  },
  'loading': { 'tooLong': 'Memuat terlalu lama? Nonaktifkan pemblokir iklan lalu muat ulang.', 'boo': 'Dor!', 'laugh': 'Hahaha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Putar ponselmu',
    'body': 'Survivalist dimainkan tegak.'
  },
  'license': { 'denied': 'Akses ditolak: silakan beli lisensi.' }
}
