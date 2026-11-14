/**
 * Touch gestures for the editor board (iPad, Android, touch screens). No store, no Fabric import:
 * the caller passes handlers (`useTouchGestures` wires them to the store and the canvas).
 *
 * Why this sits in front of Fabric: Fabric 7 follows one finger. A second finger re-runs its
 * mouse-down (the brush restarts mid-stroke), touch never sends click / dblclick (Fabric cancels
 * touchstart), and there is no pinch. So listeners on the board root, in the capture phase, see
 * every touch first and decide:
 *
 * - One finger on the canvas is held for a moment (`pending`). Moving past the tap slop, lifting
 *   (a tap) or holding still for `PINCH_WINDOW_MS` with a drawing tool (`LONG_PRESS_MS` with
 *   Select, which then opens the context menu) hands it to Fabric with the moves it missed
 *   (`forwarded`). A second finger in that window makes it a pinch / pan instead and Fabric never
 *   sees the first one, so nothing is half drawn or half moved.
 * - Once Fabric owns a finger, extra fingers are swallowed (the stroke keeps going). When Fabric's
 *   finger lifts (or the system cancels it) while others stay down, its stroke / drag ends right
 *   there: Fabric itself only ends on a touchend that leaves no finger down and ignores touchcancel.
 * - Holding still with the select tool opens the context menu (long press).
 * - Two quick taps call `doubleTap` (text editing, node editing, gradient handles).
 * - A pen draws at once, also when a palm is already resting (the palm was never given to Fabric).
 *   A palm that touches while the pen is down is ignored, and after a pen was used one finger
 *   pans with drawing tools instead of drawing (pen-only drawing).
 * - The Hand tool pans with one finger (Fabric's pan reads mouse `movementX`, touch has none).
 * - One finger outside the canvas (the grey design board) is left to the browser: native scroll.
 */

export const TAP_SLOP_PX = 8;
export const LONG_PRESS_MS = 500;
/**
 * Drawing tools (no long press): a finger held still starts drawing after this. Two fingers of a
 * pinch land well inside it; any longer and a held dot feels late.
 */
export const PINCH_WINDOW_MS = 120;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_SLOP_PX = 24;
/** A touchstart this soon after a `pen` pointerdown belongs to that pen (pointer events come first). */
const PEN_POINTER_MS = 100;

export interface TouchMode {
    /** Hand tool: one finger pans. */
    panOnly: boolean;
    /** A drawing tool is active (after a pen was used, fingers pan instead of drawing). */
    drawing: boolean;
    /** Holding still opens the context menu. */
    longPress: boolean;
    /** Two quick taps call `doubleTap`. */
    doubleTap: boolean;
}

export interface TouchGestureHandlers {
    /** The touch started on the Fabric canvas (Fabric would handle it). */
    isCanvasTarget: (target: EventTarget | null) => boolean;
    /** Fabric's own touch entry points (`canvas._onTouchStart`, `canvas._onMouseMove`). */
    forwardStart: (e: TouchEvent) => void;
    forwardMove: (e: TouchEvent) => void;
    /** End Fabric's interaction (`canvas._onTouchEnd`) with a touchend that has no finger down. */
    forwardEnd: (e: TouchEvent) => void;
    getMode: () => TouchMode;
    /** Move the view by screen px. */
    pan: (dx: number, dy: number) => void;
    /** Zoom by `factor` around a client point. */
    pinch: (factor: number, clientX: number, clientY: number) => void;
    longPress: (clientX: number, clientY: number) => void;
    doubleTap: (clientX: number, clientY: number) => void;
}

type Point = { x: number; y: number };
type TouchLike = { identifier: number; clientX: number; clientY: number; touchType?: string };

type State =
    | { kind: 'idle' }
    | { kind: 'native' } // one finger off the canvas: the browser scrolls
    | { kind: 'pending'; id: number; start: TouchEvent; at: Point; moves: TouchEvent[] }
    | { kind: 'forwarded'; id: number } // Fabric owns this finger / pen
    | { kind: 'panning'; id: number; last: Point }
    | { kind: 'gesture'; ids: [number, number]; mid: Point; dist: number }
    | { kind: 'ignored' }; // swallow fingers until every one is up (a new pen may still draw)

const list = (l: ArrayLike<TouchLike> | undefined | null): TouchLike[] =>
    l ? Array.prototype.slice.call(l) : [];
const find = (l: ArrayLike<TouchLike>, id: number) => list(l).find((t) => t.identifier === id);
const pt = (t: TouchLike): Point => ({ x: t.clientX, y: t.clientY });
const far = (a: Point, b: Point, slop: number) => Math.hypot(a.x - b.x, a.y - b.y) > slop;

/** The touchend Fabric waits for: `t` lifted and no finger left down (it reads only these fields). */
const finalTouchEnd = (e: TouchEvent, t: TouchLike) =>
    ({
        type: 'touchend',
        target: e.target,
        timeStamp: e.timeStamp,
        touches: [],
        targetTouches: [],
        changedTouches: [t],
        cancelable: false,
        defaultPrevented: false,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
        stopImmediatePropagation: () => undefined,
    }) as unknown as TouchEvent;

function pair(e: TouchEvent): { ids: [number, number]; mid: Point; dist: number } | null {
    const [a, b] = list(e.touches);
    if (!a || !b) return null;
    return {
        ids: [a.identifier, b.identifier],
        mid: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
    };
}

/** Attach to the board root. Returns the detach function (removes listeners and timers). */
export function attachTouchGestures(root: HTMLElement, h: TouchGestureHandlers): () => void {
    let state: State = { kind: 'idle' };
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    let lastTap: { t: number; at: Point } | null = null;
    let lastPointer: { type: string; t: number } | null = null;
    let penSeen = false;

    const swallow = (e: Event) => {
        if (e.cancelable) e.preventDefault(); // no page zoom, no emulated mouse events
        e.stopPropagation(); // Fabric listens below / on the document
    };
    const clearHold = () => {
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = null;
    };
    const isPen = (t: TouchLike, e: TouchEvent) =>
        t.touchType === 'stylus' ||
        (lastPointer?.type === 'pen' && e.timeStamp - lastPointer.t < PEN_POINTER_MS);

    /** Hand the held finger to Fabric: its touchstart, then the moves inside the slop. */
    const forward = (s: Extract<State, { kind: 'pending' }>) => {
        clearHold();
        h.forwardStart(s.start);
        for (const m of s.moves) h.forwardMove(m);
        state = { kind: 'forwarded', id: s.id };
    };

    const startGesture = (e: TouchEvent) => {
        clearHold();
        const p = pair(e);
        state = p ? { kind: 'gesture', ...p } : { kind: 'ignored' };
    };

    const onHold = () => {
        holdTimer = null;
        if (state.kind !== 'pending') return;
        if (h.getMode().longPress) {
            const { at } = state;
            state = { kind: 'ignored' };
            h.longPress(at.x, at.y);
        } else {
            forward(state);
        }
    };

    /** A pen lands: it wins over resting palms, which were never given to Fabric. */
    const onPenStart = (e: TouchEvent, t: TouchLike) => {
        penSeen = true;
        if (!h.isCanvasTarget(e.target)) {
            if (state.kind === 'idle') state = { kind: 'native' }; // a toolbar button, the grey board
            return;
        }
        if (state.kind === 'forwarded') {
            swallow(e); // Fabric already owns a contact
            return;
        }
        clearHold(); // a palm held in `pending` is dropped
        if (h.getMode().panOnly) {
            swallow(e);
            state = { kind: 'panning', id: t.identifier, last: pt(t) };
            return;
        }
        state = { kind: 'forwarded', id: t.identifier }; // straight to Fabric: no tap delay
    };

    const onStart = (e: TouchEvent) => {
        const t = list(e.changedTouches)[0];
        if (!t) return;
        if (isPen(t, e)) {
            onPenStart(e, t);
            return;
        }
        switch (state.kind) {
            case 'idle': {
                if (!h.isCanvasTarget(e.target)) {
                    state = { kind: 'native' };
                    return;
                }
                swallow(e);
                const mode = h.getMode();
                if (mode.panOnly || (penSeen && mode.drawing)) {
                    state = { kind: 'panning', id: t.identifier, last: pt(t) };
                    return;
                }
                state = { kind: 'pending', id: t.identifier, start: e, at: pt(t), moves: [] };
                holdTimer = setTimeout(onHold, mode.longPress ? LONG_PRESS_MS : PINCH_WINDOW_MS);
                return;
            }
            case 'native':
            case 'pending':
            case 'panning':
            case 'gesture':
                swallow(e);
                startGesture(e);
                return;
            case 'forwarded':
            case 'ignored':
                swallow(e); // a palm, or a finger after a stroke started
                return;
        }
    };

    const onMove = (e: TouchEvent) => {
        switch (state.kind) {
            case 'idle':
            case 'native':
                return;
            case 'pending': {
                const t = find(e.touches, state.id);
                if (t && far(pt(t), state.at, TAP_SLOP_PX)) {
                    forward(state);
                    return; // this move goes on to Fabric
                }
                state.moves.push(e);
                swallow(e);
                return;
            }
            case 'forwarded': {
                const first = list(e.changedTouches)[0];
                if (first && first.identifier !== state.id) swallow(e); // not Fabric's finger
                return;
            }
            case 'panning': {
                swallow(e);
                const t = find(e.touches, state.id);
                if (!t) return;
                h.pan(t.clientX - state.last.x, t.clientY - state.last.y);
                state.last = pt(t);
                return;
            }
            case 'gesture': {
                swallow(e);
                const p = pair(e);
                if (!p) return;
                if (p.ids[0] !== state.ids[0] || p.ids[1] !== state.ids[1]) {
                    state = { kind: 'gesture', ...p }; // a finger changed: new baseline
                    return;
                }
                const factor = state.dist > 0 ? p.dist / state.dist : 1;
                if (factor !== 1 && Number.isFinite(factor)) h.pinch(factor, p.mid.x, p.mid.y);
                // pan only when the browser is not already scrolling this touch natively
                const dx = p.mid.x - state.mid.x;
                const dy = p.mid.y - state.mid.y;
                if (e.defaultPrevented && (dx || dy)) h.pan(dx, dy);
                state = { kind: 'gesture', ...p };
                return;
            }
            case 'ignored':
                swallow(e);
                return;
        }
    };

    const onEnd = (e: TouchEvent) => {
        const done = list(e.touches).length === 0;
        const cancelled = e.type === 'touchcancel';
        switch (state.kind) {
            case 'pending': {
                clearHold();
                if (cancelled) {
                    swallow(e);
                    break;
                }
                const at = state.at;
                forward(state); // a tap: Fabric gets down here and up from this event
                const now = e.timeStamp;
                const double =
                    lastTap &&
                    now - lastTap.t < DOUBLE_TAP_MS &&
                    !far(at, lastTap.at, DOUBLE_TAP_SLOP_PX) &&
                    h.getMode().doubleTap;
                lastTap = double ? null : { t: now, at };
                // after Fabric has handled this touchend (its mouse-up)
                if (double) {
                    tapTimer = setTimeout(() => {
                        tapTimer = null;
                        h.doubleTap(at.x, at.y);
                    }, 0);
                }
                break;
            }
            case 'forwarded': {
                const mine = find(e.changedTouches, state.id);
                if (mine && (cancelled || !done)) {
                    // Fabric's contact is gone but it would wait for every finger (or forever, on
                    // touchcancel): end its stroke / drag now, keep ignoring the other fingers
                    swallow(e);
                    h.forwardEnd(finalTouchEnd(e, mine));
                    state = { kind: 'ignored' };
                } else if (!done) {
                    swallow(e); // a palm or an extra finger lifted
                }
                break;
            }
            case 'panning':
            case 'gesture':
            case 'ignored':
                swallow(e);
                break;
            default:
                break;
        }
        if (done) {
            clearHold();
            state = { kind: 'idle' };
        }
    };

    const onPointerDown = (e: PointerEvent) => {
        lastPointer = { type: e.pointerType, t: e.timeStamp };
    };

    const opts: AddEventListenerOptions = { capture: true, passive: false };
    root.addEventListener('pointerdown', onPointerDown, true);
    root.addEventListener('touchstart', onStart, opts);
    root.addEventListener('touchmove', onMove, opts);
    root.addEventListener('touchend', onEnd, opts);
    root.addEventListener('touchcancel', onEnd, opts);

    return () => {
        clearHold();
        if (tapTimer) clearTimeout(tapTimer);
        root.removeEventListener('pointerdown', onPointerDown, true);
        root.removeEventListener('touchstart', onStart, opts);
        root.removeEventListener('touchmove', onMove, opts);
        root.removeEventListener('touchend', onEnd, opts);
        root.removeEventListener('touchcancel', onEnd, opts);
    };
}
