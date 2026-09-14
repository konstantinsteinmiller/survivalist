// Per-project settings for `pnpm deploy:poki`.
//
// `team` and `gameId` come straight out of the P4D URL of the game's Versions
// page:
//   https://app.poki.dev/<team>/games/<gameId>/versions

export default {
  team: 'hyperg8',
  gameId: '1d51788e-5771-4d70-8290-59366fb9773f',
  gameName: 'Survivalist',

  build: 'pnpm build:poki',
  dist: 'dist',
  zip: 'dist/survivalist-poki.zip',

  /** Pack `dist` into `zip` with the pipeline's own zip writer instead of
   *  trusting the build script's `tar -a -cf`, which silently produces a TAR
   *  named `.zip` whenever GNU tar wins the PATH. Leave this on. */
  repack: true,
  /** Extra files to keep out of the upload (backups and nested zips are
   *  already excluded). */
  zipExclude: () => false,

  /** What the version is called in P4D. Keep the version number in it — it is
   *  the only thing tying a live build back to a commit. */
  versionName: version => `Survivalist ${version}`,

  /** Extra hosts the gates and the runtime sweep should accept. Anything here
   *  needs a matching per-URL approval in P4D → Settings → CSP. */
  allowHosts: [],

  qa: {
    playMs: 45000,          // how long the harness actually plays before judging
    adWaitMs: 120000,       // how long to wait for a commercial break
  },

  /** Surfaces this game actually has. They decide whether a checklist step is
   *  "not applicable" or a real question — a game WITH usernames must not have
   *  its profanity-filter step reported as n/a. */
  declares: {
    usernames: false,
    chat: false,
  },

  /** Expressions evaluated INSIDE the game's iframe during the QA pass. */
  hooks: {
    /** A snapshot that must survive a reload. Key names plus value lengths,
     *  rather than values: a timestamp or a session id changes on every boot
     *  and would fail a save that is working perfectly. */
    readProgress: `(() => {
      const skip = /^(poki_|inspector-|_ga|debug|fps)/
      const out = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || skip.test(k)) continue
        out[k] = (localStorage.getItem(k) || '').length
      }
      return out
    })()`,

    /** Open the game's rewarded-ad flow. A rewarded break can only be started
     *  by the player, so there is no generic way to do this — point it at
     *  whatever the game exposes, or leave it null and the step is reported
     *  as unproven rather than silently ticked. */
    triggerRewarded: null,
  },
}
