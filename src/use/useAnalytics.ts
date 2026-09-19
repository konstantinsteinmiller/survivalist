// ─── Analytics — the funnel the portal bracket cannot see ───────────────────
//
// `useGameplayLifecycle` tells every portal HOW LONG and HOW OFTEN somebody
// played. It cannot tell anyone WHERE they stopped, and "where" is the only
// question the retention roadmap is actually asking: a career that ends at
// stage 7 on a barricade and one that ends at stage 7 on a boss slam are two
// different bugs with two different fixes, and the bracket reports both as
// "one play, four minutes".
//
// So this module owns a second, finer signal. Six events, named once here and
// nowhere else:
//
//   stage_start   a stage opened          { stage, squad, relieved, challenge }
//   stage_end     a stage was cleared     { stage, peakSquad, kills, durationMs, coins }
//   wipe          a stage ended in a loss { stage, progress01, cause, durationMs }
//   gate_pass     a gate was taken        { op, value, before, after }
//   shop_open     the shop was opened     { coins, affordable, stage, via }
//   upgrade_buy   a track was bought      { id, level, cost }
//
// ─── What happens to an event ───────────────────────────────────────────────
//
// Two sinks, and NEITHER of them is allowed to be load-bearing:
//
//   1. THE RING. The last `RING` events are kept in memory and readable through
//      `analyticsLog()` — and, in debug, through `window.__analytics`. That is
//      what makes the wiring testable and what a QA session actually reads on a
//      device. It dies with the tab, on purpose: this game stores no telemetry
//      about anybody.
//   2. THE PORTAL. Whichever host page offers a generic event sink gets a copy.
//      Portals differ wildly here — most of the SDKs we ship against have no
//      custom-event API at all — so the fan-out PROBES rather than assumes, the
//      same way `gamepixPlugin` probes for `happytime`/`happyMoment`. A portal
//      with nothing to call is a silent no-op, which is the correct behaviour
//      and not a failure worth logging.
//
// ⚠️ No SDK module is imported here, and none should be. Every portal plugin in
// this project is either statically bundled behind an alias stub or dynamically
// imported behind its env flag; an import here would pull one portal's loader
// into every other portal's bundle for the sake of a probe that reads a global
// anyway. `window` is the only surface the probe touches — and the probe now
// lives in its own module (`@/use/analyticsSink`) so that the ONE build which
// may not have a sink at all, Playgama/YouTube Playables, can alias it away
// entirely rather than carrying four dead SDK names in its string table.
//
// ⚠️ Never call this from inside the frame loop for anything that happens per
// entity. `gate_pass` is the highest-frequency event in the list and fires a
// handful of times a stage; anything hotter belongs in `deathBreakdown()`.

import { probeSink, type Sink } from '@/use/analyticsSink'

export type AnalyticsEvent =
  | 'stage_start'
  | 'stage_end'
  | 'wipe'
  | 'gate_pass'
  | 'shop_open'
  | 'upgrade_buy'
  | 'armory_pick'

export type AnalyticsValue = string | number | boolean
export type AnalyticsProps = Record<string, AnalyticsValue | undefined>

export interface AnalyticsRecord {
  event: AnalyticsEvent
  props: Record<string, AnalyticsValue>
  /** ms since page load — a clock the player's timezone cannot identify them by. */
  at: number
}

/** How many events are kept for `analyticsLog()`. A career of twenty stages
 *  emits well under this, so a whole session is readable at the end of it. */
export const RING = 256

const ring: AnalyticsRecord[] = []

/**
 * Tidy one property bag into something every sink can take.
 *
 * Portal event APIs are wildly inconsistent about what they accept, and the one
 * thing they all dislike is a float with seventeen digits in it. So: `undefined`
 * is dropped (a caller writing `cause: maybeCause` should not produce a key with
 * no value), non-finite numbers are dropped rather than sent as `NaN`, floats
 * are rounded to three places, and strings are capped — a stray long string in
 * an event bag is always a bug, never data worth keeping.
 *
 * Pure, so the wiring can be asserted without a browser.
 */
export const normaliseProps = (props?: AnalyticsProps): Record<string, AnalyticsValue> => {
  const out: Record<string, AnalyticsValue> = {}
  if (!props) return out
  for (const key of Object.keys(props)) {
    const v = props[key]
    if (v === undefined) continue
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) continue
      out[key] = Number.isInteger(v) ? v : Math.round(v * 1000) / 1000
      continue
    }
    if (typeof v === 'string') { out[key] = v.slice(0, 64); continue }
    out[key] = v
  }
  return out
}

/**
 * Which system took this run.
 *
 * `deathBreakdown()` counts every body by cause, and the answer that tells you
 * what to tune is the cause that took the MOST of them — not the one that took
 * the last. A crowd chewed down to four by barricades and finished by a boss
 * slam is a barricade problem, and billing it to the slam is how a tuning pass
 * ends up on the wrong system.
 *
 * Ties break toward the earlier key in the map, which is stable because
 * `emptyDeaths()` builds it in a fixed order. `undefined` when nothing died —
 * a run that ended with the squad intact did not end this way at all.
 */
export const dominantCause = (breakdown: Record<string, number>): string | undefined => {
  let best: string | undefined
  let bestN = 0
  for (const key of Object.keys(breakdown)) {
    const n = breakdown[key] ?? 0
    if (n > bestN) { best = key; bestN = n }
  }
  return best
}

// ─── The portal sink ────────────────────────────────────────────────────────
//
// Probed once and cached, because the answer cannot change after boot and the
// probe walks four globals. `null` means "asked, nobody was listening" and is a
// perfectly ordinary result — most portals we ship to have no event API.
//
// The probe itself lives in `@/use/analyticsSink` so the Playgama build can
// alias the whole module away (`analyticsSink.stub.ts`) — see the note there.
// It names other portals' SDK globals plus `gtag`, and that archive is also
// the YouTube Playables submission, where those are exactly what a reviewer
// greps for.

let sink: Sink | null | undefined

/**
 * Record one event.
 *
 * Total and non-throwing by contract: this sits on the stage boundary and on
 * the gate branch, and an analytics call that can throw is an analytics call
 * that can end a run. Every sink is wrapped, and a sink that throws is dropped
 * for the rest of the session rather than retried every gate.
 */
export const track = (event: AnalyticsEvent, props?: AnalyticsProps): void => {
  const clean = normaliseProps(props)
  const at = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0

  ring.push({ event, props: clean, at })
  if (ring.length > RING) ring.splice(0, ring.length - RING)

  if (sink === undefined) sink = probeSink()
  if (!sink) return
  try { sink(event, clean) }
  catch (e) {
    sink = null
    console.warn('[analytics] portal sink threw; disabled for this session', e)
  }
}

/** Everything recorded this session, oldest first. QA + specs read this. */
export const analyticsLog = (): readonly AnalyticsRecord[] => ring

/** Test seam: empty the ring and re-probe the sink. */
export const __resetAnalytics = (): void => {
  ring.length = 0
  sink = undefined
}

/**
 * Publish the log for a device session.
 *
 * Debug only — it is the difference between "the tester says it got hard around
 * seven" and a list of six wipes with a cause on each. Called once from the
 * scene's boot.
 */
export const exposeAnalytics = (): void => {
  if (typeof window === 'undefined') return
  ;(window as any).__analytics = analyticsLog
}
