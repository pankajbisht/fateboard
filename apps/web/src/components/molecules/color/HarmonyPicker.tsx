import { useState } from 'react';
import { harmonyTurns, isToneHarmony } from '@/lib/colorHarmony';
import { pointFromHue } from '@/lib/colorWheel';
import { WHEEL_SCHEMES, type WheelScheme } from './wheelHarmony';

/** Custom's glyph: three points at free angles. */
const CUSTOM_GLYPH = [0, 75, 200];
const R = 8; // glyph ring radius (viewBox -12 … 12)

/** Tone glyphs: points inside a small square (x, y in -6 … 6). */
const TONE_GLYPH: Record<'shades' | 'monochromatic', [number, number][]> = {
    shades: [
        [2.5, -4],
        [2.5, -1.3],
        [2.5, 1.3],
        [2.5, 4],
    ],
    monochromatic: [
        [-4, -3.5],
        [-1, -3],
        [2, -1],
        [2.5, 2],
        [2.5, 4.5],
    ],
};

/** A tiny drawing of the harmony: the ring (or the S / V square) with its points joined. */
function Glyph({ id }: { id: WheelScheme }) {
    if (id !== 'custom' && isToneHarmony(id)) {
        const pts = TONE_GLYPH[id];
        return (
            <svg viewBox="-12 -12 24 24" className="size-6" aria-hidden>
                <rect
                    x={-8}
                    y={-8}
                    width={16}
                    height={16}
                    rx={2.5}
                    className="fill-none stroke-current opacity-40"
                    strokeWidth={1.5}
                />
                <polyline
                    points={pts.map((p) => p.join(',')).join(' ')}
                    className="fill-none stroke-current"
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                />
                {pts.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={1.5} className="fill-current" />
                ))}
            </svg>
        );
    }
    const turns = id === 'custom' ? CUSTOM_GLYPH : [...harmonyTurns(id)];
    const sorted =
        id === 'analogous'
            ? turns
            : [...turns].sort((a, b) => (((a % 360) + 360) % 360) - (((b % 360) + 360) % 360));
    const pts = sorted.map((t) => pointFromHue(t, R));
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const Shape = id === 'analogous' || pts.length < 3 ? 'polyline' : 'polygon';
    return (
        <svg viewBox="-12 -12 24 24" className="size-6" aria-hidden>
            <circle
                r={R}
                className="fill-none stroke-current opacity-40"
                strokeWidth={1.5}
                strokeDasharray={id === 'custom' ? '2 2' : undefined}
            />
            <Shape
                points={line}
                className="fill-none stroke-current"
                strokeWidth={1.4}
                strokeLinejoin="round"
            />
            {pts.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i === sorted.indexOf(0) ? 2.4 : 1.8}
                    className="fill-current"
                />
            ))}
        </svg>
    );
}

type Props = { value: WheelScheme; onChange: (next: WheelScheme) => void };

/**
 * The wheel's harmony as one row of small glyphs (each draws its own shape), the chosen name above it.
 * Buttons carry the name as their accessible name and tooltip.
 */
export function HarmonyPicker({ value, onChange }: Props) {
    const [hover, setHover] = useState<WheelScheme | null>(null);
    const current = WHEEL_SCHEMES.find((s) => s.id === (hover ?? value));
    return (
        <div className="mt-3">
            <div className="mb-1 flex items-baseline justify-between text-[11px]">
                <span className="text-ink-muted">Harmony</span>
                <span
                    className={`font-medium ${hover && hover !== value ? 'text-ink-muted' : 'text-ink'}`}
                >
                    {current?.label}
                </span>
            </div>
            <div
                role="group"
                aria-label="Harmony on the wheel"
                className="flex justify-between gap-0.5 rounded-md bg-surface-muted p-0.5"
            >
                {WHEEL_SCHEMES.map((s) => {
                    const on = s.id === value;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            aria-label={s.label}
                            aria-pressed={on}
                            title={s.label}
                            onClick={() => onChange(s.id)}
                            onPointerEnter={() => setHover(s.id)}
                            onPointerLeave={() => setHover(null)}
                            className={`grid size-7 place-items-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400 motion-reduce:transition-none ${
                                on
                                    ? 'bg-surface text-primary-ink shadow-sm'
                                    : 'text-ink-muted hover:bg-surface hover:text-ink'
                            }`}
                        >
                            <Glyph id={s.id} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
