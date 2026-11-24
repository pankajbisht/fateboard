import type { Ctx } from './parts';

/**
 * Sets the colour of the accessory about to be drawn: through the style's palette (manga: paper, ink or a tone) and
 * the scene's grade, like every other colour. Returns the material to draw it with.
 */
export function useColor(ctx: Ctx, hex: string): 'acc' {
    const p = ctx.paint(hex);
    ctx.fill.acc = p.fill;
    ctx.tone.acc = p.tone;
    return 'acc';
}
