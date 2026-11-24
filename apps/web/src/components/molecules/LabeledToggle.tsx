import { useId, useState } from 'react';
import { Switch } from '../atoms/Switch';
import { Field } from './Field';

/** Switch with a label on one row. Controlled when `checked` is passed, uncontrolled otherwise. */
function LabeledToggle({
    label,
    checked: controlledChecked,
    onChange,
    hint,
    description,
    disabled,
    className,
}: {
    label: string;
    checked?: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
    /** Read by screen readers, not shown: for an explanation too long for a toolbar (use `hint` to show it). */
    description?: string;
    disabled?: boolean;
    className?: string;
}) {
    const id = useId();
    const descriptionId = useId();
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
                aria-describedby={description ? descriptionId : undefined}
                onChange={(v) => {
                    setInnerChecked(v);
                    onChange(v);
                }}
            />
            {description && (
                <span id={descriptionId} className="sr-only">
                    {description}
                </span>
            )}
        </Field>
    );
}

export { LabeledToggle as SwitchField };
export default LabeledToggle;
