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
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Niveaux avant le prochain bonus',
    'fireRate': 'Rythme',
    'incoming': 'Attaque imminente !',
    'dodge': 'Esquive',
    'getIn': 'Entre',
    'holdStill': 'Bouge pas',
    'milestone': '{n} au combat !',
    'weaponActive': '{name} prêt',
    'weaponsActive': '{a} + {b} prêts',
    'weaponLocked': '{name} verrouillé — {n} leviers sur {total} touchés',
    'weaponGift': '{name} devant — gratuit, sans leviers',
    'weaponFree': 'GRATUIT'
  },

  'weapons': {
    'rocket': 'Lance-roquettes',
    'gatling': 'Gatling'
  },

  'offer': {
    'confirm': 'Voir la pub',
    'available': 'Regarde une vidéo et obtiens {weapon} gratuitement'
  },

  'tutorial': {
    'touch': 'Glisse pour déplacer ton escouade',
    'desktop': 'Bouge la souris pour diriger ton escouade'
  },
  'hints': {
    'move': { 'touch': 'Touche pour te déplacer', 'desktop': 'Clique pour te déplacer' },
    'divider': { 'touch': 'Ne touche jamais le pilier entre les portes', 'desktop': 'Ne touche jamais le pilier entre les portes' },
    'crate': { 'touch': 'Caisses vertes : tous frappent plus fort', 'desktop': 'Caisses vertes : tous frappent plus fort' },
    'rate': { 'touch': 'Caisses bleues : tous tirent plus vite', 'desktop': 'Caisses bleues : tous tirent plus vite' },
    'lever': { 'touch': 'Tire sur les DEUX leviers au bord de la route — ils ouvrent la caisse', 'desktop': 'Tire sur les DEUX leviers au bord de la route — ils ouvrent la caisse' },
    'cage': { 'touch': 'Tire sur les cages — les prisonniers rejoignent ta troupe', 'desktop': 'Tire sur les cages — les prisonniers rejoignent ta troupe' },
    'shieldBox': { 'touch': 'Caisse bouclier — elle attend, puis bloque un gros coup', 'desktop': 'Caisse bouclier — elle attend, puis bloque un gros coup' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} survivants encaissés',
    'unlocked': 'Débloqué !',

    'guardian': "Un ange gardien t'a sauvé !",

    'guardianSub': "{n} survivants sont de retour",

    'next': "Ensuite : {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Choisir une arme",
    'nextStage': "niveau suivant",
    'stagesAway': "dans {n} niveaux"
  },
  'weaponPick': {
    'title': "Choisis ton arme",
    'subtitle': "À toi pour le niveau {n}. D'autres t'attendent sur la route.",
    'take': "Prendre",
    'rocket': {
      'a': "Salve à tête chercheuse",
      'b': "Dégâts de zone"
    },
    'gatling': {
      'a': "Cadence de tir doublée",
      'b': "Charge les portes plus vite"
    }
  },
  'bossReward': {
    'title': "Boss vaincu !",
    'subtitle': "Un cadeau pour le niveau {n}. Continue de courir !"
  },
  'result': {
    'stageClear': 'Niveau terminé !',
    'wipedOut': 'Escouade anéantie',
    'reachedStage': 'Niveau {n}',
    'newRecord': 'Nouveau record !',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Boss terrassé !',
    'wasted': 'Éliminé',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Palier !',
    'rallied': 'Second souffle',
    'peakSquad': 'Plus grande escouade',
    'kills': 'Éliminations',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Pièces triplées !',
    'nextStage': 'Niveau suivant',
    'tryAgain': 'Réessayer',
    'upgrade': 'Améliorer',
    'upgradeHint': 'Améliore ton escouade !',
    'rankOf': 'sur {n}',
    'upNext': 'Ensuite : Niveau {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Partager la partie',
    'text': "J'ai atteint le niveau {n} dans {game}. Tu peux faire mieux ?"
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
    'yourRank': 'Tu es #{n} sur {total}',
    'tabGlobal': 'Mondial'
  },

  'chest': {
    'label': 'Coffre au trésor',
    'ready': 'Ouvrir le coffre pour {n} pièces',
    'filling': 'Coffre au trésor : en cours de remplissage',
    'spent': 'Coffre au trésor : vide jusqu\'à demain'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Expédition du jour',
    'hud': 'Expédition',
    'multiplier': '{n}×',
    'available': 'Expédition du jour : la route du jour, pièces triplées',
    'confirm': "Lancer l'expédition",
    'spent': 'Expédition du jour : nouvelle route dans {time}',
    'done': 'Revenez demain',
    'back': 'Retour à la campagne'
  },

  'skills': {

    'grenade': 'Grenade',

    'shield': 'Bouclier',

    'locked': 'Verrouillé',

    'unlocksAt': 'Débloqué au niveau {n}',

    'frost': 'Nova de givre',

    'decoy': 'Fusée leurre',

    'trialLabel': '{name} · essai gratuit',

    'trialTag': 'Essai gratuit !',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Il a pris tout le monde.',
    'alive': 'Ils sont encore en vie.',
    'go': 'Va les chercher.',
    'skip': 'Passer'
  },

  'upgrades': {
    'title': 'Améliorations',
    'spotlight': 'Dépense !',
    'level': 'Niv {n}',
    'maxed': 'Max',
    'peekLabel': 'Améliorations : {name}',
    'peekLabelReady': 'Améliorations : {name} — {n} disponibles à l’achat',
    'names': {
      'squad': 'Escouade',
      'power': 'Puissance',
      'rate': 'Cadence',
      'range': 'Portée',
      'scavenge': 'Récupération',
      'grenade': 'Grenade',
      'shield': 'Bouclier',
      'rocket': 'Puissance roquette',
      'gatling': 'Puissance Gatling'
    },
    'descriptions': {
      'squad': 'Commence chaque niveau avec plus de survivants.',
      'power': 'Chaque survivant inflige plus de dégâts par tir.',
      'rate': 'Chaque survivant tire plus vite.',
      'range': 'Ton escouade ouvre le feu plus loin sur la route.',
      'scavenge': 'Gagne plus de pièces à chaque partie.',
      'grenade': 'Lance une grenade pour infliger de gros dégâts.',
      'shield': 'Réduit de moitié les dégâts subis pendant quelques secondes.',
      'rocket': 'Les lance-roquettes trouvés dans un niveau font plus de dégâts.',
      'gatling': 'Les Gatling trouvées dans un niveau font plus de dégâts.'
    }
  },

  'options': {
    'title': 'Options', 'general': 'Général', 'audio': 'Audio', 'language': 'Langue',
    'difficulty': 'Difficulté', 'soundEffects': 'Effets sonores', 'music': 'Musique', 'musicTrack': 'Piste musicale',
    'musicTracks': { 'cozy': 'Harmonie douce', 'trance': 'Tunnel trance' },
    'haptics': 'Vibration', 'on': 'Activé', 'off': 'Désactivé',
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
  'loading': { 'tooLong': 'Le chargement est trop long ? Désactivez votre bloqueur de publicités et rechargez.', 'boo': 'Bouh !', 'laugh': 'Hahaha !' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Tourne ton téléphone',
    'body': 'Survivalist se joue en portrait.'
  },
  'license': { 'denied': 'Accès refusé : veuillez acheter une licence.' }
}
