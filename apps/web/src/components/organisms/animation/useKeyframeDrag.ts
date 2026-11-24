import { useRef, type PointerEvent } from 'react';
import { useStore } from '@store';
import type { KfRef } from '@/store/slices/createAnimationSlice';
import { snapTargets } from './animation.logic';

/** The pointer must travel this far before a press becomes a drag (a click never moves a key). */
const DRAG_START_PX = 3;

export interface KeyframeDrag {
    down: (e: PointerEvent<HTMLElement>, ref: KfRef) => void;
    move: (e: PointerEvent<HTMLElement>, ref: KfRef) => void;
    up: (ref: KfRef) => void;
    cancel: () => void;
    /** Select this keyframe only and show it on the canvas (a plain click, or Enter). */
    pick: (ref: KfRef) => void;
}

/**
 * Selecting and dragging keyframe markers. `timeAt` turns a pointer x into a snapped time.
 * Shift / Ctrl / ⌘ click adds to the selection; a drag moves the whole selection as one undo step.
 */
export function useKeyframeDrag(
    timeAt: (clientX: number, targets?: number[]) => number,
): KeyframeDrag {
    const drag = useRef<{ ref: KfRef; targets: number[]; startX: number; moved: boolean } | null>(
        null,
    );

    const pick = (ref: KfRef) => {
        const st = useStore.getState();
        const time = st.tracks[ref.objectId]?.keyframes.find((k) => k.id === ref.keyframeId)?.time;
        st.pause();
        st.selectKeyframe(null);
        st.selectKeyframe(ref);
        if (time !== undefined) st.seek(time);
    };

    return {
        pick,
        down: (e, ref) => {
            e.stopPropagation();
            const st = useStore.getState();
            st.pause();
            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                st.selectKeyframe(ref, true);
                return;
            }
            st.selectKeyframe(ref, false); // keeps a group that already holds this keyframe
            const now = useStore.getState();
            const moving = new Set(now.selectedKeyframes.map((r) => r.keyframeId));
            moving.add(ref.keyframeId);
            drag.current = {
                ref,
                targets: snapTargets(now, moving),
                startX: e.clientX,
                moved: false,
            };
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        move: (e, ref) => {
            const d = drag.current;
            if (!d || d.ref.keyframeId !== ref.keyframeId) return;
            if (!d.moved) {
                if (Math.abs(e.clientX - d.startX) < DRAG_START_PX) return;
                d.moved = true;
                useStore.getState().beginEdit();
            }
            useStore.getState().moveSelectedTo(d.ref, timeAt(e.clientX, d.targets));
        },
        up: (ref) => {
            const d = drag.current;
            drag.current = null;
            if (d && d.ref.keyframeId === ref.keyframeId && !d.moved) pick(ref);
        },
        cancel: () => {
            drag.current = null;
        },
    };
}
