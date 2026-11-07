import { useState } from 'react';
import { commandRegistry as commands } from '@/components/config/commandConfig';
import { Input } from '@/components/atoms/Input';

function ShortcutTable() {
    const [search, setSearch] = useState('');

    // Commands with a keyboard shortcut (menu-only commands have none), filtered by the search
    const query = search.toLowerCase();
    const filteredCommands = commands.filter(
        (command): command is typeof command & { shortcut: string } =>
            typeof command.shortcut === 'string' &&
            (command.label.toLowerCase().includes(query) ||
                command.shortcut.toLowerCase().includes(query)),
    );

    return (
        <section className="space-y-8">
            <div className="flex flex-col bg-surface p-6">
                <h2 className="text-4xl font-bold text-ink mb-4">Keyboard Shortcuts</h2>
                <p className="text-ink-muted mb-4">
                    Quickly reference all keyboard commands available in the Whiteboard.
                </p>

                {/* Search Input */}
                <Input
                    type="search"
                    leadingIcon="magnifying-glass"
                    placeholder="Search shortcuts..."
                    aria-label="Search shortcuts"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mb-8"
                />

                {/* Shortcut Table */}
                <div className="overflow-x-auto rounded-lg">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-surface-muted">
                            <tr>
                                <th className="p-3 text-left font-medium text-ink border-b border-line">
                                    Action
                                </th>
                                <th className="p-3 text-center font-medium text-ink border-b border-line">
                                    Shortcut
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCommands.map((command, idx) => (
                                <tr
                                    key={command.id}
                                    className={`transition-colors ${
                                        idx % 2 === 0 ? 'bg-surface-muted' : 'bg-surface'
                                    } hover:bg-primary-50`}
                                >
                                    <td className="p-3 text-ink font-medium">{command.label}</td>
                                    <td className="p-3 text-center font-mono text-ink">
                                        {command.shortcut}
                                    </td>
                                </tr>
                            ))}
                            {filteredCommands.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="p-3 text-center text-ink-subtle">
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
