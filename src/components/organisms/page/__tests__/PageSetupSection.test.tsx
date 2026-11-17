/** Page setup section (2026-11-17): margins, columns, guides, facing pages, master pages, page numbers. */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { DEFAULT_PAGE_SETUP } from '@/lib/document/pageSetup';
import { PageSetupSection } from '../PageSetupSection';

const a = {
    setPageSetup: vi.fn(),
    setPageRole: vi.fn(),
    applyMasterPage: vi.fn(),
    insertPageNumber: vi.fn(),
};

const open = () => fireEvent.click(screen.getByRole('button', { name: /Page setup/ }));

describe('PageSetupSection', () => {
    beforeEach(() => {
        useStore.setState({
            pageSetup: DEFAULT_PAGE_SETUP,
            pageRole: 'page',
            pageMasterId: null,
            currentPageId: 'p2',
            pages: [
                { id: 'm', name: 'A-Master', canvasJSON: { pageRole: 'master', objects: [] } },
                { id: 'p2', name: 'Page 2', canvasJSON: null },
            ],
            settings: { ...useStore.getState().settings, unit: 'px' },
            ...a,
        } as never);
    });
    afterEach(() => vi.clearAllMocks());

    it('margins, columns and guides change the page setup', () => {
        render(<PageSetupSection />);
        open();
        const top = screen.getByRole('spinbutton', { name: 'Top margin' });
        fireEvent.focus(top);
        fireEvent.change(top, { target: { value: '50' } });
        fireEvent.keyDown(top, { key: 'Enter' });
        expect(a.setPageSetup).toHaveBeenCalledWith({ margins: { top: 50 } });
        const guides = screen.getByRole('switch', { name: /Show guides/ });
        expect(guides).toHaveAttribute('aria-checked', 'true'); // on by default (InDesign)
        fireEvent.click(guides);
        expect(a.setPageSetup).toHaveBeenCalledWith({ guides: false });
        const slug = screen.getByRole('spinbutton', { name: 'Slug' });
        fireEvent.focus(slug);
        fireEvent.change(slug, { target: { value: '40' } });
        fireEvent.keyDown(slug, { key: 'Enter' });
        expect(a.setPageSetup).toHaveBeenCalledWith({ slug: 40 });
        fireEvent.click(screen.getByRole('switch', { name: /Show crop marks/ }));
        expect(a.setPageSetup).toHaveBeenCalledWith({ cropMarks: true });
        fireEvent.click(screen.getByRole('switch', { name: /Facing pages/ }));
        expect(a.setPageSetup).toHaveBeenCalledWith({ facing: true }, true);
        fireEvent.click(screen.getByRole('button', { name: 'Apply this setup to all pages' }));
        expect(a.setPageSetup).toHaveBeenCalledWith({}, true);
    });

    it('master pages: mark this page, or pick the master drawn under it; insert a page number', () => {
        render(<PageSetupSection />);
        open();
        fireEvent.click(screen.getByRole('combobox', { name: 'Master page' }));
        fireEvent.click(screen.getByRole('option', { name: 'A-Master' }));
        expect(a.applyMasterPage).toHaveBeenCalledWith('m');
        fireEvent.click(screen.getByRole('switch', { name: /This page is a master page/ }));
        expect(a.setPageRole).toHaveBeenCalledWith('master');
        fireEvent.click(screen.getByRole('button', { name: 'Insert page number' }));
        expect(a.insertPageNumber).toHaveBeenCalled();
    });
});
