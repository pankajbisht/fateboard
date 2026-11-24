import clsx from 'clsx';
import type { ReactNode } from 'react';

export type FieldProps = {
    label: ReactNode;
    /** id of the control, links the label to it. */
    htmlFor?: string;
    /** Right side of the label row (current value, unit, small action). */
    trailing?: ReactNode;
    /** Muted help text under the control. */
    hint?: ReactNode;
    /** Label left, control right on one row (switches, small selects). */
    inline?: boolean;
    disabled?: boolean;
    /** Render the whole field as a <label> (implicit association, no id needed). */
    wrap?: boolean;
    className?: string;
    children: ReactNode;
};

/** Label + control (+ hint). The one way panels lay out a setting. */
export function Field({
    label,
    htmlFor,
    trailing,
    hint,
    inline = false,
    disabled = false,
    wrap = false,
    className,
    children,
}: FieldProps) {
    const Root = wrap ? 'label' : 'div';
    // a disabled field fades as a whole: it is an inactive group (exempt from contrast rules, BUG-258) and the
    // control inside does not fade a second time (data-dimmed, docs/DESIGN.md "Disabled")
    const dimmed = disabled ? ({ 'aria-disabled': true, 'data-dimmed': true } as const) : {};
    const labelEl =
        htmlFor && !wrap ? (
            <label
                htmlFor={htmlFor}
                className="min-w-0 truncate text-xs font-medium text-ink-muted"
            >
                {label}
            </label>
        ) : (
            <span className="min-w-0 truncate text-xs font-medium text-ink-muted">{label}</span>
        );

    if (inline) {
        return (
            <Root
                {...dimmed}
                className={clsx('flex flex-col gap-1', disabled && 'opacity-50', className)}
            >
                <div className="flex min-h-8 items-center justify-between gap-3">
                    {labelEl}
                    <div className="flex shrink-0 items-center gap-2">
                        {trailing}
                        {children}
                    </div>
                </div>
                {hint && <p className="text-caption text-ink-muted">{hint}</p>}
            </Root>
        );
    }

    return (
        <Root
            {...dimmed}
            className={clsx('flex flex-col gap-1.5', disabled && 'opacity-50', className)}
        >
            <div className="flex items-center justify-between gap-2">
                {labelEl}
                {trailing && <div className="shrink-0 text-xs text-ink-muted">{trailing}</div>}
            </div>
            {children}
            {hint && <p className="text-caption text-ink-muted">{hint}</p>}
        </Root>
    );
}

export default Field;
