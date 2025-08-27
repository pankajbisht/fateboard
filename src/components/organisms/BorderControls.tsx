// molecules/BorderControl.jsx
import { Dropdown } from "../atoms/Dropdown";
import { ColorPicker } from "../atoms/ColorPicker";
import { NumberInput } from "../atoms/NumberInput";
import { useState } from "react";
import {IconButton} from "../atoms/IconButton.tsx";
import { useStore } from "../../store/store";


export function BorderControls({
  borderStyle,
  setBorderStyle,
  borderWidth,
  setBorderWidth,
  borderColor,
  setBorderColor,
  styleOptions
}) {
  const [show, setShow] = useState(false);
  const toggleFullscreen = useStore(state => state.toggleFullscreen);
  const isFullScreen = useStore(state => state.isFullScreen);

  return (
    <div className="flex items-center gap-2">
      {/* Toggle button (always visible) */}

      <button onClick={toggleFullscreen}
        className={`rounded-full flex items-center justify-center cursor-pointer transition h-8 w-8 p-2
        ${isFullScreen ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-stone-200'}`}>
        <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
      </button>

      <button onClick={() => setShow((prev) => !prev)}
        className={`rounded-full flex items-center justify-center cursor-pointer transition h-8 w-8 p-2
        ${show ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-stone-200'}`}>
        <i className="fa-solid fa-paintbrush"></i>
      </button>

      {/* Conditionally render controls */}
      {show && (
        <>
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

          <NumberInput
            value={borderWidth}
            onChange={setBorderWidth}
            min={1}
            max={16}
          />

          <ColorPicker value={borderColor} onChange={setBorderColor} />
        </>
      )}
    </div>
  );
}
