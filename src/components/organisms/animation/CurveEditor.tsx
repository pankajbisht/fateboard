import { useRef } from 'react';
import { Select } from '../../atoms/Select';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import {
    EASING_NAMES,
    NAMED_BEZIER,
    easeKeyframe,
    type Bezier,
    type EasingName,
} from '@/animation/engine';
import { EASING_LABELS } from './animation.labels';

interface Props {
    easing: EasingName;
    bezier?: Bezier;
    /** `bezier: null` clears the custom curve and returns to a named easing */
    onChange: (patch: { easing?: EasingName; bezier?: Bezier | null }) => void;
    /** true when several keyframes with different curves are selected */
    mixed?: boolean;
}

const W = 150;
const H = 150;
const PAD = 16;
const Y_MIN = -0.5;
const Y_MAX = 1.5;

const sx = (x: number) => PAD + x * (W - PAD * 2);
const sy = (y: number) => PAD + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD * 2);
const ix = (px: number) => (px - PAD) / (W - PAD * 2);
const iy = (py: number) => Y_MIN + (1 - (py - PAD) / (H - PAD * 2)) * (Y_MAX - Y_MIN);

export default function CurveEditor({ easing, bezier, onChange, mixed }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const dragging = useRef<0 | 1 | null>(null);
    const custom = !!bezier;

    const curve = (() => {
        const pts: string[] = [];
        for (let i = 0; i <= 48; i++) {
            const p = i / 48;
            pts.push(`${sx(p).toFixed(1)},${sy(easeKeyframe({ easing, bezier }, p)).toFixed(1)}`);
        }
        return pts.join(' ');
    })();

    const move = (e: React.PointerEvent) => {
        if (dragging.current === null || !bezier || !svgRef.current) return;
        const r = svgRef.current.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, ix(((e.clientX - r.left) / r.width) * W)));
        const y = Math.min(2, Math.max(-1, iy(((e.clientY - r.top) / r.height) * H)));
        const next: Bezier = [...bezier];
        if (dragging.current === 0) {
            next[0] = +x.toFixed(2);
            next[1] = +y.toFixed(2);
        } else {
            next[2] = +x.toFixed(2);
            next[3] = +y.toFixed(2);
        }
        onChange({ bezier: next });
    };

    const handle = (idx: 0 | 1, bx: number, by: number, ox: number, oy: number) => (
        <g key={idx}>
            <line
                x1={sx(ox)}
                y1={sy(oy)}
                x2={sx(bx)}
                y2={sy(by)}
                className="stroke-primary-400"
                strokeWidth={1}
            />
            <circle
                cx={sx(bx)}
                cy={sy(by)}
                r={6}
                className="fill-primary-600 stroke-surface cursor-grab touch-none"
                strokeWidth={1.5}
                onPointerDown={(e) => {
                    dragging.current = idx;
                    (e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId);
                }}
                onPointerUp={() => (dragging.current = null)}
                onPointerCancel={() => (dragging.current = null)}
            />
        </g>
    );

    return (
        <div className="space-y-2">
            <SegmentedControl<'preset' | 'custom'>
                aria-label="Curve type"
                value={custom ? 'custom' : 'preset'}
                onChange={(v) =>
                    v === 'custom'
                        ? !custom &&
                          onChange({ bezier: NAMED_BEZIER[easing] ?? [0.42, 0, 0.58, 1] })
                        : custom && onChange({ bezier: null })
                }
                options={[
                    { value: 'preset', label: 'Preset' },
                    { value: 'custom', label: 'Custom' },
                ]}
            />

            {!custom && (
                <Select<string>
                    aria-label="Easing"
                    value={mixed ? '' : easing}
                    placeholder="Mixed"
                    onChange={(v) => onChange({ easing: v as EasingName })}
                    options={EASING_NAMES.map((n) => ({ value: n, label: EASING_LABELS[n] }))}
                />
            )}

            <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full max-w-[190px] rounded-md border border-[color:var(--an-border)] bg-[color:var(--an-sunken)]"
                onPointerMove={move}
                role="img"
                aria-label="Easing curve"
            >
                {/* unit box */}
                <rect
                    x={sx(0)}
                    y={sy(1)}
                    width={sx(1) - sx(0)}
                    height={sy(0) - sy(1)}
                    className="fill-none stroke-[color:var(--an-border-strong)]"
                    strokeDasharray="3 3"
                />
                <line
                    x1={sx(0)}
                    y1={sy(0)}
                    x2={sx(1)}
                    y2={sy(1)}
                    className="stroke-[color:var(--an-border-strong)]"
                />
                <polyline
                    points={curve}
                    fill="none"
                    className="stroke-primary-500"
                    strokeWidth={2}
                    strokeLinejoin="round"
                />
                {bezier && (
                    <>
                        {handle(0, bezier[0], bezier[1], 0, 0)}
                        {handle(1, bezier[2], bezier[3], 1, 1)}
                    </>
                )}
            </svg>

            {bezier && (
                <p className="font-mono text-[10px] text-[color:var(--an-muted)]">
                    cubic-bezier({bezier.join(', ')})
                </p>
            )}
        </div>
    );
}
