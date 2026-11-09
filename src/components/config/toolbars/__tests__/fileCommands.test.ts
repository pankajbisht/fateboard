/**
 * BUG-040 regression: the keyboard commands for Open (Ctrl/⌘+O) and Save (Ctrl/⌘+S) used to call
 * clearBoard(), wiping the canvas and the autosaved copy.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/store';
import { FileBarConfig } from '../ui/FileBarConfig';
import { newBoard } from '../fileActions';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

const original = useStore.getState();

function withCanvas(objects: Record<string, unknown>[] = [{ type: 'rect' }]) {
    const canvas = createFakeCanvas(objects);
    const clearBoard = vi.fn();
    const saveBoard = vi.fn();
    useStore.setState({ canvas: canvas as any, clearBoard, saveBoard } as any);
    return { canvas, clearBoard, saveBoard };
}

const command = (id: string) => FileBarConfig.find((c) => c.id === id)!;

describe('file commands', () => {
    afterEach(() => {
        useStore.setState({
            canvas: original.canvas,
            clearBoard: original.clearBoard,
            saveBoard: original.saveBoard,
        } as any);
        vi.restoreAllMocks();
    });

    it('Save (Ctrl/⌘+S) downloads and never clears', () => {
        const { clearBoard, saveBoard } = withCanvas();
        (command('save').handler as any)({ get: useStore.getState, set: useStore.setState });
        expect(saveBoard).toHaveBeenCalledTimes(1);
        expect(clearBoard).not.toHaveBeenCalled();
    });

    it('Open (Ctrl/⌘+O) opens a file picker and never clears', () => {
        const { clearBoard } = withCanvas();
        const click = vi
            .spyOn(HTMLInputElement.prototype, 'click')
            .mockImplementation(() => undefined);
        (command('open').handler as any)({ get: useStore.getState, set: useStore.setState });
        expect(click).toHaveBeenCalledTimes(1);
        expect(clearBoard).not.toHaveBeenCalled();
    });

    it('New board asks before clearing a board with content', async () => {
        const { clearBoard } = withCanvas();
        await expect(newBoard(async () => false)).resolves.toBe(false);
        expect(clearBoard).not.toHaveBeenCalled();
        await expect(newBoard(async () => true)).resolves.toBe(true);
        expect(clearBoard).toHaveBeenCalledTimes(1);
    });

    it('New board on an empty board clears without asking', async () => {
        const { clearBoard } = withCanvas([]);
        const confirmFn = vi.fn(async () => false);
        await expect(newBoard(confirmFn)).resolves.toBe(true);
        expect(confirmFn).not.toHaveBeenCalled();
        expect(clearBoard).toHaveBeenCalledTimes(1);
    });

    it('New board asks through the themed dialog, never window.confirm', async () => {
        const { clearBoard } = withCanvas();
        const native = vi.spyOn(window, 'confirm');
        const pending = newBoard();

        const [dialog] = useStore.getState().dialogQueue;
        expect(dialog).toMatchObject({ kind: 'confirm', tone: 'danger' });
        useStore.getState().resolveDialog(true);

        await expect(pending).resolves.toBe(true);
        expect(clearBoard).toHaveBeenCalledTimes(1);
        expect(native).not.toHaveBeenCalled();
    });
});
