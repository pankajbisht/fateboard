// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createFightSlice, type FightSlice } from '../createFightSlice';

const { saved, restore } = vi.hoisted(() => ({
    saved: [] as unknown[],
    restore: vi.fn(async (_g: unknown) => true),
}));
vi.mock('@/scene/board', async (real) => ({
    ...(await real<typeof import('@/scene/board')>()),
    restoreFightClipFrames: restore,
}));
vi.mock('@/lib/storage', () => ({
    comboStorage: {
        loadLibrary: async () => [...saved],
        upsert: async (item: { id: string }) => {
            const i = saved.findIndex((x) => (x as { id: string }).id === item.id);
            if (i >= 0) saved[i] = item;
            else saved.push(item);
            return [...saved];
        },
        remove: async (id: string) => {
            const i = saved.findIndex((x) => (x as { id: string }).id === id);
            if (i >= 0) saved.splice(i, 1);
            return [...saved];
        },
    },
}));

const make = (extra: Record<string, unknown> = {}) =>
    createHarness<FightSlice & Record<string, unknown>>([createFightSlice as never], {
        canvas: null,
        showToast: vi.fn(),
        ...extra,
    });

const combo = {
    id: 'my-combo',
    name: 'Jab, cross',
    tags: [],
    stanceA: 'orthodox' as const,
    stanceB: 'orthodox' as const,
    steps: [
        { by: 'a' as const, exchange: 'jab-slip' },
        { by: 'a' as const, exchange: 'cross-hit' },
    ],
};

describe('fight slice (docs/COMBAT_PACK.md)', () => {
    it('starts with no saved combos', () => {
        expect(make().get().fightCombos).toEqual([]);
        expect(make().get().fightComboStatus).toBe('idle');
    });

    it('saves, lists, loads and deletes a combo', async () => {
        const h = make();
        expect(await h.get().saveFightCombo(combo)).toBe(true);
        expect(h.get().fightCombos.map((c) => c.id)).toEqual(['my-combo']);
        const fresh = make();
        await fresh.get().loadFightCombos();
        expect(fresh.get().fightComboStatus).toBe('ready');
        expect(fresh.get().fightCombos[0].steps).toHaveLength(2);
        expect(await fresh.get().deleteFightCombo('my-combo')).toBe(true);
        expect(fresh.get().fightCombos).toEqual([]);
    });

    it('refuses a combo with no known exchange', async () => {
        const h = make();
        expect(
            await h.get().saveFightCombo({ ...combo, steps: [{ by: 'a', exchange: 'nope' }] }),
        ).toBe(false);
    });

    it('does nothing without a canvas or a scene', async () => {
        expect(await make().get().placeFightClip('sparring')).toBe(false);
    });

    // 2026-11-27: clips are saved as a poster + recipe; a loaded one (undo, page switch, reload) is drawn again
    it('draws a loaded clip again and shows the frame for the playhead', async () => {
        const canvas = createFakeCanvas();
        const render = vi.spyOn(canvas, 'requestRenderAll');
        const h = make({ canvas, currentTime: 0 });
        h.get().registerFightClipEvents(canvas as never);
        const poster = { fightClip: { recipe: {}, first: 0, count: 2, start: 0, fps: 24 } };
        canvas.add(poster as never);
        canvas.add({ id: 'plain' } as never);
        await vi.waitFor(() => expect(render).toHaveBeenCalled());
        expect(restore).toHaveBeenCalledTimes(1);
        expect(restore.mock.calls[0][0]).toBe(poster);

        h.get().unregisterFightClipEvents(canvas as never);
        canvas.add({ ...poster } as never);
        await new Promise((r) => setTimeout(r, 0));
        expect(restore).toHaveBeenCalledTimes(1);
    });
});
