# Survivalist — cutscenes

## 0. What this document is

The game has no fiction. It has a superb loop and a cast with real character —
a fungal undead, a bramble treant, a bone crow "carrying something gold it did
not find lying around" — and a first-time player meets none of it. They are
dropped onto a grey road with three hooded people and asked to steer.

This document specifies the **intro cutscene**, and the minimum world it needs
to stand on. It is written to be built, not admired: every shot below names the
world coordinates it flies through, the assets it reuses, and the code it hangs
off.

The governing constraint is on the first page because it outranks everything
else in here:

> **This cutscene sits in front of the most-measured ten seconds of the game.**
> The Poki fit test ended 64 % of sessions inside two minutes. A non-interactive
> intro before first input is exactly the shape of thing that makes that number
> worse. Every decision below is therefore also a decision about how *little*
> this costs: it runs over the live scene, it loads nothing extra, it plays once
> per player, and it is skippable from the first frame **by the same gesture
> that starts the game**.

If any of that is traded away, cut the cutscene instead.

---

## 1. The world, in one page

Nothing here is invented to be pretty. Every line is a restatement of a rule the
game already enforces, which is what makes it survive contact with the loop.

**The road is the only way out.** It runs one direction, it does not fork, and
standing still on it is how you die. This is `stageSpeed()` — the squad runs on
its own and always forward.

**You start with three.** Not an army, not a chosen one. Three people who got
out. (`squadBaseAt(1)` = 3.)

**Everyone else is still out there.** Some are pinned behind the arches, some
are in cages. This is the entire fiction, and it is the entire mechanic:

* **The arches** (`gates`) are old waystations. People are sheltering behind
  them and will not break cover into open road. Your squad's fire is not
  attacking the arch — it is **covering fire**, and the number climbing on the
  gate is the number of people who have decided to run for it while you keep
  the road clear. That is why a `+1` climbs by one every half second of
  *sustained* fire (`GATE_TICK_MS`), why it bleeds back after 400 ms of silence
  (they stop and go back), and why running through claims one arch and destroys
  the others (`claimBank()` — you got one group out; the others stayed, and
  the thing at the end of the road heard the shooting).
* **The hostile doors** are the same arches gone wrong. A `−N` is a gate the
  wardens have already found — shoot it and you are shooting into the place
  people are hiding, which is why aiming at the door you are *not* taking
  makes the bill worse. A `÷N` is a collapse.
* **The cages** hold the ones already taken. They are stacked beside the road
  like luggage, because to the thing that put them there that is what they are.
  Break one and the people inside **walk** to you and fall in
  (`CAGE_JOIN_SPEED`, `cageSurvivors()`).
* **The elites** — the crowned miniatures who plant in the road and hold it —
  are the ones who did the taking, and each of them stands guard on **its own
  cage**, parked off the shoulder past the rail where nothing can shoot it
  (`Cage.sealed`, `REWARD_CAGE_X`). It cannot be broken open and the rocket
  cannot even acquire it; the bars come off **only** when the elite beside it
  dies (`minibossCageHold`). That is what makes an elite worth stopping for
  rather than outlasting — you are not killing it for coins, you are killing
  it for the people it is standing over. The tutorial's elite, which the
  grenade lesson hands over half-dead, pays the least of any on the road
  (`MINIBOSS_CAGE_TUTORIAL`), because a gift is not a rescue.
* **The wardens** are the cast: creeps, husks, hounds, brutes, flyers. They are
  not an army and they have no plan. They are what the road grew.
* **The crowned one** is at the end of every stage. Stage 1's is a Grumpling at
  boss size wearing the crown the elites wear in miniature (`bossDesign(1)`,
  `ART_CATALOGUE.ui.crown`) — "all head, tiny body, permanently unimpressed",
  scaled until that stops being funny.
* **…and behind every one of them, a cage that cannot be broken.** It holds the
  squad the player opens the NEXT stage with, and it opens on the far side of the
  win screen: the survivors walk out of it and become the new crowd
  (`Cage.warden`, `StageEntry.cage`). This is what closes the loop. A career is
  not a sequence of unrelated roads — it is one continuous rescue, and the number
  the shop has been selling all along (`startSquadAt`) is now a number of people
  the player can SEE in a box before they have earned them.

**Why you go toward it rather than away.** Because the road runs one way, and
because everything you are trying to get back is between you and it — including
the people in the cage you can see from the start line. The player is not on a
quest. They are walking the length of a road picking up everyone they can carry,
and the thing at the end is simply what is standing in front of the rest.

That is the whole world. It needs no more, and one paragraph of it is ever said
out loud.

---

## 2. The intro cutscene — **"THREE LEFT"**

### 2.1 The one idea

> **The cutscene is the stage, flown backwards.**

It is not a cinematic in a separate space. The camera starts at stage 1's arena
and falls down the real road to the real start line (y ≈ 0),
passing the real props at their real coordinates. When the player then runs
*forward*, they are retracing a route they have already been shown. The cage
they watched at second five is a cage they physically reach at ~50 seconds.

Everything good about this intro comes from that one decision:

* it costs **no new art and no new level** — it reads `track.events` for stage 1;
* it teaches the shape of a stage without a single word of tutorial;
* it makes the road feel **long**, which is the one thing a vertical runner's
  camera can never show during play, because during play the camera is always
  pinned 72 % down the screen to the crowd;
* and it converts "why am I going that way" into "because I *saw* what is that
  way".

### 2.2 The light rule

One rule carries the whole look and it is a gradient, not an asset.

**The boss is the only light source on the road.** Stage 1's sky is already a
deep blue-violet night (`SKIES[0]`: `#1b2a4a` → `#4a3d6b`, haze `#6b5a9c`). For
the cutscene, a warm bloom sits behind the arena — the crowned one's own glow,
in the amber the game reserves for "there is something to take here"
(`#ffcd00`/`#f7a000`).

As the camera falls away from the arena, that bloom **shrinks toward the top of
the frame** until, at the start line, it is a single warm point on the horizon.

That point is exactly where the player is about to run. The last frame of the
cutscene is the first frame of the game, and it contains a small distant light
that the player now understands is a thing with a crown on it.

### 2.3 Shot list

Total: **9.2 s**, with a 6.4 s cut-down defined in §2.6. Times are from the
first frame of the cutscene. `camY` is the camera's world-y (see
`worldToScreenY`); the camera shows ~13.7 units of road at a time.

---

#### SHOT 1 — THE CROWNED ONE, AND WHAT IT IS STANDING OVER · 0.0 → 2.2 s · `camY` 320 → 316

**Frame.** The arena, at the FIGHT's geometry rather than the spawn's: the boss
on the ground it walks down to (`arenaY + 3.8`), and past its shoulder the
**warden cage** (`arenaY + 12.8`, off the centre line) with the next stage's
squad inside, lit from within — up at the top of the frame with its lid cut by
the edge, which is precisely where it sits during the real fight.

That composition is the whole game in one frame — a monster, and the people it
is holding — which is why the shot needs no words.

**Camera.** A slow 4-unit push *away* (`camY` 320 → 316), so the silhouette
subtly shrinks. Almost imperceptible. It is the first millimetre of the retreat
the whole cutscene is about — and it lands on **316, the arena line**, which is
the camera the real fight uses. The last frame of shot 1 is a rehearsal of a
frame the player has to earn.

> Three placements had to be measured rather than guessed. The camera opens at
> **320, not at `bossY` (328)**: `bossY` is where the live boss walks IN from,
> eight units above the ground it stands on, and a camera parked there shows an
> empty arena. The cage stands **off the centre line** (`WARDEN_CAGE_X`),
> because the boss stands on it — centred, it was completely hidden behind the
> sprite and the opening shot was a monster in front of nothing.
>
> And the cage's LEAD was wrong for a while in a way a still frame hides. It sat
> at `arenaY + 7`, reasoned off the position the boss settles at — but the boss
> SPAWNS at `arenaY + 12` and takes ten seconds to walk down from there, so for
> the opening of every real fight the cage was in FRONT of the thing guarding
> it. `WARDEN_CAGE_LEAD` is now **12.8**: behind the boss on the frame it spawns,
> and at the top edge of the fourteen units of road any viewport actually shows.
> See the constant for the measurement table.

**Motion.** The boss does not move. It is asleep, or bored. One breath cycle —
the shoulders rise and fall once over the full 2.2 s.

**Audio.** Sub drone, one note, very low. At 1.6 s a single struck bell, far
away, with a long tail. No music yet.

**Craft note.** The silhouette is not a stylistic flourish, it is also the
budget: a backlit boss needs the monster rig's *shape*, not its painted strip,
so shot 1 does not force the boss's art into the boot path ahead of wave-1
loading (`artPreload.ts`). Cinematography and preload agree here, which is the
only reason this shot is affordable.

---

#### SHOT 2 — THE ROAD · 2.2 → 3.9 s · `camY` 316 → 224 (92 units)

**Frame.** The camera falls. Ninety-two units of road in 1.7 s — roughly **11×**
the squad's own run speed (`stageSpeed(1)` = 5.1 u/s).

**What goes past.** Real stage-1 furniture at its real y: the closing bank's
arches (304), a crate row (288), the second elite's ground (272), wardens in the
lane (252), an arch at 240. They **do not react** — the camera is not the crowd,
and nothing on this road cares about a camera.

**Camera.** Ease *in*: accelerate over ~0.4 s, hold, then decelerate hard into
the stop. The deceleration is the shot — arriving is what makes the cage land.

**Motion.** Vertical streaks on the rails and the lane lines, strengthening with
speed. The sky **timelapses**: the haze band shifts and the cloud layer smears,
so the flight reads as time passing and not merely as distance.

**Audio.** A rising doppler wash. The bell's tail bends downward as we leave it.

---

#### SHOT 3 — THE CAGE · 3.9 → 5.9 s · `camY` 224, held (framing y = 230)

**Frame.** Dead stop on the stage-1 cage at y = 230 — the 12-HP one, the bigger
of the two on the road. It sits on the left shoulder (`−CAGE_DETOUR_X`) exactly
where it will be during play.

**What is in it.** People. Drawn with the same survivor rig as the squad, which
means they are drawn **from behind** — hoods, shoulders, packs — and that is
correct and better than a face: they are turned away, looking up the road at the
place they were taken from. One of them has a hand on the bars.

A single warden stands beside the cage with its back to it, entirely
uninterested. It is not guarding them. It is just also there.

**Camera.** Absolutely still for the full 2 s. Every other shot in this cutscene
moves; this one does not, and that is the whole reason it works.

**Audio.** The wash drops out completely. Iron creaking. One held breath of a
sub note underneath. **The quietest two seconds in the game.**

**Craft note.** This is the only beat that has to land emotionally, so it gets
the two things emotion needs and nothing else: silence and stillness. Resist
every temptation to put a prompt, a counter or a label on it.

---

#### SHOT 4 — HOW FAR · 5.9 → 8.0 s · `camY` 230 → 0 (230 units)

**Frame.** The camera falls again, and this time it does not stop: 230 units in
2.1 s, ~**21×** run speed. Twice as fast as shot 2 and two and a half times as
far.

**What goes past**, smeared, at its real y: arches at 196 and 148, crate rows at
210, 166 and 86, wardens standing in the lane at 180, 157, 124 and 77, the first
elite's ground at 120, and finally the opening arch at 9 — the one the player
will be shooting forty seconds from now.

Two of those wardens (77, 157) are **strays** — the lone creeps that stand in
the stage's empty stretches. Nothing about them is special to the camera: during
the cutscene the simulation is not stepped, so they are motionless bodies the
flight tears past, which is all this shot needs them to be.

And — the point of the shot — **the second cage at y = 98**. It is on screen for
about a third of a second. It does not need longer. The player has already been
taught what a cage is; passing a second one at speed says *there are more of
these* without a word, a counter, or a number.

> No barricades go past, because stage 1 has none: `earlyBarricadeKeep(1)`
> strips them before the road is built (verified — the stage ships **0**). Do
> not write one into a storyboard frame.

**Camera.** Ease out only. It starts already fast, gains a little, then brakes
across the final 25 units into the resting frame.

**Sky.** The boss's bloom shrinks behind us and settles as a single warm point
at the top of the frame. The timelapse resolves: the smear slows into the
ordinary drifting sky the game plays under.

**Audio.** The wash returns, higher, and **resolves on the downbeat of the run's
own music** — the track that will play for the next forty seconds starts here,
so the cutscene hands over to gameplay rather than stopping and being replaced.

---

#### SHOT 5 — THREE LEFT · 8.0 → 9.2 s · `camY` 0, settled

**Frame.** The camera settles into its playing position — the crowd 72 % down
the screen (`CROWD_SCREEN_Y`), which is the exact frame the game will hold for
the rest of the session. Three survivors stand on an empty road with their backs
to us.

**The cut that does the work.** We have just spent eight seconds looking at a
crowned thing, a cage of people, and 320 units of road. Now: three. The scale
contrast is the entire pitch of the game and it is delivered without a syllable.

**Motion.** The road does **not** start moving. `steerOnly` is already true — the
world is held and the squad already answers the thumb, which is the existing
opening behaviour (`useTutorialGate`, `TutorialOverlay`).

**Hand-off.** At 8.6 s the tutorial lightbox fades in over this frame. From 9.2 s
the cutscene is over and the existing movement tutorial owns the screen, exactly
as it does today. Nothing about that flow changes.

**Audio.** Music continues uninterrupted into gameplay. No sting, no button.

### 2.4 Text

**Three lines. Sixty characters total. All optional.**

The cutscene is designed to work with the sound off and the text stripped, and
should be shipped that way to any locale that has not been checked. Each line is
one card, centred, in the game's display face, fading in over ~250 ms and out
over ~250 ms, never overlapping a subject:

| At | Over | English | Key |
| --- | --- | --- | --- |
| 0.6 s | the boss's silhouette | *It took everyone.* | `intro.took` |
| 4.4 s | beside the cage, not over it | *They are still alive.* | `intro.alive` |
| 8.4 s | above the three | *Go and get them.* | `intro.go` |

Rules:

* **No proper nouns.** Nothing is named — not the boss, not the road, not the
  world. Naming things is what makes an intro feel like homework.
* **No mechanics.** The tutorial teaches steering 600 ms later; this is not the
  place.
* Keys go in `en.ts` first and then to **every one of the 21 locale files**
  (`tests/i18nParity.test.ts` enforces it). All three lines are short enough to
  survive German and Ukrainian at 320 px without wrapping — the longest is
  three words.
* Card 3 must clear the tutorial ring. It sits above the squad; the ring is
  drawn on the squad.

### 2.5 Skipping — a button, bottom-right

**A labelled SKIP button in the bottom-right corner, on every device.**
`CutsceneSkip.vue`. It is the only interactive thing on screen while the
cutscene runs, and everywhere that is *not* it is safe to touch.

> ⚠ This reverses an earlier draft of this section, which specified
> "press anywhere, no button" on the argument that the skip gesture is also the
> tutorial gesture, so impatience routes into competence. That is a nice
> argument and it loses to a simpler one: **a player who does not know they can
> leave is a player who feels trapped**, and nine seconds of feeling trapped at
> second zero is exactly what this cutscene was built not to cost. A visible
> affordance beats a clever invisible one. The reversal also buys the opposite
> promise, which matters just as much — a player who *wants* to watch can rest a
> thumb on the screen without ending the thing they are watching.

Shape and placement:

* **A caption plus a glyph**, not a glyph alone. This is the one control in the
  game whose meaning cannot be inferred from its position, and "skip" has no
  universally-read mark. `intro.skip` is one word in every locale that has one.
* Pinned clear of `env(safe-area-inset-*)`, because the bottom-right corner is
  where a phone puts its home indicator. Measured: 80×44 px on a 420 px phone,
  95×44 on desktop — past the 44 px touch floor at both.
* It **fades in at 700 ms**, not on frame one. The first thing the eye lands on
  should be the crowned one, not a button.
* The HUD is `v-if`'d away for the duration, which is what frees the corner —
  the shop button lives there during play.

A skip must **not** be counted as tutorial movement progress
(`TUTORIAL_MOVE_MS`): the player has not performed the gesture, and crediting it
would let a tap skip the lesson entirely.

### 2.6 When it plays, and the 6.4 s cut-down

* **First session only.** Gated on its own key (`ts_intro_seen`), written the
  moment the cutscene *starts*, not when it ends — a player who closes the tab
  four seconds in has seen the boss and the cage, and showing it again on their
  next visit is a worse experience than not showing it.
* **Never on a retry, never on stage 2+, never after a cloud restore** that shows
  any progress at all (`bestStage > 0` suppresses it).
* Re-watchable from Options, for the ~1 % who want it and for QA.

**The cut-down.** If measurement says 9.2 s is too long — and the first thing to
measure is the funnel from load to first input — the shot list collapses to
**6.4 s** without a rewrite:

| Shot | Full | Cut |
| --- | --- | --- |
| 1 Boss | 2.2 s | 1.4 s |
| 2 Road | 1.7 s | 1.2 s |
| 3 Cage | 2.0 s | **2.0 s — never cut** |
| 4 How far | 2.1 s | 1.4 s |
| 5 Three | 1.2 s | 0.4 s |

The cage hold is the only shot that cannot be shortened. Everything else in the
cutscene is transport.

---

## 3. Implementation notes

These are the parts that will bite, written against the code as it stands.

### 3.1 The camera is one number

`worldToScreenY(wy) = viewH * CROWD_SCREEN_Y − (wy − camY) * scale`, and `camY`
is assigned once per frame from the crowd anchor. A cutscene is therefore an
**alternative source for `camY`** for nine seconds, and nothing else. There is no
second camera to write.

### 3.2 ⚠ The road is streamed, so flying the camera shows an empty stage

This is the trap, and it is not obvious. Entities are spawned as the **crowd**
advances; during the cutscene the crowd has not moved, so the boss, the cages and
every warden up the road **do not exist yet**. Moving `camY` alone flies over 320
units of bare lane.

Three ways out, and only one of them is right:

1. **Stream off `camY` instead of `anchorY` for the duration.** Tempting — it
   reuses everything. It is wrong: it spawns the whole of stage 1 (foes included,
   which immediately start hunting an anchor that is 300 units away), leaves the
   world dirty for the run that follows, and makes the cutscene's correctness
   depend on the sim's spawn order.
2. **Pre-spawn the stage, then reset.** Cheaper to write, but the reset has to be
   perfect or the player starts stage 1 in a world that has already been partly
   simulated.
3. ✅ **Draw the cutscene from the track, not from the world.** `buildTrack(1)`
   is already in hand; the cutscene reads `track.events` in a y-window around
   `camY` and paints props with the existing helpers. Nothing is spawned, nothing
   is reset, and the cutscene cannot corrupt the run.

Option 3 also buys the freedom the shot list assumes: wardens that ignore the
camera, a boss that breathes once and does nothing, a cage with people in it that
are not squad members. Those are *presentation*, and presentation should not have
to be talked out of the simulation.

### 3.3 Assets: none

Everything on screen already exists and is already baked for stage 1:

| Shot needs | Comes from |
| --- | --- |
| The boss silhouette + crown | `bossDesign(1)` (`grumpling` at boss scale), `ui/crown` |
| Wardens in the lane | `stageDesigns(1)` — already baked before stage 1 starts |
| Cages | the `Cage` drawable, `CAGE_R` |
| People in the cage | the survivor rig, from behind |
| Arches, crates | `gate/frame-*`, `prop/*` |
| Sky, ridges, haze | `SKIES[0]`, `bg/ridge-far`, `bg/ridge-near` |
| The bloom | a radial gradient. Not an asset. |

The only new art the cutscene could ever want is a painted key frame of the
crowned one, and it explicitly does not want one: see the silhouette note in
shot 1.

### 3.4 Portal and lifecycle

* **`gameplayStart` must not fire for the cutscene.** The bracket opens when the
  road starts moving, which is after the tutorial, exactly as now
  (`useGameplayLifecycle`, `isGameplayLive`). A cutscene inside the bracket
  inflates playtime with time nobody played, and Poki grades that.
* **The tutorial bail-out clock must not run during it.** `TUTORIAL_BAILOUT_MS`
  counts from first input rather than from wall time — which is already correct
  and is correct *for this reason too*; do not "fix" it into a wall clock.
* **Mute must hold.** If the player is muted, or an ad is showing, or the tab is
  hidden, the cutscene's audio obeys the same gate everything else does.
* **A first-load interstitial, if one is configured, plays BEFORE the cutscene**
  and never inside it.

### 3.5 Degradation

| Condition | Behaviour |
| --- | --- |
| `prefers-reduced-motion` | No streaks, no sky smear, no speed ramp. The camera **cuts** between the four positions instead of flying, holding each for its shot's duration. Same story, no motion. |
| `minFx` / low quality tier | Streaks off, bloom is a flat radial instead of a layered one, wardens along the flight are culled to the nearest few. |
| Slow device (frame time over budget for 500 ms) | The cutscene is **abandoned**, not degraded — fade to shot 5 and start the tutorial. A stuttering intro is worse than none, and a device that cannot fly a camera cannot run the game either. |
| Tab hidden mid-cutscene | Pause on the current frame; resume on return. Do not let it run down behind a hidden tab and be over when the player looks back. |

### 3.6 What the build changed, and why

Five things came out of getting this on screen that the design above could not
have known. All five are in the code with their reasoning; they are collected
here so the doc and the game agree.

1. **The HUD comes off.** A stage number, a squad of one, a wallet of zero, a
   chest and four skill buttons over a cinematic is not a cinematic, it is a
   screenshot of a paused game. `div.scene__hud(v-if="!introRunning")`.
2. **The boss is scaled, not the camera.** The playing camera fits the LANE, so
   a 2.5-unit boss is about a fifth of the frame and reads as a small imp in an
   empty road. Zooming is the film answer and is not available: every baked
   strip, the lane tile and the backdrop rasterise at `scale`, so moving it
   mid-flight is a full re-bake per frame on a game that is already fill-bound.
   The cutscene's boss is a prop that will never take a swing, so it is simply
   built at `scale: 4.4`.
3. **The cage shot is framed, not parked.** `worldToScreenY` puts the camera's
   own y at 72 % down the screen, so stopping *on* the cage puts it where the
   squad usually stands and hands the middle of the frame to the bank ten units
   further up — the first cut was a cage in the corner and `×1.6` in the centre.
   `CUTSCENE_CAGE_CAM_Y` stops six units short. **And the cage's two numbers —
   what it pays, what it costs — are suppressed for the duration**, because a
   payout floating over the one beat that has to land emotionally turns the
   people in the box back into a pickup.
4. **The clock waits for the splash.** The scene mounts and boots *behind* the
   loading screen, so without a handshake the opening shot was two-thirds over
   before anyone could see it. The cutscene holds on its first frame — fully
   drawn — until `notifyIntroReady()`, so what the player sees is the splash
   fading off a boss that is already standing there. There is a 2.5 s fallback.
5. **The scene decides, the loader only pre-builds.** Nothing orders the
   loader's last step against the scene mounting, and when the scene won the
   race it read "no intro" and opened stage 1 silently. `armIntro()` is a pure
   predicate and both callers ask it.

### 3.7 Test hooks

Mirroring how the rest of this repo pins behaviour, the cutscene should ship with
assertions that are cheap and non-visual:

* the shot table sums to its stated duration, and the cage hold is ≥ 2.0 s in
  both the full and the cut-down variant;
* `camY` is monotonically non-increasing across the whole timeline (it never
  flies back up the road);
* every `camY` waypoint exists on stage 1's built track — the boss at `bossY`,
  a cage at y = 230, a second at y = 98 — so a re-cut of stage 1 that moves them
  fails here rather than shipping a camera that stops at bare road;
* the intro key suppresses replay, and `bestStage > 0` suppresses it too;
* no `gameplayStart` is emitted before the tutorial completes.

---

## 4. What was considered and rejected

**A separate cinematic scene.** A hand-built diorama with its own camera and its
own assets. Rejected: it costs art, a chunk, and load time, and it breaks the one
idea in §2.1 — the intro is valuable *because* it is the real road.

**Voice-over / a narrator.** Rejected on localisation alone (21 languages), and
on tone: this cast does not support a solemn narrator, and a wry one would
undercut the cage.

**Showing a survivor's face.** Rejected. The game's art direction is survivors
from behind — "the only angle a vertical runner ever shows, and the only one that
reads at 30 px". A single front-facing face in the intro would be the only one in
the game and would read as borrowed.

**A counter ticking up as cages go past** ("11 held… 26 held…"). Genuinely
tempting: it would explain crowd growth. Rejected because it turns shot 4 into a
readout, and because shot 3 has already said it better by saying nothing.

**Opening on the three survivors and pushing up the road to the boss.** The
mirror of the chosen structure, and weaker: it ends on the monster, so the last
thing the player feels before being handed the controls is threat rather than
purpose. Ending on the three, with the boss reduced to a point of light at the
top of the frame, ends on *distance to be closed* — which is the verb.

**A stinger: cutting back to the boss opening its eye on the last frame.**
Withheld rather than rejected — it is a good beat and it violates the specified
boss → cage → start structure. Worth a variant test if the intro is ever A/B'd.

---

## 5. Future cutscenes, on the same rig

Once `camY` can be driven from a shot list and the track can be drawn without the
world, the rig is general. Slots that would earn one, in order of value:

1. **First boss approach (stage 1, once).** 1.5 s. The camera lifts off the crowd
   and cranes up to the arena as the player runs in — the payoff for the intro's
   promise, on the same road, in the same session.
2. **First cage break (once).** 1.0 s. A slow-motion beat on the bars coming
   apart and the first rescued survivor turning to run toward the crowd. This is
   the game's best mechanic and it currently goes by in six frames.
3. **Stage 4 — the first weapon box.** 1.2 s. The lid, the lever, the gun.
4. **A wipe's last survivor.** 0.8 s, and only on a stage the player has lost
   twice. Handle with care: a cutscene on a loss is a cutscene about being
   punished.

Everything in that list obeys the same law as the intro: **short, skippable,
once, and made of things the game already draws.**

---

## Appendix — stage 1 geometry, verified

Every coordinate in §2.3 was read off `buildTrack(1)` rather than estimated. If a
re-cut of stage 1 moves any of these, the shot list moves with it — and §3.6's
waypoint test is what will say so.

| Fact | Value | Source |
| --- | --- | --- |
| Road length | **320** units | `track.length` |
| Arena line | **316** | `track.arenaY` (`length − 4`) |
| Boss | **328** | `track.bossY` (`length + 8`); spawns there and walks in |
| Boss design | **`grumpling`** at boss scale | `bossDesign(1)` |
| Run speed | **5.1 u/s** | `stageSpeed(1)` |
| Camera window | ~**13.7** units | `VIEW_HEIGHT`, `CROWD_SCREEN_Y` = 0.72 |
| Cage A | **y 230**, left shoulder, 12 HP | `stageOne()` — shot 3 |
| Cage B | **y 98**, left shoulder, 4 HP | `stageOne()` — shot 4 |
| Elite cages | **y 120**, **y 272**, `x +5.4`, sealed | `miniboss()` — off the road, opens only on the kill |
| Barricades on stage 1 | **0** | `earlyBarricadeKeep(1)` |
| Elites | **120.08**, **271.76** | `placeMinibosses()` |
| Warden cage | **y 328.8** (`arenaY + 12.8`), `x −2.4` | `placeWardenCage()` — behind the boss, at the top edge |

Everything on the road, in order, for storyboarding:

```
   9 arch  ·  19 coins ·  27 crates ·  35 crates ·  39 warden
  55 arch  ·  68 coins ·  77 stray  ·  86 crates ·  98 CAGE B
 120 ELITE + SEALED CAGE  · 124 warden · 136 coins · 148 arch · 157 stray
 166 crates· 180 warden · 196 arch  · 210 crates · 222 coins
 230 CAGE A· 240 arch   · 252 warden· 272 ELITE + SEALED CAGE · 288 crates
 304 arch  · 316 arena  · 328 BOSS
```

Camera path: **320 → 316** (shot 1) → **224** (shot 2) → held (shot 3) → **0**
(shot 4) → settled (shot 5). Monotonically down the road, 320 units total.
