# Testing

## End-to-end tests (Playwright) — implemented 2026-11-07

`npm run e2e` (report: `npm run e2e:report`). Config: `playwright.config.ts`; specs: `e2e/`.

- **What runs:** a production-like bundle (`npm run build:e2e` = `vite build --mode e2e --outDir dist-e2e`) served by
  `vite preview` on port 4173. The only difference from production is the read-only `window.__fateboard` hook
  (`src/test/e2eHook.ts`, loaded from `main.tsx` only when `import.meta.env.MODE === 'e2e'`; the production bundle has no
  reference to it, verified). Owner decision Q9.
- **How tests work:** they click the real UI (roles / labels); the hook only READS canvas content (`objects()`,
  `selection()`, `state(key)`, `ready()`), because Fabric draws pixels, not DOM.
- **Fixture (`e2e/fixtures.ts`):** fresh profile per test, opens `/draw`, waits for the canvas, and **fails any test with
  a console error or uncaught exception**. Helpers: `openPanel`, `openDockTab`, `addShape`, `clickEmptyCanvas`,
  `objects`, `selection`, `state`, `footer`, `footerView`, `textFloat`.
- **Projects:** `desktop-chromium` (1440×900, all specs), `laptop-chromium` (1024×700, `layout.spec.ts`) and
  `desktop-firefox` (1440×900, all specs; **CI only**, locally `E2E_FIREFOX=1` after `npx playwright install firefox`).
  Firefox could not start inside the agent's sandbox, so its first results come from CI: **UNKNOWN - verify on the first CI run**.
- **Known bugs** are `test.fail` in `e2e/known-bugs.spec.ts` (undo, ⌘B, Delete key): they pass while the bug exists and
  turn red when it is fixed; remove the marker with the fix.
- **CI:** job `e2e` (installs Chromium, runs the suite, uploads `playwright-report` on failure); `build-deploy` `needs: e2e`.
- **Stability (2026-11-09):** 76 specs on Chromium, 152 / 152 green over two full runs (`--repeat-each=2`);
  the former flaky deselect test 20 / 20. Firefox runs the same specs in CI.

| Spec | Covers |
|---|---|
| `smoke.spec.ts` | editor shell; routes `/`, `/setting`, `/help`, 404 |
| `shapes.spec.ts` | add shape, type W + click canvas (commit before deselect), counter ± / Shift, footer fill / stroke toggles, disabled with nothing selected, Backspace deletes |
| `text.spec.ts` | one text float (font, size, style, align) for text boxes and sticky notes; no header text tools |
| `color.spec.ts` | palette strip swatch + ring, All colors grid, custom picker hex + Recent |
| `many-objects.spec.ts` | busy boards: Layers list mounts only part of a long list and stays usable; hover outline on the top canvas in the right place (retina), nothing left behind |
| `canvas-keys.spec.ts` | ⌘A selects all; arrows nudge, one undo per run; hold Space drags the view, keeps the selection and moves nothing |
| `help.spec.ts` | Help search reaches inside topics, topic URLs and Back, press-to-find, node demo; links open the right panel / tab; Text link adds nothing |
| `pages.spec.ts` | add / switch pages, objects per page, Clear page with confirm |
| `zoom.spec.ts` | footer zoom − / + / 100% / Fit |
| `file.spec.ts` | Save downloads the whole project (all pages); Open restores it |
| `export.spec.ts` | Export tab downloads a real PNG (signature checked) |
| `settings.spec.ts` | theme / icon size apply and persist; only working preferences; Large icons size swatches |
| `seo.spec.ts` | hash links redirect, per-route head, build files; SEO fallback hidden while the app loads, visible without JS (BUG-144) |
| `persistence.spec.ts` | autosave survives reload; all pages + the open page survive reload (BUG-004); an imported photo survives reload (BUG-121) |
| `mobile.spec.ts` | 390 × 844: the editor shows the desktop-only notice, Continue anyway is remembered for the session; the landing page has no notice and no horizontal scroll |
| `a11y.spec.ts` | axe (WCAG 2.1 A / AA + best-practice) on `/`, `/draw`, `/setting`, `/help`, light + dark, reduced motion: zero violations |
| `units.spec.ts` | Settings > Units (mm) shows in the footer page size and the top-bar W field (BUG-082) |
| `whiteboard.spec.ts` | whiteboard with the grid on shows one grid renderer (BUG-107) |
| `keyboard.spec.ts` | Delete key deletes like Backspace (BUG-103); ⌘B / ⌘I / ⌘U style text (BUG-096) |
| `geometry.spec.ts` | two pages with different sizes keep them across switches and reload; backstore = page, identity viewport; a click selects the shape under the cursor (BUG-007, BUG-109) |
| `templates.spec.ts` | applying a template shows an Undo toast; Undo brings the previous content back (BUG-009) |
| `animation.spec.ts` | a keyframe survives reload; each page has its own timeline (BUG-010, Q12) |
| `placement.spec.ts` | one place per feature in the real UI |
| `layout.spec.ts` | no horizontal scroll, header / footer inside the window, footer 16 px inset (both viewports) |
| `known-bugs.spec.ts` | expected failures for open bugs (none open today) |

## Current state (after batch 1, 2026-11-06)

- **15 test files, 117 tests**: 115 passed and 1 macOS-only test skipped under the agent's runner (see below); the
  1 app integration test needs real Vitest. New in batch 1:
  `src/test/{fakeCanvas,sliceHarness}.ts` (helpers), `src/animation/__tests__/engine.test.ts`,
  `src/store/slices/__tests__/create{Setting,Page,Pages,UndoRedo,Layers,Animation}Slice.test.ts`,
  `src/store/__tests__/storeComposition.test.ts` (collision freeze + `it.fails` for BUG-001/017),
  `src/components/config/toolbars/__tests__/fileCommands.test.ts` (BUG-040),
  `src/lib/utils/__tests__/shortcuts.test.ts`; `src/__tests__/store/brushSlice.test.ts` rewritten (was stale).
- **How they were run:** the agent shell could not run Vitest (macOS `node_modules`, Linux shell, no network for
  Linux binaries). The tests were executed with a throwaway Node runner (TypeScript transpile + jsdom + a small
  `vitest` shim) and all passed except `app.integration.test.tsx`, which needs `vi.mock` hoisting. **Run
  `npm run test:run` locally to confirm under real Vitest.**
- **Color task (after batch 1): 17 test files, 135 tests** (133 passed + 1 skipped under the agent runner; app
  integration still needs real Vitest). New: `src/store/slices/__tests__/paletteRouting.test.ts` (palette →
  target / selection / defaults, `toOpaqueHex`) and `src/components/molecules/__tests__/PaintTargetSwatch.test.tsx`.
- `npm run type-check` now really checks (`tsc -p tsconfig.app.json` + `tsconfig.node.json`) and passes with 0 errors.
- Helpers: `createHarness([...sliceCreators], extraState)` runs slices without zustand/React;
  `createFakeCanvas(objects)` implements the canvas API slices use (events, JSON round-trip, z-order, size/VPT).
- CI: `ci.yml` only wires reusable workflows (`workflow_call`), one file per stage; shared setup in `.github/actions/setup-node-deps`. Parallel `quality.yml` (signatures + prod `npm audit`, format, lint, type-check, unit + coverage ratchet), `e2e.yml` (Playwright, cached browsers) and `build.yml` → one `CI passed` check → `deploy.yml` (push to `main` only, `actions/deploy-pages`, `github-pages` environment). Actions pinned by SHA; Dependabot weekly (`.github/dependabot.yml`).

## Original state (before batch 1)

- Vitest 5.1 + jsdom 31 + Testing Library (react 16.3, dom 10.4, jest-dom 7) are pinned (Node 26.13.0). Config: `vitest.config.ts` (`globals`, `jsdom`,
  `setupFiles: src/setupTests.ts`, `include: src/**/*.{test,spec}.{ts,tsx}`, coverage provider `v8`).
- Existing tests (5 files): `src/__tests__/smoke.test.tsx`, `app.integration.test.tsx` (marketing → editor
  navigation with mocked pages and Fabric), `atoms/button.test.tsx`, `atoms/input.test.tsx`,
  `store/brushSlice.test.ts`. Whether they pass today is **UNKNOWN - verify** (`npm run test:run`). The brush test
  asserts direct `freeDrawingBrush` writes and may be stale against the current `setBrush`.
- `src/setupTests.ts` mocks `matchMedia` and replaces `HTMLCanvasElement.prototype.getContext` with a partial 2D stub,
  then spies on `fabric.Canvas.prototype.requestRenderAll`.
- `test:coverage` uses `@vitest/coverage-v8` 5.1.0 (pinned with vitest); see Health report.
- No E2E framework. CI runs `npm run test:run` after the build.

## Strategy

| Layer | Tool | What | Where |
|---|---|---|---|
| Pure logic | Vitest | engine maths (`easeKeyframe`, `sampleTrack`, `mergeKeyframes`, `buildPreset`), `sanitizeSettings`, `resolvePageSize`, shortcut matching (`replaceToShortcut`), shape catalog/normalizers, pattern rules | next to source in `__tests__/` |
| Slices | Vitest | each slice in isolation with a stub `set/get` (fake canvas), plus **store-composition** tests on the real `combinedSlice` | `src/store/slices/__tests__/` |
| Canvas integration | Vitest + real Fabric objects | serialization round-trips, history, page switching, load/save; uses Fabric objects with a mocked 2D context | `src/store/__tests__/integration/` |
| Panels/components | React Testing Library (+ `@testing-library/user-event`) | panels render from store state and call the right actions; keyboard scoping | `src/components/**/__tests__/` |
| End-to-end | Playwright (Chromium first; WebKit later for export) | critical user flows in a real browser (real canvas, real downloads, real storage) | `e2e/` at repo root |

Principles:
- **Every bug fix starts with a failing test** that reproduces it (use the "Test needed" column in BUGS.md).
- Known bugs that are not fixed yet may get `it.fails('BUG-00X …')`, so CI stays green and the test flips
  automatically when fixed. Remove `.fails` in the fixing PR.
- Tests must not depend on module-level state. Build a **fresh store per test** (see harness below). Note:
  `createPagesSlice` `opChain` and `createAnimationSlice` `rafId`/`exportCtl` are module-level today (BUG-035).
- Prefer asserting on Fabric/canvas state and store state over DOM snapshots.

## Folder layout (proposed)

```
src/
  test/                       # shared test utilities (not shipped)
    fakeCanvas.ts             # minimal Fabric-like canvas for pure slice tests
    makeStore.ts              # fresh zustand store from combinedSlice or a subset of slices
    renderWithStore.tsx       # RTL render + store reset
  store/slices/__tests__/     # one file per slice: create<Name>Slice.test.ts
  store/__tests__/            # composition + integration (collisions, serialization, pages+history)
  animation/__tests__/        # engine + export maths
  components/**/__tests__/    # RTL panel tests
e2e/
  smoke.spec.ts
  fixtures/                   # sample .fateboard / project files
playwright.config.ts
```

Existing `src/__tests__/` can stay; new tests go next to the code they test.

## Mocking Fabric.js

Three levels; use the lightest that proves the behaviour:

1. **Fake canvas (pure slice tests).** A plain object implementing only what the slice calls. Fast and
   deterministic.
   ```ts
   // src/test/fakeCanvas.ts
   export function createFakeCanvas(initial: any[] = []) {
       let objects = initial.map((o) => ({ ...o }));
       const handlers: Record<string, Function[]> = {};
       return {
           getObjects: () => objects,
           add: (...o: any[]) => { objects.push(...o); handlers['object:added']?.forEach((h) => h({ target: o[0] })); },
           remove: (...o: any[]) => { objects = objects.filter((x) => !o.includes(x)); },
           toObject: (_props?: string[]) => ({ version: 'test', objects: objects.map((o) => ({ ...o })) }),
           loadFromJSON: async (json: any) => {
               const data = typeof json === 'string' ? JSON.parse(json) : json;
               objects = (data.objects ?? []).map((o: any) => ({ ...o }));
           },
           discardActiveObject: () => {}, setActiveObject: () => {},
           getActiveObject: () => null, getActiveObjects: () => [],
           requestRenderAll: () => {}, renderAll: () => {},
           on: (n: string, h: Function) => ((handlers[n] ??= []).push(h), () => {}),
           off: (n: string, h: Function) => { handlers[n] = (handlers[n] ?? []).filter((x) => x !== h); },
           fire: (n: string, e: any) => handlers[n]?.forEach((h) => h(e)),
           getWidth: () => 800, getHeight: () => 600, getZoom: () => 1,
           viewportTransform: [1, 0, 0, 1, 0, 0],
       };
   }
   ```
2. **Real Fabric objects, mocked 2D context (integration).** `new fabric.Rect({...})`, `toObject`, `clone`, and
   `loadFromJSON` on a `fabric.StaticCanvas` work in jsdom with a canvas mock. Replace the hand-written stub in
   `setupTests.ts` with **`vitest-canvas-mock`** (`import 'vitest-canvas-mock'` in setup), which implements the full
   2D API, so Fabric can construct `Canvas`/`StaticCanvas`. **UNKNOWN - verify** that Fabric 7's `Canvas` (with an
   upper canvas) constructs under jsdom; if not, use `StaticCanvas` for data tests and leave pointer behaviour to
   Playwright.
3. **Module mock (component tests that only need "a canvas").** `vi.mock('fabric', …)` as in
   `app.integration.test.tsx`. Use sparingly: it hides real API misuse (BUG-014).

Never mock zustand. Create a real store per test:

```ts
// src/test/makeStore.ts
import { create } from 'zustand';
import { combinedSlice } from '@/store';
export const makeStore = () => create<any>()(combinedSlice as any);
```

> `combinedSlice` is exported from `src/store/index.ts`, but importing that module also creates the app's
> `useStore` singleton. That is acceptable in tests; the harness uses its own instance.

## Health report (how to check how much works)

| Report | Command | Open |
|---|---|---|
| Unit + component coverage (per area, per file, per line) | `npm run test:coverage` | `coverage/index.html` (totals also in `coverage/coverage-summary.json`) |
| End-to-end results (real browser, every user flow) | `npm run e2e`, then `npm run e2e:report` | Playwright HTML report |
| Both | `npm run report` | the two above |

Coverage is measured on app code only (`src/**`, without tests and `src/test` helpers). It counts unit / component
tests; the Playwright suite exercises flows on top of that (e.g. Export is 6 % in unit coverage but covered end to end).
Only files that tests load are counted, so a test that imports a config full of panels adds all of them to the total
(BUG-153). Guard tests that only need ids read the config as text, like `helpTopics.test.ts` and `panelConsistency.test.ts`.

Snapshot 2026-11-07 (87 unit files, 631 tests; 44 E2E tests in 15 specs, plus 3 known-bug expected failures):

| Area | Lines covered |
|---|---|
| hooks | 97 % |
| UI atoms | 92 % |
| UI molecules | 91 % |
| animation engine | 59 % |
| store slices | 58 % (UndoRedo 99 %, Dialog 97 %, Pages 87 %, Text 86 %; low: advanceOperation 7 %, Filter 17 %, Background 21 %, Shape 27 %) |
| UI panels (organisms) | 48 % |
| lib (canvas logic) | 36 % |
| **Total (2026-11-09)** | **54 % lines, 45 % branches** (CI ratchet: 54 / 45 / 54 / 52) |

Must-have flows verified end to end (all green): add / select / move / resize shapes, colors, text, text shapes,
drawing, duplicate, copy / paste, group / ungroup, delete, lock, layer order, align, undo / redo (keyboard, buttons,
fields, text, per page), node tool (all catalog shapes, toolbar, switching), pages, save / open, export PNG (also
filtered photos), zoom, settings, layout. Open known bugs are listed in `e2e/known-bugs.spec.ts` (Delete key,
⌘B while typing, pages after reload).

## Coverage targets (proposal; enforce after the first fixes land)

| Scope | Lines | Branches |
|---|---|---|
| `src/animation/engine.ts`, pure helpers in `src/lib`, `createSettingSlice` helpers | 90% | 80% |
| `src/store/slices/*` (core: Canvas, UndoRedo, Page, Pages, Layers, Shape, Animation) | 80% | 70% |
| Other slices | 60% | 50% |
| `src/components/**` | 50% | n/a |
| Global floor (target) | 60% | n/a |

Today CI enforces a **ratchet** at the current level (`vitest.config.ts` `coverage.thresholds`: statements 52, branches 45, functions 54, lines 54); `test:coverage` fails below it. Raise the numbers as coverage grows until the 60% floor.

## Critical flow tests (what each must cover)

| Flow | Level | Must assert |
|---|---|---|
| Store integrity | unit | every slice key is unique (BUG-002); `undo`/`redo` are the canvas history (BUG-001) |
| Serialization contract | integration | an object with every custom prop survives autosave, undo snapshot, page capture, project export/import, `.fateboard` save/open (BUG-003) |
| Undo/redo | unit + E2E | each add/remove/modify/path is one step; redo after undo; new change clears redo; history paused during load; per-page (BUG-005/006) |
| Autosave/restore | integration + E2E | edit → reload → same objects; no save of half-loaded canvas (`persistLock`); `flushPersist` on `pagehide` |
| Pages | integration + E2E | add/duplicate/delete/switch keeps each page's content and size; survives reload (BUG-004: `store/__tests__/projectPersistence.test.ts`, `e2e/persistence.spec.ts`) |
| Layers | unit | sync from canvas, lock blocks delete/move, group/ungroup keeps world transform, z-order ops |
| Canvas geometry | integration + E2E | preset switch: backstore = preset, VPT identity; pointer hits the object under the cursor (BUG-007: `store/__tests__/geometryOwner.test.ts`, `e2e/geometry.spec.ts`) |
| Keyboard | RTL + E2E | shortcuts run the right command; typing in inputs/text editing is ignored; panel-scoped keys don't leak (BUG-018); Ctrl+O never clears (BUG-040) |
| Animation | unit + integration | sampling/easing, presets, keyframe edits + undo, rest state never saved (BUG-011), data persists per page (BUG-010): `animation/__tests__/animationPersistence.test.ts`, `e2e/animation.spec.ts` |
| Export | integration + E2E | PNG dimensions = page size at 1×; JSON export re-imports; video export produces a non-empty file (Chromium) |
| Templates | integration + E2E | applied template fits the artboard (BUG-008); previous content recoverable (BUG-009: `store/__tests__/templateUndo.test.ts`, `e2e/templates.spec.ts`) |
| Crash recovery | RTL | render error → fallback with Reload / Download autosave / confirmed clear (`organisms/__tests__/ErrorBoundary.test.tsx`) |
| Bundle / assets | source + file scan | pages lazy-loaded (`__tests__/codeSplitting.test.ts`); template thumbnails < 150 KB, images < 1 MB (`__tests__/templateAssets.test.ts`) |
| No debug logging | source scan | no `console.log` in shipped code (`__tests__/noConsoleLog.test.ts`, BUG-104) |
| One serialize path | source scan | no canvas-level `toObject` / `toJSON` outside `lib/serialization` (`__tests__/oneSerializeList.test.ts`, BUG-003) |

---

## Phase 3 proposal: test foundation (Playwright part implemented, see top)

### Packages to install (dev)

```bash
npm i -D @playwright/test @testing-library/user-event vitest-canvas-mock
npx playwright install chromium
```

(Versions: latest compatible with Vitest 5 / Node 26. `.npmrc` pins them exactly.)

### Config files

1. **`vitest.config.ts`** (update):
   ```ts
   import { defineConfig } from 'vitest/config';
   import tsconfigPaths from 'vite-tsconfig-paths';
   export default defineConfig({
       plugins: [tsconfigPaths()],
       test: {
           globals: true,
           environment: 'jsdom',
           setupFiles: ['src/setupTests.ts'],
           include: ['src/**/*.{test,spec}.{ts,tsx}'],
           exclude: ['e2e/**', 'node_modules/**'],
           restoreMocks: true,
           coverage: {
               provider: 'v8',
               reporter: ['text', 'html', 'lcov'],
               include: ['src/**/*.{ts,tsx}'],
               exclude: ['src/**/__tests__/**', 'src/test/**', 'src/**/*.d.ts', 'src/components/pages/web/**'],
               // thresholds: { lines: 60 },  // enable after the first milestone
           },
       },
   });
   ```
2. **`src/setupTests.ts`**: add `import 'vitest-canvas-mock';` at the top and remove the hand-written
   `getContext` stub (keep `matchMedia`). Add `afterEach(() => localStorage.clear())`.
3. **`playwright.config.ts`** (new):
   ```ts
   import { defineConfig, devices } from '@playwright/test';
   export default defineConfig({
       testDir: 'e2e',
       timeout: 30_000,
       retries: process.env.CI ? 2 : 0,
       use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry', acceptDownloads: true },
       webServer: { command: 'npm run build:no-check && npm run preview -- --port 4173', port: 4173, reuseExistingServer: !process.env.CI },
       projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
   });
   ```
4. **`package.json` scripts** (add): `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`;
   change `"type-check"` per BUG-012.
5. **CI**: done, see "Current state" above (Playwright report + traces uploaded on failure).
6. **Test hook (small source change, needs approval: DECISIONS Q9):** expose the store for E2E only:
   `if (import.meta.env.MODE !== 'production' || import.meta.env.VITE_E2E) (window as any).__fateboard = useStore;`
   This lets E2E read `canvas.getObjects().length` instead of comparing pixels.

### Sample slice test: `createUndoRedoSlice` (isolated) + store composition

```ts
// src/store/slices/__tests__/createUndoRedoSlice.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUndoRedoSlice } from '../createUndoRedoSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';

function setup(objects: any[] = []) {
    const canvas = createFakeCanvas(objects);
    let state: any = { canvas, clearToolbar: vi.fn(), persist: vi.fn() };
    const set = (patch: any) => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; };
    const get = () => state;
    state = { ...state, ...createUndoRedoSlice(set as any, get as any, {} as any) };
    return { canvas, get };
}

describe('createUndoRedoSlice', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('initHistory stores one base snapshot and cannot undo', () => {
        const { get } = setup();
        get().initHistory();
        expect(get().undoStack).toHaveLength(1);
        expect(get().canUndo).toBe(false);
    });

    it('saveState is debounced and deduplicated', () => {
        const { canvas, get } = setup();
        get().initHistory();
        canvas.add({ type: 'rect', left: 0 });
        get().saveState(); get().saveState();
        vi.advanceTimersByTime(150);
        expect(get().undoStack).toHaveLength(2);
        get().saveState(true); // nothing changed
        expect(get().undoStack).toHaveLength(2);
    });

    it('undo restores the previous snapshot and redo re-applies it', async () => {
        const { canvas, get } = setup();
        get().initHistory();
        canvas.add({ type: 'rect', left: 0 });
        get().saveState(true);
        await get().undo();
        expect(canvas.getObjects()).toHaveLength(0);
        expect(get().canRedo).toBe(true);
        await get().redo();
        expect(canvas.getObjects()).toHaveLength(1);
    });

    it('does not record while paused', () => {
        const { canvas, get } = setup();
        get().initHistory();
        get().pauseHistory();
        canvas.add({ type: 'rect' });
        get().saveState(true);
        expect(get().undoStack).toHaveLength(1);
    });
});
```

```ts
// src/store/__tests__/storeComposition.test.ts
import { it, expect } from 'vitest';
import { makeStore } from '@/test/makeStore';

// Canvas undo works on `undoStack`; the animation undo works on `past`/`future`.
it.fails('BUG-001: store.undo is the canvas history action', () => {
    const store = makeStore();
    expect(store.getState().undo.toString()).toContain('undoStack');
});
```

(The composition test is intentionally simple; after BUG-002 the guard in `combinedSlice` makes it redundant.)

### Playwright smoke test plan (`e2e/smoke.spec.ts`)

Preconditions: fresh browser context (empty storage); open `/draw`; wait for `.upper-canvas`. Default preset is
"YouTube Thumbnail" 1280×720 (`CANVAS_PRESETS[0]`).

| # | Step | Action | Assert | Known blockers |
|---|---|---|---|---|
| 1 | Editor loads | `goto('/draw')` | `.upper-canvas` visible; no console errors; `__fateboard.getState().canvas` not null | |
| 2 | Draw shape | click rail button `aria-label="Shapes"` → tile `aria-label="Rectangle"` | object count = 1; Layers panel shows "Rectangle 1" | |
| 3 | Draw freehand | rail `aria-label="Draw"`, drag across the canvas with `page.mouse` | one more object (`path`) | |
| 4 | Undo | `Control+z` (`Meta+z` on mac) | count back to 1 (path removed), rectangle still there | **BUG-001**, **BUG-006**: mark `test.fail()` until fixed |
| 5 | Redo | `Control+Shift+z` | count = 2 | BUG-001 |
| 6 | Autosave + reload | wait 500 ms, `page.reload()` | count restored; rectangle keeps `customType: 'shape'` | BUG-003 (props) |
| 7 | Save file | click File → "Save Board" (its `title`/`aria-label` are undefined, BUG-043; locate by tooltip text or add `data-testid`) | `download.suggestedFilename() === 'drawing.fateboard'`; JSON has 2 objects | |
| 8 | Export PNG | dock tab "Export" → format PNG → Export | download event; PNG signature bytes; width×height = 1280×720 at 1× | BUG-007 if a page op ran |
| 9 | Shortcut safety | press `Control+o` | object count unchanged | **BUG-040**: `test.fail()` until fixed |

Selector gaps to fix with small `data-testid` additions (approval needed, DECISIONS Q9): FileBar buttons
(`aria-label={action.tooltip}` is always `undefined`), Export button, dock tab buttons.

Later suites: pages (`e2e/pages.spec.ts`), layers, animation export (Chromium WebCodecs), templates.
