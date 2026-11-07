import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createCanvasSlice } from './slices/createCanvasSlice.ts';
import { createUISlice } from './slices/createUiSlice.ts';
import { createLayersSlice } from './slices/createLayersSlice.ts';
import { createPageSlice } from './slices/createPageSlice.ts';
import { createPagesSlice } from './slices/createPagesSlice.ts';
import { createBackgroundSlice } from './slices/createBackgroundSlice.ts';
import { createCommandSlice } from './slices/createCommandSlice.ts';
import { createBrushSlice } from './slices/createBrushSlice.ts';
import { createShapeStyleSlice } from './slices/createShapeStyleSlice.ts';
import { createUndoRedoSlice } from './slices/createUndoRedoSlice.ts';
import { createTransformSlice } from './slices/createTransformSlice.ts';
import { createShapeSlice } from './slices/createShapeSlice.ts';
import { createTextSlice } from './slices/createTextSlice.ts';
import { createBackgroundColor } from './slices/createBackgroundColor.ts';
import { createContextMenu } from './slices/createContextMenu.ts';
import { createSettingSlice } from './slices/createSettingSlice.ts';
import { advanceOperationSlice } from './slices/advanceOperationSlice.ts';
import { geometryEngineSlice } from './slices/geometryEngineSlice.ts';
import { createNodeEditorSlice } from './slices/createNodeEditorSlice.ts';
import { createFilterSlice } from './slices/createFilterSlice.ts';
import { createTemplateSlice } from './slices/templateSlice.ts';
// import { withLogger } from './middleware/withLogger.ts';
import { createNotebookSlice } from './slices/createNotebookSlice.ts';
import { createDialogSlice } from './slices/createDialogSlice.ts';
import { createAnimationSlice } from './slices/createAnimationSlice.ts';

export const combinedSlice = (set, get, store) => ({
    ...createCanvasSlice(set, get, store),
    ...createBrushSlice(set, get, store),
    ...createUISlice(set, get, store),
    ...createLayersSlice(set, get, store),
    ...createPageSlice(set, get, store),
    ...createPagesSlice(set, get, store),
    ...createBackgroundSlice(set, get, store),
    ...createCommandSlice(set, get, store),
    ...createShapeStyleSlice(set, get, store),
    ...createUndoRedoSlice(set, get, store),
    ...createTransformSlice(set, get, store),
    ...createShapeSlice(set, get, store),
    ...createTextSlice(set, get, store),
    ...createBackgroundColor(set, get, store),
    ...createContextMenu(set, get, store),
    ...createSettingSlice(set, get, store),
    ...advanceOperationSlice(set, get, store),
    ...geometryEngineSlice(set, get, store),
    ...createNodeEditorSlice(set, get, store),
    ...createFilterSlice(set, get, store),
    ...createPageSlice(set, get, store),
    ...createTemplateSlice(set, get, store),
    ...createNotebookSlice(set, get, store),
    ...createDialogSlice(set, get, store),
    ...createAnimationSlice(set, get, store),
});

// Vite's own mode flag: 'development' (dev server), 'test' (vitest), 'production' (build).
// `process` is Node-only and not in the browser type set.
const isDev = import.meta.env.MODE === 'development';

/** Full store state: the merge of every slice (later spreads win, see docs/STATE.md). */
export type StoreState = ReturnType<typeof combinedSlice>;

export const useStore = create<StoreState>()(
    devtools((set, get, store) => combinedSlice(set, get, store), {
        name: 'DesignEditorStore',
        enabled: isDev,
    }),
);

// Proper RootState type inferred from the created store
export type RootState = StoreState;
export type UseStore = typeof useStore;
