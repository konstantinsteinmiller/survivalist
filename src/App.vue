<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mobileCheck } from '@/utils/function'
import { useMusic } from '@/use/useSound'
import { useExtensionGuard } from '@/use/useExtensionGuard'
import { windowWidth, windowHeight } from '@/use/useUser'
import { isDebug } from '@/use/useMatch'
import useAssets from '@/use/useAssets'
import FLogoProgress from '@/components/atoms/FLogoProgress.vue'
import FPerfMeter from '@/components/atoms/FPerfMeter.vue'
import SaveStatusBanner from '@/components/atoms/SaveStatusBanner.vue'
import AdsBlockedModal from '@/components/atoms/AdsBlockedModal.vue'
import VConsoleHideButton from '@/components/atoms/VConsoleHideButton.vue'
import PortraitLock from '@/components/organisms/PortraitLock.vue'
import { useCrazyMuteSync } from '@/use/useCrazyMuteSync'
import useCheats, { installDebugUnlock } from '@/use/useCheats'
import { isCrazyWeb, isWaveDash, isItch, isGlitch, isGameDistribution, isPlaygama, isGamepix, isGameMonetize, isYandex, isPoki, isNative, orientation } from '@/use/useUser'
import { glitchLicenseStatus } from '@/use/useGlitchLicense'
import { resolveCapabilities } from '@/platforms/capabilities'
import { getPlattformText } from '@/platforms/plattformText'

const { t } = useI18n()
const { initMusic, pauseMusic, continueMusic } = useMusic()
useExtensionGuard()
const { resourceCache } = useAssets()
useCrazyMuteSync()
// Attach the "cmarc" debug-unlock key listener at app boot (App.vue is eager),
// so typing it anywhere flips debug mode — the lazy game scene used to be the
// only importer, which tree-shook the listener out of production builds.
installDebugUnlock()
// Mount the cheat keyboard shortcuts (stage jumps, +coins, item-box spawn) for
// the whole app lifetime. The factory self-gates on `localStorage.cheat` and
// returns inert when cheats are off, so this is a no-op for normal players —
// but without CALLING it the keydown listeners were never attached at all
// (it was previously only imported for `installDebugUnlock`, never invoked).
useCheats()

initMusic()

const portraitQuery = window.matchMedia('(orientation: portrait)')
const onTouchStart = (event: any) => {
  if (event.touches.length > 1) {
    event.preventDefault() // Block multitouch (pinch)
  }
}

const onGestureStart = (event: any) => {
  event.preventDefault() // Block specific Safari zoom gestures
}
const onOrientationChange = (event: any) => {
  if (event.matches) {
    orientation.value = 'portrait'
  } else {
    orientation.value = 'landscape'
  }
}

const onContextMenu = (event: any) => {
  event.preventDefault() // Block right-click context menu
}

const handleVisibilityChange = async () => {
  try {
    if (document.hidden) {
      pauseMusic()
      // console.log('App moved to background - Pausing Music')
    } else {
      continueMusic()
      // console.log('App back in focus - Resuming Music')
    }
  } catch (error) {
    // console.log('error: ', error)
  }
}

const updateGlobalDimensions = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
  orientation.value = mobileCheck() && windowWidth.value > windowHeight.value ? 'landscape' : 'portrait'
}

const dimensionsInterval = ref<any | null>(null)
// Ensure listeners are active
const delayedUpdateGlobalDimensions = () => setTimeout(updateGlobalDimensions, 300)
onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateGlobalDimensions)

    dimensionsInterval.value = setInterval(() => {
      windowWidth.value = window.innerWidth
      windowHeight.value = window.innerHeight
    }, 400)
    window.addEventListener('orientationchange', delayedUpdateGlobalDimensions)
    // Not on Playgama: that archive is the YouTube Playables submission, and
    // Playables forbids the Page Visibility API outright — only the SDK's
    // `onPause` may halt the game. The Bridge's `PAUSE_STATE_CHANGED` already
    // drives `pauseGame()`, and `useGamePauseAudio` suspends audio off the
    // aggregate `isGamePaused`, so the music this handler manages is covered
    // there without a second, forbidden driver.
    // `import.meta.env` literal rather than the imported `isPlaygama`: the
    // constant crosses a module boundary, and this file is in the obfuscator's
    // path, so the raw literal is the form esbuild is most likely to fold
    // before the string-array pass runs. Same reasoning as the note in
    // `pokiPlugin.stub.ts`.
    if (import.meta.env.VITE_APP_PLAYGAMA !== 'true') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', updateGlobalDimensions)
  window.removeEventListener('orientationchange', delayedUpdateGlobalDimensions)
  // Guarded to MATCH the add above rather than left unconditional. A bare
  // `removeEventListener(..., handleVisibilityChange)` keeps a live reference
  // to the handler, so the function — and the `document.hidden` branch inside
  // it — survives into the Playgama bundle even though nothing can ever call
  // it, and reads there as a Page Visibility usage. Same literal on both sides
  // so the whole pair folds away together.
  if (import.meta.env.VITE_APP_PLAYGAMA !== 'true') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
  clearInterval(dimensionsInterval.value)
})

onMounted(() => {
  document.addEventListener('contextmenu', onContextMenu)
  document.addEventListener('touchstart', onTouchStart, { passive: false })
  document.addEventListener('gesturestart', onGestureStart)
  portraitQuery.addEventListener('change', onOrientationChange)
})
onUnmounted(() => {
  document.removeEventListener('contextmenu', onContextMenu)
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('gesturestart', onGestureStart)
  portraitQuery.removeEventListener('change', onOrientationChange)
})

// Capability gates for the per-platform render fork in the template
// below — single source of truth lives in `@/platforms/capabilities`.
// `parentOrigin` is the iframe parent's origin (only meaningful for Glitch
// where the game runs on a CDN iframe-embedded into glitch.fun).
const hostname = window.location.hostname
const parentOrigin = window.location.ancestorOrigins?.[0] ?? document.referrer ?? ''
const platformFlags = {
  isCrazyWeb, isWaveDash, isItch, isGlitch, isGameDistribution, isPlaygama, isGamepix, isGameMonetize, isYandex, isPoki
}
const capabilities = computed(() => resolveCapabilities({
  flags: platformFlags,
  hostname,
  parentOrigin,
  glitchLicenseStatus: glitchLicenseStatus.value
}))

const isGameShowAllowed = computed(() =>
  capabilities.value.allowedToShowOnCrazyGames ||
  capabilities.value.allowedToShowOnWaveDash ||
  capabilities.value.allowedToShowOnItch ||
  capabilities.value.allowedToShowOnGlitch ||
  capabilities.value.allowedToShowOnGameDistribution ||
  capabilities.value.allowedToShowOnPlaygama ||
  capabilities.value.allowedToShowOnGamepix ||
  capabilities.value.allowedToShowOnGameMonetize ||
  capabilities.value.allowedToShowOnYandex ||
  capabilities.value.allowedToShowOnPoki ||
  location.hostname.includes('localhost')
)
const isGlitchDenied = computed(() => capabilities.value.isGlitchDenied)
const showOnlyAvailableText = computed(() => capabilities.value.showOnlyAvailableText)
// Sourced from `@/platforms/plattformText` — that file is in the obfuscator's
// exclude list so its env-literal ladder DCEs cleanly per build and only the
// active build's hostname survives in the bundle. See the comment in
// `plattformText.ts` for why a separate file (and why exclusion is required).
const plattformText = computed(() => getPlattformText())
</script>

<template lang="pug">
  div(v-if="isGameShowAllowed" id="app-root" class="h-screen h-dvh w-screen app-container root-protection game-ui-immune")
    FLogoProgress
    FPerfMeter(v-if="isDebug" :offset-y="52")
    SaveStatusBanner
    AdsBlockedModal
    VConsoleHideButton
    RouterView
    //- ── Portrait only, on phones ───────────────────────────────────────────
    //-
    //- Hosted HERE rather than in `GameScene.vue`, and that is a deliberate
    //- choice between two files the same agent owns:
    //-
    //-   • WHAT IT IS ABOUT is the device and the viewport, not the run. It has
    //-     to be up over the splash, over the loading bar, over a future route
    //-     and over the scene alike — a phone held sideways during the logo
    //-     animation is the same problem as one held sideways mid-boss, and a
    //-     block that only exists while a canvas is mounted would miss the first.
    //-   • WHAT IT NEEDS from the game is nothing scene-shaped. Pausing and
    //-     "this is not gameplay" both come from `acquireModalOpen`, which is a
    //-     global refcount — so the overlay can assert both from outside the
    //-     scene, and the scene's own gates (`isGamePaused`, `isAnyModalOpen`
    //-     inside `isGameplayLive`) pick it up with no wiring at all.
    //-
    //- LAST in the list so it paints over everything above it without needing to
    //- win a z-index argument with the loading screen.
    PortraitLock

  div.relative.w-full.h-full(v-else-if="isGlitchDenied")
    h1.absolute.text-red-500(class="left-1/2 -translate-x-[50%] top-1/2 -translate-y-[50%] text-3xl") {{ t('license.denied') }}


  div.relative.w-full.h-full(v-else-if="showOnlyAvailableText")
    h1.absolute(class="left-1/2 -translate-x-[50%] top-1/2 -translate-y-[50%] text-3xl") {{ t('crazyGamesOnly') }}
      span.ml-2.text-amber-500 {{ plattformText }}
</template>

<style lang="sass">
*
  font-family: 'Angry', sans-serif
  user-select: none
  outline: none
  // Standard
  -webkit-user-select: none
  // Safari
  -moz-user-select: none
  // Firefox
  -ms-user-select: none
  // IE10+

  // Optional: prevent the "tap highlight" color on mobile
  -webkit-tap-highlight-color: transparent

img
  pointer-events: none
</style>