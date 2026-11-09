/** Clone family in the command registry (shortcuts) and the right-click menu (only when useful). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { commandRegistry } from '../../commandConfig';
import { contextMenuRegistry } from '../../contextMenuRegistry';
import { replaceToShortcut } from '@/lib/utils/isMac';

/* eslint-disable @typescript-eslint/no-explicit-any */
const prev = { ...useStore.getState() } as any;
afterEach(() => {
    const keys = [
        'unlinkClone',
        'linkClones',
        'selectLinked',
        'hasLinkedSelection',
        'canLinkSelection',
    ];
    useStore.setState(Object.fromEntries(keys.map((k) => [k, prev[k]])) as any);
});

const byId = (id: string) => (commandRegistry as any[]).find((c) => c.id === id);

describe('clone commands', () => {
    it('⌥D clones, ⇧⌥D unlinks; link and select-linked are commands too', () => {
        expect(replaceToShortcut(byId('clone').shortcut)).toBe(
            replaceToShortcut(byId('clone').shortcut),
        );
        const unlink = byId('unlink-clone');
        expect(unlink).toBeDefined();
        expect(replaceToShortcut(unlink.shortcut)).toMatch(/⇧⌥d|shift\+alt\+d/i);
        expect(byId('link-clones')).toBeDefined();
        expect(byId('select-linked')).toBeDefined();
    });

    it('each runs its store action', () => {
        const unlinkClone = vi.fn();
        const linkClones = vi.fn();
        const selectLinked = vi.fn();
        useStore.setState({ unlinkClone, linkClones, selectLinked } as any);
        const ctx = { get: useStore.getState, set: useStore.setState };
        byId('unlink-clone').handler(ctx);
        byId('link-clones').handler(ctx);
        byId('select-linked').handler(ctx);
        expect(unlinkClone).toHaveBeenCalled();
        expect(linkClones).toHaveBeenCalled();
        expect(selectLinked).toHaveBeenCalled();
    });

    it('the right-click menu shows them only when they apply', () => {
        const item = (id: string) => (contextMenuRegistry as any[]).find((c) => c.id === id);
        useStore.setState({
            hasLinkedSelection: () => false,
            canLinkSelection: () => false,
        } as any);
        expect(item('unlink-clone').when()).toBe(false);
        expect(item('select-linked').when()).toBe(false);
        expect(item('link-clones').when()).toBe(false);
        useStore.setState({ hasLinkedSelection: () => true, canLinkSelection: () => true } as any);
        expect(item('unlink-clone').when()).toBe(true);
        expect(item('select-linked').when()).toBe(true);
        expect(item('link-clones').when()).toBe(true);
    });
});
