import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@store';

import { useSpacePan } from '../useSpacePan';

const beginTemporaryPan = vi.fn(() => true);
const endTemporaryPan = vi.fn();

const fire = (type: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
    const event = new KeyboardEvent(type, {
        code: 'Space',
        bubbles: true,
        cancelable: true,
        ...init,
    });
    act(() => {
        target.dispatchEvent(event);
    });
    return event;
};

const focusable = (tag: string) => document.body.appendChild(document.createElement(tag));

describe('useSpacePan', () => {
    beforeEach(() => {
        beginTemporaryPan.mockClear();
        endTemporaryPan.mockClear();
        useStore.setState({ beginTemporaryPan, endTemporaryPan } as never);
        renderHook(() => useSpacePan());
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('pans while Space is held, and stops the page from scrolling', () => {
        expect(fire('keydown').defaultPrevented).toBe(true);
        expect(beginTemporaryPan).toHaveBeenCalledTimes(1);

        fire('keyup');
        expect(endTemporaryPan).toHaveBeenCalledTimes(1);
    });

    it('ignores the repeats of a held key', () => {
        fire('keydown');
        fire('keydown', { repeat: true });
        expect(beginTemporaryPan).toHaveBeenCalledTimes(1);
    });

    it('stops when the window loses focus, or the key-up would never come', () => {
        fire('keydown');
        act(() => {
            window.dispatchEvent(new Event('blur'));
        });
        expect(endTemporaryPan).toHaveBeenCalledTimes(1);
    });

    it.each(['input', 'textarea'])('leaves Space to a %s', (tag) => {
        const event = fire('keydown', {}, focusable(tag));
        expect(beginTemporaryPan).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    it('leaves Space to a button reached with the keyboard', () => {
        fire('keydown', { code: 'Tab' });
        const event = fire('keydown', {}, focusable('button'));
        expect(beginTemporaryPan).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    it('takes Space from a button that was only clicked, or it would click again', () => {
        const button = focusable('button');
        act(() => {
            window.dispatchEvent(new Event('pointerdown'));
        });
        expect(fire('keydown', {}, button).defaultPrevented).toBe(true);
        expect(beginTemporaryPan).toHaveBeenCalledTimes(1);
    });

    it('stops a clicked button from firing when Space comes back up', () => {
        const button = focusable('button');
        act(() => {
            window.dispatchEvent(new Event('pointerdown'));
        });
        fire('keydown', {}, button);
        expect(fire('keyup', {}, button).defaultPrevented).toBe(true);
    });

    it('ignores Space with a modifier', () => {
        fire('keydown', { metaKey: true });
        expect(beginTemporaryPan).not.toHaveBeenCalled();
    });

    it('does nothing behind a modal dialog', () => {
        focusable('div').setAttribute('aria-modal', 'true');
        fire('keydown');
        expect(beginTemporaryPan).not.toHaveBeenCalled();
    });

    it('leaves the key alone when the tool cannot pan', () => {
        beginTemporaryPan.mockReturnValueOnce(false);
        expect(fire('keydown').defaultPrevented).toBe(false);
    });
});
