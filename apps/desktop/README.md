# apps/desktop (placeholder)

Reserved for the desktop shell that wraps the web build (`VITE_TARGET=desktop`, hash routing, platform code only
behind `src/platform/`). **Empty on purpose:** the shell is not chosen yet: Tauri 2 (docs/PLATFORMS.md
section 6, Phase 3 spike) or Electron (documented fallback). Log the choice in docs/DECISIONS.md first.

When it gets a `package.json` it becomes an npm workspace. Then, in the same PR:

- run `npm install` and commit `package-lock.json`;
- copy its `package.json` into the Dockerfile `deps` layer (before `npm ci`), or `npm ci` fails in the image;
- add a `Build / Desktop` CI job that is **not** part of `CI passed` until it is stable.
