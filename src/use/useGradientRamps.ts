// ─── Cached gradient ramps ──────────────────────────────────────────────────
//
// `createLinearGradient` / `createRadialGradient` are not free. Each call
// allocates a gradient object, and every `addColorStop` after it parses a CSS
// colour string and re-sorts the stop list; the ramp itself is then rasterised
// into a lookup texture the first time it is painted. Doing that once for a
// backdrop is nothing. Doing it once PER ENTITY PER FRAME is a different thing:
// the particle pool alone is 900 slots, and every smoke puff in it was building
// a fresh two-stop radial ramp — plus two template literals to describe it —
// sixty times a second.
//
// The ramps themselves almost never actually differ. A muzzle flash is the same
// three colours at the same radius for all 190 survivors on screen; every coin
// glow is the same ramp at a different position; every smoke puff of a given
// colour is the same ramp at a different size. So they are built once and kept.
//
// ── The rule that makes this safe ──
//
// A `CanvasGradient` stores its coordinates as plain numbers and resolves them
// against the transform in effect AT PAINT TIME, not at creation time. That is
// what makes a cached ramp reusable: build it in local space — centred on the
// origin, or on a fixed offset from it — and then place it with `translate` and
// size it with `scale` at each call site. The same object then paints correctly
// at two hundred different positions.
//
// The corollary is the trap: a ramp built at absolute screen coordinates
// (`createRadialGradient(sx, sy, ...)`) is pinned to one spot and cannot be
// cached at all, because `sx`/`sy` move every frame. Converting such a site is
// therefore always TWO changes — cache the ramp, and push the position into the
// transform — and the second half is where the pixels can shift if the geometry
// is transcribed carelessly. Non-uniform `scale` in particular squashes the
// gradient as well as the path, which is only correct if the original gradient
// was squashed too.
//
// ── Alpha ──
//
// Ramps whose only per-entity variation is opacity are stored at FULL opacity
// and modulated with `globalAlpha` at the call site. This is exact rather than
// approximate: canvas interpolates gradient stops in premultiplied-alpha space,
// so a ramp from `rgba(c, a)` to `rgba(c, 0)` and the same ramp from
// `rgba(c, 1)` to `rgba(c, 0)` under `globalAlpha = a` produce identical pixels.
// (It also means the RGB of a fully transparent end stop is irrelevant — it
// premultiplies to zero — which is why the ramps below drop it.)

/** Ramps live until something invalidates them. Keys are strings for the sites
 *  with a handful of variants, and packed integers for the hot ones, where the
 *  template literal to build a string key would itself be the allocation this
 *  module exists to remove. */
const ramps = new Map<string | number, CanvasGradient>()

/** A ceiling, so a key that turns out to vary continuously degrades into "build
 *  it every frame" instead of into a leak. Generous enough that no legitimate
 *  caller reaches it: the sites below produce a few dozen distinct ramps. */
const MAX_RAMPS = 256

export const getRamp = (key: string | number): CanvasGradient | undefined => ramps.get(key)

export const putRamp = (key: string | number, ramp: CanvasGradient): CanvasGradient => {
  if (ramps.size >= MAX_RAMPS) ramps.clear()
  ramps.set(key, ramp)
  return ramp
}

/**
 * Drop every cached ramp.
 *
 * Called from `invalidateArt`, which already runs on the two events that change
 * what the ramps should look like: a resize (every `scale`-derived radius moves)
 * and a stage change (the palette moves). Ramps keyed on their own dimensions
 * would survive both correctly, but the cache is small enough that rebuilding it
 * is cheaper than reasoning about which keys are still valid.
 */
export const clearRamps = (): void => {
  ramps.clear()
  sprites.clear()
}

/** Test seam — the count is the assertion that a per-entity site is actually
 *  reusing one ramp rather than quietly building one per entity. */
export const rampCount = (): number => ramps.size

// ─── Baked ramp sprites ─────────────────────────────────────────────────────
//
// A cached ramp still has to be RASTERISED every time it is painted, and that —
// not the object allocation — is where the money was. `drawImage` of an
// already-rasterised texture is what the GPU is actually good at, and it does
// not care how many colour stops the ramp had.
//
// Measured, not assumed. Interleaved A/B over CDP against a headed Chrome 152,
// 150 puffs (the realistic peak for this game's emitters) on a 412x915 DPR-2
// viewport, work-per-frame inside `drawParticles`:
//
//   unthrottled   median-of-rep p95   1.20 ms -> 0.70 ms   (-42%, B won 5/5 reps,
//                                                           ranges disjoint)
//   4x CPU        median-of-rep p50   5.85 ms -> 3.55 ms   (-39%, B won 6/6 reps)
//
// Worth knowing what this does NOT buy: the RAF interval stayed at ~17 ms in
// both arms, so the game was vsync-capped either way. This is frame-budget
// headroom on a weak device, not a frame-rate change at that workload.
//
// The size of a puff is carried by `drawImage`'s destination rectangle. It must
// NOT be carried by a `scale()` transform — see `PERF-LEDGER.md`, where sizing a
// cached unit ramp that way is recorded as the approach this replaced.
//
// Sprites are square, with the ramp's centre at the middle and its last stop
// reaching the edge, so the corners are transparent and the blit is a drop-in
// for a filled `arc` of the same radius.

/**
 * Source radius in pixels, chosen against the largest puff the game can draw.
 *
 * `setViewport` sizes the camera off the viewport's height (`cameraScale` —
 * `0.545 · h / BULLET_RANGE` since 2026-09-18, when it was ~103 through the
 * old `usableH / VIEW_HEIGHT` fit), so `scale` tops out near 109 on a 4K
 * display; the biggest smoke emitter asks for `0.5 * scale`,
 * which is a ~53 px CSS radius, or ~105 device pixels once the DPR cap of 2 is
 * applied. At 96 the sprite is therefore downscaled on every phone and roughly
 * 1:1 on the largest desktop — never meaningfully upscaled.
 *
 * That matters less than it looks, since a radial ramp carries no high-frequency
 * detail for a resample to lose, but the memory is cheap enough not to gamble:
 * 192x192 RGBA is ~147 kB, and the palette in play is a handful of colours.
 */
const SPRITE_R = 96

const sprites = new Map<string | number, HTMLCanvasElement | null>()

/**
 * The sprite for `key`, or `undefined` if one has never been baked for it.
 *
 * Split from the bake, rather than folded into a single `getOrBake(key, stops)`,
 * for the same reason `getRamp` is split from `putRamp`: building the argument
 * would then cost an array and two colour strings PER PARTICLE, on every frame,
 * to be thrown away on a cache hit — reintroducing in the argument list exactly
 * the allocation this module exists to remove.
 */
export const getSprite = (key: string | number): HTMLCanvasElement | null | undefined =>
  sprites.get(key)

/**
 * Bake a radial ramp into a reusable sprite, or return `null` where there is no
 * 2D context to bake into — jsdom under test, and a real browser that has just
 * lost its context. Callers must keep a gradient path for that case rather than
 * silently drawing nothing.
 */
export const bakeRadialSprite = (
  key: string | number,
  stops: readonly [number, string][]
): HTMLCanvasElement | null => {
  let made: HTMLCanvasElement | null = null
  try {
    const c = document.createElement('canvas')
    c.width = SPRITE_R * 2
    c.height = SPRITE_R * 2
    const sctx = c.getContext('2d')
    if (sctx) {
      const g = sctx.createRadialGradient(SPRITE_R, SPRITE_R, 0, SPRITE_R, SPRITE_R, SPRITE_R)
      for (const [offset, color] of stops) g.addColorStop(offset, color)
      sctx.fillStyle = g
      sctx.fillRect(0, 0, SPRITE_R * 2, SPRITE_R * 2)
      made = c
    }
  } catch {
    made = null
  }

  // The null is cached too — a context that cannot be had once will not be had
  // on the next particle either, and retrying per puff per frame would cost more
  // than the gradient this is meant to replace.
  if (sprites.size >= 64) sprites.clear()
  sprites.set(key, made)
  return made
}

/**
 * Cache a sprite somebody else baked — the art layer's tinted smoke puff — in
 * the same slot a ramp bake would take, so one lookup serves both and both are
 * dropped together by `clearRamps`.
 */
export const putSprite = (
  key: string | number, sprite: HTMLCanvasElement | null
): HTMLCanvasElement | null => {
  if (sprites.size >= 64) sprites.clear()
  sprites.set(key, sprite)
  return sprite
}

export const spriteCount = (): number => sprites.size

// ─── Colour strings ─────────────────────────────────────────────────────────
//
// The particle bucket built `rgb(${r},${g},${b})` for every live particle on
// every frame — up to 900 short-lived strings per frame, for a value drawn from
// a palette of maybe a dozen. Packed into a single integer key so the lookup
// itself allocates nothing.

const rgbStrings = new Map<number, string>()

export const rgbString = (r: number, g: number, b: number): string => {
  const key = (r << 16) | (g << 8) | b
  const hit = rgbStrings.get(key)
  if (hit !== undefined) return hit
  const made = `rgb(${r},${g},${b})`
  // Bounded by construction — at most 2^24 keys, and in practice the handful of
  // palette entries the emitters use — but capped anyway so a future emitter
  // that randomises colour per particle cannot grow this without limit.
  if (rgbStrings.size >= 512) rgbStrings.clear()
  rgbStrings.set(key, made)
  return made
}
