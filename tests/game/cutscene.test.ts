/**
 * ─── The intro cutscene ─────────────────────────────────────────────────────
 *
 * "THREE LEFT" — the camera flies stage 1 backwards, from the crowned one in
 * the arena to the three survivors on the start line. Design in `cutscenes.md`,
 * shot list in `game/cutscene.ts`, clock and gate in `useCutscene`.
 *
 * Two things are worth pinning and they fail for different reasons:
 *
 *   THE WAYPOINTS are positions on a track the generator builds. The whole idea
 *     of the cutscene is that it flies the REAL road, so a re-cut of stage 1
 *     that moves the boss or a cage leaves the camera stopping at bare lane —
 *     and nothing about that would throw. It has to fail here.
 *   THE GATE is a rule about who sees it: once per player, never for anyone
 *     with progress, and never inside the portal's gameplay bracket.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { buildTrack } from '@/game/track'
import {
  CAPTION_FADE, CUTSCENE_BOSS_Y, CUTSCENE_CAGE_CAM_Y, CUTSCENE_CAGE_Y,
  CUTSCENE_ARENA_Y, CUTSCENE_CAPTIONS, CUTSCENE_CUT_MS, CUTSCENE_MS,
  CUTSCENE_SHOTS, CUTSCENE_STAGE, CUTSCENE_START_Y, bloomAt, captionAlpha,
  cutsceneAt
} from '@/game/cutscene'
import { WARDEN_CAGE_LEAD } from '@/game/survival'
import en from '@/i18n/locales/en'

describe('the waypoints are places on the real road', () => {
  const track = buildTrack(CUTSCENE_STAGE) as any
  const evs = [...track.events].sort((a: any, b: any) => a.y - b.y)

  it('opens on the arena, where the fight actually happens', () => {
    // NOT `track.bossY`: that is where the boss walks in from, eight units above
    // the ground it stands on. The opening shot has to hold the boss AND the
    // warden cage behind it, and both live off the arena line.
    expect(CUTSCENE_ARENA_Y).toBe(track.arenaY)
    expect(CUTSCENE_BOSS_Y).toBeGreaterThan(track.arenaY)
    expect(CUTSCENE_BOSS_Y).toBeLessThan(track.bossY)
  })

  it('frames the warden cage inside the shot', () => {
    // The cage sits at `arenaY + WARDEN_CAGE_LEAD` and the camera shows roughly
    // ten units ahead of itself, so the opening camera has to be near enough to
    // carry it. Without this the intro opens on a monster in front of nothing,
    // which is the whole story missing.
    const cageY = track.arenaY + WARDEN_CAGE_LEAD
    expect(cageY - CUTSCENE_BOSS_Y).toBeGreaterThan(0)
    expect(cageY - CUTSCENE_BOSS_Y).toBeLessThan(9.8)
  })

  it('holds on a cage that exists', () => {
    const cages = evs.filter((e: any) => e.kind === 'cages').map((e: any) => e.y)
    expect(cages, 'stage 1 stopped carrying the cage the intro stops at')
      .toContain(CUTSCENE_CAGE_Y)
    // …and a SECOND one further down, which shot 4 passes at speed. That third
    // of a second is what says "there are more of these" without a counter.
    expect(cages.length).toBeGreaterThanOrEqual(2)
  })

  it('frames the cage instead of standing on it', () => {
    // The camera's own y renders at 72 % down the screen, so parking it ON the
    // cage puts the cage where the squad usually is and hands the middle of the
    // frame to the bank ten units further up. See `CUTSCENE_CAGE_CAM_Y`.
    expect(CUTSCENE_CAGE_CAM_Y).toBeLessThan(CUTSCENE_CAGE_Y)
    expect(CUTSCENE_CAGE_Y - CUTSCENE_CAGE_CAM_Y).toBeLessThanOrEqual(10)
  })

  it('ends where the squad starts', () => {
    expect(CUTSCENE_START_Y).toBe(0)
  })

  it('never flies back up the road', () => {
    // One direction, the whole way. A camera that reversed would be showing the
    // player a route they cannot run.
    let last = Number.POSITIVE_INFINITY
    for (let t = 0; t <= CUTSCENE_MS; t += 25) {
      const { camY } = cutsceneAt(t)
      expect(camY, `camera went back up the road at ${t}ms`).toBeLessThanOrEqual(last + 1e-6)
      last = camY
    }
  })

  it('covers the whole road — the shot is that it is a long way', () => {
    expect(CUTSCENE_BOSS_Y - CUTSCENE_START_Y).toBeGreaterThan(300)
  })

  it('is brightest at the arena, where the light source is', () => {
    expect(bloomAt(CUTSCENE_BOSS_Y)).toBeGreaterThan(0.9)
  })
})

describe('the shot list', () => {
  it('runs 9.2 s, and 6.4 s cut down', () => {
    expect(CUTSCENE_MS).toBe(9200)
    expect(CUTSCENE_CUT_MS).toBe(6400)
  })

  it('never shortens the cage hold', () => {
    // The one shot that has to land emotionally. Everything else here is
    // transport — see `cutscenes.md` §2.6.
    const cage = CUTSCENE_SHOTS.find((s) => s.id === 'cage')!
    expect(cage.ms).toBe(cage.cutMs)
    expect(cage.cutMs).toBeGreaterThanOrEqual(2000)
    for (const s of CUTSCENE_SHOTS) {
      if (s.id !== 'cage') expect(s.cutMs, `${s.id} was not cut`).toBeLessThan(s.ms)
    }
  })

  it('joins up — every shot starts where the last one stopped', () => {
    for (let i = 1; i < CUTSCENE_SHOTS.length; i++) {
      expect(CUTSCENE_SHOTS[i]!.fromY, `${CUTSCENE_SHOTS[i]!.id} jumps`)
        .toBe(CUTSCENE_SHOTS[i - 1]!.toY)
    }
  })

  it('holds still on the two shots that are about stillness', () => {
    for (const id of ['cage', 'three'] as const) {
      const s = CUTSCENE_SHOTS.find((x) => x.id === id)!
      expect(s.ease).toBe('hold')
      expect(s.fromY).toBe(s.toY)
    }
  })

  it('is over when it says it is, in both lengths', () => {
    expect(cutsceneAt(CUTSCENE_MS).done).toBe(true)
    expect(cutsceneAt(CUTSCENE_MS - 1).done).toBe(false)
    expect(cutsceneAt(CUTSCENE_CUT_MS, { cut: true }).done).toBe(true)
    expect(cutsceneAt(CUTSCENE_CUT_MS - 1, { cut: true }).done).toBe(false)
    // …and lands exactly on the playing camera, so the hand-off to the tutorial
    // is a continuation rather than a cut.
    expect(cutsceneAt(CUTSCENE_MS).camY).toBe(CUTSCENE_START_Y)
  })

  it('survives a junk clock', () => {
    for (const t of [-1, -99999, Number.NaN]) {
      const f = cutsceneAt(Number.isNaN(t) ? 0 : t)
      expect(Number.isFinite(f.camY)).toBe(true)
    }
    expect(Number.isFinite(cutsceneAt(1e9).camY)).toBe(true)
  })

  it('reports speed, and reports none on a held shot', () => {
    // The renderer draws its motion streaks off this, and shot 3 is two seconds
    // in which nothing may move.
    const cageAt = CUTSCENE_SHOTS[0]!.ms + CUTSCENE_SHOTS[1]!.ms + 500
    expect(cutsceneAt(cageAt).shot).toBe('cage')
    expect(cutsceneAt(cageAt).speed).toBe(0)
    const flying = cutsceneAt(CUTSCENE_SHOTS[0]!.ms + 800)
    expect(flying.shot).toBe('road')
    expect(flying.speed).toBeGreaterThan(20)
  })
})

describe('reduced motion', () => {
  it('cuts between the positions instead of flying', () => {
    // Same story, same timings, no travel: every sampled frame sits exactly on
    // one of the shot destinations.
    const stops = new Set(CUTSCENE_SHOTS.map((s) => s.toY))
    for (let t = 0; t < CUTSCENE_MS; t += 37) {
      expect(stops.has(cutsceneAt(t, { reduced: true }).camY), `stray camera at ${t}ms`).toBe(true)
    }
  })

  it('still ends on the playing camera', () => {
    expect(cutsceneAt(CUTSCENE_MS, { reduced: true }).camY).toBe(CUTSCENE_START_Y)
  })
})

describe('the captions', () => {
  it('are three, short, and translated everywhere', () => {
    expect(CUTSCENE_CAPTIONS.length).toBe(3)
    for (const c of CUTSCENE_CAPTIONS) {
      const [ns, k] = c.key.split('.') as [keyof typeof en, string]
      const text = (en[ns] as Record<string, string>)[k]
      expect(text, `${c.key} has no English`).toBeTruthy()
      // Sixty characters across all three. A caption that wraps on a 320 px
      // phone in German is a caption that covers the shot.
      expect(text!.length, `${c.key} is too long`).toBeLessThanOrEqual(26)
    }
  })

  it('never overlap each other', () => {
    const sorted = [...CUTSCENE_CAPTIONS].sort((a, b) => a.at - b.at)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.at, 'two captions are up at once')
        .toBeGreaterThanOrEqual(sorted[i - 1]!.at + sorted[i - 1]!.ms)
    }
  })

  it('fade in and out rather than snapping', () => {
    const c = CUTSCENE_CAPTIONS[0]!
    expect(captionAlpha(c, c.at - 1)).toBe(0)
    expect(captionAlpha(c, c.at + CAPTION_FADE / 2)).toBeGreaterThan(0)
    expect(captionAlpha(c, c.at + CAPTION_FADE / 2)).toBeLessThan(1)
    expect(captionAlpha(c, c.at + c.ms / 2)).toBe(1)
    expect(captionAlpha(c, c.at + c.ms + 1)).toBe(0)
  })

  it('all fit inside the cutscene', () => {
    for (const c of CUTSCENE_CAPTIONS) {
      expect(c.at + c.ms, `${c.key} outlives the cutscene`).toBeLessThanOrEqual(CUTSCENE_MS)
    }
  })
})

describe('the light rule', () => {
  it('is brightest at the boss and a point of light at the start line', () => {
    expect(bloomAt(CUTSCENE_BOSS_Y)).toBeCloseTo(1, 2)
    const atStart = bloomAt(CUTSCENE_START_Y)
    expect(atStart).toBeGreaterThan(0)
    expect(atStart).toBeLessThan(0.2)
  })

  it('only ever dims as the camera retreats', () => {
    let last = -1
    for (let y = CUTSCENE_START_Y; y <= CUTSCENE_BOSS_Y; y += 4) {
      const b = bloomAt(y)
      expect(b).toBeGreaterThanOrEqual(last)
      last = b
    }
  })
})

describe('who sees it', () => {
  beforeEach(async () => {
    localStorage.clear()
    const { __resetTowerState } = await import('@/use/useTowerState')
    __resetTowerState()
  })

  const gate = async () => await import('@/use/useCutscene')

  it('plays for a player with nothing saved', async () => {
    const { isFirstTimePlayer } = await gate()
    expect(isFirstTimePlayer()).toBe(true)
  })

  it('never plays twice', async () => {
    const { isFirstTimePlayer, armIntro, beginIntro, __resetIntro } = await gate()
    __resetIntro()
    expect(armIntro()).toBe(true)
    beginIntro()
    // Written on the FIRST frame, not the last: a player who closes the tab four
    // seconds in has seen the crowned one and the cage.
    expect(isFirstTimePlayer()).toBe(false)
    expect(armIntro()).toBe(false)
  })

  it('never plays for a player with progress', async () => {
    const { setState } = await import('@/use/useTowerState')
    const { BEST_STAGE_KEY } = await import('@/keys')
    const { isFirstTimePlayer } = await gate()
    setState(BEST_STAGE_KEY, 3)
    expect(isFirstTimePlayer()).toBe(false)
  })

  it('never plays for a player mid-career', async () => {
    const { setState } = await import('@/use/useTowerState')
    const { STAGE_KEY } = await import('@/keys')
    const { isFirstTimePlayer } = await gate()
    setState(STAGE_KEY, 7)
    expect(isFirstTimePlayer()).toBe(false)
  })
})

describe('the scene wiring', () => {
  const read = async (rel: string) => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    return readFileSync(resolve(__dirname, '../..', rel), 'utf8').replace(/\r\n/g, '\n')
  }

  it('never steps the simulation while the camera is flying', async () => {
    const scene = await read('src/views/GameScene.vue')
    // The whole safety argument of `primeCutsceneWorld` rests on this: the road
    // is fully populated and nothing moves because nothing is stepped.
    const i = scene.indexOf('if (introRunning.value) {')
    expect(i).toBeGreaterThan(-1)
    const block = scene.slice(i, scene.indexOf('\n  }', i))
    expect(block, 'the intro branch steps the simulation').not.toMatch(/\bstep\(dt\)/)
    expect(block).toContain('setCutsceneCam')
  })

  it('is not gameplay as far as the portal is concerned', async () => {
    const scene = await read('src/views/GameScene.vue')
    // Nine seconds of camera flight before the player has touched anything must
    // not land inside the gameplay bracket — the portal grades playtime.
    expect(scene).toMatch(/tutorialActive:[^\n]*introRunning\.value/)
  })

  it('takes the HUD off the screen', async () => {
    const scene = await read('src/views/GameScene.vue')
    expect(scene).toContain('div.scene__hud(v-if="!introRunning")')
  })

  it('opens the stage through one door, whichever way the intro ends', async () => {
    const scene = await read('src/views/GameScene.vue')
    // Skip and run-out both go through `leaveIntro` → `openStage`, so there is
    // no path into gameplay that skips half the setup.
    expect(scene).toContain('const leaveIntro = ')
    expect(scene).toContain('CutsceneSkip(@skip="leaveIntro")')
    expect(scene).toMatch(/if \(f\.done\) leaveIntro\(\)/)
    expect((scene.match(/\bopenStage\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('builds the road behind the splash, and only for a first-timer', async () => {
    const assets = await read('src/use/useAssets.ts')
    expect(assets).toContain('armIntro')
    expect(assets).toContain('primeCutsceneWorld')
    // Reached by dynamic import so a returning player's boot never pulls the
    // simulation into the loader's chunk.
    expect(assets).toMatch(/await import\('@\/use\/useCutscene'\)/)
  })
})
