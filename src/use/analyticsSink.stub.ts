// ─── analyticsSink no-op stub (Playgama / YouTube Playables build only) ─────
//
// Replaces `@/use/analyticsSink` on the Playgama build via `resolve.alias` in
// `vite.config.ts`. Note the inverted polarity versus the other stubs in this
// codebase: those swap OUT on the platform that does not own the SDK, this one
// swaps out on ONE platform specifically.
//
// WHY: the Playgama archive is also the YouTube Playables submission, and
// Playables bans external calls outright — Playgama's own requirements restate
// it as "no external analytics reports". So there is no legitimate sink to find
// there, and probing for one only risks discovering a host-page `gtag` and
// reporting into it.
//
// A guard inside the real probe was tried first and measurably did not keep the
// names out of the bundle: the obfuscator's `stringArray` pass hoists literals
// before esbuild folds `import.meta.env.VITE_APP_PLAYGAMA === 'true'`, so
// `PokiSDK`, `GamePix`, `gtag` and `dataLayer` survived dead-code elimination
// into the archive. Aliasing the whole module is the only form that works,
// because the strings are never compiled in the first place.
//
// `track()` still runs, still fills its in-memory ring, and still feeds the
// debug overlay — only the OUTBOUND leg is gone. Must match the real module's
// full export surface.

import type { AnalyticsEvent, AnalyticsValue } from '@/use/useAnalytics'

export type Sink = (event: AnalyticsEvent, props: Record<string, AnalyticsValue>) => void

export const probeSink = (): Sink | null => null
