/**
 * Geometry tool overlays: the instrument drawn on the top canvas while a stroke is in progress (never part of
 * the document). The Drafter's head is `paintHead` in ./drafterTool.ts; this file draws the Scale (a ruler with
 * mm ticks and cm numbers), the Set square, the Protractor and the Compass, each with the reading beside the
 * pointer. One call per animation frame (./geometryTool.ts schedules it).
 */
import type * as fabric from 'fabric';
import { angleOf, formatLength, mmToPx, protractorAngle } from '@/lib/canvas/drafter';
import { angleArcRadius, rayPoint, setSquareCorners } from '@/lib/canvas/geometry';
import { withSceneContext } from '../drawingTools/shared';
import type { OverlayDeps } from './drafterTool';
import type { GeometryStyle } from './paintToolStyles';

type Pt = { x: number; y: number };
type Ctx = CanvasRenderingContext2D;

/** The stroke so far: fixed points plus the live one; `sweep` for the Protractor's / Compass's second arm. */
export type GeometryPreview = { points: Pt[]; sweep: number };

const INSTRUMENT = 'rgba(37, 99, 235, 0.8)';
const INSTRUMENT_FILL = 'rgba(37, 99, 235, 0.06)';
const rad = (deg: number) => (deg * Math.PI) / 180;
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/** The dark reading label next to the pointer. */
function reading(ctx: Ctx, at: Pt, text: string, k: number) {
    ctx.font = `${12 * k}px Inter, Arial, sans-serif`;
    const w = ctx.measureText(text).width + 10 * k;
    const x = at.x + 12 * k;
    const y = at.y + 12 * k;
    ctx.fillStyle = 'rgba(15, 23, 38, 0.85)';
    ctx.fillRect(x, y, w, 18 * k);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + 5 * k, y + 13 * k);
}

function penLine(ctx: Ctx, a: Pt, b: Pt, style: GeometryStyle, deps: OverlayDeps, k: number) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = Math.max(mmToPx(style.penMm), k);
    ctx.strokeStyle = deps.color();
    ctx.stroke();
}

const instrumentPen = (ctx: Ctx, k: number) => {
    ctx.lineWidth = k;
    ctx.strokeStyle = INSTRUMENT;
    ctx.fillStyle = INSTRUMENT_FILL;
};

/** A ruler along a → b, longer than the line, with mm / 5 mm / cm ticks as the zoom allows. */
function paintScale(ctx: Ctx, a: Pt, b: Pt, k: number) {
    const t = rad(angleOf(a, b));
    const ux = Math.cos(t);
    const uy = Math.sin(t);
    const nx = uy; // the ruler lies on the left of the stroke
    const ny = -ux;
    const mm = mmToPx(1);
    const len = Math.max(dist(a, b) + 20 * mm, 60 * mm);
    const w = 26 * k;
    const at = (s: number, o: number) => ({ x: a.x + ux * s + nx * o, y: a.y + uy * s + ny * o });
    instrumentPen(ctx, k);
    const corners = [at(-4 * mm, 0), at(len, 0), at(len, w), at(-4 * mm, w)];
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const px = mm / k; // screen px per mm
    // ticks at least 4 screen px apart, numbers at least 18 (1 / 5 / 10 / 50 mm; cm / 5 cm / 10 cm)
    const every = [1, 5, 10, 50].find((mmStep) => px * mmStep >= 4) ?? 50;
    const labelEvery = [10, 50, 100].find((mmStep) => px * mmStep >= 18) ?? 100;
    ctx.beginPath();
    ctx.font = `${9 * k}px Inter, Arial, sans-serif`;
    ctx.fillStyle = INSTRUMENT;
    for (let i = 0; i * mm <= len && i <= 2000; i += every) {
        const tick = (i % 10 === 0 ? 10 : i % 5 === 0 ? 7 : 4) * k;
        const p = at(i * mm, 0);
        const q = at(i * mm, tick);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        if (i % labelEvery === 0) {
            const lp = at(i * mm, tick + 9 * k);
            ctx.fillText(String(i / 10), lp.x - 3 * k, lp.y + 3 * k);
        }
    }
    ctx.stroke();
}

/** The set square placed so the edge the line runs along starts at a (legs on the square's axes). */
function paintSetSquare(ctx: Ctx, a: Pt, b: Pt, style: GeometryStyle, k: number) {
    const corners = setSquareCorners(a, angleOf(a, b), style.setSquare, style.base, 120 * k);
    instrumentPen(ctx, k);
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/** A half protractor on the first arm, on the side the angle opens to, with 10° ticks. */
function paintProtractor(ctx: Ctx, v: Pt, arm: Pt, sweep: number, k: number) {
    const R = 100 * k;
    const a0 = angleOf(v, arm);
    const dir = sweep < 0 ? -1 : 1;
    instrumentPen(ctx, k);
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.arc(v.x, v.y, R, rad(a0), rad(a0 + 180 * dir), dir < 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    for (let d = 0; d <= 180; d += 10) {
        const p = rayPoint(v, a0 + d * dir, R);
        const q = rayPoint(v, a0 + d * dir, R - (d % 30 === 0 ? 10 : 5) * k);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
}

/** Two compass legs meeting at a hinge above the middle of centre → pencil. */
function paintCompassLegs(ctx: Ctx, c: Pt, p: Pt, k: number) {
    const r = dist(c, p);
    const mid = { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 };
    const t = rad(angleOf(c, p) - 90);
    const h = Math.min(r * 0.6, 90 * k);
    const hinge = { x: mid.x + Math.cos(t) * h, y: mid.y + Math.sin(t) * h };
    instrumentPen(ctx, k);
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(hinge.x, hinge.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hinge.x, hinge.y, 4 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

/** Paints the instrument and the stroke in progress for Scale, Set square, Protractor and Compass. */
export function paintInstrument(
    canvas: fabric.Canvas,
    style: GeometryStyle,
    deps: OverlayDeps,
    { points, sweep }: GeometryPreview,
) {
    const [a, b, c] = points;
    if (!a || !b) return;
    withSceneContext(canvas, (ctx) => {
        const k = 1 / Math.max(deps.screen(), 1e-6);
        const unit = deps.unit();
        const lineReading = `${formatLength(dist(a, b), unit)} · ${protractorAngle(angleOf(a, b)).toFixed(1)}°`;
        if (style.instrument === 'scale') {
            paintScale(ctx, a, b, k);
            penLine(ctx, a, b, style, deps, k);
            reading(ctx, b, lineReading, k);
        } else if (style.instrument === 'setSquare') {
            paintSetSquare(ctx, a, b, style, k);
            penLine(ctx, a, b, style, deps, k);
            reading(ctx, b, lineReading, k);
        } else if (style.instrument === 'protractor') {
            paintProtractor(ctx, a, b, sweep, k);
            penLine(ctx, a, b, style, deps, k);
            if (!c) return reading(ctx, b, lineReading, k);
            penLine(ctx, a, c, style, deps, k);
            const r = angleArcRadius(dist(a, b), dist(a, c));
            ctx.beginPath();
            ctx.arc(a.x, a.y, r, rad(angleOf(a, b)), rad(angleOf(a, b) + sweep), sweep < 0);
            ctx.strokeStyle = deps.color();
            ctx.lineWidth = Math.max(mmToPx(0.25), k);
            ctx.stroke();
            reading(ctx, c, `${Math.abs(sweep).toFixed(1)}°`, k);
        } else if (style.instrument === 'compass') {
            const r = dist(a, b);
            const tip = c ?? b;
            paintCompassLegs(ctx, a, tip, k);
            ctx.beginPath();
            if (c) ctx.arc(a.x, a.y, r, rad(angleOf(a, b)), rad(angleOf(a, b) + sweep), sweep < 0);
            else ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
            ctx.lineWidth = Math.max(mmToPx(style.penMm), k);
            ctx.strokeStyle = deps.color();
            ctx.setLineDash(style.compass === 'arc' && !c ? [6 * k, 4 * k] : []);
            ctx.stroke();
            ctx.setLineDash([]);
            const text = `r ${formatLength(r, unit)}${c ? ` · ${Math.abs(sweep).toFixed(1)}°` : ''}`;
            reading(ctx, tip, text, k);
        }
    });
}
