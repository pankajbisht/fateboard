const TransformControls = ({ width, height, diameter, color, top, left, onChange }) => {
  return (
    <div className="flex flex-col gap-2 text-base">
      {width !== "" && (
        <div className="flex justify-between">
          <label className="text-stone-500 text-sm">Width</label>
          <input
            type="number"
            value={width}
            onChange={(e) => onChange("width", e.target.value)}
            className="border border-stone-500 p-1 w-24 rounded-lg"
          />
        </div>
      )}
      {height !== "" && (
        <div className="flex justify-between">
          <label className="text-stone-500 text-sm">Height</label>
          <input
            type="number"
            value={height}
            onChange={(e) => onChange("height", e.target.value)}
            className="border border-stone-500 p-1 w-24 rounded-lg"
          />
        </div>
      )}
      {diameter !== "" && (
        <div className="flex justify-between">
          <label className="text-stone-500 text-sm">Diameter</label>
          <input
            type="number"
            value={diameter}
            onChange={(e) => onChange("diameter", e.target.value)}
            className="border border-stone-500 p-1 w-24 rounded-lg"
          />
        </div>
      )}
      <div className="flex justify-between">
        <label className="text-stone-500 text-sm">Top</label>
        <input
          type="number"
          value={top}
          onChange={(e) => onChange("top", e.target.value)}
          className="border border-stone-500 p-1 w-24 rounded-lg"
        />
      </div>
      <div className="flex justify-between">
        <label className="text-stone-500 text-sm">Left</label>
        <input
          type="number"
          value={left}
          onChange={(e) => onChange("left", e.target.value)}
          className="border border-stone-500 p-1 w-24 rounded-lg"
        />
      </div>
      <div className="flex justify-between">
        <label className="text-stone-500 text-sm">Color</label>
        <input
          type="color"
          value={color || "#000000"}
          onChange={(e) => onChange("fill", e.target.value)}
          className="border border-stone-500 p-1 w-24 rounded-lg"
        />
      </div>
    </div>
  );
};

export default TransformControls;