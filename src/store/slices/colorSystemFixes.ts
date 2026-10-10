/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Drop-in fixes for the color system (Fabric v6).
 *
 * HOW TO USE
 *  1. In your shape-style file: DELETE the old cssColorToHex, tailwindBgToHex and createFabricGradient,
 *     and import them from here (or paste them over).
 *  2. In createShapeStyleSlice: DELETE the old setFill, setStroke, applyFillGradient, handleColorChange
 *     and spread `...createColorMethods(set, get)` into the returned object instead.
 *  3. In createTextSlice.addText: replace the two fabricText.on('editing:...') blocks with
 *     wirePlaceholderBehavior(fabricText, canvas, { text, textColor, placeholderColor }).
 */
import * as fabric from 'fabric';
import tailwindcolors from 'tailwindcss/colors';

/* -------------------------------------------------------------------------- */
/* Color helpers                                                              */
/* -------------------------------------------------------------------------- */

let _ctx: CanvasRenderingContext2D | null = null;

/**
 * The old version reset fillStyle to '#000' first, so an INVALID color silently
 * came back as black. We parse twice with different sentinels: if the results differ,
 * the browser rejected the value.
 */
export function cssColorToHex(color: string): string | null {
    if (typeof color !== 'string') return null;
    if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
    const ctx = _ctx;
    if (!ctx) return null;

    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    const a = ctx.fillStyle;

    ctx.fillStyle = '#fff';
    ctx.fillStyle = color;
    const b = ctx.fillStyle;

    return a === b ? (a as string) : null;
}

/** Handles bg-red-500 AND single-word colors (bg-white, bg-black, bg-transparent) */
export function tailwindBgToHex(bgClass: string): string | undefined {
    const [, color, shade] = bgClass.split('-');
    const entry = (tailwindcolors as any)[color];
    if (typeof entry === 'string') return entry;
    return entry?.[shade];
}

/* -------------------------------------------------------------------------- */
/* Gradient                                                                   */
/* -------------------------------------------------------------------------- */

export type GradientStop = { offset: number; color: string; opacity?: number };
export type GradientConfig = { type: 'linear' | 'radial'; angle: number; stops: GradientStop[] };

export function angleToCoords(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return {
        x1: 0.5 - Math.cos(rad) / 2,
        y1: 0.5 - Math.sin(rad) / 2,
        x2: 0.5 + Math.cos(rad) / 2,
        y2: 0.5 + Math.sin(rad) / 2,
    };
}

/**
 * Fabric only knows gradientUnits 'pixels' | 'percentage'. 'objectBoundingBox' is an SVG word;
 * Fabric treats anything that isn't 'percentage' as pixels, so 0..1 coords became a 1px gradient
 * and the fill rendered as an (almost) solid color.
 */
export function createFabricGradient(gradient: GradientConfig) {
    if (gradient.type === 'linear') {
        return new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'percentage',
            coords: angleToCoords(gradient.angle),
            colorStops: gradient.stops,
        } as any) as any;
    }

    return new fabric.Gradient({
        type: 'radial',
        gradientUnits: 'percentage',
        coords: { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.5 },
        colorStops: gradient.stops,
    } as any) as any;
}

/* -------------------------------------------------------------------------- */
/* Which objects actually get painted                                         */
/* -------------------------------------------------------------------------- */

const typeOf = (o: any) => (o?.type || '').toLowerCase();
const TEXT_TYPES = ['text', 'itext', 'textbox'];

/**
 * A Group (arrow, "paper" card...) ignores its own fill/stroke, so painting it did nothing.
 * Paint its children instead. For fill we skip text inside groups so card text stays readable.
 */
export function collectPaintTargets(objects: any[], paint: 'fill' | 'stroke'): any[] {
    const out: any[] = [];
    const visit = (o: any, inGroup = false) => {
        const t = typeOf(o);
        if (t === 'group') {
            o.getObjects().forEach((c: any) => visit(c, true));
            return;
        }
        if (paint === 'fill' && inGroup && TEXT_TYPES.includes(t)) return;
        out.push(o);
    };
    objects.forEach((o) => visit(o));
    return out;
}

/* -------------------------------------------------------------------------- */
/* Slice methods (spread into createShapeStyleSlice)                          */
/* -------------------------------------------------------------------------- */

export const createColorMethods = (set: any, get: any) => ({
    // 'solid' | 'gradient' - for the UI tab; kept in sync on selection (see createCanvasSlice)
    fillMode: 'solid',

    /**
     * Ends gradient-stop editing. The old code never cleared geditor.activeStop, so once you had
     * edited a gradient stop EVERY later color pick was routed to that stale stop.
     * NOTE: `activeStop` / `detach` are my guess at MultiStopGradientTool's API - rename if needed.
     */
    clearGradientSession: () => {
        const g = get().geditor;
        if (!g) return;
        g.activeStop = null;
        g.detach?.();
    },

    /** The single place where a solid color is applied */
    applySolidColor: (paint: 'fill' | 'stroke', color: string) => {
        const canvas = get().canvas;
        if (!canvas) return;

        // Switching to a solid fill must drop any gradient session
        if (paint === 'fill') get().clearGradientSession();

        const targets = collectPaintTargets(canvas.getActiveObjects(), paint);
        targets.forEach((o: any) => {
            // Editing text with a highlighted range: color only that range
            if (paint === 'fill' && o.isEditing && o.selectionStart !== o.selectionEnd) {
                o.setSelectionStyles({ fill: color });
            } else {
                // No `instanceof Gradient` guard anymore: that guard is what blocked
                // solid colors after a gradient had been applied.
                o.set({ [paint]: color });
            }
            o.set('dirty', true);
        });

        canvas.requestRenderAll();
        set(paint === 'fill' ? { fill: color, fillMode: 'solid' } : { stroke: color });
        get().saveState?.();
    },

    setFill: (input: string) => {
        let color = input;
        if (typeof color === 'string' && color.startsWith('bg-')) {
            const hex = tailwindBgToHex(color);
            if (!hex) return;
            color = hex;
        }
        get().applySolidColor('fill', color);
    },

    setStroke: (color: string) => get().applySolidColor('stroke', color),

    /** The old setShadowColor (text slice) only wrote to the store; the object's shadow never changed */
    applyShadowColor: (color: string) => {
        const canvas = get().canvas;
        if (!canvas) return;

        canvas.getActiveObjects().forEach((o: any) => {
            const s = o.shadow;
            if (!s) return;
            o.set(
                'shadow',
                new fabric.Shadow({
                    color,
                    blur: s.blur,
                    offsetX: s.offsetX,
                    offsetY: s.offsetY,
                    affectStroke: s.affectStroke,
                    nonScaling: s.nonScaling,
                }),
            );
        });

        get().setShadowColor?.(color); // keep the store value in sync
        canvas.requestRenderAll();
        get().saveState?.();
    },

    applyFillGradient: () => {
        const canvas = get().canvas;
        if (!canvas || canvas.getActiveObjects().length === 0) return;

        get().clearGradientSession();

        // Old code did obj.set('fill') on the ActiveSelection itself (no effect) - paint the real targets
        collectPaintTargets(canvas.getActiveObjects(), 'fill').forEach((o: any) => {
            o.set('fill', createFabricGradient(get().gradient));
            o.set('dirty', true);
        });

        set({ fillMode: 'gradient' });
        canvas.requestRenderAll();
        get().saveState?.();
    },

    /**
     * activePaint is now 'fill' | 'stroke' | 'shadow'.
     * The old code routed by the global `hasShadow` boolean: once the shadow switch was on,
     * EVERY color pick went to the shadow (and only into the store). Your shadow color picker
     * must call setActivePaint('shadow') when it opens, and setActivePaint('fill') when it closes.
     */
    handleColorChange: (input: string) => {
        const canvas = get().canvas;
        if (!canvas) return;

        let color = input;
        if (typeof color === 'string' && color.startsWith('bg-')) {
            const hex = tailwindBgToHex(color);
            if (!hex) return;
            color = hex;
        }

        const normalized = cssColorToHex(color);
        if (!normalized) return;

        const paint: 'fill' | 'stroke' | 'shadow' = get().activePaint;
        const geditor = get().geditor;

        // 1) Editing a gradient stop
        if (paint === 'fill' && geditor?.activeStop) {
            geditor.updateActiveColor(normalized);
            set({ fill: normalized }); // the gradient tool reads the store fill
            canvas.requestRenderAll();
            get().saveState?.();
            return;
        }

        // 2) Nothing selected: only update defaults for the next object / brush
        if (canvas.getActiveObjects().length === 0) {
            if (paint === 'stroke') set({ stroke: normalized });
            else if (paint === 'shadow') get().setShadowColor?.(normalized);
            else {
                set({ fill: normalized });
                get().setBrushColor?.({ color: normalized });
            }
            return;
        }

        // 3) Normal solid color
        if (paint === 'shadow') get().applyShadowColor(normalized);
        else get().applySolidColor(paint, normalized);
    },
});

/* -------------------------------------------------------------------------- */
/* Text slice: placeholder behaviour                                          */
/* -------------------------------------------------------------------------- */

/**
 * Old editing:exited did fabricText.set('fill', textColor) EVERY time, wiping any color the user
 * had picked. Now we only touch the fill for the placeholder state.
 */
export function wirePlaceholderBehavior(
    tb: any,
    canvas: any,
    opts: { text: string; textColor: string; placeholderColor: string },
) {
    tb.__isPlaceholder = true;

    tb.on('editing:entered', () => {
        if (!tb.__isPlaceholder) return;
        tb.__isPlaceholder = false;
        if (tb.fill === opts.placeholderColor) tb.set('fill', opts.textColor);
        tb.selectAll();
        canvas.requestRenderAll();
    });

    tb.on('editing:exited', () => {
        if (!tb.text.trim()) {
            tb.set({ text: opts.text, fill: opts.placeholderColor });
            tb.__isPlaceholder = true;
        }
        // non-empty: keep whatever color the user chose
        canvas.requestRenderAll();
    });
}

/*
 * Also in createTextSlice.updateText:
 *   Fabric v6 types are 'Textbox' / 'IText', so  active.type.includes('text')  was always false.
 *   Use:  active.type.toLowerCase().includes('text')
 */
