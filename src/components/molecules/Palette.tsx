import { useRef } from 'react';
import { Swatches } from './Swatches';

export const Palette = ({ scrollRef, fill, bgColors, colorsMap, onClick }) => {
    return (
        <>
            <div
                ref={scrollRef}
                className="bg-white w-full flex flex-1 flex-wrap gap-0.01 overflow-y-auto"
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
