import { useState } from "react";

const ZoomDropdown = ({ canvas }) => {
  const [zoom, setZoom] = useState(1); // default zoom = 100%

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);

    if (canvas) {
      canvas.setZoom(newZoom); // apply zoom
      canvas.renderAll();
    }
  };

  return (
    <select
      value={zoom}
      onChange={handleZoomChange}
      className="border p-1 rounded-md"
    >
      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((level) => (
        <option key={level} value={level}>
          {Math.round(level * 100)}%
        </option>
      ))}
    </select>
  );
};

export default ZoomDropdown;
