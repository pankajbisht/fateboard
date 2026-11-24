import { useId } from 'react';
import { Select, type SelectOption } from '../atoms/Select';
import { Field } from './Field';

/** Label + `Select`. `inline` puts the dropdown on the label row. */
export function SelectField<T extends string | number = string>({
    label,
    options,
    value,
    onChange,
    hint,
    inline = false,
    disabled,
    placeholder,
    className,
}: {
    label: string;
    options: SelectOption<T>[];
    value?: T | null;
    onChange: (value: T) => void;
    hint?: string;
    inline?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}) {
    const id = useId();
    return (
        <Field label={label} hint={hint} inline={inline} disabled={disabled} className={className}>
            <Select
                aria-labelledby={undefined}
                aria-label={label}
                id={id}
                options={options}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                block={!inline}
                size={inline ? 'sm' : 'md'}
            />
        </Field>
    );
}

export default SelectField;
