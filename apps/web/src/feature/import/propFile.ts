import { MAX_SVG_CHARS, sanitizeSvg, type UserProp } from '@/props/userProps';

/**
 * Read a file for the user's prop library (docs/PROPS.md phase 6): an SVG is sanitised and measured; a PNG
 * is downscaled so its longer side is at most `MAX_PNG_SIDE` (runtime-performance P1: never keep a bitmap
 * bigger than it needs to be). Null for anything else or an unreadable file.
 */
export const MAX_PNG_SIDE = 1024;
const MAX_PNG_BYTES = 15 * 1024 * 1024;

export type PropFile = Omit<UserProp, 'id'>;

const labelOf = (name: string) =>
    name
        .replace(/\.[^.]+$/, '')
        .trim()
        .slice(0, 60) || 'My prop';

/** Width / height of an SVG from its attributes or viewBox (200 × 200 when it says nothing). */
function svgSize(svg: string): { width: number; height: number } {
    const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const num = (v: string | null) => {
        const n = v ? parseFloat(v) : NaN;
        return Number.isFinite(n) && n > 0 && !/%$/.test(v ?? '') ? n : null;
    };
    const vb = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    const vbW = vb.length === 4 && vb[2] > 0 ? vb[2] : null;
    const vbH = vb.length === 4 && vb[3] > 0 ? vb[3] : null;
    const fit = (v: number) => Math.min(4096, Math.max(1, Math.round(v)));
    return {
        width: fit(num(root.getAttribute('width')) ?? vbW ?? 200),
        height: fit(num(root.getAttribute('height')) ?? vbH ?? 200),
    };
}

async function readPng(file: File): Promise<PropFile | null> {
    if (file.size > MAX_PNG_BYTES || typeof createImageBitmap === 'undefined') return null;
    const bitmap = await createImageBitmap(file);
    try {
        const k = Math.min(1, MAX_PNG_SIDE / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * k));
        const height = Math.max(1, Math.round(bitmap.height * k));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, width, height);
        return {
            label: labelOf(file.name),
            kind: 'png',
            data: canvas.toDataURL('image/png'),
            width,
            height,
        };
    } finally {
        bitmap.close();
    }
}

export async function readPropFile(file: File): Promise<PropFile | null> {
    const name = file.name.toLowerCase();
    if (file.type === 'image/svg+xml' || name.endsWith('.svg')) {
        if (file.size > MAX_SVG_CHARS * 4) return null;
        const svg = sanitizeSvg(await file.text());
        return svg ? { label: labelOf(file.name), kind: 'svg', data: svg, ...svgSize(svg) } : null;
    }
    if (file.type === 'image/png' || name.endsWith('.png')) return readPng(file);
    return null;
}
