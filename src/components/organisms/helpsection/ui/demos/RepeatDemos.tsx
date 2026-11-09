import clsx from 'clsx';
import { useState } from 'react';

import Chip from '@/components/atoms/Chip';

import { DemoCard, DemoSlider } from '../helpParts';

const VIEW = 'w-full max-w-md';
const PRIMARY = 'fill-primary-600';
const ACCENT = 'fill-accent-500';

type Rule = 'none' | 'checker' | 'rows' | 'diagonal';
const RULES: { id: Rule; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'checker', label: 'Checkerboard' },
    { id: 'rows', label: 'Odd rows' },
    { id: 'diagonal', label: 'Diagonal' },
];

const ruleHits = (rule: Rule, r: number, c: number): boolean =>
    rule === 'checker'
        ? (r + c) % 2 === 0
        : rule === 'rows'
          ? r % 2 === 0
          : rule === 'diagonal'
            ? (r + c) % 3 === 0
            : false;

export function GridDemo() {
    const [rows, setRows] = useState(4);
    const [cols, setCols] = useState(6);
    const [brick, setBrick] = useState(false);
    const [rule, setRule] = useState<Rule>('checker');

    const cell = Math.min(300 / (cols + (brick ? 0.5 : 0)), 160 / rows);
    const size = cell * 0.78;
    const width = cell * (cols + (brick ? 0.5 : 0));
    const height = cell * rows;
    const left = (320 - width) / 2;
    const top = (180 - height) / 2;

    return (
        <DemoCard
            title="Try it: Repeat Grid"
            picture={
                <svg viewBox="0 0 320 180" role="img" aria-label="Grid preview" className={VIEW}>
                    {Array.from({ length: rows }).flatMap((_, r) =>
                        Array.from({ length: cols }).map((__, c) => (
                            <rect
                                key={`${r}-${c}`}
                                x={left + c * cell + (brick && r % 2 ? cell / 2 : 0)}
                                y={top + r * cell}
                                width={size}
                                height={size}
                                rx={size * 0.18}
                                className={ruleHits(rule, r, c) ? ACCENT : PRIMARY}
                            />
                        )),
                    )}
                </svg>
            }
        >
            <DemoSlider label="Rows" min={1} max={8} value={rows} onChange={setRows} />
            <DemoSlider label="Columns" min={1} max={12} value={cols} onChange={setCols} />
            <div className="flex flex-wrap gap-1">
                <Chip active={brick} onClick={() => setBrick(!brick)}>
                    Brick offset
                </Chip>
                {RULES.map((r) => (
                    <Chip key={r.id} active={rule === r.id} onClick={() => setRule(r.id)}>
                        {r.label}
                    </Chip>
                ))}
            </div>
        </DemoCard>
    );
}

export function RadialDemo() {
    const [count, setCount] = useState(12);
    const [distance, setDistance] = useState(60);
    const [spiral, setSpiral] = useState(false);
    const [fade, setFade] = useState(false);

    return (
        <DemoCard
            title="Try it: Repeat Radially"
            picture={
                <svg
                    viewBox="-150 -90 300 180"
                    role="img"
                    aria-label="Ring preview"
                    className={VIEW}
                >
                    {Array.from({ length: count }).map((_, i) => {
                        const turn = i / count;
                        const r = spiral ? distance * (0.25 + turn) : distance;
                        const deg = turn * 360 * (spiral ? 2 : 1);
                        return (
                            <rect
                                key={i}
                                x={-7}
                                y={-r - 9}
                                width={14}
                                height={18}
                                rx={4}
                                transform={`rotate(${deg})`}
                                opacity={fade ? 1 - turn * 0.85 : 1}
                                className={i === 0 ? ACCENT : PRIMARY}
                            />
                        );
                    })}
                </svg>
            }
        >
            <DemoSlider label="Count" min={2} max={36} value={count} onChange={setCount} />
            <DemoSlider
                label="Pivot distance"
                min={20}
                max={75}
                value={distance}
                onChange={setDistance}
            />
            <div className="flex flex-wrap gap-1">
                <Chip active={spiral} onClick={() => setSpiral(!spiral)}>
                    Spiral
                </Chip>
                <Chip active={fade} onClick={() => setFade(!fade)}>
                    Fade opacity
                </Chip>
            </div>
            <p className="text-caption text-ink-muted">The orange one is your original.</p>
        </DemoCard>
    );
}

const P0 = { x: 20, y: 150 };
const P1 = { x: 90, y: -40 };
const P2 = { x: 220, y: 220 };
const P3 = { x: 300, y: 30 };
const CURVE = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y} ${P2.x} ${P2.y} ${P3.x} ${P3.y}`;

const curveAt = (t: number) => {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    const dx = 3 * u * u * (P1.x - P0.x) + 6 * u * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x);
    const dy = 3 * u * u * (P1.y - P0.y) + 6 * u * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y);
    return {
        x: a * P0.x + b * P1.x + c * P2.x + d * P3.x,
        y: a * P0.y + b * P1.y + c * P2.y + d * P3.y,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
};

export function PathDemo() {
    const [copies, setCopies] = useState(14);
    const [endScale, setEndScale] = useState(100);
    const [follow, setFollow] = useState(true);
    const [sides, setSides] = useState(false);

    return (
        <DemoCard
            title="Try it: Repeat Along Path"
            picture={
                <svg viewBox="0 0 320 180" role="img" aria-label="Path preview" className={VIEW}>
                    <path
                        d={CURVE}
                        className="fill-none stroke-line-strong"
                        strokeDasharray="3 4"
                    />
                    {Array.from({ length: copies }).map((_, i) => {
                        const t = copies === 1 ? 0 : i / (copies - 1);
                        const { x, y, angle } = curveAt(t);
                        const scale = 1 + (endScale / 100 - 1) * t;
                        const side = sides ? (i % 2 ? 9 : -9) : 0;
                        return (
                            <rect
                                key={i}
                                x={-8}
                                y={-5 + side}
                                width={16}
                                height={10}
                                rx={3}
                                transform={`translate(${x} ${y}) rotate(${follow ? angle : 0}) scale(${scale})`}
                                className={clsx(i === 0 ? ACCENT : PRIMARY)}
                            />
                        );
                    })}
                </svg>
            }
        >
            <DemoSlider label="Copies" min={2} max={40} value={copies} onChange={setCopies} />
            <DemoSlider
                label="Scale at end"
                min={10}
                max={200}
                step={5}
                unit="%"
                value={endScale}
                onChange={setEndScale}
            />
            <div className="flex flex-wrap gap-1">
                <Chip active={follow} onClick={() => setFollow(!follow)}>
                    Follow path
                </Chip>
                <Chip active={sides} onClick={() => setSides(!sides)}>
                    Alternate sides
                </Chip>
            </div>
        </DemoCard>
    );
}
