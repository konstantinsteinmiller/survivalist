// ─── Playgama Bridge plugin (SDK v2) ───────────────────────────────────────
//
// Lazy-loaded module that owns everything the game says to — and hears from —
// the Playgama Bridge. `main.ts` only imports it when `VITE_APP_PLAYGAMA` is
// true, so no other build carries the SDK glue.
//
// "Playgama Bridge" is the one abstraction Playgama ships across ~30 portals.
// The `build:playgama` archive runs on three of them:
//
//   playgama  playgama.com (and `playgama_sandbox`)
//   qa_tool   Playgama's developer QA Tool — a different postMessage protocol
//   youtube   YouTube Playables — Playgama distributes the SAME archive there
//
// and on localhost it falls back to `mock`.
//
// **DO NOT** set `forciblySetPlatformId`. The Bridge picks the adapter from the
// host (`usercontent.goog` → youtube, the portal handshake → playgama, …);
// pinning one breaks every other context, the QA Tool first.
//
// ─── v1 → v2 (2026-09-16) ──────────────────────────────────────────────────
//
//   1. SOURCE. v1 was `<script src="https://bridge.playgama.com/v1/stable/…">`
//      plus runtime-injected adapter chunks; v2 is the npm package, loaded by
//      `playgamaBridgeLoader.ts` and bundled whole. See that file for why.
//   2. EVENTS. v1 subscribed on sub-modules (`bridge.platform.on`) and `on()`
//      returned an unsubscribe fn. v2 forwards every module to the ROOT and
//      **`on()` returns void** — unsubscribe with `off(name, sameCallback)`.
//      Keeping the v1 shape leaks one listener per ad, and the leaked
//      listeners resolve LATER ads early.
//   3. ADS. `showInterstitial()` / `showRewarded()` return VOID, not a promise.
//      The state event is the whole lifecycle.
//   4. STORAGE. The storage-type argument is gone, and so is the
//      `allowAnonymousCloudSave` option (absent from the 2.2.0 bundle): the
//      Playgama adapter turns cloud storage on whenever the portal reports
//      `getIsCloudSaveSupported()`. See `PlaygamaStrategy`.
//
// ─── Page Visibility is BANNED on this build ───────────────────────────────
//
// Playables: "Game MUST NOT use the web Page Visibility API … and MUST only use
// Playables SDK `onPause` and `onResume`." The Bridge's `PAUSE_STATE_CHANGED`
// (fed by Playables' own `onPause`) and `VISIBILITY_STATE_CHANGED` are the ONLY
// pause sources here. Nothing in this file may read `document.hidden` /
// `document.visibilityState`. (Bridge's own YouTube adapter does listen to
// `visibilitychange` internally, to refresh the audio flag — that is Playgama's
// code inside their certified SDK, not ours.)
//
// NOTE: this file MUST stay free of `import('...')` expressions — the
// obfuscator's `stringArray` pass mangles their specifiers. The Bridge import
// lives in `playgamaBridgeLoader.ts`, which is on the obfuscator's exclude list.

import { ref } from 'vue'
import { isPlaygama } from '@/use/useUser'
import { isDebug } from '@/use/useMatch'
import { pauseGame, resumeGame } from '@/use/useGamePause'
import { setPlatformAudioMuted } from '@/use/useGamePauseAudio'
import { LANGUAGES } from '@/utils/enums'
import type { SaveStrategy } from '@/utils/save/types'
// Static import — the obfuscator's `stringArray` mangles dynamic-import
// literals, which on the Playgama QA Tool surfaced as
// `Failed to resolve module specifier '@/utils/save/PlaygamaStrategy'` at
// runtime. Static-importing it inlines the strategy into this already-lazy
// chunk; non-Playgama builds never reach this module.
import { PlaygamaStrategy } from '@/utils/save/PlaygamaStrategy'
import { setPortalBoard } from '@/use/usePortalLeaderboard'
import { createPlaygamaBoardAdapter } from '@/utils/playgamaLeaderboard'
import { loadPlaygamaBridge, type Bridge } from '@/utils/playgamaBridgeLoader'

/** The game-facing id of the board created on the Playgama dashboard. Empty
 *  means this build has no Playgama leaderboard; `vite.config.ts` then leaves
 *  the `saas` block out of the bridge config too. */
const LEADERBOARD_ID: string = (import.meta.env.VITE_PLAYGAMA_LEADERBOARD_ID ?? '').trim()

/**
 * Options handed to `bridge.initialize()`.
 *
 * v2 resolves its config as `load(configFilePath, these)`: it fetches
 * `./playgama-bridge-config.json` and falls back to this object ONLY if that
 * fetch or parse fails. The emitted file (`platforms/playgama/bridgeConfig.ts`)
 * is the primary source and carries the leaderboard block too; this is the net
 * for a QA wrapper or CDN that does not serve it.
 */
const BRIDGE_OPTIONS = {
  advertisement: { minimumDelayBetweenInterstitial: 120 }
} as const

// Production handshake on a cold start can take 5-7 s; generous headroom so a
// slow mobile load does not latch "ads blocked" for the session.
//
// NOT belt-and-braces on Playables: the Bridge's `youtube` adapter waits for
// `window.ytgame` with a 100 ms poll and NO timeout, so a page without YouTube's
// SDK tag would hang inside `initialize()` forever. `index.html` keeps that tag
// on this build; this race is what stops a missing one from being fatal. It
// also bounds the boot wait — `main.ts` awaits this before the save hydrate.
const INIT_TIMEOUT_MS = 15_000

// Hard-coded rather than read off `bridge.EVENT_NAME`: greppable in a QA
// console, and usable before `initialize()` resolves. They match the 2.2.0
// package's exported constants.
const EVENT = {
  PAUSE_STATE_CHANGED: 'pause_state_changed',
  AUDIO_STATE_CHANGED: 'audio_state_changed',
  VISIBILITY_STATE_CHANGED: 'visibility_state_changed',
  INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed',
  REWARDED_STATE_CHANGED: 'rewarded_state_changed'
} as const

const MESSAGE = {
  GAME_READY: 'game_ready',
  IN_GAME_LOADING_STARTED: 'in_game_loading_started',
  IN_GAME_LOADING_STOPPED: 'in_game_loading_stopped',
  GAMEPLAY_STARTED: 'gameplay_started',
  GAMEPLAY_STOPPED: 'gameplay_stopped'
} as const

/** Reactive: true once the Bridge has resolved `initialize()` successfully. */
export const isPlaygamaSdkActive = ref(false)
/** Reactive: true when the Bridge failed to come up or the module was blocked.
 *  Wired into `AdProvider.isAdsBlocked` via `PlaygamaProvider`. */
export const isPlaygamaAdsBlocked = ref(false)
/** An internal locale code from `LANGUAGES`, from `bridge.platform.language`.
 *  `null` until the portal reports one this game ships. */
export const playgamaLocale = ref<string | null>(null)
/** Platform id the Bridge picked after init (`playgama`, `youtube`,
 *  `qa_tool`, `mock`, …) — the first thing to check in a QA console. */
export const playgamaDetectedId = ref<string | null>(null)

// ─── Internal handles ──────────────────────────────────────────────────────

let sdk: Bridge | null = null
let initPromise: Promise<void> | null = null
let gameReadySent = false
let gameplayStartedActive = false

/**
 * The Bridge reports two independent reasons to halt: `PAUSE_STATE_CHANGED`
 * (portal overlays, ads, Playables' `onPause`) and `VISIBILITY_STATE_CHANGED`
 * (the portal's tab-hidden signal). Each is tracked separately and the game is
 * paused while EITHER holds — collapsing them would let a visibility resume
 * release a pause the portal still holds.
 */
let bridgePaused = false
let bridgeHidden = false

const applyPauseAggregate = (): void => {
  if (bridgePaused || bridgeHidden) pauseGame()
  else resumeGame()
}

const setBridgePaused = (paused: boolean): void => {
  if (paused === bridgePaused) return
  bridgePaused = paused
  applyPauseAggregate()
}

const setBridgeHidden = (hidden: boolean): void => {
  if (hidden === bridgeHidden) return
  bridgeHidden = hidden
  applyPauseAggregate()
}

/** Public accessor — `PlaygamaStrategy` reads `bridge.storage` through this.
 *  Null until `initialize()` has SUCCEEDED: its module getters throw "Before
 *  using the SDK you must initialize it" before that. */
export const getPlaygamaBridge = (): Bridge | null => sdk

// ─── Portal language ───────────────────────────────────────────────────────

/** Adapters with no portal behind them: their `platform.language` is just the
 *  browser language and must not be treated as a portal signal. */
const NO_PORTAL_LANGUAGE: ReadonlySet<string> = new Set(['mock', 'standalone'])

const LANGUAGE_ALIASES: Record<string, string> = {
  jpn: 'ja', kor: 'ko', cmn: 'zh', chi: 'zh', zho: 'zh',
  eng: 'en', deu: 'de', ger: 'de', spa: 'es', fra: 'fr', fre: 'fr',
  rus: 'ru', ara: 'ar', ukr: 'uk', tur: 'tr', pol: 'pl', nld: 'nl',
  dut: 'nl', ita: 'it', por: 'pt', hin: 'hi', tha: 'th', vie: 'vi',
  ind: 'id', kaz: 'kk', uzb: 'uz'
}

/**
 * BCP-47 / ISO-639 tag → an internal code from `LANGUAGES`, or `null` for a
 * language this game does not ship. `null`, never the raw code, so an unshipped
 * portal language cannot knock the player out of a language they chose.
 * Script and region subtags collapse (`zh-Hant` → `zh`, `pt-BR` → `pt`).
 */
export const normalizePlaygamaLanguage = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null
  const base = raw.toLowerCase().trim().split(/[-_]/)[0]
  if (!base) return null
  const code = LANGUAGE_ALIASES[base] ?? base
  return LANGUAGES.includes(code) ? code : null
}

let lastLoggedLanguage: string | null = null

/** Read `platform.language` and publish it. Never clears an earlier value. */
const readPortalLanguage = (bridge: Bridge | null = sdk): void => {
  try {
    const id = bridge?.platform?.id ?? ''
    if (NO_PORTAL_LANGUAGE.has(id)) return
    const raw = bridge?.platform?.language
    const code = normalizePlaygamaLanguage(raw)
    if (raw !== lastLoggedLanguage) {
      lastLoggedLanguage = typeof raw === 'string' ? raw : null
      console.info('[playgama] portal language:', raw, '→', code ?? '(not shipped, ignored)')
    }
    if (code && code !== playgamaLocale.value) playgamaLocale.value = code
  } catch (e) {
    if (isDebug.value) console.warn('[playgama] platform.language read threw', e)
  }
}

/**
 * Poll for a mid-session language switch. The Bridge has no language-change
 * event, and Playgama's QA Tool flips the language WITHOUT reloading the frame
 * — a one-shot read at init fails its localization check ("the platform signal
 * to change the locale did not have any effect", filed against merge-idle-war).
 * The idle skip reads the Bridge's own visibility state, never the DOM's.
 */
const LANGUAGE_POLL_MS = 2_000
let languagePollId: ReturnType<typeof setInterval> | null = null

const startLanguageWatch = (): void => {
  if (languagePollId !== null || typeof window === 'undefined') return
  languagePollId = setInterval(() => {
    if (!bridgeHidden) readPortalLanguage()
  }, LANGUAGE_POLL_MS)
}

/** Test-only teardown so the poll cannot leak across test files. */
export const __stopPlaygamaLanguageWatch = (): void => {
  if (languagePollId !== null) clearInterval(languagePollId)
  languagePollId = null
  lastLoggedLanguage = null
}

// ─── Public init ───────────────────────────────────────────────────────────

export const playgamaPlugin = (): Promise<void> => {
  if (initPromise) return initPromise
  if (!isPlaygama) {
    initPromise = Promise.resolve()
    return initPromise
  }
  initPromise = (async () => {
    const bridge = await loadPlaygamaBridge()
    if (!bridge) {
      isPlaygamaAdsBlocked.value = true
      console.warn('[playgama] Bridge module unavailable — ads and cloud save disabled')
      return
    }
    try {
      let timer: ReturnType<typeof setTimeout> | null = null
      try {
        await Promise.race([
          bridge.initialize(BRIDGE_OPTIONS),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('initialize() timeout')), INIT_TIMEOUT_MS)
          })
        ])
      } finally {
        if (timer !== null) clearTimeout(timer)
      }
      sdk = bridge
      isPlaygamaSdkActive.value = true
      playgamaDetectedId.value = bridge.platform?.id ?? null
      console.info('[playgama] Bridge v%s initialized — platform.id: %s', bridge.version, playgamaDetectedId.value)

      readPortalLanguage(bridge)
      startLanguageWatch()

      // Initial states FIRST, then the edges. A portal that boots muted or
      // paused never sends a change event for the state it started in —
      // Playgama filed exactly that against tower-siege.
      if (typeof bridge.platform?.isPaused === 'boolean') setBridgePaused(bridge.platform.isPaused)
      if (typeof bridge.platform?.isAudioEnabled === 'boolean') {
        setPlatformAudioMuted(!bridge.platform.isAudioEnabled)
      }

      // Aggregated pause already covers ads and overlays — do NOT also pause on
      // INTERSTITIAL/REWARDED state, that double-counts the suspend stack.
      bridge.on(EVENT.PAUSE_STATE_CHANGED, (paused: unknown) => setBridgePaused(!!paused))
      bridge.on(EVENT.VISIBILITY_STATE_CHANGED, (state: unknown) => {
        setBridgeHidden(state === 'hidden')
        // Returning to the tab is a natural moment for the portal language to
        // have changed; costs one property read.
        if (state !== 'hidden') readPortalLanguage(bridge)
      })
      // Portal mute is its own audio slot, NOT a pause: muting the portal
      // chrome must silence the game without freezing it, and a mute that
      // arrives before the music exists must still gate its start
      // (`isPlatformAudioMuted`, see `useGamePauseAudio`).
      bridge.on(EVENT.AUDIO_STATE_CHANGED, (enabled: unknown) => {
        setPlatformAudioMuted(enabled === false)
      })
    } catch (e) {
      console.warn('[playgama] initialize() failed', e)
      isPlaygamaAdsBlocked.value = true
      // A bridge whose init rejected may still know its language.
      readPortalLanguage(bridge)
    }
  })()
  return initPromise
}

// ─── Lifecycle messages ────────────────────────────────────────────────────

const sendMessage = (name: string): void => {
  try {
    // v2 `sendMessage` returns a promise that REJECTS on portals which do not
    // implement the message. That is not a game-facing failure.
    const result = sdk?.platform?.sendMessage?.(name)
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      void (result as Promise<unknown>).catch(() => {})
    }
  } catch (e) {
    if (isDebug.value) console.warn('[playgama] sendMessage failed', name, e)
  }
}

/** Fires `in_game_loading_started`. A no-op until init resolved. */
export const playgamaLoadingStart = (): void => {
  if (!isPlaygamaSdkActive.value) return
  sendMessage(MESSAGE.IN_GAME_LOADING_STARTED)
}

/** Fires `in_game_loading_stopped` AND `game_ready` (once). `game_ready` is
 *  certification-mandatory on the QA Tool, and on Playables Bridge forwards it
 *  as `ytgame.game.gameReady()` (it calls `firstFrameReady()` itself at init).
 *  Idempotent. */
export const playgamaGameLoadingStop = (): void => {
  if (!isPlaygamaSdkActive.value) return
  sendMessage(MESSAGE.IN_GAME_LOADING_STOPPED)
  if (gameReadySent) return
  gameReadySent = true
  sendMessage(MESSAGE.GAME_READY)
}

/** Notify the portal that gameplay is starting. Idempotent. */
export const playgamaGameplayStart = (): void => {
  if (!isPlaygamaSdkActive.value || gameplayStartedActive) return
  gameplayStartedActive = true
  sendMessage(MESSAGE.GAMEPLAY_STARTED)
}

/** Companion to `playgamaGameplayStart`. Idempotent. */
export const playgamaGameplayStop = (): void => {
  if (!isPlaygamaSdkActive.value || !gameplayStartedActive) return
  gameplayStartedActive = false
  sendMessage(MESSAGE.GAMEPLAY_STOPPED)
}

// ─── Ad show wrappers ──────────────────────────────────────────────────────

/** Shows an interstitial; resolves on `closed` or `failed`. Never rejects. */
export const showInterstitialPG = async (onImpression?: () => void): Promise<void> => {
  await playgamaPlugin()
  const bridge = sdk
  if (!isPlaygamaSdkActive.value || !bridge?.advertisement?.showInterstitial) return
  return new Promise<void>((resolve) => {
    let settled = false
    let hardCap: ReturnType<typeof setTimeout> | null = null
    const finish = (): void => {
      if (settled) return
      settled = true
      if (hardCap !== null) clearTimeout(hardCap)
      try { bridge.off(EVENT.INTERSTITIAL_STATE_CHANGED, onState) } catch { /* ignore */ }
      resolve()
    }
    const onState = (state: unknown): void => {
      // 'opened' is the impression edge `useAds` needs: unreported, its 6 s
      // "never opened" cap releases the wait mid-ad and the result screen goes
      // up on top of a playing interstitial.
      if (state === 'opened') { onImpression?.(); return }
      if (state === 'closed' || state === 'failed') finish()
    }
    bridge.on(EVENT.INTERSTITIAL_STATE_CHANGED, onState)
    try {
      bridge.advertisement.showInterstitial()
    } catch (e) {
      console.warn('[playgama] showInterstitial threw', e)
      finish()
    }
    // A dropped state event must not strand the caller — and with it the
    // ad-pause gate — for the rest of the session.
    hardCap = setTimeout(finish, 60_000)
  })
}

/** Shows a rewarded video. Resolves `true` only when the Bridge fired
 *  `'rewarded'` before `'closed'` / `'failed'` — granting on `'closed'` alone is
 *  a certification-graded violation. */
export const showRewardedPG = async (onImpression?: () => void): Promise<boolean> => {
  await playgamaPlugin()
  const bridge = sdk
  if (!isPlaygamaSdkActive.value || !bridge?.advertisement?.showRewarded) return false
  return new Promise<boolean>((resolve) => {
    let settled = false
    let rewarded = false
    let hardCap: ReturnType<typeof setTimeout> | null = null
    const finish = (): void => {
      if (settled) return
      settled = true
      if (hardCap !== null) clearTimeout(hardCap)
      try { bridge.off(EVENT.REWARDED_STATE_CHANGED, onState) } catch { /* ignore */ }
      resolve(rewarded)
    }
    const onState = (state: unknown): void => {
      if (state === 'opened') { onImpression?.(); return }
      if (state === 'rewarded') { rewarded = true; return }
      if (state === 'closed' || state === 'failed') finish()
    }
    bridge.on(EVENT.REWARDED_STATE_CHANGED, onState)
    try {
      bridge.advertisement.showRewarded()
    } catch (e) {
      console.warn('[playgama] showRewarded threw', e)
      finish()
    }
    hardCap = setTimeout(finish, 120_000)
  })
}

// ─── Leaderboard ───────────────────────────────────────────────────────────

/**
 * Hand Playgama's leaderboard to the portal-board layer. Call after
 * `playgamaPlugin()` resolved; a no-op when the bridge did not come up or the
 * build carries no leaderboard id.
 *
 * Registered even when `type` is `not_available` (localhost MOCK): the adapter
 * reports that mode, and the portal layer then neither posts nor shows a tab.
 */
export const registerPlaygamaLeaderboard = (): void => {
  const bridge = sdk
  if (!isPlaygamaSdkActive.value || !bridge || LEADERBOARD_ID.length === 0) return
  try {
    if (!bridge.leaderboards) return
    setPortalBoard(createPlaygamaBoardAdapter(bridge, LEADERBOARD_ID))
    console.info('[playgama] leaderboard', LEADERBOARD_ID, '— type:', bridge.leaderboards.type)
  } catch (e) {
    if (isDebug.value) console.warn('[playgama] leaderboard registration failed', e)
  }
}

// ─── Save-strategy factory ─────────────────────────────────────────────────

/** Build the Playgama save strategy. Non-Playgama builds never reach this code
 *  (resolveSaveStrategy's `VITE_APP_PLAYGAMA` arm is dead there). */
export const createPlaygamaSaveStrategy = async (): Promise<SaveStrategy> => {
  return new PlaygamaStrategy()
}
