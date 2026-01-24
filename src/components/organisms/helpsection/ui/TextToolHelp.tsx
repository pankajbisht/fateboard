function TextToolHelp() {
    const sections = [
        {
            title: 'What is the Text Tool?',
            content:
                'The Text Tool lets you add text elements to the canvas. You can use it for labels, titles, annotations, and descriptions inside your board.',
        },
        {
            title: 'When to use',
            list: [
                'Label shapes, nodes, or diagram elements',
                'Add explanations or notes',
                'Create titles or section headings',
            ],
        },
        {
            title: 'How to add text',
            list: [
                'Select the Text Tool from the toolbar',
                'Click anywhere on the canvas',
                'Type your text and press Enter or click outside to finish',
            ],
        },
        {
            title: 'Editing text',
            list: [
                'Click on text to edit its content',
                'Change font, size, color, or alignment from the toolbar',
                'Resize the text box using the handles',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Keep text short and clear',
                'Use consistent font sizes and styles',
                'Align text with related shapes or nodes',
            ],
        },
        {
            title: 'Keyboard shortcuts',
            list: [
                'T – Activate Text Tool',
                'Ctrl / Cmd + Z – Undo text changes',
                'Delete / Backspace – Remove selected text',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Selector Tool – Move and edit text',
                'Node Tool – Structured elements with text',
                'Shape Tool – Labeled shapes',
                'Hand Tool – Navigate without editing',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Text Tool</h1>
                <p className="text-gray-600">
                    Add labels, annotations, and descriptions to your canvas.
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

export default TextToolHelp;
