import db from "opendb-store";
import ZoomDropdown from "../molecules/ZoomDropdown.tsx";
import { IconButton } from "../atoms/IconButton.tsx";
import { useStore } from "../../store/store.ts";
import DownloadMenu from "./DownloadMenu.tsx";
import { Fullscreen } from "./FullScreen.tsx";
import { Link } from 'react-router-dom';

import { useState, useRef, useEffect } from "react";

export function DropdownMenu({ trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      {/*<button onClick={() => setOpen(!open)}>{trigger}</button>*/}

      <IconButton
          icon={<i className="fa-solid fa-ellipsis-vertical cursor-pointer"></i>}
          onClick={() => setOpen(!open)}
          title="Clear Board" />

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg ring-1 ring-black/10 dark:bg-gray-800 dark:text-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {children}
    </button>
  );
}

export const Header = () => {
    const canvas = useStore((s) => s.canvas);
    const setPageFormat = useStore((s) => s.setPageFormat);
    const pageFormat = useStore((s) => s.pageFormat);
    const setOrientation = useStore((s) => s.setOrientation);
    const orientation = useStore((s) => s.orientation);
    const toggleGrid = useStore((s) => s.toggleGrid);
    const [show, setShow] = useState(false);





    const handleClick = () => {
        const savedState = canvas.toJSON();
        db.local.set('drawJson', savedState);
    }

    const clearClick = () => {
        db.local.clear();
        canvas.clear();
        canvas.backgroundColor = "#FFF";
        canvas.requestRenderAll();
      };


    return <header className="fixed top-0 left-0 right-0 bg-stone-100 flex flex-row justify-between items-center z-50">
        <div className="flex flex-col w-full">
            <div className="flex items-center justify-between w-full shadow-sm  px-2">

                <img src="./fate.svg" alt="FateBoard Icon" className="h-10 cursor-pointer hidden md:block"/>
                <img src="./fateicon.svg" alt="FateBoard Icon" className="h-8 mx-2 cursor-pointer md:hidden"/>

                <div className="flex gap-4 p-2">

                    {/*<select*/}
                    {/*    value={orientation}*/}
                    {/*    onChange={(e) => setOrientation(e.target.value as any)}*/}
                    {/*  >*/}
                    {/*    <option value="portrait">Portrait</option>*/}
                    {/*    <option value="landscape">Landscape</option>*/}
                    {/*  </select>*/}

                    {/*<select*/}
                    {/*    value={pageFormat}*/}
                    {/*    onChange={(e) => setPageFormat(e.target.value as any)}*/}
                    {/*  >*/}
                    {/*    <option value="Freehand">Freehand</option>*/}
                    {/*    <option value="A4">A4</option>*/}
                    {/*    <option value="Letter">Letter</option>*/}
                    {/*    <option value="Legal">Legal</option>*/}
                    {/*  </select>*/}

                    {/*<ZoomDropdown canvas={canvas} />*/}


                    {/*<Fullscreen canvas={canvas} />*/}

                    {/*<IconButton*/}
                    {/*    icon={<i className="fa-solid fa-floppy-disk text-lg"></i>}*/}
                    {/*    onClick={handleClick}*/}
                    {/*    title="Save Board" />*/}



                    {/*<Link to="/setting"><IconButton icon={<i className="fa-solid fa-gear"></i> }*/}
                    {/*    onClick={() => console.log('done')}*/}
                    {/*    title="Setting" /></Link>*/}

                    {/*<IconButton icon={<i className="fa-solid fa-ellipsis-vertical"></i>}*/}
                    {/*            />*/}


                    <DownloadMenu canvas={canvas} />


                    <IconButton
                        active={show}
                        icon={<i className="fa-solid fa-table-cells text-lg"></i>}
                        onClick={() => {setShow(!show); toggleGrid()}}
                        title="Grid View" />

                    <IconButton
                        icon={<i className="fa-solid fa-plus text-lg"></i>}
                        onClick={clearClick}
                        title="Clear Board" />


                    <div>
                        <DropdownMenu
                          trigger={<i className="fa-solid fa-ellipsis-vertical cursor-pointer" />}
                        >
                          <DropdownMenuItem onClick={clearClick}>Create</DropdownMenuItem>
                          <DropdownMenuItem onClick={handleClick}>
                            Save
                          </DropdownMenuItem>
                          <DropdownMenuItem><Link to="/setting">Settings</Link></DropdownMenuItem>
                        </DropdownMenu>
                    </div>
                </div>

            </div>
            {/*<div className="p-2">*/}
            {/*    hi*/}
            {/*</div>*/}
        </div>
    </header>
}