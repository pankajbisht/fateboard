export function ColorPicker({ value, onChange, className = "" }) {

  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-6 h-6 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
