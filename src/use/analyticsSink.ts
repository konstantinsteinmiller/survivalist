// ─── The portal analytics sink ──────────────────────────────────────────────
//
// Split out of `useAnalytics.ts` for ONE reason: so the Playgama build can
// alias it away wholesale (`resolve.alias` in `vite.config.ts` →
// `analyticsSink.stub.ts`), the same mechanism as `pokiPlugin.stub.ts` and
// `yandexPlugin.stub.ts`.
//
// An `if (import.meta.env.VITE_APP_PLAYGAMA === 'true') return null` at the top
// of the probe was tried first and is NOT enough — measured, not assumed: the
// obfuscator's `stringArray` pass hoists literals into its indirection table
// before esbuild folds the env comparison, so `PokiSDK`, `GamePix`, `gtag` and
// `dataLayer` all still turned up in the Playgama archive with the guard in
// place. That archive is also the YouTube Playables submission, where another
// portal's SDK name and a Google Analytics entry point are exactly what a
// reviewer greps for, and nothing in the bundle says they are unreachable.
//
// Nothing here is Playables-specific otherwise; every other platform gets the
// real probe unchanged.

import type { AnalyticsEvent, AnalyticsValue } from '@/use/useAnalytics'

export type Sink = (event: AnalyticsEvent, props: Record<string, AnalyticsValue>) => void

/**
 * Find the host page's event sink, if it has one.
 *
 * Called once and cached by the caller, because the answer cannot change after
 * boot and the probe walks four globals. `null` means "asked, nobody was
 * listening" and is a perfectly ordinary result — most portals we ship to have
 * no event API at all.
 */
export const probeSink = (): Sink | null => {
  if (typeof window === 'undefined') return null

  const w = window as any

  // Poki — the only portal SDK in the set with a first-class custom event.
  const poki = w.PokiSDK
  if (poki && typeof poki.customEvent === 'function') {
    return (event, props) => { poki.customEvent('survivalist', event, props) }
  }

  // GamePix publishes a generic reporter under a couple of spellings depending
  // on SDK vintage; take whichever exists.
  const gamepix = w.GamePix
  if (gamepix) {
    const fn = typeof gamepix.event === 'function'
      ? gamepix.event
      : typeof gamepix.trackEvent === 'function' ? gamepix.trackEvent : null
    if (fn) return (event, props) => { fn.call(gamepix, event, props) }
  }

  // A host page carrying its own analytics (portals frequently wrap the game
  // in one). Both spellings are the same pipe; prefer the tag API.
  if (typeof w.gtag === 'function') {
    return (event, props) => { w.gtag('event', event, props) }
  }
  if (w.dataLayer && typeof w.dataLayer.push === 'function') {
    return (event, props) => { w.dataLayer.push({ event, ...props }) }
  }

  return null
}
