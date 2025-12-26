import * as fabric from 'fabric';

export async function importFabricJSON(canvas: fabric.Canvas, file: File) {
    if (!canvas || !file) return;

    try {
        const jsonText = await file.text();
        const json = JSON.parse(jsonText);

        canvas.loadFromJSON(json, () => {
            canvas.requestRenderAll();
        });
    } catch (err) {
        console.error('Failed to load Fabric JSON', err);
    }
}
