import { useEffect, useState } from "react";
import { useStore } from "../../store";
import {PanelHeader} from "../molecules/PanelHeader.tsx";

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

  useEffect(() => {
    if (!canvas) return;

    const updateSelected = () => {
      const obj = canvas.getActiveObject();
      setSelectedObject(obj);

      if (obj) {
        setProps({
          left: obj.left || 0,
          top: obj.top || 0,
          width: (obj.width || 0) * (obj.scaleX || 1),
          height: (obj.height || 0) * (obj.scaleY || 1),
          angle: obj.angle || 0,
        });
      }
    };

    const updatePropsLive = () => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      setProps({
        left: obj.left || 0,
        top: obj.top || 0,
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
        angle: obj.angle || 0,
      });
    };

    canvas.on("selection:created", updateSelected);
    canvas.on("selection:updated", updateSelected);
    canvas.on("selection:cleared", updateSelected);
    canvas.on("object:moving", updatePropsLive);
    canvas.on("object:scaling", updatePropsLive);
    canvas.on("object:rotating", updatePropsLive);

    updateSelected();

    return () => {
      canvas.off("selection:created", updateSelected);
      canvas.off("selection:updated", updateSelected);
      canvas.off("selection:cleared", updateSelected);
      canvas.off("object:moving", updatePropsLive);
      canvas.off("object:scaling", updatePropsLive);
      canvas.off("object:rotating", updatePropsLive);
    };
  }, [canvas]);

  const updateProperty = (prop, value) => {
    if (!selectedObject || !canvas) return;

    if (prop === "width") {
      selectedObject.scaleX = value / (selectedObject.width || 1);
    } else if (prop === "height") {
      selectedObject.scaleY = value / (selectedObject.height || 1);
    } else {
      selectedObject.set(prop, value);
    }

    canvas.requestRenderAll();
    setProps((prev) => ({ ...prev, [prop]: value }));
  };

  return (
    <div className="w-64 space-y-4 rounded">
      <PanelHeader title="Transform" onClose={closePanel} />

      {/* Message if nothing selected */}
      {!selectedObject && (
        <div className="text-gray-500 text-sm mb-2">No object selected</div>
      )}

      {/* Position */}
      <div className="flex gap-2">
        {["left", "top"].map((key, i) => (
          <div key={i} className="flex flex-col">
            <label className="text-sm">{key.toUpperCase()}</label>
            <input
              type="number"
              value={props[key]}
              disabled={!selectedObject}
              onChange={(e) =>
                updateProperty(key, parseFloat(e.target.value))
              }
              className="border rounded p-1 w-full disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        ))}
      </div>

      {/* Size */}
      <div className="flex gap-2">
        {["width", "height"].map((key, i) => (
          <div key={i} className="flex flex-col">
            <label className="text-sm">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
            <input
              type="number"
              value={props[key]}
              disabled={!selectedObject}
              onChange={(e) =>
                updateProperty(key, parseFloat(e.target.value))
              }
              className="border rounded p-1 w-full disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        ))}
      </div>

      {/* Rotation */}
      <div className="flex flex-col">
        <label className="text-sm">Rotation</label>
        <input
          type="number"
          value={props.angle}
          disabled={!selectedObject}
          onChange={(e) => updateProperty("angle", parseFloat(e.target.value))}
          className="border rounded p-1 w-full disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>
    </div>
  );
}
