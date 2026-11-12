/**
 * Guardrails shared by CI (`check-ratchets.mjs`), the Claude guard hook (`.claude/hooks/guard.mjs`) and the repo
 * test (`src/__tests__/guardrails.test.ts`). Pure functions over file text: no I/O, no dependencies.
 *
 * A ratchet is a number that may only move one way (lint warnings down, coverage up, size ceilings down).
 * Loosening one, or removing a public store key, is allowed only with the owner's explicit approval
 * (PR label in CI, a permission prompt for Claude). docs/AGENT_WORKFLOW.md "Guardrails".
 */

/** Test-integrity markers: each one hides a failure instead of fixing it. */
export const INTEGRITY = {
    'focused test (.only)': /\b(?:it|test|describe)\.only\s*\(/g,
    'skipped test (.skip / xit)': /\b(?:it|test|describe)\.skip\s*\(|\bx(?:it|describe)\s*\(/g,
    '@ts-ignore / @ts-nocheck': /@ts-(?:ignore|nocheck)\b/g,
    '@ts-expect-error without a reason': /@ts-expect-error(?![ \t:-]*[A-Za-z]{3})/g,
    'eslint-disable without a "-- reason"': /eslint-disable(?:-next-line|-line)?\b(?![^\n]*\s--\s)/g,
};

/** Files whose source text quotes the markers above on purpose. */
export const INTEGRITY_EXEMPT = /^(scripts\/guardrails\/|\.claude\/|src\/__tests__\/(guardrails|claudeSetup)\.test\.ts$)/;
export const CODE_FILE = /\.(tsx?|jsx?|mjs|cjs)$/;

export const countMarkers = (text) =>
    Object.fromEntries(Object.entries(INTEGRITY).map(([name, re]) => [name, (text.match(re) ?? []).length]));

/** Markers the new text adds compared with the old one, e.g. ['skipped test (.skip / xit) +1']. */
export function addedMarkers(before, after) {
    const a = countMarkers(before);
    const b = countMarkers(after);
    return Object.keys(b)
        .filter((name) => b[name] > a[name])
        .map((name) => `${name} +${b[name] - a[name]}`);
}

/* ------------------------------ readers ------------------------------ */

const num = (re, text) => {
    const m = re.exec(text ?? '');
    return m ? Number(m[1]) : undefined;
};
const pairs = (re, text) => Object.fromEntries([...(text ?? '').matchAll(re)].map((m) => [m[1], Number(m[2])]));

export const read = {
    maxWarnings: (pkg) => num(/--max-warnings\s+(\d+)/, pkg),
    coverage: (config) => pairs(/(statements|branches|functions|lines):\s*(\d+(?:\.\d+)?)/g, /thresholds:\s*\{[^}]*\}/.exec(config ?? '')?.[0]),
    budget: (src) => pairs(/\b(tsx|ts):\s*(\d+)/g, /const BUDGET = \{[^}]*\}/.exec(src ?? '')?.[0]),
    ceilings: (src) => pairs(/'([^']+)':\s*(\d+)/g, /LEGACY_CEILINGS[^{]*\{([\s\S]*?)\n\};/.exec(src ?? '')?.[1]),
    disableCeiling: (src) => num(/DISABLE_WITHOUT_REASON_CEILING\s*=\s*(\d+)/, src),
    storeKeys: (json) => {
        try {
            return JSON.parse(json ?? '[]');
        } catch {
            return [];
        }
    },
};

/* ----------------------------- comparisons ----------------------------- */

const up = (label, a, b) => (a !== undefined && (b === undefined || b > a) ? [`${label}: ${a} → ${b ?? 'removed'}`] : []);
const down = (label, a, b) => (a !== undefined && (b === undefined || b < a) ? [`${label}: ${a} → ${b ?? 'removed'}`] : []);

/**
 * Per guarded file: what got looser between `before` and `after`. kind 'ratchet' needs the `ratchet-change` PR
 * label, kind 'api' (public store key removed or renamed) needs `api-change`.
 */
export const GUARDED = {
    'package.json': (before, after) =>
        up('lint --max-warnings', read.maxWarnings(before), read.maxWarnings(after)).map((m) => ({ kind: 'ratchet', message: m })),
    'vitest.config.ts': (before, after) => {
        const a = read.coverage(before);
        const b = read.coverage(after);
        return Object.keys(a).flatMap((k) => down(`coverage ${k} threshold`, a[k], b[k])).map((m) => ({ kind: 'ratchet', message: m }));
    },
    'src/__tests__/fileBudget.test.ts': (before, after) => {
        const ba = read.budget(before);
        const bb = read.budget(after);
        const ca = read.ceilings(before);
        const cb = read.ceilings(after);
        return [
            ...Object.keys(ba).flatMap((k) => up(`file budget .${k}`, ba[k], bb[k])),
            ...Object.keys(cb).flatMap((f) => (f in ca ? up(`size ceiling ${f}`, ca[f], cb[f]) : [`new over-budget file ${f}: ${cb[f]}`])),
        ].map((m) => ({ kind: 'ratchet', message: m }));
    },
    'src/__tests__/guardrails.test.ts': (before, after) =>
        up('eslint-disable without reason ceiling', read.disableCeiling(before), read.disableCeiling(after)).map((m) => ({
            kind: 'ratchet',
            message: m,
        })),
    'src/__tests__/storeApi.baseline.json': (before, after) => {
        const kept = new Set(read.storeKeys(after));
        return read
            .storeKeys(before)
            .filter((key) => !kept.has(key))
            .map((key) => ({ kind: 'api', message: `public store key removed or renamed: ${key}` }));
    },
};

/** Apply an Edit / MultiEdit / Write tool call to a file's text (what the file will be). */
export function applyEdit(before, input) {
    if (typeof input.content === 'string') return input.content;
    const edits = input.edits ?? [input];
    return edits.reduce((text, e) => {
        if (typeof e.old_string !== 'string' || typeof e.new_string !== 'string') return text;
        return e.replace_all ? text.split(e.old_string).join(e.new_string) : text.replace(e.old_string, () => e.new_string);
    }, before ?? '');
}
