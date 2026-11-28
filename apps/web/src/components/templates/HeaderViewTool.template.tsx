import type { ReactNode } from 'react';

interface HeaderViewToolProps {
    brand: ReactNode;
    toolbar: ReactNode;
    transform: ReactNode;
}

const HeaderViewTool = ({ brand, toolbar, transform }: HeaderViewToolProps) => {
    return (
        <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 flex-row items-center">
                {brand}
                {toolbar}
            </div>
            {/* the property bar: one fixed height for every tool and selection state, on every screen
                (no jump when switching or (de)selecting, so the board never resizes); scrolls
                sideways on small screens instead of running off */}
            <div
                data-testid="property-bar"
                className="flex h-[var(--ui-bar)] min-w-0 flex-row items-stretch overflow-x-auto border-t border-line [scrollbar-width:none]"
            >
                {transform}
            </div>
        </section>
    );
};

export { HeaderViewTool };
