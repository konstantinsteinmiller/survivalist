/**
 * ─── The seeded board, for the portals that can never gain a player ─────────
 *
 * Poki forbids every external runtime request and Yandex rejects third-party
 * storage URLs, so those builds ship `VITE_LEADERBOARD_URL` empty: they cannot
 * READ the board and, more to the point here, they can never WRITE to it. Their
 * baked copy is not a stale snapshot of a living board — it is the whole board,
 * for the life of the build, and nobody playing it will ever appear on it.
 *
 * Seeding it from the live board does not work either, and the arithmetic is the
 * reason. The live board is 2 422 players of whom 56 % never got past stage 2
 * and 1.5 % passed stage 20, because it is a record of everyone who ever opened
 * the game once. Ranking a Poki player against that says more about the sample
 * than about them.
 *
 * So this generates a board from a stated RETENTION CURVE instead. It is
 * modelled data, and it is written down as modelled data — see `SURVIVAL`.
 *
 * ── Determinism is the point ──
 *
 * Every number below comes out of a seeded PRNG, so re-running this produces a
 * byte-identical file. A board that churned on every run would move every
 * player's rank for no reason, and a rank that moves without the player doing
 * anything is worse than no rank.
 *
 *     pnpm leaderboard:seed
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SEED_FILE = resolve(
  fileURLToPath(new URL('../data/leaderboard-seed.json', import.meta.url))
)

/** How many players the board claims. */
const TOTAL = 7_831

/** Rows the board publishes, matching the Worker's `TOP_N`. */
const TOP_N = 100

/**
 * The retention curve, as `stage → fraction of players whose BEST is ≥ stage`.
 *
 * A survival function rather than a histogram, because that is the shape the
 * design intent is actually stated in — "most quit on 3 and 4", "only ~8 % go
 * past 20" are both statements about how many are still there, and deriving the
 * per-stage counts from them cannot drift out of agreement with them.
 *
 *   1 → 1.000   everyone reaches stage 1
 *   3 → 0.930     7 % gave up on 1-2         "some few on stage 1 and 2"
 *   5 → 0.620    31 % gave up on 3-4         "most players quit on 3 and 4"
 *  11 → 0.250    37 % gave up on 5-10        "most players play till 5-10"
 *  21 → 0.080    17 % gave up on 11-20
 *  44 → 0.00065  the top ~100 of 154 331     "the best players reach 40+"
 *
 * The far tail is anchored on the POPULATION, not chosen for its own sake: the
 * published hundred is the top 0.065 % of 154 331, so wherever the curve crosses
 * that fraction is where the visible board starts. The anchors put it at stage
 * 46, which is what "the best reach 40+" means at this size — at a tenth of the
 * population the same phrasing would want a much shallower tail, so re-check
 * this line before changing `TOTAL`.
 *
 * The anchors between 21 and 30 are close together for one reason: the bands
 * the spec asks for imply a WALL at 20 (17 % of everyone stops in 11-20, and
 * only 8 % are left after it), and a step in the drop-off rate is a step in the
 * histogram. Spread over four anchors the rate steepens gradually instead, and
 * the largest remaining rise between adjacent stages is under 3 % — down from
 * 15 % with a single anchor, where stage 21 visibly held more players than
 * stage 20.
 *
 * Interpolated log-linearly between anchors, which is what makes the middle of
 * a band decay smoothly instead of stepping at the anchors — a histogram with
 * visible steps in it reads as generated the moment anyone plots it.
 */
const SURVIVAL = [
  [1, 1],
  [3, 0.93],
  [5, 0.62],
  [11, 0.25],
  [21, 0.08],
  [23, 0.0625],
  [26, 0.043],
  [30, 0.024],
  [35, 0.0105],
  [40, 0.0038],
  [45, 0.0011],
  [51, 0.00015],
  [57, 0.00002],
  [61, 0]
]

/** Fraction of players still going at `stage`. */
const survival = (stage) => {
  if (stage <= 1) return 1
  for (let i = 0; i < SURVIVAL.length - 1; i++) {
    const [x0, y0] = SURVIVAL[i]
    const [x1, y1] = SURVIVAL[i + 1]
    if (stage < x0 || stage > x1) continue
    const t = (stage - x0) / (x1 - x0)
    // Log-linear, so a constant per-stage drop-off rate is a straight line.
    // Guarded for the final anchor, where the curve reaches zero.
    if (y1 <= 0 || y0 <= 0) return y0 + (y1 - y0) * t
    return y0 * Math.pow(y1 / y0, t)
  }
  return 0
}

/** Deterministic PRNG — mulberry32. Same seed, same board, every run. */
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ─── Names ──────────────────────────────────────────────────────────────────
//
// Shaped to match what the live board actually contains, which is almost
// entirely portal handles (CrazyGames usernames) rather than this game's own
// anonymous mint. Measured on the real top-100: 98 handles, 2 `Word######`.
// `cleanName` caps a name at 16 characters, so every pattern here stays inside
// that or it would be silently truncated somewhere else.

const ADJ = [
  'Juicy', 'Real', 'Brilliant', 'Silent', 'Crimson', 'Rapid', 'Iron', 'Lucky',
  'Neon', 'Frost', 'Wild', 'Grim', 'Golden', 'Shadow', 'Turbo', 'Mad', 'Salty',
  'Cosmic', 'Rusty', 'Velvet', 'Hyper', 'Quiet', 'Feral', 'Prime'
]
const NOUN = [
  'Cloud', 'Milkshake', 'Demon', 'Falcon', 'Comet', 'Badger', 'Wolf', 'Pixel',
  'Rocket', 'Nomad', 'Panda', 'Viper', 'Yeti', 'Gremlin', 'Bishop', 'Otter',
  'Hydra', 'Muffin', 'Raven', 'Goblin', 'Turtle', 'Phantom', 'Bandit', 'Koala'
]
/** The game's own anonymous mint (`usePlayerIdentity.ANON_WORDS`). */
const ANON = [
  'Survivor', 'Runner', 'Scout', 'Nomad', 'Drifter',
  'Ranger', 'Wanderer', 'Strider', 'Trekker', 'Roamer'
]
const SYL_A = ['Ka', 'Hi', 'Zu', 'Mo', 'Ra', 'Ta', 'Ni', 'Vo', 'Sa', 'Yu', 'Le', 'Do']
const SYL_B = ['ze', 'ppi', 'nda', 'rro', 'shi', 'mba', 'kko', 'ven', 'lia', 'gan']
const SYL_C = ['ko', 'riot', 'ssi', 'rashi', 'ra', 'nix', 'dor', 'la', 'thas', 'mi']
const SUFFIX = ['RX', 'y', 'Jbql', 'GG', 'x', 'TV', 'zz', 'Q', 'io', 'kk']

const pick = (r, xs) => xs[Math.floor(r() * xs.length)]

/** One plausible handle, in the proportions the live board shows. */
const mintName = (r) => {
  const roll = r()
  let name
  if (roll < 0.34) {
    name = pick(r, ADJ) + pick(r, NOUN)
  } else if (roll < 0.56) {
    name = `${pick(r, ADJ)}${pick(r, NOUN)}.${pick(r, SUFFIX)}`
  } else if (roll < 0.8) {
    name = pick(r, SYL_A) + pick(r, SYL_B) + pick(r, SYL_C)
  } else if (roll < 0.92) {
    name = (pick(r, SYL_A) + pick(r, SYL_B) + pick(r, SYL_C)).toUpperCase()
  } else {
    // The game's own anonymous mint, at roughly the rate the real board has it.
    name = `${pick(r, ANON)}${100000 + Math.floor(r() * 900000)}`
  }
  // Trimmed to `cleanName`'s own 16-character ceiling, then stripped of any
  // punctuation the cut landed on — "GoldenMilkshake." reads as a bug rather
  // than as a handle.
  return name.slice(0, 16).replace(/[^A-Za-z0-9]+$/, '')
}

// ─── Build ──────────────────────────────────────────────────────────────────

export const buildSeed = () => {
  const r = rng(20260908)

  // Per-stage counts, from the survival curve. `dist` is score-DESC, which is
  // the order every rank walk in the game depends on.
  const maxStage = SURVIVAL[SURVIVAL.length - 1][0]
  const counts = []
  for (let stage = 1; stage <= maxStage; stage++) {
    const n = Math.round(TOTAL * (survival(stage) - survival(stage + 1)))
    if (n > 0) counts.push([stage, n])
  }
  counts.sort((a, b) => b[0] - a[0])

  // Rounding leaves the sum a little off the target; correct it on the biggest
  // bucket, which is the one place a handful of players cannot be noticed.
  const sum = counts.reduce((a, [, n]) => a + n, 0)
  if (sum !== TOTAL) {
    let biggest = 0
    for (let i = 1; i < counts.length; i++) if (counts[i][1] > counts[biggest][1]) biggest = i
    counts[biggest][1] += TOTAL - sum
  }

  // The published rows: walk the histogram from the top, one player per row,
  // so `entries` and `dist` describe the same population by construction. A
  // board whose visible rows disagree with its own histogram would rank its own
  // listed players wrongly.
  const entries = []
  for (const [score, n] of counts) {
    for (let i = 0; i < n && entries.length < TOP_N; i++) {
      entries.push({
        rank: entries.length + 1,
        name: mintName(r),
        score,
        // Squad is only loosely tied to depth on the real board (rank 10 has
        // 4 000, rank 25 has 43), so this is a wide band with a mild upward
        // trend rather than a function of the score.
        //
        // ⚠ THE KEY IS `squad`, which is this game's name for the template's
        // `flair` — and it was still `flair` here while every reader of a board
        // (`useLeaderboard`'s `Number(e.squad) || 0`, the modal's Squad column,
        // the snapshot written from the live Worker) had long been renamed.
        // Nothing failed: the column simply rendered 0 for all hundred rows, on
        // exactly the builds where this file IS the whole leaderboard for the
        // life of the build.
        squad: Math.min(4000, Math.round(120 + score * 34 * (0.35 + r() * 1.5)))
      })
    }
    if (entries.length >= TOP_N) break
  }

  return {
    source: 'seeded:retention-curve',
    fetchedAt: Date.now(),
    updatedAt: Date.now(),
    total: counts.reduce((a, [, n]) => a + n, 0),
    entries,
    dist: counts
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const seed = buildSeed()
  mkdirSync(dirname(SEED_FILE), { recursive: true })
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2) + '\n', 'utf-8')

  const above = (x) => seed.dist.filter(([s]) => s > x).reduce((a, [, n]) => a + n, 0)
  const band = (lo, hi) => seed.dist.filter(([s]) => s >= lo && s <= hi).reduce((a, [, n]) => a + n, 0)
  const pct = (n) => `${((100 * n) / seed.total).toFixed(1)}%`
  console.log(`[seed] ${seed.total} players, top score ${seed.dist[0][0]}, ` +
    `published cut at ${seed.entries[seed.entries.length - 1].score}`)
  console.log(`[seed]   stage 1-2  ${String(band(1, 2)).padStart(6)}  ${pct(band(1, 2))}`)
  console.log(`[seed]   stage 3-4  ${String(band(3, 4)).padStart(6)}  ${pct(band(3, 4))}`)
  console.log(`[seed]   stage 5-10 ${String(band(5, 10)).padStart(6)}  ${pct(band(5, 10))}`)
  console.log(`[seed]   stage 11-20${String(band(11, 20)).padStart(6)}  ${pct(band(11, 20))}`)
  console.log(`[seed]   past 20    ${String(above(20)).padStart(6)}  ${pct(above(20))}`)
  console.log(`[seed] wrote ${SEED_FILE}`)
}
