import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useStore } from "@store";
import { Select } from "../atoms/Select.tsx";
import { ToggleGroup } from "../molecules/ToggleGroup.tsx";
import { NumberInput } from "../atoms/NumberInput.tsx";
export function FloatingTextToolbar({ target, canvas, onChange }) {
  const fontSize = useStore(state => state.fontSize);
  const setFontSize = useStore(state => state.setFontSize);

  const color = useStore(state => state.color);
  const setColor = useStore(state => state.setColor);

  const fontFamily = useStore(state => state.fontFamily);
  const setFontFamily = useStore(state => state.setFontFamily);

  const isBold = useStore(state => state.isBold);
  const setIsBold = useStore(state => state.setIsBold);

  const isItalic = useStore(state => state.isItalic);
  const setIsItalic = useStore(state => state.setIsItalic);

  const isUnderline = useStore(state => state.isUnderline);
  const setIsUnderline = useStore(state => state.setIsUnderline);


  const fonts = useStore(s => s.fonts);
  const toolbarRef = useRef(null);

  // Sync toolbar state whenever target changes
  useEffect(() => {
    if (!target) return;
    setFontSize(target.fontSize || 16);
    setColor(target.fill || "#000000");

    console.log((target));

    setIsBold(target.fontWeight === "bold");
//    setIsItalic(target.fontWeight === "bold");
//    setIsBold(target.fontWeight === "bold");


//    setBold(target.fontWeight === "bold");
//    setItalic(target.fontStyle === "italic");
//    setUnderline(!!target.underline);
//    setFontFamily(target.fontFamily || "Arial");
  }, [target]);

  // Positioning toolbar below text object
  useLayoutEffect(() => {
    if (!target || !canvas || !toolbarRef.current) return;

    const toolbarEl = toolbarRef.current;

    const place = () => {
      if (!target || !toolbarEl) return;
      target.setCoords();

      const { tl, tr, bl, br } = target.aCoords;
      const cx = (tl.x + tr.x) / 2; // center X
      const by = (bl.y + br.y) / 2; // bottom Y

      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const px = vpt[0] * cx + vpt[2] * by + vpt[4];
      const py = vpt[1] * cx + vpt[3] * by + vpt[5];

      const canvasBox = canvas.getElement().getBoundingClientRect();
      const GAP = 8;
      const left = canvasBox.left + px;
      const top = canvasBox.top + py + GAP;

      const tb = toolbarEl.getBoundingClientRect();
      toolbarEl.style.position = "fixed";
      toolbarEl.style.left = `${left - tb.width / 2}px`;
      toolbarEl.style.top = `${top}px`;
      toolbarEl.style.zIndex = "500";
    };

    let rafId = null;
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        place();
      });
    };

    place();

    const events = [
      "object:moving",
      "object:scaling",
      "object:rotating",
      "object:modified",
      "mouse:wheel",
      "after:render",
    ];

    events.forEach((ev) => canvas.on(ev, schedule));
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      events.forEach((ev) => canvas.off(ev, schedule));
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [target, canvas]);

  if (!target) return null;

  const styleButton = (active) =>
    `w-6 h-6 flex items-center justify-center border rounded-md text-sm
     ${active ? "bg-gray-200 border-gray-400" : "hover:bg-gray-100"}`;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2"
    >
      {/* Color Picker */}
      <label className="relative cursor-pointer">
        <input
          type="color"
          value={color}
          onChange={(e) => {
            const val = e.target.value;
            setColor(val);
            onChange?.({ fill: val });
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div
          className="h-6 w-6 rounded-full border shadow-sm"
          style={{ backgroundColor: color }}
        />
      </label>

      {/* Font Selector */}
      {/*<select*/}
      {/*  value={fontFamily}*/}
      {/*  onChange={(e) => {*/}
      {/*    const val = e.target.value;*/}
      {/*    setFontFamily(val);*/}
      {/*    onChange?.({ fontFamily: val });*/}
      {/*  }}*/}
      {/*  className="border rounded-md px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"*/}
      {/*>*/}
      {/*  {fonts.map((font) => (*/}
      {/*    <option key={font} value={font} style={{ fontFamily: font }}>*/}
      {/*      {font}*/}
      {/*    </option>*/}
      {/*  ))}*/}
      {/*</select>*/}

      <Select
        onChange={(fontFamily) => {
          console.log(fontFamily);
          setFontFamily(fontFamily);
          onChange?.({ fontFamily: fontFamily });
        }}
        options={fonts} value={fontFamily} />

      {/* Font Size */}
      {/*<input*/}
      {/*  type="number"*/}
      {/*  value={fontSize}*/}
      {/*  onChange={(e) => {*/}
      {/*    const val = Number(e.target.value);*/}
      {/*    setFontSize(val);*/}
      {/*    onChange?.({ fontSize: val });*/}
      {/*  }}*/}
      {/*  className="w-12 border rounded-md px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"*/}
      {/*/>*/}

      <NumberInput
        value={fontSize}
        onChange={(fontSize) => {
          const val = parseInt(fontSize, 10);
          setFontSize(val);
          onChange?.({ fontSize: val });
        }}
       />

      {/* Styles */}

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
            onChange?.({
              fontWeight: bold ? "bold" : "normal",
              fontStyle: italic ? "italic" : "normal",
              underline: underline
            });
        }}
      />

      {/*<button*/}
      {/*  className={styleButton(bold)}*/}
      {/*  onClick={() => {*/}
      {/*    const newVal = !bold;*/}
      {/*    setBold(newVal);*/}
      {/*    onChange?.({ fontWeight: newVal ? "bold" : "normal" });*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <span className="font-bold">B</span>*/}
      {/*</button>*/}
      {/*<button*/}
      {/*  className={styleButton(italic)}*/}
      {/*  onClick={() => {*/}
      {/*    const newVal = !italic;*/}
      {/*    setItalic(newVal);*/}
      {/*    onChange?.({ fontStyle: newVal ? "italic" : "normal" });*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <span className="italic">I</span>*/}
      {/*</button>*/}
      {/*<button*/}
      {/*  className={styleButton(underline)}*/}
      {/*  onClick={() => {*/}
      {/*    const newVal = !underline;*/}
      {/*    setUnderline(newVal);*/}
      {/*    onChange?.({ underline: newVal });*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <span className="underline">U</span>*/}
      {/*</button>*/}
    </div>
  );
}

