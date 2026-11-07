/* eslint-disable @typescript-eslint/no-explicit-any */
import { BRAND } from '@/lib/theme';
import * as fabric from 'fabric';
import { computeBoolean, type BooleanOp } from '@/lib/booleanOps';
import { collectPaintTargets, createColorMethods } from './colorSystemFixes';
import {
    SHADOW_PRESETS,
    shadowToFabric,
    toFabricGradient,
    type GradientFill,
    type ShadowStyle,
} from '@/lib/fillStyle';
import { PAINT_DEFAULTS, hasFill, hasStroke, isTextObject, paintTargets } from '@/lib/paintToggle';

// Re-exported so existing imports (e.g. `import { cssColorToHex } from '.../shapeStyle'`) keep working
export {
    cssColorToHex,
    tailwindBgToHex,
    angleToCoords,
    createFabricGradient,
} from './colorSystemFixes';
import { whenImageReady } from '@/lib/imageReady';
export type { GradientStop, GradientConfig, PaintTarget } from './colorSystemFixes';

const typeOf = (o: any) => (o?.type || '').toLowerCase();
const TEXT_TYPES = ['text', 'itext', 'textbox'];

/* -------------------------------------------------------------------------- */
/* Fill & shadow (right dock "Fill & Shadow" tab)                             */
/* -------------------------------------------------------------------------- */

type ApplyOpts = { history?: boolean };

const BOOLEAN_OPS: BooleanOp[] = ['union', 'subtract', 'intersect', 'exclude', 'divide', 'crop'];
/** Older menu entries that were duplicates of the real operations. */
const BOOLEAN_ALIASES: Record<string, BooleanOp> = {
    cut: 'divide',
    punch: 'subtract',
    smartUnion: 'union',
    xorSplit: 'exclude',
};

/* -------------------------------------------------------------------------- */
/* Slice                                                                      */
/* -------------------------------------------------------------------------- */

const NO_FILL = 'rgba(0,0,0,0)';

/** Redraw a painted object (and the group it sits in); its size may change with the stroke. */
const markPainted = (o: any) => {
    o.set('dirty', true);
    o.setCoords?.();
    o.group?.set?.('dirty', true);
};

// opacity preview: remembers each object's original opacity (was a single module variable)
const previewBase = new Map<any, number>();

export const createShapeStyleSlice = (set: any, get: any, _store?: any) => ({
    activePaint: 'fill', // 'fill' | 'stroke' | 'shadow'
    fill: 'rgba(0, 0, 0, 0)',
    stroke: '#000000',
    strokeWidth: 1,
    strokeStyle: 'solid',
    opacity: 1, // ALWAYS 0..1 now (setOpacity1 used to store 0..100 in the same key)
    activeObjectShadow: null,

    gradient: {
        type: 'linear',
        angle: 90,
        stops: [
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#0000ff' },
        ],
    },

    setGradient: (g: any) => {
        set((state: any) => ({ gradient: { ...state.gradient, ...g } }));
    },

    // setFill, setStroke, applySolidColor, applyShadowColor, applyFillGradient,
    // handleColorChange, clearGradientSession, fillMode
    ...createColorMethods(set, get),

    strokeStyleList: [
        { value: 'solid', label: 'Solid', dash: null, supported: true },
        { value: 'dashed', label: 'Dashed', dash: [10, 5], supported: true },
        { value: 'dotted', label: 'Dotted', dash: [2, 5], supported: true },
        // CSS-style effects - not renderable in Fabric.js
        { value: 'double', label: 'Double', dash: null, supported: false },
        { value: 'groove', label: 'Groove', dash: null, supported: false },
        { value: 'ridge', label: 'Ridge', dash: null, supported: false },
        { value: 'inset', label: 'Inset', dash: null, supported: false },
        { value: 'outset', label: 'Outset', dash: null, supported: false },
    ],

    strokeStyleMap: {
        solid: { dashArray: null, lineCap: 'butt' },
        dashed: { dashArray: [10, 5], lineCap: 'butt' },
        dotted: { dashArray: [2, 5], lineCap: 'round' },
        double: { dashArray: [1, 3, 1, 3], lineCap: 'butt' },
        groove: { dashArray: [4, 2, 1, 2], lineCap: 'butt' },
        ridge: { dashArray: [1, 2, 4, 2], lineCap: 'butt' },
        inset: { dashArray: [1, 1], lineCap: 'butt' },
        outset: { dashArray: [2, 1], lineCap: 'butt' },
    },

    // Choosing fill / stroke / shadow hands the palette back from any panel target
    setActivePaint: (paint: 'fill' | 'stroke' | 'shadow') =>
        set({ activePaint: paint, paintTarget: null }),

    setStrokeWidthN: (width: number) => {
        const canvas = get().canvas;
        if (!canvas) return;

        canvas
            .getActiveObjects()
            .forEach((obj: any) => obj.set({ strokeWidth: width, dirty: true }));
        canvas.requestRenderAll();
        set({ strokeWidth: width });
        get().saveState?.();
    },

    /**
     * Dock toggle: Remove stroke ⇄ Add stroke on the selection. Removes from every target if any
     * has a stroke, else adds the default (text: the Text panel outline). Groups are painted
     * through their children. Nothing selected: no-op (defaults stay). One undo step.
     */
    toggleStroke: () => {
        const canvas = get().canvas;
        const active = (canvas?.getActiveObjects?.() ?? []).filter(
            (o: any) => !o.excludeFromExport,
        );
        const targets = paintTargets(active, 'stroke');
        if (!canvas || !targets.length) return false;
        try {
            const remove = targets.some(hasStroke);
            targets.forEach((o: any) => {
                const text = isTextObject(o);
                if (remove) {
                    o.set({ stroke: null, strokeWidth: 0 });
                    if (text) {
                        o.removeStyle?.('stroke');
                        o.removeStyle?.('strokeWidth');
                    }
                } else {
                    const d = text ? PAINT_DEFAULTS.text : PAINT_DEFAULTS.shape;
                    o.set({ stroke: d.stroke, strokeWidth: d.strokeWidth });
                    if (text) o.set({ paintFirst: 'stroke' }); // outline behind the letters
                }
                markPainted(o);
            });
            canvas.requestRenderAll();
            set(
                remove
                    ? { strokeWidth: 0 }
                    : {
                          stroke: PAINT_DEFAULTS.shape.stroke,
                          strokeWidth: PAINT_DEFAULTS.shape.strokeWidth,
                      },
            );
            canvas.fire('object:modified', { target: active[0] }); // panels re-read the selection
            get().saveState?.(); // one undo step (canvas history listeners are not wired: BUG-090)
            return true;
        } catch (e) {
            console.error('[shapeStyle] toggleStroke failed', e);
            return false;
        }
    },

    /**
     * Dock toggle: Remove fill ⇄ Add fill on the selection (gradients count as fill). Removes from
     * every target if any has a fill, else adds the default (shapes white, text black). Images
     * are skipped. Nothing selected: no-op (no change to defaults or the brush). One undo step.
     */
    toggleFill: () => {
        const canvas = get().canvas;
        const active = (canvas?.getActiveObjects?.() ?? []).filter(
            (o: any) => !o.excludeFromExport,
        );
        const targets = paintTargets(active, 'fill');
        if (!canvas || !targets.length) return false;
        try {
            const remove = targets.some(hasFill);
            get().clearGradientSession?.();
            let shown = NO_FILL;
            targets.forEach((o: any, i: number) => {
                const text = isTextObject(o);
                const next = remove
                    ? NO_FILL
                    : (text ? PAINT_DEFAULTS.text : PAINT_DEFAULTS.shape).fill;
                o.set({ fill: next });
                if (text && remove) o.removeStyle?.('fill');
                if (i === 0) shown = next;
                markPainted(o);
            });
            canvas.requestRenderAll();
            set({ fill: shown, fillMode: 'solid' });
            canvas.fire('object:modified', { target: active[0] }); // panels re-read the selection
            get().saveState?.(); // one undo step
            return true;
        } catch (e) {
            console.error('[shapeStyle] toggleFill failed', e);
            return false;
        }
    },

    setStrokeStyle: (styleValue: string) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const cfg = get().strokeStyleMap[styleValue] || get().strokeStyleMap.solid;
        canvas.getActiveObjects().forEach((obj: any) => {
            obj.set({ strokeDashArray: cfg.dashArray, strokeLineCap: cfg.lineCap, dirty: true });
        });

        canvas.requestRenderAll();
        set({ strokeStyle: styleValue });
        get().saveState?.();
    },

    /* ---------- OPACITY (store value is 0..1) ---------- */
    setOpacity: (opacity: number) => {
        const canvas = get().canvas;
        if (!canvas) return;
        const objs = canvas.getActiveObjects();
        if (!objs.length) return;

        const safe = Math.min(1, Math.max(0.05, opacity));
        objs.forEach((o: any) => o.set('opacity', safe));
        canvas.requestRenderAll();
        set({ opacity: safe });
        get().saveState?.();
    },

    // kept for UIs that work in percent (0..100)
    setOpacity1: (value: number) => get().setOpacity(value / 100),

    previewOpacity: (value: number) => {
        const canvas = get().canvas;
        if (!canvas) return;
        canvas.getActiveObjects().forEach((o: any) => {
            if (!previewBase.has(o)) previewBase.set(o, o.opacity ?? 1);
            o.set('opacity', value / 100);
        });
        canvas.requestRenderAll();
    },

    // Restores the original opacity (call setOpacity afterwards to commit)
    endOpacityPreview: () => {
        const canvas = get().canvas;
        previewBase.forEach((base, o) => o.set('opacity', base));
        previewBase.clear();
        canvas?.requestRenderAll();
    },

    /* ---------- SHADOW ---------- */
    addShadow: (shadow: any) => {
        const canvas = get().canvas;
        if (!canvas) return;
        canvas.getActiveObjects().forEach((o: any) => o.set('shadow', new fabric.Shadow(shadow)));
        canvas.requestRenderAll();
        get().saveState?.();
    },

    /** Drop shadow of the selection: color + opacity + blur + offsets; null removes it. */
    setShadow: (shadow: ShadowStyle | null, opts: ApplyOpts = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;
        let last: fabric.Shadow | null = null;
        canvas.getActiveObjects().forEach((o: any) => {
            last = shadow ? shadowToFabric(shadow) : null;
            o.set('shadow', last);
            o.set('dirty', true);
        });
        canvas.requestRenderAll();
        set({ activeObjectShadow: last });
        if (opts.history !== false) get().saveState?.();
    },

    applyShadowPreset: (key: string) => {
        const preset = SHADOW_PRESETS.find((p) => p.id === key);
        if (preset) get().setShadow(preset.shadow);
    },

    removeShadow: () => get().setShadow(null),

    /* ---------- GRADIENT FILL ---------- */
    /** on-canvas gradient handles (MultiStopGradientTool) on / off */
    gradientEditing: false,

    setGradientEditing: (on: boolean) => {
        const g = get().geditor;
        if (on) {
            g?.enable?.();
            // show the handles on the selected shape right away (before: only after another click)
            const target = collectPaintTargets(get().canvas?.getActiveObjects?.() ?? [], 'fill')[0];
            if (target) g?.attach?.(target);
        } else g?.disable?.();
        set({ gradientEditing: on });
    },

    /** Paint the selection's fill with a linear / radial gradient (percentage units). */
    applyGradientFill: (gradient: GradientFill, opts: ApplyOpts = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;
        const targets = collectPaintTargets(canvas.getActiveObjects(), 'fill');
        if (targets.length === 0) return;
        targets.forEach((o: any) => {
            o.set('fill', toFabricGradient(gradient));
            o.set('dirty', true);
        });
        // move the on-canvas handles to the new geometry while editing
        if (get().gradientEditing) targets.forEach((o: any) => get().geditor?.syncFromObject?.(o));
        canvas.requestRenderAll();
        set({ fillMode: 'gradient' });
        if (opts.history !== false) get().saveState?.();
    },

    /* ---------- Fabric object -> Fabric.Path (only works for objects whose SVG has a `d`) ---------- */
    toFabricPath(obj: any) {
        if (typeOf(obj) === 'path') return obj;

        const svg = obj.toSVG();
        const match = svg.match(/d="([^"]+)"/);
        if (!match) return null;

        return new fabric.Path(match[1], {
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            angle: obj.angle,
            left: obj.left,
            top: obj.top,
        });
    },

    /* ---------- BOOLEAN OPERATIONS ---------- */
    /**
     * Union / subtract / intersect / exclude / divide / crop on the selected shapes.
     * Stacking order decides (Figma / Illustrator), not click order; geometry in lib/booleanOps.
     */
    booleanOperation: async (operation: string = 'union') => {
        const canvas = get().canvas;
        if (!canvas) return;
        const op = (BOOLEAN_ALIASES[operation] ?? operation) as BooleanOp;
        if (!BOOLEAN_OPS.includes(op)) {
            console.error('[shapeStyle] unknown boolean operation:', operation);
            return;
        }

        try {
            const stack = canvas.getObjects();
            const active = canvas.getActiveObject();
            const picked: any[] =
                typeOf(active) === 'activeselection'
                    ? active.getObjects()
                    : canvas.getActiveObjects();
            const shapes = picked
                .filter((o: any) => !TEXT_TYPES.includes(typeOf(o)))
                .sort((x: any, y: any) => stack.indexOf(x) - stack.indexOf(y)); // bottom -> top
            if (shapes.length < 2) {
                void get().alertDialog({
                    title: 'Select 2 or more shapes',
                    message: 'Boolean operations combine shapes. Text is not supported.',
                });
                return;
            }

            // absolute coordinates before reading the geometry: shapes inside a multi-selection
            // are stored relative to it (Fabric 7); removeAll() puts them back on the canvas grid
            if (typeOf(active) === 'activeselection') active.removeAll();
            canvas.discardActiveObject();
            const created = await computeBoolean(op, shapes);
            if (created.length === 0) {
                canvas.setActiveObject(new fabric.ActiveSelection(shapes, { canvas }));
                canvas.requestRenderAll();
                void get().alertDialog({
                    title: 'Nothing left',
                    message: 'The shapes do not overlap, so this operation leaves no shape.',
                });
                return;
            }

            // the result takes the originals' place in the stack
            const index = Math.min(...shapes.map((o: any) => stack.indexOf(o)));
            canvas.remove(...shapes);
            canvas.insertAt(Math.max(0, index), ...created);
            canvas.setActiveObject(
                created.length > 1 ? new fabric.ActiveSelection(created, { canvas }) : created[0],
            );
            canvas.requestRenderAll();
            get().saveState?.();
        } catch (err) {
            console.error('[shapeStyle] boolean operation failed:', err);
            void get().alertDialog({
                title: 'Boolean operation failed',
                message: 'Something went wrong. Check the console for details.',
            });
        }
    },

    /* ---------- CLIP / MASK ---------- */
    clipSelectedObject: async () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active || typeOf(active) !== 'activeselection') {
            void get().alertDialog({
                title: 'Select 2 objects',
                message: 'Select a shape and, on top of it, the shape to use as the mask.',
            });
            return;
        }

        const objects: any[] = active.getObjects();
        if (objects.length !== 2) {
            void get().alertDialog({
                title: 'Select exactly 2 objects',
                message: 'Clipping needs one target and one clip shape.',
            });
            return;
        }

        // stacking order decides (Illustrator clipping mask): the TOP shape is the mask
        const stack = canvas.getObjects();
        const [target, clipper] = [...objects].sort(
            (x: any, y: any) => stack.indexOf(x) - stack.indexOf(y),
        );

        // Back to absolute coordinates BEFORE cloning/positioning
        active.removeAll();
        canvas.discardActiveObject();

        // Wait for the image source if it is still loading (a filtered image draws from a
        // canvas: ready, and waiting on its `load` never ended)
        await whenImageReady(target);

        // Fabric v6: clone() returns a Promise (the callback version was v5)
        const clip = await clipper.clone();
        clip.set({ absolutePositioned: true }); // stays where the shape was placed

        target.set({ clipPath: clip, dirty: true });
        canvas.remove(clipper);
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
        get().saveState?.();
    },

    unionSelected: (opts?: any) => get().booleanOperation('union', opts),
    intersectSelected: (opts?: any) => get().booleanOperation('intersect', opts),
    subtractSelected: (opts?: any) => get().booleanOperation('subtract', opts),
    excludeSelected: (opts?: any) => get().booleanOperation('exclude', opts),
    divideSelected: (opts?: any) => get().booleanOperation('divide', opts),
    cutSelected: (opts?: any) => get().booleanOperation('cut', opts),
    punchSelected: (opts?: any) => get().booleanOperation('punch', opts),
    cropSelected: (opts?: any) => get().booleanOperation('crop', opts),
    smartUnionSelected: (opts?: any) => get().booleanOperation('smartUnion', opts),
    xorSplitSelected: (opts?: any) => get().booleanOperation('xorSplit', opts),
});
