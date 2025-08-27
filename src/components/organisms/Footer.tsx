// src/components/organisms/Footer.tsx
import { useState } from "react";
import { BorderControls } from "./BorderControls";
import { ColorPalette } from "./ColorPalette";
import { useStore } from "../../store/store";

export const Footer = () => {
  const canvas = useStore((state) => state.canvas);

//  const [borderStyle, setBorderStyle] = useState("solid");
//  const [borderWidth, setBorderWidth] = useState(2);
//  const [borderColor, setBorderColor] = useState("#111827");

  const {
    fill,
    stroke,
    strokeWidth,
    strokeStyle,
    styleOptions,
    setFill,
    setStroke,
    setStrokeWidth,
    setStrokeStyle,
  } = useStore();

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-stone-100 flex justify-between items-center p-2 overflow-y-scroll">
      <div className="flex items-center justify-between gap-4 w-full mx-2">
        <BorderControls
          canvas={canvas}
          borderStyle={strokeStyle}
          setBorderStyle={setStrokeStyle}
          borderWidth={strokeWidth}
          setBorderWidth={setStrokeWidth}
          borderColor={stroke}
          setBorderColor={setStroke}
          styleOptions={styleOptions}
        />
        <ColorPalette canvas={canvas} />
      </div>
    </footer>
  );
};
