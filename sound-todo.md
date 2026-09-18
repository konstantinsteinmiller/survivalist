# Sound todo — drop-in manifest

Survivalist's combat layer is **synthesised at runtime** (`src/use/useGameAudio.ts`):
shots, impacts, gate ticks, bursts and slams are built from oscillators and
filtered noise, with per-event pitch and envelope jitter. That is deliberate — a
crowd of forty fires ~46 shots a second, and no sample survives that repetition
without turning into a machine-gun jam. It also costs zero download.

Only the cues where a *recorded* sound is unmistakably better are samples. Those
are listed first, and every one of them can be replaced by dropping a file at
the exact path.

Format for everything: **OGG Vorbis**, 44.1 kHz mono, −16 LUFS, trimmed to zero
crossings, no baked-in reverb tail longer than the entry says.

## Samples in use today (drop a file to replace)

| Path | Length | Cue | Fired when |
| --- | --- | --- | --- |
| `public/audio/sfx/coin-pickup.ogg` | ≤ 0.3 s | `coin` | A coin is magneted into the crowd. Must survive being played 6× in 300 ms. |
| `public/audio/sfx/celebration-1.ogg` | ≤ 1.5 s | `stageClear` | Stage cleared, under the result ribbon. |
| `public/audio/sfx/celebration-3.ogg` | ≤ 2.0 s | `bossDie` | Boss death — layered OVER a synthesised sub-blast, so leave headroom. |
| `public/audio/sfx/lose.ogg` | ≤ 1.5 s | `wipe` | Squad wiped out. Should land as a fall, not a joke. |
| `public/audio/sfx/level-up.ogg` | ≤ 0.8 s | `damageUp` | A supply crate broke and every survivor got stronger. |
| `public/audio/sfx/obstacle-hit.ogg` | ≤ 0.25 s | UI reject | Tapping an upgrade you cannot afford. |
| `public/audio/sfx/modal-open.ogg` | ≤ 0.4 s | UI | Any panel opening. |

## Music

| Path | Length | Notes |
| --- | --- | --- |
| `public/audio/music/trance.ogg` | 2–4 min loop | Default track. Seamless loop; the engine drives `playbackRate` (roadmap #14 ties it to squad size), so avoid anything that breaks when pitched ±15 %. |
| `public/audio/music/bg-cozy.ogg` | 2–4 min loop | Alternate track, selectable in Options. |

## Synthesised cues you can replace (all in `useGameAudio.ts`)

Every one of these is generated per event. Dropping a sample in is a two-line
change (see *How to wire a new sample* below) — but read the note first, because
several of them are doing something a flat sample cannot.

| cue | what it is | note |
| --- | --- | --- |
| `gateTick` | the `+1` on a pumping gate | **pitch climbs with the gate's value** on a pentatonic ladder. A sample must be a single dry hit with no tail so it can be pitch-shifted the same way. |
| `gatePass` / `gateMul` | the reward chord when a door pays | swells with the size of the haul. |
| `gateTrap` | a `÷N` door taking your crowd | descending minor cluster; deliberately unpleasant. |
| `gateDismiss` | every door you did NOT take, being destroyed | fires 1–2× per bank with `power` from the shockwave's travel distance, so a three-leaf bank recedes. Must sit UNDER the reward chord it plays against — this is the one to be careful with. |
| `rateUp` / `damageUp` | the two crate types | must be audibly different; they are a choice. |
| `divider` | survivors dying on a pillar | metallic first, bloody second: the player has to know it was not an enemy. |
| `eliteSpawn` / `eliteDie` | a miniboss arriving / dying | short dark horn, then a two-thirds-scale boss chord. |
| `eliteSweep` | a miniboss's arc across the road | `power` carries the archetype's weight: `1` is a brute (low thump dragging a long dust tail), `0` a hound (short bright crack). Both sit deliberately ABOVE `bossSlam`'s sub — an elite sweeping during a boss fight must never be mistaken for the boss's own swing — and both sweep the filter downward across the cue rather than decaying in place, because the sound has to travel the way the arc did. A sample must be a **moving** noise, not a point impact. |
| `bossGuard` | a round bouncing off the boss's phase shield | fires at the densest rate in the game (a thousand-strong squad, point blank) and is throttled hard. Pitched ABOVE `bossHit` on purpose — the player has to hear their fire stop landing without looking away from the telegraph. |
| `bossRage` | the boss planting at 66 % / 33 % health | the one beat that says the last third is not the same fight. Rising horn under struck metal; a sample would win here. |
| `bossSlam` | the boss's ground slam | pairs with the screen shake. Grows with the boss's rage — a late swing is wider and lands sooner than the first. |
| `windGather` / `windHurl` | the meteor being gathered over the boss's head, then thrown | fired as BEATS on the cast's own clock (`game/bossWindup.ts`), not at a fixed time: the gather swells for exactly the pose's gather (`seconds`, ~0.38 s) and stops on the throw; the hurl is a grunt + whoosh off the hands and then a **falling whistle over the rock's flight** that fades just before the `bossSlam` lands it. A sample must be split the same way, and the whistle has to be stretchable to the flight time. |
| `windCoil` / `bossCharge` | the lane charge: the coil, then the dash | two beats — a growl-and-rumble that swells for the whole crouch (1.1–1.5 s) with two dust scrapes in it, then a rising rasp for exactly the 0.38 s dash. Both lengths come from the cast, so a coil sample must loop or stretch. |
| `windRise` / `windDrop` | the ring-of-fire stomp: the body rising, then falling | a slower, quieter `bossRage`-shaped horn under the rise, then a short downward rush that runs into the slam. |
| `windWhet` / `windStrike` | the claw rake: claws raised, then swung | two blade-on-blade scrapes and a thin ring, then a falling hiss one beat before the slam. Must stay BRIGHT — the rake is told from the meteor by ear. |
| `windHeal` / `windBolt` / `windZap` | the healer: drawing a heal in, charging a bolt, throwing it | the heal's gather rises INTO `bossHeal`'s first note (420 Hz); the bolt is an electric buzz with sparks, cut off by the zap on the frame the round leaves. |
| `windCall` | the summoner raising its arms before a wave | a low two-voice drone that beats like breath, swelling into the wave's `eliteSpawn`. |

## Worth recording (would beat the synth)

| Suggested path | Length | Cue | Why a sample would win |
| --- | --- | --- | --- |
| `public/audio/sfx/gate-tick.ogg` | ≤ 0.15 s | `gateTick` | The signature sound. The synth plays a rising pentatonic ladder (pitch climbs with the gate's value) — a sampled bell/marimba hit, pitch-shifted the same way, would sound far richer. **Must be a single dry hit with no tail**, or the ladder mushes. |
| `public/audio/sfx/gate-pass.ogg` | ≤ 1.0 s | `gatePass` | Crowd-swell whoosh + choir hit for the moment the squad doubles. Layer, don't replace, the synth chord. |
| `public/audio/sfx/crowd-run.ogg` | 2 s loop | ambience | A loop of many running footsteps, volume driven by squad size. Nothing in the mix currently says "there are a hundred people here". |
| `public/audio/sfx/unit-lost-1..3.ogg` | ≤ 0.4 s | `unitLost` | Three short human grunts/cries, randomised. The synth version is a falling saw — it works, but real voices are what make the crowd read as people. |
| `public/audio/sfx/boss-roar.ogg` | ≤ 1.5 s | boss entry | There is currently NO boss-entry cue at all — the boss simply walks on. This is the biggest single hole in the mix. |
| `public/audio/sfx/boss-hurl.ogg` | ≤ 0.3 s + stretchable tail | `windHurl` | The meteor leaving the boss's hands. A real heave-grunt and a rock whooshing off would sell the throw the animation now shows. Keep the synthesised flight whistle under it — its length is the flight time, which a fixed sample cannot know. |
| `public/audio/sfx/boss-coil.ogg` | 1.5 s, loopable | `windCoil` | A beast's growl building before the dash. The synth's sub-growl works; a recorded snarl rising to a roar would make the charge unmistakable. Must be trimmable to the coil length (1.1–1.5 s). |
| `public/audio/sfx/boss-rage.ogg` | ≤ 1.2 s | `bossRage` | The phase turn at 66 % and 33 % health. The synth builds a rising horn under struck metal, and it works, but this is the game's biggest dramatic beat and a real roar-plus-impact would sell it far better. Layer over the synth rather than replacing it — the low end is doing the screen-shake pairing. |

## How to wire a new sample

1. Drop the file in `public/audio/sfx/`.
2. Add it to `SAMPLE_CUES` in `src/use/useGameAudio.ts` as
   `cueName: ['file-basename', volumeRatio]` — the synth branch for that cue is
   then skipped automatically.
3. Add the basename to `GAMEPLAY_SFX` in `src/use/useSoundPreload.ts` so it is
   decoded on an idle slot after first paint instead of stuttering on first play.

## Audio rules this project already enforces

* Nothing plays while an ad is on screen: the shared AudioContext is suspended
  by the pause gate, and one-shots are hard-stopped (`killOneShotSfx`).
* Music never starts *under* an ad — it resumes only after the gate clears.
* On mobile the mute button is a hard silence toggle, not a volume change,
  because the OS volume rocker owns the device level.
