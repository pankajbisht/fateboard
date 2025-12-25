import { useRef } from 'react';
import { Swatches } from './Swatches';

export const Palette = ({ scrollRef, fill, bgColors, colorsMap, onClick }) => {
    return (
        <>
            <div
                ref={scrollRef}
                className="h-10 bg-white w-full flex flex-wrap gap-0.01 max-h-64 overflow-y-auto"
            >
                {bgColors.flatMap((bg, idx) => {
                    return (
                        <Swatches
                            key={`${bg}-${idx}`}
                            fill={fill}
                            bgColors={colorsMap[bg]}
                            onClick={onClick}
                        />
                    );
                })}
            </div>
        </>
    );
};
