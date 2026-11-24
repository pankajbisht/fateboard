/**
 * Helpers shared by the Pen and Laser tools (createDrawingToolsSlice): pointer events, keys and
 * painting previews on Fabric's top canvas in scene coordinates.
 */
import type * as fabric from 'fabric';
import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';
import type { PenNode, PenPoint } from '@/lib/canvas/penPath';

export type Pointer = {
    e?: { button?: number; shiftKey?: boolean; altKey?: boolean };
    scenePoint?: PenPoint;
    absolutePointer?: PenPoint;
};

export const scenePointOf = (opt: Pointer): PenPoint | null => {
    const p = opt?.scenePoint ?? opt?.absolutePointer;
    return p ? { x: p.x, y: p.y } : null;
};
export const isPrimary = (opt: Pointer) => !opt?.e?.button;
export const distance = (a: PenPoint, b: PenPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * A key the editor should leave alone: a modal is open, the user is typing in a field, or focus is
 * in a popover (its own Escape closes it; it must not also end the tool).
 */
export const keyIsNotOurs = (e: KeyboardEvent) => {
    if (canvasKeysBlocked()) return true;
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    // Enter / Space on a focused control activate it (keyboard users), they do not finish a path
    const activates =
        (e.key === 'Enter' || e.key === ' ') &&
        !!t.closest?.(
            'button, a[href], [role="button"], [role="radio"], [role="switch"], [role="tab"], [role="option"], [role="combobox"]',
        );
    return (
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.isContentEditable ||
        !!t.closest?.('[role="dialog"]') ||
        activates
    );
};

/** Fabric's top canvas, in scene coordinates. Null when there is nothing to paint on. */
export const withSceneContext = (
    canvas: fabric.Canvas,
    paint: (ctx: CanvasRenderingContext2D) => void,
) => {
    const ctx = (canvas as unknown as { contextTop?: CanvasRenderingContext2D }).contextTop;
    if (!ctx) return;
    canvas.clearContext(ctx);
    const v = canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    paint(ctx);
    ctx.restore();
};

export const traceNodes = (ctx: CanvasRenderingContext2D, nodes: readonly PenNode[]) => {
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1];
        const b = nodes[i];
        if (a.out || b.in) {
            const c1 = a.out ?? a;
            const c2 = b.in ?? b;
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
        } else ctx.lineTo(b.x, b.y);
    }
};
