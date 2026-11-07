# Architecture

## Stack (from `package.json` + `node_modules`, 2026-11-06)

| Concern | Library | Installed |
|---|---|---|
| UI | React 19 (`StrictMode`), react-router-dom 7 (`BrowserRouter`) | 19.2.x / 7.7.x |
| Canvas | **Fabric.js 7.1.0** (docs/code comments still say v6) | 7.1.0 |
| State | zustand 5 (`devtools` middleware) | 5.0.11 |
| Persistence | IndexedDB (project autosave, `lib/storage/projectStorage`), opendb-store (`db.local`, settings) + raw `localStorage` | opendb 2.0.1 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`), Font Awesome 7, lucide-react | |
| Geometry | paper.js (boolean ops, geometry engine) | 0.12.x |
| Export | mp4-muxer (WebCodecs MP4), jsPDF (dead code only) | |
| Build | Vite 7, TypeScript 5.9 (`strict: false`), ESLint 9 flat config, Prettier 3 | |
| Test | Vitest 4 + jsdom + Testing Library | |
| Unused deps | `@reduxjs/toolkit`, `react-redux` (dead file only), `json-server` (no `db.json`) | |

Node: `.nvmrc` = v26.13.0. Deploy: GitHub Pages via `.github/workflows/ci.yml` → reusable `deploy.yml` ( push to `main` only, `actions/deploy-pages` into the `github-pages` environment; the custom domain is set in repo Settings > Pages, not by a `CNAME` file).

## Layers

```
src/main.tsx → App.tsx → app/rootRouter.tsx (BrowserRouter + RouteSeo)
  └─ templates/RootLayout   (hydrates settings from opendb, then renders <Outlet/> inside ErrorBoundary; DialogHost + ToastHost)
       ├─ /                 pages/web/WhiteboardMarketingSite   (marketing; has its own MiniWhiteboard)
       ├─ /draw             pages/Editor/Editor.tsx             ← the editor
       ├─ /setting          pages/Setting/EditorSettingPage     (Preferences)
       ├─ /command-palette  pages/Command/CommandPalette
       ├─ /share/:docId     pages/SharePage/SharePage           (its own fabric.Canvas, read-only view)
       └─ /help             pages/HelpPage/HelpPage
     * → pages/NotFound/NotFoundPage
```

Editor composition (`Editor.template.tsx` grid):

```
┌ header: organisms/header/ui/Header → TopToolbar (File, Edit, Align, Group, Lock, Zoom, Origin, Extra) + ShapeToolsHeader
├ leftSidebar: editorsidebar/ui/EditorSidebar (rail + panel; items from editorsidebar.config.tsx)
├ canvasBoard: board/ui/CanvasBoard  (mode 'design' | 'whiteboard', rulers, artboard, floating text toolbar)
├ rightPanel: DockRoot (color picker + TabsRail: Tiling, Rotate, Along Path, Filter, Export, Animate)
└ footer: footer/ui/Footer → FullScreen + StrokeControls
+ ContextMenu (store-driven)
```

Code layers (top depends on bottom):

1. **Routes/pages**: `src/app`, `src/components/pages`
2. **Templates/organisms/molecules/atoms** (atomic design): `src/components/**`. Organisms read/write the store.
3. **Config**: `src/components/config` (toolbar button configs that double as **commands** with shortcuts).
4. **Store**: `src/store` (one zustand store, 23 slices). This is the only layer that should mutate Fabric objects
   (today some components do it directly, e.g. CanvasBoard, Editor, panels).
5. **Domain libs**: `src/animation` (engine + export), `src/lib` (patterns, path repeat, connectors, text-in-shape,
   gradient tool, boolean engine), `src/hooks/shape` (shape catalog), `src/feature/import`.
6. **Fabric.js** (single `fabric.Canvas` per editor).

## Canvas ownership

- **Owner:** `createCanvasSlice` stores the instance in `useStore.getState().canvas`. Created by `init(el, container)`,
  destroyed by `dispose()`.
- **Mounting:** `CanvasBoard` → `CanvasSurface` creates a `<canvas>` element **in code** (not JSX; Fabric wraps it),
  calls `init`, and on unmount snapshots `exportJSON()` and calls `dispose()`. `CanvasSurface` is keyed by mode, so a
  mode change remounts it and carries content over through `snapshotRef`.
- **Readers:** almost every organism reads `canvas` from the store and calls Fabric directly. There is no facade.
- **Other Fabric canvases:** `SharePage` (own instance), `MiniWhiteboard` (marketing), `advanceOperationSlice`
  (`StaticCanvas` for pattern tiles). `advanceOperationSlice.setCanvas` can overwrite the store's `canvas` (unused).
- **Geometry has one owner per board** (Q2, BUG-007 fixed): `CanvasBoard` sizes the canvas (design: backstore = page
  px from `selectedPreset`, CSS = fit × zoom, identity viewport; whiteboard: host size). Zoom / pan go through the Page
  slice (`setZoom`, `zoomToRect`, `applyPageSize`); in design they change only `zoom`. See CANVAS.md "Zoom / pan".

## How slices compose

`src/store/index.ts`:

```ts
export const combinedSlice = (set, get, store) => ({
  ...createCanvasSlice(set, get, store),
  ...createBrushSlice(set, get, store),
  // … 22 more, createPageSlice twice …
  ...createAnimationSlice(set, get, store),
});
export const useStore = create(devtools(combinedSlice, { name: 'DesignEditorStore', enabled: isDev }));
```

Rules that actually hold today:
- Every slice receives the **same** `set/get/store`. Cross-slice calls use `get().otherAction?.()`.
- Later spreads silently override earlier keys (17 colliding keys). See STATE.md.
- Slices with private runtime state keep it in **closure variables** (Canvas: `persistLock`, timers; UndoRedo: timer;
  Animation: module-level `rafId`). Module-level state is shared across store instances, which matters for tests.
- `createNotebookSlice` uses `store.subscribe` to re-attach to new canvases. That is the only slice that uses the
  third argument.

## Data flow

```mermaid
flowchart LR
  subgraph UI[React UI]
    TB[TopToolbar / commands]
    SB[EditorSidebar panels]
    DK[DockRoot tabs]
    CB[CanvasBoard]
    KB[useKeyboardShortcuts<br/>window keydown]
  end

  subgraph Store[zustand useStore]
    CS[Canvas slice<br/>canvas, tool, selection, persist]
    UR[UndoRedo slice]
    PG[Page + Pages slices]
    LY[Layers slice]
    AN[Animation slice]
    OT[Shape / Text / Brush / Style / ...]
  end

  FC[(fabric.Canvas)]
  IDB[(IndexedDB fateboard/kv<br/>project: all pages + animation)]
  DB[(opendb<br/>fateboard-settings)]
  LS[(localStorage<br/>shapes, patterns, fonts, share)]

  TB -- runCommand / getState().action --> Store
  SB -- action --> Store
  DK -- action --> Store
  KB -- runCommand(id) --> Store
  CB -- init / dispose / exportJSON --> CS

  Store -- mutate objects, setActiveObject, setDimensions, VPT --> FC
  FC -- "selection:*, object:*, path:created, text:changed" --> CS
  FC -- "object:added/removed/modified, selection:*" --> LY
  FC -- "object:moving/scaling, after:render" --> OT
  FC -- "selection:*, object:modified (autoKey)" --> AN
  CS -- set selectedObject / showTextToolbar / fillMode --> UI
  CS -- debounced 300 ms toObject --> DB
  PG -. pages[] kept in memory only .-> Store
  OT -- custom shapes / patterns --> LS
  UR -. snapshots on saveState only .-> Store
```

Event flow, step by step:

1. **User input on canvas** → Fabric fires events → `registerCanvasEvents` handlers in the Canvas slice:
   `selection:created/updated` → `handleSelectionChange` (toolbar state, `updateFromFabric`, `saveState`);
   `selection:cleared` → `handleSelectionClear`; `object:modified` → `handleObjectChange` (linked clones + `persist`);
   `object:added/removed`, `path:created`, `text:changed` → `handlePersistEvent` → `persist()` (300 ms debounce →
   Pages `captureProject()` → `projectStorage.save(project)` in IndexedDB; page-only changes and track edits call
   `persist()` too).
2. Other listeners added by slices/panels: Layers `bindLayerEvents` (resync layers on rAF), Shape
   `installShapeBehavior` (text-in-shape scaling, connectors, shape text toolbar), Notebook (snap + grid), Brush hooks,
   Animation `bindAutoKey`, PagePanel (500 ms `saveCurrentPage`), CanvasBoard (context menu, offset refresh, grid,
   floating toolbar position).
3. **UI → canvas**: components call store actions, which mutate Fabric objects and `requestRenderAll()`, and usually
   call `saveState()`. Some components mutate Fabric directly (e.g. `CanvasBoard` floating toolbar `onChange`,
   `Editor.tsx` brush effect).
4. **Keyboard**: `useKeyboardShortcuts` (mounted by CanvasBoard) matches `commands[].shortcut` and calls
   `runCommand(id)`. Panels add their own window/element listeners (Animation, Draw `[ ]`, Pages PageUp/Down,
   ExtraBar grid/snap, NodeEditor).

## Save / load

| Flow | Entry | Format | Notes |
|---|---|---|---|
| Autosave | `persist()` | the whole project (`captureProject`: every page + its animation; live canvas → current page; `serializeCanvas`, animated objects at rest) → IndexedDB key `project` | Locked (`persistLock`) during import/clear/restore; skipped while a page loads (BUG-004) |
| Restore | `init` → `restoreFromStorage()` → `importProject(project)` (all pages, the page that was open) → `initPages()` (no-op when pages exist) | same | Skips if objects already exist. An old localStorage `drawJson` board is loaded with `importJSON` and adopted as Page 1, then removed on the first save |
| Save file | FileBar → `saveBoard()` | downloads `drawing.fateboard` (the whole project, same format as the autosave) | |
| Open file | FileBar "Open" button → hidden `<input>` → `feature/import/importFile` | `.png/.jpg/.webp` → image, `.svg` → SVG, `.fateboard/.json` → `importFabricJSON` (v5-style `loadFromJSON`, no persist lock, history not reset: BUG-014) | The **keyboard** Ctrl/⌘+O runs `clearBoard()` instead (BUG-040) |
| Project | `exportProject()` / `importProject()` (Save / Open in the top bar) | `{app:'fateboard', version:1, currentPageId, pages[{…, animation?}]}` | Same document is autosaved (BUG-004) |
| Share | ExtraBar → `localStorage['board:<id>']` → `/share/:id` | `canvas.toJSON()` | Same-browser only (BUG-028) |
| Settings | Setting slice | opendb `fateboard-settings` | Validated by `sanitizeSettings` |

## Bundles and assets

- **Routes are lazy chunks** (`app/rootRouter.tsx`, `React.lazy` + one `Suspense` with a blank background fallback): the
  landing page never downloads the editor (`Editor` chunk ≈ 77 KB gzip) and vice versa. A failed chunk load after a
  deploy hits the `ErrorBoundary` (Reload). Guard: `src/__tests__/codeSplitting.test.ts`.
- **Vendor chunks** (`vite.config.ts` `build.rolldownOptions.output.codeSplitting.groups`): `fabric`, `paper`, `react`,
  `icons`, cached separately across deploys. Startup = entry + react + fabric + icons ≈ 278 KB gzip (was one 490 KB chunk).
- **paper.js loads on demand** (`lib/booleanOps.computeBoolean`, geometry engine `loadGeometryEngine()`), ≈ 120 KB gzip
  kept out of startup. The store still imports Fabric, so every route loads it (the shell needs the store).
- **Template images**: canvas / preview images ≤ 2048 px (≤ 0.7 MB), gallery cards use 640 px files in
  `public/template/thumb/`; `dist` 39 MB → 9.5 MB. Guard: `src/__tests__/templateAssets.test.ts`.

## SEO

Static GitHub Pages (ADR-11), no server and no rewrites, so every public route gets a real HTML file at build time:

| What | Where | Rule |
|---|---|---|
| Route list + metadata | `src/app/seo/routes.ts` (`SEO_ROUTES`) | One source for the build and the app. `/` must match `index.html`. `index: false` = `noindex`, no canonical, not in the sitemap |
| Per-route pages | `vite.config.ts` plugin → `src/app/seo/prerender.ts` | Built `index.html` → `draw.html`, `help.html`, `setting.html`, `command-palette.html` with own title, description, robots, canonical, OG/Twitter and fallback `h1` / `data-seo="intro"`. GitHub Pages serves `/help` from `help.html` (HTTP 200, no slash redirect). Throws on a missing tag |
| Unknown URLs / share links | generated `404.html` | App shell, `noindex`, no canonical. GitHub Pages returns it with HTTP 404; the app still renders `/share/:id` and Not Found |
| Site URL | `VITE_SITE_URL` (`.env` / CI repo variable), validated by `src/app/seo/siteUrl.ts` | One origin for canonical, OG / JSON-LD (`%VITE_SITE_URL%` in `index.html`), per-route pages, sitemap and robots. `vite.config.ts` refuses to build without a valid value; never hard-code the domain (`siteUrl.test.ts` scans for it) |
| Sitemap / robots | generated `sitemap.xml` + `robots.txt` | Indexable routes only; robots points to the sitemap. Do not add a static `public/404.html`, `public/sitemap.xml` or `public/robots.txt` |
| Client navigation | `src/app/seo/RouteSeo.tsx` (in `rootRouter`) | Only writer of `document.title`; updates description, robots, canonical, OG/Twitter per path |
| Old links | `src/app/seo/legacyHashUrl.ts` (from `main.tsx`) | `/#/draw?x` → `/draw?x` with `replaceState` before the router mounts |
| Landing head, OG image, JSON-LD | `index.html` | Description one line, 50–160 chars; absolute 1200×630 `public/og-image.png`; `WebSite` + `WebApplication` (`featureList` = only real features) |
| No-JS fallback | `<main data-seo-fallback>` in `<div id="fateboard">` | `h1` + intro + link to `/draw`, visible to crawlers and no-JS visitors. An inline `<head>` script sets `html.js` before first paint and CSS hides the fallback under it, so JS visitors never see it flash on refresh (BUG-144); it matches what the app shows, so this is not cloaking. `createRoot` replaces it on mount |
| Icons / install | `public/site.webmanifest`, `apple-touch-icon.png`, `icon-192/512.png` | |
| Fonts | one Google Fonts `css2` request + `preconnect` | Only used faces download |
| Analytics | `src/lib/utils/analytics.ts`, called from `main.tsx` | gtag only when `MODE === 'production'` and `VITE_GA_ID` is set (CI: repo variable). No `%VITE_*%` placeholders in `index.html` |

Add a public route: add the `<Route>` in `rootRouter.tsx` **and** an entry in `SEO_ROUTES` (`prerender.test.ts` checks every entry is a router path).
Tests: `src/__tests__/seo.test.ts`, `src/app/seo/__tests__/*`, `lib/utils/__tests__/analytics.test.ts`, `e2e/seo.spec.ts`.

## Undo / redo

Snapshot stack in `createUndoRedoSlice` (JSON strings, max 21 entries). Toolbar/shortcut calls `undo()`, which
currently resolves to the **animation** history (BUG-001). Details in [CANVAS.md](CANVAS.md#history--snapshots).

## Pages, layers, animation (summary)

- **Pages**: `pages[]` each with `canvasJSON` + meta; switching = `loadFromJSON` into the single canvas, queued with
  `runExclusive`. UI: `organisms/page/PagePanel.tsx`.
- **Layers**: derived list rebuilt from `canvas.getObjects()` (recursive into groups); Fabric is the source of truth.
  UI: `organisms/layer/LayersPanel.tsx`.
- **Animation**: tracks keyed by `animId` on objects; `applyTracksAt(canvas, tracks, t)` writes props onto live
  objects; export renders frames through an offscreen compositor. UI: `organisms/AnimationPanel.tsx` (Animate tab).
