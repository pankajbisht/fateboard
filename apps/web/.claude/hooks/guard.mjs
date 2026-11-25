#!/usr/bin/env node
/**
 * PreToolUse guard (Edit / Write / Bash): the agent side of the repo guardrails (docs/AGENT_WORKFLOW.md).
 *   block (exit 2, reason to Claude): never acceptable: secrets, .env, generated files, skipping git hooks,
 *     force push, publish, sweeping deletes.
 *   ask (permission prompt to the owner): sometimes legitimate, always a human decision: loosening a ratchet
 *     (lint limit, coverage, size ceilings), removing a public store key, adding a skipped / focused test,
 *     @ts-ignore or a reasonless eslint-disable, editing guarded files from the shell, deleting a test.
 * Fast (no subprocesses). Tested by src/__tests__/claudeSetup.test.ts.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
    addedMarkers,
    applyEdit,
    CODE_FILE,
    GUARDED,
    INTEGRITY_EXEMPT,
} from '../../scripts/guardrails/ratchets.mjs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const tool = input.tool_name ?? '';
const args = input.tool_input ?? {};
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

const block = (reason) => {
    process.stderr.write(`[fateboard guard] ${reason}\n`);
    process.exit(2);
};
const ask = (reason) => {
    process.stdout.write(
        JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'ask',
                permissionDecisionReason: `[fateboard guardrail] ${reason} Approve only if you (the owner) want this.`,
            },
        }),
    );
    process.exit(0);
};

/** Files only tools may write: secrets, installs, build output, the lockfile. */
const PROTECTED = [
    [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, 'never edit .env files (secrets); change .env.example instead'],
    [/^node_modules\//, 'never edit node_modules'],
    [/^(dist|coverage|test-results|playwright-report)\//, 'build / test output is generated, not edited'],
    [/^package-lock\.json$/, 'package-lock.json changes only through npm'],
];

/** Credentials that must never land in a file. */
const SECRETS = [
    /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
    /\bsk-(ant-)?[A-Za-z0-9_-]{32,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/,
];

/** Config that decides what "passing" means: shell edits would bypass the checks above. */
const GUARDED_PATHS =
    /(package\.json|vitest\.config\.ts|playwright\.config\.ts|eslint\.config\.js|tsconfig[\w.]*\.json|fileBudget\.test\.ts|guardrails\.test\.ts|storeApi\.baseline\.json|\.github\/|\.husky\/|\.claude\/(settings\.json|hooks\/)|scripts\/guardrails\/)/;

if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) {
    const abs = path.resolve(root, args.file_path ?? '');
    const file = path.relative(root, abs).split(path.sep).join('/');
    for (const [re, why] of PROTECTED) if (re.test(file)) block(`${file}: ${why}.`);

    const added = [args.content, args.new_string, ...(args.edits ?? []).map((e) => e.new_string)]
        .filter(Boolean)
        .join('\n');
    if (SECRETS.some((re) => re.test(added))) block(`${file}: the new text looks like a credential.`);
    if (file === 'package.json' && /"[^"]+":\s*"[\^~]\d/.test(added)) {
        block('package.json: versions are exact (no ^ or ~), see CLAUDE.md "Commands".');
    }

    // compare the whole file before and after this edit
    const before = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
    const after = applyEdit(before, args);

    const loosened = GUARDED[file]?.(before, after) ?? [];
    if (loosened.length) {
        ask(`${file} loosens a guardrail: ${loosened.map((f) => f.message).join('; ')}. Fix the cause instead.`);
    }
    if (CODE_FILE.test(file) && !INTEGRITY_EXEMPT.test(file)) {
        const markers = addedMarkers(before, after);
        if (markers.length) {
            ask(`${file} adds ${markers.join(', ')}: this hides a failure instead of fixing it.`);
        }
    }
}

if (tool === 'Bash') {
    // Heredoc bodies are data (a doc being written may mention `--no-verify`), not commands: drop them.
    const cmd = String(args.command ?? '').replace(
        /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g,
        '<<heredoc',
    );
    /** One command of a chain (`a && b; c | d`), so a flag only counts on the command it belongs to. */
    const parts = cmd.split(/&&|\|\||[;|\n]/).map((part) => part.trim());
    const runs = (re) => parts.some((part) => re.test(part));

    if (runs(/^git\s+(commit|push|merge|rebase|am|cherry-pick)\b.*\s--no-verify\b/) || runs(/^git\s+commit\b.*\s-n\b/)) {
        block('never skip git hooks (--no-verify / -n): fix what the hook reports instead.');
    }
    if (runs(/^git\s+push\b.*(\s--force(?!-with-lease)\b|\s-f\b)/)) {
        block('no force push. Ask the owner; if agreed, use --force-with-lease.');
    }
    if (runs(/^npm\s+publish\b/)) block('this app is never published to npm.');
    if (/\brm\s+-\w*r\w*\s+(\/|~|\.{1,2}|\*|\$HOME)(\/)?(\s|$)/.test(cmd)) {
        block('refusing a recursive delete of a root, home or whole-project path.');
    }
    const envRefs = cmd.match(/(?<=^|[\s<>'"=(/])\.env(\.[\w-]+)?(?=$|[\s'";|&)>])/g) ?? [];
    if (envRefs.some((ref) => ref !== '.env.example')) {
        block('do not read or write .env from the shell (secrets); use .env.example.');
    }

    // shell edits of guarded config skip the Edit checks: the owner decides
    const writesGuarded = parts.some(
        (part) =>
            ((/^(sed|perl)\b.*\s-[a-zA-Z]*i/.test(part) || /^(tee|mv|cp|truncate)\b/.test(part)) && GUARDED_PATHS.test(part)) ||
            new RegExp(`>>?\\s*['"]?\\S*${GUARDED_PATHS.source}`).test(part),
    );
    if (writesGuarded) ask('this shell command edits config that decides what "passing" means.');
    if (runs(/^(git\s+)?rm\b.*(__tests__\/|\.test\.tsx?\b|\.spec\.ts\b|e2e\/)/)) {
        ask('this deletes tests. A test is removed only with its feature, never to get green.');
    }
}

process.exit(0);
