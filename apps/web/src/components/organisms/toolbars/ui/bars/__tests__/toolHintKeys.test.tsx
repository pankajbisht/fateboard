/**
 * Tool tips name modifier keys the way the platform does: ⌥ / ⇧ on a Mac, Alt / Shift elsewhere (`ALT` / `SHIFT`
 * in drawToolParts). Rendered for Copy spray; every bar is checked by reading its source.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function hintFor(mac: boolean) {
    vi.resetModules();
    vi.doMock('@/lib/utils/isMac', async (importOriginal) => ({
        ...(await importOriginal<object>()),
        isMac: mac,
        shortcut: (m: string, w: string) => (mac ? m : w),
    }));
    const { useStore } = await import('@store');
    const { DEFAULT_COPY_SPRAY_STYLE } = await import('@/lib/canvas/copySpray');
    const { DEFAULT_SPRAY_STYLE } = await import('@/store/sprayStyle');
    const { CopySprayOptions } = await import('../CopySprayOptions');
    useStore.setState({
        activeTool: 'copySpray',
        copySprayStyle: DEFAULT_COPY_SPRAY_STYLE,
        copySpraySource: null,
        sprayStyle: { ...DEFAULT_SPRAY_STYLE, mode: 'copy' },
    } as never);
    render(<CopySprayOptions />);
    return screen.getByLabelText('Tips').parentElement!.textContent ?? '';
}

describe('Copy spray hint keys', () => {
    afterEach(() => {
        vi.doUnmock('@/lib/utils/isMac');
        vi.resetModules();
    });

    it('Mac: ⌥ + click', async () => {
        const text = await hintFor(true);
        expect(text).toContain('⌥ + click picks another');
        expect(text).not.toContain('Alt');
    });

    it('Windows / Linux: Alt + click', async () => {
        expect(await hintFor(false)).toContain('Alt + click picks another');
    });
});

describe('every tool bar', () => {
    it('writes modifier keys through ALT / SHIFT, never as fixed words', () => {
        const dir = resolve(__dirname, '..');
        const fixed = readdirSync(dir)
            .filter((f) => f.endsWith('.tsx'))
            .filter((f) =>
                /<Key>\s*(Alt|Shift|Ctrl|Cmd|Option)\b/.test(readFileSync(resolve(dir, f), 'utf8')),
            );
        expect(fixed).toEqual([]);
    });
});
