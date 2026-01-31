import { useStore } from '@/store';
import * as fabric from 'fabric';

export function switchCanvasMode(
    canvas: fabric.Canvas,
    mode: 'select' | 'node',
    activePath?: fabric.Path,
) {
    const store = useStore.getState();

    switch (mode) {
        case 'node':
            canvas.isDrawingMode = false;
            canvas.selection = false; // disable group selection
            canvas.skipTargetFind = false; // allow pointer events on nodes

            // Disable all paths
            canvas.getObjects().forEach((obj) => {
                if (obj.type === 'path') {
                    obj.selectable = false;
                    obj.evented = false;
                    obj.lockMovementX = true;
                    obj.lockMovementY = true;
                }
            });

            if (activePath) {
                // Ensure the active path itself is locked
                activePath.selectable = false;
                activePath.evented = false;
                activePath.lockMovementX = true;
                activePath.lockMovementY = true;

                // Use store to enter node mode
                store.enterNodeMode?.();
            }
            break;

        case 'select':
        default:
            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.skipTargetFind = false;
            canvas.defaultCursor = '';

            // Enable all paths
            canvas.getObjects().forEach((obj) => {
                if (obj.type === 'path') {
                    obj.selectable = true;
                    obj.evented = true;
                    obj.lockMovementX = false;
                    obj.lockMovementY = false;
                }
            });

            // Remove all node connectors (circles)
            canvas.getObjects().forEach((obj) => {
                if (obj.type === 'circle' && obj.hoverCursor === 'pointer') {
                    canvas.remove(obj);
                }
            });

            // Exit node mode in store
            // store.exitNodeMode?.(canvas);

            break;
    }

    canvas.requestRenderAll();
}
