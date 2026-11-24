/**
 * Calligraphy pen brush (brush `nib`): Inkscape's Calligraphy tool on top of the variable-width brush. Samples
 * carry a width factor from speed (thinning) and stylus pressure; the outline is `nibOutline`. Preview and the
 * finished filled path come from VariableWidthBrush.
 */
import { nibOutline, nibWidthFactor } from '@/lib/brushes/nibOutline';
import { DEFAULT_NIB_STYLE, type NibStyle } from '../nibStyle';
import { VariableWidthBrush, smoothSamples, type Pt } from './variableWidthBrush';

type PointerLike = { pointerType?: string; pressure?: number };

export class NibBrush extends VariableWidthBrush {
    nib: NibStyle = DEFAULT_NIB_STYLE;

    addSample(p: Pt, e?: PointerLike): boolean {
        const last = this.samples[this.samples.length - 1];
        const zoom = this.canvas.getZoom?.() ?? 1;
        const now = performance.now();
        let speed = 0;
        if (last) {
            const d = Math.hypot(p.x - last.x, p.y - last.y);
            if (d < 1.2 / zoom) return false;
            speed = (d * zoom) / Math.max(now - this.lastT, 1); // screen px per ms
        }
        const pen = e?.pointerType === 'pen' && (e.pressure ?? 0) > 0;
        const target = nibWidthFactor({
            speed,
            thinning: this.nib.thinning,
            pressure: pen ? e?.pressure : undefined,
        });
        this.factor = last ? this.factor * 0.7 + target * 0.3 : target; // eased, like ink
        this.lastT = now;
        this.samples.push({ x: p.x, y: p.y, f: this.factor });
        return true;
    }

    outline(): Pt[] {
        const pts = smoothSamples(this.samples, Math.round(this.smoothing / 2));
        return nibOutline(pts, { width: this.width, ...this.nib });
    }
}

/** The brush for `buildBrush`: nib options from the store (`nibStyle`, DrawingTools slice). */
export function createNibBrush(
    canvas: unknown,
    s: { smoothing?: number; nibStyle?: NibStyle },
): NibBrush {
    // VariableWidthBrush extends an untyped Fabric class, so its constructor type takes no canvas
    const brush = new (NibBrush as unknown as new (c: unknown) => NibBrush)(canvas);
    brush.smoothing = s.smoothing ?? 2;
    brush.nib = s.nibStyle ?? DEFAULT_NIB_STYLE;
    return brush;
}
