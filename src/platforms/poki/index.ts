// ─── Poki platform module ───────────────────────────────────────────────────
//
// Shell that colocates the Poki-specific exports under a single barrel. Heavy
// implementations stay where they live (`@/utils/pokiPlugin`,
// `@/utils/save/PokiStrategy`, `@/use/ads/PokiProvider`) — this module is just a
// stable re-export surface plus the platform-module descriptor the registry
// enumerates.

export type { PlatformModule } from '../types'

export { PokiStrategy } from '@/utils/save/PokiStrategy'

export {
  pokiPlugin,
  readPokiLanguage,
  pokiGameLoadingFinished,
  pokiGameplayStart,
  pokiGameplayStop,
  notePokiFirstInteraction,
  showMidgameAdPoki,
  showRewardedAdPoki,
  syncPokiAdVolume,
  pokiMeasure,
  pokiCaptureError,
  pokiMovePill,
  isPokiSdkActive,
  isPokiAdsBlocked,
  pokiLocale,
  pokiDeviceCategory
} from '@/utils/pokiPlugin'

export { createPokiProvider } from '@/use/ads/PokiProvider'

export const platform = {
  id: 'poki' as const,
  envFlag: 'POKI',
  capabilities: {
    // No cloud-save API. Poki's wrapper mirrors localStorage + IndexedDB for
    // logged-in players with no game code involved — see PokiStrategy for the
    // three rules that come with that (1 MB gzip cap, reserved `poki_` prefix,
    // incognito try/catch).
    hasCloudSave: false,
    hasAds: true,
    // Deliberately empty: NO hostname gate. The bundle has to run in the Poki
    // Inspector (inspector.poki.dev) and in P4D Preview, not only on the
    // production *.poki-gdn.com origin — a URL gate would fail QA before it
    // ever reached a player. See `capabilities.ts`; the arm is flag-only.
    hostnameMatcher: '',
    portalEnforcesAgeGate: false,
    // Poki Kids (`?tag=kids`) is handled inside the SDK itself: the ad core is
    // never loaded and every call auto-resolves. Nothing for the game to signal.
    childDirectedAdSignal: false,
    needsParentOriginCheck: false
  }
}
