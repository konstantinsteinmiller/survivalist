<script setup lang="ts">
import { computed } from 'vue'
import { ICON_PATHS } from './iconPaths'
import type { GameIconName } from './iconNames'

/**
 * ─── The one icon component ─────────────────────────────────────────────────
 *
 * Every glyph in the game comes from here. Before this, icons were pasted as
 * raw `<svg>` blocks into whichever component needed them (GooScene's settings
 * cog, FIconButton's six hard-coded `d` strings, FModal's close X, …), so the
 * same idea was drawn three different ways at three different stroke weights.
 *
 * The glyphs are SOLID fills, not strokes: they sit white on saturated candy
 * plastic, where a 2px outline greys out and disappears at HUD size.
 *
 * All of a glyph's sub-paths are concatenated into ONE `d` on ONE `<path>`,
 * and that is load-bearing rather than tidiness: a sub-path can only cut a
 * hole in the sub-paths it shares an element with. Rendered as a `<path>` per
 * entry — as this component used to — the counter of `info`, the lock's
 * keyhole and the bore of the gear all silently filled themselves in.
 *
 * The winding rule is the default `nonzero`, not `evenodd`. Most of these
 * glyphs are assembled from limbs that overlap on purpose (the shackle sunk
 * into the lock body, the arrow head sitting on its shaft, the note stems
 * crossing their beam); evenodd would XOR every one of those overlaps into a
 * hole. Under nonzero they merge, and `iconPaths` cuts its holes deliberately
 * by winding those sub-paths the other way round.
 *
 * The SVG fills its box, so the *caller* owns sizing — set a width/height on
 * the parent and the glyph follows. Colour comes from `currentColor`.
 */
const props = defineProps<{ name: GameIconName }>()

const d = computed(() => (ICON_PATHS[props.name] ?? ICON_PATHS.help).join(''))
</script>

<template lang="pug">
  svg.game-icon(
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  )
    path(:d="d")
</template>

<style scoped lang="sass">
.game-icon
  display: block
  width: 100%
  height: 100%
  // The glyph is decoration painted on top of a button; never let it swallow
  // the press that was aimed at the button underneath it.
  pointer-events: none
</style>
