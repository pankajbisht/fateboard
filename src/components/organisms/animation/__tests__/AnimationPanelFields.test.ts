/**
 * BUG-092 (DECISIONS: number fields commit on finish): the Animation panel's numbers use `NumberField`.
 * Raw `<Input type="number">` applied every keystroke, and an emptied field became 0.
 */
import { describe, expect, it } from 'vitest';

const FILES = import.meta.glob<string>('/src/components/organisms/animation/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
});
const SRC = Object.values(FILES).join('\n');

describe('Animation panel number fields (BUG-092)', () => {
    it('has no per-keystroke number inputs', () => {
        expect(SRC).not.toMatch(/type="number"/);
        // keyframe time + values, preset duration / repeat / delay, timeline length
        expect(SRC.match(/<NumberField\b/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    });
});
