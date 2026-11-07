import { Icon } from '@/components/atoms/Icon';
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
          bg-surface-muted
          border border-line-strong
          rounded-md
          cursor-pointer
          hover:bg-surface-muted
        "
            >
                <div className="flex items-center gap-2">
                    <Icon name={active.icon} className="text-ink-muted" />
                    <span className="text-sm font-medium">{active.label}</span>
                </div>

                <Icon name="chevron-down" className="text-xs text-ink-muted transition-transform" />
            </summary>

            <div
                className="
          absolute z-30 mt-1 w-full
          bg-surface border border-line
          rounded-md shadow-lg
        "
            >
                {EFFECTS.map((effect) => (
                    <button
                        key={effect.id}
                        onClick={() => handleSelect(effect.id)}
                        className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm
              hover:bg-primary-50
              ${effect.id === value ? 'bg-primary-100 text-primary-ink font-medium' : 'text-ink'}
            `}
                    >
                        <Icon name={effect.icon} />
                        {effect.label}
                    </button>
                ))}
            </div>
        </details>
    );
};
