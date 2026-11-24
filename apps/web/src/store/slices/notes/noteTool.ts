/**
 * The Note tool (key N) on one canvas: a primary click drops a note (on an object: linked to it), Escape goes back
 * to Select. Used by `createNotesSlice` while `activeTool === 'note'`. No store import (BUG-048).
 */
import type { Canvas, FabricObject } from 'fabric';
import { findNoteTarget } from '@/lib/notes/noteTargets';
import { isPrimary, keyIsNotOurs, scenePointOf, type Pointer } from '../drawingTools/shared';

export function attachNoteTool(
    canvas: Canvas,
    actions: {
        addNote: (at: { x: number; y: number }, target: FabricObject | null) => unknown;
        toSelect: () => void;
    },
): () => void {
    const onDown = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (!p || !isPrimary(opt)) return;
        // an open note was already saved and closed by its pop-over (pointerdown outside it)
        actions.addNote(p, findNoteTarget(canvas, p));
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || keyIsNotOurs(e)) return;
        actions.toSelect();
    };
    const off = canvas.on('mouse:down', onDown as never);
    window.addEventListener('keydown', onKey);
    return () => {
        off();
        window.removeEventListener('keydown', onKey);
    };
}
