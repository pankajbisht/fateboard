const HeaderViewTool = ({ brand, toolbar, transform }) => {
    return (
        <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 flex-row items-center">
                {brand}
                {toolbar}
            </div>
            <div className="flex flex-row items-center">{transform}</div>
        </section>
    );
};

export { HeaderViewTool };
