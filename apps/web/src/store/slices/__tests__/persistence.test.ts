import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectStorage, type ProjectDoc } from '@/lib/storage';
import { PERSIST_DELAY_MS, PERSIST_MAX_WAIT_MS, createPersistence } from '../canvas/persistence';

// P2 (docs/PERFORMANCE_AUDIT.md): 1 s of quiet before a save, never more than 5 s after the first change.
describe('autosave timing (P2)', () => {
    let save: ReturnType<typeof vi.spyOn>;
    const doc = { pages: [] } as unknown as ProjectDoc;
    const peers = { canvas: {}, captureProject: () => doc, saveBoard: () => undefined };

    beforeEach(() => {
        vi.useFakeTimers();
        save = vi.spyOn(projectStorage, 'save').mockResolvedValue(undefined);
    });
    afterEach(() => {
        vi.useRealTimers();
        save.mockRestore();
    });

    it('a burst of edits is one save, after the quiet time', async () => {
        const p = createPersistence(() => peers);
        for (let i = 0; i < 5; i++) {
            p.schedule();
            await vi.advanceTimersByTimeAsync(100);
        }
        expect(save).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(PERSIST_DELAY_MS);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('edits that never pause are still saved within the max wait', async () => {
        const p = createPersistence(() => peers);
        let savedAt = -1;
        save.mockImplementation(async () => {
            if (savedAt < 0) savedAt = Date.now();
        });
        const t0 = Date.now();
        for (let i = 0; i < 30; i++) {
            p.schedule();
            await vi.advanceTimersByTimeAsync(250); // shorter than any quiet time
        }
        expect(savedAt).toBeGreaterThan(0);
        expect(savedAt - t0).toBeLessThanOrEqual(PERSIST_MAX_WAIT_MS);
    });

    it('nothing is saved while locked, and the request is remembered', async () => {
        const p = createPersistence(() => peers);
        p.state.lock++;
        p.schedule();
        await vi.advanceTimersByTimeAsync(PERSIST_MAX_WAIT_MS);
        expect(save).not.toHaveBeenCalled();
        expect(p.state.dropped).toBe(true);
    });

    it('flush saves a pending change at once', async () => {
        const p = createPersistence(() => peers);
        p.schedule();
        p.flush();
        expect(save).toHaveBeenCalledTimes(1);
    });
});
