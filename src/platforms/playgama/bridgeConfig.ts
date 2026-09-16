// ─── playgama-bridge-config.json ───────────────────────────────────────────
//
// Pure function over the loaded env, imported by `vite.config.ts` — so no `@/`
// imports and no `import.meta.env` in here. Emitted ONLY in Playgama mode, by the
// build and by the dev server (see the `emit-playgama-bridge-config` plugin for
// why never from `public/`).
//
// The leaderboard half is Bridge's SaaS (beta) leaderboard. Bridge turns it on
// from this file alone — no game-code switch — when:
//
//   • `saas.publicToken` is set, AND
//   • `saas.leaderboards` EXISTS. Bridge checks `options.saas.leaderboards` for
//     truthiness before anything else, so a token without that object leaves
//     the module on the platform's own type (`not_available` on playgama.com) —
//     even on playgama.com, where the `platforms` list itself is never read, AND
//   • the running platform is `playgama` — or is listed in `platforms`. The QA
//     Tool is `qa_tool` and must be listed, or the board cannot be tested
//     before release.
//
// YouTube Playables (the same archive) is deliberately NOT listed: Playables
// forbids calls to non-Google hosts, and Bridge's YouTube adapter has a native
// board of its own. `isMain: true` is what lets Bridge forward the score there
// (`ytgame.engagement.sendScore`) — it drops `setScore` for any other board.
//
// Both values come from `.env.playgama`:
//   VITE_PLAYGAMA_LEADERBOARD_ID  the dashboard's leaderboard ID — the game code
//                                 needs it too, hence the VITE_ prefix
//   PLAYGAMA_SAAS_PUBLIC_TOKEN    the dashboard's APP Public Token — only this
//                                 file needs it, so it is not compiled into JS
//
// Set neither and the config is exactly what it was before SaaS existed.

export const PLAYGAMA_SAAS_PLATFORMS: ReadonlyArray<string> = ['playgama', 'qa_tool']

export interface PlaygamaLeaderboardEnv {
  id: string
  token: string
}

export const playgamaLeaderboardEnv = (env: Record<string, string | undefined>): PlaygamaLeaderboardEnv => ({
  id: (env.VITE_PLAYGAMA_LEADERBOARD_ID ?? '').trim(),
  token: (env.PLAYGAMA_SAAS_PUBLIC_TOKEN ?? '').trim()
})

export const buildPlaygamaBridgeConfig = (env: Record<string, string | undefined>): Record<string, unknown> => {
  const config: Record<string, unknown> = {
    advertisement: { minimumDelayBetweenInterstitial: 120 }
  }
  const { id, token } = playgamaLeaderboardEnv(env)
  // Half a configuration is no configuration: a token with no board posts
  // nothing, and a board id with no token is answered "public token is not set".
  if (id.length === 0 || token.length === 0) return config
  config.saas = {
    publicToken: token,
    leaderboards: { platforms: [...PLAYGAMA_SAAS_PLATFORMS] }
  }
  config.leaderboards = [{ id, isMain: true }]
  return config
}
