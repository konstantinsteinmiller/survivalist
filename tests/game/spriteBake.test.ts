// ─── Survivor sprite-strip bake ─────────────────────────────────────────────
//
// Guards the bug that shipped: players on Android Chrome
// ("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36") ran a whole stage
// with the crowd drawn as plain coloured capsules — `drawUnits`' fallback for a
// unit whose strip has not baked yet.
//
// Nothing was broken. The bake simply never finished. It was driven by
//
//     do { ...bake one frame... } while ((deadline?.timeRemaining() ?? 0) > 8)
//
// which reads like an idle-time budget and is a trap: when `requestIdleCallback`
// fires because its TIMEOUT expired — which is what happens on a main thread
// with no idle slices, i.e. a mid-range phone running a canvas game — the spec
// says `timeRemaining()` returns ZERO. So the loop baked exactly one frame per
// callback. At 3 outfits x 14 frames and a 1200 ms timeout that is roughly a
// minute of capsules. Desktop Chrome has idle time between frames, finishes in
// one or two callbacks, and shows nothing wrong — which is why it never
// surfaced in testing.
//
// The two properties below are what make that impossible to regress into:
// progress must not depend on the idle deadline being generous, and the loading
// screen must not clear before the strips exist.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type IdleCb = (deadline: { timeRemaining: () => number }) => void

/** Idle callbacks the module has queued, drained by hand so each test controls
 *  exactly how many slices the bake gets. */
let queued: IdleCb[] = []

const installIdleStub = (): void => {
  queued = []
  ;(globalThis as unknown as { requestIdleCallback: unknown }).requestIdleCallback =
    (cb: IdleCb) => { queued.push(cb); return 1 }
}

/** Run one scheduled slice with a TIMED-OUT deadline — the exact condition the
 *  bug depended on: fired because the timeout expired, zero time remaining. */
const runTimedOutSlice = (): boolean => {
  const cb = queued.shift()
  if (!cb) return false
  cb({ timeRemaining: () => 0 })
  return true
}

/**
 * jsdom does not fetch resources, so an `Image` whose `src` is set fires neither
 * `load` nor `error` and `preloadAssets`' decode step would hang forever. Stub
 * it to resolve on the next tick — the decode is not what these tests are about.
 */
class StubImage extends EventTarget {
  complete = false
  naturalWidth = 0
  private _src = ''
  get src(): string { return this._src }
  set src(v: string) {
    this._src = v
    setTimeout(() => {
      this.complete = true
      this.naturalWidth = 1
      this.dispatchEvent(new Event('load'))
    }, 0)
  }
}

beforeEach(() => {
  vi.resetModules()
  installIdleStub()
  ;(globalThis as unknown as { Image: unknown }).Image = StubImage
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (globalThis as unknown as { requestIdleCallback?: unknown }).requestIdleCallback
})

describe('survivor strip bake', () => {
  it('makes real progress on a slice with ZERO idle time', async () => {
    // Pin the wall clock far past the slice budget on every read, so the ONLY
    // thing that can carry the bake forward is the guaranteed per-slice
    // minimum. This is the regression: with the old condition, a zero-time
    // deadline baked exactly one frame.
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => { clock += 1000; return clock })

    const { primeSurvivors, survivorBakeProgress01 } = await import('@/game/heroSprites')
    primeSurvivors()
    expect(queued.length).toBe(1)

    expect(runTimedOutSlice()).toBe(true)
    const afterOne = survivorBakeProgress01()

    // 42 frames total. One frame per slice would be ~0.024.
    expect(afterOne).toBeGreaterThan(1 / 42 + 1e-9)
  })

  it('finishes the whole set from timed-out slices alone, and bounded', async () => {
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => { clock += 1000; return clock })

    const { primeSurvivors, survivorsReady, survivorBakeProgress01 } =
      await import('@/game/heroSprites')
    primeSurvivors()

    // 42 frames at the guaranteed 4 per slice is 11 slices; the ceiling here is
    // loose enough not to be brittle and tight enough to fail the old code,
    // which needed 42.
    let slices = 0
    while (!survivorsReady() && slices < 20) {
      if (!runTimedOutSlice()) break
      slices++
    }

    expect(survivorsReady()).toBe(true)
    expect(survivorBakeProgress01()).toBe(1)
    expect(slices).toBeLessThanOrEqual(15)
  })

  it('uses the idle deadline when there IS one, without needing many slices', async () => {
    const { primeSurvivors, survivorsReady } = await import('@/game/heroSprites')
    primeSurvivors()

    // A generous deadline: one slice should carry the whole set.
    const cb = queued.shift()
    expect(cb).toBeDefined()
    cb!({ timeRemaining: () => 50 })

    expect(survivorsReady()).toBe(true)
  })

  it('reports not-ready before any slice runs', async () => {
    const { primeSurvivors, survivorsReady, survivorFrame } =
      await import('@/game/heroSprites')
    primeSurvivors()

    // This is the state that renders the fallback capsules.
    expect(survivorsReady()).toBe(false)
    expect(survivorFrame(0, 0)).toBeNull()
  })
})

describe('the loading screen waits for the strips', () => {
  it('reports assets loaded only once BOTH casts are baked', async () => {
    const { survivorsReady } = await import('@/game/heroSprites')
    const { monstersReady } = await import('@/game/monsterSprites')
    const { allFoeDesigns } = await import('@/game/foes')
    const useAssets = (await import('@/use/useAssets')).default
    const { preloadAssets, areAllAssetsLoaded, loadingProgress } = useAssets()

    const run = preloadAssets()

    // Synchronously after the call the loader has taken ownership: it is not
    // "loaded", and nothing is baked yet. This is the state the splash covers.
    expect(areAllAssetsLoaded.value).toBe(false)
    expect(survivorsReady()).toBe(false)

    await run

    // The invariant the whole fix rests on: at the instant the loader reports
    // done — the moment the splash may clear — every strip exists. A survivor
    // without one draws as a coloured capsule and a foe as a red ellipse, which
    // is exactly what players saw.
    expect(survivorsReady()).toBe(true)
    expect(monstersReady(allFoeDesigns())).toBe(true)
    expect(areAllAssetsLoaded.value).toBe(true)
    expect(loadingProgress.value).toBe(100)
  })

  it('bakes without ever being handed an idle slot', async () => {
    // Every queued idle callback is captured and deliberately never run, so the
    // only thing that can finish the bake is the loader driving it directly.
    // That is what keeps the wait bounded by CPU instead of by however rarely
    // the browser hands out idle time — the failure mode on the reported device.
    const { survivorsReady } = await import('@/game/heroSprites')
    const useAssets = (await import('@/use/useAssets')).default
    const { preloadAssets } = useAssets()

    await preloadAssets()

    expect(survivorsReady()).toBe(true)
  })
})
