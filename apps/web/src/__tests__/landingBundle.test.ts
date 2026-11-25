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

const staticSpecs = (source: string) =>
    [
        ...source.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]/gm),
        ...source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
    ].map((m) => m[1]!);

/** Every file the module pulls in through static, non-type imports. */
function staticGraph(entry: string): Set<string> {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length) {
        const file = queue.pop()!;
        if (seen.has(file)) continue;
        seen.add(file);
        for (const spec of staticSpecs(SRC[file] ?? '')) {
            const target = resolve(file, spec);
            if (target) queue.push(target);
        }
    }
    return seen;
}

/** npm packages the files import statically (`fabric`, `react`, …). */
const packagesOf = (graph: Set<string>) =>
    new Set(
        [...graph].flatMap((file) =>
            staticSpecs(SRC[file] ?? '').filter(
                (spec) =>
                    resolve(file, spec) === null && !spec.startsWith('.') && !spec.startsWith('@/'),
            ),
        ),
    );

describe('landing page bundle', () => {
    const graph = staticGraph('/src/components/pages/web/WhiteboardMarketingSite.tsx');

    it('finds the files the landing page uses', () => {
        expect(graph.size).toBeGreaterThan(1);
    });

    it.each([
        '/src/components/config/commandConfig.tsx',
        '/src/components/organisms/helpsection/helpShortcuts.ts',
        '/src/components/pages/HelpPage/HelpPage.tsx',
        // the gallery is its own route (/gallery): 18 artworks made the landing slow to load
        '/src/components/pages/web/gallery/GallerySection.tsx',
    ])('does not pull in %s', (heavy) => {
        expect([...graph]).not.toContain(heavy);
    });
});

/*
 * BUG-209: the entry chunk is what EVERY route downloads before its page. It must not reach the store
 * (≈ 100 KB gzip) or Fabric (≈ 90 KB): the store-backed RootLayout is a lazy chunk, and the selection
 * chrome is applied by RootLayout, not by main.tsx. The site pages (landing, gallery, tutorials) use
 * the light SiteLayout and never need either.
 */
describe('startup and site pages stay off the store and Fabric (BUG-209)', () => {
    const HEAVY = ['/src/store/index.ts', '/src/lib/fabricChrome.ts'];

    it.each([
        '/src/main.tsx',
        '/src/components/pages/web/WhiteboardMarketingSite.tsx',
        '/src/components/pages/Gallery/GalleryPage.tsx',
        '/src/components/pages/GalleryTutorial/GalleryTutorialPage.tsx',
    ])('%s', (entry) => {
        const graph = staticGraph(entry);
        expect(graph.size).toBeGreaterThan(1);
        expect([...graph].filter((f) => HEAVY.includes(f))).toEqual([]);
        expect(
            [...packagesOf(graph)].filter((p) => p === 'fabric' || p.startsWith('fabric/')),
        ).toEqual([]);
    });

    it('the entry does not import the store-backed RootLayout statically', () => {
        expect([...staticGraph('/src/main.tsx')]).not.toContain(
            '/src/components/templates/RootLayout.tsx',
        );
    });
});
