export default {
  'gameName': 'Survivalist',
  'cancel': 'ยกเลิก',
  'close': 'ปิด',
  'ok': 'ตกลง',
  'continue': 'ดำเนินการต่อ',
  'tapToContinue': 'แตะเพื่อไปต่อ',
  'clickToContinue': 'คลิกเพื่อไปต่อ',
  'rewards': 'รางวัล',
  'tip': 'เคล็ดลับ',
  'crazyGamesOnly': 'เกมนี้เล่นได้เฉพาะบน',

  // Shared UI labels. NOT dead keys: they are the `aria-label` on the game's
  // icon-only buttons, read aloud rather than shown. See `en.ts`.
  'ui': {
    'next': 'ถัดไป',
    'replay': 'เล่นใหม่',
    'back': 'ย้อนกลับ',
    'play': 'เล่น',
    'pause': 'หยุดชั่วคราว',
    'menu': 'เมนู',
    'home': 'หน้าหลัก',
    'info': 'ข้อมูล'
  },

  'hud': {
    'stage': 'ด่าน {n}',
    'best': 'สถิติ {n}',
    'boss': 'บอส',
    'miniboss': 'มินิบอส',
    // Screen-reader label for the star chip that counts down to the
    // next milestone payout. The chip itself is a glyph and a digit.
    'toMilestone': 'ด่านที่เหลือถึงโบนัสถัดไป',
    'fireRate': 'อัตรา',
    'incoming': 'การโจมตีกำลังมา!',
    'dodge': 'หลบ',
    'getIn': 'เข้าไป',
    'holdStill': 'อยู่นิ่ง',
    'milestone': 'ทีม {n} คน!',
    'weaponActive': '{name} พร้อม',
    'weaponsActive': '{a} + {b} พร้อม',
    'weaponLocked': '{name} ถูกล็อก — ยิงคันโยกแล้ว {n} จาก {total}',
    'weaponGift': '{name} อยู่ข้างหน้า — ฟรี ไม่มีคันโยก',
    'weaponFree': 'ฟรี'
  },

  'weapons': {
    'rocket': 'เครื่องยิงจรวด',
    'gatling': 'ปืนแกตลิง'
  },

  'offer': {
    'confirm': 'ดูโฆษณา',
    'available': 'ดูวิดีโอแล้วรับ {weapon} ฟรี'
  },

  'tutorial': {
    'touch': 'ปัดเพื่อขยับหน่วยของคุณ',
    'desktop': 'ขยับเมาส์เพื่อบังคับหน่วยของคุณ'
  },
  'hints': {
    'move': { 'touch': 'แตะเพื่อเคลื่อนที่', 'desktop': 'คลิกเพื่อเคลื่อนที่' },
    'trap': { 'touch': 'ประตูแดงลดจำนวนคน — ไปอีกฝั่ง!', 'desktop': 'ประตูแดงลดจำนวนคน — ไปอีกฝั่ง!' },
    'divider': { 'touch': 'อย่าชนเสาระหว่างประตูเด็ดขาด', 'desktop': 'อย่าชนเสาระหว่างประตูเด็ดขาด' },
    'crate': { 'touch': 'ลังเขียว: ทุกคนตีแรงขึ้น', 'desktop': 'ลังเขียว: ทุกคนตีแรงขึ้น' },
    'rate': { 'touch': 'ลังน้ำเงิน: ทุกคนยิงเร็วขึ้น', 'desktop': 'ลังน้ำเงิน: ทุกคนยิงเร็วขึ้น' },
    'lever': { 'touch': 'ยิงคันโยกทั้งสองข้างถนน — มันจะเปิดกล่องอาวุธ', 'desktop': 'ยิงคันโยกทั้งสองข้างถนน — มันจะเปิดกล่องอาวุธ' },
    'cage': { 'touch': 'ยิงกรง — นักโทษจะเข้าร่วมกองของคุณ', 'desktop': 'ยิงกรง — นักโทษจะเข้าร่วมกองของคุณ' },
    'shieldBox': { 'touch': 'กล่องโล่ — รอไว้ แล้วกันหมัดหนักได้หนึ่งครั้ง', 'desktop': 'กล่องโล่ — รอไว้ แล้วกันหมัดหนักได้หนึ่งครั้ง' }
  },

  'flow': {


    // The handover, which used to read as LOSING the squad: five testers saw

    // "Squad 101 -> 3" and one asked whether she had lost progress. The crowd

    // is cashed into coins on screen now, and this names it. {n} = survivors.

    'squadCashed': 'แลกผู้รอดชีวิต {n} คน',
    'unlocked': 'ปลดล็อกแล้ว!',

    'guardian': "เทวดาผู้พิทักษ์ช่วยคุณไว้!",

    'guardianSub': "ผู้รอดชีวิต {n} คนกลับมาแล้ว",

    'next': "ต่อไป: {label} · {when}"

  },

  'ladder': {
    'weaponPick': "เลือกอาวุธ",
    'nextStage': "ด่านถัดไป",
    'stagesAway': "อีก {n} ด่าน"
  },
  'weaponPick': {
    'title': "เลือกอาวุธของคุณ",
    'subtitle': "ของคุณในด่าน {n} ยังมีอีกรออยู่บนถนน",
    'take': "รับเลย",
    'rocket': {
      'a': "ชุดยิงนำวิถี",
      'b': "ความเสียหายระเบิด"
    },
    'gatling': {
      'a': "อัตรายิงสองเท่า",
      'b': "ปั๊มประตูเร็วขึ้น"
    }
  },
  'bossReward': {
    'title': "ล้มบอสได้แล้ว!",
    'subtitle': "ของขวัญสำหรับด่าน {n} วิ่งต่อไป!"
  },
  'result': {
    'stageClear': 'ผ่านด่าน!',
    'wipedOut': 'หน่วยถูกกวาดล้าง',
    'reachedStage': 'ด่าน {n}',
    // The near-miss readout under a wipe: how far this attempt got,
    // and the best any previous attempt on this stage managed.
    'reach': '{n}%',
    'bestReach': 'สถิติ {n}%',
    'newReach': 'ไกลที่สุด!',
    'newRecord': 'สถิติใหม่!',
    // The two seconds after a boss goes down, above its body. The kill is
    // what the whole stage was for, so this is sold as a reward.
    'bossFelled': 'ล้มบอสได้!',
    'wasted': 'จบเห่',
    'cause': {
      'foe': 'ถูกมอนสเตอร์ถล่ม',
      'elite': 'มินิบอสเล่นงานคุณ',
      'barricade': 'ชนแผงกั้น',
      'crate': 'ชนลังไม้',
      'divider': 'เกี่ยวแนวแบ่งถนน',
      'trap': 'ติดกับดัก',
      'slam': 'บอสทุบคุณจม'
    },
    // The every-fifth-stage lump the HUD chip counts down to.
    'milestone': 'หมุดหมาย!',
    'rallied': 'ฮึดสู้อีกครั้ง',
    'peakSquad': 'หน่วยใหญ่สุด',
    'kills': 'สังหาร',
    'tripleCoins': '3×',
    'tripleBonus': '(+{n})',
    'tripleClaimed': 'เหรียญคูณสาม!',
    'nextStage': 'ด่านถัดไป',
    'tryAgain': 'ลองอีกครั้ง',
    'upgrade': 'อัปเกรด',
    'upgradeHint': 'อัปเกรดหน่วยของคุณ!',
    'rankOf': 'จาก {n}',
    'upNext': 'ต่อไป: ด่าน {n}'
  },

  // Two strings only; everything ON the card comes from keys this file
  // already had (see en.ts). `action` is the accessible name of an
  // icon-only button. `text` rides in the share sheet and is read by the
  // person who receives the picture, so it is a boast, and it has to still
  // make sense if the image never arrives.
  'share': {
    'action': 'แชร์ผลการเล่น',
    'text': 'ฉันไปถึงด่าน {n} ใน {game} แล้ว คุณไปได้ไกลกว่านี้ไหม?'
  },

  'leaderboard': {
    'title': 'กระดานผู้นำ',
    'rank': '#',
    'player': 'ผู้เล่น',
    'stage': 'ด่าน',
    'squad': 'หน่วย',
    'empty': 'ยังไม่มีสถิติ มาเป็นคนแรกสิ',
    'failed': 'เชื่อมต่อกระดานผู้นำไม่ได้',
    'loading': 'กำลังโหลด…',
    'you': 'คุณ',
    'yourRank': 'คุณอยู่อันดับ #{n} จาก {total}'
  },

  'chest': {
    'label': 'หีบสมบัติ',
    'ready': 'เปิดหีบสมบัติรับ {n} เหรียญ',
    'filling': 'หีบสมบัติกำลังเติม',
    'spent': 'หีบสมบัติว่างจนถึงพรุ่งนี้'
  },

  // Daily expedition. See en.ts for what each state means, why the multiplier
  // is split from any word, and why `hud` has to stay one short word.
  'expedition': {
    'title': 'การเดินทางประจำวัน',
    'hud': 'เดินทาง',
    'multiplier': '{n}×',
    'available': 'การเดินทางประจำวัน — เส้นทางของวันนี้ เหรียญสามเท่า',
    'confirm': 'เริ่มการเดินทาง',
    'spent': 'การเดินทางประจำวัน — เส้นทางใหม่ในอีก {time}',
    'done': 'พรุ่งนี้มาใหม่',
    'back': 'กลับสู่แคมเปญ'
  },

  'skills': {

    'grenade': 'ระเบิดมือ',

    'shield': 'โล่',

    'locked': 'ล็อกอยู่',

    'unlocksAt': 'ปลดล็อกที่ด่าน {n}',

    'frost': 'โนวาน้ำแข็ง',

    'decoy': 'พลุล่อ',

    'trialLabel': '{name} · ลองฟรี',

    'trialTag': 'ลองฟรี!',

    'uses': '×{n}'
  },

  'upgrades': {
    'title': 'อัปเกรด',
    'spotlight': 'ใช้เลย!',
    'level': 'Lv {n}',
    'maxed': 'สูงสุด',
    'names': {
      'squad': 'หน่วย',
      'power': 'พลังยิง',
      'rate': 'อัตรายิง',
      'range': 'ระยะยิง',
      'scavenge': 'เก็บของ',
      'grenade': 'ระเบิดมือ',
      'shield': 'โล่',
      'rocket': 'พลังจรวด',
      'gatling': 'พลังแกตลิง'
    },
    'descriptions': {
      'squad': 'เริ่มทุกด่านด้วยผู้รอดชีวิตมากขึ้น',
      'power': 'ผู้รอดชีวิตแต่ละคนสร้างดาเมจต่อนัดมากขึ้น',
      'rate': 'ผู้รอดชีวิตแต่ละคนยิงเร็วขึ้น',
      'range': 'หน่วยของคุณเปิดฉากยิงได้ไกลขึ้นบนถนน',
      'scavenge': 'รับเหรียญมากขึ้นทุกรอบ',
      'grenade': 'ขว้างระเบิดเพื่อสร้างความเสียหายหนัก',
      'shield': 'ลดความเสียหายที่หน่วยได้รับครึ่งหนึ่งชั่วครู่',
      'rocket': 'เครื่องยิงจรวดที่ปลดล็อกในด่านสร้างความเสียหายมากขึ้น',
      'gatling': 'ปืนแกตลิงที่ปลดล็อกในด่านสร้างความเสียหายมากขึ้น'
    }
  },

  'options': {
    'title': 'ตัวเลือก', 'general': 'ทั่วไป', 'audio': 'เสียง', 'language': 'ภาษา',
    'difficulty': 'ความยาก', 'soundEffects': 'เอฟเฟกต์เสียง', 'music': 'เพลง', 'musicTrack': 'แทร็กเพลง',
    'musicTracks': { 'cozy': 'ท่วงทำนองอบอุ่น', 'trance': 'อุโมงค์ทรานซ์' },
    'haptics': 'การสั่น', 'on': 'เปิด', 'off': 'ปิด',
    'close': 'บันทึกและปิด',
    'difficulties': { 'easy': 'ง่าย', 'medium': 'ปานกลาง', 'hard': 'ยาก' },
    'difficultyHints': {
      'easy': 'ศัตรูอ่อนลงและแนวกั้นบางลง',
      'medium': 'รอบมาตรฐาน',
      'hard': 'ศัตรูแกร่งขึ้นและแนวกั้นหนาขึ้น'
    }
  },

  'adsBlocked': {
    'title': 'ไม่สามารถแสดงโฆษณาได้',
    'body': 'เราพยายามแสดงวิดีโอเพื่อให้คุณได้รับรางวัล แต่มีบางอย่างในเบราว์เซอร์กำลังบล็อกโฆษณา',
    'allowPrefix': 'โปรดอนุญาตโฆษณาบน',
    'allowSuffix': '(หรือหยุดตัวบล็อกโฆษณาสำหรับเกมนี้) แล้วลองอีกครั้ง',
    'gotIt': 'เข้าใจแล้ว'
  },
  'saveStatus': {
    'restoredTitle': 'กู้คืนเซฟบนคลาวด์แล้ว', 'restoredBody': '+{n} เหรียญโบนัสสำหรับการกู้คืน',
    'tap': 'แตะ', 'pausedTitle': 'หยุดซิงก์คลาวด์ชั่วคราว',
    'pausedBody': 'กำลังเล่นออฟไลน์ ความคืบหน้าถูกบันทึกไว้ที่นี่',
    'retry': 'ลองใหม่', 'dismiss': 'ปิด'
  },
  'loading': { 'tooLong': 'โหลดนานเกินไป? ลองปิดตัวบล็อกโฆษณาแล้วรีเฟรช', 'boo': 'บู๊!', 'laugh': 'ฮ่าฮ่าฮ่า!' },
  // Phones in landscape are covered by a rotate-your-phone overlay: the lane
  // fills about a fifth of a wide frame, which is what put the HUD and the
  // attack badge out at the edges where testers never looked.
  'portrait': {
    'title': 'หมุนโทรศัพท์',
    'body': 'Survivalist เล่นในแนวตั้ง'
  },
  'license': { 'denied': 'ปฏิเสธการเข้าถึง: กรุณาซื้อไลเซนส์' }
}
