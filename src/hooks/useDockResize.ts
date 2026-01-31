import { useEffect, useRef } from 'react';

export function useDockResize(
    side: 'left' | 'right',
    width: number,
    setWidth: (w: number) => void,
    open: boolean,
    setOpen: (v: boolean) => void,
) {
    const resizing = useRef(false);
    const raf = useRef<number | null>(null);

    const start = (e: React.MouseEvent) => {
        resizing.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        if (!open) setOpen(true);
    };

    const stop = () => {
        resizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (raf.current) cancelAnimationFrame(raf.current);
    };

    const move = (e: MouseEvent) => {
        if (!resizing.current) return;

        if (!raf.current) {
            raf.current = requestAnimationFrame(() => {
                const raw = side === 'right' ? window.innerWidth - e.clientX : e.clientX;

                const clamped = Math.min(Math.max(raw, 20), 420);

                const snapped = SNAP_POINTS.find((p) => Math.abs(p - clamped) < 1) ?? clamped;

                setWidth(snapped);
                raf.current = null;
            });
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };
    }, [side]);

    return { start, stop };
}
