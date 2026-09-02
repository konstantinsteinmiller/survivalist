// ─── YandexProvider no-op stub (non-Yandex builds only) ─────────────────────
//
// Replaces `YandexProvider.ts` on builds that don't target Yandex Games, via a
// `resolve.alias` in `vite.config.ts`. Same mechanism and same reason as the
// CrazyGames / GamePix / Playgama / GameMonetize stubs beside it — Yandex was
// simply the one provider that never got one.
//
// It is not only the `name: 'yandex'` literal at stake here. `resolveAdProvider`
// STATICALLY imports every provider, and `YandexProvider` in turn statically
// imports `@/utils/yandexPlugin`, which hardcodes Yandex's ad-system URLs
// (`https://an.yandex.ru/system/context.js`,
// `https://yandex.ru/ads/system/context.js`). The env-literal gate in
// `resolveAdProvider` is not enough to keep them out: the obfuscator's
// `stringArray` pass hoists string literals into its indirection table BEFORE
// esbuild folds `import.meta.env.VITE_APP_YANDEX === 'true'` to `false`, so the
// URLs survive dead-code elimination. Measured, not assumed — both hosts were
// found in the Poki build's entry chunk until this stub existed, and Poki's
// external-resource policy is the strictest in the matrix.
//
// Aliasing keeps the URLs out of the bundle AND leaves a valid module behind for
// the static importer to resolve — no chunk deletion, no dangling import.

import { ref } from 'vue'
import type { AdProvider } from './types'

const inertRef = ref(false)

export const createYandexProvider = (): AdProvider => ({
  name: '',
  isReady: inertRef,
  isRewardedReady: inertRef,
  isInterstitialReady: inertRef,
  isAdsBlocked: inertRef,
  init: async () => {},
  showRewardedAd: async () => false,
  showMidgameAd: async () => {}
})
