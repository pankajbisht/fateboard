import { Swatch } from '../atoms/Swatch';

export const Swatches = ({ fill, bgColors, onClick }) => {
    return (
        <>
            {[...bgColors].reverse().map((bgColor, idx) => {
                return (
                    <Swatch
                        key={idx}
                        bgColor={bgColor}
                        isActive={bgColor === fill}
                        onClick={() => onClick(bgColor, fill)}
                    />
                );
            })}
        </>
    );
};
