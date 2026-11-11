import { describe, expect, it } from 'vitest';
import { CANVAS_PRESETS, DEFAULT_CANVAS_PRESET } from '../board.config';

describe('default canvas size', () => {
    it('is Full HD 16:9 (1920 × 1080), the common default of design tools', () => {
        expect(DEFAULT_CANVAS_PRESET).toMatchObject({
            id: 'presentation-16-9',
            width: 1920,
            height: 1080,
        });
    });

    it('is one of the presets offered in Settings > Canvas size', () => {
        expect(CANVAS_PRESETS).toContain(DEFAULT_CANVAS_PRESET);
    });
});
