import { useState } from "react";

export const ToggleGroup = ({ options, value = {}, onChange, single = false }) => {
  const [state, setState] = useState(value);

  const toggle = (key) => {
    let updated;
    if (single) {
      // single-select (radio style)
      updated = Object.fromEntries(options.map(o => [o.key, o.key === key]));
    } else {
      // multi-select (toggle style)
      updated = { ...state, [key]: !state[key] };
    }
    setState(updated);
    onChange?.(updated);
  };

  return (
    <div className="inline-flex rounded-md border border-gray-300 bg-white shadow-sm overflow-hidden">
      {options.map(({ key, icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className={`px-3 py-2 text-sm flex items-center gap-2 ${
            state[key] ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {icon && <i className={icon}></i>}
          {label && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
};
