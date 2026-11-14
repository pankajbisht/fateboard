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
| Lint | `npm run lint` | ESLint flat config; `--max-warnings 249` ratchet (only `any` warnings left, Q10): never raise it, lower it when you remove `any`s |
| Format | `npm run format` / `npm run format:check` | Prettier, `src/**` |
| Typecheck | `npm run type-check` | app + strict island (`tsconfig.strict.json`) + node + e2e configs, must be 0 errors |
| All checks | `npm run check` | lint + type-check + format:check |
| Unit tests | `npm run test:run` (CI) · `npm test` (watch) | Vitest + jsdom |
| Coverage | `npm run test:coverage` | HTML at `coverage/index.html`; `npm run report` = coverage + E2E (docs/TESTING.md "Health report") |
| E2E | `npm run e2e` (report: `npm run e2e:report`) | Playwright 1.64.1, Chromium (+ Firefox in CI or with `E2E_FIREFOX=1`); builds `--mode e2e` and runs `e2e/` against `vite preview`. First time: `npx playwright install chromium` |

## Folder map

```
src/
  main.tsx, App.tsx, app/rootRouter.tsx   entry + routes
  store/index.ts                          ONE zustand store = spread of 24 slice creators (order matters)
  store/slices/                           create<Name>Slice.ts (canvas, pages, undo, layers, animation, …)
  store/brushConfig.ts                    brush presets/engines
  animation/                              keyframe engine + video export (WebCodecs / MediaRecorder)
  components/{atoms,molecules,organisms,templates,pages}   atomic design
  components/organisms/board/ui/CanvasBoard.tsx            mounts the Fabric canvas (design/whiteboard)
  components/organisms/editorsidebar/editorsidebar.config.tsx  left panels
  components/config/tabs.config.tsx       right dock tabs
  components/config/toolbars/ui/*Config.tsx  toolbar buttons = keyboard commands
  lib/                                    serialization, storage (`@/lib/storage`: the only persistence layer), units, keyboard (canvasKeysBlocked), canvas (renderRatio), patterns, connectors, gradient tool, utils
  hooks/                                  keyboard shortcuts, shape catalog/factory
  feature/import/                         image/SVG/JSON import
  test/                                   test helpers: fakeCanvas.ts, sliceHarness.ts (not shipped)
  types/                                  global.d.ts only (Fabric shims removed; real Fabric 7 types)
docs/                                     ARCHITECTURE, STATE, CANVAS, COMPONENTS, CONVENTIONS, TESTING, BUGS, ROADMAP, DECISIONS
```

Dead code was deleted in batch 1. Every file under `src/` is now reachable from `main.tsx` (or is a test/helper); keep it that way.

## Coding conventions (summary; full: docs/CONVENTIONS.md)

Area rules load by themselves when you touch those files (`.claude/rules/`: components + hooks, store, canvas,
tests): selectors, panels, tokens, icons, keys, units, Fabric origins / serialization, slice rules. Always:

- Prettier: 4 spaces, single quotes, width 100, trailing commas. Run `npm run format` on touched files.
- Import the store via `import { useStore } from '@store'`; aliases `@/`, `@components/`, `@lib/`, `@hooks/`.
- One store: new slices go in `combinedSlice` (`src/store/index.ts`) **before** `createAnimationSlice`; keys unique
  across slices (`storeKeys.test.ts`); cross-slice deps listed in `docs/STATE.md`.
- Errors: actions never throw to React; `try/catch` + `console.error('[slice] …')` + return falsy.
- Storage: import `@/lib/storage` only; `opendb-store` and browser storage APIs only inside `src/lib/storage` (guard test).

## Token budget

- Docs are large: read **sections**, not files (`grep -n '^## ' docs/X.md`, then Read with offset / limit). Bugs:
  `grep -n "BUG-0xx" docs/BUGS*.md` (open bugs in BUGS.md, fixed ones in BUGS_ARCHIVE.md). Never read DECISIONS.md
  or BUGS_ARCHIVE.md whole.
- Print summaries, not logs: `npm run test:run 2>&1 | grep -E "FAIL|×|Test Files|Tests "`, the same for `check`,
  `build`, `e2e` (`--reporter=line`); rerun only a failing file for its full message. Run E2E for the touched specs;
  the full suite only before a PR.
- Subagents start cold and re-read context: use `fate-reviewer` / `fate-verifier` for multi-area or risky changes
  and always pass them the list of changed files. Never ask an agent to review the whole working tree.
- Commit finished work (on a branch, when the owner asks): a huge uncommitted tree makes every diff and review huge.

## Never do

- Never rename or remove a public slice key/action without asking (see "How we work").
- Never call `canvas.clear()` / `loadFromJSON` outside the canvas/pages slices (bypasses persist lock + history).
- Never add a second zustand store, a second Fabric canvas for the editor, or another serialize-props list.
- Never add helper objects (handles, guides) to the canvas without `excludeFromExport` + layer/snap exclusion flags.
- Never write a new geometry/zoom path: `CanvasBoard` sizes the canvas, the Page slice (`setZoom`, `zoomToRect`) zooms, `selectedPreset` is the page size (BUG-007, docs/CANVAS.md).
- Never use `alert()`, leave `console.log`, or add `any` to store code.
- Never edit `node_modules`, `dist/` or `.env`. Never re-add a static import from a slice to a module that imports the store (BUG-048).
- Never commit with failing lint, type-check, or tests; never skip hooks (`--no-verify`).
- Never get green by lowering the bar: no raised lint limit / size ceiling, lowered coverage, `.skip` / `.only`, `@ts-ignore`, reasonless `eslint-disable`, or removed store key without the owner (guardrails, docs/AGENT_WORKFLOW.md).

## Definition of done

- [ ] Root cause fixed; related issues listed, not silently fixed.
- [ ] No file over its size ceiling (`fileBudget.test.ts`); new code in focused modules.
- [ ] Failing test written first, now passing (unit/RTL and, for user flows, Playwright).
- [ ] `npm run lint` (0 errors), `npm run type-check`, `npm run test:run`, `npm run build` all pass.
- [ ] Matching `docs/` file updated; bug marked `fixed (<ref>)` and moved to `docs/BUGS_ARCHIVE.md`; decisions logged in `docs/DECISIONS.md`.
- [ ] Manually checked in `npm run dev` for UI changes (state what you checked).
- [ ] Final report lists files changed.

## Docs

- [Architecture](docs/ARCHITECTURE.md): layers, data flow, canvas ownership, save/load
- [State](docs/STATE.md): every slice, key collisions
- [Canvas](docs/CANVAS.md): Fabric lifecycle, events, serialization, history, zoom/pan, perf
- [Components](docs/COMPONENTS.md): panels, props, slices used, dead code
- [Conventions](docs/CONVENTIONS.md): naming, TS, errors, how to add a slice/panel/tool
- [Testing](docs/TESTING.md): strategy, mocking Fabric, coverage, Playwright plan
- [Bugs](docs/BUGS.md): open bugs + highest ID (`BUG-0xx`); fixed ones in [BUGS_ARCHIVE.md](docs/BUGS_ARCHIVE.md)
- [Roadmap](docs/ROADMAP.md): milestones + features with blocking bugs
- [Decisions](docs/DECISIONS.md): inferred ADRs + open questions (Q1–Q12)
- [Production readiness](docs/PRODUCTION_READINESS.md): verdict, scorecard, what is left (P0 / P1 / P2)
- [Code review](docs/CODE_REVIEW.md): findings R-01…R-09, refactor roadmap, guardrails
- [Agent workflow](docs/AGENT_WORKFLOW.md): skills `fate-task` / `fate-review` / `fate-refactor` / `fate-readiness` / `fate-new-slice` / `fate-seo` / `fate-perf` / `fate-ship`, agents `fate-reviewer` / `fate-architect` / `fate-verifier` / `fate-debugger`; hooks (guard, format + lint per edit, type-check + related tests at the end of a turn) and path-scoped rules in `.claude/`
- [Agent guide](docs/AGENT_GUIDE.md): how to use every skill, agent, hook and built-in command, with example prompts
- [Platforms](docs/PLATFORMS.md): plan for PWA, browser extension (WXT), desktop + mobile (Tauri 2), platform adapters, Claude / MCP; phases + working rules (section 12), owner questions Q14–Q18
- [Backend](docs/BACKEND.md): local-first backend plan (Supabase + Hono API: accounts, sync, sharing, AI proxy, remote MCP), data model, API, rules (section 12)
- [Design](docs/DESIGN.md): brand tokens (colors from the logo), text styles, radius, contrast rules, dark mode, panel rules

## How we work

- **Use the repo's agent workflow** (docs/AGENT_WORKFLOW.md): skill `fate-task` for any change, `fate-refactor` for
  splitting files, `fate-reviewer` / `fate-verifier` agents (given the changed files) for multi-area or risky work.
- **One task per session.** Start by restating the task, reading the relevant `docs/` sections, then **plan first**
  (files to touch, tests to add, risks). Wait for approval if the plan touches a public slice API or a decision in Q1–Q12.
- **Root-cause fixes only.** No symptom patches. If you find related issues, list them in the report (and add them to
  `docs/BUGS.md` as `open`). Do not silently fix them.
- **Every fix or feature ships with tests and doc updates:** a test that failed before and passes after, the matching
  `docs/` file updated, and the bug marked fixed in `docs/BUGS.md`.
- **Minimal, reviewable changes.** Smallest diff that solves the task; no drive-by refactors or reformatting of
  untouched code. End every session with the list of files changed and the commands you ran with their results.
- **Never rename public slice APIs without asking** (store keys/actions used by components or other slices).
- **Platform work** (PWA, extension, desktop, mobile, AI, MCP) follows docs/PLATFORMS.md (backend: docs/BACKEND.md): phases in order, shell APIs only behind `src/platform/`, rules in its section 12.
- If something is unknown, write `UNKNOWN - verify` rather than guessing.
