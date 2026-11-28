/**
 * Dragging the symmetry handles on the board: the centre, a reference pin, or the active pin's axis knob.
 * - Select / other tools (guide shown because the Symmetry panel is open): drag a handle directly.
 * - Drawing tools: Alt + drag (so strokes near the centre still draw); Alt + drag away from every handle moves
 *   the centre (or the active pin) to the pointer.
 * Points snap to the page, objects (centres, edges, corners) and other pins; the axis knob snaps to 15°.
 * Hold Ctrl / ⌘ for a free move. A capture listener on the board wrapper runs before Fabric, so a grab never
 * starts a stroke or a selection. Moves are throttled to animation frames.
 */
import type * as fabric from 'fabric';
import { boxTargets, snapAngle, snapPoint } from '@/lib/canvas/symmetryFrame';
import type { Pt } from '@/lib/canvas/symmetryMath';
import { screenScale } from '@/lib/canvas/screenScale';
import { DRAW_TOOLS, HANDLE, guideHandles, guideVisible, type GuidePeers } from './symmetryGuide';
import { objectBox, pageBox } from './symmetrySetup';

export type Grab = { kind: 'center' } | { kind: 'pin'; id: string } | { kind: 'knob'; id: string };

export type PointerActions = {
    moveCenter: (p: Pt) => void;
    movePin: (id: string, p: Pt) => void;
    turnPin: (id: string, angle: number) => void;
};

/** Scene point of a client point on the board. */
export function clientToScene(canvas: fabric.Canvas, clientX: number, clientY: number): Pt {
    const el = canvas.upperCanvasEl;
    const rect = el.getBoundingClientRect();
    const sx = (clientX - rect.left) * (canvas.getWidth() / (rect.width || 1));
    const sy = (clientY - rect.top) * (canvas.getHeight() / (rect.height || 1));
    const v = canvas.viewportTransform;
    const det = v[0] * v[3] - v[1] * v[2] || 1;
    const dx = sx - v[4];
    const dy = sy - v[5];
    return { x: (v[3] * dx - v[2] * dy) / det, y: (-v[1] * dx + v[0] * dy) / det };
}

/** What is under `p` (scene), nearest first: knob, pins, centre. */
export function hitHandle(s: GuidePeers, p: Pt, k: number): Grab | null {
    const h = guideHandles(s);
    const r = HANDLE.hit / k;
    const near = (q: Pt) => Math.hypot(q.x - p.x, q.y - p.y) <= r;
    if (h.knob && near(h.knob.at)) return { kind: 'knob', id: h.knob.id };
    const pin = h.pins.find((q) => near(q.at));
    if (pin) return { kind: 'pin', id: pin.id };
    if (h.center && near(h.center)) return { kind: 'center' };
    return null;
}

/** Snap targets: page box, up to 300 objects' boxes, and the other pins. */
export function snapTargets(s: GuidePeers, canvas: fabric.Canvas, skipPin?: string): Pt[] {
    const out = boxTargets(pageBox(s, canvas));
    const objects = canvas
        .getObjects()
        .filter((o) => {
            const r = o as unknown as Record<string, unknown>;
            return !r.excludeFromExport && !r._isHelper && o.visible !== false;
        })
        .slice(-300);
    for (const o of objects) out.push(...boxTargets(objectBox(o)));
    for (const pin of s.symmetryPins) if (pin.id !== skipPin) out.push({ x: pin.x, y: pin.y });
    return out;
}

/** Attaches the drag listener; returns its disposer. */
export function attachSymmetryPointer(
    canvas: fabric.Canvas,
    peers: () => GuidePeers,
    act: PointerActions,
): () => void {
    const wrapper = (canvas.upperCanvasEl?.parentElement ?? null) as HTMLElement | null;
    if (!wrapper) return () => {};
    let grab: Grab | null = null;
    let targets: Pt[] = [];
    let frame = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
        frame = 0;
        const e = last;
        if (!e || !grab) return;
        const s = peers();
        const k = screenScale(canvas);
        const raw = clientToScene(canvas, e.clientX, e.clientY);
        const free = e.ctrlKey || e.metaKey;
        if (grab.kind === 'knob') {
            const id = grab.id;
            const pin = s.symmetryPins.find((q) => q.id === id);
            if (!pin) return;
            const deg = (Math.atan2(raw.y - pin.y, raw.x - pin.x) * 180) / Math.PI;
            act.turnPin(id, free ? Math.round(deg * 10) / 10 : snapAngle(deg));
            return;
        }
        const p = free ? raw : snapPoint(raw, targets, 8 / k).point;
        if (grab.kind === 'pin') act.movePin(grab.id, p);
        else act.moveCenter(p);
    };

    const onMove = (e: PointerEvent) => {
        if (!grab) return;
        e.preventDefault();
        e.stopPropagation();
        last = e;
        if (!frame) frame = requestAnimationFrame(apply);
    };
    const onUp = (e: PointerEvent) => {
        if (!grab) return;
        e.stopPropagation();
        last = e;
        apply();
        // the compatibility mouseup comes after pointerup: release the block on the next frame
        requestAnimationFrame(() => {
            grab = null;
        });
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
    };
    const onDown = (e: PointerEvent) => {
        const s = peers();
        if (e.button !== 0 || !guideVisible(s)) return;
        const drawing = DRAW_TOOLS.includes(s.activeTool ?? '');
        if (drawing && !e.altKey) return;
        const k = screenScale(canvas);
        const p = clientToScene(canvas, e.clientX, e.clientY);
        let hit = hitHandle(s, p, k);
        if (!hit && drawing && e.altKey)
            hit =
                s.symmetrySource === 'pin' && s.symmetryPinId
                    ? { kind: 'pin', id: s.symmetryPinId }
                    : { kind: 'center' };
        if (!hit) return;
        e.preventDefault();
        e.stopPropagation();
        grab = hit;
        targets = snapTargets(s, canvas, hit.kind === 'pin' ? hit.id : undefined);
        last = e;
        apply();
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
    };
    // Fabric reads mouse / touch events: swallow the ones that belong to a grab
    const block = (e: Event) => {
        if (grab) e.stopPropagation();
    };
    const blocked = ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend'];
    wrapper.addEventListener('pointerdown', onDown, true);
    blocked.forEach((t) => wrapper.addEventListener(t, block, true));
    return () => {
        wrapper.removeEventListener('pointerdown', onDown, true);
        blocked.forEach((t) => wrapper.removeEventListener(t, block, true));
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        if (frame) cancelAnimationFrame(frame);
    };
}
