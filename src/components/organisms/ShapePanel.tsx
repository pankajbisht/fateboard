import { useState } from "react";
import { useShapeFactory } from "../../hooks/useShapeFactory";
import { PanelHeader } from "../molecules/PanelHeader.tsx";
import { useStore } from "../../store/store";


export function ShapePanel({ closePanel }) {
//  const [fill, setFill] = useState("#ffffff");
//  const [stroke, setStroke] = useState("#111827");
//  const [strokeWidth, setStrokeWidth] = useState(2);

const {
  fill,
  stroke,
  strokeWidth,
  strokeStyle,
  styleOptions,
  setFill,
  setStroke,
  setStrokeWidth,
  setStrokeStyle,
} = useStore();

  const { shapesList, add, enableLineDrawing, disableLineDrawing } = useShapeFactory();

  const commonProps = { fill, stroke, strokeWidth };

  function handleAddShape(type) {
    if (type === "line") {
      enableLineDrawing(commonProps);
    } else {
      add(type, commonProps);
    }

    closePanel?.();
  }

  return (
    <div className="space-y-3 w-64 relative rounded">
      <PanelHeader title="Shapes" onClose={closePanel} />

      <div className="grid grid-cols-5">
        {shapesList.map((shape) => (
          <button
            key={shape.type}
            className="rounded-sm hover:bg-gray-200 h-8 w-8 cursor-pointer"
            onClick={() => handleAddShape(shape.type)}
            title={shape.type}
          >
            <i className={shape.icon}></i>
          </button>
        ))}
      </div>

      <div className="h-px bg-gray-200" />

      <div className="space-y-2">
        <label className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Fill</span>
          <input
            type="color"
            value={fill}
            onChange={(e) => setFill(e.target.value)}
            className="w-6 h-6 p-0 rounded outline-0 focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Stroke</span>
          <input
            type="color"
            value={stroke}
            onChange={(e) => setStroke(e.target.value)}
            className="w-6 h-6 p-0 rounded outline-0 focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Stroke Width</span>
          <input
            type="range"
            min="0"
            max="16"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-28"
          />
        </label>
      </div>
    </div>
  );
}

