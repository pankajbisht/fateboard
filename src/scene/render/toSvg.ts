import { TONE_PLACEHOLDER, gradientEnds, gradientRegistry } from '@/character/render/toSvg';
import type { SceneDrawable, SceneModel } from './types';

/**
 * A standalone SVG of a rendered scene (downloaded, or placed on the page through Fabric's SVG loader: paths
 * only, one per drawable, in order, so screentone can be applied by index). Colours are checked.
 */
const HEX = /^#[0-9a-f]{6}$/i;
const n = (v: number) => (Math.round(v * 100) / 100).toString();

function hash(text: string): string {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

function pathSvg(d: SceneDrawable, fill: string): string {
    const stroke = d.stroke && HEX.test(d.stroke) ? d.stroke : 'none';
    const line =
        stroke === 'none'
            ? ''
            : ` stroke="${stroke}" stroke-width="${n(d.strokeWidth)}" stroke-linejoin="round" stroke-linecap="round"`;
    const opacity =
        d.opacity !== undefined ? ` opacity="${Math.round(d.opacity * 1000) / 1000}"` : '';
    const rule = d.evenOdd ? ' fill-rule="evenodd"' : '';
    return `<path d="${d.d}" fill="${fill}"${rule}${opacity}${line}/>`;
}

export function sceneSvg(model: SceneModel, pixelWidth = model.width): string {
    const { width: w, height: h } = model;
    const grads = gradientRegistry(`s${hash(JSON.stringify(model.items.map((d) => d.fill)))}_`);
    const body = model.items
        .map((d) => pathSvg(d, d.tone ? TONE_PLACEHOLDER : grads.url(d.fill)))
        .join('');
    const list = grads.list();
    const defs = list.length
        ? `<defs>${list
              .map(({ id, paint }) => {
                  const e = gradientEnds(paint.angle);
                  const stops = paint.stops
                      .filter(([, c]) => HEX.test(c))
                      .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
                      .join('');
                  return `<linearGradient id="${id}" x1="${n(e.x1)}" y1="${n(e.y1)}" x2="${n(e.x2)}" y2="${n(e.y2)}">${stops}</linearGradient>`;
              })
              .join('')}</defs>`
        : '';
    const ph = Math.round((pixelWidth * h) / w);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}" width="${Math.round(pixelWidth)}" height="${ph}">${defs}${body}</svg>`;
}
