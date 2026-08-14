# Art todo — drop-in manifest

Survivalist draws **everything** from code: the survivors and the monster cast
are hand-inked vector art baked to frame strips at runtime, and the lane, gates,
crates and effects are Canvas 2D. Nothing below is required for the game to
ship — each entry is an *optional upgrade* that replaces a procedural drawing
with a bitmap, with **no code change**: drop the file at the exact path and the
renderer picks it up on the next load. A missing or still-decoding file always
falls back to the drawing.

Format for everything: **WebP**, sRGB, premultiplied alpha, trimmed to the
subject with no padding.

## Already wired (drop a file to replace)

| Path | Size | Subject | Current fallback | Notes |
| --- | --- | --- | --- | --- |
| `public/images/props/box_256x256.webp` | 256² | Supply crate | Procedural planks + iron corners | **Shipping today.** Square, flat-on view. The green "+DMG" chevron badge and the damage cracks are drawn on top in code — leave the centre of the crate readable. |
| `public/images/props/stone_256x256.webp` | 256² | Barricade block | Procedural stone + hazard chevrons | **Shipping today.** Tiled horizontally across a block up to 3 units wide, so it must tile seamlessly left↔right. HP bar and number draw on top. |
| `public/images/props/coin_128x128.webp` | 128² | Coin pickup | Procedural gold ellipse | **Shipping today.** Drawn face-on and squashed on X to spin — a face-on coin reads best. |

## High value, not yet wired (≈ 1 h of code each)

| Path | Size | Subject | Why it would help |
| --- | --- | --- | --- |
| `public/images/props/gate-frame.webp` | 512×256 | Gate leaf frame (posts + curtain) | The gate is the thing the player stares at. A painted frame with real metal and a glass curtain would lift the whole screen. The number plate and value must stay code-drawn (it animates). |
| `public/images/bg/lane-tile.webp` | 256² | Road surface tile | Must tile vertically AND horizontally. Replaces the baked gravel tile in `useSurvivalArt.buildLaneTile`. |
| `public/images/bg/ridge-far.webp` | 1024×256 | Far parallax ridge silhouette | Replaces the procedural sine-ridge. Pure silhouette, alpha only — it is tinted per stage in code. |
| `public/images/bg/ridge-near.webp` | 1024×256 | Near parallax dune band | As above, drawn at 0.42 parallax. |
| `public/images/props/cage.webp` | 256² | Rescue cage | Only needed if roadmap item #8 (rescue cages) is built. |

## Drawn, and worth knowing about before you replace anything

| element | note |
| --- | --- |
| Gate leaf | Three tints keyed off the op: cyan `+N`, magenta `×N`, hostile red `÷N` (barred frame, chevrons flowing the wrong way, plate tilted). A bank is two or three of them. |
| Number plate | Sized from the GLYPHS first and the doorway second — a `×12` on a three-leaf bank's 1.33-wide door has to stay legible at 320 px. |
| Divider pillar | Hazard-striped, with a warning glow that scales with how badly the crowd is aimed at it. Capped so two pillars can never light the door between them. |
| Dismissal | The whole teardown is procedural: shockwave ring, rim light, curtain collapse, plate cracking into two tumbling halves carrying half a glyph each, posts shearing at the road. Roughly 450 ms, cascading outward from the door that was taken. |
| Funnel | The crowd compresses to fit its door; the renderer sells it with a pooled contact shadow, tightened per-body patches, an inward lean and flank dust. |
| Boss guard | A pulsing hexagonal barrier drawn under the boss at 66 % and 33 % health, with cold ricochet sparks where the player's rounds land on it. Two arcs and a fill — no gradient, no shadow, because it runs every frame of the busiest moment in the game. Replacing it with a bitmap would cost the pulse. |
| Rewarded-ad mark | `public/images/icons/movie_128x96.webp`, prepended to every rewarded button — the cross-portal signal that a video follows the click, which is what lets the button avoid the word "ad". Probed once per tab; a hand-drawn film clapper (inline SVG in `RewardAdIcon.vue`) renders when the file is absent, at the same 4:3 box so the label never reflows when the art lands. |
| Slam telegraph | Closing ring plus ground cracks, drawn from the SAME radius the kill is measured against — the boss's reach grows with every swing it throws, and a telegraph that stayed one size would be a lie the player only discovers by dying to it. |
| Sweep telegraph | Deliberately **not** the boss's ring. The elite's arc crosses the whole lane, so it is drawn as an amber **band** spanning the road, from its feet back the exact distance the kill reaches, with one bright edge travelling across it in the direction the arc will swing. Nothing in it suggests a gap to stand in, because there is not one — a ring here would teach a dodge that gets the squad killed. It has 0.3 s to be understood, hence a filled band rather than an outline. Drawn UNDER the bodies and then a **second** time over the crowd (outline-only, same band, same reach): a pinned crowd is 1.65 units of packed survivors sitting exactly where the warning is. Keep both passes, and never widen one to stay visible. |

## Deliberately NOT bitmaps

* **Survivors** — baked from `src/game/heroSprites.ts` (14 frames × 3 outfits,
  96 px). Replacing them with a sprite sheet would cost the outfit tinting and
  the resolution independence, and would need a 14-frame back-view run cycle to
  match. If you do want to: bake the strip yourself and swap `survivorFrame()`.
* **Monsters** — the 13-design cast in `src/game/monsters.ts`, baked by
  `monsterSprites.ts`. Same reasoning; the design bench at `/#/monsters` renders
  them at any size for promo art.
* **Bosses** — the same cast at 2.5× scale.
* **Particles, tracers, muzzle flashes, the gate curtain, the vignette** — all
  additive Canvas work that a bitmap would only make heavier.

## Promo art still needed for store listings

| Path | Size | Notes |
| --- | --- | --- |
| `src/assets/promotion/cover_1080x1920.webp` | 1080×1920 | Portrait key art: a big crowd mid-gate-pass, the `+12` plate blown out. |
| `src/assets/promotion/cover_1920x1080.webp` | 1920×1080 | Landscape variant of the same moment. |
| `src/assets/promotion/cover_800x800.webp` | 800² | Square icon-ish crop — crowd + one gate. |
| `public/images/logo/logo_512x512.png` | 512² | Currently the previous project's logo — **needs replacing**. |
| `public/favicon.ico` | 48² | Same. |
