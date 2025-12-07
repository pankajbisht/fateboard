import { useState } from "react";
import { useStore } from "@store";
import { BorderControls } from "./BorderControls";
import { ColorPalette } from "./ColorPalette";

export const Footer = () => {
  const canvas = useStore((state) => state.canvas);
  const [isToolbar, setIsToolbar] = useState(false);
  const {
    fill,
    stroke,
    strokeWidth,
    strokeStyle,
    strokeStyleList,
    setFill,
    setStroke,
    setStrokeWidth,
    setStrokeStyle,
  } = useStore();

  return (
    <footer className="border-t border-gray-200 fixed bottom-0 left-0 right-0 bg-stone-100 p-2 overflow-y-scroll flex flex-col">
      {/* {isToolbar && (
        <div className="mx-2 flex justify-center overflow-y-scroll">
          <button
            onClick={() => setShow((prev) => !prev)}
            aria-label="Toggle color palette"
            className={`
              rounded-full flex items-center justify-center cursor-pointer
              transition-colors duration-200 h-8 w-8 p-2 shadow-sm
              ${isToolbar
                ? 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-400'
                : 'hover:bg-stone-200 focus:ring-2 focus:ring-stone-300'}
            `}
          >
            <i className="fa-solid fa-palette"></i>
          </button>
        </div>
      )} */}

      <div className="flex justify-between items-center">
        <div className="flex items-center justify-between gap-4 w-full mx-2">
          <BorderControls
            canvas={canvas}
            borderStyle={strokeStyle}
            setBorderStyle={setStrokeStyle}
            borderWidth={strokeWidth}
            setBorderWidth={setStrokeWidth}
            borderColor={stroke}
            setBorderColor={setStroke}
            strokeStyleList={strokeStyleList}
          />
          <ColorPalette canvas={canvas} isToolbar={isToolbar} setIsToolbar={setIsToolbar}/>
        </div>
      </div>
    </footer>
  );
};
