export default {
  'gameName': 'Survivalist',
  'cancel': 'キャンセル',
  'close': '閉じる',
  'ok': 'OK',
  'continue': '続ける',
  'tapToContinue': 'タップして続ける',
  'clickToContinue': 'クリックして続ける',
  'rewards': '報酬',
  'tip': 'ヒント',
  'crazyGamesOnly': 'このゲームは以下でのみプレイできます：',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': '次へ',
    'replay': 'もう一度',
    'back': '戻る',
    'play': 'プレイ',
    'pause': '一時停止',
    'menu': 'メニュー',
    'home': 'ホーム',
    'info': '情報'
  },

  'hud': {
    'stage': 'ステージ {n}',
    'best': '最高 {n}',
    'boss': 'ボス',
    'miniboss': '中ボス',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': '次のボーナスまでのステージ数',
    'fireRate': '連射',
    'incoming': '攻撃が来る！',
    'dodge': '回避',
    'getIn': '中へ',
    'holdStill': '動くな',
    'milestone': '{n}人突破！',
    'weaponActive': '{name} 準備完了',
    'weaponsActive': '{a} + {b} 準備完了',
    'weaponLocked': '{name} ロック中 — レバー {total} 本中 {n} 本',
    'weaponGift': '{name} が前方に — 無料、レバーなし',
    'weaponFree': '無料'
  },

  'weapons': {
    'rocket': 'ロケットランチャー',
    'gatling': 'ガトリングガン'
  },

  'offer': {
    'confirm': '広告を見る',
    'available': '動画を見て{weapon}を無料でゲット'
  },

  'tutorial': {
    'touch': 'スワイプして部隊を動かそう',
    'desktop': 'マウスを動かして部隊を操作しよう'
  },
  'hints': {
    'move': { 'touch': 'タップで移動', 'desktop': 'クリックで移動' },
    'trap': { 'touch': '赤いゲートは仲間が減る！反対側へ', 'desktop': '赤いゲートは仲間が減る！反対側へ' },
    'divider': { 'touch': 'ゲートの間の柱に触れるな', 'desktop': 'ゲートの間の柱に触れるな' },
    'crate': { 'touch': '緑の箱：全員の攻撃力アップ', 'desktop': '緑の箱：全員の攻撃力アップ' },
    'rate': { 'touch': '青い箱：全員の連射が速くなる', 'desktop': '青い箱：全員の連射が速くなる' },
    'lever': { 'touch': '道の両端のレバーを両方撃て — 武器箱が開く', 'desktop': '道の両端のレバーを両方撃て — 武器箱が開く' },
    'cage': { 'touch': '檻を撃て — 囚人が仲間になる', 'desktop': '檻を撃て — 囚人が仲間になる' },
    'shieldBox': { 'touch': 'シールド箱 — 待機して大きな一撃を1回防ぐ', 'desktop': 'シールド箱 — 待機して大きな一撃を1回防ぐ' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '生存者 {n} 人を換金',
    'unlocked': '解放！',

    'guardian': "守護天使が救ってくれた！",

    'guardianSub': "{n}人の生存者が復帰",

    'next': "次: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "武器を選ぶ",
    'nextStage': "次のステージ",
    'stagesAway': "{n}ステージ後"
  },
  'weaponPick': {
    'title': "武器を選ぼう",
    'subtitle': "ステージ{n}で使える。道の先にもっと待っている。",
    'take': "もらう",
    'rocket': {
      'a': "追尾サルボ",
      'b': "爆発ダメージ"
    },
    'gatling': {
      'a': "連射速度2倍",
      'b': "ゲートを速く育てる"
    }
  },
  'bossReward': {
    'title': "ボス撃破！",
    'subtitle': "ステージ{n}へのプレゼント。走り続けよう！"
  },
  'result': {
    'stageClear': 'ステージクリア！',
    'wipedOut': '部隊全滅',
    'reachedStage': 'ステージ {n}',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n}%',
    'bestReach': '最高 {n}%',
    'newReach': '自己ベスト！',
    'newRecord': '新記録！',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'ボス撃破！',
    'wasted': '撃沈',
    'cause': {
      'foe': 'モンスターに押し切られた',
      'elite': 'ミニボスに崩された',
      'barricade': 'バリケードに激突',
      'crate': '木箱に激突',
      'divider': '仕切りに接触',
      'trap': 'トラップにかかった',
      'slam': 'ボスに押し潰された'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'マイルストーン！',
    'rallied': '巻き返し',
    'peakSquad': '最大部隊',
    'kills': '撃破数',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'コイン3倍！',
    'nextStage': '次のステージ',
    'tryAgain': 'もう一度',
    'upgrade': '強化',
    'upgradeHint': '部隊を強化しよう！',
    'rankOf': '{n} 人中',
    'upNext': '次: ステージ {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'リザルトを共有',
    'text': '{game} でステージ {n} まで到達しました。これより先へ行けますか？'
  },

  'leaderboard': {
    'title': 'ランキング',
    'rank': '#',
    'player': 'プレイヤー',
    'stage': 'ステージ',
    'squad': '部隊',
    'empty': 'まだ記録がありません。最初の1人に！',
    'failed': 'ランキングに接続できません。',
    'loading': '読み込み中…',
    'you': 'あなた',
    'yourRank': '{total} 人中 #{n} 位'
  },

  'chest': {
    'label': '宝箱',
    'ready': '宝箱を開けてコイン{n}枚を獲得',
    'filling': '宝箱を補充中',
    'spent': '宝箱は明日まで空です'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'デイリー遠征',
    'hud': '遠征',
    'multiplier': '{n}×',
    'available': 'デイリー遠征 — 今日のコース、コイン3倍',
    'confirm': '遠征を開始',
    'spent': 'デイリー遠征 — 次のコースまで{time}',
    'done': 'また明日',
    'back': 'キャンペーンに戻る'
  },

  'skills': {

    'grenade': '手榴弾',

    'shield': 'シールド',

    'locked': 'ロック中',

    'unlocksAt': 'ステージ{n}で解放',

    'frost': 'フロストノヴァ',

    'decoy': 'デコイフレア',

    'trialLabel': '{name}・無料お試し',

    'trialTag': '無料お試し！',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': '強化',
    'spotlight': '使おう！',
    'level': 'Lv {n}',
    'maxed': '最大',
    'peekLabel': '強化: {name}',
    'peekLabelReady': '強化: {name} — 購入可能 {n} 件',
    'names': {
      'squad': '部隊',
      'power': '火力',
      'rate': '連射速度',
      'range': '射程',
      'scavenge': '回収',
      'grenade': '手榴弾',
      'shield': 'シールド',
      'rocket': 'ロケット威力',
      'gatling': 'ガトリング威力'
    },
    'descriptions': {
      'squad': 'より多い仲間でステージを開始。',
      'power': '仲間1人あたりのダメージが上昇。',
      'rate': '仲間全員の射撃が速くなる。',
      'range': '部隊がより前方から射撃を開始します。',
      'scavenge': '1回のランで得られるコインが増加。',
      'grenade': '手榴弾を投げて大ダメージを与える。',
      'shield': '数秒間、部隊が受けるダメージを半減。',
      'rocket': 'ステージで手に入るロケットランチャーの威力が上がる。',
      'gatling': 'ステージで手に入るガトリングガンの威力が上がる。'
    }
  },

  'options': {
    'title': '設定', 'general': '一般', 'audio': 'オーディオ', 'language': '言語',
    'difficulty': '難易度', 'soundEffects': '効果音', 'music': '音楽', 'musicTrack': '楽曲',
    'musicTracks': { 'cozy': 'コージーハーモニー', 'trance': 'トランストンネル' },
    'haptics': 'バイブレーション', 'on': 'オン', 'off': 'オフ',
    'close': '保存して閉じる',
    'difficulties': { 'easy': 'イージー', 'medium': 'ノーマル', 'hard': 'ハード' },
    'difficultyHints': {
      'easy': '敵が弱く、バリケードも薄い。',
      'medium': '標準のラン。',
      'hard': '敵が固く、バリケードも厚い。'
    }
  },

  'adsBlocked': {
    'title': '広告を表示できませんでした',
    'body': '報酬獲得のために動画を表示しようとしましたが、ブラウザの何かが広告をブロックしています。',
    'allowPrefix': '次のサイトで広告を許可してください：',
    'allowSuffix': '（またはこのゲームのみ広告ブロッカーを一時停止）してから再試行してください。',
    'gotIt': 'わかりました'
  },
  'saveStatus': {
    'restoredTitle': 'クラウドセーブを復元しました', 'restoredBody': '復元ボーナス +{n} コイン',
    'tap': 'タップ', 'pausedTitle': 'クラウド同期を一時停止中',
    'pausedBody': 'オフラインでプレイ中です。進行状況はここに保存されます。',
    'retry': '再試行', 'dismiss': '閉じる'
  },
  'loading': { 'tooLong': '読み込みが長すぎますか？ 広告ブロッカーを無効にして再読み込みしてください。', 'boo': 'わっ！', 'laugh': 'あははは！' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'スマホを回して',
    'body': 'Survivalist は縦向きでプレイします。'
  },
  'license': { 'denied': 'アクセスが拒否されました：ライセンスをご購入ください。' }
}
