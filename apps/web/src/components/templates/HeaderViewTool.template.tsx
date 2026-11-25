import type { ReactNode } from 'react';
import clsx from 'clsx';

interface HeaderViewToolProps {
    brand: ReactNode;
    toolbar: ReactNode;
    transform: ReactNode;
    /** Upright phones: the property bar has nothing to show, so the board gets its row. */
    transformPhoneHidden?: boolean;
}

const HeaderViewTool = ({
    brand,
    toolbar,
    transform,
    transformPhoneHidden,
}: HeaderViewToolProps) => {
    return (
        <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 flex-row items-center">
                {brand}
                {toolbar}
            </div>
            {/* the property bar: one fixed height for every tool (no jump when switching); scrolls
                sideways on small screens instead of running off */}
            <div
                data-testid="property-bar"
                className={clsx(
                    'flex h-[var(--ui-bar)] min-w-0 flex-row items-stretch overflow-x-auto border-t border-line [scrollbar-width:none]',
                    transformPhoneHidden && 'max-sm:hidden',
                )}
            >
                {transform}
            </div>
        </section>
    );
};

export { HeaderViewTool };
