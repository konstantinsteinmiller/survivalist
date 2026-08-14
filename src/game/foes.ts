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
export const foeHpScale = (stage: number): number => 1 + (stage - 1) * 0.34

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

/** Boss body for a stage. Cycles so a returning player recognises the silhouette
 *  and knows roughly what they are in for. */
const BOSS_DESIGNS = ['snaggletusk', 'thornwick', 'marrowknight', 'cinderhound', 'rattlejack'] as const

export const bossDesign = (stage: number): string =>
  BOSS_DESIGNS[(stage - 1) % BOSS_DESIGNS.length] ?? 'snaggletusk'

/** Every design the game can ask for, so the baker can prime them all on an
 *  idle slot after first paint. */
export const allFoeDesigns = (): string[] => {
  const set = new Set<string>(BOSS_DESIGNS)
  for (const def of Object.values(FOE_DEFS)) for (const d of def.designs) set.add(d)
  return [...set]
}
