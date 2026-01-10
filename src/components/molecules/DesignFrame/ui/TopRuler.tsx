import { useEffect, useRef, useState } from 'react';
import { RULER_SIZE, GRID } from './ruler.constants';

export function TopRuler() {
    const ref = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const section = ref.current?.parentElement as HTMLElement;
        if (!section) return;

        const onScroll = () => setScrollLeft(section.scrollLeft);
        const onResize = () => setWidth(section.clientWidth);

        onResize();
        section.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onResize);

        return () => {
            section.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    const center = width / 2;
    const start = Math.floor((scrollLeft - center) / GRID) - 1;
    const end = start + Math.ceil(width / GRID) + 3;

    return (
        <div
            ref={ref}
            className="sticky top-0 z-20 bg-[#2a2a2a] border-b border-black"
            style={{ height: RULER_SIZE, marginLeft: RULER_SIZE }}
        >
            <svg width="100%" height={RULER_SIZE}>
                {Array.from({ length: end - start }).map((_, i) => {
                    const value = start + i;
                    const x = value * GRID - scrollLeft + center;
                    const major = value % 5 === 0;

                    return (
                        <g key={value} transform={`translate(${x},0)`}>
                            <line y1={RULER_SIZE} y2={major ? 0 : RULER_SIZE / 2} stroke="#888" />
                            {major && (
                                <text x={2} y={10} fill="#aaa" fontSize="10">
                                    {value * GRID}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
