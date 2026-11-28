import { useEffect, useRef, useState } from 'react';
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv, type HSV } from '@/lib/colorMath';

/** How many of our own last sent colors count as an echo (the store may report a drag a frame late). */
const ECHOES = 8;

export const toHsv = (hex: string): HSV => rgbToHsv(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 });
export const hsvHex = (hsv: HSV) => rgbToHex(hsvToRgb(hsv));

/**
 * A colour control's own HSV, kept in step with an outside `color` (#rrggbb): the custom colour popover
 * and the Fill & Shadow wheel. Keeps the hue when the colour turns gray, sends each new hex once
 * (`emit`), and while a pointer is down (`dragging`, set by `onPointerDownCapture` on the control's
 * root) ignores late echoes of its own drag steps, which used to snap the thumb back: the flicker.
 * `onDragEnd` runs after the pointer is released (the popover re-places itself then).
 */
export function useHsvColor(
    color: string | null | undefined,
    onChange: (hex: string) => void,
    fallback = '#000000',
    onDragEnd?: () => void,
) {
    const start = normalizeHex(color ?? '') ?? fallback;
    const [hsv, setHsv] = useState<HSV>(() => toHsv(start));
    const lastSent = useRef(start);
    const sent = useRef<string[]>([start]);
    const dragging = useRef(false);
    const dragEnd = useRef(onDragEnd);
    dragEnd.current = onDragEnd;

    const emit = (next: HSV) => {
        setHsv(next);
        const out = hsvHex(next);
        if (out === lastSent.current) return;
        lastSent.current = out;
        sent.current = [out, ...sent.current.filter((c) => c !== out)].slice(0, ECHOES);
        onChange(out);
    };
    const emitHex = (h: string) => {
        const next = toHsv(h);
        // gray / black / white have no hue: keep the current one
        emit(next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next);
    };

    // outside change (palette click, undo, another selection): follow it, unless it is our own echo
    useEffect(() => {
        const n = normalizeHex(color ?? '');
        if (!n || n === lastSent.current || (dragging.current && sent.current.includes(n))) return;
        lastSent.current = n;
        sent.current = [n];
        setHsv((cur) => {
            const next = toHsv(n);
            return next.s === 0 || next.v === 0 ? { ...next, h: cur.h } : next;
        });
    }, [color]);

    // drag end (pointer capture keeps the events on the control, so listen on the document)
    useEffect(() => {
        const end = () => {
            if (!dragging.current) return;
            dragging.current = false;
            dragEnd.current?.();
        };
        document.addEventListener('pointerup', end, true);
        document.addEventListener('pointercancel', end, true);
        return () => {
            document.removeEventListener('pointerup', end, true);
            document.removeEventListener('pointercancel', end, true);
        };
    }, []);

    return {
        hsv,
        hex: hsvHex(hsv),
        /** Local preview while dragging (no colour sent). */
        preview: setHsv,
        emit,
        emitHex,
        dragging,
        /** Spread on the control's root element. */
        rootProps: {
            onPointerDownCapture: () => {
                dragging.current = true;
            },
        },
    };
}
