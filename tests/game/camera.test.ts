import { describe, expect, it } from 'vitest'
import { GRENADE_TUTORIAL_RANGE } from '@/game/grenadeTutorial'
import { SKILL_VIEW_AHEAD } from '@/game/skills'
import {
  BULLET_RANGE, BULLET_RANGE_MAX, CAMERA_MIN_SCALE, CROWD_MAX_R, CROWD_SCREEN_Y,
  FIRE_END_SCREEN_Y, LANE_EDGE_MARGIN, LANE_HALF, UNIT_R, cameraScale
} from '@/game/survival'
import { OPENING_GATE_Y } from '@/game/track'

/**
 * ─── How much road the player sees ──────────────────────────────────────────
 *
 * The owner's complaint (2026-09-18): on a big screen the game "feels like a
 * different one" — the player sees so far past their own guns that every door
 * and every wall is solved before it matters. Measured, the old camera ended
 * the base fire 24–31 % of the screen below the top edge on every shape the
 * game ships on, because it divided the HUD INTO the zoom: every chip added to
 * the top bar zoomed the game out and bought the player look-ahead.
 *
 * `cameraScale` now solves the frame from the gun's range: the base fire ends
 * `FIRE_END_SCREEN_Y` (17.5 %) below the top edge, capped only by the lane's
 * width (portrait phones), the HUD strip (the fire never ends under it) and the
 * bottom bar (the crowd never sinks under it). These pin the rule on the pure
 * arithmetic the renderer draws with.
 *
 * The HUD insets are the bars as measured in a browser that day — top bar
 * height + 8, bottom bar + 8, the exact numbers `GameScene.measureInsets`
 * hands to `setViewport`.
 */

interface Shape { name: string; w: number; h: number; top: number; bottom: number; phone?: true }

const SHAPES: readonly Shape[] = [
  { name: 'phone 360x780', w: 360, h: 780, top: 108, bottom: 57, phone: true },
  { name: 'phone 390x844', w: 390, h: 844, top: 109, bottom: 60, phone: true },
  { name: 'phone 430x932', w: 430, h: 932, top: 111, bottom: 66, phone: true },
  { name: 'phone 412x915 (20:9)', w: 412, h: 915, top: 110, bottom: 64, phone: true },
  { name: 'phone 360x640 (16:9)', w: 360, h: 640, top: 108, bottom: 57 },
  { name: 'tablet 820x1180', w: 820, h: 1180, top: 127, bottom: 75 },
  { name: 'desktop 1280x720', w: 1280, h: 720, top: 127, bottom: 75 },
  { name: 'desktop 1366x768', w: 1366, h: 768, top: 127, bottom: 75 },
  { name: 'desktop 1920x960', w: 1920, h: 960, top: 127, bottom: 75 },
  { name: 'desktop 1920x1080', w: 1920, h: 1080, top: 127, bottom: 75 },
  { name: 'ultrawide 2560x1080', w: 2560, h: 1080, top: 127, bottom: 75 },
  { name: 'tall window 1000x1300', w: 1000, h: 1300, top: 127, bottom: 75 }
]

/** The frame one shape gets, in the terms a player would describe it. */
const frame = (s: Shape) => {
  const scale = cameraScale(s.w, s.h, s.top, s.bottom)
  const crowdPx = CROWD_SCREEN_Y * s.h
  return {
    scale,
    /** Where the base fire ends, as a share of the height from the TOP edge. */
    fireEnd01: (crowdPx - BULLET_RANGE * scale) / s.h,
    /** Units of road ahead of the crowd readable UNDER the HUD strip. */
    seenUnderHud: (crowdPx - s.top) / scale,
    /** Units of road ahead of the crowd to the top edge of the canvas. */
    edge: crowdPx / scale,
    /** Half the visible world's width, in units. */
    halfWidth: s.w / 2 / scale,
    /** The deepest a full-size crowd is drawn, px from the top. */
    crowdFloorPx: crowdPx + (CROWD_MAX_R + UNIT_R) * scale
  }
}

describe('the camera is solved from the gun, not fitted to the HUD', () => {
  it('ends the base fire 15-20 % below the top edge on every shape', () => {
    for (const s of SHAPES) {
      const f = frame(s)
      expect(f.fireEnd01, `${s.name}: fire ends ${(f.fireEnd01 * 100).toFixed(1)} % down`)
        .toBeGreaterThanOrEqual(0.15)
      expect(f.fireEnd01, `${s.name}: fire ends ${(f.fireEnd01 * 100).toFixed(1)} % down`)
        .toBeLessThanOrEqual(0.2)
      // Wherever the lane is not the limit it is the rule itself, not merely
      // inside the band. (1280x720 is held by the HUD cap at 17.6 %.)
      if (!s.phone) expect(f.fireEnd01, s.name).toBeCloseTo(FIRE_END_SCREEN_Y, 2)
    }
  })

  it('moved the camera, not the range: the balance numbers are the old ones', () => {
    // A zoom that quietly changed how far a bullet flies would re-tune every
    // stage at once. The two numbers the balance suite is calibrated on.
    expect(BULLET_RANGE).toBeCloseTo(10.83, 2)
    expect(BULLET_RANGE_MAX).toBeCloseTo(13.68, 2)
  })

  it('never ends the fire under the HUD strip — the whole range is readable', () => {
    for (const s of SHAPES) {
      expect(frame(s).seenUnderHud, `${s.name}: the guns reach under the HUD`)
        .toBeGreaterThanOrEqual(BULLET_RANGE - 1e-9)
    }
  })

  it('shows noticeably less road than the HUD-fitted camera it replaced', () => {
    // The old fit, verbatim, for the comparison the change was asked for.
    const old = (s: Shape): number => Math.max(16, Math.min(
      s.w / (LANE_HALF * 2 + 1.1 * 2),
      Math.max(160, s.h - s.top - s.bottom) / 19
    ))
    for (const s of SHAPES) {
      const before = (CROWD_SCREEN_Y * s.h - s.top) / old(s)
      const after = frame(s).seenUnderHud
      expect(after / before, `${s.name}: ${before.toFixed(2)} -> ${after.toFixed(2)} units`)
        .toBeLessThan(0.9)
    }
  })

  it('does not zoom out when the HUD grows', () => {
    // The drift this replaced: a taller top bar meant a smaller `usableH` and
    // so a smaller scale — more road, for nobody's reason. The HUD may only CAP
    // the zoom now, and only where it would hide the end of the fire.
    const desk = { name: 'desk', w: 1920, h: 1080, top: 127, bottom: 75 }
    const base = frame(desk).scale
    expect(frame({ ...desk, top: 60, bottom: 40 }).scale).toBe(base)
    expect(frame({ ...desk, top: 160, bottom: 120 }).scale).toBe(base)
    const phone = SHAPES[1]!
    expect(frame({ ...phone, top: 80 }).scale).toBe(frame(phone).scale)
  })

  it('is one rule: the zoom scales with the height wherever the lane allows', () => {
    for (const h of [600, 900, 1200, 1600]) {
      expect(cameraScale(3000, h * 2)).toBeCloseTo(cameraScale(3000, h) * 2, 9)
    }
  })

  it('keeps the whole lane, and all but a hair of its rail posts, across the screen', () => {
    // A rail post is drawn 0.16 units either side of the rail; the margin keeps
    // 0.15 of that, i.e. half a pixel short on the tightest phone.
    for (const s of SHAPES) {
      expect(frame(s).halfWidth, `${s.name}: the rails are off the screen`)
        .toBeGreaterThanOrEqual(LANE_HALF + LANE_EDGE_MARGIN - 1e-9)
    }
  })

  it('never frames a full-size crowd under the bottom bar', () => {
    for (const s of SHAPES) {
      expect(frame(s).crowdFloorPx, s.name).toBeLessThanOrEqual(s.h - s.bottom)
    }
  })

  it('keeps a maxed Reach inside the frame', () => {
    for (const s of SHAPES) {
      expect(BULLET_RANGE_MAX, `${s.name}: maxed Reach shoots above the canvas`)
        .toBeLessThan(frame(s).edge)
    }
  })

  it('floors a landscape phone rather than shrinking it to specks', () => {
    expect(cameraScale(844, 390, 127, 75)).toBe(CAMERA_MIN_SCALE)
  })
})

describe('everything promised to be on screen is on screen', () => {
  const tightest = Math.min(...SHAPES.map((s) => frame(s).seenUnderHud))

  it('opens the road on a door the player can see', () => {
    expect(OPENING_GATE_Y).toBeLessThan(tightest)
  })

  it('stops the grenade lesson on an elite the player can see', () => {
    // Inside the range the camera guarantees is readable everywhere…
    expect(GRENADE_TUTORIAL_RANGE).toBeLessThan(BULLET_RANGE)
    // …and on a phone its health bar too: drawn 1.9x, bar 1.08 sizes up, a
    // size being 1.25 units per unit of scale.
    const bar = GRENADE_TUTORIAL_RANGE + 1.9 * 1.25 * 1.08
    for (const s of SHAPES.filter((q) => q.phone)) {
      expect(bar, `${s.name}: the elite's bar is under the HUD`).toBeLessThan(frame(s).seenUnderHud)
    }
  })

  it('counts a body as "in the fight" for a skill about where the frame ends', () => {
    for (const s of SHAPES) {
      expect(Math.abs(SKILL_VIEW_AHEAD - frame(s).edge), s.name).toBeLessThan(0.6)
    }
  })
})
