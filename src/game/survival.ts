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

/** Survivors at the start of stage 1 before any meta upgrades. Three is enough
 *  to read as "a crowd" and few enough that the first `+4` gate feels enormous. */
export const START_SQUAD = 3

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

/**
 * ─── Three-leaf banks ───────────────────────────────────────────────────────
 *
 * The same lane, cut into three doors and two pillars. Three leaves is a real
 * decision rather than a coin flip: the player has to rank three offers against
 * the crowd they are carrying, in the second and a half before they arrive.
 *
 * The arithmetic: 9 units of lane, minus two 0.5-wide pillars, leaves 8.0 for
 * three doors → 2.66 each, so `halfW = 1.33` and the pillars sit at ±1.58.
 *
 * A full-size crowd (radius 1.65) does NOT fit through a 1.33 door — which is
 * why the formation funnels (see `funnelRadius`). A crowd squeezing through a
 * narrow doorway and spilling out the other side is what a crowd does, and it
 * is what makes three-leaf banks feel different from two-leaf ones without
 * needing a single extra rule.
 */
export const GATE3_LEAF_X = 2.66
export const GATE3_LEAF_HALF = 1.33
export const GATE3_DIVIDER_X = 1.58

/** Half-width of the solid pillar between two leaves. Anything that touches it
 *  dies — this is what makes the choice a commitment rather than a preference. */
export const DIVIDER_HALF_W = 0.25
/** Vertical thickness of the divider, matched to the gate band. */
export const DIVIDER_H = 1.1

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
export const BOSS_GUARD_GATES = [0.66, 0.33] as const
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
/**
 * Share of the squad a boulder takes per second of contact.
 *
 * BELOW a barricade's 0.22, and that is the opposite of where it started.
 *
 * The first pass reasoned that a boulder should hurt more than a wall, because
 * a wall is a mistake you could have shot your way out of. That reasoning
 * ignored the thing that makes a boulder different: it is PERMANENT. A wall
 * bills you once and then it is gone, and a rank of boulders bills you for as
 * long as you are threading it — twice, because the second rank's gap is
 * offset. At 0.28 the career study walled a competent player at stage 6, on
 * every purchasing strategy, from the first stage boulders appear on.
 *
 * 0.12 keeps the bite real (a hundred-strong crowd grinding one loses a dozen
 * survivors a second) while leaving the field a routing problem rather than a
 * toll. The difficulty of a boulder is supposed to be in the line you take
 * through it, not in the price of touching it.
 */
export const ROCK_CRUSH_FRACTION = 0.12

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

/** Ceilings on what one percentage attack may ever take. */
export const SWEEP_FRACTION_MAX = 0.4
export const SLAM_FRACTION_MAX = 0.5

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
 * ─── Why it is 4.5 and not 9 ────────────────────────────────────────────────
 *
 * The leash is the ONLY thing bounding the sweep, and once the sweep took a
 * fifth of the squad every 1.5 s the arithmetic ran away: nine seconds is six
 * sweeps, and six sweeps is 74 % of everything the player owns. Measured, that
 * was not difficulty, it was a coin flip on whether the elite happened to die
 * quickly — `average` spent the FULL leash in front of stage 2's and stage 3's
 * elites (6.7 s and 9.1 s) and cleared neither stage on any seed.
 *
 * At 4.5 s the worst case is three sweeps — a little under half the squad — and
 * a fight the player is losing ends while they still have a run. Every number
 * the sweep itself is made of is untouched; what changed is how long the
 * question may be asked before the game accepts the answer.
 */
export const ELITE_HOLD_MAX = 4.5

/**
 * ─── …and the body it leaves behind when the fight is lost ──────────────────
 *
 * The leash above is what stops a lost fight becoming a death sentence, and it
 * created the problem this constant fixes: after `ELITE_HOLD_MAX` the elite
 * breaks off and walks back down the road THROUGH the crowd that failed to kill
 * it — and it walked through them literally. Survivors crossed the sprite and
 * came out the other side, which reads as a missing collision rather than as a
 * monster shouldering its way past.
 *
 * Every other solid thing in the game already parts the crowd (`crushAgainst`
 * pushes what it does not kill). A miniboss is the largest solid thing on the
 * road and was the one exception, purely because foes are handled by the bite
 * loop rather than by the obstacle loop.
 *
 * The numbers are the DRAWN footprint, not a hitbox invented for the physics:
 * `drawFoes` paints the body at `scale × 1.25` and its contact shadow at 0.38 of
 * that across, so a half-width of `scale × 0.475` is exactly the shadow the
 * player can see. The depth is deliberately larger than the shadow's 0.15: the
 * sprite stands up out of its own footprint, so a body only as deep as the
 * ellipse would still let a survivor walk through the monster's KNEES, which is
 * the same bug with a smaller radius.
 *
 * Ordinary foes are NOT solid, and that is a rule rather than an oversight. A
 * creep is a body the crowd is meant to absorb — making a pack of twelve solid
 * would turn every routine fight into a routing puzzle the road was never
 * authored for, and it costs an O(units) pass per foe per frame. Only the elite
 * is big enough to be walked through visibly, and there is at most one or two.
 */
export const ELITE_BODY_HALF_W = 0.475
export const ELITE_BODY_HALF_H = 0.3

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

// ─── Stage shape ────────────────────────────────────────────────────────────

/** Length of stage `n` in world units — a run of ~35 s at base speed, growing
 *  gently so stage 12 is a real expedition without ever becoming a slog. */
export const stageLength = (stage: number): number =>
  Math.round(120 + Math.min(stage, 20) * 9 + Math.max(0, stage - 20) * 4)

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
  /** `+value`, `×value` or `÷value`. Climbs with fire when `op === 'add'`. */
  value: number
  /** Accumulated fire toward the next tick, ms. */
  charge: number
  /** Seconds since the last hit — the frame stops glowing when fire stops. */
  hotFor: number
  /** Consumed once the crowd runs through it. */
  used: boolean
  /** Claimed by another leaf of the same bank — this one pays nothing and is
   *  currently playing its dismissal. */
  dismissed: boolean
  /** 0..1 punch animation on the number, driven by the renderer. */
  pop: number
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
}

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
  /** Wind-up → sweep cycle, seconds. Elites only; see `ELITE_TELEGRAPH`. */
  sweepCd: number
  /** The full length of the current cycle, so the telegraph can be drawn as a
   *  fraction of it rather than against a hard-coded window. */
  sweepSpan: number
  /** Which way the current arc travels, ±1. Alternates every swing, so a
   *  cornered crowd is thrown left, then right, then left — the read that says
   *  "this is a sweep" rather than "this is a stomp". */
  sweepDir: number
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

export interface Unit {
  /** Slot index inside the formation; also the sprite-phase seed. */
  i: number
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
}

export interface Bullet {
  x: number
  y: number
  vy: number
  vx: number
  damage: number
  life: number
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
