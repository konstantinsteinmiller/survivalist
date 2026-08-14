<script setup lang="ts">
import { ref, onMounted } from 'vue'

/**
 * The "a video follows this click" mark, prepended to every rewarded button.
 *
 * Ships as a drop-in override in the same shape as the rest of the game's art:
 * the authored bitmap is used when it is present in `public/`, and the inline
 * vector below is used when it is not. Nothing about the button depends on the
 * file existing — it renders correctly on a fresh clone, and drops the painted
 * frame in the moment the asset lands. See `art-todo.md`.
 *
 * The probe is module-scoped and runs once: a rewarded button can appear on
 * every result screen of a session, and a per-instance `<img @error>` would
 * both re-request the missing file and flash the fallback in after paint.
 */

const SRC = '/images/icons/movie_128x96.webp'

/** `null` = not probed yet, `true`/`false` = the answer, cached for the tab. */
let cached: boolean | null = null
let probe: Promise<boolean> | null = null

const probeArt = (): Promise<boolean> => {
  if (cached !== null) return Promise.resolve(cached)
  if (probe) return probe
  probe = new Promise<boolean>((resolve) => {
    if (typeof Image === 'undefined') { resolve(false); return }
    const img = new Image()
    // Only a real decode counts. A 404 that a dev server answers with an HTML
    // error page still fires `load` on some browsers, and `naturalWidth` is the
    // cheap way to tell a picture from an apology.
    img.onload = () => resolve(img.naturalWidth > 0)
    img.onerror = () => resolve(false)
    img.src = SRC
  }).then((ok) => { cached = ok; return ok })
  return probe
}

const hasArt = ref(cached === true)
onMounted(async () => { hasArt.value = await probeArt() })
</script>

<template lang="pug">
  img.reward-ad-icon(v-if="hasArt" :src="SRC" alt="" draggable="false" aria-hidden="true")
  //- Fallback: a film clapper, THE convention for "this plays a video". Drawn
  //- as a filled silhouette rather than a stroked outline so it survives the
  //- ~16 px it renders at inside a button label.
  svg.reward-ad-icon(v-else viewBox="0 0 24 18" fill="currentColor" aria-hidden="true" focusable="false")
    path(d="M2.6 5.6h18.8c.66 0 1.2.54 1.2 1.2v8.4c0 .66-.54 1.2-1.2 1.2H2.6c-.66 0-1.2-.54-1.2-1.2V6.8c0-.66.54-1.2 1.2-1.2Z")
    path(d="M1.7 4.4 20.4 1.05a1 1 0 0 1 1.16.81l.24 1.36L2.4 6.6l-.7-1.34a.95.95 0 0 1 0-.86Z")
    path(d="m7 2.55 1.3 2.3-2.2.4-1.3-2.3zM13 1.5l1.3 2.3-2.2.4-1.3-2.3z" fill="#0d1526")
    path(d="M10.1 8.5v5l4.4-2.5z" fill="#0d1526")
</template>

<style scoped lang="sass">
.reward-ad-icon
  flex: 0 0 auto
  // 4:3, matching the authored frame, so the bitmap and the fallback occupy
  // exactly the same box and the label never reflows when the art lands.
  height: 1.15em
  width: calc(1.15em * 4 / 3)
  object-fit: contain
  user-select: none
  -webkit-user-drag: none
</style>
