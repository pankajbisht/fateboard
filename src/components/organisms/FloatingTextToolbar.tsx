import { useState, useRef, useLayoutEffect, useEffect } from "react";
export function FloatingTextToolbar({ target, canvas, onChange }) {
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState("#000000");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [fontFamily, setFontFamily] = useState("Arial");

  const toolbarRef = useRef(null);

  const commonFonts = [
    "Arial",
    "Bubblegum Sans",
    "Comic Neue",
    "Consolas",
    "Courier New",
    "Fredoka One",
    "Georgia",
    "Helvetica",
    "Monaco",
    "Palatino",
    "Patrick Hand",
    "Tahoma",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
  ];

  // Sync toolbar state whenever target changes
  useEffect(() => {
    if (!target) return;
    setFontSize(target.fontSize || 16);
    setColor(target.fill || "#000000");
    setBold(target.fontWeight === "bold");
    setItalic(target.fontStyle === "italic");
    setUnderline(!!target.underline);
    setFontFamily(target.fontFamily || "Arial");
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
      <select
        value={fontFamily}
        onChange={(e) => {
          const val = e.target.value;
          setFontFamily(val);
          onChange?.({ fontFamily: val });
        }}
        className="border rounded-md px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {commonFonts.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <input
        type="number"
        value={fontSize}
        onChange={(e) => {
          const val = Number(e.target.value);
          setFontSize(val);
          onChange?.({ fontSize: val });
        }}
        className="w-12 border rounded-md px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Styles */}
      <button
        className={styleButton(bold)}
        onClick={() => {
          const newVal = !bold;
          setBold(newVal);
          onChange?.({ fontWeight: newVal ? "bold" : "normal" });
        }}
      >
        <span className="font-bold">B</span>
      </button>
      <button
        className={styleButton(italic)}
        onClick={() => {
          const newVal = !italic;
          setItalic(newVal);
          onChange?.({ fontStyle: newVal ? "italic" : "normal" });
        }}
      >
        <span className="italic">I</span>
      </button>
      <button
        className={styleButton(underline)}
        onClick={() => {
          const newVal = !underline;
          setUnderline(newVal);
          onChange?.({ underline: newVal });
        }}
      >
        <span className="underline">U</span>
      </button>
    </div>
  );
}

