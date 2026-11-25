/**
 * Git conventions used by skill `fate-ship` (docs/CONVENTIONS.md "Git: branches and commits"): branch names,
 * Conventional Commit messages, and the staged-files check that runs before every commit. The skill calls
 * `.claude/skills/fate-ship/scripts/validate.mjs`; these tests keep that script honest.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), '.claude/skills/fate-ship/scripts/validate.mjs');

const run = (args: string[], input = '', cwd = process.cwd()) =>
    spawnSync('node', [SCRIPT, ...args], { input, encoding: 'utf8', cwd });
const branch = (name: string) => run(['branch', name]).status;
const message = (text: string) => run(['message', '-'], text);

describe('branch names', () => {
    it.each([
        'feat/gallery-tutorial-pages',
        'fix/bug-204-slider-late-input',
        'refactor/r-03-split-layers-panel',
        'chore/claude-ship-skill',
        'docs/agent-guide',
        'hotfix/bug-210-landing-draw-link',
        'release/1.4.0',
    ])('accepts %s', (name) => expect(branch(name)).toBe(0));

    it.each([
        ['main', 'protected branch'],
        ['feature/newAgentSystem', 'unknown type and camelCase'],
        ['fix/BUG-204-slider', 'uppercase'],
        ['fix/slider_input', 'underscore'],
        ['fix/', 'no description'],
        ['fix/slider--input', 'double dash'],
        ['fix/slider-input-', 'trailing dash'],
        ['slider-input', 'no type'],
        [`feat/${'a'.repeat(60)}`, 'too long'],
    ])('rejects %s (%s)', (name) => expect(branch(name)).toBe(1));
});

describe('commit messages', () => {
    const ok = [
        'fix(slider): ignore late input event after release in Firefox\n\nFirefox fires one more `input` after `pointerup`, which moved\nthe value back. Ignore input events once the drag has ended.\n\nRefs: BUG-204',
        'feat(seo): prerender one HTML page per gallery tutorial',
        'ci: shard E2E across two runners per browser',
        'refactor(store)!: rename pageSize to selectedPreset\n\nBREAKING CHANGE: components must read selectedPreset.',
    ];
    it.each(ok)('accepts %#', (text) => expect(message(text).status).toBe(0));

    it.each([
        ['Fixed slider bug', 'no type'],
        ['fix(slider): Ignore late input', 'capitalised subject'],
        ['fix(slider): ignore late input.', 'trailing period'],
        ['fix(slider): fixed late input', 'past tense'],
        ['fix(slider): adds a guard', 'third person'],
        ['feature(slider): ignore late input', 'unknown type'],
        ['fix(Slider): ignore late input', 'uppercase scope'],
        ['fix(slider):ignore late input', 'no space after colon'],
        [`fix(slider): ${'a'.repeat(70)}`, 'header over 72'],
        ['fix(slider): ignore late input\nbody without blank line', 'no blank line'],
        ['wip', 'wip'],
        ['fixup! fix(slider): ignore late input', 'fixup'],
    ])('rejects %s (%s)', (text) => {
        const r = message(text);
        expect(r.status).toBe(1);
        expect(r.stdout).toMatch(/✗/);
    });

    it('ignores comment lines git adds to the message file', () => {
        expect(message('docs: add agent guide\n# Please enter the commit message').status).toBe(0);
    });
});

describe('staged files', () => {
    const repo = mkdtempSync(path.join(tmpdir(), 'fate-ship-'));
    const git = (...args: string[]) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    git('init', '-q');
    afterAll(() => rmSync(repo, { recursive: true, force: true }));

    const stage = (file: string, text: string) => {
        writeFileSync(path.join(repo, file), text);
        git('add', '-f', file);
    };
    const staged = () => run(['staged'], '', repo);

    it('passes ordinary source changes', () => {
        stage('a.ts', 'export const a = 1;\n');
        expect(staged().status).toBe(0);
    });

    it('blocks a real .env file but not .env.example', () => {
        stage('.env.example', 'VITE_SITE_URL=\n');
        expect(staged().status).toBe(0);
        stage('.env', 'VITE_SITE_URL=https://example.com\n');
        const r = staged();
        expect(r.status).toBe(1);
        expect(r.stdout).toMatch(/\.env/);
        git('rm', '-q', '--cached', '.env');
    });

    it('blocks a credential in an added line', () => {
        stage('b.ts', `const token = 'ghp_${'x'.repeat(36)}';\n`);
        expect(staged().status).toBe(1);
        git('rm', '-q', '--cached', 'b.ts');
    });

    it('only warns about a large file', () => {
        stage('big.bin', 'x'.repeat(2 * 1024 * 1024 + 1));
        const r = staged();
        expect(r.status).toBe(0);
        expect(r.stdout).toMatch(/big\.bin/);
    });
});
