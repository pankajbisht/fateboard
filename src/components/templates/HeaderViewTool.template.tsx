const HeaderViewTool = ({ brand, toolbar, transform }) => {
    return (
        <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 flex-row items-center">
                {brand}
                {toolbar}
            </div>
            {/* the property bar: one fixed height for every tool (no jump when switching); scrolls
                sideways on small screens instead of running off */}
            <div className="flex h-[var(--ui-bar)] min-w-0 flex-row items-stretch overflow-x-auto border-t border-line [scrollbar-width:none]">
                {transform}
            </div>
        </section>
    );
};

export { HeaderViewTool };
