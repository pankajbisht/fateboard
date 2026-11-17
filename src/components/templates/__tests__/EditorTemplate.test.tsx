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
            chromeHidden={chromeHidden}
        />,
    );

describe('EditorTemplate', () => {
    it('shows header, rails, canvas and footer', () => {
        frame();
        for (const t of ['HEADER', 'LEFT', 'DOCK', 'CANVAS', 'FOOTER'])
            expect(screen.getByText(t)).toBeTruthy();
        expect(screen.getByRole('banner')).toBeTruthy();
    });

    it('chromeHidden: only the canvas is shown; the rest stays mounted (its shortcuts keep working)', () => {
        const { container } = frame(true);
        expect(screen.getByText('CANVAS')).toBeTruthy();
        for (const t of ['HEADER', 'LEFT', 'DOCK', 'FOOTER']) {
            const el = [...container.querySelectorAll('span')].find((s) => s.textContent === t);
            expect(el, t).toBeTruthy(); // mounted
            expect(el!.closest('[hidden]'), t).not.toBeNull(); // not shown, not in the a11y tree
        }
        expect(screen.queryByRole('banner')).toBeNull();
    });
});
