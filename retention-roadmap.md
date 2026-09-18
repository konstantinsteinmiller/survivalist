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

> **Shipped 2026-09-09, as one onboarding pass** (see the *Poki fit test*
> block in `game-implementation-plan.md` for the measurements behind it):
> **#1** ~~auto-advance ring on the result screens of stages 1–5 (6 s,
> cancelled by any touch; none from stage 6 on)~~ — **deleted 2026-09-13 after a
> playtest, and replaced by a five-second bounce on the forward button; see
> item 19 for what it cost**; **#3** the free rally, automatic and silent, once per stage on
> stages 2–3 for a first session; **#2** re-cut as the **gift ladder** — a
> weapon choice into stage 3, the shield into stage 4, a weapon on the road
> every other stage from 4, promised on every banner and on a HUD chip, with
> the beats marked on the progress rail; **#4** finished — the opening
> doorway stands inside the first screen and races under the crowd's fire
> while the controls lightbox is up. Continuous handover now runs through
> stage 3, so the first result screen lands after stage 4.

> **The ladder's two late gifts are ESCAPE HATCHES, and are priced as such
> (2026-09-12).** Frost Nova (stage 7) and the Decoy Flare (stage 10) are strong
> enough to decide a fight on their own, and on the grenade's thirty-second
> clock a boss could be frozen or lured two or three times over — which turned
> "how do I survive this" into "press it again in half a minute". The nova now
> waits **90 s** and freezes for **2.6 s** (was 3.5: long enough to outlast the
> wind-up it was pressed to escape, not long enough to read the road,
> reposition and come back); the flare waits **75 s**. The grenade and the
> shield keep the thirty seconds — they are the run's rhythm, not its way out.
> Numbers in `game/skills.ts`, picked per skill by `skillCooldownMs`. The
> career study cannot judge this: its scripted policies never press a skill.

### 1. Kill the dead air between runs — **SHIPPED**
**Moves:** put-down resistance, APT · **Effort:** 2 h · **Risk:** low

The result screen is currently a full stop: the player must read it and press a
button. A runner's whole retention model is that the next attempt starts before
the decision to stop is made.

*Implementation:* in `GameScene.vue`, add a 2.5 s auto-advance on the result
overlay — a thin radial timer on the primary button that fires `onNext()` /
`onRetry()` when it completes, cancelled by any pointer-down. Keep the buttons
for players who want the shop. Measure: % of sessions with ≥ 3 consecutive
stages (expect a large jump).

*Taken further, 2026-09-11 — the road itself stopped stopping.* Playtests put
**a quarter of the players who killed the stage-1 boss** out of the game right
there: the kill reads as the end of the session unless something is handed over
in the same breath. So stage 1 now skips the win screen and the chest entirely
and reveals the launcher the boss drops (`presentBossReward`, closes itself at
three seconds), and every clear through stage 3 hands over with no screen at
all — `advanceStage` re-bases the world instead of reloading the level, so the
crowd walks on from the ground it won, with the boss lying where it was shot
(`monsterDeathFrame` plays a real fall, drawn by the same rigs that walk, and
the violet pool is what says "fallen" rather than "lying down"). The next stage
is running before the player has decided whether to stop.

⚠ **A stage that never stops still has to be counted.** With the road
continuous, `phase` passes `'boss' → 'clear' → 'run'` inside a single tick and
no watcher sees gameplay end, so the portals were told neither that the play
finished nor that the next one began — a twenty-stage career arrived at
CrazyGames and Poki as one endless play, which is the number their funnels are
built on. `restartGameplayBracket()` (in `useGameplayLifecycle`, called from
`continueRoad`) is what a seamless handover says instead; it no-ops when a
screen already closed the bracket, because a redundant pair is what costs Poki
a bad event. Anything else that keeps the road running — a revive, a stage
skip, endless mode — owes the same call.

### 2. Milestone chests every 5 stages — **SHIPPED (2026-09-12)**
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

*As built:* the rules are pure and live with the other payouts
(`isMilestone` / `nextMilestone` / `milestoneReward` in `game/survival.ts`);
the lump is `60 + stage × 25`, roughly one good stage's income and deliberately
LINEAR, because the shop's own costs grow 1.38–1.55 a level and a compounding
milestone would become the income the ladder is balanced against.

Two departures from the text above, both deliberate. The chip wears a **star**,
not a chest: the idle treasure chest is a button ten pixels away on the same
screen, and two different things may not wear the same drawing. And the lump is
a SEPARATE line on the result screen rather than a chest-opening sequence over
the coin readout — `coins` is what the road paid and the milestone is what the
COUNTDOWN paid, and folding them together would make the number the player was
promised disappear into a bigger one at the moment it arrived.

The ledger is one monotonic number (`ts_milestones` = highest milestone paid),
which is the only shape that cannot pay twice whichever of two saves wins a
cloud merge. Pinned by `tests/game/milestones.test.ts`, including a real
stage-5 clear through the balance harness's own `optimal` policy.

*One consequence worth knowing:* an existing save is **not** paid retroactively.
A player sitting on stage 12 when this shipped starts counting at 15 rather than
collecting 5 and 10 they already walked past — which is the right answer (the
countdown is the feature, and there was no countdown behind them) but it does
mean the first milestone an existing player sees is up to four stages away.

### 3. A free revive at the boss, once per stage — **SHIPPED** (first session only)
**Moves:** APT, D1 · **Effort:** 3 h · **Risk:** medium (can devalue failure)

*As built:* no button and no screen. The sim asks a policy the scene installs
(`setRallyPolicy`), and the scene answers "**70 %** of the peak squad, at least
3" on stages 2–3, past 75 % of the road, once per stage, only while the player
has never cleared stage 3. Stage 4 keeps the real floor.

*Revised after playtest, and both halves of the revision matter:*

- **40 % was not a rescue.** Two fifths of a peak squad comes back too thin to
  survive the stretch of road that had just killed it, dies again within
  seconds, and reads as the game teasing the player. The point of this feature
  is a first stage-2 CLEAR, not a longer stage-2 death, so the share is now 70 %
  — a squad that can actually finish.
- **An unexplained gift is worth less than nothing.** It shipped announced by
  one word on the stage banner, *Rally!*, which names the mechanic without
  explaining it: survivors reappeared a frame after the last one died and the
  honest reading was that the game had glitched. It now says who saved you and
  how many came back — *"A guardian angel saved you! / 40 survivors are back"* —
  under the boss rail for three seconds (`GuardianBanner.vue`), over an in-world
  miracle anchored to the crowd rather than to the road: a column of light, a
  halo bobbing over the squad, ground rings, and feathers falling through rising
  sparks (the `rally` VFX case and `drawRallyHalo`). The halo lasts 1400 ms
  against the 1500 ms of collision immunity a rallied crowd gets, so the light
  going out is also the readout for the grace period — which nothing previously
  taught, and which had the same "is this broken?" failure mode as the rally
  itself.

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

### 7. Gate variety pack — **SHIPPED**, the last leaf on 2026-09-12
**Moves:** pick-up (readability), put-down resistance · **Effort:** 1 d

Four new leaf types, all reusing the existing gate frame and number plate:
`−N` (trap, drawn in red), `×N` with a shrinking timer, a **locked** gate that
must be shot to full before it opens, and a **mystery** gate that resolves on
contact. Two per stage maximum — the `+N` gate must stay the default or the
core loop blurs.

*Implementation:* extend `GateOp` in `src/game/survival.ts` and the
`gatePair()` roller in `track.ts`; the renderer switches its tint table on the
op.

*As built, over three passes.* `−N` and `×N` landed with the op set
(`GateOp = add | sub | mul | div`), and the "locked" gate became something
better than a gate that must be shot open: the **pump**, where fire raises any
door's number, so a bank is an investment rather than a reading test. The
locked PAIR — two banks a bank-length apart, the door chosen at the first one
being the lane run through the second — is the shape that carries "commit
early", about one stage in six from stage 8.

The **mystery** leaf closed the set on 2026-09-12, and it is the only one that
is not arithmetic. One leaf of a bank is drawn face-down as a `?`; the op and
value underneath are rolled and paid the ordinary way. Four rules keep it a
decision rather than a coin flip: never alone on a bank (there is always a
readable offer beside it), never on a dilemma where both doors already take
something, never pumpable — fire raises a number, and a number nobody can see
cannot be raised in front of them — and never before stage 9, because a
face-down door is only interesting to somebody who knows what a face-up one is
worth. The leaf hidden is the WORST one: hiding the best offer would only ever
punish a player for reading well, while a hidden bad door is a real question.
At most one bank a road, ~0.08 per bank, on its own RNG stream so it cannot
re-roll the campaign. `tests/game/mysteryGate.test.ts`.

*Redesigned 2026-09-18, to the owner's spec — the paragraph above is history.*
The `?` is now a **black door** with one dressing for everything it can hide
(the add frame blackened, a shut black curtain, a dark plate), and it can hide a
fifth thing: the **shield** — the roadside shield box's one-shot absorb, for the
rest of the stage. Its content is **designed, not rolled**: hand-placed on
stages 2-15 (`hide()` / `shieldPrize()`), and on a pure schedule above that
(`mysteryPlanFor`: a single on two stages in six, rotating best / worst /
shield). The debut moved from stage 9 to **stage 2's first bank, and it pays**
— a novelty beat in the minute after the first boss, which is one of the
fit test's biggest drop-off points. It may now hide the BEST door as well as
the worst. And rarely both doors of a pair go face-down — the **blind pair**, a
forced gamble, at most once in any three stages (authored on 6 and 12, then
every stage ≡ 3 mod 6 from 21), always with one door that pays. Resolving a bank
turns every `?` over like a card before the losers break, so the player sees
what they walked past. The rules and placements are in the header of "The
face-down door" in `game/track.ts`.

### 8. Rescue cages — **SHIPPED**, with a curve instead of the flat +5
**Moves:** APT, pick-up · **Effort:** 1 d

Caged survivors on the roadside that break open for a flat `+5`. It is a second
reason to steer off the racing line, it reads instantly, and it costs one new
entity type.

*Implementation:* a `Cage` entity mirroring `Crate` (hp, position), paying
`spawnUnit` on death rather than damage.

*As built*, the flat `+5` did not survive being measured against the thing it
competes with. `gateAddBase` runs 8 / 10 / 13 / 18 / 24 / 41 at stages
6 / 8 / 12 / 20 / 30 / 60, so a flat five is **63 % of a door at stage 6 and
12 % at stage 60** — a five-fold decay against an approach cost that does not
decay at all. That is the "decisive at 3, invisible at 30" shape, so the payout
became `max(5, round(gateAddBase(stage) × 0.6))`: it reproduces the roadmap's
number exactly at the debut stage (0.6 × 8 = 4.8 → 5) and holds ~60 % of a door
forever. Capped under a door's face value, so a cage is never the correct line.

Placement is a pass over the FINISHED road rather than a beat, which is what
keeps the hand-authored stages 1–15 untouched: one cage per stage from stage 6,
six units in front of a gate bank, on the shoulder away from that bank's best
leaf (ranked with the same `offerScore` the coin trails use) at 2.9 from the
centre — 1.25 units clear of a full-size crowd sitting dead centre, so a
zero-input run can never collect one. Coverage is 74 of 75 stages; the pass
declines rather than jam a prop behind a wall or across the weapon puzzle's
firing lanes.

It reads apart from a crate by silhouette (tall, with bars breaking the
outline, against the crates' squat block), by light (lit from INSIDE by a warm
lamp — light coming out of a dark shape, the inverse of a crate's lit face) and
by wear (bars bend and the prop rattles; a crate cracks and tumbles). It grinds
on contact exactly like a crate, deliberately, so the player never has to work
out which box is which before deciding a detour is safe.

### 8b. The auto-shield pickup ("bulwark") — **SHIPPED**, requested directly
**Moves:** put-down resistance · not from this roadmap

A roadside box that arms a one-shot absorb: the next BIG blow is vetoed whole,
and the pickup is spent. Not a timer — the game already has a timed shield
skill, and the two now divide the work along a line worth remembering: **the
skill answers bodies, the bulwark answers blows.** The bulwark is asked first
because it is the only one of the two that CAN be — a blow is only vetoable
atomically, before any body is billed, whereas the skill's halving lives inside
`killUnit` where the blow no longer exists as an object.

"Big" is `n > squad × 5 %` **and** `n ≥ 3`, where the floor is `BOSS_MIN_KILL`
— reused rather than invented, because 3 is already this game's definition of a
real hit. That excludes the case this was specified against twice over: a
ten-strong squad losing one body to a barricade is 10 % of the crowd but 1 < 3.

The hard part was that losses run through `killUnit` one body at a time, so
"count the dead this frame" mixes two sources and refunds a loss already taken.
Every area attack now evaluates its victim set FIRST — slam, charge, rake,
meteor, bolt burst, bomber, roller, sweep, bite, wall and boulder contact,
passage rib, body-check. One source honestly could not be pre-counted: the
gunner's round bills across frames as it travels, so no instant holds a victim
set describing the whole hit; it is measured by INTENT (the budget fixed when
the gunner fired), asked once, and the cost of that choice is written at the
call site. Grind damage and hostile gates are deliberately never asked — a
grind is a rate, not a blow, and absorbing a `÷N` would make a bank's decision
optional.

### 9. Boss phase two — **SHIPPED**, and not off a health threshold
**Moves:** put-down resistance, APT · **Effort:** 1 d

At 50 % health the boss should change behaviour — faster slams, a charge down
the lane, and a colour shift. Right now the fight has one idea and reveals it in
the first four seconds.

*Implementation:* `stepBoss` in `useSurvivalGame.ts` — add `enraged` state at
`hp / maxHp < 0.5`, halve `slamCd`, add a telegraphed lane-wide charge; the
renderer already flashes on `boss.flash` and can tint on `enraged`.

*As built*, three of those four instructions turned out to be wrong in this
codebase, and the reasons are worth keeping:

- **The turn hangs off the existing guard gate, not `hp/maxHp < 0.5`.** A bare
  threshold and the 0.33 gate land on the SAME TICK for a squad that puts a
  third of the bar in per frame — the exact case `damageBoss`'s clamp exists for
  — and worse, a threshold *un-crosses*: there is a healing archetype whose
  entire job is to push the bar back up. `BOSS_ENRAGE_AT` is therefore a bound,
  not a trigger: the fight turns at the first gate at or below half, which is
  already the beat whose own cue comment says "the last third is not the same
  fight as the first". The gate counter only counts up, so the latch is
  monotonic by construction. Stage 1 is excluded — its single gate sits at
  exactly 0.5 and it is the tutorial.
- **Halving the cooldown is not survivable.** `SLAM_CD_MIN` (0.95 s) is the
  point where the cooldown drops under the wind-up, and `SLAM_TELEGRAPH`'s note
  already records that 0.62 s of warning measured a 0 % clear rate. Phase two
  instead moves the boss down the curve it was already climbing (×0.7 at once
  rather than over nine swings), floor untouched — and the multiplier is divided
  by `endlessPressure(stage)`, so the ADDED crowd loss is ~0.43 at stage 4 and
  ~0.35 at stage 120 instead of doubling with depth.
- **The charge goes to `meteor` and `claw` only.** The healer's cycle is a
  two-way decision with a measured gap invariant and the summoner has no attack
  clock at all; hijacking either is how those invariants rot. Both still get the
  tempo, the colour and the sound.

The charge honours the travelling-telegraph contract: 1.5 s minimum wind-up
(against the slam's 0.75 s, because dodging it is a 3.55-unit lateral commitment
rather than a step), and the last 0.38 s of the warning is the BODY running down
the lane rather than a mark on the floor. The lane is locked at the boss's own x
with no lead — leading a column would move the answer while the player is on
their way to it.

### 10. Squad skins bought with coins
**Moves:** D1, conversion · **Effort:** 1 d

The coin sink is currently pure power, which caps at "maxed". Cosmetic outfits
give coins a second job and make the crowd personal.

*Implementation:* `heroSprites.ts` already bakes per-outfit strips from a small
`OUTFITS` table — a skin is three hex colours plus a name. Add an `ts_skin` key,
a tab in `UpgradeModal.vue`, and pass the chosen outfit set into
`outfitIndex()`.

### 11. Daily expedition — **SHIPPED**
**Moves:** D1 · **Effort:** 1 d · **Risk:** low

One special seeded stage per day with a fixed layout for everyone and a 3× coin
payout — a reason to open the game tomorrow that is not a login popup (the user
explicitly does not want daily-login modals, and this is the version that
respects that).

*Implementation:* `buildTrack(seed)` is already a pure function of an integer —
pass `YYYYMMDD` as the seed. One chip on the HUD, one flag in the save.

*As built* (`useDailyExpedition.ts`, `DailyExpedition.vue`), with four decisions
the line above does not contain:

- **The clock is UTC.** Local time makes "the same road for everyone" false —
  two players at the same instant get different roads — and lets one player take
  two expeditions against one real day by crossing their own midnight twice.
  The cost is honest and visible: the day flips at 01:00 in Europe and mid-
  afternoon on the US west coast, so the spent chip shows a live countdown to
  the next road rather than the word "tomorrow". This deliberately disagrees
  with the daily chest, which is local on purpose: a per-player allowance
  belongs in that player's day, a shared object needs a shared clock.
- **The flag records the day the run STARTED**, flushed before the first frame.
  A flag written on completion lets a losing player reload the tab and take the
  identical road again knowing everything they just learned.
- **The stage is 16** — the first rung the generator authors itself. Anything in
  1–15 dispatches to a hand-authored road, and every day would print the same
  teaching stage. It carries no autobalancer, so it is the same fight for
  everyone on the same seed.
- **The ×3 is applied once, to that run's own total**, and the rewarded video is
  priced off the un-multiplied figure — otherwise the two compound into 9× on
  one screen a day and re-price the whole upgrade curve. The expedition writes
  no campaign stage, no best-stage, no streak, no failure ledger, and posts
  nothing to the board.

There is no menu in this game — it boots straight into a run — so the chip lives
in the HUD's bottom-left meta cluster, and because that puts it beside settings
during live gameplay, the first tap only arms it: one stray touch would abandon
the run AND burn the day.

### 12. Endless mode after stage 20 — **SHIPPED**, and not the way it is written here
**Moves:** put-down resistance, APT (whales of playtime) · **Effort:** 1 d

The plan was "the curve flattens into infinity: same generator, HP scaling
continues". Measured, that is exactly what the game already did — and it is the
version that does not work. Fourteen generator knobs plateaued between stages 17
and 34, so a stage-100 road was a stage-34 road with more enemy health: the same
beat spacing, the same pack size, the same three-leaf frequency, forever. HP
scaling alone is not a difficulty curve, it is a multiplier on one.

What shipped instead keeps every knob climbing (see the endless entries in
`game-implementation-plan.md`), fixes two hard breaks that only exist at depth
(`MAX_SQUAD` overrun at stage 86, identical gate doors from stage 161), and
uncaps the three shop tracks that are not physically bounded — a benchmark
career reached stage 80 with everything maxed and 893 063 coins unspent.

Still outstanding from this item: **the personal-best line on the progress
rail.** The number itself is persisted and posted (see the global board), it is
simply not drawn on the rail yet.

---

## Tier 3 — polish and instrumentation (do continuously)

### 13. Haptics on mobile — **SHIPPED**
**Moves:** juice, pick-up · **Effort:** 1 h · **Risk:** low

`navigator.vibrate(8)` on a gate tick, `vibrate(25)` on a gate pass,
`vibrate([40, 30, 60])` on a boss slam. Gate it behind a settings toggle and
`mobileCheck()`. Cheap, and it is the single most underused juice channel on
phones.

*Shipped as* `src/use/useHaptics.ts`, called from `applyFx` beside the `playFx`
calls, with three cues named for what the HAND feels rather than for the event:
`tick` (8 ms), `reward` (25 ms), `impact` (`[40,30,60]`). Two things the plan
above did not anticipate:

- **The `÷N` trap door takes `impact`, not `reward`.** The renderer already
  grades that door as a hit; a payout tap there would be the motor telling the
  player they gained something while the screen tells them they lost.
- **It needs a tighter throttle than the mixer does.** A gate tick fires up to
  ~25 times a second across three leaves, and a motor with a ~20 ms spin-down
  turns that into one continuous buzz. Capped at ~6/s, which leaves a stage-1
  pump entirely intact.

It refuses on the same gates the sound does (paused, ad-suspended, platform
mute, mobile mute) plus availability — iOS Safari has no API and desktop Chrome
has a no-op one, so the settings row only renders where a motor exists, on the
**General** tab because the Audio tab is dropped on touch devices.

### 14. Music that follows the squad — **SHIPPED (2026-09-12)**
**Moves:** juice, APT · **Effort:** 2 h

`useSound.ts` already exposes `setMusicRate()`. Drive it from squad size:
`1.0 + min(0.18, squad / 600)`, plus a hard drop to `0.85` for the two seconds
after a wipe. The track speeding up as the crowd grows is felt long before it is
noticed.

*As built:* exactly that, with one correction the spec above hides. Written
literally, `min(0.18, squad / 600)` saturates at **108** survivors — a number
most runs pass inside two stages — so the tempo would have been pinned at
maximum for nine tenths of a career and the feature would have been a constant
rather than a signal. The shipped curve is `RANGE × min(1, squad / FULL)`, which
rises linearly to +18 % at 600. Driven off `squadCount` rather than the frame
loop, so a gate that spawns forty people costs one assignment; the wipe drop is
a two-second hold that overrides it. A test caught the saturation bug, not a
listen (`tests/game/resultFlow.test.ts`).

### 15. Screen-space crowd counter pop — **SHIPPED**, and the ladder had to keep going
**Moves:** juice · **Effort:** 2 h

When the squad crosses 25 / 50 / 100 / 200, punch the HUD counter and fire a
one-shot fanfare. Round numbers are free dopamine and they give the player a
vocabulary for their own runs ("I got to 200").

*Shipped* with the ladder DOUBLING past 200 — 25, 50, 100, 200, 400, 800,
1600 — rather than stopping there or stepping by a fixed amount. The four
numbers in the plan already are a doubling ladder, and this squad grows
multiplicatively (`GATE_MUL_MAX` is 3): one door can cross eight fixed
thresholds in a single frame, while a stage-2 player creeping 30 → 60 would
collect nothing. Doubling prices every rung at the same *relative* achievement,
and a four-figure run collects six or seven across it.

The state is one number (the highest rung announced), not a set, which buys
three properties for free: a squad oscillating around 100 is silent, a
wipe-and-rally back to 300 announces only 200, and a ×3 from 300 → 900
announces 800 alone. It re-arms on a stage change AND on `phase` re-entering
`run` from a result — two signals, because a retry repeats the stage number and
a stage jump can skip the result screen.

The fanfare is **synthesised**, not one of the four shipped samples: every one
of them already means something else (`celebration-1` = stage cleared,
`celebration-3` = boss dead, `reward-continue` = here is a gift), and a
mid-stage chime that sounds like a stage clear tells the player their run just
ended. It is three notes of the game's own pentatonic ladder an octave above
the reward chord, and it brightens with the rung.

### 16. Performance headroom for 200+ crowds — **SHIPPED (2026-09-12)**
**Moves:** APT on low-end Android · **Effort:** 1 d

Currently the crowd is sorted every frame (`order.sort` in `useSurvivalArt.ts`)
and each survivor costs a `drawImage` plus a shadow ellipse. Two easy wins:
bucket-sort by `y` into 16 bands instead of a comparison sort, and draw the
shadows for the whole crowd in ONE path (`ctx.beginPath()` + N `ellipse()` calls
+ one `fill()`). Expect ~25 % of the crowd's frame cost back.

*As built, and the shadow half went further than written.* The sort is a
counting sort into 16 depth bands over the crowd's own y extent — three linear
walks instead of ~1 500 comparator calls through a JS closure. The per-body
shadow was not batched into one path; it was **removed entirely**, at the
owner's call, which makes half of this a rendering decision. It was the least
visible thing in the loop: at crowd size the sprites overlap several times over,
so most patches were drawn underneath the bodies in front of them, and the ones
that showed never merged — two hundred separate pools read as two hundred people
standing near each other, which is exactly what the single pooled gradient under
the whole formation was added to replace. That sheet stays and carries the same
compression term. About 570 canvas calls a frame gone at the top tier.

⚠ **Unmeasured, and this file should say so.** There is no `perf=` variant
behind it, so the claim above is arithmetic and not a timing. `PERF-LEDGER.md`'s
own A/A puts the real game at `workP95 ≈ 4.4 ms` against a 16.7 ms budget at 4×
CPU throttle — by that file's rule, further renderer micro-optimization is
unjustified. The case here is the tail that A/A does not sample (a 200+ crowd on
a real cheap Android) plus the look. See the 2026-09-12 row there for how to
price it properly.

### 17. Analytics that can actually answer "why did they stop?" — **SHIPPED (2026-09-12)**
**Moves:** everything (measurement) · **Effort:** 4 h · **Risk:** none

Without these the rest of this list is guesswork. Emit: `stage_start`,
`stage_end{cleared, stage, peakSquad, damage, durationMs}`,
`gate_pass{value, op, gain}`, `wipe{stage, progress01, cause}`,
`shop_open{coins}`, `upgrade_buy{id, level}`. The wipe *cause* (foe / barricade
/ boss slam) is the one that tells you which system to tune.

*Implementation:* a thin `track(event, props)` in `src/use/useAnalytics.ts`
that forwards to whichever portal SDK is active (each already has an event API)
and no-ops elsewhere.

*What already exists, 2026-09-12:* the portals' own coarse measurement — plays
and playtime, off the `gameplayStart` / `gameplayStop` bracket. It is one
function (`useGameplayLifecycle`), it now covers CrazyGames, Poki AND Playgama
(whose two calls had sat in `playgamaPlugin` with no caller, so that portal saw
sessions containing no plays at all), and it sends a pair per STAGE rather than
per session — see the warning under item 1. That is not a substitute for the
events above: it answers "how long, how often", never "why did they stop".

*As built:* `src/use/useAnalytics.ts`, all six events, wired at the four places
that own them — `startStage` and `finishRun` in the simulation, the gate branch
in `claimBank`, the shop watcher and the buy path. Three things are worth
knowing before anyone reads a number out of it:

- **The wipe cause is the DOMINANT one, not the last one.** `deathBreakdown()`
  already counted every body by cause; a crowd chewed to four by barricades and
  finished by a boss slam is a barricade problem, and billing it to the slam
  sends the next tuning pass at the wrong file.
- **`progress01` was lying on a boss wipe.** It reaches 1 the instant the arena
  opens, so a crowd flattened by the boss's first swing reported 100 %. The
  event keeps the raw road number and the screen reads `reachOf` instead, which
  is the rail the player actually watched: road progress to the arena, then the
  boss's health as the last fifth.
- **Where it goes.** Two sinks, neither load-bearing: a 256-event in-memory ring
  (`window.__analytics()` in debug, which is how a device session is read back)
  and a PROBED portal sink. Most SDKs we ship against have no custom-event API
  at all, so the fan-out looks for one — Poki's `customEvent`, GamePix's
  reporter, a host page's own `gtag`/`dataLayer` — and silently no-ops when
  nobody is listening. It imports no portal module: a static import would pull
  one portal's loader into every other portal's bundle for a probe that reads a
  global anyway. A sink that throws is dropped for the session rather than
  retried on every gate.

⚠ **Nothing is stored or sent anywhere of ours.** The ring dies with the tab.
Until a portal with an event API is the one live, this answers "why did they
stop?" for a device in your hand, not for a cohort.


### 18. Share card for a best run — **BUILT, then TAKEN OUT (2026-09-12)**
**Moves:** organic acquisition, D1 · **Effort:** 1 d

On a new record compared to all pears from the leaderboard on the same stage, render a 1080×1080 canvas (stage, peak squad, the crowd
silhouette) and offer `navigator.share`. Portal traffic is not viral, but the
card doubles as the promo art pipeline for store listings.

*As built* (`game/shareCardArt.ts` + `use/useShareCard.ts`): offered on the
three conditions the result screen already computes — `isRecord`, a real rank
string, and a device that can actually share — so it costs **no new network
request** and nothing at all on a run that is not a record. The crowd is blitted
from the real baked survivor strips through the renderer's own contracts, so the
card is the game rather than a drawing of it, and the whole thing is
deterministic (no `Math.random`, no clock) which is what makes it testable.

*Why it is not in the game (2026-09-12).* On the devices that actually reached
the button, the share sheet had no target that takes a picture, so the only
thing it could do was DOWNLOAD the card. A download is not a share: it tells
nobody about the run, it leaves a stray file on the phone, and it spends the one
action on the result screen that is not the loop. The button is commented out of
`GameScene.vue` — the card renderer, the offer rules and their specs are
untouched, so it comes back in one uncomment if a real share path appears
(a portal SDK share, or an own-domain build where the sheet has somewhere to
go). **The acquisition line of this item is therefore unclaimed**, and the
effort it cost is sunk until then.

Two traps worth keeping:

- **`navigator.share` existing proves nothing on a portal.** It is present
  inside a cross-origin iframe whether or not the parent wrote
  `allow="web-share"`, and `canShare({})` lies — the probe has to be a real
  `File`, and the permissions policy has to be read separately. The blob
  download fallback is offered ONLY on the unframed own-domain build, because a
  sandbox without `allow-downloads` drops it silently, which is exactly the dead
  button this feature must not have. Anything that rejects at runtime retires
  the button for the session.
- **JPEG, not PNG.** The card is a full-bleed gradient over gravel noise —
  PNG's worst case — and a multi-megabyte file hangs a phone's share sheet.

---

---

## Not on the original list, built anyway (2026-09-12 – 2026-09-13)

The first two came out of reading the eighteen against the code rather than out
of the list itself. Everything from #21 came out of putting the build in front
of ten first-time players over two days, which is the better source and is why
four of the six are about the same thing: the game knew something the player
did not, and never said it.

### 19. The result screen closes itself when there is nothing to buy — **BUILT, then DELETED (2026-09-13)**
**Moves:** APT, put-down resistance · **Effort:** 1 h · **Risk:** low

The auto-advance ring from item 1 stopped at stage 5 on a stated reason: a
player on stage 6 has decided to stay, is spending coins between runs, and a
screen that closes itself under them takes a decision away.

That holds exactly while there is something to spend on. `affordableCount(coins)`
was **already computed on that very screen**; when it reads 0 and the ×3 has
been resolved, the screen is a full stop offering one button and nothing else —
at the depth where sessions are long enough to end. The rule is now three lines
of `game/resultFlow.ts` (`shouldAutoAdvance`), pure and specced, with one hard
exception at every depth: never over an unclaimed rewarded video, because six
seconds saved is not worth spending real income. A touch latches a refusal, so
claiming the ×3 or buying a track cannot re-arm a ring the player dismissed.

Zero new copy, which at 21 locales is most of why it was an hour.

⚠ **The whole feature — this item AND the countdown from item 1 — is gone, one
day later, because a playtest measured it.** Five first-time players met the
ring and it cost on three separate counts:

- one tester watched the screen retry itself **while he was still reading it**;
- two more tapped the ×3 AFTER the screen had already moved on, and reported
  "no ad played" — the offer was gone, so the tap landed on the next stage. That
  is the game's primary income, spent to save six seconds;
- and a thumb that looks away for six seconds on a bus loses the offer the same
  way, every time, with no way to tell that it happened.

A button that presses itself cannot tell "this player has stalled" from "this
player is reading", and the cost of guessing wrong turned out to be the one
thing the screen exists to sell. The retention arithmetic that justified it —
*a stranger who meets a full stop leaves* — was not wrong; the remedy was.

What replaced it costs nothing when the guess is wrong: after **five** untouched
seconds the forward button starts to **bounce**. `shouldAutoAdvance` and
`AUTO_ADVANCE_THROUGH_STAGE` are deleted; `game/resultFlow.ts` now holds
`RESULT_BOUNCE_DELAY_MS` and `shouldBounceGo({ onScreenMs, sawInput })`. The new
signature is the argument in one line: the old rule needed the stage, the wallet
and the state of the ×3 because it was **taking an action**, and this one needs
none of them because it is only pointing. The bounce animates the button's face
and depth plate, never its box — measured at 9 px of travel on the face and 0 px
on the button and the row — so nothing moves under a thumb.

### 20. Tell them how close they came — **SHIPPED**
**Moves:** put-down resistance, APT, first session · **Effort:** 3 h · **Risk:** low

A loss said "Stage 9" and stopped there — a full stop dressed as a statistic.
The run knew how far it got all along (`wipeReward` is priced off it); the
number simply never travelled to the screen.

It does now: a thin rail filled to where the crowd fell, a ghost tick at the
best any previous attempt on that stage managed, and the percentage said out
loud — *81 % · BEST 74 %*, or *FURTHEST YET!* when it is a record. A near-miss
is the strongest retry lever a runner has, and here it compounds with the retry
relief (`ts_failed_stages`) that was already firing silently.

The ledger is `ts_best_progress`, same lifecycle as the failure count: written
only on a loss that was actually played, deleted on a clear, because the number
describes an unfinished fight and a stage that has been beaten has none.

⚠ **The scale is not `progress01`.** That hits 1 the instant the arena opens, so
a crowd flattened by the boss's first swing would have printed 100 % over a
wipe. `reachOf` is the rail the player watched — road progress to the arena,
then the boss's health as the last fifth — so taking a boss to a sliver reads
further than arriving at it, which is the distinction the whole readout exists
to make.

### 21. Three seconds on the road, before the loss screen — **SHIPPED (2026-09-13)**
**Moves:** pick-up, put-down resistance · **Effort:** 3 h · **Risk:** low

The oldest open finding in the project, filed twice in a row by two separate
five-tester playtests, in the same words: *nothing says what killed you*. Four
of five testers could not name what had ended a run they had just finished.

The data was never missing. `deathBreakdown()` has counted every loss by cause
for months and #17's `wipe` event has been billing whole runs to `dominantCause`
since it shipped. What was missing was a reason for the player to connect the
answer to anything: the last survivor fell and a result card was on screen
before the body was.

So a wipe keeps the road for three seconds (`WASTED_HOLD_MS`). Nothing had to be
paused to do it — `step` already returns on `'wipe'`, so the world is frozen on
the frame the squad died on — but three things had to be added on top of that
frame: every faller is put straight on the ground in `finishRun` (a body caught
mid-fall would be frozen mid-fall, and on the *last* death that is a survivor
standing bolt upright on an empty road for three seconds), the camera leans in
on the bodies, and the light goes out of the frame from the edges in while a red
**WASTED** lands.

Then the card, carrying a four-word info box: *The boss flattened you*. Amber
rule, warning glyph, one line — the owner's constraint was that **players hate
to read**, so every `result.cause.*` string in all 21 locales is three or four
words and names one noun. `RunSummary.cause` is billed to `dominantCause` (the
system that took the most, not the one that landed last) and is `null` on a
clear, because a win has nothing to explain.

⚠ **The lean is a CSS transform on the canvas, not a change to the renderer's
own scale.** `getScale()` is shared with the coin VFX, the crowd-cash anchor and
the "Boss felled!" label; moving it mid-hold would put all four in different
places.

### 22. The squad turns into the money — **SHIPPED (2026-09-13)**
**Moves:** pick-up, put-down resistance · **Effort:** 3 h · **Risk:** low

Both playtests rated the handover's reading Major: *"Squad 101 → 3"*. A hundred
people the player spent forty seconds collecting vanish between one road and the
next — and they were **paid for**, because `stageReward(stage, peakSquad)` prices
the clear off exactly that crowd. The transaction was never wrong; it was
invisible.

The first fix paid the coins where the player was looking, as one burst from the
formation's centre. Playtest 02 read it as a loss anyway, which is fair: one
puff of gold off one point is a dropped purse, not a hundred people cashing out.

Every survivor now becomes a coin **on the tile it is standing on**, and the
crowd empties from the back of the formation forward as the coins fly to the
wallet (`cashOutSquad` + `spawnCoinTrail`). It fires on the boss kill, inside
the two seconds of "Boss felled!" that were already dead air.

Three things it deliberately does not do, each of which would put the misreading
back:

* it does not splice the bodies out of `units` — `entryFrom` reads the crowd
  that won the stage to decide where the next road opens under it;
* it does not touch `squadCount`, so the HUD keeps printing the number the
  payout was priced against for the whole flight. A chip falling to zero while
  the coins are in the air says *lost* at the exact moment the coins say *sold*;
* it does not pay. `bankCoins` already did.

One payout now gets exactly one picture, and that rule is pure and pinned:
`cardPayout(total, { rewardOfferLive, squadCashed })` in `game/resultFlow.ts`.
The card's own burst stands down when the crowd has already flown, and is
**held** for the ×3 when one is on offer so a successful claim throws the run's
coins and the bonus as one number — which is the number the button was selling.

### 23. The grenade lesson — **SHIPPED (2026-09-13), feature-flagged**
**Moves:** pick-up, difficulty fairness · **Effort:** 5 h · **Risk:** medium

Two playtests found the same hole: nobody works out that the four buttons under
the road are buttons. One tester discovered it at stage 5 from a cooldown number
("*I've been ignoring active abilities this whole run*"); another tapped around
them all session; a third never worked out what the locked slots were for. The
shield is the answer to the boss that walled the best player in the group, and
the players who most needed it were the least likely to have found it.

A pill saying "these are buttons" is one more thing nobody reads. So the game
**stops** instead — once, ever — at the first moment a skill is genuinely the
right answer: the world crawls for three seconds as the first miniboss walks in,
then halts, the grenade's cooldown is cleared, a lightbox dims everything except
that one button, and a gold arrow sits above it and below it. Pressing it
resumes the world at full speed and writes the flag.

⚠ **It teaches on STAGE 1's elite, and the first version had that wrong too.**
`GRENADE_TUTORIAL_STAGE` said 2, on the belief that stage 2 is the first road
carrying a miniboss at all — which is false. `placeMinibosses` gives stage 1
exactly one, the `'tutorial'` rank at 88 % of the road: the beat that REPLACED
stage 1's boss, and the first thing with a health bar a player ever meets.
Teaching on stage 2 put the lesson on the second miniboss and let the first one
go by unanswered, which is the one place it had to land. It is also the better
fight — the climax of the only stage a stranger has played, so the grenade
arrives as the answer to the hardest thing they have been shown.

**And it needs no health tuning there.** The brief was "survives about three
seconds of ordinary fire", because a threat the player deletes by accident
teaches nothing. On stage 2 that needed a ×4: the stage-2 elite is 64 hp and
dies in 0.65–0.93 s for every policy. The stage-1 elite already carries
`MINIBOSS_TUTORIAL` (a premium, not a discount) and measures 258 hp —
4.20 s optimal, 5.30 s good, 5.32 s average, 4.67 s careless, through
`tests/game/tutorialPump.test.ts`. So `GRENADE_TUTORIAL_HP_MUL` is **1**, and
the tuning is the one the road already had. The knob stays at 1 rather than
being deleted: it is what makes the stage safe to move, and a lesson pointed at
an ordinary elite would collapse back under a second without it.

⚠ **This is the most dangerous thing in the codebase and it shipped broken.**
It is the one feature that takes the controls away and will not give them back
until a specific act is performed, which makes it a dead end if the act is not
available — and it was: the lesson started at the elite's **spawn**, forty units
off the top of the screen, and `grenadeTarget` correctly refuses a throw with
nothing in range. The single instruction on screen was also the one act the game
would not accept. **A headless spec could not see it; a browser pass did.** It
now waits until the elite is 12 units out (`GRENADE_TUTORIAL_RANGE`, derived
from `VIEW_HEIGHT × CROWD_SCREEN_Y` so it is on screen on every ratio the game
ships on) **and** the throw is accepted unconditionally while the lesson holds.
Belt and braces, both pinned in `tests/game/grenadeLesson.test.ts`.

Two more properties worth keeping:

* `setGrenadeTutorialAllowed(on)` defaults to **off**, and only `GameScene`
  turns it on. The balance harness, eleven headless specs and the preview
  recorder all drive `step()` with nobody at the controls, and a world that
  stops for them simply never resolves. Same shape as `setRallyPolicy`.
* The crawl exists so a player who already knows what the button is throws one
  inside it and never sees an overlay at all.

### 24. Ads can no longer interrupt a run — **SHIPPED (2026-09-13)**
**Moves:** trust, portal QA · **Effort:** 1 h · **Risk:** low

An interstitial could previously land on any result screen, including a wipe.
It is now gated on a **win**: `maybeShowInterstitial(cleared)` returns
immediately on a loss, so the order is always *kill → celebration → ad →
result*. A player who has just lost a run meets no ad at all.

The rewarded-availability check the platform playbook asks for was already in
place (`canOfferReward` reads `isRewardedReady` and the rate limit on gated
builds); what changed is that the ×3's **picture** now waits for the video —
see #22.

### 25. The primer pill never left the DOM — **FIXED (2026-09-13)**
**Moves:** trust · **Effort:** 1 h · **Risk:** none

Found while verifying #23 in a browser, and it had been shipping for months.
`ControlHint` reported `suppressed: true, shown: false` — correctly — while the
pill sat fully lit on top of the grenade lesson's lightbox, which had dimmed
everything else on the screen.

The cause is two CSS features colliding on one element. `.control-hint` breathes
(`animation: hint-breathe 2.4s infinite`) and its `<Transition>` fades it
(`260 ms`). Vue times a leave off whichever of the two is **longer**, picked the
2.4 s animation, and then waited for an `animationend` that an infinite
animation never fires. The node was dropped from the render tree and left in the
DOM permanently.

`type="transition"` is the whole fix, plus `animation: none` on the leave so the
fade is not an opacity loop fighting an opacity ramp. **`IncomingWarning` had the
identical bug** — `.incoming` is the transitioned root and carries
`incoming-pulse … infinite` — so the attack alarm was equally permanent, which is
very likely the real mechanism behind Playtest 01's "‘Hold still’ and ‘MOVE!’ on
screen at the same time". Both are fixed the same way. The other transitioned
components put their infinite animations on CHILDREN, which Vue does not read.

⚠ **Nothing caught it because `@vue/test-utils` stubs `<Transition>` by
default** and renders its children straight through — so
`tests/game/controlHintSuppressed.test.ts` had four passing assertions about an
element that never actually left the screen. It now pins the attribute
structurally, which is the only level at which jsdom can hold this.

### 26. A dead boss stops promising things — **FIXED (2026-09-13)**
**Moves:** trust, readability · **Effort:** 2 h · **Risk:** low

Every tell in this game is a promise: a ring that says something lands here, a
band that says leave this column, three furrows that say stand in the gaps. The
boss cannot keep any of them once it is dead — and until now they stayed on the
road anyway, through the two-second celebration and into the result screen
behind it.

The simulation was already clean. `bossIsCharging`, `bossIsVarying`,
`bossGazeOpening`, `attackIncoming` and the slam ring all gate on `!b.dead`, and
`killBoss` takes the ward and the eye down explicitly. What survived were the
RENDERER's own transient pools — `casts`, `rakes`, `healTells`, `gazeBeams` —
which go on running their own clocks because nothing in them knows the thing
that armed them is gone.

⚠ **And they cannot expire, which is the part that made it permanent rather
than brief.** Those pools are stepped by `tellDtMs`, which is how far the
SIMULATION advanced — deliberately, so a travelling telegraph lands on the beat
rather than near it (see the two-clocks note in `drawScene`). The kill flips
`phase` to `'clear'`, `step` returns immediately on that, and `simDtMs` is zero
from the death frame onward. `CAST_AFTER_S` and `RAKE_AFTER_S` never elapse. A
quarter-second impact flash becomes a mark that sits there until the next stage
opens — measured in a browser: the claw's struck furrows were still across the
road a full second after the kill, unchanged.

So `clearBossTells` empties them on the `bossDie` event, whole. The cost is the
last frames of one impact flash on the frame the boss died; what it buys is a
road with nothing on it but the body the player is being shown.

**The one thing it must not do is take a MINIBOSS's wind-up with it.** `casts`
is a single shared pool and most of what is in it is somebody else's — a
bomber's fuse, a gunner's line, a scythe's arc — and the arena is not empty of
them: a summoner spawns into it, and a road elite can still be on its leash when
the arena opens. `bossOwnsCast` in `game/bossTells.ts` is the rule that keeps
them apart, pure and total over the union so a new cast kind has to be
classified rather than defaulting into somebody's telegraph being deleted. The
healer's `ward` is deliberately not claimed there: `killBoss` already fades it
through `clearWard`, and cutting it here as well would race two paths at the
same mark on the road.

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

---

## Where the list stands, 2026-09-13

Read against the source tree, not against these headings — three of them were
wrong before the 09-12 pass.

| | |
| --- | --- |
| **Shipped** | 1, 2, 3, 4, 6 (in another shape), 7, 8, 8b, 9, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 25, 26 |
| **Open, declined for now** | **5** (combo meter) and **10** (squad skins) |
| **Built, then taken out** | 18 (share card), 19 (the self-closing result screen) |

**Open from Playtest 02, and not on this list:** the boss's danger zone should
be a filled area on the road rather than a word in a badge (two testers
memorised the dodge distance by dying, one of them the best player in the
group), and stage 6 is priced by the authored curve alone because the adaptive
boss pricing stops at stage 5 — so the fight straight after the hardest one in
the game reads as a faceplant. Those are the two largest things left in either
report.

**The opening is weaker on purpose, 2026-09-13.** `START_SQUAD` is now **one**
survivor and the opening gate's pump caps at **+7** (was 10), on the owner's
call. Measured over eight seeds on stage 1: `average` 8/8, `good` 8/8,
`optimal` 8/8, `careless` 5/8 — so a player who taps at all is untouched, and a
run that never touches the screen is now stopped by the closing elite some of
the time. `tests/sim/balance.test.ts` moved with it rather than loosening: the
old guard pinned "a zero-input run clears stage 1 every time", which was a side
effect of a stronger opening rather than a promise, and it now pins the promise
directly on `average`. Only stage 1 starts at one — `squadBaseAt` holds every
later stage at `STAGE_SQUAD_FLOOR`, because a flat cut walled the `average`
career at stage 11.

**5 and 10 are refusals, not backlog.** The combo meter adds a sixth number to a
HUD that already carries squad, damage, fire rate, the challenge streak and four
skills, and it is the one item on this list whose value the analytics from #17
would settle first — so it waits for a number. Squad skins are cheap in code
(`OUTFITS` and `outfitIndex` already bake per-outfit strips) and expensive in
ART: every hero walk in this build is painted, so each skin is a generation, a
slice, a compress and a re-roll when the model returns a different person.
Price that as art, not as an afternoon.

**Two of the eighteen are now "built, then taken out", and neither was a
mistake of execution.** The share card (#18) worked exactly as designed and had
nowhere to share to; the self-closing result screen (#19) worked exactly as
designed and closed the screen on people who were reading it. Both were reversed
by evidence rather than by taste — one by what devices actually offered, one by
five first-time players — which is the only reason this list is worth keeping.

**Item 6 never matched its own text and is not pending.** The weapon system
shipped as `game/weapons.ts` — gatling and rocket, earned through the
lever-and-armour puzzle and expiring with the stage — rather than as three
crate-dropped weapons on a timer. The spec above is obsolete history.

**The weapon badge is gone with it (2026-09-13).** It named the gun you were
carrying and printed its multiplier, and the owner's call was that *"the real
player does not need a chip stating they have a gatling gun — he sees the
different attack projectiles."* Which is now true in a way it was not when the
badge was written: a gatling round is **red** (`tracerStyle`) and a launcher
throws a rocket with a wake, so a player looking at the road can tell, and a
player not looking at the road was never reading a badge either. What survives
in `WeaponTag.vue` is the two states the rounds cannot say, because both are
about something still out on the road rather than in your hands: the lever
puzzle's live to-do list, and an open gift box ahead marked FREE.
