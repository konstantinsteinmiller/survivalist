// ─── The weapon puzzle ──────────────────────────────────────────────────────
//
// One optional beat every OTHER stage — and every stage of the long middle
// road, 16-29 (`WEAPON_EVERY_STAGE_FROM`; pinned in `longRoad.test.ts`) — that
// pays out a WEAPON for the rest of
// it: two levers at the road's shoulders, each behind a destructible stone,
// and — twelve units on — an armoured box that only opens if both went over.
//
// It is the only thing in the game that is purely a bonus, which is exactly why
// it needs a test file of its own. Nothing about it fails loudly. A puzzle that
// stops being placed, a box that stays shut after the levers are down, an
// armour plate parked where the crowd cannot get past it, a weapon that leaks
// into the next stage — none of those produce an error, a crash, or anything a
// playtester would report as a bug. They produce a beat that quietly stopped
// paying, and a mechanic nobody mentions again.
//
// So the five promises are pinned here:
//
//   1. every stage `stageHasWeapon` claims carries exactly one, in the middle
//      of the road, and no other stage carries any;
//   2. it is ignorable — the road left beside the armour fits a crowd at full
//      size, so a player who never solves one pays nothing;
//   3. ONE lever is not enough, a lever the crowd ran past cannot be collected
//      later by the cleanup, and every lever is covered by a stone that has to
//      be paid for first;
//   4. the box refuses damage while it is armoured, and pays out when broken;
//   5. the weapon dies with the stage that gave it.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildTrack, MIN_RUN_GAP, WEAPON_CLOSING_CLEAR, weaponSlotIdFor, type TrackEvent
} from '@/game/track'
import {
  BULLET_RANGE, CROWD_MAX_R, LANE_HALF, UNIT_R, stageSpeed
} from '@/game/survival'
import {
  LEVER_R, LEVER_STAGGER, LEVER_STONE_LEAD, LEVER_STONE_W, leverStoneHp,
  LEVER_X, ROCKET_SPLASH_SHARE, WEAPONS, WEAPON_BOX_AHEAD, WEAPON_DEBUT,
  WEAPON_BOX_X, WEAPON_EVERY, WEAPON_FREE_LANE, WEAPON_GUARD_LEAD, WEAPON_STAGE,
  stageHasWeapon, stageHasWeaponBox, stageHasWeaponGift, weaponDpsMul, weaponForStage,
  weaponReactionS, WEAPON_GIFT_LANE_SHARE, WEAPON_GIFT_STAGE, WEAPON_REVEAL_S
} from '@/game/weapons'
import { barricadeHp } from '@/game/track'
import { WEAPON_BOX_R } from '@/game/weapons'
import { __setUpgradeLevel, WEAPON_POWER_STEP, weaponPowerMul } from '@/use/useUpgrades'

const importGame = () => import('@/use/useSurvivalGame')
type Game = Awaited<ReturnType<typeof importGame>>

const STEP_MS = 16

beforeEach(async () => {
  localStorage.clear()
  const { __resetTowerState } = await import('@/use/useTowerState')
  __resetTowerState()
  const game = await importGame()
  game.debugGiveWeapon(null)
})

type WeaponEvent = Extract<TrackEvent, { kind: 'weapon' }>

/** Every stage in `[from, to]` whose road is supposed to carry a puzzle. */
const puzzleStages = (from: number, to: number): number[] => {
  const out: number[] = []
  for (let s = from; s <= to; s++) if (stageHasWeapon(s)) out.push(s)
  return out
}

const puzzleOf = (stage: number): WeaponEvent | null => {
  const found = buildTrack(stage).events.filter(
    (e): e is WeaponEvent => e.kind === 'weapon'
  )
  expect(found.length, `stage ${stage} should carry at most one puzzle`).toBeLessThan(2)
  return found[0] ?? null
}

// ─── 1. It is always there, and always in the middle ────────────────────────

describe('every other stage carries one', () => {
  it('places no PUZZLE at all while the game is still teaching', () => {
    // Stage 2 carries a weapon BOX now (the gift, below) and it is not a
    // puzzle: what may not exist before `WEAPON_STAGE` is the lever/cover/armour
    // furniture, because every piece of it is a wall and stages under
    // `HARD_OBSTACLE_FROM_STAGE` carry nothing that can kill. So the assertion
    // is about those three lists rather than about the beat existing.
    for (let stage = 1; stage < WEAPON_STAGE; stage++) {
      const w = puzzleOf(stage)
      expect(w?.levers.length ?? 0, `stage ${stage} has levers`).toBe(0)
      expect(w?.stones.length ?? 0, `stage ${stage} has lever cover`).toBe(0)
      expect(w?.guards.length ?? 0, `stage ${stage} has armour`).toBe(0)
    }
  })

  it('places exactly one on every stage that claims one, to 200', () => {
    const missing: number[] = []
    for (const stage of puzzleStages(WEAPON_STAGE, 200)) {
      if (!puzzleOf(stage)) missing.push(stage)
    }
    // A beat that a busy road can crowd out entirely is a beat half the
    // campaign silently does not have.
    expect(missing).toEqual([])
  })

  it('leaves the stages BETWEEN them carrying nothing', () => {
    // (from `WEAPON_STAGE` up — the stage-2 gift is checked on its own below)
    // The half of the cadence that makes the prize a prize: a road that always
    // has a launcher on it is not a road with a launcher on it. See
    // `WEAPON_EVERY`.
    const extra: number[] = []
    for (let stage = WEAPON_STAGE; stage <= 200; stage++) {
      if (!stageHasWeapon(stage) && puzzleOf(stage)) extra.push(stage)
    }
    expect(extra).toEqual([])
    // …and that it really is every OTHER stage, from stage 4 — the floor set by
    // `HARD_OBSTACLE_FROM_STAGE`, and one stage after the weapon the player
    // CHOSE for stage 3 (`WEAPON_PICK_STAGE`).
    expect(WEAPON_STAGE).toBe(4)
    expect(WEAPON_EVERY).toBe(2)
    expect(stageHasWeapon(WEAPON_STAGE)).toBe(true)
    expect(stageHasWeapon(WEAPON_STAGE + 1)).toBe(false)
    expect(stageHasWeapon(WEAPON_STAGE + 2)).toBe(true)
  })

  it('lands on the road, and always with room to be collected', () => {
    for (const stage of puzzleStages(WEAPON_STAGE, 120)) {
      const p = puzzleOf(stage)!
      const { arenaY } = buildTrack(stage)
      const at = p.y / arenaY
      // Never in the first few seconds — the beat is a decision, and a decision
      // in the run-out of the last stage's banner is not one.
      expect(at, `stage ${stage} at ${Math.round(at * 100)}%`).toBeGreaterThan(0.05)
      expect(at, `stage ${stage} at ${Math.round(at * 100)}%`).toBeLessThan(0.95)
      // The hard end of it. The crowd STOPS at `arenaY` and rounds only travel
      // up the road, so a box parked too close to the arena is one the player
      // is shown and can never take — see `WEAPON_CLOSING_CLEAR`.
      const roomLeft = arenaY - (p.box.y + WEAPON_BOX_R)
      expect(roomLeft, `stage ${stage} has ${roomLeft.toFixed(1)} left`)
        .toBeGreaterThanOrEqual(WEAPON_CLOSING_CLEAR)
    }
  })

  it('MOVES: the prize is not parked at the same mark every stage', () => {
    // Player-reported, in as many words: *"it feels the weapon upgrade is
    // always at the same position in a stage, that is boring"*. It was — one
    // target fraction, every stage, forever — and a beat whose entire content
    // is "did you notice" becomes a timer the moment its position is known.
    const stages = puzzleStages(WEAPON_STAGE, 120)
    const at = new Map(stages.map((st) => [st, puzzleOf(st)!.y / buildTrack(st).arenaY]))

    // Every named slot is actually dealt, and each lands in its own band —
    // early, middle, late, and the last thing on the road.
    const bands: Record<string, number[]> = { early: [], mid: [], late: [], close: [] }
    for (const st of stages) bands[weaponSlotIdFor(st)]!.push(at.get(st)!)
    for (const [id, xs] of Object.entries(bands)) {
      expect(xs.length, `slot ${id} is never dealt`).toBeGreaterThan(2)
    }
    expect(Math.max(...bands.early!)).toBeLessThan(Math.min(...bands.mid!))
    expect(Math.max(...bands.mid!)).toBeLessThan(Math.min(...bands.late!))
    expect(Math.max(...bands.late!)).toBeLessThan(Math.min(...bands.close!))
    // …and the spread really is most of the road, not a wobble around one mark.
    expect(Math.min(...bands.early!)).toBeLessThan(0.3)
    expect(Math.max(...bands.close!)).toBeGreaterThan(0.8)

    // No two puzzle stages in a row land in the same place: the variation has
    // to be visible from one stage to the next, not only across a campaign.
    for (let i = 1; i < stages.length; i++) {
      const move = Math.abs(at.get(stages[i]!)! - at.get(stages[i - 1]!)!)
      expect(move, `stages ${stages[i - 1]} → ${stages[i]}`).toBeGreaterThan(0.1)
    }
  })

  it('keeps the position and the weapon from predicting each other', () => {
    // The trap in dealing four slots against a weapon loop: pick a loop whose
    // length shares a factor with the position order's eight and the two dials
    // become one — each slot deals only part of the arsenal, and "the shotgun
    // is the one at the end of the road" is true for the rest of the campaign.
    // `WEAPON_ROTATION` is seven long against eight for exactly this reason.
    const seen = new Map<string, Set<string>>()
    for (const stage of puzzleStages(WEAPON_STAGE, 120)) {
      const id = weaponSlotIdFor(stage)
      if (!seen.has(id)) seen.set(id, new Set())
      seen.get(id)!.add(puzzleOf(stage)!.weapon)
    }
    const all = Object.keys(WEAPONS).length
    for (const [id, weapons] of seen) {
      expect(weapons.size, `slot ${id} only ever holds ${[...weapons]}`).toBe(all)
    }
  })

  it('opens the campaign EARLY, where the promise was just made', () => {
    // The first puzzle a player ever meets is pinned. It sits in the opening
    // fifth of stage 4 because the banner that opened the stage said "a weapon
    // on the road" — a promise kept inside ten seconds is what makes the next
    // one believable. The road's opening is also its calmest stretch, so the
    // two halves of the beat are on screen together. Variety is for the player
    // who already knows what a lever is; the rotation starts one stage on.
    expect(weaponSlotIdFor(WEAPON_STAGE)).toBe('early')
    const at = puzzleOf(WEAPON_STAGE)!.y / buildTrack(WEAPON_STAGE).arenaY
    expect(at).toBeGreaterThan(0.1)
    expect(at).toBeLessThan(0.35)
    // The rotation proper is anchored one stage on, unchanged, so every road
    // from 6 deals the slot it always did.
    expect(weaponSlotIdFor(WEAPON_STAGE + WEAPON_EVERY)).toBe('mid')
  })

  it('is still the same road on the retry', () => {
    // Varied is not the same as random. A player who wiped on stage 20 has to
    // meet stage 20's puzzle in stage 20's place next time, or planning the
    // sweep is impossible and the variation is just noise.
    for (const stage of [8, 12, 18, 34, 60]) {
      const first = puzzleOf(stage)!.y
      expect(puzzleOf(stage)!.y, `stage ${stage}`).toBe(first)
      expect(weaponSlotIdFor(stage)).toBe(weaponSlotIdFor(stage))
    }
  })

  it('deals every weapon, none of them before it debuts', () => {
    const stages = puzzleStages(WEAPON_STAGE, 40)
    for (const stage of stages) {
      expect(puzzleOf(stage)!.weapon).toBe(weaponForStage(stage))
    }
    // The trap the every-other-stage cadence walks into: alternate on
    // `stage % 2` while only even stages carry a box, and half the arsenal
    // never appears in one for the whole campaign. The rotation has to run over
    // the PUZZLE stages, not over the stages.
    const kinds = stages.map((s) => puzzleOf(s)!.weapon)
    // A weapon is never dealt before the stage it is introduced on: meeting the
    // shotgun on stage 4 would be meeting it instead of learning what a box is.
    for (const [i, w] of kinds.entries()) {
      expect(stages[i]!, `${w} dealt before its debut`).toBeGreaterThanOrEqual(WEAPON_DEBUT[w])
    }
    // …and every one of them IS dealt inside the first twenty puzzle stages, so
    // no shop row is dead money.
    expect(new Set(kinds).size).toBe(Object.keys(WEAPONS).length)
    // Never the same weapon twice in a row: a box is a change of plan.
    for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1])
    // The gatling goes first: the prize that teaches "the box pays out" should
    // not also be teaching a new verb.
    expect(kinds[0]).toBe('gatling')
  })

  it('is a pure function of the stage number, like the rest of the road', () => {
    // The whole campaign is re-buildable from a stage number — a player who
    // wipes on stage 12 must meet the same puzzle, on the same side, next try.
    for (const stage of [6, 8, 18, 34, 64]) {
      expect(stageHasWeapon(stage), `stage ${stage}`).toBe(true)
      expect(JSON.stringify(puzzleOf(stage))).toBe(JSON.stringify(puzzleOf(stage)))
    }
  })
})

// ─── 2. The geometry that makes it fair ─────────────────────────────────────

describe('the shape of the beat', () => {
  it('puts the two levers on OPPOSITE shoulders, staggered up the road', () => {
    for (const stage of puzzleStages(WEAPON_STAGE, 60)) {
      const [a, b] = puzzleOf(stage)!.levers
      expect(Math.abs(a!.x)).toBeCloseTo(LEVER_X, 5)
      expect(Math.abs(b!.x)).toBeCloseTo(LEVER_X, 5)
      // Opposite sides: the sweep across the lane IS the puzzle.
      expect(Math.sign(a!.x)).toBe(-Math.sign(b!.x))
      // …and staggered, so the second one's window opens as the first's closes.
      // Two levers on one line is a coin flip on whether the crowd finishes its
      // sweep in time, which is not a skill.
      expect(b!.y - a!.y).toBeCloseTo(LEVER_STAGGER, 5)
    }
  })

  it('leaves the reaction window intact at every speed the campaign reaches', () => {
    // `stageSpeed` climbs to a 7.4 u/s ceiling. The gap between the last lever
    // and the armour is fixed in UNITS, so it shrinks in seconds as the road
    // speeds up — this is the floor it may not fall through.
    for (const stage of [WEAPON_STAGE, 20, 60, 200]) {
      expect(weaponReactionS(stage), `stage ${stage}`).toBeGreaterThan(1.2)
    }
  })

  it('parks the prize and its armour on ONE shoulder, and the armour in front', () => {
    for (const stage of puzzleStages(WEAPON_STAGE, 60)) {
      const p = puzzleOf(stage)!
      expect(Math.abs(p.box.x)).toBeCloseTo(WEAPON_BOX_X, 5)
      expect(p.box.y - p.y).toBeCloseTo(WEAPON_BOX_AHEAD, 5)
      expect(p.box.y - p.guardY).toBeCloseTo(WEAPON_GUARD_LEAD, 5)
      // The armour covers the box rather than standing beside it — a plate that
      // has drifted off the prize is a wall for no reason.
      for (const g of p.guards) {
        expect(Math.abs(g.x - p.box.x)).toBeLessThan(1.2)
      }
    }
  })

  it('is IGNORABLE: a crowd at full size fits past the armour', () => {
    // The load-bearing safety property. The plates kill on contact like every
    // other wall, and this beat is a bonus nobody asked for — so a player who
    // wants nothing to do with it must be able to drive past without losing a
    // single survivor.
    expect(WEAPON_FREE_LANE).toBeGreaterThan(MIN_RUN_GAP)
    for (const stage of puzzleStages(WEAPON_STAGE, 60)) {
      const p = puzzleOf(stage)!
      const near = Math.min(...p.guards.map((g) => g.x - g.w / 2))
      const far = Math.max(...p.guards.map((g) => g.x + g.w / 2))
      // Whichever side the prize is on, the OTHER side is open road.
      const gap = p.box.x > 0 ? near + LANE_HALF : LANE_HALF - far
      expect(gap, `stage ${stage}`).toBeGreaterThan(MIN_RUN_GAP)
    }
  })

  it('covers each lever with exactly one stone, in the same column', () => {
    // The beat's one measured flaw: the levers sit at |x| = 3.4 with no cover,
    // the crowd fires fourteen scattered streams up the road, and any line that
    // strayed near the rail solved half the puzzle by accident. Cover is what
    // turns "did you drift" back into "did you notice".
    for (const stage of puzzleStages(WEAPON_STAGE, 60)) {
      const p = puzzleOf(stage)!
      expect(p.stones, `stage ${stage}`).toHaveLength(p.levers.length)
      for (let i = 0; i < p.levers.length; i++) {
        const lever = p.levers[i]!
        const stone = p.stones[i]!
        // Same column, or it is not cover — it is a boulder beside a lever.
        expect(stone.x, `stage ${stage} stone ${i}`).toBeCloseTo(lever.x, 5)
        // …and in FRONT of the post, which is the only side that blocks
        // anything: the crowd approaches from below.
        expect(lever.y - stone.y, `stage ${stage} stone ${i}`)
          .toBeCloseTo(LEVER_STONE_LEAD, 5)
        // Wide enough to shadow the whole of the lever's own hitbox. A rim of
        // exposed post is exactly the accidental hit the stone exists to stop.
        expect(stone.w / 2).toBeGreaterThan(LEVER_R)
      }
    }
  })

  it('prices the stone against the lever it covers, not against the wall', () => {
    // The stone is cover on an optional bonus, so it may not cost more than the
    // walls the road is already charging for — and it may not become a second
    // health check on the beat that is supposed to charge attention.
    for (const stage of [WEAPON_STAGE, 12, 30, 90]) {
      const p = puzzleOf(stage)!
      const wall = barricadeHp(stage)
      for (const stone of p.stones) {
        expect(stone.hp, `stage ${stage}`).toBe(leverStoneHp(stage))
        expect(stone.hp).toBeLessThan(wall)
        // …and a long way under the armour, which is the thing the player is
        // supposed to route around rather than shoot.
        expect(stone.hp).toBeLessThan(p.guards[0]!.hp)
      }
    }
  })

  it('lets an opening run actually open the first box', () => {
    // The regression this exists for: the stone was priced off the stage's
    // WALL while the lever behind it was priced for a beginner, so the cover
    // cost seven times the thing it covered and the first puzzle in the game
    // was arithmetically shut — one shoulder wanted more seconds of perfect
    // fire than the window has, and it has to be paid twice. Nothing caught it,
    // because every check here was about geometry or about the stone's price in
    // terms of the wall it was derived from, which is circular.
    //
    // The measured opening: a no-upgrade run reaches the first stone with a
    // squad of 14 at 1.0 damage and 1.9 shots a second — 26.6 dps, and the sim
    // returns the same figure on every seed because nothing before this beat is
    // random. Of the fourteen streams a player who commits to the shoulder
    // lands most but never all, so the budget below is well under the total.
    const OPENING_DPS = 26.6
    const ON_TARGET = 0.6
    // Half the window, so it can be paid twice and still leave fire for the road.
    const BUDGET = 0.5

    const stage = WEAPON_STAGE
    const p = puzzleOf(stage)!
    const window = weaponReactionS(stage) + LEVER_STONE_LEAD / stageSpeed(stage)
    const shoulder = p.stones[0]!.hp + p.levers[0]!.hp
    const seconds = shoulder / (OPENING_DPS * ON_TARGET)

    expect(
      seconds,
      `a shoulder costs ${shoulder} hp = ${seconds.toFixed(2)}s of an opening run's ` +
      `aimed fire, against a ${window.toFixed(2)}s window`
    ).toBeLessThan(window * BUDGET)
  })

  it('leaves the stones out of the road a player is ignoring', () => {
    // Same promise the armour makes. The stones sit on the rails at |x| = 3.4;
    // the open lane between them is the whole width of the road, and a crowd at
    // full size has to fit down it without being asked to thread anything.
    for (const stage of puzzleStages(WEAPON_STAGE, 60)) {
      const p = puzzleOf(stage)!
      for (const stone of p.stones) {
        expect(Math.abs(stone.x), `stage ${stage}`).toBeCloseTo(LEVER_X, 5)
        expect(stone.w).toBeCloseTo(LEVER_STONE_W, 5)
        // The inner edge of a stone, measured off the centre line, leaves more
        // than half the lane clear on its own side.
        expect(Math.abs(stone.x) - stone.w / 2).toBeGreaterThan(MIN_RUN_GAP / 2)
      }
    }
  })

  it('prices the levers as attention, not as damage', () => {
    // A lever is cheap and stays cheap. The run that most needs a free weapon —
    // small crowd, low damage — is precisely the run that cannot also afford to
    // pay for one in DPS, so the lever must never become a health check.
    for (const stage of [WEAPON_STAGE, 30, 120]) {
      expect(stageHasWeapon(stage), `stage ${stage}`).toBe(true)
      const p = puzzleOf(stage)!
      expect(p.levers[0]!.hp).toBeLessThan(p.box.hp / 2)
      // …while the armour is the thing that is genuinely expensive to argue with.
      expect(p.guards[0]!.hp).toBeGreaterThan(p.box.hp * 3)
    }
  })
})

// ─── 3–5. The rules, driven through the real simulation ─────────────────────

/** Run a stage forward until its levers have streamed in. */
const atPuzzle = async (stage: number): Promise<Game> => {
  const game = await importGame()
  game.startStage(stage)
  // A crowd big enough that a lever falls to a shot or two — the beat under
  // test is the aiming, not the time-to-kill.
  game.debugAddUnits(80)
  game.debugAddDamage(4)
  for (let i = 0; i < 8000 && game.getLevers().length === 0; i++) game.step(STEP_MS)
  expect(game.getLevers().length, `stage ${stage} levers`).toBeGreaterThan(0)
  return game
}

/** Steer onto a lever and hold fire until it goes over (or the road runs out). */
const shootLever = (game: Game, index: number): boolean => {
  for (let i = 0; i < 900; i++) {
    const lv = game.getLevers()[index]
    if (!lv) return false
    if (lv.pulled) return true
    game.steerTo(lv.x)
    game.step(STEP_MS)
  }
  return false
}

describe('solving it', () => {
  it('needs BOTH levers — one is not a discount', async () => {
    const game = await atPuzzle(8)
    expect(shootLever(game, 0)).toBe(true)
    // One down, and the box is still shut. This is the property the whole beat
    // rests on: a puzzle that pays out on partial credit is a pickup.
    expect(game.getWeaponBoxes()[0]!.locked).toBe(true)
    expect(game.puzzlePulled.value).toBe(1)
    expect(shootLever(game, 1)).toBe(true)
    expect(game.getWeaponBoxes()[0]!.locked).toBe(false)
  })

  it('shields its lever until it is broken', async () => {
    // The load-bearing property of the whole change. A round that reaches the
    // post while the stone is still standing means the cover is decorative and
    // the puzzle is back to being solved by drift.
    const game = await atPuzzle(8)
    const lever = game.getLevers()[0]!
    const stone = game.getStones().find((s) => Math.abs(s.x - lever.x) < 0.01)
    expect(stone, 'lever 0 should have a stone').toBeTruthy()
    const full = lever.hp

    let sawStoneTakeFire = false
    for (let i = 0; i < 900; i++) {
      game.steerTo(lever.x)
      game.step(STEP_MS)
      if (stone!.hp < stone!.maxHp) sawStoneTakeFire = true
      if (stone!.dead || lever.pulled) break
      // Only while the crowd is still BEHIND the cover: once the squad has
      // driven past a stone it never broke, the post above it is fair game and
      // that is correct — cover blocks a line of fire, not a lever.
      if (game.anchor().y > stone!.y) break
      expect(lever.hp, `frame ${i}`).toBe(full)
    }
    // …and the fire really was landing somewhere, or the assertion above passed
    // on a crowd that simply never shot at anything.
    expect(sawStoneTakeFire).toBe(true)
  })

  it('is broken, and then the lever behind it goes over', async () => {
    const game = await atPuzzle(8)
    const lever = game.getLevers()[0]!
    const stone = game.getStones().find((s) => Math.abs(s.x - lever.x) < 0.01)!
    expect(stone.hp).toBeGreaterThan(lever.hp)
    // The beat still has to be SOLVABLE by an ordinary crowd inside the window
    // the road gives it — cover that cannot be paid for is a wall.
    expect(shootLever(game, 0)).toBe(true)
    expect(stone.dead || stone.hp <= 0).toBe(true)
  })

  it('never bills a survivor for touching one', async () => {
    // Furniture on an optional bonus, exactly like the armour: solid to rounds
    // and to the formation, harmless to brush. See `Guard`.
    const game = await atPuzzle(8)
    const stone = game.getStones()[0]!
    const before = game.deathBreakdown().barricade
    for (let i = 0; i < 600; i++) {
      game.steerTo(stone.x)
      game.step(STEP_MS)
      if (game.phase.value !== 'run' || stone.dead) break
    }
    expect(game.phase.value).toBe('run')
    expect(game.deathBreakdown().barricade).toBe(before)
  })

  it('takes the armour off the box, rather than damaging it', async () => {
    const game = await atPuzzle(8)
    const id = game.getWeaponBoxes()[0]!.puzzleId
    expect(game.getGuards().some((g) => g.puzzleId === id && !g.dead)).toBe(true)
    shootLever(game, 0)
    shootLever(game, 1)
    // All of it, in the frame the last lever landed. A player who solved the
    // puzzle has no road left to also shoot a wall down.
    expect(game.getGuards().some((g) => g.puzzleId === id && !g.dead)).toBe(false)
  })

  it('never puts a lethal wall in the road for a bonus nobody asked for', async () => {
    // The armour is solid and it has health, so it looks exactly like the walls
    // that erase whoever touches them. It must not BE one: this beat is optional
    // and unbudgeted, and a player steering an ordinary line past it has not
    // opted into anything. Brushing it costs a trickle, the way a supply crate
    // does — see `Guard`.
    const game = await atPuzzle(8)
    const guard = game.getGuards()[0]!
    const before = game.deathBreakdown().barricade
    for (let i = 0; i < 600; i++) {
      game.steerTo(guard.x)
      game.step(STEP_MS)
      if (game.phase.value !== 'run' || guard.dead) break
    }
    // Driven straight into it for as long as the road allowed, and the run is
    // still going.
    expect(game.phase.value).toBe('run')
    expect(game.deathBreakdown().barricade).toBe(before)
  })

  it('refuses damage for as long as it is armoured', async () => {
    const game = await atPuzzle(8)
    const box = game.getWeaponBoxes()[0]!
    const before = box.hp
    // Park the crowd under the box and hold fire on it without touching a lever.
    // Checked EVERY frame rather than once at the end, because the armour is an
    // ordinary wall and a big enough crowd is allowed to tear it off — the
    // property under test is that the box is untouchable up to that moment, not
    // that the moment never comes.
    for (let i = 0; i < 600; i++) {
      game.steerTo(box.x)
      game.step(STEP_MS)
      if (!box.locked || box.dead) break
      expect(box.hp).toBe(before)
    }
    expect(game.activeWeapon.value).toBeNull()
  })

  it('cannot be solved by driving past an unpulled lever', async () => {
    // The bug this pins: levers are culled once they are behind the crowd, and
    // an "are any left?" test that counted the LIVE array would read "none" and
    // open the box for free. The tally lives on the box for exactly this reason.
    const game = await atPuzzle(8)
    const box = game.getWeaponBoxes()[0]!
    // Shoot only the SECOND lever, then let the road carry the first one away.
    expect(shootLever(game, 1)).toBe(true)
    for (let i = 0; i < 400 && !box.dead; i++) game.step(STEP_MS)
    expect(box.leversPulled).toBe(1)
    expect(game.activeWeapon.value).toBeNull()
  })

  it('hands over the weapon when the opened box is broken', async () => {
    const game = await atPuzzle(8)
    shootLever(game, 0)
    shootLever(game, 1)
    const box = game.getWeaponBoxes()[0]!
    const want = box.weapon
    for (let i = 0; i < 900 && game.activeWeapon.value === null; i++) {
      game.steerTo(box.x)
      game.step(STEP_MS)
    }
    expect(game.activeWeapon.value).toBe(want)
    // …and the badge stops advertising a puzzle that is over.
    expect(game.puzzleWeapon.value).toBeNull()
  })

  it('does not carry the weapon into the next stage', async () => {
    const game = await importGame()
    game.startStage(8)
    game.debugGiveWeapon('rocket')
    expect(game.activeWeapon.value).toBe('rocket')
    game.advanceStage()
    // A per-stage prize that survived the stage would quietly re-balance every
    // road after it — see `game/weapons.ts`.
    expect(game.activeWeapon.value).toBeNull()
  })
})

// ─── The weapons themselves ─────────────────────────────────────────────────

describe('what the two weapons are worth', () => {
  it('prices them to the same order of DPS and to different shapes', () => {
    // Neither may be the obvious pick, or half the campaign's stages become the
    // stages you hope not to land on.
    const rocket = weaponDpsMul('rocket')
    const gatling = weaponDpsMul('gatling')
    expect(rocket).toBeGreaterThan(2)
    expect(gatling).toBeGreaterThan(2)
    expect(Math.max(rocket, gatling) / Math.min(rocket, gatling)).toBeLessThan(1.8)
    // The shapes, though, are opposites: one is slow and splashes, one is fast
    // and does not.
    expect(WEAPONS.rocket.rateMul).toBeLessThan(1)
    expect(WEAPONS.gatling.rateMul).toBeGreaterThan(2)
    expect(WEAPONS.gatling.damageMul).toBe(1.6)
    expect(WEAPONS.rocket.splashR).toBeGreaterThan(0)
    expect(WEAPONS.gatling.splashR).toBe(0)
  })

  it('sells the two damage multipliers separately', () => {
    expect(weaponPowerMul('rocket')).toBe(1)
    expect(weaponPowerMul('gatling')).toBe(1)
    __setUpgradeLevel('rocket', 5)
    expect(weaponPowerMul('rocket')).toBeCloseTo(1 + 5 * WEAPON_POWER_STEP, 6)
    // Bought separately means bought separately: the launcher's levels must not
    // leak into the gun the other half of the campaign hands you.
    expect(weaponPowerMul('gatling')).toBe(1)
    __setUpgradeLevel('rocket', 0)
  })

  it('fires far fewer, far heavier rounds with the launcher', async () => {
    const game = await importGame()

    const sample = (weapon: 'rocket' | 'gatling' | null): { n: number; peak: number } => {
      game.startStage(6)
      game.debugAddUnits(40)
      game.debugGiveWeapon(weapon)
      let n = 0
      let peak = 0
      // Count what leaves the muzzle over a second of road rather than what is
      // in flight, which is confounded by how fast each round dies.
      for (let i = 0; i < 62; i++) {
        const before = game.getBullets().length
        game.step(STEP_MS)
        const now = game.getBullets()
        n += Math.max(0, now.length - before)
        for (const b of now) peak = Math.max(peak, b.damage)
      }
      return { n, peak }
    }

    const plain = sample(null)
    const rocket = sample('rocket')
    const gatling = sample('gatling')

    expect(rocket.n).toBeLessThan(plain.n)
    expect(gatling.n).toBeGreaterThan(plain.n)
    // One stream instead of fourteen, at five and a half times the damage: a
    // rocket has to be worth stopping to watch.
    expect(rocket.peak).toBeGreaterThan(plain.peak * 10)
    game.debugGiveWeapon(null)
  })
})

describe('the rocket blast', () => {
  it('damages a body the round never touched', async () => {
    const game = await importGame()
    game.startStage(6)
    game.debugAddUnits(60)

    // Wait for a real foe to exist, then use it as a template — building one by
    // hand would mean this test carries its own copy of a twenty-field struct
    // that the simulation is free to change underneath it.
    for (let i = 0; i < 4000 && game.getFoes().length < 1; i++) game.step(STEP_MS)
    const template = game.getFoes()[0]
    expect(template, 'stage 6 should put something on the road').toBeTruthy()

    /**
     * Fire into a two-body arrangement for a fixed stretch of road, with the
     * road itself emptied out, and report what the SECOND body lost.
     *
     * Everything here is about isolation, and every part of it was a measured
     * failure of a simpler version:
     *
     *   • the pair is re-planted six units ahead EVERY frame. Left where they
     *     were first put, the crowd simply runs past them and the whole sample
     *     comes back empty;
     *   • the crates, walls and boulders of the real stage are cleared every
     *     frame too. A rocket that goes off against a crate splashes whatever is
     *     near the crate, and the sample then measures that instead;
     *   • the near body is OVERSIZED, so its hitbox is wider than the crowd's own
     *     spread and no round can scatter past it. Putting the second body off to
     *     the SIDE instead does not work — rounds are fired from survivors spread
     *     across the crowd's full width, so "beside the line of fire" is still on
     *     somebody's line of fire, and an ordinary round reached it;
     *   • and it runs a FIXED number of frames rather than stopping at the first
     *     hit, because "the first hit" is itself a splash on a busy road.
     *
     * Scale 3 and a half-unit gap are not arbitrary: a round resolves anywhere
     * inside its target's hitbox, so against a wider body a hit could detonate
     * far enough off the centre line to fall outside its own blast. These put the
     * worst-case impact point at 2.2 units from the bystander against a 2.3
     * radius — a guarantee rather than a probability.
     */
    const sample = (weapon: 'rocket' | null): { hit: number; bystander: number } => {
      game.debugGiveWeapon(weapon)
      game.getBullets().length = 0
      const foes = game.getFoes()
      const mk = (scale: number) => {
        const f = { ...template!, id: 90000 + foes.length, dead: false, hp: 1e9, maxHp: 1e9 }
        f.scale = scale
        f.speed = 0
        f.hold = 0
        return f
      }
      const hit = mk(3)
      const bystander = mk(0.4)

      for (let i = 0; i < 180; i++) {
        const a = game.anchor()
        hit.x = a.x
        hit.y = a.y + 6
        bystander.x = a.x
        bystander.y = a.y + 6.5
        // Rebuilt every frame, in this ORDER. `resolveBullet` takes the first
        // overlapping body in array order, and the live array is compacted with
        // a swap-and-pop (see the pools in `useSurvivalGame`) — so anything that
        // leaves the array can move the tail into an earlier slot and silently
        // put the bystander in front of the wall that is supposed to shadow it.
        foes.length = 0
        foes.push(hit, bystander)
        game.getCrates().length = 0
        game.getBarricades().length = 0
        game.getRocks().length = 0
        game.getGuards().length = 0
        game.steerTo(a.x)
        game.step(STEP_MS)
      }
      return { hit: hit.maxHp - hit.hp, bystander: bystander.maxHp - bystander.hp }
    }

    const plain = sample(null)
    const rocket = sample('rocket')
    game.debugGiveWeapon(null)

    expect(plain.hit, 'the ordinary gun never landed a round').toBeGreaterThan(0)
    expect(rocket.hit, 'the launcher never landed a round').toBeGreaterThan(0)
    // The control matters as much as the case: an ordinary round must NOT reach
    // the shadowed body, or this test would pass on a rocket that does nothing
    // special.
    expect(plain.bystander, 'an ordinary round reached a body it never hit').toBe(0)
    expect(rocket.bystander, 'the blast reached nothing').toBeGreaterThan(0)
  })

  it('charges the blast at a discount, so a crowd is worth more than a boss', () => {
    // The number that stops the launcher being a straight multiplier: a pack of
    // twelve is worth roughly four rounds, one body is worth exactly one.
    expect(ROCKET_SPLASH_SHARE).toBeGreaterThan(0)
    expect(ROCKET_SPLASH_SHARE).toBeLessThan(1)
  })
})

// ─── The stage-2 gift ───────────────────────────────────────────────────────
//
// The first weapon box a player ever meets: the mechanic with the puzzle taken
// off it, so stage 4's levers read as a lock on something already understood.
// It can only exist because it is not a wall — see `WEAPON_GIFT_STAGE`.
describe('the stage-2 gift box', () => {
  const gift = puzzleOf(WEAPON_GIFT_STAGE)

  it('is there, exactly once, and only on stage 2', () => {
    expect(gift, 'stage 2 carries no weapon box').not.toBeNull()
    expect(stageHasWeaponGift(WEAPON_GIFT_STAGE)).toBe(true)
    for (const stage of [1, 3, 4, 5, 6]) {
      expect(stageHasWeaponGift(stage), `stage ${stage}`).toBe(false)
    }
    // …and it is not quietly a second puzzle stage.
    expect(stageHasWeapon(WEAPON_GIFT_STAGE)).toBe(false)
    expect(stageHasWeaponBox(WEAPON_GIFT_STAGE)).toBe(true)
  })

  it('carries nothing that can kill', () => {
    // The rule that keeps `WEAPON_STAGE` at 4 is about walls, and this beat has
    // none. If any of these ever fills up, the gift has to move to stage 4 with
    // the rest of them.
    expect(gift!.levers).toEqual([])
    expect(gift!.stones).toEqual([])
    expect(gift!.guards).toEqual([])
  })

  it('sits on the centre line and takes 40 % of the road', () => {
    expect(gift!.box.x, 'the gift drifted off the centre line').toBe(0)
    const width = (gift!.boxR ?? WEAPON_BOX_R) * 2
    expect(width / (LANE_HALF * 2)).toBeCloseTo(WEAPON_GIFT_LANE_SHARE, 2)
    // Twice an earned box in each direction, which is what needed `WeaponBox.r`
    // to stop being one global constant.
    expect(gift!.boxR).toBeGreaterThan(WEAPON_BOX_R * 1.9)
  })

  it('still leaves a full-size crowd a way past it', () => {
    // "Almost not missable" is the brief, not "unavoidable": a player who
    // deliberately hugs a rail has to be able to get by, or the box is a toll.
    const free = LANE_HALF - (gift!.boxR ?? WEAPON_BOX_R)
    expect(free, `only ${free.toFixed(2)} units of road at each rail`)
      .toBeGreaterThan(CROWD_MAX_R + UNIT_R)
  })

  it('lands in clear road, mid-stage', () => {
    const t = buildTrack(WEAPON_GIFT_STAGE)
    const r = gift!.boxR ?? WEAPON_BOX_R
    // Nothing the player has to react to precisely may overlap the box's depth.
    for (const e of t.events) {
      if (e === gift || e.kind === 'coins') continue
      if (e.kind !== 'gates' && e.kind !== 'crates' && e.kind !== 'miniboss') continue
      expect(Math.abs(e.y - gift!.y), `${e.kind}@${e.y} sits on the gift`)
        .toBeGreaterThan(r + 1)
    }
    // …and it comes AFTER the stage's elite. Not cosmetic: a box this wide on
    // the centre line is exactly where a crowd that never steers already is, so
    // handing the weapon over before the miniboss let a no-input run clear
    // stage 2 on every seed — the rule `balance.test.ts` calls "walks the taught
    // stages and is stopped by the game". The elite has to be met on the
    // squad's own gun.
    const elite = t.events.find((e) => e.kind === 'miniboss')
    expect(elite, 'stage 2 lost its elite').toBeDefined()
    expect(gift!.y, 'the gift moved back in front of the elite')
      .toBeGreaterThan(elite!.y)
    // …and still on the road rather than inside the arena.
    const at = gift!.y / t.arenaY
    expect(at, `the gift sits at ${Math.round(at * 100)}% of the road`).toBeLessThan(0.92)
  })
})

// ─── 6. The gift is an OPEN box ─────────────────────────────────────────────
//
// The reward-design sense of the phrase: the prize is visible before the player
// commits, so steering into it is a decision about a known reward rather than a
// gamble on a crate. On the road that is furniture (`drawWeaponBoxes`); in the
// sim it is one bit — a gift spawns with `locked` false — and this block pins
// the bit, because the furniture is worthless the moment the bit goes back.
//
// It also pins the OTHER half of the decision: the earned stage-4+ box stays
// shut on purpose. See `WeaponBox.locked` for the argument. A future
// "consistency" pass that opens both would sail past every test in this file
// without these.

/**
 * Stage 2, stepped until the gift box is on the road.
 *
 * The default boost is not padding. The gift sits AFTER the elite by design
 * (see the layout note in `stageTwo`), and on the lengthened stage 2 the elite
 * plants at ~117 against a road that now runs fifty seconds — so a run that
 * never steers and never grows dies to it, which is exactly what that placement
 * is for. A squad big enough to walk through the landmark is the cheapest way to
 * put the box on the road; none of the assertions below are about difficulty.
 */
const atGift = async (boost = 40): Promise<Game> => {
  const game = await importGame()
  game.startStage(WEAPON_GIFT_STAGE)
  if (boost > 0) {
    game.debugAddUnits(boost)
    game.debugAddDamage(4)
  }
  for (let i = 0; i < 12_000 && game.getWeaponBoxes().length === 0; i++) game.step(STEP_MS)
  expect(game.getWeaponBoxes().length, 'stage 2 never streamed its gift box').toBe(1)
  return game
}

describe('the gift is an open box', () => {
  it('is unlocked from the instant it exists — before it is even in range', async () => {
    const game = await atGift()
    const box = game.getWeaponBoxes()[0]!
    const away = box.y - game.anchor().y

    // The bit itself. A gift has no armour, so there is nothing for `locked` to
    // mean; it used to start true anyway and was flipped by the proximity test
    // in `stepWeaponBoxes`, which does not run until `anchorY + 6`.
    expect(box.locked, 'the gift box spawned shut').toBe(false)
    expect(box.gift).toBe(true)

    // …and it is open while still WELL out of gun range, which is the property
    // the old design could not have: `streamTrack` builds it at `anchorY + 30`.
    expect(away, `the gift only appeared ${away.toFixed(1)} units out`)
      .toBeGreaterThan(BULLET_RANGE)
  })

  it('does not play the reveal ring it has no cause for', async () => {
    // The ring means "the thing you shot did THIS" (`unlockPuzzle`). A box that
    // was never shut has no such moment, and firing it at spawn would play it
    // thirty units up the road, off the top of the camera. Suppressed by
    // spawning past the window rather than by a `gift` test in the renderer, so
    // the two files have to agree on `WEAPON_REVEAL_S` — hence the assertion.
    const game = await atGift()
    expect(game.getWeaponBoxes()[0]!.openFor).toBeGreaterThanOrEqual(WEAPON_REVEAL_S)
  })

  it('says FREE on the HUD instead of counting levers it does not have', async () => {
    const game = await atGift()
    expect(game.puzzleWeapon.value, 'the gift did not raise the badge').not.toBeNull()
    expect(game.puzzleGift.value, 'the badge is advertising a lock that is not there')
      .toBe(true)
    expect(game.puzzleTotal.value).toBe(0)
  })

  it('pays out from up the road, not on the last frame before contact', async () => {
    // The measured consequence, and the one a regression would actually be felt
    // as. A locked box refuses damage outright, so under the old design the
    // earliest the gift COULD break was the `anchorY + 6` unlock. Measured on
    // stage 2 across four squad sizes (bare, +6, +20, +60), the break distance
    // shut was 5.93 / 5.99 / 6.00 / 6.00 units — pinned to the threshold, and
    // flat, because the constraint was never the squad's damage. Open, the same
    // four broke at 11.2 to 13.0: essentially the moment the box entered gun
    // range. Twice the road, and it is the WEAK squad that gains it, because a
    // strong one was being clamped by the same 6 units as everyone else.
    const game = await atGift(60)
    let brokeAt = -1
    for (let i = 0; i < 4000; i++) {
      const box = game.getWeaponBoxes()[0]
      const away = box && !box.dead ? box.y - game.anchor().y : brokeAt
      game.step(STEP_MS)
      if (game.activeWeapon.value) { brokeAt = away; break }
      brokeAt = away
      if (game.phase.value !== 'run') break
    }
    expect(game.activeWeapon.value, 'the gift never paid out').not.toBeNull()
    expect(brokeAt, `the gift only broke ${brokeAt.toFixed(1)} units out`)
      .toBeGreaterThan(6)
  })

  it('is fully on screen for many times what a lane change costs', async () => {
    // The constraint the tell is sized against, measured rather than asserted
    // from taste — and the measurement is also the correction to the first
    // theory of this bug.
    //
    // The theory was that a box that only lit up at `anchorY + 6` gave the
    // player no road to react in. It does not survive the number: measured
    // here, a full-lane correction settles in about a quarter of a second, so
    // even six units is four or five crossings' worth of road. Steering was
    // never the binding constraint, which is exactly why a closed box survived
    // this long — nobody could point at a moment where it was unreachable.
    //
    // What it cost is the other two things, and both are pinned elsewhere in
    // this block: the object signalled the wrong CATEGORY for 56 % of its
    // approach (a braced steel crate, which on this road is what an obstacle
    // looks like), and a locked box refuses damage, so the guns got 6 units of
    // window instead of `BULLET_RANGE`'s 10.83 — and this box is opened by
    // being SHOT, not by being touched.
    //
    // So what this asserts is the honest version: the prize is fully on screen
    // for far longer than any decision it asks for could possibly need.
    const game = await importGame()
    game.startStage(WEAPON_GIFT_STAGE)
    for (let i = 0; i < 120; i++) game.step(STEP_MS)
    const from = -LANE_HALF + 0.5
    const to = LANE_HALF - 0.5
    game.steerTo(from)
    for (let i = 0; i < 400 && Math.abs(game.anchor().x - from) > 0.1; i++) game.step(STEP_MS)
    game.steerTo(to)
    let frames = 0
    for (; frames < 400 && Math.abs(game.anchor().x - to) > 0.25; frames++) game.step(STEP_MS)
    expect(frames, 'the crowd never crossed the lane').toBeLessThan(400)

    const crossS = (frames * STEP_MS) / 1000
    const crossUnits = crossS * stageSpeed(WEAPON_GIFT_STAGE)
    // The box's FAR edge clearing the top of the screen, not its centre: half
    // an object hanging off the camera is a silhouette, not a read.
    const gift = puzzleOf(WEAPON_GIFT_STAGE)!
    //
    // "The top of the screen" is the LOWER edge of the HUD strip, and since the
    // camera was solved from the gun's range (2026-09-18, `cameraScale`) the one
    // figure guaranteed readable under it on every ratio is `BULLET_RANGE`
    // itself (`byHud`). It used to be `CROWD_SCREEN_Y x VIEW_HEIGHT` (13.68),
    // which the zoomed-in frame no longer shows under the strip.
    const visible = BULLET_RANGE - (gift.boxR ?? WEAPON_BOX_R)
    expect(
      visible,
      `a full-lane correction eats ${crossUnits.toFixed(2)} units of road and the box ` +
        `is only fully on screen for ${visible.toFixed(1)}`
    ).toBeGreaterThan(crossUnits * 4)
    // And the shootable window is the one that actually binds, so it gets an
    // assertion of its own: opening at range rather than at `anchorY + 6` is
    // worth most of a doubling. If someone re-locks the gift, this is the
    // number that says what it cost.
    expect(BULLET_RANGE / 6, 'the gift stopped being shootable at range')
      .toBeGreaterThan(1.7)
  })

  it('leaves the EARNED box shut, which is a decision and not an oversight', async () => {
    // The levers are the drama and `unlockPuzzle`'s reveal is the only moment in
    // the game that says "the thing you shot did THIS". The player is not kept
    // in the dark either way: `WeaponTag` names the weapon on the HUD from the
    // moment the beat streams in, twelve units before the box is on screen. So
    // both beats tell you the prize before you commit; only one of them opens.
    const game = await atPuzzle(WEAPON_STAGE)
    const box = game.getWeaponBoxes()[0]!
    expect(box.gift, 'the stage-4 box became a gift').toBe(false)
    expect(box.locked, 'the earned box stopped being a puzzle').toBe(true)
    expect(box.openFor, 'the earned box skipped its reveal').toBe(0)
    expect(game.puzzleGift.value, 'the earned box is advertising itself as free')
      .toBe(false)
    expect(game.puzzleTotal.value).toBeGreaterThan(0)
  })
})
