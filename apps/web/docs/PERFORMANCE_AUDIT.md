# Runtime performance audit (2026-11-17)

A 30-item check of the editor at the target scale: 1000+ objects, long brush strokes, large photos, 60 fps.
Every status was checked against the installed code and against **Fabric 7.4.0** (`node_modules/fabric/package.json`;
CLAUDE.md and code comments still say 7.1 / "v6"). Nothing here was measured unless it says so; numbers marked
"measured" come from docs/CANVAS.md "Performance notes" (2026-11-09, 1500 objects, M1 Pro).

**Use this file for future work:** before changing brushes, history, autosave, image import, the canvas setup
or a dock panel, read the matching row below. The rule `.claude/rules/runtime-performance.md` loads the short
version automatically. When a fix lands, change its row to the new status with the date.

Status words: **USED** (done right), **NOT USED** (missing), **WRONGLY USED** (present but wrong or
incomplete), **PARTIAL** (part done), **N/A** (does not apply, with the reason).

## 1. Verdict at a glance

| #   | Item                          | Status                                                                                                                                             | Impact               | Fix             |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------- |
| 1   | Flyweight presets             | WRONGLY USED                                                                                                                                       | Medium               | P7              |
| 2   | Typed arrays for points       | USED (JSON form)                                                                                                                                   | Low                  | none            |
| 3   | Path simplification           | USED (2026-11-27, P6: RDP on commit + Stamp distance filter)                                                                                       | **High**             | P6              |
| 4   | Object pooling                | USED                                                                                                                                               | Low                  | none            |
| 5   | Serialization size            | WRONGLY USED                                                                                                                                       | Medium               | P7, §5 E18      |
| 6   | Image memory                  | USED (2026-11-27, P1: imports capped at 4096 px)                                                                                                   | **Massive**          | P1              |
| 7   | Undo as commands              | NOT USED                                                                                                                                           | High                 | design §4.1     |
| 8   | History limits / coalescing   | USED                                                                                                                                               | Low                  | none            |
| 9   | Store writes mid-gesture      | USED (by design, mitigated)                                                                                                                        | Low                  | none            |
| 10  | One render per frame          | USED                                                                                                                                               | Low                  | none            |
| 11  | Live stroke on the top canvas | PARTIAL                                                                                                                                            | Medium               | P6              |
| 12  | Object caching                | WRONGLY USED (BUG-149)                                                                                                                             | Medium               | BUG-149         |
| 13  | Offscreen culling + DPR cap   | WRONGLY USED (area)                                                                                                                                | UNKNOWN              | P12             |
| 14  | Coalesced pointer events      | USED (2026-11-27, P3: Stamp brush)                                                                                                                 | High                 | P3              |
| 15  | Brush textures cached         | USED                                                                                                                                               | Low                  | none            |
| 16  | Layer raster caching          | PARTIAL                                                                                                                                            | High                 | design §4.3     |
| 17  | Hit-testing cost              | WRONGLY USED (minor)                                                                                                                               | Medium               | P9              |
| 18  | Storage format                | NOT USED (binary)                                                                                                                                  | **Massive**          | P1, design §4.2 |
| 19  | Save debouncing               | USED (2026-11-27, P2: 1 s idle, 5 s max)                                                                                                           | High                 | P2              |
| 20  | Autosave safety               | USED (2026-11-27, P2: one write at a time)                                                                                                         | High                 | P2              |
| 21  | Schema versioning             | WRONGLY USED                                                                                                                                       | Medium               | P10             |
| 22  | Chunked loading               | NOT USED                                                                                                                                           | Low now              | design §4.4     |
| 23  | Only the active page loaded   | USED                                                                                                                                               | Low                  | none            |
| 24  | Workers / OffscreenCanvas     | PARTIAL (2026-11-17: GIF export encodes in a Web Worker, `animation/gif/gif.worker.ts`, ≤ 4 frames queued)                                         | Medium               | §4.5 (BUG-150)  |
| 25  | Filters (WebGL, throttled)    | PARTIAL (2026-11-27: textures freed on removal, P4)                                                                                                | High (leak)          | P4              |
| 26  | Code splitting of panels      | PARTIAL (2026-11-17: the animation UI is lazy, `TimelineDock` loads `AnimationPanel` on first open, own 44 kB chunk; other dock tabs still static) | Medium               | P5              |
| 27  | Leaks / cleanup               | PARTIAL                                                                                                                                            | High                 | P4, P8          |
| 28  | Profiling + budgets           | USED (2026-11-27, P11 done: `lib/perf/perfMarks`, `e2e/perf-budget.spec.ts`)                                                                       | Medium (enables all) | P11             |
| 29  | Touch + stylus                | USED (2026-11-27, P3: pressure via penInput)                                                                                                       | **High**             | P3              |
| 30  | Fonts before measuring        | WRONGLY USED                                                                                                                                       | Medium               | P8              |

**Order of work:** P11 first (so every other fix has a before / after number), then P1, P2, P3, P4, P6, then
the rest. New bugs found by this audit: BUG-234 … BUG-238 (docs/BUGS.md).

## 2. Checklist, item by item (evidence)

### A. Data and memory

**1. Flyweight: WRONGLY USED.** `StampStroke.toObject` (`lib/brushes/stamp/StampStroke.ts:214`) writes every
`STAMP_KEYS` value, including the full resolved `stampParams` (32 keys of `DEFAULT_STAMP`) on every stroke, next
to `brushId`. Storing only a preset ID would be wrong for a document: editing or deleting a user brush would
change old drawings. The right form is "params that differ from a frozen base" (P7). Colors and opacity are plain
per-object values, as they should be.

**2. Typed arrays: USED (in the form that fits JSON).** Stamp strokes store points as one flat `number[]`
(`packPoints`, `StampStroke.ts:34`: x, y at 0.01, pressure at 0.001, time in ms). Pencil strokes are Fabric
`Path` command arrays (Fabric's own format). A `Float32Array` does not survive `JSON.stringify` and the undo /
autosave format is JSON; it only pays off with binary storage (§4.2). No change now.

**3. Path simplification: PARTIAL.** Pencil: USED, Fabric's `decimate` (`createBrushSlice.ts:198`:
`brush.decimate = 0.4 + s.smoothing * 0.76`). Ink / calligraphy / nib (`store/brushes/variableWidthBrush.ts`
`finalizePath`, line 170): NOT USED; every sample becomes two outline vertices plus caps, written as
`M x y L x y …`. A 2000-sample stroke is about 4000 vertices (~48 KB); 1000 such strokes ≈ 48 MB per snapshot,
autosave and file. Stamp: no distance filter at all (`StampBrush.add`, line 129, pushes every move). P6 adds RDP
to ink strokes and a tiny distance filter to stamp samples.

**4. Object pooling: USED.** `StampBrush.layerContext` reuses one offscreen canvas; the layer compositor keeps a
pool of 6 buffers; tips, tints and patterns live in Maps (`tips.ts:14-15`, `renderDabs.ts:75`); snap guides and
the hover outline are painted in `after:render` / on the top canvas, not as objects.

**5. Serialization size: WRONGLY USED.** Fabric's `includeDefaultValues` is `true` (default, never changed), so
every object writes ~35 core keys; `CUSTOM_PROPS` adds `selectable`, `evented` and 5 lock flags on every object.
Photos are base64 `data:` URLs (BUG-121) and each page carries a PNG thumbnail data URL. **Do not** set
`includeDefaultValues = false`: files would then depend on Fabric's defaults, and Fabric 7 changed exactly those
(`originX/originY` → center). Saving every value is what lets Fabric 6 files load correctly in 7. Shrink the
custom data instead (P7) and compress at the storage layer (§4.2). `StampStroke._toSVG` uses `toDataURL` only
for SVG export: fine.

**6. Image memory: NOT USED (massive).** `importImage` (`feature/import/imageImporter.ts:47`) reads the whole
file as a data URL and only calls `img.scale(target / longer)`: a 24-megapixel photo stays 6000 × 4000 in memory
(~96 MB decoded RGBA) and ~8 MB of base64 inside the project, which autosave writes again after every change,
undo keeps per page (BUG-155 pool) and `enableTransform` draws uncached (`objectCaching: false`), so every frame
downsamples the full bitmap. No `ImageBitmap`, no Blob storage. Fix P1 (cap at import), §4.2 (Blobs).

### B. Undo / redo and state

**7. Command pattern: NOT USED.** `createUndoRedoSlice.commit` (line 109) stores a full `serializeCanvas` JSON
string per step; `restore` (line 155) runs `canvas.loadFromJSON` on the whole canvas. Measured: 15-25 ms per
change, **250 ms per undo** at 1500 objects, and every undo re-creates (and re-decodes) every image. A full
command-pattern rewrite is not worth its risk here; a keyed diff restore keeps the snapshot model and makes undo
cost scale with what changed (§4.1).

**8. History limits: USED.** `MAX_HISTORY: 20` (+1 base, line 309), 150 ms debounce, dedupe against the top,
per-page stacks (Q7). A drag fires one `object:modified`, so it is one step. Animation history coalesces within
800 ms.

**9. Store writes mid-gesture: USED (by design, mitigated).** `handleTransformSync`
(`createCanvasSlice.ts:1144`) runs on `object:moving/scaling/rotating/skewing/resizing` and calls
`updateFromFabric`, which `set()`s `transform` on every move, but only when a value changed
(`createTransformSlice.ts:128`), and each transform field subscribes to its own key (BUG-106). No bare
`useStore()` (guard `storeSelectors.test.ts`, BUG-029 fixed; the BUG-029 line in docs/CANVAS.md is stale);
`useShallow` in 8 files; `devtools` only in development (`store/index.ts:66`). Brushes do not write the store
mid-stroke. Browsers deliver mouse moves once per frame, so a rAF wrapper would gain little. No change.

**10. Render strategy: USED.** 129 `requestRenderAll()` calls, 2 `renderAll()` (both on offscreen
`StaticCanvas` / export). In Fabric 7 `requestRenderAll` coalesces to one frame, and `add()` itself calls
`requestRenderAll` (`StaticCanvas.mjs:65`), so `renderOnAddRemove = false` (used in pages, paint tools, static
canvases) saves little in v7. The real per-object cost of a bulk add is the `object:added` listeners (layers
rebuild on rAF, persist and history debounced): fine.

**11. Live stroke: PARTIAL.** Pencil: Fabric draws on the top context and only redraws the whole path when the
colour has alpha. Stamp: dabs go into an offscreen layer once; `_render` (line 155) blits that layer to the top
canvas. Both right. Ink / nib: `drawPreview` (line 144) rebuilds the whole outline (`outline`, line 71: copy,
smooth, normals, polygon) and fills it on every move: O(n) per move, O(n²) per stroke. Only matters for very long
strokes; measure with P11 before changing (§3 P6 note). Also `StampBrush._render` re-applies grain / screentone
over the whole visible area per move (cost scales with screen size, not stroke).

**12. Object caching: WRONGLY USED (open BUG-149).** Canvas: Fabric default (`objectCaching: true`). Strokes:
cached (`StampStroke.ts:79`, `variableWidthBrush.ts:180`, bucket fill). Shapes, text, images, template objects:
`objectCaching: false`, but the flag is not serialized, so after undo / reload they are cached again. Images with
`objectCaching: false` and a full-size bitmap are the worst case (item 6). Follow BUG-149's per-type policy; P1
removes most of the image cost.

**13. Offscreen culling and DPR: WRONGLY USED (area).** `skipOffscreen`: USED (Fabric default `true`, never
overridden). DPR: design board backstore = `devicePixelRatio × on-screen scale`, capped at 8192 px **a side**
(`lib/canvas/renderRatio.ts:2, 27`); the whiteboard uses Fabric's plain DPR at viewport size (fine). Gap: no
**area** cap. docs/LIMITATIONS.md says iPhone / iPad Safari before iOS 18 blanks canvases above 16.7 M px; a
1920 × 1080 page at ratio 4 is 7680 × 4320 = 33 M px with every side under 8192, times two canvases (lower +
upper) plus the stamp layer and compositor buffers. BUG-238, **UNKNOWN - verify on an iPad with iOS 17** (P12).

**14. Input throttling / coalesced events: NOT USED.** Fabric 7 listens to `mouse*` + `touch*` because
`enablePointerEvents` is never set (default `false`, `Canvas.mjs:73`); the touch layer forwards `TouchEvent`s
through `canvas._onTouchStart` / `_onMouseMove` (`hooks/useTouchGestures.ts:34-36`). `getCoalescedEvents()` exists
only on `PointerEvent`, and browsers deliver one move per frame, so a 120-240 Hz pen loses most samples: fast
curves come out as polylines. Do not just turn on `enablePointerEvents`: pointer events are not cancelled by the
touch layer's `preventDefault`, so pinch / palm rejection would break. P3 reads pointer data on the side.

**15. Brush textures: USED.** Tip masks and tints are cached once per shape / colour (`tips.ts:14-15`, LRU),
patterns in a Map (`renderDabs.ts:75`); nothing is loaded per stroke.

### D. Layers and scale

**16. Virtualization / layer compositing: PARTIAL.** All objects of the active page are live in `getObjects()`
(other pages stay JSON: good). The compositor (`lib/canvas/layerCompositor.ts`) draws the layers below / above a
**dragged** object from a cached picture (≥ 20 objects, CANVAS.md). At rest every repaint (selection change,
panel edit) redraws every on-screen object: measured 12 ms at 1500 objects on a GPU, 325 ms without one
(BUG-149). Rest-state layer caches need a design pass (§4.3).

**17. Hit-testing cost: WRONGLY USED (minor).** Good: hidden / locked layers are skipped by the compositor's
`_checkTarget` patch; the artboard and grid are DOM / background paint, not objects; helpers are excluded;
images and gradient handles set `perPixelTargetFind: false`. Strokes use `perPixelTargetFind: true`
(`createBrushSlice.ts:283`), which is right (clicks between strokes must not select them) and cheap because
strokes are cached. Wrong: (a) `perPixelTargetFind` is not in `CUSTOM_PROPS`, so after undo, redo, reload or a
page switch every stroke is hit by its bounding box again (BUG-235); (b) `targetFindTolerance: 4` on the path
does nothing in Fabric 7, it is a **canvas** option (`SelectableCanvas.isTargetTransparent` reads
`this.targetFindTolerance`; the canvas already uses ≥ 6, `createShapeSlice.ts:330`). Fix P9.

### E. Storage and loading

**18. Storage format: NOT USED (binary).** One structured-clone object under key `project` in IndexedDB
(`lib/storage/projectStorage.ts:106`), all pages inside, photos and thumbnails as base64. Nothing is a Blob,
ArrayBuffer or typed array. Each autosave clones the **whole project** on the main thread. P1 shrinks photos now;
§4.2 is the real fix (per-page keys + an asset store of Blobs), needs version 2 (P10) and the owner (Q5).

**19. Save debouncing: USED (too eager).** `persist()` debounces **300 ms** (`createCanvasSlice.ts:22`) and
flushes on `visibilitychange` → hidden, `pagehide`, `beforeunload` and dispose. "Save Board" downloads a file.
300 ms is shorter than the pause between two pen strokes, so a large project's save lands while the next stroke
starts. P2: 1000 ms idle, 5000 ms max wait (E2E already waits 1500 ms before reloads).

**20. Autosave safety: PARTIAL.** Good: a single IndexedDB `put` is atomic (temp key + swap is not needed for one
key); `persistLock` stops half-loaded saves; an unreadable save is kept under `project.unreadable` and offered
for download (BUG-154); failures show a dialog once (BUG-162). Gaps: writes are not queued, so a slow write and
the next one overlap and each clones the whole project; `opendbIndexed.ts` `call()` decides failure by comparing
one shared `failures` counter before and after `await`, so with overlapping calls one call's error can be
blamed on another (UNKNOWN - verify; P2's queue removes the overlap for autosave).

**21. Schema versioning: WRONGLY USED.** `PROJECT_VERSION = 1` (`createPagesSlice.ts:23`) is written by
`captureProject` / save, but `importProject` (line 522) never reads it: a file from a newer build loads
silently, and there is no place for an upgrade step. P10.

**22. Chunked loading: NOT USED.** `showPage` awaits one `canvas.loadFromJSON` (line 241). That is deliberate:
Fabric swaps the objects only after all are built, so a failed load leaves the old page (BUG-154), and
`oneLoader.test.ts` guards the single loader. Measured full load ≈ 250 ms at 1500 objects: acceptable today.
§4.4 has the design for when boards pass ~5000 objects.

**23. Multi-page loading: USED.** Only the active page is enlivened; the others stay JSON in `pages`. (The whole
project is still read and written as one value: item 18.)

### F. Heavy work and bundle

**24. Web Worker / OffscreenCanvas: PARTIAL.** No `Worker` or `OffscreenCanvas` anywhere. Video export renders
each frame with `toCanvasElement` on the main thread and encodes with WebCodecs (the browser encodes off-thread)
with back-pressure (`encodeQueueSize > 6`): correct, because Fabric draws on the main thread. Filters run on
WebGL. Page thumbnails: `makeThumbnail` (`createPagesSlice.ts:98`) renders **and PNG-encodes** with `toDataURL`
on the main thread (BUG-150, 125 ms at 1500 objects). §4.5 moves the encode off the main thread.

**25. Filters: PARTIAL.** Fabric 7 picks `WebGLFilterBackend` when WebGL works (`config.enableGLFiltering`,
`textureSize` 4096, `filters/FilterBackend.mjs:14`). Sliders: USED, `useImageFilters.update` batches patches to
one `requestAnimationFrame`, `commit` on pointer-up / key-up pushes one undo step. Reduced-resolution preview:
NOT USED (P1's 4096 cap bounds the cost). **Leak:** Fabric caches one WebGL texture per filtered image instance
(`cacheKey`), freed only by `image.dispose()`, which only `canvas.dispose()` calls. Undo, redo, a page switch and
delete remove images without disposing them, and every reloaded filtered image uploads a new texture (up to
4096² × 4 = 64 MB). BUG-236, fix P4.

**26. Code splitting: PARTIAL.** Lazy: routes (`APP_ROUTES`), paper.js, video export + mp4-muxer, the command
registry. Not lazy: every dock panel in `components/config/tabs.config.tsx` (Animation, Export, Filters,
Templates, Font templates, Fractals, Automata, Macro, path effects), all inside the Editor chunk
(96 KB gzip in today's `dist/`). The node editor is a slice (store chunk, 120 KB gzip): slices cannot be lazy
without a second store (forbidden), N/A. Fix P5.

### G. Cleanup and quality

**27. Memory leaks: PARTIAL.** (2026-11-27, BUG-282: animation export freed none of its per-frame bitmaps, several GB on a long export; fixed in `makeCompositor`.) Good: `dispose()` nulls the store first, then `await canvas.dispose()`;
`visibilitychange` / `beforeunload` / `pagehide` removed; touch gestures return a detach; `createObjectURL` 6 ×,
`revokeObjectURL` 7 ×; StrictMode double mount is safe (`init` returns when a canvas exists). Gaps: WebGL textures
(BUG-236, P4); `installShapeTextFonts` removes its `document.fonts` `loadingdone` listener only on the next font
load after the canvas is gone (`shapeTextFonts.ts:28-31`), so it keeps the old canvas alive until then; listeners
docs/CANVAS.md "Dispose" lists as not unregistered (shape behaviour, notebook, brush hooks, layer events) rely on
GC. No workers to terminate.

**28. Profiling: NOT USED.** No `performance.mark` / `measure`, no FPS or time budget anywhere;
`e2e/many-objects.spec.ts` checks behaviour (40 copies), not time. P11 adds marks and a 500-object budget spec.

**29. Touch and stylus: WRONGLY USED (BUG-234).** Good: Fabric sets `touch-action: none` on its canvases
(`CanvasDOMManager.mjs:61`, `allowTouchScrolling` false); palm rejection (a pen wins over resting palms,
`touchGestures.ts` `onPenStart`). Broken: all three brushes read `e.pointerType === 'pen'` and `e.pressure`
(`StampBrush.ts:64`, `variableWidthBrush.ts:49`, `nibBrush.ts:25`), but Fabric hands them a `MouseEvent` or a
`TouchEvent`, which have neither. Stylus pressure never reaches any brush in a real browser; the unit tests pass
pressure straight into `strokeDabs`, so nothing caught it. Fix P3.

**30. Fonts: WRONGLY USED (BUG-237).** Good: `createTextSlice.remeasureWhenLoaded` (line 52) waits for
`document.fonts.load` then calls `initDimensions()`; text shapes refit on `loadingdone`. Wrong: Fabric caches glyph
widths per font family (`cache.getFontCache`, keyed by the lowercased `fontFamily`), filled the first time the
text was measured, i.e. with the fallback face. `initDimensions()` reads that cache, so line breaks stay wrong
until reload. Fabric's own advice: `cache.clearFontCache(family)` before re-measuring. Fix P8.

## 3. Fixes, ranked (copy-paste code)

None of this code has been run. Each fix follows docs/AGENT_WORKFLOW.md: write the listed failing test first,
then the change, then `npm run check`, `npm run test:run`, the touched E2E specs. Budget notes: `createCanvasSlice.ts`
is at 1254 / 1257 lines and `createPagesSlice.ts` at 548 / 549 (`fileBudget.test.ts`).

### P1. Cap imported photos at 4096 px (item 6, 18) — DONE 2026-11-27

Built as proposed (`feature/import/downscaleImage.ts`, wired in `importImage`; unit test as below, E2E
`e2e/photo-memory.spec.ts`: a 6000 × 4000 PNG is stored at 4096 × 2731). Cap logged in docs/DECISIONS.md.

Not breaking for saved files; it changes new imports (a photo larger than 4096 px is stored smaller).
**Owner decision:** the cap. 4096 matches Fabric's WebGL `textureSize`, so filters always fit one texture.

New file `src/feature/import/downscaleImage.ts`:

```ts
/**
 * Photos are stored as `data:` URLs inside the project (BUG-121): a 24-megapixel photo costs ~96 MB of
 * decoded pixels and ~8 MB of text in every autosave. Imports are capped here, before they become a URL.
 */

/** Longest side kept (px). Fabric's WebGL filters work on one texture up to `config.textureSize` (4096). */
export const MAX_IMAGE_SIDE = 4096;

/** Never re-encoded: vectors stay vectors, animated GIFs keep their frames. */
const KEEP_AS_IS = new Set(['image/svg+xml', 'image/gif']);

/** The file itself when it is small enough (or cannot be decoded here), else a downscaled copy. */
export async function downscaleImageFile(file: Blob, maxSide = MAX_IMAGE_SIDE): Promise<Blob> {
    if (KEEP_AS_IS.has(file.type) || typeof createImageBitmap !== 'function') return file;
    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file); // honours EXIF orientation (default 'from-image')
        const longer = Math.max(bitmap.width, bitmap.height);
        if (longer <= maxSide) return file;
        const k = maxSide / longer;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * k));
        canvas.height = Math.max(1, Math.round(bitmap.height * k));
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        // JPEG stays JPEG; everything else becomes PNG so transparency survives
        const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
        canvas.width = 0; // release the pixels now, not at GC
        canvas.height = 0;
        return out ?? file;
    } catch (error) {
        console.error('[import] could not downscale the image, keeping the original', error);
        return file;
    } finally {
        bitmap?.close();
    }
}
```

`src/feature/import/imageImporter.ts`, in `importImage`:

```ts
import { downscaleImageFile } from './downscaleImage';
// …
const url = await readAsDataURL(await downscaleImageFile(file));
```

Failing test first, `src/feature/import/__tests__/downscaleImage.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downscaleImageFile, MAX_IMAGE_SIDE } from '../downscaleImage';

describe('downscaleImageFile', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('keeps a small photo as it is', async () => {
        vi.stubGlobal('createImageBitmap', async () => ({
            width: 800,
            height: 600,
            close: vi.fn(),
        }));
        const file = new Blob(['x'], { type: 'image/jpeg' });
        expect(await downscaleImageFile(file)).toBe(file);
    });

    it('scales the longer side of a big photo to the cap, as JPEG', async () => {
        vi.stubGlobal('createImageBitmap', async () => ({
            width: 8000,
            height: 2000,
            close: vi.fn(),
        }));
        const sizes: number[][] = [];
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
            this: HTMLCanvasElement,
        ) {
            sizes.push([this.width, this.height]);
            return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
        } as never);
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, type) =>
            cb(new Blob(['y'], { type })),
        );
        const out = await downscaleImageFile(new Blob(['x'], { type: 'image/jpeg' }));
        expect(sizes[0]).toEqual([MAX_IMAGE_SIDE, 1024]);
        expect(out.type).toBe('image/jpeg');
    });

    it('never re-encodes SVG', async () => {
        const svg = new Blob(['<svg/>'], { type: 'image/svg+xml' });
        expect(await downscaleImageFile(svg)).toBe(svg);
    });
});
```

E2E (`e2e/file.spec.ts` or a new import spec): import a 6000 × 4000 PNG, then check
`window.__fateboard.objects()[0]`'s natural size is ≤ 4096 (add a `naturalWidth` field to the e2e hook).

### P2. Autosave: one write at a time, 1 s idle, 5 s max wait (items 19, 20) — DONE 2026-11-27

Built as proposed. Step 0 done: the autosave left `createCanvasSlice.ts` (1222 → 1066 lines) for
`store/slices/canvas/persistence.ts` (`createPersistence`; the slice keeps `persist` / `flushPersist`, public API
unchanged). `lib/storage/latestWriter.ts` adds `flush(value)` (tab closing: writes at once even while a write
runs, instead of queueing a write that may never start) and counts writes in flight. Tests:
`latestWriter.test.ts`, `slices/__tests__/persistence.test.ts` (burst = one save; saves every 250 ms still save
within 5 s; lock; flush); store tests wait `PERSIST_DELAY_MS + 100`. E2E reload specs still wait a fixed 1500 ms
(margin 500 ms on a loaded CI machine: UNKNOWN - verify on CI).

Not breaking (same storage format). **Step 0:** `createCanvasSlice.ts` has 3 spare lines; first move the
persistence closure (lines ~97-220: `persistTimer`, `persistLock`, `writeProjectToStorage`, `reportSaveFailure`,
`keepUnreadableBoard`, `flushPersist`, unload handlers) to `src/store/slices/canvas/persistence.ts` with skill
`fate-refactor` (behaviour unchanged, its own commit). Then:

New file `src/lib/storage/latestWriter.ts` (strict island):

```ts
/**
 * Runs one write at a time; while one runs, only the NEWEST waiting value is kept. IndexedDB keeps the
 * order of overlapping writes, but every `put` structured-clones the whole project on the main thread,
 * so a burst of edits paid for every snapshot instead of the last one.
 */
export function createLatestWriter<T>(
    write: (value: T) => Promise<void>,
    hooks: { onSaved?: () => void; onError?: (error: unknown) => void } = {},
) {
    let running = false;
    let waiting: { value: T } | null = null;

    const run = async (value: T): Promise<void> => {
        running = true;
        try {
            await write(value);
            hooks.onSaved?.();
        } catch (error) {
            hooks.onError?.(error);
        } finally {
            running = false;
            const next = waiting;
            waiting = null;
            if (next) void run(next.value);
        }
    };

    return {
        /** Save `value` now, or after the running write (replacing any older waiting value). */
        write(value: T): void {
            if (running) waiting = { value };
            else void run(value);
        },
        /** A write is running or waiting. */
        busy: (): boolean => running || waiting !== null,
    };
}
```

In the (extracted) persistence code, replace `writeProjectToStorage` and the delay:

```ts
const PERSIST_DELAY_MS = 1000; // quiet time before a save: longer than the pause between two strokes
const PERSIST_MAX_WAIT_MS = 5000; // never wait longer than this after the first unsaved change
let firstChangeAt = 0;

const writer = createLatestWriter(
    (doc: Parameters<typeof projectStorage.save>[0]) => projectStorage.save(doc),
    {
        onSaved: () => {
            saveFailureShown = false;
        },
        onError: (error) => {
            console.error('[canvas] failed to save the project:', error);
            reportSaveFailure();
        },
    },
);

/** Capture NOW (the page is known to be complete here); only the write waits its turn. */
const writeProjectToStorage = () => {
    if (savedProjectUnread) return;
    try {
        const doc = get().captureProject?.({ thumbnail: false });
        if (doc) writer.write(doc);
    } catch (error) {
        console.error('[canvas] failed to serialize the project:', error);
    }
};
```

and in `persist()`, replace `cancelPersist(); persistTimer = setTimeout(() => { … }, PERSIST_DELAY_MS);` with:

```ts
if (persistTimer === undefined) firstChangeAt = Date.now();
cancelPersist();
const left = firstChangeAt + PERSIST_MAX_WAIT_MS - Date.now();
persistTimer = setTimeout(
    () => {
        /* the existing body, unchanged */
    },
    Math.max(0, Math.min(PERSIST_DELAY_MS, left)),
);
```

Capture must stay synchronous at the call site: a capture deferred until the writer is free could run during a
page switch and save the wrong page. Tests: `latestWriter.test.ts` (3 calls while the first is pending → 2
writes, values 1 and 3; a rejected write calls `onError` and still runs the waiting one); slice test with fake
timers: 10 `persist()` calls 400 ms apart → one save at ≤ 5000 ms. E2E reload specs already wait 1500 ms.

### P3. Stylus pressure + coalesced samples (items 14, 29, BUG-234) — DONE 2026-11-27

Built as proposed, except the listener is attached inside `hooks/useTouchGestures.ts` (its own effect), not
by a new hook call in `CanvasBoard.tsx` (that file is at its size ceiling). E2E `e2e/pen-pressure.spec.ts`
drives a real pen through CDP `Input.dispatchMouseEvent` (`pointerType: 'pen'`, `force`).

Not breaking. Fabric keeps its mouse + touch listeners; a capture listener records pointer events (which fire
before the matching mouse / touch event) and brushes read them.

New file `src/lib/canvas/penInput.ts`:

```ts
/**
 * Stylus pressure and coalesced samples for brushes (BUG-234).
 *
 * The editor canvas keeps Fabric's mouse + touch listeners (`enablePointerEvents` false) because the touch
 * gesture layer forwards TouchEvents to Fabric. A MouseEvent or TouchEvent has no `pointerType` / `pressure`,
 * so brushes reading those always saw a mouse. Pointer events fire before the matching mouse / touch event:
 * a capture listener records the latest one, and brushes look it up here.
 */

export type PenSample = { pen: boolean; pressure: number };

const MOUSE: PenSample = { pen: false, pressure: 1 };
/** A recorded pointer event older than this (ms) does not belong to the event being handled. */
const MAX_AGE_MS = 40;

type Tracker = { last: PointerEvent | null };
type TouchLike = { touchType?: string; force?: number };
type PointerCanvas = {
    upperCanvasEl?: HTMLElement;
    /** Fabric's scene-point maths (patched by lib/canvas/deepZoom for the zoom window). */
    _getPointerImpl?: (e: Event, fromViewport?: boolean) => { x: number; y: number };
};

const trackers = new WeakMap<object, Tracker>();

const fromPointer = (e: { pointerType?: string; pressure?: number }): PenSample =>
    e.pointerType === 'pen' && (e.pressure ?? 0) > 0
        ? { pen: true, pressure: Math.min(1, e.pressure as number) }
        : MOUSE;

/** iPad: the TouchEvent itself says stylus and how hard. */
function stylusTouch(e: unknown): TouchLike | null {
    const t = e as { changedTouches?: ArrayLike<TouchLike>; touches?: ArrayLike<TouchLike> } | null;
    for (const list of [t?.changedTouches, t?.touches]) {
        for (const touch of Array.from(list ?? [])) if (touch.touchType === 'stylus') return touch;
    }
    return null;
}

/** Record pointer events for `el` (Fabric's upper canvas). Returns the detach function. */
export function attachPenInput(el: HTMLElement): () => void {
    const tracker: Tracker = { last: null };
    trackers.set(el, tracker);
    const doc = el.ownerDocument;
    const record = (e: PointerEvent) => {
        if (e.isPrimary) tracker.last = e;
    };
    // the document, not the canvas: a stroke keeps going when the pointer leaves the canvas
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    doc.addEventListener('pointerdown', record, opts);
    doc.addEventListener('pointermove', record, opts);
    return () => {
        doc.removeEventListener('pointerdown', record, opts);
        doc.removeEventListener('pointermove', record, opts);
        if (trackers.get(el) === tracker) trackers.delete(el);
    };
}

/** The recorded pointer event behind `e` (the MouseEvent / TouchEvent Fabric is handling), if any. */
function pointerBehind(el: object | undefined, e: unknown): PointerEvent | null {
    const last = el ? (trackers.get(el)?.last ?? null) : null;
    const ts = (e as { timeStamp?: number } | null)?.timeStamp;
    if (!last || typeof ts !== 'number') return null;
    return Math.abs(ts - last.timeStamp) <= MAX_AGE_MS ? last : null;
}

/** Is `e` from a stylus, and how hard is it pressed? A mouse or a finger is 1. */
export function penSample(el: object | undefined, e: unknown): PenSample {
    const direct = e as { pointerType?: unknown } | null;
    if (direct && typeof direct.pointerType === 'string')
        return fromPointer(direct as PointerEvent);
    const touch = stylusTouch(e);
    if (touch)
        return { pen: true, pressure: (touch.force ?? 0) > 0 ? Math.min(1, touch.force!) : 1 };
    const behind = pointerBehind(el, e);
    return behind ? fromPointer(behind) : MOUSE;
}

/**
 * Scene points of the samples the browser merged into this move (a fast pen sends 120-240 Hz, Fabric sees
 * one move per frame). The last coalesced sample is the event itself, which Fabric already passed as
 * `pointer`, so it is left out. Empty when there is nothing extra.
 */
export function coalescedScenePoints(
    canvas: object,
    e: unknown,
): Array<{ x: number; y: number; pressure: number }> {
    const c = canvas as PointerCanvas;
    const own = e as Partial<PointerEvent> | null;
    const src =
        typeof own?.getCoalescedEvents === 'function'
            ? (own as PointerEvent)
            : pointerBehind(c.upperCanvasEl, e);
    if (!src || typeof src.getCoalescedEvents !== 'function' || !c._getPointerImpl) return [];
    return src
        .getCoalescedEvents()
        .slice(0, -1)
        .map((sample) => {
            const p = c._getPointerImpl!(sample);
            return { x: p.x, y: p.y, pressure: fromPointer(sample).pressure };
        });
}
```

(`_getPointerImpl` is the right conversion: `lib/canvas/deepZoom.ts` already patches it for the zoom window,
and Fabric's own `pointer` comes from it. `getScenePoint` would not work here: during an event Fabric returns
its cached `_scenePoint`.)

New file `src/hooks/usePenInput.ts`, called next to `useTouchGestures` in `CanvasBoard.tsx:143`
(`usePenInput(canvas);`):

```ts
import { useEffect } from 'react';
import type { Canvas } from 'fabric';
import { attachPenInput } from '@/lib/canvas/penInput';

/** Stylus pressure and coalesced samples for the brushes (BUG-234, lib/canvas/penInput). */
export function usePenInput(canvas: Canvas | null) {
    useEffect(() => {
        const el = canvas?.upperCanvasEl;
        if (!el) return undefined;
        return attachPenInput(el);
    }, [canvas]);
}
```

`src/lib/brushes/stamp/StampBrush.ts`: import `coalescedScenePoints, penSample` from `@/lib/canvas/penInput`,
delete the `PointerLike` type, and replace `pressureOf`, the end of `onMouseDown`, `onMouseMove`,
`keepSpraying`, `add` and `push` with:

```ts
    private pressureOf(e: unknown) {
        return penSample(this.canvas.upperCanvasEl, e).pressure;
    }

    // onMouseDown: replace the last two lines with
        if (this.add(pointer, this.pressureOf(ev?.e))) this._render();
        if (this.params.spray) this.raf = requestAnimationFrame(this.keepSpraying);

    onMouseMove(pointer: Point, ev: TBrushEventData): void {
        if (!this.down) return;
        const extra = coalescedScenePoints(this.canvas, ev?.e);
        const prevT = this.points[this.points.length - 1]?.t ?? 0;
        const now = Math.round(performance.now() - this.start);
        let drew = false;
        extra.forEach((c, i) => {
            // one clock for every sample: spread the merged samples between the last one and now
            const t = Math.round(prevT + ((now - prevT) * (i + 1)) / (extra.length + 1));
            drew = this.add(c, c.pressure, t) || drew;
        });
        drew = this.add(pointer, this.pressureOf(ev?.e), now) || drew;
        if (drew) this._render(); // one blit per move, not one per sample
    }

    private keepSpraying = () => {
        this.raf = 0;
        if (this.canvas.freeDrawingBrush !== this || !this.canvas.isDrawingMode) this.down = false;
        if (!this.down) return;
        const last = this.points[this.points.length - 1];
        const now = performance.now() - this.start;
        if (last && now - last.t >= 16 && this.push({ ...last, t: Math.round(now) })) this._render();
        this.raf = requestAnimationFrame(this.keepSpraying);
    };

    /** Adds one smoothed sample; true when it painted dabs. */
    private add(
        pointer: { x: number; y: number },
        pressure: number,
        t = Math.round(performance.now() - this.start),
    ): boolean {
        const k = 1 - Math.min(10, Math.max(0, this.smoothing)) / 12;
        const s = this.smoothed;
        const next = s
            ? { x: s.x + (pointer.x - s.x) * k, y: s.y + (pointer.y - s.y) * k }
            : { x: pointer.x, y: pointer.y };
        // P6: a sample closer than half a screen pixel with the same pressure adds nothing but bytes
        const last = this.points[this.points.length - 1];
        const near = (0.5 / (this.canvas.getZoom() || 1)) ** 2;
        if (
            last &&
            !this.params.spray &&
            (next.x - last.x) ** 2 + (next.y - last.y) ** 2 < near &&
            Math.abs(pressure - last.p) < 0.02
        )
            return false;
        this.smoothed = next;
        this.pressure = pressure;
        // stored precision (packPoints) from the start, so the saved stroke redraws the dabs of the preview
        return this.push({
            x: Math.round(next.x * 100) / 100,
            y: Math.round(next.y * 100) / 100,
            p: Math.round(pressure * 1000) / 1000,
            t,
        });
    }

    /** Store a sample and paint its dabs into the layer; true when there were dabs. */
    private push(pt: StrokePoint): boolean {
        this.points.push(pt);
        const dabs = this.walker?.push(pt) ?? [];
        const ctx = this.layerContext();
        if (!ctx || !dabs.length) return false;
        renderDabs(ctx, dabs, this.params, this.canvas.getRetinaScaling() * this.canvas.getZoom());
        return true;
    }
```

`src/store/brushes/variableWidthBrush.ts` `addSample` (line 45): `import { penSample } from
'@/lib/canvas/penInput';`, then

```ts
const sample = penSample(this.canvas.upperCanvasEl, e);
const pen = sample.pen;
// …and in both places below, `e.pressure` → `sample.pressure`
```

`src/store/brushes/nibBrush.ts` line 25:

```ts
const sample = penSample(this.canvas?.upperCanvasEl, e);
const pen = sample.pen;
const target = nibWidthFactor({
    speed,
    thinning: this.nib.thinning,
    pressure: pen ? sample.pressure : undefined,
});
```

Failing tests first: `src/lib/canvas/__tests__/penInput.test.ts` (a recorded `pointermove` with
`pointerType: 'pen', pressure: 0.4` and an object `{ timeStamp }` with the same time → `{ pen: true,
pressure: 0.4 }`; a TouchEvent-like `{ changedTouches: [{ touchType: 'stylus', force: 0.3 }] }` → 0.3; a stale
pointer (> 40 ms) → mouse; nothing recorded → mouse). Brush test: `StampBrush.onMouseDown(pt, { e: mouseLike })`
after recording a pen event stores `p: 0.4` (today: 1). Real-device check: docs/TESTING.md device checklist
(iPad + Apple Pencil, Windows pen in Chrome).

### P4. Free WebGL filter textures when an image leaves the canvas (items 25, 27, BUG-236) — DONE 2026-11-27

Built as proposed; verified first in Fabric 7.4 (`removeTexture` → `WebGLFilterBackend.evictCachesForKey`;
`StaticCanvas.clear()` removes every object, so `loadFromJSON` fires `object:removed` for each).

Not breaking. Evicting is always safe: a cache miss uploads the texture again on the next `applyFilters`.

New file `src/lib/canvas/imageTextures.ts`:

```ts
import { FabricImage } from 'fabric';

/**
 * BUG-236: Fabric keeps one WebGL texture per filtered image (`cacheKey`) until `image.dispose()`, and only
 * `canvas.dispose()` calls that. Delete, undo / redo and page switches (loadFromJSON removes the old objects)
 * left every texture behind, up to 64 MB each. Call on `object:removed`.
 */
export function evictImageTextures(obj: unknown): void {
    if (obj instanceof FabricImage) {
        obj.removeTexture(obj.cacheKey);
        obj.removeTexture(`${obj.cacheKey}_filtered`);
        return;
    }
    const children = (obj as { _objects?: unknown[] } | null)?._objects;
    if (Array.isArray(children)) children.forEach(evictImageTextures); // images inside groups
}
```

Register it where every `object:removed` already arrives, `handlePersistEvent` (after P2 step 0 frees lines):

```ts
        handlePersistEvent: (e: CanvasEvent) => {
            const obj = e?.target ?? e?.path;
            if (e?.target && !e.target.canvas) evictImageTextures(e.target); // removed (BUG-236)
            // …unchanged
```

(`object:added` also reaches this handler; the `!canvas` check limits eviction to removals.) Test: a
`FabricImage` with a spy on `removeTexture`, fire `object:removed` → called with `cacheKey` and
`cacheKey_filtered`. Measure with P11: heap / GPU memory after 30 undo + redo of a filtered photo.

### P5. Lazy-load the dock panels (item 26) — medium

Not breaking. Run skill `fate-perf` (`bundle-report.mjs --save` before, `--compare` after). Keep the first tab
(Fill & Shadow) static. `src/components/config/tabs.config.tsx`, replace lines 1-13:

```tsx
import { lazy } from 'react';
import { FillShadowPanel } from '../organisms/FillShadowPanel';

// Every tab but the first loads on first open (docs/PERFORMANCE_AUDIT.md P5).
const AnimationPanel = lazy(() => import('../organisms/animation/AnimationPanel'));
const ExportCanvas = lazy(() => import('../organisms/effects/ui/ExportCanvas'));
const Filters = lazy(() => import('../organisms/filter/ui/Filters'));
const TemplateGallery = lazy(() => import('../organisms/effects/ui/TemplateGallery'));
const FontTemplatePanel = lazy(() => import('../organisms/fonts'));
const PathEffects = lazy(() =>
    import('../organisms/effects/ui/PathEffects').then((m) => ({ default: m.PathEffects })),
);
const RepeatAlongPath = lazy(() =>
    import('../organisms/effects/ui/RepeatAlongPath').then((m) => ({ default: m.RepeatAlongPath })),
);
const RepeatRadially = lazy(() =>
    import('../organisms/effects/ui/RepeatRadially').then((m) => ({ default: m.RepeatRadially })),
);
const SymmetryPanel = lazy(() =>
    import('../organisms/SymmetryPanel').then((m) => ({ default: m.SymmetryPanel })),
);
const AutomataPanel = lazy(() =>
    import('../organisms/generators/AutomataPanel').then((m) => ({ default: m.AutomataPanel })),
);
const FractalPanel = lazy(() =>
    import('../organisms/generators/FractalPanel').then((m) => ({ default: m.FractalPanel })),
);
const MacroPanel = lazy(() =>
    import('../organisms/generators/MacroPanel').then((m) => ({ default: m.MacroPanel })),
);
```

`src/components/organisms/DockRoot.tsx` line 68 (add `Suspense` to the `react` import):

```tsx
<Suspense
    fallback={
        <p role="status" className="p-4 text-sm text-ink">
            Loading…
        </p>
    }
>
    <activeTab.content />
</Suspense>
```

If a panel is also imported statically elsewhere (for example a top-bar Export button), the split does nothing
for it: the bundle report shows it. Optional: start the import on tab hover. E2E: open each tab once
(`editor.openDockTab`), no `pageerror`.

### P6. Simplify ink strokes on commit (item 3, 11) — DONE 2026-11-27 (item 11's O(n²) preview: not changed, measure first)

Built as proposed (`lib/canvas/simplifyPath.ts`, `finalizePath` of the Pencil ink and Calligraphy brushes;
the Stamp brush's half-pixel filter came with P3). A 2000-sample straight ink stroke: 4015 vertices before,
under 50 now (`variableWidthBrush.test.ts`).

Not breaking (new strokes only). New file `src/lib/canvas/simplifyPath.ts`:

```ts
export type XY = { x: number; y: number };

/**
 * Ramer–Douglas–Peucker, iterative (no recursion depth limit). Keeps the first and last point and every point
 * further than `epsilon` from the simplified line. Distances are to the SEGMENT, so closed outlines (first ≈
 * last point) and spikes are kept.
 */
export function simplifyPolyline<T extends XY>(points: readonly T[], epsilon: number): T[] {
    const n = points.length;
    if (n < 3 || !(epsilon > 0)) return points.slice();
    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;
    const eps2 = epsilon * epsilon;
    const stack: Array<[number, number]> = [[0, n - 1]];
    while (stack.length) {
        const [a, b] = stack.pop()!;
        const A = points[a]!;
        const B = points[b]!;
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const len2 = dx * dx + dy * dy;
        let worst = -1;
        let at = -1;
        for (let i = a + 1; i < b; i++) {
            const P = points[i]!;
            const t = len2
                ? Math.min(1, Math.max(0, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2))
                : 0;
            const ex = A.x + t * dx - P.x;
            const ey = A.y + t * dy - P.y;
            const d2 = ex * ex + ey * ey;
            if (d2 > worst) {
                worst = d2;
                at = i;
            }
        }
        if (worst > eps2 && at > a) {
            keep[at] = 1;
            stack.push([a, at], [at, b]);
        }
    }
    return points.filter((_, i) => keep[i] === 1);
}
```

`variableWidthBrush.ts` `finalizePath` (line 170), first line becomes:

```ts
// input is only exact to one screen pixel: drop what deviates less than a quarter of it
const poly = simplifyPolyline(this.outline(true), 0.25 / (this.canvas.getZoom?.() || 1));
```

Stamp strokes get the half-pixel distance filter inside `add` (P3 code). Tests: `simplifyPath.test.ts` (a
straight 1000-point line → 2 points; a zig-zag above epsilon keeps every corner; a closed square keeps 4
corners); a brush test that a 2000-sample straight ink stroke saves fewer than 50 vertices. The O(n²) preview
(item 11): only change it if P11 shows a long ink stroke (10 000 samples) over 4 ms per move; then cache the
outline prefix that can no longer change (indices `≤ n − 2 − smoothingPasses`) and recompute only the tail.

### P7. Save stamp params as a difference from a frozen base (items 1, 5) — medium

Not breaking for old files (they hold full params, which still win). In `stampParams.ts`, add:

```ts
/**
 * What a saved stroke's `stampParams` are a difference FROM. A frozen copy of the defaults of 2026-11-17:
 * never edit it (strokes saved against it would change); change DEFAULT_STAMP instead.
 */
export const STAMP_FILE_BASE: Readonly<StampParams> = Object.freeze({ ...DEFAULT_STAMP });

/** Only the params that differ from `STAMP_FILE_BASE` (all values are primitives). */
export function stampParamsDiff(p: StampParams): Partial<StampParams> {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(p) as (keyof StampParams)[]) {
        if (p[key] !== STAMP_FILE_BASE[key]) out[key] = p[key];
    }
    return out as Partial<StampParams>;
}
```

(Write `STAMP_FILE_BASE` out as a literal copy, not a spread, before DEFAULT_STAMP ever changes, and add a guard
test that it equals that literal.) `StampStroke.ts`: constructor `this.stampParams =
resolveStamp(options.stampParams, STAMP_FILE_BASE as StampParams);` and

```ts
    toObject(propertiesToInclude: string[] = []): Record<string, unknown> {
        const out = (
            FabricObject.prototype.toObject as (this: unknown, p: string[]) => Record<string, unknown>
        ).call(this, [...STAMP_KEYS, ...propertiesToInclude]);
        out.stampParams = stampParamsDiff(this.stampParams); // ~600 B less per stroke
        return out;
    }
```

Tests: serialize → load → serialize is identical (the undo invariant); an old stroke with full params loads the
same; a default stroke saves `stampParams: {}`.

### P8. Clear Fabric's glyph-width cache when a web font arrives (item 30, BUG-237) — medium

Not breaking. `createTextSlice.ts` `remeasureWhenLoaded` (`import { cache } from 'fabric';`):

```ts
        .then(() => {
            // widths measured with the fallback face are cached under this family: drop them (BUG-237)
            cache.clearFontCache(family);
            objs.forEach((o) => {
```

`lib/utils/shapeTextFonts.ts` `refitAll` (first line inside): `cache.clearFontCache();` (all families: the
event can bring several, and the cache refills lazily). Also fix item 27's leak there: return a disposer from
`installShapeTextFonts` that removes the `loadingdone` listener and call it on canvas dispose. Test: a Textbox
measured with a stubbed `measureText` returning 5, stub to 10, run the load path → width doubles (today: same).

### P9. Keep per-pixel hit testing on strokes after undo / reload (item 17, BUG-235) — medium

Not breaking. `lib/serialization.ts` `CUSTOM_PROPS`, after `'isFreehand'`:

```ts
    'perPixelTargetFind', // strokes: clicks between strokes must not select them (BUG-235)
```

`createBrushSlice.ts:283`: drop the dead `targetFindTolerance: 4` (a canvas option in Fabric 7):

```ts
path.set({ perPixelTargetFind: true, isFreehand: true });
```

Strokes saved before the fix still load without it; if that matters, set it on load for `isFreehand` objects in
the shape slice's existing `object:added` rehydrate. Test: draw a stroke, undo + redo, the object still has
`perPixelTargetFind: true` (today: false). E2E: click inside a diagonal stroke's bounding box but off the ink after
a reload → nothing selected.

### P10. Read the project version; one place for upgrades (item 21) — medium

Behaviour change (intended): a project from a newer build is refused and kept by the BUG-154 path instead of
loading half-understood. Line-neutral for `createPagesSlice.ts` (548 / 549). Add to `lib/serialization.ts`:

```ts
/** A project document while it is read (before page normalisation). */
export type ProjectData = Record<string, unknown> & { pages?: unknown; currentPageId?: unknown };

/** Upgrade steps: `PROJECT_MIGRATIONS[v]` turns version v into v + 1. Never edit a shipped step. */
export const PROJECT_MIGRATIONS: Record<number, (doc: ProjectData) => ProjectData> = {};

/**
 * Parse a project (file text or object) and upgrade it to `current`. Null when it is newer than this build or
 * a step is missing (the caller treats it as unreadable). Throws on invalid JSON, like JSON.parse.
 * Files from before versioning (a bare page array, or no `version`) are version 1.
 */
export function upgradeProject(input: unknown, current: number): ProjectData | null {
    const parsed: unknown = typeof input === 'string' ? JSON.parse(input) : input;
    if (!parsed || typeof parsed !== 'object') return null;
    let doc: ProjectData = Array.isArray(parsed) ? { pages: parsed } : (parsed as ProjectData);
    const stated = Number(doc.version ?? 1);
    let v = Number.isInteger(stated) && stated >= 1 ? stated : 1;
    if (v > current) {
        console.error(`[serialization] project version ${v} is newer than this app (${current})`);
        return null;
    }
    while (v < current) {
        const step = PROJECT_MIGRATIONS[v];
        if (!step) {
            console.error(`[serialization] no upgrade from project version ${v}`);
            return null;
        }
        doc = step(doc);
        v += 1;
    }
    return doc;
}
```

`createPagesSlice.ts`: line 10 becomes `import { CUSTOM_PROPS, serializeCanvas, upgradeProject } from
'@/lib/serialization';` and in `importProject` the first line inside `try` becomes:

```ts
const data = upgradeProject(json, PROJECT_VERSION);
```

(The next line's `!Array.isArray(raw)` check already returns false for `null`.) Tests: version 99 → `null` and
`importProject` resolves false (today: true); a bare array → `{ pages }`; a registered step 1 → 2 runs once.

### P11. Timing marks + a 500-object budget spec (item 28) — DONE 2026-11-27

Built as proposed below, with two changes: measures are capped at 500 (the browser keeps them until
cleared), and the autosave mark is `project:capture` on `captureProject` (used by autosave and Save Board), not in
the canvas slice (size ceiling). `makeThumbnail` moved to `store/pageThumbnail.ts`. Baseline at 500 objects
(headless Chromium, 2026-11-27): open 432 ms, p95 frame 17 ms, undo 334 ms, `page:load` 35 ms,
`history:snapshot` 9 ms, `history:restore` 31 ms, `project:capture` 4 ms.

New file `src/lib/perf/perfMarks.ts`:

```ts
/**
 * Timing marks for the DevTools Performance panel ("Timings") and for E2E budgets. On in development and
 * with `?perf` in the URL; otherwise each call costs one boolean check.
 */
const enabled =
    typeof performance !== 'undefined' &&
    typeof performance.measure === 'function' &&
    (import.meta.env.DEV || /[?&]perf(=|&|$)/.test(globalThis.location?.search ?? ''));

/** Run `fn` and record it as `fate:<name>`. */
export function timed<T>(name: string, fn: () => T): T {
    if (!enabled) return fn();
    const start = performance.now();
    try {
        return fn();
    } finally {
        performance.measure(`fate:${name}`, { start, end: performance.now() });
    }
}

/** Same for async work (until it settles). */
export async function timedAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!enabled) return fn();
    const start = performance.now();
    try {
        return await fn();
    } finally {
        performance.measure(`fate:${name}`, { start, end: performance.now() });
    }
}
```

Wrap (one line each): the snapshot in `createUndoRedoSlice.commit` (`history:snapshot`), `restore`'s
`loadFromJSON` (`history:restore`), the autosave capture (`autosave:capture`), `showPage`'s `loadFromJSON`
(`page:load`), `makeThumbnail` (`page:thumbnail`), `StampBrush.finish` (`brush:commit`), `importImage`
(`import:image`). Budgets (record before / after for each fix in this file):

| Mark                                    | Budget at 500 objects     | Budget at 1500 |
| --------------------------------------- | ------------------------- | -------------- |
| frame while scrolling (p95)             | ≤ 16.7 ms on a GPU laptop | ≤ 33 ms        |
| `history:snapshot` / `autosave:capture` | ≤ 10 ms                   | ≤ 25 ms        |
| `history:restore` (undo)                | ≤ 100 ms                  | ≤ 250 ms       |
| `page:load`                             | ≤ 300 ms                  | ≤ 800 ms       |
| JS heap after load (DevTools)           | ≤ 150 MB                  | ≤ 300 MB       |

New spec `e2e/perf-budget.spec.ts` (budgets are generous so CI noise passes and a big regression fails; real
numbers go to the report as annotations):

```ts
/**
 * Busy-board budgets (docs/PERFORMANCE_AUDIT.md P11): a 500-object project opens, scrolls and undoes in time.
 * Budgets are loose on purpose (CI machines vary); the measured numbers are written to the report.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

const COUNT = 500;

/** Plain Fabric 7 JSON: five kinds of object on a grid, no layers (one plain layer). */
function stressObjects(version: string) {
    return Array.from({ length: COUNT }, (_, i) => {
        const base = {
            version,
            id: `stress-${i}`,
            originX: 'left',
            originY: 'top',
            left: 40 + (i % 25) * 70,
            top: 40 + Math.floor(i / 25) * 50,
            angle: (i * 7) % 45,
            fill: `hsl(${(i * 37) % 360}, 70%, 55%)`,
        };
        switch (i % 5) {
            case 0:
                return { ...base, type: 'Rect', width: 60, height: 40 };
            case 1:
                return { ...base, type: 'Circle', radius: 20 };
            case 2:
                return { ...base, type: 'Triangle', width: 50, height: 40 };
            case 3:
                return { ...base, type: 'Textbox', text: `Item ${i}`, width: 60, fontSize: 14 };
            default:
                return {
                    ...base,
                    type: 'Path',
                    fill: null,
                    stroke: base.fill,
                    strokeWidth: 3,
                    path: [
                        ['M', 0, 0],
                        ['Q', 20, 30, 40, 0],
                        ['Q', 50, -20, 60, 10],
                    ],
                };
        }
    });
}

test('500 objects: open, scroll and undo stay within budget', async ({ editor, page }) => {
    test.slow();
    // the app's own file as the wrapper, so page metadata is real
    await editor.addShape('Rectangle');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Save Board' }).first().click(),
    ]);
    const project = JSON.parse(readFileSync(await download.path(), 'utf8'));
    const pageJson = project.pages[0].canvasJSON;
    pageJson.objects = stressObjects(String(pageJson.version ?? '7.4.0'));

    const opened = Date.now();
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Open Board' }).first().click(),
    ]);
    await chooser.setFiles({
        name: 'stress.fateboard',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(project)),
    });
    await expect.poll(async () => (await editor.objects()).length, { timeout: 30_000 }).toBe(COUNT);
    const openMs = Date.now() - opened;

    // frame times while the board scrolls (every frame repaints every object on screen)
    const box = await editor.settledCanvasBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.evaluate(() => {
        const w = window as unknown as { __frames: number[] };
        w.__frames = [];
        let last = performance.now();
        const tick = (now: number) => {
            w.__frames.push(now - last);
            last = now;
            if (w.__frames.length < 90) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    for (let i = 0; i < 30; i++) await page.mouse.wheel(0, i % 2 ? -80 : 80);
    const frames = (
        await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames)
    )
        .slice(5)
        .sort((a, b) => a - b);
    const p95 = frames[Math.floor(frames.length * 0.95)] ?? 0;

    // undo of one step restores the whole 500-object canvas
    await editor.addShape('Circle');
    await page.waitForTimeout(350); // history is debounced (150 ms)
    const undone = Date.now();
    await page.getByRole('button', { name: 'Undo' }).first().click();
    await expect.poll(async () => (await editor.objects()).length).toBe(COUNT);
    const undoMs = Date.now() - undone;

    test.info().annotations.push({
        type: 'perf',
        description: JSON.stringify({ openMs, p95FrameMs: Math.round(p95), undoMs }),
    });
    expect(openMs).toBeLessThan(10_000);
    expect(p95).toBeLessThan(100);
    expect(undoMs).toBeLessThan(3_000);
});
```

Run: `npm run e2e -- perf-budget --reporter=line`. Note the Undo button's accessible name and the `Circle`
shape label come from `e2e/data-safety.spec.ts`; if Open Board asks to confirm replacing the board, click that
button first (`UNKNOWN - verify`, data-safety's `openFile` does not).

### P12. Cap the design backstore by area too (item 13, BUG-238) — verify first

Only after BUG-238 is confirmed on an iPad with iOS 17. `lib/canvas/renderRatio.ts`:

```ts
/** iPhone / iPad Safari before iOS 18 blanks a canvas above this many pixels (docs/LIMITATIONS.md). */
export const MAX_BACKSTORE_AREA = 16_777_216;
// in designRenderRatio:
const cap = Math.min(
    MAX_BACKSTORE_PX / Math.max(width, height),
    Math.sqrt(MAX_BACKSTORE_AREA / (width * height)),
);
```

and the deep-zoom switch (`lib/canvas/deepZoom.ts:41`) must use the same limit, or the page would stay a full
(blurred) buffer instead of switching to the sharp window:

```ts
Math.max(pageW, pageH) * ratio > MAX_BACKSTORE_PX ||
    pageW * pageH * ratio * ratio > MAX_BACKSTORE_AREA;
```

Trade-off for the owner: on desktop the window mode (redraw on scroll) starts at a lower zoom. To keep desktop as
it is, apply the area cap only on Apple touch devices. Total canvas memory on iOS (lower + upper + stamp layer +
compositor pool, BUG-233) is `UNKNOWN - verify` in Safari's Web Inspector, Graphics tab.

## 4. Designs that need a plan before code (fate-architect + owner)

### 4.1 Undo: keyed diff restore (item 7)

Keep the snapshot stack (no public API change). On undo / redo, parse the target and the current snapshot,
match top-level objects by `id`, keep live objects whose JSON string is identical, enliven only changed / new
ones, remove the rest, then fix the order (`moveObjectTo`). Fall back to the full `loadFromJSON` when canvas-level
props differ, an id is missing or duplicated, or anything throws. Undo of one move among 1500 objects then
re-creates 1 object instead of 1500 (and re-decodes no photo). Files I need to read in full before writing it:
`createUndoRedoSlice.ts` (restore, queue), `lib/linkedClones.ts` (links rebuilt after a load),
`createShapeSlice.ts` (text-shape / connector rehydrate on `object:added`), `createPageLayersSlice.ts`
(layer order). Guard: the `oneLoader.test.ts` rule must allow it, or it lives inside the undo slice.

### 4.2 Storage v2: per-page keys + an asset store (items 6, 18, 20)

Project index under `project` (`{ version: 2, currentPageId, pages: [{ id, name, updatedAt }] }`), each page
under `page:<id>`, each photo once under `asset:<sha256>` as a **Blob** (the image's `src` becomes
`asset:<sha256>`, resolved to an object URL on load and revoked on unload; files exported as `.fateboard` keep
data URLs). Autosave writes only the dirty page, so a change costs one page, not the project. Optional: page
JSON compressed with `CompressionStream('gzip')` into a Blob (~10× smaller for vector pages; photos do not
compress). Needs P10 (migration step 1 → 2), owner decision Q5, and the BUG-121 / BUG-155 contracts kept.

### 4.3 Rest-state layer caches (item 16)

Extend the compositor's drag cache to idle: a layer with ≥ `CACHE_MIN_OBJECTS` objects and no object in the
active selection is drawn from its cached picture; invalidate on `object:added/removed/modified` of that layer,
zoom, pan past the cached rect and theme change. Interacts with BUG-232 / BUG-233 (stale layers, buffer memory).
I need `lib/canvas/layerCompositor.ts` and `layerPlan.ts` in full first.

### 4.4 Chunked loading (item 22), only past ~5000 objects

Build objects first, in chunks, off the canvas, then swap once (keeps BUG-154: a failed load changes nothing):

```ts
import { util, type FabricObject } from 'fabric';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Enliven `raw` 50 at a time, yielding a frame between chunks; nothing touches the canvas. */
export async function enlivenInChunks(
    raw: unknown[],
    onProgress?: (done: number, total: number) => void,
    signal?: AbortSignal,
    chunk = 50,
): Promise<FabricObject[]> {
    const out: FabricObject[] = [];
    for (let i = 0; i < raw.length; i += chunk) {
        out.push(...(await util.enlivenObjects<FabricObject>(raw.slice(i, i + chunk), { signal })));
        onProgress?.(Math.min(i + chunk, raw.length), raw.length);
        await nextFrame();
    }
    return out;
}
```

`showPage` would then `await canvas.loadFromJSON({ ...json, objects: [] })` (canvas-level props) and
`canvas.add(...objects)`. Changes the single-loader rule (`oneLoader.test.ts`): owner decision.

### 4.5 Thumbnails off the main thread (item 24, BUG-150)

The render must stay on the main thread (Fabric); the encode does not have to:

```ts
/** Page thumbnail: Fabric renders (main thread), the browser encodes off the main thread. */
export async function makeThumbnailAsync(
    canvas: { getWidth: () => number; toCanvasElement: (multiplier?: number) => HTMLCanvasElement },
    width: number,
): Promise<string | undefined> {
    const w = canvas.getWidth();
    if (!w) return undefined;
    try {
        const el = canvas.toCanvasElement(width / w);
        const blob = await new Promise<Blob | null>((resolve) =>
            el.toBlob(resolve, 'image/webp', 0.8),
        );
        if (!blob) return undefined;
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result)); // still a data:image/ URL (BUG-157)
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch {
        return undefined; // tainted canvas: no thumbnail, as today
    }
}
```

Use it where the caller is already async (`showPage`'s fresh thumbnail) and in the Pages panel's delayed save
inside `requestIdleCallback`. `capture()` is synchronous; keep `makeThumbnail` there. I need `PagePanel` to place
it exactly.

## 5. Stress scene for manual checks

Use the generator in P11 with `COUNT = 500` and `1500`, plus: 5 photos of 6000 × 4000 (3 with filters), 200
stamp strokes of 1500+ samples (draw with spray off, grain on), 3 pages. Open `/draw?perf`, record in DevTools
Performance: scroll 5 s, drag one object 5 s, undo 10 ×, switch pages 5 ×. Read the `fate:*` timings, the frame
chart and Memory (heap snapshot before / after 30 undo + redo: detached `HTMLCanvasElement` / `HTMLImageElement`
counts must not grow). On iPad: Safari Web Inspector → Graphics for canvas memory.
