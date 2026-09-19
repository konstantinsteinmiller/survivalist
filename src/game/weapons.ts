import { BULLET_R, CRATE_R, LANE_HALF, SHOOTERS, STAGE_RUN_BLEND_TO, stageSpeed } from '@/game/survival'

/**
 * ─── Weapon upgrades — the puzzle prize ─────────────────────────────────────
 *
 * One optional, self-contained beat per stage that pays out a WEAPON for the
 * rest of that stage. It is the only thing in the game that is not on the way:
 * everything else the road offers — crates, banks, coins — is collected by
 * steering slightly better than you were already steering. This has to be
 * NOTICED first.
 *
 * The shape, in order down the road:
 *
 *      ▲ stone                                            (one shoulder)
 *      lever ◄──
 *                 ▲ stone                                 (the other, 3 units on)
 *                 ──► lever
 *
 *                            ▓▓▓▓  ← armour, 12 units on
 *                            [W]     the box behind it
 *
 * Break the stone, shoot the lever, twice. Both levers and the armour comes off
 * before the crowd arrives. One, or neither, and the box goes past behind a
 * wall nobody has the road left to chew through. That is the whole mechanic,
 * and it is deliberately a test of ATTENTION rather than of DPS: the levers are
 * cheap to break and expensive to find, sitting out at the rails where nothing
 * else in the game ever asks the player to point.
 *
 * The stones are the answer to the beat's one measured flaw — the sweep was
 * free. A crowd steering anywhere near a lever's column deleted it in passing,
 * so "did you notice" quietly became "did you drift", and a puzzle that solves
 * itself on a stray round is not a puzzle. A stone in front of each post means
 * the round has to be SPENT there: point at the lever, hold it, and be pointing
 * long enough to matter. See `leverStoneHp` for why it is not more than that.
 *
 * Three rules keep it a gift rather than a tax:
 *
 *   1. IT IS NEVER IN THE WAY. The box and its armour sit on one shoulder, and
 *      `WEAPON_FREE_LANE` guarantees the remaining road is wider than a crowd
 *      at full size. A player who ignores the whole beat pays nothing.
 *   2. IT NEVER OUTLIVES THE STAGE. The weapon is cleared by `startStage`, so
 *      it is a reward for reading THIS road, not a permanent power spike that
 *      makes the next one trivial. See `activeWeapon` in `useSurvivalGame`.
 *   3. THE TWO PRIZES ARE DIFFERENT SHAPES, not different sizes. See below.
 *
 * ─── The two weapons ────────────────────────────────────────────────────────
 *
 * They are priced to roughly the same single-target DPS multiplier and to very
 * different feels, so "which stage am I on" is a change of plan rather than a
 * change of number:
 *
 *   GATLING — `streams` unchanged, fire rate x2.2, damage x2. A hose. Best
 *             against the one thing in the game with a health bar long enough
 *             to matter (a boss, an elite), and the safe pick when the crowd is
 *             small, because every round still has to hit something.
 *   ROCKET  — a HANDFUL of streams, fire rate x0.6, damage x5.5, and a blast.
 *             Fewer, far heavier rounds. Worse into a single body, and the only
 *             thing in the player's hands that answers a pack of twelve at once.
 *
 * The DPS identity that makes this tunable: total damage per second is
 * `squad x damage x fireRate x rateMul x damageMul`, and `streams` cancels out
 * of it entirely (a stream fires `fireRate` times a second and each round
 * carries `squad x damage / streams`). So `streams` is a pure FEEL dial — it
 * decides how many, how fat and how far apart the rounds are — and the balance
 * lives in the two multipliers alone.
 */

export type WeaponId = 'rocket' | 'gatling' | 'grapeshot' | 'dynamo' | 'gravecall' | 'hoard'

/**
 * ─── What the shop's Power track buys, per weapon ───────────────────────────
 *
 * The first two weapons ARE their damage, so their track multiplies the round.
 * The four that came after are not: Gravecall's gun is the squad's own and its
 * power is the dead it raises, and the Hoard's gun is WEAKER than the squad's
 * and its power is what a corpse is worth. A track that multiplied the round
 * there would buy the wrong thing and — worse — quietly inflate the number the
 * boss's bar is priced against (`weaponDamageMul`), which is how a shop level
 * makes a fight longer instead of shorter.
 */
export type WeaponPowerScales = 'gun' | 'trait'

export interface WeaponDef {
  id: WeaponId
  /**
   * Muzzles firing at once, overriding `SHOOTERS`. `0` means "use `SHOOTERS`".
   *
   * Cancels out of the DPS product (see the header), so it costs nothing to
   * set: it exists to make a rocket a FAT round rather than fourteen thin ones
   * arriving together, which is the difference between a launcher and a shotgun.
   */
  streams: number
  /**
   * …and one more muzzle per this many survivors, up to `streamsMax`. `0`
   * disables the scaling and pins the weapon at `streams`.
   *
   * ─── Why the launcher had to grow with the crowd ────────────────────────
   *
   * It shipped at a flat ONE stream, and that is DPS-correct and feels wrong:
   * a squad of four and a squad of four hundred both fired a single rocket at a
   * time, so the weapon looked identical at every point on the curve while the
   * number behind it grew by two orders of magnitude. Player-reported, in as
   * many words: *"only fires one round no matter the size of the squad"*.
   *
   * Scaling alone did not fix it, and the second report says why: *"the rocket
   * launcher is still only firing 1 bullet"*. `streamsPer` was 12 off a base of
   * ONE, so every squad under a dozen — which is most of a stage's opening, and
   * every run that is going badly — still watched a single round leave. The
   * base is now the floor of the salvo (see `WEAPONS.rocket`), so the smallest
   * crowd that can hold a launcher still fires a volley with it.
   *
   * Because `streams` cancels out of the DPS product, this is a pure feel dial
   * — five launchers each carry a fifth of what one carried, arrive five times
   * as often, and the stage takes exactly as long to clear. What changes is
   * that the crowd you built is visible in the thing it is firing.
   *
   * Capped, and capped low. The whole read of the launcher is that it is NOT
   * the hose beside it; at fourteen streams it would be a slower gatling with a
   * blast, and the two weapons would stop being a choice.
   */
  streamsPer: number
  streamsMax: number
  /**
   * Fire every stream in ONE salvo instead of round-robin down the cadence.
   *
   * The difference is entirely in what the player sees, and it is the whole
   * point. Spread out, five launchers at 0.6x rate are five lonely rounds a
   * second leaving from five places — which is exactly the picture the flat
   * single stream drew, only faster, and it is why the second report landed
   * after the first fix. Fired together, the same five rounds are a SALVO: the
   * front rank lights up at once, five trails fan out to five different bodies,
   * and the pause afterwards is the reload rather than the weapon.
   *
   * It is free in DPS terms. `stepShooting` divides the cadence by the salvo
   * size and multiplies the rounds per trigger by it, so the shot budget over
   * any stretch of road is identical — see the identity in the header.
   *
   * Off for the gatling, and that is not an oversight. Fourteen tracers
   * arriving on one frame and nothing on the next thirteen is a strobe, not a
   * hose, and the gatling's entire read is the hose.
   */
  volley: boolean
  /** Multiplier on `runFireRate`. */
  rateMul: number
  /** Multiplier on the damage each round carries. */
  damageMul: number
  /** Blast radius in world units, or 0 for a round that only hits what it
   *  touches. */
  splashR: number
  /**
   * Rounds STEER to a target instead of going straight up the road.
   *
   * The squad's own gun, and the gatling, fire forward and only forward: the
   * whole game is "point the crowd at the thing", and a rifle that aimed itself
   * would delete the verb. The launcher is the exception on purpose, and it is
   * what makes it a different weapon rather than a bigger one — it converts the
   * player's job from AIMING to POSITIONING, which is exactly the trade its slow
   * cadence already implies. A weapon that fires once a second and misses
   * because the pack drifted two units left is not a reward, it is a downgrade.
   *
   * See `aimTarget` for what it picks and what it refuses to shoot at.
   */
  homing: boolean
  /**
   * How much faster a door pumps while this weapon is in the player's hands.
   *
   * The pump is a clock, not a hit count: `+1` per `gateTickMs` of sustained
   * fire, whatever is doing the firing. So a gun that fires twice as often
   * pumped exactly as fast as the squad's own — which made the gatling's one
   * honest advantage over the launcher (it never stops hosing the door)
   * invisible on the door itself. This is that advantage, made visible: the
   * hose winds the number up faster, and the whole read of the gatling —
   * "everything just got louder" — finally includes the gate.
   *
   * This is the rate on the ADDITIVE doors (`+N` / `-N`). The scale doors have
   * their own, below.
   */
  pumpMul: number
  /**
   * …and on the SCALE doors (`xN` / `/N`), which is deliberately lower.
   *
   * One rate for both was the gatling's single biggest overreach, reported in
   * play: a `x1.6` or `x2.4` door hosed at the additive rate reached `x2.x` /
   * `x3` inside one approach, and a multiplier multiplies whatever the rest of
   * the stage already built — so the bonus compounded on every bank after it.
   * Measured before the split, a good player handed a gatling on stage 5 took
   * 222 survivors through its gates against 142 without it, and reached the
   * boss 62 % bigger. An additive door's pump is linear in the time spent on it;
   * a scale door's is exponential in everything downstream, so it gets the
   * smaller multiplier.
   */
  scalePumpMul: number
  /**
   * Seconds a door stays HOT after one of this weapon's rounds hits it, on top
   * of the ordinary hot window.
   *
   * The launcher fires in salvos, one trigger pull every `1 / (fireRate ×
   * rateMul)` seconds — 0.88 s at the base fire rate — and a door forgets it
   * was being shot after 0.4 s of silence (`stepGates`). Measured, that meant a
   * crowd holding a launcher could not pump a door AT ALL until its fire rate
   * reached ~4.2 shots/s, which is most of a run away: picking up the prize
   * quietly deleted the game's headline skill for the rest of the stage. A
   * rocket hit now keeps the door warm long enough to bridge the reload, so the
   * pump reads as continuous fire again — one heavy thud per tick instead of a
   * stream of tracers, which is exactly the launcher's whole character.
   */
  gateHoldS: number
  /** Which half of the weapon the shop's Power track multiplies. */
  powerScales: WeaponPowerScales
  /**
   * Half-angle of the muzzle's cone, radians. 0 is straight up the road with
   * the ordinary sprinkle of scatter.
   *
   * The shotgun's whole identity: a fan of pellets that covers a pack at
   * arm's length and nothing at all at the far end of the road.
   */
  spreadRad: number
  /**
   * …and how far its rounds reach, as a share of the squad's own range.
   *
   * 1 is every other weapon. Below 1 is the price of the spread, and it is the
   * price on the GATES too: a door is only pumped while it is in range, so a
   * short gun spends fewer seconds on every bank (see `stepGates`).
   */
  rangeMul: number
  /**
   * Does hitting things CHARGE this weapon? The Dynamo's meter fills from every
   * round that lands, and the player spends it on a bolt of their own
   * (`DYNAMO_BOLT_MULT`).
   */
  charges: boolean
  /**
   * How many of the dead this weapon can have on its feet at once, 0 for every
   * weapon that raises nobody. Gravecall's thralls — see `THRALL_*`.
   */
  raises: number
  /**
   * What a corpse is worth in coins, as a multiple of the ordinary drop. 0 for
   * every weapon that does not gild them. The Hoard — see `GILD_*`.
   */
  gilds: number
}

/**
 * Blast damage as a share of the round's own.
 *
 * Everything OTHER than the body the rocket actually hit takes this fraction —
 * the direct hit is always paid in full. Without the split a rocket in a pack of
 * twelve deals twelve times its face value, which is not a weapon, it is a
 * different game; with it, the rocket is worth about four bodies' worth against
 * a crowd and exactly one against a boss, which is the trade the two weapons are
 * supposed to be asking about.
 */
export const ROCKET_SPLASH_SHARE = 0.6

/**
 * How far the blast reaches, world units.
 *
 * A shade under a boulder's width and well under the lane's, so a rocket is an
 * answer to a CLUMP rather than to a row: the pincer and the swarm wall spread
 * their bodies wider than this on purpose, and a weapon that erased either of
 * them in one round would delete the two hazards the mid-game is built out of.
 */
export const ROCKET_SPLASH_R = 2.3

// --- The Dynamo's meter ---------------------------------------------------

/**
 * How much of a charge one round's damage is worth, as a share of ONE SECOND of
 * the crowd's own fire.
 *
 * Charge is measured in seconds-of-fire rather than in raw damage for the same
 * reason the boss's bar is: raw damage means something different to a crowd of
 * four and a crowd of four hundred, and a meter that fills inside one bank at
 * depth and never at all on stage 10 is not a mechanic. At an eighth the meter
 * wants eight seconds of LANDED fire — a pack, a bank and a crate, or most of
 * an elite — so a road pays three or four bolts to a player who keeps the gun
 * busy and one to a player who does not.
 *
 * Only rounds that land charge it. Fire into empty road is worth nothing, which
 * is what makes the meter a reward for aiming rather than for holding a thumb
 * down.
 */
export const DYNAMO_CHARGE_PER_DPS = 1 / 8

/**
 * What the bolt hits for, as seconds of the crowd's own fire.
 *
 * Priced exactly the way the grenade is (`grenadeMult`, 3 at level 0) and
 * deliberately smaller: the grenade is a skill the player owns for a career,
 * the bolt is a bonus riding on a weapon they hold for one stage — and unlike
 * the grenade it comes round three or four times a road.
 *
 * It is deliberately NOT part of `weaponDamageMul`, so no boss bar and no elite
 * bar is priced against it. That is the owner's call and it is what makes the
 * bolt a bonus: the fight was sized for the gun, and the bolt is the player
 * getting ahead of it.
 */
export const DYNAMO_BOLT_MULT = 2

/** Half-width of the bolt's column — "three gun shots thin". */
export const DYNAMO_BOLT_HALF_W = BULLET_R * 3

/** Seconds the bolt is drawn for. It resolves on the frame it is thrown. */
export const DYNAMO_BOLT_S = 0.35

// --- Gravecall's thralls ---------------------------------------------------

/** The most of the dead that may be on their feet at once. */
export const THRALL_MAX = 15

/**
 * How far in front of the crowd a thrall walks.
 *
 * Far enough to meet what is coming before it reaches the squad — the first
 * thing a thrall is worth is the bite it takes instead of the crowd — and close
 * enough to stay on screen and read as YOUR side of the fight rather than as
 * another pack.
 */
export const THRALL_LEAD = 3.2

/** ...and how far it may drift off the crowd's column to find work. */
export const THRALL_SPREAD = 2.6

/** How fast it closes on what it is attacking, world units a second, on top of
 *  the road's own speed. */
export const THRALL_SPEED = 3.4

/** Reach of its swing, past the two bodies' own radii. */
export const THRALL_REACH = 0.55

/** Seconds between its swings. */
export const THRALL_HIT_CD = 0.6

/**
 * What one swing costs, as seconds of ONE SURVIVOR's fire.
 *
 * Priced per survivor rather than as a share of the crowd, so fifteen thralls
 * are worth a fixed readable amount instead of a second crowd that scales with
 * the first. A risen creep hits like a handful of the squad, and the weapon
 * stays "they take the bites and hold the line" rather than "they double your
 * damage".
 */
export const THRALL_HIT_SECONDS = 3

/** A thrall's health, as a share of what the body had when it was alive: it
 *  gets up weaker than it fell, and a brute still outlasts a creep. */
export const THRALL_HP_SHARE = 0.6

/** ...and the floor under that, so a one-hit creep still stands for a moment. */
export const THRALL_HP_MIN = 6

/** Seconds a raised body takes to claw its way up, during which nothing can
 *  touch it and it cannot swing. The tell that says "that one is yours now". */
export const THRALL_RISE_S = 0.45

// --- The Hoard's gold ------------------------------------------------------

/** What a gilded corpse pays, as a multiple of the coins it would have dropped. */
export const GILD_COIN_MUL = 2.5

/** Seconds a statue stands before it bursts. Long enough to read as a statue,
 *  short enough that the coins arrive while the kill still feels connected. */
export const GILD_STAND_S = 1.1

/** The burst it ends in: radius, and what it hits for in seconds of one
 *  survivor's fire. Small — the gold is the point, this is the punctuation. */
export const GILD_BURST_R = 1.6
export const GILD_BURST_SECONDS = 1.2

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  gatling: {
    id: 'gatling',
    // Unchanged: the gatling's whole read is that the SAME fourteen muzzles are
    // going much faster. Cutting the stream count would have made it quieter on
    // screen while the numbers got louder, which is the wrong way round.
    streams: 0,
    streamsPer: 0,
    streamsMax: 0,
    rateMul: 2.2,
    // 2 until 2026-09-16: a stage with the hose on it was roughly four times
    // as survivable as one without — cut a fifth, on the owner's call.
    damageMul: 1.6,
    splashR: 0,
    // Straight up the road, like the gun it replaces. The gatling's whole read
    // is VOLUME — where you point it is still the entire skill.
    homing: false,
    volley: false,
    // The hose winds a door up faster than the squad's own gun: 1.6× is a tick
    // every ~310 ms at stage 1 instead of every 500 — visibly quicker on the
    // plate and audibly quicker on the ladder, without turning a full approach
    // into a number the curve was never priced against.
    // 1.6 on every door until 2026-09-16. The additive doors keep most of the
    // hose's edge; the multipliers lose most of it — see `scalePumpMul`.
    pumpMul: 1.4,
    scalePumpMul: 1.2,
    gateHoldS: 0,
    powerScales: 'gun',
    spreadRad: 0,
    rangeMul: 1,
    charges: false,
    raises: 0,
    gilds: 0
  },
  rocket: {
    id: 'rocket',
    // THREE launchers minimum, five at a crowd worth the name — and all of them
    // going at once. The floor is the fix for "it still only fires one bullet":
    // a salvo is the smallest thing that reads as a launcher, so the weapon may
    // never be handed over firing less than one. See `streamsPer` and `volley`.
    streams: 3,
    streamsPer: 24,
    streamsMax: 5,
    rateMul: 0.6,
    // 5.5 until 2026-09-16 — cut a fifth alongside the gatling, on the owner's
    // call. Splash is a share of the round, so the blast falls with it.
    damageMul: 4.4,
    splashR: ROCKET_SPLASH_R,
    homing: true,
    volley: true,
    pumpMul: 1,
    scalePumpMul: 1,
    // Bridges the salvo's own reload — see `gateHoldS`. 0.75 s plus the 0.4 s
    // window is 1.15 s, comfortably past the 0.88 s between salvos at the base
    // fire rate, and still short enough that a door the crowd has stopped
    // shooting goes cold within a second and a half.
    gateHoldS: 0.75,
    powerScales: 'gun',
    spreadRad: 0,
    rangeMul: 1,
    charges: false,
    raises: 0,
    gilds: 0
  },

  // ── The four that came after, one verb each ──
  //
  // Each one is priced against the same identity the first two are
  // (`weaponDpsMul` = rate × damage), and each one's TRAIT is the rest of what
  // it is worth. Where the trait carries most of the weapon, the gun is cut
  // below the squad's own so the weapon is a change of plan rather than a
  // strictly better rifle.

  /**
   * GRAPESHOT — the shotgun. A fan of pellets, murderous up close and useless
   * down the road.
   *
   * Its DPS sits a little over the launcher's (2.93 against 2.64) and that is
   * the whole brief: the strongest burst in the game, sold for the two things
   * every other gun gets for free — REACH and the seconds of gate pump reach
   * buys. At `rangeMul` 0.5 a bank is in range for about half as long, so a
   * player carrying it arrives at a door with a smaller number on it and has to
   * take the pack in front of it apart instead.
   */
  grapeshot: {
    id: 'grapeshot',
    // A fan, not a stream: five barrels at the smallest crowd and nine at a
    // hundred, all of them going off together (`volley`).
    streams: 5,
    streamsPer: 22,
    streamsMax: 9,
    rateMul: 0.75,
    damageMul: 3.9,
    splashR: 0,
    homing: false,
    volley: true,
    pumpMul: 1,
    scalePumpMul: 1,
    // One trigger every 0.70 s at the base fire rate, against a door that
    // forgets in 0.4 — so the pellets bridge their own reload exactly as the
    // launcher's salvo does, and a short gun's disadvantage stays REACH rather
    // than turning into "cannot pump at all".
    gateHoldS: 0.45,
    powerScales: 'gun',
    // ±17°. Wide enough that the fan is unmistakable at the front rank, tight
    // enough that a crowd aimed at a body still puts most of it into that body.
    spreadRad: 0.3,
    // 0.5 first, and measured too harsh: half the reach costs the shotgun the
    // crates, the walls and most of the pump as well as the range, and it came
    // out the weakest weapon in the game on every stage it was dealt, and 0.62
    // was still the weakest at depth. 0.7 is visibly the short gun — a bank is
    // in range about two thirds as long as it is for everything else, and the
    // pack in front of it has to be taken apart rather than out-ranged — with
    // the compounding losses (crates, walls, the pump) paid back.
    rangeMul: 0.7,
    charges: false,
    raises: 0,
    gilds: 0
  },

  /**
   * DYNAMO — a coil gun that banks what it hits and hands it back as a bolt.
   *
   * The gun itself is deliberately the plainest on the list, a shade under the
   * gatling's: the weapon is the METER. Every round that lands charges it (see
   * `DYNAMO_CHARGE_PER_DPS`), and a full meter is a button the player presses
   * when they choose — the one weapon in the game with an input of its own.
   */
  dynamo: {
    id: 'dynamo',
    streams: 0,
    streamsPer: 0,
    streamsMax: 0,
    rateMul: 1.35,
    damageMul: 1.9,
    splashR: 0,
    homing: false,
    volley: false,
    pumpMul: 1,
    scalePumpMul: 1,
    gateHoldS: 0,
    powerScales: 'gun',
    spreadRad: 0,
    rangeMul: 1,
    charges: true,
    raises: 0,
    gilds: 0
  },

  /**
   * GRAVECALL — the gun is the squad's own; what changes is that the dead get
   * up.
   *
   * `rateMul` and `damageMul` are both 1 ON PURPOSE. The player keeps exactly
   * the rifle they had and the weapon is the fifteen thralls walking in front
   * of it — which is why its Power track scales the THRALLS (`powerScales`) and
   * why the boss's bar, priced off the gun, is unchanged by it. The thralls are
   * a bonus on top of a fight priced without them, exactly as the Dynamo's bolt
   * is.
   */
  gravecall: {
    id: 'gravecall',
    streams: 0,
    streamsPer: 0,
    streamsMax: 0,
    rateMul: 1,
    damageMul: 1,
    splashR: 0,
    homing: false,
    volley: false,
    pumpMul: 1,
    scalePumpMul: 1,
    gateHoldS: 0,
    powerScales: 'trait',
    spreadRad: 0,
    rangeMul: 1,
    charges: false,
    raises: THRALL_MAX,
    gilds: 0
  },

  /**
   * CROW'S HOARD — a cursed gun that turns what it kills into money.
   *
   * The only weapon whose gun is WORSE than the squad's own (0.85), and the
   * only one that pays in a currency the road does not: a corpse stands as a
   * gold statue for a beat and bursts into `GILD_COIN_MUL` times the coins it
   * would have dropped. It is the stage a player spends on the shop rather than
   * on the road, which is a different kind of good stage and the reason the gun
   * is allowed to be weak.
   */
  hoard: {
    id: 'hoard',
    streams: 0,
    streamsPer: 0,
    streamsMax: 0,
    rateMul: 1,
    // 0.85 first — a gun deliberately worse than the squad's own — and measured
    // it was worse than carrying NOTHING: the weak gun killed less, so the gold
    // never arrived either, and the stage paid fewer coins than an unarmed one.
    // At 1 the trade is the honest one: the Hoard costs you what the OTHER five
    // weapons would have given you, and pays in coins instead.
    damageMul: 1,
    splashR: 0,
    homing: false,
    volley: false,
    pumpMul: 1,
    scalePumpMul: 1,
    gateHoldS: 0,
    powerScales: 'trait',
    spreadRad: 0,
    rangeMul: 1,
    charges: false,
    raises: 0,
    gilds: GILD_COIN_MUL
  }
}

/** Single-target DPS multiplier, for the shop readout and the balance tests.
 *  `streams` is absent on purpose — see the header. */
export const weaponDpsMul = (id: WeaponId): number =>
  WEAPONS[id].rateMul * WEAPONS[id].damageMul

/**
 * How many muzzles this weapon fields for a crowd of `alive`.
 *
 * The one place the stream count is decided, because it has to be the same
 * number in two calculations that must not disagree: the shot budget and the
 * damage each round carries (`squad x damage / streams`). Split them and the
 * weapon quietly gains or loses DPS with the size of the crowd.
 */
export const weaponStreams = (id: WeaponId | null, alive: number): number => {
  if (!id) return SHOOTERS
  const def = WEAPONS[id]
  if (def.streamsPer <= 0) return def.streams > 0 ? def.streams : SHOOTERS
  // `streams` is the FLOOR of the salvo, not its first step: the growth is a
  // bonus on top of a weapon that already reads as a launcher at any crowd
  // size. Clamped both ways so `streamsMax` below `streams` cannot quietly
  // invert the two.
  const grown = def.streams + Math.floor(alive / def.streamsPer)
  return Math.max(1, Math.min(Math.max(def.streams, def.streamsMax), grown))
}

/**
 * The first stage that carries a puzzle.
 *
 * Stages 1-5 are the tutorial: one control, one gate, two crate colours, an
 * elite and the first walls that actually kill. A player still learning that a
 * box CAN be shot has no attention spare for a box that cannot be, and an
 * unclaimed prize on one of the first roads they ever run reads as a bug rather
 * than as a miss.
 *
 * It may not fall below 4 whatever else changes: `HARD_OBSTACLE_FROM_STAGE` is
 * 4, and stages under it carry **no scenery that can kill** — every wall and
 * boulder is filtered out of the finished track. The armour over the box is a
 * wall, and the stone over each lever is one too. Opening the beat below that
 * line would either put the first lethal-looking thing in the game inside a
 * bonus nobody asked for, or ship the box with no armour at all, which is the
 * puzzle with the puzzle taken out.
 *
 * It was 6 rather than 4 for a while — `WEAPON_EVERY` had turned the beat from
 * every-stage furniture into a prize, and the first prize was meant to land on
 * a road the player could already drive. It is back at the floor because of
 * where the prize sat in the funnel: with the first box on stage 6 and the
 * launcher's on stage 8, neither weapon was ever seen inside the three minutes
 * a portal fit test grades. Stage 3 now hands the player a weapon of their own
 * choosing (`WEAPON_PICK_STAGE`), and this is the road where they first have to
 * go and FIND one — one stage later, exactly where the banner told them to look.
 */
export const WEAPON_STAGE = 4

/**
 * The stage a player runs with a weapon they CHOSE — the loaner.
 *
 * Offered once, on the handover into this stage, as a two-card reveal: the
 * launcher or the gatling, for this stage only. It exists for the same reason
 * the weapon puzzle moved earlier: the most distinctive thing the game owns has
 * to be seen before a stranger decides whether to stay, and a choice is a
 * better first meeting than a pickup — a player who picked the rockets is
 * invested in the rockets. The weapon is cleared by `startStage` like every
 * other, so the choice is a taste rather than a permanent power spike; the
 * puzzle from `WEAPON_STAGE` is where they earn one again.
 *
 * Deliberately not 2. Stage 1 teaches the gun, the gate and the crate; stage 2
 * teaches the trap and the elite. A rocket in the player's hands on either of
 * those roads would answer the lesson before it was asked. Stage 3 is the first
 * road the player has already seen every idea on.
 */
export const WEAPON_PICK_STAGE = 3

/**
 * …and the stage the choice is OFFERED on the way into: straight after the
 * first boss (owner's call, 2026-09-18 — "a session extender for first-time
 * players").
 *
 * The first kill is the funnel's biggest exit, and a choice is the strongest
 * reason to press on the game has: a player who picked the rockets wants to see
 * the rockets. So the stage-1 kill no longer hands over a fixed launcher — the
 * player picks the boss's reward, once, and the pick is theirs for stage 2 at
 * the loaner's power (`BOSS_REWARD_DAMAGE_MUL`, the stage-2 lesson stays
 * intact) and for `WEAPON_PICK_STAGE` at full power, exactly as before. A player
 * who closed the tab on the card still opens stage 2 holding the launcher, and
 * is offered the choice on the way into stage 3 instead.
 */
export const WEAPON_PICK_OFFER_STAGE = 2

/** The two cards on the reveal, in the order they are laid out. */
export const WEAPON_PICK_CHOICES: readonly WeaponId[] = ['rocket', 'gatling']

/**
 * ─── The first boss pays out on the spot ────────────────────────────────────
 *
 * Measured in playtests: about a quarter of the players who killed the stage-1
 * boss closed the game right there, even with the road already moving on under
 * them. The kill is the natural end of a first session unless something new is
 * handed over in the same breath — so the stage-1 boss drops a launcher, shown
 * as a one-card reveal that closes itself, and the crowd walks on with it from
 * the ground the boss fell on.
 *
 * It is the loaner pattern again (`WEAPON_PICK_STAGE`): persisted once shown
 * (`BOSS_REWARD_KEY`), re-armed by `startStage` on every attempt at the stage
 * AFTER this one, and cleared by the next stage like every other weapon.
 *
 * Stage 2's free gatling box (`WEAPON_GIFT_STAGE`) does NOT take it away: the
 * gatling becomes the main gun and the launcher keeps firing beside it at its
 * half power (`sideWeapon` in the sim) — two gifts on one road, overlaid.
 */
export const BOSS_REWARD_STAGE = 1
export const BOSS_REWARD_WEAPON: WeaponId = 'rocket'

/**
 * …and it is a WEAKER launcher: half the damage per round, everything else the
 * same.
 *
 * The salvo, the homing and the blast are the whole of what makes the launcher
 * a toy worth coming back for, so those stay; the number is what comes off. At
 * full power it would be a 3.3x firepower spike on stage 2, which is the road
 * the trap and the elite are taught on — half keeps it a visible upgrade
 * (~1.65x) without deleting the lesson. The stage-2 boss is priced off the
 * run's real firepower (`fightModel` reads this too), so the climax stays the
 * length it was.
 */
export const BOSS_REWARD_DAMAGE_MUL = 0.5

/** A pick read back off a save blob is only a pick if it names a weapon. */
export const isWeaponId = (v: unknown): v is WeaponId =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(WEAPONS, v)

/**
 * ─── The shotgun hits hardest up close ──────────────────────────────────────
 *
 * Owner's call (2026-09-19): grapeshot was the weakest weapon in the game and
 * not worth walking into a lane for. Its pellets now land for
 * `GRAPESHOT_POINT_BLANK_MUL` × their damage at the crowd, falling off in a
 * straight line to `GRAPESHOT_MAX_RANGE_MUL` × at the end of the gun's reach —
 * so the short gun is a MURDEROUS short gun, and the whole of its identity
 * ("take the pack in front of you apart") pays out where it is asked to.
 *
 * Distance is measured from the crowd, the same yardstick the range itself uses
 * (`Bullet.range`), and applied when the pellet lands. Every other weapon is 1.
 */
export const GRAPESHOT_POINT_BLANK_MUL = 2.5
export const GRAPESHOT_MAX_RANGE_MUL = 1

/**
 * …and how much of the fan actually LANDS on a boss.
 *
 * Every fight is priced off the crowd's firepower (`weaponDamageMul`) on the
 * assumption that what is fired arrives. For every gun but this one it does:
 * measured 2026-09-19 on the stage-1 boss (good and average, four seeds each),
 * the fight received 0.93-1.06 of the damage its bar was priced for, and the
 * shotgun 0.67-0.69 — its fights ran 15-20 s against 10-12 s for everything
 * else, and the owner's playtest called the stage-1 boss "a real chore".
 *
 * Two causes, fixed in two places. Most of it was REACH: the meteor bosses
 * fight from 7-11 units out and the shotgun reaches 7.6, so pellets died short
 * of the body — now they fly on to it in a boss fight (`stepBullets`). The rest
 * is the ±17° fan (`spreadRad`) sending pellets past the body, priced in here.
 * 0.8 was measured against both, stages 1-3: the shotgun's fights now run
 * 8.9-9.3 / 5.6-6.4 / 6.2-6.7 s against 10.1-11.8 / 5.6-6.4 / 6.6-8.0 s for
 * the gatling and the launcher — in line, and a touch quicker on the stage the
 * complaint was about.
 */
export const GRAPESHOT_FIGHT_HIT_SHARE = 0.8

/** Share of a gun's fire that reaches a boss or elite — see
 *  `GRAPESHOT_FIGHT_HIT_SHARE`. 1 for every gun whose rounds fly true. */
export const fightHitShare = (id: WeaponId): number =>
  id === 'grapeshot' ? GRAPESHOT_FIGHT_HIT_SHARE : 1

/** What a round from `id` is worth, as a multiple of its damage, having landed
 *  `dist` units up the road from the crowd with a reach of `range`. */
export const damageAtReach = (id: WeaponId | null, dist: number, range: number): number => {
  if (id !== 'grapeshot') return 1
  const t = Math.max(0, Math.min(1, dist / Math.max(1e-6, range)))
  return GRAPESHOT_POINT_BLANK_MUL + (GRAPESHOT_MAX_RANGE_MUL - GRAPESHOT_POINT_BLANK_MUL) * t
}

/**
 * ─── One colour per weapon ──────────────────────────────────────────────────
 *
 * Owner's call (2026-09-19): a weapon has to be recognisable without reading
 * its name — not every player reads, and nobody reads at run speed. So each has
 * a signature colour, painted wherever the player is asked to CHOOSE one (the
 * lanes of a weapon split: floor, glow, frame, glyph and name plate).
 *
 * Picked from the Okabe–Ito colour-blind-safe family, lifted for a dark road,
 * and matched to what each weapon does so the colour is a second name rather
 * than a code to learn: fire for the launcher, gold for the hoard, grave-green
 * for the dead that rise, electric violet for the coil. The six sit far enough
 * apart in hue AND lightness that no two collapse into one under the common
 * forms of colour blindness — and the glyph's shape is always there as well.
 *
 * `rgb` is the same colour as a bare triplet, for the `rgba()` the renderer
 * builds its glows and tints from.
 */
export const WEAPON_HUE: Readonly<Record<WeaponId, { hex: string; rgb: string }>> = {
  rocket: { hex: '#ff5a2c', rgb: '255,90,44' },
  gatling: { hex: '#4fb3ff', rgb: '79,179,255' },
  grapeshot: { hex: '#ff78c4', rgb: '255,120,196' },
  dynamo: { hex: '#a77bff', rgb: '167,123,255' },
  gravecall: { hex: '#2fd88a', rgb: '47,216,138' },
  hoard: { hex: '#ffd23f', rgb: '255,210,63' }
}

/**
 * …and one every this many stages after it.
 *
 * A weapon on EVERY stage is not a prize, it is the ordinary state of the game
 * with a two-lever entry fee. The whole read of the beat — "this road has
 * something on it" — needs roads that do not, and a stage the player runs on
 * the squad's own gun is what makes the next one's launcher feel handed over.
 *
 * Two rather than three so the alternation still gives each weapon a turn
 * inside any stretch of road a player remembers, and so the shop's two damage
 * tracks (`weaponPowerMul`) both stay live purchases.
 */
export const WEAPON_EVERY = 2

/**
 * ─── …except on the long middle road, where every stage carries one ─────────
 *
 * 2026-09-18, the owner's length pass ("weapon upgrade distribution anew"). The
 * every-other cadence above is right where it was written — the teaching road,
 * 4-15, where every box is a DEBUT or the return of one of the first two, and
 * the bare road between two boxes is what sells the next one. It is kept there
 * exactly, box for box.
 *
 * From 16 it stops paying for itself, for two measured reasons:
 *
 *   • THE ARSENAL IS COMPLETE. Six weapons, one box every other stage, and the
 *     rotation needs FOURTEEN stages to show each weapon once — about twenty
 *     minutes of play between two meetings with the same gun, against a shop
 *     that sells each one its own power track (`weaponPowerMul`). A purchase the
 *     player cannot use for twenty minutes is dead money.
 *   • THE ROADS GOT LONGER. 16-29 went from 38-45 s of running to 47-57 s, so
 *     "every other stage" became a box every ~2.5 minutes of play, and the
 *     stretch a player spends on the squad's own gun between two of them grew
 *     with it.
 *
 * So the long middle road (`LONG_ROAD_FROM`..`STAGE_RUN_BLEND_TO` − 1 in
 * `track.ts`) carries a box on EVERY stage, and the arsenal comes round every
 * seven. What stops it from becoming furniture is the thing the prize always
 * was: it is optional, it costs attention (two levers, a stone each), and it
 * MOVES — the box's place is dealt stage by stage (`LONG_ROAD_SLOTS` in
 * track.ts), so one stage's launcher is a whole-road weapon and the next one's
 * a weapon for the boss alone. It pairs with the other half of the same pass:
 * the long road carries half again the bodies it did (`fillFoeGaps`,
 * `layGuards`) and the scripted players kill 57 % more on it, and more to
 * shoot wants more to shoot it with. (The scripted players never solve a lever
 * puzzle, so the sims only see the furniture — measured, taking the odd-stage
 * boxes back off moved no clear rate on the stages checked (19, 27, 28). What a
 * box is worth to a player is the forced A/B in `scratch.weapons.test.ts`.)
 *
 * From `STAGE_RUN_BLEND_TO` (30) the road is the frozen legacy one
 * (`lateStagesFrozen.test.ts`) and keeps its every-other cadence, box for box.
 */
export const WEAPON_EVERY_STAGE_FROM = 16

/** Does this stage's road carry a puzzle at all? The one answer, so the track
 *  generator, the art preloader and the tests cannot drift apart. */
export const stageHasWeapon = (stage: number): boolean =>
  stage >= WEAPON_STAGE && (
    (stage >= WEAPON_EVERY_STAGE_FROM && stage < STAGE_RUN_BLEND_TO)
    || (stage - WEAPON_STAGE) % WEAPON_EVERY === 0
  )

/**
 * Which weapon this stage's box holds.
 *
 * Alternates across the stages that HAVE a box — not across every stage, which
 * is the bug the every-other-stage cadence would otherwise walk into: `stage %
 * 2` and a puzzle every second stage agree forever, and the campaign would ship
 * with the gatling never once appearing in a box.
 *
 * The gatling goes first. It is the weapon that changes nothing about how the
 * player aims, so the first prize teaches "the box pays out" without also
 * teaching a new verb; the launcher lands on stage 6. And because the stage-3
 * loaner is the player's own pick, the first box on the road is — for the
 * player who chose the rockets — the OTHER weapon: a second toy to discover,
 * and the rockets are two stages away again, where the banner says they are.
 *
 * A pure function of the stage number for the same reason everything else in
 * `track.ts` is: a stage has to be LEARNABLE. A player who lost stage 12 to a
 * swarm should know before they press retry that stage 12's prize is the
 * rocket, and plan the sweep for it.
 */
/**
 * --- Which weapon a box holds, with six of them ---------------------------
 *
 * Two rules, and the first is why this is a table rather than a modulo: a
 * weapon DEBUTS on a stated stage and is never seen before it. The road teaches
 * the two originals first (4, 6), then hands over one new verb at a time with a
 * stage of familiar ground between them; once the player has met all six, the
 * boxes rotate.
 *
 * The rotation is six long against the box-position order's eight
 * (`WEAPON_SLOT_ORDER` in `track.ts`), so no weapon is welded to one place on
 * the road. It is a pure function of the stage number for the reason everything
 * else in `track.ts` is: a player who lost stage 12 should know what stage 12's
 * box holds before they press retry.
 */
export const WEAPON_DEBUT: Readonly<Record<WeaponId, number>> = {
  gatling: WEAPON_STAGE,
  rocket: 6,
  grapeshot: 8,
  dynamo: 10,
  gravecall: 14,
  hoard: 18
}

/** The campaign's hand-authored deal, stage by stage. The stages between the
 *  debuts go back to the originals, so the first two never disappear.
 *
 *  The ODD stages 17-29 are the long middle road's extra boxes (see
 *  `WEAPON_EVERY_STAGE_FROM`). The even ones keep exactly the weapon they always
 *  dealt — 20-28 fall through to `WEAPON_ROTATION` below, unchanged — and the
 *  odd ones were searched (all 6^7 deals) against three rules at once: never
 *  the weapon either side of it (29 included, against 30's dynamo); never a
 *  weapon twice in the same place on the road (`LONG_ROAD_SLOTS` in track.ts);
 *  and EVERY seven consecutive boxes show all six weapons, which exactly one
 *  deal manages — 16-29 reads rocket, gravecall, hoard, rocket, grapeshot,
 *  dynamo, gatling, hoard, gravecall, grapeshot, rocket, dynamo, hoard, gatling.
 *  The hoard keeps its debut on 18, so 17 is not it. */
const WEAPON_CAMPAIGN: Readonly<Record<number, WeaponId>> = {
  4: 'gatling', 6: 'rocket', 8: 'grapeshot', 10: 'dynamo',
  12: 'gatling', 14: 'gravecall', 16: 'rocket', 18: 'hoard',
  17: 'gravecall', 19: 'rocket', 21: 'dynamo', 23: 'hoard',
  25: 'grapeshot', 27: 'dynamo', 29: 'gatling'
}

/**
 * ...and the loop it falls into once every weapon has been met.
 *
 * SEVEN long for six weapons, and that is the whole reason the gatling is in it
 * twice. The box's POSITION on the road runs on its own eight-long order
 * (`WEAPON_SLOT_ORDER` in `track.ts`); a six-long weapon loop shares a factor
 * with it, and two dials whose periods share a factor are one dial — each slot
 * would only ever deal half the arsenal, and "the shotgun is the one at the end
 * of the road" would be true for the rest of the campaign. Seven is coprime
 * with eight, so every weapon is dealt in every position.
 *
 * The gatling takes the repeat because it is the weapon that teaches nothing
 * new: a player who meets it twice in a rotation has lost the least.
 */
export const WEAPON_ROTATION: readonly WeaponId[] =
  ['grapeshot', 'gatling', 'gravecall', 'rocket', 'hoard', 'dynamo', 'gatling']

/** The first box stage past the authored table. */
export const WEAPON_ROTATION_STAGE = 20

export const weaponForStage = (stage: number): WeaponId => {
  const authored = WEAPON_CAMPAIGN[stage]
  if (authored) return authored
  const n = Math.max(0, Math.floor((stage - WEAPON_ROTATION_STAGE) / WEAPON_EVERY))
  return WEAPON_ROTATION[n % WEAPON_ROTATION.length]!
}

// ─── The furniture ──────────────────────────────────────────────────────────

/**
 * How far out the levers sit, world x.
 *
 * Practically ON the rails. Nothing else in the game lives this far off the
 * centre line — `CRATE_DETOUR_X` is 2.45 and a gate leaf tops out at 3.5 — so
 * the position itself is the tell: a player who has learned the road knows that
 * a thing at 3.4 is not part of the ordinary vocabulary.
 */
export const LEVER_X = 3.4

/**
 * Half-extent of a lever post, world units.
 *
 * It has no contact rule at all — the crowd runs straight through one it failed
 * to shoot — so this is purely how big the thing is to SEE and to hit, and both
 * of those want it generous. It was 0.42, which is smaller than a supply crate,
 * and on a desktop viewport (where the lane letterboxes to a narrow strip) the
 * post came out about forty pixels tall out at the rail, in the darkest part of
 * the road. A prop the player is supposed to notice from ten units out cannot be
 * the smallest thing on screen.
 *
 * Bigger also means a wider hitbox, which is the right direction: this beat
 * charges attention, not precision, and a lever that punishes a slightly loose
 * line is charging the wrong thing.
 */
export const LEVER_R = 0.58

/**
 * How far up the road the SECOND lever sits from the first.
 *
 * The two are staggered rather than paired across one line, and this is the
 * number that makes the puzzle possible at all. The guns reach `BULLET_RANGE`
 * (10.8 units) and the crowd closes at ~5.5 u/s, so a lever is shootable for
 * about two seconds — and crossing the lane at `STEER_SPRING` takes most of
 * one. Two levers on the same line is therefore a coin flip on whether the
 * second one is still in range when the crowd finishes its sweep; staggered,
 * the second lever's window OPENS as the first one's closes, and the beat reads
 * as "left, now right" instead of "pick one".
 */
export const LEVER_STAGGER = 3.2

/**
 * Distance from the FIRST lever to the box.
 *
 * This is the number the beat's fairness is priced on, and the worst case is
 * the one to size it against: a player who pulls the second lever at the LAST
 * possible instant — with the crowd level with the post — has
 * `WEAPON_BOX_AHEAD - LEVER_STAGGER - WEAPON_GUARD_LEAD` units of road left
 * before the armour. At the 7.4 u/s speed ceiling that has to stay comfortably
 * over a second, and at 12 it was exactly 1.000 s, which is a coincidence and
 * not a margin. `weaponReactionS` is the assertion; `trackShape` holds it.
 *
 * Short enough, still, that the two halves of the beat are on screen together
 * at least once — which is what makes the causal link ("I shot those, THAT
 * opened") readable the first time it happens.
 */
export const WEAPON_BOX_AHEAD = 14

/** Half-extent of the prize box. Bigger than a supply crate: it is the one
 *  pickup on the road that is worth a detour on its own. */
export const WEAPON_BOX_R = CRATE_R * 1.45

/**
 * How long the box's "it just opened" ring runs, seconds.
 *
 * Owned here rather than inlined in the renderer because it is now load-bearing
 * in the SIM as well: a gift box is born open (`WeaponBox.locked`), and the ring
 * is a CAUSAL cue — "the levers went down, THAT happened" — which a box that was
 * never shut has no cause for. Spawning a gift with `openFor` already past this
 * is what suppresses it, so the two files have to agree on the number.
 */
export const WEAPON_REVEAL_S = 0.45

/**
 * ─── The gift box, stage 2 ─────────────────────────────────────────
 *
 * One weapon box, on the centre line, with NO levers, NO cover and NO armour —
 * the mechanic with the puzzle taken off it, so the first time a player meets a
 * weapon box they meet it as a gift rather than as a lock.
 *
 * It is what makes stage 2 reachable at all. `WEAPON_STAGE` is floored at 4
 * because stages below `HARD_OBSTACLE_FROM_STAGE` carry no scenery that can
 * kill, and the puzzle's ARMOUR and lever stones are both walls — so the puzzle
 * cannot go earlier. A bare box is not a wall: nothing here can kill anybody,
 * which is exactly why the rule that blocks the puzzle does not block this.
 *
 * For the same reason it sits in the MIDDLE of the road rather than on a
 * shoulder. `WEAPON_BOX_X`'s "never in the middle" is a safety rule about the
 * lethal armour standing in front of the box; with no armour there is nothing
 * on the centre line to be punished by, and the middle is where a beat goes
 * when the point is that nobody walks past it.
 *
 * The weapon is cleared by `startStage` like every other, so this is a taste
 * that lasts one road — it does not pre-empt the stage-3 choice
 * (`WEAPON_PICK_STAGE`), which still arrives fresh.
 */
export const WEAPON_GIFT_STAGE = 2

/** Does this stage carry the free box? */
export const stageHasWeaponGift = (stage: number): boolean => stage === WEAPON_GIFT_STAGE

/**
 * …and how much of the road it takes, as a share of the FULL lane width.
 *
 * "Almost not missable" is the whole brief, and it is a width rather than a
 * position: at 40 % of a 9-unit road the box is 3.6 wide and leaves 2.7 units
 * of open road at each rail — more than the 1.95 a full-size crowd needs to
 * squeeze past, so a player who deliberately hugs a rail still can, and
 * everybody else walks straight into it.
 *
 * That is 2x the half-extent of an ordinary prize box in each direction, which
 * is also why `WeaponBox` carries its own `r` now: one global constant cannot
 * describe both.
 */
export const WEAPON_GIFT_LANE_SHARE = 0.4
export const WEAPON_GIFT_BOX_R = (LANE_HALF * 2 * WEAPON_GIFT_LANE_SHARE) / 2

/**
 * Which weapon the gift hands over.
 *
 * The gatling rather than the launcher: stage 2 is the road that teaches the
 * trap and the elite, and "twice the fire rate" reads off the HUD without
 * needing a single thought about splash radius or travel time. The launcher is
 * the more distinctive toy and it gets its moment one stage later, as one of
 * the two cards a player actually chooses between.
 */
export const WEAPON_GIFT_ID: WeaponId = 'gatling'

/**
 * …and how much health it has, against an earned box's.
 *
 * Well under, and the reason is that a gift has no second chance. The earned
 * box is a detour the player chose and can stand on until it breaks; this one
 * is passed at a run, and with no grind (see `WeaponBox.gift`) the only thing
 * opening it is the ~2 s of gunfire between coming into range
 * (`BULLET_RANGE` 10.8, at ~5.2 u/s) and walking over it. A stage-2 crowd is
 * eight or ten survivors doing about 12 damage a second, so the full 30 of
 * `weaponBoxHp(2)` is a coin flip: measured, a 17-strong squad opened it with
 * nothing to spare, and a weaker one walks straight through the "unmissable"
 * gift without collecting it.
 *
 * At 40 % it is 12 health — about a second of a beginner's fire, so the box
 * pops open in front of them and the beat reads as the gift it is.
 *
 * ⚠ The "~2 s of gunfire" above was WRONG when it was written, and the open-box
 * pass is what made it true rather than what changed it. A locked box refuses
 * damage outright, and the gift did not unlock until `anchorY + 6` — so the
 * window a beginner actually had was 6 / 5.21 = 1.15 s, not the 10.83 / 5.21 =
 * 2.08 s the number is derived from. Everything measured under 1.0 and under
 * 0.4 was measured against that shorter window; the mul is left at 0.4 because
 * the design intent was always the sentence in the paragraph above, and the
 * intent and the arithmetic now agree. What the wider window buys is the WEAK
 * squad — the one this constant was cut for — which now opens the box in front
 * of itself instead of on the last frame before contact. Measured across four
 * squad sizes on stage 2, the break distance was 5.93 / 5.99 / 6.00 / 6.00
 * units shut — clamped flat by the unlock rather than by anybody's damage — and
 * 11.2 to 13.0 open. `balance.test.ts` re-run either side: 24/24 both times,
 * and at eight seeds the stage-2 careless clear rate is 0.375 both ways.
 */
export const WEAPON_GIFT_HP_MUL = 0.4

/** Does this stage's road carry a weapon box of ANY kind — the earned puzzle or
 *  the stage-2 gift? What the art preloader and the road audits want; the two
 *  beats keep separate predicates because only one of them is a puzzle. */
export const stageHasWeaponBox = (stage: number): boolean =>
  stageHasWeapon(stage) || stageHasWeaponGift(stage)

/** How far in front of the box the armour stands. */
export const WEAPON_GUARD_LEAD = 1.4

/**
 * Where the box parks, world x, as a distance from the centre line.
 *
 * On a SHOULDER, never in the middle, and that is a safety rule rather than a
 * layout preference. The armour is lethal on contact like every other wall, and
 * a lethal wall on the centre line is the one obstacle a player cannot ignore —
 * they would be paying for a beat they chose not to play. Out here it leaves
 * `WEAPON_FREE_LANE` of open road on the other side, which is more than a crowd
 * at full size needs.
 */
export const WEAPON_BOX_X = 2.6

/** Half-width of the armour, centred on the box. */
export const WEAPON_GUARD_HALF_W = 1.2

/**
 * Clear road left beside the armour, world units.
 *
 * Asserted in `weaponPuzzle.test.ts` against `MIN_RUN_GAP`: a crowd at full
 * size has to fit past this beat without losing anybody, or the "free to
 * ignore" promise above is a lie. The armour's inner edge is at
 * `WEAPON_BOX_X - WEAPON_GUARD_HALF_W` = 1.4, and the road from the far rail to
 * that edge is `4.5 + 1.4` = 5.9 against a 4.9 requirement.
 */
export const WEAPON_FREE_LANE = LANE_HALF + (WEAPON_BOX_X - WEAPON_GUARD_HALF_W)

/**
 * HP of one lever.
 *
 * Deliberately trivial, and deliberately NOT scaled by the difficulty knobs the
 * way a crate is. The puzzle charges attention; charging DPS as well would mean
 * a run that is already losing — small crowd, low damage, exactly the run a free
 * weapon exists to rescue — is the one run that cannot afford the rescue.
 * A third of a supply crate, which a squad of three breaks in about a second.
 */
export const leverHp = (stage: number): number =>
  Math.max(3, Math.round(4 + Math.min(stage, 20) * 0.45))

/**
 * ─── The stone over a lever ─────────────────────────────────────────────────
 *
 * One destructible boulder parked in front of each post, in the same column,
 * and the ONE thing between the player and a lever that is otherwise free.
 *
 * It exists because the levers were, in play, hit by accident: they sit at
 * |x| = 3.4 with a 0.58 hitbox and no cover, the crowd fires fourteen scattered
 * streams up the road, and any line that came within a unit of the rail solved
 * half the puzzle without the player ever looking at it. That is the mechanic
 * paying out for something it did not ask for.
 *
 * What the stone must NOT become is a second health check. Everything about its
 * numbers is chosen against that:
 *
 *   • it is DESTRUCTIBLE, unlike every other boulder in the game. The renderer
 *     prints its remaining health on it for exactly that reason — the game's
 *     own vocabulary says a rock is the thing fire cannot answer, so a stone
 *     the player is required to shoot has to carry the "shoot me" mark a
 *     barricade carries or it reads as a wall around the prize.
 *   • it is HARMLESS on contact, like the armour and unlike a wall — see
 *     `Guard`. It is furniture bolted to an optional bonus, on a shoulder the
 *     beat is inviting the crowd onto.
 *   • it is ONE stone, not a row. The player has to spend fire in one place,
 *     which is the cost the puzzle was missing; they do not have to win a
 *     second fight to get to the first one.
 */

/**
 * Its health.
 *
 * ─── Why this is not a share of the stage's wall any more ───────────────────
 *
 * It used to be `barricadeHp(stage) * 0.7`, on the reasoning that a barricade
 * is the game's yardstick for "a solid thing you may shoot down" and a lever's
 * cover should cost less than the walls the road is already charging for. The
 * yardstick was the mistake. A wall is priced to be chewed by a whole crowd's
 * scattered fire over a long approach; this stone has to come off inside one
 * lever's window, from fire deliberately POINTED at one 1.6-wide body on a
 * rail. Those are different purchases and the wall does not price either of
 * them for the other.
 *
 * What that cost, measured on stage 4 — the first puzzle any player meets, and
 * the one this was reported against:
 *
 *   • the stone was 42 hp and the lever behind it 6. The cover cost SEVEN
 *     TIMES the thing it covered, on a beat whose own documentation says the
 *     lever is deliberately trivial so that a struggling run — "exactly the run
 *     a free weapon exists to rescue" — can still pay it;
 *   • a no-upgrade run arrives with a squad of 14 at 1.0 damage and 1.9 shots,
 *     so 26.6 dps in total (sim, five seeds, all identical — the opening is not
 *     seed-dependent);
 *   • one shoulder therefore wanted 1.8 s of EVERY stream on target, inside a
 *     2.14 s window, twice, while the same fire is what grows the crowd at the
 *     gates. The puzzle was not hard for a new player, it was arithmetically
 *     shut.
 *
 * So the stone gets its own curve, priced in the currency the beat actually
 * charges: a moment of a committed crowd's fire, plus room to miss. At stage 4
 * that is 9 hp — half a lever and a half — which the measured opening run takes
 * off in 0.34 s with every stream on it and 0.56 s with most of them. A whole
 * shoulder, stone and lever together, is then 0.94 s of a 2.14 s window, which
 * leaves the rest of it for the second shoulder and for the gates that are what
 * the crowd is actually there to grow on.
 *
 * Cheap is not free, and the distance between those two is the entire point of
 * the stone. What it defends against is a STRAY round, and a stray round is one
 * of fourteen streams carrying `dps / 14` — 1.9 dps on this stage. Nine health
 * is still 4.7 s of that, which is twice the window: a crowd drifting past the
 * rail does not take this off by accident, which is the whole reason the stone
 * was added. It only stops being a second health check on the run that can
 * least afford one.
 *
 * It keeps growing for the same reason, since a later crowd's stray stream
 * carries far more — it just grows like a prop on an optional bonus and not
 * like a wall: 9 at stage 4, 19 at 10, 35 at 20, flat at 51 past 30.
 */
export const leverStoneHp = (stage: number): number =>
  Math.max(1, Math.round(3 + Math.min(stage, 30) * 1.6))

/**
 * How far in FRONT of its lever the stone sits, world units.
 *
 * Far enough that the two are separate targets — a stone overlapping the post
 * would make the pair one silhouette and the beat unreadable — and short
 * enough to stay well inside `WEAPON_LANE_CLEAR`, the stretch the generator
 * guarantees is free of other scenery. It is also the free head start: the
 * stone enters the gun's reach this many units before the lever would have,
 * so shooting it does not come out of the lever's own window.
 */
export const LEVER_STONE_LEAD = 2.2

/**
 * Width of the stone, world units.
 *
 * Wider than the lever's hittable span (`LEVER_R + BULLET_R`, about 1.3 across)
 * so it genuinely covers the column rather than leaving a rim of it exposed —
 * that rim is precisely the accident the stone is here to stop. Not much wider:
 * cover that reaches past its post starts eating the rounds aimed at the road
 * beside it.
 */
export const LEVER_STONE_W = 1.6

/** Half-depth of a stone, world units. A boulder's own, so the two read as the
 *  same kind of object — one of which happens to be breakable. */
export const STONE_H = 1.15

/**
 * One stone over one lever.
 *
 * Its own type rather than a `Rock` with health bolted on, for the reason
 * `Guard` is not a `Barricade`: `getRocks()` means "the boulders this stage
 * laid out" to the funnel, the crowd's avoidance and the balance harness, and
 * every one of those would start answering a slightly different question if a
 * destructible, harmless, puzzle-owned body appeared in the set.
 */
export interface Stone {
  id: number
  /** The puzzle it belongs to — see `WeaponBox.puzzleId`. */
  puzzleId: number
  x: number
  y: number
  w: number
  hp: number
  maxHp: number
  flash: number
  dead: boolean
  /** Fixed per-body tilt and silhouette seed, exactly as a boulder's. */
  spin: number
  seed: number
}

/**
 * HP of the prize box.
 *
 * Chunky — around three supply crates. Once the armour is off, the box is still
 * something the player has to STAND ON and shoot, which is the beat that makes
 * the reward feel taken rather than driven over, and it is the reason the
 * shoulder detour costs something.
 */
export const weaponBoxHp = (stage: number): number =>
  Math.round(22 + Math.min(stage, 25) * 4 + Math.max(0, stage - 25) * 1.6)

/**
 * HP of one armour block. Six barricades' worth, and that multiple is the
 * point.
 *
 * Not invulnerable, on purpose — it is an ordinary wall with an extraordinary
 * amount of health, and `stepWeaponBoxes` opens the box whenever nothing is
 * covering it any more, however that came about. A player with a monstrous
 * crowd who wants to brute-force the lid instead of reading the road is welcome
 * to try, and the arithmetic says what it costs: the armour comes into range
 * ~10.8 units out, which is under two seconds of fire, against twenty walls'
 * worth of health across the two plates. A run that can do that in the time
 * available has earned the box by any measure that matters.
 *
 * It was 6, and 6 was measurably too cheap: a stage-8 crowd of eighty at four
 * damage tore both plates off inside the window, which made the levers optional
 * on exactly the runs that least needed the help — and made the outcome of the
 * beat depend on how the fire happened to scatter, which is the one thing a
 * puzzle may not do. At 10 the levers are the cheaper answer on every run the
 * campaign actually produces.
 */
export const WEAPON_GUARD_HP_MUL = 10

/**
 * Seconds of road between the last lever and the armour, at this stage's speed.
 *
 * Not read by anything that runs — it exists so `trackShape.test.ts` can assert
 * that the reaction window never collapses as `stageSpeed` climbs. At stage 1
 * speed it is 1.6 s and at the 7.4 u/s ceiling it is 1.2 s, which is the floor
 * the beat is designed against.
 */
export const weaponReactionS = (stage: number): number =>
  (WEAPON_BOX_AHEAD - LEVER_STAGGER - WEAPON_GUARD_LEAD) / stageSpeed(stage)

// ─── The live objects ───────────────────────────────────────────────────────

/**
 * One lever post.
 *
 * No contact rule and no `w` — it is the only solid-looking prop in the game
 * that is not solid. A crowd that runs over an unshot lever passes straight
 * through it and loses nobody, which is the honest reading of "you missed
 * this": the puzzle's punishment is the prize you do not get, and stacking a
 * death on top of that would turn a bonus into a hazard.
 */
/**
 * --- One of Gravecall's dead, back on its feet ------------------------------
 *
 * A thrall is NOT a `Foe` with a flag: every hostile in the game is billed,
 * aimed at, collided with and drawn off that array, and a friendly body inside
 * it is a special case in twenty places. It is its own small entity with its own
 * step, and it borrows only the two things it has to look right — the design it
 * was raised from, so it is visibly the creep that just died, and its scale.
 */
export interface Thrall {
  id: number
  /** The design it wore alive, so the renderer draws that creature. */
  design: string
  /** …and the archetype, which is what a test reads to know what it was. */
  typeId: string
  x: number
  y: number
  hp: number
  maxHp: number
  scale: number
  /** Counts up through `THRALL_RISE_S` while it claws its way up. Untouchable
   *  and unable to swing until it reaches zero. */
  rising: number
  /** Seconds until it can swing again. */
  swingCd: number
  /** 0..1, decayed by the sim — the white flash a hit puts through it. */
  flash: number
  dead: boolean
}

/**
 * --- One of the Hoard's gilded corpses --------------------------------------
 *
 * A body the Hoard killed, standing as gold for `GILD_STAND_S` before it bursts
 * into coins. It is scenery with a clock: nothing collides with it, nothing
 * aims at it, and the only thing it does is end.
 */
export interface Statue {
  id: number
  design: string
  x: number
  y: number
  scale: number
  /** Seconds left before it bursts. */
  left: number
  /** Coins the burst pays. Priced when the body fell, so a Scavenging level
   *  bought mid-flight cannot change what a corpse already owed. */
  coins: number
}

export interface Lever {
  id: number
  /** The puzzle this lever belongs to — see `WeaponBox.puzzleId`. */
  puzzleId: number
  x: number
  y: number
  hp: number
  maxHp: number
  /** Shot through. Terminal: a pulled lever is never un-pulled. */
  pulled: boolean
  /** Hit flash, 0..1, ticked down by the sim so the renderer needs no clock. */
  flash: number
  /** Seconds since it was pulled, for the renderer's throw animation. */
  pulledFor: number
}

/**
 * One armour plate over a weapon box.
 *
 * ─── Why this is NOT a `Barricade` ──────────────────────────────────────────
 *
 * It looks like one — a slab with health, sitting across the road, deleted by
 * enough fire — and it was one, briefly. Two things made that wrong, and both
 * of them were invisible until something else in the game tripped over it:
 *
 *   1. IT MUST NOT KILL. Every wall in this game erases whoever runs into it,
 *      and the difficulty curve is tuned around how many of them a stage puts
 *      out. This beat adds two more, on every stage from 4, that the curve
 *      never budgeted for — and it adds them to a BONUS the player did not ask
 *      for. The game's own rule for props attached to a reward is the supply
 *      crate's: a reward that punishes the approach as hard as a wall teaches
 *      players to stop approaching rewards. So a plate grinds like a crate.
 *      (Measured before the split: two existing balance tests died on it, both
 *      because a crowd steering an ordinary line was deleted by armour that had
 *      no business being lethal.)
 *   2. IT MUST NOT BE COUNTED AS ONE. `getBarricades()` means "the walls this
 *      stage laid out" to a dozen call sites — the renderer, the crowd's
 *      obstacle avoidance, `deathBreakdown`, the balance harness. Quietly
 *      widening that set to include a puzzle's furniture makes every one of
 *      those answer a slightly different question than it used to.
 *
 * What it keeps from a wall: it is solid to rounds, it has real health, and the
 * crowd routes around it. What it does not keep is the teeth.
 */
export interface Guard {
  id: number
  /** The puzzle that owns it — all of them go at once. */
  puzzleId: number
  x: number
  y: number
  w: number
  hp: number
  maxHp: number
  flash: number
  dead: boolean
}

/** Half-depth of an armour plate, world units. Deeper than a barricade so the
 *  lid reads as a slab rather than as a fence. */
export const GUARD_H = 1.1

/**
 * The prize.
 *
 * `locked` is the whole state machine: it flips to false the moment every lever
 * of the same `puzzleId` is pulled, and that one write is what deletes the
 * armour, opens the box's health to fire and changes its read on screen.
 */
export interface WeaponBox {
  id: number
  puzzleId: number
  weapon: WeaponId
  x: number
  y: number
  /** Half-extent, in world units. Per box rather than the `WEAPON_BOX_R`
   *  constant because the stage-2 gift is twice the size of an earned one
   *  — see `WEAPON_GIFT_BOX_R`. */
  r: number
  /**
   * A gift box costs the crowd NOTHING to open — no grind, gunfire only.
   *
   * An earned box is deliberately something you stand on and shoot: the grind
   * is what makes the prize feel taken. That pricing assumes a late-stage crowd
   * against a box of `WEAPON_BOX_R`. The stage-2 gift is twice as wide, so twice
   * as much of the crowd is in contact for twice as long, and it meets a squad
   * of ten — measured in a browser, a crowd that walked into it went 10 -> 5 -> 0
   * and WIPED with the box still at a third health. A teaching beat that kills
   * the class is not a gift.
   */
  gift: boolean
  hp: number
  maxHp: number
  /**
   * Armour still on. A locked box refuses damage outright rather than merely
   * being hidden behind the wall — a round that squeaked past the armour's edge
   * should not quietly solve the puzzle.
   *
   * ─── A GIFT IS BORN OPEN, AN EARNED BOX IS NOT ────────────────────────────
   *
   * `locked` used to start true for EVERY box, gift included, and the gift has
   * no armour to be locked by — so what actually opened it was the proximity
   * test at the top of `stepWeaponBoxes` ("nothing is covering this any more"),
   * which does not run until the box is inside `anchorY + 6`. Measured on
   * stage 2 under the pre-2026-09-18 camera (speed 5.21 u/s, 13.68 units of
   * visible road — ~14.3 to the top edge and ~11-12 under the HUD bar since the
   * zoom, which shortens the first bullet below by a few tenths and changes
   * none of the argument):
   *
   *   • the box slides on screen 13.68 units out — 2.63 s before contact;
   *   • it read as a SHUT grey crate under a cross-brace for the first 7.68 of
   *     those units, 1.48 s, 56 % of the entire approach;
   *   • the prize only lit up at 6 units, 1.15 s out.
   *
   * The first theory of the bug was that 1.15 s is not enough road to react in,
   * and the measurement KILLED it: a full-lane correction settles in about a
   * quarter of a second (`weaponPuzzle.test.ts` times it), so six units is four
   * or five crossings' worth of slack. Steering was never the binding
   * constraint — which is precisely why a closed box survived this long, since
   * nobody could point at a moment where the prize was unreachable.
   *
   * What it actually cost is two other things:
   *
   *   1. THE OBJECT SIGNALLED THE WRONG CATEGORY for the majority of its
   *      approach. Braced grey steel is what an obstacle looks like on this
   *      road; the one beat on stage 2 whose whole job is to be walked into
   *      spent 56 % of its visible life dressed as a thing to walk around.
   *   2. IT WAS NOT SHOOTABLE. This box is opened by gunfire, not by contact,
   *      and a locked box refuses damage outright — so the guns got 6 units of
   *      window where `BULLET_RANGE` offers 10.83, and the shortfall lands on
   *      exactly the weak squad the beat exists to rescue.
   *
   * (2) also silently halved the window the box is PRICED against:
   * `WEAPON_GIFT_HP_MUL` is sized on "the ~2 s of gunfire between coming into
   * range and walking over it" — so the real spendable window was
   * 6 / 5.21 = 1.15 s, not `BULLET_RANGE` / 5.21 = 2.08 s.
   *
   * So a gift spawns with `locked: false`. It is not a new state; it is the
   * absence of a state it never had a cause for.
   *
   * THE EARNED BOX STAYS SHUT, and that is a decision rather than an oversight.
   * The argument for opening it too is consistency; the argument against is that
   * the two boxes are not the same offer. The gift asks ONE question — "is this
   * worth steering into" — and the answer has to be on the object, because the
   * object is all there is. The earned box asks "is this worth going to find two
   * levers for", and the player already has that answer for free: `WeaponTag`
   * names the weapon on the HUD from the moment the beat streams in, twelve
   * units before the box is even on screen. Opening the case as well would buy
   * no information and spend the one thing the puzzle has — `unlockPuzzle`'s
   * reveal is the only moment in the game that says "the thing you shot did
   * THIS", and a lid that was already off cannot say it. Consistency of
   * INFORMATION (both beats tell you the weapon before you commit) is the
   * promise worth keeping; consistency of APPEARANCE would cost the mechanic
   * its one teacher.
   */
  locked: boolean
  /**
   * How many levers this puzzle has, and how many are down.
   *
   * On the BOX rather than counted out of the live lever array, and that is a
   * correctness rule rather than a convenience. Levers are culled once the crowd
   * is past them, and the two are staggered — so a player who shoots only the
   * SECOND lever leaves the first behind them unpulled, it gets culled, and a
   * count derived from what is still in the array would then read "none left to
   * pull" and open the box for free. A tally that only ever moves when a lever
   * actually goes over cannot be fooled by the cleanup.
   */
  leversTotal: number
  leversPulled: number
  /** Seconds since it unlocked, for the renderer's reveal. */
  openFor: number
  dead: boolean
  spin: number
}
