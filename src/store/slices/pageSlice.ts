const PAGE_SIZES = {
  Default: { w: 1024, h: 600 },
  Freehand: { w: 1920, h: 1080 },
  A4: { w: 794, h: 1123 },
  Letter: { w: 816, h: 1056 },
  Legal: { w: 816, h: 1344 },
};

export const createPageSlice = (set, get) => ({
  pageFormat: "A4",
  orientation: "landscape",
  zoom: 1,
  scale: 1,
  setPageFormat: (format, orientation = "landscape") => {
    set({ pageFormat: format, orientation });
    get().applyPageSize(format, orientation);
  },
  setOrientation: (orientation) => {
    set({ orientation });
    get().applyPageSize(get().pageFormat, orientation);
  },
  setZoom: (zoom) => {
    const canvas = get().canvas;
    if (!canvas) return;
    canvas.setZoom(zoom);
    set({ zoom });
    get().drawBackground();      // 🔹 keep background in sync on zoom changes
    canvas.renderAll();
  },
  applyPageSize: (format = get().pageFormat, orientation = get().orientation) => {
    const canvas = get().canvas;
    if (!canvas) return;

    // normalize name
    const fmt = String(format || "").toLowerCase();

    if (fmt === "freehand") {
      canvas.setWidth(window.innerWidth * 2);
      canvas.setHeight(window.innerHeight * 2);
      canvas.setZoom(1);
      canvas.calcOffset();
      canvas.renderAll();
      set({ scale: 1, pageWidth: canvas.getWidth(), pageHeight: canvas.getHeight() });
      get().drawBackground();    // 🔹 redraw background for new size
      return;
    }

    // Paper mode
    const { w, h } = PAGE_SIZES[format];
    const width = orientation === "portrait" ? w : h;
    const height = orientation === "portrait" ? h : w;

    const MAX_PAGE_WIDTH = 800; // normalize
    const scale = MAX_PAGE_WIDTH / width;

    canvas.setWidth(width * scale);
    canvas.setHeight(height * scale);
    canvas.setZoom(scale);
    canvas.calcOffset();
    canvas.renderAll();

    set({ scale, pageWidth: width, pageHeight: height });
    get().drawBackground();      // 🔹 redraw background for new size/scale
  },
})