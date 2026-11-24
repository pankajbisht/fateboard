import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { Button } from '@/components/atoms/Button';

import { DemoCard } from '../helpParts';

type Pt = { x: number; y: number };
type Points = { start: Pt; handleA: Pt; handleB: Pt; end: Pt };
type Key = keyof Points;

const W = 320;
const H = 180;
const START: Points = {
    start: { x: 40, y: 140 },
    handleA: { x: 90, y: 30 },
    handleB: { x: 230, y: 30 },
    end: { x: 280, y: 140 },
};
const NAMES: Record<Key, string> = {
    start: 'Start node',
    end: 'End node',
    handleA: 'Curve handle of the start node',
    handleB: 'Curve handle of the end node',
};
const LINKED: Partial<Record<Key, Key>> = { start: 'handleA', end: 'handleB' };
const ORDER: Key[] = ['handleA', 'handleB', 'start', 'end'];
const ARROWS: Record<string, Pt> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};
const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));

/** Drag a curve like the Node tool: nodes carry their handles, handles bend the curve. */
export function NodeDemo() {
    const [points, setPoints] = useState(START);
    const dragging = useRef<Key | null>(null);
    const svg = useRef<SVGSVGElement>(null);

    const moveBy = (key: Key, dx: number, dy: number) =>
        setPoints((p) => {
            const shift = (pt: Pt) => ({ x: clamp(pt.x + dx, W), y: clamp(pt.y + dy, H) });
            const linked = LINKED[key];
            return {
                ...p,
                [key]: shift(p[key]),
                ...(linked ? { [linked]: shift(p[linked]) } : {}),
            };
        });

    const onMove = (e: PointerEvent<SVGSVGElement>) => {
        const key = dragging.current;
        const box = svg.current?.getBoundingClientRect();
        if (!key || !box?.width) return;
        const x = ((e.clientX - box.left) / box.width) * W;
        const y = ((e.clientY - box.top) / box.height) * H;
        moveBy(key, x - points[key].x, y - points[key].y);
    };

    const onKey = (key: Key, e: KeyboardEvent) => {
        const step = ARROWS[e.key];
        if (!step) return;
        e.preventDefault();
        const size = e.shiftKey ? 10 : 2;
        moveBy(key, step.x * size, step.y * size);
    };

    const { start, handleA, handleB, end } = points;

    return (
        <DemoCard
            title="Try it: bend a curve"
            hint="Drag the dots"
            picture={
                <svg
                    ref={svg}
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full max-w-md touch-none select-none"
                    onPointerMove={onMove}
                    onPointerUp={() => (dragging.current = null)}
                    onPointerLeave={() => (dragging.current = null)}
                >
                    <path
                        d={`M ${start.x} ${start.y} C ${handleA.x} ${handleA.y} ${handleB.x} ${handleB.y} ${end.x} ${end.y}`}
                        className="fill-none stroke-primary-600"
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                    <line
                        x1={start.x}
                        y1={start.y}
                        x2={handleA.x}
                        y2={handleA.y}
                        className="stroke-line-strong"
                    />
                    <line
                        x1={end.x}
                        y1={end.y}
                        x2={handleB.x}
                        y2={handleB.y}
                        className="stroke-line-strong"
                    />
                    {ORDER.map((key) => {
                        const isNode = key === 'start' || key === 'end';
                        return (
                            <circle
                                key={key}
                                role="button"
                                tabIndex={0}
                                aria-label={`${NAMES[key]}. Arrow keys move it.`}
                                cx={points[key].x}
                                cy={points[key].y}
                                r={isNode ? 7 : 6}
                                className={
                                    isNode
                                        ? 'cursor-move fill-primary-600 stroke-surface outline-none focus-visible:stroke-accent-500'
                                        : 'cursor-move fill-surface stroke-primary-600 outline-none focus-visible:stroke-accent-500'
                                }
                                strokeWidth={2}
                                onPointerDown={() => (dragging.current = key)}
                                onKeyDown={(e) => onKey(key, e)}
                            />
                        );
                    })}
                </svg>
            }
        >
            <p className="text-sm text-ink-muted">
                The solid dots are nodes and carry their handles with them. The hollow dots are
                curve handles and bend the line. It works the same way on the board.
            </p>
            <Button size="sm" variant="secondary" onClick={() => setPoints(START)}>
                Reset
            </Button>
        </DemoCard>
    );
}
