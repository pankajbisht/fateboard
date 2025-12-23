import clsx from "clsx";

type ValueStepperProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export const ValueStepper = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  unit,
  onChange,
  disabled = false,
}: ValueStepperProps) => {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div
      className={clsx(
        "inline-flex items-center rounded-lg border border-gray-300 bg-white shadow-sm",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      {/* Minus */}
      <button
        onClick={() => onChange(clamp(value - step))}
        className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-l-lg text-gray-600
                   hover:bg-gray-100 active:bg-gray-200 transition-colors"
        title="Decrease"
      >
        <i className="fa-solid fa-minus"></i>
      </button>

      {/* Value */}
      <div
        className="px-3 text-sm font-semibold text-gray-800 bg-gray-50 border-x border-gray-300
                   min-w-[44px] text-center"
        title="Value"
      >
        {value}
        {unit}
      </div>

      {/* Plus */}
      <button
        onClick={() => onChange(clamp(value + step))}
        className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-r-lg text-gray-600
                   hover:bg-gray-100 active:bg-gray-200 transition-colors"
        title="Increase"
      >
        <i className="fa-solid fa-plus"></i>
      </button>
    </div>
  );
};



type OpacityControlProps = {
  value?: number; // 0 → 1
  onChange: (value: number) => void;
  disabled?: boolean;
};

export const OpacityControl = ({
  value = 1,
  onChange,
  disabled,
}: OpacityControlProps) => {
  const percent = Math.round(value * 100);

  return (
    <ValueStepper
      value={percent}
      min={0}
      max={100}
      step={5}
      unit="%"
      disabled={disabled}
      onChange={(v) => onChange(v / 100)}
    />
  );
};
