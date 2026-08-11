// ─── World geometry constants ───────────────────────────────────────────────
//
// Shared by the simulation and the renderer so the water line is in exactly one
// place. If these drift apart, sea creatures swim through grass.
//
// World space: `y = 0` is the ground the tower stands on, `+y` is up. Below the
// tower the land falls away into a shallow strip of grass and then open water —
// the lake the reference towers are always reflected in.

/** How far below `y = 0` the land extends before the shoreline, in cells. */
export const GRASS_DEPTH = 0.5

/** The waterline. Everything below this is sea. */
export const SEA_LEVEL = -GRASS_DEPTH

/** Cruising depth for swimming enemies, in cells. */
export const SEA_SWIM_Y = -1.15

/** How high a sea creature rears out of the water to strike. */
export const SEA_STRIKE_Y = 0.35
