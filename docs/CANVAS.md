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

| Fabric event | Handler | Effect |
|---|---|---|
| `selection:created`, `selection:updated` | `handleSelectionChange` | skip connector handles; `filterUnlockedSelection`; `hasActiveShape`; `fillMode`; `setToolbar`; `updateFromFabric`; `saveState()` |
| `selection:cleared` | `handleSelectionClear` | reset toolbar/fillMode, `clearGradientSession` |
| `mouse:down` | `handleMouseDown` | no-op |
| `mouse:dblclick` | `handleDBLClick` | `editShapeText` for text shapes |
| `object:modified` | `handleObjectChange` | `updateMaster` (linked clones) + `persist()` |
| `object:added`, `object:removed`, `path:created`, `text:changed` | `handlePersistEvent` | `persist()` unless helper (`excludeFromExport`) or node handle |

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

`serializeCanvas` writes two kinds of objects with values other than their live ones (swapped in, serialized, swapped
back):

| Object state | Written with | Why |
|---|---|---|
| text box in typing mode | its `_savedProps` (selectable, movement locks…) | Fabric locks a text box while editing |
| shown mid-animation (`__animRest`, set by `animation/engine.applyTracksAt`) | the rest values of the props its track animates, and the full text for a typewriter | saves never hold animated values (BUG-011) |

Custom props in use: `id`, `name` (layers), `_locked` (lock), `customId`, `customType` (`'shape'`,
`'connector-handle'`…), `shapeId`, `isTextShape`, `textInset` (text-in-shape), `connectorData` (connectors), `animId`
(animation), `isFreehand` (brush), `excludeFromExport`/`excludeFromLayers`/`excludeFromSnap`/`isHelper`/`_isHelper`
(helpers), `linkId` (linked clones, saved), `__thumbRev`, `__text`, `__box`, `__group` (runtime-only refs). The old
`__master` / `__instances` clone refs are gone (2026-11-07): links are the saved `linkId`.

Runtime-only refs (`__*`, including `__animRest`) are never serialized and must be rebuilt after every load (`rehydrateTextShape` does this for text shapes; linked clones have no
rebuild).

Loading: always `await canvas.loadFromJSON(json)` (Promise in v6+; the 2nd arg is a per-object **reviver**, not a
completion callback). Only the canvas, pages and undo slices call it; other code uses the `importJSON` action
(`src/__tests__/oneLoader.test.ts`, BUG-014 / 101 / 016). Wrap loads with `persistLock` (`importJSON` does) and
`pauseHistory/resumeHistory`.

## History / snapshots

`createUndoRedoSlice` keeps `undoStack: string[]` (JSON). Invariant: the last item is the current state.

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

| Board | Canvas size | Viewport | Zoom | Pan |
|---|---|---|---|---|
| **Design** (fixed page) | `CanvasBoard` only: backstore = page px (`selectedPreset`), CSS size = fit × zoom | always identity | Page `setZoom` changes `zoom` state only; CanvasBoard redraws (footer, toolbar, Ctrl / ⌘ + wheel or pinch, UI `actualSize`) | the wheel scrolls the board natively (`[data-board-scroll]`); Hand tool drags it |
| **Whiteboard** (infinite) | `CanvasBoard` only: canvas = host size | Page slice only: `setZoom(z, point)` (`zoomToPoint`), `zoomToRect(rect)`, `applyPageSize` (reset 1:1) | same actions; `zoom` always equals the viewport zoom (BUG-025); Ctrl / ⌘ + wheel or pinch zooms at the pointer | wheel / trackpad `relativePan` (Shift + wheel sideways), Hand tool drag |

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

**Size of new objects (2026-11-11):** `lib/canvas/creationScale.ts`. Base sizes (shape catalog, Text panel presets,
text-in-shape 18 px, stroke 2 px, pictures 400 px on the longer side) are a whiteboard at 100 %. Design: × the page's
shorter side / 600 (1920 × 1080 → 1.8, like Canva sizing by page); whiteboard: × 1 / viewport zoom (same on-screen
size at any zoom, like FigJam). Explicit sizes are kept; pictures are never enlarged. New objects land at
`getVpCenter()` (page centre in design).

Coordinates: in design mode the CSS size is smaller than the backstore. Pointer maths must multiply CSS px by
`canvas.getWidth() / upperCanvasEl.getBoundingClientRect().width` (`getCssToCanvasScale`). `calcOffset()` is
refreshed on pointerdown/scroll/resize because cached offsets go stale.

## Performance notes

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
