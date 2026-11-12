#!/usr/bin/env node
/**
 * CI guardrail: fail a pull request that loosens a ratchet or removes a public store key compared with its base.
 *   node scripts/guardrails/check-ratchets.mjs [baseRef=HEAD^1]
 * On a pull_request checkout HEAD is the merge commit, so HEAD^1 is the base branch tip (checkout fetch-depth: 2).
 * Owner approval: PR label `ratchet-change` (sets ALLOW_RATCHET_CHANGE=1) or `api-change` (ALLOW_API_CHANGE=1).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { GUARDED } from './ratchets.mjs';

const base = process.argv[2] || 'HEAD^1';
const allowed = {
    ratchet: process.env.ALLOW_RATCHET_CHANGE === '1',
    api: process.env.ALLOW_API_CHANGE === '1',
};
const LABEL = { ratchet: 'ratchet-change', api: 'api-change' };

const atBase = (file) => {
    try {
        return execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
        return undefined; // new file: nothing to loosen
    }
};

const findings = Object.entries(GUARDED).flatMap(([file, check]) => {
    const before = atBase(file);
    const after = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
    return before === undefined ? [] : check(before, after).map((f) => ({ ...f, file }));
});

if (!findings.length) {
    console.log(`Guardrails: no ratchet loosened and no public store key removed (vs ${base}).`);
    process.exit(0);
}

let failed = false;
for (const f of findings) {
    const ok = allowed[f.kind];
    failed ||= !ok;
    console.log(`${ok ? 'approved' : 'BLOCKED '}  ${f.file}: ${f.message}${ok ? '' : `  (needs PR label "${LABEL[f.kind]}")`}`);
}
if (failed) {
    console.log(
        '\nA ratchet only moves one way and public store keys are an API (CLAUDE.md "How we work").' +
            '\nFix the cause instead, or have the owner approve the change by adding the label above.',
    );
}
process.exit(failed ? 1 : 0);
