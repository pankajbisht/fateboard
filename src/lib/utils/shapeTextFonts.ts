/**
 * Font upkeep for text shapes (sticky notes, text rectangles, …). Installed once per canvas.
 *
 * - When web fonts finish loading, every text shape re-measures its text and re-fits, so lines
 *   are wrapped with the real glyph widths instead of the fallback font's.
 * - Text shapes that arrive from JSON (reload / undo) start loading their font.
 *
 * Formatting UI is NOT here: text shapes use the app's one text float (FloatingTextToolbar).
 */
import { injectFontStyles, loadFont } from './shapeFonts';

export interface ShapeTextFontsApi {
    getParts: (group: any) => { box: any; text: any };
    /** re-wrap the text and grow the shape if needed */
    fit: (group: any) => void;
}

const installed = new WeakSet<object>();

export function installShapeTextFonts(canvas: any, api: ShapeTextFontsApi) {
    if (!canvas || installed.has(canvas)) return;
    if (!canvas.wrapperEl) return;
    installed.add(canvas);

    injectFontStyles();

    const refitAll = () => {
        // canvas disposed (mode switch): stop listening
        if (!canvas.wrapperEl?.isConnected) {
            document.fonts?.removeEventListener?.('loadingdone', refitAll);
            return;
        }

        canvas
            .getObjects()
            .filter((o: any) => o.isTextShape)
            .forEach((g: any) => {
                api.getParts(g).text?.initDimensions?.();
                api.fit(g);
            });

        canvas.requestRenderAll();
    };
    document.fonts?.addEventListener?.('loadingdone', refitAll);

    canvas.on('object:added', (e: any) => {
        const t = e?.target;
        if (!t?.isTextShape) return;
        const family = api.getParts(t).text?.fontFamily;
        if (family) void loadFont(family);
    });
}
