/**
 * Builds the live stamp brush for the brush slice: the library brush's settings (`brushLibrary.ts`), then the
 * user's override for that brush (Brush settings panel, `stampOverrides`), then the brush state (size, colour,
 * opacity, stabiliser) the slice applies to every brush.
 */
import type * as fabric from 'fabric';
import { StampBrush } from '@/lib/brushes/stamp/StampBrush';
import { resolveStamp, type StampParams } from '@/lib/brushes/stamp/stampParams';
import { getPreset } from '../brushConfig';

type StampState = {
    brush: string;
    brushOpacity: number;
    smoothing: number;
    stampOverrides?: Record<string, Partial<StampParams>>;
};

/** The settings a stamp brush draws with right now. */
export const stampParamsOf = (s: StampState): StampParams =>
    resolveStamp(s.stampOverrides?.[s.brush], resolveStamp(getPreset(s.brush).stamp));

export function createStampBrush(canvas: fabric.Canvas, s: StampState): StampBrush {
    return new StampBrush(canvas, {
        params: stampParamsOf(s),
        brushId: s.brush,
        label: getPreset(s.brush).label,
        opacity: s.brushOpacity,
        smoothing: s.smoothing,
    });
}
