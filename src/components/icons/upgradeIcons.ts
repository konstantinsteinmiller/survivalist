import type { GameIconName } from './iconNames'
import type { UpgradeId } from '@/use/useUpgrades'

/**
 * ─── One track, one glyph ───────────────────────────────────────────────────
 *
 * Which mark fronts each shop track. It lives here rather than inside the shop
 * modal because the shop is no longer the only place a track is drawn: the
 * result screen's peek plate (`ShopPeek.vue`) shows ONE of these rows as a
 * teaser, and a track that wears one drawing in the teaser and another in the
 * shop is a track the player has to recognise twice.
 *
 * Seven of the nine are the SAME glyph the run HUD or the skill bar already
 * shows for that stat — the shop is where you buy the number you spent the last
 * stage watching, so it must not be a second drawing of it. Scavenging has no
 * HUD chip of its own and takes the generic `star`.
 *
 * A complete `Record`, not a `Partial`: a tenth track added to `UPGRADE_ORDER`
 * without a glyph should be a compile error, not a blank tile.
 *
 * ─── Why this list is glyphs all the way down ───────────────────────────────
 *
 * The two skills used to draw through `ArtIcon`, so a painting replaced their
 * glyph once the pipeline produced one. In a HUD button that is right: the
 * button is alone, and a painted bomb is simply a better bomb.
 *
 * In a LIST it is wrong, and it is wrong structurally rather than because a
 * file is missing. `ART_CATALOGUE.ui` has four paintable ids — the idle chest,
 * the shop's own forge and the two skills — and there is no `ui/squad`,
 * `ui/rate`, `ui/range` or `ui/gatling`, nor any reason to paint one: they are
 * stat glyphs, not objects. So the shop can only ever show two painted rows
 * above six drawn ones, in a single column, at the same size, side by side.
 * That does not read as "these two are nicer", it reads as a half-finished
 * screen.
 *
 * One list, one hand. If the skills ever want their paintings back here, every
 * track needs one first.
 */
export const UPGRADE_ICONS: Record<UpgradeId, GameIconName> = {
  squad: 'squad',
  power: 'bolt',
  rate: 'rate',
  range: 'range',
  // No HUD chip to echo — the generic progression mark instead.
  scavenge: 'star',
  // The two ACTIVE tracks, wearing the same glyphs the in-run buttons fall back
  // to, so the thing bought here and the thing pressed there are recognisably
  // one object.
  grenade: 'bomb',
  shield: 'shield',
  // …and the two weapons, wearing the glyph that is painted on the box they
  // come out of and on the badge that appears when they do. Same rule again:
  // one object, one drawing, wherever the player meets it.
  rocket: 'rocket',
  gatling: 'gatling'
}
