# Performance experiment ledger — survivalist

Every performance change tried on this project, kept or reverted, with the
measurement that decided it. Null and negative results are the valuable rows:
they are what stops the same idea being re-tried here or in the next game.

Procedure: `web-game-performance-optimize`.

---

## Harness

Installed in the repo. Interleaved A/B/A/B over CDP against a **headed** Chrome
on a private `--user-data-dir` (the shared MCP profile is usually locked by
another session; this never has to close a browser that belongs to open work).

| Piece | Path | What it is |
|---|---|---|
| Variant flags | `src/use/perfVariants.ts` | Boot-frozen A/B flags. Nothing set ⇒ shipping path. |
| Probe | `src/use/usePerfProbe.ts` | Zero-alloc ring buffers; work/interval percentiles, long tasks, heap slope, `step`/`draw` phase timers. Publishes `window.__perf`. |
| Runner | `scripts/perf-play.mjs` | `pnpm perf:play` — **the one to use for renderer work.** Interleaved, CPU-throttled, paired verdict, and it PLAYS the game (see the 2026-09-05 harness row). Fresh browser per measurement. |
| Runner (two BUILDS) | `scripts/perf-builds.mjs` | `pnpm perf:builds` — two URLs instead of two flags, so the arms can be two standalone builds. Carries the **overdraw census** (screens of fill per frame, exact), a `--gpu 0` fill-rate proxy, a quiet-machine gate and a per-rep calibration loop. See 2026-09-14. |
| Runner (no input) | `scripts/perf-ab.mjs` | `pnpm perf:ab` — the original. Fine against `perf/harness.html`, which needs no input; against the game itself it measures the tutorial. |
| Isolation harness | `perf/harness.html` | Prices ONE draw path with a fixed seeded workload, when driving real gameplay adds more variance than the change under test. |

Wired into the real game: `GameScene.vue`'s RAF loop brackets `step` and `draw`,
`main.ts` calls `installPerfProbe` after mount. All of it no-ops unless
`?perfprobe=1`. **Cost in the shipped bundle: 1117 B gzipped** (893 B probe +
224 B flags), 0.61 % of the 182.9 kB main chunk. `perf/` and `scripts/` are not
build entries — verified absent from `dist/` after `vite build`.

Run against the **real game** by default; reach for `perf/harness.html` only
when isolating a single pass. A 40 % saving on a pass that is 4 % of the frame
is a 1.6 % saving, and only the real game will tell you that.

```bash
pnpm dev
pnpm perf:ab --a "perf=<thing>-legacy" --b ""            # real game
pnpm perf:ab --base "http://127.0.0.1:5173/perf/harness.html?n=150" \
             --a "perf=<thing>-legacy" --b ""            # one isolated pass
```

Arms alternate every rep and the order flips on odd reps, so neither arm is
systematically first. The verdict uses the **paired** comparison (did B beat A
rep for rep; do the arms' ranges overlap), not the gap against one arm's own
spread across reps — drift moves both arms together and inflates that spread.
The runner reads `activeVariants()` back from the page and refuses to report a
run where the flag it asked for was not the flag that parsed.

### Noise floor — measured, and the bar every experiment must clear

An **A/A run** (identical flags on both arms) against the real game, to
calibrate the harness against itself:

```
A/A, real game route, 4x CPU throttle, 300 frames/rep, 4 reps
  median-of-rep workP95   A 4.350 ms  ->  B 4.450 ms   (+2.3%)
  paired wins              2/4 reps
  ranges                   A [3.500, 6.200]  B [4.300, 4.800]  overlapping
  VERDICT (correctly)      revert / log the null result
```

**A difference under ~10 % on `workP95` at these settings is not
distinguishable from noise.** Raise `--reps` and `--frames` before believing
anything smaller. Note the harness correctly refused to call a winner when
there was none — that is the property that makes the rest of this file worth
trusting.

### And the finding that outranks every optimization below

That same A/A shows the real game at **workP95 ≈ 4.4 ms against a 16.7 ms
budget, with the RAF interval pinned at 16.9 ms, at 4× CPU throttle** — the
mid-range-Android proxy. The game holds 60 fps on the target profile with about
12 ms of headroom.

Per the procedure's own rule: *if the worst target device holds the fps target
with headroom, the correct verdict is don't — spend the time on content.* Treat
further renderer micro-optimization here as unjustified until a real device, a
heavier scene (boss + peak wave + full VFX), or a player report says otherwise.

> **⚠️ Read the 2026-09-14 row before acting on the paragraph above.** A player
> report arrived, and it did not say the CPU was busy. It said 5–12 fps on a
> machine whose `workP50` — measured, reproduced — is **0.7 ms**. Everything
> above this line is a `workP95` measurement, and `workP95` is not the metric
> that fails on the device that failed. The verdict "don't optimize further"
> holds for the CPU side and holds for nothing else.

---

## 2026-09-14 — the game is FILL-bound, and nothing here had measured that ✅ KEPT

**The report.** A Poki playtester on Survivalist 3.1.0 quit after fifteen
seconds of footage at 5–12 fps. Their panel: `ANGLE (freedreno, FD618, OpenGL
ES 3.2)` — an Adreno 618 under the open-source driver, i.e. a low-end Chromebook
— `hardwareConcurrency` 8, `devicePixelRatio` 1.6, desktop, 1366x768.

### The question that was asked, and the answer

*Did performance degrade, and is the upfront baking the problem?* Two standalone
production builds, `f74708f` ("finishing art — performance optimizations",
2026-09-07) against `54d0f8d` (2026-09-14), each served from its own static
server, compared with `scripts/perf-builds.mjs`.

**Boot got slower and the bake got cheaper — opposite directions.** 3 reps each,
4x CPU throttle from navigation, the reporter's window:

```
                              f74708f      54d0f8d
  first rendered frame          3 691 ms     4 641 ms   +26 %
  long-task time during boot      754 ms     1 155 ms   +53 %
  canvases created                  451          192    -57 %
  canvas pixels baked             39.6 Mpx     10.8 Mpx  -73 %
  JS shipped (obfuscated)          688 kB       911 kB   +32 %
```

So **the sprite bake is not the problem and has not been for a week**: the
staged loader and the scoped art invalidation cut it by nearly three quarters.
The boot regression is the other two rows — a third more JavaScript to parse and
evaluate, and tier 0 of the painted-art preload decoding on the way in.

**And frame work is not the problem either.** Overdraw is the number that can be
counted rather than timed, and it did not move: **3.37 → 3.50 screens of fill
per frame**. On a quiet machine at 4x throttle both builds hold 55–60 fps on
that window. Stage-1 gameplay reps diverge by 3x run to run (the sine steer
takes different gates), so no honest verdict on `workP95` is available from them
and none is claimed here.

### What the CPU probe could never have shown

Chrome with `--disable-gpu` (SwiftShader) as a **fill-rate proxy** — a 4090 will
never show what an Adreno 618 does, and software raster over-weights fill
relative to any real GPU, so it is read only as "which arm pushes fewer pixels".
The shipped build, reporter's window, **no CPU throttle at all**:

```
  rafFps                  25
  RAF interval p50      33.4 ms      p95  50.1 ms
  workP50                0.7 ms      <- the entire CPU side of the frame
  draw phase             1.3 ms
```

**97 % of the frame is pixel work outside the RAF callback.** The report
reproduces at a `workP95` this file would have called healthy. Every number
above this row is CPU time, which is why nine days of renderer work moved
nothing for this player.

### Where the pixels go

The overdraw census (`--mode play`: `fillRect` and `drawImage` destination areas
through the live transform, bucketed by share of the screen):

```
reporter's window   1366x768 @ DPR 1.6 -> 2.69 Mpx canvas, 3.5 screens/frame
  878x1229  x4.0 /frame   1.61 screens   the off-lane band, painted FOUR times
  2186x1229 x1.05/frame   1.05 screens   the vignette
  everything else         0.88 screens

phone               412x915 @ DPR 2 -> 1.51 Mpx canvas, 4.29 screens/frame
  824x1830  x1.02/frame   1.02 screens   the vignette
  662x2124  x1.00/frame   0.93 screens   the gravel pattern
  662x1830  x1.00/frame   0.80 screens   the lane base tone, under the gravel
  662x1007  x1.00/frame   0.44 screens   the depth fade
```

Two findings fall straight out of that table.

**The desktop pays 1.8x the phone's pixels for LESS game.** `setViewport` fits
the lane by height, so on a 16:9 window the road is a third of the width and the
other two thirds are off-lane terrain — and that terrain was painted twice per
frame, once as a slice of the sky texture and once as a translucent darkening
ramp. 46 % of all the fill in the frame, on ground nobody plays on.

**The DPR cap was priced off the wrong thing.** It caps against the device's
pixel grid and never against the window that has to be filled, so the same rung
that gives the tuned phone profile 1.51 Mpx gives that Chromebook 2.69 Mpx.

### The changes

All of them are in the shipping path; the vignette carried a flag long enough to
be priced (below).

* **A pixel BUDGET per tier** (`renderScaleFor` in `useVfx.ts`): 2.10 / 1.40 /
  0.90 / 0.50 Mpx. A ceiling on top of the old DPR cap, never a floor, so a
  window already inside its budget is untouched — **every phone profile this
  file's measurements were taken on renders exactly as it did.**
* **A device class read before the first frame** (`deviceProfile.ts`). The
  quality ladder is a MEASUREMENT and therefore cannot help a player who leaves
  during it: the frames it needs are rendered at the resolution it has not yet
  decided is wrong, and 10 s of calibration plus a 4 s ratchet hold is longer
  than this player stayed. A GPU that names itself weak gets 0.6 of the budget
  immediately. It moves the RESOLUTION and nothing else — never the effect tier,
  because a wrong guess there is a permanently worse-looking game for somebody
  whose device was fine.
* **The off-lane band, once instead of twice** at `low` and `min`: the darkening
  is pre-multiplied into the backdrop texture (flat, at the ramp's midpoint — a
  ramp baked into a texture that scrolls and wraps would slide down the off-lane
  and jump at the wrap), and `drawLane` skips its own pass. The ridges and the
  sun survive, which the first attempt — a flat opaque fill — did not.
* **No gravel at `low`**, not only at `min`. It is the single largest pass on a
  portrait phone: a pattern sample per pixel, laid straight over the opaque base
  tone filled the line above it.
* **Tier 2 of the art preload is skipped on a weak device**, alongside the
  existing data-saver skip. The full painted set is **66 MB of decoded RGBA**,
  23 MB of it monster strips that are then sliced into per-frame canvases and
  held a second time — a texture working set several times the frame buffer, on
  a machine with one memory pool shared with the GPU.

### What it buys, in the unit that was failing

Fill per frame, counted rather than timed, on the reporter's window:

```
                  shipped                 with the changes
  tier high    2.69 Mpx  9.46 Mpx/frame   1.26 Mpx  4.49 Mpx/frame   -53 %
  tier low     1.64 Mpx  5.76 Mpx/frame   0.54 Mpx  1.36 Mpx/frame   -76 %
  tier min     0.67 Mpx  2.19 Mpx/frame   0.30 Mpx  0.73 Mpx/frame   -67 %

phone 412x915 @ DPR 2
  tier high    1.51 Mpx  6.48 Mpx/frame   1.51 Mpx  6.17 Mpx/frame   unchanged
  tier low     0.59 Mpx  2.52 Mpx/frame   0.59 Mpx  1.74 Mpx/frame   -31 %
```

End-to-end under the fill-rate proxy, ONE clean paired rep with matched
calibration (26 ms vs 33 ms) on an otherwise busy machine — reported as one rep,
because that is what it is:

```
  rafFps            16.9  ->  23.1      (+37 %)
  long-task time  11 184  ->  4 399 ms  (-61 %)
```

### 2026-09-14b — the vignette, baked ✅ KEPT (and the 2026-09-05 null CONFIRMED)

A deliberate re-test of an experiment this file already rejected, legitimate only
because the metric changed: the 2026-09-05 run measured `workP95` under CPU
throttling with a real GPU, and this failure is fill-bound.

Isolation harness, one pass priced at a time, arms alternating in blocks of 30
frames (a frame-by-frame swap charges each arm for the other's GPU work), timed
on the RAF INTERVAL — a `getImageData` sync would flip Chrome's canvas to a CPU
surface and quietly turn the whole thing into a software benchmark:

```
  RTX 4090, 2186x1229, 200 full-screen passes per frame
    gradient  16.7 ms   blit  16.7 ms      both vsync-capped — NO DIFFERENCE

  SwiftShader, 1497x842, 8 passes per frame
    interval p50   83.4 ms  ->  66.8 ms    (-20 %)
    interval p95  149.9 ms  -> 116.8 ms    (-22 %)
```

**Both results are true and they are the same result.** A radial gradient is
free on a GPU that can shade 500 Mpx a frame and costs ~25 % more per pixel than
a texture blit on a rasteriser that cannot — which is precisely the device in the
report. The 2026-09-05 verdict was right about the machine it was measured on
and was generalised one step too far.

Baked at 384 px on the long edge, aspect preserved so the ramp stays circular
under a uniform scale; ~0.3 MB against the 0.6 MB the first attempt spent. The
gradient path is retained behind `?perf=vignette-gradient` and for jsdom, where
there is no offscreen context.

### Also kept, unmeasured, Tier A hygiene

`getContext('2d', { alpha: false })` on the scene canvas. The renderer covers
every pixel of the frame before it draws anything — the backdrop's two strips
and the lane's own opaque base tone meet at the rails with no seam — so the
alpha channel was a per-pixel blend against a page nobody can see through.
Strictly less work for identical output; there is no mechanism by which it
loses.

### Harness notes, each of which cost a rep

* **`chrome.kill()` leaves the renderer and GPU processes alive on Windows.**
  Two reps in, both arms collapse together — which reads as a result and is an
  artefact. `taskkill /PID <pid> /T /F`, by PID, never by name.
* **A window another app covers is occluded**: rAF stops, the game's own blur
  pause engages, and the arm records a canvas that exists and a game that never
  ran (empty milestones, zero long tasks, a plausible canvas size).
  `--disable-backgrounding-occluded-windows`,
  `--disable-features=CalculateNativeWinOcclusion`, plus
  `Emulation.setFocusEmulationEnabled` and `Page.bringToFront`.
* **This machine hosts other sessions.** One started `vitest run` — 33 worker
  processes — mid-experiment, and every rep after it collapsed in BOTH arms. A
  rep now waits for a quiet machine and carries an in-page calibration loop, so
  a rep that ran on a busy box can be discarded after the fact instead of
  believed. Two rows of an earlier draft of this entry were withdrawn on exactly
  that evidence.
* **`perfSummary().frames` reads 0 below ~6 fps.** `perfReset` re-arms a
  120-frame warm-up, so the arm worth knowing about is the one that reports
  nothing at all. `rafFps`, counted over the measured window, is the
  unconditional number.

---

## 2026-09-06 — the harness was measuring STAGE 1 ❌ HARNESS BUG, FIXED

The sibling of the tutorial bug below, one layer further in. A fresh profile is
a fresh save, and a fresh save resumes on **stage 1**: three survivors, one
gate, a handful of props, no miniboss, no boss. Perfectly good for pricing the
opening; useless for anything whose cost scales with what is on the road —
monster counts, bullet counts, particle budgets, the sprite cache. Two arms
compared that way are two nearly empty roads.

`perf-play.mjs` grew `--stage <n>`, which writes a plausible save (progress,
coins, a few upgrade levels) into `localStorage` via
`Page.addScriptToEvaluateOnNewDocument` — **before** any app script runs. Written
post-boot it races the state layer's own debounced persist and loses, and the
arm then measures the tutorial while the log claims stage 22. Both arms get the
identical seed, and the child process re-spawn forwards the flag, so an arm
cannot silently fall back to stage 1.

```bash
pnpm perf:play --stage 22 --a "perf=<thing>-legacy" --b ""
```

---

## 2026-09-12 — the crowd: no per-body shadow, and a counting sort ✅ KEPT, UNMEASURED

**Asked for directly.** The retention roadmap's item 16 proposed two things —
bucket-sort the crowd by depth, and batch every survivor's shadow into one path.
The owner asked for the sort as written and for the shadow to go **entirely**
rather than be batched, which makes half of this a rendering decision and not
only a performance one.

**What went.** The per-survivor contact ellipse under every drawn body: a
`beginPath` + `ellipse` + `fill` each, up to 190 of them a frame at `high`, plus
a `fillStyle` assignment. About **570 canvas calls per frame** removed at the
top tier, 210 at `min`.

It was also the least visible thing in the loop. At crowd size the sprites
overlap several times over, so most patches were drawn underneath the bodies in
front of them — and the ones that showed never merged: two hundred separate
pools read as two hundred people standing near each other, which is precisely
what the pooled gradient under the whole formation (`drawUnits`, "the funnel,
part 1") was added to replace. That sheet stays, carries the same compression
term the patches were varying, and is one fill.

**What changed.** `order.sort((a, b) => units[b].y - units[a].y)` → a counting
sort into 16 depth bands over the crowd's own y extent, re-measured per frame.
The comparison sort is O(n log n) through a JS closure — about **1 500 comparator
calls** at 190 bodies, each two array index lookups and a subtract — against
three linear walks. The formation is ~3.3 units deep at full squeeze, so a band
is well under one body height and two sprites inside one band may overlap either
way round without anybody being able to say which was wrong.

**Not measured, and that is a deliberate admission.** There is no `perf=` variant
behind it, so nothing here is a timing claim — only an arithmetic one. To price
it properly, add a legacy variant in `perfVariants.ts` and run:

```bash
pnpm perf:play --stage 22 --a "perf=crowd-shadows-legacy" --b ""
```

**And the standing verdict still applies.** The A/A above puts the real game at
`workP95 ≈ 4.4 ms` against a 16.7 ms budget at 4× CPU throttle, which is why
this file's own rule says further renderer micro-optimization is unjustified.
The case for this row is the tail that A/A does not sample — a 200+ crowd on a
real low-end Android — plus the fact that the shadow removal was wanted for how
it looks. Treat the sort as free insurance, not as a win anybody has shown.

---

## 2026-09-06 — pool monsters and rounds ✅ KEPT (allocation), ❌ null-to-negative on time

**Claim.** A late road fields packs of dozens with a summoner adding waves, and
a gatling emits on the order of 200 rounds/s. All of them live under a second.
Recycle the structs instead of allocating a fresh one per spawn, and swap-and-pop
instead of `splice`.

### What the frame-level harness said: nothing, and it could not have

```
pnpm perf:play --stage 22 --a "perf=pool-legacy" --b "" --reps 4
  workP95      A 15.30 -> B 16.95  (+10.8%)   paired wins for B 1/4
  ranges       A [10.8, 55.4]   B [10.8, 24.8]     heavily overlapping
  frames/rep   235 … 1119        draws/frame 86 … 221
```

Unusable, and the reason is structural rather than statistical: the sine steer
sends each run through different gates, so one arm reaches a boss with 600
survivors and the next wipes at 40 %. That difference is worth several
milliseconds a frame; the change under test is worth microseconds. **A frame is
100–220 draw calls and this change lives entirely inside `step()`** — the signal
was never going to clear that floor.

### Where the claim actually lives: `step()`, one arm per PROCESS

In-process interleaving with `vi.resetModules()` was tried first and is
worthless here — the arms share a heap and a JIT, and the previous arm's module
graph stays alive behind the new one. It returned **6/6 wins** for pooling on one
run and **2/6 losses** on each of the next two. Same lesson `perf-play` learned
for browsers: one measurement, one process.

Stage 22, 600 survivors, 8 000 steps, forced GC before the clock, 5 reps
interleaved with the order flipped each rep:

```
                 median      paired wins for pooled
  step time    533 -> 583 ms      1/5      (+9.3%)
  heap growth   43.5 -> 32.5 MB   4/5      (-25.3%)
```

**Verdict: kept.** It does what it claims — a quarter less garbage per stage —
and the time it costs is not a real cost: 8 000 steps at 583 ms is **0.073 ms a
step against a 6–20 ms frame**, so +9 % of the simulation is +0.006 ms of the
frame, three orders of magnitude under the draw work beside it. Allocation is
the lever that moves a *hitch*, and a hitch is what a late stage actually
suffers from. Both ranges overlap; the time number is a null-to-negative result
and is recorded as one rather than argued away.

### The finding worth more than the verdict

The first implementation reset a recycled body with
`Object.assign(f, FOE_BLANK)` and measured **6.3 % SLOWER than allocating
fresh** — the pool paying for its own saving twice over. `Object.assign` walks
the source's own enumerable keys through a generic path, and against a
29-field template that costs more than V8 spends building a literal of known
shape. Written out as straight-line stores (`resetFoe`), the same experiment
became the numbers above.

*Do not reach for `Object.assign` in a pooled reset.* If it is used for safety —
so a field added to the struct cannot be forgotten — buy that safety with a
TEST instead: `pooling.test.ts` compares `resetFoe`'s output against the typed
`FOE_BLANK` key by key, which catches the same mistake and costs nothing at
runtime.

### Also true, and the reason this was not reverted outright

Pooling is usually a null result in a modern engine — a young object is cheap to
allocate and cheaper to scavenge — and this project should expect that answer
next time it is proposed for something smaller. It was kept here because the
population is genuinely unbounded in the player's own success, not because the
technique is generally worth it.

---

## 2026-09-05 — the harness was measuring the TUTORIAL ❌ HARNESS BUG, FIXED

**Read this before trusting any number produced by `pnpm perf:ab` alone.**

`scripts/perf-ab.mjs` loads the page and waits. In this game that measures the
tutorial: the squad holds its column until the first pointer event arrives, so a
run with no input never draws a gate, a crate, a foe or a single glyph. Proof:
a draw-call breakdown over 1 504 frames with **zero `fillText` calls**, and a
screenshot at 26 s still reading *"Swipe to move your squad"*.

Every A/B against `--base <the game>` with no scripted input is therefore a
comparison of two empty roads. The runs below use a driver that dispatches one
`pointerdown` and then a 5 s-period sine steer across 70 % of the lane, installed
IN THE PAGE (a CDP round trip per event is as slow and as variable as the thing
being measured under throttling). With it, `workP50` at 6× goes from 1.7 ms to
7.7 ms — the difference between measuring the menu and measuring the game.

Two more properties the runner needs and did not have:

* **A long, unthrottled settle before the clock starts.** The idle sprite baker
  builds the stage's monster strips in the first seconds of play at ~12 ms a
  frame. An A/A run that started measuring at 3 s reported 48 long tasks in one
  arm and 9 in the other — a 34 % spread between two IDENTICAL arms. 12 s of
  settle fixes it.
* **A fresh browser per measurement.** Chrome degrades across repeated
  navigations of this page: an A/A at 4 reps in one browser returned 1 320, 604,
  93 and then 0 recorded frames on successive runs.

With all three, the A/A noise floor is **−0.7 % on `workP95`** (A 13.60 ms → B
13.50 ms, 3 reps, 6×, 22 s each) — in line with the ~10 % bar the original A/A
established.

The driver lives in `scripts/perf-play.mjs` (`pnpm perf:play`); the old runner is
kept for isolated-pass work against `perf/harness.html`, which needs no input.

---

## 2026-09-05 — 12× CPU throttle ❌ DO NOT USE ON THIS PROJECT

At 12× the idle sprite baker's long tasks swamp everything. `workP95` tracks the
long-task count and nothing else: reps with ~70 long tasks scored 9.1–9.9 ms in
BOTH arms, reps with 140–325 scored 14–24 ms in BOTH arms. A run reported
"+39.4 %" for a change that is a dead null at 6×. 6× is the ceiling here.

---

## 2026-09-05 — the `min` quality tier ✅ KEPT (a fidelity cut, deliberately)

**Not an optimization — a product decision, taken because players reported runs
sitting at ~10 fps.** The ladder had no rung below 40 fps, so a device at 12 fps
and one at 38 fps were treated identically; and `renderScaleTier` committed the
canvas resolution ONCE and never moved again, so a device that met its trouble
after the 10 s calibration window had the single biggest lever bolted shut for
the rest of the session.

Three changes, all in `useVfx.ts`:

* a fourth tier, `min`, entered below 25 fps — DPR **0.8** (below the device
  grid; the compositor scales it back up), no lane gravel, no depth fade, no
  decals, no gate chevrons, no divider glow or beacon, no per-body shadows, 70
  drawn survivors instead of 190, a 110-particle pool instead of 900;
* the steady-state window closes on 60 frames **or one second of rendered time**,
  whichever comes first — a pure frame window is a one-second control at 60 fps
  and a SIX-second one at 10 fps, so the device in the most trouble waited
  longest for help. Downgrades also stopped waiting on the 2.5 s hold; upgrades
  still do;
* the resolution became a **ratchet** instead of a one-shot lock: still
  downgrade-only and never reversed, but a further step needs the live tier to
  have held for 4 s. Bounded at three re-sizes a session.

```
tier=high vs tier=min   headed Chrome 152, 412x915 @ DPR 2, 6x CPU throttle,
                        scripted sine steer, 4 reps interleaved, 22 s each,
                        fresh browser per run

  median-of-rep workP50      7.55 ms  ->   5.75 ms   (-24%)
  median-of-rep workP95     15.55 ms  ->  12.65 ms   (-19%)
  median-of-rep workP99     20.95 ms  ->  17.45 ms   (-17%)
  RAF interval p50          33.30 ms  ->  16.75 ms   (-50%)   <- the headline
  RAF interval p95          50.15 ms  ->  42.10 ms   (-16%)
  long tasks                    51.5  ->     11.0    (-79%)
  paired wins for min        3/4 reps
  ranges                     A [11.7, 16.5]  B [11.6, 14.7]

VERDICT: keep
```

**The interval, not the work, is the point.** The median frame goes from missing
a vsync to hitting one — 30 fps to 60 fps on this profile — while `workP95` moves
only 19 %. That gap is the tell: most of what `min` buys is not CPU time inside
the RAF callback at all, it is **fill rate**. DPR 2 → 0.8 is 6.25× fewer pixels,
and it is the largest single term in the result.

Draw calls fall too, and by how much depends entirely on how busy the road is:
142.5/frame → 132.1 (−7 %) on a quiet stretch, 153.2 → 100.9 (−34 %) on a busy
one, where dropping to 70 drawn survivors from 190 and losing the per-body
shadows and gate chevrons actually bites. Worth knowing which number you are
looking at before quoting either.

**Cost.** Visibly softer, and the road loses its gravel and its depth fade. The
vignette was KEPT at `min` on purpose: it costs one composite over a 0.24 Mpx
canvas, and without it the road reads flat and washed out toward the horizon.
Unit-tested in `qualityCalibration.test.ts`, including that a 4 000 ms tab switch
cannot trip the new one-second window — the outlier filter had to be extended to
the steady-state controller, which until now was protected only by its 60-frame
minimum.

`?tier=min|low|medium|high` pins the ladder for QA and for A/B arms; it is off in
every player session and resolved once, at module load.

---

## 2026-09-05 — bake the vignette, the gate plates and the labels to sprites ❌ REVERTED

The three parts of that day's renderer pass that were a genuine TRADE rather
than strictly-less-work, measured together behind `perf=bake-legacy`:

* the full-screen vignette → a texture blitted (0.6 MB, baked at 400 px on the
  long edge);
* each gate's number plate — frame, outline and glyphs → one sprite, blitted,
  with `pop` carried by the destination rectangle;
* the outlined numbers on crates and barricades → a keyed label-sprite cache.

The hypothesis was reasonable: `strokeText` profiled at 2.7 % of all samples and
`measureText` at another 1.6 %, and a full-screen radial ramp is the most
expensive thing the renderer asks for per pixel.

```
bake-legacy vs baked      6x CPU throttle, 412x915 DPR 2, tier pinned high,
                          6 reps interleaved, 1 400 frames/rep

  median-of-rep workP95    4.950 ms  ->  4.950 ms   (-0.0%)
  paired wins for B        2/6 reps
  ranges                   A [3.600, 6.100]  B [4.600, 7.800]  overlapping
  RAF interval p95         17.45 ms  ->  17.45 ms

VERDICT: revert
```

A dead null. Reverted with its flag, and ~250 lines and 0.6 MB of texture went
with it. (This run predates the scripted-input fix above and so understates the
scene — but it is the arm that ADDS work, and it did not win on the light scene
either, losing 4 of 6 paired reps. A busier scene does not turn that into a win.)

**Kept from the wreckage**, because it is not a trade: `measureLabel` in
`useTextMetrics.ts`. Each gate leaf called `ctx.measureText` once a frame to size
its plate, for a label that changes twice a second at most, at a font size
derived from a frame-constant `scale`. A map lookup replacing a shaping pass,
with byte-identical output.

---

## 2026-09-05 — renderer hygiene pass ✅ KEPT, unmeasured

Filed as Tier A hygiene under the same rule as the 2026-09-04 muzzle-flash hoist
(exempt from *deliberation*, not from honesty about being unmeasured). Every item
is strictly less work for identical output, and there is no mechanism by which
any of them loses. They could not be A/B'd as a bundle after the fact: isolating
them would need a flag inside eleven separate loops, which is the shape the
procedure tells you not to build.

**Gradients that were rebuilt every frame, now cached** — the off-lane wash, the
depth fade and the two rails in `drawLane`; the curtain, both posts, the hot
spark and the plate in `drawGates`; the pillar warning glow and the beacon lamp
in `drawDividers`; the tube and sheen of the miniboss HP plate; the vignette.
Two of them also needed the position pushed into a transform (the rails and the
gate posts were pinned to absolute screen coordinates and so could never hit a
cache at all — see `useGradientRamps`). The divider glow's throb moved to
`globalAlpha`, which is exact rather than approximate because its outer stop is
transparent; the beacon's amber-to-red shift is bucketed to 8 of 255 in green,
which is the one place in the pass where output changes at all.

**Stroke submissions batched** — a gate's six chevrons and the trap's two bars
were a `beginPath`/`stroke` each; they are now one path and one stroke apiece.
Tracers were two strokes PER BULLET with a frame-constant colour and width; they
are now two strokes for the whole pass. Safe under `lighter` because tracers are
vertical lines at the survivors' own spacing (~0.3 world units) against a 0.1
glow width, so they never overlap.

**Pixels not submitted** — the backdrop is a viewport-and-a-half tall texture
that was blitted whole every frame and then covered by an opaque road across
~80 % of a portrait screen; it is now two source-cut strips either side of the
lane. The lane's gravel pattern filled `h + 2 * tile` for a scroll offset that
only ever spans one tile.

**Per-frame strings and reads** — the crowd's shadow tone was a template literal
built once per drawn survivor; every `quality.value` in the renderer was a Vue
ref getter, several inside per-entity loops, and the tier is now latched once a
frame into a plain local.

Effect on the one thing that can be counted rather than timed:
**stroke submissions 37.7/frame → 30.3, total draw calls 142.5/frame → 139.6**
(`drawImage` rises 12.2 → 13.8, which is the backdrop becoming two blits of far
fewer pixels than the one it replaced).

**Not done, deliberately:** caching the crowd's pooled contact shadow. It is one
gradient for the whole frame, not one per entity, and its key would have to carry
both a continuously moving crowd radius and a continuous squeeze — hundreds of
combinations into a 256-entry cache shared with every per-entity ramp in the
renderer, evicting the ramps the cache exists for to save one build a frame.

---

## 2026-09-04 — smoke particles: bake the ramp to a sprite ✅ KEPT

**Hypothesis.** The particle pool rebuilt a two-stop radial gradient per smoke
puff at absolute screen coordinates, so the rasteriser rebuilt the ramp for
every puff every frame. Baking one sprite per colour and blitting it should cut
the particle paint substantially, at the cost of ~150 kB of texture per colour.

**Scenario.** 150 puffs — the realistic peak for this game's three smoke
emitters, not the 900 pool cap. 412x915 at DPR 2. Fixed seed, pool never
stepped, so both arms paint an identical set and simulation variance is zero.

```
smoke-sprite-blit vs per-puff-gradient   headed Chrome 152, RTX 4090 laptop

unthrottled, 6 reps interleaved, 400 frames/rep
  median-of-rep p95 work/frame   A 1.200 ms  ->  B 0.700 ms   (-42%)
  paired wins for B              5/5 completed reps
  ranges                         A [1.000, 1.700]  B [0.600, 0.900]  DISJOINT
  RAF interval p95               A 16.90 ms  ->  B 16.90 ms

4x CPU throttle, 6 reps interleaved, 300 frames/rep
  median-of-rep p50 work/frame   A 5.850 ms  ->  B 3.550 ms   (-39%)
  paired wins for B (p50)        6/6 reps
  median-of-rep p95 work/frame   A 11.700 ms ->  B 9.500 ms   (-19%, ranges
                                 overlap — p95 is noisy under CPU throttling)
  RAF interval p95               A 16.90 ms  ->  B 17.70 ms

VERDICT: keep
```

**What it does not buy.** The RAF interval was ~17 ms in both arms — the game
was vsync-capped either way at this workload. This is frame-budget headroom on a
weak device, not a frame-rate change.

**Cost.** ~150 kB per distinct smoke colour (192x192 RGBA); a handful of colours
in play. A gradient fallback path is retained for "no offscreen context", which
is what jsdom hits under test.

---

## 2026-09-04 — smoke particles: cached UNIT ramp sized by `scale()` ❌ REPLACED

The first thing tried, and the intuitive one: cache a single unit-radius ramp
per colour and place/size it with `translate` + `scale`. It ships one gradient
instead of 900 and looks like the clean fix.

It is a much smaller win than the blit, and a `scale()` in the pool's hottest
loop is work the blit does not do — `drawImage`'s destination rectangle carries
the size for free. Superseded before it was ever measured on the real harness;
what killed it is that the sprite arm above beats the *original* by 42% while
this approach's own advantage over the original was never established on a
trustworthy harness at all.

There is a test (`gradientRamps.test.ts`) asserting no path reintroduces a
`scale()` here, so the tidier-looking form cannot drift back in.

---

## 2026-09-04 — headless Chrome as a canvas perf harness ❌ DO NOT USE

**The most important row here.** An early standalone benchmark run under
`--headless=new --dump-dom` produced numbers that contradicted themselves
between runs: the untouched baseline arm reported 25.4 ms in one run and 3.98 ms
in the next, with the only edit being the sprite size of a *different* arm.

Cause: a canvas that is never composited lets the browser skip raster work, and
`getImageData` does not reliably force it. Conclusions drawn from that harness
(including a claimed 4x win and a claimed ranking of intermediate approaches)
were discarded.

**Rule for this project:** canvas/GPU timings come from a headed browser with a
visible, attached canvas in a RAF loop. Headless is fine for correctness, never
for paint cost.

---

## 2026-09-04 — muzzle flash: hoist the ramp out of the crowd loop ✅ KEPT, unmeasured

`drawUnits` rebuilt a three-stop radial ramp for every firing survivor, up to
190 a frame, from values (`scale`, `rateHeat`) that are constant for the whole
frame. Now built once per pass.

Not A/B'd: this is a loop-invariant hoist with byte-identical output and
strictly less work — there is no mechanism by which it loses. Filed as Tier A
hygiene ("do not recreate renderer objects during render"), which the procedure
exempts from deliberation, not from honesty about being unmeasured. An earlier
claim of "-10%" for this came from the discredited headless harness and is
withdrawn.

Same reasoning covers the remaining low-N ramp caches (coin glow and body, crate
halo and body, rock body, barricade body) and interning the particle `rgb()`
strings. All are unmeasured; all are strictly-less-work with identical output.

---

## 2026-09-04 — decal ramps: quantise the radius into the cache key ❌ REVERTED

Rounding each scorch mark's radius to the nearest half pixel to raise the cache
hit rate. Reverted before shipping: it trades real output fidelity for a saving
no measurement asked for, at a site capped at 24 entities. The emitters ask for
a handful of fixed radii times a frame-constant `scale`, so **exact** keys
already hit for almost every decal.

Kept: the ramp cache itself at full precision.

---

## Not attempted

- `shadowBlur` removal — the usual first suspect on canvas, and **there is no
  `shadowBlur` anywhere in this codebase.** The 46 hits an early grep attributed
  to it are all `globalCompositeOperation` (39 of them `'lighter'`), already
  bucketed to two switches per frame by the particle pass. Do not re-open this.
- Porting the renderer to WebGL (Rapid.js / PixiJS) — the renderer is procedural
  vector Canvas2D with 12 `drawImage` calls in the whole codebase, so a sprite
  batcher has nothing to batch until far more of the art is baked. See the
  sprite-baking work in `spriteBake.test.ts` / `monsterSprites.ts` for the path
  that would have to come first.

---

## 2026-09-12 — scoped art invalidation ✅ KEPT (the largest win in this file)

**Reported as:** "right after loading the first level the art assets are baked
and repaint multiple assets again, creating heavy early level load" — seen
first in another project with the same art layer, then here.

**Claim.** Every painting that decoded answered with "art changed" and nothing
else, so all three listeners dropped everything they held: the sliced-strip
cache (`spriteStrip`, up to 32 canvases per strip), the backdrop with both
silhouette caches (`invalidateArtSurfaces`), and every `useArtImage` in the DOM.
With ~70 paintings arriving one after another through the opening stage, that is
~70 whole-scene re-bakes in the first seconds. Naming the painting on the
event lets each listener drop only what was built from it.

### Census — the verdict, because the work is concentrated in time

`art-churn-census.mjs`, 4x CPU, 20 s play window, 3 reps interleaved, art ON in
both arms, dev server:

```
median over reps          A (legacy)   B (scoped)
bootCanvases                     693          158     -77%
bootReadbacks                     40            2     -95%
playCanvases                      26           45     (noise, both small)
```

For scale, the same census with the art layer OFF bakes **119** canvases during
boot — so the scoped path is within ~40 canvases of the no-art floor, which is
the signature the procedure says to aim for.

### Frame time — a veto that turned into a second win

`pnpm perf:play --stage 22 --a "perf=art-invalidate-legacy" --b "" --reps 3`,
412x915 @ DPR 2, 4x CPU:

```
  workP50      A  5.60 ->  B  4.90   (-12.5%)
  workP95      A  9.80 ->  B  8.70   (-11.2%)   paired wins 3/3
  workP99      A 14.30 ->  B 11.60   (-18.9%)
  intervalP95  A 33.30 ->  B 17.60   (-47.1%)
  longTasks    A  2.00 ->  B  1.00
  ranges       A [9.8, 25.4]   B [8.6, 8.9]
```

Rep 1 of the legacy arm is the whole finding in one line: **461 frames recorded
against B's 1170, workP95 25.4 ms, 145 long tasks** — a run that spent its
opening seconds re-baking instead of drawing.

### The audit, which IS the fix

| painting | what it invalidates now |
| --- | --- |
| any `kind/id` | its own `spriteStrip` entry, and nothing else |
| `bg/ridge-far`, `bg/ridge-near` | the backdrop, that image's tint, its measured trim (the `getImageData` the readback count is made of) |
| `fx/smoke` | the shared sprite cache (`useVfx.bakePuffSprite` bakes into `useGradientRamps`) — the cache the renderer does not own, and the one easy to miss |
| everything else | nothing. The lane tile and every gradient ramp are procedural and were being thrown away for free |

`null` still means "everything": a flag flip and `refreshArtOverrides` cannot
name a painting, and both must drop the lot.

Pinned by `tests/game/artInvalidation.test.ts` (the payload, and that one
arrival leaves other strips alone). Legacy branch and its flag deleted.

---

## 2026-09-12 — lazy strip slicing ❌ REVERTED (null on canvases, negative on time)

**Claim.** `stripFrames` cuts every panel of a painted strip the first time the
strip is touched — eight for a walk, seven for a boss's death, each one a canvas
plus a `drawImage`. Cutting them on demand instead should move that burst off
the frame the sprite first appears on, cutting boot canvases and the p99 spike
when a new design or a death enters mid-fight. Predicted: boot canvases down by
the strip share, p99 down, p95 unchanged.

Implemented as a `Strip` record (`img`, `n`, `fw`, `fh`, `frames` with holes)
behind `perf=strip-eager-legacy`, with `stripCount` / `stripFrameAt` replacing
the array-returning `stripFrames` at all three call sites.

### Census — no difference at all

```
median over 3 reps        A (eager)    B (lazy)
bootCanvases                     203          203
playCanvases                       0            0
over50 / longTasks               0/0          0/0
```

**Why, and this is the finding:** a walk cycle asks for *every* panel within
about a second of the sprite appearing, and the sprite appears while the game is
still booting. Lazy and eager converge almost immediately, so there is no burst
left to move. The panels a run never reaches — the tail of a cycle a monster
dies before finishing — are a handful of canvases, not a spike.

### Frame time — slightly worse, if anything

```
pnpm perf:play --stage 22, 3 reps interleaved, 4x CPU
  workP50      A  4.90 ->  B  5.40   (+10.2%)
  workP95      A  8.00 ->  B  8.70   (+8.7%)    paired wins for B 1/3
  workP99      A 10.40 ->  B 14.30   (+37.5%)
  longTasks    A  1.00 ->  B  2.00
  ranges       A [6.7, 8.5]   B [8.2, 8.8]
```

Plausible mechanism for the regression: the cut now happens on gameplay frames
rather than during boot, and every frame lookup pays a sparse-array hole check.
Either way there is no win to weigh it against.

**Verdict: reverted in full** — both paths and the flag are gone, and
`stripFrames` is back exactly as it was. Do not re-try this without a workload
where a strip's panels are genuinely *not* all reached in its first second;
this game does not have one.
