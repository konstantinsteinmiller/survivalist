import { computed, ref } from 'vue'
import {
  BARRICADE_COIN_MAX, BARRICADE_COIN_MIN,
  BARRICADE_H, BASE_FIRE_RATE, BOSS_BASE_HP, BOSS_GUARD_GATES,
  BULLET_LIFE_MS, BULLET_R, BULLET_RANGE, BULLET_SPEED,
  CHALLENGE_MAX, CHALLENGE_STEP,
  COIN_MAGNET_BASE, COIN_PULL_LEAD, CRATE_DAMAGE_GAIN,
  CRATE_R, CRATE_RATE_GAIN, CROWD_MAX_R, CROWD_SQUASH, DIVIDER_H, DIVIDER_HALF_W,
  ELITE_HOLD_AHEAD, ELITE_HOLD_MAX, ELITE_LUNGE, ELITE_SWEEP_CD,
  ELITE_SWEEP_FRACTION, ELITE_SWEEP_REACH, ELITE_TELEGRAPH, FOE_REACH, FUNNEL_LEAD,
  GATE_DEPTH, GATE_MAX_VALUE, GATE_SUB_MAX, GATE_TICK_MS, LANE_HALF, MAX_FIRE_RATE, MAX_SQUAD,
  SHOOTERS, SLAM_CD_BASE, SLAM_CD_DECAY, SLAM_CD_MIN, SLAM_RADIUS,
  SLAM_RADIUS_GROWTH, SLAM_RADIUS_MAX, STEER_SPRING, UNIT_R,
  biteShareFor, challengeBiteFactor, challengeFactor, challengePackFactor,
  contactReliefFor,
  funnelRadius, reliefFor, slamReliefFor,
  startBonusFor, stageReward, stageSpeed, wipeReward,
  type Barricade, type Boss, type Bullet, type Crate, type Divider, type Foe,
  type Gate, type Pickup, type Unit
} from '@/game/survival'
import { bossDesign, bossHpScale, foeDef, foeHpScale } from '@/game/foes'
import { buildTrack, type Track } from '@/game/track'
import { pushFx } from '@/use/useVfx'
import { difficultyFactor } from '@/use/useUser'
import {
  coinMagnetBonus, coinMultiplier, fireRate as metaFireRate, gatePayoutBonus,
  startSquad, unitDamage
} from '@/use/useUpgrades'
import { getState, setStates } from '@/use/useTowerState'
import { flushSaveNow } from '@/use/useSaveStatus'
import {
  BEST_SQUAD_KEY, BEST_STAGE_KEY, CHALLENGE_KEY, FAILED_STAGES_KEY, RUNS_KEY,
  STAGE_KEY, TOTAL_KILLS_KEY
} from '@/keys'

/**
 * ─── Survivalist — the simulation ───────────────────────────────────────────
 *
 * A module singleton, deliberately. There is exactly ONE run in flight at a
 * time, the renderer and the HUD both need to read it every frame, and passing
 * a store through props would mean the hot path goes through Vue's reactivity
 * for a hundred and ninety moving bodies. So: reactive refs for the handful of
 * values the HUD actually renders, plain arrays for everything the CANVAS
 * renders, and one `step(dtMs)` that owns the clock.
 *
 * Nothing here draws, measures, or touches the DOM — which is what keeps the
 * whole thing testable in jsdom, and what lets `tests/game/*` and the balance
 * harness walk a stage and assert its shape without a canvas.
 *
 * ─── The four rules that make it a game ─────────────────────────────────────
 *
 *   1. SOLID THINGS KILL. Every obstacle that has not been destroyed — crates,
 *      barricades, gate dividers — kills whoever runs into it. The gates
 *      themselves are the sole exception; they are doorways, not walls.
 *   2. GATES ARE A COMMITMENT. A bank is two leaves with a lethal pillar
 *      between them, and the crowd is narrower than one leaf but wider than the
 *      gap to the pillar. Choose a side and aim, or pay for the indecision.
 *   3. FIRE RATE IS EARNED IN THE RUN. It starts crawling and only rises from
 *      rate crates, which are always off the straight line.
 *   4. LOSING TEACHES. Die on a stage and every enemy on it loses 20 % health,
 *      once, permanently — a floor under frustration that never becomes a
 *      slide into triviality.
 *
 * ─── The loop, in order ─────────────────────────────────────────────────────
 *
 *   steer → advance → stream the track → shoot → move bullets → resolve hits →
 *   gates → dividers → foes → barricades → crates → pickups → boss → win/lose
 *
 * The order matters in one place: gates resolve AFTER movement so a gate can
 * never be "passed" on the same frame its number ticked up — the player always
 * sees the number they collected.
 */

// ─── Reactive surface (the HUD reads these, nothing else) ───────────────────

export type RunPhase = 'run' | 'boss' | 'clear' | 'wipe'

export const stage = ref(1)
export const phase = ref<RunPhase>('run')
/** Survivors alive right now. The single most important number on screen. */
export const squadCount = ref(0)
/** Damage per survivor per shot, this run (meta level + damage crates). */
export const damage = ref(1)
/** Shots per second per shooter, this run (meta level + rate crates). Starts
 *  crawling; every rate crate is a visible, audible step up. */
export const runFireRate = ref(1.5)
/** Coins picked up this run, before the stage bonus. */
export const runCoins = ref(0)
/** 0..1 along the stage — drives the HUD's progress rail. */
export const progress01 = ref(0)
/** 0..1 boss health, or 0 when there is no boss on screen. */
export const bossHp01 = ref(0)
/** True while a miniboss is alive — drives its HUD banner and off-screen marker. */
export const eliteAlive = ref(false)
/** 0..1 health of the miniboss the player is currently fighting. */
export const eliteHp01 = ref(0)
/** Biggest the squad ever got this run — the result screen's headline. */
export const peakSquad = ref(0)
export const kills = ref(0)
/** True when this stage is being replayed after a loss and every enemy is
 *  therefore softer. Surfaced on the result screen, never mid-run. */
export const reliefActive = ref(false)
/**
 * The autobalancer's streak: stages cleared in a row.
 *
 * Every point makes the next stage `CHALLENGE_STEP` harder; a single loss wipes
 * it. Exposed so the HUD can show the player they are being pushed — a handicap
 * nobody can see is indistinguishable from the game being inconsistent.
 */
export const challenge = ref(0)
/** Bumped whenever the world's contents change enough that a cache should be
 *  dropped (new stage). The renderer watches it instead of diffing arrays. */
export const worldVersion = ref(0)

export const bestStage = ref(Number(getState(BEST_STAGE_KEY, 0)) || 0)
export const bestSquad = ref(Number(getState(BEST_SQUAD_KEY, 0)) || 0)

// ─── World state (plain, non-reactive — the canvas owns these) ──────────────

let track: Track = buildTrack(1)
let units: Unit[] = []
let bullets: Bullet[] = []
let gates: Gate[] = []
let dividers: Divider[] = []
let crates: Crate[] = []
let barricades: Barricade[] = []
let foes: Foe[] = []
let pickups: Pickup[] = []
let boss: Boss | null = null

/** Index of the next track event that has not been streamed in yet. */
let nextEvent = 0
let entityId = 1

/** Where the crowd's centre is, and where the player wants it. */
let anchorX = 0
let anchorY = 0
let targetX = 0

let clock = 0
let fireAccum = 0
/** Slow-motion factor, driven by the moments worth savouring (a gate pass, the
 *  boss dying). Eases back to 1 on its own. */
let timeScale = 1
let timeScaleTarget = 1
/**
 * A slow-motion beat that outlives the frame that asked for it.
 *
 * `timeScaleTarget` is re-armed every tick, so a one-frame write is a dip the
 * player barely registers. That is right for a gate pass, which is a reward
 * landing on a moment they already chose. It is wrong for the boss's phase
 * turn, which has to read as the fight changing under them — so that one holds.
 */
let slowHoldMs = 0
/** Set while the crowd is inside a gate's charge band, so the HUD can prompt. */
let firingAtGate = false
/** Health multiplier for every enemy this stage — 1, or `RETRY_HP_RELIEF`. */
let hpRelief = 1
/** Slam-share multiplier for this stage — the second half of the relief. */
let slamRelief = 1
/** Obstacle-contact and trap multiplier for this stage — the third half. */
let contactRelief = 1

export const getUnits = (): Unit[] => units
export const getBullets = (): Bullet[] => bullets
export const getGates = (): Gate[] => gates
export const getDividers = (): Divider[] => dividers
export const getCrates = (): Crate[] => crates
export const getBarricades = (): Barricade[] => barricades
export const getFoes = (): Foe[] => foes
export const getPickups = (): Pickup[] => pickups
export const getBoss = (): Boss | null => boss
export const getTrack = (): Track => track
export const anchor = (): { x: number; y: number } => ({ x: anchorX, y: anchorY })
export const nowMs = (): number => clock
export const isChargingGate = (): boolean => firingAtGate

/** Total squad DPS — the HUD's firepower readout, and the number the balance
 *  harness tunes against. */
export const squadDps = computed(() => squadCount.value * damage.value * runFireRate.value)

// ─── Formation ──────────────────────────────────────────────────────────────

/**
 * Where survivor `i` of `n` stands, relative to the crowd's anchor.
 *
 * Sunflower (Vogel) packing: `r ∝ √i`, angle stepped by the golden angle. It
 * distributes bodies evenly with no clumps and no rings, it is O(1) per unit
 * with no neighbour queries at all, and — the reason it is here rather than a
 * boids flock — adding one survivor never moves the other hundred and eighty.
 *
 * The radius is CAPPED at `CROWD_MAX_R`, and that cap is load-bearing: it is
 * what lets a properly-aimed crowd fit through one gate leaf. A crowd that
 * grew without bound would make the gate choice impossible to execute, and the
 * whole commitment mechanic with it.
 */
const slotPos = (i: number, n: number, maxR: number): { x: number; y: number } => {
  const packR = Math.min(maxR, 0.33 * Math.sqrt(Math.max(1, n)))
  const r = packR * Math.sqrt((i + 0.5) / Math.max(1, n))
  const a = i * 2.399963229728653
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * CROWD_SQUASH }
}

/**
 * ─── The funnel ─────────────────────────────────────────────────────────────
 *
 * The crowd squeezes to fit the door it is aimed at, and springs back after.
 *
 * This is what makes leaf COUNT a design choice instead of a geometry problem.
 * A three-leaf bank has 1.33-wide doors; a full-size crowd is 1.65 across the
 * radius and simply cannot fit one, so without this the generator could never
 * offer three options without taxing every large crowd that met them.
 *
 * It is also just what a crowd does. Two hundred people funnelling through a
 * doorway compress on the way in and spill out the far side, and getting that
 * for free out of a rule we needed anyway is the good kind of luck.
 */
let funnelR = CROWD_MAX_R

const updateFunnel = (dt: number): void => {
  let target = CROWD_MAX_R
  let nearest = Number.POSITIVE_INFINITY

  for (const g of gates) {
    if (g.used || g.dismissed) continue
    const ahead = g.y - anchorY
    // Only doors still in front of the crowd, and only once they are close
    // enough that squeezing reads as anticipation rather than as a shrink.
    if (ahead < -0.6 || ahead > FUNNEL_LEAD || ahead > nearest) continue
    // The door the player is actually steering at — not the nearest one, which
    // on a three-leaf bank is whichever happens to be closest to the centre.
    const aimed = Math.abs(g.x - targetX) <= g.halfW + 0.6
    if (!aimed && ahead >= nearest) continue
    nearest = ahead
    if (aimed) target = Math.min(target, funnelRadius(g.halfW))
  }

  // Ease in faster than out: arriving already narrow is the point, and spilling
  // back out slowly is what makes the far side of a gate feel like relief.
  const k = 1 - Math.exp(-(target < funnelR ? 6 : 3.2) * dt)
  funnelR += (target - funnelR) * k
}

/** The furthest from the centre line a survivor may ever stand: the rail, minus
 *  their own body. Nobody is ever drawn hanging over the edge of the road. */
const EDGE_X = LANE_HALF - UNIT_R

/** Rough half-width of the crowd RIGHT NOW, funnel included — what the camera,
 *  the coin magnet and the renderer should all be reading. */
export const crowdRadius = (): number =>
  Math.min(funnelR, 0.33 * Math.sqrt(Math.max(1, squadCount.value)))

/**
 * The crowd's LIVE half-width, funnel included.
 *
 * Identical to `crowdRadius()` and exported under a second name on purpose: the
 * renderer needs to reason about the formation the player can actually see, and
 * "crowd radius" reads like a constant while this one is obviously a
 * measurement. Both are the number every collision test in here uses.
 */
export const formationRadius = (): number => crowdRadius()

/** 0..1 — how hard the crowd is currently squeezing. The renderer uses it to
 *  sell the funnel (dust, lean, tighter shadows) rather than letting the crowd
 *  silently shrink. */
export const funnelTightness = (): number =>
  Math.max(0, Math.min(1, 1 - (funnelR - 0.45) / Math.max(0.01, CROWD_MAX_R - 0.45)))

// ─── Difficulty relief ──────────────────────────────────────────────────────

type FailMap = Record<string, number>

const readFails = (): FailMap => {
  const raw = getState<FailMap>(FAILED_STAGES_KEY, {})
  return raw && typeof raw === 'object' ? raw : {}
}

/** How many times the player has lost this stage. Drives the escalating
 *  relief — the more a stage beats somebody, the more it gives back. */
export const failureCount = (n: number): number => readFails()[String(n)] ?? 0

/** Has the player already lost on this stage? */
export const hasFailedStage = (n: number): boolean => failureCount(n) > 0

const recordFailure = (n: number): void => {
  const fails = { ...readFails() }
  fails[String(n)] = (fails[String(n)] ?? 0) + 1
  setStates({ [FAILED_STAGES_KEY]: fails })
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

const resetWorld = (): void => {
  units = []
  bullets = []
  gates = []
  dividers = []
  crates = []
  barricades = []
  foes = []
  pickups = []
  boss = null
  nextEvent = 0
  fireAccum = 0
  timeScale = 1
  timeScaleTarget = 1
  slowHoldMs = 0
  firingAtGate = false
  crushDebt.clear()
  // The run's own clock and id space. `clock` drives the crowd's idle wobble
  // and the flyers' sway, so carrying it across stages made the same seed
  // replay a stage differently depending on how long the previous run lasted.
  clock = 0
  entityId = 1
  eliteAlive.value = false
  eliteHp01.value = 0
}

const spawnUnit = (x: number, y: number): void => {
  if (squadCount.value >= MAX_SQUAD) return
  units.push({
    i: units.length,
    x,
    y,
    vx: 0,
    vy: 0,
    phase: Math.random(),
    flash: 0,
    dying: 0
  })
  squadCount.value++
  if (squadCount.value > peakSquad.value) peakSquad.value = squadCount.value
}

/**
 * Begin a stage.
 *
 * `startStage()` with no argument resumes whatever stage the save says the
 * player is on — the resume path a reload or a cross-device cloud hydrate
 * takes. The layout is rebuilt from the stage number alone, which is why there
 * is no mid-stage snapshot to get wrong.
 */
export const startStage = (n?: number): void => {
  const target = Math.max(1, Math.floor(n ?? (Number(getState(STAGE_KEY, 1)) || 1)))
  stage.value = target
  track = buildTrack(target)

  resetWorld()
  squadCount.value = 0
  damage.value = unitDamage.value
  setFireRate(metaFireRate.value)
  runCoins.value = 0
  kills.value = 0
  peakSquad.value = 0
  progress01.value = 0
  bossHp01.value = 0
  phase.value = 'run'

  deaths = emptyDeaths()

  // ── The autobalancer, resolved once ──
  //
  // Two forces, opposite directions, settled here so nothing can move under the
  // player mid-run: a streak of clears winds the stage UP, and a history of
  // losing this particular stage winds it DOWN — further each time it beats
  // them. Read once, exposed to the HUD only on the result screen.
  const failures = failureCount(target)
  reliefActive.value = failures > 0
  challenge.value = Math.max(0, Math.min(CHALLENGE_MAX, Number(getState(CHALLENGE_KEY, 0)) || 0))
  hpRelief = reliefFor(failures) * challengeFactor(challenge.value)
  slamRelief = slamReliefFor(failures)
  contactRelief = contactReliefFor(failures)

  anchorX = 0
  anchorY = 0
  targetX = 0
  steerMoves = 0

  funnelR = CROWD_MAX_R
  // A stuck player is handed people, not just weaker enemies: it is the only
  // concession a run dying two-thirds down the road can actually spend.
  const start = Math.max(1, startSquad.value + startBonusFor(failures, target))
  for (let i = 0; i < start; i++) {
    const p = slotPos(i, start, CROWD_MAX_R)
    spawnUnit(p.x, p.y)
  }

  worldVersion.value++
  setStates({
    [STAGE_KEY]: target,
    [RUNS_KEY]: Number(getState(RUNS_KEY, 0) || 0) + 1
  })
}

/** Advance to the next stage and start it. */
export const advanceStage = (): void => startStage(stage.value + 1)

/** Restart the current stage after a wipe. */
export const retryStage = (): void => startStage(stage.value)

export interface RunSummary {
  stage: number
  cleared: boolean
  squad: number
  peakSquad: number
  kills: number
  coins: number
  isRecord: boolean
  /** The run was played with the retry relief active. */
  relieved: boolean
}

let summary: RunSummary = {
  stage: 1, cleared: false, squad: 0, peakSquad: 0, kills: 0, coins: 0,
  isRecord: false, relieved: false
}

export const runSummary = (): RunSummary => summary

/**
 * Close out the stage.
 *
 * Coins are computed HERE rather than on the result screen so the number the
 * player sees is the number that was banked, even if an interstitial plays in
 * between (which it does — see the scene's ad ordering).
 */
const finishRun = (cleared: boolean): void => {
  // Idempotent: the boss step and the squad-wiped check can both fire inside a
  // single tick, and a second payout would double the coins.
  if (phase.value === 'clear' || phase.value === 'wipe') return

  const scav = coinMultiplier.value
  const bonus = cleared
    ? stageReward(stage.value, peakSquad.value)
    : wipeReward(stage.value, peakSquad.value, progress01.value)
  const coins = Math.max(1, Math.round((runCoins.value + bonus) * scav))

  const record = cleared && stage.value >= bestStage.value
  summary = {
    stage: stage.value,
    cleared,
    squad: squadCount.value,
    peakSquad: peakSquad.value,
    kills: kills.value,
    coins,
    isRecord: record,
    relieved: reliefActive.value
  }

  const patch: Record<string, unknown> = {
    [TOTAL_KILLS_KEY]: Number(getState(TOTAL_KILLS_KEY, 0) || 0) + kills.value
  }
  if (peakSquad.value > bestSquad.value) {
    bestSquad.value = peakSquad.value
    patch[BEST_SQUAD_KEY] = peakSquad.value
  }
  // ── The autobalancer's other half ──
  // A clear winds the streak up one; a loss wipes it to zero. Both are written
  // in the same batch as the rest of the run's bookkeeping, so a player who
  // closes the tab on the result screen keeps the difficulty they earned.
  const nextChallenge = cleared ? Math.min(CHALLENGE_MAX, challenge.value + 1) : 0
  challenge.value = nextChallenge
  patch[CHALLENGE_KEY] = nextChallenge

  if (cleared) {
    if (stage.value > bestStage.value) {
      bestStage.value = stage.value
      patch[BEST_STAGE_KEY] = stage.value
    }
    // Bank the NEXT stage immediately: a player who closes the tab on the
    // victory screen has earned the stage they just cleared.
    patch[STAGE_KEY] = stage.value + 1
  }
  setStates(patch)

  // Losing is recorded BEFORE the flush, so the relief is already in the save
  // by the time the player taps "try again" — but ONLY if somebody was playing.
  // A run that never steered is not a stuck player to be helped; it is an idle
  // tab, and paying it relief is how a difficulty curve quietly turns into an
  // idle game.
  if (!cleared && wasPlayed()) recordFailure(stage.value)

  // Hard checkpoint → drain the whole save pipeline NOW rather than waiting out
  // the 200 ms state debounce plus the strategy's own flush debounce. A player
  // who clears a stage and immediately closes the tab (or reloads on a portal
  // that kills the process) would otherwise beat the pipeline and come back to
  // the previous stage — the exact regression this call exists to prevent.
  void flushSaveNow()

  phase.value = cleared ? 'clear' : 'wipe'
  pushFx({ kind: cleared ? 'stageClear' : 'wipe', x: anchorX, y: anchorY })
}

// ─── Input ──────────────────────────────────────────────────────────────────

/**
 * Did the player actually play this run?
 *
 * Counts steers that MOVED the crowd somewhere it was not already going. It
 * exists for one reason: the escalating relief is a concession to a frustrated
 * player, and a frustrated player is not the same thing as an idle tab. Without
 * this the two are indistinguishable to the save file — and the simulation
 * proved it, by walking a run that never touched the screen through stage 1 on
 * its fifth attempt purely on accumulated relief. A game that plays itself
 * after four losses is not a game with a difficulty curve.
 *
 * Three deliberate moves is the bar. It is low on purpose: this is meant to
 * exclude nobody who is trying.
 */
const MEANINGFUL_STEER = 0.5
const PLAYED_THRESHOLD = 3
let steerMoves = 0

/** True when this run shows evidence of a player at the controls. */
export const wasPlayed = (): boolean => steerMoves >= PLAYED_THRESHOLD

/** Absolute steer — a tap puts the crowd's target under the finger. */
export const steerTo = (worldX: number): void => {
  const next = Math.max(-LANE_HALF + 0.4, Math.min(LANE_HALF - 0.4, worldX))
  if (Math.abs(next - targetX) >= MEANINGFUL_STEER) steerMoves++
  targetX = next
}

/** Relative steer — a drag moves the target by a world-space delta. */
export const steerBy = (dxWorld: number): void => steerTo(targetX + dxWorld)

export const steerTarget = (): number => targetX

// ─── Track streaming ────────────────────────────────────────────────────────

/**
 * Materialise every track event within `LOOKAHEAD` of the crowd.
 *
 * The track is a static score, but the world is not: spawning all of stage 14's
 * two hundred entities up front would cost a frame and keep four hundred dead
 * objects in the collision loops. Streaming keeps the live set at roughly what
 * is on screen.
 */
const LOOKAHEAD = 30

const streamTrack = (): void => {
  const diff = difficultyFactor()
  while (nextEvent < track.events.length) {
    const e = track.events[nextEvent]
    if (!e || e.y > anchorY + LOOKAHEAD) break
    nextEvent++

    switch (e.kind) {
      case 'gates': {
        // One id for the whole bank: it is what lets a claimed door destroy the
        // offers beside it, and the pillars between them, in one stroke.
        const bankId = entityId++
        for (const leaf of e.leaves) {
          gates.push({
            id: entityId++, bankId, x: leaf.x, halfW: leaf.halfW, y: e.y,
            op: leaf.op, value: leaf.value, charge: 0, hotFor: 999,
            used: false, dismissed: false, pop: 0
          })
        }
        // The pillars are what turn a row of doorways into a decision.
        for (const x of e.dividers) {
          dividers.push({
            id: entityId++, bankId, x, y: e.y, halfW: DIVIDER_HALF_W, dismissed: false
          })
        }
        break
      }

      case 'crates':
        for (const c of e.crates) {
          crates.push({
            id: entityId++, kind: c.kind, x: c.x, y: e.y, hp: e.hp, maxHp: e.hp,
            spin: (Math.random() - 0.5) * 0.4, dead: false
          })
        }
        break

      case 'barricade':
        for (const b of e.blocks) {
          const hp = Math.round(b.hp * diff * hpRelief)
          barricades.push({
            id: entityId++, x: b.x, y: e.y, w: b.w, hp, maxHp: hp, flash: 0, dead: false
          })
        }
        break

      case 'foes': {
        const def = foeDef(e.typeId)
        const hp = Math.max(1, Math.round(def.hp * foeHpScale(stage.value) * diff * hpRelief))
        // A streak sends more of them, and each one takes a bigger mouthful.
        const count = Math.round(e.count * challengePackFactor(challenge.value))
        for (let i = 0; i < count; i++) {
          const spread = (i / Math.max(1, count - 1) - 0.5) * 2 * e.spread
          const design = def.designs[i % def.designs.length] ?? def.designs[0]!
          foes.push({
            id: entityId++,
            typeId: def.id,
            design,
            x: Math.max(-LANE_HALF + 0.5, Math.min(LANE_HALF - 0.5, spread + (Math.random() - 0.5) * 0.6)),
            y: e.y + (Math.random() - 0.5) * 1.4,
            hp, maxHp: hp,
            speed: def.speed,
            bite: Math.max(1, Math.round(def.bite * challengeBiteFactor(challenge.value))),
            biteShare: biteShareFor(def.id) * challengeBiteFactor(challenge.value),
            biteCd: 0,
            scale: def.scale,
            flash: 0,
            phase: Math.random(),
            dead: false,
            flying: def.flying,
            swayPhase: Math.random() * Math.PI * 2,
            hold: 0,
            sweepCd: 0, sweepSpan: 0, sweepDir: 1,
            elite: false
          })
        }
        break
      }

      case 'miniboss': {
        const def = foeDef(e.typeId)
        const hp = Math.max(
          20,
          Math.round(def.hp * foeHpScale(stage.value) * e.hpScale * diff * hpRelief)
        )
        foes.push({
          id: entityId++,
          typeId: def.id,
          design: def.designs[0] ?? 'snaggletusk',
          x: 0,
          y: e.y,
          hp, maxHp: hp,
          // Slower than its archetype on the walk in — but the walk in is not
          // the fight. See `ELITE_HOLD_AHEAD`: it plants when it arrives.
          speed: def.speed * 0.7,
          bite: def.bite * 2,
          biteShare: biteShareFor(def.id) * 2,
          biteCd: 0,
          scale: def.scale * 1.9,
          flash: 0,
          phase: Math.random(),
          dead: false,
          flying: false,
          swayPhase: 0,
          hold: ELITE_HOLD_MAX,
          // First sweep on a full cycle, so the walk in is not also a wind-up:
          // the player gets the whole approach before anything is thrown.
          sweepCd: ELITE_SWEEP_CD,
          sweepSpan: ELITE_SWEEP_CD,
          sweepDir: Math.random() < 0.5 ? -1 : 1,
          elite: true
        })
        pushFx({ kind: 'eliteSpawn', x: 0, y: e.y })
        break
      }

      case 'coins':
        for (let i = 0; i < e.xs.length; i++) {
          pickups.push({
            id: entityId++,
            x: e.xs[i] ?? 0,
            y: e.ys[i] ?? e.y,
            value: 1,
            taken: false,
            phase: Math.random() * Math.PI * 2
          })
        }
        break
    }
  }
}

// ─── The tick ───────────────────────────────────────────────────────────────

/**
 * Advance the world by `dtMs` of wall time.
 *
 * The caller (the scene's RAF loop) is responsible for NOT calling this while
 * the game is paused — an ad, a hidden tab, an open modal. That gate lives in
 * one place, `useGamePause`, so the simulation never has to know why it stopped.
 */
export const step = (dtMs: number): void => {
  if (phase.value === 'clear' || phase.value === 'wipe') return

  // Ease the slow-motion factor back toward 1. Frame-rate independent, so a
  // 30 fps phone gets the same amount of drama as a 120 Hz tablet.
  timeScale += (timeScaleTarget - timeScale) * Math.min(1, dtMs / 120)
  if (Math.abs(timeScaleTarget - timeScale) < 0.01) timeScale = timeScaleTarget
  timeScaleTarget = 1
  if (slowHoldMs > 0) {
    slowHoldMs -= dtMs
    timeScaleTarget = 0.45
  }

  // Cap the step: a backgrounded tab that returns with a 4-second delta must
  // not teleport the crowd through a barricade.
  const dt = Math.min(dtMs, 60) * timeScale / 1000
  clock += dtMs * timeScale

  // ── The onboarding hold ──
  //
  // The crowd answers the thumb and nothing else in the world exists yet: no
  // road streamed, no shooting, no clock on the stage. It is deliberately a
  // hold on the SIMULATION rather than a pause, because the one thing the
  // tutorial has to teach is that moving your finger moves the squad — and a
  // paused game cannot demonstrate that.
  //
  // `streamTrack` is skipped rather than merely gated on `forward`, so the
  // gates, crates and foes of stage 1 are not sitting on screen behind the
  // lightbox: the player meets the road when the road starts.
  if (!steerOnly.value) streamTrack()
  stepAnchor(dt)
  stepUnits(dt)
  if (steerOnly.value) return
  stepShooting(dt)
  stepBullets(dt)
  stepGates(dt)
  stepDividers(dt)
  stepFoes(dt)
  stepBarricades(dt)
  stepCrates(dt)
  stepPickups(dt)
  stepBoss(dt)

  progress01.value = Math.max(0, Math.min(1, anchorY / Math.max(1, track.arenaY)))

  // `finishRun` is idempotent, so this needs no phase check of its own — the
  // boss step may already have ended the run earlier in this same tick.
  if (squadCount.value <= 0) finishRun(false)
}

/**
 * Hold the road still while the crowd stays steerable.
 *
 * Set by the onboarding lightbox and by nothing else. It is NOT a pause: `step`
 * still runs the anchor and the formation, so the squad follows the finger,
 * which is the entire lesson. See the hold in `step`.
 */
export const steerOnly = ref(false)

/** The crowd's centre: forward at the stage's pace, sideways after the thumb. */
const stepAnchor = (dt: number): void => {
  const forward = phase.value === 'run' && !steerOnly.value ? stageSpeed(stage.value) : 0
  anchorY += forward * dt

  // A holding elite is a WALL. The crowd stops at it and has to shoot it down.
  //
  // This is the difference between a landmark and a decoration, and it is the
  // only version of the rule that survives contact with the rest of the game:
  // an elite that merely tracked the crowd would be dragged forward through
  // every gate bank behind it, eating the rounds meant for the doors for nine
  // seconds. Blocking instead means it defends the ground it was placed on,
  // which is the ground the generator cleared 12 units of road in front of.
  //
  // It is never a soft-lock: `ELITE_HOLD_MAX` breaks the hold, and a broken
  // hold walks past exactly as before. Worst case a stuck player waits nine
  // seconds and pays in survivors — a cost, not a wall.
  if (phase.value === 'run') {
    for (const f of foes) {
      if (!f.elite || f.dead || f.hold <= 0) continue
      const stopAt = f.y - ELITE_HOLD_AHEAD
      if (anchorY > stopAt) anchorY = Math.max(anchorY - forward * dt, stopAt)
    }
  }

  // Critically-damped-ish approach. Snappy enough to feel direct, soft enough
  // that the crowd has mass.
  const k = 1 - Math.exp(-STEER_SPRING * dt)
  anchorX += (targetX - anchorX) * k

  if (phase.value === 'run' && anchorY >= track.arenaY) {
    phase.value = 'boss'
    spawnBoss()
  }
}

const spawnBoss = (): void => {
  // Sized against the DPS a stage actually produces — see `BOSS_BASE_HP`.
  const hp = Math.max(
    60,
    Math.round(BOSS_BASE_HP * bossHpScale(stage.value) * difficultyFactor() * hpRelief)
  )
  boss = {
    design: bossDesign(stage.value),
    x: 0,
    y: track.bossY,
    hp,
    maxHp: hp,
    speed: 0.85,
    flash: 0,
    phase: 0,
    scale: 2.5,
    slamCd: 2.6,
    slamSpan: 2.6,
    slams: 0,
    aimed: false,
    guarded: 0,
    guard: 0,
    slamX: 0,
    slamY: 0,
    dead: false,
    dying: 0
  }
  bossHp01.value = 1
}

/**
 * Move every survivor toward its formation slot.
 *
 * Springs, not steering behaviours: the target is authoritative and the spring
 * only decides how the body gets there, so a crowd of a hundred and ninety can
 * never tangle, oscillate or drift out of the lane. The per-unit noise is what
 * stops it looking like a rigid lattice being dragged around.
 */
const stepUnits = (dt: number): void => {
  updateFunnel(dt)
  const n = squadCount.value
  const maxR = funnelR
  let slot = 0
  const t = clock / 1000

  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i]!
    if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 1000)

    if (u.dying > 0) {
      u.dying -= dt * 1000
      if (u.dying <= 0) {
        units.splice(i, 1)
        continue
      }
      // Tumble out of the crowd rather than blinking away — a survivor that
      // vanishes reads as a rendering bug, one that falls over reads as a loss.
      u.x += u.vx * dt
      u.y += u.vy * dt
      u.vy -= 5 * dt
      continue
    }
    // Alive units take slots in array order, so a death in the middle of the
    // crowd makes everyone behind it close ranks.
    u.i = slot
    const p = slotPos(slot, n, maxR)
    slot++

    // Idle jitter, unique per unit, so nobody stands perfectly still.
    const wob = Math.sin(t * 3.1 + u.i * 1.7) * 0.045
    let tx = anchorX + p.x + wob
    let ty = anchorY + p.y + Math.cos(t * 2.7 + u.i * 2.3) * 0.03

    // ── The crowd never walks off the road ──
    //
    // The formation is a disc around the anchor, and the anchor can sit close
    // enough to a rail that half the disc hangs over the edge — survivors
    // strolling through the barrier and out over the drop, which is the single
    // most immersion-breaking thing the crowd can do.
    //
    // Clamping alone would stack everybody in a hard vertical line ON the rail,
    // which looks just as wrong. So the overflow is REDISTRIBUTED along the
    // lane instead: whoever cannot fit sideways is pushed forward or back
    // (alternating, by index, so it is stable frame to frame) in proportion to
    // how far outside they were. The crowd squashes against the rail and
    // lengthens down the road — which is exactly what a real crowd funnelling
    // along a wall does.
    if (tx < -EDGE_X || tx > EDGE_X) {
      const over = Math.abs(tx) - EDGE_X
      tx = Math.sign(tx) * EDGE_X
      ty += (u.i % 2 === 0 ? 1 : -1) * Math.min(1.3, over * 0.9)
    }

    const k = 1 - Math.exp(-14 * dt)
    u.x += (tx - u.x) * k
    u.y += (ty - u.y) * k
    // Hard backstop for anything that moved a survivor outside the road behind
    // the formation's back — an obstacle shove, a gate spawn near the rail.
    if (u.x < -EDGE_X) u.x = -EDGE_X
    else if (u.x > EDGE_X) u.x = EDGE_X
    // Gait phase advances with actual speed, so a halted crowd stops running on
    // the spot during the boss fight.
    u.phase += dt * (phase.value === 'run' ? 1.7 : 0.55)
  }
}

/**
 * Where the squad's losses came from, this run.
 *
 * Kept because "why did they stop?" is unanswerable without it: a stage that
 * bleeds survivors to dividers is badly TAUGHT, one that bleeds them to foes is
 * badly TUNED, and one that bleeds them to traps is working exactly as intended.
 * The balance harness reads it, and it is the shape the analytics events in the
 * retention roadmap will carry.
 */
export type DeathCause = 'foe' | 'elite' | 'barricade' | 'crate' | 'divider' | 'trap' | 'slam'

const emptyDeaths = (): Record<DeathCause, number> =>
  ({ foe: 0, elite: 0, barricade: 0, crate: 0, divider: 0, trap: 0, slam: 0 })

let deaths = emptyDeaths()

export const deathBreakdown = (): Record<DeathCause, number> => ({ ...deaths })

/**
 * ─── Solid-body contact ─────────────────────────────────────────────────────
 *
 * Everything that is not a gate is SOLID: it kills what it touches. But "kill
 * every overlapping survivor, every frame" is not the same rule, and the
 * difference is the whole feel of the game.
 *
 * The formation re-packs the moment anybody dies, so a naive per-frame cull
 * feeds the crowd into an obstacle like a mincer: the survivors behind the dead
 * ones slide into the exact spot that just killed them, and half a second of
 * contact deletes a two-hundred-strong squad. Tested, and it turned one sloppy
 * line into an instant loss with no readable warning.
 *
 * So contact does two things instead:
 *
 *   • it KILLS at a rate proportional to the crowd (with a floor), so brushing
 *     a pillar costs a slice and driving down the middle of one costs a lot —
 *     always a percentage the player can see, never everything;
 *   • it PUSHES the rest clear. The obstacle is solid, so the crowd parts
 *     around it. That is what stops the mincer, and it is also just what a
 *     crowd hitting a post looks like.
 */
interface Crush {
  x: number
  halfW: number
  y: number
  halfH: number
  cause: DeathCause
  /**
   * Survivors killed per second, as `max(1, squad × fraction)`.
   *
   * PROPORTIONAL, with a floor of exactly one. An absolute rate is unfair at
   * both ends of the range: a flat 8/s deletes a four-strong opening squad in
   * half a second (measured — stage 3 ended before the first gate), and is
   * beneath notice to a crowd of two hundred. A percentage costs every player
   * the same fraction of what they built, which is the thing they actually
   * feel, and the floor guarantees a mistake always costs at least one person.
   */
  fraction: number
}

/**
 * Fractional part of a kill carried between frames, per obstacle id, so a
 * 60 fps device and a 30 fps one cost the player the same.
 *
 * Two rules keep it honest, and both were bugs first:
 *
 *   • budget only accrues while something is ACTUALLY touching. It used to
 *     accrue for every obstacle within six units, so an obstacle approached
 *     from range banked ~2 s of kills and spent the lot on the first frame of
 *     contact;
 *   • the carry is capped at one kill, so the bank can never exceed what a
 *     single frame of contact is worth.
 *
 * Without them a player who noticed late and CORRECTED was punished four times
 * harder than one who never corrected at all (measured: grazing a pillar cost
 * 17 survivors when held on the line and 77 when cut into at the last moment,
 * for 60 % less contact time). That is the exact inverse of the lesson the
 * obstacle is supposed to teach.
 */
const crushDebt = new Map<number, number>()

/**
 * Is anything of the crowd near enough to `(x, y)` to be worth a full scan?
 *
 * The two hot loops in here — obstacle contact and foe bites — are O(units),
 * and the squad cap is 1 600. Both are almost always looking at something the
 * crowd is nowhere near, so one cheap test against the formation's bounding
 * disc turns "scan sixteen hundred bodies" into two subtractions and a compare.
 * It is the difference between the cap being a design choice and a frame cost.
 */
const nearCrowd = (x: number, y: number, pad: number): boolean => {
  const r = crowdRadius() + pad
  const dx = x - anchorX
  const dy = y - anchorY
  return dx * dx + dy * dy <= r * r
}

/** @returns true when at least one survivor died on this obstacle this frame. */
const crushAgainst = (id: number, c: Crush, dt: number): boolean => {
  // Nothing of the crowd is in reach — do not touch the unit array at all.
  if (!nearCrowd(c.x, c.y, Math.max(c.halfW, c.halfH) + UNIT_R + 0.2)) {
    crushDebt.delete(id)
    return false
  }
  let budget = -1
  let killed = false

  for (const u of units) {
    if (u.dying > 0) continue
    const dx = u.x - c.x
    const dy = u.y - c.y
    const overlapX = c.halfW + UNIT_R - Math.abs(dx)
    if (overlapX <= 0) continue
    if (Math.abs(dy) > c.halfH + UNIT_R) continue

    // First unit touching this obstacle this frame: open the budget.
    //
    //   • a NEW contact opens at 1 — touching something solid always costs at
    //     least one survivor, or a graze is free and the obstacle teaches
    //     nothing;
    //   • a CONTINUING contact carries its remainder (capped at one kill by the
    //     store below) and accrues at the crowd-proportional rate, so ploughing
    //     through costs many.
    if (budget < 0) {
      const carried = crushDebt.get(id)
      budget = (carried === undefined ? 1 : carried)
        + Math.max(1, squadCount.value * c.fraction * contactRelief) * dt
    }

    if (budget >= 1) {
      budget -= 1
      killUnit(u, Math.sign(dx) || 1, c.cause)
      killed = true
      continue
    }
    // Out of kills this frame: shove the survivor clear instead. Pushing the
    // UNIT and never the anchor keeps the player's steering authoritative —
    // the crowd deforms around the obstacle, the player is not nudged. The
    // shove is clamped to the road, so an obstacle near a rail squeezes the
    // crowd along the barrier rather than pushing survivors over it.
    const dir = Math.sign(dx) || 1
    u.x = Math.max(-EDGE_X, Math.min(EDGE_X, u.x + dir * overlapX))
  }

  if (budget < 0) crushDebt.delete(id)
  else crushDebt.set(id, Math.min(budget, 1))
  return killed
}

/** Kill a survivor: mark it dying, fling it, and tell the world. */
const killUnit = (u: Unit, dirX = 0, cause: DeathCause = 'foe'): void => {
  if (u.dying > 0) return
  u.dying = 420
  u.vx = dirX * 2.4 + (Math.random() - 0.5) * 1.6
  u.vy = 1.8 + Math.random() * 1.4
  squadCount.value = Math.max(0, squadCount.value - 1)
  deaths[cause]++
  pushFx({ kind: 'unitLost', x: u.x, y: u.y, outfit: u.i })
}

/**
 * Emit bullets.
 *
 * Only `SHOOTERS` streams are ever visible, but the DPS is the whole squad's:
 * each round carries `squad × damage / shooters`. A hundred survivors therefore
 * hit a hundred times harder without costing a hundred times the draw calls,
 * and the damage numbers still add up to exactly `squad × damage × fireRate`.
 */
const stepShooting = (dt: number): void => {
  if (phase.value !== 'run' && phase.value !== 'boss') return
  const alive = squadCount.value
  if (alive <= 0) return

  const shooters = Math.min(alive, SHOOTERS)
  const perBullet = (alive * damage.value) / shooters

  fireAccum += dt * shooters * runFireRate.value
  // Hard cap the burst a single frame can produce, so a long frame (a tab
  // regaining focus) cannot dump sixty bullets into one 16 ms slice.
  let budget = 8
  while (fireAccum >= 1 && budget-- > 0) {
    fireAccum -= 1

    // Fire from a random survivor in the FRONT half of the crowd. Random beats
    // "the first N in the array" here: the muzzle flashes scatter across the
    // front rank instead of stuttering out of the same three bodies.
    let from: Unit | null = null
    for (let tries = 0; tries < 6 && !from; tries++) {
      const u = units[Math.floor(Math.random() * units.length)]
      if (u && u.dying <= 0 && u.y >= anchorY - 0.4) from = u
    }
    if (!from) from = units.find((u) => u.dying <= 0) ?? null
    if (!from) break

    from.flash = 70
    bullets.push({
      x: from.x,
      y: from.y + 0.35,
      vx: (Math.random() - 0.5) * 0.5,
      vy: BULLET_SPEED,
      damage: perBullet,
      life: BULLET_LIFE_MS,
      pierced: -1
    })
    pushFx({ kind: 'shoot', x: from.x, y: from.y + 0.35 })
  }
  if (fireAccum > 4) fireAccum = 4
}

/**
 * Move rounds and resolve the first thing each one touches.
 *
 * Deliberately a linear scan rather than a spatial hash: the live set inside a
 * bullet's window is a handful of objects, and a hash would cost more to
 * maintain than it saves. The `dy` early-out is what keeps it honest — a bullet
 * never looks at anything it cannot reach this frame.
 */
const stepBullets = (dt: number): void => {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]!
    b.life -= dt * 1000
    b.x += b.vx * dt
    b.y += b.vy * dt

    // Out of range is measured from the CROWD, not from where the round was
    // fired: the range is a fact about the screen, and the screen travels with
    // the squad. A round fired a moment before the crowd sped up therefore
    // reaches slightly further in world terms, which is correct — it is still
    // on screen, and still short of the top.
    if (b.life <= 0 || b.y > anchorY + BULLET_RANGE || Math.abs(b.x) > LANE_HALF + 1) {
      bullets.splice(i, 1)
      continue
    }
    if (resolveBullet(b)) bullets.splice(i, 1)
  }
}

/** @returns true when the round was consumed. */
const resolveBullet = (b: Bullet): boolean => {
  // Foes first: something standing in front of a gate should absorb the fire
  // aimed at it, which is what makes escorts and packs a real obstacle.
  for (const f of foes) {
    if (f.dead) continue
    const dy = f.y - b.y
    if (dy < -0.6 || dy > 1.1) continue
    if (Math.abs(f.x - b.x) > 0.44 * f.scale + BULLET_R) continue
    damageFoe(f, b.damage)
    pushFx({ kind: 'hit', x: b.x, y: b.y, on: 'foe' })
    return true
  }

  for (const c of crates) {
    if (c.dead) continue
    const dy = c.y - b.y
    if (dy < -CRATE_R || dy > CRATE_R + 0.4) continue
    if (Math.abs(c.x - b.x) > CRATE_R + BULLET_R) continue
    c.hp -= b.damage
    pushFx({ kind: 'hit', x: b.x, y: b.y, on: 'crate' })
    if (c.hp <= 0) breakCrate(c)
    return true
  }

  for (const bar of barricades) {
    if (bar.dead) continue
    const dy = bar.y - b.y
    if (dy < -BARRICADE_H / 2 || dy > BARRICADE_H / 2 + 0.4) continue
    if (Math.abs(bar.x - b.x) > bar.w / 2 + BULLET_R) continue
    bar.hp -= b.damage
    bar.flash = 1
    pushFx({ kind: 'hit', x: b.x, y: b.y, on: 'barricade' })
    if (bar.hp <= 0) {
      bar.dead = true
      pushFx({ kind: 'barricadeBreak', x: bar.x, y: bar.y })
      spillCoins(bar.x, bar.y, BARRICADE_COIN_MIN, BARRICADE_COIN_MAX)
    }
    return true
  }

  // Gate dividers eat rounds. Sitting in the middle of the lane therefore
  // charges NOTHING — indecision costs the player the pump as well as the
  // survivors it will cost them a second later.
  for (const d of dividers) {
    if (d.dismissed) continue
    const dy = d.y - b.y
    if (dy < -DIVIDER_H / 2 || dy > DIVIDER_H / 2 + 0.4) continue
    if (Math.abs(d.x - b.x) > d.halfW + BULLET_R) continue
    pushFx({ kind: 'hit', x: b.x, y: b.y, on: 'barricade' })
    return true
  }

  // ─── Gates do NOT stop rounds ─────────────────────────────────────────────
  //
  // Everything above is solid and eats the bullet. A gate is not: it is an open
  // doorway with a curtain hanging in it, and the round goes through.
  //
  // This started as a placement complaint and turned out to be a rule problem.
  // Minibosses arrive shortly after a bank, and while a gate ate every round
  // the player could not begin the fight until they were through the door — by
  // which time the elite was already on top of them, closing at the sum of both
  // speeds. The elite was not a fight, it was a wall with a health bar. Nudging
  // it further up the road only trades one bad beat for a longer empty one; the
  // honest fix is to stop pretending a doorway is armour.
  //
  // What it does NOT change is the pump. Charge is time-based, so shooting a
  // gate still costs the player the SECONDS they spend aimed at it — which is
  // the only currency the gate ever charged. What they get back is the right to
  // start shooting what is behind it, which is what the moment always looked
  // like it should do.
  for (const g of gates) {
    if (g.used) continue
    const dy = g.y - b.y
    if (dy < -GATE_DEPTH || dy > GATE_DEPTH + 0.5) continue
    if (Math.abs(g.x - b.x) > g.halfW) continue
    if (
      (g.op === 'add' && g.value < GATE_MAX_VALUE) ||
      (g.op === 'sub' && g.value < GATE_SUB_MAX)
    ) {
      // One tick per half second of sustained fire, exactly as promised on the
      // tin. That keeps a gate worth the same to a squad of five and a squad of
      // fifty — it is a decision about time, not a DPS check. A `-N` leaf is
      // the same clock running the other way.
      g.hotFor = 0
    }
    // The curtain sparks once per round rather than once per frame: a doorway
    // is ~0.9 units deep and a round crosses it over several frames, so without
    // this the FX budget for one gate is an order of magnitude out.
    if (b.pierced !== g.id) {
      b.pierced = g.id
      pushFx({ kind: 'hit', x: b.x, y: b.y, on: 'gate' })
    }
    break
  }

  if (boss && !boss.dead) {
    const dy = boss.y - b.y
    if (dy > -1.2 && dy < 1.6 && Math.abs(boss.x - b.x) < 1.1 * boss.scale) {
      // A guarded boss still EATS the bullet — it flashes, it sparks, the
      // player's fire is visibly landing and visibly doing nothing. Letting the
      // round pass through would read as a hitbox bug rather than as a phase.
      if (boss.guard > 0) {
        boss.flash = 1
        pushFx({ kind: 'bossGuard', x: b.x, y: b.y })
        return true
      }
      damageBoss(boss, b.damage)
      pushFx({ kind: 'bossHit', x: b.x, y: b.y })
      return true
    }
  }
  return false
}

/**
 * The ONLY writer of `runFireRate`.
 *
 * Every value is clamped into the legal band and any non-finite input falls
 * back to the base rate. A `NaN` here does not stay here: it multiplies into
 * the shot budget, so the squad silently stops firing, and it renders straight
 * into the HUD pill as the word "NaN" — a bug the player sees before anyone
 * else does. One choke point makes that unrepresentable.
 */
const setFireRate = (v: number): void => {
  // `NaN` is the only genuinely meaningless input — it has no ordering, so it
  // cannot be clamped, and it has to fall back. An infinity is just a very
  // large number and clamps like any other.
  if (Number.isNaN(v)) {
    runFireRate.value = BASE_FIRE_RATE
    return
  }
  runFireRate.value = Math.max(0.1, Math.min(MAX_FIRE_RATE, v))
}

const breakCrate = (c: Crate): void => {
  c.dead = true
  if (c.kind === 'rate') {
    // The only way fire rate rises during a run. Capped so a crate-rich stage
    // cannot outrun the bullet budget.
    setFireRate(runFireRate.value + CRATE_RATE_GAIN)
    pushFx({
      kind: 'crateBreak', x: c.x, y: c.y, crate: 'rate',
      value: Math.round(runFireRate.value * 10) / 10
    })
  } else {
    damage.value += CRATE_DAMAGE_GAIN
    pushFx({ kind: 'crateBreak', x: c.x, y: c.y, crate: 'damage', value: damage.value })
  }
  for (const u of units) u.flash = 220
}

const damageFoe = (f: Foe, amount: number): void => {
  f.hp -= amount
  f.flash = 1
  if (f.elite) eliteHp01.value = Math.max(0, f.hp / f.maxHp)
  if (f.hp > 0) return
  f.dead = true
  kills.value++
  const def = foeDef(f.typeId)
  const coins = f.elite ? def.coins * 8 : def.coins
  runCoins.value += coins
  if (f.elite) pushFx({ kind: 'eliteDie', x: f.x, y: f.y })
  else pushFx({ kind: 'foeDie', x: f.x, y: f.y, big: def.scale > 1.1 })
  pushFx({ kind: 'coin', x: f.x, y: f.y, value: coins })
}

/**
 * Gate charge, gate crossing, gate payoff.
 *
 * Two independent things happen here and they are kept apart on purpose:
 *
 *   CHARGING  — a gate that took fire this frame accumulates time. Every
 *               `GATE_TICK_MS` of it, the number goes up by one and the world
 *               gets a `gateTick` event (a sound, a burst, a punch on the
 *               number). Stop shooting for 400 ms and the part-charge is lost,
 *               so "sustained" means sustained. Only `add` leaves pump.
 *
 *   CROSSING  — when the crowd's centre passes the gate's line, every leaf is
 *               scored by the survivors INSIDE ITS OWN WIDTH. There is a lethal
 *               pillar between the leaves, so taking two at once is not a
 *               strategy — it is a funeral. `div` leaves KILL the fraction of
 *               the crowd that walked into them, which is what makes a bank a
 *               decision instead of a formality.
 */
const stepGates = (dt: number): void => {
  firingAtGate = false

  for (let i = gates.length - 1; i >= 0; i--) {
    const g = gates[i]!

    // Cull gates the crowd has left well behind.
    if (g.y < anchorY - 6) {
      gates.splice(i, 1)
      continue
    }
    if (g.pop > 0) g.pop = Math.max(0, g.pop - dt * 3.6)
    g.hotFor += dt

    if (g.used) continue

    // `sub` pumps on exactly the same clock as `add`, and that is the whole
    // idea: the crowd fires forward whether the player wants it to or not, so
    // sitting in front of a `-N` is a cost the player pays for not having aimed
    // somewhere else. `firingAtGate` is NOT set for it — that flag drives the
    // "you are pumping something" feedback, and a player making a mistake
    // should not be told they are earning.
    const pumpCap = g.op === 'sub' ? GATE_SUB_MAX : GATE_MAX_VALUE
    if (g.hotFor < 0.4 && (g.op === 'add' || g.op === 'sub')) {
      if (g.op === 'add') firingAtGate = true
      g.charge += dt * 1000
      while (g.charge >= GATE_TICK_MS && g.value < pumpCap) {
        g.charge -= GATE_TICK_MS
        g.value++
        g.pop = 1
        pushFx({ kind: 'gateTick', x: g.x, y: g.y, value: g.value, hostile: g.op === 'sub' })
      }
    } else if (g.hotFor >= 0.4) {
      g.charge = 0
    }

    if (anchorY < g.y) continue

    // ── Crossing ──
    // The whole BANK resolves at once — see `claimBank`. Leaves are marked
    // `used` there, so reaching this line means this leaf's bank has not been
    // resolved yet.
    claimBank(g.bankId)
    continue
  }
}

/**
 * Resolve one bank: the crowd goes through exactly ONE door.
 *
 * "The player can still only pass through 1 gate at a time" is the rule, and it
 * is what makes a bank a decision instead of a shopping list. The leaf holding
 * the most survivors wins the bank outright and pays in full; every other leaf
 * is destroyed on the spot, along with the pillars between them.
 *
 * Deciding by HEAD COUNT rather than by the anchor matters at the edges: a
 * player who is still sliding when the line arrives gets the door most of their
 * crowd is actually in, which is what they can see, rather than the one the
 * invisible centre point happened to be over.
 */
/**
 * Destroy every offer the player did not take.
 *
 * Called AFTER the payout event is queued, and that ordering is load-bearing:
 * `distance` is unsigned, so the renderer locates the blast origin from the
 * `gatePass` in the same drained batch. A dismissal that arrived first would
 * have nothing to travel away from.
 */
const dismissLosers = (leaves: Gate[], winner: Gate): void => {
  for (const leaf of leaves) {
    if (leaf === winner) continue
    leaf.dismissed = true
    pushFx({
      kind: 'gateDismiss',
      x: leaf.x,
      y: leaf.y,
      halfW: leaf.halfW,
      op: leaf.op,
      value: leaf.value,
      // How far the shockwave has to travel from the door that was taken —
      // what turns a three-leaf bank into a left-to-right cascade.
      distance: Math.abs(leaf.x - winner.x)
    })
  }
}

const claimBank = (bankId: number): void => {
  const leaves = gates.filter((g) => g.bankId === bankId && !g.used)
  if (leaves.length === 0) return

  let winner: Gate | null = null
  let best = -1

  const counts = new Map<number, Unit[]>()
  for (const leaf of leaves) {
    const inside: Unit[] = []
    for (const u of units) {
      if (u.dying > 0) continue
      if (Math.abs(u.x - leaf.x) <= leaf.halfW) inside.push(u)
    }
    counts.set(leaf.id, inside)
    // Ties break toward the leaf the crowd's centre is nearest to, so a dead
    // heat still resolves the way the player was steering.
    const score = inside.length - Math.abs(anchorX - leaf.x) * 0.001
    if (score > best) { best = score; winner = leaf }
  }

  for (const leaf of leaves) leaf.used = true
  // The pillars belong to the bank and go with it — but they are MARKED rather
  // than deleted, so the renderer can topple them as part of the cascade. From
  // this instant they are scenery: `stepDividers` stops billing anyone who
  // touches one, because the decision they were enforcing has been made.
  for (const d of dividers) {
    if (d.bankId === bankId) d.dismissed = true
  }

  if (!winner) return
  const inside = counts.get(winner.id) ?? []

  // Nobody made it through ANY door — the crowd was on a pillar, or dead. Then
  // there is no winner to speak of and every leaf blows up, rather than one of
  // them silently popping out of existence with no payout and no explanation.
  if (inside.length === 0) {
    for (const leaf of leaves) {
      leaf.dismissed = true
      pushFx({
        kind: 'gateDismiss',
        x: leaf.x, y: leaf.y, halfW: leaf.halfW,
        op: leaf.op, value: leaf.value,
        distance: Math.abs(leaf.x - anchorX)
      })
    }
    return
  }

  if (winner.op === 'div' || winner.op === 'sub') {
    // The two hostile doors, resolved together because they differ only in how
    // the bill is worked out: `÷N` keeps a FRACTION of whoever came through,
    // `-N` takes a COUNT off the top. That difference is the entire decision
    // when they are offered side by side — a division is cheap for a small
    // crowd and ruinous for a big one, and a subtraction is exactly the other
    // way round.
    const keep = winner.op === 'div'
      ? Math.max(0, Math.floor(inside.length / Math.max(2, winner.value)))
      : Math.max(0, inside.length - Math.max(1, Math.round(winner.value)))
    // The bite is a contact channel too — a stuck player keeps more of the
    // crowd they walked in with.
    const toKill = Math.round((inside.length - keep) * contactRelief)
    for (let k = 0; k < toKill; k++) killUnit(inside[k]!, Math.sign(inside[k]!.x - winner.x), 'trap')
    timeScaleTarget = Math.min(timeScaleTarget, 0.5)
    pushFx({
      kind: 'gatePass', x: winner.x, y: winner.y, op: winner.op, value: winner.value, gain: -toKill
    })
    dismissLosers(leaves, winner)
    return
  }

  // The winning door pays IN FULL. There is no share to split any more: one
  // bank, one door, one payout — and the pillars have already billed anyone who
  // tried to hedge.
  // The Squad track buys a share of what every door pays — the only currency
  // that holds its value once the crowd is built on the road rather than in the
  // shop. Multipliers are left alone: they already scale with the crowd.
  const gain = winner.op === 'add'
    ? Math.round(winner.value * gatePayoutBonus.value)
    : Math.round(inside.length * (winner.value - 1))
  if (gain <= 0) {
    dismissLosers(leaves, winner)
    return
  }

  // Slow the world down for a beat. It is a cheap trick and it works every
  // time: the crowd doubling is the payoff of the last four seconds, and at
  // full speed it is over before the eye can register it.
  timeScaleTarget = Math.min(timeScaleTarget, 0.45)

  const room = MAX_SQUAD - squadCount.value
  const spawned = Math.max(0, Math.min(gain, room))
  for (let k = 0; k < spawned; k++) {
    // New arrivals appear AT the winning leaf and are pulled into formation by
    // the normal spring, so the crowd visibly swells from the gate outwards.
    spawnUnit(
      winner.x + (Math.random() - 0.5) * winner.halfW * 1.4,
      winner.y + 0.3 + Math.random() * 0.8
    )
  }
  pushFx({
    kind: 'gatePass', x: winner.x, y: winner.y, op: winner.op, value: winner.value, gain: spawned
  })
  dismissLosers(leaves, winner)
}

/**
 * The pillars between gate leaves.
 *
 * Pure geometry and absolutely lethal: anything that touches one dies. This is
 * the enforcement mechanism for "choose a side" — without it the optimal play
 * is always to straddle the middle and collect both leaves, and the bank stops
 * being a decision.
 */
const stepDividers = (dt: number): void => {
  for (let i = dividers.length - 1; i >= 0; i--) {
    const d = dividers[i]!
    if (d.y < anchorY - 6) {
      dividers.splice(i, 1)
      continue
    }
    if (d.y > anchorY + 6) continue
    // Claimed banks leave inert pillars behind for the length of their
    // teardown. They are on screen; they are not lethal.
    if (d.dismissed) continue

    // The steepest crush rate in the game: a pillar is a narrow thing that the
    // player was told to avoid, and hitting one dead-centre should hurt more
    // than a wall you could not have gone around.
    const hit = crushAgainst(d.id, {
      x: d.x, halfW: d.halfW, y: d.y, halfH: DIVIDER_H / 2,
      cause: 'divider', fraction: 0.35
    }, dt)
    if (hit) pushFx({ kind: 'divider', x: d.x, y: d.y })
  }
}

/** Foes walk down the lane, drift toward the crowd, and bite what they reach. */
const stepFoes = (dt: number): void => {
  let anyElite = false
  for (let i = foes.length - 1; i >= 0; i--) {
    const f = foes[i]!
    if (f.flash > 0) f.flash = Math.max(0, f.flash - dt * 4)

    if (f.dead || f.y < anchorY - 8) {
      foes.splice(i, 1)
      continue
    }
    if (f.elite) {
      anyElite = true
      eliteHp01.value = Math.max(0, f.hp / f.maxHp)
    }
    if (f.y > anchorY + LOOKAHEAD + 6) continue

    f.phase += dt
    // An elite that has arrived PLANTS and tracks the crowd instead of walking
    // through it — see `ELITE_HOLD_AHEAD`. Everything else walks down the lane.
    // The hold is spent only while it is actually holding, so a long walk in
    // never eats the fight, and it ends the moment the arena does: nothing
    // should be chasing the player into the boss.
    // The hold starts when the crowd arrives, not when the elite spawns: the
    // walk in is not the fight, and spending the leash on an empty road is how
    // an elite would break off before the player ever reached it.
    const engaged = f.elite && f.hold > 0 && phase.value === 'run'
      && f.y - anchorY <= ELITE_HOLD_AHEAD + 0.35
    if (engaged) {
      f.hold -= dt
      // It gives no ground and takes none. `stepAnchor` stops the crowd at
      // `ELITE_HOLD_AHEAD` in front of it, so this pins the fight's geometry:
      // the elite is always exactly in the firing line, and always in reach of
      // the crowd's leading edge and nothing deeper.
    } else {
      f.y -= f.speed * dt
    }
    // Home in on the crowd, but lazily — a foe that tracks perfectly is
    // unavoidable, and unavoidable is not the same as difficult.
    const homing = f.flying ? 1.5 : 0.9
    f.x += Math.max(-homing * dt, Math.min(homing * dt, (anchorX - f.x) * dt * 0.9))
    if (f.flying) f.x += Math.sin(clock / 700 + f.swayPhase) * dt * 1.1
    f.x = Math.max(-LANE_HALF + 0.3, Math.min(LANE_HALF - 0.3, f.x))

    // ─── The sweep ────────────────────────────────────────────────────────
    //
    // An elite that has closed on the crowd winds up for a third of a second
    // and then swings an arc across the whole road, taking a FIFTH of the squad
    // with it. This is the reason the block is worth having: the player is
    // pinned in front of something that is costing them a fifth of everything
    // they own every second and a half, and the only answer is to kill it.
    //
    // Deliberately NOT the boss's move. The boss aims at a patch of ground and
    // is beaten by moving; this crosses the lane and is beaten by damage. The
    // two are the game's two questions — "where are you standing" and "how hard
    // do you hit" — and the elite is where the second one gets asked.
    //
    // Range-gated on the elite being in the fight, because a lane-wide,
    // undodgeable hit thrown from off-screen would be a tax with no author. It
    // reaches `ELITE_SWEEP_REACH` down the road from its own feet, which is the
    // distance it is drawn at.
    const sweepGap = f.y - anchorY
    if (f.elite && !f.dead && phase.value === 'run' && sweepGap < ELITE_SWEEP_REACH && sweepGap > -1.5) {
      // The arc's direction is chosen when the WIND-UP starts, not when it
      // lands, so the telegraph can show which way it is coming from. A tell
      // that only becomes true on impact is not a tell.
      const winding = f.sweepCd <= ELITE_TELEGRAPH
      f.sweepCd -= dt
      if (!winding && f.sweepCd <= ELITE_TELEGRAPH) f.sweepDir = -f.sweepDir
      if (f.sweepCd <= 0) {
        f.sweepSpan = ELITE_SWEEP_CD
        f.sweepCd = f.sweepSpan
        // A light body throws itself along the arc; a heavy one plants and
        // turns. Same event, and the sim owns it, so the lunge and the hit can
        // never disagree.
        //
        // SIDEWAYS ONLY. A lunge that also closed the gap would drag the elite
        // inside its own hold distance, and `stepAnchor` clamps the crowd to
        // that distance — so the crowd would be shoved backwards down the road
        // by an attack, which is both bad feel and a way to lose ground the
        // player already paid for.
        if (f.speed > 1.6) f.x += (anchorX - f.x) * ELITE_LUNGE
        pushFx({
          kind: 'eliteSweep', x: f.x, y: f.y, reach: ELITE_SWEEP_REACH,
          dir: f.sweepDir, heavy: f.speed <= 1.6
        })
        // The same relief that softens the boss's slam softens this, and for
        // the same reason: it is the same kind of loss — an announced hit that
        // a stuck player is failing to answer.
        //
        // A fifth of the CURRENT squad, counted off the front rank inward. No
        // radius test: the arc spans the road, and a survivor's x has nothing
        // to say about whether it reached them. Sorting by depth is what makes
        // the loss legible — the crowd is eaten from the end nearest the thing
        // eating it, not hollowed out at random.
        let budget = Math.max(1, Math.ceil(squadCount.value * ELITE_SWEEP_FRACTION * slamRelief))
        const reachable: Unit[] = []
        for (const u of units) {
          if (u.dying > 0) continue
          if (f.y - u.y > ELITE_SWEEP_REACH) continue
          reachable.push(u)
        }
        reachable.sort((a, b) => b.y - a.y)
        for (const u of reachable) {
          if (budget <= 0) break
          killUnit(u, f.sweepDir, 'elite')
          budget--
        }
      }
    }

    f.biteCd -= dt
    if (f.biteCd > 0) continue
    // Same guard as the obstacles: a foe that is not within biting distance of
    // the crowd's own disc never looks at a single survivor.
    if (!nearCrowd(f.x, f.y, FOE_REACH + UNIT_R + (f.elite ? 0.9 : 0))) continue

    // Bite whatever survivors are in reach. A miniboss reaches further, because
    // its body is bigger — a foe you can walk past is not a wall.
    const reach = FOE_REACH + UNIT_R + (f.elite ? 0.9 : 0)
    const reach2 = reach * reach
    // The flat cost, or a share of the crowd, whichever hurts more. See
    // `biteShareFor`: the flat number owns the early game where it was
    // authored, and the share is what stops a thousand-strong squad from
    // walking through the same monster unharmed. Only the SHARE eases for a
    // player who is stuck — the archetype's own bite is the game's identity and
    // does not get quietly turned down.
    const want = Math.max(f.bite, Math.ceil(squadCount.value * f.biteShare * contactRelief))
    let eaten = 0
    let bit = false
    for (const u of units) {
      if (eaten >= want) break
      if (u.dying > 0) continue
      const dx = u.x - f.x
      const dy = u.y - f.y
      if (dx * dx + dy * dy > reach2) continue
      killUnit(u, Math.sign(u.x - f.x), f.elite ? 'elite' : 'foe')
      eaten++
      bit = true
    }
    if (bit) f.biteCd = foeDef(f.typeId).biteCd
  }
  eliteAlive.value = anyElite
  if (!anyElite) eliteHp01.value = 0
}

/**
 * Barricades are pure geometry: they do not act, they are simply THERE.
 *
 * Anything that walks into a live one dies — no quota, no grace. There is
 * always a gap in the row (the generator guarantees it), so a barricade is a
 * routing problem that can *optionally* be solved with bullets, and driving
 * straight into one is a decision the player made.
 */
const stepBarricades = (dt: number): void => {
  for (let i = barricades.length - 1; i >= 0; i--) {
    const bar = barricades[i]!
    if (bar.flash > 0) bar.flash = Math.max(0, bar.flash - dt * 5)
    if (bar.dead || bar.y < anchorY - 6) {
      barricades.splice(i, 1)
      continue
    }
    if (bar.y > anchorY + 6) continue

    crushAgainst(bar.id, {
      x: bar.x, halfW: bar.w / 2, y: bar.y, halfH: BARRICADE_H / 2,
      cause: 'barricade', fraction: 0.22
    }, dt)
  }
}

/**
 * Crates are obstacles too.
 *
 * An unbroken crate kills whoever runs into it, which turns "should I detour
 * for the rate crate?" into a real question: you either shoot it down in time
 * or you go around it. Previously they were scenery you could walk through,
 * and a free stat nobody had to earn.
 */
const stepCrates = (dt: number): void => {
  for (let i = crates.length - 1; i >= 0; i--) {
    const c = crates[i]!
    c.spin += dt * 0.4
    if (c.dead || c.y < anchorY - 6) {
      crates.splice(i, 1)
      continue
    }
    if (c.y > anchorY + 6) continue

    // The gentlest of the three: a crate is a REWARD the player was invited to
    // chase, and one that punished the attempt as hard as a wall would simply
    // teach them to stop chasing rewards.
    crushAgainst(c.id, {
      x: c.x, halfW: CRATE_R, y: c.y, halfH: CRATE_R,
      cause: 'crate', fraction: 0.12
    }, dt)
  }
}

/**
 * Scatter loose coins where something broke.
 *
 * They land as real pickups rather than being credited directly, so the drop
 * has to be *collected* — which is the whole point now that the magnet is short
 * (see `COIN_MAGNET_BASE`). Shooting a wall down and then driving around the
 * debris should leave money on the road.
 */
const spillCoins = (x: number, y: number, min: number, max: number): void => {
  const n = min + Math.floor(Math.random() * (max - min + 1))
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6
    pickups.push({
      id: entityId++,
      // Spread just wide enough to read as a scatter and stay inside the lane.
      x: Math.max(-LANE_HALF + 0.4, Math.min(LANE_HALF - 0.4, x + Math.cos(a) * (0.4 + Math.random() * 0.5))),
      y: y + Math.sin(a) * (0.3 + Math.random() * 0.4),
      value: 1,
      taken: false,
      phase: Math.random() * Math.PI * 2
    })
  }
}

/**
 * Coins.
 *
 * The magnet is bought, not given. It used to reach `crowdRadius + 3.6`, which
 * on a nine-unit lane is most of the road: every coin on the stage arrived no
 * matter where the crowd stood, and the curved trails the generator lays down
 * were scenery. Now the base reach sits just outside the crowd's own body — the
 * player drives the trail — and `coinMagnetBonus` is what the Scavenging track
 * actually sells. See its note in `useUpgrades`.
 */
const stepPickups = (dt: number): void => {
  const magnet = crowdRadius() + COIN_MAGNET_BASE + coinMagnetBonus.value
  // The pull field extends past the collection radius so a coin that is going
  // to be taken visibly leaps at the crowd first. Scaled with the magnet, so an
  // upgraded player sees their reach as well as banking it.
  const reach = magnet + COIN_PULL_LEAD + coinMagnetBonus.value * 0.5
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]!
    p.phase += dt * 4
    if (p.taken || p.y < anchorY - 5) {
      pickups.splice(i, 1)
      continue
    }
    const dx = anchorX - p.x
    const dy = anchorY - p.y
    const d = Math.hypot(dx, dy)
    if (d > reach) continue
    // Coins are pulled in rather than collided with. A near-miss that snaps
    // into the crowd feels generous; a near-miss that does nothing feels like
    // the game cheated you.
    const pull = Math.min(1, (reach - d) / Math.max(0.5, reach - magnet)) * 9 * dt
    p.x += dx * pull * 0.4
    p.y += dy * pull * 0.4
    if (d < magnet) {
      p.taken = true
      runCoins.value += p.value
      pushFx({ kind: 'coin', x: p.x, y: p.y, value: p.value })
    }
  }
}

/**
 * The boss.
 *
 * One body, one telegraph, one punish. It walks in, holds just ahead of the
 * crowd, and every couple of seconds it SLAMS — but it slams where the CROWD
 * IS, not where it is standing. The target is locked when the telegraph starts
 * (`SLAM_TELEGRAPH` seconds before impact) and drawn as a closing ring, so the
 * fight is a dodge with a fair warning rather than a coin toss.
 *
 * The previous version slammed under its own feet, four units ahead of a crowd
 * whose radius is under two — so the attack literally could not reach anybody
 * and the boss fight was a damage race with no failure state.
 */
/**
 * How long the slam is telegraphed before it lands.
 *
 * 1.0 s, not the 0.62 first shipped, and the reason is a measurement rather
 * than a feeling. Holding routing and aim constant and moving ONLY the player's
 * reaction latency, stage 2 clear rate went 100 % at 150 ms and 0 % at 250 ms —
 * and median human simple visual reaction time is ~250 ms. The telegraph was
 * tuned to just past the point a human can use it, so the boss was not a skill
 * test, it was a reflex threshold.
 *
 * The dodge is a 3.4-unit move (`SLAM_RADIUS` + `CROWD_MAX_R`). At 0.62 s a
 * 250 ms player had 0.37 s to make it; at 1.0 s they have 0.75 s — the margin a
 * 150 ms player used to have to themselves.
 */
export const SLAM_TELEGRAPH = 1.0
/**
 * Slam footprint.
 *
 * MUST stay well under the crowd's own radius (1.9). At 2.9 the ring covered
 * the entire squad, so every slam that connected was a total wipe and the boss
 * fight had exactly two outcomes: kill it before it swings twice, or lose
 * everything. Measured across stages 1–5 with a non-dodging player: 21–51
 * survivors lost to a single slam, every run, on every stage.
 *
 * It lives in `survival.ts` with the rest of the slam numbers because the
 * telegraph ring has to be drawn from the same value the kill is measured
 * against — see `SLAM_RADIUS_GROWTH`.
 */
/**
 * And a hard ceiling on top of the geometry: one slam may never take more than
 * this fraction of the squad. A small crowd is entirely inside ANY radius, so
 * without the cap the boss one-shots exactly the players who most need the
 * fight to last long enough to learn it.
 *
 * The history: 0.35 first, which wiped a squad in three hits and made the fight
 * a coin flip; then 0.22, which measured as taking "only ~1/5 of all units".
 * 0.31 is that number 40 % higher — a missed dodge now costs most of a third of
 * the crowd. The telegraph is a full second long, so the cost lands squarely on
 * the player who did not read it rather than on the one who could not.
 */
const SLAM_MAX_FRACTION = 0.31
/** How far ahead of the crowd the boss plants itself. Close enough that its
 *  slam reaches, far enough that its body never covers the crowd. */
const BOSS_HOLD_AHEAD = 3.8

const stepBoss = (dt: number): void => {
  const b = boss
  if (!b) return
  if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 4)
  b.phase += dt

  if (b.dead) {
    b.dying += dt * 1000
    if (b.dying > 900 && phase.value === 'boss') finishRun(true)
    return
  }

  // Walk into the arena, then hold the line just ahead of the crowd. A guarded
  // boss is planted — it has stopped chasing and is committing to the swing.
  if (b.guard <= 0) {
    const holdY = anchorY + BOSS_HOLD_AHEAD
    if (b.y > holdY) b.y = Math.max(holdY, b.y - b.speed * dt)
    else b.y += (holdY - b.y) * Math.min(1, dt * 1.4)

    // Track the crowd slowly — slowly enough that a player who keeps moving is
    // never cornered, which is the skill the fight tests.
    b.x += Math.max(-1.1 * dt, Math.min(1.1 * dt, (anchorX - b.x) * dt * 1.6))
    b.x = Math.max(-LANE_HALF + 1, Math.min(LANE_HALF - 1, b.x))
  }

  b.slamCd -= dt

  // Lock the target at the START of the telegraph, on the crowd's own position
  // plus a small lead. Locking early is what makes it dodgeable; aiming at the
  // crowd rather than at the boss's feet is what makes it hit.
  //
  // Asked as "have I aimed for this swing yet", NOT as "did the cooldown just
  // cross the telegraph" — see `Boss.aimed`. The crossing stops happening once
  // rage pulls the cadence below the window, and the boss then spends the rest
  // of the fight slamming the last place it aimed at.
  if (!b.aimed && b.slamCd <= SLAM_TELEGRAPH) {
    b.aimed = true
    b.slamX = Math.max(-LANE_HALF + 1, Math.min(LANE_HALF - 1, anchorX + (targetX - anchorX) * 0.35))
    b.slamY = anchorY
  }

  if (b.slamCd > 0) return

  // Rage: every swing thrown brings the next one closer and widens it, down to
  // `SLAM_CD_MIN`. A squad that arrived big enough kills the boss in three or
  // four swings and never meets this; a squad that arrived too small is now in
  // a fight that is actively getting worse, which is the difference between
  // "slow" and "losing". The guard swing itself is free — the boss does not get
  // to rage on a phase it was handed.
  b.slams++
  b.slamSpan = Math.max(SLAM_CD_MIN, SLAM_CD_BASE - b.slams * SLAM_CD_DECAY)
  b.slamCd = b.slamSpan
  // This swing is spent; the next one has to pick its own target. When rage has
  // pulled the cadence under the telegraph window this re-aims on the very next
  // frame, which is correct — a boss swinging faster than it can wind up is
  // simply always winding up.
  b.aimed = false
  const radius = Math.min(SLAM_RADIUS_MAX, SLAM_RADIUS + b.slams * SLAM_RADIUS_GROWTH)
  b.guard = 0

  pushFx({ kind: 'bossSlam', x: b.slamX, y: b.slamY, radius })
  // The retry relief scales the SLAM as well as enemy health. Health alone did
  // nothing measurable — 14 of 15 simulated retries moved the clear rate by
  // exactly zero — because 68–80 % of a failing run's losses are slams, which
  // no amount of enemy HP relief ever touches.
  const slamShare = SLAM_MAX_FRACTION * slamRelief
  let budget = Math.max(1, Math.ceil(squadCount.value * slamShare))
  for (const u of units) {
    if (budget <= 0) break
    if (u.dying > 0) continue
    const dx = u.x - b.slamX
    const dy = u.y - b.slamY
    if (dx * dx + dy * dy > radius * radius) continue
    killUnit(u, Math.sign(dx), 'slam')
    budget--
  }
}

/**
 * The only way the boss loses health — and therefore the only place the guard
 * gates can be enforced.
 *
 * They live HERE rather than in `stepBoss` because a squad of a thousand with
 * upgraded firepower can put more damage into one frame than a whole phase is
 * worth. Checked after the fact, that frame would carry the boss straight past
 * a gate and the phase would never happen; checked here, the damage is CLAMPED
 * at the threshold, the boss plants, and the swing it owes the player is always
 * paid. Overkill is forfeited, which is the point — the gate is a floor on how
 * long the climax lasts, not a tax on damage.
 */
const damageBoss = (b: Boss, amount: number): void => {
  if (b.dead || b.guard > 0) return
  const gate = BOSS_GUARD_GATES[b.guarded]
  const floor = gate === undefined ? 0 : gate * b.maxHp
  b.hp -= amount
  b.flash = 1

  if (gate !== undefined && b.hp <= floor) {
    b.hp = floor
    b.guarded++
    b.guard = 1
    // Start the wind-up now rather than on the old clock: the phase turn IS the
    // telegraph, so the player gets the full second from the moment they see it.
    b.slamCd = SLAM_TELEGRAPH
    b.slamSpan = SLAM_TELEGRAPH
    b.slamX = anchorX
    b.slamY = anchorY
    // The guard picks its own target, here, at the moment the phase turns —
    // so `stepBoss` must not re-aim it a frame later on stale input.
    b.aimed = true
    slowHoldMs = 320
    pushFx({ kind: 'bossRage', x: b.x, y: b.y, stage: b.guarded })
  }

  bossHp01.value = Math.max(0, b.hp / b.maxHp)
  if (b.hp <= 0) killBoss()
}

const killBoss = (): void => {
  if (!boss || boss.dead) return
  boss.dead = true
  boss.dying = 0
  bossHp01.value = 0
  kills.value++
  timeScaleTarget = 0.35
  pushFx({ kind: 'bossDie', x: boss.x, y: boss.y })
}

// ─── Dev handles ────────────────────────────────────────────────────────────
//
// Reached only through `useCheats` (which self-gates on `localStorage.cheat`),
// through the console handle it publishes, and by the balance harness in
// `tests/sim`. Kept here rather than in the cheat module so they go through the
// same spawn path the game does.

export const debugAddUnits = (n: number): void => {
  for (let i = 0; i < n; i++) {
    spawnUnit(anchorX + (Math.random() - 0.5) * 2, anchorY + (Math.random() - 0.5) * 2)
  }
}

export const debugAddDamage = (n: number): void => { damage.value += n }
export const debugAddFireRate = (n: number): void => setFireRate(runFireRate.value + n)

/** Test-only: wipe both the world and the persisted failure record. */
export const __resetForTest = (): void => {
  resetWorld()
  squadCount.value = 0
  phase.value = 'run'
}

export default {
  stage, phase, squadCount, damage, runFireRate, runCoins, progress01, bossHp01,
  peakSquad, kills, bestStage, bestSquad, eliteAlive, eliteHp01, reliefActive,
  startStage, advanceStage, retryStage, step, steerTo, steerBy, runSummary
}
