/**
 * Header arrange tools (BUG-192): Align, Group and Lock follow the live selection. A tool that cannot act
 * is disabled, Lock / Unlock is one toggle, and the right-click menu and the keys use the same rules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { AlignmentBar } from '../AlignmentBar';
import { GroupBar } from '../GroupBar';
import { LockBar } from '../LockBar';
import { GroupBarConfig, LockBarConfig } from '@/components/config/toolbars';

/* eslint-disable @typescript-eslint/no-explicit-any */
const rect = (left: number) =>
    new fabric.Rect({ left, top: 0, width: 10, height: 10, originX: 'left', originY: 'top' });

let prev: any;
let canvas: any;
let objs: any[];

beforeEach(() => {
    prev = { ...useStore.getState() };
    objs = [rect(0), rect(20), rect(40)];
    canvas = createFakeCanvas(objs);
    act(() => useStore.setState({ canvas, saveState: vi.fn(), persist: vi.fn() } as any));
});
afterEach(() => {
    cleanup();
    act(() =>
        useStore.setState({
            canvas: prev.canvas,
            saveState: prev.saveState,
            persist: prev.persist,
            layers: [],
        } as any),
    );
});

/** Select like the user (fires the canvas selection event the bars listen to). */
const select = (list: any[]) =>
    act(() => {
        canvas.setActiveObject(
            list.length > 1 ? new fabric.ActiveSelection(list, { canvas }) : (list[0] ?? null),
        );
        canvas.fire(list.length ? 'selection:created' : 'selection:cleared', {});
    });

const button = (name: string) => screen.getByRole('button', { name });
const cfg = (list: any[], id: string) => list.find((a) => a.id === id);

describe('AlignmentBar', () => {
    it('align needs one object, distribute needs three', () => {
        render(<AlignmentBar />);
        expect(button('Align Left')).toBeDisabled();
        expect(button('Distribute Horizontally')).toBeDisabled();

        select([objs[0]]);
        expect(button('Align Left')).toBeEnabled();
        expect(button('Distribute Horizontally')).toBeDisabled();

        select(objs);
        expect(button('Align Left')).toBeEnabled();
        expect(button('Distribute Vertically')).toBeEnabled();
    });

    it('a locked object cannot be aligned', () => {
        render(<AlignmentBar />);
        select([objs[0]]);
        act(() => useStore.getState().lock());
        expect(button('Align Left')).toBeDisabled();
    });
});

describe('GroupBar', () => {
    it('Group needs two objects, Ungroup needs a group; clicking groups and ungroups', () => {
        render(<GroupBar />);
        expect(button('Group')).toBeDisabled();
        expect(button('Ungroup')).toBeDisabled();

        select(objs.slice(0, 2));
        expect(button('Group')).toBeEnabled();
        expect(button('Ungroup')).toBeDisabled();

        fireEvent.click(button('Group'));
        act(() => canvas.fire('selection:created', {}));
        expect(canvas.getObjects()).toHaveLength(2);
        expect(button('Ungroup')).toBeEnabled();

        fireEvent.click(button('Ungroup'));
        expect(canvas.getObjects()).toHaveLength(3);
    });

    it('menu and keys follow the same rules', () => {
        const group = cfg(GroupBarConfig, 'group');
        const ungroup = cfg(GroupBarConfig, 'ungroup');
        expect(group.enabled()).toBe(false); // ⌘G with nothing selected stays with the browser
        expect(ungroup.enabled()).toBe(false);
        select(objs.slice(0, 2));
        expect(group.when()).toBe(true);
        expect(group.enabled()).toBe(true);
    });
});

describe('LockBar', () => {
    it('is one toggle: Lock, then Unlock once the selection is locked', () => {
        render(<LockBar />);
        expect(button('Lock')).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull();

        select([objs[0]]);
        fireEvent.click(button('Lock'));
        expect(objs[0]._locked).toBe(true);
        expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull();

        fireEvent.click(button('Unlock'));
        expect(objs[0]._locked).toBe(false);
        expect(button('Lock')).toBeEnabled();
    });

    it('the right-click menu offers only the one that applies; keys need a target', () => {
        const lock = cfg(LockBarConfig, 'lock');
        const unlock = cfg(LockBarConfig, 'unlock');
        expect(lock.enabled()).toBe(false); // ⌘L with nothing selected stays with the browser
        select([objs[0]]);
        expect([lock.when(), unlock.when()]).toEqual([true, false]);
        act(() => useStore.getState().lock());
        expect([lock.when(), unlock.when()]).toEqual([false, true]);
        expect(unlock.enabled()).toBe(true);
    });
});
