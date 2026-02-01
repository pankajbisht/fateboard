import List from '@/components/molecules/List';
import SearchInput from '@/components/molecules/SearchInput';
import Card from '@/components/organisms/Card';
import { useSearch } from '@/hooks/useSearch';
import { commandMatcher } from '@/lib/utils/commandMatcher';
import React from 'react';

const CommandListItem = React.memo(function ({ cmd }) {
    return (
        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
            <span>{cmd.title}</span>
            {cmd.shortcut}
        </div>
    );
});

function NoCommandFound() {
    return <p className="p-2 text-gray-500 text-sm">No command found</p>;
}

export default function CommandPalette({ commands }) {
    const { query, setQuery, filteredItems } = useSearch(commands, commandMatcher);

    const renderCommandItem = React.useCallback((cmd) => <CommandListItem cmd={cmd} />, []);

    return (
        <div className="flex justify-center items-start pt-2">
            <Card title="Command Palette">
                <SearchInput placeholder="Type a command..." value={query} onChange={setQuery} />

                <List
                    items={filteredItems}
                    keyExtractor={(cmd) => cmd.id}
                    renderItem={renderCommandItem}
                    emptySlot={<NoCommandFound />}
                />
            </Card>
        </div>
    );
}
