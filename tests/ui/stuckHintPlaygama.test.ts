import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// ─── The "disable your adblocker" loading hint stays off the Playgama build ──
//
// `FLogoProgress` shows `loading.tooLong` ("Loading takes too long? Disable your
// adblocker and reload.") after 5 s of loading. The Playgama archive is also the
// YouTube Playables submission, where that advice is wrong twice over: ads come
// only through the Playables SDK, and on playgama.com the portal serves them.
//
// The gate is a build-flag branch that a unit test cannot mount (it is
// constant-folded per platform), so it is pinned by SOURCE — same approach as
// the first-load interstitial arm in `firstLoadInterstitial.test.ts`.

const src = readFileSync(resolve(__dirname, '../../src/components/atoms/FLogoProgress.vue'), 'utf8')

describe('the stuck-loading hint (FLogoProgress.vue)', () => {
  const timerIdx = src.indexOf('stuckHintId = window.setTimeout')
  const beforeTimer = timerIdx === -1 ? '' : src.slice(0, timerIdx)
  const gate = beforeTimer.slice(beforeTimer.lastIndexOf('if ('))

  it('is the only thing that ever turns the hint on', () => {
    expect(timerIdx).toBeGreaterThan(-1)
    expect(src.match(/showStuckHint\.value = true/g)).toHaveLength(1)
  })

  it('is armed only behind a Playgama build-flag gate, read as a foldable literal', () => {
    expect(gate).toMatch(/^if \(import\.meta\.env\.VITE_APP_PLAYGAMA !== 'true'\) \{\s*$/)
  })

  it('still arms on every other build', () => {
    // The gate excludes Playgama only — no other platform flag may creep in.
    expect(gate.match(/VITE_APP_[A-Z_]+/g)).toEqual(['VITE_APP_PLAYGAMA'])
  })
})
