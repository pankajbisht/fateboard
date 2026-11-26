---
name: fate-character
description: Fix or improve how a Character Studio character looks (manga body, garments, neck, shoulders, sleeves, bust, hips, crotch, hems, hands, hair) in the fateboard repo. Use when the owner sends a screenshot with marked problems ("something wrong here", circled parts), asks to redraw or restyle a body part or garment, adds a cast character, or wants several design variants compared. Reproduces the problem with rendered contact sheets, finds the root cause in the generators, fixes it, and checks the fix across garments, both genders and three angles.
---

# Character look work (src/character)

The character is **not** made of SVG files. Every part is generated per frame from the posed 3D skeleton
(docs/CHARACTER_STUDIO.md §3): lofts of rings, bent limbs, hulls, ink ribbons. A static path would break on the next
pose or camera angle, so a "redraw" is always a change to a generator. Bone lengths, joint offsets (pivots), part
keys and the pose system stay as they are unless the owner asks.

## Owner preferences (standing)

- **Do not run the test suite** during look iterations: the owner checks the pictures and asks for tests when ready.
  Type-check, ESLint and Prettier on the touched files are fine (they are fast and catch breakage).
- Show results as rendered images; say which images and where they are (full absolute path).
- When asked for options, give 3 variants (`render/mangaVariants.ts` holds the switch) and a recommendation.

## 1. Reproduce before touching code

Match the owner's screenshot: same character (or outfit), same angle (3/4 views are usually 15–25° or 335°), same pose.

```
node scripts/character/render-sheet.mjs angles   --out <dir>/a.png --char sakura,haruto --yaw 0,25,335
node scripts/character/render-sheet.mjs outfits  --out <dir>/o.png --char haruto --outfits tshirt/bike-shorts,kurta/pants
node scripts/character/render-sheet.mjs wardrobe --out <dir>/w.png --char sakura --slot top --kinds tshirt,tank,turtleneck
node scripts/character/render-sheet.mjs sweep    --out <dir>/s.png --char sakura --spread 0,30,60,90 --yaw 0,330
node scripts/character/render-sheet.mjs poses    --out <dir>/p.png --char sakura --poses sit-chair,squat-low,star-jump --top tshirt --bottom skirt
node scripts/character/render-sheet.mjs parts    --char sakura --yaw 25 --top tank --match 'shoulder|torso|contour'
```

Write sheets to the session scratchpad, never into the repo. Add `--clip x,y,w,h` to zoom into one spot (a seam
of a few pixels only shows at full resolution). Garment kinds: `data/garments.ts`, `data/garmentsMore.ts`; cast ids:
`data/recipes.ts`, `data/recipesReference.ts`.

## 2. Measure, then find the generator

Use `parts` mode to get keys, depths (draw order: higher = nearer) and bboxes before guessing. Where things live:

| Look | File |
|---|---|
| Torso, shoulders, bust, hips loft, crotch, body contour | `render/mangaTorso.ts` |
| Arms and legs (one bent shape each, profiles, knee/elbow hem) | `render/bentLimb.ts`, profiles in `render/mangaVariants.ts` |
| Sleeve head over the shoulder, bare shoulder of a sleeveless top | `render/mangaSleeveCap.ts` (via `mangaGarments.ts`) |
| Partly covered limb (shorts, short sleeve) tubes and hems | `render/clothDetail.ts` `addTube` / `addHem` |
| Skirt, coat, kurta (hanging cloth), waistband, folds | `render/hangLoft.ts`, `render/mangaSkirt.ts` |
| Collars, necklines, hood | `render/collars.ts` |
| Neck, jaw shadow | `render/body.ts`, `render/neckShadow.ts`; neck lines in `render/joints.ts` |
| Knee / chest / joint landmark lines | `render/joints.ts` |
| Hands | `render/handManga.ts` |
| Loft outline, bottom cap, side contours | `render/loft.ts` |

## 3. Root causes seen before (check these first)

- **Flat end at a joint**: a tube that starts flat at the joint lets the limb's round end show (skin bump above a
  sleeve or shorts). Give it a round head round the joint (`addCapSleeve`, `addTube(..., head = true)`).
- **Joint below the shape it joins**: the torso's shoulder ring sits above the arm joint; anything covering the
  shoulder must reach up over that ring (`mangaShoulderRing`).
- **Width mismatch where two shapes meet**: a ring or loft wider than the limb under it leaves a step, a corner or a
  line hanging past the limb in 3/4 views (hips vs thighs, coat vs skirt). Make the join widths equal (use the same
  helper, e.g. `mangaThighTop`), never "close enough" constants.
- **A cover narrower than what it covers**: an outer garment must use the same ring structure and be ≥ the garment
  under it at every height (`hangLoft.ts` reads the skirt drawn earlier and the trousers' looseness).
- **Fixed 2D curves between front points**: they end inside the body at 3/4. Use the front-facing arc of a 3D ring
  (`addRingHem`, the crew neckline) or sample points on the surface and keep only those facing the camera.
- **Depth (draw order)**: a part shows through when its depth is higher than the cloth over it (a shin through a long
  skirt). Compare depths with `parts` mode; base a cover's depth on everything it must cover.
- **Ink in the wrong colour role**: a contour drawn with the top's ink over the bottom, a shin with the shorts' ink.
- **Hairline seams**: two fills meeting exactly on a line leave a sliver at a large zoom: overlap by a hair.
- **An ellipse around round limbs**: an ellipse narrows faster on screen than a circle as the body turns, so the limb
  inside pokes out in 3/4 views. Put the limbs' own circles into the ring at the join (`jointRing` in the hips).
- **Looseness applied at the root**: loose cloth widens toward the hem; applied at the hip or shoulder joint it puffs
  the limb's round end out over the torso (wide trousers ballooning at the seat).
- **A hem where the cloth does not end**: a hem on a colour edge only when the garment really stops there
  (`hemAtBend`); a capri's cloth carries on as a tube with a round head over the knee.
- **Tone breaks**: neighbouring skin parts (neck, face, neckline opening) must share one tone; a deep shadow or an
  extra shading band on one of them reads as a separate piece.
- **Trim colours**: details (plackets, borders) in a deeper or lighter shade of the cloth with its ink, never a pale
  stripe, which reads as tape on any colour.
- **Cloth rings fixed to the body's plane**: hanging cloth (skirt, coat) must lie across the way it falls; rings flat
  in the hips' plane were seen edge-on when seated (a skirt became a sheet with a long straight hem). Blend the fall
  between the legs' direction and gravity, and never let a ring climb above the one before it (a raised knee looped
  the side). Check every look change with `poses` (sit-chair, sit-floor, squat-low, kneel, lunge, star-jump, kicks).
- **Tiny shapes smoothed and outlined**: three points through a smoothed outlined shell become a sausage (the old
  lapels); small flat pieces are sharp polygons with a thin edge.
- **Ink through raw points, fill smoothed**: the fill's curve passes edge midpoints, ink through the vertices
  overshoots at sharp corners (flags, hairpins). Loft contours are Chaikin-smoothed, sharp side/hem corners are cut and
  spikes removed in `loftChains`; keep new ink on the same smoothed path as its fill.
- **Fallback shapes miss features**: `addCapsuleLimb` in `render/limbFront.ts` (a bone pointing at the viewer) needs the same details as the
  normal bent limb (hem on the colour edge); check sit-chair, kneel and front-kick after limb changes.
- **Average depth is not visibility**: a thigh pointing at the viewer has its knee nearest, but the bones' average
  depths drew the shin over it (a ball, not a knee). The front-on knee draws the thigh's end over the shin with its
  lower edge inked, a kneecap curve when bare, tension folds on cloth, and a bare knee disc in front of a short tube
  (`addBareKnee`). A cover's depth is its limb's, not its own spot's: check what it hides when the limb turns.
- **Sleeveless and strapless**: a bare shoulder is a short skin cap (to about the armpit) with a curved armhole inked
  in the cloth's colour; a strapless top (`strapless` in `TopDef`) bares the neck, shoulders and upper chest as a skin
  loft with its edge inked, and its cap has no seam. Check tank, vest, tube-top, sleeveless-hoodie.
- **Marks inside round shapes**: two or three lines inside a round knee read as a face; mark anatomy with soft shade
  (`addKneeAnatomy`), and trigger special views (a bare knee disc) only when the bone truly points at the viewer
  (on screen under 0.6 of its length), never on a knee a little forward in a standing pose.
- **Hull edges inked straight**: the fill is smoothed, the ink is not; smooth the chain (`chaikin` in
  `mangaSleeveCap.ts`).

## 4. Fix, then check wider than the complaint

1. Fix the root cause in the generator; a comment says why (what went wrong before), as the code around it does.
2. Re-render the owner's case and zoom with `--clip`.
3. Regression sweep: the same fix on both cast references (sakura, haruto), 0°/25°/335°, and the garment family it
   touches (all tops for a shoulder/neck change, all bottoms for hips/legs, coats over skirts and trousers for hangs).
   A fix that makes another garment worse is not done: say so and iterate.
4. `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint <files>`, `npx prettier --write <files>`.
5. Report: what each marked spot was (cause → fix), what is still not right, tests likely to need new expected values
   (do not run them), files changed, image paths.

Keep files under their budget (`src/__tests__/fileBudget.test.ts`): put a new piece in its own small module
(`neckShadow.ts`, `mangaSkirt.ts`) rather than growing a big one.

For a second opinion on a sheet, the `fate-character-inspector` agent renders and reviews pictures and reports
defects with their location; give it the character, outfits and angles.
