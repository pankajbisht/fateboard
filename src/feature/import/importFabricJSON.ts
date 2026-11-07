import type * as fabric from 'fabric';
import { useStore } from '@/store';

/**
 * Opens a single-board file (`.fateboard` / `.json` saved before projects existed) into the current
 * page through the store (BUG-101 / BUG-014): persist lock, autosave and ONE undo step. A file that is
 * not a Fabric board says so instead of failing silently.
 */
export async function importFabricJSON(_canvas: fabric.Canvas, file: File) {
    if (!file) return;
    const store = useStore.getState();
    try {
        const json = JSON.parse(await file.text());
        if (!json || typeof json !== 'object' || !Array.isArray(json.objects)) {
            throw new Error('not a Fabric board (no objects list)');
        }
        await store.importJSON(json, { undoable: true });
    } catch (err) {
        console.error('[import] failed to open board', err);
        void store.alertDialog({
            title: "Can't open board",
            message: `"${file.name}" is not a valid Fateboard file.`,
        });
    }
}
