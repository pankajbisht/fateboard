// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { timed, timedAsync } from '../perfMarks';

// Vitest runs with import.meta.env.DEV = true, so marks are on.
describe('perfMarks', () => {
    afterEach(() => performance.clearMeasures());

    it('timed returns the value and records a fate: measure', () => {
        expect(timed('unit:sync', () => 42)).toBe(42);
        expect(performance.getEntriesByName('fate:unit:sync')).toHaveLength(1);
    });

    it('records even when the work throws', () => {
        expect(() =>
            timed('unit:throw', () => {
                throw new Error('boom');
            }),
        ).toThrow('boom');
        expect(performance.getEntriesByName('fate:unit:throw')).toHaveLength(1);
    });

    it('timedAsync measures until the promise settles', async () => {
        await expect(timedAsync('unit:async', async () => 'ok')).resolves.toBe('ok');
        expect(performance.getEntriesByName('fate:unit:async')).toHaveLength(1);
    });

    it('keeps a bounded number of measures', () => {
        for (let i = 0; i < 600; i++) timed('unit:many', () => i);
        expect(performance.getEntriesByName('fate:unit:many').length).toBeLessThanOrEqual(500);
    });
});
