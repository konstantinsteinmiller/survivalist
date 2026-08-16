<script setup lang="ts">
/**
 * The leaderboard's mark.
 *
 * An inline SVG rather than a webp like `IconCoin`, for two reasons: there is no
 * trophy in the prop art (every other icon on the result screen is a game
 * object, and this one is UI), and it has to take the gold of whatever row it
 * sits in — `currentColor` does that for free, where a bitmap would need a
 * second file per colour.
 *
 * Built from primitives rather than one clever path so every number in it is
 * checkable: the bowl's arc is a true semicircle (chord 9 = 2r), and every other
 * part is a rounded rectangle stacked on the one above it. It is drawn at ~16 px
 * on a 320 px phone, so there is deliberately no interior detail to lose.
 *
 * Sized by the caller, exactly as `IconCoin` is.
 */
</script>

<template lang="pug">
  svg(
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  )
    //- Rim, then the bowl: a straight-sided box that turns into a half-disc.
    rect(x="6.5" y="3" width="11" height="1.8" rx="0.5")
    path(d="M7.5 4.8h9v3.2a4.5 4.5 0 0 1-9 0V4.8Z")
    //- Handles. Stroked, because they are outlines and not bodies — and the one
    //- part of the shape that reads at a glance as "trophy" rather than "cup".
    g(fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round")
      path(d="M7.5 5.8C3.6 5.8 3.6 10.4 7.5 10.4")
      path(d="M16.5 5.8C20.4 5.8 20.4 10.4 16.5 10.4")
    //- Stem, plate, foot.
    rect(x="10.9" y="12" width="2.2" height="4.6" rx="0.4")
    rect(x="8.6" y="16.6" width="6.8" height="1.6" rx="0.5")
    rect(x="6.8" y="18.2" width="10.4" height="2.4" rx="0.8")
</template>
