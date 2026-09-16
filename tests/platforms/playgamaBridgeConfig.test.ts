import { describe, expect, it } from 'vitest'
import { buildPlaygamaBridgeConfig } from '@/platforms/playgama/bridgeConfig'

/**
 * ─── playgama-bridge-config.json ────────────────────────────────────────────
 *
 * Bridge switches its SaaS leaderboard on from this file alone, and the exact
 * shape it checks is not the shape the docs lead with. Read out of the v1.32
 * bundle (`isSaasEnabled('leaderboards')`):
 *
 *   saas.leaderboards must EXIST                       — else off everywhere
 *   platformId === 'playgama' && saas.publicToken      — on
 *   OR saas.leaderboards.platforms includes platformId — on (the QA Tool)
 *
 * Nothing at runtime says which of these went wrong: the module quietly stays
 * `not_available`, and the game never shows the tab.
 */

const ENV = {
  VITE_APP_PLAYGAMA: 'true',
  VITE_PLAYGAMA_LEADERBOARD_ID: 'survivalist_2026',
  PLAYGAMA_SAAS_PUBLIC_TOKEN: 'public-token'
}

describe('the Playgama bridge config', () => {
  it('switches the SaaS leaderboard on when both values are set', () => {
    const config = buildPlaygamaBridgeConfig(ENV) as any
    expect(config.saas.publicToken).toBe('public-token')
    // Present even though playgama.com never reads the list: Bridge tests the
    // object itself before anything else.
    expect(config.saas.leaderboards).toBeTypeOf('object')
    expect(config.leaderboards).toEqual([{ id: 'survivalist_2026', isMain: true }])
  })

  it('lists the QA Tool, so the board can be tested before release', () => {
    const config = buildPlaygamaBridgeConfig(ENV) as any
    expect(config.saas.leaderboards.platforms).toContain('playgama')
    expect(config.saas.leaderboards.platforms).toContain('qa_tool')
  })

  it('never routes YouTube Playables to the SaaS backend', () => {
    // The same archive is the Playables submission, and Playables forbids calls
    // to non-Google hosts. YouTube keeps its own native board (via `isMain`).
    const config = buildPlaygamaBridgeConfig(ENV) as any
    expect(config.saas.leaderboards.platforms).not.toContain('youtube')
  })

  it('marks the board isMain, or Bridge drops the score on YouTube', () => {
    const config = buildPlaygamaBridgeConfig(ENV) as any
    expect(config.leaderboards[0].isMain).toBe(true)
  })

  it('is exactly the pre-SaaS config when neither value is set', () => {
    expect(buildPlaygamaBridgeConfig({ VITE_APP_PLAYGAMA: 'true' }))
      .toEqual({ advertisement: { minimumDelayBetweenInterstitial: 120 } })
  })

  it('treats half a configuration as none', () => {
    for (const env of [
      { ...ENV, PLAYGAMA_SAAS_PUBLIC_TOKEN: '' },
      { ...ENV, VITE_PLAYGAMA_LEADERBOARD_ID: '   ' }
    ]) {
      const config = buildPlaygamaBridgeConfig(env) as any
      expect(config.saas).toBeUndefined()
      expect(config.leaderboards).toBeUndefined()
    }
  })

  it('never pins the platform — the QA Tool and localhost speak other protocols', () => {
    const json = JSON.stringify(buildPlaygamaBridgeConfig(ENV))
    expect(json).not.toContain('forciblySetPlatformId')
  })
})
