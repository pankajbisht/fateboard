type EffectSectionProps = {
    title: string;
    children: React.ReactNode;
    onApply?: () => void;
    disabled?: boolean;
};

export const EffectSection = ({ title, children, onApply, disabled }: EffectSectionProps) => {
    return (
        <div className="flex flex-col gap-3 p-3 my-2 bg-white border border-neutral-200 rounded-md">
            <div className="text-sm font-medium text-neutral-700">{title}</div>

            {children}

            {onApply && (
                <button
                    disabled={disabled}
                    onClick={onApply}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Apply
                </button>
            )}
        </div>
    );
};
