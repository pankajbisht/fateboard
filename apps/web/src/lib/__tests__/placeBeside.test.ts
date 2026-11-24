import { describe, expect, it } from 'vitest';
import { placeBeside } from '../placeBeside';

const rect = (left: number, top: number, width = 24, height = 24) => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
});
const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

describe('placeBeside (dock color popovers)', () => {
    it('opens left of the button, top aligned (the dock on the right edge)', () => {
        expect(placeBeside(rect(1380, 200), { width: 288, height: 300 }, desktop)).toEqual({
            left: 1380 - 6 - 288,
            top: 200,
        });
    });

    it('opens right of the button when there is no room on the left', () => {
        expect(placeBeside(rect(4, 100), { width: 288, height: 300 }, phone)).toEqual({
            left: 28 + 6,
            top: 100,
        });
    });

    it('opens above the button when neither side fits (a bar on an upright phone)', () => {
        const p = placeBeside(rect(180, 740), { width: 288, height: 400 }, phone);
        expect(p.top).toBe(740 - 6 - 400);
        expect(p.left).toBeGreaterThanOrEqual(8);
        expect(p.left + 288).toBeLessThanOrEqual(390 - 8);
    });

    it('opens below when there is no room above either', () => {
        const p = placeBeside(rect(180, 40), { width: 360, height: 300 }, phone);
        expect(p.top).toBe(40 + 24 + 6);
    });

    it('always stays inside the window, also when it is taller or wider than the room', () => {
        const p = placeBeside(rect(180, 400), { width: 500, height: 2000 }, phone);
        expect(p).toEqual({ left: 8, top: 8 });
        const q = placeBeside(rect(1380, 880), { width: 288, height: 300 }, desktop);
        expect(q.top).toBe(900 - 8 - 300);
    });
});
