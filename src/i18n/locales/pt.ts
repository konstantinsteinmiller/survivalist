export default {
  'gameName': 'Survivalist',
  'cancel': 'Cancelar',
  'close': 'Fechar',
  'ok': 'Ok',
  'continue': 'Continuar',
  'tapToContinue': 'Toque para continuar',
  'clickToContinue': 'Clique para continuar',
  'rewards': 'RECOMPENSAS',
  'tip': 'Dica',
  'crazyGamesOnly': 'Este jogo só está disponível em',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Próximo',
    'replay': 'Repetir',
    'back': 'Voltar',
    'play': 'Jogar',
    'pause': 'Pausa',
    'menu': 'Menu',
    'home': 'Início',
    'info': 'Info'
  },

  'hud': {
    'stage': 'Fase {n}',
    'best': 'Recorde {n}',
    'boss': 'Chefe',
    'miniboss': 'Minichefe',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Fases até o próximo bônus',
    'fireRate': 'Ritmo',
    'incoming': 'Ataque a caminho!',
    'dodge': 'Desvie',
    'getIn': 'Entre',
    'holdStill': 'Parado',
    'milestone': '{n} em campo!',
    'weaponActive': '{name} pronto',
    'weaponsActive': '{a} + {b} prontos',
    'weaponLocked': '{name} bloqueado — {n} de {total} alavancas atingidas',
    'weaponGift': '{name} à frente — grátis, sem alavancas',
    'weaponFree': 'GRÁTIS'
  },

  'weapons': {
    'rocket': 'Lança-foguetes',
    'gatling': 'Metralhadora Gatling'
  },

  'offer': {
    'confirm': 'Ver anúncio',
    'available': 'Assista a um vídeo e ganhe {weapon} grátis'
  },

  'tutorial': {
    'touch': 'Deslize para mover seu esquadrão',
    'desktop': 'Mova o mouse para guiar seu esquadrão'
  },
  'hints': {
    'move': { 'touch': 'Toque para mover', 'desktop': 'Clique para mover' },
    'divider': { 'touch': 'Nunca toque no pilar entre os portões', 'desktop': 'Nunca toque no pilar entre os portões' },
    'crate': { 'touch': 'Caixas verdes: todos batem mais forte', 'desktop': 'Caixas verdes: todos batem mais forte' },
    'rate': { 'touch': 'Caixas azuis: todos atiram mais rápido', 'desktop': 'Caixas azuis: todos atiram mais rápido' },
    'lever': { 'touch': 'Atire nas DUAS alavancas nas bordas: elas abrem a caixa de arma', 'desktop': 'Atire nas DUAS alavancas nas bordas: elas abrem a caixa de arma' },
    'cage': { 'touch': 'Atire nas jaulas: os prisioneiros entram no seu esquadrão', 'desktop': 'Atire nas jaulas: os prisioneiros entram no seu esquadrão' },
    'shieldBox': { 'touch': 'Caixa escudo: espera e bloqueia um golpe grande', 'desktop': 'Caixa escudo: espera e bloqueia um golpe grande' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} sobreviventes trocados',
    'unlocked': 'Desbloqueado!',

    'guardian': "Um anjo da guarda salvou você!",

    'guardianSub': "{n} sobreviventes voltaram",

    'next': "A seguir: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Escolher uma arma",
    'nextStage': "próximo nível",
    'stagesAway': "em {n} níveis"
  },
  'weaponPick': {
    'title': "Escolha a sua arma",
    'subtitle': "Sua no nível {n}. Há mais esperando na estrada.",
    'take': "Pegar",
    'rocket': {
      'a': "Salva teleguiada",
      'b': "Dano explosivo"
    },
    'gatling': {
      'a': "Cadência de tiro dobrada",
      'b': "Carrega portões mais rápido"
    }
  },
  'bossReward': {
    'title': "Chefe derrotado!",
    'subtitle': "Um presente para o nível {n}. Continue correndo!"
  },
  'result': {
    'stageClear': 'Fase concluída!',
    'wipedOut': 'Esquadrão dizimado',
    'reachedStage': 'Fase {n}',
    'newRecord': 'Novo recorde!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Chefe derrubado!',
    'wasted': 'Liquidado',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Marco!',
    'rallied': 'Segundo fôlego',
    'peakSquad': 'Maior esquadrão',
    'kills': 'Abates',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Moedas triplicadas!',
    'nextStage': 'Próxima fase',
    'tryAgain': 'Tentar de novo',
    'upgrade': 'Melhorar',
    'upgradeHint': 'Melhore seu esquadrão!',
    'rankOf': 'de {n}',
    'upNext': 'A seguir: Nível {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Compartilhar partida',
    'text': 'Cheguei à fase {n} em {game}. Consegue ir mais longe?'
  },

  'leaderboard': {
    'title': 'Classificação',
    'rank': '#',
    'player': 'Jogador',
    'stage': 'Fase',
    'squad': 'Esquadrão',
    'empty': 'Ainda não há marcas. Seja o primeiro!',
    'failed': 'Não foi possível carregar a classificação.',
    'loading': 'Carregando…',
    'you': 'Você',
    'yourRank': 'Você é #{n} de {total}',
    'tabGlobal': 'Global'
  },

  'chest': {
    'label': 'Baú do tesouro',
    'ready': 'Abrir o baú por {n} moedas',
    'filling': 'Baú do tesouro: enchendo',
    'spent': 'Baú do tesouro: vazio até amanhã'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Expedição diária',
    'hud': 'Expedição',
    'multiplier': '{n}×',
    'available': 'Expedição diária — a estrada de hoje, moedas triplicadas',
    'confirm': 'Iniciar expedição',
    'spent': 'Expedição diária — nova estrada em {time}',
    'done': 'Volte amanhã',
    'back': 'Voltar à campanha'
  },

  'skills': {

    'grenade': 'Granada',

    'shield': 'Escudo',

    'locked': 'Bloqueado',

    'unlocksAt': 'Desbloqueia no nível {n}',

    'frost': 'Nova de gelo',

    'decoy': 'Sinalizador isca',

    'trialLabel': '{name} · teste grátis',

    'trialTag': 'Teste grátis!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Levou toda a gente.',
    'alive': 'Ainda estão vivos.',
    'go': 'Vai buscá-los.',
    'skip': 'Saltar'
  },

  'upgrades': {
    'title': 'Melhorias',
    'spotlight': 'Gaste!',
    'level': 'Nv {n}',
    'maxed': 'Máx',
    'peekLabel': 'Melhorias: {name}',
    'peekLabelReady': 'Melhorias: {name} — {n} prontas para comprar',
    'names': {
      'squad': 'Esquadrão',
      'power': 'Poder de fogo',
      'rate': 'Cadência',
      'range': 'Alcance',
      'scavenge': 'Coleta',
      'grenade': 'Granada',
      'shield': 'Escudo',
      'rocket': 'Poder do foguete',
      'gatling': 'Poder da Gatling'
    },
    'descriptions': {
      'squad': 'Comece cada fase com mais sobreviventes.',
      'power': 'Cada sobrevivente causa mais dano por tiro.',
      'rate': 'Cada sobrevivente atira mais rápido.',
      'range': 'Seu esquadrão abre fogo mais adiante na estrada.',
      'scavenge': 'Ganhe mais moedas em cada partida.',
      'grenade': 'Lance uma granada para causar dano pesado.',
      'shield': 'Reduza pela metade o dano ao esquadrão por alguns segundos.',
      'rocket': 'Lança-foguetes que você libera na fase causam mais dano.',
      'gatling': 'Gatlings que você libera na fase causam mais dano.'
    }
  },

  'options': {
    'title': 'Opções', 'general': 'Geral', 'audio': 'Áudio', 'language': 'Idioma',
    'difficulty': 'Dificuldade', 'soundEffects': 'Efeitos sonoros', 'music': 'Música', 'musicTrack': 'Faixa musical',
    'musicTracks': { 'cozy': 'Harmonia aconchegante', 'trance': 'Túnel trance' },
    'haptics': 'Vibração', 'on': 'Ligado', 'off': 'Desligado',
    'close': 'Salvar e fechar',
    'difficulties': { 'easy': 'Fácil', 'medium': 'Médio', 'hard': 'Difícil' },
    'difficultyHints': {
      'easy': 'Inimigos mais fracos e barricadas mais finas.',
      'medium': 'A partida padrão.',
      'hard': 'Inimigos mais duros e barricadas mais resistentes.'
    }
  },

  'adsBlocked': {
    'title': 'Não foi possível exibir o anúncio',
    'body': 'Tentamos mostrar um vídeo para você ganhar sua recompensa, mas algo no seu navegador está bloqueando anúncios.',
    'allowPrefix': 'Permita anúncios em',
    'allowSuffix': '(ou pause seu bloqueador para este jogo) e tente novamente.',
    'gotIt': 'Entendi'
  },
  'saveStatus': {
    'restoredTitle': 'Salvamento na nuvem restaurado', 'restoredBody': '+{n} moedas de bônus pela recuperação',
    'tap': 'toque', 'pausedTitle': 'Sincronização pausada',
    'pausedBody': 'Jogando offline. Seu progresso está salvo aqui.',
    'retry': 'Tentar de novo', 'dismiss': 'dispensar'
  },
  'loading': { 'tooLong': 'O carregamento está demorando? Desative seu bloqueador de anúncios e recarregue.', 'boo': 'Bu!', 'laugh': 'Hahaha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Gire o celular',
    'body': 'Survivalist joga-se na vertical.'
  },
  'license': { 'denied': 'Acesso negado: adquira uma licença.' }
}
