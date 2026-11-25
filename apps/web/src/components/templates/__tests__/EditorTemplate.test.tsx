/** The editor frame: `chromeHidden` (distraction-free mode) leaves only the canvas on screen. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PHONE_QUERY } from '@hooks/useIsPhone';
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

    // upright phones: one tool bar under the board; the dock and footer live in the "More" sheet
    describe('on an upright phone', () => {
        beforeEach(() => {
            vi.spyOn(window, 'matchMedia').mockImplementation(
                (query: string) =>
                    ({
                        matches: query === PHONE_QUERY,
                        media: query,
                        addEventListener: () => {},
                        removeEventListener: () => {},
                    }) as unknown as MediaQueryList,
            );
        });
        afterEach(() => vi.restoreAllMocks());

        it('the dock and footer sit in a "More" sheet opened from the tool bar', () => {
            frame();
            const more = screen.getByRole('button', { name: 'More: panels, colors and zoom' });
            expect(more.getAttribute('aria-expanded')).toBe('false');
            expect(screen.getByText('LEFT').closest('main')!.contains(more)).toBe(true);
            // mounted while closed (shortcuts), but not shown
            const sheet = screen.getByText('DOCK').closest('section')!;
            expect(sheet.getAttribute('aria-label')).toBe('More');
            expect(sheet.hidden).toBe(true);
            expect(sheet.contains(screen.getByText('FOOTER'))).toBe(true);

            fireEvent.click(more);
            expect(more.getAttribute('aria-expanded')).toBe('true');
            expect(sheet.hidden).toBe(false);
            expect(within(sheet).getByRole('heading', { name: 'More' })).toBeTruthy();
            expect(within(sheet).getByText('Style & view')).toBeTruthy();

            fireEvent.click(within(sheet).getByRole('button', { name: 'Close More' }));
            expect(sheet.hidden).toBe(true);
        });

        it('Escape or picking a tool puts the sheet away', () => {
            frame();
            const more = screen.getByRole('button', { name: 'More: panels, colors and zoom' });
            const sheet = screen.getByText('DOCK').closest('section')!;
            fireEvent.click(more);
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(sheet.hidden).toBe(true);
            fireEvent.click(more);
            fireEvent.pointerDown(screen.getByText('LEFT'));
            expect(sheet.hidden).toBe(true);
        });
    });

    it('wider screens: no "More" toggle; the dock and footer are in place', () => {
        frame();
        expect(screen.queryByRole('button', { name: /^More:/ })).toBeNull();
        expect(screen.getByText('DOCK').closest('aside')!.closest('main')).not.toBeNull();
        expect(screen.getByText('FOOTER').closest('footer')).not.toBeNull();
    });
});
