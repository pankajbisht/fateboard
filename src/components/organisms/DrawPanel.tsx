import { useEffect } from "react";
import { useStore } from "../../store/store.ts";
import * as fabric from "fabric";
import { PanelHeader } from "../molecules/PanelHeader.tsx";

export function DrawPanel({ closePanel }: { closePanel: () => void }) {
  const canvas = useStore((s) => s.canvas);
  const isDrawing = useStore((s) => s.isDrawing);
  const setDrawingMode = useStore((s) => s.setDrawingMode);
  const brushColor = useStore((s) => s.brushColor);
  const setBrushColor = useStore((s) => s.setBrushColor);
  const brushWidth = useStore((s) => s.brushWidth);
  const setBrushWidth = useStore((s) => s.setBrushWidth);
  const brushType = useStore((s) => s.brushType);
  const setBrushType = useStore((s) => s.setBrushType);
  const setBrush = useStore((s) => s.setBrush);
  const undo = useStore((s) => s.undo);

  // Attach path:created listener once
  useEffect(() => {
    if (!canvas) return;
    const handlePathCreated = () => useStore.getState().pushState();
    canvas.on("path:created", handlePathCreated);

    return () => canvas.off("path:created", handlePathCreated);
  }, [canvas]);

  // Update freeDrawingBrush whenever settings change
  useEffect(() => {
    if (!canvas) return;

    if (isDrawing) {
      let brush;

      switch (brushType) {
        case "Circle":
          brush = new fabric.CircleBrush(canvas);
          break;
        case "Spray":
          brush = new fabric.SprayBrush(canvas);
          break;
        default:
          brush = new fabric.PencilBrush(canvas);
      }

      brush.color = brushColor;
      brush.width = brushWidth;
      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [canvas, isDrawing, brushColor, brushWidth, brushType]);

  return (
    <div className="bg-gray-100 w-64">
      <PanelHeader title="Draw" onClose={closePanel} />

      {/* Brush Color */}
      <div className="mb-3 flex justify-between">
        <label className="block text-sm font-medium mb-1">Brush Color</label>
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          className="w-6 h-6 p-0"
        />
      </div>

      {/* Brush Width */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Brush Width</label>
        <input
          type="range"
          min="1"
          max="50"
          value={brushWidth}
          onChange={(e) => setBrushWidth(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Brush Type */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Brush Type</label>
        <select
          value={brushType}
          onChange={(e) => setBrush(brushColor, brushWidth, e.target.value)}
          className="w-full border rounded p-1"
        >
          <option value="Pencil">Pencil</option>
          <option value="Circle">Circle</option>
          <option value="Spray">Spray</option>
        </select>
      </div>
    </div>
  );
}
