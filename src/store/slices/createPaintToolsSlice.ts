/**
 * Paint tools: Paint bucket (G), Spray (Shift + B), Copy spray (Shift + S, ./paintTools/copySpray*), Lasso (L),
 * Drafter (D), "Reflect selection" and the Brush
 * settings overrides of the stamp brushes. Settings live here; the tools listen on the canvas only while
 * active (attached / detached by the store subscription below, like the Pen and the Laser). The geometry is in
 * lib/canvas (floodFill, traceContours, lasso, drafter, symmetry); the canvas work in ./paintTools.
 *
 * Every document change is a normal canvas add / set: history records it from `object:added` (one step per
 * action; `saveState()` where no event fires). Drawing guides (the symmetry axes) are helper objects:
 * excluded from export, layers, snapping and history.
 */
import * as fabric from 'fabric';
import type { SliceCreator } from '../types';
import { screenScale } from '@/lib/canvas/screenScale';
import { symmetryGuides, symmetryMatrices, type SymmetryMode } from '@/lib/canvas/symmetry';
import { resolveStamp, type StampParams } from '@/lib/brushes/stamp/stampParams';
import type { Pt } from '@/lib/canvas/lasso';
import type { Unit } from '@/lib/units';
import { DEFAULT_SPRAY_STYLE, sanitizeSprayStyle, type SprayStyle } from '../sprayStyle';
import { symmetryClones } from '../brushes/symmetryCopies';
import { bucketFill, isHelperObject, type BucketResult } from './paintTools/bucketFill';
import { attachLasso, lassoTargets, selectObjects } from './paintTools/lassoTool';
import { attachDrafter, drafterObject } from './paintTools/drafterTool';
import { createCopySpray, type CopySprayActions } from './paintTools/copySprayActions';
import {
    DEFAULT_BUCKET_STYLE,
    DEFAULT_DRAFTER_STYLE,
    DEFAULT_LASSO_STYLE,
    sanitizeBucketStyle,
    sanitizeDrafterStyle,
    sanitizeLassoStyle,
    type BucketStyle,
    type DrafterStyle,
    type LassoStyle,
} from './paintTools/paintToolStyles';

export type ReflectOptions = {
    mode: Exclude<SymmetryMode, 'none'>;
    /** Mirror axis angle (degrees) for 'angle' / 'kaleido'. */
    angle?: number;
    /** Copies around the centre for 'radial' / 'kaleido'. */
    count?: number;
    /** Centre: the selection's centre or the middle of the page / view. */
    around?: 'selection' | 'page';
};

export interface PaintToolsSlice extends CopySprayActions {
    bucketStyle: BucketStyle;
    setBucketStyle: (patch: Partial<BucketStyle>) => void;
    lassoStyle: LassoStyle;
    setLassoStyle: (patch: Partial<LassoStyle>) => void;
    drafterStyle: DrafterStyle;
    setDrafterStyle: (patch: Partial<DrafterStyle>) => void;
    sprayStyle: SprayStyle;
    setSprayStyle: (patch: Partial<SprayStyle>) => void;
    /** Brush settings panel: per stamp brush, the settings changed from the library's. */
    stampOverrides: Record<string, Partial<StampParams>>;
    setStampOverride: (brushId: string, patch: Partial<StampParams>) => void;
    resetStampOverride: (brushId: string) => void;
    /** Paint bucket at a scene point with the drawing colour. */
    bucketFillAt: (point: Pt) => BucketResult['kind'];
    /** Lasso: select what a loop (scene points) picks. Returns how many objects are selected. */
    lassoSelect: (loop: Pt[], mode?: 'replace' | 'add' | 'subtract') => number;
    /** Lasso fill: the loop becomes a filled shape in the drawing colour. */
    lassoFill: (loop: Pt[]) => boolean;
    /** Drafter: draw a line / dimension / construction line from a to b (scene). */
    drafterLine: (a: Pt, b: Pt) => boolean;
    /** Symmetry copies of the selection (one undo step). Returns how many copies were added. */
    reflectSelection: (options: ReflectOptions) => Promise<number>;
}

const GUIDE = '__fbSymmetryGuide';
const DRAW_TOOLS = ['draw', 'spray'];

export const createPaintToolsSlice: SliceCreator<PaintToolsSlice> = (set, get, store) => {
    type Peers = PaintToolsSlice & {
        canvas?: fabric.Canvas | null;
        activeTool?: string;
        setActiveTool?: (tool: string) => void;
        color?: string;
        unit?: Unit;
        boardMode?: 'design' | 'whiteboard' | null;
        saveState?: () => void;
        showToast?: (o: { message: string }) => void;
        isPageSwitching?: boolean;
        _isRestoring?: boolean;
        currentPageId?: string | null;
        zoom?: number;
        symmetry?: SymmetryMode;
        symmetryCenter?: Pt | null;
        symmetryAngle?: number;
        symmetryCount?: number;
    };
    const peers = () => get() as unknown as Peers;
    const screen = () => {
        const c = peers().canvas;
        return c ? screenScale(c) : 1;
    };
    const toast = (message: string) => peers().showToast?.({ message });
    const copySpray = createCopySpray(set as never, get);

    /* -------------------- tool listeners (while the tool is active) -------------------- */

    let detach: (() => void) | null = null;
    const attach = (tool: string | undefined, canvas: fabric.Canvas) => {
        if (tool === 'bucket') {
            const onDown = (opt: { e?: { button?: number }; scenePoint?: Pt }) => {
                if (opt?.e?.button || !opt?.scenePoint) return;
                get().bucketFillAt({ x: opt.scenePoint.x, y: opt.scenePoint.y });
            };
            const off = canvas.on('mouse:down', onDown as never);
            detach = () => off();
        } else if (tool === 'lasso')
            detach = attachLasso(canvas, {
                style: () => get().lassoStyle,
                onSelect: (loop, mode) => get().lassoSelect(loop, mode),
                onFill: (loop) => get().lassoFill(loop),
                onEscape: () => peers().setActiveTool?.('select'),
                screen,
            });
        else if (tool === 'drafter')
            detach = attachDrafter(canvas, {
                style: () => get().drafterStyle,
                color: () => peers().color ?? '#000000',
                unit: () => peers().unit ?? 'px',
                screen,
                onLine: (a, b) => get().drafterLine(a, b),
                onEscape: () => peers().setActiveTool?.('select'),
            });
        else if (tool === 'copySpray') detach = copySpray.attach(canvas, screen);
    };

    /* -------------------- symmetry guide (helper object) -------------------- */

    let guideKey = '';
    const removeGuide = (canvas?: fabric.Canvas | null) => {
        guideKey = '';
        if (!canvas) return;
        const old = canvas
            .getObjects()
            .filter((o) => (o as unknown as Record<string, unknown>)[GUIDE]);
        if (old.length) canvas.remove(...old);
    };
    const syncGuide = () => {
        const s = peers();
        const canvas = s.canvas;
        if (!canvas || s.isPageSwitching) return;
        const mode = s.symmetry ?? 'none';
        if (!DRAW_TOOLS.includes(s.activeTool ?? '') || mode === 'none') return removeGuide(canvas);
        const c = s.symmetryCenter ?? canvas.getVpCenter();
        const k = screen();
        const key = [mode, c.x, c.y, s.symmetryAngle, s.symmetryCount, k, s.currentPageId].join(
            '|',
        );
        const present = canvas
            .getObjects()
            .some((o) => (o as unknown as Record<string, unknown>)[GUIDE]);
        if (key === guideKey && present) return;
        removeGuide(canvas);
        const r = Math.hypot(canvas.getWidth(), canvas.getHeight()) / Math.max(k, 1e-6);
        const lines = symmetryGuides(mode, c, s.symmetryAngle, s.symmetryCount, r);
        if (!lines.length) return;
        const guide = new fabric.Path(
            lines.map(({ a, b }) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`).join(' '),
            {
                originX: 'left',
                originY: 'top',
                fill: null,
                stroke: 'rgba(37, 99, 235, 0.55)',
                strokeWidth: 1 / k,
                strokeDashArray: [6 / k, 5 / k],
                selectable: false,
                evented: false,
                excludeFromExport: true,
                objectCaching: false,
            },
        );
        Object.assign(guide, {
            [GUIDE]: true,
            _isHelper: true,
            excludeFromLayers: true,
            excludeFromSnap: true,
        });
        canvas.add(guide);
        guideKey = key;
        canvas.requestRenderAll();
    };

    store?.subscribe?.((state, prevState) => {
        const next = state as unknown as Peers;
        const prev = prevState as unknown as Peers;
        if (next.activeTool !== prev.activeTool || next.canvas !== prev.canvas) {
            detach?.();
            detach = null;
            if (next.canvas) attach(next.activeTool, next.canvas);
        }
        const guideInputs: (keyof Peers)[] = [
            'activeTool',
            'canvas',
            'symmetry',
            'symmetryCenter',
            'symmetryAngle',
            'symmetryCount',
            'zoom',
            'isPageSwitching',
            '_isRestoring', // undo / redo reloads the page and clears the guide with it
            'currentPageId',
        ];
        if (guideInputs.some((key) => next[key] !== prev[key])) {
            if (next.canvas !== prev.canvas) removeGuide(prev.canvas);
            syncGuide();
            // a design zoom resizes the board after this change: redo the guide's line width next frame
            if (next.zoom !== prev.zoom && typeof requestAnimationFrame === 'function')
                requestAnimationFrame(syncGuide);
        }
    });

    const addAndRecord = (canvas: fabric.Canvas, obj: fabric.FabricObject) => {
        canvas.add(obj);
        canvas.requestRenderAll();
    };

    return {
        ...copySpray.state,
        bucketStyle: DEFAULT_BUCKET_STYLE,
        setBucketStyle: (patch) =>
            set(
                { bucketStyle: sanitizeBucketStyle(get().bucketStyle, patch) },
                false,
                'paint/bucket',
            ),
        lassoStyle: DEFAULT_LASSO_STYLE,
        setLassoStyle: (patch) =>
            set({ lassoStyle: sanitizeLassoStyle(get().lassoStyle, patch) }, false, 'paint/lasso'),
        drafterStyle: DEFAULT_DRAFTER_STYLE,
        setDrafterStyle: (patch) =>
            set(
                { drafterStyle: sanitizeDrafterStyle(get().drafterStyle, patch) },
                false,
                'paint/drafter',
            ),
        sprayStyle: DEFAULT_SPRAY_STYLE,
        setSprayStyle: (patch) => {
            set({ sprayStyle: sanitizeSprayStyle(get().sprayStyle, patch) }, false, 'paint/spray');
            const s = get() as unknown as {
                activeTool?: string;
                updateBrush?: (p: object) => void;
            };
            if (s.activeTool === 'spray') s.updateBrush?.({}); // the open Spray draws with it now
        },

        stampOverrides: {},
        setStampOverride: (brushId, patch) => {
            const prev = get().stampOverrides[brushId] ?? {};
            const merged = { ...prev, ...patch };
            // keep only valid values (resolveStamp drops junk); store the partial, not the full set
            const valid = resolveStamp(merged);
            const clean = Object.fromEntries(
                Object.keys(merged).map((k) => [k, valid[k as keyof StampParams]]),
            ) as Partial<StampParams>;
            set(
                { stampOverrides: { ...get().stampOverrides, [brushId]: clean } },
                false,
                'paint/stamp',
            );
            const s = get() as unknown as { brush?: string; updateBrush?: (p: object) => void };
            if (s.brush === brushId) s.updateBrush?.({});
        },
        resetStampOverride: (brushId) => {
            const rest = { ...get().stampOverrides };
            delete rest[brushId];
            set({ stampOverrides: rest }, false, 'paint/stamp-reset');
            const s = get() as unknown as { brush?: string; updateBrush?: (p: object) => void };
            if (s.brush === brushId) s.updateBrush?.({});
        },

        bucketFillAt: (point) => {
            const s = peers();
            const canvas = s.canvas;
            if (!canvas) return 'none';
            try {
                const result = bucketFill(canvas, point, s.color ?? '#000000', get().bucketStyle, {
                    screen: screen(),
                    whiteboard: s.boardMode === 'whiteboard',
                });
                if (result.kind === 'shape') s.saveState?.(); // a set() fires no canvas event
                if (result.kind === 'open')
                    toast(
                        'That area is open to the edge of the view. Close the gap or raise "Gap".',
                    );
                canvas.requestRenderAll();
                return result.kind;
            } catch (err) {
                console.error('[paintTools] bucket fill failed', err);
                return 'none';
            }
        },

        lassoSelect: (loop, mode = 'replace') => {
            const s = peers();
            const canvas = s.canvas;
            if (!canvas || loop.length < 3) return 0;
            const picked = lassoTargets(canvas, loop, get().lassoStyle.match);
            const current = canvas.getActiveObjects();
            const result =
                mode === 'add'
                    ? [...current, ...picked.filter((o) => !current.includes(o))]
                    : mode === 'subtract'
                      ? current.filter((o) => !picked.includes(o))
                      : picked;
            s.setActiveTool?.('select'); // move the selection right away
            selectObjects(canvas, result);
            return result.length;
        },

        lassoFill: (loop) => {
            const s = peers();
            const canvas = s.canvas;
            if (!canvas || loop.length < 3) return false;
            const d = `M ${loop.map((p) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`).join(' L ')} Z`;
            const shape = new fabric.Path(d, {
                originX: 'left',
                originY: 'top',
                fill: s.color ?? '#000000',
                stroke: null,
                strokeWidth: 0,
            });
            (shape as unknown as Record<string, unknown>).name = 'Lasso fill';
            addAndRecord(canvas, shape);
            return true;
        },

        drafterLine: (a, b) => {
            const s = peers();
            const canvas = s.canvas;
            if (!canvas || (a.x === b.x && a.y === b.y)) return false;
            try {
                addAndRecord(
                    canvas,
                    drafterObject(a, b, get().drafterStyle, s.color ?? '#000000', s.unit ?? 'px'),
                );
                return true;
            } catch (err) {
                console.error('[paintTools] drafter line failed', err);
                return false;
            }
        },

        reflectSelection: async ({ mode, angle = 90, count = 6, around = 'selection' }) => {
            const canvas = peers().canvas;
            if (!canvas) return 0;
            const active = canvas.getActiveObject();
            const objects = canvas
                .getActiveObjects()
                .filter((o) => !isHelperObject(o as fabric.FabricObject & Record<string, unknown>));
            if (!active || !objects.length) return 0;
            const center =
                around === 'page'
                    ? peers().boardMode === 'design'
                        ? { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }
                        : canvas.getVpCenter()
                    : active.getCenterPoint();
            try {
                // members of an ActiveSelection are placed relative to it: put them back on the canvas first
                canvas.discardActiveObject();
                const matrices = symmetryMatrices(mode, center, angle, count);
                const copies = (
                    await Promise.all(objects.map((o) => symmetryClones(o, matrices)))
                ).flat();
                // the page may have changed while clones (images) loaded: never add to another page
                if (peers().canvas !== canvas || peers().isPageSwitching) return 0;
                if (!copies.length) return 0;
                const before = canvas.renderOnAddRemove;
                canvas.renderOnAddRemove = false;
                try {
                    canvas.add(...copies);
                } finally {
                    canvas.renderOnAddRemove = before;
                }
                selectObjects(canvas, [...objects, ...copies]);
                return copies.length;
            } catch (err) {
                console.error('[paintTools] reflect failed', err);
                return 0;
            }
        },
    };
};
