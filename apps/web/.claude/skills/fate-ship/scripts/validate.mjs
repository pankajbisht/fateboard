#!/usr/bin/env node
/**
 * Git conventions for skill `fate-ship` (docs/CONVENTIONS.md "Git: branches and commits"). No dependencies.
 *
 *   node .claude/skills/fate-ship/scripts/validate.mjs branch <name>
 *   node .claude/skills/fate-ship/scripts/validate.mjs message <file | ->     (- = stdin)
 *   node .claude/skills/fate-ship/scripts/validate.mjs staged                 (run in the repo, after git add)
 *
 * Exit 0 = OK (warnings may be printed), 1 = a rule is broken (each one printed with ✗), 2 = bad usage.
 * Tested by src/__tests__/gitConventions.test.ts.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Conventional Commits types; branch prefixes use the same words (+ hotfix, release). */
export const TYPES = [
    'feat',
    'fix',
    'perf',
    'refactor',
    'test',
    'docs',
    'build',
    'ci',
    'chore',
    'revert',
    'style',
];
const BRANCH_TYPES = [...TYPES, 'hotfix', 'release'];
const PROTECTED_BRANCHES = ['main', 'master', 'develop', 'gh-pages', 'HEAD'];
const HEADER_MAX = 72;
const BODY_LINE_MAX = 100;
const BRANCH_MAX = 60;
const LARGE_FILE = 2 * 1024 * 1024;

/** First words that are not imperative mood ("fixed", "adds", "updating" → "fix", "add", "update"). */
const NOT_IMPERATIVE =
    /^(added|adds|adding|fixed|fixes|fixing|updated|updates|updating|removed|removes|removing|changed|changes|changing|created|creates|creating|implemented|implements|implementing|improved|improves|improving|refactored|refactors|moved|moves|renamed|renames|deleted|deletes|made|makes|bumped|bumps|merged)$/i;

/** Same credential patterns as .claude/hooks/guard.mjs SECRETS (keep the two lists in sync). */
const SECRETS = [
    /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
    /\bsk-(ant-)?[A-Za-z0-9_-]{32,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/,
];

/** Paths that must never be committed (secrets, installs, generated output). */
const FORBIDDEN_PATHS = [
    [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, 'secrets file (.env*); only .env.example is committed'],
    [/(^|\/)node_modules\//, 'installed dependency'],
    [
        /^(dist|dist-e2e|dist-ssr|coverage|test-results|playwright-report|blob-report)\//,
        'generated output',
    ],
    [/\.(pem|p12|pfx|key)$/, 'private key / certificate'],
    [
        /(^|\/)CLAUDE\.local\.md$|(^|\/)\.claude\/settings\.local\.json$/,
        'personal Claude file (gitignored)',
    ],
];

export function checkBranch(name) {
    const errors = [];
    if (PROTECTED_BRANCHES.includes(name)) {
        return [`"${name}" is a protected branch: create a work branch instead`];
    }
    const m = /^([a-z]+)\/(.*)$/.exec(name);
    if (!m) return [`must be <type>/<description>, e.g. fix/bug-204-slider-late-input`];
    const [, type, rest] = m;
    if (!BRANCH_TYPES.includes(type))
        errors.push(`type "${type}" must be one of: ${BRANCH_TYPES.join(', ')}`);
    const segment =
        type === 'release' ? /^v?\d+\.\d+\.\d+(-[a-z0-9.]+)?$/ : /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!rest) errors.push('description is missing');
    else if (!segment.test(rest)) {
        errors.push(
            type === 'release'
                ? 'release branches are release/<semver>, e.g. release/1.4.0'
                : 'description: lowercase letters, digits and single dashes only (kebab-case), no trailing dash',
        );
    }
    if (name.length > BRANCH_MAX) errors.push(`${name.length} chars; keep it ≤ ${BRANCH_MAX}`);
    return errors;
}

export function checkMessage(raw) {
    // git strips comment lines from the message file; do the same
    const text = raw
        .split('\n')
        .filter((l) => !l.startsWith('#'))
        .join('\n')
        .replace(/\s+$/, '');
    const lines = text.split('\n');
    const header = lines[0] ?? '';
    const errors = [];

    if (/^(fixup|squash|amend)! /.test(header))
        return ['fixup! / squash! commits are squashed before pushing'];
    if (/^wip\b/i.test(header)) return ['"wip" is not a commit message: say what the change does'];

    const m = /^([a-z]+)(\(([^)]*)\))?(!)?: (.*)$/.exec(header);
    if (!m) {
        return [
            `header must be "<type>(<scope>): <subject>" (types: ${TYPES.join(', ')}); got "${header}"`,
        ];
    }
    const [, type, , scope, , subject] = m;
    if (!TYPES.includes(type)) errors.push(`type "${type}" must be one of: ${TYPES.join(', ')}`);
    if (scope !== undefined && !/^[a-z0-9]+([-/][a-z0-9]+)*$/.test(scope)) {
        errors.push(`scope "${scope}": lowercase kebab-case, e.g. (store), (canvas), (seo), (e2e)`);
    }
    if (header.length > HEADER_MAX)
        errors.push(`header is ${header.length} chars; keep it ≤ ${HEADER_MAX}`);
    if (!subject.trim() || subject !== subject.trimStart())
        errors.push('one space after ":", then the subject');
    if (/^[A-Z]/.test(subject)) errors.push('subject starts lowercase ("add …", not "Add …")');
    if (/[.!?]$/.test(subject)) errors.push('no punctuation at the end of the subject');
    const first = subject.split(/\s+/)[0] ?? '';
    if (NOT_IMPERATIVE.test(first)) {
        errors.push(
            `"${first}": use the imperative mood ("add", not "added" / "adds"); it completes "this commit will …"`,
        );
    }

    if (lines.length > 1 && lines[1] !== '')
        errors.push('leave one blank line between the header and the body');
    lines.slice(2).forEach((line, i) => {
        const isTrailer = /^[\w-]+: |^BREAKING CHANGE: /.test(line);
        if (line.length > BODY_LINE_MAX && !/https?:\/\//.test(line) && !isTrailer) {
            errors.push(`body line ${i + 3} is ${line.length} chars; wrap at ${BODY_LINE_MAX}`);
        }
    });
    return errors;
}

export function checkStaged() {
    const git = (...args) =>
        execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    const errors = [];
    const warnings = [];
    const files = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z')
        .split('\0')
        .filter(Boolean);

    for (const file of files) {
        for (const [re, why] of FORBIDDEN_PATHS) if (re.test(file)) errors.push(`${file}: ${why}`);
        const size = Number(git('cat-file', '-s', `:${file}`).trim());
        if (size > LARGE_FILE) {
            warnings.push(
                `${file}: ${(size / 1024 / 1024).toFixed(1)} MB; is a large binary meant to be in git?`,
            );
        }
    }

    let current = '';
    for (const line of git('diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR').split(
        '\n',
    )) {
        if (line.startsWith('+++ b/')) current = line.slice(6);
        else if (
            line.startsWith('+') &&
            !line.startsWith('+++') &&
            SECRETS.some((re) => re.test(line))
        ) {
            errors.push(`${current}: an added line looks like a credential`);
        }
    }
    if (!files.length) warnings.push('nothing is staged');
    return { errors: [...new Set(errors)], warnings, count: files.length };
}

const report = (errors, warnings = [], okText = 'OK') => {
    for (const w of warnings) console.log(`⚠ ${w}`);
    for (const e of errors) console.log(`✗ ${e}`);
    if (!errors.length) console.log(`✓ ${okText}`);
    process.exit(errors.length ? 1 : 0);
};

const [mode, arg] = process.argv.slice(2);
if (mode === 'branch' && arg) report(checkBranch(arg), [], `branch "${arg}"`);
else if (mode === 'message' && arg) {
    report(checkMessage(readFileSync(arg === '-' ? 0 : arg, 'utf8')), [], 'commit message');
} else if (mode === 'staged') {
    const { errors, warnings, count } = checkStaged();
    report(errors, warnings, `${count} staged file(s)`);
} else {
    console.error('usage: validate.mjs branch <name> | message <file|-> | staged');
    process.exit(2);
}
