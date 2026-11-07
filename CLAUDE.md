# fateboard: CLAUDE.md

Browser canvas editor (design pages + whiteboard) built on **Fabric.js 7.1** (code comments still say "v6"), React 19,
TypeScript, Tailwind 4, zustand 5 slices, opendb-store. Static SPA on GitHub Pages (`BrowserRouter` + build-time page per route, see docs ARCHITECTURE "SEO"). Editor route: `/draw`.
Goal: production grade (no known bugs, docs, unit + E2E tests). Details live in `docs/`; this file stays short.

## Commands (from package.json)

| Task | Command | Notes |
|---|---|---|
| Install | `npm ci` | Node 26.13.0 exactly (`.nvmrc`, `engines`, `engine-strict`); husky installs on `prepare`. All versions exact; never add `^`/`~` |
| Dev | `npm run dev` | Vite dev server |
| Build | `npm run build` | `prebuild` runs type-check, then `tsc -b && vite build`. Needs `VITE_SITE_URL` in `.env` (see `.env.example`); fails without it |
| Build (no type-check) | `npm run build:no-check` | `vite build` only; CI uses `npm run build` |
| Preview | `npm run preview` | serves `dist/` on 0.0.0.0 |
| Lint | `npm run lint` | ESLint 9 flat config |
| Format | `npm run format` / `npm run format:check` | Prettier, `src/**` |
| Typecheck | `npm run type-check` | `tsc -p tsconfig.app.json` + `tsconfig.node.json`, must be 0 errors |
| All checks | `npm run check` | lint + type-check + format:check |
| Unit tests | `npm run test:run` (CI) · `npm test` (watch) | Vitest + jsdom |
| Coverage | `npm run test:coverage` | HTML at `coverage/index.html`; `npm run report` = coverage + E2E (docs/TESTING.md "Health report") |
| E2E | `npm run e2e` (report: `npm run e2e:report`) | Playwright 1.64.1, Chromium (+ Firefox in CI or with `E2E_FIREFOX=1`); builds `--mode e2e` and runs `e2e/` against `vite preview`. First time: `npx playwright install chromium` |

## Folder map

```
src/
  main.tsx, App.tsx, app/rootRouter.tsx   entry + routes
  store/index.ts                          ONE zustand store = spread of 25 slice creators (order matters)
  store/slices/                           create<Name>Slice.ts (canvas, pages, undo, layers, animation, …)
  store/brushConfig.ts                    brush presets/engines
  animation/                              keyframe engine + video export (WebCodecs / MediaRecorder)
  components/{atoms,molecules,organisms,templates,pages}   atomic design
  components/organisms/board/ui/CanvasBoard.tsx            mounts the Fabric canvas (design/whiteboard)
  components/organisms/editorsidebar/editorsidebar.config.tsx  left panels
  components/config/tabs.config.tsx       right dock tabs
  components/config/toolbars/ui/*Config.tsx  toolbar buttons = keyboard commands
  lib/                                    patterns, connectors, text-in-shape, gradient tool, serialization, storage (IndexedDB project autosave), utils
  hooks/                                  keyboard shortcuts, shape catalog/factory
  feature/import/                         image/SVG/JSON import
  test/                                   test helpers: fakeCanvas.ts, sliceHarness.ts (not shipped)
  types/                                  global.d.ts only (Fabric shims removed; real Fabric 7 types)
docs/                                     ARCHITECTURE, STATE, CANVAS, COMPONENTS, CONVENTIONS, TESTING, BUGS, ROADMAP, DECISIONS
```

Dead code was deleted in batch 1. Every file under `src/` is now reachable from `main.tsx` (or is a test/helper); keep it that way.

## Coding conventions (summary; full: docs/CONVENTIONS.md)

- Prettier: 4 spaces, single quotes, width 100, trailing commas. Run `npm run format` on touched files.
- Import the store via `import { useStore } from '@store'`; aliases `@/`, `@components/`, `@lib/`, `@hooks/`.
- Components read state with selectors: `useStore((s) => s.x)`. Never `useStore()` without a selector.
- Fabric: `await canvas.loadFromJSON(json)` (no callback). Always set `originX/originY` (v7 defaults to center).
- Serialize only through `serializeCanvas` / `CUSTOM_PROPS` (`@/lib/serialization`); a guard test fails on any other canvas `toObject`/`toJSON`.
- Icons: `<Icon name="…" />` from `@/components/atoms/Icon` (Lucide). Never Font Awesome classes.
- Panels: content only, inside `templates/PanelLayout` (one header). Build with `PanelSection`/`Field`/`SliderField`/`Select`/`Switch`/`SegmentedControl`/`Chip`/`Input`/`Textarea`/`Button`; panel-level action = `PanelAction`, other buttons `Button size="sm"`/`IconButton`; no raw `<select>`/range/checkbox, no `gray-*`/`white` (use `surface`/`ink`/`line` tokens so dark mode works).
- UI colors/text/radius: brand tokens only (`bg-primary-600`, `text-primary-ink` for brand text, `text-ink`, `text-title`, `rounded-md`; canvas: `BRAND` from `@lib/theme`). See docs/DESIGN.md.
- Errors: actions never throw to React; `try/catch` + `console.error('[slice] …')` + return falsy.

## Slice pattern rules

1. One store. Add slices to `combinedSlice` in `src/store/index.ts`, **before** `createAnimationSlice`.
2. Every key must be unique across all slices and each slice spread once; `src/__tests__/storeKeys.test.ts` fails otherwise (no collisions left, BUG-002).
3. Fabric canvas is the source of truth for content; store mirrors UI state; derived lists are rebuilt from canvas.
4. Only store actions mutate Fabric objects. Document-changing actions: mutate → `requestRenderAll()` → history → autosave.
5. Canvas listeners: register in one place, keep disposers, unregister on `dispose`; ignore helpers (`excludeFromExport`).
6. No module-level mutable state in slices (use closures). Type slices with `SliceCreator<YourSlice>`.
7. Cross-slice dependencies are listed per slice in `docs/STATE.md`; update it when you add one.

## Never do

- Never rename or remove a public slice key/action without asking (see "How we work").
- Never call `canvas.clear()` / `loadFromJSON` outside the canvas/pages slices (bypasses persist lock + history).
- Never add a second zustand store, a second Fabric canvas for the editor, or another serialize-props list.
- Never add helper objects (handles, guides) to the canvas without `excludeFromExport` + layer/snap exclusion flags.
- Never write a new geometry/zoom path: `CanvasBoard` sizes the canvas, the Page slice (`setZoom`, `zoomToRect`) zooms, `selectedPreset` is the page size (BUG-007, docs/CANVAS.md).
- Never use `alert()`, leave `console.log`, or add `any` to store code.
- Never edit `node_modules`, `dist/` or `.env`. Never re-add a static import from a slice to a module that imports the store (BUG-048).
- Never commit with failing lint, type-check, or tests; never skip hooks (`--no-verify`).

## Definition of done

- [ ] Root cause fixed; related issues listed, not silently fixed.
- [ ] Failing test written first, now passing (unit/RTL and, for user flows, Playwright).
- [ ] `npm run lint` (0 errors), `npm run type-check`, `npm run test:run`, `npm run build` all pass.
- [ ] Matching `docs/` file updated; bug marked `fixed (<ref>)` in `docs/BUGS.md`; decisions logged in `docs/DECISIONS.md`.
- [ ] Manually checked in `npm run dev` for UI changes (state what you checked).
- [ ] Final report lists files changed.

## Docs

- [Architecture](docs/ARCHITECTURE.md): layers, data flow, canvas ownership, save/load
- [State](docs/STATE.md): every slice, key collisions
- [Canvas](docs/CANVAS.md): Fabric lifecycle, events, serialization, history, zoom/pan, perf
- [Components](docs/COMPONENTS.md): panels, props, slices used, dead code
- [Conventions](docs/CONVENTIONS.md): naming, TS, errors, how to add a slice/panel/tool
- [Testing](docs/TESTING.md): strategy, mocking Fabric, coverage, Playwright plan
- [Bugs](docs/BUGS.md): audit table (IDs `BUG-0xx`)
- [Roadmap](docs/ROADMAP.md): milestones + features with blocking bugs
- [Decisions](docs/DECISIONS.md): inferred ADRs + open questions (Q1–Q12)
- [Production readiness](docs/PRODUCTION_READINESS.md): verdict, scorecard, what is left (P0 / P1 / P2)
- [Design](docs/DESIGN.md): brand tokens (colors from the logo), text styles, radius, contrast rules, dark mode, panel rules

## How we work

- **One task per session.** Start by restating the task, reading the relevant `docs/` files, then **plan first**
  (files to touch, tests to add, risks). Wait for approval if the plan touches a public slice API or a decision in Q1–Q12.
- **Root-cause fixes only.** No symptom patches. If you find related issues, list them in the report (and add them to
  `docs/BUGS.md` as `open`). Do not silently fix them.
- **Every fix or feature ships with tests and doc updates:** a test that failed before and passes after, the matching
  `docs/` file updated, and the bug marked fixed in `docs/BUGS.md`.
- **Minimal, reviewable changes.** Smallest diff that solves the task; no drive-by refactors or reformatting of
  untouched code. End every session with the list of files changed and the commands you ran with their results.
- **Never rename public slice APIs without asking** (store keys/actions used by components or other slices).
- If something is unknown, write `UNKNOWN - verify` rather than guessing.
