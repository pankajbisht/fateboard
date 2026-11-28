import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Runs before every test file in BOTH environments: jsdom (the default) and node (files that start with
// `// @vitest-environment node`, pure logic with no DOM: docs/TESTING.md "Speed"). Everything below needs a DOM,
// so a node file skips it, and never pays for importing Fabric unless the file imports it itself.
if (typeof window !== 'undefined') {
    // -----------------------------
    // matchMedia mock
    // -----------------------------
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

    const fabric = await import('fabric');
    vi.spyOn(fabric.Canvas.prototype, 'requestRenderAll').mockImplementation(() => {});
}
