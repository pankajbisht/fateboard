import { useState } from 'react';
import { HsvWheel } from '../molecules/color/HsvWheel';
import { useHsvColor } from '../molecules/color/useHsvColor';
import { DEFAULT_WHEEL_HARMONY, type WheelHarmony } from '../molecules/color/wheelHarmony';

type Props = {
    /** The selection's solid fill, #rrggbb. */
    color: string;
    /** Fill the selection with one color (every drag step; the history debounce makes one undo step). */
    onChange: (hex: string) => void;
};

/**
 * Fill & Shadow colour wheel: the custom picker's hue ring + saturation / brightness square and its
 * harmonies, right in the panel. Keeps its own HSV (no hue jump on grays, no flicker from late echoes).
 */
export function FillColorWheel({ color, onChange }: Props) {
    const { hsv, hex, preview, emit, emitHex, rootProps } = useHsvColor(color, onChange);
    const [harmony, setHarmony] = useState<WheelHarmony>(DEFAULT_WHEEL_HARMONY);
    return (
        <div role="group" aria-label="Fill color wheel" className="mb-1" {...rootProps}>
            <HsvWheel
                hsv={hsv}
                hex={hex}
                onPreview={preview}
                onCommit={emit}
                onPickHex={emitHex}
                harmony={harmony}
                onHarmony={setHarmony}
            />
        </div>
    );
}

export default FillColorWheel;
