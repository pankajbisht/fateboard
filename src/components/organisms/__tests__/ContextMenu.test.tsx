/** BUG-128: the context menu closes on Escape (not only on a click outside). */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { ContextMenu } from '../ContextMenu';

/* eslint-disable @typescript-eslint/no-explicit-any */
afterEach(() => {
    cleanup();
    useStore.getState().closeMenu();
});

describe('ContextMenu', () => {
    it('closes on Escape', () => {
        act(() =>
            useStore.setState({
                visible: true,
                x: 10,
                y: 10,
                items: [{ id: 'copy', label: 'Copy', onClick: () => undefined }],
            } as any),
        );
        render(<ContextMenu />);
        expect(screen.getByText('Copy')).toBeTruthy();
        act(() => {
            fireEvent.keyDown(window, { key: 'Escape' });
        });
        expect(useStore.getState().visible).toBe(false);
        expect(screen.queryByText('Copy')).toBeNull();
    });
});
