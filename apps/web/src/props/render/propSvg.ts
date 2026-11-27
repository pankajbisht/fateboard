import type { PropData, PropDef } from '../types';
import { makeInk, n, seedOf } from './ink';

/** A soft contact shadow along the bottom edge (drawn first, inside the box). */
const shadow = (def: { width: number; height: number }) => {
    const ry = Math.max(4, Math.min(12, def.height * 0.05));
    return `<ellipse cx="${n(def.width / 2)}" cy="${n(def.height - ry)}" rx="${n(def.width * 0.42)}" ry="${n(ry)}" fill="#000000" opacity="0.2"/>`;
};

/** A prop as a whole SVG document, at its drawing size (the page object and the panel thumbnail). */
export function propSvg(def: PropDef, data: PropData): string {
    const k = makeInk({
        colors: { ...def.colors, ...data.colors },
        ink: data.outline,
        width: data.outlineWidth,
        variant: data.variant,
        seed: seedOf(`${def.id}:${data.variant}`),
    });
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${def.width}" height="${def.height}"` +
        ` viewBox="0 0 ${def.width} ${def.height}">${data.shadow ? shadow(def) : ''}${def.draw(k)}</svg>`
    );
}
