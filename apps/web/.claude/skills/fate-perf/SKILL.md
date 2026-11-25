---
name: fate-perf
description: Loading-performance check for the fateboard repo - lazy loading, code splitting, chunk sizes, dynamic imports, vendor chunks, preloading and image loading. Use whenever a change adds a route or page, a dependency, an import of a heavy module (fabric, paper, the store, commandConfig, animation/export, templates), large data or images, or edits vite.config.ts build options; also when asked why a page is slow to load, or to add lazy loading or code splitting. Measures the build before and after instead of guessing.
---

# Loading performance: split by how this project loads

Facts (docs/ARCHITECTURE.md "Bundles and assets"; read that section, not the file):

- **Routes** are lazy chunks registered once in `src/app/routes/appRoutes.tsx` (`APP_ROUTES`, `lazy(() =>
  import(...))`); `rootRouter.tsx` only renders them inside one `Suspense`. Guard: `codeSplitting.test.ts`.
- **Startup** (every route pays it) = entry + `react` + `icons` ≈ 126 KB gzip. The store and Fabric (≈ 184 KB)
  load with the lazy `RootLayout` on editor routes only; site pages use `SiteLayout` (BUG-209). Never import
  `@/store`, `fabric` or `lib/fabricChrome` from `main.tsx`, `rootRouter`, `SiteLayout` or a site page
  (`landingBundle.test.ts`). `preloadRoute()` starts layout + page chunks in parallel.
- **On demand**: paper.js (`lib/booleanOps`), video export / mp4-muxer (`animation/exportVideo`), the command
  registry for `/command-palette`. Keep them behind `await import()`.
- **Landing** static imports must not reach `commandConfig`, `helpShortcuts`, `HelpPage`, `GallerySection`
  (`landingBundle.test.ts`). Gallery artwork is static SVG in `public/gallery/`, loaded by `<img>`.

## 1. Measure first (before editing)

```
npm run build 2>&1 | grep -iE "error|built in"
node .claude/skills/fate-perf/scripts/bundle-report.mjs --save <scratchpad>/bundle-before.json
```

Startup gzip, then every lazy chunk with the extra gzip it adds. Note the numbers in the plan.

## 2. Decide the split (rules, in order)

1. **New page → new `APP_ROUTES` entry** with `lazy()`. Never a static page import in the router or registry.
   Public pages also need `SEO_ROUTES` (skill `fate-seo`).
2. **Heavy and not needed for first paint → dynamic `import()` at the moment of use** (click, panel open,
   export start), with a loading / error state; actions catch the import failure and `console.error('[slice] …')`
   (CLAUDE.md errors rule). Candidates: anything > ~20 KB gzip that one feature uses.
3. **Big sections inside a page that most visitors never reach** (long lists, galleries, editors of a rare
   feature) → own route if they deserve a URL, else `lazy()` + `Suspense` at the section, not a whole-page
   spinner. Don't split tiny components: every chunk is a request; < ~2 KB gzip is not worth it.
4. **A new vendor dependency used by one feature** stays in that feature's chunk. Add a `codeSplitting.groups`
   entry only for libraries shared by several routes and stable across deploys (cache wins).
5. **Never import from a module that imports the store into a slice statically** (BUG-048); use `await import()`.
6. **Images**: `loading="lazy"` + `width` / `height` below the fold, `decoding="async"`; static assets in
   `public/` at the size shown (template thumbs 640 px, `templateAssets.test.ts`). Above-the-fold hero images
   are not lazy.
7. **Preloading**: only for the next likely chunk (e.g. warm `Editor` on hover of "Start Drawing" with the same
   `import()` the registry uses). No `modulepreload` for lazy routes in `index.html`.
8. **Suspense fallbacks** keep the layout (blank background `PageLoading`, or the section's size), no text flash.
   A failed chunk load after a deploy must reach the `ErrorBoundary` (Reload), never a blank page.

Accepted exceptions are listed in docs ARCHITECTURE "Bundles and assets"; changing one is an owner decision.

## 3. Guard it

- New lazy page → add it to `codeSplitting.test.ts` "every routed page is lazy-loaded".
- Something must stay out of a page → add it to `landingBundle.test.ts` (or a similar static-graph test).
- A user-visible "does not load X" claim → Playwright: record `page.on('request')` and assert the asset is not
  requested (pattern: `e2e/gallery.spec.ts` first test).

## 4. Measure after and report

```
npm run build 2>&1 | grep -iE "error|built in"
node .claude/skills/fate-perf/scripts/bundle-report.mjs --compare <scratchpad>/bundle-before.json | tail -15
```

Report: startup before → after, each changed lazy chunk, the guard tests added, and anything that grew with
the reason. Startup growing > 5 KB gzip, or a new chunk > 100 KB gzip, needs a sentence in the report and the
numbers in docs ARCHITECTURE "Bundles and assets" / PRODUCTION_READINESS "Performance".
