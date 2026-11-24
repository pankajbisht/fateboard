import clsx from 'clsx';
import { useRef } from 'react';
import type { PresetMeta } from '@/animation/engine';
import { Icon } from '../../atoms/Icon';
import { FOCUS_RING } from '../../atoms/control.styles';
import { PRESET_DEMOS } from './presetDemos';

const reducedMotion = () =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One preset: a small stage that plays the motion on hover / focus, and its name. */
export function PresetTile({
    preset,
    disabled,
    applied,
    hint,
    onApply,
}: {
    preset: PresetMeta;
    disabled: boolean;
    /** this preset was just added (the next pick of the same kind swaps it) */
    applied: boolean;
    /** why the tile is disabled */
    hint?: string;
    onApply: () => void;
}) {
    const actor = useRef<HTMLSpanElement>(null);
    const running = useRef<Animation | null>(null);

    const stop = () => {
        running.current?.cancel();
        running.current = null;
    };
    const play = () => {
        stop();
        if (disabled || reducedMotion()) return;
        // jsdom and old browsers have no Element.animate: the tile then stays still
        running.current =
            actor.current?.animate?.(PRESET_DEMOS[preset.id], {
                duration: Math.max(700, preset.defaultDuration),
                easing: 'ease-in-out',
            }) ?? null;
    };

    return (
        <button
            type="button"
            disabled={disabled}
            aria-pressed={applied}
            title={hint ?? `Add ${preset.label}`}
            onClick={onApply}
            onPointerEnter={play}
            onPointerLeave={stop}
            onFocus={play}
            onBlur={stop}
            className={clsx(
                'relative flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md border p-1 text-[11px] font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                FOCUS_RING,
                applied
                    ? 'border-primary-500 bg-primary-100 text-primary-ink'
                    : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted',
            )}
        >
            <span className="flex h-8 w-full items-center justify-center overflow-hidden rounded bg-surface-strong">
                <span ref={actor} className="h-3.5 w-3.5 rounded-[3px] bg-primary-500" />
            </span>
            <span className="w-full truncate text-center">{preset.label}</span>
            {applied && (
                <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-600 text-white">
                    <Icon name="check" size={10} />
                </span>
            )}
        </button>
    );
}

export default PresetTile;
