# Fateboard

A browser-based canvas editor for designs and whiteboards: shapes with text and connectors, 14 freehand brushes,
layers, multiple pages, templates, image filters, repeat/tiling tools, a path node editor, and keyframe animation with
MP4/WebM export.

Built with React 19, TypeScript, Vite 7, Tailwind CSS 4, zustand 5 and **Fabric.js 7.1**. Deployed as a static
site on GitHub Pages: [fateboard.com](https://www.fateboard.com). The editor lives at `/draw`.

> Status: being hardened to production grade. Known issues are tracked in [docs/BUGS.md](docs/BUGS.md) and planned
> work in [docs/ROADMAP.md](docs/ROADMAP.md). Some data (extra pages, animations) is not saved across reloads yet.

## Setup

Requirements: Node **26.13.0** exactly (`.nvmrc`, `package.json` `engines`, Dockerfile, CI all match) and npm.
Every package is pinned to an exact version (`.npmrc`: `save-exact`, `engine-strict`); see docs/DECISIONS.md.

```bash
nvm install        # reads .nvmrc (v26.13.0)
nvm use
npm ci             # installs deps and husky git hooks
npm run dev        # http://localhost:5173/draw
```

Configuration lives in `.env` (git-ignored); copy `.env.example` and fill it in:

- `VITE_SITE_URL` (**required for every build**): the public origin, e.g. `https://www.fateboard.com`. Canonical links,
  Open Graph / JSON-LD URLs, `sitemap.xml` and `robots.txt` are built from it; `npm run build` stops with a clear error
  when it is missing or not an `http(s)` origin.
- `VITE_GA_ID` (optional): Google Analytics id. `src/lib/utils/analytics.ts` loads gtag only in production builds and
  only when it is set.

CI reads both from repository variables of the same names (Settings > Secrets and variables > Actions > Variables).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | type-check (see note), `tsc -b`, `vite build` → `dist/` |
| `npm run build:no-check` | `vite build` only (CI and Docker now use `npm run build`) |
| `npm run preview` | Serve `dist/` (`--host 0.0.0.0`) |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier write/check for `src/**` |
| `npm run type-check` | Type-check app (`tsconfig.app.json`) and build config (`tsconfig.node.json`) |
| `npm run check` | lint + type-check + format check |
| `npm test` / `npm run test:run` | Vitest (watch / single run) |
| `npm run test:coverage` | Coverage (`@vitest/coverage-v8`) |
| `npm run server` | `json-server` on `db.json` (no `db.json` in the repo; unused) |
| `npm run clean` | `rimraf dist` (`rimraf` is not a declared dependency) |

Docker (self-hosting; the production target is GitHub Pages): `docker build --build-arg VITE_SITE_URL=https://www.example.com -t fateboard . && docker run --rm -p 8080:8080 fateboard`. Multi-stage: Node builds, an unprivileged nginx serves the static files (`docker/nginx.conf`, same routing as Pages). CI builds and smoke-tests it (`.github/workflows/_build-image.yml`, layer-cached).

## Project structure

```
src/
  app/rootRouter.tsx      routes: /, /draw, /setting, /command-palette, /help (each a lazy chunk)
  store/                  single zustand store composed from slices (store/slices/*)
  animation/              keyframe engine + video export
  components/             atoms → molecules → organisms → templates → pages
  lib/, hooks/, feature/  domain helpers (patterns, connectors, text shapes, import, shortcuts)
docs/                     architecture and engineering docs (start with CLAUDE.md)
.github/workflows/ci.yml  only entry point: reusable _quality / _e2e (4 shards) / _build-web / _build-image (parallel) → CI passed → _deploy (main only)
.github/actions/          setup-node-deps: shared Node (.nvmrc) + npm ci step
```

## Documentation

| Doc | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Short working guide: commands, rules, definition of done, how we work |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, data flow diagram, canvas ownership, save/load |
| [docs/STATE.md](docs/STATE.md) | Every store slice: fields, actions, dependencies, risks |
| [docs/CANVAS.md](docs/CANVAS.md) | Fabric lifecycle, events, serialization, history, zoom/pan |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | Panels and components, props, slices used, dead code |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Code conventions; adding a slice, panel or tool |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy and the proposed Vitest/RTL/Playwright setup |
| [docs/BUGS.md](docs/BUGS.md) | Bug audit |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones and features |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decisions and open questions |

## Storage

Everything is stored locally in the browser. The whole project (every page, its animation and imported photos)
autosaves to IndexedDB (database `fateboard`, key `project`); settings use `opendb-store` (`fateboard-settings`).
Boards saved by older versions under `drawJson` are moved into the project on first load. Custom shapes, patterns,
font templates and share previews use `localStorage`.
Clearing site data erases your boards. Use **File → Save Board** (`.fateboard`) or **Pages → Export project** for
backups.
