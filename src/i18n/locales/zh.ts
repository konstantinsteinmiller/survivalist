export default {
  'gameName': 'Survivalist',
  'cancel': '取消',
  'close': '关闭',
  'ok': '确定',
  'continue': '继续',
  'tapToContinue': '点击继续',
  'clickToContinue': '单击继续',
  'rewards': '奖励',
  'tip': '提示',
  'crazyGamesOnly': '本游戏仅在以下平台提供：',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': '下一个',
    'replay': '重玩',
    'back': '返回',
    'play': '开始',
    'pause': '暂停',
    'menu': '菜单',
    'home': '主页',
    'info': '信息'
  },

  'hud': {
    'stage': '第 {n} 关',
    'best': '最佳 {n}',
    'boss': '首领',
    'miniboss': '小首领',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': '距离下一个奖励的关卡数',
    'fireRate': '射速',
    'incoming': '攻击来袭！',
    'dodge': '闪避',
    'getIn': '进圈',
    'holdStill': '别动',
    'milestone': '{n} 人集结！',
    'weaponActive': '{name} 就绪',
    'weaponsActive': '{a} + {b} 就绪',
    'weaponLocked': '{name} 未解锁 — 已击中 {n}/{total} 个拉杆',
    'weaponGift': '{name} 就在前方 — 免费，无需拉杆',
    'weaponFree': '免费'
  },

  'weapons': {
    'rocket': '火箭筒',
    'gatling': '加特林机枪'
  },

  'offer': {
    'confirm': '观看广告',
    'available': '观看视频，免费获得{weapon}'
  },

  'tutorial': {
    'touch': '滑动来移动你的小队',
    'desktop': '移动鼠标来操控你的小队'
  },
  'hints': {
    'move': { 'touch': '点击移动', 'desktop': '点击移动' },
    'divider': { 'touch': '千万别碰闸门之间的柱子', 'desktop': '千万别碰闸门之间的柱子' },
    'crate': { 'touch': '绿色箱子：全队伤害提升', 'desktop': '绿色箱子：全队伤害提升' },
    'rate': { 'touch': '蓝色箱子：全队射速提升', 'desktop': '蓝色箱子：全队射速提升' },
    'lever': { 'touch': '击中路两侧的两个拉杆 —— 它们会打开武器箱', 'desktop': '击中路两侧的两个拉杆 —— 它们会打开武器箱' },
    'cage': { 'touch': '射击囚笼——被救的人会加入队伍', 'desktop': '射击囚笼——被救的人会加入队伍' },
    'shieldBox': { 'touch': '护盾箱——待命并挡下一次重击', 'desktop': '护盾箱——待命并挡下一次重击' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '{n} 名幸存者已兑换',
    'unlocked': '已解锁！',

    'guardian': "守护天使救了你！",

    'guardianSub': "{n} 名幸存者归队",

    'next': "下一个：{label} · {when}"

  },

  'ladder': {
    'weaponPick': "选择武器",
    'nextStage': "下一关",
    'stagesAway': "{n} 关后"
  },
  'weaponPick': {
    'title': "选择你的武器",
    'subtitle': "第 {n} 关归你使用。路上还有更多在等着。",
    'take': "拿走",
    'rocket': {
      'a': "追踪齐射",
      'b': "爆炸伤害"
    },
    'gatling': {
      'a': "两倍射速",
      'b': "更快充能闸门"
    }
  },
  'bossReward': {
    'title': "首领已击败！",
    'subtitle': "第 {n} 关的礼物。继续前进！"
  },
  'result': {
    'stageClear': '通关！',
    'wipedOut': '小队全灭',
    'reachedStage': '第 {n} 关',
    'newRecord': '新纪录！',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': '首领已倒下！',
    'wasted': '全灭',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': '里程碑！',
    'rallied': '重整旗鼓',
    'peakSquad': '最大人数',
    'kills': '击杀',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': '金币三倍！',
    'nextStage': '下一关',
    'tryAgain': '再试一次',
    'upgrade': '升级',
    'upgradeHint': '升级你的队伍！',
    'rankOf': '共 {n} 人',
    'upNext': '下一关：第 {n} 关'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': '分享战绩',
    'text': '我在 {game} 中打到了第 {n} 关。你能走得更远吗？'
  },

  'leaderboard': {
    'title': '排行榜',
    'rank': '#',
    'player': '玩家',
    'stage': '关卡',
    'squad': '队伍',
    'empty': '还没有记录，来抢头名吧！',
    'failed': '无法连接排行榜。',
    'loading': '加载中…',
    'you': '你',
    'yourRank': '{total} 人中你排第 {n}',
    'tabGlobal': '全球'
  },

  'chest': {
    'label': '宝箱',
    'ready': '打开宝箱获得 {n} 金币',
    'filling': '宝箱填充中',
    'spent': '宝箱已空，明天再来'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': '每日远征',
    'hud': '远征',
    'multiplier': '{n}×',
    'available': '每日远征 — 今天的路线，三倍金币',
    'confirm': '开始远征',
    'spent': '每日远征 — 新路线还有 {time}',
    'done': '明天再来',
    'back': '返回战役'
  },

  'skills': {

    'grenade': '手雷',

    'shield': '护盾',

    'locked': '未解锁',

    'unlocksAt': '第{n}关解锁',

    'frost': '冰霜新星',

    'decoy': '诱饵信号弹',

    'trialLabel': '{name} · 免费试用',

    'trialTag': '免费试用！',

    'uses': '×{n}'
  },

  'intro': {
    'took': '它带走了所有人。',
    'alive': '他们还活着。',
    'go': '去把他们救回来。',
    'skip': '跳过'
  },

  'upgrades': {
    'title': '升级',
    'spotlight': '去花费！',
    'level': '等级 {n}',
    'maxed': '已满',
    'peekLabel': '升级：{name}',
    'peekLabelReady': '升级：{name} — {n} 项可购买',
    'names': {
      'squad': '队伍',
      'power': '火力',
      'rate': '射速',
      'range': '射程',
      'scavenge': '拾荒',
      'grenade': '手雷',
      'shield': '护盾',
      'rocket': '火箭威力',
      'gatling': '加特林威力'
    },
    'descriptions': {
      'squad': '每关开局的幸存者更多。',
      'power': '每名幸存者每发伤害更高。',
      'rate': '每名幸存者射击更快。',
      'range': '你的小队能在更远处开火。',
      'scavenge': '每局获得更多金币。',
      'grenade': '投掷手雷造成大量伤害。',
      'shield': '数秒内使队伍受到的伤害减半。',
      'rocket': '关卡中解锁的火箭筒伤害更高。',
      'gatling': '关卡中解锁的加特林伤害更高。'
    }
  },

  'options': {
    'title': '选项', 'general': '通用', 'audio': '音频', 'language': '语言',
    'difficulty': '难度', 'soundEffects': '音效', 'music': '音乐', 'musicTrack': '音乐曲目',
    'musicTracks': { 'cozy': '惬意和声', 'trance': '迷幻隧道' },
    'haptics': '震动', 'on': '开', 'off': '关',
    'close': '保存并关闭',
    'difficulties': { 'easy': '简单', 'medium': '普通', 'hard': '困难' },
    'difficultyHints': {
      'easy': '敌人更弱，路障更薄。',
      'medium': '标准难度。',
      'hard': '敌人更强，路障更厚。'
    }
  },

  'adsBlocked': {
    'title': '无法显示广告',
    'body': '我们本想为你播放视频以便领取奖励，但你的浏览器中有内容拦截了广告。',
    'allowPrefix': '请在以下网站允许广告：',
    'allowSuffix': '（或为本游戏暂停广告拦截器）然后重试。',
    'gotIt': '知道了'
  },
  'saveStatus': {
    'restoredTitle': '云存档已恢复', 'restoredBody': '恢复奖励 +{n} 金币',
    'tap': '点击', 'pausedTitle': '云同步已暂停',
    'pausedBody': '正在离线游戏。你的进度会保存在本地。',
    'retry': '重试', 'dismiss': '忽略'
  },
  'loading': { 'tooLong': '加载太久？请关闭广告拦截器并刷新页面。', 'boo': '哇！', 'laugh': '哈哈哈！' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': '请旋转手机',
    'body': '《Survivalist》为竖屏游戏。'
  },
  'license': { 'denied': '访问被拒绝：请购买许可证。' }
}
