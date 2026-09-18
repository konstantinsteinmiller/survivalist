import { LANE_HALF } from '@/game/survival'

/**
 * ─── The two late skills, as rules ──────────────────────────────────────────
 *
 * The grenade answers "what is in front of me" and the shield answers "I was
 * wrong about it". These two answer the questions the late game started asking
 * once the bosses gained second verbs and the elites gained tracking attacks:
 *
 *   FROST NOVA   "give me a second" — everything hostile stops, mid-swing,
 *                and the world waits while the player reads it. Unlocked on
 *                stage 7, with one free use handed over after the stage-4
 *                boss so the player has held it before they own it.
 *   DECOY FLARE  "look over there" — a burning flare on a parachute that the
 *                boss, the elites and the bodies on the road all turn to. It
 *                ends in a burst that pays for whatever it gathered. Stage 10.
 *
 * Pure numbers and pure geometry, here, so the simulation, the renderer and
 * the specs read one definition of how long, how far and how hard.
 */

// ─── Frost Nova ─────────────────────────────────────────────────────────────

/**
 * Seconds everything hostile stays frozen.
 *
 * Long enough to be felt as a stop rather than a hitch — a boss wind-up is 0.7
 * to 1.7 s, so the freeze still outlasts the attack the player was about to
 * eat, and the lane charge's band has time to be walked out of. It was 3.5 s
 * and is now a quarter shorter: at three and a half seconds the player could
 * read the whole road, reposition and come back, which made the nova an answer
 * to every situation rather than an escape from one.
 */
export const FROST_S = 2.6

/**
 * What a frozen body takes, as a multiple of what it would have.
 *
 * The half of the skill that is offence. Frozen things are brittle, and the one
 * way a stop turns into progress is that the crowd's fire is worth more while
 * it lasts — 2.6 s at ×1.5 is about one and a third extra seconds of fire, less
 * than the grenade's burst, and it lands on everything at once rather than on
 * one knot of bodies.
 */
export const FROST_BRITTLE = 1.5

/**
 * ─── What the late skills cost in time ──────────────────────────────────────
 *
 * The grenade and the shield share one thirty-second clock
 * (`SKILL_COOLDOWN_MS`): they are the run's rhythm, pressed most fights. These
 * two are not. Both are strong enough to decide a fight on their own — the nova
 * stops everything mid-swing, the flare takes the whole fight's attention away
 * from the crowd — and on the grenade's clock a stage's boss could be frozen or
 * lured two or three times over, which turned "how do I survive this" into "hold
 * the button again in half a minute".
 *
 * So they are priced as ESCAPE HATCHES: once a fight, near enough, and the
 * player has to choose which fight. The nova waits longest because it is the
 * strictly stronger answer — it works on anything, from any position, where the
 * flare needs somewhere for the fight to be pulled to.
 *
 * Kept here rather than beside the shop's thirty seconds so the two numbers a
 * balance pass touches sit with the rest of what these skills do.
 */
export const FROST_COOLDOWN_MS = 90_000
export const DECOY_COOLDOWN_MS = 75_000

/**
 * How far up the road a hostile counts as "in the fight" for the two late
 * skills' refusal: a skill pressed at an empty road keeps its charge, exactly
 * as the grenade does. `VIEW_HEIGHT` is 19 with the crowd at 72 % down the
 * screen, so ~14 units are visible ahead at the reference zoom; a little more
 * than that, because a wide screen shows more road and a body just over the top
 * edge is one the player can already see coming.
 *
 * 14.5 since 2026-09-18. The camera is now solved from the gun's range
 * (`cameraScale`) and the top edge of the canvas stands 14.31 units ahead on
 * every ratio, 14.5–14.9 on a portrait phone — where 16 used to sit under the
 * top edge of every screen, it now sits one to two units ABOVE it, and a flare
 * or a freeze pressed at a road with nothing on it but a body nobody can see
 * would spend its charge. 14.5 is the top edge: whatever is being drawn counts,
 * whatever is not does not.
 */
export const SKILL_VIEW_AHEAD = 14.5

// ─── Decoy Flare ────────────────────────────────────────────────────────────

/** Seconds the flare burns once it has landed. */
export const DECOY_S = 5

/** The throw, from the crowd's hands to where it hangs. */
export const DECOY_FLIGHT_S = 0.5

/**
 * Where the flare hangs, relative to the crowd: a little way up the road, and
 * on the FAR rail.
 *
 * Ahead, between the crowd and a boss holding `BOSS_HOLD_AHEAD` (3.8) up the
 * road, so the attacks it draws land in front of the crowd rather than behind
 * it where nobody is looking. On the far rail, because the whole value of a lure
 * is distance: a slam aimed at a flare a crowd-width away still catches the
 * crowd, one aimed at the other side of the road does not.
 *
 * It is a PARACHUTE flare, which is why it can hang: in a run the crowd walks at
 * `stageSpeed`, and a flare left on the ground would be behind the squad in half
 * a second. Hanging in the air it keeps pace, exactly as the boss holds its line.
 */
export const DECOY_AHEAD = 2.4
export const DECOY_RAIL_INSET = 0.9

/** How close a body has to be to the flare before it turns to it. */
export const DECOY_PULL_R = 9

/**
 * How much faster than its own walk a lured body moves. They WANT the light: a
 * body that ambled toward a lure at walking pace would never reach one that is
 * riding along with the crowd at road speed.
 */
export const DECOY_PULL_SPEED = 4.2

/** The ring the gathered bodies mill around, so a pack reads as a crowd around
 *  a light rather than as one stack on a point. */
export const DECOY_SWARM_R = 1.1

/** The burst it ends in: radius, and what it hits for as a multiple of the
 *  crowd's fire — below the grenade's floor of 3, because it is the second half
 *  of a skill whose first half already took the heat off the crowd. */
export const DECOY_BURST_R = 3.1
export const DECOY_BURST_MULT = 2.5

/**
 * A lured gunner only levels its gun when its own column is this close to the
 * flare's. It fires straight down that column (see `stepGunner`), so the lure
 * cannot move the shot — it can only decline to take one that is not at the
 * light.
 */
export const DECOY_GUNNER_LOCK_X = 1.2

/** Centre x of the flare for a crowd whose centre is at `crowdX`. */
export const decoySpotX = (crowdX: number): number =>
  (crowdX > 0 ? -1 : 1) * (LANE_HALF - DECOY_RAIL_INSET)

/**
 * Where a claw centres its rake when it is aiming at a flare.
 *
 * A rake is three furrows a full spacing apart, and aimed naively at a flare on
 * the far rail its third furrow can land in the middle of the road — on the
 * crowd the flare was thrown to protect. So the flare is put under ONE of the
 * three furrows, whichever one leaves the crowd furthest from every furrow. The
 * claw is still visibly raking the light; it simply never does so with the
 * furrow that would have been a gift to it.
 *
 * Not clamped to the road: `clawLaneXs` already lets a furrow leave the lane,
 * and here that is the point — the rake that misses by the most is the one whose
 * outer furrows are in the dirt beyond the rail.
 */
export const decoyRakeCentre = (
  flareX: number,
  crowdX: number,
  spacing: number,
  lanesOf: (centre: number) => readonly number[]
): number => {
  let best = flareX
  let bestGap = -1
  for (const k of [0, -1, 1]) {
    const centre = flareX - k * spacing
    let gap = Number.POSITIVE_INFINITY
    for (const lane of lanesOf(centre)) gap = Math.min(gap, Math.abs(lane - crowdX))
    if (gap > bestGap + 1e-9) {
      bestGap = gap
      best = centre
    }
  }
  return best
}
