import { ref } from 'vue'
import { safeGetBool, safeSetItem } from '@/utils/safeStorage'

// Both reads below run at MODULE SCOPE. A bare `localStorage.getItem` here
// throws before `bootstrap()` on any runtime where `window.localStorage` is
// `null` — YouTube Playables, which the Playgama archive is submitted to —
// and the game is a blank screen with no error boundary to catch it. The
// `typeof x === 'undefined'` guard does NOT help: `typeof null` is `'object'`.
// See `safeStorage.ts`.
const debugSaved = safeGetBool('debug')
const envDebug = import.meta.env.VITE_APP_DEBUG === 'true'
const isProductionBuild = import.meta.env.VITE_NODE_ENV === 'production'
// The explicit `cheat` opt-in (set by QA / dev) unlocks saved-debug on ANY
// build — without it, a `production` platform build (Playgama, GamePix, …)
// ignored a persisted `debug=true` at boot, so debug mode silently reset to
// off on every reload and `cmarc`'s toggle "didn't stick".
const cheatEnabled = safeGetBool('cheat')
export const isDebug = ref(envDebug || cheatEnabled || (!isProductionBuild && debugSaved))
export const isCrazyGamesFullRelease = import.meta.env.VITE_APP_CRAZY_GAMES_FULL_RELEASE === 'true'

/** Flip `isDebug` and persist the new value under the bare `debug` key.
 *  The "cmarc" cheat sequence calls this so the dev can pop into debug
 *  mode mid-session without a reload — every consumer that binds to
 *  `isDebug` (editor button, perf meter, etc.) reacts immediately. */
export const toggleDebug = (): boolean => {
  const next = !isDebug.value
  isDebug.value = next
  // Already inside a function, so the null case could not crash boot — but
  // routing it through the shim keeps one storage path in the codebase and
  // drops the bare `localStorage` identifier from the bundle.
  safeSetItem('debug', JSON.stringify(next))
  console.warn(`[cheat] Debug mode ${next ? 'ENABLED' : 'DISABLED'}.`)
  return next
}

export const isSplashScreenVisible = ref<boolean>(false)
export const isDbInitialized = ref<boolean>(false)

export const useMatch = () => {
  const turn = ref<'player' | 'npc'>('player')
  const isThinking = ref(false)

  const resetGame = () => {}

  return {
    turn,
    resetGame,
    isThinking
  }
}

export default useMatch
