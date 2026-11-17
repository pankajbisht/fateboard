/** Paint bucket + reference layers (2026-11-17): with a shown reference layer, the fill reads only its objects. */
import * as fabric from 'fabric';
import { describe, expect, it, vi } from 'vitest';
import { makeLayer } from '@/lib/canvas/docLayers';
import { DEFAULT_BUCKET_STYLE } from '../paintTools/paintToolStyles';
import { bucketFill } from '../paintTools/bucketFill';

describe('bucket region fill and reference layers', () => {
    it('renders only reference-layer objects for the flood fill', () => {
        const canvas = new fabric.Canvas(document.createElement('canvas'), {
            width: 50,
            height: 50,
        });
        const ink = Object.assign(new fabric.Rect({ width: 10, height: 10 }), { layerId: 'ink' });
        const colour = Object.assign(new fabric.Rect({ width: 10, height: 10 }), {
            layerId: 'colour',
        });
        Object.assign(canvas, {
            docLayers: [
                makeLayer({ name: 'Colour' }, 'colour'),
                makeLayer({ name: 'Ink', reference: true }, 'ink'),
            ],
        });
        let filter: ((o: fabric.FabricObject) => boolean) | undefined;
        vi.spyOn(canvas, 'toCanvasElement').mockImplementation((_m, opts) => {
            filter = opts?.filter;
            throw new Error('stop after the render options');
        });
        expect(() =>
            bucketFill(
                canvas,
                { x: 5, y: 5 },
                '#ff0000',
                { ...DEFAULT_BUCKET_STYLE, mode: 'region' },
                {
                    screen: 1,
                    whiteboard: false,
                },
            ),
        ).toThrow('stop');
        expect(filter!(ink)).toBe(true);
        expect(filter!(colour)).toBe(false);
        canvas.dispose();
    });
});
