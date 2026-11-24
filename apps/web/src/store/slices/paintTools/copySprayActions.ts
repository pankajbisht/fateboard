/**
 * Copy spray (Shift + S): the Paint tools slice's settings + action for it. Kept here so the slice stays
 * small; the slice spreads `state` into itself and calls `attach` when the tool becomes active.
 * The source (snapshot of the selection) lives in this closure while the tool is active, never in the store.
 */
import type * as fabric from 'fabric';
import {
    DEFAULT_COPY_SPRAY_STYLE,
    sanitizeCopySprayStyle,
    type CopySprayStyle,
    type SprayDab,
} from '@/lib/canvas/copySpray';
import {
    attachCopySpray,
    sprayCopyObject,
    takeSpraySource,
    type SpraySource,
} from './copySprayTool';

export interface CopySprayActions {
    /** Copy spray (Shift + S) settings: size, spacing, spread, jitter, align. Session only. */
    copySprayStyle: CopySprayStyle;
    setCopySprayStyle: (patch: Partial<CopySprayStyle>) => void;
    /**
     * Copy spray: copies of the selection made when the tool was chosen, one per dab, added as one group (one
     * undo step). Returns how many objects the copies hold (0 = nothing added).
     */
    sprayCopies: (dabs: SprayDab[]) => Promise<number>;
}

type Peers = CopySprayActions & {
    canvas?: fabric.Canvas | null;
    setActiveTool?: (tool: string) => void;
    showToast?: (o: { message: string }) => void;
    isPageSwitching?: boolean;
    currentPageId?: string | null;
};

type SetFn = (partial: Partial<CopySprayActions>, replace: false, action: string) => void;

export function createCopySpray(set: SetFn, get: () => unknown) {
    const peers = () => get() as Peers;
    let pending: Promise<SpraySource> | null = null;
    let ready: SpraySource | null = null;

    const state: CopySprayActions = {
        copySprayStyle: DEFAULT_COPY_SPRAY_STYLE,
        setCopySprayStyle: (patch) =>
            set(
                { copySprayStyle: sanitizeCopySprayStyle(peers().copySprayStyle, patch) },
                false,
                'paint/copy-spray',
            ),
        sprayCopies: async (dabs) => {
            const canvas = peers().canvas;
            const page = peers().currentPageId;
            const source = pending;
            if (!canvas || !source || !dabs.length) return 0;
            try {
                const made = await sprayCopyObject(await source, dabs);
                // the page may have changed (all pages share one canvas) or the tool closed while clones loaded
                if (!made || source !== pending) return 0;
                const now = peers();
                if (now.canvas !== canvas || now.isPageSwitching || now.currentPageId !== page)
                    return 0;
                canvas.add(made.object); // object:added → history, layers, autosave
                canvas.requestRenderAll();
                return made.count;
            } catch (err) {
                console.error('[paintTools] copy spray failed', err);
                return 0;
            }
        },
    };

    /**
     * The tool is active: snapshot the selection and listen. `setActiveTool` switches the store before it
     * clears the selection, so the selection is still there now.
     */
    const attach = (canvas: fabric.Canvas, screen: () => number): (() => void) => {
        const mine = takeSpraySource(canvas);
        pending = mine;
        ready = null;
        mine?.then(
            (s) => {
                if (pending === mine) ready = s;
            },
            (err) => {
                console.error('[paintTools] copy spray source failed', err);
                if (pending === mine) pending = null;
            },
        );
        const off = attachCopySpray(canvas, {
            style: () => peers().copySprayStyle,
            source: () => ready ?? (pending ? 'loading' : null),
            onSpray: (dabs) => peers().sprayCopies(dabs),
            onNoSource: () =>
                peers().showToast?.({
                    message:
                        'Select the objects to spray first, then choose Copy spray (Shift + S).',
                }),
            onEscape: () => peers().setActiveTool?.('select'),
            screen,
        });
        return () => {
            off();
            if (pending === mine) {
                pending = null; // drop the snapshot (its clones, images) with the tool
                ready = null;
            }
        };
    };

    return { state, attach };
}
