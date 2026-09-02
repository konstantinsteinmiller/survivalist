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
    'fireRate': '射速'
  },

  'tutorial': {
    'touch': '滑动来移动你的小队',
    'desktop': '移动鼠标来操控你的小队'
  },
  'hints': {
    'move': { 'touch': '点击移动', 'desktop': '点击移动' },
    'gate': { 'touch': '持续射击闸门：每半秒 +1', 'desktop': '持续射击闸门：每半秒 +1' },
    'trap': { 'touch': '红色闸门会减少人数——走另一边！', 'desktop': '红色闸门会减少人数——走另一边！' },
    'divider': { 'touch': '千万别碰闸门之间的柱子', 'desktop': '千万别碰闸门之间的柱子' },
    'crate': { 'touch': '绿色箱子：全队伤害提升', 'desktop': '绿色箱子：全队伤害提升' },
    'rate': { 'touch': '蓝色箱子：全队射速提升', 'desktop': '蓝色箱子：全队射速提升' },
    'boss': { 'touch': '远离红圈！', 'desktop': '远离红圈！' },
    'guard': { 'touch': '护盾开启——射击无效，快躲开！', 'desktop': '护盾开启——射击无效，快躲开！' }
  },

  'result': {
    'stageClear': '通关！',
    'wipedOut': '小队全灭',
    'reachedStage': '第 {n} 关',
    'newRecord': '新纪录！',
    'rallied': '重整旗鼓',
    'peakSquad': '最大人数',
    'kills': '击杀',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': '金币三倍！',
    'nextStage': '下一关',
    'tryAgain': '再试一次',
    'upgrade': '升级',
    'rankOf': '共 {n} 人'
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
    'yourRank': '你排第 {n}',
    'of': '共 {n} 人'
  },

  'upgrades': {
    'title': '升级',
    'spotlight': '去花费！',
    'level': '等级 {n}',
    'maxed': '已满',
    'names': {
      'squad': '队伍',
      'power': '火力',
      'rate': '射速',
      'range': '射程',
      'scavenge': '拾荒'
    },
    'descriptions': {
      'squad': '每关开局的幸存者更多。',
      'power': '每名幸存者每发伤害更高。',
      'rate': '每名幸存者射击更快。',
      'range': '你的小队能在更远处开火。',
      'scavenge': '每局获得更多金币。'
    }
  },

  'options': {
    'title': '选项', 'general': '通用', 'audio': '音频', 'language': '语言',
    'difficulty': '难度', 'soundEffects': '音效', 'music': '音乐', 'musicTrack': '音乐曲目',
    'musicTracks': { 'cozy': '惬意和声', 'trance': '迷幻隧道' },
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
  'loading': { 'tooLong': '加载太久？请关闭广告拦截器并刷新页面。' },
  'license': { 'denied': '访问被拒绝：请购买许可证。' }
}
