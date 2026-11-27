# Canvas (Fabric.js) lifecycle

> Installed: **fabric 7.1.0**. Code comments say "v6" throughout. v7 breaking changes that matter here:
> default `originX/originY` is now **center/center**; `stopContextMenu`/`fireRightClick`/`fireMiddleClick` are
> deprecated and their defaults changed; text positioning changed. Source: `node_modules/fabric/CHANGELOG.md`
> (7.0.0). Always pass `originX/originY` explicitly when creating objects.

## Init

Mount path: `pages/Editor/Editor.tsx` → `<CanvasBoard mode pageSize>` → `CanvasSurface` (keyed by mode).

`CanvasSurface` lifecycle effect (runs once per mount):

1. Creates `<canvas>` in code and appends it to `hostRef` (JSX canvas breaks React unmount, since Fabric re-parents it).
2. `useStore.getState().init(el, host)` (Canvas slice):
    1. Guard: returns if `el` is missing or a canvas already exists.
    2. `create(el, container)` → `new fabric.Canvas(el, { backgroundColor: fateboardCanvasConfig.bg, preserveObjectStacking: true, stopContextMenu: true })`; stores `cw/ch` from the container **only if `settings.freehand`**.
    3. `mount(canvas)` → `set({ canvas })`.
    4. `defaultSettings()` → `setPageFormat(settings.format, settings.orientation)` (page slice → `applyPageSize` → `setDimensions` + VPT + `drawBackground`) and `setBrush()`.
    5. `loadLib(canvas)` → `geditor = new MultiStopGradientTool(canvas, () => get().fill)`.
    6. `registerCanvasEvents(canvas)` (see Events) + `installShapeBehavior(canvas)`.
    7. Adds `beforeunload`/`pagehide` → `flushPersist`.
    8. Async `restoreFromStorage()` (takes `persistLock`, reads the project from IndexedDB via `projectStorage.load()` → `importProject(project)`; an old opendb `drawJson` board → `importJSON(saved, {persist:false})`), then `initPages()`.
3. Back in `CanvasSurface`: sets `stopContextMenu`, wires the `contextmenu` canvas event to `openMenu(...)`, adds
   `calcOffset` refreshers (pointerdown/enter, scroll, resize), then `initHistory()`. Content comes only from step 2.8
   (the autosaved project), so nothing races on the canvas (BUG-016 fixed).
4. Further effects:
    - **Whiteboard:** ResizeObserver → `setDimensions(host size)`; a CSS dot-grid overlay follows the VPT on
      `after:render`.
    - **Design:** default page `DEFAULT_CANVAS_PRESET` = Presentation 16:9 (1920 × 1080), white artboard with a soft
      shadow. `setDimensions(preset, {backstoreOnly:true})` and `setDimensions(fitSize, {cssOnly:true})`, so the
      document stays at true pixels and only CSS is scaled. Rulers + artboard are DOM.
    - Floating text toolbar position recomputed on `after:render`.
5. Other slices/panels attach on their own: Notebook (via `store.subscribe` on `canvas` change), LayersPanel →
   `bindLayerEvents`, AnimationPanel → `bindAutoKey` (leaving the tab pauses playback and turns auto-key off, BUG-181), PagePanel → `initPages` + autosave listener, Brush hooks.

## Dispose

`CanvasSurface` cleanup: remove listeners,
`dispose()`:
`closeShapeTextEditor(true)` → `flushPersist()` → detach pan + unload handlers → `unregisterCanvasEvents` →
**`set({ canvas: null, geditor: null, … })` synchronously** → `await canvas.dispose()`. Because the null happens
before the await, a new surface can `init()` immediately.

Not unregistered on dispose (relies on the canvas being garbage collected): shape behaviour, notebook (detached via
subscribe), brush hooks, layer events (LayersPanel unmount), history events (never registered).

## Events

Registered by `createCanvasSlice.registerCanvasEvents`:

| Fabric event                                                     | Handler                 | Effect                                                                                                                           |
| ---------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `selection:created`, `selection:updated`                         | `handleSelectionChange` | skip connector handles; `filterUnlockedSelection`; `hasActiveShape`; `fillMode`; `setToolbar`; `updateFromFabric`; `saveState()` |
| `selection:cleared`                                              | `handleSelectionClear`  | reset toolbar/fillMode, `clearGradientSession`                                                                                   |
| `mouse:down`                                                     | `handleMouseDown`       | no-op                                                                                                                            |
| `mouse:dblclick`                                                 | `handleDBLClick`        | `editShapeText` for text shapes                                                                                                  |
| `object:modified`                                                | `handleObjectChange`    | `updateMaster` (linked clones) + `persist()`                                                                                     |
| `object:added`, `object:removed`, `path:created`, `text:changed` | `handlePersistEvent`    | `persist()` unless helper (`excludeFromExport`) or node handle                                                                   |
| `object:scaling`, `before:render`                                | `handleSizeEvents` (`lib/canvas/handleSize`) | scaling floor of `MIN_OBJECT_CSS` screen px per axis (24 mouse / 40 touch; a thinner axis can't shrink further), anchor kept, no flip past the anchor (`lockScalingFlip` default via `applyFabricChrome`, not serialized), then `handleTransformSync`; active object's corners sized in CSS px (`CORNER_CSS` 8 / 12, touch hit 44 stays invisible) via `canvasPxPerCss`, since the design page is CSS-scaled and Fabric sizes corners in canvas px |

Other listeners (by owner): Pan (`mouse:wheel/down/move/up`, only while `activeTool==='pan'`); Shape
(`object:added` rehydrate, `object:scaling`, `object:modified`, `selection:cleared/updated` bake text shapes +
connector behaviour + shape text toolbar); Layers (`object:added/removed/modified`, `selection:*`, `after:render` lock
badges); Notebook (`object:moving/scaling` run first, `mouse:down/up`, `selection:cleared`, `after:render` guides;
patches `_renderBackground` for the grid); Animation (`selection:created/updated`, `object:modified` for auto-key);
PagePanel (`object:added/removed/modified`, `path:created` → 500 ms `saveCurrentPage`); CanvasBoard (`contextmenu`,
`after:render` grid/toolbar, text float or node float); NodeEditor (`mouse:dblclick` for the canvas' lifetime: Select →
node editing; while the Node tool is active `mouse:down/move` + window `keydown` Escape; while editing, the
`PathNodeEditor` own `mouse:down/move/up/dblclick`, `after:render` overlay and capture-phase `keydown`).

Rule for new code: register in one place, keep the returned disposer (Fabric 6+ `canvas.on` returns an off
function), and unregister on dispose.

## Object serialization

Fabric drops custom properties unless they are passed to `toObject(props)`. There is **one** list, `CUSTOM_PROPS`, and
one writer, `serializeCanvas(canvas)` (`lib/serialization.ts`, BUG-003). It is used by undo snapshots, autosave (the
project), page capture, `exportJSON` / `saveBoard`, the mode-switch snapshot and Export → JSON; Layers copy / paste /
duplicate clone with `CUSTOM_PROPS` too. `src/__tests__/oneSerializeList.test.ts` fails on any other canvas-level
`toObject` / `toJSON`. Only exception: Share (`ExtraBar`, `canvas.toJSON()`, BUG-028 waits on Q6).
`CUSTOM_PROPS` also holds one **canvas-level** prop, `docLayers` (the page's layers, 2026-11-17): Fabric's canvas
`toObject(props)` picks listed canvas props and `loadFromJSON` sets them back (`this.set(serialized)`), so the layer
list travels with every snapshot, page and save. Objects carry `layerId`.

`serializeCanvas` writes two kinds of objects with values other than their live ones (swapped in, serialized, swapped
back):

| Object state                                                                | Written with                                                                        | Why                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| text box in typing mode                                                     | its `_savedProps` (selectable, movement locks…)                                     | Fabric locks a text box while editing      |
| shown mid-animation (`__animRest`, set by `animation/engine.applyTracksAt`) | the rest values of the props its track animates, and the full text for a typewriter | saves never hold animated values (BUG-011) |

Custom props in use: `id`, `name` (layers), `_locked` (lock), `customId`, `customType` (`'shape'`,
`'connector-handle'`…), `shapeId`, `isTextShape`, `textInset` (text-in-shape), `connectorData` (connectors), `animId`
(animation), `isFreehand` (brush), `layerBlur` (layer blur radius, BUG-220), `excludeFromExport`/`excludeFromLayers`/`excludeFromSnap`/`isHelper`/`_isHelper`
(helpers), `linkId` (linked clones, saved), `__thumbRev`, `__text`, `__box`, `__group` (runtime-only refs). The old
`__master` / `__instances` clone refs are gone (2026-11-07): links are the saved `linkId`.

**Classes of our own (2026-11-16):** `StampStroke` (`lib/brushes/stamp/StampStroke.ts`, registered with Fabric's
`classRegistry`) serializes its own data (`stampPoints`, `stampParams`, `stampColor`, `stampSize`, `stampSeed`,
`brushId`) in its `toObject`, like a Path's `path`: it is the object's geometry, not a feature prop, so it also
survives `clone()` (copy / paste, symmetry copies). Its SVG export is an embedded PNG at 2 ×.

**Fabric patches (installed once from `RootLayout`, before any canvas draws):** `installLayerBlur()` wraps
`FabricObject.prototype.render` in `ctx.filter = blur(px)` (radius × the context's device scale × the object's scale;
a JS box blur where `ctx.filter` is missing) and `_createBaseSVGMarkup` in an `feGaussianBlur` filter;
`installCrispCache()` (`lib/canvas/crispCache.ts`) makes `shouldCache()` false for an object whose cache would pass
Fabric's `maxCacheSideLimit` / `perfLimitSizeTotal` (it would be stretched, so it draws as vectors instead), unless it
`needsItsOwnCache()`.

Runtime-only refs (`__*`, including `__animRest`) are never serialized and must be rebuilt after every load (`rehydrateTextShape` does this for text shapes; linked clones have no
rebuild).

Loading: always `await canvas.loadFromJSON(json)` (Promise in v6+; the 2nd arg is a per-object **reviver**, not a
completion callback). Only the canvas, pages and undo slices call it; other code uses the `importJSON` action
(`src/__tests__/oneLoader.test.ts`, BUG-014 / 101 / 016). Wrap loads with `persistLock` (`importJSON` does) and
`pauseHistory/resumeHistory`.

## History / snapshots

`createUndoRedoSlice` keeps `undoStack: string[]` (JSON). Invariant: the last item is the current state.
**Every recorded change is autosaved (BUG-243, 2026-11-17):** `saveState()` also calls `persist()` (debounced, merges
with the object-event saves), because many document changes fire no canvas event (style actions, layer settings, page
setup). `initHistory` (a board's base snapshot) does not autosave; undo / redo persist after the restore.

- Snapshots: `serializeCanvas(canvas, CUSTOM_PROPS)` (`lib/serialization.ts`), the same serializer as autosave, board
  save, page capture and the mode-switch snapshot. It keeps every custom prop, writes a text box being typed in with
  its real (unlocked) props, and drops the canvas-level `backgroundColor` duplicate, so serialize → load → serialize
  is identical (otherwise every undo after a restore recorded a phantom step and wiped redo).
- What records a step: `registerHistoryEvents` (object added / removed / modified, text editing exited), wired by
  `registerCanvasEvents`; store actions calling `saveState()`; selection changes (dedupe skips no-ops).
  Helpers (`excludeFromExport`, `_isHelper`) and anything during a restore or a page load are ignored.
- `saveState(immediate?)` debounces 150 ms → `commit()`: skip if no canvas, restoring, paused or loading a page;
  stringify; skip if equal to top; push; clear redo; cap at `MAX_HISTORY + 1` (21).
- `undo()` / `redo()` are queued (fast ⌘Z ⌘Z ⌘Z all apply). Each first ends an editing session (node editing is
  cancelled, shape text committed, canvas text typing finished), then `undo` flushes a pending change, moves the top
  to redo and restores the previous snapshot; `redo` does the reverse.
- `restore(json)`: `_isRestoring = true`, `await loadFromJSON`, discard selection, `clearToolbar`, `persist()`.
  When the load fails the canvas is unchanged, so the stacks go back too (BUG-154).
- **Photos are stored once (BUG-155):** a snapshot is written with `snapshotAssets.stringify`, which replaces
  every `data:` URL of 2048 characters or more with a token, and read with `snapshotAssets.parse`. The pool lives
  in the undo slice's closure and is shared by every page. Never `JSON.parse` a snapshot string yourself.
- **New board** calls `initHistory()`, so the empty board is the base snapshot (BUG-156).
- **Per page (Q7):** see STATE.md §10. Undo can never load another page.
- Keyboard: ⌘Z / ⌘⇧Z (Ctrl on Windows) through the command registry; also from a number field with nothing
  half-typed (`data-history-passthrough`) and from canvas text typing (Fabric's `data-fabric="textarea"`), which
  are blurred / finished first. Top bar Undo / Redo buttons follow `canUndo` / `canRedo`.
- Animation keeps its own `past/future` (`animUndo` / `animRedo`, 100 entries, coalesced within 800 ms).

## Zoom / pan

One geometry owner per board (decision Q2, BUG-007 fixed 2026-11-07); `src/store/__tests__/geometryOwner.test.ts` and
`e2e/geometry.spec.ts` guard it.

| Board                     | Canvas size                                                                       | Viewport                                                                                              | Zoom                                                                                                                        | Pan                                                                              |
| ------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Design** (fixed page)   | `CanvasBoard` only: backstore = page px (`selectedPreset`), CSS size = fit × zoom | always identity                                                                                       | Page `setZoom` changes `zoom` state only; CanvasBoard redraws (footer, toolbar, Ctrl / ⌘ + wheel or pinch, UI `actualSize`) | the wheel scrolls the board natively (`[data-board-scroll]`); Hand tool drags it |
| **Whiteboard** (infinite) | `CanvasBoard` only: canvas = host size                                            | Page slice only: `setZoom(z, point)` (`zoomToPoint`), `zoomToRect(rect)`, `applyPageSize` (reset 1:1) | same actions; `zoom` always equals the viewport zoom (BUG-025); Ctrl / ⌘ + wheel or pinch zooms at the pointer              | wheel / trackpad `relativePan` (Shift + wheel sideways), Hand tool drag          |

**Fit (2026-11-17, `lib/canvas/pageFit.ts`):** CanvasBoard's fit scale = the page plus `extent` page px on every side
(bleed + slug frames when Show guides is on, crop marks when shown: `pageFrameExtent`, `lib/document/printMarks.ts`)
fitting the board minus a 16 px gap (8 px on phones); fit never enlarges past 100 %. Fit width (Page `fitToWidth`) uses
the same formula by width. **Opening a page** (the board measured, a page size change, a page switch: Page
`applyPageSize`, triggered by `useOpenPageView` in hooks/board): portrait pages open at `openZoom` = 1.3 × the fit,
capped at Fit width, scrolled to the top, so a tall page looks long; Fit to screen (zoom 1) shows the whole page. The
stage leaves the same room so the frames scroll into view; it is floored
(`fitStage`: a rounded page + frames never passes the view by a fraction of a px) and the board keeps a stable
scrollbar gutter, so a scrollbar appearing (classic scrollbars, Windows / Linux) cannot change the width the fit used
and start a fit ↔ scrollbar loop (found by the fate-reviewer; not reproducible with overlay scrollbars). `PageFrame` (SVG in the
stage, `pointer-events: none`) draws the frames and marks OUTSIDE the page; the canvas stays exactly the page (Q2), so
art past the trim is not drawn there (BUG-234) but is exported with the bleed.

**Deep zoom (BUG-221, Q2 amended 2026-11-16):** zoom is 2 % … 6400 % on both boards. Design: the canvas stays the page
(logical W × H, identity viewport), but once the full-page buffer at screen density would pass `MAX_BACKSTORE_PX`,
`useDesignCanvasSize` (hooks/board) switches to a **window**: the buffer covers only the visible part of the page (+ 96
CSS px margin) at full density (`lib/canvas/deepZoom.ts` `applyWindow`), the Fabric wrapper sits at the window's
offset inside the artboard, both contexts draw under a translated base transform, and `_getPointerImpl` adds the
window origin back to pointer events. Scrolling re-places the window (one redraw per scroll frame, only in deep zoom).
Export, thumbnails and `toCanvasElement` are unaffected (they render their own canvas). Code that maps the canvas to
the screen asks `canvasClientRect(canvas)` (the whole page on screen) or `canvasPxPerCss(canvas)`, never the element's
box; painters that reset the transform use `baseTransform(canvas)`. Fabric's own resets: `drawControls` is patched to keep the window offset; while windowed, `getRetinaScaling()` returns 1 when Fabric turns retina off for an export (`toCanvasElement`), so shadows are not drawn at screen density in files; the IText cursor in clip-path groups is not patched yet (BUG-227). Objects too big for Fabric's cache at the current
zoom draw directly (`crispCache`), on both boards.

The page size has **one source**, `selectedPreset` (Canvas slice). `setSelectedPreset` is a document change: one undo
step (snapshots carry the page size under `fateboardPage`), autosaved, and stored per page (`Page.preset`, BUG-109).
`applyPageSize` never writes the canvas in design; it resets `zoom` and mirrors `pageWidth` / `pageHeight`.
Templates set the page size and put their content on the page: no artboard rect, clip path or own viewport (BUG-139).
Only temporary writers remain: PNG / video export set an identity viewport and restore it afterwards.
**Wheel / trackpad (2026-11-11)**, one action, `wheelNavigate(e)` (Canvas slice), registered as `mouse:wheel` for every
tool and, in design, on the board's scroll container for the grey area (CanvasBoard; the canvas handler stops the event so
it never runs twice). Whiteboard: scroll pans, Shift + wheel pans sideways, Ctrl / ⌘ + wheel (a trackpad pinch arrives
as Ctrl + wheel) zooms at the pointer. Design: Ctrl / ⌘ + wheel zooms the page instead of the browser; a plain wheel is
left to the browser. Line-based deltas (Firefox) count 16 px a line; pinch deltas (< 50) zoom at a stronger rate.

**Touch (2026-11-14, BUG-211):** `lib/canvas/touchGestures.ts` (no store / Fabric import), wired by
`hooks/useTouchGestures.ts` from CanvasBoard on the board root (design: the scroll container; whiteboard: the host), in
the capture phase so it sees every touch before Fabric. Fabric 7 follows one finger: a second finger re-runs its
mouse-down (the brush restarts), touch never fires click / `dblclick`, and there is no pinch. Rules:
one finger on the canvas is held until it moves past 8 px, lifts (a tap) or holds still (120 ms with a drawing tool,
`PINCH_WINDOW_MS`; 500 ms with Select, which opens the context menu); then it goes to Fabric
(`canvas._onTouchStart` + the missed moves through `_onMouseMove`). A second finger inside that window is a gesture and
Fabric never sees the first: pinch → Page `pinchZoom(factor, clientX, clientY)` (→ `setZoom`, the one zoom path;
design re-scrolls so the point under the fingers stays put), two-finger move → Page `panBy(dx, dy)` (design scrolls the
board, whiteboard `relativePan`). Once Fabric owns a finger, extra fingers are swallowed; when that finger lifts (or is cancelled) while others stay down, its
interaction is ended at once with `canvas._onTouchEnd` and a no-finger-down touchend (Fabric waits for every finger and has no
`touchcancel` listener, BUG-213). Long press with Select =
a synthetic `contextmenu` on the canvas (same handler as right-click); two taps (< 300 ms, < 24 px) = a synthetic
`dblclick`. Hand tool: one finger pans. A pen (`pointerType` / iOS `touchType: 'stylus'`) goes to Fabric at once, also over a resting palm (the palm was never
forwarded); with the Hand tool it pans;
fingers are ignored while it is down, and after a pen was used one finger pans with the drawing tools. One finger on the
grey design board is native scroll (`touch-pan-x touch-pan-y`). `usePreventPageZoom` (Editor page) stops iOS
`gesture*` events and overscroll; the editor root is `touch-pan-x touch-pan-y` so a pinch never zooms the page.

**Size of new objects (2026-11-11):** `lib/canvas/creationScale.ts`. Base sizes (shape catalog, Text panel presets,
text-in-shape 18 px, stroke 2 px, pictures 400 px on the longer side) are a whiteboard at 100 %. Design: × the page's
shorter side / 600 (1920 × 1080 → 1.8, like Canva sizing by page); whiteboard: × 1 / viewport zoom (same on-screen
size at any zoom, like FigJam). Explicit sizes are kept; pictures are never enlarged. New objects land at
`getVpCenter()` (page centre in design).

Coordinates: in design mode the CSS size is smaller than the backstore. Pointer maths must multiply CSS px by
`canvas.getWidth() / upperCanvasEl.getBoundingClientRect().width` (`getCssToCanvasScale`). `calcOffset()` is
refreshed on pointerdown/scroll/resize because cached offsets go stale.

## Page layers (compositor, 2026-11-17)

`lib/canvas/layerCompositor.ts`, installed by `bindPageLayers`, patches four **instance** methods of the editor canvas
(the prototype is untouched; uninstall restores them): `_renderObjects` (draw by layer: the plan from
`lib/canvas/layerPlan.ts`; plain layers draw straight onto the canvas, a layer / folder with opacity, blend or clipped
layers uses one pooled buffer the size of the backstore), `_checkTarget` (objects on hidden / locked layers are not
hit), `_setSVGObjects` (hidden layers left out, opacity / blend as `<g>`; clipping not exported, BUG-231) and a
selection guard (`selection:created/updated`). It keeps `canvas._objects` in layer order (hit testing walks it);
helpers (`excludeFromExport` / `excludeFromLayers` / `_isHelper`) draw above all layers and stay on top of the stack.
Two host hooks (2026-11-17, Document slice): `underlay` (a master page's objects, drawn first in every render
and in SVG, never in the stack, never hit) and `paintOverlay` (margin / column guides, then the timeline's onion
skin and motion paths (Timeline slice, `src/animation/overlay/`), only when drawing the editor's own canvas element,
so never in exports or thumbnails). More canvas-level saved props: `pageSetup`,
`pageRole`, `masterId` (`lib/canvas/canvasProp.ts` accessors), `pageNotes` (note pins, Notes slice, 2026-11-17: drawn
as DOM over the board by `NotePins`, so never in exports; positions from `sceneToClient` in `lib/canvas/deepZoom.ts`,
the same mapping the text / node floats use, recomputed once per frame after a render, and an object walk only when a
note is linked).
One plain layer (every old document) takes Fabric's own path. Exports, thumbnails and video frames go through
`_renderObjects`, so they show layers too.

## Performance notes

- Page layers: while an object is dragged (`_currentTransform`), the layers below it are drawn once and copied from a
  cached picture each frame, and the layers above too when none of them blends; only the edited layers redraw (with
  ≥ 20 objects outside them, `CACHE_MIN_OBJECTS`). Connector layers stay live. Each isolated layer costs one
  backstore-size buffer while drawing (pool of 6), see BUG-232 / BUG-233.

- Deep zoom (2026-11-16): past the buffer limit the design board redraws on every scroll frame (the window moves); below
  it scrolling stays free (the browser moves a full-page buffer). Objects that skip the cache at high zoom redraw their
  vectors each frame. Stamp strokes cache their dabs per object and render into Fabric's object cache (or an offscreen
  layer clipped to the target canvas); thousands of dabs per stroke are fine, but very long FX strokes with glow cost
  more (`UNKNOWN - verify` at 1,500 stamp strokes).

- Measured 2026-11-09 (1500 mixed objects, M1 Pro GPU): `renderAll` 12 ms; history snapshot + autosave 15-25 ms per
  change; undo 250 ms. Serialization is not the bottleneck; a repaint or per-object DOM is. With the Pages panel open, a
  `toDataURL` thumbnail of the scene costs 125 ms 500 ms after a change (BUG-150).
- Anything that only changes an overlay must not call `requestRenderAll`: that repaints every object. The hover outline
  is painted on the top canvas (`paintHover` in `shapeConnectors`, BUG-148), clears only its own pixels (the text cursor
  shares that canvas) and repaints on `after:render` so it follows the shape.
- The Layers panel mounts only the rows near its viewport (fixed 44 px rows, BUG-147). Per-layer work belongs in
  visible rows only; the row being dragged stays mounted, because removing a drag source cancels the drag.
- Several components use `useStore()` without a selector, so they re-render on any store change, including 60 fps
  `currentTime` updates during playback (BUG-029).
- Layers rebuild on `requestAnimationFrame` after add/remove/modify. Fine, but `buildLayers` walks groups recursively
  and mutates objects.
- `objectCaching: false` is set on new shapes, text and template objects, but the flag is not serialized, so the same
  objects are cached after an undo or reload (BUG-149). Do not enable caching globally: at 1500 objects it gains 4 ms
  per frame on a GPU and loses 310 ms without one.
- Notebook grid paints in `_renderBackground` on every render (off by default since 2026-11-07); snap guides on
  `after:render`. The painters (`lib/canvas/gridPainters.ts`) draw only what is on screen (≤ 1500 lines per axis,
  ≤ 60,000 dots / crosses, else majors only), hide a level below 6 px spacing and fade minor lines in up to 14 px.
- Rulers (BUG-105): the pointer lives in a small pointer store (`createPointerSource` in `Ruler.tsx`), not React
  state. A mouse move re-renders only the two 1 px `RulerMarker`s; ticks redraw only when length / origin / scale /
  unit / theme change. The marker sits at the pointer's viewport x / y because the rulers line up with the viewport.
- Transform row (BUG-106): each X / Y / W / H / R field subscribes to its own `transform[key]`, so a drag re-renders
  only X and Y. Keep it that way: never select the whole `transform` object in a mounted component.
- Design backstore = page × `designRenderRatio` (`lib/canvas/renderRatio.ts`): devicePixelRatio × on-screen scale, at
  least 1 (Fabric's pointer maths breaks below 1), at most 8192 px a side; set by overriding the canvas's
  `getRetinaScaling` in CanvasBoard (BUG-108). Export is unaffected (own multiplier).
- Export: `toCanvasElement(scale)` per frame. WebCodecs path applies back-pressure (`encodeQueueSize > 6`).
- Image export / preview (`ExportCanvas`) render the region with `canvas.toCanvasElement(multiplier, region)` and
  draw it into the output canvas; never encode to a data URL in between. Before rendering, `whenImagesReady`
  (`lib/imageReady`) waits only for source `<img>` elements still downloading: a filtered image draws from a
  `<canvas>` (no `complete` / `load`), which hung export (BUG-119).
