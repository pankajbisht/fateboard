// @vitest-environment node
/**
 * fate-reviewer (2026-11-18), P2: the studio's code loads on demand; when that fails (offline, or old chunks
 * gone after a deploy) the actions report it with a toast instead of throwing to React.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- the harness is untyped */
import { describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createCharacterSlice, type CharacterSlice } from '../createCharacterSlice';

vi.mock('@/character/data/recipes', () => {
    throw new Error('Failed to fetch dynamically imported module');
});
vi.mock('@/character/studio/surprise', () => {
    throw new Error('Failed to fetch dynamically imported module');
});

describe('studio code that cannot load', () => {
    it('open and Surprise me show a message and do not throw', async () => {
        const showToast = vi.fn();
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const h = createHarness<CharacterSlice & Record<string, any>>(
            [createCharacterSlice as any],
            {
                showToast,
            },
        );
        await expect(h.get().openCharacterStudio()).resolves.toBeUndefined();
        expect(h.get().characterStudioOpen).toBe(false);
        await expect(h.get().surpriseStudioCharacter()).resolves.toBeUndefined();
        expect(showToast).toHaveBeenCalledTimes(2);
        expect(showToast.mock.calls[0][0].message).toMatch(/could not load/);
        error.mockRestore();
    });
});
