
import { useState, useEffect } from "react";

export const ToggleGroup = ({ options, value = {}, onChange, single = false }) => {
  const [state, setState] = useState(value);

  const toggle = (key) => {
    let updated;
    if (single) {
      updated = Object.fromEntries(
        options.map((o) => [o.key, o.key === key])
      );
    } else {
      updated = { ...state, [key]: !state[key] };
    }

    setState(updated);
    onChange?.(updated);
  };

  return (
    <div
      className="
        inline-flex overflow-hidden
        rounded-lg
        border border-gray-200
        bg-white
        shadow-[0_1px_2px_rgba(0,0,0,0.03)]
      "
    >
      {options.map(({ key, icon, label }) => {
        const isActive = state[key];

        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`
              flex items-center gap-1.5
              px-2.5 py-1.5
              text-[11px] font-medium
              transition-colors
              border-r border-gray-100 last:border-r-0

              ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }
            `}
          >
            {icon && <i className={`${icon} text-[11px]`}></i>}
            {label && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};
