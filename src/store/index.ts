import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createCanvasSlice } from './slices/createCanvasSlice.ts';
import { createUISlice } from './slices/createUiSlice.ts';
import { createLayersSlice } from './slices/createLayersSlice.ts';
import { createPageSlice } from './slices/createPageSlice.ts';
import { createBackgroundSlice } from './slices/createBackgroundSlice.ts';
import { createCommandSlice } from './slices/createCommandSlice.ts';
import { createBrushSlice } from './slices/createBrushSlice.ts';
import { createShapeStyleSlice } from './slices/createShapeStyleSlice.ts';
import { createUndoRedoSlice } from './slices/createUndoRedoSlice.ts';
import { createTransformSlice } from './slices/createTransformSlice.ts';
import { createShapeSlice } from './slices/createShapeSlice.ts';
import { createTextSlice } from './slices/createTextSlice.ts';
import { createNotebookSlice } from './slices/createNotebookSlice.ts';
import { DEVELOPMENT } from '@lib/const/editor.ts';
import { createBackgroundColor } from './slices/createBackgroundColor.ts';
import { createContextMenu } from './slices/createContextMenu.ts';
import { withLogger } from './middleware/withLogger.ts';
import { createSettingSlice } from './slices/createSettingSlice.ts';
import { advanceOperationSlice } from './slices/advanceOperationSlice.ts';
import { geometryEngineSlice } from './slices/geometryEngineSlice.ts';
import { createNodeEditorSlice } from './slices/createNodeEditorSlice.ts';
import { createFilterSlice } from './slices/createFilterSlice.ts';

export const combinedSlice = (set, get, store) => ({
    ...createCanvasSlice(set, get, store),
    ...createBrushSlice(set, get, store),
    ...createUISlice(set, get, store),
    ...createLayersSlice(set, get, store),
    ...createPageSlice(set, get, store),
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
    //  ...createNotebookSlice(set, get, store)
});

const isDev = process.env.NODE_ENV === 'development';

export const useStore = create(
    devtools(withLogger(combinedSlice), {
        name: 'DesignEditorStore',
        enabled: isDev,
    }),
);

// export const useStore: any =
//     isDev
//         ? create(devtools(withLogger(combinedSlice)))
//         : create(combinedSlice);

// Proper RootState type inferred from the created store
export type RootState = ReturnType<typeof useStore.getState>;
export type UseStore = typeof useStore;
