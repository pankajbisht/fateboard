import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as fabric from 'fabric';

// -----------------------------
// matchMedia mock
// -----------------------------
if (typeof window !== 'undefined') {
    if (!window.matchMedia) {
        window.matchMedia = (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        });
    }
}

// -----------------------------
// Canvas 2D mock (CRITICAL)
// -----------------------------
HTMLCanvasElement.prototype.getContext = vi.fn(() => {
    return {
        canvas: document.createElement('canvas'),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: [] })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        measureText: vi.fn(() => ({ width: 0 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
    } as any;
});

vi.spyOn(fabric.Canvas.prototype, 'requestRenderAll').mockImplementation(() => {});
