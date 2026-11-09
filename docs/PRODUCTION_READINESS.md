# Production readiness — fateboard

Reviewed 2026-11-09 on branch `fix/coverage-gate`, after the first CI run on `main`. Evidence: the full quality gate,
unit tests with coverage, the Playwright suite, axe accessibility scans, a smoke test of the production bundle, a
dependency audit, a static scan of shipped code and `docs/BUGS.md`.

## Verdict: **ready for production once the pipeline is green; it has not been green yet**

The first run on `main` (merge of PR #2) failed and did not deploy, for two reasons that are not app bugs:

1. **`VITE_SITE_URL` was not set as a repository variable**, so `build`, `e2e` and `docker` stopped at the build. Owner
   action: step 1 of the checklist below.
2. **The coverage gate failed** (BUG-153). Fixed on this branch.

Every bug found by the audit is fixed and covered by a test, except BUG-136 (deferred on purpose: a dev-tooling
advisory whose only fix is a days-old major release; it never reaches users) and the minor BUG-149, 150 and 152.
Two things only CI can confirm, because both jobs stopped at the build: the **first Firefox run** and the **first
Docker image build**. Neither could run in the agent's environment.

## Scorecard

| Area | Status | Evidence |
|---|---|---|
| Core editing flows | ✅ | 94 Playwright tests on Chromium (93 desktop, 1 laptop); new specs 70 / 70 over 5 repeats; 918 unit tests (139 files) |
| Data safety | ✅ | Whole project autosaves to IndexedDB (pages, page sizes, animation, photos), flushed when the tab is hidden; undo per page (incl. page size, file open, template apply); destructive actions undoable or confirmed |
| Architecture | ✅ | One owner per store key (guard test); one canvas-geometry owner; one serialize path and one document loader (guard tests); no module-level slice state; dead code removed |
| Robustness | ✅ | Error boundary with autosave download / reset; failed chunk loads land there; broken files show a dialog |
| Keyboard | ✅ | Delete and Backspace delete; ⌘B / ⌘I / ⌘U; Escape closes menus; no shortcut leaks out of panels or fires under dialogs |
| Performance | ✅ | Lazy route chunks; `/draw` startup ≈ 285 KB gzip; paper.js on demand; design canvas renders at the shown density; `dist` 9.8 MB; at 1500 objects Layers opens without a freeze and hover no longer repaints (BUG-147, 148) |
| Accessibility | ✅ | axe WCAG 2.1 A / AA + best-practice: zero violations on `/`, `/draw`, `/setting`, `/help` and two Help topics, light and dark |
| Browsers / devices | ⚠️ CI | Chromium ✅; Firefox runs every spec in CI (no result yet); WebKit has no test project and was last checked by hand before the latest features; phones get an honest desktop-only notice |
| Tests | ✅ | Coverage 55.8 % lines / 47.1 % branches, enforced as a CI ratchet. It counts only files that tests load, so panels with no unit test are not in the total |
| Code quality | ✅ | Lint 0 errors, only the 254 `any` warnings left, frozen by `--max-warnings 254`; Prettier clean; no `console.log`, `debugger`, `TODO` or XSS sinks in shipped code |
| Security | ✅ | `npm audit --omit=dev`: 0; no secrets in the repo; `.env` git-ignored and kept out of Docker images; site URL is configuration (`VITE_SITE_URL`), the build refuses a missing value |
| Deploy | ⚠️ CI | GitHub Pages via `deploy-pages` on `main` only; first run failed before deploying (see Verdict); Docker image (unprivileged nginx) built and smoke-tested in CI (first build pending) |
| Docs | ✅ | ARCHITECTURE, STATE, CANVAS, COMPONENTS, CONVENTIONS, TESTING, BUGS, ROADMAP, DECISIONS, DESIGN, README and CLAUDE.md updated for every change |

## Before the first deploy (checklist)

1. GitHub repository variables (Settings > Secrets and variables > Actions > **Variables**): `VITE_SITE_URL` (required; every build fails without it) and `VITE_GA_ID` (optional).
2. Settings > Pages > Source = **GitHub Actions**, custom domain set there.
3. Push `fix/coverage-gate`, open a PR to `main`, wait for **CI passed** (quality, E2E on Chromium + Firefox, build,
   Docker). If Firefox or Docker fail, those are the only untested paths: fix, re-run.
4. Merge: the deploy job publishes to Pages.

## Known limits (accepted, documented)

- **Share** is removed until there is a backend (decision Q6); Save Board (`.fateboard`) hands a board over.
- **Phones**: the editor is desktop-first; phones see a notice and may continue.
- **TypeScript `any`**: 254 remain (decision Q10); the lint ratchet stops new ones.
- **BUG-136**: dev-only `minimatch` advisory, deferred until ESLint adopts the fixed major version.
- **Remote error reporting**: none; the error boundary logs to the console only.
- **Coverage**: a few large feature modules are lightly unit-tested (patterns 7 %, shape slice 27 %); their user flows
  are covered by E2E.

## How to re-check

```
npm run check          # lint (ratchet) + type-check (incl. e2e) + format:check
npm run test:coverage  # unit tests + coverage ratchet
npm run e2e            # Playwright; E2E_FIREFOX=1 adds Firefox (npx playwright install chromium firefox)
npm run build          # needs VITE_SITE_URL in .env (see .env.example)
npm audit --omit=dev
```

`e2e/known-bugs.spec.ts` is empty today: a new known bug gets a `test.fail` there, removed together with the fix.
