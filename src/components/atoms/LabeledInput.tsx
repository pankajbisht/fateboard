import clsx from 'clsx';
import { NumberField } from './NumberField';

type LabeledInputProps = {
    label: string;
    value?: number | string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    /** Called once per finished edit (Enter / blur / arrow nudge). */
    onChange?: (value: number) => void;
    unit?: string; // optional: px, %, etc.
    disabled?: boolean;
    className?: string;
    /** Accessible name when the visible label is ambiguous (e.g. "Stroke width"). */
    ariaLabel?: string;
};

const num = (v: number | string | undefined) =>
    v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v);

/** Numeric field with a label on the left (Rows [− 12 +]); typing rules from `NumberField`. */
const LabeledInput = ({
    label,
    value = 0,
    min = 0,
    max,
    step = 1,
    onChange,
    unit,
    disabled,
    className = '',
    ariaLabel,
}: LabeledInputProps) => (
    <div
        className={clsx(
            'flex min-w-0 items-center justify-between gap-2 text-xs text-ink-muted',
            className,
        )}
    >
        <span aria-hidden className="min-w-0 truncate" title={label}>
            {label}
        </span>
        <NumberField
            aria-label={ariaLabel ?? label}
            value={value}
            min={num(min)}
            max={num(max)}
            step={num(step) ?? 1}
            unit={unit}
            disabled={disabled}
            onCommit={(v) => onChange?.(v)}
            className="w-[88px] shrink-0"
        />
    </div>
);

export default LabeledInput;
