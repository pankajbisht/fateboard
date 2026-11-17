# Production readiness — fateboard

**Review 2026-11-17** (skill `fate-readiness`, branch `feature/newBrushandTools`: 2 commits not on `main` + 121
changed / new files not committed: brush engine + paint tools, Copy spray, page layers, document + comic tools, page
frame / print marks, page sizes). Evidence produced in this run: `npm run check`, unit tests with coverage, the
production build, a full Playwright run on Chromium + Firefox (389 tests), reruns of every failure, a dependency audit,
code metrics, and the newest `main` pipeline read from the GitHub API.

Earlier reviews, short: 2026-11-09 first pipeline red (missing `VITE_SITE_URL`, coverage gate BUG-153), fixed.
2026-11-11 storage review fixed BUG-152 to 158, 162, 173 and logged BUG-159 to 165 and 174. 2026-11-13: no app-level
blocker; live site safe; local work deployable after CI.

## Verdict: **the live site is safe to keep but loses some unsaved edits on reload (BUG-243, fixed on the branch); the local work can be deployed once it passes CI**

- **Live site** (`main` 0346b3a, merge of PR #16, 2026-11-14, CI run 43576207278): every job passed (static
  analysis, unit tests + coverage, web build, container image, E2E Chromium + Firefox in 2 shards each) and the GitHub
  Pages deploy succeeded. It has **BUG-243**: a change that fires no object event (opacity, stroke style, shadow…) is
  not autosaved, so a reload right after it loses that last change. Not a crash; the fix ships with this branch.
- **Local working tree**: BUG-243 found by this check and **fixed** (`saveState()` now schedules the autosave;
  unit + reload E2E tests, the doc-layers reload test passes again). Everything else passes. None of it has been
  through CI yet: commit, push, PR, green CI, merge.

## Scorecard (2026-11-17)

| Area | Status | Evidence |
|---|---|---|
| Core editing flows | ✅ | Full E2E: 389 tests, 384 passed. 3 Firefox-only failures (grid, page-frame manga, whiteboard) are the known font-download console flake (BUG-205): all 7 tests of those specs pass on rerun. The 2 real failures (layers lost on reload, **BUG-243**) are fixed: persistence, doc-layers, undo, data-safety, document specs 18 / 18. `known-bugs.spec.ts`: 2 expected failures (BUG-200 / 201 contrast) |
| Data safety | ⚠️ | **BUG-243 (Major)** fixed on the branch: every recorded change is autosaved (was: style, layer and page-setup changes lost on reload; also on the live site until this ships). Still open from before: **BUG-174 (High)** no persistent-storage request, browser may clear boards; BUG-159 a photo that fails to load is dropped silently; BUG-187 edits during the startup read can overwrite the save; BUG-242 Add page does not copy the page setup |
| Architecture | ✅ | Guard tests green (store keys, store API baseline, serialize path, storage boundary, file budget, Claude setup, guardrails). Ceilings lowered this session: Canvas slice 1257 → 1224, CanvasBoard 645 → 634, ExportCanvas 1183 → 1150 lines |
| Robustness | ✅ | Error boundary (`organisms/ErrorBoundary.tsx`) with autosave download / reset; failed chunk loads land there; broken files show a dialog |
| Performance | ✅ | Lazy routes; `/draw` ≈ 427 KB gzip (react 82 + store 130 + Editor 99 + Fabric 93 + small chunks; was 405 KB on 11-13, the new tools); paper.js (158 KB) on demand; many-objects and perf specs pass |
| Accessibility | ⚠️ | axe WCAG 2.1 A / AA specs pass on Chromium + Firefox (light + dark, incl. the new grey pasteboard); 2 known contrast bugs tracked as expected failures (BUG-200 section titles, BUG-201 danger button in dark mode) |
| Browsers / devices | ⚠️ | Chromium + Firefox: local full run and CI on `main`; phone / tablet layouts and touch: `mobile` / `touch` specs pass (Chromium emulation); WebKit / Safari not tested; classic (space-taking) scrollbars not testable here |
| Tests | ✅ | 1872 unit tests (239 files) pass, 1 skipped; coverage 66.9 % lines / 65.4 % statements / 66.2 % functions / 57.8 % branches vs ratchet 54 / 52 / 54 / 45 (up from 63.3 % lines) |
| Code quality | ⚠️ | Lint 0 errors, 246 `any` warnings = the cap (was 249); Prettier + type-check clean; metrics flag 45 of 77 hotspot files (size / `any`) |
| Security | ⚠️ | `npm audit --omit=dev`: 0 vulnerabilities; CSP meta on every page + nginx security headers; no new XSS sinks (new UI renders text + SVG attributes only). Accepted: remote image addresses in opened files (BUG-160, Q13), no opened-file size limit (BUG-161) |
| Operations | ⚠️ | `main` pipeline + Pages deploy green (2026-11-14); rollback = revert the merge. No remote error reporting (console only). Local: 2 commits on `feature/newBrushandTools` not merged + 121 files not committed, none through CI |
| Docs | ⚠️ | STATE, CANVAS, COMPONENTS, DESIGN, DECISIONS, ROADMAP, BUGS updated for every change this session. Bug IDs BUG-234 … 237 are each used twice in BUGS.md (owner to decide the renumbering) |

## Before the next deploy (checklist)

1. ~~Fix BUG-243~~ done (2026-11-17).
2. Commit the local work on the branch in logical commits (skill `fate-ship`), push, open a PR to `main`.
3. Wait for **CI passed** (quality, sharded E2E Chromium + Firefox, web build, container image).
4. Merge: the deploy job publishes to GitHub Pages. Rollback: revert the merge commit.
5. After the deploy, open `/draw` once: draw with a stamp brush, Copy spray (Shift + S), a manga page size, Page setup
   (bleed / slug / crop marks), Layers (rename, clip), reload, and check everything is still there.

Should fix soon (not blocking): **BUG-174** (ask the browser to keep saved boards; needs the owner's OK for the
prompt), **BUG-187** (startup save race), **BUG-242** (new pages copy the page setup). Then BUG-159, BUG-200 / 201
(contrast) and remote error reporting.

## Known limits (accepted, documented)

- **Share** is removed until there is a backend (decision Q6); Save Board (`.fateboard`) hands a board over.
- **Phones / tablets**: the full editor with touch gestures (2026-11-14); tested in Chromium emulation, not on devices.
- **Bleed / slug content**: the board draws the bleed / slug frames around the page, but art past the trim is only
  visible in exports (decision Q2 kept, BUG-234).
- **TypeScript `any`**: 246 remain (decision Q10); the lint ratchet stops new ones.
- **BUG-136**: dev-only `minimatch` advisory, deferred until ESLint adopts the fixed major version.
- **Remote error reporting**: none; the error boundary logs to the console only.
- **Opened files are trusted for image addresses** (BUG-160, decision Q13) and have no size limit (BUG-161).
- **Storage can be cleared by the browser** (BUG-174): no persistent-storage request yet; Save Board is the backup.
- **opendb-store hides failures by design**: our adapter (`lib/storage/adapters/opendbIndexed.ts`) turns them back
  into errors, pinned by tests. A strict mode in opendb-store itself would make the adapter much simpler.
- **Coverage**: a few large feature modules are lightly unit-tested (patterns 7 %, shape slice 27 %); their user flows
  are covered by E2E.

## How to re-check

Ask Claude "can we deploy?" or run `/fate-readiness`: it runs everything below, reads the newest CI run and
answers in the same Deploy YES / NO format. By hand:

```
npm run check          # lint (ratchet) + type-check (incl. e2e) + format:check
npm run test:coverage  # unit tests + coverage ratchet
npm run e2e            # Playwright; E2E_FIREFOX=1 adds Firefox (npx playwright install chromium firefox)
npm run build          # needs VITE_SITE_URL in .env (see .env.example)
npm audit --omit=dev
```

`e2e/known-bugs.spec.ts` holds BUG-200 and BUG-201 as `test.fail`; a new known bug gets one there, removed together with the fix.
