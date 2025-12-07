import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import db from "opendb-store";

import { useStore } from "@store";
import { useKeyboardShortcuts } from "@hooks";
import { FloatingTextToolbar } from "./FloatingTextToolbar.tsx";


export function CanvasBoard() {
  const canvasRef = useRef(null);
  const { init, selectedObject, canvas } = useStore();
  useKeyboardShortcuts();

  useEffect(() => {
    if (canvasRef.current) {
      init(canvasRef.current);
    }

    return () => {
      if (canvas) {
          canvas.dispose();
      }
    }
  }, [init]);

  return (
    <main className="bg-white shadow-lg relative">
      <canvas ref={canvasRef} />

      {selectedObject?.type === "textbox" && canvas && (
        <FloatingTextToolbar
          target={selectedObject}
          canvas={canvas}
          onChange={(style) => {
           console.log("style..", style);

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

