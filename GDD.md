# Survivalist — game design document

## One line

A vertical crowd runner: shoot the gates to make them worth more, run your squad
through them, and turn three survivors into two hundred before the boss at the
end of the stage takes them apart.

## The loop

```
steer  →  hold fire on a gate  →  COMMIT to one leaf  →  run through  →  crowd changes
   ↑                                                                        ↓
   └── break green crates (+damage) · break blue crates (+fire rate)
       dodge everything solid · kill the pack · kill the miniboss
                                                                            ↓
                                          boss  →  stage clear  →  coins  →  upgrades
```

Every decision in the game is the same decision, asked at a different speed:
**keep shooting this, or move now — and to which side?** Standing still on a
`+N` gate makes it worth more and lets the monsters walk into you. Taking the
`×3` instead of the `+18` is worth it only if your crowd is already big. And you
cannot have both: there is a pillar between the leaves and it kills.

## Core rules

| Rule | Value | Where |
| --- | --- | --- |
| Squad starts at | 3 survivors (+1 per Squad upgrade level) | `game/survival.ts` |
| Crowd radius | capped at **1.65** — fits through one gate leaf (half-width 2.05) when aimed, clips the pillar when not | `CROWD_MAX_R` |
| Auto-run speed | 5.1 u/s, +0.11 per stage, capped at 7.4 | `stageSpeed()` |
| Damage | `squad × damage × fireRate` DPS; 14 visible tracer streams | `SHOOTERS` |
| Fire rate | starts at **1.9** shots/s and rises **only** from blue crates (+0.55 each, three per stage, cap 6.5) — the one stat a run must earn | `BASE_FIRE_RATE` |
| Gun range | rounds die **15 % of the screen short of the top edge** (10.8 units ahead of the crowd). Nothing off-screen can be shot, so obstacles arrive intact and a gate has to be approached before it can be pumped | `BULLET_RANGE` |
| Reach (shop) | +3 %/level to **+30 % at level 10**, clamped at the top of the screen (13.7 u). The only track that buys TIME rather than force — every extra unit is more seconds of fire on each gate, crate and wall before the crowd reaches it — and the clamp is what stops the upgrade re-introducing "obstacles deleted above the camera" as a reward | `RANGE_PER_LEVEL`, `effectiveBulletRange()` |
| Gate growth | **+1 per 500 ms of sustained fire**, lost after 400 ms of silence, `add` **and `sub`** leaves | `GATE_TICK_MS` |
| `-N` doors | the mirror of `+N`, and the point is that the crowd fires FORWARD automatically: aim at a `-N` while you approach and the bill grows. The skill is *shoot the door you are not taking* | `GateOp.sub` |
| Dilemma banks | `÷N` against `-N` — every door hostile, no right answer, only a cheaper wrong one. A division is cheap for a small crowd and ruinous for a big one; a subtraction is the other way round. One per stage from stage 4, never back to back, never the closing bank | `legalise()` rule 6 |
| Gate bank | two or **three** doors + a lethal pillar between each pair; no two doors may ever be worth the same | `track.bank()` |
| Gate claim | **one bank, one door.** The door holding the most survivors claims the bank and pays in full; every other offer is destroyed on the spot, pillars included | `claimBank()` |
| Gate payout | `add`: `+N`; `mul`: `×N` on the survivors that went through; `div`: **kills** all but `1/N` of them; `sub`: takes `N` off the top | `claimBank()` |
| Trap rungs | `÷2` from stage 2, **`÷3` from stage 4**, `÷5` from stage 6. Three rungs, because `÷2` is absorbable and `÷5` ends runs — the middle one is where a hard choice lives, and it is the value most often paired against a `-N` | `rollDiv()` |
| No back-to-back multipliers | `×2` then `×2` is a free quadruple for anyone who can aim twice. A multiplier now always lands on a crowd the player had to keep alive through something else first | `canMul()` |
| Funnel | the crowd squeezes to fit the door it is aimed at and spills back out after — which is what lets a bank have three narrow doors instead of two wide ones | `funnelRadius()` |
| Solid = lethal | barricades, crates, boulders and pillars all kill on contact; gates never do | `stepBarricades/Rocks/Crates/Dividers` |
| Boulders | **cannot be shot** — they eat the round and shrug. Two ranks with OFFSET gaps, so the crowd commits to a line and then has to change it. The one hazard whose difficulty does not decay as damage grows, which is what keeps steering a skill at stage 25 | `ROCK_CRUSH_FRACTION`, `boulderField()` |
| Crate tiers | every box prints its HP. **light 0.6× / standard 1× / heavy 2.1×** — a heavy crate is deliberately out of reach of an unupgraded squad, so it is walked past once and cracked open two upgrades later | `crateTierFor()`, `crateTierHp()` |
| Monsters pay | a dead monster **drops loose coins** where it fell, on top of its bounty. Drops must be driven over, so the pack in your lane pays and the one you steered around does not — and Scavenging finally has a customer who fights | `FOE_COIN_DROP_PER_BOUNTY` |
| Rounds pierce gates | a doorway is not armour — fire passes through a gate to whatever stands behind it, and still charges the gate on the way | `resolveBullet()` |
| Walls pay | a barricade block shot down drops **2–4 loose coins**, so removing one is a question rather than pure cost | `spillCoins()` |
| Coin magnet | starts at **0.55** past the crowd's own body — the trails are a route, not scenery — and is what the Scavenging track sells, to **+3.4** at level 10 | `COIN_MAGNET_BASE`, `coinMagnetBonus` |
| Foes | 5 archetypes (creep / husk / hound / brute / flyer), introduced across stages 1–7 | `game/foes.ts` |
| Bite | the LARGER of the archetype's flat cost (1–5) and a **share of the whole crowd** (0.4–1.8 %) — a brute frightens thirty survivors and is still worth fearing at a thousand | `biteShareFor()` |
| Minibosses | 1 from stage 2, 2 from stage 6; ~13 % / ~15 % of the end boss's health | `track.minibossHp()` |
| Miniboss hold | it **plants and blocks the road** `ELITE_HOLD_AHEAD` in front of the crowd instead of walking through it, for up to `ELITE_HOLD_MAX` = 4.5 s, then breaks off | `stepFoes()`, `stepAnchor()` |
| Miniboss clearance | the generator guarantees **12 units of clear road behind** every elite — clearance is asymmetric, because only the road behind eats the approach | `nudgeClearElite()` |
| Miniboss body | an elite is **solid**: the crowd parts around it and can never stand inside the sprite. It matters when the fight is LOST — the leash expires and the elite walks back down the road through a squad that used to pass straight through it. Push-only, because the bite loop already owns the damage | `ELITE_BODY_HALF_W`, `partAround()` |
| Miniboss sweep | the block is a fight, not a wait: **0.3 s** wind-up, then an arc across the **whole lane** reaching 4.3 u down the road, taking **a fifth of the current squad**. Every **1.5 s**, alternating direction | `ELITE_TELEGRAPH`, `ELITE_SWEEP_CD`, `ELITE_SWEEP_FRACTION`, `ELITE_SWEEP_REACH` |
| …and why it is not dodgeable | deliberate. The boss asks *where are you standing*; the elite asks *how hard do you hit*. A lane-wide arc has no safe side, so the only answer is DPS — and the 4.5 s leash is what keeps it survivable (three sweeps, ~half the squad left) | `ELITE_HOLD_MAX` |
| Boss | One per stage, slams **where the crowd is** on a **1.0 s** telegraph, capped at **31 %** of the squad | `stepBoss()` |
| Boss guard | at **66 %** and **33 %** health it plants, becomes untouchable and swings — overkill is forfeited, so no amount of DPS skips the climax | `damageBoss()` |
| Boss rage | every swing thrown brings the next one **0.17 s sooner** (floor 0.95 s) and **0.07 u wider** (ceiling 2.55 u) — a long fight is a losing fight | `stepBoss()` |
| Stage length | `120 + 9 × stage` world units (~35–50 s) | `stageLength()` |
| Failure | Squad reaches 0 → wipe; still pays out coins scaled by progress | `wipeReward()` |
| Retry relief | a stage that has beaten you comes back softer, and softer again each time: 80 % → 72 % → 66 % → 62 % enemy health, and a slam that takes 40 % less | `reliefFor()` |
| Autobalancer | every stage cleared in a row makes the next one 13 % harder (health) plus denser packs and costlier bites, up to 30; **one loss wipes the streak entirely** | `challengeFactor()` |

## Difficulty

The curve is carried by five independent knobs rather than one multiplier, so it
can be tuned finely and so failure always has a legible cause:

1. **Enemy health** — `foeHpScale` (+34 %/stage) and `bossHpScale` (×1.55/stage
   to stage 12, then +12 %/stage).
2. **Density** — `packSize`, `beatGap` and the arrangement table in `track.ts`.
3. **Routing pressure** — trap-gate frequency (`trapChance`), barricade gap
   width, and how far off the line the crates sit (`CRATE_DETOUR_X`).
4. **The player's own arc** — fire rate starts crawling, so a run that skips the
   blue crates is measurably weaker at the boss than one that took the detours.
   This is the main lever that *punishes suboptimal play* rather than punishing
   the player for being on a high stage.
5. **The autobalancer**, which is the one that tracks the PLAYER rather than
   the stage. A streak of clears winds the next stage up a little at a time; a
   single loss wipes the streak completely, so the handicap can never be the
   reason somebody is stuck. Underneath it, minibosses break the stage into
   winnable chunks, and a stage that has beaten the player comes back softer
   each time it does — 80 % → 72 % → 66 % → 62 % enemy health, plus a slam that
   takes 40 % less of the squad. (Health alone did nothing measurable:
   14 of 15 simulated retries moved the clear rate by exactly zero, because most
   of a failing run's losses are slams, which enemy HP never touches.) Neither
   makes a good run easier; both stop a bad one becoming a wall.

Balance is measured, not guessed: `tests/sim/` drives the real simulation with
five scripted player policies (optimal / good / average / careless / coin-trail)
and reports clear rate, time-to-clear, peak squad, DPS at the boss and
cause-of-death per stage. `tests/sim/REPORT.md` carries the current numbers.

Where it stands (10 seeds per cell):

| stage | optimal | good | average | careless |
| --- | --- | --- | --- | --- |
| 1 | 100 % | 100 % | **100 %** | 0 % |
| 2 | 100 % | 100 % | 80 % | 0 % |
| 3 | 100 % | 100 % | 60 % | 0 % |
| 4 | 100 % | 80 % | 100 % | 0 % |
| 5 | 100 % | 100 % | 100 % | 0 % |

A sloppy player gets stage 1 and then has to actually play; a player who never
touches the screen reaches the stage-1 boss and loses to it, every time. The
spread between playing well and playing badly is **1.8×–5.8× DPS at the boss**,
and it comes almost entirely from crates rather than from squad size — the gates
hand roughly the same crowd to everybody.

### The whole campaign, and what it took to make it a campaign

Thirty-stage careers were then simulated end to end — every scripted policy
against every purchasing strategy, carrying the save between stages — and the
first pass returned a flat verdict: **every player who touched the screen
cleared all thirty stages, on any strategy, including buying nothing at all.**
From stage 8 onward the boss died before it swung once. The cause was structural
rather than numerical: the crowd grows *exponentially* through gates while the
road's toll was *absolute*, so the outcome of every late stage was settled
before it started.

Three rules closed it, and the same careers were re-measured after:

* **The bite is a share** (`biteShareFor`) — a monster costs what it was
  authored to cost, or a slice of the crowd, whichever is worse.
* **The boss guards** at 66 % and 33 % (`damageBoss`) — overkill is forfeited,
  so the climax always happens.
* **The boss rages** — each swing shortens and widens the next, turning "not
  enough damage" from *slow* into *fatal*.

| what changed | before | after |
| --- | --- | --- |
| a competent player who never spends a coin | clears all 30 | **walls at 13** |
| an average player who never spends a coin | clears all 30 | **walls at 10** |
| "buy only scavenging" | ties the best strategy | **walls at 13** |
| boss swings thrown, stage 8+ | 0 | **2–9** |
| slams as a cause of death | early stages only | **top cause on most stages** |
| a full career | 31–33 runs for 30 stages | **31–45**, losses scattered throughout |

A perfect-play policy still clears everything with an empty wallet, which is the
intended ceiling: the game is beatable by skill alone and the shop is what lets
everybody else get there.

### The road has no end

Stages 1–5 are hand-authored, 6–30 are the measured campaign, and **there is no
stage 31 in the sense of a wall** — the generator has always answered any number
handed to it. What it did not do was keep *scaling*: measured across stages
1–300, fourteen separate knobs hit a hard cap somewhere between stage 17 and
stage 34, so a stage-100 road was a stage-34 road with more enemy health on it.

Endless means the knobs never stop moving, and that every promise the road makes
stays true at depth:

| knob | used to stop at | now |
| --- | --- | --- |
| `gateAddBase` | linear forever → overran `MAX_SQUAD` by stage 86 | logarithmic knee past stage 30: 24 → 33 → 41 → 55 at stage 300 |
| `packSize` | 16, reached at stage 19 | linear to 22, then log toward a **screen** limit of 34 |
| `beatGap` | flat 7 from stage 30 — every deep stage beat-for-beat identical | keeps closing toward 5.2 (6.0 at stage 100) |
| `maxTriples` / `mulLeaves` / `mulThrees` | flat from stages 22 / 6 / 8 | grow with the number of banks a stage actually has, so the *ratio* holds |
| `MAX_SQUAD` | 1 600 — a thirty-stage ceiling | **4 000**, and the log knee is what keeps doors honest past it |
| `GATE_MAX_VALUE` | 99 — banks printed **two identical doors from stage 161** | 999 |
| pack / wall beat weights | floors reached at stages 34 / 32, then crowded out by hazards | floors drift up with the stage |

The honest limit, stated rather than hidden: no finite `MAX_SQUAD` survives an
unbounded sum. The theoretical best-case additive total first crosses 4 000
around **stage 240** — roughly three hours of unbroken play, and a figure that
ignores attrition, so a real run never approaches it.

## Progression

* **In-run:** squad size, per-survivor damage and fire rate — all three reset
  every stage, all three built entirely from what the player does on the road.
* **Between runs:** five coin-bought tracks (Squad / Firepower / Fire Rate /
  Reach / Scavenging). Deliberately five, not forty: the meta exists to make the
  *next* attempt feel different within thirty seconds.
* **…and three of them never max.** Squad, Firepower and Scavenging are
  uncapped, because a road with no last stage cannot have a shop with a last
  level: measured, a benchmark career reached stage 80 with **every track maxed
  and 893 063 coins unspent**. Fire Rate and Reach stay capped, and that is a
  rule rather than an omission — both are bounded by something physical (the
  bullet budget, the camera), so an endless level on either would sell a number
  that cannot move. The endless tail is priced *gentler* than the authored head
  (×1.16 a level against ×1.38–1.55): continuing the authored slope would put
  level 21 tens of stages away, and "endless" would mean "locked".
* **Standing:** highest stage ever reached, posted to a global board, with squad
  size as the tie-breaking second column. Read once per page load, written only
  when the player beats their own posted record — the board is a decoration on a
  game that works perfectly without it, and every failure path ends in "no rank
  shown".
* **Persistence:** one `tower_state` blob, one localStorage key, mirrored to
  whichever platform cloud the build targets. The stage number alone rebuilds
  the layout, so a reload resumes exactly where the player was.

## Art direction

Hand-inked cel art, drawn procedurally and baked to frame strips at runtime —
**zero gameplay bitmaps ship with the game**. One shared vocabulary
(`inkArt.ts` / `monsterKit.ts`) means the survivors and the monsters look like
one artist drew them: one ink colour, one key light, three line weights, three
tone cuts.

* Survivors are drawn **from behind** (pack, shoulders, bobbing hood) — the only
  angle a vertical runner ever shows, and the only one that reads at 30 px.
* Monsters come from the 13-design cast in `monsters.ts`, baked by
  `monsterSprites.ts`.
* The lane never changes hue; only the sky does, one palette per stage, so the
  thing the player reads every frame keeps its contrast.

## Feel (the non-negotiables)

* Gate ticks play a **rising pentatonic ladder** — pumping a gate is audibly
  winding something up.
* A gate pass costs a beat of **slow motion** (0.45× for ~150 ms), a white
  flash, a 40-particle burst and a screen shake scaled by the haul.
* Every hit flashes its target white by re-blitting its own sprite additively.
* Losing survivors turns the frame edges red and plays a short falling cry —
  the crowd has to feel like people, or the numbers mean nothing.
* Target 60 fps on mid-tier Android: pooled particles in typed arrays, baked
  sprite strips, one canvas, DPR clamped to 2, quality tiers driven by a rolling
  FPS average.

## Deliberately not in the game

Battle pass, achievements wall, daily-login calendar, daily missions,
rewarded-video buttons, treasure chest. They were removed because every one of
them puts a screen between the player and the road. Interstitials remain at the
natural break (between stages, ad **before** the result screen).

---

## Standard requirements block

> In GENERAL for all work: Do your work on a high-fidelity basis, don't do just
> good enough. Make the interactions feel good, add vfx juice where applicable
> (optimize to not overload the CPU/GPU). Don't take shortcuts. After planning,
> write the plan into `game-implementation-plan.md` to continue from if a
> session ends unexpectedly.
> The game starts right into the first scene, no main menu.
> Fully responsive: all mobile orientations, min portrait 320×658px, tablet and
> desktop up to fullscreen. No fixed px where avoidable — use %, vw/vh. Respect
> safe-area insets. Images are not selectable/draggable like normal web content
> but must allow drag and click events for game logic.
> Optimize for web-game standards: fast jump into gameplay (hot-path loading),
> delay uncritical assets until after first paint.
> Save ALL state variables in one object named `<game>_state`.
