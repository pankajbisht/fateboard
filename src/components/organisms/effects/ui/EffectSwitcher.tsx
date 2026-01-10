import { useRef } from 'react';
import { EFFECTS } from './Effect.config';
import type { EffectType } from './EffectsPanel';

export const EffectSwitcher = ({
    value,
    onChange,
}: {
    value: EffectType;
    onChange: (v: EffectType) => void;
}) => {
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const active = EFFECTS.find((e) => e.id === value)!;

    const handleSelect = (id: EffectType) => {
        onChange(id);

        // ✅ close dropdown
        requestAnimationFrame(() => {
            detailsRef.current?.removeAttribute('open');
        });
    };

    return (
        <details ref={detailsRef} className="relative w-full">
            <summary
                className="
          list-none flex items-center justify-between
          px-3 py-2
          bg-neutral-50
          border border-neutral-300
          rounded-md
          cursor-pointer
          hover:bg-neutral-100
        "
            >
                <div className="flex items-center gap-2">
                    <i className={`${active.icon} text-neutral-600`} />
                    <span className="text-sm font-medium">{active.label}</span>
                </div>

                <i className="fa-solid fa-chevron-down text-xs text-neutral-500 transition-transform" />
            </summary>

            <div
                className="
          absolute z-30 mt-1 w-full
          bg-white border border-neutral-200
          rounded-md shadow-lg
        "
            >
                {EFFECTS.map((effect) => (
                    <button
                        key={effect.id}
                        onClick={() => handleSelect(effect.id)}
                        className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm
              hover:bg-blue-50
              ${effect.id === value ? 'bg-blue-100 text-blue-700 font-medium' : 'text-neutral-700'}
            `}
                    >
                        <i className={effect.icon} />
                        {effect.label}
                    </button>
                ))}
            </div>
        </details>
    );
};
