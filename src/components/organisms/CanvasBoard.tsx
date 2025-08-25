import { useEffect, useRef } from "react";
import db from "opendb-store";
import * as fabric from "fabric";
import { useStore } from "../../store/store.ts";
import { FloatingTextToolbar } from "./FloatingTextToolbar.tsx";

export function CanvasBoard() {
  const canvasRef = useRef(null);
  const setCanvas = useStore((s) => s.setCanvas);
  const saveState = useStore((s) => s.saveState);
  const selectedObject = useStore((s) => s.selectedObject);
  const canvas = useStore((s) => s.canvas);
  const applyPageSize = useStore((s) => s.applyPageSize);
  const pageFormat = useStore((s) => s.pageFormat);
  const orientation = useStore((s) => s.orientation);
  const setPageFormat = useStore((s) => s.setPageFormat);
  const setActiveTool = useStore(s => s.setActiveTool);



  useEffect(() => {
    const canvasInstance = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 500,
      backgroundColor: "#fff",
      preserveObjectStacking: false
    });

    const saved = db.local.get("drawJson");
    if (saved) {
      canvasInstance.loadFromJSON(saved, () => {
        canvasInstance.requestRenderAll();
      });
    }

    setCanvas(canvasInstance);
    applyPageSize(pageFormat, orientation);
    setPageFormat("freehand");
//    setActivePanel("select")
//    setActiveTool("select")
    const saveOnChange = () => {
      saveState();
      db.local.set("drawJson", canvasInstance.toJSON());
    };

    canvasInstance.on("object:added", saveOnChange);
    canvasInstance.on("object:modified", saveOnChange);
    canvasInstance.on("object:removed", saveOnChange);

    return () => {
      canvasInstance.off("object:added", saveOnChange);
      canvasInstance.off("object:modified", saveOnChange);
      canvasInstance.off("object:removed", saveOnChange);
      canvasInstance.dispose();
    };
  }, [setCanvas, saveState]);

  return (
    <main className="bg-white shadow-lg relative">
      <canvas ref={canvasRef} />

      {selectedObject?.type === "textbox" && canvas && (
        <FloatingTextToolbar
          target={selectedObject}
          canvas={canvas}
          onChange={(style) => {

            console.log(style);

            if (selectedObject) {
              selectedObject.set(style);
              canvas.requestRenderAll();
            }
          }}
        />
      )}
    </main>
  );
}

