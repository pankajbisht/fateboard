import { useId, useState } from 'react';
import { Switch } from '../atoms/Switch';
import { Field } from './Field';

/** Switch with a label on one row. Controlled when `checked` is passed, uncontrolled otherwise. */
function LabeledToggle({
    label,
    checked: controlledChecked,
    onChange,
    hint,
    disabled,
    className,
}: {
    label: string;
    checked?: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
    disabled?: boolean;
    className?: string;
}) {
    const id = useId();
    const [innerChecked, setInnerChecked] = useState(controlledChecked ?? false);
    const checked = controlledChecked ?? innerChecked;

    return (
        <Field
            inline
            label={label}
            htmlFor={id}
            hint={hint}
            disabled={disabled}
            className={className}
        >
            <Switch
                id={id}
                size="sm"
                checked={checked}
                disabled={disabled}
                onChange={(v) => {
                    setInnerChecked(v);
                    onChange(v);
                }}
            />
        </Field>
    );
}

export { LabeledToggle as SwitchField };
export default LabeledToggle;
