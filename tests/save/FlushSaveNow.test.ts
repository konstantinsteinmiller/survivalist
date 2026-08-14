import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── flushSaveNow — immediate checkpoint flush (the CG "stage lost on reload"
// regression) ──────────────────────────────────────────────────────────────
//
// On the CrazyGames cloud-only build, a cleared stage writes the new best stage into
// `tower_state`, but the push to `sdk.data` only fires after the persist (~200ms)
// + strategy-flush (~250ms) debounces, and the async cloud write then takes
// time to land. A player who clears a stage and reloads a moment later beat that
// pipeline → the reload restored the OLD stage.
//
// `flushSaveNow()` (called at every hard checkpoint) forces the whole pipeline to
// drain synchronously-as-possible: write `tower_state` now → SaveManager proxy →
// strategy dirty → `manager.flush()` → backend. This test proves a checkpoint write
// reaches the (fake) backend right after `flushSaveNow()` WITHOUT advancing any
// timers — i.e. it does not wait for either debounce.

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
  return manager
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('flushSaveNow — immediate flush on a hard checkpoint', () => {
  it('pushes a pending stage write to the backend without waiting for the debounce', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)

    const { setState } = await import('@/use/useTowerState')
    const { flushSaveNow } = await import('@/use/useSaveStatus')

    // A cleared stage writes the new best into tower_state (still sitting on the
    // debounce timers — nothing has reached the cloud yet).
    setState('ts_best_stage', 2)
    expect(data.store.get(STATE_KEY)).toBeUndefined()

    // The checkpoint flush drains everything immediately — no fake timers.
    await flushSaveNow()

    const cloudBlob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(cloudBlob.ts_best_stage).toBe(2)
  })

  it('also carries coexisting progress (coins) written in the same checkpoint', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)

    const { setState } = await import('@/use/useTowerState')
    const { flushSaveNow } = await import('@/use/useSaveStatus')

    setState('ts_coins', 250)
    setState('ts_best_stage', 3)
    await flushSaveNow()

    const cloudBlob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(cloudBlob.ts_best_stage).toBe(3)
    expect(cloudBlob.ts_coins).toBe(250)
  })
})

// A short tick that lets a fire-and-forget `void flushSaveNow()` async chain
// settle WITHOUT advancing far enough to trip the 200ms persist debounce — so
// anything in the cloud after it got there via the immediate checkpoint flush,
// not the throttle.
const settle = () => new Promise((r) => setTimeout(r, 0))

describe('discrete progression events flush to the backend immediately', () => {
  it('buying an upgrade flushes without waiting for the debounce', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)
    const { applyUpgrade } = await import('@/use/useUpgrades')
    const { default: useTowerEconomy } = await import('@/use/useTowerEconomy')
    useTowerEconomy().addCoins(10_000)

    expect(applyUpgrade('power')).toBe(true)
    await settle()

    const blob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(blob.ts_upgrades?.power).toBe(1)
  })

  it('finishing a stage flushes the new best stage immediately', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)
    const game = await import('@/use/useSurvivalGame')

    // Walk stage 3 to its end: start it, then run the clock until the boss is
    // dead. Driving the real simulation (rather than poking the state blob)
    // is the point — it proves the checkpoint fires from the code path a
    // player actually takes.
    game.startStage(3)
    game.debugAddUnits(400)
    game.debugAddDamage(400)
    for (let i = 0; i < 4000 && game.phase.value !== 'clear'; i++) game.step(16)
    expect(game.phase.value).toBe('clear')
    await settle()

    const blob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(blob.ts_best_stage).toBe(3)
    // And the NEXT stage is banked, so a reload resumes at 4 rather than 3.
    expect(blob.ts_stage).toBe(4)
  })
})
