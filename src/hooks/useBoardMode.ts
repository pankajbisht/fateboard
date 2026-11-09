import { useStore } from '@store';
import type { CanvasMode } from '@/components/organisms/board/ui/CanvasBoard';

/**
 * The editor's board: Settings > Freehand ON = whiteboard (infinite canvas, no page),
 * OFF = design (fixed page). One global setting (DECISIONS Q3, option b).
 */
export function useBoardMode(): CanvasMode {
    return useStore((s) => (s.settings.freehand ? 'whiteboard' : 'design'));
}
