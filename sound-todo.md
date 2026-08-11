# Tower Siege — Sound Manifest

Audio comes from two sources, both behind one entry point: `playFx(id)` in
`src/use/useTowerAudio.ts`.

* **Samples** — a handful of `.ogg` files for cues where a recording is
  unmistakably better (fanfares, stingers, coin pickups).
* **Synthesis** — the entire combat layer is generated per event on the shared
  Web Audio context, with randomised pitch, envelope and filter sweep.

The combat layer is synthesised on purpose. A tower with a dozen turrets fires
several times a second; playing one sample over and over sounds like a machine
gun, and shipping a dozen variants of every shot would bloat the download.
Synthesised voices are never identical, cost zero bytes, and are automatically
silenced by the ad/pause gate (a suspended `AudioContext` produces silence), so
the "no game audio during an ad" guarantee covers them for free.

---

## Currently synthesised

Replacing any of these with a sample is a one-line change: add an entry to
`SAMPLE_CUES` in `useTowerAudio.ts` and drop the file in
`/public/audio/sfx/<name>.ogg`. The synth `case` then becomes dead and can be
deleted.

| Cue id | Fires when | Current synthesis | Sample would help? |
|---|---|---|---|
| `place` | A block is placed | Low triangle thud + click transient | Maybe — a real wooden knock has character |
| `shoot` | Any turret fires | Fast square chirp + bandpass noise tail | **No** — density makes variation essential |
| `impact` | A projectile hits a single target | Short filtered noise + triangle | No |
| `hit` | A melee enemy strikes a block | Low triangle thump + lowpass noise | Maybe |
| `throw` | A ranged enemy throws | Bandpass noise whoosh | Maybe |
| `frost` | A frost shot lands | Two high sines + highpass shimmer | **Yes** — glassy textures are hard to synthesise well |
| `zap` | Lightning fires | Saw drop + bright noise + sub | **Yes** — a real electrical arc is very distinctive |
| `explosion` | Splash damage / bomber / siege shell / molotov | Sub thump + wide noise + long dark tail | **Yes** — the biggest quality win available |
| `shatter` | A block is destroyed | Noise crack + two detuned wood clacks | **Yes** — per-material variants would be better still |
| `collapse` | Orphaned blocks fall | Deep 1.1 s rumble + gravel wash | **Yes** — the signature moment of the game |
| `enemyDie` | Any enemy dies | Saw drop + short noise | No |
| `waveStart` | A wave begins | Rising perfect-fifth 3-note fanfare | Maybe |
| `bossHorn` | A boss wave begins | Detuned low brass stack + rumble | **Yes** — a real horn sells the moment |

**Priority if commissioning audio:** `collapse` → `explosion` → `bossHorn` →
`zap` → `shatter` → `frost`. Those six carry the game's biggest emotional beats.

---

## Currently sampled

| Cue id | File | Volume | Notes |
|---|---|---|---|
| `waveClear` | `/public/audio/sfx/celebration-1.ogg` | 0.09 | Wave survived |
| `bossDie` | `/public/audio/sfx/celebration-3.ogg` | 0.10 | Boss defeated |
| `gateFell` | `/public/audio/sfx/lose.ogg` | 0.11 | Run over |
| `sell` | `/public/audio/sfx/coin-pickup.ogg` | 0.05 | Block sold |
| — | `/public/audio/sfx/modal-open.ogg` | 0.07 | Any `FModal` opening |
| — | `/public/audio/sfx/level-up.ogg` | 0.07 | Tech node / theme bought |
| — | `/public/audio/sfx/reward-continue.ogg` | 0.06 | Claiming a reward |
| — | `/public/audio/sfx/barricade.ogg` | 0.04 | Generic UI "nope" |
| — | `/public/audio/sfx/obstacle-hit.ogg` | 0.03 | Rejected block placement |

## Music

| Track | File | Notes |
|---|---|---|
| Trance Tunnel (default) | `/public/audio/music/trance.ogg` | Selected via Options |
| Cozy Harmony | `/public/audio/music/bg-cozy.ogg` | Selected via Options |

Both are streamed lazily on first play and registered with the global
suspend/resume registry, so tab-hide and ads pause them correctly.

**Wanted:** a third track with more percussive drive for boss waves, and ideally
a two-layer arrangement (calm during build, intense during battle) driven by
`phase`. The music layer already exposes `setMusicRate()` if a cheap version of
that is wanted — raising playback rate slightly during battle costs nothing.

---

## Unused legacy samples

These survive from the previous game in this repo and are candidates for
deletion once nothing references them:

`anchor-swap.ogg`, `dodge.ogg`, `gravity.ogg`, `happy.ogg`, `plastic-torn-1.ogg`,
`plastic-torn-2.ogg`, `shrapnel.ogg`, `stone-cut.ogg`, `win.ogg`,
`wood-cut.ogg`, `celebration-2.ogg`

`stone-cut.ogg` and `wood-cut.ogg` may be worth auditioning as `shatter`
variants before deleting — they are already the right material.

---

## Adding a sample

1. Drop `foo.ogg` in `/public/audio/sfx/`.
2. Add it to `GAMEPLAY_SFX` in `src/use/useSoundPreload.ts` so it decodes on
   the idle warm-up rather than mid-frame on first use.
3. Either call it directly with `playSound('foo', 0.06)`, or map it to a cue by
   adding `foo: ['foo', 0.06]` to `SAMPLE_CUES` in `useTowerAudio.ts`.

## Throttling

`useTowerAudio` rate-limits every combat cue (a minimum gap plus a per-window
voice cap — e.g. `shoot` is capped at 7 voices per 250 ms). Adding a sample does
not bypass this, which is what keeps a 40-turret tower from turning the mix to
mud. Tune the numbers in `THROTTLES`.

---

# Complete asset checklist

Every sound the game can make, in one list. **Nothing here is required** — the
game ships with a complete audio bed today, because the combat layer is
synthesised and the UI layer is already sampled. This is the order to commission
audio in, and what each cue has to communicate.

Priority: **P0** = the player hears it constantly, or it carries a major
emotional beat; **P1** = frequently; **P2** = occasionally; **P3** = polish.

Every file goes in `/public/audio/sfx/<name>.ogg` and must be added to
`GAMEPLAY_SFX` in `useSoundPreload.ts` (so it decodes on the idle warm-up, not
mid-frame) plus `SAMPLE_CUES` in `useTowerAudio.ts` if it replaces a synth cue.

## A. Combat — currently synthesised

| # | Cue | Fires when | Pri | Length | Must convey |
|---|---|---|---|---|---|
| A1 | `collapse` | Orphaned blocks fall | **P0** | 1.0–1.4 s | The signature disaster of the game. Deep rumble into a gravel wash; it should feel like losing something. |
| A2 | `explosion` | Splash damage, bombers, siege shells, molotovs | **P0** | 0.5–0.9 s | Weight and a long dark tail. The most-heard big sound late-game. |
| A3 | `shatter` | A block is destroyed | **P0** | 0.2–0.35 s | Material. Ideally three variants — wood / stone / metal — chosen by palette. |
| A4 | `shoot` | Any turret fires | **P0** | < 0.15 s | Keep synthesised, or ship **6+ variants**. A dozen turrets fire several times a second and one sample becomes a machine gun. |
| A5 | `bossHorn` | A boss wave begins | **P0** | 1.5–2.5 s | Dread. A real low brass stack beats anything synthesisable here. |
| A6 | `zap` | Lightning fires | P1 | 0.25–0.4 s | A real electrical arc — very distinctive, hard to fake. |
| A7 | `hit` | A melee enemy strikes a block | P1 | < 0.2 s | Dull impact on timber. Wants 3+ variants; it fires constantly. |
| A8 | `impact` | A projectile hits one target | P1 | < 0.15 s | Keep synthesised, or ship variants — same density problem as `shoot`. |
| A9 | `enemyDie` | Any enemy dies | P1 | < 0.3 s | Short and unobtrusive; it fires dozens of times a wave. |
| A10 | `frost` | A frost shot lands | P2 | 0.3–0.5 s | Glassy shimmer. Genuinely hard to synthesise well. |
| A11 | `place` | A block is placed | P2 | < 0.2 s | A wooden knock with character; the player triggers it deliberately. |
| A12 | `throw` | A ranged enemy throws, a bomber releases | P2 | < 0.25 s | Air whoosh, no impact. |
| A13 | `waveStart` | A wave begins | P2 | 0.6–1.0 s | Rising call to arms. |

**If you commission six things, commission A1, A2, A3, A5, A6, A10.** Those
carry the game's biggest beats and are the six that synthesis serves worst.

## B. Cues with no dedicated sound yet

These currently borrow a neighbouring cue. Each is a real moment that would
read better with its own voice.

| # | Suggested cue | Fires when | Borrows today | Pri | Must convey |
|---|---|---|---|---|---|
| B1 | `deflect` | An arrow bounces off the Ironclad Ram | `impact` | **P0** | A hard metallic *clang*. This is the only teaching moment the arrow immunity gets — it has to sound like "that did nothing". |
| B2 | `burn` | A block is on fire (looping bed) | *silent* | P1 | A low crackle, looped while any block burns, faded with the fire. |
| B3 | `bombWhistle` | Bomber ordnance is falling | *silent* | P1 | A falling whistle — the player's cue to look UP before it lands. |
| B4 | `firebomb` | A molotov lands | `explosion` | P1 | Glass break into a whoosh of ignition, lighter than a bomb. |
| B5 | `thorns` | A spiked wall reflects damage | `hit` | P2 | A wet, short spike puncture. |
| B6 | `siegeShot` | A standoff engine looses | `throw` | P2 | Heavy timber release — a trebuchet is not a sling. |
| B7 | `cavalryOut` | A cavalry sortie leaves the gate | `waveStart` | P2 | Hooves and a short horn. The player just spent gold; it should feel like it. |
| B8 | `allyStrike` | A lance connects | `impact` | P3 | Bright metal-on-armour, cooler than the enemy hit. |
| B9 | `allyDown` | A rider is killed | `enemyDie` | P3 | Distinct from an enemy death so losses register. |
| B10 | `ramImpact` | A battering ram connects with the Gate | `hit` | P2 | A boom you feel — the Gate is the loss condition. |
| B11 | `repair` | A repair bay patches its neighbours | *silent* | P3 | A short mechanical ratchet at the wave boundary. |
| B12 | `economyYield` | Sawmill / quarry / mint pay out | *silent* | P3 | A soft chime per resource type. |

## C. UI — already shipped

| # | Cue | File | Vol | Fires when |
|---|---|---|---|---|
| C1 | `waveClear` | `celebration-1.ogg` | 0.09 | Wave survived |
| C2 | `bossDie` | `celebration-3.ogg` | 0.10 | Boss defeated |
| C3 | `gateFell` | `lose.ogg` | 0.11 | Run over |
| C4 | `sell` | `coin-pickup.ogg` | 0.05 | Block sold |
| C5 | — | `modal-open.ogg` | 0.07 | Any `FModal` opens |
| C6 | — | `level-up.ogg` | 0.07 | Tech node bought, reinforced hand claimed, 3× coins claimed |
| C7 | — | `reward-continue.ogg` | 0.06 | Claiming a reward |
| C8 | — | `barricade.ogg` | 0.04 | Reroll used, cavalry summoned |
| C9 | — | `obstacle-hit.ogg` | 0.03 | Rejected placement, unaffordable purchase |

## D. Music

| # | Track | File | Status | Notes |
|---|---|---|---|---|
| D1 | Trance Tunnel | `/public/audio/music/trance.ogg` | shipped | Default, selectable in Options |
| D2 | Cozy Harmony | `/public/audio/music/bg-cozy.ogg` | shipped | Selectable in Options |
| D3 | Boss theme | — | **wanted, P1** | Percussive drive for the every-10th-wave boss |
| D4 | Build-phase layer | — | wanted, P2 | Calm bed; pairs with D5 |
| D5 | Battle-phase layer | — | wanted, P2 | Same key and tempo as D4, crossfaded on `phase` |

> A cheap version of D4/D5 already exists: `setMusicRate()` is exposed, so
> nudging the playback rate up during battle costs nothing and needs no new
> audio.

## E. Legacy samples — candidates for deletion

Left over from the previous game in this repo. Nothing references them.

`anchor-swap.ogg`, `dodge.ogg`, `gravity.ogg`, `happy.ogg`, `plastic-torn-1.ogg`,
`plastic-torn-2.ogg`, `shrapnel.ogg`, `win.ogg`, `celebration-2.ogg`

`stone-cut.ogg` and `wood-cut.ogg` are worth auditioning as `shatter` variants
(A3) before deleting — they are already the right material.

## Summary

| Category | Cues | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| A. Combat (synthesised today) | 13 | 5 | 4 | 4 | 0 |
| B. No dedicated sound yet | 12 | 1 | 3 | 5 | 3 |
| C. UI (shipped) | 9 | — | — | — | — |
| D. Music | 5 | 0 | 1 | 2 | 0 |
| **Total optional** | **30** | **6** | **8** | **11** | **3** |

Everything in A already makes a sound today. Everything in B is either silent or
borrowing a neighbour — **B1 `deflect` is the one genuine gap**, because it is
the only feedback the arrow-immunity rule has.
