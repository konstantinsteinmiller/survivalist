import { LANE_HALF, REWARD_CAGE_X as X, UNIT_R } from '@/game/survival'

/** The rail the crowd is hard-clamped to (`EDGE_X` is module-private to the
 *  sim, so it is re-derived here from the two constants it is made of). */
export const EDGE_X_TEST = LANE_HALF - UNIT_R
export const REWARD_CAGE_X = Math.abs(X)
