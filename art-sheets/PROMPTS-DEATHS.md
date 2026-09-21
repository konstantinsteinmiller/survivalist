# Boss death prompts — one boss per generation

Generated from the manifest — do not hand-edit, re-export instead.

Attach TWO images with each block, in this order: `art-sheets/models/<design>.png`
(the character — one frame of its walk as the game shows it, cut by
`pnpm art:models`) and then `art-sheets/death-<design>.png` (the animation). The
layout is the game's own drawing of the fall — the blow, the stagger, the knees
going, the body on its back (or flank) with its limbs spread — and the prompt
asks for exactly that fall, painted as exactly that creature. Without the model a
painter invents a new creature from the words, and the swap at the kill shows it.

Drop results in `art-sheets/painted/`, keeping the `death-<design>` in the
name, then run `pnpm slice-sheets`. The game asks for a death strip when a
stage is 80 % run and plays the same fall, drawn, until one exists.
Each prompt is a fenced block — the preview's copy button takes all of it.
Each heading names both images, and the Art Desk attaches both, in order.

## Grumpling — death  (models/grumpling.png + death-grumpling.png → images/deaths/grumpling.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/grumpling.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-grumpling.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· An imp with SUPER-DEFORMED, chibi BODY PROPORTIONS — but painted grim and gritty, never cute. Its big round head is as tall as its whole body and legs together (half of its height) and wider than its shoulders. Two BIG angular ears — flat, straight-edged flaps like cut card, not rounded or pointed — stick out sideways and a little up from the top of the head, each about half as long as the head is wide, grey-green outside and dull red-brown inside. A heavy scowling brow over small ember-orange pupils sunk in dark eye hollows (not big glowing eyes), a small snub nose, and a WIDE grin of needle fangs stretched right across the lower face. Under the head a SMALL pear-shaped body, narrower than the head, with a pale belly patch. Thick stubby tube arms, the same thickness all the way down, ending in round knob fists with no fingers or claws; very short stubby legs, shorter than the arms. Mottled dark MOSSY-GREEN skin, going grey only at the limbs.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the scratched hash-mark scar high on its brow, one eye sunk in a darker ring than the other, dark speckles on the scalp, the dull red-brown inside of both ears, the pale belly patch, and the mottled grey-green skin.
· It wears and carries NOTHING: no clothes, loincloth, rags, belt, weapon or shield. Add none.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — still on its feet, jolted up onto its toes, arms flung up and out with the hands open, head snapped back, eyes wide and blazing.
· panel 2: it staggers — the knees buckle and it sags onto one foot, arms windmilling for balance (one up, one down), the head starting to loll.
· panel 3: the knees go — sunk low on bent knees, rocking back the other way, the arms still flailing.
· panel 4: falling — going over backwards and sideways toward the panel's left, the feet kicked out from under it, arms thrown wide, the light in its eyes dimming.
· panel 5: impact — it lands flat on its back on a diagonal across the panel, head toward the left, flattened against the ground, arms and legs slapping down spread wide.
· panel 6: a small bounce — still lying the same way round as panel 5, the whole body jolted up just a finger's width off the ground by the impact (it does not jump or stand), arms and legs flopping up, the eyes closing.
· panel 7: settling — lying the same way round again, the limbs going slack where they fell: one arm flung out past the shoulder, the other down along its side, the legs splayed in a V, the head rolled onto one cheek.
· panel 8: fallen — the same body in the same place as panel 7, lying still on its back, spread out and limp, head still to the left, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· From panel 5 on it lies on its BACK on a diagonal across the panel, head to the left, arms and legs spread out on the ground — flatter than it is long, as anything lying on the ground is.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the scratched hash-mark scar high on its brow, one eye sunk in a darker ring than the other, dark speckles on the scalp, the dull red-brown inside of both ears, the pale belly patch, and the mottled grey-green skin.
· Panel 8: lying still on its back, spread out, eyes shut — head to the left, lying exactly as panel 7 lies. Panels 7 and 8 are not mirror images of each other.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

## Bonecap — death  (models/bonecap.png + death-bonecap.png → images/deaths/bonecap.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/bonecap.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-bonecap.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· A small, bow-legged skeleton wearing a HUGE pale toadstool cap: a smooth dome, wider than the skeleton's shoulders by half and about a third of its height, sitting over the skull like an umbrella down to the eye sockets. Stylised and chunky, never anatomical: a big round skull with a wide grinning jaw, a short narrow ribcage, thin bone arms that hang to its knees, knobbly bow legs, big bony feet. Dull green light glows inside the eye sockets and between the ribs. Old ivory bone with a green-grey tinge.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the dark brown spots scattered over the pale cap, the green glow in both eye sockets and between the ribs, the wide grinning jaw, and the bare ivory bone — no flesh, no clothes.
· It wears and carries NOTHING: no clothes, loincloth, rags, belt, weapon or shield. Add none.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — still on its feet, jolted up onto its toes, arms flung up and out with the hands open, head snapped back, eyes wide and blazing.
· panel 2: it staggers — the knees buckle and it sags onto one foot, arms windmilling for balance (one up, one down), the head starting to loll.
· panel 3: the knees go — sunk low on bent knees, rocking back the other way, the arms still flailing.
· panel 4: falling — going over backwards and sideways toward the panel's left, the feet kicked out from under it, arms thrown wide, the light in its eyes dimming.
· panel 5: impact — it lands flat on its back on a diagonal across the panel, head toward the left, flattened against the ground, arms and legs slapping down spread wide.
· panel 6: a small bounce — still lying the same way round as panel 5, the whole body jolted up just a finger's width off the ground by the impact (it does not jump or stand), arms and legs flopping up, the eyes closing.
· panel 7: settling — lying the same way round again, the limbs going slack where they fell: one arm flung out past the shoulder, the other down along its side, the legs splayed in a V, the head rolled onto one cheek.
· panel 8: fallen — the same body in the same place as panel 7, lying still on its back, spread out and limp, head still to the left, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· From panel 5 on it lies on its BACK on a diagonal across the panel, head to the left, arms and legs spread out on the ground — flatter than it is long, as anything lying on the ground is.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the dark brown spots scattered over the pale cap, the green glow in both eye sockets and between the ribs, the wide grinning jaw, and the bare ivory bone — no flesh, no clothes.
· Panel 8: lying still on its back, spread out, eyes shut — head to the left, lying exactly as panel 7 lies. Panels 7 and 8 are not mirror images of each other.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

## Snaggletusk — death  (models/snaggletusk.png + death-snaggletusk.png → images/deaths/snaggletusk.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/snaggletusk.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-snaggletusk.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· A STYLISED, blocky boar-beast — cartoon-chunky, never a realistic wild boar, and never furry or shaggy. Its huge slab of a head is half of the whole animal: a broad flat snout with a dark iron ring through it, two curved white tusks sweeping up from the lower jaw, two small close-set orange eyes in a dark mask-like patch, and one small pointed ear on top. Behind the head a barrel body, hunched high at the shoulder, with a short ridge of stiff black bristle spikes along the neck and back, and pale scar scratches on the flank. Four SHORT thick legs with pale bone-coloured hooves. Charcoal-brown hide, darker at the head.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the iron ring through the snout, the two white curved tusks, the small orange eyes in their dark patch, the short black bristle ridge, the pale scars on its flank and the pale hooves.
· It wears and carries NOTHING: no clothes, loincloth, rags, belt, weapon or shield. Add none.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — it rears up onto its hind legs, head flung up in a last snort, eyes blazing.
· panel 2: it staggers — back down, the front legs buckling and folding under it, the head swinging low.
· panel 3: the front knees give — chest and chin pitching down toward the dirt, the hind legs folding too.
· panel 4: it keels over — the whole body going over onto its far flank, the legs kicking out.
· panel 5: impact — it lands on its side, low and flat along the ground, the legs thrown out straight and stiff: front legs forward, hind legs back.
· panel 6: a small bounce — still lying the same way round as panel 5, the body jolted up just a finger's width off the ground by the impact, the legs kicking.
· panel 7: settling — lying on its flank along the ground, legs stretched out, the head flat on the dirt, the eyes closing, whatever burned in it guttering out.
· panel 8: fallen — the same body in the same place as panel 7, lying still on its flank with its legs stretched out stiff, facing the same way, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· FACING: image 1 faces LEFT, and so does every one of the 8 panels — head at the LEFT end, rump at the other, in all of them. Never mirror it. It stays side-on all the way down and keels over onto its far flank, its legs stiff, never tucked under it.
· NOT A WALK. It is dying in all 8 panels: it never walks, trots, charges or stands square on all fours. Panel 1 rears, 2-4 collapse, and from panel 5 it is ON THE GROUND — the body flat along the dirt and the head down in the dirt with it, not held up.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the iron ring through the snout, the two white curved tusks, the small orange eyes in their dark patch, the short black bristle ridge, the pale scars on its flank and the pale hooves.
· Every panel faces LEFT: its head is at the LEFT end of its panel in all 8. None is mirrored.
· Panel 8: lying still on its flank, legs out stiff, eyes shut — facing LEFT like every other panel, and lying exactly as panel 7 lies.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

## Thornwick — death  (models/thornwick.png + death-thornwick.png → images/deaths/thornwick.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/thornwick.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-thornwick.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· A short, stumpy DEAD TREE that walks, stylised and chunky: a thick gnarled dark-brown trunk standing on two splayed root feet, with a hollow knot in the trunk holding a pale green-white glow and a small dark face inside it. One arm is a bare branching limb; the other is a long curling thorny whip covered in black spikes. A crown of bare branching twigs on top. It has NO leaves, no foliage, no berries, no bark texture painted as fur. It is NOT a man made of wood: no shoulders, no waist, no hips, no thighs, no knees, no hands with fingers — the trunk runs straight from the crown down into the roots, and the two arms are branches growing out of it.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the glowing pale green-white hollow face in the trunk, the long curling thorn-whip arm, the crown of bare twigs, the splayed root feet and the cracked dark bark.
· It wears and carries NOTHING: no clothes, loincloth, rags, belt, weapon or shield. Add none.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — still on its feet, jolted up onto its toes, arms flung up and out with the hands open, head snapped back, eyes wide and blazing.
· panel 2: it staggers — the knees buckle and it sags onto one foot, arms windmilling for balance (one up, one down), the head starting to loll.
· panel 3: the knees go — sunk low on bent knees, rocking back the other way, the arms still flailing.
· panel 4: falling — going over backwards and sideways toward the panel's left, the feet kicked out from under it, arms thrown wide, the light in its eyes dimming.
· panel 5: impact — it lands flat on its back on a diagonal across the panel, head toward the left, flattened against the ground, arms and legs slapping down spread wide.
· panel 6: a small bounce — still lying the same way round as panel 5, the whole body jolted up just a finger's width off the ground by the impact (it does not jump or stand), arms and legs flopping up, the eyes closing.
· panel 7: settling — lying the same way round again, the limbs going slack where they fell: one arm flung out past the shoulder, the other down along its side, the legs splayed in a V, the head rolled onto one cheek.
· panel 8: fallen — the same body in the same place as panel 7, lying still on its back, spread out and limp, head still to the left, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· From panel 5 on it lies on its BACK on a diagonal across the panel, head to the left, arms and legs spread out on the ground — flatter than it is long, as anything lying on the ground is.
· HOW THIS ONE FALLS, where the panels above describe a body it does not have: It falls the way a tree is felled: the whole trunk tips over stiffly in one piece and slams down, roots lifting off the ground. It has no knees to buckle and no hands to catch itself — what flails is the branch arm and the thorn whip, and they end up flung out on the ground on either side of the fallen trunk.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the glowing pale green-white hollow face in the trunk, the long curling thorn-whip arm, the crown of bare twigs, the splayed root feet and the cracked dark bark.
· Panel 8: lying still on its back, spread out, eyes shut — head to the left, lying exactly as panel 7 lies. Panels 7 and 8 are not mirror images of each other.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

## Marrow Knight — death  (models/marrowknight.png + death-marrowknight.png → images/deaths/marrowknight.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/marrowknight.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-marrowknight.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· A SHORT, STOCKY skeleton knight seen front-on — chunky proportions, big head and armour on small legs, never a tall realistic knight. A dark iron helmet with two curved horns over a pale skull, with bright ice-blue flames burning in both eye sockets. Dark iron plate on its shoulders (big rounded pauldrons, one spiked) with a bare pale ribcage showing at the chest, a brown leather tabard hanging from its waist, a dark cloak behind, bare bone arms and legs, iron boots.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the two curved horns on the helmet, the ice-blue flames in both eye sockets, the bare ribcage between the plates, the brown tabard and the cloak behind it.
· It holds a straight greatsword, as long as it is tall, held point-down at its side, and that is all the gear it has. Add nothing else.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — still on its feet, jolted up onto its toes, arms flung up and out with the hands open, head snapped back, eyes wide and blazing.
· panel 2: it staggers — the knees buckle and it sags onto one foot, arms windmilling for balance (one up, one down), the head starting to loll.
· panel 3: the knees go — sunk low on bent knees, rocking back the other way, the arms still flailing.
· panel 4: falling — going over backwards and sideways toward the panel's left, the feet kicked out from under it, arms thrown wide, the light in its eyes dimming.
· panel 5: impact — it lands flat on its back on a diagonal across the panel, head toward the left, flattened against the ground, arms and legs slapping down spread wide.
· panel 6: a small bounce — still lying the same way round as panel 5, the whole body jolted up just a finger's width off the ground by the impact (it does not jump or stand), arms and legs flopping up, the eyes closing.
· panel 7: settling — lying the same way round again, the limbs going slack where they fell: one arm flung out past the shoulder, the other down along its side, the legs splayed in a V, the head rolled onto one cheek.
· panel 8: fallen — the same body in the same place as panel 7, lying still on its back, spread out and limp, head still to the left, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· From panel 5 on it lies on its BACK on a diagonal across the panel, head to the left, arms and legs spread out on the ground — flatter than it is long, as anything lying on the ground is.
· Anything in its hand flies loose at the blow and lies on the ground beside it from panel 5 on; anything strapped on stays on.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the two curved horns on the helmet, the ice-blue flames in both eye sockets, the bare ribcage between the plates, the brown tabard and the cloak behind it.
· Panel 8: lying still on its back, spread out, eyes shut — head to the left, lying exactly as panel 7 lies. Panels 7 and 8 are not mirror images of each other.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

## Cinderhound — death  (models/cinderhound.png + death-cinderhound.png → images/deaths/cinderhound.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/cinderhound.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-cinderhound.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· A gaunt grey hound seen side-on, stylised and lean: a long narrow head with bared teeth and one pale staring eye, ears swept back, a thin neck, a deep narrow chest with the ribs showing through cracked grey hide, a bony back, long thin legs, and a thin tail. A mane of ORANGE FLAME burns along its shoulders and back, ember-orange cracks glow between its ribs, and the tip of its tail burns and trails smoke. Charcoal-grey hide, no fur detail.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the burning orange mane along its back, the glowing ember cracks over its ribs, the burning smoking tail-tip, the pale staring eye and the cracked grey hide.
· It wears and carries NOTHING: no clothes, loincloth, rags, belt, weapon or shield. Add none.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — it rears up onto its hind legs, head flung up in a last snort, eyes blazing.
· panel 2: it staggers — back down, the front legs buckling and folding under it, the head swinging low.
· panel 3: the front knees give — chest and chin pitching down toward the dirt, the hind legs folding too.
· panel 4: it keels over — the whole body going over onto its far flank, the legs kicking out.
· panel 5: impact — it lands on its side, low and flat along the ground, the legs thrown out straight and stiff: front legs forward, hind legs back.
· panel 6: a small bounce — still lying the same way round as panel 5, the body jolted up just a finger's width off the ground by the impact, the legs kicking.
· panel 7: settling — lying on its flank along the ground, legs stretched out, the head flat on the dirt, the eyes closing, whatever burned in it guttering out.
· panel 8: fallen — the same body in the same place as panel 7, lying still on its flank with its legs stretched out stiff, facing the same way, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· FACING: image 1 faces LEFT, and so does every one of the 8 panels — head at the LEFT end, rump at the other, in all of them. Never mirror it. It stays side-on all the way down and keels over onto its far flank, its legs stiff, never tucked under it.
· NOT A WALK. It is dying in all 8 panels: it never walks, trots, charges or stands square on all fours. Panel 1 rears, 2-4 collapse, and from panel 5 it is ON THE GROUND — the body flat along the dirt and the head down in the dirt with it, not held up.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the burning orange mane along its back, the glowing ember cracks over its ribs, the burning smoking tail-tip, the pale staring eye and the cracked grey hide.
· Every panel faces LEFT: its head is at the LEFT end of its panel in all 8. None is mirrored.
· Panel 8: lying still on its flank, legs out stiff, eyes shut — facing LEFT like every other panel, and lying exactly as panel 7 lies.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

## Rattlejack — death  (models/rattlejack.png + death-rattlejack.png → images/deaths/rattlejack.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/rattlejack.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-rattlejack.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· A skinny, rickety skeleton seen front-on, stylised and knobbly: a bare pale skull under a dented rusty iron COOKING POT worn as a helmet (a plain bucket shape, no visor), one eye socket glowing red and the other dark, a narrow ribcage, thin bone arms and legs with knobbly joints, and a torn dark-red rag hanging from its hips.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the rusty cooking-pot helmet, the single red-glowing eye socket, the torn red rag at its hips, the rusty cleaver and the round wooden shield.
· It holds a rusty meat cleaver raised in one hand, and a round wooden shield with a pale skull painted on it strapped to the other arm, and that is all the gear it has. Add nothing else.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — still on its feet, jolted up onto its toes, arms flung up and out with the hands open, head snapped back, eyes wide and blazing.
· panel 2: it staggers — the knees buckle and it sags onto one foot, arms windmilling for balance (one up, one down), the head starting to loll.
· panel 3: the knees go — sunk low on bent knees, rocking back the other way, the arms still flailing.
· panel 4: falling — going over backwards and sideways toward the panel's left, the feet kicked out from under it, arms thrown wide, the light in its eyes dimming.
· panel 5: impact — it lands flat on its back on a diagonal across the panel, head toward the left, flattened against the ground, arms and legs slapping down spread wide.
· panel 6: a small bounce — still lying the same way round as panel 5, the whole body jolted up just a finger's width off the ground by the impact (it does not jump or stand), arms and legs flopping up, the eyes closing.
· panel 7: settling — lying the same way round again, the limbs going slack where they fell: one arm flung out past the shoulder, the other down along its side, the legs splayed in a V, the head rolled onto one cheek.
· panel 8: fallen — the same body in the same place as panel 7, lying still on its back, spread out and limp, head still to the left, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· From panel 5 on it lies on its BACK on a diagonal across the panel, head to the left, arms and legs spread out on the ground — flatter than it is long, as anything lying on the ground is.
· Anything in its hand flies loose at the blow and lies on the ground beside it from panel 5 on; anything strapped on stays on.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the rusty cooking-pot helmet, the single red-glowing eye socket, the torn red rag at its hips, the rusty cleaver and the round wooden shield.
· Panel 8: lying still on its back, spread out, eyes shut — head to the left, lying exactly as panel 7 lies. Panels 7 and 8 are not mirror images of each other.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

## Skewer — death  (models/skewer.png + death-skewer.png → images/deaths/skewer.webp)

```text
A SPRITE SHEET: 8 panels of THIS creature dying. Two images come with this prompt, in this order:
  IMAGE 1 — `models/skewer.png` — THE CHARACTER: one frame of this exact creature,
     exactly as the game shows it. Every panel shows this individual.
  IMAGE 2 — `death-skewer.png` — THE ANIMATION: the game's own rough placeholder
     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body
     are in each panel, and where the body ends up lying — and take nothing else
     from it: not its limb lengths, shapes, colours, details or style. Image 2 is
     a flat stand-in; image 1 is the creature.

THE CHARACTER — copy it from image 1 into every panel:
· A small STYLISED WYRMLING seen side-on, facing the left of the panel — a lean four-limbed dragonet, chunky and cartoon-solid, never a realistic lizard and never cute. A long low barrel body in dull sea-green scales with a pale sand-yellow belly, a row of short dark spines down its back. A long neck thrust forward and low into a narrow wedge head with a heavy jaw, five small white teeth along it, one pale curved horn swept back off the brow, a crest of short bone spines behind the skull, and one round ORANGE eye with a small dark pupil. Two membrane wings, rust-orange and leathery, each spread on three clawed fingers with a scalloped trailing edge. Four short legs tucked up under the belly, each ending in three pale claws. A long whipping tail ending in a flat bone BLADE.
· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: the single orange eye, the pale swept-back horn, the bone crest behind the skull, the dark spines down its back, the rust-orange membrane wings on three clawed fingers, the pale sand belly and the flat bone blade at the end of its tail.
· It wears and carries NOTHING: no clothes, loincloth, rags, belt, weapon or shield. Add none.
· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size
  against the body, the limbs the same length and thickness. It does not grow taller,
  leaner or more realistic while it flails, falls and lies spread out.
· The same face, colours and markings as image 1.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and
  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.
· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.
· Menacing and worn, not cute — it is the same grim creature the player has been fighting.

THE ANIMATION — 4 across and 2 rows, read left to right along the top row, then the bottom row.
These lines are for you to read. Never write them, or any other words, in the image:
· panel 1: the blow lands — still in the air, the whole body jolted upward and back, wings thrown wide and high, neck arched, head flung up, the eye blazing.
· panel 2: it stalls — the wings stop beating and start to drag, the body pitching nose-down as it begins to drop, the tail whipping up behind.
· panel 3: falling — wings half folded and trailing above it, the body tipping over onto its near flank as it comes down, legs loose, the light in its eye dimming.
· panel 4: it hits the ground — landing along its side, low and flat, the neck stretched out ahead of it, the wings crumpling under and over the body.
· panel 5: flat out — lying on its flank along the ground, head and jaw flat in the dirt, the tail stretched straight out behind, one wing folded over the body and one under it.
· panel 6: settling — the same body in the same place as panel 5, still flat on the same flank and facing the same way. Only its edges move: a wing slipping down, the tail dropping the last inch. It does NOT rise, stand, hover, fly, flap or lift off the ground — nothing about this panel is higher than panel 5.
· panel 7: going out — lying exactly as in panel 5 and 6, limbs slack where they fell, the jaw open against the dirt, the eye closing, the fire in it guttering out.
· panel 8: fallen — the same body in the same place again, lying still on its flank with the neck stretched out and the wings crumpled, facing the same way, eye shut and every inner light out. It has NOT turned round, rolled over or got up between the panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small.
· FACING: image 1 faces LEFT, and so does every one of the 8 panels — head at the LEFT end, rump at the other, in all of them. Never mirror it. It stays side-on all the way down and keels over onto its far flank, its legs stiff, never tucked under it.
· NOT A WALK. It is dying in all 8 panels: it never walks, trots, charges or stands square on all fours. Panel 1 rears, 2-4 collapse, and from panel 5 it is ON THE GROUND — the body flat along the dirt and the head down in the dirt with it, not held up.
· HOW THIS ONE FALLS, where the panels above describe a body it does not have: It FLIES — there are no knees to buckle and no feet to be kicked out from under it. It goes down the way a flying thing does: the wings stall and are thrown wide, then drag, then fold in against its flank as it drops, and it lands along its side with the neck stretched out, the tail trailing straight behind and the wings crumpled under and over it. It never stands, kneels or falls onto its back. ONCE IT IS DOWN IT STAYS DOWN: from the panel it lands in to the last one it is lying flat along the ground on the same flank, facing the same way, and it never gets up, stands, hovers, flies, perches or crouches again. The "small bounce" is the body jolted a hand's width off the dirt and dropping straight back onto it — not the creature rising, and not it taking off.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, broken or severed parts, or anything red and wet.
· NO puddle, pool, splash or liquid under or around it — the game paints its own.
· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"
  eyes, stars, sweat drops or other cartoon symbols.

LAYOUT — the grid is cut blindly:
· EXACTLY 8 panels: 4 across, 2 rows. Not 1, not 4, not 12, not 16 — do not add a row. One big painting is the wrong answer.
· Each panel is exactly 1/4 of the width and 1/2 of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of
  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart, and
  the whole sheet is thrown away.
· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,
  titles, captions or numbers anywhere. Between two creatures there is nothing but the
  same flat magenta as everywhere else.
· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies
  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.
· One soft contact shadow under the body, and nothing else behind it — no scenery.

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

BEFORE YOU CALL IT FINISHED:
· 8 panels, 4 across and 2 down, with no borders and no words.
· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.
· Its marks are all there: the single orange eye, the pale swept-back horn, the bone crest behind the skull, the dark spines down its back, the rust-orange membrane wings on three clawed fingers, the pale sand belly and the flat bone blade at the end of its tail.
· Every panel faces LEFT: its head is at the LEFT end of its panel in all 8. None is mirrored.
· Panel 8: lying still on its flank, legs out stiff, eyes shut — facing LEFT like every other panel, and lying exactly as panel 7 lies.
· Everything that is not the creature is flat, vivid #FF00FF.

OUTPUT: one image, 1680 x 720 pixels (21:9, landscape). If your tool has an
aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid
and cannot be cut. No labels, captions, numbers or watermarks.
```

---

The last block is the SQUAD's own fall, and it works the same way: the character
model (`art-sheets/models/survivors.png`, the three survivors as the game shows
them) first, then the layout. One sheet covers every outfit and both of the poses
a fall is held on, so it is one generation for the whole crowd. The game plays the
same fall, drawn, until it exists — see `SURVIVOR_FALLS`.

## Survivors, down  (models/survivors.png + fall-survivors.png → images/heroes/fallen.webp)

```text
A SPRITE SHEET: 6 panels of the squad's own survivors going down.
Two images come with this prompt, in this order:
  IMAGE 1 — `models/survivors.png` — THE CHARACTERS: the three survivors, exactly as the
     game shows them, left to right. Every panel is one of these three.
  IMAGE 2 — `fall-survivors.png` — THE LAYOUT: the game's own rough placeholder
     drawing of the fall. FOLLOW ITS POSES — where the head, pack, arms, legs and
     boots are in each panel, how far over the body is, and where on the ground it
     ends up — and take nothing else from it: not its limb lengths, shapes,
     colours, details or style. Image 2 is a flat stand-in; image 1 is who these
     people are.

WHAT IT IS: The squad's own survivors — the same three hooded runners, stopped and going down. Same coat, same pack with the bedroll lashed across the top, same hood with its tie-tails, same heavy boots, same short hand-cannon.

THE CHARACTERS — copy them from image 1:
· They are seen from BEHIND and they have NO FACE in this game — it is never
  drawn. A body lying face UP is a character that does not exist, and it is the
  one way this sheet comes back unusable. Face DOWN, always: what the viewer sees
  of a fallen survivor is the pack, the back of the hood and the soles of its
  boots.
· Their PROPORTIONS stay exactly as in image 1: the same small head against the
  same big pack, the same limb lengths and thickness. Nobody gets taller, leaner
  or more realistic on the way down.
· The pack stays ON the back, shut, with the bedroll still lashed across it.
  Nothing spills out of it and nobody carries anything new.

THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:
· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the
  shadow side.
· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain
  and rough cel-style shadow shapes. No smooth vector shading, no gradients, no
  glossy highlights.
· The same muted, desaturated colours as image 1, and the same key light from the
  UPPER LEFT.

THE GRID — 3 columns across, 2 rows down, read left to right along the top
row, then the bottom row. These lines are for you to read; never write them, or
any other words, in the image:
· The COLUMNS are the three survivors, in image 1's order: column 1 teal,
  column 2 amber, column 3 violet. A column is ONE person at two moments —
  top and bottom of column 1 are the same individual in the same coat — and the
  three coats never swap columns.
· ROW 1, panels 1-3: CRASHED — it has run into something solid and is going down where it stands. Stopped dead: the knees buckle and the hips drop, the leg on the left folding under it and the other trailing, the body sagging down over them, both arms flung out and open, the head dropped and the hood tipped over. It is FALLING, not kneeling — nothing about it is balanced, and it is not standing, walking, crouching or taking a knee to fire. Keep it UPRIGHT and folding, exactly as image 2 has it: the game turns this picture over itself as it plays the fall, so a body already laid down here is a body that lands twice.
· ROW 2, panels 4-6: FALLEN — the body, lying still on the road where it came down. Face DOWN on a shallow diagonal across the panel, head end to the panel's left and the boots to the right, the pack up toward the viewer, both arms spread out slack where they landed, the legs splayed apart, the SOLES of both boots turned up to the viewer, the hood's tie-tails spilled on the ground beside the head. Limp and completely still, and flatter than it is long, as anything lying on the ground is. Its hand-cannon lies dropped on the ground by one hand.
· column 1 — a muted teal wool coat, slate trousers, an oiled brown pack, a bone-cream hood — the coat's teal is its identity in the crowd.
· column 2 — a tarnished amber-brown leather coat, charcoal trousers, a dark pack, a grey-linen hood — the amber is its identity in the crowd.
· column 3 — a dusk-violet cloak-coat, slate trousers, a brown pack, a pale blue-grey hood — the violet is its identity in the crowd.
· All 6 are going down or already down. Not one of them stands, walks, runs,
  fights, aims, sits up, kneels to fire or turns to look at the viewer.
· Every body goes over toward the panel's left, the same way in all 6. The game
  mirrors the picture itself for a body thrown the other way, so a mirrored panel
  gives it two survivors falling into each other.

FOR CHILDREN — this game is played by kids:
· NO blood, gore, wounds, torn clothing, broken or severed parts, nothing red and
  wet.
· NO puddle, pool, splash or stain under or around them.
· Defeat is the POSE and the slack limbs, nothing else. No "X" eyes (there are no
  eyes to draw), no stars, no sweat drops, no cartoon symbols. It has to read as
  "this one is down" the way a dropped bundle does.

LAYOUT — the grid is cut blindly:
· EXACTLY 6 panels: 3 across, 2 rows. Not 1, not 3, not 8, not
  12 — do not add a row or a column. One big painting of a fallen survivor is
  the wrong answer however well it is painted, and so is a square canvas.
· Each panel is exactly 1/3 of the width and 1/2 of the height.
· SIZE — measure it against the PANEL, not against the paper. A crumpled survivor
  covers about two thirds of its panel's width and four fifths of its height; a fallen
  one about four fifths of the width and half of the height — exactly as image 2
  draws them. If yours reaches the edges of its panel it is about twice the size
  it should be. The empty magenta around each body is not waste: it is the box the
  game blits the panel into, and a body painted out into it is a body drawn too
  big in play.
· WHERE each body sits in its panel is not a composition choice. The bottom of
  each panel is the road, at the same height as in image 2 — that is the line the
  survivor's feet stood on and the line the game puts the picture back on. Do not
  re-centre a body in its panel, do not tidy the arrangement, do not even out the
  spacing.
· Leave a clear band of flat magenta between neighbouring panels, at least a tenth
  of a panel wide. Nothing — an arm, a boot, the gun, a shadow — may touch or
  cross a panel edge. Two panels that run into each other cannot be cut apart.
· NO panel borders, frames, lines, boxes or gutters, and NO text, titles, captions
  or numbers anywhere. Do NOT draw a ground line, floor or horizon: one soft
  contact shadow under each body, tight to it, and nothing else — no road, no
  rubble, no scenery, no obstacle. The thing each one crashed into is drawn by the
  game and must not be in the picture.

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

BEFORE YOU CALL IT FINISHED:
· 3 panels across, 2 down, 6 in all — no borders and no words.
· Every panel is one of image 1's three survivors, in its own coat colour, with
  its pack shut on its back, carrying nothing new.
· Not one of them is face up, and not one of them is on its feet.
· There is empty magenta above the bodies in the bottom row, and that space is NOT
  room for another row.
· The canvas is landscape, half again as wide as it is tall (3:2).
· Every pixel that is not a survivor is flat, vivid #FF00FF — hold it against a
  pure magenta swatch, not against your memory of one.

OUTPUT: one image, 960 x 640 pixels (3:2, landscape). If your tool has an
aspect-ratio control, set it to 3:2 — a square or 16:9 return crushes the grid and
cannot be cut. No labels, captions, numbers or watermarks.
```
