import type { GameIconName } from './iconNames'

/**
 * ─── Glyph geometry ─────────────────────────────────────────────────────────
 *
 * One `24 × 24` viewBox, solid fills, rounded joins, optically centred with
 * ~2px of margin. Every glyph is a list of sub-path `d` strings painted as a
 * single `<path>` with the **nonzero** winding rule (see `GameIcon.vue`):
 * sub-paths drawn clockwise add to the shape, counter-clockwise ones punch a
 * hole through it — the gear's bore, the keyhole, the counter of `info`, the
 * cut-out of `star-empty`.
 *
 * Nonzero rather than evenodd is deliberate. Half of these glyphs are built
 * from limbs that deliberately overlap (the lock's shackle sinking into its
 * body, the arrow head sitting on its shaft, the note stems crossing their
 * beam). Under evenodd every one of those overlaps would XOR itself into a
 * hole; under nonzero they merge, and holes stay explicit and intentional.
 *
 * Why solid and not stroked: these sit white on saturated candy plastic at HUD
 * sizes down to 16px, where a 2px stroke greys into the gradient behind it.
 * Limbs are kept ≥ ~2.5 units thick in the 24-unit box for the same reason.
 *
 * The geometry is hand-tuned, not traced: mirror pairs are exact reflections
 * (`left`/`right`, `skip-forward`/`skip-back`), and shapes are placed on
 * their optical centre rather than their bounding box — `play`'s triangle
 * sits right of centre because a leftward-pointing mass reads as off-centre
 * otherwise.
 */
export const ICON_PATHS: Record<GameIconName, string[]> = {
  // ── Transport / run control ─────────────────────────────────────────
  // Centroid sits at x≈11, not 12: a right-pointing triangle centred on its
  // bounding box reads as if it has slipped to the left.
  'play': [
    'M6.4 6.78A1.8 1.8 0 0 1 9.13 5.24L17.83 10.46A1.8 1.8 0 0 1 17.83 13.54L9.13 18.76A1.8 1.8 0 0 1 6.4 17.22L6.4 6.78Z'
  ],
  'pause': [
    'M6 6.35A1.75 1.75 0 0 1 7.75 4.6L8.65 4.6A1.75 1.75 0 0 1 10.4 6.35L10.4 17.65A1.75 1.75 0 0 1 8.65 19.4L7.75 19.4A1.75 1.75 0 0 1 6 17.65L6 6.35Z',
    'M13.6 6.35A1.75 1.75 0 0 1 15.35 4.6L16.25 4.6A1.75 1.75 0 0 1 18 6.35L18 17.65A1.75 1.75 0 0 1 16.25 19.4L15.35 19.4A1.75 1.75 0 0 1 13.6 17.65L13.6 6.35Z'
  ],
  // The most-used glyph in the game (HUD strip + end screen). Band and arrow
  // head are ONE contour, not a band plus a triangle, so no sweep-flag or
  // winding mistake can ever cut a notch where the head meets the ring.
  // Travel is counter-clockwise: the head sits right of top and points left.
  'replay': [
    'M5.09 7.26A8.7 8.7 0 1 0 15.21 4.46A0.55 0.55 0 0 1 14.86 3.75L14.9 3.63A0.7 0.7 0 0 0 13.85 2.83L9.76 5.55A1 1 0 0 0 9.67 7.14L12.07 9.2A0.7 0.7 0 0 0 13.19 8.89L13.53 7.84A0.55 0.55 0 0 1 14.21 7.51A5.5 5.5 0 1 1 7.42 9.51A1 1 0 0 0 7.32 8.03L6.46 7.2A1 1 0 0 0 5.09 7.26Z'
  ],
  // Triangle + bar — the 'next track' mark. This replaces the word "Next".
  'skip-forward': [
    'M4 6.94A1.6 1.6 0 0 1 6.47 5.59L14.32 10.66A1.6 1.6 0 0 1 14.32 13.34L6.47 18.41A1.6 1.6 0 0 1 4 17.06L4 6.94Z',
    'M17 6.5A1.6 1.6 0 0 1 18.6 4.9L18.8 4.9A1.6 1.6 0 0 1 20.4 6.5L20.4 17.5A1.6 1.6 0 0 1 18.8 19.1L18.6 19.1A1.6 1.6 0 0 1 17 17.5L17 6.5Z'
  ],
  // Exact reflection of skip-forward through x = 12.
  'skip-back': [
    'M20 17.06A1.6 1.6 0 0 1 17.53 18.41L9.68 13.34A1.6 1.6 0 0 1 9.68 10.66L17.53 5.59A1.6 1.6 0 0 1 20 6.94L20 17.06Z',
    'M3.6 6.5A1.6 1.6 0 0 1 5.2 4.9L5.4 4.9A1.6 1.6 0 0 1 7 6.5L7 17.5A1.6 1.6 0 0 1 5.4 19.1L5.2 19.1A1.6 1.6 0 0 1 3.6 17.5L3.6 6.5Z'
  ],
  'stop': [
    'M4.8 8.2A3.4 3.4 0 0 1 8.2 4.8L15.8 4.8A3.4 3.4 0 0 1 19.2 8.2L19.2 15.8A3.4 3.4 0 0 1 15.8 19.2L8.2 19.2A3.4 3.4 0 0 1 4.8 15.8L4.8 8.2Z'
  ],

  // ── Navigation ──────────────────────────────────────────────────────
  'menu': [
    'M3.4 6.35A1.65 1.65 0 0 1 5.05 4.7L18.95 4.7A1.65 1.65 0 0 1 20.6 6.35A1.65 1.65 0 0 1 18.95 8L5.05 8A1.65 1.65 0 0 1 3.4 6.35Z',
    'M3.4 12A1.65 1.65 0 0 1 5.05 10.35L18.95 10.35A1.65 1.65 0 0 1 20.6 12A1.65 1.65 0 0 1 18.95 13.65L5.05 13.65A1.65 1.65 0 0 1 3.4 12Z',
    'M3.4 17.65A1.65 1.65 0 0 1 5.05 16L18.95 16A1.65 1.65 0 0 1 20.6 17.65A1.65 1.65 0 0 1 18.95 19.3L5.05 19.3A1.65 1.65 0 0 1 3.4 17.65Z'
  ],
  // One polygon, not a body with an evenodd doorway: the door opens onto the
  // bottom edge, so tracing it as a notch avoids two paths sharing an edge
  // (which antialiases into a visible seam).
  'home': [
    'M10.82 3.13A1.7 1.7 0 0 1 13.18 3.13L20.78 10.41A2 2 0 0 1 21.4 11.85L21.4 18.4A2.4 2.4 0 0 1 19 20.8L15.6 20.8A0.7 0.7 0 0 1 14.9 20.1L14.9 16A2.4 2.4 0 0 0 12.5 13.6L11.5 13.6A2.4 2.4 0 0 0 9.1 16L9.1 20.1A0.7 0.7 0 0 1 8.4 20.8L5 20.8A2.4 2.4 0 0 1 2.6 18.4L2.6 11.85A2 2 0 0 1 3.22 10.41L10.82 3.13Z'
  ],
  // Arrow = shaft + head, deliberately distinct from the bare `left` chevron so
  // "go back" and "previous item" don't collide in a toolbar.
  'back': [
    'M5.4 12A1.95 1.95 0 0 1 7.35 10.05L18.25 10.05A1.95 1.95 0 0 1 20.2 12A1.95 1.95 0 0 1 18.25 13.95L7.35 13.95A1.95 1.95 0 0 1 5.4 12Z',
    'M13.3 5.3A1.95 1.95 0 0 1 13.28 8.06L10.22 11.07A1.3 1.3 0 0 0 10.22 12.93L13.28 15.94A1.95 1.95 0 0 1 13.3 18.7A1.95 1.95 0 0 1 10.54 18.72L4.66 12.93A1.3 1.3 0 0 1 4.66 11.07L10.54 5.28A1.95 1.95 0 0 1 13.3 5.3Z'
  ],
  'forward': [
    'M3.8 12A1.95 1.95 0 0 1 5.75 10.05L16.65 10.05A1.95 1.95 0 0 1 18.6 12A1.95 1.95 0 0 1 16.65 13.95L5.75 13.95A1.95 1.95 0 0 1 3.8 12Z',
    'M10.7 5.3A1.95 1.95 0 0 1 13.46 5.28L19.34 11.07A1.3 1.3 0 0 1 19.34 12.93L13.46 18.72A1.95 1.95 0 0 1 10.7 18.7A1.95 1.95 0 0 1 10.72 15.94L13.78 12.93A1.3 1.3 0 0 0 13.78 11.07L10.72 8.06A1.95 1.95 0 0 1 10.7 5.3Z'
  ],
  // A plus ring rotated 45°, so the X inherits the stepper's limb weight exactly.
  'close': [
    'M16.38 4.86A1.15 1.15 0 0 1 18.01 4.86L19.14 5.99A1.15 1.15 0 0 1 19.14 7.62L15.5 11.26A1.05 1.05 0 0 0 15.5 12.74L19.14 16.38A1.15 1.15 0 0 1 19.14 18.01L18.01 19.14A1.15 1.15 0 0 1 16.38 19.14L12.74 15.5A1.05 1.05 0 0 0 11.26 15.5L7.62 19.14A1.15 1.15 0 0 1 5.99 19.14L4.86 18.01A1.15 1.15 0 0 1 4.86 16.38L8.5 12.74A1.05 1.05 0 0 0 8.5 11.26L4.86 7.62A1.15 1.15 0 0 1 4.86 5.99L5.99 4.86A1.15 1.15 0 0 1 7.62 4.86L11.26 8.5A1.05 1.05 0 0 0 12.74 8.5L16.38 4.86Z'
  ],
  'check': [
    'M5 11.5A1.95 1.95 0 0 1 7.75 11.67L8.53 12.55A1.35 1.35 0 0 0 10.58 12.53L16.25 5.83A1.95 1.95 0 0 1 19 5.6A1.95 1.95 0 0 1 19.23 8.35L10.64 18.49A1.35 1.35 0 0 1 8.6 18.51L4.83 14.25A1.95 1.95 0 0 1 5 11.5Z'
  ],

  // ── Meta screens ────────────────────────────────────────────────────
  'settings': [
    'M20.55 9.62A1.15 1.15 0 0 1 21.63 10.77L21.63 13.23A1.15 1.15 0 0 1 20.55 14.38L19.36 14.45A0.62 0.62 0 0 0 18.83 14.83A0.62 0.62 0 0 0 18.94 15.48L19.72 16.36A1.15 1.15 0 0 1 19.68 17.94L17.94 19.68A1.15 1.15 0 0 1 16.36 19.72L15.48 18.94A0.62 0.62 0 0 0 14.83 18.83A0.62 0.62 0 0 0 14.45 19.36L14.38 20.55A1.15 1.15 0 0 1 13.23 21.63L10.77 21.63A1.15 1.15 0 0 1 9.62 20.55L9.55 19.36A0.62 0.62 0 0 0 9.17 18.83A0.62 0.62 0 0 0 8.52 18.94L7.64 19.72A1.15 1.15 0 0 1 6.06 19.68L4.32 17.94A1.15 1.15 0 0 1 4.28 16.36L5.06 15.48A0.62 0.62 0 0 0 5.17 14.83A0.62 0.62 0 0 0 4.64 14.45L3.45 14.38A1.15 1.15 0 0 1 2.37 13.23L2.37 10.77A1.15 1.15 0 0 1 3.45 9.62L4.64 9.55A0.62 0.62 0 0 0 5.17 9.17A0.62 0.62 0 0 0 5.06 8.52L4.28 7.64A1.15 1.15 0 0 1 4.32 6.06L6.06 4.32A1.15 1.15 0 0 1 7.64 4.28L8.52 5.06A0.62 0.62 0 0 0 9.17 5.17A0.62 0.62 0 0 0 9.55 4.64L9.62 3.45A1.15 1.15 0 0 1 10.77 2.37L13.23 2.37A1.15 1.15 0 0 1 14.38 3.45L14.45 4.64A0.62 0.62 0 0 0 14.83 5.17A0.62 0.62 0 0 0 15.48 5.06L16.36 4.28A1.15 1.15 0 0 1 17.94 4.32L19.68 6.06A1.15 1.15 0 0 1 19.72 7.64L18.94 8.52A0.62 0.62 0 0 0 18.83 9.17A0.62 0.62 0 0 0 19.36 9.55L20.55 9.62Z',
    'M8.65 12A3.35 3.35 0 1 0 15.35 12A3.35 3.35 0 1 0 8.65 12Z'
  ],
  // Grip, strut and basket are traced as a single union outline; the basket's
  // left edge is collinear with the strut so the cart has one clean side line.
  'shop': [
    'M3 3.5A1.3 1.3 0 0 1 4.3 2.2L5.99 2.2A1.1 1.1 0 0 1 6.97 2.81L8.96 6.79A1.1 1.1 0 0 0 9.94 7.4L19.16 7.4A1.6 1.6 0 0 1 20.7 9.45L19.44 13.75A1.6 1.6 0 0 1 17.9 14.9L10.81 14.9A1.5 1.5 0 0 1 9.47 14.07L5.24 5.61A1.1 1.1 0 0 0 4.26 5L3.97 5A0.97 0.97 0 0 1 3 4.03L3 3.5Z',
    'M8.85 19A2.15 2.15 0 1 1 13.15 19A2.15 2.15 0 1 1 8.85 19Z',
    'M15.45 19A2.15 2.15 0 1 1 19.75 19A2.15 2.15 0 1 1 15.45 19Z'
  ],
  // The treasure chest: a domed lid over a banded box, the lid up a crack so a
  // dark gap shows between the two, and a hasp bridging the gap in front. The
  // lid overhangs the box by half a unit on each side, which is what makes it
  // a chest rather than a barrel on a plinth at 16 px. Three sub-paths, all
  // wound the same way, so the hasp merges into lid and box under nonzero.
  'chest': [
    'M2.5 10V8.6A5.6 5.6 0 0 1 8.1 3h7.8a5.6 5.6 0 0 1 5.6 5.6V10h-19Z',
    'M3.5 11.6h17v7.9a1.5 1.5 0 0 1-1.5 1.5h-14a1.5 1.5 0 0 1-1.5-1.5v-7.9Z',
    'M9.8 9.2h4.4v4.8H9.8Z'
  ],
  // The upgrade shop's mark: a blackened anvil under a rising chevron. Three
  // sub-paths wound the same way so they merge under nonzero — the chevron's
  // lower tips stop just above the face, and the waist between face and base
  // is the one place the outline narrows, which is what reads as an anvil at
  // 24 px rather than as a lump. Only ever seen when the drawn mark in
  // `uiArt.paintForge` cannot be baked; see `ArtIcon`.
  'anvil': [
    // The chevron: two arms of even thickness meeting at a point.
    'M12 2.6 20.2 9.2 20.2 12.4 12 5.8 3.8 12.4 3.8 9.2Z',
    // Face + horn: a slab drawn out to a blunt point on the left, waisted
    // down to the base.
    'M1.6 14.1 4.4 12.2 20.4 12.2A1.3 1.3 0 0 1 21.7 13.5L21.7 14.6A1.3 1.3 0 0 1 20.4 15.9L17 15.9C16.3 17.4 15 18.3 13.4 18.6L13.4 19.4 10.6 19.4 10.6 18.6C9 18.3 7.7 17.4 7 15.9L4.4 15.9Z',
    // Base: the splayed foot, wider than the face so the waist reads.
    'M9.6 18.9 14.4 18.9A1.2 1.2 0 0 1 15.6 20L15.6 20.6A0.8 0.8 0 0 1 14.8 21.4L9.2 21.4A0.8 0.8 0 0 1 8.4 20.6L8.4 20A1.2 1.2 0 0 1 9.6 18.9Z'
  ],
  'video': [
    'M2.3 8.9A2.8 2.8 0 0 1 5.1 6.1L12.1 6.1A2.8 2.8 0 0 1 14.9 8.9L14.9 15.1A2.8 2.8 0 0 1 12.1 17.9L5.1 17.9A2.8 2.8 0 0 1 2.3 15.1L2.3 8.9Z',
    'M19.29 8.67A1.4 1.4 0 0 1 21.5 9.81L21.5 14.19A1.4 1.4 0 0 1 19.29 15.33L16.76 13.53A1.1 1.1 0 0 1 16.3 12.63L16.3 11.37A1.1 1.1 0 0 1 16.76 10.47L19.29 8.67Z'
  ],
  // Megaphone rather than a speaker so it can't be mistaken for `sound`. The
  // waves are centred on the mouth, so every point of them is beyond the mouth
  // plane and none can collide with the cone.
  'ads': [
    'M3.83 16.69A1.6 1.6 0 0 1 3.86 14.81L7.97 9.31A1.8 1.8 0 0 1 10.88 9.35L14.52 14.45A1.8 1.8 0 0 1 13.6 17.21L7.06 19.3A1.6 1.6 0 0 1 5.26 18.71L3.83 16.69Z',
    'M15.32 7.76A4.9 4.9 0 0 1 17.52 11.03A1.05 1.05 0 0 1 16.55 12.03L16.25 12.02A1.05 1.05 0 0 1 15.02 10.96A2.5 2.5 0 0 0 14.44 10.1A1.05 1.05 0 0 1 13.91 8.56L14.02 8.28A1.05 1.05 0 0 1 15.32 7.76Z',
    'M16.43 4.71A8.1 8.1 0 0 1 20.76 11.13A1.05 1.05 0 0 1 19.75 12.15L19.45 12.14A1.05 1.05 0 0 1 18.34 11.05A5.7 5.7 0 0 0 15.6 6.99A1.05 1.05 0 0 1 15.01 5.56L15.11 5.28A1.05 1.05 0 0 1 16.43 4.71Z'
  ],
  'book': [
    'M2.7 6.93A1.3 1.3 0 0 1 4.29 5.66L10.04 6.97A1.3 1.3 0 0 1 11.05 8.24L11.05 17.87A1.3 1.3 0 0 1 9.46 19.14L3.71 17.83A1.3 1.3 0 0 1 2.7 16.56L2.7 6.93Z',
    'M21.3 16.56A1.3 1.3 0 0 1 20.29 17.83L14.54 19.14A1.3 1.3 0 0 1 12.95 17.87L12.95 8.24A1.3 1.3 0 0 1 13.96 6.97L19.71 5.66A1.3 1.3 0 0 1 21.3 6.93L21.3 16.56Z'
  ],
  'info': [
    'M2.15 12A9.85 9.85 0 1 1 21.85 12A9.85 9.85 0 1 1 2.15 12Z',
    'M10.25 7.35A1.75 1.75 0 1 0 13.75 7.35A1.75 1.75 0 1 0 10.25 7.35Z',
    'M10.35 16.15A1.5 1.5 0 0 0 11.85 17.65L12.15 17.65A1.5 1.5 0 0 0 13.65 16.15L13.65 11.8A1.5 1.5 0 0 0 12.15 10.3L11.85 10.3A1.5 1.5 0 0 0 10.35 11.8L10.35 16.15Z'
  ],
  // The ? is a stroke outline (hook arc → tangent descender → stem) closed by
  // fillets of exactly the half-thickness, which is what makes the ends read as
  // round caps. Wound with the disc, so it prints; the counter comes from the
  // inner arc, and the dot below is the only reversed sub-path.
  'help': [
    'M2.15 12A9.85 9.85 0 1 1 21.85 12A9.85 9.85 0 1 1 2.15 12Z',
    'M9.02 10.34L9.07 10.32A1.32 1.32 0 0 0 10.18 8.47A1.8 1.8 0 1 1 13.17 10.27L11.94 11.5A0.82 0.82 0 0 0 11.9 12.62L13.29 14.22A0.29 0.29 0 0 1 13.07 14.7L13.02 14.7A0.32 0.32 0 0 1 12.92 14.08L13.11 14.02A0.9 0.9 0 0 0 13.47 13.8L15.08 12.18A4.5 4.5 0 1 0 7.45 9.64A1.32 1.32 0 0 0 9.02 10.34Z',
    'M10.9 18.3A1.5 1.5 0 1 0 13.9 18.3A1.5 1.5 0 1 0 10.9 18.3Z'
  ],

  // ── Audio ───────────────────────────────────────────────────────────
  // Beamed double eighth-note; stems overrun into the beam and the note heads,
  // which nonzero merges instead of punching out.
  'music': [
    'M8.7 4.8A1.3 1.3 0 0 1 10 3.5L19 3.5A1.3 1.3 0 0 1 20.3 4.8L20.3 5.6A1.3 1.3 0 0 1 19 6.9L10 6.9A1.3 1.3 0 0 1 8.7 5.6L8.7 4.8Z',
    'M8.7 4.6A1.1 1.1 0 0 1 9.8 3.5L10.1 3.5A1.1 1.1 0 0 1 11.2 4.6L11.2 17A1.1 1.1 0 0 1 10.1 18.1L9.8 18.1A1.1 1.1 0 0 1 8.7 17L8.7 4.6Z',
    'M17.8 4.6A1.1 1.1 0 0 1 18.9 3.5L19.2 3.5A1.1 1.1 0 0 1 20.3 4.6L20.3 15.2A1.1 1.1 0 0 1 19.2 16.3L18.9 16.3A1.1 1.1 0 0 1 17.8 15.2L17.8 4.6Z',
    'M3.81 18.6A3.5 2.8 -20 1 1 10.39 16.2A3.5 2.8 -20 1 1 3.81 18.6Z',
    'M13.01 16.8A3.5 2.8 -20 1 1 19.59 14.4A3.5 2.8 -20 1 1 13.01 16.8Z'
  ],
  // A single eighth-note plus a bold X, matching `sound-off`. A slash across the
  // beamed note cannot be done with fill rules alone — it would have to cut the
  // glyph, and a bar merely drawn on top would just fatten it.
  'music-off': [
    'M8.3 4.75A1.05 1.05 0 0 1 9.35 3.7L9.65 3.7A1.05 1.05 0 0 1 10.7 4.75L10.7 16.55A1.05 1.05 0 0 1 9.65 17.6L9.35 17.6A1.05 1.05 0 0 1 8.3 16.55L8.3 4.75Z',
    'M10.7 5.54A0.85 0.85 0 0 1 12.1 4.9L13.14 5.79A1.1 1.1 0 0 1 13.52 6.57L13.61 8.17A0.89 0.89 0 0 1 12.2 8.95L11.13 8.2A1 1 0 0 1 10.7 7.38L10.7 5.54Z',
    'M3.2 18.73A3.3 2.6 -20 1 1 9.4 16.47A3.3 2.6 -20 1 1 3.2 18.73Z',
    'M19.25 8.63A0.95 0.95 0 0 1 20.59 8.63L21.37 9.41A0.95 0.95 0 0 1 21.37 10.75L20.52 11.6A0.85 0.85 0 0 0 20.52 12.8L21.37 13.65A0.95 0.95 0 0 1 21.37 14.99L20.59 15.77A0.95 0.95 0 0 1 19.25 15.77L18.4 14.92A0.85 0.85 0 0 0 17.2 14.92L16.35 15.77A0.95 0.95 0 0 1 15.01 15.77L14.23 14.99A0.95 0.95 0 0 1 14.23 13.65L15.08 12.8A0.85 0.85 0 0 0 15.08 11.6L14.23 10.75A0.95 0.95 0 0 1 14.23 9.41L15.01 8.63A0.95 0.95 0 0 1 16.35 8.63L17.2 9.48A0.85 0.85 0 0 0 18.4 9.48L19.25 8.63Z'
  ],
  'sound': [
    'M3 10.5A1.2 1.2 0 0 1 4.2 9.3L6.32 9.3A0.9 0.9 0 0 0 6.97 9.02L9 6.9A1.34 1.34 0 0 1 11.3 7.82L11.3 16.18A1.34 1.34 0 0 1 9 17.1L6.97 14.98A0.9 0.9 0 0 0 6.32 14.7L4.2 14.7A1.2 1.2 0 0 1 3 13.5L3 10.5Z',
    'M16.4 8.9A5.3 5.3 0 0 1 16.4 15.1A0.95 0.95 0 0 1 15.12 15.13L14.98 14.99A0.95 0.95 0 0 1 14.9 13.55A3.2 3.2 0 0 0 14.9 10.45A0.95 0.95 0 0 1 14.98 9.01L15.12 8.87A0.95 0.95 0 0 1 16.4 8.9Z',
    'M18.93 6.29A8.9 8.9 0 0 1 18.93 17.71A0.95 0.95 0 0 1 17.62 17.72L17.48 17.57A0.95 0.95 0 0 1 17.46 16.19A6.8 6.8 0 0 0 17.46 7.81A0.95 0.95 0 0 1 17.48 6.43L17.62 6.28A0.95 0.95 0 0 1 18.93 6.29Z'
  ],
  'sound-off': [
    'M2.4 10.5A1.2 1.2 0 0 1 3.6 9.3L5.72 9.3A0.9 0.9 0 0 0 6.37 9.02L8.4 6.9A1.34 1.34 0 0 1 10.7 7.82L10.7 16.18A1.34 1.34 0 0 1 8.4 17.1L6.37 14.98A0.9 0.9 0 0 0 5.72 14.7L3.6 14.7A1.2 1.2 0 0 1 2.4 13.5L2.4 10.5Z',
    'M18.65 8.43A0.95 0.95 0 0 1 19.99 8.43L20.77 9.21A0.95 0.95 0 0 1 20.77 10.55L19.92 11.4A0.85 0.85 0 0 0 19.92 12.6L20.77 13.45A0.95 0.95 0 0 1 20.77 14.79L19.99 15.57A0.95 0.95 0 0 1 18.65 15.57L17.8 14.72A0.85 0.85 0 0 0 16.6 14.72L15.75 15.57A0.95 0.95 0 0 1 14.41 15.57L13.63 14.79A0.95 0.95 0 0 1 13.63 13.45L14.48 12.6A0.85 0.85 0 0 0 14.48 11.4L13.63 10.55A0.95 0.95 0 0 1 13.63 9.21L14.41 8.43A0.95 0.95 0 0 1 15.75 8.43L16.6 9.28A0.85 0.85 0 0 0 17.8 9.28L18.65 8.43Z'
  ],

  // ── Progression ─────────────────────────────────────────────────────
  // Shackle = half band + two legs sunk into the body; the legs' square ends are
  // buried inside the body, so they never show.
  'lock': [
    'M6 8.7A6 6 0 0 1 18 8.7L15.2 8.7A3.2 3.2 0 0 0 8.8 8.7L6 8.7Z',
    'M6 8.7L8.8 8.7L8.8 11.8L6 11.8L6 8.7Z',
    'M15.2 8.7L18 8.7L18 11.8L15.2 11.8L15.2 8.7Z',
    'M3.7 13.1A2.9 2.9 0 0 1 6.6 10.2L17.4 10.2A2.9 2.9 0 0 1 20.3 13.1L20.3 18.5A2.9 2.9 0 0 1 17.4 21.4L6.6 21.4A2.9 2.9 0 0 1 3.7 18.5L3.7 13.1Z',
    'M13.2 16.14A1.95 1.95 0 1 0 10.8 16.14A0.5 0.5 0 0 1 11.04 16.56L11.1 17.7A0.85 0.85 0 0 0 11.95 18.5L12.05 18.5A0.85 0.85 0 0 0 12.9 17.7L12.96 16.56A0.5 0.5 0 0 1 13.2 16.14Z'
  ],
  'unlock': [
    'M3.86 7.34A6 6 0 0 1 15.54 7.34A1.37 1.37 0 0 1 14.33 8.7L14.27 8.7A1.37 1.37 0 0 1 12.61 7.37A3.2 3.2 0 0 0 6.79 7.37A1.37 1.37 0 0 1 5.13 8.7L5.07 8.7A1.37 1.37 0 0 1 3.86 7.34Z',
    'M3.7 8.7L6.5 8.7L6.5 11.8L3.7 11.8L3.7 8.7Z',
    'M3.7 13.1A2.9 2.9 0 0 1 6.6 10.2L17.4 10.2A2.9 2.9 0 0 1 20.3 13.1L20.3 18.5A2.9 2.9 0 0 1 17.4 21.4L6.6 21.4A2.9 2.9 0 0 1 3.7 18.5L3.7 13.1Z',
    'M13.2 16.14A1.95 1.95 0 1 0 10.8 16.14A0.5 0.5 0 0 1 11.04 16.56L11.1 17.7A0.85 0.85 0 0 0 11.95 18.5L12.05 18.5A0.85 0.85 0 0 0 12.9 17.7L12.96 16.56A0.5 0.5 0 0 1 13.2 16.14Z'
  ],
  'star': [
    'M11.16 3.64A0.9 0.9 0 0 1 12.84 3.64L14.62 8.18A1 1 0 0 0 15.49 8.81L20.36 9.1A0.9 0.9 0 0 1 20.88 10.7L17.11 13.79A1 1 0 0 0 16.77 14.82L18 19.54A0.9 0.9 0 0 1 16.65 20.52L12.54 17.89A1 1 0 0 0 11.46 17.89L7.35 20.52A0.9 0.9 0 0 1 6 19.54L7.23 14.82A1 1 0 0 0 6.89 13.79L3.12 10.7A0.9 0.9 0 0 1 3.64 9.1L8.51 8.81A1 1 0 0 0 9.38 8.18L11.16 3.64Z'
  ],
  // The hollow star is the same star scaled about its centre. Every edge of a
  // regular star is equidistant from the centre, so a uniform scale IS a
  // uniform inset — here ≈1.75 units of rim.
  'star-empty': [
    'M11.16 3.64A0.9 0.9 0 0 1 12.84 3.64L14.62 8.18A1 1 0 0 0 15.49 8.81L20.36 9.1A0.9 0.9 0 0 1 20.88 10.7L17.11 13.79A1 1 0 0 0 16.77 14.82L18 19.54A0.9 0.9 0 0 1 16.65 20.52L12.54 17.89A1 1 0 0 0 11.46 17.89L7.35 20.52A0.9 0.9 0 0 1 6 19.54L7.23 14.82A1 1 0 0 0 6.89 13.79L3.12 10.7A0.9 0.9 0 0 1 3.64 9.1L8.51 8.81A1 1 0 0 0 9.38 8.18L11.16 3.64Z',
    'M10.81 10.56A0.55 0.55 0 0 1 10.33 10.91L8.36 11.03A0.5 0.5 0 0 0 8.07 11.91L9.6 13.17A0.55 0.55 0 0 1 9.78 13.73L9.29 15.64A0.5 0.5 0 0 0 10.04 16.19L11.7 15.13A0.55 0.55 0 0 1 12.3 15.13L13.96 16.19A0.5 0.5 0 0 0 14.71 15.64L14.22 13.73A0.55 0.55 0 0 1 14.4 13.17L15.93 11.91A0.5 0.5 0 0 0 15.64 11.03L13.67 10.91A0.55 0.55 0 0 1 13.19 10.56L12.47 8.72A0.5 0.5 0 0 0 11.53 8.72L10.81 10.56Z'
  ],
  'trophy': [
    'M7.97 11.59A4.2 4.2 0 1 1 9.38 3.55A0.83 0.83 0 0 1 9.63 4.64L9.61 4.67A0.83 0.83 0 0 1 8.39 5A2.5 2.5 0 1 0 7.52 9.89A0.83 0.83 0 0 1 8.56 10.62L8.57 10.65A0.83 0.83 0 0 1 7.97 11.59Z',
    'M14.62 3.55A4.2 4.2 0 1 1 16.03 11.59A0.83 0.83 0 0 1 15.43 10.65L15.44 10.62A0.83 0.83 0 0 1 16.48 9.89A2.5 2.5 0 1 0 15.61 5A0.83 0.83 0 0 1 14.39 4.67L14.37 4.64A0.83 0.83 0 0 1 14.62 3.55Z',
    'M6.44 5.29A1.7 1.7 0 0 1 8.04 3L15.96 3A1.7 1.7 0 0 1 17.56 5.29L14.51 13.55A1.3 1.3 0 0 1 13.29 14.4L10.71 14.4A1.3 1.3 0 0 1 9.49 13.55L6.44 5.29Z',
    'M10.4 14.7A0.9 0.9 0 0 1 11.3 13.8L12.7 13.8A0.9 0.9 0 0 1 13.6 14.7L13.6 17.1A0.9 0.9 0 0 1 12.7 18L11.3 18A0.9 0.9 0 0 1 10.4 17.1L10.4 14.7Z',
    'M7.18 18.35A1.4 1.4 0 0 1 8.5 17.4L15.5 17.4A1.4 1.4 0 0 1 16.82 18.35L17.15 19.3A1.44 1.44 0 0 1 15.79 21.2L8.21 21.2A1.44 1.44 0 0 1 6.85 19.3L7.18 18.35Z'
  ],
  'chart': [
    'M3.2 14.5A1.6 1.6 0 0 1 4.8 12.9L6.2 12.9A1.6 1.6 0 0 1 7.8 14.5L7.8 18.7A1.6 1.6 0 0 1 6.2 20.3L4.8 20.3A1.6 1.6 0 0 1 3.2 18.7L3.2 14.5Z',
    'M9.7 9.9A1.6 1.6 0 0 1 11.3 8.3L12.7 8.3A1.6 1.6 0 0 1 14.3 9.9L14.3 18.7A1.6 1.6 0 0 1 12.7 20.3L11.3 20.3A1.6 1.6 0 0 1 9.7 18.7L9.7 9.9Z',
    'M16.2 5.3A1.6 1.6 0 0 1 17.8 3.7L19.2 3.7A1.6 1.6 0 0 1 20.8 5.3L20.8 18.7A1.6 1.6 0 0 1 19.2 20.3L17.8 20.3A1.6 1.6 0 0 1 16.2 18.7L16.2 5.3Z'
  ],
  // Podium (middle tallest) against `chart`'s ascending bars, so the two bar
  // glyphs stay tellable apart at 16px.
  'leaderboard': [
    'M2.6 12A1.5 1.5 0 0 1 4.1 10.5L6.7 10.5A1.5 1.5 0 0 1 8.2 12L8.2 18.3A1.5 1.5 0 0 1 6.7 19.8L4.1 19.8A1.5 1.5 0 0 1 2.6 18.3L2.6 12Z',
    'M9.2 6.6A1.5 1.5 0 0 1 10.7 5.1L13.3 5.1A1.5 1.5 0 0 1 14.8 6.6L14.8 18.3A1.5 1.5 0 0 1 13.3 19.8L10.7 19.8A1.5 1.5 0 0 1 9.2 18.3L9.2 6.6Z',
    'M15.8 14.2A1.5 1.5 0 0 1 17.3 12.7L19.9 12.7A1.5 1.5 0 0 1 21.4 14.2L21.4 18.3A1.5 1.5 0 0 1 19.9 19.8L17.3 19.8A1.5 1.5 0 0 1 15.8 18.3L15.8 14.2Z'
  ],

  // ── Steppers / arrows ───────────────────────────────────────────────
  'plus': [
    'M9.95 5.2A1.6 1.6 0 0 1 11.55 3.6L12.45 3.6A1.6 1.6 0 0 1 14.05 5.2L14.05 9.05A0.9 0.9 0 0 0 14.95 9.95L18.8 9.95A1.6 1.6 0 0 1 20.4 11.55L20.4 12.45A1.6 1.6 0 0 1 18.8 14.05L14.95 14.05A0.9 0.9 0 0 0 14.05 14.95L14.05 18.8A1.6 1.6 0 0 1 12.45 20.4L11.55 20.4A1.6 1.6 0 0 1 9.95 18.8L9.95 14.95A0.9 0.9 0 0 0 9.05 14.05L5.2 14.05A1.6 1.6 0 0 1 3.6 12.45L3.6 11.55A1.6 1.6 0 0 1 5.2 9.95L9.05 9.95A0.9 0.9 0 0 0 9.95 9.05L9.95 5.2Z'
  ],
  'minus': [
    'M3.5 12A2.05 2.05 0 0 1 5.55 9.95L18.45 9.95A2.05 2.05 0 0 1 20.5 12A2.05 2.05 0 0 1 18.45 14.05L5.55 14.05A2.05 2.05 0 0 1 3.5 12Z'
  ],
  'left': [
    'M14.9 5.4A2 2 0 0 1 14.99 8.23L12.31 11.08A1.35 1.35 0 0 0 12.31 12.92L14.99 15.77A2 2 0 0 1 14.9 18.6A2 2 0 0 1 12.07 18.51L6.82 12.92A1.35 1.35 0 0 1 6.82 11.08L12.07 5.49A2 2 0 0 1 14.9 5.4Z'
  ],
  'right': [
    'M9.1 5.4A2 2 0 0 1 11.93 5.49L17.18 11.08A1.35 1.35 0 0 1 17.18 12.92L11.93 18.51A2 2 0 0 1 9.1 18.6A2 2 0 0 1 9.01 15.77L11.69 12.92A1.35 1.35 0 0 0 11.69 11.08L9.01 8.23A2 2 0 0 1 9.1 5.4Z'
  ],
  'up': [
    'M5.4 14.9A2 2 0 0 1 5.49 12.07L11.08 6.82A1.35 1.35 0 0 1 12.92 6.82L18.51 12.07A2 2 0 0 1 18.6 14.9A2 2 0 0 1 15.77 14.99L12.92 12.31A1.35 1.35 0 0 0 11.08 12.31L8.23 14.99A2 2 0 0 1 5.4 14.9Z'
  ],
  'down': [
    'M5.4 9.1A2 2 0 0 1 8.23 9.01L11.08 11.69A1.35 1.35 0 0 0 12.92 11.69L15.77 9.01A2 2 0 0 1 18.6 9.1A2 2 0 0 1 18.51 11.93L12.92 17.18A1.35 1.35 0 0 1 11.08 17.18L5.49 11.93A2 2 0 0 1 5.4 9.1Z'
  ],

  // ── Game nouns ──────────────────────────────────────────────────────
  // Disc, punched rim line, solid core — the rim is what stops it reading as a
  // plain dot next to `gem`.
  'coin': [
    'M2.15 12A9.85 9.85 0 1 1 21.85 12A9.85 9.85 0 1 1 2.15 12Z',
    'M3.5 12A8.5 8.5 0 1 0 20.5 12A8.5 8.5 0 1 0 3.5 12Z',
    'M4.45 12A7.55 7.55 0 1 1 19.55 12A7.55 7.55 0 1 1 4.45 12Z'
  ],
  'gem': [
    'M6.98 4.24A1.4 1.4 0 0 1 8.09 3.7L15.91 3.7A1.4 1.4 0 0 1 17.02 4.24L20.62 8.89A1.6 1.6 0 0 1 20.59 10.89L13.31 19.71A1.7 1.7 0 0 1 10.69 19.71L3.41 10.89A1.6 1.6 0 0 1 3.38 8.89L6.98 4.24Z'
  ],
  'heart': [
    'M3.88 12.04A5 5 0 1 1 12 6.33A5 5 0 1 1 20.12 12.04L12 21.1Z'
  ],
  'flask': [
    'M8.4 4.25A1.25 1.25 0 0 1 9.65 3L14.35 3A1.25 1.25 0 0 1 15.6 4.25L15.6 4.35A1.25 1.25 0 0 1 14.35 5.6L9.65 5.6A1.25 1.25 0 0 1 8.4 4.35L8.4 4.25Z',
    'M9.9 4.3A1 1 0 0 1 10.9 3.3L13.1 3.3A1 1 0 0 1 14.1 4.3L14.1 9.32A1.1 1.1 0 0 0 14.23 9.84L19.61 19.85A1.59 1.59 0 0 1 19.8 20.6A0.4 0.4 0 0 1 19.4 21L4.6 21A0.4 0.4 0 0 1 4.2 20.6A1.59 1.59 0 0 1 4.39 19.85L9.77 9.84A1.1 1.1 0 0 0 9.9 9.32L9.9 4.3Z'
  ],
  // Prize wheel: rim, three spokes across the full diameter, hub. The spokes are
  // drawn clockwise like the rim, so where they cross the rim's hole they fill
  // it back in rather than cancelling.
  'wheel': [
    'M2.1 12A9.9 9.9 0 1 1 21.9 12A9.9 9.9 0 1 1 2.1 12Z',
    'M5.1 12A6.9 6.9 0 1 0 18.9 12A6.9 6.9 0 1 0 5.1 12Z',
    'M2.3 12A1.3 1.3 0 0 1 3.6 10.7L20.4 10.7A1.3 1.3 0 0 1 21.7 12A1.3 1.3 0 0 1 20.4 13.3L3.6 13.3A1.3 1.3 0 0 1 2.3 12Z',
    'M7.15 3.6A1.3 1.3 0 0 1 8.93 4.08L17.33 18.62A1.3 1.3 0 0 1 16.85 20.4A1.3 1.3 0 0 1 15.07 19.92L6.67 5.38A1.3 1.3 0 0 1 7.15 3.6Z',
    'M16.85 3.6A1.3 1.3 0 0 1 17.33 5.38L8.93 19.92A1.3 1.3 0 0 1 7.15 20.4A1.3 1.3 0 0 1 6.67 18.62L15.07 4.08A1.3 1.3 0 0 1 16.85 3.6Z',
    'M9.3 12A2.7 2.7 0 1 1 14.7 12A2.7 2.7 0 1 1 9.3 12Z'
  ],
  // The ribbon is the gap between the four plates, not a punched line: a hole
  // that touched the outline would leak fill past the rounded corners.
  'gift': [
    'M5.22 6.91A3.6 2.1 -34 1 1 11.18 2.89A3.6 2.1 -34 1 1 5.22 6.91Z',
    'M12.82 2.89A3.6 2.1 34 1 1 18.78 6.91A3.6 2.1 34 1 1 12.82 2.89Z',
    'M2.6 8.7A1.4 1.4 0 0 1 4 7.3L9.4 7.3A1.4 1.4 0 0 1 10.8 8.7L10.8 9.8A1.4 1.4 0 0 1 9.4 11.2L4 11.2A1.4 1.4 0 0 1 2.6 9.8L2.6 8.7Z',
    'M13.2 8.7A1.4 1.4 0 0 1 14.6 7.3L20 7.3A1.4 1.4 0 0 1 21.4 8.7L21.4 9.8A1.4 1.4 0 0 1 20 11.2L14.6 11.2A1.4 1.4 0 0 1 13.2 9.8L13.2 8.7Z',
    'M4.2 13.6A1.6 1.6 0 0 1 5.8 12L9.2 12A1.6 1.6 0 0 1 10.8 13.6L10.8 19.8A1.6 1.6 0 0 1 9.2 21.4L5.8 21.4A1.6 1.6 0 0 1 4.2 19.8L4.2 13.6Z',
    'M13.2 13.6A1.6 1.6 0 0 1 14.8 12L18.2 12A1.6 1.6 0 0 1 19.8 13.6L19.8 19.8A1.6 1.6 0 0 1 18.2 21.4L14.8 21.4A1.6 1.6 0 0 1 13.2 19.8L13.2 13.6Z'
  ],
  'fullscreen': [
    'M2.7 4.4A1.7 1.7 0 0 1 4.4 2.7L8.8 2.7A1.5 1.5 0 0 1 10.3 4.2L10.3 4.4A1.5 1.5 0 0 1 8.8 5.9L6.9 5.9A1 1 0 0 0 5.9 6.9L5.9 8.8A1.5 1.5 0 0 1 4.4 10.3L4.2 10.3A1.5 1.5 0 0 1 2.7 8.8L2.7 4.4Z',
    'M21.3 8.8A1.5 1.5 0 0 1 19.8 10.3L19.6 10.3A1.5 1.5 0 0 1 18.1 8.8L18.1 6.9A1 1 0 0 0 17.1 5.9L15.2 5.9A1.5 1.5 0 0 1 13.7 4.4L13.7 4.2A1.5 1.5 0 0 1 15.2 2.7L19.6 2.7A1.7 1.7 0 0 1 21.3 4.4L21.3 8.8Z',
    'M2.7 15.2A1.5 1.5 0 0 1 4.2 13.7L4.4 13.7A1.5 1.5 0 0 1 5.9 15.2L5.9 17.1A1 1 0 0 0 6.9 18.1L8.8 18.1A1.5 1.5 0 0 1 10.3 19.6L10.3 19.8A1.5 1.5 0 0 1 8.8 21.3L4.4 21.3A1.7 1.7 0 0 1 2.7 19.6L2.7 15.2Z',
    'M21.3 19.6A1.7 1.7 0 0 1 19.6 21.3L15.2 21.3A1.5 1.5 0 0 1 13.7 19.8L13.7 19.6A1.5 1.5 0 0 1 15.2 18.1L17.1 18.1A1 1 0 0 0 18.1 17.1L18.1 15.2A1.5 1.5 0 0 1 19.6 13.7L19.8 13.7A1.5 1.5 0 0 1 21.3 15.2L21.3 19.6Z'
  ],
  // Nodes drawn over their connectors; both windings agree so the joins merge.
  'share': [
    'M5.8 12A1.25 1.25 0 0 1 6.29 10.3L16.5 4.71A1.25 1.25 0 0 1 18.2 5.2A1.25 1.25 0 0 1 17.71 6.9L7.5 12.49A1.25 1.25 0 0 1 5.8 12Z',
    'M5.8 12A1.25 1.25 0 0 1 7.5 11.51L17.71 17.1A1.25 1.25 0 0 1 18.2 18.8A1.25 1.25 0 0 1 16.5 19.29L6.29 13.7A1.25 1.25 0 0 1 5.8 12Z',
    'M15.25 5.2A2.95 2.95 0 1 1 21.15 5.2A2.95 2.95 0 1 1 15.25 5.2Z',
    'M2.85 12A2.95 2.95 0 1 1 8.75 12A2.95 2.95 0 1 1 2.85 12Z',
    'M15.25 18.8A2.95 2.95 0 1 1 21.15 18.8A2.95 2.95 0 1 1 15.25 18.8Z'
  ],

  // ── Survivalist's own run nouns ───────────────────────────────────────────
  //
  // Lifted VERBATIM out of `RunHud.vue` and `UpgradeModal.vue`, where the same
  // three shapes lived twice as copy-pasted `d` strings. They are the five
  // numbers this game reports — squad size, damage, fire rate, reach, streak —
  // plus the skull that marks the end of a stage.
  //
  // They are drawn lighter than the 44 above (the clock ring is ~2 units, the
  // reach rails 1.6) because they are read at HUD size in a coloured chip on a
  // dark plate, not knocked out white on saturated plastic. That is the one
  // context where a thin limb survives — so do NOT promote them onto a gold
  // button without thickening them first.

  // A CROWD, not a person: three head-and-shoulder silhouettes, the front one
  // biggest and lowest, the two behind it smaller and higher, with a gutter of
  // empty plate between every pair of shapes.
  //
  // It used to be two figures and the shoulder of a third, and it read as "a
  // person": four of five first-time players could not say what the chip it
  // fronts was counting. That is the same finding that deleted the other three
  // stat chips, and this is the half of the fix that had to be drawn rather
  // than removed — see `RunHud.vue`.
  //
  // Every gutter is at least 1.4 units wide, and that number is the whole trick.
  // The HUD chip draws this at 14–20 px, where one unit is well under a physical
  // pixel: the 0.6-unit gap the old drawing left between its front body and its
  // back shoulder closed completely at that size and fused the two into one
  // blob, which is exactly how a crowd glyph ends up reading as a single torso.
  // Under about a pixel at 16 px it is not a gap, it is a smudge.
  //
  // Nothing overlaps anything, so unlike the old glyph there is no winding to
  // reason about — nonzero cannot cancel a shape against one it never touches,
  // whichever way round each was drawn. The weight is held close to the drawing
  // it replaces (the two figures behind are thin crescents, and the lead figure
  // is a shade smaller than the old one) because this glyph also fronts a shop
  // row in `UpgradeModal.vue` beside `bolt`, `rate` and `range` — the note above
  // about redrawing the five together is why the other four are untouched.
  //
  // ── Redrawn again once the chip grew ──
  //
  // The version above this one gave the two figures BEHIND the leader thin
  // side-crescents — enough to say "there are more of them" at 16 px, and the
  // most that fitted while four chips shared the row. The row is one chip now
  // and it is drawn half again as large, so the crescents became the weak part
  // of the drawing: at 23 px they read as bracket marks around a person rather
  // than as two more people.
  //
  // They are whole figures now, each with its own head and its own shoulder
  // line, and the leader sits lower and larger so the three heads land on three
  // different lines. That stagger is what makes it a group rather than a row.
  // Gutters are still at or above 1.4 units everywhere, for the reason in the
  // note above, and nothing overlaps — so there is still no winding to reason
  // about.
  'squad': [
    // The pair behind, mirrored about the middle so the glyph balances in a chip
    // that has nothing else left in it to lean against.
    'M4.9 3.6a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z',
    'M4.9 10.1c1.1 0 2.1.25 2.9.72-1.3 1.15-2.1 2.72-2.1 4.58v.6H.9v-.6c0-3.0 1.75-5.3 4-5.3Z',
    'M19.1 3.6a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z',
    'M19.1 10.1c-1.1 0-2.1.25-2.9.72 1.3 1.15 2.1 2.72 2.1 4.58v.6h3.8v-.6c0-3.0-1.75-5.3-4-5.3Z',
    // The leader: biggest, lowest, drawn last so it is the shape the eye lands on.
    'M12 7.1a3.35 3.35 0 1 1 0 6.7 3.35 3.35 0 0 1 0-6.7Z',
    'M12 15.1c3.3 0 5.9 2.25 5.9 5.6v1.7H6.1v-1.7c0-3.35 2.6-5.6 5.9-5.6Z'
  ],
  // Damage. One polygon, no holes — the classic bolt reads at any size.
  'bolt': [
    'M13 2 4 14h6l-1 8 9-12h-6l1-8Z'
  ],
  // Fire rate: a clock whose ring is open at the top right, so it cannot be
  // mistaken for `coin` in the same chip row.
  //
  // Ring 2.8 units (was 2.0) and hand 1.75–2.0 (was 1.0–1.35). The contact sheet
  // is what caught it: at 16px the old ring greyed into its background and the
  // hand vanished entirely, leaving a bare "C" in the HUD chip that reads as a
  // moon. The hand's tip and root are both kept clear of the ring's inner edge —
  // under nonzero winding a limb that crosses the band either fuses with it or
  // punches a hole through it, depending on which way round it was drawn.
  'rate': [
    'M12 3a9 9 0 1 0 9 9h-2.8a6.2 6.2 0 1 1-6.2-6.2V3Zm.4 3.6v5.75l4.4 2.25.9-1.8-3.55-1.82V6.6h-1.75Z'
  ],
  // Reach: an arrow flying UP the lane between two rails — literally what the
  // upgrade buys. A crosshair would read as accuracy, which this is not.
  //
  // Rails 2.6 units (was 1.6), for the same reason as `rate`: at 16px a 1.6-unit
  // rail is one physical pixel, and it either aliased away or crawled.
  'range': [
    'M3.4 3H6v18H3.4zM18 3h2.6v18H18z',
    'M12 2.6 8.4 7.2h2.4v9.1H9l3 4.6 3-4.6h-1.8V7.2h2.4L12 2.6Z'
  ],
  // Win streak. Kept clearly wider at the base than `bolt` is anywhere, since
  // the two can share a HUD row.
  // ── Active skills ──
  // A round bomb with a lit fuse. Solid body, fuse wound clockwise into it so it
  // reads as one shape, and a spark at the tip that survives being 16px tall.
  'bomb': [
    'M10.5 21a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z',
    'M15.2 8.2c-.5-.6-1.1-1.1-1.8-1.5l1.1-1.6c.9-1.3 2.5-1.8 3.9-1.2l.6.3-.8 1.8-.6-.3c-.6-.3-1.3-.1-1.7.5l-.7 1Z',
    'M19.4 2.6l1.9-.6-.6 1.9 1.9.6-1.9.6.6 1.9-1.9-.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6-.6-1.9 1.8.6Z'
  ],
  // A heater shield with a raised boss. The centre band is wound the other way
  // so it punches through rather than sitting on top as a second fill.
  'shield': [
    'M12 2 4 5v6.5c0 4.6 3.2 8.4 8 10.5 4.8-2.1 8-5.9 8-10.5V5l-8-3Z',
    'M12 6.6 8 8.1v3.6c0 2.6 1.6 4.8 4 6.1 2.4-1.3 4-3.5 4-6.1V8.1l-4-1.5Z'
  ],
  // Frost Nova: a six-armed ice crystal. A hexagonal hub, six pointed arms and a
  // V of spurs on each, every sub-path wound the same way so the overlaps merge
  // under nonzero rather than punching holes. Bold on purpose: 2.3-unit arms
  // survive being 16 px tall, where a true snowflake's filigree turns to fuzz.
  'snowflake': [
    'M12 8.9L14.68 10.45L14.68 13.55L12 15.1L9.32 13.55L9.32 10.45Z',
    'M10.85 10.5L10.85 2.7L12 1.1L13.15 2.7L13.15 10.5Z',
    'M11.61 7.29L9.01 5.43L8.83 4.13L10.11 3.88L12.72 5.74Z',
    'M11.28 5.74L13.89 3.88L15.17 4.13L14.99 5.43L12.39 7.29Z',
    'M12.72 10.25L19.48 6.35L21.44 6.55L20.63 8.35L13.87 12.25Z',
    'M15.88 9.31L16.2 6.12L17.23 5.32L18.09 6.31L17.78 9.49Z',
    'M17.06 8.25L19.97 9.58L20.4 10.81L19.19 11.31L16.27 9.98Z',
    'M13.87 11.75L20.63 15.65L21.44 17.45L19.48 17.65L12.72 13.75Z',
    'M16.27 14.02L19.19 12.69L20.4 13.19L19.97 14.42L17.06 15.75Z',
    'M17.78 14.51L18.09 17.69L17.23 18.68L16.2 17.88L15.88 14.69Z',
    'M13.15 13.5L13.15 21.3L12 22.9L10.85 21.3L10.85 13.5Z',
    'M12.39 16.71L14.99 18.57L15.17 19.87L13.89 20.12L11.28 18.26Z',
    'M12.72 18.26L10.11 20.12L8.83 19.87L9.01 18.57L11.61 16.71Z',
    'M11.28 13.75L4.52 17.65L2.56 17.45L3.37 15.65L10.13 11.75Z',
    'M8.12 14.69L7.8 17.88L6.77 18.68L5.91 17.69L6.22 14.51Z',
    'M6.94 15.75L4.03 14.42L3.6 13.19L4.81 12.69L7.73 14.02Z',
    'M10.13 12.25L3.37 8.35L2.56 6.55L4.52 6.35L11.28 10.25Z',
    'M7.73 9.98L4.81 11.31L3.6 10.81L4.03 9.58L6.94 8.25Z',
    'M6.22 9.49L5.91 6.31L6.77 5.32L7.8 6.12L8.12 9.31Z'
  ],
  // Decoy Flare: a flare stick held up and to the right, its end a starburst,
  // two sparks thrown clear. Tilted rather than upright because an upright stick
  // with a flame on it is a candle; the burst is wound WITH the stick so the
  // neck where they meet stays solid.
  'flare': [
    'M9.04 11.38L10.03 11.14L12.59 13.13L12.59 14.15L5.8 22.55L3.92 21.59L2.54 20Z',
    'M13.38 5.4L13.45 9.12L15.87 8.32L14.27 10.31L17.73 11.68L14.01 11.74L14.81 14.17L12.82 12.57L11.45 16.03L11.39 12.31L8.96 13.1L10.56 11.12L7.1 9.75L10.82 9.68L10.03 7.26L12.02 8.86Z',
    'M19.6 12.5L20.01 13.79L21.3 14.2L20.01 14.61L19.6 15.9L19.19 14.61L17.9 14.2L19.19 13.79Z',
    'M6.4 2.3L6.76 3.44L7.9 3.8L6.76 4.16L6.4 5.3L6.04 4.16L4.9 3.8L6.04 3.44Z'
  ],
  'flame': [
    'M12 2c1.5 3.5.5 5.5-1 7-1.7 1.7-3 3.2-3 5.5A5.5 5.5 0 0 0 13.5 20 5.5 5.5 0 0 0 19 14.5c0-3.5-2.5-5-3.5-7.5-.6 1-1.3 1.6-2 2 .3-2.4-.6-4.9-1.5-7Z'
  ],
  // Kills / the boss marker. Eyes are wound against the cranium, so they punch
  // through it rather than sitting on it as a second fill.
  'skull': [
    'M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7Zm-3 8.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM9 20h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1Z'
  ],

  // ── The two weapons ────────────────────────────────────────────────
  // Drawn to be told apart in the corner of the eye at 16px, which rules out
  // detail: one is a POINTED vertical mass, the other a BLUNT bundle of three.
  // They are the same silhouettes `weaponGlyph` paints on the road, so the box
  // the player shoots and the badge that appears afterwards are one object.
  //
  // A shell with swept fins and a flame under it. The flame is a separate
  // sub-path wound the same way, so it merges into the body rather than
  // outlining against it.
  // The incoming-attack alarm: a hazard triangle with the bang punched through
  // it. Bar and dot are wound counter-clockwise against the triangle's
  // clockwise outline — holes, not a second fill on top of it.
  'warning': [
    'M12 2.6 22.2 20.4H1.8Z',
    'M10.9 8.6v6.4h2.2V8.6Z',
    'M12 16.35a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 1 0 0-2.5Z'
  ],

  'rocket': [
    'M12 1.6c2.3 2.2 3.5 5 3.5 8.2v4.5h-7V9.8c0-3.2 1.2-6 3.5-8.2Zm0 4.2a1.7 1.7 0 0 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z',
    'M8.5 11.4 5.2 15a2 2 0 0 0-.5 1.3v2.1l3.8-2.2v-4.8Zm7 0 3.3 3.6a2 2 0 0 1 .5 1.3v2.1l-3.8-2.2v-4.8Z',
    'M10.2 16.2h3.6l-1.8 6-1.8-6Z'
  ],
  // Three barrels over a receiver, with a crank on the side. The barrels are
  // one contour with two counter-wound slots between them, so the bundle reads
  // as three tubes rather than as one slab at any size.
  'gatling': [
    'M4.6 4.2h14.8v9.2H4.6V4.2Zm4.1 1.6H6.9v6h1.8v-6Zm6.6 0h-1.8v6h1.8v-6Z',
    'M3 14.6h18a1.4 1.4 0 0 1 1.4 1.4v1.6A1.4 1.4 0 0 1 21 19H3a1.4 1.4 0 0 1-1.4-1.4V16A1.4 1.4 0 0 1 3 14.6Z',
    'M9.4 19.8h5.2v2.6H9.4v-2.6Z'  ],
  // A short, fat barrel over a flared muzzle, with three pellets fanning out of
  // it. The fan is the whole read: this is the gun whose rounds go WIDE.
  'grapeshot': [
    'M5.6 5.2h9.2a1.3 1.3 0 0 1 1.3 1.3v4a1.3 1.3 0 0 1-1.3 1.3H5.6a1.3 1.3 0 0 1-1.3-1.3v-4a1.3 1.3 0 0 1 1.3-1.3Z',
    'M16.1 4.1 20.4 6a1.2 1.2 0 0 1 .7 1.1v2.8a1.2 1.2 0 0 1-.7 1.1l-4.3 1.9V4.1Z',
    'M7 13.4l-2.4 5.2 2.3 1 2.4-5.2-2.3-1Zm4.9 0h2.5l.4 6.1h-2.5l-.4-6.1Zm5.1-.5 2.4 5.2-2.3 1.1-2.4-5.3 2.3-1Z'
  ],
  // A coil: two plates with a wound core between them and a bolt leaving the
  // top one. Reads as "stored, then released" rather than as a plain battery.
  'dynamo': [
    'M4.8 3.4h14.4v2.4H4.8V3.4Zm0 14.4h14.4v2.4H4.8v-2.4Z',
    'M8.4 6.6h7.2v1.5H8.4V6.6Zm0 3.1h7.2v1.5H8.4V9.7Zm0 3.1h7.2v1.5H8.4v-1.5Z',
    'M13.3 0.4 9.1 5.9h2.6l-1.2 4.2 4.4-5.6h-2.7l1.1-4.1Z'
  ],
  // A skull rising out of a broken grave slab. The slab's crack is what says
  // "it came back up" rather than "here is a skull".
  'gravecall': [
    'M12 3.2a4.6 4.6 0 0 1 4.6 4.6v2.6a1.5 1.5 0 0 1-1.5 1.5h-.9l-.5 1.6h-3.4l-.5-1.6h-.9a1.5 1.5 0 0 1-1.5-1.5V7.8A4.6 4.6 0 0 1 12 3.2Zm-1.8 4.3a1.1 1.1 0 0 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.6 0a1.1 1.1 0 0 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z',
    'M3.4 15.2h7.1l-1 2.3 1.5 3.1H3.4v-5.4Zm10.1 0h7.1v5.4h-5.6l1.5-3.1-1-2.3Z'
  ],
  // A coin stack with a crow's beak-and-eye over it: the hoard, and what is
  // guarding it.
  'hoard': [
    'M12 12.6c3.9 0 7-1.1 7-2.4S15.9 7.8 12 7.8 5 8.9 5 10.2s3.1 2.4 7 2.4Z',
    'M5 12.4c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4v2.3c0 1.3-3.1 2.4-7 2.4s-7-1.1-7-2.4v-2.3Zm0 4.5c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4v2.2c0 1.3-3.1 2.4-7 2.4s-7-1.1-7-2.4v-2.2Z',
    'M9.6 2.4a3.4 3.4 0 0 1 3.3 2.6l3.9 1.2-3.8 1a3.4 3.4 0 1 1-3.4-4.8Zm-.5 1.7a1 1 0 0 0 0 2 1 1 0 0 0 0-2Z'
  ]
}
