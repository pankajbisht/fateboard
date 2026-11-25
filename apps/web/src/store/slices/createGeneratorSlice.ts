import * as fabric from 'fabric';
import { nanoid } from 'nanoid';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { PAINT_DEFAULTS } from '@/lib/paintToggle';
import { fractalPath, type FractalKind } from '@/lib/generators/fractals';
import {
    cellsToPath,
    elementary,
    lifeRun,
    lifeSeed,
    type LifePreset,
} from '@/lib/generators/automata';
import type { SliceCreator } from '../types';

/** Right-dock generators (Fractals, Cellular Automata): each inserts ONE editable vector path. */
export type InsertFractalOptions = {
    kind: FractalKind;
    depth: number;
    /** longest side in px before the page/zoom creation scale */
    size: number;
    angle?: number;
    color?: string;
};

export type InsertAutomatonOptions = {
    mode: 'elementary' | 'life';
    cols: number;
    rows: number;
    /** cell pitch in px before the creation scale (default 8) */
    cell?: number;
    gap?: number;
    color?: string;
    /** elementary */
    rule?: number;
    seed?: 'single' | 'random';
    /** life */
    preset?: LifePreset;
    steps?: number;
    density?: number;
    wrap?: boolean;
};

export interface GeneratorSlice {
    insertFractal: (options: InsertFractalOptions) => fabric.Path | null;
    insertAutomaton: (options: InsertAutomatonOptions) => fabric.Path | null;
}

const FRACTAL_NAMES: Record<FractalKind, string> = {
    koch: 'Koch snowflake',
    sierpinski: 'Sierpinski triangle',
    tree: 'Fractal tree',
    dragon: 'Dragon curve',
    hilbert: 'Hilbert curve',
};
const FILLED: FractalKind[] = ['koch', 'sierpinski'];
const INK = PAINT_DEFAULTS.shape.stroke;

export const createGeneratorSlice: SliceCreator<GeneratorSlice> = (_set, get) => {
    /** add → select → render → history → layer (same order as `addShape`); autosave follows object:added */
    const place = (d: string, name: string, style: Partial<fabric.Path>) => {
        const canvas: fabric.Canvas | null = get().canvas;
        if (!canvas || !d) return null;
        try {
            const center = canvas.getVpCenter();
            const path = new fabric.Path(d, {
                ...style,
                left: center.x,
                top: center.y,
                originX: 'center',
                originY: 'center',
                strokeUniform: true,
                strokeLineJoin: 'round',
                strokeLineCap: 'round',
            });
            Object.assign(path, { id: nanoid(), name });
            canvas.add(path);
            canvas.setActiveObject(path);
            canvas.requestRenderAll();
            get().saveState?.();
            get().addLayer?.(path, 'path');
            return path;
        } catch (error) {
            console.error('[generators] could not insert', name, error);
            return null;
        }
    };

    return {
        insertFractal: ({ kind, depth, size, angle, color = INK }) => {
            if (!get().canvas) return null;
            const k = creationScaleOf(get());
            const { d } = fractalPath({ kind, depth, size: size * k, angle });
            const filled = FILLED.includes(kind);
            return place(d, FRACTAL_NAMES[kind], {
                fill: filled ? color : '',
                stroke: filled ? '' : color,
                strokeWidth: filled ? 0 : 1.5 * k,
                fillRule: 'evenodd',
            });
        },

        insertAutomaton: (opts) => {
            if (!get().canvas) return null;
            const k = creationScaleOf(get());
            const grid =
                opts.mode === 'elementary'
                    ? elementary({
                          rule: opts.rule ?? 30,
                          width: opts.cols,
                          generations: opts.rows,
                          seed: opts.seed,
                      })
                    : lifeRun(
                          lifeSeed({
                              preset: opts.preset ?? 'random',
                              cols: opts.cols,
                              rows: opts.rows,
                              density: opts.density,
                          }),
                          opts.steps ?? 0,
                          opts.wrap ?? true,
                      );
            const { d } = cellsToPath(grid, (opts.cell ?? 8) * k, (opts.gap ?? 1) * k);
            const name = opts.mode === 'elementary' ? `Rule ${opts.rule ?? 30}` : 'Game of Life';
            return place(d, name, { fill: opts.color ?? INK, stroke: '', strokeWidth: 0 });
        },
    };
};
