/**
 * Stylus pressure and coalesced samples for brushes (BUG-234).
 *
 * The editor canvas keeps Fabric's mouse + touch listeners (`enablePointerEvents` false) because the touch
 * gesture layer forwards TouchEvents to Fabric. A MouseEvent or TouchEvent has no `pointerType` / `pressure`,
 * so brushes reading those always saw a mouse. Pointer events fire before the matching mouse / touch event:
 * a capture listener records the latest one, and brushes look it up here.
 */

export type PenSample = { pen: boolean; pressure: number };

const MOUSE: PenSample = { pen: false, pressure: 1 };
/** A recorded pointer event older than this (ms) does not belong to the event being handled. */
const MAX_AGE_MS = 40;

type Tracker = { last: PointerEvent | null };
type TouchLike = { touchType?: string; force?: number };
type PointerCanvas = {
    upperCanvasEl?: HTMLElement;
    /** Fabric's scene-point maths (patched by lib/canvas/deepZoom for the zoom window). */
    _getPointerImpl?: (e: Event, fromViewport?: boolean) => { x: number; y: number };
};

const trackers = new WeakMap<object, Tracker>();

const fromPointer = (e: { pointerType?: string; pressure?: number }): PenSample =>
    e.pointerType === 'pen' && (e.pressure ?? 0) > 0
        ? { pen: true, pressure: Math.min(1, e.pressure as number) }
        : MOUSE;

/** iPad: the TouchEvent itself says stylus and how hard. */
function stylusTouch(e: unknown): TouchLike | null {
    const t = e as { changedTouches?: ArrayLike<TouchLike>; touches?: ArrayLike<TouchLike> } | null;
    for (const list of [t?.changedTouches, t?.touches]) {
        for (const touch of Array.from(list ?? [])) if (touch.touchType === 'stylus') return touch;
    }
    return null;
}

/** Record pointer events for `el` (Fabric's upper canvas). Returns the detach function. */
export function attachPenInput(el: HTMLElement): () => void {
    const tracker: Tracker = { last: null };
    trackers.set(el, tracker);
    const doc = el.ownerDocument;
    const record = (e: PointerEvent) => {
        if (e.isPrimary) tracker.last = e;
    };
    // the document, not the canvas: a stroke keeps going when the pointer leaves the canvas
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    doc.addEventListener('pointerdown', record, opts);
    doc.addEventListener('pointermove', record, opts);
    return () => {
        doc.removeEventListener('pointerdown', record, opts);
        doc.removeEventListener('pointermove', record, opts);
        if (trackers.get(el) === tracker) trackers.delete(el);
    };
}

/** The recorded pointer event behind `e` (the MouseEvent / TouchEvent Fabric is handling), if any. */
function pointerBehind(el: object | undefined, e: unknown): PointerEvent | null {
    const last = el ? (trackers.get(el)?.last ?? null) : null;
    const ts = (e as { timeStamp?: number } | null)?.timeStamp;
    if (!last || typeof ts !== 'number') return null;
    return Math.abs(ts - last.timeStamp) <= MAX_AGE_MS ? last : null;
}

/** Is `e` from a stylus, and how hard is it pressed? A mouse or a finger is 1. */
export function penSample(el: object | undefined, e: unknown): PenSample {
    const direct = e as { pointerType?: unknown } | null;
    if (direct && typeof direct.pointerType === 'string')
        return fromPointer(direct as PointerEvent);
    const touch = stylusTouch(e);
    if (touch)
        return { pen: true, pressure: (touch.force ?? 0) > 0 ? Math.min(1, touch.force!) : 1 };
    const behind = pointerBehind(el, e);
    return behind ? fromPointer(behind) : MOUSE;
}

/**
 * Scene points of the samples the browser merged into this move (a fast pen sends 120-240 Hz, Fabric sees
 * one move per frame). The last coalesced sample is the event itself, which Fabric already passed as
 * `pointer`, so it is left out. Empty when there is nothing extra.
 */
export function coalescedScenePoints(
    canvas: object,
    e: unknown,
): Array<{ x: number; y: number; pressure: number }> {
    const c = canvas as PointerCanvas;
    const own = e as Partial<PointerEvent> | null;
    const src =
        typeof own?.getCoalescedEvents === 'function'
            ? (own as PointerEvent)
            : pointerBehind(c.upperCanvasEl, e);
    if (!src || typeof src.getCoalescedEvents !== 'function' || !c._getPointerImpl) return [];
    return src
        .getCoalescedEvents()
        .slice(0, -1)
        .map((sample) => {
            const p = c._getPointerImpl!(sample);
            return { x: p.x, y: p.y, pressure: fromPointer(sample).pressure };
        });
}
