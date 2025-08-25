import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createCanvasSlice } from "./slices/canvasSlice";
import { createUISlice } from "./slices/uiSlice";
import { createLayersSlice } from "./slices/layersSlice";
import { createPageSlice } from "./slices/pageSlice.ts";
import { createBackgroundSlice } from "./slices/backgroundSlice.ts";
import { createNotebookSlice } from "./slices/createNotebookSlice.ts";

export const useStore = create(
  devtools((set, get) => ({
    ...createCanvasSlice(set, get),
    ...createUISlice(set, get),
    ...createLayersSlice(set, get),
    ...createPageSlice(set, get),
    ...createBackgroundSlice(set, get),
    ...createNotebookSlice(set, get)
  }))
);
