import * as fabric from "fabric";
import { FONTS } from "@lib/const/fonts.ts";

export const createTextSlice = (set, get) => ({
  fonts: FONTS,
  fontSize: 16,
  bgColor: "#000000",
  setBgColor: (val) => set({ color: val }),
  setFontSize: (val) => set({ fontSize: val }),
  color: "#000000",
  hasShadow: false,
  setHasShadow: (val) => set({ hasShadow: val }),
  shadowColor: "",
  setShadowColor: (val) => set({ hasShadow: val }),
  setColor: (val) => set({ color: val }),
  fontFamily: "Arial",
  setFontFamily: (val) => set({ fontFamily: val }),
  isBold: false,
  setIsBold: (val) => set({ isBold: val }),
  isItalic: false,
  setIsItalic: (val) => set({ isItalic: val }),
  isUnderline: false,
  setIsUnderline: (val) => set({ isUnderline: val }),
  charSpacing: 0,
  setCharSpacing: (val) => set({ charSpacing: val }),
  lineHeight: 1.2,
  setLineHeight: (val) => set({ lineHeight: val }),
  strokeColor: "#000000",
  setStrokeColor: (val) => set({ strokeColor: val }),
  strokeWidth: 1,
  setStrokeWidth: (val) => set({ strokeWidth: val }),
  fillColor: "#000000",
  setFillColor: (val) => set({ fillColor: val }),
  addText: (textObj = {}) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const {
      text = "Enter text",             // placeholder text
      fontSize = 36,
      bold = false,
      italic = false,
      underline = false,
      fontFamily = "Bubblegum Sans",
      width = 300,
      textColor = "#000000",           // normal text color
      placeholderColor = "#9ca3af"     // lighter gray for placeholder
    } = textObj;

    const { pageWidth, pageHeight, scale } = get();
    const x = (pageWidth / 4) * scale;
    const y = (pageHeight / 2) * scale;

    const fabricText = new fabric.Textbox(text, {
      left: x,
      top: y,
      originX: "center",
      originY: "center",
      fontSize,
      fontWeight: bold ? "bold" : "normal",
      fontStyle: italic ? "italic" : "normal",
      underline,
      fill: placeholderColor,          // start with placeholder color
      fontFamily,
      width,
      editable: true,
      objectCaching: false,
      padding: 6,
      splitByGrapheme: true,
    });

    // ✅ Editing behavior
    fabricText.on("editing:entered", () => {
      if (fabricText.fill === placeholderColor) {
        fabricText.selectAll();
        fabricText.set("fill", textColor);
        canvas.requestRenderAll();
      }
    });

    fabricText.on("editing:exited", () => {
      if (!fabricText.text.trim()) {
        fabricText.text = text;  // restore placeholder
        fabricText.set("fill", placeholderColor);
      } else {
        fabricText.set("fill", textColor);
      }
      canvas.requestRenderAll();
    });

    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);

    // ✅ Enter editing immediately
    fabricText.enterEditing();
    setTimeout(() => {
      fabricText.hiddenTextarea?.focus();
      fabricText.selectAll();
    }, 0);

    // ✅ Sync with store + history
    set({ showTextToolbar: true, selectedObject: fabricText });
    get().saveState();
    canvas.requestRenderAll();
  },
})
