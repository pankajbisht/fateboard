import { useMemo, useState } from 'react';

export function useSearch(items, matcher) {
    const [query, setQuery] = useState('');

    const filteredItems = useMemo(() => {
        if (!query) return items;

        const q = query.toLowerCase();
        return items.filter((item) => matcher(item, q));
    }, [items, query, matcher]);

    return {
        query,
        setQuery,
        filteredItems,
    };
}
