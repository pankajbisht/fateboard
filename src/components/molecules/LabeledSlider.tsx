import { useState } from 'react';
import Slider from '../atoms/Slider';
import Label from '../atoms/Label';

function LabeledSlider({
    label,
    min,
    max,
    step,
    onChange,
}: {
    label: string;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
}) {
    const [value, setValue] = useState(0);

    const handleChange = (v: number) => {
        setValue(v);
        onChange(v);
    };

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <Label label={label} className="text-[11px] text-gray-500" />
                <span className="text-sm font-semibold text-blue-600">{value.toFixed(2)}</span>
            </div>

            <Slider min={min} max={max} step={step} value={value} onChange={handleChange} />
        </div>
    );
}

export default LabeledSlider;
