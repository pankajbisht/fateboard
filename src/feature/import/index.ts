import { importImage } from './imageImporter';
import { importSVG } from './svgImporter';
import { importAppFile } from './appImporter';
import * as fabric from 'fabric';
import { importFabricJSON } from './importFabricJSON';

// export async function importFile(
//   canvas: fabric.Canvas,
//   file: File
// ) {
//   const ext = file.name.split('.').pop()?.toLowerCase();

//   if (!ext) return;

//   if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
//     return importImage(canvas, file);
//   }

//   if (ext === 'svg' || ext === 'fateboard') {
//     return importSVG(canvas, file);
//   }

//   if (ext === 'app') {
//     return importAppFile(canvas, file);
//   }

//   alert('Unsupported file type');
// }

function getFileType(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'svg') return 'svg';
    if (ext === 'fateboard' || ext === 'json') return 'fabric-json';

    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext!)) {
        return 'image';
    }

    return 'unknown';
}

export async function importFile(canvas: fabric.Canvas, file: File) {
    const type = getFileType(file);

    switch (type) {
        case 'image':
            return importImage(canvas, file);

        case 'svg':
            return importSVG(canvas, file);

        case 'fabric-json':
            return importFabricJSON(canvas, file);

        default:
            alert('Unsupported file type');
    }
}
