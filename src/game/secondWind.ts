// ─── The first boss does not end a first session ────────────────────────────
//
// A first-timer who walks into the stage-1 arena and is wiped there met the
// loss screen at about seventy-five seconds — the most expensive screen in the
// funnel, because what it asks a stranger to do next is run the whole
// minute-long road again. So for a player who has never cleared stage 1 there
// is no loss screen in that arena: the guardian angel hands back a FIFTH MORE
// crowd than walked in (owner's call, 2026-09-18), and the fight goes on.
//
// Every time, not once — and it cannot loop. The boss keeps the damage it has
// taken (this is a second wind in the same fight, not a re-roll of it), so each
// life chips the bar further, and even a crowd that never steers fires. The
// loss is still an event — the fall, the light, the banner — it is just not a
// menu. Out of the arena the ordinary rules hold: the stage-1 ROAD has none.
//
// Pure and on its own, like `resultFlow.ts`: the scene installs it as part of
// its rally policy (`setRallyPolicy`), and a spec can pin it without a canvas.

/** The second wind, as a share of the crowd that walked into the arena. */
export const BOSS_ONE_RALLY_SHARE = 1.2

/** Never fewer than this, whatever walked in. Matches the scene's rally floor. */
export const BOSS_ONE_RALLY_MIN = 3

export interface BossOneAsk {
  stage: number
  phase: string
  /** `RallyAsk.arrivedAtBoss` — 0 before the arena opened. */
  arrivedAtBoss: number
}

/**
 * How many survivors the stage-1 boss's second wind hands back, or 0 when this
 * wipe is not one it covers.
 *
 * @param bestStage the highest stage the player has ever CLEARED — 0 means a
 *                  first-timer. Read from the save when the wipe happens, long
 *                  after the cloud read has settled, so a returning player on a
 *                  new device is never mistaken for a new one.
 */
export const bossOneRally = (ask: BossOneAsk, bestStage: number): number => {
  if (ask.stage !== 1 || ask.phase !== 'boss') return 0
  if (bestStage >= 1) return 0
  if (ask.arrivedAtBoss <= 0) return 0
  return Math.max(BOSS_ONE_RALLY_MIN, Math.ceil(ask.arrivedAtBoss * BOSS_ONE_RALLY_SHARE))
}
