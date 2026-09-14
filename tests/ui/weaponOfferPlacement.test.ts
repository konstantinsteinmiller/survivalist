/**
 * ─── Where the rewarded weapon chip sits ────────────────────────────────────
 *
 * Above the mute button, in its own row, and NOT in the meta row beside it.
 *
 * That is a real rule rather than a styling preference. The meta row is four
 * established positions — mute, leaderboard, settings, expedition — that a
 * player reaches for without looking, during a run, with a thumb. A control
 * that costs thirty seconds of video does not belong in a row where a thumb
 * lands by habit, and the cheapest way for it to end up there is somebody
 * tidying the template later and folding the two rows back into one.
 *
 * The second claim is about the ad rather than the layout: the chip is gated on
 * `isLiveGameplay`, which goes false for the ad it requests. Everything that has
 * to outlive that unmount is in `useWeaponOffer.ts` — see the tests there — and
 * this is the half that makes it necessary.
 *
 * Read off the source, like `tests/ui/moveHintRetires.test.ts` and
 * `tests/ui/shopMark.test.ts`: mounting `GameScene.vue` needs the simulation, a
 * canvas and a dozen platform modules, and what is under test is four lines of
 * template.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const scene = readFileSync(
  resolve(__dirname, '../../src/views/GameScene.vue'), 'utf8'
).replace(/\r\n/g, '\n')

describe('the weapon offer in the bottom-left stack', () => {
  it('is mounted, and only while gameplay is live', () => {
    expect(scene, 'the offer chip is no longer imported')
      .toContain("import AdWeaponOffer from '@/components/organisms/AdWeaponOffer.vue'")
    expect(scene, 'the chip renders outside live gameplay — including under its own ad')
      .toContain('AdWeaponOffer(v-if="isLiveGameplay")')
  })

  it('sits above the mute button rather than beside it', () => {
    const left = scene.indexOf('div.scene__left')
    expect(left, 'the bottom-left column is gone').toBeGreaterThan(0)
    const chip = scene.indexOf('AdWeaponOffer(', left)
    const meta = scene.indexOf('div.scene__meta', left)
    const mute = scene.indexOf('FMuteButton', left)
    expect(chip, 'the chip left the bottom-left column').toBeGreaterThan(left)
    expect(meta, 'the meta row left the bottom-left column').toBeGreaterThan(chip)
    expect(mute, 'the chip is now in the row the player thumbs blind')
      .toBeGreaterThan(meta)
  })

  it('stacks that column, so the chip is a row of its own', () => {
    // The SASS rule, which starts at column 0 — a bare `indexOf` finds the
    // pug tag in the template first.
    const at = scene.indexOf('\n.scene__left\n')
    expect(at, 'the column lost its rule').toBeGreaterThan(0)
    const block = scene.slice(at, scene.indexOf('\n\n', at))
    expect(block).toContain('flex-direction: column')
    // The column itself must not eat taps: it spans the full width of whatever
    // its widest child is, and the road is underneath it.
    expect(block, 'the empty column now swallows steering taps')
      .toContain('pointer-events: none')
  })
})
