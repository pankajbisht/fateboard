import { useRef } from 'react';
import { Swatches } from './Swatches';

export const Palette = ({ scrollRef, fill, bgColors, colorsMap, onClick }) => {
    return (
        <>
            <div
                ref={scrollRef}
                className="bg-white w-full flex flex-wrap gap-0.01 overflow-y-auto"
                style={{ height: 'calc(100vh - 65px - 40px - 120px)' }}
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
