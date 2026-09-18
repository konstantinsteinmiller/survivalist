import { MONSTERS, type MonsterDef } from '@/game/monsters'
import { drawDeath, drawHurl, UPRIGHT_FALL } from '@/game/monsterKit'
import { stripFrame, stripFrames } from '@/game/spriteStrip'
import { spriteFor } from '@/game/art'

/**
 * ─── Baked monster frames ───────────────────────────────────────────────────
 *
 * The cast in `monsters.ts` is drawn for a design bench: one character per
 * canvas, a hundred-odd path operations each, at whatever cost looks best. The
 * battlefield asks a different question — twenty of them at once, on a phone,
 * next to a tower, particles and projectiles.
 *
 * So each design is rendered ONCE into a short strip of frames covering exactly
 * one locomotion cycle, and the battlefield blits from that strip. Two things
 * follow from "exactly one cycle":
 *
 *   * the loop closes, so a unit can play the strip forever without a pop;
 *   * playback is decoupled from authoring — a strip baked over an 880 ms cycle
 *     can be played at any speed, which is what lets a fast enemy and a slow
 *     one share a body and still move at their own rates.
 *
 * Baking runs in IDLE time, not in the render loop. One frame of the heaviest
 * design costs ~10 ms — over half a frame budget — so any per-frame allowance
 * small enough to be safe would be too small to ever bake it. A wave never
 * arrives during the build phase, so the strips are always ready by the time
 * anything needs them, and a design that has not finished baking simply falls
 * back to the older procedural body instead of stalling the frame.
 */

/** The slice of `IdleDeadline` we use; not in every TS lib target. */
interface IdleTime { timeRemaining: () => number }

/** Frames per cycle. Sixteen is the low end of what still reads as a walk. */
const FRAMES = 16

/**
 * Baked frame WIDTH, px.
 *
 * Big enough that a unit at maximum zoom on a 3× screen is still downsampling,
 * small enough that the whole cast fits in a sane amount of canvas memory
 * (13 designs × 16 frames × 156 × 176 × 4 B ≈ 16 MB, and most runs never
 * unlock all thirteen).
 */
const PX = 156

/**
 * Baked frame HEIGHT, px. Taller than it is wide.
 *
 * The cast is authored feet-at-+1, crown-at-−1.05, and the square frame gave
 * the crown eight pixels of headroom — a margin thin enough that one design
 * reaching for a tall silhouette (Thornwick, whose canopy IS the character)
 * came out of the bake with its foliage sliced flat, and its reference sheet
 * could not be cut because the canopy ran into the row above. A contract with
 * no slack in it is a contract that gets broken silently, in a strip nobody
 * looks at directly. The extra rows are all headroom: the feet line and
 * everything below it sit exactly where the square frame had them.
 */
const FRAME_H = 176

/** Where the character's ORIGIN sits, px from the frame's top — the same
 *  distance above the bottom edge the square frame gave it. */
const ORIGIN_Y = FRAME_H - PX * 0.48

/**
 * Character scale inside a frame.
 *
 * The drawing convention is feet at y = +1, crown at −1.05, and up to ±1.05
 * wide, so 2.25 units across the frame leaves a hair of margin for the ink to
 * bleed into without clipping.
 */
const SPRITE_S = PX / 2.25

/** Where the character's feet sit inside a frame, in px from the top. */
export const SPRITE_FOOT = ORIGIN_Y + SPRITE_S

/** Total character height inside a frame, in px. */
export const SPRITE_HEIGHT = 2.05 * SPRITE_S

/**
 * The two numbers above, as FRACTIONS of the frame rather than pixel counts.
 *
 * A painted strip is the bake's frame box at a different resolution — the sheet
 * the painter works on is the same box scaled up, and the slicer cuts it on the
 * same grid without trimming. So the feet line and the character height are the
 * same proportions of the frame whatever size it arrives at, and every caller
 * measures off the frame it was handed instead of off the bake's constants.
 * For a baked frame these are algebraically what the old code computed.
 */
export const SPRITE_FOOT_R = SPRITE_FOOT / FRAME_H
export const SPRITE_HEIGHT_R = SPRITE_HEIGHT / FRAME_H

/** The frame box's width:height. A painted panel is this box, scaled up. */
export const MONSTER_FRAME_ASPECT = PX / FRAME_H

/** Baked frame size, px — what the art bench scales its panels from. */
export const MONSTER_PX = PX
export const MONSTER_FRAME_H = FRAME_H

/**
 * ─── A boss's painted DEATH ─────────────────────────────────────────────────
 *
 * One panel of a death strip (`images/deaths/<design>.webp`, see
 * `artSheet.BOSS_DEATHS`): the walk frame's HEIGHT, so the creature is the same
 * size to the pixel and the cut from the last living frame to the first dying one
 * cannot pop — and 7/6 as wide, because a body lying down is as long as it stood
 * tall and a walk frame has no room for that. The feet line and the character's
 * height keep the walk's own ratios (`SPRITE_FOOT_R`, `SPRITE_HEIGHT_R`): the
 * extra room is all sideways.
 *
 * 7/6 rather than anything rounder because four of them by two rows of the walk
 * panel's 360 px is 1680 x 720 — exactly 21:9, a ratio the image tools offer.
 */
export const DEATH_FRAME_ASPECT = 7 / 6

/**
 * Which side of its panel a death strip lays the body toward, AS AUTHORED.
 *
 * Everything drawn front-on goes over onto its back with its head to the
 * panel's left (`UPRIGHT_FALL`). A side-on creature keels over where it stands
 * and lies along its own length; it counts as falling backward — a left-facer
 * to the right — so that once the field mirrors it to face the crowd, every
 * death lands to the LEFT on screen and its goo spreads the same way. The strip
 * is never mirrored a second time for it: flipping a side-on creature at the
 * moment it dies turns it round mid-blow.
 */
const FACES_LEFT = new Set(MONSTERS.filter((m) => m.faces === 'left').map((m) => m.id))
export const deathFallSide = (id: string): -1 | 1 => (FACES_LEFT.has(id) ? 1 : UPRIGHT_FALL)

const CACHE = new Map<string, HTMLCanvasElement[]>()
const DEFS = new Map<string, MonsterDef>(MONSTERS.map((m) => [m.id, m]))

/**
 * Baked DEATH frames per design, slot by slot — sparse until the bake fills
 * them, because a kill can ask for one frame before the idle baker got there
 * (`monsterDeathFrame`).
 */
const DEATH_CACHE = new Map<string, (HTMLCanvasElement | undefined)[]>()
/** A death frame's box: the walk's height and `DEATH_FRAME_ASPECT` as wide. */
const DEATH_W = Math.round(FRAME_H * DEATH_FRAME_ASPECT)
/** Designs whose death is wanted, baked after every walk strip is done. */
let deathQueue: string[] = []
/** Designs whose meteor HURL is wanted, baked after the deaths. */
let hurlQueue: string[] = []

let queue: string[] = []
let building: { id: string; def: MonsterDef; frames: HTMLCanvasElement[] } | null = null

let scheduled = false
/**
 * Whether the idle baker may run right now.
 *
 * A single monster frame costs up to ~12 ms, which is a dropped frame on a phone
 * and CANNOT be sliced smaller — so the only safe lever is WHEN. The game clears
 * this for the duration of live gameplay (see `useGameplayLifecycle`) and sets it
 * again on every break it already owns: the loading screen, the result screen, a
 * modal, an ad. Those are exactly the moments nothing is animating.
 *
 * Measured: with the baker free-running during a stage, a throttled phone logged
 * 114 long tasks totalling 8.7 s in a 20 s window.
 */
let bakeAllowed = true

/**
 * Ask for designs to be baked. Cheap and idempotent — safe to call every time a
 * wave is composed.
 */
export const primeMonsterSprites = (
  ids: readonly string[], opts: { fetch?: boolean } = {}
): void => {
  for (const id of ids) {
    // Start the painted strip decoding on the same signal, unless the caller
    // is only after the bake: the loader primes a whole stage's cast before the
    // splash clears, and fetching every strip there is exactly what
    // `artPreload` exists to stage instead. A design whose strip has not
    // arrived simply plays the procedural bake rather than holding the game.
    if (opts.fetch !== false && DEFS.has(id)) spriteFor('monster', id)
    if (CACHE.has(id) || queue.includes(id) || building?.id === id) continue
    if (DEFS.has(id)) queue.push(id)
  }
  schedule()
}

const bakeFrame = (def: MonsterDef, i: number): HTMLCanvasElement => {
  const c = document.createElement('canvas')
  c.width = PX
  c.height = FRAME_H
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.translate(PX / 2, ORIGIN_Y)
    def.draw(ctx, SPRITE_S, (i / FRAMES) * def.cycleMs)
  }
  return c
}

/**
 * Draw one frame of a design into a `w x h` panel at the context's origin.
 *
 * Exists so the art bench can export the reference sheet through the SAME
 * transform `bakeFrame` uses. The panel is the bake's frame box scaled up, so a
 * strip painted over this reference drops straight back in — get this out of
 * step with the bake and every painted character stands at the wrong height.
 *
 * Not used at run time.
 */
export const paintMonsterFrame = (
  ctx: CanvasRenderingContext2D,
  id: string, i: number, frames: number, w: number, h: number
): void => {
  const def = DEFS.get(id)
  if (!def) return
  ctx.save()
  ctx.translate(w / 2, h * (ORIGIN_Y / FRAME_H))
  def.draw(ctx, SPRITE_S * (h / FRAME_H), (i / frames) * def.cycleMs)
  ctx.restore()
}

/** Panels in a death — the painted strip's count, and the bake's. */
export const DEATH_FRAMES = 8

/** How far into the death panel `i` of `n` is: the blow first, the body last. */
export const deathK = (i: number, n: number): number => (n > 1 ? i / (n - 1) : 1)

/**
 * Draw panel `i` of a design's DEATH into a `w x h` panel — the drawn fall
 * (`drawDeath` in `monsterKit`), through the same transform as the walk, so the
 * creature is the same size and stands on the same feet line. The art bench
 * exports the reference sheet with it, and the game bakes its fallback with it.
 */
export const paintMonsterDeathFrame = (
  ctx: CanvasRenderingContext2D,
  id: string, i: number, frames: number, w: number, h: number
): void => {
  const def = DEFS.get(id)
  if (!def) return
  ctx.save()
  ctx.translate(w / 2, h * (ORIGIN_Y / FRAME_H))
  drawDeath(deathK(i, frames), () => def.draw(ctx, SPRITE_S * (h / FRAME_H), 0))
  ctx.restore()
}

const deathSlots = (id: string): (HTMLCanvasElement | undefined)[] => {
  let slots = DEATH_CACHE.get(id)
  if (!slots) {
    slots = new Array<HTMLCanvasElement | undefined>(DEATH_FRAMES).fill(undefined)
    DEATH_CACHE.set(id, slots)
  }
  return slots
}

/** Bake one death panel into its slot — the same call the bench exports with. */
const bakeDeathFrame = (id: string, i: number): HTMLCanvasElement | undefined => {
  if (typeof document === 'undefined' || !DEFS.has(id)) return undefined
  const c = document.createElement('canvas')
  c.width = DEATH_W
  c.height = FRAME_H
  const ctx = c.getContext('2d')
  if (ctx) paintMonsterDeathFrame(ctx, id, i, DEATH_FRAMES, DEATH_W, FRAME_H)
  deathSlots(id)[i] = c
  return c
}

/** Bake the next missing death panel in the queue; false when none is left. */
const bakeNextDeathFrame = (): boolean => {
  while (deathQueue.length > 0) {
    const id = deathQueue[0]!
    const i = DEFS.has(id) ? deathSlots(id).findIndex((f) => !f) : -1
    if (i < 0) {
      deathQueue.shift()
      continue
    }
    bakeDeathFrame(id, i)
    return true
  }
  return false
}

const deathBaked = (id: string): boolean => {
  const slots = DEATH_CACHE.get(id)
  return !!slots && slots.every((f) => !!f)
}

/**
 * Ask for designs' DEATHS to be baked — a boss's, a stage ahead. Queued behind
 * every walk strip, since a death is only wanted at the end of a stage, and
 * baked by the same idle baker in the same breaks. Cheap and idempotent.
 */
export const primeMonsterDeaths = (ids: readonly string[]): void => {
  for (const id of ids) {
    if (!DEFS.has(id) || deathBaked(id) || deathQueue.includes(id)) continue
    deathQueue.push(id)
  }
  schedule()
}

/**
 * Panel `i` of a design's death: the painted strip's when it has arrived
 * (`images/deaths/`, fetched at 80 % of the road), else the drawn one, baked.
 *
 * A panel the idle baker has not reached yet is baked right here, once. That
 * is at most one frame of work per panel, at the moment of a kill — the one
 * moment the game is already busy with a burst rather than with the player —
 * and it is what guarantees a boss never falls as anything but its own death.
 * `null` only for a design with no drawing at all.
 */
export const monsterDeathFrame = (
  id: string, i: number
): { frame: HTMLCanvasElement; painted: boolean } | null => {
  const strip = stripFrames('death', id, DEATH_FRAME_ASPECT)
  if (strip && strip.length > 0) {
    return { frame: strip[Math.max(0, Math.min(strip.length - 1, i))]!, painted: true }
  }
  const k = Math.max(0, Math.min(DEATH_FRAMES - 1, i))
  const frame = DEATH_CACHE.get(id)?.[k] ?? bakeDeathFrame(id, k)
  return frame ? { frame, painted: false } : null
}

/** How many panels a design's death has — the painting's own count once it is in. */
export const monsterDeathLength = (id: string): number => {
  const strip = stripFrames('death', id, DEATH_FRAME_ASPECT)
  return strip && strip.length > 0 ? strip.length : DEATH_FRAMES
}

/**
 * ─── A boss's meteor HURL ───────────────────────────────────────────────────
 *
 * Eight panels of the boss throwing its meteor with its ARMS (`drawHurl` in
 * `monsterKit`) — scoop, cock, release, follow-through — played over the
 * cast's own clock (`bossWindup.hurlPanel`) instead of the walk. Same box as a
 * death panel: the walk's height, so the swap from the walk cannot pop, and
 * 7/6 as wide, for an arm swung out to the side.
 *
 * The painted strip (`images/hurls/<design>.webp`, `artSheet.BOSS_HURLS`) is
 * painted over the same drawing, so the hand the rock sits in is where the
 * drawing put it — which is why the anchors below are measured off the bake
 * and used for the painting too.
 */
export const HURL_FRAME_ASPECT = DEATH_FRAME_ASPECT
/** Panels in a hurl — the painted strip's count, and the bake's. */
export const HURL_FRAMES = 8
const HURL_W = DEATH_W

/** How far into the throw panel `i` of `n` is: ready first, at rest last. */
export const hurlK = (i: number, n: number): number => (n > 1 ? i / (n - 1) : 0)

/**
 * Draw panel `i` of a design's HURL into a `w x h` panel, through the walk's
 * transform. Returns where the throwing hand's palm was drawn, in the
 * context's own pixels, or null for a design that has not learned to throw.
 * The art bench exports the reference sheet with it; the game bakes with it.
 */
export const paintMonsterHurlFrame = (
  ctx: CanvasRenderingContext2D,
  id: string, i: number, frames: number, w: number, h: number
): [number, number] | null => {
  const def = DEFS.get(id)
  if (!def) return null
  ctx.save()
  ctx.translate(w / 2, h * (ORIGIN_Y / FRAME_H))
  try {
    return drawHurl(hurlK(i, frames), () => def.draw(ctx, SPRITE_S * (h / FRAME_H), 0))
  } finally {
    ctx.restore()
  }
}

interface HurlSlot {
  frame: HTMLCanvasElement
  /** The palm, as a FRACTION of the panel — resolution-free, so it holds for
   *  a painted panel of any size. */
  grip: [number, number] | null
}
const HURL_CACHE = new Map<string, (HurlSlot | undefined)[]>()

const hurlSlots = (id: string): (HurlSlot | undefined)[] => {
  let slots = HURL_CACHE.get(id)
  if (!slots) {
    slots = new Array<HurlSlot | undefined>(HURL_FRAMES).fill(undefined)
    HURL_CACHE.set(id, slots)
  }
  return slots
}

const bakeHurlFrame = (id: string, i: number): HurlSlot | undefined => {
  if (typeof document === 'undefined' || !DEFS.has(id)) return undefined
  const c = document.createElement('canvas')
  c.width = HURL_W
  c.height = FRAME_H
  const ctx = c.getContext('2d')
  const at = ctx ? paintMonsterHurlFrame(ctx, id, i, HURL_FRAMES, HURL_W, FRAME_H) : null
  const slot: HurlSlot = { frame: c, grip: at ? [at[0] / HURL_W, at[1] / FRAME_H] : null }
  hurlSlots(id)[i] = slot
  return slot
}

const bakeNextHurlFrame = (): boolean => {
  while (hurlQueue.length > 0) {
    const id = hurlQueue[0]!
    const i = DEFS.has(id) ? hurlSlots(id).findIndex((f) => !f) : -1
    if (i < 0) {
      hurlQueue.shift()
      continue
    }
    bakeHurlFrame(id, i)
    return true
  }
  return false
}

const hurlBaked = (id: string): boolean => {
  const slots = HURL_CACHE.get(id)
  return !!slots && slots.every((f) => !!f)
}

/**
 * Ask for designs' HURLS to be baked — the boss this stage and the next, on
 * the same breaks the deaths are. The drawn frames are wanted even when the
 * painted strip is in, because the hand anchors are measured off them.
 */
export const primeMonsterHurls = (ids: readonly string[]): void => {
  for (const id of ids) {
    if (!DEFS.has(id) || hurlBaked(id) || hurlQueue.includes(id)) continue
    hurlQueue.push(id)
  }
  schedule()
}

/**
 * Panel `i` of a design's hurl, and where the throwing hand is in it (a
 * fraction of the panel, or null). The painted strip's panel when it has
 * arrived, else the drawn one; the anchor is always the drawing's. A panel the
 * idle baker has not reached is baked here, once — at most a frame of work per
 * panel, the first time the boss throws.
 */
export const monsterHurlFrame = (
  id: string, i: number, opts: { drawn?: boolean } = {}
): { frame: HTMLCanvasElement; grip: [number, number] | null; painted: boolean } | null => {
  const k = Math.max(0, Math.min(HURL_FRAMES - 1, i))
  const slot = HURL_CACHE.get(id)?.[k] ?? bakeHurlFrame(id, k)
  if (!slot) return null
  // The drawing even when a painting is in — for the boss-motion bench's
  // drawn-beside-painted comparison.
  if (opts.drawn) return { frame: slot.frame, grip: slot.grip, painted: false }
  const strip = stripFrames('hurl', id, HURL_FRAME_ASPECT)
  if (strip && strip.length === HURL_FRAMES) {
    return { frame: strip[k]!, grip: slot.grip, painted: true }
  }
  return { frame: slot.frame, grip: slot.grip, painted: false }
}

/**
 * Bake while the browser says it has room, then hand control back.
 *
 * Progress is measured per FRAME, not per design: a treant costs five times
 * what an imp does, so committing to a whole design in one slice would blow any
 * deadline. The 12 ms floor is the cost of the most expensive single frame in
 * the cast, so we never START one we cannot finish inside the slice.
 */
/** Wall-clock budget for one bake slice, in ms. */
const SLICE_MS = 8

const nowMs = (): number =>
  (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now()

/**
 * Same fix as `heroSprites.pump`, and the same bug: `while
 * (deadline.timeRemaining() > 12)` bakes exactly ONE frame whenever the idle
 * callback fired because its timeout expired, because a timed-out callback
 * reports zero time remaining. On a phone with no idle slices that was one
 * frame per 2 s, so a boss could reach the arena before its strip existed and
 * draw as the fallback ellipse.
 *
 * Only ONE frame is guaranteed per slice here, unlike the survivors: a single
 * monster frame costs up to ~12 ms, so forcing several would drop a frame of
 * gameplay. The throughput comes from the much shorter callback timeout below.
 */
const pump = (deadline?: IdleTime): void => {
  scheduled = false
  // Gameplay started between arming and firing: stand down. `schedule()` runs
  // again the moment baking is allowed, so nothing is lost.
  if (!bakeAllowed) return
  const started = nowMs()

  for (;;) {
    if (!building && queue.length === 0) {
      // Every walk is done: the deaths, then the hurls, one panel at a time on
      // the same budget.
      if (!bakeNextDeathFrame() && !bakeNextHurlFrame()) return
    } else {
      if (!building) {
        const id = queue.shift()
        if (!id) return
        const def = DEFS.get(id)
        if (!def) continue
        building = { id, def, frames: [] }
      }
      building.frames.push(bakeFrame(building.def, building.frames.length))
      if (building.frames.length >= FRAMES) {
        CACHE.set(building.id, building.frames)
        building = null
      }
    }

    if (queue.length === 0 && !building && deathQueue.length === 0 && hurlQueue.length === 0) break
    if ((deadline?.timeRemaining() ?? 0) > 12) continue
    if (nowMs() - started < SLICE_MS) continue
    break
  }
  schedule()
}

/** Allow or forbid idle baking. Re-arms the queue when re-enabled. */
export const setMonsterBakeAllowed = (allowed: boolean): void => {
  if (bakeAllowed === allowed) return
  bakeAllowed = allowed
  if (allowed) schedule()
}

const schedule = (): void => {
  if (
    scheduled || !bakeAllowed ||
    (queue.length === 0 && !building && deathQueue.length === 0 && hurlQueue.length === 0)
  ) return
  scheduled = true
  const ric = (globalThis as { requestIdleCallback?: (cb: (d: IdleTime) => void, o?: { timeout: number }) => void })
    .requestIdleCallback
  // Without idle scheduling, fall back to one frame per macrotask — slower to
  // finish, but it still never lands inside a paint.
  // Short timeout: on a thread with no idle slices this cadence IS the bake
  // rate, and 2000 ms meant a boss could out-run its own sprite strip.
  if (typeof ric === 'function') ric(pump, { timeout: 400 })
  else setTimeout(() => pump(), 0)
}

/**
 * Bake synchronously for up to `budgetMs`, then hand control back.
 *
 * For the LOADING SCREEN only. While the splash is up nothing else is animating,
 * so a fat slice is invisible — and it removes the bake's dependency on
 * `requestIdleCallback` cadence entirely, which is what makes the wait bounded by
 * CPU rather than by however rarely the browser hands out idle slots. Without it
 * a device that never goes idle bakes at the callback timeout's rate, and the
 * loader would sit on its cap instead of finishing.
 *
 * Do NOT call this once gameplay is running: that is what the sliced, idle-driven
 * `pump` is for.
 */
export const bakeMonsterSlice = (budgetMs = 10): void => {
  const started = nowMs()
  while (queue.length > 0 || building) {
    if (!building) {
      const id = queue.shift()
      if (!id) return
      const def = DEFS.get(id)
      if (!def) continue
      building = { id, def, frames: [] }
    }
    building.frames.push(bakeFrame(building.def, building.frames.length))
    if (building.frames.length >= FRAMES) {
      CACHE.set(building.id, building.frames)
      building = null
    }
    if (nowMs() - started >= budgetMs) return
  }
}

/** True once every requested design has a full strip — i.e. `monsterFrame` can
 *  no longer return null for them and no foe will draw as its fallback ellipse.
 *  Unknown ids are ignored so a caller can pass the whole cast safely. */
export const monstersReady = (ids: readonly string[]): boolean =>
  ids.every((id) => !DEFS.has(id) || CACHE.has(id))

/** 0..1 across the requested designs, for the loading bar. */
export const monsterBakeProgress01 = (ids: readonly string[]): number => {
  const known = ids.filter((id) => DEFS.has(id))
  const total = known.length * FRAMES
  if (total === 0) return 1
  let done = 0
  for (const id of known) {
    done += CACHE.get(id)?.length ?? 0
    if (building?.id === id) done += building.frames.length
  }
  return Math.min(1, done / total)
}

/**
 * The frame for a design at a normalised cycle position, or `null` if it has
 * not been baked yet.
 */
export const monsterFrame = (id: string, cycle01: number): HTMLCanvasElement | null => {
  const c01 = ((cycle01 % 1) + 1) % 1
  // Paint wins when it is there. Both strips cover exactly one cycle, so the
  // same normalised position indexes either of them and a design can swap from
  // the bake to the painting mid-stride without a pop.
  const paint = stripFrame('monster', id, MONSTER_FRAME_ASPECT, c01)
  if (paint) return paint

  const frames = CACHE.get(id)
  if (!frames) return null
  const i = Math.floor(c01 * FRAMES) % FRAMES
  return frames[i] ?? null
}

/** Which way a design is drawn, for the battlefield's mirroring. */
export const monsterFaces = (id: string): 'left' | 'right' | 'front' =>
  DEFS.get(id)?.faces ?? 'front'

/**
 * Pick one design for a unit from its type's binding.
 *
 * Keyed on the uid so an individual keeps the same body for its whole life —
 * picking per frame would make it flicker between species.
 */
export const pickMonster = (binding: string | string[] | undefined, uid: number): string | null => {
  if (!binding) return null
  if (typeof binding === 'string') return binding
  if (binding.length === 0) return null
  return binding[Math.abs(uid) % binding.length] ?? null
}

/** Every design any enemy type can use — for priming at load. */
export const allMonsterIds = (): string[] => [...DEFS.keys()]
