import clsx from 'clsx';
import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { CONTROL_BOX } from './control.styles';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    /** Monospace text (code, SVG path data). */
    mono?: boolean;
};

/** Multi-line text field with the same box as `Input`. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    { label, mono, className, id, rows = 3, ...rest },
    ref,
) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label htmlFor={fieldId} className="mb-1 block text-xs font-medium text-ink-muted">
                    {label}
                </label>
            )}
            <textarea
                ref={ref}
                id={fieldId}
                rows={rows}
                className={clsx(
                    'block w-full resize-y px-2.5 py-1.5 text-xs placeholder:text-ink-subtle',
                    mono && 'font-mono',
                    CONTROL_BOX,
                )}
                {...rest}
            />
        </div>
    );
});

export default Textarea;
