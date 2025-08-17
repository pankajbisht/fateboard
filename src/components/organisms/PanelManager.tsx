import { getPanelPosition } from "../../utils/getPanelPosition.ts";
import { Toolbar } from "./Toolbar.tsx";
import { Panel } from "./Panel.tsx";
import { useState } from "react";
import { useStore } from "../../store/store.ts";

export function PanelManager({ config, toolbarPosition = "left" }) {
  const isDrawing = useStore((s) => s.isDrawing);
  const setDrawingMode = useStore((s) => s.setDrawingMode);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const [activePanel, setActivePanel] = useState(null);
  const [panelPos, setPanelPos] = useState(null);
  const addText = useStore((state) => state.addText);

  const handleToolClick = (id, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const panelSize = { width: 288, height: 300 };

    // Toggle button active state
    const isOpening = activePanel !== id;
    setActivePanel(isOpening ? id : null); // button highlight

    // Only open panel for tools that have a panel
    const toolsWithPanel = ["draw", "shapes", "text", "transform"]; // your actual panel tools
    if (isOpening && toolsWithPanel.includes(id)) {
      setPanelPos(getPanelPosition(toolbarPosition, rect, panelSize));
    }

    // Tool-specific actions
    if (id === "draw") setDrawingMode(isOpening);
    if (id === "layout") setDrawingMode(false); // stays active but no panel
    if (id === "shapes") setDrawingMode(false);
    if (id === "undo") undo();
    if (id === "redo") redo();
    if (id === "text") addText({ text: 'Msg' });
  };
  const closePanel = () => setActivePanel(null);

  return (
    <>
      <Toolbar
        tools={config}
        activeTool={activePanel}
        onToolClick={handleToolClick}
        position={toolbarPosition}
      />

      {config.map((tool) => {
        // Skip panel rendering if no component or component is null
        if (!tool.component) return null;

        // Render only if this tool is active
        return activePanel === tool.id ? (
          <Panel
            key={tool.id}
            isOpen={true}
            position={panelPos}
            from={toolbarPosition}
          >
            {typeof tool.component === "function" ? (
              <tool.component closePanel={closePanel} />
            ) : (
              tool.component
            )}
          </Panel>
        ) : null;
      })}
    </>
  );
}
