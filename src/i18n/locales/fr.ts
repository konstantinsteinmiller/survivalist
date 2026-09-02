export default {
  'gameName': 'Survivalist',
  'cancel': 'Annuler',
  'close': 'Fermer',
  'ok': 'Ok',
  'continue': 'Continuer',
  'tapToContinue': 'Touchez pour continuer',
  'clickToContinue': 'Cliquez pour continuer',
  'rewards': 'RÉCOMPENSES',
  'tip': 'Astuce',
  'crazyGamesOnly': 'Ce jeu est uniquement disponible sur',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Suivant',
    'replay': 'Rejouer',
    'back': 'Retour',
    'play': 'Jouer',
    'pause': 'Pause',
    'menu': 'Menu',
    'home': 'Accueil',
    'info': 'Infos'
  },

  'hud': {
    'stage': 'Niveau {n}',
    'best': 'Record {n}',
    'boss': 'Boss',
    'miniboss': 'Mini-boss',
    'fireRate': 'Rythme'
  },

  'tutorial': {
    'touch': 'Glisse pour déplacer ton escouade',
    'desktop': 'Bouge la souris pour diriger ton escouade'
  },
  'hints': {
    'move': { 'touch': 'Touche pour te déplacer', 'desktop': 'Clique pour te déplacer' },
    'gate': { 'touch': 'Continue de tirer sur la porte : +1 toutes les demi-secondes', 'desktop': 'Continue de tirer sur la porte : +1 toutes les demi-secondes' },
    'trap': { 'touch': 'Les portes rouges RÉDUISENT ton escouade : prends l’autre !', 'desktop': 'Les portes rouges RÉDUISENT ton escouade : prends l’autre !' },
    'divider': { 'touch': 'Ne touche jamais le pilier entre les portes', 'desktop': 'Ne touche jamais le pilier entre les portes' },
    'crate': { 'touch': 'Caisses vertes : tous frappent plus fort', 'desktop': 'Caisses vertes : tous frappent plus fort' },
    'rate': { 'touch': 'Caisses bleues : tous tirent plus vite', 'desktop': 'Caisses bleues : tous tirent plus vite' },
    'boss': { 'touch': 'Reste hors du cercle rouge !', 'desktop': 'Reste hors du cercle rouge !' },
    'guard': { 'touch': 'Bouclier levé — tes tirs ne font rien. BOUGE !', 'desktop': 'Bouclier levé — tes tirs ne font rien. BOUGE !' }
  },

  'result': {
    'stageClear': 'Niveau terminé !',
    'wipedOut': 'Escouade anéantie',
    'reachedStage': 'Niveau {n}',
    'newRecord': 'Nouveau record !',
    'rallied': 'Second souffle',
    'peakSquad': 'Plus grande escouade',
    'kills': 'Éliminations',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Pièces triplées !',
    'nextStage': 'Niveau suivant',
    'tryAgain': 'Réessayer',
    'upgrade': 'Améliorer',
    'rankOf': 'sur {n}'
  },

  'leaderboard': {
    'title': 'Classement',
    'rank': '#',
    'player': 'Joueur',
    'stage': 'Niveau',
    'squad': 'Escouade',
    'empty': 'Aucun score pour l’instant. Sois le premier !',
    'failed': 'Classement inaccessible.',
    'loading': 'Chargement…',
    'you': 'Toi',
    'yourRank': 'Tu es #{n}',
    'of': 'sur {n} joueurs'
  },

  'upgrades': {
    'title': 'Améliorations',
    'spotlight': 'Dépense !',
    'level': 'Niv {n}',
    'maxed': 'Max',
    'names': {
      'squad': 'Escouade',
      'power': 'Puissance',
      'rate': 'Cadence',
      'range': 'Portée',
      'scavenge': 'Récupération'
    },
    'descriptions': {
      'squad': 'Commence chaque niveau avec plus de survivants.',
      'power': 'Chaque survivant inflige plus de dégâts par tir.',
      'rate': 'Chaque survivant tire plus vite.',
      'range': 'Ton escouade ouvre le feu plus loin sur la route.',
      'scavenge': 'Gagne plus de pièces à chaque partie.'
    }
  },

  'options': {
    'title': 'Options', 'general': 'Général', 'audio': 'Audio', 'language': 'Langue',
    'difficulty': 'Difficulté', 'soundEffects': 'Effets sonores', 'music': 'Musique', 'musicTrack': 'Piste musicale',
    'musicTracks': { 'cozy': 'Harmonie douce', 'trance': 'Tunnel trance' },
    'close': 'Enregistrer et fermer',
    'difficulties': { 'easy': 'Facile', 'medium': 'Moyen', 'hard': 'Difficile' },
    'difficultyHints': {
      'easy': 'Ennemis plus faibles et barricades plus fines.',
      'medium': 'La partie standard.',
      'hard': 'Ennemis plus coriaces et barricades plus solides.'
    }
  },

  'adsBlocked': {
    'title': 'Impossible d’afficher la publicité',
    'body': 'Nous avons essayé de vous montrer une vidéo pour votre récompense, mais quelque chose dans votre navigateur bloque les publicités.',
    'allowPrefix': 'Autorisez les publicités sur',
    'allowSuffix': '(ou mettez votre bloqueur en pause pour ce jeu) puis réessayez.',
    'gotIt': 'Compris'
  },
  'saveStatus': {
    'restoredTitle': 'Sauvegarde cloud restaurée', 'restoredBody': '+{n} pièces bonus pour la récupération',
    'tap': 'toucher', 'pausedTitle': 'Synchronisation en pause',
    'pausedBody': 'Vous jouez hors ligne. Votre progression est enregistrée ici.',
    'retry': 'Réessayer', 'dismiss': 'ignorer'
  },
  'loading': { 'tooLong': 'Le chargement est trop long ? Désactivez votre bloqueur de publicités et rechargez.' },
  'license': { 'denied': 'Accès refusé : veuillez acheter une licence.' }
}
