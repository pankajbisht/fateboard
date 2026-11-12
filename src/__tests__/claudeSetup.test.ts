/**
 * The Claude Code setup in `.claude/` (docs/AGENT_WORKFLOW.md) is code: the guard hook blocks what CLAUDE.md
 * "Never do" forbids, the settings point at hooks that exist, rules are scoped to paths that exist, and every
 * skill / agent has the frontmatter Claude needs to find it. A broken settings file silently disables every hook.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CLAUDE = path.join(ROOT, '.claude');

const guard = (tool: string, toolInput: Record<string, unknown>) =>
    spawnSync('node', [path.join(CLAUDE, 'hooks/guard.mjs')], {
        input: JSON.stringify({ tool_name: tool, tool_input: toolInput }),
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    });
const edit = (file: string, text = 'x') =>
    guard('Edit', { file_path: path.join(ROOT, file), new_string: text });
const bash = (command: string) => guard('Bash', { command });

describe('guard hook (PreToolUse)', () => {
    it.each([
        ['.env'],
        ['.env.local'],
        ['.env.production'],
        ['node_modules/react/index.js'],
        ['dist/index.html'],
        ['coverage/index.html'],
        ['package-lock.json'],
    ])('blocks editing %s', (file) => {
        const r = edit(file);
        expect(r.status).toBe(2);
        expect(r.stderr).toMatch(/fateboard guard/);
    });

    it.each([['.env.example'], ['src/App.tsx'], ['docs/BUGS.md'], ['package.json']])(
        'allows editing %s',
        (file) => expect(edit(file).status).toBe(0),
    );

    it('keeps package.json versions exact', () => {
        expect(edit('package.json', '"react": "^19.2.0"').status).toBe(2);
        expect(edit('package.json', '"react": "~19.2.0"').status).toBe(2);
        expect(edit('package.json', '"react": "19.2.0"').status).toBe(0);
    });

    it('blocks credentials in any file', () => {
        const key = ['AKIA', 'ABCDEFGHIJKLMNOP'].join(''); // split so this file never holds one
        expect(edit('src/config.ts', `const k = '${key}';`).status).toBe(2);
        expect(edit('src/config.ts', `-----BEGIN ${'PRIVATE'} KEY-----`).status).toBe(2);
    });

    it.each([
        ['git commit --no-verify -m wip'],
        ['git commit -n -m wip'],
        ['git push --force origin main'],
        ['git push -f'],
        ['npm publish'],
        ['cat .env'],
        ['cp .env.example .env.local'],
        ['rm -rf .'],
        ['rm -rf ~'],
        ['rm -rf /'],
    ])('blocks `%s`', (command) => expect(bash(command).status).toBe(2));

    it.each([
        ['npm run test:run'],
        ['git push --force-with-lease origin feature'],
        ['git commit -m "fix: guard"'],
        ['cat .env.example'],
        ['rm -rf dist/assets'],
        ['npx vitest run src/__tests__'],
        // text that only mentions the forbidden flags is data, not a command
        ["cat > docs/x.md <<'EOF'\nNever use --no-verify, npm publish or git push --force.\nEOF"],
        ['echo "git commit --no-verify is blocked"'],
    ])('allows `%s`', (command) => expect(bash(command).status).toBe(0));

    it('still blocks a forbidden command chained after a heredoc', () => {
        expect(bash("cat > a.txt <<'EOF'\nhi\nEOF\ngit commit --no-verify -m x").status).toBe(2);
        expect(bash('npm run lint && git push -f').status).toBe(2);
    });
});

describe('guard hook: guardrails ask the owner', () => {
    const decision = (tool: string, toolInput: Record<string, unknown>) => {
        const r = guard(tool, toolInput);
        if (r.status === 2) return 'block';
        return /"permissionDecision":"ask"/.test(r.stdout) ? 'ask' : 'allow';
    };
    const change = (file: string, old_string: string, new_string: string) =>
        decision('Edit', { file_path: path.join(ROOT, file), old_string, new_string });
    const write = (content: string) =>
        decision('Write', { file_path: path.join(ROOT, 'src/lib/x.ts'), content });

    it('loosening a ratchet asks; tightening it does not', () => {
        expect(change('package.json', '--max-warnings 249', '--max-warnings 260')).toBe('ask');
        expect(change('package.json', '--max-warnings 249', '--max-warnings 240')).toBe('allow');
        expect(change('vitest.config.ts', 'statements: 52', 'statements: 40')).toBe('ask');
        expect(
            change(
                'src/__tests__/fileBudget.test.ts',
                "createCanvasSlice.ts': 1262",
                "createCanvasSlice.ts': 1300",
            ),
        ).toBe('ask');
    });

    it('removing a public store key asks', () => {
        expect(change('src/__tests__/storeApi.baseline.json', '    "setZoom",\n', '')).toBe('ask');
    });

    it('hiding a failure asks; doing it with a reason does not', () => {
        expect(change('src/__tests__/smoke.test.tsx', 'describe(', 'describe.skip(')).toBe('ask');
        expect(write('// @ts-ignore\nexport const a = 1;')).toBe('ask');
        expect(write('// eslint-disable-next-line no-console\nexport const a = 1;')).toBe('ask');
        expect(write('// @ts-expect-error fabric types miss this prop\nexport const a = 1;')).toBe(
            'allow',
        );
        expect(
            write('// eslint-disable-next-line no-console -- dev-only trace\nexport const a = 1;'),
        ).toBe('allow');
    });

    it('shell edits of guarded config and deleting tests ask', () => {
        expect(decision('Bash', { command: 'sed -i "" s/249/300/ package.json' })).toBe('ask');
        expect(decision('Bash', { command: 'echo x > vitest.config.ts' })).toBe('ask');
        expect(decision('Bash', { command: 'rm src/__tests__/smoke.test.tsx' })).toBe('ask');
        expect(decision('Bash', { command: 'git diff package.json vitest.config.ts' })).toBe(
            'allow',
        );
        expect(decision('Bash', { command: 'rm -rf dist' })).toBe('allow');
    });
});

describe('settings, rules, skills and agents', () => {
    const settings = JSON.parse(readFileSync(path.join(CLAUDE, 'settings.json'), 'utf8'));

    it('every hook command runs a script that exists', () => {
        const commands: string[] = Object.values(
            settings.hooks as Record<string, { hooks: { command: string }[] }[]>,
        )
            .flat()
            .flatMap((entry) => entry.hooks.map((h) => h.command));
        expect(commands.length).toBeGreaterThanOrEqual(3);
        for (const command of commands) {
            const script = /\$CLAUDE_PROJECT_DIR\/([^"]+)/.exec(command)?.[1];
            expect(script, command).toBeDefined();
            expect(existsSync(path.join(ROOT, script!)), script).toBe(true);
        }
    });

    it('denies reading and editing the real .env', () => {
        expect(settings.permissions.deny).toEqual(
            expect.arrayContaining(['Read(./.env)', 'Edit(./.env)']),
        );
    });

    const frontmatter = (file: string) =>
        /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'))?.[1] ?? '';

    it('every rule is scoped to paths that exist', () => {
        const dir = path.join(CLAUDE, 'rules');
        for (const name of readdirSync(dir)) {
            const globs = [...frontmatter(path.join(dir, name)).matchAll(/^\s+- '([^']+)'$/gm)].map(
                (m) => m[1]!,
            );
            expect(globs.length, name).toBeGreaterThan(0);
            for (const glob of globs) {
                const base = glob.split('*')[0]!.replace(/\/$/, '');
                if (base) expect(existsSync(path.join(ROOT, base)), `${name}: ${glob}`).toBe(true);
            }
        }
    });

    it.each([
        ...readdirSync(path.join(CLAUDE, 'skills')).map((s) => `skills/${s}/SKILL.md`),
        ...readdirSync(path.join(CLAUDE, 'agents')).map((a) => `agents/${a}`),
    ])('%s has a name and a description', (file) => {
        const fm = frontmatter(path.join(CLAUDE, file));
        const name = /^name: (.+)$/m.exec(fm)?.[1];
        // skills/<name>/SKILL.md or agents/<name>.md
        const expected = file.startsWith('skills/')
            ? file.split('/')[1]
            : path.basename(file, '.md');
        expect(name).toBe(expected);
        expect(/^description: .{40,}$/m.test(fm)).toBe(true);
    });
});
