import { useEffect } from 'react';
import { useStore } from '@store';
import { ANIM_CSS, useAnimationTheme } from '../../hooks/useAnimationTheme';
import { DockPanes } from './DockPanes';
import { TimelineToolbar } from './TimelineToolbar';
import { useCanvasSelection } from './useAnimationCanvas';
import { useAnimationKeys } from './useAnimationKeys';

/**
 * The animation timeline's content, laid out for the bottom dock (TimelineDock): a bar with playback,
 * keyframes and overlays; under it the timeline, with the Animate / Keyframe / View / Export panes beside it.
 * Composition only; each part reads the store itself.
 */
export default function AnimationPanel() {
    const canvas = useStore((s) => s.canvas);
    const bindAutoKey = useStore((s) => s.bindAutoKey);
    const selection = useCanvasSelection();
    const theme = useAnimationTheme();
    const keys = useAnimationKeys();

    useEffect(() => bindAutoKey(), [canvas, bindAutoKey]);

    // Playback and auto-key belong to the open timeline: without it there is no Pause button, and
    // the auto-key listeners are gone while the switch would still say "on" (BUG-181).
    useEffect(
        () => () => {
            const st = useStore.getState();
            st.pause();
            if (st.autoKey) st.setAutoKey(false);
        },
        [],
    );

    return (
        <div
            className="flex min-h-0 flex-1 flex-col outline-none"
            style={theme.style}
            data-anim-theme={theme.isDark ? 'dark' : 'light'}
            tabIndex={0}
            onKeyDown={keys.onKeyDown}
            onKeyUp={keys.onKeyUp}
        >
            <style>{ANIM_CSS}</style>
            <TimelineToolbar canAdd={selection.count > 0} />
            <DockPanes selection={selection} />
        </div>
    );
}
