export default {
  'gameName': 'Survivalist',
  'cancel': 'रद्द करें',
  'close': 'बंद करें',
  'ok': 'ठीक है',
  'continue': 'जारी रखें',
  'tapToContinue': 'जारी रखने के लिए टैप करें',
  'clickToContinue': 'जारी रखने के लिए क्लिक करें',
  'rewards': 'इनाम',
  'tip': 'सुझाव',
  'crazyGamesOnly': 'यह गेम केवल यहाँ उपलब्ध है:',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'आगे',
    'replay': 'दोबारा',
    'back': 'पीछे',
    'play': 'खेलें',
    'pause': 'रोकें',
    'menu': 'मेन्यू',
    'home': 'होम',
    'info': 'जानकारी'
  },

  'hud': {
    'stage': 'चरण {n}',
    'best': 'सर्वश्रेष्ठ {n}',
    'boss': 'बॉस',
    'miniboss': 'मिनी बॉस',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'अगले बोनस तक के चरण',
    'fireRate': 'दर',
    'incoming': 'हमला आ रहा है!',
    'dodge': 'बचें',
    'getIn': 'अंदर जाएँ',
    'holdStill': 'रुको',
    'milestone': '{n} की सेना!',
    'weaponActive': '{name} तैयार',
    'weaponsActive': '{a} + {b} तैयार',
    'weaponLocked': '{name} लॉक — {total} में से {n} लीवर दागे गए',
    'weaponGift': '{name} आगे — मुफ़्त, कोई लीवर नहीं',
    'weaponFree': 'मुफ़्त'
  },

  'weapons': {
    'rocket': 'रॉकेट लॉन्चर',
    'gatling': 'गैटलिंग गन'
  },

  'offer': {
    'confirm': 'विज्ञापन देखें',
    'available': 'वीडियो देखें और {weapon} मुफ़्त पाएं'
  },

  'tutorial': {
    'touch': 'अपनी टुकड़ी हिलाने के लिए स्वाइप करें',
    'desktop': 'टुकड़ी चलाने के लिए माउस घुमाएँ'
  },
  'hints': {
    'move': { 'touch': 'चलने के लिए टैप करें', 'desktop': 'चलने के लिए क्लिक करें' },
    'divider': { 'touch': 'गेटों के बीच का खंभा कभी न छुएँ', 'desktop': 'गेटों के बीच का खंभा कभी न छुएँ' },
    'crate': { 'touch': 'हरे बक्से: सबकी मार बढ़ेगी', 'desktop': 'हरे बक्से: सबकी मार बढ़ेगी' },
    'rate': { 'touch': 'नीले बक्से: सब तेज़ी से गोली चलाएँगे', 'desktop': 'नीले बक्से: सब तेज़ी से गोली चलाएँगे' },
    'lever': { 'touch': 'सड़क के किनारों पर दोनों लीवर पर गोली मारो — वे हथियार बॉक्स खोलते हैं', 'desktop': 'सड़क के किनारों पर दोनों लीवर पर गोली मारो — वे हथियार बॉक्स खोलते हैं' },
    'cage': { 'touch': 'पिंजरों पर गोली चलाओ — कैदी आपकी टोली में शामिल होंगे', 'desktop': 'पिंजरों पर गोली चलाओ — कैदी आपकी टोली में शामिल होंगे' },
    'shieldBox': { 'touch': 'ढाल बॉक्स — यह इंतज़ार करता है, फिर एक बड़ा वार रोकता है', 'desktop': 'ढाल बॉक्स — यह इंतज़ार करता है, फिर एक बड़ा वार रोकता है' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} बचे हुए भुनाए गए',
    'unlocked': 'अनलॉक!',

    'guardian': "एक अभिभावक देवदूत ने आपको बचाया!",

    'guardianSub': "{n} बचे हुए लौट आए",

    'next': "आगे: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "हथियार चुनें",
    'nextStage': "अगला स्टेज",
    'stagesAway': "{n} स्टेज बाद"
  },
  'weaponPick': {
    'title': "अपना हथियार चुनें",
    'subtitle': "स्टेज {n} के लिए आपका। रास्ते में और भी हैं।",
    'take': "ले लो",
    'rocket': {
      'a': "लक्ष्य-साधक सैल्वो",
      'b': "विस्फोट क्षति"
    },
    'gatling': {
      'a': "दोगुनी फायर दर",
      'b': "गेट तेज़ी से बढ़ाता है"
    }
  },
  'bossReward': {
    'title': "बॉस हार गया!",
    'subtitle': "स्टेज {n} के लिए तोहफ़ा। दौड़ते रहो!"
  },
  'result': {
    'stageClear': 'चरण पूरा!',
    'wipedOut': 'दस्ता खत्म',
    'reachedStage': 'चरण {n}',
    'newRecord': 'नया रिकॉर्ड!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'बॉस गिरा!',
    'wasted': 'ख़त्म',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'पड़ाव!',
    'rallied': 'नया जोश',
    'peakSquad': 'सबसे बड़ा दस्ता',
    'kills': 'मारे गए',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'सिक्के तिगुने!',
    'nextStage': 'अगला चरण',
    'tryAgain': 'फिर कोशिश करें',
    'upgrade': 'अपग्रेड',
    'upgradeHint': 'अपनी टुकड़ी को अपग्रेड करें!',
    'rankOf': '{n} में से',
    'upNext': 'आगे: स्टेज {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'अपना रन शेयर करें',
    'text': 'मैं {game} में स्टेज {n} तक पहुँचा। क्या तुम इससे आगे जा सकते हो?'
  },

  'leaderboard': {
    'title': 'लीडरबोर्ड',
    'rank': '#',
    'player': 'खिलाड़ी',
    'stage': 'चरण',
    'squad': 'दस्ता',
    'empty': 'अभी कोई स्कोर नहीं। पहले बनें!',
    'failed': 'लीडरबोर्ड तक नहीं पहुँच सके।',
    'loading': 'लोड हो रहा है…',
    'you': 'आप',
    'yourRank': '{total} खिलाड़ियों में आप #{n} पर हैं'
  },

  'chest': {
    'label': 'खज़ाने का संदूक',
    'ready': '{n} सिक्कों के लिए संदूक खोलें',
    'filling': 'खज़ाने का संदूक भर रहा है',
    'spent': 'खज़ाने का संदूक कल तक खाली है'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'दैनिक अभियान',
    'hud': 'अभियान',
    'multiplier': '{n}×',
    'available': 'दैनिक अभियान — आज का रास्ता, तिगुने सिक्के',
    'confirm': 'अभियान शुरू करें',
    'spent': 'दैनिक अभियान — नया रास्ता {time} में',
    'done': 'कल फिर आएं',
    'back': 'मुख्य खेल पर लौटें'
  },

  'skills': {

    'grenade': 'ग्रेनेड',

    'shield': 'ढाल',

    'locked': 'लॉक है',

    'unlocksAt': 'स्टेज {n} पर खुलेगा',

    'frost': 'फ्रॉस्ट नोवा',

    'decoy': 'छल फ़्लेयर',

    'trialLabel': '{name} · मुफ़्त आज़माएँ',

    'trialTag': 'मुफ़्त आज़माएँ!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'यह सबको ले गया।',
    'alive': 'वे अब भी ज़िंदा हैं।',
    'go': 'जाओ, उन्हें लाओ।',
    'skip': 'छोड़ें'
  },

  'upgrades': {
    'title': 'अपग्रेड',
    'spotlight': 'खर्च करें!',
    'level': 'लेव {n}',
    'maxed': 'अधिकतम',
    'peekLabel': 'अपग्रेड: {name}',
    'peekLabelReady': 'अपग्रेड: {name} — {n} खरीदने के लिए तैयार',
    'names': {
      'squad': 'दस्ता',
      'power': 'मारक क्षमता',
      'rate': 'फायर दर',
      'range': 'पहुँच',
      'scavenge': 'खोज',
      'grenade': 'ग्रेनेड',
      'shield': 'ढाल',
      'rocket': 'रॉकेट शक्ति',
      'gatling': 'गैटलिंग शक्ति'
    },
    'descriptions': {
      'squad': 'हर चरण अधिक बचे लोगों के साथ शुरू करें।',
      'power': 'हर सदस्य प्रति गोली अधिक नुकसान करता है।',
      'rate': 'हर सदस्य तेज़ी से गोली चलाता है।',
      'range': 'आपकी टुकड़ी सड़क पर और आगे से गोली चलाती है।',
      'scavenge': 'हर दौर में अधिक सिक्के कमाएँ।',
      'grenade': 'भारी नुकसान के लिए ग्रेनेड फेंकें।',
      'shield': 'कुछ सेकंड के लिए आपकी टुकड़ी को आधा नुकसान।',
      'rocket': 'स्टेज में मिले रॉकेट लॉन्चर ज़्यादा नुकसान करते हैं।',
      'gatling': 'स्टेज में मिली गैटलिंग गन ज़्यादा नुकसान करती है।'
    }
  },

  'options': {
    'title': 'विकल्प', 'general': 'सामान्य', 'audio': 'ऑडियो', 'language': 'भाषा',
    'difficulty': 'कठिनाई', 'soundEffects': 'ध्वनि प्रभाव', 'music': 'संगीत', 'musicTrack': 'संगीत ट्रैक',
    'musicTracks': { 'cozy': 'सुकून भरी धुन', 'trance': 'ट्रांस टनल' },
    'haptics': 'कंपन', 'on': 'चालू', 'off': 'बंद',
    'close': 'सहेजें और बंद करें',
    'difficulties': { 'easy': 'आसान', 'medium': 'मध्यम', 'hard': 'कठिन' },
    'difficultyHints': {
      'easy': 'कमज़ोर दुश्मन और पतली रुकावटें।',
      'medium': 'सामान्य दौर।',
      'hard': 'मज़बूत दुश्मन और भारी रुकावटें।'
    }
  },

  'adsBlocked': {
    'title': 'विज्ञापन नहीं दिखा सके',
    'body': 'हमने आपको इनाम दिलाने के लिए वीडियो दिखाने की कोशिश की, पर आपके ब्राउज़र में कुछ विज्ञापन रोक रहा है।',
    'allowPrefix': 'कृपया यहाँ विज्ञापनों की अनुमति दें:',
    'allowSuffix': '(या इस गेम के लिए ऐड-ब्लॉकर रोकें) और फिर कोशिश करें।',
    'gotIt': 'समझ गया'
  },
  'saveStatus': {
    'restoredTitle': 'क्लाउड सेव बहाल हुआ', 'restoredBody': 'रिकवरी के लिए +{n} बोनस सिक्के',
    'tap': 'टैप', 'pausedTitle': 'क्लाउड सिंक रुका',
    'pausedBody': 'ऑफ़लाइन खेल रहे हैं। आपकी प्रगति यहाँ सहेजी जा रही है।',
    'retry': 'फिर कोशिश करें', 'dismiss': 'हटाएँ'
  },
  'loading': { 'tooLong': 'लोड होने में बहुत समय लग रहा है? ऐड-ब्लॉकर बंद करें और रीफ़्रेश करें।', 'boo': 'बू!', 'laugh': 'हाहाहा!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'अपना फ़ोन घुमाएँ',
    'body': 'Survivalist पोर्ट्रेट में खेली जाती है.'
  },
  'license': { 'denied': 'पहुँच अस्वीकृत: कृपया लाइसेंस खरीदें।' }
}
