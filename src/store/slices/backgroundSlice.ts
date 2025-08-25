//// store/backgroundSlice.ts
//import { Pattern } from "fabric"; // explicit import helps TS
//import * as fabric from "fabric";
//
//type BackgroundStyle = "none" | "grid" | "ruled";
//
//export const createBackgroundSlice = (set, get) => ({
//  // state
//  backgroundStyle: "grid" as BackgroundStyle,
//  gridSize: 20,
//  gridColor: "#e0e0e0",
//  gridMajorEvery: 5,
//  gridMajorColor: "#bdbdbd",
//  gridLineWidth: 1,
//  gridMajorLineWidth: 1,
//
//  ruledLineHeight: 24,
//  ruledColor: "#c0d6ff",
//  ruledLineWidth: 1,
//
//  // setters
//  setBackgroundStyle: (style: BackgroundStyle) => {
//    set({ backgroundStyle: style });
//    get().drawBackground();
//  },
//
//  setGridOptions: (opts: Partial<{
//    gridSize: number;
//    gridColor: string;
//    gridMajorEvery: number;
//    gridMajorColor: string;
//    gridLineWidth: number;
//    gridMajorLineWidth: number;
//  }>) => {
//    set(opts);
//    get().drawBackground();
//  },
//
//  setRuledOptions: (opts: Partial<{
//    ruledLineHeight: number;
//    ruledColor: string;
//    ruledLineWidth: number;
//  }>) => {
//    set(opts);
//    get().drawBackground();
//  },
//
//  /**
//   * Draw / update the background pattern based on current style.
//   */
//  drawBackground: () => {
//    const canvas = get().canvas;
//    if (!canvas) return;
//
//    const style = get().backgroundStyle;
//
//    // 🔹 Clear background if none
//    if (style === "none") {
//      canvas.setBackgroundColor(null, canvas.renderAll.bind(canvas));
//      return;
//    }
//
//    // 🔹 Helpers
//    const makeGridPattern = () => {
//      const size = Math.max(2, get().gridSize);
//      const majorEvery = Math.max(1, get().gridMajorEvery);
//      const tileSize = size * majorEvery;
//
//      const tile = document.createElement("canvas");
//      tile.width = tileSize;
//      tile.height = tileSize;
//      const ctx = tile.getContext("2d");
//      if (!ctx) return null;
//
//      const line = (x1: number, y1: number, x2: number, y2: number, w: number, color: string) => {
//        ctx.beginPath();
//        ctx.moveTo(x1 + 0.5, y1 + 0.5);
//        ctx.lineTo(x2 + 0.5, y2 + 0.5);
//        ctx.lineWidth = w;
//        ctx.strokeStyle = color;
//        ctx.stroke();
//      };
//
//      // minor grid
//      for (let i = 1; i < majorEvery; i++) {
//        const pos = i * size;
//        line(pos, 0, pos, tileSize, get().gridLineWidth, get().gridColor);
//        line(0, pos, tileSize, pos, get().gridLineWidth, get().gridColor);
//      }
//
//      // major grid
//      line(tileSize - 1, 0, tileSize - 1, tileSize, get().gridMajorLineWidth, get().gridMajorColor);
//      line(0, tileSize - 1, tileSize, tileSize - 1, get().gridMajorLineWidth, get().gridMajorColor);
//
//      return new fabric.Pattern({
//        source: tile,
//        repeat: "repeat",
//      });
//    };
//
//    const makeRuledPattern = () => {
//      const h = Math.max(2, get().ruledLineHeight);
//      const tile = document.createElement("canvas");
//      tile.width = 2;
//      tile.height = h;
//
//      const ctx = tile.getContext("2d");
//      if (!ctx) return null;
//
//      ctx.beginPath();
//      ctx.moveTo(0, h - 1 + 0.5);
//      ctx.lineTo(tile.width, h - 1 + 0.5);
//      ctx.lineWidth = get().ruledLineWidth;
//      ctx.strokeStyle = get().ruledColor;
//      ctx.stroke();
//
//      return new fabric.Pattern({
//        source: tile,
//        repeat: "repeat",
//      });
//    };
//
//    let pattern: fabric.Pattern | null = null;
//    if (style === "grid") pattern = makeGridPattern();
//    if (style === "ruled") pattern = makeRuledPattern();
//
//    // 🔹 Apply pattern properly
//    canvas.setBackgroundColor(pattern || null, canvas.renderAll.bind(canvas));
//  }
//
//});

// store/backgroundSlice.ts
import * as fabricNS from "fabric"; // handles both ESM/CJS builds

type BackgroundStyle = "none" | "grid" | "ruled";

export const createBackgroundSlice = (set, get) => ({
  backgroundStyle: "grid" as BackgroundStyle,
  gridSize: 20,
  gridColor: "#e0e0e0",
  gridMajorEvery: 5,
  gridMajorColor: "#bdbdbd",
  gridLineWidth: 1,
  gridMajorLineWidth: 1,

  ruledLineHeight: 24,
  ruledColor: "#c0d6ff",
  ruledLineWidth: 1,

  setBackgroundStyle: (style: BackgroundStyle) => {
    set({ backgroundStyle: style });
    get().drawBackground();
  },
  setGridOptions: (opts: Partial<{
    gridSize: number;
    gridColor: string;
    gridMajorEvery: number;
    gridMajorColor: string;
    gridLineWidth: number;
    gridMajorLineWidth: number;
  }>) => {
    set(opts);
    get().drawBackground();
  },
  setRuledOptions: (opts: Partial<{
    ruledLineHeight: number;
    ruledColor: string;
    ruledLineWidth: number;
  }>) => {
    set(opts);
    get().drawBackground();
  },

  drawBackground: () => {
    const canvas: any = get().canvas;
    if (!canvas) return;

    // Resolve Fabric namespace across builds
    const fab: any = (fabricNS as any).fabric ?? (fabricNS as any);

    const style = get().backgroundStyle;

    // Helpers for version-safe background ops
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

      const line = (x1: number, y1: number, x2: number, y2: number, w: number, color: string) => {
        ctx.beginPath();
        ctx.moveTo(x1 + 0.5, y1 + 0.5); // crisp
        ctx.lineTo(x2 + 0.5, y2 + 0.5);
        ctx.lineWidth = w;
        ctx.strokeStyle = color;
        ctx.stroke();
      };

      // minor grid
      for (let i = 1; i < majorEvery; i++) {
        const pos = i * size;
        line(pos, 0, pos, tileSize, get().gridLineWidth, get().gridColor);   // vertical
        line(0, pos, tileSize, pos, get().gridLineWidth, get().gridColor);   // horizontal
      }

      // major grid (right & bottom edges)
      line(tileSize - 1, 0, tileSize - 1, tileSize, get().gridMajorLineWidth, get().gridMajorColor);
      line(0, tileSize - 1, tileSize, tileSize - 1, get().gridMajorLineWidth, get().gridMajorColor);

      return new fab.Pattern({ source: tile, repeat: "repeat" });
    };

    const makeRuledPattern = () => {
      const h = Math.max(2, get().ruledLineHeight);
      const tile = document.createElement("canvas");
      tile.width = 2; // narrow tile, repeats horizontally
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

    // Apply pattern (version-safe)
    if (typeof canvas.setBackgroundColor === "function") {
      canvas.setBackgroundColor(pattern || null);
    } else {
      canvas.backgroundColor = pattern || null;
    }
    (canvas.requestRenderAll?.() ?? canvas.renderAll?.());
  },
});
