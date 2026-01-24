function SelectorToolHelp() {
    const sections = [
        {
            title: 'What is the Selector Tool?',
            content:
                'The Selector Tool is the main tool for interacting with objects on the canvas. You can select, move, resize, group, and modify shapes, text, nodes, and images.',
        },
        {
            title: 'When to use',
            list: [
                'Select one or multiple objects',
                'Move or reposition elements',
                'Resize objects',
                'Group or ungroup items',
                'Modify object properties',
            ],
        },
        {
            title: 'How to select objects',
            list: [
                'Click to select a single object',
                'Hold Shift to select multiple objects',
                'Drag a selection box around multiple elements',
            ],
        },
        {
            title: 'Moving and resizing',
            list: [
                'Drag selected objects to move them',
                'Use arrow keys for precise movement',
                'Resize with handles (hold Shift to maintain aspect ratio)',
                'Hold Alt/Option to resize from center',
            ],
        },
        {
            title: 'Grouping and layering',
            list: [
                'Ctrl/Cmd + G to group selected objects',
                'Ctrl/Cmd + Shift + G to ungroup',
                'Bring to front, send to back, or adjust layer order',
            ],
        },
        {
            title: 'Keyboard shortcuts',
            list: [
                'V – Activate Selector Tool',
                'Delete / Backspace – Remove selected object',
                'Ctrl / Cmd + A – Select all',
                'Ctrl / Cmd + D – Duplicate selection',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Switch back to Selector Tool after drawing objects',
                'Group related items to stay organized',
                'Use alignment guides for clean layouts',
                'Avoid excessive nesting of groups',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Node Tool – for structured diagrams',
                'Shape Builder – for visual blocks',
                'Text Tool – for labels and descriptions',
                'Hand Tool – for navigation without editing',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Selector Tool</h1>
                <p className="text-gray-600">
                    Use the Selector Tool to select, move, resize, group, and organize objects on
                    the canvas.
                </p>
            </header>

            {sections.map((sec) => (
                <section
                    key={sec.title}
                    className="bg-gray-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow space-y-2"
                >
                    <h2 className="text-xl font-semibold text-gray-800">{sec.title}</h2>
                    {sec.content && <p className="text-gray-700">{sec.content}</p>}
                    {sec.list && (
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            {sec.list.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </div>
    );
}

export default SelectorToolHelp;
