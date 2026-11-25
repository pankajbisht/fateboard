/**
 * Guardrails (docs/AGENT_WORKFLOW.md "Guardrails"): the suite cannot be made green by hiding failures.
 * No focused or skipped tests, no @ts-ignore / @ts-nocheck, @ts-expect-error needs a reason, and eslint-disable
 * comments without a "-- reason" may only go down (ceiling = today's count; lower it when you remove some).
 * The ratchets themselves (lint limit, coverage, size ceilings, this ceiling) are compared with the base branch in
 * CI (scripts/guardrails/check-ratchets.mjs) and guarded for Claude by `.claude/hooks/guard.mjs`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    CODE_FILE,
    countMarkers,
    GUARDED,
    INTEGRITY_EXEMPT,
} from '../../scripts/guardrails/ratchets.mjs';

/** Lower this when you add a reason to (or remove) an eslint-disable. Raising it needs the owner (CI label). */
const DISABLE_WITHOUT_REASON_CEILING = 96;

const ROOT = process.cwd();
const files = ['src', 'e2e', 'scripts']
    .flatMap((dir) =>
        (readdirSync(path.join(ROOT, dir), { recursive: true }) as string[]).map((f) =>
            `${dir}/${f}`.split(path.sep).join('/'),
        ),
    )
    .filter((f) => CODE_FILE.test(f) && !INTEGRITY_EXEMPT.test(f));

const where = (marker: string) =>
    files.flatMap((file) => {
        const n = countMarkers(readFileSync(path.join(ROOT, file), 'utf8'))[marker]!;
        return n ? [`${file} (${n})`] : [];
    });

describe('guardrails: the suite cannot hide failures', () => {
    it('scans the code', () => expect(files.length).toBeGreaterThan(300));

    it.each([
        'focused test (.only)',
        'skipped test (.skip / xit)',
        '@ts-ignore / @ts-nocheck',
        '@ts-expect-error without a reason',
    ])('no %s', (marker) => expect(where(marker)).toEqual([]));

    it('eslint-disable without a "-- reason" does not grow', () => {
        const total = files.reduce(
            (sum, f) =>
                sum +
                countMarkers(readFileSync(path.join(ROOT, f), 'utf8'))[
                    'eslint-disable without a "-- reason"'
                ]!,
            0,
        );
        expect(total, 'add "-- why" to new eslint-disable comments').toBeLessThanOrEqual(
            DISABLE_WITHOUT_REASON_CEILING,
        );
    });
});

describe('guardrails: ratchet checks', () => {
    const v = (file: string, before: string, after: string) =>
        GUARDED[file as keyof typeof GUARDED]!(before, after).map(
            (f: { message: string }) => f.message,
        );

    it('lint warning limit may go down, not up', () => {
        expect(v('package.json', '--max-warnings 249', '--max-warnings 240')).toEqual([]);
        expect(v('package.json', '--max-warnings 249', '--max-warnings 250')).toHaveLength(1);
    });

    it('coverage thresholds may go up, not down or away', () => {
        const at = (s: number) =>
            `thresholds: { statements: ${s}, branches: 45, functions: 54, lines: 54 }`;
        expect(v('vitest.config.ts', at(52), at(53))).toEqual([]);
        expect(v('vitest.config.ts', at(52), at(51))).toHaveLength(1);
        expect(v('vitest.config.ts', at(52), 'coverage: {}')).toHaveLength(4);
    });

    it('size ceilings may shrink, not grow, and no new file joins the list', () => {
        const src = (rows: string) =>
            `const BUDGET = { tsx: 300, ts: 400 };\nconst LEGACY_CEILINGS: Record<string, number> = {\n${rows}\n};`;
        const a = src(`    '/src/a.ts': 500,`);
        expect(v('src/__tests__/fileBudget.test.ts', a, src(`    '/src/a.ts': 480,`))).toEqual([]);
        expect(v('src/__tests__/fileBudget.test.ts', a, src(`    '/src/a.ts': 510,`))).toHaveLength(
            1,
        );
        expect(
            v(
                'src/__tests__/fileBudget.test.ts',
                a,
                src(`    '/src/a.ts': 500,\n    '/src/b.ts': 450,`),
            ),
        ).toHaveLength(1);
        expect(
            v('src/__tests__/fileBudget.test.ts', a, a.replace('ts: 400', 'ts: 600')),
        ).toHaveLength(1);
    });

    it('the real ratchet files parse (a format change must not blind the checks)', () => {
        const read = (f: string) => readFileSync(path.join(ROOT, f), 'utf8');
        for (const file of Object.keys(GUARDED)) {
            // loosening every number in the real file must be detected
            const text = read(file);
            const looser = file.endsWith('.json')
                ? '[]'
                : text.replace(
                      /(--max-warnings\s+|CEILING\s*=\s*|:\s*)(\d+)/g,
                      (_, p: string, n: string) =>
                          file === 'vitest.config.ts'
                              ? `${p}${Number(n) - 1}`
                              : `${p}${Number(n) + 1}`,
                  );
            expect(v(file, text, looser).length, file).toBeGreaterThan(0);
        }
    });
});
