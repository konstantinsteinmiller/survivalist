/**
 * ─── Adaptive difficulty, stages 1–5 ────────────────────────────────────────
 *
 * The opening five stages size their boss against the run that actually turned
 * up, instead of against a curve authored for an imaginary average player.
 *
 * ─── The problem it exists to fix ───────────────────────────────────────────
 *
 * A fixed health bar cannot serve both ends of the funnel, and measured on the
 * live build it was serving neither (`tests/sim/scratch.adaptive.test.ts`,
 * before this file existed):
 *
 *   stage 5, `optimal`   468 survivors, 4 984 DPS against a 1 240 bar. The bar
 *                        is worth a quarter of a second of fire; the three
 *                        seconds the stopwatch showed were guard phases, and
 *                        the health bar teleported between them in three
 *                        instant chunks. Nothing about that reads as a fight.
 *   stage 5, a 40-crowd  76 DPS against the same bar: never killed it, on any
 *                        seed. Sixteen seconds of shooting and then a wipe.
 *
 * Both are the same bug from opposite sides. A player who reads the road
 * perfectly and one who barely steers arrive at the same door with a **65×**
 * spread in firepower, and one authored number cannot be a climax for both. So
 * the number stops being authored.
 *
 * ─── What it promises ───────────────────────────────────────────────────────
 *
 * The boss is priced at *the firepower that walked into the arena × how long
 * this player has earned the fight to last*. The second term is the whole
 * design, and it runs the opposite way to the first: **playing well buys a
 * SHORTER fight, not an easier one.**
 *
 *   near-perfect crowd   ~3 s of straight fire. The reward for a clean road is
 *                        watching a boss that would flatten anybody else come
 *                        apart under sustained fire — three seconds is long
 *                        enough to feel like power and far too short to be a
 *                        grind.
 *   some mistakes        ~5 s.
 *   a bad run            ~6 s.
 *   1–12 survivors       ~6.8 s, and no more. This player cannot be helped and
 *                        the design does not try: they will be smacked by every
 *                        slam they fail to read and they will probably lose. If
 *                        they hold their nerve, the bar is beatable — a fight
 *                        that is unwinnable at the second the arena opens is a
 *                        result screen with extra steps.
 *
 * ─── Why "seconds of straight fire" and not stopwatch seconds ───────────────
 *
 * The two are different, by a fixed and knowable amount: the boss owes the
 * player a guard phase at each of `bossGuardGates`, and during one it is immune
 * while it plants and swings. Measured, a phase costs about 1.15 s, so a stage
 * with two of them (everything from stage 2) runs about 2.3 s longer on a
 * stopwatch than it does on this clock, and stage 1 — one gate — about 1.15 s.
 *
 * The ladder is written in FIRE seconds because that is the number the player
 * experiences as the fight: it is how long the bar is moving. Targeting the
 * stopwatch instead would hand a strong player a three-second fight containing
 * seven tenths of a second of shooting, which is precisely the melting bar this
 * file was written to stop.
 *
 * The stopwatch times that fall out are measured rather than predicted, because
 * the walk-in and the DPS a dodging crowd gives up by moving are both in them.
 * Across the scripted policies on stages 1–5 they run **4.3 s** for a run that
 * read the road, 5.8–6.3 s for a good one, 7.0–7.3 s for a sloppy one and
 * 8.4 s for twelve survivors who dodge properly — inside the 5–8 s window the
 * climax was always designed for (see `BOSS_BASE_HP`), with the bottom rung
 * under the ten-second ceiling the brief sets for a hopeless crowd. The full
 * table is in `tests/sim/REPORT.md`.
 *
 * ─── What it deliberately does NOT do ───────────────────────────────────────
 *
 * It reads the crowd, and only the crowd, to decide the target. It would be
 * easy to score the run on DPS instead — the crates are where the real spread
 * lives — but DPS is already the other half of the formula, and scoring on it
 * too would mean a player who found every crate was charged for it twice. The
 * crowd is also the thing the player can see: the HUD counts it, the gates
 * print it, and "I had a big army so the boss went down fast" is a sentence a
 * seven-year-old can say out loud.
 *
 * It also stops at stage 5. From stage 6 the authored curve takes over
 * unchanged — by then the player has committed, the shop matters, and a boss
 * whose bar is always exactly as big as you are is a boss your upgrades cannot
 * beat.
 */

/**
 * The last stage the adaptive bar covers.
 *
 * Five, because that is where the onboarding curves in `survival.ts` already
 * let go, and because the retention data this was built from says the decision
 * to stay or leave is made inside the first few stages: a session that survives
 * them runs 5–22 minutes.
 */
export const ADAPTIVE_BOSS_STAGES = 5

/** True for the stages whose boss is priced by this file. */
export const adaptiveBossStage = (stage: number): boolean =>
  stage >= 1 && stage <= ADAPTIVE_BOSS_STAGES

/**
 * ─── The ladder ─────────────────────────────────────────────────────────────
 *
 * Seconds of straight fire the boss should be worth, against the share of the
 * perfect-play crowd the player actually assembled (`perfectSquadFor`).
 *
 * Read as a curve rather than as four cases: the value is interpolated between
 * neighbouring rungs, so there is no cliff a player can feel themselves fall
 * off, and no threshold worth gaming.
 *
 * The top rung is a PLATEAU rather than a peak at 1.0, and where it sits is the
 * one number here that is about honesty rather than feel. `perfectSquadFor` is
 * a ceiling nobody reaches: it assumes every bank is read correctly, every
 * pumpable leaf is pumped for the whole approach, and not one survivor is lost
 * on the road. Measured, the benchmark `optimal` policy lands at **0.75–0.86**
 * of it, so 0.75 is where "played it about as well as it can be played"
 * actually sits. A peak at 1.0 would reserve the best reward in the game for a
 * run that cannot happen.
 *
 * ─── The one stage where the yardstick is soft ──────────────────────────────
 *
 * Stage 4 is an outlier and it is recorded here rather than tuned away, because
 * the cause is a real property of that road. It is the first stage carrying
 * boulders and barricades, and `optimal` finishes it having lost **50**
 * survivors against 1 on stages 2, 3 and 5. Losses on a road with multipliers on
 * it compound — twenty survivors lost before a `×2` leaf cost forty — so the
 * doors-only ceiling over-states what stage 4 can actually hand over, and even a
 * flawless run scores about 0.46 there.
 *
 * The consequence is that stage 4's climax runs a second or two longer than its
 * neighbours' for the same quality of play. That is left alone: stage 4 is where
 * this game stops being a tutorial by design (it is the stage that stops a
 * no-input run dead), and a slightly heavier fight is the right note for it.
 * Modelling road attrition to close the gap would mean inventing a per-body loss
 * rate, and a made-up number in the yardstick is worse than a measured wart.
 */
export const ADAPTIVE_RUNGS: ReadonlyArray<{ perf: number; seconds: number }> = [
  { perf: 0.75, seconds: 3.0 },
  { perf: 0.45, seconds: 5.0 },
  { perf: 0.20, seconds: 6.0 },
  { perf: 0.00, seconds: 6.8 }
]

/**
 * Crowds at or under this are the "cannot be helped" band from the brief.
 *
 * It is an ABSOLUTE count and not a share, because at this size the share stops
 * describing anything: twelve survivors is a hopeless crowd on stage 2, where
 * the ceiling is 252, and an equally hopeless one on stage 5, where it is 616.
 * The ratio would call them 5 % and 2 % and hand out two different fights for
 * the same doomed squad.
 *
 * Its only job is to pin the bottom of the ladder — see `adaptiveBossSeconds`.
 * Everything else that happens to this player (a slam taking a third of them,
 * a rage cadence they cannot outrun) is the ordinary game, untouched.
 */
export const ADAPTIVE_TINY_SQUAD = 12

/**
 * The band the target is allowed to end up in after the autobalancer has had
 * its say.
 *
 * The multipliers that reach this file are unbounded in the direction that
 * matters: `challengeFactor` reaches ×12.7 on a ninety-stage clear streak and
 * `rewardDeclineFactor` stacks on top of it. Applied raw to a target, a
 * returning player replaying stage 2 could be handed a ninety-second boss —
 * which is not a harder climax, it is a broken one.
 *
 * The ceiling is set from the brief's own hard number. "Within max 10 seconds"
 * is the one limit stated as a limit, and 7.5 s of fire is what leaves it
 * intact once the guard phases, the walk-in and the DPS a dodging crowd gives
 * up by moving are all paid: measured, the worst cell in the ladder — twelve
 * survivors dodging properly on stage 1 — lands at 9.9 s.
 *
 * The floor is what stops the bar melting. Under about two seconds the player is
 * watching chunks disappear rather than watching a bar go down, and that is the
 * failure this file exists to fix.
 */
export const ADAPTIVE_MIN_SECONDS = 2.0
export const ADAPTIVE_MAX_SECONDS = 7.5

/**
 * Seconds of straight fire this run has earned the boss to last.
 *
 * @param squad   survivors that walked into the arena.
 * @param perfect the ceiling for this stage — `perfectSquadFor`.
 */
/**
 * ─── The one road that eats a quarter of its own ceiling ────────────────────
 *
 * `perfectSquadFor` counts DOORS. It assumes a flawless run loses nobody, which
 * is true enough on four of these five roads and false on stage 4: that road
 * carries the first boulders and barricades in the game AND the one bank where
 * both doors take something, and a flawless run finishes it having lost around
 * half of what the doors handed over.
 *
 * The consequence is not that stage 4 is hard — that is the intention — it is
 * that the yardstick MISREADS it. A run that played stage 4 as well as stage 4
 * can be played scores ~0.52 of its ceiling where the same player scores
 * 0.86-0.89 on its neighbours, so the ladder reads a good run as a mediocre one
 * and hands it a longer fight. Measured, that made stage 4's boss the longest
 * of the five (8-10.7 s against 4-6 s) and its slam the single biggest killer
 * in the opening campaign: 28 survivors a run, ~40 % of the crowd that arrived.
 * Stage 4 was a wall, and this is a third of why.
 *
 * This was left as a "measured wart" before, on the grounds that modelling road
 * attrition means inventing a per-body loss rate. It does not: the share is
 * MEASURED, exactly like every other number in this file, by the same probe
 * (`SIM_EARLY=1`, the crowd walk against the play table). One stage is listed
 * because one stage is an outlier; the rest are within a few points of each
 * other and are left alone rather than papered over with a table of ones.
 */
export const ROAD_ATTRITION: Readonly<Record<number, number>> = { 4: 0.6 }

/** The ceiling to judge a run against: what the doors could pay, less what this
 *  particular road takes back off even a flawless one. */
export const adaptiveYardstick = (stage: number, ceiling: number): number =>
  ceiling * (ROAD_ATTRITION[stage] ?? 1)

export const adaptiveBossSeconds = (squad: number, perfect: number): number => {
  // A hopeless crowd gets the bottom rung outright, whatever the ratio says.
  if (squad <= ADAPTIVE_TINY_SQUAD) return ADAPTIVE_RUNGS[ADAPTIVE_RUNGS.length - 1]!.seconds

  const perf = perfect > 0 ? Math.max(0, squad / perfect) : 0
  const top = ADAPTIVE_RUNGS[0]!
  if (perf >= top.perf) return top.seconds

  for (let i = 1; i < ADAPTIVE_RUNGS.length; i++) {
    const hi = ADAPTIVE_RUNGS[i - 1]!
    const lo = ADAPTIVE_RUNGS[i]!
    if (perf < lo.perf) continue
    const span = hi.perf - lo.perf
    const t = span > 0 ? (perf - lo.perf) / span : 1
    return lo.seconds + (hi.seconds - lo.seconds) * t
  }
  return ADAPTIVE_RUNGS[ADAPTIVE_RUNGS.length - 1]!.seconds
}


/**
 * ─── The crowd does not survive the fight it is being sized for ─────────────
 *
 * A target of seven seconds spent against the DPS measured at the arena door is
 * not seven seconds of fight, and the gap is not small. The boss's entire job is
 * to kill survivors: by the fourth second the crowd producing that DPS is
 * smaller than the crowd the bar was priced against, so the fight over-runs —
 * measured on the first cut of this file, by 40 % at the bottom of the ladder,
 * which is how a 7.3 s target became a 12.6 s stopwatch and broke the one
 * promise the brief states as a limit.
 *
 * It is worst exactly where it can be afforded least. A slam takes
 * `max(BOSS_MIN_KILL, squad × share)` — a floor and a share — so a crowd of
 * twenty loses a far bigger PROPORTION of itself per swing than a crowd of four
 * hundred, and it is already the crowd with the longest target. Rage compounds
 * it: every swing thrown pulls the next one closer, so a long fight is not just
 * more swings, it is more swings per second.
 *
 * So the bar is priced against the damage the crowd will actually deliver,
 * integrated rather than multiplied. `expectedDamage` walks the fight forward in
 * small steps with the real slam machinery — the same cadence, the same decay,
 * the same floor — and adds up what the shrinking crowd puts out. That number IS
 * the health, which is what makes the target mean what it says.
 *
 * It is a model, not a simulation, and it is wrong in one direction on purpose:
 * see `SLAM_CONNECT_RATE`.
 */

/**
 * How much of a guard phase costs the player, in seconds.
 *
 * The boss plants, becomes immune to gunfire, and stays that way until it has
 * thrown the swing it owes. Measured across the arena ladder at 1.1–1.2 s a
 * phase, and the count is `bossGuardGates(stage).length` — one on stage 1, two
 * from stage 2.
 *
 * It matters here for one reason: the slam clock runs during a guard phase and
 * the damage clock does not. A fight targeted at seven seconds of fire is
 * nine-and-a-bit seconds of standing in front of a boss that is swinging the
 * whole time, so the crowd decays for the longer of the two windows while paying
 * out over the shorter one.
 */
export const GUARD_PHASE_SECONDS = 1.15

/**
 * Seconds at the top of the fight in which the crowd cannot hurt anything.
 *
 * The boss spawns twelve units up the road and walks down to its hold position,
 * and `BULLET_RANGE` is 10.8 — so the first stretch of every climax is the crowd
 * shooting at a creature that is not yet in reach, with the round's own flight
 * time on top. Measured against a bar worth a sixth of a second of fire, the
 * stopwatch still read 0.8 s.
 *
 * It buys the model nothing in damage and costs it real crowd: the boss's
 * opening swing is already armed while this is running.
 */
export const WALK_IN_SECONDS = 0.7

/**
 * What one swing CYCLE costs the crowd, as a multiple of the swing's own bite.
 *
 * It reads like a dodge probability and it is not one, which is why it is not
 * called one. A boss fight takes survivors in more ways than the swing that is
 * being counted: a summoner's skeletons bite the crowd while the bar is being
 * shot at, a healer's bolts land between casts, and the claw's rake has a core
 * that ignores the budget entirely. None of those are worth modelling
 * individually — they differ per kind and per seed — but together they are why
 * the first cut of this file, which counted swings alone at two-thirds
 * connection, still ran 25 % long at the bottom of the ladder.
 *
 * So the number is calibrated rather than derived: one swing's bite per cycle is
 * where measured time-to-kill lands on target across the ladder
 * (`tests/sim/scratch.adaptive.test.ts`). It over-states what a good dodger
 * loses and under-states what a rooted player loses, and that spread is the
 * fight rather than an error in the model — a player who reads the telegraphs
 * finishes inside their target, which is exactly the reward dodging should buy.
 */
export const SLAM_CONNECT_RATE = 1

/**
 * Everything the model needs to know about how this boss hits.
 *
 * Passed in rather than imported so the file stays free of the simulation: the
 * caller already resolves `bossHitShare()` and the `bossHitBudget` floor for
 * this stage, difficulty and retry relief included, and re-deriving them here
 * would be a second copy of the rules that could disagree with the first.
 */
export interface AdaptiveFight {
  /** Survivors at the arena door. */
  squad: number
  /** `damage × fire rate × weapon multiplier` — DPS of ONE survivor. */
  perSurvivorDps: number
  /** Fraction of the crowd one swing takes — `bossHitShare()`. */
  slamShare: number
  /** …and the floor under it, in bodies — the `bossHitBudget` minimum. */
  slamMinKill: number
  /** Guard phases this stage's boss owes — `bossGuardGates(stage).length`. */
  guardPhases: number
  /** Seconds before the first swing. The boss opens on a full cooldown. */
  openingCd: number
  /** Cadence: first gap, how much each swing shortens it, and the floor. */
  slamCd: number
  slamCdDecay: number
  slamCdMin: number
}

/** Integration step. Fine enough that a swing never lands a tenth late. */
const MODEL_STEP = 1 / 60

/**
 * The damage this crowd will deliver over `seconds` of straight fire, given
 * what the boss will do to it in the meantime.
 */
export const expectedDamage = (fight: AdaptiveFight, seconds: number): number => {
  const fire = Math.max(0, seconds)
  const wall = fire + WALK_IN_SECONDS + Math.max(0, fight.guardPhases) * GUARD_PHASE_SECONDS
  if (wall <= 0) return 0

  // Guard phases are spread evenly rather than placed at the health gates they
  // actually sit on. Placing them properly would need the answer this function
  // is computing, and it buys nothing: the crowd decays smoothly, so where the
  // immune windows fall inside the fight changes the total by less than the
  // seeds themselves resolve.
  const firing = fire / wall

  let squad = Math.max(0, fight.squad)
  let cd = fight.openingCd
  let slams = 0
  let damage = 0

  for (let t = 0; t < wall; t += MODEL_STEP) {
    damage += squad * fight.perSurvivorDps * firing * MODEL_STEP
    cd -= MODEL_STEP
    if (cd > 0) continue
    slams++
    const bite = Math.max(fight.slamMinKill, Math.ceil(squad * fight.slamShare))
    squad = Math.max(0, squad - bite * SLAM_CONNECT_RATE)
    cd = Math.max(fight.slamCdMin, fight.slamCd - slams * fight.slamCdDecay)
  }
  return damage
}

/**
 * The health an adaptive boss is worth: exactly the damage the run that turned
 * up will land inside its target.
 *
 * @param seconds the target from `adaptiveBossSeconds`, already multiplied by
 *                the difficulty setting and the autobalancer and clamped into
 *                the band.
 */
export const adaptiveBossHp = (fight: AdaptiveFight, seconds: number): number =>
  // A floor, in case a run somehow arrives with no measurable firepower at all:
  // a boss with a one-point bar is a softlock dressed as a victory.
  Math.max(30, Math.round(expectedDamage(fight, seconds)))

/**
 * ─── The floor is not the same on every stage the ladder covers ─────────────
 *
 * `ADAPTIVE_MIN_SECONDS` is a floor against the bar MELTING — under about two
 * seconds the player is watching chunks disappear rather than a bar go down.
 * That is the right floor for stages 2-5, where the player has already decided
 * to be here and a short climax is the reward for a clean road.
 *
 * Stage 1 is a different question, and it is the only one in the game that is
 * about whether there is a session at all. Measured on the live build, the
 * median drop-out is ~35 s in and it lands RIGHT AFTER the first boss dies: the
 * fight is 4.0 s for a run that read the road, which is long enough to be a
 * boss and far too short to be a climax worth staying for. A first boss that
 * falls over in four seconds teaches a stranger that the game is over.
 *
 * So the first fight has a floor of its own, and it binds for EVERY stage-1 run:
 * the ladder's own rungs top out at 6.8 s, so whatever `perf` a first road
 * scores, this number is the fight. That is the property the brief below leans
 * on — one constant moves every squad size at once.
 *
 * ── Six seconds was still not a boss ──────────────────────────────────────
 *
 * The first cut of this was 6.0, and the brief it was written against was "five
 * seconds of straight fire, 6-10 s on a stopwatch". It hit that and the fight
 * still did not read as one, for a reason the balance tables structurally could
 * not show: **no scripted policy presses a button.** The 6.5 s in every table is
 * a player who never throws the grenade, and the actual first boss is met by
 * somebody who was taught the grenade on the elite two thirds down the same road
 * and presses it again on reflex. A grenade is worth `grenadeMult` SECONDS of
 * the crowd's fire (3 at level 0) against a bar priced in exactly that unit, so
 * the fight the player really got was **4.5 s**, and about a second of that is
 * the boss walking in. Three seconds of shooting, no dodging, seven to ten
 * survivors lost. That is a speed bump wearing a crown.
 *
 * Measured across all four scripted players (`SIM_FIRSTBOSS=1`), at 11.0:
 *
 *   squad   bar      no bomb          + one grenade
 *      63   8 698    6.5 → 10.9 s     4.5 → 7.6 s
 *      98   4 100    6.6 → 10.9 s     4.5 → 7.7 s
 *      51   1 226    6.7 → 11.6 s     4.5 → 8.2 s
 *      26     497    6.3 → 11.1 s     4.5 → 7.3 s
 *
 * — between **+62 % and +82 %** on both columns and at every squad size, which
 * is the brief ("at least 60-70 % longer on all final squad sizes"). The length
 * is not the point on its own: the slam cadence is a fixed clock, so a fight
 * two thirds longer throws two thirds more swings, and a player who stands still
 * in front of it now pays for standing still.
 *
 * ⚠ The ceiling had to move with it — see `ADAPTIVE_FIRST_MAX_SECONDS`. A floor
 * of 11 under a ceiling of 7.5 is a band with its bottom above its top, and
 * `clampAdaptiveSeconds` would resolve it silently in the wrong direction.
 */
export const ADAPTIVE_FIRST_FIGHT_SECONDS = 11.0

/**
 * …and stage 1 needs its own CEILING as well, which it did not before.
 *
 * `ADAPTIVE_MAX_SECONDS` is 7.5, so a floor of 10.5 with the shared ceiling
 * would be a band whose bottom is above its top — `Math.min` would win and the
 * first fight would come out at 7.5 for everybody, which is the bug the
 * `clampAdaptiveSeconds` ordering makes silent rather than loud.
 *
 * It is also a real number and not merely arithmetic bookkeeping. The shared
 * ceiling exists so a hopeless crowd on a deep stage is not handed a longer
 * fight than the brief allows; stage 1's brief is now a longer fight, so its
 * ceiling has to move with its floor or the ladder above the floor (`perf`
 * below 0.20 buys 6.8 s, scaled by the difficulty dial and the autobalancer)
 * gets flattened against a wall 3 s under the floor.
 */
export const ADAPTIVE_FIRST_MAX_SECONDS = 13.0

/** The smallest fight this stage is allowed to hand out. */
export const adaptiveFloorSeconds = (stage: number): number =>
  stage <= 1 ? ADAPTIVE_FIRST_FIGHT_SECONDS : ADAPTIVE_MIN_SECONDS

/** …and the longest. */
export const adaptiveCeilingSeconds = (stage: number): number =>
  stage <= 1 ? ADAPTIVE_FIRST_MAX_SECONDS : ADAPTIVE_MAX_SECONDS

/** Clamp a target into the band the fight is allowed to occupy. */
export const clampAdaptiveSeconds = (seconds: number, stage = 2): number =>
  Math.max(adaptiveFloorSeconds(stage), Math.min(adaptiveCeilingSeconds(stage), seconds))

/**
 * ─── …and the elites on those stages are priced the same way ────────────────
 *
 * An elite is a LANDMARK: it plants, it blocks the road, and the crowd has to
 * shoot it down before the stage continues. What it costs should therefore be
 * measured in the only currency that means anything there — seconds of the
 * crowd's own fire — and for exactly the reason the boss is: the firepower two
 * players bring to the same elite differs by an order of magnitude, so one
 * authored health number is a speed bump for one of them and a wall for the
 * other. Measured on the shipped build, stage 1's elite ran **2.3 s for a run
 * that read the road and 5.3 s for one that did not**, while stages 2 and 3
 * fielded the same landmark at 0.8-1.5 s. The curve was not describing a fight,
 * it was describing whoever happened to walk into it.
 *
 * A second and a half is the target: four volleys at the opening fire rate, so
 * the crowd visibly has to STOP and shoot something, and nothing like the boss.
 *
 * "Not one-shottable" falls out of that rather than being bolted on — a price
 * quoted in seconds of fire cannot be paid in one volley however big the crowd
 * is, which is the property an authored number cannot promise.
 */
export const ELITE_FIRE_SECONDS = 1.5

/**
 * The health an elite is worth: the damage this crowd lands in
 * `ELITE_FIRE_SECONDS`.
 *
 * Deliberately NOT integrated the way the boss's bar is. That model exists
 * because a boss spends five to eight seconds killing the crowd that is killing
 * it, so the DPS at the start is not the DPS at the end. An elite fight is a
 * second and a half, and over that window the crowd it is being priced against
 * is the crowd it is fighting.
 *
 * @param squadDps what the whole crowd lands per second, on target.
 * @param seconds  the fight this elite is meant to be worth.
 */
export const adaptiveEliteHp = (squadDps: number, seconds = ELITE_FIRE_SECONDS): number =>
  // The same floor the authored path carries: a landmark with a sliver of a bar
  // is a landmark the player never sees have one.
  Math.max(20, Math.round(Math.max(0, squadDps) * seconds))

/**
 * ─── The one elite the grenade is thrown at ─────────────────────────────────
 *
 * What the tutorial elite must have left AFTER the lesson's grenade lands.
 *
 * ── The problem ──
 *
 * The lesson stops the world, dims the screen to one button and refuses to
 * start again until the player throws a grenade. Then the grenade deletes the
 * thing outright — and measured, it is not close: a grenade lands
 * `squadDps x mult` and the elite is priced at `squadDps x ELITE_FIRE_SECONDS`,
 * so at the default `GRENADE_BASE_MULT` of 3 against 1.5 seconds it does
 * **exactly 200 % of the whole bar, for every squad size, on every seed**. The
 * overkill is structural rather than a tuning accident.
 *
 * A first-timer therefore learns the wrong lesson twice over: the button is a
 * delete key, and the landmark the road built up to was never a fight. It reads
 * as being handed a cheat rather than a tool.
 *
 * ── The fix, and why it is a fraction rather than a number ──
 *
 * Leave a quarter of the bar standing. The grenade still does the spectacular
 * thing — three quarters of a health bar in one hit is the most damage the
 * player has ever seen — and then they have to finish it with the guns they
 * already had, which is the sentence the lesson should end on.
 *
 * It is expressed as REMAINING FRACTION and not as a health number because the
 * grenade is not a constant: `GRENADE_BASE_MULT` is 3 at level 0 and 6 at level
 * 20, and a player can reach the shop before stage 1 is cleared. Pricing the
 * bar off the multiplier the player actually throws is what keeps the outcome
 * identical for both of them — see `tutorialEliteFireSeconds`.
 */
export const TUTORIAL_ELITE_REMAIN = 0.25

/**
 * Seconds of the crowd's own fire the tutorial elite is worth, given the grenade
 * that is about to hit it and the flight time it has to survive first.
 *
 * ```
 *   bar            = squadDps x seconds
 *   flight chip    = squadDps x flightSeconds     (the crowd keeps firing)
 *   grenade        = squadDps x mult
 *   remaining      = 1 - (flightSeconds + mult) / seconds
 *   => seconds     = (mult + flightSeconds) / (1 - remaining)
 * ```
 *
 * `squadDps` cancels out completely, which is the point: the fraction left
 * standing is the same whether the crowd is three strong or three hundred.
 *
 * ⚠ THE FLIGHT TERM IS NOT OPTIONAL and was missed on the first pass. A thrown
 * grenade takes `GRENADE_FLIGHT_MS` to land and the world is back at full speed
 * for all of it, so the crowd shoots the elite the whole way down. Measured
 * without the term: 12.5 % left instead of 25 %, i.e. the guns were quietly
 * taking half of what the bomb was supposed to leave.
 *
 * At the default multiplier of 3 and a 0.42 s flight that is 4.56 seconds
 * against the ordinary elite's 1.5 — so this landmark is deliberately the
 * beefiest thing on stage 1, and it has to be, because three quarters of it is
 * about to evaporate in one hit.
 */
export const tutorialEliteFireSeconds = (
  grenadeMult: number, flightSeconds = 0
): number =>
  Math.max(
    ELITE_FIRE_SECONDS,
    (grenadeMult + Math.max(0, flightSeconds)) / (1 - TUTORIAL_ELITE_REMAIN)
  )

/**
 * ─── …and the swing stops being soft ────────────────────────────────────────
 *
 * The opening stages discount the boss's swing (`earlyBigHitMul`: 60 % on
 * stages 1-3, 80 % on 4-5) so that a first-timer who cannot dodge yet comes out
 * of their first boss fight with a squad rather than a result screen. That is
 * the right protection for the road they are learning on, and it becomes the
 * wrong one the moment the bar stops being fixed.
 *
 * Measured: with the adaptive bar in and the discount left alone, a run that
 * never touches the screen cleared stage 3 on two seeds in three. The floor the
 * game is built on — "the one instruction is tap to move, and a run that never
 * obeys it does not clear a stage" — was gone, because the only thing that had
 * ever enforced it was a health bar too big for a crowd that small.
 *
 * The brief is explicit about where the floor should live instead: a player who
 * arrives with nothing "can't be helped and should be smacked by the boss
 * attacks". So the discount is spent on the runs it was written for and taken
 * back from the ones it was never meant to cover. A crowd that read the road
 * keeps it; a crowd that did not gets the full authored swing, which is what
 * turns "not enough damage" back into "losing" rather than "slow".
 *
 * It can only ever UNDO the discount. The swing never exceeds what the stage
 * authored, so nothing here can invent a difficulty the design did not ask for.
 *
 * Stage 1 is untouched in practice: its swing is `TUTORIAL_SLAM_FRACTION`, a
 * token worth a body or two whatever this returns, and a careless run is
 * supposed to finish the tutorial.
 */

/** At or above this share of the perfect crowd, the discount applies in full. */
export const SLAM_SOFT_PERF = 0.45
/** At or below it, the swing is as heavy as this stage's rules allow. */
export const SLAM_HARD_PERF = 0.2

/**
 * How hard the swing lands on a run that built nothing, against the swing the
 * stage authored for everybody else.
 *
 * Above 1, which needs saying out loud: for the bottom of the ladder this stops
 * being "no discount" and becomes a real thump. Undoing the discount alone was
 * measured and was not enough — a run that never touched the screen still
 * cleared stages 3 and 5, because three swings at the authored share take two
 * thirds of a crowd and two thirds is survivable.
 *
 * It is bounded by the game's own ceiling rather than by a new one:
 * `SLAM_FRACTION_MAX` is what the design already says a single swing may take,
 * and the caller clamps to it. Nothing here can push the boss past a limit the
 * game had not already written down.
 */
export const HOPELESS_SLAM_MUL = 1.45

/**
 * What one swing is worth against this run, as a multiplier on the stage's
 * authored discount.
 *
 * Returns the beginner's discount for a crowd that read the road, and climbs to
 * `HOPELESS_SLAM_MUL` for one that did not.
 *
 * @param authored `earlyBigHitMul(stage)` — what the stage grants a beginner.
 */
export const adaptiveBigHitMul = (authored: number, squad: number, perfect: number): number => {
  // A hopeless crowd is charged in full whatever the ratio makes of it, for the
  // same reason the ladder pins its bottom rung by head count: at this size the
  // share has stopped describing anything.
  if (squad <= ADAPTIVE_TINY_SQUAD) return HOPELESS_SLAM_MUL
  const perf = perfect > 0 ? Math.max(0, squad / perfect) : 0
  if (perf >= SLAM_SOFT_PERF) return authored
  if (perf <= SLAM_HARD_PERF) return HOPELESS_SLAM_MUL
  const t = (perf - SLAM_HARD_PERF) / (SLAM_SOFT_PERF - SLAM_HARD_PERF)
  return HOPELESS_SLAM_MUL + (authored - HOPELESS_SLAM_MUL) * t
}

/**
 * ─── The melt floor, stage 6 and up ─────────────────────────────────────────
 *
 * Everything above prices the boss BOTH ways: a strong run gets a smaller bar
 * and a weak one gets a bigger bar. That is right for stages 1-5 and wrong
 * from 6, for the reason stated above — a bar that is always exactly as big as
 * you are is a bar your upgrades can never beat, and from stage 6 the shop is
 * most of the game.
 *
 * So from stage 6 the adaptive number stops being the price and becomes a
 * FLOOR. The authored curve is still the bar; the floor only raises it, and
 * only when the authored bar would not survive three seconds of this run's
 * fire.
 *
 * That single `Math.max` is what makes the whole thing scoped without needing a
 * squad-size threshold to argue about:
 *
 *   a mid or low run   the authored bar is already worth far more than three
 *                      seconds of their fire, so the floor is below it and
 *                      NOTHING changes. No new difficulty, anywhere, for the
 *                      players this was not written for.
 *   an overpowered run the floor is above it and takes over. Upgrades keep
 *                      shortening the fight right up to three seconds and then
 *                      stop mattering, which is the correct place for a power
 *                      curve to run out rather than at "the bar vanishes".
 *
 * ─── Why it was needed ──────────────────────────────────────────────────────
 *
 * Reported from stage 45+: a run read well enough arrives at the arena with
 * ~1500 survivors and a launcher, and `BOSS_BASE_HP * bossHpScale(stage)` is a
 * curve authored against an ordinary crowd. The bar is gone before the boss has
 * finished walking in — the climax of a two-minute stage is a flash. Playing
 * perfectly should buy a SHORT fight (three seconds, the top rung of the ladder
 * above); it should not buy no fight at all.
 */

/** First stage the floor applies to. Below this the full ladder already runs. */
export const MELT_FLOOR_STAGE = ADAPTIVE_BOSS_STAGES + 1

/** True for the stages whose boss gets a floor but not the full ladder. */
export const meltFloorStage = (stage: number): boolean => stage >= MELT_FLOOR_STAGE

/**
 * Seconds of straight fire the floor guarantees.
 *
 * Not a new number: it is `ADAPTIVE_RUNGS[0].seconds`, the top rung, which is
 * already the game's answer to "how long should a fight last for someone who
 * played it about as well as it can be played". A player who melts a stage-45
 * boss has done exactly that, so they get exactly that.
 */
export const BOSS_MIN_FIRE_SECONDS = ADAPTIVE_RUNGS[0]!.seconds

/**
 * What the grenade's multiplier is capped at while the floor is holding the bar
 * up — against the BOSS only, and never against anything else on the road.
 *
 * The cap is not decoration, it is what stops the floor being cosmetic. A
 * grenade deals `squadDps × mult` as one instant hit, and the floor prices the
 * bar at `BOSS_MIN_FIRE_SECONDS` of `squadDps`. At the base multiplier of 3
 * those are THE SAME NUMBER: one bomb is worth exactly the three seconds the
 * floor just bought, so without this the guaranteed fight is a bomb and a
 * corpse. (Upgrades take the multiplier to 6, i.e. twice the whole bar.)
 *
 * Capped rather than scaled, deliberately. A proportional cut would leave a
 * fully-upgraded grenade at 4x — still more than the bar — and the point is a
 * guarantee that does not depend on how much the player has spent.
 *
 * Two seconds of the three, so a bomb thrown into a floored fight is a real
 * decision (it ends the climax in about a second) rather than a delete button.
 * Below the floor nothing changes: the grenade is the crowd's answer to a big
 * bar and it stays that way everywhere the bar is honest.
 */
export const BOSS_FLOOR_GRENADE_MULT = 2
