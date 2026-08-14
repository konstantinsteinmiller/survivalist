# Survivalist — implementation plan / state of the build

Resume point for a future session. Everything in **Done** is built, typechecked,
unit-tested and verified in a real browser at 390×844 and 320×658.

## Architecture

```
src/game/          pure data + art, no Vue, no DOM state
  survival.ts        tunables + entity types (the rules, in one file)
  track.ts           seeded stage generator (pure fn of the stage number)
  foes.ts            enemy archetypes bound to the ink-art monster cast
  heroSprites.ts     the survivor, authored + baked to a 14-frame strip
  inkArt.ts          ─┐
  monsterKit.ts       ├ shared hand-inked art vocabulary (pre-existing)
  monsters.ts         │
  monstersAir.ts      │
  monsterSprites.ts  ─┘ idle-time frame baker for the monster cast

src/use/
  useSurvivalGame.ts  the simulation — module singleton, `step(dtMs)`
  useSurvivalArt.ts   the renderer — Canvas 2D, 11 layers, FX → juice table
  useVfx.ts           event bus + pooled particles / text / decals
  useGameAudio.ts     synth + sample cue bus (`playFx`)
  useUpgrades.ts      the four coin-bought meta tracks
  useTowerState.ts    the single `tower_state` save blob (pre-existing)

src/views/GameScene.vue     canvas + RAF loop + HUD + result flow + ad ordering
src/components/game/        RunHud.vue, ControlHint.vue, TutorialOverlay.vue
src/components/organisms/   UpgradeModal.vue, OptionsModal.vue, CoinBadge.vue
```

## Done

- [x] Core loop: steer → auto-run → auto-fire → gates → crates → barricades →
      foes → miniboss → boss → clear/wipe → coins.
- [x] **One bank, one door.** Two or three doors, a lethal pillar between each
      pair. The door holding the most survivors claims the bank and pays IN
      FULL; every other offer is destroyed on the spot and its pillars stand
      down with it. The pillars eat bullets too, so indecision costs the pump as
      well as the survivors.
- [x] **The crowd funnels.** The formation squeezes to fit the door it is aimed
      at and spills back out after, which is what lets a bank have three narrow
      doors instead of two wide ones — and is what a crowd going through a
      doorway actually does.
- [x] **The autobalancer.** Every stage cleared in a row makes the next 5.5 %
      harder (capped at 12); a single loss wipes the streak completely, so the
      handicap can never be why somebody is stuck. Shown as a flame chip — a
      handicap nobody can see is indistinguishable from an inconsistent game.
- [x] **`×2 / ×3 / ÷2 / ÷5` leaves.** Multipliers apply only to the survivors
      that went through that leaf; dividers kill all but `1/N` of them. A bank
      may never offer two equivalent leaves (enforced in `track.ts`, tested).
- [x] **Everything solid kills.** Barricades, crates and pillars all kill on
      contact via one shared `crushAgainst()`: `max(1, squad × fraction)` per
      second, and it PUSHES whoever it did not kill clear. (A naive per-frame
      cull fed the crowd into obstacles through the formation re-pack and
      deleted a 200-strong squad in half a second — measured, then fixed.)
- [x] **Fire rate is earned in the run.** Starts at 1.9 shots/s and rises only
      from blue rate crates (+0.55, cap 6.5); the meta shop moves it slowly.
- [x] **Minibosses** mid-stage from stage 2 (a second from stage 6), sized at
      ~34 % / ~44 % of the end boss so a stage has wins on the way to its climax.
- [x] **Escalating relief:** a stage that keeps beating the player comes back
      softer each time — 80 % → 72 % → 66 % → 62 % enemy health, plus a slam
      that takes 40 % less — and never below that floor, because a stage that
      cannot be lost is not a stage. Never announced mid-run.
- [x] **Boss actually connects.** It holds 3.8 units ahead and slams where the
      CROWD is, target locked at the start of a **1.0 s** telegraph — 0.62 s put
      the dodge on the wrong side of human reaction time. Radius 1.75 with a
      hard **31 %**-of-squad cap (raised 40 % — a fifth of the crowd was not
      enough to make a missed dodge hurt), so a slam is a real bite and still
      never a one-shot wipe.
- [x] Gate charging at exactly +1 per 500 ms of sustained fire, part-charge lost
      after 400 ms of silence, per-leaf payout by where the survivors actually
      are.
- [x] Cause-of-death telemetry (`deathBreakdown()`), which is what made every
      one of the fixes above measurable rather than a guess.
- [x] Sunflower-packed crowd formation, up to 700 simulated / 190 drawn, capped
      at a radius that fits a gate leaf — and clamped to the road, so the swarm
      squashes against a rail and lengthens down the lane instead of walking off
      the edge.
- [x] Hand-inked survivor sprite, three outfits, baked in idle time with a
      capsule fallback.
- [x] Renderer: parallax sky per stage, scrolling lane tile, rails, gates with
      pumped numbers + charge meters, crates, numbered barricades, monsters,
      boss + slam telegraph, tracers, particles, floating text, speed lines,
      vignette, hurt pulse.
- [x] Audio: rising pentatonic gate ladder, gate-pass chord, crate/barricade/foe
      /boss cues, sample-backed stage clear + wipe.
- [x] Meta: four upgrade tracks, coin economy, spotlight badge, shop modal —
      with Firepower re-priced to `+0.4`/level, because at `+1` on a base of 1
      the first purchase doubled the squad's damage and flattened stages 1–4.
- [x] Save: stage + upgrades + coins + bests in the one blob, `flushSaveNow()`
      at every hard checkpoint, resume-on-reload proven by the hydrate tests.
- [x] Removed: battle pass, achievements, daily rewards, daily missions,
      rewarded-ad buttons, treasure chest, and the whole tower-defence build.
- [x] i18n: new key shape in all 21 shipped locales, parity test green.
- [x] Ad ordering: interstitial awaited BEFORE the result overlay; first-play
      interstitial preserved; CrazyGames `gameplayStart/Stop` driven by a single
      `isLiveGameplay` computed.
- [x] The climax made unskippable: the boss **guards** at 66 % and 33 % health
      (overkill forfeited in `damageBoss`, so a 30 000-DPS squad still has to
      dodge twice) and **rages** as the fight runs long (each swing 0.17 s
      sooner and 0.07 u wider, floors 0.95 s / 2.55 u). Full VFX/SFX: hexagonal
      barrier, cold ricochet sparks, phase-turn flash + slow-motion hold, and a
      telegraph ring drawn from the same radius the kill is measured against.
- [x] The road's toll made proportional: a bite is the larger of the
      archetype's flat cost and a share of the crowd (`biteShareFor`), which is
      what stops a thousand-strong squad walking through monsters authored to
      frighten thirty.
- [x] Autobalancer strengthened: 13 %/clear across health, pack size and bite
      cost, capped at 30 so it is still moving on stage 30; one loss wipes it.
- [x] The road made worth travelling: rounds pass **through** gates (a doorway
      is not armour), minibosses **plant and block** instead of strolling
      through the crowd, the generator guarantees 12 units of clear road behind
      every elite, the coin magnet is bought rather than given
      (0.55 + 0.34/level of Scavenging), and shot-down barricades drop 2–4
      coins. `MINIBOSS_BOSS_FRACTION` re-priced 0.26 → 0.115 to match: the old
      number was sized for an enemy nobody ever fought.
- [x] **Minibosses attack.** Planting fixed "it gets walked past" and replaced it
      with "it is a health bar you stand in front of". It got a maul first —
      a 0.7 s ring on the ground, dodged sideways, capped at 8.5 % of the squad —
      which read well and cost 0–8 survivors a fight, i.e. nothing. So the move
      changed shape. The elite now **sweeps**: **0.3 s** of wind-up, then an arc
      across the **whole lane** reaching 4.3 u down the road, taking **a fifth of
      the current squad**, every **1.5 s**, alternating direction. No radius and
      no safe side — the boss asks *where are you standing*, the elite asks *how
      hard do you hit*, and the 9 s leash is what keeps it survivable (six
      sweeps, ~26 % of the crowd left). Telegraph is a lane-spanning amber band
      with a bright edge travelling the way the arc will swing, drawn from the
      exact reach the kill uses, under the bodies and again over them.
      Full FX: weighted shake, dust laid along the arc, debris and an additive
      slash that both travel in `dir`, and two cues that sweep their filter
      rather than decaying in place, pitched above the boss's sub so a sweep is
      never mistaken for a slam.
- [x] **The guns stopped outranging the camera.** Rounds ran to `anchorY + 26`,
      about twice the visible road, so barricades and crates died before they
      finished sliding onto the screen and a bank could be pumped from
      off-screen. `BULLET_RANGE` now ends a round **15 % of the screen short of
      the top edge** (10.8 units), derived from the reference zoom rather than
      the live viewport — range is a RULE, and a rule that changed with the
      window would make the same stage a different game on a tablet. The boss
      holds at 3.8, so it is never out of reach.
- [x] **`-N` doors and banks with no right answer.** A `sub` leaf bills a flat
      count and pumps on the SAME clock as `add` — and since the crowd fires
      forward automatically, *the door you are aiming at is the door that
      grows*. Aim at the bill on the way in and you buy a bigger bill, which is
      the first time in the game that pointing somewhere is worth more than
      pointing at the best offer. A `÷N` beside a `-N` is a **dilemma**: a
      fraction against a count, so which one is cheaper flips with the size of
      the crowd. Rationed to one a stage from stage 4, never back to back,
      never the closing bank. Own tint family (cool = pays, warm = bills),
      own descending pump cue, own inverted tick VFX.
- [x] **…and the curve re-cut around them**, because the range cut halved the
      pump window (~4.8 s → ~2.0 s) and the crowd stopped getting built:
      `average` fell to **0 %** on stages 2, 3 and 5. Three dials, each aimed at
      the specific break — `ELITE_HOLD_MAX` 9 → **4.5** (the leash is the only
      bound on a 20 %-per-1.5 s sweep), `MINIBOSS_BOSS_FRACTION` 0.115 → **0.08**
      (a percentage attack can only be answered by a shorter fight, never by a
      bigger crowd), and `gateAddBase`'s flat term 2 → **4** (the value the pump
      no longer has time to add, moved into the printed number). Landed back on
      the game's historical spread: `optimal` 100 %, `good` 95–100 %, `average`
      80–100 %, `careless` 0 %.
- [x] **`SUB_EARLIEST`** — the one bug the new door introduced, and the reason it
      is a separate rule from `TRAP_EARLIEST`: a `÷5` on a crowd of four leaves
      one survivor, a `-8` leaves none. The career study caught it exactly,
      walling `average` at stage 7 on every purchasing strategy, dead at 8 % of
      the road with every death charged to the door. Bills now wait until a
      third of the way in, enforced in `bank()` so a hand-authored stage cannot
      forget.
- [x] **Fixed: the raging boss froze on one spot.** Reported from play — the boss
      hammering one patch of empty road in the bottom-left corner, stacking
      scorch decals into a black smear. The slam's target was latched on the
      falling EDGE of the telegraph window ("above `SLAM_TELEGRAPH` last frame,
      below it now"), which is only an edge while the cadence is longer than the
      window — and rage drives the cadence down to `SLAM_CD_MIN` = 0.95 s, below
      the 1.0 s telegraph. From the **ninth swing** the crossing never happened
      again and `slamX`/`slamY` were frozen for the rest of the fight. Replaced
      the inferred edge with an explicit `Boss.aimed` flag cleared when a swing
      fires: the question "have I aimed for this swing" has the same answer at
      every cadence, including cadences shorter than the wind-up (where the
      honest behaviour is that the boss is always winding up). Regression-locked
      in `bossFight.test.ts`, which sweeps the crowd across the lane and asserts
      the raged half of the fight aims somewhere new each time.
- [x] **First-run controls lightbox.** The one lesson that cannot be taught
      while the player is also being asked to survive, so it is taught before
      the road starts: a scrim with a hole over the squad, an animated gesture
      (finger swipe on touch, gliding pointer on desktop), one line of copy, and
      a ring that fills as the crowd actually moves. It is **not a dialog** —
      there is nothing to dismiss, `pointer-events: none` all the way down, and
      the player leaves it by performing the gesture for **one second of moving
      time**. Backed by `steerOnly` in the sim, which freezes the road and the
      streamer while leaving the anchor and formation live: a pause cannot
      demonstrate that moving your finger moves the squad, and streaming the
      road would put stage 1's gates behind the scrim. Persisted under its own
      `TUTORIAL_KEY` (not `ONBOARDED_KEY`, which would gate stage 1 in front of
      an existing player on stage 20) and flushed immediately. A 12 s bail-out
      starts the stage anyway if the gesture never arrives — and deliberately
      does NOT spend the flag, because a device whose input never reached the
      canvas is the one device that must not lose its second chance.
- [x] 423 unit + simulation tests green, `vue-tsc --build` clean, production build clean.

## Verified in Chrome (390×844 and 320×658)

60 fps, worst frame 18 ms; no console errors; gates, crates, barricades,
monsters, boss, result screen, shop purchase → coin deduction → persisted blob.

Re-verified after the boss overhaul at 390×844: guard barrier renders with the
health bar resting exactly on 0.66, ricochet sparks read against the hit sparks,
the guard swing takes 31 % of a 407-strong squad, both phases fire and the stage
resolves. Median frame 16.8 ms / p95 28.6 ms with a 900-strong crowd — above
`MAX_DRAWN`, so the renderer is capped and the cost is simulation. Console
clean.

Re-verified after the miniboss maul, stage 4, at both sizes — and it **caught a
bug the whole test suite could not**. Driven to a planted hound and frozen
mid-wind-up: the amber ring read perfectly while the elite was still walking in,
and was **completely invisible** once the crowd was pinned, which is the only
moment the attack exists for. The ground pass is drawn under the bodies
(correct: a monster must not be able to stand on its own telegraph), but a
full-size crowd is 1.65 units of packed survivors against a ring drawn at 1.53,
so the warning was buried under the exact squad it was warning. The boss never
showed this — its ring is 2.2–3.3 units and its rim always clears the crowd.
Fixed by drawing the elite's telegraph a second time over the crowd,
outline-only, same coordinates and the same reach (a telegraph that widened
itself to stay visible would be the lie the boss's ring is commented against).
Both passes survived the rewrite from maul to sweep.

Re-verified again after the sweep, stage 4, 390×844 and 320×658: the lane-wide
band and its travelling edge read over 323 packed survivors at both sizes, the
arc alternates direction, and four consecutive sweeps against a pinned crowd
took it 139 → 101 → 74 → 49 — ~27 % a swing, which is the 20 % sweep plus the
elite's own bite. An invincible elite wiped a 178-strong squad in ten seconds.
Console clean.

Re-verified after gun range and the `-N` doors, stage 6 at 390×844: a dilemma
bank renders as `÷2` (red, barred, leaning left) against `−9` (amber, leaning
right) either side of one pillar — hostile at a glance, tellable apart at a
second glance. Tracers visibly die well short of the top and the crate up there
arrives intact. Aiming at the `−9` on the approach pumped it **9 → 12** in
1.2 s and walking through it cost exactly 12 survivors, so the mirror mechanic
holds end to end. The boss still takes fire normally (stage 3, dropped to 45 %
health). Console clean.

## Verified by simulation (`tests/sim/`)

Five scripted player policies × 5 stages × 10–20 seeds, driving the real
simulation at a fixed 16.67 ms step, **plus full thirty-stage careers** for
every (policy × purchasing strategy) pair carrying the save the whole way.
`tests/sim/REPORT.md` has the per-stage numbers; `tests/sim/CAREER.md` has the
campaign.

Headline: `optimal` clears stages 1–5 on every seed, `average` clears stage 1 on
every seed and then becomes patchy, and a run that never steers reaches the
stage-1 boss and always loses to it.

The career study is what caught the real problem — **every competent player
cleared all thirty stages on any purchasing strategy, including buying
nothing**, with the boss dying before its first swing from stage 8 onward. The
cause was structural (an exponential crowd against an absolute toll), so the fix
was structural: proportional bites, boss guard phases, boss rage. Re-measured
after: the boss throws 2–9 swings on every late stage and a perfect dodger still
takes 0 % of them — the swing is a skill check, not a tax.

Re-run twice more as the miniboss learned to attack — once for the maul, once
for the **sweep** that replaced it. The campaign survived the sweep: every
career that buys damage still finishes all thirty stages and no spending
strategy changed rank. What moved is the hoarders — `optimal` buying nothing
fell 19 → 12, and `optimal` pouring everything into Scavenging fell **30 → 12**,
because the one thing a bigger wallet cannot buy is a shorter fight.

Per-stage is where the sweep bit, and unevenly: stage 3 fell from a 100 % clear
for `good` to **15 %** (and 75 % → 35 % for `average`), both dying to the elite
at 46 % progress, while stages 2, 4 and 5 barely moved. The cause is fight
length, not damage — a stage-3 elite survived the whole nine-second leash and
threw six sweeps; a stage-4 one died in 1.3 s and threw one. Fixed by the leash
and elite-HP cuts in the round below.

Re-run once more after gun range, `-N` doors and the retune. The campaign still
finishes on every damage-buying strategy, and costs more to finish: `average`
now spends **48–59 attempts** reaching stage 29–30 against 37–44 before. One
rank moved — `optimal` on Firepower-only went 19 → **30**, because four more
printed on every `add` leaf grows the crowd enough that a build spending nothing
on Squad still arrives with bodies. That is the one place the compensation
over-shot; it is a design question rather than a bug, and it is flagged in
`CAREER.md`.

The career matrix also caught the round's one near-miss, which no per-stage
table could: a `-N` door can reach ZERO where a `÷N` cannot, so an `-8` on an
opening bank deleted a four-strong squad outright and walled `average` at stage
7 on **every** purchasing strategy. See `SUB_EARLIEST`.

The study also found five outright bugs — a contact-damage model that punished
correcting a mistake four times harder than never correcting it, a run clock
that leaked between stages, a chicane that exited on the wrong side of its own
reward, silently-discarded gate payouts, and a geometry comment that reasoned
about painted widths instead of contact widths. All fixed; all listed in the
report.

## Next (see `retention-roadmap.md` for the ranked list)

1. Auto-advance timer on the result screen (kill the dead air between runs).
2. Milestone chest every 5 stages.
3. Free "Rally!" revive when a wipe happens past 75 % of a stage.
4. Analytics events — nothing else on the list can be judged without them.

## Known trade-offs

* Gates are pumped from up to ~13 units away, because bullets cross the whole
  visible lane. That is genre-correct (the reference does the same) but it means
  the skill is column choice and timing, not aim.
* **A crowd that stops dodging the boss is deleted very fast, and that is a
  number rather than a bug.** Measured on stage 6 with the boss pinned alive and
  the crowd standing still: every death in the boss phase is `slam`, exactly
  `SLAM_MAX_FRACTION` = **31 % of the squad per swing**, on a cadence that rages
  from 2.6 s down to 0.95 s — 580 survivors to 42 in fourteen seconds. There is
  no second kill channel; the boss has no contact damage at all. It reads in
  play as the front rank being shredded one body at a time, because 31 % of a
  crowd dying at once animates out over about a second. If that is too harsh the
  dial is `SLAM_MAX_FRACTION`, and it is a design call: 0.31 was deliberately
  raised from 0.2 because a fifth of the crowd was not enough to make a missed
  dodge hurt.
* The boss guard forfeits overkill. A player who has massively over-built sees
  their damage stop counting for up to a second, twice a fight. That is the
  price of guaranteeing the climax happens, and it is paid only by players who
  had already won — but it is a deliberate lie about their damage and it should
  be watched in playtests before it is defended.
* **The sweep is undodgeable, and stage 3 is currently paying for it.** This is
  the biggest open number in the game. A fifth of the squad every 1.5 s against
  a crowd that cannot leave is, by construction, a pure DPS check — and the
  measurement says it lands very unevenly across the campaign: stages 2, 4 and 5
  barely moved (the elite dies in 1–4 s), while stage 3's elite survives the
  full nine-second leash and eats ~200 survivors, taking `good` from a 100 %
  clear rate to **15 %** and `average` from 75 % to **35 %**. The fight length
  is what decides everything here, and fight length is `minibossHp` ÷ the DPS a
  run happens to have at that point on that stage. Four dials, in the order they
  are worth trying: `ELITE_SWEEP_FRACTION` (0.2), `ELITE_HOLD_MAX` (9 s — a
  shorter leash caps the total toll without weakening a single sweep),
  `MINIBOSS_BOSS_FRACTION` (stage 3's elite is simply too tanky for the DPS
  available there), and last `ELITE_SWEEP_CD` (1.5 s).
* The sweep also means the *approach* is now the safe part and the block is the
  whole fight — the elite only swings inside `ELITE_SWEEP_REACH`, so walking up
  to it costs nothing and standing in front of it costs everything. That is a
  cleaner shape than the maul's (which whiffed during the approach as an
  accident of target-locking), but it does put the entire cost of the encounter
  into a window the player cannot leave.
* Difficulty is carried by HP scaling, density, routing pressure, the challenge
  streak and the retry relief. There is still no per-player model beyond the
  streak. If stage-8 churn shows up in analytics, scale `foeHpScale` by a
  rolling average of the player's last three peak squads.
* `good` and `average` spend 11–20 s on the boss from stage 2 onward, because
  neither scripted policy ever detours for a crate. Whether that is the numbers
  or the policies being unrealistically stubborn is the top open question in
  `tests/sim/REPORT.md`.
* Stages 6+ are generated rather than authored and have not been studied.
* `MonsterLab.vue` (`/#/monsters`) is kept as a lazy design bench for the
  monster cast — it costs a player who never opens it nothing.
