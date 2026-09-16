import { ref } from 'vue'
import { prependBaseUrl } from '@/utils/function'
import {
  primeSurvivors, survivorsReady, survivorBakeProgress01, bakeSurvivorSlice
} from '@/game/heroSprites'
import {
  primeMonsterSprites, monstersReady, monsterBakeProgress01, bakeMonsterSlice
} from '@/game/monsterSprites'
import { stageDesigns } from '@/game/foes'
import { getState } from '@/use/useTowerState'
import { STAGE_KEY } from '@/keys'
import { artOverridesEnabled, preloadArtOverrides } from '@/game/art'
import { criticalArtWants, preloadRemainingArt } from '@/game/artPreload'

// Survivalist draws all gameplay art programmatically (Canvas 2D) and uses
// inline SVG for HUD icons, so the preloader only has to decode two pieces of
// UI chrome. SFX decode on first play (see `useSound.ts`) and are warmed on an
// idle slot after first paint; the splash exits as soon as the bundle parses.

const loadingProgress = ref(100)
const areAllAssetsLoaded = ref(true)

export const resourceCache = {
  images: new Map<string, HTMLImageElement>(),
  audio: new Map<string, HTMLAudioElement>(),
  audioBuffers: new Map<string, AudioBuffer>()
}

let sharedAudioCtx: AudioContext | null = null
let resumeListenerArmed = false
/** Counts every active reason the audio layer should be globally
 *  silent. The single driver is now `useGamePauseAudio`, which holds one
 *  slot for the whole `isGamePaused` gate (ad mid-show, tab hidden,
 *  platform SDK pause, app modal). Each `suspendAllAudio()` increments,
 *  each `resumeAllAudio()` decrements; the AudioContext only resumes when
 *  the counter hits 0 — so an overlapping suspend (e.g. modal opened
 *  during an ad) can never re-unmute early. */
let suspendDepth = 0

export const getAudioContext = (): AudioContext | null => {
  if (sharedAudioCtx) return sharedAudioCtx
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!Ctor) return null
  try {
    sharedAudioCtx = new Ctor() as AudioContext
  } catch {
    return null
  }
  // Born into an already-suspended world. A context constructed on a page that
  // has seen a user gesture starts `running`, so one created AFTER a mute has
  // landed (a portal `soundOff` at boot, a tab hidden before the first sound, an
  // ad opening before any SFX has played) would come up audible underneath it —
  // `suspendAllAudio` had already run and had nothing to suspend. The depth
  // counter is the honest record of whether anything wants silence right now.
  if (suspendDepth > 0) {
    try { void sharedAudioCtx.suspend() } catch { /* older impls */ }
  }
  armResumeOnGesture()
  return sharedAudioCtx
}

/** True while engine audio is globally suspended (an ad is on-screen, the
 *  tab is hidden, etc.). SFX entry points (`useSound`) read this to refuse
 *  starting a new one-shot during an ad — so nothing leaks past the mute. */
export const isAudioSuspended = (): boolean => suspendDepth > 0

const armResumeOnGesture = (): void => {
  if (resumeListenerArmed) return
  resumeListenerArmed = true
  const resume = () => {
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended' && suspendDepth === 0) {
      void sharedAudioCtx.resume()
    }
  }
  window.addEventListener('pointerdown', resume, { once: true })
  window.addEventListener('keydown', resume, { once: true })
}

/** Bookkeeping for HTMLAudio elements (music, fallback SFX path) so
 *  the suspend/resume helpers can pause + restart them alongside the
 *  Web Audio context. Loops register on creation in useSound. */
const trackedAudioElements = new Set<HTMLAudioElement>()
const pausedByGlobalSuspend = new WeakSet<HTMLAudioElement>()

export const registerHtmlAudio = (el: HTMLAudioElement) => {
  trackedAudioElements.add(el)
}
export const unregisterHtmlAudio = (el: HTMLAudioElement) => {
  trackedAudioElements.delete(el)
  pausedByGlobalSuspend.delete(el)
}

/** Suspend all engine audio — Web Audio context goes to `suspended`
 *  and any registered HTMLAudio element is paused (and remembered so a
 *  later resume can restart only the ones we actually paused). Stacks:
 *  multiple `suspendAllAudio()` calls require matching `resume` calls
 *  before audio plays again. */
export const suspendAllAudio = (): void => {
  suspendDepth += 1
  if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
    void sharedAudioCtx.suspend()
  }
  for (const el of trackedAudioElements) {
    if (!el.paused) {
      pausedByGlobalSuspend.add(el)
      try { el.pause() } catch { /* ignore */ }
    }
  }
}

export const resumeAllAudio = (): void => {
  suspendDepth = Math.max(0, suspendDepth - 1)
  if (suspendDepth > 0) return
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume()
  }
  for (const el of trackedAudioElements) {
    if (pausedByGlobalSuspend.has(el)) {
      pausedByGlobalSuspend.delete(el)
      void el.play().catch(() => { /* autoplay blocked / element gone */ })
    }
  }
}

// ─── Active one-shot SFX registry ─────────────────────────────────────────
// Transient one-shot SFX (the Web Audio fast path in `useSound`) play on the
// shared AudioContext and aren't HTMLAudio elements, so the suspend gate only
// FREEZES them via `ctx.suspend()`. On an early gate-drop they'd resume and
// tail audibly under an ad. We track them so an ad can hard-STOP them outright.
const activeOneShotSources = new Set<AudioBufferSourceNode>()

/** Register a one-shot Web Audio source so `killOneShotSfx()` can stop it.
 *  Auto-removes itself when the source finishes. */
export const registerOneShotSource = (source: AudioBufferSourceNode): void => {
  activeOneShotSources.add(source)
  source.addEventListener('ended', () => activeOneShotSources.delete(source), { once: true })
}

/**
 * Hard-stop EVERY in-flight one-shot SFX so nothing tails into an ad — called
 * right before an interstitial / rewarded ad is requested. Covers:
 *   • Web Audio one-shots  (stopped outright), and
 *   • non-looping tracked HTMLAudio (the decode-fallback one-shots) — paused
 *     AND dropped from the auto-resume set so the gate's resume can't restart
 *     them under or after the ad.
 * Intentionally leaves the bg music (HTMLAudio with `loop=true` → owned by
 * `forceStopMusic`) and the gameplay Web Audio LOOP (owned by the scene's
 * pause watcher) alone, so each is restored by its proper lifecycle.
 */
export const killOneShotSfx = (): void => {
  for (const s of [...activeOneShotSources]) {
    try { s.stop() } catch { /* already ended */ }
    activeOneShotSources.delete(s)
  }
  for (const el of trackedAudioElements) {
    if (el.loop) continue // bg music — forceStopMusic owns its stop/restart
    pausedByGlobalSuspend.delete(el)
    if (!el.paused) { try { el.pause() } catch { /* ignore */ } }
  }
}

// Visibility-driven suspend used to live here (`armVisibilitySuspend`). It
// moved into the unified pause gate: `useGamePause` owns the
// `visibilitychange` listener (flipping `isVisibilityHidden`) and
// `useGamePauseAudio` suspends/resumes audio off that gate for ALL builds —
// so there is one suspend driver instead of two overlapping ones.

// ⚠️ TEMP TEST HARNESS (remove before commit) — exposes the live audio state
// so the Chrome MCP can assert "no sound during the fake interstitial". Reads
// the module-private AudioContext + tracked-element registry that aren't
// otherwise observable from the page. Paired with `window.__testInterstitial`
// / `window.__audioDebug` in `useAds.ts`.
export const __audioDebugSnapshot = () => ({
  audioCtxState: sharedAudioCtx ? sharedAudioCtx.state : 'none',
  suspendDepth,
  trackedAudioCount: trackedAudioElements.size,
  trackedAudioPaused: [...trackedAudioElements].map((e) => e.paused),
  anyTrackedAudioPlaying: [...trackedAudioElements].some((e) => !e.paused),
  activeOneShotSfx: activeOneShotSources.size
})

export const getCachedImage = (src: string): HTMLImageElement => {
  // Route every bitmap src through `prependBaseUrl` so the URL matches
  // the build's base. Critical for wavedash (and any other build that
  // ships with `--base=./`) where the CDN serves the bundle under a
  // hashed path prefix — bare `/images/foo.webp` 404s against the CDN
  // root, but `<base>/images/foo.webp` hits the build folder. Cache
  // keys off the prefixed URL so multiple callers (one passing the
  // leading slash, another not) still hit the same entry after the
  // helper's normalisation.
  const prefixed = prependBaseUrl(src)
  const existing = resourceCache.images.get(prefixed)
  if (existing) return existing
  const img = new Image()
  img.src = prefixed
  resourceCache.images.set(prefixed, img)
  return img
}

const pendingDecodes = new Map<string, Promise<AudioBuffer | null>>()

export const loadAudioBuffer = async (src: string): Promise<AudioBuffer | null> => {
  const cached = resourceCache.audioBuffers.get(src)
  if (cached) return cached
  const existing = pendingDecodes.get(src)
  if (existing) return existing

  const ctx = getAudioContext()
  if (!ctx) return null

  const promise = (async () => {
    try {
      const res = await fetch(src)
      if (!res.ok) return null
      const arrayBuffer = await res.arrayBuffer()
      const buffer = await ctx.decodeAudioData(arrayBuffer)
      resourceCache.audioBuffers.set(src, buffer)
      return buffer
    } catch (e) {
      console.warn(`[assets] decodeAudioData failed for ${src}`, e)
      return null
    } finally {
      pendingDecodes.delete(src)
    }
  })()
  pendingDecodes.set(src, promise)
  return promise
}

/**
 * How long the splash may wait on the survivor strips before giving up and
 * letting the player in anyway.
 *
 * A ceiling, not a target: with the bake-slice fix in `heroSprites.ts` the whole
 * set lands in well under a second even on a thread with no idle time. But a
 * loading screen that can hang forever is a worse bug than a crowd of capsules,
 * so the wait is bounded — and the fallback path is exactly the old behaviour.
 */
const SPRITE_BAKE_TIMEOUT_MS = 6000

/**
 * How long the splash may wait on the FIRST SCREEN's paintings, ms.
 *
 * The same kind of ceiling as `SPRITE_BAKE_TIMEOUT_MS`, against a worse risk:
 * the bake is local work that always finishes, and this is a network. Longer,
 * because unlike the bake there is a real first impression on the other side of
 * it and giving up at six seconds on a connection that would have delivered in
 * seven costs exactly what the wait was for. Past it the player is let in and
 * the paintings swap themselves in as they land.
 */
const CRITICAL_ART_TIMEOUT_MS = 10000

/** Share of the loading bar given to image decodes; the rest is the sprite
 *  bake. The images are one file and the bake is hundreds of canvases, so the
 *  bar spends most of its life where the time actually goes. */
const IMAGE_SHARE = 0.1
/** Of the bake, the share given to the survivor strips. The foe cast is far
 *  bigger (13 designs x 16 frames against 3 x 14) and its frames are dearer, so
 *  it owns most of the bar. */
const SURVIVOR_SHARE = 0.25
/** Where the bake's share of the bar ends when painted art is on: the last
 *  stretch belongs to the first stage's bitmaps, so the number keeps moving
 *  instead of parking at 100% while they land. */
const BAKE_END_WITH_ART = 0.7

// ─── Critical image preload ────────────────────────────────────────────
// Nothing, any more. The splash logo was Tower Siege's and went with it; the
// result screen's parchment ribbon was the last bitmap here, and it is now a
// banner drawn from code (`uiArt.ts`) like everything else on the field. The
// list stays so the next critical bitmap has somewhere to go — and so the
// loading bar's image share is still accounted for.
const CRITICAL_IMAGE_SRCS: ReadonlyArray<string> = []

/** Block until `img.complete && naturalWidth > 0` (success) or `error`
 *  fires (failure). Cached images that already decoded resolve
 *  synchronously on the next microtask. */
const decodeImage = (src: string): Promise<void> => {
  const img = getCachedImage(src)
  if (img.complete && img.naturalWidth > 0) return Promise.resolve()
  return new Promise<void>(resolve => {
    const done = () => {
      img.removeEventListener('load', done)
      img.removeEventListener('error', done)
      resolve()
    }
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
  })
}

// ─── Off-hot-path background warm-up ───────────────────────────────────────
// Runs ONCE, after the splash has hidden (hot path done + first paint).
//
// Survivalist draws every block, enemy and background layer procedurally, so
// there is no gameplay art to decode here — the only deferred work is the SFX
// buffer decode. Doing it on an idle slot means the first explosion of a
// session doesn't pay a decode cost mid-frame, without delaying first paint.
let backgroundWarmStarted = false

const runBackgroundWarmup = (): void => {
  if (backgroundWarmStarted) return
  backgroundWarmStarted = true
  void (async () => {
    // ── Art first, all of it. Then sound. ──
    //
    // These two used to start together and race each other for the same
    // connection, which is a trade the wrong way round: an SFX that has not
    // decoded costs a frame of latency the first time it fires, while a strip
    // that has not arrived is a red ellipse in the middle of the screen for as
    // long as it takes. So the decode queue waits for the last painting.
    //
    // `preloadRemainingArt` holds for the page's own load before it starts and
    // resolves only once tier 2 has settled; with overrides off it returns
    // immediately and the sounds start exactly as they did before. See
    // `artPreload`.
    await preloadRemainingArt()
    // Music is not in here at all, and does not need to be: `useSound` points
    // the element at a track when a battle starts, so it is fetched on demand
    // and never competes with anything.
    try {
      const sp = await import('@/use/useSoundPreload')
      await sp.preloadGameplaySounds()
    } catch { /* non-critical — sounds still decode on first play */ }
  })()
}

export default () => {
  const preloadAssets = async (): Promise<void> => {
    // ── HOT PATH ──
    // Survivalist has NO gameplay bitmaps: blocks, enemies, projectiles and the
    // whole background are drawn from code, and so is the result screen's
    // banner now. Nothing is on the critical image path but the renderer chunk.
    //
    // So the "loading" phase is effectively just the JS parse, which is exactly
    // the fast-start behaviour portals grade on. Everything else (SFX decode,
    // drop-in art probing) defers to `runBackgroundWarmup()` after first paint.
    loadingProgress.value = 0
    areAllAssetsLoaded.value = false

    // ── Step 1: the critical bitmaps ──
    const tasks = CRITICAL_IMAGE_SRCS.map(decodeImage)
    let done = 0
    for (const task of tasks) {
      task.then(() => {
        done += 1
        loadingProgress.value = Math.round((done / tasks.length) * IMAGE_SHARE * 100)
      })
    }
    // `allSettled` swallows individual failures so a 404 on one bitmap can
    // never strand the splash screen.
    await Promise.allSettled(tasks)
    loadingProgress.value = Math.round(IMAGE_SHARE * 100)

    // ── Step 2: the survivor sprite strips ──
    //
    // These are ESSENTIAL, and they are the reason this step exists. They are
    // procedural — baked into offscreen canvases at runtime, not downloaded —
    // so nothing in the network waterfall covers them, and `drawUnits` falls
    // back to plain coloured capsules for any unit whose strip is not ready yet.
    // The splash used to clear the moment two bitmaps had decoded, which on a
    // device with no idle time meant the player watched capsules run the lane
    // for the first stage. Now the loading screen owns the wait.
    //
    // `primeSurvivors()` is called HERE rather than only from the draw loop
    // (`useSurvivalArt`) on purpose: the draw loop does not run until the scene
    // mounts, so gating the splash on a bake that only the scene kicks off would
    // deadlock the loading screen.
    // `fetch: false`: the painted strips are staged by `artPreload` below, not
    // fired all at once from the priming call.
    primeSurvivors({ fetch: false })
    primeMonsterSprites(foeDesigns(), { fetch: false })
    await waitForSpriteStrips()

    // ── Step 3: the painted art the first screen needs ──
    //
    // Only with overrides on — a portal build with the flag off waits for
    // nothing and requests nothing. Held for, rather than started, because
    // without the wait the art POPS IN: the game starts on the drawing and
    // swaps to paint a second later, prop by prop. The whole point of painted
    // art is the first impression. Tier 0 is the first SCREEN's worth, not the
    // whole cast; see `artPreload`.
    //
    // Bounded, exactly like the sprite bake above and for the same reason. Tier
    // 0 is most of a megabyte on a first run from a cold cache, and every byte
    // of it is behind a network nobody here controls: a CDN that stalls, a
    // hotel wifi that resolves and never delivers, a portal iframe on a
    // throttled connection. Without a ceiling the splash waits for it forever,
    // which turns "the art did not load" — survivable, the renderer draws
    // either way — into "the game did not load". So the wait is capped, and
    // past the cap the player gets in and the paintings land as they arrive:
    // `artChanged` repaints whatever had already been baked from the drawing.
    if (artOverridesEnabled()) {
      await Promise.race([
        preloadArtOverrides(criticalArtWants(), (done, total) => {
          const k = total > 0 ? done / total : 1
          loadingProgress.value = Math.round((BAKE_END_WITH_ART + (1 - BAKE_END_WITH_ART) * k) * 100)
        }),
        new Promise<void>((resolve) => setTimeout(resolve, CRITICAL_ART_TIMEOUT_MS))
      ])
    }

    // ── Step 4: the intro cutscene's road, for a first-time player only ──
    //
    // The intro flies the whole of stage 1 — the boss in the arena, both cages,
    // every arch and warden — starting on its first frame. Building that while
    // the camera is already moving would stutter the one thing in the game that
    // is not allowed to stutter, so the road is built HERE, behind the splash,
    // where waiting is what the screen is for.
    //
    // ⚠ Gated on `armIntro()` and nothing else. A returning player must not pay
    // a millisecond of load for a cutscene they will never be shown, which is
    // why this asks the gate rather than building speculatively — and why the
    // whole module graph below is reached through a DYNAMIC import: on a
    // returning player's boot, `game/cutscene` and the simulation are not
    // pulled into the loader's chunk at all.
    //
    // It is also the last step on purpose. Everything above it is something the
    // game cannot open without; this is something one boot in a career needs,
    // and if it fails the player simply gets the game.
    try {
      const { armIntro } = await import('@/use/useCutscene')
      if (armIntro()) {
        const { primeCutsceneWorld } = await import('@/use/useSurvivalGame')
        primeCutsceneWorld()
      }
    } catch { /* no intro rather than no game */ }

    loadingProgress.value = 100
    areAllAssetsLoaded.value = true
    scheduleBackgroundWarmup()
  }

  return {
    loadingProgress,
    areAllAssetsLoaded,
    preloadAssets,
    resourceCache
  }
}

/**
 * The foe + boss designs THIS BOOT will actually put on screen — the roster of
 * the stage the save resumes to, not the whole cast.
 *
 * Gating the splash on all thirteen designs (208 canvases) took 11 s on a
 * throttled phone and still only reached 19 %, so the rest baked mid-run: that
 * is where both the red fallback ellipses and the stutter came from. A fresh
 * player needs four designs; a returning one needs what they are about to meet.
 *
 * Read straight from the persisted blob rather than from `useSurvivalGame` —
 * the loader runs before the game module graph is imported, and reaching for it
 * here would invert that order.
 */
let foeDesignCache: string[] | null = null
const foeDesigns = (): string[] => {
  if (foeDesignCache) return foeDesignCache
  const raw = Number(getState(STAGE_KEY, 1))
  const stage = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
  foeDesignCache = stageDesigns(stage)
  return foeDesignCache
}

/**
 * Wait for the sprite strips to bake, feeding the loading bar as they go.
 *
 * BOTH casts are waited on, and both for the same reason. A survivor whose strip
 * is missing draws as a coloured capsule and a foe draws as a dark red ellipse —
 * the two fallbacks players reported. They are procedural, baked into offscreen
 * canvases at runtime, so no network waterfall covers them and nothing else in
 * this function would ever have waited for them.
 *
 * Resolves early when everything is already cached (a second run), and always
 * resolves within `SPRITE_BAKE_TIMEOUT_MS` — a loading screen that can hang
 * forever is a worse bug than a fallback shape.
 *
 * Polls rather than subscribing: the bake is driven by `requestIdleCallback`
 * slices with no completion event to hang a listener on, and a 60 ms poll over
 * roughly a second is cheaper than the machinery to avoid it.
 */
const waitForSpriteStrips = async (): Promise<void> => {
  const ids = foeDesigns()
  const ready = (): boolean => survivorsReady() && monstersReady(ids)
  if (ready()) return

  const deadline = Date.now() + SPRITE_BAKE_TIMEOUT_MS
  while (!ready() && Date.now() < deadline) {
    // Drive the bake directly rather than waiting on idle slots. The splash is
    // up, so nothing else is animating and these slices cost nothing visible —
    // and it is what stops a device that never goes idle from sitting here until
    // the cap expires. The idle-driven pump keeps ownership after this returns.
    bakeSurvivorSlice(6)
    bakeMonsterSlice(10)
    const baked = SURVIVOR_SHARE * survivorBakeProgress01()
      + (1 - SURVIVOR_SHARE) * monsterBakeProgress01(ids)
    const bakeEnd = artOverridesEnabled() ? BAKE_END_WITH_ART : 1
    loadingProgress.value = Math.round((IMAGE_SHARE + (bakeEnd - IMAGE_SHARE) * baked) * 100)
    await new Promise((resolve) => setTimeout(resolve, 60))
  }
}

// Dev-only probe, same pattern as `__audioDebug` / `__testInterstitial` in
// `useAds`. Lets a cross-browser harness assert that the survivor strips really
// baked in THAT engine, rather than inferring it from a screenshot. Gated on
// `import.meta.env.DEV`, so it is dead-code-eliminated from every platform build.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__assetDebug = () => ({
    loadingProgress: loadingProgress.value,
    areAllAssetsLoaded: areAllAssetsLoaded.value,
    survivorsReady: survivorsReady(),
    survivorBake01: survivorBakeProgress01(),
    monstersReady: monstersReady(foeDesigns()),
    monsterBake01: monsterBakeProgress01(foeDesigns())
  })
}

/** Schedule the off-hot-path warm-up on the first idle slot (rIC), falling back
 *  to a short timeout. Runs after the current frame so first paint isn't hit. */
const scheduleBackgroundWarmup = (): void => {
  if (typeof window === 'undefined') { runBackgroundWarmup(); return }
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined
  if (typeof ric === 'function') ric(() => runBackgroundWarmup(), { timeout: 3000 })
  else setTimeout(runBackgroundWarmup, 0)
}
