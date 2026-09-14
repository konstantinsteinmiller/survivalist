export default {
  'gameName': 'Survivalist',
  'cancel': 'Отмена',
  'close': 'Закрыть',
  'ok': 'Ок',
  'continue': 'Продолжить',
  'tapToContinue': 'Нажмите, чтобы продолжить',
  'clickToContinue': 'Кликните, чтобы продолжить',
  'rewards': 'НАГРАДЫ',
  'tip': 'Совет',
  'crazyGamesOnly': 'Эта игра доступна только на',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Дальше',
    'replay': 'Заново',
    'back': 'Назад',
    'play': 'Играть',
    'pause': 'Пауза',
    'menu': 'Меню',
    'home': 'Главная',
    'info': 'Инфо'
  },

  'hud': {
    'stage': 'Этап {n}',
    'best': 'Рекорд {n}',
    'boss': 'Босс',
    'miniboss': 'Мини-босс',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Этапов до следующего бонуса',
    'fireRate': 'Темп',
    'incoming': 'Атака!',
    'dodge': 'Уклонись',
    'getIn': 'Внутрь',
    'holdStill': 'Замри',
    'milestone': '{n} в строю!',
    'weaponActive': '{name} готов',
    'weaponsActive': '{a} + {b} готовы',
    'weaponLocked': '{name} заблокирован — сбито рычагов: {n} из {total}',
    'weaponGift': '{name} впереди — бесплатно, без рычагов',
    'weaponFree': 'ДАРОМ'
  },

  'weapons': {
    'rocket': 'Ракетомёт',
    'gatling': 'Пулемёт Гатлинга'
  },

  'tutorial': {
    'touch': 'Проведите пальцем, чтобы двигать отряд',
    'desktop': 'Двигайте мышью, чтобы вести отряд'
  },
  'hints': {
    'move': { 'touch': 'Нажмите, чтобы двигаться', 'desktop': 'Кликните, чтобы двигаться' },
    'trap': { 'touch': 'Красные ворота УМЕНЬШАЮТ отряд — бегите в другие!', 'desktop': 'Красные ворота УМЕНЬШАЮТ отряд — бегите в другие!' },
    'divider': { 'touch': 'Никогда не задевайте столб между воротами', 'desktop': 'Никогда не задевайте столб между воротами' },
    'crate': { 'touch': 'Зелёные ящики: все бьют сильнее', 'desktop': 'Зелёные ящики: все бьют сильнее' },
    'rate': { 'touch': 'Синие ящики: все стреляют быстрее', 'desktop': 'Синие ящики: все стреляют быстрее' },
    'lever': { 'touch': 'Сбей ОБА рычага по краям дороги — они откроют ящик с оружием', 'desktop': 'Сбей ОБА рычага по краям дороги — они откроют ящик с оружием' },
    'cage': { 'touch': 'Стреляй по клеткам — пленные вступят в отряд', 'desktop': 'Стреляй по клеткам — пленные вступят в отряд' },
    'shieldBox': { 'touch': 'Ящик щита — ждёт и блокирует один сильный удар', 'desktop': 'Ящик щита — ждёт и блокирует один сильный удар' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} выживших обменяно',
    'unlocked': 'Открыто!',

    'guardian': "Ангел-хранитель спас тебя!",

    'guardianSub': "Вернулись {n} выживших",

    'next': "Далее: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Выбери оружие",
    'nextStage': "следующий уровень",
    'stagesAway': "через {n} уровня"
  },
  'weaponPick': {
    'title': "Выбери своё оружие",
    'subtitle': "Твоё на уровень {n}. На дороге ждёт ещё.",
    'take': "Взять",
    'rocket': {
      'a': "Самонаводящийся залп",
      'b': "Урон от взрыва"
    },
    'gatling': {
      'a': "Вдвое выше скорострельность",
      'b': "Быстрее качает ворота"
    }
  },
  'bossReward': {
    'title': "Босс повержен!",
    'subtitle': "Подарок на уровень {n}. Беги дальше!"
  },
  'result': {
    'stageClear': 'Этап пройден!',
    'wipedOut': 'Отряд уничтожен',
    'reachedStage': 'Этап {n}',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n} %',
    'bestReach': 'Рекорд {n} %',
    'newReach': 'Твой рекорд!',
    'newRecord': 'Новый рекорд!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Босс повержен!',
    'wasted': 'Конец',
    'cause': {
      'foe': 'Смяли монстры',
      'elite': 'Минибосс сломал вас',
      'barricade': 'Влетели в баррикады',
      'crate': 'Влетели в ящики',
      'divider': 'Задели разделители',
      'trap': 'Попались в ловушки',
      'slam': 'Босс вас раздавил'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Рубеж!',
    'rallied': 'Второе дыхание',
    'peakSquad': 'Макс. отряд',
    'kills': 'Убийства',
    'tripleCoins': '×3',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Монеты утроены!',
    'nextStage': 'Следующий этап',
    'tryAgain': 'Ещё раз',
    'upgrade': 'Улучшить',
    'upgradeHint': 'Улучши отряд!',
    'rankOf': 'из {n}',
    'upNext': 'Далее: уровень {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Поделиться забегом',
    'text': 'Я дошёл до уровня {n} в {game}. Сможешь дальше?'
  },

  'leaderboard': {
    'title': 'Таблица лидеров',
    'rank': '#',
    'player': 'Игрок',
    'stage': 'Этап',
    'squad': 'Отряд',
    'empty': 'Пока никого. Будьте первым!',
    'failed': 'Таблица лидеров недоступна.',
    'loading': 'Загрузка…',
    'you': 'Вы',
    'yourRank': 'Вы на #{n}',
    'of': 'из {n} игроков'
  },

  'chest': {
    'label': 'Сундук с сокровищами',
    'ready': 'Открыть сундук за {n} монет',
    'filling': 'Сундук наполняется',
    'spent': 'Сундук пуст до завтра'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Ежедневная вылазка',
    'hud': 'Вылазка',
    'multiplier': '×{n}',
    'available': 'Ежедневная вылазка — сегодняшняя дорога, тройные монеты',
    'confirm': 'Начать вылазку',
    'spent': 'Ежедневная вылазка — новая дорога через {time}',
    'done': 'Возвращайтесь завтра',
    'back': 'Вернуться к кампании'
  },

  'skills': {

    'grenade': 'Граната',

    'shield': 'Щит',

    'locked': 'Закрыто',

    'unlocksAt': 'Откроется на уровне {n}',

    'frost': 'Ледяная нова',

    'decoy': 'Сигнал-приманка',

    'trialLabel': '{name} · бесплатно',

    'trialTag': 'Попробуй бесплатно!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': 'Улучшения',
    'spotlight': 'Потратить!',
    'level': 'Ур. {n}',
    'maxed': 'Макс',
    'names': {
      'squad': 'Отряд',
      'power': 'Урон',
      'rate': 'Скорострельность',
      'range': 'Дальность',
      'scavenge': 'Мародёрство',
      'grenade': 'Граната',
      'shield': 'Щит',
      'rocket': 'Сила ракет',
      'gatling': 'Сила пулемёта'
    },
    'descriptions': {
      'squad': 'Начинайте этап с большим отрядом.',
      'power': 'Каждый боец наносит больше урона за выстрел.',
      'rate': 'Каждый боец стреляет быстрее.',
      'range': 'Отряд открывает огонь дальше по дороге.',
      'scavenge': 'Больше монет за каждый забег.',
      'grenade': 'Бросьте гранату для мощного взрыва урона.',
      'shield': 'Вдвое снижает урон по отряду на несколько секунд.',
      'rocket': 'Ракетомёты, открытые на этапе, наносят больше урона.',
      'gatling': 'Пулемёты, открытые на этапе, наносят больше урона.'
    }
  },

  'options': {
    'title': 'Настройки', 'general': 'Общие', 'audio': 'Звук', 'language': 'Язык',
    'difficulty': 'Сложность', 'soundEffects': 'Звуковые эффекты', 'music': 'Музыка', 'musicTrack': 'Музыкальный трек',
    'musicTracks': { 'cozy': 'Уютная гармония', 'trance': 'Транс-туннель' },
    'haptics': 'Вибрация', 'on': 'Вкл.', 'off': 'Выкл.',
    'close': 'Сохранить и закрыть',
    'difficulties': { 'easy': 'Лёгкая', 'medium': 'Средняя', 'hard': 'Сложная' },
    'difficultyHints': {
      'easy': 'Слабее враги и тоньше баррикады.',
      'medium': 'Обычный забег.',
      'hard': 'Крепче враги и прочнее баррикады.'
    }
  },

  'adsBlocked': {
    'title': 'Не удалось показать рекламу',
    'body': 'Мы пытались показать видео, чтобы вы получили награду, но что-то в браузере блокирует рекламу.',
    'allowPrefix': 'Разрешите рекламу на',
    'allowSuffix': '(или приостановите блокировщик для этой игры) и попробуйте снова.',
    'gotIt': 'Понятно'
  },
  'saveStatus': {
    'restoredTitle': 'Облачное сохранение восстановлено', 'restoredBody': '+{n} бонусных монет за восстановление',
    'tap': 'нажать', 'pausedTitle': 'Синхронизация приостановлена',
    'pausedBody': 'Игра офлайн. Ваш прогресс сохраняется здесь.',
    'retry': 'Повторить', 'dismiss': 'скрыть'
  },
  'loading': { 'tooLong': 'Загрузка слишком долгая? Отключите блокировщик рекламы и обновите страницу.', 'boo': 'Бу!', 'laugh': 'Ха-ха-ха!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Поверни телефон',
    'body': 'Survivalist играется вертикально.'
  },
  'license': { 'denied': 'Доступ запрещён: приобретите лицензию.' }
}
