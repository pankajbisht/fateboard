type Props = {
    title: string;
    description?: string;
    items?: string[];
    children?: React.ReactNode;
};

function HelpSection({ title, description, items, children }: Props) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-medium">{title}</h2>
                {description && <p className="text-sm text-gray-500">{description}</p>}
            </div>

            {items && (
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            )}

            {children}
        </section>
    );
}

export default HelpSection;
