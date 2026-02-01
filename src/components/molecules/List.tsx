function List({ items, keyExtractor, renderItem, emptySlot }) {
    if (!items || items.length === 0) {
        return emptySlot ?? <div className="p-3 text-sm text-gray-500">No results</div>;
    }

    return (
        <ul>
            {items.map((item, index) => {
                return <li key={keyExtractor(item, index)}>{renderItem(item, index)}</li>;
            })}
        </ul>
    );
}

export default List;
