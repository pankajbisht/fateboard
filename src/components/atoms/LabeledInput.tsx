type LabeledInputProps = {
  label: string;
  value?: number;
  min?: number;
  step?: number;
  onChange?: (value: number) => void;
  onKeyDown?: (e) => void;
  unit?: string; // optional: px, %, etc.
  disabled?: boolean;
};

const LabeledInput = ({
  label,
  value = 0,
  min = 0,
  step = 1,
  onChange,
  onKeyDown,
  unit,
  disabled
}: LabeledInputProps) => {
  return (
    <label className="flex items-center gap-1 text-[11px] text-gray-500">
      <span>{label}:</span>

      <div className="flex items-center gap-0.5">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(Number(e.target.value))}
          onKeyDown={onKeyDown}
          className="w-14 h-6 px-1.5 text-[11px] text-gray-500 border border-gray-200
            rounded bg-transparent focus:outline-none focus:border-gray-300"
        />

        {unit && (
          <span className="text-[10px] text-gray-400">{unit}</span>
        )}
      </div>
    </label>
  );
};

export default LabeledInput;
