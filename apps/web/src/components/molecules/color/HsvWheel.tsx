import { useState } from 'react';
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv, type HSV } from '@/lib/colorMath';
import { harmonyColors, type HarmonyId } from '@/lib/colorHarmony';
import {
    hueFromKey,
    hueFromPoint,
    inscribedSquare,
    onRing,
    pointFromHue,
    svFromKey,
} from '@/lib/colorWheel';
import { Chip } from '../../atoms/Chip';
import { SLIDER_FOCUS, THUMB, useHsvDrag } from './hsvDrag';

/** Ring thickness as a fraction of the wheel radius, and the gap between the ring and the square. */
const RING = 0.17;
const GAP = 0.05;
/** Side of the S / V square as a percentage of the wheel's width. */
const SQUARE_PCT = (inscribedSquare(1 - RING - GAP) / 2) * 100;
const HUES = 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
const RING_MASK = `radial-gradient(closest-side, transparent ${(1 - RING) * 100}%, #000 ${(1 - RING) * 100 + 1}%)`;

const hueOf = (hex: string) => rgbToHsv(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }).h;

type Scheme = 'none' | Exclude<HarmonyId, 'monochromatic'>;
const SCHEMES: { id: Scheme; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'complementary', label: 'Complement' },
    { id: 'analogous', label: 'Analogous' },
    { id: 'triadic', label: 'Triad' },
    { id: 'split-complementary', label: 'Split' },
];

type Props = {
    hsv: HSV;
    hex: string;
    onPreview: (next: HSV) => void;
    onCommit: (next: HSV) => void;
    /** A harmony point was clicked. */
    onPickHex: (hex: string) => void;
};

/**
 * Custom colour "Wheel" view: hue ring (clockwise from red at the top), the saturation / brightness square
 * inside it, and the chosen harmony's colours as points on the ring joined by lines (click one to use it).
 */
export function HsvWheel({ hsv, hex, onPreview, onCommit, onPickHex }: Props) {
    const drag = useHsvDrag(onPreview, onCommit);
    const [scheme, setScheme] = useState<Scheme>('complementary');
    const pureHue = rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 }));
    const mid = (1 - RING / 2) * 50; // ring centre line, % of the width from the middle
    const at = (h: number) => pointFromHue(h, mid);
    const thumb = at(hsv.h);
    const others =
        scheme === 'none'
            ? []
            : harmonyColors(hex, scheme)
                  .filter((c) => c !== hex)
                  .map((c) => ({ color: c, ...at(hueOf(c)) }));

    return (
        <>
            <div
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
                {...drag(({ dx, dy, w }) => {
                    const r = w / 2;
                    return onRing(dx, dy, r * (1 - RING - GAP / 2), r)
                        ? { ...hsv, h: hueFromPoint(dx, dy) }
                        : null;
                })}
                className={`relative mx-auto aspect-square w-full max-w-[220px] cursor-pointer rounded-full ${SLIDER_FOCUS}`}
            >
                <div
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{ background: HUES, maskImage: RING_MASK, WebkitMaskImage: RING_MASK }}
                />
                <svg
                    aria-hidden
                    viewBox="-50 -50 100 100"
                    className="pointer-events-none absolute inset-0 size-full"
                >
                    {others.map((o) => (
                        <line
                            key={o.color}
                            x1={thumb.x}
                            y1={thumb.y}
                            x2={o.x}
                            y2={o.y}
                            stroke="currentColor"
                            strokeWidth={0.6}
                            className="text-ink-muted"
                        />
                    ))}
                </svg>
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
                    <span
                        aria-hidden
                        className={THUMB}
                        style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hex }}
                    />
                </div>
                {others.map((o) => (
                    <button
                        key={o.color}
                        type="button"
                        aria-label={`Use harmony color ${o.color}`}
                        title={o.color}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onPickHex(o.color)}
                        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                        style={{
                            left: `${50 + o.x}%`,
                            top: `${50 + o.y}%`,
                            backgroundColor: o.color,
                        }}
                    />
                ))}
                <span
                    aria-hidden
                    className={THUMB}
                    style={{
                        left: `${50 + thumb.x}%`,
                        top: `${50 + thumb.y}%`,
                        backgroundColor: pureHue,
                    }}
                />
            </div>

            <div
                className="mt-2 flex flex-wrap gap-1"
                role="group"
                aria-label="Harmony on the wheel"
            >
                {SCHEMES.map((s) => (
                    <Chip key={s.id} active={scheme === s.id} onClick={() => setScheme(s.id)}>
                        {s.label}
                    </Chip>
                ))}
            </div>
        </>
    );
}
