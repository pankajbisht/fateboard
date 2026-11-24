/** The editor frame: `chromeHidden` (distraction-free mode) leaves only the canvas on screen. */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import EditorTemplate from '../Editor.template';

afterEach(cleanup);

const frame = (chromeHidden?: boolean) =>
    render(
        <EditorTemplate
            header={<span>HEADER</span>}
            leftSidebar={<span>LEFT</span>}
            rightPanel={<span>DOCK</span>}
            canvasBoard={<span>CANVAS</span>}
            footer={<span>FOOTER</span>}
            bottomPanel={<span>TIMELINE</span>}
            heading="Draw online"
            chromeHidden={chromeHidden}
        />,
    );

describe('EditorTemplate', () => {
    it('shows header, rails, canvas and footer', () => {
        frame();
        for (const t of ['HEADER', 'LEFT', 'DOCK', 'CANVAS', 'FOOTER', 'TIMELINE'])
            expect(screen.getByText(t)).toBeTruthy();
        expect(screen.getByRole('banner')).toBeTruthy();
    });

    // BUG-247: the editor had no level-one heading (axe passed only while the board looked like a modal)
    it('has one level-one heading inside main, kept in distraction-free mode', () => {
        frame(true);
        const h1 = screen.getByRole('heading', { level: 1, name: 'Draw online' });
        expect(h1.closest('main')).not.toBeNull();
        expect(h1.className).toContain('sr-only');
    });

    // the timeline dock sits under the board, between the rails, like other animation tools (2026-11-17)
    it('the bottom panel is under the canvas, in the same column, before the footer', () => {
        frame();
        const board = screen.getByRole('region', { name: 'Editor canvas workspace' });
        const bottom = screen.getByText('TIMELINE');
        expect(board.parentElement!.contains(bottom)).toBe(true);
        expect(
            board.compareDocumentPosition(bottom) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(screen.getByText('LEFT').closest('main')!.contains(bottom)).toBe(true);
    });

    it('chromeHidden: only the canvas is shown; the rest stays mounted (its shortcuts keep working)', () => {
        const { container } = frame(true);
        expect(screen.getByText('CANVAS')).toBeTruthy();
        for (const t of ['HEADER', 'LEFT', 'DOCK', 'FOOTER', 'TIMELINE']) {
            const el = [...container.querySelectorAll('span')].find((s) => s.textContent === t);
            expect(el, t).toBeTruthy(); // mounted
            expect(el!.closest('[hidden]'), t).not.toBeNull(); // not shown, not in the a11y tree
        }
        expect(screen.queryByRole('banner')).toBeNull();
    });
});
