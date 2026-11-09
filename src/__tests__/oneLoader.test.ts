/**
 * BUG-014 / BUG-101 / BUG-016 + CLAUDE.md never-do: only the canvas, pages and undo slices load a
 * document into the canvas (persist lock, history, autosave), and never with the Fabric 5 callback form
 * (in Fabric 6+ the 2nd argument is a per-object reviver). Two loaders on one canvas raced (BUG-016).
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/__tests__/**', '!/src/test/**'],
    { query: '?raw', import: 'default', eager: true },
);
const LOADERS = new Set([
    '/src/store/slices/createCanvasSlice.ts',
    '/src/store/slices/createPagesSlice.ts',
    '/src/store/slices/createUndoRedoSlice.ts',
]);
const code = (file: string) =>
    SRC[file]
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n');

describe('one document loader', () => {
    it('canvas.loadFromJSON is called only by the canvas, pages and undo slices', () => {
        const offenders = Object.keys(SRC)
            .filter((f) => !LOADERS.has(f))
            .filter((f) => /\.loadFromJSON\(/.test(code(f)));
        expect(offenders).toEqual([]);
    });

    it('the importJSON action is used only by the canvas slice and the file importer', () => {
        const allowed = new Set([
            '/src/store/slices/createCanvasSlice.ts',
            '/src/feature/import/importFabricJSON.ts',
        ]);
        const offenders = Object.keys(SRC)
            .filter((f) => !allowed.has(f))
            .filter((f) => /\.importJSON\(/.test(code(f)));
        expect(offenders).toEqual([]);
    });

    it('never uses the Fabric 5 callback form', () => {
        const offenders = Object.keys(SRC).filter((f) =>
            /\.loadFromJSON\([^()]*(\([^()]*\))?[^()]*,\s*(\(|function|[a-zA-Z_]+\s*=>)/.test(
                code(f),
            ),
        );
        expect(offenders).toEqual([]);
    });
});
