# Limitations: the browser version vs a native (C++) editor

fateboard runs in a browser tab: TypeScript, React and Fabric.js 7 drawing on an HTML `<canvas>` (Canvas 2D). A
native editor written in C++ (Photoshop, Illustrator, Krita, Clip Studio Paint, Inkscape) runs directly on the
operating system, with all the memory, CPU threads, GPU shaders and tablet drivers the machine has. This page lists
where that difference shows, with **this app's real limits** (taken from the code, file and constant named) next to
**typical native values**.

How to read it:

- "Browser (fateboard)" values are what the app does today (2026-11-16). Where the browser sets the limit, the browser
  limit is given too.
- Native values are typical published figures. Figures from user reports rather than official documentation say so.
  Anything not confirmed is marked `UNKNOWN - verify`.
- The last section lists what the app already does to close the gap, and what is planned (PLATFORMS.md).

## 1. Size, resolution and zoom

| Limit | Native C++ editor (typical) | Browser (fateboard) | Why the browser differs |
|---|---|---|---|
| **Maximum canvas / page size** | Photoshop: 300,000 × 300,000 px (large document format, PSB); 30,000 × 30,000 px for PSD (2 GB file). Krita, Clip Studio: bounded by RAM (`UNKNOWN - verify` exact caps). Illustrator: `UNKNOWN - verify` | 10,000 × 10,000 px per page (`MAX_PAGE_PX`, smallest 50 px). The whiteboard is an infinite board; only the visible area is drawn | One `<canvas>` element has a hard size cap: about 32,767 px a side and about 268 million px in total on desktop Chrome / Firefox; on iPhone / iPad Safari 16.7 million px (4096 × 4096) before iOS 18, reportedly 67 million px (8192 × 8192) on iOS 18 |
| **Largest single export (PNG / JPG / video frame)** | As large as RAM and the file format allow | 8,192 px on the longer side (`MAX_RENDER_SIZE`, ExportCanvas); the export scale is lowered to fit | The export is drawn on one canvas element (same caps as above); larger ones fail or come out blank on some devices |
| **On-screen pixel buffer** | GPU tiles, any size | A design page up to 8,192 px a side at screen density (`MAX_BACKSTORE_PX`); past that, only the visible part of the page at full density (deep zoom, `lib/canvas/deepZoom.ts`) | Same canvas caps, plus memory per tab |
| **Zoom range** | Photoshop: up to 12,800 % (user-reported); Illustrator: up to 64,000 % (user-reported) | 2 % to 6,400 % on both boards (`MIN_ZOOM`, `MAX_ZOOM`); sharp at every level | Past 6,400 % the page coordinates (floating point) and the browser's scroll area get close to their limits; not needed for the page sizes above |
| **Colour depth** | 8, 16 or 32 bits per channel (float, HDR) | 8 bits per channel | Canvas 2D stores 8-bit RGBA |
| **Colour spaces** | ICC-managed RGB, CMYK, Lab, spot colours, soft proofing | sRGB documents. CMYK is shown as a converted value in the colour picker only; no print profiles | The 2D canvas has no CMYK and no ICC profile support (Display-P3 exists in some browsers but is not used) |

## 2. Performance and memory

| Limit | Native C++ editor (typical) | Browser (fateboard) | Why the browser differs |
|---|---|---|---|
| **Memory** | All RAM plus scratch disk / virtual memory | One tab's memory budget; the whole project (every page, every image as data) is in memory. The budget depends on the browser and device (`UNKNOWN - verify`: often a few GB on desktop, much less on phones) | Browsers limit and may reload a tab that uses too much |
| **CPU threads** | Brush engines, filters and export spread over all cores | Drawing, brushes, flood fill and the UI share one main thread | Canvas 2D and the DOM live on the main thread; Fabric renders there |
| **GPU** | Custom shaders (OpenGL / Metal / Vulkan / DirectX) for brushes, blending and filters | The browser accelerates Canvas 2D on the GPU, but the app cannot run its own shaders for brushes or blending. Image filters use Fabric's WebGL backend when available | Fabric is a Canvas 2D library |
| **Objects per page** | Tens of thousands of paths / layers (RAM-bound) | Measured with up to 1,500 objects (BUG-150: the Pages thumbnail takes about 125 ms at 1,500). More: `UNKNOWN - verify` | Every redraw walks all objects on the main thread |
| **Undo history** | Hundreds of steps, often stored on disk | 20 steps per page (`MAX_HISTORY`); each step is a full JSON snapshot of the page. Changes within about 350 ms are one step | Snapshots are simple and safe but cost memory, so the count is kept small |
| **Brush engine** | Dab engines on GPU / SIMD at the tablet's input rate; paint mixing, smudge, wet blending with what is already on the canvas | Stamp engine in JavaScript (`lib/brushes/stamp`): 81 brushes, tips, scatter, jitter, pressure, tapers, grain, screentone, glow, spray. A stroke never mixes with the colours under it (no smudge or wet mixing); up to 16 dabs per step; textures apply per stroke | Mixing needs the pixels under the stroke on every dab; this app keeps strokes as objects so they stay editable and sharp at any zoom |
| **Layer blur and filters** | Any radius, on GPU, as live adjustment layers | Layer blur up to 100 px on any object, live. Uses the browser's canvas `filter` (Chrome, Edge, Firefox); where that is missing it falls back to a slower JavaScript blur. Safari support for canvas `filter`: `UNKNOWN - verify`. Image filters work on images only | Canvas 2D has one built-in blur (`ctx.filter`), not available in every browser |
| **Paint bucket** | Exact to the pixel on a raster layer | Renders the visible view (whiteboard) or the page (design), at most 2,048 px a side, flood fills it and traces the result into a vector shape. Accuracy = one render pixel (better zoomed in); on the whiteboard an area open to the edge of the view is not filled | The document is vector objects, not a pixel layer, so the fill is computed from a render and turned back into a shape |

## 3. Input

| Limit | Native C++ editor (typical) | Browser (fateboard) | Why the browser differs |
|---|---|---|---|
| **Pen pressure, tilt, rotation** | Wintab / Windows Ink / macOS tablet APIs: pressure, tilt, barrel rotation, side buttons, eraser end | Pointer Events: pressure (used by brushes and the Spray), tilt where the browser reports it (not used yet), no barrel rotation; support differs per browser and OS (`UNKNOWN - verify` per device) | Browsers expose a smaller, normalised set of tablet data |
| **Input rate** | Raw tablet reports (often 200 Hz or more) | The pointer events the browser delivers (usually about once per screen frame; coalesced events are not read yet) | Browsers batch input to the display refresh |
| **Keyboard shortcuts** | Any key combination | Shortcuts the browser or OS keeps (Ctrl / ⌘ + W, T, N in some browsers, ⌘ + Q) cannot be used | The page cannot override browser chrome shortcuts |

## 4. Files and the system

| Limit | Native C++ editor (typical) | Browser (fateboard) | Why the browser differs |
|---|---|---|---|
| **Saving** | Files anywhere on disk, autosave and recovery files | Autosave to IndexedDB in this browser profile (the browser may clear it if it is not marked persistent: BUG-174); save / open `.fateboard` files through downloads | No free disk access; the File System Access API exists only in Chromium browsers |
| **Storage space** | The disk | The browser's quota for the site (`UNKNOWN - verify` per browser; usually a share of free disk) | Browser policy |
| **File formats** | PSD, AI, PDF, TIFF, EPS, native formats | Export PNG, JPG, SVG, video (WebCodecs / MediaRecorder) and `.fateboard` JSON; open `.fateboard`, JSON, SVG and images. No PSD / AI / PDF import | Those formats need large parsers that are not part of the app |
| **Fonts** | Every installed font | Web fonts the app loads, and system fonts the browser lets the page use by name. Listing local fonts needs the Local Font Access API (Chromium only, with permission) | Privacy: pages cannot list your fonts |
| **Clipboard** | Any format, between any apps | Text and PNG images (async Clipboard API) | Browser security |
| **Eyedropper outside the app** | Yes | Only in browsers with the EyeDropper API (Chromium) | Browser support |
| **Offline** | Always | Needs the site loaded once; an installable offline app (PWA) is planned (PLATFORMS.md phase 1) | Web app delivery |
| **Printing** | Print dialog with colour management | Export, then print the PNG / SVG | No print colour management in browsers |

## 5. What the app does about these limits

- **Deep zoom without blur (BUG-221):** past the canvas buffer limit, the design board draws only the visible part of
  the page at full screen density (`lib/canvas/deepZoom.ts`); objects too big for Fabric's bitmap cache at the current
  zoom draw directly as vectors (`lib/canvas/crispCache.ts`). Export and thumbnails are unaffected.
- **Brush strokes stay editable and sharp:** a stamp stroke stores its points, settings and random seed and is redrawn
  at the current zoom (`StampStroke`), so it is never a fixed-resolution bitmap.
- **Paint bucket makes vectors:** the filled area becomes a normal shape you can move, recolour and undo.
- **Layer blur fallback:** browsers without canvas `filter` get the same blur from a JavaScript box blur.
- **Planned (docs/PLATFORMS.md):** an installable PWA (offline), then desktop and mobile apps with Tauri 2, which keep
  this web engine but add real file access and a larger memory budget. A native shell does not lift the canvas caps or
  add GPU shaders by itself: those would need a WebGL / WebGPU renderer (not planned yet, `UNKNOWN - verify` cost).

## Sources

- Canvas size caps per browser: [canvas-size (jhildenbiddle)](https://github.com/jhildenbiddle/canvas-size),
  [PQINA: Canvas area exceeds the maximum limit](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/),
  [Canvas is finally usable on Safari (iOS 18 test)](https://lionpuro-com.pages.dev/posts/canvas-is-finally-usable-on-safari)
- Canvas `filter` support: [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter),
  [caniuse](https://caniuse.com/mdn-api_canvasrenderingcontext2d_filter), [WebKit bug 198416](https://bugs.webkit.org/show_bug.cgi?id=198416)
- Photoshop sizes and zoom (forum answers, not official documentation):
  [Adobe community: maximum image size](https://community.adobe.com/t5/photoshop-ecosystem-discussions/increase-maximum-image-size-2018/m-p/10071760),
  [Adobe community: zoom limits](https://community.adobe.com/t5/photoshop-ecosystem-discussions/photoshop-massive-over-zoom/m-p/15148414)
- This app: `src/store/slices/createPageSlice.ts` (`MAX_PAGE_PX`, `MIN_ZOOM`, `MAX_ZOOM`),
  `src/lib/canvas/renderRatio.ts` (`MAX_BACKSTORE_PX`), `src/components/organisms/effects/ui/ExportCanvas.tsx`
  (`MAX_RENDER_SIZE`), `src/store/slices/createUndoRedoSlice.ts` (`MAX_HISTORY`),
  `src/store/slices/paintTools/bucketFill.ts` (`MAX_RASTER`).
