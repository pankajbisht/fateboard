# Production readiness — fateboard

**Review 2026-11-13** (skill `fate-readiness`, working tree on `main`, 178 changed / new files not committed: the
right-dock generators, Brush picker + Calligraphy pen, Pen Path shape, Templates in the dock, the token-budget docs).
Evidence produced in this run: the full local gate, coverage, a full Playwright run on Chromium (desktop + laptop) and
Firefox, a dependency audit, the production build, and the newest `main` pipeline read from the GitHub API.

Earlier reviews, short: 2026-11-09 found the first pipeline red (missing `VITE_SITE_URL`, coverage gate BUG-153),
both fixed. 2026-11-11 (whole-app + storage review) fixed BUG-152 to 158, 162, 173, moved all saving behind
`@/lib/storage`, and logged BUG-159 to 165 and 174 as open.

## Verdict: **the live site is fine to keep; the local work can be deployed once it goes through CI**

- **Live site** (`main`, merge of PR #8, 2026-11-11): every CI job passed (quality, E2E on Chromium + Firefox,
  build, Docker image smoke test) and the GitHub Pages deploy succeeded. Safe to keep live, with the known limits
  below.
- **Local working tree**: every gate passes here, but none of it has been through CI. Deploy = branch → PR → CI
  green → merge (the merge deploys). No app-level blocker was found.

## Scorecard (2026-11-13)

| Area | Status | Evidence |
|---|---|---|
| Core editing flows | ✅ | Full E2E: 287 tests, 283 passed; the 4 failures are Firefox-only: 2 pass on rerun (font download hiccup), 2 are the known BUG-204 / BUG-205 (test environment, not the app). Firefox passed in CI on `main`. `known-bugs.spec.ts`: no open entries |
| Data safety | ⚠️ | One storage layer, failed / unreadable saves surfaced (BUG-162, 173 fixed). Open: **BUG-174 (High)** no persistent-storage request, browser may clear boards; BUG-159 a photo that fails to load is dropped silently; BUG-187 edits made during the startup read can overwrite the save |
| Architecture | ✅ | Guard tests green (store keys, store API baseline, serialize path, storage boundary, file budget, Claude setup). Brush slice shrank 715 → 502 lines |
| Robustness | ✅ | Error boundary with autosave download / reset; failed chunk loads land there; broken files show a dialog; Macro playback stops on a page switch |
| Performance | ✅ | Lazy routes; `/draw` preloads ≈ 316 KB gzip (+ Editor chunk ≈ 87 KB), up ≈ 30 KB since 2026-11-11 (new tools); paper.js (156 KB) loads on demand |
| Accessibility | ✅ | axe WCAG 2.1 A / AA specs green on Chromium (incl. the new panels' routes) |
| Browsers / devices | ⚠️ | Chromium ✅ local + CI; Firefox ✅ CI, locally only BUG-204 / 205; WebKit / Safari not tested; phones get a desktop-only notice |
| Tests | ✅ | 1486 unit tests (188 files) pass; coverage 63.3 % lines / 61.9 % statements / 62.8 % functions / 54.3 % branches vs ratchet 54 / 52 / 54 / 45 (up from 58.1 % lines) |
| Code quality | ⚠️ | Lint 0 errors, 249 `any` warnings = the cap; Prettier + type-check clean; metrics flag 45 of 62 hotspot files (size / `any`); strict TS only in the strict island (docs/CODE_REVIEW.md) |
| Security | ⚠️ | `npm audit --omit=dev`: 0 vulnerabilities; no XSS sinks; opened-file values checked. Open: no CSP / security headers (BUG-165), remote image addresses in opened files (BUG-160, accepted Q13) |
| Operations | ⚠️ | Pipeline + Pages deploy green on `main`; rollback = revert the merge (Pages redeploys). No remote error reporting (console only); 178 local files not in CI |
| Docs | ✅ | STATE, COMPONENTS, DECISIONS, BUGS (+ BUGS_ARCHIVE), AGENT_WORKFLOW, CLAUDE.md updated for every change in this session |

## Before the next deploy (checklist)

1. Commit the local work on a branch (not on `main`), in logical commits.
2. Open a PR to `main`; wait for **CI passed** (quality, sharded E2E Chromium + Firefox, web build, container image; E2E and image are skipped on docs-only PRs).
3. Merge: the deploy job publishes to GitHub Pages. Rollback: revert the merge commit.
4. After the deploy, open `/draw` once and check the Brush, Fractals, Cellular Automata, Macro and Templates tabs.

Should fix soon (not blocking): **BUG-174** (ask the browser to keep saved boards: one call to opendb-store's
`requestPersistence()`, needs the owner's OK for the browser prompt), **BUG-187** (startup save race), **BUG-159**
(say when a photo could not be loaded). Then BUG-165 (security headers / CSP) and remote error reporting.

## Known limits (accepted, documented)

- **Share** is removed until there is a backend (decision Q6); Save Board (`.fateboard`) hands a board over.
- **Phones**: the editor is desktop-first; phones see a notice and may continue.
- **TypeScript `any`**: 249 remain (decision Q10); the lint ratchet stops new ones.
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

Ask Claude "can we deploy?" or run `/fate-readiness`: it runs everything below, reads the newest CI run and
answers in the same Deploy YES / NO format. By hand:

```
npm run check          # lint (ratchet) + type-check (incl. e2e) + format:check
npm run test:coverage  # unit tests + coverage ratchet
npm run e2e            # Playwright; E2E_FIREFOX=1 adds Firefox (npx playwright install chromium firefox)
npm run build          # needs VITE_SITE_URL in .env (see .env.example)
npm audit --omit=dev
```

`e2e/known-bugs.spec.ts` is empty today: a new known bug gets a `test.fail` there, removed together with the fix.
