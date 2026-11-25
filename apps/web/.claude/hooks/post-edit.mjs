#!/usr/bin/env node
/**
 * PostToolUse (Edit / Write): format the file with Prettier and lint it with ESLint, about 2 s per edit.
 * Lint errors (not warnings) exit 2 so Claude fixes them right away. Each touched source file is recorded for the
 * Stop hook (stop-check.mjs), which runs type-check and the related tests once at the end of the turn.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { recordTouched } from './state.mjs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const abs = path.resolve(root, input.tool_input?.file_path ?? '');
const file = path.relative(root, abs).split(path.sep).join('/');

if (!/^(src|e2e)\//.test(file) || !existsSync(abs)) process.exit(0);

const bin = (name) => path.join(root, 'node_modules', '.bin', name);
const run = (name, args) =>
    execFileSync(bin(name), args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

if (/\.(tsx?|jsx?|mjs|css|json|md)$/.test(file)) {
    try {
        run('prettier', ['--write', '--log-level', 'warn', file]);
    } catch (error) {
        process.stderr.write(`[post-edit] Prettier could not format ${file}:\n${error.stderr || error.message}\n`);
        process.exit(2);
    }
}

if (/\.(tsx?|jsx?)$/.test(file)) {
    recordTouched(input.session_id, file);
    try {
        run('eslint', ['--no-warn-ignored', file]); // warnings (the any ratchet) never fail an edit
    } catch (error) {
        process.stderr.write(`[post-edit] ESLint errors in ${file} (fix them now):\n${error.stdout || error.message}\n`);
        process.exit(2);
    }
}

process.exit(0);
