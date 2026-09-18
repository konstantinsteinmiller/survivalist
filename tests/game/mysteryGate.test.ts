// ─── The face-down door ─────────────────────────────────────────────────────
//
// A black `?` door. What is under it — `+N`, `−N`, `×N`, `÷N` or the shield —
// is DESIGNED (authored on stages 2-15, scheduled by `mysteryPlanFor` above
// them), never rolled at contact. The rules below are the owner's spec of
// 2026-09-18 and each one has a failure mode:
//
//   • rare — at most one face-down bank a stage, on roughly half the stages;
//   • the blind pair (both doors face-down) at most once in any three
//     consecutive stages, and always with one door that pays;
//   • never on a dilemma, never pumpable, the whole bank turns over on commit;
//   • a hidden loss capped at ÷3 (÷2 in a blind pair);
//   • the debut is stage 2's first bank, and it pays;
//   • the shield under a `?` arms the same absorb the shield box does.

import { describe, expect, it, vi } from 'vitest'
import {
  BLIND_DIV_CAP, DOUBLE_MYSTERY_STAGES, MYSTERY_DIV_CAP, MYSTERY_FIRST_STAGE,
  buildTrack, mysteryPlanFor
} from '@/game/track'
import type { GateLeaf, TrackEvent } from '@/game/track'
import { STATE_KEY } from '@/use/useTowerState'

type Bank = Extract<TrackEvent, { kind: 'gates' }>

const LAST = 90

const banksOf = (stage: number): Bank[] =>
  buildTrack(stage).events
    .filter((e): e is Bank => e.kind === 'gates')
    .sort((a, b) => a.y - b.y)

const hidden = (bank: Bank): GateLeaf[] => bank.leaves.filter((l) => l.mystery === true)
const faceDownBanks = (stage: number): Bank[] => banksOf(stage).filter((b) => hidden(b).length > 0)
const isBlindPair = (bank: Bank): boolean =>
  bank.leaves.length === 2 && hidden(bank).length === 2

/** Both doors take something — the one shape a `?` may never land on. */
const isDilemma = (bank: Bank): boolean =>
  bank.leaves.length > 1 && bank.leaves.every((l) => !l.prize && (l.op === 'div' || l.op === 'sub'))

/** What a door is, as a word — `shield` for the prize, the op otherwise. */
const kindOf = (l: GateLeaf): string => (l.prize ? l.prize : l.op)

const pays = (l: GateLeaf): boolean => l.prize !== undefined || l.op === 'add' || l.op === 'mul'

describe('where a face-down door may appear', () => {
  it('debuts on stage 2, on the very first bank, and the `?` pays', () => {
    expect(MYSTERY_FIRST_STAGE).toBe(2)
    expect(faceDownBanks(1)).toHaveLength(0)

    const first = banksOf(2)[0]!
    expect(hidden(first)).toHaveLength(1)
    const q = hidden(first)[0]!
    const readable = first.leaves.find((l) => !l.mystery)!
    // The first `?` a player ever meets is the better door.
    expect(q.op).toBe('add')
    expect(readable.op).toBe('add')
    expect(q.value).toBeGreaterThan(readable.value)
  })

  it('is at most ONE bank on any road', () => {
    for (let stage = 1; stage <= LAST; stage++) {
      expect(faceDownBanks(stage).length, `stage ${stage}`).toBeLessThanOrEqual(1)
    }
  })

  it('is rare: roughly half the stages carry one, and never the whole road', () => {
    let withOne = 0
    let banks = 0
    let faceDown = 0
    for (let stage = 2; stage <= LAST; stage++) {
      const all = banksOf(stage)
      banks += all.length
      faceDown += all.filter((b) => hidden(b).length > 0).length
      if (faceDownBanks(stage).length > 0) withOne++
    }
    const share = withOne / (LAST - 1)
    expect(share).toBeGreaterThan(0.35)
    expect(share).toBeLessThan(0.7)
    // …and per BANK it is a rarity: well under one bank in five.
    expect(faceDown / banks).toBeLessThan(0.2)
  })

  it('is usually ONE door of the bank, with the rest readable', () => {
    let single = 0
    let blind = 0
    for (let stage = 2; stage <= LAST; stage++) {
      for (const bank of faceDownBanks(stage)) {
        if (isBlindPair(bank)) blind++
        else {
          expect(hidden(bank)).toHaveLength(1)
          expect(bank.leaves.length).toBeGreaterThan(1)
          single++
        }
      }
    }
    expect(single).toBeGreaterThan(blind * 2)
  })

  it('prints the blind pair at most once in any three consecutive stages', () => {
    const blindStages: number[] = []
    for (let stage = 1; stage <= LAST; stage++) {
      if (faceDownBanks(stage).some(isBlindPair)) blindStages.push(stage)
    }
    // The authored ones are where the list says, and there ARE some.
    for (const s of DOUBLE_MYSTERY_STAGES) expect(blindStages).toContain(s)
    expect(blindStages.length).toBeGreaterThan(4)
    for (let i = 1; i < blindStages.length; i++) {
      expect(blindStages[i]! - blindStages[i - 1]!, `${blindStages[i - 1]} → ${blindStages[i]}`)
        .toBeGreaterThanOrEqual(3)
    }
  })

  it('never makes a blind pair that can only cost — one door always pays', () => {
    for (let stage = 1; stage <= LAST; stage++) {
      for (const bank of faceDownBanks(stage).filter(isBlindPair)) {
        expect(bank.leaves.some(pays), `stage ${stage}`).toBe(true)
      }
    }
  })

  it('never lands on a bank where every door already takes something', () => {
    for (let stage = 1; stage <= LAST; stage++) {
      for (const bank of faceDownBanks(stage)) expect(isDilemma(bank), `stage ${stage}`).toBe(false)
    }
  })

  it('caps the loss nobody could read', () => {
    for (let stage = 1; stage <= LAST; stage++) {
      for (const bank of faceDownBanks(stage)) {
        const cap = isBlindPair(bank) ? BLIND_DIV_CAP : MYSTERY_DIV_CAP
        for (const l of hidden(bank)) {
          if (l.op === 'div' && !l.prize) expect(l.value, `stage ${stage}`).toBeLessThanOrEqual(cap)
        }
      }
    }
  })

  it('hides all five kinds across the campaign, the shield included', () => {
    const kinds = new Set<string>()
    for (let stage = 2; stage <= LAST; stage++) {
      for (const bank of faceDownBanks(stage)) for (const l of hidden(bank)) kinds.add(kindOf(l))
    }
    expect([...kinds].sort()).toEqual(['add', 'div', 'mul', 'shield', 'sub'])
  })

  it('only ever puts the shield under a `?`, as a `+0` placeholder', () => {
    for (let stage = 1; stage <= LAST; stage++) {
      for (const bank of banksOf(stage)) {
        for (const l of bank.leaves) {
          if (!l.prize) continue
          expect(l.mystery).toBe(true)
          expect(l.op).toBe('add')
          expect(l.value).toBe(0)
        }
      }
    }
  })

  it('is designed, not rolled: the generated road follows a schedule, and replays identically', () => {
    // Nothing above stage 15 is hand-made, so every generated `?` is the one the
    // schedule names — and a stage with no plan prints none.
    for (let stage = 16; stage <= LAST; stage++) {
      if (!mysteryPlanFor(stage)) expect(faceDownBanks(stage), `stage ${stage}`).toHaveLength(0)
    }
    expect(mysteryPlanFor(15)).toBeNull()
    const once = (stage: number) =>
      banksOf(stage).map((b) => b.leaves.map((l) => `${l.mystery ? '?' : ''}${kindOf(l)}${l.value}`))
    for (const stage of [2, 6, 12, 21, 22, 27]) expect(once(stage)).toEqual(once(stage))
  })
})

describe('the door in the world', () => {
  const STEP_MS = 16

  const boot = async (stage: number) => {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ts_stage: stage }))
    vi.resetModules()
    const game = await import('@/use/useSurvivalGame')
    game.startStage(stage)
    return game
  }

  /** Run the road until a face-down door has streamed in. */
  const untilFaceDown = (game: Awaited<ReturnType<typeof boot>>) => {
    for (let i = 0; i < 4000; i++) {
      if (game.phase.value !== 'run') break
      game.steerTo(0)
      game.step(STEP_MS)
      if (game.getGates().some((g) => g.mystery)) break
    }
    return game.getGates().find((g) => g.mystery)
  }

  it('reaches the run with its flag intact, and its real door underneath', async () => {
    const game = await boot(2)
    const faceDown = untilFaceDown(game)
    expect(faceDown).toBeDefined()
    // Stage 2's debut, exactly as authored: a `+6` nobody can read.
    expect(faceDown!.op).toBe('add')
    expect(faceDown!.value).toBe(6)
  })

  it('cannot be pumped, so no fire is spent on a promise', async () => {
    const game = await boot(2)
    const faceDown = untilFaceDown(game)
    expect(faceDown).toBeDefined()

    // Hold it hot for well over a tick's worth of charge. A readable door would
    // have climbed several times over by now.
    const before = faceDown!.value
    for (let i = 0; i < 120; i++) {
      faceDown!.hotFor = 0
      game.step(STEP_MS)
      if (faceDown!.used) break
    }
    expect(faceDown!.value).toBe(before)
    expect(faceDown!.charge).toBe(0)
  })

  it('shows every door of the bank the moment the crowd commits', async () => {
    // Both halves matter. Turning over only the taken door would leave the
    // player unable to tell whether they gambled well; "what was the other one"
    // is most of what makes the next `?` worth taking.
    const game = await boot(2)
    let bankId = -1
    for (let i = 0; i < 4000; i++) {
      if (game.phase.value !== 'run') break
      const faceDown = game.getGates().find((g) => g.mystery && !g.used)
      if (faceDown) {
        bankId = faceDown.bankId
        game.steerTo(faceDown.x)
      } else if (bankId >= 0) {
        break
      } else {
        game.steerTo(0)
      }
      game.step(STEP_MS)
    }
    expect(bankId).toBeGreaterThanOrEqual(0)
    const bank = game.getGates().filter((g) => g.bankId === bankId)
    expect(bank.length).toBeGreaterThan(0)
    expect(bank.every((g) => g.mystery === false)).toBe(true)
  })

  it('arms the shield box\'s absorb when the shield door is taken', async () => {
    // Stage 9 opens on the first shield under a `?`.
    const game = await boot(9)
    expect(game.bulwarkReady()).toBe(false)
    const fx = await import('@/use/useVfx')
    fx.drainFx()
    const seen: import('@/use/useVfx').FxEvent[] = []
    let taken = false
    for (let i = 0; i < 4000 && !taken; i++) {
      if (game.phase.value !== 'run') break
      const shield = game.getGates().find((g) => g.prize === 'shield' && !g.used)
      game.steerTo(shield ? shield.x : 0)
      game.step(STEP_MS)
      seen.push(...fx.drainFx())
      taken = game.getGates().some((g) => g.prize === 'shield' && g.used)
    }
    expect(taken).toBe(true)
    expect(game.bulwarkReady()).toBe(true)
    // The door gave up its prize, not a `+0`: no payout text, no survivors.
    expect(seen.some((e) => e.kind === 'gatePass' && e.prize === 'shield' && e.gain === 0)).toBe(true)
    expect(seen.some((e) => e.kind === 'bulwarkTake')).toBe(true)
  })
})
