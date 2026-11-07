import type React from 'react';
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
import { Input } from '@/components/atoms/Input';

type HelpSectionProps = {
    toggleSection?: (sectionId: string) => void;
    expandedSections?: string[];
};

const tools: { id: string; label: string; component: React.ComponentType<HelpSectionProps> }[] = [
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
        <div className="flex h-full bg-surface-muted text-ink">
            {/* Sidebar */}
            <aside className="w-72 border-r border-line p-6 bg-surface shadow-lg flex flex-col">
                <h2 className="text-xl font-semibold mb-6 text-ink">Help Topics</h2>
                <Input
                    type="search"
                    leadingIcon="magnifying-glass"
                    placeholder="Search topics..."
                    aria-label="Search topics"
                    className="mb-4"
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
                                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-primary-100 hover:text-primary-ink ${
                                    tool.id === activeTool
                                        ? 'bg-primary-100 text-primary-ink font-semibold shadow-inner'
                                        : 'text-ink'
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
            <main className="flex-1 overflow-y-auto p-8 bg-surface-muted">
                <div className="bg-surface rounded-2xl shadow-md p-6 transition-all duration-300">
                    {ActiveComponent ? (
                        <ActiveComponent
                            toggleSection={toggleSection}
                            expandedSections={expandedSections}
                        />
                    ) : (
                        <p className="text-ink-muted">Select a topic from the left.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
