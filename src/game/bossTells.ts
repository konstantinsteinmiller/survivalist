// ─── Whose promise is this? ─────────────────────────────────────────────────
//
// Every tell in this game is a PROMISE: a ring that says something lands here, a
// band that says leave this column, three furrows that say stand in the gaps. A
// boss can no longer keep any of them the instant it dies, so they have to come
// off the road on the same frame the kill does — which is what the owner asked
// for, and what `clearBossTells` does in the renderer.
//
// The catch is that the renderer keeps ONE pool for all of them, and most of
// what is in it at any moment belongs to a MINIBOSS: a bomber's fuse, a
// gunner's line, a scythe's arc, a warden's circle. A miniboss is not dead
// because the boss is, and the arena is not empty of them — a summoner spawns
// into it and the road's own elites can still be on their leash when the arena
// opens. So "the boss died, therefore everything on screen was the boss's" is
// not a safe assumption, and this file is the one place the question is
// answered.
//
// It lives out here, pure and tiny, for the same reason `resultFlow.ts` and
// `grenadeTutorial.ts` do: it is a design contract, and a design contract that
// can only be asserted by mounting a canvas is a design contract nobody asserts.
// The renderer owns the pool; this owns the rule.

/**
 * Every wind-up the renderer can be asked to draw.
 *
 * The union is here rather than in `useSurvivalArt` so the ownership rule below
 * is TOTAL over it — add a kind and the compiler makes you classify it, instead
 * of it defaulting to "not the boss's" and quietly surviving a boss death, or
 * to "the boss's" and quietly deleting somebody else's telegraph.
 *
 * `roller` is deliberately absent: its telegraph is the ball itself rolling
 * down the road for a second and a half, painted straight from the world by
 * `drawRollers`, so it has no entry in the cast pool at all.
 */
export type CastKind = 'meteor' | 'slice' | 'bomb' | 'bolt' | 'charge' | 'shock' | 'ward'

/**
 * Does the BOSS own this wind-up?
 *
 * The mapping is exact today and each half of it is emitted from one place:
 *
 *   BOSS       `meteor`, `charge`, `shock` — all three from `aimBoss`
 *   MINIBOSS   `bomb` (bomber, burrower), `bolt` (gunner), `slice` (scythe)
 *
 * `ward` is the healer's, and so the boss's — but it is deliberately NOT listed
 * as one here, because it is not taken down this way. `killBoss` already ends it
 * through `clearWard`, which announces a `wardEnd` and lets the renderer FADE
 * the circle out on the death frame. Cutting it here as well would replace a
 * fade with a jump cut, and would do it by racing two code paths at the same
 * mark on the road.
 *
 * Note what this rule is NOT asked: whether the wind-up has already landed. It
 * has not mattered since the clear started emptying the pools whole — the
 * simulation's clock stops on the kill, so a landed tell's own fade never
 * elapses either. See `clearBossTells`.
 */
export const bossOwnsCast = (kind: CastKind): boolean => {
  switch (kind) {
    case 'meteor':
    case 'charge':
    case 'shock':
      return true
    case 'slice':
    case 'bomb':
    case 'bolt':
    case 'ward':
      return false
  }
}
