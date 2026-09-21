import type { ArtKind } from '@/game/art'

/**
 * ─── Every still the renderer can ask for, by kind ──────────────────────────
 *
 * The runtime side of the art manifest. `artSheet.ts` — the bench-side
 * manifest that exports the reference sheets and writes the prompts — is the
 * authority on what each of these IS; this is the list a boot-path module can
 * read without dragging the bench, the painters and the whole renderer in
 * behind it. A test holds the two in agreement.
 *
 * Monsters and survivors are not here: their ids are the designs in
 * `monsters.ts` and the outfits in `heroSprites.ts`, and both modules are
 * already on the boot path. Nor are the boss deaths, which are keyed by the
 * same designs — the boss roster in `foes.ts` (`bossDesigns`) says which.
 *
 * The logo is not here either. It is painted through the same pipeline but
 * never probed at run time — the manifest lists it with an explicit target
 * under `images/logo/`, where the PWA manifest and the portals read it.
 */
export const ART_CATALOGUE: Record<Exclude<ArtKind, 'monster' | 'hero' | 'death' | 'hurl'>, readonly string[]> = {
  prop: [
    'crate-damage', 'crate-rate', 'barricade',
    'boulder-1', 'boulder-2', 'boulder-3',
    'barrel', 'pillar', 'coin',
    // The weapon puzzle: the prize shut and open, the armour over it, and the
    // lever that opens it — a housing and a swinging arm.
    'weapon-box', 'weapon-box-open', 'guard-plate', 'lever-post', 'lever-arm',
    // The three cages: the roadside one a crowd shoots open, the miniboss's
    // sealed cabinet, and the warden cage behind every boss. One drawing, three
    // paintings — see `paintCageBody`.
    'cage', 'cage-sealed', 'cage-warden'
  ],
  gate: ['frame-add', 'frame-sub', 'frame-mul', 'frame-div'],
  round: [
    'tracer', 'bolt-gunner', 'bolt-boss', 'roller', 'meteor', 'bomb', 'grenade', 'rocket',
    // The shotgun's pellet — see `game/weapons.ts`.
    'pellet',
    // The wyrm's gout, in the air between its jaws and the mark it is aimed at.
    'ember'
  ],
  fx: [
    'muzzle', 'smoke', 'scorch',
    'ring-shock', 'ring-heat', 'ring-heal',
    'shield', 'guard', 'crest-shield', 'crest-guard',
    // One mark each for three of the four later weapons: the Dynamo's bolt,
    // the light over one of Gravecall's dead, and the burst a gilded corpse
    // ends in. The fourth, the shotgun's pellet, is a round.
    'bolt', 'wisp', 'gild',
    // The wyrm's ground: the fire, the bone that comes up through the road,
    // and a gout's splash. The fourth mark — the footprint a flare is coming
    // to — is deliberately NOT painted; `paintFlameMark` says why.
    'flame-wall', 'spines', 'ember-splash'
  ],
  // No road tile: painted cobbles read as objects under the crowd, and the
  // procedural gravel stays. See `artSheet.ts`.
  bg: ['ridge-far', 'ridge-near'],
  // The crown is on the field; the rest are the DOM's — the result banner
  // (nine-sliced by CSS), the idle chest on the wallet column, the shop's
  // forge, the two skill buttons' icons and the two cards of the stage-3
  // weapon choice, shown through `ArtIcon` and `FReward`. See `uiArt.ts`.
  ui: [
    'crown', 'ribbon', 'chest', 'forge', 'skill-grenade', 'skill-shield',
    'weapon-card-rocket', 'weapon-card-gatling',
    // The incoming-attack alarm, one drawable per state — see `uiArt.ts`.
    'warn-away', 'warn-into', 'warn-still'
  ]
}
