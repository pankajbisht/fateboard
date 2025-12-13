import { useEffect, useState } from "react";
import tailwindcolors from "tailwindcss/colors";
import { ColorButton } from "../atoms/ColorButton";
import { Tooltip } from "../molecules/Tooltip";

export const ColorPalette = ({ canvas, isToolbar, setIsToolbar }) => {
  const colors = [
    tailwindcolors.red[500],
    tailwindcolors.green[500],
    tailwindcolors.blue[500],
    tailwindcolors.yellow[500],
    tailwindcolors.fuchsia[500],
    tailwindcolors.cyan[500],
    tailwindcolors.white,
  ];

  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [customColor, setCustomColor] = useState("#000000");
  const [selectedObject, setSelectedObject] = useState(null);
  const [show, setShow] = useState(false);

  const updateSelectedObject = (object) => {
    if (!object) {
      setSelectedObject(null);
      setSelectedColor("#000000");
      return;
    }
    setSelectedObject(object);
    setSelectedColor(object.fill || "#000000");
  };

  useEffect(() => {
    if (!canvas) return;

    const onCreated = (e) => updateSelectedObject(e.selected[0]);
    const onUpdated = (e) => updateSelectedObject(e.selected[0]);
    const onCleared = () => updateSelectedObject(null);
    const onModified = (e) => updateSelectedObject(e.target);

    canvas.on("selection:created", onCreated);
    canvas.on("selection:updated", onUpdated);
    canvas.on("selection:cleared", onCleared);
    canvas.on("object:modified", onModified);

    return () => {
      canvas.off("selection:created", onCreated);
      canvas.off("selection:updated", onUpdated);
      canvas.off("selection:cleared", onCleared);
      canvas.off("object:modified", onModified);
    };
  }, [canvas]);

  useEffect(() => {
    if (selectedObject && canvas) {
      selectedObject.set("fill", selectedColor);
      canvas.requestRenderAll();
    }
  }, [selectedColor, selectedObject, canvas]);

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Color palette (shown only when show = true) */}
      {show && (
        <div className="flex items-center gap-1 rounded">
          {colors.map((color) => (
            <ColorButton
              key={color}
              color={color}
              isSelected={selectedColor === color}
              onClick={() => setSelectedColor(color)}
            />
          ))}

          {/* Custom color */}
          <input
            type="color"
            className="w-6 h-6 rounded-full border-2 cursor-pointer p-0"
            value={customColor}
            onChange={(e) => {
              const picked = e.target.value;
              setCustomColor(picked);
              setSelectedColor(picked);
            }}
            style={{
              borderColor:
                selectedColor === customColor ? "#374151" : "transparent",
            }}
          />
        </div>
      )}

      {/* Toggle button (always visible) */}
      <Tooltip content="Color Tool">
          <button onClick={() => setShow((prev) => !prev)}
            className={`rounded-full flex items-center justify-center cursor-pointer transition h-8 w-8 p-2
            ${show ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-stone-200'}`}>
            <i className="fa-solid fa-palette"></i>
          </button>
      </Tooltip>

      <Tooltip content="More Tool">
      <button
        onClick={() => setIsToolbar((prev) => !prev)}
        className={`rounded-full flex items-center justify-center cursor-pointer transition h-8 w-8 p-2
          ${isToolbar ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-stone-200'}`}
      >
        <i
          className={`fa-solid ${isToolbar ? 'fa-angle-up' : 'fa-angle-down'}`}
        ></i>
      </button>
      </Tooltip>


    </div>
  );
};
