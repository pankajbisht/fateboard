import LabeledInput from '../atoms/LabeledInput';

type TransformInputProps = {
    label: string;
    value?: number | string;
    disabled?: boolean;
    onChange?: (val: number) => void;
    max?: number | string;
    /** Accessible name when the visible label is ambiguous. */
    ariaLabel?: string;
};

/**
 * Labelled number field (effect panels, footer stroke width). Typing edits a draft that is
 * applied on Enter / blur; empty or invalid input reverts; values are clamped to [0, max].
 */
export const TransformInput = ({
    label,
    value,
    disabled,
    onChange,
    max,
    ariaLabel,
}: TransformInputProps) => (
    <LabeledInput
        label={label}
        ariaLabel={ariaLabel}
        value={value ?? 0}
        onChange={onChange}
        disabled={disabled}
        max={max}
    />
);
