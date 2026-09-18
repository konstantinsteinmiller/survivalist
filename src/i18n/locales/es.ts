export default {
  'gameName': 'Survivalist',
  'cancel': 'Cancelar',
  'close': 'Cerrar',
  'ok': 'Ok',
  'continue': 'Continuar',
  'tapToContinue': 'Toca para continuar',
  'clickToContinue': 'Haz clic para continuar',
  'rewards': 'RECOMPENSAS',
  'tip': 'Consejo',
  'crazyGamesOnly': 'Este juego solo está disponible en',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Siguiente',
    'replay': 'Repetir',
    'back': 'Atrás',
    'play': 'Jugar',
    'pause': 'Pausa',
    'menu': 'Menú',
    'home': 'Inicio',
    'info': 'Info'
  },

  'hud': {
    'stage': 'Nivel {n}',
    'best': 'Récord {n}',
    'boss': 'Jefe',
    'miniboss': 'Minijefe',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Fases hasta el próximo bonus',
    'fireRate': 'Ritmo',
    'incoming': '¡Ataque entrante!',
    'dodge': 'Esquiva',
    'getIn': 'Entra',
    'holdStill': 'Quieto',
    'milestone': '¡{n} en pie!',
    'weaponActive': '{name} listo',
    'weaponsActive': '{a} + {b} listos',
    'weaponLocked': '{name} bloqueado: {n} de {total} palancas disparadas',
    'weaponGift': '{name} más adelante: gratis, sin palancas',
    'weaponFree': 'GRATIS'
  },

  'weapons': {
    'rocket': 'Lanzacohetes',
    'gatling': 'Ametralladora Gatling',
    'grapeshot': 'Metralla',
    'dynamo': 'Dinamo',
    'gravecall': 'Ultratumba',
    'hoard': 'Botín Cuervo',
    'bolt': 'Rayo'
  },

  'offer': {
    'confirm': 'Ver anuncio',
    'available': 'Mira un vídeo y consigue {weapon} gratis'
  },

  'tutorial': {
    'touch': 'Desliza para mover tu escuadrón',
    'desktop': 'Mueve el ratón para dirigir tu escuadrón'
  },
  'hints': {
    'move': { 'touch': 'Toca para moverte', 'desktop': 'Haz clic para moverte' },
    'divider': { 'touch': 'Nunca toques el pilar entre las puertas', 'desktop': 'Nunca toques el pilar entre las puertas' },
    'crate': { 'touch': 'Cajas verdes: todos golpean más fuerte', 'desktop': 'Cajas verdes: todos golpean más fuerte' },
    'rate': { 'touch': 'Cajas azules: todos disparan más rápido', 'desktop': 'Cajas azules: todos disparan más rápido' },
    'lever': { 'touch': 'Dispara a las DOS palancas de los bordes: abren la caja de armas', 'desktop': 'Dispara a las DOS palancas de los bordes: abren la caja de armas' },
    'cage': { 'touch': 'Dispara a las jaulas: los prisioneros se unen a tu escuadra', 'desktop': 'Dispara a las jaulas: los prisioneros se unen a tu escuadra' },
    'shieldBox': { 'touch': 'Caja escudo: espera y bloquea un gran golpe', 'desktop': 'Caja escudo: espera y bloquea un gran golpe' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} supervivientes canjeados',
    'unlocked': '¡Desbloqueado!',

    'guardian': "¡Un ángel de la guarda te ha salvado!",

    'guardianSub': "{n} supervivientes han vuelto",

    'next': "A continuación: {label} · {when}",
    'bossAhead': "Jefe a la vista: {name}",
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
    'weaponPick': "Elige un arma",
    'nextStage': "siguiente nivel",
    'stagesAway': "en {n} niveles"
  },
  'weaponPick': {
    'title': "Elige tu arma",
    'subtitle': "Tuya en el nivel {n}. Hay más esperando en el camino.",
    'take': "Elegir",
    'rocket': {
      'a': "Salva teledirigida",
      'b': "Daño explosivo"
    },
    'gatling': {
      'a': "Doble cadencia de fuego",
      'b': "Carga las puertas más rápido"
    }
  },
  'bossReward': {
    'title': "¡Jefe derrotado!",
    'subtitle': "Un regalo para el nivel {n}. ¡Sigue corriendo!"
  },
  'result': {
    'stageClear': '¡Nivel superado!',
    'clearedStage': '¡Nivel {n} superado!',
    'wipedOut': 'Escuadrón aniquilado',
    'reachedStage': 'Nivel {n}',
    'newRecord': '¡Nuevo récord!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': '¡Jefe abatido!',
    'wasted': 'Liquidado',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': '¡Hito!',
    'rallied': 'Segundo aire',
    'peakSquad': 'Mayor escuadrón',
    'kills': 'Bajas',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': '¡Monedas triplicadas!',
    'nextStage': 'Siguiente nivel',
    'tryAgain': 'Reintentar',
    'upgrade': 'Mejorar',
    'upgradeHint': '¡Mejora tu escuadrón!',
    'rankOf': 'de {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Compartir partida',
    'text': 'He llegado al nivel {n} en {game}. ¿Puedes llegar más lejos?'
  },

  'leaderboard': {
    'title': 'Clasificación',
    'rank': '#',
    'player': 'Jugador',
    'stage': 'Nivel',
    'squad': 'Escuadrón',
    'empty': 'Aún no hay marcas. ¡Sé el primero!',
    'failed': 'No se pudo cargar la clasificación.',
    'loading': 'Cargando…',
    'you': 'Tú',
    'yourRank': 'Eres #{n} de {total}',
    'tabGlobal': 'Global'
  },

  'chest': {
    'label': 'Cofre del tesoro',
    'ready': 'Abrir el cofre por {n} monedas',
    'filling': 'Cofre del tesoro: llenándose',
    'spent': 'Cofre del tesoro: vacío hasta mañana'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Expedición diaria',
    'hud': 'Expedición',
    'multiplier': '{n}×',
    'available': 'Expedición diaria: la ruta de hoy, monedas triples',
    'confirm': 'Iniciar expedición',
    'spent': 'Expedición diaria: nueva ruta en {time}',
    'done': 'Vuelve mañana',
    'back': 'Volver a la campaña'
  },

  'skills': {

    'grenade': 'Granada',

    'shield': 'Escudo',

    'locked': 'Bloqueado',

    'unlocksAt': 'Se desbloquea en el nivel {n}',

    'frost': 'Nova de escarcha',

    'decoy': 'Bengala señuelo',

    'trialLabel': '{name} · prueba gratis',

    'trialTag': '¡Prueba gratis!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Se los llevó a todos.',
    'alive': 'Siguen vivos.',
    'go': 'Ve a por ellos.',
    'skip': 'Saltar'
  },

  'upgrades': {
    'title': 'Mejoras',
    'spotlight': '¡Gasta!',
    'level': 'Nv {n}',
    'maxed': 'Máx',
    'peekLabel': 'Mejoras: {name}',
    'peekLabelReady': 'Mejoras: {name} — {n} listas para comprar',
    'names': {
      'squad': 'Escuadrón',
      'power': 'Potencia',
      'rate': 'Cadencia',
      'range': 'Alcance',
      'scavenge': 'Carroñeo',
      'grenade': 'Granada',
      'shield': 'Escudo',
      'rocket': 'Potencia de cohetes',
      'gatling': 'Potencia Gatling',
      'grapeshot': 'Potencia de metralla',
      'dynamo': 'Potencia Dinamo',
      'gravecall': 'Potencia Ultratumba',
      'hoard': 'Potencia del botín'
    },
    'descriptions': {
      'squad': 'Empieza cada nivel con más supervivientes.',
      'power': 'Cada superviviente hace más daño por disparo.',
      'rate': 'Cada superviviente dispara más rápido.',
      'range': 'Tu escuadrón abre fuego más lejos en la carretera.',
      'scavenge': 'Gana más monedas en cada partida.',
      'grenade': 'Lanza una granada para un estallido de daño.',
      'shield': 'Reduce a la mitad el daño a tu escuadrón unos segundos.',
      'rocket': 'Los lanzacohetes que desbloquees en un nivel hacen más daño.',
      'gatling': 'Las Gatling que desbloquees en un nivel hacen más daño.',
      'grapeshot': 'Las escopetas que desbloquees en un nivel hacen más daño.',
      'dynamo': 'Los rayos del Dinamo que desbloquees en un nivel pegan más fuerte.',
      'gravecall': 'Los muertos que levantas luchan mejor y duran más.',
      'hoard': 'Los enemigos convertidos en oro valen más monedas.'
    }
  },

  'options': {
    'title': 'Opciones', 'general': 'General', 'audio': 'Audio', 'language': 'Idioma',
    'difficulty': 'Dificultad', 'soundEffects': 'Efectos de sonido', 'music': 'Música', 'musicTrack': 'Pista de música',
    'musicTracks': { 'cozy': 'Armonía acogedora', 'trance': 'Túnel trance' },
    'haptics': 'Vibración', 'on': 'Activado', 'off': 'Desactivado',
    'close': 'Guardar y cerrar',
    'difficulties': { 'easy': 'Fácil', 'medium': 'Media', 'hard': 'Difícil' },
    'difficultyHints': {
      'easy': 'Enemigos más débiles y barricadas más finas.',
      'medium': 'La partida estándar.',
      'hard': 'Enemigos más duros y barricadas más resistentes.'
    }
  },

  'adsBlocked': {
    'title': 'No se pudo mostrar el anuncio',
    'body': 'Intentamos mostrarte un vídeo para que ganaras tu recompensa, pero algo en tu navegador bloquea los anuncios.',
    'allowPrefix': 'Permite los anuncios en',
    'allowSuffix': '(o pausa tu bloqueador para este juego) e inténtalo de nuevo.',
    'gotIt': 'Entendido'
  },
  'saveStatus': {
    'restoredTitle': 'Guardado en la nube restaurado', 'restoredBody': '+{n} monedas de bonificación por la recuperación',
    'tap': 'toca', 'pausedTitle': 'Sincronización pausada',
    'pausedBody': 'Jugando sin conexión. Tu progreso se guarda aquí.',
    'retry': 'Reintentar', 'dismiss': 'descartar'
  },
  'loading': { 'tooLong': '¿La carga tarda demasiado? Desactiva tu bloqueador de anuncios y recarga.', 'boo': '¡Bu!', 'laugh': '¡Jajaja!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Gira tu teléfono',
    'body': 'Survivalist se juega en vertical.'
  },
  'license': { 'denied': 'Acceso denegado: adquiere una licencia.' }
}
