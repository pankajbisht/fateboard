import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createCanvasSlice } from "./slices/createCanvasSlice.ts";
import { createUISlice } from "./slices/createUiSlice.ts";
import { createLayersSlice } from "./slices/createLayersSlice.ts";
import { createPageSlice } from "./slices/createPageSlice.ts";
import { createBackgroundSlice } from "./slices/createBackgroundSlice.ts";
import { createCommandSlice } from "./slices/createCommandSlice.ts";
import { createBrushSlice } from "./slices/createBrushSlice.ts";
import { createShapeStyleSlice } from "./slices/createShapeStyleSlice.ts";
import { createUndoRedoSlice } from "./slices/createUndoRedoSlice.ts";
import { createTransformSlice } from "./slices/createTransformSlice.ts";
import { createShapeSlice } from "./slices/createShapeSlice.ts";
import { createTextSlice } from "./slices/createTextSlice.ts";
import { createNotebookSlice } from "./slices/createNotebookSlice.ts";
import { DEVELOPMENT } from "@lib/const/editor.ts";
import { createBackgroundColor } from "./slices/createBackgroundColor.ts";
import { createContextMenu } from "./slices/createContextMenu.ts";
import { withLogger } from "./middleware/withLogger.ts";

export const combinedSlice = (set, get) => ({
  ...createCanvasSlice(set, get),
  ...createBrushSlice(set, get),
  ...createUISlice(set, get),
  ...createLayersSlice(set, get),
  ...createPageSlice(set, get),
  ...createBackgroundSlice(set, get),
  ...createCommandSlice(set, get),
  ...createShapeStyleSlice(set, get),
  ...createUndoRedoSlice(set, get),
  ...createTransformSlice(set, get),
  ...createShapeSlice(set, get),
  ...createTextSlice(set, get),
  ...createBackgroundColor(set, get),
  ...createContextMenu(set, get)
//  ...createNotebookSlice(set, get)
})
export const useStore = process.env.NODE_ENV === DEVELOPMENT
  ? create(devtools(withLogger(combinedSlice)))
  : create(combinedSlice);
