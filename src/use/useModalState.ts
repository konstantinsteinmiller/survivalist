import { ref, computed } from 'vue'
import { acquireAppPause } from '@/use/useGamePause'

// ─── UI modal-open signal ────────────────────────────────────────────────────
//
// Tracks how many blocking FModal dialogs (Upgrades, Options, Daily, Battle
// Pass, Achievements, …) are currently open, and HALTS THE SIMULATION while
// any of them is up.
//
// The pause is not cosmetic. Every one of these menus is opened mid-siege — the
// tech tree in particular is where the player goes to answer a wave that is
// beating them — and letting enemies keep chewing the tower while the player
// reads a menu punishes them for using the game's own systems. It also makes
// the CrazyGames contract honest: `gameplayStop()` is meant to mean gameplay
// actually stopped, not that a panel happens to be covering it.
//
// Two separate signals come out of this, deliberately:
//   * `isAnyModalOpen` — the SDK-event signal, consumed by the gameplay
//     lifecycle driver in `GameScene`.
//   * an app pause from `useGamePause` — the simulation + audio gate.
//
// Refcounted so overlapping / stacked modals compose: gameplay only resumes
// once the LAST modal closes. `acquireModalOpen()` returns a release function
// the caller (FModal) invokes on close / unmount.

const openCount = ref(0)

/** True while at least one blocking modal is open. */
export const isAnyModalOpen = computed(() => openCount.value > 0)

/** Mark a modal as open. Returns a release fn — call once on close/unmount.
 *  Idempotent release so wrapping in cleanup hooks is safe. */
export const acquireModalOpen = (): (() => void) => {
  openCount.value += 1
  const releasePause = acquireAppPause()
  let released = false
  return (): void => {
    if (released) return
    released = true
    openCount.value = Math.max(0, openCount.value - 1)
    releasePause()
  }
}
