import React from 'react';
import clsx from 'clsx';

type LabelProps = { label?: React.ReactNode; className?: string; htmlFor?: string; id?: string };

/** Field label text (small, muted). */
export const Label: React.FC<LabelProps> = ({ label, className = '', htmlFor, id }) => {
    const cls = clsx('block text-xs font-medium text-ink-muted', className);
    return htmlFor ? (
        <label id={id} htmlFor={htmlFor} className={cls}>
            {label}
        </label>
    ) : (
        <span id={id} className={cls}>
            {label}
        </span>
    );
};

export default Label;
