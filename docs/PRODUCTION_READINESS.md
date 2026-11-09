# Production readiness — fateboard

Final review 2026-11-09 on branch `launch-blockers` (all work committed, not pushed). Evidence: the full quality
gate, unit tests with coverage, the Playwright suite run twice, axe accessibility scans, a production build, a
dependency audit, a static scan of shipped code and `docs/BUGS.md`.

## Verdict: **ready for production**, once CI passes on the branch

Every bug found by the audit is fixed and covered by a test, except BUG-136 (deferred on purpose: a dev-tooling
advisory whose only fix is a days-old major release; it never reaches users). Nothing that blocked a launch remains.
Two things only CI can confirm: the **first Firefox run** and the **first Docker image build**; neither could run in
the agent's sandbox. Push the branch, open a PR, and deploy once the single required check ("CI passed") is green.

## Scorecard

| Area | Status | Evidence |
|---|---|---|
| Core editing flows | ✅ | 76 Playwright specs on Chromium, **152 / 152 green over two full runs**; 775 unit tests (130 files) |
| Data safety | ✅ | Whole project autosaves to IndexedDB (pages, page sizes, animation, photos), flushed when the tab is hidden; undo per page (incl. page size, file open, template apply); destructive actions undoable or confirmed |
| Architecture | ✅ | One owner per store key (guard test); one canvas-geometry owner; one serialize path and one document loader (guard tests); no module-level slice state; dead code removed |
| Robustness | ✅ | Error boundary with autosave download / reset; failed chunk loads land there; broken files show a dialog |
| Keyboard | ✅ | Delete and Backspace delete; ⌘B / ⌘I / ⌘U; Escape closes menus; no shortcut leaks out of panels or fires under dialogs |
| Performance | ✅ | Lazy route chunks; startup ≈ 278 KB gzip (was 490 KB); paper.js on demand; design canvas renders at the shown density; `dist` 9.8 MB (was 39 MB) |
| Accessibility | ✅ | axe WCAG 2.1 A / AA + best-practice: zero violations on `/`, `/draw`, `/setting`, `/help`, light and dark |
| Browsers / devices | ⚠️ CI | Chromium ✅; Firefox runs every spec in CI (first result pending); WebKit ✅ in an earlier manual pass; phones get an honest desktop-only notice |
| Tests | ✅ | Coverage 54 % lines / 45 % branches (was 38 / 32), enforced as a CI ratchet; no known flaky test (BUG-146 fixed: 20 / 20) |
| Code quality | ✅ | Lint 0 errors, only the 254 `any` warnings left, frozen by `--max-warnings 254`; Prettier clean; no `console.log`, `debugger`, `TODO` or XSS sinks in shipped code |
| Security | ✅ | `npm audit --omit=dev`: 0; no secrets in the repo; `.env` git-ignored and kept out of Docker images; site URL is configuration (`VITE_SITE_URL`), the build refuses a missing value |
| Deploy | ✅ / ⚠️ CI | GitHub Pages via `deploy-pages` on `main` only; Docker image (unprivileged nginx) built and smoke-tested in CI (first build pending) |
| Docs | ✅ | ARCHITECTURE, STATE, CANVAS, COMPONENTS, CONVENTIONS, TESTING, BUGS, ROADMAP, DECISIONS, DESIGN, README and CLAUDE.md updated for every change |

## Before the first deploy (checklist)

1. GitHub repository variables: `VITE_SITE_URL` (required) and `VITE_GA_ID` (optional).
2. Settings > Pages > Source = **GitHub Actions**, custom domain set there.
3. Push `launch-blockers`, open a PR to `main`, wait for **CI passed** (quality, E2E on Chromium + Firefox, build,
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
