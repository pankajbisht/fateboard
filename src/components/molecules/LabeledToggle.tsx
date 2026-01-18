import clsx from 'clsx';
import { useState } from 'react';
import Label from '../atoms/Label';
import Toggle from '../atoms/Toggle';

function LabeledToggle({
    label,
    onChange,
    className,
}: {
    label: string;
    onChange: (v: boolean) => void;
    className?: string;
}) {
    const [checked, setChecked] = useState(false);

    const handleChange = (value: boolean) => {
        setChecked(value);
        onChange(value);
    };

    return (
        <div className={clsx('flex items-center space-x-3', className)}>
            <Label label={label} className="text-[11px] text-gray-500" />

            <Toggle checked={checked} onClick={() => handleChange(!checked)} />
        </div>
    );
}

export default LabeledToggle;
