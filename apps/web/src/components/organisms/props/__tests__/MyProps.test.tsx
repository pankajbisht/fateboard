/** Scene Objects "My props" (docs/PROPS.md phase 6): import files and packs, place, export, delete. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { PROP_DRAG_TYPE } from '@/props/dragType';
import { MyProps } from '../MyProps';

const lamp = {
    id: 'user-lamp01',
    label: 'Lamp',
    kind: 'svg',
    data: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    width: 10,
    height: 10,
};

const a = {
    addProp: vi.fn(async () => true),
    importPropFile: vi.fn(async () => true),
    importPropPack: vi.fn(async () => 1),
    removeUserProp: vi.fn(async () => true),
    loadPropLibrary: vi.fn(async () => undefined),
    propPackJson: vi.fn(() => '{"format":"fateboard-prop-pack","version":1,"props":[]}'),
    confirmDialog: vi.fn(async () => true),
};

describe('MyProps', () => {
    beforeEach(() =>
        useStore.setState({
            propUserLibrary: [lamp],
            propUserLibraryStatus: 'ready',
            ...a,
        } as never),
    );
    afterEach(() => vi.clearAllMocks());

    it('lists the user props; a click places one, a drag carries its id', () => {
        render(<MyProps />);
        fireEvent.click(screen.getByRole('button', { name: 'Add Lamp' }));
        expect(a.addProp).toHaveBeenCalledWith('user-lamp01');
        const setData = vi.fn();
        fireEvent.dragStart(screen.getByRole('button', { name: 'Add Lamp' }), {
            dataTransfer: { setData, effectAllowed: '' },
        });
        expect(setData).toHaveBeenCalledWith(PROP_DRAG_TYPE, 'user-lamp01');
    });

    it('imports a chosen SVG / PNG file', () => {
        render(<MyProps />);
        const input = screen.getByLabelText('Import SVG or PNG');
        const file = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' });
        fireEvent.change(input, { target: { files: [file] } });
        expect(a.importPropFile).toHaveBeenCalledWith(file);
    });

    it('imports a pack from its text', async () => {
        render(<MyProps />);
        const file = new File(['{"x":1}'], 'pack.json', { type: 'application/json' });
        fireEvent.change(screen.getByLabelText('Import prop pack'), { target: { files: [file] } });
        await waitFor(() => expect(a.importPropPack).toHaveBeenCalledWith('{"x":1}'));
    });

    it('deletes after asking', async () => {
        render(<MyProps />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete Lamp' }));
        await waitFor(() => expect(a.removeUserProp).toHaveBeenCalledWith('user-lamp01'));
        expect(a.confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger' }));
    });

    it('explains itself while empty, and loads the library once', () => {
        useStore.setState({ propUserLibrary: [], propUserLibraryStatus: 'idle' } as never);
        render(<MyProps />);
        expect(screen.getByText(/No props of your own yet/)).toBeInTheDocument();
        expect(a.loadPropLibrary).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Export pack' })).toBeDisabled();
    });
});
