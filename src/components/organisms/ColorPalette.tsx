import { useEffect, useState } from "react";
import tailwindcolors from 'tailwindcss/colors';


export default function ColorPalette({ canvas }) {
  const colors = [
    tailwindcolors.red[500], // Red
    tailwindcolors.green[500], // Green
    tailwindcolors.blue[500], // Blue
    tailwindcolors.yellow[500], // Yellow
    tailwindcolors.fuchsia[500], // Magenta
    tailwindcolors.cyan[500], // Cyan
    tailwindcolors.black, // Black
    tailwindcolors.white, // Black
  ];

  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [customColor, setCustomColor] = useState(tailwindcolors.black);
  const [selectedObject, setSelectedObject] = useState(null);

  // Update selected object state when selection changes
  const updateSelectedObject = (object) => {
    if (!object) {
      setSelectedObject(null);
      setSelectedColor(tailwindcolors.black);
      return;
    }

    setSelectedObject(object);
    setSelectedColor(object.fill || tailwindcolors.black);
  };

  // Listen to Fabric.js events
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

  // Apply selected color to the active object
  useEffect(() => {
    if (selectedObject && canvas) {
      selectedObject.set("fill", selectedColor);
      canvas.requestRenderAll();
    }
  }, [selectedColor, selectedObject, canvas]);

  return (
    <div>
      <ul className="flex gap-2 items-center">
        {colors.map((color) => (
          <li
            key={color}
            className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
              selectedColor === color ? "border-gray-700" : "border-transparent"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setSelectedColor(color)}
          />
        ))}

        <li>
          <input
            type="color"
            className={`w-8 h-8 rounded-full cursor-pointer align-middle ${
              selectedColor === customColor
                ? "border-2 border-gray-700"
                : "border-2 border-transparent"
            }`}
            value={customColor}
            onChange={(e) => {
              const pickedColor = e.target.value;
              setCustomColor(pickedColor);
              setSelectedColor(pickedColor);
            }}
          />
        </li>
      </ul>
    </div>
  );
}
