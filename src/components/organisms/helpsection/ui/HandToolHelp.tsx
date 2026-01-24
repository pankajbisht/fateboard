function HandToolHelp() {
    const sections = [
        {
            title: 'What is the Hand Tool?',
            content:
                'The Hand Tool lets you move around the canvas by panning the view. It does not select or modify objects, making it safe for navigation.',
        },
        {
            title: 'When to use',
            list: [
                'Navigate large or zoomed-in boards',
                'Review content without editing',
                'Present or explain diagrams to others',
            ],
        },
        {
            title: 'How to use',
            list: [
                'Select the Hand Tool from the toolbar',
                'Click and drag anywhere on the canvas',
                'Release the mouse to stop panning',
            ],
        },
        {
            title: 'Keyboard shortcuts',
            list: [
                'Hold Spacebar – Temporarily activate Hand Tool',
                'Scroll – Zoom in or out',
                'Use Hand Tool after zooming to reposition the view',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Use the Hand Tool instead of the Selector when only moving the view',
                'Combine panning with zoom for faster navigation',
                'Use during presentations to avoid accidental edits',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Selector Tool – Select and edit objects',
                'Pencil Tool – Freehand drawing',
                'Shape Builder – Structured shapes',
                'Node Tool – Diagrams and flows',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Hand Tool</h1>
                <p className="text-gray-600">
                    Navigate the canvas smoothly without modifying any objects.
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

export default HandToolHelp;
