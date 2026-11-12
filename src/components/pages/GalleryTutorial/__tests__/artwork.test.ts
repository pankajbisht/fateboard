import { describe, expect, it } from 'vitest';

import { countSteps, extractPalette } from '../artwork';

const SVG = `<svg><g id="step-1"><rect fill="#FF0000"/><rect fill="#ff0000"/><rect fill="#ffffff"/></g>
<g id="step-2"><path stroke="#00ff00"/><stop stop-color="#0000ff"/><rect fill="url(#g)"/></g></svg>`;

describe('artwork helpers', () => {
    it('counts the step groups', () => {
        expect(countSteps(SVG)).toBe(2);
        expect(countSteps('<svg><g/></svg>')).toBe(0);
    });

    it('lists colours by use, case-insensitive, without plain white / black or url fills', () => {
        expect(extractPalette(SVG)).toEqual(['#ff0000', '#00ff00', '#0000ff']);
        expect(extractPalette(SVG, 1)).toEqual(['#ff0000']);
    });
});
