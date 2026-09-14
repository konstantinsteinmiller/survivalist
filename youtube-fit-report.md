# YouTube Playables fit — survivalist

**Verdict: 1 MUST failure left** (was 9), and it is a question for Playgama
rather than a defect — their own Bridge loads from their CDN, and only they can
say how that is handled on Playables. Every other mechanical check passes.

Eligibility is still **not established**: the runtime pass (12 checks) and the
judgement pass (21 checks) have not been run. See §3.

Artifact: `dist/` from `pnpm build:playgama` (2026-09-14) — 151 files,
7.45 MiB unpacked, zip 3.38 MiB, initial load **3.04 MiB** against a 30 MiB
MUST. Typecheck clean, **1474 tests passing** after every change below.

Register: `~/.claude/skills/youtube-fit/REQUIREMENTS.md` · findings:
`youtube-fit.json`.

---

## 1. What changed

### Pass 1 — build-mode gates

| Finding | Fix |
| --- | --- |
| `YTP-SDK-TAG` / `YTP-SDK-FIRST` | `game_api/v1` added to `<head>`, **before** Vite's injected entry module; new `strip-youtube-sdk` plugin removes it from every other build |
| `YTP-CSP-META` | Playgama joins Yandex/GamePix/Poki in `skipCspMeta` |
| `YTP-NO-NAVLANG` | `navigator.language` rung dropped from the i18n fallback |
| `YTP-NO-SHARE` | `shareAffordance()` returns `'none'` before any feature detection |
| `YTP-BUNDLE-PURITY` | new `yandexPlugin.stub.ts` + alias — the `yandex.ru/ads` chunk is gone from every non-Yandex build |
| `YTP-NO-ANALYTICS` | probe extracted to `analyticsSink.ts` + stub, aliased away on Playgama |

### Pass 2 — the real changes

| Finding | Fix |
| --- | --- |
| `YTP-NO-RAW-STORAGE` | new `src/utils/safeStorage.ts`; the three module-scope reads in `useCheats` / `useMatch` routed through it — **plus a fourth found on the way**: `FPerfMeter.vue` used the exact broken `typeof localStorage === 'undefined'` guard |
| `YTP-HASH-HISTORY` | `createMemoryHistory()` on the Playgama build; hash history kept elsewhere so the dev benches stay reachable |
| `YTP-NO-EXTERNAL-CALLS` (leaderboard) | `VITE_LEADERBOARD_URL=` empty in `.env.playgama` — the board ships **baked** from `data/leaderboard-snapshot.json`, same mechanism Poki and Yandex already use |
| `YTP-NO-VISIBILITY-API` | resolved by the router change + obfuscation (below) |
| `YTP-SOURCEMAPS` | `sourcemap` no longer keyed solely off the obfuscator — production platform builds never emit maps |

### The one that explained several others

`.env.playgama` had `VITE_ENABLE_OBFUSCATION=true`. The playbook's own template
specifies **`false`** for this build, because Playgama and YouTube review by
hand and an obfuscated stack trace cannot be mapped back to a source line.

It turned out to matter mechanically too. The obfuscator's `stringArray` pass
runs **before** esbuild folds `import.meta.env` comparisons, so with it on the
platform guards did not fold: the forbidden branches survived into the bundle
as dead-but-present code carrying the exact API names a reviewer greps for.
I proved it by building the same source both ways and diffing — with
obfuscation off there is no `addEventListener("visibilitychange")` in the
bundle at all, and vue-router's hash-history implementation (which brought its
own `visibilitychange` scroll-saving along) tree-shakes away entirely.

That single flag closed `YTP-HASH-HISTORY` and `YTP-NO-VISIBILITY-API`, and cut
the archive from 3.53 MiB to 3.38 MiB.

**Unobfuscated twin builds are now the way to verify this game.** On an
obfuscated bundle you cannot tell a live call from a string in a lookup table,
so a grep-based audit can neither confirm nor deny anything. Build once with
`VITE_ENABLE_OBFUSCATION=false` to a scratch `--outDir` and read that.

---

## 2. The one remaining blocker

### `YTP-NO-EXTERNAL-CALLS` — Playgama's own Bridge CDN · YT-PRV + YT-FAQ

`playgamaPlugin` loads `https://bridge.playgama.com/v1/stable/playgama-bridge.js`
at runtime, by injecting a `<script>` tag.

Two requirements touch it. YT-PRV permits external calls only to "APIs owned by
Google or YouTube". And YT-FAQ names dynamically created script tags as a
rejection reason in their own right — they lack the nonce YouTube's CSP
requires and are blocked at runtime, which is invisible to every local test.
(That is the standing `YTP-DYN-SCRIPT` warning; it has the same single cause.)

**This is not mine to fix.** Playgama is the official Playables partner and
presumably handles it — by bundling the Bridge, by being on YouTube's own
allowlist, or by serving a different archive. **Ask them before submitting.**
If the answer is "bundle the Bridge locally", that is real work and worth
knowing now rather than after a rejection cycle.

---

## 3. Unresolved

**Runtime pass — not run.** Aspect ladder 9:32→32:9, resize-to-zero,
`game_ready` timing against YouTube's spinner, audio-without-first-tap,
platform mute priority (incl. during ads), pause completeness, 512 MB heap,
save blob size + 64 KiB final flush, save back-compat, Esc, < 5 s load,
iOS/Android YouTube app.

Two of these now specifically want checking because Pass 2 changed behaviour:

- **The save flush moved onto the pause gate.** `visibilitychange`/`pagehide`
  flushes are gone on this build; `main.ts` now flushes from `onPauseChange`
  (`flushPersist()` first, then `saveManager.flush()`). Confirm a real pause
  persists progress — this is the one change that could lose data if wrong.
- **Memory history.** Nothing in `src/` navigates, so this should be inert, but
  load the built archive from a deep path and confirm it still renders.

**Judgement pass — not run.** Genre fit, ~10 min playtime (Playgama's own
gate), progression, visuals, **asset originality and music rights**,
13+/not-made-for-kids, unbranded metadata, end-of-content.

**Cheap SHOULD still open:** `YTP-FIRSTFRAME` — the game paints its own splash
via `FLogoProgress` but never calls `firstFrameReady()`. One call next to the
existing `game_ready` wiring.

**Standing WARNs:** `YTP-ZIP-INSIDE` / `YTP-SIZE-FILE-SOFT` — the build script
leaves the zip in `dist/`. Verified harmless for the artefact (the tar runs
before the move, and Vite empties `dist/` next build, so the archive does not
contain itself) but it skews every size measurement taken from `dist/`.

---

## 4. Passing — 28 checks

`YTP-ABSPATH`, `YTP-AUDIO-SDK`, `YTP-BUNDLE-PURITY`, `YTP-CSP-META`,
`YTP-DEV-BUILD`, `YTP-FILECOUNT`, `YTP-FILENAME`, `YTP-GAMEREADY`,
`YTP-NO-ANALYTICS`, `YTP-NO-CLIPBOARD`, `YTP-NO-EXIT`, `YTP-NO-EXT-LINKS`,
`YTP-NO-IAP`, `YTP-NO-LOGIN-UI`, `YTP-NO-PII`, `YTP-NO-QR`, `YTP-NO-SW`,
`YTP-PAUSE`, `YTP-PRECOMPRESS`, `YTP-SAVE-API`, `YTP-SDK-FIRST`,
`YTP-SDK-TAG`, `YTP-SIZE-FILE`, `YTP-SIZE-INITIAL`, `YTP-SIZE-TOTAL`,
`YTP-SOURCEMAPS`, `YTP-WRONG-BUILD`, `YTP-ZIP`.
(`YTP-HASH-HISTORY` and `YTP-NO-VISIBILITY-API` also pass — they are counted in
the manual register now, since both want a runtime confirmation.)

---

## 5. Files touched

**New:** `src/utils/safeStorage.ts`, `src/utils/yandexPlugin.stub.ts`,
`src/use/analyticsSink.ts`, `src/use/analyticsSink.stub.ts`.

**Changed:** `index.html`, `vite.config.ts`, `.env.playgama`,
`src/router/index.ts`, `src/App.vue`, `src/main.ts`, `src/i18n/index.ts`,
`src/use/useAnalytics.ts`, `src/use/useCheats.ts`, `src/use/useMatch.ts`,
`src/use/useGamePause.ts`, `src/use/useShareCard.ts`,
`src/use/useTowerState.ts`, `src/components/atoms/FPerfMeter.vue`.

Most changes are gated on `VITE_APP_PLAYGAMA` and are inert on every other
platform. Three are not, and improve every build: the Yandex plugin stub (drops
a dead ad-SDK chunk everywhere), `safeStorage` (fixes a real crash on any
runtime with null storage), and the sourcemap fix (stops publishing source from
any production platform build).
