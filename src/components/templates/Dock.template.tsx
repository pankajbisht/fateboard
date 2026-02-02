function DockTemplate({ title, actions, children }) {
    return (
        <div className="flex flex-col gap-3 p-2">
            {/* Header */}
            <div className="flex items-center justify-between border border-stone-200 p-2 rounded-md">
                <h3 className="text-sm font-medium text-stone-700">{title}</h3>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-3">{children}</div>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

export default DockTemplate;
