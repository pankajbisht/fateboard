import { useState, useRef } from "react";
import { useStore } from "../../store";
import { useNavigate } from "react-router-dom";
import { ShapeToolsHeader } from "./ShapeToolsHeader.tsx";
import { IconButton } from "../atoms/IconButton.tsx";
import Brand from "../atoms/Brand.tsx";
import { TextToolsHeader } from "./TextToolsHeader.tsx";
import DropdownMenu, { DropdownMenuItem } from "../portals/DropdownMenu.tsx";
import { Tooltip } from "../molecules/Tooltip.tsx";

export function Header() {
  const navigate = useNavigate();
  const canvas = useStore((s) => s.canvas);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const clearBoard = useStore((s) => s.clearBoard);
  const [show, setShow] = useState(false);
  const fileInputRef = useRef(null);
  const { selectedObject } = useStore();

  console.log("Header:", selectedObject);

  const handleDownload = () => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON(["backgroundColor", "customId"]));
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "drawing.fateboard"; // <-- changed extension here
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target.result;
        const data = JSON.parse(json);
        canvas.clear();
        canvas.loadFromJSON(data, () => {
          canvas.requestRenderAll();
        });
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-stone-100 flex flex-row justify-between items-center z-50">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between w-full shadow-sm px-2">
          <Brand
            src="fate.svg"
            className="h-10 cursor-pointer hidden md:block"
          />
          <Brand src="fateicon.svg" className="h-8 cursor-pointer md:hidden" />

          <div className="flex gap-4 p-2">
            <input
              type="file"
              accept=".fateboard"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUpload}
            />

            <Tooltip position="bottom" content="Grid View">
              <IconButton
                active={show}
                icon={<i className="fa-solid fa-table-cells"></i>}
                onClick={() => {
                  setShow(!show);
                  toggleGrid();
                }}
                title="Grid View"
              />
            </Tooltip>

            {/* Clear Board */}
            <Tooltip position="bottom" content="Create New Board">
              <IconButton
                icon={<img src="/edit.svg" alt="New Draw" height="16" />}
                onClick={clearBoard}
                title="Grid View"
              />
            </Tooltip>

            <div className="flex items-center justify-center cursor-pointer hover:bg-stone-200 h-8 w-8 rounded-sm">
              <DropdownMenu
                trigger={
                  <i className="fa-solid fa-ellipsis-vertical cursor-pointer"></i>
                }
              >
                <DropdownMenuItem onClick={clearBoard}>Create</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  Save
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUploadClick}>
                  Load
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/command-palette")}>
                  Command Palette
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/setting")}>
                  Settings
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {selectedObject === "shape" && <ShapeToolsHeader />}

        {selectedObject && selectedObject?.type === "textbox" && (
          <TextToolsHeader />
        )}
      </div>
    </header>
  );
}
