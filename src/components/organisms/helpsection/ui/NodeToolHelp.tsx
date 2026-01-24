function NodeToolHelp() {
    const sections = [
        {
            title: 'What is a Node?',
            content:
                'A node is a visual block that represents a single idea, step, or component. Nodes are commonly used to build flows, diagrams, and structured relationships.',
        },
        {
            title: 'When to use',
            list: [
                'Create flowcharts',
                'Build mind maps',
                'Design system or architecture diagrams',
                'Model decision trees or processes',
            ],
        },
        {
            title: 'How to create a node',
            list: [
                'Select the Node Tool from the toolbar',
                'Click anywhere on the canvas',
                'A new node will be created at that position',
            ],
        },
        {
            title: 'Editing nodes',
            list: [
                'Drag nodes to reposition them',
                'Resize nodes using the corner handles',
                'Double-click a node to edit its text',
            ],
        },
        {
            title: 'Connecting nodes',
            content:
                'Drag from a node’s connection handle to another node to create a link. Connections automatically adjust when nodes are moved.',
        },
        {
            title: 'Best practices',
            list: [
                'Keep node labels short and clear',
                'Align nodes to improve readability',
                'Avoid crossing connections',
                'Use color to group related nodes',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Selector Tool – Move and edit nodes',
                'Shape Builder – Structured visual blocks',
                'Text Tool – Labels and annotations',
                'Hand Tool – Navigate the canvas',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Node Tool</h1>
                <p className="text-gray-600">
                    Create connected elements to represent flows, systems, and relationships.
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

export default NodeToolHelp;
