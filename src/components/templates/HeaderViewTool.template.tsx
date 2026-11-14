const HeaderViewTool = ({ brand, toolbar, transform }) => {
    return (
        <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 flex-row items-center">
                {brand}
                {toolbar}
            </div>
            {/* small screens: the selection / tool options row scrolls sideways instead of running off */}
            <div className="flex min-w-0 flex-row items-center overflow-x-auto [scrollbar-width:none]">
                {transform}
            </div>
        </section>
    );
};

export { HeaderViewTool };
