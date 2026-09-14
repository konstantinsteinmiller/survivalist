// ─── safeStorage — the only safe way to touch Web Storage at module scope ───
//
// `window.localStorage` is not always an object with methods on it. Three
// distinct failure shapes, and they need three different guards:
//
//   1. **It can be `null`.** On YouTube Playables — which the Playgama archive
//      is submitted to — `window.localStorage` and `window.sessionStorage` are
//      `null`, not absent. This is the one that bites, because the idiomatic
//      guard does not catch it:
//
//          if (typeof localStorage === 'undefined') …   // WRONG: typeof null === 'object'
//
//      so a module-scope `localStorage.getItem('x')` throws
//      `TypeError: Cannot read properties of null` BEFORE `bootstrap()` runs,
//      and the whole game is a blank screen. Nothing later in the boot sequence
//      gets a chance to handle it. This exact bug rejected a 2026-09 submission.
//   2. **The accessor itself can throw.** Safari in Lockdown/private mode and
//      some embedded WebViews throw on `window.localStorage` access rather than
//      returning anything, so even reading the property needs a try.
//   3. **The methods can throw.** Quota exhaustion on write, and private-mode
//      quirks on read.
//
// A try/catch around an access handles all three, which is why the wrapped
// call sites elsewhere in this codebase (`useTowerState.persistRaw`, the
// GameScene helpers) were already fine. What was NOT fine was the handful of
// UNGUARDED module-scope reads — those run at import time, before any error
// boundary exists. Route those through here.
//
// Returns `null` for "no value and no storage", which is the same answer
// `getItem` gives for a missing key — so callers that already handle a missing
// key need no new branch.

/** The storage object, or `null` if this runtime does not really have one. */
const store = (which: 'localStorage' | 'sessionStorage'): Storage | null => {
  try {
    if (typeof window === 'undefined') return null
    const s = window[which]
    // Both halves matter: `null` on Playables, and a truthy-but-useless object
    // in exotic WebViews that expose the name without the API.
    return s && typeof s.getItem === 'function' ? s : null
  } catch {
    return null
  }
}

/** `localStorage.getItem`, total. `null` when there is no storage or no value. */
export const safeGetItem = (key: string): string | null => {
  const s = store('localStorage')
  if (!s) return null
  try { return s.getItem(key) } catch { return null }
}

/** `localStorage.setItem`, total. Returns whether the write actually happened. */
export const safeSetItem = (key: string, value: string): boolean => {
  const s = store('localStorage')
  if (!s) return false
  try { s.setItem(key, value); return true } catch { return false }
}

/** `localStorage.removeItem`, total. Returns whether the removal happened. */
export const safeRemoveItem = (key: string): boolean => {
  const s = store('localStorage')
  if (!s) return false
  try { s.removeItem(key); return true } catch { return false }
}

/** Whether this runtime has usable Web Storage at all. For diagnostics and for
 *  code that wants to skip work rather than write into a void. */
export const hasLocalStorage = (): boolean => store('localStorage') !== null

/**
 * Read a persisted boolean flag.
 *
 * The project's dev toggles are stored as `JSON.stringify(boolean)`, but have
 * historically also been written as bare `"true"`, so parse defensively and
 * treat anything unparseable as `false` rather than throwing. A flag that
 * cannot be read is a flag that is off.
 */
export const safeGetBool = (key: string): boolean => {
  const raw = safeGetItem(key)
  if (raw === null) return false
  try { return !!JSON.parse(raw) } catch { return raw === 'true' }
}
