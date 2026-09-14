/**
 * ─── The "tap to move" primer has to go away ────────────────────────────────
 *
 * It sat over the road for the whole run, and the reason was a line that was
 * never written rather than a rule that was wrong.
 *
 * On a desktop the crowd follows the CURSOR — no click required, and the scene
 * says so in a comment right where it happens ("Hovering over the road IS
 * playing… the player has had the lesson"). But the only things that ever
 * retired the primer were a pointer PRESS, a key press, and the end of the
 * controls lightbox — which a returning player never sees. So a mouse player
 * steered their squad around while the game went on telling them to click, in
 * German, in a pill across the middle of the screen.
 *
 * Two things fix it, and they are different in kind:
 *
 *   THE GESTURE   hovering retires it, because hovering IS the gesture. That is
 *                 the honest way for a primer to end: the player did the thing.
 *   THE CLOCK     and five seconds of live gameplay retires it anyway, so it
 *                 cannot hang over the road for somebody who has not touched
 *                 anything at all. Counted from when the ROAD starts moving, so
 *                 on a first run the five seconds begin where the lightbox ends
 *                 rather than behind it.
 *
 * ── Why this is read off the source ──
 *
 * Both live inside `GameScene.vue`, which is the whole game: mounting it needs
 * the simulation, the renderer, a canvas and a dozen platform modules, and the
 * thing under test is four lines of wiring. This is the same trade
 * `tests/ui/shopMark.test.ts` makes — assert the wiring that cannot be rendered
 * here, and let the behaviour itself be checked in a browser.
 *
 * What it can catch is the regression that actually happened: somebody removes
 * the retirement and the primer goes back to being permanent for every mouse
 * player, with nothing red anywhere.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const scene = readFileSync(
  resolve(__dirname, '../../src/views/GameScene.vue'), 'utf8'
).replace(/\r\n/g, '\n')

/** The body of the hover branch in `onPointerMove` — the desktop steer path. */
const hoverBranch = (): string => {
  const from = scene.indexOf('const onPointerMove')
  expect(from, 'onPointerMove is gone').toBeGreaterThan(0)
  const to = scene.indexOf('const onPointerUp', from)
  expect(to, 'could not find the end of onPointerMove').toBeGreaterThan(from)
  return scene.slice(from, to)
}

describe('steering retires the move primer', () => {
  it('retires it on hover, which is how a mouse player steers', () => {
    const body = hoverBranch()
    // The hover branch is the one that runs with no button held.
    expect(body, 'the hover steer path is gone').toContain("e.pointerType === 'mouse'")
    expect(
      body,
      'hovering steers the crowd but no longer retires the primer that asks for it'
    ).toContain("markHintDone('move')")
  })

  it('still retires it on a press and on a key, for the other two ways in', () => {
    // Not a new rule — these already worked — but they are the paths a reader
    // would otherwise assume the hover fix replaced.
    expect(scene).toContain('const onPointerDown')
    const presses = scene.match(/markHintDone\('move'\)/g) ?? []
    expect(presses.length, 'a way of retiring the move primer was removed')
      .toBeGreaterThanOrEqual(3)
  })
})

describe('and it cannot outlive five seconds of gameplay either', () => {
  it('has a clock of its own, armed when the road starts', () => {
    expect(scene, 'the move primer lost its backstop clock').toMatch(/MOVE_HINT_MS\s*=\s*5000/)
    // Armed off `isLiveGameplay`, which is false while the controls lightbox
    // holds the road — so it is five seconds of PLAY, not five of lightbox.
    const arm = scene.slice(scene.indexOf('watch(isLiveGameplay, (live) => {'))
    const block = arm.slice(0, arm.indexOf('\n})'))
    expect(block, 'the clock is no longer armed when the road starts')
      .toContain('MOVE_HINT_MS')
    expect(block, 'the clock no longer retires the primer').toContain("markHintDone('move')")
  })

  it('arms once, so a modal or an ad cannot keep resetting it', () => {
    // `isLiveGameplay` drops and returns for every modal, ad and hidden tab. A
    // timer re-armed on each of those would restart the five seconds every
    // time, which is the same bug wearing a clock.
    const arm = scene.slice(scene.indexOf('watch(isLiveGameplay, (live) => {'))
    const block = arm.slice(0, arm.indexOf('\n})'))
    expect(block, 'the clock re-arms on every resume').toContain('moveHintTimer === null')
  })

  it('is cleared when the scene goes away', () => {
    const teardown = scene.slice(scene.indexOf('onUnmounted(() => {'))
    expect(teardown, 'a pending hint clock fires into a dead component')
      .toContain('clearTimeout(moveHintTimer)')
    expect(teardown, 'the steer glyph clock is still left running')
      .toContain('clearTimeout(steerHintTimer)')
  })
})
