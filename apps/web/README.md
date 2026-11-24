# apps/web (placeholder)

Reserved for the web app. **Empty on purpose:** the web app still lives at the repo root (`src/`, `public/`,
`e2e/`, `index.html`, configs) and deploys to GitHub Pages from `dist/`.

Moving it here is Phase 3 of the monorepo plan (docs/PLATFORMS.md section 9): one PR that also updates every
hard-coded root path (CI `dist` artifact, Dockerfile, tsconfig / vite / vitest / eslint, `.claude` hooks and rules,
guard tests, lint-staged). Do not add files here before that PR.

While this folder has no `package.json`, npm workspaces ignore it.
