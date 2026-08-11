# Tower Siege — Retention & Conversion Roadmap

> 20 candidate features, each with the metric it targets, why it should move
> that metric, and a concrete implementation sketch against the code that
> exists today. Ordered by **impact ÷ effort** — the first eight are the ones
> worth doing before anything else.
>
> Effort key: **S** ≈ half a day · **M** ≈ 1–2 days · **L** ≈ 3–5 days
>
> Metric key: **D1** day-1 retention · **PT** average playtime ·
> **PU** pickup (first-session conversion) · **PD** put-down resistance ·
> **$** monetisation conversion

---

## Tier 1 — do these first

### 1. "Beat your ghost" wave marker — D1, PD · Effort S
**Why:** The single strongest hook this genre has is *"I got two waves
further."* Right now the personal best is a number in the corner. Make it a
thing the player is actively racing.

**Implementation:** `bestWave` already lives in `useTowerProgress`. In
`useTowerArt.drawScene`, draw a translucent horizontal banner across the
battlefield at the player's best wave (a "high water mark" line with the wave
number). When the live wave passes it, fire a full-screen flash + a distinct
stinger + a `NEW RECORD` banner. Persist nothing new — the data is already
there. ~60 lines in the renderer plus one FX event.

### 2. Post-defeat "one more thing" nudge — D1, PD · Effort S
**Why:** The defeat screen currently offers *Upgrade* and *Defend again*. Add a
line that tells the player exactly what to change. A specific, actionable
diagnosis converts a loss into intent instead of a stopping point.

**Implementation:** `runSummary()` already returns kill tallies, tower height
and block count. Add a pure `diagnose(summary, tower)` in `src/game/advice.ts`
returning one of ~8 canned lines keyed to the dominant failure: *"Bats got past
your mortars — mortars can't hit air. Try an Archery tower."* / *"Your gate took
70% of the damage. Widen the base."* Render it above the CTAs. Fully
deterministic, no new state, and it is the cheapest tutorialisation available.

### 3. Auto-rebuild last tower — PU, PD · Effort M
**Why:** The biggest friction in run 2+ is re-placing thirty blocks by hand. A
player who has to redo twenty seconds of chores before the fun starts churns.

**Implementation:** Persist the **best-performing layout** of the session under
`ts_blueprint` (`Array<[c, r, typeId]>`, same tuple shape as `RunSnapshot`).
On the defeat screen add a third CTA: *"Rebuild (needs 340 wood, 120 stone)"*.
It replays `placeBlock` in row order, skipping anything unaffordable, and
reports what it couldn't afford. Also unlocks a natural rewarded-ad placement
(#12).

### 4. First-session scripted opening — PU · Effort M
**Why:** Wave 1 currently starts with an empty foundation and a 60-second
timer. A brand-new player does not yet know a cannon is better than a crate.
Front-load one guaranteed win.

**Implementation:** When `ts_onboarded` is false, seed the run with two free
`wood` blocks and one free `cannon` already placed, set the wave-1 budget to
~60% via a `firstRun` flag threaded into `planWave`, and drive the existing
`ControlHint` through a fixed 4-step script (pick → place → call → watch).
`hintsDone` already does the retiring. No new UI components.

### 5. Wave-milestone chests — PT, PD · Effort S
**Why:** Long sieges need intermediate payoffs; a reward every 5 waves gives the
player a next checkpoint to reach for rather than an open-ended grind.

**Implementation:** In `completeWave`, when `wave % 5 === 0`, push a
`milestoneChest` FX and show a 3-choice card overlay (*+40% wood this run* /
*repair all blocks to full* / *a free Mortar*). Reuses the modal chrome from
`ThemeModal`. Effects are transient run modifiers — add a `runBoons: Set<string>`
to the sim, read where the corresponding multiplier is applied.

### 6. Idle offline production — D1 · Effort M
**Why:** A reason to come back tomorrow that costs the player nothing to earn.
The classic D1 lever for a session-based builder.

**Implementation:** `TreasureChest` already implements a timer→coins loop.
Retarget it: on boot, compute `min(elapsedHours, 8) × (coins/hour from the
economy blocks in `ts_run`)` and present it as *"Your Gold Mines produced 340
coins while you were away."* Store `ts_last_seen` in the blob. Cap at 8 h so it
is a nudge, not an incentive to stop playing.

### 7. Wave 10 boss teaser on the defeat screen — PD, D1 · Effort S
**Why:** A named, visible goal just out of reach outperforms an abstract
"survive longer".

**Implementation:** When `summary.wave` is within 3 of the next boss wave, show
a Siege Golem silhouette (draw it with the existing `drawEnemyProp` golem path
into an offscreen canvas) and *"The Siege Golem waits at wave 10."* Pure
presentation; the boss already exists in `ENEMY_DEFS`.

### 8. Tech-tree "next unlock" preview on the HUD — PT, $ · Effort S
**Why:** The tech button shows an affordable-count badge but never says *what*
you are close to. Naming the reward makes the coin grind purposeful.

**Implementation:** `useTowerProgress.affordableCount` already exists. Add a
`nextUnlock` computed that returns the cheapest not-yet-owned `unlock` node and
its remaining coin cost, and render *"Mortar — 120 more"* under the tech chip
when the player is within 2× of affording it.

---

## Tier 2 — strong, more work

### 9. Weekly leaderboard (highest wave) — PD, D1 · Effort M
Portals expose native leaderboards (CrazyGames `SDK.game.happytime` +
Playgama/GamePix scoreboards). `bestWave` is already the natural score. Post on
every `recordRunEnd`, and show the player's rank on the defeat screen. Falls
back to a purely local "best of the last 7 days" where no SDK exists.

### 10. Endless mode with a difficulty modifier — PT · Effort M
After the player clears wave 20 once, unlock a modifier picker before each run
(*Double enemy speed, ×2 rewards* / *No stone, ×3 wood* / *Gate has 1 HP*).
Implemented as multipliers threaded into `waveBudget`, `waveReward` and the
starting-resource computeds — no new simulation code, and it multiplies the
replay value of a build the player already knows.

### 11. Block mastery levels — PT, PD · Effort M
Track kills-per-block-type in `ts_mastery`. Every 500 kills with a cannon grants
that block +2% permanent damage, capped at +20%. Surfaced in the block
inspector as a small progress ring. Rewards specialisation and gives long-run
players a second progression axis once the tech tree saturates.

### 12. Rewarded ad: instant rebuild — $ · Effort S
Pairs with #3. If the player cannot afford the auto-rebuild, offer *"Watch an
ad to rebuild for free."* This is the highest-intent rewarded placement in the
game: the player has already decided they want that tower back.
`showRewardedAd()` + `isRewardedReady` gating already exist.

### 13. Rewarded ad: emergency repair mid-wave — $, PD · Effort M
When the gate drops below 25% during a battle, show a one-shot button:
*"Watch an ad — repair the gate to 60%."* Rate-limit to once per run via a
`repairUsed` flag. High emotional value at the exact moment the player is about
to lose, which is when rewarded video converts best.

### 14. Daily "featured layout" challenge — D1 · Effort L
Each day, a fixed pre-built tower and a fixed seed; everyone plays the same
board and the score is waves survived. `planWave` is already deterministic per
wave index — add a daily seed offset and a `ts_daily_challenge` record.
Strongest D1 mechanic in the list, but needs a layout authoring pass.

### 15. Block-drag multi-place — PU, PT · Effort M
Let a drag across several empty cells place a block in each one it crosses
(resources permitting). The pointer handler already distinguishes drag from tap;
route a drag with an armed block through `tryPlace` per newly-entered cell
instead of panning. Removes the single biggest source of repetitive tapping.

---

## Tier 3 — longer plays

### 16. Structural physics: real toppling — PT, PD · Effort L
Today an orphaned block falls straight down. Give the tower a centre-of-mass
check: if the standing mass is too far off-axis over its footprint, the whole
upper section topples sideways with angular momentum. Turns "build wide" from a
suggestion into a real constraint and makes collapses spectacular.

### 17. Enemy siege engines — PT · Effort L
Wave 15+ introduces a battering ram (armoured, targets the gate specifically,
ignores the frontier rule) and a catapult that out-ranges every tower and must
be rushed. Both need new AI branches in `stepEnemies`, but they force the player
to redesign a tower that has stopped needing redesigning.

### 18. Tower sharing via seed codes — D1, PU · Effort M
Encode a layout as a short base64 string (`[c,r,typeId]` tuples pack to ~3 bytes
each) and add Copy/Paste buttons. Players share builds; each shared code is a
free acquisition channel and a reason to return to compare.

### 19. Season pass v2 with cosmetic tracks — $, D1 · Effort M
The battle pass currently pays coins only. Add a second track granting block
themes (the `BLOCK_THEMES` system already supports this) and a paid tier that
unlocks both tracks. Themes are pure palette overrides, so new ones cost
nothing but a colour table.

### 20. Adaptive difficulty floor — D1, PD · Effort M
If a player loses 3 runs in a row without beating their best wave, quietly
apply a 10% wave-budget reduction until they do — then remove it. Track
`ts_loss_streak`; multiply into `waveBudget`'s difficulty argument. Never
surfaced in the UI. Protects the exact cohort that churns hardest: players stuck
at their ceiling.

---

## Sequencing suggestion

| Sprint | Items | Rationale |
|---|---|---|
| 1 | 1, 2, 7, 8 | All ≤ S effort, all pure presentation over existing state. Ships in ~2 days and directly targets the "one more run" loop. |
| 2 | 4, 3, 12 | First-session conversion + the rebuild loop + its natural ad placement. |
| 3 | 5, 6, 15 | Mid-run pacing, the return-tomorrow hook, and the biggest ergonomics win. |
| 4 | 9, 10, 13 | Competitive + replay depth + the second rewarded placement. |
| 5+ | 11, 14, 16–20 | Depth work once the core loop's numbers are validated. |

## Instrumentation to add first

None of the above should ship without the ability to read whether it worked.
Before sprint 1, log these events through the existing platform analytics
hooks (CrazyGames `happytime`, GamePix `gamePixHappyMoment`, or a plain
`console`-backed shim on non-platform builds):

- `run_start`, `run_end { wave, kills, blocksPlaced, durationMs }`
- `wave_cleared { wave, earlyCallBonusPct }`
- `block_placed { typeId, wave }` — reveals which blocks are dead weight
- `tech_bought { nodeId, level }`
- `ad_offered` / `ad_watched` / `ad_completed { placement }`
- `defeat_cta { upgrade | defend_again | rebuild }`

The two numbers that matter most: **median wave reached in run 1** (moves with
items 2, 4, 8) and **runs per session** (moves with items 1, 3, 15).
