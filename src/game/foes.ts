import { earlyFoeHpMul } from '@/game/survival'
import { bossKindFor, minibossDesignsFor, SUMMON_DESIGN, WYRM_DESIGN } from '@/game/threats'
/**
 * ─── The cast that wants your crowd ─────────────────────────────────────────
 *
 * Foes are deliberately thin: hp, speed, and how many survivors a bite costs.
 * All of the character lives in the ART — the hand-inked designs in
 * `monsters.ts`, baked to frame strips by `monsterSprites.ts` — so a foe def
 * here is really just "which body, how much of it, and how fast".
 *
 * Five archetypes, each answering a different question the player has to solve
 * with the same two verbs (shoot / steer):
 *
 *   creep  — many, weak. Punishes standing still on a gate too long.
 *   husk   — the baseline body. Shows up in packs from stage 2.
 *   hound  — fast. Reaches you before you have finished pumping.
 *   brute  — slow and thick. Must be shot early or dodged entirely.
 *   flyer  — ignores barricades and drifts sideways. Punishes tunnel vision.
 */

export interface FoeDef {
  id: string
  /** Baked designs this archetype can wear; an individual picks one for life. */
  designs: readonly string[]
  hp: number
  speed: number
  /** Survivors eaten per bite. */
  bite: number
  /** Seconds between bites. */
  biteCd: number
  /** Draw scale, world units tall-ish. */
  scale: number
  flying: boolean
  /** Coins dropped on death. */
  coins: number
}

export const FOE_DEFS: Record<string, FoeDef> = {
  creep: {
    id: 'creep',
    designs: ['grumpling', 'nibbler', 'blorp'],
    hp: 8, speed: 2.1, bite: 1, biteCd: 0.7, scale: 0.82, flying: false, coins: 1
  },
  husk: {
    id: 'husk',
    designs: ['bonecap', 'wispling', 'marrowknight'],
    hp: 16, speed: 1.7, bite: 2, biteCd: 0.8, scale: 0.95, flying: false, coins: 2
  },
  hound: {
    id: 'hound',
    designs: ['cinderhound', 'rattlejack'],
    hp: 13, speed: 3.4, bite: 2, biteCd: 0.55, scale: 0.9, flying: false, coins: 2
  },
  brute: {
    id: 'brute',
    designs: ['snaggletusk', 'thornwick'],
    hp: 46, speed: 1.15, bite: 5, biteCd: 1, scale: 1.25, flying: false, coins: 5
  },
  flyer: {
    id: 'flyer',
    designs: ['dustmoth', 'skewer', 'gloomcrow'],
    hp: 11, speed: 2.6, bite: 1, biteCd: 0.6, scale: 0.85, flying: true, coins: 2
  }
}

export const foeDef = (id: string): FoeDef => FOE_DEFS[id] ?? FOE_DEFS.creep!

/**
 * Which archetypes a stage may spawn.
 *
 * Introduction order is the tutorial: stage 1 is only creeps (learn "shoot the
 * thing"), husks land on 2, hounds on 3 (learn "shoot it EARLY"), flyers on 5
 * (learn "look sideways"), brutes on 7 (learn "a wall of HP needs a bigger
 * crowd"). After that the mix is stable and the numbers do the work.
 */
export const foeRoster = (stage: number): string[] => {
  const out = ['creep']
  if (stage >= 2) out.push('husk')
  if (stage >= 3) out.push('hound')
  if (stage >= 5) out.push('flyer')
  if (stage >= 7) out.push('brute')
  return out
}

/**
 * Stat scaling with stage depth.
 *
 * HP climbs faster than the squad does on its own, so the crates and the gate
 * pumping are load-bearing rather than optional — a player who walks through
 * gates without shooting them stalls out around stage 5, which is precisely the
 * moment the mechanic is supposed to click.
 */
export const foeHpScale = (stage: number): number =>
  (1 + (stage - 1) * 0.34) * earlyFoeHpMul(stage)

/**
 * Boss health scaling.
 *
 * ─── Why this is not a straight line ────────────────────────────────────────
 *
 * A run's power is a PRODUCT of three growing terms — squad × damage × fire
 * rate — and it grows ×138 over a thirty-stage career. A linear boss cannot
 * track that, and the career simulation showed exactly how it failed: the boss
 * out-grew the player over stages 1–4 (a 25-second slog on stage 3), the player
 * ran away from the boss over 5–12 (DPS ×16.2 against boss HP ×2.1), and from
 * stage 8 onward the boss DIED BEFORE ITS FIRST SLAM — a climax that never
 * swung, on twenty-three consecutive stages.
 *
 * The measured mismatch is localised, so the curve is too:
 *
 *   stages 1–4   flat — the early boss was the one part that was too HARD
 *   stages 5–12  ×1.55 a stage, the window where the player's compounding runs
 *                away from anything linear
 *   stages 13+   +12 % a stage, because past twelve the original linear slope
 *                was measured as already correct (×2.3 against the player's
 *                ×2.4)
 *
 * Simulated against the DPS runs actually arrive with, this moves median
 * time-to-kill across stages 8–30 from 1.1 s to 6.7 s for a competent player
 * and from 0.5 s to 3.5 s for a perfect one — into the 5–8 s window the fight
 * was designed for.
 *
 * It propagates to minibosses through `track.minibossHp`, which is deliberate:
 * they are sized as a fraction of the climax and should follow it.
 */
export const bossHpScale = (stage: number): number =>
  Math.pow(1.55, Math.max(0, Math.min(stage, 12) - 4))
  * (1 + Math.max(0, stage - 12) * 0.12)

/**
 * ─── Every stage ends in a boss ─────────────────────────────────────────────
 *
 * Stage 1 briefly did not. After the fit test put 64 % of sessions inside two
 * minutes, the climax was cut back to a single weakened elite
 * (`MINIBOSS_TUTORIAL`) on the theory that a stranger should not be asked to
 * learn the road, the gates, the crates AND a boss before deciding to stay.
 *
 * That went too far. A level that simply stops — no arena, no big one, no
 * moment — reads as unfinished rather than as gentle, and it teaches the wrong
 * shape for every stage that follows. So the boss is back, and the fix for the
 * original problem is its PRICE rather than its absence: stage 1's boss is the
 * same creature the player just beat halfway down the road, at boss size and
 * barely tougher (`TUTORIAL_BOSS_HP`). It is a victory lap with a health bar.
 *
 * The pattern it establishes is stage 2's as well — meet the shape, beat a small
 * one, then meet it again as the thing at the end. See `bossDesign`.
 */

/**
 * ─── The arena kit: what makes each boss fight its own fight ────────────────
 *
 * Stages 1–5 teach the game; from 6 the player knows how to play and the job
 * changes from teaching to keeping them curious. A boss that is always "hold
 * fire on the big one, dodge the slam" is the same fight fifteen times, and the
 * player fit test said what that costs.
 *
 * So the arena is furnished per stage. The table below is authored, not rolled,
 * for the same reason stages 1–5 are: each entry should introduce or recombine
 * exactly one idea, and a seeded shuffle cannot promise that.
 *
 *   barrels — TNT the crowd can shoot for a big hit that lands THROUGH the
 *             boss's shield. The answer to "my gun does nothing right now" and
 *             to "this boss out-scales my damage".
 *   escort  — the boss does not stand alone; a pack holds the arena with it, so
 *             fire has to be spent on something other than the health bar.
 *
 * Read the column downward and it is a rhythm rather than a ramp: barrels are
 * introduced alone (6), then have to be reached past an escort (8), then arrive
 * in numbers against a boss built to out-tank the crowd (10, 13), with plain
 * fights kept in between (7, 9, 12) so the furnished ones stay special.
 */
export interface ArenaKit {
  /** How many TNT barrels stand in the arena. */
  barrels: number
  /** Foes holding the arena alongside the boss: archetype and count. */
  escort: { typeId: string; count: number } | null
}

const ARENA_KITS: Record<number, ArenaKit> = {
  6: { barrels: 2, escort: null },
  7: { barrels: 0, escort: { typeId: 'hound', count: 3 } },
  8: { barrels: 2, escort: { typeId: 'creep', count: 4 } },
  9: { barrels: 0, escort: null },
  10: { barrels: 3, escort: null },
  11: { barrels: 2, escort: { typeId: 'flyer', count: 3 } },
  12: { barrels: 0, escort: { typeId: 'brute', count: 1 } },
  13: { barrels: 3, escort: { typeId: 'husk', count: 3 } },
  14: { barrels: 2, escort: { typeId: 'hound', count: 4 } },
  15: { barrels: 4, escort: { typeId: 'creep', count: 5 } }
}

/**
 * The arena furniture for a stage.
 *
 * Stages 1–5 get a bare arena: they are still teaching the core loop and a
 * boss with props is a boss with a tutorial attached. Past 15 the authored
 * table runs out and the campaign cycles it — the ideas keep recombining with
 * a curve that is still climbing, which is what stops the endless stretch
 * reading as one stage repeated.
 */
export const arenaKit = (stage: number): ArenaKit => {
  if (stage < 6) return { barrels: 0, escort: null }
  const authored = ARENA_KITS[stage]
  if (authored) return authored
  const keys = Object.keys(ARENA_KITS).map(Number).sort((a, b) => a - b)
  const pick = keys[(stage - 6) % keys.length] ?? 6
  return ARENA_KITS[pick] ?? { barrels: 0, escort: null }
}

/** Boss body for a stage. Cycles so a returning player recognises the silhouette
 *  and knows roughly what they are in for. */
const BOSS_DESIGNS = ['snaggletusk', 'thornwick', 'marrowknight', 'cinderhound', 'rattlejack'] as const

export const bossDesign = (stage: number): string => {
  // STAGES 1 AND 2 are the introduction to bosses, so neither is a new
  // silhouette: each is the same body as the miniboss on its own road, at boss
  // size. The player meets the shape halfway through the stage, beats a small
  // one, and then meets it again as the thing at the end — which reads as "I
  // know what that is" instead of "what is that".
  //
  // Minibosses spawn with `def.designs[0]` (see `useSurvivalGame`). Stage 1's
  // roster is creeps alone and stage 2's elite archetype is `husk`, so both are
  // kept in lockstep with their elite by deriving this rather than naming a
  // literal. It also costs nothing to bake: the design is already in
  // `stageDesigns` because the roster put it there.
  if (stage <= 1) return FOE_DEFS.creep!.designs[0] ?? 'grumpling'
  if (stage === 2) return FOE_DEFS.husk!.designs[0] ?? 'bonecap'
  // THE SUMMONER IS ALWAYS THE MARROW KNIGHT. It raises marrow knights out of
  // the road (`SUMMON_DESIGN`), and a boar that conjures skeleton knights reads
  // as a bug rather than as a boss — the body has to be the thing it summons,
  // at boss size. Every other kind keeps its place in the cycle below.
  if (bossKindFor(stage) === 'summoner') return SUMMON_DESIGN
  // THE WYRM IS ALWAYS THE SKEWER, for the marrow knight's reason. Its whole
  // fight is a jet of fire swept down the road and a wall of spines out of it,
  // and the skewer is the one body in the cast that is a wyrmling — "small,
  // fast, and almost entirely the pointy end". A boar that breathes fire reads
  // as a bug. It is also already on the road from stage 5 as the burrower, so a
  // player meets the silhouette either side of the fight.
  if (bossKindFor(stage) === 'wyrm') return WYRM_DESIGN
  return BOSS_DESIGNS[(stage - 1) % BOSS_DESIGNS.length] ?? 'snaggletusk'
}

/**
 * Every design stage `n` can put on screen: its foe roster plus its boss.
 *
 * This is the set that has to be BAKED before the stage starts, and it is much
 * smaller than the full cast — stage 1 is three creep designs and one boss
 * against the thirteen below. Baking the whole cast up front cost 11 s of
 * loading on a throttled phone and still finished only 19 % of the way, which
 * left the rest to bake mid-run: the red fallback ellipses players reported,
 * and the stutter, were the same 208-canvas job landing in the wrong place.
 *
 * `foeRoster` is cumulative, so a returning player deep in the run legitimately
 * needs most of the cast — but they need it because they will see it.
 */
export const stageDesigns = (stage: number): string[] =>
  // The elites' bodies belong here too, and did not before: a miniboss's design
  // now comes from its FIGHT (`MINIBOSS_DESIGN`) rather than from the archetype
  // the track placed, so a stage can field a body its roster never mentions.
  // Snaggletusk on stage 1 is the plain case — the roster there is three creeps.
  // Left out, the elite draws as the red fallback ellipse until the per-frame
  // slice baker catches up, which is the exact bug this list exists to prevent.
  [...new Set([...rosterDesigns(stage), ...minibossDesignsFor(stage), bossDesign(stage)])]

/**
 * The designs stage `n` puts on the ROAD — its roster, without the thing at the
 * end of it.
 *
 * The split exists for the network, not for the baker. A boss stands at
 * `arenaY`, a whole stage away from the first frame, and its painted strip is
 * the heaviest single file in the set; the roster is on screen in the opening
 * seconds. So the art preloader holds the splash for this and fetches the boss
 * right after (`artPreload`), while the BAKE still primes both — a canvas the
 * idle pump has not reached yet is a red ellipse, and that pump keeps running
 * long before the boss walks on.
 *
 * A boss design is usually a roster design too (stage 1's is the creep it has
 * been fighting all along), so this is often the same set either way.
 */
export const rosterDesigns = (stage: number): string[] => {
  const set = new Set<string>()
  for (const id of foeRoster(stage)) for (const d of foeDef(id).designs) set.add(d)
  return [...set]
}

/**
 * Every body a BOSS can wear, in campaign order: the two introduction stages'
 * borrowed bodies, then the rotation. What the art bench paints a death strip
 * for (`artSheet.BOSS_DEATHS`) — derived here so a design added to the rotation
 * gets a death sheet without anybody remembering to list it twice.
 *
 * `WYRM_DESIGN` is here even though it is not in the rotation: `bossDesign`
 * welds the wyrm to it, so it is a boss body like any other and needs the same
 * two sheets — the death it falls in, and the big attack it plays while it
 * winds one up (`BOSS_HURLS`, which for this one is a breath).
 */
export const bossDesigns = (): string[] =>
  [...new Set([bossDesign(1), bossDesign(2), ...BOSS_DESIGNS, SUMMON_DESIGN, WYRM_DESIGN])]

/** Every design the game can ask for, so the baker can prime them all on an
 *  idle slot after first paint. */
export const allFoeDesigns = (): string[] => {
  const set = new Set<string>(BOSS_DESIGNS)
  for (const def of Object.values(FOE_DEFS)) for (const d of def.designs) set.add(d)
  return [...set]
}
