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
  | 'foeDie' | 'unitLost' | 'coin' | 'eliteSpawn' | 'eliteSweep' | 'eliteDie'
  | 'bossHit' | 'bossGuard' | 'bossRage' | 'bossSlam' | 'bossDie' | 'stageClear' | 'wipe'
  | 'countUp'

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
  // A three-leaf bank dismisses TWO leaves, spaced by the shockwave's travel
  // time (~90–200 ms). The budget has to let the whole cascade through — the
  // cascade IS the cue — while still refusing a second bank's worth on top of
  // it, which is what a player weaving through back-to-back banks would trigger.
  gateDismiss: { minGapMs: 40, maxPerWindow: 3, windowMs: 600 }
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

interface NoiseOpts {
  duration: number
  gain: number
  /** Filter sweep, Hz. */
  filterFrom: number
  filterTo: number
  type?: BiquadFilterType
  q?: number
  delay?: number
}

/** A filtered noise burst — the backbone of impacts, bursts and debris. */
const noiseBurst = (ctx: AudioContext, o: NoiseOpts): void => {
  const src = ctx.createBufferSource()
  src.buffer = getNoise(ctx)
  src.playbackRate.value = 0.85 + Math.random() * 0.3

  const filter = ctx.createBiquadFilter()
  filter.type = o.type ?? 'lowpass'
  filter.Q.value = o.q ?? 1
  const now = ctx.currentTime + (o.delay ?? 0)
  filter.frequency.setValueAtTime(o.filterFrom, now)
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.filterTo), now + o.duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(o.gain, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + o.duration)

  src.connect(filter).connect(gain).connect(ctx.destination)
  src.start(now)
  src.stop(now + o.duration + 0.02)
}

interface ToneOpts {
  freq: number
  toFreq?: number
  duration: number
  gain: number
  type?: OscillatorType
  delay?: number
  /** Optional lowpass to take the edge off a raw saw/square. */
  filter?: number
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
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), now + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + o.duration)

  let node: AudioNode = osc
  if (o.filter) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = o.filter
    osc.connect(f)
    node = f
  }
  node.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + o.duration + 0.02)
}

// ─── Cue definitions ────────────────────────────────────────────────────────

const { playSound } = useSounds()

/** Cues that map cleanly onto a shipped sample: `[file, volumeRatio]`. */
const SAMPLE_CUES: Partial<Record<FxSound, [string, number]>> = {
  coin: ['coin-pickup', 0.05],
  stageClear: ['celebration-1', 0.09],
  bossDie: ['celebration-3', 0.1],
  wipe: ['lose', 0.11],
  damageUp: ['level-up', 0.06]
}

/**
 * Pentatonic ladder for the gate tick.
 *
 * A chromatic run up 40 semitones is unbearable; a pentatonic one is a melody
 * no matter where the player stops pumping. It wraps every octave, so a gate
 * pushed to +30 keeps climbing in feel without leaving the audible band.
 */
const PENTATONIC = [0, 2, 4, 7, 9]
const tickFreq = (step: number): number => {
  const n = Math.max(0, Math.floor(step))
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
const synth = (ctx: AudioContext, id: FxSound, power: number): void => {
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
      const f = tickFreq(Math.max(0, 26 - power)) * 0.5
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

    case 'bossSlam':
      // Sub thump + wide body + a long dark tail. Pairs with the screen shake.
      tone(ctx, { freq: 110, toFreq: 30, duration: 0.45, gain: vol(0.22), type: 'sine' })
      noiseBurst(ctx, { duration: 0.38, gain: vol(0.16), filterFrom: 3000, filterTo: 160 })
      noiseBurst(ctx, { duration: 0.8, gain: vol(0.06), filterFrom: 800, filterTo: 90 })
      break

    case 'countUp':
      // The result screen's coin tally. Tiny, dry, and pitched up as it runs.
      tone(ctx, { freq: 880 * (1 + power * 0.5), duration: 0.05, gain: vol(0.03), type: 'square', filter: 4000 })
      break

    default:
      break
  }
}

/**
 * Play one gameplay cue. Safe to call from the render loop at any density —
 * throttling, mute gating and ad suspension are all handled here.
 *
 * @param power 0..1 (or a step index for `gateTick`) intensity hint.
 */
export const playFx = (id: FxSound, power = 0): void => {
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
    synth(ctx, id, power)
  } catch {
    // A browser refusing to allocate more nodes is not worth interrupting a
    // frame for — the visual feedback carries the moment on its own.
  }
}

/** Warm the synthesis path (build the noise buffer) so the first burst of a
 *  session doesn't pay for a 1.2 s buffer fill mid-frame. */
export const warmAudio = (): void => {
  const ctx = getAudioContext()
  if (ctx) getNoise(ctx)
}
