import clsx from 'clsx';
import { Tooltip } from './Tooltip';

const PARENT_CLASS =
    'inline-flex overflow-hidden rounded-sm bg-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]';

const BTN_BASE_CLASS =
    'flex items-center gap-1 px-2 h-6 text-[11px] font-medium transition-colors border-r border-gray-100 last:border-r-0';

export const ToggleGroup = ({ options, value = {}, onChange, single = false }) => {
    const size = 20;

    // const toggle = (key) => {
    //   const current = value ?? {};

    //   let updated;

    //   if (single) {
    //     updated = {};
    //     for (const o of options) {
    //       updated[o.key] = o.key === key;
    //     }
    //   } else {
    //     updated = { ...current, [key]: !current[key] };
    //   }

    //   onChange?.(updated);
    // };

    const toggle = (key) => {
        const current = value ?? {};

        let updated;

        if (single) {
            updated = { ...current }; // start with existing value
            // Set all keys from this options array
            options.forEach((o) => {
                updated[o.key] = o.key === key;
            });
        } else {
            updated = { ...current, [key]: !current[key] };
        }

        onChange?.(updated);
    };

    const renderIcon = (icon) => {
        if (typeof icon === 'string') {
            return <i className={icon} style={{ fontSize: size * 0.49 }} />;
        }
        return icon;
    };

    return (
        <div className={PARENT_CLASS} role="group">
            {options.map(({ key, icon, label, tooltip }) => {
                const isActive = Boolean(value?.[key]);

                return (
                    <Tooltip key={key} content={tooltip} position="bottom">
                        <button
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => toggle(key)}
                            className={clsx(
                                BTN_BASE_CLASS,
                                isActive
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50',
                            )}
                        >
                            {renderIcon(icon)}
                            {label && <span>{label}</span>}
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
};
