import { importImage } from './imageImporter';
import { importSVG } from './svgImporter';
import { importAppFile } from './appImporter';
import * as fabric from 'fabric';
import { importFabricJSON } from './importFabricJSON';
import { useStore } from '@/store';

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

/** A saved project (all pages): `{ app: 'fateboard', pages: [...] }` or a bare page list. */
export function isProjectJSON(data: unknown): boolean {
    if (Array.isArray(data)) return data.length > 0;
    const d = data as { app?: unknown; pages?: unknown } | null;
    return !!d && typeof d === 'object' && Array.isArray(d.pages);
}

/** Project file -> all pages (pages slice); anything else -> the older single-board import. */
async function importBoardOrProject(canvas: fabric.Canvas, file: File) {
    let data: unknown = null;
    let text = '';
    try {
        text = await file.text();
        data = JSON.parse(text);
    } catch {
        /* not JSON: the board importer reports it */
    }
    if (isProjectJSON(data)) {
        const ok = await useStore.getState().importProject?.(text);
        if (!ok)
            void useStore.getState().alertDialog({
                title: "Can't open project",
                message: `"${file.name}" is not a valid Fateboard project.`,
            });
        return;
    }
    return importFabricJSON(canvas, file);
}

export async function importFile(canvas: fabric.Canvas, file: File) {
    const type = getFileType(file);

    switch (type) {
        case 'image':
            return importImage(canvas, file);

        case 'svg':
            return importSVG(canvas, file);

        case 'fabric-json':
            return importBoardOrProject(canvas, file);

        default:
            void useStore.getState().alertDialog({
                title: 'Unsupported file type',
                message: `"${file.name}" can't be opened. Use PNG, JPG, WEBP, SVG, .fateboard or .json.`,
            });
    }
}
