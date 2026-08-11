import { ref, computed, watch, type Ref } from 'vue'
import { getState, setState, towerState } from '@/use/useTowerState'
import { saveDataVersion, flushSaveNow } from '@/use/useSaveStatus'
import { ACHIEVEMENTS_KEY } from '@/keys'
import useTowerEconomy from '@/use/useTowerEconomy'
import { bestWave } from '@/use/useTowerProgress'

// ─── Achievements / milestone quests ────────────────────────────────────────
//
// Lifetime milestones that turn incidental play into goals. Each grants a
// one-time coin payout scaled to how hard it is to reach — small for the early
// rungs, fat for the grindy capstones. State lives inside the single
// `tower_state` blob under `ACHIEVEMENTS_KEY`:
//   { claimed: string[], stats: { waves, kills, coins, blocks, bestHeight, runs } }
//
// Lifetime stats accumulate on every finished run via `recordRun`; the
// "highest wave reached" metric reads the live `bestWave` from
// `useTowerProgress` instead of being double-counted here.

/** Which counter an achievement measures. `wave` reads the live personal best;
 *  every other metric reads the persisted lifetime stats. */
export type AchievementMetric = 'waves' | 'kills' | 'coins' | 'blocks' | 'bestHeight' | 'runs' | 'wave'

export interface AchievementDef {
  id: string
  metric: AchievementMetric
  /** Goal value for `metric`. */
  target: number
  /** Coins granted on claim. */
  reward: number
}

interface AchievementStats {
  /** Lifetime waves cleared, across all runs. */
  waves: number
  kills: number
  coins: number
  /** Lifetime blocks placed. */
  blocks: number
  /** Tallest tower ever built, in rows. */
  bestHeight: number
  runs: number
}

interface AchievementState {
  claimed: string[]
  stats: AchievementStats
}

// Ordered roughly easy → hard. Rewards are deliberately modest and back-loaded
// so achievements feel earned rather than acting as a coin faucet.
export const ACHIEVEMENTS: ReadonlyArray<AchievementDef> = [
  // Highest wave ever survived — the headline ladder.
  { id: 'wave5', metric: 'wave', target: 5, reward: 150 },
  { id: 'wave10', metric: 'wave', target: 10, reward: 400 },
  { id: 'wave20', metric: 'wave', target: 20, reward: 1200 },
  { id: 'wave30', metric: 'wave', target: 30, reward: 3000 },
  // Lifetime waves cleared.
  { id: 'waves50', metric: 'waves', target: 50, reward: 250 },
  { id: 'waves250', metric: 'waves', target: 250, reward: 1000 },
  // Lifetime kills.
  { id: 'kills500', metric: 'kills', target: 500, reward: 200 },
  { id: 'kills5k', metric: 'kills', target: 5000, reward: 800 },
  { id: 'kills50k', metric: 'kills', target: 50000, reward: 3500 },
  // Tower height — rewards vertical ambition specifically.
  { id: 'height10', metric: 'bestHeight', target: 10, reward: 200 },
  { id: 'height20', metric: 'bestHeight', target: 20, reward: 700 },
  // Lifetime blocks placed.
  { id: 'blocks250', metric: 'blocks', target: 250, reward: 150 },
  { id: 'blocks2k', metric: 'blocks', target: 2000, reward: 700 },
  // Lifetime coins earned.
  { id: 'coins5k', metric: 'coins', target: 5000, reward: 250 },
  { id: 'coins50k', metric: 'coins', target: 50000, reward: 1200 },
  // Persistence.
  { id: 'runs25', metric: 'runs', target: 25, reward: 300 }
] as const

const emptyStats = (): AchievementStats => ({
  waves: 0, kills: 0, coins: 0, blocks: 0, bestHeight: 0, runs: 0
})

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const loadState = (): AchievementState => {
  const v = getState<Partial<AchievementState> | null>(ACHIEVEMENTS_KEY, null)
  const stats = emptyStats()
  if (v && v.stats && typeof v.stats === 'object') {
    const s = v.stats as Partial<AchievementStats>
    stats.waves = num(s.waves)
    stats.kills = num(s.kills)
    stats.coins = num(s.coins)
    stats.blocks = num(s.blocks)
    stats.bestHeight = num(s.bestHeight)
    stats.runs = num(s.runs)
  }
  const validIds = new Set(ACHIEVEMENTS.map((a) => a.id))
  const claimed = Array.isArray(v?.claimed)
    ? v!.claimed.filter((id): id is string => typeof id === 'string' && validIds.has(id))
    : []
  return { claimed, stats }
}

const state: Ref<AchievementState> = ref(loadState())

const refresh = (): void => { state.value = loadState() }
watch(saveDataVersion, refresh)
watch(towerState, refresh, { deep: false })

const persist = (): void => {
  setState(ACHIEVEMENTS_KEY, state.value)
  void flushSaveNow()
}

/** Lifetime value backing a metric. `wave` reads the live personal best. */
const metricValue = (metric: AchievementMetric): number => {
  if (metric === 'wave') return bestWave.value
  return state.value.stats[metric]
}

/** Count of completed-but-unclaimed achievements — drives the HUD badge. */
export const claimableAchievementCount = computed(() =>
  ACHIEVEMENTS.filter(
    (a) => !state.value.claimed.includes(a.id) && metricValue(a.metric) >= a.target
  ).length
)

export interface AchievementView extends AchievementDef {
  current: number
  claimed: boolean
  complete: boolean
  claimable: boolean
}

/** One finished run's contribution to the lifetime counters. */
export interface AchievementRun {
  waves: number
  kills: number
  coins: number
  height: number
  blocks: number
}

const useAchievements = () => {
  const { addCoins } = useTowerEconomy()

  const list = computed<AchievementView[]>(() =>
    ACHIEVEMENTS.map((a) => {
      const current = metricValue(a.metric)
      const complete = current >= a.target
      const claimed = state.value.claimed.includes(a.id)
      return { ...a, current, complete, claimed, claimable: complete && !claimed }
    })
  )

  const pendingCount = computed(() => list.value.filter((a) => a.claimable).length)
  const hasUnclaimed = computed(() => pendingCount.value > 0)

  /** Accumulate one finished run into the lifetime counters. */
  const recordRun = (run: AchievementRun): void => {
    const s = state.value.stats
    state.value = {
      claimed: state.value.claimed,
      stats: {
        waves: s.waves + num(run.waves),
        kills: s.kills + num(run.kills),
        coins: s.coins + num(run.coins),
        blocks: s.blocks + num(run.blocks),
        bestHeight: Math.max(s.bestHeight, num(run.height)),
        runs: s.runs + 1
      }
    }
    persist()
  }

  /** Claim a completed achievement's coins. Returns the amount, or 0 when it
   *  wasn't claimable. */
  const claim = (id: string): number => {
    const a = ACHIEVEMENTS.find((x) => x.id === id)
    if (!a) return 0
    if (state.value.claimed.includes(id)) return 0
    if (metricValue(a.metric) < a.target) return 0
    state.value = { ...state.value, claimed: [...state.value.claimed, id] }
    addCoins(a.reward)
    persist()
    return a.reward
  }

  return { list, pendingCount, hasUnclaimed, recordRun, claim }
}

export default useAchievements
