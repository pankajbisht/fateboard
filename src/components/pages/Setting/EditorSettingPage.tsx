import { MBrandLogo } from '@/components/molecules/BrandLogo';
import Preferences from '@/components/organisms/settings/ui/Preferences';
import { useState } from 'react';

const tools = [{ id: 'preferences', label: 'Preferences', component: Preferences }];

export default function EditorSettingPage() {
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
            <aside className="w-72 p-6 bg-white flex flex-col">
                <h3 className="flex gap-x-2 text-xl font-semibold mb-6 text-gray-900">
                    <MBrandLogo />
                    Settings
                </h3>
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
            <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="rounded-2xl p-6 transition-all duration-300">
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
