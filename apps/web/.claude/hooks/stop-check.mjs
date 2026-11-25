#!/usr/bin/env node
/**
 * Stop hook: when Claude edited TypeScript this session, run the full type-check (app + strict island + node +
 * e2e configs, about 6 s) and the unit tests related to the edited files (`vitest related`) before the turn ends.
 * Failure exits 2 so Claude keeps working and fixes it. If it already tried once (`stop_hook_active`), it reports
 * instead of blocking again, so a stuck failure can never loop. Success clears the list. Nothing edited = no-op.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { clearTouched, readTouched } from './state.mjs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const touched = readTouched(input.session_id).filter((f) => existsSync(path.join(root, f)));
if (!touched.length) process.exit(0);

const tail = (text, lines = 40) => text.trim().split('\n').slice(-lines).join('\n');
const run = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' } });
    return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};

const failures = [];
const types = run('npm', ['run', '--silent', 'type-check']);
if (!types.ok) failures.push(`npm run type-check failed:\n${tail(types.out)}`);

const sources = touched.filter((f) => f.startsWith('src/'));
if (sources.length) {
    const tests = run(path.join(root, 'node_modules', '.bin', 'vitest'), ['related', '--run', ...sources]);
    const none = /No test files found/i.test(tests.out);
    if (!tests.ok && !none) failures.push(`vitest related ${sources.join(' ')} failed:\n${tail(tests.out)}`);
}

if (!failures.length) {
    clearTouched(input.session_id);
    process.exit(0);
}

const report = failures.join('\n\n');
if (input.stop_hook_active) {
    process.stdout.write(
        JSON.stringify({ systemMessage: `[stop-check] still failing after a fix attempt:\n${tail(report, 20)}` }),
    );
    process.exit(0);
}
process.stderr.write(`[stop-check] Not done yet: fix these before finishing.\n\n${report}\n`);
process.exit(2);
