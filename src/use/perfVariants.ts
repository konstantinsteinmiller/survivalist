// ─── Boot-frozen performance variant flags ──────────────────────────────────
//
// The A/B seam for performance experiments. See `PERF-LEDGER.md` for the
// procedure and for every experiment this project has run.
//
// ── Why the flag is frozen at boot ──
//
// Resolved ONCE, here, at module load. A flag that re-read `localStorage` or
// parsed the URL on each access would itself land in the hot loop it is meant
// to measure, and the two arms would then differ by more than the change under
// test. Read it as a `const` at module scope; never inside a per-frame call.
//
// ── Running an experiment ──
//
//   1. Add a flag below naming the BASELINE arm — `<thing>-legacy`, not
//      `<thing>-new`. The shipping path must be what you get with no flag set,
//      so a stray query string can never turn a player's game into an
//      experiment.
//   2. Branch at the COARSEST level that isolates the change (swap the emitter,
//      not each particle) so the check never lands in an inner loop.
//   3. Keep the baseline path exactly as it was. Tidying it up while you are in
//      there contaminates the comparison.
//   4. Measure: `pnpm perf:ab --a "perf=<thing>-legacy" --b ""`.
//   5. Record the verdict in `PERF-LEDGER.md`, then DELETE the losing branch
//      and its flag. Shipping both paths forever is how a dead branch rots and
//      a flag ends up in a hot loop.
//
// Select with `?perf=<name>` on the URL, or
// `localStorage.setItem('perf', '<name>')`. Comma-separate to combine.
// With nothing set, every experiment resolves to its SHIPPING value, so this
// file costs one string read at boot and nothing else in production.

const raw = (() => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('perf')
    if (fromUrl) return fromUrl
    return localStorage.getItem('perf') ?? ''
  } catch {
    // Private mode can throw on `localStorage`, and there is no `window` under
    // SSR or in a worker. An experiment seam must never be the thing that
    // breaks a boot.
    return ''
  }
})()

const flags: ReadonlySet<string> = new Set(raw.split(',').map(s => s.trim()).filter(Boolean))

/** Whether a named baseline arm is selected. Call at MODULE scope and keep the
 *  result in a `const` — never per frame. */
export const perfFlag = (name: string): boolean => flags.has(name)

/**
 * Every flag actually parsed this boot.
 *
 * The A/B runner reads this back to assert the arm it asked for is the arm that
 * ran. A typo'd flag is silently false, which without this check produces a
 * clean, confident, completely worthless A-versus-A result.
 */
export const activeVariants = (): string[] => [...flags]

// ─── Live experiments ───────────────────────────────────────────────────────
//
/**
 * Baseline: paint the full-screen vignette as a live radial gradient.
 *
 * The shipping path blits a small baked texture instead. This is a RE-TEST of
 * an experiment the ledger already rejected once (2026-09-05, "-0.0 %") and it
 * is only legitimate because the metric changed: that run measured `workP95`
 * under CPU throttling on a phone-sized canvas with a real GPU, and the failure
 * this is aimed at is fill-bound — a 2.7 Mpx canvas on an Adreno 618, where the
 * cost is a radial shader evaluated per pixel rather than the JS that submits
 * it. Delete the loser and record the verdict in `PERF-LEDGER.md`.
 */
export const VIGNETTE_GRADIENT = perfFlag('vignette-gradient')
