import { BRAND } from '@/lib/theme';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { cssToken, useThemeVersion } from '@hooks/useThemeVersion';
export const RULER_SIZE = 20;

import { PX_PER_UNIT as UNIT_PX, type Unit } from '@/lib/units';

/** Same units / conversion as the size fields (`lib/units`, BUG-082). */
export type RulerUnit = Unit;
export const PX_PER_UNIT = UNIT_PX;

export type RulerTick = { u: number; size: number; label?: string };

/** Pointer inside the board viewport (CSS px from its top-left), or null when outside. */
export type PointerPos = { x: number; y: number } | null;

export interface PointerSource {
    get: () => PointerPos;
    subscribe: (listener: () => void) => () => void;
}

/**
 * A tiny pointer store shared by the board and its rulers. Mouse moves update it outside React
 * state, so only the two ruler markers re-render (not the board, not the ruler ticks).
 */
export function createPointerSource(): PointerSource & { set: (pos: PointerPos) => void } {
    let current: PointerPos = null;
    const listeners = new Set<() => void>();
    return {
        get: () => current,
        set: (pos) => {
            if (pos === current || (pos && current && pos.x === current.x && pos.y === current.y))
                return;
            current = pos;
            listeners.forEach((listener) => listener());
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

const NO_POINTER: PointerSource = { get: () => null, subscribe: () => () => {} };

/**
 * Ticks for one ruler: positions along the ruler (screen px), tick length, and a label on the
 * major ones. Values are in `unit`; labels stay >= ~70 screen px apart at any zoom.
 */
export function rulerTicks({
    length,
    origin,
    scale,
    unit = 'px',
}: {
    length: number;
    origin: number;
    scale: number;
    unit?: RulerUnit;
}): RulerTick[] {
    const pxPerUnit = PX_PER_UNIT[unit] ?? 1;
    const screenPerUnit = scale * pxPerUnit; // screen px per 1 unit
    if (!(screenPerUnit > 0) || length <= 0) return [];

    const step = niceStep(70 / screenPerUnit); // a label at least ~70px apart
    let minor = step / 10;
    if (minor * screenPerUnit < 5) minor = step / 5;
    if (minor * screenPerUnit < 5) minor = step / 2;

    const first = Math.floor(-origin / screenPerUnit / minor);
    const last = Math.ceil((length - origin) / screenPerUnit / minor);
    const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));

    const ticks: RulerTick[] = [];
    for (let i = first; i <= last; i++) {
        const value = Math.round(i * minor * 1e6) / 1e6;
        const u = origin + value * screenPerUnit;
        if (u < -1 || u > length + 1) continue;
        const r = value / step;
        const isMajor = near(r, Math.round(r));
        const isMid = near(r * 2, Math.round(r * 2));
        ticks.push({
            u,
            size: isMajor ? 11 : isMid ? 7 : 4,
            label: isMajor ? String(Number(value.toFixed(decimals))) : undefined,
        });
    }
    return ticks;
}

/** Ruler colors from the theme tokens (light + dark). Fallbacks only matter without CSS (tests). */
export function rulerColors() {
    return {
        bg: cssToken('--color-surface-muted', 'whitesmoke'),
        page: cssToken('--color-surface', 'white'),
        border: cssToken('--color-line-strong', 'silver'),
        tick: cssToken('--color-ink-subtle', 'gray'),
        text: cssToken('--color-ink-muted', 'dimgray'),
    };
}

type RulerProps = {
    orientation: 'horizontal' | 'vertical';
    /** On-screen length of the ruler in px (width for horizontal, height for vertical). */
    length: number;
    /** Screen px, measured from the ruler's start, where DOCUMENT 0 sits (the canvas corner). */
    origin: number;
    /** Screen px per document px (the fit scale). */
    scale: number;
    /** Label unit (Settings > Units). Default px. */
    unit?: RulerUnit;
    /** Document size along this axis (e.g. 1280): the page range is drawn white. */
    extent: number;
    /**
     * Pointer in board-viewport px. The rulers line up with the viewport, so the marker sits at the
     * pointer's x (horizontal) or y (vertical) directly.
     */
    pointer?: PointerSource;
};

/** 1 / 2 / 5 x 10^n: the first "nice" step that is >= min. */
function niceStep(min: number) {
    const safe = Math.max(min, 1e-6);
    const pow = Math.pow(10, Math.floor(Math.log10(safe)));
    for (const m of [1, 2, 5, 10]) {
        if (m * pow >= safe) return m * pow;
    }
    return 10 * pow;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export function Ruler({
    orientation,
    length,
    origin,
    scale,
    extent,
    pointer = NO_POINTER,
    unit = 'px',
}: RulerProps) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const themeVersion = useThemeVersion(); // repaint when light / dark switches

    useEffect(() => {
        const cv = ref.current;
        if (!cv || length <= 0 || scale <= 0) return;

        const horizontal = orientation === 'horizontal';
        const dpr = window.devicePixelRatio || 1;
        const w = horizontal ? length : RULER_SIZE;
        const h = horizontal ? RULER_SIZE : length;

        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        cv.style.width = `${w}px`;
        cv.style.height = `${h}px`;

        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const { bg: BG, page: PAGE, border: BORDER, tick: TICK, text: TEXT } = rulerColors();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // u = position along the ruler, v = distance across it (RULER_SIZE = edge next to canvas)
        const line = (u: number, v1: number, v2: number) => {
            const p = Math.round(u) + 0.5;
            ctx.beginPath();
            if (horizontal) {
                ctx.moveTo(p, v1);
                ctx.lineTo(p, v2);
            } else {
                ctx.moveTo(v1, p);
                ctx.lineTo(v2, p);
            }
            ctx.stroke();
        };

        // background + the white strip that covers the page (0 .. extent)
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, w, h);

        const pageStart = origin;
        const pageEnd = origin + extent * scale;
        ctx.fillStyle = PAGE;
        if (horizontal) ctx.fillRect(pageStart, 0, pageEnd - pageStart, h);
        else ctx.fillRect(0, pageStart, w, pageEnd - pageStart);

        // ticks and labels
        ctx.strokeStyle = TICK;
        ctx.lineWidth = 1;
        ctx.fillStyle = TEXT;
        ctx.font = '9px system-ui, sans-serif';

        for (const t of rulerTicks({ length, origin, scale, unit })) {
            line(t.u, RULER_SIZE, RULER_SIZE - t.size);
            if (!t.label) continue;
            // a label cut off at the ruler's end reads as a wrong number ("3" for 350): skip it
            if (Math.round(t.u) + 3 + ctx.measureText(t.label).width > length) continue;
            if (horizontal) {
                ctx.fillText(t.label, Math.round(t.u) + 3, 8);
            } else {
                ctx.save();
                ctx.translate(1, Math.round(t.u) + 3);
                ctx.rotate(Math.PI / 2); // reads top-to-bottom
                ctx.fillText(t.label, 0, 0);
                ctx.restore();
            }
        }

        // border on the edge that touches the canvas area
        ctx.strokeStyle = BORDER;
        ctx.beginPath();
        if (horizontal) {
            ctx.moveTo(0, h - 0.5);
            ctx.lineTo(w, h - 0.5);
        } else {
            ctx.moveTo(w - 0.5, 0);
            ctx.lineTo(w - 0.5, h);
        }
        ctx.stroke();
        // the pointer marker is a separate element (RulerMarker): ticks only redraw on geometry change
    }, [orientation, length, origin, scale, extent, unit, themeVersion]);

    return (
        <div className="relative shrink-0">
            <canvas ref={ref} className="block" aria-hidden="true" />
            <RulerMarker orientation={orientation} length={length} pointer={pointer} />
        </div>
    );
}

/** 1 px brand line at the pointer; the only part of the ruler that changes on mouse move. */
function RulerMarker({
    orientation,
    length,
    pointer,
}: {
    orientation: RulerProps['orientation'];
    length: number;
    pointer: PointerSource;
}) {
    const pos = useSyncExternalStore(pointer.subscribe, pointer.get, pointer.get);
    const horizontal = orientation === 'horizontal';
    const value = pos ? Math.round(horizontal ? pos.x : pos.y) : NaN;
    if (!Number.isFinite(value) || value < 0 || value > length) return null;

    return (
        <div
            aria-hidden="true"
            data-testid={`ruler-marker-${orientation}`}
            className="pointer-events-none absolute left-0 top-0"
            style={{
                width: horizontal ? 1 : RULER_SIZE,
                height: horizontal ? RULER_SIZE : 1,
                transform: horizontal ? `translateX(${value}px)` : `translateY(${value}px)`,
                backgroundColor: `var(--color-primary-500, ${BRAND.primary})`, // follows the color theme
            }}
        />
    );
}

export default Ruler;
