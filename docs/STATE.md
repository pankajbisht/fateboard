# State (zustand store)

One store: `useStore` in `src/store/index.ts`, created with `create(devtools(combinedSlice))`. Devtools are enabled
only when `NODE_ENV === 'development'`. `combinedSlice(set, get, store)` **object-spreads 25 slice creators**
(24 distinct, because `createPageSlice` appears twice). **If two slices define the same key, the one spread later
silently wins.** 14 keys collide today (`undo`, `redo`, `clipboard` fixed 2026-11-07, Q1). That is the root cause of several bugs (see [Key collisions](#key-collisions)).

Typing: slices mostly use `SliceCreator<T> = StateCreator<any, [], [], T>` (`src/store/types.ts`) or untyped
`(set, get, store)`. `RootState = ReturnType<typeof useStore.getState>` is effectively `any`. Cross-slice calls are
`get().someAction?.()`, with no compile-time checks.

Spread order (it matters):

```
1 Canvas  2 Brush  3 UI  4 Layers  5 Page  6 Pages  7 Background  8 Command  9 ShapeStyle  10 UndoRedo
11 Transform  12 Shape  13 Text  14 BackgroundColor  15 ContextMenu  16 Setting  17 advanceOperation
18 geometryEngine  19 NodeEditor  20 Filter  21 Page (again)  22 Template  23 Notebook  24 Dialog  25 Animation
```

Persistence summary: only `settings` (opendb key `fateboard-settings`) and the live canvas JSON (opendb key
`drawJson`) are saved. Everything else in the store is lost on reload unless a slice saves it itself (custom shapes,
patterns and font templates use raw `localStorage`).

> Dependencies below come from a static scan of `get().x` usage, checked by hand for the core slices.
> "Risks" link to [BUGS.md](BUGS.md).

---

## Key collisions

**None** (BUG-002 fixed 2026-11-07). Each slice is spread once and every key has one owner, enforced by
`src/__tests__/storeKeys.test.ts` (reads the spread order from `src/store/index.ts`) and
`src/store/__tests__/storeComposition.test.ts`. What was resolved:

| Key(s) | Was | Now |
|---|---|---|
| `zoomIn`, `zoomOut` | UI → Page | Page only (UI copies were dead) |
| `setOrientation` | Page → Setting → Page (Page spread twice) | Page only; the second Page spread is gone |
| `setBackgroundStyle`, `toggleGrid` | Background → Setting / Notebook | Setting / Notebook only (Background copies were shadowed) |
| `setBackgroundColor` | BackgroundColor → Setting | Setting only |
| `setGridSize` | Setting → Notebook | Notebook only |
| `gridSize` | Background → Notebook | Notebook; background patterns use `patternSize` |
| `_isSyncing` | Transform → advanceOperation | Transform only |
| `color`, `fillColor` (+ `setColor`, `setFillColor`) | Brush → Text | Brush only (Text copies had no readers) |
| `strokeWidth` (+ `setStrokeWidth`) | ShapeStyle → Text | ShapeStyle only (`setStrokeWidth` moved there, store-only) |
| `shadowColor` | Brush → Text | Text keeps the shape shadow colour; brush → `brushShadowColor` |
| `opacity` | Brush → ShapeStyle → Filter | ShapeStyle (selection); brush → `brushOpacity`; Filter → `filterOpacity` |

---

## 1. Canvas: `createCanvasSlice.ts`

**Purpose:** owns the Fabric canvas instance and its lifecycle (create/init/dispose), the active tool, pan/wheel
handlers, selection → toolbar state, JSON import/export and debounced autosave to opendb `drawJson`.

**State:** `canvas`, `activeTool` (`'select'|'pan'|'draw'|'node'`), `isPanning`, `isDrawingMode`, `freeDrawingBrush`
(unused), `activePanel` (unused), `selectedObject` (**overloaded**: a Fabric object for textboxes, the string
`'shape'`, or `null`), `showTextToolbar`, `isEditingText`, `hasActiveShape`, `geditor` (MultiStopGradientTool),
`cw`/`ch` (container size, only set when `settings.freehand`), `selectedPreset` (CanvasPreset, default from
CanvasSizePanel).
Private closure state (not in zustand): `panCanvas`, `persistTimer`, `eventHandlers`, `persistLock` (counter that
blocks saves during load/clear), `unloadHandler`.

**Actions:** `create`, `mount`, `init(el, container)`, `dispose()` (nulls `canvas` synchronously, then awaits
`canvas.dispose()`), `registerCanvasEvents`, `unregisterCanvasEvents`, `setActiveTool`, `enablePan`, `disablePan`,
`setSelectedPreset`, `hasMultipleSelection`, `filterUnlockedSelection`, `setSelectedObject`, `syncFromObject`,
`setToolbar`, `clearToolbar`, `loadLib`, `defaultSettings`, `clearBoard` (New board = new project: one empty page, empty
animation, autosave deleted), `exportJSON`,
`importJSON(json, {persist})`, `restoreFromStorage` (loads the autosaved **project** through
`lib/storage/projectStorage` → Pages `importProject`; an old `drawJson` board → `importJSON`, adopted as Page 1), `saveBoard` (downloads `drawing.fateboard` = the whole project via Pages `exportProject`; falls back to the canvas JSON when pages are absent), `persist`,
`flushPersist` (`persist` saves the whole project from Pages `captureProject({ thumbnail: false })`; skipped while
`isPageSwitching` and before pages exist), `handlePersistEvent`, `handleSelectionChange`, `handleSelectionClear`, `handleMouseDown` (no-op),
`handleObjectChange`, `handleDBLClick`.

**Depends on:** Shape (`installShapeBehavior`, `editShapeText`, `closeShapeTextEditor`), UndoRedo (`saveState`,
`pause/resumeHistory`, `initHistory`, `registerHistoryEvents`), Page (`setPageFormat`), Pages (`initPages`,
`captureProject`, `importProject`, `isPageSwitching`, `pages`, `currentPageId`), Animation (`registerAnimationEvents`,
`loadAnimationData`), Setting (`settings`), Brush
(`setBrush`, `color`, `width`), ShapeStyle (`fill`, `clearGradientSession`, `fillMode`), Transform
(`updateFromFabric`). Also imports `updateMaster`, `MultiStopGradientTool`. Node tool: `setActiveTool('node')` turns Fabric
selection off (`selection=false`, `skipTargetFind=true`) and calls NodeEditor `enterNodeMode` when something is selected; it never changes objects.

**Risks:** BUG-003 (its `SERIALIZE_PROPS` lacks `id`, `name`, `animId`), BUG-006/034 (`saveState` on selection).
The draw tool asks the brush slice to rebuild the brush (`initBrush`); it never writes `freeDrawingBrush` (BUG-021).
(`defaultSettings` → `setPageFormat` changes VPT).

## 2. Brush: `createBrushSlice.ts` (+ `store/brushConfig.ts`)

**Purpose:** freehand drawing brushes. 14 brush types (`pencil, marker, ink, calligraphy, highlighter, neon, chalk,
crayon, pattern, spray, airbrush, splatter, circle, eraser`) on several engines, a whole-stroke eraser, symmetry,
straight-line mode, and stroke styling applied in `before:path:created`.

**State (spread from `DEFAULT_BRUSH_STATE`):** `brush, width, color, brushOpacity, smoothing, lineCap, lineJoin, lineStyle,
blend, taper, nibAngle, shadowBlur, shadowOffsetX/Y, brushShadowColor, shadowOpacity, shadowMatchColor, fillEnabled,
fillColor, fillOpacity, straightLine, symmetry, symmetryCenter, eraserMode, recentColors, cursor`.

**Actions:** `initBrush`, `refreshBrushCursor`, `setBrush`, `updateBrush(patch)`, `setBrushWidth`, `setBrushColor`,
`setSymmetry`, `recenterSymmetry`, `commitRecentColor`, `resetBrush`.

**Depends on:** Canvas (`canvas`). Installs canvas hooks once (flag `__fbBrushHooks`).

**Owner of `canvas.freeDrawingBrush`** (the only writer, BUG-021: the Editor effect and the draw tool used to overwrite
its colour / width). (Shared keys fixed: brush opacity / shadow colour are
`brushOpacity` / `brushShadowColor`, BUG-019/020.) There is an existing (possibly stale) test: `src/__tests__/store/brushSlice.test.ts`.

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
`selectLinked`, `syncLinkedClones`, `hasLinkedSelection`, `canLinkSelection`, `alignObjects(key, to)`,
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
**Risks:** BUG-003 (layers clone list), BUG-024
(locks undone by tool switch). `stageRect` ignores pan offset (align-to-canvas is wrong when panned).

## 5. Page (page geometry state + the one zoom path): `createPageSlice.ts`

**Purpose:** page format/orientation/custom size/background, fit scale and zoom of the **current** page.
**State:** `pageFormat` (`'Freehand'` default; type `PageFormat` only allows `'Freehand'`), `orientation`,
`customSize`, `pageBackground`, `zoom`, `scale`, `pageWidth`, `pageHeight`.
**Actions:** `setPageFormat`, `setOrientation`, `setCustomPageSize`, `setPageBackground`, `setZoom(z, point?)`,
`zoomIn`, `zoomOut`, `fitToScreen`, `zoomToRect(rect, padding?)` (whiteboard), `applyPageSize` (design: state only, zoom 1
+ `pageWidth/Height` from `selectedPreset`; whiteboard: viewport back to 1:1). Exports: `resolvePageSize`, `isFreehand`, `MIN/MAX_ZOOM`,
`MIN/MAX_PAGE_PX`, `DEFAULT_PAGE_BACKGROUND`.
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
**Depends on:** Canvas (`canvas`, `persist`), Page (`pageFormat`, `orientation`, `customSize`, `pageBackground`,
`applyPageSize`, `pageWidth`), Animation (`getAnimationData`, `loadAnimationData`, `pause`).
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
**Actions:** `runCommand(id)`, `loadCommands()` (the registry is imported lazily to avoid a store ⇄ slice import cycle,
BUG-048, so `commands` is `[]` for one tick after the store is created).
**Depends on:** whatever each command's handler calls (Layers, Canvas, Page, UI, and `undo/redo`, which resolve to
Animation, BUG-001).

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
**Actions:** `saveState(immediate?)` (150 ms debounce, dedupes identical JSON), `undo` / `redo` (queued: fast presses
all apply), `clearHistory`, `initHistory`, `pauseHistory`, `resumeHistory`, `registerHistoryEvents` (called by the
Canvas slice's `registerCanvasEvents`: object added / removed / modified, text editing exited; helpers ignored),
`unregisterHistoryEvents`.
**Undo / redo first end an editing session:** node editing is cancelled (that is the undo of its unsaved changes),
the shape text editor is committed, canvas text typing is finished (one step).
**Page switch:** a pending change is flushed into the old page; changes made while a page loads are not recorded; a
page seen for the first time gets a base snapshot once loaded; a page with history re-bases its top on the page
as loaded (so the next undo is a real one).
**Depends on:** Canvas (`canvas`, `clearToolbar`, `persist`), Pages (`currentPageId`, `isPageSwitching`, `pages`),
NodeEditor (`nodeEditor`, `cancelNodeMode`), Shape (`closeShapeTextEditor`); optional `rebuildLinks` (does not exist).
**Risks:** BUG-027. Full-JSON snapshots (images stored as `src`) cost memory on large boards.

## 11. Transform: `createTransformSlice.ts`

**Purpose:** X/Y/W/H/rotation/flip/radius inputs ↔ the active object.
**State:** `transform` (`x,y,width,height,rotation,flipX,flipY,originX,originY,id,rx,ry`), `hasSelection`,
`_isSyncing`.
**Actions:** `updateFromFabric(obj)`, `updateFabricFromStore`, `setTransform(key, value)`, `flipX`, `flipY`,
`setOrigin`, `setRadius`, `syncTransformFromSelection`.
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

**Purpose:** user preferences, validated by `sanitizeSettings`, persisted to opendb `fateboard-settings`, theme
application.
**State:** `settings: { mode, iconSize, backgroundStyle, backgroundColor, gridSize, snapToGrid, showRulers, unit,
orientation ('LANDSCAPE'|'PORTRAIT'), freehand: boolean, format, lastPageFormat, customSize (mm) }`.
**Actions:** `load` (unused; `RootLayout` calls `hydrate` instead), `hydrate`, `initTheme` (unused), `setMode`,
`setIconSize`, `setBackgroundStyle`*, `setBackgroundColor`*, (`setGridSize` removed: Notebook owns it), `setSnapToGrid`,
`setShowRulers`, `setUnit`, `setFreehand`, `toggleFreehand`, `setFormat`, (`setOrientation` removed: Page owns it),
`setCustomSize`, `resetSettings`, `updateSetting`, `applyTheme`, `opendbSave`. (*collision)
Pure helpers worth unit testing: `sanitizeSettings`, `getCanvasSize`, `clampDimension`, `clampGridSize`, `isHexColor`.
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
**Risks:** BUG-062 (capture-phase keydown while a modal is open). Commit fires `object:modified` (autosave) and
`setActiveObject` (selection → history snapshot); ⌘Z during an edit cancels it (UndoRedo).

## 20. Filter: `createFilterSlice.ts` (+ `organisms/filter/ui/filterEngine.ts`, `useImageFilters.ts`)

**State:** `brightness, contrast, saturation, blur, noise, pixelate, hue, gamma, grayscale, sepia, invert, filterOpacity`
(shared). **Actions:** `setFilter(key, value)`, `resetFilters`. **Risks:** BUG-019. No mounted UI uses this slice:
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
**State:** `gridEnabled` (false), `gridSize` (20), `snapEnabled` (false), `snapToObjects` (true, applies once snap is on), `snapThreshold`.
Grid and snap start off (2026-11-07, see DECISIONS). This is the only grid renderer in both modes (the whiteboard CSS
dot grid was removed, BUG-107).
**Actions:** `setGridEnabled`, `toggleGrid`, `setGridSize`, `setSnapEnabled`, `toggleSnap`, `setSnapToObjects`,
`toggleSnapToObjects`, `setSnapThreshold`, `drawGrid`.
**Risks:** relies on a private Fabric method (`_renderBackground`), so it may break on a Fabric upgrade. `settings.snapToGrid`/`settings.gridSize` are
separate, unconnected values.

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

## 25. Animation: `createAnimationSlice.ts` (+ `src/animation/engine.ts`, `exportVideo.ts`)

**Purpose:** keyframe timeline (per-object tracks), presets (entrance/emphasis/exit, typewriter), easing/bezier
curves, auto-key, playback via `requestAnimationFrame`, its own undo history, video/PNG export (WebCodecs+mp4-muxer
fast path; MediaRecorder realtime fallback).
**State:** `animDuration`, `animFps`, `currentTime`, `isPlaying`, `loop`, `playbackRate`, `autoKey`, `snap`, `workIn`,
`workOut`, `tracks`, `selectedKeyframes`, `keyframeClipboard`, `past`, `future`, `exportState`.
**Actions:** `setAnimDuration`, `setAnimFps`, `setLoop`, `setPlaybackRate`, `setAutoKey`, `setSnap`, `setWorkArea`,
`play`, `pause`, `togglePlay`, `stop`, `seek`, `stepFrames`, `beginEdit`, `animUndo`, `animRedo` (Q1 rename), `addKeyframe`,
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
**Risks:** BUG-018, BUG-026, BUG-140, BUG-141, BUG-142. The Animation panel's own ⌘Z / ⌘Y run `animUndo` / `animRedo` and
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
