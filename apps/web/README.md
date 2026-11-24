# apps/web (`@fateboard/web`)

The Fateboard web app: the editor at `/draw`, the landing, gallery and help pages. Deployed to GitHub Pages from
`apps/web/dist` (CI) and served by the container image (`Dockerfile` at the repo root).

Run commands from the **repo root** (`npm run dev`, `npm run build`, `npm run test:run`, `npm run e2e`, …): the
root scripts forward here. From this folder `npm run <script>` works too.

- `.env` / `.env.example` are read from the repo root (`envDir` in `vite.config.ts`).
- Dependencies: `npm install <pkg> -w @fateboard/web` from the root (exact versions; one root `package-lock.json`).
- Docs, Claude setup (`.claude/`), CI (`.github/`) and guardrail scripts (`scripts/guardrails/`) are repo-level;
  paths like `src/…` in them are relative to this folder.
