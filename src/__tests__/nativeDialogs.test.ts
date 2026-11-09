/**
 * The app uses its own themed dialogs (store `confirmDialog` / `alertDialog`, rendered by
 * DialogHost). Browser-native confirm/alert/prompt must not come back.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/store';
import { importFile } from '@/feature/import';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

// every shipped source file as text (tests and test helpers excluded)
const SOURCES = import.meta.glob<string>(
    ['/src/**/*.{ts,tsx}', '!/src/**/__tests__/**', '!/src/test/**', '!/src/**/*.test.{ts,tsx}'],
    { query: '?raw', import: 'default', eager: true },
);

const original = useStore.getState();

afterEach(() => {
    while (useStore.getState().dialogQueue.length) useStore.getState().resolveDialog(false);
    useStore.setState({ canvas: original.canvas } as any);
    vi.restoreAllMocks();
});

describe('no browser-native dialogs', () => {
    it('no source file calls confirm(), alert() or prompt()', () => {
        const offenders = Object.entries(SOURCES).flatMap(([file, text]) =>
            text
                .split('\n')
                .map((line, i) => ({ line: line.trim(), at: `${file}:${i + 1}` }))
                .filter(({ line }) => !line.startsWith('//') && !line.startsWith('*'))
                .filter(({ line }) => /(^|[^\w.])(window\.)?(confirm|alert|prompt)\(/.test(line))
                .map(({ at }) => at),
        );
        expect(Object.keys(SOURCES).length).toBeGreaterThan(100); // the glob really found the app
        expect(offenders).toEqual([]);
    });

    it('importing an unsupported file shows the themed alert', async () => {
        const native = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        await importFile(createFakeCanvas() as any, new File(['x'], 'notes.txt'));

        expect(native).not.toHaveBeenCalled();
        expect(useStore.getState().dialogQueue[0]).toMatchObject({
            kind: 'alert',
            title: 'Unsupported file type',
        });
    });

    it('boolean operation without a multi-selection shows the themed alert', async () => {
        const native = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        const canvas = { ...createFakeCanvas(), getActiveObject: () => null };
        useStore.setState({ canvas } as any);

        await useStore.getState().booleanOperation('union');

        expect(native).not.toHaveBeenCalled();
        expect(useStore.getState().dialogQueue[0]).toMatchObject({ kind: 'alert' });
    });

    it('clip without a multi-selection shows the themed alert', async () => {
        const native = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        const canvas = { ...createFakeCanvas(), getActiveObject: () => null };
        useStore.setState({ canvas } as any);

        await useStore.getState().clipSelectedObject();

        expect(native).not.toHaveBeenCalled();
        expect(useStore.getState().dialogQueue[0]).toMatchObject({ kind: 'alert' });
    });
});
