import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

// ─── Cloud → composable hydrate (the "fresh user" regression) ───────────────
//
// THE BUG THIS FILE EXISTS TO PREVENT:
//   A returning player reloads. The platform SDK's cloud read is async. The
//   Vue module graph evaluates first, every composable reads an empty blob and
//   initialises to defaults, and the player is rendered as a brand-new install:
//   stage 1, no coins, no upgrades. The next write then commits those defaults
//   over the real cloud save and the loss becomes permanent.
//
// The whole game state lives in ONE `tower_state` blob (an allowlisted payload
// key), so the strategy mirrors it verbatim. `reloadTowerState()` is wired into
// the `saveDataVersion` bump inside `useSaveStatus` — and the ORDER matters:
// the blob must be re-read BEFORE the bump, or every `watch(saveDataVersion)`
// consumer re-reads the stale pre-hydrate snapshot and the bug survives.

const MANIFEST_KEY = '__save_internal__crazy_keys'
const STATE_KEY = 'tower_state'

const makeFakeData = (seed: Record<string, string> = {}) => {
  const store = new Map<string, string>(Object.entries(seed))
  return {
    store,
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store.set(key, value) }),
    removeItem: vi.fn(async (key: string) => { store.delete(key) })
  }
}

const flush = async (): Promise<void> => { await nextTick(); await nextTick() }

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

/** A cloud snapshot for a player who is deep into the game, plus the meta blob
 *  the merge resolver needs in order to pick remote over an empty local. */
const seededCloud = async () => {
  const { META_KEY } = await import('@/utils/save/SaveMergePolicy')
  const cloudBlob = {
    ts_coins: 1250,
    ts_best_stage: 14,
    ts_best_squad: 210,
    ts_runs: 9,
    ts_total_kills: 4200,
    ts_upgrades: { squad: 1, power: 3, rate: 1, scavenge: 2 },
    ts_user_sound_volume: 0.4,
    ts_user_language: 'es',
    // The stage the player was running when they closed the tab. A stage is
    // short and its layout is regenerated from this number alone, so this
    // single field IS the resumable run.
    ts_stage: 14
  }
  const meta = {
    savedAt: '2026-05-19T00:00:00.000Z',
    // bestStage 14 × 500 + 7 upgrade levels × 150 + 9 runs × 10
    progressScore: 14 * 500 + 7 * 150 + 9 * 10,
    schemaVersion: 1,
    maxStage: 14
  }
  return makeFakeData({
    [MANIFEST_KEY]: JSON.stringify([STATE_KEY, META_KEY]),
    [STATE_KEY]: JSON.stringify(cloudBlob),
    [META_KEY]: JSON.stringify(meta)
  })
}

/** Boot the CrazyGames cloud-only configuration: gameplay state lives in memory
 *  only and `sdk.data` is the sole persistence backend. */
const bootCloudOnly = async (data: ReturnType<typeof makeFakeData>) => {
  const { SaveManager } = await import('@/utils/save/SaveManager')
  const { CrazyGamesStrategy } = await import('@/utils/save/CrazyGamesStrategy')
  const { installSaveStatus } = await import('@/use/useSaveStatus')
  const manager = new SaveManager(
    new CrazyGamesStrategy(() => data),
    window.localStorage,
    { blob: { persistToRaw: false } }
  )
  installSaveStatus(manager)
  await manager.init()
  await flush()
  return manager
}

describe('tower_state cloud hydrate → composable refresh', () => {
  it('hydrates the blob into localStorage before the app graph reads it', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const blob = JSON.parse(window.localStorage.getItem(STATE_KEY) || '{}')
    expect(blob.ts_best_stage).toBe(14)
    expect(blob.ts_coins).toBe(1250)
  })

  it('refreshes the economy composable — the player is NOT a fresh user', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const { default: useTowerEconomy } = await import('@/use/useTowerEconomy')
    expect(useTowerEconomy().coins.value).toBe(1250)
  })

  it('refreshes the upgrade levels the player paid for', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const { upgradeLevel, unitDamage, startSquad } = await import('@/use/useUpgrades')
    expect(upgradeLevel('power')).toBe(3)
    expect(upgradeLevel('scavenge')).toBe(2)
    // And the derived run stats follow — otherwise the purchased content
    // silently disappears on every reload even though the levels are there.
    // Firepower is +0.4 a level on a base of 1 (a full point per level let the
    // first purchase double the squad's damage), so three levels is 2.2.
    const { UPGRADES } = await import('@/use/useUpgrades')
    expect(unitDamage.value).toBeCloseTo(UPGRADES.power.valueAt(3), 5)
    expect(unitDamage.value).toBeGreaterThan(UPGRADES.power.valueAt(0))
    expect(startSquad.value).toBe(4)
  })

  it('refreshes user settings so the player keeps their language and volume', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const { default: useUser } = await import('@/use/useUser')
    const u = useUser()
    expect(u.userLanguage.value).toBe('es')
    expect(u.userSoundVolume.value).toBe(0.4)
  })

  it('resumes the saved stage rather than dropping the player back to stage 1', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const game = await import('@/use/useSurvivalGame')
    game.startStage()
    expect(game.stage.value).toBe(14)
    // And the squad it opens with reflects the hydrated upgrade level, not the
    // fresh-install default.
    expect(game.squadCount.value).toBe(4)

    // Drain this module instance's pending persist timer. `vi.resetModules()`
    // gives the NEXT test fresh modules but cannot cancel a timer already
    // scheduled by this one — and when it fired it would write this test's blob
    // into the next test's store, which reads as a phantom hydrate.
    const { flushPersist } = await import('@/use/useTowerState')
    flushPersist()
  })

  it('keeps nothing but the two blobs in raw localStorage on a cloud-only build', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    // Cloud-only mode: gameplay state is in-memory; the proxy serves reads.
    // Nothing must leak into the raw store.
    const raw: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) raw.push(k)
    }
    expect(raw.filter((k) => k.startsWith('ts_'))).toEqual([])
  })
})

describe('hydrate failure modes', () => {
  it('does NOT overwrite a real cloud save when the local snapshot is empty', async () => {
    const data = await seededCloud()
    const manager = await bootCloudOnly(data)

    // A trivial post-boot write must not clobber the hydrated fields.
    const { setState } = await import('@/use/useTowerState')
    const { flushSaveNow } = await import('@/use/useSaveStatus')
    setState('ts_onboarded', true)
    await flushSaveNow()
    await manager.flush()

    const cloudBlob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(cloudBlob.ts_best_stage).toBe(14)
    expect(cloudBlob.ts_coins).toBe(1250)
    expect(cloudBlob.ts_onboarded).toBe(true)
  })

  it('retries a transient SDK failure before letting a returning player boot fresh', async () => {
    vi.useFakeTimers()
    try {
      const data = await seededCloud()
      const snapshot = new Map(data.store)
      let calls = 0
      data.getItem.mockImplementation(async (key: string) => {
        calls++
        // Fail the very first manifest read — the transient-blip failure mode.
        if (key === MANIFEST_KEY && calls === 1) throw new Error('transient SDK error')
        return snapshot.get(key) ?? null
      })

      const { SaveManager } = await import('@/utils/save/SaveManager')
      const { CrazyGamesStrategy } = await import('@/utils/save/CrazyGamesStrategy')
      const manager = new SaveManager(
        new CrazyGamesStrategy(() => data),
        window.localStorage,
        { blob: { persistToRaw: false } }
      )
      const init = manager.init()
      await vi.advanceTimersByTimeAsync(1_500)
      await init

      expect(manager.hydrateState).toBe('success-with-data')
      const blob = JSON.parse(window.localStorage.getItem(STATE_KEY) || '{}')
      expect(blob.ts_best_stage).toBe(14)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('treats a genuinely empty cloud as a real fresh install', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)

    const { default: useTowerEconomy } = await import('@/use/useTowerEconomy')
    const { upgradeLevel } = await import('@/use/useUpgrades')
    expect(useTowerEconomy().coins.value).toBe(0)
    expect(upgradeLevel('power')).toBe(0)

    const game = await import('@/use/useSurvivalGame')
    game.startStage()
    expect(game.stage.value).toBe(1)
  })

  it('survives a corrupt cloud blob without wiping the player', async () => {
    const { META_KEY } = await import('@/utils/save/SaveMergePolicy')
    const data = makeFakeData({
      [MANIFEST_KEY]: JSON.stringify([STATE_KEY, META_KEY]),
      [STATE_KEY]: '{not json at all',
      [META_KEY]: JSON.stringify({
        savedAt: '2026-05-19T00:00:00.000Z',
        progressScore: 5000, schemaVersion: 1, maxStage: 10
      })
    })
    // A corrupt blob must degrade to defaults, not throw during boot.
    await expect(bootCloudOnly(data)).resolves.toBeDefined()
    const { default: useTowerEconomy } = await import('@/use/useTowerEconomy')
    expect(useTowerEconomy().coins.value).toBe(0)
  })
})

describe('reload round-trip', () => {
  it('a stage cleared before the reload is still there after it', async () => {
    // ── Session 1: clear stage 5, then flush at the checkpoint. ──
    const data = makeFakeData()
    const m1 = await bootCloudOnly(data)
    const { default: useTowerEconomy } = await import('@/use/useTowerEconomy')
    const game = await import('@/use/useSurvivalGame')

    useTowerEconomy().addCoins(640)
    game.startStage(5)
    game.debugAddUnits(400)
    game.debugAddDamage(400)
    for (let i = 0; i < 4000 && game.phase.value !== 'clear'; i++) game.step(16)
    expect(game.phase.value).toBe('clear')
    await m1.flush()

    // ── Session 2: a cold boot against the same cloud store. ──
    // Drain session 1's pending persist timer first — see the note in the
    // resume test; a late fire would write session 1's blob into session 2.
    const { flushPersist } = await import('@/use/useTowerState')
    flushPersist()
    vi.resetModules()
    localStorage.clear()
    const data2 = makeFakeData(Object.fromEntries(data.store))
    await bootCloudOnly(data2)

    const { default: economy2 } = await import('@/use/useTowerEconomy')
    const game2 = await import('@/use/useSurvivalGame')
    expect(economy2().coins.value).toBeGreaterThanOrEqual(640)
    game2.startStage()
    // Stage 5 was cleared, so the resumed stage is the NEXT one.
    expect(game2.stage.value).toBe(6)
  })
})
