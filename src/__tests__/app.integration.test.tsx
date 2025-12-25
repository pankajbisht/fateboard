import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Mock heavy pages so mounting the router doesn't pull in large dependencies
vi.mock('src/components/pages/Editor/Editor.tsx', () => ({
    default: () => <div data-testid="editor-mock">Editor Page Mock</div>,
}));
vi.mock('src/components/pages/Setting/EditorSettingPage.tsx', () => ({
    default: () => <div data-testid="setting-mock">Setting Page Mock</div>,
}));
vi.mock('src/components/pages/NotFound/NotFoundPage.tsx', () => ({
    default: () => <div data-testid="notfound-mock">Not Found Mock</div>,
}));
vi.mock('src/components/pages/Command/CommandPalette.tsx', () => ({
    default: () => <div data-testid="command-mock">Command Palette Mock</div>,
}));

// Lightweight Fabric mock to avoid pulling in native canvas implementation
vi.mock('fabric', () => {
    class Canvas {
        node: any;
        constructor(node: any) {
            this.node = node;
        }
        toJSON() {
            return {};
        }
        on() {
            /* noop */
        }
        off() {
            /* noop */
        }
        dispose() {
            /* noop */
        }
        requestRenderAll() {
            /* noop */
        }
        renderAll() {
            /* noop */
        }
        getActiveObject() {
            return null;
        }
    }

    const PencilBrush = function () {};
    const CircleBrush = function () {};
    const SprayBrush = function () {};
    const PatternBrush = function () {};
    const Pattern = function () {};
    const EraserBrush = function () {};

    return {
        Canvas,
        PencilBrush,
        CircleBrush,
        SprayBrush,
        PatternBrush,
        Pattern,
        EraserBrush,
        fabric: { Canvas },
    };
});

import App from 'src/App';

describe('App integration (single test)', () => {
    it('renders marketing site and navigates to editor when CTA clicked', async () => {
        render(<App />);

        // Marketing page content should be visible
        expect(screen.getByText(/Draw the Fate/i)).toBeInTheDocument();

        // Click the primary CTA to navigate to /draw
        const cta = screen.getByRole('button', { name: /Start Now/i });
        fireEvent.click(cta);

        // After navigation, the Editor mock should appear
        expect(await screen.findByTestId('editor-mock')).toBeInTheDocument();
    }, 20000);
});
