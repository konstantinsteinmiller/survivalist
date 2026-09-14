# Balance report — stages 1–5, measured

How to reproduce every number here:

```bash
SIM_STUDY=1 npx vitest run tests/sim/study.test.ts --reporter=verbose
SIM_STUDY=1 SIM_SAMPLES=10 npx vitest run tests/sim/study.test.ts --reporter=verbose
# PowerShell: $env:SIM_STUDY=1; npx vitest run tests/sim/study.test.ts --reporter=verbose
```

**`--reporter=verbose` is not optional.** Vitest 4's default reporter no longer
echoes `console.log` from a passing test — the study runs for minutes, passes,
and prints nothing at all. (`--reporter=basic` was the old answer and no longer
exists in v4.) Studies that write through `SIM_OUT` are unaffected.

The study is excluded from the default suite (it runs 500 full games). The fast
regression that guards the conclusions — `tests/sim/balance.test.ts` — is in the
default suite and takes ~4 s.

> ⚠ **Read the last section first.** Everything between here and
> *Re-measured, 2026-09-12* was generated on **8 September** and is the history
> that led to the current numbers, not the current numbers. The whole study was
> re-run on 12 September after five features landed, and the opening five were
> re-cut on 14 September — "the opening five re-cut", the last section of this
> file, which is the one to read for anything about stages 1–5. The 12 September
> headline is that a
> player who never opens the shop now walls at stage 6–8 instead of finishing the
> campaign.

> **Stages 1–5 no longer have an authored boss bar.** They size it against the
> run that reaches the arena — see [Adaptive difficulty, stages 1–5](#adaptive-difficulty-stages-15)
> at the end of this file. Every boss-HP number in the sections below is the
> history that led there, and is no longer the shipping behaviour for those five
> stages; stages 6+ are unchanged.

Method: fixed 16.67 ms step, seeded `Math.random`, state wiped between runs,
medians with min–max across seeds. Five scripted policies:

| policy | models |
| --- | --- |
| `optimal` | evaluates every bank, pumps `add` leaves, detours for crates it can prove it will break, never straddles a pillar, dodges slams instantly |
| `good` | same routing and aim, no crate detours, no lingering to pump |
| `average` | nearest leaf rather than best, **250 ms reaction latency**, clips pillars |
| `careless` | never steers — holds the centre line for the whole stage |
| `trail` | follows the coin trail wherever it leads, including into traps |

---

## Where it started

The first study found the curve **inverted**: between stages 1 and 4 the boss
grew 90 % (1900 → 3610 HP) while the DPS a well-played run arrives with did not
grow at all (234 / 262 / 194 / 196). Real time-to-kill therefore *climbed* 7.9 →
9.6 → 15.6 → 18.6 s against a 5–8 s target, then collapsed to 1.6 s on stage 5
where two `×3` banks multiplied the squad to 330. Underneath that, the stat the
whole design leans on never arrived: fire rate finished runs between 1.90 and
3.00 against a 6.5 ceiling, because rate crates cost more HP than the run had
DPS when it met them. And the boss slam was not a skill test but a reflex
threshold sitting between 150 ms and 250 ms — the wrong side of a human thumb.

## What changed

| # | constant | was | now | why |
| --- | --- | --- | --- | --- |
| 1 | `BOSS_BASE_HP` | 1900 | **1000** | flat DPS under a boss growing 30 %/stage made TTK climb 8 → 19 s |
| 1 | `bossHpScale` slope | 0.30 | **0.45** | growth moved into the ramp, out of the floor |
| 2 | `crateHp` | `(8 + s·3.2)×(rate?1.3:1)` | **`(6 + s·1.2)×(rate?1.25:1)`** | a rate crate demanded 20–48 DPS to break; runs had 13–42 at that point in the road |
| 2 | `MIN_RATE_CRATES` | 2 | **3** | fire rate is the run's main lever and it never moved |
| 3 | `SLAM_TELEGRAPH` | 0.62 s | **1.0 s** | clear rate went 100 % at 150 ms latency and 0 % at 250 ms; human median is ~250 ms |
| 4 | `×3` gate leaves | stage 5 | **stage 8** | two `×3` banks compounded a 40-crowd into 330 and gave stage 5 a 1.6 s climax |
| 5 | retry relief | HP only | **HP + slam share ×0.6** | 14 of 15 simulated retries moved the clear rate by exactly 0 %, because 68–80 % of a failing run's deaths are slams |
| 5 | `MINIBOSS_FIRST` | 0.85 | **1.3** | miniboss fights lasted 1.4–3.6 s and cost 0–7 survivors — a footnote, not a beat |
| — | `MAX_SQUAD` | 400 | **700** | stage 5 peaked at 390 and silently discarded the rest of a gate's payout |

Plus five bugs the study surfaced (all fixed — see *Bugs* below).

### And then the career study happened

Everything above tunes a *stage*. Running the same simulation across full
thirty-stage careers (`CAREER.md`) found the numbers were fine and the
**structure** was not: the crowd compounds through gates, the road's toll did
not, and so every competent player cleared all thirty stages on any purchasing
strategy — with the boss dying before its first swing from stage 8 onward.

| # | rule | was | now | why |
| --- | --- | --- | --- | --- |
| 6 | `bossHpScale` | `1.45^(s−1)` | **`1.55^(min(s,12)−4) × (1 + max(0,s−12)·0.12)`** | the old curve was a floor for the early game and a ceiling for the late one |
| 6 | `MAX_SQUAD` | 700 | **1600** | gates were silently clipped from stage 12; `nearCrowd()` keeps the two O(units) loops affordable at that size |
| 7 | foe bite | flat 1–5 | **`max(flat, squad × 0.4–1.8 %)`** | a brute cost a 30-strong squad a sixth of itself and a 1 200-strong squad 0.4 % |
| 8 | boss guard | — | **plants at 66 % / 33 %, overkill forfeited** | the climax cannot be skipped by DPS; a 30 000-DPS squad still dodges twice |
| 8 | boss rage | fixed 2.4 s / 1.75 u | **−0.17 s and +0.07 u per swing (floors 0.95 s / 2.55 u)** | turns an under-built squad's long fight into a lost one |
| 9 | `CHALLENGE_STEP` / `MAX` | 0.055 / 12 | **0.13 / 30** | the handicap was a constant for eighteen of thirty stages |
| 9 | challenge | health only | **+ pack size, + bite cost** | health alone makes fights longer, not different |
| 10 | relief | HP + slam | **+ contact channels, + starting survivors** | a run that dies on the road cannot spend enemy-HP relief |
| 10 | shop | 4 tracks, flat | **re-priced; Squad also buys +4 %/level of every gate payout** | "buy only scavenging" tied the smartest strategy |

Verified after: a competent player who never spends walls at stage 13, an
average one at stage 10, and the boss throws 2–9 swings on every late stage
instead of none. Full before/after in `CAREER.md`.

## Where it landed

Clear rate, 10 seeds per cell:

| stage | optimal | good | average | careless | trail |
| --- | --- | --- | --- | --- | --- |
| 1 | 100% | 100% | **100%** | 0% | 0% |
| 2 | 100% | 100% | **80%** | 0% | 10% |
| 3 | 100% | 100% | **60%** | 0% | 0% |
| 4 | 100% | 80% | **100%** | 0% | 0% |
| 5 | 100% | 100% | **100%** | 0% | 0% |

Boss fight, the number the retune was aimed at:

| stage | boss hp | optimal DPS | **optimal TTK** | good TTK | average TTK |
| --- | --- | --- | --- | --- | --- |
| 1 | 1000 | 277 | **3.5 s** | 5.6 s | 6.7 s |
| 2 | 1450 | 485 | **3.0 s** | 11.4 s | 18.4 s |
| 3 | 1900 | 446 | **4.3 s** | 19.0 s | 17.7 s |
| 4 | 2350 | 511 | **4.6 s** | 14.9 s | 12.0 s |
| 5 | 2800 | 828 | **3.4 s** | 8.2 s | 20.2 s |

The inversion is gone: a benchmark run now gets a 3–5 s climax on every stage
instead of one that grew from 8 s to 19 s. The long fights belong to runs that
skipped the crates, and they are a **time** tax rather than a death sentence —
`good` and `average` survive their boss on every seed they reach it.

Fire rate finally has an arc: `optimal` finishes stages at 3.00–3.55 having
collected 2–3 of 3 rate crates, against `good`'s 1.90 with 0 of 3. That gap —
not squad size — is where the difficulty spread actually lives:

| stage | optimal ÷ average DPS at boss |
| --- | --- |
| 1 | 1.8× |
| 2 | 5.8× |
| 3 | 3.8× |
| 4 | 2.5× |
| 5 | 5.5× |

Peak squad, by contrast, is within ±20 % across policies on four of five stages.
The gates hand roughly the same crowd to everybody; the crates are what separate
a good run from a lazy one. `balance.test.ts` therefore locks the ordering on
**DPS at the boss**, not on peak squad.

## The floor and the ceiling

* **`careless` never clears anything.** It holds the centre line, eats every
  pillar, and arrives at the stage-1 boss with 14 survivors at 34 DPS. That is
  deliberate and now asserted: the game's one instruction is "tap to move", and
  a run that never obeys it should not clear a stage.
* **`average` clears stage 1 on every seed** and then becomes patchy (80 % / 60 %
  on 2–3). A sloppy human gets a first win and then has to actually play.
* **`optimal` clears 1–5 on every seed** — asserted per-stage, so a future tune
  cannot make an authored stage unwinnable without turning the suite red.

## Bugs the study found (not balance — bugs)

1. **`crushAgainst` banked kill budget while out of contact.** It accrued for
   every obstacle within six units whether or not anything touched it, so an
   obstacle approached from range banked ~2 s of kills and spent the lot on the
   first frame of contact. Grazing a pillar cost 17 survivors when held on the
   line and **77** when cut into at the last moment — for 60 % less contact
   time. A player who noticed late and corrected was punished four times harder
   than one who never corrected. *Fixed:* budget only accrues while something
   overlaps, the carry is capped at one kill, and a new contact opens at exactly
   one (so a graze always costs someone, and ploughing through costs many).
2. **`clock` was never reset between runs.** The crowd's idle wobble and the
   flyers' sway read it, so the same seed replayed a stage differently depending
   on how long the previous run lasted. *Fixed* in `resetWorld()`, along with
   `entityId`.
3. **Stage 4's chicane exited on the wrong side of its own rate crate.** The
   crate sat 7.5 units away on the forbidden side; *every* policy collected 0 of
   2 rate crates on stage 4, and it was the only authored stage where a
   competent run finished with both stats untouched. *Fixed.*
4. **`MAX_SQUAD` overflow was discarded silently** — the gate reported the
   number it granted, not the number it promised. *Fixed* by the `×3` hold plus
   raising the cap to 700.
5. **The gate-geometry comment reasoned about painted widths**, not contact
   widths. Harmless today (0.50 units of tolerance remain) but it is the same
   reasoning error that made `MIN_RUN_GAP` too small. *Fixed:* the comment now
   states the real safe aiming band, [2.20, 2.70].

## The divider, settled

`CROWD_MAX_R` 1.9 → 1.65 closed the invisible tax. Survivors lost per bank:

| squad | x = 0.00 | 1.60 | 2.00 | painted centre 2.30 | 2.45 | 3.00 |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | 6 | 1 | 0 | **0** | **0** | 0 |
| 20 | 13 | 5 | 1 | **0** | **0** | 0 |
| 60 | 32 | 11 | 3 | **0** | **0** | 0 |
| 150 | 75 | 17 | 4 | **0** | **0** | 0 |

`good`, `average` and `trail` record 0.00 pillar deaths per bank on all five
stages. At `CROWD_MAX_R` 1.9 the safe band had *zero* width and a perfect line
still shaved ~1.3 % of the crowd per bank.

## The miniboss, after the sweep

Two rounds, and the second is the one to read.

**Round one — the maul.** The elite stopped being a statue: it planted and
struck the ground under the crowd on a 0.7 s telegraph, dodged by sliding
sideways, capped at 8.5 % of the squad. Measured, it cost **0–8 survivors a
fight**. Against a crowd in the hundreds that is a rounding error, and clear
rate did not move on any stage — the elite was interesting to look at and free
to ignore.

**Round two — the sweep.** The move changed shape rather than size: a 0.3 s
wind-up, then an arc across the WHOLE lane reaching `ELITE_SWEEP_REACH` = 4.3
down the road, taking `ELITE_SWEEP_FRACTION` = **0.2 of the current squad**,
every `ELITE_SWEEP_CD` = 1.5 s, alternating direction. No radius, so no dodge:
the boss asks *where are you standing*, this asks *how hard do you hit*.

It is a threat now, and the toll lands **very unevenly**, which is the finding:

| stage | optimal | good | average | careless | trail |
| --- | --- | --- | --- | --- | --- |
| 1 | 100% | 100% | 100% | 0% | 0% |
| 2 | 100% | 100% | 80% | 0% | 10% |
| 3 | 100% | **15%** | **35%** | 0% | 0% |
| 4 | 100% | 85% | 100% | 0% | 65% |
| 5 | 100% | 100% | 95% | 0% | 0% |

Stage 3 is a wall (`good` 100 % → 15 %, `average` 75 % → 35 %, both dying at
46 % progress, both to `elite`) and stages 2, 4 and 5 barely moved. The whole
difference is **how long the fight lasts**, which is `minibossHp` ÷ whatever DPS
a run happens to have at that point of that stage:

| stage | policy | fight s | vs boss TTK | died to |
| --- | --- | --- | --- | --- |
| 2 | optimal | 4.2 | 89% | elite 63 |
| 3 | good | **8.4** | **101%** | **elite 200** |
| 3 | average | 6.7 | 52% | **elite 162** |
| 4 | good | 1.3 | 19% | — |
| 5 | average | 3.1 | 27% | elite 145 |

A stage-3 elite survives the **entire nine-second leash** — six sweeps — while a
stage-4 one dies in 1.3 s and throws at most one. The sweep did not make the
game harder by a percentage; it made *fight length* the only thing that matters,
and stage 3 is where the game currently gets that number wrong.

Dials, in the order they are worth trying: `ELITE_HOLD_MAX` (9 s — a shorter
leash caps the total toll without weakening a single sweep),
`MINIBOSS_BOSS_FRACTION` (stage 3's elite is too tanky for the DPS available
there), `ELITE_SWEEP_FRACTION` (0.2), and last `ELITE_SWEEP_CD` (1.5 s).

## The road gets its teeth: gun range, `-N` doors, and the retune they forced

Three changes went in together, and the third exists because of the first two.

**1. The guns stopped outranging the camera.** Rounds ran to `anchorY + 26` —
about twice the visible road — so obstacles died before they finished sliding
onto the screen and a bank could be pumped from off-screen. `BULLET_RANGE` now
stops a round **15 % of the screen short of the top edge** (10.8 units).

**2. `-N` doors, and banks with no right answer.** A `sub` leaf bills a flat
count and pumps on the same clock as `add` — so, because the crowd fires
forward automatically, *the door you are aiming at is the door that grows*. A
`div` beside a `sub` is a **dilemma**: a fraction against a count, cheap and
ruinous in opposite directions, rationed to one a stage from stage 4.

**3. …and then the curve had to be re-cut**, because change 1 is a much bigger
balance event than it looks. The pump window went from ~4.8 s (nine ticks) to
~2.0 s (four). Measured with everything else held still:

| stage | optimal | good | average | note |
| --- | --- | --- | --- | --- |
| 2 | 100% | 100% | **0%** | before: 100 / 100 / 80 |
| 3 | 95% | **0%** | **0%** | before: 100 / 100 / 75 |
| 5 | 100% | 90% | **0%** | before: 100 / 100 / 100 |

The crowd simply never got built, and the elite sweep — which charges a
*percentage* — then took the same share of a much smaller squad. Three dials
answered it, each aimed at the specific thing that broke:

| constant | was | now | why |
| --- | --- | --- | --- |
| `ELITE_HOLD_MAX` | 9 s | **4.5 s** | the leash is the only bound on a sweep costing 20 % every 1.5 s; nine seconds is six sweeps (74 % of the squad), and `average` spent the FULL leash in front of stages 2 and 3 |
| `MINIBOSS_BOSS_FRACTION` | 0.115 | **0.08** | a percentage-based attack cannot be answered by a bigger crowd — only by a shorter fight, which makes elite HP the real dial |
| `gateAddBase` flat term | 2 | **4** | the value the pump no longer has time to add, moved into the printed number. +4 restored the old curve outright (everything cleared everything); +2 lands where the game was |

Where it landed, 20 seeds per cell:

| stage | optimal | good | average | careless | trail |
| --- | --- | --- | --- | --- | --- |
| 1 | 100% | 100% | 100% | 0% | 0% |
| 2 | 100% | 100% | 95% | 0% | 20% |
| 3 | 100% | 95% | 90% | 0% | 0% |
| 4 | 100% | 100% | 100% | 0% | 90% |
| 5 | 100% | 100% | 80% | 0% | 0% |

The spread is the one the game had before any of this — `optimal` clears
everything, `careless` clears nothing — with the difficulty now living in
*decisions* rather than in reaction time: which door, and what your guns were
pointed at while you decided.

Two side effects worth knowing:

* **Crates got ~15 % more expensive in practice** without any number changing,
  because the study had been pricing them against a 12-unit window the guns can
  no longer reach into. The table above is now computed from `BULLET_RANGE`.
* **The balance probes had to be re-sized, not the game.** Three tests were
  measuring builds that no longer reach their boss — a stage-10 relief probe on
  no upgrades, a streak probe on `s4 p4 r2`, a stage-12 boss-pacing probe on
  `s6 p7 r5`. Probed with what the career study says players actually hold at
  that point (`s15 p11 r12`), stage 12 at an eleven-clear streak clears on every
  seed with a peak of 528–588. The wall was in the probe.

## Six changes at once, and what the isolation runs found

Boulders, crate tiers, monster coin drops, `÷3`, no back-to-back multipliers,
and a cut to the positive-gate base. Two of them behaved nothing like they were
supposed to, and only isolation runs found it.

**The boulder crush rate was the wrong way round.** Reasoning said a boulder
should hurt MORE than a barricade (0.28 against 0.22) because a wall is a
mistake you could have shot your way out of. That ignored permanence: a wall
bills once and is gone, a boulder field bills for as long as you are threading
it, twice, because the second rank's gap is offset. Measured on the career: a
competent player on the cheapest strategy **walled at stage 6 — the first stage
boulders appear on — on every purchasing strategy**, with the gate base back at
its old value. At 0.12 the same career is clean and a hundred-strong crowd still
loses a dozen survivors a second to grinding one.

**Boulders were also generating nowhere at all.** The first field left a two-slot
gap (3.0 units of clear road) against `MIN_RUN_GAP` = 4.4, so `ensureRunnable`
stripped every rank to nothing: stage 8 generated zero. Three slots, exactly as
a barricade row leaves. Coverage after the fix: **21 of 30 stages**.

**The requested gate cut is bounded by the career, not by taste.** Asked for −3
on `gateAddBase`; measured, with the boulders fixed:

| cut | result |
| --- | --- |
| **−1 (shipped)** | campaign clean — competent player reaches stage 12 inside the retry budget |
| −2 | campaign completes, but one stage in twelve costs a FOURTH attempt |
| −3 | competent player walls at stage 6 and never recovers |

At −3 a stage-1 door prints `+1` against a starting squad of 3, so the crowd
never starts and every later multiplier has nothing to multiply — `good` held
2–5 survivors at mid-road on stage 3. The flat cut is also the wrong shape for
its own goal: it costs stage 1 seventy-five per cent of a door and stage 14
twenty-three. The rule that actually attacks compounding is the new `canMul`
spacing clause.

Where the whole batch landed, 20 seeds per cell:

| stage | optimal | good | average | careless | trail |
| --- | --- | --- | --- | --- | --- |
| 1 | 100% | 100% | 100% | 0% | 0% |
| 2 | 100% | 100% | 80% | 0% | 5% |
| 3 | 100% | 95% | 75% | 0% | 0% |
| 4 | 100% | 100% | 100% | 0% | 60% |
| 5 | 100% | 100% | 40% | 0% | 0% |

Against 100 / 95–100 / 80–100 before the batch: the ceiling is untouched, the
mid-skill player is measurably squeezed, and the floor is where it always was.

## Contact became a guillotine, and what it took

Walls and boulders stopped grinding and started killing: whoever touches one
dies that frame, and the rest of the swarm streams past. The rule is one
sentence; making the road honour it took three measured corrections, and two of
them were bugs in the *harness* rather than in the game.

**Every scripted player was blind to boulders.** `View` carried gates, dividers,
crates, barricades, foes and pickups — and no rocks. So every policy routed as
though the one obstacle that cannot be shot did not exist. That was invisible
while contact cost a trickle and decisive the moment it was lethal: stage 6,
where boulders first appear, fell to a **0/3 clear rate for both `good` and
`optimal`**, with 138 and 110 deaths on stone they were never shown. Adding
`rocks` to the view and to `hazardsAhead` moved the suite from 13/21 to 20/21 by
itself. Nothing else on this page changed as much for as little.

**`expectedLoss` was modelling the old rule.** It priced a hazard as
`squad × fraction × seconds-in-contact`, saturating at 8 % overlap — so a graze
cost nearly as much as a plough. Under a guillotine the cost of a line is simply
the share of the crowd that line puts inside the strip, which is what it now
computes: no rate, no dwell time, no saturation ramp, and no per-obstacle
weighting.

**The road had 0.36 units of slack.** `MIN_RUN_GAP` guaranteed a channel that
cleared a full-width crowd by that much — ±0.18 of steering — which was ample
against a trickle and unholdable against a column. Widened to 1.0 of margin
(4.4 → 5.4). It stops there because `ensureRunnable` buys clearance by deleting
blocks:

| margin | guaranteed channel | blocks per barricade row | boulders per rank |
| --- | --- | --- | --- |
| 0.5 (before) | 4.40 | 2.19 | 3.00 |
| **1.0 (shipped)** | **5.40** | **1.61** | **2.00** |
| 2.6 | 6.50 | 1.00 | 1.00 |

At 2.6 the campaign's invariants come back and the obstacles stop existing —
every wall one block, every boulder field one boulder. That is the trade the
rule is bounded by.

### What may NOT be a guillotine

Three exceptions, each measured rather than argued:

| solid | rule | why |
| --- | --- | --- |
| gate pillar | grinds, 0.35/s | a blade between two doors the player is aiming AT. Lethal, it deletes a zero-input run at 67 % of stage 1 — on the first bank — which is the documented onboarding floor |
| unbroken crate | grinds, 0.12/s | a REWARD the player was invited to chase; punishing the attempt like a wall teaches them to stop chasing rewards |
| monster | displaces, never kills | a wall stands still, so a lethal wall is a question about your line. A monster HOMES on the crowd, so a lethal monster is an undodgeable chord of ~half the squad against a designed bite of 0.4–1.8 % |

The monster case is the one that looked most plausible and measured worst:
with monsters killing on contact the benchmark player dies at **10 % of stage 5
with 45 foe deaths** and **8 of 21** invariants break. With monsters displacing
— still solid, still impossible to walk through — all 21 pass.

### …and then monsters got a collision

A monster's body went from harmless to **killing every second survivor that runs
squarely into it**. Two bounds were needed to make it a collision rather than a
rate, and the sweep shows why each one is there:

| configuration | invariants passing |
| --- | --- |
| body kills everyone who touches (wall rule) | 13 / 21 |
| every 2nd dies, 10 unit i-frames | 14 / 21 |
| every 2nd dies, 600 ms unit i-frames | 18 / 21 |
| every 2nd dies, 10 i-frames + 0.6 s per-monster cooldown | 20 / 21 |
| **…and the kill zone narrowed to the body's middle 60 %** | **21 / 21** |

The second row is the interesting one: the ten-frame immunity the design called
for does almost nothing on its own, because the monster is MOVING. It crosses
the crowd's depth in about half a second and meets a fresh, unprotected rank on
every frame of the way — so one creep billed a column, which is the wall rule
wearing a monster costume. Lengthening the immunity to 600 ms hides the problem
by making the unit immune for the whole pass; the per-monster cooldown fixes it,
and lets the immunity go back to the ten frames it was supposed to be.

The last row is a chord problem. A creep's contact box is 0.69 wide against a
crowd 1.65 in radius, so "touching the edge of the shadow" is over half the
crowd's width. Killing on the middle 60 % of the body keeps the flank a shove
and the centre a knock-down — and it is the difference between a competent
no-ads career walling at **stage 4** with 82 foe deaths and running clean.

## Still open

* **`good` and `average` take 9–17 s over a boss on stages 2–5.** Survivable,
  and now partly deliberate — the guard floor means a fast kill is three swings
  rather than none. The remaining length comes from the crate detour, which is
  by design; the open question is whether the *policies* are unrealistically
  stubborn about it (neither ever detours) rather than whether the numbers are
  wrong. Worth re-measuring with a policy that takes crates opportunistically.
* **`trail` (follows the coins) clears almost nothing.** The coin trails lead
  into traps by design from stage 5, but a 0–10 % clear rate suggests they are
  currently lying more often than they are telling the truth.
* **The guard phase has not been measured against human thumbs.** It hands the
  player two extra dodges at a moment they did not schedule, and the simulation
  says a perfect dodger pays nothing for them. Whether a real player reads
  "shield up, swing coming" fast enough on a 390 px screen is a playtest
  question, not a harness one.
* Stages 6+ are generated rather than authored; they are covered by the career
  study but not by the per-stage probes here.

---

# Adaptive difficulty, stages 1–5

Reproduce every number below with:

```bash
SIM_ADAPT=1 npx vitest run tests/sim/scratch.adaptive.test.ts --reporter=verbose
# PowerShell: $env:SIM_ADAPT=1; npx vitest run … --reporter=verbose
```

The regressions that keep it honest are in the default suite:
`tests/game/adaptiveBoss.test.ts` (the pure functions) and the
*adaptive difficulty* block in `balance.test.ts` (the wiring).

## The complaint

Two failures from the live Poki build, reported as one:

* the opening stages are **too easy**, and players leave inside the first
  minute for want of anything to do;
* a player who deliberately plays badly to see what happens **still kills the
  boss in about half a second**, which is not a reward, it is an anticlimax.

They are the same bug. The spread in firepower arriving at the arena door is
enormous — measured, **65×** between `optimal` and `careless` on stage 5 — and a
single authored health bar has to be a climax for both ends of it. It cannot be.

Measured before the change:

| stage | policy | squad | DPS | boss HP | stopwatch | seconds of FIRE |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | `optimal` | 468 | 4 984 | 1 240 | 3.0 s | **0.25 s** |
| 5 | `average` | 82 | 246 | 1 240 | 7.5 s | 5.2 s |
| 5 | `careless` | 21 | 40 | 1 240 | — | never killed it |

The stage-5 `optimal` row is the complaint, exactly. The bar was worth a quarter
of a second of shooting; the three seconds the stopwatch showed were guard
phases, and the health bar teleported between them in three instant chunks.

The arena probe says the same thing without the road in the way. A 400-strong
crowd spent **0.6–1.1 s** of fire on every stage-1-to-5 boss, and a 12-strong
crowd killed none of them at all: stages 2, 3, 4 and 5 were **0/3 seeds**.

## What replaced it

Stages 1–5 no longer author a boss bar. They price one, at the moment the arena
opens, at *the firepower that walked in × the seconds this run has earned the
fight to last* — and the second term runs the opposite way to the first, so
**playing well buys a shorter fight rather than an easier one**.

| rung | share of the perfect-play crowd | seconds of straight fire |
| --- | --- | --- |
| near-perfect | ≥ 0.75 | 3.0 |
| some mistakes | 0.45 | 5.0 |
| a bad run | 0.20 | 6.0 |
| 1–12 survivors | pinned by head count | 6.8 |

Four supporting pieces, each of which was needed and none of which was obvious:

| # | piece | why |
| --- | --- | --- |
| 1 | `perfectSquadFor` | the yardstick — walks the real road, takes the best leaf of every bank, pumps it for the measured four-tick approach. Deterministic, because `buildTrack` seeds from the stage number, and it moves with the shop so a purchase is never scored as a bad run |
| 2 | `expectedDamage` | the bar is the damage the crowd will actually deliver, integrated with the real slam cadence, rage and floor — not `dps × seconds`. Flat multiplication ran **40 %** long at the bottom of the ladder, turning a 7.3 s target into a 12.6 s stopwatch |
| 3 | `WALK_IN_SECONDS` | the boss spawns 12 units out and `BULLET_RANGE` is 10.8, so ~0.7 s of every climax is the crowd shooting at something out of reach. It costs no damage and real crowd |
| 4 | `adaptiveBigHitMul` | the swing stops being soft for a run that built nothing — see *the floor*, below |

Three constants came out entirely:

| constant | was | why it is gone |
| --- | --- | --- |
| `earlyBossHpMul` | 0.6 on stages 1–3, 0.8 on 4–5 | a flat discount is only the right shape if everybody arrives with similar firepower. They do not |
| `tutorialBossHp` | 3 × the tutorial elite | stage 1's "you cannot lose your first climax" guarantee is now bought by the ladder's bottom rung, which is also right for the returning player the constant could not see |
| `TUTORIAL_BOSS_MULT` | 3 | ditto |

## The floor, which nearly went with it

The first working cut broke the game's oldest invariant: a run that never
touches the screen cleared **stage 3 on two seeds in three**, because the only
thing that had ever stopped it was a health bar too big for a crowd that small.

Raising the swing alone did not fix it — the integration in (2) simply *paid* for
the harder swing and brought the bar down to match, cancelling it exactly. The
fix is to decouple the two, and the decoupling is now the floor:

* the **bar** is always priced for a player taking the beginner's discount, so
  "beatable in N seconds" is a generous promise and never a trap;
* the **swing** is the one this run earned — and for a crowd that built nothing
  it is `HOPELESS_SLAM_MUL` = 1.45× the authored share, bounded by
  `SLAM_FRACTION_MAX`, which the design had already set as the most a single
  swing may ever take.

Dodge and you finish inside the promise. Stand still with a crowd you never
built and you run out of survivors first — which is the brief's own sentence,
"can't be helped and should be smacked by the boss attacks", as a mechanism.

## Where it landed

Stopwatch seconds, median of 3 seeds, boss fights that were reached:

| stage | `optimal` | `good` | `average` | `careless` |
| --- | --- | --- | --- | --- |
| 1 | **4.3 s** | 4.3 s | 5.1 s | 5.9 s |
| 2 | **5.5 s** | 6.3 s | 7.3 s | wiped |
| 3 | **5.5 s** | 5.8 s | 7.1 s | wiped |
| 4 | **7.4 s** | 8.2 s | 9.8 s | never reached |
| 5 | **5.5 s** | 6.3 s | 7.0 s | wiped |

The ordering is monotone on every stage, which is the design: a better crowd is
a shorter climax. Against the old table — 3.0 s for `optimal` on stage 5 and
20.2 s for `average` — the whole spread has collapsed from 17 seconds to about
two, and the fast end is now three to four seconds of the bar actually *moving*
rather than a quarter of a second of it vanishing.

The fight alone, at the two ends of the ladder that a road cannot deliver:

| crowd | before (fire / outcome) | after (fire / stopwatch) |
| --- | --- | --- |
| 400, full build | 0.6–1.1 s | **3.2–4.8 s** / 4.4–7.2 s |
| 12, no build, dodging | never killed it on s2–s5 | **4.6–7.2 s** / 6.9–8.4 s |
| 12, no build, standing still | never killed it on s2–s5 | wiped, by design |

## Known and deliberate

* **Stage 4 runs a second or two long for its quality of play.** It is the first
  road carrying boulders and barricades, and `optimal` finishes it having lost
  **50** survivors against 1 on stages 2, 3 and 5. Losses compound through
  multiplier leaves — twenty lost before a `×2` cost forty — so the doors-only
  yardstick over-states what stage 4 can hand over and even a flawless run
  scores 0.46 there. Left alone: stage 4 is where the game stops being a
  tutorial by design, and closing the gap would mean inventing a per-body
  attrition rate. A made-up number in the yardstick is worse than a measured
  wart.
* **A crowd of 12 standing still is a wipe on every stage.** That is the brief's
  "smacked by the boss attacks" branch, and it is what keeps the floor.
  Dodging turns the same fight into a win inside ten seconds.
* **Stages 6+ are untouched.** The authored curve resumes exactly at 6, because
  by then the player has committed, the shop is the point, and a bar that is
  always precisely as big as you are is a bar your upgrades can never beat.
* **The autobalancer now multiplies the clock rather than the bar** on these
  stages — Hard is a longer climax, a stuck player gets a shorter one — clamped
  to `[2.0, 7.5]` seconds because `challengeFactor` alone reaches ×12.7.

---

# Re-measured, 2026-09-12 — the whole study, after the retention pass

Everything above is history. It was last generated on **8 September**, and since
then the game has taken on the boss attack set, rescue cages, the bulwark
pickup, two late skills and their cooldowns, the gate pump, and the retention
pass of 12 September (milestone payouts, a face-down gate leaf, the near-miss
readout, a crowd renderer without per-body shadows). The roadmap's standing rule
is to re-run the career study after any balance change; this is that re-run, at
`SIM_SAMPLES=20`, and it is the section to read first.

```bash
SIM_STUDY=1 SIM_OUT=out.md npx vitest run tests/sim/study.test.ts --reporter=dot
```

## A harness bug it found before it measured anything

`RunResult.banked` read `runSummary().coins` and nothing else. The milestone
lump is a **separate field** on the summary — deliberately, so the result screen
can name the thing the HUD chip had been counting down to rather than letting it
vanish into a bigger number — and the scene's `bankCoins` adds the two together.
The harness did not, so the first re-run under-reported every career's income by
one lump every five stages and would have mis-priced the whole upgrade ladder.
Fixed (`banked` now sums both, with `milestone` broken out beside it), and the
study re-run from scratch. **Every number below is from the corrected harness.**

The general trap is worth stating: a payout split across two fields for UI
reasons has to be re-joined in the harness, or the simulation is measuring a
different economy from the one the player is in.

## The headline: the campaign is no longer free

`CAREER.md`'s answer — *"every scripted player who touches the screen at all
clears all thirty stages, on every purchasing strategy, including never buying
anything"* — is **no longer true**, and that was the point of everything that
landed between the two runs.

| policy | with no shop at all | best strategy | where the others wall |
| --- | --- | --- | --- |
| `optimal` | **stage 8** | 30 (`cheapest`, `balanced`, `value`, `scavenge4`) | single-track builds: 12–28 |
| `good` | **stage 6** | 30 (same four) | single-track builds: 6–24 |
| `average` | **stage 6** | 30, but ONLY on `value` | `cheapest` 17, `balanced` 20, `scavenge4` 6 |
| `trail` | 6 | 20 (`balanced`) | 15–20 |
| `careless` | 2 | 2 | stage 1–2 |

Read the first column twice. A player who never opens the shop used to finish
the game holding 23 373 unspent coins; they now wall at **stage 6–8**. The shop
has stopped being optional, which is what makes every other number in this file
mean something.

The second thing to read is `average`'s row. Three of its four purchasing
strategies now fail for a mid-skill player and only `value` carries them to 30 —
at **71 attempts** against `optimal`'s 38. That is a real difficulty gradient
where there used to be one attempt per stage for everybody.

## Clear rate, stages 1–5, 20 seeds a cell

| stage | optimal | good | average | careless | trail |
| --- | --- | --- | --- | --- | --- |
| 1 | 100% | 100% | 100% | 100% | 100% |
| 2 | 100% | 100% | 100% | 70% | 100% |
| 3 | 100% | 100% | 100% | 0% | 0% |
| 4 | 100% | 100% | 100% | 0% | 0% |
| 5 | 100% | 100% | 100% | 0% | 0% |

The opening five are a tutorial a competent player does not fail and a careless
one stops clearing at stage 3 — the shape the adaptive pass was aiming for.
`careless` clearing stage 1 and most of stage 2 is deliberate: the floor is "a
player who never steers still sees the first boss die".

## The boss fight, now that it is priced against the run

The adaptive bar (stages 1–5) means boss HP is no longer a constant — it is the
firepower that walked into the arena times the seconds that run has earned.

| stage | policy | boss hp | DPS at boss | TTK | boss survived |
| --- | --- | --- | --- | --- | --- |
| 1 | optimal | 2 015 | 686 | **4.0 s** | 0% |
| 1 | average | 1 151 | 309 | 5.7 s | 0% |
| 1 | careless | 391 | 69 | 6.4 s | 0% |
| 2 | optimal | 13 329 | 2 565 | **4.9 s** | 0% |
| 2 | average | 1 304 | 145 | 5.6 s | 0% |
| 3 | optimal | 5 424 | 2 088 | **6.0 s** | 0% |
| 3 | average | 1 646 | 372 | 8.4 s | 0% |
| 4 | optimal | 2 324 | 630 | **8.0 s** | 0% |
| 4 | average | 798 | 196 | 10.7 s | 0% |
| 5 | optimal | 10 432 | 4 176 | **5.9 s** | 0% |
| 5 | average | 1 050 | 246 | 8.3 s | 0% |

Against the old table — 3.0 s for `optimal` on stage 2 and 20.2 s for `average`
on stage 5 — the spread has closed from 17 seconds to about five, and a boss
worth 13 329 HP against a 285-strong crowd still falls in under five seconds.
Stage 4 is the long one at 8–10.7 s, for the reason this file has recorded
twice: it is the first road carrying boulders and barricades, and the crowd that
reaches its arena is the smallest of the five.

**Reaction latency is no longer the wall it was.** The old table had clear rate
at 100 % for a 150 ms thumb and 0 % at 250 ms. It is now 100 % at every latency
out to 400 ms, with no slams connecting below 400 ms:

| latency | clear rate | slams that connected | boss TTK |
| --- | --- | --- | --- |
| 0–300 ms | 100% | 0% | 5.0–5.3 s |
| 400 ms | 100% | 5% | 5.3 s |

That is stage 2 with competent routing, and it says the slam no longer decides
an early stage. Deeper in it does: the budget-matched probe at stage 12 has
**27–34 % of ~254 slams connecting** on every build tested.

## The retry relief, measured where it matters

| case | failures | hp mult | clear |
| --- | --- | --- | --- |
| stage 5, `trail` (dies on the road) | 0 | 1.00 | **0%** |
| stage 5, `trail` | 1 | 0.80 | **100%** |
| stage 13, `trail` (dies to the boss) | 0 | 1.00 | 0% |
| stage 13, `trail` | 1 | 0.80 | 0% |
| stage 13, `trail` | 2 | 0.72 | **100%** |
| stage 1, `careless` (dies to slams) | 0–4 | 1.00 → 0.62 | 100% throughout |

One failure is enough to turn a road-death into a clear; a boss-death takes two.
The old complaint — "14 of 15 simulated retries moved the clear rate by exactly
0 %" — is answered, and the slam share is why.

Its cousin, the **challenge streak**, is the one number this run says may now be
too strong at depth. Stage 18, build `s8 p9 r7`:

| streak | hp mult | boss hp | `good` clears |
| --- | --- | --- | --- |
| 0 | 1.00 | 144 803 | 100% |
| 3 | 1.39 | 51 388 | 50% |
| 6 | 1.78 | 65 807 | **0%** |
| 9+ | 2.17–2.56 | 80 225–94 643 | **0%** |

A six-stage clear streak is not rare for a player who has learned the game, and
it currently turns stage 18 into a wall for `good`. Flagged rather than acted on:
the probe holds the build fixed, while a real streak of six also means six
stages of income the table does not model. The honest next step is a career run
that reports the streak at the moment of each wall.

## What the retention pass did NOT move

Stated because it is the useful half of a re-run.

* **Gate payouts, the pillar tax, the crate economy and the miniboss are
  unchanged**, to the number. The face-down leaf is a presentation of a rolled
  door — the op and value under it are ordinary and are paid the ordinary way —
  so it moves no arithmetic, and the scripted policies read through it anyway.
* **The milestone lump does not show up as an easier campaign.** `optimal +
  value` still reaches 30 in 38 attempts. It arrives as a smoother wallet rather
  than a shorter career, which is what a payout priced at one good stage's income
  is supposed to do.
* **The renderer changes are invisible here by construction** — the harness
  never draws.

## What the study still cannot see

Unchanged from `CAREER.md`, plus two this pass added:

* **No policy ever presses a skill.** The grenade, the shield, the frost nova and
  the decoy flare are invisible to every number in this file, which is why the
  90 s / 75 s cooldown re-pricing could not be judged here.
* **No policy ever refuses a gamble.** The face-down leaf is a decision about
  information, and the policies have perfect information — they read the op and
  value under the `?`. Whether a human takes it, and whether taking it is
  correct, is a playtest question this harness is structurally unable to answer.

---

# Re-measured, 2026-09-14 — the opening five re-cut

Everything above this line is the state the campaign was in before this pass.
Three complaints started it, all about stages 1–5: the banks were not asking
anything, the crowd snowballed out of control, and stages 1–3 were a cutscene
while stage 4 was a wall. All three turned out to be the same two facts.

Reproduce every table below with:

```bash
SIM_EARLY=1 npx vitest run tests/sim/scratch.early.test.ts --reporter=verbose
# PowerShell: $env:SIM_EARLY=1; npx vitest run … --reporter=verbose
```

## What the doors were actually asking

The crowd walk prints, for every bank of every authored stage, the crowd that
reaches it and the crowd at which its best door changes. Before:

| stage | banks | answer never changes | longest run of `×N` banks | crowd at the last bank |
| --- | --- | --- | --- | --- |
| 1 | 3 | 0 | **3** | 76 |
| 2 | 6 | 1 | **3** | 252 |
| 3 | 6 | 1 | **3** | 304 |
| 4 | 6 | 1 | 2 | 158 |
| 5 | 7 | 2 | **3** | **616** |

The middle column undersells it. Every multiplier bank had a crossover — `+9`
against `×1.6` flips at 15 — and every one of them sat **far below the crowd
standing in front of it**: the flips ran 7–22 while the crowd ran 44–452. A bank
is only a question inside the band of crowds a player can actually arrive with,
and not one of these was. The player was executing arithmetic, not doing it.

Underneath that, three mechanical faults:

1. **`mulLeaves` was 99 below stage 6.** The opening five's `mul(2)` calls were
   hand-placed and measured, but `legalise` rule 4b turned every leftover
   `add|add` bank into another multiplier for free and charged nothing for it.
   Three stages ran three multiplier banks in a row.
2. **`MUL_EARLIEST` was never enforced on the authored stages.** All five opened
   on a multiplier at ~10 % of the road, offered to the three survivors a stage
   starts with. `rollBank` asks `canMul`; a hand-written `mul(2)` asked nobody.
3. **`legalise` rule 5 deleted every `×2 | ÷N` bank in the game.** `offerScore`
   prices a multiplier at `base × 1.4 × (value − 1)`, and a `×2` door is on the
   road as a `×1.6` — so it scored 0.84 × base, failed the "worth crossing for"
   test, and was overwritten with an add. Stage 4's "first pure-routing bank
   (`×2 | ÷2`)" and stage 5's `×3 | ÷2` had never once printed as anything but
   `+N | ÷2`. Repaired for the opening five only: the fix moves `routingNext`
   and through it every later roll, so above stage 5 it re-lays roads this study
   was run against.

## What the doors ask now

| stage | banks | `×N` banks | closest two | the live bank | crowd at the last bank |
| --- | --- | --- | --- | --- | --- |
| 1 | 3 | 1 | — | `×1.6 \| +5` flips at 9 | 41 |
| 2 | 6 | 1 | — | `+14 \| ×1.6` flips at 24 | 91 |
| 3 | 6 | 1 | — | `×1.6 \| +11` flips at 19 | 86 |
| 4 | 6 | 2 | 76 units | `+22 \| ×1.6` flips at 37 | 108 |
| 5 | 7 | 2 | 77 units | `+36 \| ×1.6` flips at 60 | 212 |

The rule behind the "live" column is one line of arithmetic: a `×2` door pays
six tenths of whoever walks through it, so an add beside it ties at
`0.6 × crowd`. Doors are priced against a MEASURED crowd now rather than against
`base + 6` (`liveDoor` / `roadDoor` in `track.ts`), and the tie is put on the
crowd a MIDDLING run arrives with — so the better half of players take the
multiplier and the worse half take the number.

Pricing the tie against the BEST run was tried first and rejected on
measurement: it puts a `+43` on stage 2, which is six tenths of a crowd only the
best run has and three times the crowd of a run that has been ploughing into
things. A door is a promise to everyone who reaches it, so a door priced for the
best run is a rescue package for the worst one — it took `careless`, which never
touches the screen, from failing stage 2 to clearing stages 2, 3 and 5 with a
peak of 110.

## The crowd, and the road

| stage | peak crowd, `optimal` | was | crowd lost on the road | was |
| --- | --- | --- | --- | --- |
| 1 | 34 | 44 | 20 % | 39 % |
| 2 | 88 | **285** | 4 % | **0 %** |
| 3 | 67 | **228** | 8 % | **1 %** |
| 4 | 54 | 72 | **56 %** | **72 %** |
| 5 | 164 | **452** | 8 % | **0 %** |

Stages 2, 3 and 5 lost two thirds of their crowd and gained a road. Stage 4 kept its character and stopped being a wall. It is still the hardest of
the five by design and still the outlier — 56 % against 4-8 % — but in absolute
survivors the road takes 30 where it took 52, and the climax it hands them to is
no longer twice its neighbours’. What is left is contact rather than tuning:
softening its bodies further was tried and measured as INERT (foe losses 31 to
31), because a stage-4 foe does not live long enough for its health to matter.
Closing the rest of that gap means moving a beat, not turning a dial.

Three changes did that, and not one of them is a number on stage 4's road:

* **Barricades and boulders stopped arriving on the same stage.** A barricade
  can be shot and a boulder cannot, which is the whole difference between an
  obstacle that teaches and one that only punishes. Boulders stay behind
  `HARD_OBSTACLE_FROM_STAGE`; barricades arrive on stage 2, thinned
  (`earlyBarricadeKeep`). Stages 2 and 3 already AUTHOR them — the relief was
  deleting every one, and the thinning ignored its own fraction (it dropped
  every second obstacle whatever the curve said, so 0.5 and 0.75 built the same
  road).
* **The pack cap stopped rewriting the stages.** `earlyPackCap` was 2 on stages
  2 and 3, which author a three-husk pack, a four-hound pack and a five-husk
  pack. The roads the player met had two bodies in each.
* **The adaptive yardstick stopped misreading stage 4.** `perfectSquadFor`
  counts doors and assumes a flawless run loses nobody. On stage 4 — first
  boulders, first barricades, and the one bank where both doors take something —
  a flawless run finishes having lost about half of what the doors paid, so it
  scored 0.52 of its ceiling where the same player scores 0.8–0.9 on the
  neighbours. The ladder read a good run as a mediocre one and handed it a
  longer fight. `ROAD_ATTRITION` in `adaptive.ts` is that share, measured.

## The boss, after the yardstick was corrected

Wall-clock seconds from the boss spawning to its death, 3 seeds:

| stage | optimal | good | average | was (optimal / average) |
| --- | --- | --- | --- | --- |
| 1 | 4.0 s | 4.8 s | 4.7 s | 4.0 / 5.7 |
| 2 | 4.8 s | 4.9 s | 5.0 s | 4.9 / 5.6 |
| 3 | 5.9 s | 6.0 s | 6.6 s | 6.0 / 8.4 |
| 4 | 6.3 s | 6.4 s | 6.6 s | **8.0 / 10.7** |
| 5 | 6.0 s | 7.1 s | 7.8 s | 5.9 / 8.3 |

Stage 4's climax is now its neighbours' length, and its slam takes 12 survivors
a run where it took 28.

## The floor still holds

That a run which never touches the screen is not a way to PLAY the game is the
rule this pass came closest to breaking, twice, and both times the doors were
why. Final:

| policy | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| `careless` clears | 67 % | 0 % | 0 % | 0 % | 0 % |
| `trail` clears | 100 % | 100 % | 0 % | 100 % | 0 % |

A zero-input career with the cheapest shop behind it stalls at stage 2
(`reached 1, stuckAt 2` on both probe seeds, against a bound of 3 and 4).

## New: relief that arrives before the first loss

Every other concession is paid on a FAILURE, which is a late signal — a beginner
who scrapes through stage 1 with four survivors has not failed anything, so
nothing in the save knows they are struggling. `carryReliefFor` reads the share
of the previous stage's yardstick the player's crowd actually reached and takes
up to a quarter off every enemy on the next road, on a straight line between
`perf 0.55` (nothing) and `perf 0.20` (the full quarter). Scoped to the opening
five, never shown in the HUD, and **not written by a run nobody played** — the
same `wasPlayed()` gate the failure ledger uses. Without that gate an idle tab
banks a terrible score, collects a quarter off stage 2, and walks the campaign
on concessions it never earned; measured, exactly that took a zero-input career
from stage 3 to stage 5.

## What this pass did NOT move

* **Stages 6 and up are byte-identical.** Every rule above is scoped to the five
  stages that were measured. Two leaked on the first cut — the pacing filler's
  new door values, and the rule-5 repair — and both were caught by the existing
  suite (a weapon box at 95 % of stage 114, a boss that stopped throwing charged
  swings on stage 9) rather than by anything written here.
* **The `+N | +N+1` pacing filler survives above stage 5**, which is the same
  shape rule 4c exists to stop. Answering it there means re-tuning an economy
  balanced around free `add|add` banks — the job rule 4b's own comment defers,
  for the same reason.
* **`gateAddBase` is untouched.** The opening five are authored, so their doors
  are written as crowds rather than as offsets from it; the curve still sets the
  floor under every one of them (`roadDoor`).

---

# Re-measured, 2026-09-14 (later) — the opening is a session

The opening five pass above left stage 1 a ~26 s road trip ending on a 4.0 s
boss. The drop-out data says that is the problem rather than the fix: **the
median exit is ~35 s in and lands right after the first boss dies.** The exit is
the climax, not the road in front of it, so the shorter road moved the exit
earlier instead of removing it.

Stage 1 is now a **~70 s** round trip. Four changes, each measured.

## The road

`STAGE_ONE_LENGTH` 105 → **320** (62.7 s of walking at `RUN_SPEED`), and the
beats re-cut into three acts rather than stretched. The acts are the point: the
cheap way to double a stage is to double the road and leave the beats where they
were, which produces thirty seconds of game and forty of walking.
`tests/game/stageOneShape.test.ts` pins that every quarter of the road carries
more than one thing that is not scenery.

| | before | after |
| --- | --- | --- |
| road | 105 u (20.6 s) | 320 u (62.7 s) |
| banks | 3 + opening solo | 5 + opening solo |
| elites | 1 | 2 |
| the swell (`×2`) | y = 78 (77 %) | y = 240 (76 %) |

## Two elites, and they are different fights

The first is at 38 % and carries the **grenade lesson** — the lightbox is armed
on the road's FIRST elite, so it belongs to that one by construction. The second
is at 86 %, by which time the grenade is spent: it is the same fight answered
with the crowd's own guns, which is the beat that says the player can do it
themselves.

## An elite is priced in seconds of the crowd's own fire

`adaptiveEliteHp`, read when the elite streams in — `LOOKAHEAD` is 30 units, so
the price is struck about six seconds before the fight, off the squad, damage
and fire rate the player actually has.

The authored curve was not describing a fight, it was describing whoever walked
into it:

| | optimal | good / average | stages 2-3 |
| --- | --- | --- | --- |
| before | 2.3 s | **5.3 s** | 0.8-1.5 s |
| after | 1.4 s | 1.3-1.5 s | 1.2-1.5 s |

"Not one-shottable" falls out of the price rather than being bolted on: a bar
quoted in seconds of fire is, by construction, more than one volley of it,
whatever the crowd size. Checked at the opening fire rate — the slowest the
crowd ever shoots — in `stageOneShape.test.ts`.

The one thing the price cannot see is a bank inside those 30 units. The
generator keeps gates `MINIBOSS_LEAD` clear of an elite, so a door can still land
13-30 units ahead of one and hand the crowd a payout after the price was struck.
That makes the fight shorter than its target, never longer.

## The first boss has a floor

`ADAPTIVE_FIRST_FIGHT_SECONDS` — six seconds of straight fire, where every other
stage keeps the 2.0 s anti-melt floor. Six and not five because the two are
different measurements: the number is a target handed to `expectedDamage`, which
integrates the crowd shrinking under the boss's swings, so the bar it buys is
cleared a little faster than the target says. At a target of 5.0 the realised
fight was 4.7 s of fire and 5.7 s on the clock — both under the brief.

| | before | after |
| --- | --- | --- |
| boss, optimal | 4.0 s | 6.6 s |
| boss, good | 4.8 s | 6.6 s |
| boss, average | 4.7 s | 6.7 s |

The ceiling is untouched (`ADAPTIVE_MAX_SECONDS`, 7.5 s of fire), so a hopeless
crowd is not handed a longer fight than the brief allows just because it is
their first one.

## The whole stage, measured

Through the simulation, 4 seeds a policy:

| policy | total | elite | boss | peak crowd | clears |
| --- | --- | --- | --- | --- | --- |
| `optimal` | 69.9 s | 1.4 s | 6.6 s | 58 | 100 % |
| `good` | 70.2 s | 1.4 s | 6.6 s | 61 | 100 % |
| `average` | 70.3 s | 1.3 s | 6.7 s | 59 | 100 % |
| `careless` | 69.6 s | 1.1 s | 6.3 s | 38 | 100 % |
| `trail` | 70.4 s | 1.4 s | 6.7 s | 54 | 100 % |

…and played in a real browser on the production build, with a driver that steers
like a player and presses the grenade when the lesson demands it:

```
total 74.1s, cleared, peak 78
grenade lesson at 23.4s (34 % of the road)
elites  [ 32 % · 106 hp · 4.4 s · the lesson ]
        [ 80 % ·  802 hp · 2.1 s · squad only ]
boss    7.4s
banks   +6|+2 @14 %   +4|+2 @44 %   +5|+2 @59 %   x1.6|+17 @73 %   +6|+2 @93 %
```

The two elites' health — 106 against 802 — is the adaptive price working: the
same fight, struck against the crowd that turned up to each.

## What this costs, stated plainly

`careless` now clears stage 1 on every seed where it used to clear two thirds.
A longer road with five banks on it hands a no-input run more crowd, and stage 1
is the one stage where that is allowed: the floor the balance suite defends is
"a run that never touches the screen still sees the first boss die", and stage 2
still stops one dead. The career probe is unchanged — zero-input play stalls at
stage 2.

## …and then stage 1 got teeth

Three additions to the seventy-second opening, all on the same reasoning: a road
that long has room to teach a prop properly and to ask a question it used to
defer to stage 2.

**Two cages, hand-priced.** Four HP and twelve. The first comes apart in a
single volley from whatever crowd is passing — the crate wall's trick
(`TUTORIAL_CRATE_WALL`, pinned at 1), because a cage is the one prop whose
payout cannot be guessed by looking at it and a lesson the player cannot afford
to break is a lesson nobody learns. The second is three times that, so a crowd
that clips it in passing does NOT open it and the detour has to be committed to.
Each frees three survivors.

`CAGE_STAGE` still says 2 and still means something: it is where the GENERATOR
starts placing them. Stage 1's pair is authored in `stageOne`, exactly as its
crate wall and its second pickup are.

**A `÷2` at 47 % and a `−3` at 62 %.** Stage 1 used to carry nothing hostile at
all, on the reasoning that the first road should only ever give. That was right
for a thirty-second road; on a seventy-second one it meant the back half of the
opening asked nothing, and the first door that could cost anything arrived on
stage 2 with a whole stage's crowd riding on it. The introduction order moved
INSIDE stage 1 rather than across stages — trap first, bill second, both past
`SUB_EARLIEST`, both beside a door that pays, and both deliberately the soft
version (`÷2` on a crowd of twenty, `−3` the player can watch leave).

| stage 1, 4 seeds | total | boss | elite | peak | lost | clears |
| --- | --- | --- | --- | --- | --- | --- |
| `optimal` | 71.0 s | 6.7 s | 1.4 s | 59 | 9.3 | 100 % |
| `good` | 70.3 s | 6.5 s | 1.7 s | 74 | 3.5 | 100 % |
| `average` | 70.9 s | 6.8 s | 1.8 s | 38 | 12.0 | 100 % |
| `careless` | 69.8 s | 6.4 s | 1.1 s | 31 | 6.8 | 100 % |
| `trail` | 70.4 s | 6.7 s | 1.8 s | 64 | 5.8 | 100 % |

`average`'s losses are now `trap:28 foe:16` — the hostile doors are where a
player with a 250 ms thumb pays, which is what "a bit tougher" was asked for.
`careless` pays the pillar instead (`divider:20`) and drops from clearing every
seed of the held first-session road to two in three, which is the historical
5-in-8 the balance suite was written around rather than a new floor.

Played in a real browser on the production build:

```
total 74.3s, cleared, peak 89
cages   4 hp @27 %  (3 survivors)    12 hp @68 %  (3 survivors)
banks   +6|+2 @14 %   /2|+4 @44 %   +5|-3 @59 %   x1.6|+17 @73 %   +6|+2 @93 %
elites  32 % · 124 hp · 4.4 s · the lesson
        80 % · 746 hp · 2.7 s · squad only
boss    7.6s
```
