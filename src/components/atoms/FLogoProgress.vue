<template lang="pug">
  Transition(name="splash-fade")
    div.splash-backdrop.no-os-ui(v-if="!backdropHidden")
      //- The panning tile — the same layer the static splash draws, on the
      //- same clock (see `adoptAnimationClock`), so it keeps drifting through
      //- the handover instead of jumping back to where it started.
      div.backdrop-tiles(ref="tilesEl" :style="tileStyle" aria-hidden="true")

  //- The loading read-out only renders during the loading sequence. Once `done`
  //- flips true (progress = 100% OR the 8s fallback fires) it fades out and
  //- unmounts — it deliberately does NOT shrink to the top-left corner like the
  //- previous splash flow.
  //-
  //- ─── The greeting ─────────────────────────────────────────────────────────
  //-
  //- What used to be here was Tower Siege's: three stacked blocks pulsing in
  //- sequence, carried over with the splash flow along with its wordmark. A
  //- loading spinner tells a first-time player nothing except that they are
  //- waiting, and the splash is the ONE moment every player sees before they
  //- decide whether to stay.
  //-
  //- So it is a joke instead. The wispling — the game's lantern ghost, painted
  //- through the art pipeline, its walk cycle already on disk — floats out,
  //- shouts BOO, and then immediately cracks up at its own prank. Cute, not
  //- spooky: the point is to buy sympathy for the cast in the two seconds
  //- before the game starts, and a monster that scares you and then giggles is
  //- a monster you do not mind meeting again.
  //-
  //- The composition is a greeting card — ghost and bubble on top, the title
  //- under both — and it is duplicated (ghost + logo, no bubble) as the inline
  //- static splash in `index.html`, so the handover from static HTML to this
  //- component is one continuous picture with the bubble popping in on top of
  //- it rather than a swap between two different screens.
  Transition(name="loader-fade")
    div.no-os-ui(
      v-if="!done"
      class="fixed z-[200] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    )
      div.greet
        //- The gag's stage. Nothing in it is in normal flow: the ghost and the
        //- bubble are both pinned, so the bubble growing from "Boo!" to the
        //- longer laugh (much longer in some locales) cannot nudge the ghost.
        div.greet-stage(:class="`is-${phase}`")
          div.wisp(ref="wispEl" aria-hidden="true")
            img.wisp-strip(ref="stripEl" :src="WISP_SRC" alt="" decoding="async" fetchpriority="high")

          //- One bubble, re-keyed per beat: the key is what replays the pop, and
          //- `out-in` is deliberately NOT used — the two beats overlap for a
          //- moment, which reads as the laugh bursting out of the shout.
          Transition(name="bubble-pop")
            div.bubble(v-if="phase !== 'lurk'" :key="phase")
              span.bubble-text {{ phase === 'boo' ? t('loading.boo') : t('loading.laugh') }}

        div.greet-logo
          img(:src="LOGO_SRC" :alt="t('gameName')" decoding="async" fetchpriority="high")

        span(class="percentage-text text-shadow text-amber-500") {{ Math.round(progress) }}%

        Transition(name="hint-fade")
          div.stuck-hint(v-if="showStuckHint") {{ t('loading.tooLong') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import useAssets from '@/use/useAssets'
import { stopLoading } from '@/use/useCrazyGames'
import { armFirstLoadInterstitial, notifySplashGone } from '@/use/useFirstLoadInterstitial'
import { prependBaseUrl } from '@/utils/function'

const { t } = useI18n()

// ─── The greeting's two bitmaps ─────────────────────────────────────────────
//
// Read straight off disk rather than through `spriteFor`. The art-override
// layer is a GAMEPLAY switch — it ships OFF on the portals so a missing paint
// never shows up in a QA console as a 404 — and the splash is not optional: it
// must be the same picture on every build. These two files are in `public/`,
// they are always there, and the static splash in `index.html` has already
// asked for both by the time this component mounts, so both are cache hits.
//
// The cost is ~60 KB on the boot path, spent while the sprite bake (which is
// what the loading bar is actually waiting for) does its several seconds of
// work. It is the only thing the player looks at in that window.
const WISP_SRC = prependBaseUrl('images/monsters/wispling.webp')
const LOGO_SRC = prependBaseUrl('images/logo/logo_512x512.png')

// ─── The gag's clock ────────────────────────────────────────────────────────
//
// Three beats on a loop: the ghost floats alone, shouts, then laughs at itself.
//
// `LURK_MS` is a floor, not a dramatic pause. The static splash takes 400 ms to
// fade out (see `onMounted`, and `#static-splash` in `index.html`) and sits at a
// HIGHER z-index than this component the whole time, so a bubble popped before
// that finishes pops behind it and is simply never seen. This is that fade plus
// a small margin — the least the shout can wait and still be visible.
//
// It stays that short because the whole gag has to fit inside a load. The laugh
// only lands at LURK + BOO, and a splash that resolves before then shows the
// scare and never the punchline, which is the half that makes the ghost
// likeable. Every millisecond spent staging here comes off the laugh's odds.
const LURK_MS = 500
/** How long "Boo!" holds before the ghost drops the act. The brief, as asked. */
const BOO_MS = 1500
/** The laugh's turn. Longer than the shout — a load can run 8 s, and a gag that
 *  re-scares you every second stops being funny and starts being a strobe. */
const LAUGH_MS = 3200

const wispEl = ref<HTMLElement | null>(null)
const stripEl = ref<HTMLElement | null>(null)
const tilesEl = ref<HTMLElement | null>(null)

/**
 * The backdrop tile, by URL rather than as a bundled import.
 *
 * It lives in `public/` because the static splash in `index.html` names it
 * too, and by the time this component mounts the browser has already fetched
 * and decoded it for that layer — so the layer taking over here is drawn from
 * the cache in its first frame. Generated from the game's own paintings by
 * `pnpm art:bg-tile`.
 */
const tileStyle = { backgroundImage: `url(${prependBaseUrl('images/bg/bg-tile_800x800.webp')})` }

/**
 * Hand the static splash's ghost animations over to this one, mid-stride.
 *
 * The two are the same picture at the same size, and for the 400 ms the static
 * splash spends fading out they are both on screen — so if their float and
 * their frame cycle are at different points, the crossfade shows the ghost
 * ghosting itself, tilted one way and mid-step in two places at once. Which
 * they WILL be: one started when the browser parsed `index.html`, the other
 * when Vue mounted, and the gap between those is the whole module graph.
 *
 * The fix is not a shared clock but a copied one: `getAnimations()` hands back
 * the live CSS animations on both elements, and `currentTime` is writable, so
 * the new pair is simply set to wherever the old pair had got to. Wrapped
 * because `getAnimations` is the kind of API a stripped-down webview inside a
 * portal's app can be missing, and a frame pop is not worth a boot failure.
 */
const adoptAnimationClock = (from: Element | null | undefined, to: Element | null): void => {
  if (!from || !to || typeof from.getAnimations !== 'function') return
  const was = from.getAnimations()
  const now = to.getAnimations()
  for (let i = 0; i < Math.min(was.length, now.length); i++) {
    const t = was[i]?.currentTime
    if (t !== null && t !== undefined) now[i]!.currentTime = t
  }
}

type GreetPhase = 'lurk' | 'boo' | 'laugh'
const phase = ref<GreetPhase>('lurk')
let greetTimerId: number | null = null

/** Advance the gag, then schedule the next beat. Loops for as long as the
 *  splash is up; a fast load simply unmounts partway through. */
const runGreeting = (next: GreetPhase): void => {
  phase.value = next
  const hold = next === 'boo' ? BOO_MS : LAUGH_MS
  const after: GreetPhase = next === 'boo' ? 'laugh' : 'boo'
  greetTimerId = window.setTimeout(() => runGreeting(after), hold)
}

const { loadingProgress, preloadAssets } = useAssets()
const progress = computed(() => loadingProgress.value)

void preloadAssets()

// First-load interstitial — ON for GamePix and GameMonetize.
//
// GameMonetize QA, 2026-09-09: "Ads should be shown the first time after the
// game loads." That ad was served by `useFirstStartInterstitial`, awaited in
// `GameScene.boot()`, and it SAMPLES `isInterstitialReady` exactly once — which
// makes the placement a race it loses on a real portal:
//
//   * `boot()` runs from `onMounted` on the lazily-imported GameScene route
//     chunk — a local, modulepreloaded file.
//   * The ad SDK is only injected by `initAds()`, called AFTER `app.mount()`
//     returns (`main.ts`), and does not report ready until
//     api.gamemonetize.com has loaded and its ad stack has initialised.
//
// So the game's own chunk beats a cross-origin ad SDK, `isInterstitialReady` is
// false at the one moment that module looks, and it deliberately does not burn
// its one-shot when not ready — waiting for a retry that cannot come, because
// `boot()` runs once per session. No ad, no error, nothing logged.
//
// It stayed hidden because BOTH proofs were run against an SDK with no network
// in front of it: the unit suite hands the module a ready ref, and the portal-QA
// stub answered SDK_READY in 30 ms, so locally the SDK won the race every time.
// (`scripts/portal-qa.mjs` now delays that handshake for this reason.)
//
// This orchestrator has no such race: it WATCHES readiness and fires on the
// first moment the splash is gone AND the SDK reports a fillable interstitial,
// however long the SDK takes to come up.
//
// GameDistribution is armed for the same reason: its moderation carries the same
// first-load requirement, and its ad sat on the same sampled-once placement, so
// it was equally dead. The post-splash fire was once removed on GD for producing
// borderline-incidental-click impressions — that trade is being taken again
// knowingly, because the alternative shipped no first ad at all.
//
// Every env read is a static literal so Rollup DCEs the entire branch (helper
// module included) on other platform builds — same pattern as the Playgama /
// GamePix loading signals further down.
if (
  import.meta.env.VITE_APP_GAMEPIX === 'true'
  || import.meta.env.VITE_APP_GAME_MONETIZE === 'true'
  || import.meta.env.VITE_APP_GAME_DISTRIBUTION === 'true'
) {
  armFirstLoadInterstitial()
}

const done = ref(false)
const backdropHidden = ref(false)
const showStuckHint = ref(false)
let stuckHintId: number | null = null

let settleFallbackId: number | null = null

onMounted(() => {
  const staticSplash = document.getElementById('static-splash')
  if (staticSplash) {
    // Before it starts fading: both halves of the ghost, in order — the
    // window's float and the strip's frame cycle.
    adoptAnimationClock(staticSplash.querySelector('.splash-wisp'), wispEl.value)
    adoptAnimationClock(staticSplash.querySelector('.splash-wisp img'), stripEl.value)
    // The tile, too: a layer starting its drift from zero would show the
    // pattern doubled and sliding against itself through the crossfade.
    adoptAnimationClock(staticSplash.querySelector('.splash-tiles'), tilesEl.value)
    staticSplash.classList.add('hidden')
    setTimeout(() => staticSplash.remove(), 500)
  }

  // Hard fallback so the splash always clears, even if the asset loader never
  // reports 100% (offline / blocked images / dropped requests).
  //
  // Raised from 4 s: the loader now also waits for the survivor sprite strips to
  // bake (see `useAssets.preloadAssets`), and on the low-idle devices that wait
  // exists for, 4 s could fire FIRST — dropping the splash right back into the
  // capsule crowd it is there to prevent. `useAssets` bounds its own wait at
  // 6 s, so this sits past that and is a true last resort rather than the normal
  // exit. The hint moves earlier so a slow load says something before then.
  settleFallbackId = window.setTimeout(() => {
    if (!done.value) done.value = true
  }, 8000)
  stuckHintId = window.setTimeout(() => {
    if (!done.value) showStuckHint.value = true
  }, 5000)

  greetTimerId = window.setTimeout(() => runGreeting('boo'), LURK_MS)
})
onUnmounted(() => {
  if (settleFallbackId !== null) clearTimeout(settleFallbackId)
  if (stuckHintId !== null) clearTimeout(stuckHintId)
  if (greetTimerId !== null) clearTimeout(greetTimerId)
})

// `immediate: true` fires the handler with the current value the moment
// the watcher is set up. Without it, an asset loader that already reports
// 100% (instant boots, especially on localhost) never trips the watcher
// and the splash sits around for the full 4s `settleFallbackId` window.
watch(progress, (val) => {
  if (val >= 100 && !done.value) {
    setTimeout(() => { done.value = true }, 100)
  }
}, { immediate: true })

let cgLoadSignaled = false
const signalGameReadyToCG = () => {
  if (cgLoadSignaled) return
  cgLoadSignaled = true
  try { stopLoading() } catch (e) { console.warn('[FLogoProgress] CG ready-to-play failed', e) }
}

// Playgama's `game_ready` is certification-mandatory — fire it on the same
// splash-resolved edge as CG's loadingStop. The plugin guards the message
// internally so it fires once even if the watcher re-triggers.
//
// Gate uses the inline `import.meta.env.VITE_APP_*` literal (NOT the
// `isPlaygama` re-export from `useUser`) so Rollup can statically
// eliminate the dynamic-import branch on non-Playgama builds. The
// cross-module constant propagation isn't reliable enough for the
// re-exported `const` to be recognised as a build-time literal, and
// without DCE every build picks up a ~5 KB lazy `playgamaPlugin` chunk
// it never loads. Same pattern in `main.ts`.
let playgamaLoadSignaled = false
const signalGameReadyToPlaygama = () => {
  if (playgamaLoadSignaled) return
  if (import.meta.env.VITE_APP_PLAYGAMA !== 'true') return
  playgamaLoadSignaled = true
  void import('@/utils/playgamaPlugin').then(({ playgamaGameLoadingStop }) => {
    try { playgamaGameLoadingStop() }
    catch (e) { console.warn('[FLogoProgress] Playgama game_ready failed', e) }
  })
}

// GamePix's `gameLoaded` is the analogous certification-critical edge —
// the toolkit's pause/resume self-test requires a complete
// `customLoading → gameLoading(0..100) → gameLoaded` chain or
// `processLoadingEvent` dies on every pause click. The plugin guards the
// `gameLoaded` fire internally so re-triggering is harmless. Same
// `import.meta.env` literal pattern as the Playgama branch above so
// non-GamePix builds DCE the dynamic-import entirely.
let gamepixLoadSignaled = false
const signalGameReadyToGamepix = () => {
  if (gamepixLoadSignaled) return
  if (import.meta.env.VITE_APP_GAMEPIX !== 'true') return
  gamepixLoadSignaled = true
  void import('@/utils/gamepixPlugin').then(({ gamePixGameLoadingStop }) => {
    try { gamePixGameLoadingStop() }
    catch (e) { console.warn('[FLogoProgress] GamePix gameLoaded failed', e) }
  })
}

// Yandex's `LoadingAPI.ready()` is certification-mandatory — fire it on the
// same splash-resolved edge as CG / Playgama / GamePix. Cert text: "At the
// moment when the user can start playing the game, the LoadingAPI.ready()
// method from Game Ready must be called." The plugin guards the call
// internally so re-triggering is harmless. Same `import.meta.env` literal
// pattern as the platform branches above so non-Yandex builds DCE the
// dynamic-import entirely.
// Poki's `gameLoadingFinished()` is the ONE strictly-required SDK call — fire it
// on the same splash-resolved edge as CG / Playgama / GamePix / Yandex. There is
// no progress counterpart to pair it with: `gameLoadingStart()` and
// `gameLoadingProgress()` are both `() => {}` in the shipped v2 core, so the
// loading bar above is ours alone to drive. The plugin guards the call
// internally so re-triggering is harmless. Same `import.meta.env` literal
// pattern as the branches above so non-Poki builds DCE the dynamic import (this
// component IS in the obfuscator's exclude list, which is what makes a dynamic
// `'@/…'` specifier safe here).
let pokiLoadSignaled = false
const signalGameReadyToPoki = () => {
  if (pokiLoadSignaled) return
  if (import.meta.env.VITE_APP_POKI !== 'true') return
  pokiLoadSignaled = true
  void import('@/utils/pokiPlugin').then(({ pokiGameLoadingFinished }) => {
    try { pokiGameLoadingFinished() }
    catch (e) { console.warn('[FLogoProgress] Poki gameLoadingFinished failed', e) }
  })
}

let yandexLoadSignaled = false
const signalGameReadyToYandex = () => {
  if (yandexLoadSignaled) return
  if (import.meta.env.VITE_APP_YANDEX !== 'true') return
  yandexLoadSignaled = true
  void import('@/utils/yandexPlugin').then(({ yandexLoadingReady }) => {
    try { yandexLoadingReady() }
    catch (e) { console.warn('[FLogoProgress] Yandex LoadingAPI.ready failed', e) }
  })
}

watch(done, (isDone) => {
  if (isDone) {
    setTimeout(() => {
      backdropHidden.value = true
      signalGameReadyToCG()
      signalGameReadyToPlaygama()
      signalGameReadyToGamepix()
      signalGameReadyToYandex()
      signalGameReadyToPoki()
      // Triggers the GamePix / GameMonetize / GameDistribution first-load ad (no-op on
      // other builds — the orchestrator was never armed there). Runs alongside
      // the platform `game_ready` / `gameLoaded` signals so the ad lands
      // immediately once the splash is gone and the SDK is fillable; if the SDK
      // is still initialising this only ARMS the fire, and the readiness watcher
      // in the orchestrator lands it a moment later.
      notifySplashGone()
    }, 150)
  }
})
</script>

<style scoped lang="sass">
.no-os-ui
  caret-color: transparent
  user-select: none
  -webkit-user-select: none
  -webkit-touch-callout: none
  -webkit-tap-highlight-color: transparent

  &, & *
    -webkit-user-drag: none

// --- The greeting card -----------------------------------------------------
//
// Every measurement below is shared with the inline static splash in
// `index.html`, which draws the same ghost at the same size in the same place
// so the handover between the two is invisible. Change one, change both.

// The card's width, and therefore the logo's. Everything else is a percentage
// of it, so the whole composition scales as one on a phone.
$greet-w: clamp(200px, 58vmin, 340px)

.greet
  position: relative
  display: flex
  flex-direction: column
  align-items: center
  gap: 0.55rem
  width: $greet-w

// The stage is squat: the ghost stands in the left half and the bubble fills
// the right, rather than the ghost being centred with the bubble hanging off
// the side where a 320 px-wide portrait phone would clip it.
.greet-stage
  position: relative
  width: 100%
  aspect-ratio: 340 / 200

// --- The ghost -------------------------------------------------------------
//
// `wispling.webp` is the painted walk cycle the field already plays: one
// horizontal strip of 8 panels, each 228 x 256. The window shows one panel and
// the strip inside it is 8x as wide, so a `steps(8)` slide of exactly -100% of
// the STRIP's own width lands on each panel in turn — no pixel arithmetic, and
// it stays correct if the strip is ever repainted at a different resolution.
//
// The panel count IS hard-coded here, unlike `spriteStrip.ts` which reads it
// off the file. CSS cannot measure an image; a repaint with a different panel
// count has to change the 8 in three places (here, the strip width, and the
// static splash). That is the trade for animating this without a frame of JS.
//
// A panel is the FIELD's frame box, and that box reserves headroom for the
// tall monsters — the wispling only fills the middle of it. Measured off the
// file, its ink runs 0.206..0.789 across a panel and 0.363..0.941 down it, so
// a window sized to the panel shows a ghost barely half as big as the space it
// occupies, floating oddly high. The three numbers below are therefore solved
// for the INK rather than the box:
//
//   ink is 0.583 x 0.578 of a panel, its centre 0.4975 across
//   want:  ink 76% of the stage tall, centred at 29% across, bottom at 98% down
//   so:    window height = 0.76 / 0.578            = 131.5% of the stage
//          window width  = that x (228/256) x (200/340) = 68.9% of the stage
//          left   = 0.29 - 0.4975 x 0.689          = -5.3%
//          bottom = (1 - 0.98) - (1 - 0.941) x 1.315 = -5.8%
//
// The window therefore hangs slightly outside the stage on two sides. That is
// only transparent padding — the stage does not clip — and it is what puts the
// ghost's own outline where the composition wants it.
.wisp
  position: absolute
  left: -5.3%
  bottom: -5.8%
  height: 131.5%
  aspect-ratio: 228 / 256
  overflow: hidden
  // The float, and — on the shout — the lunge. Both live on the WINDOW so the
  // strip inside is free to do nothing but cycle.
  animation: wisp-float 2.6s ease-in-out infinite

.wisp-strip
  display: block
  // Both overrides are load-bearing. Tailwind's preflight caps every image at
  // `max-width: 100%`, which would squash all eight panels into one panel's
  // width; and the `width`/`height` attributes on the tag are presentational
  // hints that win until an author rule says otherwise, so the height is stated
  // rather than left to `auto`.
  max-width: none
  width: 800%
  height: 100%
  animation: wisp-walk 2.6s steps(8, end) infinite

@keyframes wisp-walk
  from
    transform: translateX(0)
  to
    transform: translateX(-100%)

@keyframes wisp-float
  0%, 100%
    transform: translateY(0) rotate(-1.5deg)
  50%
    transform: translateY(-6%) rotate(1.5deg)

// The jump scare itself: a fast lunge toward the player that settles back into
// the float. It is one-shot per shout, and it restarts on every loop of the gag
// for free — `is-boo` and `is-laugh` name DIFFERENT animations, so swapping the
// class is what re-runs it.
.greet-stage.is-boo .wisp
  animation: wisp-lunge 0.62s cubic-bezier(0.2, 1.4, 0.4, 1) 1, wisp-float 2.6s ease-in-out 0.62s infinite

// Afterwards it is laughing at its own joke — a quick shoulder-shake over the
// float, which is the beat that turns "spooky" into "harmless".
.greet-stage.is-laugh .wisp
  animation: wisp-giggle 0.42s ease-in-out infinite

@keyframes wisp-lunge
  0%
    transform: scale(0.82) translateY(8%)
  35%
    transform: scale(1.28) translateY(-9%) rotate(3deg)
  70%
    transform: scale(0.97) translateY(1%) rotate(-2deg)
  100%
    transform: scale(1) translateY(0) rotate(-1.5deg)

@keyframes wisp-giggle
  0%, 100%
    transform: translateY(0) rotate(-3deg)
  50%
    transform: translateY(-4%) rotate(3deg)

// --- The speech bubble -----------------------------------------------------
//
// Drawn rather than painted. A bitmap bubble would have to be re-cut for every
// locale's word length — "Hahaha!" is seven characters and its Japanese and
// Thai counterparts are neither that length nor that shape — and it would be a
// third file on the boot path. The ink-heavy border matches the cast's linework.
//
// Pinned, not in flow: the bubble grows rightward from a fixed left edge as the
// text changes, so the ghost never shifts under it.
.bubble
  position: absolute
  left: 46%
  top: 0
  // Sized for the longest laugh any locale ships — Russian's "Ха-ха-ха!", which
  // needs about half the card at a 320 px viewport. It is a cap, not a width:
  // the bubble shrinks to "Boo!" and grows to the laugh on its own, and a
  // longer string than any of these WRAPS rather than spilling out of the
  // plate, which is why there is no `white-space: nowrap` here.
  max-width: 58%
  padding: 0.42em 0.7em 0.5em
  border: 0.13em solid #10131f
  border-radius: 0.85em
  background: #f4ead6
  box-shadow: 0 0.18em 0 rgba(16, 19, 31, 0.55)
  // The pop grows out of the ghost's head, which is down and to the left.
  transform-origin: 0% 100%

// The tail: two stacked triangles — the dark one is the ink outline, the light
// one sits a hair inside it — aimed down-left at the ghost.
.bubble::before,
.bubble::after
  content: ''
  position: absolute
  left: 0.9em
  width: 0
  height: 0
  border-style: solid

.bubble::before
  bottom: -1.02em
  border-width: 1.05em 0.78em 0 0
  border-color: #10131f transparent transparent transparent

.bubble::after
  bottom: -0.72em
  border-width: 0.82em 0.58em 0 0
  border-color: #f4ead6 transparent transparent transparent

.bubble-text
  display: block
  color: #17110c
  font-size: clamp(0.95rem, 4.6vmin, 1.5rem)
  font-weight: 900
  line-height: 1.15
  text-align: center

// The laugh is a wobble, not a shout — the bubble itself giggles.
.is-laugh .bubble
  animation: bubble-giggle 0.42s ease-in-out infinite

@keyframes bubble-giggle
  0%, 100%
    transform: rotate(-2deg) scale(1)
  50%
    transform: rotate(2deg) scale(1.04)

// The pop. Overshoots hard on the way in — the shout has to arrive faster than
// the eye can follow it or it is not a scare — and leaves quickly and small so
// the next beat is already growing over it.
.bubble-pop-enter-active
  animation: bubble-pop-in 0.34s cubic-bezier(0.16, 1.5, 0.4, 1)

.bubble-pop-leave-active
  animation: bubble-pop-in 0.16s ease-in reverse

@keyframes bubble-pop-in
  0%
    transform: scale(0.2) rotate(-14deg)
    opacity: 0
  60%
    transform: scale(1.12) rotate(3deg)
    opacity: 1
  100%
    transform: scale(1) rotate(0deg)
    opacity: 1

// --- The title -------------------------------------------------------------
//
// The logo file is the PWA's 512 icon, so the wordmark sits inside a mostly
// transparent square — measured, its ink runs from y=216 to y=295 of 512. Shown
// square it would push the percentage off a landscape phone, so the window
// crops to a band around the ink: 0.398..0.600 of the file's height, which is
// the ink plus a little air.
//
// The offset is a percentage MARGIN, which resolves against the containing
// block's WIDTH — the same number the image is scaled to — so the crop holds at
// every size without a media query.
.greet-logo
  width: 100%
  aspect-ratio: 512 / 103
  overflow: hidden

  img
    display: block
    width: 100%
    // Stated, not `auto`: the tag carries width/height attributes (they keep
    // the static splash from reflowing when the file lands) and those are
    // presentational hints that would otherwise pin the height at 512 px.
    height: auto
    margin-top: -39.84%

.percentage-text
  font-size: clamp(0.9rem, 4vw, 1.35rem)
  font-weight: 900

// Motion is the whole point here, so this cannot be a blanket `animation: none`
// — with the strip frozen the ghost would be a still sticker with a shout
// hanging beside it. Instead the jump SCARE goes (no lunge, no shake, no
// overshoot) and the gentle float and the frame cycle stay, which is the beat
// somebody who asked for less motion was asking to lose.
@media (prefers-reduced-motion: reduce)
  .greet-stage.is-boo .wisp,
  .greet-stage.is-laugh .wisp
    animation: wisp-float 2.6s ease-in-out infinite

  .is-laugh .bubble
    animation: none

  .bubble-pop-enter-active
    animation: bubble-fade-in 0.25s ease-out

  .bubble-pop-leave-active
    animation: bubble-fade-in 0.15s ease-in reverse

  @keyframes bubble-fade-in
    from
      opacity: 0
    to
      opacity: 1

// --- The backdrop -----------------------------------------------------------
//
// The same ground, tile and drift as the inline splash in index.html — read
// the long comment on `.splash-tiles` there. Change one, change both
// (`tests/ui/splashTiles.test.ts` holds them to it).

$tile: 400px

.splash-backdrop
  position: fixed
  inset: 0
  z-index: 150
  // The tile layer is one tile bigger than the screen; without this it would
  // hand the page a scrollbar.
  overflow: hidden
  // Matches the inline splash in index.html AND the scene's sky, so the
  // handover from static HTML → Vue splash → canvas is one continuous colour
  // with no flash between the three.
  background: radial-gradient(circle at 50% 38%, #1b2b52 0%, #0a1224 70%)

.backdrop-tiles
  position: absolute
  top: -$tile
  left: -$tile
  right: 0
  bottom: 0
  background-position: 0 0
  background-size: $tile $tile
  background-repeat: repeat
  opacity: 0.16
  will-change: transform
  animation: backdrop-tiles-in 0.6s ease-out both, backdrop-tiles-pan 40s linear infinite

@keyframes backdrop-tiles-in
  from
    opacity: 0

@keyframes backdrop-tiles-pan
  to
    transform: translate3d($tile, $tile, 0)

@media (prefers-reduced-motion: reduce)
  .backdrop-tiles
    animation: none

.splash-fade-leave-active
  transition: opacity 0.4s ease-out
  pointer-events: none

.splash-fade-leave-to
  opacity: 0

.loader-fade-leave-active
  transition: opacity 0.35s ease-out, transform 0.35s ease-out
  pointer-events: none

.loader-fade-leave-to
  opacity: 0
  transform: translate(-50%, -50%) scale(0.85)

.stuck-hint
  color: rgba(255, 200, 0, 0.85)
  font-size: 0.9rem
  text-align: center
  max-width: 80vw
</style>
