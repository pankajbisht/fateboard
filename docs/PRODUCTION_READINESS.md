# Production readiness — fateboard

Checked 2026-11-07 on `main` (uncommitted work included), re-checked after the P0 data-safety batch the same day.
Evidence: unit tests, the Playwright suite, a cross-browser run (earlier pass), an axe accessibility scan, bundle / load
measurements and `docs/BUGS.md`.

## Verdict: **ready for a public beta, not yet for a full production launch**

The data-loss blockers are fixed and covered end to end: every page autosaves and survives a reload (IndexedDB, BUG-004),
undo / redo works per page (BUG-001 / 005 / 006 / 090), applying a template is one undo step with an Undo toast
(BUG-009), animation is saved per page and never saves mid-animation values (BUG-010 / 011), imported photos survive a
reload (BUG-121), and a render error shows a recovery screen instead of a blank page. What is left is architecture
debt (store key collisions, three canvas-sizing systems), accessibility, bundle size and Firefox / mobile checks:
real problems, but they no longer lose users' work. Ship as a clearly labelled beta; finish P0-architecture and P1
before calling it production.

## Scorecard

| Area | Status | Evidence |
|---|---|---|
| Core editing flows | ✅ Works | 60 Playwright tests green on Chromium + 2 expected failures for open bugs; 703 unit tests green (101 files) |
| Data safety | ✅ Fixed | All pages + open page autosaved to IndexedDB (BUG-004); undo per page; template apply undoable (BUG-009); animation saved per page, rest values only (BUG-010 / 011); photos saved as data URLs (BUG-121). Residual: last edit < 300 ms before closing the tab may be lost (BUG-138) |
| Robustness | ✅ Done | `ErrorBoundary` around the routes: Reload / Download autosave / Start with an empty board. No remote error reporting yet |
| Architecture | ❌ Blocker for full launch | 17 colliding store keys (BUG-002); 3 canvas-sizing systems (BUG-007, Q2 decided, not applied); template artboard identity lost after undo / reload (BUG-139). Serialization: one list everywhere except Share (BUG-003, guarded by a test) |
| Feature placement | ✅ Done | One place per feature, guarded by `featurePlacement.test.ts` and `e2e/placement.spec.ts` |
| Tests | ⚠️ Partial | Unit coverage 49 % lines / 41 % branches (was 38 / 32); E2E 60 tests (Chromium; WebKit 33 / 33 in the earlier pass); Firefox not verified |
| Code quality | ⚠️ Partial | Lint 0 errors / 309 warnings (BUG-137); `prettier --check` clean; 2 `console.log` left (BUG-104) |
| Security | ✅ OK for a static app | `npm audit --omit=dev`: 0; dev deps: 10 moderate (BUG-136). No backend, no secrets. "Share" only works in the same browser (BUG-028, Q6) |
| Performance | ⚠️ Needs work | One 1.56 MB JS chunk (490 KB gzip), no code splitting; template images 2–7 MB each, `dist` = 39 MB. Runtime fine |
| Accessibility | ⚠️ Needs work | axe: images without alt text, invalid ARIA children (editor), colour contrast (8 spots), landmark structure |
| Browsers / devices | ⚠️ Partial | Chromium ✅, WebKit ✅ (earlier pass), Firefox ❓, phones ❌ (desktop-only editor) |
| CI / docs | ✅ Good | CI: quality / e2e / build → deploy on `main` via `deploy-pages`. Docs updated for this batch |

## What is left

### P0 — architecture (before a full production launch)

1. **Store key collisions** (BUG-002, 17 keys; Q1 rule decided): rename one side of each pair + a duplicate-key guard.
2. **One owner for canvas geometry and zoom** (BUG-007, BUG-025; Q2 decided, not applied). Fixes template artboards
   after undo / reload too (BUG-139).
3. **Commit the work**: 360+ files are uncommitted; push to a branch so CI runs the full pipeline before any deploy.

### P1 — should fix for a quality launch

- Accessibility: alt text, ARIA structure of the editor, colour contrast, one `main` / `banner` / `contentinfo`.
- Performance: split the bundle (lazy editor route, lazy heavy panels, separate Fabric / animation chunks); convert
  template images to WebP with small thumbnails.
- Keyboard: Delete key (BUG-103), ⌘B / ⌘I / ⌘U (BUG-096), animation panel keys leaking (BUG-018).
- Medium bugs still open, e.g. Fabric 5 `loadFromJSON` callbacks (BUG-014, BUG-101), mode-switch race (BUG-016),
  shared brush / text / shape fields (BUG-019 / 020), brush writers (BUG-021), background reset (BUG-022), settings
  slice collisions (BUG-023), video export frame (BUG-026), full re-renders (BUG-029), template origin shift (BUG-059),
  animation number fields (BUG-092), page size not saved (BUG-109).
- Firefox in CI (add a `firefox` project; it runs on Linux CI).
- Unit coverage ≥ 60 % for store slices (today 49 % overall).

### P2 — polish / decisions

- Minor bugs, incl. the ones found in this batch: autosave on fast tab close (BUG-138), playhead after canvas undo
  (BUG-140), keyframe history per page (BUG-141), multi-selection rest refresh (BUG-142), dead `fabricNS.fabric`
  branch (BUG-143); `console.log` (BUG-104); dead code (BUG-102).
- Lint warnings (309) and `any` → stricter TypeScript (Q10).
- Product decisions still open: Q6 Share. Mobile / touch: decide whether phones are supported.
- Error / usage reporting (none today; the error boundary only logs to the console).

## How to re-check

```
npm run check          # lint + type-check (incl. e2e) + format:check
npm run test:run       # unit tests
npm run test:coverage  # coverage
npm run e2e            # Playwright (first time: npx playwright install chromium)
npm run build
```

Known-bug tests in `e2e/known-bugs.spec.ts` turn red when a bug is fixed: remove the `test.fail` marker with the fix.
