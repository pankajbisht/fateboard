import { useId, useState } from 'react';
import Slider from '../atoms/Slider';
import { Field } from './Field';

export type SliderFieldProps = {
    label: string;
    min: number;
    max: number;
    step?: number;
    value?: number;
    onChange: (v: number) => void;
    /** Fires once on release (pointer up / key up): use it for history snapshots. */
    onCommit?: (v: number) => void;
    /** Double-click the row to reset to this value. */
    defaultValue?: number;
    /** Text after the value (px, %, °). */
    unit?: string;
    /** Custom value text. Default: as many decimals as `step` has. */
    format?: (v: number) => string;
    hint?: string;
    disabled?: boolean;
    className?: string;
};

const decimals = (step: number) => {
    const s = String(step);
    return s.includes('.') ? s.split('.')[1].length : 0;
};

/**
 * Label + live value + slider (the Filters look). Controlled when `value` is passed.
 * Exported as `SliderField` and as the default `LabeledSlider` (old name).
 */
export function SliderField({
    label,
    min,
    max,
    step = 1,
    value: controlledValue,
    onChange,
    onCommit,
    defaultValue,
    unit,
    format,
    hint,
    disabled,
    className,
}: SliderFieldProps) {
    const id = useId();
    const [innerValue, setInnerValue] = useState(controlledValue ?? defaultValue ?? min);
    const value = controlledValue ?? innerValue;

    const handleChange = (v: number) => {
        setInnerValue(v);
        onChange(v);
    };

    const text = format ? format(value) : value.toFixed(decimals(step));

    return (
        <div
            className={className}
            onDoubleClick={
                defaultValue === undefined || disabled
                    ? undefined
                    : () => {
                          handleChange(defaultValue);
                          onCommit?.(defaultValue);
                      }
            }
            title={defaultValue === undefined ? undefined : 'Double-click to reset'}
        >
            <Field
                label={label}
                htmlFor={id}
                hint={hint}
                disabled={disabled}
                trailing={
                    <span className="font-semibold tabular-nums text-ink">
                        {text}
                        {unit && <span className="ml-0.5 font-normal text-ink-subtle">{unit}</span>}
                    </span>
                }
            >
                <Slider
                    id={id}
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={disabled}
                    onChange={handleChange}
                    onCommit={onCommit}
                    aria-valuetext={unit ? `${text} ${unit}` : text}
                />
            </Field>
        </div>
    );
}

export default SliderField;
