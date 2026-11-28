import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@store';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';

const SIZE = 168;

/**
 * Mirror lens: a small window on the board that shows a live mirror image of what it covers (read from the
 * board's pixels each frame while open; nothing on the page changes). Drag it, or move it with the arrow keys;
 * the button flips it top-bottom instead of left-right.
 */
export function SymmetryMirrorLens() {
    const canvas = useStore((s) => s.canvas);
    const setLens = useStore((s) => s.setSymmetryLens);
    const [pos, setPos] = useState({ x: 40, y: 40 });
    const [vertical, setVertical] = useState(false);
    const view = useRef<HTMLCanvasElement>(null);
    const drag = useRef<{ dx: number; dy: number } | null>(null);

    useEffect(() => {
        if (!canvas) return;
        let frame = 0;
        const draw = () => {
            const out = view.current;
            const ctx = out?.getContext('2d');
            const src = canvas.lowerCanvasEl;
            const lensEl = out?.parentElement;
            if (out && ctx && src && lensEl) {
                // measured on screen: works at any zoom / retina scale and wherever the board sits
                const sr = src.getBoundingClientRect();
                const lr = lensEl.getBoundingClientRect();
                const kx = src.width / Math.max(1, sr.width);
                const ky = src.height / Math.max(1, sr.height);
                ctx.save();
                ctx.clearRect(0, 0, out.width, out.height);
                if (vertical) {
                    ctx.translate(0, out.height);
                    ctx.scale(1, -1);
                } else {
                    ctx.translate(out.width, 0);
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(
                    src,
                    (lr.left - sr.left) * kx,
                    (lr.top - sr.top) * ky,
                    lr.width * kx,
                    lr.height * ky,
                    0,
                    0,
                    out.width,
                    out.height,
                );
                ctx.restore();
            }
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [canvas, vertical]);

    const host = canvas?.upperCanvasEl?.parentElement;
    if (!canvas || !host) return null;

    const clamp = (x: number, y: number) => ({
        x: Math.max(0, Math.min(canvas.getWidth() - SIZE, x)),
        y: Math.max(0, Math.min(canvas.getHeight() - SIZE, y)),
    });
    const onDown = (e: PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    };
    const onMove = (e: PointerEvent<HTMLDivElement>) => {
        if (drag.current) setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
    };
    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 40 : 10;
        const d = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        }[e.key];
        if (!d) return;
        e.preventDefault();
        e.stopPropagation();
        setPos((p) => clamp(p.x + d[0], p.y + d[1]));
    };

    return createPortal(
        <div
            role="group"
            aria-label="Mirror lens"
            tabIndex={0}
            className="absolute z-20 cursor-move touch-none rounded-md border-2 border-primary-600 bg-surface shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={onKey}
        >
            <canvas
                ref={view}
                width={SIZE * 2}
                height={SIZE * 2}
                className="h-full w-full rounded-md"
            />
            <div className="absolute right-1 top-1 flex gap-1">
                <Button
                    size="sm"
                    variant="secondary"
                    aria-label={vertical ? 'Mirror left-right' : 'Mirror top-bottom'}
                    onClick={() => setVertical((v) => !v)}
                >
                    <Icon name={vertical ? 'flip-horizontal' : 'flip-vertical'} />
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    aria-label="Close the mirror lens"
                    onClick={() => setLens(false)}
                >
                    <Icon name="xmark" />
                </Button>
            </div>
        </div>,
        host,
    );
}
