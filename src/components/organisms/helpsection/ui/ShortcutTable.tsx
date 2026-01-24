import { useState } from 'react';
import { commandRegistry as commands } from '@/components/config/commandConfig';

function ShortcutTable() {
    const [search, setSearch] = useState('');

    // Filter commands by search query
    const filteredCommands = commands.filter(
        (command) =>
            command.label.toLowerCase().includes(search.toLowerCase()) ||
            command.shortcut.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <section className="space-y-8">
            <div className="flex flex-col bg-white p-6">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Keyboard Shortcuts</h2>
                <p className="text-gray-500 mb-4">
                    Quickly reference all keyboard commands available in the Whiteboard.
                </p>

                {/* Search Input */}
                <div className="relative mb-8">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <input
                        type="text"
                        placeholder="Search shortcuts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 placeholder-gray-400"
                    />
                </div>

                {/* Shortcut Table */}
                <div className="overflow-x-auto rounded-lg">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left font-medium text-gray-700 border-b border-stone-200">
                                    Action
                                </th>
                                <th className="p-3 text-center font-medium text-gray-700 border-b border-stone-200">
                                    Shortcut
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCommands.map((command, idx) => (
                                <tr
                                    key={command.id}
                                    className={`transition-colors ${
                                        idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                    } hover:bg-blue-50`}
                                >
                                    <td className="p-3 text-gray-800 font-medium">
                                        {command.label}
                                    </td>
                                    <td className="p-3 text-center font-mono text-gray-700">
                                        {command.shortcut}
                                    </td>
                                </tr>
                            ))}
                            {filteredCommands.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="p-3 text-center text-gray-400">
                                        No shortcuts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

export default ShortcutTable;
