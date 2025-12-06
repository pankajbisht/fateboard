import { useState, useEffect } from "react";
import { useStore } from "@store";
import { IconButton } from "../atoms/IconButton.tsx";
import { ColorPicker } from "../atoms/ColorPicker.tsx";
import { Select } from "../atoms/Select.tsx";
import { NumberInput } from "../atoms/NumberInput.tsx";
import { ToggleGroup } from "../molecules/ToggleGroup.tsx";

export const TextToolsHeader = () => {
    const { canvas } = useStore();
    const fontSize = useStore(state => state.fontSize);
    const setFontSize = useStore(state => state.setFontSize);

    const bgColor = useStore(state => state.bgColor);
    const setBgColor = useStore(state => state.setBgColor);

    const color = useStore(state => state.color);
    const setColor = useStore(state => state.setColor);

    const hasShadow = useStore(state => state.hasShadow);
    const setHasShadow = useStore(state => state.setHasShadow);

    const shadowColor = useStore(state => state.shadowColor);
    const setShadowColor = useStore(state => state.setShadowColor);

    const fontFamily = useStore(state => state.fontFamily);
    const setFontFamily = useStore(state => state.setFontFamily);

    const align = useStore(state => state.align);
    const setAlign = useStore(state => state.setAlign);

    const isBold = useStore(state => state.isBold);
    const setIsBold = useStore(state => state.setIsBold);

    const isItalic = useStore(state => state.isItalic);
    const setIsItalic = useStore(state => state.setIsItalic);

    const isUnderline = useStore(state => state.isUnderline);
    const setIsUnderline = useStore(state => state.setIsUnderline);


    const charSpacing = useStore(state => state.charSpacing);
    const setCharSpacing = useStore(state => state.setCharSpacing);


    const lineHeight = useStore(state => state.lineHeight);
    const setLineHeight = useStore(state => state.setLineHeight);

    const strokeWidth = useStore(state => state.strokeWidth);
    const setStrokeWidth = useStore(state => state.setStrokeWidth);

    const strokeColor = useStore(state => state.strokeColor);
    const setStrokeColor = useStore(state => state.setStrokeColor);

    const fillColor = useStore(state => state.fillColor);
    const setFillColor = useStore(state => state.setFillColor);


    const fonts = useStore(s => s.fonts);

  // 🔑 Apply updates to active text object
  const updateText = (props) => {
    const active = canvas?.getActiveObject();
    if (active && active.type.includes("text")) {
      active.set(props);
      canvas.requestRenderAll();
    }
  };

  // 🔑 Sync toolbar with selected text
  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active && active.type.includes("text")) {
        setFontSize(active.fontSize || 24);
        setFontFamily(active.fontFamily || "Arial");
//        setIsBold(active.fontWeight === "bold");
//        setIsItalic(active.fontStyle === "italic");
//        setIsUnderline(!!active.underline);
//        setAlign(active.textAlign || "left");
//        setFillColor(active.fill || "#000000");
//
//        if (active.shadow) {
//          setHasShadow(true);
//          setShadowColor(active.shadow.color || "#888888");
//        } else {
//          setHasShadow(false);
//        }
//
//        setStrokeWidth(active.strokeWidth || 0);
//        setStrokeColor(active.stroke || "#000000");
//        setLineHeight(active.lineHeight || 1.2);
//        setCharSpacing(active.charSpacing || 0);
//        setBgColor(active.backgroundColor || "");
      }
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);

    return () => {
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
    };
  }, [canvas]);

  return (
      <div className="flex flex-wrap gap-3 items-center p-3 border-b bg-white shadow-sm rounded-b-lg text-sm">

      <label className="text-xs">BG</label>
      <ColorPicker
        value={bgColor}
        className="border"
        onChange={(bgColor) => {
          setBgColor(color);
          updateText({ backgroundColor: bgColor });
        }} />

      <label className="text-xs">A</label>
      <ColorPicker
        value={fillColor}
        className="border"
        onChange={(color) => {
          setFillColor(color);
          updateText({ fill: color });
        }}/>

      <Select
        onChange={(fontFamily) => {
          console.log(fontFamily);
          setFontFamily(fontFamily);
          updateText({ fontFamily:fontFamily });
        }}
        options={fonts} value={fontFamily} />

      <NumberInput
        value={fontSize}
        onChange={(fontSize) => {
          const val = parseInt(fontSize, 10);
          setFontSize(val);
          updateText({ fontSize: val });
        }}
       />

       <ToggleGroup
         options={[
           { key: "bold", icon: "fa-solid fa-bold" },
           { key: "italic", icon: "fa-solid fa-italic" },
           { key: "underline", icon: "fa-solid fa-underline" },
         ]}
         onChange={(formats) => {
             console.log("formats:", formats)
             const { bold, italic, underline } = formats;

             setIsBold(bold);
             setIsItalic(italic);
             setIsUnderline(underline);

             updateText({ fontWeight: bold ? "bold" : "normal" });
             updateText({ fontStyle: italic ? "italic" : "normal" });
             updateText({ underline: underline });
         }}
       />

       <ToggleGroup
         single
         options={[
           { key: "left", icon: "fa-solid fa-align-left" },
           { key: "center", icon: "fa-solid fa-align-center" },
           { key: "right", icon: "fa-solid fa-align-right" },
           { key: "justify", icon: "fa-solid fa-align-justify" },
         ]}
         onChange={(formats) => {
           console.log("align:", formats)
           const { left, center, right, justify } = formats;
           let textAlign = "left"; // default fallback

           if (center) textAlign = "center";
           else if (right) textAlign = "right";
           else if (justify) textAlign = "justify";

           updateText({ textAlign: textAlign });
         }}
       />



      {/* Alignment */}

      {/* Text + Stroke Colors */}
      <div className="flex items-center gap-2">

        <label className="text-xs">Stroke</label>
        <ColorPicker
          value={strokeColor}
          onChange={(color) => {
            setStrokeColor(color);
            updateText({ stroke: color });
          }}/>

        <NumberInput
          max={10}
          value={strokeWidth}
          onChange={(strokeWidth) => {
            const val = parseInt(strokeWidth, 10);
            setStrokeWidth(val);
            updateText({ strokeWidth: val });
          }}
         />
      </div>

      {/* Shadow */}


      {/* Advanced Controls */}
      <div className="flex items-center gap-2">
        <label className="text-xs">Line</label>
        <NumberInput
          step={0.1}
          value={lineHeight}
          onChange={(lineHeight) => {
            const val = parseFloat(lineHeight, 10);
            setLineHeight(val);
            updateText({ lineHeight: val });
          }}
         />

        <label className="text-xs">Spacing</label>
        <NumberInput
          value={charSpacing}
          onChange={(charSpacing) => {
            const val = parseInt(charSpacing, 10);
            setCharSpacing(val);
            updateText({ charSpacing: val });
          }}
         />
      </div>

      <IconButton
        icon={<i className="fa-solid fa-square text-xs"></i>}
        onClick={() => {
          const newVal = !hasShadow;
          setHasShadow(newVal);
          updateText({
            shadow: newVal
              ? { color: shadowColor, blur: 5, offsetX: 2, offsetY: 2 }
              : null,
          });
        }}
        active={hasShadow}
        title="Shadow" />

      {hasShadow && (
        <ColorPicker
          value={shadowColor}
          onChange={(color) => {
            setShadowColor(color);
            updateText({
              shadow: { color: color, blur: 5, offsetX: 2, offsetY: 2 },
            });
          }}/>
      )}
    </div>
  );
};
