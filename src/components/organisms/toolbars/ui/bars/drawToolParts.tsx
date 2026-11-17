/**
 * Shared pieces of the property bar (the header row under the command bar): every tool's bar starts with
 * its icon + label, uses dropdowns instead of tab rows, and keeps its hint behind an ⓘ (owner 2026-11-17).
 */
import type { ReactNode } from 'react';
import { Slider } from '@/components/atoms/Slider';
import { Icon, type IconName } from '@/components/atoms/Icon';
import { Select, type SelectOption } from '@/components/atoms/Select';
import { Tooltip } from '@/components/molecules/Tooltip';

export function Bar({
    label,
    icon,
    children,
}: {
    label: string;
    icon: IconName;
    children: ReactNode;
}) {
    return (
        // fills the fixed-height property row (HeaderViewTool), so switching tools never moves the canvas
        <div className="flex h-full min-w-0 flex-1 items-center overflow-x-auto bg-surface px-2">
            <div
                role="toolbar"
                aria-label={`${label} options`}
                // a mouse click on the bar keeps focus where it was, so Enter still finishes the
                // path (keyboard users Tab here on purpose); inputs and sliders need the focus
                onMouseDown={(e) => {
                    if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
                }}
                className="flex flex-1 items-center gap-3 whitespace-nowrap text-xs text-ink"
            >
                <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary-100 px-2 py-1 font-semibold text-primary-ink">
                    <Icon name={icon} />
                    {label}
                </span>
                {children}
            </div>
        </div>
    );
}

export const Key = ({ children }: { children: ReactNode }) => (
    <kbd className="rounded-sm border border-line-strong bg-surface-muted px-1 font-sans text-[10px] font-semibold text-ink">
        {children}
    </kbd>
);

/**
 * The tool's tips: an ⓘ at the end of the bar; hover or focus shows them (screen readers read them). The tip
 * opens to the left: the ⓘ is the last item, and Tooltip does not keep itself inside the right edge (BUG-229).
 */
export function Hint({ children }: { children: ReactNode }) {
    return (
        <span className="ml-auto flex shrink-0 items-center pl-3 text-ink-muted">
            <Tooltip
                position="left"
                content={<span className="flex items-center gap-1">{children}</span>}
            >
                <Icon name="circle-info" aria-label="Tips" />
                <span className="sr-only">{children}</span>
            </Tooltip>
        </span>
    );
}

/** A compact dropdown for a tool mode (instead of a row of tabs). */
export function BarSelect<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: SelectOption<T>[];
    onChange: (v: T) => void;
}) {
    return (
        <Select<T>
            aria-label={label}
            size="sm"
            block={false}
            value={value}
            options={options}
            onChange={onChange}
        />
    );
}

/** A labelled slider with its value, for the tool option bars. */
export function BarSlider({
    label,
    value,
    min,
    max,
    step = 1,
    unit = '',
    format,
    onChange,
    width = 'w-20',
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    format?: (v: number) => string;
    onChange: (v: number) => void;
    width?: string;
}) {
    const text = format ? format(value) : `${value}${unit}`;
    return (
        <span className="flex items-center gap-1.5 text-ink-muted">
            {label}
            <Slider
                aria-label={label}
                aria-valuetext={text}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
                className={width}
            />
            <span className="min-w-8 tabular-nums text-ink">{text}</span>
        </span>
    );
}
