---
name: fate-seo
description: SEO check for the fateboard repo. Use whenever a change adds, removes or renames a route or page, changes visible page text, headings, links or images on a public page, or touches index.html, public/, src/app/seo, the route registry or vite.config.ts; also when asked to check, audit or improve SEO, titles, meta tags, sitemap, canonical URLs or indexing. Run it before calling such a change done.
---

# SEO check (always, for any public page change)

The site is a static SPA on GitHub Pages: crawlers get the **prerendered HTML** per route, then React takes
over. Source of truth: docs/ARCHITECTURE.md "SEO" (read that section, not the file). Never hard-code the
domain; it comes from `VITE_SITE_URL`.

## 1. Scope

`git diff --name-only` (+ untracked). Map each change to the routes it affects:

| Changed | Affects |
|---|---|
| `src/app/routes/*` (`PATHS`, `APP_ROUTES`) | that route: needs an `SEO_ROUTES` decision |
| `src/app/seo/*`, `vite.config.ts` prerender plugin | every route |
| `index.html` | `/` + the head every route copies |
| `src/components/pages/**` | that page's visible `h1`, text, links, images |
| `public/**` | crawl files, OG image, a folder that may shadow a route (see 3) |

Nothing public touched → say "no SEO impact" with the reason and stop.

## 2. Source checks (read the diff, fix before building)

- **Every public route has an `SEO_ROUTES` entry** (`src/app/seo/routes.ts`) in the same change as its
  `APP_ROUTES` entry. Decide `index`: content pages `true`; tools, settings, palettes, per-user pages `false`.
- **Title**: unique, keyword first, ends `| Fateboard`, ≤ 60 chars for indexable routes.
  **Description**: 50–160 chars, says what the visitor gets. `heading` = the page's real visible `h1`;
  `intro` = a true one-line summary (the fallback must match what the app shows, or it is cloaking).
- **One `h1` per page**, then `h2` / `h3` in order (axe `heading-order` fails otherwise).
- **Links are crawlable**: navigation to another page is `<Link to={PATHS.x}>` / `<a href>`, never only a
  `<button onClick={navigate}>`. Content that deserves indexing has a URL (a route), not a `#hash` section or
  a state toggle. Use `PATHS` constants, not string literals.
- **Images**: meaningful `alt` (decorative = `alt=""`), `width` / `height`, `loading="lazy"` below the fold.
- **Renames / removed routes**: old URLs are in the sitemap and in search results. Keep a redirect path
  (`legacyHashUrl.ts` pattern) or accept the 404 explicitly in the report.
- `/` changes: update `index.html` **and** the `/` entry together (`seo.test.ts` compares them). JSON-LD
  `featureList` lists only real features.

## 3. Build and audit what crawlers get

```
npx vitest run src/__tests__/seo.test.ts src/app/seo 2>&1 | grep -E "FAIL|×|Test Files|Tests "
npm run build 2>&1 | grep -iE "error|built in"
node .claude/skills/fate-seo/scripts/seo-audit.mjs | grep -E "ERROR|WARN|errors|pages,"
```

The audit reads `dist/`: per page title, description, robots, canonical = og:url = site + path (indexable)
or no canonical (noindex), og/twitter text = route text, exactly one fallback `h1`, no `%VITE_*%`,
duplicate titles / descriptions, sitemap = exactly the indexable pages, robots points at the sitemap, 404
is noindex. **Every ERROR must be fixed.** WARNs: fix or name in the report with a reason.

Folder-shadow WARN (`dist/x.html` next to `dist/x/`, e.g. `/gallery` and `public/gallery/`): GitHub Pages
behaviour is `UNKNOWN - verify` on the live site (`curl -sI <site>/x` → 200, no 301 to `/x/`). The app still
renders either way; the risk is a redirect hop and a canonical mismatch.

## 4. Browser checks (for route or head changes)

```
npm run e2e -- e2e/seo.spec.ts e2e/a11y.spec.ts --reporter=line 2>&1 | grep -E "passed|failed|✘"
```

A new public route also gets a line in `e2e/a11y.spec.ts` `ROUTES` and a direct-visit HTTP 200 assertion in
its feature spec. Client-side navigation updates the head through `RouteSeo` only (never set
`document.title` elsewhere).

## 5. Report

```
SEO: <routes affected> | audit <n> errors, <n> warnings | seo tests <pass/fail> | e2e <pass/fail/not run>
- <each WARN kept, with why>
- <UNKNOWN - verify items for the owner (live URL checks)>
```
