import { describe, expect, it } from 'vitest'
import { bossDesign, stageDesigns } from '@/game/foes'
import {
  bossKindFor, SUMMON_DESIGN, THREAT_POOL_FROM_STAGE, WYRM_DESIGN, WYRM_STAGE
} from '@/game/threats'

/**
 * The summoner wears the body it raises.
 *
 * The boss body used to be picked purely by stage, cycling five designs so a
 * returning player recognises the silhouette. The summoner broke that: it
 * raises marrow knights out of the road, and on its first stage the cycle
 * handed it a boar — a boar conjuring skeleton knights reads as a bug, not as
 * a boss. So the summoner is always the Marrow Knight, at boss size, and the
 * other kinds keep their place in the cycle.
 */
describe('the summoner boss', () => {
  it('is the Marrow Knight on every summoner stage, and bakes with the stage', () => {
    let seen = 0
    for (let stage = 1; stage <= 40; stage++) {
      if (bossKindFor(stage) !== 'summoner') continue
      seen++
      expect(bossDesign(stage), `stage ${stage}`).toBe(SUMMON_DESIGN)
      // `stageDesigns` is what the loader bakes and the splash holds for.
      expect(stageDesigns(stage)).toContain(SUMMON_DESIGN)
    }
    expect(seen).toBeGreaterThan(3)
  })

  it('leaves the tutorial bosses and the other kinds where they were', () => {
    expect(bossDesign(1)).toBe('grumpling')
    expect(bossDesign(2)).toBe('bonecap')
    const cycle = ['snaggletusk', 'thornwick', 'marrowknight', 'cinderhound', 'rattlejack']
    for (let stage = THREAT_POOL_FROM_STAGE; stage <= 40; stage++) {
      const kind = bossKindFor(stage)
      // Two kinds are welded to a body for the same reason and neither is in
      // the cycle: a boar that conjures skeletons reads as a bug, and so does
      // one that breathes fire.
      if (kind === 'summoner' || kind === 'wyrm') continue
      expect(cycle).toContain(bossDesign(stage))
    }
  })

  it('is the Skewer on every wyrm stage, and bakes with the stage', () => {
    let seen = 0
    for (let stage = 1; stage <= 40; stage++) {
      if (bossKindFor(stage) !== 'wyrm') continue
      seen++
      expect(bossDesign(stage), `stage ${stage}`).toBe(WYRM_DESIGN)
      expect(stageDesigns(stage), `stage ${stage} bake`).toContain(WYRM_DESIGN)
    }
    // The hand-placed debut, and then the rotation once it joins it.
    expect(seen).toBeGreaterThan(1)
    expect(bossDesign(WYRM_STAGE)).toBe(WYRM_DESIGN)
  })
})
