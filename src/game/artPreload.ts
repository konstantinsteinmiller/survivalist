import { stageDesigns, rosterDesigns, bossDesign, arenaKit } from '@/game/foes'
import { THREAT_POOL_FROM_STAGE, minibossKindFor, bossKindFor, SUMMON_DESIGN } from '@/game/threats'
import { OUTFITS } from '@/game/heroSprites'
import {
  BOSS_REWARD_STAGE, BOSS_REWARD_WEAPON,
  WEAPON_PICK_STAGE, isWeaponId, stageHasWeapon, stageHasWeaponGift, weaponForStage
} from '@/game/weapons'
import { WEAPON_PICK_KEY } from '@/keys'
import { allMonsterIds } from '@/game/monsterSprites'
import { ART_CATALOGUE } from '@/game/artCatalogue'
import { artSettled, artOverridesEnabled, type ArtWant } from '@/game/art'
import { deviceClass } from '@/use/deviceProfile'
import { getState } from '@/use/useTowerState'
import { STAGE_KEY } from '@/keys'

/**
 * ─── Staged art loading ─────────────────────────────────────────────────────
 *
 * With painted art on, the naive version fetches the whole set at once: every
 * strip, every prop, every round and effect — fifty-odd files, most of them for
 * things a first-time player will not see for ten minutes. A brute debuts on
 * stage 7 and the healer's bolt on stage 4; a first-time player on a phone
 * would pay for both on stage 1.
 *
 * So the set is staged, and the stages are DERIVED from the game's own tables
 * rather than listed: a design's tier is the first stage it can walk on, read
 * off `foeRoster` through `stageDesigns`; a round's tier is the first stage
 * its miniboss or boss kind can be fielded. Balance changes move the art with
 * them, and nothing here goes stale when a stage is retuned.
 *
 *   tier 0 — behind the splash, `fetchPriority: high`. What the FIRST SCREEN
 *            shows: the squad, the roster walking at them, the horizon, the
 *            gates and the post between their leaves, the pickups, and the
 *            effects every shot makes.
 *   tier 1 — once the page's own load is done and the thread has an idle slot,
 *            normal priority, one at a time, in the order the stage reaches
 *            them: the skills, the elite's crown, the weapon puzzle, the boss
 *            and what it throws, then the next stage on the same terms.
 *   tier 2 — after tier 1 has settled, `fetchPriority: low`, in one batch.
 *            Everything else, so nothing a resuming player skipped past is
 *            orphaned. Skipped outright on a data-saver connection, and on a
 *            device that named a weak GPU — see `memoryConstrained`.
 *
 * Nothing waits on tiers 1 or 2. A design whose strip has not arrived when it
 * first walks on simply draws its procedural body, exactly as it does with the
 * art switched off.
 *
 * ─── What tier 0 is FOR ─────────────────────────────────────────────────────
 *
 * The first-time player, on stage 1, from a cold cache. They are the only
 * player who sees the game for the first time, and what they must see is a
 * finished picture — so the splash holds for everything on screen in the
 * opening seconds and for nothing that arrives later, however certain it is to
 * arrive. Every file moved out of tier 0 is time off that player's first
 * impression; every file left in that they cannot see yet is time spent on
 * nothing.
 *
 * The line, therefore, is WHEN IT IS ON SCREEN, not whether the stage has it:
 * the boss stands a stage away, the elite is a midpoint, the weapon puzzle is
 * an optional beat partway down the road. All three are tier 1, and tier 1
 * starts the moment the splash is down.
 *
 * ─── …and why sound is not here at all ──────────────────────────────────────
 *
 * `useAssets` runs the SFX decode only once this module's promise resolves —
 * i.e. after every painting has landed — and the music element is pointed at a
 * track by `useSound` when a battle starts, so it is fetched on demand and
 * never competes. An SFX that has not decoded is a frame of latency the first
 * time it fires; a strip that has not arrived is a red ellipse in the middle of
 * the screen. The art wins every time.
 */

/**
 * The stage the player is about to play, or 1 for a new player.
 *
 * `ts_stage` is the campaign position — the stage a wipe restarts — and the
 * loader already reads it for the sprite bake, so it is the right key here
 * too: the enemies it names are the ones the first frame will show.
 */
export const resumeStage = (): number => {
  try {
    const raw = Number(getState(STAGE_KEY, 1))
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
  } catch { return 1 }
}

const uniq = (wants: ArtWant[]): ArtWant[] => {
  const seen = new Set<string>()
  return wants.filter(([k, id]) => {
    const key = `${k}/${id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** The rounds and effects a stage's elite and boss kinds actually throw. */
const threatWants = (stage: number): ArtWant[] => {
  const wants: ArtWant[] = []
  // The meteor's ring is every boss's slam telegraph, and the guard and its
  // crest are every boss's mid-fight shield.
  wants.push(['fx', 'ring-heat'], ['fx', 'guard'], ['fx', 'crest-guard'])
  const boss = bossKindFor(stage)
  if (boss === 'meteor') wants.push(['round', 'meteor'])
  if (boss === 'healer') wants.push(['round', 'bolt-boss'], ['fx', 'ring-heal'])
  if (boss === 'summoner') wants.push(['monster', SUMMON_DESIGN])
  if (stage >= THREAT_POOL_FROM_STAGE) {
    // THREE indices, because a road fields three elites from stage 6
    // (`placeMinibosses`). It walked two, which under-preloaded the last
    // landmark's round by one slot — and from `MINIBOSS_TIER2_FROM_STAGE` the
    // pool is six kinds wide, so which kind lands on which index moved and the
    // gap started biting. The cost of the extra slot is at most one round
    // sprite; the cost of missing one is a round that draws as the procedural
    // fallback on the frame it is fired.
    for (const index of [0, 1, 2]) {
      const kind = minibossKindFor(stage, index)
      if (kind === 'roller') wants.push(['round', 'roller'])
      if (kind === 'bomber') wants.push(['round', 'bomb'])
      if (kind === 'gunner') wants.push(['round', 'bolt-gunner'])
      // A burrower's eruption IS a bomber's fuse and blast — it announces with
      // `bombCast` and lands with `bombBlast` (see `stepBurrower`), so it wants
      // the same round. Listing it beside the bomber rather than folding the two
      // together, because they are two fights that happen to share a sprite and
      // the day one of them gets its own, this is the line that changes.
      if (kind === 'burrower') wants.push(['round', 'bomb'])
      // The warden has no round at all: its row is drawn from the claw's own
      // ground telegraph (`rakeCast`), which every boss stage already carries.
    }
  }
  if (arenaKit(stage).barrels > 0) wants.push(['prop', 'barrel'])
  return wants
}

/**
 * The weapon puzzle's furniture, on the stages that carry one.
 *
 * Not tier 0, and the reason is the beat's own shape: it sits partway down the
 * road, on a shoulder, and it is OPTIONAL — a player who never looks at it pays
 * nothing. Half the campaign's roads carry no puzzle at all, so holding a first
 * screen for five files that may not be on this stage, and are a minute away
 * when they are, is a slower start bought for nothing.
 *
 * It does go out FIRST in tier 1, though, ahead of the boss and its rounds. The
 * whole mechanic is a test of attention — the levers are cheap to break and
 * expensive to find — and a lever that arrives as a grey drawing and repaints
 * itself two seconds later is the game moving the one thing it is asking the
 * player to notice.
 */
const weaponPuzzleWants = (stage: number): ArtWant[] => {
  // The stage-2 gift is a box and nothing else — no posts, no arms, no plates.
  // Asking for the puzzle's furniture there would queue four files for a beat
  // that has none of them, on the stage where the first screen is tightest.
  if (stageHasWeaponGift(stage)) {
    return [['prop', 'weapon-box'], ['prop', 'weapon-box-open']]
  }
  if (!stageHasWeapon(stage)) return []
  const wants: ArtWant[] = [
    // The levers, then their cover, then the prize behind it: the order the
    // player's eye travels the beat.
    ['prop', 'lever-post'], ['prop', 'lever-arm'], ['prop', 'guard-plate'],
    ['prop', 'weapon-box'], ['prop', 'weapon-box-open']
  ]
  // The launcher's rocket, on the stages whose box holds it — which is every
  // other puzzle stage, not every other stage. See `weaponForStage`.
  if (weaponForStage(stage) === 'rocket') wants.push(['round', 'rocket'])
  return wants
}

/**
 * The weapon the player chose for `WEAPON_PICK_STAGE`, off the save, without
 * dragging the simulation onto the boot path. `null` until they have chosen.
 */
const weaponPick = (): 'rocket' | 'gatling' | null => {
  try {
    const v = getState<unknown>(WEAPON_PICK_KEY, null)
    return isWeaponId(v) ? v : null
  } catch { return null }
}

/**
 * The weapon choice's own art: the two cards, for a player who is about to be
 * asked, and the rocket, for one who chose the launcher. Empty for everyone
 * past the pick — the puzzle's wants cover the rounds from there.
 */
const weaponPickWants = (stage: number): ArtWant[] => {
  const pick = weaponPick()
  const wants: ArtWant[] = []
  if (stage < WEAPON_PICK_STAGE && pick === null) {
    wants.push(['ui', 'weapon-card-rocket'], ['ui', 'weapon-card-gatling'])
  }
  const rocketNext = stage === WEAPON_PICK_STAGE - 1 && pick !== 'gatling'
  const rocketNow = stage === WEAPON_PICK_STAGE && pick === 'rocket'
  // …and the stage-1 boss's launcher: dropped at the end of stage 1 and fired
  // for the whole of the next, so both roads want its round.
  const bossGift = stage <= BOSS_REWARD_STAGE + 1 && BOSS_REWARD_WEAPON === 'rocket'
  if (rocketNext || rocketNow || bossGift) wants.push(['round', 'rocket'])
  return wants
}

/**
 * Tier 0: what the splash holds for — the first screen, and only that.
 *
 * A resuming player's first screen is their own stage, not stage 1. Fetching
 * the starting cast for someone on stage 9 means the brutes they are about to
 * meet pop in mid-run, which is the one moment the swap is most visible.
 */
export const criticalArtWants = (): ArtWant[] => {
  const stage = resumeStage()
  return uniq([
    // The squad, and the roster walking at it.
    //
    // The ROSTER, not `stageDesigns` — which is the roster PLUS the boss. As
    // the tables stand the split saves nothing at all: every design in
    // `BOSS_DESIGNS` is also a road foe, so a stage's boss is the creep it has
    // been fighting all along and tier 0 was already fetching it as scenery.
    // It is written this way because the RULE is the point. A boss stands at
    // `arenaY`, a whole stage from the first frame; the day the cast grows a
    // design that only ever appears at the end of a road, the splash must not
    // silently grow by the heaviest strip in the set. Tier 1 picks it up.
    ...OUTFITS.map((o): ArtWant => ['hero', o.id]),
    ...rosterDesigns(stage).map((id): ArtWant => ['monster', id]),
    // The horizon, and what every road has on it.
    ['bg', 'ridge-far'], ['bg', 'ridge-near'],
    // The pickups and the road furniture, all of it inside the first screen or
    // a few seconds past it.
    ['prop', 'crate-damage'], ['prop', 'crate-rate'], ['prop', 'barricade'],
    ['prop', 'boulder-1'], ['prop', 'boulder-2'], ['prop', 'boulder-3'],
    ['prop', 'coin'],
    // The divider post between two gate leaves. It is part of the gate as far
    // as the player is concerned — a bank drawn with painted frames and a grey
    // post between them reads as a half-finished gate, not as a late prop.
    ['prop', 'pillar'],
    // Gates: the paying door is on every stage, the trap from stage 2, the
    // bill from stage 3 (see `track.ts`), the multiplier from the first bank
    // that rolls one.
    ['gate', 'frame-add'], ['gate', 'frame-mul'],
    ...(stage >= 2 ? [['gate', 'frame-div'] as ArtWant] : []),
    ...(stage >= 3 ? [['gate', 'frame-sub'] as ArtWant] : []),
    // What every second of play shows.
    ['round', 'tracer'], ['fx', 'muzzle'], ['fx', 'smoke'], ['fx', 'scorch'], ['fx', 'ring-shock'],
    // The chest, the shop button and the grenade button are on screen from the
    // first second of every run — and the grenade's own round is 5 kB, so the
    // one thing a first-time player DOES reach for is painted when they reach.
    // The chest leads: it is the first thing a new player is ever paid by, and
    // it is claimable before the road has moved.
    ['ui', 'chest'], ['ui', 'forge'], ['ui', 'skill-grenade'], ['round', 'grenade']
  ])
}

/**
 * Tier 1: the rest of THIS stage, in the order the road reaches it, and then
 * the next stage on the same terms.
 *
 * The order is the whole value here, because tier 1 is awaited one file at a
 * time: on a slow connection the thing the player meets in twenty seconds has
 * to finish before the thing they meet in two minutes starts.
 */
export const earlyArtWants = (): ArtWant[] => {
  const stage = resumeStage()
  const have = new Set(criticalArtWants().map(([k, id]) => `${k}/${id}`))
  return uniq([
    // Bought and thrown inside the first minute.
    ['fx', 'shield'], ['fx', 'crest-shield'], ['ui', 'skill-shield'],
    // The weapon choice on the handover into stage 3, and the loaner it hands
    // over. The two cards for anyone who has not chosen yet; the launcher's
    // rocket for the stage the pick rides — and for the stage before it, since
    // stage 3 starts the instant the card is tapped.
    ...weaponPickWants(stage),
    // The midpoint fight: an elite is a scaled-up roster design that is already
    // here, so all it needs is the crown it wears.
    ...(stage >= 2 ? [['ui', 'crown'] as ArtWant] : []),
    // The optional beat on the shoulder, ahead of the boss because it is the
    // one thing the player has to NOTICE.
    ...weaponPuzzleWants(stage),
    // The alarm the corner wears the first time anything winds up an attack.
    // Three small files, and the badge is the one mark on the screen a player
    // is meant to catch WITHOUT looking at it — so it may not arrive late and
    // change shape under them mid-fight.
    ['ui', 'warn-away'], ['ui', 'warn-into'], ['ui', 'warn-still'],
    // The thing at the end of the road, and everything it throws.
    ['monster', bossDesign(stage)],
    ...threatWants(stage),
    // The banner the stage ends on.
    ['ui', 'ribbon'],
    // …then the next stage, so a player who clears this one never waits again.
    ...stageDesigns(stage + 1).map((id): ArtWant => ['monster', id]),
    ...weaponPuzzleWants(stage + 1),
    ...threatWants(stage + 1),
    // Stage 1 is the one road with no elite on it, and its player is two
    // minutes from the stage that has one.
    ['ui', 'crown']
  ]).filter(([k, id]) => !have.has(`${k}/${id}`))
}

/** Tier 2: every painting the game can ask for, in one low-priority sweep. */
export const allArtWants = (): ArtWant[] => uniq([
  ...OUTFITS.map((o): ArtWant => ['hero', o.id]),
  ...allMonsterIds().map((id): ArtWant => ['monster', id]),
  ...(Object.entries(ART_CATALOGUE) as [Exclude<keyof typeof ART_CATALOGUE, never>, readonly string[]][])
    .flatMap(([kind, ids]) => ids.map((id): ArtWant => [kind, id]))
])

/** How long the tiers will wait for the page's own load before going anyway. */
const LOAD_CEILING_MS = 5000

/** Resolve on the next idle slot, or after `timeout`, whichever comes first. */
const idle = (timeout: number): Promise<void> => new Promise<void>((resolve) => {
  const ric = (globalThis as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
  }).requestIdleCallback
  if (typeof ric === 'function') ric(() => resolve(), { timeout })
  else setTimeout(resolve, Math.min(timeout, 1500))
})

/**
 * Hold until the browser is done with the page's own load, and then until the
 * main thread has a slot to spare.
 *
 * Tier 1 is forty-odd files that nobody is waiting for, and it used to start
 * the instant the splash came down — straight into the window where the scene
 * is mounting, the first frames are being composed and the document's own
 * subresources may still be in flight. On a phone that is the moment the
 * connection is busiest and the thread is most contended, spent on art for a
 * fight a minute away.
 *
 * `load` is the honest signal for "the page has what it came for". It is
 * bounded, because a single stalled subresource must never strand the tiers
 * behind it, and followed by an idle slot so a busy thread gets one more
 * chance to finish what it is doing first.
 */
const networkQuiet = async (): Promise<void> => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined'
    && document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      const done = (): void => { window.removeEventListener('load', done); resolve() }
      window.addEventListener('load', done, { once: true })
      setTimeout(done, LOAD_CEILING_MS)
    })
  }
  await idle(3000)
}

/**
 * Has the player asked not to be spent?
 *
 * `saveData` is an explicit setting, not a guess about the network, and tier 2
 * is the one tier that fetches art for stages the player may never reach. The
 * procedural renderer is exactly the fallback a data saver is asking for, so
 * the sweep is skipped outright — tiers 0 and 1 still run, because those are
 * what is actually on screen.
 */
const dataSaver = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return !!(navigator as { connection?: { saveData?: boolean } }).connection?.saveData
}

/**
 * …and the other reason to skip the sweep, which is not about bandwidth.
 *
 * Tier 2 is every painting in the game. Decoded, the full set is **66 MB of
 * RGBA** — 23 MB of it the thirteen monster strips, which are then sliced into
 * per-frame canvases and held a second time. On a phone or a Chromebook with
 * one memory pool shared with the GPU that is a texture working set several
 * times the size of the frame buffer, and the cost of exceeding it is not a
 * slow frame, it is the compositor evicting and re-uploading textures for the
 * rest of the session.
 *
 * A device that named a weak GPU before the first frame (`deviceProfile.ts`) is
 * the one that cannot carry it, and it is also the one with the least to gain:
 * the procedural renderer IS the fallback, it is what the game shipped with,
 * and tiers 0 and 1 have already covered everything this stage and the next one
 * can put on screen. So the sweep for stages the player may never reach is the
 * first thing to go.
 */
const memoryConstrained = (): boolean => deviceClass() === 'weak'

let started = false

/**
 * Tiers 1 and 2. Idempotent; call it once the splash is down.
 *
 * RESOLVES when the last painting has landed, and that is load-bearing:
 * `useAssets` sequences the SFX decode behind this promise, so sound never
 * takes bandwidth from a bitmap that is still on the wire. With overrides off
 * it returns immediately and the sounds start as they always did.
 *
 * Tier 1 is awaited one file at a time so that a slow connection still gets
 * the next stage's first newcomer before its last — a parallel burst would
 * let the biggest file win. Tier 2 goes out in one low-priority batch after
 * another idle slot, because by then order no longer matters and the browser's
 * own scheduler does a better job of fitting it around play than a chain
 * would.
 */
export const preloadRemainingArt = async (): Promise<void> => {
  if (started || !artOverridesEnabled()) return
  started = true

  await networkQuiet()
  for (const [kind, id] of earlyArtWants()) await artSettled(kind, id)

  if (dataSaver() || memoryConstrained()) return
  await idle(8000)
  await Promise.allSettled(allArtWants().map(([kind, id]) => artSettled(kind, id, 'low')))
}

/** Test seam: forget that the tiers have run. */
export const __resetArtPreload = (): void => { started = false }

// ─── The boss's death, fetched late on purpose ──────────────────────────────
//
// A death strip is the one painting in the game that is only ever seen at the
// END of a stage, once per stage, for about a second — and it is one of the
// heaviest (eight wide panels). So it rides none of the tiers above: not the
// splash, which would hold a first-time player for a file they will not see
// for a minute, and not the idle sweep, which would fetch the whole boss roster
// for a player on stage 1. It is asked for when the road is `DEATH_ART_FROM`
// run — late enough to cost nothing on the way in, early enough that the
// arena, the fight and the kill are all still ahead of it. Through the ordinary
// probe, so a copy already fetched (this session or the HTTP cache's) is a
// no-op, and a miss is the drawn topple the renderer always had.

/** How far down the road the boss's death strip is asked for. */
export const DEATH_ART_FROM = 0.8

/** The boss death that stage `n` ends on, as the probe asks for it. */
export const deathArtWant = (stage: number): ArtWant => ['death', bossDesign(stage)]

/** Is it time to ask? */
export const deathArtDue = (progress01: number): boolean => progress01 >= DEATH_ART_FROM
