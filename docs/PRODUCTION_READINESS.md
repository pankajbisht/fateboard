# Production readiness — fateboard

Reviewed 2026-11-09 on branch `fix/coverage-gate`, after the first CI run on `main`. Evidence: the full quality gate,
unit tests with coverage, the Playwright suite, axe accessibility scans, a smoke test of the production bundle, a
dependency audit, a static scan of shipped code and `docs/BUGS.md`.

**Whole-app review, 2026-11-11** (working tree on `main`, not committed): the review ran probes against the code and
found five bugs the audit had missed, one of them a data-loss bug (BUG-154: a project file with one page that cannot
be read replaced the user's board with a wrong one). BUG-154 to BUG-158 and BUG-152 are fixed with unit and Playwright
tests. Seven more (BUG-159 to BUG-165) are `open`: they were found by reading the code and need an owner decision or
a larger change. The numbers in the scorecard are from this review.

**Storage review, 2026-11-11** (branch `feat/storage-opendb-indexeddb`): all saving now goes through one storage layer
(`@/lib/storage`, guard test) on opendb-store 3; boards saved by the old IndexedDB code move over once. Storage
failures are no longer silent: a failed autosave is shown (BUG-162) and a board that cannot be read is never written
over (BUG-173). Still open: the browser is never asked to keep the data (BUG-174, owner decision).

## Verdict: **ready for production once the pipeline is green; it has not been green yet**

The first run on `main` (merge of PR #2) failed and did not deploy, for two reasons that are not app bugs:

1. **`VITE_SITE_URL` was not set as a repository variable**, so `build`, `e2e` and `docker` stopped at the build. Owner
   action: step 1 of the checklist below.
2. **The coverage gate failed** (BUG-153). Fixed on this branch.

Every bug found by the audit is fixed and covered by a test, except BUG-136 (deferred on purpose: a dev-tooling
advisory whose only fix is a days-old major release; it never reaches users), the minor BUG-149 and 150, and the
seven found on 2026-11-11 (BUG-159 to 165; the two that matter most are BUG-159, a photo that fails to load is
dropped without a message, and BUG-162, a failed autosave is not shown to the user).
Two things only CI can confirm, because both jobs stopped at the build: the **first Firefox run** and the **first
Docker image build**. Neither could run in the agent's environment.

## Scorecard

| Area | Status | Evidence |
|---|---|---|
| Core editing flows | ✅ | 111 Playwright tests on Chromium, all green on 2026-11-11 (storage review); 1011 unit tests (152 files) |
| Data safety | ⚠️ | Whole project autosaves to IndexedDB through one storage layer; failed saves and unreadable saves are shown and never overwrite the board (BUG-162, 173). Open: no persistent-storage request, so the browser may clear saved boards (BUG-174). Also: (pages, page sizes, animation, photos), flushed when the tab is hidden; undo per page (incl. page size, file open, template apply); destructive actions undoable or confirmed; a page, project or undo step that cannot be loaded changes nothing and says so, and an autosave that cannot be opened is kept as a backup (BUG-154). Open: BUG-159, BUG-162, BUG-163 |
| Architecture | ✅ | One owner per store key (guard test); one canvas-geometry owner; one serialize path and one document loader (guard tests); no module-level slice state; dead code removed |
| Robustness | ✅ | Error boundary with autosave download / reset; failed chunk loads land there; broken files show a dialog |
| Keyboard | ✅ | Delete and Backspace delete; ⌘B / ⌘I / ⌘U; Escape closes menus; no shortcut leaks out of panels or fires under dialogs |
| Performance | ✅ | Lazy route chunks; `/draw` startup ≈ 285 KB gzip; paper.js on demand; design canvas renders at the shown density; `dist` 9.8 MB; at 1500 objects Layers opens without a freeze and hover no longer repaints (BUG-147, 148) |
| Accessibility | ✅ | axe WCAG 2.1 A / AA + best-practice: zero violations on `/`, `/draw`, `/setting`, `/help` and two Help topics, light and dark |
| Browsers / devices | ⚠️ CI | Chromium ✅; Firefox runs every spec in CI (no result yet); WebKit has no test project and was last checked by hand before the latest features; phones get an honest desktop-only notice |
| Tests | ✅ | Coverage 58.1 % lines / 49.6 % branches, enforced as a CI ratchet. It counts only files that tests load, so panels with no unit test are not in the total |
| Code quality | ⚠️ | Code review 2026-11-11 (docs/CODE_REVIEW.md): strict TypeScript off outside the new strict island, store typed `any`, 39 files over the size budget (now ratcheted), store imports from the UI layer. Not blocking; roadmap there. Lint 0 errors, only the 254 `any` warnings left, frozen by `--max-warnings 254`; Prettier clean; no `console.log`, `debugger`, `TODO` or XSS sinks in shipped code |
| Security | ⚠️ | No XSS sinks (`innerHTML`, `eval`, `dangerouslySetInnerHTML`) in shipped code; values from opened files are checked (BUG-157). Open: remote image addresses in opened files (BUG-160), no security headers in the Docker image (BUG-165). `npm audit --omit=dev`: 0; no secrets in the repo; `.env` git-ignored and kept out of Docker images; site URL is configuration (`VITE_SITE_URL`), the build refuses a missing value |
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
- **Opened files are trusted for image addresses** (BUG-160, decision Q13) and have no size limit (BUG-161).
- **Self-hosted Docker image sends no security headers** (BUG-165).
- **Storage can be cleared by the browser** (BUG-174): no persistent-storage request yet; Save Board is the backup.
- **opendb-store hides failures by design**: our adapter (`lib/storage/adapters/opendbIndexed.ts`) turns them back
  into errors, pinned by tests. A strict mode in opendb-store itself would make the adapter much simpler.
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
