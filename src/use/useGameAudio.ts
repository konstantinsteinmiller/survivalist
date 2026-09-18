import { getAudioContext, isAudioSuspended } from '@/use/useAssets'
import { isMobileAudioMuted } from '@/use/useMobileAudioMute'
import useUser from '@/use/useUser'
import useSounds from '@/use/useSound'

/**
 * ─── Survivalist audio ──────────────────────────────────────────────────────
 *
 * Two sources, one entry point (`playFx`):
 *
 *   SAMPLES   — where a recorded sound is unmistakably better: coin pickup,
 *               stage-clear fanfare, the wipe sting. These route through the
 *               shared `useSound` fast path (decoded AudioBuffers).
 *   SYNTHESIS — the whole combat layer. A crowd of forty fires ~46 shots a
 *               second; sample playback of one file at that rate sounds like a
 *               machine gun jam, and shipping forty variants would bloat the
 *               download. Shots, impacts, gate ticks and bursts are synthesised
 *               per event with randomised pitch and envelope, so no two are
 *               identical and the combat mix costs zero bytes.
 *
 * The gate tick is the one cue the whole game is built around, so it gets
 * special treatment: its pitch RISES with the gate's value. Pumping a gate from
 * +1 to +12 plays an ascending scale, which is why holding fire on a gate feels
 * like winding something up rather than waiting.
 *
 * Everything runs on the SHARED AudioContext from `useAssets`, which the ad /
 * pause gate suspends — so "no game audio during an ad" covers synthesised
 * sound for free: a suspended context produces silence.
 */

export type FxSound =
  | 'shoot' | 'hitSoft' | 'hitHard' | 'gateTick' | 'gateSubTick' | 'gatePass' | 'gateMul'
  | 'gateTrap' | 'gateDismiss' | 'crate' | 'damageUp' | 'rateUp' | 'barricade' | 'divider'
  // The two roadside prizes: iron bars coming apart, the auto-shield arming,
  // and the auto-shield spending itself on one blow.
  | 'cage' | 'bulwarkArm' | 'bulwark'
  | 'foeDie' | 'unitLost' | 'coin' | 'eliteSpawn' | 'eliteSweep' | 'eliteDie'
  | 'bossHit' | 'bossGuard' | 'bossRage' | 'bossSlam' | 'bossHeal' | 'bossDie'
  | 'bossEnrage' | 'bossCharge'
  // The boss's wind-ups, one per beat of its pose (`game/bossWindup.ts`):
  // the meteor gathered and hurled, the dash coiled, the stomp risen and
  // dropped, the claws whetted and swung, the heal drawn in, the bolt charged
  // and thrown, the summoner's call. `bossCharge` is the dash itself.
  | 'windGather' | 'windHurl' | 'windCoil' | 'windRise' | 'windDrop'
  | 'windWhet' | 'windStrike' | 'windHeal' | 'windBolt' | 'windZap' | 'windCall'
  | 'stageClear' | 'wipe' | 'rally'
  | 'squadMilestone'
  | 'countUp'
  | 'lever' | 'weaponOpen' | 'weaponTake' | 'rocketLaunch' | 'rocketBlast'
  // The two late skills (`game/skills.ts`). The only cues in the mix with a
  // room around them — see `getReverb`.
  | 'frostNova' | 'frostShatter' | 'frostThaw'
  | 'decoyThrow' | 'decoyLit' | 'decoyBurst'

// ─── Throttling ─────────────────────────────────────────────────────────────
//
// A busy second produces hundreds of events. Without a per-cue budget the mix
// turns to mud and the main thread spends real time building oscillator graphs.
// Each cue gets a minimum gap AND a per-window voice cap.

interface Throttle { minGapMs: number; maxPerWindow: number; windowMs: number }

const THROTTLES: Partial<Record<FxSound, Throttle>> = {
  shoot: { minGapMs: 55, maxPerWindow: 6, windowMs: 300 },
  hitSoft: { minGapMs: 45, maxPerWindow: 6, windowMs: 250 },
  hitHard: { minGapMs: 55, maxPerWindow: 5, windowMs: 300 },
  foeDie: { minGapMs: 55, maxPerWindow: 6, windowMs: 300 },
  unitLost: { minGapMs: 90, maxPerWindow: 4, windowMs: 400 },
  coin: { minGapMs: 60, maxPerWindow: 6, windowMs: 300 },
  bossHit: { minGapMs: 70, maxPerWindow: 4, windowMs: 350 },
  // The shield eats EVERY round a squad of a thousand fires at it, which is the
  // densest event stream in the game. Tighter than `bossHit` on purpose: it
  // needs to read as a continuous ricochet texture, not as forty voices.
  bossGuard: { minGapMs: 85, maxPerWindow: 3, windowMs: 400 },
  // Two elites on a late stage can be winding up together, and both arcs
  // landing in the same 100 ms should read as one heavy beat rather than two
  // thin ones — but a third would just be mud.
  eliteSweep: { minGapMs: 90, maxPerWindow: 2, windowMs: 500 },
  // Same budget as `gateTick`: it is the same clock, and in a dilemma bank both
  // can be running at once.
  gateSubTick: { minGapMs: 70, maxPerWindow: 4, windowMs: 400 },
  barricade: { minGapMs: 70, maxPerWindow: 4, windowMs: 350 },
  // A rocket at a high fire rate is a couple of blasts a second, and each one is
  // the biggest voice the player's own gun has. Budgeted like `bossSlam` would
  // be if it repeated: enough to keep every shot audible, tight enough that a
  // launcher firing into a pack does not become one continuous roar.
  rocketBlast: { minGapMs: 110, maxPerWindow: 4, windowMs: 600 },
  // The launch is the busier of the two — up to five tubes, each on its own
  // clock — so it gets a slightly wider budget and a tighter gap. Losing one
  // launch in a salvo is fine; the salvo still reads as a salvo.
  rocketLaunch: { minGapMs: 55, maxPerWindow: 6, windowMs: 400 },
  // A three-leaf bank dismisses TWO leaves, spaced by the shockwave's travel
  // time (~90–200 ms). The budget has to let the whole cascade through — the
  // cascade IS the cue — while still refusing a second bank's worth on top of
  // it, which is what a player weaving through back-to-back banks would trigger.
  gateDismiss: { minGapMs: 40, maxPerWindow: 3, windowMs: 600 },
  // The odd one out: this cue is not dense, it is RARE — the crowd-milestone
  // ladder doubles, so a four-figure run fires it six or seven times in three
  // minutes. It is in the table anyway because its failure mode is unique. Every
  // other row here protects the mix from an event stream that is genuinely fast;
  // this row protects the player from a caller that has lost track of which
  // rungs it has already announced, which would turn a half-second chime into
  // the sound of the rest of the run. One row is cheaper than trusting the HUD.
  squadMilestone: { minGapMs: 700, maxPerWindow: 2, windowMs: 3000 },
  // A crowd walking into a frozen pack shatters a body a frame — the crack has
  // to keep coming for as long as they keep coming apart, without becoming one
  // continuous hiss of glass.
  frostShatter: { minGapMs: 45, maxPerWindow: 5, windowMs: 350 },
  // The wind-ups are one-a-swing by construction, so these rows are a guard
  // rather than a budget: a crossrake puts two rakes on the road together, and
  // the second pass's whet lands 0.7 s after the first — well outside the gap —
  // while a cue that somehow fired twice in one frame is refused.
  windGather: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windHurl: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windCoil: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windRise: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windDrop: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windWhet: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windStrike: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windHeal: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windBolt: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windZap: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 },
  windCall: { minGapMs: 150, maxPerWindow: 2, windowMs: 1000 }
}

const lastAt: Partial<Record<FxSound, number>> = {}
const windowHits: Partial<Record<FxSound, number[]>> = {}

const passesThrottle = (id: FxSound): boolean => {
  const t = THROTTLES[id]
  if (!t) return true
  const now = performance.now()
  if (now - (lastAt[id] ?? -Infinity) < t.minGapMs) return false
  const hits = (windowHits[id] ??= [])
  while (hits.length > 0 && now - hits[0]! > t.windowMs) hits.shift()
  if (hits.length >= t.maxPerWindow) return false
  hits.push(now)
  lastAt[id] = now
  return true
}

// ─── Volume ─────────────────────────────────────────────────────────────────

const { userSoundVolume } = useUser()

/** Master gain for a synthesised voice, folding in the player's SFX slider. */
const vol = (base: number): number =>
  Math.max(0, Math.min(1, base * (userSoundVolume.value ?? 0.7)))

const canPlay = (): boolean => !isAudioSuspended() && !isMobileAudioMuted.value

// ─── Synthesis primitives ───────────────────────────────────────────────────

/** Shared, lazily-built white-noise buffer. Rebuilding noise per shot would be
 *  half a second of `Math.random()` per second at combat density. */
let noiseBuffer: AudioBuffer | null = null
const getNoise = (ctx: AudioContext): AudioBuffer => {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer
  const len = Math.floor(ctx.sampleRate * 1.2)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buf
  return buf
}

/**
 * ─── A room, for the few cues that need one ─────────────────────────────────
 *
 * Every voice in this mixer goes straight to the destination, dry, and for the
 * combat bed that is right: forty shots a second through a reverb is a wash.
 * The two late skills are the exception. A frost nova is the whole world
 * stopping, and a dry crackle reads as a sound effect where a crackle with a
 * cold cavern behind it reads as a place; the flare is a light in the distance
 * and needs distance. So they alone SEND to this bus — a synthesised stereo
 * impulse, darkened by a low-pass so the space is stone rather than tile.
 *
 * Built lazily on the first cue that asks for it, and never for a session that
 * never reaches stage 5: ~1.7 MB of impulse for a player who will never hear it
 * would be the definition of waste.
 */
let reverb: { ctx: AudioContext; input: GainNode } | null = null

const buildImpulse = (ctx: AudioContext, seconds: number, decay: number): AudioBuffer => {
  const rate = ctx.sampleRate
  const len = Math.max(1, Math.floor(rate * seconds))
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / len
      // Exponential-ish decay, independently noisy per channel: the difference
      // between the ears is what makes it a space rather than an echo.
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
    }
    // A handful of early reflections, the walls answering first.
    for (const [ms, g] of [[11, 0.55], [23, 0.4], [37, 0.3], [52, 0.22]] as const) {
      const at = Math.floor((ms + ch * 3) * rate / 1000)
      if (at < len) d[at] = (d[at] ?? 0) + (ch === 0 ? g : -g)
    }
  }
  return buf
}

const getReverb = (ctx: AudioContext): AudioNode | null => {
  if (reverb && reverb.ctx === ctx) return reverb.input
  try {
    const conv = ctx.createConvolver()
    conv.buffer = buildImpulse(ctx, 2.2, 3.1)
    const input = ctx.createGain()
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 5200
    const wet = ctx.createGain()
    wet.gain.value = 0.55
    input.connect(conv).connect(tone).connect(wet).connect(ctx.destination)
    reverb = { ctx, input }
    return input
  } catch {
    return null
  }
}

/** Where a voice's last gain stage goes: straight out (the combat bed), or out
 *  through a pan and a send — the late skills, which have a side and a room. */
interface Route {
  /** -1 left … 1 right. */
  pan?: number
  /** 0…1 of the voice sent to the room as well. */
  send?: number
  /** A bus of the caller's own, instead of the destination — the flare's burn
   *  loop, so the whole loop can be faded as one. */
  dest?: AudioNode
}

const route = (ctx: AudioContext, out: AudioNode, o: Route): void => {
  let tail: AudioNode = out
  if (o.pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    p.pan.value = Math.max(-1, Math.min(1, o.pan))
    out.connect(p)
    tail = p
  }
  tail.connect(o.dest ?? ctx.destination)
  if (o.send && o.send > 0 && !o.dest) {
    const room = getReverb(ctx)
    if (room) {
      const s = ctx.createGain()
      s.gain.value = o.send
      tail.connect(s).connect(room)
    }
  }
}

interface NoiseOpts extends Route {
  duration: number
  gain: number
  /** Filter sweep, Hz. */
  filterFrom: number
  filterTo: number
  type?: BiquadFilterType
  q?: number
  delay?: number
  /** Seconds to the peak. Absent (the default) is a hit: full gain at once and
   *  decaying from there. The wind-ups set it to SWELL — a noise that grows
   *  toward the moment it describes rather than away from it. */
  attack?: number
}

/** A filtered noise burst — the backbone of impacts, bursts and debris. */
const noiseBurst = (ctx: AudioContext, o: NoiseOpts): void => {
  const src = ctx.createBufferSource()
  src.buffer = getNoise(ctx)
  src.playbackRate.value = 0.85 + Math.random() * 0.3
  // The shared buffer is 1.2 s. Every cue shorter than that plays it once; a
  // wind-up texture can outlast it (a coil at a slow cadence), and a one-shot
  // source would stop dead mid-swell.
  if (o.duration > 1) src.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = o.type ?? 'lowpass'
  filter.Q.value = o.q ?? 1
  const now = ctx.currentTime + (o.delay ?? 0)
  filter.frequency.setValueAtTime(o.filterFrom, now)
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.filterTo), now + o.duration)

  const gain = ctx.createGain()
  if (o.attack && o.attack > 0) {
    const peak = Math.min(o.attack, o.duration * 0.95)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), now + peak)
  } else {
    gain.gain.setValueAtTime(o.gain, now)
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, now + o.duration)

  src.connect(filter).connect(gain)
  route(ctx, gain, o)
  src.start(now)
  src.stop(now + o.duration + 0.02)
}

interface ToneOpts extends Route {
  freq: number
  toFreq?: number
  duration: number
  gain: number
  type?: OscillatorType
  delay?: number
  /** Optional lowpass to take the edge off a raw saw/square. */
  filter?: number
  /** Seconds to the peak. 4 ms by default — a pad wants a swell, not a click. */
  attack?: number
}

/** A single pitched voice with an exponential envelope. */
const tone = (ctx: AudioContext, o: ToneOpts): void => {
  const now = ctx.currentTime + (o.delay ?? 0)
  const osc = ctx.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, now)
  if (o.toFreq && o.toFreq !== o.freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.toFreq), now + o.duration)
  }

  const gain = ctx.createGain()
  // 4 ms attack avoids the click a hard start would produce.
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), now + (o.attack ?? 0.004))
  gain.gain.exponentialRampToValueAtTime(0.0001, now + o.duration)

  let node: AudioNode = osc
  if (o.filter) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = o.filter
    osc.connect(f)
    node = f
  }
  node.connect(gain)
  route(ctx, gain, o)
  osc.start(now)
  osc.stop(now + o.duration + 0.02)
}

/**
 * A struck bell: the note, plus two INHARMONIC partials above it (×2.76 and
 * ×5.4, the ratios of a real bar or bell) that decay faster than the note does.
 * The inharmonics are what make it glass or ice rather than a keyboard — a pure
 * sine at 2.6 kHz is a test tone, the same sine with its overtones out of tune
 * is a crystal ringing.
 */
const bell = (ctx: AudioContext, o: ToneOpts): void => {
  tone(ctx, { ...o, type: 'sine' })
  tone(ctx, { ...o, freq: o.freq * 2.76, toFreq: undefined, gain: o.gain * 0.36, duration: o.duration * 0.45, type: 'sine' })
  tone(ctx, { ...o, freq: o.freq * 5.4, toFreq: undefined, gain: o.gain * 0.16, duration: o.duration * 0.22, type: 'sine' })
}

/**
 * Tiny, dry, high clicks scattered over a window: ice forming, a flame
 * spitting, a firework's tail. Each is a few milliseconds of noise through a
 * band chosen per click, so a run of them is a texture rather than a rhythm.
 */
interface CrackleOpts extends Route {
  count: number
  /** Window, seconds from now. */
  from: number
  to: number
  gain: number
  lo: number
  hi: number
}
const crackle = (ctx: AudioContext, o: CrackleOpts): void => {
  for (let i = 0; i < o.count; i++) {
    const f = o.lo + Math.random() * (o.hi - o.lo)
    noiseBurst(ctx, {
      duration: 0.012 + Math.random() * 0.024,
      gain: o.gain * (0.45 + Math.random() * 0.55),
      filterFrom: f, filterTo: f * 0.7,
      type: 'bandpass', q: 1.6 + Math.random() * 2,
      delay: o.from + Math.random() * (o.to - o.from),
      pan: o.pan, send: o.send, dest: o.dest
    })
  }
}

// ─── Cue definitions ────────────────────────────────────────────────────────

const { playSound } = useSounds()

/** Cues that map cleanly onto a shipped sample: `[file, volumeRatio]`. */
const SAMPLE_CUES: Partial<Record<FxSound, [string, number]>> = {
  coin: ['coin-pickup', 0.05],
  stageClear: ['celebration-1', 0.09],
  bossDie: ['celebration-3', 0.1],
  wipe: ['lose', 0.11],
  damageUp: ['level-up', 0.06],
  // The second wind. `reward-continue` is the sample the chest payout and the
  // weapon reveal already use, and that is exactly the point: the player has
  // heard this cue mean "something good was just handed to you" before, so a
  // rally sounds like a gift rather than like another pickup. Louder than
  // either, because it arrives one frame after a death.
  rally: ['reward-continue', 0.12]
}

/**
 * Pentatonic ladder for the gate tick.
 *
 * A chromatic run up 40 semitones is unbearable; a pentatonic one is a melody
 * no matter where the player stops pumping.
 *
 * ─── It has to WRAP, and it did not ─────────────────────────────────────────
 *
 * The docstring here has always claimed the ladder "wraps every octave, so a
 * gate pushed to +30 keeps climbing without leaving the audible band". It did
 * not wrap: the octave term was an unbounded `floor(n / 5) * 12`, so the note
 * for a `+36` door is 55 kHz and the note for a `+50` is 400 kHz. The browser
 * clamps both to 24 kHz and logs a warning per tick, and THE SOUND OF THE GAME
 * is inaudible from roughly `+25` upward — which is every door past stage 30,
 * and every door in the band where the pump was just made to matter again.
 *
 * `OCTAVE_WRAP` is what the comment always described: the ladder climbs three
 * octaves and starts again from the bottom, so a long pump is a repeating
 * rising phrase instead of a dog whistle.
 */
const PENTATONIC = [0, 2, 4, 7, 9]
/** Octaves the ladder climbs before it restarts at the bottom. */
export const OCTAVE_WRAP = 3
/** Ticks in one full phrase — five pentatonic steps per octave. */
export const LADDER_STEPS = PENTATONIC.length * OCTAVE_WRAP
export const tickFreq = (step: number): number => {
  const n = Math.max(0, Math.floor(step)) % LADDER_STEPS
  const semis = PENTATONIC[n % 5]! + Math.floor(n / 5) * 12
  return 392 * Math.pow(2, semis / 12)
}

/**
 * Synthesise one cue.
 *
 * `power` is a 0..1 intensity the caller derives from context (how far a gate
 * has been pumped, how many survivors just arrived). It never changes WHICH
 * sound plays — only how big it is — so the mix stays legible.
 */
const synth = (ctx: AudioContext, id: FxSound, power: number, pan = 0, seconds = 0): void => {
  const r = Math.random()

  switch (id) {
    case 'shoot':
      // Dry, small and fast. It has to survive being played six times a second
      // under everything else, so it lives in a narrow band and gets out.
      tone(ctx, { freq: 760 + r * 220, toFreq: 240, duration: 0.055, gain: vol(0.045), type: 'square', filter: 2600 })
      noiseBurst(ctx, { duration: 0.045, gain: vol(0.03), filterFrom: 5200, filterTo: 1100, type: 'bandpass', q: 1.3 })
      break

    case 'hitSoft':
      noiseBurst(ctx, { duration: 0.06, gain: vol(0.045), filterFrom: 3200, filterTo: 700 })
      break

    case 'hitHard':
      // Rounds ringing off a steel gate frame — a bright metallic tick that
      // tells the player their fire is LANDING even when the number is between
      // ticks.
      tone(ctx, { freq: 1750 + r * 500, toFreq: 900, duration: 0.05, gain: vol(0.035), type: 'triangle' })
      noiseBurst(ctx, { duration: 0.05, gain: vol(0.035), filterFrom: 6400, filterTo: 1800, type: 'bandpass', q: 2.4 })
      break

    case 'gateTick': {
      // THE sound of the game. Pitch climbs with the gate's value, so holding
      // fire plays a rising scale and letting go stops it mid-phrase.
      const f = tickFreq(power)
      tone(ctx, { freq: f, duration: 0.13, gain: vol(0.075), type: 'triangle' })
      tone(ctx, { freq: f * 2, duration: 0.09, gain: vol(0.03), type: 'sine', delay: 0.008 })
      noiseBurst(ctx, { duration: 0.05, gain: vol(0.02), filterFrom: 7000, filterTo: 2600, type: 'bandpass', q: 3 })
      break
    }

    case 'gateSubTick': {
      // The pump running the wrong way. Same clock as `gateTick` and
      // deliberately the same FAMILY of sound, because it is the same mechanic
      // — but the ladder descends, the timbre is a dull square instead of a
      // ringing triangle, and there is no octave sparkle on top. The player has
      // to hear "that is the pump, and it is costing me" in one tick, without
      // looking away from the door they are about to commit to.
      // The same phrase read backwards, and wrapped on the same clock as the
      // rising one. It was `26 - power` floored at zero, which meant every
      // `-N` past 26 played the identical bottom note — so on the stages
      // where a trap costs the most, the pump running the wrong way stopped
      // sounding like anything at all.
      const down = LADDER_STEPS - 1 - (Math.max(0, Math.floor(power)) % LADDER_STEPS)
      const f = tickFreq(down) * 0.5
      tone(ctx, { freq: f, toFreq: f * 0.94, duration: 0.15, gain: vol(0.07), type: 'square', filter: 1400 })
      noiseBurst(ctx, { duration: 0.06, gain: vol(0.022), filterFrom: 1800, filterTo: 400, type: 'bandpass', q: 2 })
      break
    }

    case 'gatePass': {
      // A major triad swelling under a bright sweep — the "you got something"
      // chord. Louder and one octave wider when the haul was big.
      const big = Math.min(1, power)
      const root = 262
      for (const [i, mult] of [1, 1.26, 1.5, 2].entries()) {
        tone(ctx, {
          freq: root * mult, duration: 0.42 + big * 0.25, gain: vol(0.055 + big * 0.045),
          type: 'triangle', filter: 3200, delay: i * 0.035
        })
      }
      noiseBurst(ctx, { duration: 0.4, gain: vol(0.045), filterFrom: 900, filterTo: 6500, type: 'bandpass', q: 0.8 })
      tone(ctx, { freq: 90, toFreq: 45, duration: 0.3, gain: vol(0.09), type: 'sine' })
      break
    }

    case 'gateMul': {
      // Multiplier gates get a fifth stacked on top and a longer tail, so the
      // ear can tell a ×2 from a +12 without looking.
      const root = 330
      for (const [i, mult] of [1, 1.5, 2, 3].entries()) {
        tone(ctx, {
          freq: root * mult, duration: 0.6, gain: vol(0.06),
          type: 'sawtooth', filter: 2600, delay: i * 0.045
        })
      }
      noiseBurst(ctx, { duration: 0.6, gain: vol(0.05), filterFrom: 1200, filterTo: 8000, type: 'bandpass', q: 0.7 })
      break
    }

    case 'crate':
      // Splintering crate: a bright crack plus two detuned wood clacks.
      noiseBurst(ctx, { duration: 0.19, gain: vol(0.09), filterFrom: 6200, filterTo: 800, type: 'bandpass', q: 0.9 })
      tone(ctx, { freq: 430 + r * 190, toFreq: 130, duration: 0.13, gain: vol(0.055), type: 'triangle' })
      tone(ctx, { freq: 300 + r * 150, toFreq: 100, duration: 0.16, gain: vol(0.045), type: 'triangle', delay: 0.035 })
      break

    case 'cage': {
      // A cage is IRON, and the whole point of the cue is that it is not the
      // crate's wood. Same three-part shape as `crate` — a crack, then pitched
      // debris — with every part moved: the burst is a low, ringing metal
      // clang rather than a bright splinter, and the two clacks are replaced by
      // a rising major third, which is the shortest phrase that reads as
      // "somebody got out" rather than "something broke".
      noiseBurst(ctx, { duration: 0.34, gain: vol(0.085), filterFrom: 2400, filterTo: 220, type: 'bandpass', q: 2.2 })
      tone(ctx, { freq: 196, toFreq: 92, duration: 0.26, gain: vol(0.06), type: 'square', filter: 1500 })
      for (const [i, f] of [392, 494, 587].entries()) {
        tone(ctx, {
          freq: f, duration: 0.16, gain: vol(0.05), type: 'triangle', delay: 0.06 + i * 0.055
        })
      }
      break
    }

    case 'bulwarkArm':
      // The pickup arming. Deliberately the SAME family as the shield skill's
      // `shieldUp` (which borrows `gateMul`) — the player must not have to learn
      // "shield" twice — and deliberately lower and slower than it, because this
      // one is not a three-second window opening, it is something being set down
      // and left there. A rise that settles rather than a rise that races.
      tone(ctx, { freq: 165, toFreq: 330, duration: 0.42, gain: vol(0.075), type: 'triangle', filter: 2200 })
      tone(ctx, { freq: 247, toFreq: 494, duration: 0.42, gain: vol(0.05), type: 'sine', delay: 0.04 })
      noiseBurst(ctx, { duration: 0.5, gain: vol(0.035), filterFrom: 700, filterTo: 5200, type: 'bandpass', q: 1.1 })
      break

    case 'bulwark': {
      // The absorb. The loudest defensive cue in the game, and it has to be:
      // a save is invisible by definition — nothing happens — so the sound is
      // doing most of the work of telling the player that the thing they
      // detoured for just paid for itself.
      //
      // Built as an IMPACT that fails to land: a heavy low thud (the blow),
      // immediately stopped by a bright metallic ring (the dome), then a
      // descending tail (the blow being shed). The middle voice is the same
      // ricochet timbre `bossGuard` uses for rounds bouncing off a phase
      // shield, which is the language this game already has for "that hit
      // something it cannot get through".
      tone(ctx, { freq: 110, toFreq: 44, duration: 0.3, gain: vol(0.13), type: 'sine' })
      noiseBurst(ctx, { duration: 0.14, gain: vol(0.1), filterFrom: 9000, filterTo: 2600, type: 'bandpass', q: 3.2 })
      for (const [i, f] of [1319, 1047, 784].entries()) {
        tone(ctx, {
          freq: f, toFreq: f * 0.75, duration: 0.3 + i * 0.08,
          gain: vol(0.055), type: 'triangle', delay: 0.03 + i * 0.05
        })
      }
      noiseBurst(ctx, { duration: 0.7, gain: vol(0.045), filterFrom: 4200, filterTo: 260, type: 'lowpass', delay: 0.08 })
      break
    }

    case 'rateUp': {
      // A fast ratcheting climb — the sound of a mechanism speeding up. It has
      // to be audibly DIFFERENT from the damage crate's fanfare, because the
      // two crates are a choice and the ear should be able to score it.
      for (let i = 0; i < 5; i++) {
        tone(ctx, {
          freq: 520 * Math.pow(1.18, i), duration: 0.07,
          gain: vol(0.05), type: 'square', filter: 3800, delay: i * 0.045
        })
      }
      noiseBurst(ctx, { duration: 0.3, gain: vol(0.04), filterFrom: 1600, filterTo: 7000, type: 'bandpass', q: 1.4 })
      break
    }

    case 'gateTrap': {
      // The anti-gate: a descending minor cluster with a sub drop under it.
      // Deliberately unpleasant — this cue is a mistake being reported.
      for (const [i, f] of [392, 370, 311].entries()) {
        tone(ctx, {
          freq: f, toFreq: f * 0.5, duration: 0.55, gain: vol(0.08),
          type: 'sawtooth', filter: 1400, delay: i * 0.05
        })
      }
      tone(ctx, { freq: 90, toFreq: 38, duration: 0.5, gain: vol(0.12), type: 'sine' })
      noiseBurst(ctx, { duration: 0.45, gain: vol(0.06), filterFrom: 3000, filterTo: 200 })
      break
    }

    case 'gateDismiss': {
      /**
       * A leaf the player did NOT take, being destroyed.
       *
       * This fires on EVERY bank, at the same instant as the gate-pass chord, so
       * it is built to sit UNDER that chord rather than compete with it. Three
       * rules keep it out of the way:
       *
       *   • it is NOISE and SUB, not pitch — no note in it belongs to the reward
       *     chord's key, so the ear files it as an event rather than a harmony;
       *   • the metallic tail is deliberately INHARMONIC (a 1.35 ratio, not an
       *     octave or a fifth), which is what makes it read as bent steel
       *     instead of as another instrument;
       *   • it is short. 300 ms and gone, while the chord runs for 700.
       *
       * `power` is the caller's distance falloff (1 = the leaf next door), so a
       * three-leaf cascade audibly recedes across the lane instead of firing
       * twice at the same volume.
       */
      const p = 0.4 + Math.min(1, power) * 0.6
      // The latch letting go: dry, hard, no tail. This is the transient the ear
      // timestamps the whole event by.
      tone(ctx, { freq: 200 + r * 70, toFreq: 66, duration: 0.05, gain: vol(0.05 * p), type: 'square', filter: 1700 })
      // The mass hitting the road.
      tone(ctx, { freq: 94, toFreq: 33, duration: 0.15, gain: vol(0.07 * p), type: 'sine' })
      noiseBurst(ctx, { duration: 0.12, gain: vol(0.05 * p), filterFrom: 2200, filterTo: 170 })
      // The tail: two detuned partials sagging in pitch (metal losing tension)
      // over a narrow band of noise. Quiet enough to be texture, present enough
      // that the destruction has a size.
      tone(ctx, { freq: 1830, toFreq: 1760, duration: 0.27, gain: vol(0.02 * p), type: 'triangle', delay: 0.02 })
      tone(ctx, { freq: 2470, toFreq: 2360, duration: 0.2, gain: vol(0.014 * p), type: 'triangle', delay: 0.03 })
      noiseBurst(ctx, {
        duration: 0.3, gain: vol(0.022 * p), filterFrom: 5400, filterTo: 1400,
        type: 'bandpass', q: 6, delay: 0.02
      })
      break
    }

    case 'divider':
      // Metal. Bright, hard and short — the player must instantly know that the
      // thing that just killed those survivors was NOT an enemy.
      tone(ctx, { freq: 2400 + r * 700, toFreq: 1300, duration: 0.07, gain: vol(0.06), type: 'square', filter: 6000 })
      noiseBurst(ctx, { duration: 0.11, gain: vol(0.07), filterFrom: 8000, filterTo: 2200, type: 'bandpass', q: 3.2 })
      tone(ctx, { freq: 150, toFreq: 70, duration: 0.14, gain: vol(0.07), type: 'triangle' })
      break

    case 'eliteSpawn': {
      // A short, dark horn stack. Announces a landmark without the boss's
      // full-length fanfare — a miniboss is a milestone, not the climax.
      for (const [i, f] of [130, 132, 196].entries()) {
        tone(ctx, {
          freq: f, toFreq: f * 0.95, duration: 0.85, gain: vol(0.085),
          type: 'sawtooth', filter: 800, delay: i * 0.03
        })
      }
      noiseBurst(ctx, { duration: 0.7, gain: vol(0.05), filterFrom: 500, filterTo: 90 })
      break
    }

    case 'eliteSweep':
      // The elite's arc across the road. `power` carries the archetype's
      // weight, and the two have to be tellable apart with the screen busy: a
      // brute is a low body thump dragging a long dust tail, a hound is a short
      // bright crack.
      //
      // Both sit well ABOVE the boss slam's sub — an elite sweep landing during
      // a boss fight must never be mistaken for the boss's own swing. And both
      // SWEEP the filter downward over the length of the cue rather than
      // decaying in place: the sound has to travel, because the thing it is
      // describing crossed the whole lane.
      if (power >= 1) {
        tone(ctx, { freq: 150, toFreq: 52, duration: 0.3, gain: vol(0.13), type: 'sine' })
        noiseBurst(ctx, { duration: 0.42, gain: vol(0.1), filterFrom: 3000, filterTo: 180 })
      } else {
        tone(ctx, { freq: 360, toFreq: 120, duration: 0.14, gain: vol(0.09), type: 'triangle' })
        noiseBurst(ctx, { duration: 0.24, gain: vol(0.085), filterFrom: 5200, filterTo: 600, q: 1.2 })
      }
      break

    case 'eliteDie': {
      // The boss-death chord at two-thirds scale and half the length.
      const root = 294
      for (const [i, mult] of [1, 1.26, 1.5].entries()) {
        tone(ctx, {
          freq: root * mult, duration: 0.4, gain: vol(0.07),
          type: 'triangle', filter: 3000, delay: i * 0.04
        })
      }
      noiseBurst(ctx, { duration: 0.35, gain: vol(0.08), filterFrom: 4000, filterTo: 300 })
      tone(ctx, { freq: 100, toFreq: 40, duration: 0.3, gain: vol(0.1), type: 'sine' })
      break
    }

    case 'barricade':
      // Concrete, not wood: darker, grittier, no ring.
      noiseBurst(ctx, { duration: 0.26, gain: vol(0.1), filterFrom: 2400, filterTo: 220 })
      tone(ctx, { freq: 130, toFreq: 55, duration: 0.22, gain: vol(0.09), type: 'sine' })
      break

    case 'foeDie':
      tone(ctx, { freq: 330 + r * 170, toFreq: 85, duration: 0.15, gain: vol(0.05), type: 'sawtooth', filter: 1500 })
      noiseBurst(ctx, { duration: 0.12, gain: vol(0.045), filterFrom: 2300, filterTo: 380 })
      break

    case 'unitLost':
      // Deliberately unpleasant and slightly human: a short falling cry. Losing
      // survivors has to STING or the crowd stops feeling like people.
      tone(ctx, { freq: 520 + r * 90, toFreq: 190, duration: 0.19, gain: vol(0.055), type: 'sawtooth', filter: 1300 })
      noiseBurst(ctx, { duration: 0.14, gain: vol(0.035), filterFrom: 1600, filterTo: 300, type: 'bandpass', q: 1.4 })
      break

    case 'bossHit':
      tone(ctx, { freq: 160 + r * 40, toFreq: 70, duration: 0.11, gain: vol(0.075), type: 'triangle' })
      noiseBurst(ctx, { duration: 0.09, gain: vol(0.05), filterFrom: 2000, filterTo: 320 })
      break

    case 'bossGuard':
      // A round bouncing off the phase shield. Bright, short, metallic, and
      // pitched well ABOVE `bossHit` — the player has to hear that their fire
      // stopped landing without looking away from the telegraph.
      tone(ctx, { freq: 1500 + r * 500, toFreq: 2400, duration: 0.05, gain: vol(0.022), type: 'square', filter: 6000 })
      break

    case 'bossRage':
      // The phase turn. A rising horn under a struck-metal hit: the boss is
      // planting, and the next thing that happens is a slam.
      tone(ctx, { freq: 90, toFreq: 220, duration: 0.7, gain: vol(0.2), type: 'sawtooth', filter: 900 })
      tone(ctx, { freq: 320, toFreq: 180, duration: 0.9, gain: vol(0.1), type: 'triangle' })
      noiseBurst(ctx, { duration: 0.5, gain: vol(0.1), filterFrom: 5000, filterTo: 400 })
      break

    case 'bossEnrage':
      // Phase two, landing in the same frame as `bossRage` and deliberately
      // UNDER it rather than beside it. The gate cue is already the loudest
      // thing in the fight and doubling it just makes both quieter; what this
      // adds is the octave below and a long tail, so the beat the player has
      // heard twice before arrives with a floor under it and keeps ringing after
      // the gate's own hit has stopped. That difference is the whole message:
      // same event, bigger fight.
      //
      // The horn FALLS where `bossRage`'s rises. Everything in this mix that
      // rises is something arriving (a bomb's fuse, a heal); a drop from 150 to
      // 44 is the fight settling into something heavier, and it reads as such
      // without competing with the cue stacked on top of it.
      tone(ctx, { freq: 150, toFreq: 44, duration: 1.5, gain: vol(0.22), type: 'sawtooth', filter: 620 })
      tone(ctx, { freq: 74, toFreq: 37, duration: 1.8, gain: vol(0.16), type: 'sine' })
      noiseBurst(ctx, { duration: 1.2, gain: vol(0.09), filterFrom: 1800, filterTo: 120 })
      break

    case 'bossCharge': {
      // THE DASH — the body leaving its line, fired on the beat the simulation
      // starts moving it (`windupBeats`), and lasting exactly as long as the
      // run. This used to be the whole charge's tell, a second-long rasp from
      // the moment the band went down; the band's first second is now the
      // COIL (`windCoil`), so the charge reads as two beats — something
      // building, then something coming — instead of one long noise.
      //
      // Pitched between `bossGuard`'s ricochets and `bossSlam`'s sub so it has
      // somewhere to sit when forty rounds a second are landing on the shield,
      // and it RISES into the `bossSlam` that lands at the far end of the lane.
      const d = Math.max(0.2, seconds || 0.38)
      noiseBurst(ctx, { duration: d + 0.12, gain: vol(0.12), filterFrom: 380, filterTo: 2600, type: 'bandpass', q: 1.1, attack: d * 0.6 })
      tone(ctx, { freq: 86, toFreq: 210, duration: d + 0.06, gain: vol(0.12), type: 'sawtooth', filter: 900, attack: d * 0.5 })
      break
    }

    // ─── The wind-ups ───────────────────────────────────────────────────────
    //
    // Every boss attack now starts from the body (`game/bossWindup.ts`), and
    // every one of those poses has a sound on the same clock. The rules they
    // share, so the family reads as one voice:
    //
    //   • TEXTURES SWELL, MOMENTS STRIKE. A gather, a coil or a rise grows
    //     toward the beat it is building to (an `attack` most of its length)
    //     and stops there; the throw, the dash, the drop, the swing are short
    //     and hit on their frame. `seconds` is the pose's own length, so a
    //     raging boss's quicker wind-up is a quicker sound.
    //   • UNDER THE PAYOUTS. Peaks sit at or below `bossCharge`'s and well
    //     under `bossSlam` and the gate chords: a wind-up is a warning, and
    //     the thing it warns about is louder than it.
    //   • LOW FOR WEIGHT, HIGH FOR EDGES. The meteor and the stomp live in the
    //     boss's register (the `bossSlam` family); the claws and the bolt get
    //     the metallic top the elite sweeps use, so an ear can tell a rake from
    //     a rock without the eyes.
    case 'windGather': {
      // The rock forming over the boss's head: a fire roar swelling from the
      // floor of the mix, spitting as it grows. Stops on the throw.
      const g = Math.max(0.15, seconds || 0.38)
      const big = power >= 1 ? 1.3 : 1
      tone(ctx, { freq: 64, toFreq: 132, duration: g + 0.04, gain: vol(0.085 * big), type: 'sawtooth', filter: 520, attack: g * 0.85 })
      noiseBurst(ctx, { duration: g + 0.04, gain: vol(0.06 * big), filterFrom: 260, filterTo: 2200, attack: g * 0.85 })
      crackle(ctx, { count: 6, from: g * 0.2, to: g, gain: vol(0.028), lo: 1600, hi: 4200 })
      break
    }

    case 'windHurl': {
      // The throw: a grunt and a whoosh off the hands, then the rock COMING —
      // a falling whistle over the flight that swells as it nears and fades a
      // hair before the `bossSlam` that lands it. The whistle is the part that
      // tells a player who never looked up that something is in the air.
      const f = Math.max(0.2, seconds || 0.62)
      const big = power >= 1 ? 1.25 : 1
      tone(ctx, { freq: 150, toFreq: 58, duration: 0.16, gain: vol(0.08 * big), type: 'sine' })
      noiseBurst(ctx, { duration: 0.24, gain: vol(0.1 * big), filterFrom: 420, filterTo: 2600, type: 'bandpass', q: 0.9 })
      tone(ctx, { freq: 1350, toFreq: 480, duration: f * 0.94, gain: vol(0.03 * big), type: 'sine', attack: f * 0.7, delay: 0.05 })
      noiseBurst(ctx, { duration: f * 0.94, gain: vol(0.035 * big), filterFrom: 3200, filterTo: 900, type: 'bandpass', q: 1.4, attack: f * 0.75, delay: 0.05 })
      break
    }

    case 'windCoil': {
      // The charge being loaded: a growl in the sub, a ground rumble under it,
      // and two paw-scrapes of dust — the same kicks the pose throws — so the
      // build has a pulse and does not read as a drone.
      const c = Math.max(0.3, seconds || 1.1)
      tone(ctx, { freq: 46, toFreq: 74, duration: c + 0.04, gain: vol(0.11), type: 'sawtooth', filter: 360, attack: c * 0.9 })
      noiseBurst(ctx, { duration: c + 0.04, gain: vol(0.06), filterFrom: 110, filterTo: 460, attack: c * 0.9 })
      for (const at of [0.38, 0.72]) {
        noiseBurst(ctx, { duration: 0.1, gain: vol(0.045), filterFrom: 1100, filterTo: 280, type: 'bandpass', q: 1.2, delay: c * at })
      }
      break
    }

    case 'windRise': {
      // The stomp being lifted: a horn climbing out of the boss's register —
      // `bossRage`'s shape, under it and slower, because the rage cue means
      // "the fight turned" and this only means "it is about to come down".
      const u = Math.max(0.3, seconds || 0.9)
      tone(ctx, { freq: 78, toFreq: 176, duration: u + 0.03, gain: vol(0.1), type: 'sawtooth', filter: 720, attack: u * 0.8 })
      tone(ctx, { freq: 236, toFreq: 380, duration: u + 0.03, gain: vol(0.035), type: 'triangle', attack: u * 0.8 })
      noiseBurst(ctx, { duration: u + 0.03, gain: vol(0.035), filterFrom: 400, filterTo: 1400, attack: u * 0.8 })
      break
    }

    case 'windDrop': {
      // The fall onto the stomp: a short downward rush that runs straight into
      // the `bossSlam` on the impact frame.
      const d = Math.max(0.1, seconds || 0.1)
      noiseBurst(ctx, { duration: d + 0.06, gain: vol(0.09), filterFrom: 2400, filterTo: 300, type: 'bandpass', q: 0.9 })
      tone(ctx, { freq: 260, toFreq: 70, duration: d + 0.04, gain: vol(0.06), type: 'triangle' })
      break
    }

    case 'windWhet': {
      // Claws being raised: two metal scrapes, blade on blade, and a thin ring
      // that grows under them. Bright on purpose — the rake has to be told
      // from the meteor by ear, and the meteor lives in the low end.
      const w = Math.max(0.25, seconds || 0.85)
      // The scrape's gain looks loud and is not: a narrow band of white noise
      // keeps a sliver of its energy, and at 0.045 it measured a 0.014 peak in
      // an OfflineAudioContext — a sixth of the swing it leads into. 0.2 puts it
      // near the other wind-ups (~0.05).
      for (const at of [0, 0.42]) {
        noiseBurst(ctx, { duration: 0.26, gain: vol(0.2), filterFrom: 2600, filterTo: 6200, type: 'bandpass', q: 5, attack: 0.18, delay: w * at })
      }
      tone(ctx, { freq: 1880, toFreq: 2060, duration: w + 0.03, gain: vol(0.028), type: 'triangle', attack: w * 0.8 })
      break
    }

    case 'windStrike':
      // The swing across — a hiss that falls as the blades cross the lanes,
      // landing on the `bossSlam` a beat later.
      noiseBurst(ctx, { duration: 0.16, gain: vol(0.1), filterFrom: 4200, filterTo: 700, type: 'bandpass', q: 1.1 })
      tone(ctx, { freq: 520, toFreq: 170, duration: 0.11, gain: vol(0.05), type: 'triangle' })
      break

    case 'windHeal': {
      // The healer drawing its heal in: a breathy swell rising INTO the note
      // `bossHeal` starts on (420 Hz), so the heal lands as the gather's
      // resolution rather than as a second event. Soft — a heal takes nothing.
      const h = Math.max(0.2, seconds || 0.5)
      tone(ctx, { freq: 280, toFreq: 420, duration: h + 0.04, gain: vol(0.045), type: 'sine', attack: h * 0.85 })
      noiseBurst(ctx, { duration: h + 0.04, gain: vol(0.03), filterFrom: 1200, filterTo: 3400, type: 'bandpass', q: 2, attack: h * 0.8 })
      break
    }

    case 'windBolt': {
      // A round charging in the healer's hands: a rising electric buzz with
      // sparks in it, cut off by the throw (`windZap`).
      const b = Math.max(0.2, seconds || 0.5)
      tone(ctx, { freq: 170, toFreq: 520, duration: b + 0.03, gain: vol(0.05), type: 'square', filter: 1400, attack: b * 0.85 })
      crackle(ctx, { count: 5, from: b * 0.3, to: b, gain: vol(0.035), lo: 3000, hi: 7000 })
      break
    }

    case 'windZap':
      // The bolt leaving: a bright descending zap. The flight and the hit have
      // their own sounds (`bossBoltHit` lands as a half-weight slam).
      tone(ctx, { freq: 940, toFreq: 230, duration: 0.13, gain: vol(0.07), type: 'sawtooth', filter: 3000 })
      noiseBurst(ctx, { duration: 0.1, gain: vol(0.05), filterFrom: 6500, filterTo: 2000, type: 'bandpass', q: 1.5 })
      break

    case 'windCall': {
      // The summoner raising its arms: a low chanted drone, two voices a hair
      // apart so it beats like breath, swelling into the wave's own arrival
      // (`eliteSpawn`), which is the sound of the bodies coming up.
      const c = Math.max(0.3, seconds || 0.9)
      for (const f of [98, 99.6]) {
        tone(ctx, { freq: f, toFreq: f * 1.12, duration: c + 0.05, gain: vol(0.05), type: 'sawtooth', filter: 520, attack: c * 0.8 })
      }
      noiseBurst(ctx, { duration: c + 0.05, gain: vol(0.03), filterFrom: 160, filterTo: 600, attack: c * 0.8 })
      break
    }

    case 'bossSlam':
      // Sub thump + wide body + a long dark tail. Pairs with the screen shake.
      tone(ctx, { freq: 110, toFreq: 30, duration: 0.45, gain: vol(0.22), type: 'sine' })
      noiseBurst(ctx, { duration: 0.38, gain: vol(0.16), filterFrom: 3000, filterTo: 160 })
      noiseBurst(ctx, { duration: 0.8, gain: vol(0.06), filterFrom: 800, filterTo: 90 })
      break

    case 'bossHeal':
      // The one cue in the whole mix that RISES and stays clean. Every other
      // combat sound here falls (a slam drops 110 -> 30, a foe dying 330 -> 85)
      // because everything else in this game is something being spent. A health
      // bar going back up is the opposite event and it has to sound like it, or
      // the player reads the bar moving and assumes their fire stopped landing.
      //
      // Two sines a fifth apart, sweeping up together, with no noise layer at
      // all: pitched and pure against a combat bed that is otherwise entirely
      // filtered noise, so it cuts through forty rounds a second without being
      // loud.
      tone(ctx, { freq: 420, toFreq: 720, duration: 0.42, gain: vol(0.12), type: 'sine' })
      tone(ctx, { freq: 630, toFreq: 1080, duration: 0.5, gain: vol(0.07), type: 'triangle' })
      break

    // ─── The weapon puzzle ──────────────────────────────────────────────────
    //
    // Three cues that have to be heard as one rising sentence, because they are
    // one: a mechanical CLACK, the same clack an octave up when the second
    // lever lands, then metal tearing as the armour comes off, then the pickup.
    // The player is looking at the road, not at the box, so the whole beat has
    // to work with the eyes elsewhere.
    case 'lever':
      // `power` is how far through the puzzle this pull is, 0..1 — so the second
      // lever answers the first a fifth higher. The interval is the feedback.
      tone(ctx, {
        freq: 330 + power * 160, toFreq: 190 + power * 90,
        duration: 0.11, gain: vol(0.075), type: 'square', filter: 2400
      })
      noiseBurst(ctx, { duration: 0.07, gain: vol(0.05), filterFrom: 4200, filterTo: 900 })
      break

    case 'weaponOpen':
      // Plate steel coming off: a low body under a long bright scrape.
      tone(ctx, { freq: 150, toFreq: 62, duration: 0.34, gain: vol(0.1), type: 'sawtooth', filter: 1100 })
      noiseBurst(ctx, { duration: 0.3, gain: vol(0.085), filterFrom: 1400, filterTo: 5200, type: 'bandpass', q: 0.8 })
      break

    case 'weaponTake': {
      // A three-note fanfare, the only ascending one in the mix that is not a
      // gate. It has to say "you were paid" without borrowing the stage-clear
      // cue, which would tell the player the stage was over.
      const root = 392
      for (let i = 0; i < 3; i++) {
        tone(ctx, {
          freq: root * Math.pow(2, [0, 4, 7][i]! / 12),
          duration: 0.18, gain: vol(0.07), type: 'triangle',
          delay: i * 0.075, filter: 3200
        })
      }
      noiseBurst(ctx, { duration: 0.22, gain: vol(0.045), filterFrom: 6000, filterTo: 1600 })
      break
    }

    case 'rocketLaunch':
      // ─── A missile leaving the tube ─────────────────────────────────────
      //
      // Three parts, in the order the ear expects them, and the order is the
      // whole cue:
      //
      //   1. the CRACK of the motor lighting — very short, very bright, and the
      //      only part that is exactly on the frame the round is spawned;
      //   2. the pitch CLIMBING as the thing leaves and accelerates away. Every
      //      other cue in this mixer sweeps DOWN (a hit decays, a gate lands, a
      //      barrel goes off); this is the only rising one in the game, which is
      //      what makes it recognisable under a fight;
      //   3. the roar OPENING UP behind it — a bandpass walking from 600 Hz to
      //      3.2 kHz rather than the usual collapse toward the floor.
      //
      // Plus a short low thump for the backblast, because points 1-3 are all
      // above 600 Hz and a phone speaker would render the launch as a hiss.
      noiseBurst(ctx, { duration: 0.045, gain: vol(0.06), filterFrom: 8000, filterTo: 2600, type: 'highpass', q: 0.8 })
      tone(ctx, { freq: 80 + r * 30, toFreq: 300, duration: 0.24, gain: vol(0.055), type: 'sawtooth', filter: 1800 })
      noiseBurst(ctx, { duration: 0.34, gain: vol(0.07), filterFrom: 600, filterTo: 3200, type: 'bandpass', q: 0.6 })
      tone(ctx, { freq: 140, toFreq: 55, duration: 0.13, gain: vol(0.05), type: 'triangle', filter: 500 })
      break

    case 'rocketBlast':
      // What the round does when it ARRIVES, a beat later and somewhere else.
      // Deliberately closer to a barrel than to the squad's rifle, and
      // deliberately falling where the launch above climbs — the pair is what
      // tells the player, without looking, that their own shot connected.
      tone(ctx, { freq: 120 + r * 40, toFreq: 46, duration: 0.22, gain: vol(0.09), type: 'sawtooth', filter: 900 })
      noiseBurst(ctx, { duration: 0.26, gain: vol(0.07), filterFrom: 2600, filterTo: 400 })
      break

    case 'squadMilestone': {
      /**
       * ─── The crowd crossed a round number ─────────────────────────────────
       *
       * SYNTHESISED, and the choice is forced rather than preferred.
       *
       * `public/audio/sfx/` ships four usable fanfares and every one of them is
       * disqualified by something the player has already been taught. Three are
       * already spoken for and MEAN something: `celebration-1` is a cleared
       * stage, `celebration-3` is a dead boss, `reward-continue` is a gift being
       * handed over (the chest, the weapon reveal, the rally). A chime that
       * sounded like a cleared stage in the middle of a stage would tell the
       * player the run had ended, which is the one thing a juice cue must never
       * say. The fourth (`win`) is a full mix with its own key and a ~1.5 s
       * reverb tail — and this cue lands on the SAME FRAME as a gate pass,
       * because passing a door is the only way a squad ever crosses a round
       * number, so it has to sit ON TOP of the `gatePass` / `gateMul` chord
       * rather than argue with it.
       *
       * So: three notes of the game's OWN pentatonic ladder (`tickFreq`, the
       * gate-pump scale), an octave above the reward chord's register where
       * nothing else in the mix lives, with a quiet third partial for a bell
       * edge and a short upward shimmer under it. It is recognisably the same
       * instrument the player just pumped the door with, which is the point —
       * the milestone reads as that pump paying off, not as a second event.
       *
       * `power` is the RUNG (0 = 25, 1 = 50, 2 = 100 …), not a 0..1 intensity:
       * the phrase starts that far up the ladder, so 800 arrives brighter and
       * higher than 25 did instead of the game chiming the same three notes at
       * a player whose crowd has grown thirty-fold.
       */
      const rung = Math.max(0, Math.floor(power))
      for (const [i, step] of [0, 2, 4].entries()) {
        const f = tickFreq(rung + step) * 2
        tone(ctx, {
          freq: f, duration: 0.46 - i * 0.06, gain: vol(0.055),
          type: 'triangle', filter: 6200, delay: i * 0.075
        })
        // The bell. A twelfth above the note (×3) rather than an octave, so it
        // colours the attack instead of thickening the pitch — an octave here
        // read as a second, louder chime rather than as a shine on the first.
        tone(ctx, {
          freq: f * 3, duration: 0.16, gain: vol(0.014),
          type: 'sine', delay: i * 0.075
        })
      }
      // Rising, like the phrase over it. Every other noise sweep in this mixer
      // collapses toward the floor; this one opens, which is what stops the cue
      // reading as an impact.
      noiseBurst(ctx, {
        duration: 0.5, gain: vol(0.03), filterFrom: 2200, filterTo: 9000,
        type: 'bandpass', q: 0.8
      })
      break
    }

    case 'countUp':
      // The result screen's coin tally. Tiny, dry, and pitched up as it runs.
      tone(ctx, { freq: 880 * (1 + power * 0.5), duration: 0.05, gain: vol(0.03), type: 'square', filter: 4000 })
      break

    // ─── Frost Nova ─────────────────────────────────────────────────────────
    //
    // The biggest thing the PLAYER ever does, so it is built like the biggest
    // things the boss does — a sub under a body under a texture — and then given
    // the one quality nothing else in the mix has: a room. Five layers, in the
    // order the ear takes them in:
    //
    //   1. the blast: a sub dropping from 130 to 36 Hz, the "whoomp" the screen
    //      shake is timed to;
    //   2. the wave: noise OPENING upward as the ring leaves the crowd, then a
    //      long bright sweep collapsing behind it as it crosses the screen;
    //   3. the ice forming: a crackle racing out with the ring;
    //   4. the crystal: seven inharmonic bells in E, falling into place — the
    //      part that says "ice" and not "explosion";
    //   5. the held breath: a thin high chord swelling UNDER the reverb and
    //      hanging there, because the world has just stopped and the sound
    //      should stop with it rather than decaying back into the fight.
    case 'frostNova': {
      tone(ctx, { freq: 130, toFreq: 36, duration: 0.7, gain: vol(0.24), type: 'sine' })
      tone(ctx, { freq: 260, toFreq: 70, duration: 0.3, gain: vol(0.08), type: 'triangle', filter: 900 })
      noiseBurst(ctx, { duration: 0.42, gain: vol(0.13), filterFrom: 380, filterTo: 7200, type: 'bandpass', q: 0.8, send: 0.35 })
      noiseBurst(ctx, { duration: 1.1, gain: vol(0.06), filterFrom: 9000, filterTo: 700, type: 'lowpass', delay: 0.18, send: 0.6 })
      crackle(ctx, { count: 22, from: 0.06, to: 0.75, gain: vol(0.07), lo: 2600, hi: 9500, send: 0.3 })
      for (const [i, f] of [2637, 1976, 3136, 1661, 2349, 3951, 1319].entries()) {
        bell(ctx, {
          freq: f * (0.996 + r * 0.008), duration: 0.5 + i * 0.07, gain: vol(0.03),
          delay: 0.04 + i * 0.055, send: 0.7
        })
      }
      for (const f of [659, 988, 1319]) {
        tone(ctx, { freq: f, duration: 1.6, gain: vol(0.018), type: 'sine', delay: 0.12, attack: 0.09, send: 0.8 })
      }
      break
    }

    case 'frostShatter':
      // One body coming apart: glass, not bone. A bright highpassed crack, three
      // tinkles scattered across the top of the band, and a small thud so it
      // still has weight on a phone speaker.
      noiseBurst(ctx, { duration: 0.16, gain: vol(0.085), filterFrom: 9000, filterTo: 2600, type: 'highpass', q: 0.7, send: 0.25 })
      for (let i = 0; i < 3; i++) {
        const f = 2200 + Math.random() * 3400
        tone(ctx, {
          freq: f, toFreq: f * 0.92, duration: 0.07 + Math.random() * 0.12, gain: vol(0.028),
          type: 'triangle', delay: i * 0.018 + Math.random() * 0.02, send: 0.35
        })
      }
      tone(ctx, { freq: 180, toFreq: 70, duration: 0.09, gain: vol(0.05), type: 'sine' })
      break

    case 'frostThaw':
      // Every body's ice going at once: the nova's crystal in reverse — a crack
      // opening UP, a crackle, and the bells FALLING — so the end of the freeze
      // is heard as the same object as its start, coming apart.
      noiseBurst(ctx, { duration: 0.5, gain: vol(0.1), filterFrom: 2400, filterTo: 9000, type: 'bandpass', q: 0.7, send: 0.4 })
      crackle(ctx, { count: 26, from: 0, to: 0.5, gain: vol(0.07), lo: 2000, hi: 8000, send: 0.35 })
      for (const [i, f] of [3951, 3136, 2637, 2093, 1568].entries()) {
        bell(ctx, { freq: f, duration: 0.35, gain: vol(0.026), delay: 0.03 + i * 0.045, send: 0.6 })
      }
      tone(ctx, { freq: 110, toFreq: 48, duration: 0.3, gain: vol(0.09), type: 'sine' })
      break

    // ─── Decoy Flare ────────────────────────────────────────────────────────
    //
    // Panned to the rail it lands on — the one cue in the game with a side,
    // because the one thing it has to say is WHERE.
    case 'decoyThrow':
      // The launcher's pop, and a whistle climbing away from the crowd.
      tone(ctx, { freq: 170, toFreq: 70, duration: 0.14, gain: vol(0.1), type: 'sine' })
      noiseBurst(ctx, { duration: 0.05, gain: vol(0.06), filterFrom: 5200, filterTo: 1600, type: 'bandpass', q: 1.2 })
      noiseBurst(ctx, { duration: 0.42, gain: vol(0.07), filterFrom: 700, filterTo: 3600, type: 'bandpass', q: 1.4, delay: 0.03, pan: pan * 0.6 })
      tone(ctx, { freq: 320, toFreq: 980, duration: 0.4, gain: vol(0.025), type: 'sine', delay: 0.04, pan: pan * 0.6 })
      break

    case 'decoyLit':
      // It caught: a strike, a FWOOSH opening up, a body under both, and the
      // first spit of the flame. The burn loop (`startFlareBurn`) takes over
      // from here.
      noiseBurst(ctx, { duration: 0.06, gain: vol(0.09), filterFrom: 9000, filterTo: 3000, type: 'highpass', pan })
      noiseBurst(ctx, { duration: 0.55, gain: vol(0.13), filterFrom: 500, filterTo: 4200, type: 'bandpass', q: 0.7, pan, send: 0.35 })
      tone(ctx, { freq: 90, toFreq: 45, duration: 0.35, gain: vol(0.11), type: 'sine', pan: pan * 0.4 })
      crackle(ctx, { count: 12, from: 0.05, to: 0.5, gain: vol(0.06), lo: 1800, hi: 6000, pan })
      // A two-step rising call under the fire — "over here" — filtered dark so
      // it is felt as a lure rather than heard as an alarm.
      tone(ctx, { freq: 330, toFreq: 440, duration: 0.3, gain: vol(0.03), type: 'sawtooth', filter: 1500, delay: 0.08, pan, send: 0.45 })
      tone(ctx, { freq: 440, toFreq: 660, duration: 0.42, gain: vol(0.026), type: 'sawtooth', filter: 1800, delay: 0.3, pan, send: 0.45 })
      break

    case 'decoyBurst':
      // The pay-off: a deep blast, a body of fire, a long sizzle and a
      // firework's crackle running out into the room.
      tone(ctx, { freq: 120, toFreq: 32, duration: 0.8, gain: vol(0.24), type: 'sine', pan: pan * 0.4 })
      noiseBurst(ctx, { duration: 0.6, gain: vol(0.16), filterFrom: 4200, filterTo: 180, pan, send: 0.35 })
      noiseBurst(ctx, { duration: 1.1, gain: vol(0.045), filterFrom: 7000, filterTo: 2500, type: 'highpass', q: 0.5, delay: 0.08, pan, send: 0.5 })
      crackle(ctx, { count: 26, from: 0.1, to: 1.0, gain: vol(0.07), lo: 1500, hi: 7000, pan, send: 0.3 })
      break

    default:
      break
  }
}

/**
 * ─── The flare, burning ─────────────────────────────────────────────────────
 *
 * The one cue in the game that LASTS: five seconds of a flame on a parachute,
 * which is exactly as long as the fight is looking at it. A hiss with a flame's
 * flutter on it, a low roar under that, crackles spat across the whole burn and
 * a soft thrum every 0.8 s — the lure's pulse, on the beat of the light pool the
 * renderer pulses on the road.
 *
 * Everything runs into ONE bus, so the burn can be cut the instant the flare
 * goes out early (a stage ending, a wipe) rather than hissing on over a result
 * screen. The shared AudioContext is what an ad suspends, so a burn under an ad
 * pauses with everything else.
 */
let burn: { ctx: AudioContext; bus: GainNode; sources: AudioScheduledSourceNode[] } | null = null

export const startFlareBurn = (seconds: number, pan = 0): void => {
  stopFlareBurn()
  if (!canPlay() || seconds <= 0.4) return
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return
  try {
    const now = ctx.currentTime
    const bus = ctx.createGain()
    bus.gain.setValueAtTime(0.0001, now)
    bus.gain.exponentialRampToValueAtTime(1, now + 0.14)
    bus.gain.setValueAtTime(1, now + seconds - 0.5)
    bus.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
    route(ctx, bus, { pan, send: 0.25 })

    const hiss = ctx.createBufferSource()
    hiss.buffer = getNoise(ctx)
    hiss.loop = true
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 3200
    band.Q.value = 0.6
    const hissGain = ctx.createGain()
    hissGain.gain.value = vol(0.045)
    // The flutter: a flame is never a steady hiss.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 9 + Math.random() * 4
    const depth = ctx.createGain()
    depth.gain.value = vol(0.018)
    lfo.connect(depth).connect(hissGain.gain)
    hiss.connect(band).connect(hissGain).connect(bus)

    const roar = ctx.createBufferSource()
    roar.buffer = getNoise(ctx)
    roar.loop = true
    roar.playbackRate.value = 0.5
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 420
    const roarGain = ctx.createGain()
    roarGain.gain.value = vol(0.07)
    roar.connect(low).connect(roarGain).connect(bus)

    crackle(ctx, { count: Math.round(seconds * 9), from: 0.1, to: seconds - 0.2, gain: vol(0.055), lo: 1600, hi: 7000, dest: bus })
    for (let t = 0.25; t < seconds - 0.3; t += 0.8) {
      tone(ctx, { freq: 78, toFreq: 58, duration: 0.32, gain: vol(0.07), type: 'sine', delay: t, attack: 0.03, dest: bus })
    }

    hiss.start(now)
    roar.start(now)
    lfo.start(now)
    const end = now + seconds + 0.05
    hiss.stop(end)
    roar.stop(end)
    lfo.stop(end)
    burn = { ctx, bus, sources: [hiss, roar, lfo] }
  } catch {
    // Out of nodes: the light on the road is still the whole message.
  }
}

/** Put the flare out now, with a short fade rather than a click. */
export const stopFlareBurn = (): void => {
  const b = burn
  burn = null
  if (!b) return
  try {
    const now = b.ctx.currentTime
    b.bus.gain.cancelScheduledValues(now)
    b.bus.gain.setValueAtTime(Math.max(0.0001, b.bus.gain.value), now)
    b.bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    for (const s of b.sources) s.stop(now + 0.15)
  } catch { /* already stopped */ }
}

/**
 * Play one gameplay cue. Safe to call from the render loop at any density —
 * throttling, mute gating and ad suspension are all handled here.
 *
 * @param power 0..1 intensity hint — or a ladder index for the two cues that
 *              are pitched rather than sized: a step for `gateTick` /
 *              `gateSubTick`, a rung for `squadMilestone`.
 * @param pan   -1 left … 1 right, read only by the cues that have a side (the
 *              flare's). Everything else is centred, as it always was.
 * @param seconds how long the thing the cue describes lasts, read only by the
 *              boss wind-ups, whose textures fit their envelope to the pose
 *              they are sounding (`game/bossWindup.ts`). 0 = the cue's own.
 */
export const playFx = (id: FxSound, power = 0, pan = 0, seconds = 0): void => {
  if (!canPlay()) return
  if (!passesThrottle(id)) return

  const sample = SAMPLE_CUES[id]
  if (sample) {
    playSound(sample[0], sample[1], 0.94 + Math.random() * 0.12)
    // The boss death gets BOTH: the fanfare sample and a synthesised blast
    // under it, because a celebration jingle alone does not feel like a
    // ten-metre monster hitting the floor.
    if (id === 'bossDie') {
      const ctx = getAudioContext()
      if (ctx && ctx.state === 'running') {
        try { synth(ctx, 'bossSlam', 1) } catch { /* node budget — visual carries it */ }
      }
    }
    return
  }

  const ctx = getAudioContext()
  if (!ctx) return
  // A context that has never been unlocked by a gesture stays suspended; the
  // shared `armResumeOnGesture` in useAssets resumes it on the first tap, so we
  // skip until then rather than queueing a backlog of silent voices.
  if (ctx.state !== 'running') return

  try {
    synth(ctx, id, power, pan, seconds)
  } catch {
    // A browser refusing to allocate more nodes is not worth interrupting a
    // frame for — the visual feedback carries the moment on its own.
  }
}

/**
 * Test seam: build one cue into a caller's context — an `OfflineAudioContext`
 * in a browser, to measure what a cue actually peaks at, or a stub in a spec
 * to prove it builds at all. Bypasses the throttle and the mute gates on
 * purpose: those are `playFx`'s, and they are specced where they live.
 */
export const synthCueForTest = (
  ctx: BaseAudioContext, id: FxSound, power = 0, seconds = 0
): void => synth(ctx as AudioContext, id, power, 0, seconds)

/** Warm the synthesis path (build the noise buffer) so the first burst of a
 *  session doesn't pay for a 1.2 s buffer fill mid-frame. */
export const warmAudio = (): void => {
  const ctx = getAudioContext()
  if (ctx) getNoise(ctx)
}
