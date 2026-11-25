---
paths:
    - 'src/app/**'
    - 'src/components/pages/**'
    - 'src/main.tsx'
    - 'index.html'
    - 'public/**'
    - 'vite.config.ts'
---

# Pages, routes and the build: SEO + loading performance

You are touching what crawlers read or what pages download. Before the change is done:

- **SEO**: run skill `fate-seo` (source checks, `seo-audit.mjs` on the build, `seo.spec` / `a11y.spec`).
  New public route = `APP_ROUTES` + `SEO_ROUTES` entry in the same change. One `h1`; links between pages are
  `<Link to={PATHS.x}>`, not buttons; content worth indexing has its own route, not a `#hash`.
- **Loading**: run skill `fate-perf` when you add a route, a dependency, an import of a heavy module (store,
  fabric, paper, commandConfig, animation/export) or images: `bundle-report.mjs --save` before,
  `--compare` after, report the startup and chunk deltas. New pages are `lazy()` in `APP_ROUTES`
  (`codeSplitting.test.ts`); the landing stays light (`landingBundle.test.ts`).
- Guards: `seo.test.ts`, `src/app/seo/__tests__/*`, `app/routes/__tests__/appRoutes.test.ts`.
