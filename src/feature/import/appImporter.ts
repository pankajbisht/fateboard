import * as fabric from 'fabric';

export async function importAppFile(canvas: fabric.Canvas, file: File) {
    const json = JSON.parse(await file.text());

    canvas.loadFromJSON(json.canvas, () => {
        canvas.requestRenderAll();
    });
}

// const handleUpload = (e) => {
//     const file = e.target.files?.[0];
//     if (!file || !canvas) return;

//     const reader = new FileReader();
//     reader.onload = (ev) => {
//         try {
//             const result = ev.target?.result;
//             let json: string | null = null;
//             if (typeof result === 'string') {
//                 json = result;
//             } else if (result instanceof ArrayBuffer) {
//                 json = new TextDecoder().decode(result);
//             }

//             if (!json) throw new Error('Invalid file content');

//             const data = JSON.parse(json);
//             canvas.clear();
//             canvas.loadFromJSON(data, () => {
//                 canvas.requestRenderAll();
//             });
//         } catch (err) {
//             console.error('Failed to load canvas:', err);
//         }
//     };
//     reader.readAsText(file);
// };
