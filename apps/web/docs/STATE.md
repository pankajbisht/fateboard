# State (zustand store)

One store: `useStore` in `src/store/index.ts`, created with `create(devtools(combinedSlice))`. Devtools are enabled
only when `NODE_ENV === 'development'`. `combinedSlice(set, get, store)` **object-spreads 30 slice creators**
(each once; Paint tools added 2026-11-16). **If two slices define the same key, the one spread later
silently wins.** 14 keys collide today (`undo`, `redo`, `clipboard` fixed 2026-11-07, Q1). That is the root cause of several bugs (see [Key collisions](#key-collisions)).

Typing: slices mostly use `SliceCreator<T> = StateCreator<any, [], [], T>` (`src/store/types.ts`) or untyped
`(set, get, store)`. `RootState = ReturnType<typeof useStore.getState>` is effectively `any`. Cross-slice calls are
`get().someAction?.()`, with no compile-time checks.

Spread order (it matters):

```
1 Canvas  2 Brush  3 UI  4 Layers  5 Page  6 Pages  7 Background  8 Command  9 ShapeStyle  10 UndoRedo
11 Transform  12 Shape  13 Text  14 BackgroundColor  15 ContextMenu  16 Setting  17 advanceOperation
19 NodeEditor  20 Filter  22 Template  23 Notebook  24 Dialog  26 DrawingTools  29 PaintTools  27 Generator
28 Macro  30 PageLayers  31 Document  32 Comic  33 Notes  34 Timeline  35 Character  25 Animation
(each spread once; 18 geometryEngine removed, the second Page spread removed: BUG-002 / BUG-030)
```

Persistence summary: `settings` (`settingsStorage`, localStorage key `fateboard-settings`) and the whole project
(`projectStorage`, IndexedDB) are saved, both through `@/lib/storage` (docs/ARCHITECTURE.md "Storage layer").
Everything else in the store is lost on reload unless a slice saves it itself (custom shapes, patterns and font
templates use `readLocalList` / `writeLocalList` from the same module).

> Dependencies below come from a static scan of `get().x` usage, checked by hand for the core slices.
> "Risks" link to [BUGS.md](BUGS.md).

---

## Key collisions

**None** (BUG-002 fixed 2026-11-07). Each slice is spread once and every key has one owner, enforced by
`src/__tests__/storeKeys.test.ts` (reads the spread order from `src/store/index.ts`) and
`src/store/__tests__/storeComposition.test.ts`. What was resolved:

| Key(s)                                              | Was                                       | Now                                                                      |
| --------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `zoomIn`, `zoomOut`                                 | UI → Page                                 | Page only (UI copies were dead)                                          |
| `setOrientation`                                    | Page → Setting → Page (Page spread twice) | Page only; the second Page spread is gone                                |
| `setBackgroundStyle`, `toggleGrid`                  | Background → Setting / Notebook           | Setting / Notebook only (Background copies were shadowed)                |
| `setBackgroundColor`                                | BackgroundColor → Setting                 | Setting only                                                             |
| `setGridSize`                                       | Setting → Notebook                        | Notebook only                                                            |
| `gridSize`                                          | Background → Notebook                     | Notebook; background patterns use `patternSize`                          |
| `_isSyncing`                                        | Transform → advanceOperation              | Transform only                                                           |
| `color`, `fillColor` (+ `setColor`, `setFillColor`) | Brush → Text                              | Brush only (Text copies had no readers)                                  |
| `strokeWidth` (+ `setStrokeWidth`)                  | ShapeStyle → Text                         | ShapeStyle only (`setStrokeWidth` moved there, store-only)               |
| `shadowColor`                                       | Brush → Text                              | Text keeps the shape shadow colour; brush → `brushShadowColor`           |
| `opacity`                                           | Brush → ShapeStyle → Filter               | ShapeStyle (selection); brush → `brushOpacity`; Filter → `filterOpacity` |

---

## 1. Canvas: `createCanvasSlice.ts`

**Purpose:** owns the Fabric canvas instance and its lifecycle (create/init/dispose), the active tool, pan/wheel
handlers, selection → toolbar state, JSON import/export and debounced autosave to opendb `drawJson`.

**State:** `canvas`, `activeTool` (`'select'|'pan'|'draw'|'node'`), `isPanning`, `isDrawingMode`, `freeDrawingBrush`
(unused), `activePanel` (unused), `selectedObject` (**overloaded**: a Fabric object for textboxes, the string
`'shape'`, or `null`), `showTextToolbar`, `isEditingText`, `hasActiveShape`, `geditor` (MultiStopGradientTool),
`cw`/`ch` (container size, only set when `settings.freehand`), `selectedPreset` (CanvasPreset: the open page's size; a new board takes Settings > Canvas size).
Private closure state (not in zustand): `panCanvas`, `eventHandlers`, and the autosave from
`slices/canvas/persistence.ts` (`createPersistence`: debounce timer, `state.lock` counter that blocks saves during
load/clear, `state.dropped`, `state.unread`, the one-at-a-time writer, unload handlers; P2).

**Actions:** `create`, `mount`, `init(el, container)`, `dispose()` (nulls `canvas` synchronously, then awaits
`canvas.dispose()`), `registerCanvasEvents`, `unregisterCanvasEvents`, `setActiveTool`, `enablePan`, `disablePan`, `beginTemporaryPan`, `endTemporaryPan`,
`setSelectedPreset`, `hasMultipleSelection`, `filterUnlockedSelection`, `setSelectedObject`, `syncFromObject`,
`setToolbar`, `clearToolbar`, `loadLib`, `defaultSettings`, `clearBoard` (New board = new project: one empty page, empty
animation, autosave deleted, new history with a base snapshot: BUG-156), `exportJSON`,
`importJSON(json, {persist})`, `setActiveTool` also takes `'pen'`, `'pencil'` and `'laser'` (Pen / Laser: selection off, crosshair; Pencil: drawing mode, the brush slice builds the Pencil brush), `wheelNavigate(e)` (wheel / trackpad: whiteboard scroll pans and Ctrl / ⌘ + wheel or pinch zooms; design Ctrl / ⌘ + wheel zooms the page; returns true when used) and `handleWheel` (its `mouse:wheel` listener, every tool), `applyCanvasSizeSetting` (Settings > Canvas size changed: the open page takes it, one undo step; called by `init` after `initPages`), `restoreFromStorage` (loads the autosaved **project** through
`lib/storage/projectStorage` → Pages `importProject`; an old `drawJson` board → `importJSON`, adopted as Page 1; a saved board that cannot be opened is kept under the storage key `project.unreadable` and offered as a download, BUG-154), `saveBoard` (downloads `drawing.fateboard` = the whole project via Pages `exportProject`; falls back to the canvas JSON when pages are absent), `persist`,
`flushPersist` (`persist` saves the whole project from Pages `captureProject({ thumbnail: false })`; skipped while
`isPageSwitching` and before pages exist), `handlePersistEvent`, `handleSelectionChange`, `handleSelectionClear`, `handleMouseDown` (no-op),
`handleObjectChange`, `handleDBLClick`.

**Depends on:** Shape (`installShapeBehavior`, `editShapeText`, `closeShapeTextEditor`), UndoRedo (`saveState`,
`pause/resumeHistory`, `initHistory`, `registerHistoryEvents`), Page (`setPageFormat`, `setZoom`, `panBy`), Pages (`initPages`,
`captureProject`, `importProject`, `isPageSwitching`, `pages`, `currentPageId`), Animation (`registerAnimationEvents`,
`loadAnimationData`), Dialog (`confirmDialog`, optional), Setting (`settings`, `getDefaultCanvasPreset`), Brush
(`setBrush`, `color`, `width`), ShapeStyle (`fill`, `clearGradientSession`, `fillMode`), Transform
(`updateFromFabric`). Also imports `updateMaster`, `MultiStopGradientTool`. Node tool: `setActiveTool('node')` turns Fabric
selection off (`selection=false`, `skipTargetFind=true`) and calls NodeEditor `enterNodeMode` when something is selected; it never changes objects.

**Risks:** BUG-003 (its `SERIALIZE_PROPS` lacks `id`, `name`, `animId`), BUG-006/034 (`saveState` on selection).
The draw tool asks the brush slice to rebuild the brush (`initBrush`); it never writes `freeDrawingBrush` (BUG-021).
(`defaultSettings` → `setPageFormat` changes VPT).

## 2. Brush: `createBrushSlice.ts` (+ `store/brushConfig.ts`)

**Purpose:** freehand drawing brushes. 15 classic brush types (`pencil, marker, ink, calligraphy, nib, highlighter, neon,
chalk, crayon, pattern, spray, airbrush, splatter, circle, eraser`) on several engines, plus 66 stamp-engine brushes from
the library (2026-11-16, `store/brushLibrary.ts`, below; effect sets Lightning & electric, Water & liquid, Ice & frost and more Smoke & fog in `store/brushLibraryFx.ts`, 2026-11-17), a whole-stroke eraser, symmetry, straight-line mode, and
stroke styling applied in `before:path:created`. `brush` is a `BrushId`: a classic `BrushType` or a library id
(`isBrushId`).

**State (spread from `DEFAULT_BRUSH_STATE`):** `brush, width, color, brushOpacity, smoothing, lineCap, lineJoin, lineStyle,
blend, taper, nibAngle, shadowBlur, shadowOffsetX/Y, brushShadowColor, shadowOpacity, shadowMatchColor, fillEnabled,
fillColor, fillOpacity, straightLine, symmetry, symmetryCenter, symmetryAngle, symmetryCount, eraserMode, recentColors,
cursor`. `symmetry` is `none | x | y | both | angle | radial | point | kaleido` (2026-11-16; matrices in
`lib/canvas/symmetry.ts`, copies made by `store/brushes/symmetryCopies.ts` after `path:created`).

**Actions:** `initBrush`, `refreshBrushCursor`, `setBrush`, `updateBrush(patch)`, `setBrushWidth`, `setBrushColor`,
`setSymmetry`, `recenterSymmetry`, `commitRecentColor`, `resetBrush`.

**Depends on:** Canvas (`canvas`). Installs canvas hooks once (flag `__fbBrushHooks`).

**Owner of `canvas.freeDrawingBrush`** (the only writer, BUG-021: the Editor effect and the draw tool used to overwrite
its colour / width). (Shared keys fixed: brush opacity / shadow colour are
`brushOpacity` / `brushShadowColor`, BUG-019/020.) There is an existing (possibly stale) test: `src/__tests__/store/brushSlice.test.ts`.
**Pencil tool (2026-11-11, options 2026-11-13):** while `activeTool === 'pencil'` the brush is built from
`drawingState(s)` (`store/pencilStyle.ts`): the drawing colour (`color`) + `pencilStyle` (DrawingTools slice):
width × `creationScale`, opacity, smoothing, `pressure` (= the `ink` engine with `taper` 0 and `speedWidth` false:
a stylus sets the width, a mouse keeps it constant), `autoClose` (`before:path:created` adds `Z` when the stroke ends
within max(12 screen px, 1.5 × width) of its start, `lib/canvas/autoClose.ts`); no blend / shadow / fill / mirror.
Shift = straight line (Fabric's `straightLineKey`; the variable-width brush keeps only the first sample). The Draw
panel's settings are never read or changed for it.

**Brush engines (2026-11-13):** the ink / calligraphy engine (`VariableWidthBrush`) lives in
`store/brushes/variableWidthBrush.ts` (moved unchanged); the Calligraphy pen (brush `nib`, engine `nib`,
`store/brushes/nibBrush.ts`) extends it with Inkscape's thinning / angle / fixation / caps (`lib/brushes/nibOutline.ts`)
from `nibStyle` (DrawingTools). Presets and order are data in `store/brushPresets.ts`, re-exported by `brushConfig.ts`.

**Stamp engine (2026-11-16):** engine `stamp` (`lib/brushes/stamp/`): `stampParams.ts` (settings + ranges + `resolveStamp`),
`dabs.ts` (seeded `DabWalker`: spacing, pressure, speed, tapers, scatter, spray emission over time, fire / gradient /
rainbow colour), `tips.ts` (procedural tips, cached per size bucket and tint), `renderDabs.ts` (dabs + grain /
screentone), `StampBrush.ts` (live: offscreen layer shown on `contextTop`), `StampStroke.ts` (the saved object: points,
settings, colour, size, seed; redrawn at any zoom). `store/brushes/stampBrush.ts` builds it from the library brush +
the user's override (`stampOverrides`, Paint tools slice) + size / colour / opacity / smoothing. The Spray tool
(`activeTool === 'spray'`) draws through `drawingState` → `sprayState` (`store/sprayStyle.ts`, `sprayStyle` in Paint
tools), like the Pencil.

## 3. UI: `createUiSlice.ts`

**Purpose:** fullscreen, toolbar position, zoom helpers.
**State:** `toolbarPosition` (`'left'`), `isFullScreen`.
**Actions:** `setToolbarPosition`, `toggleFullscreen`, `zoomFit` (fits all objects), `actualSize` (VPT identity);
Zoom actions live in the Page slice.
**Depends on:** Canvas. **Risks:** BUG-025; `isFullScreen` is not updated when the user exits with Esc (no
`fullscreenchange` listener).

## 4. Layers: `createLayersSlice.ts`

**Purpose:** layers panel model (derived from the canvas), selection by layer, lock, visibility, opacity, blend,
z-order, group/ungroup, align/distribute, copy/cut/paste/duplicate/linked clone.
**State:** `layers: LayerItem[]` (flat, top-first, rebuilt by `syncLayers()`), `selectedLayerIds`, `clipboard`
(**overridden by Animation**).
**Actions:** `syncLayers`, `syncSelection`, `bindLayerEvents(canvas)` (returns unbind; called by LayersPanel),
`handleLayerKeyDown` (unused), `addLayer`, `selectLayer(id, 'replace'|'toggle'|'range')`, `renameLayer`,
`removeLayer`, `toggleVisibility`, `soloLayer`, `showAllLayers`, `setLayerOpacity`, `setLayerBlendMode`,
`duplicateLayer`, `toggleLayerLock`, `isActiveObjectLocked`, `toggleActiveObjectLock(1)`, `lock`, `unlock`,
`setAllLocked`, `bringForward`, `sendBackward`, `bringToFront`, `sendToBack`, `reorderLayer`, `deleteObject`,
`groupLayers(1)`, `ungroupSelected`, `ungroupLayers1`, `alignLayers`, `distributeLayers`, `isGroupSelected`, `copy`,
`cut`, `paste`, `canPaste`, `duplicate`, `clone` (linked), `cloneer`, `clone1`, `unlinkClone`, `linkClones`,
`selectLinked`, `syncLinkedClones`, `hasLinkedSelection`, `canLinkSelection`, `alignObjects(key, to)`, `selectAllObjects`,
`distributeObjects`.
**Side effects:** `buildLayers` **mutates objects** (assigns `id`, `name`, re-applies lock style).
**Depends on:** Canvas, UndoRedo (`saveState`).
**Copies:** `duplicate` (⌘D) and `duplicateLayer`: independent copy of each selected object exactly on top of it,
one layer above; `copy` / `paste`: independent, offset 12 px per paste; `clone` (⌥D): LINKED copy on top
(`lib/linkedClones`: shared `linkId` = shared look + shape, own position / rotation / flip; editing any copy updates
the others; a different kind, e.g. after the node tool, is replaced by a copy of the edited one at its own place).
All copies keep every `CUSTOM_PROPS` value; duplicates / pastes drop `linkId` and get a new `id` / `shapeId`.
**Cross-slice:** UndoRedo calls `syncLinkedClones` in `saveState` (selection) and on `object:modified` (target), so an
edit and its linked copies are one undo step.
**Arrange rules (2026-11-12):** lock / group / align helpers live in `lib/canvas/arrange.ts` (`setLocked`,
`syncSelectionLock`, `isLockedTarget`, `viewRect`, `ungroupInto`, `readSelection`, `ARRANGE_RULES`). Locked objects are
protected: not deleted, aligned, grouped or ungrouped; a multi-selection box carries the lock of its objects
(BUG-188); the Transform slice refuses panel edits / flips on them (BUG-189). `ungroupSelected` takes apart every
unlocked group of the selection; `isGroupSelected` = the selection holds an unlocked group. One object aligns to
`viewRect` (the page in design, the visible area in whiteboard, BUG-191).
Ungroup takes apart built-in composites (`isTextShape`: text shapes, sticky notes) only when one is selected alone
(`ungroupable`, until BUG-194 is decided). Canvas `hasMultipleSelection` has no caller in `src/` since Group uses
`ARRANGE_RULES` (kept: removing a public key needs the owner's yes).
**Risks:** BUG-003 (layers clone list), BUG-024 (locks undone by tool switch), BUG-193 (distribute with a spanning
object), BUG-194 (ungroup splits text shapes).

## 5. Page (page geometry state + the one zoom path): `createPageSlice.ts`

**Purpose:** page format/orientation/custom size/background, fit scale and zoom of the **current** page.
**State:** `pageFormat` (`'Freehand'` default; type `PageFormat` only allows `'Freehand'`), `orientation`,
`customSize`, `pageBackground`, `zoom`, `scale`, `pageWidth`, `pageHeight`.
**Actions:** `setPageFormat`, `setOrientation`, `setCustomPageSize`, `setPageBackground`, `setZoom(z, point?)`,
`zoomIn`, `zoomOut`, `fitToScreen`, `applyPageSize` (design, 2026-11-17: the opening zoom `openZoom`: portrait pages
1.3 × the fit, never wider than the board, scrolled to the top; others 1), `fitToWidth` (design: zoom = fit width / fit page, `lib/canvas/pageFit.ts`, reads the
`[data-board-scroll]` size and Document `pageSetup`; whiteboard: `fitToScreen`; 2026-11-17), `zoomToRect(rect, padding?)` (whiteboard), `centerViewOn({ x, y })` (scene point to the middle of the view, same zoom, through `panBy`; note pins, 2026-11-17), `panBy(dx, dy)` and
`pinchZoom(factor, clientX, clientY)` (touch, screen px; design scrolls the `[data-board-scroll]` element, zoom goes through `setZoom`; `panBy` is the one pan path: the Canvas slice's Hand tool and wheel pan call it too), `applyPageSize` (design: state only, zoom 1

- `pageWidth/Height` from `selectedPreset`; whiteboard: viewport back to 1:1). Exports: `resolvePageSize`, `isFreehand`, `MIN/MAX_ZOOM`,
  `MIN/MAX_PAGE_PX`, `DEFAULT_PAGE_BACKGROUND`. Zoom range 2 % … 6400 % (BUG-221, was 10 … 400 %).
  **Depends on:** Canvas (`canvas`, `cw`, `ch`, `selectedPreset`), Setting (`settings.freehand` before the board reports
  `boardMode`), Background (`drawBackground`, whiteboard only).
  **Risks:** `pageFormat` / `orientation` /
  `customSize` are legacy mirrors (the page size is `selectedPreset`); `PAGE_SIZES` keys differ from settings formats.

## 6. Pages (multi-page document): `createPagesSlice.ts`

**Purpose:** list of pages, each with its own canvas JSON, thumbnail, format/orientation/size/background and
animation (`animation?: AnimationData`, Q12). The whole list is autosaved as one project (BUG-004).
**State:** `pages: Page[]`, `currentPageId`, `isPageSwitching`.
**Actions:** `initPages` (adopts current canvas as Page 1), `addPage`, `duplicatePage`, `deletePage`, `renamePage`,
`movePage`, `switchPage`, `goToNextPage`, `goToPrevPage`, `saveCurrentPage`, `clearCurrentPage`,
`applyFormatToAllPages`, `exportPageAsDataURL`, `exportProject` (JSON string), `captureProject({ thumbnail? })` (project
object for autosave; null until pages exist), `importProject(json string | project object)`. Page-only changes (rename,
move, delete, apply format, every page switch) call Canvas `persist`.
Async ops are serialized through a module-level promise queue `runExclusive`.
**A page that cannot be loaded (BUG-154):** `showPage` resolves false and puts `pages` and `currentPageId` back (the
canvas still shows the page that was open, because Fabric replaces the objects only after all of them are built).
`switchPage`, `duplicatePage` and `deletePage` then show a dialog; `addPage` / `duplicatePage` resolve null;
`importProject` tries the page that was open, then the others in order, and resolves false when none loads. A page
that cannot be read stays in the project untouched.
**Values from a file (BUG-157):** `normalizePage` keeps a thumbnail only when it is `data:image/…` and a preset or
custom size only when both sides are inside `MAX_PAGE_PX`.
**Depends on:** Canvas (`canvas`, `persist`), Page (`pageFormat`, `orientation`, `customSize`, `pageBackground`,
`applyPageSize`, `pageWidth`), Animation (`getAnimationData`, `loadAnimationData`, `pause`), Dialog (`alertDialog`,
optional).
**Risks:** queue is global (BUG-035); keyframe history resets on page switch (BUG-141).

## 7. Background (patterns): `createBackgroundSlice.ts`

**Purpose:** canvas background patterns (`none|grid|ruled|dots|isometric`) via `fabric.Pattern`.
**State:** `backgroundStyle` (`'none'`), `patternSize` (was `gridSize`), `gridColor`, `gridMajorEvery`, `gridMajorColor`,
`gridLineWidth`, `gridMajorLineWidth`, `ruledLineHeight`, `ruledColor`, `ruledLineWidth`.
**Actions:** `setBackgroundStyle` (**overridden**), `toggleGrid` (**overridden**), `setGridOptions`, `setRuledOptions`,
`drawBackground`.
`drawBackground` with no pattern keeps the page colour (BUG-022 fixed). Not connected to `settings.backgroundStyle` (no UI
sets a pattern today).

## 8. Command: `createCommandSlice.ts`

**Purpose:** command registry for keyboard shortcuts and the command palette.
**State:** `commands` (from `components/config/commandConfig.tsx` = File, Edit, Group, Lock, Zoom, UndoRedo bar
configs; each has `id, shortcut, handler({get,set})`).
**Actions:** `runCommand(id)` (runs the handler, then `recordMacroStep(id)` for the Macro slice), `loadCommands()` (the registry is imported lazily to avoid a store ⇄ slice import cycle,
BUG-048, so `commands` is `[]` for one tick after the store is created).
**Depends on:** whatever each command's handler calls (Layers, Canvas, Page, UI, and `undo/redo`, which resolve to
Animation, BUG-001), Macro (`recordMacroStep`). A handler may return a promise (duplicate, clone, paste, cut, copy,
delete, undo, redo return theirs, 2026-11-13) so Macro playback can wait for it.

## 9. ShapeStyle: `createShapeStyleSlice.ts` (+ `colorSystemFixes.ts`)

**Purpose:** fill/stroke/opacity/shadow/gradient of selected objects, and boolean path operations (paper.js).
**State:** `activePaint` (`'fill'|'stroke'|'shadow'`), `fill`, `stroke`, `strokeWidth` (+ store-only `setStrokeWidth`), `strokeStyle`,
`opacity`, `activeObjectShadow`, `gradient`, `strokeStyleList`, `strokeStyleMap`, `fillMode`,
`paintTarget` (`{ id, label, color?, apply(hex) } | null`: a panel color that the dock palette paints instead of the selection).
**Actions:** `setGradient`, `setActivePaint`, `setStrokeWidthN`, `setStrokeStyle`, `setOpacity`, `setOpacity1`,
`previewOpacity`, `endOpacityPreview`, `addShadow`, `applyShadowPreset`, `removeShadow`, `toFabricPath`,
`booleanOperation`, `clipSelectedObject`, `union/intersect/subtract/exclude/divide/cut/punch/crop/smartUnion/xorSplitSelected`,
plus color methods `clearGradientSession`, `applySolidColor`, `setFill`, `setStroke`, `applyShadowColor`,
`applyFillGradient`, `handleColorChange`, `setPaintTarget`. `setActivePaint` also clears `paintTarget`.
**Text targets:** `updateText` / `setTextCase` / `useActiveText` resolve "the text" with `lib/textTargets.ts` (text boxes + the Textbox inside text shapes / sticky notes) and re-fit text shapes via `fitTextShape`. `setToolbar` stores a text shape itself in `selectedObject` (other groups: `'shape'`) so the one text float can anchor to it.
`toggleFill` / `toggleStroke` (dock Remove ⇄ Add buttons; rules in `lib/paintToggle.ts`): remove from every target if any
has it, else add `PAINT_DEFAULTS` (shape: fill `#FFFFFF`, stroke `#000000` 2; text: fill / outline `#000000` 2, `paintFirst: 'stroke'`);
groups through children, images skipped for fill, text per-letter styles cleared; no-op (returns false) when nothing paintable
is selected; mirrors `fill` / `stroke` / `strokeWidth`; `saveState()` once. `PAINT_DEFAULTS` is also the new-shape paint in `createShapeSlice`.
**Palette routing (`handleColorChange`):** `bg-*` class → CSS color → `toOpaqueHex` (`#rrggbb`; translucent kept) →
`paintTarget.apply` if set; else gradient stop; else defaults when nothing is selected (fill also sets the brush color);
else the selection's fill / stroke / shadow.
**Depends on:** Canvas (`canvas`, `geditor`), UndoRedo, Brush (`setBrushColor`), Text (`setShadowColor`).
**Risks:** BUG-019/020. `clearGradientSession` guesses the GradientTool API (code comment says so).

## 10. UndoRedo: `createUndoRedoSlice.ts`

**Purpose:** canvas history as JSON snapshots (`serializeCanvas` + `CUSTOM_PROPS`, `lib/serialization.ts`). Model:
the last item of `undoStack` is the current state. **Per page** (Q7): the stacks belong to the current page; other
pages' stacks are parked in a closure map and come back when you return.
**State:** `MAX_HISTORY` (20), `_isRestoring`, `_historyPaused` (counter), `undoStack: string[]`, `redoStack`,
`canUndo`, `canRedo`.
**Actions:** `saveState(immediate?)` (150 ms debounce, dedupes identical JSON; also schedules the autosave, Canvas
`persist`, BUG-243 2026-11-17: many recorded changes fire no canvas event), `undo` / `redo` (queued: fast presses
all apply), `clearHistory`, `initHistory`, `pauseHistory`, `resumeHistory`, `registerHistoryEvents` (called by the
Canvas slice's `registerCanvasEvents`: object added / removed / modified, text editing exited; helpers ignored),
`unregisterHistoryEvents`.
**Undo / redo first end an editing session:** node editing is cancelled (that is the undo of its unsaved changes),
the shape text editor is committed, canvas text typing is finished (one step).
**Page switch:** a pending change is flushed into the old page; changes made while a page loads are not recorded; a
page seen for the first time gets a base snapshot once loaded; a page with history re-bases its top on the page
as loaded (so the next undo is a real one).
**Embedded files (BUG-155):** a snapshot holds a short token for every `data:` URL of 2048 characters or more; the
file itself is kept once, in a closure pool (`lib/snapshotAssets.ts`) shared by all snapshots of all pages. The pool
lets go of files when the snapshots that used them are dropped (history limit, a new change after an undo,
`clearHistory`, a deleted page). Snapshot strings are therefore not plain document JSON: only this slice reads them.
**A snapshot that cannot be loaded (BUG-154):** the stacks go back to what they were, the error is logged and
`undo` / `redo` still resolve.
**Depends on:** Canvas (`canvas`, `clearToolbar`, `persist`), Pages (`currentPageId`, `isPageSwitching`, `pages`),
NodeEditor (`nodeEditor`, `cancelNodeMode`), Shape (`closeShapeTextEditor`); optional `rebuildLinks` (does not exist).
**Risks:** BUG-027. Snapshots are still whole-page JSON, so a page with thousands of objects costs memory per step.

## 11. Transform: `createTransformSlice.ts`

**Purpose:** X/Y/W/H/rotation/flip/radius inputs ↔ the active object.
**State:** `transform` (`x,y,width,height,rotation,flipX,flipY,originX,originY,id,rx,ry`), `hasSelection`,
`_isSyncing`.
**Actions:** `updateFromFabric(obj)`, `updateFabricFromStore`, `setTransform(key, value)`, `flipX`, `flipY`,
`setOrigin`, `setRadius`, `nudgeSelection(dx, dy)`, `syncTransformFromSelection`.
**Risks:** BUG-033 (`hasSelection` never reset). Called only on selection/creation, so the panel is stale while
dragging (**UNKNOWN - verify** whether any component listens to `object:moving` for it). `lib/types/transform.type.ts`
still has `centerY` instead of `originY`.

## 12. Shape: `createShapeSlice.ts` (+ `hooks/shape/shapeCatalog.ts`, `lib/utils/shapeConnectors.ts`, `shapeTextEditor.ts`, `shapeTextFonts.ts`)

**Purpose:** shape library (catalog-driven), text-inside-shape groups, connectors (simple/elbow/smooth, attached to
ports), custom user shapes.
**State:** `activeConnector`, `customShapes` (from `localStorage` `fateboard.customShapes.v1`).
**Actions:** `installShapeBehavior(canvas)` (idempotent per canvas via WeakSet), `fitTextShape`, `addShape(type,
opts)`, `addConnector(mode)`, `updateConnectorStyle`, `normalizePathData`, `saveCustomPath`, `saveSelectionAsShape`,
`removeCustomShape`, `generateStarPoints`, `editShapeText`, `closeShapeTextEditor`, `createArrowShape`.
**Depends on:** Canvas (`canvas`, `persist`, `setToolbar`), UndoRedo, Transform (`updateFromFabric`), Layers
(`addLayer`).
**Risks:** text shapes rely on `isTextShape`/`textInset` and connectors on `connectorData`/`shapeId`, which undo and
pages drop (BUG-003).

## 13. Text: `createTextSlice.ts`

**Purpose:** text toolbar state and adding a `Textbox`.
**State:** `fonts`, `fontSize`, `bgColor`, `hasShadow`, `shadowColor` (the shape shadow colour, written by `applyShadowColor`), `fontFamily`,
`isBold`, `isItalic`, `isUnderline`, `charSpacing`, `lineHeight`, `strokeColor`, `textAlign` (`color`, `fillColor`,
`strokeWidth` removed: Brush / ShapeStyle own them, BUG-002).
**Actions:** one setter per field (store only), `updateText(props, { history? })` (applies to the selected text boxes; while editing with highlighted characters, char-level props go to those characters only; whole-box edits clear per-character overrides; `history: false` = slider preview without an undo step), `setTextCase('upper' | 'lower' | 'title')`, `addText(opts)` (word wrap).
**Depends on:** Canvas, UndoRedo; `wirePlaceholderBehavior` from `colorSystemFixes.ts`.
**Risks:** BUG-020.

## 14. BackgroundColor: `createBackgroundColor.ts`

**Purpose:** legacy Tailwind-class fill setter. **State:** `backgroundColor` (`'#ff0000'`), `borderColor`,
`borderWidth`, `borderStyle`. No actions (its `setBackgroundColor` was shadowed by Setting and removed, BUG-002). Effectively dead.

## 15. ContextMenu: `createContextMenu.ts`

**State:** `visible`, `x`, `y`, `items` (generic names, easy to collide). **Actions:** `openMenu(x, y, items)`,
`closeMenu`. Items come from `components/config/contextMenuRegistry.tsx`.

## 16. Setting: `createSettingSlice.ts`

**Purpose:** user preferences, validated by `sanitizeSettings`, persisted through `settingsStorage` (`@/lib/storage`, key `fateboard-settings`), theme
application.
**State:** `settings: { mode, colorTheme, iconSize, unit, freehand: boolean, defaultCanvasPresetId (a preset id or
'custom'), canvasOrientation: 'landscape' | 'portrait', customCanvasSize: { width, height } (whole px, 1–10,000),
grid: { design, whiteboard: { style: GridStyle, size: 4–200 px } } }` (grid added 2026-11-12, read by the Notebook slice). Defaults (`DEFAULT_SETTINGS`, owner 2026-11-11): Light, Fate Blue,
Small icons, px, design board, `presentation-16-9`, landscape, custom size 1920 × 1080.
The page-size, background, grid, snap and rulers fields were saved but never read and were removed (owner,
2026-11-11); `sanitizeSettings` drops them from older saves and keeps the rest.
**Actions:** `load` (unused; `RootLayout` calls `hydrate` instead), `hydrate`, `initTheme` (unused), `setMode`,
`setIconSize`, `setColorTheme`, `setUnit` (rulers and size fields, via `lib/units` + `hooks/useUnit`; values stay in
px), `setFreehand`, `toggleFreehand`, `setDefaultCanvasPreset(presetId)` (a `CANVAS_PRESETS` id; anything else is
ignored; `'custom'` selects the custom size), `setCanvasOrientation` (landscape / portrait for the canvas size; a custom
size is turned too), `setCustomCanvasSize(width, height)` (px; selects Custom size and sets the orientation from it,
so it is used exactly as typed; false and no change outside 1–10,000 or for fractions), `resetSettings` (every field back to `DEFAULT_SETTINGS`; theme, color theme and icon size are applied to
`<html>` at once), `setGridPrefs(mode, { style?, size? })` (one board mode; invalid fields ignored, size
clamped), `takePendingCanvasSize()` (true once after the resulting canvas size changed, then false; switching the orientation
of a square size is not a change; the
marker is stored under `fateboard-canvas-size-pending`, so it survives a reload), `updateSetting`, `applyTheme`,
`opendbSave`.
Pure helpers: `sanitizeSettings`, `getDefaultCanvasPreset(settings)` (the preset in the chosen orientation via
`orientPreset` from `board.config.ts`; always a new object, so a page never changes the setting).
**Canvas size (owner, 2026-11-11):** Settings > Canvas is the only place to choose a size; there is no left-rail
panel. The Canvas slice gives a new board that size (the first board when nothing is saved, a saved board that cannot
be opened, New board) as plain state: the base of the new board, not an undo step. A change in Settings resizes the
page that was open when the editor loads again (`applyCanvasSizeSetting`, after `initPages`): one undo step,
autosaved. Other pages, and pages sized by a template, keep their size until they are open during a change. A
whiteboard has no page size: the change waits for the next design board. **2026-11-17:** the code lives in
`store/pagePreset.ts` (`startBoardPreset`, `applySizeSetting`; the Canvas slice keeps the action names); a manga /
comic size also gives the page its `pageSetup` (bleed 3 mm + safe-area margins; new boards silently, a Settings change
through Document `setPageSetup`). One entry per format (A4 Portrait / Landscape merged into "A4"; Orientation picks
the shape); saved ids are mapped (`currentPresetId`: `a4-landscape` → `a4-portrait`, `@swapped` → base).
**Risks:** BUG-015 (consumers compare `freehand` to strings), BUG-023.

## 17. advanceOperation: `advanceOperationSlice.ts` (+ `lib/patternRules.ts`, `lib/pathRepeat.ts`)

**Purpose:** repeat tools (horizontal, grid, radial, along path) and saved pattern tiles (`localStorage`
`canvas.patterns.v1`).
**State:** `objects` (tracked repeat objects), `patterns`.
**Actions:** `setCanvas` (writes `canvas`, unused), `addObject`, `cloneObject`, `repeatHorizontally`, `repeatGrid`,
`repeatRadially`, `repeatAlongPath`, `previewPatternTile`, `createPattern`, `deletePattern`, `renamePattern`,
`applyPattern`, `clearPattern`, `fillPattern`, `removeObject`.
**Depends on:** Canvas, UndoRedo. **Risks:** `setCanvas` can overwrite the canvas owned by the Canvas slice
(no caller today). Only partly audited.

## 18. geometryEngine: removed

Deleted 2026-11-07 (BUG-030, owner approved): no UI used it, and its `set(partial, cb)` calls would have replaced
the whole store. paper.js stays for boolean operations (`lib/booleanOps`).

## 19. NodeEditor: `createNodeEditorSlice.ts`

**Purpose:** path node editing (`PathNodeEditor` class). Converts shapes to cubic paths, draws handles
in `after:render` (no helper objects), supports add/delete/convert nodes and keyboard nudges.
**State:** `nodeMode`, `activePath`, `nodeEditor`, `selectedNode`.
**Actions:** `enterNodeMode` (edit the selected object), `exitNodeMode` (commit), `cancelNodeMode`, `addNodeAt`,
`deleteSelectedNode`, `toggleSelectedNodeType`; node float: `addNodeToPath` (middle of the segment after the
selected node; not `addNode`, which is the geometry engine's), `setSelectedNodeType('corner' | 'smooth')`,
`setSelectedSegments('line' | 'curve')` (both segments next to the node; 'curve' keeps the shape),
`setPathClosed(closed)` (close joins the ends, open cuts at the node), `breakPathAtSelectedNode` (closed: open at
the node; open: split in two at a middle node), `moveSelectedNode(x, y)` (canvas px).
`selectedNode` = `{ index, subPathIndex, type, hasHandles, nodeCount, x, y, closed, canDelete, canBreak }`.
**Switching:** double-click a shape in Select (not a text shape: that edits its text) = `setActiveTool('node')` on
it; that edit ends back in Select (Enter / Escape / Done keep it selected, a click away selects what is under the
pointer). Picked from the rail / `A`, the tool stays until Escape (nothing in edit), `V`, `H` or another tool.
**Node tool:** the slice `store.subscribe`s to `activeTool` / `canvas`. While `activeTool === 'node'` it listens to
`mouse:down` (click the topmost editable object = edit it; empty = deselect), `mouse:move` (hover cursor) and
`keydown` Escape (no edit in progress = back to Select). The editor's outside click hands its scene point back
(`onExit(result, committed, point)`) so clicking another shape switches to it. Leaving the tool commits.
Editable = visible, evented, not `_locked`, not a connector / connector handle / helper, not inside a plain group,
and a supported geometry (path, rect, circle, ellipse, triangle, polygon, polyline, line). A text shape
(`isTextShape` group) edits its outline (`__box`): the working path gets the child's scene matrix; on commit the
outline goes back into the group at the same index (a primitive is swapped for a Path via `group.insertAt`, which
converts it into the group plane, and `__box` is updated), the group re-fits (`triggerLayout`), then the text is
re-centred on the outline and re-wrapped (`fitTextShape`). A primitive becomes a Path
on commit and keeps `CARRY_PROPS` (`id, name, data, customId, customType, shapeId, animId`) + its interaction props.
While editing, the source is hidden by skipping its `render` (not `visible`), so autosave / page capture mid-edit
save it visible. Handle sizes and hit radii are screen px (`screenScale` = zoom × CSS fit scale).
**Cross-slice:** reads `canvas`, `activeTool`; calls Canvas `setActiveTool('select')` (Escape); imports
`fitTextShape` from the Shape slice module (plain function, no store import).
Keys pause while a modal is open (`canvasKeysBlocked`, BUG-062). Commit fires `object:modified` (autosave) and
`setActiveObject` (selection → history snapshot); ⌘Z during an edit cancels it (UndoRedo).

## 20. Filter: `createFilterSlice.ts` (+ `organisms/filter/ui/filterEngine.ts`, `useImageFilters.ts`)

**State:** `brightness, contrast, saturation, blur, noise, pixelate, hue, gamma, grayscale, sepia, invert, filterOpacity`
(shared). **Actions:** `setFilter(key, value)`, `resetFilters`, `setLayerBlur(radius, { history? })` (2026-11-16,
BUG-220: blurs the selected objects themselves, any type; `layerBlur` is a serialized object prop drawn by
`lib/canvas/layerBlur.ts`; one undo step unless `history: false`). **Depends on:** Canvas (`canvas`), UndoRedo
(`saveState`). **Risks:** BUG-019. No mounted UI uses this slice:
the Filter tab (`Filters.tsx` → `useImageFilters`) keeps its own state; only the dead `Brightness.tsx` reads it.

## 22. Template: `templateSlice.ts` (+ `organisms/effects/designTemplateData.ts`, `sizePresets.ts`)

**Purpose:** design template gallery, favourites, "save canvas as template", applying a template to the page.
**State:** `designTemplates`, `designTemplateSearch`, `designTemplateCategory`, `designTemplateSizeId`,
`favoriteDesignTemplateIds`. (`designArtboard`, `designViewZoom`, `fitDesignToViewport` and `isArtboardObject` removed:
the page is the artboard, BUG-007 / BUG-139.)
**Actions:** `saveCanvasAsTemplate`, setters for search/category/size, `toggleFavoriteDesignTemplate`,
`getDesignTemplateById`, `getFilteredDesignTemplates`, `applyDesignTemplate` (design: page size = template size via
`setSelectedPreset`, content placed on the page, page background kept; whiteboard: content framed with `zoomToRect`.
One undo step incl. the page size; then `showToast` with Undo, Q11).
**Depends on:** Canvas (`canvas`, `setSelectedPreset`), Page (`boardMode`, `zoomToRect`), UndoRedo (`saveState`,
`pause/resumeHistory`, `undo`), Dialog (`showToast`).
**Risks:** BUG-008 (origins of template data). Persistence of favourites/saved templates: **UNKNOWN - verify**.

## 23. Notebook (grid + snapping): `createNotebookSlice.ts`

**Purpose:** grid painted behind objects (patches Fabric's internal `_renderBackground`) and smart snapping to
grid/objects with guides while moving/scaling. Re-attaches itself via `store.subscribe` when `canvas` changes.
**State:** `gridEnabled` (false), `gridSize` (20), `gridStyle` (`'lines'`), `snapEnabled` (false), `snapToObjects` (true, applies once snap is on), `snapThreshold`.
Snap starts off (2026-11-07). The grid follows the board mode (2026-11-11): entering the whiteboard turns it on,
entering a design page turns it off; leaving the editor and coming back to the same mode keeps the user's choice
(closure `lastMode`, `store.subscribe` on `boardMode`). **Style and size (2026-11-12):** seven styles
(`lib/canvas/grid.ts` `GRID_STYLES`: graph lines, squares, dashed, dots, crosses, isometric, ruled), saved per board mode
in `settings.grid` (defaults: whiteboard dots, design graph lines, 20 px). `gridStyle` / `gridSize` mirror
`settings.grid[mode]` for the current `boardMode` (one-way: `store.subscribe` on `settings` / `boardMode`); the setters
write Settings. Painting is `lib/canvas/gridPainters.ts` (`paintGridStyle`); snapping uses the lattice of the grid that
is shown (`gridSnapSteps`: cells; isometric = per-axis lattice, x every half side, y every triangle height, so corners and
horizontal-edge midpoints; ruled = rows
only, x free). This is the only grid renderer in both modes (the whiteboard CSS dot grid was removed, BUG-107).
**Depends on:** Page (`boardMode`), Setting (`settings.grid`, `setGridPrefs`).
**Actions:** `setGridEnabled`, `toggleGrid`, `setGridSize` (clamped 4–200, saved per mode), `setGridStyle` (saved per
mode; unknown styles ignored), `setSnapEnabled`, `toggleSnap`, `setSnapToObjects`, `toggleSnapToObjects`,
`setSnapThreshold`, `drawGrid`.
**Risks:** relies on a private Fabric method (`_renderBackground`), so it may break on a Fabric upgrade. The old
`settings.snapToGrid`/`settings.gridSize` fields (removed 2026-11-11) are still dropped; grid prefs live in `settings.grid`.

## 24. Dialog: `createDialogSlice.ts` (+ `organisms/DialogHost.tsx`, `molecules/Modal.tsx`)

**Purpose:** app-wide themed confirm / alert dialogs; replaces `window.confirm` / `window.alert` (guarded by
`src/__tests__/nativeDialogs.test.ts`). Requests are queued and `DialogHost` (mounted once in `RootLayout`) shows
`dialogQueue[0]`. Promise resolvers live in the creator's closure, not in state.
**State:** `dialogQueue: DialogRequest[]` (`{ id, kind: 'confirm'|'alert', title, message, confirmLabel, cancelLabel, tone }`),
`toast: ToastRequest | null` (`{ id, message, actionLabel, duration }`; one at a time, rendered by `ToastHost`; the
action callback lives in the closure).
**Actions:** `confirmDialog(opts) → Promise<boolean>` (false on Cancel / Escape / backdrop), `alertDialog(opts) →
Promise<void>`, `resolveDialog(result)` (used by `DialogHost`), `showToast({ message, actionLabel?, onAction?, duration? })`
(default 6 s), `dismissToast`, `runToastAction` (runs the action once, hides the toast).
**Used by:** ShapeStyle (`booleanOperation`, `clipSelectedObject` warnings via `get().alertDialog`), `feature/import`,
`fileActions.newBoard`, `PagePanel` (delete / clear page), `AnimationPanel` (clear all), Template (`showToast`).
**Risks:** none known. Slices should not `await` an alert (it resolves only when the user dismisses it).

## 26. DrawingTools: `createDrawingToolsSlice.ts` (+ `lib/canvas/penPath.ts`, `lib/canvas/laserTrail.ts`)

**Purpose:** the Pen tool (P) and the Laser pointer (K), added 2026-11-11; Pen / Pencil options 2026-11-13. Spread
before Animation. The Pen lives in `drawingTools/penTool.ts` (+ `penStyle.ts`, `penContinue.ts`, `shared.ts`).
**State:** `penPointCount` (points of the Pen path being drawn), `laserStrokeCount` (laser strokes still fading),
`penMode` (`'pen' | 'curvature' | 'freeform'`), `penStyle` (`stroke, strokeWidth, fill, fillEnabled, lineCap,
lineJoin, dash, arrow, shape, shapeWidth`), `pencilStyle` (`width, opacity, smoothing, pressure, autoClose`; read by the
Brush slice), `nibStyle` (`thinning, angle, fixation, caps`: the Calligraphy pen brush, read by the Brush slice).
**Pen shape (2026-11-13, Inkscape Pen "Shape"):** with `penStyle.shape` = `triangle-in | triangle-out | ellipse` a NEW
open path is built as one closed filled outline (`lib/canvas/penShape.ts` `shapedOutline`, full thickness
`shapeWidth` × `creationScale`, fill = the stroke color, no stroke / dash / arrows). Closed shapes and continued paths
are unchanged. `setNibStyle(patch)` clamps and, while the brush is `nib`, rebuilds it through `updateBrush`.
**Actions:** `finishPenPath({ close? })` (one `fabric.Path` in the `penStyle` stroke, width × `creationScale`; fill only
on closed shapes with `fillEnabled`, else `rgba(0,0,0,0)`; arrowheads on open paths; `customType: 'shape'`, selected
in the Select tool; under two points it cancels), `cancelPenPath`, `setPenStyle(patch)` / `setPencilStyle(patch)`
(sanitised: bad values ignored, numbers clamped; `setPencilStyle` rebuilds the brush through `updateBrush` while the
Pencil is active), `setPenMode(mode)` (keeps a path of two points or more that is being drawn).
**Pen modes:** Pen (click / drag; Shift 45°, Alt-drag = outgoing handle only; clicking an end of an open path
continues it: same object, new geometry, one `object:modified`), Curvature (`smoothNodes`: Catmull-Rom handles, Alt +
click = corner), Freeform (drag; `simplifyPoints` then `smoothNodes`; closed when it ends near its start; repaint once per frame).
Changing tool or mode keeps a path of two points or more (and a Freeform drag); clicking a path's end and leaving
without a new point leaves it untouched (no undo step). A page switch drops the path in progress (BUG-206). Enter /
Space on a focused button or radio activate it; mouse clicks on the options bar keep the focus where it was. Keys whose
target is in a `role="dialog"` (toolbar popovers) are left alone (BUG-202).
**How:** `store.subscribe` on `activeTool` / `canvas` attaches the tool's listeners only while it is active (same pattern
as the node tool). Pen: click = corner, drag = smooth point (`mirrorHandle`), click the first point = closed,
Enter / Escape / double-click = open, Backspace / Delete = last point off (a capture-phase key listener stops the
event, so it never deletes the selection). Leaving the Pen keeps a path of two points or more. Laser: drag draws
strokes with timestamps, a `requestAnimationFrame` loop fades them (`LASER_LIFE_MS` = 1000) and stops when none are
left; Escape = Select. Both paint only on `canvas.contextTop` in scene space (sizes in screen px via `screenScale`):
no helper objects, nothing in history, autosave or exports.
**Depends on:** Canvas (`canvas`, `activeTool`, `setActiveTool`, `setToolbar`), Page (`boardMode`, `pageWidth`,
`pageHeight` for `creationScale`), NodeEditor (`screenScale`), Brush (`updateBrush`, from `setPencilStyle`). The
Brush slice reads `pencilStyle` (via `drawingState`) and `screenScale` (auto-close tolerance).

## 29. PaintTools: `createPaintToolsSlice.ts` (+ `paintTools/`, `store/sprayStyle.ts`, `lib/canvas/{floodFill,traceContours,lasso,drafter,symmetry,copySpray}.ts`)

**Purpose (2026-11-16):** Paint bucket (G), Spray (Shift + B), Lasso (L), Drafter (D), "Reflect selection" and the
per-brush stamp settings. The tools listen on the canvas only while active (store subscription, like the Pen); the
symmetry guide (axes while Draw / Spray is active) is a helper object (`excludeFromExport`, `excludeFromLayers`,
`excludeFromSnap`, `_isHelper`).
**State:** `bucketStyle` (mode auto / region / shape, tolerance, gap, expand, placement), `lassoStyle` (action select /
fill, match touch / contain), `drafterStyle` (mode line / parallel / perpendicular / dimension / construction, angle
step, head angle, ISO pen width), `sprayStyle` (size, flow, particle, softness, opacity), `copySprayStyle` (scale,
spacing, spread, size / rotation / opacity jitter, align; 2026-11-17), `stampOverrides` (per library brush id, valid
partial settings only).
**Actions:** `setBucketStyle`, `setLassoStyle`, `setDrafterStyle`, `setSprayStyle`, `setStampOverride(id, patch)`,
`resetStampOverride(id)`, `bucketFillAt(point)` → `'shape' | 'region' | 'open' | 'none'`, `lassoSelect(loop, mode)`,
`lassoFill(loop)`, `drafterLine(a, b)`, `reflectSelection({ mode, angle, count, around })` → copies added,
`setCopySprayStyle`, `sprayCopies(dabs)` → objects added.
**Copy spray (Spray › Copy mode since 2026-11-27, was Shift + S; `paintTools/copySpray{Actions,Tool}.ts`):** `sprayStyle.mode` (Paint / Mist / Splatter / Copy) picks what Spray (Shift + B) does; `setActiveTool('spray')` opens `copySpray` in Copy mode (`resolveTool`, `store/canvasTools.ts`) and `setSprayStyle({ mode })` swaps the tool while Spray is open. Source: the selection when Copy opens, else a click on an object (`sourceObjectAt`); Alt + click swaps it; `copySpraySource` (label or null) drives the bar. Mist / Splatter tune `sprayState` (rate, ink, drop size jitter). when `activeTool` becomes
`'copySpray'` the selection is snapshotted (clones in scene coordinates; `setActiveTool` sets the store before it
clears the selection), so undo, page switches or editing the original do not change what is sprayed; the snapshot is
dropped when the tool closes. A drag places dabs (`lib/canvas/copySpray.ts`, seeded) previewed on the top canvas (the
source drawn once into a bitmap, one blit per copy); on release `sprayCopies` clones the source per dab and adds ONE
group named "Copy spray" (a single copy of a single object is added as is) → one `object:added` = one undo step. Caps:
400 objects (objects inside a selected group count one by one) and 30 photos per drag (`sprayDabLimit`, BUG-239);
the page is re-checked after the clones load (`currentPageId`). No selection → toast. Symmetry does not apply.
**Depends on:** Canvas (`canvas`, `activeTool`, `setActiveTool`), Brush (`color`, `brush`, `updateBrush`, `symmetry*`),
Setting (`unit`), Page (`boardMode`, `zoom`), Pages (`currentPageId`, `isPageSwitching`), UndoRedo (`saveState`), Dialog
(`showToast`). Not persisted (session settings).

## 27. Generator: `createGeneratorSlice.ts` (+ `lib/generators/fractals.ts`, `lib/generators/automata.ts`)

**Purpose:** the Fractals and Cellular Automata dock tabs (added 2026-11-13). Spread before Animation.
**State:** none.
**Actions:** `insertFractal({ kind, depth, size, angle?, color? })` (`koch | sierpinski | tree | dragon | hilbert`; depth
clamped per kind by `FRACTAL_LIMITS`, about 16k points at most) and `insertAutomaton({ mode, cols, rows, cell?, gap?,
color?, rule?, seed?, preset?, steps?, density?, wrap? })` (`elementary` = Wolfram rule 0-255, one row per generation;
`life` = B3/S23 from random / glider / Gosper gun / pulsar, `steps` generations, wrapped edges; sides ≤ 200, steps ≤ 500).
Each inserts ONE `fabric.Path` at the view centre (origin center, sized × `creationScale`, `name` = the pattern), selects
it, `saveState()`, `addLayer(path, 'path')`; autosave follows `object:added`. Koch / Sierpinski / cells are filled,
the line fractals stroked. An empty result (all cells dead) or no canvas returns `null` and adds nothing.
**Depends on:** Canvas (`canvas`), Page (`boardMode`, `pageWidth`, `pageHeight` for `creationScale`), UndoRedo
(`saveState`), Layers (`addLayer`).

## 28. Macro: `createMacroSlice.ts`

**Purpose:** the Macro dock tab (added 2026-11-13): record shortcut commands and replay them. Spread before Animation.
**State:** `macroSteps` (command ids from `commands`), `macroRecording`, `macroPlaying`. Session only: not saved.
**Actions:** `startMacroRecording` (empties the steps), `stopMacroRecording`, `recordMacroStep(id)` (called by
`runCommand`; kept only while recording and not playing, unknown ids ignored), `addMacroStep(id)`,
`removeMacroStep(index)`, `clearMacro`, `playMacro(times = 1)` (1-`MACRO_MAX_TIMES` = 50 rounds; each step in order,
awaiting a returned promise; disabled steps (`enabled() === false`) are skipped, a throwing step is logged and
skipped; resolves to the number of steps that ran; a second call while playing returns 0).
**Limits:** commands with `macro: false` (file New / Open / Save) are never recorded, added or played. Playback
stops when `canvas` or `currentPageId` changes or `isPageSwitching` is on between steps. Toolbar button clicks (`onClick`) do not go through `runCommand`, so only shortcuts and the panel's Add
step list are recorded. Each step is its own undo step.
**Depends on:** Command (`commands`; `runCommand` calls `recordMacroStep`).

## 30. PageLayers: `createPageLayersSlice.ts` (+ `lib/canvas/{docLayers,layerPlan,layerCompositor}.ts`)

**Purpose (2026-11-17):** real layers and folders that hold objects, per page (Photoshop / Clip Studio model). Not the
Layers slice (§4): that one lists objects, one row each, and is unchanged.
**State:** `pageLayers: DocLayer[]` (bottom-first mirror of `canvas.docLayers`), `activeLayerId` (new objects go there;
a folder = where new layers go).
**Actions:** `bindPageLayers(canvas)` (called once from Canvas `init`; returns the uninstaller), `setActiveLayer`,
`addPageLayer(kind)`, `updatePageLayer(id, patch)` (name / visible / locked / opacity / blend / clip / reference /
collapsed; `collapsed` alone is not an undo step), `removePageLayer` (deletes its objects, Undo toast),
`movePageLayer(id, parentId, index)`, `shiftPageLayer(id, ±1)`, `moveSelectionToLayer(id)` (to the top of that layer),
`mergeLayerDown(id)`, `flattenLayers()` (shown layers only).
**Model:** the canvas owns the list: `canvas.docLayers` is an accessor whose setter normalizes and mirrors to the store;
it is in `CUSTOM_PROPS`, so undo, page switches and autosave carry it (Fabric's canvas `toObject` picks canvas props;
`loadFromJSON` sets them back). `canvas:cleared` resets to one "Layer 1" (old documents load that way). Objects carry
`layerId` (in `CUSTOM_PROPS`): set at once on `object:added` when missing; an unknown id is re-checked a microtask
later (during a load, objects are added before Fabric sets the saved list). Selecting objects of one layer makes it
active. Merge / flatten bake layer opacity (multiplied) and blend (when the object has none) into the objects:
overlaps inside a see-through layer and clipping are not kept (a vector editor cannot bake them).
**Depends on:** Canvas (`canvas`), UndoRedo (`saveState`, `undo`), Layers (`syncLayers`), Dialog (`showToast`).
**Used by:** `organisms/layer/PageLayersSection` (Layers tab), PaintTools bucket (`referenceFilter`, region fill).

## 31. Document: `createDocumentSlice.ts` (+ `lib/document/pageSetup.ts`, `lib/canvas/canvasProp.ts`)

**Purpose (2026-11-17, InDesign style):** page setup (margins inside / outside, columns, gutter, bleed, slug, facing
pages, guides (default on), crop marks), master pages, page number fields. Bleed / slug frames and crop marks are
drawn around the page by `organisms/board/ui/PageFrame.tsx` (geometry `lib/document/printMarks.ts`), not by this slice.
**State:** `pageSetup`, `pageRole` ('page' | 'master'), `pageMasterId`: mirrors of the canvas-level props
`canvas.pageSetup` / `pageRole` / `masterId` (in `CUSTOM_PROPS`; `defineCanvasProp` accessors, reset on
`canvas:cleared`, set back by `loadFromJSON`). Other pages' values are read from their `canvasJSON`, so the Pages
slice is unchanged.
**Actions:** `bindDocument(canvas)`, `setPageSetup(patch, allPages?)` (all pages = writes every other page's
`canvasJSON.pageSetup` + `persist`), `setPageRole`, `applyMasterPage(id | null)`, `insertPageNumber()`,
`currentPageNumber()` (masters not counted), `pageUnderlay()` (the master's objects for the compositor: enlivened
once per master JSON + number, hidden master layers left out, layer order kept), `paintPageOverlay(ctx)` (guides).
**Depends on:** Canvas, Pages (`pages`, `currentPageId`), Page (`pageWidth`, `pageHeight`), UndoRedo (`saveState`),
Canvas `persist`. **Used by:** PageLayers (compositor `underlay` / `paintOverlay`), Comic (content box), Pages panel.

## 32. Comic: `createComicSlice.ts` (+ `lib/comic/{panelLayouts,mangaEffects,screentone}.ts`)

**Purpose (2026-11-17, Clip Studio style):** panel layouts, panel split, screentones, effect lines (focus, speed,
burst). Balloons are catalog text shapes (`hooks/shape/comicBalloons.ts`, category `balloons`).
**State:** `comicStyle` { `gutter`, `border`, `panelsLocked` (default true: frames selectable but not moved, scaled or
turned, hit only on their border line so a click inside reaches the scene under it) }.
**Actions:** `setComicStyle`, `bindComic(canvas)` (a frame's `object:modified` / `object:removed` moves / deletes its
area twin; ignored while restoring or switching pages), `addPanelLayout(presetId)` (replaces the page's panels;
makes the folder "Comic panels" with "Panel borders" (frames), "Art" (clip to layer below, made active) and
"Panel area" (locked white twins = the clip base)), `splitComicPanel(dir)`, `applyTone(params)` / `removeTone()`
(Fabric `Pattern` fill from a tone tile; `toneParams`, `fillBeforeTone` saved), `addMangaEffect(kind)` (a filled
`Path` in the selected frame's box, put on the Art layer, else in the page margins), `fitToPanel(mode, panel?)` /
`zoomInPanel(factor)`. **Content in a panel (2026-11-27):** fitting binds the object to that panel (`panelId`) and cuts
it to that panel only (`clipPath` = the panel outline in its own plane, intersected with a scene's or character's own
frame; `lib/comic/panelClip.ts`, `store/comicClip.ts`): the Art layer cuts to all panels together, so a filled scene
showed in its neighbours. The listeners (`store/comicBind.ts`) redo the cut while it is dragged, scaled or turned,
move it into the panel its centre is dropped in, follow an unlocked panel that moves, release it when its panel is
deleted (or a new layout replaces the panels), and lock frames as they are added (layout, split, loaded page).
**Depends on:** PageLayers (`docLayers`, `setActiveLayer`), Document (`currentPageNumber`, `pageSetup`), Page size,
UndoRedo.

## 33. Notes: `createNotesSlice.ts` (+ `lib/notes/{pageNotes,noteTargets}.ts`, `organisms/notes/`)

**Purpose (2026-11-17):** numbered note pins on a page, at a point or linked to an object (its `shapeId`, the id
connectors use: copies get a new one, node edits carry it), with a colour tag, open / resolved, pinned, a checklist
and replies. Pins and the pop-over are DOM (`NotePins`), never drawn on the canvas, so never exported.
**State:** `pageNotes` (mirror of the canvas-level prop `canvas.pageNotes`, in `CUSTOM_PROPS`; `defineCanvasProp`,
reset on `canvas:cleared`, set back by `loadFromJSON`, checked by `normalizePageNotes`: bad fields repaired, at most
500 notes / 5000 characters), `activeNoteId` (open pop-over), `notesVisible`, `noteFilter` { `query`, `status`
('open' default | 'resolved' | 'all'), `colors` }, `notesScope` ('page' | 'all').
**Actions:** `bindNotes(canvas)`, `addNote(at, target?)` (opens it; not a history step until it has content),
`updateNote(id, patch, { record? })` (text, color, status, pinned, x / y of a dragged free pin; `record: false` =
typing, written at once), `saveNoteEdits(id)` (records a note's unrecorded typing as one step: field left / note
closed), `deleteNote` (flushes pending history, then the delete is one step at once + Undo toast; an empty note never
recorded goes with no step and no toast), `discardNoteIfEmpty` (an empty note is dropped when it closes; no step if
it was never recorded), `addNoteCheckItem` / `toggleNoteCheckItem` /
`removeNoteCheckItem`, `addNoteReply` / `removeNoteReply`, `linkNoteToSelection`, `unlinkNote`, `selectNoteObject`
(Select tool + selects the object, or the top-level group that holds it), `focusNote(id, pageId?)` (switch page,
`centerViewOn` the pin, open it), `setActiveNote`, `setNotesVisible`, `setNoteFilter`, `setNotesScope`.
**History:** undo snapshots hold `pageNotes`, so every note change calls `saveState` (an unrecorded change would be
lost by the next undo). A closure set tracks notes not yet recorded (new, or typed): `addNote` and `deleteNote` flush
pending history first (`saveState(true)`) so each user action is its own step; loads (undo / redo, page switch, file)
drop empty notes, so an empty note that slipped into a snapshot never comes back as a ghost pin. `focusNote` closes
the open note before switching pages. A deleted linked object (or a group holding it) leaves its notes where it was (`object:removed`,
ignored while a page loads or a snapshot is restored); undoing the delete brings the link back.
**Note tool:** `activeTool === 'note'` (key N, `ToolBarConfig`; the Canvas slice sets crosshair / no picking;
pointer + Esc wiring in `slices/notes/noteTool.ts`): a click drops a note; on an object (topmost, helpers skipped) the note is linked. Esc → Select.
**Binding:** the slice binds itself to every new `canvas` (store subscription) and releases the old one; the Canvas
slice does not call it (it is at its size ceiling).
**Depends on:** Canvas (`canvas`, `activeTool`, `setActiveTool`), Pages (`pages`, `currentPageId`, `switchPage`,
`isPageSwitching`), UndoRedo (`saveState`, `undo`, `_isRestoring`), Page (`centerViewOn`), Dialog (`showToast`).
Other pages' notes are read from their `canvasJSON.pageNotes` (`collectNotes`); the Pages slice is unchanged.

## 35. Character: `createCharacterSlice.ts` (+ `src/character/`, `organisms/character/`, docs/CHARACTER_STUDIO.md)

**Purpose:** the Character Studio (phase 1, 2026-11-18): the character being edited, the studio camera, its own undo
history, the saved library and the autosaved draft, and placing / updating a character on the page. Spread before
Animation.
**State:** `characterStudioOpen`, `studioCharacter` (a `Character`, `src/character/schema/types.ts`), `studioCamera`
(`{ yaw, pitch, roll, shot }`), `studioSelectedPart`, `studioEditingPlaced`, `characterLibrary`,
`characterLibraryStatus` (`idle | loading | ready | error`), `studioPast` / `studioFuture` (30 snapshots).
**Actions:** `openCharacterStudio(start?)` (else the selected character on the page, else the draft, else the first
recipe), `closeCharacterStudio`, `editStudioCharacter(edit, historyKey?)` (pure merge in `character/studio/edit.ts`;
same key within 0.8 s = one step; a no-op edit is no step; a picked hair colour stops age greying it),
`loadStudioCharacter(c, opts?)` (`fromScene`: a scene actor, own history, no standalone draft write), `setStudioCamera`, `selectStudioPart`, `recolorStudioPart` (the part's material: skin, top,
bottom, shoes, hair), `mirrorStudioPose`, `studioUndo` / `studioRedo`, `surpriseStudioCharacter`,
`loadCharacterLibrary`, `saveStudioToLibrary`, `deleteFromLibrary`, `placeStudioCharacter`.
**Page contract:** a placed character is a Fabric group built from the rendered SVG (`character/board.ts`, drawn at
`PX_PER_CM` × creation scale, so a child is smaller than an adult) with `characterData = { character, camera }`
(CUSTOM_PROPS), so it saves with the page and survives undo. "Update on page" puts the new drawing into the SAME
group (`swapCharacterDrawing`: the fresh shapes take the group's transform first, so the centre, scale and turn stay)
under `pauseHistory`, fires `object:modified` (connectors reroute) and records one step (`saveState(true)`); the
object keeps its id, `animId`, pinned notes, connectors, locks and layer. A new placement is one step
through `object:added`.
**Persistence:** `characterStorage` (`@/lib/storage`, IndexedDB `fateboard-data`, keys `characterLibrary`,
`characterDraft`). Library saves are read-modify-write in storage (`upsert` / `remove`): a failed read rejects
before writing, and entries the app cannot read (a newer schema) are kept. The draft is written only after an edit
(1.5 s later, at once on close, and on `pagehide` when the tab closes: BUG-254); opening another character keeps the replaced one one undo step away and does
not touch the stored draft; an unreadable draft is reported and left alone. Failures are toasts, never throws
(also when the studio's lazy code cannot load).
**Clothes (phase 3):** `character.dress.top.kind` (11) and `.bottom.kind` (10) are ids into `data/garments.ts`
(`TOP_DEFS`, `BOTTOM_DEFS`: sleeve / leg length 0..2 along the limb, fit, hang, collar, folds, who it suits); the first three
of each keep their ids. `render/garments.ts` draws them.
**Hair (phase 3):** `character.hair` = `{ style, color, tip }` (schema v3; `tip` null = one colour, a hex = two-tone
tips on styles with length). 44 styles in `data/hairStyles.ts`; `hairPool(female, age)` says who a style suits (used by
the cast generator and Surprise me).
**Face (phase 2):** `character.emotion` (`{ id, intensity }`, one of 20) and `character.face.{gaze, blink, viseme}`
(schema v2; v1 characters migrate with a straight gaze, open eyes, resting mouth). `data/emotions.ts` `resolveFace` blends
the resting face (mouth style) toward the emotion by intensity, then applies the mouth shape and blink; `render/face.ts`
draws it. Edited with `editStudioCharacter({ emotion, face })`; slider drags (`gaze`, `blink`, `emotion-strength`) are one
undo step.
**Styles:** `character.style` picks a style pack (`character/render/styles.ts`, §7.3 of CHARACTER_STUDIO.md):
cartoon, anime, webtoon, manga, realistic. Shading, rim light and hair highlights are shapes (crescents from
`shapes.crescent`, cut from the outline as drawn so they never spill past it), gradients are SVG linear
gradients, manga screentone is an SVG pattern in the studio and the Comic tone fill (`toneParams`) on the page, so
a placed character looks as in the studio. Manga maps light colours to paper, middle ones to a 25 % tone and dark
ones to ink; skin is never ink (dark skin = a 45 % tone), and a shadow is 20 % denser than its part. The page tile
comes from the same `toneTile` / `tonePatternMatrix` as the Comic slice's `applyTone`. Switching style changes only
that field (undoable). Phase 9: 19 packs (`render/styles.ts` + `packsMore.ts`); a pack may set a `tint` (`tints.ts`: a
colour grade applied to every material and the eye colour before the scene's grade) and `proportion.limb`. In a scene,
`styleLock` (default on for a new scene) makes everyone share one style: adding an actor or editing a character sets
the scene's style; off = per-actor styles.
**Loading:** the renderer, the recipes and the Fabric builder are dynamic imports (first open / place / Surprise
me), so the editor's store chunk carries only the schema and the edit helpers.
**Depends on:** Canvas (`canvas`), UndoRedo (`saveState`, `pauseHistory`, `resumeHistory`), Page (`boardMode`,
`pageWidth`, `pageHeight` for `creationScaleOf`), Dialog (`showToast`), Scene (`sceneEditingActor`: a linked actor
is kept by the scene draft, not the character draft).

## 36. Scene: `createSceneSlice.ts` (+ `src/scene/`, `organisms/scene/`, docs/CHARACTER_STUDIO.md §9)

**Purpose (2026-11-18):** Scene mode of the Character Studio: up to 5 characters in a place (13 environments), one
light (time, weather, season), a perspective or flat camera with named views, a frame; placed on the page as one
group. All logic is pure in `src/scene` (`applySceneEdit`); the renderer, environments, views and the Fabric builder
load on first use (dynamic imports), so the store chunk holds only the schema. Spread after Character, before
Animation.
**State:** `studioMode` (`character | scene`), `studioScene` (a `Scene`, `src/scene/schema/types.ts`),
`sceneSelectedActor`, `sceneEditingActor` (the actor Character mode edits: every change to `studioCharacter` is
copied into it, no scene history step), `sceneEditingPlaced`, `scenePast` / `sceneFuture` (30 snapshots),
`sceneGuides` (`thirds | horizon | grid`, studio only).
**Actions:** `openSceneStudio(start?)` (else the selected scene on the page, else the scene being edited, else the
draft, else a new scene with the current character; opens the studio through `openCharacterStudio`),
`setStudioMode(mode)` (Character mode loads the selected actor, else the linked one, whenever the scene's copy
differs; with `loadStudioCharacter(c, { fromScene: true })`: its own history, the standalone draft saved first and
then left alone), `editStudioScene(edit, historyKey?)` (a `SceneEdit`; same key within 0.8 s = one step, a
`gesture:` key (one drag) = one step however slow; no-op = no step), `selectSceneActor`, `addSceneActor(character?)` (next cast member
not in the scene, at a free spot; a toast at 5), `sceneUndo` / `sceneRedo`, `toggleSceneGuide`, `placeStudioScene()`
(new group at the view centre, or the same group updated: one board undo step).
**Crowd:** `studioScene.set.crowd` (0–80, edited with a `set` patch, one undo step per drag) adds `sets/crowd.ts` extras
to the place; they are set pieces, cached with the place (the key includes `set`).
**Library:** `sceneLibrary` (parsed `Scene[]`; entries from a newer schema are not listed but stay in storage),
`sceneLibraryStatus`, `loadSceneLibrary()`, `saveStudioScene()` (tidy name; the same scene saved again updates its entry),
`deleteSavedScene(id)`; failures are toasts. `editStudioScene({ kind: 'load', scene })` opens a saved scene over the one
being edited (keeps its id). Storage: `sceneStorage` key `sceneLibrary` through the shared `createLibrary`.
**Templates:** `editStudioScene({ kind: 'template', id })` applies `scene/templates/apply.ts` (place, cast with poses,
formation, camera, aspect; the scene keeps its id and frame border); the first new character is selected and the old link
to Character mode is dropped. After an undo that removes the selected character, the first one is selected.
**Export:** `scene/export/layers.ts` (`sceneExportFiles`, pure) lists the files; the Frame tab zips them with `lib/zip.ts`
and downloads through `lib/export/downloadBlob.ts` (no store action: it changes nothing).
**Session:** closing the studio ends the link to an actor, the placed object being updated and Scene mode (the
scene stays in memory and in the draft), so opening another character later can never change a scene actor.
**Storage:** `sceneStorage` draft (`sceneDraft`, project database, name tidied by `cleanScene`), written 1.5 s after
an edit, at once when the studio closes and on `pagehide`. Renders cache the place and each actor (bounded LRU,
`render/memo.ts`): a drag re-renders only the dragged actor. Placed scenes live in the page (`sceneData`, CUSTOM_PROPS): a group of the frame's exact size (fixed
layout + a frame clip).
**Depends on:** Character (`characterStudioOpen`, `studioCharacter`, `openCharacterStudio`, `loadStudioCharacter`),
Canvas (`canvas`), UndoRedo (`saveState`, `pauseHistory`, `resumeHistory`), Page (`boardMode`, `pageWidth`,
`pageHeight` for `creationScaleOf`), Dialog (`showToast`).

## 37. Props: `createPropsSlice.ts` (+ `src/props/`, `organisms/props/`, docs/PROPS.md)

**Purpose (2026-11-26):** Scene Objects, the manga props library: place a prop from the left rail by click (view
centre) or drag and drop (drop point). The prop code (`@/props/board`, the catalogue) loads on first use. Spread after
Scene, before Animation.
**State:** `propFavorites` (starred prop ids), `propRecent` (last 12 added, newest first); both read at start and
saved on change through `uiPrefsStorage` section `props` (per browser, ids validated as kebab-case; the panel skips
ids the catalogue no longer has). The panel keeps its category and search locally.
**Phase 6 (my own props):** `propUserLibrary`, `propUserLibraryStatus`, `loadPropLibrary`, `importPropFile(file)`,
`removeUserProp(id)`, `propPackJson()`, `importPropPack(text)` (in `slices/props/propLibrary.ts`; storage
`propStorage`, key `propLibrary`); `addProp` also places `user-…` ids.
**Phase 4:** `applyPropScene(id)` / `setPropTimeOfDay(light)` (in `slices/props/propActions.ts`, one undo step each;
Depends on PageLayers `addPageLayer`, `updatePageLayer`, `setActiveLayer`), `propGroundSnap`, `propGroundLine`,
`setPropGroundSnap`, `setPropGroundLine` (saved with the favourites); page helpers in `slices/props/propPage.ts`.
**Actions:** `updateSelectedProp(patch)` (colours / outline / tone / variant of the selected prop, rebuilt in the
same object, one undo step via `pauseHistory` / `resumeHistory` / `saveState(true)`), `randomizeSelectedProp()`,
`togglePropFavorite(id)`, `notePropUsed(id)` (front of the recent list; `addProp` calls it on success),
`addProp(propId, { at? })` (builds the group, scales it with `creationScaleOf`, adds and selects it;
`false` without a canvas, for an unknown prop, or when the board changed while loading; failure = toast),
`bindProps(canvas)` (cancels `dragover` and handles `drop` for `PROP_DRAG_TYPE` only, ignored while
`isPageSwitching` / `_isRestoring`; returns the disposer). The slice subscribes to the store and binds each new
canvas itself, disposing the old binding.
**Reads:** `canvas`, `boardMode`, `pageWidth`, `pageHeight`, `isPageSwitching`, `_isRestoring`, `showToast`,
`saveState`, `pauseHistory`, `resumeHistory`.
**Persistence:** none of its own; `propData` on the object (CUSTOM_PROPS) saves with the page.

## 38. Scene props: `createScenePropsSlice.ts` (+ `scene/render/renderProps.ts`, docs/PROPS.md §9)

**Purpose (2026-11-26):** Scene Objects props standing in a Scene Studio scene (docs/LIBRARY.md L1). The props
live in `studioScene.props` (Scene schema v2) and change only through `editStudioScene` (`addProp`, `removeProp`,
`moveProp`, `updateProp`), so undo, draft, save and "Update on page" cover them. Spread after Props, before
Animation.
**State:** `sceneSelectedProp` (a prop id; it counts only while `sceneSelectedActor` is null, and an id no longer in
the scene after an undo or a template matches nothing).
**Actions:** `selectSceneProp(id)` (an id also clears `sceneSelectedActor`), `addSceneProp(propId, at?)` (async: loads
the catalogue, `sceneSize` and the projection; refuses unknown and non-scene-ready props; spot = `at`, else the
ground under the frame at 72 % height, else the stage; moved aside from props within 40 cm; real height; selected;
`false` without a scene or on error), `duplicateSceneProp(id)` (60 cm to the right, selected).
**Reads:** `studioScene`, `sceneSelectedActor`, `editStudioScene`. **Persistence:** none (the scene's).

## 39. Fight: `createFightSlice.ts` (+ `src/scene/combat/`, `animation/clips.ts`, docs/COMBAT_PACK.md)

Purpose: the user's saved fight combos and placing a combo on the page as a fight clip. Added 2026-11-27, before
`createAnimationSlice`.

| Key | Type | Notes |
|---|---|---|
| `fightCombos` | `FightCombo[]` | saved combos (parsed with `parseCombo`; unreadable entries stay in storage) |
| `fightComboStatus` | `'idle' \| 'loading' \| 'ready' \| 'error'` | library load state |
| `loadFightCombos()` | action | reads `comboStorage` (`@/lib/storage`, key `fightCombos`) |
| `saveFightCombo(combo)` | action → `Promise<boolean>` | upsert by id, toast |
| `deleteFightCombo(id)` | action → `Promise<boolean>` | the UI asks first (`confirmDialog`, danger) |
| `placeFightClip(comboId)` | action → `Promise<boolean>` | bakes the combo for the Scene Studio's two fighters (`studioScene.fight`'s pair, else the first two), builds the clip group (`scene/board.ts` `buildFightClipObject`, `fightClip` in CUSTOM_PROPS), adds it at the view centre at the page's creation scale, starts it at `currentTime` and stretches `animDuration` to fit. The clip carries its recipe and is saved as a poster (BUG-283) |
| `registerFightClipEvents(canvas)` / `unregisterFightClipEvents(canvas)` | actions | called by the Canvas slice's `registerCanvasEvents` / `unregisterCanvasEvents`: on `object:added`, a clip with a recipe gets its drawings back (`restoreFightClipFrames`, cached per recipe), then the frame for `currentTime` (`applyClipsAt`) and one render. No history step (the saved poster is the same) |

Cross-slice: reads `canvas`, `studioScene`, `currentTime`, `animDuration`, `showToast`, `pageWidth` / `boardMode`
(creation scale); calls `setAnimDuration`. Registered by the Canvas slice (`registerFightClipEvents`). Scene code loads with a dynamic `import()` (BUG-048 rule). Playback:
`createAnimationSlice` and `exportRun` apply the timeline through `applyTimelineAt` (tracks, then clip frames).

## 34. Timeline: `createTimelineSlice.ts` (+ `src/animation/overlay/`, `organisms/animation/TimelineDock.tsx`)

**Purpose:** the animation timeline as a dock under the board (owner request 2026-11-17: "like other animation
tools"; it was the right-dock Animate tab) and its board overlays: onion skin and motion path. View state only;
the animation itself stays in the Animation slice and the page. Spread before Animation.
**State:** `timelineOpen`, `timelineHeight` (CSS px, 160 … 1200; the dock also never takes more than 70 % of the
window), `onionSkin` (`{ on, count 1…3 per side, step 1…30 frames, opacity 0.05…0.8 }`), `motionPath`.
**Actions:** `setTimelineOpen`, `toggleTimeline` (footer Timeline button, command `toggle-timeline` = ⌘⌥T /
Ctrl+Alt+T), `setTimelineHeight`, `setOnionSkin(patch)` (merged and clamped), `setMotionPath`,
`paintAnimationOverlay(ctx)`.
**Persistence:** per browser, `uiPrefsStorage` section `timeline` (`@/lib/storage`, localStorage key `fateboard-ui`),
one write 400 ms after changes settle (a resize drag is one write). Broken values fall back to the defaults.
**Overlay:** `paintAnimationOverlay` is called by the layer compositor's `paintOverlay` (PageLayers, after the page
guides): only on the editor's own canvas element, so never in an export, a thumbnail or a video frame; only while the
timeline is open. `src/animation/overlay/animationOverlay.ts` caches: ghosts (`ghosts.ts`) are rendered into small
scene-space bitmaps again only when the frame, the tracks, the settings, the objects or the zoom (about 20 %) change,
and not while playing or exporting; paths (`motionPath.ts`) only when the tracks, the fps or the objects change.
Showing another time uses `objectLook.ts` (capture → `showSample` → put back exactly, flips included, in a
`finally`; one pass per ghost; no events, `__animRest` untouched; objects in a selection and a text being typed in
get no ghost, BUG-250). Motion paths sample over the track's absolute `rest`, so they are right inside a
multi-selection too. A store subscription repaints the board when a view setting changes and frees the bitmaps when off.
**Depends on:** Canvas (`canvas`), Animation (`tracks`, `currentTime`, `animFps`, `animDuration`, `isPlaying`,
`exportState`). Closing the dock unmounts `AnimationPanel`, which pauses and turns auto-key off (BUG-181).

## 25. Animation: `createAnimationSlice.ts` (+ `src/animation/engine.ts`, `exportVideo.ts`)

**Purpose:** keyframe timeline (per-object tracks), presets (entrance/emphasis/exit, typewriter), easing/bezier
curves, auto-key, playback via `requestAnimationFrame`, its own undo history, video / GIF / PNG export (WebCodecs +
mp4-muxer fast path; MediaRecorder realtime fallback; GIF by the in-house encoder in `src/animation/gif/`, worker).
`exportVideo` keeps the state (progress, cancel, the playhead) and loads `src/animation/exportRun.ts` on the first
export (`runExport`: renders, downloads; GIF loads `gif/renderGif.ts` on demand). `ExportSettings` (re-exported here)
has `gif?: { loop, dither, transparent }` (type, defaults and the 30 s limit in `gif/gifSettings.ts`, no imports, so the
Export pane does not load the runner); `height: 0` keeps the board's proportions for a width-only size. A transparent
GIF leaves the board's background colour / image out of each frame (`makeCompositor`, put back in `finally`). The
encoder worker answers `ready` after `init`; a worker that cannot start (blocked script, load error) makes the export
encode on the page instead (`openSink`, a `console.warn`), never fail.
**State:** `animDuration`, `animFps`, `currentTime`, `isPlaying`, `loop`, `playbackRate`, `autoKey`, `snap`, `workIn`,
`workOut`, `tracks`, `selectedKeyframes`, `keyframeClipboard`, `past`, `future`, `exportState`.
**Actions:** `setAnimDuration`, `setAnimFps`, `setLoop`, `setPlaybackRate`, `setAutoKey`, `setSnap`, `setWorkArea`,
`play`, `pause`, `togglePlay`, `stop`, `previewRange` (plays one span once, ignores loop / work area: the preview
after adding a preset), `seek`, `stepFrames`, `beginEdit`, `animUndo`, `animRedo` (Q1 rename), `addKeyframe`,
`updateKeyframe`, `updateSelectedCurve`, `moveSelectedTo`, `nudgeSelected`, `deleteSelected`, `selectKeyframe`,
`selectAllKeyframes`, `copyKeyframes`, `pasteKeyframes`, `selectObject`, `toggleMute`, `applyPreset`, `clearTrack`,
`clearAllAnimations`, `bindAutoKey` (returns disposer), `exportVideo`, `cancelExport`, `getAnimationData`,
`loadAnimationData`, `registerAnimationEvents` / `unregisterAnimationEvents` (called by Canvas `register/
unregisterCanvasEvents`: an object edited while shown at rest updates its track's `rest` / `fullText`). (*collision;
module-level `rafId`, `exportCtl`, history coalescing vars)
A store subscription calls Canvas `persist` when `tracks`, `animDuration`, `animFps` or the work area change (tracks
are saved with their page, BUG-010). The engine marks an object shown animated with `__animRest` (runtime only) and
`serializeCanvas` writes those rest values, so no save holds mid-animation values (BUG-011).
**Depends on:** Canvas (`canvas`, `persist`).
Keyframe history (`past` / `future`) is kept per page (Q7). Undo / redo put an object back at rest when its track
disappears (BUG-180). Export renders the board's current view. `absoluteProps` (rest values inside a
multi-selection) lives in `src/animation/absoluteProps.ts`.
**Risks:** none open. The Animation panel's own ⌘Z / ⌘Y run `animUndo` / `animRedo` and
stop the event, so the canvas history does not run too. `src/components/organisms/effects/ui/Engine.tsx` is a
second, older animation engine (dead).

### Fill & shadow (createShapeStyleSlice + createCanvasSlice)

`applyGradientFill(gradient, { history? })` (percentage-unit linear / radial on the fill paint targets; syncs on-canvas handles while editing),
`setShadow(shadow | null, { history? })` (color + opacity → rgba, blur, offsets; `applyShadowPreset` / `removeShadow` now call it),
`setGradientEditing(on)` + `gradientEditing` (MultiStopGradientTool on/off, attaches to the selection),
`fillRevision` (canvas slice; bumped by the gradient tool's `onChange`, which also calls `saveState`). Types and pure read/write helpers: `src/lib/fillStyle.ts`.

### Zoom (page slice, design board)

`boardMode: 'design' | 'whiteboard' | null` + `setBoardMode` (set by CanvasBoard). In design mode `setZoom` / `zoomIn` / `zoomOut` / `fitToScreen` (and UI `zoomFit` / `actualSize`) only change `zoom`; CanvasBoard draws the page at `scale` (fit, published by CanvasBoard) × `zoom`. Visible % = `scale × zoom`.

### Color theme (settings slice)

`settings.colorTheme` (`COLOR_THEMES` ids, default `'fate'`), `setColorTheme`, `applyColorTheme` (→ `data-theme` on `<html>`; applied on commit, hydrate and `initTheme`).

### Transform panel + anchor (createTransformSlice, createCanvasSlice)

`transform` (x y width height rotation flipX flipY originX originY id rx ry) mirrors the active object or multi-selection. Synced by `handleSelectionChange`, `handleTransformSync` (object:moving / scaling / rotating / skewing / resizing / modified) and cleared on `selection:cleared`. Anchor rule: X/Y = anchor position; X/Y edits move the anchor; rotation and W/H keep the anchor fixed; flips reflect across the anchor (the anchor keeps its canvas spot and the selection moves to the mirrored point, so flipping again restores). Guarded by `src/store/__tests__/anchorTransforms.test.ts` and `transformSync.test.ts`.
