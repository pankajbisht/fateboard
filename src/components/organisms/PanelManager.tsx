import { getPanelPosition } from '../../lib/utils/getPanelPosition';
import { Toolbar } from './Toolbar';
import { Panel } from './Panel';
import { useState } from 'react';
import { useStore } from '../../store';

// 🔹 Centralized handlers
const toolHandlers = (store, deleteLayer) => ({
    select: () => store.setActiveTool('select'),
    pan: () => store.setActiveTool('pan'),
    draw: () => store.setActiveTool('draw'),
    shapes: () => {}, // panel only, no direct action
    text: () => store.addText({}),
    delete: () => deleteLayer(),
    undo: () => store.undo(),
    redo: () => store.redo(),
    group: () => store.groupLayers(),
    ungroup: () => store.ungroupSelected(),
    forward: () => store.bringForward(),
    backward: () => store.sendBackward(),
    forwards: () => store.bringToFront(),
    backwards: () => store.sendToBack(),
    lock: () => store.toggleActiveObjectLock(),
    fullscreen: () => store.toggleFullscreen(),
    zoomIn: () => store.zoomIn(),
    zoomOut: () => store.zoomOut(),
    zoomFit: () => store.zoomFit(),
    copy: () => store.copy(),
    paste: () => store.paste(),
    duplicate: () => store.duplicate(),
});

// 🔹 Utility for calculating panel position
const calcPanelPosition = (tool, event, toolbarPosition) => {
    if (!tool?.component) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const panelSize = tool.panelSize || { width: 288, height: 300 };
    return getPanelPosition(toolbarPosition, rect, panelSize);
};

export function PanelManager({ config, toolbarPosition = 'left' }) {
    const [activePanel, setActivePanel] = useState(null);
    const [panelPos, setPanelPos] = useState(null);

    const store = useStore();
    const deleteLayer = store.removeLayer;
    const handlers = toolHandlers(store, deleteLayer);

    const handleToolClick = (id, event) => {
        const tool = config.find((t) => t.id === id);
        if (!tool) return;

        // 🟢 1. Momentary tools
        if (tool.type === 'momentary') {
            store.setActiveTool(id);
            setTimeout(() => store.setActiveTool(null), 400);
            handlers[id]?.();
            return;
        }

        // 🟢 2. Exclusive tools
        if (tool.type === 'exclusive') {
            if (store.activeTool === id) {
                // Toggle off → go back to select
                store.setActiveTool('select');
                setActivePanel(null);
            } else {
                store.setActiveTool(id);
                setActivePanel(null); // exclusive tools don’t need floating panels
                handlers[id]?.();
            }
            return;
        }

        // 🟢 3. Panel tools
        if (tool.type === 'panel') {
            const isOpen = activePanel === id;
            if (isOpen) {
                // Close panel → fallback to select
                setActivePanel(null);
                store.setActiveTool('select');
            } else {
                // Open panel → also mark tool as active
                setActivePanel(id);
                setPanelPos(calcPanelPosition(tool, event, toolbarPosition));
                store.setActiveTool(id);
                handlers[id]?.();
            }
            return;
        }
    };

    const closePanel = (id) => {
        const tool = config.find((t) => t.id === id);
        if (!tool) return;

        setActivePanel(null);
        if (tool.id === 'draw') return;

        store.setActiveTool('select');
    };

    return (
        <>
            <Toolbar
                tools={config}
                activeTool={store.activeTool} // ✅ single source of truth
                onToolClick={handleToolClick}
                position={toolbarPosition}
            />

            {config.map(
                (tool) =>
                    activePanel === tool.id &&
                    tool.component && (
                        <Panel
                            key={tool.id}
                            isOpen={true}
                            position={panelPos}
                            from={toolbarPosition}
                        >
                            {typeof tool.component === 'function' ? (
                                <tool.component closePanel={() => closePanel(tool.id)} />
                            ) : (
                                tool.component
                            )}
                        </Panel>
                    ),
            )}
        </>
    );
}
