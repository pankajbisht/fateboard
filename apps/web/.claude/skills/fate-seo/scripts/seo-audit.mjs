#!/usr/bin/env node
/**
 * SEO audit of the BUILT site (run `npm run build` first). Reads every prerendered page in dist/,
 * sitemap.xml and robots.txt, and checks what crawlers actually get. No dependencies.
 *
 *   node .claude/skills/fate-seo/scripts/seo-audit.mjs [distDir]
 *
 * Prints one line per page, then ERROR / WARN lines. Exit 1 when there is any ERROR.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.argv[2] ?? 'dist');
if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error(`No ${DIST}/index.html: run \`npm run build\` first.`);
    process.exit(2);
}

const errors = [];
const warns = [];
const err = (where, msg) => errors.push(`ERROR ${where}: ${msg}`);
const warn = (where, msg) => warns.push(`WARN  ${where}: ${msg}`);

const decode = (s) =>
    s
        ?.replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
const metaOf = (html, attr, key) => {
    const tag = html.match(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*>`, 'i'))?.[0];
    return decode(tag?.match(/content="([^"]*)"/i)?.[1]);
};
const linkOf = (html, rel) =>
    decode(
        html
            .match(new RegExp(`<link[^>]*rel="${rel}"[^>]*>`, 'i'))?.[0]
            ?.match(/href="([^"]*)"/i)?.[1],
    );

/** dist-relative html file → route path */
const routeOf = (file) => {
    const rel = file.replace(/\\/g, '/');
    if (rel === 'index.html') return '/';
    return `/${rel.replace(/\.html$/, '')}`;
};

function htmlFiles(dir, base = '') {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        const rel = base ? `${base}/${name}` : name;
        if (statSync(full).isDirectory()) {
            if (name !== 'assets') out.push(...htmlFiles(full, rel));
        } else if (name.endsWith('.html')) out.push(rel);
    }
    return out;
}

const pages = [];
for (const file of htmlFiles(DIST)) {
    const html = readFileSync(path.join(DIST, file), 'utf8');
    const route = file === '404.html' ? '(404)' : routeOf(file);
    const root = html.split('id="fateboard"')[1] ?? '';
    pages.push({
        file,
        route,
        html,
        title: decode(html.match(/<title>([^<]*)<\/title>/i)?.[1]),
        description: metaOf(html, 'name', 'description'),
        robots: metaOf(html, 'name', 'robots') ?? '',
        canonical: linkOf(html, 'canonical'),
        ogUrl: metaOf(html, 'property', 'og:url'),
        ogTitle: metaOf(html, 'property', 'og:title'),
        ogDescription: metaOf(html, 'property', 'og:description'),
        twTitle: metaOf(html, 'name', 'twitter:title'),
        h1s: [...root.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
            decode(m[1].replace(/<[^>]+>/g, '')),
        ),
        intro: /data-seo="intro"/.test(root),
    });
}

const indexHome = pages.find((p) => p.route === '/');
const site = indexHome?.canonical?.replace(/\/$/, '');
if (!site) err('/', 'no canonical on index.html, cannot infer the site URL');

for (const p of pages) {
    const at = p.route;
    const indexable = !/noindex/i.test(p.robots);
    if (/%VITE_[A-Z_]+%/.test(p.html)) err(at, 'unreplaced %VITE_*% placeholder');
    if (!p.title) err(at, 'no <title>');
    else {
        if (!/\| Fateboard$|^Fateboard$/.test(p.title))
            warn(at, `title does not end with "| Fateboard": "${p.title}"`);
        if (p.title.length > 60 && indexable)
            warn(at, `title ${p.title.length} chars (> 60 is cut in results)`);
    }
    if (!p.description) err(at, 'no meta description');
    else if (indexable && (p.description.length < 50 || p.description.length > 160))
        err(at, `description ${p.description.length} chars (want 50-160)`);
    if (!p.robots) err(at, 'no meta robots');

    if (p.route === '(404)') {
        if (indexable) err(at, '404 page is indexable');
        if (p.canonical) err(at, '404 page has a canonical');
        continue;
    }
    const expected = `${site}${p.route === '/' ? '/' : p.route}`;
    if (indexable) {
        if (p.canonical !== expected) err(at, `canonical ${p.canonical} != ${expected}`);
        if (p.ogUrl !== expected) err(at, `og:url ${p.ogUrl} != ${expected}`);
    } else if (p.canonical) err(at, 'noindex page has a canonical');
    if (!p.ogTitle || !p.ogDescription) err(at, 'no og:title / og:description');
    // `/` is hand-written in index.html (social copy may differ); prerendered routes copy the route's text
    else if (p.route !== '/') {
        if (p.ogTitle !== p.title) err(at, 'og:title differs from <title>');
        if (p.twTitle && p.twTitle !== p.title) err(at, 'twitter:title differs from <title>');
        if (p.ogDescription !== p.description)
            err(at, 'og:description differs from the meta description');
    }
    if (p.h1s.length !== 1) err(at, `${p.h1s.length} <h1> in the crawlable fallback (want 1)`);
    if (!p.intro) warn(at, 'no data-seo="intro" fallback text');
}

// duplicates across indexable pages
const live = pages.filter((p) => p.route !== '(404)' && !/noindex/i.test(p.robots));
for (const key of ['title', 'description']) {
    const seen = new Map();
    for (const p of live) {
        if (!p[key]) continue;
        if (seen.has(p[key])) err(p.route, `duplicate ${key} with ${seen.get(p[key])}`);
        else seen.set(p[key], p.route);
    }
}

// sitemap = exactly the indexable pages
const sitemapFile = path.join(DIST, 'sitemap.xml');
if (!existsSync(sitemapFile)) err('sitemap.xml', 'missing');
else {
    const locs = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => m[1],
    );
    const want = live.map((p) => `${site}${p.route === '/' ? '/' : p.route}`);
    for (const u of want) if (!locs.includes(u)) err('sitemap.xml', `missing ${u}`);
    for (const u of locs)
        if (!want.includes(u)) err('sitemap.xml', `lists ${u} (no indexable page)`);
}
const robots = existsSync(path.join(DIST, 'robots.txt'))
    ? readFileSync(path.join(DIST, 'robots.txt'), 'utf8')
    : '';
if (!robots) err('robots.txt', 'missing');
else if (!robots.includes(`Sitemap: ${site}/sitemap.xml`))
    err('robots.txt', 'does not point at the sitemap');

// a route file next to a same-named folder: GitHub Pages may 301 /x -> /x/ (verify on deploy)
for (const p of pages) {
    const dir = path.join(DIST, p.file.replace(/\.html$/, ''));
    if (p.file !== 'index.html' && existsSync(dir) && statSync(dir).isDirectory())
        warn(
            p.route,
            `dist/${p.file} sits next to folder dist/${p.file.replace(/\.html$/, '')}/: check the live URL has no slash redirect`,
        );
}

for (const p of pages.sort((a, b) => a.route.localeCompare(b.route)))
    console.log(
        `${/noindex/i.test(p.robots) ? 'noindex' : 'index  '} ${p.route.padEnd(36)} ${p.title ?? '(no title)'}`,
    );
console.log(`\n${pages.length} pages, ${live.length} indexable, site ${site}`);
for (const line of [...errors, ...warns]) console.log(line);
console.log(`\n${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
