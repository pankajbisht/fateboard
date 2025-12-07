export function ColorPicker({ label, value, onChange, className = "" }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
      <span className="font-medium">{label}:</span>

      <div
        className="w-5 h-5 rounded-full p-[2px] border border-gray-200 shadow-sm"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full h-full rounded-full opacity-0 cursor-pointer ${className}`}
        />
      </div>
    </label>
  );
}
