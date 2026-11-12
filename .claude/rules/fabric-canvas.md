---
paths:
    - 'src/store/slices/**'
    - 'src/lib/canvas/**'
    - 'src/lib/serialization.ts'
    - 'src/lib/utils/**'
    - 'src/feature/import/**'
    - 'src/animation/**'
    - 'src/components/organisms/board/**'
---

# Fabric canvas (Fabric 7)

Full rules: docs/CANVAS.md (lifecycle, events, serialization, history, zoom/pan, performance).

- Always set `originX` / `originY` when creating an object (Fabric 7 defaults to center).
- `await canvas.loadFromJSON(json)`, never with a callback, and only inside the canvas / pages slices (it bypasses
  the persist lock and history elsewhere). Same for `canvas.clear()`.
- Serialize only through `serializeCanvas` / `CUSTOM_PROPS` (`@/lib/serialization`); no other `toObject` / `toJSON`
  on the canvas, no second props list (`oneSerializeList.test.ts`, `oneLoader.test.ts`).
- Helper objects (handles, guides, previews) get `excludeFromExport` plus the layer and snap exclusion flags.
  Listeners ignore them, and ignore events while `isPageSwitching` / `_isRestoring`.
- Canvas listeners are registered in one place, keep their disposers and are removed on `dispose`.
- Geometry and zoom: `CanvasBoard` sizes the canvas, the Page slice (`setZoom`, `zoomToRect`) zooms,
  `selectedPreset` is the page size. Never write another geometry / zoom path (BUG-007).
- Only store actions mutate Fabric objects; components call actions.
- Performance: one `requestRenderAll()` per user action (not per object), batch with `renderOnAddRemove = false`
  for bulk changes, no work in `after:render`, throttle `mouse:move` work to animation frames.
- One Fabric canvas for the editor; previews and thumbnails render offscreen and are disposed.
