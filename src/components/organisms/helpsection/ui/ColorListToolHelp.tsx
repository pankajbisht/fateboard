function ColorListToolHelp() {
    const sections = [
        {
            title: 'What is the Color List Tool?',
            content:
                'The Color List Tool (also called the Swatches Panel) lets you quickly apply colors to shapes, text, nodes, and strokes. It provides predefined colors and supports custom colors for consistent design.',
        },
        {
            title: 'When to use',
            list: [
                'Apply consistent colors to objects',
                'Quickly switch between frequently used colors',
                'Maintain visual hierarchy and branding',
                'Reuse project-specific color palettes',
            ],
        },
        {
            title: 'How to use',
            list: [
                'Open the Color List panel from the right side of the canvas',
                'Select an object on the canvas',
                'Click a color swatch to apply it',
                'Use the color picker to add custom colors',
                'Reorder colors to keep frequently used ones at the top',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Stick to a limited color palette for clarity',
                'Use similar shades for related elements',
                'Save custom colors for brand or project consistency',
                'Avoid using too many bright colors together',
            ],
        },
        {
            title: 'Keyboard shortcuts',
            list: [
                'C – Open Color List panel',
                'Arrow Keys – Navigate between swatches',
                'Enter – Apply selected color',
                'Delete / Backspace – Remove a custom swatch',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Selector Tool – Select objects before applying color',
                'Shape Builder – Fill shapes with color',
                'Node Tool – Apply color to nodes',
                'Pencil Tool – Set stroke color',
                'Text Tool – Change text color',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Color List Tool</h1>
                <p className="text-gray-600">
                    Quickly apply and manage colors using swatches and custom palettes.
                </p>
            </header>

            {sections.map((section) => (
                <section
                    key={section.title}
                    className="bg-gray-50 rounded-xl p-5 shadow-sm space-y-2"
                >
                    <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>

                    {section.content && <p className="text-gray-700">{section.content}</p>}

                    {section.list && (
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            {section.list.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </div>
    );
}

export default ColorListToolHelp;
