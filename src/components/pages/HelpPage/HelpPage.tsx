import ColorListToolHelp from '@/components/organisms/helpsection/ui/ColorListToolHelp';
import HandToolHelp from '@/components/organisms/helpsection/ui/HandToolHelp';
import NodeToolHelp from '@/components/organisms/helpsection/ui/NodeToolHelp';
import PencilToolHelp from '@/components/organisms/helpsection/ui/PencilToolHelp';
import PrimaryToolbarHelp from '@/components/organisms/helpsection/ui/PrimaryToolbarHelp';
import SecondaryToolbarHelp from '@/components/organisms/helpsection/ui/SecondaryToolbarHelp';
import ShapeToolHelp from '@/components/organisms/helpsection/ui/ShapeToolHelp';
import ShortcutTable from '@/components/organisms/helpsection/ui/ShortcutTable';
import SelectorToolHelp from '@/components/organisms/helpsection/ui/SlectorToolHelp';
import TextToolHelp from '@/components/organisms/helpsection/ui/TextToolHelp';
import { useState } from 'react';

const tools = [
    { id: 'selector', label: 'Selector Tool', component: SelectorToolHelp },
    { id: 'pencil', label: 'Pencil Tool', component: PencilToolHelp },
    { id: 'node', label: 'Node Tool', component: NodeToolHelp },
    { id: 'hand', label: 'Hand Tool', component: HandToolHelp },
    { id: 'shape-builder', label: 'Shape Builder', component: ShapeToolHelp },
    { id: 'text', label: 'Text Tool', component: TextToolHelp },
    { id: 'color-list', label: 'Color List', component: ColorListToolHelp },
    { id: 'top-toolbar', label: 'Top Toolbar', component: PrimaryToolbarHelp },
    { id: 'top-toolbar-advanced', label: 'Top Toolbar Advanced', component: SecondaryToolbarHelp },
    { id: 'command', label: 'Shortcuts', component: ShortcutTable },
];

export default function HelpPage() {
    const [activeTool, setActiveTool] = useState(tools[0].id);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const ActiveComponent = tools.find((tool) => tool.id === activeTool)?.component;

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) =>
            prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
        );
    };

    return (
        <div className="flex h-full bg-gray-50 text-gray-800">
            {/* Sidebar */}
            <aside className="w-72 border-r border-gray-200 p-6 bg-white shadow-lg flex flex-col">
                <h2 className="text-xl font-semibold mb-6 text-gray-900">Help Topics</h2>
                <input
                    type="text"
                    placeholder="Search topics..."
                    className="mb-4 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onChange={(e) => {
                        const query = e.target.value.toLowerCase();
                        const firstMatch = tools.find((tool) =>
                            tool.label.toLowerCase().includes(query),
                        );
                        if (firstMatch) setActiveTool(firstMatch.id);
                    }}
                />
                <ul className="space-y-2 flex-1 overflow-y-auto">
                    {tools.map((tool) => (
                        <li key={tool.id}>
                            <button
                                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-blue-100 hover:text-blue-900 ${
                                    tool.id === activeTool
                                        ? 'bg-blue-200 text-blue-900 font-semibold shadow-inner'
                                        : 'text-gray-700'
                                }`}
                                onClick={() => setActiveTool(tool.id)}
                            >
                                {tool.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
                <div className="bg-white rounded-2xl shadow-md p-6 transition-all duration-300">
                    {ActiveComponent ? (
                        <ActiveComponent
                            toggleSection={toggleSection}
                            expandedSections={expandedSections}
                        />
                    ) : (
                        <p className="text-gray-500">Select a topic from the left.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
