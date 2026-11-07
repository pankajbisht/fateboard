# Production readiness — fateboard

Checked 2026-11-07 on branch `launch-blockers` (committed, not pushed), after the P0 data-safety batch and the
launch-blocker batch. Evidence: unit tests, Playwright (Chromium; Firefox wired into CI), axe accessibility scans,
bundle measurements and `docs/BUGS.md`.

## Verdict: **ready for a production launch once CI is green on `launch-blockers` (incl. the first Firefox run)**

Every item that blocked a full launch is fixed and covered by tests: no data loss (all pages, animation and photos
autosave), one store owner per key (BUG-002), one canvas geometry owner (BUG-007), lazy routes and a 43 % smaller
startup bundle, zero axe violations on the main routes, Firefox in CI, and an honest desktop-only notice on phones.
Two things remain before pressing deploy: **push the branch and let CI pass** (Firefox has never run: the agent's
sandbox could not start it), and **decide Share (Q6)**, the only path that still loses custom data (BUG-003 / 028).
Hiding Share until then is the low-risk option.

## Scorecard

| Area | Status | Evidence |
|---|---|---|
| Core editing flows | ✅ Works | 73 Playwright tests on Chromium (+ 2 expected failures for open bugs); 726 unit tests (108 files) |
| Data safety | ✅ | Project autosave in IndexedDB (BUG-004), undo per page incl. page size, template apply undoable (BUG-009), animation per page (BUG-010 / 011), photos (BUG-121). Residual: last edit < 300 ms before closing the tab (BUG-138) |
| Architecture | ✅ | No store key collisions, guarded (BUG-002); one geometry owner, guarded (BUG-007 / 025 / 109 / 139); one serialize path except Share (BUG-003) |
| Robustness | ✅ | Error boundary with autosave download / reset; failed chunk loads land there too. No remote error reporting |
| Performance | ✅ | Lazy route chunks; startup ≈ 278 KB gzip (was 490 KB); paper.js on demand; template images ≤ 0.7 MB, thumbnails; `dist` 9.5 MB (was 39 MB) |
| Accessibility | ✅ | `e2e/a11y.spec.ts`: zero axe WCAG 2.1 A / AA + best-practice violations on `/`, `/draw`, `/setting`, `/help`, light and dark |
| Browsers / devices | ⚠️ Pending CI | Chromium ✅; Firefox project added to CI, **not yet run**; WebKit ✅ in an earlier manual pass; phones: honest desktop-only notice (`e2e/mobile.spec.ts`) |
| Tests | ⚠️ Partial | Unit coverage 50 % lines / 42 % branches (target 60 % for slices); one pre-existing flaky E2E (BUG-146) |
| Code quality | ⚠️ Partial | Lint 0 errors / 306 warnings (BUG-137); `prettier --check` clean; no `console.log` in shipped code (guarded) |
| Security | ✅ OK for a static app | `npm audit --omit=dev`: 0. No backend, no secrets |
| CI / docs | ✅ | Quality / E2E (Chromium + Firefox) / build → deploy on `main`. Docs updated for every change |

## What is left

### Before deploying

1. Set the GitHub repository variable `VITE_SITE_URL` (the build fails without it), push `launch-blockers`, open a PR,
   and get CI green, including the first **Firefox** run. Fix whatever Firefox shows.
2. Decide **Share** (Q6): hide it until a real backend exists, or make it a file export (BUG-003 remainder, BUG-028).

### P1 — soon after launch

- Medium bugs still open: Fabric 5 `loadFromJSON` callbacks (BUG-014, BUG-101), mode-switch race (BUG-016), animation
  panel keys leaking (BUG-018), brush writers (BUG-021), background reset on the whiteboard (BUG-022), video export
  frame (BUG-026), full re-renders (BUG-029), latent geometry-engine store replace (BUG-030), template origin shift
  (BUG-059), animation number fields (BUG-092), Delete key (BUG-103).
- Flaky E2E (BUG-146); unit coverage to 60 % for store slices.
- Remote error reporting (the error boundary only logs to the console).

### P2 — polish

- Minor bugs (see BUGS.md), lint warnings (306) and `any` → stricter TypeScript (Q10).
- A real mobile editor (touch gestures, mobile toolbar) if phones become a goal.

## How to re-check

```
npm run check          # lint + type-check (incl. e2e) + format:check
npm run test:run       # unit tests
npm run test:coverage  # coverage
npm run e2e            # Playwright (first time: npx playwright install chromium)
npm run build
```

Known-bug tests in `e2e/known-bugs.spec.ts` turn red when a bug is fixed: remove the `test.fail` marker with the fix.
