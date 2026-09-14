export default {
  'gameName': 'Survivalist',
  'cancel': '취소',
  'close': '닫기',
  'ok': '확인',
  'continue': '계속',
  'tapToContinue': '탭하여 계속',
  'clickToContinue': '클릭하여 계속',
  'rewards': '보상',
  'tip': '팁',
  'crazyGamesOnly': '이 게임은 다음에서만 이용할 수 있습니다:',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': '다음',
    'replay': '다시하기',
    'back': '뒤로',
    'play': '플레이',
    'pause': '일시정지',
    'menu': '메뉴',
    'home': '홈',
    'info': '정보'
  },

  'hud': {
    'stage': '스테이지 {n}',
    'best': '최고 {n}',
    'boss': '보스',
    'miniboss': '중간 보스',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': '다음 보너스까지 남은 스테이지',
    'fireRate': '연사',
    'incoming': '공격이 온다!',
    'dodge': '회피',
    'getIn': '안으로',
    'holdStill': '멈춰',
    'milestone': '{n}명 돌파!',
    'weaponActive': '{name} 준비 완료',
    'weaponsActive': '{a} + {b} 준비 완료',
    'weaponLocked': '{name} 잠김 — 레버 {total}개 중 {n}개 파괴',
    'weaponGift': '{name} 전방 — 무료, 레버 없음',
    'weaponFree': '무료'
  },

  'weapons': {
    'rocket': '로켓 런처',
    'gatling': '개틀링건'
  },

  'tutorial': {
    'touch': '밀어서 부대를 움직이세요',
    'desktop': '마우스를 움직여 부대를 조종하세요'
  },
  'hints': {
    'move': { 'touch': '탭하여 이동', 'desktop': '클릭하여 이동' },
    'trap': { 'touch': '빨간 게이트는 부대가 줄어요 — 반대쪽으로!', 'desktop': '빨간 게이트는 부대가 줄어요 — 반대쪽으로!' },
    'divider': { 'touch': '게이트 사이 기둥에 절대 닿지 마세요', 'desktop': '게이트 사이 기둥에 절대 닿지 마세요' },
    'crate': { 'touch': '초록 상자: 모두의 공격력 상승', 'desktop': '초록 상자: 모두의 공격력 상승' },
    'rate': { 'touch': '파란 상자: 모두 더 빨리 사격', 'desktop': '파란 상자: 모두 더 빨리 사격' },
    'lever': { 'touch': '길 양쪽 레버를 둘 다 쏴라 — 무기 상자가 열린다', 'desktop': '길 양쪽 레버를 둘 다 쏴라 — 무기 상자가 열린다' },
    'cage': { 'touch': '우리를 쏴라 — 갇힌 이들이 부대에 합류한다', 'desktop': '우리를 쏴라 — 갇힌 이들이 부대에 합류한다' },
    'shieldBox': { 'touch': '실드 상자 — 대기하다 큰 공격 한 번을 막아준다', 'desktop': '실드 상자 — 대기하다 큰 공격 한 번을 막아준다' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': '생존자 {n}명 환산',
    'unlocked': '해금!',

    'guardian': "수호천사가 당신을 구했습니다!",

    'guardianSub': "생존자 {n}명이 돌아왔습니다",

    'next': "다음: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "무기 선택",
    'nextStage': "다음 스테이지",
    'stagesAway': "{n}스테이지 후"
  },
  'weaponPick': {
    'title': "무기를 선택하세요",
    'subtitle': "스테이지 {n}에서 사용. 길 위에 더 기다리고 있습니다.",
    'take': "받기",
    'rocket': {
      'a': "유도 일제 사격",
      'b': "폭발 피해"
    },
    'gatling': {
      'a': "연사 속도 2배",
      'b': "게이트를 더 빨리 키움"
    }
  },
  'bossReward': {
    'title': "보스 격파!",
    'subtitle': "스테이지 {n}용 선물. 계속 달리세요!"
  },
  'result': {
    'stageClear': '스테이지 클리어!',
    'wipedOut': '부대 전멸',
    'reachedStage': '스테이지 {n}',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n}%',
    'bestReach': '최고 {n}%',
    'newReach': '최고 기록!',
    'newRecord': '신기록!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': '보스 격파!',
    'wasted': '전멸',
    'cause': {
      'foe': '몬스터에게 밀렸다',
      'elite': '미니보스에게 당했다',
      'barricade': '바리케이드에 충돌',
      'crate': '상자에 충돌',
      'divider': '분리대에 걸렸다',
      'trap': '함정에 걸렸다',
      'slam': '보스에게 짓밟혔다'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': '마일스톤!',
    'rallied': '기사회생',
    'peakSquad': '최대 부대',
    'kills': '처치',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': '코인 3배!',
    'nextStage': '다음 스테이지',
    'tryAgain': '다시 시도',
    'upgrade': '업그레이드',
    'upgradeHint': '부대를 강화하세요!',
    'rankOf': '{n}명 중',
    'upNext': '다음: 스테이지 {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': '기록 공유',
    'text': '{game}에서 스테이지 {n}까지 갔어요. 더 멀리 갈 수 있나요?'
  },

  'leaderboard': {
    'title': '리더보드',
    'rank': '#',
    'player': '플레이어',
    'stage': '스테이지',
    'squad': '부대',
    'empty': '아직 기록이 없습니다. 첫 주자가 되세요!',
    'failed': '리더보드에 연결할 수 없습니다.',
    'loading': '불러오는 중…',
    'you': '나',
    'yourRank': '{total}명 중 {n}위'
  },

  'chest': {
    'label': '보물 상자',
    'ready': '보물 상자를 열어 코인 {n}개 획득',
    'filling': '보물 상자를 채우는 중',
    'spent': '보물 상자는 내일까지 비어 있습니다'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': '데일리 원정',
    'hud': '원정',
    'multiplier': '{n}×',
    'available': '데일리 원정 — 오늘의 길, 코인 3배',
    'confirm': '원정 시작',
    'spent': '데일리 원정 — 새 길까지 {time}',
    'done': '내일 다시',
    'back': '캐페인으로 돌아가기'
  },

  'skills': {

    'grenade': '수류탄',

    'shield': '방패',

    'locked': '잠김',

    'unlocksAt': '{n}스테이지에서 해금',

    'frost': '프로스트 노바',

    'decoy': '미끼 조명탄',

    'trialLabel': '{name} · 무료 체험',

    'trialTag': '무료 체험!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': '업그레이드',
    'spotlight': '사용!',
    'level': 'Lv {n}',
    'maxed': '최대',
    'names': {
      'squad': '부대',
      'power': '화력',
      'rate': '연사 속도',
      'range': '사거리',
      'scavenge': '수집',
      'grenade': '수류탄',
      'shield': '방패',
      'rocket': '로켓 위력',
      'gatling': '개틀링 위력'
    },
    'descriptions': {
      'squad': '더 많은 생존자로 스테이지를 시작합니다.',
      'power': '생존자마다 한 발당 피해량이 증가합니다.',
      'rate': '모든 생존자가 더 빠르게 사격합니다.',
      'range': '부대가 더 멀리서 사격을 시작합니다.',
      'scavenge': '한 판마다 더 많은 코인을 얻습니다.',
      'grenade': '수류탄을 던져 큰 피해를 줍니다.',
      'shield': '몇 초 동안 부대가 받는 피해를 절반으로 줄입니다.',
      'rocket': '스테이지에서 얻는 로켓 런처의 피해량이 증가합니다.',
      'gatling': '스테이지에서 얻는 개틀링건의 피해량이 증가합니다.'
    }
  },

  'options': {
    'title': '설정', 'general': '일반', 'audio': '오디오', 'language': '언어',
    'difficulty': '난이도', 'soundEffects': '효과음', 'music': '음악', 'musicTrack': '음악 트랙',
    'musicTracks': { 'cozy': '아늑한 하모니', 'trance': '트랜스 터널' },
    'haptics': '진동', 'on': '켜기', 'off': '끄기',
    'close': '저장 후 닫기',
    'difficulties': { 'easy': '쉬움', 'medium': '보통', 'hard': '어려움' },
    'difficultyHints': {
      'easy': '적이 약해지고 바리케이드가 얇아집니다.',
      'medium': '기본 난이도입니다.',
      'hard': '적이 강해지고 바리케이드가 두꺼워집니다.'
    }
  },

  'adsBlocked': {
    'title': '광고를 표시할 수 없습니다',
    'body': '보상을 드리려고 영상을 재생하려 했지만, 브라우저의 무언가가 광고를 차단하고 있습니다.',
    'allowPrefix': '다음 사이트에서 광고를 허용해 주세요:',
    'allowSuffix': '(또는 이 게임에 한해 광고 차단기를 일시 중지) 후 다시 시도하세요.',
    'gotIt': '알겠습니다'
  },
  'saveStatus': {
    'restoredTitle': '클라우드 저장이 복원되었습니다', 'restoredBody': '복구 보너스 +{n} 코인',
    'tap': '탭', 'pausedTitle': '클라우드 동기화 일시 중지',
    'pausedBody': '오프라인으로 플레이 중입니다. 진행 상황은 여기에 저장됩니다.',
    'retry': '다시 시도', 'dismiss': '닫기'
  },
  'loading': { 'tooLong': '로딩이 너무 오래 걸리나요? 광고 차단기를 끄고 새로고침하세요.', 'boo': '왁!', 'laugh': '하하하!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': '휴대폰을 돌리세요',
    'body': 'Survivalist는 세로로 플레이합니다.'
  },
  'license': { 'denied': '접근이 거부되었습니다: 라이선스를 구매해 주세요.' }
}
