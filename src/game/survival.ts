import type { BossKind, MinibossKind } from '@/game/threats'
import type { WeaponId } from '@/game/weapons'
/**
 * ─── Survivalist — the rules in one file ────────────────────────────────────
 *
 * A crowd runner. The player steers ONE thing (a squad of survivors that runs
 * forward on its own) and every other verb in the game is a consequence of
 * where that squad is pointed:
 *
 *   • hold the crowd's fire on a `+N` gate and N climbs, one per half second;
 *   • COMMIT to one leaf of a gate bank — the pillars between them are solid,
 *     and anyone who tries to take two gates at once dies on the divider;
 *   • shoot supply crates: one kind makes every survivor hit harder, the other
 *     makes everyone shoot faster — the ONLY way to raise fire rate in a run;
 *   • anything you failed to destroy kills whoever walks into it.
 *
 * The whole design pressure is one decision repeated: *keep shooting this, or
 * move now — and to WHICH side?* Everything below exists to make that decision
 * legible at a glance on a phone screen, which is why the numbers are small,
 * the lane is narrow, and nothing that matters ever happens off-screen.
 *
 * World space: `x` runs across the lane (−LANE_HALF … +LANE_HALF), `y` runs
 * FORWARD (up the screen). One world unit ≈ one survivor's shoulder width.
 */

// ─── The lane ───────────────────────────────────────────────────────────────

/** Half the playable width. Nine units across is the widest a thumb can sweep
 *  comfortably on a 320 px phone without the crowd feeling twitchy. */
export const LANE_HALF = 4.5

/** How far ahead of the crowd the camera looks. Portrait phones get most of
 *  their screen ABOVE the squad — you steer into what is coming, not into what
 *  you are standing on. */
export const CAMERA_LEAD = 5.4

/** World units visible vertically at the reference zoom. Wide screens letterbox
 *  the lane rather than zooming in, so a desktop player sees the same fight. */
export const VIEW_HEIGHT = 19

/**
 * Where the crowd sits on screen, as a fraction of the height from the top.
 *
 * Lives here rather than in the renderer because the SIMULATION needs it: gun
 * range is defined against the screen (see `BULLET_RANGE`), and a rule the
 * player reads off the picture has to be computed from the same number the
 * picture is drawn with.
 */
export const CROWD_SCREEN_Y = 0.72

// ─── The squad ──────────────────────────────────────────────────────────────

/**
 * Survivors at the start of stage 1 before any meta upgrades.
 *
 * ONE. It was three, on the argument that three reads as "a crowd" and is few
 * enough that the first gate feels enormous. The second half of that was right
 * and the first half was the mistake: three figures already read as a squad, so
 * the opening door turned a small crowd into a slightly larger one, and the
 * single loudest thing this game does — one person becoming a mob — was being
 * shown to a first-time player as a change of degree.
 *
 * From one, the opening door is the difference between a lone survivor and a
 * group. Every meta level is measured on top of this (`UPGRADES.squad`), so a
 * player who has bought anything at all starts above it and the change is felt
 * hardest by the person meeting the game for the first time, which is the
 * person it is for.
 *
 * ⚠ THIS IS STAGE 1's NUMBER, NOT EVERY STAGE'S — see `squadBaseAt`. Cutting
 * the floor everywhere was tried and measured: a career that reached stage 30
 * for a mid-skill player walled at ELEVEN. The opening is a dramatic beat and
 * can afford to start at nothing; a stage handed over at depth is a fight the
 * player has to be able to take, and three bodies is that floor.
 */
export const START_SQUAD = 1

/**
 * The floor every stage AFTER the first opens on, before meta levels.
 *
 * Three, which is what stage 1 used to start with and what the whole campaign
 * was balanced against. It is a separate number from `START_SQUAD` because the
 * two answer different questions: the first is "what does a stranger see in the
 * opening seconds", and this is "what is the smallest crowd a stage is winnable
 * from".
 */
export const STAGE_SQUAD_FLOOR = 3

/**
 * The base crowd a stage opens with, before meta levels.
 *
 * The discontinuity at stage 2 is deliberate and is the whole point: stage 1
 * exists to show one person becoming a mob, and every stage after it exists to
 * be played.
 */
export const squadBaseAt = (stage: number): number =>
  stage <= 1 ? START_SQUAD : STAGE_SQUAD_FLOOR

/**
 * Hard ceiling on simulated survivors.
 *
 * This is a HONESTY constraint before it is a performance one. A gate prints a
 * number; if the squad is at the cap, part of that number is silently thrown
 * away and the door has lied. The career simulation measured exactly how badly:
 * payouts landed at 92 % of face value by stage 12, 64–74 % by 18, and **53 %**
 * by stage 27 — and it was regressive, because the better the run the sooner it
 * hit the ceiling. The player who read the bank correctly was the one being
 * short-changed.
 *
 * 1 600 cleared the measured ceiling for a THIRTY-stage career. The campaign is
 * now endless, and 1 600 does not: summing the best `add` leaf of every bank,
 * a maxed-Squad player pins the cap on additive payouts alone by **stage 86**,
 * and a player with no shop at all by **stage 116**. Past that point every gate
 * on every stage silently short-changes them — the exact regression this
 * constant was raised to fix, arriving again, later.
 *
 * 4 000 buys roughly another sixty stages of honest doors. It cannot buy
 * infinity: the additive path grows without bound and any finite cap is
 * eventually a lie, which is why `gateAddBase` also flattens into a logarithm
 * past the authored campaign — the two together keep the promise legible for
 * far longer than any player will play.
 *
 * The crowd stopped reading as individuals somewhere around 150, so everything
 * past `MAX_DRAWN` is a number rather than a body — but it is a number the
 * player was promised, and the two hot loops that scale with it (foe bites,
 * obstacle contact) skip the whole crowd with one distance test when they are
 * nowhere near it.
 */
export const MAX_SQUAD = 4000

/** Ceiling on DRAWN survivors. Beyond this the extra bodies are invisible
 *  anyway (they are behind the front ranks) so we spend the frame elsewhere. */
export const MAX_DRAWN = 190

/** Body radius, world units. Formation packing and enemy contact both use it. */
export const UNIT_R = 0.3

/**
 * Widest the crowd ever gets, in world units of radius.
 *
 * ─── The load-bearing invariant of the whole game ───────────────────────────
 *
 * A crowd aimed at the CENTRE of a gate leaf must pass without losing anybody,
 * and a crowd aimed anywhere near the middle of the lane must hit the pillar.
 * Those two facts are what make a gate bank a decision rather than a tax, and
 * they reduce to one inequality:
 *
 *     CROWD_MAX_R + DIVIDER_HALF_W + UNIT_R  <  GATE_LEAF_X
 *              1.65 +          0.25 +    0.3  =  2.2   <  2.3   ✔
 *
 * It was violated on the first pass (crowd radius 1.9 → innermost survivor at
 * x = 0.4, inside the pillar's 0.55 kill zone), and the symptom was the worst
 * kind: a perfectly-played bank silently cost four survivors, with nothing on
 * screen to explain why. `tests/game/survivalSim.test.ts` asserts the
 * inequality directly so it can never drift back.
 */
export const CROWD_MAX_R = 1.65
/** The disc is squashed on Y so the crowd is wider than it is deep. */
export const CROWD_SQUASH = 0.72

/** Base forward speed, units/s. Stages speed up slightly so later runs feel
 *  more urgent without ever outrunning the player's reaction time. */
export const RUN_SPEED = 5.1
export const RUN_SPEED_PER_STAGE = 0.11
export const RUN_SPEED_MAX = 7.4

/** How hard the crowd's anchor chases the player's steer. High enough that the
 *  crowd feels welded to the thumb; low enough that it still has weight. */
export const STEER_SPRING = 13

/** Extra sensitivity on a drag: a 1 : 1 mapping means crossing the lane needs a
 *  full-screen sweep, which no thumb can do while also aiming. */
export const DRAG_GAIN = 1.35

// ─── Firepower ──────────────────────────────────────────────────────────────

/**
 * Damage per survivor, per shot, at upgrade level 0.
 *
 * Total DPS is `squad × damage × fireRate`, so squad size is quadratic-ish in
 * value once crates are counted — which is exactly why the gates have to be
 * fought for rather than walked through.
 */
export const BASE_DAMAGE = 1

/**
 * Shots per second, per shooter, at the start of a run.
 *
 * Deliberately SLOW — a bit over half what the game used to open with. Fire
 * rate is the one stat a run cannot start high, because it is the stat that
 * makes everything else feel good, so it is handed out during the stage by rate
 * crates (below) and, far more slowly, by the meta shop. A run therefore has an
 * arc: sluggish and dangerous at the start, a torrent by the boss, but only if
 * the player went out of their way for the crates.
 *
 * The floor is 1.9 rather than the 1.5 first tried, because below ~1.8 a
 * three-strong opening squad cannot break a single crate before walking into
 * it — measured, and it made stage 1 unwinnable from the first ten seconds.
 */
export const BASE_FIRE_RATE = 1.9

/** Hard ceiling on fire rate, so a crate-heavy run cannot outrun the bullet
 *  budget (or the audio throttle). */
export const MAX_FIRE_RATE = 6.5

/**
 * How many survivors actually emit a visible bullet.
 *
 * The whole squad's DPS is preserved — each round carries
 * `squad × damage / SHOOTERS` — but only the front rank spends particles and
 * draw calls on it. Two hundred individual tracers is neither readable nor
 * affordable on a phone; fourteen streams of fat tracers is both.
 */
export const SHOOTERS = 14

export const BULLET_SPEED = 21
export const BULLET_R = 0.16

/**
 * ─── How far the guns actually reach ────────────────────────────────────────
 *
 * Rounds used to run to `anchorY + 26`, which is roughly twice the road anybody
 * can see. The consequences were all invisible and all bad: barricades and
 * crates died before they finished sliding onto the screen, gates were pumped
 * from off-screen so the pump cost nothing to set up, and the answer to every
 * bank was "hold fire on the biggest number from the moment it appears".
 *
 * The guns now stop **15 % of the screen short of the top edge**. The crowd
 * sits at `CROWD_SCREEN_Y`, so the road it can see ahead is
 * `CROWD_SCREEN_Y × VIEW_HEIGHT` ≈ 13.7 units, and the last 15 % of the screen
 * — 2.85 units of it — is out of range. Everything up there arrives intact,
 * which is the point: obstacles get to be obstacles, and a gate has to be
 * approached before it can be pumped.
 *
 * Derived from the reference zoom rather than measured from the live viewport,
 * on purpose. Range is a RULE, and a rule that changed with the window size
 * would make the same stage a different game on a tablet.
 *
 * The boss is never out of reach: it holds `BOSS_HOLD_AHEAD` = 3.8 in front of
 * the crowd, well inside this, and the fight is asserted against this constant
 * in `tests/game/bossFight.test.ts`.
 */
export const BULLET_RANGE_SCREEN_MARGIN = 0.15
export const BULLET_RANGE = (CROWD_SCREEN_Y - BULLET_RANGE_SCREEN_MARGIN) * VIEW_HEIGHT

/**
 * …and the hard ceiling the Reach upgrade may buy up to.
 *
 * The top of the screen, exactly. The base range exists so that a player cannot
 * shoot what they have not properly seen; the upgrade walks that back to "you
 * can shoot everything you CAN see", and stops dead there. One unit further and
 * the game is back to deleting obstacles above the camera — the bug the range
 * rule was written to fix — except now it would arrive gradually, as a reward,
 * which is a far harder thing to notice in a playtest.
 *
 * Nominal +30 % at level 10 is 14.08 units against a 13.68-unit screen, so the
 * last level and a half of the track is bounded by the camera rather than by
 * the number. That is deliberate and it is the honest way round: the track's
 * promise is "shoot further, up to the whole screen", and the clamp is what
 * makes the second half of that sentence true.
 */
export const BULLET_RANGE_MAX = CROWD_SCREEN_Y * VIEW_HEIGHT

/** Extra reach per Reach level. Ten levels → the +30 % the track advertises. */
export const RANGE_PER_LEVEL = 0.03

/**
 * The range the simulation actually fires at.
 *
 * `bonus` is `rangeBonus` from the shop (0 … 0.30). Kept in `game/` rather than
 * in the composable so the pure simulation and its tests never have to reach
 * into Vue state to answer "how far does a bullet go".
 */
export const effectiveBulletRange = (bonus: number): number =>
  Math.min(BULLET_RANGE_MAX, BULLET_RANGE * (1 + Math.max(0, bonus)))

/** Backstop only — `BULLET_RANGE` is what actually ends a round's flight. Kept
 *  a comfortable margin above the worst case (a stationary crowd, so the round
 *  covers the range at its own speed: 10.8 / 21 ≈ 0.52 s). */
export const BULLET_LIFE_MS = 900

// ─── Gates ──────────────────────────────────────────────────────────────────

/** Sustained fire needed to add one to a `+N` gate. The headline mechanic. */
export const GATE_TICK_MS = 500

/**
 * ─── The scale doors pump too ───────────────────────────────────────────────
 *
 * `+N` and `-N` have always grown while the crowd fires at them. `xN` and `/N`
 * were fixed numbers, and that was the single biggest source of dead banks.
 *
 * A bank is only a decision if the player's own fire changes the answer. When a
 * door reads `x2` and will still read `x2` at the moment of crossing, there is
 * nothing to do about it but arrive — so a bank offering `+7 | +8` is not a
 * question, it is arithmetic with one right answer, and the player learns within
 * three stages that the game is asking them nothing.
 *
 * With the scale ops pumping, every door is an INVESTMENT and the crowd only has
 * one stream of fire to invest. Commit early to the `x2` and it is a `x3` by the
 * time you reach it. Straddle the pillar and you have pumped neither. And a `/N`
 * pumps in the direction that hurts — shooting a trap makes it worse, which is
 * what finally puts a price on not choosing.
 *
 * Deliberately a tenth per tick rather than a whole one: `x2 -> x3` across a
 * long approach is already a doubling of the door's worth, where `+8 -> +18` is
 * merely more of the same.
 */
export const GATE_SCALE_STEP = 0.1
/** A pumped `xN` tops out where the hand-authored ceiling always was. */
export const GATE_MUL_MAX = 3

/**
 * …and it OPENS below its headline, at four fifths of it: a `x2` door is a
 * `x1.6` until somebody shoots it.
 *
 * This is what makes a multiplier a decision rather than a gift. At a flat `x2`
 * the door is already worth more than the `+N` beside it for any crowd above
 * that `+N`, so the player takes it without thinking and the bank is dead in a
 * different way from `+7 | +8`. At `x1.6` against `+9` the crossover sits at
 * fifteen survivors — so at rest the multiplier is usually the WORSE deal, and
 * the only thing that turns it into the better one is the player having spent
 * their fire on it instead of on the door opposite.
 *
 * The headline still ranks the doors: a `x3` opens at 2.4 and a `x2` at 1.6, so
 * the big one is still visibly the big one. It just has to be earned.
 */
export const GATE_MUL_OPEN_SCALE = 0.8

/** The value a `xN` door opens at, given the headline the author asked for. */
export const gateMulOpen = (headline: number): number =>
  Math.round(headline * GATE_MUL_OPEN_SCALE * 10) / 10
/** …and a pumped `/N` bottoms out at the harshest trap in the game. */
export const GATE_DIV_MAX = 5

/**
 * The ceiling a door of this op can be pumped to.
 *
 * ONE definition, because there used to be two and they disagreed. The pump in
 * `stepGates` knew that `xN` and `/N` had ceilings; the bullet that marks a gate
 * hot still only recognised `+N` and `-N`, so a multiplier was never flagged as
 * being shot at and the pump it was entitled to never ran. The doors shipped
 * frozen at `x1.6` — the worse half of a deal whose better half was unreachable.
 *
 * Anything that needs to ask "can this door still grow?" asks here.
 */
export const gatePumpCap = (op: GateOp): number =>
  op === 'sub' ? GATE_SUB_MAX
    : op === 'mul' ? GATE_MUL_MAX
      : op === 'div' ? GATE_DIV_MAX
        : GATE_MAX_VALUE

/** True for the ops whose value moves in tenths rather than whole numbers. */
export const isScaleOp = (op: GateOp): boolean => op === 'mul' || op === 'div'

/**
 * ─── The pump has to keep up with the doors ─────────────────────────────────
 *
 * A `+1` per half-second was the whole skill of the game for thirty stages and
 * then quietly stopped being anything at all. The reason is arithmetic: a door
 * prints `gateAddBase(stage)`, which is 12 at stage 10 and 34 at stage 46,
 * while the pump keeps paying the same +1 a tick into a ~2 s in-range approach.
 * That is a third of the door at stage 10 and a ninth of it at 46 — so the one
 * mechanic that turns a bank into a decision fades out exactly as the banks get
 * big enough to matter, and a late-game player is back to reading two numbers
 * and walking at the larger one.
 *
 * Both halves of the fix are keyed to the same 15-stage band:
 *
 *   • the STEP grows by 0.9 per band (`GATE_GROWTH_TRIM`), floored to a whole
 *     survivor, so `+/-` doors move by 1, 2, 3, 4 … (stage 50 pumps `+4`, and a
 *     `-N` beside it pumps `-4` — the two are one mechanic with a sign, and an
 *     asymmetric step would make the mirror a lie);
 *   • the TICK shortens, so the same approach buys more ticks of it.
 *
 * At stage 46 that takes a full approach from `+4` on a printed `+34` to about
 * `+14` — still over a third of the door, which is what the mechanic was worth
 * when it was still teaching people to commit early.
 */
export const GATE_PUMP_BAND = 15

/**
 * ─── Every step up a door takes is a tenth smaller ──────────────────────────
 *
 * Applied to the two ways a `+N` door grows with depth: its printed value from
 * one stage to the next (`gateAddBase`) and the pump's `+N` per tick (below).
 * Played at stage 40, a door printed 33 and pumped `+3` a tick, which paid 40–50
 * before the Squad track added its share; past stage 60 the doors carried the
 * crowd most of the way to `MAX_SQUAD` on their own.
 *
 * The SLOPE is trimmed, not the value, and only from stage 15 on. Stages 1–14
 * are the band the onboarding and retention studies were tuned on, and they
 * keep every door they had.
 */
export const GATE_GROWTH_TRIM = 0.9

/**
 * Whole survivors a `+N` / `-N` door moves per tick at this stage.
 *
 * The step climbs `GATE_GROWTH_TRIM` a band instead of a whole survivor, so it
 * rises at stages 17, 34, 50, 67 … rather than 15, 30, 45, 60 …: stage 60 pumps
 * `+4` where it pumped `+5`. The clock (`gateTickMs`) still turns on the plain
 * band — it is how OFTEN a door grows, not by how much.
 */
export const gatePumpStep = (stage: number): number =>
  1 + Math.floor(Math.max(0, stage) * GATE_GROWTH_TRIM / GATE_PUMP_BAND)

/** How much of the tick a band shaves off an additive door… */
export const GATE_TICK_DECAY = 0.05
/**
 * …and off a scale door, which gets a little more.
 *
 * `xN` and `/N` do NOT get the bigger step — a multiplier that climbed in
 * whole numbers would be a `+N` in disguise, and `GATE_MUL_MAX` is 3 — so the
 * only lever they have is the clock, and it is turned up to compensate.
 */
export const GATE_SCALE_TICK_DECAY = 0.06

/**
 * Floor under the tick.
 *
 * The decay is MULTIPLICATIVE rather than `1 - 0.05 × bands` for one reason
 * that is not about feel: this game has no last stage. A linear cut reaches
 * zero at stage 300, and a zero tick is an infinite loop in `stepGates`'
 * `while`. Compounding can only approach the floor, and the floor is here
 * anyway so that nothing downstream ever divides by a very small number.
 */
export const GATE_TICK_MIN_MS = 120

/** The pump interval for a door of this op, at this stage. */
export const gateTickMs = (op: GateOp, stage: number): number => {
  const bands = Math.floor(Math.max(0, stage) / GATE_PUMP_BAND)
  const decay = isScaleOp(op) ? GATE_SCALE_TICK_DECAY : GATE_TICK_DECAY
  return Math.max(GATE_TICK_MIN_MS, Math.round(GATE_TICK_MS * (1 - decay) ** bands))
}

/**
 * A gate's number, printed.
 *
 * One decimal only while it is actually fractional: `x2` reads as `x2`, and
 * `x2.4` reads as `x2.4`. A door that said `x2.0` before anyone had shot it
 * would look like a bug.
 */
export const gateValueLabel = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1)

/**
 * A gate stops climbing here so a player who parks on one cannot break the
 * economy — and so the number always fits its frame.
 *
 * Was 99, which was fine for thirty stages and a hard break past them: once
 * `gateAddBase` passes ~91 every `add` leaf clamps to the same 99, and
 * `legalise` rule 4 — which separates two identical doors by GROWING one —
 * cannot separate them any more. Measured on the endless road, the first bank
 * printing two identical doors appears at **stage 161**, and several per stage
 * beyond it. That is the core invariant of the whole game ("no two doors are
 * ever worth the same") failing silently, and it turns the pillar between them
 * into a pure punishment for existing.
 */
export const GATE_MAX_VALUE = 999

/**
 * Half-width of one gate leaf.
 *
 * `CROWD_MAX_R` (1.9) < `GATE_LEAF_HALF` (2.05), so a properly-aimed crowd
 * passes cleanly and a sloppy one loses whoever is over the divider.
 */
export const GATE_LEAF_HALF = 2.05

/** Centre of each leaf in a two-leaf bank. */
export const GATE_LEAF_X = 2.3

/** Half-width of the solid pillar between two leaves. Anything that touches it
 *  dies — this is what makes the choice a commitment rather than a preference.
 *  Declared here because the three-leaf geometry below is derived from it. */
export const DIVIDER_HALF_W = 0.25
/** Vertical thickness of the divider, matched to the gate band. */
export const DIVIDER_H = 1.1

/**
 * ─── Three-leaf banks ───────────────────────────────────────────────────────
 *
 * The same lane, cut into three doors and two pillars. Three leaves is a real
 * decision rather than a coin flip: the player has to rank three offers against
 * the crowd they are carrying, in the second and a half before they arrive.
 *
 * The arithmetic: 9 units of lane, minus two 0.5-wide pillars, leaves 8.0 for
 * three doors — 2.66 WIDE each, so `halfW = 1.33`, the pillars sit at ±1.58 and
 * the outer doors are centred at ±(1.58 + 0.25 + 1.33) = ±3.16.
 *
 * ⚠ That last number was 2.66 — the door's WIDTH written into the slot that
 * holds its CENTRE. It is worth spelling out what that cost, because both
 * symptoms read as art bugs and neither points at this constant:
 *
 *   • The doors tiled the lane from x = 0 outward instead of filling it, so
 *     the outer leaf spanned [1.33, 3.99] — starting exactly where the middle
 *     leaf ended, with no pillar gap between them and 0.51 units of lane left
 *     unused at each rail. The three painted frames butted together and their
 *     posts overlapped: each frame paints a post ~0.75 units in from its own
 *     edge, so the middle door's right post landed at [1.24, 1.58] and the
 *     right door's left post at [1.08, 1.42] — two posts, offset, doubled.
 *   • The divider pillar [1.33, 1.83] then sat INSIDE the outer door rather
 *     than in a gap between doors, which is why it read as a hazard post
 *     standing in a doorway.
 *   • And the real damage: a pillar reaches `DIVIDER_HALF_W + UNIT_R` into its
 *     neighbours, so the outer door's usable strip was [2.13, 3.99] — 1.86
 *     wide, exactly `2 * funnelRadius(1.33)`. A safe aiming band of ZERO width,
 *     with the painted centre 0.4 units outside it. Aiming at the outer door of
 *     a three-leaf bank exactly where it is drawn always clipped the pillar.
 *
 * At 3.16 the doors tile the whole lane, each frame's post hides under the
 * pillar the way a two-leaf bank's pair does, and the safe band is [3.06, 3.56]
 * — 0.50 wide, the same as the two-leaf bank's [2.20, 2.70], with the painted
 * centre inside it.
 *
 * A full-size crowd (radius 1.65) does NOT fit through a 1.33 door — which is
 * why the formation funnels (see `funnelRadius`). A crowd squeezing through a
 * narrow doorway and spilling out the other side is what a crowd does, and it
 * is what makes three-leaf banks feel different from two-leaf ones without
 * needing a single extra rule.
 */
export const GATE3_LEAF_HALF = 1.33
export const GATE3_DIVIDER_X = 1.58
/** Centre of each OUTER leaf. Derived, never typed: the door starts where the
 *  pillar ends, so this is pillar centre + pillar half + door half. */
export const GATE3_LEAF_X = GATE3_DIVIDER_X + DIVIDER_HALF_W + GATE3_LEAF_HALF

/** Vertical thickness of the gate's trigger band. */
export const GATE_DEPTH = 0.34

/**
 * How wide the crowd may be to pass cleanly through a door of `halfW`.
 *
 * The formation eases down to this as it approaches a bank and springs back
 * afterwards, so a crowd of two hundred funnels through a 2.66-wide door and
 * spills out the far side instead of leaving a third of itself on the pillars.
 * It is the one rule that lets leaf count be a design choice rather than a
 * geometry problem.
 */
export const funnelRadius = (halfW: number): number =>
  Math.max(0.45, Math.min(CROWD_MAX_R, halfW - UNIT_R - 0.1))

/**
 * How much steering room the crowd keeps when it squeezes into a passage.
 *
 * Fitting the corridor EXACTLY is not fitting it: a corridor beside the rib is
 * 3.65 wide, a full-size crowd is 3.3, and the 0.35 left over is a band the
 * player has to hold to a fifth of a unit — against stone that kills the whole
 * column, which is precisely the slack the lethal-contact work measured as
 * unholdable. Squeezing 0.4 further turns it into a ±0.4 window, which is the
 * same order of room a gate leaf gives, and it reads as the crowd bunching to
 * get through a gap rather than as a crowd being shaved by one.
 */
export const PASSAGE_FIT_MARGIN = 0.4

/** How far ahead of a bank the crowd starts squeezing. Long enough to read as
 *  anticipation, short enough that the crowd is only ever narrow when it needs
 *  to be. */
export const FUNNEL_LEAD = 6

// ─── Crates, barricades, foes ───────────────────────────────────────────────

/** Damage granted to EVERY survivor when a damage crate is broken. */
export const CRATE_DAMAGE_GAIN = 1
/**
 * Fire rate (shots/s) granted to EVERY survivor when a rate crate is broken.
 *
 * Sized so that collecting both of a stage's guaranteed rate crates is worth
 * roughly +58 % DPS on top of the base — enough that the detour is obviously
 * correct, small enough that missing one is a setback rather than a run-ender.
 */
export const CRATE_RATE_GAIN = 0.55
export const CRATE_R = 0.62

/**
 * ─── The coin magnet is bought, not given ───────────────────────────────────
 *
 * Collection radius on top of the crowd's own. Deliberately small: the lane is
 * nine units wide, so a magnet of three-and-a-half units — which is what
 * shipped first — reaches most of the road from anywhere on it. Every coin was
 * collected regardless of where the player stood, and the curved trails the
 * generator lays down (`coinTrail`) were decoration on a decision nobody made.
 *
 * At 0.55 the crowd has to actually drive over the trail. `coinMagnetBonus` in
 * `useUpgrades` is what the Scavenging track sells on top, up to +3.4 at max —
 * at which point sweeping a whole trail in one pass is exactly the fantasy that
 * track is supposed to be selling, and the player earned it.
 */
export const COIN_MAGNET_BASE = 0.55

/** How far past the collection radius the pull field reaches. A coin that is
 *  going to be taken should visibly leap at the crowd first. */
export const COIN_PULL_LEAD = 1.4

/**
 * Coins dropped by a barricade block that gets shot down.
 *
 * A wall used to be pure cost: it stood in the road, it took real DPS to
 * remove, and removing it paid nothing — so the correct play was always to
 * drive around it and the guns were better aimed anywhere else. A small drop
 * turns it into a genuine question ("is the detour cheaper than the ammo?")
 * rather than a rhetorical one.
 */
export const BARRICADE_COIN_MIN = 2
export const BARRICADE_COIN_MAX = 4

/**
 * Loose coins a dead monster scatters, per point of its kill bounty.
 *
 * Monsters always paid a bounty; the problem was that the bounty is INVISIBLE —
 * it lands in a counter behind the HUD — so a pack read as pure cost: rounds
 * spent, survivors bitten, nothing on screen to show for it. Killing things is
 * the second verb this game has and it was the only one with no feedback.
 *
 * A drop fixes the feel and, more usefully, gives the fight a POSITION: loose
 * coins must be driven over, so the pack in your lane pays and the pack you
 * steered around does not. It also gives the Scavenging track a customer it
 * never had — a player who fights rather than routes.
 */
export const FOE_COIN_DROP_PER_BOUNTY = 1.5
/** An elite drops a real pile — it is the landmark of the stage, and the one
 *  body worth crossing the lane for. */
export const FOE_COIN_DROP_ELITE = 14

/**
 * End-boss health before per-stage scaling.
 *
 * Derived from the DPS a stage actually produces, measured with the balance
 * harness rather than guessed: a player who works the gates and takes both rate
 * crates arrives at the stage-1 boss with roughly 40 survivors × 3 damage × 3
 * shots/s ≈ 360 DPS, and the fight should last five to eight seconds — long
 * enough for two or three slams to matter, short enough that a good run never
 * grinds.
 *
 * It came down twice. First from 2600, when the base fire rate was more than
 * halved. Then from 1900 to 850, when the balance harness measured what a run
 * ACTUALLY arrives with: the benchmark player's DPS at the boss is flat across
 * stages 1–4 (234 / 262 / 194 / 196) while the boss was growing 90 %, so real
 * time-to-kill was 7.9 / 9.6 / 15.6 / 18.6 s against a 5–8 s target and no
 * player short of instant reactions could finish one at all.
 *
 * The growth now lives in `bossHpScale`'s slope instead, where it can be tuned
 * against the stage rather than against the first stage.
 *
 * Then back up from 850 to 1000, because making crates affordable (see
 * `crateHp`) raised the benchmark run's DPS at the boss from 234 to 277–485 and
 * the climax collapsed to 2.4 s. At 1000 a perfect run gets a 3.5–4.5 s finish
 * and a run that skipped the crates gets a real fight — which is the spread the
 * whole crate detour is supposed to buy.
 *
 * `track.ts` imports this to size minibosses against it, so there is exactly
 * one number.
 */
export const BOSS_BASE_HP = 1000

/**
 * ─── The boss has to get its swings in ──────────────────────────────────────
 *
 * Measured, across three seeds of every scripted policy: from stage 8 onward
 * the end boss died before it threw a single slam. The climax of every stage in
 * the back half of the campaign was a body falling over. A fight the player
 * cannot lose is not a fight, and a fight the player cannot SEE is not even a
 * spectacle.
 *
 * Two rules fix it, and they are deliberately opposite in who they punish:
 *
 *   GUARD — at two-thirds and one-third health the boss plants and becomes
 *           untouchable until it has thrown its next slam. A player with
 *           overwhelming DPS can no longer skip the fight; they get exactly
 *           three swings to dodge instead of zero. It costs an under-built
 *           player nothing, because they were never going to reach the gate
 *           quickly anyway.
 *   RAGE  — every slam it lands makes the next one arrive sooner and reach
 *           further, down to `SLAM_CD_MIN`. A fast kill never sees this. A
 *           twenty-second fight becomes a gauntlet that a squad which arrived
 *           too small genuinely loses.
 *
 * Together they turn "not enough damage" from *slow* into *fatal*, which is the
 * check this genre is missing when the crowd is the only currency.
 */
/**
 * The pillar's cost, split into the two things it was doing at once.
 *
 * `grindAgainst` opens a new contact at `bite` kills and then accrues
 * `max(floor, squad x rate)` per second. Those are different jobs and they were
 * the same number, which is why the first attempt at softening the early pillar
 * did nothing measurable:
 *
 *   BITE  is the LESSON. Touching a pillar costs a survivor, immediately and
 *         visibly, at every stage. That is what makes a bank a commitment, and
 *         it is what fires the "never touch the pillar" hint. It never softens.
 *   FLOOR is the SPIRAL. It is what a crowd pays per second for SITTING on the
 *         pillar, and at 1 it guarantees a body a second no matter how low the
 *         proportional rate goes — which is the whole of what kills a player
 *         who has not yet learned to steer.
 *
 * The distinction matters because of the geometry: a two-leaf bank puts its
 * doors at +/-`GATE_LEAF_X` and its pillar at x = 0, which is exactly where the
 * crowd sits when nobody steers it. THE DEFAULT STATE OF THE GAME IS AIMED AT
 * THE ONE OBJECT THAT KILLS FASTEST. Measured across the opening stages, a run
 * that never steers lost three survivors at EVERY bank and was dead 44 seconds
 * in; a run that steers loses none, because it never touches the thing. The
 * mechanic was all-or-nothing and it landed on the one skill a brand-new player
 * has not acquired.
 *
 * So the bite stays and the spiral ramps. A learner is charged for the mistake
 * once per bank instead of once per second, and by stage 5 the pillar is the
 * full grind again. None of this changes anything for a player who steers.
 */
export interface CrushRamp { rate: number; floor: number; bite: number }

export const DIVIDER_GRIND_FULL = 0.35

export const dividerCrushFor = (stage: number): CrushRamp => ({
  rate: Math.min(DIVIDER_GRIND_FULL, 0.1 + Math.max(0, stage - 2) * 0.09),
  floor: Math.min(1, 0.2 + Math.max(0, stage - 2) * 0.27),
  // Never softened: one body, every time, at every stage.
  bite: 1
})

/**
 * ─── The first five stages are a different game ─────────────────────────────
 *
 * Everything below is one policy with one purpose: a first-time player must not
 * lose a run before they have decided whether they like the game. Playtesting
 * kept producing the same two exits — a hard boss, and dying to scenery — and
 * both happen in the opening minute, which is the minute the whole funnel
 * depends on.
 *
 * It is written as a set of curves in ONE place rather than as edits spread
 * through the authored stages, because the stages are hand-shaped and would
 * fight any change made stage by stage: `stageOne` says what beats the road has,
 * and these say what those beats cost a beginner. A balance pass on the game
 * proper moves the authored numbers; a balance pass on ONBOARDING moves these.
 *
 * Most of them return 1 from stage 6 on, so the game the player eventually
 * arrives at is untouched. The three that do not — the pack, the crate and the
 * elite — hold a last thin slice of relief over stage 6 and let go on 7, for
 * the reason in the next block.
 *
 * ─── …and the way OUT of it is a curve too ──────────────────────────────────
 *
 * The relief used to be two steps (stages 1-3, then 4-5) that both snapped shut
 * at once. A player reported a hard jump at 3 -> 4 and another at 5 -> 6, and
 * adding up what is standing on each built road says the same thing
 * (`tests/sim/scratch.ramp.test.ts` prints the table):
 *
 *   3 -> 4   total foe health on the road x3.14, and the first boulder and
 *            barricade in the game land on that road.
 *   5 -> 6   foe health x2.48, crate health x2.71, elite health x4.14 — the
 *            second elite starts here — and the first passage.
 *
 * Every neighbouring jump is x1.0-1.6, so those two are where the difficulty
 * actually lives, and not in the authored beats: the roads themselves grow
 * smoothly, and it is the relief coming off in two big handfuls that makes the
 * step. So it comes off in small ones instead, over 4, 5 and (for the three
 * heaviest) 6. That brings the road load — foes plus elites — from x2.18 to
 * x1.85 across 3 -> 4 and from x3.07 to x2.80 across 5 -> 6.
 *
 * What is left in those two numbers is CONTENT rather than tuning: the first
 * scenery that can kill arrives on stage 4, and stage 6 is the first road with
 * a second elite and a passage on it. Softening those means moving a beat, not
 * turning a dial, so they are deliberately left where the design put them.
 */

/** Below this, the road carries no boulders and no barricades at all. */
export const HARD_OBSTACLE_FROM_STAGE = 4

/**
 * What fraction of the rocks and barricades a stage keeps.
 *
 * NONE for the first three: a boulder cannot be shot, so meeting one before the
 * player can reliably steer is a death with nothing to learn from. Half on 4-5,
 * which is where they are introduced properly. The gate pillar is deliberately
 * NOT covered — it is part of how a bank works, not scenery, and it has its own
 * (already gentler) early curve in `dividerCrushFor`.
 *
 * It stops at 5 and is deliberately NOT tapered across 6, even though stage 6
 * looks like the worst scenery jump in the game (5 blocks to 21). Measured, all
 * twenty-one of stage 6's blocks are the ribs of ONE passage — the beat
 * `PASSAGE_STAGE` introduces there — and a passage with half its ribs missing
 * is not a gentler passage, it is a corridor with a hole in it. That jump is a
 * new IDEA arriving, which is what stage 6 is for; the health and density
 * curves below are what carry the softening instead.
 */
export const earlyObstacleKeep = (stage: number): number =>
  stage < HARD_OBSTACLE_FROM_STAGE ? 0 : stage <= 5 ? 0.5 : 1

/**
 * Ordinary foes are softer while the player is learning to shoot them.
 *
 * Stages 1 and 2 are the two the relief was too generous on — they play as
 * having no resistance at all, which is a tutorial that teaches nothing about
 * the verb it exists to teach. Both are 15 % tougher than they were (0.6 ->
 * 0.69, 0.7 -> 0.805): enough that a body takes a beat to kill, far short of
 * anything that can end a first session. Their elite and their boss are NOT in
 * this, and on purpose: `bossHpScale` does not move until stage 5, so both are
 * flat across 2-4 and lifting stage 2 alone would leave stage 3's boss weaker
 * than the one before it.
 *
 * Stage 2 therefore carries LESS relief than stage 3, which is not a typo: the
 * stage-3 road has fewer bodies on it than the stage-2 road, so the two land on
 * near-identical total health (69 against 68) and the ramp stays flat across a
 * stage whose new idea is the hound's SPEED rather than its health.
 *
 * Stage 4 then takes a step instead of the whole staircase. The old curve went
 * 0.7 -> 1 there, and stage 4's authored road already more than doubles the
 * bodies on it (4 -> 9), so the two together tripled the health a player met
 * between one stage and the next — the jump that got reported. Stage 5 is left
 * at full price on purpose: it was never the stage anybody complained about,
 * and discounting it would only move the cliff to 5 -> 6.
 *
 * ─── …and stage 1 pays full price, which is not the inversion it looks like ─
 *
 * 0.69 -> 1. Stage 1's discount was buying nothing, and the reason is
 * `earlyPackCap`: stage 1 shows ONE body at a time, so the entire monster
 * budget of the stage is a single creep, and the discount was worth exactly
 * 2 hp on it (6 against 8). Measured through `tests/game/tutorialPump.test.ts`,
 * no policy — not even `careless` — lost a single survivor to a monster on
 * stage 1 either side of the change; the creep dies in a tenth of a second at
 * both prices because the crowd meets it 13-20 strong out of the pumped opening
 * door (`OPENING_PUMP_CAP`).
 *
 * So this is a correctness fix rather than a difficulty one: a stage whose road
 * hands out a `+10` before its first monster has no business ALSO holding a
 * health discount, and leaving one there is a knob that reads as tuned when it
 * is inert. Stage 2 keeps its 0.805, because stage 2 fields two husks at once
 * and no pumped opener — there the number still does something.
 */
export const earlyFoeHpMul = (stage: number): number =>
  stage <= 1 ? 1 : stage <= 2 ? 0.805 : stage <= 3 ? 0.7 : stage <= 4 ? 0.8 : 1

/** …and there are fewer of them per pack. A hard cap, not a scale: stage 1
 *  shows ONE monster at a time so the verb is unmistakable. */
export const earlyPackCap = (stage: number): number =>
  stage <= 1 ? 1 : stage <= 3 ? 2 : Number.POSITIVE_INFINITY

/** Stages 4-6 keep real packs, thinned — hardest on 4, where the roster and the
 *  road both step up at once, and nearly gone by 6. */
export const earlyPackMul = (stage: number): number =>
  stage < HARD_OBSTACLE_FROM_STAGE ? 1
    : stage <= 4 ? 0.5 : stage <= 5 ? 0.6 : stage <= 6 ? 0.8 : 1

/**
 * Crates come apart in well under half the shots.
 *
 * A pickup that kills you is the worst object in the game: it is the one thing
 * the road actively invites you to drive into. Rolled HP only — a row with an
 * authored `fixedHp` (stage 1's teaching wall pinned at 1, `SECOND_PICKUP_HP`
 * at 4) is already priced for exactly this and is left alone.
 *
 * Stage 1 is out of it, for the same reason it is out of `earlyFoeHpMul`: the
 * discount there was protecting a squad of six that no longer exists. Only two
 * boxes on the whole road are rolled — the detour crate at y = 70 and the rate
 * crate at y = 87 — and at 0.6 they were 4 and 5 hp against a crowd that
 * arrives 26 strong at ~110 dps out of the pumped opening door. Full price
 * makes them 7 and 9, which is still under a tenth of a second of fire and
 * measured (`tests/game/tutorialPump.test.ts`) costs no policy a survivor; what
 * it buys is that ploughing one now takes a visible beat instead of none. The
 * boxes the beginner cannot afford to lose are the two AUTHORED ones, and they
 * are untouched.
 */
export const earlyCrateHpMul = (stage: number): number =>
  stage <= 1 ? 1 : stage <= 5 ? 0.6 : stage <= 6 ? 0.8 : 1

/** Stage 6 is the first road with TWO elites on it (`placeMinibosses`), which
 *  is a x2 nobody can tune away — so the last 10 % of the health discount is
 *  spent there rather than on stage 5. */
export const earlyMinibossHpMul = (stage: number): number =>
  stage <= 3 ? 0.7 : stage <= 5 ? 0.8 : stage <= 6 ? 0.9 : 1

/**
 * The boss's own onboarding discount used to live here, as
 * `earlyBossHpMul` — 0.6 on stages 1-3, 0.8 on 4-5, against an authored bar.
 *
 * It is gone rather than retuned. A flat discount is the right shape only if
 * every player arrives at the door with roughly the same firepower, and measured
 * they do not: the spread between a run that reads the road and one that barely
 * steers is 65x on stage 5. A single multiplier can be a climax for one of them
 * or the other, never both, which is why the same number produced a boss that
 * melted for the good player and one that was unkillable for the bad one.
 *
 * Stages 1-5 now price the boss against the run instead — see
 * `game/adaptive.ts`. Everything else in this block still applies: the road's
 * relief is about the ROAD, and it is untouched.
 */

/**
 * How hard a boss's slam and an elite's sweep hit in the opening stages.
 *
 * The health cuts shorten those fights; this one makes losing them survivable.
 * A first-timer who cannot dodge yet should come out of a boss fight with a
 * squad, not with a result screen — the fight is where they learn what the
 * telegraph meant, and they have to live long enough to use it.
 *
 * It steps rather than snaps for the same reason as the rest: a slam that goes
 * from 60 % to full between two consecutive stages is a 67 % rise in the single
 * biggest hit in the game, landing on the same road that introduces the first
 * boulder. Stages 4-5 pay 80 % of it and stage 6 pays the lot.
 */
export const earlyBigHitMul = (stage: number): number =>
  stage <= 3 ? 0.6 : stage <= 5 ? 0.8 : 1

export const BOSS_GUARD_GATES = [0.66, 0.33] as const

/** Stage 1 gets ONE, at half health. See `bossGuardGates`. */
export const TUTORIAL_GUARD_GATES = [0.5] as const

/**
 * Which guard phases a stage's boss owes the player.
 *
 * A guard gate is a FLOOR on how long the climax lasts: the boss plants, goes
 * immune to gunfire, and swings. Stage 1 gets one, and the number was measured
 * rather than chosen.
 *
 * With the usual TWO, a first-time squad of seventeen finished the fight at
 * seven — the phases are where the slams come from, and losing 60 % of the crowd
 * is not the note to end a tutorial on. With NONE, the floor went with them: a
 * player who had collected the road's crates deleted the boss in 0.6 s, which is
 * not a climax, it is a speed bump. The level still ended on nothing much.
 *
 * One gate keeps the shape — wind-up, swing, finish — for every squad size,
 * whether they arrive with 30 DPS or 180. Paired with `TUTORIAL_SLAM_FRACTION`
 * the swing costs a body or two instead of most of the run, so the phase reads
 * as the thing to learn rather than the thing that took the level off you.
 */
export const bossGuardGates = (stage: number): readonly number[] =>
  stage <= 1 ? TUTORIAL_GUARD_GATES : BOSS_GUARD_GATES

/**
 * The share of the crowd one slam takes on stage 1.
 *
 * A token, against `SLAM_MAX_FRACTION`'s 31 %. The tutorial boss still winds up
 * and still swings, because that is the shape the player has to recognise on
 * stage 2 — but the first time they meet it, it costs them a couple of bodies
 * and a fright rather than most of their run.
 */
export const TUTORIAL_SLAM_FRACTION = 0.08
/** …and it may never be the swing that ends a tutorial run. */
export const TUTORIAL_SLAM_MIN_KILL = 1
/**
 * Slam footprint at the first swing. MUST stay well under the crowd's own
 * radius — at 2.9 the ring covered the entire squad and every connected slam
 * was a total wipe. It grows from here, one swing at a time.
 */
export const SLAM_RADIUS = 1.75
export const SLAM_CD_BASE = 2.4
export const SLAM_CD_MIN = 0.95
export const SLAM_CD_DECAY = 0.17
export const SLAM_RADIUS_GROWTH = 0.07
export const SLAM_RADIUS_MAX = 2.55

/** A barricade block is pure HP standing in the lane. Touching a live one is
 *  fatal, so they are a "shoot it or dodge it" question with a real answer. */
export const BARRICADE_W = 1.5
export const BARRICADE_H = 1.0

/**
 * ─── …and the thing you cannot shoot ────────────────────────────────────────
 *
 * Every solid object in the game had an HP bar, which meant every routing
 * problem had a second, lazier answer: point at it and hold. A player with
 * enough DPS never had to steer, and DPS is the stat the whole run is built to
 * grow — so the road got EASIER to navigate exactly as the crowd got bigger.
 *
 * A boulder has no number. It eats rounds and does not care, it kills what
 * walks into it, and the only answer it accepts is the one control the game
 * actually has. It is what keeps steering a skill at stage 25.
 *
 * Deliberately narrow: this is a slalom, not a wall. `nudgeClearRocks` in the
 * generator guarantees a gap the crowd fits through at full size, so a boulder
 * field is always passable and never a coin-flip — the difficulty is holding a
 * line through it while something else is happening, not discovering whether
 * there was a line at all.
 */
export const ROCK_W = 1.35
export const ROCK_H = 1.15
/*
 * A boulder used to bill a SHARE OF THE SQUAD PER SECOND of contact, and the
 * number was fought over twice: 0.28 walled a competent player at stage 6 on
 * every purchasing strategy, 0.12 was where the career study came to rest.
 *
 * Both are gone, along with every other obstacle's rate. Contact is binary now
 * — whoever touches a solid thing dies, and the rest of the swarm runs past it
 * (`crushAgainst`). The reasoning that produced those numbers survives the
 * change unaltered, because it was never really about the rate: a wall bills
 * you once and is gone, and a rank of boulders bills you for as long as you are
 * threading it, twice, because the second rank's gap is offset. Under the new
 * rule that difference is expressed by GEOMETRY — two ranks means two chances
 * to put part of the crowd on a stone — instead of by a hand-set per-second
 * price, which is the honest place for it.
 */

/** Contact radius at which a foe starts eating survivors. */
export const FOE_REACH = 0.72

/**
 * ─── A miniboss holds the line ──────────────────────────────────────────────
 *
 * It used to WALK, slowly, in the belief that slow meant "a wall to shoot down
 * rather than an ambush". Measured, it meant neither: at stage speed the crowd
 * and the elite close on each other at ~4 units a second, so the entire fight
 * was three seconds long, and a squad that could not finish it in three seconds
 * simply watched the elite stroll through them and out the back of the lane.
 * Across stages 2–10 a competent player killed **none** of them — every one
 * survived the pass, at 22–99 % health, and despawned behind the crowd. That is
 * the definition of the complaint it drew: an obstacle, not a fight.
 *
 * So it holds. Once it reaches its post it tracks the crowd's advance and stays
 * `ELITE_HOLD_AHEAD` in front, exactly as the end boss does, and the fight lasts
 * as long as the fight lasts. It cannot be walked past, which is the whole
 * point of putting a landmark on the road.
 *
 * The distance is deliberately inside biting range of the crowd's LEADING EDGE
 * and nowhere near its middle: a big crowd exposes more front-liners than a
 * small one, so the elite's teeth scale with the squad it is facing without a
 * single extra number.
 */
export const ELITE_HOLD_AHEAD = 2.4

/**
 * ─── An elite slows the road; it does not switch it off ─────────────────────
 *
 * A holding elite used to CLAMP the crowd: `anchorY` was pinned and the run
 * stopped dead until the thing died or the leash expired. It is bounded — the
 * hold breaks after `ELITE_HOLD_MAX` — so it was never a soft-lock, and on a
 * competent run it is over in under a second. That is not who complains.
 *
 * Measured on the runs that struggle, the crowd is frozen for THREE AND A HALF
 * to SEVEN SECONDS while being chewed for twelve to thirty-eight survivors. In
 * a genre whose entire promise is forward motion, a runner that stops moving
 * does not read as a fight — it reads as a broken game, and the player spends
 * those seconds steering left and right to no effect, which is the exact input
 * that normally does something. They are not failing a challenge; they think
 * the game has hung.
 *
 * So the elite drags instead of blocking. From `ELITE_DRAG_LEAD` out the road
 * winds down toward a crawl and stays there: progress is always visible, the
 * approach takes long enough to be the shooting window the fight wants, and a
 * squad too weak to kill it squeezes past paying in bodies rather than being
 * pinned and billed anyway. The wall survives only as a floor at the elite's
 * own body (`ELITE_BLOCK_AHEAD`), which the leash almost always outlives — so
 * in practice the crowd never fully stops at all.
 */
export const ELITE_DRAG_LEAD = 6
/** The slowest the road ever runs: a crawl, deliberately never zero. */
export const ELITE_DRAG_MIN = 0.15
/** …and the one place the crowd is genuinely blocked: the elite's own body. */
export const ELITE_BLOCK_AHEAD = 1.3

/**
 * Speed multiplier for a crowd `gap` units short of a holding elite.
 *
 * 1 well clear of it, easing to `ELITE_DRAG_MIN` at the block line. Squared so
 * the wind-down is gentle at first and firm at the end — a linear ramp reads as
 * the game getting sluggish, a curve reads as arriving at something.
 */
export const eliteDragFor = (gap: number): number => {
  if (gap >= ELITE_DRAG_LEAD) return 1
  if (gap <= ELITE_BLOCK_AHEAD) return ELITE_DRAG_MIN
  const t = (gap - ELITE_BLOCK_AHEAD) / (ELITE_DRAG_LEAD - ELITE_BLOCK_AHEAD)
  return ELITE_DRAG_MIN + (1 - ELITE_DRAG_MIN) * t * t
}

/**
 * ─── …and it has to actually fight ──────────────────────────────────────────
 *
 * Planting fixed the elite being walked past. It did not make it interesting:
 * it stood in the road chipping a survivor off the front line every second
 * while the player watched a health bar go down. A stand-off with a statue is
 * not a fight, and the block made it a stand-off the player could not even
 * leave.
 *
 * It got a maul first: a small telegraphed ring on the ground under the crowd,
 * dodged by sliding sideways, capped at 8.5 % of the squad. That was a correct
 * beat and it read well, and it was still not a threat — 0–8 survivors a fight,
 * which against a crowd in the hundreds is a rounding error. The elite was
 * interesting to look at and free to ignore.
 *
 * So the move changed shape. It now SWEEPS: a fast arc across the whole road,
 * and everything standing in the road pays for it.
 *
 *   WIND-UP  0.3 s. A tenth of a second longer than a reaction and no more.
 *            There is no sliding out of this one, so the wind-up is not a dodge
 *            window — it is the tell that says the clock is running.
 *   CADENCE  every 1.5 s, the same for every body promoted to elite. A sweep is
 *            a sweep; the archetypes still read apart through weight, sound and
 *            how far the arc throws the bodies.
 *   COST     a FIFTH of the squad, whatever the squad currently is.
 *
 * That last number is the whole point and it is deliberately not a radius: a
 * sweep that spans the lane cannot be stepped out of, so the answer is DPS and
 * only DPS. The leash (`ELITE_HOLD_MAX`) is what keeps it survivable — six
 * sweeps at most, and a squad that eats every one of them comes out at ~26 % of
 * what it walked in with. A player who cannot kill it in nine seconds is
 * supposed to arrive at the boss hurt.
 */
export const ELITE_TELEGRAPH = 0.3
export const ELITE_SWEEP_CD = 1.5
/**
 * Share of the CURRENT squad one sweep takes. Not a cap and not a radius — the
 * arc crosses the whole road, so this is simply the toll.
 *
 * Deliberately a share rather than a count, for the same reason bites are (see
 * `biteShareFor`): a flat number is terrifying at thirty survivors and
 * invisible at a thousand, and the elite has to mean the same thing on stage 2
 * and stage 27.
 */
/**
 * ─── The endless road's real difficulty dial ────────────────────────────────
 *
 * Everything else the game scales with depth is ABSOLUTE — enemy health, pack
 * size, wall HP — and a crowd is not. The player's damage is
 * `squad × damage × fireRate`: three multiplicative terms, all fed by a shop
 * that is now endless, against enemy health that grows linearly. The crowd wins
 * that race by construction, and the measurement says so — with the endless
 * shop in, a benchmark career reached stage 100 with **no stage past 60 costing
 * more than 1.05 attempts on average**. No wall, but no spread either, and a
 * leaderboard with no spread ranks patience rather than skill.
 *
 * Percentage damage is the one thing a bigger crowd cannot out-scale. The elite
 * sweep takes a fifth of the squad whatever the squad is; the boss slam takes
 * nearly a third. Scaling THOSE with depth is the only lever that keeps biting
 * at stage 200, and it is the lever that separates a player who dodges from one
 * who merely arrived — which is exactly what the board should be measuring.
 *
 * ─── The SHAPE matters more than the slope ─────────────────────────────────
 *
 * The first version ramped linearly from stage 30 and it landed on exactly the
 * wrong player. Measured over careers to 110: a competent run barely noticed
 * (1.05 → 1.20 attempts a stage at depth) while a MID-SKILL one walled at stage
 * 32 — the pressure arrived the instant the endless regime began, and the
 * player who cannot dodge a lane-wide sweep lost a fifth of their crowd over
 * and over from the first endless stage onward.
 *
 * It is quadratic now, which puts almost nothing in the first twenty endless
 * stages and most of it past eighty:
 *
 *     stage   40     60     80     100    110+
 *     ×       1.03   1.29   1.80   2.20   2.20 (capped)
 *     sweep   0.21   0.26   0.36   0.40   0.40 (ceiling)
 *     slam    0.32   0.40   0.50   0.50   0.50 (ceiling)
 *
 * So stages 31–60 stay a continuation of the authored campaign — which is where
 * a returning player who is still learning actually lives — and the squeeze
 * arrives where only committed players are, which is the half of the curve the
 * leaderboard is trying to spread out.
 *
 * Both ceilings are hard: a percentage attack past ~0.5 is a coin flip on
 * whether the run continues rather than a hit that can be played around.
 */
export const endlessPressure = (stage: number): number =>
  1 + Math.min(1.2, ((Math.max(0, stage - 30) / 90) ** 2) * 2.6)

/**
 * ─── Every third swing is charged ───────────────────────────────────────────
 *
 * The boss's ordinary slam is a question about where you are standing, and a
 * player who keeps moving answers it perfectly — measured, a perfect dodger
 * takes **0 %** of them. That is the right shape for the ordinary swing and it
 * leaves the boss with no answer to a good player at all: the fight becomes a
 * DPS race it always loses.
 *
 * So every third one is different. The boss plants, winds up for almost twice
 * as long, and throws an arc of **double the radius** at where the crowd is
 * going rather than where it was. It is not undodgeable — the wind-up is the
 * longest tell in the game and a committed run to the far rail still beats it —
 * but it is the swing you have to actually respect, and standing still through
 * it is no longer an option.
 *
 * ─── Why the radius and not the damage ──────────────────────────────────────
 *
 * A slam's toll is `squad × slamShare`, capped by `SLAM_FRACTION_MAX`, and it
 * is counted off whoever is inside the ring — so the RADIUS decides whether the
 * hit lands, and the share decides what it costs once it has. Doubling the
 * radius therefore turns a swing the player was dodging into a swing that
 * connects, at exactly the price the design already set for a slam that
 * connects. Doubling the damage as well would be two knobs doing one job, and
 * the second one is the one that turns a boss into a coin flip.
 */
export const CHARGED_EVERY = 3

/** …and the arc it throws is twice the size. */
export const CHARGED_RADIUS_MUL = 2

/**
 * The wind-up, as a multiple of the cycle it interrupts.
 *
 * The extra time is the whole fairness of the move: the ring is twice the size,
 * so the ground it covers has to be readable for long enough that leaving it is
 * a decision the player got to make. It also paces the fight — a charged swing
 * arrives roughly every fourth cadence rather than every third, which keeps the
 * boss's rhythm from becoming a metronome.
 */
export const CHARGED_WINDUP_MUL = 1.7

/**
 * How hard a charged swing leads the crowd's movement, against 0.35 for an
 * ordinary one.
 *
 * An ordinary slam aims a little ahead of the crowd; this one aims where the
 * crowd will BE. Together with the doubled radius that is what makes it "the
 * one that gets you" — a player who keeps drifting the way they were drifting
 * is caught by the lead, and a player who commits to a real change of direction
 * is not.
 */
export const CHARGED_LEAD = 0.8

/** Radius of the swing about to be thrown — the ONE definition, read by the
 *  simulation that kills with it and by the telegraph that draws it. */
export const slamRadiusFor = (slams: number, charged: boolean): number =>
  Math.min(SLAM_RADIUS_MAX, SLAM_RADIUS + slams * SLAM_RADIUS_GROWTH)
  * (charged ? CHARGED_RADIUS_MUL : 1)

/** Ceilings on what one percentage attack may ever take. */
export const SWEEP_FRACTION_MAX = 0.4
export const SLAM_FRACTION_MAX = 0.5

/**
 * What one slam is priced at before the endless road's pressure and the retry
 * relief are applied, and before `SLAM_FRACTION_MAX` caps the result.
 *
 * A small crowd is entirely inside ANY radius, so the share is the only thing
 * standing between the boss and one-shotting exactly the players who most need
 * the fight to last long enough to learn it.
 *
 * The history: 0.35 first, which wiped a squad in three hits and made the fight
 * a coin flip; then 0.22, which measured as taking "only ~1/5 of all units".
 * 0.31 is that number 40 % higher — a missed dodge now costs most of a third of
 * the crowd. The telegraph is a full second long, so the cost lands squarely on
 * the player who did not read it rather than on the one who could not.
 */
export const SLAM_MAX_FRACTION = 0.31

/**
 * ─── …and the floor under one, for a boss or a miniboss only ────────────────
 *
 * Every big attack in the game is priced as a SHARE of the crowd — a slam takes
 * `squad × slamShare`, a sweep `squad × sweepShare` — which is the right shape
 * at three hundred survivors and a rounding error at ten. A share of a small
 * crowd rounds to one body, and one body is not a hit: the ring lands, the
 * screen shakes, a single survivor tips over, and the player learns that the
 * thing with the health bar and the wind-up is survivable by standing still.
 *
 * So a boss or a miniboss takes at least this many per swing. It is a floor and
 * not a bonus — the share still owns every case where it is bigger, which is
 * every case where the crowd is big enough for a percentage to mean anything —
 * and it is capped by reality: an attack can only ever take survivors that are
 * actually inside its ring or its arc, so three is what it INTENDS to take, not
 * a debt collected from bodies that were never in reach.
 *
 * Deliberately NOT applied to:
 *
 *   • ORDINARY FOES, whose bite is the archetype's identity — a husk taking one
 *     survivor a second is the difference between a husk and a brute, and
 *     flattening the small end of that scale would make the whole roster one
 *     monster at four sizes.
 *   • A MONSTER'S BODY (`collideFoe`), which is a collision and not an attack.
 *     It already has its own rule (half of what runs into it) and its own
 *     i-frames, and a floor there would bill a crowd three survivors for every
 *     brush against a sprite it is walking past.
 */
export const BOSS_MIN_KILL = 3

/**
 * ─── …and why the floor CLIMBS ──────────────────────────────────────
 *
 * Three bodies a swing is a real hit on stage 2 and a rounding error on stage
 * 45, and the case it fails is the worst one to fail: a crowd that arrived at
 * the arena too thin to get through the boss's health bar.
 *
 * That player has already lost — the bar is bigger than everything they can put
 * out before the swings take them — but a flat floor of three makes losing take
 * a very long time. They stand there dodging, chipping, and being billed three
 * survivors at a time out of forty, for the better part of a minute, to reach a
 * result screen that was decided when they walked in. Tedium, not difficulty.
 *
 * So the floor grows with the road: `BOSS_MIN_KILL_STEP` bodies every
 * `BOSS_MIN_KILL_PER_STAGES` stages. It changes nothing for a healthy crowd,
 * because the SHARE owns every case where it is bigger — at stage 45 the floor
 * is 21 and a swing against a 1500-crowd already takes 465 — so this is only
 * ever felt by the runs it is written for, and what it does for them is end a
 * decided fight promptly.
 *
 * It rides the same discounts the flat floor did: the beginner's cut and the
 * stuck-player relief both multiply it in `bossHitFloor`, so a struggling player
 * is not billed the full climb, and the tutorial keeps its own token number.
 */
export const BOSS_MIN_KILL_STEP = 2
export const BOSS_MIN_KILL_PER_STAGES = 5

/**
 * …and the ceiling on the climb, because the campaign does not end.
 *
 * The share is capped (`SLAM_FRACTION_MAX` = 0.5) and a linear climb is not, so
 * an uncapped floor eventually overtakes it and the whole thing stops being a
 * floor: at stage 100 it would be 43 against a share that takes 40 from an
 * 80-strong crowd, which is a second and harsher difficulty curve wearing a
 * floor's name. Measured exactly there — an 80-crowd's swing went from 40 to 43.
 *
 * Thirty keeps the crossover — the crowd size below which the floor is what
 * binds — under about seventy survivors at every depth, which is the band this
 * is meant to serve and no wider. It does not bite until stage 65, so the
 * authored campaign and the depths this was reported from (45+) are the plain
 * `+2 per 5 stages` throughout.
 */
export const BOSS_MIN_KILL_MAX = 30

/** The floor under one boss swing at this depth, before any discount. */
export const bossMinKill = (stage: number): number => Math.min(
  BOSS_MIN_KILL_MAX,
  BOSS_MIN_KILL
    + BOSS_MIN_KILL_STEP * Math.floor(Math.max(0, stage) / BOSS_MIN_KILL_PER_STAGES)
)

export const ELITE_SWEEP_FRACTION = 0.2
/**
 * How far down the road the arc reaches, from the elite's own feet. It spans
 * the lane sideways, so this is the only dimension that bounds it — and it is
 * drawn from this number, because a sweep that killed further than it was
 * painted would be exactly the lie the boss's telegraph is commented against.
 *
 * Sized to cover a pinned crowd whole: the elite holds `ELITE_HOLD_AHEAD` = 2.4
 * in front, and the crowd is up to `CROWD_MAX_R` = 1.65 deep behind its own
 * centre.
 */
export const ELITE_SWEEP_REACH = 4.3

/** How far a hound-weight elite throws itself into the arc. Pure feel — the sim
 *  moves it, so the lunge and the hit are the same event. */
export const ELITE_LUNGE = 0.55

/**
 * …and the hold has a leash.
 *
 * A player whose squad genuinely cannot kill it would otherwise be followed for
 * the rest of the stage by something that bites and cannot be escaped, which is
 * the exact frustration the miniboss exists to prevent. After this long it
 * breaks off and walks past as it always did: one honest fight, and if it is
 * lost, a cost rather than a death sentence.
 *
 * ─── Why it is 3 and not 9 ──────────────────────────────────────────────────
 *
 * The leash is the ONLY thing bounding the sweep, and once the sweep took a
 * fifth of the squad every 1.5 s the arithmetic ran away: nine seconds is six
 * sweeps, and six sweeps is 74 % of everything the player owns. Measured, that
 * was not difficulty, it was a coin flip on whether the elite happened to die
 * quickly — `average` spent the FULL leash in front of stage 2's and stage 3's
 * elites (6.7 s and 9.1 s) and cleared neither stage on any seed.
 *
 * It went to 4.5 s, which capped the worst case at three sweeps, and it is now
 * 3 s — TWO sweeps. The difference is what happens to a player who simply
 * cannot win this fight yet. At three sweeps they break off having spent a
 * little under half the squad, which is enough that the rest of the stage is
 * lost too; at two they break off with a crowd they can still build back up
 * from, and the road ahead has gates on it. The elite stops being the moment a
 * run is decided and goes back to being a thing that happened during one.
 *
 * Every number the sweep itself is made of is untouched. What changed is how
 * long the question may be asked before the game accepts the answer — and since
 * an elite now drags the road rather than stopping it (`eliteDragFor`), a
 * shorter leash also means less of the stage is spent at a crawl.
 */
export const ELITE_HOLD_MAX = 3

/**
 * ─── A monster is a body, and a body is solid ───────────────────────────────
 *
 * EVERY foe, not just the elite. A survivor that runs into a monster dies on
 * the frame it touches, exactly as it would against a wall or a boulder, and
 * the rest of the swarm streams past on both sides of it.
 *
 * This started as an elite-only rule, for the case that is impossible to miss:
 * after `ELITE_HOLD_MAX` the miniboss breaks off and walks back down the road
 * through the crowd that failed to kill it, and it used to walk through them
 * *literally* — survivors crossing the sprite and coming out the far side. But
 * the same thing was true of a creep the whole time; it was only harder to see
 * at a fifth of the size. A pack that the crowd can walk through is not an
 * enemy, it is a puddle.
 *
 * The numbers are the DRAWN footprint, not a hitbox invented for the physics:
 * `drawFoes` paints the body at `scale × 1.25` and its contact shadow at 0.38 of
 * that across, so a half-width of `scale × 0.475` is exactly the shadow the
 * player can see. The depth is deliberately larger than the shadow's 0.15: the
 * sprite stands up out of its own footprint, so a body only as deep as the
 * ellipse would still let a survivor walk through the monster's KNEES, which is
 * the same bug with a smaller radius.
 *
 * A monster's body DISPLACES rather than kills, and that is the one place the
 * solid-contact rule is deliberately not applied — see `partAround`. A wall
 * stands still, so a lethal wall is a question about the line you took; a
 * monster homes on the crowd, so a lethal monster is an undodgeable share of
 * the squad, and the share is about HALF of it against a designed bite of
 * 0.4–1.8 %. Measured: monsters killing on contact puts the benchmark player
 * out at 10 % of stage 5 and breaks eight balance invariants; monsters
 * displacing passes all twenty-one. The mouth takes what comes near, the body
 * takes up space.
 */
export const FOE_BODY_HALF_W = 0.475
export const FOE_BODY_HALF_H = 0.3

/**
 * ─── Running into a monster ─────────────────────────────────────────────────
 *
 * Half the survivors that hit a monster's body die. Not all of them — that is
 * the wall rule, and a wall stands still while a monster HOMES on the crowd, so
 * an all-or-nothing body would be an undodgeable half of the squad with no line
 * that avoids it (measured: the benchmark player out at 10 % of stage 5, eight
 * balance invariants broken). Half is the compromise the collision needs to be
 * a real cost without being a verdict.
 *
 * Every other one, deterministically, rather than a coin flip per body. A crowd
 * losing exactly half of the bodies that touched reads as an impact; the same
 * expected number arrived at by rolling dice reads as inconsistent, because the
 * player sees the outcome and not the distribution.
 */
export const FOE_COLLIDE_KILL_EVERY = 2

/**
 * …and the survivors get ten frames of immunity, at 60 fps.
 *
 * WITHOUT this, contact is not a collision at all — it is a per-frame rate.
 * A survivor standing in a monster would be offered up to the halving sixty
 * times a second and last about three frames, which is the "mincer" the
 * obstacle rules were written to avoid, wearing a monster costume.
 *
 * With it, one collision costs one coin-flip's worth of survivors and then the
 * crowd is untouchable long enough to be pushed clear and steered away — so a
 * PACK of monsters costs a pack's worth of collisions rather than the product
 * of all of them, which is the whole point: the crowd can cross a pack without
 * a single body being billed twice by two monsters standing side by side.
 *
 * Held in milliseconds, not frames, because `step(dtMs)` runs on whatever the
 * device gives it: a 30 fps phone would otherwise grant twice the protection a
 * 60 fps one does, and 10 frames on a long frame would be most of a second.
 */
export const FOE_COLLIDE_IFRAMES_MS = 10 * (1000 / 60)

/**
 * …and the monster needs a moment before it can knock another rank down.
 *
 * The i-frames above are per SURVIVOR, and on their own they are not enough,
 * because the monster is moving: it walks down the road through the crowd's
 * whole depth in about half a second, meeting a fresh rank of bodies — none of
 * them protected — on every frame of the way. One monster would bill a column
 * rather than a rank, which is the wall rule again by another route.
 *
 * This is the other half: one monster, one knock-down, then a beat. Together
 * the two bounds say exactly what a collision should say — a body pays once per
 * monster, and a monster collects once per pass.
 */
export const FOE_COLLIDE_CD = 0.6

/**
 * The share of a monster's body that KILLS, as against the share that pushes.
 *
 * The whole body is solid — nobody may stand inside the sprite — but only the
 * middle 60 % of it knocks anyone down. Clip a flank and you are shoved aside;
 * run into it squarely and half your leading rank is gone.
 *
 * Two reasons, one of feel and one measured. A monster's contact box is its
 * drawn shadow plus a survivor's own radius, which for a creep is 0.69 against
 * a crowd 1.65 in radius — over half the crowd's width — so "the edge of the
 * shadow" is a very generous definition of running into something. And the
 * career says the same: at the full body a competent player who never takes the
 * ×3 walls at **stage 4** with 82 foe deaths; at 0.6 the same career runs, and
 * every one of the twenty-one balance invariants holds.
 */
export const FOE_COLLIDE_CORE = 0.6

/**
 * ─── Why a bite is also a FRACTION ──────────────────────────────────────────
 *
 * A brute eats five survivors a bite. Against the thirty-strong squad of stage
 * 1 that is a sixth of everyone the player has, and it is terrifying. Against
 * the twelve-hundred-strong squad of stage 27 it is 0.4 %, and the same monster
 * is scenery.
 *
 * That is the whole shape of the difficulty problem this game had: the crowd
 * grows EXPONENTIALLY (gates multiply) and the road's toll was ABSOLUTE, so
 * every stage past about eight was decided before it started. The career
 * simulation measured the result exactly — every scripted player who touched
 * the screen cleared all thirty stages, on any purchasing strategy, including
 * buying nothing at all.
 *
 * So a bite is now the LARGER of the archetype's flat cost and a share of the
 * crowd. The flat number still rules the early game, where it is frightening
 * and hand-authored; the share takes over exactly when the flat number stops
 * meaning anything. Nothing about the monster's identity changes — a brute is
 * still four times a creep, at both ends of the campaign.
 */
export const biteShareFor = (typeId: string): number => {
  switch (typeId) {
    case 'brute': return 0.018
    case 'husk': return 0.009
    case 'hound': return 0.006
    case 'flyer': return 0.005
    default: return 0.004
  }
}

/**
 * ─── The autobalancer ───────────────────────────────────────────────────────
 *
 * A game tuned for the average player is too easy for the good one and too hard
 * for the bad one on the same afternoon. So the difficulty tracks the PLAYER
 * rather than the stage number, from two directions that never fight:
 *
 *   UP   — every stage cleared adds one to a streak, and each point of streak
 *          makes the next stage `CHALLENGE_STEP` harder. A player on a run of
 *          six clears is fighting a measurably different game from one who just
 *          arrived, which is the point.
 *   DOWN — one loss wipes the streak to zero, immediately and completely. The
 *          handicap can therefore never be the reason somebody is stuck, and
 *          the relief below stacks on top of that for a player who is *really*
 *          stuck.
 *
 * The cap exists because the curve has to stay a curve: past twelve clears the
 * stage number is already doing the work.
 */
/**
 * 0.13 a step, not the 0.055 first shipped, and a cap past the length of the
 * authored campaign rather than halfway through it.
 *
 * Measured: the whole original range was worth ×1.66, which moved a competent
 * player's clear rate from 100 % to 100 % — it cost them a quarter of their
 * crowd and four tenths of a second on the boss, and changed nothing. It also
 * capped on stage 13 and was then a CONSTANT for the remaining eighteen stages,
 * i.e. it stopped being a difficulty curve exactly where the campaign needed
 * one most.
 */
export const CHALLENGE_STEP = 0.13
/**
 * …and 90, not 30, for the same reason 30 was not 12: a cap the player REACHES
 * is a constant from that moment on, i.e. it stops being a difficulty curve
 * exactly where they have had the most practice.
 *
 * 30 was reached on stage 31 of a clean career — which was the last stage of
 * the campaign when it was written, and is now barely the start of one. At 90
 * the handicap is still climbing at stage 91, by which point it is worth ×12.7
 * enemy health on its own; anyone that deep is choosing to be, and the streak
 * is the only knob in the game that measures the PLAYER rather than the stage.
 * A single loss still wipes it to zero, so it can never be why somebody is
 * stuck — it is the endless game's real difficulty dial.
 */
export const CHALLENGE_MAX = 90

/** Enemy-health multiplier for a challenge streak. */
export const challengeFactor = (streak: number): number =>
  1 + Math.max(0, Math.min(CHALLENGE_MAX, streak)) * CHALLENGE_STEP

/**
 * …and the streak is not only health.
 *
 * Health alone is the least interesting way to be harder: it makes every fight
 * longer without making any of them different. A streak also sends MORE bodies
 * and makes each bite cost more, so a player on a run of clears meets a road
 * that is denser and less forgiving rather than one that is merely spongier.
 */
export const challengePackFactor = (streak: number): number =>
  1 + Math.max(0, Math.min(CHALLENGE_MAX, streak)) * 0.05

export const challengeBiteFactor = (streak: number): number =>
  1 + Math.max(0, Math.min(CHALLENGE_MAX, streak)) * 0.04

/**
 * ─── The lean, and why it is a difficulty knob rather than a paywall ────────
 *
 * The `×3` at the end of a stage is the game's primary income: the coins a run
 * banks by itself buy an upgrade every few stages, and the tripled version buys
 * one every stage. A player who takes it keeps pace with the curve. A player
 * who never takes it falls behind it — and that is already true without any
 * code, because the shop is what the curve is priced against.
 *
 * This makes the falling-behind FELT rather than merely arithmetic. Each
 * consecutive stage cleared without claiming leans the road a little harder, so
 * the pressure arrives as "this is getting heavy" during the run instead of as
 * a wall six stages later when the shop is empty and it is too late to act on.
 *
 * Three rules keep it a nudge and not a punishment:
 *
 *   1. It RESETS to zero the moment the player claims once. It is a lean, not a
 *      debt — one claim buys back the whole curve.
 *   2. It is capped (`DECLINE_MAX` steps). A player who never wants to watch an
 *      ad still has a finite, beatable game; they are simply playing the hard
 *      version of it.
 *   3. It only counts a decline when the offer was actually THERE. A no-fill,
 *      a rate limit, or a build with no ad provider must never make the game
 *      harder — that would be punishing the player for the network's weather.
 *
 * Health only, deliberately: unlike the challenge streak this does not thicken
 * the packs or sharpen the bites, because it is meant to be a slope the player
 * can still climb with skill rather than a different game.
 */
export const DECLINE_STEP = 0.07
export const DECLINE_MAX = 6
/**
 * No lean is recorded for a result screen on this stage or any before it.
 *
 * The lean is a nudge aimed at a player who has DECIDED to stay and is choosing
 * not to pay. A stranger on their first session has decided nothing yet, and
 * the first result screen they meet is inside the window a portal's fit test
 * grades: a tester who skips the ×3 there and on the next two screens was
 * arriving at stage 6 — the steepest step in the game — carrying an extra 21 %
 * of enemy health they had no way to know about. The lean now starts counting
 * where the shop starts mattering, which is the same stage the onboarding
 * relief curves let go (`earlyFoeHpMul` and friends).
 */
export const DECLINE_FREE_THROUGH_STAGE = 6

export const rewardDeclineFactor = (declines: number): number =>
  1 + Math.max(0, Math.min(DECLINE_MAX, declines)) * DECLINE_STEP

/**
 * Health multiplier applied to EVERY enemy on a stage the player has already
 * lost on at least once.
 *
 * Fixed, one-shot, and deliberately invisible in the HUD: a player who is stuck
 * gets a real 20 % concession without being told they are being helped, and a
 * player who clears first time never notices it exists. It does NOT stack with
 * repeated failures — a difficulty floor, not a slide into triviality.
 */
export const RETRY_HP_RELIEF = 0.8

/**
 * …and it DEEPENS if the same stage keeps beating them.
 *
 * One loss is a lesson; four in a row is a wall, and a wall is where players
 * stop playing. Relief steps 0.80 → 0.72 → 0.66 → 0.62 and then holds — never
 * to zero, because a stage that cannot be lost is not a stage. The step is
 * deliberately smaller each time so the player feels the game meet them rather
 * than give up on them.
 */
export const reliefFor = (failures: number): number => {
  if (failures <= 0) return 1
  const table = [RETRY_HP_RELIEF, 0.72, 0.66, 0.62]
  return table[Math.min(failures, table.length) - 1] ?? 0.62
}

/**
 * ─── Relief that reaches the thing actually killing them ────────────────────
 *
 * Enemy health is only one of the three ways a run dies, and the career
 * simulation found the other two were getting no help at all: on a stage where
 * the wall was the BOSS, four failures moved the clear rate 0 % → 75 %; on a
 * stage where the wall was the ROAD, four failures moved clear rate, progress
 * and death counts by exactly zero. A concession the stuck player cannot feel
 * is not a concession.
 *
 * So relief now reaches every channel that takes survivors away:
 */

/** Slam share multiplier. Slams are 68–80 % of a failing run's losses, so this
 *  deepens rather than sitting flat at one concession. */
export const slamReliefFor = (failures: number): number => {
  if (failures <= 0) return 1
  const table = [0.6, 0.52, 0.46, 0.42]
  return table[Math.min(failures, table.length) - 1] ?? 0.42
}

/** Obstacle-contact and trap-bite multiplier — the road's own toll. */
export const contactReliefFor = (failures: number): number => {
  if (failures <= 0) return 1
  const table = [0.8, 0.68, 0.58, 0.5]
  return table[Math.min(failures, table.length) - 1] ?? 0.5
}

/**
 * Extra survivors in the starting squad, one per failure, capped at four.
 *
 * The only concession that can rescue a run dying two-thirds of the way down
 * the road: everything else makes the enemies weaker, and a run that is out of
 * PEOPLE cannot spend that. Capped low so a stuck player is handed a foothold
 * rather than the stage.
 *
 * NOT on stage 1, and that exception is load-bearing. Stage 1 is the tutorial,
 * and the only thing that loses it is not steering at all — a player who taps
 * even badly clears it on every seed. Handing free survivors to a run that has
 * never touched the screen is the one way this relief could turn "the game
 * plays itself" into a true statement, and the simulation caught it doing
 * exactly that. Everywhere else, being stuck is real and this is the answer.
 */
export const startBonusFor = (failures: number, stage: number): number =>
  stage <= 1 ? 0 : Math.max(0, Math.min(4, failures))

/** Extra crowd per death, as a fraction. */
export const RETRY_SQUAD_STEP = 0.2

/**
 * …and the same concession as a MULTIPLIER: +20 % of the starting squad per
 * death on this stage, cleared the moment the stage is.
 *
 * `startBonusFor` above adds a flat body per failure, capped at four. That is
 * the right shape for a run dying at the very end — a foothold — and the wrong
 * shape for the early stages, where the whole squad is four people and four
 * extra is a different game. This one scales with whatever the player actually
 * starts with, so it stays proportional at every depth: meaningful on stage 12,
 * modest on stage 2.
 *
 * Not capped here on purpose. `MAX_SQUAD` already clamps the result, and a
 * player who has died eight times to the same stage is not the player to
 * withhold from — the failure counter resets on the clear, so the effect can
 * never leak into a stage they have not struggled with.
 *
 * Stage 1 is excluded for the same reason `startBonusFor` excludes it: the only
 * way to lose it is to never touch the screen, and paying that with a bigger
 * crowd is how "the game plays itself" becomes true.
 */
export const retrySquadScaleFor = (failures: number, stage: number): number =>
  stage <= 1 ? 1 : 1 + RETRY_SQUAD_STEP * Math.max(0, failures)

// ─── Stage shape ────────────────────────────────────────────────────────────

/**
 * Length of stage `n` in world units — a run of ~35 s at base speed, growing
 * gently so stage 12 is a real expedition without ever becoming a slog.
 *
 * STAGE 1 IS SHORTER, and deliberately so. A 500-player Poki fit test put 31 %
 * of sessions under a minute and 64 % under two, against a gate that wants 25 %
 * of them past three — the opening was asking for more than a stranger will
 * spend before they know whether they like the game. Stage 1 is now a ~30 s
 * round trip: the road, one weakened elite, and a boss that is the same creature
 * again at boss size and priced to fall over (`tutorialBossHp`).
 *
 * The short road is what buys the climax back. The opening briefly had no boss
 * at all, which cost less time than it was worth: a level that simply stops
 * reads as unfinished, and it teaches the wrong shape for every stage after.
 */
export const stageLength = (stage: number): number =>
  stage <= 1
    ? 105
    : Math.round(120 + Math.min(stage, 20) * 9 + Math.max(0, stage - 20) * 4)

/** Forward speed for a stage. */
export const stageSpeed = (stage: number): number =>
  Math.min(RUN_SPEED_MAX, RUN_SPEED + (stage - 1) * RUN_SPEED_PER_STAGE)

/**
 * Coins banked for finishing a stage.
 *
 * Deliberately dominated by the SQUAD the player finished with rather than by
 * the stage number: the reward should say "the way you played that was good",
 * not "you have been here a while".
 */
export const stageReward = (stage: number, squad: number): number =>
  Math.round(18 + stage * 6 + squad * 1.6)

/** Consolation coins on a wipe — enough that a bad run still moves the meta
 *  needle, small enough that surviving is obviously better. */
export const wipeReward = (stage: number, bestSquad: number, progress01: number): number =>
  Math.round((6 + stage * 2 + bestSquad * 0.5) * (0.35 + progress01 * 0.65))

/**
 * How long the felled boss is left on screen before the result arrives.
 *
 * The kill is the thing the whole stage was for, and until now it was over in a
 * frame: the boss died and a screen slid over the top of it. Two seconds is
 * long enough to watch the body go down and read the words, and short enough
 * that it never becomes a wait — the player has already won, and the only thing
 * being sold here is the win.
 *
 * Read by the renderer (which paints the fall and reports where the body ended
 * up) and by the scene (which holds the result screen back by exactly this).
 */
export const BOSS_FELLED_MS = 2000

/**
 * How long a WIPE sits on the road before the result screen arrives.
 *
 * The mirror of `BOSS_FELLED_MS`, and it exists for the opposite reason. A
 * clear was over in a frame and that stole the reward; a loss was over in a
 * frame and that stole the EXPLANATION. Two playtests in a row filed the same
 * complaint — "nothing says what killed you" — and the screen that was supposed
 * to answer it arrived so fast that four of five testers never connected it to
 * anything they had seen happen. The last thing on the road, every time, was a
 * result card.
 *
 * Three seconds is the beat that puts the two back together: the world is
 * already stopped at a wipe (`step` returns on `'wipe'`), so the bodies stay
 * exactly where they fell, the camera leans in on them, the light goes out of
 * the frame, and the word lands on top. The cause the result screen then names
 * is a caption for something the player just watched, rather than a fact about
 * a run they have already stopped thinking about.
 *
 * Longer than the boss hold on purpose. A win is a reward and should not be
 * made to wait; a loss is a lesson, and the lesson is the thing being sold.
 */
export const WASTED_HOLD_MS = 3000

/** How far the camera leans in over that hold. Small — the frame is the story,
 *  not the zoom, and a hard push on a phone reads as a glitch. */
export const WASTED_ZOOM = 1.14

// ─── How far the run actually got ───────────────────────────────────────────
//
// `progress01` is where the crowd is along the ROAD, and it reaches 1 the
// moment the arena opens — so a run that walked into the boss and was flattened
// by its first swing reports 100 %, which is exactly the number a near-miss
// readout must never print over a loss.
//
// The player's own mental model is already the right one, because the HUD rail
// does this: it runs as road progress until the arena and then becomes the
// boss's health. One number, two halves. `reachOf` is that rail as a scalar.
//
// The boss is the last fifth of it. Not half — the fight is a handful of
// seconds against a road of ninety — and not a tenth, because "I took it to a
// sliver" has to be visibly further than "I reached it", or the readout stops
// distinguishing the two runs that feel most different to the player.

export const BOSS_REACH_SHARE = 0.2

/**
 * The rail the player watched, as one 0..1 number.
 *
 * `sawBoss` rather than `progress01 >= 1`, because the road's own accumulator
 * can land a hair short of 1 on the frame the arena opens, and a boss taken to
 * half health would then read as less progress than simply arriving.
 *
 * Deliberately NOT fed back into `wipeReward`: the payout is priced off road
 * progress and re-pricing it here would turn a readout into a balance change.
 */
export const reachOf = (progress01: number, sawBoss: boolean, bossHp01: number): number => {
  const road = Math.max(0, Math.min(1, Number.isFinite(progress01) ? progress01 : 0))
  if (!sawBoss) return road * (1 - BOSS_REACH_SHARE)
  const hp = Math.max(0, Math.min(1, Number.isFinite(bossHp01) ? bossHp01 : 1))
  return (1 - BOSS_REACH_SHARE) + BOSS_REACH_SHARE * (1 - hp)
}

// ─── Milestones — a goal two stages ahead ───────────────────────────────────
//
// Every reward in the game until now has been about the stage the player is
// IN: the road pays, the boss pays, the shop spends it. Nothing has ever been
// about a stage they have not reached, and a session ends at the moment the
// player has no reason in mind to start the next one.
//
// So every fifth clear pays a lump. The number is not the point — the point is
// that it is VISIBLE from two stages away (the HUD chip counts down to it), so
// "one more" has something on the other side of it.
//
// Why five: three is close enough to read as the ordinary payout and stops
// being an event; ten is further than a first session goes. Five puts the first
// one inside the opening session and every later one inside a sitting.

export const MILESTONE_EVERY = 5

/** Is this stage a milestone? */
export const isMilestone = (stage: number): boolean =>
  stage >= MILESTONE_EVERY && stage % MILESTONE_EVERY === 0

/** The next stage that pays one, counted from the stage about to be played. */
export const nextMilestone = (stage: number): number => {
  const from = Math.max(1, Math.floor(stage))
  return Math.ceil(from / MILESTONE_EVERY) * MILESTONE_EVERY
}

/** How many stages are left to reach it — 0 while standing on one. */
export const stagesToMilestone = (stage: number): number =>
  Math.max(0, nextMilestone(stage) - Math.max(1, Math.floor(stage)))

/**
 * What a milestone pays.
 *
 * Priced at roughly one good stage's income, deliberately: a lump worth less
 * than the road that earned it is a formality, and one worth three stages would
 * re-price the whole upgrade ladder off a counter the player cannot influence.
 * `stageReward` at the same depth with a healthy crowd lands in the same band,
 * which is the comparison this number was chosen against.
 *
 * Linear in the stage rather than compounding: the shop's own costs grow far
 * faster (1.38–1.55 a level), so a milestone stays a boost and never becomes
 * the income the curve is balanced against.
 */
export const milestoneReward = (stage: number): number =>
  Math.round(60 + Math.max(0, Math.floor(stage)) * 25)

// ─── Entities ───────────────────────────────────────────────────────────────

/**
 * What a gate leaf does to the crowd that runs through it.
 *
 *   add — `+N`, pumped UP by sustained fire.
 *   sub — `-N`, pumped DOWN by it. Same mechanic, opposite sign, and the point
 *         of it is that the crowd fires FORWARD automatically: park in front of
 *         a `-N` while you approach and you make the bill bigger. The skill it
 *         adds is *shoot the door you are not taking* — which is the first time
 *         in the game that aiming somewhere is worth more than aiming at the
 *         best offer.
 *   mul — `×N`, applied to the survivors that went through THAT leaf. Worth
 *         the most to a big crowd, worth almost nothing to a small one.
 *   div — `÷N`, a trap. Never pumpable, and the harshest thing a bank can hold.
 *
 * `add`/`sub` and `mul`/`div` are the two axes, and pairing ACROSS them is what
 * makes a bank hard: `÷2` beside `-8` has no right answer, only a cheaper wrong
 * one, and which is cheaper depends on the crowd the player actually has.
 */
export type GateOp = 'add' | 'sub' | 'mul' | 'div'

/** Ceiling on a `-N` leaf, matching `GATE_MAX_VALUE` for the same reason: the
 *  two are one mechanic with a sign, and an asymmetric cap would make the
 *  mirror a lie. In practice the pump window (see `BULLET_RANGE`) keeps a
 *  sub in the low tens. */
export const GATE_SUB_MAX = 999

export interface Gate {
  id: number
  /**
   * Which bank this leaf belongs to.
   *
   * A bank is claimed by exactly ONE leaf: the moment the crowd commits, every
   * other leaf of the same bank is dismissed. Without a shared id there is no
   * way to say "the others", and the rule degenerates back into "collect a bit
   * of each", which is the thing the pillars exist to prevent.
   */
  bankId: number
  /** Centre of the leaf, world x. */
  x: number
  /** Half-width of this leaf. Banks with three leaves use narrower ones. */
  halfW: number
  y: number
  op: GateOp
  /** `+value`, `−value`, `×value` or `÷value`. EVERY op climbs with fire —
   *  the additive ones in whole survivors, the scale ones in tenths. See
   *  `gatePumpCap` for where each one stops. */
  value: number
  /** Accumulated fire toward the next tick, ms. */
  charge: number
  /** Seconds since the last hit — the frame stops glowing when fire stops.
   *  NEGATIVE after a hit from a weapon with a `gateHoldS`: the door is owed
   *  that much extra warmth before the ordinary window starts counting. */
  hotFor: number
  /**
   * How much faster than `gateTickMs` this particular door pumps. 1 for every
   * door the road rolls; stage 1's opening doorway runs hot on purpose, so the
   * first number a stranger ever sees is one that visibly races. Authored on
   * the leaf — see `GateLeaf.pumpMul`.
   */
  pumpMul: number
  /** A ceiling below `gatePumpCap` for this door alone, or `undefined` for
   *  the op's own. The opening doorway stops at a number that reads as a
   *  reward rather than a glitch. */
  pumpCap?: number
  /** Consumed once the crowd runs through it. */
  used: boolean
  /** Claimed by another leaf of the same bank — this one pays nothing and is
   *  currently playing its dismissal. */
  dismissed: boolean
  /** 0..1 punch animation on the number, driven by the renderer. */
  pop: number
  /**
   * The door is face-down: it wears a `?` instead of its number, and neither
   * the player nor the pump can see what it is worth until the crowd commits.
   *
   * The op and value underneath are perfectly ordinary and already sitting in
   * the two fields above — a mystery is a way of PRESENTING a rolled door, not
   * a fifth kind of door. Cleared at `claimBank`, for the taken leaf and the
   * dismissed ones alike, so the bank always finishes by showing its whole hand:
   * a door that stays a secret after it has been resolved teaches nothing, and
   * "what would the other one have been" is most of the reason to gamble again.
   */
  mystery: boolean
}

/** A solid pillar between two leaves of a gate bank. Kills on contact — until
 *  its bank is claimed, at which point it stops being solid and plays out its
 *  own destruction alongside the doors it was separating. */
export interface Divider {
  id: number
  bankId: number
  x: number
  y: number
  halfW: number
  /**
   * The bank has been claimed: this pillar no longer kills, and is on screen
   * only for as long as its teardown lasts.
   *
   * It is a flag rather than an immediate delete because the renderer topples
   * the pillars as part of the dismissal cascade — a pillar that vanished the
   * frame the bank resolved would blink out from under its own debris.
   */
  dismissed: boolean
}

export type CrateKind = 'damage' | 'rate'

export interface Crate {
  id: number
  kind: CrateKind
  x: number
  y: number
  hp: number
  maxHp: number
  /** Rotation, so a row of crates does not read as a stencil. */
  spin: number
  dead: boolean
  /**
   * What this box pays, overriding the per-kind constant.
   *
   * Exists for rows that are placed to TEACH rather than to reward — stage 1's
   * opening wall is seven boxes wide because it has to be unmissable, and seven
   * full-price payouts would hand a first-time player most of the fire-rate
   * curve before they had met an enemy. Undefined everywhere else, which is the
   * normal economy.
   */
  gain?: number
}

/**
 * ─── Rescue cages ───────────────────────────────────────────────────────────
 *
 * A supply crate with people in it. Mechanically it IS a crate — position,
 * health, solid until it breaks, broken by the same rounds — and everything
 * about it that differs is downstream of the one change: it pays `spawnUnit`
 * rather than a stat.
 *
 * It exists because the road had exactly ONE reason to leave the racing line
 * (the crates) and therefore exactly one detour question, asked over and over
 * with the same two answers. A cage asks a different one — *is this crowd worth
 * more to me than the door I am lined up on?* — because a cage is deliberately
 * authored beside a gate bank, on the shoulder AWAY from that bank's best leaf
 * (`placeRescues` in `track.ts`). Taking it costs the approach: the seconds the
 * crowd would have spent pumping the good door, and the lane position it would
 * have spent them from.
 *
 * ── How it is told apart from a crate at speed ──
 *
 * The player has about a quarter of a second, so the two props may not share a
 * silhouette, a colour or a mark, and the difference has to survive being 30 px
 * tall on a phone. Three channels, any one of which is enough:
 *
 *   SHAPE   a crate is a squat rounded box; a cage is a TALL barred cabinet —
 *           the drawn body is half as high again as it is wide and its outline
 *           is broken by four vertical bars, so the silhouette alone reads as
 *           "bars" against the crates' solid block.
 *   COLOUR  the crates own warm green and cold blue with a throbbing rim in the
 *           same hue. A cage is dead grey iron with NO coloured rim at all and
 *           a warm lamp INSIDE it — light coming out of a dark shape, which is
 *           the opposite arrangement to a crate's lit face.
 *   MARK    a crate's badge is a stat glyph (chevron / bolt) and its number is
 *           the HP it costs. A cage carries no stat glyph; it carries a head
 *           count, `+N`, in the crowd's own colour — the same `+` the gates
 *           print, because it pays the same currency they do.
 *
 * `flash` is the shot-feedback channel: it is what makes an unbroken cage
 * rattle, which is the third read (a crate takes cracks, a cage shakes).
 */
export interface Cage {
  id: number
  x: number
  y: number
  hp: number
  maxHp: number
  /**
   * Survivors inside — handed to the crowd the moment it breaks.
   *
   * Authored on the event rather than read from a constant here because what it
   * is WORTH depends on the stage: see `cageSurvivors` in `track.ts`, which
   * prices it against the door it is competing with.
   */
  hold: number
  /** 0..1, decayed by the sim. Drives the rattle a shot puts through the bars. */
  flash: number
  dead: boolean
}

/** Half-extent of a cage's FOOTPRINT on the road, world units. Slightly wider
 *  than a crate — it is the bigger prop — and square, like every other box: the
 *  drawn body is taller than this, exactly as a barricade's is. */
export const CAGE_R = 0.68

/**
 * The roadmap's number, and the floor under the curve that replaced it.
 *
 * `+5` is what a cage pays on the stage cages first appear, and it is not a
 * coincidence: `cageSurvivors` prices a cage at `CAGE_GATE_SHARE` of what a
 * door on that stage prints, and at stage `CAGE_STAGE` that arithmetic comes
 * out at 5. The measurement behind choosing a curve at all is written down on
 * `cageSurvivors`.
 */
export const CAGE_RESCUE_BASE = 3

/**
 * How fast a freed survivor jogs over to the crowd, world units per second,
 * RELATIVE to the crowd — the road's own speed is added on top, so a joiner
 * behind the squad still closes on it.
 *
 * Four is a visible run across a road nine units wide: a survivor let out on the
 * far shoulder takes about three quarters of a second to reach the squad, which
 * is long enough to be seen and short enough that the payout still arrives in
 * the approach the player spent on it.
 */
export const CAGE_JOIN_SPEED = 4

/** …and the longest any one survivor may spend jogging before the ordinary
 *  formation spring takes over. A backstop, so a joiner that cannot reach its
 *  slot (a wall in the way, the crowd pinned on a rail) is never left walking
 *  alone forever. */
export const CAGE_JOIN_MAX_S = 2.5

/**
 * ─── The bulwark: an auto-shield in a box ───────────────────────────────────
 *
 * A pickup that arms ONE absorb and then waits. It is not a second timed
 * shield — the skill on the button already is that (`shieldActive`) — and the
 * whole design problem here is that it has to look enough like the skill to be
 * understood without a tutorial and behave differently enough that a player who
 * confuses the two is never punished for it.
 *
 * The split is: **the skill answers bodies, the bulwark answers BLOWS.**
 *
 *   • the SKILL is a clock. It takes every second survivor that would have been
 *     lost, whatever took them, for as long as it is up — it is hooked inside
 *     `killUnit`, one body at a time, and by construction it cannot see how big
 *     the thing that is killing them was.
 *   • the BULWARK has no clock at all. It sits armed, indefinitely, until one
 *     blow arrives that would take more than `BULWARK_SHARE` of the crowd; that
 *     blow is then vetoed WHOLE, before a single body is billed, and the pickup
 *     is spent.
 *
 * They are asked in that order — bulwark first, at the blow; skill second, per
 * body — because only one of them CAN be asked first. A blow can only be vetoed
 * atomically if it is measured before it lands, and the skill's halving happens
 * inside the loss funnel where the blow no longer exists as an object. So while
 * both are up, a big blow costs the pickup and nothing else, the skill's
 * remaining seconds are untouched, and every blow under the threshold falls
 * through to the skill exactly as it did before this existed.
 */
export interface Bulwark {
  id: number
  x: number
  y: number
  hp: number
  maxHp: number
  /** Slow idle rotation on the plate inside the housing, so an armed pickup
   *  standing on an empty shoulder still reads as a live object. */
  spin: number
  dead: boolean
}

/** Half-extent of the pickup box. The same square as a supply crate, on
 *  purpose: it is the same kind of object — a reward you drive at and shoot. */
export const BULWARK_R = 0.62

/**
 * What makes a loss a BLOW rather than a scrape: more than this share of the
 * crowd, taken by one attack, in one stroke.
 *
 * 5 % is the player's own number and it is a good one, because it is the scale
 * at which every deliberate percentage hit in this game is already priced —
 * `ELITE_SWEEP_FRACTION` is 0.2, `SLAM_MAX_FRACTION` and `BOMBER_FRACTION` land
 * between a fifth and a half, and a foe's ordinary bite is `biteShareFor`, 0.4
 * to 1.8 %. So the threshold sits cleanly in the gap the design already left:
 * every telegraphed area attack in the game is four to ten times over it, and
 * every routine mouthful is three to twelve times under it.
 */
export const BULWARK_SHARE = 0.05

/**
 * …and the absolute floor under that share, in bodies.
 *
 * The share alone is wrong at the small end and the player said exactly why: a
 * ten-strong squad losing ONE body to a barricade is 10 % of the crowd, which
 * clears the 5 % test comfortably — and spending a one-shot absorb on a scrape
 * is the single worst thing this pickup could do, because the player never
 * asked for it and never sees it coming.
 *
 * `BOSS_MIN_KILL` is the floor, rather than a new number, because it is already
 * this game's definition of "a real hit": every budgeted big attack in the sim
 * — the boss's slam, rake, charge and bolt, an elite's sweep, a bomber's blast,
 * a rolling ball, a miniboss's bite — floors its own budget at exactly this, on
 * the argument that a thing with a name and a health bar may not take less than
 * a husk-and-a-half. A blow that cannot even clear the bar the attacks set for
 * THEMSELVES is not a blow.
 *
 * Three also covers the case the player described end to end. An obstacle
 * scrape is `grindAgainst`, which bills at most `max(1, squad × fraction) × dt`
 * per frame — one body, or two on a very large crowd — and it is excluded on
 * its own terms as well (see `bulwarkAbsorb`: a grind is a RATE, not a blow).
 * An ordinary foe's bite is 1–2 bodies. A monster's body takes half of what
 * runs into it, which on a ten-strong squad is one or two. All of them are
 * under three; every one of them survives a maxed bulwark untouched.
 */
export const BULWARK_FLOOR = BOSS_MIN_KILL

/**
 * ─── TNT barrels ────────────────────────────────────────────────────────────
 *
 * The boss arena's second answer, and the reason a boss fight is not just a
 * damage race with a thumb held down.
 *
 * A boss plants and raises a shield at fixed health gates, and during that phase
 * the crowd's fire is designed to do nothing — the correct play is to MOVE. That
 * is honest, but it is also a stretch of the climax where the player has no
 * offence at all. Barrels give them one: they sit in the arena, they take real
 * shooting to break, and when they go they hurt the boss THROUGH the shield.
 *
 * They are a lever, not a solution. The blast is big but the barrels are finite,
 * so a fight is still won with the gun; barrels are what the player spends the
 * shield on, and what a run with too little damage reaches for when the boss is
 * simply out-scaling their crowd.
 */
export interface Barrel {
  id: number
  x: number
  y: number
  hp: number
  maxHp: number
  /** Counts up once lit, then detonates. Gives the player a beat to read it and
   *  the renderer something to flash. `-1` while intact. */
  fuse: number
  dead: boolean
}

/** Half-extent of a barrel, world units. Slightly slimmer than a crate so a row
 *  of three still leaves lanes to steer between. */
export const BARREL_R = 0.62

/** How long a lit barrel burns before it goes, ms. Long enough to see and to
 *  get clear of, short enough that it never feels like a timer. */
export const BARREL_FUSE_MS = 420

/** How far a blast reaches, world units. Sized to cover the boss's hold
 *  position from either shoulder of the arena without covering the crowd. */
export const BARREL_BLAST_R = 4.2

/**
 * Blast damage, as a fraction of the boss's MAX health.
 *
 * Expressed as a fraction rather than a flat number so it stays meaningful at
 * every depth — a stage-20 boss has many times a stage-6 boss's health, and a
 * flat number would be a wrecking ball early and a firework later.
 *
 * 9 % is deliberately under a guard gate's spacing: a fight with three barrels
 * cannot be skipped by blowing all of them, which is what keeps the boss's own
 * phases the spine of the encounter.
 */
export const BARREL_BLAST_BOSS_FRACTION = 0.09

/** Health of one barrel, scaled with the stage the way crates are. Deliberately
 *  chunky — "quite some hits" is the point: a barrel the crowd deletes in
 *  passing is a pickup, not a decision. */
export const barrelHp = (stage: number): number =>
  Math.round(26 + Math.min(stage, 20) * 7 + Math.max(0, stage - 20) * 3)

export interface Barricade {
  id: number
  x: number
  y: number
  w: number
  hp: number
  maxHp: number
  flash: number
  dead: boolean
}

/**
 * A boulder. No `hp`, no `dead`, and that absence is the whole entity.
 *
 * Everything else solid in the lane can be deleted with enough fire, which
 * quietly turned routing into a DPS check as a run grew. This cannot, so it is
 * the one obstacle whose answer is always the steering.
 */
export interface Rock {
  id: number
  x: number
  y: number
  w: number
  /**
   * Part of a PASSAGE rib rather than a scattered field, which changes two
   * rules: the funnel reads it, so the crowd squeezes to fit the corridor it is
   * aimed at (`passageFit`); and the whole rib bills ONCE, as a cut that takes
   * the smaller of the two corridors rather than as a dozen boulders that each
   * kill what they touch (`stepRocks`). See `PASSAGE_SECONDS`.
   */
  passage: boolean
  /** Fixed per-body tilt and silhouette seed, so a field of them does not read
   *  as one shape stamped four times. */
  spin: number
  seed: number
}

export interface Foe {
  id: number
  typeId: string
  /** Which baked monster design this individual wears, for its whole life. */
  design: string
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  /** Survivors killed per bite — the flat floor, before the crowd share. */
  bite: number
  /** Share of the whole squad this archetype takes once the crowd outgrows the
   *  flat number. See `biteShareFor`. */
  biteShare: number
  biteCd: number
  scale: number
  flash: number
  phase: number
  dead: boolean
  /** Flyers ignore barricades and drift across the lane. */
  flying: boolean
  /** Seconds of holding an elite has left before it breaks off and walks past.
   *  Non-elites never hold and leave this at 0. See `ELITE_HOLD_MAX`. */
  hold: number
  /** Seconds until this monster's BODY can knock a rank down again. Stops one
   *  monster billing the same pass twice as it sweeps through the crowd's
   *  depth. See `FOE_COLLIDE_CD`. */
  hitCd: number
  /** Wind-up → sweep cycle, seconds. Elites only; see `ELITE_TELEGRAPH`. */
  sweepCd: number
  /** The full length of the current cycle, so the telegraph can be drawn as a
   *  fraction of it rather than against a hard-coded window. */
  sweepSpan: number
  /** Which way the current arc travels, ±1. Alternates every swing, so a
   *  cornered crowd is thrown left, then right, then left — the read that says
   *  "this is a sweep" rather than "this is a stomp". */
  sweepDir: number
  /**
   * Has THIS swing been announced yet?
   *
   * Without it a sweep could land with no telegraph at all. The wind-up used to
   * be detected as a transition — "the cooldown crossed `ELITE_TELEGRAPH` this
   * frame" — and an elite only ticks that cooldown while it is in range of the
   * crowd. So an elite that arrived with its cooldown ALREADY below the
   * telegraph never crossed anything: no tell, no cast, and a swing out of
   * nowhere. Asking "has this one been announced" instead of "did it just cross"
   * cannot miss, and it is what lets the wind-up be extended to a full window
   * when it is short.
   */
  sweepTold: boolean

  // ─── Per-KIND state ───────────────────────────────────────────────────────
  //
  // An elite is one of several fights now (`MinibossKind`), and `kind` selects
  // which branch of `stepElite` owns it. Everything below is that branch's
  // scratch space: a rolling ball's lane and spin, a bomber's fuse, a gunner's
  // reload. They live on the one struct rather than in per-kind maps because a
  // foe is already a bag of fields the sim walks every frame, and a parallel map
  // keyed by id is a second lifetime to get wrong.
  //
  // Each is meaningful only for the kind that owns it, and every kind must leave
  // the others alone.
  kind: MinibossKind
  /** Which side of the road a `roller` came down, -1 or 1. Never 0: the middle
   *  is the one lane a rolling ball may not use. */
  lane: number
  /** Seconds left on a `bomber`'s fuse once it has planted, or 0. */
  fuse: number
  /** Seconds until a `gunner`'s next bolt. */
  reload: number
  /** Free per-kind counter — shots taken, bounces, dives spent, whatever the
   *  branch needs. */
  kindTicks: number
  /**
   * Where this kind's attack has LOCKED, in world space, or 0/0 if it has not.
   *
   * Two of the late kinds aim at ground rather than at the crowd — the warden's
   * slot and the burrower's eruption — and both have to answer the question every
   * wind-up in this game answers: is the place the player was shown the place
   * that bills them? Recomputing it at impact from `anchorX` would say no, every
   * time, because the crowd has spent the whole wind-up moving.
   *
   * On the FOE rather than in module scratch, and that is the same call the note
   * above makes for `lane` and `fuse`: `minibossKindFor` cycles the pool by index
   * so one road cannot currently field two wardens, and a module-level mark that
   * relies on that is a bug waiting for the day somebody widens the pool or
   * places a fourth elite. A field cannot be aliased by a second body.
   */
  markX: number
  markY: number
  swayPhase: number
  /**
   * A miniboss: bigger, tankier, worth real coins, and announced in the HUD.
   *
   * They exist to break the stage into digestible fights. A stage whose only
   * climax is the end boss asks the player to hold their nerve for forty
   * seconds; a stage with two minibosses gives them two wins on the way there,
   * and a wipe at a miniboss costs far less progress than a wipe at the boss.
   */
  elite: boolean
}

export interface Boss {
  /**
   * Which fight this is (`BossKind`). Selects the branch of `stepBoss` that owns
   * it; every branch is responsible for its own telegraph and for leaving the
   * others' scratch alone.
   */
  kind: BossKind
  /** Attacks thrown, for the kinds that count them — the healer heals on every
   *  third. Distinct from `slams`, which drives the meteor's rage curve. */
  attacks: number
  /** Seconds until the next summon wave, for `summoner`. */
  summonCd: number
  /**
   * Seconds until the next FLANK body, for a summoner whose wave budget is
   * spent and whose crowd is down to a handful — see `SUMMON_MERCY_SQUAD`.
   *
   * Separate from `summonCd` on purpose: that one is the wall's clock and is
   * also what a guard phase re-times, so sharing it would let a phase turn
   * re-time the mercy trickle (or the trickle swallow a phase's payoff).
   */
  mercyCd: number
  /** Flank bodies called up so far. Drives the ramp that shortens the gap, so
   *  the fight's end is guaranteed rather than merely likely. */
  mercySpawns: number
  /**
   * Seconds until a heal is allowed again, for `healer`. Set to
   * `HEAL_MIN_GAP_S` the moment one lands; a heal that comes due while this is
   * still running falls through to a bolt. Counted in fight time rather than
   * in casts, because the thing it bounds is a rate — see `HEAL_MIN_GAP_S`.
   */
  healCd: number
  design: string
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  flash: number
  phase: number
  scale: number
  /** Wind-up → slam cycle, ms. */
  slamCd: number
  /** How long the current cycle started out as — the telegraph ring reads off
   *  this, so a raging boss's ring closes visibly faster. */
  slamSpan: number
  /** Slams thrown so far. Drives the rage: cadence down, radius up. */
  slams: number
  /**
   * The kind's OWN attack thrown so far — rings for a meteor, rakes for a claw.
   *
   * Separate from `slams`, which counts every swing of every shape, because the
   * charged ring is "every `CHARGED_EVERY`-th RING" and not every third swing.
   * While a fight's attacks were a fixed rotation the two were the same count;
   * with the attacks drawn from a shuffle bag (`bossVerbPool`) a swing count
   * would make the charged ring land on whatever the bag happened to put in the
   * third slot — or on nothing at all, when that slot was a shock.
   */
  primaries: number
  /**
   * Has THIS swing picked its target yet? Cleared the moment a slam fires.
   *
   * The aim used to be inferred from the cooldown crossing `SLAM_TELEGRAPH`
   * ("above it last frame, below it now"), which is only an edge while the
   * cooldown is longer than the telegraph — and rage drives the cooldown down
   * to `SLAM_CD_MIN` = 0.95 s, which is *below* the 1.0 s window. From the
   * ninth swing the crossing therefore never happened again and the boss
   * hammered one patch of empty road for the rest of the fight.
   *
   * A flag cannot drift out from under the tuning the way a threshold can: the
   * question "have I aimed for this swing" has the same answer at every
   * cadence, including cadences shorter than the wind-up (where the honest
   * behaviour is that the boss is always winding up).
   */
  aimed: boolean
  /** How many guard gates have already been spent. */
  guarded: number
  /** > 0 while the boss is planted and untouchable, waiting to swing. */
  guard: number
  /** Where the NEXT slam will land — telegraphed a beat before it fires so the
   *  player can read it and move. */
  slamX: number
  slamY: number
  /** Is the swing currently being wound up a CHARGED one? Set when the cycle
   *  begins, so the telegraph and the kill can never disagree about which swing
   *  they are describing. See `CHARGED_EVERY`. */
  charging: boolean
  dead: boolean
  dying: number
}

export interface Pickup {
  id: number
  x: number
  y: number
  /** Coins in this pickup. */
  value: number
  taken: boolean
  phase: number
}

/**
 * What took a survivor.
 *
 * Lives HERE rather than in the simulation because `Unit` carries one — the
 * renderer needs it to tell a fall from a crash — and a type on an entity in
 * this module cannot be imported from the module that steps it without a cycle.
 *
 * Kept because "why did they stop?" is unanswerable without it: a stage that
 * bleeds survivors to dividers is badly TAUGHT, one that bleeds them to foes is
 * badly TUNED, and one that bleeds them to traps is working exactly as intended.
 * The balance harness reads it, and the analytics `wipe` event bills a run's
 * loss to whichever of these took the most bodies.
 */
export type DeathCause = 'foe' | 'elite' | 'barricade' | 'crate' | 'divider' | 'trap' | 'slam'

/**
 * How long a killed survivor takes to go down, ms.
 *
 * The simulation owns this clock — `killUnit` sets `u.dying` from it and the
 * step splices the body out when it reaches zero — and the renderer scales its
 * whole fall across the same number (`survivorFallStep` in `heroSprites.ts`,
 * which re-exports this). One constant, because the failure mode of a drift is
 * silent: the fall would simply play at the wrong speed or be cut off
 * mid-topple, and read as a tuning problem rather than as a bug.
 *
 * Not longer, and that is a measured trade rather than a shrug. The renderer's
 * draw budget samples `budget / units.length`, and `units` counts the bodies
 * still falling — so a window half again as long thins the LIVING crowd by the
 * same fraction during exactly the moments a player is losing people and
 * watching hardest. The lie-still beat is bought out of the fade instead.
 */
export const SURVIVOR_FALL_MS = 420

/**
 * What `dying` is parked at once the fall is finished.
 *
 * A hair above zero, deliberately: every "is this body out of play" test in the
 * simulation is `u.dying > 0`, and a corpse has to answer yes to all of them
 * for as long as it is on the road. Letting it reach zero would put the body
 * back in the formation, back in the firing line and back in the crowd's
 * bounding box.
 */
export const SURVIVOR_REST_MS = 0.001

/**
 * How far behind the crowd a body is left before it is dropped, world units.
 *
 * Bodies used to be spliced the moment the fall finished, which is why a stage
 * that cost the player forty survivors showed no sign of it a second later. The
 * road is the record now: a corpse lies where it fell until the camera has
 * carried it off the bottom of the screen, and is only then forgotten.
 *
 * Eight units is comfortably past the edge — about thirteen and a half units of
 * road are visible at a time and the crowd rides roughly three quarters of the
 * way down it, so under four are ever behind the anchor. The margin is there so
 * nothing is ever seen to vanish.
 */
export const FALLEN_CULL_BEHIND = 8

/** The causes that are a THING the crowd ran into rather than something that
 *  reached for them. A body stopped by one of these stays crumpled against it;
 *  everything else ends prone in the open. Read only by the renderer. */
export const CRASH_CAUSES: ReadonlySet<DeathCause> =
  new Set<DeathCause>(['barricade', 'crate', 'divider'])

export interface Unit {
  /** Slot index inside the formation; also the sprite-phase seed. */
  i: number
  /**
   * Stable per-body random in [0,1). Set once at spawn and never touched again.
   *
   * It exists because `i` is NOT stable: alive units take slots in array order,
   * so every death renumbers everybody behind it. The renderer's draw budget
   * needs a key that does not move — see `drawUnits`, which keeps the subset
   * `seed < budget / n` so that a crowd too big to draw body-for-body is
   * sampled evenly across the WHOLE formation instead of being cut down to its
   * front rank. Keyed on `i`, a single casualty would reshuffle which bodies
   * are visible and the crowd would strobe.
   */
  seed: number
  x: number
  y: number
  vx: number
  vy: number
  /** Gait phase so the crowd's footfalls are not synchronised. */
  phase: number
  /** Muzzle flash timer, ms. */
  flash: number
  /** Death animation, ms remaining. `> 0` means it is falling out. */
  dying: number
  /**
   * The fall is over and the body is lying on the road.
   *
   * `dying` is held at a hair above zero for a resting body rather than allowed
   * to reach it, so every `u.dying > 0` guard in the simulation — collision,
   * shooting, formation slots, the bubble's bounding box — keeps working
   * unchanged and a corpse stays out of all of them. This flag is what the
   * RENDERER reads to know it should hold the fallen pose instead of playing
   * the fall again from the top.
   */
  down: boolean
  /**
   * What killed it, or `null` while it is alive.
   *
   * Carried on the body purely so the RENDERER can tell a fall from a crash: a
   * survivor taken by a bite goes down in the open and ends prone, and one that
   * ran into a barricade or a crate should stay crumpled against the thing it
   * hit. Both are the same fall for the first third — see `survivorFallStep` —
   * and they part at the pose the crash cuts to.
   *
   * It is a renderer input and nothing else. Nothing in the simulation reads it,
   * and nothing should: the loss has already been billed to `deaths[cause]` by
   * the time this is set, and a second source of truth for the same fact is how
   * the two drift apart.
   */
  cause: DeathCause | null
  /**
   * This survivor has already been paid out, and is no longer drawn.
   *
   * Set by `cashOutSquad` in the beat after a boss falls, when every living
   * body on the road turns into a coin and flies to the wallet. It is a
   * RENDERER flag and nothing more: the body stays in `units` so the handover's
   * carry-over formation (`entryFrom`) still reads the crowd that won the
   * stage, and `squadCount` is deliberately untouched so the HUD keeps printing
   * the number the payout was priced against while the coins are still in the
   * air. Cleared by being a fresh unit — `startStage` rebuilds the crowd.
   */
  cashed: boolean
  /** Monster-collision immunity, ms remaining. See `FOE_COLLIDE_IFRAMES_MS`. */
  inv: number
  /**
   * Seconds this survivor has left to WALK into formation, or 0 once it is in.
   *
   * Everyone else in the crowd is on a stiff spring to their slot, which is right
   * for a crowd that is already together — it reads as a squad closing ranks.
   * It is wrong for the survivors a rescue cage lets out: on that spring they
   * cross three units of road in about a fifth of a second, which reads as the
   * crowd teleporting a few bodies wider rather than as people running over to
   * join it. While this is counting down the body moves at a capped jog instead
   * (`CAGE_JOIN_SPEED`), so the rescue is something the player watches happen.
   */
  join: number
}

export interface Bullet {
  x: number
  y: number
  vy: number
  vx: number
  damage: number
  life: number
  /**
   * Which weapon fired this round, or `null` for the squad's ordinary gun.
   *
   * Carried on the ROUND rather than read from the run's state at impact,
   * because a weapon lasts to the end of the stage and a round does not: a
   * rocket already in flight when the boss dies is still a rocket, and one
   * fired a frame before a pickup must not retroactively become one. It is also
   * what the renderer draws off — see `drawBullets`.
   */
  weapon: WeaponId | null
  /**
   * Id of the last gate leaf this round passed through, or -1.
   *
   * Rounds are NOT consumed by gates (see `resolveBullet`) — a gate is an open
   * doorway with a curtain, not a wall — but the curtain should spark once as
   * the round goes through it, not on every frame the round spends inside the
   * doorway's depth. This is the "once" .
   */
  pierced: number
}
