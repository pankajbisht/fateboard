# apps/desktop (placeholder)

Reserved for the desktop shell that wraps the web build (`VITE_TARGET=desktop`, hash routing, platform code only
behind `src/platform/`). **Empty on purpose:** the shell is not chosen yet: Tauri 2 (docs/PLATFORMS.md
section 6, Phase 3 spike) or Electron (documented fallback). Log the choice in docs/DECISIONS.md first.

When it gets code, it becomes its own project like `apps/web` (own `package.json`, `package-lock.json`,
`node_modules`). Then, in the same PR:

- run `npm install` here and commit its `package-lock.json`;
- if it imports the web build, build `apps/web` first (`npm run build` there) instead of reaching into its files;
- add a `Build / Desktop` CI job that is **not** part of `CI passed` until it is stable.
