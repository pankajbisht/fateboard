import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@store';
import type { Page } from '@/store/slices/createPagesSlice';

import PagePanel from '../PagePanel';

const page = (id: string, name: string, extra: Partial<Page> = {}): Page => ({
    id,
    name,
    canvasJSON: null,
    format: 'Freehand',
    orientation: 'landscape',
    customSize: null,
    background: '#ffffff',
    createdAt: 0,
    updatedAt: 0,
    ...extra,
});

const preset = (width: number, height: number) => ({
    id: `${width}x${height}`,
    label: 'Test',
    category: 'Custom' as const,
    width,
    height,
    icon: 'file-lines' as const,
});

const actions = {
    initPages: vi.fn(),
    addPage: vi.fn(async () => 'new'),
    duplicatePage: vi.fn(async () => 'dup'),
    deletePage: vi.fn(async () => true),
    renamePage: vi.fn(),
    movePage: vi.fn(),
    switchPage: vi.fn(async () => {}),
    confirmDialog: vi.fn(async () => true),
};

const card = (name: string) => screen.getByRole('listitem', { name });

describe('PagePanel', () => {
    beforeEach(() => {
        useStore.setState({
            ...actions,
            canvas: null,
            isPageSwitching: false,
            currentPageId: 'b',
            selectedPreset: preset(1920, 1080),
            pages: [
                page('a', 'Cover', {
                    preset: preset(800, 1000),
                    thumbnail: 'data:image/png;base64,AA==',
                }),
                page('b', 'Intro'),
            ],
        } as never);
    });

    afterEach(() => {
        vi.clearAllMocks();
        useStore.setState({ pages: [], currentPageId: null } as never);
    });

    it('lists the pages as a labelled list and marks the open one', () => {
        render(<PagePanel />);

        const list = screen.getByRole('list', { name: 'Pages' });
        expect(within(list).getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Open Intro' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('button', { name: 'Open Cover' })).not.toHaveAttribute(
            'aria-current',
        );
        expect(screen.getByText('2 of 2')).toBeInTheDocument();
    });

    it('draws each thumbnail at its page aspect ratio (open page: the live page size)', () => {
        render(<PagePanel />);

        expect(screen.getByRole('button', { name: 'Open Cover' }).style.aspectRatio).toBe(
            '800 / 1000',
        );
        expect(screen.getByRole('button', { name: 'Open Intro' }).style.aspectRatio).toBe(
            '1920 / 1080',
        );
    });

    it('renames from the Rename button: Enter commits, Escape cancels', () => {
        render(<PagePanel />);

        fireEvent.click(within(card('Cover')).getByRole('button', { name: 'Rename Cover' }));
        const input = screen.getByRole('textbox', { name: 'Page name' });
        fireEvent.change(input, { target: { value: 'Title' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(actions.renamePage).toHaveBeenCalledWith('a', 'Title');

        fireEvent.click(within(card('Intro')).getByRole('button', { name: 'Rename Intro' }));
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Page name' }), { key: 'Escape' });
        expect(actions.renamePage).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('textbox', { name: 'Page name' })).not.toBeInTheDocument();
    });

    it('duplicates, deletes after confirming, and opens a page', async () => {
        render(<PagePanel />);

        fireEvent.click(within(card('Cover')).getByRole('button', { name: 'Duplicate Cover' }));
        expect(actions.duplicatePage).toHaveBeenCalledWith('a');

        fireEvent.click(within(card('Cover')).getByRole('button', { name: 'Delete Cover' }));
        await vi.waitFor(() => expect(actions.deletePage).toHaveBeenCalledWith('a'));
        expect(actions.confirmDialog).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole('button', { name: 'Open Cover' }));
        expect(actions.switchPage).toHaveBeenCalledWith('a');
    });

    it('cannot delete the last page', () => {
        useStore.setState({ pages: [page('b', 'Intro')] } as never);
        render(<PagePanel />);

        expect(within(card('Intro')).getByRole('button', { name: 'Delete Intro' })).toBeDisabled();
    });

    it('adds a page from the header', () => {
        render(<PagePanel />);

        fireEvent.click(screen.getByRole('button', { name: 'Add page' }));
        expect(actions.addPage).toHaveBeenCalledOnce();
    });
    it('renames on blur and by double-click; an unchanged or cancelled name is not saved', () => {
        render(<PagePanel />);

        fireEvent.doubleClick(screen.getByText('Cover'));
        const input = screen.getByRole('textbox', { name: 'Page name' });
        fireEvent.change(input, { target: { value: 'Title' } });
        fireEvent.blur(input);
        expect(actions.renamePage).toHaveBeenCalledWith('a', 'Title');

        fireEvent.click(screen.getByRole('button', { name: 'Rename Intro' }));
        fireEvent.blur(screen.getByRole('textbox', { name: 'Page name' }));
        expect(actions.renamePage).toHaveBeenCalledTimes(1); // unchanged

        fireEvent.click(screen.getByRole('button', { name: 'Rename Intro' }));
        const again = screen.getByRole('textbox', { name: 'Page name' });
        fireEvent.change(again, { target: { value: 'Nope' } });
        fireEvent.keyDown(again, { key: 'Escape' });
        fireEvent.blur(again); // a blur on the way out must not save the cancelled name
        expect(actions.renamePage).toHaveBeenCalledTimes(1);
    });

    it('puts focus back on Rename after a keyboard rename', () => {
        render(<PagePanel />);

        const rename = screen.getByRole('button', { name: 'Rename Cover' });
        fireEvent.click(rename);
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Page name' }), { key: 'Enter' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Cover' }));
    });

    it('hidden actions of other pages do not catch taps on the thumbnail (touch)', () => {
        render(<PagePanel />);

        const pillOf = (name: string) =>
            within(card(name)).getByRole('button', { name: `Rename ${name}` }).parentElement!;
        expect(pillOf('Cover')).toHaveClass('pointer-events-none');
        expect(pillOf('Intro')).not.toHaveClass('pointer-events-none'); // open page: always on
    });

    it('drag a page onto another position to reorder; no drag while renaming', () => {
        render(<PagePanel />);
        const dataTransfer = { effectAllowed: '' };

        fireEvent.dragStart(card('Cover'), { dataTransfer });
        fireEvent.dragOver(card('Intro'), { dataTransfer });
        fireEvent.drop(card('Intro'), { dataTransfer });
        expect(actions.movePage).toHaveBeenCalledWith('a', 1);

        fireEvent.click(screen.getByRole('button', { name: 'Rename Cover' }));
        expect(card('Cover')).toHaveAttribute('draggable', 'false');
    });
});
