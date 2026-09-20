# Survivalist — retention roadmap

**Rewritten 2026-09-20, the morning after the fit test passed.** The old version
of this file was a 1 000-line build log of eighteen features, most of them
shipped. The log is kept at the bottom, compressed to one line each; everything
above it is what is still worth building.

The target changed with the test. Until yesterday the job was to clear Poki's
three-minute bar. It is cleared. The job now is **average playtime**, and the
bar to beat is no longer a portal's — it is the genre's.

**If you read nothing else.** One more cleared stage is worth 75–80 seconds of
session, so the work is removing exits, not adding features. In order:
**(1)** read the fit test's histogram — it decides whether the loss is the
stage-1 road or the first result screen, and Poki reads our shape as a
mid-histogram one, which means depth rather than onboarding; **(2)** stop
ending a *winning* run at 2:45 — carry the continuous handover through stage 3
and the first full stop lands at 4:05; **(3)** stop ending a *losing* one with a
screen — show how close it truly was, on the road, and start running again.
Everything after that is depth inside the run: a relief beat before each boss,
gate pairs that stay a real choice, the biggest moment placed late, and a
wordless telegraph for what is coming. No new buttons, no new screens, no new
words.

---

## 1. Where the game stands

**Poki Player Fit Test, Survivalist 5.1.2, 2026-09-20 — PASSED**
500 players · mobile · **3 m 07 s average** · **39 % of sessions over 3 min** ·
**median 33 fps** · categories Shooting + Gun.

Against the genre, that is exactly average and nothing more:

| | ours | the bar |
| --- | --- | --- |
| average session | 3 m 07 s | Poki passes at 3 min and calls **5 min+ "strong"** ([player fit test](https://developers.poki.com/guide/player-fit-test)); GameAnalytics' 2025 median is 3.1–3.5 min, top 1 % is 22 min |
| engaged (> 3 min) | 39 % | Poki passes at 25 % |
| median fps | 33 | 60 is the design target; 33 is the ceiling on everything below |
| comparable genre on CrazyGames | — | Action **13 min / 8.1 % D1**, Hypercasual 8.6 min / 6.0 % ([CrazyGames](https://docs.crazygames.com/resources/monetizing-hypercasual-io/)) |

Poki's own design guide asks for exactly the shape we have — "design quick,
satisfying loops around 3 minutes… make the first minutes brilliant before
making the tenth hour deep", and "games where the player can constantly perform
an action outperform games with waiting and downtime"
([engagement guide](https://developers.poki.com/guide/engagement)). We have the
loop. What we do not yet have is a reason for the fourth and fifth minute.

**The session clock, measured** (career simulation, cheapest buying, medians of
three seeds — `tests/sim/career.ts`):

| stage cleared | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `good`, cumulative | 1:25 | 2:45 | 4:05 | 5:14 | 6:25 | 7:40 | 8:51 | 10:49 | 12:01 | 13:13 |
| `average`, cumulative (retries included) | 2:06 | 3:25 | 4:44 | 5:55 | 7:06 | 8:21 | 10:19 | 11:33 | 13:34 | 15:48 |

Three facts fall straight out of that table, and they set the whole list:

1. **One more cleared stage is worth about 75–80 seconds of session.** To move
   the average from 3:07 to 4:00 we need roughly two thirds of one extra stage
   per player — not a new feature, a removed exit.
2. **The average lands exactly on the first full stop.** Stages 1 and 2 hand
   over continuously; the first result screen arrives at **2:45** (`good`) or
   **3:25** (`average`). The measured average session is 3:07. The number we are
   trying to move *is* that screen.
3. **The median player loses stage 1 once.** `average` needs **2 attempts**
   (2 m 04 s) to clear it, against 1 attempt for `good`. Per-stage attempts:
   s1 **2**, s2–s6 1, s7 2, s8 1, s9 2, s10 **5** (the wall). That is a ~53 %
   win rate for the median player where the genre tunes for
   [70–80 %](https://gamedesignskills.com/game-design/casual/).

**What the road already does** (so nothing below re-proposes it): continuous
handover through stage 2 · gift ladder (weapon split stage 1, shield 4, frost 7,
decoy 10, weapon box every other stage from 4) · four-lane weapon split on
stages 1–3 · silent second wind on the stage-1 boss and on stages 2–3 past 75 %
of the road · milestone coin chest every 5 stages · idle treasure chest on
wall-clock time · daily expedition · endless past stage 20 · leaderboard rank
badge · adaptive boss pricing to stage 5 · retry relief curve · haptics · music
that follows the crowd · squad-milestone pops · coin explosion cash-out ·
first interstitial at 3 min, 2 min floor between them.

---

## 2. The rules this list obeys

1. **No new buttons that open menus or modals.** The game's asset is that it is
   playing within a second of load. Every screen is an exit.
2. **Text-less by default.** Animation, colour, sound, haptics, camera and the
   shape of the road. Text only where it already lives (stage banner, HUD chip).
   Both portals ask for this in writing: Poki — "design tutorials that are
   visual and intuitive rather than text-heavy"
   ([requirements](https://developers.poki.com/guide/requirements-quality));
   CrazyGames — "prioritise visuals and limit the use of text for onboarding"
   ([docs](https://docs.crazygames.com/requirements/quality/)). GameAnalytics
   names text onboarding as a
   [localisation trap](https://www.gameanalytics.com/blog/hyper-casual-game-common-mistakes),
   which for 21 languages is our problem exactly.
3. **Nothing that makes a false state feel true.** No rigged near-miss, no
   celebratory sound on a net loss, no appointment timers, no streak shaming,
   no ad-gated progression. Those are the mechanisms gambling research flags
   ([PMC8144080](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8144080/)), the
   ICO Children's Code forbids reward loops built to keep children playing
   ([std. 13](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/)),
   and Poki rejects the ad-side versions outright. Making a **true** state
   legible faster is craft; making a false one feel true is the line.
4. **Every item names the number it moves and how it is measured** — the career
   sim before the build, the fit test after it.

---

## 3. Step 0 — read the histogram first (free, today)

The fit test ships a **playtime histogram** and **10 recordings with inputs**.
We have two candidate walls and the histogram separates them in five minutes:

* mass in the **0–60 s** buckets → the stage-1 road is eating first sessions
  (item 1 below, and the pack change of 2026-09-19 is the first suspect);
* mass at **2:30–3:30** → the first result screen is the exit (item 2).

Poki's own reading guide is explicit about the mapping: a left-leaning histogram
is onboarding or loading, and **a peak in the middle columns means "insufficient
content depth or engagement hooks"**
([reading results](https://developers.poki.com/guide/reading-results)). A 3:07
mean with 39 % past three minutes is most likely that middle shape — which would
put items 2 and 4–8 ahead of item 1. **Do not build Tier 1 in a different order
than the histogram dictates.**

Watch the ten recordings for one thing in particular: **input friction**. Poki's
own playtest case study found accidental clicks leaving the canvas, fixed it
with a mouse lock, and engagement went **from 2 minutes to 10**
([Poki](https://medium.com/poki/higher-success-rates-with-playtests-1e1316dd70fb)).
Nothing on this list has that size of upside. A mis-steer at the wrong moment on
a phone is our equivalent, and only a recording will show it.

---

## 4. Tier 1 — the three levers that touch the average

### 1. Stage 1 must not be loseable on a first attempt
**Moves:** average playtime, conversion · **Effort:** 2 h · **Risk:** low
**Hook:** `RALLY_STAGES` in `GameScene.vue`, `game/secondWind.ts`

The stage-1 **arena** already refuses to end a first session — the second wind
hands back 120 % of the crowd and the fight continues, no screen. The stage-1
**road** has none, and since the packs went to three bodies at 1.5× health the
median player dies there: two attempts, a loss screen at roughly 40 seconds, and
the whole minute-long road again. Genre guidance is blunt about this — level 1
should be [near-impossible to fail](https://www.gameanalytics.com/blog/hyper-casual-game-common-mistakes),
and the first session is a [90-second clock](https://blog.playio.co/mobile-game-onboarding-retention).

Extend the silent rally to the stage-1 road for players who have never cleared
stage 1: same rule as stages 2–3 (past 75 % of the road, once), or an earlier
trigger since the deaths are earlier. The packs stay exactly as they are — what
changes is that the first loss is a beat rather than a menu.

**Measure:** `average` attempts on stage 1 → 1 in the career sim; fit test's
0–60 s bucket shrinks.

### 2. Do not stop a winning run before the bar
**Moves:** average playtime directly · **Effort:** 1 h + a fit test · **Risk:** medium
**Hook:** `CONTINUOUS_THROUGH_STAGE` (currently 1) in `GameScene.vue`

The first result screen lands at 2:45–3:25 and the average session is 3:07. A
screen is an exit; the arithmetic of exits is `0.87^n`. Taking the continuous
handover through **stage 3** moves the first full stop to **~4:05** and hands
the player two clears before they are ever asked to decide anything. The nearest
measured analogue is Supersonic halving Hide 'N Seek's level length: **+33 %
playtime, D1 48 %** — the mechanism is more completions per unit of time with no
extra stop ([Supersonic](https://supersonic.com/learn/blog/runner-games-are-here-to-stay-how-can-you-capitalize-on-the-trend/)).

**The trade-off is real and it is yours:** this was set to 1 on 2026-09-18 on
the owner's call that the first result screen should land after stage 2, with a
weapon already chosen and coins worth spending. Coins bank on a continuous
handover too and the shop sits on the HUD throughout, so what is deferred is the
*prompt*, not the money — but it is a deliberate call being reversed, and the
fit test answers only one question at a time. Run it as the next test's single
change, and keep 1 if the number does not move.

**Do not confuse this with shortening the stages.** The one Poki postmortem with
our exact numbers tried that: Push Titans cut its first battle to under a
minute and engagement *fell*; the author rolled it back and tuned difficulty
instead ([write-up](https://medium.com/@vcorva/push-titans-is-on-poki-f656c7d8cfb7)).
What that dev gained a minute of playtime from was **telegraphing** and
**removing** a control, not shorter content — which is item 9 below.

**Measure:** fit test average playtime and engaged %, against 3:07 / 39 %.

### 3. A loss ends on the road, shows how close it was, and restarts without a screen
**Moves:** put-down resistance, retries per session · **Effort:** 4 h · **Risk:** medium
**Hook:** `resultFlow.ts`, the 3 s road hold already built (`WASTED_HOLD_MS`)

Near-misses are a documented retry driver — they fire the same circuitry as a
win and produce the highest urge to continue in a casual-game lab study
([PMC5445157](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5445157/)). The
honest version is the only version we ship: show the **true** distance that was
left — the boss's remaining sliver of bar, the gate the crowd was three metres
short of — hold it for a beat on the road, and let the crowd start running
again. A retry that costs a tap on a screen is a retry the player has to decide
to make; a retry that is already happening is one they have to decide to stop.

Fabricating the closeness is the dark pattern. Showing it is the craft.

**Measure:** retries per session in our own funnel (`wipe` → next `stage_start`
latency), and the fit test's engaged %.

---

## 5. Tier 2 — depth inside the run, no new screens

### 4. A relief beat before every boss gate
Archero puts a healing chest by the door before each boss; the deconstruction
credits it with "the notion of just-a-bit-more that keeps the player way more
engaged" ([DoF](https://www.deconstructoroffun.com/blog/2019/8/9/why-archero-banked-25m-but-leaves-25m-hanging-hlx9n)).
We have the spot already: the run-in between the closing bank and the arena.
A small crowd top-up there turns a boss wall into a near-thing.
**Hook:** `track.ts` closing-bank block · **Watch:** the adaptive bar prices the
fight off the crowd that arrives, so this must be priced, not free.

### 5. Gate pairs that stay a real choice as the crowd scales
Multiplication dominates at a small count, flat addition at a large one, so a
fixed `×2 | +7` pair becomes a non-choice by stage 8 — and the genre's fix is to
price the pair against the crowd that is actually arriving and to guard the
fatter door with obstacles ([Supersonic](https://supersonic.com/learn/blog/how-to-design-a-hit-gate-runner-the-basics-and-best-practices/)).
Stages 1–5 already do this (`EARLY_CLOSING_CROWD`, `liveDoor`); the long road
does not.
**Hook:** `track.ts` `roadDoor` / `liveDoor`, `longRoadCrowdAt`.

### 6. Put the run's biggest beat late, and let the camera hold on it
Peak-end shapes what a player remembers of a session
([CHI 2016](https://dl.acm.org/doi/10.1145/2858036.2858419)). Schedule the
stage's largest multiply near the end of the road rather than the middle, and
let the camera settle on the aftermath instead of cutting away.
**Hook:** `track.ts` (the closing bank is already the biggest sum on the road —
this is about the *camera* and the order, not new content).

### 7. Goal gradient and endowed progress, on the rail that already exists
Effort accelerates as a goal looks nearer — the café-card field study found 12
days between the first two stamps and 5 between the last two, driven by
*perceived* progress
([Kivetz et al.](https://www.columbia.edu/~rk566/Session4/Goal-Gradient_Illusionary_Goal_Progress.pdf)) —
and a meter handed to you pre-filled lifts completion from 19 % to 34 %
([Nunes & Drèze](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=991962)).
The HUD progress rail is already there with the stage's beats marked on it: open
each stage with the run-in visibly already filled, and let the fill accelerate
through the last quarter.
**Hook:** `RunHud.vue` progress rail. No new element, no text.

### 8. Stop on an unfinished shape
Zeigarnik's memory effect does not replicate, but **task resumption** does: a
2025 meta-analysis of 59 studies found 67 % resumption against a 50 % baseline
([Nature Humanities & Social Sciences](https://www.nature.com/articles/s41599-025-05000-w)).
Every stop we cannot remove should leave something physically unfinished on
screen — the next gate half-open behind the banner, the boss cresting the
horizon — which the first second of the next stage completes.
**Hook:** `StageBanner.vue` + the road behind it.

### 9. Telegraph what is coming, without a word
The closest thing to a controlled experiment on our exact metric: a Poki dev
whose first fit test came back at 2:30 / 28 % added an animated skeleton
shouting before each wave, a second telegraph before the giants, and **cut his
real-time upgrade buttons from three to two** — the result was **+1 minute of
playtime and over 34 % engaged**
([Push Titans postmortem](https://medium.com/@vcorva/push-titans-is-on-poki-f656c7d8cfb7)).
Two of those three changes are subtractive, and none of them is text.

Our boss attacks are already telegraphed; the ROAD is not. What is missing is a
wordless "here it comes" for the things the banner currently spells out in
words: the pack cresting the top of the screen before it is in range, the elite's
silhouette rising, the boss's shape on the horizon two beats before the arena.
The banner keeps its text for the players who read; the telegraph is for the
ones who do not.
**Hook:** the three pieces already exist and none of them watches the road:
`game/bossTells.ts` and `IncomingWarning.vue` fire for an incoming *attack*, and
`BossSilhouette.vue` only rides the handover banner.

---

## 6. Tier 3 — the feel budget (this is retention, not polish)

### 10. 33 fps is the ceiling on everything above
The fit test's median is **33 fps on mobile**, down from 37 on 5.0.0. This game
is fill-bound, not CPU-bound (`PERF-LEDGER.md`), and the armory's wide road plus
the painted layer are new pixels. Nothing in Tier 1 or 2 survives a stuttering
frame.
**Hook:** `pnpm perf:builds` (screens-of-fill per frame), the zoom's transform
path, `qualityTier`. **Target:** median 45+ on the next test.

### 11. Juice has an optimum, not a maximum — and every milestone gets its moment
N = 3 018, four juice levels of the same game: **medium and high beat both none
and extreme** on play time, experience, intrinsic motivation and performance
([Study](https://www.sciencedirect.com/science/article/pii/S1875952118300879);
replicated at [CHI 2024](https://dl.acm.org/doi/10.1145/3613904.3642656)). And
two feedback channels beat three — visual + haptic gave the best performance and
lowest workload, adding audio on top *raised* workload
([2026 study](https://www.sciencedirect.com/science/article/pii/S2451958826000333)).
So: cap concurrent effects per frame, tie effect size to what the player just
did (crowd gained), and give each event class at most two channels — haptics
reserved for crowd loss.

Inside that budget, spend it on **every milestone**: Poki's first-listed
engagement tactic is to "celebrate every milestone with confetti, sound, praise"
([engagement guide](https://developers.poki.com/guide/engagement)). We already
pop the doubling squad ladder and the coin cash-out; the beats with no moment of
their own are the stage clear inside a continuous handover, the first weapon
taken from a lane, and a boss phase falling.

### 12. Glyphs a six-year-old can name
Stripping non-real-world ornament from icons took preschool recognition from
**17 % to 90 %**
([study](https://www.sciencedirect.com/science/article/pii/S1877042812050045/pdf)).
Our pickups and lane cases should be flat, concrete and unornamented. Colour is
never alone: ~8 % of boys are colour-blind
([Nature Eye](https://www.nature.com/articles/eye2009251)), so shape + motion +
pitch carry the same message the hue does. The weapon lanes already pass this —
colour, glyph and name; keep the rule.

---

## 7. Returning players, without a calendar

### 13. An in-world streak the crowd carries
Streaks predict return better than most signals, and the version that works is
one you can keep on a bad day. Ours must be wordless and must never punish: a
banner or flame the crowd carries that grows with each consecutive cleared stage
and gutters out when a run ends. No counter, no menu, no notification, no
"don't lose your streak!" — that last one is the ICO line and we do not cross it.
**Hook:** the crowd renderer + the existing challenge streak in the save.

### 14. The chest that is already filling
The idle treasure chest fills on wall-clock time and pays on return. It is the
one returning-player hook the game has, and it is currently a HUD icon. Give its
arrival a place on the **road** — the chest standing on the verge of the next
stage's opening, opened by running over it.
**Hook:** `useTreasureChest.ts`, `track.ts` stage opening.

---

## 8. What NOT to build

Unchanged from the last version, plus what this pass rules out:

* **Daily-login calendars, battle passes, achievement walls, squad-skin shops.**
  Every one is a screen between the player and the road.
* **A pre-run loadout screen.** The game's asset is that it starts instantly.
* **Rewarded-video buttons in the HUD.** Ads stay at the natural break.
* **A combo meter** (declined 2026-09-13: a sixth number on a HUD whose chips
  five testers could not name).
* **Manufactured near-misses, celebratory audio over a net loss, streak shame,
  appointment timers, ad-gated progression.** Section 2, rule 3.
* **More than three simultaneous choices** — Bridge Race hit 45 % D1 with three
  legible options; more causes paralysis.
* **Longer sessions for their own sake.** Survivor.io's long, monotonous runs
  produced fatigue and a 50 %+ DAU decline (D30 4 % against Archero's 11 %,
  [Naavik](https://naavik.co/deep-dives/evolution-of-hybridcasual-deepdive/)).
  We want more *completions*, not longer roads.
* **Shorter stages, as a reflex.** The publisher advice says halving level
  length raises playtime; the one Poki dev who tried it on a game at our numbers
  measured engagement going DOWN and rolled it back (item 2). Our stages are 75-80 s
  by the owner's call of 2026-09-18. Leave them until a histogram says otherwise.
* **A second currency, or anything gated behind a rewarded video.** Poki names
  both: gems-plus-coins is "a mobile pattern built to drive IAP", and "rewarded
  videos are an optional extra, never a gate"
  ([requirements](https://developers.poki.com/guide/requirements-quality)).
* **A splash or title screen, and grind.** Also Poki's list — grind is "one of
  the fastest ways to lose a web player", and "frequent popups and notifications
  lower engagement".

---

## 8b. The other four portals want a longer game than Poki does

Poki's bar was three minutes. It is the lowest of the five we ship to, and the
rest publish theirs — Playgama keeps the list it redistributes against
([platform requirements](https://wiki.playgama.com/playgama/game-requirements/platform-specific-requirements.md)):

| portal | published playtime expectation |
| --- | --- |
| Poki | passed at 3 min average / 25 % over 3 min |
| CrazyGames | "engage the audience for an extended period (**20+ minutes**)" |
| YouTube Playables | "ideally over **8 minutes**" |
| TikTok · Playhop/Yandex · VK | **10+ minutes** |
| GamePix | ranks by **play count**, not minutes (`rkScore` = "most played") |

CrazyGames also ranks on "play count, average playtime, retention, conversion,
and player feedback", gives new games an initial boost, and reports that games
played as an installed PWA see **+18 % retention and 40-55 % more playtime** —
their prompt, not our code
([ranking FAQ](https://docs.crazygames.com/faq/),
[PWA](https://developer.crazygames.com/blog/introducing-progressive-web-ap)).

Two consequences worth writing down. First, **everything in Tiers 1–2 is still
the right work** — those bars are reached by clearing more stages, not by
padding roads. Second, **GamePix rewards a different shape**: many discrete
plays beat one long one there, so the restart-without-a-screen of item 3 is
worth more on GamePix than anywhere else (inference, from their ranking field).

**Ad cadence — we sit inside every published rule, with one thing to revisit.**
Playgama prescribes "between 120 and 240 seconds between interstitials" and
warns that "showing a full-screen ad within the first few seconds is a major
driver of Day 0 churn"
([best practices](https://wiki.playgama.com/playgama/guides/monetization/best-practices));
CrazyGames asks for the first midgame ad only after "3-5 minutes" and offers the
diagnostic "does retention drop at the level where you show the first midgame
ad?" ([pacing](https://docs.crazygames.com/resources/midgame-ads-pacing/)). Ours
is a 180 s first interstitial and a 121 s floor (`useAdGate.ts`) — inside both.

**The thing to revisit is our own cooldown.** Every portal SDK paces ads itself
and asks to be told about *more* opportunities, not fewer: Poki — "not every
call triggers an ad; our system decides… signal as many opportunities as
possible" ([SDK](https://developers.poki.com/guide/sdk-overview)); CrazyGames —
"you do not need to implement your own cooldown timers" (their SDK enforces one
midroll per three minutes, and a rewarded break consumes the same cooldown);
GameDistribution — "don't worry about spamming users… we regulate the
ad-interval through the SDK". Our 121 s floor therefore suppresses opportunities
the portal would have declined anyway. **Keep the 180 s protection of the graded
first three minutes; consider dropping the floor after it and letting the SDK
decide** — and measure revenue against playtime, because Playgama's own answer
to "how much retention does ad load cost" is that
[no published benchmark exists](https://playgama.com/blog/business-faqs/how-do-i-measure-whether-ads-are/).

**The one exception is the GameMonetize build**, whose moderation demands a
first-load interstitial — the exact placement every other portal names as a
churn driver. Keep it scoped to that build alone.

**A D7 hazard we have already covered:** GamePix warns that iframe
`localStorage` "may purge after one week in mobile browsers", so saves there
must go through `GamePix.localStorage`
([SDK docs](https://partners.gamepix.com/sdk/doc/javascript)). Ours do —
`src/platforms/gamepix/index.ts` declares `hasCloudSave` against the SDK's own
store, with a readback canary for the anonymous case. Nothing to build; it is
listed so the next person does not "discover" it.

---

## 9. How we will know

* **Before each build:** the career sim (`tests/sim/career.ts`) for attempts per
  stage and the cumulative clock; `tests/sim/balance.test.ts` for the floor.
* **After each build:** one fit test, **one change at a time** — two tests a day
  is the budget, and a test that carries three changes answers nothing. Compare
  against 3:07 / 39 % / 33 fps.
* **Continuously:** our own funnel already emits `stage_start`, `stage_end`,
  `wipe`, `gate_pass`, `shop_open`, `upgrade_buy`, `armory_pick` through the
  portal sink. The two questions to keep asking it: which stage ends the median
  session, and how long after a `wipe` the next `stage_start` arrives.

---

## 10. Ledger — what shipped (2026-09-09 → 2026-09-20)

One line each; the reasoning behind every one is in git history and in the
module docstrings, which is where it belongs.

| # | item | state |
| --- | --- | --- |
| 1 | Continuous handover between early stages (no dead air) | shipped; through stage 2 since 09-18 |
| 2 | Gift ladder (weapon choice → shield → skills → boxes), promised on banner + HUD chip | shipped |
| 3 | Free revive at the first boss; silent rally on stages 2–3 | shipped |
| 4 | Scripted first 15 seconds (opening doorway inside the first screen) | shipped |
| 5 | Combo meter | **declined** — HUD load |
| 6 | In-run weapon pickups | shipped as the lever puzzle + boxes, not as specced |
| 7 | Gate variety pack (`×`, `÷`, `−`, mystery `?`) | shipped |
| 8 | Rescue cages, with a curve | shipped |
| 8b | Auto-shield pickup (bulwark) | shipped |
| 9 | Boss phase two + guard gates | shipped |
| 10 | Squad skins | **declined** — priced as art, not code |
| 11 | Daily expedition | shipped |
| 12 | Endless mode past stage 20 | shipped |
| 13 | Haptics | shipped |
| 14 | Music that follows the squad | shipped |
| 15 | Squad-milestone pops on a doubling ladder | shipped |
| 16 | Performance headroom for 200+ crowds | shipped; see Tier 3 |
| 17 | Analytics that answer "why did they stop?" | shipped |
| 18 | Share card | **built, then removed** — nowhere to share to |
| 19 | Self-closing result screen | **built, then removed** — closed on people reading it |
| 20 | "How close you came" on the loss screen | shipped |
| 21 | Three seconds on the road before the loss screen | shipped |
| 22 | The squad turns into the coins | shipped |
| 23 | Grenade lesson | shipped |
| 24 | Ads can no longer interrupt a run | shipped |
| 25 | Primer pill leak | fixed |
| 26 | A dead boss stops promising things | fixed |
| 27 | Four-lane weapon split, stages 1–3, one colour per weapon | shipped 2026-09-19 |
| 28 | Stage-1 packs at three bodies × 1.5 health; first pack at 30 % | shipped 2026-09-19 |
| 29 | Grapeshot: close-range damage curve, boss fights repriced | shipped 2026-09-19 |

**Still open from Playtest 02, not yet built:** the boss's danger zone should be
a filled area on the road rather than a word in a badge (three testers learned
the dodge distance by dying), and stage 6 is priced by the authored curve alone
because adaptive pricing stops at stage 5 — the fight after the hardest one in
the game reads as a faceplant.
