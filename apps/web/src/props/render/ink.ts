import { darken, lighten } from '@/character/render/styles';
import { mulberry32 } from '@/lib/brushes/stamp/rng';

/**
 * The pen every prop draws with: manga look = flat fills, one ink outline (colour + width from the prop's
 * data), thinner ink for detail lines. Returns SVG element strings that Fabric's loader reads shape for shape.
 */
export interface InkOptions {
    /** outline width as a multiple of the prop's outline (0 = no outline) */
    lw?: number;
    /** no outline at all (shading patches, highlights) */
    bare?: boolean;
    opacity?: number;
    transform?: string;
    /** corner radius (rect only) */
    rx?: number;
}

export interface Ink {
    ink: string;
    /** the prop's outline width, px */
    w: number;
    variant: number;
    /** a slot's colour */
    c: (slot: string) => string;
    /** a darker / lighter tone of a slot (shadow side, highlight) */
    shade: (slot: string, amount?: number) => string;
    light: (slot: string, amount?: number) => string;
    /** seeded: the same prop always draws the same picture */
    rand: () => number;
    path: (d: string, fill: string, o?: InkOptions) => string;
    circle: (cx: number, cy: number, r: number, fill: string, o?: InkOptions) => string;
    ellipse: (
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        fill: string,
        o?: InkOptions,
    ) => string;
    rect: (x: number, y: number, w: number, h: number, fill: string, o?: InkOptions) => string;
    /** an open ink line (detail, hatching), thinner than the outline */
    line: (d: string, o?: InkOptions & { color?: string }) => string;
    /** a thick round stroke with an ink edge (branches, stems, rainbow bands) */
    limb: (d: string, width: number, color: string) => string;
    /** several limbs as one tree: every ink edge first, then every fill, so joints show no seams */
    limbs: (list: readonly { d: string; width: number }[], color: string) => string;
    /** a coloured round stroke with no ink edge (rainbow bands, rain streaks, birds) */
    stroke: (d: string, width: number, color: string, o?: InkOptions) => string;
}

/** One decimal: short SVG, stable output. */
export const n = (v: number) => String(Math.round(v * 10) / 10);

/** A small string hash: the prop's seed. */
export function seedOf(id: string): number {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    return h >>> 0;
}

export function makeInk(o: {
    colors: Record<string, string>;
    ink: string;
    width: number;
    variant: number;
    seed: number;
}): Ink {
    const c = (slot: string) => o.colors[slot] ?? '#ff00ff';
    const stroke = (opt: InkOptions = {}, base = 1) => {
        const w = opt.bare ? 0 : o.width * (opt.lw ?? base);
        const s =
            w > 0
                ? ` stroke="${o.ink}" stroke-width="${n(w)}" stroke-linejoin="round" stroke-linecap="round"`
                : '';
        const op = opt.opacity !== undefined ? ` opacity="${n(opt.opacity)}"` : '';
        const tr = opt.transform ? ` transform="${opt.transform}"` : '';
        return s + op + tr;
    };
    const round = (d: string, width: number, color: string, opt: InkOptions = {}) =>
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"${stroke({ ...opt, bare: true })}/>`;
    const limbs = (list: readonly { d: string; width: number }[], color: string) =>
        (o.width > 0 ? list.map((l) => round(l.d, l.width + o.width * 2, o.ink)).join('') : '') +
        list.map((l) => round(l.d, l.width, color)).join('');
    return {
        ink: o.ink,
        w: o.width,
        variant: o.variant,
        c,
        shade: (slot, amount = 0.22) => darken(c(slot), amount),
        light: (slot, amount = 0.35) => lighten(c(slot), amount),
        rand: mulberry32(o.seed),
        path: (d, fill, opt) => `<path d="${d}" fill="${fill}"${stroke(opt)}/>`,
        circle: (cx, cy, r, fill, opt) =>
            `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${stroke(opt)}/>`,
        ellipse: (cx, cy, rx, ry, fill, opt) =>
            `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${stroke(opt)}/>`,
        rect: (x, y, w, h, fill, opt) =>
            `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${opt?.rx ? ` rx="${n(opt.rx)}" ry="${n(opt.rx)}"` : ''} fill="${fill}"${stroke(opt)}/>`,
        line: (d, opt = {}) => {
            const w = o.width * (opt.lw ?? 0.6);
            if (w <= 0 && !opt.color) return '';
            const op = opt.opacity !== undefined ? ` opacity="${n(opt.opacity)}"` : '';
            return `<path d="${d}" fill="none" stroke="${opt.color ?? o.ink}" stroke-width="${n(Math.max(w, 0.8))}" stroke-linecap="round" stroke-linejoin="round"${op}/>`;
        },
        limb: (d, width, color) => limbs([{ d, width }], color),
        limbs,
        stroke: round,
    };
}
