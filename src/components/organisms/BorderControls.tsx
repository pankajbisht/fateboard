// molecules/BorderControl.jsx
import { Dropdown } from "../atoms/Dropdown";
import { ColorPicker } from "../atoms/ColorPicker";
import { NumberInput } from "../atoms/NumberInput";

export function BorderControls({
  borderStyle,
  setBorderStyle,
  borderWidth,
  setBorderWidth,
  borderColor,
  setBorderColor,
}) {
  const styleOptions = [
    { value: "solid", label: "Solid" },
    { value: "dashed", label: "Dashed" },
    { value: "dotted", label: "Dotted" },
    { value: "double", label: "Double" },
    { value: "groove", label: "Groove" },
  ];

  return (
    <div className="flex items-center gap-2">
      <Dropdown
        options={styleOptions}
        value={borderStyle}
        onChange={setBorderStyle}
        preview={
          <div
            className="w-6 h-6 border"
            style={{
              borderStyle,
              borderWidth: `${borderWidth}px`,
              borderColor,
            }}
          />
        }
      />

      <NumberInput value={borderWidth} onChange={setBorderWidth} min={1} max={16} />
      <ColorPicker value={borderColor} onChange={setBorderColor} />
    </div>
  );
}
