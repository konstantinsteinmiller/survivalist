# Survivalist

A mobile-first 2D **crowd runner**. You steer one thing — a squad of survivors
that runs up the lane on its own — and everything else follows from where you
point it. Hold the crowd's fire on a `+1` gate and it climbs by one every half
second; run everyone through and the squad explodes in size. Break supply crates
so every survivor hits harder, thread the barricades, and kill the monsters
coming down the lane before they eat anyone. At the end of every stage something
much bigger is waiting.

WIP: [playable demo](https://konstantinsteinmiller.github.io/survivalist/)

Built with Vue 3 + TypeScript + Canvas 2D, shipping to CrazyGames, Playgama,
GamePix, GameMonetize, GameDistribution, Glitch.fun, itch.io, Wavedash and
Yandex Games from one codebase.

---

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # 414 unit, integration + simulation tests
pnpm type-check   # vue-tsc
pnpm build        # type-check + production build
```

## Highlights

* **No art payload.** The survivors and the 13-strong monster cast are
  hand-inked vector art *baked to frame strips at runtime*; the lane, gates,
  crates and effects are Canvas 2D. Nothing gameplay-related ships as a bitmap,
  so the game is interactive the moment the JS parses. Drop-in overrides are
  wired and documented in [`art-todo.md`](./art-todo.md).
* **Synthesised combat audio.** ~46 shots a second would turn any sample into a
  machine-gun jam, so shots, impacts, gate ticks and slams are generated per
  event. The gate tick climbs a **pentatonic ladder** with the gate's value —
  pumping a gate is audibly winding something up. See
  [`sound-todo.md`](./sound-todo.md).
* **One save object.** All persisted state lives in a single in-memory
  `tower_state` record written to exactly one localStorage key, which the
  platform save layer mirrors to the SDK cloud store as one object.
* **Fully responsive.** 320×658 portrait through desktop fullscreen, safe-area
  insets throughout, no fixed pixel sizing in the UI.
* **21 languages**, key-parity enforced by a test.
* **Endless by construction.** Thirty authored stages and then a generator that
  never stops scaling — fourteen knobs that used to plateau between stages 17
  and 34 now keep climbing to stage 300 and past it, and three of the five shop
  tracks have no last level. Locked down by `tests/game/endless.test.ts`.
* **Optional global board.** Deepest stage reached, posted to a Cloudflare
  Worker + D1 (`worker/`). One read per page load, one write only on a personal
  record — and with no endpoint configured the whole feature is simply absent,
  which is how the Yandex build ships.

## How it plays

| Beat | What happens |
|---|---|
| **Learn** | First run only: the road holds still behind a lightbox showing the one control there is — a swiping finger on touch, a gliding pointer on desktop. Nothing to dismiss; it lifts the moment you have actually steered the squad for a second, and never returns. |
| **Steer** | The squad auto-runs forward. Tap where you want it, hold and drag to steer, or use `A`/`D` — `←`/`→`. That is the entire control scheme. |
| **Pump** | Everyone shoots forward automatically. A `+N` gate gains **+1 per 500 ms of sustained fire** (part-charge is lost after 400 ms of silence), shown by the plate's punch, a rising chime and a charge meter. |
| **Choose** | Gates arrive in banks of two — sometimes three — with a **lethal pillar** between each pair. **One bank, one door:** the door holding most of your crowd claims it and pays in full, and every other offer is destroyed in a shockwave cascade that travels outward from the door you took. The crowd squeezes to fit whichever door you aim at and spills out the far side. |
| **Grow** | `+N` pays flat; `×2` / `×3` multiply only the survivors that came through; `÷2` / `÷5` are traps that cut them; **`−N` bills you a flat count**. And `−N` charges exactly like `+N` does — your crowd shoots forward whether you like it or not, so *the door you are aiming at is the door that grows*. Aim at the bill and you buy a bigger bill. |
| **Choose badly** | Some banks have no right answer: **`÷2` beside `−9`**, one pillar between them. A division is cheap when your crowd is small and ruinous when it is big; a subtraction is the reverse. Which door is cheaper depends on the run you are actually having. |
| **Upgrade** | Supply crates give **+1 damage to every survivor** for the rest of the stage. Total DPS is `squad × damage × fire rate`, so crates and gates compound. **Every crate prints its HP and they are not all the same**: a heavy one is out of reach until your squad is bigger, so some boxes are things you walk past now and come back for later. |
| **Hunt** | Monsters **drop coins where they fall**, on top of what they were already worth. You have to drive over them, so the pack in your lane pays and the one you swerved around does not. |
| **Dodge** | Some things cannot be shot at all. **Boulders** eat your rounds and shrug — they come in two ranks with the gaps offset, so you commit to a line and then have to change it. There is no DPS answer, only steering. And there is no forgiveness: **whoever runs into a wall or a stone dies on the spot**, and the rest of the crowd streams past on both sides. Clip an edge and you lose the handful that clipped it; drive the middle of your crowd through and you lose the whole column. |
| **Collide** | Run squarely into a monster and **half the survivors that hit it go down**. The rest bounce off with a few frames where nothing can touch them, so a pack costs you a knock per monster rather than the whole crowd — and a squad with enough guns never lets one get close enough to try. |
| **Survive** | Barricades are numbered HP walls with a guaranteed gap — shoot them down for **2–4 coins** or steer around them; contact kills survivors. Five monster archetypes (creep, husk, hound, brute, flyer) are introduced across stages 1–7. Your fire passes **through** gates, so a doorway never stops you starting a fight — but it only reaches so far: **rounds stop short of the top of the screen**, so anything up there arrives whole and you have to choose what to spend the range on. |
| **Stand** | One or two minibosses per stage **plant themselves and block the road** — and then **sweep it**. A third of a second of wind-up, an arc across the entire lane, and **a fifth of your squad is gone**. Every 1.5 seconds, alternating sides. There is no safe rail and nothing to dodge behind: either your guns kill it or you walk away from the fight with a quarter of the crowd you brought to it. |
| **Commit** | Every third or fourth bank arrives walled: a rib of stone splits the road into one corridor per door. You can see both offers the whole way in — you just have to pick your side before you get there, and once you are in a corridor the other door is behind a wall you cannot shoot. |
| **Boss** | One per stage, slamming **where your crowd is** on a one-second telegraph. A missed dodge costs nearly a third of the squad. At two-thirds and one-third health it **plants and shields**, so no amount of firepower skips the fight — and every swing it lands makes the next one arrive sooner and reach further. Arriving with too small a squad no longer means a slow win; it means losing. |
| **Charge** | **Every third boss swing is charged**: a longer wind-up, a ring twice the size, and an aim that leads where your crowd is *going* rather than where it was. The ordinary slam is one you learn to drift out of; this is the one you have to answer. |
| **Adapt** | The game keeps pace with you: every stage cleared in a row makes the next 13 % harder — tougher, denser, and costlier per bite — and a single loss resets that completely. A stage that keeps beating you comes back weaker each time: 80 % → 62 % enemy health, a 40 %-weaker slam, and a few extra survivors to start with. |
| **Triple** | Every result screen — win or lose — offers **×3 coins** for a short video. It is the game's main income, not a bonus: the stage's own payout moves the shop slowly, the tripled one moves it at the pace the difficulty is priced against. Skip it repeatedly and the road quietly leans harder each stage — never announced, because an offer that threatens you has stopped being an offer; claim once and the lean resets completely. |
| **Bank** | Stage cleared or squad wiped, coins are paid out (a wipe still pays, scaled by progress) and spent on five permanent tracks: Squad, Firepower, Fire Rate, Reach, Scavenging. Three of them **never max** — Fire Rate and Reach do, because both are bounded by something physical (the bullet budget, the top of the screen) and a level that cannot move the number is worse than no level. |
| **Keep going** | There is no last stage. The road keeps generating, and everything that makes it a road keeps scaling with it — doors get bigger, packs get denser, beats arrive closer together, three-door banks and multipliers stay as common as they were at stage 10. |
| **Compare** | Every finished run posts your **deepest stage** to a global board, with squad size as the tie-break. It is optional scenery: no network, no rank, no interruption to the game. |

Full player-facing copy lives in [`description.md`](./description.md); the
design rationale is in [`GDD.md`](./GDD.md).

## Architecture

```
src/game/          pure, testable domain — no Vue, no DOM
  survival.ts      tunables + entity types (the rules, in one file)
  track.ts         seeded stage generator — a pure fn of the stage number
  foes.ts          5 enemy archetypes bound to the ink-art monster cast
  heroSprites.ts   the survivor: authored, then baked to a 14-frame strip
  inkArt.ts        shared hand-inked vocabulary (blobs, cel tones, ink, IK)
  monsterKit.ts    shared character parts + locomotion maths
  monsters.ts      the 13-design cast
  monsterSprites.ts idle-time frame baker for that cast

src/use/           reactive layer (module-level singletons)
  useSurvivalGame  the simulation — one `step(dtMs)`, no rendering
  useSurvivalArt   the renderer — 11 layers, plus the FX → juice table
  useVfx           event bus + pooled particles / text / decals
  useGameAudio     synth + sample cue router with per-cue throttling
  useUpgrades      the five coin-bought meta tracks (three uncapped)
  useTowerState    the single `tower_state` blob + debounced persistence
  useTowerEconomy  coins
  useLeaderboard   the global depth board — never throws, blocks or delays a run
  usePlayerIdentity anonymous, stable player id + display name

src/platforms/     platform registry, CSP, capability gates, resolvers
src/utils/save/    SaveManager, BlobStorage, 8 cloud strategies
src/components/    F-* design system + game HUD + modals
worker/            Cloudflare Worker + D1 behind the leaderboard (deploys alone)
```

**Balance contract:** difficulty is measured, not guessed. `tests/sim/` drives
the real simulation with scripted player policies (optimal / good / average /
careless / coin-follower) and full 30-stage careers including upgrade spending,
and reports clear rate, DPS at the boss, time-to-kill and cause-of-death per
stage. `tests/sim/REPORT.md` carries the numbers; `balance.test.ts` locks the
conclusions into the default suite.

**Performance contract:** the hot collections (`units`, `bullets`, `foes`) are
plain non-reactive arrays — Vue's proxy overhead on a few hundred entities
mutated 60×/s is exactly what drops frames on a phone. Only HUD scalars are
refs. Sprites are baked once and blitted; particles live in typed arrays with a
free-list; quality auto-degrades across three tiers off a rolling FPS average.
Measured 60 fps / 18 ms worst frame at 390×844 in Chrome with a 190-strong
crowd.

## Save & cloud hydration

Everything persists inside one object:

```text
tower_state = {
  ts_coins, ts_total_coins, ts_upgrades,       // meta
  ts_best_stage, ts_best_squad, ts_runs, ts_total_kills,
  ts_stage,                                    // the resumable run: a stage's
                                               // layout is regenerated from
                                               // this number alone
  ts_user_language, ts_user_difficulty, ...    // settings
}
```

The load order is load-bearing and is what stops a returning player from being
rendered as a fresh install:

1. `main.ts` **awaits** the platform SDK init before `saveManager.init()`.
2. It **awaits** `saveManager.init()` before importing `App.vue`, so the whole
   module graph evaluates against hydrated storage.
3. `reloadTowerState()` runs **before** the `saveDataVersion` bump, so every
   composable's watcher re-reads the hydrated blob rather than the stale one.
4. If hydrate didn't return data **and** local looks fresh, `SaveManager` retries
   3× at 1 s spacing before letting the app boot.
5. Hard checkpoints (stage cleared, run ended, upgrade bought) call
   `flushSaveNow()` to bypass both debounces.

`tests/save/TowerStateCloudHydrate.test.ts` covers all of it end to end,
including transient-SDK-failure recovery, corrupt-blob degradation, and a
full write → cold-boot → read round trip.

## Building for platforms

```bash
pnpm build:crazy-web        pnpm build:playgama
pnpm build:gamepix          pnpm build:gamemonetize
pnpm build:game-distribution pnpm build:glitch
pnpm build:itch             pnpm build:wavedash
pnpm build:yandex
```

Each mode reads its `.env.<platform>` file, DCEs the other platforms' SDK glue,
and emits a per-platform CSP.

## Docs

| File | Contents |
|---|---|
| [`GDD.md`](./GDD.md) | The design: loop, rules table, art direction, feel non-negotiables |
| [`game-implementation-plan.md`](./game-implementation-plan.md) | Build state, architecture map, what's next, known trade-offs |
| [`description.md`](./description.md) | Store copy: short/long description, how to play, controls |
| [`retention-roadmap.md`](./retention-roadmap.md) | 18 prioritised retention / conversion features |
| [`art-todo.md`](./art-todo.md) | Drop-in bitmap override manifest |
| [`sound-todo.md`](./sound-todo.md) | Audio cue map + what's worth commissioning |
| [`worker/SETUP.md`](./worker/SETUP.md) | Deploying the leaderboard Worker + D1, start to finish |

## Dev tools

* `/#/monsters` — the monster design bench (lazy; costs a player nothing).
* Type `cmarc` anywhere to toggle debug mode.
* `localStorage.cheat = 'true'` + reload publishes the live simulation as
  `window.__run` and enables the cheat shortcuts (`ctrl+shift+alt` + `k` coins,
  `g` survivors, `d` damage, `n` next stage, `r` restart).
