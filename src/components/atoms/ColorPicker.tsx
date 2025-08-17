export function ColorPicker({ value, onChange, className = "" }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-6 h-6 p-0 border-0 rounded-full cursor-pointer ${className}`}
    />
  );
}
