export default {
  'gameName': 'Survivalist',
  'cancel': 'İptal',
  'close': 'Kapat',
  'ok': 'Tamam',
  'continue': 'Devam',
  'tapToContinue': 'Devam etmek için dokun',
  'clickToContinue': 'Devam etmek için tıkla',
  'rewards': 'ÖDÜLLER',
  'tip': 'İpucu',
  'crazyGamesOnly': 'Bu oyun yalnızca şurada mevcut:',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'İleri',
    'replay': 'Tekrar',
    'back': 'Geri',
    'play': 'Oyna',
    'pause': 'Duraklat',
    'menu': 'Menü',
    'home': 'Ana ekran',
    'info': 'Bilgi'
  },

  'hud': {
    'stage': 'Bölüm {n}',
    'best': 'Rekor {n}',
    'boss': 'Patron',
    'miniboss': 'Mini Patron',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Sonraki bonusa kalan bölüm',
    'fireRate': 'Hız',
    'incoming': 'Saldırı geliyor!',
    'dodge': 'Kaç',
    'getIn': 'İçine gir',
    'holdStill': 'Kıpırdama',
    'milestone': '{n} savaşçı!',
    'weaponActive': '{name} hazır',
    'weaponsActive': '{a} + {b} hazır',
    'weaponLocked': '{name} kilitli — {total} kolun {n} tanesi vuruldu',
    'weaponGift': '{name} ileride — bedava, kol yok',
    'weaponFree': 'BEDAVA'
  },

  'weapons': {
    'rocket': 'Roketatar',
    'gatling': 'Gatling',
    'grapeshot': 'Saçma',
    'dynamo': 'Dinamo',
    'gravecall': 'Mezar Çağrısı',
    'hoard': 'Karga Hazinesi',
    'bolt': 'Yıldırım'
  },

  'offer': {
    'confirm': 'Reklamı izle',
    'available': 'Video izle, {weapon} bedava kazan'
  },

  'tutorial': {
    'touch': 'Takımını hareket ettirmek için kaydır',
    'desktop': 'Takımını yönlendirmek için fareyi oynat'
  },
  'hints': {
    'move': { 'touch': 'Hareket için dokun', 'desktop': 'Hareket için tıkla' },
    'divider': { 'touch': 'Kapılar arasındaki direğe asla dokunma', 'desktop': 'Kapılar arasındaki direğe asla dokunma' },
    'crate': { 'touch': 'Yeşil sandık: herkes daha sert vurur', 'desktop': 'Yeşil sandık: herkes daha sert vurur' },
    'rate': { 'touch': 'Mavi sandık: herkes daha hızlı ateş eder', 'desktop': 'Mavi sandık: herkes daha hızlı ateş eder' },
    'lever': { 'touch': 'Yol kenarındaki HER İKİ kolu da vur — silah sandığını açarlar', 'desktop': 'Yol kenarındaki HER İKİ kolu da vur — silah sandığını açarlar' },
    'cage': { 'touch': 'Kafeslere ateş et — tutsaklar takımına katılır', 'desktop': 'Kafeslere ateş et — tutsaklar takımına katılır' },
    'shieldBox': { 'touch': 'Kalkan sandığı — bekler, sonra bir büyük darbeyi engeller', 'desktop': 'Kalkan sandığı — bekler, sonra bir büyük darbeyi engeller' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} hayatta kalan bozduruldu',
    'unlocked': 'Açıldı!',

    'guardian': "Bir koruyucu melek seni kurtardı!",

    'guardianSub': "{n} hayatta kalan geri döndü",

    'next': "Sırada: {label} · {when}",
    'bossAhead': "Sıradaki patron: {name}",
    'bossName': {
      'grumpling': "Grumpling",
      'bonecap': "Bonecap",
      'snaggletusk': "Snaggletusk",
      'thornwick': "Thornwick",
      'marrowknight': "Marrowknight",
      'cinderhound': "Cinderhound",
      'rattlejack': "Rattlejack"
    }

  },

  'ladder': {
    'weaponPick': "Silah seç",
    'nextStage': "sonraki bölüm",
    'stagesAway': "{n} bölüm sonra"
  },
  'weaponPick': {
    'title': "Silahını seç",
    'subtitle': "Bölüm {n} için senin. Yolda daha fazlası bekliyor.",
    'take': "Al",
    'rocket': {
      'a': "Güdümlü salvo",
      'b': "Patlama hasarı"
    },
    'gatling': {
      'a': "İki kat atış hızı",
      'b': "Kapıları daha hızlı doldurur"
    }
  },
  'bossReward': {
    'title': "Patron yenildi!",
    'subtitle': "Bölüm {n} için bir hediye. Koşmaya devam!"
  },
  'result': {
    'stageClear': 'Bölüm tamamlandı!',
    'clearedStage': 'Bölüm {n} tamamlandı!',
    'wipedOut': 'Ekip yok edildi',
    'reachedStage': 'Bölüm {n}',
    'newRecord': 'Yeni rekor!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Patron devrildi!',
    'wasted': 'Bitti',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Dönüm noktası!',
    'rallied': 'İkinci nefes',
    'peakSquad': 'En büyük ekip',
    'kills': 'Öldürme',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Altınlar üçe katlandı!',
    'nextStage': 'Sonraki bölüm',
    'tryAgain': 'Tekrar dene',
    'upgrade': 'Geliştir',
    'upgradeHint': 'Takımını geliştir!',
    'rankOf': '{n} içinde'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Koşuyu paylaş',
    'text': '{game} oyununda {n}. bölüme ulaştım. Daha ileri gidebilir misin?'
  },

  'leaderboard': {
    'title': 'Liderlik Tablosu',
    'rank': '#',
    'player': 'Oyuncu',
    'stage': 'Bölüm',
    'squad': 'Ekip',
    'empty': 'Henüz skor yok. İlk sen ol!',
    'failed': 'Liderlik tablosuna ulaşılamadı.',
    'loading': 'Yükleniyor…',
    'you': 'Sen',
    'yourRank': '{total} oyuncu içinde #{n}. sıradasın',
    'tabGlobal': 'Dünya'
  },

  'chest': {
    'label': 'Hazine sandığı',
    'ready': 'Sandığı {n} altın karşılığında aç',
    'filling': 'Hazine sandığı doluyor',
    'spent': 'Hazine sandığı yarına kadar boş'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Günlük Sefer',
    'hud': 'Sefer',
    'multiplier': '{n}×',
    'available': 'Günlük sefer — bugünün yolu, üç kat madeni para',
    'confirm': 'Seferi başlat',
    'spent': 'Günlük sefer — yeni yol {time} sonra',
    'done': 'Yarın gel',
    'back': 'Kampanyaya dön'
  },

  'skills': {

    'grenade': 'El Bombası',

    'shield': 'Kalkan',

    'locked': 'Kilitli',

    'unlocksAt': '{n}. bölümde açılır',

    'frost': 'Buz Novası',

    'decoy': 'Tuzak Fişeği',

    'trialLabel': '{name} · ücretsiz dene',

    'trialTag': 'Ücretsiz dene!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Herkesi götürdü.',
    'alive': 'Hâlâ hayattalar.',
    'go': 'Git ve onları kurtar.',
    'skip': 'Atla'
  },

  'upgrades': {
    'title': 'Geliştirmeler',
    'spotlight': 'Harca!',
    'level': 'Sv {n}',
    'maxed': 'Maks',
    'peekLabel': 'Geliştirmeler: {name}',
    'peekLabelReady': 'Geliştirmeler: {name} — {n} tanesi hemen alınabilir',
    'names': {
      'squad': 'Ekip',
      'power': 'Ateş gücü',
      'rate': 'Atış hızı',
      'range': 'Menzil',
      'scavenge': 'Toplayıcılık',
      'grenade': 'El Bombası',
      'shield': 'Kalkan',
      'rocket': 'Roket Gücü',
      'gatling': 'Gatling Gücü',
      'grapeshot': 'Saçma Gücü',
      'dynamo': 'Dinamo Gücü',
      'gravecall': 'Mezar Gücü',
      'hoard': 'Hazine Gücü'
    },
    'descriptions': {
      'squad': 'Her bölüme daha çok hayatta kalanla başla.',
      'power': 'Her hayatta kalan atış başına daha çok hasar verir.',
      'rate': 'Her hayatta kalan daha hızlı ateş eder.',
      'range': 'Takımın yolda daha ileriden ateş açar.',
      'scavenge': 'Her turdan daha çok altın kazan.',
      'grenade': 'Ağır hasar için el bombası at.',
      'shield': 'Birkaç saniye boyunca alınan hasarı yarıya indirir.',
      'rocket': 'Bölümde açtığın roketatarlar daha çok hasar verir.',
      'gatling': 'Bölümde açtığın Gatlingler daha çok hasar verir.',
      'grapeshot': 'Bölümde açtığın pompalı tüfekler daha çok hasar verir.',
      'dynamo': 'Bölümde açtığın Dinamo yıldırımları daha sert vurur.',
      'gravecall': 'Dirilttiğin ölüler daha güçlü savaşır ve daha uzun dayanır.',
      'hoard': 'Altına dönüşen düşmanlar daha çok altın bırakır.'
    }
  },

  'options': {
    'title': 'Seçenekler', 'general': 'Genel', 'audio': 'Ses', 'language': 'Dil',
    'difficulty': 'Zorluk', 'soundEffects': 'Ses Efektleri', 'music': 'Müzik', 'musicTrack': 'Müzik Parçası',
    'musicTracks': { 'cozy': 'Huzurlu Uyum', 'trance': 'Trance Tüneli' },
    'haptics': 'Titreşim', 'on': 'Açık', 'off': 'Kapalı',
    'close': 'Kaydet ve Kapat',
    'difficulties': { 'easy': 'Kolay', 'medium': 'Orta', 'hard': 'Zor' },
    'difficultyHints': {
      'easy': 'Daha zayıf düşmanlar ve ince barikatlar.',
      'medium': 'Standart tur.',
      'hard': 'Daha güçlü düşmanlar ve ağır barikatlar.'
    }
  },

  'adsBlocked': {
    'title': 'Reklam gösterilemedi',
    'body': 'Ödülünü kazanabilmen için bir video göstermek istedik ama tarayıcındaki bir şey reklamları engelliyor.',
    'allowPrefix': 'Lütfen şu adreste reklamlara izin ver:',
    'allowSuffix': '(veya bu oyun için reklam engelleyiciyi duraklat) ve tekrar dene.',
    'gotIt': 'Anladım'
  },
  'saveStatus': {
    'restoredTitle': 'Bulut kaydı geri yüklendi', 'restoredBody': 'Kurtarma için +{n} bonus altın',
    'tap': 'dokun', 'pausedTitle': 'Bulut eşitlemesi duraklatıldı',
    'pausedBody': 'Çevrimdışı oynuyorsun. İlerlemen burada kaydediliyor.',
    'retry': 'Yeniden dene', 'dismiss': 'kapat'
  },
  'loading': { 'tooLong': 'Yükleme çok mu uzun sürüyor? Reklam engelleyiciyi kapatıp sayfayı yenile.', 'boo': 'Bö!', 'laugh': 'Hahaha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Telefonu çevir',
    'body': 'Survivalist dikey oynanır.'
  },
  'license': { 'denied': 'Erişim reddedildi: lütfen bir lisans satın al.' }
}
