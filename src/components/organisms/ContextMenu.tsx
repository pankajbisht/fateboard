import { useStore } from '../../store';

export const ContextMenu = () => {
    const { visible, x, y, items, closeMenu } = useStore();

    if (!visible) return null;

    // 1. Apply visibility rules safely
    const visibleItems = items.filter((item) => {
        if (typeof item.when === 'function') {
            return item.when();
        }
        return true;
    });

    // 2. Remove useless dividers
    const finalItems = visibleItems.filter((item, index) => {
        if (item.type !== 'divider') return true;

        const prev = visibleItems[index - 1];
        const next = visibleItems[index + 1];

        return prev && next && prev.type !== 'divider' && next.type !== 'divider';
    });

    // 3. Nothing to show
    if (finalItems.length === 0) return null;

    console.log(finalItems);

    return (
        <>
            {/* backdrop */}
            <div className="fixed inset-0 z-40" onClick={closeMenu} />

            {/* menu */}
            <div
                className="fixed z-50 min-w-[220px] rounded-lg
                   bg-white shadow-lg border border-stone-200 p-1"
                style={{ top: y, left: x }}
            >
                {finalItems.map((item, i) => {
                    if (item.type === 'divider') {
                        return <div key={item.id ?? i} className="my-1 h-px bg-stone-200" />;
                    }

                    return (
                        <button
                            key={item.id ?? i}
                            disabled={item.disabled}
                            onClick={() => {
                                item.onClick();
                                closeMenu();
                            }}
                            className="
                                flex w-full items-center justify-between
                                rounded-lg px-3 py-2 text-sm
                                hover:bg-gray-100
                                disabled:opacity-40
                            "
                        >
                            <span className="flex items-center gap-2">
                                {item.icon}
                                {item.label}
                            </span>

                            {item.shortcut && (
                                <span className="text-xs text-gray-400">{item.shortcut}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
};
