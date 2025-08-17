export function NumberInput({ value, onChange, min = 0, max = 100, className = "" }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-12 p-1 border rounded text-xs ${className}`}
    />
  );
}
