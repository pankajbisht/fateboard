import { drawables, type Drawable, type LinearPaint, type Paint } from './parts';
import type { RenderModel } from './renderCharacter';
import { fmt } from './shapes';

/**
 * A standalone SVG document of a rendered character (placed on the board through Fabric's SVG loader, or
 * downloaded). Paths only, colours checked, gradients in <defs> (Fabric imports them). Screentone parts are a
 * plain grey here: Fabric's loader drops SVG patterns, so `board.ts` gives them the Comic tone fill instead.
 */
const HEX = /^#[0-9a-f]{6}$/i;
/** Fill of a screentone part in the SVG file (replaced by a real tone on the page). */
export const TONE_PLACEHOLDER = '#c8c8c8';

/** objectBoundingBox end points of a linear gradient at `angle` (90 = top → bottom). */
export function gradientEnds(angle: number) {
    const a = (angle * Math.PI) / 180;
    const dx = Math.cos(a) / 2;
    const dy = Math.sin(a) / 2;
    return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
}

/** Gives each distinct gradient an id (`prefix` + n) and remembers its definition. */
export function gradientRegistry(prefix: string) {
    const ids = new Map<string, { id: string; paint: LinearPaint }>();
    return {
        url(p: Paint): string {
            if (typeof p === 'string') return p === 'none' || HEX.test(p) ? p : 'none';
            const key = JSON.stringify(p);
            let entry = ids.get(key);
            if (!entry) {
                entry = { id: `${prefix}${ids.size}`, paint: p };
                ids.set(key, entry);
            }
            return `url(#${entry.id})`;
        },
        list: () => [...ids.values()],
    };
}

const stops = (p: LinearPaint) =>
    p.stops
        .filter(([, c]) => HEX.test(c))
        .map(([o, c]) => `<stop offset="${fmt(o)}" stop-color="${c}"/>`)
        .join('');

function pathSvg(d: Drawable, fill: string): string {
    const stroke = d.stroke && HEX.test(d.stroke) ? d.stroke : 'none';
    const line =
        stroke === 'none'
            ? ''
            : ` stroke="${stroke}" stroke-width="${fmt(d.strokeWidth)}" stroke-linejoin="round" stroke-linecap="round"`;
    // exact, as in the studio (fmt rounds to one decimal: 0.38 would become 0.4)
    const opacity =
        d.opacity !== undefined ? ` fill-opacity="${Math.round(d.opacity * 1000) / 1000}"` : '';
    return `<path d="${d.d}" fill="${fill}"${opacity}${line}/>`;
}

/** A short, stable hash: gradient ids that differ between characters (several SVGs can share one page). */
function hash(text: string): string {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

export function characterSvg(model: RenderModel, pixelHeight = 600): string {
    const [x, y, w, h] = model.viewBox;
    const width = Math.round((pixelHeight * w) / h);
    const items = drawables(model.parts);
    const grads = gradientRegistry(`g${hash(JSON.stringify(items.map((d) => d.fill)))}_`);
    const body = items
        .map((d) => pathSvg(d, d.tone ? TONE_PLACEHOLDER : grads.url(d.fill)))
        .join('');
    const defs = grads.list().length
        ? `<defs>${grads
              .list()
              .map(({ id, paint }) => {
                  const e = gradientEnds(paint.angle);
                  return `<linearGradient id="${id}" x1="${fmt(e.x1)}" y1="${fmt(e.y1)}" x2="${fmt(e.x2)}" y2="${fmt(e.y2)}">${stops(paint)}</linearGradient>`;
              })
              .join('')}</defs>`
        : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}" width="${width}" height="${pixelHeight}">${defs}${body}</svg>`;
}
