function PencilToolHelp() {
    const sections = [
        {
            title: 'What is the Pencil Tool?',
            content:
                'The Pencil Tool lets you draw freely on the canvas using mouse or touch input. It is ideal for sketching ideas, adding annotations, and quick visual thinking.',
        },
        {
            title: 'When to use',
            list: [
                'Sketch ideas quickly',
                'Create annotations or highlights',
                'Draw freeform lines or shapes',
                'Mark up diagrams or images',
            ],
        },
        {
            title: 'How to draw',
            list: [
                'Select the Pencil Tool from the toolbar',
                'Click and drag on the canvas to draw',
                'Release the mouse or touch to finish the stroke',
            ],
        },
        {
            title: 'Editing strokes',
            list: [
                'Use the Selector Tool to move or resize strokes',
                'Press Delete / Backspace to remove a stroke',
                'Change stroke color or thickness from the toolbar',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Keep strokes simple and intentional',
                'Use grouping or layers to organize sketches',
                'Combine with Shape or Node tools for clarity',
            ],
        },
        {
            title: 'Keyboard shortcuts',
            list: [
                'P – Activate Pencil Tool',
                'Ctrl / Cmd + Z – Undo last stroke',
                'Ctrl / Cmd + Y – Redo stroke',
                'Delete / Backspace – Remove selected stroke',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Selector Tool – Edit and move strokes',
                'Hand Tool – Navigate without drawing',
                'Node Tool – Structured diagrams',
                'Shape Builder – Clean shapes and blocks',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Pencil Tool</h1>
                <p className="text-gray-600">
                    Draw freely on the canvas for sketches, annotations, and brainstorming.
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

export default PencilToolHelp;
