import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@store';
import type { LayerItem } from '@/store/slices/createLayersSlice';

import LayersPanel from '../LayersPanel';

const ROW = 44;

const makeLayers = (count: number) => {
    const toDataURL = vi.fn(() => 'data:image/png;base64,AA==');
    const layers = Array.from({ length: count }, (_, i) => ({
        id: `layer-${i}`,
        name: `Layer ${i}`,
        type: 'rect',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        parentId: null,
        depth: 0,
        isGroup: false,
        thumbRev: 0,
        object: { toDataURL, getScaledWidth: () => 50, getScaledHeight: () => 50 },
    })) as unknown as LayerItem[];
    return { layers, toDataURL };
};

const list = () => screen.getByRole('listbox', { name: 'Layers' });
const options = () => screen.getAllByRole('option');
const scrollTo = (top: number) => {
    const el = list();
    el.scrollTop = top;
    fireEvent.scroll(el);
};

describe('LayersPanel with many layers', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                disconnect() {}
            },
        );
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(440);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        useStore.setState({ layers: [], selectedLayerIds: [] } as never);
    });

    it('mounts only the rows near the viewport, not one per layer', () => {
        const { layers } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [] } as never);

        render(<LayersPanel />);

        expect(options().length).toBeLessThan(40);
        expect(screen.getByText('Layer 0')).toBeInTheDocument();
        expect(screen.queryByText('Layer 1999')).not.toBeInTheDocument();
    });

    it('makes thumbnails only for the mounted rows', () => {
        const { layers, toDataURL } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [] } as never);

        render(<LayersPanel />);

        expect(toDataURL.mock.calls.length).toBeLessThan(40);
    });

    it('keeps the full scroll height and places rows where they belong', () => {
        const { layers } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [] } as never);

        render(<LayersPanel />);
        scrollTo(ROW * 1000);

        const inner = list().firstElementChild as HTMLElement;
        expect(inner.style.height).toBe(`${2000 * ROW}px`);
        const row = screen.getByText('Layer 1000').closest('[role="option"]') as HTMLElement;
        expect(row.style.top).toBe(`${1000 * ROW}px`);
        expect(row.getAttribute('aria-posinset')).toBe('1001');
        expect(row.getAttribute('aria-setsize')).toBe('2000');
        expect(screen.queryByText('Layer 0')).not.toBeInTheDocument();
    });

    it('does not redo the thumbnail of a row that scrolls away and comes back', () => {
        const { layers, toDataURL } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [] } as never);

        render(<LayersPanel />);
        const firstScreen = toDataURL.mock.calls.length;
        scrollTo(ROW * 1000);
        const afterScroll = toDataURL.mock.calls.length;
        scrollTo(0);

        expect(afterScroll).toBeGreaterThan(firstScreen);
        expect(toDataURL.mock.calls.length).toBe(afterScroll);
    });

    it('redoes a thumbnail when its object was modified', () => {
        const { layers, toDataURL } = makeLayers(3);
        useStore.setState({ layers, selectedLayerIds: [] } as never);
        render(<LayersPanel />);
        const before = toDataURL.mock.calls.length;

        act(() => {
            const next = layers.map((l, i) => (i ? l : { ...l, thumbRev: 1 }));
            useStore.setState({ layers: next } as never);
        });

        expect(toDataURL.mock.calls.length).toBe(before + 1);
    });

    it('keeps the row being dragged mounted when it scrolls out of the window', () => {
        const { layers } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [] } as never);

        render(<LayersPanel />);
        const row = screen.getByText('Layer 0').closest('[role="option"]') as HTMLElement;
        fireEvent.dragStart(row, { dataTransfer: { effectAllowed: '' } });
        scrollTo(ROW * 1000);

        expect(screen.getByText('Layer 0')).toBeInTheDocument();
        expect(screen.getByText('Layer 1000')).toBeInTheDocument();
    });

    it('commits a rename when its row is about to scroll out of the window', () => {
        const renameLayer = vi.fn();
        const { layers } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [], renameLayer } as never);

        render(<LayersPanel />);
        fireEvent.doubleClick(screen.getByText('Layer 0'));
        const input = screen.getByRole('textbox', { name: 'Layer name' });
        input.focus();
        fireEvent.change(input, { target: { value: 'Renamed' } });
        scrollTo(ROW * 1000);

        expect(renameLayer).toHaveBeenCalledWith('layer-0', 'Renamed');
    });

    it('selects a layer that was scrolled to', () => {
        const selectLayer = vi.fn();
        const { layers } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [], selectLayer } as never);

        render(<LayersPanel />);
        scrollTo(ROW * 1000);
        fireEvent.click(screen.getByText('Layer 1000'));

        expect(selectLayer).toHaveBeenCalledWith('layer-1000', 'replace');
    });

    it('searches every layer, not only the mounted rows', () => {
        const { layers } = makeLayers(2000);
        useStore.setState({ layers, selectedLayerIds: [] } as never);

        render(<LayersPanel />);
        fireEvent.change(screen.getByRole('searchbox', { name: 'Find a layer' }), {
            target: { value: 'Layer 1999' },
        });

        expect(screen.getByText('Layer 1999')).toBeInTheDocument();
    });
});
