import { MONSTERS } from '@/game/monsters'
import {
  DOWN_ART_ID, DOWN_FALL_SIDE, DOWN_POSES, OUTFITS, type DownPose
} from '@/game/heroSprites'
import { DEATH_FRAME_ASPECT, MONSTER_FRAME_H, deathFallSide } from '@/game/monsterSprites'
import { bossDesigns } from '@/game/foes'
import { HERO_PX } from '@/game/heroSprites'
import { ART_FOLDERS, type ArtKind } from '@/game/art'
import { ART_CATALOGUE } from '@/game/artCatalogue'
// From the pure module, not the renderer: this manifest must load under plain
// Node for `pnpm art:prompts` (see `tools/ts-resolve.mjs`).
import { BOLT_BOX, GATE_FRAME, ROCKET_BOX } from '@/game/artBoxes'
import { BANNER } from '@/game/uiArt'

/**
 * ─── Art sheet manifest ─────────────────────────────────────────────────────
 *
 * Survivalist draws everything procedurally, which is wonderful for payload and
 * useless for one specific job: handing the art to somebody — or something —
 * that paints. There is no folder of PNGs to send. This module describes the
 * REFERENCE SHEETS that bake the whole cast out of the renderer, so the art can
 * leave, be repainted in a dark-fantasy hand, and come back in as drop-ins.
 *
 * Two shapes of sheet:
 *
 *   WALKS   a grid of panels showing one creature through one locomotion
 *           cycle. Each panel is the bake's own frame box scaled up, so a
 *           painted strip drops straight back in with the feet on the same
 *           line and nothing downstream has to be told where they are.
 *   STILLS  one object per image. A still is a one-frame walk to the slicer,
 *           which is what gives every prop, round and effect the same fit
 *           step the creatures get: the return is measured against the
 *           reference and normalised onto it, so a crate painted with a
 *           polite margin still fills its box in play.
 *
 * THE BOX IS THE CONTRACT. Every still is drawn by the renderer's OWN painter
 * (`useSurvivalArt`) into exactly the rectangle the renderer blits the
 * painting back into. Get the bench and the runtime out of step and every
 * painted part is the wrong size, everywhere, invisibly — so the bench never
 * carries a size of its own; it reads the same constants the painters do.
 *
 * Nothing here imports a canvas. The manifest says WHAT goes on each sheet and
 * WHERE the result belongs; `ArtSheets.vue` knows how to paint it.
 */

// ─── Walk cycles ────────────────────────────────────────────────────────────

/** Panels per sheet. Eight reads as a walk; sixteen is twice the drift. */
export const WALK_FRAMES = 8

/** Grid, chosen so the sheet lands on a clean ratio that every tool offers. */
export const WALK_COLS = 4
export const WALK_ROWS = WALK_FRAMES / WALK_COLS

/**
 * One panel, px. A panel is the bake's own frame box scaled up, so its shape
 * is the frame's: a monster's frame is 156 x 176 and its panel 320 x 360 —
 * 4 x 320 by 2 x 360 is 1280 x 720, exactly 16:9 (the 0.3% the two ratios
 * differ by is far inside what the strip counter tolerates). A survivor's
 * frame is square and its panel 320 x 320, for a 2:1 sheet.
 */
export const WALK_PANEL_W = 320
export const MONSTER_PANEL_H = 360
export const HERO_PANEL_H = 320

export interface WalkSpec {
  kind: 'monster' | 'hero'
  /** The DESIGN or OUTFIT id — `images/<kind>s/<id>.webp` is where it lands. */
  id: string
  file: string
  target: string
  name: string
  /** What it is, in the dark-fantasy register: the prompt's `WHAT IT IS`. */
  blurb: string
  /** The hue identity, as a sentence a painter can follow. */
  colour: string
  /** Which way the design is authored. Left-facers are NOT flipped for export:
   *  the strip has to match the bake it replaces, and the battlefield does its
   *  own mirroring by travel direction. Survivors are seen from behind. */
  faces: 'left' | 'right' | 'front' | 'back'
  cols: number
  rows: number
  frames: number
  panelW: number
  panelH: number
  w: number
  h: number
  /** Output cap for one frame's tall edge, px. The bake's own frame is the
   *  floor of what is worth shipping; more than twice it is payload. */
  maxEdge: number
}

/**
 * The cast, restyled.
 *
 * Every entry keeps its SILHOUETTE — the shape the player has learned to read
 * at 40 px is the whole of the character's identity in play — and pushes the
 * rendering into the grim register: cracked hide, bone, rust, ember light.
 * The bench's taglines ("cute-evil imp") describe the drawing; these describe
 * the painting the drawing is asking for.
 */
const DARK_CAST: Record<string, { blurb: string; colour: string }> = {
  grumpling: {
    blurb: 'A gremlin-imp: a skull-sized head on a runt body, all underbite and needle teeth, torn bat-ears with one drooping lower than the other, oversized clawed feet, a pale sunken belly. It shuffles, permanently unimpressed. Menacing, not cute — a thing that bites ankles.',
    colour: 'mossy sick green hide going grey at the joints, a bone-pale belly, two small ember-coal eyes.'
  },
  bonecap: {
    blurb: 'Fungal undead: a hunched human skeleton whose skull is swallowed by a great pale toadstool cap with gills underneath, spore-light glowing in the empty sockets and between the ribs, mycelium threading the yellowed bone, one arm longer than the other.',
    colour: 'bone ivory, a cap of bruised grey-cream with dark spots, the light a poison green.'
  },
  snaggletusk: {
    blurb: 'A boar-beast, side on: low, heavy and forward — a hulking bristled boar with one great cracked tusk and a broken stump where the other was, scarred hide, a ridge of black bristles, small furious eyes, hooves that gouge. Built to hit a wall and keep going.',
    colour: 'ash-brown hide, black bristles, a dirty ivory tusk, ember eyes.'
  },
  wispling: {
    blurb: 'A lantern ghost: a tattered floating shroud with no body inside it, a cold flame burning where a face should be, two hollow eyes that never blink together, rags trailing that never touch the ground. Sinister, not endearing.',
    colour: 'a faded grey-teal linen shroud, the flame cold blue-white, nothing warm anywhere on it.'
  },
  marrowknight: {
    blurb: 'An armoured skeleton knight, front on: dented black-iron plate over yellowed bone, a horned great-helm with cold light in the visor slit, a notched greatsword held low, a rotting tabard over the cuirass. It waits rather than lurches — the one that outranks the rest.',
    colour: 'blackened iron, bone, a tabard in dried-blood red gone brown, the visor light cold blue.'
  },
  nibbler: {
    blurb: 'A bat-imp: mostly ears and mouth — two huge ragged ears, one torn, a gaping needle-toothed maw, small red eyes, leathery wings folded round it like a cloak, hooked feet.',
    colour: 'dusk-purple hide going black at the ears, wing membrane a bruised plum, ivory teeth, ember-red eyes.'
  },
  cinderhound: {
    blurb: 'A burning hound, side on: all legs and ribs — a starved skeletal dog with embers glowing between its ribs, fire licking off its spine, a long muzzle of black teeth, hide cracked with heat lines, a tail that is a wisp of smoke. The fast one, and it is starving.',
    colour: 'ash grey and charcoal, the cracks and ribs ember orange, white-hot eyes.'
  },
  blorp: {
    blurb: 'A swamp ooze: a heaving mound of murky slime with a bone and a skull suspended inside it, a wide toothless grin that is not friendly, two mismatched bubble eyes, dripping at the edges.',
    colour: 'bog green shading to black, a sick yellow-green highlight on the wet crest, the bones inside bone-white.'
  },
  thornwick: {
    blurb: 'A bramble treant: a slow, patient tree-thing made entirely of black thorns and dead wood, a hollow face split into the trunk with a pale witch-light burning inside it, roots for feet, bramble-whips for arms, a crown of bare branches.',
    colour: 'dead bark black-brown, near-black thorns, the light in the face a pale sick green-white, a few dead leaves in rust.'
  },
  rattlejack: {
    blurb: 'A scrap skeleton: a jittering human skeleton in stolen scraps of armour, a dented iron cooking pot worn as a helm, a rusted cleaver, bones tied together with wire, one socket lit. No plan whatsoever.',
    colour: 'yellowed bone, rust-brown iron, a tatter of faded red cloth, the lit socket ember-red.'
  },
  dustmoth: {
    blurb: 'A crypt moth, front on, wings spread: a great dusty moth with tattered wing edges and two staring eyespots on the forewings, a furred thorax, dangling hooked legs, feathery antennae. Sinister — the eyespots are watching.',
    colour: 'dust grey and dead-leaf brown, the eyespots ringed in bone and bruise-purple, a faint cold shimmer on the wing scales.'
  },
  skewer: {
    blurb: 'A wyrmling, side on: a small fast serpentine dragon that is almost entirely the pointy end — a spear-pointed head, a long neck, small ragged bat wings, a whipping tail.',
    colour: 'slate green scales going black along the spine, a dull bone belly, a hot yellow slit of an eye.'
  },
  gloomcrow: {
    blurb: 'A bone crow, front on, wings out: a large carrion crow with a bare skull for a head, tattered feathers, a lit socket, a stolen gold trinket clutched in its beak.',
    colour: 'feathers near-black with a cold blue sheen, a bone-white skull, ember-red sockets, the trinket tarnished gold — the only bright thing on it.'
  }
}

/** The survivor, three outfits. One drawing; only the cloth changes. */
const SURVIVOR_BLURB = 'A lone survivor seen from DIRECTLY BEHIND, running away from the viewer up the road: a hooded figure in a ragged coat with the hood up, a battered leather pack with a bedroll lashed across the top, a short black-iron hand-cannon held forward in both hands so only the stock and a hint of barrel show above one shoulder, heavy boots. Head down, leaning into the run, the hood\'s tie-tails streaming behind. The tails are the one part that reads at 16 px — keep them. It RUNS: one leg straight and planted, the other folded up behind with the sole of its boot showing, exactly as each panel of the reference has it.'

/**
 * What each panel of the survivor's sheet IS.
 *
 * Stated per panel because the first returns held one pose for two panels and
 * jumped to the next — the reference of the time had the same near-duplicates
 * (a side-view stride turned round), and a painter copies what it is shown.
 * The order is the bench's own sampling: `paintSurvivorFrame` takes the middle
 * of each panel's slice of the stride, with the legs half a cycle apart and a
 * run's short stance, which puts these eight moments on these eight panels.
 */
const HERO_PANELS = [
  'left foot planted well forward, that leg straight; the right leg folding up behind, its boot three quarters of the way to the seat',
  'left foot planted under the hips; the right boot at the TOP of its swing, folded tight, its SOLE turned to the viewer',
  'left foot planted behind, pushing off; the right leg unfolding, its boot coming down and forward',
  'FLIGHT — both feet off the ground: the left boot just leaving the road behind, the right boot about to land in front',
  'right foot planted well forward, that leg straight; the left leg folding up behind, its boot three quarters of the way to the seat',
  'right foot planted under the hips; the left boot at the TOP of its swing, folded tight, its SOLE turned to the viewer',
  'right foot planted behind, pushing off; the left leg unfolding, its boot coming down and forward',
  'FLIGHT — both feet off the ground: the right boot just leaving the road behind, the left boot about to land in front'
]

const heroPanelScript = (): string[] => [
  '',
  'READ THE PANELS — it is a RUN, and the legs are the whole animation.',
  'Top row left to right is panels 1 to 4, bottom row 5 to 8. In every panel',
  'the body, pack, hood, arms and gun are IDENTICAL; only the legs change, and',
  'they change exactly as the reference draws them:',
  ...HERO_PANELS.map((p, i) => `· panel ${i + 1}: ${p}.`),
  '· The legs stay UNDER the hips and never splay out sideways into a V, never',
  '  cross, never skate. The stride runs INTO the screen, so a foot goes UP',
  '  (folding behind, sole showing) or DOWN (planted) — not left or right.',
  '· No two panels are the same pose. Panels 1-4 and 5-8 are the two halves of',
  '  one stride with the other leg leading.',
  '· The camera is square behind the back: the pack faces the viewer flat-on,',
  '  both shoulders show equally, and the face never shows. Do not turn the',
  '  figure three-quarters on to show the gun.'
]

const OUTFIT_COLOUR: Record<string, string> = {
  teal: 'a muted teal wool coat, slate trousers, an oiled brown pack, a bone-cream hood — the coat\'s teal is its identity in the crowd.',
  amber: 'a tarnished amber-brown leather coat, charcoal trousers, a dark pack, a grey-linen hood — the amber is its identity in the crowd.',
  violet: 'a dusk-violet cloak-coat, slate trousers, a brown pack, a pale blue-grey hood — the violet is its identity in the crowd.'
}

const walkOf = (
  kind: 'monster' | 'hero', id: string, name: string, blurb: string, colour: string,
  faces: WalkSpec['faces'], panelH: number, frameH: number
): WalkSpec => ({
  kind,
  id,
  file: `walk-${kind === 'hero' ? 'hero-' : ''}${id}`,
  target: `${ART_FOLDERS[kind]}/${id}.webp`,
  name,
  blurb,
  colour,
  faces,
  cols: WALK_COLS,
  rows: WALK_ROWS,
  frames: WALK_FRAMES,
  panelW: WALK_PANEL_W,
  panelH,
  w: WALK_COLS * WALK_PANEL_W,
  h: WALK_ROWS * panelH,
  // Twice the bake's frame: a boss is the same design at 2.5x, and past that
  // the strip is the heaviest thing the game downloads.
  maxEdge: frameH * 2
})

export const MONSTER_WALKS: WalkSpec[] = MONSTERS.map((m) => {
  const dark = DARK_CAST[m.id]
  return walkOf('monster', m.id, m.name,
    dark?.blurb ?? m.tagline, dark?.colour ?? '', m.faces, MONSTER_PANEL_H, MONSTER_FRAME_H)
})

export const HERO_WALKS: WalkSpec[] = OUTFITS.map((o) =>
  walkOf('hero', o.id, `Survivor (${o.id})`, SURVIVOR_BLURB,
    OUTFIT_COLOUR[o.id] ?? '', 'back', HERO_PANEL_H, HERO_PX))

export const WALKS: WalkSpec[] = [...MONSTER_WALKS, ...HERO_WALKS]

// ─── The squad going down ───────────────────────────────────────────────────
//
// One sheet for the whole squad's death: three outfits ACROSS by the two poses
// a fall is held on DOWN (`heroSprites.DOWN_POSES`) — the body crumpling against
// whatever stopped it, and the body lying on the road.
//
// One sheet and not one per outfit, which is how the walks are done, because the
// three survivors are the SAME person in three coats and a fall is a pose rather
// than a cycle. Three separate rolls came back, on the boss deaths, as three
// creatures that fell differently; here the three bodies are in one picture and
// a painter cannot make them disagree. It is also one roll instead of three, and
// six panels of one small figure is well inside what a painter holds together —
// the deaths' eight was not.
//
// TWO poses, not a boss's eight. The owner asked for one ("1 frame is enough —
// after the unit got killed it immediately transitions to dead state"), and the
// second is the IMPACT, which is what the eye needs to read a landing and is the
// answer to the other half of the ask: a survivor that runs into a barricade
// crumples against it.
//
// THE REFERENCE IS THE POSE. It is the game's own drawn fall
// (`heroSprites.drawSurvivorDown`, the same frames the crowd plays until a
// painting exists), and the survivors' own PAINTED walk goes with it as the
// character model — the biggest lesson from the boss deaths, which came back as
// other creatures entirely until the model image was attached first.

/** Outfits across. The panel order the renderer reads is `downPanelIndex`. */
export const FALL_COLS = OUTFITS.length
/** Held poses down. */
export const FALL_ROWS = DOWN_POSES.length
export const FALL_FRAMES = FALL_COLS * FALL_ROWS

/**
 * One panel, px: the hero walk panel's box exactly — square, same size, same
 * feet line. A fallen survivor is blitted through the same box a running one is
 * (`HERO_FOOT_R`, `HERO_HEIGHT_R`), so the painting has to be that box or the
 * body lands somewhere the feet never were. 3 x 320 by 2 x 320 is 960 x 640,
 * exactly 3:2 — a ratio every image tool offers, which the 3:1 of a single row
 * of three would not have been.
 */
export const FALL_PANEL = HERO_PANEL_H

/**
 * How much of a panel each pose fills, in words a painter can check. Measured
 * off the exported reference — `pnpm art:falls` prints the same fractions it
 * writes into `sheet-index.json` as the `fit`.
 *
 * They are in the prompt because "small in its panel" is not a judgement and
 * "four fifths of the width" is: every part of this pipeline that came back at
 * twice its size came back from a prompt with an adjective where these are.
 */
const FALL_SPAN: Readonly<Record<DownPose, { w: string; h: string }>> = {
  crash: { w: 'two thirds', h: 'four fifths' },
  fallen: { w: 'four fifths', h: 'half' }
}

/** What each pose IS, for the painter — the words for the drawing in that row. */
const FALL_POSES: Readonly<Record<DownPose, string>> = {
  crash: 'CRASHED — it has run into something solid and is going down where it'
    + ' stands. Stopped dead: the knees buckle and the hips drop, the leg on the left'
    + ' folding under it and the other trailing, the body sagging down over them, both'
    + ' arms flung out and open, the head dropped and the hood tipped over. It is'
    + ' FALLING, not kneeling — nothing about it is balanced, and it is not standing,'
    + ' walking, crouching or taking a knee to fire. Keep it UPRIGHT and folding,'
    + ' exactly as image 2 has it: the game turns this picture over itself as it plays'
    + ' the fall, so a body already laid down here is a body that lands twice.',
  fallen: 'FALLEN — the body, lying still on the road where it came down. Face DOWN'
    + ' on a shallow diagonal across the panel, head end to the panel\'s left and the'
    + ' boots to the right, the pack up toward the viewer, both arms spread out slack'
    + ' where they landed, the legs splayed apart, the SOLES of both boots turned up'
    + ' to the viewer, the hood\'s tie-tails spilled on the ground beside the head.'
    + ' Limp and completely still, and flatter than it is long, as anything lying on'
    + ' the ground is. Its hand-cannon lies dropped on the ground by one hand.'
}

export interface FallSpec {
  /** The probe kind, and so the folder: the squad's own. */
  kind: 'hero'
  /** The id under it. One sheet covers every outfit, so not an outfit id. */
  id: string
  file: string
  target: string
  name: string
  blurb: string
  /** The poses, top row first — the sheet's rows. */
  poses: readonly DownPose[]
  cols: number
  rows: number
  frames: number
  panelW: number
  panelH: number
  w: number
  h: number
  maxEdge: number
  faces: WalkSpec['faces']
  /**
   * The CHARACTER MODEL attached as the FIRST image, relative to `art-sheets/`:
   * the three survivors as the game shows them, written by
   * `tools/art-models.mjs`. See `DeathSpec.model` — same lesson, same fix.
   */
  model: string
}

export const SURVIVOR_FALLS: FallSpec[] = [{
  kind: 'hero',
  id: DOWN_ART_ID,
  file: 'fall-survivors',
  target: `${ART_FOLDERS.hero}/${DOWN_ART_ID}.webp`,
  name: 'Survivors, down',
  blurb: 'The squad\'s own survivors — the same three hooded runners, stopped and'
    + ' going down. Same coat, same pack with the bedroll lashed across the top, same'
    + ' hood with its tie-tails, same heavy boots, same short hand-cannon.',
  poses: DOWN_POSES,
  cols: FALL_COLS,
  rows: FALL_ROWS,
  frames: FALL_FRAMES,
  panelW: FALL_PANEL,
  panelH: FALL_PANEL,
  w: FALL_COLS * FALL_PANEL,
  h: FALL_ROWS * FALL_PANEL,
  // The walk's cap: same survivor, same scale, same payload decision.
  maxEdge: HERO_PX * 2,
  faces: 'back',
  model: 'models/survivors.png'
}]

/**
 * A ready-to-paste prompt for the squad's fall.
 *
 * Written from `promptForDeath`'s shape, because it is the same job one size
 * down and the same three things go wrong: it comes back as somebody else (so
 * the character model is image 1 and the layout image 2), it comes back as a
 * tidy grid of figures on their feet (so every clause says they are going down),
 * and it comes back with something a child should not see. It adds the
 * survivor's own trap: this character has no FRONT.
 */
export const promptForFall = (f: FallSpec): string => {
  // `<` rather than `=== 1`: the side is a fixed constant, and a comparison
  // against the value it is not is a type error rather than a question.
  const SIDE: 'left' | 'right' = DOWN_FALL_SIDE < 0 ? 'left' : 'right'
  const cols = OUTFITS.map((o) => o.id)
  return [
    `# ${f.id} — ${f.name}  (${f.target})`,
    '',
    `A SPRITE SHEET: ${f.frames} panels of the squad's own survivors going down.`,
    'Two images come with this prompt, in this order:',
    `  IMAGE 1 — \`${f.model}\` — THE CHARACTERS: the three survivors, exactly as the`,
    '     game shows them, left to right. Every panel is one of these three.',
    `  IMAGE 2 — \`${f.file}.png\` — THE LAYOUT: the game's own rough placeholder`,
    '     drawing of the fall. FOLLOW ITS POSES — where the head, pack, arms, legs and',
    '     boots are in each panel, how far over the body is, and where on the ground it',
    '     ends up — and take nothing else from it: not its limb lengths, shapes,',
    '     colours, details or style. Image 2 is a flat stand-in; image 1 is who these',
    '     people are.',
    '',
    `WHAT IT IS: ${f.blurb}`,
    '',
    'THE CHARACTERS — copy them from image 1:',
    '· They are seen from BEHIND and they have NO FACE in this game — it is never',
    '  drawn. A body lying face UP is a character that does not exist, and it is the',
    '  one way this sheet comes back unusable. Face DOWN, always: what the viewer sees',
    '  of a fallen survivor is the pack, the back of the hood and the soles of its',
    '  boots.',
    '· Their PROPORTIONS stay exactly as in image 1: the same small head against the',
    '  same big pack, the same limb lengths and thickness. Nobody gets taller, leaner',
    '  or more realistic on the way down.',
    '· The pack stays ON the back, shut, with the bedroll still lashed across it.',
    '  Nothing spills out of it and nobody carries anything new.',
    '',
    'THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:',
    '· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the',
    '  shadow side.',
    '· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain',
    '  and rough cel-style shadow shapes. No smooth vector shading, no gradients, no',
    '  glossy highlights.',
    '· The same muted, desaturated colours as image 1, and the same key light from the',
    '  UPPER LEFT.',
    '',
    `THE GRID — ${f.cols} columns across, ${f.rows} rows down, read left to right along the top`,
    'row, then the bottom row. These lines are for you to read; never write them, or',
    'any other words, in the image:',
    `· The COLUMNS are the three survivors, in image 1's order: column 1 ${cols[0] ?? ''},`,
    `  column 2 ${cols[1] ?? ''}, column 3 ${cols[2] ?? ''}. A column is ONE person at two moments —`,
    '  top and bottom of column 1 are the same individual in the same coat — and the',
    '  three coats never swap columns.',
    ...f.poses.map((pose, r) =>
      `· ROW ${r + 1}, panels ${r * f.cols + 1}-${r * f.cols + f.cols}: ${FALL_POSES[pose]}`),
    ...OUTFITS.map((o, i) => `· column ${i + 1} — ${OUTFIT_COLOUR[o.id] ?? ''}`),
    `· All ${f.frames} are going down or already down. Not one of them stands, walks, runs,`,
    '  fights, aims, sits up, kneels to fire or turns to look at the viewer.',
    `· Every body goes over toward the panel's ${SIDE}, the same way in all ${f.frames}. The game`,
    '  mirrors the picture itself for a body thrown the other way, so a mirrored panel',
    '  gives it two survivors falling into each other.',
    '',
    'FOR CHILDREN — this game is played by kids:',
    '· NO blood, gore, wounds, torn clothing, broken or severed parts, nothing red and',
    '  wet.',
    '· NO puddle, pool, splash or stain under or around them.',
    '· Defeat is the POSE and the slack limbs, nothing else. No "X" eyes (there are no',
    '  eyes to draw), no stars, no sweat drops, no cartoon symbols. It has to read as',
    '  "this one is down" the way a dropped bundle does.',
    '',
    'LAYOUT — the grid is cut blindly:',
    `· EXACTLY ${f.frames} panels: ${f.cols} across, ${f.rows} rows. Not 1, not ${f.cols}, not ${f.frames + 2}, not`,
    `  ${f.frames * 2} — do not add a row or a column. One big painting of a fallen survivor is`,
    '  the wrong answer however well it is painted, and so is a square canvas.',
    `· Each panel is exactly 1/${f.cols} of the width and 1/${f.rows} of the height.`,
    '· SIZE — measure it against the PANEL, not against the paper. A crumpled survivor',
    `  covers about ${FALL_SPAN.crash.w} of its panel's width and ${FALL_SPAN.crash.h} of its height; a fallen`,
    `  one about ${FALL_SPAN.fallen.w} of the width and ${FALL_SPAN.fallen.h} of the height — exactly as image 2`,
    '  draws them. If yours reaches the edges of its panel it is about twice the size',
    '  it should be. The empty magenta around each body is not waste: it is the box the',
    '  game blits the panel into, and a body painted out into it is a body drawn too',
    '  big in play.',
    '· WHERE each body sits in its panel is not a composition choice. The bottom of',
    '  each panel is the road, at the same height as in image 2 — that is the line the',
    '  survivor\'s feet stood on and the line the game puts the picture back on. Do not',
    '  re-centre a body in its panel, do not tidy the arrangement, do not even out the',
    '  spacing.',
    '· Leave a clear band of flat magenta between neighbouring panels, at least a tenth',
    '  of a panel wide. Nothing — an arm, a boot, the gun, a shadow — may touch or',
    '  cross a panel edge. Two panels that run into each other cannot be cut apart.',
    '· NO panel borders, frames, lines, boxes or gutters, and NO text, titles, captions',
    '  or numbers anywhere. Do NOT draw a ground line, floor or horizon: one soft',
    '  contact shadow under each body, tight to it, and nothing else — no road, no',
    '  rubble, no scenery, no obstacle. The thing each one crashed into is drawn by the',
    '  game and must not be in the picture.',
    '',
    BACKGROUND_RULE,
    '',
    'BEFORE YOU CALL IT FINISHED:',
    `· ${f.cols} panels across, ${f.rows} down, ${f.frames} in all — no borders and no words.`,
    '· Every panel is one of image 1\'s three survivors, in its own coat colour, with',
    '  its pack shut on its back, carrying nothing new.',
    '· Not one of them is face up, and not one of them is on its feet.',
    '· There is empty magenta above the bodies in the bottom row, and that space is NOT',
    '  room for another row.',
    `· The canvas is landscape, half again as wide as it is tall (${f.cols}:${f.rows}).`,
    '· Every pixel that is not a survivor is flat, vivid #FF00FF — hold it against a',
    '  pure magenta swatch, not against your memory of one.',
    '',
    `OUTPUT: one image, ${f.w} x ${f.h} pixels (3:2, landscape). If your tool has an`,
    'aspect-ratio control, set it to 3:2 — a square or 16:9 return crushes the grid and',
    'cannot be cut. No labels, captions, numbers or watermarks.'
  ].join('\n')
}

// ─── Boss deaths ────────────────────────────────────────────────────────────
//
// The one animation in the game that is NOT a loop: eight panels from the
// killing blow to the body lying still, played once across the boss's death
// beat, the last panel held as the corpse the next stage opens beside.
//
// A fall is joints — knees that buckle, arms that flail and drop, a head that
// lolls — and the first version of this sheet had none: its reference was the
// walk frame rolled over like a plank, which a player read, correctly, as a
// standing creature turned on its side. So the death is DRAWN now, by the same
// rigs that walk (`monsterKit`'s "Dying"): the blow, the stagger, the knees
// going, the fall onto its back (or, side-on, onto its flank) and the body
// lying spread out on the ground.
//
// THE REFERENCE IS THE ANIMATION. The painter follows its poses panel by panel
// and paints over them as the finished creature, with the creature's own
// PAINTED walk attached as the identity reference — the painted death has to be
// the same painted creature, or the swap at the kill is a costume change. The
// same drawing is baked as the game's own death until the painting exists
// (`monsterSprites.monsterDeathFrame`), so both tell one fall.

/** Panels in a death. The walk's count and grid, for the walk's reasons. */
export const DEATH_FRAMES = 8
export const DEATH_COLS = 4
export const DEATH_ROWS = DEATH_FRAMES / DEATH_COLS

/**
 * One panel, px: the monster walk panel's height, so the creature is the same
 * size to the pixel, and `DEATH_FRAME_ASPECT` as wide — room for a body lying
 * down. 4 x 420 by 2 x 360 is 1680 x 720, exactly 21:9.
 */
export const DEATH_PANEL_H = MONSTER_PANEL_H
export const DEATH_PANEL_W = Math.round(DEATH_PANEL_H * DEATH_FRAME_ASPECT)

/**
 * How a body goes down depends on how it is drawn (`monsterKit`'s "Dying").
 *
 *   UPRIGHT  drawn front-on and standing tall — a biped, a treant. It goes
 *            over onto its BACK and lies on a diagonal across the panel, head
 *            to the panel's left, arms and legs spread out on the ground.
 *   SIDE     drawn side-on and long — a boar, a hound. It rears, drops onto
 *            its knees and keels over onto its far FLANK, lying low along the
 *            ground with its legs stretched out stiff.
 */
export type DeathStance = 'upright' | 'side'

/**
 * What each panel IS, for the painter — the words for the pose the layout
 * draws there. The timing is `monsterKit.deathBeats` at eight evenly spaced
 * moments, so a line that stops matching its panel is a line to fix here.
 *
 * Plain lowercase on purpose: written as ALL-CAPS headings ("THE BLOW
 * LANDS.") they came back painted into the panels as captions. And nothing
 * here mentions a weapon — "anything it was holding flies out of its hand"
 * got a sword and a shield painted into a boss that never had either. What a
 * boss holds is its own line (`DEATH_IDENTITY`).
 */
const UPRIGHT_POSES: readonly string[] = [
  'the blow lands — still on its feet, jolted up onto its toes, arms flung up and out with the hands open, head snapped back, eyes wide and blazing',
  'it staggers — the knees buckle and it sags onto one foot, arms windmilling for balance (one up, one down), the head starting to loll',
  'the knees go — sunk low on bent knees, rocking back the other way, the arms still flailing',
  'falling — going over backwards and sideways toward the panel\'s left, the feet kicked out from under it, arms thrown wide, the light in its eyes dimming',
  'impact — it lands flat on its back on a diagonal across the panel, head toward the left, flattened against the ground, arms and legs slapping down spread wide',
  'a small bounce — still lying the same way round as panel 5, the whole body jolted up just a finger\'s width off the ground by the impact (it does not jump or stand), arms and legs flopping up, the eyes closing',
  'settling — lying the same way round again, the limbs going slack where they fell: one arm flung out past the shoulder, the other down along its side, the legs splayed in a V, the head rolled onto one cheek',
  'fallen — the same body in the same place as panel 7, lying still on its back, spread out and limp, head still to the left, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small'
]

const SIDE_POSES: readonly string[] = [
  'the blow lands — it rears up onto its hind legs, head flung up in a last snort, eyes blazing',
  'it staggers — back down, the front legs buckling and folding under it, the head swinging low',
  'the front knees give — chest and chin pitching down toward the dirt, the hind legs folding too',
  'it keels over — the whole body going over onto its far flank, the legs kicking out',
  'impact — it lands on its side, low and flat along the ground, the legs thrown out straight and stiff: front legs forward, hind legs back',
  'a small bounce — still lying the same way round as panel 5, the body jolted up just a finger\'s width off the ground by the impact, the legs kicking',
  'settling — lying on its flank along the ground, legs stretched out, the head flat on the dirt, the eyes closing, whatever burned in it guttering out',
  'fallen — the same body in the same place as panel 7, lying still on its flank with its legs stretched out stiff, facing the same way, eyes shut and every inner light out. It has NOT turned round or rolled over between the two panels: this panel is panel 7 gone quiet. The game holds it on screen as the body, so it must read as "defeated" at a glance, even small'
]

export const DEATH_POSES: Readonly<Record<DeathStance, readonly string[]>> = {
  upright: UPRIGHT_POSES,
  side: SIDE_POSES
}

export interface DeathSpec {
  kind: 'death'
  /** The sheet's own id — `death-<design>`, never the bare design, which the
   *  walk of the same creature already answers to. */
  id: string
  /** The boss DESIGN whose death this is. */
  design: string
  file: string
  target: string
  name: string
  blurb: string
  colour: string
  faces: WalkSpec['faces']
  /** How it goes down — see `DeathStance`. Side-on designs are the side ones. */
  stance: DeathStance
  /** The panel side its head ends up on, as authored — see `deathFallSide`. */
  fall: -1 | 1
  cols: number
  rows: number
  frames: number
  panelW: number
  panelH: number
  w: number
  h: number
  maxEdge: number
  /** The walk sheet it borrows its look from. */
  walkFile: string
  /**
   * The CHARACTER MODEL attached as the second image, relative to
   * `art-sheets/`: one frame of the creature's walk as the game shows it,
   * written by `tools/art-models.mjs`. Without it the painter paints a new
   * creature from the words — the first painted death came back as somebody
   * else entirely — so the prompt document names it in the job's heading and
   * the Art Desk attaches it with the layout.
   */
  model: string
}

/** Every boss body, dying. The roster is `foes.ts`'s, so a new boss gets one. */
export const BOSS_DEATHS: DeathSpec[] = bossDesigns().map((design) => {
  const walk = MONSTER_WALKS.find((w) => w.id === design)
  return {
    kind: 'death',
    id: `death-${design}`,
    design,
    file: `death-${design}`,
    target: `${ART_FOLDERS.death}/${design}.webp`,
    name: walk?.name ?? design,
    blurb: walk?.blurb ?? '',
    colour: walk?.colour ?? '',
    faces: walk?.faces ?? 'front',
    stance: walk?.faces === 'left' || walk?.faces === 'right' ? 'side' : 'upright',
    fall: deathFallSide(design),
    cols: DEATH_COLS,
    rows: DEATH_ROWS,
    frames: DEATH_FRAMES,
    panelW: DEATH_PANEL_W,
    panelH: DEATH_PANEL_H,
    w: DEATH_COLS * DEATH_PANEL_W,
    h: DEATH_ROWS * DEATH_PANEL_H,
    // The walk's cap: same creature, same scale, same payload decision.
    maxEdge: walk?.maxEdge ?? MONSTER_FRAME_H * 2,
    walkFile: walk?.file ?? `walk-${design}`,
    model: `models/${design}.png`
  }
})

// ─── Stills ─────────────────────────────────────────────────────────────────

/** Edge of a square still's reference, px. */
export const STILL_SIZE = 512

export interface StillSpec {
  /** Runtime folder — and, for the cast's fixtures, the probe kind. */
  kind: ArtKind
  id: string
  file: string
  /** Path under `public/` the sliced result belongs at. */
  target: string
  /** Resized copies of the same return, for assets that ship at two sizes. */
  extra?: { target: string; size: number }[]
  name: string
  /** The prompt's `WHAT IT IS`. */
  blurb: string
  w: number
  h: number
  /** Output cap for the tall edge, px. The slicer writes every frame at most
   *  256 px tall by default; this can only lower that — unless `exact`. */
  maxEdge: number
  /**
   * `maxEdge` is the size, not a cap: the file is read at exactly that size by
   * something outside the renderer (the PWA manifest reads the logo at 512),
   * so the slicer's 256 default and even a `--size` do not apply to it.
   */
  exact?: true
  /** How the return is registered onto the reference: by its middle, or by
   *  its bottom edge (a thing whose ground line must not move). */
  anchor: 'centre' | 'feet'
  /**
   * `false` for a subject the slicer must NOT fit onto the reference.
   *
   * The fit measures SOLID pixels, and a drawn effect is mostly glow: the
   * muzzle flash's solid core is a third of its visible disc, a bolt's is its
   * dark heart. A painting — opaque strokes, all of it solid — fitted onto
   * that box comes back a third of the size it was painted at. These are
   * placed by the prompt's own words instead ("fills the frame", "the head
   * at 0.7 of the width") and blitted as they arrive.
   */
  fit?: false
  /** What the empty part of the frame must be. */
  bg: 'magenta' | 'opaque' | 'magenta-sky'
  /** Must it join to itself across an edge? */
  tile?: 'x' | 'xy'
  /** The subject fills its frame edge to edge (a crate, a tile). */
  fill?: boolean
  /** Which way it is authored, when the game turns it. */
  authored?: string
  /** What the game paints OVER it — and therefore what must be left out. */
  live?: string
  /** A glow that must stay inside the outline. */
  glow?: boolean
  /** Colourless by contract; the game tints it. */
  greyscale?: boolean
  /**
   * ─── An ANIMATED still ──────────────────────────────────────────────────
   *
   * Panels of one loop, when the subject moves under its own power. Absent, or
   * 1, is an ordinary still.
   *
   * A projectile is the case this exists for. A boss's meteor is a rock inside
   * a fire, and a fire is not a shape — it is a shape changing. Painted as one
   * panel it comes back beautiful and DEAD, because the renderer's only job
   * with a still is to translate it down the road; a player watching it called
   * that exactly what it is: lifeless. The fix is not a live glow drawn around
   * the painting — that is two fires burning at different rates on one rock —
   * it is to paint the fire moving, and the only way to ask a painter for that
   * is to hand them the loop.
   *
   * Everything downstream already handles it. The slicer cuts any grid into one
   * horizontal strip; `spriteStrip.ts` reads the panel count off the returned
   * file rather than from a declaration here, so a design that will not hold
   * for eight panels can come back as four with no code change; and
   * `PaintOpts.cycle` means the drawn fallback and the painted strip play from
   * the same clock, so the drop-in never changes the animation's speed.
   *
   * The grid is the walk's — 4 x 2 — because the walk prompt's panel-count
   * discipline was expensive to arrive at and an image model that has been
   * taught "two rows of four" for one sheet should not be asked for a different
   * shape on the next.
   */
  frames?: number
  cols?: number
  rows?: number
  /**
   * A CHARACTER image attached before the reference, relative to `art-sheets/`,
   * and what the painter is to take from it.
   *
   * The deaths' lesson, applied to a still that has people in it: described in
   * words, a figure is re-invented on every roll, and a cage of strangers is a
   * cage the player has no reason to open. `what` is the prompt's own account
   * of the image — what to copy from it and, as importantly, what not to.
   */
  model?: { file: string; what: string }
  /** What moves between the panels, and what must NOT. The prompt's
   *  `READ THE PANELS`; only meaningful when `frames > 1`. */
  cycle?: string
  /**
   * What each panel IS, one line per frame.
   *
   * The same medicine `HERO_PANELS` is: a painter copies what it is shown, and
   * shown a grid it will happily paint one picture per ROW and repeat it four
   * times. The survivor's stride came back that way three times running until
   * every panel was named, and the roller came back that way twice — a sheet
   * with one ring arrangement across the top row and a second across the
   * bottom, which is two states rather than eight steps.
   *
   * So a cycle whose motion is MECHANICAL — a measurable displacement per
   * frame, rather than free-form flicker — names its panels. Fire does not
   * need this; a turning object does.
   */
  panels?: readonly string[]
}

/** Panels of one loop for an animated still, and the grid they sit in. */
export const CYCLE_FRAMES = 8
export const CYCLE_COLS = 4
export const CYCLE_ROWS = CYCLE_FRAMES / CYCLE_COLS

/** Frames of a spec's loop — 1 for an ordinary still. */
export const framesOf = (s: StillSpec): number => s.frames ?? 1
export const colsOf = (s: StillSpec): number => s.cols ?? 1
export const rowsOf = (s: StillSpec): number => s.rows ?? 1

/** The animation grid, for a subject whose motion has to be painted in. */
const CYCLE = { frames: CYCLE_FRAMES, cols: CYCLE_COLS, rows: CYCLE_ROWS } as const

/**
 * The roller's eight steps, as fractions of ONE RING GAP.
 *
 * Generated rather than typed so the arithmetic cannot drift from
 * `CYCLE_FRAMES`, and stated as a measurement because that is the only kind of
 * instruction a painter cannot satisfy with "roughly the same but dirtier".
 * Panel k is the surface displaced by (k−1)/8 of the gap between two rings —
 * an eighth of a quarter-turn each, which is what the game plays back.
 */
const ROLLER_PANELS: readonly string[] = Array.from({ length: CYCLE_FRAMES }, (_, i) => {
  const nth = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][i]
  if (i === 0) {
    return 'the starting arrangement — one band lies straight across the ball\'s'
      + ' widest point (its horizontal middle). Every other panel is measured'
      + ' from this one'
  }
  const eighths = `${i}/${CYCLE_FRAMES}`
  const step = `every band has slid DOWN by ${eighths} of the gap between two bands`
  if (i * 2 === CYCLE_FRAMES) {
    return `${step} — HALF a gap. This is the panel least like panel 1 and it has`
      + ' to look it: the ball\'s widest point now falls in BARE IRON, exactly'
      + ' midway between two bands, where panel 1 had a band sitting on it'
  }
  if (i === CYCLE_FRAMES - 1) {
    return `${step}. One more step of the same size brings the NEXT band onto the`
      + ' widest point, which is panel 1 again — that is how the loop closes.'
      + ' This panel is the one just before that'
  }
  return `${step} — the ${nth} of eight even steps, so the band that was on the`
    + ' widest point is now a little below it'
})

const still = (
  kind: ArtKind, id: string, name: string, blurb: string,
  o: Partial<StillSpec> = {}
): StillSpec => ({
  kind,
  id,
  file: `still-${kind}-${id}`,
  target: `${ART_FOLDERS[kind]}/${id}.webp`,
  name,
  blurb,
  w: STILL_SIZE,
  h: STILL_SIZE,
  maxEdge: 256,
  anchor: 'centre',
  bg: 'magenta',
  ...o
})

/**
 * The alarm's shared description.
 *
 * One head and one tail around a single colour clause, so the three states are
 * written once and cannot drift apart between edits — the set reads as one
 * object in three colours or it does not read at all.
 */
const WARN_BLURB_HEAD = 'The incoming-attack alarm: a heavy hazard sign, an upward-pointing triangle of battered iron plate with a thick dark bevelled rim, chipped paint and a few scratches, and a bold near-black exclamation mark punched through the middle of it — a tapering bar above a round dot. A sign bolted to a battlefield, not a tidy interface decal.'
const WARN_BLURB_TAIL = 'THE PLATE IS THE ONE HOT ACCENT OF THIS IMAGE: paint it at full strength, the brightest thing in the frame, bright enough to name the colour instantly at a glance. The style rule about desaturated low-key colour applies to the iron rim, the grime and the shadows — NOT to the plate. A plate that has gone grey, brown, black or muddy is a failed image; only the RIM, the bang and the shadows are dark. One of a SET OF THREE identical signs that differ in NOTHING but that colour: the same triangle, the same rim, the same bang, the same wear in the same places. Bold shape and a hard silhouette, no fine detail — it is caught in the corner of the eye while the player is dodging — and the same layout as the reference: apex at the top, wide flat base, filling the frame edge to edge with magenta only in the two upper corners.'

/**
 * ─── The cages' shared description ──────────────────────────────────────────
 *
 * A head, a people clause and a tail around one clause per cage, for the same
 * reason the alarm is written that way: the three are one object at three
 * weights, and three independently worded blurbs drift into three unrelated
 * props within a couple of edits.
 *
 * The head carries the two reads the renderer's drawing was built on (see
 * `drawCages`): a TALL barred box under a hard flat lid, which is what tells a
 * cage from a crate at a glance, and light coming OUT of a dark object — the
 * one warm glow on the roadside. The lamplight is stated the way the alarm's
 * plate had to be, with a midtone hex and the failure named, because a warm
 * accent described in the style's own muted words came back brown.
 *
 * The people are the survivors from BEHIND, faceless, silhouetted against the
 * lamp at the back — the drawn cage's huddled shape, and `cutscenes.md` shot 3,
 * which says the same: they are turned away, looking up the road at the place
 * they were taken from.
 */
const CAGE_HEAD = 'A prisoner cage standing on the ground, seen STRAIGHT ON from the front, flat-on like a crate: a TALL box, a little taller than it is wide, with a heavy flat iron LID across the top that overhangs the bars slightly — a hard, level shelf, the top edge of the whole silhouette — a bottom rail standing on the ground, a post at each side, and FOUR vertical iron bars across the front with clear open gaps between them. It is lit from WITHIN by a lantern hanging at the BACK of the cage, and THE LAMPLIGHT IS THE ONE HOT ACCENT OF THIS IMAGE: a rich warm amber, around #E0902E and brighter toward the lamp, filling the space behind the bars, bright enough to name at a glance from across a phone screen. The BACK and the SIDES of the cage are closed with dark iron sheet, exactly as the reference fills its whole inside: nothing behind the prisoners is see-through, and no background colour shows anywhere inside the frame — light spilling over magenta turns pink, and a pink cage is a failed image. The style rule about desaturated low-key colour applies to the iron and the people — NOT to the light. The iron is cold, dark and dead: gunmetal grey-blue with rust, no paint, no colour of its own. A cage that has gone dark, grey or brown inside is a failed image.'
const CAGE_PEOPLE = 'INSIDE are the prisoners, and they are the survivors from IMAGE 1 — the same people: pointed hoods up, ragged coats in faded teal, ochre and slate, battered packs. They are seen FROM BEHIND exactly as image 1 shows them, turned away from the viewer toward the lamp at the back, so they read as dark hooded silhouettes against the amber light with only a thin rim of lamplight along their hoods and shoulders. NO FACES — this game never draws a survivor\'s face. They are not running: they stand and huddle, pressed together, and one of them has a hand up on a bar. Big simple shapes — at play size the whole cage is about 40 px tall, so each person is a hood and a pair of shoulders, not a portrait.'
const CAGE_TAIL = 'Keep the silhouette the reference draws — a tall barred box under a flat lid, filling the frame from the top of the lid to the bottom rail — and keep every part of it inside that box: nothing hangs off the sides, nothing stands up on the lid, nothing lies on the ground around it.'
const CAGE_OPTS: Partial<StillSpec> = {
  anchor: 'feet',
  glow: true,
  model: {
    file: 'models/survivors.png',
    what: 'THE PEOPLE: the three survivors exactly as the game shows them. Take\n     their look from it — hoods, coats, packs, colours, proportions — and not\n     their running poses; inside the cage they stand still.'
  },
  live: 'The game paints the lamp\'s soft halo around the cage, a white "+N" count above the lid and a hit-point number under the bottom rail, and it shakes and leans the whole cage when it is shot — so paint NO glow outside the bars, NO numbers, NO text, and paint the cage INTACT, upright and still.'
}

const GATE_BLURB = 'A gate FRAME for a magical doorway, seen straight on: two THIN, tall posts, one at each side of the frame, joined by a thin lintel or arch across the top; the whole MIDDLE IS OPEN — flat magenta — because the game paints the glowing curtain, the flowing chevrons and the number plate inside the opening. The posts stand on the road; leave a little magenta under and over them exactly as the reference does.'

/**
 * How wide the reference draws a gate post, in world units.
 *
 * As wide as the game can tolerate: it grows OUTWARD from the door's edge, and
 * a two-leaf bank's inner posts meet at the divider pillar, which hides 0.25
 * units either side of the shared edge. So 0.25 out plus the drawn post's 0.09
 * in. The painting is registered onto this band; in play the drawn post keeps
 * its own 0.18.
 */
export const GATE_REF_POST_W = 0.34

/**
 * The gate frame's geometry, as fractions of the panel.
 *
 * The first returns came back with posts a THIRD of the frame wide — a pair
 * of slabs per side, a pillar the width of a tower — and two re-rolls with
 * the width stated as a fraction changed nothing: an image model does not
 * measure. So the reference now draws the posts at the widest the game can
 * take (`GATE_REF_POST_W`), which is what a painter actually copies, and the
 * slicer re-composes whatever comes back onto this band (`tools/slice-sheets`).
 * Derived from `GATE_FRAME` so nothing here can drift from the cut.
 */
export const GATE_POST = (() => {
  const { w, h, ppu, cap, refHalfW } = GATE_FRAME
  const edge = w / 2 - refHalfW * ppu
  const outer = (edge - (GATE_REF_POST_W - 0.09) * ppu) / w
  const inner = (edge + 0.09 * ppu) / w
  return {
    width: inner - outer,
    outer,
    inner,
    doorway: 1 - 2 * inner,
    /** Where the nine-slice cuts, as a fraction of the width. */
    cut: cap / w,
    /** The posts' foot, as a fraction of the height. */
    bottom: (h / 2 + (0.75 + 0.12) * ppu) / h,
    /** How much of the doorway span, from the top, is kept as the lintel. */
    lintel: 0.4
  }
})()

const pct = (v: number): string => `${Math.round(v * 100)}%`

export const STILLS: StillSpec[] = [
  // ── Props ──
  still('prop', 'crate-damage', 'Supply crate (damage)',
    'A supply crate: a square iron-banded strongbox of dark oak planks with riveted black-iron corners and a faint sickly-GREEN painted seal or band on its face. Square and flat-on.',
    { fill: true, live: 'The game paints a green chevron badge, a glowing rim and an HP number over the middle of the face, so keep the CENTRE plain and readable and put the detail at the edges.' }),
  still('prop', 'crate-rate', 'Supply crate (rate)',
    'A supply crate: a square iron-banded strongbox of dark oak planks with riveted black-iron corners and a cold BLUE painted seal or band on its face. Square and flat-on. Its sibling is the same crate banded green, and the two must be tellable apart by the colour of the band alone.',
    { fill: true, live: 'The game paints a blue bolt badge, a glowing rim and an HP number over the middle of the face, so keep the CENTRE plain and readable and put the detail at the edges.' }),
  still('prop', 'barricade', 'Barricade block',
    'A barricade block: a rough wall of mortared dark stone with bone and rusted iron scraps set into it, seen flat-on. Fully opaque, edge to edge.',
    { fill: true, tile: 'x', bg: 'opaque', live: 'The game paints hazard chevrons, a damage bar and an HP number over it, so keep it mid-tone and quiet — texture, not objects.' }),
  still('prop', 'boulder-1', 'Boulder (1 of 3)',
    'An unbreakable boulder: one heavy irregular lump of dark grey rock, squat and wide, cracked, with a lit crown edge upper-left and deep shadow lower-right. NO metal, NO number, NO glow, nothing that could be read as a meter — the absence of a number IS the mechanic. Fills most of the frame.',
    { fill: true }),
  still('prop', 'boulder-2', 'Boulder (2 of 3)',
    'An unbreakable boulder: one heavy irregular lump of dark grey rock, taller than it is wide with a split down one side, cracked, with a lit crown edge upper-left and deep shadow lower-right. NO metal, NO number, NO glow, nothing that could be read as a meter. Fills most of the frame.',
    { fill: true }),
  still('prop', 'boulder-3', 'Boulder (3 of 3)',
    'An unbreakable boulder: one heavy irregular lump of dark grey rock, rounded with a flat top, cracked, with a lit crown edge upper-left and deep shadow lower-right. NO metal, NO number, NO glow, nothing that could be read as a meter. Fills most of the frame.',
    { fill: true }),
  still('prop', 'barrel', 'Powder keg',
    'A powder keg: a dark riveted black-iron drum standing upright, four fifths as wide as it is tall, with two dull dried-blood-red bands and a crude skull-and-fuse stencil on its face. Intact state only. Centred, the drum filling the frame\'s full height.',
    { live: 'The game paints the damage cracks and the lit strobe over it, so paint it whole and unlit.' }),
  still('prop', 'pillar', 'Divider pillar',
    'A divider pillar: a tall iron post with heavy steel caps top and bottom, its body striped in diagonal black and dull-yellow hazard chevrons, scarred and rusted, seen straight on. Upright, filling the frame\'s full height, the caps a little wider than the shaft.',
    { w: 288, h: 640, maxEdge: 640, fill: true, live: 'NO lamp on top and NO glow — the beacon and the red warning are painted live.' }),
  still('prop', 'coin', 'Coin',
    'A coin pickup: a face-on tarnished gold coin with a grim skull or sigil embossed and a worn, notched edge. It must be round and face-on — the game spins it by squashing it sideways. Fills the frame.',
    { maxEdge: 128, fill: true }),
  // The weapon puzzle's prize, in its two states. Two paintings rather than
  // one recoloured: the whole beat rests on a player reading, from the far end
  // of the road, whether the box is still shut behind its armour or already a
  // pickup, so the states are allowed to look like different objects. See
  // `paintWeaponBoxBody`.
  still('prop', 'weapon-box', 'Weapon case (shut)',
    'A weapon case, shut and dead: a square armoured strongbox of cold grey gun-steel, flat-on, its face a heavy riveted plate recessed inside a thick bevelled frame, with dark sealed seams and scuffed dull-blue paint. NOTHING glows, nothing is warm — it is inert metal, and that is the read. Square and flat-on, filling the frame.',
    { fill: true, live: 'The game paints the weapon glyph and a heavy cross-brace over the middle of the face, so keep the CENTRE plain, flat and mid-tone and put the detail — rivets, bevels, scuffs — around the edges.' }),
  still('prop', 'weapon-box-open', 'Weapon case (open)',
    'The same square armoured strongbox, now UNSEALED and lit from within: the dark steel is banded and edged in hot brass and worn gold, its seams cracked open with warm amber light spilling out, the recessed face plate glowing a rich lamp-gold. Read as a PRIZE across a whole screen — warm, bright, obviously changed from the cold shut one. Square and flat-on, filling the frame.',
    { fill: true, live: 'The game paints the weapon glyph in near-black over the middle of the face, plus damage cracks, a pulsing halo and an expanding ring, so keep the CENTRE plain, bright and readable and put the detail around the edges.' }),

  // …and the two things standing between the crowd and it. The armour is one
  // plate of a pair; the lever is two pieces because half of it swings.
  still('prop', 'guard-plate', 'Weapon-case armour plate',
    'A bolted-on armour plate: a slab of riveted grey-blue battleship steel seen flat-on, its face crossed by two rows of heavy dome rivets, scuffed and streaked with rust runs from the rivet heads. Two of these stand EDGE TO EDGE over the case they protect, so the left and right edges are clean vertical panel edges — a plate, not a crate. Square-ish and flat-on, filling the frame.',
    { fill: true, live: 'The game darkens and reddens the whole plate as it is shot and flashes it white on every hit, so paint it INTACT and evenly lit — no cracks, no holes, no damage of its own.' }),
  still('prop', 'lever-post', 'Lever housing',
    'The housing of a road-side lever: a low, wide iron footing bolted flat to the ground, seen straight on — a squat rusted-steel box with a heavy bevelled lid, four corner bolts and a dark slot across its top where the arm comes out. Low and wide, twice as wide as it is tall, filling the frame.',
    { w: 512, h: 256, fill: true, live: 'The ARM is a separate painting that swings out of the slot, so paint the housing alone — no arm, no handle, nothing standing up out of it.' }),
  still('prop', 'lever-arm', 'Lever arm',
    'The arm of a road-side lever, standing straight UP: a stout iron rod with a wrapped grip, rising from the bottom edge of the frame, and at its top an EMPTY round socket — an open iron ring or claw with nothing in it. The socket must be a hole, not a ball: the game lights a glowing orb inside it. Centred, the rod filling the frame\'s full height, the socket at the very top.',
    { w: 288, h: 512, anchor: 'feet', authored: 'standing UP: the pivot at the bottom edge, the socket at the top. The game swings it over as the lever is pulled', live: 'The knob is painted live INSIDE the socket — red while the lever is live, green once it is pulled — so leave the socket open and unlit.' }),
  // The three cages. One drawing — the game draws them alike at three sizes —
  // and three paintings, because they are three different objects to the
  // player: a box you shoot open, a strongroom a kill unlocks, and the prison
  // the run is walking toward. The people inside are the squad's own, so the
  // survivors' model rides along as image 1. See `paintCageBody`.
  still('prop', 'cage', 'Rescue cage (roadside)',
    `${CAGE_HEAD} ${CAGE_PEOPLE} THIS ONE is the ROADSIDE cage — the one the crowd shoots open — and it has to look like it can be: the smallest and cheapest of the set, rickety and patched. Thin rusted bars, one of them bent outward a little; crude hammered rivets; a dented lid with a rust-eaten edge; a length of frayed rope lashed round one post where it was mended. TWO OR THREE prisoners inside, huddled low. ${CAGE_TAIL}`,
    CAGE_OPTS),
  still('prop', 'cage-sealed', 'Rescue cage (sealed, beside a miniboss)',
    `${CAGE_HEAD} ${CAGE_PEOPLE} THIS ONE is the SEALED cage a miniboss stands beside — bullets do nothing to it, and only that monster's death opens it — so it must look impossible to break: a strongroom of a cage. Thick black-iron corner posts studded with rivets, bars as thick as a wrist, a massive riveted lid, and one heavy CHAIN slung across the front of the bars at hip height, held shut by a single huge black-iron PADLOCK hanging at the centre. FOUR OR FIVE prisoners crowded shoulder to shoulder inside, their hoods and shoulders above the chain. ${CAGE_TAIL}`,
    CAGE_OPTS),
  still('prop', 'cage-warden', 'Warden cage (behind the boss)',
    `${CAGE_HEAD} ${CAGE_PEOPLE} THIS ONE is the WARDEN cage — the prison every boss stands guard in front of, holding the whole squad the player starts the next stage with. It is the thing the entire run is walking toward, so it is the biggest and grimmest of the set: massive black-iron corner posts, bars as thick as spear shafts, a crushing iron-banded lid with a row of short blunt spikes along its FRONT FACE (on the face of the lid, not sticking up above it), a bleached skull wired to the top of each corner post, and a heavy chain wound round both posts. PACKED with prisoners — six to eight hooded heads and shoulders crowded together across the whole width of the cage. ${CAGE_TAIL}`,
    CAGE_OPTS),
  // ── Gates ──
  // `fit: false` on every gate: the slicer RE-COMPOSES a gate return onto the
  // reference's post band and stands it on the ground line, which is the
  // whole registration. Running the fit on top of that was wrong in a way
  // that showed: painted posts are taller than the drawn ones, so the fit
  // shrank the frame about its centre and slid both posts into the doorway.
  still('gate', 'frame-add', 'Gate frame — the door that pays',
    `${GATE_BLURB} THIS ONE is the door that PAYS: clean cold-iron posts lit with pale cyan runes, a faint cold light on the metal, intact. Cold cyan is its identity — nothing warm on it.`,
    { w: GATE_FRAME.w, h: GATE_FRAME.h, maxEdge: GATE_FRAME.h, fit: false }),
  still('gate', 'frame-sub', 'Gate frame — the door that bills',
    `${GATE_BLURB} THIS ONE is the door that BILLS: scorched iron posts with an amber-brown, sooty, dried-blood cast, dull embers in the cracks, intact but ugly.`,
    { w: GATE_FRAME.w, h: GATE_FRAME.h, maxEdge: GATE_FRAME.h, fit: false }),
  still('gate', 'frame-mul', 'Gate frame — the multiplier',
    `${GATE_BLURB} THIS ONE is the MULTIPLIER: posts of dark violet-black iron with deep purple runes — deep VIOLET, never pink and never magenta, because magenta is the background key and would be cut away with the sky.`,
    { w: GATE_FRAME.w, h: GATE_FRAME.h, maxEdge: GATE_FRAME.h, fit: false }),
  still('gate', 'frame-div', 'Gate frame — the trap',
    `${GATE_BLURB} THIS ONE is the TRAP: rusted red-black iron posts, each still ONE pillar of the reference's width, with the top of the post cracked off jagged and a snapped stub above the break, dirty and scorched — a frame that has already failed somebody. Broken means the TOP is broken; the post itself stays a pillar, not a heap of rubble, not a wall.`,
    { w: GATE_FRAME.w, h: GATE_FRAME.h, maxEdge: GATE_FRAME.h, fit: false }),

  // ── Rounds ──
  still('round', 'tracer', 'The crowd\'s round',
    'The crowd\'s round: a short vertical streak of hot lead — a bright white-gold core with a thin ember-orange glow tail below it. It is one of a hundred on screen, so it is a streak, not an object. The streak spans the full height of the frame and about a quarter of its width, centred.',
    { maxEdge: 128, fit: false, authored: 'pointing UP: it flies up the screen, so the bright head is at the TOP and the tail trails DOWN', glow: true }),
  still('round', 'bolt-gunner', 'The gunner\'s round',
    'The gunner\'s round: a fat slow orb of cold cyan witchfire around a dark iron core, with a streaming tail of fading cyan witchfire behind it. Small in its frame — the tail is longer than the head is wide.',
    {
      ...CYCLE, fit: false, glow: true,
      authored: 'pointing RIGHT: the head sits at 0.7 of the width with the tail trailing off to the LEFT. The game turns it to its heading.',
      cycle: 'The IRON CORE and the orb around it do not move, change size or change place between panels — they are the same round, and the game measures its kill against that head. What animates is the WITCHFIRE: the tail licks and gutters, its tongues lengthening and shortening and curling off the axis, and loose sparks drift back down it. Panel 8 must lead back into panel 1.'
    }),
  still('round', 'bolt-boss', 'The healer\'s bolt',
    'The healer\'s bolt: a sickly green orb of necrotic light with a pale core and a trail of guttering green flame behind it. Small in its frame.',
    {
      ...CYCLE, fit: false, glow: true,
      authored: 'pointing RIGHT: the head sits at 0.7 of the width with the tail trailing off to the LEFT. The game turns it to its heading.',
      cycle: 'The ORB and its pale core keep the same size and the same place in every panel — that head is the part that hits. What animates is the necrotic fire around and behind it: the halo breathes in and out, the trail writhes and splits, and flecks of green rot peel off it and fall behind. Panel 8 must lead back into panel 1.'
    }),
  still('round', 'roller', 'The rolling boulder',
    'The rolling boulder: a huge iron-banded stone sphere studded with rusted spikes, dark, with a rim light along its lower edge, seen face-on as it rolls straight at the viewer. The SPHERE is a full circle about three quarters of the frame across, centred — in the reference it spans from 12% to 88% of the width — and the spikes reach out from it into the margin around it, never crossing the frame edge. The sphere is what kills; keep it that size. Its ironwork reads as FOUR evenly spaced bands stacked down its face — flattened ellipses, widest across the middle of the ball and tighter toward its top and bottom edges, studded with rivets. Four bands across the face, evenly spaced, all the way from the top edge to the bottom: not one equator, not a cross, not a cage.',
    {
      ...CYCLE, fit: false, panels: ROLLER_PANELS,
      live: 'Nothing is painted over it any more. The game used to scroll its own bands across the ball to fake the roll; these eight frames ARE the roll, so paint the ironwork and let it turn.',
      cycle: [
        'IT ROLLS, TOWARD THE VIEWER — this is the one sheet in the set where the',
        'object itself moves, and that movement is the whole animation.',
        '',
        'THREE returns have now come back without it. The first was the same ball',
        'copied eight times with sparks added. The second was TWO arrangements,',
        'one repeated across the top row and the other across the bottom, which',
        'plays as a thing that snaps between two poses. The third is the one to',
        'study, because it looked closest and was still not a roll: the bands',
        'slid down the face as four stripes of the SAME WIDTH, evenly spaced,',
        'like a pattern scrolling behind a porthole. Nothing narrowed, nothing',
        'crowded, and the studs never moved at all.',
        '',
        'That is the whole difference, so it is worth stating as geometry rather',
        'than as a feeling. These bands are HOOPS AROUND A SPHERE, not stripes',
        'on a disc, and a hoop on a sphere does two things a stripe never does:',
        '',
        '  · IT NARROWS. A band crossing the widest part of the ball spans',
        '    almost the full width of it. The same band, three quarters of the',
        '    way to the top edge, spans barely half that — and as it reaches the',
        '    edge it shrinks to nothing and is gone. Look at the reference: no',
        '    two bands in a panel are the same width.',
        '  · THEY CROWD. Because they are evenly spaced around the BALL and not',
        '    down the picture, the gaps between them look widest across the',
        '    middle and squeeze together toward the top and bottom edges. Two',
        '    bands near the top edge sit almost on top of each other.',
        '',
        'Get those two right and the ball turns whether or not anything else is',
        'perfect. Get them wrong and no amount of sparks will save it.',
        '',
        'The ball stays exactly the same size and exactly in the same place. What',
        'moves is its SURFACE: the bands, their rivets and any scars or pitting',
        'travel DOWNWARD together across the face — in at the top edge, down over',
        'the middle, out at the bottom — as if the ball were turning toward you.',
        'The rivets ride their band, so they spread apart as the band widens over',
        'the middle and close up again as it narrows toward an edge.',
        '',
        'Across the eight panels the surface travels DOWN by exactly ONE BAND',
        'GAP, in eight even steps of an eighth of a gap each. By panel 8 the',
        'band that started on the ball\'s widest point has moved almost all the',
        'way to where the band below it began, so the next step lands the',
        'following band exactly where the first one started — and that is panel 1',
        'again. The loop closes with no jump. Do not paint a whole revolution.',
        '',
        'The RING OF SPIKES around the outline is the one thing that does NOT',
        'travel. A ball rolling straight at you keeps its silhouette: the spikes',
        'stand out from the edge in the same places in all eight panels, exactly',
        'as the reference draws them. Do not slide them around the rim — that',
        'reads as a ball spinning on the spot rather than rolling at the viewer.',
        'The roll is carried entirely by the face.',
        '',
        'Under it all, sparks struck off the spikes where they bite the road and',
        'a low scorch of dust around the base. Those are the only things that may',
        'vary freely between panels — everything else has to line up.'
      ].join('\n')
    }),
  still('round', 'meteor', 'The boss\'s rock',
    'The boss\'s falling rock: a jagged black stone wrapped in orange fire, a white-hot core around the stone, and a flame tail streaming UPWARD from it — it falls down the screen. The stone sits in the LOWER part of the frame with the tail reaching the top.',
    {
      ...CYCLE, anchor: 'feet', fit: false, glow: true,
      authored: 'falling: the stone low in the frame, the tail rising to the top edge',
      cycle: 'The STONE keeps the same size and very nearly the same place in every panel — it may rock a few degrees, no more, because the game moves it down the screen itself. Everything else BURNS: the flame tail whips and forks, its tongues climbing and falling back, the white-hot shell around the stone flares and dims, and embers tear off the tail and stream away above it. This is the panel the whole sheet is for — the fire must be visibly a different fire in every one of the eight. Panel 8 must lead back into panel 1.'
    }),
  still('round', 'bomb', 'The bomber\'s charge',
    'The bomber\'s charge: a black iron bomb with a lit fuse and a tight ember glow around it. Centred, about half the frame across.',
    {
      ...CYCLE, fit: false, glow: true,
      live: 'The spark walking down the fuse is painted live, so no spark.',
      cycle: 'The IRON BOMB does not move or change size between panels. What animates is the fire: the ember glow around the casing swells and shrinks, and the fuse burns with a flame that licks and flares. It is a fuse burning down, so the fire is a little angrier by panel 8 than at panel 1 — but panel 8 must still lead back into panel 1.'
    }),
  still('round', 'grenade', 'The player\'s grenade',
    'The player\'s grenade: a small iron-grey sphere with a band across its middle, centred, filling most of the frame.',
    { maxEdge: 128, authored: 'level: it tumbles in flight and the game turns it' }),
  // The box is `ROCKET_BOX` in units of the shell's radius, at 80 px per
  // unit: 288 x 512, which is 9:16.
  // ── The shotgun's pellet ──
  //
  // A round, not an effect: it is a solid thing in the air, there are five to
  // nine of them at once, and the whole read of the weapon is that they are
  // SHORT where every other round is a streak.
  still('round', 'pellet', 'The shotgun\'s pellet',
    'A shotgun pellet in flight: a short, fat slug of hot lead — a white-gold core with a stubby ember-orange smear behind it, no longer than it is wide and a half. It is drawn ADDITIVELY over the road, so dark pixels add nothing and the shape has to carry itself IN LIGHT ALONE: there is no ink outline anywhere on it, no black contour, no grey body, no cracks, no metal, no casing and no surface of any kind - this is not an object, it is the glow a round leaves as it goes past. The "INK FIRST" rule in the style block below applies to every other sheet in this game and NOT to this one. Two returns have already come back as a solid inked object (a brass cartridge, then a cracked metal drum with a lit end) and both were unusable. It is one of nine on screen at once, so it has to read as a lump rather than as a line: keep it COMPACT, and nothing like the long thin tracer the squad\'s own rifle fires. Centred, filling most of the frame exactly as the reference does — the game draws it small, and a pellet that leaves a margin here arrives smaller still.',
    { maxEdge: 96, fit: false, glow: true }),
  still('round', 'rocket', 'The launcher\'s rocket',
    'The launcher\'s rocket in flight, nose up: a fat black-iron shell with a blunt warhead, a band of rust round its middle, two or three swept fins at its tail, and a hot exhaust plume streaming DOWN from it — a white-gold core inside ember-orange flame that frays into smoke. The SHELL sits in the upper part of the frame with its nose a little below the top edge and is about half the frame\'s width; the PLUME runs from the fins down to the bottom edge and may be as wide as the frame. It is the heaviest thing the player fires, so it must read as iron, not as a spark.',
    {
      w: ROCKET_BOX.w * 80, h: ROCKET_BOX.h * 80, maxEdge: 256, fit: false, glow: true,
      authored: 'pointing UP: it flies up the screen nose first, so the warhead is at the TOP and the plume trails DOWN. The game turns it to its heading',
      live: 'The blast when it lands is painted live, so no explosion, no smoke ring, just the shell in flight.'
    }),

  // ── Effects ──
  still('fx', 'muzzle', 'Muzzle flash',
    'A muzzle flash: a hot white-gold burst, spiky, TIGHT, with an ember-orange fringe. It is drawn additively over the road, so dark pixels add nothing and the shape has to carry itself in light alone. Centred, filling most of the frame — but every spike stays inside the frame edge, nothing touches it.',
    { maxEdge: 128, fit: false, glow: true }),
  still('fx', 'smoke', 'Smoke puff',
    'A smoke puff: a soft round cloud, densest in the middle, fading to nothing at its edge. Centred, filling the frame.',
    { maxEdge: 192, fit: false, greyscale: true }),
  still('fx', 'scorch', 'Scorch mark',
    'A scorch mark on the road: a soft black-charcoal burn, an ellipse wider than it is tall, darkest in the middle, fading out to nothing at its edge. Charcoal only — no colour, no embers.',
    { w: 512, h: 282, maxEdge: 144, fit: false }),
  still('fx', 'ring-shock', 'Shockwave ring',
    'A shockwave ring: a thin bright white-blue ring, a full circle seen from above, with a hard inner edge and a soft outer glow. TRANSPARENT INSIDE — the ring is stretched flat over the road. The ring itself spans about 89% of the frame, exactly as the reference has it; the glow outside it stays inside the frame edge.',
    { glow: true }),
  still('fx', 'ring-heat', 'Slam telegraph ring',
    'A slam telegraph ring: a thin ember-orange ring, a full circle, hard edge inside, soft heat outside, TRANSPARENT INSIDE. The ring itself spans about 89% of the frame, exactly as the reference has it — it marks the radius the hit lands in, so it must not grow or shrink — and the heat outside it stays inside the frame edge.',
    { glow: true }),
  still('fx', 'ring-heal', 'Heal ring',
    'A heal ring: a thin sickly green ring, a full circle, TRANSPARENT INSIDE. Green is a colour the game uses nowhere else, so it must be unmistakably green. The ring itself spans about 89% of the frame, exactly as the reference has it; any glow outside it stays inside the frame edge.',
    { glow: true }),
  still('fx', 'shield', 'Shield dome',
    'The player\'s shield dome: a translucent cold-blue energy bubble, a full circle seen face-on, with a bright rim, a faint honeycomb texture across the surface and a specular sweep upper-left. The INTERIOR stays mostly transparent — it is stretched over the crowd and the crowd must stay readable through it. The rim spans about 89% of the frame, exactly as the reference has it; its glow outside stays inside the frame edge.',
    { glow: true }),
  still('fx', 'guard', 'Boss guard barrier',
    'The boss\'s guard barrier: a point-up HEXAGON of ember-orange energy, a translucent fill with a hot rim. The hexagon spans about 89% of the frame, exactly as the reference has it; the rim\'s glow outside it stays inside the frame edge.',
    { glow: true }),
  // ── The three marks the later weapons are known by ──
  //
  // Each one is the thing on screen that says which weapon the crowd is
  // carrying, and each is blitted by its own painter — see `useSurvivalArt`.
  still('fx', 'bolt', 'The Dynamo\'s bolt',
    'One tile of a lightning bolt, seen straight on: a vertical column of white-hot electricity with a pale cold-blue glow around it and a jagged spine down the middle, running from the TOP edge of the frame to the BOTTOM edge and touching both — the game stretches it down the road, so a bolt that stops short of either edge arrives in the game with a gap in it. Thin: the column is about a fifth of the frame wide, and the glow around it a third. Nothing else in the frame — no impact, no sparks at the ends, no ground.',
    { w: 288, h: 512, maxEdge: 256, fit: false, glow: true,
      authored: 'pointing UP the road: the column runs the full height of the frame and is stretched along it' }),
  still('fx', 'wisp', 'The thrall\'s wisp',
    'A small cold soul-light: a pale blue-white flame, taller than it is wide, with a bright core and a soft halo — the light that hangs over the head of a body the Gravecall relic has raised. THE FLAME IS THE ONE HOT ACCENT OF THIS IMAGE AND IT IS COLD BLUE: paint the body of it at a luminous ice-blue midtone around #7FD4E8, with a near-white core around #EAFBFF and a soft halo of the same blue. It is the brightest thing in the frame and it must be nameable as BLUE at a glance. The style rule about desaturated low-key colour applies to nothing here: a wisp that comes back grey, white, silver, charcoal or ash is a failed image, and it came back grey once. There is no ink outline around it and no dark mass inside it - the game draws this additively over a dark road, so every dark pixel in the painting disappears and a flame with a black heart arrives as a hole. It is the one pixel that says a walking corpse is on the player\'s side, and it is read at 12 px, so it is a simple bright shape and not a detailed flame. Centred, the flame and its halo filling the frame exactly as the reference does, with the halo stopping at the frame edge.',
    { maxEdge: 96, fit: false, glow: true }),
  still('fx', 'gild', 'The gold burst',
    'A burst of gold: a thin ring of light with coins and glinting shards flying outward through it. THE GOLD IS THE ONE HOT ACCENT OF THIS IMAGE: paint it at a luminous midtone around #E8B93A with near-white glints around #FFF6D8, bright enough to name as GOLD at a glance. The style rule about desaturated low-key colour applies to nothing here, and the game draws this additively over a dark road, so every dark pixel disappears: no ink outlines, no brown, no grey, no dark mass. A burst that comes back tarnished, muddy or grey is a failed image. The ring and the shards are caught at the moment it opens, caught at the moment it opens. It is what a corpse turned to gold leaves behind when it bursts, so it reads as MONEY rather than as fire — no flame, no embers, no orange heat. The ring spans about 70% of the frame and the shards stay inside the frame edge.',
    { glow: true, fit: false }),
  still('fx', 'crest-shield', 'Shield crest',
    'A heater shield crest — flat top, straight shoulders, tapering to a rounded point — in cold blue with a heavy near-black rim, a chief band across the top and a centre rib. Heraldry read at 20 px. Fills the frame.',
    { maxEdge: 128, fill: true }),
  still('fx', 'crest-guard', 'Guard crest',
    'A heater shield crest — flat top, straight shoulders, tapering to a rounded point — in ember-orange and tarnished gold with a heavy dark rim, a chief band across the top and a centre rib: the boss\'s own. Fills the frame.',
    { maxEdge: 128, fill: true }),

  // ── Backdrop ──
  //
  // No road tile. It was painted, and it was worse than the drawing: cobbles
  // big enough to read at all read as OBJECTS under the crowd, which is the one
  // thing the ground must never do. The procedural gravel stays.
  still('bg', 'ridge-far', 'Far ridge',
    'A far parallax ridge: jagged dead peaks with a broken tower or two and a gallows on the skyline. The SKY above the ridge line is solid magenta; everything below the ridge line is SOLID BLACK silhouette — the game tints it per stage, so no colour, no shading, no lights. The ridge line runs at about 40% down the frame.',
    { w: 1536, h: 384, maxEdge: 384, tile: 'x', bg: 'magenta-sky' }),
  still('bg', 'ridge-near', 'Near ridge',
    'A near parallax ridge, lower and closer than the far one: a dune of ruined walls, leaning grave-posts and bare trees. The SKY above the ridge line is solid magenta; everything below it is SOLID BLACK silhouette — the game tints it per stage, so no colour, no shading, no lights. The ridge line runs at about 40% down the frame.',
    { w: 1536, h: 384, maxEdge: 384, tile: 'x', bg: 'magenta-sky' }),

  // ── Marks and the logo ──
  still('ui', 'crown', 'Elite crown',
    'The elite\'s crown: a small three-pointed crown of tarnished gold with a heavy dark rim, its base flat at the bottom of the frame. Read at 20 px — bold shape, no fine detail. Fills the frame.',
    { maxEdge: 128, fill: true }),
  // The banner is nine-sliced by CSS: the outer `BANNER.cap` of the width at
  // each end is kept at true size and the middle is stretched to the title.
  // The prompt states the fraction, and the slicer fits the return onto the
  // reference's plate (it is solid, so the fit is safe), which is what keeps a
  // painted end piece under the CSS cut.
  still('ui', 'ribbon', 'Result banner',
    `The result screen\'s title banner: a long horizontal plate of blackened iron with a swallow-tailed notch cut into each end, bound along its top and bottom edges with a thin line of tarnished gold, a round iron-gold boss beside each notch and a small rivet in each corner. The plate spans the FULL WIDTH and nearly the full height of the frame, exactly as the reference does. All the detail lives in the two END PIECES — the outer ${pct(BANNER.cap)} of the width at each side — because the game keeps those at true size and STRETCHES THE MIDDLE sideways to fit the words: the middle ${pct(1 - 2 * BANNER.cap)} is a plain, flat, dark band with nothing on it but the two gold lines running straight through.`,
    {
      // The cap is on the tall edge, the width here; the plate is 40 px tall
      // on screen and never more than 100 at any DPR.
      w: BANNER.w, h: BANNER.h, maxEdge: BANNER.h,
      live: 'The title is printed in white across the middle band, so the middle stays plain, flat and dark — no emblem, no rune, no glint, no lettering.'
    }),
  still('ui', 'chest', 'The idle treasure chest',
    'The HUD\'s treasure chest: a squat iron-banded strongbox of dark oak seen straight on and a little from above, its domed lid raised a crack so a cold gold light leaks from the gap, a skull-faced iron hasp on the front, riveted black-iron bands and corners. A thing you would loot. Bold shape, no fine detail — it is read at 24 px beside the coin badge — and the same silhouette as the reference: a wide lid over a box, the lid overhanging.',
    { maxEdge: 128 }),
  // The shop's own mark, and NOT the chest: they sit on screen at the same
  // time now — the chest fills with time on the wallet column, the forge opens
  // the upgrade shop from the bottom bar — and two controls that do different
  // things may not be the same drawing.
  still('ui', 'forge', 'The upgrade forge',
    'The upgrade shop button\'s mark: a squat blackened-iron anvil, its horn to the LEFT and its foot splayed, standing under a bold upward chevron of hot molten gold, with two or three sparks flying off it. The anvil\'s face glows orange where the chevron rises off it. Bold shape, no fine detail — it is read at 24 px on a button — and the same layout as the reference: the chevron in the top half, the anvil in the bottom half, both centred and filling the frame.',
    { maxEdge: 128 }),
  still('ui', 'skill-grenade', 'The grenade skill',
    'The grenade skill\'s button icon: a round black-iron bomb with a short fuse curling from its top and a spark on the fuse\'s end — the one the player throws. Bold and simple, read at 24 px on a round button; the same silhouette as the reference, a ball with the fuse to the upper right.',
    { maxEdge: 128 }),
  still('ui', 'skill-shield', 'The shield skill',
    'The shield skill\'s button icon: a heater shield of cold steel with a heavy near-black rim and a raised iron boss, a cold blue witch-light glowing in its centre band — the same cold blue as the dome it raises over the crowd. Bold and simple, read at 24 px on a round button; the same silhouette as the reference.',
    { maxEdge: 128 }),
  // ── The incoming-attack alarm ──
  //
  // THREE signs that differ only in the colour of the plate. The flat SVG they
  // replace was tinted by `currentColor`, which a painting cannot be, and the
  // colour is not decoration: amber is "move", the cold blue is the same blue
  // as the ward the badge is telling the player to stand IN, and the violet is
  // the boss's own gaze. So each state is its own drawable — and the prompts
  // share a head and a tail, because three signs painted in three sessions
  // have to come back as one object in three colours.
  //
  // Read in PERIPHERAL VISION at a tenth of the screen's width while the
  // player's eyes are on the crowd: silhouette first, no fine detail.
  still('ui', 'warn-away', "Alarm — dodge",
    `${WARN_BLURB_HEAD} Its plate is painted a bright WARNING AMBER-ORANGE (about #FFB32E) — a hazard lamp, hot and saturated. ${WARN_BLURB_TAIL}`,
    { maxEdge: 256 }),
  still('ui', 'warn-into', "Alarm — get in",
    `${WARN_BLURB_HEAD} Its plate is painted a bright COLD SOUL-BLUE (about #6ECBFF) — a witch-light, luminous and saturated, not steel and not grey. ${WARN_BLURB_TAIL}`,
    { maxEdge: 256 }),
  still('ui', 'warn-still', "Alarm — hold still",
    `${WARN_BLURB_HEAD} Its plate is painted a strong MID-TONE AMETHYST PURPLE — unmistakably PURPLE at a glance, saturated like a gemstone (midtone about #A855F7, its lit edge about #C77DFF, its shadow a deeper purple about #6B21A8). Two failed attempts to avoid: a plate so dark it reads as black or ash, and a plate so pale it reads as white or lavender. The purple is the plate only — the rim, the bang and the shadows stay near-black. ${WARN_BLURB_TAIL}`,
    { maxEdge: 256 }),

  // The weapon choice. Two cards, seen ONCE, at about a hundred pixels each:
  // the one screen in the game that is allowed a little more detail than a
  // button icon, because it is a prize being presented rather than a control
  // being found. Both are the weapon alone — the plate, the halo and the
  // ribbon are the DOM's — held at the same angle so the pair reads as a set.
  still('ui', 'weapon-card-rocket', 'The launcher card',
    'The stage-3 weapon choice\'s ROCKET LAUNCHER card: a shoulder-fired launcher of blackened iron and dark scorched wood seen three-quarters from the front-left, its muzzle pointing to the upper right, a fat finned rocket seated in the tube with its warhead just showing, a strap and two rivet bands along the barrel, and a hot ember-orange glow inside the mouth of the tube as if a shot is a heartbeat away. Weight and menace: this is the heavy option. Bold silhouette read at 100 px, the same layout as the reference — the weapon diagonal across the frame, filling about nine tenths of it.',
    { maxEdge: 256 }),
  still('ui', 'weapon-card-gatling', 'The gatling card',
    'The stage-3 weapon choice\'s GATLING GUN card: a six-barrelled rotary gun of gunmetal and brass seen three-quarters from the front-left, barrels pointing to the upper right and mid-spin, a cold soul-blue glow between the barrels and a spray of brass casings falling from the breech. Speed and volume: this is the fast option, so everything about it should look like it is already moving. Bold silhouette read at 100 px, the same layout as the reference — the weapon diagonal across the frame, filling about nine tenths of it.',
    { maxEdge: 256 }),
  still('ui', 'logo', 'Title logo',
    'The game\'s title logo: the single word SURVIVALIST in carved bone-and-black-iron dark-fantasy lettering, cracked and chipped, a faint ember glow at the edges. Spelled exactly S-U-R-V-I-V-A-L-I-S-T, in one line, readable at 192 px. Centred, filling about nine tenths of the width.',
    {
      // The file IS the PWA's 512 icon, so 512 is exact rather than a cap the
      // slicer's 256 default may lower.
      w: 1024, h: 1024, maxEdge: 512, exact: true,
      target: 'images/logo/logo_512x512.png',
      extra: [
        { target: 'images/logo/logo_192x192.png', size: 192 },
        { target: 'images/logo/logo_256x256.webp', size: 256 }
      ]
    })
]

// ─── Prompts ────────────────────────────────────────────────────────────────

/**
 * The style lock, in the dark-fantasy register.
 *
 * Written the way the reference project's was: prohibitions from what an
 * image model actually returns beat adjectives about what is wanted. The
 * AVOID list is the cozy-storybook look this cast was drawn in and must leave,
 * the glossy mobile look every model reaches for, and the two ways a "dark"
 * brief goes wrong — photoreal fur and a sepia filter over everything.
 */
const STYLE_HEAD = [
  'STYLE — grim painted dark fantasy, like a plate from a gothic illustrated',
  'bestiary or the key art of a dungeon crawler. Match this in every panel:',
  '· INK FIRST. Heavy hand-drawn contour lines in near-black ink, jagged and',
  '  confident, thick on the shadow side and thin on the lit side, with',
  '  dry-brush breaks. The drawing must look DRAWN — scratchy linework showing',
  '  through the paint.',
  '· PAINTED, NOT RENDERED. Flat blocks of gouache-like paint inside the lines',
  '  with visible brushwork, rough cel-style shadow shapes and a little grain.',
  '  No airbrush, no smooth 3D shading, no plastic gloss.',
  '· DESATURATED, LOW-KEY colour: bone, ash grey, dried blood, rust, bruise',
  '  purple, swamp green, cold slate — with ONE hot accent per subject (ember',
  '  orange, sickly witch-green, cold soul-blue, tarnished gold). Deep shadows',
  '  that fall to black.',
  '· HIGH CONTRAST and cold. The light comes from the UPPER LEFT. Chiaroscuro:',
  '  most of every form in shadow, one edge picked out.',
  '· Gothic, grotesque, worn: cracked bone, rusted iron, torn cloth, wet stone,',
  '  candle-soot. Everything has been through something.',
  '· Menacing rather than cute — but the SILHOUETTE stays readable at 40 px, so',
  '  keep the big shapes simple and put the detail inside them.',
  '',
  'AVOID — this is exactly how earlier attempts went wrong:',
  '· NO cute, cozy, storybook, chibi or plush look. No rounded friendly faces,',
  '  no button eyes, no smiles.',
  '· NO candy-bright, saturated, neon or pastel colour. If it looks cheerful,',
  '  it is wrong.',
  '· NO glossy, plasticky, airbrushed mobile-game rendering. No smooth 3D',
  '  volume, no bevelled edges, no lens flares, no rim-lit chrome.',
  '· NO photorealism and no hyper-detailed fur or scales — this is paint, and it',
  '  is read at thumbnail size.',
  '· NO warm paper, parchment or sepia wash over the whole image. Warmth is an',
  '  accent, not a filter, and the ground is not part of the painting.'
]

const STYLE_TAIL = [
  '· Keep the subject the same subject and silhouette it already has. This is a',
  '  restyle, not a redesign.'
]

/** For a thing that floats in its frame: a creature, a round, an effect. */
export const STYLE_PART = [
  ...STYLE_HEAD,
  '· NO frames, borders, cards, vignettes, matting or paper background behind',
  '  the drawing. Nothing but flat magenta behind it, right up to its outline.',
  ...STYLE_TAIL
].join('\n')

/** For a thing that IS its frame: a crate, a tile, a wall. */
export const STYLE_FILL = [
  ...STYLE_HEAD,
  '· NO frames, borders, cards, vignettes, matting or paper background inside',
  '  the frame. The object itself fills the frame edge to edge, corner to',
  '  corner, and its outer edge is the frame\'s edge.',
  ...STYLE_TAIL
].join('\n')

/**
 * The background clause, stated FIRST.
 *
 * Buried at the bottom under the style it lost every time in the reference
 * project: one return came back on cream parchment, one with the transparency
 * checkerboard painted in as literal pixels, and one with the subject on a
 * card floating in the magenta. Models weight what they read first, and this
 * matters more than any of the styling, because a background that cannot be
 * removed is welded into the sprite forever.
 *
 * The last bullet is not optional. A "muted, low-key" style brief plus a
 * magenta ground produced DUSTY PINK on three consecutive returns — the model
 * applied the palette instruction to the whole image.
 */
export const BACKGROUND_RULE = [
  'BACKGROUND — read this before anything else. It matters more than the style.',
  'Fill every pixel that is not the object itself with solid, flat, pure magenta',
  '#FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.',
  '· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not dusty',
  '  pink, not mauve, not a soft or tinted version of it. Only the true colour can',
  '  be cut away cleanly; a near miss has to be flood-filled instead, and a flood',
  '  fill eats any pale paint it can reach.',
  '· NOT transparent. Transparency gets exported as a grey-and-white CHECKERBOARD',
  '  and then baked into the artwork as though the squares were paint.',
  '· NOT white, cream, black, parchment, paper, or any tinted or textured ground.',
  '· The object must NOT sit on a card, panel, sheet, badge, frame or rectangle of',
  '  any kind. The magenta must touch the outline of the object on every side.',
  '· No drop shadow onto the background, and no vignette.',
  '· The object itself must contain no magenta or hot pink.',
  '· The dark, desaturated palette above is for the OBJECT. The ground is not',
  '  part of the painting and is not toned down with it: it stays a vivid,',
  '  eye-hurting #FF00FF however dark everything else is. Dusty rose, pale pink',
  '  and mauve are the failure this whole clause is about.'
].join('\n')

const GLOW_RULE = [
  'KEEP ANY GLOW TIGHT. A halo, aura or bloom spreading out into the background',
  'is measured as part of the object when the return is fitted back onto the',
  'reference — a wide aura therefore comes back as a tiny object inside a huge',
  'smear. It also cannot be keyed: soft light over magenta turns pink rather',
  'than transparent. Any glow belongs inside the shape\'s own outline, or within',
  'a hair of it.'
].join('\n')

const facing = (f: WalkSpec['faces']): string =>
  f === 'front' ? 'the viewer'
    : f === 'back' ? 'AWAY from the viewer — it is seen from behind'
      : f.toUpperCase()

/**
 * A ready-to-paste prompt for one walk cycle.
 *
 * Almost all of this is about ONE failure: an image model handed eight panels
 * of the same character will happily return eight different characters. So the
 * consistency clause is stated before the style, in the same position and for
 * the same reason `BACKGROUND_RULE` is — it is the thing that makes the result
 * usable or useless, and models weight what they read first.
 */
export const promptForWalk = (w: WalkSpec): string => {
  const hero = w.kind === 'hero'
  const IT = hero ? 'survivor' : 'creature'
  const ITS = hero ? 'survivors' : 'creatures'
  const CYCLE = hero ? 'RUN CYCLE' : 'WALK CYCLE'
  const MOMENT = hero
    ? 'the SAME survivor at a different moment of ONE running stride'
    : 'the SAME creature at a different moment of one step'
  const RATIO = w.w * 9 === w.h * 16 ? '16:9' : w.w === w.h * 2 ? '2:1' : `${w.w}:${w.h}`
  const SHAPE = RATIO === '2:1' ? 'twice as wide as it is tall' : 'landscape, 16:9'

  return [
    `# ${w.id} — ${w.name}  (${w.target})`,
    '',
    'WHAT COMES BACK IS A SPRITE SHEET, NOT A PORTRAIT.',
    `Repaint a ${CYCLE}. The attached sheet is ${w.cols} columns x ${w.rows} rows`,
    `= EXACTLY ${w.frames} panels, read left to right along the top row and then the`,
    `bottom row. Every panel is ${MOMENT}.`,
    '',
    `· ${w.frames} panels. Not 1, not ${w.cols}, not ${w.frames + 4}, not ${w.frames * 2},`
    + ` not ${w.frames * 3}. Exactly ${w.rows} rows of ${w.cols} — do not add a row.`,
    '· ONE big painting of the character filling the canvas is the wrong answer',
    '  however well it is painted, and so is a square canvas.',
    `· The panels are TALLER than the ${IT} on purpose. A low, wide ${IT} leaves`,
    '  empty magenta above itself in every panel, and that space is NOT room for',
    `  another row: ${w.rows} rows of ${w.cols}, with air above each ${IT}, is the whole`,
    `  sheet. A ${w.rows * 2}-row return cannot be cut — that is what came back last time.`,
    '',
    'ONE CHARACTER — read this before anything else.',
    `All ${w.frames} panels must show the same individual:`,
    'identical colours, identical clothing and gear, identical proportions,',
    'identical silhouette, identical markings, identical number of limbs and',
    'horns. Only the POSE changes, and it changes exactly as the reference',
    'shows — same limb positions, same body lean, same head angle.',
    `· ONE colour scheme in every panel. A ${IT} that is grey in one panel and`,
    `  brown in another is not one ${IT} animated, it is several ${ITS} side by`,
    '  side, and the result is unusable.',
    '· Do not redesign it. Do not add or remove parts between panels.',
    '· Do not turn it to face a different direction in any panel.',
    `· Do not re-scale it: the ${IT} must be the same size in every panel, and the`,
    '  same size it is in the reference. Do not move it around inside its panel.',
    `· It faces ${facing(w.faces)} in the reference. Keep that direction in all`
    + ` ${w.frames} panels.`,
    ...(hero ? heroPanelScript() : []),
    '',
    `WHAT IT IS: ${w.name} — ${w.blurb}`,
    ...(w.colour
      ? ['', 'Colour identity (keep the HUE — this is how the player tells it from the',
        `rest of the cast — but grim, desaturated and low-key, never vivid): ${w.colour}`]
      : []),
    '',
    STYLE_PART,
    '',
    'LAYOUT — the grid is a cutting guide, and it is cut blindly.',
    `Each panel is exactly 1/${w.cols} of the width and 1/${w.rows} of the height.`,
    `A ${IT} does NOT fill its panel — it is centred in it, at the size the`,
    'reference draws it, with clear magenta all round.',
    'Never let a limb, tail, weapon or shadow cross into a neighbouring panel.',
    'Do not add, drop, merge or reorder panels.',
    'Do NOT draw the panel edges. No boxes, borders, gutters, guides, rules or',
    'numbers — in ANY colour, magenta included. The magenta is the empty space the',
    `${ITS} sit in, not a grid to draw with: the space BETWEEN two panels is the`,
    `same flat background as the space around each ${IT}, and nothing marks the`,
    'join. The panels are found by measuring, so a drawn line is not a help, it is',
    'a mark that ends up welded into the sprite.',
    '',
    BACKGROUND_RULE,
    '',
    'The feet land on the same line in every panel — the same height from the',
    'bottom of the panel as in the reference. If the feet drift up or down',
    `between panels the ${IT} bobs when it ${hero ? 'runs' : 'walks'}.`,
    '· The reference draws a soft contact shadow under the feet. Keep one, the',
    '  same size in every panel, and keep it tight to the feet.',
    '',
    'BEFORE YOU CALL IT FINISHED, count and check:',
    `· ${w.cols} panels across, ${w.rows} down, ${w.frames} in all — and empty magenta`,
    `  above every ${IT}, with no extra row squeezed into it.`,
    `· The canvas is ${SHAPE}.`,
    `· Every panel holds the same ${IT}, at the same size, in the same colours,`,
    `  facing ${facing(w.faces)}.`,
    '· Every pixel that is not the character is flat, vivid #FF00FF — hold it',
    '  against a pure magenta swatch, not against your memory of one.',
    '',
    `OUTPUT: one image, ${w.w} x ${w.h} pixels (${RATIO}, landscape). If your tool has`,
    `an aspect-ratio control, set it to ${RATIO} — a square return crushes the grid`,
    'and cannot be cut. No labels, captions, numbers or watermarks.'
  ].join('\n')
}

/**
 * Who each boss IS, for whoever paints its death — written from its PAINTED
 * walk (`art-sheets/models/<design>.png`), not from the drawing, because the
 * painting is what the player has been looking at all fight. `looks` is the
 * character in words, proportions first; `holds` is the only gear it has.
 *
 * Words AND the picture, because an image model weighs a prompt's words over
 * its images. The first painted deaths came back as other creatures — a lanky
 * goblin with a loincloth and a mace for the round-headed imp, a tall ragged
 * skeleton with a sword and a shield for the mushroom-capped one — with the
 * character image attached: the words said "gremlin-imp" and "skeleton" and
 * "anything it was holding flies out of its hand", and nothing said how big the
 * head is or that it carries nothing. Repaint a walk and its line goes stale
 * with it: look at the new model and rewrite the line.
 */
export const DEATH_IDENTITY: Readonly<Record<string, {
  looks: string
  holds?: string
  marks?: string
  /**
   * How THIS body falls, when the shared panel lines do not fit it. They are
   * written for something with knees, hips and hands, and a creature built
   * otherwise gets rebuilt to match them: the treant came back as a lanky
   * wooden man with thighs and a waist, because the words said its knees
   * buckled and its legs splayed.
   */
  body?: string
}>> = {
  grumpling: {
    looks: 'An imp with SUPER-DEFORMED, chibi BODY PROPORTIONS — but painted grim and gritty, never cute. Its big round head is as tall as its whole body and legs together (half of its height) and wider than its shoulders. Two BIG angular ears — flat, straight-edged flaps like cut card, not rounded or pointed — stick out sideways and a little up from the top of the head, each about half as long as the head is wide, grey-green outside and dull red-brown inside. A heavy scowling brow over small ember-orange pupils sunk in dark eye hollows (not big glowing eyes), a small snub nose, and a WIDE grin of needle fangs stretched right across the lower face. Under the head a SMALL pear-shaped body, narrower than the head, with a pale belly patch. Thick stubby tube arms, the same thickness all the way down, ending in round knob fists with no fingers or claws; very short stubby legs, shorter than the arms. Mottled dark MOSSY-GREEN skin, going grey only at the limbs.',
    marks: 'the scratched hash-mark scar high on its brow, one eye sunk in a darker ring than the other, dark speckles on the scalp, the dull red-brown inside of both ears, the pale belly patch, and the mottled grey-green skin'
  },
  bonecap: {
    looks: 'A small, bow-legged skeleton wearing a HUGE pale toadstool cap: a smooth dome, wider than the skeleton\'s shoulders by half and about a third of its height, sitting over the skull like an umbrella down to the eye sockets. Stylised and chunky, never anatomical: a big round skull with a wide grinning jaw, a short narrow ribcage, thin bone arms that hang to its knees, knobbly bow legs, big bony feet. Dull green light glows inside the eye sockets and between the ribs. Old ivory bone with a green-grey tinge.',
    marks: 'the dark brown spots scattered over the pale cap, the green glow in both eye sockets and between the ribs, the wide grinning jaw, and the bare ivory bone — no flesh, no clothes'
  },
  snaggletusk: {
    looks: 'A STYLISED, blocky boar-beast — cartoon-chunky, never a realistic wild boar, and never furry or shaggy. Its huge slab of a head is half of the whole animal: a broad flat snout with a dark iron ring through it, two curved white tusks sweeping up from the lower jaw, two small close-set orange eyes in a dark mask-like patch, and one small pointed ear on top. Behind the head a barrel body, hunched high at the shoulder, with a short ridge of stiff black bristle spikes along the neck and back, and pale scar scratches on the flank. Four SHORT thick legs with pale bone-coloured hooves. Charcoal-brown hide, darker at the head.',
    marks: 'the iron ring through the snout, the two white curved tusks, the small orange eyes in their dark patch, the short black bristle ridge, the pale scars on its flank and the pale hooves'
  },
  thornwick: {
    looks: 'A short, stumpy DEAD TREE that walks, stylised and chunky: a thick gnarled dark-brown trunk standing on two splayed root feet, with a hollow knot in the trunk holding a pale green-white glow and a small dark face inside it. One arm is a bare branching limb; the other is a long curling thorny whip covered in black spikes. A crown of bare branching twigs on top. It has NO leaves, no foliage, no berries, no bark texture painted as fur. It is NOT a man made of wood: no shoulders, no waist, no hips, no thighs, no knees, no hands with fingers — the trunk runs straight from the crown down into the roots, and the two arms are branches growing out of it.',
    body: 'It falls the way a tree is felled: the whole trunk tips over stiffly in one piece and slams down, roots lifting off the ground. It has no knees to buckle and no hands to catch itself — what flails is the branch arm and the thorn whip, and they end up flung out on the ground on either side of the fallen trunk.',
    marks: 'the glowing pale green-white hollow face in the trunk, the long curling thorn-whip arm, the crown of bare twigs, the splayed root feet and the cracked dark bark'
  },
  marrowknight: {
    looks: 'A SHORT, STOCKY skeleton knight seen front-on — chunky proportions, big head and armour on small legs, never a tall realistic knight. A dark iron helmet with two curved horns over a pale skull, with bright ice-blue flames burning in both eye sockets. Dark iron plate on its shoulders (big rounded pauldrons, one spiked) with a bare pale ribcage showing at the chest, a brown leather tabard hanging from its waist, a dark cloak behind, bare bone arms and legs, iron boots.',
    holds: 'a straight greatsword, as long as it is tall, held point-down at its side',
    marks: 'the two curved horns on the helmet, the ice-blue flames in both eye sockets, the bare ribcage between the plates, the brown tabard and the cloak behind it'
  },
  cinderhound: {
    looks: 'A gaunt grey hound seen side-on, stylised and lean: a long narrow head with bared teeth and one pale staring eye, ears swept back, a thin neck, a deep narrow chest with the ribs showing through cracked grey hide, a bony back, long thin legs, and a thin tail. A mane of ORANGE FLAME burns along its shoulders and back, ember-orange cracks glow between its ribs, and the tip of its tail burns and trails smoke. Charcoal-grey hide, no fur detail.',
    marks: 'the burning orange mane along its back, the glowing ember cracks over its ribs, the burning smoking tail-tip, the pale staring eye and the cracked grey hide'
  },
  rattlejack: {
    looks: 'A skinny, rickety skeleton seen front-on, stylised and knobbly: a bare pale skull under a dented rusty iron COOKING POT worn as a helmet (a plain bucket shape, no visor), one eye socket glowing red and the other dark, a narrow ribcage, thin bone arms and legs with knobbly joints, and a torn dark-red rag hanging from its hips.',
    holds: 'a rusty meat cleaver raised in one hand, and a round wooden shield with a pale skull painted on it strapped to the other arm',
    marks: 'the rusty cooking-pot helmet, the single red-glowing eye socket, the torn red rag at its hips, the rusty cleaver and the round wooden shield'
  }
}

/**
 * A ready-to-paste prompt for one boss's death.
 *
 * Written against, in the order they cost re-rolls:
 *
 *   1. ANOTHER CREATURE. The death is swapped in at the kill over the painted
 *      walk the player has watched all fight. So the character comes FIRST —
 *      image 1, the model, then its identity in words with the proportions
 *      spelled out — and the layout second, as poses and nothing else. Short:
 *      at ten thousand characters the words drowned the picture.
 *   2. INVENTED GEAR. A prompt that mentions a weapon gets one painted in. Only
 *      a boss whose model holds something is told about it (`holds`); the rest
 *      are told they carry nothing.
 *   3. A COMIC PAGE. Panel lines written as ALL-CAPS headings came back as
 *      captions, with borders drawn round them. The lines are plain, marked as
 *      not-for-the-image, and borders and words are refused outright (and by
 *      the slicer, which will not cut a return with painted panel edges).
 *   4. GORE. The game is played by children: defeat is the pose and the light
 *      going out, and the game paints its own (magic, violet) pool.
 */
export const promptForDeath = (d: DeathSpec): string => {
  const SIDE = d.fall === 1 ? 'right' : 'left'
  const n = d.frames
  const side = d.stance === 'side'
  const who = DEATH_IDENTITY[d.design]
  const poses = DEATH_POSES[d.stance]
  return [
    `# ${d.id} — ${d.name}, defeated  (${d.target})`,
    '',
    `A SPRITE SHEET: ${n} panels of THIS creature dying. Two images come with this prompt, in this order:`,
    `  IMAGE 1 — \`${d.model}\` — THE CHARACTER: one frame of this exact creature,`,
    '     exactly as the game shows it. Every panel shows this individual.',
    `  IMAGE 2 — \`${d.file}.png\` — THE ANIMATION: the game's own rough placeholder`,
    '     drawing of the death. FOLLOW ITS POSES — where the head, arms, legs and body',
    '     are in each panel, and where the body ends up lying — and take nothing else',
    '     from it: not its limb lengths, shapes, colours, details or style. Image 2 is',
    '     a flat stand-in; image 1 is the creature.',
    '',
    'THE CHARACTER — copy it from image 1 into every panel:',
    `· ${who?.looks ?? `${d.name}: ${d.blurb}`}`,
    ...(who?.marks
      ? [`· Its MARKS, the ones the player knows it by — keep every one, in every panel that shows that side: ${who.marks}.`]
      : []),
    who?.holds
      ? `· It holds ${who.holds}, and that is all the gear it has. Add nothing else.`
      : '· It wears and carries NOTHING: no clothes, loincloth, rags, belt, weapon or shield. Add none.',
    '· Its PROPORTIONS stay exactly as in image 1 in every panel: the head the same size',
    '  against the body, the limbs the same length and thickness. It does not grow taller,',
    '  leaner or more realistic while it flails, falls and lies spread out.',
    '· The same face, colours and markings as image 1.',
    '',
    'THE LOOK — paint it the way image 1 is painted, never as a clean cartoon:',
    '· Heavy, scratchy near-black ink contours with dry-brush breaks, thick on the shadow side.',
    '· Flat, gritty gouache-like paint inside the lines, with visible brushwork, grain and',
    '  rough cel-style shadow shapes. No smooth vector shading, no gradients, no glossy highlights.',
    '· The same muted, desaturated colours as image 1; its one hot accent stays as small as it is there.',
    '· Menacing and worn, not cute — it is the same grim creature the player has been fighting.',
    '',
    `THE ANIMATION — ${d.cols} across and ${d.rows} rows, read left to right along the top row, then the bottom row.`,
    'These lines are for you to read. Never write them, or any other words, in the image:',
    ...poses.map((p, i) => `· panel ${i + 1}: ${p}.`),
    ...(side
      ? [
        `· FACING: image 1 faces ${facing(d.faces)}, and so does every one of the ${n} panels — head at the ${facing(d.faces)} end, rump at the other, in all of them. Never mirror it. It stays side-on all the way down and keels over onto its far flank, its legs stiff, never tucked under it.`,
        `· NOT A WALK. It is dying in all ${n} panels: it never walks, trots, charges or stands square on all fours. Panel 1 rears, 2-4 collapse, and from panel 5 it is ON THE GROUND — the body flat along the dirt and the head down in the dirt with it, not held up.`
      ]
      : [`· From panel 5 on it lies on its BACK on a diagonal across the panel, head to the ${SIDE}, arms and legs spread out on the ground — flatter than it is long, as anything lying on the ground is.`]),
    ...(who?.body ? [`· HOW THIS ONE FALLS, where the panels above describe a body it does not have: ${who.body}`] : []),
    ...(who?.holds
      ? ['· Anything in its hand flies loose at the blow and lies on the ground beside it from panel 5 on; anything strapped on stays on.']
      : []),
    '',
    'FOR CHILDREN — this game is played by kids:',
    '· NO blood, gore, wounds, broken or severed parts, or anything red and wet.',
    '· NO puddle, pool, splash or liquid under or around it — the game paints its own.',
    '· The defeat is the pose, the slack limbs and the light going out of its eyes. No "X"',
    '  eyes, stars, sweat drops or other cartoon symbols.',
    '',
    'LAYOUT — the grid is cut blindly:',
    `· EXACTLY ${n} panels: ${d.cols} across, ${d.rows} rows. Not 1, not ${d.cols}, not ${n + 4}, not ${n * 2} — do not add a row. One big painting is the wrong answer.`,
    `· Each panel is exactly 1/${d.cols} of the width and 1/${d.rows} of the height. The creature sits where image 2 puts it, at the size image 2 draws it — no bigger.`,
    '· Leave a clear band of flat magenta between neighbouring panels, at least a tenth of',
    '  a panel wide. Nothing — a limb, a tail, a tusk, a weapon, a shadow — may touch or',
    '  cross a panel edge. Two panels that run into each other cannot be cut apart, and',
    '  the whole sheet is thrown away.',
    '· NO panel borders, frames, lines, boxes or gutters between the panels, and NO text,',
    '  titles, captions or numbers anywhere. Between two creatures there is nothing but the',
    '  same flat magenta as everywhere else.',
    '· In panels 1-3 the feet are at the height image 2 puts them; from panel 5 on the body lies',
    '  where image 2 lays it. Do NOT draw a ground line, floor, horizon or any line under it.',
    '· One soft contact shadow under the body, and nothing else behind it — no scenery.',
    '',
    BACKGROUND_RULE,
    '',
    'BEFORE YOU CALL IT FINISHED:',
    `· ${n} panels, ${d.cols} across and ${d.rows} down, with no borders and no words.`,
    '· Every panel is the creature of image 1 — its proportions, face and colours — carrying nothing new.',
    ...(who?.marks ? [`· Its marks are all there: ${who.marks}.`] : []),
    ...(side
      ? [`· Every panel faces ${facing(d.faces)}: its head is at the ${facing(d.faces)} end of its panel in all ${n}. None is mirrored.`]
      : []),
    side
      ? `· Panel 8: lying still on its flank, legs out stiff, eyes shut — facing ${facing(d.faces)} like every other panel, and lying exactly as panel 7 lies.`
      : '· Panel 8: lying still on its back, spread out, eyes shut — head to the left, lying exactly as panel 7 lies. Panels 7 and 8 are not mirror images of each other.',
    '· Everything that is not the creature is flat, vivid #FF00FF.',
    '',
    `OUTPUT: one image, ${d.w} x ${d.h} pixels (21:9, landscape). If your tool has an`,
    'aspect-ratio control, set it to 21:9 — a square or 16:9 return crushes the grid',
    'and cannot be cut. No labels, captions, numbers or watermarks.'
  ].join('\n')
}

/** The SHEET's pixels — a still is one panel, a cycle is its whole grid. */
export const sheetW = (s: StillSpec): number => s.w * colsOf(s)
export const sheetH = (s: StillSpec): number => s.h * rowsOf(s)

const ratioOf = (w: number, h: number): string =>
  w === h ? 'square (1:1)'
    : w * 9 === h * 21 ? 'landscape, 21:9'
      : w * 9 === h * 16 ? 'landscape, 16:9'
        : w === h * 2 ? 'landscape, 2:1'
          : w * 16 === h * 9 ? 'portrait, 9:16'
            : w > h ? `landscape, ${(w / h).toFixed(2)}:1`
              : `portrait, 1:${(h / w).toFixed(2)}`

const shapeOf = (s: StillSpec): string => ratioOf(sheetW(s), sheetH(s))

/** A ready-to-paste prompt for one still. No grid clause — there is no grid. */
/**
 * The panel-count block for an ANIMATED still.
 *
 * Lifted, deliberately, from `promptForWalk` — the same counting, the same
 * refusals, the same "do not add a row". That discipline was arrived at the
 * expensive way (returns came back as one panel, as a doubled grid, as a
 * contact sheet with captions) and an image model that has been taught one
 * sheet shape for the cast should not be handed a different one for a rock.
 *
 * The one thing it says that a walk's does not: WHAT IS ALLOWED TO MOVE. A
 * creature's whole body moves through a stride, but a projectile is a solid
 * object inside an effect, and only the effect may change. A meteor whose stone
 * grows, shrinks or wanders between panels is a rock that pulses when it falls
 * — and the head of a round is what the game measures its kill against, so a
 * head that moves in the art is a hitbox that lies.
 */
const cyclePrompt = (s: StillSpec): string[] => {
  const n = framesOf(s)
  const cols = colsOf(s)
  const rows = rowsOf(s)
  return [
    '',
    `READ THE PANELS. This is not one picture — it is ${n} frames of ONE LOOP.`,
    `The attached sheet is ${cols} columns x ${rows} rows = EXACTLY ${n} panels, read left`,
    'to right along the top row and then the row below.',
    '',
    `· ${n} panels. Not 1, not ${cols}, not ${n + 4}, not ${n * 2}. Exactly ${rows} rows of`,
    `  ${cols} — do not add a row, do not append the cycle again underneath.`,
    '· Repaint EVERY panel. A sheet where one panel is painted and the rest are',
    '  copies of it is the failure this whole sheet exists to avoid.',
    `· THE ${rows} ROWS ARE NOT ${rows} STATES. The top row is panels 1-${cols} and the row`,
    `  below is ${cols + 1}-${n}, of ONE continuous march. A sheet with one arrangement`,
    `  repeated across the top row and a second repeated across the bottom is`,
    '  what came back last time — it is two pictures, not eight, and it plays as',
    '  a thing that snaps between two poses.',
    `· All ${n} panels are DIFFERENT from each other, and each differs from the one`,
    '  beside it by the SAME small step. Even spacing is the animation; a sheet',
    '  that holds still and then jumps reads as dropped frames.',
    '· Each panel is exactly 1/' + String(cols) + ' of the width and 1/' + String(rows) + ' of the height,',
    '  on an exact grid with no gutters. The cut is done by arithmetic.',
    '',
    `WHAT MOVES: ${s.cycle ?? 'the effect around the subject, and only that.'}`,
    ...(s.panels && s.panels.length === n
      ? ['',
        'PANEL BY PANEL — measure each one against panel 1, not against its',
        'neighbour, or the error accumulates and the loop will not close:',
        ...s.panels.map((line, i) => `· panel ${i + 1}: ${line}.`)]
      : []),
    '',
    'IT MUST LOOP. The game plays these end to end, forever, several times a',
    `second: after panel ${n} it goes straight back to panel 1. So panel ${n} has to`,
    'flow into panel 1 as smoothly as panel 1 flows into panel 2. Do not build a',
    'sequence that starts small and ends big — that pops once per loop, and at',
    'this speed a pop reads as a dropped frame.',
    '',
    'The SUBJECT keeps the same size, the same colours and the same place in the',
    'panel throughout — it is one object seen at eight moments, not eight',
    'objects. Only what is written under WHAT MOVES may change.',
    '',
    'EVERY PANEL IS ITS OWN PICTURE. Flame, sparks and glow stay inside the',
    'panel they belong to — nothing reaches across a panel edge into its',
    'neighbour, and the magenta between panels stays flat magenta. The sheet is',
    'cut on an exact grid, so anything that crosses a boundary is sliced in half',
    'and arrives in the game as a stray smear on the frame next door.'
  ]
}

export const promptForStill = (s: StillSpec): string => {
  const fill = !!s.fill
  const sky = s.bg === 'magenta-sky'
  const opaque = s.bg === 'opaque'
  const cycle = framesOf(s) > 1
  return [
    `# ${s.id} — ${s.name}  (${s.target})`,
    '',
    cycle
      ? `Repaint an ${framesOf(s)}-frame ANIMATION LOOP of one game sprite, as a single`
        + `
${shapeOf(s)} sheet of ${colsOf(s)} x ${rowsOf(s)} panels.`
      : `Paint ONE game sprite in a single ${shapeOf(s)} image.`,
    ...(s.model
      ? ['Two images come with this prompt, in this order:',
        `  IMAGE 1 — \`${s.model.file}\` — ${s.model.what}`,
        `  IMAGE 2 — \`${s.file}.png\` — THE REFERENCE: the game's own drawing of this`,
        '     sprite. It is exactly what to paint, at exactly the size and position it',
        '     is drawn at. Match both.']
      : ['The attached reference is exactly what to paint, at exactly the size and',
        'position it is drawn at. Match both.']),
    '',
    `WHAT IT IS: ${s.blurb}`,
    ...(cycle ? cyclePrompt(s) : []),
    ...(s.live ? ['', `LEAVE OUT WHAT THE GAME PAINTS LIVE. ${s.live}`] : []),
    ...(s.kind === 'gate'
      ? ['',
        'THE POSTS — measure them against the FRAME, not against your idea of a gate.',
        `In the reference each post is a pillar ${pct(GATE_POST.width)} of the frame wide, its outer`,
        `face ${pct(GATE_POST.outer)} in from the frame's edge and its inner face ${pct(GATE_POST.inner)} in.`,
        'That is as wide as a post can be. Paint it EXACTLY that wide — the width the',
        'reference draws it, not wider, not a pair, not a wall. The DOORWAY between',
        `the two inner faces is ${pct(GATE_POST.doorway)} of the width and it is EMPTY from the lintel`,
        'to the ground: nothing stands in it, nothing leans into it, no rubble, no',
        'floor, no shadow.',
        '· Exactly TWO posts: one at the left edge, one at the right. Not a pair per',
        '  side, not a slab beside a pillar, not a wall.',
        '· A post wider than the reference is squeezed thinner by the slicer until it',
        '  fits — the painting survives, squashed. The last three returns had posts',
        '  three times the reference width, and every one of them came back as a',
        '  squeezed sliver.',
        '· Bulk goes UP — a taller cap, a finial, a heavier lintel — never sideways.',
        '· The lintel or arch across the top is thin and can be stretched; nothing',
        '  else spans the doorway. Anything painted below the lintel between the',
        '  posts is thrown away.']
      : []),
    ...(s.authored
      ? cycle
        // A cycle sheet is asked for motion by definition, so the "at rest"
        // clause would contradict `WHAT MOVES` two paragraphs above it. What
        // survives is the ORIENTATION, which the game still turns.
        ? ['', `ORIENTATION, in every panel: ${s.authored}. No motion blur and no speed`,
          'lines — the movement is in the difference between the panels, and the',
          'game turns and travels the sprite itself.']
        : ['', `DRAW IT AT REST, ${s.authored}. Do not add motion blur, speed lines or`,
          'a second copy of it: the game turns and moves it out of this one picture.']
      : []),
    ...(s.greyscale
      ? ['', 'GREYSCALE ONLY. Paint it in white through grey with alpha — no colour',
        'at all. The game tints it per emitter (dust, soot, blood), and any colour',
        'painted in here fights every one of those tints.']
      : []),
    ...(s.glow ? ['', GLOW_RULE] : []),
    '',
    fill ? STYLE_FILL : STYLE_PART,
    '',
    cycle
      ? 'SIZE AND PLACEMENT (this is per PANEL) — this is the part that goes wrong.'
      : 'SIZE AND PLACEMENT — this is the part that goes wrong.',
    fill
      ? 'The subject fills its frame edge to edge, exactly as the reference does.\nDo not shrink it onto a card or leave a polite margin.'
      : 'Do not enlarge it to fill the frame. The reference leaves air around the\nsubject and that air is not waste — it is where the things drawn live around\nit go. Keep the subject the same fraction of the frame that the reference\nhas it, in the same place.',
    ...(s.anchor === 'feet'
      ? ['· Its bottom edge must land at the same height from the bottom of the',
        '  frame as the reference has it — the game registers the return by it.']
      : []),
    '· Do not rotate it or change the viewing angle.',
    '· No cast shadow on the ground. The game draws its own.',
    '',
    opaque
      ? 'BACKGROUND: none. This image is FULLY OPAQUE from edge to edge — no\ntransparency, no checkerboard, no magenta anywhere.'
      : sky
        ? [
          'BACKGROUND — read this before anything else.',
          'Everything ABOVE the ridge line is sky, and it must be solid, flat, pure',
          'magenta #FF00FF — a green-screen colour, keyed out automatically. NOT',
          'transparent: transparency gets exported as a grey-and-white CHECKERBOARD',
          'and then baked in as though the squares were paint. NOT white, NOT pale',
          'blue, NOT a gradient or haze. BELOW the ridge line the artwork is fully',
          'opaque black, right down to the bottom edge — do not fade it out.'
        ].join('\n')
        : BACKGROUND_RULE,
    ...(s.tile === 'x'
      ? ['', 'SEAMLESSLY TILEABLE, HORIZONTALLY. This image is repeated end to end, so',
        'the right edge must join the left edge with no visible seam, no matching',
        'feature straddling the join, and no vignette or fade at either side. It',
        'does NOT need to tile vertically.']
      : s.tile === 'xy'
        ? ['', 'SEAMLESSLY TILEABLE ON BOTH AXES. This image is repeated across the road',
          'in every direction, so the right edge must join the left and the bottom',
          'edge must join the top with no visible seam, no feature straddling a join,',
          'and no vignette or fade anywhere. Keep it even: one bright stone in the',
          'middle becomes a polka-dot pattern across the whole road.']
        : []),
    ...(s.kind === 'gate'
      ? ['',
        'BEFORE YOU CALL IT FINISHED, count and check:',
        `· Two posts, one per side, each ${pct(GATE_POST.width)} of the frame wide — the width the`,
        `  reference draws them — with the doorway ${pct(GATE_POST.doorway)} of the width between them.`,
        '· The doorway between them is empty magenta from the lintel down to the',
        '  ground.',
        '· No shadow on the ground, no ground at all — the posts stand on magenta.']
      : []),
    ...(cycle
      ? ['',
        'BEFORE YOU CALL IT FINISHED, count and check:',
        `· ${colsOf(s)} panels across, ${rowsOf(s)} down, ${framesOf(s)} in all — no extra row.`,
        `· No two of the ${framesOf(s)} panels are identical. In particular the ${colsOf(s)} panels of a`,
        '  row are 4 different moments, not one moment repeated across the row.',
        '· Every panel holds the same object at the same size, in the same place,',
        '  in the same colours.',
        `· Panel ${framesOf(s)} leads back into panel 1.`,
        '· Every pixel that is not the sprite is flat, vivid #FF00FF.']
      : []),
    '',
    'OUTPUT — read this twice, it is where every previous attempt failed:',
    `· ONE image, exactly ${sheetW(s)} x ${sheetH(s)} pixels — ${shapeOf(s)}.`,
    '  If your tool has an aspect-ratio control, set it to match. Returns have',
    '  come back at the tool\'s default ratio before, which overrides this line —',
    '  the setting wins, so change the setting.',
    cycle
      ? `· ONE object, painted ${framesOf(s)} times as ${framesOf(s)} moments of one loop. Not `
        + 'variants,\n  not a comparison, not a turnaround, not a before-and-after pair.'
      : '· ONE object. Not two, not a comparison, not variants side by side, not a\n  before-and-after pair.',
    '· No frame, border, card, label, caption, arrow, annotation or drop shadow.'
  ].join('\n')
}

// ─── The prompt documents ───────────────────────────────────────────────────

/** A sheet's measured placement, as the bench records it in the index. */
export interface Fit { h: number; w: number; bottom: number; cx: number }

/**
 * A prompt as a document BLOCK: a heading that names the reference and the
 * target in its last parenthesis, then the prompt in a fenced `text` block.
 *
 * That shape is a contract with two readers. A markdown preview gives a fenced
 * block a copy button, so a whole prompt is one click. And the Art Desk
 * (`tools/art-desk`) ties each block to its image by the `(<ref>.png → <target>)`
 * parenthesis and sends the fenced text verbatim — so the builder's own heading
 * line (`# id — name  (target)`) is lifted out and the rest goes in unchanged.
 * `tests/game/artDesk.test.ts` holds every block byte-identical to its builder.
 */
export const promptBody = (prompt: string): string => {
  const lines = prompt.split('\n')
  return (lines[0]?.startsWith('# ') ? lines.slice(lines[1] === '' ? 2 : 1) : lines).join('\n')
}

/**
 * One job in a prompt document. `first` are images the painter must be given
 * BEFORE the reference, relative to `art-sheets/` — the heading lists every
 * image in the order it is attached, the reference last
 * (`(models/x.png + ref.png → target)`), so the Art Desk attaches them all
 * rather than trusting an operator to read the prompt and remember.
 */
const promptBlock = (title: string, stem: string, target: string, prompt: string, first: string[] = []): string =>
  [`## ${title}  (${[...first, `${stem}.png`].join(' + ')} → ${target})`, '', '```text', promptBody(prompt), '```'].join('\n')

/**
 * Every `PROMPTS-*.md`, text and all — the ONE place the documents are written.
 *
 * Two routes render these and they must agree byte for byte: the bench
 * (`/#/art-sheets` → export), and `pnpm art:prompts`, which loads this module
 * under plain Node (so nothing it imports may reach the renderer — see
 * `artBoxes.ts` and `tools/ts-resolve.mjs`). `fits` is the contract's measured
 * placement; this project's SIZE clauses are stated from the manifest's own
 * numbers, so it is accepted and not yet read.
 */
export const promptDocs = (_fits?: Record<string, Fit>): Record<string, string> => ({
  'PROMPTS-WALKS.md': [
    '# Walk-cycle prompts — one design per generation',
    '',
    'Generated from the manifest — do not hand-edit, re-export instead.',
    '',
    'Attach `art-sheets/walk-<id>.png` and paste the matching block beside it.',
    'Each is a grid of panels showing ONE subject through ONE cycle, and the',
    'whole job is that it comes back as one subject and not eight.',
    '',
    'Drop results in `art-sheets/painted/`, keeping the `walk-<id>` in the name,',
    'then run `pnpm slice-sheets`. The slicer cuts the grid by proportion, so an',
    'off-size return is fine as long as the panels are where the grid says.',
    'Each prompt is a fenced block — the preview\'s copy button takes all of it —',
    'and `pnpm art:desk` can run the whole loop from these blocks.',
    '',
    WALKS.map((w) => promptBlock(w.name, w.file, w.target, promptForWalk(w))).join('\n\n---\n\n'),
    ''
  ].join('\n'),
  'PROMPTS-STILLS.md': [
    '# Still prompts — one object per generation',
    '',
    'Generated from the manifest — do not hand-edit, re-export instead.',
    '',
    'Attach `art-sheets/still-<kind>-<id>.png` and paste the matching block',
    'beside it. There is no grid to preserve here, which is the whole point.',
    'A block whose heading names two images (the cages) wants both, in that',
    'order: the character model first, then the reference.',
    '',
    'Drop results in `art-sheets/painted/`, keeping the `still-<kind>-<id>` in',
    'the name, then run `pnpm slice-sheets`. Every return is measured against',
    'its reference and normalised onto it.',
    'Each prompt is a fenced block — the preview\'s copy button takes all of it —',
    'and `pnpm art:desk` can run the whole loop from these blocks.',
    '',
    STILLS.map((s) => promptBlock(s.name, s.file, s.target, promptForStill(s), s.model ? [s.model.file] : [])).join('\n\n---\n\n'),
    ''
  ].join('\n'),
  'PROMPTS-DEATHS.md': [
    '# Boss death prompts — one boss per generation',
    '',
    'Generated from the manifest — do not hand-edit, re-export instead.',
    '',
    'Attach TWO images with each block, in this order: `art-sheets/models/<design>.png`',
    '(the character — one frame of its walk as the game shows it, cut by',
    '`pnpm art:models`) and then `art-sheets/death-<design>.png` (the animation). The',
    'layout is the game\'s own drawing of the fall — the blow, the stagger, the knees',
    'going, the body on its back (or flank) with its limbs spread — and the prompt',
    'asks for exactly that fall, painted as exactly that creature. Without the model a',
    'painter invents a new creature from the words, and the swap at the kill shows it.',
    '',
    'Drop results in `art-sheets/painted/`, keeping the `death-<design>` in the',
    'name, then run `pnpm slice-sheets`. The game asks for a death strip when a',
    'stage is 80 % run and plays the same fall, drawn, until one exists.',
    'Each prompt is a fenced block — the preview\'s copy button takes all of it.',
    'Each heading names both images, and the Art Desk attaches both, in order.',
    '',
    BOSS_DEATHS.map((d) => promptBlock(`${d.name} — death`, d.file, d.target, promptForDeath(d), [d.model])).join('\n\n---\n\n'),
    '',
    '---',
    '',
    'The last block is the SQUAD\'s own fall, and it works the same way: the character',
    'model (`art-sheets/models/survivors.png`, the three survivors as the game shows',
    'them) first, then the layout. One sheet covers every outfit and both of the poses',
    'a fall is held on, so it is one generation for the whole crowd. The game plays the',
    'same fall, drawn, until it exists — see `SURVIVOR_FALLS`.',
    '',
    SURVIVOR_FALLS.map((f) => promptBlock(f.name, f.file, f.target, promptForFall(f), [f.model])).join('\n\n---\n\n'),
    ''
  ].join('\n')
})

/**
 * Every painted sheet as the status report reads it: the reference file's
 * stem, the document its prompt block is in, and where the slice lands.
 */
export const sheetRows = (): Array<{ what: 'walk' | 'still' | 'death' | 'fall'; id: string; title: string; stem: string; doc: string; target: string }> => [
  ...WALKS.map((w) => ({ what: 'walk' as const, id: w.id, title: w.name, stem: w.file, doc: 'PROMPTS-WALKS.md', target: w.target })),
  ...STILLS.map((s) => ({ what: 'still' as const, id: s.id, title: s.name, stem: s.file, doc: 'PROMPTS-STILLS.md', target: s.target })),
  ...BOSS_DEATHS.map((d) => ({ what: 'death' as const, id: d.id, title: `${d.name} — death`, stem: d.file, doc: 'PROMPTS-DEATHS.md', target: d.target })),
  ...SURVIVOR_FALLS.map((f) => ({ what: 'fall' as const, id: f.id, title: f.name, stem: f.file, doc: 'PROMPTS-DEATHS.md', target: f.target }))
]

// ─── Consistency with the runtime catalogue ─────────────────────────────────

/** Every still id the manifest paints for a kind, in manifest order. */
export const stillIds = (kind: ArtKind): string[] =>
  STILLS.filter((s) => s.kind === kind).map((s) => s.id)


/** Ids the runtime probes that the manifest does not paint, and vice versa. */
export const catalogueDrift = (): { unpainted: string[]; unprobed: string[] } => {
  const unpainted: string[] = []
  const unprobed: string[] = []
  for (const [kind, ids] of Object.entries(ART_CATALOGUE)) {
    const painted = new Set(stillIds(kind as ArtKind))
    for (const id of ids) if (!painted.has(id)) unpainted.push(`${kind}/${id}`)
    for (const id of painted) {
      // The logo is painted but never probed; see `artCatalogue`.
      if (!ids.includes(id) && !(kind === 'ui' && id === 'logo')) unprobed.push(`${kind}/${id}`)
    }
  }
  return { unpainted, unprobed }
}
