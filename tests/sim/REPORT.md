# Balance report — stages 1–5, measured

How to reproduce every number here:

```bash
SIM_STUDY=1 npx vitest run tests/sim/study.test.ts                 # 20 samples/cell
SIM_STUDY=1 SIM_SAMPLES=10 npx vitest run tests/sim/study.test.ts  # faster
# PowerShell: $env:SIM_STUDY=1; npx vitest run tests/sim/study.test.ts
```

The study is excluded from the default suite (it runs 500 full games). The fast
regression that guards the conclusions — `tests/sim/balance.test.ts` — is in the
default suite and takes ~4 s.

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
