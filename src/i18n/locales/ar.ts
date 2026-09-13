export default {
  'gameName': 'Survivalist',
  'cancel': 'إلغاء',
  'close': 'إغلاق',
  'ok': 'حسناً',
  'continue': 'متابعة',
  'tapToContinue': 'اضغط للمتابعة',
  'clickToContinue': 'انقر للمتابعة',
  'rewards': 'المكافآت',
  'tip': 'نصيحة',
  'crazyGamesOnly': 'هذه اللعبة متاحة فقط على',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'التالي',
    'replay': 'إعادة',
    'back': 'رجوع',
    'play': 'تشغيل',
    'pause': 'إيقاف مؤقت',
    'menu': 'القائمة',
    'home': 'الرئيسية',
    'info': 'معلومات'
  },

  'hud': {
    'stage': 'المرحلة {n}',
    'best': 'الأفضل {n}',
    'boss': 'الزعيم',
    'miniboss': 'زعيم صغير',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'المراحل حتى المكافأة التالية',
    'fireRate': 'معدل',
    'incoming': 'هجوم قادم!',
    'dodge': 'تفادَ',
    'getIn': 'ادخل',
    'holdStill': 'اثبت',
    'milestone': '{n} مقاتل!',
    'weaponActive': '{name} جاهز',
    'weaponsActive': '{a} + {b} جاهزان',
    'weaponLocked': '{name} مقفل — تمت إصابة {n} من {total} رافعات',
    'weaponGift': '{name} في الأمام — مجاني، بلا روافع',
    'weaponFree': 'مجاني'
  },

  'weapons': {
    'rocket': 'قاذف صواريخ',
    'gatling': 'رشاش غاتلينغ'
  },

  'tutorial': {
    'touch': 'اسحب لتحريك فريقك',
    'desktop': 'حرّك الفأرة لتوجيه فريقك'
  },
  'hints': {
    'move': { 'touch': 'اضغط للتحرك', 'desktop': 'انقر للتحرك' },
    'gate': { 'touch': 'واصل إطلاق النار على البوابة: ‎+1 كل نصف ثانية', 'desktop': 'واصل إطلاق النار على البوابة: ‎+1 كل نصف ثانية' },
    'trap': { 'touch': 'البوابة الحمراء تُنقص فريقك: خذ الأخرى!', 'desktop': 'البوابة الحمراء تُنقص فريقك: خذ الأخرى!' },
    'divider': { 'touch': 'لا تلمس العمود بين البوابتين', 'desktop': 'لا تلمس العمود بين البوابتين' },
    'crate': { 'touch': 'الصناديق الخضراء: الجميع يضرب أقوى', 'desktop': 'الصناديق الخضراء: الجميع يضرب أقوى' },
    'rate': { 'touch': 'الصناديق الزرقاء: الجميع يطلق أسرع', 'desktop': 'الصناديق الزرقاء: الجميع يطلق أسرع' },
    'boss': { 'touch': 'ابتعد عن الدائرة الحمراء!', 'desktop': 'ابتعد عن الدائرة الحمراء!' },
    'lever': { 'touch': 'أطلق على كلتا الرافعتين على حافتي الطريق — تفتحان صندوق السلاح', 'desktop': 'أطلق على كلتا الرافعتين على حافتي الطريق — تفتحان صندوق السلاح' },
    'guard': { 'touch': 'الدرع مرفوع — نيرانك لا تؤذيه بعد', 'desktop': 'الدرع مرفوع — نيرانك لا تؤذيه بعد' },
    'cage': { 'touch': 'حطّم الأقفاص — الأسرى ينضمّون إلى فريقك', 'desktop': 'حطّم الأقفاص — الأسرى ينضمّون إلى فريقك' },
    'shieldBox': { 'touch': 'صندوق الدرع — ينتظر ثم يصدّ ضربة كبيرة', 'desktop': 'صندوق الدرع — ينتظر ثم يصدّ ضربة كبيرة' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': 'تم صرف {n} ناجيًا',
    'unlocked': 'تم الفتح!',

    'guardian': "أنقذك ملاك حارس!",

    'guardianSub': "عاد {n} من الناجين",

    'next': "التالي: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "اختر سلاحًا",
    'nextStage': "المرحلة التالية",
    'stagesAway': "بعد {n} مراحل"
  },
  'weaponPick': {
    'title': "اختر سلاحك",
    'subtitle': "لك في المرحلة {n}. المزيد بانتظارك على الطريق.",
    'take': "خذه",
    'rocket': {
      'a': "وابل موجّه",
      'b': "ضرر انفجاري"
    },
    'gatling': {
      'a': "ضعف معدل الإطلاق",
      'b': "يشحن البوابات أسرع"
    }
  },
  'bossReward': {
    'title': "هزمت الزعيم!",
    'subtitle': "هدية للمرحلة {n}. واصل الركض!"
  },
  'result': {
    'stageClear': 'اجتزت المرحلة!',
    'wipedOut': 'أُبيد الفريق',
    'reachedStage': 'المرحلة {n}',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n}٪',
    'bestReach': 'الأفضل {n}٪',
    'newReach': 'أبعد من أي وقت!',
    'newRecord': 'رقم قياسي جديد!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'سقط الزعيم!',
    'wasted': 'مُهدَر',
    'cause': {
      'foe': 'اجتاحتك الوحوش',
      'elite': 'سحقك زعيم صغير',
      'barricade': 'ارتطمت بالحواجز',
      'crate': 'ارتطمت بالصناديق',
      'divider': 'اصطدمت بالفواصل',
      'trap': 'وقعت في الفخاخ',
      'slam': 'سحقك الزعيم'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'إنجاز!',
    'rallied': 'نفَس ثانٍ',
    'peakSquad': 'أكبر فريق',
    'kills': 'القتلى',
    'tripleCoins': '×3',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'تضاعفت العملات ثلاث مرات!',
    'nextStage': 'المرحلة التالية',
    'tryAgain': 'حاول مجددًا',
    'upgrade': 'ترقية',
    'upgradeHint': 'طوّر فريقك!',
    'rankOf': 'من {n}',
    'upNext': 'التالي: المرحلة {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'شارك جولتك',
    'text': 'وصلت إلى المرحلة {n} في {game}. هل تقدر تتجاوزني؟'
  },

  'leaderboard': {
    'title': 'لوحة الصدارة',
    'rank': '#',
    'player': 'اللاعب',
    'stage': 'المرحلة',
    'squad': 'الفريق',
    'empty': 'لا توجد نتائج بعد. كن الأول!',
    'failed': 'تعذر الوصول إلى لوحة الصدارة.',
    'loading': 'جارٍ التحميل…',
    'you': 'أنت',
    'yourRank': 'ترتيبك #{n}',
    'of': 'من {n} لاعب'
  },

  'chest': {
    'label': 'صندوق الكنز',
    'ready': 'افتح صندوق الكنز مقابل {n} عملة',
    'filling': 'صندوق الكنز قيد الامتلاء',
    'spent': 'صندوق الكنز فارغ حتى الغد'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'الرحلة اليومية',
    'hud': 'رحلة',
    'multiplier': '×{n}',
    'available': 'الرحلة اليومية — طريق اليوم، عملات ثلاثية',
    'confirm': 'ابدأ الرحلة',
    'spent': 'الرحلة اليومية — طريق جديد بعد {time}',
    'done': 'عد غدًا',
    'back': 'العودة إلى الحملة'
  },

  'skills': {

    'grenade': 'قنبلة',

    'shield': 'درع',

    'locked': 'مقفل',

    'unlocksAt': 'يُفتح في المرحلة {n}',

    'frost': 'نوفا الصقيع',

    'decoy': 'شعلة الخداع',

    'trialLabel': '{name} · تجربة مجانية',

    'trialTag': 'تجربة مجانية!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': 'الترقيات',
    'spotlight': 'أنفق!',
    'level': 'مستوى {n}',
    'maxed': 'الأقصى',
    'names': {
      'squad': 'الفريق',
      'power': 'قوة النيران',
      'rate': 'معدل الإطلاق',
      'range': 'المدى',
      'scavenge': 'التجميع',
      'grenade': 'قنبلة',
      'shield': 'درع',
      'rocket': 'قوة الصواريخ',
      'gatling': 'قوة الرشاش'
    },
    'descriptions': {
      'squad': 'ابدأ كل مرحلة بعدد أكبر من الناجين.',
      'power': 'كل ناجٍ يسبب ضررًا أكبر لكل طلقة.',
      'rate': 'كل ناجٍ يطلق النار أسرع.',
      'range': 'تفتح فرقتك النار من مسافة أبعد على الطريق.',
      'scavenge': 'اكسب عملات أكثر في كل جولة.',
      'grenade': 'ألقِ قنبلة لإحداث ضرر كبير.',
      'shield': 'يقلّل الضرر على فريقك إلى النصف لبضع ثوانٍ.',
      'rocket': 'قاذفات الصواريخ التي تفتحها في المرحلة تُلحق ضررًا أكبر.',
      'gatling': 'رشاشات غاتلينغ التي تفتحها في المرحلة تُلحق ضررًا أكبر.'
    }
  },

  'options': {
    'title': 'الخيارات', 'general': 'عام', 'audio': 'الصوت', 'language': 'اللغة',
    'difficulty': 'الصعوبة', 'soundEffects': 'المؤثرات الصوتية', 'music': 'الموسيقى', 'musicTrack': 'المقطوعة',
    'musicTracks': { 'cozy': 'انسجام هادئ', 'trance': 'نفق الترانس' },
    'haptics': 'الاهتزاز', 'on': 'تشغيل', 'off': 'إيقاف',
    'close': 'حفظ وإغلاق',
    'difficulties': { 'easy': 'سهل', 'medium': 'متوسط', 'hard': 'صعب' },
    'difficultyHints': {
      'easy': 'أعداء أضعف وحواجز أرق.',
      'medium': 'الجولة القياسية.',
      'hard': 'أعداء أقوى وحواجز أثقل.'
    }
  },

  'adsBlocked': {
    'title': 'تعذّر عرض الإعلان',
    'body': 'حاولنا عرض مقطع فيديو لتحصل على مكافأتك، لكن شيئاً في متصفحك يحجب الإعلانات.',
    'allowPrefix': 'يُرجى السماح بالإعلانات على',
    'allowSuffix': '(أو أوقف مانع الإعلانات مؤقتاً لهذه اللعبة) ثم أعد المحاولة.',
    'gotIt': 'فهمت'
  },
  'saveStatus': {
    'restoredTitle': 'تمت استعادة الحفظ السحابي', 'restoredBody': '+{n} عملة مكافأة للاستعادة',
    'tap': 'اضغط', 'pausedTitle': 'تمت إيقاف المزامنة السحابية',
    'pausedBody': 'تلعب دون اتصال. يتم حفظ تقدمك هنا.',
    'retry': 'إعادة المحاولة', 'dismiss': 'إخفاء'
  },
  'loading': { 'tooLong': 'التحميل يستغرق وقتاً طويلاً؟ عطّل مانع الإعلانات ثم أعد التحميل.', 'boo': 'بو!', 'laugh': 'هاهاها!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'أدر هاتفك',
    'body': 'لعبة Survivalist تُلعب عموديًا.'
  },
  'license': { 'denied': 'تم رفض الوصول: يرجى شراء ترخيص.' }
}
