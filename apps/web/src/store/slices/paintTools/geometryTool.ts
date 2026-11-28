/**
 * Geometry tool (D): one pointer flow for every instrument of the geometry box. Drag from a point to place the
 * first segment (starts snap to line ends nearby); an angle (Protractor) or an arc (Compass › Arc) then takes a
 * click for the second arm. Each instrument constrains the live point (`resolve`), the overlay shows the
 * instrument and the reading, and the finished points go to `onDraw` (store `geometryDraw`).
 * Alt = free (no snapping); Shift on the Scale = stepped angle; Escape cancels the stroke, or, with none,
 * returns to Select.
 */
import type * as fabric from 'fabric';
import { angleOf, drafterEnd, mmToPx } from '@/lib/canvas/drafter';
import { pointsNeeded, rayPoint, scaleEnd, setSquareEnd, sweepTo } from '@/lib/canvas/geometry';
import {
    isPrimary,
    keyIsNotOurs,
    scenePointOf,
    withSceneContext,
    type Pointer,
} from '../drawingTools/shared';
import { isHelperObject } from './bucketFill';
import { lineEnds, paintHead, type OverlayDeps } from './drafterTool';
import { paintInstrument } from './geometryOverlays';
import type { GeometryStyle } from './paintToolStyles';

type Pt = { x: number; y: number };
type Obj = fabric.FabricObject & Record<string, unknown>;
type Mods = { altKey?: boolean; shiftKey?: boolean } | undefined;
const SNAP_PX = 8;

export type GeometryDeps = OverlayDeps & {
    style: () => GeometryStyle;
    onDraw: (points: Pt[], sweep: number) => void;
    onEscape: () => void;
};

/** Listens on the canvas while the Geometry tool is active; returns the detach function. */
export function attachGeometry(canvas: fabric.Canvas, deps: GeometryDeps): () => void {
    let points: Pt[] = [];
    let dragging = false;
    let sweep = 0;
    // the instrument a stroke started with: a stroke never finishes under another one
    let strokeKey = '';
    const keyOf = (st: GeometryStyle) => `${st.instrument}/${st.compass}`;
    let ends: Pt[] = [];
    let reference: number | null = null;
    // one repaint per animation frame (mouse:move can fire faster)
    let frame = 0;
    let pending: (() => void) | null = null;
    const schedule = (paint: () => void) => {
        pending = paint;
        if (!frame)
            frame = requestAnimationFrame(() => {
                frame = 0;
                pending?.();
                pending = null;
            });
    };
    const clearOverlay = () => {
        pending = null;
        withSceneContext(canvas, () => undefined);
    };
    const reset = () => {
        points = [];
        dragging = false;
        sweep = 0;
        clearOverlay();
    };
    const active = canvas.getActiveObject() as Obj | undefined;
    const ref = active && lineEnds(active);
    if (ref) reference = angleOf(ref[0], ref[1]);

    const snap = (p: Pt) => {
        const r = SNAP_PX / Math.max(deps.screen(), 1e-6);
        let best: Pt = p;
        let bestD = r;
        for (const e of ends) {
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < bestD) {
                best = e;
                bestD = d;
            }
        }
        return best;
    };

    /** The constrained next point for a pointer at `raw` (and the sweep for a second arm). */
    const resolve = (raw: Pt, e: Mods): { point: Pt; sweep: number; angle: number } => {
        const style = deps.style();
        const free = !!e?.altKey;
        const [a, b] = points;
        if (points.length === 2) {
            // second arm: Protractor angle or Compass arc, measured from the first arm
            const a0 = angleOf(a, b);
            const s = sweepTo(a0, angleOf(a, raw), sweep, free ? 0 : style.step);
            const r =
                style.instrument === 'compass'
                    ? Math.hypot(b.x - a.x, b.y - a.y)
                    : Math.hypot(raw.x - a.x, raw.y - a.y);
            return { point: rayPoint(a, a0 + s, r), sweep: s, angle: a0 + s };
        }
        if (style.instrument === 'compass') return { point: raw, sweep: 0, angle: angleOf(a, raw) };
        if (style.instrument === 'scale') {
            const tick = free ? 0 : mmToPx(style.scaleTickMm);
            const r = scaleEnd(a, raw, tick, e?.shiftKey ? style.step : 0);
            return { point: r.end, sweep: 0, angle: r.angle };
        }
        if (style.instrument === 'setSquare' && !free) {
            const r = setSquareEnd(a, raw, style.setSquare, style.base);
            return { point: r.end, sweep: 0, angle: r.angle };
        }
        const lock =
            style.instrument === 'drafter' && style.mode === 'parallel'
                ? reference
                : style.instrument === 'drafter' &&
                    style.mode === 'perpendicular' &&
                    reference !== null
                  ? reference + 90
                  : null;
        const r = drafterEnd(a, raw, {
            step: style.step,
            base: style.instrument === 'drafter' ? style.base : 0,
            free,
            lockAngle: lock,
        });
        return { point: r.end, sweep: 0, angle: r.angle };
    };

    const paint = (live: Pt, liveSweep: number, angle: number) => {
        const style = deps.style();
        const all = [...points, live];
        if (style.instrument === 'drafter') {
            const [a] = points;
            paintHead(canvas, a, live, angle, Math.hypot(live.x - a.x, live.y - a.y), style, deps);
        } else paintInstrument(canvas, style, deps, { points: all, sweep: liveSweep });
    };

    const onDown = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (!isPrimary(opt) || !p) return;
        if (points.length === 0) {
            ends = (canvas.getObjects() as Obj[])
                .filter((o) => !isHelperObject(o) && o.visible !== false)
                .flatMap((o) => lineEnds(o) ?? []);
            points = [snap(p)];
            dragging = true;
            strokeKey = keyOf(deps.style());
        }
    };
    const onMove = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (points.length === 0 || !p) return;
        if (keyOf(deps.style()) !== strokeKey) return reset(); // mode changed in the bar
        const r = resolve(p, opt.e as Mods);
        // the second arm follows the pointer round: past 180° an arc keeps its direction
        if (points.length === 2) sweep = r.sweep;
        schedule(() => paint(r.point, r.sweep, r.angle));
    };
    const onUp = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (points.length === 0 || !p || !isPrimary(opt)) return; // right-click = context menu
        const style = deps.style();
        if (keyOf(style) !== strokeKey) return reset();
        const r = resolve(p, opt.e as Mods);
        if (dragging) {
            dragging = false;
            const [a] = points;
            // a click without a drag places nothing (the first segment needs a length)
            if (Math.hypot(r.point.x - a.x, r.point.y - a.y) * deps.screen() < 3) return reset();
        }
        points = [...points, r.point];
        sweep = r.sweep;
        if (points.length < pointsNeeded(style.instrument, style.compass)) return;
        const done = points;
        const doneSweep = sweep;
        reset();
        if (done.length === 3 && Math.abs(doneSweep) < 1e-6) return; // a zero angle / arc
        deps.onDraw(done, doneSweep);
        if (done.length === 2) reference = angleOf(done[0], done[1]);
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || keyIsNotOurs(e)) return;
        if (points.length) return reset(); // cancel the stroke, stay in the tool
        clearOverlay();
        deps.onEscape();
    };
    const offs = [
        canvas.on('mouse:down', onDown as never),
        canvas.on('mouse:move', onMove as never),
        canvas.on('mouse:up', onUp as never),
    ];
    window.addEventListener('keydown', onKey);
    return () => {
        offs.forEach((off) => off());
        window.removeEventListener('keydown', onKey);
        if (frame) cancelAnimationFrame(frame);
        withSceneContext(canvas, () => undefined);
    };
}
