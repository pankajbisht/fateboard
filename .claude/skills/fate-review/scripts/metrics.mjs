#!/usr/bin/env node
/**
 * Code metrics for fateboard reviews (skill `fate-review`). No dependencies, read-only.
 *
 *   node .claude/skills/fate-review/scripts/metrics.mjs              # every source file over 250 lines
 *   node .claude/skills/fate-review/scripts/metrics.mjs --changed    # files changed vs main (+ working tree)
 *   node .claude/skills/fate-review/scripts/metrics.mjs src/a.tsx …  # given files
 *
 * Columns: lines, budget (300 .tsx / 400 .ts, src/__tests__/fileBudget.test.ts), useState, effects,
 * store reads, canvas calls, `any`, components defined in the file. Flags are heuristics: confirm by reading.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = /\.(ts|tsx)$/;
const SKIP = /__tests__|\.test\.|^src\/test\/|\.d\.ts$/;

const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });

const changedFiles = () => {
    const run = (cmd) => execSync(cmd, { encoding: 'utf8' }).split('\n').filter(Boolean);
    const base = run('git merge-base HEAD main')[0];
    const files = new Set([
        ...run(`git diff --name-only ${base}`),
        ...run('git ls-files --others --exclude-standard'),
    ]);
    return [...files].filter((f) => f.startsWith('src/') && existsSync(f));
};

const args = process.argv.slice(2);
const all = args.length === 0;
const files = (args[0] === '--changed' ? changedFiles() : all ? walk('src') : args).filter(
    (f) => SOURCE.test(f) && !SKIP.test(f),
);

const count = (text, re) => (text.match(re) ?? []).length;

const rows = files
    .map((file) => {
        const text = readFileSync(file, 'utf8');
        const lines = text.split('\n').length;
        const budget = file.endsWith('.tsx') ? 300 : 400;
        const row = {
            file,
            lines,
            budget,
            useState: count(text, /\buseState\b/g),
            effects: count(text, /\buse(Layout)?Effect\(/g),
            store: count(text, /useStore\(|getState\(\)/g),
            canvas: count(text, /\bcanvas\??\.\w+/g),
            any: count(text, /:\s*any\b|as any\b|<any>/g),
            components: count(text, /^(export )?(default )?(function|const) [A-Z]\w*\s*(=\s*(memo\()?\(|\()/gm),
        };
        const flags = [];
        if (lines > budget) flags.push(`over budget (${budget})`);
        if (file.endsWith('.tsx') && row.components > 3) flags.push('many components in one file');
        if (file.endsWith('.tsx') && row.useState > 8) flags.push('state-heavy component');
        if (file.endsWith('.tsx') && row.effects > 5) flags.push('effect-heavy component');
        if (file.startsWith('src/components/') && /canvas\??\.(add|remove|clear)\(/.test(text))
            flags.push('component mutates Fabric');
        if (/^src\/(store|lib)\//.test(file) && /from '@\/components\//.test(text))
            flags.push('imports from components (layering)');
        if (/^src\/lib\//.test(file) && /from '@\/store/.test(text)) flags.push('lib imports store');
        if (/^src\/store\/slices\//.test(file) && /^let \w+/m.test(text))
            flags.push('module-level state in slice');
        return { ...row, flags };
    })
    .filter((r) => !all || r.lines > 250 || r.flags.length > 1)
    .sort((a, b) => b.lines - a.lines);

const pad = (s, n) => String(s).padEnd(n);
console.log(
    pad('file', 60),
    pad('lines', 6),
    pad('state', 6),
    pad('eff', 4),
    pad('store', 6),
    pad('canv', 5),
    pad('any', 4),
    pad('comp', 5),
    'flags',
);
for (const r of rows) {
    console.log(
        pad(r.file, 60),
        pad(r.lines, 6),
        pad(r.useState, 6),
        pad(r.effects, 4),
        pad(r.store, 6),
        pad(r.canvas, 5),
        pad(r.any, 4),
        pad(r.components, 5),
        r.flags.join('; '),
    );
}
console.log(`\n${rows.length} file(s); ${rows.filter((r) => r.flags.length).length} flagged`);
