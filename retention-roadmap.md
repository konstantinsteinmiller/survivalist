# Survivalist — retention roadmap

Eighteen features, ranked by *impact per hour of work*, aimed at four numbers:

* **D1** — do they come back tomorrow?
* **APT** — average playtime per session
* **Pick-up** — how fast a brand-new player understands the game
* **Put-down resistance** — how hard it is to stop after a run ends

Each item states the metric it moves, the concrete implementation (real files in
this repo), the effort, and the risk of it backfiring. Nothing here is
speculative UI — every one of them can be built on the systems that already
exist (`useSurvivalGame.ts`, `useVfx.ts`, `useGameAudio.ts`, `useUpgrades.ts`).

> **Read this first.** The single biggest retention risk this game had was not
> on the list below: it was that **nothing on it could be lost**. Thirty-stage
> career simulations (`tests/sim/CAREER.md`) found every competent player
> clearing the whole campaign on any purchasing strategy, with the boss dying
> before its first swing from stage 8 on. Players churn when a game frustrates
> them; they also churn, more quietly, when nothing has threatened them for
> twenty stages. That is fixed (proportional bites, boss guard phases, boss
> rage), and it is the prerequisite for everything here — a milestone chest is
> worthless if the milestone was never in doubt. **Re-run the career study after
> any balance change**, because none of these features can be judged against a
> game that plays itself.

---

## Tier 1 — build these first (highest impact, ≤ 1 day each)

### 1. Kill the dead air between runs
**Moves:** put-down resistance, APT · **Effort:** 2 h · **Risk:** low

The result screen is currently a full stop: the player must read it and press a
button. A runner's whole retention model is that the next attempt starts before
the decision to stop is made.

*Implementation:* in `GameScene.vue`, add a 2.5 s auto-advance on the result
overlay — a thin radial timer on the primary button that fires `onNext()` /
`onRetry()` when it completes, cancelled by any pointer-down. Keep the buttons
for players who want the shop. Measure: % of sessions with ≥ 3 consecutive
stages (expect a large jump).

### 2. Milestone chests every 5 stages
**Moves:** D1, put-down resistance · **Effort:** 3 h · **Risk:** low

A goal 2–3 stages ahead is the single cheapest way to stop a session ending at
stage 7. The HUD's progress rail already exists; it just has nothing beyond the
current stage.

*Implementation:* add `nextMilestone(stage)` to `src/game/survival.ts` (every 5
stages, coin payout scaling with the stage). Show a small chest chip beside the
stage label with "2 stages to go", and on the result screen replace the coin
readout with a chest-opening sequence when the milestone lands (reuse
`spawnCoinExplosion` in `useCoinExplosion.ts`). Persist claimed milestones under
a new `ts_milestones` key in `src/keys.ts`.

### 3. A free revive at the boss, once per stage
**Moves:** APT, D1 · **Effort:** 3 h · **Risk:** medium (can devalue failure)

Wiping at 90 % of a stage is the most common rage-quit point in this genre.

*Implementation:* when `finishRun(false)` fires and `progress01 > 0.75`, offer
"Rally!" on the result screen: restore 40 % of `peakSquad`, respawn at
`arenaY - 12`, and set a per-stage flag so it cannot be used twice. The
simulation already supports this — `startStage` + `debugAddUnits` is 90 % of the
code path. Gate it to once per stage so the loss still means something.

### 4. First-15-seconds scripted opening
**Moves:** pick-up, D1 · **Effort:** 3 h · **Risk:** low

Stage 1 already opens with a clear run, one unthreatened gate and one crate
(`buildTrack`'s hand-shaped opening). Go further: make the FIRST gate pair
`+1 | +1` with a deliberately slow approach so the player watches the number
climb twice before reaching it, and hold the "Tap to move" hint until they
actually move.

*Implementation:* `src/game/track.ts` — extend the opening clear zone to 20
units and drop the first gate's `y` to 18; in `GameScene.vue` gate the second
hint (`gate`) behind `hintsDone.has('move')`. Measure: % of first sessions that
reach the stage-1 boss (target > 85 %).

### 5. Combo meter for uninterrupted growth
**Moves:** put-down resistance, APT · **Effort:** 4 h · **Risk:** low

Give the player a reason to play *well* rather than merely survive: a streak
counter that ticks up for every gate passed without losing a survivor, and
resets on a death. Each streak level raises coin gain by 10 % and pitches the
gate-tick ladder up a fifth.

*Implementation:* a `streak` ref in `useSurvivalGame.ts`, incremented in the
gate-crossing branch and zeroed in `killUnit`. Feed it into `playFx('gateTick',
value + streak * 2)` (the pentatonic ladder in `useGameAudio.ts` already handles
arbitrary steps) and show it as a chip under the stage label.

---

## Tier 2 — depth that keeps week-one players (1–3 days each)

### 6. In-run weapon pickups
**Moves:** APT, put-down resistance · **Effort:** 2 d · **Risk:** medium

Every run currently plays the same; only the numbers change. Add three
temporary weapons dropped by crates (~25 % of crates): **shotgun** (three-round
spread, half rate), **laser** (piercing beam that damages everything in the
column), **mortar** (arcs over barricades). 20-second timer, visible as a ring
on the HUD.

*Implementation:* a `weapon` field on the run state; `stepShooting` branches on
it for the emission pattern, `resolveBullet` gains a `pierce` flag. Draw the
variants in `drawBullets`. This is the highest-variance-per-hour feature in the
list — it is what makes run 40 feel different from run 4.

### 7. Gate variety pack
**Moves:** pick-up (readability), put-down resistance · **Effort:** 1 d

Four new leaf types, all reusing the existing gate frame and number plate:
`−N` (trap, drawn in red), `×N` with a shrinking timer, a **locked** gate that
must be shot to full before it opens, and a **mystery** gate that resolves on
contact. Two per stage maximum — the `+N` gate must stay the default or the
core loop blurs.

*Implementation:* extend `GateOp` in `src/game/survival.ts` and the
`gatePair()` roller in `track.ts`; the renderer switches its tint table on the
op.

### 8. Rescue cages
**Moves:** APT, pick-up · **Effort:** 1 d

Caged survivors on the roadside that break open for a flat `+5`. It is a second
reason to steer off the racing line, it reads instantly, and it costs one new
entity type.

*Implementation:* a `Cage` entity mirroring `Crate` (hp, position), paying
`spawnUnit` on death rather than damage.

### 9. Boss phase two
**Moves:** put-down resistance, APT · **Effort:** 1 d

At 50 % health the boss should change behaviour — faster slams, a charge down
the lane, and a colour shift. Right now the fight has one idea and reveals it in
the first four seconds.

*Implementation:* `stepBoss` in `useSurvivalGame.ts` — add `enraged` state at
`hp / maxHp < 0.5`, halve `slamCd`, add a telegraphed lane-wide charge; the
renderer already flashes on `boss.flash` and can tint on `enraged`.

### 10. Squad skins bought with coins
**Moves:** D1, conversion · **Effort:** 1 d

The coin sink is currently pure power, which caps at "maxed". Cosmetic outfits
give coins a second job and make the crowd personal.

*Implementation:* `heroSprites.ts` already bakes per-outfit strips from a small
`OUTFITS` table — a skin is three hex colours plus a name. Add an `ts_skin` key,
a tab in `UpgradeModal.vue`, and pass the chosen outfit set into
`outfitIndex()`.

### 11. Daily expedition
**Moves:** D1 · **Effort:** 1 d · **Risk:** low

One special seeded stage per day with a fixed layout for everyone and a 3× coin
payout — a reason to open the game tomorrow that is not a login popup (the user
explicitly does not want daily-login modals, and this is the version that
respects that).

*Implementation:* `buildTrack(seed)` is already a pure function of an integer —
pass `YYYYMMDD` as the seed. One chip on the HUD, one flag in the save.

### 12. Endless mode after stage 20
**Moves:** put-down resistance, APT (whales of playtime) · **Effort:** 1 d

Past stage 20 the difficulty curve flattens into infinity: same generator, HP
scaling continues, and the only score is "how far". Add a personal-best line
drawn on the progress rail.

---

## Tier 3 — polish and instrumentation (do continuously)

### 13. Haptics on mobile
**Moves:** juice, pick-up · **Effort:** 1 h · **Risk:** low

`navigator.vibrate(8)` on a gate tick, `vibrate(25)` on a gate pass,
`vibrate([40, 30, 60])` on a boss slam. Gate it behind a settings toggle and
`mobileCheck()`. Cheap, and it is the single most underused juice channel on
phones.

*Implementation:* one `haptic()` helper called from `applyFx` in
`useSurvivalArt.ts`, beside the existing `playFx` calls.

### 14. Music that follows the squad
**Moves:** juice, APT · **Effort:** 2 h

`useSound.ts` already exposes `setMusicRate()`. Drive it from squad size:
`1.0 + min(0.18, squad / 600)`, plus a hard drop to `0.85` for the two seconds
after a wipe. The track speeding up as the crowd grows is felt long before it is
noticed.

### 15. Screen-space crowd counter pop
**Moves:** juice · **Effort:** 2 h

When the squad crosses 25 / 50 / 100 / 200, punch the HUD counter and fire a
one-shot fanfare. Round numbers are free dopamine and they give the player a
vocabulary for their own runs ("I got to 200").

### 16. Performance headroom for 200+ crowds
**Moves:** APT on low-end Android · **Effort:** 1 d

Currently the crowd is sorted every frame (`order.sort` in `useSurvivalArt.ts`)
and each survivor costs a `drawImage` plus a shadow ellipse. Two easy wins:
bucket-sort by `y` into 16 bands instead of a comparison sort, and draw the
shadows for the whole crowd in ONE path (`ctx.beginPath()` + N `ellipse()` calls
+ one `fill()`). Expect ~25 % of the crowd's frame cost back.

### 17. Analytics that can actually answer "why did they stop?"
**Moves:** everything (measurement) · **Effort:** 4 h · **Risk:** none

Without these the rest of this list is guesswork. Emit: `stage_start`,
`stage_end{cleared, stage, peakSquad, damage, durationMs}`,
`gate_pass{value, op, gain}`, `wipe{stage, progress01, cause}`,
`shop_open{coins}`, `upgrade_buy{id, level}`. The wipe *cause* (foe / barricade
/ boss slam) is the one that tells you which system to tune.

*Implementation:* a thin `track(event, props)` in `src/use/useAnalytics.ts`
that forwards to whichever portal SDK is active (each already has an event API)
and no-ops elsewhere.

### 18. Share card for a best run
**Moves:** organic acquisition, D1 · **Effort:** 1 d

On a new record, render a 1080×1080 canvas (stage, peak squad, the crowd
silhouette) and offer `navigator.share`. Portal traffic is not viral, but the
card doubles as the promo art pipeline for store listings.

---

## What NOT to build

* **A daily-login calendar / battle pass / achievement wall.** They were removed
  from this build on purpose. They add sessions on paper and dilute the loop in
  practice — every one of them is a screen between the player and the road.
* **A pre-run loadout screen.** The game's biggest asset is that it starts
  playing in under a second. Anything that adds a decision before the first
  gate costs more than it returns.
* **Rewarded-video buttons in the HUD.** Also removed deliberately. If ads come
  back, put them at the natural break (between stages), never mid-run.

---

## Suggested order of work

1 → 4 → 2 → 3 → 5 (one week: the "one more run" loop is complete)
→ 17 (measure) → 6 → 9 → 7 (two weeks: the runs stop feeling identical)
→ 10 → 11 → 12 (the reasons to come back) → 13 – 16 (continuous polish).
