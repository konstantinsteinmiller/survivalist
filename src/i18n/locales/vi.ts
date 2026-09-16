export default {
  'gameName': 'Survivalist',
  'cancel': 'Hủy',
  'close': 'Đóng',
  'ok': 'OK',
  'continue': 'Tiếp tục',
  'tapToContinue': 'Chạm để tiếp tục',
  'clickToContinue': 'Nhấp để tiếp tục',
  'rewards': 'PHẦN THƯỞNG',
  'tip': 'Mẹo',
  'crazyGamesOnly': 'Trò chơi này chỉ có trên',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'Tiếp',
    'replay': 'Chơi lại',
    'back': 'Quay lại',
    'play': 'Chơi',
    'pause': 'Tạm dừng',
    'menu': 'Menu',
    'home': 'Trang chính',
    'info': 'Thông tin'
  },

  'hud': {
    'stage': 'Màn {n}',
    'best': 'Kỷ lục {n}',
    'boss': 'Trùm',
    'miniboss': 'Trùm nhỏ',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'Số màn đến phần thưởng tiếp theo',
    'fireRate': 'Tốc độ',
    'incoming': 'Sắp bị tấn công!',
    'dodge': 'Né',
    'getIn': 'Vào trong',
    'holdStill': 'Đứng yên',
    'milestone': '{n} chiến binh!',
    'weaponActive': '{name} sẵn sàng',
    'weaponsActive': '{a} + {b} sẵn sàng',
    'weaponLocked': '{name} đã khoá — đã bắn {n}/{total} cần gạt',
    'weaponGift': '{name} phía trước — miễn phí, không cần cần gạt',
    'weaponFree': 'MIỄN PHÍ'
  },

  'weapons': {
    'rocket': 'Súng phóng rocket',
    'gatling': 'Súng Gatling'
  },

  'offer': {
    'confirm': 'Xem quảng cáo',
    'available': 'Xem video và nhận {weapon} miễn phí'
  },

  'tutorial': {
    'touch': 'Vuốt để di chuyển đội của bạn',
    'desktop': 'Di chuyển chuột để điều khiển đội'
  },
  'hints': {
    'move': { 'touch': 'Chạm để di chuyển', 'desktop': 'Nhấp để di chuyển' },
    'divider': { 'touch': 'Đừng bao giờ chạm cột giữa hai cổng', 'desktop': 'Đừng bao giờ chạm cột giữa hai cổng' },
    'crate': { 'touch': 'Thùng xanh lá: cả đội đánh mạnh hơn', 'desktop': 'Thùng xanh lá: cả đội đánh mạnh hơn' },
    'rate': { 'touch': 'Thùng xanh dương: cả đội bắn nhanh hơn', 'desktop': 'Thùng xanh dương: cả đội bắn nhanh hơn' },
    'lever': { 'touch': 'Bắn CẢ HAI cần gạt ở hai bên đường — chúng mở hòm vũ khí', 'desktop': 'Bắn CẢ HAI cần gạt ở hai bên đường — chúng mở hòm vũ khí' },
    'cage': { 'touch': 'Bắn vào lồng — tù nhân sẽ gia nhập đội', 'desktop': 'Bắn vào lồng — tù nhân sẽ gia nhập đội' },
    'shieldBox': { 'touch': 'Hộp khiên — chờ sẵn rồi chặn một đòn lớn', 'desktop': 'Hộp khiên — chờ sẵn rồi chặn một đòn lớn' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': 'Quy đổi {n} người sống sót',
    'unlocked': 'Đã mở khóa!',

    'guardian': "Thiên thần hộ mệnh đã cứu bạn!",

    'guardianSub': "{n} người sống sót đã trở lại",

    'next': "Tiếp theo: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "Chọn vũ khí",
    'nextStage': "màn tiếp theo",
    'stagesAway': "sau {n} màn"
  },
  'weaponPick': {
    'title': "Chọn vũ khí của bạn",
    'subtitle': "Của bạn ở Màn {n}. Còn nhiều hơn đang chờ trên đường.",
    'take': "Lấy",
    'rocket': {
      'a': "Loạt đạn tự dẫn",
      'b': "Sát thương nổ"
    },
    'gatling': {
      'a': "Tốc độ bắn gấp đôi",
      'b': "Bơm cổng nhanh hơn"
    }
  },
  'bossReward': {
    'title': "Đã hạ Trùm!",
    'subtitle': "Quà cho Màn {n}. Chạy tiếp nào!"
  },
  'result': {
    'stageClear': 'Qua màn!',
    'wipedOut': 'Đội bị xóa sổ',
    'reachedStage': 'Màn {n}',
    'newRecord': 'Kỷ lục mới!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'Hạ gục trùm!',
    'wasted': 'Toi đời',
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'Cột mốc!',
    'rallied': 'Hồi sức',
    'peakSquad': 'Đội đông nhất',
    'kills': 'Tiêu diệt',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'Xu đã nhân ba!',
    'nextStage': 'Màn tiếp theo',
    'tryAgain': 'Thử lại',
    'upgrade': 'Nâng cấp',
    'upgradeHint': 'Nâng cấp đội của bạn!',
    'rankOf': 'trên {n}',
    'upNext': 'Tiếp theo: Màn {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'Chia sẻ lượt chơi',
    'text': 'Tôi đã đến màn {n} trong {game}. Bạn đi xa hơn được không?'
  },

  'leaderboard': {
    'title': 'Bảng xếp hạng',
    'rank': '#',
    'player': 'Người chơi',
    'stage': 'Màn',
    'squad': 'Đội',
    'empty': 'Chưa có ai. Hãy là người đầu tiên!',
    'failed': 'Không kết nối được bảng xếp hạng.',
    'loading': 'Đang tải…',
    'you': 'Bạn',
    'yourRank': 'Bạn hạng #{n} trên {total}',
    'tabGlobal': 'Toàn cầu'
  },

  'chest': {
    'label': 'Rương báu',
    'ready': 'Mở rương báu nhận {n} xu',
    'filling': 'Rương báu đang đầy dần',
    'spent': 'Rương báu trống đến ngày mai'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'Chuyến đi hằng ngày',
    'hud': 'Chuyến đi',
    'multiplier': '{n}×',
    'available': 'Chuyến đi hằng ngày — cung đường hôm nay, xu gấp ba',
    'confirm': 'Bắt đầu chuyến đi',
    'spent': 'Chuyến đi hằng ngày — cung đường mới sau {time}',
    'done': 'Mai quay lại',
    'back': 'Về chiến dịch'
  },

  'skills': {

    'grenade': 'Lựu đạn',

    'shield': 'Khiên',

    'locked': 'Đã khóa',

    'unlocksAt': 'Mở khóa ở màn {n}',

    'frost': 'Nova Băng Giá',

    'decoy': 'Pháo Sáng Mồi',

    'trialLabel': '{name} · dùng thử miễn phí',

    'trialTag': 'Dùng thử miễn phí!',

    'uses': '×{n}'
  },

  'intro': {
    'took': 'Nó đã bắt tất cả.',
    'alive': 'Họ vẫn còn sống.',
    'go': 'Đi cứu họ.',
    'skip': 'Bỏ qua'
  },

  'upgrades': {
    'title': 'Nâng cấp',
    'spotlight': 'Tiêu đi!',
    'level': 'Cấp {n}',
    'maxed': 'Tối đa',
    'peekLabel': 'Nâng cấp: {name}',
    'peekLabelReady': 'Nâng cấp: {name} — {n} có thể mua ngay',
    'names': {
      'squad': 'Đội',
      'power': 'Sát thương',
      'rate': 'Tốc độ bắn',
      'range': 'Tầm bắn',
      'scavenge': 'Nhặt nhạnh',
      'grenade': 'Lựu đạn',
      'shield': 'Khiên',
      'rocket': 'Sức mạnh rocket',
      'gatling': 'Sức mạnh Gatling'
    },
    'descriptions': {
      'squad': 'Bắt đầu mỗi màn với nhiều người sống sót hơn.',
      'power': 'Mỗi người gây nhiều sát thương hơn mỗi phát.',
      'rate': 'Mỗi người bắn nhanh hơn.',
      'range': 'Đội của bạn khai hỏa xa hơn trên đường.',
      'scavenge': 'Kiếm nhiều xu hơn sau mỗi lượt.',
      'grenade': 'Ném lựu đạn để gây sát thương lớn.',
      'shield': 'Giảm một nửa sát thương lên đội trong vài giây.',
      'rocket': 'Súng phóng rocket mở khoá trong màn gây nhiều sát thương hơn.',
      'gatling': 'Súng Gatling mở khoá trong màn gây nhiều sát thương hơn.'
    }
  },

  'options': {
    'title': 'Tùy chọn', 'general': 'Chung', 'audio': 'Âm thanh', 'language': 'Ngôn ngữ',
    'difficulty': 'Độ khó', 'soundEffects': 'Hiệu ứng âm thanh', 'music': 'Nhạc', 'musicTrack': 'Bản nhạc',
    'musicTracks': { 'cozy': 'Giai điệu ấm cúng', 'trance': 'Đường hầm Trance' },
    'haptics': 'Rung', 'on': 'Bật', 'off': 'Tắt',
    'close': 'Lưu & Đóng',
    'difficulties': { 'easy': 'Dễ', 'medium': 'Trung bình', 'hard': 'Khó' },
    'difficultyHints': {
      'easy': 'Kẻ địch yếu hơn và rào chắn mỏng hơn.',
      'medium': 'Lượt chơi tiêu chuẩn.',
      'hard': 'Kẻ địch cứng hơn và rào chắn dày hơn.'
    }
  },

  'adsBlocked': {
    'title': 'Không thể hiển thị quảng cáo',
    'body': 'Chúng tôi đã thử phát video để bạn nhận thưởng, nhưng có gì đó trên trình duyệt đang chặn quảng cáo.',
    'allowPrefix': 'Vui lòng cho phép quảng cáo trên',
    'allowSuffix': '(hoặc tạm dừng trình chặn quảng cáo cho trò chơi này) rồi thử lại.',
    'gotIt': 'Đã hiểu'
  },
  'saveStatus': {
    'restoredTitle': 'Đã khôi phục lưu trên đám mây', 'restoredBody': '+{n} xu thưởng cho việc khôi phục',
    'tap': 'chạm', 'pausedTitle': 'Đã tạm dừng đồng bộ đám mây',
    'pausedBody': 'Đang chơi ngoại tuyến. Tiến trình được lưu tại đây.',
    'retry': 'Thử lại', 'dismiss': 'bỏ qua'
  },
  'loading': { 'tooLong': 'Tải quá lâu? Hãy tắt trình chặn quảng cáo rồi làm mới trang.', 'boo': 'Hù!', 'laugh': 'Ha ha ha!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'Xoay điện thoại',
    'body': 'Survivalist chơi ở chế độ dọc.'
  },
  'license': { 'denied': 'Từ chối truy cập: vui lòng mua giấy phép.' }
}
