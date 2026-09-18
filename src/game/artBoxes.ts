/**
 * ─── Painted-art boxes the manifest shares with the renderer ────────────────
 *
 * The geometry a painting is blitted into, for the stills whose box is not
 * simply their panel. They live HERE, in a module with no imports, rather than
 * beside the painters in `useSurvivalArt`, because the art manifest
 * (`artSheet.ts`) needs them too — and the manifest has to load under plain Node
 * for `pnpm art:prompts`, where the renderer (Vue, the save, the audio) cannot.
 * `useSurvivalArt` imports and re-exports both, so nothing that read them from
 * there had to change.
 */

/**
 * The gate frame painting's own geometry, shared with the art bench.
 *
 * The reference is drawn at `ppu` px per world unit with a two-leaf door
 * (`refHalfW`) centred in a `w` x `h` panel, the leaf's origin at the panel's
 * centre. `cap` is how much of each side is blitted at true size; the span
 * between the caps is stretched to whatever leaf it is drawn on.
 */
export const GATE_FRAME = { ppu: 220, w: 1344, h: 576, cap: 260, refHalfW: 2.05 } as const

/**
 * The box a painted rocket is blitted into, in units of the shell's radius
 * `rr`: `w` wide and `h` tall, its top edge `top` above the shell's centre.
 * 9:16 — a ratio the image tools offer — with the plume given the room it
 * has in the drawing.
 */
export const ROCKET_BOX = { w: 3.6, h: 6.4, top: 2 } as const

/**
 * The box a painted CAGE is blitted into, in units of the cage's half-width
 * `r`, measured from the cage's own origin — the point `drawCages` translates
 * to, on the road where the cage stands.
 *
 * The drawn cage runs from its lid, `top` above the origin (its drawn height is
 * `top` half-widths, `CAGE_DRAW_TALL`), to its bottom rail, `bottom` below it;
 * that is 2.22 half-widths tall against a lid 2 wide. `side` squares the box by
 * giving it a tenth of a half-width of air on either side, so the painting is a
 * 1:1 image — the ratio every image tool offers by default, and the one the
 * supply crates it stands beside already use.
 */
export const CAGE_BOX = { top: 1.5, bottom: 0.72, side: 2.22 } as const

/**
 * The Dynamo's bolt, as a painting.
 *
 * A column is a thing with no fixed length — it runs from the crowd to the end
 * of the gun's reach, which grows with the Reach track — so the painting is a
 * TILE of it: `w` bullet-radii wide against `h` of column, stretched down the
 * lane by the renderer. 9:16 because that is a ratio every image tool offers,
 * and because a bolt wants to be painted tall.
 */
export const BOLT_BOX = { w: 9, h: 16 } as const
