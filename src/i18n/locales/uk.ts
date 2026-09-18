export default {
  'gameName': 'Survivalist',
  'cancel': 'Скасувати',
  'close': 'Закрити',
  'ok': 'Ок',
  'continue': 'Продовжити',
  'tapToContinue': 'Торкніться, щоб продовжити',
  'clickToContinue': 'Клацніть, щоб продовжити',
  'rewards': 'НАГОРОДИ',
  'tip': 'Порада',
  'crazyGamesOnly': 'Ця гра доступна лише на',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Далі',
    'replay': 'Заново',
    'back': 'Назад',
    'play': 'Грати',
    'pause': 'Пауза',
    'menu': 'Меню',
    'home': 'Головна',
    'info': 'Інфо'
  },

  'hud': {
    'stage': 'Етап {n}',
    'best': 'Рекорд {n}',
    'boss': 'Бос',
    'miniboss': 'Міні-бос',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Етапів до наступного бонусу',
    'fireRate': 'Темп',
    'incoming': 'Атака!',
    'dodge': 'Ухилися',
    'getIn': 'Всередину',
    'holdStill': 'Завмри',
    'milestone': '{n} у строю!',
    'weaponActive': '{name} готовий',
    'weaponsActive': '{a} + {b} готові',
    'weaponLocked': '{name} заблоковано — збито важелів: {n} з {total}',
    'weaponGift': '{name} попереду — безкоштовно, без важелів',
    'weaponFree': 'ДАРМА'
  },

  'weapons': {
    'rocket': 'Ракетниця',
    'gatling': 'Кулемет Ґатлінга',
    'grapeshot': 'Картеч',
    'dynamo': 'Динамо',
    'gravecall': 'Поклик могил',
    'hoard': 'Скарб крука',
    'bolt': 'Блискавка'
  },

  'offer': {
    'confirm': 'Дивитися рекламу',
    'available': 'Подивись відео й отримай {weapon} безкоштовно'
  },

  'tutorial': {
    'touch': 'Проведіть пальцем, щоб рухати загін',
    'desktop': 'Рухайте мишею, щоб вести загін'
  },
  'hints': {
    'move': { 'touch': 'Торкніться, щоб рухатись', 'desktop': 'Клацніть, щоб рухатись' },
    'divider': { 'touch': 'Ніколи не зачіпайте стовп між воротами', 'desktop': 'Ніколи не зачіпайте стовп між воротами' },
    'crate': { 'touch': 'Зелені ящики: усі б’ють сильніше', 'desktop': 'Зелені ящики: усі б’ють сильніше' },
    'rate': { 'touch': 'Сині ящики: усі стріляють швидше', 'desktop': 'Сині ящики: усі стріляють швидше' },
    'lever': { 'touch': 'Збий ОБИДВА важелі по краях дороги — вони відкриють ящик зі зброєю', 'desktop': 'Збий ОБИДВА важелі по краях дороги — вони відкриють ящик зі зброєю' },
    'cage': { 'touch': 'Стріляй по клітках — полонені приєднаються до загону', 'desktop': 'Стріляй по клітках — полонені приєднаються до загону' },
    'shieldBox': { 'touch': 'Ящик щита — чекає й блокує один сильний удар', 'desktop': 'Ящик щита — чекає й блокує один сильний удар' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} вцілілих обміняно',
    'unlocked': 'Відкрито!',

    'guardian': "Ангел-охоронець врятував тебе!",

    'guardianSub': "Повернулися {n} вцілілих",

    'next': "Далі: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Обери зброю",
    'nextStage': "наступний рівень",
    'stagesAway': "через {n} рівні"
  },
  'weaponPick': {
    'title': "Обери свою зброю",
    'subtitle': "Твоя на рівень {n}. На дорозі чекає ще.",
    'take': "Взяти",
    'rocket': {
      'a': "Самонавідний залп",
      'b': "Шкода від вибуху"
    },
    'gatling': {
      'a': "Удвічі вища скорострільність",
      'b': "Швидше качає ворота"
    }
  },
  'bossReward': {
    'title': "Боса переможено!",
    'subtitle': "Подарунок на рівень {n}. Біжи далі!"
  },
  'result': {
    'stageClear': 'Етап пройдено!',
    'clearedStage': 'Етап {n} пройдено!',
    'wipedOut': 'Загін знищено',
    'reachedStage': 'Етап {n}',
    'newRecord': 'Новий рекорд!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Бос повалений!',
    'wasted': 'Кінець',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Рубіж!',
    'rallied': 'Друге дихання',
    'peakSquad': 'Найбільший загін',
    'kills': 'Убивства',
    'tripleCoins': '×3',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Монети потроєно!',
    'nextStage': 'Наступний етап',
    'tryAgain': 'Ще раз',
    'upgrade': 'Покращити',
    'upgradeHint': 'Покращ загін!',
    'rankOf': 'із {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Поділитися забігом',
    'text': 'Я дійшов до рівня {n} у {game}. Зайдеш далі?'
  },

  'leaderboard': {
    'title': 'Таблиця лідерів',
    'rank': '#',
    'player': 'Гравець',
    'stage': 'Етап',
    'squad': 'Загін',
    'empty': 'Поки що порожньо. Будьте першим!',
    'failed': 'Таблиця лідерів недоступна.',
    'loading': 'Завантаження…',
    'you': 'Ви',
    'yourRank': 'Ви на #{n} із {total}',
    'tabGlobal': 'Світовий'
  },

  'chest': {
    'label': 'Скриня зі скарбами',
    'ready': 'Відкрити скриню за {n} монет',
    'filling': 'Скриня наповнюється',
    'spent': 'Скриня порожня до завтра'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Щоденна вилазка',
    'hud': 'Вилазка',
    'multiplier': '×{n}',
    'available': 'Щоденна вилазка — сьогоднішня дорога, потрійні монети',
    'confirm': 'Почати вилазку',
    'spent': 'Щоденна вилазка — нова дорога через {time}',
    'done': 'Повертайтеся завтра',
    'back': 'Повернутися до кампанії'
  },

  'skills': {

    'grenade': 'Граната',

    'shield': 'Щит',

    'locked': 'Закрито',

    'unlocksAt': 'Відкриється на рівні {n}',

    'frost': 'Крижана нова',

    'decoy': 'Сигнал-приманка',

    'trialLabel': '{name} · безкоштовно',

    'trialTag': 'Спробуй безкоштовно!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Воно забрало всіх.',
    'alive': 'Вони ще живі.',
    'go': 'Поверни їх.',
    'skip': 'Пропустити'
  },

  'upgrades': {
    'title': 'Покращення',
    'spotlight': 'Витратити!',
    'level': 'Рів. {n}',
    'maxed': 'Макс',
    'peekLabel': 'Покращення: {name}',
    'peekLabelReady': 'Покращення: {name} — {n} можна купити',
    'names': {
      'squad': 'Загін',
      'power': 'Вогнева міць',
      'rate': 'Швидкострільність',
      'range': 'Дальність',
      'scavenge': 'Мародерство',
      'grenade': 'Граната',
      'shield': 'Щит',
      'rocket': 'Сила ракет',
      'gatling': 'Сила кулемета',
      'grapeshot': 'Сила картечі',
      'dynamo': 'Сила Динамо',
      'gravecall': 'Сила поклику могил',
      'hoard': 'Сила скарбу'
    },
    'descriptions': {
      'squad': 'Починайте кожен етап із більшим загоном.',
      'power': 'Кожен боєць завдає більше шкоди за постріл.',
      'rate': 'Кожен боєць стріляє швидше.',
      'range': 'Загін відкриває вогонь далі по дорозі.',
      'scavenge': 'Більше монет за кожен забіг.',
      'grenade': 'Кинь гранату для потужного сплеску шкоди.',
      'shield': 'Удвічі зменшує шкоду загону на кілька секунд.',
      'rocket': 'Ракетниці, відкриті на етапі, завдають більше шкоди.',
      'gatling': 'Кулемети, відкриті на етапі, завдають більше шкоди.',
      'grapeshot': 'Дробовики, відкриті на етапі, завдають більше шкоди.',
      'dynamo': 'Блискавки Динамо, відкриті на етапі, б’ють сильніше.',
      'gravecall': 'Підняті мерці б’ються сильніше й тримаються довше.',
      'hoard': 'Вороги, обернені на золото, дають більше монет.'
    }
  },

  'options': {
    'title': 'Налаштування', 'general': 'Загальні', 'audio': 'Звук', 'language': 'Мова',
    'difficulty': 'Складність', 'soundEffects': 'Звукові ефекти', 'music': 'Музика', 'musicTrack': 'Музичний трек',
    'musicTracks': { 'cozy': 'Затишна гармонія', 'trance': 'Транс-тунель' },
    'haptics': 'Вібрація', 'on': 'Увімк.', 'off': 'Вимк.',
    'close': 'Зберегти й закрити',
    'difficulties': { 'easy': 'Легка', 'medium': 'Середня', 'hard': 'Складна' },
    'difficultyHints': {
      'easy': 'Слабші вороги й тонші барикади.',
      'medium': 'Звичайний забіг.',
      'hard': 'Міцніші вороги й важчі барикади.'
    }
  },

  'adsBlocked': {
    'title': 'Не вдалося показати рекламу',
    'body': 'Ми намагалися показати відео, щоб ви отримали нагороду, але щось у браузері блокує рекламу.',
    'allowPrefix': 'Дозвольте рекламу на',
    'allowSuffix': '(або призупиніть блокувальник для цієї гри) і спробуйте ще раз.',
    'gotIt': 'Зрозуміло'
  },
  'saveStatus': {
    'restoredTitle': 'Хмарне збереження відновлено', 'restoredBody': '+{n} бонусних монет за відновлення',
    'tap': 'торкнутися', 'pausedTitle': 'Синхронізацію призупинено',
    'pausedBody': 'Гра офлайн. Ваш прогрес зберігається тут.',
    'retry': 'Повторити', 'dismiss': 'сховати'
  },
  'loading': { 'tooLong': 'Завантаження триває надто довго? Вимкніть блокувальник реклами та оновіть сторінку.', 'boo': 'Бу!', 'laugh': 'Ха-ха-ха!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Поверни телефон',
    'body': 'Survivalist грається вертикально.'
  },
  'license': { 'denied': 'Доступ заборонено: придбайте ліцензію.' }
}
