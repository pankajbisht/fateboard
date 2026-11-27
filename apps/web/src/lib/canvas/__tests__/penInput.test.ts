import { afterEach, describe, expect, it } from 'vitest';
import { attachPenInput, coalescedScenePoints, penSample } from '../penInput';

// BUG-234 / P3: Fabric hands brushes MouseEvents / TouchEvents, which have no pressure. The pointer event
// that fired just before is recorded and looked up by time.
function pointer(type: string, init: Record<string, unknown>) {
    const e = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
    for (const [k, v] of Object.entries({ isPrimary: true, ...init }))
        Object.defineProperty(e, k, { value: v });
    return e;
}

describe('penInput', () => {
    let detach: () => void = () => undefined;
    afterEach(() => detach());

    it('a mouse event right after a pen pointer event carries its pressure', () => {
        const el = document.createElement('canvas');
        document.body.appendChild(el);
        detach = attachPenInput(el);
        const pe = pointer('pointermove', { pointerType: 'pen', pressure: 0.4 });
        el.dispatchEvent(pe);
        expect(penSample(el, { timeStamp: pe.timeStamp })).toEqual({ pen: true, pressure: 0.4 });
    });

    it('a stale pointer event (> 40 ms) does not count', () => {
        const el = document.createElement('canvas');
        document.body.appendChild(el);
        detach = attachPenInput(el);
        const pe = pointer('pointermove', { pointerType: 'pen', pressure: 0.4 });
        el.dispatchEvent(pe);
        expect(penSample(el, { timeStamp: pe.timeStamp + 100 })).toEqual({
            pen: false,
            pressure: 1,
        });
    });

    it('nothing recorded is a mouse', () => {
        expect(penSample(document.createElement('canvas'), { timeStamp: 1 })).toEqual({
            pen: false,
            pressure: 1,
        });
    });

    it('an iPad stylus touch reads its force', () => {
        const e = { changedTouches: [{ touchType: 'stylus', force: 0.3 }] };
        expect(penSample(undefined, e)).toEqual({ pen: true, pressure: 0.3 });
    });

    it('coalesced samples are converted to scene points, without the last one', () => {
        const samples = [
            { clientX: 1, pointerType: 'pen', pressure: 0.2 },
            { clientX: 2, pointerType: 'pen', pressure: 0.5 },
            { clientX: 3, pointerType: 'pen', pressure: 0.6 },
        ];
        const e = { getCoalescedEvents: () => samples };
        const canvas = {
            _getPointerImpl: (s: { clientX: number }) => ({ x: s.clientX * 10, y: 0 }),
        };
        expect(coalescedScenePoints(canvas, e)).toEqual([
            { x: 10, y: 0, pressure: 0.2 },
            { x: 20, y: 0, pressure: 0.5 },
        ]);
    });
});
