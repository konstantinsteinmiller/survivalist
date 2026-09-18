// The road's width, which the roller's geometry is derived from rather than
// duplicating. `survival.ts` imports only TYPES from this file, so that import
// is erased at build time and this one is not a cycle.
// The claw's geometry is DERIVED from the crowd's own disc (see `CLAW_SPACING`),
// so this file reads the one number that defines it rather than repeating it.
// `survival.ts` imports back from here, but only `import type` — erased before
// runtime — so there is no module cycle.
import { CROWD_MAX_R, ELITE_HOLD_AHEAD, LANE_HALF, SLAM_RADIUS_GROWTH } from '@/game/survival'

/**
 * ─── The threat pools ───────────────────────────────────────────────────────
 *
 * Which KIND of miniboss and which KIND of boss a stage fields.
 *
 * The fight was the same fight every stage: an elite that plants and sweeps a
 * scythe in front of itself, then a boss that drops meteors. Both read well the
 * first time and neither has anything left to show by stage six — the road keeps
 * changing and the two things the road is building up to do not, which is the
 * shape of a game people stop playing rather than lose.
 *
 * So each becomes a pool, and the pool opens at `THREAT_POOL_FROM_STAGE`.
 *
 * ── Why nothing new before stage 4 ──
 *
 * The opening three stages are a tutorial (see the relief curves in
 * `survival.ts`) and their whole job is to teach ONE elite and ONE boss well
 * enough that the player knows what a wind-up looks like. Variety before that is
 * not richness, it is noise: a player who has not yet learned that the ring on
 * the ground is dodgeable cannot learn it from three different rings. The pool
 * is the reward for having learned the grammar, not the grammar itself.
 *
 * ── Why the choice is derived, not rolled ──
 *
 * A stage is a pure function of its number everywhere else in this game, and it
 * has to stay one: a player who wipes on stage 7 must be able to LEARN stage 7
 * rather than re-roll it. Cycling by stage also guarantees the player meets each
 * kind before meeting any of them twice.
 */

/**
 * Miniboss behaviours. `scythe` is the original: plant, wind up, sweep.
 *
 * The last two arrive later than the rest — see `MINIBOSS_TIER2_FROM_STAGE`.
 */
export type MinibossKind =
  | 'scythe' | 'roller' | 'bomber' | 'gunner'
  | 'warden' | 'burrower'

/** Boss behaviours. `meteor` is the original: aim, drop a rock, slam. */
export type BossKind = 'meteor' | 'claw' | 'healer' | 'summoner'

/** Below this stage the game fields only the two the tutorial taught. */
export const THREAT_POOL_FROM_STAGE = 4

/**
 * The pools, in the order a player meets them.
 *
 * `scythe` and `meteor` stay in their pools rather than being retired: the
 * original fight is still a good fight, and a variant only reads as a variant
 * against something familiar.
 */
export const MINIBOSS_POOL: readonly MinibossKind[] = ['roller', 'bomber', 'gunner', 'scythe']
export const BOSS_POOL: readonly BossKind[] = ['claw', 'healer', 'summoner', 'meteor']

/**
 * ─── …and the tier the pool grows into ──────────────────────────────────────
 *
 * Four elites is enough variety to stop a stage being one fight, and it is not
 * enough to stop a CAREER being four. A player who reaches stage 20 has met
 * every elite the game has four times over, and the complaint that follows is
 * not "this is hard", it is "I have seen this" — the same failure the pool was
 * built to fix, arriving one rotation later.
 *
 * So the pool grows once more, and the two it grows by are deliberately the two
 * questions the first four never ask:
 *
 *   WARDEN    where is the GAP. Every other attack in this game marks ground to
 *             leave; this one marks the whole road except one slot and asks the
 *             player to be IN it. It is the first hazard in the game whose
 *             answer is a place to stand rather than a place to vacate, and that
 *             inversion is worth a whole fight on its own.
 *   BURROWER  which WAY are you going. The bomber commits to where the crowd was
 *             and is answered by one lure and one crossing; this one tracks the
 *             crowd for the whole of its dive and is answered by not stopping —
 *             so the rails become the fight, because a crowd that runs out of
 *             road has to turn around into the thing chasing it.
 *
 * ── Why stage 9, and why the number is derived ──
 *
 * `MINIBOSS_TIER2_FROM_STAGE` has to clear stage 5, and that is a BAKING
 * constraint rather than a pacing preference. A miniboss's body is its fight
 * (`MINIBOSS_DESIGN`), so a new kind means a new strip on the road — and the
 * roster already carries both of these from stage 5 (`bonecap` arrives with the
 * husks on stage 2, `skewer` with the flyers on stage 5). Opening the tier after
 * that costs the loader exactly nothing, where opening it on stage 4 would add
 * two strips to the one stage that has just started fielding variety at all.
 *
 * Nine rather than six is then the pacing half: the first tier's four kinds
 * cycle once across stages 4-7 (see `minibossKindFor`), so a stage-9 road is the
 * first one whose elites the player has genuinely learned — and a new question
 * is a reward for having learned the old ones, not a replacement for them.
 */
export const MINIBOSS_TIER2_FROM_STAGE = 9

/**
 * The full pool, and the ORDER is load-bearing twice over.
 *
 * `minibossKindFor` walks a pool by stage and by the elite's index on the road,
 * so a stage fields a WINDOW of it — three consecutive entries for most roads
 * (see `placeMinibosses`), six only past stage 40. What sits where therefore
 * decides both which fights open the tier and which fights share a road.
 *
 *   • THE LATE ARRIVALS GO FIRST, so stage 9 — the road the tier opens on —
 *     fields the warden and the burrower together. A tier whose new fights turn
 *     up four stages after it opened is a tier the player meets by accident.
 *   • THE SCYTHE GOES THIRD, which is the least obvious entry here and the one
 *     a future edit is most likely to undo. Three of the six kinds are
 *     deliberately NOT a solid body for the whole of their fight — a roller
 *     never is, an armed bomber stops being one, and a submerged burrower has no
 *     body on the road at all — and with those three adjacent there are windows
 *     that contain nothing else. A road whose every landmark can be walked
 *     through for part of its fight is a road with no anchor on it: the crowd
 *     never has to route around anything, and the stage reads as a series of
 *     effects rather than as a series of fights. At index 2 the scythe or the
 *     gunner lands in every window the rotation produces.
 */
export const MINIBOSS_POOL_LATE: readonly MinibossKind[] =
  ['warden', 'burrower', 'scythe', 'roller', 'bomber', 'gunner']

/** Which pool stage `stage` draws its elites from. */
export const minibossPoolFor = (stage: number): readonly MinibossKind[] =>
  stage >= MINIBOSS_TIER2_FROM_STAGE ? MINIBOSS_POOL_LATE : MINIBOSS_POOL

/**
 * Which miniboss kind stage `stage` fields for its `index`-th elite.
 *
 * `index` matters because a stage can carry up to three (see `placeMinibosses`),
 * and meeting the same one twice on one road wastes half of what the pool is
 * for.
 */
export const minibossKindFor = (stage: number, index = 0): MinibossKind => {
  if (stage < THREAT_POOL_FROM_STAGE) return 'scythe'
  const pool = minibossPoolFor(stage)
  // Counted from the stage the POOL opened rather than from a fixed four, so the
  // tier's first road is the front of its own pool — see `MINIBOSS_POOL_LATE`.
  // Offset by the stage so consecutive stages do not open with the same one, and
  // by the index so one road never repeats itself.
  const from = stage >= MINIBOSS_TIER2_FROM_STAGE
    ? MINIBOSS_TIER2_FROM_STAGE
    : THREAT_POOL_FROM_STAGE
  return pool[(stage - from + index) % pool.length] ?? 'scythe'
}

/**
 * ─── The model IS the tell ──────────────────────────────────────────────────
 *
 * One monster design per fight, permanently. A player who has met Snaggletusk
 * once knows the next one cleaves the ground in front of it, and can be moving
 * before the wind-up starts.
 *
 * Without this the two were independent: the design came from whichever
 * archetype the track happened to place (`brute` → Snaggletusk, `hound` →
 * Cinderhound) and the kind came from the stage cycle, so the same body fought
 * four different ways and nothing about a miniboss could be learned in advance.
 * Every OTHER threat in this game is a pure function of the stage for exactly
 * that reason — see the note at the top of this file — and the elites were the
 * one place the rule was not carried through to what the player actually sees.
 *
 * The pairing is also a silhouette argument, not just a lookup:
 *
 *   • SNAGGLETUSK — low, heavy, tusked, front-loaded. It cleaves what is in
 *     front of it. The oldest fight, and the body reads as a charge.
 *   • THORNWICK — tall, rooted, a canopy for a head. It does not close; it
 *     stands off and fires. The one design that cannot plausibly rush you.
 *   • CINDERHOUND — burning, quick, throws itself forward. It plants the bomb
 *     and leaves. Fire is already its whole read.
 *   • RATTLEJACK — the light hound-weight body, for the ball that owns a lane.
 *   • BONECAP — the mushroom IS the shield. A fungal cap slammed down across the
 *     road is the one silhouette in the cast that reads as a wall with a gap in
 *     it before anything has been telegraphed, which is exactly what the warden
 *     needs the player to already suspect.
 *   • SKEWER — the wyrmling, "almost entirely the pointy end". The only body in
 *     the cast that a player would believe goes UNDER the road, and the only one
 *     whose whole shape is the thing that comes back out of it.
 *
 * Kept beside the pool because they are one decision: adding a fifth kind means
 * adding a fifth body here, and a kind with no body of its own would silently
 * reuse another's and undo the lesson.
 *
 * Both late bodies are drawn from designs the ROSTER already carries by the
 * stage their tier opens (`bonecap` with the husks, `skewer` with the flyers) —
 * see `MINIBOSS_TIER2_FROM_STAGE`. That is not a coincidence to be tidied away
 * later: it is why the tier costs the loader nothing, and `minibossIdentity`
 * asserts it so a future re-body cannot quietly put a fresh strip in front of a
 * stage-9 player.
 */
export const MINIBOSS_DESIGN: Readonly<Record<MinibossKind, string>> = {
  scythe: 'snaggletusk',
  gunner: 'thornwick',
  bomber: 'cinderhound',
  roller: 'rattlejack',
  warden: 'bonecap',
  burrower: 'skewer'
}

/** The body that always carries `kind`. */
export const minibossDesignFor = (kind: MinibossKind): string => MINIBOSS_DESIGN[kind]

/**
 * Every miniboss body stage `stage` can put on screen — what the baker has to
 * have ready before the road starts.
 *
 * Deliberately conservative rather than exact. A stage fields between one and
 * six elites and the kind cycles with the index, so from `THREAT_POOL_FROM_STAGE`
 * on it is simplest and safest to assume all four; working out the precise count
 * would mean duplicating `placeMinibosses`'s rules in a second file, where they
 * would rot apart. The cost is at most two extra strips on stages 4-6 — from
 * stage 7 the brute archetype puts both of its designs in the roster anyway.
 */
export const minibossDesignsFor = (stage: number): string[] =>
  stage < THREAT_POOL_FROM_STAGE
    ? [MINIBOSS_DESIGN.scythe]
    : [...new Set(minibossPoolFor(stage).map((k) => MINIBOSS_DESIGN[k]))]

/** Which boss kind stage `stage` ends with. */
export const bossKindFor = (stage: number): BossKind => {
  if (stage < THREAT_POOL_FROM_STAGE) return 'meteor'
  const n = BOSS_POOL.length
  // Strided so the boss and the stage's first miniboss are rarely the same
  // "flavour" of fight on the same road — a projectile boss after a projectile
  // elite is one idea twice.
  return BOSS_POOL[((stage - THREAT_POOL_FROM_STAGE) * 3) % n] ?? 'meteor'
}

// ─── The three new elites ───────────────────────────────────────────────────
//
// Every number below lives here rather than in `survival.ts` for one reason:
// these fights are a POOL, and a pool is a thing that grows. Keeping the whole
// of a kind's tuning beside the kind it belongs to means the next one added
// costs one block in one file instead of a scattering across the rules.
//
// They share the shape of everything else in this game that hits a crowd:
//
//   • the toll is a SHARE of the current squad, never a flat count, because a
//     flat number is terrifying at thirty survivors and invisible at a thousand
//     (see `biteShareFor`);
//   • GEOMETRY decides whether the hit lands and who it reaches, the SHARE
//     decides what it costs once it has — which is exactly how the boss's slam
//     already works, radius for the connection and fraction for the price;
//   • the wind-up is announced once, at its START, carrying the exact seconds
//     to impact, so a telegraph can never arrive after the damage does.

// ─── roller ─────────────────────────────────────────────────────────────────
//
// A giant metal ball rolling down ONE straight line at the crowd. It is the
// game's only pure steering question: there is nothing to aim, nothing to read
// and no DPS trade to make — it comes down the left half of the road or the
// right half, and the answer is to not be in that half.
//
// ── Why it may never be in the middle ──
//
// The ball is half the road across, so a lane straddling the centre would leave
// two 2.25-unit strips either side, and the crowd is 3.3 across at full size
// (`CROWD_MAX_R` × 2). A centred ball is therefore an undodgeable ball, and an
// undodgeable ball is a tax with a rolling animation. On a side it leaves a
// clear 4.5 — the whole crowd with room to spare — which is what makes "get out
// of the way" a real instruction rather than an aspiration.
//
// ── Why it may never track ──
//
// Everything else on this road homes on the crowd, which is right for a monster
// and wrong for a rock: a ball that steered would turn the one hazard whose
// entire message is "this line, right here" into another thing that follows you,
// and the player would learn that moving does not work. `stepFoes` REWRITES its
// `x` from its lane every tick rather than merely declining to home, so the
// guarantee is a property of the code and not of a line somebody forgot.

/**
 * Radius of the ball, world units.
 *
 * Half the road is `LANE_HALF` = 4.5 across, so the ball is 4.5 in diameter and
 * 2.25 in radius: it covers exactly one half of the road, with no gap and no
 * overlap. Derived rather than typed out, so a change to the road's width cannot
 * leave the ball the wrong size for the lane it is supposed to own.
 */
export const ROLLER_R = LANE_HALF / 2

/**
 * The centre line of the ball's lane, for side `lane` (−1 left, +1 right).
 *
 * `lane` is never 0 — see `Foe.lane`. Zero would put the ball across the middle,
 * which is the one place it may not be.
 */
export const rollerLaneX = (lane: number): number => (lane < 0 ? -1 : 1) * (LANE_HALF / 2)

/**
 * Which side stage `stage`'s `index`-th roller comes down.
 *
 * Derived from the stage, NOT rolled. A stage is a pure function of its number
 * everywhere else in this game so that a player who wipes on stage 7 can learn
 * stage 7 rather than re-roll it, and a coin flip on which half of the road is
 * lethal is the worst possible place to break that promise: it is the one hazard
 * whose entire content is which side it is on.
 */
export const rollerLaneFor = (stage: number, index = 0): number =>
  (stage + index) % 2 === 0 ? -1 : 1

/**
 * How fast the ball rolls down the road, world units per second.
 *
 * It closes on the crowd at this PLUS the stage's run speed — about 8.5 u/s on
 * stage 4 — and the road visible ahead of the crowd is `CROWD_SCREEN_Y` ×
 * `VIEW_HEIGHT` ≈ 13.7 units. So it is on screen for a little over a second and
 * a half before it arrives, against a crowd whose anchor crosses the whole lane
 * in about a third of a second. That is the margin the dodge is priced at: two
 * reaction times, not five.
 *
 * Deliberately slower than a hound. A ball that outran the eye would read as
 * unfair however wide the free lane beside it was.
 */
export const ROLLER_SPEED = 3.4

/**
 * Share of the current squad one roll takes off whoever it rolls over.
 *
 * ── Why this is a share and not "everyone it touches" ──
 *
 * The obvious thing was tried first: the ball is solid, solid means whoever
 * touches it dies, and the rest of the swarm flows past (the rule every other
 * solid thing in the lane follows). Measured, that is not a hazard, it is a
 * delete key — the footprint is 4.5 across and the crowd is 3.3, so ANY contact
 * covers the entire squad. Stage 4 lost 100 % of the crowd on every seed and
 * three career invariants in `tests/sim/balance.test.ts` went with it.
 *
 * So the ball is priced like every other big attack here: geometry decides
 * whether it caught you, the share decides what that costs. The DODGE stays
 * total — clear of the lane is clear, full stop — which is the part the design
 * actually asked for. What is bounded is the failure.
 *
 * 0.3, against the boss's 0.31 slam and the scythe's 0.2 sweep. It sits at slam
 * weight because it is a slam-shaped threat: one connection, wholly avoidable,
 * announced from further off than anything else in the game. And it bills ONCE
 * per ball, so a roller costs less over a whole fight than a scythe that lands
 * both of its sweeps.
 */
export const ROLLER_FRACTION = 0.3

/**
 * The part of the footprint that is the STONE, as a fraction of `ROLLER_R`.
 *
 * Everything whose centre is inside it dies, with no budget and no share — the
 * claw's core rule, and for the same reason the game's oldest solid already
 * works that way. `crushAgainst` takes EVERYONE who touches a boulder, because
 * a boulder stands still and the whole cost is therefore the line the player
 * chose. The ball IS a boulder (`still('round', 'roller', 'The rolling
 * boulder')`); the only difference is that this one comes to the line rather
 * than waiting on it, and it announces itself from further off than anything
 * else in the game.
 *
 * `stepPoolElite` has always said what this fight is — *"WHICH SIDE ARE YOU ON.
 * Half the road, one straight line, no tracking. The dodge is total and so is
 * the failure to dodge."* A bounded share was the one part that did not mean it:
 * a crowd standing dead in the lane kept 59 % of itself, which reads as the
 * stone rolling THROUGH the squad rather than over it.
 *
 * The band between the stone and `ROLLER_R + UNIT_R` stays a share — a survivor
 * clipped at the edge was not rolled over — and this is the one dial that moves
 * the fight without touching the geometry the dodge is built on.
 *
 * HALF THE STONE, AND THE VALUE IS MEASURED RATHER THAN CHOSEN. 1 — everyone
 * inside the whole footprint — is what the fight's own description asks for and
 * it is too much: the balance suite walls a competent player who declines the
 * ×3 at stage 7 against a floor of 10, and a merely GLANCING clip starts costing
 * 20 % where the ceiling for a graze is 15 %. Both hold at 0.5 and both break
 * again by 0.65, so this sits with margin rather than on the edge. Re-run
 * `balance.test.ts` and `glancingBlow.test.ts` before raising it.
 */
export const ROLLER_CORE_FRACTION = 0.5

/** Radius of the lethal core: the stone itself, in world units. */
export const rollerCoreR = (): number => ROLLER_R * ROLLER_CORE_FRACTION

/**
 * How far ahead the ball raises the corner warning.
 *
 * Slightly beyond the visible road, so the badge is already up as the ball comes
 * over the top edge of the screen. The badge's job is to move the player's eye
 * to the road, and it can only do that BEFORE there is something to see there.
 */
export const ROLLER_WARN_AHEAD = 14

// ─── bomber ─────────────────────────────────────────────────────────────────
//
// It sprints at the squad, plants, burns a fuse, and takes half of everyone
// standing near it. The whole fight is one idea: it comes to WHERE YOU ARE, so
// where you are is the thing you get to choose. Lure it to one rail, then cross
// to the other.
//
// ── Why the lure is load-bearing ──
//
// `steerTo` clamps the crowd's anchor to ±(LANE_HALF − 0.4) = 4.1, so from the
// centre line the biggest move available is 4.1 and from one rail it is 8.2.
// The distance that actually matters is not that number, though — it is how far
// the NEAREST surviving body ends up from the blast, and the crowd has depth as
// well as width. Measured on stage 5, at the moment the fuse runs out:
//
//   waited on the centre line, then ran for a rail   nearest body 3.06 away
//   lured it to one rail first, then crossed          nearest body 6.96 away
//
// `BOMBER_BLAST_R` sits between them, which is the fight: the lure is a clean
// escape and the late scramble is not. Both numbers are asserted directly in
// `tests/game/minibossPool.test.ts` — as outcomes, so the claim is re-measured
// rather than re-asserted — so a tuning pass cannot quietly turn the bomber into
// either a free hit or an unavoidable one.

/**
 * How fast it closes, world units per second.
 *
 * Faster than the crowd runs, because a bomber that could be outrun forwards
 * would be answered by doing nothing at all. Closing speed is this plus the
 * stage's run speed, so the approach is about two seconds from the top of the
 * screen: long enough to shoot at, short enough to read as a sprint.
 */
export const BOMBER_SPEED = 6.2

/**
 * How fast it may slide sideways while chasing, world units per second.
 *
 * Deliberately far slower than the crowd's own anchor, which settles a
 * full-lane move in about a third of a second (`STEER_SPRING` = 13). That gap IS
 * the lure: the bomber commits to where the crowd was, and the crowd can always
 * be somewhere else by the time it arms. A bomber that tracked as fast as the
 * player steers would be a coin flip on reaction time instead of a plan.
 */
export const BOMBER_TRACK = 4

/**
 * How far in front of the crowd it stops, world units.
 *
 * It stops SHORT rather than arriving on top of the squad, and that is geometry
 * rather than flavour. A bomber planted inside the crowd would be dodged by the
 * crowd's own forward motion — the road carries the squad ~5.4 units during the
 * fuse, which is more than the blast is wide — so the attack would resolve
 * itself and the player would learn that bombers do nothing. Planted 3.2 ahead
 * and holding the road (see `stepFoes`), the crowd walks INTO the blast unless
 * it steers, which is the sentence the fight is trying to say.
 */
export const BOMBER_PLANT_GAP = 3.2

/**
 * Seconds between planting and going off.
 *
 * A second is a long telegraph by this game's standards — the scythe gets 0.3,
 * the boss 1.0 — and it is priced for the move it asks for: crossing the road is
 * the biggest input the game has, and the fuse has to cover the crowd's settle
 * time as well as the player's reaction.
 */
export const BOMBER_FUSE = 1

/**
 * Blast radius, world units.
 *
 * Sits between the two measured escapes in the note above: comfortably past the
 * 3.06 a late scramble off the centre line buys, comfortably short of the 6.96 a
 * lure buys. See that note — this number is the fight.
 *
 * It was 2.6 first, from the arithmetic alone (`BOMBER_BLAST_R + CROWD_MAX_R`
 * against the 4.1 the steer clamp allows), and the arithmetic was wrong because
 * it only counted WIDTH. The bomber plants ahead of the crowd, so at the moment
 * it goes off the nearest body is a diagonal away, not a sideways one — 3.06
 * rather than 2.45 — and 2.6 measured as a totally clean dodge from the centre
 * line, which is exactly the free hit this fight must not be.
 *
 * Bigger than anything else that lands on the ground here except a charged boss
 * swing (5.1), and that is proportionate: it is the only attack in the game that
 * comes to where you are standing.
 */
export const BOMBER_BLAST_R = 3.6

/**
 * Share of the current squad one detonation takes.
 *
 * ── "Fixed", and what that does and does not mean ──
 *
 * Fixed in SHAPE: a flat share of whatever the squad currently is, and
 * deliberately NOT scaled by `endlessPressure` the way the sweep and the slam
 * are. There is nowhere for that dial to push it — 0.5 is already
 * `SLAM_FRACTION_MAX`, the documented ceiling past which "a percentage attack is
 * a coin flip on whether the run continues rather than a hit that can be played
 * around". The bomber opens at the ceiling and stays there for the whole endless
 * road.
 *
 * It is NOT fixed against the two concessions every other percentage attack in
 * this game passes through — `earlyBigHitMul` and `slamReliefFor`. That is a
 * deliberate call, and the argument is the one that put the sweep through them:
 * those two are not difficulty knobs, they are the onboarding cut and the
 * anti-wall relief, and a player who has lost the same stage four times is being
 * helped by every other channel that takes survivors away. Exempting one attack
 * would make the bomber the single thing on the road a stuck player gets no help
 * against — and it would be the newest, least-understood thing there.
 *
 * The counter-argument is real and worth recording: the dodge is total, so
 * softening it can teach a stuck player that standing still is survivable. It is
 * outweighed because the relief bottoms out at ×0.42, and a blast that still
 * takes a fifth of the crowd is nobody's idea of free.
 */
export const BOMBER_FRACTION = 0.5

// ─── gunner ─────────────────────────────────────────────────────────────────
//
// It holds at range and fires a slow, fat bolt down the road. The bolt kills the
// survivors it passes THROUGH — it is a line, not a circle — so the crowd's own
// width is what it costs, and stepping the crowd out of the line costs nothing
// at all.
//
// It is the third of three deliberately different questions. The scythe crosses
// the whole road and asks "how hard do you hit"; the roller owns half the road
// and asks "which side are you on"; the gunner draws one line through the middle
// of wherever you happen to be standing and asks "are you still there".

/**
 * How far in front of the crowd it plants, world units.
 *
 * Further out than any other elite (`ELITE_HOLD_AHEAD` is 2.4), and the fight
 * cannot do without it: the bolt's flight IS the dodge window, so the flight has
 * to be long enough to be one. At 5 units and `BOLT_SPEED` the round is in the
 * air for about three quarters of a second on top of its wind-up.
 *
 * It sits just inside `ELITE_DRAG_LEAD` = 6, so the road winds down to roughly
 * two thirds speed during the fight rather than to the crawl a scythe imposes —
 * a stand-off should feel like being held at arm's length, not like being pinned.
 */
export const GUNNER_STANDOFF = 5

/**
 * Seconds between locking the shot and firing it.
 *
 * The aim is locked at the START of this window, exactly as the boss locks its
 * slam, so the line the player is shown is the line the bolt will take. Half a
 * second is short of the boss's full second because the bolt then spends another
 * three quarters travelling, and the warning the player answers is both.
 */
export const GUNNER_TELEGRAPH = 0.55

/**
 * Seconds between shots.
 *
 * Against `ELITE_HOLD_MAX` = 3 this is two bolts a fight, the same budget the
 * scythe's 1.5 s cadence gets. Two announced attacks is enough for the player to
 * get the second one right after reading the first.
 */
export const GUNNER_RELOAD = 1.5

/** Bolt speed, world units per second. Slow on purpose — it is a thing to be
 *  stepped out of, not a hitscan. */
export const BOLT_SPEED = 7

/**
 * Bolt radius, world units.
 *
 * Fat, as the brief asks: a 1.1-unit-wide round against a 3.3-unit-wide crowd is
 * visibly a third of the squad's frontage, which is what makes it readable at a
 * glance on a phone. Clearing it entirely takes `BOLT_R + CROWD_MAX_R` = 2.2 of
 * lateral travel, which the crowd covers inside the wind-up alone.
 */
export const BOLT_R = 0.55

/**
 * Share of the current squad one bolt may take.
 *
 * The bolt only ever kills survivors it actually passes through, so this is a
 * CEILING on a geometric toll rather than a bill of its own. It exists because
 * the geometry alone is too sharp: a 1.1-wide swath through a 3.3-wide disc
 * covers 62 % of the bodies in it, which is a run-ender for one missed step and
 * worse than anything else in the game, the boss included.
 *
 * 0.22 × two bolts a fight ≈ the scythe's two sweeps at 0.2. A partial dodge
 * still pays partially, because the swath decides who is even eligible — this
 * only caps the top.
 */
export const GUNNER_FRACTION = 0.22

/** How long a bolt lives before it gives up, seconds. A backstop only: a bolt
 *  normally ends by leaving the road behind the crowd or by spending itself. */
export const BOLT_LIFE = 4

/** How far behind the crowd a bolt is still worth simulating. */
export const BOLT_TRAIL = 12
// ─── What each boss kind costs, before it is played ─────────────────────────

/**
 * Health multiplier for a boss kind, on top of `bossHpScale`.
 *
 * A kind is not just a different animation: two of the four carry EFFECTIVE
 * health that never appears on the bar. The healer puts `HEAL_FRACTION` back
 * three times, so its bar is worth x1.3 of itself; the summoner spends
 * `SUMMON_WAVES_MAX * SUMMON_PER_WAVE * SUMMON_HP_SHARE` of its own bar on
 * bodies that have to be shot at (or run from) before the bar can be. Pricing
 * that off the printed number instead of correcting for it would make the same
 * stage number mean four different fight lengths, and the one the player learns
 * the stage on would be whichever they met first.
 *
 * So the printed bar is cut by exactly what the kind gives back:
 *
 *   healer    1 / (1 + HEAL_FRACTION x HEAL_EXPECTED)
 *   summoner  1 / (1 + SUMMON_BUDGET x SUMMON_HP_SHARE)
 *
 * The summoner's is exact — every body it fields is health it definitely spends.
 * The healer's is not, and that is what `HEAL_EXPECTED` is for: it is priced on
 * the heals a fight ACTUALLY sees rather than on the cap, because pricing on the
 * cap charges every player for three heals and only a losing one ever meets the
 * third.
 *
 * The claw is 1 on purpose: its rake is priced at exactly a slam's share and
 * lands on the same cadence, so it adds no health, only a different question.
 */
export const bossHpMulFor = (kind: BossKind): number => {
  switch (kind) {
    case 'healer': return 1 / (1 + HEAL_FRACTION * HEAL_EXPECTED)
    case 'summoner': return 1 / (1 + SUMMON_BUDGET * SUMMON_HP_SHARE)
    default: return 1
  }
}

/**
 * ─── What a guard phase turns into, per kind ────────────────────────────────
 *
 * A guard gate is a FLOOR on how long the climax lasts: the boss plants, goes
 * immune, and pays the phase off (see `bossGuardGates`). It is a BARGAIN — the
 * player forfeits damage, the boss owes them a beat — and every kind keeps it,
 * but what the beat IS differs, and that is the whole per-kind decision.
 *
 *   meteor / claw — a swing, unchanged. Overwhelming DPS may not skip the fight,
 *                   and the swing it is made to throw is dodgeable, so the phase
 *                   costs a good player nothing but time.
 *   healer        — a cast, and the gate is load-bearing rather than inherited.
 *                   Measured on the shared cadence the healer's fight is about
 *                   two casts long, so an every-third heal never fires once and
 *                   the whole archetype is dead code; the gates are what buy the
 *                   third cast. That the heal then pushes the bar back ABOVE a
 *                   gate already spent is not a bug: it is the only moment in
 *                   the game where a health bar goes up, and it is the point of
 *                   the creature. `guarded` has already been incremented, so the
 *                   same gate can never re-arm.
 *   summoner      — a WAVE. This is the one that had to be thought about rather
 *                   than inherited. The first pass gave the summoner no gates on
 *                   the grounds that a boss with no attack has nothing to pay a
 *                   phase off with, and measured, that made it a non-fight: at a
 *                   tuned build it died in 0.73 s having spent ZERO waves, so
 *                   the player never met a single skeleton and the archetype
 *                   existed only in the source — the same failure as the
 *                   healer's unreachable heal, from the opposite direction.
 *                   Paying the phase with a wave fixes it without touching the
 *                   rate: the summoner's identity now shows up at least twice
 *                   however fast it dies, and `SUMMON_WAVES_MAX` still bounds
 *                   the total.
 */
export const bossGuardPayoff = (kind: BossKind): 'swing' | 'wave' =>
  kind === 'summoner' ? 'wave' : 'swing'

/**
 * ─── Phase two ──────────────────────────────────────────────────────────────
 *
 * The fight had one idea and spent it in the first four seconds. Whatever the
 * kind, everything the boss was ever going to show the player was on screen
 * before the first cooldown had finished draining, and the remaining twenty
 * seconds were the same beat at a slightly different tempo.
 *
 * ── Why it hangs off a GUARD GATE and not off a health check ──
 *
 * The obvious shape is `hp / maxHp < 0.5`, and it is wrong here for two
 * measured reasons, both of which the gates already solved:
 *
 *   • A bare threshold is not a beat. A squad of a thousand puts more than a
 *     third of the bar into a single frame (which is the entire reason
 *     `damageBoss` clamps at a gate at all), so "crossed a half" and "crossed a
 *     third" land on the SAME TICK for exactly the players who melt bosses —
 *     two full-screen flashes in one frame, and a phase two the run never
 *     actually plays. Hung off a gate, the turn is a moment the simulation
 *     already guarantees can never be skipped or doubled.
 *   • A threshold un-crosses. There is a healing archetype in the pool, its
 *     whole point is putting the bar back up, and a predicate over live health
 *     therefore flickers. `guarded` only ever counts up, so a latch driven by it
 *     is monotonic by construction rather than by a flag somebody remembered to
 *     write.
 *
 * So `BOSS_ENRAGE_AT` is a BOUND, not a trigger: the fight turns at the first
 * guard gate at or below half health. For the two gates every real stage fields
 * (`BOSS_GUARD_GATES`) that is the one at a third — which is also the one the
 * `bossRage` cue has always described as "the last third is not the same fight
 * as the first". Phase two is that sentence made true; the gate was already
 * there, and it was already the loudest beat in the fight.
 */
export const BOSS_ENRAGE_AT = 0.5

/**
 * …and the stage the turn is allowed to happen on at all.
 *
 * Stage 1's single gate sits at exactly a half (`TUTORIAL_GUARD_GATES`), so the
 * bound above would enrage the tutorial boss — the one fight in the game whose
 * boss has a single guard gate and no second phase (see `TUTORIAL_GUARD_GATES`).
 * Its ring hurts like every other ring now, but a first-timer meeting a lane
 * charge is not learning
 * what a telegraph means, they are losing a run to a move they have not been
 * taught the vocabulary for yet.
 */
export const BOSS_ENRAGE_FROM_STAGE = 2

/** Does crossing the guard gate at `gate` turn this stage's fight over? */
export const bossEnragesAt = (stage: number, gate: number): boolean =>
  stage >= BOSS_ENRAGE_FROM_STAGE && gate <= BOSS_ENRAGE_AT

/**
 * ─── Faster, but never off the end of the envelope ──────────────────────────
 *
 * The tempting version is "halve `slamCd`". It is a bug at both ends of the
 * ladder and the arithmetic says so out loud.
 *
 * The cadence already falls with every swing thrown (`SLAM_CD_DECAY`) onto a
 * floor (`SLAM_CD_MIN`, 0.95 s) that was NOT picked by feel: below it the
 * cooldown is shorter than the wind-up, so the mark the player is dodging is
 * re-locked before the previous one has landed and the whole warning the player
 * gets is the cadence itself. `SLAM_TELEGRAPH`'s note has the measurement — at
 * 0.62 s of warning a median 250 ms human cleared stage 2 zero times out of
 * however many they were given. Halving the floor puts the fight at 0.48 s,
 * which is on the wrong side of that number for everybody.
 *
 * So phase two does not move the floor. It moves the boss DOWN THE CURVE it was
 * already on: the same rage, arrived at immediately instead of over nine swings,
 * clamped by the same floor. Most fights are over well before swing nine, so
 * this bites exactly where the fight was flat and cannot reach anywhere the
 * design has not already validated.
 *
 * ── …and why the multiplier is divided by the endless pressure ──
 *
 * What one swing COSTS is already a function of the stage:
 * `SLAM_MAX_FRACTION * endlessPressure(stage)`. The crowd-loss rate a boss
 * applies is share ÷ cadence, so tightening the cadence by a flat factor
 * multiplies a number that has ALREADY been multiplied — the same "phase two" is
 * worth 0.43 crowd-shares per span at stage 4 and 0.94 at stage 120, which is
 * the "fine at stage 4, unfair at stage 40" failure written as a product.
 *
 * Dividing the tightening by the pressure the stage already carries holds the
 * ADDED rate roughly constant instead (0.43 → 0.35 across the whole ladder):
 * deep stages already press harder per swing, so they get less extra tempo, and
 * phase two is the same escalation wherever the player meets it.
 */
export const ENRAGED_CD_MUL = 0.7

/**
 * The enraged cycle length, given the cycle that would otherwise have run, the
 * pressure the stage already carries and the floor the clock may never go under.
 *
 * ── It has exactly ONE caller, and that is the finding, not an accident ──
 *
 * It shipped with three — the slam curve, the healer's cast loop, the summoner's
 * wave clock — on the reading that "faster" is a property any cycle can have.
 * Both of the other two were withdrawn after measurement, and the rule they
 * arrived at from opposite directions is the one to apply before adding a
 * fourth:
 *
 *   **A cycle may be tightened only where its COST is not derived from its own
 *   length, and only inside an envelope somebody has already measured.**
 *
 * A slam qualifies twice over: `bossHitShare` is a share per HIT rather than a
 * price per second, and `SLAM_CD_DECAY` already varies this clock across every
 * fight inside the explicit envelope `SLAM_CD_MIN` bounds — so phase two moves
 * the boss along a curve the design has walked before.
 *
 * A bolt does not: `BOLT_SHARE_MUL` is 0.6 *because* the loop is 1.7 s, with the
 * arithmetic written into its docstring, so tightening the loop re-prices the
 * attack by 43 % without anybody editing the price. A wave does not either: its
 * only safety is a total, and compressing the delivery of a fixed total is how
 * spawn pressure outruns the crowd's damage. Both are recorded where they were
 * measured — `throwHealerCast` and `summonSpan` in `useSurvivalGame.ts`.
 *
 * `floor` therefore stays a parameter rather than hard-coding `SLAM_CD_MIN`: it
 * is the question a fourth caller would have to answer out loud, and answering
 * it is most of the work of deciding whether there should be one.
 */
export const enragedSpan = (span: number, pressure: number, floor: number): number =>
  Math.max(floor, span * (1 - (1 - ENRAGED_CD_MUL) / Math.max(1, pressure)))

/**
 * ─── The lane charge ────────────────────────────────────────────────────────
 *
 * Phase two's new verb, and it is given to exactly the two kinds whose entire
 * fight is one swing.
 *
 * The healer and the summoner already have a second idea — a bar that goes back
 * up, a wall that walks at you — and both of them own a cycle that is a DECISION
 * rather than a swing: the healer's every-third is armed a cycle in advance
 * against a measured minimum gap (`HEAL_MIN_GAP_S`), and the summoner has no
 * attack clock at all, only a budget. Hijacking either to insert a charge means
 * a third thing reaching into scratch that two carefully-bounded invariants
 * already own, for a kind that did not have the problem.
 *
 * Their phase two is the COLOUR and the SOUND, and nothing mechanical. That was
 * "the tempo and the colour" for one revision and the tempo did not survive
 * measurement — see `enragedSpan`. It is not the smaller feature it looks like:
 * both archetypes are rates with hand-measured safeties bolted on, and the
 * roadmap's complaint ("the fight has one idea and reveals it in the first four
 * seconds") was never about them. It was about the two fights that are one
 * swing, and those are the two that get a verb.
 */
export const bossCharges = (kind: BossKind): boolean => kind === 'meteor' || kind === 'claw'

/**
 * The lane charge's share of phase two: at most one swing in this many.
 *
 * It was a fixed cadence — one charge every third cycle, offset from
 * `CHARGED_EVERY` so the two never wanted the same swing. The shuffle bag
 * (`bossVerbPool`) retired the cadence and kept the SHARE, and the share is a
 * ceiling rather than a quota for a measured reason: on the stages where phase
 * two has only two attacks (the ring and the charge, stages 2-7), "equally
 * often" would make every other swing a charge, and a charge is the one attack
 * whose dodge takes the crowd off the boss's column for its whole 1.5-2.2 s
 * wind-up. The weakest crowd the stage-1-5 adaptive bar is calibrated for — the
 * twelve survivors the balance suite holds to a ten-second fight — measured
 * 11.3 s at one charge in two, against its ceiling of 10. So `bossBag` pads a
 * pool that small until the charge is one draw in `CHARGE_EVERY`, exactly the
 * share every number downstream was priced at, now at a random position.
 */
export const CHARGE_EVERY = 3

/**
 * Half-width of the swathe a charge ploughs.
 *
 * Sized from the ROAD and the CROWD, the same way `CLAW_SPACING` is, because it
 * is the same failure waiting to happen: a lane attack the crowd cannot fit
 * beside is not a hard attack, it is a tax with a telegraph in front of it.
 *
 * The inequality. The crowd's centre reaches ±4.1 (`steerTo` clamps at
 * `LANE_HALF - 0.4`) and its bodies sit within `CROWD_MAX_R` of it, so to stand
 * entirely clear of a swathe centred on `bx` the player needs a reachable centre
 * `c` with `|c - bx| >= halfW + 1.65`. The worst case is a charge straight down
 * the middle, where that costs `halfW + 1.65 <= 4.1`, i.e. a ceiling of 2.45.
 * At the cap below the crowd still has 0.55 units of rail to spare, and the
 * dodge is a 3.55-unit lateral move against the slam's 3.4 — the same size of
 * decision, asked about an axis instead of a point.
 *
 * Unlike the ring, it does NOT scale with the stage, and that is the same answer
 * `CLAW_SPACING` gives: what a charge costs is `bossHitShare`, which already
 * carries the stage, the endless pressure and every relief. Widening the swathe
 * with depth would price the same attack twice and eat the pocket the dodge
 * lives in — the one thing the claw's history says never to do.
 */
export const CHARGE_HALF_W = 1.5
/** …and it fattens with the fight, exactly as the ring and the gouges do. */
export const CHARGE_HALF_W_GROWTH = 0.08
export const CHARGE_HALF_W_MAX = 1.9
/** The ONE definition of how wide a charge is — read by the kill and by the
 *  band the telegraph paints. Mirrors `slamRadiusFor` / `clawFurrowHalfW`. */
export const chargeHalfW = (slams: number): number =>
  Math.min(CHARGE_HALF_W_MAX, CHARGE_HALF_W + Math.max(0, slams) * CHARGE_HALF_W_GROWTH)

/**
 * The wind-up, as a multiple of the cycle it interrupts and a floor under that.
 *
 * The multiple is `CHARGED_WINDUP_MUL`'s, for its reason: an attack that covers
 * more ground has to be readable for long enough that leaving it was a decision
 * the player got to make. The FLOOR is the part that matters, because phase two
 * is where the cycle is shortest — at the rage floor a bare multiple would give
 * 1.6 s, and the charge is the one attack in the game whose dodge is a full
 * lateral commitment rather than a step.
 *
 * 1.5 s is the number, and it is `SLAM_TELEGRAPH`'s measurement carried across:
 * that one is 1.0 s because a median 250 ms human then has 0.75 s to make a
 * 3.4-unit move, and it was tuned up from 0.62 s where the same player cleared
 * nothing. A charge asks for 3.55 units, so it is given 1.5 s — 1.25 s of
 * steering after the same reaction latency, which is the slam's margin plus
 * two thirds of it again for the extra distance and for the fact that phase two
 * arrives while the player already has both hands full.
 */
export const CHARGE_WINDUP_MUL = 1.7
export const CHARGE_TELEGRAPH_MIN = 1.5
export const chargeWindup = (span: number): number =>
  Math.max(CHARGE_TELEGRAPH_MIN, span * CHARGE_WINDUP_MUL)

/**
 * How long the body is actually travelling, inside that wind-up.
 *
 * The charge is telegraphed the way this game telegraphs — one event at the
 * start of the wind-up carrying the exact seconds to impact — and the BODY is
 * the second half of that telegraph, which is the roller's trick applied to the
 * boss: the last third of a second before it lands, the warning is a monster
 * running at you rather than a mark on the floor. It is deliberately short. The
 * decision is made during the first second and a bit; the dash is the
 * consequence arriving, and a slow one would read as an animation rather than as
 * a charge.
 */
export const CHARGE_DASH_S = 0.38

/**
 * How far past the crowd's centre the charge carries the boss.
 *
 * It has to clear the crowd's own DEPTH (`CROWD_MAX_R * CROWD_SQUASH` is 1.19)
 * or the boss stops inside the formation and the attack reads as a bump. It also
 * has to not clear it by much: below the crowd the boss is behind every muzzle
 * in the game (`nearestTarget` only takes what is ahead of the shooter), so
 * every extra unit of overrun is a stretch of fight where the player's fire
 * silently does nothing — which is the sort of cost this game refuses to charge
 * invisibly. 1.2 buys ~0.4 s of recovery walk-back, which is short enough to
 * read as the crowd shoving it off and long enough to be worth watching.
 */
export const CHARGE_OVERRUN = 1.2

/**
 * ─── What standing in a charge costs ────────────────────────────────────────
 *
 * Three quarters of everybody it runs over, and this is the ONE attack in the
 * game whose price is a share of the bodies HIT rather than a share of the
 * crowd.
 *
 * Every other swing is priced by `bossHitShare` — about a third of the whole
 * squad, whoever it reaches — and for a ring that is right: a ring is a place,
 * the crowd is partly in it, and "a third of your people" is what being caught
 * in one means. Applied to a charge it produces the opposite of an attack. The
 * charge is a COLUMN the crowd either is or is not standing in, so a crowd that
 * eats it head-on has every body inside the swathe and still loses only the
 * third the whole-squad share allows. Measured on the shipped build, the
 * dominant reading of phase two was therefore: hold the lane, keep firing, pay
 * a third, and take the DPS you gave up by dodging instead. The dodge — the
 * 3.55-unit lateral commitment the whole 1.5 s telegraph is built around — was
 * the worse line.
 *
 * At three quarters of those hit, standing in it costs most of the run and the
 * telegraph is worth reading. A crowd that is only clipped by the edge of the
 * swathe still pays three quarters OF THE CLIPPED BODIES, which is the other
 * half of the point: the price scales with how wrong the line was, so a late
 * half-dodge is worth making.
 *
 * ⚠ It is still scaled by every relief the game applies to a big hit
 * (`bossSwingMul`, `slamRelief`) — the onboarding discount and the stuck-player
 * concession both reach it, exactly as they reach the slam. A first-timer on
 * stage 1 meets 45 % of those hit, not 75 %. This is the ceiling, not a
 * constant, for the same reason `SLAM_FRACTION_MAX` is.
 */
export const CHARGE_KILL_SHARE = 0.75

// ─── The claw ───────────────────────────────────────────────────────────────
//
// Three parallel gouges down the road with clear pockets between them. Not a
// ring: a ring asks "are you near this point", and the answer is a scramble away
// from it. A rake asks "which pocket are you in", and the answer is a COMMIT to
// one side — the same decision a gate bank asks, arriving in the one fight where
// the player has stopped steering for payouts.
//
// ── Why the spacing is derived and not drawn ──
//
// The first pass spaced the furrows at ~2.6, which is what a claw looks like.
// Measured, the pockets caught 37 % of a perfectly-dodging crowd against 38 % of
// a stationary one — the "dodge" was worth one percentage point, because a crowd
// 3.3 units across cannot fit in a 1.9-unit pocket no matter where it stands. An
// attack that cannot be answered is not a hard attack, it is a tax with a fancy
// telegraph.
//
// So the geometry runs the other way round: the pocket is sized from the CROWD'S
// DISC and the furrows are placed wherever that puts them. It looks less like a
// claw and it is a dodge.

/** How many gouges. Three is the fewest that reads as a rake and still leaves
 *  the player a choice of which pocket to take. */
export const CLAW_FURROWS = 3

/** Half-width of one gouge at the first rake — the lethal strip, and the strip
 *  the telegraph is drawn from. */
export const CLAW_FURROW_HALF_W = 0.34

/**
 * ...and it widens with every rake thrown, exactly as `SLAM_RADIUS_GROWTH`
 * widens the meteor's ring. This is the claw's half of the rage curve: a long
 * fight squeezes the pockets rather than merely arriving faster.
 */
export const CLAW_FURROW_GROWTH = 0.014
/**
 * The squeeze has a hard stop, and the stop is the invariant of the whole
 * attack: `CLAW_SPACING` is derived from THIS number, so the pocket between two
 * fully-grown furrows still holds the crowd's disc with `CLAW_DODGE_MARGIN` to
 * spare. Raise it without raising the spacing and the last third of a long claw
 * fight becomes undodgeable — silently, and only for the players who were
 * already losing.
 */
export const CLAW_FURROW_HALF_W_MAX = 0.44

/** Clear road left either side of a full-size crowd sitting in a pocket. Small
 *  on purpose: the dodge should be a commit, not a stroll. */
export const CLAW_DODGE_MARGIN = 0.15

/** Half the depth of the rake, along the road.
 *
 *  Sized to swallow the crowd's whole depth (`CROWD_MAX_R * CROWD_SQUASH` is
 *  1.19, and the rail redistribution moves a slot up to 1.3 further back) so
 *  that the claw is a purely LATERAL question. A rake the crowd could partly
 *  stand behind would turn one clean decision — which pocket — into two muddy
 *  ones. */
export const CLAW_HALF_DEPTH = 2.2

/** How hard the rake leads the crowd's drift — the same lead an ordinary slam
 *  uses, because it is the same question asked about a different shape. */
export const CLAW_LEAD = 0.35

/**
 * Distance between two gouge centres.
 *
 * DERIVED. `2 * (crowd radius + widest furrow + margin)` is the smallest spacing
 * at which a crowd parked in a pocket clears both neighbours for the whole
 * fight. Every other number here can be tuned by feel; this one is an
 * inequality, and `tests/game/bossKinds.test.ts` asserts it directly so it
 * cannot drift back to whatever looks most like a claw.
 */
export const CLAW_SPACING = 2 * (CROWD_MAX_R + CLAW_FURROW_HALF_W_MAX + CLAW_DODGE_MARGIN)

/** Half-width of the gouge about to be thrown — the ONE definition, read by the
 *  simulation that kills with it and by the telegraph that draws it. Mirrors
 *  `slamRadiusFor`. */
export const clawFurrowHalfW = (rakes: number): number =>
  Math.min(CLAW_FURROW_HALF_W_MAX, CLAW_FURROW_HALF_W + Math.max(0, rakes) * CLAW_FURROW_GROWTH)

/**
 * Where the gouges land for a rake aimed at `centre`.
 *
 * Deliberately NOT clamped into the lane. A rake aimed at a crowd hugging a rail
 * throws one of its furrows off the road, which costs that crowd one of its two
 * pockets — being cornered should cost options, and clamping the pattern back
 * on-road would hand the rail-hugger the same choice as everybody else.
 */
export const clawLaneXs = (centre: number): number[] => {
  const out: number[] = []
  const first = -((CLAW_FURROWS - 1) / 2) * CLAW_SPACING
  for (let i = 0; i < CLAW_FURROWS; i++) out.push(centre + first + i * CLAW_SPACING)
  return out
}

/** Is `x` inside any gouge of a rake? The kill test and nothing else — the
 *  telegraph draws the same strips from the same numbers. */
export const inClawFurrow = (x: number, lanes: readonly number[], halfW: number): boolean => {
  for (const lx of lanes) if (Math.abs(x - lx) <= halfW) return true
  return false
}

/**
 * The middle quarter of a gouge — where the claw does not graze but RIPS.
 *
 * The rest of a furrow is priced like every other big hit in this game: a share
 * of the crowd, capped by `bossHitBudget`, so a rake that catches a thousand
 * survivors and one that catches forty both cost about the same fraction. That
 * is the right rule for the part of the attack a crowd can be half-caught by.
 *
 * It is the wrong rule for the centre line. Down the middle of each gouge the
 * claw is through the crowd rather than across it, and a budget there means the
 * player watches the boss pass straight through their formation and take a
 * measured tithe — which reads as the attack missing.
 *
 * So the core kills EVERYTHING it touches, with no budget at all. It is
 * survivable because it is small: a quarter of a strip that is already the
 * narrowest thing the boss throws, or about 0.17 world units against a crowd
 * disc up to 3.3 across. Standing in a pocket costs nothing; drifting a little
 * costs the graze; being caught dead centre costs that column of the crowd.
 *
 * Expressed as a fraction of the FULL strip width, so "the middle 25 %" stays
 * true as `CLAW_FURROW_GROWTH` widens the gouge over a long fight.
 */
export const CLAW_CORE_FRACTION = 0.25

/** Half-width of the lethal core of a gouge, from the gouge's own half-width. */
export const clawCoreHalfW = (halfW: number): number => halfW * CLAW_CORE_FRACTION

// ─── The healer ─────────────────────────────────────────────────────────────
//
// Two casts and a heal, on a loop. It is the only creature in the game that can
// undo damage the player has already done, which makes it the one fight that is
// a genuine DPS CHECK rather than a dodging test — and that is exactly why every
// number below is bounded.

/**
 * Seconds between casts, flat.
 *
 * It has its own cadence and that is the point. On the shared slam clock
 * (`SLAM_CD_BASE` 2.4 s, raging down) the fight is about two casts long, so an
 * every-third heal never fires once — the archetype existed only in the source.
 * At 1.7 s the third cast lands at 5.1 s, and the guard gates (see
 * `bossGuardPayoff`) put a floor under the fight that guarantees the player
 * reaches it. Measured in the arena probe, the heal fires in every fight that
 * lasts as long as a boss fight is supposed to.
 *
 * ── Why not faster ──
 *
 * 1.15 s was tried first, and it is shorter than `BOLT_FLIGHT_S`: every bolt was
 * still in the air when the next one was aimed, so there was never a frame with
 * nothing incoming and the "dodge" degenerated into being caught by bolt N while
 * leaving bolt N+1. Measured against a probe that answers every telegraph
 * correctly, the healer took **92 %** of the crowd and was killed on two seeds
 * of three, against a meteor's 0 % on all three. A projectile the player is
 * supposed to step around has to leave them a frame in which to step.
 *
 * FLAT, where the meteor's cadence rages down: the healer's escalation is the
 * heal itself — a long fight literally undoes the player's work — and tightening
 * the clock as well would be two escalations pulling the same way, which is how
 * a fight stops being winnable rather than becomes harder.
 */
export const HEALER_CAST_CD = 1.7

/** Wind-up, shorter than `SLAM_TELEGRAPH` because the cadence is. A one-second
 *  tell on a 1.15 s loop means the boss is permanently winding up, which reads
 *  as no tell at all. */
export const HEALER_TELEGRAPH = 0.7

/** Every third cast is the heal. */
export const HEAL_EVERY = 3

/** ...and it puts back this much of the boss's MAXIMUM health. */
export const HEAL_FRACTION = 0.1

/**
 * The floor under the gap between two heals, in seconds of fight.
 *
 * `HEAL_EVERY` counts CASTS, and a cast is 1.7 s (`HEALER_CAST_CD`) — so on its
 * own the every-third rule lands a heal every ~5.1 s, and anything that shortens
 * the cadence shortens the gap with it. A guard gate does exactly that: it
 * re-arms the clock at `bossTelegraph`, which is shorter than a cast, so the
 * heals bunched up precisely when the player had just been locked out of doing
 * damage.
 *
 * A wall-clock floor is the honest way to say "at most this often", because the
 * thing being bounded is a RATE and a rate is per second, not per cast. A heal
 * that comes due early falls through to a bolt exactly as one past
 * `HEAL_MAX_CASTS` does — the boss never stands there doing nothing.
 */
export const HEAL_MIN_GAP_S = 10

/**
 * ...at most this many times, ever.
 *
 * The bound is the whole difference between an archetype and an unwinnable
 * fight, and it is the SAME trap the summoner's wave cap fixes wearing a
 * different costume: a heal on a loop is a regeneration RATE, and any player
 * whose DPS falls under that rate never kills the boss at all — not slowly, at
 * all. At 10 % every 10 s (`HEAL_MIN_GAP_S`) the rate is 1 % of the bar a
 * second; it was 20 % every ~5.1 s, or 3.9 %, which a genuinely under-built run
 * is below and this is not.
 *
 * Three casts turns the rate into a TOTAL: 30 % of the bar, once, and then the
 * fight is a normal fight. A cast past the cap falls through to a bolt rather
 * than being skipped — the boss never stands there doing nothing.
 */
export const HEAL_MAX_CASTS = 3

/**
 * How many heals a fight is PRICED for, against the three it may at most see.
 *
 * Measured in the arena probe: a competent build that answers the telegraphs
 * meets one heal, a build that is losing meets all three, and the guard gates
 * put the median at about two. Charging the printed bar for three would hand the
 * discount to exactly the player who never triggers them — a good one — and
 * charge the full surcharge to the player who is already losing.
 *
 * Deliberately a separate number from `HEAL_MAX_CASTS` rather than the same one
 * reused: one is a safety bound and the other is a price, and collapsing them
 * would mean a tuning pass on either silently moved the other.
 */
export const HEAL_EXPECTED = 2

/**
 * How long a bolt spends in the air, seconds — a TIME, not a speed.
 *
 * Slow is the whole attack: the crowd does not advance during the boss phase
 * (`stepAnchor` gives it no forward speed), so a bolt in flight is a second of
 * "be somewhere else" with a body to watch instead of a mark on the floor.
 *
 * ── Why a fixed time and not a fixed speed ──
 *
 * Measured in the arena probe: the boss spawns at `arenaY + 12` and walks down
 * to `BOSS_HOLD_AHEAD` at 0.85 units a second, which takes 9.6 s — longer than
 * any fight. So a real boss spends the whole fight somewhere between 12 and 6
 * units out, and at a fixed 3.2 u/s that made the dodge window anything from 1.2
 * to 3.8 seconds, decided by how far the boss happened to have walked. Under it
 * the healer's early bossBolts simply never arrived: at the tuned build, three seeds
 * out of three took **zero** bolt damage on a crowd that never moved.
 *
 * A fixed flight time is the same rule `SLAM_TELEGRAPH` is built on — the player
 * gets the same window every time, so the window is learnable — and it makes the
 * bolt visibly hurry when it is thrown from further away, which is the correct
 * read on a thing that has further to come.
 */
export const BOLT_FLIGHT_S = 1.2

/**
 * How hard the bolt leads the crowd's drift.
 *
 * Its own number rather than the slam's 0.35 or the rake's `CLAW_LEAD`, even
 * though it currently sits at the same value: a bolt is the only attack whose
 * aim is resolved at LAUNCH and then travels, so the lead is doing a different
 * job here — it decides where a straight line is pointed, not where a circle
 * lands — and the day one of the three is retuned the other two must not move
 * with it.
 */
export const BOLT_LEAD = 0.35

/** How close a survivor has to be for the bolt to go off. Smaller than the
 *  blast: the thing that trips it is a body, the thing that kills is the burst. */
export const BOLT_HIT_R = 0.5

/** ...and the burst it makes. Well under `SLAM_RADIUS`, because a bolt is the
 *  healer's ORDINARY cast and arrives about twice as often as a slam. */
export const BOLT_BLAST_R = 1.35

/**
 * What a bolt takes, as a fraction of what a slam would.
 *
 * Parity arithmetic first: a meteor lands one slam per `SLAM_CD_BASE` = 2.4 s, a
 * healer a bolt on two casts in every three of a 1.7 s loop — one every 2.55 s —
 * so equal cost per second would price a bolt at 1.06 slams.
 *
 * It is deliberately well UNDER that. The healer already charges a slow player
 * 60 % of a health bar for being slow; charging them the crowd at the same rate
 * as a meteor is the same mistake billed twice, and the compounding is what
 * turns a hard fight into an unwinnable one — the fight gets longer, so more
 * bossBolts land, so the crowd shrinks, so the fight gets longer. At 0.6 the healer
 * costs about 57 % of a meteor per second across a fight roughly 1.6x as long,
 * which lands the TOTAL within about a tenth of the control.
 */
export const BOLT_SHARE_MUL = 0.6

/** Backstop only — a bolt that hits nothing leaves the arena long before this. */
export const BOSS_BOLT_LIFE = 6

/**
 * A healer's projectile, in flight.
 *
 * It lives here rather than beside `Boss` in `survival.ts` because it belongs to
 * exactly one boss kind: an entity that only one branch of `stepBoss` can create
 * or read has no business in the file that describes the game's shared rules.
 */
export interface BossBolt {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds left before it gives up and fades. */
  life: number
  /** Blast radius, carried on the projectile so the burst and the sprite can
   *  never disagree about how big the thing that just went off was. */
  radius: number
}

// ─── The summoner ───────────────────────────────────────────────────────────
//
// It never attacks. It stands in the road making more road.
//
// ── Why the TOTAL is capped, and why tuning the rate does not work ──
//
// Spawn pressure is a RATE subtracted from the player's damage: bodies soak
// rounds and eat survivors, so above a threshold rate the boss's bar never moves
// net-downward and the fight is not hard, it is impossible. Measured at half the
// benchmark DPS an uncapped summoner was killed on no seed at all and cost 100 %
// of the squad every time — and no amount of tuning the rate fixes that, because
// the failure is that a rate has no total. It is the same shape as the healer's
// regeneration, and it takes the same fix.
//
// So the summoner has a wave budget it spends once. After `SUMMON_WAVES_MAX` the
// road stops filling and the fight becomes an ordinary fight against whatever is
// left standing, which a losing player can still win.

/** Seconds between waves. */
export const SUMMON_CD = 1.4

/**
 * ...and the longer beat before the FIRST one.
 *
 * The fight used to open with a wave 1.4 s in, on a boss that is still walking
 * into the arena. Measured against an under-geared squad that beat the other
 * three kinds for 17-29 s, the summoner took the whole crowd in 8.5 s — because
 * at one wave per `SUMMON_CD` the entire budget is on the road inside nine
 * seconds. That is not a wall building, it is a dump, and the player never gets
 * a frame in which to read what the fight is asking of them.
 *
 * The extra second is spent on the one thing this boss has to teach before it
 * starts: bones come up out of the road AHEAD of you, and you can shoot them.
 */
export const SUMMON_OPENING_CD = 2.4

/** How long a summoner stands planted and immune before a guard phase's wave
 *  claws its way up. The phase turn's own tell — long enough to read as the
 *  fight changing, short enough that it is never a wait. */
export const SUMMON_TELEGRAPH = 0.9

/** Bodies per wave, ON AVERAGE — the size the budget is priced at. The wave a
 *  player actually meets comes from `SUMMON_WAVE_RAMP`. */
export const SUMMON_PER_WAVE = 4

/** ...and how many waves it may EVER field. The bound, not a pacing number. */
export const SUMMON_WAVES_MAX = 6

/**
 * How the budget is spread across those waves.
 *
 * Six flat fours put every body on the road inside the first nine seconds, and
 * measured against an under-geared squad that survived 17-29 s of every other
 * kind at the same health, the summoner took the crowd in 8.5 s. The opening is
 * what costs the player the fight: they meet four bodies before they have seen
 * what this boss does, and never get a beat in which to learn it.
 *
 * So the OPENING wave is halved and nothing else moves. The road fills at
 * 2 → 6 → 10 → 14 → 18 → 22 instead of 4 → 8 → 12 → 16 → 20 → 24: fewer bodies
 * out at every moment, and no wave anywhere bigger than the four it replaced.
 *
 * ── Two shapes that were tried first, and what they broke ──
 *
 * Giving the opening's two bodies to the LATER waves (2,3,4,5,5,5) keeps the
 * total but lands them while the crowd is at its smallest, so more are alive at
 * once — and the squad that "cannot out-damage the spawn rate" stopped being
 * able to outlast the wall at all, which is the one guarantee
 * `SUMMON_WAVES_MAX` exists to make. Spreading the same total over MORE waves
 * (8 x 3) breaks it the other way: every wave is smaller, but the wall takes
 * five seconds longer to finish and the suppression outlasts the crowd.
 *
 * The budget therefore gets SMALLER rather than rearranged or stretched, and
 * `SUMMON_BUDGET` — which prices the boss's bar — is derived from this array so
 * the two can never drift apart.
 */
export const SUMMON_WAVE_RAMP: readonly number[] = [2, 4, 4, 4, 4, 4]

/** Bodies in wave `n` (1-based). Past the ramp it is the flat size, but the
 *  budget in `SUMMON_WAVES_MAX` means nothing ever asks. */
/**
 * Every body the summoner will ever field — the ramp's own sum.
 *
 * `bossHpMulFor` prices the printed health bar off this: the health the boss
 * gives away in bodies is taken back off its own bar, so the fight is the same
 * size as every other kind's. DERIVED from the ramp rather than written down as
 * `SUMMON_WAVES_MAX x SUMMON_PER_WAVE`, because the two can now disagree — the
 * opening wave is deliberately smaller than the flat size — and a price that
 * reads a product the ramp no longer matches is a boss quietly resized by a
 * pacing edit.
 */
export const SUMMON_BUDGET = SUMMON_WAVE_RAMP.reduce((a, b) => a + b, 0)

export const summonWaveSize = (n: number): number =>
  SUMMON_WAVE_RAMP[n - 1] ?? SUMMON_PER_WAVE

/**
 * One summon's health, as a share of the BOSS's own bar.
 *
 * Priced off the boss and not off the stage's husk, and that is a correction
 * rather than a preference: foe health is LINEAR in the stage (`foeHpScale`) and
 * boss health is exponential over stages 5-12 (`bossHpScale`), so a wall priced
 * as husks is a real wall at stage 6 and wet paper by stage 20 — the summoner
 * would quietly stop being a summoner exactly where the player got good.
 *
 * 2.5 % x 24 bodies is 60 % of the boss's bar, which `bossHpMulFor` takes
 * back off the printed number so the whole fight is the same size as everyone
 * else's.
 */
export const SUMMON_HP_SHARE = 0.025

/**
 * How hard a summon bites, against the husk it is wearing.
 *
 * Cut, because eighteen of them arrive at a crowd that cannot walk away from
 * them: the boss phase gives the crowd no forward speed, so a summoned pack
 * stands on the squad for the rest of the fight rather than being driven past.
 * At the husk's full bite the wave cap bounds the fight's LENGTH and nothing
 * bounds its COST.
 */
export const SUMMON_BITE_MUL = 0.7

/** Which body they wear. A skeleton knight — the roster's marrowknight, so the
 *  summoner is calling up something the player has already learned to read. */
export const SUMMON_TYPE = 'husk'
export const SUMMON_DESIGN = 'marrowknight'

/** How wide across the road a wave arrives. Wider than the crowd, so a wave is
 *  never a single column the player can simply not be under. */
export const SUMMON_SPREAD = 3.2

/**
 * How far up the road, AHEAD OF THE CROWD, a wave claws its way up.
 *
 * Not "in front of the boss", which is where it started and where it did
 * nothing. Measured: the boss spawns at `arenaY + 12` and walks in at 0.85 units
 * a second, so for the whole of a normal fight it is eight to twelve units out —
 * and a husk closes that at 1.7 u/s, which is six seconds. Every wave summoned
 * at the boss's feet arrived after the fight had ended: three seeds at a tuned
 * build lost **0 %** of the squad to a summoner, which is not a boss, it is a
 * cutscene.
 *
 * Sizing it off the CROWD instead makes the wave a threat with a clock the
 * player can count: 4.8 units at husk speed, against a crowd whose front rank
 * sits 1.2 units ahead of its own centre, is about 2.1 s from the ground opening
 * to the first bite — long enough to shoot or steer, short enough that ignoring
 * it is a decision. It is also the honest read on what a
 * summoner does — the bones come up out of the road in front of you, not out of
 * a pocket ten units away.
 */
export const SUMMON_AHEAD = 4.8

// ─── When the wall has ended and the fight has not ──────────────────────────
//
// The budget above is a floor UNDER the fight: the wall stops, and a player who
// is behind can still outlast it and win. What it cannot do is end a fight the
// player has already lost in every way except the arithmetic.
//
// Reported from a live run: a summoner cut a squad down to ONE survivor, spent
// its last wave, and then stood there. One unit's damage against a boss bar is
// minutes of holding the trigger — and with nothing left on the road there was
// nothing to lose to either. The player ground the fight out for TWELVE
// MINUTES. That is the wave cap working exactly as designed and producing a
// fight with no exit: not a win, not a wipe, just a bar moving too slowly to
// watch. The cap is right; what was missing is that a decided fight has to be
// allowed to END.
//
// So when the wall is spent AND the crowd is down to a handful, the summoner
// starts calling single bodies up at its own FLANKS. Two things about that
// placement are the whole point:
//
//   • they come up BESIDE THE BOSS, not ahead of the crowd like a wave, so they
//     walk the length of the arena and a squad with anything left in it simply
//     shoots them — this can never take a fight the player is still winning;
//   • and they keep coming, faster each time, so a squad of one meets one and
//     the run resolves. The player gets a death and a restart instead of a
//     grind.
//
// It is deliberately NOT a rate on the boss's own budget: these bodies are
// unpriced (`bossHpMulFor` knows nothing about them) because they only exist in
// fights whose outcome is already settled, where pricing is meaningless.

/**
 * Squad size at or below which the fight is decided and only the clock is
 * missing. Runs are hundreds strong by the stages that field a summoner, so a
 * handful is not "a player in trouble", it is a player who has already lost —
 * and the check is re-read every tick, so a crowd that recovers turns the
 * whole mechanism back off.
 */
export const SUMMON_MERCY_SQUAD = 5

/** Quiet beat between the crowd falling to that handful and the first flank
 *  body, so a last survivor two seconds from a deserved kill still gets it. */
export const SUMMON_MERCY_GRACE = 6

/** Gap before the first flank body's successor... */
export const SUMMON_MERCY_CD = 4

/** ...multiplied by this after each one... */
export const SUMMON_MERCY_RAMP = 0.8

/** ...down to this floor. The ramp is what makes the fight's end GUARANTEED
 *  rather than merely likely: a fixed trickle a stubborn squad can out-heal
 *  would trade a twelve-minute grind for a longer one. */
export const SUMMON_MERCY_CD_MIN = 1.2

/** How far to the side of the boss they claw up — clear of its body, well
 *  inside the rails. */
export const SUMMON_MERCY_FLANK = 1.9

// No cap on how many of these may be walking at once, and that is a measured
// decision rather than an oversight. A body spends about 2.2 s crossing from
// the boss's flank to the crowd and then trades itself against it, so at the
// ramp's floor the road holds two of them — a ceiling was written here,
// instrumented, and found never to bind in any fight, fought or kited, so it
// was removed rather than shipped as a branch nothing could reach. The spec
// beside the trickle pins the emergent number instead, which is what would
// actually catch a future ramp that floods the road.

// ─── The late tier, and why it lives down here ────────────────
//
// The two elites `MINIBOSS_POOL_LATE` adds, and the second attack each of the
// four boss kinds grows into. They sit at the BOTTOM of this file rather than
// beside the fights they extend, and the reason is mechanical rather than
// editorial: every one of them DERIVES its geometry from a number a section
// above establishes (`CLAW_DODGE_MARGIN`, `CLAW_SPACING`, `BOLT_BLAST_R`,
// `SUMMON_AHEAD`), and a module-level `const` that reads a `const` declared
// later in the same file is a ReferenceError at import time rather than a lint
// warning.
//
// Deriving rather than re-typing is the whole point of those references — see
// `CLAW_SPACING` for what happens when a pocket the crowd has to fit inside is
// drawn instead of computed — so the file order follows the arithmetic.

// ─── warden ─────────────────────────────────────────────────────────────────
//
// It plants in front of the crowd and slams a row of stone slabs down across
// the ENTIRE road, leaving one slot open. Everything in the slabs pays; the slot
// costs nothing at all.
//
// ── The one attack in this game whose answer is a place to BE ──
//
// Every other hazard here marks ground to leave. The ring says "not this spot",
// the rake says "not these three strips", the ball says "not this half", the
// bomb says "not next to me" — and after four elites and four bosses a player
// has learned one verb, which is *away*. The warden inverts it: the road is
// lethal except one slot, so the input is not a flinch away from a mark, it is
// aiming for one. It is also the cheapest new question the game can ask, because
// the player already owns the whole vocabulary — a strip on the ground and a
// countdown — and only the sign is different.
//
// ── Why it is slabs and not a wall with a hole ──
//
// The hole has to be READ, and read from the corner of an eye on a phone. A
// solid bar with a notch in it is a bar; a row of separate teeth with one
// missing is a gap, and the eye finds a missing tooth without being told to look
// for one. It is also honest about the simulation: the kill test is the slabs
// themselves (`inClawFurrow`, which is exactly what a row of strips is), so what
// is drawn is what bills.

/**
 * Half-width of the open slot.
 *
 * DERIVED from the crowd's own disc, exactly as `CLAW_SPACING` is and for the
 * identical reason: a slot the crowd cannot fit inside is not a hard attack, it
 * is a tax with an arrow pointing at it. The claw's history is the whole
 * argument — its furrows were first spaced at "what a claw looks like" and the
 * pockets caught 37 % of a perfect dodge against 38 % of standing still.
 *
 * The margin is twice `CLAW_DODGE_MARGIN`, and the doubling is paid for by the
 * one difference between this and a rake: a rake lands in the arena, where the
 * crowd is stationary and lateral is the only axis there is. This lands on the
 * ROAD, where the crowd is also creeping forward and the player is also reading
 * gates, crates and whatever else the stage put in the same ten units of
 * asphalt. The slack is for the second thing the player is doing.
 */
export const WARDEN_SLOT_MARGIN = 2 * CLAW_DODGE_MARGIN
export const WARDEN_SLOT_HALF_W = CROWD_MAX_R + WARDEN_SLOT_MARGIN

/**
 * Half-width of one slab, and the gap between two of them.
 *
 * The pitch is barely wider than a slab, so the row reads as a wall: a tenth of
 * a unit of daylight between neighbours against a crowd 3.3 across is not a hole
 * anybody can hide in, and it is enough separation to see individual teeth. The
 * one real hole in the row is the slot, and it is the only one.
 */
export const WARDEN_SLAB_HALF_W = 0.55
export const WARDEN_SLAB_PITCH = 1.2

/**
 * Half the depth of the row, along the road.
 *
 * Sized to swallow two things at once, and the second is what makes it deeper
 * than a rake's would need to be:
 *
 *   • the crowd's own depth (`CROWD_MAX_R * CROWD_SQUASH` is 1.19, and the rail
 *     redistribution moves a slot up to 1.3 further back), so the row is a
 *     purely LATERAL question — the same argument as `CLAW_HALF_DEPTH`;
 *   • the ground the crowd covers WHILE the row is winding up. A holding elite
 *     drags the road to a crawl rather than stopping it (`ELITE_DRAG_MIN`), so
 *     over `WARDEN_TELEGRAPH` the squad creeps about a unit forward. The row is
 *     painted where it was aimed and bills where it was painted, so the depth is
 *     what keeps those two facts compatible: a shallower band would let a crowd
 *     walk out of the bottom of its own telegraph and read as an attack that
 *     missed for no reason.
 */
export const WARDEN_HALF_DEPTH = 2

/**
 * How far in front of the crowd it plants.
 *
 * `ELITE_HOLD_AHEAD`'s distance, not the gunner's stand-off, and that is because
 * the row lands under the CROWD rather than travelling: there is no flight time
 * to buy, so the fight wants the elite in the firing line where the crowd can
 * answer it with damage as well as with position.
 */
export const WARDEN_PLANT_AHEAD = ELITE_HOLD_AHEAD

/**
 * How far to the side of the crowd the slot opens.
 *
 * It has to be a real move and it has to be a reachable one. `steerTo` clamps
 * the crowd's centre to ±4.1, so a slot placed toward the middle of the road is
 * always reachable from anywhere; placed 2.8 off the crowd it is always a move
 * worth making, including from the centre line where the biggest available input
 * is 4.1.
 *
 * The SIDE is the crowd's own far side (`wardenSlotX` picks it), so a player
 * hugging a rail is sent across the road rather than nudged into it — being
 * cornered should cost effort, and a slot that opened under a rail-hugger's feet
 * would reward the one position that is otherwise a mistake.
 */
export const WARDEN_SLOT_OFFSET = 2.8

/**
 * Centre of the open slot, for a crowd whose centre is at `crowdX`.
 *
 * Clamped so the WHOLE slot is on the road: a slot half off the rail is a slot
 * the crowd cannot get all of itself into, which turns a clean dodge into a
 * graze for reasons the player cannot see. The slabs themselves are NOT clamped
 * (see `wardenSlabXs`) — that asymmetry is deliberate and it is the same call
 * `clawLaneXs` makes, one level down: the thing the player has to reach is kept
 * reachable, and the thing they have to avoid is allowed to run off the edge of
 * the world.
 */
export const wardenSlotX = (crowdX: number): number => {
  const side = crowdX > 0 ? -1 : 1
  const room = LANE_HALF - WARDEN_SLOT_HALF_W
  return Math.max(-room, Math.min(room, crowdX + side * WARDEN_SLOT_OFFSET))
}

/**
 * Every slab in a row whose slot is centred on `slotX`.
 *
 * Built OUTWARD FROM THE SLOT rather than tiled across the road and then holed,
 * and that is the difference between a slot that is always the crowd's width and
 * one whose width depends on where the tiling happened to land. The first slab
 * on each side sits exactly one slab-half clear of the slot's edge, so the
 * promise "the slot is `2 * WARDEN_SLOT_HALF_W` of clear road" is true by
 * construction for every position on the road.
 *
 * Slabs whose whole body is off the road are dropped — they would bill nobody
 * and draw nothing — but a slab hanging over a rail is kept, because the crowd
 * cannot stand there either.
 */
export const wardenSlabXs = (slotX: number): number[] => {
  const out: number[] = []
  const first = WARDEN_SLOT_HALF_W + WARDEN_SLAB_HALF_W
  for (const dir of [-1, 1]) {
    for (let i = 0; ; i++) {
      const x = slotX + dir * (first + i * WARDEN_SLAB_PITCH)
      if (Math.abs(x) - WARDEN_SLAB_HALF_W > LANE_HALF) break
      out.push(x)
    }
  }
  return out.sort((a, b) => a - b)
}

/**
 * Seconds between the row being announced and it landing.
 *
 * Priced off the move it asks for, which is the rule every wind-up in this game
 * is set by. `SLAM_TELEGRAPH` is 1.0 s because a median 250 ms human then has
 * 0.75 s to make a 3.4-unit move. This asks for at most `WARDEN_SLOT_OFFSET`
 * less the slack the slot leaves — call it three units — so 0.95 s buys the same
 * 0.7 s of steering after the same reaction latency.
 *
 * Deliberately NOT the elite telegraph. `ELITE_TELEGRAPH` is 0.3 s and its own
 * note says why that is honest for a sweep: "there is no sliding out of this
 * one, so the wind-up is not a dodge window — it is the tell that says the clock
 * is running". This one IS a dodge window, so it is priced like one.
 */
export const WARDEN_TELEGRAPH = 0.95

/**
 * Seconds between rows.
 *
 * Against `ELITE_HOLD_MAX` = 3 that is two rows a fight, which is the budget the
 * scythe's 1.5 s cadence and the gunner's 1.5 s reload both land on — two
 * announced attacks is enough for the player to get the second one right after
 * reading the first, and it is the number the whole elite roster is balanced at.
 */
export const WARDEN_RELOAD = 1.6

/**
 * Share of the current squad one row takes off whoever is in the slabs.
 *
 * Between the scythe's 0.2 and the roller's 0.3, and the position in that range
 * is an argument about answerability rather than a feel:
 *
 *   • ABOVE the sweep, because a sweep spans the road and cannot be dodged at
 *     all — its price is the price of an unanswerable hit, and this one has an
 *     answer painted on the ground for the better part of a second.
 *   • BELOW the ball, because the ball bills once per fight and this bills
 *     twice. Two rows at 0.24 is 0.48 of a crowd against the ball's 0.3 and the
 *     bomber's 0.5, which puts the warden's whole fight inside the band the
 *     elite roster already occupies rather than at the top of it.
 *
 * Capped by `SWEEP_FRACTION_MAX` at the call site, like every other elite share,
 * and passed through the onboarding cut and the stuck-player relief for the
 * reason `BOMBER_FRACTION` records at length: those two are not difficulty
 * knobs, and exempting one attack makes it the single thing on the road a
 * struggling player gets no help against.
 */
export const WARDEN_FRACTION = 0.24

// ─── burrower ───────────────────────────────────────────────────────────────
//
// It dives under the road, follows the crowd as a mound of moving earth, plants
// itself, and comes back up.
//
// ── WHICH WAY ARE YOU GOING ──
//
// The bomber already asks a question about position, and the answer to it is one
// lure and one crossing: it commits to where the crowd WAS and then cannot
// change its mind, so the whole fight is decided in a single input. This one
// never commits until the end, and what it follows is not the crowd — it is the
// crowd HALF A SECOND AGO (`BURROWER_LAG`).
//
// That one decision is the entire fight, and everything good about it falls out
// of the same sentence:
//
//   • a crowd that keeps moving is always ahead of its own past, so sustained
//     motion in any direction is a clean escape and the player is rewarded for
//     the thing this genre is about;
//   • a crowd that STOPS is caught, because a stationary crowd's past is exactly
//     where it is standing;
//   • a crowd that REVERSES is caught worst of all, because it is running back
//     down its own trail into the thing chasing it — and "do not turn around" is
//     a lesson no other hazard in this game teaches.
//
// A pursuit at a fixed speed was the obvious first shape and it is a worse fight
// on arithmetic alone. The road is 8.2 units of reachable width and a pursuer
// converges on any crowd that is not at a full sprint, so the only survivable
// answer is a maximal rail-to-rail run, every time, from wherever the player
// happens to be: one input, executed perfectly, or eat it. A trail has no such
// cliff — every unit of movement buys exactly its own unit of separation, so the
// dodge is graded and the player is allowed to be partly right.

/**
 * How far behind the crowd the mound runs, in SECONDS — and LATERALLY only.
 *
 * A time and not a distance, which is what makes the whole fight legible: the
 * mound is at a lateral position the player was actually standing at, so the
 * separation they have bought is the distance they have covered — a quantity
 * they can watch themselves producing rather than one they have to infer from a
 * chase.
 *
 * Half a second is read off the crowd's own controls. `STEER_SPRING` settles a
 * full-lane move in about a third of a second, so half a second is comfortably
 * more than one deliberate input: a player who makes ONE decision has already
 * bought their separation before the mound has finished arriving at the place
 * they made it.
 *
 * ── Why the mound does NOT lag along the road ──
 *
 * It did, for one revision, and the fight did not exist. The road carries the
 * crowd forward at `stageSpeed` whatever the player does, so half a second of
 * lag along it is nearly three units of free separation that nobody chose — and
 * measured, a crowd standing perfectly still took **zero** casualties from an
 * eruption. The whole attack was answered by the road.
 *
 * There is also no decision in that axis to reward. The player steers left and
 * right; forward is the game's own clock. So the mound follows the crowd's line
 * along the road exactly (`stepBurrower` reads `anchorY` live) and lags only in
 * the axis the player controls, which is the axis the question is asked in.
 */
export const BURROWER_LAG = 0.5

/** …and how much of the crowd's path is remembered, which has to be at least
 *  that. Kept as its own number because the trail is a shared facility and the
 *  next thing to read it may want a longer memory than this one does. */
export const CROWD_TRAIL_S = 1.2

/**
 * How fast it closes on the crowd before it dives, world units per second.
 *
 * Slower than the bomber's sprint, because the approach is not the threat here
 * and should not read as one: a bomber's run at you IS its wind-up, where this
 * one's attack does not begin until it is out of sight. It is still faster than
 * the crowd runs, for the bomber's reason — an elite that could be outrun
 * forwards would be answered by doing nothing.
 */
export const BURROWER_SPEED = 4.6

/** How far in front of the crowd it dives. Just outside biting range, so the
 *  dive happens in front of the player rather than on top of them. */
export const BURROWER_DIVE_GAP = 3.4

/**
 * How long it spends following the trail before it plants, seconds.
 *
 * Long enough to be a chase the player can see and answer, short enough that it
 * is never a hold: the road does not slow for a submerged burrower (see the drag
 * loop in `stepAnchor`), so this is time the run is spending at full speed and
 * it may not be a lot of it.
 */
export const BURROWER_TRACK_S = 1.2

/**
 * …and how long the mound sits still, announced, before it erupts.
 *
 * The lock is the telegraph, and it is the bomber's contract to the letter: one
 * event at the moment it plants, carrying the exact seconds to the blast, and a
 * ring on the ground that closes on the beat. It is shorter than `BOMBER_FUSE`'s
 * full second because the player has already been given the whole of
 * `BURROWER_TRACK_S` to be somewhere else — this fuse is the last chance rather
 * than the only one.
 *
 * It also inherits the bomber's OTHER rule: a planted mound holds the road (see
 * the drag loop in `stepAnchor`). `BOMBER_FUSE`'s note has the reason in its own
 * words — "the crowd covers ~5.4 units a second, which is more than the blast is
 * wide, so a bomber that let the road run would be dodged by the squad's own
 * forward motion" — and it applies here with the ring already on the ground. A
 * TRACKING mound does not hold, and must not: the crowd's lateral travel is
 * bought with the road's speed, and a hazard that took away the only input that
 * answers it would not be a hazard, it would be a tax.
 */
export const BURROWER_SURFACE_S = 0.6

/** …and how long it stands there afterwards before it can dive again. Its
 *  recovery is the shooting window, exactly as the bomber's approach is. */
export const BURROWER_RECOVER = 0.9

/**
 * How many dives one burrower ever gets.
 *
 * ONE, and the number is a MEASUREMENT rather than a pacing choice — it was two
 * for a revision and two is not reachable by anything this body could plausibly
 * be.
 *
 * The arithmetic. An eruption comes up at the crowd's own line, so the body ends
 * its dive level with the squad; it then owes `BURROWER_RECOVER` standing still,
 * during which the road carries the crowd `stageSpeed` × 0.9 — about 5.4 units
 * at stage 9 and 6.7 at the speed cap. To dive again it would have to make that
 * back from BEHIND, against a crowd still running: catching up needs a walk
 * faster than `stageSpeed`, which is 5.98 where the tier opens and 7.4 past
 * stage 22. Instrumented across stages 9, 10, 15 and 22, a burrower with a
 * budget of two spent exactly one on every single one of them — so the bound
 * said two, the fight delivered one, and `bossHpMulFor`-style pricing off the
 * printed number would have been pricing a beat that never happens.
 *
 * The fix could have been a sprint. It is not, because 7.5 units a second is a
 * body that visibly outruns the road, and the fight this one is FOR — read the
 * trail, keep moving — does not get better for being asked twice in nine
 * seconds. One dive also puts it beside the two other one-shot elites (the ball
 * rolls once, the bomb goes off once) rather than inventing a third shape.
 *
 * Spent, it does not vanish — it surfaces and walks like any other body, so
 * killing it still pays its bounty. That is the difference between this and the
 * bomber, which is consumed by its own blast: a player who answered the dive
 * correctly should be left with something to shoot rather than with an empty
 * road, because the answer costs them the whole width of it and they should be
 * paid for the work.
 */
export const BURROWER_DIVES_MAX = 1

/**
 * Blast radius of the eruption, world units.
 *
 * Sized so clearing it entirely costs `BURROWER_BLAST_R + CROWD_MAX_R` = 3.85 of
 * separation — which is `SLAM_RADIUS` + `CROWD_MAX_R` to within a tenth, i.e.
 * the same lateral commitment the boss's slam has asked for since stage one.
 * That is not a coincidence to be tuned away: the burrower is the elite that
 * teaches movement, and the distance it teaches has to be the distance the rest
 * of the game charges for.
 */
export const BURROWER_BLAST_R = 2.2

/**
 * Share of the current squad one eruption takes.
 *
 * Exactly the roller's weight, which is the right comparison twice over: both
 * bill ONCE per fight (`BURROWER_DIVES_MAX`), and both are wholly avoidable by a
 * player who reads them. `ROLLER_FRACTION`'s own note sets 0.3 as "slam weight
 * … one connection, wholly avoidable, announced from further off than anything
 * else in the game", and an eruption is that shape with the announcement made in
 * two parts instead of one — a mound following the trail, then a ring on the
 * ground.
 *
 * It was 0.24 while the budget was two dives, priced so the pair came to 0.48
 * and sat between the ball's 0.3 and the bomb's 0.5. The second dive turned out
 * to be unreachable (see `BURROWER_DIVES_MAX`), so the fight was quietly worth
 * half of what it was priced at — which is the failure mode this file's whole
 * habit of writing the arithmetic down exists to catch.
 *
 * Deliberately BELOW `BOMBER_FRACTION`'s ceiling, and the argument is the input
 * each of them asks for. A bomb is answered by one lure and one crossing, so it
 * can afford to be the most expensive thing on the road. An eruption is answered
 * by MOVING for the whole of `BURROWER_TRACK_S`, on a road that is also asking
 * the player to steer for gates and crates — and a hazard that demands
 * continuous input has to be forgiving about the moments they spend looking at
 * something else.
 */
export const BURROWER_FRACTION = 0.3


// ─── The second verb ────────────────────────────────────────────────────────
//
// Four boss kinds is four fights, and four fights is not four HUNDRED fights.
// The pool fixed "every stage ends the same way"; what it could not fix is that
// each kind still shows the player everything it has inside its first four
// seconds, and from the second time they meet it there is nothing left to learn.
// The lane charge (`bossCharges`) was the first answer to that and it is only
// half of one: it goes to two of the four kinds, and only in phase two, and only
// once the fight has already turned.
//
// So every kind gets a SECOND ATTACK, and the four of them are chosen the same
// way the kinds themselves were — one question each, and never a question
// another attack in the game already asks:
//
//   meteor    SHOCK      a ring of fire with a hole in the middle of it. The one
//                        attack in the game whose answer is to run INTO the
//                        mark, which is the exact inverse of the verb the player
//                        has spent the whole game learning.
//   claw      CROSSRAKE  the rake, and then a second rake through its own
//                        pockets. The pocket you chose becomes the furrow, so
//                        the answer is not a position, it is a ROUTE.
//   healer    WARD       the heal, contested. It plants the circle a full cycle
//                        early and the heal is denied by however much of the
//                        crowd is standing on it — the only fight in the game
//                        that was pure arithmetic gets an input.
//   summoner  FLANKS     the wave comes up at both rails instead of in front, so
//                        the two packs converge and standing in the middle means
//                        meeting both at once. The safe-feeling centre line is
//                        the wrong answer.
//
// ── The one rule all four obey: a variant REPLACES a cycle ──
//
// None of them is an extra attack, and that is not a coincidence — it is the
// only shape that does not silently re-price a fight somebody already balanced.
// Every kind's damage is `share ÷ cadence`, and both terms are load-bearing:
// `BOLT_SHARE_MUL` is 0.6 *because* the healer's loop is 1.7 s, `SUMMON_BUDGET`
// prices the summoner's own health bar, and `enragedSpan`'s note records what
// happened the two times a cycle was tightened without re-deriving its cost.
//
// So a variant lands on a cycle the fight was going to spend anyway, and it is
// priced at exactly what the cycle it replaced was worth:
//
//   • the shock and the crossrake each spend ONE `bossHitShare` budget, the same
//     single-swing price the lane charge is documented at — a crossrake's two
//     passes share one budget rather than billing one each;
//   • the ward spends a HEAL, whose price is already in the printed health bar
//     (`bossHpMulFor`), and costs the crowd nothing at all;
//   • the flanks wave spends a WAVE out of `SUMMON_BUDGET`, with the same body
//     count, the same health share and the same walk-in distance. Only the x
//     changes.
//
// A fight therefore has more to show and exactly as much to cost, which is the
// whole difference between "more content" and "harder".

/**
 * The stage the second verbs open on, and it is DERIVED rather than picked.
 *
 * `bossKindFor` strides the pool so that stages 4-7 field claw, meteor, summoner
 * and healer — every kind exactly once. Stage 8 is therefore the first fight in
 * the game the player has met before, and a repeat is precisely where a new move
 * belongs: it arrives as "this one does something else too" rather than as one
 * more unfamiliar thing on a road already full of them.
 *
 * Reading it off the two constants that make that true keeps it true. A fifth
 * boss kind pushes the whole rotation out by a stage, and a variant tier that
 * opened before the rotation finished would show a player a kind's second attack
 * before its first.
 */
export const BOSS_VARIANT_FROM_STAGE = THREAT_POOL_FROM_STAGE + BOSS_POOL.length

/** Does this stage's boss have its second attack yet? */
export const bossHasVariant = (stage: number): boolean =>
  stage >= BOSS_VARIANT_FROM_STAGE

export type BossVariant = 'shock' | 'crossrake' | 'ward' | 'flanks'

/** The second attack each kind grows into. One each, permanently — a kind's
 *  variant is as much a part of what it IS as its first attack. */
export const bossVariantFor = (kind: BossKind): BossVariant => {
  switch (kind) {
    case 'meteor': return 'shock'
    case 'claw': return 'crossrake'
    case 'healer': return 'ward'
    default: return 'flanks'
  }
}

/**
 * Does this variant ride the SWING clock, or its own?
 *
 * The shock and the crossrake are swings — they replace a cycle of the meteor's
 * and the claw's slam machinery, are aimed by `aimBoss` and resolved by
 * `throwBossAttack` like every swing before them. The ward and the flanks wave
 * are not: the ward is an overlay on a heal the healer had already scheduled on
 * its own 1.7 s cadence, and the flanks wave is a wave the summoner had already
 * budgeted on its own. Both of those live in their kind's own step function,
 * beside the clock that owns them.
 *
 * Derived from the VARIANT and not from the kind, even though the two sets
 * happen to coincide with `bossCharges`'s. That coincidence is not a fact about
 * variants — it is a fact about which kinds' fights are one swing — and a
 * predicate that read the kind would be right today for a reason that has
 * nothing to do with what it is being asked.
 */
export const variantOnSlamClock = (v: BossVariant): boolean =>
  v === 'shock' || v === 'crossrake'


// ─── shock: the ring with a hole in it ──────────────────────────────────────
//
// A wall of fire lands in a circle around a patch of clear ground, and the clear
// ground is somewhere the crowd is NOT standing. Everything in the band pays;
// the eye of it costs nothing.
//
// ── Why the eye never grows and never shrinks ──
//
// `SLAM_RADIUS_GROWTH` fattens the meteor's ring as a fight drags, and
// `CLAW_FURROW_GROWTH` fattens the claw's furrows, and both are the same idea:
// a long fight should squeeze the answer without ever removing it — which is why
// `CLAW_SPACING` is derived from the widest a furrow ever gets.
//
// An eye cannot be squeezed at all, because it is not the hazard, it is the
// ANSWER. A ring whose safe middle closed over the course of a fight would be an
// attack that becomes unanswerable exactly when the player is losing, and the
// player would have no way to see it happening — the mark looks the same. So the
// band grows OUTWARD, at exactly the rate the meteor's own ring grows, and the
// pocket is the one number in the attack that a long fight cannot touch.

/**
 * Radius of the safe eye.
 *
 * DERIVED from the crowd's disc, like every pocket in this game. The margin is
 * the slack the player's aim is allowed: at 0.6 the crowd's centre has to arrive
 * within 0.6 units of the mark's centre for a clean escape, which against the
 * 2.6-unit move the attack asks for is a 23 % tolerance — and being outside it
 * is a graze rather than a wipe, because the band is budgeted like every other
 * big hit.
 */
export const SHOCK_EYE_MARGIN = 0.6
export const SHOCK_EYE_R = CROWD_MAX_R + SHOCK_EYE_MARGIN

/** Thickness of the burning band at the first shock, and how it fattens — the
 *  meteor's own growth rate, because it is the meteor's own attack wearing a
 *  different shape. */
export const SHOCK_BAND = 1.6
export const SHOCK_BAND_MAX = 2.4

/** Outer radius of the band for a boss that has thrown `slams` swings. The ONE
 *  definition, read by the kill and by the mark the telegraph paints — mirrors
 *  `slamRadiusFor` and `clawFurrowHalfW`. */
export const shockOuterR = (slams: number): number =>
  SHOCK_EYE_R + Math.min(SHOCK_BAND_MAX, SHOCK_BAND + Math.max(0, slams) * SLAM_RADIUS_GROWTH)

/**
 * How far off the crowd the eye opens.
 *
 * The same size of decision the slam asks for, read off the same arithmetic:
 * a slam's dodge is `SLAM_RADIUS + CROWD_MAX_R` = 3.4 units of lateral travel,
 * and this asks for `SHOCK_OFFSET` less the eye's own slack — 2.6 − 0.6 = 2.0 of
 * committed movement plus the accuracy. Smaller than a slam's, and deliberately:
 * this one is a move TOWARD a mark, and a player aiming at something needs the
 * distance to be short enough that they can still see where they are going.
 */
export const SHOCK_OFFSET = 2.6

/**
 * Centre of the eye, for a crowd whose centre is at `crowdX`.
 *
 * Placed on the crowd's FAR side, so it is always a real move — an eye that
 * opened where the crowd already stood would be a free cycle, and a boss with a
 * free cycle is a boss the player learns to ignore.
 *
 * Clamped so the eye stays inside the reach of `steerTo`, which stops the crowd
 * at ±(LANE_HALF − 0.4): an unreachable answer is not an answer. The BAND is not
 * clamped — it is allowed to run off the rails, exactly as `clawLaneXs` lets a
 * furrow leave the road, because being cornered should cost options rather than
 * bending the pattern back on-road for the player's convenience.
 */
export const shockEyeX = (crowdX: number): number => {
  const side = crowdX > 0 ? -1 : 1
  const room = LANE_HALF - 1.2
  return Math.max(-room, Math.min(room, crowdX + side * SHOCK_OFFSET))
}

/** Is a body at `dx`/`dy` from the mark's centre inside the burning band? The
 *  kill test and nothing else — the telegraph draws the same two radii. */
export const inShockBand = (dx: number, dy: number, outer: number): boolean => {
  const d2 = dx * dx + dy * dy
  return d2 > SHOCK_EYE_R * SHOCK_EYE_R && d2 <= outer * outer
}

// ─── crossrake: the pocket moves ────────────────────────────────────────────

/**
 * How far the second rake is offset from the first.
 *
 * HALF THE SPACING, which is not a tuning choice — it is the only offset that
 * makes the attack the thing it is. At half a spacing the second rake's furrows
 * land exactly down the middle of the first rake's pockets, and its own pockets
 * open exactly where the first rake's furrows were. So the ground that was safe
 * becomes lethal and the ground that was lethal becomes safe, which turns two
 * positions into one route.
 *
 * Any other offset gives a second rake whose pockets partly overlap the first's,
 * and a player who stood in the overlap answers both passes by standing still —
 * which is the attack costing two telegraphs and asking one question.
 */
export const CROSSRAKE_OFFSET = CLAW_SPACING / 2

/**
 * Seconds between the two passes.
 *
 * The move is `CROSSRAKE_OFFSET` — about 2.24 units — and the crowd settles a
 * full-lane move in roughly a third of a second (`STEER_SPRING`), so 0.7 s is
 * two reaction times plus the travel.
 *
 * What makes that enough is that BOTH passes are telegraphed at the cast, not
 * one after the other: the player is shown six strips and two countdowns at the
 * start of the wind-up, so the 0.7 s is spent EXECUTING a route they have
 * already had the whole wind-up to plan. A second rake announced only when the
 * first one landed would be 0.7 s of reading and deciding as well, which is the
 * 0.62-second telegraph `SLAM_TELEGRAPH`'s note measured at a 0 % clear rate.
 */
export const CROSSRAKE_GAP_S = 0.7

// ─── ward: the heal, contested ──────────────────────────────────────────────
//
// The healer is the one fight in the game with no input in it. Its whole
// identity is a bar that goes back up, the answer is DPS, and a player either
// brought enough or did not — which is a fine thing for a game to ask once and a
// strange thing for it to ask forever.
//
// So from `BOSS_VARIANT_FROM_STAGE` the heal comes with a circle on the road, and
// the heal is reduced by however much of the crowd is standing in it. Nothing
// about the healer's arithmetic moves: it is the same cast on the same cadence
// putting back the same `HEAL_FRACTION`, and `bossHpMulFor` still prices the bar
// for `HEAL_EXPECTED` heals.
//
// ── Which means a good player is now paid, and that is the point ──
//
// The printed bar keeps its discount, so denying a heal makes the fight shorter
// than the price sheet assumed. That is not an oversight to be corrected with a
// compensating multiplier — it is the entire reward. The healer's surcharge was
// always paid by the player who could not out-damage it; the ward is the first
// version of the fight where the player who READS it can decline to pay.
//
// ── Why it is graded and not a switch ──
//
// Coverage is the share of the SQUAD standing on the circle, so a crowd half on
// it denies half the heal. Every other percentage attack in this game is graded
// the same way, for the same reason: a binary check on a 2.6-unit move made
// under fire is a coin flip on where the last bolt pushed the player, and it
// would read as the mechanic not working rather than as a miss.

/**
 * Radius of the ward.
 *
 * Big enough to hold the crowd whole, plus the same kind of slack the shock's
 * eye gets — but the crowd does not have to fit inside it, because coverage is
 * graded. What the radius really sets is how much of a big squad can be on the
 * circle at once, and a full-size crowd (`CROWD_MAX_R`) fitting exactly is the
 * honest answer: a player who arrives dead centre with a huge squad denies the
 * whole heal, and one who clips the edge denies a slice of it.
 */
export const WARD_R = CROWD_MAX_R + 0.5

/**
 * How far off the crowd the ward is planted.
 *
 * The shock's distance, for the shock's reason: it is a move toward a mark, so
 * it has to be short enough to aim at. It is the same input twice in one game
 * on purpose — the ward is where the player LEARNS that a mark can be a
 * destination, in a fight where getting it wrong costs seconds rather than
 * survivors, and the shock is where that lesson is charged for.
 */
export const WARD_OFFSET = SHOCK_OFFSET

/**
 * Centre of the ward, for a crowd whose centre is at `crowdX`.
 *
 * The eye's own placement rule, and it must stay that way: two marks that mean
 * "stand here" and are reached differently would be two mechanics wearing one
 * costume.
 */
export const wardX = (crowdX: number): number => shockEyeX(crowdX)

// ─── flanks: the wave from both rails ───────────────────────────────────────

/**
 * How far in from the rails a flank wave claws its way up.
 *
 * Far enough in that a body is fully on the road (the crowd's own edge clamp is
 * `LANE_HALF - UNIT_R`), and no further: the whole content of the attack is that
 * the two packs are as far apart as the road allows, so that where the player
 * stands decides whether they meet them one at a time or both at once.
 */
export const FLANK_INSET = 0.9

/** Where the two packs come up, in world x. */
export const flankXs = (): number[] => [
  -(LANE_HALF - FLANK_INSET),
  LANE_HALF - FLANK_INSET
]

/**
 * How far up the road a flank wave comes up, as a multiple of `SUMMON_AHEAD`.
 *
 * ONE, and the fact that this is not a free parameter is the reason the variant
 * costs nothing. `SUMMON_AHEAD`'s note prices the whole archetype off the walk:
 * "4.8 units at husk speed, against a crowd whose front rank sits 1.2 units
 * ahead of its own centre, is about 2.1 s from the ground opening to the first
 * bite". Moving the flanks closer or further would re-price that clock, and the
 * summoner's budget — which is what its printed health bar is derived from —
 * assumes it.
 *
 * The bodies do arrive from a diagonal rather than from straight ahead, so their
 * true walk is a little longer than a line wave's. That is the attack: a player
 * standing on one rail has bought time against the far pack with the road's own
 * geometry rather than with a number somebody tuned.
 */
export const FLANK_AHEAD_MUL = 1

// ─── The third verb: the gaze ───────────────────────────────────────────────
//
// Every attack in this game asks the player to MOVE. The ring, the rake, the
// bolt, the charge, the shock, the crossrake, the flanks — and on the road the
// sweep, the ball, the bomb, the bolt, the slot and the trail. Twelve questions
// with one verb between them, and a player who has learned that verb has, in a
// real sense, learned the whole game: when something lights up, go.
//
// The gaze is the one attack whose answer is to STOP. The boss plants, an eye
// opens over it, and for as long as the eye is open any movement of the crowd is
// punished — a beam straight down the column the crowd is standing in. A crowd
// that holds still costs nothing at all, and keeps shooting a boss that is not
// throwing anything else.
//
// ── Why it is a real question and not a free window ──
//
// Because it is the only one that fights the player's own reflex. Every other
// telegraph in this game has trained the thumb to flinch the moment something
// lights up, and the gaze lights up exactly like everything else. The skill is
// the SETTLE: the eye opens while the player may still be finishing a dodge from
// the attack before, and the whole of `GAZE_OPEN` is the time they get to let the
// crowd come to rest. A player who is still dragging when the eye finishes
// opening pays for it.
//
// It also turns the other attacks into better questions. A healer bolt already
// in the air when the eye opens is a genuine dilemma — eat the bolt, or break
// the gaze to step out of it — and a summoner's pack walking in while the eye is
// open is the one moment in that fight where standing still is expensive too.
// None of that is scripted; it falls out of the gaze pausing the boss's own
// clock rather than replacing it (see `stepBoss`).
//
// ── Why one shared verb and not one per kind ──
//
// Because it is taught on stage 1 (`GAZE_TEACH_LAST_STAGE`), where every boss is
// a meteor, and a lesson that only applied to meteors would be a lesson the
// player un-learns the first time a claw stares at them. One verb, the same body
// language on every boss, so the eye means the same thing wherever it opens.

/**
 * The stage the gaze joins the rotation for good.
 *
 * The same tier as the second verbs (`BOSS_VARIANT_FROM_STAGE`), and for the
 * same reason stated from the other side: stage 8 is the first REPEAT of every
 * kind, and a kind that comes back with two new things to say is worth meeting
 * twice. Opening the third verb any earlier would put it into a fight whose first
 * verb the player is still learning.
 */
export const GAZE_FROM_STAGE = BOSS_VARIANT_FROM_STAGE

/** Is the gaze in this stage's rotation? The teaching fights are asked
 *  separately — see `GAZE_TEACH_LAST_STAGE`. */
export const bossHasGaze = (stage: number): boolean => stage >= GAZE_FROM_STAGE

/**
 * The one early look at it, and where it stops being offered.
 *
 * The gaze is thrown ONCE before the tier opens: on the stage-1 boss's guard
 * phase, or — if that boss died before it had the chance to throw it — on the
 * stage-2 boss's first. After that it is not seen again until stage 8, where it
 * joins the rotation for real.
 *
 * ── Why the guard phase ──
 *
 * It is the one beat in a stage-1 fight the simulation GUARANTEES. `damageBoss`
 * clamps the bar at every gate, so no squad, however strong, can carry the boss
 * past it — which means "the boss had the chance to throw it" is a question
 * about whether the crowd survived to the gate, not about how hard it hit. It is
 * also the loudest moment in the fight and the one the player is already
 * watching: the boss plants, roars and goes untouchable. The eye opening there
 * is the lesson arriving where the attention already is.
 *
 * ── Why a stage-2 fallback at all ──
 *
 * A stage-1 run can end before the gate — a wiped crowd, a quit — and a teaching
 * beat that a bad first run can skip is a teaching beat half the players never
 * get. Stage 2 is the last chance rather than a second showing: the flag is set
 * the moment the eye has actually opened (`GAZE_TAUGHT_KEY` in the simulation),
 * so a player who saw it on stage 1 does not see it again on stage 2.
 */
export const GAZE_TEACH_LAST_STAGE = 2

/**
 * Seconds for the eye to open — the wind-up, during which moving is still free.
 *
 * Sized off the thing the player has to do in it, which is STOP. `STEER_SPRING`
 * settles the crowd's anchor in about a third of a second once the thumb comes
 * off, so a player who reacts at a median 250 ms and lifts their thumb is at rest
 * by roughly 0.6 s — and 0.9 leaves them a margin on top of that for having been
 * mid-dodge when the eye began to open, which is the case the attack is built to
 * catch but not to guarantee.
 */
export const GAZE_OPEN = 0.9

/**
 * …and how long it stays open, during which moving is punished.
 *
 * Long enough to feel like holding your breath, short enough that it is never a
 * wait. It also sets the shape of the pause the gaze puts into the fight: the
 * boss's own attack clock is FROZEN for exactly this long (see `stepBoss`), so
 * nothing else the boss does can land inside the window — the one thing that
 * would turn "hold still" into a choice between two hits with no way out.
 */
export const GAZE_WATCH = 1.1

/**
 * How far the crowd may drift while the eye is open before it counts as moving,
 * in world units of anchor travel.
 *
 * Not zero, and the reason is the thumb rather than the crowd. The anchor only
 * moves when the steering target moves, so a crowd whose player has let go is
 * perfectly still — but a thumb resting on the glass is not, and a gaze that
 * fired on a two-pixel tremor would read as the attack cheating. A third of a
 * unit is under a fifth of the crowd's own width: nothing a player does on
 * purpose, nothing a resting thumb does by accident.
 */
export const GAZE_TOLERANCE = 0.3

/**
 * Half-width of the beam the eye fires down the crowd's column.
 *
 * Sized to swallow the crowd whole, deliberately. Every other lane in this game
 * is sized so the crowd can stand BESIDE it (`CHARGE_HALF_W` has the
 * inequality), because every other lane is a thing to get out of. This one is
 * not a thing to get out of — it is a consequence, the answer was to not have
 * moved — so it hits the crowd wherever the crowd has moved TO, and its price is
 * the one budget every big attack shares (`bossHitShare`), not the geometry.
 */
export const GAZE_STRIKE_HALF_W = CROWD_MAX_R + 0.35

// ─── No fixed rotation: the attack bag ──────────────────────────────────────
//
// A fight used to be a schedule. `CHARGED_EVERY`, `CHARGE_EVERY` and a third
// every-third for the variant partitioned the swings by residue, so a stage-9
// meteor threw
// its attacks in the same order on every attempt and a player who had fought it
// twice could recite it. That was a deliberate choice — the rest of this file is
// built on "a stage is a pure function of its number, so it can be LEARNED" —
// and for a boss with three verbs it turned out to be the wrong one: what the
// player learned was the order, not the attacks.
//
// So each fight draws its attacks from a SHUFFLE BAG. Every attack the boss has
// is in the bag once; the bag is shuffled, drawn from until empty, and refilled.
// Two properties fall out of that and they are the whole requirement:
//
//   EQUAL   across a fight, every attack is thrown equally often — never more
//           than one apart, at any point in the fight. A random pick per swing
//           would not promise that: a coin can come up heads five times, and a
//           meteor that threw five rings in a row would be the old metronome
//           with worse manners.
//   FRESH   the order is shuffled per ATTEMPT (`bossPatternSeed`), so a retry
//           is not a replay.
//
// ── What is still learnable, and what is not ──
//
// The SET of attacks is still a pure function of the stage — which kind, which
// verbs, from which stage — and every attack still carries its full telegraph.
// What the player can no longer learn is the ORDER, which is the thing that had
// stopped being a fight. The balance rule survives too: an attack costs what it
// costs whichever slot of the bag it lands in, so a fight's total price is set
// by how many of each it throws, and the bag holds that count constant.

/** The attacks a boss can draw. `primary` is the kind's own attack (the ring,
 *  the rake, the bolt, the line wave); `variant` its second verb; `charge` the
 *  phase-two lane charge. */
export type BossVerb = 'primary' | 'variant' | 'gaze' | 'charge'

/**
 * Every attack this fight can draw, right now.
 *
 * The pool changes exactly once in a fight — at the phase-two turn, when the
 * lane charge joins it for the two kinds that have one — and the simulation
 * rebuilds the bag when it does, so the charge is counted into the equal share
 * from the moment it exists rather than crammed into the tail of the bag that
 * was already running.
 *
 * What is NOT in it, and why:
 *   • the HEAL. The healer's every-third is a regeneration rate with two hand-
 *     measured safeties on it (`HEAL_MIN_GAP_S`, `HEAL_MAX_CASTS`), and a heal
 *     drawn from a bag would be a heal whose gap is decided by a shuffle. It
 *     keeps its own schedule; the bag decides what the OTHER casts are. The ward
 *     rides on the heal, so it stays out with it.
 *   • the CHARGED RING. It is the meteor's ring at double size, not a different
 *     attack, and it keeps its own every-`CHARGED_EVERY` count — over RINGS
 *     rather than over swings, so the bag does not dilute it into rarity.
 */
export const bossVerbPool = (kind: BossKind, stage: number, enraged: boolean): BossVerb[] => {
  const pool: BossVerb[] = ['primary']
  const variant = bossVariantFor(kind)
  // The ward is the healer's variant and it rides on the heal (see above), so
  // it is the one second verb that never enters the bag.
  if (bossHasVariant(stage) && variant !== 'ward') pool.push('variant')
  if (bossHasGaze(stage)) pool.push('gaze')
  if (enraged && bossCharges(kind)) pool.push('charge')
  return pool
}

/**
 * What goes into one bag, given the pool.
 *
 * The pool itself, one of each — which is the whole of "equally often" — with
 * one exception, and it only ever binds on a small pool: the lane charge may
 * never be more than one draw in `CHARGE_EVERY`. A pool with fewer attacks than
 * that (the stage 2-7 phase two, `{primary, charge}`) is padded with repeats of
 * its OTHER attacks until the charge is exactly one in `CHARGE_EVERY`. See
 * `CHARGE_EVERY` for the measurement.
 *
 * From stage 8 phase two carries four attacks, so the charge is already one in
 * four and nothing is padded: the rule costs the richer fights nothing.
 */
export const bossBag = (pool: readonly BossVerb[]): BossVerb[] => {
  if (!pool.includes('charge') || pool.length >= CHARGE_EVERY) return [...pool]
  const rest = pool.filter((v) => v !== 'charge')
  const out: BossVerb[] = ['charge']
  for (let i = 0; out.length < CHARGE_EVERY && rest.length > 0; i++) {
    out.push(rest[i % rest.length]!)
  }
  return out
}

/**
 * A small, fast, seedable PRNG — mulberry32.
 *
 * Its own stream, and never `Math.random()`, for the reason the track generator
 * learned the hard way (`Beat.pairRng`): several sim specs pin `Math.random` to a
 * fixed sequence and read the whole run off it, so a single extra draw per boss
 * swing would silently re-roll every summon's spawn jitter and every elite's
 * sweep direction that came after it. A private stream moves nothing else.
 */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The seed for one attempt at one boss.
 *
 * Mixed from the stage, a per-session count of boss fights started, and a salt.
 * The count is what makes a retry a different fight; the salt is what makes a
 * reload a different session. The simulation passes a salt of 0 under test, so
 * every spec that measures a fight measures the same one on every run — which is
 * the difference between a spec and a coin flip.
 */
export const bossPatternSeed = (stage: number, attempt: number, salt: number): number => {
  let h = Math.imul(stage ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (attempt + 0x632be5ab), 0xc2b2ae35) >>> 0
  h = Math.imul(h ^ salt, 0x27d4eb2f) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * A fresh, shuffled bag of `pool`.
 *
 * Fisher–Yates, then one rule on top: a bag may not OPEN with the attack the last
 * one closed on, when the pool is big enough for that to be avoidable without
 * making the order predictable. With three or more attacks the swap leaves the
 * order random. With two it would not — the only legal bag after `[a, b]` would
 * be `[a, b]` again, forever — so a two-attack bag is allowed to repeat across
 * its boundary, which is what random looks like with two things.
 */
export const shuffleBag = (
  pool: readonly BossVerb[], rng: () => number, last: BossVerb | null
): BossVerb[] => {
  const bag = bossBag(pool)
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = bag[i]!
    bag[i] = bag[j]!
    bag[j] = t
  }
  if (bag.length >= 3 && last !== null && bag[0] === last) {
    const j = 1 + Math.floor(rng() * (bag.length - 1))
    const t = bag[0]!
    bag[0] = bag[j]!
    bag[j] = t
  }
  return bag
}
