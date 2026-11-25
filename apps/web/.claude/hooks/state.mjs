/**
 * Per-session list of source files Claude edited, shared by post-edit.mjs (writes) and stop-check.mjs (reads).
 * Kept in the OS temp dir, not in the repo, so it never shows up in git.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = path.join(os.tmpdir(), 'fateboard-claude-hooks');
const fileFor = (sessionId) => path.join(DIR, `${String(sessionId || 'default').replace(/[^\w-]/g, '_')}.json`);

export function readTouched(sessionId) {
    try {
        return JSON.parse(readFileSync(fileFor(sessionId), 'utf8'));
    } catch {
        return [];
    }
}

export function recordTouched(sessionId, file) {
    const files = new Set(readTouched(sessionId));
    files.add(file);
    mkdirSync(DIR, { recursive: true });
    writeFileSync(fileFor(sessionId), JSON.stringify([...files]));
}

export function clearTouched(sessionId) {
    rmSync(fileFor(sessionId), { force: true });
}
