import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stageHasWeapon, weaponForStage } from '@/game/weapons'

/**
 * Staged art loading: what the splash holds for is derived from the stage the
 * player is about to play, not listed — so a new player waits for a stage's
 * worth of bitmaps and a returning one waits for THEIR stage's cast.
 */

let stage = 1
/** The stage-3 weapon pick on the fake save, or none. */
let pick: string | null = null
vi.mock('@/use/useTowerState', () => ({
  getState: (key: string, fallback: unknown) =>
    key === 'ts_weapon_pick' ? (pick ?? fallback) : (stage ?? fallback)
}))

const trackImages = (): string[] => {
  const requested: string[] = []
  class FakeImage {
    decoding = 'auto'
    naturalWidth = 0
    addEventListener(): void { /* never fires */ }
    set src(value: string) { requested.push(value) }
    get src(): string { return '' }
  }
  vi.stubGlobal('Image', FakeImage as unknown as typeof Image)
  return requested
}

const load = async (artOn: boolean) => {
  vi.resetModules()
  vi.stubEnv('VITE_ENABLE_ART_OVERRIDES', artOn ? 'true' : '')
  return import('@/game/artPreload')
}

const has = (wants: readonly (readonly [string, string])[], kind: string, id: string): boolean =>
  wants.some(([k, i]) => k === kind && i === id)

/** Let the microtask queue and one macrotask drain. */
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

/** Records every request AND settles it, so an awaited tier can finish. */
const trackSettlingImages = (): string[] => {
  const requested: string[] = []
  class FakeImage extends EventTarget {
    decoding = 'auto'
    naturalWidth = 0
    private _src = ''
    get src(): string { return this._src }
    set src(value: string) {
      this._src = value
      requested.push(value)
      setTimeout(() => {
        this.naturalWidth = 64
        this.dispatchEvent(new Event('load'))
      }, 0)
    }
  }
  vi.stubGlobal('Image', FakeImage as unknown as typeof Image)
  return requested
}

/** Pretend the connection reports Data Saver. Cleared in `beforeEach`. */
const stubDataSaver = (): void => {
  Object.defineProperty(navigator, 'connection', {
    value: { saveData: true }, configurable: true
  })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
  localStorage.removeItem('artOverrides')
  delete (navigator as { connection?: unknown }).connection
  stage = 1
  pick = null
})

describe('tier 0 — behind the splash', () => {
  it('is a stage\'s worth, not the cast: a new player waits for stage 1', async () => {
    stage = 1
    const m = await load(true)
    const t0 = m.criticalArtWants()
    expect(has(t0, 'hero', 'teal')).toBe(true)
    expect(has(t0, 'monster', 'grumpling')).toBe(true)
    expect(has(t0, 'bg', 'ridge-far')).toBe(true)
    // The road tile is drawn, never painted, so it is never fetched.
    expect(has(t0, 'bg', 'lane')).toBe(false)
    expect(has(t0, 'prop', 'crate-damage')).toBe(true)
    expect(has(t0, 'round', 'tracer')).toBe(true)
    // The shop button and the grenade button are on screen from the first second.
    expect(has(t0, 'ui', 'chest')).toBe(true)
    expect(has(t0, 'ui', 'skill-grenade')).toBe(true)
    // The rocket's first box is stage 8's — see `weaponForStage`.
    expect(has(t0, 'round', 'rocket')).toBe(false)
    // Stage 7's brute, stage 3's bill door and the stage-6 arena's keg are not
    // on stage 1's screen and must not be on its splash.
    expect(has(t0, 'monster', 'snaggletusk')).toBe(false)
    expect(has(t0, 'gate', 'frame-sub')).toBe(false)
    expect(has(t0, 'prop', 'barrel')).toBe(false)
    expect(t0.length).toBeLessThan(40)
  })

  it('follows a returning player to their own stage', async () => {
    stage = 7
    const m = await load(true)
    const t0 = m.criticalArtWants()
    expect(m.resumeStage()).toBe(7)
    expect(has(t0, 'monster', 'snaggletusk')).toBe(true)
    expect(has(t0, 'gate', 'frame-sub')).toBe(true)
    // The crown belongs to an ELITE, which is a midpoint and not an opening —
    // so it follows the splash rather than holding it.
    expect(has(t0, 'ui', 'crown')).toBe(false)
    expect(has(m.earlyArtWants(), 'ui', 'crown')).toBe(true)
  })

  it('holds for the first SCREEN: the squad, the gates, their post, the pickups', async () => {
    // The list the splash is allowed to wait on, stated as the thing it is:
    // what a first-time player is looking at in the opening seconds.
    stage = 1
    const m = await load(true)
    const t0 = m.criticalArtWants()
    for (const o of ['teal', 'amber', 'violet']) expect(has(t0, 'hero', o), o).toBe(true)
    // The gates, and the divider post between two leaves — painted frames with
    // a grey post between them read as a half-finished gate.
    expect(has(t0, 'gate', 'frame-add')).toBe(true)
    expect(has(t0, 'gate', 'frame-mul')).toBe(true)
    expect(has(t0, 'prop', 'pillar')).toBe(true)
    // Both pickup crates and the coin.
    expect(has(t0, 'prop', 'crate-damage')).toBe(true)
    expect(has(t0, 'prop', 'crate-rate')).toBe(true)
    expect(has(t0, 'prop', 'coin')).toBe(true)
    // The grenade button is on screen from the first second, so is its round.
    expect(has(t0, 'round', 'grenade')).toBe(true)
  })

  it('never holds for a beat the player has not reached yet', async () => {
    // Stage 6 carries a weapon puzzle, an elite and a boss. None of the three
    // is on the first screen, so none of them may hold it.
    stage = 6
    const m = await load(true)
    const t0 = m.criticalArtWants()
    for (const id of ['lever-post', 'lever-arm', 'guard-plate', 'weapon-box', 'weapon-box-open']) {
      expect(has(t0, 'prop', id), id).toBe(false)
    }
    expect(has(t0, 'ui', 'crown')).toBe(false)
    // …and what a boss or a miniboss throws is all tier 1 too.
    for (const id of ['roller', 'bomb', 'bolt-gunner', 'meteor', 'bolt-boss']) {
      expect(has(t0, 'round', id), id).toBe(false)
    }
    expect(has(t0, 'fx', 'guard')).toBe(false)
  })

  it('leaves the boss OUT of the splash, and picks it up first thing after', async () => {
    stage = 6
    const m = await load(true)
    const { bossDesign, rosterDesigns } = await import('@/game/foes')
    const boss = bossDesign(6)
    const t1 = m.earlyArtWants()
    // Every boss design in the campaign so far is ALSO a roster design — a
    // stage's boss is the creep it has been fighting, at boss scale — so tier 0
    // legitimately carries it as a road foe and tier 1 has nothing to add.
    // The split still has to exist: the day `BOSS_DESIGNS` names something the
    // roster does not, the splash must not silently grow by a strip.
    expect(rosterDesigns(6)).toContain(boss)
    expect(has(t1, 'monster', boss)).toBe(false)
    // The proof the rule is real: tier 0 asks for the roster, not `stageDesigns`.
    const t0 = m.criticalArtWants().filter(([k]) => k === 'monster').map(([, id]) => id)
    expect([...t0].sort()).toEqual([...rosterDesigns(6)].sort())
  })

  it('treats a broken save as a new player', async () => {
    stage = Number.NaN
    const m = await load(true)
    expect(m.resumeStage()).toBe(1)
  })
})

describe('tiers 1 and 2', () => {
  it('puts the stage\'s own threats and the next stage\'s newcomers first, without repeating tier 0', async () => {
    stage = 6
    const m = await load(true)
    const t0 = new Set(m.criticalArtWants().map(([k, i]) => `${k}/${i}`))
    const t1 = m.earlyArtWants()
    for (const [k, i] of t1) expect(t0.has(`${k}/${i}`)).toBe(false)
    // Stage 6's arena has barrels, and stage 7 brings the brutes. Stage 6's
    // own boss is the summoner, which is always the Marrow Knight — already
    // in tier 0 as a husk design — so both brutes are stage-7 newcomers here.
    expect(has(t1, 'prop', 'barrel')).toBe(true)
    expect(has(t1, 'monster', 'thornwick')).toBe(true)
    expect(has(t1, 'monster', 'snaggletusk')).toBe(true)
    // The grenade is tier 0 now — its button is on screen from the first
    // second, so the round behind it is too.
    expect(has(t1, 'round', 'grenade')).toBe(false)
    // The shield's button and the banner the stage ends on follow the splash.
    expect(has(t1, 'ui', 'skill-shield')).toBe(true)
    expect(has(t1, 'ui', 'ribbon')).toBe(true)
    // Stage 6's box holds the ROCKET — the first puzzle stage (4) deals the
    // gatling, the weapon that does not also teach a new verb, and the launcher
    // is the one after. So stage 6 needs the rocket painted, and the box in
    // both its states.
    expect(has(t1, 'round', 'rocket')).toBe(true)
    expect(has(t1, 'prop', 'weapon-box')).toBe(true)
  })

  it('fetches the rocket only for the stages whose box holds it', async () => {
    // Stage 1: no box and no pick yet — but its boss drops the launcher the next
    // road is run with (`BOSS_REWARD_STAGE`), so the round is wanted already.
    // Tier 1 only: the splash still never holds for it (see tier 0 above).
    stage = 1
    let m = await load(true)
    expect(has(m.earlyArtWants(), 'round', 'rocket')).toBe(true)
    expect(has(m.criticalArtWants(), 'round', 'rocket')).toBe(false)
    // Stage 2: the weapon choice comes at the end of this road and stage 3
    // starts the instant a card is tapped — so the rocket is fetched in case.
    stage = 2
    m = await load(true)
    expect(has(m.earlyArtWants(), 'round', 'rocket')).toBe(true)
    // Stage 5 carries no puzzle at all, but stage 6 — the next — is the
    // rocket's first box, and tier 1 covers the stage after this one.
    stage = 5
    m = await load(true)
    expect(has(m.earlyArtWants(), 'round', 'rocket')).toBe(true)
    // …and every stage's answer is the deal itself: tier 1 covers this road and
    // the next, so the round is wanted exactly when one of the two deals it.
    // Written against `weaponForStage` rather than against a list of stage
    // numbers, because the rotation grew from two weapons to six and a list
    // would have to be rewritten every time one moves.
    for (const s of [7, 8, 9, 10, 11, 12]) {
      stage = s
      m = await load(true)
      const dealt = (stageHasWeapon(s) && weaponForStage(s) === 'rocket')
        || (stageHasWeapon(s + 1) && weaponForStage(s + 1) === 'rocket')
      expect(has(m.earlyArtWants(), 'round', 'rocket'), `stage ${s}`).toBe(dealt)
    }
  })

  it('fetches the weapon choice\'s cards only until the player has chosen', async () => {
    stage = 1
    let m = await load(true)
    expect(has(m.earlyArtWants(), 'ui', 'weapon-card-rocket')).toBe(true)
    expect(has(m.earlyArtWants(), 'ui', 'weapon-card-gatling')).toBe(true)
    // …never on the splash: the reveal is a minute away.
    expect(has(m.criticalArtWants(), 'ui', 'weapon-card-rocket')).toBe(false)
    // A player who chose the gatling never sees the cards again, and needs no
    // rocket for stage 3.
    pick = 'gatling'
    stage = 3
    m = await load(true)
    expect(has(m.earlyArtWants(), 'ui', 'weapon-card-rocket')).toBe(false)
    expect(has(m.earlyArtWants(), 'round', 'rocket')).toBe(false)
    // One who chose the launcher rides stage 3 with it.
    pick = 'rocket'
    m = await load(true)
    expect(has(m.earlyArtWants(), 'round', 'rocket')).toBe(true)
    // A save that says something that is not a weapon is a save with no pick.
    pick = 'crossbow'
    stage = 2
    m = await load(true)
    expect(has(m.earlyArtWants(), 'ui', 'weapon-card-gatling')).toBe(true)
  })

  it('never holds the splash for a box, and fetches one the next road carries', async () => {
    // The rule is about the TIER, not about the stage: a box is never tier 0,
    // because nothing a minute down the road may cost a first paint. Tier 1 is
    // the idle slot and is exactly where the next road's furniture belongs.
    //
    // Stage 1's tier 1 covers stage 2, which carries the weapon GIFT
    // (`WEAPON_GIFT_STAGE`) — so the box IS wanted there, one road ahead, the
    // same way stage 3's idle slot reaches for stage 4's puzzle.
    stage = 1
    const m = await load(true)
    const t0 = new Set(m.criticalArtWants().map(([k, i]) => `${k}/${i}`))
    expect(t0.has('prop/weapon-box'), 'the splash waited for a weapon box').toBe(false)
    expect(has(m.earlyArtWants(), 'prop', 'weapon-box'),
      'stage 2 carries the gift and stage 1 never fetched its art').toBe(true)
    // …but ONLY the box. The gift has no levers, no cover and no armour, so
    // queueing that furniture would be four files fetched for nothing.
    expect(has(m.earlyArtWants(), 'prop', 'lever-post')).toBe(false)
    expect(has(m.earlyArtWants(), 'prop', 'guard-plate')).toBe(false)
    // Stage 3's idle slot DOES reach for stage 4's box: it is the next road,
    // and the banner is about to promise it — with the levers this time.
    stage = 3
    const n = await load(true)
    expect(new Set(n.criticalArtWants().map(([k, i]) => `${k}/${i}`)).has('prop/weapon-box')).toBe(false)
    expect(has(n.earlyArtWants(), 'prop', 'weapon-box')).toBe(true)
    expect(has(n.earlyArtWants(), 'prop', 'lever-post')).toBe(true)
  })

  it('reaches the puzzle before the boss, in the order the road does', async () => {
    stage = 6
    const m = await load(true)
    const t1 = m.earlyArtWants().map(([k, i]) => `${k}/${i}`)
    const at = (key: string): number => t1.indexOf(key)
    // The levers are the one thing the beat asks the player to NOTICE, and the
    // beat is on the road before the arena is — so it is fetched before what
    // the boss throws, and both before the next stage's newcomers.
    expect(at('prop/lever-post')).toBeGreaterThanOrEqual(0)
    expect(at('prop/lever-post')).toBeLessThan(at('prop/weapon-box'))
    expect(at('prop/weapon-box')).toBeLessThan(at('prop/barrel'))
    expect(at('prop/barrel')).toBeLessThan(at('monster/thornwick'))
  })

  it('skips the final sweep when the connection says data saver', async () => {
    const requested = trackSettlingImages()
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => { cb(); return 1 })
    stubDataSaver()
    stage = 1
    const m = await load(true)
    await m.preloadRemainingArt()

    // Tier 1 is what is on THIS road and still goes out in full…
    for (const [, id] of m.earlyArtWants()) {
      expect(requested.some((u) => u.includes(`/${id}.webp`)), id).toBe(true)
    }
    // …and tier 2 — art for stages the player may never reach — does not.
    // Data saver is an explicit setting, and the procedural renderer is
    // precisely the fallback it is asking for.
    const wanted = new Set([
      ...m.criticalArtWants().map(([k, i]) => `${k}/${i}`),
      ...m.earlyArtWants().map(([k, i]) => `${k}/${i}`)
    ])
    const swept = m.allArtWants()
      .filter(([k, i]) => !wanted.has(`${k}/${i}`))
      .filter(([, id]) => requested.some((u) => u.includes(`/${id}.webp`)))
    expect(swept).toEqual([])
  })

  it('runs the final sweep when it does not', async () => {
    const requested = trackSettlingImages()
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => { cb(); return 1 })
    stage = 1
    const m = await load(true)
    await m.preloadRemainingArt()
    // The promise resolves only once the LAST painting has settled — which is
    // what lets `useAssets` hold the SFX decode behind it.
    for (const [, id] of m.allArtWants()) {
      expect(requested.some((u) => u.includes(`/${id}.webp`)), id).toBe(true)
    }
  })

  it('sweeps every painting in the end, so nothing is orphaned', async () => {
    const m = await load(true)
    const { ART_CATALOGUE } = await import('@/game/artCatalogue')
    const { allMonsterIds } = await import('@/game/monsterSprites')
    const all = m.allArtWants()
    for (const [kind, ids] of Object.entries(ART_CATALOGUE)) {
      for (const id of ids) expect(has(all, kind, id)).toBe(true)
    }
    for (const id of allMonsterIds()) expect(has(all, 'monster', id)).toBe(true)
    expect(new Set(all.map(([k, i]) => `${k}/${i}`)).size).toBe(all.length)
  })

  it('requests nothing at all with overrides off', async () => {
    const requested = trackImages()
    const m = await load(false)
    await m.preloadRemainingArt()
    expect(requested).toEqual([])
  })

  it('requests tier 1 serially and then the rest when on', async () => {
    const requested = trackImages()
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => { cb(); return 1 })
    const m = await load(true)
    const early = m.earlyArtWants()
    const p = m.preloadRemainingArt()
    // NOTHING on the spot: the tiers hold for the page's own load and then for
    // an idle slot, so they never land in the window where the scene is
    // mounting and the document is still fetching its own subresources.
    expect(requested).toEqual([])
    await tick()
    // Tier 1 awaits each probe, and the fakes never settle — so only the
    // first is asked for before the promise parks. That IS the serial order.
    expect(requested).toHaveLength(1)
    expect(requested[0]).toContain(`${early[0]![1]}.webp`)
    void p
  })
})

describe('the boss\'s death, fetched late', () => {
  it('names the stage\'s own boss, at 80 % of the road', async () => {
    const m = await load(true)
    const { bossDesign } = await import('@/game/foes')
    for (const s of [1, 2, 3, 6, 16]) expect(m.deathArtWant(s)).toEqual(['death', bossDesign(s)])
    expect(m.deathArtDue(0.79)).toBe(false)
    expect(m.deathArtDue(m.DEATH_ART_FROM)).toBe(true)
    expect(m.DEATH_ART_FROM).toBe(0.8)
  })

  it('rides none of the tiers — no splash, no early fetch, no idle sweep', async () => {
    for (const s of [1, 2, 6]) {
      stage = s
      const m = await load(true)
      const tiers = [...m.criticalArtWants(), ...m.earlyArtWants(), ...m.allArtWants()]
      expect(tiers.some(([kind]) => kind === 'death'), `stage ${s}`).toBe(false)
    }
  })
})
