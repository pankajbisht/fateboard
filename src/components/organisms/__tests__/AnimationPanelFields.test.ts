/**
 * BUG-092 (DECISIONS: number fields commit on finish): the Animation panel's numbers use `NumberField`.
 * Raw `<Input type="number">` applied every keystroke, and an emptied field became 0.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>('/src/components/organisms/AnimationPanel.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
})['/src/components/organisms/AnimationPanel.tsx'];

describe('Animation panel number fields (BUG-092)', () => {
    it('has no per-keystroke number inputs', () => {
        expect(SRC).not.toMatch(/type="number"/);
        expect(SRC.match(/<NumberField\b/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    });
});
