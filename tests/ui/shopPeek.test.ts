/**
 * ─── The result screen's shop peek ──────────────────────────────────────────
 *
 * Two halves, and they fail for different reasons.
 *
 * `pickPeek` is a pure function and gets ordinary unit tests — but the rules it
 * implements are all about a SEQUENCE of result screens ("never the same track
 * twice in a row", "never changes under the player's finger"), which is exactly
 * the kind of rule that cannot be seen from one call. So the sequence is run.
 *
 * The placement half is read off the source, like `tests/ui/shopMark.test.ts`
 * and `tests/ui/weaponOfferPlacement.test.ts`: mounting `GameScene.vue` needs
 * the simulation, a canvas and a dozen platform modules, and what is under test
 * is where one line of template sits relative to two others.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PEEK_ORDER, pickPeek, type PeekTrack } from '@/components/organisms/shopPeek'
import { UPGRADE_ORDER, type UpgradeId } from '@/use/useUpgrades'
import { UPGRADE_ICONS } from '@/components/icons/upgradeIcons'
import { GAME_ICON_NAMES } from '@/components/icons/iconNames'
import en from '@/i18n/locales/en'

const read = (rel: string): string =>
  readFileSync(resolve(__dirname, '../..', rel), 'utf8').replace(/\r\n/g, '\n')

/** A board where every track costs the same, so only the ORDER is under test. */
const flatBoard = (cost = 100): PeekTrack[] =>
  UPGRADE_ORDER.map((id) => ({ id, cost, maxed: false }))

describe('the walk order', () => {
  it('covers every track in the shop, exactly once', () => {
    expect([...PEEK_ORDER].sort()).toEqual([...UPGRADE_ORDER].sort())
    expect(new Set(PEEK_ORDER).size).toBe(PEEK_ORDER.length)
  })

  it('opens on firepower — the strongest track and the shortest sentence', () => {
    expect(PEEK_ORDER[0]).toBe('power')
  })

  it('leaves the two weapon tracks until last, since a level in one is worth nothing until the weapon is found', () => {
    expect(PEEK_ORDER.slice(-2).sort()).toEqual(['gatling', 'rocket'])
  })
})

describe('what the plate shows', () => {
  it('shows nothing at all when the board has nothing left to sell', () => {
    const tracks = UPGRADE_ORDER.map((id) => ({ id, cost: 100, maxed: true }))
    expect(pickPeek({ tracks, coins: 9999, rotation: 0 })).toBeNull()
  })

  it('prefers a track the wallet can actually pay for', () => {
    const tracks: PeekTrack[] = [
      // Firepower leads the walk, and is deliberately the one out of reach here.
      { id: 'power', cost: 500, maxed: false },
      { id: 'rate', cost: 50, maxed: false }
    ]
    expect(pickPeek({ tracks, coins: 100, rotation: 0 })).toBe('rate')
  })

  it('falls back to the CHEAPEST track when nothing is affordable — a goal, not a locked door', () => {
    const tracks: PeekTrack[] = [
      { id: 'power', cost: 500, maxed: false },
      { id: 'rate', cost: 300, maxed: false },
      { id: 'squad', cost: 900, maxed: false }
    ]
    expect(pickPeek({ tracks, coins: 0, rotation: 7 })).toBe('rate')
  })

  it('never offers a maxed track', () => {
    const tracks: PeekTrack[] = [
      { id: 'power', cost: 10, maxed: true },
      { id: 'rate', cost: 10, maxed: true },
      { id: 'squad', cost: 10, maxed: false }
    ]
    for (let r = 0; r < 6; r++) {
      expect(pickPeek({ tracks, coins: 1000, rotation: r })).toBe('squad')
    }
  })
})

describe('the rotation across a career of result screens', () => {
  it('walks a different track on each consecutive screen', () => {
    const tracks = flatBoard()
    const seen = Array.from({ length: PEEK_ORDER.length }, (_, r) =>
      pickPeek({ tracks, coins: 1000, rotation: r })
    )
    // Every track in the shop, once, in the walk order.
    expect(seen).toEqual([...PEEK_ORDER])
  })

  it('wraps rather than running off the end, and survives a junk counter', () => {
    const tracks = flatBoard()
    const len = PEEK_ORDER.length
    expect(pickPeek({ tracks, coins: 1000, rotation: len })).toBe(PEEK_ORDER[0])
    expect(pickPeek({ tracks, coins: 1000, rotation: len * 3 + 2 })).toBe(PEEK_ORDER[2])
    // A save that came back negative or fractional must not produce `undefined`.
    expect(pickPeek({ tracks, coins: 1000, rotation: -1 })).toBe(PEEK_ORDER[len - 1])
    expect(pickPeek({ tracks, coins: 1000, rotation: 2.9 })).toBe(PEEK_ORDER[2])
  })

  it('is stable: the same screen asked twice answers the same', () => {
    const tracks = flatBoard()
    const a = pickPeek({ tracks, coins: 1000, rotation: 4 })
    const b = pickPeek({ tracks, coins: 1000, rotation: 4 })
    expect(a).toBe(b)
  })
})

describe('the pin — the plate does not move under the player’s finger', () => {
  it('keeps the track it is already showing when the player buys it and comes back', () => {
    const before = flatBoard()
    const pinned = pickPeek({ tracks: before, coins: 1000, rotation: 0 })
    expect(pinned).toBe('power')

    // The purchase: the track's next level is dearer, and the wallet is lighter.
    const after: PeekTrack[] = before.map((t) =>
      t.id === 'power' ? { ...t, cost: 400 } : t
    )
    expect(pickPeek({ tracks: after, coins: 300, rotation: 0, pinned })).toBe('power')
  })

  it('lets go only once the pinned track has nothing left to sell', () => {
    const tracks: PeekTrack[] = [
      { id: 'shield', cost: 100, maxed: true },
      { id: 'power', cost: 100, maxed: false }
    ]
    expect(pickPeek({ tracks, coins: 1000, rotation: 0, pinned: 'shield' })).toBe('power')
  })

  it('holds the pin even when the wallet can no longer afford it', () => {
    const tracks: PeekTrack[] = [
      { id: 'power', cost: 900, maxed: false },
      { id: 'rate', cost: 10, maxed: false }
    ]
    expect(pickPeek({ tracks, coins: 20, rotation: 0, pinned: 'power' })).toBe('power')
  })
})

describe('the plate itself', () => {
  const peek = read('src/components/organisms/ShopPeek.vue')

  it('names every track with a glyph the shared set actually draws', () => {
    for (const id of UPGRADE_ORDER) {
      expect(GAME_ICON_NAMES, `${id} has no glyph`).toContain(UPGRADE_ICONS[id as UpgradeId])
    }
  })

  it('prints the before → after pair that is the whole reason it exists', () => {
    expect(peek).toContain('shop-peek__from')
    expect(peek).toContain('shop-peek__to')
    expect(peek).toContain('shop-peek__cost')
  })

  it('carries an accessible name, because an icon plate has none of its own', () => {
    expect(peek).toContain(':aria-label="label"')
    expect(en.upgrades.peekLabel).toContain('{name}')
    expect(en.upgrades.peekLabelReady).toContain('{name}')
    expect(en.upgrades.peekLabelReady).toContain('{n}')
  })

  it('wears the same count badge the forge on the HUD wears', () => {
    expect(peek).toContain('FHudBadge')
    expect(peek).toContain('affordableCount')
    // …and hides it rather than printing a zero, which reads as a closed shop.
    expect(peek).toContain('v-if="affordable > 0"')
  })

  it('reads its numbers from the shop rather than restating them', () => {
    expect(peek).toContain("from '@/use/useUpgrades'")
    expect(peek).toContain('upgradeSuffix')
    // A hard-coded price or step here is a plate that can promise something the
    // shop then refuses to sell.
    expect(peek).not.toMatch(/valueAt\s*\(\s*\d+\s*,/)
  })

  it('stands down for a player who asked for less motion', () => {
    expect(peek).toContain('prefers-reduced-motion')
  })
})

describe('where the plate sits on the result screen', () => {
  const scene = read('src/views/GameScene.vue')

  it('is mounted, and fed the lifetime result count as its rotation', () => {
    expect(scene).toContain("import ShopPeek from '@/components/organisms/ShopPeek.vue'")
    expect(scene).toContain('ShopPeek(:rotation="resultsSeen"')
  })

  it('sits between the rewarded ×3 and the action row', () => {
    const reward = scene.indexOf('FButton.result__reward')
    const plate = scene.indexOf('ShopPeek(:rotation')
    const actions = scene.indexOf('div.result__actions(')
    expect(reward).toBeGreaterThan(-1)
    expect(plate).toBeGreaterThan(reward)
    expect(actions).toBeGreaterThan(plate)
  })

  it('opens the shop through the scene, which is what knows about ads in flight', () => {
    expect(scene).toContain('@open="onUpgradeFromResult(\'peek\')"')
    expect(scene).toMatch(/const onUpgradeFromResult = \(via: ShopDoor[^)]*\): void => \{\s*\n\s*if \(adInFlight\.value\) return/)
  })

  it('tells the funnel which door the shop was opened through', () => {
    // The whole reason the plate was built is that the other two doors were not
    // being found — which is unmeasurable unless the door rides on the event.
    expect(scene).toContain('via: shopOpenVia.value')
    for (const door of ["'hud'", "'result'", "'peek'"]) {
      expect(scene, `no call site opens the shop via ${door}`).toContain(door)
    }
  })
})
