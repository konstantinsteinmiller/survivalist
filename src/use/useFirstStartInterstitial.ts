// First-PLAY interstitial for GameMonetize / GameDistribution / Poki.
//
// GameMonetize / GameDistribution moderation requires an ad "the first time
// after the game loads or on the first Play button click." We fire it on the
// first CLICK-TO-START of the session rather than auto-firing after the splash:
// an intentional Play gesture is not an incidental-click impression (that's why
// the post-splash auto-fire was removed for these networks — see the comment in
// `FLogoProgress.vue`). Gated to GM / GD builds only; GamePix keeps its own
// post-splash first-load interstitial (`useFirstLoadInterstitial`).
//
// Audio contract (the caller relies on this): `showMidgameAd` hard-stops the
// music, kills every in-flight one-shot SFX, and holds the universal audio +
// pause gate (`isAdShowing` → `useGamePauseAudio` suspends Web Audio) for the
// whole ad lifetime, resolving ONLY on the ad's close OR a no-fill. So the
// caller must `await` this BEFORE it starts the run — the run's battle music
// then begins fresh after the ad finishes (or immediately on a no-fill), and
// never plays underneath the ad.
//
// POKI is here for a different reason than the other two, and it is worth
// stating because it looks like an extra ad and is not. Poki has no
// `showPreroll()`: the position of a `commercialBreak()` is IMPLICIT, decided by
// the core as `__gameStarted ? midroll : preroll`, and `__gameStarted` flips on
// the first `gameplayStart()`. `GameScene.boot()` awaits this call BEFORE
// `startStage()`, so on Poki it is the session's PREROLL — priced and paced as
// one — and the between-runs ad in `presentResult()` is then correctly reported
// as a midroll. Without this call Poki simply never gets a preroll; with it
// fired later, a midroll would be miscounted as one and skew the dashboard.
//
// Fires at most once per session (module-level flag survives a GameScene
// remount). Resolves immediately (no ad) on non-GM/GD builds and when no
// interstitial is currently fillable — leaving the flag unset in the
// not-fillable case so a slightly-too-early first tap retries on the next
// start instead of permanently missing the placement.
import { isGameMonetize, isGameDistribution, isPoki } from '@/use/useUser'
import { isInterstitialReady, showMidgameAd } from '@/use/useAds'

let firstStartAdShown = false

/**
 * Show the first-play interstitial if this is the first eligible click-to-start
 * of the session on a GameMonetize / GameDistribution / Poki build and an
 * interstitial is fillable. Resolves when the ad closes (or no-fills); resolves immediately
 * when not applicable. `await` this before starting the run so the ad plays
 * before any music.
 */
export const playFirstStartInterstitial = async (): Promise<void> => {
  if (firstStartAdShown) return
  if (!(isGameMonetize || isGameDistribution || isPoki)) return
  // Not ready yet (SDK still initialising on a fast first tap) → don't burn the
  // one-shot; retry on the next start.
  if (!isInterstitialReady.value) return
  firstStartAdShown = true
  await showMidgameAd()
}

/** Test-only: reset the once-per-session guard. */
export const __resetFirstStartInterstitial = (): void => {
  firstStartAdShown = false
}
