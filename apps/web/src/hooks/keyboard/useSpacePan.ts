import { useEffect } from 'react';

import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';
import { useStore } from '@store';

const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]';
const ACTIVATES_ON_SPACE = 'button, a, [role="button"], [role="option"], [role="tab"]';

/**
 * Hold Space to drag the view, from the Select or Draw tool. It needs a key-up, so it cannot be a
 * command. A control that was only clicked keeps focus, and Space would click it again: it loses
 * the key, unless the person got there with Tab and means to press it.
 */
export function useSpacePan() {
    useEffect(() => {
        let panning = false;
        let tabbing = false;

        const stop = () => {
            if (!panning) return;
            panning = false;
            useStore.getState().endTemporaryPan();
        };

        const ownsSpace = (target: EventTarget | null) => {
            if (!(target instanceof Element)) return false;
            if (target.closest(TEXT_ENTRY)) return true;
            return tabbing && target.closest(ACTIVATES_ON_SPACE) !== null;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Tab') tabbing = true;
            if (e.code !== 'Space' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
            if (panning) {
                e.preventDefault();
                return;
            }
            if (e.repeat || canvasKeysBlocked() || ownsSpace(e.target)) return;
            if (!useStore.getState().beginTemporaryPan()) return;
            panning = true;
            e.preventDefault();
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || !panning) return;
            e.preventDefault(); // a focused button fires on key-up
            stop();
        };

        const onPointerDown = () => {
            tabbing = false;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', stop);
        window.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            stop();
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', stop);
            window.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, []);
}
