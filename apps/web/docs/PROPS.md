# Scene Objects (props library)

Manga / anime scenery that users drop on the page and then move, scale, rotate, recolour, layer and animate like
any object. Owner brief 2026-11-26; plan approved the same day ("go"), built in six phases, one per session.

## 1. Decisions (owner-approved 2026-11-26)

- **Pure domain `src/props/`** (no React, Fabric or store; `board.ts` is the Fabric edge), like `src/character` and
  `src/scene`. Guarded by `src/__tests__/domainBoundaries.test.ts` (also: no `Math.random`, props are seeded).
- **A prop is a parametric SVG generator**, not a stored file: `draw(ink)` returns shapes painted from **colour
  slots** (shades derived with `darken` / `lighten`) and one **ink outline** (colour + width). Recolour, outline,
  variants and time-of-day grading are a rebuild from `propData`, never path-by-path edits.
- **On the page:** a Fabric `Group` (origin centre) built with `fabric.loadSVGFromString`, carrying `propData` in
  `CUSTOM_PROPS`, so it saves with the page and survives undo / reload.
- **New public store keys:** `addProp`, `bindProps` (Phase 1); later phases add their actions here first.
- **Animation:** `windSway` / `drift` become animation presets (Phase 5), approved.
- **Time of day** applies to the current page and saves with it (Phase 4).
- **Reuse, not rebuild:** screentones (`lib/comic/screentone`), Comic effect lines (focus / speed / burst), page
  layers, the keyframe engine and the import pipeline.

## 2. Contracts

| Piece | File | Contract |
|---|---|---|
| `PropDef` | `props/types.ts` | `id` (kebab-case, saved), `label`, `category`, `tags`, `width` × `height` (px at 100 %), `colors` (slot → `#rrggbb`), `variants?`, `draw(k)` |
| `PropData` | `props/types.ts` | `{ v: 1, propId, variant, colors (overrides only), outline, outlineWidth }`; read back with `parsePropData` (unknown prop → null; bad slots / values dropped; width clamped 0–20) |
| Pen | `props/render/ink.ts` | `path / circle / ellipse / rect` (outlined fills), `line` (thin detail ink), `limb` / `limbs` (outlined round strokes, all edges first), `stroke` (coloured stroke, no ink), `rand` (seeded by `id:variant`) |
| Shapes | `props/render/shapes.ts` | `blob`, `mound` (scalloped crowns / clouds), `star`, `blade`, `streak`, `poly` |
| SVG | `props/render/propSvg.ts` | `propSvg(def, data)`: only `path circle ellipse rect polygon polyline line g` (what Fabric's loader reads); same input, same string |
| Catalogue | `props/catalog/index.ts` | `PROP_CATEGORIES` (panel order), `PROPS`, `getProp`, `searchProps(query, category?)` (every word must match label, id or tags) |
| Board | `props/board.ts` | `buildPropObject({ propId, … })`, `isPropGroup`, `readPropData` |
| Drag | `props/dragType.ts` | `PROP_DRAG_TYPE` = `application/x-fate-prop`, payload = prop id |

Each category holds 15–20 props (`catalog.contract.test.ts`), and every prop must load in Fabric. Props carry no
lettering (Fabric's SVG loader keeps no `<text>`): signs get blank bars, the user adds words with the Text tool.
Vehicles share `body()` (side view facing right: roof outline + wheel arches), `wheel()` and fixed glass / tyre /
lamp paints in `catalog/vehicles.ts`; compact point lists use `pts('x y x y …')`.

## 3. Phases and status

| # | Scope | Status |
|---|---|---|
| 1 | Domain, board edge, slice (`addProp`, `bindProps`), left-rail panel (category, search, click / drag to add), Nature (18) + Sky (17) | **done 2026-11-26** |
| 2a | Owner request 2026-11-26: Vehicles (15: car, bike = motorbike, cycle = bicycle, …), Furniture (16: table, chair, …), Kitchen (15: cup, plate, …), Street (15: street lamp, …); category row becomes wrapped `Chip`s (6 categories) | **done 2026-11-26** |
| 2b | Owner request 2026-11-26 ("different houses like village, city, classroom; things mostly used in manga / anime"): Buildings (16: village, cottage, modern and Japanese houses, apartment, office, skyscraper, skyline, shop, konbini, school, hospital, shrine, pagoda, castle, barn), Classroom (16), Effects (18 manga symbols 漫符: sweat drop, anger vein, sparkles, blush, heart, ! ?, notes, Zzz, speech / thought / shout bubbles, impact, steam puff, tears, gloom, surprise lines, dizzy spiral), Japan (17: torii, lanterns, wind chime, koinobori, daruma, maneki-neko, onigiri, dango, kotatsu, futon, shoji, uchiwa, wagasa, bamboo, fireworks, sakura petals) | **done 2026-11-26** |
| 2c | Owner: "pick one by one and finish all". Animals (15), Food (15), Sports (15), Fantasy (15), Tech (15), Seasons (15), Travel (15), Backdrops (15: posterised skies, interiors, street, beach, manga flower / bubble / sparkle / focus / speed plates, 400 × 260), Effects +2 (heart burst, !?). Contract test now also checks every prop's Fabric bounds stay in its declared box | **done 2026-11-26** |
| 2d | Panel: Favorites (star on every card) and Recent (last 12 added) chips, saved per browser (`uiPrefsStorage` section `props`) | **done 2026-11-26** |
| 3 | Styling: per-prop screentone (dots / lines / gradient), outline width + colour, colour slots, variants, Randomize | **done 2026-11-26** |
| 4 | Scene presets (Classroom, Rooftop, Forest, Street) on foreground / mid / background layers; Day / Sunset / Night per page; auto shadows; snap to ground line | **done 2026-11-26** |
| 5 | Ambient animation presets `windSway` (trees, grass) and `drift` (clouds) in the animation engine | **done 2026-11-26** |
| 6 | Custom import (SVG / PNG, PNG capped at import) to a user library in `@/lib/storage`; prop packs as JSON (validated) | **done 2026-11-26** |
| 7 | Owner 2026-11-26 ("prop library should be on scene also"): props stand in the Scene Studio's 3D world (§9). Then the clipboard and Library panel: docs/LIBRARY.md | **done 2026-11-26** (phase L1) |

## 4. Phase 1 notes

- **Placement:** click = view centre, drag = the drop point (`canvas.on('drop')` gives `scenePoint`); both scaled
  by `creationScaleOf` like other new objects. One `object:added` = one undo step.
- **Drop binding:** the slice subscribes to the store and binds each new canvas itself (`bindProps`), disposing the
  old one, instead of growing `createCanvasSlice` (at its size ceiling). `dragover` is cancelled only for
  `PROP_DRAG_TYPE`, so file and layer drags keep their behaviour; drops are ignored while a page loads.
- **Bundle:** the catalogue (≈19 kB, 7 kB gzip) is one lazy chunk shared by the panel and `props/board`; the store
  holds only the slice.
- **Look check:** render every prop to a contact sheet (a temporary vitest writing `propSvg` output to HTML, then a
  Playwright screenshot) before calling a drawing done.

## 5. Phase 3 notes (styling)

- `PropData.tone` = `{ kind: none | dots | lines | gradient, density 0.1–0.9 }` (read as `none` when missing, so
  older pages still load). The board turns fills by luminance: ≥ 0.8 paper, ≤ 0.22 ink, otherwise a tone level
  `(1 − lum) × (0.4 + density)`, rounded to tenths and cached per level: a `lib/comic/screentone` tile pattern (dots
  or lines, 45°) or a top-to-bottom grey `Gradient`. Coloured strokes become greys; the ink outline stays. Without a
  2D canvas (jsdom) a tone falls back to a flat grey of the same level.
- `updateSelectedProp(patch)` rebuilds the drawing and swaps it into the same group (`swapPropDrawing`, like the
  Character Studio's update): id, transform, animation track, layer and locks stay; `pauseHistory` →
  `object:modified` → `resumeHistory` → `saveState(true)` = one undo step.
- Variants: named ones change the drawing (`tree-round` Round / Tall / Twin, `tree-pine` Full / Slim, `chair` Front /
  Side); blob-drawn props (clouds, bush, rocks, grass, sakura, stars) get "Shape 1–3", since the seed includes the
  variant. `randomizeSelectedProp` picks another variant, or another main colour for props without variants.
- Inspector (`organisms/props/PropInspector.tsx`, top of the panel while a prop is selected): variant, a swatch per
  colour slot + outline colour (`CustomColorButton`), outline width and tone density sliders (rebuild once on
  release), screentone kind, Randomize.

## 6. Phase 4 notes (scenes, time of day, shadows, ground)

- `PropData.light` (`day | sunset | night`, default day) grades fills and coloured strokes toward a tint (sunset
  warm orange 24 %, night deep blue 52 % and dimmer) before any screentone; the ink outline stays. The page's time
  of day is what its props use (the first prop says), so there is no extra saved page field: `setPropTimeOfDay`
  rebuilds every prop on the page in one undo step, and a new prop takes the page's light.
- `PropData.shadow`: a soft ellipse (black, 20 %) along the bottom, drawn first. On by default for categories that
  stand on the ground (`shadowByDefault`), off for sky, effects, backdrops and props flagged `noShadow` (flat ground
  like rivers and roads, wall-mounted, flying). Older saved props read `false`, so they do not change.
- Scene presets: `src/props/scenes.ts` (pure data: plane, prop, page fractions, `cover` for a backdrop).
  `applyPropScene` (`store/slices/props/propActions.ts`) adds three page layers (`addPageLayer` +
  `updatePageLayer` names Background / Midground / Foreground, `setActiveLayer` before each plane's props), places
  props by page fractions, and gives each an outline that lands at the same on-page width as a prop added by hand
  (`3 × creation scale / prop scale`), all in one undo step.
- Ground line: `propGroundSnap` + `propGroundLine` (0.5–1 of the page height from the top), saved per browser in
  `uiPrefsStorage` section `props`. On `object:moving`, a prop whose base is within 14 screen px snaps onto the line
  (bounding box, so a turned prop lands on its lowest point). No guide line is drawn.

## 7. Phase 5 notes (ambient animation)

- New emphasis presets `windSway` (2.4 s) and `drift` (6 s), repeatable, in the Animation panel like any preset.
  Keyframes come from `src/animation/ambientPresets.ts`: wind sway animates `skewX` ±5° and moves `left` back by the
  base's shift (`scaleX · height below the origin · tan(skew)`), so the base stays planted; drift moves `left` ±48 px.
  Both end where they start, so repeats loop seamlessly.
- To make room, the preset catalogue (`PresetId`, `PRESETS`) moved from `engine.ts` to `src/animation/presets.ts`
  (re-exported by the engine, no caller changed); the engine's size ceiling went from 725 to 648.
- `props/ambient.ts` `ambientFor(def)`: plants (trees, bushes, flowers, grass, bamboo, tanabata, carp streamers)
  sway, clouds drift. The inspector's "Add wind sway" / "Add drift" calls `applyPreset` from 0, repeated to fill
  the current animation length.

## 8. Phase 6 notes (my own props, packs)

- `src/props/userProps.ts` (pure): `UserProp` `{ id: user-…, label, kind: svg | png, data, width, height }`;
  `sanitizeSvg` parses the file and keeps drawing elements only (svg, g, defs, shapes, gradients, clipPath, use,
  text), drops every `on*` attribute, any link that is not `#local`, and `javascript:` / `data:text` / outside
  `url(…)` values; it runs on import **and** every time an entry is read (library, pack). Caps: SVG 500 000
  characters, PNG data URL 3 MB, sides 1–4096. Ids use `crypto.getRandomValues` (the domain never uses Math.random).
- Prop packs: JSON `{ format: "fateboard-prop-pack", version: 1, props }` (`makePropPack` / `readPropPack`); a newer
  version or another file is refused with a readable message, bad entries are skipped and counted.
- Reading a file: `src/feature/import/propFile.ts` (SVG: sanitise + size from width / height / viewBox; PNG: decoded
  with `createImageBitmap` and redrawn so the longer side is at most 1024 px, runtime-performance P1).
- Storage: `propStorage` (`@/lib/storage`, key `propLibrary` in the project database, shared `createLibrary`:
  read-modify-write, unreadable entries kept).
- Store: `slices/props/propLibrary.ts` (`propUserLibrary`, `propUserLibraryStatus`, `loadPropLibrary`,
  `importPropFile`, `removeUserProp`, `propPackJson`, `importPropPack`). `addProp('user-…')` places a user prop
  (SVG = group, PNG = picture, named after it) by click or drop, and adds it to Recent (the Recent chip lists
  catalogue props only).
- Panel: "My props" chip → `MyProps` (Import SVG or PNG, cards with Add / Delete (confirm, danger), Import pack,
  Export pack = `my-props.fateprops.json`). User props are not restyled (no colour slots).

## 9. Props in the Scene Studio (phase 7, docs/LIBRARY.md L1)

- **Data:** Scene schema v2 adds `scene.props: SceneProp[]` = `{ id, propId, variant, x, z, height }` (cm, base on
  the ground at x, z). v1 scenes read as none. At most `MAX_SCENE_PROPS` = 40; height 5–6000 cm; ids unique across
  actors and props (one selection). An unknown `propId` is kept and not drawn.
- **Which props:** the categories that stand on the ground (`sceneReady`, `props/sceneSize.ts`). Sky, Effects and
  Backdrops stay on the page, because the place has its own sky and manga symbols go over the picture. A new prop
  starts at a real height (`sceneHeightOf`: category defaults plus per-prop sizes, e.g. round tree 520 cm, bench
  85 cm).
- **Drawing:** `props/render/propPaths.ts` reads a prop's SVG body (only what the pen and the catalogue write:
  path, circle, ellipse, rect, polygon, polyline, line and g, with translate / rotate / uniform scale / matrix)
  into path records. The contract test keeps `skipped` at 0 for every prop and variant.
  `scene/render/renderProps.ts` stands each prop as a card facing the camera. Its base sits on its projected
  ground point, it stands upright along the projected vertical (like the actors), and one similarity carries its
  paths (exact arcs). It sorts far to near with the actors in the `mid` layer. Paint takes the place's colour
  grade and haze. The ink outline is chosen per placement (`lineWidth(s) × 1.5 / k`), so near and far props read
  like the set's lines. Ground props get a contact shadow. Drawings are cached by prop, variant and outline, and
  placements by prop and view, so dragging one re-places one.
- **Edits:** `addProp`, `removeProp`, `moveProp`, `updateProp` (variant, height) in `SceneEdit`, so they share the
  scene's undo, draft, save and "Update on page". A new place moves props with the stage like the actors. A
  template clears them (it brings its own place; undo restores them).
- **Store:** `createScenePropsSlice` (`sceneSelectedProp`, `selectSceneProp`, `addSceneProp(propId, at?)`,
  `duplicateSceneProp`). The catalogue and projection load on first use.
- **UI:** Scene tab **Props** (`organisms/scene/ScenePropsTab.tsx`). The selected prop gets a Height slider,
  look (named variants), Duplicate and Remove (toast with Undo). "In this scene" chips pick hidden props. The
  catalogue has search, scene-ready categories and Favorites (shared with the page panel), using the same
  `PropCard`. On the stage: press to select, drag to walk it on the ground, arrow keys move it, `[` / `]` resize
  it ±10 %, Delete removes it, and a dragged card drops where it lands.
- **Not done:** mirroring a prop (the similarity has no mirror; arcs would need their sweep flipped), colour slots
  and screentone per scene prop, props from "My props" (user SVG / PNG) in a scene.

