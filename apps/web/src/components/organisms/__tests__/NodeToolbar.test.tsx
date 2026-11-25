/** Floating node bar: shows the selected node and drives the NodeEditor actions. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { NodeToolbar } from '../NodeToolbar';

/* eslint-disable @typescript-eslint/no-explicit-any */
const actions = {
    addNodeToPath: vi.fn(),
    deleteSelectedNode: vi.fn(),
    setSelectedNodeType: vi.fn(),
    setSelectedSegments: vi.fn(),
    setPathClosed: vi.fn(),
    breakPathAtSelectedNode: vi.fn(),
    moveSelectedNode: vi.fn(),
    exitNodeMode: vi.fn(),
    cancelNodeMode: vi.fn(),
};
const info = {
    index: 0,
    subPathIndex: 0,
    type: 'corner',
    hasHandles: false,
    nodeCount: 4,
    x: 100,
    y: 50,
    closed: true,
    canDelete: true,
    canBreak: true,
};
let prev: any;

beforeEach(() => {
    prev = { ...useStore.getState() };
    Object.values(actions).forEach((f) => f.mockReset());
    act(() => useStore.setState({ ...actions, nodeMode: true, selectedNode: info } as any));
});
afterEach(() => {
    cleanup();
    const restore: any = { nodeMode: false, selectedNode: null };
    for (const k of Object.keys(actions)) restore[k] = prev[k];
    act(() => useStore.setState(restore));
});

const button = (name: string) => screen.getByRole('button', { name });

describe('NodeToolbar', () => {
    it('renders nothing outside node editing', () => {
        act(() => useStore.setState({ nodeMode: false } as any));
        const { container } = render(<NodeToolbar />);
        expect(container).toBeEmptyDOMElement();
    });

    it('every control calls its action', () => {
        render(<NodeToolbar />);
        fireEvent.click(button('Add node'));
        fireEvent.click(button('Delete node'));
        fireEvent.click(screen.getByRole('radio', { name: 'Smooth node' }));
        fireEvent.click(button('Straight segments'));
        fireEvent.click(button('Curved segments'));
        fireEvent.click(button('Open path'));
        fireEvent.click(button('Break path at node'));
        fireEvent.click(button('Done'));
        fireEvent.click(button('Cancel'));

        expect(actions.addNodeToPath).toHaveBeenCalled();
        expect(actions.deleteSelectedNode).toHaveBeenCalled();
        expect(actions.setSelectedNodeType).toHaveBeenCalledWith('smooth');
        expect(actions.setSelectedSegments).toHaveBeenCalledWith('line');
        expect(actions.setSelectedSegments).toHaveBeenCalledWith('curve');
        expect(actions.setPathClosed).toHaveBeenCalledWith(false);
        expect(actions.breakPathAtSelectedNode).toHaveBeenCalled();
        expect(actions.exitNodeMode).toHaveBeenCalled();
        expect(actions.cancelNodeMode).toHaveBeenCalled();
    });

    it('shows the node position and moves it on commit', () => {
        render(<NodeToolbar />);
        const x = screen.getByRole('spinbutton', { name: 'Node X' }) as HTMLInputElement;
        expect(x.value).toBe('100');
        fireEvent.focus(x);
        fireEvent.change(x, { target: { value: '140' } });
        fireEvent.keyDown(x, { key: 'Enter' });
        expect(actions.moveSelectedNode).toHaveBeenCalledWith(140, 50);
    });

    it('open path offers Close; impossible actions are disabled', () => {
        act(() =>
            useStore.setState({
                selectedNode: { ...info, closed: false, canDelete: false, canBreak: false },
            } as any),
        );
        render(<NodeToolbar />);
        expect(button('Close path')).toBeEnabled();
        expect(button('Delete node')).toBeDisabled();
        expect(button('Break path at node')).toBeDisabled();
        expect(screen.getByRole('radio', { name: 'Corner node' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
    });
});
