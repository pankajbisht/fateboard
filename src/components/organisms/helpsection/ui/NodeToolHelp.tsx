function NodeToolHelp() {
    const sections = [
        {
            title: 'What is a node?',
            content:
                'Every outline is made of nodes (anchor points) joined by straight or curved segments. The Node tool lets you reshape any shape or drawn path by moving its nodes and their curve handles.',
        },
        {
            title: 'Start editing',
            list: [
                'Pick the Node tool in the left toolbar (shortcut A)',
                'Click a shape or a drawn path: its nodes appear (a shape that was already selected opens right away)',
                'Click another shape to edit that one instead',
                'From the Select tool, double-click a shape to edit its nodes; when you finish you are back in Select',
                'Works on every shape in the Shapes panel (text shapes and sticky notes too: you reshape the outline, the text stays inside), lines and drawn paths. Plain text, images, groups, connectors and locked objects have no editable nodes',
            ],
        },
        {
            title: 'Edit nodes',
            list: [
                'Drag a node to move it; its curve handles move with it',
                'Drag a round handle to bend the curve next to the node',
                'Double-click the outline to add a node (the shape does not change until you move it)',
                'Double-click a node, or press Delete / Backspace, to remove it',
                'Alt + click a node to switch between a sharp corner and a smooth curve',
                'Alt + drag a handle to bend one side only; Shift keeps a drag straight or at 45°',
                'Arrow keys nudge the selected node (Shift = 10 px)',
            ],
        },
        {
            title: 'Node toolbar',
            content:
                'While you edit, a bar floats above the shape. Every button acts on the selected node.',
            list: [
                'Add node / Delete node',
                'Corner node (handles move on their own) or Smooth node (handles stay in line)',
                'Straight segments / Curved segments on both sides of the node',
                'Close path (join the two ends) or Open path at the node; Break path splits a path at the node',
                'X / Y: type an exact position for the node',
                'Cancel undoes every change since you started; Done keeps them',
            ],
        },
        {
            title: 'Finish',
            list: [
                'Press Enter or Escape, or click an empty spot, to finish: the change is kept',
                'Press Escape again, V, or pick another tool to go back to Select (H = Hand)',
                'A shape you edit becomes a path. It keeps its name, colors and layer position',
            ],
        },
        {
            title: 'Related tools',
            list: [
                'Select: move, resize and rotate whole objects',
                'Draw: create freehand paths you can then reshape with the Node tool',
                'Hand: pan around the canvas',
            ],
        },
    ];

    return (
        <div className="space-y-8 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-ink">Node Tool</h1>
                <p className="text-ink-muted">
                    Reshape shapes and drawn paths by moving their nodes and curve handles.
                </p>
            </header>

            {sections.map((section) => (
                <section
                    key={section.title}
                    className="bg-surface-muted rounded-xl p-5 shadow-sm space-y-2"
                >
                    <h2 className="text-xl font-semibold text-ink">{section.title}</h2>

                    {section.content && <p className="text-ink">{section.content}</p>}

                    {section.list && (
                        <ul className="list-disc pl-6 space-y-1 text-ink">
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
