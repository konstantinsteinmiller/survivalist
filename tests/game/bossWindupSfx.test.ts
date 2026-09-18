// ─── The wind-up you can hear ───────────────────────────────────────────────
//
// Every boss wind-up has sounds on the cast's own clock (`windupBeats`), fired
// by the renderer's pool steppers through `advanceBeats`. The two properties
// that matter to a player are pinned here without a canvas or a speaker:
//
//   • a beat fires EXACTLY ONCE, on the first step at or past its moment — the
//     throw's whoosh on the frame the rock leaves the hand, however the frames
//     fall, and never again;
//   • a frozen cast (a step that does not move `t`) fires nothing.
//
// …and the cues themselves build, and fit their envelope to the pose they are
// sounding: a gather handed 0.38 s ends at 0.38 s, not at a fixed length.

import { describe, expect, it } from 'vitest'
import {
  BOLT_THRUST_AT, METEOR_RELEASE, RAKE_STRIKE_AT, SHOCK_DROP_AT,
  advanceBeats, chargeDashAt, windupBeats,
  type WindupBeat, type WindupCue, type WindupKind
} from '@/game/bossWindup'
import { CHARGE_DASH_S, DRAIN_HOLD_S } from '@/game/threats'

/** Step a cast from 0 past its end in uneven frames, recording each beat's
 *  firing time. A seeded LCG, so the frame pattern is the same every run. */
const drive = (
  beats: readonly WindupBeat[], life: number, seed = 7, frozenFrames: number[] = []
): Array<{ cue: WindupCue; at: number; firedAt: number }> => {
  let x = seed
  const rnd = (): number => {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    return x / 0x7fffffff
  }
  const fired: Array<{ cue: WindupCue; at: number; firedAt: number }> = []
  let t = 0
  let next = 0
  let frame = 0
  while (t < life + 0.4) {
    // 8–48 ms frames, the spread a throttled phone actually delivers.
    const dt = frozenFrames.includes(frame) ? 0 : 0.008 + rnd() * 0.04
    t += dt
    frame++
    next = advanceBeats(beats, next, t, (b) => fired.push({ cue: b.cue, at: b.atS, firedAt: t }))
  }
  return fired
}

describe('the beats of a wind-up', () => {
  it('throws the meteor on the release, once', () => {
    const life = 1
    const beats = windupBeats('meteor', life)
    expect(beats.map((b) => b.cue)).toEqual(['gather', 'hurl'])
    const hurl = beats.find((b) => b.cue === 'hurl')!
    expect(hurl.atS).toBeCloseTo(life * METEOR_RELEASE, 9)
    // The flight the whistle has to fill is the rest of the wind-up.
    expect(hurl.seconds).toBeCloseTo(life * (1 - METEOR_RELEASE), 9)

    for (const seed of [1, 7, 42, 1234, 99991]) {
      const fired = drive(beats, life, seed)
      expect(fired.filter((f) => f.cue === 'hurl')).toHaveLength(1)
      expect(fired.filter((f) => f.cue === 'gather')).toHaveLength(1)
      const h = fired.find((f) => f.cue === 'hurl')!
      // On the first frame at or past the release — never early, and at most
      // one frame (≤ 48 ms here) late.
      expect(h.firedAt).toBeGreaterThanOrEqual(life * METEOR_RELEASE)
      expect(h.firedAt - life * METEOR_RELEASE).toBeLessThan(0.05)
    }
  })

  it('fires every beat of every wind-up exactly once, in order', () => {
    const kinds: WindupKind[] = ['meteor', 'shock', 'charge', 'rake', 'heal', 'bolt', 'summon', 'drain']
    for (const kind of kinds) {
      for (const life of [0.4, 0.7, 1, 1.7]) {
        const beats = windupBeats(kind, life, { dashS: CHARGE_DASH_S, raiseS: 1, holdS: DRAIN_HOLD_S })
        const fired = drive(beats, life, 3)
        expect(fired.map((f) => f.cue), `${kind} @ ${life}`).toEqual(beats.map((b) => b.cue))
        for (const f of fired) expect(f.firedAt).toBeGreaterThanOrEqual(f.at)
      }
    }
  })

  it('fires nothing while the cast is frozen, and picks up where it stopped', () => {
    // Frost Nova holds the hostile clocks: the renderer steps the pools by
    // zero, and a zero step must not play the next beat early.
    const life = 1
    const beats = windupBeats('meteor', life)
    let next = advanceBeats(beats, 0, 0.3, () => {})
    expect(next).toBe(1) // the gather, at 0
    let fired = 0
    for (let i = 0; i < 100; i++) next = advanceBeats(beats, next, 0.3, () => fired++)
    expect(fired).toBe(0)
    next = advanceBeats(beats, next, 0.4, () => fired++)
    expect(fired).toBe(1)
    expect(next).toBe(beats.length)
  })

  it('puts the dash on the frame the simulation starts moving the body', () => {
    const life = 1.6
    const beats = windupBeats('charge', life, { dashS: CHARGE_DASH_S })
    const dash = beats.find((b) => b.cue === 'dash')!
    expect(dash.atS).toBeCloseTo(life - CHARGE_DASH_S, 9)
    expect(dash.atS).toBeCloseTo(life * chargeDashAt(life, CHARGE_DASH_S), 9)
    expect(dash.seconds).toBeCloseTo(CHARGE_DASH_S, 9)
    // …and the coil fills everything before it.
    expect(beats[0]!.cue).toBe('coil')
    expect(beats[0]!.seconds).toBeCloseTo(life - CHARGE_DASH_S, 9)
  })

  it('drops the stomp where the pose starts to fall', () => {
    const beats = windupBeats('shock', 1.2)
    expect(beats.find((b) => b.cue === 'drop')!.atS).toBeCloseTo(1.2 * SHOCK_DROP_AT, 9)
  })

  it('whets a crossrake\'s second pass AFTER the first strike, not on top of it', () => {
    // Both passes go on the road together; the second lives CROSSRAKE_GAP_S
    // longer and raises its claws only for the last second (`RAKE_POSE_S`).
    const first = windupBeats('rake', 1, { raiseS: 1 })
    const second = windupBeats('rake', 1.7, { raiseS: 1 })
    const firstStrike = first.find((b) => b.cue === 'strike')!.atS
    const secondWhet = second.find((b) => b.cue === 'whet')!.atS
    expect(first[0]!.atS).toBe(0)
    expect(firstStrike).toBeCloseTo(1 - (1 - RAKE_STRIKE_AT), 9)
    expect(secondWhet).toBeCloseTo(0.7, 9)
    expect(secondWhet).toBeLessThan(1) // …but still before the first rake LANDS
  })

  it('throws the bolt on the last frame of its tell', () => {
    const life = 0.7
    const beats = windupBeats('bolt', life)
    expect(beats.map((b) => b.cue)).toEqual(['charge', 'zap'])
    expect(beats[0]!.seconds).toBeCloseTo(life * BOLT_THRUST_AT, 9)
    expect(beats[1]!.atS).toBe(life)
    // Reached exactly at `t = life`, which is the frame the tell is spliced.
    expect(advanceBeats(beats, 1, life, () => {})).toBe(2)
  })
})

// ─── The cues build ─────────────────────────────────────────────────────────

/** The smallest AudioContext the synth path touches, recording when every
 *  source is scheduled to stop. */
const stubContext = () => {
  const stops: number[] = []
  const param = () => ({
    value: 0,
    setValueAtTime() { return this },
    exponentialRampToValueAtTime() { return this },
    linearRampToValueAtTime() { return this }
  })
  const node = () => ({ connect: (n: unknown) => n, disconnect() {} })
  const source = () => ({
    ...node(), frequency: param(), playbackRate: param(), type: 'sine', buffer: null, loop: false,
    start() {}, stop(at: number) { stops.push(at) }
  })
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    destination: node(),
    createOscillator: source,
    createBufferSource: source,
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', Q: param(), frequency: param() }),
    createGain: () => ({ ...node(), gain: param() }),
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createConvolver: () => ({ ...node(), buffer: null }),
    createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) })
  }
  return { ctx, stops }
}

describe('the wind-up cues', () => {
  const CUES = [
    'windGather', 'windHurl', 'windCoil', 'bossCharge', 'windRise', 'windDrop',
    'windWhet', 'windStrike', 'windHeal', 'windBolt', 'windZap', 'windCall'
  ] as const

  it('every one builds a voice', async () => {
    const { synthCueForTest } = await import('@/use/useGameAudio')
    for (const id of CUES) {
      const { ctx, stops } = stubContext()
      expect(() => synthCueForTest(ctx as unknown as BaseAudioContext, id, 0, 0.5), id).not.toThrow()
      expect(stops.length, id).toBeGreaterThan(0)
    }
  })

  it('fits the textures to the pose they are sounding', async () => {
    // A raging boss winds up faster; its gather must end with its throw, not
    // run on over the flight.
    const { synthCueForTest } = await import('@/use/useGameAudio')
    for (const id of ['windGather', 'windCoil', 'windRise', 'windHeal', 'windBolt', 'windCall'] as const) {
      const short = stubContext()
      const long = stubContext()
      synthCueForTest(short.ctx as unknown as BaseAudioContext, id, 0, 0.4)
      synthCueForTest(long.ctx as unknown as BaseAudioContext, id, 0, 1.2)
      const end = (s: number[]) => Math.max(...s)
      expect(end(short.stops), id).toBeLessThan(0.4 + 0.1)
      expect(end(long.stops), id).toBeGreaterThan(1.2)
    }
  })
})

describe('the drain is heard in two halves', () => {
  it('gathers under the raised arms, then pulls ON the beat for exactly the hold', () => {
    const life = 1.7
    const beats = windupBeats('drain', life, { holdS: DRAIN_HOLD_S })
    expect(beats.map((b) => b.cue)).toEqual(['siphon', 'drain'])
    expect(beats[0]!.atS).toBe(0)
    // The pull is the hit, so it sounds on the frame the beam lands — the end of
    // the cast — and it lasts as long as the beam is still taking bodies.
    expect(beats[1]!.atS).toBeCloseTo(life, 9)
    expect(beats[1]!.seconds).toBeCloseTo(DRAIN_HOLD_S, 9)
  })
})
