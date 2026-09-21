import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The drop-in art override probe, and its off switch.
 *
 * The probe is designed around a miss being free — and for the GAME it is, the
 * procedural renderer draws either way. It is not free for a PORTAL: every miss
 * shows up in CrazyGames' QA console as
 * `Missing resource detected: …/images/monsters/grumpling.webp`, one line per
 * drawable, which reads as a broken build to a reviewer.
 *
 * So the thing worth testing is a NEGATIVE: with the flag off, not one request
 * is made. That is invisible in play — the game looks identical either way —
 * which is exactly why it needs a test rather than a look.
 */

/** Records every `new Image()` and the src it was pointed at. */
const trackImages = (): string[] => {
  const requested: string[] = []
  class FakeImage {
    decoding = 'auto'
    naturalWidth = 0
    addEventListener(): void { /* never fires: nothing is really loaded */ }
    set src(value: string) { requested.push(value) }
    get src(): string { return '' }
  }
  vi.stubGlobal('Image', FakeImage as unknown as typeof Image)
  return requested
}

const loadArt = async (enabled: boolean) => {
  vi.resetModules()
  vi.stubEnv('VITE_ENABLE_ART_OVERRIDES', enabled ? 'true' : '')
  return import('@/game/art')
}

const setSearch = (search: string): void => {
  window.history.replaceState({}, '', `/${search}`)
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  setSearch('')
  localStorage.removeItem('artOverrides')
})

describe('art overrides, off', () => {
  it('requests nothing at all', async () => {
    const requested = trackImages()
    const art = await loadArt(false)

    expect(art.artOverridesEnabled()).toBe(false)
    expect(art.spriteFor('monster', 'grumpling')).toBeNull()
    expect(art.spriteFor('prop', 'coin')).toBeNull()
    for (const id of ['crate-damage', 'barricade', 'pillar']) art.spriteFor('prop', id)
    for (const id of ['teal', 'amber']) art.spriteFor('hero', id)
    await art.preloadArtOverrides([['monster', 'grumpling'], ['bg', 'lane']])

    // The exact CG QA complaint: not one of these may be asked for.
    expect(requested).toEqual([])
    expect(art.artProbeCount()).toBe(0)
  })
})

describe('art overrides, on', () => {
  it('probes the documented paths so dropping art in still works', async () => {
    const requested = trackImages()
    const art = await loadArt(true)

    expect(art.artOverridesEnabled()).toBe(true)
    art.spriteFor('monster', 'grumpling')
    art.spriteFor('hero', 'teal')
    art.spriteFor('gate', 'frame-add')
    art.spriteFor('round', 'tracer')
    art.spriteFor('fx', 'muzzle')

    expect(requested.some((u) => u.endsWith('images/monsters/grumpling.webp'))).toBe(true)
    expect(requested.some((u) => u.endsWith('images/heroes/teal.webp'))).toBe(true)
    expect(requested.some((u) => u.endsWith('images/gates/frame-add.webp'))).toBe(true)
    expect(requested.some((u) => u.endsWith('images/rounds/tracer.webp'))).toBe(true)
    expect(requested.some((u) => u.endsWith('images/fx/muzzle.webp'))).toBe(true)
  })

  it('asks for nothing when the drawable has no id', async () => {
    // Reported from CrazyGames' QA on the hosted build:
    //   ⚠ Missing resource detected: …/images/ui/.webp
    // An id of `''` built a path to a file that cannot exist and 404ed. It was
    // invisible in play — the glyph under it is the fallback either way — and
    // the caller was the Dynamo's bolt button, a weapon's meter sitting in the
    // skill row with no painting of its own (`SkillBar.boltSlot`); any skill
    // whose `art` is null would have done the same.
    //
    // Guarded in `spriteFor` because that is the one place a URL is built from
    // an id, so every future caller with an optional one gets the drawing
    // rather than a miss.
    const requested = trackImages()
    const art = await loadArt(true)

    expect(art.spriteFor('ui', '')).toBeNull()
    expect(art.spriteFor('ui', '   ')).toBeNull()
    expect(art.spriteFor('monster', '')).toBeNull()
    expect(requested, 'a path was built from an empty id').toEqual([])
    expect(art.artProbeCount(), 'an empty id took a probe slot').toBe(0)

    // …and a real id still goes out, so the guard is a guard and not an off
    // switch.
    art.spriteFor('ui', 'chest')
    expect(requested.some((u) => u.endsWith('images/ui/chest.webp'))).toBe(true)
  })

  it('asks for each id once, however often it is drawn', async () => {
    const requested = trackImages()
    const art = await loadArt(true)

    for (let i = 0; i < 20; i++) art.spriteFor('prop', 'coin')

    expect(requested).toHaveLength(1)
  })

  it('falls back to drawing until a probe actually decodes', async () => {
    trackImages()
    const art = await loadArt(true)
    // The fake never fires `load`, which is the same state as a 404: the
    // caller gets null and the renderer draws the thing itself.
    expect(art.spriteFor('prop', 'coin')).toBeNull()
  })

  it('can be switched off live, and forgets its probes when it is', async () => {
    const requested = trackImages()
    const art = await loadArt(true)
    let changes = 0
    art.onArtChanged(() => { changes++ })

    art.spriteFor('prop', 'coin')
    expect(requested).toHaveLength(1)

    art.setArtOverrides(false, false)
    expect(art.artOverridesEnabled()).toBe(false)
    expect(changes).toBe(1)
    // Off: nothing is asked for, and the old probe is not consulted either.
    art.spriteFor('prop', 'coin')
    expect(requested).toHaveLength(1)
    expect(art.artProbeCount()).toBe(0)
  })

  it('re-probes with a cache-buster after an explicit refresh', async () => {
    const requested = trackImages()
    const art = await loadArt(true)
    art.spriteFor('prop', 'coin')
    art.refreshArtOverrides()
    art.spriteFor('prop', 'coin')
    expect(requested).toHaveLength(2)
    expect(requested[0]).not.toContain('?v=')
    expect(requested[1]).toContain('?v=1')
  })
})

describe('the three layers of the flag', () => {
  it('lets ?art=on override a build that ships it off, and remembers it', async () => {
    trackImages()
    setSearch('?art=on')
    const art = await loadArt(false)
    expect(art.artOverridesEnabled()).toBe(true)
    expect(art.artOverrideSource()).toBe('url')
    expect(localStorage.getItem('artOverrides')).toBe('true')

    // Drop the param: the remembered answer holds.
    setSearch('')
    const again = await loadArt(false)
    expect(again.artOverridesEnabled()).toBe(true)
    expect(again.artOverrideSource()).toBe('stored')
  })

  it('lets ?art=off switch a build that ships it on back off', async () => {
    trackImages()
    setSearch('?art=off')
    const art = await loadArt(true)
    expect(art.artOverridesEnabled()).toBe(false)
  })

  it('reads the param from the hash half of a hash-router URL', async () => {
    trackImages()
    window.history.replaceState({}, '', '/#/playground?art=on')
    const art = await loadArt(false)
    expect(art.artOverridesEnabled()).toBe(true)
  })
})
