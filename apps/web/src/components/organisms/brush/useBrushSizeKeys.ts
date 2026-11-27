import { useEffect, useRef } from 'react';
import { useStore } from '@store';
import { clamp } from '@store/brushConfig';

/** `[` and `]` change the brush size while the Brush panel is open, like Photoshop / Procreate. */
export function useBrushSizeKeys() {
    const width = useStore((s) => s.width);
    const setBrushWidth = useStore((s) => s.setBrushWidth);
    const widthRef = useRef(width);
    widthRef.current = width;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t) {
                const typing =
                    t.tagName === 'TEXTAREA' ||
                    t.isContentEditable ||
                    (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range');
                if (typing) return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key !== '[' && e.key !== ']') return;
            const w = widthRef.current;
            const step = w < 10 ? 1 : w < 40 ? 2 : 5;
            setBrushWidth({ width: clamp(w + (e.key === ']' ? step : -step), 1, 200) });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [setBrushWidth]);
}
