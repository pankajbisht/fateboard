# Code review — fateboard

Reviewed 2026-11-11 (branch `feat/storage-opendb-indexeddb`, working tree). Whole `src/` (271 source files, about
48,000 lines), measured with `.claude/skills/fate-review/scripts/metrics.mjs` and read where it flagged.
How to repeat it: skill `fate-review` or the `fate-reviewer` agent (docs/AGENT_WORKFLOW.md).

## Summary

The project is **well run but unevenly built**. Process, tests, CI and documentation are at a professional
level: guard tests enforce architecture rules, CI pins every action and audits dependencies, and every bug has
an ID and a test. The code itself has grown faster than its structure. A few very large files carry most of the
complexity, TypeScript's safety checks are switched off, and the store depends on the UI layer it is supposed to
serve. None of this is a launch blocker; it is what will slow the team down and let bugs through as the app grows.

The fix is not a rewrite. It is a ratcheted cleanup: stop it getting worse (done today, see "Guardrails"),
then split the worst files one per session, in the order of the roadmap below.

## Scorecard

| Area | Grade | Evidence |
|---|---|---|
| Tests and CI | ✅ Strong | 1011 unit tests, 111 Playwright, coverage ratchet, pinned actions, `npm audit` + signatures in CI |
| Process and docs | ✅ Strong | Definition of done, BUGS/DECISIONS logs, docs updated per change |
| Architecture rules | ⚠️ Good, partly violated | Guard tests for store keys, serialize path, storage; but R-04, R-05, R-08 below |
| Modularity | ❌ Weak | 39 files over the size budget, 8 over 1,000 lines; several 1,000-line components |
| Type safety | ❌ Weak | `strict: false`, `strictNullChecks: false`, store typed `any` (R-01), 254 `any` |
| Reuse (DRY) | ⚠️ | `clamp` defined 14 times; local copies of design-system atoms (R-07) |
| React practice | ✅ | Selectors everywhere (0 `useStore()` without selector), memoized long lists |
| Data safety | ✅ (one open) | Storage layer + failure handling (BUG-162/172/173); BUG-174 open |

## Findings

Severity: **P1** = breaks a project rule or hides bugs from the compiler; **P2** = maintainability and design;
**P3** = cleanup. All findings verified on 2026-11-11.

### R-01 [P1] The store is typed `any`, so slices call each other blind
- **Evidence:** `src/store/types.ts:6` `SliceCreator<T> = StateCreator<any, …>`. Inside every slice `get()` is
  `any`. Result: 31 defensive optional calls like `get().captureProject?.()` in `createCanvasSlice.ts` alone, and
  no compile error when a slice renames or removes an action another slice uses.
- **Principle:** explicit contracts between modules (Interface Segregation, fail at compile time).
- **Fix:** export `RootState` (intersection of every slice interface) from `src/store/types.ts` as a type-only
  import, and type `SliceCreator<T> = StateCreator<RootState, [['zustand/devtools', never]], [], T>`. Remove the
  `?.` on calls that always exist. Type-only, no runtime change. Do it before the slice splits below.

### R-02 [P1] TypeScript strict mode is off for the whole app
- **Evidence:** `tsconfig.app.json:34-38` (`strict`, `noImplicitAny`, `strictNullChecks` all false).
  `ExportCanvas.tsx:144` `const clamp = (value, min, max)` compiles with untyped parameters; null bugs are
  invisible to the compiler.
- **Fix:** strict island (done today: `tsconfig.strict.json`, run by `npm run type-check`, starts with
  `src/lib/storage`). Every folder that passes joins; refactored folders must join. Goal: whole `src`.

### R-03 [P2] God files: one file, many responsibilities
| File | Lines | What is mixed in it |
|---|---|---|
| `store/slices/createNodeEditorSlice.ts` | 1718 | Bézier/path math (parse, build, bounds, extrema), canvas overlay drawing, pointer interaction, store state; 76 `any` |
| `lib/utils/GradientTool.ts` | 1319 | Gradient model, on-canvas handles, pointer interaction, rendering |
| `store/slices/createCanvasSlice.ts` | 1254 | Canvas lifecycle, event wiring, autosave/restore, clipboard, toolbar state, JSON import/export |
| `components/organisms/effects/ui/ExportCanvas.tsx` | 1183 | One ~990-line component: size presets, raster render, SVG build, download, preview, 18 `useState` |
| `store/slices/createLayersSlice.ts` | 1067 | Layer list derivation, grouping, ordering, clipboard, selection |
| `components/organisms/layer/LayersPanel.tsx` | 814 | Panel, virtualized row, thumbnail cache, context menu, its own `IconButton` |
| `components/organisms/board/ui/CanvasBoard.tsx` | 644 | 12 effects: lifecycle, sizing, context menu, grid, offsets, floating toolbar |
- **Principle:** Single Responsibility; small modules are reviewable and testable.
- **Fix:** skill `fate-refactor`, one file per session, in the roadmap order below. Size budget guard added
  today (`src/__tests__/fileBudget.test.ts`): these files can no longer grow.

### R-04 [P1] Components and modules under `components/` change the Fabric canvas directly
- **Evidence:** `effects/ui/RepeatAlongPath.tsx` (Fabric lifecycle, falls back to `canvas.remove`, line 159),
  `fonts/applyFontTemplate.ts`, `filter/ui/filterEngine.ts`, `filter/ui/useImageFilters.ts`,
  `effects/ui/ExportCanvas.tsx:347-360` (temporarily resets the viewport to render; restored in `finally`).
- **Rule:** CLAUDE.md slice rule 4, "Only store actions mutate Fabric objects".
- **Risk:** each place must remember history, autosave and render on its own; the rule exists because that is
  where undo and autosave bugs came from.
- **Fix:** move document changes into store actions; move render-only code (export, filters) to `src/lib/` as
  functions that take the canvas, called by an action.

### R-05 [P1] Layers point the wrong way: the store imports the UI layer
- **Evidence:** `createCanvasSlice.ts:3-7`, `createSettingSlice.ts:9-10`, `createPagesSlice.ts:13`,
  `templateSlice.ts:3-13`, `createTextSlice.ts:4` import configs, types and template data from
  `@/components/...`. `src/lib/paintToggle.ts:1` imports from `@/store/slices/colorSystemFixes`.
- **Principle:** dependency direction `components → store → lib` (Dependency Inversion). Today a change to a
  panel folder can break the store, and the import graph has cycles waiting to happen (BUG-048 was one).
- **Fix:** move shared config/types/data (`board.config`, `board.type`, `designTemplateData`, `sizePresets`,
  `fontfamily.config`, `fateboard.config`) to `src/config/` (or `src/lib/<domain>/`). Mechanical, no behaviour
  change. Then add a guard test like `storageBoundary.test.ts` for the direction.

### R-06 [P2] A patch file lives in the store as production code
- **Evidence:** `store/slices/colorSystemFixes.ts` starts with "Drop-in fixes … HOW TO USE: 1. DELETE the old …".
  It is wired in (`createShapeStyleSlice`, `createTextSlice`) and imported by a component, a hook and `lib/`.
  It holds pure color math, Fabric gradient building and slice methods together, with module-level canvas
  contexts (`_ctx`, `_px`).
- **Fix:** pure color functions → `src/lib/color/`; slice methods into `createShapeStyleSlice`; delete the
  instructions header. Rename so the name says what it is.

### R-07 [P2] Duplication instead of reuse
- **Evidence:** `clamp` defined in 14 files (`ColorPickerPopover`, `CanvasBoard`, `ExportCanvas`,
  `GradientTool`, `colorMath`, `brushConfig`, 5 slices, …); `uid`, `typeOf`, `num` 4 times each. Local
  `IconButton` in `LayersPanel.tsx:141` next to `atoms/IconButton.tsx`; local `Section`/`Field` in
  `DrawPanel.tsx:38`, `Preferences.tsx:61` next to `PanelSection` / `molecules/Field`.
- **Fix:** `src/lib/utils/math.ts` (`clamp`, `round`, …) and use the atoms; do it inside the refactor of each file,
  not as a repo-wide sweep.

### R-08 [P2] Module-level mutable state in slices (rule 6)
- **Evidence:** `createAnimationSlice.ts:153-157` (`rafId`, `lastTs`, `exportCtl`, history throttling),
  `createLayersSlice.ts:118-120` (`idCounter`, `pasteCount`, `anchorId`), `templateSlice.ts:78`,
  `createShapeStyleSlice.ts:56`, `createShapeSlice.ts:323`, `createNodeEditorSlice.ts:154`.
- **Rule:** CLAUDE.md slice rule 6 ("No module-level mutable state in slices"). Tracked as BUG-175.
- **Risk:** state survives a store reset (tests, HMR) and is shared by every store instance; paste offsets and
  animation timers can leak between tests.
- **Fix:** move into the slice creator's closure, as `createCanvasSlice` does (`persistLock`, `persistTimer`).

### R-09 [P3] Silent `catch {}` outside storage
- **Evidence:** 22 `catch {` blocks; those in `lib/storage` are by contract (never throw, return false). Others
  (`createShapeSlice`, `createPagesSlice`, `createNodeEditorSlice`) swallow errors without a log.
- **Fix:** `console.error('[slice] …', error)` per the error-handling convention, or a comment saying why it is safe.

## What is good (keep doing it)

- **Guard tests as architecture enforcement** (store keys, one serialize path, one loader, storage boundary,
  file budget): rules that a test checks do not erode.
- **Slice creator + closure state** in `createCanvasSlice` (`persistLock`, timers): the right pattern; R-08 is
  about the slices that do not follow it.
- **Command objects for shortcuts** (`shortcut`, `keys`, `enabled`, `allowWhileTyping`): one source for toolbar,
  keyboard and help.
- **Contract + adapter storage layer** (`@/lib/storage`): the model for how other I/O (export, import) should look.
- **Ratchets** (lint warnings, coverage, file budget, strict island): improve monotonically, never big-bang.

## Refactor roadmap

One item per session with skill `fate-refactor` (plan via the `fate-architect` agent for items over ~800 lines).
Order = risk reduced per unit of effort.

| # | Item | Findings | Effort | Status |
|---|---|---|---|---|
| 0 | Guardrails: strict island, file budget, review/refactor skills and agents, PR template | R-02, R-03 | S | **done 2026-11-11** |
| 1 | Typed store (`RootState` in `SliceCreator`) | R-01 | M | open |
| 2 | Move shared config/data out of `components/` + direction guard test | R-05 | S | open |
| 3 | Module state → closures; `colorSystemFixes` → `lib/color` | R-08, R-06 | S | open |
| 4 | `ExportCanvas` → `lib/export/{raster,svg,download}` + hooks + sections | R-03, R-04 | M | open |
| 5 | `AnimationPanel` → `organisms/animation/` (one component per file) | R-03, R-07 | M | **done 2026-11-11** (19 files, all under budget; BUG-176) |
| 6 | `createNodeEditorSlice` → `lib/geometry/path` + overlay module + slice | R-03 | L | open |
| 7 | `LayersPanel` (row, thumbnail, context menu, atoms) | R-03, R-07 | S | open |
| 8 | `createCanvasSlice`: autosave/restore and event wiring into modules | R-03 | M | open |
| 9 | `CanvasBoard` effects → one hook per concern | R-03 | M | open |
| 10 | `GradientTool`, `createLayersSlice`, `templateSlice`, `shapeConnectors`; components that mutate Fabric | R-03, R-04 | L | open |
| 11 | Strict island folder by folder; remove `any` (lint ratchet down) | R-01, R-02 | ongoing | open |

## Guardrails added in this review

- `tsconfig.strict.json` + `npm run type-check`: strict TypeScript for `src/lib/storage`; folders join as they pass.
- `src/__tests__/fileBudget.test.ts`: `.tsx` ≤ 300 lines, `.ts` ≤ 400; 39 legacy files listed with their size as
  a ceiling (may shrink, never grow); data tables exempt.
- `.claude/skills/` (`fate-task`, `fate-review`, `fate-refactor`, `fate-readiness`) and `.claude/agents/`
  (`fate-reviewer`, `fate-architect`, `fate-verifier`): see docs/AGENT_WORKFLOW.md.
- `.github/pull_request_template.md`: the Definition of done as a checklist on every PR.

## Further enterprise practices (need an owner decision)

| Practice | Why | Cost |
|---|---|---|
| Error monitoring (e.g. Sentry, privacy-filtered) | Today a crash in a user's browser is invisible ("Remote error reporting: none") | Small; adds a vendor and a privacy note |
| Security headers / CSP on the Docker image and a `<meta>` CSP for Pages | BUG-165; limits damage from any future XSS | Small |
| CODEOWNERS + branch protection requiring "CI passed" | No merge without green CI and an owner's review | Settings only |
| Release process: version tags + CHANGELOG (conventional commits) | Know what is deployed; roll back by tag | Small |
| Bundle-size budget in CI | `/draw` ≈ 285 KB gzip today; a check stops silent growth | Small |
| Persistent storage request | BUG-174: browsers may delete saved boards | Small; Firefox prompt |
