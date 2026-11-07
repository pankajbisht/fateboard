/**
 * Test-only window hook for the Playwright suite (owner decision Q9, 2026-11-07).
 *
 * Loaded by main.tsx ONLY when the bundle is built with `vite build --mode e2e`; production builds
 * drop the import entirely (`import.meta.env.MODE` is replaced at build time). Tests drive the real
 * UI and use this only to READ what is on the canvas (Fabric draws pixels, not DOM).
 */
import { useStore } from '@/store';

type Paint = string | null;

export type E2EObject = {
    type: string;
    fill: Paint;
    stroke: Paint;
    strokeWidth: number;
    width: number;
    height: number;
    text?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    underline?: boolean;
    textAlign?: string;
    isTextShape?: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const paint = (v: any): Paint =>
    v == null || v === '' ? null : typeof v === 'string' ? v.toLowerCase() : 'gradient';

function describe(o: any): E2EObject {
    const box = o.isTextShape ? (o.__text ?? null) : /text/i.test(o.type ?? '') ? o : null;
    // what you see: base style + the first character's own style (highlighted-text edits)
    const text = box ? { ...box, ...(box.getStyleAtPosition?.(0) ?? {}), text: box.text } : null;
    return {
        type: String(o.type ?? ''),
        fill: paint(o.isTextShape ? (o.__box?.fill ?? o.fill) : o.fill),
        stroke: paint(o.isTextShape ? (o.__box?.stroke ?? o.stroke) : o.stroke),
        strokeWidth: Number(o.isTextShape ? (o.__box?.strokeWidth ?? 0) : (o.strokeWidth ?? 0)),
        width: Math.round((o.width ?? 0) * Math.abs(o.scaleX ?? 1) * 100) / 100,
        height: Math.round((o.height ?? 0) * Math.abs(o.scaleY ?? 1) * 100) / 100,
        ...(text
            ? {
                  text: String(text.text ?? ''),
                  fontSize: text.fontSize,
                  fontWeight: text.fontWeight,
                  fontStyle: text.fontStyle,
                  underline: !!text.underline,
                  textAlign: text.textAlign,
              }
            : {}),
        ...(o.isTextShape ? { isTextShape: true } : {}),
    };
}

const api = {
    /** Every user object on the canvas (helpers excluded), bottom to top. */
    objects: (): E2EObject[] =>
        ((useStore.getState() as any).canvas?.getObjects?.() ?? [])
            .filter((o: any) => !o.excludeFromExport)
            .map(describe),
    /** The selected objects. */
    selection: (): E2EObject[] =>
        ((useStore.getState() as any).canvas?.getActiveObjects?.() ?? []).map(describe),
    /** Read-only peek at store fields (e.g. 'zoom', 'pages'). */
    state: (key: string): unknown => (useStore.getState() as any)[key],
    /**
     * Where user object `index` sits, in CANVAS px (scene = canvas px in design mode), plus the canvas
     * width so a test can turn it into screen px: screen = canvasBox.x + x × canvasBox.width / canvasWidth.
     */
    bounds: (index: number) => {
        const canvas = (useStore.getState() as any).canvas;
        const o = (canvas?.getObjects?.() ?? []).filter((x: any) => !x.excludeFromExport)[index];
        const b = o?.getBoundingRect?.() ?? { left: 0, top: 0, width: 0, height: 0 };
        return {
            left: b.left,
            top: b.top,
            width: b.width,
            height: b.height,
            canvasWidth: canvas?.getWidth?.() ?? 1,
        };
    },
    /** True once the Fabric canvas is mounted. */
    ready: (): boolean => !!(useStore.getState() as any).canvas,
};

declare global {
    interface Window {
        __fateboard?: typeof api;
    }
}

window.__fateboard = api;
