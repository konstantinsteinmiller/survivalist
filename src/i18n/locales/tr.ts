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
    'fireRate': 'Hız'
  },

  'tutorial': {
    'touch': 'Takımını hareket ettirmek için kaydır',
    'desktop': 'Takımını yönlendirmek için fareyi oynat'
  },
  'hints': {
    'move': { 'touch': 'Hareket için dokun', 'desktop': 'Hareket için tıkla' },
    'gate': { 'touch': 'Kapıya ateş etmeye devam et: her yarım saniyede +1', 'desktop': 'Kapıya ateş etmeye devam et: her yarım saniyede +1' },
    'trap': { 'touch': 'Kırmızı kapı ekibi AZALTIR — diğerine geç!', 'desktop': 'Kırmızı kapı ekibi AZALTIR — diğerine geç!' },
    'divider': { 'touch': 'Kapılar arasındaki direğe asla dokunma', 'desktop': 'Kapılar arasındaki direğe asla dokunma' },
    'crate': { 'touch': 'Yeşil sandık: herkes daha sert vurur', 'desktop': 'Yeşil sandık: herkes daha sert vurur' },
    'rate': { 'touch': 'Mavi sandık: herkes daha hızlı ateş eder', 'desktop': 'Mavi sandık: herkes daha hızlı ateş eder' },
    'boss': { 'touch': 'Kırmızı halkanın dışında kal!', 'desktop': 'Kırmızı halkanın dışında kal!' },
    'guard': { 'touch': 'Kalkan açık — ateşin işe yaramıyor. KAÇ!', 'desktop': 'Kalkan açık — ateşin işe yaramıyor. KAÇ!' }
  },

  'result': {
    'stageClear': 'Bölüm tamamlandı!',
    'wipedOut': 'Ekip yok edildi',
    'reachedStage': 'Bölüm {n}',
    'newRecord': 'Yeni rekor!',
    'rallied': 'İkinci nefes',
    'peakSquad': 'En büyük ekip',
    'kills': 'Öldürme',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Altınlar üçe katlandı!',
    'nextStage': 'Sonraki bölüm',
    'tryAgain': 'Tekrar dene',
    'upgrade': 'Geliştir',
    'rankOf': '{n} içinde'
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
    'yourRank': 'Sıran #{n}',
    'of': '{n} oyuncu içinde'
  },

  'upgrades': {
    'title': 'Geliştirmeler',
    'spotlight': 'Harca!',
    'level': 'Sv {n}',
    'maxed': 'Maks',
    'names': {
      'squad': 'Ekip',
      'power': 'Ateş gücü',
      'rate': 'Atış hızı',
      'range': 'Menzil',
      'scavenge': 'Toplayıcılık'
    },
    'descriptions': {
      'squad': 'Her bölüme daha çok hayatta kalanla başla.',
      'power': 'Her hayatta kalan atış başına daha çok hasar verir.',
      'rate': 'Her hayatta kalan daha hızlı ateş eder.',
      'range': 'Takımın yolda daha ileriden ateş açar.',
      'scavenge': 'Her turdan daha çok altın kazan.'
    }
  },

  'options': {
    'title': 'Seçenekler', 'general': 'Genel', 'audio': 'Ses', 'language': 'Dil',
    'difficulty': 'Zorluk', 'soundEffects': 'Ses Efektleri', 'music': 'Müzik', 'musicTrack': 'Müzik Parçası',
    'musicTracks': { 'cozy': 'Huzurlu Uyum', 'trance': 'Trance Tüneli' },
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
  'loading': { 'tooLong': 'Yükleme çok mu uzun sürüyor? Reklam engelleyiciyi kapatıp sayfayı yenile.' },
  'license': { 'denied': 'Erişim reddedildi: lütfen bir lisans satın al.' }
}
