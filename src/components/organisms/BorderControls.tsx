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
  styleOptions
}) {
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
