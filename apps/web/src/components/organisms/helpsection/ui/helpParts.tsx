/** Small pieces shared by the Help page: key caps, help text, highlighted matches, demo frame. */
import clsx from 'clsx';
import { Fragment, type ReactNode } from 'react';

import { Field } from '@/components/molecules/Field';
import { Icon } from '@/components/atoms/Icon';
import { Slider } from '@/components/atoms/Slider';
import { FOCUS_RING } from '@/components/atoms/control.styles';

import { Keys, RichText } from './RichText';

export { Keys, RichText };

export const HELP_CARD = 'rounded-lg border border-line bg-surface shadow-sm';
export const HELP_PRIMARY_LINK = clsx(
    'inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-600 px-3.5 text-xs font-semibold text-white hover:bg-primary-700',
    FOCUS_RING,
);
export const HELP_PILL_LINK = clsx(
    'inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-strong px-3 text-xs font-medium text-ink hover:bg-primary-100 hover:text-primary-ink',
    FOCUS_RING,
);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Highlight({ text, terms }: { text: string; terms: string[] }) {
    if (!terms.length) return <>{text}</>;
    const parts = text.split(new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                i % 2 ? (
                    <mark key={i} className="rounded-sm bg-primary-100 text-primary-ink">
                        {part}
                    </mark>
                ) : (
                    <Fragment key={i}>{part}</Fragment>
                ),
            )}
        </>
    );
}

/** Frame of a live demo: the picture, then its controls. */
export function DemoCard({
    title,
    hint,
    picture,
    children,
}: {
    title: string;
    hint?: ReactNode;
    picture: ReactNode;
    children?: ReactNode;
}) {
    return (
        <section aria-label={title} className={clsx(HELP_CARD, 'overflow-hidden')}>
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <Icon name="wand-magic-sparkles" className="text-primary-ink" />
                <h2 className="text-title text-ink">{title}</h2>
                {hint && <span className="ml-auto text-caption text-ink-muted">{hint}</span>}
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_14rem]">
                <div className="flex min-h-44 items-center justify-center rounded-md bg-surface-muted">
                    {picture}
                </div>
                <div className="flex flex-col gap-3">{children}</div>
            </div>
        </section>
    );
}

export function DemoSlider({
    label,
    value,
    min,
    max,
    step,
    unit = '',
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
}) {
    return (
        <Field
            label={label}
            trailing={
                <span className="font-semibold tabular-nums text-ink">
                    {value}
                    {unit}
                </span>
            }
        >
            <Slider
                aria-label={label}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
            />
        </Field>
    );
}
