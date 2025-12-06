import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../../store";
import { useNavigate } from "react-router-dom";
import { ShapeToolsHeader } from "./ShapeToolsHeader.tsx";
import DownloadMenu from "./DownloadMenu.tsx";
import {IconButton} from "../atoms/IconButton.tsx";
import {TextToolsHeader} from "./TextToolsHeader.tsx";

export function Header() {
  const navigate = useNavigate();
  const canvas = useStore((s) => s.canvas);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const clearBoard = useStore((s) => s.clearBoard);
  const [show, setShow] = useState(false);
  const fileInputRef = useRef(null);
  const { selectedObject } = useStore();


  // -------------------- DropdownMenu --------------------
  const DropdownMenu = ({ trigger, children }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="relative inline-block" ref={ref}>
        <button onClick={() => setOpen(!open)}>{trigger}</button>
        {open && (
          <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg ring-1 ring-black/10 dark:bg-gray-800 dark:text-gray-100">
            {children}
          </div>
        )}
      </div>
    );
  };

  const DropdownMenuItem = ({ children, onClick }) => (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {children}
    </button>
  );

  // -------------------- Save / Load --------------------
  // -------------------- Save / Load --------------------
const handleDownload = () => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON(['backgroundColor', 'customId']));
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
          <img src="./fate.svg" alt="FateBoard Icon" className="h-10 cursor-pointer hidden md:block" />
          <img src="./fateicon.svg" alt="FateBoard Icon" className="h-8 mx-2 cursor-pointer md:hidden" />

          <div className="flex gap-4 p-2">
            {/* <IconButton
              icon={<i className="fa-solid fa-download text-lg"></i>}
              onClick={handleDownload}
              title="Download Drawing" /> */}

            {/* <IconButton
              icon={<i className="fa-solid fa-upload text-lg"></i>}
              onClick={handleUploadClick}
              title="Download Drawing" /> */}

            {/* <IconButton
              icon={<i className="fa-solid fa-upload text-lg"></i>}
              onClick={handleUploadClick}
              title="Download Drawing" /> */}

            <input
              type="file"
              accept=".fateboard"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUpload}
            />

            {/* Grid Toggle */}
            <IconButton
              active={show}
              icon={<i className="fa-solid fa-table-cells"></i>}
              onClick={() => { setShow(!show); toggleGrid(); }}
              title="Grid View" />

            {/*<DownloadMenu canvas={canvas} />*/}

            {/* Clear Board */}
            <IconButton
              icon={<img src="/edit.svg" alt="New Draw" height="16" />}
              onClick={clearBoard}
              title="Grid View" />

            {/* Dropdown Menu */}
            <div className="flex items-center justify-center cursor-pointer hover:bg-stone-200 h-8 w-8">
              <DropdownMenu trigger={<i className="fa-solid fa-ellipsis-vertical cursor-pointer"></i>}>
                <DropdownMenuItem onClick={clearBoard}>Create</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>Save</DropdownMenuItem>
                <DropdownMenuItem onClick={handleUploadClick}>Load</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/command-palette")}>Command Palette</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/setting")}>Settings</DropdownMenuItem>
              </DropdownMenu>
            </div>


          </div>
        </div>

        {/* {
          selectedObject === "textbox" ?? <TextToolsHeader />
        } */}

        {/* {
          selectedObject === "shape" ?? <ShapeToolsHeader />
        } */}
      </div>
    </header>
  );
}
