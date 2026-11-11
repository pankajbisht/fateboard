import { describe, expect, it, vi } from 'vitest';
import { createUndoRedoSlice } from '../createUndoRedoSlice';
import { createHarness, tick } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';

function setup(objects: Record<string, unknown>[] = []) {
    const canvas = createFakeCanvas(objects);
    const clearToolbar = vi.fn();
    const persist = vi.fn();
    const h = createHarness([createUndoRedoSlice as never], { canvas, clearToolbar, persist });
    return { canvas, h, clearToolbar, persist };
}

describe('createUndoRedoSlice', () => {
    it('initHistory stores one base snapshot and nothing to undo', () => {
        const { h } = setup();
        h.get().initHistory();
        expect(h.get().undoStack).toHaveLength(1);
        expect(h.get().canUndo).toBe(false);
        expect(h.get().canRedo).toBe(false);
    });

    it('saveState(true) records a change; identical state is not recorded twice', () => {
        const { canvas, h } = setup();
        h.get().initHistory();
        canvas.add({ type: 'rect', left: 0 });
        h.get().saveState(true);
        expect(h.get().undoStack).toHaveLength(2);
        h.get().saveState(true);
        expect(h.get().undoStack).toHaveLength(2);
        expect(h.get().canUndo).toBe(true);
    });

    it('saveState() is debounced into one entry', async () => {
        const { canvas, h } = setup();
        h.get().initHistory();
        canvas.add({ type: 'rect', left: 0 });
        h.get().saveState();
        canvas.add({ type: 'rect', left: 10 });
        h.get().saveState();
        expect(h.get().undoStack).toHaveLength(1);
        await tick(200);
        expect(h.get().undoStack).toHaveLength(2);
    });

    it('undo restores the previous snapshot; redo re-applies it', async () => {
        const { canvas, h, clearToolbar, persist } = setup();
        h.get().initHistory();
        canvas.add({ type: 'rect', left: 0 });
        h.get().saveState(true);

        await h.get().undo();
        expect(canvas.getObjects()).toHaveLength(0);
        expect(h.get().canRedo).toBe(true);
        expect(clearToolbar).toHaveBeenCalled();
        expect(persist).toHaveBeenCalled();

        await h.get().redo();
        expect(canvas.getObjects()).toHaveLength(1);
        expect(h.get().canRedo).toBe(false);
    });

    it('undo flushes a pending (debounced) change first, so it can be undone', async () => {
        const { canvas, h } = setup();
        h.get().initHistory();
        canvas.add({ type: 'rect', left: 0 });
        h.get().saveState(); // still pending
        await h.get().undo();
        expect(canvas.getObjects()).toHaveLength(0);
    });

    it('a new change clears the redo stack', async () => {
        const { canvas, h } = setup();
        h.get().initHistory();
        canvas.add({ type: 'rect', left: 0 });
        h.get().saveState(true);
        await h.get().undo();
        canvas.add({ type: 'circle' });
        h.get().saveState(true);
        expect(h.get().redoStack).toHaveLength(0);
        expect(h.get().canRedo).toBe(false);
    });

    it('does not record while paused or restoring', () => {
        const { canvas, h } = setup();
        h.get().initHistory();
        h.get().pauseHistory();
        canvas.add({ type: 'rect' });
        h.get().saveState(true);
        expect(h.get().undoStack).toHaveLength(1);
        h.get().resumeHistory();
        h.get().saveState(true);
        expect(h.get().undoStack).toHaveLength(2);
    });

    it('keeps at most MAX_HISTORY undo steps', () => {
        const { canvas, h } = setup();
        h.get().initHistory();
        for (let i = 0; i < h.get().MAX_HISTORY + 10; i++) {
            canvas.add({ type: 'rect', left: i });
            h.get().saveState(true);
        }
        expect(h.get().undoStack).toHaveLength(h.get().MAX_HISTORY + 1);
    });

    it('registerHistoryEvents records add/remove/modify and ignores helper objects', async () => {
        const { canvas, h } = setup();
        h.get().initHistory();
        h.get().registerHistoryEvents(canvas);
        canvas.add({ type: 'circle', excludeFromExport: true });
        await tick(200);
        expect(h.get().undoStack).toHaveLength(1);
        canvas.add({ type: 'rect' });
        await tick(200);
        expect(h.get().undoStack).toHaveLength(2);
        h.get().unregisterHistoryEvents(canvas);
        expect(canvas.listenerCount('object:added')).toBe(0);
    });
    it('history holds one copy of an embedded photo, not one per step (BUG-155)', async () => {
        const src = `data:image/png;base64,${'A'.repeat(200_000)}`;
        const { canvas, h } = setup([{ type: 'image', id: 'photo', src }]);
        h.get().initHistory();
        for (let i = 0; i < 12; i++) {
            canvas.add({ type: 'rect', id: `r${i}` });
            h.get().saveState(true);
        }
        const chars = h.get().undoStack.reduce((n: number, s: string) => n + s.length, 0);
        expect(h.get().undoStack).toHaveLength(13);
        expect(chars).toBeLessThan(src.length);

        // the photo comes back whole
        await h.get().undo();
        const restored = canvas.getObjects().find((o: { id: string }) => o.id === 'photo');
        expect(restored.src).toBe(src);
        expect(canvas.getObjects()).toHaveLength(12);
    });
    it('an undo that cannot load its snapshot changes nothing and does not throw (BUG-154)', async () => {
        const { canvas, h } = setup();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        h.get().initHistory();
        canvas.add({ type: 'rect', id: 'r1' });
        h.get().saveState(true);
        const stack = h.get().undoStack;
        canvas.loadFromJSON = async () => {
            throw new Error('cannot load');
        };

        await expect(h.get().undo()).resolves.toBeUndefined();

        expect(h.get().undoStack).toBe(stack);
        expect(h.get().canRedo).toBe(false);
        expect(h.get()._isRestoring).toBe(false);
        expect(canvas.getObjects()).toHaveLength(1);
        vi.restoreAllMocks();
    });
});
