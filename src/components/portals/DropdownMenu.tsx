import { useEffect, useRef, useState } from "react";
import { IconButton } from "../atoms/IconButton";

export const DropdownMenuItem = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
  >
    {children}
  </button>
);

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
      {/*<button onClick={() => setOpen(!open)}>{trigger}</button>*/}

      <IconButton
        icon={trigger}
        onClick={() => setOpen(!open)}
        title="Grid View"
      />

      {open && (
        <div className="z-1000 absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg ring-1 ring-black/10 dark:bg-gray-800 dark:text-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};


export default DropdownMenu;
