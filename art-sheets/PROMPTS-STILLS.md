# Still prompts — one object per generation

Generated from the manifest — do not hand-edit, re-export instead.

Attach `art-sheets/still-<kind>-<id>.png` and paste the matching block
beside it. There is no grid to preserve here, which is the whole point.
A block whose heading names two images (the cages) wants both, in that
order: the character model first, then the reference.

Drop results in `art-sheets/painted/`, keeping the `still-<kind>-<id>` in
the name, then run `pnpm slice-sheets`. Every return is measured against
its reference and normalised onto it.
Each prompt is a fenced block — the preview's copy button takes all of it —
and `pnpm art:desk` can run the whole loop from these blocks.

## Supply crate (damage)  (still-prop-crate-damage.png → images/props/crate-damage.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A supply crate: a square iron-banded strongbox of dark oak planks with riveted black-iron corners and a faint sickly-GREEN painted seal or band on its face. Square and flat-on.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints a green chevron badge, a glowing rim and an HP number over the middle of the face, so keep the CENTRE plain and readable and put the detail at the edges.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Supply crate (rate)  (still-prop-crate-rate.png → images/props/crate-rate.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A supply crate: a square iron-banded strongbox of dark oak planks with riveted black-iron corners and a cold BLUE painted seal or band on its face. Square and flat-on. Its sibling is the same crate banded green, and the two must be tellable apart by the colour of the band alone.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints a blue bolt badge, a glowing rim and an HP number over the middle of the face, so keep the CENTRE plain and readable and put the detail at the edges.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Barricade block  (still-prop-barricade.png → images/props/barricade.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A barricade block: a rough wall of mortared dark stone with bone and rusted iron scraps set into it, seen flat-on. Fully opaque, edge to edge.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints hazard chevrons, a damage bar and an HP number over it, so keep it mid-tone and quiet — texture, not objects.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND: none. This image is FULLY OPAQUE from edge to edge — no
transparency, no checkerboard, no magenta anywhere.

SEAMLESSLY TILEABLE, HORIZONTALLY. This image is repeated end to end, so
the right edge must join the left edge with no visible seam, no matching
feature straddling the join, and no vignette or fade at either side. It
does NOT need to tile vertically.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Boulder (1 of 3)  (still-prop-boulder-1.png → images/props/boulder-1.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: An unbreakable boulder: one heavy irregular lump of dark grey rock, squat and wide, cracked, with a lit crown edge upper-left and deep shadow lower-right. NO metal, NO number, NO glow, nothing that could be read as a meter — the absence of a number IS the mechanic. Fills most of the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Boulder (2 of 3)  (still-prop-boulder-2.png → images/props/boulder-2.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: An unbreakable boulder: one heavy irregular lump of dark grey rock, taller than it is wide with a split down one side, cracked, with a lit crown edge upper-left and deep shadow lower-right. NO metal, NO number, NO glow, nothing that could be read as a meter. Fills most of the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Boulder (3 of 3)  (still-prop-boulder-3.png → images/props/boulder-3.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: An unbreakable boulder: one heavy irregular lump of dark grey rock, rounded with a flat top, cracked, with a lit crown edge upper-left and deep shadow lower-right. NO metal, NO number, NO glow, nothing that could be read as a meter. Fills most of the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Powder keg  (still-prop-barrel.png → images/props/barrel.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A powder keg: a dark riveted black-iron drum standing upright, four fifths as wide as it is tall, with two dull dried-blood-red bands and a crude skull-and-fuse stencil on its face. Intact state only. Centred, the drum filling the frame's full height.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints the damage cracks and the lit strobe over it, so paint it whole and unlit.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Divider pillar  (still-prop-pillar.png → images/props/pillar.webp)

```text
Paint ONE game sprite in a single portrait, 1:2.22 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A divider pillar: a tall iron post with heavy steel caps top and bottom, its body striped in diagonal black and dull-yellow hazard chevrons, scarred and rusted, seen straight on. Upright, filling the frame's full height, the caps a little wider than the shaft.

LEAVE OUT WHAT THE GAME PAINTS LIVE. NO lamp on top and NO glow — the beacon and the red warning are painted live.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 288 x 640 pixels — portrait, 1:2.22.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Coin  (still-prop-coin.png → images/props/coin.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A coin pickup: a face-on tarnished gold coin with a grim skull or sigil embossed and a worn, notched edge. It must be round and face-on — the game spins it by squashing it sideways. Fills the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Weapon case (shut)  (still-prop-weapon-box.png → images/props/weapon-box.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A weapon case, shut and dead: a square armoured strongbox of cold grey gun-steel, flat-on, its face a heavy riveted plate recessed inside a thick bevelled frame, with dark sealed seams and scuffed dull-blue paint. NOTHING glows, nothing is warm — it is inert metal, and that is the read. Square and flat-on, filling the frame.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints the weapon glyph and a heavy cross-brace over the middle of the face, so keep the CENTRE plain, flat and mid-tone and put the detail — rivets, bevels, scuffs — around the edges.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Weapon case (open)  (still-prop-weapon-box-open.png → images/props/weapon-box-open.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The same square armoured strongbox, now UNSEALED and lit from within: the dark steel is banded and edged in hot brass and worn gold, its seams cracked open with warm amber light spilling out, the recessed face plate glowing a rich lamp-gold. Read as a PRIZE across a whole screen — warm, bright, obviously changed from the cold shut one. Square and flat-on, filling the frame.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints the weapon glyph in near-black over the middle of the face, plus damage cracks, a pulsing halo and an expanding ring, so keep the CENTRE plain, bright and readable and put the detail around the edges.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Weapon-case armour plate  (still-prop-guard-plate.png → images/props/guard-plate.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A bolted-on armour plate: a slab of riveted grey-blue battleship steel seen flat-on, its face crossed by two rows of heavy dome rivets, scuffed and streaked with rust runs from the rivet heads. Two of these stand EDGE TO EDGE over the case they protect, so the left and right edges are clean vertical panel edges — a plate, not a crate. Square-ish and flat-on, filling the frame.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game darkens and reddens the whole plate as it is shot and flashes it white on every hit, so paint it INTACT and evenly lit — no cracks, no holes, no damage of its own.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Lever housing  (still-prop-lever-post.png → images/props/lever-post.webp)

```text
Paint ONE game sprite in a single landscape, 2:1 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The housing of a road-side lever: a low, wide iron footing bolted flat to the ground, seen straight on — a squat rusted-steel box with a heavy bevelled lid, four corner bolts and a dark slot across its top where the arm comes out. Low and wide, twice as wide as it is tall, filling the frame.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The ARM is a separate painting that swings out of the slot, so paint the housing alone — no arm, no handle, nothing standing up out of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 256 pixels — landscape, 2:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Lever arm  (still-prop-lever-arm.png → images/props/lever-arm.webp)

```text
Paint ONE game sprite in a single portrait, 9:16 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The arm of a road-side lever, standing straight UP: a stout iron rod with a wrapped grip, rising from the bottom edge of the frame, and at its top an EMPTY round socket — an open iron ring or claw with nothing in it. The socket must be a hole, not a ball: the game lights a glowing orb inside it. Centred, the rod filling the frame's full height, the socket at the very top.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The knob is painted live INSIDE the socket — red while the lever is live, green once it is pulled — so leave the socket open and unlit.

DRAW IT AT REST, standing UP: the pivot at the bottom edge, the socket at the top. The game swings it over as the lever is pulled. Do not add motion blur, speed lines or
a second copy of it: the game turns and moves it out of this one picture.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Its bottom edge must land at the same height from the bottom of the
  frame as the reference has it — the game registers the return by it.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 288 x 512 pixels — portrait, 9:16.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Rescue cage (roadside)  (models/survivors.png + still-prop-cage.png → images/props/cage.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
Two images come with this prompt, in this order:
  IMAGE 1 — `models/survivors.png` — THE PEOPLE: the three survivors exactly as the game shows them. Take
     their look from it — hoods, coats, packs, colours, proportions — and not
     their running poses; inside the cage they stand still.
  IMAGE 2 — `still-prop-cage.png` — THE REFERENCE: the game's own drawing of this
     sprite. It is exactly what to paint, at exactly the size and position it
     is drawn at. Match both.

WHAT IT IS: A prisoner cage standing on the ground, seen STRAIGHT ON from the front, flat-on like a crate: a TALL box, a little taller than it is wide, with a heavy flat iron LID across the top that overhangs the bars slightly — a hard, level shelf, the top edge of the whole silhouette — a bottom rail standing on the ground, a post at each side, and FOUR vertical iron bars across the front with clear open gaps between them. It is lit from WITHIN by a lantern hanging at the BACK of the cage, and THE LAMPLIGHT IS THE ONE HOT ACCENT OF THIS IMAGE: a rich warm amber, around #E0902E and brighter toward the lamp, filling the space behind the bars, bright enough to name at a glance from across a phone screen. The BACK and the SIDES of the cage are closed with dark iron sheet, exactly as the reference fills its whole inside: nothing behind the prisoners is see-through, and no background colour shows anywhere inside the frame — light spilling over magenta turns pink, and a pink cage is a failed image. The style rule about desaturated low-key colour applies to the iron and the people — NOT to the light. The iron is cold, dark and dead: gunmetal grey-blue with rust, no paint, no colour of its own. A cage that has gone dark, grey or brown inside is a failed image. INSIDE are the prisoners, and they are the survivors from IMAGE 1 — the same people: pointed hoods up, ragged coats in faded teal, ochre and slate, battered packs. They are seen FROM BEHIND exactly as image 1 shows them, turned away from the viewer toward the lamp at the back, so they read as dark hooded silhouettes against the amber light with only a thin rim of lamplight along their hoods and shoulders. NO FACES — this game never draws a survivor's face. They are not running: they stand and huddle, pressed together, and one of them has a hand up on a bar. Big simple shapes — at play size the whole cage is about 40 px tall, so each person is a hood and a pair of shoulders, not a portrait. THIS ONE is the ROADSIDE cage — the one the crowd shoots open — and it has to look like it can be: the smallest and cheapest of the set, rickety and patched. Thin rusted bars, one of them bent outward a little; crude hammered rivets; a dented lid with a rust-eaten edge; a length of frayed rope lashed round one post where it was mended. TWO OR THREE prisoners inside, huddled low. Keep the silhouette the reference draws — a tall barred box under a flat lid, filling the frame from the top of the lid to the bottom rail — and keep every part of it inside that box: nothing hangs off the sides, nothing stands up on the lid, nothing lies on the ground around it.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints the lamp's soft halo around the cage, a white "+N" count above the lid and a hit-point number under the bottom rail, and it shakes and leans the whole cage when it is shot — so paint NO glow outside the bars, NO numbers, NO text, and paint the cage INTACT, upright and still.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Its bottom edge must land at the same height from the bottom of the
  frame as the reference has it — the game registers the return by it.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Rescue cage (sealed, beside a miniboss)  (models/survivors.png + still-prop-cage-sealed.png → images/props/cage-sealed.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
Two images come with this prompt, in this order:
  IMAGE 1 — `models/survivors.png` — THE PEOPLE: the three survivors exactly as the game shows them. Take
     their look from it — hoods, coats, packs, colours, proportions — and not
     their running poses; inside the cage they stand still.
  IMAGE 2 — `still-prop-cage-sealed.png` — THE REFERENCE: the game's own drawing of this
     sprite. It is exactly what to paint, at exactly the size and position it
     is drawn at. Match both.

WHAT IT IS: A prisoner cage standing on the ground, seen STRAIGHT ON from the front, flat-on like a crate: a TALL box, a little taller than it is wide, with a heavy flat iron LID across the top that overhangs the bars slightly — a hard, level shelf, the top edge of the whole silhouette — a bottom rail standing on the ground, a post at each side, and FOUR vertical iron bars across the front with clear open gaps between them. It is lit from WITHIN by a lantern hanging at the BACK of the cage, and THE LAMPLIGHT IS THE ONE HOT ACCENT OF THIS IMAGE: a rich warm amber, around #E0902E and brighter toward the lamp, filling the space behind the bars, bright enough to name at a glance from across a phone screen. The BACK and the SIDES of the cage are closed with dark iron sheet, exactly as the reference fills its whole inside: nothing behind the prisoners is see-through, and no background colour shows anywhere inside the frame — light spilling over magenta turns pink, and a pink cage is a failed image. The style rule about desaturated low-key colour applies to the iron and the people — NOT to the light. The iron is cold, dark and dead: gunmetal grey-blue with rust, no paint, no colour of its own. A cage that has gone dark, grey or brown inside is a failed image. INSIDE are the prisoners, and they are the survivors from IMAGE 1 — the same people: pointed hoods up, ragged coats in faded teal, ochre and slate, battered packs. They are seen FROM BEHIND exactly as image 1 shows them, turned away from the viewer toward the lamp at the back, so they read as dark hooded silhouettes against the amber light with only a thin rim of lamplight along their hoods and shoulders. NO FACES — this game never draws a survivor's face. They are not running: they stand and huddle, pressed together, and one of them has a hand up on a bar. Big simple shapes — at play size the whole cage is about 40 px tall, so each person is a hood and a pair of shoulders, not a portrait. THIS ONE is the SEALED cage a miniboss stands beside — bullets do nothing to it, and only that monster's death opens it — so it must look impossible to break: a strongroom of a cage. Thick black-iron corner posts studded with rivets, bars as thick as a wrist, a massive riveted lid, and one heavy CHAIN slung across the front of the bars at hip height, held shut by a single huge black-iron PADLOCK hanging at the centre. FOUR OR FIVE prisoners crowded shoulder to shoulder inside, their hoods and shoulders above the chain. Keep the silhouette the reference draws — a tall barred box under a flat lid, filling the frame from the top of the lid to the bottom rail — and keep every part of it inside that box: nothing hangs off the sides, nothing stands up on the lid, nothing lies on the ground around it.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints the lamp's soft halo around the cage, a white "+N" count above the lid and a hit-point number under the bottom rail, and it shakes and leans the whole cage when it is shot — so paint NO glow outside the bars, NO numbers, NO text, and paint the cage INTACT, upright and still.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Its bottom edge must land at the same height from the bottom of the
  frame as the reference has it — the game registers the return by it.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Warden cage (behind the boss)  (models/survivors.png + still-prop-cage-warden.png → images/props/cage-warden.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
Two images come with this prompt, in this order:
  IMAGE 1 — `models/survivors.png` — THE PEOPLE: the three survivors exactly as the game shows them. Take
     their look from it — hoods, coats, packs, colours, proportions — and not
     their running poses; inside the cage they stand still.
  IMAGE 2 — `still-prop-cage-warden.png` — THE REFERENCE: the game's own drawing of this
     sprite. It is exactly what to paint, at exactly the size and position it
     is drawn at. Match both.

WHAT IT IS: A prisoner cage standing on the ground, seen STRAIGHT ON from the front, flat-on like a crate: a TALL box, a little taller than it is wide, with a heavy flat iron LID across the top that overhangs the bars slightly — a hard, level shelf, the top edge of the whole silhouette — a bottom rail standing on the ground, a post at each side, and FOUR vertical iron bars across the front with clear open gaps between them. It is lit from WITHIN by a lantern hanging at the BACK of the cage, and THE LAMPLIGHT IS THE ONE HOT ACCENT OF THIS IMAGE: a rich warm amber, around #E0902E and brighter toward the lamp, filling the space behind the bars, bright enough to name at a glance from across a phone screen. The BACK and the SIDES of the cage are closed with dark iron sheet, exactly as the reference fills its whole inside: nothing behind the prisoners is see-through, and no background colour shows anywhere inside the frame — light spilling over magenta turns pink, and a pink cage is a failed image. The style rule about desaturated low-key colour applies to the iron and the people — NOT to the light. The iron is cold, dark and dead: gunmetal grey-blue with rust, no paint, no colour of its own. A cage that has gone dark, grey or brown inside is a failed image. INSIDE are the prisoners, and they are the survivors from IMAGE 1 — the same people: pointed hoods up, ragged coats in faded teal, ochre and slate, battered packs. They are seen FROM BEHIND exactly as image 1 shows them, turned away from the viewer toward the lamp at the back, so they read as dark hooded silhouettes against the amber light with only a thin rim of lamplight along their hoods and shoulders. NO FACES — this game never draws a survivor's face. They are not running: they stand and huddle, pressed together, and one of them has a hand up on a bar. Big simple shapes — at play size the whole cage is about 40 px tall, so each person is a hood and a pair of shoulders, not a portrait. THIS ONE is the WARDEN cage — the prison every boss stands guard in front of, holding the whole squad the player starts the next stage with. It is the thing the entire run is walking toward, so it is the biggest and grimmest of the set: massive black-iron corner posts, bars as thick as spear shafts, a crushing iron-banded lid with a row of short blunt spikes along its FRONT FACE (on the face of the lid, not sticking up above it), a bleached skull wired to the top of each corner post, and a heavy chain wound round both posts. PACKED with prisoners — six to eight hooded heads and shoulders crowded together across the whole width of the cage. Keep the silhouette the reference draws — a tall barred box under a flat lid, filling the frame from the top of the lid to the bottom rail — and keep every part of it inside that box: nothing hangs off the sides, nothing stands up on the lid, nothing lies on the ground around it.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The game paints the lamp's soft halo around the cage, a white "+N" count above the lid and a hit-point number under the bottom rail, and it shakes and leans the whole cage when it is shot — so paint NO glow outside the bars, NO numbers, NO text, and paint the cage INTACT, upright and still.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Its bottom edge must land at the same height from the bottom of the
  frame as the reference has it — the game registers the return by it.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Gate frame — the door that pays  (still-gate-frame-add.png → images/gates/frame-add.webp)

```text
Paint ONE game sprite in a single landscape, 21:9 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A gate FRAME for a magical doorway, seen straight on: two THIN, tall posts, one at each side of the frame, joined by a thin lintel or arch across the top; the whole MIDDLE IS OPEN — flat magenta — because the game paints the glowing curtain, the flowing chevrons and the number plate inside the opening. The posts stand on the road; leave a little magenta under and over them exactly as the reference does. THIS ONE is the door that PAYS: clean cold-iron posts lit with pale cyan runes, a faint cold light on the metal, intact. Cold cyan is its identity — nothing warm on it.

THE POSTS — measure them against the FRAME, not against your idea of a gate.
In the reference each post is a pillar 6% of the frame wide, its outer
face 12% in from the frame's edge and its inner face 18% in.
That is as wide as a post can be. Paint it EXACTLY that wide — the width the
reference draws it, not wider, not a pair, not a wall. The DOORWAY between
the two inner faces is 64% of the width and it is EMPTY from the lintel
to the ground: nothing stands in it, nothing leans into it, no rubble, no
floor, no shadow.
· Exactly TWO posts: one at the left edge, one at the right. Not a pair per
  side, not a slab beside a pillar, not a wall.
· A post wider than the reference is squeezed thinner by the slicer until it
  fits — the painting survives, squashed. The last three returns had posts
  three times the reference width, and every one of them came back as a
  squeezed sliver.
· Bulk goes UP — a taller cap, a finial, a heavier lintel — never sideways.
· The lintel or arch across the top is thin and can be stretched; nothing
  else spans the doorway. Anything painted below the lintel between the
  posts is thrown away.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· Two posts, one per side, each 6% of the frame wide — the width the
  reference draws them — with the doorway 64% of the width between them.
· The doorway between them is empty magenta from the lintel down to the
  ground.
· No shadow on the ground, no ground at all — the posts stand on magenta.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1344 x 576 pixels — landscape, 21:9.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Gate frame — the door that bills  (still-gate-frame-sub.png → images/gates/frame-sub.webp)

```text
Paint ONE game sprite in a single landscape, 21:9 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A gate FRAME for a magical doorway, seen straight on: two THIN, tall posts, one at each side of the frame, joined by a thin lintel or arch across the top; the whole MIDDLE IS OPEN — flat magenta — because the game paints the glowing curtain, the flowing chevrons and the number plate inside the opening. The posts stand on the road; leave a little magenta under and over them exactly as the reference does. THIS ONE is the door that BILLS: scorched iron posts with an amber-brown, sooty, dried-blood cast, dull embers in the cracks, intact but ugly.

THE POSTS — measure them against the FRAME, not against your idea of a gate.
In the reference each post is a pillar 6% of the frame wide, its outer
face 12% in from the frame's edge and its inner face 18% in.
That is as wide as a post can be. Paint it EXACTLY that wide — the width the
reference draws it, not wider, not a pair, not a wall. The DOORWAY between
the two inner faces is 64% of the width and it is EMPTY from the lintel
to the ground: nothing stands in it, nothing leans into it, no rubble, no
floor, no shadow.
· Exactly TWO posts: one at the left edge, one at the right. Not a pair per
  side, not a slab beside a pillar, not a wall.
· A post wider than the reference is squeezed thinner by the slicer until it
  fits — the painting survives, squashed. The last three returns had posts
  three times the reference width, and every one of them came back as a
  squeezed sliver.
· Bulk goes UP — a taller cap, a finial, a heavier lintel — never sideways.
· The lintel or arch across the top is thin and can be stretched; nothing
  else spans the doorway. Anything painted below the lintel between the
  posts is thrown away.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· Two posts, one per side, each 6% of the frame wide — the width the
  reference draws them — with the doorway 64% of the width between them.
· The doorway between them is empty magenta from the lintel down to the
  ground.
· No shadow on the ground, no ground at all — the posts stand on magenta.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1344 x 576 pixels — landscape, 21:9.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Gate frame — the multiplier  (still-gate-frame-mul.png → images/gates/frame-mul.webp)

```text
Paint ONE game sprite in a single landscape, 21:9 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A gate FRAME for a magical doorway, seen straight on: two THIN, tall posts, one at each side of the frame, joined by a thin lintel or arch across the top; the whole MIDDLE IS OPEN — flat magenta — because the game paints the glowing curtain, the flowing chevrons and the number plate inside the opening. The posts stand on the road; leave a little magenta under and over them exactly as the reference does. THIS ONE is the MULTIPLIER: posts of dark violet-black iron with deep purple runes — deep VIOLET, never pink and never magenta, because magenta is the background key and would be cut away with the sky.

THE POSTS — measure them against the FRAME, not against your idea of a gate.
In the reference each post is a pillar 6% of the frame wide, its outer
face 12% in from the frame's edge and its inner face 18% in.
That is as wide as a post can be. Paint it EXACTLY that wide — the width the
reference draws it, not wider, not a pair, not a wall. The DOORWAY between
the two inner faces is 64% of the width and it is EMPTY from the lintel
to the ground: nothing stands in it, nothing leans into it, no rubble, no
floor, no shadow.
· Exactly TWO posts: one at the left edge, one at the right. Not a pair per
  side, not a slab beside a pillar, not a wall.
· A post wider than the reference is squeezed thinner by the slicer until it
  fits — the painting survives, squashed. The last three returns had posts
  three times the reference width, and every one of them came back as a
  squeezed sliver.
· Bulk goes UP — a taller cap, a finial, a heavier lintel — never sideways.
· The lintel or arch across the top is thin and can be stretched; nothing
  else spans the doorway. Anything painted below the lintel between the
  posts is thrown away.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· Two posts, one per side, each 6% of the frame wide — the width the
  reference draws them — with the doorway 64% of the width between them.
· The doorway between them is empty magenta from the lintel down to the
  ground.
· No shadow on the ground, no ground at all — the posts stand on magenta.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1344 x 576 pixels — landscape, 21:9.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Gate frame — the trap  (still-gate-frame-div.png → images/gates/frame-div.webp)

```text
Paint ONE game sprite in a single landscape, 21:9 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A gate FRAME for a magical doorway, seen straight on: two THIN, tall posts, one at each side of the frame, joined by a thin lintel or arch across the top; the whole MIDDLE IS OPEN — flat magenta — because the game paints the glowing curtain, the flowing chevrons and the number plate inside the opening. The posts stand on the road; leave a little magenta under and over them exactly as the reference does. THIS ONE is the TRAP: rusted red-black iron posts, each still ONE pillar of the reference's width, with the top of the post cracked off jagged and a snapped stub above the break, dirty and scorched — a frame that has already failed somebody. Broken means the TOP is broken; the post itself stays a pillar, not a heap of rubble, not a wall.

THE POSTS — measure them against the FRAME, not against your idea of a gate.
In the reference each post is a pillar 6% of the frame wide, its outer
face 12% in from the frame's edge and its inner face 18% in.
That is as wide as a post can be. Paint it EXACTLY that wide — the width the
reference draws it, not wider, not a pair, not a wall. The DOORWAY between
the two inner faces is 64% of the width and it is EMPTY from the lintel
to the ground: nothing stands in it, nothing leans into it, no rubble, no
floor, no shadow.
· Exactly TWO posts: one at the left edge, one at the right. Not a pair per
  side, not a slab beside a pillar, not a wall.
· A post wider than the reference is squeezed thinner by the slicer until it
  fits — the painting survives, squashed. The last three returns had posts
  three times the reference width, and every one of them came back as a
  squeezed sliver.
· Bulk goes UP — a taller cap, a finial, a heavier lintel — never sideways.
· The lintel or arch across the top is thin and can be stretched; nothing
  else spans the doorway. Anything painted below the lintel between the
  posts is thrown away.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· Two posts, one per side, each 6% of the frame wide — the width the
  reference draws them — with the doorway 64% of the width between them.
· The doorway between them is empty magenta from the lintel down to the
  ground.
· No shadow on the ground, no ground at all — the posts stand on magenta.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1344 x 576 pixels — landscape, 21:9.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The crowd's round  (still-round-tracer.png → images/rounds/tracer.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The crowd's round: a short vertical streak of hot lead — a bright white-gold core with a thin ember-orange glow tail below it. It is one of a hundred on screen, so it is a streak, not an object. The streak spans the full height of the frame and about a quarter of its width, centred.

DRAW IT AT REST, pointing UP: it flies up the screen, so the bright head is at the TOP and the tail trails DOWN. Do not add motion blur, speed lines or
a second copy of it: the game turns and moves it out of this one picture.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The gunner's round  (still-round-bolt-gunner.png → images/rounds/bolt-gunner.webp)

```text
Repaint an 8-frame ANIMATION LOOP of one game sprite, as a single
landscape, 2:1 sheet of 4 x 2 panels.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The gunner's round: a fat slow orb of cold cyan witchfire around a dark iron core, with a streaming tail of fading cyan witchfire behind it. Small in its frame — the tail is longer than the head is wide.

READ THE PANELS. This is not one picture — it is 8 frames of ONE LOOP.
The attached sheet is 4 columns x 2 rows = EXACTLY 8 panels, read left
to right along the top row and then the row below.

· 8 panels. Not 1, not 4, not 12, not 16. Exactly 2 rows of
  4 — do not add a row, do not append the cycle again underneath.
· Repaint EVERY panel. A sheet where one panel is painted and the rest are
  copies of it is the failure this whole sheet exists to avoid.
· THE 2 ROWS ARE NOT 2 STATES. The top row is panels 1-4 and the row
  below is 5-8, of ONE continuous march. A sheet with one arrangement
  repeated across the top row and a second repeated across the bottom is
  what came back last time — it is two pictures, not eight, and it plays as
  a thing that snaps between two poses.
· All 8 panels are DIFFERENT from each other, and each differs from the one
  beside it by the SAME small step. Even spacing is the animation; a sheet
  that holds still and then jumps reads as dropped frames.
· Each panel is exactly 1/4 of the width and 1/2 of the height,
  on an exact grid with no gutters. The cut is done by arithmetic.

WHAT MOVES: The IRON CORE and the orb around it do not move, change size or change place between panels — they are the same round, and the game measures its kill against that head. What animates is the WITCHFIRE: the tail licks and gutters, its tongues lengthening and shortening and curling off the axis, and loose sparks drift back down it. Panel 8 must lead back into panel 1.

IT MUST LOOP. The game plays these end to end, forever, several times a
second: after panel 8 it goes straight back to panel 1. So panel 8 has to
flow into panel 1 as smoothly as panel 1 flows into panel 2. Do not build a
sequence that starts small and ends big — that pops once per loop, and at
this speed a pop reads as a dropped frame.

The SUBJECT keeps the same size, the same colours and the same place in the
panel throughout — it is one object seen at eight moments, not eight
objects. Only what is written under WHAT MOVES may change.

EVERY PANEL IS ITS OWN PICTURE. Flame, sparks and glow stay inside the
panel they belong to — nothing reaches across a panel edge into its
neighbour, and the magenta between panels stays flat magenta. The sheet is
cut on an exact grid, so anything that crosses a boundary is sliced in half
and arrives in the game as a stray smear on the frame next door.

ORIENTATION, in every panel: pointing RIGHT: the head sits at 0.7 of the width with the tail trailing off to the LEFT. The game turns it to its heading.. No motion blur and no speed
lines — the movement is in the difference between the panels, and the
game turns and travels the sprite itself.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT (this is per PANEL) — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· 4 panels across, 2 down, 8 in all — no extra row.
· No two of the 8 panels are identical. In particular the 4 panels of a
  row are 4 different moments, not one moment repeated across the row.
· Every panel holds the same object at the same size, in the same place,
  in the same colours.
· Panel 8 leads back into panel 1.
· Every pixel that is not the sprite is flat, vivid #FF00FF.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 2048 x 1024 pixels — landscape, 2:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object, painted 8 times as 8 moments of one loop. Not variants,
  not a comparison, not a turnaround, not a before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The healer's bolt  (still-round-bolt-boss.png → images/rounds/bolt-boss.webp)

```text
Repaint an 8-frame ANIMATION LOOP of one game sprite, as a single
landscape, 2:1 sheet of 4 x 2 panels.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The healer's bolt: a sickly green orb of necrotic light with a pale core and a trail of guttering green flame behind it. Small in its frame.

READ THE PANELS. This is not one picture — it is 8 frames of ONE LOOP.
The attached sheet is 4 columns x 2 rows = EXACTLY 8 panels, read left
to right along the top row and then the row below.

· 8 panels. Not 1, not 4, not 12, not 16. Exactly 2 rows of
  4 — do not add a row, do not append the cycle again underneath.
· Repaint EVERY panel. A sheet where one panel is painted and the rest are
  copies of it is the failure this whole sheet exists to avoid.
· THE 2 ROWS ARE NOT 2 STATES. The top row is panels 1-4 and the row
  below is 5-8, of ONE continuous march. A sheet with one arrangement
  repeated across the top row and a second repeated across the bottom is
  what came back last time — it is two pictures, not eight, and it plays as
  a thing that snaps between two poses.
· All 8 panels are DIFFERENT from each other, and each differs from the one
  beside it by the SAME small step. Even spacing is the animation; a sheet
  that holds still and then jumps reads as dropped frames.
· Each panel is exactly 1/4 of the width and 1/2 of the height,
  on an exact grid with no gutters. The cut is done by arithmetic.

WHAT MOVES: The ORB and its pale core keep the same size and the same place in every panel — that head is the part that hits. What animates is the necrotic fire around and behind it: the halo breathes in and out, the trail writhes and splits, and flecks of green rot peel off it and fall behind. Panel 8 must lead back into panel 1.

IT MUST LOOP. The game plays these end to end, forever, several times a
second: after panel 8 it goes straight back to panel 1. So panel 8 has to
flow into panel 1 as smoothly as panel 1 flows into panel 2. Do not build a
sequence that starts small and ends big — that pops once per loop, and at
this speed a pop reads as a dropped frame.

The SUBJECT keeps the same size, the same colours and the same place in the
panel throughout — it is one object seen at eight moments, not eight
objects. Only what is written under WHAT MOVES may change.

EVERY PANEL IS ITS OWN PICTURE. Flame, sparks and glow stay inside the
panel they belong to — nothing reaches across a panel edge into its
neighbour, and the magenta between panels stays flat magenta. The sheet is
cut on an exact grid, so anything that crosses a boundary is sliced in half
and arrives in the game as a stray smear on the frame next door.

ORIENTATION, in every panel: pointing RIGHT: the head sits at 0.7 of the width with the tail trailing off to the LEFT. The game turns it to its heading.. No motion blur and no speed
lines — the movement is in the difference between the panels, and the
game turns and travels the sprite itself.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT (this is per PANEL) — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· 4 panels across, 2 down, 8 in all — no extra row.
· No two of the 8 panels are identical. In particular the 4 panels of a
  row are 4 different moments, not one moment repeated across the row.
· Every panel holds the same object at the same size, in the same place,
  in the same colours.
· Panel 8 leads back into panel 1.
· Every pixel that is not the sprite is flat, vivid #FF00FF.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 2048 x 1024 pixels — landscape, 2:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object, painted 8 times as 8 moments of one loop. Not variants,
  not a comparison, not a turnaround, not a before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The rolling boulder  (still-round-roller.png → images/rounds/roller.webp)

```text
Repaint an 8-frame ANIMATION LOOP of one game sprite, as a single
landscape, 2:1 sheet of 4 x 2 panels.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The rolling boulder: a huge iron-banded stone sphere studded with rusted spikes, dark, with a rim light along its lower edge, seen face-on as it rolls straight at the viewer. The SPHERE is a full circle about three quarters of the frame across, centred — in the reference it spans from 12% to 88% of the width — and the spikes reach out from it into the margin around it, never crossing the frame edge. The sphere is what kills; keep it that size. Its ironwork reads as FOUR evenly spaced bands stacked down its face — flattened ellipses, widest across the middle of the ball and tighter toward its top and bottom edges, studded with rivets. Four bands across the face, evenly spaced, all the way from the top edge to the bottom: not one equator, not a cross, not a cage.

READ THE PANELS. This is not one picture — it is 8 frames of ONE LOOP.
The attached sheet is 4 columns x 2 rows = EXACTLY 8 panels, read left
to right along the top row and then the row below.

· 8 panels. Not 1, not 4, not 12, not 16. Exactly 2 rows of
  4 — do not add a row, do not append the cycle again underneath.
· Repaint EVERY panel. A sheet where one panel is painted and the rest are
  copies of it is the failure this whole sheet exists to avoid.
· THE 2 ROWS ARE NOT 2 STATES. The top row is panels 1-4 and the row
  below is 5-8, of ONE continuous march. A sheet with one arrangement
  repeated across the top row and a second repeated across the bottom is
  what came back last time — it is two pictures, not eight, and it plays as
  a thing that snaps between two poses.
· All 8 panels are DIFFERENT from each other, and each differs from the one
  beside it by the SAME small step. Even spacing is the animation; a sheet
  that holds still and then jumps reads as dropped frames.
· Each panel is exactly 1/4 of the width and 1/2 of the height,
  on an exact grid with no gutters. The cut is done by arithmetic.

WHAT MOVES: IT ROLLS, TOWARD THE VIEWER — this is the one sheet in the set where the
object itself moves, and that movement is the whole animation.

THREE returns have now come back without it. The first was the same ball
copied eight times with sparks added. The second was TWO arrangements,
one repeated across the top row and the other across the bottom, which
plays as a thing that snaps between two poses. The third is the one to
study, because it looked closest and was still not a roll: the bands
slid down the face as four stripes of the SAME WIDTH, evenly spaced,
like a pattern scrolling behind a porthole. Nothing narrowed, nothing
crowded, and the studs never moved at all.

That is the whole difference, so it is worth stating as geometry rather
than as a feeling. These bands are HOOPS AROUND A SPHERE, not stripes
on a disc, and a hoop on a sphere does two things a stripe never does:

  · IT NARROWS. A band crossing the widest part of the ball spans
    almost the full width of it. The same band, three quarters of the
    way to the top edge, spans barely half that — and as it reaches the
    edge it shrinks to nothing and is gone. Look at the reference: no
    two bands in a panel are the same width.
  · THEY CROWD. Because they are evenly spaced around the BALL and not
    down the picture, the gaps between them look widest across the
    middle and squeeze together toward the top and bottom edges. Two
    bands near the top edge sit almost on top of each other.

Get those two right and the ball turns whether or not anything else is
perfect. Get them wrong and no amount of sparks will save it.

The ball stays exactly the same size and exactly in the same place. What
moves is its SURFACE: the bands, their rivets and any scars or pitting
travel DOWNWARD together across the face — in at the top edge, down over
the middle, out at the bottom — as if the ball were turning toward you.
The rivets ride their band, so they spread apart as the band widens over
the middle and close up again as it narrows toward an edge.

Across the eight panels the surface travels DOWN by exactly ONE BAND
GAP, in eight even steps of an eighth of a gap each. By panel 8 the
band that started on the ball's widest point has moved almost all the
way to where the band below it began, so the next step lands the
following band exactly where the first one started — and that is panel 1
again. The loop closes with no jump. Do not paint a whole revolution.

The RING OF SPIKES around the outline is the one thing that does NOT
travel. A ball rolling straight at you keeps its silhouette: the spikes
stand out from the edge in the same places in all eight panels, exactly
as the reference draws them. Do not slide them around the rim — that
reads as a ball spinning on the spot rather than rolling at the viewer.
The roll is carried entirely by the face.

Under it all, sparks struck off the spikes where they bite the road and
a low scorch of dust around the base. Those are the only things that may
vary freely between panels — everything else has to line up.

PANEL BY PANEL — measure each one against panel 1, not against its
neighbour, or the error accumulates and the loop will not close:
· panel 1: the starting arrangement — one band lies straight across the ball's widest point (its horizontal middle). Every other panel is measured from this one.
· panel 2: every band has slid DOWN by 1/8 of the gap between two bands — the second of eight even steps, so the band that was on the widest point is now a little below it.
· panel 3: every band has slid DOWN by 2/8 of the gap between two bands — the third of eight even steps, so the band that was on the widest point is now a little below it.
· panel 4: every band has slid DOWN by 3/8 of the gap between two bands — the fourth of eight even steps, so the band that was on the widest point is now a little below it.
· panel 5: every band has slid DOWN by 4/8 of the gap between two bands — HALF a gap. This is the panel least like panel 1 and it has to look it: the ball's widest point now falls in BARE IRON, exactly midway between two bands, where panel 1 had a band sitting on it.
· panel 6: every band has slid DOWN by 5/8 of the gap between two bands — the sixth of eight even steps, so the band that was on the widest point is now a little below it.
· panel 7: every band has slid DOWN by 6/8 of the gap between two bands — the seventh of eight even steps, so the band that was on the widest point is now a little below it.
· panel 8: every band has slid DOWN by 7/8 of the gap between two bands. One more step of the same size brings the NEXT band onto the widest point, which is panel 1 again — that is how the loop closes. This panel is the one just before that.

IT MUST LOOP. The game plays these end to end, forever, several times a
second: after panel 8 it goes straight back to panel 1. So panel 8 has to
flow into panel 1 as smoothly as panel 1 flows into panel 2. Do not build a
sequence that starts small and ends big — that pops once per loop, and at
this speed a pop reads as a dropped frame.

The SUBJECT keeps the same size, the same colours and the same place in the
panel throughout — it is one object seen at eight moments, not eight
objects. Only what is written under WHAT MOVES may change.

EVERY PANEL IS ITS OWN PICTURE. Flame, sparks and glow stay inside the
panel they belong to — nothing reaches across a panel edge into its
neighbour, and the magenta between panels stays flat magenta. The sheet is
cut on an exact grid, so anything that crosses a boundary is sliced in half
and arrives in the game as a stray smear on the frame next door.

LEAVE OUT WHAT THE GAME PAINTS LIVE. Nothing is painted over it any more. The game used to scroll its own bands across the ball to fake the roll; these eight frames ARE the roll, so paint the ironwork and let it turn.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT (this is per PANEL) — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· 4 panels across, 2 down, 8 in all — no extra row.
· No two of the 8 panels are identical. In particular the 4 panels of a
  row are 4 different moments, not one moment repeated across the row.
· Every panel holds the same object at the same size, in the same place,
  in the same colours.
· Panel 8 leads back into panel 1.
· Every pixel that is not the sprite is flat, vivid #FF00FF.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 2048 x 1024 pixels — landscape, 2:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object, painted 8 times as 8 moments of one loop. Not variants,
  not a comparison, not a turnaround, not a before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The boss's rock  (still-round-meteor.png → images/rounds/meteor.webp)

```text
Repaint an 8-frame ANIMATION LOOP of one game sprite, as a single
landscape, 2:1 sheet of 4 x 2 panels.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The boss's falling rock: a jagged black stone wrapped in orange fire, a white-hot core around the stone, and a flame tail streaming UPWARD from it — it falls down the screen. The stone sits in the LOWER part of the frame with the tail reaching the top.

READ THE PANELS. This is not one picture — it is 8 frames of ONE LOOP.
The attached sheet is 4 columns x 2 rows = EXACTLY 8 panels, read left
to right along the top row and then the row below.

· 8 panels. Not 1, not 4, not 12, not 16. Exactly 2 rows of
  4 — do not add a row, do not append the cycle again underneath.
· Repaint EVERY panel. A sheet where one panel is painted and the rest are
  copies of it is the failure this whole sheet exists to avoid.
· THE 2 ROWS ARE NOT 2 STATES. The top row is panels 1-4 and the row
  below is 5-8, of ONE continuous march. A sheet with one arrangement
  repeated across the top row and a second repeated across the bottom is
  what came back last time — it is two pictures, not eight, and it plays as
  a thing that snaps between two poses.
· All 8 panels are DIFFERENT from each other, and each differs from the one
  beside it by the SAME small step. Even spacing is the animation; a sheet
  that holds still and then jumps reads as dropped frames.
· Each panel is exactly 1/4 of the width and 1/2 of the height,
  on an exact grid with no gutters. The cut is done by arithmetic.

WHAT MOVES: The STONE keeps the same size and very nearly the same place in every panel — it may rock a few degrees, no more, because the game moves it down the screen itself. Everything else BURNS: the flame tail whips and forks, its tongues climbing and falling back, the white-hot shell around the stone flares and dims, and embers tear off the tail and stream away above it. This is the panel the whole sheet is for — the fire must be visibly a different fire in every one of the eight. Panel 8 must lead back into panel 1.

IT MUST LOOP. The game plays these end to end, forever, several times a
second: after panel 8 it goes straight back to panel 1. So panel 8 has to
flow into panel 1 as smoothly as panel 1 flows into panel 2. Do not build a
sequence that starts small and ends big — that pops once per loop, and at
this speed a pop reads as a dropped frame.

The SUBJECT keeps the same size, the same colours and the same place in the
panel throughout — it is one object seen at eight moments, not eight
objects. Only what is written under WHAT MOVES may change.

EVERY PANEL IS ITS OWN PICTURE. Flame, sparks and glow stay inside the
panel they belong to — nothing reaches across a panel edge into its
neighbour, and the magenta between panels stays flat magenta. The sheet is
cut on an exact grid, so anything that crosses a boundary is sliced in half
and arrives in the game as a stray smear on the frame next door.

ORIENTATION, in every panel: falling: the stone low in the frame, the tail rising to the top edge. No motion blur and no speed
lines — the movement is in the difference between the panels, and the
game turns and travels the sprite itself.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT (this is per PANEL) — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Its bottom edge must land at the same height from the bottom of the
  frame as the reference has it — the game registers the return by it.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· 4 panels across, 2 down, 8 in all — no extra row.
· No two of the 8 panels are identical. In particular the 4 panels of a
  row are 4 different moments, not one moment repeated across the row.
· Every panel holds the same object at the same size, in the same place,
  in the same colours.
· Panel 8 leads back into panel 1.
· Every pixel that is not the sprite is flat, vivid #FF00FF.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 2048 x 1024 pixels — landscape, 2:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object, painted 8 times as 8 moments of one loop. Not variants,
  not a comparison, not a turnaround, not a before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The bomber's charge  (still-round-bomb.png → images/rounds/bomb.webp)

```text
Repaint an 8-frame ANIMATION LOOP of one game sprite, as a single
landscape, 2:1 sheet of 4 x 2 panels.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The bomber's charge: a black iron bomb with a lit fuse and a tight ember glow around it. Centred, about half the frame across.

READ THE PANELS. This is not one picture — it is 8 frames of ONE LOOP.
The attached sheet is 4 columns x 2 rows = EXACTLY 8 panels, read left
to right along the top row and then the row below.

· 8 panels. Not 1, not 4, not 12, not 16. Exactly 2 rows of
  4 — do not add a row, do not append the cycle again underneath.
· Repaint EVERY panel. A sheet where one panel is painted and the rest are
  copies of it is the failure this whole sheet exists to avoid.
· THE 2 ROWS ARE NOT 2 STATES. The top row is panels 1-4 and the row
  below is 5-8, of ONE continuous march. A sheet with one arrangement
  repeated across the top row and a second repeated across the bottom is
  what came back last time — it is two pictures, not eight, and it plays as
  a thing that snaps between two poses.
· All 8 panels are DIFFERENT from each other, and each differs from the one
  beside it by the SAME small step. Even spacing is the animation; a sheet
  that holds still and then jumps reads as dropped frames.
· Each panel is exactly 1/4 of the width and 1/2 of the height,
  on an exact grid with no gutters. The cut is done by arithmetic.

WHAT MOVES: The IRON BOMB does not move or change size between panels. What animates is the fire: the ember glow around the casing swells and shrinks, and the fuse burns with a flame that licks and flares. It is a fuse burning down, so the fire is a little angrier by panel 8 than at panel 1 — but panel 8 must still lead back into panel 1.

IT MUST LOOP. The game plays these end to end, forever, several times a
second: after panel 8 it goes straight back to panel 1. So panel 8 has to
flow into panel 1 as smoothly as panel 1 flows into panel 2. Do not build a
sequence that starts small and ends big — that pops once per loop, and at
this speed a pop reads as a dropped frame.

The SUBJECT keeps the same size, the same colours and the same place in the
panel throughout — it is one object seen at eight moments, not eight
objects. Only what is written under WHAT MOVES may change.

EVERY PANEL IS ITS OWN PICTURE. Flame, sparks and glow stay inside the
panel they belong to — nothing reaches across a panel edge into its
neighbour, and the magenta between panels stays flat magenta. The sheet is
cut on an exact grid, so anything that crosses a boundary is sliced in half
and arrives in the game as a stray smear on the frame next door.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The spark walking down the fuse is painted live, so no spark.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT (this is per PANEL) — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

BEFORE YOU CALL IT FINISHED, count and check:
· 4 panels across, 2 down, 8 in all — no extra row.
· No two of the 8 panels are identical. In particular the 4 panels of a
  row are 4 different moments, not one moment repeated across the row.
· Every panel holds the same object at the same size, in the same place,
  in the same colours.
· Panel 8 leads back into panel 1.
· Every pixel that is not the sprite is flat, vivid #FF00FF.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 2048 x 1024 pixels — landscape, 2:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object, painted 8 times as 8 moments of one loop. Not variants,
  not a comparison, not a turnaround, not a before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The player's grenade  (still-round-grenade.png → images/rounds/grenade.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The player's grenade: a small iron-grey sphere with a band across its middle, centred, filling most of the frame.

DRAW IT AT REST, level: it tumbles in flight and the game turns it. Do not add motion blur, speed lines or
a second copy of it: the game turns and moves it out of this one picture.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The shotgun's pellet  (still-round-pellet.png → images/rounds/pellet.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A shotgun pellet in flight: a short, fat slug of hot lead — a white-gold core with a stubby ember-orange smear behind it, no longer than it is wide and a half. It is drawn ADDITIVELY over the road, so dark pixels add nothing and the shape has to carry itself IN LIGHT ALONE: there is no ink outline anywhere on it, no black contour, no grey body, no cracks, no metal, no casing and no surface of any kind - this is not an object, it is the glow a round leaves as it goes past. The "INK FIRST" rule in the style block below applies to every other sheet in this game and NOT to this one. Two returns have already come back as a solid inked object (a brass cartridge, then a cracked metal drum with a lit end) and both were unusable. It is one of nine on screen at once, so it has to read as a lump rather than as a line: keep it COMPACT, and nothing like the long thin tracer the squad's own rifle fires. Centred, filling most of the frame exactly as the reference does — the game draws it small, and a pellet that leaves a margin here arrives smaller still.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The launcher's rocket  (still-round-rocket.png → images/rounds/rocket.webp)

```text
Paint ONE game sprite in a single portrait, 9:16 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The launcher's rocket in flight, nose up: a fat black-iron shell with a blunt warhead, a band of rust round its middle, two or three swept fins at its tail, and a hot exhaust plume streaming DOWN from it — a white-gold core inside ember-orange flame that frays into smoke. The SHELL sits in the upper part of the frame with its nose a little below the top edge and is about half the frame's width; the PLUME runs from the fins down to the bottom edge and may be as wide as the frame. It is the heaviest thing the player fires, so it must read as iron, not as a spark.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The blast when it lands is painted live, so no explosion, no smoke ring, just the shell in flight.

DRAW IT AT REST, pointing UP: it flies up the screen nose first, so the warhead is at the TOP and the plume trails DOWN. The game turns it to its heading. Do not add motion blur, speed lines or
a second copy of it: the game turns and moves it out of this one picture.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 288 x 512 pixels — portrait, 9:16.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Muzzle flash  (still-fx-muzzle.png → images/fx/muzzle.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A muzzle flash: a hot white-gold burst, spiky, TIGHT, with an ember-orange fringe. It is drawn additively over the road, so dark pixels add nothing and the shape has to carry itself in light alone. Centred, filling most of the frame — but every spike stays inside the frame edge, nothing touches it.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Smoke puff  (still-fx-smoke.png → images/fx/smoke.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A smoke puff: a soft round cloud, densest in the middle, fading to nothing at its edge. Centred, filling the frame.

GREYSCALE ONLY. Paint it in white through grey with alpha — no colour
at all. The game tints it per emitter (dust, soot, blood), and any colour
painted in here fights every one of those tints.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Scorch mark  (still-fx-scorch.png → images/fx/scorch.webp)

```text
Paint ONE game sprite in a single landscape, 1.82:1 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A scorch mark on the road: a soft black-charcoal burn, an ellipse wider than it is tall, darkest in the middle, fading out to nothing at its edge. Charcoal only — no colour, no embers.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 282 pixels — landscape, 1.82:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Shockwave ring  (still-fx-ring-shock.png → images/fx/ring-shock.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A shockwave ring: a thin bright white-blue ring, a full circle seen from above, with a hard inner edge and a soft outer glow. TRANSPARENT INSIDE — the ring is stretched flat over the road. The ring itself spans about 89% of the frame, exactly as the reference has it; the glow outside it stays inside the frame edge.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Slam telegraph ring  (still-fx-ring-heat.png → images/fx/ring-heat.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A slam telegraph ring: a thin ember-orange ring, a full circle, hard edge inside, soft heat outside, TRANSPARENT INSIDE. The ring itself spans about 89% of the frame, exactly as the reference has it — it marks the radius the hit lands in, so it must not grow or shrink — and the heat outside it stays inside the frame edge.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Heal ring  (still-fx-ring-heal.png → images/fx/ring-heal.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A heal ring: a thin sickly green ring, a full circle, TRANSPARENT INSIDE. Green is a colour the game uses nowhere else, so it must be unmistakably green. The ring itself spans about 89% of the frame, exactly as the reference has it; any glow outside it stays inside the frame edge.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Shield dome  (still-fx-shield.png → images/fx/shield.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The player's shield dome: a translucent cold-blue energy bubble, a full circle seen face-on, with a bright rim, a faint honeycomb texture across the surface and a specular sweep upper-left. The INTERIOR stays mostly transparent — it is stretched over the crowd and the crowd must stay readable through it. The rim spans about 89% of the frame, exactly as the reference has it; its glow outside stays inside the frame edge.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Boss guard barrier  (still-fx-guard.png → images/fx/guard.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The boss's guard barrier: a point-up HEXAGON of ember-orange energy, a translucent fill with a hot rim. The hexagon spans about 89% of the frame, exactly as the reference has it; the rim's glow outside it stays inside the frame edge.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The Dynamo's bolt  (still-fx-bolt.png → images/fx/bolt.webp)

```text
Paint ONE game sprite in a single portrait, 9:16 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: One tile of a lightning bolt, seen straight on: a vertical column of white-hot electricity with a pale cold-blue glow around it and a jagged spine down the middle, running from the TOP edge of the frame to the BOTTOM edge and touching both — the game stretches it down the road, so a bolt that stops short of either edge arrives in the game with a gap in it. Thin: the column is about a fifth of the frame wide, and the glow around it a third. Nothing else in the frame — no impact, no sparks at the ends, no ground.

DRAW IT AT REST, pointing UP the road: the column runs the full height of the frame and is stretched along it. Do not add motion blur, speed lines or
a second copy of it: the game turns and moves it out of this one picture.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 288 x 512 pixels — portrait, 9:16.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The thrall's wisp  (still-fx-wisp.png → images/fx/wisp.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A small cold soul-light: a pale blue-white flame, taller than it is wide, with a bright core and a soft halo — the light that hangs over the head of a body the Gravecall relic has raised. THE FLAME IS THE ONE HOT ACCENT OF THIS IMAGE AND IT IS COLD BLUE: paint the body of it at a luminous ice-blue midtone around #7FD4E8, with a near-white core around #EAFBFF and a soft halo of the same blue. It is the brightest thing in the frame and it must be nameable as BLUE at a glance. The style rule about desaturated low-key colour applies to nothing here: a wisp that comes back grey, white, silver, charcoal or ash is a failed image, and it came back grey once. There is no ink outline around it and no dark mass inside it - the game draws this additively over a dark road, so every dark pixel in the painting disappears and a flame with a black heart arrives as a hole. It is the one pixel that says a walking corpse is on the player's side, and it is read at 12 px, so it is a simple bright shape and not a detailed flame. Centred, the flame and its halo filling the frame exactly as the reference does, with the halo stopping at the frame edge.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The gold burst  (still-fx-gild.png → images/fx/gild.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A burst of gold: a thin ring of light with coins and glinting shards flying outward through it. THE GOLD IS THE ONE HOT ACCENT OF THIS IMAGE: paint it at a luminous midtone around #E8B93A with near-white glints around #FFF6D8, bright enough to name as GOLD at a glance. The style rule about desaturated low-key colour applies to nothing here, and the game draws this additively over a dark road, so every dark pixel disappears: no ink outlines, no brown, no grey, no dark mass. A burst that comes back tarnished, muddy or grey is a failed image. The ring and the shards are caught at the moment it opens, caught at the moment it opens. It is what a corpse turned to gold leaves behind when it bursts, so it reads as MONEY rather than as fire — no flame, no embers, no orange heat. The ring spans about 70% of the frame and the shards stay inside the frame edge.

KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background
is measured as part of the object when the return is fitted back onto the
reference — a wide aura therefore comes back as a tiny object inside a huge
smear. It also cannot be keyed: soft light over magenta turns pink rather
than transparent. Any glow belongs inside the shape's own outline, or within
a hair of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Shield crest  (still-fx-crest-shield.png → images/fx/crest-shield.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A heater shield crest — flat top, straight shoulders, tapering to a rounded point — in cold blue with a heavy near-black rim, a chief band across the top and a centre rib. Heraldry read at 20 px. Fills the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Guard crest  (still-fx-crest-guard.png → images/fx/crest-guard.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A heater shield crest — flat top, straight shoulders, tapering to a rounded point — in ember-orange and tarnished gold with a heavy dark rim, a chief band across the top and a centre rib: the boss's own. Fills the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Far ridge  (still-bg-ridge-far.png → images/bg/ridge-far.webp)

```text
Paint ONE game sprite in a single landscape, 4.00:1 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A far parallax ridge: jagged dead peaks with a broken tower or two and a gallows on the skyline. The SKY above the ridge line is solid magenta; everything below the ridge line is SOLID BLACK silhouette — the game tints it per stage, so no colour, no shading, no lights. The ridge line runs at about 40% down the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else.
Everything ABOVE the ridge line is sky, and it must be solid, flat, pure
magenta #FF00FF — a green-screen colour, keyed out automatically. NOT
transparent: transparency gets exported as a grey-and-white CHECKERBOARD
and then baked in as though the squares were paint. NOT white, NOT pale
blue, NOT a gradient or haze. BELOW the ridge line the artwork is fully
opaque black, right down to the bottom edge — do not fade it out.

SEAMLESSLY TILEABLE, HORIZONTALLY. This image is repeated end to end, so
the right edge must join the left edge with no visible seam, no matching
feature straddling the join, and no vignette or fade at either side. It
does NOT need to tile vertically.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1536 x 384 pixels — landscape, 4.00:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Near ridge  (still-bg-ridge-near.png → images/bg/ridge-near.webp)

```text
Paint ONE game sprite in a single landscape, 4.00:1 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: A near parallax ridge, lower and closer than the far one: a dune of ruined walls, leaning grave-posts and bare trees. The SKY above the ridge line is solid magenta; everything below it is SOLID BLACK silhouette — the game tints it per stage, so no colour, no shading, no lights. The ridge line runs at about 40% down the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else.
Everything ABOVE the ridge line is sky, and it must be solid, flat, pure
magenta #FF00FF — a green-screen colour, keyed out automatically. NOT
transparent: transparency gets exported as a grey-and-white CHECKERBOARD
and then baked in as though the squares were paint. NOT white, NOT pale
blue, NOT a gradient or haze. BELOW the ridge line the artwork is fully
opaque black, right down to the bottom edge — do not fade it out.

SEAMLESSLY TILEABLE, HORIZONTALLY. This image is repeated end to end, so
the right edge must join the left edge with no visible seam, no matching
feature straddling the join, and no vignette or fade at either side. It
does NOT need to tile vertically.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1536 x 384 pixels — landscape, 4.00:1.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Elite crown  (still-ui-crown.png → images/ui/crown.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The elite's crown: a small three-pointed crown of tarnished gold with a heavy dark rim, its base flat at the bottom of the frame. Read at 20 px — bold shape, no fine detail. Fills the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background inside
  the frame. The object itself fills the frame edge to edge, corner to
  corner, and its outer edge is the frame's edge.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
The subject fills its frame edge to edge, exactly as the reference does.
Do not shrink it onto a card or leave a polite margin.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Result banner  (still-ui-ribbon.png → images/ui/ribbon.webp)

```text
Paint ONE game sprite in a single landscape, 21:9 image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The result screen's title banner: a long horizontal plate of blackened iron with a swallow-tailed notch cut into each end, bound along its top and bottom edges with a thin line of tarnished gold, a round iron-gold boss beside each notch and a small rivet in each corner. The plate spans the FULL WIDTH and nearly the full height of the frame, exactly as the reference does. All the detail lives in the two END PIECES — the outer 17% of the width at each side — because the game keeps those at true size and STRETCHES THE MIDDLE sideways to fit the words: the middle 66% is a plain, flat, dark band with nothing on it but the two gold lines running straight through.

LEAVE OUT WHAT THE GAME PAINTS LIVE. The title is printed in white across the middle band, so the middle stays plain, flat and dark — no emblem, no rune, no glint, no lettering.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1344 x 576 pixels — landscape, 21:9.
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The idle treasure chest  (still-ui-chest.png → images/ui/chest.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The HUD's treasure chest: a squat iron-banded strongbox of dark oak seen straight on and a little from above, its domed lid raised a crack so a cold gold light leaks from the gap, a skull-faced iron hasp on the front, riveted black-iron bands and corners. A thing you would loot. Bold shape, no fine detail — it is read at 24 px beside the coin badge — and the same silhouette as the reference: a wide lid over a box, the lid overhanging.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The upgrade forge  (still-ui-forge.png → images/ui/forge.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The upgrade shop button's mark: a squat blackened-iron anvil, its horn to the LEFT and its foot splayed, standing under a bold upward chevron of hot molten gold, with two or three sparks flying off it. The anvil's face glows orange where the chevron rises off it. Bold shape, no fine detail — it is read at 24 px on a button — and the same layout as the reference: the chevron in the top half, the anvil in the bottom half, both centred and filling the frame.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The grenade skill  (still-ui-skill-grenade.png → images/ui/skill-grenade.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The grenade skill's button icon: a round black-iron bomb with a short fuse curling from its top and a spark on the fuse's end — the one the player throws. Bold and simple, read at 24 px on a round button; the same silhouette as the reference, a ball with the fuse to the upper right.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The shield skill  (still-ui-skill-shield.png → images/ui/skill-shield.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The shield skill's button icon: a heater shield of cold steel with a heavy near-black rim and a raised iron boss, a cold blue witch-light glowing in its centre band — the same cold blue as the dome it raises over the crowd. Bold and simple, read at 24 px on a round button; the same silhouette as the reference.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Alarm — dodge  (still-ui-warn-away.png → images/ui/warn-away.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The incoming-attack alarm: a heavy hazard sign, an upward-pointing triangle of battered iron plate with a thick dark bevelled rim, chipped paint and a few scratches, and a bold near-black exclamation mark punched through the middle of it — a tapering bar above a round dot. A sign bolted to a battlefield, not a tidy interface decal. Its plate is painted a bright WARNING AMBER-ORANGE (about #FFB32E) — a hazard lamp, hot and saturated. THE PLATE IS THE ONE HOT ACCENT OF THIS IMAGE: paint it at full strength, the brightest thing in the frame, bright enough to name the colour instantly at a glance. The style rule about desaturated low-key colour applies to the iron rim, the grime and the shadows — NOT to the plate. A plate that has gone grey, brown, black or muddy is a failed image; only the RIM, the bang and the shadows are dark. One of a SET OF THREE identical signs that differ in NOTHING but that colour: the same triangle, the same rim, the same bang, the same wear in the same places. Bold shape and a hard silhouette, no fine detail — it is caught in the corner of the eye while the player is dodging — and the same layout as the reference: apex at the top, wide flat base, filling the frame edge to edge with magenta only in the two upper corners.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Alarm — get in  (still-ui-warn-into.png → images/ui/warn-into.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The incoming-attack alarm: a heavy hazard sign, an upward-pointing triangle of battered iron plate with a thick dark bevelled rim, chipped paint and a few scratches, and a bold near-black exclamation mark punched through the middle of it — a tapering bar above a round dot. A sign bolted to a battlefield, not a tidy interface decal. Its plate is painted a bright COLD SOUL-BLUE (about #6ECBFF) — a witch-light, luminous and saturated, not steel and not grey. THE PLATE IS THE ONE HOT ACCENT OF THIS IMAGE: paint it at full strength, the brightest thing in the frame, bright enough to name the colour instantly at a glance. The style rule about desaturated low-key colour applies to the iron rim, the grime and the shadows — NOT to the plate. A plate that has gone grey, brown, black or muddy is a failed image; only the RIM, the bang and the shadows are dark. One of a SET OF THREE identical signs that differ in NOTHING but that colour: the same triangle, the same rim, the same bang, the same wear in the same places. Bold shape and a hard silhouette, no fine detail — it is caught in the corner of the eye while the player is dodging — and the same layout as the reference: apex at the top, wide flat base, filling the frame edge to edge with magenta only in the two upper corners.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Alarm — hold still  (still-ui-warn-still.png → images/ui/warn-still.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The incoming-attack alarm: a heavy hazard sign, an upward-pointing triangle of battered iron plate with a thick dark bevelled rim, chipped paint and a few scratches, and a bold near-black exclamation mark punched through the middle of it — a tapering bar above a round dot. A sign bolted to a battlefield, not a tidy interface decal. Its plate is painted a strong MID-TONE AMETHYST PURPLE — unmistakably PURPLE at a glance, saturated like a gemstone (midtone about #A855F7, its lit edge about #C77DFF, its shadow a deeper purple about #6B21A8). Two failed attempts to avoid: a plate so dark it reads as black or ash, and a plate so pale it reads as white or lavender. The purple is the plate only — the rim, the bang and the shadows stay near-black. THE PLATE IS THE ONE HOT ACCENT OF THIS IMAGE: paint it at full strength, the brightest thing in the frame, bright enough to name the colour instantly at a glance. The style rule about desaturated low-key colour applies to the iron rim, the grime and the shadows — NOT to the plate. A plate that has gone grey, brown, black or muddy is a failed image; only the RIM, the bang and the shadows are dark. One of a SET OF THREE identical signs that differ in NOTHING but that colour: the same triangle, the same rim, the same bang, the same wear in the same places. Bold shape and a hard silhouette, no fine detail — it is caught in the corner of the eye while the player is dodging — and the same layout as the reference: apex at the top, wide flat base, filling the frame edge to edge with magenta only in the two upper corners.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The launcher card  (still-ui-weapon-card-rocket.png → images/ui/weapon-card-rocket.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The stage-3 weapon choice's ROCKET LAUNCHER card: a shoulder-fired launcher of blackened iron and dark scorched wood seen three-quarters from the front-left, its muzzle pointing to the upper right, a fat finned rocket seated in the tube with its warhead just showing, a strap and two rivet bands along the barrel, and a hot ember-orange glow inside the mouth of the tube as if a shot is a heartbeat away. Weight and menace: this is the heavy option. Bold silhouette read at 100 px, the same layout as the reference — the weapon diagonal across the frame, filling about nine tenths of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## The gatling card  (still-ui-weapon-card-gatling.png → images/ui/weapon-card-gatling.webp)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The stage-3 weapon choice's GATLING GUN card: a six-barrelled rotary gun of gunmetal and brass seen three-quarters from the front-left, barrels pointing to the upper right and mid-spin, a cold soul-blue glow between the barrels and a spray of brass casings falling from the breech. Speed and volume: this is the fast option, so everything about it should look like it is already moving. Bold silhouette read at 100 px, the same layout as the reference — the weapon diagonal across the frame, filling about nine tenths of it.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 512 x 512 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```

---

## Title logo  (still-ui-logo.png → images/logo/logo_512x512.png)

```text
Paint ONE game sprite in a single square (1:1) image.
The attached reference is exactly what to paint, at exactly the size and
position it is drawn at. Match both.

WHAT IT IS: The game's title logo: the single word SURVIVALIST in carved bone-and-black-iron dark-fantasy lettering, cracked and chipped, a faint ember glow at the edges. Spelled exactly S-U-R-V-I-V-A-L-I-S-T, in one line, readable at 192 px. Centred, filling about nine tenths of the width.

STYLE — grim painted dark fantasy, like a plate from a gothic illustrated
bestiary or the key art of a dungeon crawler. Match this in every panel:
· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and
  confident, thick on the shadow side and thin on the lit side, with
  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing
  through the paint.
· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines
  with visible brushwork, rough cel-style shadow shapes and a little grain.
  No airbrush, no smooth 3D shading, no plastic gloss.
· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise
  purple, swamp green, cold slate — with ONE hot accent per subject (ember
  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows
  that fall to black.
· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:
  most of every form in shadow, one edge picked out.
· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,
  candle-soot. Everything has been through something.
· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so
  keep the big shapes simple and put the detail inside them.

AVOID — this is exactly how earlier attempts went wrong:
· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,
  no button eyes, no smiles.
· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,
  it is wrong.
· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D
  volume, no bevelled edges, no lens flares, no rim-lit chrome.
· NO photorealism and no hyper-detailed fur or scales — this is paint, and it
  is read at thumbnail size.
· NO warm paper, parchment or sepia wash over the whole image. Warmth is an
  accent, not a filter, and the ground is not part of the painting.
· NO frames, borders, cards, vignettes, matting or paper background behind
  the drawing. Nothing but flat magenta behind it, right up to its outline.
· Keep the subject the same subject and silhouette it already has. This is a
  restyle, not a redesign.

SIZE AND PLACEMENT — this is the part that goes wrong.
Do not enlarge it to fill the frame. The reference leaves air around the
subject and that air is not waste — it is where the things drawn live around
it go. Keep the subject the same fraction of the frame that the reference
has it, in the same place.
· Do not rotate it or change the viewing angle.
· No cast shadow on the ground. The game draws its own.

BACKGROUND — read this before anything else. It matters more than the style.
Fill every pixel that is not the object itself with solid, flat, pure magenta
#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.
· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty
  pink, not mauve, not a soft or tinted version of it. Only the true colour can
  be cut away cleanly; a near miss has to be flood-filled instead, and a flood
  fill eats any pale paint it can reach.
· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD
  and then baked into the artwork as though the squares were paint.
· NOT white, cream, black, parchment, paper, or any tinted or textured ground.
· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of
  any kind. The magenta must touch the outline of the object on every side.
· No drop shadow onto the background, and no vignette.
· The object itself must contain no magenta or hot pink.
· The dark, desaturated palette above is for the OBJECT. The ground is not
  part of the painting and is not toned down with it: it stays a vivid,
  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink
  and mauve are the failure this whole clause is about.

OUTPUT — read this twice, it is where every previous attempt failed:
· ONE image, exactly 1024 x 1024 pixels — square (1:1).
  If your tool has an aspect-ratio control, set it to match. Returns have
  come back at the tool's default ratio before, which overrides this line —
  the setting wins, so change the setting.
· ONE object. Not two, not a comparison, not variants side by side, not a
  before-and-after pair.
· No frame, border, card, label, caption, arrow, annotation or drop shadow.
```
