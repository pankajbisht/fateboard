/**
 * The landing page stays light (docs/ARCHITECTURE.md "Bundles and assets"): its static imports must
 * not reach the command registry (toolbars, panels) or the Help shortcut list that reads it. Lazy
 * `import()` calls are not followed: they load later, in their own chunk.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
});

const ALIASES: [string, string][] = [
    ['@components/', '/src/components/'],
    ['@lib/', '/src/lib/'],
    ['@hooks/', '/src/hooks/'],
    ['@store', '/src/store'],
    ['@/', '/src/'],
];

const resolve = (from: string, spec: string): string | null => {
    let base: string | null = null;
    if (spec.startsWith('.')) base = new URL(spec, `file://${from}`).pathname;
    for (const [alias, target] of ALIASES) {
        if (!base && spec.startsWith(alias)) base = target + spec.slice(alias.length);
    }
    if (!base) return null; // a package
    for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (SRC[base + ext] !== undefined) return base + ext;
    }
    return null;
};

/** Every file the module pulls in through static, non-type imports. */
function staticGraph(entry: string): Set<string> {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length) {
        const file = queue.pop()!;
        if (seen.has(file)) continue;
        seen.add(file);
        const source = SRC[file] ?? '';
        const specs = [
            ...source.matchAll(
                /^\s*(?:import|export)\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]/gm,
            ),
            ...source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
        ].map((m) => m[1]!);
        for (const spec of specs) {
            const target = resolve(file, spec);
            if (target) queue.push(target);
        }
    }
    return seen;
}

describe('landing page bundle', () => {
    const graph = staticGraph('/src/components/pages/web/WhiteboardMarketingSite.tsx');

    it('finds the files the landing page uses', () => {
        expect(graph.size).toBeGreaterThan(1);
    });

    it.each([
        '/src/components/config/commandConfig.tsx',
        '/src/components/organisms/helpsection/helpShortcuts.ts',
        '/src/components/pages/HelpPage/HelpPage.tsx',
    ])('does not pull in %s', (heavy) => {
        expect([...graph]).not.toContain(heavy);
    });
});
