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
  useUpgrades.ts      the five coin-bought meta tracks (three of them uncapped)
  useTowerState.ts    the single `tower_state` save blob (pre-existing)
  useLeaderboard.ts   the global depth board — every path swallows, nothing waits
  usePlayerIdentity.ts anonymous stable id + display name, persisted in the blob

src/views/GameScene.vue     canvas + RAF loop + HUD + result flow + ad ordering
src/components/game/        RunHud.vue, ControlHint.vue, TutorialOverlay.vue
src/components/organisms/   UpgradeModal.vue, OptionsModal.vue, CoinBadge.vue,
                            LeaderboardModal.vue

worker/                     Cloudflare Worker + D1 behind the board. Its own
                            package.json and deploy cycle; see worker/SETUP.md
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
- [x] **Boulders: the obstacle with no HP bar.** Every solid thing in the game
      had a number on it, so every routing problem had a lazier second answer —
      point at it and hold — and since DPS is the stat the whole run grows, the
      road got *easier* to navigate as the crowd got bigger. A boulder eats the
      round and shrugs. Two ranks with OFFSET gaps, so the crowd commits to a
      line and then has to change it inside about a second, and the same
      `ensureRunnable` guarantee the walls get so a field is never a dice roll.
      Grey, irregular, no badge, no meter: the absence of a number IS the
      mechanic.
- [x] **Crates come in tiers, and print their HP.** Light 0.6× / standard 1× /
      heavy 2.1×, per crate rather than per row, now also scaled by difficulty
      and retry relief like every other obstacle. A heavy crate is deliberately
      out of reach of an unupgraded squad — a box you walk past on stage 3 and
      crack open two upgrades later, which is the only way a stat crate can
      reward progression instead of just handing it out.
- [x] **Monsters drop coins.** The bounty was always there and always invisible
      (a counter behind the HUD), so a pack read as pure cost. A corpse now
      scatters loose coins that must be driven over — the pack in your lane pays
      and the one you steered around does not, and Scavenging finally has a
      customer who fights rather than routes.
- [x] **`÷3`, and no back-to-back multipliers.** Three trap rungs instead of two
      (`÷2` absorbable, `÷3` from stage 4, `÷5` ends runs), because the middle
      rung is where a hard choice lives and it is the value most often paired
      against a `-N`. And `canMul` gained the clause it was missing: `×2` then
      `×2` was a free quadruple for anyone who could aim twice.
- [x] **The `×3` is the income.** A rewarded-video button on EVERY result
      screen — win and defeat, because the run that ended badly is the one whose
      coins the player most wants back — with a film-clapper icon, which is the
      cross-portal convention that lets the button avoid the word "ad". Three
      rather than two on purpose: the stage's own payout keeps the shop moving
      slowly, the tripled one keeps it moving at the pace the difficulty curve
      is priced against.
- [x] **Declining leans the road, silently.** Each consecutive stage cleared
      without claiming adds 7 % enemy health, capped at six steps, and **one
      claim resets it to zero**. It is a lean, not a debt. Two guards keep it a
      nudge: it never fires on a defeat (stacking difficulty on a losing streak
      is how a losing streak becomes a quit) and it never fires when the offer
      was not actually available (a no-fill must not make the game harder).
      **Not announced.** A first pass put a warning line on the result screen;
      it was removed because it turns an offer into a threat. The road simply
      gets heavier and the player works out that the ×3 buys upgrades that keep
      pace — the choice stays theirs.
- [x] **Both careers measured** (3 seeds × policy × strategy, `claimsReward`
      models the two players the placement creates):

      | player | claims | reached | attempts | worst stage |
      | --- | --- | --- | --- | --- |
      | `optimal` | yes | 30 | 34 | 2 goes |
      | `optimal` | no | 30 | 42–43 | 3 goes |
      | `good` | yes | 30 | 35–36 | 2 goes |
      | `good` | no | 30 median, **5–6 on some seeds** | 40–42 | 5 goes |
      | `average` | yes | 30 | 39–41 | 3 goes |
      | `average` | no | **6** | 16 | 5 goes |

      Claiming lands where it was aimed: `optimal` finishes thirty stages in 34
      attempts — 1.13 a stage, easy without being free. Declining is a real hard
      mode: a competent player still finishes but pays ~25 % more attempts, and
      a mid-skill player walls at stage 6. That wall is the open question, not a
      bug — see the trade-off note.
- [x] **Reward gating fixed across five portals.** `isRewardGated` read
      `isCrazyWeb && isCrazyGamesFullRelease`, written when CG was the only
      portal wired for rewarded ads. Playgama, GamePix, GameMonetize, Yandex and
      GameDistribution all resolve real providers, so that predicate was handing
      every rewarded perk out **for free on five shipping portals** — no video,
      no revenue, and a reviewer clicking a button marked with a film icon
      seeing nothing. It now follows the resolved provider.
- [x] **Interstitial pacing 120 s → 121 s.** CG and Playgama both rate-limit to
      one every two minutes and reject the early request, so a gate set to
      exactly the platform's limit loses to clock skew and background-tab timer
      coalescing. The ordering was already right: awaited BEFORE the result
      overlay, never after.
- [x] **Rewarded ads now take the audio drain too.** The midgame path waited
      `AUDIO_DRAIN_MS` after killing audio (GamePix QA: "wait for the music to
      be stopped before showing the ad"); the rewarded path skipped it purely
      because it was written first, so claiming the `×3` on a stage-clear jingle
      cut the tail into the video.
- [x] **Reach — a fifth upgrade track.** +3 % gun range a level, **+30 % at
      level 10**, and the only track that buys TIME rather than force: a round
      that reaches further arrives sooner at every gate, crate and wall, so the
      crowd gets more seconds of fire on each before it is reached.
      `effectiveBulletRange()` clamps it at `BULLET_RANGE_MAX` — the top of the
      screen — because an unclamped +30 % is 14.1 units against a 13.7-unit
      camera, which would have re-introduced "obstacles deleted above the
      screen" gradually, as a reward, which is far harder to spot in a playtest
      than the original bug was. The track's promise is exactly "shoot further,
      up to everything you can see". Measured: the `value` strategy maxes it in
      every career without it becoming dominant, `cheapest` never buys it and
      still finishes thirty stages, and Reach alone carries a run to stage 14 —
      the same depth as Firepower alone.
- [x] **The road has no end — and now it scales like it.** There was never a
      "campaign complete" branch: `buildTrack(31)` always worked. What did not
      work was everything the generator stopped scaling. Measured across stages
      1–300, **fourteen knobs hit a hard cap between stage 17 and stage 34**, so
      a stage-100 road was a stage-34 road with more enemy health on it. The two
      that were not merely flat but actually BROKEN:
      `gateAddBase` grew linearly forever, so the sum of a stage's best `add`
      leaves overran `MAX_SQUAD` at **stage 86** and every door past it silently
      short-changed the player; and with `GATE_MAX_VALUE` at 99 every `add`
      clamped to the same number, so from **stage 161** banks printed two
      identical doors — the core invariant of the whole game failing quietly,
      turning the pillar between them into a punishment for existing.
      Fixed as a family: `MAX_SQUAD` 1 600 → 4 000, `GATE_MAX_VALUE` 99 → 999,
      a logarithmic knee on `gateAddBase` past stage 30 (24 → 33 → 41 → 55 at
      stage 300), `packSize` linear to 22 then log toward a **screen** limit of
      34, `beatGap` closing toward 5.2 instead of stopping at 7, `maxTriples` /
      `mulLeaves` / `mulThrees` growing with the number of banks a stage
      actually has so the RATIO of wide banks and multipliers holds, hazard
      chances creeping past their thirty-stage ceilings, and the plain-pack /
      plain-wall beat weights given rising floors so the simple beats are not
      crowded out of the vocabulary by hazards that grow without bound.
      The limit is stated rather than hidden: no finite `MAX_SQUAD` survives an
      unbounded sum. The theoretical additive total first crosses 4 000 at
      **stage ~240** — about three hours of unbroken play, and a figure that
      ignores attrition, so a real run never approaches it. `endless.test.ts`
      asserts the properties at stages 31 → 1 000.
- [x] **The shop has no last level either.** A road with no last stage cannot
      have a shop with a last level: measured, a benchmark career reached stage
      80 with **every track maxed and 893 063 coins unspent**, and no stage past
      40 cost it more than two attempts — the difficulty curve kept climbing and
      the only thing that answers it had stopped. Squad, Firepower and
      Scavenging are now uncapped. Fire Rate and Reach are NOT, and that is a
      rule rather than an omission: both are bounded by something physical
      (`MAX_FIRE_RATE`, the camera), and a level that sells a number which
      cannot move is worse than a maxed track. The tail is priced **gentler**
      than the head — ×1.16 a level against the authored ×1.38–1.55 — which
      looks backwards and is not: by level 20 the authored curve costs ~2 850×
      the first purchase, so continuing it would put the first endless level
      tens of stages away and "endless" would mean "locked".
      Found on the way: the Fire Rate readout used **0.09**/level while the
      simulation used **0.07** — the shop promised 4.0 shots/s at max and the
      run delivered 3.5, a 13 % lie in the direction that flatters the purchase.
- [x] **A global board, and it may never cost a run.** The score is the highest
      stage ever reached — the game's whole progression is "how deep did you
      get" — with squad size as a second column, because two players on stage 40
      are not the same player. Cloudflare Worker + D1 in `worker/`, deployed on
      its own schedule with its own `package.json`; `worker/SETUP.md` is the
      start-to-finish runbook.
      **Nothing in the client may throw, block or delay a run**: every fetch is
      wrapped and swallowed, `reportRun` is called with `void` and never
      awaited, and a captive-portal proxy answering 200 with an HTML login page
      ends in "no rank shown" like every other failure. **Quota** is the second
      rule — free tier, so: read at most once per page load, write ONLY when the
      player beat their own posted record (a rename re-posts the same score, and
      the worker touches only the name so nobody jumps their ties). A player
      grinding one stage for an hour costs one edge-cached GET.
      Off by default where it has to be: with no `VITE_LEADERBOARD_URL` the
      feature is absent rather than broken, which is how the Yandex build ships
      — their moderation greps the bundle for third-party storage endpoints, so
      the URL is emptied AND the CSP origin omitted, two switches that fail
      independently. The CSP entry is the URL's **origin only**, never the
      configured URL: a CSP source with a path is a prefix match, and a typo'd
      env var must cost a leaderboard, not a release.
- [x] **The miniboss is a body, not a hologram.** Reported from play: a squad
      that fails to kill the elite watches it break off at `ELITE_HOLD_MAX` and
      walk back down the road **straight through them** — survivors crossing the
      sprite and coming out the far side, which reads as missing collision
      rather than as a monster shouldering past. Every other solid thing on the
      road already parts the crowd (`crushAgainst` pushes whatever it does not
      kill); the elite was the one exception, purely because foes are handled by
      the bite loop instead of the obstacle loop.
      `partAround()` is the push half of that rule with no damage attached —
      the bite loop already decides what contact costs, and a second killer on
      the same body would bill the player twice for one monster. Same three
      invariants as the obstacle push: the unit moves and never the anchor (a
      monster shoves the crowd, not the thumb), the shove is clamped to the
      road, and a survivor dead-centre breaks its tie on index parity so a body
      on the crowd's centre line parts it into two lobes instead of sweeping
      everyone one way.
      The footprint is the DRAWN one — `drawFoes` paints the contact shadow at
      0.38 of a `scale × 1.25` body, so `ELITE_BODY_HALF_W` is `scale × 0.475`
      exactly. Depth is deliberately deeper than the shadow: the sprite stands
      up out of its own footprint, and a body only as deep as the ellipse would
      still let a survivor walk through the monster's knees.
      **Ordinary foes stay non-solid**, which is a rule and not an oversight: a
      creep is a body the crowd is meant to absorb, and making a pack of twelve
      solid would turn every routine fight into a routing puzzle the road was
      never authored for — at an O(units) pass per foe per frame.
      The fight itself is untouched, and the geometry is why: while the elite
      HOLDS, `stopAt = f.y - ELITE_HOLD_AHEAD` keeps the crowd 1.3 units clear
      of the body, so nothing is ever pushed during the fight the player is
      trying to win. Locked by `crowdBounds.test.ts`, which needs an
      under-gunned squad to reach the case at all — stage 14 against forty
      survivors loses the fight, where a 400-strong squad on stage 6 kills the
      elite in 7.5 s and never gets closer than 1.30. Without the fix that test
      catches a survivor standing at x = −0.19 inside a body centred on 0.00
      with a half-width of 1.13.
- [x] **Solid means solid: walls and boulders kill on contact.** Reported from
      play: a crowd driven into a stone **wrapped around it** and kept going.
      Contact was a rate-plus-shove — `squad × fraction` survivors a second,
      everyone else pushed clear — so an obstacle the whole game calls lethal
      cost two survivors and a swerve. It is now a guillotine: whoever touches
      dies that frame, and the swarm streams past on both sides.
      Three things fall out of it, all improvements. **The bill is the line you
      ran, not the seconds you spent** — the old rate saturated at 8 % overlap,
      so clipping an edge cost nearly as much as ploughing the crowd's middle
      through, which is exactly backwards. **It scales itself**: a column
      through the crowd is measured in the crowd's own bodies, so the
      hand-tuned per-obstacle percentages are gone. **Nothing is carried between
      frames**, which retires an accumulator that needed two bug-fixes to stop
      punishing a player who corrected late four times harder than one who never
      corrected at all.
      What it gives up is `contactRelief`: there is no rate left for a stuck
      player's discount to scale, so relief reaches obstacle deaths only through
      the retry discounts that weaken the obstacles themselves.
- [x] **…and the four things that are deliberately NOT lethal.** Measured, not
      chosen. Making every solid thing a guillotine breaks the game: the
      benchmark player dies on stage 4 at 16 % of the road with 42 barricade
      deaths, and a zero-input run dies at 67 % of stage 1 — on the centre
      pillar of the first bank, which is the documented onboarding floor.
      * **Gate pillars and unbroken crates keep the grind** (`grindAgainst`).
        A pillar is a blade standing between two doors the player is aiming AT,
        with a safe band half a unit wide; a crate is a REWARD the player was
        invited to chase, and punishing the attempt like a wall teaches them to
        stop chasing rewards.
      * **Monsters displace instead of killing** (`partAround`). A wall stands
        still, so a lethal wall is a question about the line you took. A monster
        HOMES on the crowd, so a lethal monster is not a question at all — it is
        an undodgeable chord of about **half the squad**, against a designed
        bite of 0.4–1.8 %. Measured both ways: monsters killing on contact puts
        the benchmark player out at 10 % of stage 5 with 45 foe deaths and
        breaks **8 of 21** balance invariants; monsters displacing passes all
        21. What did change is that no survivor may ever stand inside a monster
        sprite — the miniboss rule, now every foe's.
- [x] **The road pays for the rule: `MIN_RUN_GAP` 4.4 → 5.4.** Half a unit of
      clearance is ±0.25 of steering slack, which was ample when touching a wall
      cost a trickle and is not ample when it costs the column. It stops at 1.0
      of margin because `ensureRunnable` buys clearance by DELETING blocks: at a
      2.6 margin every barricade row in the game is one block wide and every
      boulder field is one boulder — measured — and the obstacles stop existing.
      1.0 keeps ~1.6–2.2 blocks a row against 2.19 before.
- [x] **The harness was measuring a different game — the policies could not see
      boulders.** `View` carried gates, dividers, crates, barricades, foes and
      pickups, and no rocks, so every scripted player routed as if the one
      obstacle that CANNOT be shot did not exist. Invisible while contact was a
      trickle; decisive the moment it was lethal — stage 6, where boulders first
      appear, went to a 0/3 clear rate for both `good` and `optimal`, with 138
      and 110 deaths on stone they were never shown. Adding `rocks` to the view
      and to `hazardsAhead` took the suite from 13/21 to 20/21 on its own.
- [x] **Monsters knock a rank down — the third contact rule.** A monster was
      solid but harmless on contact; it now kills **every second survivor that
      runs squarely into it**, and the survivors of that get **ten frames** of
      immunity. Half rather than all, because a monster homes on the crowd: a
      wall stands still so a lethal wall is a question about the line you took,
      and an all-or-nothing monster body is an undodgeable chord of ~half the
      squad against a designed bite of 0.4–1.8 %.
      **Two bounds, and they bound different things.** The i-frames are per
      SURVIVOR — a body pays once, so a pack standing shoulder to shoulder
      cannot bill it six times in one instant. A per-MONSTER cooldown
      (`FOE_COLLIDE_CD` = 0.6 s) is the other half, and without it the rule
      collapses back into the wall rule: a monster crosses the crowd's whole
      depth in about half a second, meeting a fresh unprotected rank on every
      frame of the way, so one creep billed a column instead of a rank.
      Measured, that difference is the whole feature — with unit i-frames alone
      the suite failed 7 of 21; adding the monster cooldown took it to 20.
      **Only the core kills.** The whole body still pushes (nobody stands inside
      a sprite) but the middle 60 % does the damage: a creep's contact box is
      0.69 against a crowd 1.65 in radius, so the shadow's edge is a generous
      definition of "ran into it", and at the full body a competent player who
      never takes the ×3 walls at **stage 4** with 82 foe deaths. At 0.6 all
      twenty-one invariants hold.
      The bite is untouched and does not double-bill: it reaches further than
      the body, is metered by `biteCd`, and is an ATTACK rather than a
      collision — so immunity does not cover it. The mouth takes what comes
      near, the body takes half of what runs into it.
- [x] **Passages: the bank you cannot change your mind about.** A rib of
      unbreakable stone growing back down the road out of a bank's pillar,
      splitting the approach into one corridor per door. Every bank was already
      a commitment, but only at the last moment — the crowd could sit on the
      centre line reading both offers and slide to whichever it liked with half
      a second to spare, which makes a bank a REACTION rather than a decision.
      Both doors stay in plain sight the whole way in (that is the split second
      being sold, and it is why the rib is short enough to fit on screen with
      the bank), but entering a corridor puts the other offer behind a wall.
      **Three numbers, each with a reason.** LENGTH is a decision window, so it
      is 1.2 SECONDS converted at the stage's own speed — about seven units at
      stage 6 — not a fixed distance that would mean different things at
      different speeds. WIDTH is the pillar's own contact width and not a unit
      more: the pillar already reaches 0.55 into the lane, so a rib of the same
      width takes nothing off the safe aiming band a two-leaf bank already had.
      CADENCE is every third or fourth bank, rolled per passage so the player
      cannot count bars, never on a three-leaf bank (two pillars would leave a
      centre corridor 1.2 units wide against a crowd 3.3 across), and never
      before stage 6 — which is where boulders arrive anyway, so "grey stone
      cannot be shot" is already taught.
      **The corridor squeezes.** The pillar GRINDS and the rib KILLS, and a
      0.35-wide band is not one a player can hold when the price is the whole
      column — the lethal-contact work measured exactly that. So a corridor gets
      the same treatment a door gets: the crowd funnels to fit it and spills out
      the far side, which restores a ±0.4 window without touching the road's
      geometry or the bank's numbers.
- [x] **…and the harness was steering through the wall.** `expectedLoss` prices
      a POSITION and knows nothing about the PATH to it, so with a rib on the
      centre line the far door scored zero — the crowd would not be touching
      anything once it got there — and every policy cheerfully drove through the
      stone to reach it. Measured: `good` clearing **0 of 3** on stage 7 with
      139 deaths on rock, while `optimal` (which commits early enough to be on
      the right side already) took none at all. `safestNear` now scans only the
      corridor the crowd is committed to, which is what a human does without
      being told. With that one change the whole balance suite went back to
      21 of 21 — the road was right and the model of the player was not.
- [x] **Every third boss swing is charged.** The ordinary slam is a question
      about where you are standing, and a player who keeps moving answers it
      perfectly — measured, a perfect dodger takes **0 %** of them, which leaves
      the boss with no answer to a good player at all. Every third swing now
      plants, winds up **1.7×** as long, and throws **double the radius** at
      where the crowd is going (lead 0.8 against 0.35) rather than where it was.
      **The radius and not the damage**, deliberately: a slam's toll is
      `squad × slamShare` counted off whoever is inside the ring, so the radius
      decides whether it lands and the share decides what it costs once it has.
      Doubling both would be two knobs doing one job, and the second is the one
      that turns a boss into a coin flip. Measured on a moving crowd: charged
      swings connect on a majority of throws where ordinary ones are dodged.
      One definition of the radius (`slamRadiusFor`), read by the simulation
      that kills with it AND the telegraph that draws it — the telegraph is not
      allowed a second opinion about how big the hit is — plus a longer, wider,
      gold ring so the charge reads before it lands.
- [x] 473 unit + simulation tests green, `vue-tsc --build` clean, production build clean.

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

Re-run once more past the campaign, to stage **110**, when the road went
endless. All three policies reach it — `optimal` in 124 attempts, `good` 127,
`average` 138 — and the attempts-per-stage curve rises rather than flattening:
1.10 through the sixties, 1.30–1.40 across stages 101–110. The rise is the
result that matters, because it is what a plateaued generator cannot produce; a
pre-endless stage-100 road would have cost exactly what stage 31–60 cost. Full
table and the caveats in `CAREER.md`.

Studies report through `console.log`, and **Vitest 4's default reporter drops
console output from passing tests** — a study now runs for five minutes, passes,
and prints nothing unless `--reporter=verbose` is passed (`--reporter=basic`,
the old answer, no longer exists). Both study docs carry the corrected commands.

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
* **A player who never takes the ×3 walls at stage 6 if they are mid-skill.**
  Measured, not guessed: `average` reaches stage 30 claiming and stage 6 not
  claiming, while `good` finishes either way (at 40–42 attempts instead of
  35–36) and `optimal` never notices. That is a strong lean — arguably the
  right one, since the ×3 is the designed primary income and the pressure is
  supposed to be felt — but it is close to the line where a portal reviewer
  reads it as a paywall rather than a difficulty curve. The dials are
  `DECLINE_STEP` (0.07) and `DECLINE_MAX` (6); halving either moves `average`'s
  no-ads wall several stages deeper.
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
* **The endless road is a marathon, not a wall — measured, and it is a design
  question rather than a bug.** A career run to stage 110 (`scratch.depth.test.ts`,
  seed 5000, `value` strategy, ×3 claimed) has all three policies reaching 110:
  `optimal` in 124 attempts, `good` 127, `average` 138. Attempts per stage do
  climb — 1.10 through the sixties to 1.30–1.40 across 101–110 — which is the
  proof the plateaus are gone, since a pre-endless stage-100 road would have
  read the same 1.10 as stage 31–60. But nobody is stopped: at stage 110 a
  mid-skill player still pays about what they pay at stage 20. For put-down
  resistance that is arguably right; if the board fills with players parked at
  stage 200 the dial is `foeHpScale`'s post-campaign slope, NOT the density
  knobs — density is what carries the feel of a deep stage.
* One seed, one strategy, ×3 always claimed. **A non-claiming career past stage
  30 has never been measured**, and on the authored campaign declining is what
  walls `average` at stage 6 — so the expectation is that the decline lean, not
  the generator, is what bounds a deep no-ads run.
* Stages 6+ are generated rather than authored; they are now studied to stage
  110 by career and to stage 1 000 by property (`endless.test.ts`), but nothing
  past stage 5 has ever been *played* by a human end to end.
* `MonsterLab.vue` (`/#/monsters`) is kept as a lazy design bench for the
  monster cast — it costs a player who never opens it nothing.
