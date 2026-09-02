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
    'fireRate': '연사'
  },

  'tutorial': {
    'touch': '밀어서 부대를 움직이세요',
    'desktop': '마우스를 움직여 부대를 조종하세요'
  },
  'hints': {
    'move': { 'touch': '탭하여 이동', 'desktop': '클릭하여 이동' },
    'gate': { 'touch': '게이트를 계속 쏘세요: 0.5초마다 +1', 'desktop': '게이트를 계속 쏘세요: 0.5초마다 +1' },
    'trap': { 'touch': '빨간 게이트는 부대가 줄어요 — 반대쪽으로!', 'desktop': '빨간 게이트는 부대가 줄어요 — 반대쪽으로!' },
    'divider': { 'touch': '게이트 사이 기둥에 절대 닿지 마세요', 'desktop': '게이트 사이 기둥에 절대 닿지 마세요' },
    'crate': { 'touch': '초록 상자: 모두의 공격력 상승', 'desktop': '초록 상자: 모두의 공격력 상승' },
    'rate': { 'touch': '파란 상자: 모두 더 빨리 사격', 'desktop': '파란 상자: 모두 더 빨리 사격' },
    'boss': { 'touch': '붉은 원에서 벗어나세요!', 'desktop': '붉은 원에서 벗어나세요!' },
    'guard': { 'touch': '실드 전개 — 공격이 통하지 않는다. 피해!', 'desktop': '실드 전개 — 공격이 통하지 않는다. 피해!' }
  },

  'result': {
    'stageClear': '스테이지 클리어!',
    'wipedOut': '부대 전멸',
    'reachedStage': '스테이지 {n}',
    'newRecord': '신기록!',
    'rallied': '기사회생',
    'peakSquad': '최대 부대',
    'kills': '처치',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': '코인 3배!',
    'nextStage': '다음 스테이지',
    'tryAgain': '다시 시도',
    'upgrade': '업그레이드',
    'rankOf': '{n}명 중'
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
    'yourRank': '내 순위 {n}',
    'of': '{n}명 중'
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
      'scavenge': '수집'
    },
    'descriptions': {
      'squad': '더 많은 생존자로 스테이지를 시작합니다.',
      'power': '생존자마다 한 발당 피해량이 증가합니다.',
      'rate': '모든 생존자가 더 빠르게 사격합니다.',
      'range': '부대가 더 멀리서 사격을 시작합니다.',
      'scavenge': '한 판마다 더 많은 코인을 얻습니다.'
    }
  },

  'options': {
    'title': '설정', 'general': '일반', 'audio': '오디오', 'language': '언어',
    'difficulty': '난이도', 'soundEffects': '효과음', 'music': '음악', 'musicTrack': '음악 트랙',
    'musicTracks': { 'cozy': '아늑한 하모니', 'trance': '트랜스 터널' },
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
  'loading': { 'tooLong': '로딩이 너무 오래 걸리나요? 광고 차단기를 끄고 새로고침하세요.' },
  'license': { 'denied': '접근이 거부되었습니다: 라이선스를 구매해 주세요.' }
}
