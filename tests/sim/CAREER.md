# The career study

*What thirty stages actually feel like to a player who carries their save with them.*

`REPORT.md` measures a stage. This measures a **career**: stage 1 with an empty
wallet and an empty shop, then every stage after it, carrying coins, upgrade
levels, `ts_challenge` and `ts_failed_stages` forward the whole way — which is
the only condition under which the autobalancer, the relief and the shop can be
observed doing anything at all.

Reproduce:

```
npx vitest run tests/sim                                   # the fast regressions
SIM_STUDY=1 SIM_OUT=out.md npx vitest run tests/sim/study.test.ts -t careers
```

Anything that reports through `console.log` rather than `SIM_OUT` — the scratch
probes, for instance — additionally needs `--reporter=verbose`: Vitest 4's
default reporter drops console output from passing tests, so a study runs for
minutes and prints nothing.

Everything below is a median of three careers per cell (eight seeds per cell for
the fixed-level probes), on the source as of the three-leaf-bank landing.
Nothing is modelled; every number came out of `useSurvivalGame.step()`.


> **Status: resolved.** This document is the diagnosis, kept as written. The
> fixes it asked for landed and the same careers were re-run against them —
> jump to [After the fix](#after-the-fix) for the numbers the game ships with.

---

## The answer, first

**Yes, it is too easy — and not by a little.** Every scripted player who touches
the screen at all clears all thirty stages, on every purchasing strategy,
including *never buying anything*.

| player | reaches | attempts for 30 stages | with no shop at all |
| --- | --- | --- | --- |
| `optimal` (pumps gates, takes every crate, aims the safe line) | **30** | 30 | **30** |
| `good` (routes correctly, never pumps, never detours) | **30** | 30 | **30** |
| `average` (250 ms latency, drifts to the nearer leaf, aims at painted centres) | **30** | 30–31 | **30** |
| `careless` (never steers) | 0 | stuck on stage 1 | 0 |
| `trail` (follows coin trails into traps) | 2–10 | stuck on stage 5 / 11 | 2 |

Thirty stages, thirty attempts. **One attempt per stage, for every competent
player, for the entire game.** A `good` player who never opens the shop finishes
stage 30 holding 23 373 unspent coins — more than the whole meta economy costs.

The design's own instruments say the same thing from the other end: the end boss
throws its first slam 2.6 s after it spawns, and from stage 8 onward it is dead
in **0.8–1.4 s**. Across every dodging policy at every stage measured, the number
of boss slams that killed anybody is **zero**.

---

## Where the wall is

The brief's definitions: *a stage that takes a `good` player more than ~2
attempts is a wall; a stage that `careless` clears is a hole.*

**There is no wall in stages 1–30.** No stage takes `good` more than one attempt,
on any seed, on any purchasing strategy, including the empty one. There is also
no hole: `careless` clears nothing and never reaches a boss past stage 1.

What there is instead is a **difficulty inversion**. The only stages with any
friction are at the very beginning, and the friction is the wrong kind — a
bullet-sponge boss rather than a threat:

| stage | `good`, career-realistic shop | boss TTK | what it means |
| --- | --- | --- | --- |
| 1 | 32 survivors, 157 DPS | 6.3 s | correct |
| 2 | 36 survivors, 137 DPS | 11.2 s | slow |
| 3 | 22–29 survivors, 84–110 DPS | **25.8 s** | the worst fight in the game |
| 4 | 43 survivors, 253 DPS | 10.8 s | slow |
| 5 | 172 survivors, 590 DPS | 5.7 s | correct |
| 8 | 351 survivors, 4 127 DPS | 1.2 s | the boss is scenery |
| 12–30 | 290–700 survivors, 5 000–30 000 DPS | 0.7–2.1 s | the boss is scenery |

Stage 3 is a genuine outlier and worth its own look: `good` arrives at that boss
with **fewer survivors and less DPS than it had on stage 1** (22 vs 32, 84 vs
157), because stage 3's crates are expensive relative to a level-0 run's
firepower and its headline `×2 | +8` bank pays nothing to a crowd that small. It
is the one stage where a competent player is asked to stand still and shoot for
half a minute.

### The full career, `good` + `value`

Median of three careers. `chal` is the challenge streak the stage was played at,
`hp ×` the resolved `reliefFor × challengeFactor` multiplier, `paid` the share of
the gate payout that survived the `MAX_SQUAD` ceiling.

| stage | clear | att | earned | spent | wallet | levels | squad@boss | DPS@boss | boss hp | TTK | chal | hp × | paid | top causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 100% | 1 | 89 | 60 | 29 | s0 p0 r0 $0 | 32 | 157 | 1 000 | 6.3 | 0 | 1.00 | 100% | foe 2 |
| 2 | 100% | 1 | 113 | 80 | 60 | s0 p0 r0 $1 | 36 | 137 | 1 530 | 11.2 | 1 | 1.05 | 100% | elite 7, foe 5 |
| 3 | 100% | 1 | 103 | 155 | 9 | s1 p0 r0 $1 | 22 | 84 | 2 109 | 25.8 | 2 | 1.11 | 100% | foe 26, trap 9 |
| 4 | 100% | 1 | 159 | 124 | 40 | s1 p1 r0 $2 | 43 | 253 | 2 738 | 10.8 | 3 | 1.17 | 100% | foe 29, elite 7 |
| 5 | 100% | 1 | 446 | 395 | 98 | s2 p1 r0 $2 | 172 | 590 | 3 416 | 5.7 | 4 | 1.22 | 100% | foe 15, elite 15 |
| 6 | 100% | 1 | 614 | 583 | 132 | s2 p2 r0 $4 | 208 | 1 747 | 4 144 | 2.3 | 5 | 1.27 | 100% | foe 33, elite 30 |
| 7 | 100% | 1 | 755 | 734 | 153 | s3 p3 r0 $5 | 228 | 1 459 | 4 921 | 3.0 | 6 | 1.33 | 100% | foe 31, elite 11 |
| 8 | 100% | 1 | 1 040 | 1 117 | 60 | s4 p4 r2 $5 | 351 | 4 127 | 5 748 | 1.2 | 7 | 1.39 | 100% | foe 41, elite 8 |
| 9 | 100% | 1 | 944 | 646 | 386 | s5 p5 r2 $6 | 292 | 2 909 | 6 624 | 2.1 | 8 | 1.44 | 100% | foe 64, elite 8 |
| 10 | 100% | 1 | 1 305 | 1 500 | 249 | s5 p6 r3 $6 | 386 | 7 085 | 7 550 | 1.0 | 9 | 1.50 | 100% | foe 56, elite 9 |
| 11 | 100% | 1 | 1 608 | 1 782 | 85 | s6 p6 r4 $7 | 468 | 4 912 | 8 525 | 1.6 | 10 | 1.55 | 100% | foe 42, elite 12 |
| 12 | 100% | 1 | 2 507 | 2 052 | 526 | s6 p7 r5 $8 | 686 | 9 554 | 9 550 | 0.9 | 11 | 1.60 | 100% | foe 44, elite 6 |
| 13 | 100% | 1 | 1 200 | 1 368 | 475 | s7 p8 r5 $8 | 294 | 5 205 | 10 624 | 2.1 | 12 | 1.66 | 99% | foe 40, elite 18 |
| 14 | 100% | 1 | 2 197 | 2 359 | 313 | s7 p9 r5 $8 | 584 | 8 497 | 11 371 | 1.4 | 12 | 1.66 | 100% | divider 73, foe 50 |
| 15 | 100% | 1 | 1 901 | 946 | 1 300 | s8 p9 r6 $8 | 470 | 9 996 | 12 118 | 1.4 | 12 | 1.66 | 100% | foe 60, elite 8 |
| 16 | 100% | 1 | 2 458 | 2 975 | 634 | s8 p9 r7 $8 | 643 | 12 174 | 12 865 | 1.0 | 12 | 1.66 | 100% | foe 100, elite 15 |
| 17 | 100% | 1 | 2 818 | 2 665 | 787 | s8 p10 r7 $9 | **700** | 22 014 | 13 612 | 0.8 | 12 | 1.66 | **77%** | foe 117, elite 22 |
| 18 | 100% | 1 | 2 773 | 2 876 | 858 | s9 p10 r7 $9 | **700** | 13 759 | 14 359 | 1.1 | 12 | 1.66 | **72%** | foe 64, elite 30 |
| 19 | 100% | 1 | 2 388 | 1 400 | 1 776 | s9 p11 r7 $9 | 579 | 10 491 | 15 106 | 1.4 | 12 | 1.66 | 100% | foe 78, elite 3 |
| 20 | 100% | 1 | 2 872 | 4 131 | 592 | s9 p11 r8 $9 | **700** | 15 743 | 15 853 | 1.0 | 12 | 1.66 | 93% | foe 116, elite 29 |
| 21 | 100% | 1 | 2 721 | 2 072 | 1 068 | s10 p11 r8 $9 | 674 | 29 493 | 16 600 | 0.7 | 12 | 1.66 | 99% | foe 96, elite 47 |
| 22 | 100% | 1 | 1 342 | 0 | 2 410 | s10 p11 r9 $9 | 289 | 9 797 | 17 347 | 1.8 | 12 | 1.66 | 100% | foe 168, elite 26 |
| 23 | 100% | 1 | 2 918 | 4 170 | 1 162 | s10 p11 r9 $9 | **700** | 16 339 | 18 094 | 1.2 | 12 | 1.66 | **75%** | foe 71, elite 15 |
| 24 | 100% | 1 | 2 885 | 3 066 | 981 | s10 p12 r9 $9 | **700** | 22 596 | 18 841 | 0.9 | 12 | 1.66 | 93% | foe 222, elite 42 |
| 25 | 100% | 1 | 3 068 | 1 408 | 2 641 | s10 p12 r10 $9 | **700** | 23 229 | 19 588 | 0.8 | 12 | 1.66 | **78%** | foe 116, elite 9 |
| 26 | 100% | 1 | 3 148 | 0 | 5 774 | s10 p12 r10 $10 | **700** | 25 931 | 20 335 | 0.8 | 12 | 1.66 | **65%** | foe 252, elite 44 |
| 27 | 100% | 1 | 3 148 | 6 403 | 2 521 | s10 p12 r10 $10 | **700** | 26 645 | 21 082 | 0.8 | 12 | 1.66 | **54%** | foe 149, elite 6 |
| 28 | 100% | 1 | 3 135 | 0 | 5 647 | s11 p12 r10 $10 | **700** | 19 813 | 21 829 | 1.2 | 12 | 1.66 | **75%** | foe 109, barricade 22 |
| 29 | 100% | 1 | 3 232 | 6 047 | 2 854 | s11 p12 r10 $10 | **700** | 30 061 | 22 576 | 0.8 | 12 | 1.66 | **53%** | foe 107, elite 21 |
| 30 | 100% | 1 | 3 126 | 0 | 5 976 | s11 p13 r10 $10 | **700** | 21 697 | 23 323 | 1.2 | 12 | 1.66 | **70%** | foe 109, elite 22 |

`optimal` + `value` is the same table shifted: TTK **0.4–0.9 s** from stage 5
onward, 55 510 DPS against a 23 323 HP boss on stage 30.

**Cause of death is almost entirely `foe`** — ordinary packs biting the crowd —
plus `elite` (minibosses) and the occasional `divider` on a mis-aimed bank. The
boss is not in the list. Neither is the slam. The game's climax contributes
nothing to its difficulty.

---

## Enemy health is the wrong *shape*, not just the wrong size

Over a `good` career, DPS at the boss goes **157 → 21 697 (×138)**. Boss health
goes **1 000 → 23 323 (×23.3)**, of which ×1.66 is the challenge streak and only
×14.05 is `bossHpScale`. The player's power is a product of three growing terms
(squad × damage × fire rate, each of which is itself fed by the gates); the
boss's is a straight line in one.

The gap is not uniform, and this is the useful part:

| stages | player DPS grows | boss HP grows | verdict |
| --- | --- | --- | --- |
| 1 → 4 | ×1.6 | ×2.7 | boss OUTGROWS the player — this is why stages 2–4 are 10–26 s slogs |
| 5 → 12 | **×16.2** | ×2.1 | the whole failure lives here |
| 12 → 30 | ×2.3 | ×2.4 | the linear slope is *correct* from here on |

So the fix is not "make it exponential forever". It is: **stop growing through
stages 1–4, then take a one-time ~5.5× step over stages 5–12, then resume
roughly the slope you already have.**

```ts
// src/game/foes.ts  — before
export const bossHpScale = (stage: number): number => 1 + (stage - 1) * 0.45

// after
export const bossHpScale = (stage: number): number =>
  Math.pow(1.55, Math.max(0, Math.min(stage, 12) - 4)) *
  (1 + Math.max(0, stage - 12) * 0.12)
```

Simulated against the DPS every policy actually arrives with:

| | stage 3 | stage 8 | stage 12 | stage 20 | stage 30 | median TTK, stages 8–30 |
| --- | --- | --- | --- | --- | --- | --- |
| `good`, now | 25.1 s | 1.4 s | 1.0 s | 1.0 s | 1.1 s | **1.1 s** |
| `good`, proposed | 13.2 s | 1.9 s | 5.6 s | 6.9 s | 8.1 s | **6.7 s** |
| `optimal`, now | 4.3 s | 0.9 s | 0.6 s | 0.5 s | 0.4 s | **0.5 s** |
| `optimal`, proposed | 2.3 s | 1.3 s | 3.1 s | 3.3 s | 3.1 s | **3.5 s** |

That lands `good` inside the stated 5–8 s target and gives `optimal` the 3–4 s
finish a perfect run is supposed to earn. Two consequences to decide on
deliberately:

* **`track.ts`'s `minibossHp` imports `bossHpScale`**, so minibosses scale with
  it — stage-30 elites go from 4 930 HP to ~37 000. Given that `elite` deaths are
  already the second-biggest cause on every stage, I think that is correct, but
  it is a real change and it should be a choice.
* **Stages 6, 8 and 10 stay fast (1.8–2.9 s)** even under the new curve, because
  the player's DPS genuinely explodes there. No boss curve can flatten that; if
  you want those stages to bite, the lever is the road, not the boss.

Separately: **per-stage DPS varies by 3× depending on how many multiplier gates a
stage happened to roll** (stage 21 gives `good` 29 493 DPS, stage 22 gives 9 797).
That variance is bigger than any boss-curve tuning, and it belongs to the
generator rather than to the boss.

`foeHpScale` is linear too, but it matters much less: foes kill through *bite
count*, not HP, and they are already the #1 cause of death everywhere. Leave it.

---

## `MAX_SQUAD` starts eating the payouts at stage 12

`claimBank` spawns `min(gain, MAX_SQUAD − squad)` and says nothing. Measured
directly by capturing the `gatePass` effect (which carries what was actually
spawned) and comparing it to what the winning door printed:

| stage | policy | peak squad | promised | delivered | paid | banks clipped | s at cap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | `optimal` | 700 | 769 | 709 | **92%** | 1 | 3 |
| 12 | `good` | 700 | 754 | 704 | **93%** | 1 | 4 |
| 18 | `optimal` | 700 | 1 118 | 712 | **64%** | 2 | 3 |
| 18 | `good` | 700 | 980 | 721 | **74%** | 2 | 4 |
| 26 | `optimal` | 700 | 1 074 | 795 | **74%** | 1 | 3 |
| 26 | `good` | 700 | 1 244 | 799 | **64%** | 1 | 3 |
| 30 | `good` | 700 | 1 044 | 741 | **71%** | 1 | 4 |
| 30 | `average` | 700 | 867 | 737 | **85%** | 1 | 4 |

**Clipping begins at stage 12 and is material from stage 17.** In the `good` +
`value` career the doors pay 53–78 % of what they print on eight of the last
fourteen stages; stage 27 and stage 29 pay barely half.

It is worse than an accounting problem, because it is *regressive*: `average`
clips far less than `good` does, purely because its crowd is smaller. The better
you play, the more the game silently short-changes you, and it does it at the
exact moment the payoff is supposed to be biggest.

Two ways out, and they are not equivalent:

1. **Raise the ceiling** to ~1 200. Cheapest change; 700 bodies already stopped
   reading as individuals (`MAX_DRAWN` is 190), so the extra 500 cost formation
   maths and nothing else. Restores honesty through stage 30 and no further.
2. **Make the overflow pay something** — surplus survivors convert to coins, or
   to a flat damage bonus. Keeps the ceiling, keeps the promise, and turns "my
   crowd is full" into a reward rather than a silent tax. This is the one I would
   pick, and it also makes the squad upgrade buyable again (see below).

Whichever you choose, it has to land *before* the squad track is re-priced — the
ceiling is the reason squad is worthless late, and re-pricing it under a ceiling
that eats its output would just make a bad purchase cheaper.

---

## The autobalancer, verified

### The challenge streak: works, far too small

Stage 18, build s8 p9 r7, everything else held still, eight seeds:

| streak | hp × | boss hp | TTK `good` | TTK `average` | clear | survivors lost |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 1.000 | 8 650 | 0.8 s | 1.3 s | 100% | 28.5 |
| 3 | 1.165 | 10 077 | 0.9 s | 1.5 s | 100% | 29 |
| 6 | 1.330 | 11 505 | 1.0 s | 1.7 s | 100% | 34 |
| 9 | 1.495 | 12 932 | 1.1 s | 1.9 s | 100% | 35 |
| 12 | 1.660 | 14 359 | 1.2 s | 2.1 s | 100% | 36 |

**It measurably raises difficulty** — a twelve-clear streak costs 26 % more
survivors and 0.4 s more boss fight — and it **changes no outcome anywhere**.
Clear rate is 100 % at streak 0 and 100 % at streak 12.

Two structural problems, separate from the size:

* `CHALLENGE_MAX` 12 is reached on **stage 13** of a clean career and never
  moves again. For eighteen of the thirty stages the "autobalancer" is a
  constant, not a response.
* ×1.66 total is worth about **three stages of player growth**, spent over
  twelve. Against a DPS curve compounding at ~18 % per stage, a 5.5 % step per
  clear is inside the noise.

If the streak is meant to be felt, `CHALLENGE_STEP` needs to be roughly
0.12–0.15 with `CHALLENGE_MAX` around 20 — and it should scale the things that
actually kill people (foe bite count, pack size, slam share), not only health.
Right now it scales health, and health is not what stops anybody.

**Resetting on a loss does help**, but only mechanically: it removes ×1.66, which
makes the boss 40 % thinner. Since no dodging player ever loses to a boss, the
reset's real value is that it lets the relief below start from a clean floor.

### The escalating relief: works when the wall is the boss, does nothing otherwise

| case | failures | hp × | boss hp | clear | died at | slam deaths | total lost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stage 13, `trail` (dies **to the boss**) | 0 | 1.00 | 6 400 | **0%** | 100% | 25 | 81.5 |
| | 1 | 0.80 | 5 120 | **25%** | 100% | 22.5 | 78 |
| | 2 | 0.72 | 4 608 | **63%** | 100% | 17.5 | 72 |
| | 3 | 0.66 | 4 224 | **75%** | 100% | 13 | 65.5 |
| | 4 | 0.62 | 3 968 | **75%** | 100% | 13 | 65 |
| stage 1, `careless` (dies **to slams**) | 0 | 1.00 | 1 000 | 0% | 100% | 18 | 24 |
| | 4 | 0.62 | 620 | **0%** | 100% | 18.5 | 24.5 |
| stage 5, `trail` (dies **on the road**) | 0 | 1.00 | — | 0% | 66% | 0 | 20 |
| | 4 | 0.62 | — | **0%** | 66% | 0 | 20 |

The escalation is real and it is well-shaped: 0 % → 25 % → 63 % → 75 % on the one
case where the wall is boss health. And it is worth noting *why* it works — the
first failure also halves the slam share (`reliefActive ? 0.6 : 1`), which is
what drops slam deaths 25 → 22.5 before the health steps have done anything.

**But two of the three real walls in this game are on the road, and relief does
literally nothing for them.** `trail` dies at 66 % of stage 5 to a `÷2` leaf and a
pincer; four failures move that number by zero. `careless` dies on stage 1 to
slams and pillars; four failures move that by zero. Relief spends 100 % of its
budget on the boss, and the boss is where players are *least* stuck.

What should scale instead of (rather: as well as) health:

1. **Make the slam concession escalate**, matching the health table:
   `0.60 / 0.52 / 0.46 / 0.42` instead of a flat 0.60 at one failure. Slams are
   68–80 % of a failing run's losses; this is the single highest-leverage change
   in the relief system.
2. **Soften the road.** The `crushAgainst` fractions (`divider` 0.35,
   `barricade` 0.22, `crate` 0.12) and the `÷N` bite are what actually end a
   stuck player's run. Scaling those by the same relief table would let relief
   reach the runs that never see a boss.
3. **Give back starting survivors** — `+1` per failure, capped at `+4`. It is the
   only concession that helps a run which dies at 66 % of the road, it compounds
   through the multiplier gates exactly as the player's own play would, and it is
   invisible in the HUD, which is what `RETRY_HP_RELIEF`'s comment says the whole
   system is for.

---

## The shop: four tracks, one right answer, and it is optional

### Which purchasing strategy wins

Nothing wins, because nothing loses. All five strategies — including **`none`**,
which never opens the shop — carry `optimal`, `good` and `average` to stage 30.
The strategies are only separable on money:

| strategy | lifetime coins earned (`good`) | final build |
| --- | --- | --- |
| `only-scavenge` (max the economy, then cheapest DPS) | **58 050** | s11 p13 r10 $10 |
| `value` (marginal DPS per coin, prices scavenge by payback) | 57 090 | s11 p13 r10 $10 |
| `balanced` (round-robin all four) | 56 469 | s11 p13 r10 $10 |
| `scavenge4` | 41 566 | s10 p13 r10 $4 |
| `cheapest` (cheapest DPS track, never scavenge) | 27 732 | s9 p11 r10 $0 |
| `only-power` | 26 259 | s0 p13 r0 $0 |
| `only-rate` | 25 349 | s9 p10 r10 $0 |
| `only-squad` | 25 053 | s11 p0 r0 $0 |
| `none` | 23 411 | nothing |

The nominal winner is `only-scavenge` — a strategy that ignores every combat
track until the economy track is maxed. It ends the career with **the same build
as the clever strategy and 1 000 more coins**. When the dumbest possible policy
ties the smartest, the shop is not a decision.

### Is any track dominant or ignorable

Budget-matched: the same coins, one track at a time, eight seeds, career-realistic
challenge streak.

**Stage 12, `average`:**

| build | coins | peak squad | DPS@boss | TTK |
| --- | --- | --- | --- | --- |
| nothing | 0 | 142 | 270 | 40.2 s |
| squad 6 | 1 872 | 154 (+8%) | 293 (+8%) | 36.9 s |
| **power 8** | 2 884 | **366 (+158%)** | **3 766 (×14)** | **2.4 s** |
| rate 7 | 2 729 | 148 (+4%) | 419 (+55%) | 25.3 s |
| mixed s4 p5 r4 | 2 247 | 385 | 3 444 | 2.7 s |

**Stage 22, `good`:**

| build | coins | peak squad | DPS@boss | TTK |
| --- | --- | --- | --- | --- |
| nothing | 0 | 354 | 2 981 | 5.9 s |
| squad 6 | 1 872 | 305 (**−14%**) | 2 741 (−8%) | 6.4 s |
| **power 8** | 2 884 | 362 | **7 718 (+159%)** | **2.3 s** |
| rate 7 | 2 729 | 361 | 4 630 (+55%) | 3.8 s |

The ordering is **power ≫ rate > squad ≈ nothing**, and it holds at every point
measured. Note *why* power is so far ahead: it is the only track that raises
**peak squad** (142 → 366 at stage 12). Damage buys survival — crates, barricades
and packs die before contact, so the crowd stops bleeding, so it arrives at the
multiplier gates larger, so it does more damage. It is a feedback loop, and the
other three tracks are not in it.

Marginal value of one more level, from the build a career actually holds:

| stage | build | +squad | +power | +rate | +scavenge |
| --- | --- | --- | --- | --- | --- |
| 8 | s4 p4 r2 $5 | 573 DPS/1000c | **1 065** | 1 018 | 0 |
| 16 | s8 p9 r7 $8 | 1 212 | 604 | 396 | 0 |
| 24 | s10 p12 r9 $9 | **0** | 220 | 206 | 0 |

Squad at stage 24 buys **exactly zero DPS for 6 403 coins**, because the crowd is
already pinned to `MAX_SQUAD`. Stage 16's squad number is the one point where it
measures well and I do not entirely trust it — peak squad there is 630, one
gate's payout away from the ceiling.

### The cost curves are backwards

| track | value per level | cost | to L5 | to L10 | to max |
| --- | --- | --- | --- | --- | --- |
| squad — the **weakest** track | +1 survivor | `80 × 1.55^l` | 1 156 | 11 497 | 27 825 (L12) |
| power — the **strongest** track by 5–14× | +0.4 damage | `70 × 1.45^l` | 841 | **6 235** | — |
| rate | +7 % of base rate | `90 × 1.48^l` | 1 144 | 9 267 | 9 267 (L10) |
| scavenge | +12 % coins | `60 × 1.42^l` | 682 | **4 619** | 4 619 (L10) |

**The best track is the cheapest and the worst track is the most expensive.**
Scavenge — 4 619 coins for a permanent ×2.2 on all income, paying itself back in
under four stages — is the cheapest thing in the shop.

### Is firepower at +0.4 right?

**No. It is still the most valuable purchase in the game by a factor of five to
fourteen.** The owner's instinct was about the wrong term: the problem was never
the size of the step, it was that damage is the only stat that *prevents losses*,
and preventing losses compounds through the multiplier gates. Cutting +1.0 → +0.4
halved the number without touching the loop.

For what it is worth in coins: at +0.4, 70 coins buys the first level and a **+40 %
damage swing**, which is still the largest single-purchase swing in the shop — 80
coins of squad buys +33 % of the *starting* crowd, worth about +3 % at the boss.

### Proposed re-pricing

The game is too easy, so this is a **re-pricing, not a nerf** — total player power
should stay roughly where it is, and the difficulty should come from the boss
curve above. What changes is which button is the right button.

| track | before | after | evidence |
| --- | --- | --- | --- |
| **squad** | `+1`/level, `80 × 1.55^l`, max 12 | `+1`/level **and +4 % to every gate payout**/level, `70 × 1.38^l`, max 16 | Worth 8 % or less at every point past stage 12 and exactly 0 at stage 24, for the highest price in the shop. A flat `+1` on a quantity that grows to 700 is diluted by the run rather than multiplied by it; a share of the *gate payout* scales the way the player's own play does. Cumulative to L10 falls 11 497 → 4 430. **Requires the `MAX_SQUAD` fix first**, or the extra payout is clipped on arrival. |
| **power** | `+0.4`/level, `70 × 1.45^l`, max 20 | `+0.4`/level, `110 × 1.52^l`, max 20 | Measured at 5–14× the DPS-per-coin of any other track, and the only track that raises peak squad. Keep the step (the run needs damage); charge for it. Cumulative to L10 rises 6 235 → 13 714, which puts it above squad and rate instead of below both. |
| **rate** | `+7 %` of base/level, `90 × 1.48^l`, max 10 | `+9 %` of base/level, `85 × 1.42^l`, max 12 | The honest middle track, and the one the design says a run "cannot start high". Slightly cheaper, slightly stronger, two more levels: `3.23 → 3.95` shots/s at max. Enough to be a real second choice rather than filler. |
| **scavenge** | `+12 %`/level, `60 × 1.42^l`, max 10 | `+8 %`/level, `120 × 1.55^l`, max 10 | Pays for itself in under four stages and more than doubles lifetime income (`only-scavenge` earns 58 050 against `cheapest`'s 27 732) for the cheapest ladder in the shop. Cumulative to max rises 4 619 → 17 246 and the multiplier falls ×2.2 → ×1.8, which makes it an investment with an opportunity cost instead of a formality. |

Pricing alone will not fully fix power's dominance, and I want to be explicit
that this is an inference rather than a measurement: at the proposed prices,
2 800 coins buys power 6 instead of power 8 (damage 3.4 instead of 4.2) and
squad 8 instead of squad 6 — and reading those levels off the measured sweeps,
power still wins the stage-12 comparison, just by ~10× instead of ~14×. Its
returns are super-linear and a price cannot flatten that. If you want the tracks
genuinely
comparable, the structural move is to give squad and rate a survival role that
damage does not already cover (more bodies should absorb *proportional* damage,
not just flat bites), or to cap the damage → survival loop with foes that cannot
be outranged.

---

## What to change, in order

1. **`bossHpScale`** — two-segment curve above. Biggest single effect on how the
   game feels, and it is one line.
2. **`MAX_SQUAD` / gate payout honesty** — the doors stop lying from stage 12.
   Blocks the squad re-pricing.
3. **Relief coverage** — escalate the slam share, and add starting survivors, so
   relief can reach the runs that die on the road.
4. **`CHALLENGE_STEP` 0.055 → ~0.13, `CHALLENGE_MAX` 12 → ~20**, and point it at
   pack size / bite count as well as health. Today it is a constant for eighteen
   of thirty stages.
5. **The shop re-pricing** above. Least urgent: the shop is currently optional,
   so nothing in it is what makes the game easy.
6. **Stage 3** — a 25-second boss fight for a competent player at 84 DPS is the
   worst-paced beat in the first ten minutes. It needs cheaper crates or a fatter
   opening bank, not a thinner boss.

---

## What this study cannot see

* **Thumbs.** `average` models a 250 ms reaction and a preference for the nearer
  leaf; it does not model panic, distraction, or a player who has not understood
  the pillar rule yet. `careless` is the floor and `trail` is the one policy that
  makes a *specific* mistake repeatedly. A real cohort has failure modes none of
  these five have.
* **Quitting.** "Stuck" here is five consecutive losses. Real players quit long
  before that, and they also quit when nothing has threatened them for twenty
  stages — which is the failure mode this report is actually describing.
* **Three-leaf banks are new.** The policies aim at the safe band computed from
  the bank's live pillars (`safeLeafAnchor` reads `getDividers()` now), and on a
  triple that band is exactly `2 × funnelRadius(1.33)` wide — zero margin. Every
  policy therefore plays triples close to perfectly, and `average`'s
  painted-centre aim is the only one that pays for them. A human's error
  distribution on a 1.86-unit band is worth measuring separately.
* **Per-stage variance is large.** DPS at the boss swings 3× between adjacent
  generated stages depending on how many multiplier gates they rolled. Three
  careers per cell is enough to rank strategies and nowhere near enough to tune a
  single stage.


---

## After the fix

Same harness, same seeds, same policies, re-run against the shipped rules. What
the priority list above got right and what it missed:

The first four items landed (boss curve, `MAX_SQUAD` 700 → 1600 with gate
payouts honest to stage 30, relief across all three death channels,
`CHALLENGE_STEP` 0.13 / `CHALLENGE_MAX` 30 pointed at packs and bites) — and
they were **not enough**. Re-measured, every policy still cleared all thirty
stages on every strategy. The list was treating a structural problem as a
numerical one: the crowd compounds through gates, the road's toll did not
compound with it, so no amount of curve-shaping could keep up.

Three rules fixed the structure:

| rule | where | what it does |
| --- | --- | --- |
| a bite is a **share** of the crowd, or its flat cost, whichever is worse | `biteShareFor`, `stepFoes` | the road keeps taxing a squad after the squad outgrows the archetype numbers |
| the boss **guards** at 66 % and 33 %, forfeiting the overkill | `damageBoss` | the climax cannot be skipped, however much DPS arrives |
| each swing makes the next **sooner and wider** | `stepBoss` | "not enough damage" stops meaning *slow* and starts meaning *lost* |

### Careers, before → after

| player | strategy | before | after |
| --- | --- | --- | --- |
| `good` | none (never opens the shop) | 30 | **walls at 13**, holding 6 328 coins |
| `good` | only-scavenge | 30 (tied the best) | **walls at 13** |
| `average` | none | 30 | **walls at 10** |
| `average` | only-squad / only-rate | 30 | **walls at 13** |
| `average` | only-scavenge | 30 | **walls at 10** |
| `average` | only-power | 30 in 33 runs | 30 in **45 runs** |
| `optimal` | any, incl. none | 30 | 30 — the intended ceiling |

Every *sensible* mixed strategy still finishes, which is the point: the shop is
now load-bearing without being a paywall on skill. A player who spends coins at
all reaches stage 30; a player who hoards them does not.

### The climax, before → after

| | before | after |
| --- | --- | --- |
| boss swings thrown, stage 8+ | 0 | 2–9 |
| boss TTK, `good + value` career | 2.8–40.2 s | 5.3–15.9 s |
| slams in the top-3 causes of death | stages 1–7 only | 21 of 30 stages |
| slam hit rate, `optimal` (perfect dodger) | — | **0 %** |
| slam hit rate, `average` (250 ms latency) | — | 33–48 % |
| slam hit rate, `careless` / `trail` (never dodge) | — | 100 %, and they lose |

The last three rows are the shape this was aiming for: the swing is a **skill
check**, not a tax. A player who reads the telegraph pays nothing for it; a
player who ignores it loses the run.

### Losses are now scattered rather than absent

Careers that used to run 31–33 attempts for 30 stages now run 31–45, and the
retries land where the relief can catch them. A worked example from
`average + cheapest`: stage 10 is lost once, boss health drops 17 088 → 11 094
on the retry, the streak resets 8 → 1 and the enemy multiplier with it, and
stage 11 is cleared first time at 1.13×. That whole sequence — wound up, beaten,
wound back down, handed a foothold — was unobservable before, because nothing
ever lost.

### Stage 3, from the list above

Still the slowest early beat (a `good` player at 114 DPS now finishes it in
11.2 s rather than 25 s, and clears it 100 % of the time), but it is no longer
the outlier it was — the guard floor raised every other stage's climax to meet
it rather than the other way round.


---

## The road, after the boss

A second round of play feedback, and a second structural bug underneath it.

**The complaint:** minibosses were "pretty much impossible to kill", the coin
magnet "picks up everything", and shooting down a boulder paid nothing.

**What the harness found:** the miniboss was not hard, it was *absent*. Across
stages 2–10, driving the real simulation with a competent-but-unremarkable
policy, the elite was killed **zero times out of eight**. Every one of them
walked through the crowd and despawned behind it at 22–99 % health. Two things
were doing it:

* a gate ate every round aimed at it, so the fight could not begin until the
  player was through the door — by which time the elite was on top of them,
  closing at the sum of both speeds;
* the generator's clearance rule was symmetric (4.5 units either side), and
  clearance is not symmetric — an obstacle *ahead* of an elite costs nothing,
  one *behind* it eats the entire approach.

**What changed**

| rule | where |
| --- | --- |
| rounds pass through gates and still charge them | `resolveBullet` |
| an elite plants at `ELITE_HOLD_AHEAD` and blocks the crowd, leashed to 9 s | `stepFoes`, `stepAnchor` |
| 12 units of guaranteed clear road *behind* every elite | `nudgeClearElite` |
| `MINIBOSS_BOSS_FRACTION` 0.26 → **0.115** | `track.ts` |
| coin magnet 3.6 flat → **0.55 + 0.34/level of Scavenging** | `COIN_MAGNET_BASE`, `coinMagnetBonus` |
| barricade blocks drop **2–4 coins** | `spillCoins` |

The HP re-pricing was not optional and is the interesting part. 0.26 was sized
for an enemy that *walked past*, where health was decoration on a fight nobody
had. The moment the elite planted, that number became load-bearing and measured
at **104–157 % of the end boss's time-to-kill** — an eleven-second fight against
a half-built crowd, in the middle of the road, which walled an average player's
career at **stage 6**. At 0.115 the same fights land at 18–48 % of boss TTK and
cost 0–6 survivors: a win on the road, which is what the beat is for.

### Careers, before → after this round

| player | strategy | before | after |
| --- | --- | --- | --- |
| `optimal` / `good` / `average` | cheapest, balanced, value | 30 | **30** |
| `good` | none | 13 | **11** |
| `average` | none | 10 | **6** |
| `average` | only-rate / only-scavenge | 13 / 10 | **6** |
| `average` | scavenge-first | 30 | **6** |

Every strategy that spends coins on damage still finishes the campaign. Every
strategy that hoards, or pours everything into economy, now walls in the single
digits — which is the correct answer to "buy the income first" in a thirty-stage
game with a real DPS check every stage, and it was previously invisible because
nothing checked anything.

The coin economy moved too: barricade drops raised a career's total earnings by
roughly 22 %, and the short magnet means a player who works the lane out-earns
one who pins themselves to a rail — measured, not assumed, in
`tests/game/roadEconomy.test.ts`.

## After the miniboss learned to swing

Re-run in full, twice, as the elite's attack was built and then rebuilt: first
the maul (0.7 s telegraph, dodged sideways, 8.5 % of the squad), then the
**sweep** that replaced it — a lane-wide arc taking a fifth of the current squad
every 1.5 s, undodgeable by construction. A mid-stage enemy that costs a fifth
of everything on every stage from 2 onward is exactly the kind of change that
can quietly re-wall a campaign, so the whole matrix was measured again rather
than argued about. `maul` is the middle column, `sweep` the current build:

| player | strategy | before | maul | sweep |
| --- | --- | --- | --- | --- |
| `optimal` / `good` / `average` | cheapest, balanced, value | 30 | 30 | **30** |
| `optimal` | none | — | 19 | **12** |
| `optimal` | only-scavenge | — | 30 | **12** |
| `optimal` | only-squad | — | 21 | **19** |
| `good` | none | 11 | 10 | **10** (7–10) |
| `good` | scavenge4 | 30 | 30 | **30** |
| `average` | none | 6 | 5 | **5** |
| `average` | only-squad | — | 10–12 | **10** (5–10) |

**The campaign survived the sweep.** Every strategy that buys damage still
finishes all thirty stages, no spending strategy changed rank, and nothing
became unreachable. What moved is the hoarders: `optimal` buying nothing fell 19
→ 12, and — the sharpest result in the table — `optimal` pouring everything into
**Scavenging fell 30 → 12**. Income-first was already the wrong answer; against
an enemy that charges a percentage of the crowd rather than a number of bodies,
it is now a dead end, because the one thing a bigger wallet cannot buy is a
shorter fight.

The cost shows up as attempts rather than walls for the strategies that do buy
damage: `average` + cheapest needs 44 careers-worth of attempts to finish where
it needed 37, which is the campaign getting longer, not shorter.

Single-track probes still say what they did: `only-power` walls at 19 regardless
of who is driving (the crowd stops growing) and `only-squad` walls at 10–19 (no
damage). `only-scavenge` no longer finishes for anybody.

## After the road got its teeth

Gun range cut to the visible screen, `-N` doors, dilemma banks, and the retune
those forced (`ELITE_HOLD_MAX` 9 → 4.5, `MINIBOSS_BOSS_FRACTION` 0.115 → 0.08,
`gateAddBase` +2). Three careers per cell:

| player | strategy | sweep | now |
| --- | --- | --- | --- |
| `optimal` / `good` | cheapest, balanced, value, scavenge4 | 30 | **30** |
| `average` | cheapest | 30 | **29** (30 on one seed) |
| `average` | value | 30 | **30** |
| `average` | balanced | 30 | **29** (17 on one seed) |
| `optimal` | none | 12 | **10** |
| `good` / `average` | none | 10 / 5 | **10 / 9** |
| `optimal` | only-power | 19 | **30** |
| `optimal` | only-scavenge | 12 | **10** |

**The campaign still finishes, and it costs more to finish it.** `average` on a
sane strategy now spends **48–59 attempts** reaching stage 29–30, against 37–44
before — the same destination, meaningfully more road. That is the shape a
difficulty pass is supposed to have: nothing became unreachable, everything
became more expensive.

One rank did change, and it is the gate retune showing its hand: `optimal` on
**only-power** went 19 → 30. With four more printed on every `add` leaf, the
crowd now grows enough from doors alone that a build spending nothing on Squad
can still arrive at a late boss with bodies. Whether Firepower-only *should* be
a complete campaign is a design question rather than a bug, but it is the one
place the compensation over-shot and it is worth watching.

The stage-7 wall this round nearly shipped is in `REPORT.md`: a `-N` door can
reach ZERO where a `÷N` cannot, and an `-8` on an opening bank deleted a
four-strong squad outright. `average` walled at stage 7 on **every** purchasing
strategy until `SUB_EARLIEST` moved bills to a third of the way in. It is the
clearest argument in this file for running the career matrix on any change that
touches what a door does — the per-stage tables never saw it, because a stage
probed on a wiped save starts with a crowd the opening bank cannot delete.

## After the road stopped being shootable

Boulders, crate tiers, monster coin drops, `÷3`, no back-to-back multipliers, and
`gateAddBase` −1. Three careers per cell:

| player | strategy | before | now |
| --- | --- | --- | --- |
| `optimal` | cheapest / balanced / value / scavenge4 | 30 | **30** |
| `good` | cheapest / balanced / value | 30 | **30** (44 attempts, was 39–41) |
| `good` | scavenge4 | 30 | **5** |
| `average` | cheapest | 29 | **30** (20 on one seed, 56 attempts) |
| `average` | balanced | 29 | **20** |
| `average` | value | 30 | **6** (30 on one seed) |
| `optimal` | none | 10 | **14** |
| `good` / `average` | none | 10 / 9 | **5 / 5** |

**Everything that buys damage early still finishes; everything that buys income
first now dies in the single digits.** `good` + scavenge4 went 30 → 5, and
`average` + value is the sharpest swing in the table — 30 → 6 on two of three
seeds — because `value` front-loads Scavenging and a run that spends its first
coins on income has nothing to answer a boulder field or a heavy crate with.
That is the direction the batch was aimed in, and it is now aimed hard: coins
are more plentiful (monsters drop them) and worth less as a strategy.

`optimal` + none went the other way, 10 → 14, which is the coin drops paying
for themselves — a player who fights everything in their lane banks enough to
matter even with the shop switched off.

The mid-skill player is where the cost landed. `average` on a sane strategy now
needs **56 attempts** to finish where it needed 44, and its per-stage clear rate
on stage 5 fell to 40 %. That is inside "patchy", which is the design target for
that policy, but it is the number to watch if churn shows up at stage 5–6.

## Past the campaign: 110 stages, measured

The endless work claims fourteen generator knobs keep scaling past stage 30.
This is the career that shows what that costs a player. One seed (5000), the
`value` purchasing strategy, the ×3 claimed, 300 s per attempt, run to stage
110 — reproduce with `tests/sim/scratch.depth.test.ts` (and
`--reporter=verbose`, or it prints nothing):

| player | reached | attempts | 1–30 | 31–60 | 61–80 | 81–100 | 101–110 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `optimal` | 110 | 124 | 1.10 | 1.10 | 1.10 | 1.15 | **1.30** |
| `good` | 110 | 127 | 1.10 | 1.13 | 1.15 | 1.15 | **1.40** |
| `average` | 110 | 138 | 1.23 | 1.27 | 1.25 | 1.20 | **1.40** |

**The curve keeps rising, and it rises gently.** Attempts per stage are flat
through the sixties and seventies and then climb in the last twenty — which is
the shape the endless knobs were aimed at, and the proof that the plateaus are
gone: before this batch a stage-100 road was a stage-34 road, so the 101–110
band would have read the same 1.10 as the 31–60 one.

**Nobody walls.** All three policies reach 110 with the shop keeping pace, and
that is the honest headline: past the authored campaign the game is a marathon,
not a wall. A deep run currently ends because the player stops, not because the
road stops them — at stage 110 a mid-skill player is still paying 1.4 attempts
a stage, roughly what they pay on stage 20.

That is a deliberate reading rather than a comfortable one. Endless mode's job
is put-down resistance for the players who have already beaten the campaign, and
a soft curve serves that better than a cliff — but if the depth chart fills up
with people parked at stage 200 the dial to reach for is `foeHpScale`'s
post-campaign slope, not any of the density knobs, because density is what is
carrying the *feel* of a deep stage.

Caveats worth stating: one seed, one strategy, and the ×3 claimed every time.
A no-ads career at this depth has not been measured — on the thirty-stage
campaign that costs `average` the run entirely, so the honest expectation is
that the decline lean, not the generator, is what bounds a non-claiming player.
