export const DockPanel = ({
    open,
    width = 280,
    onToggle,
    scrollRef,
    onScrollSave,
    children,
}: {
    open: boolean;
    width?: number;
    onToggle: () => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    onScrollSave: (scrollTop: number) => void;
    children: React.ReactNode;
}) => {
    return (
        <div className="relative flex h-full">
            {/* 3-dot handle */}
            <button
                onClick={onToggle}
                className="w-2 border border-stone-200 cursor-ew-resize flex items-center justify-center bg-stone-200 hover:bg-stone-300"
            >
                <i className="fa-solid fa-ellipsis-vertical" />
            </button>

            {/* panel */}
            <div
                className="bg-white shadow-
        xl border-l border-stone-200 transition-[width,opacity] duration-300 overflow-hidden"
                style={{ width: open ? width : 0, opacity: open ? 1 : 0 }}
            >
                <div
                    ref={scrollRef}
                    onScroll={(e) => onScrollSave((e.target as HTMLDivElement).scrollTop)}
                    className="h-full overflow-y-auto"
                >
                    {children}
                </div>
            </div>
        </div>
    );
};
