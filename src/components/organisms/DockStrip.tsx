type StripItem = {
    id: string;
    icon: React.ReactNode;
};

export const DockStrip = ({
    items,
    active,
    open,
    onToggle,
    onMenuToggle,
}: {
    items: StripItem[];
    active: string | null;
    open: boolean;
    onToggle: (id: string) => void;
    onMenuToggle: () => void;
}) => {
    return (
        <div className="w-8 flex flex-col items-center py-2 gap-2 bg-white">
            <div className="h-px w-8 my-1" />

            {/* Panel Icons */}
            {items.map((item) => {
                const isActive = open && active === item.id;

                return (
                    <button
                        key={item.id}
                        onMouseDown={() => onToggle(item.id)}
                        className={`
              w-5 h-5 rounded-sm
              transition-colors
              ${isActive ? 'bg-blue-500' : 'bg-zinc-700'}
              hover:bg-blue-400
            `}
                    >
                        {item.icon}
                    </button>
                );
            })}
        </div>
    );
};
