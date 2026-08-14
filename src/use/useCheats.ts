import { onMounted, onUnmounted, ref } from 'vue'
import useTowerEconomy from '@/use/useTowerEconomy'
import { toggleDebug } from '@/use/useMatch'

// `cheat` stays a top-level localStorage flag — it's an explicit dev toggle
// that gates the whole keyboard-shortcut module, so we don't want it living
// inside the gameplay save blob (where a cloud restore could re-enable
// cheats on a clean device).
const storedCheat = localStorage.getItem('cheat') || 'false'
const isCheat = ref<boolean>(JSON.parse(storedCheat))

// ─── Always-on key-sequence cheat: type "cmarc" to flip debug mode. ──────
//
// Sits OUTSIDE the `useCheats` factory so it works even when the regular
// cheat module is gated off — flipping `isDebug` is itself the entry point
// to dev tooling (editor button, perf meter, etc.).
//
// Exported + idempotent so a boot-time caller (App.vue setup) can guarantee
// it installs at app start. The old module-level `installDebugUnlock()` call
// only ran when this file's side-effects were retained — but App.vue's bare
// `import useCheats` is tree-shaken in production (the default export is never
// called there), and the only other importer is the LAZY game scene, so on a
// built bundle the sequence listener wasn't attached until the player was
// already in-game (and never at all if they typed it on the menu). Calling
// the exported initialiser from executed setup code can't be tree-shaken.
let debugUnlockInstalled = false
export const installDebugUnlock = (): void => {
  if (typeof window === 'undefined' || debugUnlockInstalled) return
  debugUnlockInstalled = true
  const target = 'cmarc'
  let buf = ''
  const isTypingTarget = (el: EventTarget | null): boolean => {
    if (!(el instanceof HTMLElement)) return false
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    return el.isContentEditable
  }
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) { buf = ''; return }
    const k = e.key.toLowerCase()
    // Non-character keys (Shift, Tab, arrow keys) don't reset the buffer
    // outright — they just don't extend it — so the cheat survives a stray
    // modifier press. Anything else of length 1 gets appended.
    if (k.length !== 1) return
    buf = (buf + k).slice(-target.length)
    if (buf === target) {
      buf = ''
      toggleDebug()
    }
  })
}
// Best-effort module-level install for dev (vite serve keeps side-effects);
// App.vue also calls installDebugUnlock() in setup so production builds — where
// this bare side-effect can be tree-shaken — still attach the listener at boot.
installDebugUnlock()

const useCheats = () => {
  if (!isCheat.value) return {}

  const { addCoins } = useTowerEconomy()

  // Dev shortcuts, retargeted to Survivalist's runner: coins for the shop, and
  // the three things a reviewer needs to reach a late stage in ten seconds —
  // survivors, damage, and a stage skip.
  //
  // The simulation is reached through a DYNAMIC import, never a static one.
  // `useCheats` is called from `App.vue`, which is on the eager boot path — a
  // static import would drag the whole game model (track generator, foes,
  // sprite bakers) into the entry chunk and delay first paint for every player,
  // to serve a dev-only feature that 99.99% of them never trigger. Fetching it
  // on the keypress costs a few ms exactly once, for the developer.
  const withGame = (fn: (game: typeof import('@/use/useSurvivalGame')) => void): void => {
    void import('@/use/useSurvivalGame').then(fn).catch((e) => {
      console.warn('[CHEAT] could not load the game module', e)
    })
  }

  /**
   * Hand the live simulation to the console as `window.__run`.
   *
   * Reaching the sim from devtools with a bare `import('@/use/useSurvivalGame')`
   * does NOT work during development: Vite serves an HMR-updated module under a
   * versioned URL, so the import resolves to a second, inert copy of the
   * singleton and every mutation lands on an object nothing is rendering. The
   * only reliable handle is one the running app publishes itself.
   *
   * Dev-only, and only after the cheat sequence has been typed.
   */
  const publishDebugHandle = (): void => {
    if (typeof window === 'undefined') return
    void import('@/use/useSurvivalGame').then((game) => {
      ;(window as unknown as Record<string, unknown>).__run = game
      console.warn('[CHEAT] window.__run is live (inspect / drive the running sim).')
    })
  }
  publishDebugHandle()

  const cheatsMap: Record<string, () => void> = {
    'ctrl+shift+alt+k': () => {
      addCoins(3000)
      console.warn('[CHEAT] +3000 coins.')
    },
    'ctrl+shift+alt+g': () => withGame((game) => {
      game.debugAddUnits(40)
      console.warn('[CHEAT] +40 survivors.')
    }),
    'ctrl+shift+alt+d': () => withGame((game) => {
      game.debugAddDamage(5)
      console.warn('[CHEAT] +5 damage per survivor.')
    }),
    'ctrl+shift+alt+f': () => withGame((game) => {
      game.debugAddFireRate(2)
      console.warn('[CHEAT] +2 shots/s per survivor.')
    }),
    'ctrl+shift+alt+n': () => withGame((game) => {
      game.advanceStage()
      console.warn('[CHEAT] Skipped to the next stage.')
    }),
    'ctrl+shift+alt+r': () => withGame((game) => {
      game.retryStage()
      console.warn('[CHEAT] Stage restarted.')
    })
  }

  const heldKeys = new Set<string>()
  const MODIFIER_KEYS = new Set(['control', 'shift', 'alt', 'meta'])

  const normalizeKey = (e: KeyboardEvent): string | null => {
    const codeMatch = e.code.match(/^Digit(\d)$/)
    if (codeMatch) return codeMatch[1]!
    const k = e.key.toLowerCase()
    return MODIFIER_KEYS.has(k) ? null : k
  }

  const buildShortcut = (e: KeyboardEvent): string => {
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('ctrl')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey) parts.push('alt')
    const sorted = [...heldKeys].sort()
    parts.push(...sorted)
    return parts.join('+')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = normalizeKey(e)
    if (key) heldKeys.add(key)
    const shortcut = buildShortcut(e)
    if (cheatsMap[shortcut]) {
      e.preventDefault()
      cheatsMap[shortcut]!()
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    const key = normalizeKey(e)
    if (key) heldKeys.delete(key)
  }

  const handleBlur = () => {
    heldKeys.clear()
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('blur', handleBlur)
  })

  return { isCheat }
}

export default useCheats
