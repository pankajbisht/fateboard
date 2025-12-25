import { useState } from 'react';

/**
 * ToolToggle
 * @param {Array} options - array of { key, icon, tooltip, toggleType }
 * toggleType: "exclusive" | "switch"
 */
export default function ToolToggle({ options = [], size = 26, onChange }) {
    const [activeKeys, setActiveKeys] = useState(() => {
        // For exclusive: store only one
        // For switch: store boolean states
        const initial = {};
        options.forEach((opt) => {
            initial[opt.key] = opt.toggleType === 'exclusive' ? false : false;
        });
        return initial;
    });

    const handleClick = (option) => {
        const { key, toggleType } = option;

        const updated = { ...activeKeys };

        if (toggleType === 'exclusive') {
            // Only this one is true, others false
            Object.keys(updated).forEach((k) => {
                updated[k] = k === key;
            });
        } else {
            // Toggle type switch: flip true/false
            updated[key] = !updated[key];
        }

        setActiveKeys(updated);
        onChange?.(updated);
    };

    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {options.map((option) => {
                const isActive = activeKeys[option.key];

                return (
                    <button
                        key={option.key}
                        title={option.tooltip}
                        onClick={() => handleClick(option)}
                        style={{
                            width: size,
                            height: size,
                            borderRadius: 6,
                            background: isActive
                                ? 'linear-gradient(#3b82f6, #2563eb)' // active
                                : 'linear-gradient(#ffffff, #f1f5f9)', // inactive
                            border: '1px solid #cbd5e1',
                            boxShadow: isActive
                                ? '0 2px 4px rgba(37,99,235,0.4)'
                                : '0 1px 2px rgba(0,0,0,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 140ms ease',
                        }}
                    >
                        <i
                            className={option.icon}
                            style={{
                                fontSize: size * 0.55,
                                color: isActive ? '#fff' : '#334155',
                            }}
                        />
                    </button>
                );
            })}
        </div>
    );
}
