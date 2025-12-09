import { useEffect, useState, useCallback } from "react";
import { useStore } from "../../store";
import { PanelHeader } from "../molecules/PanelHeader.tsx";
import LabeledInput from "../atoms/LabeledInput.tsx";

export function TransformPanel({ closePanel }) {
  const canvas = useStore((s) => s.canvas);
  const [selectedObject, setSelectedObject] = useState(null);

  const [props, setProps] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
  });

  // ✅ Single source of truth for object → state sync
  const syncFromObject = useCallback(() => {
    if (!canvas) return;

    const obj = canvas.getActiveObject();
    setSelectedObject(obj);

    if (!obj) return;

    setProps({
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      angle: Math.round(obj.angle || 0),
    });
  }, [canvas]);

  // ✅ Live preview while dragging/scaling/rotating
  const syncLive = useCallback(() => {
    if (!canvas) return;

    const obj = canvas.getActiveObject();
    if (!obj) return;

    setProps({
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      angle: Math.round(obj.angle || 0),
    });
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    // Bind events
    canvas.on("selection:created", syncFromObject);
    canvas.on("selection:updated", syncFromObject);
    canvas.on("selection:cleared", syncFromObject);
    canvas.on("object:moving", syncLive);
    canvas.on("object:scaling", syncLive);
    canvas.on("object:rotating", syncLive);

    // Initial sync
    syncFromObject();

    return () => {
      canvas.off("selection:created", syncFromObject);
      canvas.off("selection:updated", syncFromObject);
      canvas.off("selection:cleared", syncFromObject);
      canvas.off("object:moving", syncLive);
      canvas.off("object:scaling", syncLive);
      canvas.off("object:rotating", syncLive);
    };
  }, [canvas, syncFromObject, syncLive]);

  // ✅ Single method for applying changes
  const updateProperty = (prop: string, rawValue: number) => {
    if (!selectedObject || !canvas) return;
    if (isNaN(rawValue)) return;

    let value = rawValue;

    if (prop === "width") {
      const base = selectedObject.width || 1;
      selectedObject.scaleX = value / base;
    } else if (prop === "height") {
      const base = selectedObject.height || 1;
      selectedObject.scaleY = value / base;
    } else {
      selectedObject.set(prop, value);
    }

    canvas.requestRenderAll();
    setProps((prev) => ({ ...prev, [prop]: value }));
  };

  return (
    <div className="w-64 space-y-3 rounded-md p-3">
      <PanelHeader title="Transform" onClose={closePanel} />

      {/* Empty state */}
      {!selectedObject && (
        <div className="text-gray-400 text-xs">No object selected</div>
      )}

      {/* Position */}
      <div className="flex gap-4">
        {(["left", "top"] as const).map((key) => (
          <LabeledInput
            key={key}
            label={key === "left" ? "X" : "Y"}
            value={props[key]}
            disabled={!selectedObject}
            onChange={(val) => updateProperty(key, val)}
          />
        ))}
      </div>

      {/* Size */}
      <div className="flex gap-4">
        {(["width", "height"] as const).map((key) => (
          <LabeledInput
            key={key}
            label={key === "width" ? "W" : "H"}
            value={props[key]}
            disabled={!selectedObject}
            onChange={(val) => updateProperty(key, val)}
          />
        ))}
      </div>

      {/* Rotation */}
      <LabeledInput
        label="R"
        value={props.angle}
        disabled={!selectedObject}
        onChange={(val) => updateProperty("angle", val)}
      />
    </div>
  );
}
