import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useStore } from '@store';
import { keyCommand, type AnimCommand } from './animation.logic';

const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]';
const ACTIVATES_ON_SPACE = 'button, a, [role="button"], [role="option"], [role="tab"]';

function run(cmd: AnimCommand, big: boolean) {
    const st = useStore.getState();
    const direction = cmd === 'back' ? -1 : 1;
    switch (cmd) {
        case 'toggle-play':
            return st.togglePlay();
        case 'undo':
            return st.animUndo(); // keyframe history here, not the canvas history
        case 'redo':
            return st.animRedo();
        case 'select-all':
            return st.selectAllKeyframes();
        case 'copy':
            return st.copyKeyframes();
        case 'paste':
            return st.pasteKeyframes();
        case 'delete':
            return st.deleteSelected();
        case 'back':
        case 'forward':
            if (st.selectedKeyframes.length)
                return st.nudgeSelected(direction * (big ? 100 : 1000 / st.animFps));
            return st.stepFrames(direction * (big ? st.animFps : 1));
        case 'home':
            return st.seek(0);
        case 'end':
            return st.seek(st.animDuration);
        case 'keyframe':
            return st.addKeyframe();
        case 'loop':
            return st.setLoop(!st.loop);
        case 'work-in':
            return st.setWorkArea(st.currentTime, st.workOut);
        case 'work-out':
            return st.setWorkArea(st.workIn, st.currentTime);
    }
}

/**
 * Keyboard shortcuts of the Animation panel (they work while focus is inside it). Every key
 * handled here stops here: the global canvas shortcuts must not run too (BUG-018).
 */
export function useAnimationKeys() {
    const tabbing = useRef(false);
    const spaceHeld = useRef(false);

    // Same rule as Space-to-pan: a button reached with Tab keeps Space, a clicked one does not.
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.code === 'Tab') tabbing.current = true;
        };
        const onPointer = () => {
            tabbing.current = false;
        };
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('pointerdown', onPointer, true);
        return () => {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('pointerdown', onPointer, true);
        };
    }, []);

    const onKeyDown = (e: KeyboardEvent) => {
        const target = e.target as Element;
        if (target.closest(TEXT_ENTRY)) return;
        const cmd = keyCommand(e);
        if (!cmd) return;
        if (cmd === 'toggle-play') {
            // Space after clicking Play must pause, not click the button again or pan (BUG-178)
            if (tabbing.current && target.closest(ACTIVATES_ON_SPACE)) return;
            spaceHeld.current = true;
        }
        if (cmd !== 'copy' && cmd !== 'paste') e.preventDefault();
        e.stopPropagation();
        run(cmd, e.shiftKey);
    };

    // a focused button fires on key-up: the Space this panel used must not click it
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.code !== 'Space' || !spaceHeld.current) return;
        spaceHeld.current = false;
        e.preventDefault();
    };

    return { onKeyDown, onKeyUp };
}
