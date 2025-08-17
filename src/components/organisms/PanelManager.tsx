import { getPanelPosition } from "../../utils/getPanelPosition";
import { Toolbar } from "./Toolbar";
import { Panel } from "./Panel";
import { useState } from "react";
import { useStore } from "../../store/store";

export function PanelManager({ config, toolbarPosition = "left" }) {
  const [activePanel, setActivePanel] = useState(null);
  const [panelPos, setPanelPos] = useState(null);

  const deleteLayer = useStore((s) => s.removeLayer);

  const handleToolClick = (id, event) => {
    const tool = config.find((t) => t.id === id);

    // For momentary tools like delete, just flash active state
    const momentaryTools = ["group", "ungroup", "delete", "forward", "backward", "undo", "redo"];
    if (momentaryTools.includes(id)) {
      setActivePanel(id); // briefly show active
      setTimeout(() => setActivePanel(null), 400); // deselect after 150ms
    } else {
      // toggle panel normally
      setActivePanel((prev) => (prev === id ? null : id));
      if (tool && tool.component) {
        const rect = event.currentTarget.getBoundingClientRect();
        const panelSize = tool.panelSize || { width: 288, height: 300 };
        setPanelPos(getPanelPosition(toolbarPosition, rect, panelSize));
      }
    }

    // Tool actions
    if (id === "delete") deleteLayer();
    if (id === "undo") useStore.getState().undo();
    if (id === "redo") useStore.getState().redo();
    if (id === "draw") useStore.getState().setDrawingMode(true);
    if (id === "text") useStore.getState().addText({ text: "Msg" });
    if (id === "group") useStore.getState().groupLayers();
    if (id === "ungroup") useStore.getState().ungroupSelected();
    if (id === "forward") useStore.getState().bringForward();
    if (id === "backward") useStore.getState().sendBackward();
    if (id === "forwards") useStore.getState().bringToFront();
    if (id === "backwards") useStore.getState().sendToBack();
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
              {typeof tool.component === "function" ? (
                <tool.component closePanel={closePanel} />
              ) : (
                tool.component
              )}
            </Panel>
          )
      )}
    </>
  );
}

