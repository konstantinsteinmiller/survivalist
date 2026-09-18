import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildTrack } from '@/game/track'
import { STAGE_RUN_BLEND_TO, legacyStageLength, stageLength } from '@/game/survival'

/**
 * ─── Stages 30+ are frozen ──────────────────────────────────────────────────
 *
 * The 2026-09-18 pass lengthened and redesigned stages 2-29 (owner: "all
 * stages 2-XX to have a similar length to stage 1, WITHOUT increasing the
 * length of later stages (30+)"). `stageLength` converges onto the legacy curve
 * at `STAGE_RUN_BLEND_TO` = 30, and every generator change made for the longer
 * middle road is guarded to stage < 30 — so from 30 on the road has to be the
 * very road a player met before the pass, prop for prop.
 *
 * A length check alone would not prove that. The generator draws the whole
 * stage from ONE seeded stream, so a new roll anywhere in the beat loop — even
 * one that almost always declines — re-rolls every stage it runs on (see the
 * RNG-stream note on `Beat` in track.ts). The only honest guard is a snapshot of
 * the events themselves: sha256 of `JSON.stringify(buildTrack(s).events)`,
 * first 16 hex characters, taken from the COMMITTED generator (f83b5cd) before
 * any of the pass's edits landed.
 *
 * If this fails, do not re-baseline: find the change that leaked past its
 * `stage < 30` guard. The one legitimate reason to re-pin is a deliberate,
 * owner-approved change to the late game.
 */
const FROZEN: Readonly<Record<number, string>> = {
  30: '93d2f877c5e5f1ee', 31: '2fa594417ecdb1a5', 32: '444666a63d9c908a',
  33: '7df679fc6ee30700', 34: 'be7d6fca0c7fe8bf', 35: '7738c3a46a8023c5',
  36: '12380c22ea515820', 37: '883f6e44ac6d92f3', 38: 'bd336de734c23660',
  39: '7973d2c550f23641', 40: 'e16e0c3284fe718b', 41: 'bd06a15c0921b369',
  42: '757d129db207320f', 43: '118fcdbac3e89e48', 44: '1a8eff211f0bf55d',
  45: 'f8e15b6d5975bff6', 46: '84119acdd0e06de2', 47: '499054c37bca81ea',
  48: '93dff66de5d7bc12', 49: '882f07c42b67dd4b', 50: '69a7d57875078e43',
  51: 'bc5655d46bcdd947', 52: '339724d4764a6619', 53: '38556e3db2952509',
  54: 'a597861f1b206763', 55: 'f9a92fe4e7ef272d', 56: 'db430efccae5ff29',
  57: '6903891d47f603cc', 58: 'd989a63b36119e49', 59: 'e904a56515f45011',
  60: 'a7215ba3b68f64aa'
}

const hashOf = (stage: number): string =>
  createHash('sha256').update(JSON.stringify(buildTrack(stage).events)).digest('hex').slice(0, 16)

describe('stages 30+ are the road they were before the 2026-09-18 pass', () => {
  it('runs the legacy length from the blend point on', () => {
    expect(STAGE_RUN_BLEND_TO).toBe(30)
    for (let s = STAGE_RUN_BLEND_TO; s <= 60; s++) {
      expect(stageLength(s), `stage ${s}`).toBe(legacyStageLength(s))
    }
  })

  it('builds every stage 30-60 prop for prop as before', () => {
    const drifted: string[] = []
    for (const [stage, hash] of Object.entries(FROZEN)) {
      const now = hashOf(Number(stage))
      if (now !== hash) drifted.push(`${stage}: ${hash} → ${now}`)
    }
    expect(drifted, `stages 30+ changed:\n${drifted.join('\n')}`).toEqual([])
  })
})
