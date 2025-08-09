import { useEffect, useState } from "react";

export default function BorderControls({ canvas }) {
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState("#000000");
  const [borderStyle, setBorderStyle] = useState("solid");
  const [selectedObject, setSelectedObject] = useState(null);

  // Update UI when a new object is selected
  const updateSelectedObject = (object) => {
    if (!object) {
      setSelectedObject(null);
      setBorderColor("#000000");
      setBorderWidth(1);
      setBorderStyle("solid");
      return;
    }

    setSelectedObject(object);

    setBorderColor(object.stroke || "#000000");
    setBorderWidth(object.strokeWidth || 1);

    // Detect style from strokeDashArray
    if (!object.strokeDashArray || object.strokeDashArray.length === 0) {
      setBorderStyle("solid");
    } else if (object.strokeDashArray[0] === 5) {
      setBorderStyle("dashed");
    } else if (object.strokeDashArray[0] === 1) {
      setBorderStyle("dotted");
    } else {
      setBorderStyle("solid");
    }
  };

  // Listen to Fabric.js selection changes
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

  // Apply border settings to the active object
  useEffect(() => {
    if (!selectedObject || !canvas) return;

    selectedObject.set({
      stroke: borderColor,
      strokeWidth: borderWidth,
      strokeDashArray:
        borderStyle === "solid"
          ? null
          : borderStyle === "dashed"
          ? [5, 5]
          : borderStyle === "dotted"
          ? [1, 5]
          : null,
    });

    canvas.requestRenderAll();
  }, [borderColor, borderWidth, borderStyle, selectedObject, canvas]);

  return (
    <div className="flex items-center gap-2">
      {/* Border Style Selector */}
      <select
        className="border p-1"
        value={borderStyle}
        onChange={(e) => setBorderStyle(e.target.value)}
      >
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
        <option value="dotted">Dotted</option>
      </select>

      {/* Border Width */}
      <input
        type="number"
        className="border w-10 p-1"
        value={borderWidth}
        onChange={(e) => setBorderWidth(Number(e.target.value))}
      />

      {/* Border Color */}
      <input
        type="color"
        className="w-6 h-6 p-0 border-0 rounded-full cursor-pointer"
        value={borderColor}
        onChange={(e) => setBorderColor(e.target.value)}
      />

      {/* Preview Box */}
      {/*<div*/}
      {/*  className="w-12 h-12"*/}
      {/*  style={{*/}
      {/*    border: `${borderWidth}px ${borderStyle} ${borderColor}`,*/}
      {/*  }}*/}
      {/*/>*/}
    </div>
  );
}
