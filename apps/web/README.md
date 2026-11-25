# Fateboard web app

This folder is the complete Fateboard web application: source (`src/`), end-to-end tests (`e2e/`), assets
(`public/`), docs (`docs/`), configs, Docker image, CI workflows and the Claude Code setup.

Quick start (Node 26.13.0, see `.nvmrc`):

```bash
nvm use
npm ci
cp .env.example .env    # set VITE_SITE_URL
npm run dev             # http://localhost:5173/draw
```

The full guide (layout, every command, tests, build, Docker, CI/CD, git workflow, dead code, docs index,
troubleshooting) is the repository README: [../../README.md](../../README.md).
