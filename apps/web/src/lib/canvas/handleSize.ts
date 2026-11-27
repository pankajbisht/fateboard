/**
 * Selection handles and the smallest size a user can scale an object to, both measured in SCREEN
 * (CSS) pixels.
 *
 * Why: the design page is drawn at page resolution and the browser scales it to fit the screen
 * (`canvasPxPerCss`, BUG-221), and the whiteboard zooms through the viewport. Fabric's `cornerSize`
 * is in canvas pixels, so a 10 px corner showed as 2-4 px on a large page: hard to grab, worse on a
 * phone. And scaling had no floor, so an object could be shrunk until it disappeared.
 */
import type * as fabric from 'fabric';
import { canvasPxPerCss } from './deepZoom';

/** Corner square, CSS px: mouse / pen vs finger. */
export const CORNER_CSS = { fine: 8, coarse: 12 } as const;
/** Touch hit area around each corner, CSS px (Apple / Material minimum target ~44). */
export const TOUCH_CORNER_CSS = 44;
/** Selection frame thickness, CSS px. */
export const BORDER_CSS = 1;
/** An object can't be scaled below this on screen (each axis), CSS px. Leaves room for the corners. */
export const MIN_OBJECT_CSS = { fine: 24, coarse: 40 } as const;

/**
 * Interaction defaults (not saved in files). With a size floor an object can never pass through
 * zero, so dragging a handle past the opposite edge must not flip it to the other side of its
 * anchor (that looked like the shape jumping). Flip stays available from the Flip commands.
 */
export const SCALING_DEFAULTS = { lockScalingFlip: true } as const;

/** Is the main pointer a finger (phone / tablet)? */
export const isCoarsePointer = (): boolean =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

type Pointer = keyof typeof CORNER_CSS;
const pointerKind = (): Pointer => (isCoarsePointer() ? 'coarse' : 'fine');

/** Handle styles for an object on a canvas with `pxPerCss` canvas px per CSS px. */
export function handleStyle(pxPerCss: number, pointer: Pointer) {
    return {
        cornerSize: CORNER_CSS[pointer] * pxPerCss,
        touchCornerSize: TOUCH_CORNER_CSS * pxPerCss,
        borderScaleFactor: BORDER_CSS * pxPerCss,
    };
}

/** Give the active object handles of a constant screen size. True when something changed. */
export function sizeActiveHandles(
    canvas: fabric.Canvas,
    pointer: Pointer = pointerKind(),
): boolean {
    const active = canvas.getActiveObject();
    if (!active) return false;
    const style = handleStyle(canvasPxPerCss(canvas), pointer);
    if (
        active.cornerSize === style.cornerSize &&
        active.touchCornerSize === style.touchCornerSize &&
        active.borderScaleFactor === style.borderScaleFactor
    )
        return false;
    active.set(style);
    active.setCoords(); // the corner hit areas are cached in oCoords
    return true;
}

/** Scene px shown as one CSS px (viewport zoom on the whiteboard, page fit scale on the design board). */
export const cssPerScene = (canvas: fabric.Canvas): number =>
    (canvas.getZoom() || 1) / canvasPxPerCss(canvas);

type ScaleTransform = Pick<fabric.Transform, 'action' | 'originX' | 'originY'> & {
    original: { scaleX: number; scaleY: number };
};

/**
 * Keep an object being scaled at least `minSize` scene px wide and high, with the dragged-from
 * anchor (the opposite corner / side) fixed. An axis that started smaller than `minSize` (a thin
 * line) may not shrink further but is never forced bigger. A proportional corner drag stays
 * proportional. True when the scale was clamped.
 */
export function clampMinScale(
    target: fabric.FabricObject,
    transform: ScaleTransform,
    minSize: number,
): boolean {
    const { original } = transform;
    const need = (base: number, start: number, now: number) => {
        if (!(base > 0) || !(now > 0)) return 1;
        const floor = Math.min(minSize, base * start);
        return floor / (base * now);
    };
    const needX =
        transform.action === 'scaleY' ? 1 : need(target.width, original.scaleX, target.scaleX);
    const needY =
        transform.action === 'scaleX' ? 1 : need(target.height, original.scaleY, target.scaleY);
    if (needX <= 1 && needY <= 1) return false;

    let sx = target.scaleX;
    let sy = target.scaleY;
    const proportional =
        transform.action === 'scale' &&
        Math.abs(sx * original.scaleY - sy * original.scaleX) <= 1e-6 * sx * original.scaleY;
    if (proportional) {
        const k = Math.max(needX, needY);
        sx *= k;
        sy *= k;
    } else {
        if (needX > 1) sx *= needX;
        if (needY > 1) sy *= needY;
    }

    const anchor = target.getPositionByOrigin(transform.originX, transform.originY);
    target.set({ scaleX: sx, scaleY: sy });
    target.setPositionByOrigin(anchor, transform.originX, transform.originY);
    target.setCoords();
    return true;
}

/** `object:scaling` listener: the minimum on-screen size for the object being scaled. */
export function enforceMinSize(
    canvas: fabric.Canvas,
    e: { target?: fabric.FabricObject; transform?: ScaleTransform },
    pointer: Pointer = pointerKind(),
): boolean {
    if (!e?.target || !e.transform || e.target.excludeFromExport) return false;
    return clampMinScale(e.target, e.transform, MIN_OBJECT_CSS[pointer] / cssPerScene(canvas));
}

/**
 * The canvas listeners for this module, for the canvas slice's one listener registry (removed with
 * it). `onScaling` (the transform panel sync) runs after the clamp, so it sees the floored size.
 * `before:render` only touches the active object and is a no-op when the size is already right.
 */
export function handleSizeEvents(
    canvas: fabric.Canvas,
    onScaling: (e: Parameters<typeof enforceMinSize>[1]) => void,
) {
    return {
        'object:scaling': (e: Parameters<typeof enforceMinSize>[1]) => {
            enforceMinSize(canvas, e);
            onScaling(e);
        },
        'before:render': () => sizeActiveHandles(canvas),
    };
}
