# Fateboard

A browser-based canvas editor for designs and whiteboards: shapes with text and connectors, freehand brushes,
layers, multiple pages, templates, image filters, repeat / tiling tools, a path node editor, Character Studio and
scenes, and keyframe animation with MP4 / WebM / GIF export.

Live site: [fateboard.com](https://www.fateboard.com) (the editor is at `/draw`).

> Status: being hardened to production grade. Open bugs: [apps/web/docs/BUGS.md](apps/web/docs/BUGS.md); planned
> work: [apps/web/docs/ROADMAP.md](apps/web/docs/ROADMAP.md).

---

## Contents

1. [Tech stack](#1-tech-stack)
2. [Repository layout](#2-repository-layout)
3. [Requirements](#3-requirements)
4. [Setup (first time)](#4-setup-first-time)
5. [Run the application](#5-run-the-application)
6. [Tests and quality checks](#6-tests-and-quality-checks)
7. [Build, preview and Docker](#7-build-preview-and-docker)
8. [CI/CD and deployment](#8-cicd-and-deployment)
9. [Git workflow and hooks](#9-git-workflow-and-hooks)
10. [Dead code (`deadcode/`)](#10-dead-code-deadcode)
11. [Working with Claude Code](#11-working-with-claude-code)
12. [Data and storage](#12-data-and-storage)
13. [Documentation index](#13-documentation-index)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Tech stack

| Area | Choice |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4 (`@tailwindcss/vite`) |
| Canvas | Fabric.js 7, paper.js (boolean path operations) |
| State | zustand 5: one store built from ~30 slices |
| Build | Vite 8 (static site, one prerendered HTML page per public route) |
| Storage | IndexedDB through `opendb-store` (local-first, no server) |
| Tests | Vitest + jsdom + Testing Library (unit / component), Playwright (end-to-end, Chromium + Firefox) |
| Quality | ESLint (flat config), Prettier, TypeScript type-check, husky + lint-staged pre-commit |
| Hosting | GitHub Pages (static), optional Docker image (nginx) for self-hosting |

Every dependency is pinned to an exact version (`.npmrc`: `save-exact`, `engine-strict`).

## 2. Repository layout

```
fate/                         git root
├── README.md                 this document
├── .gitignore                ignore rules for the whole repo
├── .github/                  CI/CD: one separate pipeline per app (section 8)
├── apps/
│   ├── web/                  THE APPLICATION (a complete, standalone project)
│   │   ├── src/              app source: components, store (zustand slices), lib, hooks, animation, character, scene
│   │   ├── e2e/              Playwright end-to-end specs
│   │   ├── public/           static assets (templates, gallery images, icons)
│   │   ├── docs/             all project docs (architecture, state, canvas, testing, bugs, roadmap, decisions, …)
│   │   ├── scripts/          guardrail checks (ratchets) used by CI, the Claude guard hook and a unit test
│   │   ├── docker/           nginx config for the container image
│   │   ├── .husky/           git pre-commit hook
│   │   ├── .claude/          Claude Code setup: agents, skills, hooks, rules
│   │   ├── CLAUDE.md         instructions for Claude Code
│   │   ├── package.json      scripts + exact dependency versions
│   │   ├── package-lock.json
│   │   ├── .env.example      configuration template (copy to .env)
│   │   ├── .nvmrc / .npmrc   Node version pin / npm settings
│   │   ├── Dockerfile        self-hosting image (build context: apps/web)
│   │   └── vite / vitest / playwright / eslint / tsconfig configs
│   └── desktop/              placeholder for a future desktop app (README only)
├── packages/
│   └── core/                 placeholder for future shared code (README only)
└── deadcode/                 git-ignored: removed code + old backups, kept locally only (section 10)
```

**Run every command inside `apps/web`.** It has its own `package.json`, lockfile and `node_modules`; the repo root
has none.

## 3. Requirements

- **Node.js 26.13.0 exactly** (`apps/web/.nvmrc`; `engine-strict` refuses other versions). Use
  [nvm](https://github.com/nvm-sh/nvm): `nvm install` / `nvm use` read `.nvmrc`.
- npm (comes with Node).
- For end-to-end tests: Playwright's Chromium (installed once, see section 6).
- Optional: Docker, only to build the self-hosting image.

## 4. Setup (first time)

```bash
git clone https://github.com/pankajbisht/Fate.git fate
cd fate/apps/web

nvm install            # installs Node 26.13.0 from .nvmrc
nvm use
npm ci                 # installs exact dependency versions and the git pre-commit hook

cp .env.example .env   # then edit .env (see below)
```

`.env` (git-ignored, lives in `apps/web`):

| Variable | Required | What it does |
|---|---|---|
| `VITE_SITE_URL` | **yes, for every build** | Public origin, e.g. `https://www.fateboard.com`. Canonical links, Open Graph / JSON-LD URLs, `sitemap.xml` and `robots.txt` are built from it. `npm run build` stops with a clear error when it is missing. |
| `VITE_GA_ID` | no | Google Analytics id. Loaded only in production builds and only when set. |

## 5. Run the application

```bash
cd apps/web
npm run dev
```

Open <http://localhost:5173/> (landing page) or <http://localhost:5173/draw> (the editor). The dev server reloads
on every change. Other routes: `/gallery`, `/help`, `/setting`, `/command-palette`.

## 6. Tests and quality checks

All commands run in `apps/web`.

| Command | What it does |
|---|---|
| `npm run test:run` | All unit / component tests once (Vitest + jsdom) |
| `npm test` | Vitest in watch mode |
| `npm run test:coverage` | Tests with coverage; HTML report at `coverage/index.html`. Thresholds only go up |
| `npm run e2e` | Builds an E2E bundle and runs Playwright against `vite preview` (Chromium; Firefox with `E2E_FIREFOX=1`) |
| `npm run e2e:report` | Opens the last Playwright HTML report |
| `npm run lint` | ESLint (the warning limit is a ratchet: it may only go down) |
| `npm run type-check` | TypeScript for the app, the strict island, the build config and the E2E specs |
| `npm run format` / `format:check` | Prettier write / check for `src/**` |
| `npm run check` | lint + type-check + format check |
| `npm run report` | coverage + E2E (health report) |

First E2E run only: `npx playwright install chromium` (and `firefox` for `E2E_FIREFOX=1`).

Before committing: `npm run check && npm run test:run` should pass. Guard tests in `src/__tests__/` enforce the
architecture (store API, storage boundary, file size budgets, no hidden failures), so a failing guard means a rule
was broken, not that the test is wrong.

## 7. Build, preview and Docker

```bash
cd apps/web
npm run build      # type-check, then vite build → apps/web/dist (needs VITE_SITE_URL)
npm run preview    # serves dist/ on http://localhost:4173 (0.0.0.0)
```

Self-hosting image (multi-stage: Node builds, an unprivileged nginx serves the static files with the same routing as
GitHub Pages):

```bash
cd apps/web
docker build --build-arg VITE_SITE_URL=https://www.example.com -t fateboard .
docker run --rm -p 8080:8080 fateboard     # http://localhost:8080
```

## 8. CI/CD and deployment

Each app has its **own, separate pipeline** in `.github/workflows/` at the repo root (GitHub only reads it
there). The web app's pipeline:

| Workflow | Job (check name) |
|---|---|
| `web-ci.yml` | entry point: detects changes and wires the stages below; `CI passed` is the required check |
| `_web-quality.yml` | `Quality / Static analysis` (guardrails, audit, format, lint, type-check), `Quality / Unit tests` |
| `_web-e2e.yml` | `Test / E2E` (Chromium + Firefox, 2 shards each) |
| `_web-build.yml` | `Build / Web bundle` (uploads the GitHub Pages artifact) |
| `_web-image.yml` | `Build / Container image` (build + smoke test) |
| `_web-deploy.yml` | `Deploy / GitHub Pages` (push to `main` only, after `CI passed`), then a live smoke test: `/`, `/draw`, `/help`, `/gallery` answer 200, an unknown page 404, and every JS / CSS file `/draw` loads answers 200 (retries for 3 min; red job = check the site, roll back by reverting the merge) |

How the pipelines stay separate:

- Every `run:` step of the web pipeline works inside `apps/web` (`defaults.run.working-directory`); Node comes
  from `apps/web/.nvmrc`, the npm cache is keyed on `apps/web/package-lock.json`, the Docker build context is
  `apps/web`, and artifacts come from `apps/web/dist`, `apps/web/coverage`, `apps/web/playwright-report`.
- `Detect changes` decides per pull request: a PR that only touches another app (`apps/desktop/**`, or that app's
  workflows) skips **every** web job; a docs-only web PR (`apps/web/docs/**`, `apps/web/.claude/**`, `*.md`) runs
  Quality + Build but skips E2E and the image. Shared files (`.github/actions/**`, `packages/**`, root config) run
  the web pipeline. Pushes to `main` always run everything, then deploy.
- The shared setup action `.github/actions/setup-node-deps` takes the app folder (`app-dir: apps/web`), so a new
  app reuses it with its own folder.
- **Adding an app's pipeline** (e.g. desktop): create `desktop-ci.yml` + `_desktop-*.yml` with
  `working-directory: apps/desktop` and `app-dir: apps/desktop`, a change detector mirroring the web one, and a
  final job named `Desktop CI passed`; then add that name to the branch protection's required checks. Add an npm
  entry for `/apps/desktop` in `.github/dependabot.yml`.
- The web pipeline's final job keeps the name **`CI passed`** because branch protection requires exactly that
  name; rename it to `Web CI passed` only together with the branch protection setting.

Deployment target: GitHub Pages serves the static files built by `npm run build`. Required repository variable:
`VITE_SITE_URL` (Settings → Secrets and variables → Actions → Variables); optional `VITE_GA_ID`.

## 9. Git workflow and hooks

- Work on a branch, never on `main`; open a pull request. Branch names: `feat/…`, `fix/…`, `refactor/…`, `chore/…`,
  `docs/…`.
- Commit messages follow Conventional Commits: `type(scope): summary`, e.g. `fix(canvas): keep selection on zoom`.
- The pre-commit hook (`apps/web/.husky/pre-commit`, installed by `npm ci`) runs Prettier and ESLint on staged
  files in `src/`. Never skip it (`--no-verify`).
- Never commit `.env`, build output (`dist/`, `coverage/`, …), `node_modules/` or anything in `deadcode/`.

## 10. Dead code (`deadcode/`)

`deadcode/` at the repo root holds code that was removed from the app, kept locally for reference. It is
**git-ignored**, so it is never committed or pushed.

```
deadcode/
├── apps/web/src/…      removed source files, at the same path they had in apps/web
└── backups/            .dead-code-backup-2026-11-06*.tar.gz (code deleted in the first clean-up)
```

Moved there on 2026-11-24 (nothing imported them; found with an import-graph check from `main.tsx`, every test
and every E2E spec): `src/App.css`, `src/components/config/booleanoperation.config.ts`,
`src/components/organisms/footer/ui/footer.styles.css`, `src/components/atoms/Label.tsx`,
`src/components/atoms/Toggle.tsx`.

Rule: every file in `apps/web/src` must be reachable from `main.tsx` or be a test / test helper. When code
becomes unused, move it to `deadcode/` (same path inside) instead of leaving it in the app.

## 11. Working with Claude Code

Open Claude Code **in `apps/web`** (that is where `CLAUDE.md` and `.claude/` are). There you get the project's
skills (`fate-task`, `fate-review`, `fate-refactor`, `fate-ship`, …), agents (`fate-reviewer`, `fate-verifier`,
…), the guard hook (blocks edits to `.env`, build output, the lockfile; asks before a guardrail is loosened) and
path-scoped rules. Details: [apps/web/docs/AGENT_GUIDE.md](apps/web/docs/AGENT_GUIDE.md).

## 12. Data and storage

Everything is stored locally in the browser; there is no server. The whole project (pages, animation, imported
photos) autosaves to IndexedDB (database `fateboard`); settings use `opendb-store`. Clearing site data erases your
boards, so use **File → Save Board** (`.fateboard`) or **Pages → Export project** for backups.

## 13. Documentation index

All docs are in [`apps/web/docs/`](apps/web/docs/):

| Doc | About |
|---|---|
| [ARCHITECTURE](apps/web/docs/ARCHITECTURE.md) | layers, data flow, canvas ownership, save / load, SEO, deploy |
| [STATE](apps/web/docs/STATE.md) | every zustand slice and key |
| [CANVAS](apps/web/docs/CANVAS.md) | Fabric lifecycle, events, serialization, history, zoom / pan |
| [COMPONENTS](apps/web/docs/COMPONENTS.md) | panels, props, slices used |
| [CONVENTIONS](apps/web/docs/CONVENTIONS.md) | naming, TypeScript, errors, how to add a slice / panel / tool, git |
| [TESTING](apps/web/docs/TESTING.md) | test strategy, mocking Fabric, coverage, Playwright |
| [BUGS](apps/web/docs/BUGS.md) / [BUGS_ARCHIVE](apps/web/docs/BUGS_ARCHIVE.md) | open / fixed bugs |
| [ROADMAP](apps/web/docs/ROADMAP.md) | milestones and features |
| [DECISIONS](apps/web/docs/DECISIONS.md) | decision log and open questions |
| [DESIGN](apps/web/docs/DESIGN.md) | brand tokens, text styles, dark mode, panel rules |
| [CHARACTER_STUDIO](apps/web/docs/CHARACTER_STUDIO.md) | characters, rigs, scenes |
| [PERFORMANCE_AUDIT](apps/web/docs/PERFORMANCE_AUDIT.md) | runtime performance checklist |
| [PRODUCTION_READINESS](apps/web/docs/PRODUCTION_READINESS.md) | ship verdict and what is left |
| [CODE_REVIEW](apps/web/docs/CODE_REVIEW.md) | review findings and refactor roadmap |
| [LIMITATIONS](apps/web/docs/LIMITATIONS.md) | browser limits vs a native editor |
| [PLATFORMS](apps/web/docs/PLATFORMS.md) / [BACKEND](apps/web/docs/BACKEND.md) | plans: PWA, extension, desktop, mobile, accounts, sync, AI |
| [AGENT_WORKFLOW](apps/web/docs/AGENT_WORKFLOW.md) / [AGENT_GUIDE](apps/web/docs/AGENT_GUIDE.md) | Claude Code skills, agents and hooks |

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| `npm ERR! code EBADENGINE` | Wrong Node version: `nvm use` in `apps/web` (needs 26.13.0). |
| `npm ERR! enoent … package.json` | You are at the repo root; `cd apps/web` first. |
| Build stops: `VITE_SITE_URL is missing` | Create `apps/web/.env` from `.env.example` and set `VITE_SITE_URL`. |
| E2E: `Executable doesn't exist` | `npx playwright install chromium` in `apps/web`. |
| Many unrelated E2E timeouts | The machine is busy: check `uptime`, rerun with `npm run e2e -- --workers=2`. |
| Pre-commit hook does not run | Run `npm ci` (or `npm run prepare`) in `apps/web` to reinstall it. |
| Boards gone after clearing browser data | Data is local only; restore from a `.fateboard` file or an exported project. |
