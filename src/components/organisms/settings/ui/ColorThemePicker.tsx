import clsx from 'clsx';
import { useRef, type KeyboardEvent } from 'react';
import { COLOR_THEMES, type ColorTheme } from '@/store/slices/createSettingSlice';
import { Icon } from '@/components/atoms/Icon';
import { FOCUS_RING } from '@/components/atoms/control.styles';

/** Color theme cards (radio group): swatch + name; arrow keys move the choice. */
export function ColorThemePicker({
    value,
    onChange,
}: {
    value: ColorTheme;
    onChange: (theme: ColorTheme) => void;
}) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);

    const onKey = (e: KeyboardEvent, i: number) => {
        const dir =
            e.key === 'ArrowRight' || e.key === 'ArrowDown'
                ? 1
                : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                  ? -1
                  : 0;
        if (!dir) return;
        e.preventDefault();
        const next = (i + dir + COLOR_THEMES.length) % COLOR_THEMES.length;
        onChange(COLOR_THEMES[next].id);
        refs.current[next]?.focus();
    };

    return (
        <div role="radiogroup" aria-label="Color theme" className="grid grid-cols-3 gap-2 sm:w-80">
            {COLOR_THEMES.map((t, i) => {
                const checked = t.id === value;
                return (
                    <button
                        key={t.id}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={t.label}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => onChange(t.id)}
                        onKeyDown={(e) => onKey(e, i)}
                        className={clsx(
                            'relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors',
                            FOCUS_RING,
                            checked
                                ? 'border-primary-500 bg-primary-50 text-ink ring-1 ring-primary-500'
                                : 'border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink',
                        )}
                    >
                        <span
                            aria-hidden
                            className="h-7 w-full rounded-md"
                            style={{
                                background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})`,
                            }}
                        />
                        {t.label}
                        {checked && (
                            <Icon
                                name="check"
                                className="absolute right-1 top-1 rounded-full bg-primary-600 p-0.5 text-[10px] text-white"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default ColorThemePicker;
