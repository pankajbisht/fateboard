/**
 * Symmetry guide on the board (helper objects: excludeFromExport + layer / snap exclusion): the axes / spokes /
 * tile grid of the current setup (dashed) and the handles (solid): the centre, every reference pin and the
 * active pin's axis knob. Same size on screen at every zoom (widths / radii divided by the screen scale).
 * Shown while a drawing tool is active, or while the Symmetry panel is open. Moved from the Paint tools slice.
 */
import * as fabric from 'fabric';
import { symmetryGuides } from '@/lib/canvas/symmetry';
import { direction, type Pt } from '@/lib/canvas/symmetryMath';
import { screenScale } from '@/lib/canvas/screenScale';
import { curvePolyline } from './symmetryObjects';
import { findObjectById, symmetryFrameOf, type SymmetryStateView } from './symmetrySetup';

export const GUIDE = '__fbSymmetryGuide';
export const DRAW_TOOLS = ['draw', 'spray'];
/** Handle sizes in screen px. */
export const HANDLE = { center: 7, pin: 6, knob: 5, knobDistance: 56, hit: 11 } as const;

export type GuidePeers = SymmetryStateView & {
    activeTool?: string;
    isPageSwitching?: boolean;
    currentPageId?: string | null;
    symmetryPanelOpen: boolean;
};

/** Should the guide show? (also used by the pointer: handles are draggable only while shown) */
export const guideVisible = (s: GuidePeers): boolean =>
    !!s.canvas &&
    !s.isPageSwitching &&
    (DRAW_TOOLS.includes(s.activeTool ?? '') || s.symmetryPanelOpen) &&
    ((s.symmetry ?? 'none') !== 'none' || (s.symmetryPanelOpen && s.symmetrySource === 'pin'));

/** The handles in scene coordinates: what the pointer can grab. */
export function guideHandles(s: GuidePeers): {
    center: Pt | null;
    pins: { id: string; at: Pt }[];
    knob: { id: string; at: Pt } | null;
} {
    const frame = symmetryFrameOf(s);
    const k = s.canvas ? screenScale(s.canvas) : 1;
    const pins = s.symmetryPins.map((p) => ({ id: p.id, at: { x: p.x, y: p.y } }));
    const active =
        s.symmetrySource === 'pin' && s.symmetryPins.find((p) => p.id === s.symmetryPinId);
    const knob = active
        ? (() => {
              const d = direction(active.angle);
              const r = HANDLE.knobDistance / k;
              return { id: active.id, at: { x: active.x + d.x * r, y: active.y + d.y * r } };
          })()
        : null;
    const center = s.symmetrySource === 'pin' ? null : (frame?.center ?? null);
    return { center, pins, knob };
}

const circle = (c: Pt, r: number) =>
    `M ${c.x - r} ${c.y} A ${r} ${r} 0 1 0 ${c.x + r} ${c.y} A ${r} ${r} 0 1 0 ${c.x - r} ${c.y} Z`;
const diamond = (c: Pt, r: number) =>
    `M ${c.x} ${c.y - r} L ${c.x + r} ${c.y} L ${c.x} ${c.y + r} L ${c.x - r} ${c.y} Z`;

function handlesPath(s: GuidePeers, k: number): string {
    const h = guideHandles(s);
    const parts: string[] = [];
    if (h.center) {
        const r = HANDLE.center / k;
        parts.push(circle(h.center, r));
        parts.push(
            `M ${h.center.x - r * 1.6} ${h.center.y} L ${h.center.x + r * 1.6} ${h.center.y}`,
        );
        parts.push(
            `M ${h.center.x} ${h.center.y - r * 1.6} L ${h.center.x} ${h.center.y + r * 1.6}`,
        );
    }
    for (const p of h.pins) parts.push(diamond(p.at, HANDLE.pin / k));
    if (h.knob) {
        const pin = h.pins.find((p) => p.id === h.knob?.id);
        if (pin) parts.push(`M ${pin.at.x} ${pin.at.y} L ${h.knob.at.x} ${h.knob.at.y}`);
        parts.push(circle(h.knob.at, HANDLE.knob / k));
    }
    return parts.join(' ');
}

const flag = (o: fabric.FabricObject) => {
    Object.assign(o, {
        [GUIDE]: true,
        _isHelper: true,
        excludeFromLayers: true,
        excludeFromSnap: true,
    });
    return o;
};

const helperProps = {
    originX: 'left' as const,
    originY: 'top' as const,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    objectCaching: false,
};

/** Keeps one guide in sync with the store; `sync` is cheap when nothing changed. */
export function createSymmetryGuide(peers: () => GuidePeers) {
    let key = '';
    const remove = (canvas?: fabric.Canvas | null) => {
        key = '';
        if (!canvas) return;
        const old = canvas
            .getObjects()
            .filter((o) => (o as unknown as Record<string, unknown>)[GUIDE]);
        if (old.length) canvas.remove(...old);
    };
    const sync = () => {
        const s = peers();
        const canvas = s.canvas;
        if (!canvas || s.isPageSwitching) return;
        if (!guideVisible(s)) return remove(canvas);
        const frame = symmetryFrameOf(s);
        if (!frame) return remove(canvas);
        const k = screenScale(canvas);
        const nextKey = JSON.stringify([
            s.symmetry,
            frame,
            s.symmetryAngle,
            s.symmetryCount,
            s.symmetryOptions,
            s.symmetryChain,
            s.symmetryPins,
            s.symmetryPinId,
            s.symmetryCurveId,
            s.symmetry === 'curve'
                ? findObjectById(canvas, s.symmetryCurveId ?? null)?.calcTransformMatrix()
                : null,
            k,
            s.currentPageId,
        ]);
        const present = canvas
            .getObjects()
            .some((o) => (o as unknown as Record<string, unknown>)[GUIDE]);
        if (nextKey === key && present) return;
        remove(canvas);
        const r = Math.hypot(canvas.getWidth(), canvas.getHeight()) / Math.max(k, 1e-6);
        const lines = symmetryGuides(
            s.symmetry ?? 'none',
            frame.center,
            s.symmetryAngle,
            s.symmetryCount,
            r,
            {
                ...s.symmetryOptions,
                rotation: frame.rotation,
                chain: s.symmetryChain,
                pinCenter: (id) => s.symmetryPins.find((p) => p.id === id) ?? null,
            },
        );
        if (s.symmetry === 'curve') {
            // the curve axis itself, drawn over the chosen path
            const poly = curvePolyline(findObjectById(canvas, s.symmetryCurveId ?? null));
            if (poly)
                for (let i = 0; i < poly.length - 1; i++)
                    lines.push({ a: poly[i], b: poly[i + 1] });
        }
        const objects: fabric.FabricObject[] = [];
        if (lines.length)
            objects.push(
                flag(
                    new fabric.Path(
                        lines.map(({ a, b }) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`).join(' '),
                        {
                            ...helperProps,
                            fill: null,
                            stroke: 'rgba(37, 99, 235, 0.55)',
                            strokeWidth: 1 / k,
                            strokeDashArray: [6 / k, 5 / k],
                        },
                    ),
                ),
            );
        const handles = handlesPath(s, k);
        if (handles)
            objects.push(
                flag(
                    new fabric.Path(handles, {
                        ...helperProps,
                        fill: 'rgba(255, 255, 255, 0.85)',
                        stroke: 'rgba(37, 99, 235, 0.95)',
                        strokeWidth: 1.5 / k,
                    }),
                ),
            );
        if (!objects.length) return;
        canvas.add(...objects);
        key = nextKey;
        canvas.requestRenderAll();
    };
    return { sync, remove };
}
