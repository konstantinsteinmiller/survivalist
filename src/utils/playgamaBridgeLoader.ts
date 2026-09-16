// ─── Playgama Bridge v2 loader ─────────────────────────────────────────────
//
// The ONE place `@playgama/bridge` enters the module graph. Its own tiny file
// for two structural reasons:
//
// 1. THE IMPORT MUST BE BUILD-GATED. The npm package is a ~300 KB single-file
//    bundle with a module-level singleton (`window.bridge`), so Rollup cannot
//    prove it side-effect-free — anything reaching it from a shared module
//    would ship the whole Bridge to CrazyGames, GameDistribution, itch, GamePix,
//    Yandex and Poki.
//
//    `if (isPlaygama) await import(...)` is NOT enough: the syntactic dynamic
//    import survives and Rollup still emits the chunk. The `import.meta.env`
//    literal TERNARY below is what removes it — Vite substitutes the literal at
//    parse time and the dead arm, `import()` included, is eliminated.
//
// 2. OBFUSCATOR. `vite-plugin-javascript-obfuscator`'s `stringArray` pass
//    rewrites the specifier inside `import('...')` into a lookup Vite can no
//    longer resolve, so this file is on the obfuscator's exclude list in
//    `vite.config.ts` (the Playgama build ships unobfuscated anyway).
//
// Why npm rather than the v1 CDN `<script>` this game used until 2026-09-16:
// the `build:playgama` archive is also the YouTube Playables submission, and
// the CDN build is a webpack bundle with `publicPath =
// "https://bridge.playgama.com/v1/stable/"` — it fetches its platform adapter
// as a dynamically injected script at runtime. Playables forbids both the
// external call and the injected tag (it lacks YouTube's CSP nonce). The npm
// build contains every adapter and loads nothing at runtime. Playgama QA also
// rejects v1 outright now ("please update Bridge to v2").
//
// What v2 still sends over the network, read out of the 2.2.0 bundle: its
// analytics beacon (`api.playgama.com/api/events/v3/...`) switches itself OFF
// wherever `platform.isExternalCallsSupported` is false (YouTube, Poki, GD,
// GameSnacks, Facebook, Reddit) and on `localhost` / `127.0.0.1`; and the SaaS
// leaderboard only talks to `api.playgama.com` on the platforms listed in the
// config (`playgama`, `qa_tool`).

// The package's DEFAULT export is the singleton INSTANCE; the class type is
// exported separately as `PlaygamaBridge`.
import type { PlaygamaBridge } from '@playgama/bridge'

export type Bridge = PlaygamaBridge

/**
 * Resolve the Bridge singleton, or `null` on a build that is not targeting
 * Playgama. Never throws — a failed import degrades to "no SDK" and the game
 * runs local-only rather than dying on the splash.
 */
export const loadPlaygamaBridge: () => Promise<Bridge | null> =
  import.meta.env.VITE_APP_PLAYGAMA === 'true'
    ? async () => {
      try {
        const mod = await import('@playgama/bridge')
        return mod.default ?? null
      } catch (e) {
        console.warn('[playgama] Bridge module failed to load', e)
        return null
      }
    }
    : async () => null
