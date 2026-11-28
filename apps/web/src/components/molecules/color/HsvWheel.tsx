import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { hsvToRgb, rgbToHex, type HSV } from '@/lib/colorMath';
import { isToneHarmony } from '@/lib/colorHarmony';
import {
    hueFromKey,
    hueFromPoint,
    inscribedSquare,
    onRing,
    pointFromHue,
    svFromKey,
} from '@/lib/colorWheel';
import { HarmonyPicker } from './HarmonyPicker';
import { SLIDER_FOCUS, THUMB, useHsvDrag } from './hsvDrag';
import {
    outline,
    ringPoints,
    signedTurn,
    tonePoints,
    wheelTurns,
    type WheelHarmony,
} from './wheelHarmony';

/** Ring thickness as a fraction of the wheel radius, and the gap between the ring and the square. */
const RING = 0.22;
const GAP = 0.1;
/** Side of the S / V square as a percentage of the wheel's width. */
const SQUARE_PCT = (inscribedSquare(1 - RING - GAP) / 2) * 100;
const HUES = 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
const INNER = (1 - RING) * 100;
const RING_MASK = `radial-gradient(closest-side, transparent ${INNER - 0.5}%, #000 ${INNER + 0.5}%, #000 99%, transparent 100%)`;

/** Harmony handle: colour inside a white ring with a dark outline (reads on any hue, light or dark UI). */
const HANDLE =
    'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1.5px_#18181b,0_1px_3px_rgba(0,0,0,0.35)]';
const DOT = `${HANDLE} outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 motion-reduce:transition-none`;
/** Bold harmony line: dark 2 px stroke on a light 3.5 px halo (pixel widths at any wheel size). */
const LINE = { halo: '#ffffff', ink: '#18181b' };

type Props = {
    hsv: HSV;
    hex: string;
    onPreview: (next: HSV) => void;
    onCommit: (next: HSV) => void;
    /** A harmony point was clicked. */
    onPickHex: (hex: string) => void;
    /** Harmony drawn on the wheel (kept by the popover, so it survives a Square / Wheel switch). */
    harmony: WheelHarmony;
    onHarmony: (next: WheelHarmony) => void;
};

/** Halo + ink path through `pts` (viewBox units). */
function Line({ pts, closed }: { pts: string; closed: boolean }) {
    const Shape = closed ? 'polygon' : 'polyline';
    const common = {
        points: pts,
        fill: 'none',
        strokeLinejoin: 'round' as const,
        strokeLinecap: 'round' as const,
        vectorEffect: 'non-scaling-stroke' as const,
    };
    return (
        <>
            <Shape {...common} stroke={LINE.halo} strokeOpacity={0.85} strokeWidth={3.5} />
            <Shape {...common} stroke={LINE.ink} strokeWidth={2} />
        </>
    );
}

/**
 * Custom colour "Wheel" view: hue ring (clockwise from red at the top), the saturation / brightness square
 * inside it, and the chosen harmony: hue schemes as points on the ring joined by a bold outline, tone
 * schemes (Shades, Monochromatic) as points on the square. Click a point to use its colour; drag a ring
 * point to turn it (that makes the harmony Custom).
 */
export function HsvWheel({ hsv, hex, onPreview, onCommit, onPickHex, harmony, onHarmony }: Props) {
    const drag = useHsvDrag(onPreview, onCommit);
    const ring = useRef<HTMLDivElement | null>(null);
    const dot = useRef<{ index: number; x: number; y: number; moved: boolean } | null>(null);
    const suppressClick = useRef(false);

    const pureHue = rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 }));
    const mid = (1 - RING / 2) * 50; // ring centre line, % of the width from the middle
    const at = (h: number) => pointFromHue(h, mid);
    const thumb = at(hsv.h);
    const turns = wheelTurns(harmony);
    const scheme = harmony.scheme;
    const tones = scheme !== 'custom' && isToneHarmony(scheme) ? tonePoints(hex, scheme) : [];
    const onRingPts = turns ? ringPoints(hsv, hex, turns) : [];
    const path = outline(onRingPts, harmony.scheme);
    const ringLine = path.points.map((p) => at(p.h)).map((p) => `${p.x},${p.y}`);
    const toneLine = tones.map((t) => `${t.s},${100 - t.v}`).join(' ');

    const turnDot = (e: ReactPointerEvent, index: number) => {
        const r = ring.current?.getBoundingClientRect();
        if (!r || !turns) return;
        const h = hueFromPoint(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
        const custom = [...turns];
        custom[index] = signedTurn(h - hsv.h);
        onHarmony({ scheme: 'custom', custom });
    };

    return (
        <>
            <div
                ref={ring}
                role="slider"
                tabIndex={0}
                aria-label="Hue wheel"
                aria-valuemin={0}
                aria-valuemax={359}
                aria-valuenow={Math.round(hsv.h) % 360}
                aria-valuetext={`${Math.round(hsv.h) % 360}°`}
                onKeyDown={(e) => {
                    const next = hueFromKey(hsv, e.key, e.shiftKey, true);
                    if (!next) return;
                    e.preventDefault();
                    onCommit(next);
                }}
                {...drag(({ dx, dy, w, start }) => {
                    const r = w / 2;
                    // a press must land on the ring; once dragging, follow the angle anywhere
                    if (start && !onRing(dx, dy, r * (1 - RING - GAP / 2), r)) return null;
                    return { ...hsv, h: hueFromPoint(dx, dy) };
                })}
                className={`relative mx-auto aspect-square w-full max-w-[264px] cursor-pointer rounded-full ${SLIDER_FOCUS}`}
            >
                <div
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{ background: HUES, maskImage: RING_MASK, WebkitMaskImage: RING_MASK }}
                />
                {/* under the square: the lines show around it, the square stays clear */}
                {ringLine.length > 1 && (
                    <svg
                        aria-hidden
                        viewBox="-50 -50 100 100"
                        className="pointer-events-none absolute inset-0 size-full overflow-visible"
                    >
                        <Line pts={ringLine.join(' ')} closed={path.closed} />
                    </svg>
                )}
                <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Saturation and brightness"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(hsv.s)}
                    aria-valuetext={`Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`}
                    onKeyDown={(e) => {
                        e.stopPropagation(); // the ring's own arrows must not also run
                        const next = svFromKey(hsv, e.key, e.shiftKey);
                        if (!next) return;
                        e.preventDefault();
                        onCommit(next);
                    }}
                    {...drag(({ x, y }) => ({ ...hsv, s: x * 100, v: (1 - y) * 100 }))}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-sm ${SLIDER_FOCUS}`}
                    style={{
                        width: `${SQUARE_PCT}%`,
                        height: `${SQUARE_PCT}%`,
                        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${pureHue}`,
                    }}
                >
                    {tones.length > 1 && (
                        <svg
                            aria-hidden
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            className="pointer-events-none absolute inset-0 size-full overflow-visible"
                        >
                            <Line pts={toneLine} closed={false} />
                        </svg>
                    )}
                    {tones
                        .filter((t) => !t.base)
                        .map((t) => (
                            <button
                                key={t.index}
                                type="button"
                                aria-label={`Use harmony color ${t.color}`}
                                title={t.color}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => onPickHex(t.color)}
                                className={`${DOT} size-4 cursor-pointer`}
                                style={{
                                    left: `${t.s}%`,
                                    top: `${100 - t.v}%`,
                                    backgroundColor: t.color,
                                }}
                            />
                        ))}
                    <span
                        aria-hidden
                        className={tones.length ? `${HANDLE} pointer-events-none size-5` : THUMB}
                        style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hex }}
                    />
                </div>
                {onRingPts
                    .filter((p) => p.turn !== 0)
                    .map((p) => {
                        const pos = at(p.h);
                        return (
                            <button
                                key={p.index}
                                type="button"
                                aria-label={`Use harmony color ${p.color}`}
                                title={`${p.color} (drag to turn)`}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    if (e.button !== 0) return;
                                    e.currentTarget.setPointerCapture?.(e.pointerId);
                                    dot.current = {
                                        index: p.index,
                                        x: e.clientX,
                                        y: e.clientY,
                                        moved: false,
                                    };
                                }}
                                onPointerMove={(e) => {
                                    const d = dot.current;
                                    if (!d || !e.currentTarget.hasPointerCapture?.(e.pointerId))
                                        return;
                                    if (
                                        !d.moved &&
                                        Math.hypot(e.clientX - d.x, e.clientY - d.y) < 3
                                    )
                                        return;
                                    d.moved = true;
                                    turnDot(e, d.index);
                                }}
                                onLostPointerCapture={() => {
                                    suppressClick.current = !!dot.current?.moved;
                                    dot.current = null;
                                    setTimeout(() => (suppressClick.current = false), 0);
                                }}
                                onClick={() => {
                                    if (suppressClick.current) return;
                                    onPickHex(p.color);
                                }}
                                className={`${DOT} size-[18px] cursor-grab active:cursor-grabbing`}
                                style={{
                                    left: `${50 + pos.x}%`,
                                    top: `${50 + pos.y}%`,
                                    backgroundColor: p.color,
                                }}
                            />
                        );
                    })}
                <span
                    aria-hidden
                    className={`${HANDLE} pointer-events-none size-5`}
                    style={{
                        left: `${50 + thumb.x}%`,
                        top: `${50 + thumb.y}%`,
                        backgroundColor: pureHue,
                    }}
                />
            </div>

            <HarmonyPicker
                value={harmony.scheme}
                onChange={(scheme) => onHarmony({ ...harmony, scheme })}
            />
        </>
    );
}
