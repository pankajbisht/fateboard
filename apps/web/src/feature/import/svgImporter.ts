import * as fabric from 'fabric';
import { useStore } from '@/store';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { IMAGE_BASE_SIZE } from './imageImporter';

/** A file that adds nothing must say so (BUG-158): before, the only trace was in the console. */
const reportUnreadable = (file: File) => {
    void useStore.getState().alertDialog({
        title: "Can't open SVG",
        message: `"${file.name}" has no shapes Fateboard can read.`,
    });
};

export async function importSVG(canvas: fabric.Canvas, file: File) {
    if (!canvas || !file) return;

    try {
        const svgText = await file.text();
        const result: any = await fabric.loadSVGFromString(svgText);

        let objects: fabric.Object[] = [];

        // ✅ Case 1: Array
        if (Array.isArray(result)) {
            objects = result;
        }

        // ✅ Case 2: Single Fabric object
        else if (result?.type) {
            objects = [result];
        }

        // ✅ Case 3: { objects, options }
        else if (result?.objects) {
            objects = result.objects;
        }

        // Fabric leaves a hole for every element it cannot build
        objects = objects.filter(Boolean);

        if (!objects.length) {
            reportUnreadable(file);
            return;
        }

        // ✅ Create final Fabric object
        const svgObject = objects.length === 1 ? objects[0] : new fabric.Group(objects);

        // the middle of what is shown (page centre on a design page, view centre on a whiteboard)
        const center = canvas.getVpCenter();

        svgObject.set({
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
        });

        // vector art: longer side fitted to the base size for this page / zoom (lib/canvas/creationScale)
        const longer = Math.max(svgObject.width || 0, svgObject.height || 0);
        if (longer > 0) {
            svgObject.scale((IMAGE_BASE_SIZE * creationScaleOf(useStore.getState())) / longer);
        }

        svgObject.setCoords();

        canvas.add(svgObject);
        canvas.setActiveObject(svgObject);
        canvas.requestRenderAll();
    } catch (err) {
        console.error('[import] SVG import failed', err);
        reportUnreadable(file);
    }
}
