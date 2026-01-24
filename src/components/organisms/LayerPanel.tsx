import { useState } from 'react';
import IconButton from '../atoms/IconButton';
import { PanelHeader } from '../molecules/PanelHeader';
import { useStore } from '@/store';

const LayerItem = ({ layer, handlers, toggleSelect, multiSelect, depth = 0 }) => {
    const [collapsed, setCollapsed] = useState(false);
    const isSelected = multiSelect.includes(layer.id);
    const indent = depth * 12;

    console.log(multiSelect);

    return (
        <>
            <li
                className={clsx(
                    'flex justify-between items-center px-2 py-1 rounded-md hover:bg-blue-50 cursor-pointer transition select-none',
                    isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-white',
                )}
                style={{ marginLeft: indent }}
                onClick={() => toggleSelect(layer.id)}
            >
                <div className="flex items-center gap-1">
                    {layer.children?.length > 0 && (
                        <button
                            className="w-4 h-4 flex items-center justify-center text-xs text-gray-500"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCollapsed(!collapsed);
                            }}
                        >
                            {collapsed ? '+' : '-'}
                        </button>
                    )}

                    {/* Visibility */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlers.onToggleVisibility(layer.id);
                        }}
                        title={layer.visible ? 'Visible' : 'Hidden'}
                        className="p-1 hover:bg-gray-200 rounded"
                    >
                        <i
                            className={layer.visible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}
                        ></i>
                    </button>

                    {/* Lock */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlers.onToggleLock(layer.id);
                        }}
                        title={layer.locked ? 'Locked' : 'Unlocked'}
                        className="p-1 hover:bg-gray-200 rounded"
                    >
                        <i className={layer.locked ? 'fa-solid fa-lock' : 'fa-solid fa-unlock'}></i>
                    </button>

                    {/* Rename */}
                    <input
                        type="text"
                        value={layer.name}
                        onChange={(e) => handlers.onRename(layer.id, e.target.value)}
                        className="w-24 text-xs border rounded px-1 py-0.5"
                        readOnly={layer.locked}
                    />
                </div>

                <div className="flex items-center gap-1">
                    {/* Reorder Buttons */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlers.onBringToFront(layer.id);
                        }}
                        title="Bring to Front"
                        className="p-1 hover:bg-gray-200 rounded"
                    >
                        <i className="fa-solid fa-arrow-up"></i>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlers.onSendToBack(layer.id);
                        }}
                        title="Send to Back"
                        className="p-1 hover:bg-gray-200 rounded"
                    >
                        <i className="fa-solid fa-arrow-down"></i>
                    </button>

                    {/* Delete */}
                    <IconButton
                        title="Delete"
                        onClick={() => handlers.onDelete(layer.id)}
                        icon="fa-solid fa-trash"
                    />
                </div>
            </li>

            {/* Render children recursively */}
            {layer.children?.length > 0 && !collapsed && (
                <ul className="pl-2">
                    {layer.children.map((child) => (
                        <LayerItem
                            key={child.id}
                            layer={child}
                            handlers={handlers}
                            toggleSelect={toggleSelect}
                            multiSelect={multiSelect}
                            depth={depth + 1}
                        />
                    ))}
                </ul>
            )}
        </>
    );
};

const LayerPanel = ({ closePanel }) => {
    const layers = useStore((s) => s.layers);
    const [multiSelect, setMultiSelect] = useState([]);

    console.log(layers);

    const handlers = {
        onToggleVisibility: useStore.getState().toggleVisibility,
        onToggleLock: useStore.getState().toggleLayerLock,
        onRename: useStore.getState().renameLayer,
        onDelete: useStore.getState().removeLayer,
        reorderLayer: useStore.getState().reorderLayer,
        onBringToFront: useStore.getState().bringLayerForward,
        onSendToBack: useStore.getState().sendLayerBackward,
        duplicateLayer: useStore.getState().duplicateLayer,
    };

    const groupSelected = () => useStore.getState().groupLayers(multiSelect);
    const ungroupSelected = () => useStore.getState().ungroupSelectedLayers(multiSelect);
    const align = (type) => useStore.getState().alignLayers(type, multiSelect);
    const distribute = (type) => useStore.getState().distributeLayers(type, multiSelect);

    const toggleSelect = (id) => {
        setMultiSelect((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    return (
        <aside className="flex flex-col w-64 h-full  rounded">
            {/* Header */}
            <div className="flex flex-col border-b border-stone-300">
                <PanelHeader title="Layers" onClose={closePanel} />
                <div className="flex flex-wrap gap-1 p-2 bg-gray-50 justify-start">
                    <IconButton
                        title="Group"
                        onClick={groupSelected}
                        icon="fa-solid fa-object-group"
                    />
                    <IconButton
                        title="Ungroup"
                        onClick={ungroupSelected}
                        icon="fa-solid fa-object-ungroup"
                    />
                    <IconButton
                        title="Align Left"
                        onClick={() => align('left')}
                        icon="fa-solid fa-align-left"
                    />
                    <IconButton
                        title="Align Center"
                        onClick={() => align('center')}
                        icon="fa-solid fa-align-center"
                    />
                    <IconButton
                        title="Align Right"
                        onClick={() => align('right')}
                        icon="fa-solid fa-align-right"
                    />
                    <IconButton
                        title="Distribute Horizontally"
                        onClick={() => distribute('horizontal')}
                        icon="fa-solid fa-arrows-left-right"
                    />
                    <IconButton
                        title="Distribute Vertically"
                        onClick={() => distribute('vertical')}
                        icon="fa-solid fa-arrows-up-down"
                    />
                </div>
            </div>

            {/* Layer List */}
            <ul className="overflow-y-auto h-64 p-1 space-y-1">
                {layers.map((layer) => (
                    <LayerItem
                        key={layer.id}
                        layer={layer}
                        handlers={handlers}
                        toggleSelect={toggleSelect}
                        multiSelect={multiSelect}
                    />
                ))}
            </ul>
        </aside>
    );
};

export default LayerPanel;
