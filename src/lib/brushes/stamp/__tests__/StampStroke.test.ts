import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { StampStroke, packPoints, unpackPoints } from '../StampStroke';
import { CUSTOM_PROPS } from '@/lib/serialization';

const make = () =>
    new StampStroke({
        left: 10,
        top: 20,
        width: 120,
        height: 30,
        originX: 'left',
        originY: 'top',
        stampPoints: packPoints([
            { x: 15, y: 15, p: 1, t: 0 },
            { x: 105, y: 15, p: 0.5, t: 160 },
        ]),
        stampParams: { tip: 'flame', colorMode: 'fire', blend: 'add' },
        stampColor: '#ff6a00',
        stampSize: 20,
        stampSeed: 1234,
        brushId: 'fire-flame',
        name: 'Fire',
    });

describe('StampStroke', () => {
    it('packs pointer samples compactly and reads them back', () => {
        const flat = packPoints([{ x: 1.23456, y: 2.5, p: 0.33333, t: 16.7 }]);
        expect(flat).toEqual([1.23, 2.5, 0.333, 17]);
        expect(unpackPoints(flat)).toEqual([{ x: 1.23, y: 2.5, p: 0.333, t: 17 }]);
        expect(unpackPoints('junk')).toEqual([]);
    });

    it('saves and loads through the Fabric class registry with its brush data', async () => {
        const json = make().toObject([...CUSTOM_PROPS]);
        expect(json.type).toBe('StampStroke');
        expect(json.stampSeed).toBe(1234);
        const [back] = (await fabric.util.enlivenObjects([json])) as StampStroke[];
        expect(back).toBeInstanceOf(StampStroke);
        expect(back.stampParams.tip).toBe('flame');
        expect(back.stampColor).toBe('#ff6a00');
        expect(back.brushId).toBe('fire-flame');
        expect(back.getDabs().dabs).toEqual(make().getDabs().dabs); // same seed, same dabs
    });

    it('keeps its data when cloned (copy / paste, symmetry copies)', async () => {
        const copy = (await make().clone()) as StampStroke;
        expect(copy.stampPoints).toEqual(make().stampPoints);
        expect(copy.stampSize).toBe(20);
    });

    it('a palette colour recolours the stroke instead of adding a fill', () => {
        const s = make();
        s.set('fill', '#00aa00');
        expect(s.stampColor).toBe('#00aa00');
        expect(s.fill).toBeNull();
        s.set('stroke', 'rgba(0,0,0,0)'); // "no colour" leaves it alone
        expect(s.stampColor).toBe('#00aa00');
    });

    it('hit-tests along the stroke, not the whole box', () => {
        const s = make();
        s.setCoords();
        expect(s.containsPoint(new fabric.Point(60, 35))).toBe(true); // on the line (y = 20 + 15)
        expect(s.containsPoint(new fabric.Point(60, 49))).toBe(false); // inside the box, off the stroke
    });
});
