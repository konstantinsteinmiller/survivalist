export default {
  'gameName': 'Survivalist',
  'cancel': 'Annulla',
  'close': 'Chiudi',
  'ok': 'Ok',
  'continue': 'Continua',
  'tapToContinue': 'Tocca per continuare',
  'clickToContinue': 'Clicca per continuare',
  'rewards': 'RICOMPENSE',
  'tip': 'Consiglio',
  'crazyGamesOnly': 'Questo gioco è disponibile solo su',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Avanti',
    'replay': 'Riprova',
    'back': 'Indietro',
    'play': 'Gioca',
    'pause': 'Pausa',
    'menu': 'Menu',
    'home': 'Home',
    'info': 'Info'
  },

  'hud': {
    'stage': 'Livello {n}',
    'best': 'Record {n}',
    'boss': 'Boss',
    'miniboss': 'Miniboss',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Livelli al prossimo bonus',
    'fireRate': 'Ritmo',
    'incoming': 'Attacco in arrivo!',
    'dodge': 'Schiva',
    'getIn': 'Entra',
    'holdStill': 'Fermo',
    'milestone': '{n} in campo!',
    'weaponActive': '{name} pronto',
    'weaponsActive': '{a} + {b} pronti',
    'weaponLocked': '{name} bloccato — {n} di {total} leve colpite',
    'weaponGift': '{name} più avanti — gratis, niente leve',
    'weaponFree': 'GRATIS'
  },

  'weapons': {
    'rocket': 'Lanciarazzi',
    'gatling': 'Gatling'
  },

  'offer': {
    'confirm': 'Guarda video',
    'available': 'Guarda un video e ottieni {weapon} gratis'
  },

  'tutorial': {
    'touch': 'Scorri per muovere la squadra',
    'desktop': 'Muovi il mouse per guidare la squadra'
  },
  'hints': {
    'move': { 'touch': 'Tocca per muoverti', 'desktop': 'Clicca per muoverti' },
    'trap': { 'touch': 'I cancelli rossi RIDUCONO la squadra: prendi l’altro!', 'desktop': 'I cancelli rossi RIDUCONO la squadra: prendi l’altro!' },
    'divider': { 'touch': 'Non toccare mai il pilastro tra i cancelli', 'desktop': 'Non toccare mai il pilastro tra i cancelli' },
    'crate': { 'touch': 'Casse verdi: tutti colpiscono più forte', 'desktop': 'Casse verdi: tutti colpiscono più forte' },
    'rate': { 'touch': 'Casse blu: tutti sparano più veloce', 'desktop': 'Casse blu: tutti sparano più veloce' },
    'lever': { 'touch': 'Colpisci ENTRAMBE le leve ai bordi: aprono la cassa delle armi', 'desktop': 'Colpisci ENTRAMBE le leve ai bordi: aprono la cassa delle armi' },
    'cage': { 'touch': 'Spara alle gabbie: i prigionieri si uniscono alla squadra', 'desktop': 'Spara alle gabbie: i prigionieri si uniscono alla squadra' },
    'shieldBox': { 'touch': 'Cassa scudo: aspetta, poi blocca un colpo grosso', 'desktop': 'Cassa scudo: aspetta, poi blocca un colpo grosso' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} sopravvissuti riscossi',
    'unlocked': 'Sbloccato!',

    'guardian': "Un angelo custode ti ha salvato!",

    'guardianSub': "{n} sopravvissuti sono tornati",

    'next': "Prossimo: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Scegli un'arma",
    'nextStage': "prossimo livello",
    'stagesAway': "tra {n} livelli"
  },
  'weaponPick': {
    'title': "Scegli la tua arma",
    'subtitle': "Tua per il livello {n}. Altre ti aspettano sulla strada.",
    'take': "Prendila",
    'rocket': {
      'a': "Salva a ricerca",
      'b': "Danno esplosivo"
    },
    'gatling': {
      'a': "Cadenza di fuoco doppia",
      'b': "Carica i cancelli più in fretta"
    }
  },
  'bossReward': {
    'title': "Boss sconfitto!",
    'subtitle': "Un regalo per il livello {n}. Continua a correre!"
  },
  'result': {
    'stageClear': 'Livello superato!',
    'wipedOut': 'Squadra annientata',
    'reachedStage': 'Livello {n}',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n}%',
    'bestReach': 'Record {n}%',
    'newReach': 'Mai così lontano!',
    'newRecord': 'Nuovo record!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Boss abbattuto!',
    'wasted': 'Eliminato',
    'cause': {
      'foe': 'Travolto dai mostri',
      'elite': 'Un miniboss ti ha spezzato',
      'barricade': 'Finito sulle barricate',
      'crate': 'Finito sulle casse',
      'divider': 'Preso i separatori',
      'trap': 'Caduto nelle trappole',
      'slam': 'Il boss ti ha schiacciato'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Traguardo!',
    'rallied': 'Secondo fiato',
    'peakSquad': 'Squadra massima',
    'kills': 'Eliminazioni',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Monete triplicate!',
    'nextStage': 'Livello successivo',
    'tryAgain': 'Riprova',
    'upgrade': 'Potenzia',
    'upgradeHint': 'Potenzia la squadra!',
    'rankOf': 'su {n}',
    'upNext': 'Prossimo: Livello {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Condividi la partita',
    'text': 'Sono arrivato al livello {n} in {game}. Riesci ad andare più lontano?'
  },

  'leaderboard': {
    'title': 'Classifica',
    'rank': '#',
    'player': 'Giocatore',
    'stage': 'Livello',
    'squad': 'Squadra',
    'empty': 'Ancora nessun punteggio. Sii il primo!',
    'failed': 'Classifica non raggiungibile.',
    'loading': 'Caricamento…',
    'you': 'Tu',
    'yourRank': 'Sei #{n} su {total}'
  },

  'chest': {
    'label': 'Forziere',
    'ready': 'Apri il forziere per {n} monete',
    'filling': 'Forziere: si sta riempiendo',
    'spent': 'Forziere: vuoto fino a domani'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Spedizione del giorno',
    'hud': 'Spedizione',
    'multiplier': '{n}×',
    'available': 'Spedizione del giorno: la strada di oggi, monete triple',
    'confirm': 'Inizia la spedizione',
    'spent': 'Spedizione del giorno: nuova strada tra {time}',
    'done': 'Torna domani',
    'back': 'Torna alla campagna'
  },

  'skills': {

    'grenade': 'Granata',

    'shield': 'Scudo',

    'locked': 'Bloccato',

    'unlocksAt': 'Si sblocca al livello {n}',

    'frost': 'Nova di gelo',

    'decoy': 'Razzo esca',

    'trialLabel': '{name} · prova gratis',

    'trialTag': 'Prova gratis!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': 'Potenziamenti',
    'spotlight': 'Spendi!',
    'level': 'Lv {n}',
    'maxed': 'Max',
    'peekLabel': 'Potenziamenti: {name}',
    'peekLabelReady': 'Potenziamenti: {name} — {n} pronti all’acquisto',
    'names': {
      'squad': 'Squadra',
      'power': 'Potenza',
      'rate': 'Cadenza',
      'range': 'Gittata',
      'scavenge': 'Recupero',
      'grenade': 'Granata',
      'shield': 'Scudo',
      'rocket': 'Potenza razzi',
      'gatling': 'Potenza Gatling'
    },
    'descriptions': {
      'squad': 'Inizia ogni livello con più sopravvissuti.',
      'power': 'Ogni sopravvissuto infligge più danni per colpo.',
      'rate': 'Ogni sopravvissuto spara più velocemente.',
      'range': 'La squadra apre il fuoco più avanti sulla strada.',
      'scavenge': 'Guadagna più monete a ogni partita.',
      'grenade': 'Lancia una granata per un colpo di danno pesante.',
      'shield': 'Dimezza i danni alla squadra per qualche secondo.',
      'rocket': 'I lanciarazzi che sblocchi in un livello fanno più danni.',
      'gatling': 'Le Gatling che sblocchi in un livello fanno più danni.'
    }
  },

  'options': {
    'title': 'Opzioni', 'general': 'Generale', 'audio': 'Audio', 'language': 'Lingua',
    'difficulty': 'Difficoltà', 'soundEffects': 'Effetti sonori', 'music': 'Musica', 'musicTrack': 'Traccia musicale',
    'musicTracks': { 'cozy': 'Armonia accogliente', 'trance': 'Tunnel trance' },
    'haptics': 'Vibrazione', 'on': 'Attivo', 'off': 'Disattivo',
    'close': 'Salva e chiudi',
    'difficulties': { 'easy': 'Facile', 'medium': 'Media', 'hard': 'Difficile' },
    'difficultyHints': {
      'easy': 'Nemici più deboli e barricate più sottili.',
      'medium': 'La partita standard.',
      'hard': 'Nemici più duri e barricate più resistenti.'
    }
  },

  'adsBlocked': {
    'title': 'Impossibile mostrare l’annuncio',
    'body': 'Abbiamo provato a mostrarti un video per farti ottenere la ricompensa, ma qualcosa nel tuo browser blocca gli annunci.',
    'allowPrefix': 'Consenti gli annunci su',
    'allowSuffix': '(o metti in pausa il blocco annunci per questo gioco) e riprova.',
    'gotIt': 'Capito'
  },
  'saveStatus': {
    'restoredTitle': 'Salvataggio cloud ripristinato', 'restoredBody': '+{n} monete bonus per il recupero',
    'tap': 'tocca', 'pausedTitle': 'Sincronizzazione in pausa',
    'pausedBody': 'Stai giocando offline. I progressi sono salvati qui.',
    'retry': 'Riprova', 'dismiss': 'ignora'
  },
  'loading': { 'tooLong': 'Il caricamento è troppo lento? Disattiva il blocco annunci e ricarica.', 'boo': 'Bu!', 'laugh': 'Ahahah!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Ruota il telefono',
    'body': 'Survivalist si gioca in verticale.'
  },
  'license': { 'denied': 'Accesso negato: acquista una licenza.' }
}
