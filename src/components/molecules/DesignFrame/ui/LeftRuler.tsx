import { useEffect, useRef, useState } from 'react';
import { RULER_SIZE, GRID } from './ruler.constants';

export function LeftRuler() {
    const ref = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        const section = ref.current?.parentElement as HTMLElement;
        if (!section) return;

        const onScroll = () => setScrollTop(section.scrollTop);
        const onResize = () => setHeight(section.clientHeight);

        onResize();
        section.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onResize);

        return () => {
            section.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    const center = height / 2;
    const start = Math.floor((scrollTop - center) / GRID) - 1;
    const end = start + Math.ceil(height / GRID) + 3;

    return (
        <div
            ref={ref}
            className="sticky left-0 z-20 bg-[#2a2a2a] border-r border-black"
            style={{ width: RULER_SIZE, marginTop: RULER_SIZE }}
        >
            <svg width={RULER_SIZE} height="100%">
                {Array.from({ length: end - start }).map((_, i) => {
                    const value = start + i;
                    const y = value * GRID - scrollTop + center;
                    const major = value % 5 === 0;

                    return (
                        <g key={value} transform={`translate(0,${y})`}>
                            <line x1={RULER_SIZE} x2={major ? 0 : RULER_SIZE / 2} stroke="#888" />
                            {major && (
                                <text
                                    x={2}
                                    y={10}
                                    fill="#aaa"
                                    fontSize="10"
                                    transform="rotate(-90 2 10)"
                                >
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
