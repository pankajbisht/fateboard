import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/atoms/Icon';
import { FOCUS_RING } from '@/components/atoms/control.styles';
import { readLocalList, writeLocalList } from '@/lib/storage';

import { HELP_CARD } from './helpParts';

const STORE = 'help-quick-start';

const STEPS = [
    { id: 'shape', label: 'Add a shape', href: '/draw?panel=shapes' },
    { id: 'text', label: 'Write something', href: '/draw?panel=text' },
    { id: 'style', label: 'Give it a gradient or shadow', href: '/draw?tab=appearance' },
    { id: 'page', label: 'Add a second page', href: '/draw?panel=Pages' },
    { id: 'animate', label: 'Make something move', href: '/draw?tab=animate' },
    { id: 'export', label: 'Export your first image', href: '/draw?tab=export' },
];

export function QuickStart() {
    const [done, setDone] = useState<string[]>(() =>
        readLocalList<string>(STORE, (v): v is string => typeof v === 'string'),
    );

    const toggle = (id: string) => {
        const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
        setDone(next);
        writeLocalList(STORE, next);
    };

    const count = STEPS.filter((s) => done.includes(s.id)).length;

    return (
        <section className={clsx(HELP_CARD, 'p-4')}>
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-title text-ink">Quick start</h2>
                <span className="text-caption tabular-nums text-ink-muted">
                    {count} of {STEPS.length}
                </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong">
                <div
                    className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
                    style={{ width: `${(count / STEPS.length) * 100}%` }}
                />
            </div>

            <ul className="mt-3 space-y-0.5">
                {STEPS.map((step) => {
                    const checked = done.includes(step.id);
                    return (
                        <li key={step.id} className="flex items-center gap-2 py-1">
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={checked}
                                aria-label={step.label}
                                onClick={() => toggle(step.id)}
                                className={clsx(
                                    'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border',
                                    FOCUS_RING,
                                    checked
                                        ? 'border-primary-600 bg-primary-600 text-white'
                                        : 'border-line-strong bg-surface',
                                )}
                            >
                                {checked && <Icon name="check" size={12} />}
                            </button>
                            <span
                                className={clsx(
                                    'min-w-0 flex-1 text-sm',
                                    checked ? 'text-ink-muted line-through' : 'text-ink',
                                )}
                            >
                                {step.label}
                            </span>
                            <Link
                                to={step.href}
                                aria-label={`Do it: ${step.label}`}
                                className={clsx(
                                    'rounded-sm text-xs font-semibold text-primary-ink hover:underline',
                                    FOCUS_RING,
                                )}
                            >
                                Do it
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
