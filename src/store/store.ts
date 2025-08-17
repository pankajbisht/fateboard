import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createCanvasSlice } from "./slices/canvasSlice";
import { createUISlice } from "./slices/uiSlice";
import { createLayersSlice } from "./slices/layersSlice";

export const useStore = create(
  devtools((set, get) => ({
    ...createCanvasSlice(set, get),
    ...createUISlice(set, get),
    ...createLayersSlice(set, get),
  }))
);
