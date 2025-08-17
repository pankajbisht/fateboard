import { useState, useEffect, useRef } from "react";

const ZoomDropdown = ({ canvas }) => {
  const [zoom, setZoom] = useState(1); // default zoom = 100%
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleZoomChange = (level) => {
    setZoom(level);
    if (canvas) {
      canvas.setZoom(level); // apply zoom
      canvas.renderAll();
    }
    setOpen(false);
  };

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100"
      >
        <i className="fa-solid fa-magnifying-glass"></i>
        <span>{Math.round(zoom * 100)}%</span>
      </button>

      {/* Dropdown */}
      {/*<div className="absolute right-0 mt-1 w-28 bg-white shadow-md z-50 text-sm text-stone-800">*/}
      {open && (
        <div className="absolute right-0 mt-1 w-24 bg-white shadow-md z-50 text-sm">
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((level) => (
            <button
              key={level}
              onClick={() => handleZoomChange(level)}
              className={`w-full text-left px-3 py-1 hover:bg-gray-100 ${
                zoom === level ? "bg-gray-200 font-medium" : ""
              }`}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZoomDropdown;
