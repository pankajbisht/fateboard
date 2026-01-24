function ShapeToolHelp() {
    const sections = [
        {
            title: 'What is the Shape Tool?',
            content:
                'The Shape Tool lets you create structured shapes such as rectangles, circles, arrows, and blocks. It is ideal for building clean diagrams and layouts.',
        },
        {
            title: 'When to use',
            list: [
                'Create flowcharts and diagrams',
                'Build organizational charts',
                'Design system or architecture visuals',
                'Prototype UI blocks or layouts',
            ],
        },
        {
            title: 'How to create shapes',
            list: [
                'Select the Shape Tool from the toolbar',
                'Click and drag on the canvas',
                'Release to place the shape',
            ],
        },
        {
            title: 'Editing shapes',
            list: [
                'Use the Selector Tool to move or resize shapes',
                'Change fill color, border, or opacity from the toolbar',
                'Duplicate shapes to reuse layouts',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Align shapes for better readability',
                'Use consistent sizes for structured layouts',
                'Group related shapes to stay organized',
            ],
        },
        {
            title: 'Keyboard shortcuts',
            list: [
                'S – Activate Shape Tool',
                'Ctrl / Cmd + D – Duplicate shape',
                'Delete / Backspace – Remove selected shape',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Selector Tool – Move and edit shapes',
                'Node Tool – Structured flow elements',
                'Pencil Tool – Annotations and sketches',
                'Hand Tool – Canvas navigation',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Shape Tool</h1>
                <p className="text-gray-600">
                    Create structured shapes, blocks, and diagrams quickly and efficiently.
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

export default ShapeToolHelp;
