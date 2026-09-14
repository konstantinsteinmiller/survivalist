import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { ShareCardSpec } from '@/game/shareCardArt'

/**
 * ─── Sharing a best run ─────────────────────────────────────────────────────
 *
 * The result screen offers a picture of a record run to whatever the device
 * calls "share". This module owns two things and nothing else: WHETHER that
 * offer may exist at all, and what happens when it is taken. The picture
 * itself lives in `@/game/shareCardArt` and is loaded on the tap — a share
 * card is a rare, late interaction and has no business on the boot path, so
 * nothing here imports the renderer statically.
 *
 * ─── The rule this file exists to enforce ───────────────────────────────────
 *
 * NEVER SHOW A BUTTON THAT CANNOT WORK. A share affordance that does nothing
 * is worse than no affordance: the player taps it, nothing happens, and the
 * game is broken. On a portal that is also a QA rejection.
 *
 * The reason that is hard is the iframe. Every portal we ship to runs the game
 * cross-origin inside one, and Web Share is a permissions-policy-gated feature:
 * `navigator.share` EXISTS in that frame and `navigator.canShare({files})` can
 * happily answer `true`, and the call still rejects with `NotAllowedError`
 * because the parent document never wrote `allow="web-share"` on the iframe.
 * There is no synchronous test that settles it on every engine. So this file
 * gates in three layers:
 *
 *   1. the API has to be there, AND it has to accept a FILE (the two are
 *      separate features — Web Share level 1 has no files at all);
 *   2. the permissions policy, where the browser will answer the question
 *      (`document.permissionsPolicy` / the older `featurePolicy`) — this is
 *      what removes the button before the first dead tap in the common case;
 *   3. and the first refusal at runtime demotes the whole feature for the rest
 *      of the session, because a frame that refused once will refuse again.
 *
 * ─── The download fallback ──────────────────────────────────────────────────
 *
 * Saving the card as a file instead is only offered on a build that is NOT a
 * portal build and is not framed by anyone. Portals forbid it at three
 * independent levels — the sandbox on their iframe usually omits
 * `allow-downloads` (the download is dropped silently, which is the exact dead
 * button this file exists to prevent), several of them forbid navigating or
 * handing the player a file out of the game as a store rule, and Poki forbids
 * everything that leaves the frame outright. None of that is worth a per-portal
 * table that would be wrong the first time a portal changed its wrapper: if the
 * build has a platform flag, there is no download.
 */

/** What the player may be offered on this device, in this frame, on this build. */
export type ShareAffordance = 'share' | 'download' | 'none'

/**
 * True on every build that targets a portal.
 *
 * Spelled out as `import.meta.env.VITE_APP_*` literals rather than imported
 * from `useUser`, which exports exactly these ten booleans. Two reasons, and
 * the first is the one that matters: Vite folds a literal at parse time, so the
 * whole chain collapses to a single `true`/`false` per build and the download
 * branch below is dead code the bundler removes — the posture
 * `platforms/capabilities.ts` documents at length. The second is that
 * `useUser` drags the save layer and the IndexedDB bootstrap in behind it, and
 * a module whose entire job is to decide whether one button exists should be
 * importable without any of that.
 */
const IS_PORTAL_BUILD =
  import.meta.env.VITE_APP_CRAZY_WEB === 'true' ||
  import.meta.env.VITE_APP_WAVEDASH === 'true' ||
  import.meta.env.VITE_APP_ITCH === 'true' ||
  import.meta.env.VITE_APP_GLITCH === 'true' ||
  import.meta.env.VITE_APP_GAME_DISTRIBUTION === 'true' ||
  import.meta.env.VITE_APP_PLAYGAMA === 'true' ||
  import.meta.env.VITE_APP_GAMEPIX === 'true' ||
  import.meta.env.VITE_APP_GAME_MONETIZE === 'true' ||
  import.meta.env.VITE_APP_YANDEX === 'true' ||
  import.meta.env.VITE_APP_POKI === 'true'

/**
 * Are we inside somebody else's page?
 *
 * A thrown access to `window.top` IS the answer: a cross-origin parent makes
 * the comparison throw, and a frame that cannot see its parent is exactly the
 * frame that must assume the strictest rules.
 */
const framed = (): boolean => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/**
 * A one-byte PNG, purely to ask `canShare` a question it will answer honestly.
 *
 * `navigator.canShare({ files: [...] })` is the only feature test for file
 * sharing, and it needs a real `File` — `canShare({})` and `canShare({ text })`
 * both return true on browsers that cannot share a file at all. Built once and
 * kept, so the test costs nothing on a re-ask.
 */
let probe: File | null | undefined
const probeFile = (): File | null => {
  if (probe !== undefined) return probe
  try {
    probe = new File([new Uint8Array(1)], 'probe.png', { type: 'image/png' })
  } catch {
    // No `File` constructor (old Safari, some embedded webviews). Without one
    // we cannot build the card's file either, so this is a genuine "no".
    probe = null
  }
  return probe
}

/**
 * Does the containing document allow Web Share here?
 *
 * `true` when the browser says yes AND when the browser has no opinion to
 * offer — an unknown is not a refusal, and the runtime demotion below is what
 * catches the frames that lied. Only an explicit `false` hides the button up
 * front, which is the case that matters: it is the common one on portals.
 */
const policyAllowsShare = (): boolean => {
  try {
    const doc = document as Document & {
      permissionsPolicy?: { allowsFeature?: (f: string) => boolean }
      featurePolicy?: { allowsFeature?: (f: string) => boolean }
    }
    const policy = doc.permissionsPolicy ?? doc.featurePolicy
    if (policy && typeof policy.allowsFeature === 'function') {
      return policy.allowsFeature('web-share') !== false
    }
  } catch { /* the property exists but throws in this frame — treat as unknown */ }
  return true
}

/**
 * Resolved ONCE per page load.
 *
 * Nothing it reads can change while the page is alive: the build's flags are
 * literals, the frame's permissions policy is fixed at navigation, and the
 * `File` constructor does not come and go. Re-deriving it per render would put
 * a `new File` and a policy query inside a `computed` the result screen reads.
 */
let resolved: ShareAffordance | null = null

export const shareAffordance = (): ShareAffordance => {
  if (resolved !== null) return resolved
  resolved = detect()
  return resolved
}

const detect = (): ShareAffordance => {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return 'none'

  // YOUTUBE PLAYABLES: no share surface at all. The Playgama archive is the
  // Playables submission, and its design requirements are explicit — the game
  // MUST NOT display in-game sharing prompts; YouTube owns sharing from its own
  // chrome. Returning 'none' here is the whole fix: every caller binds its UI
  // to `shareAffordance()`, so the button disappears and `navigator.share` is
  // never reached. Placed ABOVE the feature detection on purpose — the point is
  // not to fail gracefully, it is not to offer it.
  if (import.meta.env.VITE_APP_PLAYGAMA === 'true') return 'none'

  const file = probeFile()
  if (
    file !== null &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    policyAllowsShare()
  ) {
    try {
      if (navigator.canShare({ files: [file] })) return 'share'
    } catch { /* a canShare that throws is a canShare that said no */ }
  }

  // Everything below is the fallback, and it is off on every portal. See the
  // header: a silently-dropped download is the dead button, not a graceful
  // degradation.
  if (IS_PORTAL_BUILD) return 'none'
  if (framed()) return 'none'
  if (file === null) return 'none'
  try {
    if (typeof URL.createObjectURL !== 'function') return 'none'
    if (!('download' in document.createElement('a'))) return 'none'
  } catch {
    return 'none'
  }
  return 'download'
}

/**
 * Set the moment anything refuses, and never cleared.
 *
 * A permissions policy that blocked the first share blocks the second; a
 * canvas that could not be encoded once will not encode the next run either.
 * The player gets one silent failure at most, and then the affordance is gone
 * for the session — which is also what keeps a portal reviewer from finding a
 * button that does nothing twice in a row.
 */
const blocked = ref(false)
/** A share is in flight — the button disables rather than queueing a second. */
const busy = ref(false)

export const shareCardBusy: Ref<boolean> = busy

/**
 * Whether the result screen may show the button AT ALL.
 *
 * Deliberately says nothing about whether the run deserves one — that is the
 * result screen's question, and it asks it with the leaderboard's own numbers.
 */
export const shareCardOffered: ComputedRef<boolean> = computed(
  () => !blocked.value && shareAffordance() !== 'none'
)

/** The file the card is shared as. ASCII, lower case, no locale: it becomes a
 *  filename on somebody's phone and on somebody's desktop. */
const fileNameFor = (stage: number): string =>
  `survivalist-stage-${Math.max(0, Math.trunc(stage) || 0)}.jpg`

/** The player closed the share sheet. Nothing failed, and nothing may be
 *  demoted for it — cancelling is the most common outcome of a share. */
const cancelled = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError'

export interface ShareRunCardOptions extends ShareCardSpec {
  /** The message that rides with the picture in the OS sheet. */
  text: string
}

/**
 * Build the card and hand it to the platform. Never throws, never rejects.
 *
 * The render happens INSIDE the tap's handler and is deliberately the only
 * thing between the tap and the `share()` call: Web Share needs transient user
 * activation, which expires a few seconds after the gesture, so a card that
 * took a detour through an idle callback or a network fetch would arrive at a
 * `share()` that had already lost the right to open. Drawing 1080×1080 and
 * encoding it is a fraction of that budget on a throttled phone.
 *
 * @returns `true` when the card actually left the game.
 */
export const shareRunCard = async (o: ShareRunCardOptions): Promise<boolean> => {
  if (busy.value || blocked.value) return false
  const mode = shareAffordance()
  if (mode === 'none') return false

  busy.value = true
  try {
    const { renderShareCard } = await import('@/game/shareCardArt')
    const blob = await renderShareCard(o)
    if (!blob) {
      blocked.value = true
      return false
    }
    const name = fileNameFor(o.stage)

    if (mode === 'share') {
      const file = new File([blob], name, { type: blob.type || 'image/jpeg' })
      // Asked AGAIN with the real file. The probe proves the browser can share
      // files; a target can still refuse this particular one on size or type,
      // and `share()` with an unshareable payload throws `TypeError` rather
      // than resolving to a no-op.
      if (!navigator.canShare({ files: [file] })) {
        blocked.value = true
        return false
      }
      await navigator.share({ files: [file], title: o.title, text: o.text })
      return true
    }

    // The fallback, non-portal builds only.
    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.rel = 'noopener'
      a.click()
    } finally {
      // One frame, not zero: revoking in the same tick as the click races the
      // browser's own read of the blob on WebKit and produces an empty file.
      setTimeout(() => {
        try { URL.revokeObjectURL(url) } catch { /* already gone */ }
      }, 1000)
    }
    return true
  } catch (e) {
    if (!cancelled(e)) blocked.value = true
    return false
  } finally {
    busy.value = false
  }
}
