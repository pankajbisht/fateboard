/**
 * BUG-093: `LabeledInput` defaults `min` to 0. Angles, offsets and the radial gap / scale step must
 * accept negative values, so they declare their own (negative) min.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>('/src/components/organisms/effects/ui/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
});

const NEED_NEGATIVE: Array<[string, string]> = [
    ['RepeatRadially', 'Start angle'],
    ['RepeatRadially', 'Gap per turn'],
    ['RepeatRadially', 'Scale step %'],
    ['PathEffects', 'Angle'],
    ['PathEffects', 'Offset X'],
    ['PathEffects', 'Offset Y'],
    ['RepeatAlongPath', 'Angle offset (deg)'],
    ['RepeatAlongPath', 'Side offset (px)'],
];

describe('effect fields that need negative values (BUG-093)', () => {
    it.each(NEED_NEGATIVE)('%s › %s has a negative min', (file, label) => {
        const code = SRC[`/src/components/organisms/effects/ui/${file}.tsx`];
        const at = code.indexOf(`label="${label}"`);
        expect(at, `${label} not found`).toBeGreaterThan(-1);
        const tag = code.slice(code.lastIndexOf('<TransformInput', at), code.indexOf('/>', at));
        expect(tag).toMatch(/min=\{-\d+\}/);
    });
});
