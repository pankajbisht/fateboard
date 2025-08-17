export function Dropdown({
  options = [],
  value,
  onChange,
  className = "",
  label,
  preview,
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {label && <span className="text-xs text-gray-600">{label}</span>}
      {preview && <div>{preview}</div>}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="p-1 text-xs border rounded cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
