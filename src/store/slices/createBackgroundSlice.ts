
// store/backgroundSlice.ts
import * as fabricNS from "fabric";

/* -------------------------------------------------------
   Types
------------------------------------------------------- */

export type BackgroundStyle =
  | "none"
  | "grid"
  | "ruled"
  | "dots"
  | "isometric";

type PatternFactoryCtx = {
  get: () => any;
};

type PatternFactory = (ctx: PatternFactoryCtx) => fabric.Pattern | null;

/* -------------------------------------------------------
   Fabric Resolver (ESM + CJS safe)
------------------------------------------------------- */

const getFabric = () => (fabricNS as any).fabric ?? fabricNS;

/* -------------------------------------------------------
   Pattern Implementations
------------------------------------------------------- */

const gridPattern: PatternFactory = ({ get }) => {
  const fabric = getFabric();

  const size = Math.max(2, get().gridSize);
  const majorEvery = Math.max(1, get().gridMajorEvery);
  const tileSize = size * majorEvery;

  const tile = document.createElement("canvas");
  tile.width = tile.height = tileSize;

  const ctx = tile.getContext("2d");
  if (!ctx) return null;

  const drawLine = (x1, y1, x2, y2, w, color) => {
    ctx.beginPath();
    ctx.moveTo(x1 + 0.5, y1 + 0.5);
    ctx.lineTo(x2 + 0.5, y2 + 0.5);
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  for (let i = 1; i < majorEvery; i++) {
    const p = i * size;
    drawLine(p, 0, p, tileSize, get().gridLineWidth, get().gridColor);
    drawLine(0, p, tileSize, p, get().gridLineWidth, get().gridColor);
  }

  drawLine(
    tileSize - 1,
    0,
    tileSize - 1,
    tileSize,
    get().gridMajorLineWidth,
    get().gridMajorColor
  );
  drawLine(
    0,
    tileSize - 1,
    tileSize,
    tileSize - 1,
    get().gridMajorLineWidth,
    get().gridMajorColor
  );

  return new fabric.Pattern({ source: tile, repeat: "repeat" });
};

const ruledPattern: PatternFactory = ({ get }) => {
  const fabric = getFabric();

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

  return new fabric.Pattern({ source: tile, repeat: "repeat" });
};

const dotsPattern: PatternFactory = ({ get }) => {
  const fabric = getFabric();

  const gap = Math.max(6, get().gridSize);
  const tile = document.createElement("canvas");
  tile.width = tile.height = gap;

  const ctx = tile.getContext("2d");
  if (!ctx) return null;

  ctx.beginPath();
  ctx.arc(1, 1, 1, 0, Math.PI * 2);
  ctx.fillStyle = get().gridColor;
  ctx.fill();

  return new fabric.Pattern({ source: tile, repeat: "repeat" });
};

const isometricPattern: PatternFactory = ({ get }) => {
  const fabric = getFabric();

  const size = Math.max(16, get().gridSize * 2);
  const tile = document.createElement("canvas");
  tile.width = tile.height = size;

  const ctx = tile.getContext("2d");
  if (!ctx) return null;

  ctx.strokeStyle = get().gridColor;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size / 2, 0);
  ctx.lineTo(size, size);
  ctx.stroke();

  return new fabric.Pattern({ source: tile, repeat: "repeat" });
};

/* -------------------------------------------------------
   Pattern Registry (Scalable)
------------------------------------------------------- */

const BACKGROUND_PATTERNS: Record<BackgroundStyle, PatternFactory | null> = {
  none: null,
  grid: gridPattern,
  ruled: ruledPattern,
  dots: dotsPattern,
  isometric: isometricPattern,
};

/* -------------------------------------------------------
   Zustand Slice
------------------------------------------------------- */

export const createBackgroundSlice = (set, get) => ({
  /* ---------- State ---------- */

  backgroundStyle: "none" as BackgroundStyle,

  gridSize: 20,
  gridColor: "#e0e0e0",
  gridMajorEvery: 5,
  gridMajorColor: "#bdbdbd",
  gridLineWidth: 1,
  gridMajorLineWidth: 1,

  ruledLineHeight: 24,
  ruledColor: "#c0d6ff",
  ruledLineWidth: 1,

  /* ---------- Actions ---------- */

  setBackgroundStyle: (style: BackgroundStyle) => {
    set({ backgroundStyle: style });
    get().drawBackground();
  },

  toggleGrid: () => {
    const next =
      get().backgroundStyle === "grid" ? "none" : "grid";
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

  /* ---------- Renderer ---------- */

  drawBackground: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    const style: BackgroundStyle = get().backgroundStyle;
    const factory = BACKGROUND_PATTERNS[style];


    if (!factory) {
      canvas.backgroundColor = null;
      canvas.requestRenderAll();
      return;
    }

    const pattern = factory({ get });
    canvas.backgroundColor = pattern || null;
    canvas.requestRenderAll();
  },
});
