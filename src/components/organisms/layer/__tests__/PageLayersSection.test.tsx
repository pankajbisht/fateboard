/** Page layers panel (2026-11-17): layers + folders above the object list in the Layers tab. */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { makeLayer, type DocLayer } from '@/lib/canvas/docLayers';
import { PageLayersSection } from '../PageLayersSection';

const L = (id: string, patch: Partial<DocLayer> = {}) => makeLayer({ name: id, ...patch }, id);
const actions = {
    setActiveLayer: vi.fn(),
    addPageLayer: vi.fn(),
    updatePageLayer: vi.fn(),
    removePageLayer: vi.fn(),
    movePageLayer: vi.fn(),
    shiftPageLayer: vi.fn(),
    moveSelectionToLayer: vi.fn(),
    mergeLayerDown: vi.fn(),
    flattenLayers: vi.fn(),
};

// bottom-first: Paper, folder Character (Ink, Colour), Notes
const layers = [
    L('paper', { name: 'Paper' }),
    L('char', { name: 'Character', kind: 'folder' }),
    L('colour', { name: 'Colour', parentId: 'char' }),
    L('ink', { name: 'Ink', parentId: 'char', clip: true, reference: true }),
    L('notes', { name: 'Notes', visible: false }),
];

const row = (name: string) =>
    screen.getByRole('button', { name: new RegExp(`^${name}`) }).closest('li')!;

describe('PageLayersSection', () => {
    beforeEach(() => {
        useStore.setState({
            pageLayers: layers,
            activeLayerId: 'colour',
            hasSelection: true,
            layers: [],
            ...actions,
        } as never);
    });
    afterEach(() => vi.clearAllMocks());

    it('lists layers top-first, folders indented, the active one marked', () => {
        render(<PageLayersSection />);
        const names = within(screen.getByRole('list', { name: 'Page layers' }))
            .getAllByRole('listitem')
            .map((li) => li.querySelector('[data-layer-name]')!.textContent);
        expect(names).toEqual(['Notes', 'Character', 'Ink', 'Colour', 'Paper']);
        expect(screen.getByRole('button', { name: /^Colour/ })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(
            within(row('Ink')).getByRole('img', { name: 'Clipped to the layer below' }),
        ).toBeInTheDocument();
        expect(
            within(row('Ink')).getByRole('img', { name: 'Reference layer' }),
        ).toBeInTheDocument();
    });

    it('show / hide, lock and select from the row', () => {
        render(<PageLayersSection />);
        fireEvent.click(screen.getByRole('button', { name: 'Show Notes' }));
        expect(actions.updatePageLayer).toHaveBeenCalledWith('notes', { visible: true });
        fireEvent.click(screen.getByRole('button', { name: 'Lock Paper' }));
        expect(actions.updatePageLayer).toHaveBeenCalledWith('paper', { locked: true });
        fireEvent.click(screen.getByRole('button', { name: /^Paper/ }));
        expect(actions.setActiveLayer).toHaveBeenCalledWith('paper');
    });

    it('double-click renames; Enter keeps the new name', () => {
        render(<PageLayersSection />);
        fireEvent.doubleClick(screen.getByRole('button', { name: /^Paper/ }));
        const input = screen.getByRole('textbox', { name: 'Layer name' });
        fireEvent.change(input, { target: { value: 'Background' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(actions.updatePageLayer).toHaveBeenCalledWith('paper', { name: 'Background' });
    });

    it('closing a folder hides what is inside', () => {
        render(<PageLayersSection />);
        fireEvent.click(screen.getByRole('button', { name: 'Close Character' }));
        expect(actions.updatePageLayer).toHaveBeenCalledWith('char', { collapsed: true });
        cleanup();
        useStore.setState({
            pageLayers: layers.map((l) => (l.id === 'char' ? { ...l, collapsed: true } : l)),
        } as never);
        render(<PageLayersSection />);
        expect(screen.getByRole('button', { name: 'Open Character' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(screen.queryByRole('button', { name: /^Ink/ })).not.toBeInTheDocument();
    });

    it('toolbar: new layer / folder, move selection here, merge down, flatten, delete', () => {
        render(<PageLayersSection />);
        fireEvent.click(screen.getByRole('button', { name: 'New layer' }));
        expect(actions.addPageLayer).toHaveBeenCalledWith('layer');
        fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
        expect(actions.addPageLayer).toHaveBeenCalledWith('folder');
        fireEvent.click(screen.getByRole('button', { name: 'Move selection to this layer' }));
        expect(actions.moveSelectionToLayer).toHaveBeenCalledWith('colour');
        // Colour is the bottom layer of its folder: nothing to merge into
        expect(screen.getByRole('button', { name: 'Merge down' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Flatten shown layers' }));
        expect(actions.flattenLayers).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Delete layer' }));
        expect(actions.removePageLayer).toHaveBeenCalledWith('colour');
    });

    it('active layer settings: opacity, blend, clip, reference, move up / down', () => {
        render(<PageLayersSection />);
        fireEvent.change(screen.getByRole('slider', { name: 'Opacity' }), {
            target: { value: '40' },
        });
        expect(actions.updatePageLayer).toHaveBeenCalledWith('colour', { opacity: 0.4 });
        fireEvent.click(screen.getByRole('combobox', { name: 'Blend' }));
        fireEvent.click(screen.getByRole('option', { name: 'Multiply' }));
        expect(actions.updatePageLayer).toHaveBeenCalledWith('colour', { blend: 'multiply' });
        fireEvent.click(screen.getByRole('switch', { name: 'Clip to layer below' }));
        expect(actions.updatePageLayer).toHaveBeenCalledWith('colour', { clip: true });
        fireEvent.click(screen.getByRole('switch', { name: /Reference layer/ }));
        expect(actions.updatePageLayer).toHaveBeenCalledWith('colour', { reference: true });
        fireEvent.click(screen.getByRole('button', { name: 'Move layer up' }));
        expect(actions.shiftPageLayer).toHaveBeenCalledWith('colour', 1);
    });

    it('drag a layer onto a folder to put it inside; onto a layer to put it above', () => {
        render(<PageLayersSection />);
        const data: Record<string, string> = {};
        const dataTransfer = {
            setData: (k: string, v: string) => (data[k] = v),
            getData: (k: string) => data[k] ?? '',
            effectAllowed: '',
            dropEffect: '',
        };
        fireEvent.dragStart(row('Paper'), { dataTransfer });
        fireEvent.drop(row('Character'), { dataTransfer });
        expect(actions.movePageLayer).toHaveBeenCalledWith('paper', 'char', 2);
        fireEvent.dragStart(row('Notes'), { dataTransfer });
        fireEvent.drop(row('Ink'), { dataTransfer });
        expect(actions.movePageLayer).toHaveBeenCalledWith('notes', 'char', 2);
    });
});
