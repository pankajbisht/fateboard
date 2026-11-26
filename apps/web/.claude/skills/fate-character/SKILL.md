---
name: fate-character
description: Fix or improve how a Character Studio character looks (manga body, garments, neck, shoulders, sleeves, bust, hips, crotch, knees, elbows, hems, hands, hair, collars, trims, accessories) in the fateboard repo. Use when the owner sends a screenshot with marked problems ("something wrong here", circled parts), asks to redraw or restyle a body part or garment, adds a garment kind, an accessory or a cast character, or wants several design variants compared. Reproduces the problem with rendered contact sheets, finds the root cause in the generators (checking the catalogue of causes already fixed), fixes it, and checks the fix across garments, both genders, three angles and the hard poses.
---

# Character look work (src/character)

The character is **not** made of SVG files. Every part is generated per frame from the posed 3D skeleton
(docs/CHARACTER_STUDIO.md §3): lofts of rings, bent limbs, hulls, ink ribbons. A static path would break on the next
pose or camera angle, so a "redraw" is always a change to a generator. Bone lengths, joint offsets (pivots), part
keys and the pose system stay as they are unless the owner asks.

**Before fixing anything, read §3 (root causes already fixed).** Most new complaints are one of them on a garment or
pose that was not checked. Each time you fix a new kind of problem, add it to §3 (cause → fix → where) so it is never
fixed twice.

## Owner preferences (standing)

- **Do not run the test suite** during look iterations: the owner checks the pictures and asks for tests when ready.
  Type-check, ESLint and Prettier on the touched files are fine (they are fast and catch breakage).
- Show results as rendered images; say which images and where they are (full absolute path).
- When asked for options, give 3 variants and a recommendation. Put them behind a temporary switch in
  `render/mangaVariants.ts`; once the owner picks, collapse the winner into the plain constants (`mangaLook()` returns
  `LOOK`) and delete the losers and the switch (dead variant code was removed from `mangaSleeveCap.ts` and
  `mangaSkirt.ts` after the 2026-11 pick of variant A).
- Reply in plain language: what each marked spot was (cause → fix), what is still not right.

## 1. Reproduce before touching code

Run from `apps/web` (a stray `cd ../../..` runs commands at the monorepo root; `npx tsc` there is the wrong package).
Match the owner's screenshot: same character (or outfit), same angle (3/4 views are usually 15–25° or 335°), same pose.

```
node scripts/character/render-sheet.mjs angles   --out <dir>/a.png --char sakura,haruto --yaw 0,25,335
node scripts/character/render-sheet.mjs outfits  --out <dir>/o.png --char haruto --outfits tshirt/bike-shorts,kurta/pants
node scripts/character/render-sheet.mjs wardrobe --out <dir>/w.png --char sakura --slot top --kinds tshirt,tank,turtleneck
node scripts/character/render-sheet.mjs sweep    --out <dir>/s.png --char sakura --spread 0,30,60,90 --yaw 0,330
node scripts/character/render-sheet.mjs poses    --out <dir>/p.png --char sakura --poses sit-chair,squat-low,star-jump --top tshirt --bottom skirt
node scripts/character/render-sheet.mjs parts    --char sakura --yaw 25 --top tank --match 'shoulder|torso|contour'
```

Options: `--pose`, `--height`, `--clip x,y,w,h` (zoom: a seam of a few pixels only shows at full resolution),
`--offset t,l` in wardrobe mode, several `--char` values. Write sheets to the session scratchpad, never into the repo.
Garment kinds: `data/garments.ts`, `data/garmentsMore.ts`; cast ids: `data/recipes.ts`, `data/recipesReference.ts`.

## 2. Measure, then find the generator

Use `parts` mode to get keys, depths (draw order: higher = nearer), roles and bboxes before guessing.

| Look | File |
|---|---|
| Body assembly: which helpers run, garment flags passed down (`strapless`, `hemAtBend`, `kneeOverCloth`, trouser thigh width), fold depths | `render/body.ts` |
| Torso, shoulder ring, bust (`bustProfile`, `BREAST_OFFSET`, `addUnderBust`), hips loft, crotch (`addCrotchLine`), shirt hem, strapless chest, `mangaThighTop` | `render/mangaTorso.ts` (near its 400-line budget) |
| Arms and legs: one bent shape each, knee/elbow hem | `render/bentLimb.ts`; profiles and hand/sleeve/skirt constants in `render/mangaVariants.ts` |
| Bone pointing at the viewer: `addCapsuleLimb`, front-on knee and elbow (`kneeFront`), `limbFolds`, `addBareKnee`, `addKneeAnatomy` | `render/limbFront.ts` |
| Sleeve head over the shoulder, bare / strapless shoulder cap | `render/mangaSleeveCap.ts` `addCapSleeve` (called from `mangaGarments.ts`) |
| Manga sleeves and trouser tubes (sleeve-head keys, forearm and shin tubes) | `render/mangaGarments.ts` |
| Partly covered limb tubes and hems (shorts, short sleeve) | `render/clothDetail.ts` `addTube` / `addHem` / `addRingHem` / `inkLine` |
| Skirt, coat, kurta (hanging cloth), waistband, folds | `render/hangLoft.ts`, `render/mangaSkirt.ts` `addSkirtDetail` |
| Collars, necklines (crew opening), lapels, high collar, hood | `render/collars.ts` (`garments.ts` re-exports `addCollar`) |
| Plackets, borders, jersey stripes, badges, leg pockets | `render/trims.ts` |
| Neck, jaw shadow | `render/neckShadow.ts` `addJawShadow`; neck lines in `render/joints.ts` |
| Knee / chest / joint landmark lines | `render/joints.ts` `addJointDetail` |
| Hands | `render/handManga.ts` |
| Body accessories (bow, socks, …) / head accessories (hair clip, …) | `render/accessoriesBody.ts` / `render/accessoriesHead.ts` |
| Loft outline, bottom cap, side contours, despike, corner cutting | `render/loft.ts` `loftChains`, `addContour`; `chaikin` in `render/shapes.ts` |
| Ink ribbons (tapered strokes) | `render/ink.ts` `inkRibbon` |

## 3. Root causes already fixed (check these first)

### Joins and widths
- **Flat end at a joint**: a tube that starts flat at the joint lets the limb's round end show (skin bump above a
  sleeve or shorts). Give it a round head round the joint (`addCapSleeve`, `addTube(..., head = true)`). Kurta and
  long-sleeve cuffs and capri shins are round tubes at the elbow / knee too.
- **Joint below the shape it joins**: the torso's shoulder ring sits above the arm joint; anything covering the
  shoulder must reach up over that ring (`mangaShoulderRing`). This also closed the long-sleeve far-arm gap at 3/4.
- **Width mismatch where two shapes meet**: a ring or loft wider than the limb under it leaves a step, a corner or a
  line past the limb in 3/4 views (hips vs thighs, coat vs skirt). Use the same helper on both sides
  (`mangaThighTop`), never "close enough" constants.
- **A contour stopping above where its fill ends**: the hips contour stopped at the hip-joint ring, the hips fill
  reached down to the crotch ring and covered the far leg's contour, so at 335° the far thigh had a stretch with no
  ink and a tick where the line stopped. The hips contour now runs through the crotch ring (its sides are the
  thighs' circles, so no double line); the near leg is drawn over it (`mangaTorso.ts`, `body-contour-hips`).
- **Shorts / swim trunks / boxing shorts hips too big**: the trouser thigh top is
  `mangaThighTop * min(1.06, loose)`; looseness beyond that goes toward the hem, not the hip.
- **Looseness applied at the root**: loose cloth widens toward the hem; at the hip or shoulder joint it puffs the
  limb's round end over the torso (wide trousers ballooning at the seat). Trousers under a long top (blouse, kurta)
  widen toward the knee, not at the hip, or the top flares out over them.
- **A cover narrower than what it covers**: an outer garment uses the same ring structure and is ≥ the garment under
  it at every height (`hangLoft.ts` reads the skirt drawn earlier via the `SKIRTS` WeakMap and the trousers'
  looseness via `underAt`).
- **An ellipse around round limbs**: an ellipse narrows faster on screen than a circle as the body turns, so the limb
  inside pokes out at 3/4. Put the limbs' own circles into the ring at the join (`jointRing` in the hips).
- **Hairline seams**: two fills meeting exactly on a line leave a sliver at large zoom: overlap by a hair (the crew
  opening's top reaches `t * 0.012` over the shirt's edge).

### Neck, chest, bust
- **Neck and head look like separate pieces / neck covered by the dress**: neighbouring skin parts (neck, face,
  neckline opening) share one tone. `addJawShadow` removes the neck's own shade layers and adds one `neck-shadow`
  layer; a crew neckline is a skin opening plus a `collar-crew` ink ribbon, so the shirt colour never shows between
  neck and neckline.
- **Head looks set on the neck**: the jaw shadow (`neck-shadow`) must be the face's own shade tone (`shadeOf(skin,
  strength × 1.4)`, opacity 0.76 for soft shading, as the stacked head bands), falling to about 0.55 of the neck at the
  front; a lighter thin band under the chin read as a ring. No neck-muscle lines on the manga body (they read as
  strings). The crew opening's top lift is front-only (at the sides it stood above the shoulder as a skin tab), and
  its ink covers only the forward-facing part of the ring (sin > 0.3): round the side of the neck the ring turns back
  and at 335° the line's end curled up as a hook.
- **Sleeveless back neckline**: a tank's back is a shallow scoop from strap to strap (`scoopAt(0.6)`); along the neck
  base ring it stepped up at each strap as a notch of skin.
- **Lapels / shirt collar flaps up the neck**: a flap starts on the opening's own edge (`nw × 0.95` at `ny`) and folds
  outward (`nw × 1.45`); a top corner above the shirt's top and wider than the neck made a band round the neck, and a
  thin flap beside the V three parallel lines. A kurta placket (`trim: 'border'`) is skipped on open collars (lapel,
  v, open): it started in the bare opening.
- **Bust flat or wrong in profile**: `bustProfile(a)` (base + two gaussians at π/2 ± `BREAST_OFFSET`) shapes the chest
  rings; `addUnderBust` draws `under-bust0/1` only while the chest faces the camera (facing ≥ 0.45; at 75° they stuck
  out). The old `chest±1` arcs in `joints.ts` are skipped for the manga bust.
- **Front-only lines seen from the side** (collars, under-bust, plackets): gate them on the chest's facing
  (`project(view, R·[0,0,1])[2]`), as `addCollar` does (< 0.4 → none).
- **Fixed 2D curves between front points**: they end inside the body at 3/4. Use the front-facing arc of a 3D ring
  (`addRingHem`, the crew neckline) or sample surface points and keep those facing the camera.

### Shoulders and sleeves
- **Sleeveless and strapless**: the upper torso is bare skin (`bare-chest` loft in `mangaTorso.ts`, mode from
  `body.ts`: `strapless` to above the bust with a `strapless-edge`; a sleeveless top to the armpits). A sleeveless
  top's cloth is one panel over it (`mangaTank.ts` `tank-panel`): straps, armholes curving in to the side seam
  (`tank-armhole-l/r`), a scoop (`tank-neckline`) for collar `none`, else up to the neck base. The shoulder cap
  (`addCapSleeve`, `seam: false`) only rounds the point of the shoulder into the arm (shoulder-ring points with
  cos > 0.75). Before: the torso was cloth to the neck and a convex-hull skin cap lay over each shoulder; a hull cannot
  bow inward, so the armhole was a straight cut and the shoulder a flat slab with the cloth shoulder standing above it.
  Never build a shape that must curve inward from `hull()`. Check tank, vest, tube-top, sleeveless-hoodie together.
- **Hull edges inked straight**: the fill is smoothed, the ink is not; smooth the chain (`chaikin` in
  `mangaSleeveCap.ts`).
- **Part key collisions**: a new part with an existing key replaces or confuses it (the hoodie's sleeve head collided
  with the old overlay key). Long sleeves use `${upper}-sleeve-head`, short ones `${upper}-sleeve`; grep the key first.

### Knees, elbows, folds
- **Average depth is not visibility**: a thigh pointing at the viewer has its knee nearest, but the bones' average
  depths drew the shin over it (a ball, not a knee). The front-on joint (`kneeFront` in `limbFront.ts`, knees *and*
  elbows: punch, push, aim) draws the upper bone's end over the lower with its lower edge inked, a kneecap curve when
  bare, tension folds on cloth, and a bare knee disc in front of a short tube (`addBareKnee`).
- **Trigger special views only when the bone truly points at the viewer** (on screen under ~0.6 of its length,
  `< rA * 1.6`), never on a knee a little forward in a standing pose (a stray knee disc appeared).
- **Marks inside round shapes**: two or three lines inside a round knee read as a face; mark anatomy with soft shade
  (`addKneeAnatomy`, as layers on the limb part). Kneecap lines in `joints.ts` are skipped under shorts or when the
  front knee exists.
- **Bend folds on a front-on knee** pointed off the leg as ticks (squat): skip `limbFolds` when `kneeFront`.
- **Folds hidden under a tunic** showed as stray dots: folds sit on the covering garment's depth (kurta).
- **A hem where the cloth does not end**: hem on a colour edge only where the garment really stops (`hemAtBend`);
  a capri's cloth carries on as a tube with a round head over the knee. The knee hem is drawn on the colour edge.
- **Fallback shapes miss features**: `addCapsuleLimb` needs the same details as the normal bent limb; check
  sit-chair, kneel and front-kick after limb changes.

### Hanging cloth (skirts, coats, kurta)
- **Rings fixed to the body's plane**: hanging cloth lies across the way it falls (`fall` = 0.55 along the legs +
  0.45 down); a ring never climbs above the one before it (a raised knee looped the side). Width capped at
  `hipHalf + thigh * lerp(0.6, fl * 1.25, k)`. Sides and hem are `addContour` chains meeting at midpoints.
- **Skirt notch, hem nib loops**: `loftChains` despikes, trims the bottom above the corners and cuts acute corners.
- **Ink through raw points, fill smoothed**: the fill passes edge midpoints, ink through vertices overshoots at sharp
  corners. Contours are Chaikin-smoothed; keep new ink on the same smoothed path as its fill.
- **Depth**: a part shows through when its depth is higher than the cloth over it (a shin through a long skirt).
  A cover's depth is based on everything it must cover, and on its limb's depth, not its own spot's.

### Colour, style, small pieces
- **Trim colours**: details (kurta placket with buttons, borders, jersey stripes, badges) in a deeper shade of the
  cloth (`darken`) with its ink, never a pale stripe (reads as tape).
- **Ink in the wrong colour role**: a contour drawn with the top's ink over the bottom, a shin with the shorts' ink.
- **Every style must produce the same part list** (style test): shading goes into `Part.layers` (`kind: 'shade'`) on
  an existing part, never as a separate part; and ink needs a fallback, because the flat style has no outline colour
  and `inkLine` then draws nothing: `ctx.outline(fill) ?? darken(fill, 0.4)` (the flat style lost the crew neckline).
- **Tiny shapes smoothed and outlined**: three points through a smoothed outlined shell become a sausage (old lapels);
  small flat pieces (lapels, the bow) are sharp polygons with a thin edge. The hood is a low roll behind the neck, a
  high collar rides on the neck ring.

## 4. Adding things (checklists)

**A garment kind** (e.g. `school-blouse`, `camp-shirt`):
1. The kind goes in `schema/garmentKinds.ts` (not the core kinds list in `schema/types.ts`, which fails type-check).
2. The def in `data/garmentsMore.ts` (`TopDef` flags: `strapless`, collar, trim, length, looseness).
3. Tests that count the catalogue: `__tests__/garments.test.ts` (top count),
   `components/organisms/character/__tests__/CharacterStudio.test.tsx` (option count). Raise the count only;
   keep the test's rule.
4. Render it in `wardrobe` mode next to its neighbours, at 0/25/335°, both genders, and in `poses`.

**An accessory** (e.g. `bow`, `hair-clip`, `socks`): add it to `ACCESSORY_KINDS` in `schema/types.ts`, its def and
slot in `data/wardrobe.ts`, the drawing in `render/accessoriesBody.ts` or `accessoriesHead.ts` (socks use `cover()`
on bare shins). `__tests__/outfits.test.ts` counts accessories.

**A cast character from an owner reference**: a hand-made recipe in `data/recipesReference.ts` (colours from the
reference, `accessories` passed through by `fromRecipe`), tagged `reference`. Tests: `render.test.ts` counts recipes;
`mangaLook.test.ts` excludes the `reference` tag; `cast.test.ts`, `hair.test.ts`, `garments.test.ts` use
`RECIPES.length` (never a literal 12) and the cast-kinds check covers only generated people (`slice(RECIPES.length)`).

## 5. Fix, then check wider than the complaint

1. Fix the root cause in the generator; a comment says why (what went wrong before), as the code around it does.
2. Re-render the owner's case and zoom with `--clip`.
3. Regression sweep: both cast references (sakura, haruto), 0°/25°/335°, the garment family it touches (all tops for a
   shoulder/neck change, all bottoms for hips/legs, coats/kurta over skirts and trousers for hangs), and `poses`
   with sit-chair, sit-floor, squat-low, kneel, lunge, star-jump, front-kick, punch. A fix that makes another
   garment worse is not done: say so and iterate.
4. From `apps/web`: `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint <files>`, `npx prettier --write <files>`.
5. Report: cause → fix per marked spot, what is still not right, tests likely to need new expected values (do not
   run them), files changed, image paths. Add any new cause to §3.

Keep files under 400 lines (`src/__tests__/fileBudget.test.ts`): put a new piece in its own small module (as
`neckShadow.ts`, `mangaSkirt.ts`, `limbFront.ts`, `collars.ts` were split out) rather than growing a big one.
`mangaTorso.ts` and `bentLimb.ts` are near the limit.

## 6. When the owner asks for tests / to ship

Run from `apps/web`, summary output only:

```
npm run test:run 2>&1 | grep -E "FAIL|×|Test Files|Tests "
npm run check 2>&1 | grep -E "error|✖|problems|warning" | tail -5      # lint ratchet: --max-warnings 246, never raise it
npm run build 2>&1 | grep -E "error|built in" | tail -3
npm run e2e -- --reporter=line --workers=2                              # machine is often loaded: 2 workers
```

- Look tests failing after a redraw are of two kinds: **real regressions** (fix the code: bust profile, missing part
  in one style, a line at the wrong angle) and **tests pinning the old look** (part keys, catalogue counts): update
  the expected values, keep the rule. Never `.skip`, lower a limit or delete an assertion.
- Tests that pin look details: `mangaLook`, `mangaStrokes`, `genderBody` (`under-bust` keys), `clothDetail`
  (`upperArmL-sleeve-sil*`, `legL-contour-hem`), `render`, `outfits`, `garments`, `cast`, `hair`, the style test.
- E2E failures outside the character (e.g. `doc-layers.spec.ts` "layers survive a reload" is flaky): rerun the spec
  alone and with `--repeat-each=3`; if needed compare on a clean `main` worktree (link `node_modules` and the `.env`
  files, or the web server fails on `VITE_SITE_URL`). Many unrelated timeouts → check `uptime`.
- Commit and push with the `fate-ship` skill (branch `feat/character-…`, scope `character`), through the hooks,
  never `--no-verify`. Update `docs/CHARACTER_STUDIO.md` (status row) and `docs/DECISIONS.md` (dated row) for a
  look decision.

For a second opinion on a sheet, the `fate-character-inspector` agent renders and reviews pictures and reports
defects with their location; give it the character, outfits and angles.
