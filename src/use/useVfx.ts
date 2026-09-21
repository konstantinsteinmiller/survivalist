import { ref } from 'vue'
import type { GateOp, GatePrize } from '@/game/survival'
import type { WeaponId } from '@/game/weapons'
import {
  bakeRadialSprite, getRamp, getSprite, putRamp, putSprite, rgbString
} from '@/use/useGradientRamps'
import { spriteFor } from '@/game/art'
import { deviceClass } from '@/use/deviceProfile'

/**
 * ─── VFX: event bus + pooled particle system ────────────────────────────────
 *
 * The simulation never touches pixels. It pushes semantic events ("a gate
 * ticked up here", "a crate burst") into a ring buffer; the renderer drains it
 * once per frame and turns each event into particles, floating text, screen
 * shake and sound.
 *
 * That split is what lets the whole feel of the game be re-tuned without ever
 * opening the simulation — and it is why the sim stays unit-testable in jsdom,
 * where there is no canvas at all.
 *
 * PERFORMANCE: particles live in flat typed arrays with a swap-remove free
 * list, so a 400-particle gate burst allocates nothing. Draw order is bucketed
 * by blend mode, so the canvas switches `globalCompositeOperation` exactly
 * twice per frame instead of once per particle.
 */

// ─── Events ─────────────────────────────────────────────────────────────────

export type FxEvent =
  /**
   * A survivor fired. Cheap and very frequent — throttled downstream.
   *
   * `weapon` is which gun it left, because a launch is not a rifle shot. It
   * shipped without this and the loudest weapon in the game played the squad's
   * own tick — the only rocket sound anywhere was the one the BLAST made, a
   * quarter of a second later and in the wrong place.
   */
  | { kind: 'shoot'; x: number; y: number; weapon?: WeaponId | null }
  /** A round landed on something. `on` picks the impact's colour and weight. */
  | { kind: 'hit'; x: number; y: number; on: 'gate' | 'crate' | 'barricade' | 'rock' | 'foe' | 'boss' }
  /** Sustained fire pushed a `+N` gate up by one — THE feedback moment — or a
   *  `-N` gate DOWN by one, which is the same clock costing the player instead
   *  of paying them. `hostile` is which of the two just happened; the mixer and
   *  the renderer both need it, because they must not celebrate. */
  // `value` is what the door now reads (it pitches the tick); `step` is what
  // this tick actually added to it — the stage's pump step, a tenth on a
  // scale door, or less than either when the cap clipped it. The number that
  // flies up is the STEP, so a `+3` door does not print `+1` three times.
  | { kind: 'gateTick'; x: number; y: number; value: number; step: number; hostile?: boolean }
  /** The crowd ran through a gate. `gain` is the change in squad size: positive
   *  for `add` / `mul`, NEGATIVE for the `div` and `sub` doors. */
  | {
      kind: 'gatePass'; x: number; y: number; op: GateOp; value: number; gain: number
      /** The door was face-down until this instant — the renderer turns it over
       *  rather than just swapping the plate. See "The face-down door". */
      flipped?: boolean
      /** A prize door (`GatePrize`): `op`/`value`/`gain` are a `+0` placeholder
       *  and must not be read as a payout. */
      prize?: GatePrize
    }
  /**
   * A leaf of the bank the player did NOT take, blowing itself apart.
   *
   * One bank, one door: the instant the crowd commits, every other offer is
   * destroyed. This is the headline VFX of the whole game — it is the moment
   * the player's decision becomes irreversible, and it has to look like it.
   */
  | {
      kind: 'gateDismiss'
      x: number
      y: number
      halfW: number
      op: GateOp
      value: number
      /** How far this leaf is from the one that was taken, in world units —
       *  the shockwave arrives later the further away it is. */
      distance: number
      /** Was face-down until the bank resolved — see `gatePass.flipped`. */
      flipped?: boolean
      /** A prize door; its wreckage wears the prize, not its `+0`. */
      prize?: GatePrize
    }
  /** A supply crate burst. `crate` picks which stat went up and `value` is the
   *  new total, so the floating text can read "DMG 4" or "RATE 2.4". */
  /** The biggest payout of the run so far, the instant it lands. The renderer
   *  answers with a camera punch and a shake; the sim is already holding the
   *  world slow (`PEAK_HOLD_MS`). See `PEAK_GAIN_SHARE`. */
  | { kind: 'peak'; x: number; y: number; gain: number }
  /** The idle chest, run over on the road (`ROAD_CHEST_AT`). */
  | { kind: 'chestOpen'; x: number; y: number }
  | { kind: 'crateBreak'; x: number; y: number; crate: 'damage' | 'rate'; value: number }
  | { kind: 'barricadeBreak'; x: number; y: number }
  | { kind: 'foeDie'; x: number; y: number; big: boolean }
  /** A miniboss walked on / died. Worth its own announcement either way. */
  | { kind: 'eliteSpawn'; x: number; y: number }
  /**
   * A miniboss's arc across the road. `x` / `y` are the elite's own feet, which
   * is where the arc is swung from; `reach` is how far down the road it
   * travelled, and it is the same number the kill was measured against.
   *
   * `dir` is which way it swung (±1), so the dust and the bodies leave along
   * the arc rather than away from a point. `heavy` is the archetype's weight,
   * not its damage: a brute plants and turns, a hound throws itself. Same
   * numbers, opposite rhythm — the renderer and the mixer both read it to keep
   * the two readable apart.
   */
  | { kind: 'eliteSweep'; x: number; y: number; reach: number; dir: number; heavy: boolean }
  | { kind: 'eliteDie'; x: number; y: number }
  /** The player pulled the pin — the throw itself. */
  /**
   * ─── The casts ────────────────────────────────────────────────────────────
   *
   * A big attack's TELEGRAPH, as a thing that travels rather than a mark on the
   * floor.
   *
   * The ring that closes on the ground was legible in isolation and invisible in
   * practice: the player is watching the boss, or watching their own thumb, and
   * the one place they are not looking is the patch of road they are about to be
   * standing on. So the hit landed out of nowhere and the game read as taking
   * survivors for reasons the player could not see — which is the difference
   * between a hard fight and an unfair one.
   *
   * These are emitted at the START of the wind-up and carry `ttl` — the exact
   * time until the damage lands — so the animation arrives on the beat rather
   * than near it. The ring stays; this is what draws the eye to it.
   */
  | {
      kind: 'meteorCast'; x: number; y: number
      /** Ground footprint, so the shadow matches the ring already being drawn. */
      radius: number
      /** Seconds until impact. The fall is scaled to land exactly then. */
      ttl: number
      /** The charged swing: a bigger, burning boulder rather than a stone. */
      charged: boolean
    }
  | {
      kind: 'sliceCast'; x: number; y: number
      reach: number
      /** Which way the arc travels — chosen at wind-up, same as the hit. */
      dir: number
      ttl: number
    }
  /**
   * ─── …and the three pool minibosses' own tells ────────────────────────────
   *
   * Same contract as the two casts above and for the same reason: emitted ONCE,
   * at the start of the wind-up, carrying the exact seconds until the damage
   * lands. An effect that arrives late teaches the player the wrong moment to
   * move, which is worse than no effect at all.
   *
   * The roller has no cast, and that is deliberate rather than an omission: its
   * telegraph is the ball itself rolling down the road for a second and a half,
   * and a wind-up event on top of a two-and-a-quarter-unit object already
   * filling half the screen would be a second warning for the same thing.
   * `drawRollers` paints the lane it owns instead, straight from the world.
   */
  /** A bomber armed. `radius` is the blast it will throw, `ttl` its fuse. */
  | { kind: 'bombCast'; x: number; y: number; radius: number; ttl: number }
  /** …and it went off. */
  | { kind: 'bombBlast'; x: number; y: number; radius: number }
  /**
   * A gunner locked a shot. `tx` / `ty` are where it is aiming, so the line the
   * player is shown is the line the bolt actually takes — the aim is locked at
   * the start of the window exactly as the boss's slam is.
   */
  | { kind: 'boltCast'; x: number; y: number; tx: number; ty: number; ttl: number }
  /** …and fired it. */
  | { kind: 'boltFire'; x: number; y: number; dirX: number; dirY: number }
  /** A bolt buried itself in the crowd, or ran out of road. `spent` is true when
   *  it stopped because it had taken everyone it was allowed to. */
  | { kind: 'boltEnd'; x: number; y: number; spent: boolean }
  /** The ball rolled over part of the squad. `dir` is the side it came down, so
   *  the debris leaves along the roll rather than away from a point. */
  | { kind: 'rollerHit'; x: number; y: number; dir: number }

  /*
   * ─── A NOTE ON THE TWO BOLTS ──────────────────────────────────────────────
   *
   * The elite pool and the boss pool were built in parallel and both arrived at
   * a slow fat projectile, so both reached for `boltCast`. They are genuinely
   * different attacks — the gunner's flies down a locked column and kills only
   * what it passes through, the healer's bursts where it arrives — so the boss's
   * is prefixed like its `bossRake` and `bossHeal` siblings rather than one of
   * them being bent to fit the other.
   */

  /**
   * ─── …and the three the boss pool added ───────────────────────────────────
   *
   * Same contract as the two above: pushed at the START of the wind-up, carrying
   * the exact seconds until the damage lands, so the animation arrives on the
   * beat rather than near it.
   *
   * The one deliberate exception is `bossBoltCast`, and it is called out in its own
   * comment: a projectile's damage lands when the projectile arrives, which the
   * player reads off the projectile. Its `ttl` is the muzzle glow.
   */
  | {
      kind: 'rakeCast'; x: number; y: number
      /** Centre of each gouge, in world x. The kill reads the same array. */
      lanes: readonly number[]
      /** Half-width of one gouge, and half the depth of the whole rake. */
      halfW: number
      depth: number
      ttl: number
    }
  /** The rake landed. Same geometry, so the scar sits exactly on the warning. */
  | {
      kind: 'bossRake'; x: number; y: number
      lanes: readonly number[]
      halfW: number
      depth: number
    }
  /**
   * The enraged boss is winding up a charge straight down the lane.
   *
   * Same contract as every cast above and it matters more here than anywhere
   * else, because this is the one attack whose answer is a full lateral
   * commitment rather than a step: `ttl` is the exact seconds until the swathe
   * is billed, so the band the player is reading and the beat they have to be
   * out of it by are the same clock.
   *
   * `x` is the locked column centre and `halfW` its lethal half-width — the kill
   * reads both from the same two numbers. `y` is where the boss starts and `toY`
   * where its body ends up, so the band is painted over exactly the ground the
   * charge crosses.
   */
  | {
      kind: 'chargeCast'; x: number; y: number
      halfW: number
      toY: number
      ttl: number
    }
  /** …and it went through. Same geometry, so the scars sit on the warning. */
  | { kind: 'bossCharge'; x: number; y: number; halfW: number; fromY: number }
  /**
   * The fight turned over: the boss is in phase two from this frame on.
   *
   * Pushed alongside `bossRage` rather than instead of it, because they are two
   * facts about one beat — the gate says "it has planted and your fire has
   * stopped working", this says "and it is not the same boss any more". One
   * frame, one moment: the colour shift, the roar and the shake all hang off
   * this and nothing about phase two fades in.
   */
  | { kind: 'bossEnrage'; x: number; y: number }
  /** The healer is winding up its every-third. `ttl` to the moment the bar
   *  jumps — the one moment in the game a health bar goes UP. */
  | { kind: 'healCast'; x: number; y: number; ttl: number }
  /** …and it landed. `amount` is health actually restored (0 at full bar) and
   *  `hp01` is the bar afterwards, so the burst can be sized by what it was
   *  worth rather than by what it tried to be worth. */
  | { kind: 'bossHeal'; x: number; y: number; amount: number; hp01: number }
  /**
   * The healer's muzzle, winding up a bolt.
   *
   * `ttl` here is seconds until the bolt is LAUNCHED, not until it lands —
   * deliberately different from every other cast. The bolt is a real object that
   * crosses the road slowly, and it is its own warning for the second half of
   * the journey; a mark on the ground counting down to an impact the player can
   * already see coming would be a second clock disagreeing with the first.
   */
  | { kind: 'bossBoltCast'; x: number; y: number; ttl: number }
  /** A bolt went off on somebody. `radius` is the burst the kill was measured
   *  against, so the flash and the hit are the same size. */
  | { kind: 'bossBoltHit'; x: number; y: number; radius: number }
  /**
   * The healer is winding up a DRAIN down the column at `x`.
   *
   * The cast contract, exactly: pushed at the START of the wind-up (the drain is
   * aimed the instant its cycle opens), `ttl` the seconds until the beam lands.
   * `halfW` is the column's lethal half-width — the kill reads the same number
   * (`inDrainColumn`). `y` is the crowd's line, `fromY` the boss, so the band is
   * painted over exactly the road the beam will reach down.
   */
  | { kind: 'drainCast'; x: number; y: number; fromY: number; halfW: number; ttl: number }
  /** …and the beam landed. It holds for `hold` seconds, pulling. */
  | { kind: 'bossDrain'; x: number; y: number; fromY: number; halfW: number; hold: number }
  /**
   * Survivors pulled out of the crowd this tick — ONE event per tick with a
   * count, not one per body. At depth a drain eaten whole takes a thousand of
   * them, and the effect queue is a 512-slot ring.
   */
  | { kind: 'drainPull'; x: number; y: number; n: number }
  /** The beam let go. `healed` is the share of the bar it put back (0 when the
   *  crowd gave it nobody), so the renderer can say what the mistake cost. */
  | { kind: 'drainEnd'; x: number; y: number; taken: number; healed: number }
  /** A summoner spent one of its waves. `wave` is which — the last one should
   *  land differently from the first, because it is the last. */
  /**
   * `flank` is true when the wave came up at the two RAILS instead of in a line
   * ahead of the crowd — the summoner's second verb (see `FLANK_INSET`).
   *
   * ONE event either way, and that is a decision rather than an economy: `wave`
   * is what every spec measuring the wall counts (`SUMMON_WAVES_MAX`), and a
   * flanks wave logged as two events would read as the budget running out twice
   * as fast. `x` therefore stays the crowd's own centre for both shapes — the
   * point between the two packs — and the renderer reads `flank` to decide
   * whether to burst there or at the rails.
   */
  | {
      kind: 'summonWave'; x: number; y: number
      count: number
      wave: number
      flank: boolean
    }
  /**
   * A single body clawing up beside a summoner whose wall is spent and whose
   * crowd is down to a handful — the mercy trickle that lets a decided fight
   * end. Deliberately its OWN event rather than a one-body `summonWave`: the
   * wave is the budgeted wall and its count is what the specs measure, and a
   * trickle logged as a wave would read as the wall never ending.
   */
  | { kind: 'summonFlank'; x: number; y: number }
  /*
   * ─── The second verbs ─────────────────────────────────────────────────────
   *
   * Same contract as every cast above — pushed at the START of the wind-up
   * carrying the exact seconds until the damage lands — with one difference that
   * is worth stating out loud because it inverts what a mark on the ground has
   * meant in this game up to now.
   *
   * `shockCast` and `wardCast` paint ground the player is supposed to GET TO.
   * Every other mark here says "not here"; these two say "here". The renderer
   * has to make that unmistakable — a shock drawn in the meteor's own red would
   * be read as a slam with a strange middle, and a player who read it that way
   * would run out of the one place that is safe. See `drawCasts`.
   */
  /**
   * The meteor's ring of fire: everything between `eye` and `outer` burns, and
   * the disc inside `eye` does not.
   *
   * Both radii ride on the event because both are read by the kill
   * (`inShockBand`), and a telegraph drawn from anything but the numbers the
   * simulation bills against is the one lie this game will not tell.
   */
  | {
      kind: 'shockCast'; x: number; y: number
      eye: number
      outer: number
      ttl: number
    }
  /** …and it went off. Same two radii, so the scar sits exactly on the warning. */
  | {
      kind: 'bossShock'; x: number; y: number
      eye: number
      outer: number
      /** Which swing of the fight it was, for `bossSlam`'s reason — the ring
       *  events and the shock events are two subsequences of one sequence, and
       *  only the swing number puts them back together. */
      slam: number
    }
  /*
   * ─── The wyrm's three ─────────────────────────────────────────────────────
   *
   * Same contract as everything above: a cast carries the exact seconds until
   * the damage starts, and an impact event carries the geometry the kill was
   * measured against. What is new is that two of the three keep going after
   * they land — the jet burns across the road for `WYRM_SWEEP_S` and the spit
   * throws three gouts over `WYRM_SPIT_S` — so each beat of those is its own
   * event rather than one long one. The renderer therefore never has to hold a
   * clock the simulation is not also holding, which is the rule that keeps a
   * frozen fight's fire frozen and a dead wyrm's fire off the road.
   */
  /**
   * The wyrm is about to breathe. `dir` is which way the jet will travel (−1 is
   * right to left) and `x`/`y` the first flare's ground, so the mark is already
   * on the road the eye will be looking at.
   */
  | {
      kind: 'breathCast'; x: number; y: number
      dir: number
      ttl: number
    }
  /** One flare-up of the jet, lit. `i` is which of `WYRM_FLARES` it is — the
   *  renderer reads it to fade the trail of the ones already burnt. */
  | { kind: 'wyrmFlare'; x: number; y: number; i: number; dir: number }
  /** Spikes are coming up everywhere but a gap centred on `x`. */
  | { kind: 'spinesCast'; x: number; y: number; ttl: number }
  /** …and they are up. */
  | { kind: 'wyrmSpines'; x: number; y: number }
  /**
   * One gout of an emberspit, aimed. `ttl` is `WYRM_SPIT_LEAD` for every gout
   * including the first, whose wind-up the cast shares — the mark has to mean
   * the same length of warning each time it appears, or the attack teaches a
   * beat it does not keep.
   */
  | { kind: 'spitCast'; x: number; y: number; r: number; ttl: number }
  /** …and it landed. */
  | { kind: 'wyrmSpit'; x: number; y: number; r: number; i: number }
  /**
   * The healer planted a ward, a full cast before the heal it belongs to.
   *
   * `ttl` is the seconds until the heal resolves, which is the whole cycle
   * rather than a wind-up: the circle is on the road for the cast BEFORE the
   * heal as well as during it, because the player has to dodge a bolt on the way
   * to it. See `WARD_R`.
   */
  | { kind: 'wardCast'; x: number; y: number; radius: number; ttl: number }
  /**
   * …and the heal it was guarding resolved.
   *
   * `denied` is the share of the heal the crowd took off it, 0 to 1 — the graded
   * coverage, not a verdict. The renderer needs the number rather than a boolean
   * because "you denied a third of it" and "you denied all of it" are different
   * things to say to a player, and a mechanic that reads as pass/fail when it is
   * actually a gradient teaches people that it did not work.
   */
  | { kind: 'wardEnd'; x: number; y: number; radius: number; denied: number }
  /**
   * A burrower went under the road.
   *
   * The dive has no `ttl` and no geometry, and that is the fight: what follows is
   * not an announced attack, it is a mound of earth following the crowd's own
   * trail, drawn from the WORLD every frame by `drawBurrowMounds` for the same
   * reason the roller's ball is — a thing that tracks cannot be described by an
   * event pushed before it starts tracking. When the mound finally plants, THAT
   * is announced, with the bomber's own `bombCast`, because at that point it is
   * exactly a bomber's fuse.
   */
  | { kind: 'burrowDive'; x: number; y: number }
  /*
   * ─── The gaze ─────────────────────────────────────────────────────────────
   *
   * Four events, because the attack has four moments and the player has to be
   * able to tell every one of them apart: the eye BEGINS to open (move now if
   * you are going to), it IS open (stop), it saw you move (the beam), and it
   * closed (you held).
   *
   * The opening carries both clocks — `ttl` to the moment moving becomes
   * punishable and `watch` for how long it stays that way — so the renderer can
   * draw the whole of the attack's timeline from the first frame, exactly as
   * every cast above carries its seconds to impact.
   */
  /** The eye is opening over the boss. Moving is still free until `ttl`. */
  | { kind: 'gazeCast'; x: number; y: number; ttl: number; watch: number }
  /** …it is open. Any movement from here until `ttl` runs out is punished. */
  | { kind: 'gazeWatch'; x: number; y: number; ttl: number }
  /**
   * It saw the crowd move, and fired down the crowd's column. `x`/`y` is where
   * the crowd WAS when it moved (the beam finds it there), `fromX`/`fromY` the
   * boss's eye, and `halfW` the beam's half-width — the kill reads the same
   * number.
   */
  | {
      kind: 'gazeStrike'; x: number; y: number
      fromX: number; fromY: number
      halfW: number
    }
  /** The eye shut. `kept` is true when the crowd held still the whole time — the
   *  renderer's one chance to say "that was the answer". */
  | { kind: 'gazeEnd'; x: number; y: number; kept: boolean }
  | { kind: 'grenadeThrow'; x: number; y: number }
  // ─── The four later weapons ───────────────────────────────────────────────
  //
  // Gravecall raises a body, that body swings, and eventually it falls again;
  // the Hoard gilds a corpse and the gold bursts; the Dynamo's meter fills and
  // the player spends it on a bolt. Each one is a moment the mixer and the
  // renderer both need, and none of them is any other event wearing a flag.
  | { kind: 'thrallRise'; x: number; y: number }
  | { kind: 'thrallHit'; x: number; y: number }
  | { kind: 'thrallFall'; x: number; y: number }
  | { kind: 'gild'; x: number; y: number }
  | { kind: 'gildBurst'; x: number; y: number }
  /** `reach` is how far up the road the column goes, `ttl` how long it is drawn. */
  | { kind: 'dynamoBolt'; x: number; y: number; reach: number; ttl: number }
  /** The player's grenade went off. */
  | { kind: 'grenade'; x: number; y: number }
  /** The shield came up over the crowd. */
  | { kind: 'shieldUp'; x: number; y: number }
  /** …and ate a hit that would have taken a survivor. */
  | { kind: 'shieldSave'; x: number; y: number }
  /*
   * ─── The two late skills ──────────────────────────────────────────────────
   *
   * Each has a beginning, a middle and an end the player has to be able to tell
   * apart without reading anything: the nova goes OUT from the crowd, the world
   * holds, and the ice COMES OFF; the flare is thrown, burns, and bursts. The
   * middles are drawn from the world every frame (`frostActive`, `getDecoy`) —
   * these events are the three moments in between.
   */
  /** Everything hostile just froze. `seconds` is how long for, so the ring,
   *  the screen's frost and the ice on every body can all count down one clock. */
  | { kind: 'frostNova'; x: number; y: number; seconds: number }
  /** A frozen body the crowd walked into came apart. */
  | { kind: 'frostShatter'; x: number; y: number; big: boolean }
  /** The freeze ran out: every body still standing sheds its ice at once. */
  | { kind: 'frostThaw'; x: number; y: number }
  /** The flare left the crowd's hands, bound for `tx`/`ty`. */
  | { kind: 'decoyThrow'; x: number; y: number; tx: number; ty: number }
  /** …it caught. From here the fight is looking at it, for `seconds`. */
  | { kind: 'decoyLit'; x: number; y: number; seconds: number }
  /** …and it burned down in a burst. `radius` is the hit the sim measured. */
  | { kind: 'decoyBurst'; x: number; y: number; radius: number }
  /**
   * A rescue cage came apart. `count` is what actually got out — capped by
   * `MAX_SQUAD`, so the number the renderer prints is the number the crowd
   * gained and never the number that was painted on the bars.
   */
  | { kind: 'cageBreak'; x: number; y: number; count: number }
  /**
   * The auto-shield box opened and the absorb is armed.
   *
   * `fresh` is false when one was already armed — the pickup is a latch, not a
   * stack (see `takeBulwark`) — so the renderer can play the arming beat once
   * and a quieter acknowledgement the second time rather than promising the
   * player a second charge they do not have.
   */
  | { kind: 'bulwarkTake'; x: number; y: number; fresh: boolean }
  /**
   * …and it ate a whole blow.
   *
   * `count` is how many survivors the blow was about to take, which is the ONE
   * number that makes the moment legible: the pickup's promise is "the next big
   * hit does not land", and a save that looks identical whether it stopped four
   * bodies or four hundred has not shown the player what they bought. The
   * renderer scales the burst, the shake and the number off it — see the
   * `bulwarkSave` case in `useSurvivalArt`.
   */
  | { kind: 'bulwarkSave'; x: number; y: number; count: number }
  /** A TNT barrel took its last round and lit its fuse. */
  /**
   * ─── The weapon puzzle ────────────────────────────────────────────────────
   *
   * Four events, and between them they are the ONLY thing that tells the player
   * the beat exists. A lever that goes over silently is scenery; armour that
   * vanishes between frames is a bug. `pulled`/`total` ride along so the pop-up
   * can read "1 / 2" without the renderer having to go and ask the simulation.
   */
  | { kind: 'leverPull'; x: number; y: number; pulled: number; total: number }
  /** Both levers are down: the armour over the box comes off. */
  | { kind: 'weaponOpen'; x: number; y: number; weapon: WeaponId }
  /** The box broke and the stage's weapon is in the player's hands. */
  | { kind: 'weaponTake'; x: number; y: number; weapon: WeaponId }
  /** A rocket went off. `radius` is the real blast, so what the player SEES is
   *  the size of what actually hit. */
  | { kind: 'rocketBlast'; x: number; y: number; radius: number }
  | { kind: 'barrelLit'; x: number; y: number }
  /** …and went. The big one: the arena's answer to a shielded boss. */
  | { kind: 'barrelBlast'; x: number; y: number }
  /** A survivor was eaten / crushed. */
  | { kind: 'unitLost'; x: number; y: number; outfit: number }
  /** Survivors died on a gate divider — the "you tried to take both" tell. */
  | { kind: 'divider'; x: number; y: number }
  | { kind: 'coin'; x: number; y: number; value: number }
  | { kind: 'bossHit'; x: number; y: number }
  /** A round hit a boss that is mid-phase and untouchable. Sparks, no damage. */
  | { kind: 'bossGuard'; x: number; y: number }
  /**
   * The boss crossed a guard gate: it plants, shields, and swings.
   * `stage` is 1 or 2 — the second one is louder, because it is the last.
   */
  | { kind: 'bossRage'; x: number; y: number; stage: number }
  /** `radius` grows with every slam the boss has already thrown. */
  /**
   * The boss's ring landed.
   *
   * `slam` is WHICH swing of the fight it was — the boss's own counter, the one
   * `slamRadiusFor` and the charged-swing rotation are keyed to.
   *
   * It is on the event because the swings of a fight are no longer enumerated by
   * the ring events it emits. From `BOSS_VARIANT_FROM_STAGE` a meteor spends
   * some of its cycles on a shock or a gaze instead (`bossVerbPool`), so the third
   * `bossSlam` of a fight can be the fourth SWING — and anything reading the
   * pattern off the arrival order of these is measuring a sequence with holes in
   * it. Two specs were doing exactly that, and both of them were right about the
   * rule and wrong about the index.
   */
  | {
      kind: 'bossSlam'; x: number; y: number
      radius: number
      charged: boolean
      slam: number
    }
  | { kind: 'bossDie'; x: number; y: number }
  | { kind: 'stageClear'; x: number; y: number }
  | { kind: 'wipe'; x: number; y: number }
  /**
   * The rally: a wiped crowd handed back mid-run (see `tryRally`).
   *
   * It gets its own event because it is the ONE moment in the game where the
   * player is given something they did not earn, and the first version shipped
   * without one — survivors simply reappeared, and playtesters read it as the
   * game glitching rather than as a reprieve. `count` is how many came back, so
   * the burst can say the number out loud on the road where they landed.
   */
  | { kind: 'rally'; x: number; y: number; count: number }

// Events are produced during a tick and consumed the same frame; a generous cap
// means a catastrophic wipe can't drop the events that matter while still
// bounding memory.
const FX_CAPACITY = 512
const fxQueue: FxEvent[] = []

export const pushFx = (event: FxEvent): void => {
  if (fxQueue.length >= FX_CAPACITY) fxQueue.shift()
  fxQueue.push(event)
}

const EMPTY_FX: FxEvent[] = []

/** Drain every queued event. The renderer calls this once per frame. */
export const drainFx = (): FxEvent[] => {
  if (fxQueue.length === 0) return EMPTY_FX
  const out = fxQueue.slice()
  fxQueue.length = 0
  return out
}

// ─── Quality tiers ──────────────────────────────────────────────────────────

/**
 * `min` is the floor, and it exists because of a specific player report: runs
 * sitting at ~10 fps that the three-tier ladder never rescued, because `low`
 * still drew every full-screen grade, every ground pass and every per-body
 * shadow at DPR 1.25. It is a deliberate fidelity cut, not an optimization —
 * see `PERF-LEDGER.md` — and nothing above 25 fps ever sees it.
 */
export type QualityTier = 'high' | 'medium' | 'low' | 'min'

/** Live quality tier, driven by a rolling FPS average. The renderer reads it to
 *  skip expensive passes; the HUD surfaces it in debug mode. */
export const quality = ref<QualityTier>('high')

const TIER_CAPACITY: Record<QualityTier, number> = {
  high: 900, medium: 520, low: 240, min: 110
}

/**
 * Non-reactive mirror of `quality`, for the hot paths.
 *
 * `emit` is called up to nine hundred times a frame and every `quality.value`
 * there is a Vue ref getter with dependency tracking behind it. The ref stays
 * for watchers and the debug HUD; anything inside a per-entity loop reads this.
 */
let currentTier: QualityTier = 'high'
let currentCapacity = TIER_CAPACITY.high

export const qualityTier = (): QualityTier => currentTier

const setTier = (t: QualityTier): void => {
  currentTier = t
  currentCapacity = TIER_CAPACITY[t]
  quality.value = t
}

let fpsAccum = 0
let fpsFrames = 0
let fpsElapsed = 0
let tierHoldUntil = 0

// ─── Device calibration ─────────────────────────────────────────────────────
//
// The rolling average below is a good STEADY-STATE control and a poor first
// impression. It needs 60 frames to say anything at all — three seconds on a
// device running at 20 fps, which is exactly the device that cannot afford
// those three seconds — and it starts optimistically at `high`, so the worst
// hardware pays the highest price precisely while the player is deciding
// whether the game is worth their time.
//
// So the first `CALIBRATION_MS` of rendered time is treated as a measurement:
// judge the device early, judge it often, and only ever downgrade.
//
// The statistic is the MEDIAN frame time, not mean FPS, for two reasons. A mean
// over frames-per-second is dominated by the good frames — a device alternating
// 8 ms and 60 ms frames averages out looking fine while feeling awful. And the
// median shrugs off the transient spikes this game legitimately produces early
// on (the sprite top-up baking the stage's designs), which a mean would read as
// a slow device and permanently punish.
const CALIBRATION_MS = 10_000
/** Frames per verdict. ~24 is a quarter-second on a healthy device and about a
 *  second on a struggling one — fast enough to act, wide enough to be a median. */
const CAL_BATCH = 24
/** A dt this large is a tab switch, a breakpoint or a GC pause, not a frame the
 *  renderer is responsible for. Excluded so it cannot skew the verdict. */
const OUTLIER_MS = 250

// Median frame-time boundaries, matching the FPS thresholds the steady-state
// controller uses: 18 ms ≈ 55 fps, 25 ms ≈ 40 fps, 40 ms = 25 fps exactly.
const HIGH_MAX_MS = 18
const MEDIUM_MAX_MS = 25
const LOW_MAX_MS = 40

const TIER_ORDER: readonly QualityTier[] = ['min', 'low', 'medium', 'high']
const rank = (t: QualityTier): number => TIER_ORDER.indexOf(t)

let calibrating = true
let calElapsed = 0
let calBatch: number[] = []
/**
 * The best tier this device earned during calibration, and a hard ceiling for
 * the rest of the session.
 *
 * A device that stuttered through its first ten seconds of play is not one to
 * re-experiment on mid-run: letting the rolling average climb back to `high`
 * would pop the resolution and effects up, stutter, and drop them again. The
 * steady-state controller may still go LOWER at any time — it just may not undo
 * what the measurement established.
 */
let qualityCeiling: QualityTier = 'high'

/**
 * The tier the canvas RESOLUTION is sized for.
 *
 * Deliberately separate from `quality`, and this separation is load-bearing.
 * Changing the canvas resolution means re-sizing the backing store and
 * re-baking every piece of art cached at the old scale, which measured ~700 ms
 * on a 6x-throttled phone. Driving that off the live tier looked obvious and
 * cost 27 fps: the tier legitimately moves several times a session, and each
 * move bought a full rebake — 51 long tasks totalling 7.5 s in a 20 s window,
 * against 4 totalling 219 ms without it.
 *
 * So it is RATCHETED rather than free-running: it only ever goes down, it never
 * comes back up, and each step needs the live tier to have SAT at the lower
 * level for `RESCALE_HOLD_MS` of continuous play. That bounds the whole session
 * at three re-sizes in the worst case and makes each one a considered response
 * to a sustained problem rather than a reaction to a spike.
 *
 * The ratchet replaced a lock-once. The lock was right about the cost and wrong
 * about the lifecycle: a device that calibrates fine and then meets a boss wave
 * at 10 fps was stuck at the resolution its quiet opening earned, with the
 * single biggest lever the renderer has bolted shut for the rest of the session.
 */
export const renderScaleTier = ref<QualityTier>('high')

/**
 * ─── A pixel BUDGET, not just a DPR cap ─────────────────────────────────────
 *
 * `dprCap` alone prices the canvas off the device's pixel grid and never off
 * the window it has to fill, which is the same bet on a phone and a desktop and
 * is only right on one of them. Measured on the real builds
 * (`PERF-LEDGER.md`, 2026-09-14):
 *
 *   412x915 @ DPR 2  (the phone the game is tuned on)   1.51 Mpx
 *   1366x768 @ DPR 1.6 (the Chromebook in the report)   2.69 Mpx  — 1.8x
 *
 * The desktop is not doing more gameplay for those pixels. It is doing LESS:
 * the lane is fitted by height, so on a 16:9 window the road is a third of the
 * width and the other two thirds are off-lane wash. The extra 1.2 Mpx a frame
 * are terrain, and the renderer covers the whole frame ~3.5 times over.
 *
 * So the cap is a budget in FINISHED PIXELS, and the DPR falls out of it. It is
 * a ceiling, never a floor: a window already inside its budget is untouched, so
 * every phone profile this game was tuned on renders exactly as it did.
 *
 * ── Where the numbers come from ──
 *
 * `high` is set just above the 1.51 Mpx of the tuned phone profile with room
 * for a taller one, so no phone moves and every 16:9 desktop does. Each rung
 * below is roughly the square of its old DPR cap over `high`'s — the same
 * ladder, expressed in the unit that actually costs.
 */
const MAX_CANVAS_PX: Record<QualityTier, number> = {
  high: 2_100_000,
  medium: 1_400_000,
  low: 900_000,
  min: 500_000
}

/**
 * What a `weak` device is allowed of that budget.
 *
 * The class is read off the GPU's own name before the first frame
 * (`deviceProfile.ts`) — the ladder cannot help a player who leaves during the
 * measurement, and the report this exists for is exactly that player. 0.6 of
 * the budget is 0.77 of the DPR: on the Chromebook in the report, 2.69 Mpx
 * becomes 1.26 Mpx on the very first frame instead of after fourteen seconds
 * of 5 fps.
 */
const WEAK_DEVICE_BUDGET = 0.6

/**
 * The device-pixel scale to render a `cssW x cssH` window at, at `tier`.
 *
 * Everything the old inline cap did, plus the budget. Exported from here rather
 * than left in `GameScene` because it belongs to the ladder: the tier, the cap
 * and the ratchet are one decision and they should be readable in one place.
 */
export const renderScaleFor = (cssW: number, cssH: number, tier: QualityTier): number => {
  const dprCap = tier === 'min' ? 0.8 : tier === 'low' ? 1.25 : tier === 'medium' ? 1.5 : 2
  const device = (typeof window === 'undefined' ? 1 : window.devicePixelRatio) || 1
  // `Math.min` against the device ratio would let a DPR-1 laptop keep a full-res
  // canvas at `min`, which is exactly the device the tier is trying to help.
  const byGrid = tier === 'min' ? Math.min(device, 1) * dprCap : Math.min(device, dprCap)

  const cssPx = Math.max(1, cssW * cssH)
  const budget = MAX_CANVAS_PX[tier]
    * (deviceClass() === 'weak' ? WEAK_DEVICE_BUDGET : 1)
  const byBudget = Math.sqrt(budget / cssPx)
  // 0.5 is the floor: below it the compositor's upscale stops reading as soft
  // and starts reading as broken, and a game nobody can see is not a fast one.
  return Math.max(0.5, Math.min(byGrid, byBudget))
}

/** Sustained time at a lower tier before the canvas is re-sized to match. */
const RESCALE_HOLD_MS = 4000
let lowSince = 0
let lowSinceTier: QualityTier = 'high'

const lockRenderScale = (tier: QualityTier): void => {
  if (rank(tier) >= rank(renderScaleTier.value)) return
  renderScaleTier.value = tier
}

// ─── Tier pin ───────────────────────────────────────────────────────────────
//
// `?tier=min` (or `low` / `medium` / `high`) freezes the ladder where it is
// asked and stops the controller from touching it again.
//
// Two jobs, both real. QA can look at a tier on a machine that would never earn
// it — there is no other way to see what a 10 fps phone is shown. And an A/B
// run needs both arms to draw the SAME scene: without a pin, an arm that is
// genuinely faster keeps a higher tier, draws more, and hands back a comparison
// between two different games.
//
// Resolved once, at module load. It is off in every player's session, and a
// `sampleFrame` that re-read the URL would land in the hot loop it measures.

const PINNED: QualityTier | null = (() => {
  try {
    const want = new URLSearchParams(window.location.search).get('tier')
    return want === 'min' || want === 'low' || want === 'medium' || want === 'high'
      ? want
      : null
  } catch {
    return null
  }
})()

if (PINNED) {
  currentTier = PINNED
  currentCapacity = TIER_CAPACITY[PINNED]
  quality.value = PINNED
  renderScaleTier.value = PINNED
  qualityCeiling = PINNED
  calibrating = false
}

/** The tier the URL pinned, or `null` in a normal session. */
export const pinnedTier = (): QualityTier | null => PINNED

/** True once the calibration window has closed. Debug/telemetry only. */
export const isQualityCalibrated = (): boolean => !calibrating
/** The ceiling calibration settled on. Debug/telemetry only. */
export const qualityCeilingTier = (): QualityTier => qualityCeiling

const medianOf = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

const tierForMedian = (medianMs: number): QualityTier =>
  medianMs <= HIGH_MAX_MS ? 'high'
    : medianMs <= MEDIUM_MAX_MS ? 'medium'
      : medianMs <= LOW_MAX_MS ? 'low' : 'min'

/** Test seam: forget the measurement and start over at `high`. */
export const __resetQualityCalibration = (): void => {
  renderScaleTier.value = 'high'
  calibrating = true
  calElapsed = 0
  calBatch = []
  qualityCeiling = 'high'
  setTier('high')
  fpsAccum = 0
  fpsFrames = 0
  fpsElapsed = 0
  tierHoldUntil = 0
  lowSince = 0
  lowSinceTier = 'high'
}

/**
 * Feed the frame time.
 *
 * During calibration: a verdict every `CAL_BATCH` frames, downgrade-only, with
 * no hysteresis — a struggling device should stop paying for effects it cannot
 * afford within a second, not once a rolling average has finished being polite.
 *
 * After it: a rolling average over 60 frames OR one second of rendered time,
 * whichever comes first — clamped to the ceiling the measurement established.
 *
 * ── Why the window is timed as well as counted ──
 *
 * A pure 60-frame window is a one-second control at 60 fps and a SIX-second one
 * at 10 fps. The device in trouble is the one that waits longest for help. The
 * second bound makes the control's latency roughly constant in wall-clock time,
 * which is the axis the player experiences it on.
 *
 * ── Why downgrades ignore the hold and upgrades do not ──
 *
 * The hold exists to stop a device sitting on a threshold from oscillating, and
 * oscillation needs both directions. A downgrade that has to wait 2.5 s for
 * permission is 2.5 s of a player at 15 fps, and it cannot start a cycle on its
 * own, because climbing back needs both the hold AND a ceiling that a struggling
 * device does not have.
 */
export const sampleFrame = (dtMs: number): void => {
  if (dtMs <= 0 || PINNED) return
  // Excluded from BOTH controllers, not just calibration.
  //
  // The steady-state window used to be protected from these only by its
  // 60-frame minimum — five 4-second stalls could not fill it. Now that the
  // window also closes on a SECOND of elapsed time, one tab switch is enough to
  // close it on its own, and a 4 000 ms frame reads as 0.25 fps: the whole
  // ladder collapses to `min` because the player answered a phone call.
  if (dtMs > OUTLIER_MS) return

  if (calibrating) {
    calElapsed += dtMs
    calBatch.push(dtMs)

    if (calBatch.length >= CAL_BATCH) {
      const want = tierForMedian(medianOf(calBatch))
      calBatch = []
      if (rank(want) < rank(currentTier)) {
        setTier(want)
        tierHoldUntil = Date.now() + 2500
      }
      // First proof the device cannot hold `high`: commit the cheaper canvas
      // now, while the player is still in their opening seconds.
      //
      // OUTSIDE the tier guard, and that placement is load-bearing. The
      // steady-state window below now closes on a second of elapsed time, so on
      // a struggling device it reaches its own verdict BEFORE the 24-frame
      // batch does and has already moved the tier — leaving `want` equal to the
      // current tier, the guard false, and the resolution never committed at
      // all. `lockRenderScale` is downgrade-only, so calling it unconditionally
      // is safe and says the actual intent: the canvas follows the MEASUREMENT,
      // whichever controller happened to move the tier first.
      lockRenderScale(want)
    }

    if (calElapsed >= CALIBRATION_MS) {
      calibrating = false
      calBatch = []
      qualityCeiling = currentTier
      // A device that never tripped a downgrade locks in at `high` here, so the
      // resolution is settled for the session either way.
      lockRenderScale(currentTier)
    }
  }

  fpsAccum += 1000 / dtMs
  fpsFrames++
  fpsElapsed += dtMs
  if (fpsFrames < 60 && fpsElapsed < 1000) return

  const avg = fpsAccum / fpsFrames
  fpsAccum = 0
  fpsFrames = 0
  fpsElapsed = 0

  const now = Date.now()
  const next: QualityTier =
    avg >= 55 ? 'high' : avg >= 40 ? 'medium' : avg >= 25 ? 'low' : 'min'
  // Never above what the device proved it can do.
  const capped: QualityTier = rank(next) > rank(qualityCeiling) ? qualityCeiling : next
  const down = rank(capped) < rank(currentTier)

  // Upgrades need the hold AND a closed calibration window; downgrades need
  // neither. Calibration is a downgrade-only measurement by contract, and until
  // now it relied on the hold's 2.5 s of wall clock to enforce that — which is
  // true in a session and not true under fake timers or a fast test.
  if (capped !== currentTier && (down || (!calibrating && now >= tierHoldUntil))) {
    setTier(capped)
    tierHoldUntil = now + 2500
  }

  // ── The resolution ratchet ──
  //
  // Tracked on the tier the controller has SETTLED on, not on the one verdict
  // that produced it: a single bad window is a spike, four seconds of them is a
  // device that needs fewer pixels.
  if (calibrating) {
    // The measurement owns the resolution while it is running.
    lowSinceTier = currentTier
    lowSince = now
  } else if (currentTier !== lowSinceTier) {
    lowSinceTier = currentTier
    lowSince = now
  } else if (
    rank(currentTier) < rank(renderScaleTier.value)
    && now - lowSince >= RESCALE_HOLD_MS
  ) {
    lockRenderScale(currentTier)
    // Re-sizing re-bakes every cached surface, which is itself a stall. Give the
    // device the full hold again before it can be asked to pay for another.
    lowSince = now
  }
}

// ─── Particle pool ──────────────────────────────────────────────────────────

const MAX_PARTICLES = 900

// Structure-of-arrays: one contiguous buffer per attribute keeps the hot loop
// cache-friendly and free of per-particle object churn.
const px = new Float32Array(MAX_PARTICLES)
const py = new Float32Array(MAX_PARTICLES)
const pvx = new Float32Array(MAX_PARTICLES)
const pvy = new Float32Array(MAX_PARTICLES)
const plife = new Float32Array(MAX_PARTICLES)
const pmax = new Float32Array(MAX_PARTICLES)
const psize = new Float32Array(MAX_PARTICLES)
const pgrav = new Float32Array(MAX_PARTICLES)
const pdrag = new Float32Array(MAX_PARTICLES)
const prot = new Float32Array(MAX_PARTICLES)
const pvrot = new Float32Array(MAX_PARTICLES)
/** 0 = normal blend, 1 = additive. */
const padd = new Uint8Array(MAX_PARTICLES)
/** 0 = soft round, 1 = shard/quad, 2 = spark streak, 3 = smoke puff. */
const pshape = new Uint8Array(MAX_PARTICLES)
const pr = new Uint8Array(MAX_PARTICLES)
const pg = new Uint8Array(MAX_PARTICLES)
const pb = new Uint8Array(MAX_PARTICLES)
const palpha = new Float32Array(MAX_PARTICLES)

let liveCount = 0

export interface EmitOptions {
  x: number
  y: number
  vx?: number
  vy?: number
  life: number
  size: number
  color: [number, number, number]
  alpha?: number
  gravity?: number
  drag?: number
  additive?: boolean
  shape?: 0 | 1 | 2 | 3
  rot?: number
  vrot?: number
}

/**
 * Spawn one particle. Over-capacity spawns recycle the OLDEST slot rather than
 * being dropped, so a big burst always reads as a big burst — it just cuts the
 * tail of whatever came before it.
 */
export const emit = (o: EmitOptions): void => {
  const cap = currentCapacity
  let i: number
  if (liveCount < cap) {
    i = liveCount++
  } else {
    i = oldestIndex()
  }
  px[i] = o.x
  py[i] = o.y
  pvx[i] = o.vx ?? 0
  pvy[i] = o.vy ?? 0
  plife[i] = o.life
  pmax[i] = o.life
  psize[i] = o.size
  pgrav[i] = o.gravity ?? 0
  pdrag[i] = o.drag ?? 0
  prot[i] = o.rot ?? 0
  pvrot[i] = o.vrot ?? 0
  padd[i] = o.additive ? 1 : 0
  pshape[i] = o.shape ?? 0
  pr[i] = o.color[0]
  pg[i] = o.color[1]
  pb[i] = o.color[2]
  palpha[i] = o.alpha ?? 1
}

const oldestIndex = (): number => {
  let best = 0
  let bestLife = Infinity
  for (let i = 0; i < liveCount; i++) {
    if (plife[i]! < bestLife) { bestLife = plife[i]!; best = i }
  }
  return best
}

/** Integrate every live particle, compacting dead ones out with a swap-remove
 *  (O(1) per removal, no array churn). */
export const stepParticles = (dtMs: number): void => {
  const dt = dtMs / 1000
  for (let i = liveCount - 1; i >= 0; i--) {
    plife[i]! -= dtMs
    if (plife[i]! <= 0) {
      const last = liveCount - 1
      if (i !== last) {
        px[i] = px[last]!; py[i] = py[last]!
        pvx[i] = pvx[last]!; pvy[i] = pvy[last]!
        plife[i] = plife[last]!; pmax[i] = pmax[last]!
        psize[i] = psize[last]!; pgrav[i] = pgrav[last]!
        pdrag[i] = pdrag[last]!; prot[i] = prot[last]!
        pvrot[i] = pvrot[last]!; padd[i] = padd[last]!
        pshape[i] = pshape[last]!
        pr[i] = pr[last]!; pg[i] = pg[last]!; pb[i] = pb[last]!
        palpha[i] = palpha[last]!
      }
      liveCount--
      continue
    }
    pvy[i]! -= pgrav[i]! * dt
    if (pdrag[i]! > 0) {
      const d = Math.max(0, 1 - pdrag[i]! * dt)
      pvx[i]! *= d
      pvy[i]! *= d
    }
    px[i]! += pvx[i]! * dt
    py[i]! += pvy[i]! * dt
    prot[i]! += pvrot[i]! * dt
  }
}

export const particleCount = (): number => liveCount

export const clearParticles = (): void => { liveCount = 0 }

/**
 * Draw every particle. `toX` / `toY` project world→screen and `scale` is
 * px-per-unit, so particles live in world space and follow the camera for free.
 *
 * Two passes: normal-blend first, then a single switch to `lighter` for the
 * additive bucket. Sorting by blend mode rather than depth costs nothing
 * visually (particles are short-lived and overlapping) and saves ~N context
 * state changes per frame.
 */
export const drawParticles = (
  ctx: CanvasRenderingContext2D,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
  scale: number
): void => {
  if (liveCount === 0) return
  drawBucket(ctx, toX, toY, scale, 0)
  ctx.globalCompositeOperation = 'lighter'
  drawBucket(ctx, toX, toY, scale, 1)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/** Tag bit for this module's slice of the shared ramp cache's integer key
 *  space. Packed RGB occupies the low 24 bits; the tag keeps a smoke ramp from
 *  ever colliding with an integer key some other layer chooses to use. */
const SMOKE_RAMP = 0x1000000

/** The puff's two stops. Allocated only on a cache MISS — once per colour for
 *  the life of the cache, not once per particle. */
const SMOKE_STOPS = (r: number, g: number, b: number): [number, string][] => [
  [0, `rgba(${r},${g},${b},0.55)`],
  [1, `rgba(${r},${g},${b},0)`]
]

/** The bake's sprite edge, matching `useGradientRamps`' own. */
const PUFF_PX = 192

/**
 * The puff sprite for a colour: the painted puff tinted to it when the art
 * pipeline has delivered one, otherwise the baked radial ramp.
 *
 * A painted puff is GREYSCALE by contract (see `artSheet.ts`), so tinting is a
 * multiply by the emitter's colour with the puff's own alpha restored — three
 * canvas ops, once per colour, into the same cache slot the ramp bake uses.
 * That cache is dropped whenever the art layer changes, so a puff that decodes
 * after the first burst still takes over at the next bake.
 */
const bakePuffSprite = (
  key: number, r: number, g: number, b: number
): HTMLCanvasElement | null => {
  const painted = spriteFor('fx', 'smoke')
  if (painted) {
    try {
      const c = document.createElement('canvas')
      c.width = PUFF_PX
      c.height = PUFF_PX
      const t = c.getContext('2d')
      if (t) {
        t.drawImage(painted, 0, 0, PUFF_PX, PUFF_PX)
        t.globalCompositeOperation = 'multiply'
        t.fillStyle = rgbString(r, g, b)
        t.fillRect(0, 0, PUFF_PX, PUFF_PX)
        t.globalCompositeOperation = 'destination-in'
        t.drawImage(painted, 0, 0, PUFF_PX, PUFF_PX)
        return putSprite(key, c)
      }
    } catch { /* fall through to the ramp */ }
  }
  return bakeRadialSprite(key, SMOKE_STOPS(r, g, b))
}

/**
 * The puff sprite the particle bucket blits for a colour — the playground's
 * way of showing the painted puff through the game's own tinting path.
 */
export const puffSpriteFor = (r: number, g: number, b: number): HTMLCanvasElement | null => {
  const key = SMOKE_RAMP | (r << 16) | (g << 8) | b
  let spr = getSprite(key)
  if (spr === undefined) spr = bakePuffSprite(key, r, g, b)
  return spr
}

/**
 * ONE puff, white, at the origin with radius `r` — the reference the painted
 * puff is made from, drawn with the same two stops the bake rasterises. The
 * game tints the painting per emitter, so the reference is colourless.
 */
export const paintSmokeRef = (ctx: CanvasRenderingContext2D, r: number): void => {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  for (const [offset, colour] of SMOKE_STOPS(255, 255, 255)) g.addColorStop(offset, colour)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
}

const drawBucket = (
  ctx: CanvasRenderingContext2D,
  toX: (wx: number) => number,
  toY: (wy: number) => number,
  scale: number,
  additive: 0 | 1
): void => {
  for (let i = 0; i < liveCount; i++) {
    if (padd[i] !== additive) continue
    const t = plife[i]! / pmax[i]!
    // Ease-out fade so particles thin gracefully instead of blinking out.
    const a = palpha[i]! * (t < 0.25 ? t / 0.25 : 1) * Math.min(1, t * 1.6)
    if (a <= 0.01) continue

    const sx = toX(px[i]!)
    const sy = toY(py[i]!)
    const size = Math.max(0.6, psize[i]! * scale * (0.55 + t * 0.45))

    ctx.globalAlpha = a
    // The colour is looked up per BRANCH rather than hoisted above the switch:
    // the smoke case does not want a solid colour at all, and building one for
    // it was an allocation per puff per frame for a string never read.
    const rgbKey = SMOKE_RAMP | (pr[i]! << 16) | (pg[i]! << 8) | pb[i]!

    switch (pshape[i]) {
      case 1: { // shard — a rotated quad, for crate and barricade debris
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(prot[i]!)
        ctx.fillStyle = rgbString(pr[i]!, pg[i]!, pb[i]!)
        ctx.fillRect(-size / 2, -size / 2, size, size * 0.78)
        ctx.restore()
        break
      }
      case 2: { // spark — a velocity-aligned streak
        const vlen = Math.hypot(pvx[i]!, pvy[i]!) || 1
        const nx = (pvx[i]! / vlen) * size * 1.9
        const ny = (-pvy[i]! / vlen) * size * 1.9
        ctx.strokeStyle = rgbString(pr[i]!, pg[i]!, pb[i]!)
        ctx.lineWidth = Math.max(0.8, size * 0.4)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx - nx, sy - ny)
        ctx.stroke()
        break
      }
      case 3: { // smoke — a soft, expanding, low-alpha puff
        // The pool's hottest paint. Every puff used to build a two-stop radial
        // ramp at its own screen position, which meant the rasteriser rebuilt
        // the ramp for all 900 of them, every frame.
        //
        // The ramp is baked to a sprite ONCE per colour instead and blitted.
        // `size` grows with the puff's age, so it is carried by the destination
        // rectangle rather than by a `scale()` transform. Measured at the
        // realistic peak of 150 puffs: work-per-frame p95 1.20 ms -> 0.70 ms
        // unthrottled, p50 5.85 ms -> 3.55 ms at 4x CPU. See `PERF-LEDGER.md`.
        let spr = getSprite(rgbKey)
        if (spr === undefined) spr = bakePuffSprite(rgbKey, pr[i]!, pg[i]!, pb[i]!)
        if (spr) {
          // Same centre and same radius as the filled arc drew: the ramp's last
          // stop reaches the sprite's edge, so a `2 * size` box centred on the
          // particle reproduces the falloff exactly.
          ctx.drawImage(spr, sx - size, sy - size, size * 2, size * 2)
          break
        }
        // No offscreen context to bake into — jsdom under test, or a lost
        // context. Falls back to a cached ramp built at the puff's own radius
        // and placed with a translate. The radius is bucketed to whole pixels
        // here (unlike the decals, which key on the exact value) because a
        // puff's size is genuinely continuous, so exact keys would never hit;
        // this path is off the real-browser hot path either way.
        const qr = Math.max(1, Math.round(size))
        const key = `smoke|${rgbKey}|${qr}`
        let g = getRamp(key)
        if (!g) {
          g = putRamp(key, ctx.createRadialGradient(0, 0, 0, 0, 0, qr))
          g.addColorStop(0, `rgba(${pr[i]},${pg[i]},${pb[i]},0.55)`)
          g.addColorStop(1, `rgba(${pr[i]},${pg[i]},${pb[i]},0)`)
        }
        ctx.save()
        ctx.translate(sx, sy)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(0, 0, qr, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        break
      }
      default: { // soft round dot
        ctx.fillStyle = rgbString(pr[i]!, pg[i]!, pb[i]!)
        ctx.beginPath()
        ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

// ─── Floating combat text ───────────────────────────────────────────────────
//
// "+7", "DMG +1", "×2". Kept out of the particle pool because they carry a
// string payload and are drawn with a font, which does not fit the typed-array
// model — and because they are the one visual the player actually reads.

export interface FloatText {
  x: number
  y: number
  vy: number
  life: number
  maxLife: number
  text: string
  color: string
  size: number
  /** Bigger, with a heavier outline — for the moments that matter. */
  crit: boolean
}

const MAX_TEXTS = 60
const texts: FloatText[] = []

export const emitText = (t: Omit<FloatText, 'maxLife'> & { maxLife?: number }): void => {
  if (texts.length >= MAX_TEXTS) texts.shift()
  texts.push({ ...t, maxLife: t.maxLife ?? t.life })
}

export const stepTexts = (dtMs: number): void => {
  const dt = dtMs / 1000
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i]!
    t.life -= dtMs
    if (t.life <= 0) { texts.splice(i, 1); continue }
    t.y += t.vy * dt
    t.vy *= Math.max(0, 1 - 1.6 * dt)
  }
}

export const getTexts = (): FloatText[] => texts
export const clearTexts = (): void => { texts.length = 0 }

// ─── Ground decals ──────────────────────────────────────────────────────────
//
// Scorch marks and craters that outlive the burst that made them. Capped, and
// drawn under everything, so the lane accumulates a history of the fight
// without costing anything.

export interface Decal { x: number; y: number; r: number; life: number; maxLife: number; dark: number }
const MAX_DECALS = 24
const decals: Decal[] = []

export const emitDecal = (x: number, y: number, r: number, dark = 0.5): void => {
  if (decals.length >= MAX_DECALS) decals.shift()
  decals.push({ x, y, r, life: 7000, maxLife: 7000, dark })
}

export const stepDecals = (dtMs: number): void => {
  for (let i = decals.length - 1; i >= 0; i--) {
    decals[i]!.life -= dtMs
    if (decals[i]!.life <= 0) decals.splice(i, 1)
  }
}

export const getDecals = (): Decal[] => decals
export const clearDecals = (): void => { decals.length = 0 }

/** Reset every transient visual. Called when a stage starts so the last run's
 *  debris doesn't bleed into the new one. */
export const resetVfx = (): void => {
  clearParticles()
  clearTexts()
  clearDecals()
  fxQueue.length = 0
}

/**
 * …or keep them, and move them: the handover that walks on from the boss.
 *
 * The next stage opens under the crowd (`advanceStage`), which re-bases the
 * world by the crowd's own y — so the sparks still settling, the numbers still
 * floating and the scorch marks of the fight shift by the same `dy` and stay on
 * the ground they were made on. The queue is still dropped, exactly as
 * `resetVfx` drops it: whatever the last tick asked for was placed in the old
 * stage's coordinates, and nothing in it is worth a guess at translating.
 */
export const rebaseVfx = (dy: number): void => {
  for (let i = 0; i < liveCount; i++) py[i]! -= dy
  for (const t of texts) t.y -= dy
  for (const d of decals) d.y -= dy
  fxQueue.length = 0
}
