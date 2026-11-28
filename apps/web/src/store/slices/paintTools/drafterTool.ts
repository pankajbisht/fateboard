/**
 * Geometry tool › Drafter: a drafting machine on the board. Drag from a point: the line snaps to the protractor
 * head's steps (Alt = free), parallel / perpendicular lock to the reference line (the selected line when the
 * tool starts, then the last line drawn), starts snap to line ends nearby, and the head shows the length
 * (document unit) and the angle (counter-clockwise, like a protractor) while you drag. Lines use ISO technical
 * pen widths; "dimension" adds a measured dimension line, "construction" a light dashed guide line. The pointer
 * flow (shared by every instrument) is ./geometryTool.ts.
 */
import * as fabric from 'fabric';
import { dimensionGeometry, formatLength, mmToPx, protractorAngle } from '@/lib/canvas/drafter';
import type { Unit } from '@/lib/units';
import { withSceneContext } from '../drawingTools/shared';
import type { GeometryStyle } from './paintToolStyles';

type Pt = { x: number; y: number };
type Obj = fabric.FabricObject & Record<string, unknown>;
export const CONSTRUCTION = '#0ea5e9';

const seg = (p: Pt, q: Pt) => `M ${p.x} ${p.y} L ${q.x} ${q.y}`;

/** The two ends (scene) of a straight two-point path or a Line, else null. */
export function lineEnds(o: Obj): [Pt, Pt] | null {
    const m = o.calcTransformMatrix();
    const type = String(o.type || '').toLowerCase();
    if (type === 'line') {
        const pts = (o as unknown as fabric.Line).calcLinePoints();
        return [
            new fabric.Point(pts.x1, pts.y1).transform(m),
            new fabric.Point(pts.x2, pts.y2).transform(m),
        ];
    }
    if (type !== 'path') return null;
    const cmds = ((o as unknown as fabric.Path).path ?? []).filter(
        (c) => String(c[0]).toUpperCase() !== 'Z',
    );
    if (cmds.length !== 2 || cmds[1][0] !== 'L') return null;
    const off = (o.pathOffset as Pt | undefined) ?? { x: 0, y: 0 };
    const at = (c: (string | number)[]) =>
        new fabric.Point(Number(c[1]) - off.x, Number(c[2]) - off.y).transform(m);
    return [at(cmds[0]), at(cmds[1])];
}

/** The object(s) a drafter stroke from a to b makes, in scene units. */
export function drafterObject(
    a: Pt,
    b: Pt,
    style: Pick<GeometryStyle, 'mode' | 'penMm'>,
    color: string,
    unit: Unit,
): fabric.FabricObject {
    const common = { originX: 'left', originY: 'top', fill: null, strokeLineCap: 'round' } as const;
    if (style.mode === 'dimension') {
        const arrow = mmToPx(3);
        const g = dimensionGeometry(a, b, mmToPx(7), arrow);
        const lines = new fabric.Path(
            [...g.extensions, g.line].map(([p, q]) => seg(p, q)).join(' '),
            {
                ...common,
                stroke: color,
                strokeWidth: mmToPx(0.25),
            },
        );
        const heads = new fabric.Path(
            g.heads
                .map((h) => `M ${h[0].x} ${h[0].y} L ${h[1].x} ${h[1].y} L ${h[2].x} ${h[2].y} Z`)
                .join(' '),
            { ...common, fill: color, stroke: null, strokeWidth: 0 },
        );
        const text = new fabric.FabricText(formatLength(Math.hypot(b.x - a.x, b.y - a.y), unit), {
            left: g.label.x,
            top: g.label.y,
            originX: 'center',
            originY: 'center',
            angle: g.labelAngle,
            fontSize: mmToPx(3.5),
            fontFamily: 'Inter, Arial, sans-serif',
            fill: color,
        });
        const group = new fabric.Group([lines, heads, text], { originX: 'left', originY: 'top' });
        (group as unknown as Obj).name = 'Dimension';
        return group;
    }
    const construction = style.mode === 'construction';
    const line = new fabric.Path(seg(a, b), {
        ...common,
        stroke: construction ? CONSTRUCTION : color,
        strokeWidth: mmToPx(construction ? 0.18 : style.penMm),
        strokeDashArray: construction ? [mmToPx(2), mmToPx(1.2)] : null,
    });
    (line as unknown as Obj).name = construction ? 'Construction line' : 'Line';
    return line;
}

/** What the overlays read while a stroke is drawn. */
export type OverlayDeps = {
    color: () => string;
    unit: () => Unit;
    screen: () => number;
};

/** Paints the protractor head, the preview line and the reading on the top canvas. */
export function paintHead(
    canvas: fabric.Canvas,
    a: Pt,
    b: Pt,
    angle: number,
    length: number,
    style: GeometryStyle,
    deps: OverlayDeps,
) {
    withSceneContext(canvas, (ctx) => {
        const k = 1 / Math.max(deps.screen(), 1e-6);
        const t = (style.base * Math.PI) / 180;
        const R = 120 * k;
        ctx.lineWidth = k;
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.8)';
        ctx.fillStyle = 'rgba(37, 99, 235, 0.06)';
        // the head: two square blades along the base angle and a protractor arc with step ticks
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.arc(a.x, a.y, R * 0.55, t - Math.PI / 2, t, false);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        for (const d of [t, t - Math.PI / 2]) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(a.x + Math.cos(d) * R, a.y + Math.sin(d) * R);
            for (let i = 1; i <= 12; i++) {
                const r = (R * i) / 12;
                const tick = (i % 4 === 0 ? 6 : 3) * k;
                const px = a.x + Math.cos(d) * r;
                const py = a.y + Math.sin(d) * r;
                ctx.moveTo(px, py);
                ctx.lineTo(
                    px + Math.cos(d + Math.PI / 2) * tick,
                    py + Math.sin(d + Math.PI / 2) * tick,
                );
            }
        }
        for (let deg = 0; deg <= 90; deg += style.step) {
            const d = t - (deg * Math.PI) / 180;
            ctx.moveTo(a.x + Math.cos(d) * R * 0.5, a.y + Math.sin(d) * R * 0.5);
            ctx.lineTo(a.x + Math.cos(d) * R * 0.55, a.y + Math.sin(d) * R * 0.55);
        }
        ctx.stroke();
        // the line being drawn
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineWidth = Math.max(mmToPx(style.penMm), k);
        ctx.strokeStyle = style.mode === 'construction' ? CONSTRUCTION : deps.color();
        ctx.setLineDash(style.mode === 'construction' ? [6 * k, 4 * k] : []);
        ctx.stroke();
        ctx.setLineDash([]);
        // the reading
        const text = `${formatLength(length, deps.unit())} · ${protractorAngle(angle).toFixed(1)}°`;
        ctx.font = `${12 * k}px Inter, Arial, sans-serif`;
        const w = ctx.measureText(text).width + 10 * k;
        const x = b.x + 12 * k;
        const y = b.y + 12 * k;
        ctx.fillStyle = 'rgba(15, 23, 38, 0.85)';
        ctx.fillRect(x, y, w, 18 * k);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x + 5 * k, y + 13 * k);
    });
}
