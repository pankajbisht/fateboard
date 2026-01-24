function SecondaryToolbarHelp() {
    const sections = [
        {
            title: 'Flip & transform',
            list: [
                'Flip objects horizontally or vertically',
                'Rotate objects using the rotation control',
                'Hold Shift while resizing to keep proportions',
            ],
        },
        {
            title: 'Layer management',
            list: [
                'Bring Forward or Send Backward to adjust order',
                'Bring to Front or Send to Back for full reordering',
                'Use layers to control overlap and visibility',
            ],
        },
        {
            title: 'Dimensions & position',
            list: [
                'Top and Left values control object position',
                'Width and Height adjust object size',
                'Hold Shift to maintain aspect ratio while resizing',
            ],
        },
        {
            title: 'Font controls (text only)',
            list: [
                'Font Family – choose a typeface',
                'Font Size – control text scale',
                'Font Style – bold, italic, underline',
                'Text Alignment – left, center, right, justify',
                'Shadow – add depth or emphasis to text',
            ],
        },
        {
            title: 'Best practices',
            list: [
                'Manage layers to avoid accidental overlaps',
                'Keep sizes and spacing consistent',
                'Use text styles consistently across the board',
                'Apply shadows and flips only when needed',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">
                    Top Toolbar – Advanced Controls
                </h1>
                <p className="text-gray-600">
                    Advanced controls for transforming objects, managing layers, and styling text.
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

export default SecondaryToolbarHelp;
