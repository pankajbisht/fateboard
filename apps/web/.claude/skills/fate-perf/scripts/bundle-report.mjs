#!/usr/bin/env node
/**
 * What each page really downloads, from the BUILT site (run `npm run build` first). No dependencies.
 *
 *   node .claude/skills/fate-perf/scripts/bundle-report.mjs [--save file.json] [--compare file.json] [--dist dir]
 *
 * - Startup: the entry script + every modulepreload in dist/index.html (+ their static imports), i.e. what
 *   every route pays before its page chunk runs.
 * - Lazy chunks: every dynamic `import()` target (route pages, paper, video export, ...) with the extra gzip
 *   it adds on top of startup (its static import closure minus startup).
 * - --save writes the numbers; --compare prints the delta against a saved run (use the scratchpad).
 * Sizes are gzip (level 9) of the files on disk. Exit 0 always: budgets are judged by the skill, not here.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
};
const DIST = path.resolve(arg('--dist') ?? 'dist');
const ASSETS = path.join(DIST, 'assets');
if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error(`No ${DIST}/index.html: run \`npm run build\` first.`);
    process.exit(2);
}

const files = readdirSync(ASSETS).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
const src = new Map(files.map((f) => [f, readFileSync(path.join(ASSETS, f), 'utf8')]));
const gz = new Map(files.map((f) => [f, gzipSync(src.get(f), { level: 9 }).length]));
/** chunk name without the content hash: `Editor-8hinLeDy.js` → `Editor` */
const label = (f) =>
    f.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, (_, ext) => (ext === 'css' ? '.css' : ''));

const staticDeps = (f) => {
    const code = src.get(f) ?? '';
    const deps = new Set();
    // `import{a}from"./x.js"`, `import"./x.js"`, `export{a}from"./x.js"` (not `import("./x.js")`)
    for (const m of code.matchAll(/(?:from|import)\s*["']\.\/([^"'`]+\.js)["']/g)) deps.add(m[1]);
    return [...deps].filter((d) => src.has(d));
};
const dynamicDeps = (f) =>
    [...(src.get(f) ?? '').matchAll(/import\(\s*[`"']\.\/([^`"']+\.js)[`"']\s*\)/g)]
        .map((m) => m[1])
        .filter((d) => src.has(d));
const closure = (roots) => {
    const seen = new Set();
    const queue = [...roots];
    while (queue.length) {
        const f = queue.pop();
        if (seen.has(f)) continue;
        seen.add(f);
        queue.push(...staticDeps(f));
    }
    return seen;
};
const sum = (set) => [...set].reduce((n, f) => n + (gz.get(f) ?? 0), 0);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const indexHtml = readFileSync(path.join(DIST, 'index.html'), 'utf8');
const startRoots = [...indexHtml.matchAll(/(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g)].map(
    (m) => m[1],
);
const startup = closure(startRoots.filter((f) => f.endsWith('.js')));
for (const css of startRoots.filter((f) => f.endsWith('.css'))) startup.add(css);

const lazyTargets = new Set();
for (const f of files) for (const d of dynamicDeps(f)) lazyTargets.add(d);
const lazy = [...lazyTargets]
    .map((f) => {
        const extra = [...closure([f])].filter((x) => !startup.has(x));
        return { chunk: label(f), own: gz.get(f), extra: sum(new Set(extra)), files: extra.length };
    })
    .sort((a, b) => b.extra - a.extra);

const report = {
    startup: sum(startup),
    startupFiles: [...startup]
        .map((f) => ({ chunk: label(f), gz: gz.get(f) }))
        .sort((a, b) => b.gz - a.gz),
    lazy,
};

console.log(`Startup (every route): ${kb(report.startup)} gzip in ${startup.size} files`);
for (const { chunk, gz: g } of report.startupFiles.slice(0, 12))
    console.log(`  ${chunk.padEnd(28)} ${kb(g).padStart(10)}`);
console.log(`\nLazy chunks (extra gzip on top of startup, own chunk, files):`);
for (const l of lazy)
    console.log(
        `  ${l.chunk.padEnd(28)} +${kb(l.extra).padStart(10)}  own ${kb(l.own).padStart(9)}  ${l.files} files`,
    );

const cmp = arg('--compare');
if (cmp && existsSync(cmp)) {
    const old = JSON.parse(readFileSync(cmp, 'utf8'));
    const d = (a, b) => `${a - b >= 0 ? '+' : ''}${kb(a - b)}`;
    console.log(`\nDelta vs ${cmp}:`);
    console.log(`  startup ${d(report.startup, old.startup)}`);
    const before = new Map(old.lazy.map((l) => [l.chunk, l.extra]));
    for (const l of lazy) {
        if (!before.has(l.chunk)) console.log(`  ${l.chunk}: new, +${kb(l.extra)}`);
        else if (Math.abs(l.extra - before.get(l.chunk)) >= 512)
            console.log(`  ${l.chunk}: ${d(l.extra, before.get(l.chunk))}`);
        before.delete(l.chunk);
    }
    for (const gone of before.keys()) console.log(`  ${gone}: removed`);
}
const save = arg('--save');
if (save) {
    writeFileSync(save, JSON.stringify(report, null, 2));
    console.log(`\nSaved to ${save}`);
}
