import { useState, useEffect } from 'react';
import { Tooltip } from './Tooltip';

export const ToggleGroup = ({ options, value = {}, onChange, single = false }) => {
    const [state, setState] = useState(value);
    const size = 26;

    const toggle = (key) => {
        let updated;
        if (single) {
            updated = Object.fromEntries(options.map((o) => [o.key, o.key === key]));
        } else {
            updated = { ...state, [key]: !state[key] };
        }

        setState(updated);
        onChange?.(updated);
    };

    const renderIcon = (icon) => {
        if (typeof icon === 'string') {
            // Font Awesome class string
            return <i className={icon} style={{ fontSize: size * 0.55 }} />;
        }
        // JSX / React component (SVG)
        return icon;
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
            {options.map(({ key, icon, label, tooltip }) => {
                const isActive = state[key];

                return (
                    <Tooltip key={key} content={tooltip} position="bottom">
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

              ${isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}
            `}
                        >
                            {renderIcon(icon)}
                            {/*{icon && <i className={`${icon} text-[11px]`}></i>}*/}
                            {label && <span>{label}</span>}
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
};
