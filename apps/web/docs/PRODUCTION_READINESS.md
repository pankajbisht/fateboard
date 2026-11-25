# Production readiness — fateboard

**Review 2026-11-25** (skill `fate-readiness`, branch `chore/monorepo-scaffold`: 5 commits not pushed + 91 changed
files not committed: repo restructure only, `apps/web` is now the whole app, one CI pipeline per app). Evidence
produced in this run: `npm run check`, unit tests with coverage, the production build, a full Playwright run on
Chromium + Firefox (457 tests) with reruns of every failure, a dependency audit, code metrics, a byte comparison of
this branch's build with `main`'s, and the newest `main` pipeline read from the GitHub API.

Earlier reviews, short: 2026-11-09 first pipeline red (missing `VITE_SITE_URL`, coverage gate BUG-153), fixed.
2026-11-11 storage review fixed BUG-152 to 158, 162, 173. 2026-11-13 no blocker. 2026-11-17 BUG-243 (unsaved style
changes lost on reload) found and fixed before deploy.

## Verdict: **the live site is safe to keep; the restructure branch may be deployed only after its first green CI run on GitHub**

- **Live site** (`main` cdb05a6, merge of PR #24, CI run 45442892623, 2026-11-24): all 11 jobs passed (static
  analysis, unit tests + coverage, web build, container image, E2E Chromium + Firefox in 2 shards each, CI passed)
  and the GitHub Pages deploy succeeded. No new blocker found.
- **Local branch** (`chore/monorepo-scaffold`): the app itself is unchanged. Its build equals `main`'s apart from
  chunk hashes and 467 CSS rules that `main` only had because Tailwind scanned doc text; none of those classes is used
  by the app. 5 unreferenced source files moved to the git-ignored `deadcode/`. What changed is where things live
  and how CI runs (`working-directory: apps/web`, per-app change detection, Docker context `apps/web`, Dependabot
  `/apps/web`). That new CI layout has **never run on GitHub**, so it is not deployable until a PR shows `CI passed`.

## Scorecard (2026-11-25)

| Area               | Status | Evidence |
| ------------------ | ------ | -------- |
| Core editing flows | ✅     | Full E2E, 457 tests (Chromium + Firefox): 404 passed on the first run, which took 6.9 h because the machine slept / ran at load 15–28; the 53 failures were timeouts (52 Firefox). Rerun: 41 passed; the last 12 passed run one at a time (`--workers=1`). Every test passed at least once; no assertion failure points at the code. |
| Data safety        | ⚠️     | No new issue. Still open: **BUG-174 (High)** no persistent-storage request (the browser may clear boards), BUG-187 (Medium) startup save race, BUG-159 (Medium). |
| Architecture       | ✅     | Guard tests green (store keys, store API baseline, storage boundary, file budget, Claude setup, guardrails). Import-graph check: every `src` file reachable from `main.tsx` or a test after 5 dead files moved out. |
| Robustness         | ✅     | Error boundary with autosave download / reset; failed chunk loads land there (unchanged). |
| Performance        | ✅     | Startup 133.3 KB gzip (every route); editor route chunk +336 KB (own 87.8 KB); CSS smaller than `main` (doc words no longer scanned). |
| Accessibility      | ⚠️     | axe specs pass on Chromium + Firefox (light + dark); BUG-201 (dark-mode danger button contrast) still open. |
| Browsers / devices | ⚠️     | Chromium + Firefox locally and on `main` CI; WebKit / Safari still not in CI. |
| Tests              | ✅     | 2548 unit tests (307 files) pass, 1 skipped; coverage 75 % lines / 73.5 % statements / 73.6 % functions / 65.1 % branches vs ratchet 54 / 52 / 54 / 45. |
| Code quality       | ⚠️     | Lint 0 errors, 246 `any` warnings = the cap; Prettier + type-check clean; metrics flag 45 of 106 hotspot files (size / `any`). |
| Security           | ✅     | `npm audit --omit=dev`: 0 vulnerabilities; CSP meta + nginx headers unchanged. Accepted: BUG-160, BUG-161 (Q13). |
| Operations         | ⚠️     | `main` pipeline + Pages deploy green (2026-11-24); rollback = revert the merge. Branch CI layout unproven on GitHub; Docker image not built locally (daemon off). No remote error reporting. |
| Docs               | ✅     | Root `README.md` (full guide), `CLAUDE.md`, PLATFORMS, DECISIONS updated for the restructure. Bug IDs BUG-234 … 237 still used twice in BUGS.md (owner to decide). |

## Before the next deploy (checklist)

1. Commit the local work on `chore/monorepo-scaffold`, push, open a PR to `main`.
2. Wait for **CI passed**. This is the first run of the new layout: check that Quality, the 4 E2E shards, Web bundle
   and Container image all ran (none skipped) and passed.
3. Merge: the deploy job publishes `apps/web/dist` to GitHub Pages. Rollback: revert the merge commit.
4. After the deploy: the deploy job's **live smoke test** must be green (routes 200, unknown page 404, every
   `/draw` JS / CSS file 200). Then by hand: open `/draw`, draw a shape, reload, check it is still there.
5. Contributors: run commands and open Claude Code in `apps/web` from now on (root README).

Should fix soon (not blocking): **BUG-174** (ask the browser to keep saved boards), **BUG-187** (startup save race),
**BUG-234** (Major: stylus pressure never reaches a brush). Then BUG-159, BUG-201 and remote error reporting.

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
