/** Help text with key marks: anything in backticks is drawn as key caps. Light: no command registry. */
import { Fragment } from 'react';

import { inlineCaps } from '../keyCaps';

export function Keys({ caps }: { caps: string[] }) {
    return (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap align-baseline">
            {caps.map((cap, i) => (
                <kbd
                    key={`${cap}-${i}`}
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-b-2 border-line-strong bg-surface px-1 font-sans text-xs font-medium text-ink"
                >
                    {cap}
                </kbd>
            ))}
        </span>
    );
}

/** Help text: anything in backticks is drawn as keys. */
export function RichText({ text }: { text: string }) {
    return (
        <>
            {text
                .split(/`([^`]+)`/)
                .map((part, i) =>
                    i % 2 ? (
                        <Keys key={i} caps={inlineCaps(part)} />
                    ) : (
                        <Fragment key={i}>{part}</Fragment>
                    ),
                )}
        </>
    );
}
