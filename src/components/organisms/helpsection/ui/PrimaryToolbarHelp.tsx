function PrimaryToolbarHelp() {
    const sections = [
        {
            title: 'File',
            list: [
                'New Board – Create a new blank board',
                'Open – Load an existing board',
                'Save / Export – Save or export the board as image or PDF',
            ],
        },
        {
            title: 'Edit',
            list: [
                'Undo – Revert the last action (Ctrl / Cmd + Z)',
                'Redo – Reapply the last undone action (Ctrl / Cmd + Shift + Z)',
                'Cut, Copy, Paste – Standard clipboard actions',
            ],
        },
        {
            title: 'Alignment',
            list: [
                'Align Left, Center, Right, Top, Middle, Bottom',
                'Distribute objects horizontally or vertically',
                'Use alignment to keep layouts clean and consistent',
            ],
        },
        {
            title: 'Group and Ungroup',
            list: [
                'Group selected objects (Ctrl / Cmd + G)',
                'Ungroup objects (Ctrl / Cmd + Shift + G)',
                'Grouped items move and resize together',
            ],
        },
        {
            title: 'Lock and Unlock',
            list: [
                'Lock objects to prevent accidental edits',
                'Unlock objects to allow changes',
                'Useful for templates and background elements',
            ],
        },
        {
            title: 'Zoom controls',
            list: [
                'Zoom In / Out to change view level',
                'Fit to Screen to view all content',
                'Actual Size to return to 100% zoom',
                'Ctrl / Cmd + Scroll to zoom quickly',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Align and distribute objects for neat layouts',
                'Lock important elements before editing details',
                'Group complex elements to simplify management',
                'Zoom frequently to maintain context on large boards',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Primary Toolbar</h1>
                <p className="text-gray-600">
                    Access essential actions for file management, editing, alignment, grouping, and
                    zoom.
                </p>
            </header>

            {sections.map((section) => (
                <section
                    key={section.title}
                    className="bg-gray-50 rounded-xl p-5 shadow-sm space-y-2"
                >
                    <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>

                    <ul className="list-disc pl-6 space-y-1 text-gray-700">
                        {section.list.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

export default PrimaryToolbarHelp;
