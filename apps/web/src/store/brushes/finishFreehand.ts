import type * as fabric from 'fabric';
import { closeIfNearStart } from '@/lib/canvas/autoClose';
import { pathPoints, recognizeShape, type Cmd } from '@/lib/canvas/shapeRecognizer';

type FinishState = { activeTool?: unknown; pencilStyle?: unknown; autoClose?: unknown };

/**
 * Last touch on a new freehand path, before it is added (so it stays one undo step):
 * Pencil › Smart shape replaces a rough line / circle / ellipse / rectangle / triangle with the clean
 * shape (still an editable Path); otherwise auto-close adds a `Z` when the end is near the start.
 */
export function finishFreehand(path: fabric.Path, s: FinishState, tolerance: number): void {
    const mode = (s.pencilStyle as { mode?: string } | undefined)?.mode;
    if (s.activeTool === 'pencil' && mode === 'shape') {
        const shape = recognizeShape(pathPoints(path.path as unknown as Cmd[]));
        if (!shape) return;
        path._setPath(shape.path as never, true);
        path.setCoords();
        return;
    }
    if (s.autoClose) closeIfNearStart(path as never, tolerance);
}
