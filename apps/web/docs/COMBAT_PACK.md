# Combat Sports Pack: plan (Stage 1, 2026-11-27)

Owner brief: professional, anatomically believable boxing / Muay Thai / MMA / BJJ poses, effects, outfits,
multi-character exchanges and arenas. Delivered in 5 stages, each one reviewed by the owner before the next.
This file is the plan and the status. Contracts live in `docs/CHARACTER_STUDIO.md` once each stage ships.

## 1. What already exists (reuse, do not rebuild)

| Need | Already in the app | Gap |
|---|---|---|
| Pose data | `Pose` (24 joints, Euler, root offset/rotation, hand shapes, ground), body-term DSL `data/poseDsl.ts`, 25 single-frame martial poses `data/posesMartial.ts` | No keyframes (start/peak/recover), no weight, no target, no rear-heel pivot / foot turn / shoulder shrug in the DSL, stance blading was wrong (BUG-279, fixed 2026-11-27) |
| Mirror | `rig/poseOps.ts` `mirrorPose` (swaps sides, flips twist / side / yaw / roll, ground) | Southpaw is hand-written duplicate data today; nothing mirrors a strike's limb or target |
| Joint limits | `rig/limits.ts` `clampPose`, tests keep every library pose inside | none |
| Easing / tween | `blendPoses`, `poseToKeyframes` (`rig/poseOps.ts`) | No caller: pose animation on the timeline does not exist (CHARACTER_STUDIO §9.3 says "phase 10: stepped cached drawings") |
| IK / reach | `rig/ik.ts` two-bone, `rig/reach.ts` `reachWithLean` (arms) | No leg reach (kicks, knees) |
| Grounding | `rig/grounding.ts` (feet only) | No knee / hip / back contact (penetration step, guard, mount) |
| Two people in contact | `scene/layout/pairPoseDefs.ts` + `pairPoses.ts` (distance, facing, hand-to-spot solve over 120–190 cm) | Contact is hand-to-body only, static; no attacker → defender reaction, no sequence |
| Scenes | `scene/schema` (MAX_ACTORS 5, each actor embeds its Character JSON), templates, views, LRU render memo | No fight presets, no choreography |
| Sets / crowds | `scene/sets` generators (quad / box / card / line), `stadium.ts`, `crowd.ts` (≤ 80 seeded cards, haze by distance) | No ring / stadium ring / cage; crowd is one band behind the stage, no tiers around a ring, no reactions |
| Effects | `character.effects` (wind, wet: cloth / hair displacement), comic `addMangaEffect` (focus / speed / burst lines) | No impact flash, smear, shockwave, sweat, shake, hit-stop, hit reactions |
| Wardrobe | top / bottom / shoes / ≤ 6 accessories / held; outfit presets with `group: 'combat'` | No gloves as wear (gloves are a held prop), no wraps, mouthguard, head guard, mongkol, prajioud, gi, belt ranks, rashguard, spats (BUG-280) |

## 2. Core design: a move is data, the body is solved

```ts
// src/character/combat/types.ts (Stage 2)
type Discipline = 'boxing' | 'muay-thai' | 'mma' | 'wrestling' | 'bjj';
type MoveCategory = 'stance' | 'punch' | 'kick' | 'knee' | 'elbow' | 'defence'
    | 'clinch' | 'takedown' | 'ground' | 'reaction';
type Limb = 'handL' | 'handR' | 'footL' | 'footR' | 'kneeL' | 'kneeR' | 'elbowL' | 'elbowR';
type Target = 'head' | 'body' | 'leg';
type Ease = 'snap' | 'linear' | 'settle' | 'drop';   // snap = fast out (strike), settle = slow in (recover)

interface MoveKey {
    spec: FightSpec;      // PoseSpec + leg.heel, leg.pivot, arm.shrug (body terms, degrees)
    weight: number;       // share on the LEAD foot 0..1; solved per body (pelvis over the support point)
    frames: number;       // frames (24 fps) from the previous key to this one
    ease: Ease;
    contact?: ('kneeL' | 'kneeR' | 'hips' | 'back')[];   // extra floor contacts (grounding is feet only)
}
interface CombatMove {
    id: string; name: string; discipline: Discipline; category: MoveCategory;
    stance: 'orthodox';                 // authored once; southpaw = mirrorMove(move)
    strike?: { limb: Limb; target: Target; reach: number };  // reach = share of limb length at peak
    keys: { start: MoveKey; peak: MoveKey; recover: MoveKey };
    hitStop: number;                    // frames frozen on the peak (0 for non-strikes, 2..4 for strikes)
    how: string;                        // the "how it works" note
}
```

Why the striking limb is solved, not hand-tuned: the probe below shows hand-tuned angles land the jab fist 31 cm
off the centreline at chest height (body yaw carries the arm). At `peak` the rig solves the striking limb by IK to
the target line (`head` = eye line, `body` = solar plexus, `leg` = mid thigh) at `reach` × limb length, clamped by
the joint limits. The same solve gives Stage 4 its contact point on the defender. The data stays body-size free:
weight, strike and contacts are solved per skeleton, like `pairPoses.ts` already does.

Conventions (fixed in Stage 2, tested): the fighter faces +z (the opponent). Orthodox = left foot and left shoulder
lead, so root yaw is **negative** (`rotY(+30)` moves the left side back, BUG-279). Hips = root yaw, shoulders =
root yaw + spine twist, eyes = shoulders + head turn ≈ 0 (eyes on the opponent).

Mirror: `mirrorMove` = `mirrorPose` on every key + swap the `strike.limb` side + flip `contact` sides. Southpaw
entries are never stored.

Playback (needs an owner decision, see §5 Q1): `bakeMove(move, character)` → frame poses (blend start → peak with
`snap`, hold `hitStop` frames, peak → recover with `settle`), each drawn once and cached; the timeline swaps cached
drawings (the decision already in CHARACTER_STUDIO §9.3). No per-frame allocation or re-render at playback.

## 3. File structure (new files only; every data file joins `DATA_FILES` in `fileBudget.test.ts`)

```
src/character/combat/                 pure domain (no React / store / DOM)
  types.ts            CombatMove, MoveKey, FightSpec, Limb, Target, Ease            (Stage 2)
  fightDsl.ts         FightSpec → Pose (poseDsl + heel / pivot / shrug)               (2)
  mirror.ts           mirrorMove, stance helpers                                      (2)
  ease.ts             easing curves + frame timing                                    (2)
  solve.ts            weight shift, strike IK (arms + new leg reach), knee contact    (2)
  bake.ts             move → frame poses, hit-stop, cache key                         (2)
  registry.ts         moves by id / discipline / category                             (2)
  data/boxing.ts, muayThai.ts, mma.ts, wrestling.ts, bjj.ts, reactions.ts             (2)
src/character/data/garmentsCombat.ts, outfitsCombat.ts   gear + presets, belt colours (3)
src/character/render/combatGear.ts    gloves, wraps, mouthguard, mongkol, prajioud, gi (3)
src/scene/fx/                         effects: types.ts, presets.ts (subtle / normal / dramatic),
                                      impact.ts (flash, ring, smear, speed lines, sweat), shake.ts (3)
src/scene/combat/                     exchanges.ts (interaction pairs), place.ts (distance / facing /
                                      height from the strike solve), choreo.ts (sequence, fight combo),
                                      presets.ts (sparring, pad work, full fight, KO)                 (4)
src/scene/sets/environments/          boxingRing.ts, thaiRing.ts, cage.ts                             (5)
src/scene/sets/crowdTiers.ts          front / mid / back rings of cards, reactions, colour variation  (5)
src/scene/world/look.ts (moods), src/scene/camera/views.ts (fight shots)  extended                    (5)
UI: Pose tab "Combat" filter + stance switch; Scene Studio "Fight" section (Stage 2 / 4)
```

## 4. Sample poses (orthodox, adult 174 cm; positions from the rig, cm, +x = fighter's left, +z = toward the opponent)

DSL terms as in `poseDsl.ts`. `heel` / `pivot` / `shrug` are the new Stage 2 fields (not in the probe). All nine
keys passed `clampPose` unchanged on a 174 cm adult and a 145 cm 12-year-old.

| Key | Root (yaw, y, z) | Spine / head | Lead leg (L) | Rear leg (R) | Lead arm (L) | Rear arm (R) | Weight on lead | Frames, ease | Probe result |
|---|---|---|---|---|---|---|---|---|---|
| **Jab** start | -30, -4, 0 | bend 10 twist 8 / nod 14 turn 22 | lift 18 bend 18 twist 25 | lift -16 bend 16 twist 15, heel 15 | raise 62 bend 118 (guard, eye line) | high guard 85/20/-10/155 | 0.5 | 0 | head y 148, lead fist z 36 |
| Jab peak | -38, -6, +6 | bend 12 twist 4 / nod 18 turn 34, shrug L 18 (chin behind shoulder) | lift 22 bend 16 (small step) | lift -20 bend 10, heel 25 pivot 10 | **IK to head line, reach 0.95**, fist pronated | stays at cheek | 0.6 | 3, snap + hit-stop 2 | hand-tuned fist went to x -31 y 113: confirms IK |
| Jab recover | -32, -4, +3 | as start | lift 19 bend 18 | lift -17 bend 15, heel 15 | raise 70 bend 100 (same line back) | high guard | 0.5 | 5, settle | lead fist z 45 → back to guard |
| **Teep** start (chamber) | -20, 0, 0 | bend -8 / nod 6 turn 20 | lift 85 bend 105 point -15 (toes pulled back) | lift -4 bend 16 twist 15 (standing) | raise 55 bend 120 | high guard | 0 (ground: rear) | 5, linear | knee y 81, foot y 48 |
| Teep peak | -8, 0, +8 (hip thrust) | bend -20 (lean back) / nod 14 | lift 88 bend 4 point -25, **IK ball of foot to body line, reach 0.95** | lift -6 bend 12, pivot 15 | swings down/back: raise -15 spread 28 (balance) | high guard (rear hand raised) | 0 | 4, snap + hit-stop 2 | foot y 80 z 83 (belly line), lead hand at hip |
| Teep recover | -16, 0, +4 | bend -8 / nod 8 | lift 62 bend 95 (re-chamber, then down) | lift -4 bend 16 | raise 50 bend 120 | high guard | 0 → 0.4 | 7, settle | foot y 36 |
| **Double-leg** start (level change) | -20, -34, 0 | bend 32 twist 6 / nod -20 (head up, eyes forward) | lift 72 bend 100 | lift -8 bend 92, heel 30 (on the ball) | raise 45 bend 85, elbows in, open | same | 0.6 | 6, drop | head y 148 → 113 |
| Double-leg peak (penetration step) | -6, -62, +40 | bend 42 (straight back, hips under) / nod -30 | lift 92 bend 128, **contact: kneeL** (knee on the mat) | lift -28 bend 40 point 30 (drives off the toes) | raise 62 spread 22 bend 80, grip behind the knees | same | 0.7 | 6, snap | knee y 65: needs the new knee contact |
| Double-leg recover (drive through) | 0, -30, +62 | bend 34 / nod -22 | lift 55 bend 72 (step up) | lift -22 bend 58, heel 20 | raise 42 bend 115, pull the legs in | same | 0.8 | 8, settle | head z 81 (drives forward) |

How it works (the `how` notes):
- **Jab:** a straight punch with the lead hand. The lead hip and shoulder turn in a little, the fist rotates palm down
  at the end, the elbow stays in on the way out, the chin hides behind the lead shoulder, the rear fist never leaves
  the cheek. Fast out, slower back along the same line.
- **Teep:** a push kick with the lead leg. Chamber the knee high, then drive the hips forward and push the ball of
  the foot into the belly; lean back so the head stays out of range, the lead arm swings down for balance, the rear
  hand stays high. Re-chamber before the foot comes down.
- **Double-leg:** drop the level by bending the knees (not the waist), keep the head up and the back straight, step
  deep between the opponent's feet with the lead knee to the mat, wrap behind both knees, drive forward off the rear
  toes with the head on the opponent's ribs, and turn the corner to finish.

## 5. Owner decisions (decided 2026-11-27: the recommended answers, DECISIONS.md log)

- **Q1 Playback:** baked, cached drawings per move (recommended; matches §9.3, cheap on a 4 GB phone) vs live
  tweening (smoother, re-renders every frame). Needs a timeline track type for characters either way (Stage 2).
- **Q2 Gear slots:** gloves become wearable accessories (and the held `boxing-gloves` prop is migrated), plus new
  kinds (wraps, mouthguard, head guard, mongkol, prajioud, ankle wraps, gi belt). This bumps
  `CHARACTER_SCHEMA_VERSION` with a migration step. `MAX_ACCESSORIES` 6 fits a full Muay Thai kit (5).
- **Q3 Referee:** a full actor (uses one of the 5 actor slots) or a cheap set card. Recommended: a card by default,
  an actor when the camera is close.

## 6. Status

| Stage | State |
|---|---|
| 1 Plan, structure, 3 sample poses | done (2026-11-27); decisions Q1–Q3 taken; BUG-279 (stances) and BUG-280 (boxing trunks) fixed |
| 2 Pose library + mirror | code done (2026-11-27), not yet tested: 52 moves in `src/character/combat/` (boxing 18, Muay Thai 14, MMA / wrestling / BJJ 15, reactions + pads 5), each start / peak / recover with weight, frames, ease, hit-stop and a how-it-works note; `mirrorMove` via `stanced(move, 'southpaw')`; strike IK, weight lean, knee contact (`solve.ts`); baked frames + LRU cache (`bake.ts`); the 51 peaks are in the Pose tab (`martial`) |
| 3 Outfits + effects | effects done (`src/scene/fx/impact.ts`: flash, speed lines, smear, shockwave, sweat, shake, hit-stop; subtle / normal / dramatic; toggles), not wired into the scene renderer yet. **Gear not started** (Q2: schema bump + migration, next) |
| 4 Multi-character exchanges | code done, not yet tested: 22 exchanges (`src/scene/combat/exchanges.ts`), `placeExchange` (gap, sideways offset and strike height from the bodies), scene edit `fight` + Scene Actors "Fight" section; combos + presets (sparring, pad work, Muay Thai, full fight, KO) baked to aligned frames (`choreo.ts`), `parseCombo` for saved combos |
| 5 Arenas, audience, camera | code done, not yet tested: boxing ring, Muay Thai stadium, MMA cage (`sets/environments/fightArenas.ts`, shared `sets/arena.ts`), moods spotlight / dark / gym / day as variants, three-tier crowd (≤ 72 cards, cheer / clap shapes, dimmed by tier), referee card, `crowdArea` keeps extras on the stands; templates boxing-match, muay-thai-bout, cage-fight; `scene/combat/camera.ts` impact close-up + KO zoom |

## 7. Usage

```ts
import { moveById } from '@/character/combat/registry';
import { stanced } from '@/character/combat/mirror';
import { bakeCached } from '@/character/combat/bake';
const jab = moveById('cs-jab')!;
const { frames, hit } = bakeCached(character.body, jab, 'southpaw'); // 24 fps poses, impact at frames[hit]

import { placeExchange } from '@/scene/combat/fight';
const { scene: next, error } = placeExchange(scene, 'a1', 'a2', 'kick-check', { key: 'peak' });
// or from the UI: editStudioScene({ kind: 'fight', a, b, exchange: 'jab-slip', stanceA: 'orthodox' })

import { COMBO_PRESETS, bakeCombo } from '@/scene/combat/choreo';
const fight = bakeCombo(bodyA, bodyB, COMBO_PRESETS.get('ko-sequence')); // fight.a / fight.b frames, steps[].hit

import { impactFx, shakeOffset, FX_LEVELS } from '@/scene/fx/impact';
const svg = impactFx({ k, at: [x, y], angle, frameH: 720, intensity: 'dramatic' });
```

## 8. Finished 2026-11-27 (second pass, not yet tested)

- Wearable gear (schema v9, migration of held gloves): `render/combatGear.ts` (gloves, wraps, prajioud, ankle wraps,
  gi belt), head guard and mongkol in `accessoriesHead.ts`, mouthguard in `accessoriesFace.ts`; garments rashguard,
  gi jacket, fight shorts, spats, gi pants; outfits `data/outfitsCombat.ts` (group "Combat sports", BJJ belts).
- Effects on screen: `scene.fight` (optional) stores the impact and the limb trail in the attacker's frame;
  `scene/render/fightFx.ts` draws them at the impact moment; Scene Actors "Fight effects" (strength + switches).
- Timeline playback: `scene/combat/clip.ts` (pure: per-frame scenes, effects, shake) → `scene/board.ts`
  `buildFightClipObject` (place once, fighters per frame, border on top) → `animation/clips.ts` (`applyTimelineAt`,
  used by playback and video / GIF export). At most 72 drawings (longer combos drop to a lower frame rate). Saved as a poster + recipe
  (BUG-283): `fightClip.recipe` = { scene, a, b, combo, options }; `lib/serialization.ts` writes the place, the first drawing and
  the over layer, the other drawings as empty hidden slots; after a load `restoreFightClipFrames` draws them again (the drawings of
  the last 2 recipes are kept, so undo / redo / page switches move them back without drawing). Play on page closes the studio,
  opens the timeline and plays the clip.
- Saved combos: `comboStorage`, slice `createFightSlice`, Scene Actors "Fight combos" (presets + yours, steps,
  save, delete with confirm, Play on page).

## 9. Known limits

- Fixed 2026-11-27 (third pass, not yet tested): clip depth (set pieces nearer than the fighters and the weather
  draw over them: `renderScene(…, 'set' | 'over', near)`), the hit-stop switch (with shake, now scene fight
  effects; clips bake without the freeze when off), combo stances, the lead hook to the body (`cs-body-hook`,
  exchange `body-hook-hit`), the camera helpers (Close-up on impact buttons; knockouts end on a slow zoom drawn
  as whole frames, the over layer hidden for them), the held boxing gloves no longer offered (worn gloves).
- Crowds are not SVG `<use>` instances: the scene draws one path per shape (screentone and export work by index).
  The cost is paid once: the place is cached in the studio (LRU) and drawn once per clip, so instancing would not
  change playback.
- The old single-frame `overhand` and `body-hook` poses stay (saved characters use their ids); the moves
  `cs-overhand` and `cs-body-hook` are the keyed versions.
- Tests (2026-11-27, all passing): `character/__tests__/combatMoves.test.ts` (data, limits, exact mirror, eyes
  forward, strike accuracy per build, knee on the mat, timing, cache), `combatGear.test.ts` (v8 → v9, gloves,
  every gear item drawn, kits and belts), `scene/__tests__/fight.test.ts` (exchanges on similar builds: fists 6 cm,
  knees / kicks 9 cm, elbows 12 cm; slips move the head; effects only at a held impact; combos; clips; layer
  split), `animation/__tests__/clips.test.ts`, `store/slices/__tests__/createFightSlice.test.ts`, E2E
  `e2e/fight.spec.ts` (exchange + effects + undo, clip on the timeline, saved combo after reload).
- Fixed by the tests: takedown exchanges could not be placed (no strike: now spaced by the grip); elbows and knees
  aimed at impossible points (solo aim now stays on the limb's reach, knees aim no higher than 40°, new targets
  `chin` for elbows and uppercuts and `belly` for knees); a hit was aimed at the reaction's peak (now at the
  defender before reacting, the reaction starts on the impact frame); head kicks lean the body (standing hip
  opens) when the leg alone cannot reach; the solver retries from other starts when the written angles miss.
- Performance (2026-11-27, vitest timing on this machine): arenas render ~700 shapes in 3–4 ms (the old stadium
  ~2400 in 43 ms); placing an exchange 4 ms (a head kick 48 ms, the lean search); a 64-frame KO clip 18 ms to
  bake + ~570 ms to draw, once per "Play on page"; the clip check on every timeline frame ~3 µs for 1000 objects;
  the combat code stays out of the entry chunk (lazy studio chunks).
  timing (frames, over layer, KO zoom).
