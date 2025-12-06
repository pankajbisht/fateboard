// store/backgroundSlice.ts
import * as fabricNS from "fabric"; // works with ESM/CJS

type BackgroundStyle = "none" | "grid" | "ruled";

export const createBackgroundSlice = (set, get) => ({
  backgroundStyle: "none",
  gridSize: 20,
  gridColor: "#e0e0e0",
  gridMajorEvery: 5,
  gridMajorColor: "#bdbdbd",
  gridLineWidth: 1,
  gridMajorLineWidth: 1,

  ruledLineHeight: 24,
  ruledColor: "#c0d6ff",
  ruledLineWidth: 1,

  setBackgroundStyle: (style) => {
    set({ backgroundStyle: style });
    get().drawBackground();
  },

  toggleGrid: () => {
    const next = get().backgroundStyle === "grid" ? "none" : "grid";
    set({ backgroundStyle: next });
    get().drawBackground();
  },

  setGridOptions: (opts) => {
    set(opts);
    get().drawBackground();
  },

  setRuledOptions: (opts) => {
    set(opts);
    get().drawBackground();
  },

  drawBackground: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    const fab = fabricNS.fabric ?? fabricNS;

    const style = get().backgroundStyle;

    const clearBackground = () => {
      if (typeof canvas.setBackgroundImage === "function") {
        canvas.setBackgroundImage(null);
      } else {
        canvas.backgroundImage = null;
      }
      if (typeof canvas.setBackgroundColor === "function") {
        canvas.setBackgroundColor(null);
      } else {
        canvas.backgroundColor = null;
      }
      (canvas.requestRenderAll?.() ?? canvas.renderAll?.());
    };

    if (style === "none") {
      clearBackground();
      return;
    }

    const makeGridPattern = () => {
      const size = Math.max(2, get().gridSize);
      const majorEvery = Math.max(1, get().gridMajorEvery);
      const tileSize = size * majorEvery;

      const tile = document.createElement("canvas");
      tile.width = tileSize;
      tile.height = tileSize;
      const ctx = tile.getContext("2d");
      if (!ctx) return null;

      const line = (x1, y1, x2, y2, w, color) => {
        ctx.beginPath();
        ctx.moveTo(x1 + 0.5, y1 + 0.5);
        ctx.lineTo(x2 + 0.5, y2 + 0.5);
        ctx.lineWidth = w;
        ctx.strokeStyle = color;
        ctx.stroke();
      };

      for (let i = 1; i < majorEvery; i++) {
        const pos = i * size;
        line(pos, 0, pos, tileSize, get().gridLineWidth, get().gridColor);
        line(0, pos, tileSize, pos, get().gridLineWidth, get().gridColor);
      }

      line(tileSize - 1, 0, tileSize - 1, tileSize, get().gridMajorLineWidth, get().gridMajorColor);
      line(0, tileSize - 1, tileSize, tileSize - 1, get().gridMajorLineWidth, get().gridMajorColor);

      return new fab.Pattern({ source: tile, repeat: "repeat" });
    };

    const makeRuledPattern = () => {
      const h = Math.max(2, get().ruledLineHeight);
      const tile = document.createElement("canvas");
      tile.width = 2;
      tile.height = h;

      const ctx = tile.getContext("2d");
      if (!ctx) return null;

      ctx.beginPath();
      ctx.moveTo(0, h - 1 + 0.5);
      ctx.lineTo(tile.width, h - 1 + 0.5);
      ctx.lineWidth = get().ruledLineWidth;
      ctx.strokeStyle = get().ruledColor;
      ctx.stroke();

      return new fab.Pattern({ source: tile, repeat: "repeat" });
    };

    const pattern =
      style === "grid" ? makeGridPattern()
      : style === "ruled" ? makeRuledPattern()
      : null;

    if (typeof canvas.setBackgroundColor === "function") {
      canvas.setBackgroundColor(pattern || null);
    } else {
      canvas.backgroundColor = pattern || null;
    }
    (canvas.requestRenderAll?.() ?? canvas.renderAll?.());
  },
});
