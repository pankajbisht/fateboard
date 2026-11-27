import type * as fabric from 'fabric';
import { timed } from '@/lib/perf/perfMarks';

/** Width of a page thumbnail in the Pages panel (CSS px). */
export const THUMB_WIDTH = 160;

/** PNG thumbnail of the page on the board; `undefined` when it cannot be made. */
export const makeThumbnail = (canvas: fabric.Canvas): string | undefined => {
    try {
        const w = canvas.getWidth();
        if (!w) return undefined;
        return timed('page:thumbnail', () =>
            canvas.toDataURL({ format: 'png', multiplier: THUMB_WIDTH / w }),
        );
    } catch {
        // tainted canvas (cross-origin image) etc. A missing thumbnail is not fatal.
        return undefined;
    }
};
