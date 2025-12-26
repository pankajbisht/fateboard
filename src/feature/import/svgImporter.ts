import * as fabric from 'fabric';

export async function importSVG(canvas: fabric.Canvas, file: File) {
    if (!canvas || !file) return;

    const svgText = await file.text();

    try {
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

        if (!objects.length) {
            console.error('No SVG objects found', result);
            return;
        }

        // ✅ Create final Fabric object
        const svgObject = objects.length === 1 ? objects[0] : new fabric.Group(objects);

        // ---- SAFE FROM HERE ----
        const cw = canvas.getWidth();
        const ch = canvas.getHeight();

        svgObject.set({
            left: cw / 2,
            top: ch / 2,
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
        });

        // prevent zero-size SVG
        if (svgObject.width && svgObject.height) {
            svgObject.scaleToWidth(Math.min(400, cw * 0.7));
        } else {
            svgObject.scale(1);
        }

        svgObject.setCoords();

        canvas.add(svgObject);
        canvas.setActiveObject(svgObject);
        canvas.requestRenderAll();
    } catch (err) {
        console.error('SVG import failed', err);
    }
}
