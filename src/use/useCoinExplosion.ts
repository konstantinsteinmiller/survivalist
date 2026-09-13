/**
 * Reusable coin-explosion VFX.
 *
 * Coins burst outward from a source element, then fly toward a target
 * element (typically the CoinBadge in the HUD).
 */

import { prependBaseUrl } from '@/utils/function'
import useSounds from '@/use/useSound'

const { playSound } = useSounds()

// Bitmap coin sprite — same 20×20 footprint as the previous SVG so the
// burst geometry and badge fly-in math don't change. `prependBaseUrl`
// keeps the src valid on builds shipped under a non-root base path
// (wavedash CDN, itch-zip, …).
const COIN_HTML =
  `<img src="${prependBaseUrl('images/props/coin_128x128.webp')}" alt="" draggable="false" ` +
  'style="width:20px;height:20px;display:block;user-select:none;" />'

export interface CoinExplosionOptions {
  /** Element the coins burst out of. */
  sourceEl: HTMLElement
  /** Element the coins fly toward (e.g. CoinBadge). */
  targetEl: HTMLElement
  /** Number of coins to spawn (default 20). */
  count?: number
  /** Max burst radius in px (default 120). */
  burstRadius?: number
}

export function spawnCoinExplosion(opts: CoinExplosionOptions) {
  const { sourceEl, targetEl, count = 20, burstRadius = 120 } = opts

  playSound('happy', 0.08)

  const sourceRect = sourceEl.getBoundingClientRect()
  const cx = sourceRect.left + sourceRect.width / 2
  const cy = sourceRect.top + sourceRect.height / 2

  const els: HTMLDivElement[] = []
  const angles: number[] = []
  const distances: number[] = []
  const staggerDelays: number[] = []

  const container = document.getElementById('app') || document.body

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.innerHTML = COIN_HTML
    el.style.cssText =
      'position:absolute;left:0;top:0;pointer-events:none;z-index:100;will-change:transform,opacity;'
    el.style.transform = `translate(${cx - 10}px,${cy - 10}px)`
    container.appendChild(el)
    els.push(el)
    angles.push(Math.random() * Math.PI * 2)
    distances.push(40 + Math.random() * (burstRadius - 40))
    staggerDelays.push(Math.random() * 300)
  }

  const startTime = performance.now()
  const explodeDuration = 600
  const flyDuration = 500

  let flyStartPositions: { x: number; y: number }[] | null = null
  let tx = 0
  let ty = 0

  const animate = (now: number) => {
    const elapsed = now - startTime

    if (elapsed < explodeDuration) {
      const progress = elapsed / explodeDuration
      for (let i = 0; i < count; i++) {
        const x = cx - 10 + Math.cos(angles[i]!) * distances[i]! * progress
        const y = cy - 10 + Math.sin(angles[i]!) * distances[i]! * progress
        els[i]!.style.transform = `translate(${x}px,${y}px)`
      }
      requestAnimationFrame(animate)
    } else {
      if (!flyStartPositions) {
        const badgeRect = targetEl.getBoundingClientRect()
        flyStartPositions = els.map((_, i) => ({
          x: cx - 10 + Math.cos(angles[i]!) * distances[i]!,
          y: cy - 10 + Math.sin(angles[i]!) * distances[i]!
        }))
        tx = badgeRect.left + badgeRect.width / 2 - 10
        ty = badgeRect.top + badgeRect.height / 2 - 10
      }

      const flyElapsed = elapsed - explodeDuration
      let allDone = true

      for (let i = 0; i < count; i++) {
        const localElapsed = flyElapsed - staggerDelays[i]!
        if (localElapsed < 0) {
          allDone = false
          continue
        }
        const t = Math.min(1, localElapsed / flyDuration)
        const ease = t * t
        const sx = flyStartPositions[i]!.x
        const sy = flyStartPositions[i]!.y
        const x = sx + (tx - sx) * ease
        const y = sy + (ty - sy) * ease
        els[i]!.style.transform = `translate(${x}px,${y}px)`
        els[i]!.style.opacity = String(1 - ease)
        if (t < 1) allDone = false
      }

      if (!allDone) {
        requestAnimationFrame(animate)
      } else {
        for (const el of els) el.remove()
      }
    }
  }
  requestAnimationFrame(animate)
}

// ─── One coin per body ──────────────────────────────────────────────────────
//
// `spawnCoinExplosion` throws a burst out of ONE element. That is right for a
// result card's coin line and wrong for the thing this was written for: the
// squad cashing out when a boss falls. A hundred survivors paid for with one
// puff of coins off the formation's centre reads as a dropped purse — which is
// exactly what the second playtest said about it — because the picture has to
// carry a sentence the burst cannot say: THESE PEOPLE became THIS money.
//
// So each coin starts on the body it is replacing, hops, and leaves. No burst
// radius, no shared origin; the shape on screen is the shape of the crowd, and
// it dissolves toward the wallet a body at a time.

export interface CoinTrailOptions {
  /** Where each coin starts, in CSS px from the top-left of the viewport —
   *  one entry per coin. */
  origins: { x: number; y: number }[]
  /** Element the coins fly toward (the CoinBadge). */
  targetEl: HTMLElement
  /** How long the departures are spread over, ms. The whole point is that the
   *  crowd goes as a WAVE rather than as one object, so this is deliberately a
   *  large fraction of the flight time. */
  spread?: number
  /** Flight time for one coin, ms. */
  fly?: number
}

export function spawnCoinTrail(opts: CoinTrailOptions): void {
  const { origins, targetEl, spread = 420, fly = 620 } = opts
  const count = origins.length
  if (count === 0) return

  playSound('happy', 0.08)

  const container = document.getElementById('app') || document.body
  const els: HTMLDivElement[] = []
  const delays: number[] = []
  // Sized once, up front: the badge cannot move while the world is stopped, and
  // reading it per frame per coin is a layout thrash for a number that is
  // constant.
  const badge = targetEl.getBoundingClientRect()
  const tx = badge.left + badge.width / 2 - 10
  const ty = badge.top + badge.height / 2 - 10

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.innerHTML = COIN_HTML
    el.style.cssText =
      'position:absolute;left:0;top:0;pointer-events:none;z-index:100;will-change:transform,opacity;'
    el.style.transform = `translate(${origins[i]!.x - 10}px,${origins[i]!.y - 10}px)`
    container.appendChild(el)
    els.push(el)
    // Ordered by DEPTH, not at random: the back of the crowd leaves first, so
    // the formation empties from the far edge forward instead of dissolving
    // into static. `origins` arrives in the simulation's own order, which is
    // near enough to arbitrary — the y coordinate is what makes it a wave.
    delays.push(0)
  }
  // Lowest y (furthest up the road, so furthest away) goes first.
  const byDepth = origins.map((o, i) => ({ i, y: o.y })).sort((a, b) => a.y - b.y)
  for (let k = 0; k < byDepth.length; k++) {
    delays[byDepth[k]!.i] = count > 1 ? (k / (count - 1)) * spread : 0
  }

  const start = performance.now()
  /** How high each coin pops before it is pulled toward the wallet, px. The hop
   *  is what makes a coin appear where a person was, rather than a person slide
   *  sideways off the screen. */
  const HOP = 26

  const animate = (now: number): void => {
    const elapsed = now - start
    let allDone = true
    for (let i = 0; i < count; i++) {
      const local = elapsed - delays[i]!
      if (local < 0) { allDone = false; continue }
      const t = Math.min(1, local / fly)
      if (t >= 1) { els[i]!.style.opacity = '0'; continue }
      allDone = false
      // Ease IN toward the wallet — slow off the body, fast into the badge —
      // so the eye has time to see a coin standing where a survivor stood.
      const ease = t * t
      const sx = origins[i]!.x - 10
      const sy = origins[i]!.y - 10
      const hop = Math.sin(Math.min(1, t * 2.2) * Math.PI) * HOP
      els[i]!.style.transform =
        `translate(${sx + (tx - sx) * ease}px,${sy + (ty - sy) * ease - hop}px)`
      els[i]!.style.opacity = String(1 - ease * 0.85)
    }
    if (allDone) { for (const el of els) el.remove() }
    else requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}
