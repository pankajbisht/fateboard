import { useStore } from '@/store';
import { applyFabricFilters } from '@/store/slices/createFilterSlice';
import { useEffect } from 'react';

export const Brightness = () => {
    const brightness = useStore((s) => s.brightness);
    const contrast = useStore((s) => s.contrast);

    const setFilter = useStore((s) => s.setFilter);
    const canvas = useStore((s) => s.canvas);

    useEffect(() => {
        const obj = canvas.getActiveObject();
        const filters = {
            brightness: brightness,
            contrast: contrast,
        };
        applyFabricFilters(obj, filters, canvas);
    }, [brightness]);

    return (
        <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={brightness}
            onChange={(e) => setFilter('brightness', Number(e.target.value))}
        />
    );
};
