import LabeledInput from '../atoms/LabeledInput';

type TransformInputProps = {
    label: string;
    value?: number | string;
    disabled?: boolean;
    onChange?: (val: any) => void;
    max?: number | string;
};

export const TransformInput = ({ label, value, disabled, onChange, max }: TransformInputProps) => {
    const handleChange = (e) => {
        const raw = e; // e.target.value

        // 🔥 Allow clearing
        if (raw === '') {
            onChange?.('');
            return;
        }

        const num = Number(raw);
        if (Number.isNaN(num)) return;

        if (typeof max === 'number' && num > max) return;

        onChange?.(num);

        // // Ensure empty input doesn't force NaN
        // if (raw === '') {
        //     onChange(0);
        //     return;
        // }

        // let num = parseInt(String(raw), 10);
        // if (isNaN(num)) num = 0;

        // onChange(num == 0 ? '' : num);
    };

    const onKeyDownHandler = (e) => {
        if (e.key === '.' || e.key === 'e') e.preventDefault();
    };

    return (
        <LabeledInput
            label={label}
            value={value ?? 0}
            onChange={handleChange}
            disabled={disabled}
            onKeyDown={onKeyDownHandler}
            max={max}
        />
    );
};
