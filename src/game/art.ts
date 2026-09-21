import { prependBaseUrl } from '@/utils/function'

/**
 * ─── Art contract ───────────────────────────────────────────────────────────
 *
 * Survivalist ships with ZERO gameplay bitmaps of its own making: the cast is
 * hand-inked vector art baked to frame strips at runtime, and the road, the
 * gates, the crates and every effect are Canvas 2D. That keeps the download
 * tiny, makes the art crisp at any DPR, and means the game is playable the
 * instant the JS parses.
 *
 * When painted art arrives it drops in with NO renderer change: `spriteFor()`
 * probes `public/images/<folder>/<id>.webp` and, if the image decodes, the
 * renderer blits it instead of drawing. A missing file simply means "keep
 * drawing it". Every path is catalogued by the manifest in `artSheet.ts`,
 * which is also what exports the reference sheets the paintings are made from.
 *
 * ─── The feature flag ───────────────────────────────────────────────────────
 *
 * Three layers, most specific first:
 *
 *   1. `?art=on` / `?art=off` in the URL — flips it for this device and is
 *      REMEMBERED, so a reload keeps the answer and the param can be dropped.
 *   2. Whatever was remembered from a previous `?art=`.
 *   3. `VITE_ENABLE_ART_OVERRIDES` — the build's default, and the only layer a
 *      portal ever sees.
 *
 * The build default has to stay the floor because a miss is only free for the
 * GAME. CrazyGames' QA console reports every 404 as `Missing resource detected:
 * …/images/monsters/grumpling.webp`, one line per drawable, which reads as a
 * broken build to a reviewer. So art is shipped off until it is ready, while a
 * URL param still lets it be switched on and — the point of the flag — straight
 * back OFF, live, with no rebuild, when the new art turns out worse than the
 * drawn version.
 *
 * Read as a plain boolean rather than a `ref`: `spriteFor` runs per drawable
 * per frame, and a reactive read in that loop costs dependency tracking on every
 * body on the road for a value that changes when a human clicks something.
 */

/** Folder layout the art pipeline targets, one per drawable kind. */
export const ART_FOLDERS = {
  /**
   * Painted WALK CYCLES, one horizontal strip per monster design.
   *
   * Keyed on the DESIGN (the thing that has a gait), sliced back into frames at
   * runtime by `spriteStrip`, and played from the same clock that drives the
   * procedural bake — so a design can swap from the drawing to the painting
   * mid-stride without a pop.
   */
  monster: 'images/monsters',
  /** The squad's RUN CYCLES, one strip per outfit, on the same terms. */
  hero: 'images/heroes',
  /**
   * Painted DEATHS, one strip per BOSS design: eight panels from the killing
   * blow to the body lying still, played once and held on the last panel as
   * the corpse the next stage opens beside. Wider panels than a walk's (see
   * `DEATH_FRAME_ASPECT`). Fetched late on purpose — when the stage is 80 %
   * run, never on the splash (`deathArtWant`) — and a miss is the drawn topple.
   */
  death: 'images/deaths',
  /**
   * Painted meteor HURLS, one strip per boss design that throws one: eight
   * panels of the arms scooping, cocking and throwing (`HURL_FRAME_ASPECT`,
   * the death's box). Played over the cast's clock in place of the walk; a
   * miss is the drawn throw (`monsterSprites.monsterHurlFrame`).
   */
  hurl: 'images/hurls',
  /** Road props: the two crates, the barricade tile, boulders, the powder keg,
   *  the divider pillar, the coin. One still each. */
  prop: 'images/props',
  /** Gate frames, one per op, nine-sliced across the leaf's own width. */
  gate: 'images/gates',
  /** Projectiles in flight, authored at rest and turned by the renderer. */
  round: 'images/rounds',
  /** Effects: the muzzle flash, the smoke puff, scorch, rings, the shield dome,
   *  the boss guard and both crests. */
  fx: 'images/fx',
  /** Backdrop: the two ridge silhouettes. (The road tile stays drawn — a
   *  painted one was tried, and cobbles read as objects under the crowd.) */
  bg: 'images/bg',
  /** The HUD's own art — the elite crown (shared with the field), the result
   *  banner, the shop chest, the two skill icons — and the logo. */
  ui: 'images/ui'
} as const

export type ArtKind = keyof typeof ART_FOLDERS

const BUILD_DEFAULT = import.meta.env.VITE_ENABLE_ART_OVERRIDES === 'true'
const STORAGE_KEY = 'artOverrides'

const readStored = (): boolean | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? null : !!JSON.parse(raw)
  } catch { return null }
}

const readParam = (): boolean | null => {
  try {
    // The router is on hash history, so a param can arrive in either half of
    // the URL — `?art=on#/` from a typed link, `#/?art=on` from a route push.
    const url = new URL(window.location.href)
    const hashQuery = url.hash.includes('?') ? url.hash.slice(url.hash.indexOf('?') + 1) : ''
    const raw = url.searchParams.get('art') ?? new URLSearchParams(hashQuery).get('art')
    if (raw === null) return null
    return ['1', 'on', 'true', 'yes'].includes(raw.toLowerCase())
  } catch { return null }
}

let enabled = BUILD_DEFAULT
/** Bumped on every explicit refresh, to bust the HTTP cache. See `spriteFor`. */
let probeGeneration = 0

type ProbeState = 'loading' | 'ready' | 'missing'

interface Probe {
  state: ProbeState
  img: HTMLImageElement | null
  /** Resolves once this probe has decoded or failed. Never rejects. */
  settled: Promise<void>
}

const probes = new Map<string, Probe>()

// ─── Repaint notification ───────────────────────────────────────────────────
//
// Probing is ASYNC. `spriteFor` returns null while the image is still in
// flight, so anything that BAKES a decision — the lane tile pattern, the
// backdrop, a tinted smoke sprite, a sliced strip — captures the procedural
// look and keeps it for the life of the page unless it is told otherwise.
// A canvas cannot bind to a value, so it has to be told.

/**
 * WHICH painting changed, or `null` for "assume everything did".
 *
 * A decode names itself. A flag flip and a refresh cannot: the first turns
 * every painting on or off at once and the second re-probes the lot, so both
 * pass `null` and every listener drops everything it holds.
 *
 * The payload is what keeps the first seconds cheap. Without it, each of the
 * ~70 paintings that decode during the opening stage makes every cache in the
 * renderer throw away work built from the other sixty-nine — measured at 670
 * canvases baked during boot against 119 with the art layer off.
 */
export type ArtChange = { kind: ArtKind; id: string } | null

const artListeners = new Set<(change: ArtChange) => void>()

/** Repaint when drop-in art arrives or the flag flips. Returns an unsubscribe.
 *  A listener that ignores its argument keeps the old whole-cache behaviour. */
export const onArtChanged = (fn: (change: ArtChange) => void): (() => void) => {
  artListeners.add(fn)
  return () => { artListeners.delete(fn) }
}

const artChanged = (change: ArtChange = null): void => {
  for (const fn of artListeners) fn(change)
}

/**
 * Forget every probe result.
 *
 * A 404 is remembered FOREVER — that is what stops the renderer re-requesting a
 * file that is not coming. Which is also exactly wrong the moment new art lands
 * on disk: without this, dropping in `grumpling.webp` and flipping the flag
 * would change nothing, because the miss from boot is still cached.
 */
export const refreshArtOverrides = (): void => {
  probes.clear()
  probeGeneration++
  artChanged()
}

/** Whether drop-in bitmap art is being looked for right now. */
export const artOverridesEnabled = (): boolean => enabled

/** Where the current answer came from, for diagnostics. */
export const artOverrideSource = (): 'url' | 'stored' | 'build' =>
  readParam() !== null ? 'url' : readStored() !== null ? 'stored' : 'build'

/**
 * Turn drop-in art on or off for this device, live.
 *
 * `remember: false` flips it for the session only — useful for an A/B look
 * without leaving a flag behind on a machine that will later be used to check a
 * portal build.
 */
export const setArtOverrides = (on: boolean, remember = true): boolean => {
  if (remember) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(on)) } catch { /* harmless */ }
  }
  const changed = enabled !== on
  enabled = on
  // Always re-probe on an explicit switch-on, even if the flag was already on:
  // the reason somebody calls this is usually that the files changed.
  if (on) refreshArtOverrides()
  else if (changed) probes.clear()
  console.warn(`[art] Painted overrides ${on ? 'ENABLED' : 'DISABLED'}.`)
  artChanged()
  return enabled
}

// Resolve at module load. A `?art=` in the URL is treated as an instruction,
// so it is persisted immediately and the param becomes optional from then on.
if (typeof window !== 'undefined') {
  const fromUrl = readParam()
  const stored = readStored()
  if (fromUrl !== null) {
    enabled = fromUrl
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl)) } catch { /* harmless */ }
  } else if (stored !== null) {
    enabled = stored
  }

  // A console handle, so the flag can be worked without a UI. Attached
  // unconditionally because the whole point is to reach it on a built preview
  // — it is three closures over a boolean, not a debug surface worth gating.
  ;(window as unknown as Record<string, unknown>).__art = {
    on: () => setArtOverrides(true),
    off: () => setArtOverrides(false),
    refresh: () => { refreshArtOverrides(); console.warn('[art] probes cleared; art re-reads on next draw.') },
    status: () => ({ enabled, source: artOverrideSource(), probes: probes.size })
  }
}

/** A hint to the browser's fetch scheduler. Only honoured on the request that
 *  creates a probe; a later call with a different hint changes nothing. */
export type FetchPriority = 'high' | 'low'

/**
 * Return a decoded override bitmap for `(kind, id)` or null when none exists.
 * Never throws, never blocks — a missing file simply means "keep drawing it".
 *
 * Probing is lazy and one-shot per id: the first call kicks off an `Image`
 * load; until (and unless) it decodes, the renderer's procedural path runs. A
 * 404 marks the id as "procedural forever" so it is never re-requested.
 */
export const spriteFor = (
  kind: ArtKind, id: string, priority?: FetchPriority
): HTMLImageElement | null => {
  // Before the cache, before the `Image` — with the feature off, not one
  // request is made and the renderer simply keeps drawing.
  if (!enabled) return null

  // ── A drawable with no id is not a drawable ──
  //
  // Asked for `('ui', '')` this used to build `images/ui/.webp`, request it,
  // and 404 — invisible in play, because the glyph under it is the fallback
  // either way, and caught by CrazyGames' QA pass as a missing resource on the
  // hosted build. The caller was the Dynamo's bolt button, which is a weapon's
  // meter sitting in the skill row and has no painting of its own
  // (`SkillBar.boltSlot`), and any skill whose `art` is null would have done
  // the same.
  //
  // Guarded HERE rather than only at that call site because this is the one
  // place a URL is built from an id: every future caller with an empty, blank
  // or optional id gets the drawing instead of a 404.
  if (!id || !id.trim()) return null

  const cacheKey = `${kind}/${id}`
  let probe = probes.get(cacheKey)

  if (!probe) {
    let done: () => void = () => {}
    probe = { state: 'loading', img: null, settled: new Promise<void>((r) => { done = r }) }
    probes.set(cacheKey, probe)
    const img = new Image()
    img.decoding = 'async'
    // `fetchPriority` is what lets the late tiers of `artPreload` go out
    // without elbowing the first stage's strips off the wire. A browser that
    // does not know the property ignores the assignment.
    if (priority) (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority
    img.addEventListener('load', () => {
      // A zero-size decode is as good as missing.
      if (img.naturalWidth > 0) {
        probe!.state = 'ready'
        probe!.img = img
        // The whole point: whoever painted before this arrived gets to repaint
        // — and only what was built from THIS painting, which is why the
        // arrival names itself. See `ArtChange`.
        artChanged({ kind, id })
      } else probe!.state = 'missing'
      done()
    }, { once: true })
    img.addEventListener('error', () => { probe!.state = 'missing'; done() }, { once: true })
    // The generation suffix only appears AFTER an explicit refresh. A clean
    // load stays cacheable; a re-probe after dropping new files on disk has to
    // defeat the browser cache or the old bitmap comes straight back.
    const bust = probeGeneration > 0 ? `?v=${probeGeneration}` : ''
    img.src = prependBaseUrl(`${ART_FOLDERS[kind]}/${id}.webp${bust}`)
  }

  return probe.state === 'ready' ? probe.img : null
}

/** One bitmap the scene will ask for: a kind and the id it is keyed by. */
export type ArtWant = readonly [ArtKind, string]

/**
 * Start probing `(kind, id)` and hand back the promise that settles when it
 * has decoded or failed. Null with overrides off, so a caller can `await`
 * only what it actually asked for.
 */
export const artSettled = (
  kind: ArtKind, id: string, priority?: FetchPriority
): Promise<void> | null => {
  if (!enabled) return null
  spriteFor(kind, id, priority)
  return probes.get(`${kind}/${id}`)?.settled ?? null
}

/**
 * Wait for the bitmaps in `wants` to decode, so the splash can hold for them.
 *
 * WHICH bitmaps is the caller's business — `artPreload` derives the first
 * stage's set from the foe roster, and this module stays off that import path
 * on purpose.
 *
 * Without this the art POPS IN: the game starts on the procedural drawing and
 * swaps to paint a second or two later, prop by prop, which reads as the scene
 * glitching rather than as loading. The whole point of the painted art is the
 * first impression, and the first impression was the version without it.
 *
 * Only when overrides are actually on — a portal build with the flag off waits
 * for nothing and requests nothing, exactly as before.
 *
 * Never rejects and never blocks forever: a missing file settles as 'missing'
 * and the procedural path simply keeps drawing.
 */
export const preloadArtOverrides = async (
  wants: ReadonlyArray<ArtWant>,
  onProgress?: (done: number, total: number) => void
): Promise<void> => {
  if (!enabled) return
  const jobs: Promise<void>[] = []
  for (const [kind, id] of wants) {
    const p = artSettled(kind, id, 'high')
    if (p) jobs.push(p)
  }

  let done = 0
  const total = jobs.length
  onProgress?.(0, total)
  await Promise.allSettled(jobs.map((j) => j.then(() => { onProgress?.(++done, total) })))
}

/** How many probes have been created — a test seam and a status number. */
export const artProbeCount = (): number => probes.size
