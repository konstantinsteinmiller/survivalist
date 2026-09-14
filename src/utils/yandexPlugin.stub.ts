// ─── yandexPlugin no-op stub (non-Yandex builds only) ───────────────────────
//
// Replaces `@/utils/yandexPlugin` on non-Yandex builds via `resolve.alias` in
// `vite.config.ts`. Same mechanism, and the same reason, as
// `pokiPlugin.stub.ts` and `gamepixPlugin.stub.ts`.
//
// WHY THIS EXISTS: `YandexProvider` was already stub-swapped, but that only
// covered the STATIC path. `main.ts` and `FLogoProgress.vue` still reach the
// real module through `await import('@/utils/yandexPlugin')`, and a dynamic
// import is a chunk: every build emitted a `yandexPlugin-*.js` carrying
// `https://yandex.ru/ads/system/context.js`, whether or not anything ever
// called it. The env-literal `if` at each call site does not help — the
// obfuscator's `stringArray` pass hoists string literals into its indirection
// table BEFORE esbuild folds the env comparison, so the URL survives DCE.
//
// It was found in the PLAYGAMA archive, which is also the YouTube Playables
// submission — and Playables forbids monetizing or advertising through
// off-platform services, so another portal's ad SDK riding along in the bundle
// is a certification finding even though it is inert. It is the same string
// class Yandex's own moderator rejects as "Service storage URL detected",
// which is why the fix is worth having on every build rather than just this one.
//
// Aliasing keeps the URL out of the bundle AND leaves a valid module for the
// dynamic importers to resolve — no chunk deletion, no dangling reference, no
// 404 (the failure mode that broke GameScene when chunk-stripping was tried).
//
// Must match the real module's FULL export surface — every name imported
// anywhere, including the `platforms/yandex` barrel re-exports. No Yandex URL
// literal anywhere in this file.

import { ref } from 'vue'
import type { Ref } from 'vue'

// Structural only — no values, so nothing reaches the bundle. Kept loose on
// purpose: the real interfaces describe an SDK that is absent here, and a stub
// that mirrors their shape would be a second thing to keep in sync for no gain.
export type YandexPlayer = Record<string, any>
export type YandexSdk = Record<string, any>

export const isYandexSdkActive: Ref<boolean> = ref(false)
export const isYandexAdsBlocked: Ref<boolean> = ref(false)
export const yandexLocale: Ref<string | null> = ref(null)

export const yandexPlugin = async (): Promise<void> => {}
export const getYandexPlayer = (): YandexPlayer | null => null
export const getYandexSdk = (): YandexSdk | null => null
export const yandexLoadingReady = (): void => {}
export const yandexGameplayStart = (): void => {}
export const yandexGameplayStop = (): void => {}

export const showRewardedAdYA = async (): Promise<boolean> => false
export const showMidgameAdYA = async (_onImpression?: () => void): Promise<void> => {}

// The real module's default export is the `useYandex` composable. Nothing in
// the non-Yandex graph calls it, but the default has to exist or a
// `import useYandex from '@/utils/yandexPlugin'` would resolve to undefined.
const useYandex = () => ({
  isYandexSdkActive,
  isYandexAdsBlocked,
  yandexLocale,
  yandexPlugin,
  getYandexPlayer,
  getYandexSdk,
  yandexLoadingReady,
  yandexGameplayStart,
  yandexGameplayStop,
  showRewardedAdYA,
  showMidgameAdYA
})

export default useYandex
